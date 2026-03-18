# fix_pre_launch_10items.md — テスト配布前 残り10件一括実装
> 対象バージョン: v3.3.8 → v3.4.0
> 全修正後にデプロイ。途中デプロイ禁止。

---

## 【回帰防止】変更前スナップショット（最初に実行して結果を保存）

```bash
echo "=== SNAPSHOT BEFORE ==="
grep -c "renderChatUI\|CHAT_CONFIGS" frontend/js/chat.js
grep -c "buildProfileBlock\|buildServerSystemPrompt" src/worker.js
grep -c "coaching" src/worker.js frontend/js/chat.js
grep -c "HOME_ROLES\|suggest-roles\|ai_role" src/worker.js frontend/js/chat.js frontend/js/goals.js
grep -c "ai-memo\|ai_memo\|showAIMemo" src/worker.js frontend/js/chat.js frontend/js/goals.js
grep -c "free_no_count\|freeNoCount" src/worker.js frontend/js/chat.js
grep -c "TESTER_CODES\|tester_code" src/worker.js
grep -c "isOwner\|OWNER_SECRET" src/worker.js
grep -c "skipWaiting\|clients.claim" frontend/sw.js
grep -c "deleteSelectedSessions\|historySelectMode" frontend/js/chat.js frontend/js/ui.js
grep -c "launchConfetti\|checkMilestone" frontend/js/goals.js
grep -c "escapeHtml" frontend/js/api.js
grep -c "harajuku" frontend/style.css
grep -c "kabeuchi\|壁打ち" frontend/js/chat.js
grep -c "transcribeAudio\|MediaRecorder" frontend/js/chat.js
grep -c "overscroll-behavior" frontend/style.css
echo "=== END SNAPSHOT ==="
```

**この結果を保存しておくこと。全修正完了後に同じgrepを実行して、1つでも数値が減っていたら該当機能が消えているので再修正。**

---

## STEP 1: #29 Free→nanoフォールバック

### 1-A: Worker側（src/worker.js）

Freeプランのユーザーが日次上限（Sonnet 5回、GPT mini 10回、Gemini Flash 5回）を超えた場合、自動的にnanoモデルにフォールバックする。

```bash
grep -n "checkUsage\|usage_tracking\|chat_count\|FREE_LIMIT\|daily.*limit" src/worker.js | head -20
```

**修正内容：**

```javascript
// /api/chat/stream ハンドラ内の使用量チェック部分
async function getEffectiveModel(plan, usageToday, requestedCategory, env) {
  if (plan !== 'free') return null; // Free以外は通常モデル

  const limits = {
    claude: 5,   // Sonnet 5回/日
    gpt: 10,     // GPT mini 10回/日
    gemini: 5    // Gemini Flash 5回/日
  };

  const category = requestedCategory || 'claude';
  const used = usageToday[category] || 0;

  if (used >= limits[category]) {
    // 上限超過 → nanoにフォールバック
    return {
      model: category === 'claude' ? 'claude-sonnet-4-20250514' : 'gpt-5-nano',
      // Claude nanoはないのでSonnetのまま（レスポンスで速度制限）
      // GPT/Geminiはgpt-5-nanoにフォールバック
      fallback: true,
      resetHour: getResetHour() // 日本時間0時リセットまでの残り時間
    };
  }
  return null; // 上限内 → 通常モデル
}

function getResetHour() {
  const now = new Date();
  const jst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const midnight = new Date(jst);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  return Math.ceil((midnight - jst) / (1000 * 60 * 60));
}
```

**レスポンスにフォールバック情報を含める：**

```javascript
// /api/chat/stream のレスポンスヘッダーに追加
if (fallbackResult) {
  headers['X-Model-Fallback'] = 'true';
  headers['X-Reset-Hours'] = String(fallbackResult.resetHour);
}
```

### 1-B: フロントエンド側

