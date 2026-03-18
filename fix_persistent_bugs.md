# 根本原因究明＋確実修正指示書
> 2026-03-17（v3.1.5以降）
> **この指示書は「診断→報告→承認→修正」の順で進めること。勝手に修正に着手しない。**

---

## 【ルール】
1. **診断フェーズ（STEP 1〜3）を全て完了してから修正に入ること**
2. 各STEPの結果を「そのまま」報告すること（要約しない、省略しない）
3. 修正は診断結果を全て報告した後に行う
4. 修正後は必ず実機確認用のテスト手順を実行して結果を報告

---

# STEP 1: 空バブル（王冠アイコンだけ表示される問題）

## 1-A: DOM生成フローの全箇所を洗い出す

```bash
echo "=== チャットメッセージをDOMに追加する全箇所 ==="
grep -n "innerHTML\|appendChild\|insertBefore\|append(" frontend/js/chat.js | grep -i "msg\|chat\|bubble\|home" | head -40

echo "=== mkHomeMsg / createMessage等のメッセージ生成関数 ==="
grep -n "function.*[Mm]sg\|function.*[Mm]essage\|function.*bubble\|function.*chat.*add" frontend/js/chat.js | head -20

echo "=== DOMに追加される直前のテキスト変数名 ==="
grep -n "\.textContent\|\.innerText\|\.innerHTML" frontend/js/chat.js | grep -i "msg\|body\|content" | head -20
```

**上記grepの結果を全て貼って。**

## 1-B: 空バブルを生むルーティング処理を確認

```bash
echo "=== ルーティング判定→バブル生成の流れ ==="
grep -n "route\|gemini\|gpt-simple\|claude" frontend/js/chat.js | grep -i "msg\|bubble\|append\|render\|create" | head -20

echo "=== ルーティング判定の応答処理 ==="
grep -n "routeResult\|routeAI\|currentRouteAI\|routeResponse" frontend/js/chat.js | head -20

echo "=== ストリーミング開始前のバブル事前作成 ==="
grep -n "placeholder\|pending\|loading\|skeleton\|beforeStream\|preStream" frontend/js/chat.js | head -15
```

**上記grepの結果を全て貼って。**

## 1-C: 仮説検証

以下の仮説のうちどれが正しいか、コードを読んで判定して報告：

```
仮説A: ストリーミング開始前に空のバブルをDOMに追加し、
       ストリーミング完了後にテキストを流し込む設計。
       ストリーミングが失敗orルーティング処理の場合にテキストが入らず空のまま残る。

仮説B: ルーティング判定のAPIレスポンス（{"route":"claude"}等）が
       一度バブルに表示され、その後消されるが、
       バブルのDOM要素自体は残ってしまう。

仮説C: mkHomeMsgが「AIの応答を表示するための空のコンテナ」を先に作り、
       その後streamで文字を流し込むが、routingの場合はstream不要なのに
       空コンテナだけが残る。

仮説D: その他（具体的に説明）
```

**どの仮説が正しいか、コードの該当行番号を示して報告して。**

---

# STEP 2: 段落間の余白が広すぎる問題

## 2-A: AI応答のHTMLレンダリング構造を確認

```bash
echo "=== AI応答をHTML化する処理 ==="
grep -n "renderMsgContent\|formatMessage\|parseMarkdown\|marked\|<p>\|<br>" frontend/js/chat.js | head -20

echo "=== msg-body内の余白に関するCSS ==="
grep -n "msg-body" frontend/style.css

echo "=== pタグのmargin/padding ==="
grep -n "^p \|^p{\| p \| p{" frontend/style.css | head -10
grep -n "msg.*p \|msg.*p{" frontend/style.css | head -10
```

**上記grepの結果を全て貼って。**

## 2-B: 実際の出力HTMLを確認

以下のJSをchat.jsの応答完了処理に一時的に追加して、
実際に出力されるHTMLを確認：

```javascript
// 一時デバッグ用（後で削除）
console.log('AI HTML output:', document.querySelector('.msg-body:last-of-type')?.innerHTML);
```

**または**、renderMsgContent関数の入力と出力をそれぞれ報告：
- 入力：AIから受け取った生テキスト（改行コードは\nか\n\nか）
- 出力：HTMLに変換した結果（<p>タグか<br>か<div>か）

## 2-C: 余白が効かない原因の特定

以下のどれが原因か特定して報告：

```
原因A: CSSの .msg-body p { margin: 0 0 12px 0; } が存在しない
原因B: CSSは存在するが、より詳細度の高い別ルールで上書きされている
原因C: AI応答が<p>タグではなく<br><br>で改行されている（CSSが効かない）
原因D: renderMsgContentがマージンを持つ<div>でラップしている
原因E: その他（具体的に説明）
```

