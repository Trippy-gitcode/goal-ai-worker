# render_chat_ui_integration.md — チャットUI統合＋パーソナライズ指示書
> 対象バージョン: v3.2.0 → v3.3.0
> fix_persistent_bugs_v2.md（v3.2.0）の適用後に実行すること

---

## 概要

チャット画面を5画面→4画面に統合し、renderChatUI(config)共通関数で管理する。
同時にパーソナル解析注入・AIロール・AI理解メモ機能を実装する。

### 変更一覧
| # | 内容 | セクション |
|---|------|-----------|
| 1 | 悩み相談画面の廃止 | STEP 1 |
| 2 | renderChatUI(config)共通関数 | STEP 2 |
| 3 | 4画面をrenderChatUI呼び出しに置換 | STEP 3 |
| 4 | ゴールハブのルーティング有効化 | STEP 4 |
| 5 | デザイン・FBのFreeカウント無し | STEP 5 |
| 6 | パーソナルプロフィール注入 | STEP 6 |
| 7 | ホームの動的コーチング検出 | STEP 7 |
| 8 | AIロール設定（全画面） | STEP 8 |
| 9 | ゴールハブのロール選択フロー | STEP 9 |
| 10 | AI理解メモ自動生成・閲覧 | STEP 10 |
| 11 | プロフィール未設定時の案内 | STEP 11 |
| 12 | 検証・デプロイ | STEP 12 |

---

## STEP 1: 悩み相談画面の廃止

### 1-A: サイドバーから削除
```bash
grep -n "悩み相談\|nayami\|counseling\|mental" frontend/index.html frontend/js/ui.js frontend/js/chat.js
```
- サイドバーのメニュー項目を削除
- showPage()のルーティングから該当caseを削除

### 1-B: JS内の関連コード削除
```bash
grep -n "nayami\|counseling\|mentalChat\|悩み" frontend/js/chat.js frontend/js/ui.js
```
- 悩み相談専用の関数・変数・イベントリスナーを削除
- 悩み相談用のメッセージ配列（nayamiMsgs等）を削除

### 1-C: HTML内のコンテナ削除
```bash
grep -n "nayami\|counseling\|mental-chat" frontend/index.html
```
- 悩み相談用のDOMセクションを削除

### 1-D: CSS内のスタイル削除（あれば）
```bash
grep -n "nayami\|counseling" frontend/style.css
```

### ⚠️ 削除しないこと
- メンケアモード（mencareMode）はホームチャットのモード切替として残す
- 「感情・悩み → Claude」のルーティングルールは残す

---

## STEP 2: renderChatUI(config) 共通関数の定義

### 2-A: chat.js内に共通関数を作成

```javascript
/**
 * 共通チャットUI生成関数
 * @param {Object} config
 * @param {string}  config.containerId   - DOMコンテナID ('home-chat', 'goal-chat', etc.)
 * @param {boolean} config.routing       - AIルーティングを使用するか
 * @param {string|null} config.fixedModel - ルーティング不使用時の固定モデル ('sonnet')
 * @param {boolean} config.freeNoCount   - Freeプランでもカウントしないか
 * @param {string}  config.role          - AIロール文（システムプロンプト冒頭に注入、200字以内）
 * @param {string}  config.systemPrompt  - 画面固有のシステムプロンプト追加部分
 * @param {boolean} config.voiceInput    - 音声入力を有効にするか
 * @param {string}  config.msgsKey       - メッセージ配列の変数名/ストレージキー
 * @param {Object}  config.profileInject - プロフィール注入設定（後述）
 * @param {boolean} config.coachingDetect - 動的コーチング検出を有効にするか
 */
function renderChatUI(config) {
  // ... 共通実装
}
```

### 2-B: 4画面のconfig定義

