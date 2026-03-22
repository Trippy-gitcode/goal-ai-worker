# フロントエンド修正指示書 — UI/UX大規模改善 第4弾
> 対象: frontend/js/, frontend/index.html, frontend/style.css
> 2026-03-17

---

## 【鉄則】
1. 修正前に必ずgrepで対象箇所を特定してからstr_replace
2. 修正後に保全確認grepを全実行
3. sw.jsのCACHE_NAMEを1つインクリメントしてからデプロイ
4. デプロイ後にDevTools ConsoleのUncaughtエラーが0件・チャット応答正常を確認
5. **8セクション構成（★: 緊急バグ / A: チャット / B: カレンダー / C: テーマ / D: ナビゲーション / E: ゴールアシスト / F: 音声入力 / G: タスク / H: AIシステムプロンプト）。実装順序: ★（緊急バグ）→ H（システムプロンプト）→ C-0（テーマ基盤）→ F-0（音声バグ）→ A → B → C（残り）→ D → E → F（残り）→ G**

---

# ═══════════════════════════════════════
# ★ 緊急バグ（最初に修正）
# ═══════════════════════════════════════

## ★-1. バブル2つ問題（ルーティング後にGemini+Claudeが両方応答する）

fix_ui_batch_03で修正指示済みだが**まだ直っていない**。最優先で修正。

```bash
grep -n "routeMessage\|homeSmartRoute\|sendToGemini\|sendToClaude\|ROUTE_PROMPT" frontend/js/chat.js | head -20
grep -n "streamAI\|chatStream\|homeClaudeStream" frontend/js/chat.js | head -20
```

**現象：**
- ユーザーが質問→ルーティングでGeminiに振られる→Geminiが応答
- **その後Claudeも応答してしまい、2つのAIバブルが表示される**

**原因の可能性：**
1. ルーティング後にClaudeのストリーミングも並行で呼ばれている
2. ルーティング判定用のAPI呼び出し（/api/chat）がカウントあり版を使っていて、そのレスポンスもバブルに表示されている
3. Gemini応答完了後にClaudeが「まとめ」として再度応答するフローが残っている

**修正方針：**
- ルーティング結果が`gemini`または`gpt`の場合、**Claudeのストリーミングを呼ばない**。return で終了
- ルーティング判定は`/api/chat/gpt-simple`（カウントなし）を使う
- 1つの質問に対して**必ず1つのAIだけが応答する**ことを保証
- 修正後に以下のテストを実行：
  - 「今日の天気は？」→ Geminiバブル1つだけ
  - 「こんにちは」→ Claudeバブル1つだけ
  - 「英語に翻訳して」→ GPTバブル1つだけ

---

# ═══════════════════════════════════════
# H. AIシステムプロンプト改訂（ホームチャット）
# ═══════════════════════════════════════

## H-1. ホームチャットの応答ルールを根本改訂

現在のシステムプロンプトは「ゴール設定への誘導」が最優先になっており、
ユーザーの質問に答えずにコーチングを押し付ける状態になっている。

**現状の問題：**
- 「近くのレストラン5つ教えて」→ AIが「あなたの大切にしたいことから考えましょう」と返す
- 質問に答えずに質問を返す
- 雑談・調べもの・翻訳などの一般的なAI利用に全く対応できていない

**修正：worker.jsのSYS_HOMEシステムプロンプトを以下に書き換える**

```bash
grep -n "SYS_HOME\|system.*prompt\|ホームチャット" src/worker.js | head -10
grep -n "SYS_HOME\|systemPrompt\|SYS_HOME" frontend/js/chat.js frontend/js/globals.js | head -10
```

### 新しいシステムプロンプト（SYS_HOME）

```
あなたはGOAL AIのAIアシスタントです。

【最優先ルール】ユーザーの質問・依頼にまず答えること。
- 質問されたら答える。調べものには調べて答える。雑談には雑談で返す。
- 翻訳を頼まれたら翻訳する。おすすめを聞かれたらおすすめを教える。
- ChatGPT・Claude・Geminiと同等の応答品質を最低ラインとする。
- まず回答し、その上で必要なら追加質問してもよい。

【ゴール提案の条件】以下の全てを満たす場合のみ、自然にゴール化を提案してよい：
1. ユーザー自身が「〜したい」「〜になりたい」「〜を目指す」等の目標・夢・やりたいことを語っている
2. What（何を）とWhy（なぜ）の両方が会話の中で明確になっている
3. 提案は「一緒にゴールを設定して、タスクを作っていきますか？」のように軽く聞く形で

【禁止事項】
- ユーザーの質問を無視してゴール設定に誘導すること
- 「あなたの大切にしたいことから考えましょう」等の押し付けコーチング
- 回答の代わりに質問だけを返すこと
- 何でもかんでもゴールに結びつけようとすること

【応答スタイル】
- 2〜3文で簡潔に。長文禁止
- 質問は1回まで
- 同じ内容の繰り返し禁止
- まとめ後に「これで合ってますか？」確認（ゴール提案時のみ）

【チャットモード】
- 通常: 上記ルール通り
- メンケア: 寄り添い重視。解決策より共感
- スパルタ: 甘さゼロ。率直に指摘
- 壁打ち: 答え禁止。ソクラテス式問答で考えを引き出す

【パーソナライズ】
ユーザープロフィール（名前・職種・強み・弱み・価値観等）が設定されている場合は、
回答をその人に合わせて最適化する。
```

### Geminiのシステムプロンプトも同様に修正

```bash
grep -n "gemini.*system\|gemini.*prompt\|SYS_GEMINI" src/worker.js | head -5
```

Geminiに振られた場合も、**まずユーザーの質問に答える**ことを最優先にする。
「リサーチ中...」バッジを表示した上で、質問に対する回答を返す。

### GPTのシステムプロンプトも同様

GPTに振られた場合も同じ。翻訳・要約・SNSコピー等、依頼されたことをそのまま実行する。

---

## 【最重要：テーマ漏れ防止アーキテクチャ】

現在の問題：色がCSS内にバラバラにハードコードされており、テーマを変えても
トースト・入力欄・モーダル・ボーダー等が追従せず視認性が崩壊している。

**解決策：全UI要素がCSS変数のみを参照する構成に強制する。**

### 実装手順（C-0として最初に実行）

**Step 1: CSS変数マップを定義（6テーマ × 20変数 = 120定義）**
```css
/* 全テーマで必ず定義する変数一覧 */
--bg                  /* ページ背景 */
--bg-sidebar          /* サイドバー背景 */
--surface             /* 浮き上がった面 */
--card-bg             /* カード背景 */
--card-border         /* カード枠線色 */
--text-primary        /* メインテキスト（コントラスト比4.5:1以上必須） */
--text-secondary      /* サブテキスト（コントラスト比3:1以上必須） */
--text-tertiary       /* プレースホルダー等 */
--text-on-accent      /* アクセント色の上のテキスト */
--accent              /* メインアクセント */
--accent-hover        /* アクセントホバー */
--gold                /* CTA・ゴールド */
--border-subtle       /* 薄い区切り線 */
--border-card         /* カード枠線 */
--danger              /* エラー・期限切れ */
--success             /* 成功・完了 */
--icon-color          /* SVGアイコン色 */
--toast-bg            /* トースト背景 */
--toast-text          /* トーストテキスト */
--input-bg            /* 入力欄背景 */
--input-border        /* 入力欄ボーダー */
--input-text          /* 入力欄テキスト */
--modal-bg            /* モーダル背景 */
--shadow              /* box-shadow */
--glass-blur          /* グラスモードblur量 */
--glass-bg            /* グラスモードの半透明背景 */
--mode-normal-border  /* 通常モード枠色 */
--mode-mencare-border /* メンケア枠色 */
--mode-kabeuchi-border/* 壁打ち枠色 */
--mode-sparta-border  /* スパルタ枠色 */
```

**Step 2: 既存CSSからハードコード色を全て洗い出す**
```bash
# ハードコードされた色を検出（CSS変数以外の色指定を全て洗い出し）
grep -n "color:.*#[0-9a-fA-F]" frontend/style.css | grep -v "var(" | head -50
grep -n "background:.*#[0-9a-fA-F]" frontend/style.css | grep -v "var(" | head -50
grep -n "background:.*rgba" frontend/style.css | grep -v "var(" | head -50
grep -n "border.*:.*#[0-9a-fA-F]" frontend/style.css | grep -v "var(" | head -50
```

**Step 3: 全ハードコード色をCSS変数に置き換える**
- トースト → `var(--toast-bg)`, `var(--toast-text)`
- 入力欄 → `var(--input-bg)`, `var(--input-border)`, `var(--input-text)`
- モーダル → `var(--modal-bg)`
- モードカード → `var(--mode-*-border)`
- **1つでもハードコード色が残っていたらテーマ漏れが発生する**

**Step 4: デプロイ前にハードコード色が0件であることを確認**
```bash
# CSS変数以外の色指定が残っていないか確認（white/black/inherit/transparent/currentColorは許容）
grep -c "color:.*#[0-9a-fA-F]" frontend/style.css  # → grepで除外確認
# 理想は全色指定が var(--xxx) 形式であること
```

**この Step 1〜4 を最初に完了させてから、以降の全修正に進むこと。**
**テーマ基盤が整っていない状態で個別UIを修正しても、同じ問題が再発する。**

---

# ═══════════════════════════════════════
# A. チャット画面の全面リデザイン
# ═══════════════════════════════════════

## A-1. チャットバブル廃止 → 背景直書きスタイルに変更

現在のLINE風チャットバブル（枠線付きボックス）を廃止し、
Claude.ai / ChatGPTのようにバブルなしで背景に直接テキストを表示する形式に変更する。

