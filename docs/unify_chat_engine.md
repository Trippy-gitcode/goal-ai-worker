# GOAL AI — チャットエンジン共通化 + バグ修正 + UI改善 指示書
> 対象: frontend/js/profile.js, frontend/js/chat.js, frontend/js/api.js, frontend/js/goals.js, frontend/style.css, frontend/index.html, src/worker.js
> 作成: 2026-03-17

---

## 【鉄則】
1. 修正前に必ず `grep -n` で対象箇所を特定してから `str_replace`
2. 共通エンジン（STEP 1）を先に実装し、動作確認してから各画面を移行（STEP 2〜5）
3. 1画面移行ごとに動作確認（チャット送信→AI応答→音声→画像が動くこと）
4. 修正後に末尾の確認grepを全項目実行
5. sw.jsの CACHE_NAME を1つインクリメントしてからデプロイ

---

# ═══════════════════════════════════════
# STEP 0: 緊急バグ修正 + UI改善（先にやる）
# ═══════════════════════════════════════

## 0-1. デザインセッション二重質問表示の修正

### 原因
- line 526: システムプロンプト「次の質問に自然につなげてください」→ AIが応答末尾に質問を含める
- line 532: JSが `nextMsg += '\n\n' + nextQ` でさらに同じ質問をハードコード追記
- → 質問が2回表示される

### 修正

```bash
grep -n "nextQ\|next_q\|\\\\n\\\\n.*nextQ\|nextMsg.*nextQ" frontend/js/profile.js
```

#### パターンA（推奨）: JSのハードコード追記を削除

```javascript
// 修正前（line 532付近）
nextMsg += '\n\n' + nextQ;

// 修正後: この行を削除（またはコメントアウト）
// nextQ はAIの応答に既に含まれている
```

### 確認方法
修正後にデザインセッションを開始し、各質問が1回だけ表示されることを確認。

---

## 0-2. フィードバック用システムプロンプト改善

### 修正箇所

```bash
grep -n "フィードバック\|feedback.*system\|使ってみてどう\|フィードバック.*prompt" frontend/js/profile.js frontend/js/chat.js frontend/js/ui.js | head -10
```

### 修正内容
フィードバック対話のシステムプロンプトに以下を追加（既存のプロンプト冒頭に挿入）：

```
あなたはGOAL AIの改善担当です。ユーザーが貴重な時間を使ってフィードバックをくれています。

【応答ルール】
1. ユーザーの発言には必ず最初に感謝を示す（例：「教えてくれてありがとうございます」「貴重なご意見ですね」）
2. 共感を示してからフォローアップ質問する（例：「文字が見えにくいのは使いづらかったですね。どの画面で特に気になりましたか？」）
3. 否定・反論しない。改善の参考にする姿勢を見せる
4. 最後に「他に気になったことはありますか？」で締める
```

---

## 0-3. サイドバーロゴの品位改善

### 修正箇所

```bash
grep -n "logo\|sb-header\|sidebar.*header\|sb-brand\|crown" frontend/style.css | head -15
grep -n "logo\|sb-header\|sb-brand" frontend/index.html | head -10
```

### 修正内容

**① グラステーマ時もロゴ部分はスケルトン（透過）にしない**

```css
/* グラステーマでもロゴエリアは不透明に（ブランドの品位保持） */
[data-theme$="-glass"] #sb-header,
[data-theme$="-glass"] .sb-brand {
  background: var(--bg) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
```

**② ロゴボックス下のスペースを詰める**

ロゴ部分の `padding-bottom` または `margin-bottom` を現在値の約半分に縮小し、
サイドバーの作業領域（ゴール一覧・チャット履歴）を広くする。

```bash
# 現在のpadding/margin値を確認
grep -A5 "sb-header\|sb-brand\|sidebar.*logo" frontend/style.css | grep "padding\|margin"
```

---

# ═══════════════════════════════════════
# STEP 1: 共通チャットエンジンの構築
# ═══════════════════════════════════════

## 目的
全5箇所のチャットUI（ホーム / ゴールハブ / デザインセッション / フィードバック / 悩み相談）で
同一の入力・表示・音声・画像機能を使えるようにする。

## 現状の問題

```bash
# 各画面のチャット送信関数を確認
grep -n "^async function sendHomeMsg\|^async function sendHubMsg\|^async function sendKnowMsg\|^function sendFeedback\|^async function sendWorry" frontend/js/chat.js frontend/js/goals.js frontend/js/profile.js | head -10

# 各画面の音声入力対応状況
grep -n "transcribeAudio\|MediaRecorder\|startRecording\|voice" frontend/js/chat.js frontend/js/goals.js frontend/js/profile.js | head -15

# 各画面の画像入力対応状況
grep -n "image.*upload\|file.*input\|FileReader\|drag.*drop\|paste.*image\|handleImage" frontend/js/chat.js frontend/js/goals.js frontend/js/profile.js | head -15
```