```javascript
const CHAT_CONFIGS = {
  home: {
    containerId: 'home-chat',
    routing: true,
    fixedModel: null,
    freeNoCount: false,
    role: 'あなたはユーザーの万能AIアシスタント。質問にはまず答え、必要に応じてコーチングする。',
    systemPrompt: '', // 標準（ゴール誘導禁止等は全画面共通で注入）
    voiceInput: true,
    msgsKey: 'homeMsgs',
    profileInject: {
      initial: ['nickname', 'occupation', 'age', 'mbti'],
      onCoaching: ['strengths', 'weaknesses', 'values', 'vision', 'constraints']
    },
    coachingDetect: true
  },

  goal: {
    containerId: 'goal-chat',
    routing: true,
    fixedModel: null,
    freeNoCount: false,
    role: null, // ゴールごとにAI理解メモから動的設定（STEP 9参照）
    systemPrompt: '', // ゴール文脈はrole + AI理解メモから動的注入
    voiceInput: true,
    msgsKey: 'goalMsgs',
    profileInject: {
      initial: ['nickname', 'occupation', 'age', 'mbti',
                'strengths', 'weaknesses', 'values', 'vision', 'constraints']
    },
    coachingDetect: false // 常にフル注入なので不要
  },

  design: {
    containerId: 'design-chat',
    routing: false,
    fixedModel: 'sonnet',
    freeNoCount: true,
    role: '優秀なライフデザイナー。質問を通じてユーザーの本質を引き出す。先入観を持たず、答えを誘導しない。',
    systemPrompt: '', // 既存の5テーマ質問フロー
    voiceInput: true,
    msgsKey: 'designMsgs',
    profileInject: {
      initial: ['nickname'] // デザインセッションは先入観防止のため最小限
    },
    coachingDetect: false
  },

  feedback: {
    containerId: 'feedback-chat',
    routing: false,
    fixedModel: 'sonnet',
    freeNoCount: true,
    role: '感謝と共感を最優先するプロダクト改善パートナー。必ず感謝から始め、否定・反論しない。',
    systemPrompt: '', // 感謝ファーストルール
    voiceInput: true,
    msgsKey: 'feedbackMsgs',
    profileInject: {
      initial: ['nickname']
    },
    coachingDetect: false
  }
};
```

### 2-C: renderChatUI内で共通化する処理
以下の処理を全画面共通にする。現在の個別実装からこの関数に統合：

1. チャットコンテナのDOM生成（msg-av, msg-body, bubble, msg-footer構造）
2. メッセージ送信処理（テキスト＋音声）
3. AI応答の受信・表示（ストリーミング/非ストリーミング）
4. 空バブル防止ガード（BUG-1修正の全ガード）
5. メッセージ履歴の保存・読み込み
6. コピー/引用/編集ボタン
7. タイピングインジケーター
8. ルーティングバッジ表示（「🔍 リサーチ中...」等）

### ⚠️ 注意
既存の個別実装コードを削除する前に、renderChatUIで同等の機能が動作することを確認。
段階的に移行：まずホーム画面で動作確認 → 他3画面に適用。

---

## STEP 3: 4画面をrenderChatUI呼び出しに置換

### 3-A: 各画面のshowPage()内で呼び出し

```javascript
// showPage('home') 内
renderChatUI(CHAT_CONFIGS.home);

// showPage('goal-hub') でゴール選択後
renderChatUI({
  ...CHAT_CONFIGS.goal,
  // ゴール固有の情報を上書き
  systemPrompt: buildGoalContext(currentGoal),
  role: currentGoal.ai_role_name
    ? `あなたは「${currentGoal.ai_role_icon} ${currentGoal.ai_role_name}」。${currentGoal.ai_role_description}。`
    : 'ゴール達成を支援する万能コーチ。',
  msgsKey: `goalMsgs_${currentGoal.id}`
});

// showPage('design-session') 内
renderChatUI(CHAT_CONFIGS.design);

// showPage('feedback') 内
renderChatUI(CHAT_CONFIGS.feedback);
```

### 3-B: 個別実装コードの削除
各画面の個別チャット実装を削除し、renderChatUI呼び出しのみに置換。
削除前にgrepで全関数・変数を洗い出すこと：
```bash
grep -n "function.*Home\|function.*Goal.*Chat\|function.*Design.*Chat\|function.*Feedback.*Chat" frontend/js/chat.js frontend/js/profile.js
```

---

## STEP 4: ゴールハブのルーティング有効化

### 4-A: ゴールハブでルーティングを使用
CHAT_CONFIGS.goal.routing = true の通り、ゴールハブのチャットでもAIルーティングを有効にする。

### 4-B: ゴールハブのルーティングルール
ホームと同じルーティングロジックをそのまま使用する。
- 新しい会話の最初のメッセージでルーティング判定
- 一度振り分けたら会話中はそのAIが担当
- ただしゴール文脈のシステムプロンプトは全AIに共通注入