### 変更後（目標）
```
👑 Claude                            ← アイコンと1行目が下揃え
  お腹すきましたね！何か美味しい
  ものを食べたいですか？
                       11:14 · Claude Sonnet  ← 末尾にタイムスタンプ+AIモデル

👤 ユーザー名                        ← アイコンと1行目が下揃え
  ラーメン食べたい！
                                11:15
```

### 実装詳細

```bash
grep -n "bubble\|chat-msg\|msg-box\|ai-msg\|user-msg" frontend/style.css | head -30
```

**メッセージ共通スタイル：**
```css
.chat-message {
  padding: 20px 0;
  /* border-bottom なし。余白のみで区切る */
}

/* ユーザー→AI / AI→ユーザーの切り替わり時は余白を広く */
.chat-message.ai + .chat-message.user,
.chat-message.user + .chat-message.ai {
  padding-top: 28px;
}

.chat-message .msg-header {
  display: flex;
  align-items: flex-end; /* アイコンと1行目のベースラインを下揃え */
  gap: 8px;
  margin-bottom: 4px;
}

.chat-message .msg-header .avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  flex-shrink: 0;
}

.chat-message .msg-header .name {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 24px; /* アバター高さに合わせる */
}
```

**AI応答テキスト：**
```css
.chat-message.ai .msg-body {
  padding-left: 32px;
  font-size: var(--base-font-size, 1rem);
  line-height: 1.6;
  color: var(--text-primary);
}

/* 段落間の余白を半分に（現在24-32px → 12px） */
.chat-message .msg-body p {
  margin: 0 0 12px 0;
}
.chat-message .msg-body p:last-child {
  margin-bottom: 0;
}
```

**ユーザーメッセージテキスト（AIと色を変えて区別）：**
```css
.chat-message.user .msg-body {
  padding-left: 32px;
  font-size: var(--base-font-size, 1rem);
  line-height: 1.6;
  color: var(--text-user); /* AIとは異なるテキスト色 */
}
```

**テーマごとの`--text-user`定義（AIの`--text-primary`よりやや薄い）：**
```css
[data-theme="dark"]          { --text-user: #B0B0B0; } /* AIは#E0E0E0 */
[data-theme="light"]         { --text-user: #555555; } /* AIは#333333 */
[data-theme="harajuku"]      { --text-user: #6B3A8A; } /* AIは#3D1050 */
[data-theme="dark-glass"]    { --text-user: #A0A0A0; }
[data-theme="light-glass"]   { --text-user: #555555; }
[data-theme="harajuku-glass"]{ --text-user: #7B4FA0; }
```

**タイムスタンプ + AIモデル名（末尾に1行）：**
```css
.chat-message .msg-footer {
  padding-left: 32px;
  margin-top: 6px;
  font-size: 0.75rem;
  color: var(--text-tertiary);
}
```
```html
<!-- AI応答の場合 -->
<div class="msg-footer">11:14 · Claude Sonnet</div>
<!-- ユーザーの場合 -->
<div class="msg-footer">11:15</div>
```

**メッセージ間の区切り：**
- 区切り線なし。余白のみで区切る（padding: 20px 0）
- ユーザー↔AI の切り替わり時は余白を広く（28px）

**バブルスタイルの隠し設定（将来フィードバック用に残す）：**
```javascript
// 設定画面には表示しないが、Cookieで切替可能
// chat_style=flat（デフォルト）| chat_style=bubble
// バブルCSSは削除せず、class切替で適用/非適用を制御
```

**マークダウンレンダリング：**
- AI応答のマークダウン（見出し・リスト・コードブロック・太字）をHTMLレンダリング
- 軽量ライブラリ（marked.js等）を使用
- コードブロックは横スクロール対応
- 画像添付メッセージは `max-width: 320px` に制限、タップで拡大

**ホームチャット・ゴールハブチャット両方に適用すること。**

---

## A-2. フォントサイズ4段階設定（rem化・アプリ全体スケール）

**アプリ全体のCSS単位をremで統一する。**
`html { font-size: var(--base-font-size) }` を変えるだけで全UI要素が比例スケール。

### 4段階の定義

| 名称 | html font-size | 用途 | line-height |
|------|---------------|------|------------|
| 極小 | 14px | 情報密度重視 | 1.55 |
| 小 | 16px | やや見やすい | 1.6 |
| **中（デフォルト）** | **18px** | Claude.aiと同等 | 1.65 |
| 大 | 20px | 視認性最重視 | 1.7 |

### 実装

```css
/* html要素のfont-sizeで全体をスケール */
html {
  font-size: var(--base-font-size, 18px); /* デフォルト：中 */
  line-height: var(--base-line-height, 1.65);
}

/* 全UI要素をremで記述 */
body { font-size: 1rem; }
h1 { font-size: 1.5rem; }
h2 { font-size: 1.25rem; }
.sidebar-item { font-size: 0.875rem; }
/* ... 既存のpx指定を全てremに変換 ... */
```

```javascript
// globals.js
const FONT_SIZES = {
  xs: { label: '極小', base: '14px', lh: '1.55' },
  sm: { label: '小',   base: '16px', lh: '1.6' },
  md: { label: '中',   base: '18px', lh: '1.65' },
  lg: { label: '大',   base: '20px', lh: '1.7' }
};

function setFontSize(size) {
  const s = FONT_SIZES[size];
  document.documentElement.style.setProperty('--base-font-size', s.base);
  document.documentElement.style.setProperty('--base-line-height', s.lh);
  setCookie('font_size', size);
}
```

**設定画面のUI：**
```
フォントサイズ
[ 極小 ] [ 小 ] [ 中 ] [ 大 ]    ← 4択ボタン。選択で即反映（リアルタイムプレビュー）
```

**入力欄のiOS zoom防止：**
```css
.chat-input textarea {
  font-size: max(1rem, 16px); /* rem化しつつ最低16px保証 */
}
```

**Cookieに保存：** `font_size=md` として `init()` で復元。
**FOUC防止：** `<head>` 内の `<script>` でCookieからfont-sizeを即座に設定。

---

## A-3. ストリーミング中のカーソル点滅

AI応答のテキスト出力中、末尾にブリンクカーソル `▊` を表示。

```css
.streaming-cursor::after {
  content: '▊';
  animation: blink 0.8s infinite;
  color: var(--accent);
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
```

- ストリーミング開始時にmsg-bodyに `.streaming-cursor` クラスを付与
- ストリーミング完了で削除
- 「考え中...」ドットはストリーミング開始前のみ表示（テキスト出力開始で消える）

---

## A-4. メッセージのコピー・引用ボタン

メッセージにホバー（PC）or 長押し（スマホ）で、アクションバーが出現。

```
                               [ 📋 ] [ 💬 ]  ← 右上に小さく表示
AI応答テキスト...
```

- 📋 コピー：メッセージテキストをクリップボードにコピー。「コピーしました」トースト
- 💬 引用：チャット入力欄に引用テキストを挿入（`> 引用テキスト\n` 形式）

```css
.msg-actions {
  position: absolute;
  top: 4px;
  right: 4px;
  display: none;
  gap: 4px;
}
.chat-message:hover .msg-actions,
.chat-message.long-pressed .msg-actions {
  display: flex;
}
.msg-action-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--surface);
  border: 0.5px solid var(--border-subtle);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}
```

---

## A-5. ユーザーメッセージの編集・再送信

自分のメッセージをタップ→「編集して再送信」オプション。

- タップでメッセージがインライン編集モードに（テキストエリアに変わる）
- 「再送信」ボタンで、そのメッセージ以降のAI応答を上書き再生成
- 分岐は作らず「上書き」方式（ChatGPTより直感的）
- 「キャンセル」で元に戻る

---

## A-6. バージョン表示

### サイドバー最下部に表示

```javascript
// globals.js
const APP_VERSION = '3.0.0';
```

```html
<!-- サイドバーフッター -->
<div class="sidebar-footer">
  <a href="/terms.html">利用規約</a>
  <span>|</span>
  <a href="/privacy.html">プライバシー</a>
  <span class="version">v3.0.0</span>
</div>
```

```css
.sidebar-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 12px;
  padding: 12px 16px;
  font-size: 0.6875rem;
  color: var(--text-tertiary);
}
.sidebar-footer a {
  color: var(--text-tertiary);
  text-decoration: none;
  padding: 12px 8px; /* タップ領域44px確保 */
}
.sidebar-footer .version {
  color: var(--text-tertiary);
  font-size: 0.625rem;
}
```

**中央揃え**: flexboxで中央配置。スマホの見切れ問題も解消。

### sw.jsとの連動
```javascript
const CACHE_NAME = 'goal-ai-v' + APP_VERSION;
```

### /api/version エンドポイント追加（worker.js）
```javascript
if (path === '/api/version') {
  return json({ version: '3.0.0', deployed_at: new Date().toISOString() });
}
```

### バージョンタップで更新チェック
```javascript
document.querySelector('.version').addEventListener('click', async () => {
  const res = await fetch('/api/version');
  const data = await res.json();
  if (data.version !== APP_VERSION) {
    if (confirm(`新しいバージョン v${data.version} があります。更新しますか？`)) {
      location.reload(true);
    }
  } else {
    showToast('最新バージョンです');
  }
});
```

### Claude Code デプロイルール
デプロイ完了後、必ず以下をユーザーに報告すること：
```
Deployed: v3.1.0
変更: カレンダー月ビュー追加、テーマ視認性修正、チャットバブル廃止
```
バージョン番号ルール：
- 大変更（整数）: v3→v4 — カレンダー全面リデザイン等
- 小変更（小数第一）: v3.0→v3.1 — バグ修正バッチ、機能追加
- 極小変更（小数第二）: v3.1.0→v3.1.1 — CSS微調整、文言変更

---

# ═══════════════════════════════════════
# B. カレンダー全面リデザイン（14項目）
# ═══════════════════════════════════════