```bash
grep -n "streamAI\|fetch.*chat.*stream\|X-Model\|fallback" frontend/js/api.js frontend/js/chat.js | head -10
```

**ストリーミングレスポンスのヘッダーからフォールバック情報を取得：**

```javascript
// api.js または chat.js のstreamAI関数内
const isFallback = response.headers.get('X-Model-Fallback') === 'true';
const resetHours = response.headers.get('X-Reset-Hours');

if (isFallback) {
  showNanoFallbackBanner(resetHours);
}
```

**バナー表示：**

```javascript
function showNanoFallbackBanner(hours) {
  let banner = document.getElementById('nano-fallback-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'nano-fallback-banner';
    banner.className = 'nano-fallback-banner';
    // ヘッダーの直下に挿入
    const header = document.querySelector('#home-header') || document.querySelector('header');
    if (header) header.after(banner);
  }
  banner.innerHTML = `上限に達したため、回答精度低下中（${hours}時間後に回復）`;
}

function hideNanoFallbackBanner() {
  const banner = document.getElementById('nano-fallback-banner');
  if (banner) banner.remove();
}
```

**バナーCSS（style.css追加）：**

```css
.nano-fallback-banner {
  background: rgba(220, 160, 50, 0.15);
  color: var(--accent);
  text-align: center;
  padding: 6px 12px;
  font-size: 0.75rem;
  font-weight: 500;
  border-bottom: 1px solid rgba(220, 160, 50, 0.3);
}
```

### 1-C: 使用量カウントの日次管理

現在のusage_trackingが月次（month）の場合、日次カウントを追加する必要がある。

```bash
grep -n "usage_tracking\|chat_count\|daily\|month" src/worker.js | head -15
```

KVまたはSupabaseで日次カウントを管理：
- KVキー: `usage:${tokenId}:${YYYY-MM-DD}:${category}`
- TTL: 86400秒（24時間）
- リセット: 日本時間0時（KVのTTLで自動失効）

---

## STEP 2: #6 AI理解メモ会話回数自動更新

### 2-A: Worker側

```bash
grep -n "ai-memo\|ai_memo\|generate.*memo" src/worker.js | head -15
```

`/api/chat/stream` のハンドラ内で、ユーザーのチャット回数を確認し、5の倍数の時にAI理解メモを再生成する。

```javascript
// /api/chat/stream の応答完了後（非同期処理）
async function checkMemoAutoUpdate(tokenId, env) {
  // KVまたはSupabaseから当月のchat_countを取得
  const usage = await getUsage(tokenId, env);
  const chatCount = usage?.chat_count || 0;

  if (chatCount > 0 && chatCount % 5 === 0) {
    // 非同期でAI理解メモを再生成（レスポンスは待たない）
    try {
      await generateAIMemo({ type: 'home', trigger: 'chat_count' }, tokenId, env);
    } catch (e) {
      console.error('AI memo auto-update failed:', e);
    }
  }
}
```

`/api/chat/stream`の応答送信後に`ctx.waitUntil(checkMemoAutoUpdate(tokenId, env))`で非同期実行。

---

## STEP 3: #15 プロフィール理解度スクロール自動閉じ

### 3-A: フロントエンド側（profile.js）

```bash
grep -n "completeness\|toggleCompletenessDetail" frontend/js/profile.js | head -10
```

プロフィールページのスクロールイベントで、理解度の詳細一覧が開いていたら自動で閉じる。

```javascript
// プロフィールページのスクロールコンテナにリスナー追加
function initProfileScrollHandler() {
  const container = document.querySelector('.profile-page') || document.getElementById('profile-container');
  if (!container) return;

  container.addEventListener('scroll', () => {
    const detail = document.getElementById('completeness-detail');
    if (detail && detail.style.display !== 'none') {
      detail.style.display = 'none';
      const toggle = document.getElementById('completeness-toggle');
      if (toggle) toggle.textContent = '↓ 詳細';
    }
  }, { passive: true });
}
```