---

## STEP 5: デザインセッション・フィードバックのFreeカウント無し

### 5-A: Worker側の修正
```bash
grep -n "checkUsage\|usage_tracking\|chat_count\|incrementUsage" src/worker.js
```

`/api/chat/stream` のリクエストに `freeNoCount: true` フラグを追加。
Worker側でこのフラグが立っている場合、Freeプランでもusage_trackingのchat_countをインクリメントしない。

### 5-B: フロントエンド側
renderChatUI内で、config.freeNoCount === true の場合、APIリクエストbodyに `free_no_count: true` を追加。

### 5-C: 不正利用防止
Worker側でfree_no_countフラグを受け入れるのは、リクエストの`context`が `'design'` または `'feedback'` の場合のみ。
フロントエンドからの偽装を防ぐため、contextとfree_no_countの組み合わせをWorkerで検証する。

```javascript
// Worker側
if (body.free_no_count && !['design', 'feedback'].includes(body.context)) {
  return new Response(JSON.stringify({ error: 'Invalid context for free_no_count' }), { status: 400 });
}
```

---

## STEP 6: パーソナルプロフィール注入

### 6-A: Worker側でプロフィール取得・注入

`/api/chat/stream` のハンドラ内で、リクエストのtoken_idからSupabaseのusersテーブルのプロフィールを取得し、システムプロンプトに自動合成する。

**フロントエンドからプロフィールを送らない**（改ざん防止＋通信量削減）。

```javascript
// Worker側 — /api/chat/stream ハンドラ内
async function buildSystemPrompt(tokenId, config, env) {
  // 1. Supabaseからプロフィール取得
  const profile = await getProfile(tokenId, env);

  // 2. 画面に応じた注入項目を選択
  const injectFields = config.profile_inject || ['nickname'];
  const profileBlock = buildProfileBlock(profile, injectFields);

  // 3. システムプロンプト組み立て
  let prompt = '';

  // ロール（200字以内）
  if (config.role) {
    prompt += `【あなたの役割】${config.role}\n\n`;
  }

  // プロフィール
  if (profileBlock) {
    prompt += `【ユーザー情報】\n${profileBlock}\n\n`;
  }

  // 全画面共通ルール
  prompt += COMMON_RULES; // ゴール誘導禁止等

  // 画面固有ルール
  if (config.system_prompt) {
    prompt += `\n${config.system_prompt}`;
  }

  return prompt;
}
```

### 6-B: buildProfileBlock関数

```javascript
function buildProfileBlock(profile, fields) {
  if (!profile) return '';
  const lines = [];
  const map = {
    nickname:    () => profile.nickname ? `名前: ${profile.nickname}` : null,
    occupation:  () => profile.occupation ? `職種: ${profile.occupation}` : null,
    age:         () => profile.age ? `年齢: ${profile.age}歳` : null,
    mbti:        () => profile.mbti ? `MBTI: ${profile.mbti}` : null,
    strengths:   () => profile.strengths ? `強み: ${profile.strengths}` : null,
    weaknesses:  () => profile.weaknesses ? `弱み: ${profile.weaknesses}` : null,
    values:      () => profile.values ? `価値観: ${profile.values}` : null,
    vision:      () => profile.vision ? `ビジョン: ${profile.vision}` : null,
    constraints: () => profile.constraints ? `制約: ${profile.constraints}` : null,
  };
  for (const f of fields) {
    if (map[f]) {
      const line = map[f]();
      if (line) lines.push(line);
    }
  }
  return lines.join('\n');
}
```

### 6-C: フロントエンドからのリクエスト拡張

```javascript
// renderChatUI内のAPI呼び出し時
const requestBody = {
  messages: messages,
  context: config.containerId,      // 'home-chat', 'goal-chat', etc.
  profile_inject: config.profileInject.initial,
  role: config.role,
  system_prompt: config.systemPrompt,
  coaching_mode: isCoachingMode     // STEP 7で切替
};
```

### 6-D: 画面別注入マッピング（最終版）