現在のカレンダーを破棄し、以下の仕様で全面作り直す。
参考イメージ：iOSカレンダーアプリ風の月グリッドビュー。

## B-1. 月グリッドビューの実装

```bash
grep -n "pg-calendar\|calendar\|カレンダー" frontend/js/ frontend/index.html | head -20
```

7列（日〜土）× 5-6行のグリッドで月全体を表示する。

```
┌──────────────────────────────────────────────┐
│  < 2026年3月 >                    [今日]      │
├──────┬──────┬──────┬──────┬──────┬──────┬──────┤
│  日  │  月  │  火  │  水  │  木  │  金  │  土  │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│  1   │  2   │  3   │  4   │  5   │  6   │  7   │
│ ■■■  │      │ ■■   │      │ ■    │      │      │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│  8   │  9   │ ...                              │
└──────┴──────┴──────────────────────────────────┘

■ = タスクのカラーピル（ゴール色で表示）
```

**セルの構成：**
```css
.cal-cell {
  min-height: 80px; /* スマホ */
  padding: 4px;
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  position: relative;
}

.cal-cell .date-num {
  font-size: 13px;
  font-weight: 500;
}

.cal-cell.today .date-num {
  background: var(--accent);
  color: white;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cal-cell .task-pill {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 3px;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: white;
}
```

**日曜は赤、土曜は青でテキスト色を変える。**
**当月以外の日付はグレーアウト。**

---

## B-2. タスクのカラーコード表示

ゴールごとに色を自動割当する。

```javascript
const GOAL_COLORS = [
  '#FF6B6B', // 赤
  '#4ECDC4', // ティール
  '#45B7D1', // スカイブルー
  '#F7B731', // オレンジ
  '#A55EEA', // パープル
  '#26DE81', // グリーン
  '#FC5C65', // ピンク
  '#778CA3', // グレーブルー
];

function getGoalColor(goalIndex) {
  return GOAL_COLORS[goalIndex % GOAL_COLORS.length];
}
```

- ゴール作成時にインデックスから色を自動割当
- カレンダーのタスクピルはゴールの色で表示
- タスク詳細画面にもゴール色のドットを表示

---

## B-3. 月/週/日の3ビュー切替

画面下部にタブバーを配置。

```
┌────────────────────────────────────┐
│  ← 今日   [月]   [週]   [日]  [+] │
└────────────────────────────────────┘
```

- **月ビュー**: B-1のグリッド
- **週ビュー**: 7日分を横並び、各日にタスク一覧を縦表示（タイムラインはB-11で対応）
- **日ビュー**: 選択した日のタスク一覧＋詳細表示

デフォルトは月ビュー。

---

## B-4. 「今日」ボタンで即座に今日に戻る

- 過去・未来の月を閲覧後、「今日」ボタンで今月＋今日のセルにスクロール
- 今日のセルは青丸（or アクセント色丸）で強調

---

## B-5. タスク追加の「+」ボタン

- 画面右下にフローティング「+」ボタン（FAB）
- タップ → モーダル表示：日付選択 + ゴール選択 + タスク名入力 + 保存
- ゴール未選択の場合は「ゴールなし」のタスクとして登録

---

## B-6. スワイプで月移動

- 左スワイプ → 翌月
- 右スワイプ → 前月
- ヘッダーの「<」「>」矢印でも移動可能
- touch-action: pan-y を設定して縦スクロールと干渉しないようにする

---

## B-7. 日付タップでタスク詳細展開

- 月ビューで日付セルをタップ → 画面下部にその日のタスク一覧がスライドアップ
- 各タスクにチェックボックス（完了/未完了トグル）
- タスクタップで編集モーダル
- ゴール色のドット + タスク名 + ゴール名（小さく）

---

## B-8. 期限切れタスクの視覚的警告

- 期限を過ぎた未完了タスクは赤ピル（背景`#FF4444`）で表示
- 今日のセルは特別な色（アクセント色の丸）
- 期限当日のタスクはオレンジピルで「今日まで」を視覚的に伝える

---

## B-9. ゴール進捗をカレンダーに重ねて表示

- 月ビューの上部にゴール進捗バーを横並びで表示
- 各ゴールの色ドット + ゴール名（短縮）+ 進捗%バー
- タップでそのゴールのタスクだけをフィルター表示

```
┌──────────────────────────────┐
│ 🔴 英語学習 ████████░░ 80%   │
│ 🔵 転職準備 ████░░░░░░ 40%   │
└──────────────────────────────┘
```

---

## B-10. AIが提案したタスクは専用アイコン付き

- AIが自動提案したタスクのピルには小さな ✨ マークを付与
- タスクのsourceフィールドで判別（`source: 'ai'` or `source: 'user'`）
- tasks テーブルに `source` カラムがなければ追加を検討（フロント側フラグでも可）

---

## B-11. 週ビューでタイムライン表示

- 週ビューは時間軸（6:00〜24:00）を縦に表示
- 各タスクを時間帯にマッピング（時間未設定のタスクは上部の「終日」エリアに表示）
- Google Calendarの週表示のイメージ

---

## B-12. ドラッグ&ドロップでタスク移動

- 月ビューでタスクピルを長押し（500ms）→ ドラッグモードに移行
- 別の日付セルにドロップで期日変更
- **スワイプ月移動（B-6）との競合回避**: ドラッグ中はスワイプを無効化。長押し判定で切り分け
- スマホのtouchstart/touchmove/touchendで実装

---

## B-14. 繰り返しタスク対応

- タスク追加モーダルに「繰り返し」オプション追加
- 選択肢：なし / 毎日 / 毎週 / 毎月
- 繰り返しタスクはカレンダーに自動展開表示
- tasks テーブルに `recurrence` カラム追加（`null` / `daily` / `weekly` / `monthly`）

---

## B-16. 祝日・六曜表示（日本向け）

- 日本の祝日を日付セルに小さく赤字で表示（例：「春分の日」）
- 六曜（大安・先勝・友引・先負・仏滅・赤口）を日付の横に極小テキストで表示
- 設定画面に「六曜を表示」ON/OFFトグル
- 六曜はJS計算ロジックで実装（外部API不要）：

```javascript
// 六曜計算（旧暦ベース）
function getRokuyo(date) {
  // 簡易計算: (旧暦月 + 旧暦日) % 6
  // 0:大安 1:赤口 2:先勝 3:友引 4:先負 5:仏滅
  const rokuyoNames = ['大安','赤口','先勝','友引','先負','仏滅'];
  // ※ 正確な旧暦変換ライブラリが必要。簡易版として
  // https://github.com/nicecottage/japanese-calendar 等を参考に実装
  return rokuyoNames[index];
}
```

- 祝日データは年間固定＋振替休日ロジックをJS内に持つ

---

# ═══════════════════════════════════════
# C. テーマ視認性修正＋ハラジュクテーマ（20項目）
# ═══════════════════════════════════════

## C-0. テーマ名称変更

- 「ポップ」→「**ハラジュク**」に名称変更
- テーマ選択UIの表示名・CSS変数名・Cookie値すべて変更
- 設定画面: `[ ダーク ] [ ライト ] [ ハラジュク ]` ＋ グラストグル

```bash
grep -rn "pop\|ポップ\|pastel" frontend/ | head -20
```

---

## C-1. 全グラスモードのテキストコントラスト比をWCAG AA準拠に

全グラスモードで、テキストと背景のコントラスト比を最低4.5:1に引き上げる。

**ダークグラス：**
```css
[data-theme="dark-glass"] {
  --text-primary: #E8E8E8;
  --text-secondary: #AAAAAA;
}
[data-theme="dark-glass"] .chat-message,
[data-theme="dark-glass"] .sidebar-item {
  text-shadow: 0 1px 3px rgba(0,0,0,0.5);
}
```

**ライトグラス：**
```css
[data-theme="light-glass"] {
  --text-primary: #333333;
  --text-secondary: #666666;
}
```

**ハラジュクグラス：**
```css
[data-theme="harajuku-glass"] {
  --text-primary: #3D1050;
  --text-secondary: #6B3A8A;
}
```

---

## C-2. グラスモードのカード背景に不透明度の底上げ

```css
[data-theme="dark-glass"] .card {
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(20px);
}
[data-theme="light-glass"] .card {
  background: rgba(255, 255, 255, 0.75);  /* 0.6では不十分、0.75に強化 */
  backdrop-filter: blur(12px);
}
[data-theme="harajuku-glass"] .card {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(15px);
}
```

**重要: カードだけでなく以下の全要素にも同じ不透明度ルールを適用すること：**
- サイドバー全体
- トースト通知
- 入力欄
- モーダル
- モードカード（通常・メンケア・壁打ち・スパルタ）
- Proアップグレードボックス
- 「私をデザイン」カード
- ドロップダウン・ポップアップ

**これらは全てCSS変数（`var(--card-bg)`, `var(--toast-bg)` 等）を参照する構成にすること（C-0参照）。**

---

## C-3. ライトグラス：メインテキストを#333333に固定

スクショの通り文字がほぼ見えない問題を修正。
ライト系グラスでは全テキストをダークグレーに強制。

---

## C-4. ハラジュクテーマのカラーパレット刷新

「ポップ」を廃止し「ハラジュク」として以下のパレットに全面変更。
原宿系・デコラ系のレインボー×ポップカルチャーの世界観。

### ハラジュク（通常）
```css
[data-theme="harajuku"] {
  --bg: linear-gradient(135deg, #FFF44F 0%, #FF69B4 50%, #BA55D3 100%);
  --bg-sidebar: linear-gradient(180deg, #FFE44F 0%, #FF85C8 100%);
  --surface: #FFFFFF;
  --card-bg: #FFFFFF;
  --card-border: 2px solid transparent;
  --card-border-image: linear-gradient(90deg, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #8B00FF) 1;
  --text-primary: #3D1050;
  --text-secondary: #7B3F9E;
  --accent: #FF1493;
  --accent-secondary: #FF6B9D;
  --border-subtle: rgba(255, 105, 180, 0.2);
  --gold: #FF1493; /* ゴールドの代わりにディープピンク */
}
```