## 共通エンジン設計

### api.js に追加する共通関数群

```javascript
// ═══ 共通チャットエンジン ═══

/**
 * 共通デバイス情報取得（フィードバック送信時に自動付与）
 */
function getDeviceInfo() {
  const ua = navigator.userAgent;
  let device = 'pc';
  let platform = 'unknown';
  
  // タブレット判定（iPadは先に判定）
  if (/iPad|Macintosh.*Touch/i.test(ua) && 'ontouchend' in document) {
    device = 'tablet'; platform = 'iPad';
  } else if (/Android/i.test(ua) && !/Mobile/i.test(ua)) {
    device = 'tablet'; platform = 'Android';
  }
  // スマホ判定
  else if (/iPhone/i.test(ua)) {
    device = 'smartphone'; platform = 'iPhone';
  } else if (/Android.*Mobile/i.test(ua)) {
    device = 'smartphone'; platform = 'Android';
  }
  // PC判定
  else if (/Macintosh/i.test(ua)) {
    device = 'pc'; platform = 'Mac';
  } else if (/Windows/i.test(ua)) {
    device = 'pc'; platform = 'Windows';
  }
  
  return { device, platform, screen_width: window.innerWidth, ua_short: ua.slice(0, 120) };
}

/**
 * 共通チャットメッセージ表示
 */
function appendChatMsg(container, role, text, opts = {}) {
  const wrap = document.createElement('div');
  wrap.className = `msg ${role === 'user' ? 'user' : 'ai'}`;

  const av = document.createElement('div');
  av.className = 'msg-av';
  av.innerHTML = opts.avatar || (role === 'ai' ? CROWN_SVG : getUserAvatar());

  const body = document.createElement('div');
  body.className = 'msg-body';

  const bub = document.createElement('div');
  bub.className = 'bubble';
  bub.innerHTML = renderMsgContent(escapeHtml(text));

  body.appendChild(bub);
  wrap.appendChild(av);
  wrap.appendChild(body);
  container.appendChild(wrap);

  if (opts.scrollEl) opts.scrollEl.scrollTop = opts.scrollEl.scrollHeight;
  return { wrap, bub };
}

/**
 * 共通AI送信（非ストリーミング）
 */
async function sendChatAPI(params) {
  const endpoint = params.endpoint || '/api/chat';
  const res = await apiCall(endpoint, 'POST', {
    system: params.system,
    messages: params.messages,
    maxTokens: params.maxTokens || 600
  });
  if (!res || res.error) throw new Error(res?.error || 'API error');
  if (res.content) return res.content.map(b => b.text || '').join('');
  if (res.choices) return res.choices[0]?.message?.content || '';
  return '';
}

/**
 * 共通AI送信（ストリーミング）
 */
async function sendChatStream(container, scrollEl, params, onDone) {
  const { bub } = mkStreamBubble(container, scrollEl);
  await streamAI(
    { system: params.system, messages: params.messages, maxTokens: params.maxTokens || 600 },
    (chunk) => { streamAppend(bub, chunk); if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight; },
    (fullText) => { streamFinalize(bub, fullText); if (onDone) onDone(fullText); },
    (err) => { bub.textContent = 'エラーが発生しました。'; }
  );
}

/**
 * 共通チャット入力セットアップ（テキスト + 音声 + 画像）
 */
function setupChatInput(config) {
  const { inputEl, sendBtn, voiceBtn, imageBtn, fileInput, onSend, maxH } = config;
  
  if (inputEl) {
    inputEl.addEventListener('input', () => chatResize(inputEl, maxH || 150));
    inputEl.addEventListener('keydown', (e) => chatKey(() => {
      const text = inputEl.value.trim();
      if (text) onSend(text, []);
    }, e));
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      const text = inputEl.value.trim();
      if (text) onSend(text, []);
    });
  }

  if (voiceBtn) {
    voiceBtn.addEventListener('click', () => startVoiceInput(inputEl));
  }

  if (imageBtn && fileInput) {
    imageBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleImageUpload(e, inputEl));
  }
}

/**
 * 共通音声入力（Whisper API経由）
 */
async function startVoiceInput(inputEl) {
  try {
    const text = await transcribeAudio();
    if (text && inputEl) {
      inputEl.value += (inputEl.value ? ' ' : '') + text;
      chatResize(inputEl, 150);
      inputEl.focus();
    }
  } catch(e) {
    toast('音声認識に失敗しました', 'error');
  }
}

/**
 * 共通画像アップロード処理
 */
function handleImageUpload(event, inputEl) {
  const files = event.target.files;
  if (!files || !files.length) return;
  // 既存の画像処理ロジックを呼び出し
  // 画像プレビューを入力欄の上に表示
}
```