| 項目 | ホーム初期 | ホーム(coaching) | ゴールハブ | デザイン | FB |
|------|:--------:|:---------------:|:--------:|:-------:|:--:|
| nickname | ✅ | ✅ | ✅ | ✅ | ✅ |
| occupation | ✅ | ✅ | ✅ | — | — |
| age | ✅ | ✅ | ✅ | — | — |
| mbti | ✅ | ✅ | ✅ | — | — |
| strengths | — | ✅ | ✅ | — | — |
| weaknesses | — | ✅ | ✅ | — | — |
| values | — | ✅ | ✅ | — | — |
| vision | — | ✅ | ✅ | — | — |
| constraints | — | ✅ | ✅ | — | — |

---

## STEP 7: ホームチャットの動的コーチング検出

### 7-A: ルーティング判定の拡張

現在のルーティング判定（GPT-5 mini、`/api/chat/gpt-simple`）の返却値を拡張する。

```
現在: { "route": "claude" }
拡張: { "route": "claude", "coaching": true }
```

### 7-B: ルーティングプロンプトへの追加

```
ルーティング判定に加え、以下も判定してください：
- coaching: ユーザーが目標・悩み・将来・キャリア・成長・自己改善について語っている場合はtrue

JSONで返してください: { "route": "gemini|gpt|gpt-simple|claude", "coaching": true|false }
```

### 7-C: フロントエンド側の切替

```javascript
// ホームチャットのみ（config.coachingDetect === true の場合）
let isCoachingMode = false;

// ルーティング判定結果を受けて
function onRoutingResult(result) {
  if (result.coaching && !isCoachingMode) {
    isCoachingMode = true;
    // 以降のAPI呼び出しでprofile_injectをフル項目に切替
    // ユーザーには通知しない（自然に切り替わる）
  }
}
```

### 7-D: Worker側の対応

`/api/chat/stream`で`coaching_mode: true`を受け取った場合、profile_injectを上書きしてフル項目にする：
```javascript
if (body.coaching_mode) {
  config.profile_inject = ['nickname', 'occupation', 'age', 'mbti',
    'strengths', 'weaknesses', 'values', 'vision', 'constraints'];
}
```

### 7-E: 注意事項
- コーチング検出は**ルーティング判定と同じタイミング**（新しい会話の最初のメッセージ）で実行
- 一度coachingがtrueになったら、その会話中はフル注入を継続（戻さない）
- ルーティングがgemini/gptに振られた場合でもcoachingフラグは立ちうる（「将来のこと調べて」→geminiルート＋coaching=true）

---

## STEP 8: AIロール設定（全画面）

### 8-A: 各画面のデフォルトロール

| 画面 | ロール（200字以内） | 変更可否 |
|------|-------------------|:-------:|
| ホーム | 「ユーザーの万能AIアシスタント。質問にはまず答え、必要に応じてコーチングする」 | モード切替で変化 |
| ゴールハブ | ゴールごとにAIが提案→ユーザー合意（STEP 9） | ✅ |
| デザイン | 「優秀なライフデザイナー。質問を通じてユーザーの本質を引き出す。先入観を持たず誘導しない」 | ❌ |
| フィードバック | 「感謝と共感を最優先するプロダクト改善パートナー。必ず感謝から始め、否定・反論しない」 | ❌ |

### 8-B: ホームチャットのモード別ロール

```javascript
const HOME_ROLES = {
  normal:  'ユーザーの万能AIアシスタント。質問にはまず答え、必要に応じてコーチングする。',
  spartan: '甘さゼロの厳格なコーチ。言い訳を許さず、具体的な行動だけを求める。',
  mencare: '寄り添い型のメンタルケアパートナー。共感を第一に、ユーザーの気持ちを受け止める。',
  kabeuchi: 'ソクラテス式の壁打ち相手。答えを教えず、質問で思考を深める。'
};
```

### 8-C: ロール表示（ユーザーに見せる）
チャットヘッダーに現在のAIロールを小さく表示する。

```html
<div class="chat-role-badge">
  <span class="role-icon">🤖</span>
  <span class="role-text">万能AIアシスタント</span>
</div>
```

```css
.chat-role-badge {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  padding: 4px 8px;
  display: flex;
  align-items: center;
  gap: 4px;
}
```

---

## STEP 9: ゴールハブのロール選択フロー

### 9-A: ゴール作成時のロール提案