### ハラジュク（グラス）
```css
[data-theme="harajuku-glass"] {
  --bg: linear-gradient(135deg, #FFF44F 0%, #FF69B4 50%, #BA55D3 100%);
  --surface: rgba(255, 255, 255, 0.65);
  --card-bg: rgba(255, 255, 255, 0.5);
  --text-primary: #3D1050;
  --text-secondary: #6B3A8A;
  backdrop-filter: blur(15px);
}
```

### デザインディテール
- カードの左ボーダーにレインボーグラデーション（赤→橙→黄→緑→青→紫）
- モード選択カードのアイコンをローズピンク`#FF1493`に統一
- ボタンは`#FF1493`（ディープピンク）ベース
- ホバー/アクティブ: `#FF69B4`（ホットピンク）
- Proアップグレードボックスはピンクグラデ枠

---

## C-5. ダークグラス：テキスト明度引き上げ

```css
[data-theme="dark-glass"] {
  --text-primary: #E8E8E8;
  --text-secondary: #AAAAAA;
}
```

テキストに `text-shadow: 0 1px 3px rgba(0,0,0,0.5)` を追加して縁取り。

---

## C-6. テーマプレビューサムネイル

設定画面のテーマ3択ボタンに色見本を追加：

```
[ ⚫ ダーク ] [ ⚪ ライト ] [ 🌈 ハラジュク ]
         [ グラスモード ●━━ OFF ]
```

各ボタンの左側に小さなグラデーション円（20px）を表示。
- ダーク: 黒→ダークブルーの円
- ライト: 白→薄グレーの円
- ハラジュク: 黄→ピンクの虹グラデ円

---

## C-7. グラスON時にカード枠線を強調

```css
[data-theme="dark-glass"] .card {
  border: 1px solid rgba(255, 255, 255, 0.2);
}
[data-theme="light-glass"] .card {
  border: 1px solid rgba(0, 0, 0, 0.12);
}
[data-theme="harajuku-glass"] .card {
  border: 1px solid rgba(255, 20, 147, 0.25);
}
```

---

## C-8. サイドバーのセクションラベルの視認性改善

「チャットレコード」「進行中のゴール」「パーソナル」等のラベルを：
```css
.sidebar-section-label {
  font-weight: 600;
  letter-spacing: 0.05em;
  font-size: 12px;
  text-transform: uppercase;
  color: var(--text-secondary);
}
```

---

## C-9. 「＋新しいゴールを追加」ボタンの視認性改善

枠線だけでなく背景にも薄い色を敷く：
```css
.add-goal-btn {
  background: rgba(228, 184, 106, 0.12);
  border: 1.5px solid var(--gold);
  color: var(--gold);
}

[data-theme="harajuku"] .add-goal-btn {
  background: rgba(255, 20, 147, 0.1);
  border-color: #FF1493;
  color: #FF1493;
}
```

---

## C-10. モード選択カード（通常・メンケア・壁打ち・スパルタ）のコントラスト強化

各モードカードに固有の色を設定：

| モード | 枠色 | 背景（薄） |
|--------|------|-----------|
| 通常 | ゴールド | rgba(228,184,106,0.08) |
| メンケア | #FF69B4（ピンク） | rgba(255,105,180,0.08) |
| 壁打ち | #4ECDC4（ティール） | rgba(78,205,196,0.08) |
| スパルタ | #FF6B35（オレンジ） | rgba(255,107,53,0.08) |

テキスト色はテーマの`--text-primary`に従う（テーマごとに確実に読める）。

---

## C-11. 「私をデザイン」カードの背景をテーマ対応に

テーマごとに背景色を明示的に設定：
```css
[data-theme="dark"] .design-card { background: rgba(160, 120, 255, 0.15); }
[data-theme="light"] .design-card { background: rgba(160, 120, 255, 0.08); }
[data-theme="harajuku"] .design-card { background: rgba(255, 20, 147, 0.1); }
```

---

## C-12. Proアップグレードボックスのコントラスト強化

グラスモードでもCTAとして目立つようにする：
```css
.upgrade-box {
  background: rgba(228, 184, 106, 0.15);
  border: 2px solid var(--gold);
}

[data-theme="harajuku"] .upgrade-box {
  background: rgba(255, 20, 147, 0.12);
  border: 2px solid #FF1493;
}

/* グラスモード共通 */
[data-theme$="-glass"] .upgrade-box {
  background: rgba(228, 184, 106, 0.25); /* 不透明度を上げる */
}
```

---

## C-13. テーマ変更時にフェードトランジション

```css
body {
  transition: background-color 0.3s ease, color 0.3s ease;
}

.card, .sidebar, .chat-message {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}
```

---

## C-14. ダークモードのアクセントカラー微調整

ダークモードのゴールドを少し明るく：
```css
[data-theme="dark"] {
  --gold: #F0C878; /* 旧: #E4B86A */
}
```

---

## C-15. ハラジュクモードのアイコンカラー統一

ハラジュクモードでは全アイコン（♡・⚡・🔍等のSVGアイコン）をローズピンク`#FF1493`に統一。
```css
[data-theme="harajuku"] svg,
[data-theme="harajuku-glass"] svg {
  stroke: #FF1493;
}
```

---

## C-16. 「端末に合わせる」自動テーマオプション

設定画面に「端末に合わせる」トグルを追加。
ONの場合、`prefers-color-scheme`でOSのダーク/ライト設定に自動追従。

```javascript
function applySystemTheme() {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(prefersDark ? 'dark' : 'light');
}

// テーマ設定画面
// [ ダーク ] [ ライト ] [ ハラジュク ]
// [ グラスモード ●━━ OFF ]
// [ 端末に合わせる ●━━ OFF ]  ← 追加
```

「端末に合わせる」がONの場合、3択ボタンは無効化（グレーアウト）。

---

## C-17. CSS変数を1箇所にまとめたテーママップ

全テーマの色定義をCSS変数20個に集約する。
これにより色調整時の漏れを防止し、将来のカスタムテーマ対応も容易になる。

```css
/* テーマ共通の変数名（全テーマで定義必須） */
--bg                  /* ページ背景 */
--bg-sidebar          /* サイドバー背景 */
--surface             /* 浮き上がった面の背景 */
--card-bg             /* カード背景 */
--card-border         /* カード枠線 */
--text-primary        /* メインテキスト */
--text-secondary      /* サブテキスト */
--text-tertiary       /* 極薄テキスト（プレースホルダー等） */
--accent              /* メインアクセント */
--accent-hover        /* アクセントホバー */
--gold                /* ゴールド（CTA） */
--border-subtle       /* 薄い区切り線 */
--border-card         /* カード枠線色 */
--danger              /* エラー・警告 */
--success             /* 成功 */
--icon-color          /* アイコン色 */
--shadow              /* box-shadow */
--glass-blur          /* グラスモードのblur量 */
--glass-opacity       /* グラスモードの不透明度 */
--transition          /* アニメーション速度 */
```

各テーマ（6種: dark, light, harajuku, dark-glass, light-glass, harajuku-glass）で全変数を定義する。

---

## C-18. コントラストチェックをデプロイ前grepに追加

```bash
# テーマ変数の存在確認
grep -c "\-\-text-primary" frontend/style.css     # 6以上（テーマ数分）
grep -c "\-\-text-secondary" frontend/style.css   # 6以上
grep -c "harajuku" frontend/style.css              # 5以上
grep -c "pop\|pastel" frontend/style.css           # 0件（旧テーマ名が残っていないか）
```

---

## C-19. グラスモードの背景ぼかし量をテーマごとに最適化

```css
[data-theme="dark-glass"]     { --glass-blur: 20px; }
[data-theme="light-glass"]    { --glass-blur: 12px; }
[data-theme="harajuku-glass"] { --glass-blur: 15px; }
```

---

# ═══════════════════════════════════════
# D. ナビゲーション・動線改善（17項目）
# ═══════════════════════════════════════

## D-1. ゴール設定画面にハンバーガーメニュー（☰）追加

ゴール設定画面のヘッダー左端に☰を配置。タップでサイドバーが開く。
全画面共通のヘッダーコンポーネントとして統一する。

```bash
grep -n "pg-goal\|goal-edit\|goal-create\|ゴール設定" frontend/js/ frontend/index.html | head -15
```

---

## D-2. GOAL AIロゴタップ→ホーム移動

全画面共通：ヘッダーのGOAL AIロゴ（王冠）をタップするとホームに遷移。
Webサービスの標準動線。

```javascript
// ロゴ要素にクリックハンドラ
document.querySelector('.logo').addEventListener('click', () => {
  showPage('home');
  closeSidebar();
});
document.querySelector('.logo').style.cursor = 'pointer';
```

---

## D-3. ゴール設定完了→タスク設定フェーズへの自動遷移

ゴール保存成功後、以下のフローで進む：

```
ゴール保存成功
    ↓
「🎯 ゴールを設定しました！」トースト表示
    ↓
自動で「タスク設定フェーズ」画面に遷移（1秒後）
    ↓
┌─────────────────────────────────────┐
│ 🎯 TOEIC 800点取得                  │
│                                      │
│ ステップ ① ゴール ✅ → ② タスク 👈  │
│                                      │
│ AIがタスクを提案します。             │
│ 一緒にタスクを作りましょう！          │
│                                      │
│ ┌─────────────────────────────────┐ │
│ │ 💡 AIの提案:                     │ │
│ │ □ 単語帳を毎日30分              │ │
│ │ □ 模擬テストを週1回            │ │
│ │ □ リスニング教材を通勤中に      │ │
│ │                                  │ │
│ │ [ すべて追加 ] [ 選んで追加 ]    │ │
│ └─────────────────────────────────┘ │
│                                      │
│ ＋ 自分でタスクを追加                │
│                                      │
│ [ ホームに戻る ]  [ 完了 ]           │
└─────────────────────────────────────┘
```