> **注意**: 既存の `chatResize`, `chatKey`, `streamAI`, `mkStreamBubble`,
> `streamAppend`, `streamFinalize`, `transcribeAudio` を再利用すること。新規で同じ機能を書かない。

---

# ═══════════════════════════════════════
# STEP 2: フィードバック画面への適用（最小・最初）
# ═══════════════════════════════════════

## 現状確認

```bash
grep -n "sendFeedback\|feedbackSend\|fbSend\|feedbackChat" frontend/js/profile.js frontend/js/ui.js | head -10
grep -n "feedback.*input\|fb-input\|fb-send\|feedback.*modal\|feedback.*chat" frontend/index.html | head -10
```

## 修正内容

### ① AI呼び出しをClaude Sonnet固定

```bash
grep -n "api/chat\|apiCall.*chat\|fetch.*chat" frontend/js/profile.js frontend/js/ui.js | head -15
```

```javascript
// 修正後: 明示的に /api/chat（Claude Sonnet）固定
const res = await apiCall('/api/chat', 'POST', {
  system: FEEDBACK_SYSTEM_PROMPT,
  messages: feedbackHistory,
  maxTokens: 400
});
```

### ② 音声・画像入力の追加

```bash
grep -n "feedback.*textarea\|fb.*textarea\|気になったこと" frontend/index.html | head -5
```

入力欄の横に音声ボタン・画像ボタンを追加（ホームチャットと同じアイコン・スタイル）：

```html
<!-- フィードバック入力欄の送信ボタンの前に追加 -->
<button class="chat-voice-btn" onclick="startVoiceInput(document.getElementById('fb-input'))" title="音声入力">
  🎤
</button>
<button class="chat-image-btn" onclick="document.getElementById('fb-file-input').click()" title="画像添付">
  📷
</button>
<input type="file" id="fb-file-input" accept="image/*" style="display:none"
  onchange="handleImageUpload(event, document.getElementById('fb-input'))">
```

### ③ フィードバック送信時にデバイス情報を自動付与

フィードバックをSupabaseに保存する箇所を特定：

```bash
grep -n "feedbacks.*insert\|POST.*feedback\|handleFeedback\|apiCall.*feedback" frontend/js/profile.js frontend/js/ui.js src/worker.js | head -15
```

**フロントエンド側:** フィードバック送信のbodyに `...getDeviceInfo()` をスプレッド追加

```javascript
// 修正前
await apiCall('/api/feedbacks', 'POST', {
  content: feedbackText,
  // ...既存のフィールド
});

// 修正後
await apiCall('/api/feedbacks', 'POST', {
  content: feedbackText,
  ...getDeviceInfo(),  // ← device, platform, screen_width, ua_short
  // ...既存のフィールド
});
```

**Worker側 /api/feedbacks POST:** insertのカラムに `device`, `platform`, `screen_width` を追加。

**Supabase feedbacksテーブルにカラム追加（SQLをダッシュボードで実行）:**

```sql
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS device TEXT DEFAULT 'unknown';
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'unknown';
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS screen_width INTEGER;
```

**管理者用GET（/api/feedbacks）のレスポンスにもdevice/platformを含める。**

---

# ═══════════════════════════════════════
# STEP 3: デザインセッションへの適用
# ═══════════════════════════════════════

### ① AI呼び出しをClaude Sonnet固定

```bash
grep -n "api/chat" frontend/js/profile.js | head -10
```

sendKnowMsg内のAPI呼び出しが `/api/chat`（Claude）であることを確認。
他のエンドポイントを使っている箇所があれば `/api/chat` に統一。

### ② 音声・画像入力の追加

```bash
grep -n "ここに答えを書いて\|know.*input\|know.*textarea\|design.*input" frontend/index.html | head -5
```

ホームチャットと同じ音声・画像ボタンを追加。共通の `startVoiceInput()` と `handleImageUpload()` を使用。

---

# ═══════════════════════════════════════
# STEP 4: ゴールハブチャットへの適用
# ═══════════════════════════════════════