ゴールが新規作成された直後、AIが3つのロール候補を提案する。
候補はゴールの内容からAIが自動生成（固定リストではない）。

**Worker側に新規エンドポイント追加：**

```
POST /api/goals/:id/suggest-roles
```

リクエスト:
```json
{
  "goal_title": "TOEIC 800点取得",
  "goal_why": "転職でグローバル企業を目指すため"
}
```

レスポンス:
```json
{
  "suggestions": [
    {
      "icon": "📚",
      "name": "学習コーチ",
      "description": "計画的な学習管理と弱点分析"
    },
    {
      "icon": "🔥",
      "name": "スパルタトレーナー",
      "description": "毎日の進捗を厳しくチェック"
    },
    {
      "icon": "🤝",
      "name": "伴走パートナー",
      "description": "モチベーション維持と励まし"
    }
  ]
}
```

このエンドポイントはGPT-5 mini（カウントなし）を使用。
システムプロンプト: 「ゴール内容に最適なコーチングロールを3つ提案。各ロールはアイコン（絵文字1つ）・名前（8文字以内）・説明（20文字以内）。JSON形式で返却」

### 9-B: フロントエンド — ロール選択UI

ゴール作成完了後、チャット画面に入る前にカード型UIを表示。

```javascript
async function showRoleSelection(goal) {
  const suggestions = await apiCall(`/api/goals/${goal.id}/suggest-roles`, {
    method: 'POST',
    body: { goal_title: goal.title, goal_why: goal.why }
  });
  renderRoleSelectionCard(goal.id, suggestions);
}
```

```html
<div class="role-selection-card">
  <h3>🎯 このゴールに最適なAIロール</h3>
  <div class="role-options">
    <label class="role-option">
      <input type="radio" name="ai-role" value="0">
      <span class="role-icon">📚</span>
      <span class="role-name">学習コーチ</span>
      <span class="role-desc">計画的な学習管理と弱点分析</span>
    </label>
    <!-- ... 2つ目、3つ目 -->
  </div>
  <div class="role-actions">
    <button onclick="confirmRole(goalId)">決定</button>
    <button onclick="skipRole(goalId)">後で選ぶ</button>
  </div>
</div>
```

### 9-C: ロール保存

Supabaseのgoalsテーブルにカラム追加：
```sql
ALTER TABLE goals ADD COLUMN ai_role_icon TEXT;
ALTER TABLE goals ADD COLUMN ai_role_name TEXT;
ALTER TABLE goals ADD COLUMN ai_role_description TEXT;
```

「後で選ぶ」の場合はnull。ゴールハブチャット内で後から変更可能
（「AIロールを変更」ボタン → 再提案 → 選択）。

### 9-D: ロールのシステムプロンプト注入

STEP 3-Aのゴールハブ呼び出し部分で既に記載済み。

---

## STEP 10: AI理解メモ自動生成・閲覧

### 10-A: Supabaseスキーマ拡張

```sql
-- ゴールごとのAI理解メモ
ALTER TABLE goals ADD COLUMN ai_memo TEXT;
ALTER TABLE goals ADD COLUMN ai_memo_updated_at TIMESTAMPTZ;

-- ホーム用のAI理解メモ（ユーザーごと1つ）
ALTER TABLE users ADD COLUMN ai_memo TEXT;
ALTER TABLE users ADD COLUMN ai_memo_updated_at TIMESTAMPTZ;
```

### 10-B: AI理解メモの構造

**ゴール用：**
```
📋 AIの理解メモ — {ゴールタイトル}

【あなたについて】
- 名前: {nickname}
- 強み: {strengths}
- 弱み: {weaknesses}
- MBTI: {mbti}

【このゴールについて】
- 目標: {title}（現在{actual}%）
- 理由: {why}
- 期限: {deadline}
- AIロール: {ai_role_icon} {ai_role_name}

【AIの行動方針】
- {プロフィール・ゴール内容・ロールから自動生成した3-5項目}

最終更新: {ai_memo_updated_at}
```

**ホーム用：**
```
📋 AIの理解メモ

【あなたについて】
- 名前: {nickname}
- 職種: {occupation} / {age}歳
- MBTI: {mbti}
- 強み: {strengths}
- 弱み: {weaknesses}
- 価値観: {values}
- ビジョン: {vision}

【取り組み中のゴール】
- 🎯 {goal1.title}（{goal1.actual}%）
- 🎯 {goal2.title}（{goal2.actual}%）

【AIの行動方針】
- {全ゴール・プロフィールから自動生成した3-5項目}

最終更新: {ai_memo_updated_at}
```