- AIがゴール内容に基づいてタスクを3〜5個自動提案
- ユーザーはチェックボックスで選択→「選んで追加」で保存
- 「自分でタスクを追加」で手動入力も可能
- 「完了」でホームチャットに遷移。AIが「一緒に頑張りましょう！」とメッセージ

---

## D-4. ゴール設定画面の上部にパンくずリスト

```
ホーム > ゴール > 新規作成
```

- 各リンクタップで該当画面に移動
- スマホでは `← ゴール一覧` のシンプルな戻るリンクに

---

## D-5. 「キャンセル」ボタンの明確化

ゴール設定フォームの下部に「キャンセル」ボタン。タップで前の画面に戻る。
保存前の変更がある場合は「変更を破棄しますか？」確認ダイアログ。

---

## D-6. スマホで左端からの右スワイプ→サイドバー表示

画面左端20pxからの右スワイプでサイドバーを開く。
ゴール設定画面だけでなく**全画面で有効**にする。

```javascript
let touchStartX = 0;
document.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
});
document.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (touchStartX < 20 && dx > 60) {
    openSidebar();
  }
});
```

**注意**: カレンダーのスワイプ月移動（B-6）との競合回避 → カレンダー画面ではこのジェスチャーを無効化するか、左端20px限定にする。

---

## D-7. ゴール設定中のAIアシストボタン

フォーム横に小さな💬ボタン。
タップでホームチャットにゴール情報を引き継いで遷移。

```javascript
function askAIAboutGoal(goalData) {
  // ホームチャットに遷移
  showPage('home');
  // 入力欄にゴール情報をプリセット
  const prompt = `「${goalData.title}」というゴールについて相談したいです。`;
  document.getElementById('home-input').value = prompt;
}
```

---

## D-8. 画面遷移アニメーション

ゴール一覧→ゴール設定画面の遷移にスライドアニメーション。

```css
.page-enter {
  animation: slideInRight 0.25s ease;
}
.page-leave {
  animation: slideOutLeft 0.25s ease;
}
@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes slideOutLeft {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(-30%); opacity: 0; }
}
```

---

## D-9. サイドバー空白エリアタップ→ホームに移動

サイドバー内のメニュー項目以外の空白エリア（余白部分）をタップ/クリックすると、
サイドバーを閉じてホーム画面に遷移する。

```javascript
document.getElementById('sb').addEventListener('click', (e) => {
  // メニュー項目やボタンをクリックした場合はスキップ
  if (e.target.closest('a, button, .sidebar-item, .mode-card, .goal-card, .upgrade-box')) return;
  // 空白エリアのクリック → ホームに移動
  closeSidebar();
  showPage('home');
});
```

---

## D-10. 各タブからホームに移動する動線

全タブ（タスク・カレンダー・設定・フィードバック等）のヘッダーに
ホームへの遷移手段を確保する：

- **ロゴタップ**: D-2で全画面共通対応済み
- **☰ → サイドバー → ホーム**: サイドバーの最上部に「🏠 ホーム」メニュー項目を追加

```html
<!-- サイドバーの最上部に追加 -->
<div class="sidebar-item sidebar-home" onclick="showPage('home'); closeSidebar();">
  🏠 ホーム
</div>
```

---

## D-11. 「＋新しいゴールの追加」→「＋新しいゴール」に文言変更

```bash
grep -rn "新しいゴールの追加\|新しいゴールを追加" frontend/ | head -10
```

全箇所を「＋新しいゴール」に変更。

---

## D-12. ゴール設定フォームにプログレスステッパー

ゴール設定を4ステップで可視化する：

```
① ゴール名 → ② 理由 → ③ 期限 → ④ 確認
   ●━━━━━━━━●━━━━━━━━●━━━━━━━━○
```

- 各ステップごとに画面をスライドで切り替え
- 戻るボタンで前のステップに戻れる
- ④確認ステップで全入力内容のサマリーを表示
- 「保存する」ボタン → D-3のタスク設定フェーズに自動遷移
- ステッパーの下に小さく「ゴール設定 → **タスク設定**」の全体フローを表示し、次のステップがあることを伝える

---

## D-13. 「G」アイコン → ゴール＆タスクのフルスクリーンモーダル

ホームチャット画面のヘッダーに「**G**」アイコンを追加。
タップでゴール＆タスク一覧がフルスクリーンモーダルで表示される。

### UIイメージ
```
┌─────────────────────────────────────┐
│ ×                     ゴール＆タスク │
├─────────────────────────────────────┤
│                                      │
│ 🔴 TOEIC 800点取得      80% ████░░  │
│   ├ □ 単語帳を毎日30分    →         │
│   ├ ☑ 模擬テストを週1回   →         │
│   └ □ リスニング教材       →         │
│                                      │
│ 🔵 転職準備               40% ███░░  │
│   ├ □ 職務経歴書の更新     →         │
│   └ □ 面接練習             →         │
│                                      │
│         ＋ 新しいゴール               │
└─────────────────────────────────────┘
```

### 動作
- 「G」アイコン: ヘッダーの☰の右隣に配置。丸ボタンに「G」の文字
- ゴール名タップ: ゴール詳細/編集画面に遷移
- タスク行の「→」タップ: **そのタスク専用のチャット画面に遷移**（モーダルを閉じてタスクチャットを表示）
- チェックボックス: その場で完了/未完了をトグル
- ゴール色のドットで色分け（カレンダーのカラーコードと同じ色）
- 「＋新しいゴール」タップ: ゴール設定フェーズ（D-12）を起動

```javascript
function openGoalModal() {
  // フルスクリーンモーダルを表示
  const modal = document.getElementById('goal-modal');
  modal.style.display = 'flex';
  modal.classList.add('fullscreen-modal');
  renderGoalTaskList(modal); // ゴール＋タスク一覧をレンダリング
}

function onTaskArrowClick(taskId, goalId) {
  // モーダルを閉じてタスク専用チャットに遷移
  closeGoalModal();
  showPage('task-chat');
  loadTaskChat(taskId, goalId);
}
```

---

## D-14. 「ホームに戻る」フローティングボタン（ゴール設定画面）

ゴール設定画面の右下に🏠アイコンのFAB。1タップでホームに直帰。
保存前の変更がある場合は「変更を破棄しますか？」確認ダイアログ。

---

## D-15. キーボードショートカット（PC向け）

```javascript
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // モーダルが開いていれば閉じる、なければホームに戻る
    if (isModalOpen()) closeModal();
    else showPage('home');
  }
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    saveCurrentGoal(); // ゴール保存
  }
});
```

---

## D-16. ゴール設定画面↔ホームチャットのスプリットビュー（PC向け）

PC幅（1024px以上）の場合、左にゴール設定フォーム、右にAIチャットを並べて表示。
チャットで相談しながらゴールを詰められる。

```css
@media (min-width: 1024px) {
  .goal-edit-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    height: 100%;
  }
}
```

スマホでは通常のフルスクリーン表示。

---

## D-17. 音声ゴール設定（ホームチャット統合型・パターンC）

ホームチャットで音声入力されたゴール関連の発言をAIが構造化し、
チャット内でゴール保存まで完結するフロー。

### フロー
```
ユーザー：🎤「TOEIC800点取りたい」（音声入力 → Whisper変換）
    ↓
AI：通常のコーチングフロー（What+Whyの掘り下げ）
    ↓
AI：「まとめると以下のゴールですね。」
┌─────────────────────────────────────┐
│ 🎯 TOEIC 800点取得                  │
│ 💡 転職に必要なため                 │
│ 📅 2026年12月31日                   │
│                                      │
│ [ このゴールを保存する ]              │
│ [ もう少し相談する ]                  │
└─────────────────────────────────────┘
    ↓ 「保存する」タップ
ゴール保存 → D-3のタスク設定フェーズに自動遷移
```

### 実装ポイント
- 既存のホームチャットのAIコーチングフロー（What+Why→ゴール提案）をそのまま利用
- AIの応答にゴール情報が揃った時点で「保存ボタン付きカード」をチャット内に表示
- 保存ボタンは通常のHTMLボタンとしてチャットバブル内に挿入
- 音声入力でもテキスト入力でも同じフローが動く（音声専用ではない）
- AIのシステムプロンプトに「What+Whyが揃ったらゴール提案カードを出す」ルールを追加

```javascript
// AIの応答にゴール提案が含まれる場合、保存ボタンカードを挿入
function renderGoalProposalCard(goalData) {
  return `
    <div class="goal-proposal-card">
      <div class="goal-proposal-title">🎯 ${escapeHtml(goalData.title)}</div>
      <div class="goal-proposal-why">💡 ${escapeHtml(goalData.why)}</div>
      <div class="goal-proposal-deadline">📅 ${escapeHtml(goalData.deadline)}</div>
      <button onclick="saveGoalFromChat(${JSON.stringify(goalData)})">このゴールを保存する</button>
      <button onclick="continueChat()">もう少し相談する</button>
    </div>
  `;
}
```

---

# ═══════════════════════════════════════
# E. ホームチャット→ゴールアシスト自動検出（18項目）
# ═══════════════════════════════════════

ホームチャットは「気軽にしゃべれる場所」として維持する。
ユーザーがゴール化するような話を始めたら、自然にゴールアシストに誘導する。
**チャットの気軽さを壊さないことが最優先。**