プロフィールページ表示時（showPage('profile')等）に`initProfileScrollHandler()`を呼び出す。

---

## STEP 4: #5 スワイプ感度改善（initTabSwipe）

### 4-A: フロントエンド側

```bash
grep -n "touchstart\|touchend\|swipe\|tab.*swipe" frontend/js/goals.js frontend/js/ui.js | head -15
```

画面全体からの横スワイプでサブタブ切替を可能にする汎用関数を作成。

```javascript
function initTabSwipe(container, onSwipe) {
  let startX = 0, startY = 0;

  container.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = Math.abs(e.changedTouches[0].clientY - startY);

    // 横方向50px以上 & 縦ズレ40px以内
    if (Math.abs(dx) > 50 && dy < 40) {
      onSwipe(dx > 0 ? 'right' : 'left');
    }
  }, { passive: true });
}
```

ゴールハブのサブタブ切替に適用：
```javascript
// ゴールハブ表示時
const hubContainer = document.getElementById('goal-hub-container');
if (hubContainer) {
  initTabSwipe(hubContainer, (dir) => {
    const tabs = ['chat', 'tasks', 'analysis', 'memo', 'settings'];
    const currentIdx = tabs.indexOf(currentTab);
    if (dir === 'left' && currentIdx < tabs.length - 1) switchTab(tabs[currentIdx + 1]);
    if (dir === 'right' && currentIdx > 0) switchTab(tabs[currentIdx - 1]);
  });
}
```

---

## STEP 5: E-1 AIゴール検出エンジン（専用関数化）

### 5-A: Worker側

```bash
grep -n "SYS_HOME\|ゴール.*検出\|detectGoal\|What.*Why" src/worker.js | head -15
```

現在SYS_HOME内のテキストルールのみで動作している。専用の検出関数を追加し、AI応答から構造化された判定結果を返す。

```javascript
// ルーティング判定（/api/chat/gpt-simple）のプロンプトを拡張
// 既存: { "route": "claude", "coaching": true }
// 拡張: { "route": "claude", "coaching": true, "goal_intent": "level2" }

// goal_intentの判定基準:
// "none" — 雑談、質問、調べもの（ゴール提案しない）
// "level1" — 願望的発言「〜したいな」（掘り下げる）
// "level2" — 意図あり「〜を目指す」「〜までに〜したい」（What+Whyが揃ったら提案）
// "level3" — 明示的「ゴールを設定したい」「目標を作りたい」（即座に提案）
```

### 5-B: フロントエンド側

```javascript
// ルーティング判定結果を受けてゴール検出レベルを保存
function onRoutingResult(result) {
  if (result.goal_intent === 'level3') {
    // 即座にゴール提案カードを表示準備
    pendingGoalProposal = true;
  } else if (result.goal_intent === 'level2') {
    // What+Whyが揃ったらAIが提案する（SYS_HOMEのルールで制御）
    goalDetectLevel = 2;
  }
  // level1, noneは何もしない
}
```

---

## STEP 6: E-4 ゴールアシスト完了→ホーム戻り

### 6-A: フロントエンド側

```bash
grep -n "saveGoal\|goalAssist.*complete\|goal.*save.*success" frontend/js/goals.js | head -10
```

ゴール保存＋タスク設定完了後にホームチャットに自動遷移し、AIが継続メッセージを表示。

```javascript
async function onGoalAssistComplete(goal) {
  showToast('ゴールとタスクを設定しました！');

  // 1.5秒後にホームチャットに遷移
  setTimeout(() => {
    showPage('home');
    // AIが自然な継続メッセージを表示
    addSystemMessage(`🎯 「${goal.title}」のゴールとタスクを設定しました！\n何か他に気になることはありますか？`);
  }, 1500);
}
```

ゴール保存処理の完了コールバックで`onGoalAssistComplete(goal)`を呼び出す。