### 10-C: 自動生成トリガー

| トリガー | 対象 | 処理 |
|---------|------|------|
| ゴール新規作成 | ゴール用メモ | GPT-5 mini（カウントなし）で初回生成 |
| プロフィール更新 | ホーム用 + 全ゴール用 | 「あなたについて」セクションのみ再生成 |
| ゴール進捗更新（10%刻み） | ゴール用メモ | 「AIの行動方針」を状況に応じて微調整 |
| ロール変更 | ゴール用メモ | ロール部分 + 行動方針を再生成 |

### 10-D: Worker側エンドポイント

```
POST /api/ai-memo/generate
```

リクエスト:
```json
{
  "type": "goal",
  "goal_id": "xxx",
  "trigger": "goal_created"
}
```

処理:
1. token_idからプロフィール取得
2. goal_idからゴール情報取得（type=goalの場合）
3. GPT-5 miniに理解メモのテキストを生成させる
4. Supabaseに保存

GPT-5 miniへのプロンプト:
```
以下の情報からAI理解メモを生成してください。
- ユーザープロフィール: {profile}
- ゴール情報: {goal}（type=goalの場合）
- AIロール: {role}（type=goalの場合）

フォーマット:
【あなたについて】...
【このゴールについて】...（type=goalの場合）
【AIの行動方針】3-5項目。プロフィールの強み・弱み・制約を踏まえた具体的方針。

200字以内で簡潔に。
```

### 10-E: フロントエンド — 理解メモ閲覧UI

**ゴールハブ**: ゴール詳細画面に「📋 AIの理解メモ」ボタン → タップでモーダル表示。
**ホーム**: サイドバーに「📋 AIの理解メモ」メニュー項目 → タップでモーダル表示。

```javascript
async function showAIMemo(type, goalId) {
  const memo = type === 'goal'
    ? currentGoal.ai_memo
    : USER_PROFILE.ai_memo;

  if (!memo) {
    showToast('AI理解メモはまだ作成されていません');
    return;
  }

  showModal({
    title: '📋 AIの理解メモ',
    content: `<div class="ai-memo-content">${renderMarkdown(escapeHtml(memo))}</div>
              <p class="ai-memo-hint">内容が違うと感じたら、チャットで「もっと厳しくして」「私の強みは〇〇」など伝えてください。AIが理解メモを更新します。</p>`,
    buttons: [{ text: '閉じる', action: 'close' }]
  });
}
```

### 10-F: チャットからの理解メモ更新

ユーザーが直接編集するのではなく、チャットで修正依頼 → AIが更新する対話型。

AIのシステムプロンプトに以下を追加：
```
ユーザーが自分の強み・弱み・価値観・コーチング方針について修正を求めた場合、
応答の末尾に [MEMO_UPDATE] タグを付けてください（ユーザーには表示されません）。
```

Worker側で応答テキストに`[MEMO_UPDATE]`があったら：
1. タグをレスポンスから除去（ユーザーには見せない）
2. 非同期でAI理解メモを再生成（`/api/ai-memo/generate`を内部呼び出し）

---

## STEP 11: プロフィール未設定時の案内

### 11-A: 初回案内（1回だけ）

ホームチャットの初回メッセージ（homeMsgsが空の場合）で、プロフィール未設定なら案内を表示。

```javascript
if (config.containerId === 'home-chat' && homeMsgs.length === 0) {
  if (!USER_PROFILE.nickname && !USER_PROFILE.occupation) {
    addSystemMessage(
      'こんにちは！何でも聞いてください。\n' +
      'もしよかったら「私をデザイン」であなたのことを教えてもらえると、' +
      'より的確なアドバイスができるようになります。'
    );
  }
}
```

### 11-B: 案内の表示条件
- プロフィールのnickname AND occupationが未設定の場合のみ
- 1回表示したらCookieに`profile_hint_shown=true`を保存（Secure属性付き）
- 2回目以降は表示しない
- 「私をデザイン」はテキストリンクにして、タップでデザインセッションに遷移

---

## STEP 12: 検証・デプロイ