## E-1. AIゴール検出エンジン（システムプロンプト制御）

AIのシステムプロンプトに以下のルールを追加：

```
【ゴール検出ルール】
ユーザーが目標・夢・やりたいこと・悩みの解決策を話し始めたら、
以下の3段階で判断する：

レベル1（雑談）：「最近暑いね」→ ゴール提案しない
レベル2（願望）：「英語できるようになりたいな」→ まだ掘り下げる
レベル3（意図あり）：「来年の転職までにTOEIC800取りたい」
  → What（何を）+ Why（なぜ）が揃った → ゴール提案カードを出す

即座に提案せず、What + Whyが揃うまで自然な会話で掘り下げること。
検出キーワード例：「〜したい」「〜になりたい」「〜を始めようと思う」
```

---

## E-2. ゴール提案カード（チャット内インライン表示）

AIがゴール化を提案する際、通常テキストの後に専用カードを挿入：

```
────────────────────────────────
💡 ゴールにしませんか？

「TOEIC 800点を12月までに取る」

一緒にタスクを作って、進捗を
追いかけていきましょう！

[ ゴールアシストを始める ]
[ 今はいい、話を続ける ]
────────────────────────────────
```

- 「ゴールアシストを始める」→ ゴール設定フェーズ（D-12のステッパー）に遷移
- 「今はいい」→ 通常チャット継続。AIは**同じ話題で再提案しない**
- カードのスタイルはテーマのCSS変数に従う（`var(--card-bg)` 等）

---

## E-3. ゴールアシストへの遷移時にチャット文脈を引き継ぐ

ホームチャットで話した内容（What/Why/期限等）をゴール設定フォームに自動プリフィル。

```javascript
function startGoalAssist(goalData) {
  // ゴール設定フォームにプリフィル
  document.getElementById('goal-title').value = goalData.title || '';
  document.getElementById('goal-why').value = goalData.why || '';
  document.getElementById('goal-deadline').value = goalData.deadline || '';
  // ゴール設定画面に遷移
  showPage('goal-create');
}
```

ユーザーは確認→修正→保存するだけ。「もう一回説明する」ストレスがゼロ。

---

## E-4. ゴールアシスト完了後にホームチャットに自然に戻る

タスク設定フェーズ完了 → ホームチャットに自動遷移。
AIが「ゴールとタスクを設定しました！何か他に気になることはありますか？」と続ける。
チャットの流れが途切れない。

---

## E-5. 「今はいい」後のリマインド（2日後・違う切り口）

ゴール提案を断った場合：
- 同じセッションでは再提案しない
- **2日後**の会話開始時に、**違う切り口**で自然に話題を戻す

```
例：ユーザーが「TOEIC800」を断った場合

2日後のAI：
「そういえば、最近のTOEIC試験は問題形式が変わったそうです。
 英語学習について何か進展はありましたか？」
```

- 関連ニュース・情報を添えて自然に話題に触れる
- 「ゴールにしますか？」とは直接聞かない
- 会話の中で再びレベル3に達したら再度ゴール提案カードを表示
- **2回提案を断ったら二度とリマインドしない**

実装：Cookieまたはchat_messagesに `declined_goals: [{topic, date, count}]` を保存

---

## E-6. ゴール提案カードに「参考ゴール」を表示

AIが提案する際、類似の人気ゴールテンプレートを1〜2個小さく表示：

```
────────────────────────────────
💡 ゴールにしませんか？
「TOEIC 800点を12月までに取る」

📋 似たゴール：英検準1級 / IELTS 7.0

[ ゴールアシストを始める ]
[ 今はいい、話を続ける ]
────────────────────────────────
```

---

## E-7. 「最近の話題」タグ表示（入力欄の上）

チャット入力欄の**直上**に、直近の会話から抽出したキーワードタグを横スクロールで表示。

```
┌─────────────────────────────────┐
│ チャットメッセージ...            │
│                                  │
│ [英語学習] [転職] [副業]    ← タグ│
├─────────────────────────────────┤
│ 会話を始める     🎤  ➤          │
└─────────────────────────────────┘
```

- タグタップ → 「この話題をゴールにしますか？」カードが出る
- タグはAIが会話内容から自動抽出（GPT-5 miniで判定）
- 話題がなければタグ非表示

---

## E-8. ゴールアシストモードの視覚的切り替え

ホームチャット → ゴールアシストに遷移したら、画面上部にゴールドバナーを表示：

```
┌─────────────────────────────────┐
│ 🎯 ゴールアシスト中：TOEIC 800点 │
└─────────────────────────────────┘
```

- バナータップでゴール詳細を表示
- 「×」でバナーを閉じてホームチャットに戻る
- バナーの色はテーマの`var(--accent)`に従う

---

## E-9. チャット履歴からゴール候補を後から拾える

過去の会話一覧で、AIがゴール候補と判断した会話に★マーク。
★付き会話タップ → 「この会話からゴールを作りますか？」

実装：chat_messagesテーブルに `has_goal_candidate: boolean` フラグ追加

---

## E-10. ゴールアシスト中はAIの質問スタイルが変わる

| モード | AI応答スタイル |
|--------|---------------|
| ホームチャット | 自由な会話、雑談OK、質問1回ルール |
| ゴールアシスト | 構造化質問（What→Why→期限→制約→タスク）、ステップバイステップ |

切り替わったことがAIの口調からも自然にわかるようにする。

---

## E-11. 複数ゴール候補を同時に検出

1つの会話で複数の目標が出てきた場合：

```
AI：「2つの目標が見えますね。
     ① TOEIC 800点
     ② 転職活動
     どちらを先に取り組みましょうか？」

[ ① TOEIC 800点 ]  [ ② 転職活動 ]  [ 両方 ]
```

選んだ方からゴールアシストに進む。「両方」の場合は1つずつ順番に設定。

---

## E-12. ゴール化率ダッシュボード（管理者向け・Phase 2）

- 何%の会話がゴール提案に至ったか
- 提案→ゴール作成の転換率
- 「今はいい」率の集計

---

## E-13. ゴール提案タイミング最適化（A/Bテスト・Phase 2）

- What+Why揃った直後 vs 会話が一段落してから
- feedbacksテーブルで計測

---

## E-14. クイックゴール（チャット内キーワードロングタップ・Phase 2）

チャット中のキーワードをロングタップ → 「これをゴールにする」ポップアップ。
ゴール名だけ即登録、詳細は後で追加。

---

## E-15. AIが「ゴール達成報告」を検出して祝う

ホームチャットで「TOEIC820点取れた！」とユーザーが報告した場合：
- AIが該当ゴールを自動検出
- 「おめでとうございます！🎉」＋進捗100%更新の提案
- コンフェッティアニメーション発動
- 検出：AIシステムプロンプトに「達成報告を検出したら祝う」ルール追加

---

## E-16. ゴールアシスト中の「雑談ボタン」

ゴールアシスト中に「ちょっと脱線したい」場合：
- 💬ボタンで一時的にホームチャットモードに切替
- 戻るボタンでゴールアシストの続きに復帰
- 文脈は保持

---

## E-17. 定期チェックイン（ストリークと連動・Phase 2）

ログイン時にAIが：
「今日は〇〇のゴールに取り組みますか？それとも気軽に話しましょう」
- ゴール選択 → タスクチャットに直行
- 「気軽に話す」→ 通常ホームチャット

---

## E-18. 会話テーマの自動タグ付け（Supabase保存）

ホームチャットの各セッションに自動でテーマタグを付与（AI判定）。
chat_messagesテーブルに `topic_tags: text[]` カラム追加。
後から「英語学習に関する会話」を一覧で見られる。

---

# ═══════════════════════════════════════
# F. 音声入力の全面改善（14項目 + バグ3件）
# ═══════════════════════════════════════

## F-0. 【緊急バグ】録音が15文字程度で途切れる

```bash
grep -n "timeslice\|stop()\|ondataavailable\|chunks\|audioBlob\|MediaRecorder" frontend/js/chat.js | head -20
```

**原因調査：**
- `MediaRecorder`の`stop()`が即座に呼ばれている可能性
- `ondataavailable`で取得したchunkの結合処理で最初のchunkしか送っていない可能性
- `timeslice`パラメータが短すぎる可能性

**修正方針：**
- `ondataavailable`で全chunkを配列に蓄積し、`onstop`で結合してBlobを生成
- `stop()`呼び出しタイミングを確認し、ユーザーが明示的に停止するまで録音を継続

---

## F-0b. 【緊急バグ】「ご視聴ありがとうございました」の謎テキスト

```bash
grep -rn "ご視聴\|視聴ありがとう\|ありがとうございました" frontend/ src/
```

音声入力していないのに「ご視聴ありがとうございました」がチャット入力欄に表示される。
デモテキスト・テスト用テキスト・フォールバック文言として残っている可能性。見つけたら削除。

---

## F-0c. 【緊急バグ】音声入力が意図せず起動している

```bash
grep -n "SpeechRecognition\|webkitSpeechRecognition\|recognition.start\|mediaRecorder.start" frontend/js/chat.js | head -15
```

ユーザーが🎤を明示的にタップするまで録音を開始しないようにする。
`init()`やページ読み込み時に自動起動していないか確認。

---

## F-1. タップ切替方式（メイン操作）

🎤ボタンの操作を以下に変更：

- **タップ1回**: 録音開始。🎤アイコンが赤い■（停止ボタン）に変化
- **もう1回タップ**: 録音停止→テキスト変換→入力欄に挿入（即送信しない）
- **長押し**: Push-to-Talk方式。押している間だけ録音。離すとテキスト変換→入力欄に挿入