**どの原因が正しいか、CSSの該当行番号を示して報告して。**

---

# STEP 3: アイコンと1行目テキストの高さずれ

**この問題は3回以上修正依頼しているが毎回直っていない。今回で確実に直すため、徹底調査する。**

## 3-A: 現在のCSS状態を全て確認

```bash
echo "=== msg-headerの全CSSプロパティ ==="
grep -A5 "msg-header" frontend/style.css | head -30

echo "=== msg-av（アバター）の全CSSプロパティ ==="
grep -A5 "msg-av\|\.avatar" frontend/style.css | head -20

echo "=== msg-headerに関するメディアクエリ ==="
grep -B2 -A5 "msg-header\|msg-av" frontend/style.css | grep -A5 "@media" | head -20

echo "=== msg-header内のテキスト要素（名前等）のCSS ==="
grep -A5 "msg-name\|msg-label\|msg-model" frontend/style.css | head -20
```

**上記grepの結果を全て貼って。**

## 3-B: JS側でinline styleが上書きしていないか

```bash
echo "=== JS側でmsg-header/msg-avにstyleを設定している箇所 ==="
grep -n "msg-header.*style\|msg-av.*style\|avatar.*style\|\.style\." frontend/js/chat.js | grep -i "align\|height\|margin\|padding\|top\|bottom" | head -15

echo "=== メッセージ生成時のHTML構造 ==="
grep -n "msg-header\|msg-av" frontend/js/chat.js | head -20
```

**上記grepの結果を全て貼って。**

## 3-C: 実際のDOM構造を確認

chat.jsのメッセージ生成関数で、msg-headerの中にどんな子要素があるか、
HTMLテンプレートの全構造を報告して。

例：
```html
<div class="msg-header">
  <div class="msg-av">...</div>      ← この要素のサイズ
  <span class="msg-name">...</span>  ← この要素のline-height
  ← 他に子要素はあるか？
</div>
```

## 3-D: なぜ3回修正しても直らなかったか分析

以下を全て調べて報告：

```
1. 過去に追加されたalign-items:flex-endは現在CSSに存在するか？
   → 存在する場合、なぜ効いていないか（詳細度負け？上書き？）
   → 存在しない場合、いつ消えたか（後の修正で上書きされた？）

2. msg-headerに適用されている全CSSルールを詳細度順にリスト
   （DevToolsのComputed相当の情報）

3. アバターとテキストの間に意図しない要素（空のspan/div等）が
   挟まっていないか

4. アバターのサイズ（width/height）とテキストのline-heightが
   一致しているか、数値を報告
```

---

# STEP 4: 診断結果の報告

上記 STEP 1〜3 の全ての結果を以下のフォーマットで報告して：

```
## 空バブル
- 原因: （仮説A/B/C/Dのどれか＋具体的な行番号）
- 再発理由: （なぜ過去の修正で直らなかったか）
- 正しい修正方法: （何をどう直せば確実に直るか）

## 段落余白
- 原因: （原因A/B/C/D/Eのどれか＋具体的な行番号）
- 再発理由: 
- 正しい修正方法: 

## アイコンずれ
- 原因: （具体的なCSSプロパティと行番号）
- 再発理由: （なぜ3回修正しても直らなかったか）
- 正しい修正方法: 
- 再発防止策: （今後同じ問題を1回で確実に直すためのルール）
```

**この報告を出してから修正に入ること。勝手に修正しない。**

---

# STEP 5: 修正（STEP 4の報告後に実行）

STEP 4の報告内容に基づいて3つ全てを修正する。

**修正後の確認：**
```bash
echo "=== 空バブル防止ガード ==="
grep -n "trim.*===.*''.*return\|!text.*return\|empty.*return" frontend/js/chat.js | head -10
# 期待: メッセージ生成の全経路にガード

echo "=== 段落余白 ==="
grep "msg-body.*p\|\.msg-body p" frontend/style.css
# 期待: margin: 0 0 12px 0 または同等

echo "=== アイコン位置 ==="
grep -A3 "msg-header" frontend/style.css | head -10
# 期待: 意図したalign-items値が設定されている
```

**デプロイ後の実機テスト（必ず実行して結果を報告）：**
```
1. 「こんにちは」送信 → 空バブルが出ないか目視確認
2. AI応答の段落間の余白が狭くなっているか目視確認
3. アイコンとテキスト1行目が揃っているか目視確認
4. DevTools Elementsで空の.msg-wrap要素が存在しないか確認
```

デプロイして「Deployed: vX.X.X」と修正内容を報告。