### 自動検証
```bash
# STEP 1: 悩み相談が削除されていること
echo "=== 悩み相談削除 ==="
grep -c "nayami\|counseling\|悩み相談" frontend/js/chat.js frontend/js/ui.js frontend/index.html
# 期待: 0（メンケアは残るので mencare/メンケア は残ってOK）

# STEP 2: renderChatUI
echo "=== renderChatUI ==="
grep -c "function renderChatUI\|renderChatUI(" frontend/js/chat.js
# 期待: 5以上（定義1 + 呼び出し4）

echo "=== CHAT_CONFIGS ==="
grep -c "CHAT_CONFIGS" frontend/js/chat.js
# 期待: 5以上

# STEP 5: freeNoCount
echo "=== freeNoCount ==="
grep -c "free_no_count\|freeNoCount" frontend/js/chat.js src/worker.js
# 期待: 2以上

# STEP 6: プロフィール注入
echo "=== buildProfileBlock ==="
grep -c "buildProfileBlock\|profile_inject\|profileInject" src/worker.js
# 期待: 3以上

# STEP 7: コーチング検出
echo "=== coaching detect ==="
grep -c "coaching.*true\|coachingDetect\|isCoachingMode" frontend/js/chat.js
# 期待: 3以上

# STEP 8: ロール
echo "=== roles ==="
grep -c "HOME_ROLES\|ai_role\|chat-role-badge" frontend/js/chat.js frontend/style.css
# 期待: 3以上

# STEP 9: ロール選択
echo "=== suggest-roles ==="
grep -c "suggest-roles\|role-selection" src/worker.js frontend/js/goals.js
# 期待: 2以上

# STEP 10: AI理解メモ
echo "=== ai-memo ==="
grep -c "ai.memo\|ai_memo\|showAIMemo" src/worker.js frontend/js/chat.js frontend/js/goals.js frontend/js/ui.js
# 期待: 5以上
```

### 保全確認grep（CLAUDE.md記載の全項目）
```bash
grep -c "escapeHtml" frontend/js/api.js                       # 1以上
grep -c "Secure" frontend/js/globals.js frontend/js/ui.js     # 1以上
grep -c "console.log" frontend/index.html                     # 0件
grep -c "overscroll-behavior" frontend/style.css              # 1以上
grep -c "kabeuchi\|壁打ち" frontend/js/chat.js                # 1以上
grep -c "launchConfetti\|checkMilestone" frontend/js/goals.js # 2以上
grep -c "transcribeAudio\|MediaRecorder" frontend/js/chat.js  # 1以上
grep -c "harajuku" frontend/style.css                         # 5以上
grep -c "\-\-text-primary" frontend/style.css                 # 6以上
grep "APP_VERSION" frontend/js/globals.js                     # 存在確認
```

### Supabaseマイグレーション（手動実行）
```sql
-- STEP 9: ゴールロール
ALTER TABLE goals ADD COLUMN IF NOT EXISTS ai_role_icon TEXT;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS ai_role_name TEXT;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS ai_role_description TEXT;

-- STEP 10: AI理解メモ
ALTER TABLE goals ADD COLUMN IF NOT EXISTS ai_memo TEXT;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS ai_memo_updated_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_memo TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_memo_updated_at TIMESTAMPTZ;
```

### バージョン更新（4箇所同期）
```bash
# v3.2.0 → v3.3.0
grep -rn "3\.2\.0\|APP_VERSION" frontend/js/globals.js frontend/sw.js frontend/index.html src/worker.js
# 全箇所を 3.3.0 に更新
# sw.jsのCACHE_NAMEも 'goal-ai-v3.3.0' に更新
```

### デプロイ
```bash
npx wrangler deploy src/worker.js
npx wrangler pages deploy frontend --project-name goal-ai-frontend
```

### 報告フォーマット
```
Deployed: v3.3.0
- 悩み相談廃止、4画面統合（renderChatUI共通関数）
- パーソナルプロフィール注入（Worker側自動合成、画面別マッピング）
- ホーム動的コーチング検出（ルーティング拡張）
- AIロール設定（全画面デフォルト + ゴールハブ選択式）
- AI理解メモ自動生成・閲覧（ゴール用 + ホーム用）
- デザイン/FBのFreeカウント無し
```