```javascript
let isRecording = false;
let pressTimer = null;

micBtn.addEventListener('touchstart', () => {
  pressTimer = setTimeout(() => {
    // 長押し検出 → Push-to-Talk開始
    startRecording('push-to-talk');
  }, 300);
});

micBtn.addEventListener('touchend', () => {
  clearTimeout(pressTimer);
  if (isRecording && recordMode === 'push-to-talk') {
    stopRecording(); // 長押し終了 → 停止
  } else if (isRecording && recordMode === 'toggle') {
    stopRecording(); // タップ切替 → 停止
  } else {
    startRecording('toggle'); // タップ切替 → 開始
  }
});
```

**初回のみヒント表示：**
🎤ボタンの上に吹き出し「タップで録音開始。長押しで押している間だけ録音。」
1回使ったらCookieで非表示に。

---

## F-2. リアルタイム文字起こし表示

録音中に入力欄にリアルタイムで仮テキストを表示する。

```javascript
// Web Speech APIで仮テキスト表示
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'ja-JP';
recognition.interimResults = true;
recognition.continuous = true;

recognition.onresult = (e) => {
  let interim = '';
  for (let i = e.resultIndex; i < e.results.length; i++) {
    interim += e.results[i][0].transcript;
  }
  inputEl.value = interim; // 仮テキストを入力欄に表示
  inputEl.style.color = 'var(--text-tertiary)'; // 仮テキストは薄い色
};
```

- 録音終了後にWhisperで正確な文字起こしに差し替え
- 差し替え時にテキスト色を通常に戻す

---

## F-3. 音量波形アニメーション

録音中に🎤ボタンの周りに音量連動の波形リングを表示。

```javascript
const audioContext = new AudioContext();
const analyser = audioContext.createAnalyser();
// マイク入力 → analyser → 音量を取得
const source = audioContext.createMediaStreamSource(stream);
source.connect(analyser);

function updateWaveform() {
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteTimeDomainData(data);
  const volume = Math.max(...data) / 128 - 1; // 0〜1
  // volumeに応じてリングのサイズを変更
  micRing.style.transform = `scale(${1 + volume * 0.5})`;
  if (isRecording) requestAnimationFrame(updateWaveform);
}
```

---

## F-4. 無音検出で自動停止（3秒）

話し始めてからの無音を検出。**3秒無音で自動停止。**

```javascript
let silenceTimer = null;
const SILENCE_THRESHOLD = 0.02; // 音量閾値
const SILENCE_TIMEOUT = 3000;   // 3秒

function checkSilence(volume) {
  if (volume < SILENCE_THRESHOLD) {
    if (!silenceTimer) {
      silenceTimer = setTimeout(() => {
        stopRecording(); // 3秒無音で自動停止
      }, SILENCE_TIMEOUT);
    }
  } else {
    clearTimeout(silenceTimer);
    silenceTimer = null;
  }
}
```

- 録音開始直後の沈黙はカウントしない（最初の音声検出後からカウント開始）

---

## F-5. 録音キャンセルのスワイプジェスチャー

録音中に🎤ボタンから左にスワイプするとキャンセル（Telegram方式）。

```javascript
let startX = 0;
micBtn.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; });
micBtn.addEventListener('touchmove', (e) => {
  const dx = e.touches[0].clientX - startX;
  if (dx < -60 && isRecording) {
    cancelRecording(); // 左に60px以上スワイプでキャンセル
    showToast('録音をキャンセルしました');
    // 短いバイブレーション
    if (navigator.vibrate) navigator.vibrate(50);
  }
});
```

---

## F-6. 録音完了後にプレビュー＋編集

録音終了→即送信ではなく、入力欄にテキストを表示して**ユーザーが確認・編集してから送信**。

- Whisper変換完了 → テキストを入力欄に挿入
- ユーザーが内容を確認・修正
- 送信ボタンをタップで送信
- Claude.aiの音声入力と同じフロー

---

## F-7. 音声入力の言語自動検出

Whisper APIの`language`パラメータを省略して自動検出にする。

```javascript
// worker.js の Whisper API呼び出し
const formData = new FormData();
formData.append('file', audioBlob, 'recording.webm');
formData.append('model', 'whisper-1');
// language パラメータを省略 → 自動検出
```

---

## F-8. 最大録音時間60秒

```javascript
const MAX_RECORDING_MS = 60000;

function startRecording() {
  // ...
  recordingTimeout = setTimeout(() => {
    stopRecording();
    showToast('録音の上限（60秒）に達しました');
  }, MAX_RECORDING_MS);

  // 残り10秒で警告色に変更
  warningTimeout = setTimeout(() => {
    micBtn.classList.add('recording-warning'); // オレンジ色に
  }, MAX_RECORDING_MS - 10000);
}
```

---

## F-9. キーボードショートカットで音声入力（PC向け）

```javascript
document.addEventListener('keydown', (e) => {
  // Ctrl+Shift+V で音声入力トグル
  if (e.ctrlKey && e.shiftKey && e.key === 'V') {
    e.preventDefault();
    toggleRecording();
  }
});
```

---

## F-10. 連続音声入力モード

1回の録音で終わらず、送信後も録音モードが継続。

- 設定画面に「連続音声モード」トグル（デフォルトOFF）
- ONの場合：録音停止→テキスト挿入→送信→自動で次の録音開始
- マイクアイコン横に「連続」バッジ表示
- 通常のタップで停止

---

## F-11. 音声入力時のAI応答読み上げ（TTS）

```javascript
function speakText(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  utterance.rate = 1.1; // やや速め
  speechSynthesis.speak(utterance);
}
```

- 設定画面に「AI応答を読み上げ」トグル（デフォルトOFF）
- ONの場合：AI応答完了後に自動で読み上げ開始
- 読み上げ中に画面タップで停止

---

## F-12. ウィスパーモード（小声対応）

```javascript
const gainNode = audioContext.createGain();
gainNode.gain.value = 3.0; // マイク感度3倍
source.connect(gainNode);
gainNode.connect(analyser);
```

- 設定画面に「小声モード」トグル（デフォルトOFF）
- ONの場合マイクゲインを上げて小声でも拾える
- 🎤アイコンに🤫マーク表示

---

## F-13. 音声からゴール・タスクを直接作成

E（ゴールアシスト）のフローと連動。

- 音声入力 →「明日までにレポート出す」
- AI解析 →「タスクを作成しますか？」カード表示
  - タスク名：レポート提出
  - 期限：明日
  - ゴール紐付き：（選択可）
- 「作成する」タップでタスク保存

---

# ═══════════════════════════════════════
# G. タスク画面の改善
# ═══════════════════════════════════════

## G-1. タスク画面から直接タスク追加

タスク画面に「＋新しいタスク」ボタンを追加。タップでモーダル表示。

### モーダルUI
```
┌─────────────────────────────────────┐
│ ＋ 新しいタスク                      │
├─────────────────────────────────────┤
│                                      │
│ タスク名                             │
│ ┌─────────────────────────────────┐ │
│ │                                  │ │
│ └─────────────────────────────────┘ │
│                                      │
│ ゴール紐付き                         │
│ ┌─────────────────────────────────┐ │
│ │ なし（独立タスク）           ▼   │ │
│ │ ── 選択肢 ──                     │ │
│ │ 🔴 TOEIC 800点取得               │ │
│ │ 🔵 転職準備                       │ │
│ │ なし（独立タスク）               │ │
│ └─────────────────────────────────┘ │
│                                      │
│ 期限（任意）                         │
│ ┌──────────┐                        │
│ │ 2026-03-20│                        │
│ └──────────┘                        │
│                                      │
│ [ キャンセル ]        [ 追加する ]    │
└─────────────────────────────────────┘
```

### 実装詳細
- 「なし（独立タスク）」がデフォルト → ゴール紐付きなしのタスク
- ゴールを選択 → そのゴールのタスクとして登録、ゴール色で表示
- 期限は任意。設定するとカレンダーに表示される
- タスク画面のヘッダー右 or フローティング「+」ボタンから起動

```javascript
function addTaskDirect(taskName, goalId, deadline) {
  const task = {
    title: taskName,
    goal_id: goalId || null, // null = 独立タスク
    deadline: deadline || null,
    status: 'pending',
    source: 'user' // AI提案と区別
  };
  // Supabase保存
  await apiCall('/api/tasks', 'POST', task);
  // UI更新
  renderTaskList();
  showToast('タスクを追加しました');
}
```

### 独立タスクの表示
- ゴール紐付きなしのタスクはグレーのドットで表示
- タスク一覧では「ゴールなし」セクションにグループ化
- カレンダーでもグレーピルで表示

---