---

## STEP 7: E-6 ゴール化閾値3段階判断

STEP 5で実装済み（goal_intentフィールドの3段階判定）。
Worker側のルーティングプロンプトに判定基準を明記する。

```
追加のルーティング判定項目:
- goal_intent: ユーザーの発言からゴール化の意図レベルを判定
  - "none": 雑談・質問・調べもの（例：「天気教えて」「翻訳して」）
  - "level1": 漠然とした願望（例：「英語できるようになりたいな」）→ 掘り下げる
  - "level2": 具体的意図あり（例：「来年までにTOEIC800取りたい」）→ What+Why揃ったら提案
  - "level3": 明示的要求（例：「ゴール設定したい」「目標作りたい」）→ 即提案

JSONで返してください: { "route": "...", "coaching": true|false, "goal_intent": "none|level1|level2|level3" }
```

---

## STEP 8: #24 紹介者報酬自動処理

### 8-A: Worker側

```bash
grep -n "referral\|紹介\|referred_by\|referrer_reward" src/worker.js | head -15
```

`/api/referral/apply` で紹介コードが適用された時に、紹介者に報酬を自動付与する。

```javascript
async function applyReferralReward(referrerTokenId, env) {
  const supaUrl = env.SUPABASE_URL;
  const supaKey = env.SUPABASE_SERVICE_KEY;

  // 紹介者のplan_expires_atを1ヶ月延長
  const { data: referrer } = await supabase
    .from('users')
    .select('plan, plan_expires_at')
    .eq('token_id', referrerTokenId)
    .single();

  if (!referrer) return;

  const now = new Date();
  const currentExpiry = referrer.plan_expires_at ? new Date(referrer.plan_expires_at) : now;
  const base = currentExpiry > now ? currentExpiry : now;
  base.setMonth(base.getMonth() + 1);

  await supabase
    .from('users')
    .update({
      plan_expires_at: base.toISOString(),
      plan: referrer.plan === 'free' ? 'pro' : referrer.plan // Freeなら1ヶ月Pro付与
    })
    .eq('token_id', referrerTokenId);

  // referralsテーブルの報酬フラグ更新
  await supabase
    .from('referrals')
    .update({ referrer_reward_applied: true, status: 'completed' })
    .eq('referrer_token_id', referrerTokenId)
    .eq('status', 'pending');
}
```

`/api/referral/apply` の処理成功後に `applyReferralReward()` を呼び出す。

---

## STEP 9: E-10 過去会話ゴール候補★

### 9-A: Worker側

チャット保存時（`/api/history` POST）に、AIのゴール検出結果（goal_intent level2以上）をメタデータとして保存。

```bash
grep -n "history.*POST\|saveHistory\|chat_messages.*insert" src/worker.js | head -10
```

```sql
-- chat_messagesまたはsessionsテーブルにカラム追加
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS goal_candidate BOOLEAN DEFAULT false;
```

goal_intent が level2 以上の会話セッションに `goal_candidate = true` を設定。

### 9-B: フロントエンド側

```bash
grep -n "renderHistory\|history.*list\|past.*chat" frontend/js/chat.js frontend/js/ui.js | head -10
```

過去の会話一覧で、goal_candidate=true のセッションにスター★マークを表示。

```javascript
function renderHistoryItem(session) {
  const star = session.goal_candidate ? '<span class="goal-star">★</span>' : '';
  // 既存のレンダリングにstarを追加
  item.innerHTML = `
    ${star}
    <span class="history-title">${escapeHtml(session.title || '無題の会話')}</span>
    <span class="history-meta">${session.count}件 · ${session.date}</span>
  `;
}
```

```css
.goal-star {
  color: var(--accent);
  font-size: 1rem;
  margin-right: 4px;
}
```

★タップで「この会話からゴールを作りますか？」カードを表示。

---

## STEP 10: E-20 会話テーマ自動タグ