```bash
grep -n "hub.*input\|hub.*textarea\|hub.*send\|sendHubMsg" frontend/index.html frontend/js/goals.js | head -10
grep -n "voice\|audio\|image\|MediaRecorder" frontend/js/goals.js | head -5
```

ゴールハブにも音声・画像ボタンを追加。既存の `sendHubMsg` は維持しつつ入力UIを共通化。

---

# ═══════════════════════════════════════
# STEP 5: 悩み相談チャットへの適用
# ═══════════════════════════════════════

```bash
grep -n "worry\|nayami\|悩み\|相談" frontend/js/profile.js | head -10
```

悩み相談チャットにも音声・画像ボタンを追加。

---

# ═══════════════════════════════════════
# 全ステップ完了後の統一確認
# ═══════════════════════════════════════

## 機能チェック（5画面すべてで確認）

| 画面 | テキスト送信 | 音声入力 | 画像添付 | AI応答表示 | Enterキー | IME対応 |
|------|:---------:|:------:|:------:|:--------:|:-------:|:------:|
| ホームチャット | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| ゴールハブ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| デザインセッション | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| フィードバック | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 悩み相談 | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

## 確認grep

```bash
echo "=== 共通エンジン関数 ==="
grep -c "appendChatMsg\|sendChatAPI\|sendChatStream\|setupChatInput\|startVoiceInput\|handleImageUpload\|getDeviceInfo" frontend/js/api.js
# 7件（全関数が定義されていること）

echo "=== デザインセッション二重表示修正 ==="
grep -c "nextMsg.*nextQ\|nextQ.*append\|+.*nextQ" frontend/js/profile.js
# 0件（ハードコード追記が削除されていること）

echo "=== フィードバック感謝ルール ==="
grep -c "感謝\|ありがとう\|貴重" frontend/js/profile.js frontend/js/ui.js
# 1以上

echo "=== 音声入力の全画面対応 ==="
grep -c "startVoiceInput\|voice-btn\|chat-voice-btn" frontend/index.html
# 4以上（ホーム+ハブ+デザイン+フィードバック）

echo "=== 画像入力の全画面対応 ==="
grep -c "handleImageUpload\|image-btn\|chat-image-btn\|file-input" frontend/index.html
# 4以上（ホーム+ハブ+デザイン+フィードバック）

echo "=== AI品質: フィードバック/デザインがClaude固定 ==="
grep -n "api/chat/gpt-simple\|gpt.*simple" frontend/js/profile.js frontend/js/ui.js
# フィードバック・デザインセッション関連では0件

echo "=== デバイス情報: フィードバック送信時 ==="
grep -c "getDeviceInfo" frontend/js/profile.js frontend/js/ui.js
# 1以上
grep -c "device\|platform\|screen_width" src/worker.js
# 3以上（feedbacks INSERT箇所）

echo "=== サイドバーロゴ: グラス除外 ==="
grep -c "glass.*sb-header\|glass.*sb-brand\|glass.*logo" frontend/style.css
# 1以上

echo "=== 保全確認 ==="
grep -c "escapeHtml" frontend/js/profile.js                    # 1以上
grep -c "Secure" frontend/js/globals.js frontend/js/ui.js      # 各1以上
grep -c "console.log" frontend/js/*.js | awk -F: '{s+=$2}END{print s}' # 0件
grep -c "overscroll-behavior" frontend/style.css                # 1以上
grep -c "renderAIUnderstanding" frontend/js/goals.js            # 1以上
grep -c "kabeuchi\|壁打ち" frontend/js/chat.js                  # 1以上
grep -c "launchConfetti\|checkMilestone" frontend/js/goals.js   # 2以上
grep -c "transcribeAudio\|MediaRecorder" frontend/js/chat.js    # 1以上
```

---

## 実装順序まとめ

```
STEP 0: 緊急修正（二重表示 + プロンプト改善 + ロゴ修正）  ← 20分
    ↓ 動作確認
STEP 1: 共通エンジン関数をapi.jsに追加（getDeviceInfo含む） ← 30分
    ↓ 動作確認
STEP 2: フィードバック画面に適用（Sonnet固定 + 音声 + 画像 + デバイス情報） ← 40分
    ↓ 動作確認 + Supabase ALTER TABLE
STEP 3: デザインセッションに適用                           ← 30分
    ↓ 動作確認
STEP 4: ゴールハブに適用                                   ← 20分
    ↓ 動作確認
STEP 5: 悩み相談に適用                                     ← 20分
    ↓ 全画面テスト
確認grep全実行 → デプロイ
```

**合計：約2.5〜3時間**

---

*各STEPの完了後に必ず動作確認を行うこと。一気に全部書き換えない。*