```bash
# 1. sw.jsのキャッシュバージョンをインクリメント
grep "CACHE_NAME" frontend/sw.js
# 新しいバージョンに更新

# 2. 保全確認grep（過去修正の消失防止）
grep -c "escapeHtml" frontend/js/api.js                         # 1以上
grep -c "Secure" frontend/index.html                            # 1以上
grep -c "console.log" frontend/index.html                       # 0件
grep "chat.*5\b" src/worker.js                                  # Free制限5回
grep "goal-ai-frontend.pages.dev" src/worker.js                 # Stripe URL
grep -c "overscroll-behavior" frontend/style.css                # 1以上
grep -c "kabeuchi\|壁打ち" frontend/js/chat.js                  # 1以上
grep -c "launchConfetti\|checkMilestone" frontend/js/goals.js   # 2以上
grep -c "transcribeAudio\|MediaRecorder" frontend/js/chat.js    # 1以上

# 3. 今回の修正確認grep
# A. チャット
grep -c "msg-body\|msg-header" frontend/style.css               # 2以上（バブル廃止確認）
grep -c "base-font-size" frontend/style.css                     # 2以上（rem化・フォントサイズ変数）
grep -c "text-user" frontend/style.css                          # 6以上（ユーザー/AI文字色分け）
grep -c "streaming-cursor" frontend/style.css                   # 1以上（ストリーミングカーソル）
grep -c "msg-actions\|msg-action-btn" frontend/style.css        # 2以上（コピー・引用ボタン）
grep -c "APP_VERSION" frontend/js/globals.js                    # 1以上（バージョン定数）
grep -c "align-items.*flex-end" frontend/style.css              # 1以上（アイコン下揃え）
grep -c "msg-footer" frontend/style.css                         # 1以上（タイムスタンプ+モデル名）

# B. カレンダー
grep -c "cal-cell\|cal-grid" frontend/style.css                 # 2以上（カレンダーグリッド）
grep -c "GOAL_COLORS\|getGoalColor" frontend/js/goals.js        # 2以上（カラーコード）
grep -c "getRokuyo\|六曜" frontend/js/                          # 1以上（六曜実装）
grep -c "recurrence\|繰り返し" frontend/js/                     # 1以上（繰り返しタスク）

# C. テーマ
grep -c "harajuku" frontend/style.css                           # 5以上（新テーマ名）
grep -c "pop\|pastel\|ポップ" frontend/style.css                # 0件（旧テーマ名削除確認）
grep -c "\-\-text-primary" frontend/style.css                   # 6以上（全テーマ定義）
grep -c "prefers-color-scheme" frontend/js/                     # 1以上（端末テーマ連動）

# D. ナビゲーション
grep -c "showPage.*home\|goHome" frontend/js/                   # 3以上（ホーム遷移動線）
grep -c "goal-modal\|openGoalModal" frontend/js/                # 2以上（Gアイコンモーダル）
grep -c "新しいゴール\"" frontend/                               # 1以上（文言変更確認）
grep "新しいゴールの追加\|新しいゴールを追加" frontend/          # 0件（旧文言削除確認）
grep -c "goal-proposal-card\|saveGoalFromChat" frontend/js/     # 2以上（音声ゴール設定）
grep -c "stepper\|step-indicator" frontend/                     # 2以上（プログレスステッパー）

# E. ゴールアシスト
grep -c "goal-proposal-card\|ゴールにしませんか" frontend/js/   # 2以上（ゴール提案カード）
grep -c "startGoalAssist\|goalAssist" frontend/js/              # 2以上（ゴールアシスト遷移）
grep -c "declined_goals\|リマインド" frontend/js/               # 1以上（断った後のリマインド）
grep -c "topic.*tag\|topicTag" frontend/js/                     # 1以上（話題タグ）

# F. 音声入力
grep -rn "ご視聴\|視聴ありがとう" frontend/ src/                # 0件（デモテキスト削除確認）
grep -c "toggle.*record\|push-to-talk\|toggleRecording" frontend/js/ # 2以上（タップ切替方式）
grep -c "SpeechRecognition\|interimResults" frontend/js/        # 2以上（リアルタイム文字起こし）
grep -c "silenceTimer\|SILENCE_TIMEOUT" frontend/js/            # 2以上（無音3秒停止）
grep -c "cancelRecording\|swipe.*cancel" frontend/js/           # 1以上（スワイプキャンセル）
grep -c "MAX_RECORDING\|60000" frontend/js/                     # 1以上（60秒上限）

# G. タスク
grep -c "addTaskDirect\|新しいタスク" frontend/js/              # 2以上（タスク直接追加）
grep -c "goal_id.*null\|独立タスク" frontend/js/                # 1以上（ゴール紐付きなし対応）

# ★ 緊急バグ
grep -c "return.*after.*route\|break.*after.*gemini" frontend/js/chat.js  # 1以上（ルーティング後にreturnで終了）

# H. システムプロンプト
grep "質問.*答え\|まず答え\|最優先.*回答" src/worker.js                    # 1以上（新システムプロンプト反映）
grep "ゴール.*誘導.*禁止\|押し付け.*禁止" src/worker.js                   # 1以上（禁止事項反映）
grep "大切にしたいこと" src/worker.js                                      # 0件（旧プロンプト削除確認）

# CSS変数ハードコード残存チェック（最重要）
# ※ 以下が0件に近いほど良い。white/black/inherit/transparent/currentColorは許容
grep "color:.*#[0-9a-fA-F]" frontend/style.css | grep -v "var(" | wc -l  # 目標: 0件
grep "background:.*#[0-9a-fA-F]" frontend/style.css | grep -v "var(" | wc -l  # 目標: 0件
```

## デプロイ

```bash
npx wrangler pages deploy frontend --project-name goal-ai-frontend
```

## デプロイ後の必須確認

```
=== ★ 緊急バグ ===
1. 「今日の天気は？」送信 → AIバブルが**1つだけ**表示されるか（2つ出ていたらNG）
2. 「こんにちは」送信 → Claudeバブル1つだけか
3. 「英語に翻訳して: おはよう」→ GPTバブル1つだけか

=== H. AIシステムプロンプト ===
4. 「近くのおすすめレストランを5つ教えて」→ AIがレストランを教えてくれるか（ゴール誘導しないか）
5. 「お腹すいた」→ 食べ物の提案が返るか（「大切にしたいこと」と聞き返さないか）
6. 「TOEICで800点取りたい」→ 掘り下げ後にゴール提案カードが出るか（質問にはまず答えた上で）

=== A. チャット ===
1. Command + Shift + R（強制リロード）
2. DevTools Console → Uncaughtエラーが0件
3. チャット送信 → バブルなしで背景に直接テキスト表示されるか
4. AI応答とユーザーメッセージの文字色が異なるか
5. アイコンと1行目テキストが下揃え（ベースライン揃い）になっているか
6. メッセージ末尾に「11:14 · Claude Sonnet」が小さく表示されるか
7. メッセージ間に区切り線がなく、余白のみで区切られているか
8. 段落間の余白が詰まっているか（旧の半分程度）
9. 設定 → フォントサイズ → 4択を切り替えてアプリ全体の文字サイズが変わるか
10. ストリーミング中にテキスト末尾にカーソル▊が点滅するか
11. メッセージにホバー/長押し → コピー・引用ボタンが出るか
12. 自分のメッセージタップ → 編集・再送信ができるか
13. サイドバー最下部に「利用規約 | プライバシー v3.x.x」が中央揃えで表示されるか
14. バージョン表示タップ → 更新チェックが動くか

=== B. カレンダー ===
5. カレンダータブ → 月グリッドが表示されるか
6. カレンダー → 日付タップ → タスク一覧がスライドアップするか
7. カレンダー → 左右スワイプ → 月移動するか
8. カレンダー → 「今日」ボタン → 今日に戻るか
9. カレンダー → 月/週/日タブ切替が動くか
10. カレンダー → タスクにゴール色のピルが表示されるか

=== C. テーマ ===
11. 設定 → テーマ → 「ダーク」「ライト」「ハラジュク」の3択が表示されるか
12. ライトグラス → 全テキスト・トースト・入力欄・モードカードが確実に読めるか
13. ハラジュクグラス → 全テキスト・トースト・入力欄・モードカードが確実に読めるか
14. ハラジュク → 背景が黄色→ピンクのグラデーションか
15. ハラジュク → カードにレインボーボーダーが表示されるか
16. テーマ切替時にフェードトランジションが動くか
17. 各テーマでトースト通知の色がテーマに合っているか（ダークテーマで白トースト等になっていないか）
18. 各テーマで入力欄の背景・テキスト色がテーマに合っているか

=== D. ナビゲーション ===
19. GOAL AIロゴタップ → ホームに移動するか
20. サイドバーの空白エリアタップ → ホームに移動するか
21. ゴール設定画面に☰があり、サイドバーが開くか
22. ゴール設定画面にパンくずリストが表示されるか
23. ゴール保存後 → タスク設定フェーズに自動遷移するか
24. AIがタスクを提案し、選択して追加できるか
25. ヘッダーの「G」アイコンタップ → フルスクリーンモーダルが開くか
26. モーダル内のタスク「→」タップ → タスク専用チャットに遷移するか
27. 「＋新しいゴール」の文言になっているか（「追加」が消えているか）
28. 左端スワイプ → サイドバーが開くか（全画面で確認）

=== E. ゴールアシスト ===
29. ホームチャットで「〇〇したい」→ AIが掘り下げ→ゴール提案カードが表示されるか
30. 「ゴールアシストを始める」タップ → ゴール設定フェーズに遷移し、フォームにプリフィルされるか
31. 「今はいい」タップ → 通常チャット継続、同じ話題で再提案されないか
32. 入力欄の上に「最近の話題」タグが表示されるか
33. ゴールアシスト中 → 画面上部にゴールドバナーが表示されるか

=== F. 音声入力 ===
34. 🎤タップ → 録音開始。もう1回タップ → 停止→テキスト変換→入力欄に表示されるか
35. 🎤長押し → 押している間録音。離す → テキスト変換→入力欄に表示されるか
36. 録音中にリアルタイムで仮テキストが入力欄に表示されるか
37. 録音中に音量連動の波形アニメーションが🎤周りに表示されるか
38. 3秒無音で自動停止するか
39. 録音中に左スワイプ → キャンセルされるか
40. 録音完了後にテキストが入力欄に入り、編集してから送信できるか（即送信しない）
41. 60秒でソフトストップするか。残り10秒で色が変わるか
42. 15文字以上の音声入力が正常に変換されるか（15文字切れバグが修正されているか）
43. 「ご視聴ありがとうございました」等のデモテキストが表示されないか

=== G. タスク ===
44. タスク画面に「＋新しいタスク」ボタンがあるか
45. タスク追加モーダルでゴール紐付き（ドロップダウン）が選択できるか
46. 「なし（独立タスク）」を選んだ場合、グレードットで表示されるか
47. ゴール紐付きタスクがゴール色で表示されるか

48. スマホ・PCで全セクション同じ動作を確認
```