### 10-A: Worker側

チャット保存時に、GPT-5 mini（カウントなし）で会話テーマを自動判定してタグ付け。

```sql
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS session_tag TEXT;
```

```javascript
// /api/history POST ハンドラの保存完了後に非同期実行
async function autoTagSession(sessionId, messages, env) {
  // 最初の3往復（ユーザー+AI）からテーマを判定
  const context = messages.slice(0, 6).map(m => m.content).join('\n');

  const tagResult = await callGPTSimple(env, `
    以下の会話のテーマを1つだけ、5文字以内の日本語タグで返してください。
    例：英語学習、転職、健康、副業、お金、趣味、人間関係、スキルアップ
    タグのみを返してください。

    ${context}
  `);

  const tag = tagResult?.trim();
  if (tag && tag.length <= 10) {
    await supabase
      .from('chat_messages')
      .update({ session_tag: tag })
      .eq('session_id', sessionId);
  }
}
```

### 10-B: フロントエンド側

過去の会話一覧にタグをピル表示。

```javascript
// renderHistoryItemに追加
const tagPill = session.session_tag
  ? `<span class="session-tag-pill">${escapeHtml(session.session_tag)}</span>`
  : '';
```

```css
.session-tag-pill {
  display: inline-block;
  background: rgba(200, 146, 10, 0.15);
  color: var(--accent);
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 8px;
  margin-left: 4px;
}
```

---

## Supabaseマイグレーション（手動実行）

```sql
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS goal_candidate BOOLEAN DEFAULT false;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS session_tag TEXT;
```

---

## 修正後の検証grep（全10件）

```bash
echo "=== STEP 1: nanoフォールバック ==="
grep -c "getEffectiveModel\|nano.*fallback\|X-Model-Fallback\|nano-fallback-banner" src/worker.js frontend/js/chat.js frontend/js/api.js frontend/style.css
# 期待: 4以上

echo "=== STEP 2: メモ会話回数更新 ==="
grep -c "checkMemoAutoUpdate\|chat_count.*%.*5\|memo.*auto" src/worker.js
# 期待: 2以上

echo "=== STEP 3: スクロール自動閉じ ==="
grep -c "initProfileScrollHandler\|scroll.*completeness\|completeness.*none" frontend/js/profile.js
# 期待: 2以上

echo "=== STEP 4: スワイプ感度 ==="
grep -c "initTabSwipe" frontend/js/goals.js frontend/js/ui.js
# 期待: 2以上

echo "=== STEP 5+7: ゴール検出+閾値 ==="
grep -c "goal_intent\|level1\|level2\|level3" src/worker.js frontend/js/chat.js
# 期待: 5以上

echo "=== STEP 6: アシスト→ホーム ==="
grep -c "onGoalAssistComplete\|goalAssist.*complete.*home\|ゴールとタスクを設定" frontend/js/goals.js
# 期待: 2以上

echo "=== STEP 8: 紹介者報酬 ==="
grep -c "applyReferralReward\|referrer_reward_applied.*true" src/worker.js
# 期待: 2以上

echo "=== STEP 9: ゴール候補★ ==="
grep -c "goal_candidate\|goal-star\|goal.*star" src/worker.js frontend/js/chat.js frontend/style.css
# 期待: 3以上

echo "=== STEP 10: テーマ自動タグ ==="
grep -c "autoTagSession\|session_tag\|session-tag-pill" src/worker.js frontend/js/chat.js frontend/style.css
# 期待: 3以上
```

## 【回帰防止】変更後スナップショット（最初のスナップショットと比較）

