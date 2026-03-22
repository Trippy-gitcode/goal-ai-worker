# fix_persistent_bugs_v2.md — 3バグ修正指示書
> 対象バージョン: v3.1.5 → v3.2.0
> 診断完了済み。全修正箇所が特定済み。grep→修正→検証の順で進める。

---

## 【前提】修正前に必ずやること

```bash
# 1. CLAUDE.md更新（未実行なら）
cp ~/Downloads/CLAUDE_updated.md ~/Desktop/goal-ai-worker/CLAUDE.md

# 2. 現状確認（修正前のベースライン）
cd ~/Desktop/goal-ai-worker
grep -n "parentElement.*remove" frontend/js/chat.js
grep -n "line-height" frontend/style.css | grep bubble
grep -n "align-items" frontend/style.css | grep "\.msg"
```

---

## BUG-1: 空バブル（王冠アイコンだけ表示される）

### 原因
Gemini/GPTルートでAPIレスポンスが空の場合、バブルDOMが残る。
さらにhomeMsgs配列に空contentが保存され、画面再描画で空バブルが復活する。

### 修正箇所（3箇所 — 全てにガード必須）

#### 1-A: onDoneコールバック（chat.js内のstreamAI/fetchAI完了時）
```bash
grep -n "onDone\|function.*Done\|\.then.*content" frontend/js/chat.js
```

**修正内容**: onDoneコールバックの冒頭に空ガードを追加
```javascript
// onDone(text) の冒頭に追加
if (!text || !text.trim()) {
  // 空レスポンス: DOMのバブルを削除
  const lastMsg = document.querySelector('#home-chat .msg:last-child');
  if (lastMsg) lastMsg.remove();
  return;
}
```

#### 1-B: Gemini/GPTルートのレスポンス処理（chat.js）
```bash
grep -n "gemini\|gpt.*result\|apiCall.*chat" frontend/js/chat.js
```

**修正内容**: API応答のresultが空の場合、バブル追加をスキップ
```javascript
// Gemini/GPTルートのレスポンス受信後に追加
const result = data.result || data.choices?.[0]?.message?.content || '';
if (!result.trim()) {
  // 空レスポンス: タイピングインジケーター除去のみ
  hideChatTyping();
  return;
}
```

#### 1-C: homeMsgs.push前のガード（chat.js）
```bash
grep -n "homeMsgs.*push\|Msgs.*push" frontend/js/chat.js
```

**修正内容**: 配列pushの直前に空チェック
```javascript
// push前にガード追加
if (content && content.trim()) {
  homeMsgs.push({ role: 'assistant', content: content });
}
```

#### 1-D: renderHomeMsgs内のガード
```bash
grep -n "renderHomeMsgs\|mkHomeMsg" frontend/js/chat.js
```

**修正内容**: mkHomeMsgがnullを返したらスキップ（既存実装を確認して補強）
```javascript
// renderHomeMsgs内のループで
const el = mkHomeMsg(msg);
if (!el) continue;  // null/空ならスキップ
```

#### 1-E: 既存の保存済みデータのクリーンアップ
```bash
grep -n "homeMsgs\|loadHistory\|renderHome" frontend/js/chat.js
```

**修正内容**: 履歴ロード時に空contentをフィルタリング
```javascript
// 履歴読み込み後（loadHistoryまたはAPI GET /api/history後）
homeMsgs = homeMsgs.filter(m => m.content && m.content.trim());
```

### ⚠️ 全5画面に適用
上記のガードは**ホームチャットだけでなく全5画面**に存在するか確認すること。
各画面の変数名を確認:
```bash
grep -n "Msgs.*push\|msgs.*push" frontend/js/chat.js frontend/js/goals.js frontend/js/profile.js
```

---

## BUG-2: 段落間余白が広すぎる

### 原因
- `.bubble`のline-height:1.78が大きすぎる
- AIが`\n`1つで改行した場合、`<p>`ではなく`<br>`になりCSS余白制御が効かない

### 修正箇所

#### 2-A: line-height修正（style.css）
```bash
grep -n "line-height.*1\.78\|\.bubble.*line-height" frontend/style.css
```