```bash
echo "=== SNAPSHOT AFTER ==="
grep -c "renderChatUI\|CHAT_CONFIGS" frontend/js/chat.js
grep -c "buildProfileBlock\|buildServerSystemPrompt" src/worker.js
grep -c "coaching" src/worker.js frontend/js/chat.js
grep -c "HOME_ROLES\|suggest-roles\|ai_role" src/worker.js frontend/js/chat.js frontend/js/goals.js
grep -c "ai-memo\|ai_memo\|showAIMemo" src/worker.js frontend/js/chat.js frontend/js/goals.js
grep -c "free_no_count\|freeNoCount" src/worker.js frontend/js/chat.js
grep -c "TESTER_CODES\|tester_code" src/worker.js
grep -c "isOwner\|OWNER_SECRET" src/worker.js
grep -c "skipWaiting\|clients.claim" frontend/sw.js
grep -c "deleteSelectedSessions\|historySelectMode" frontend/js/chat.js frontend/js/ui.js
grep -c "launchConfetti\|checkMilestone" frontend/js/goals.js
grep -c "escapeHtml" frontend/js/api.js
grep -c "harajuku" frontend/style.css
grep -c "kabeuchi\|壁打ち" frontend/js/chat.js
grep -c "transcribeAudio\|MediaRecorder" frontend/js/chat.js
grep -c "overscroll-behavior" frontend/style.css
echo "=== END SNAPSHOT ==="
```

**BEFOREとAFTERを比較し、数値が減っている項目があれば既存機能が消えている。再修正してからデプロイ。**

## 保全確認grep（CLAUDE.md記載の全項目）

```bash
grep -c "escapeHtml" frontend/js/api.js                       # 1以上
grep -c "Secure" frontend/js/globals.js frontend/js/ui.js     # 1以上
grep -c "console.log" frontend/index.html                     # 0件
grep "gpt-5-mini\|gpt-5-nano\|gpt-5\"" src/worker.js         # 各1以上
grep "gemini-2.5-flash\|gemini-2.5-pro" src/worker.js         # 各1以上
grep "gpt-4o\|gemini-2.0\|gemini-1.5" src/worker.js           # 0件
grep -c "overscroll-behavior" frontend/style.css              # 1以上
grep -c "kabeuchi\|壁打ち" frontend/js/chat.js                # 1以上
grep -c "launchConfetti\|checkMilestone" frontend/js/goals.js # 2以上
grep -c "transcribeAudio\|MediaRecorder" frontend/js/chat.js  # 1以上
grep -c "harajuku" frontend/style.css                         # 5以上
grep -c "\-\-text-primary" frontend/style.css                 # 6以上
grep -c "CHAT_CONFIGS\|renderChatUI" frontend/js/chat.js      # 5以上
grep -c "buildProfileBlock\|buildServerSystemPrompt" src/worker.js  # 2以上
grep "APP_VERSION" frontend/js/globals.js                     # 存在確認
```

## バージョン更新（4箇所同期）

```bash
grep -rn "APP_VERSION" frontend/js/globals.js frontend/sw.js frontend/index.html src/worker.js
# 全箇所を 3.4.0 に更新
# sw.jsのCACHE_NAMEも 'goal-ai-v3.4.0' に更新
```

## デプロイ

```bash
npx wrangler deploy src/worker.js
npx wrangler pages deploy frontend --project-name goal-ai-frontend
```

## 報告フォーマット

```
Deployed: v3.4.0
- #29: Free→nanoフォールバック（日次上限超過→nano自動切替+精度低下バナー）
- #6: AI理解メモ会話5回ごと自動更新
- #15: プロフィール理解度スクロール自動閉じ
- #5: スワイプ感度改善（initTabSwipe、画面全体から検知）
- E-1+E-6: AIゴール検出エンジン専用関数化（goal_intent 3段階）
- E-4: ゴールアシスト完了→ホーム自然遷移
- #24: 紹介者報酬自動処理（被紹介者登録→紹介者に1ヶ月Pro付与）
- E-10: 過去会話ゴール候補★マーク
- E-20: 会話テーマ自動タグ付け
SNAPSHOT BEFORE/AFTER差分: 全項目一致
```