**修正内容**:
```css
/* 変更前 */
.bubble { line-height: 1.78; }

/* 変更後 */
.bubble { line-height: 1.5; }
```

#### 2-B: `<br>`の余白追加（style.css）
```bash
grep -n "\.bubble.*br\|bubble br" frontend/style.css
```

**修正内容**: `.bubble br`ルールが無ければ追加
```css
.bubble br {
  display: block;
  content: "";
  margin-bottom: 4px;
}
```

#### 2-C: `<p>`タグの余白確認
```bash
grep -n "\.bubble p\|\.bubble.*p {" frontend/style.css
```

**修正内容**: 既存の.bubble pルールを確認し、margin-bottom: 12pxに統一
```css
.bubble p {
  margin: 0 0 12px 0;
}
.bubble p:last-child {
  margin-bottom: 0;
}
```

### ⚠️ メディアクエリ確認
```bash
grep -n "line-height" frontend/style.css | grep -i "media\|768\|480"
```
モバイル用に別のline-heightが定義されている場合はそちらも修正。

---

## BUG-3: アイコンと1行目テキストのずれ

### 原因
- `.msg`にalign-itemsが未指定（デフォルトstretch）
- 過去の修正は存在しないセレクタ`.msg-header`に書いていたため効かなかった

### 修正箇所

#### 3-A: .msgのflex配置（style.css）
```bash
grep -n "\.msg {" frontend/style.css
grep -n "\.msg[^-]" frontend/style.css | head -20
```

**修正内容**:
```css
.msg {
  /* 既存のdisplay:flexは維持 */
  align-items: flex-start;  /* ← 追加 */
}
```

#### 3-B: .msg-avのmargin（style.css）
```bash
grep -n "\.msg-av" frontend/style.css
```

**修正内容**:
```css
.msg-av {
  margin-top: 2px;  /* テキストの1行目とアイコン上端を揃える微調整 */
  flex-shrink: 0;
}
```

#### 3-C: 存在しないセレクタの削除
```bash
grep -n "\.msg-header\|\.chat-message" frontend/style.css
```

**修正内容**: `.msg-header`や`.chat-message`へのCSS定義が残っていたら削除。
（DOMに存在しないセレクタ = デッドCSS）

---

## 修正後の検証

### 自動検証
```bash
# BUG-1検証: 空ガードの存在確認
echo "=== BUG-1: 空バブル防止 ==="
grep -c "!text.*trim\|!result.*trim\|!content.*trim" frontend/js/chat.js
# 期待: 3以上

echo "=== BUG-1: 空contentフィルタ ==="
grep -c "filter.*content.*trim" frontend/js/chat.js
# 期待: 1以上

# BUG-2検証: line-height修正
echo "=== BUG-2: line-height ==="
grep "line-height" frontend/style.css | grep bubble
# 期待: 1.5（1.78がないこと）

echo "=== BUG-2: br余白 ==="
grep -A2 "\.bubble br" frontend/style.css
# 期待: margin-bottom: 4px

# BUG-3検証: align-items
echo "=== BUG-3: align-items ==="
grep -A5 "\.msg {" frontend/style.css | grep "align-items"
# 期待: flex-start

echo "=== BUG-3: デッドCSS ==="
grep -c "\.msg-header\|\.chat-message" frontend/style.css
# 期待: 0
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

### バージョン更新（4箇所同期）
```bash
# v3.1.5 → v3.2.0
grep -rn "3\.1\.5\|APP_VERSION" frontend/js/globals.js frontend/sw.js frontend/index.html src/worker.js
# 全箇所を 3.2.0 に更新
# sw.jsのCACHE_NAMEも 'goal-ai-v3.2.0' に更新
```

### デプロイ
```bash
npx wrangler deploy src/worker.js
npx wrangler pages deploy frontend --project-name goal-ai-frontend
```

### 報告フォーマット
```
Deployed: v3.2.0
- BUG-1: 空バブル防止ガード5箇所 + 既存データクリーンアップ
- BUG-2: line-height 1.78→1.5 + br余白4px + p余白統一
- BUG-3: .msg align-items:flex-start + デッドCSS削除
```
