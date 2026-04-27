# GOAL AI — デザイン実装統合指示書
> Claude Code用 / 作成：2026-03-21（過去チャットのレビュー結果から復元）
> INSTRUCTION_ID: DESIGN-IMPL-001
> REQUIRES_VERSION: v3.9.3（Step 7 完了後）
> リスクレベル: 🟡中（UI変更のみ。Worker側ロジック変更なし）
> 依存: STRIPE-005-FRONTEND（Step 7 完了必須）

---

## ⚠ 重要ルール

1. **モックアップのサンプルデータをハードコードしない** — 全てDB/state参照
2. **CSS変数のみ使用** — ハードコード色禁止
3. **既存機能を壊さない** — 追加・変更のみ。削除は明記されたものだけ
4. **1パート1デプロイ** — 8a → デプロイ+テスト → 8b → デプロイ+テスト → 8c

---

## 3パート構成

| パート | 内容 | スコープ |
|--------|------|---------|
| **8a** | 共通コンポーネント | 全画面に影響する基盤変更 |
| **8b** | 各画面UI変更 | ゴールハブ・デザインセッション・オンボーディング・分析・FB・設定 |
| **8c** | プラン演出+トースト | プラン選択カルーセル・Ultra演出・ゴール検出 |

---

## Part 8a: 共通コンポーネント

### CRN-01: 王冠アイコン統一SVG

全画面のAIアバターを統一王冠SVGに置換:

```svg
<svg viewBox="0 0 32 32"><defs>
  <linearGradient id="crown" x1="6" y1="6" x2="26" y2="24">
    <stop offset="0%" stop-color="#c8920a"/>
    <stop offset="100%" stop-color="#f5d380"/>
  </linearGradient>
</defs>
<path d="M5 24l4-11 3 5L16 6l4 12 3-5 4 11H5z" fill="url(#crown)"/></svg>
```

- **丸背景なし** — 王冠単体表示。ベタ塗り円で囲まない
- 適用箇所: サイドバーロゴ(24px)、ホームヒーロー(48px)、チャットAIアバター(18px)、オンボーディング
- grepで既存の王冠アイコンを全て検索して統一

### CRN-02: フッターモデル名グレー統一

- モデル名の色 → `var(--text-tertiary)` グレーに統一
- AI「名前」ヘッダー部分のみカラー維持（Claude=#e8913a, GPT=#5b8def, Gemini=#e07070）
- セパレータ: 「·」ではなくスペース。例: `11:14  Claude Sonnet`

### CRN-03: チャット入力ボックス共通化

全画面で同一コンポーネントを使用（ホーム・ゴールハブ・デザインセッション・フィードバック）:
- border-radius: 14px（スマホ）/ 12px（PC埋込）
- border: 0.5px solid rgba(200,146,10,0.3)
- 内部配置: `[プレースホルダー] [画像ボタン] [音声ボタン] [送信ボタン]`
- 画像・音声ボタン: 丸枠+SVGアイコン、border-tertiaryスタイル
- 送信ボタン: 28px円（スマホ）/ 22px円（PC）、ゴールドグラデーション
- プレースホルダー: 会話前「質問、相談、なんでも...」/ 会話中「返信する」/ タスク「このタスクについて質問...」
- 例外なし — デザインセッション含む全画面統一

### CRN-04: スクロール位置の即時復元

- 画面遷移（タブ切替、戻る操作）時にチャットスクロール位置を保持・復元
- 実装: sessionStorageにscrollTopを保存

### GPT電球アイコン

GPTルーティング時のAIアバターに電球SVGを使用:
```svg
<svg viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="1.5">
  <path d="M9 21h6M12 3a6 6 0 00-4 10.5V17h8v-3.5A6 6 0 0012 3z"/>
</svg>
```

### ストリーミング中: 送信→停止ボタン切替

- ストリーミング開始時: 送信ボタン → 停止ボタン（■アイコン）に切替
- ストリーミング完了/停止時: 停止ボタン → 送信ボタンに復帰
- 停止ボタン押下: AbortControllerでストリーミングを中断

### 8a 事前grep確認

```bash
grep -rn "crown\|王冠\|ai-avatar\|mav-ai" frontend/
grep -rn "formatModelName\|model-name\|X-Model-Used" frontend/
grep -rn "chat-in\|ci-box\|ci-send\|入力" frontend/
grep -rn "sendMessage\|handleSend\|AbortController" frontend/
```

### 8a デプロイ + テスト

```bash
wrangler deploy
bash tests/smoke/test_005_grep.sh
```

### 8a 承認チェックポイント

```
□ 全画面で王冠アイコンが統一されている（grep: crown SVG path）
□ フッターモデル名がグレー統一、セパレータがスペース
□ チャット入力ボックスが全4画面で同一コンポーネント
□ 送信→停止ボタン切替が動作する
□ GPT電球アイコンが表示される
□ grep保全PASS
→ ふとしに報告して承認を得る
```

---

## Part 8b: 各画面UI変更

### ゴールハブ（#05a〜#05e）

**5タブ構成:** チャット / タスク / 分析 / メモ / 設定

**#05a チャット:**
- 「過去のチャット履歴→」リンク削除（ヘッダーに履歴リンクあり）
- 共有ボタン → SVGアイコン化
- ステータス表示を右寄せ配置
- 「目安」→「予定」に文言変更

**#05b タスク:**
- 期日なしタスクは右端に「—」表示
- AI提案アイコン → 王冠（CRN-01適用）
- 完了タスクは各Phase/カテゴリ内の下部に自動移動（別セクションではない）
- 「完了を表示」トグル廃止 → フィルターチップ（すべて/進行中/完了）で代替

**#05c 分析:**
- 「週平均作業」→「会話件数」に文言変更
- 「できなかった理由」→「停滞ポイント」に変更
- 「3AI ディープ分析」→「3人寄れば文殊の知恵」+説明文+「ヒアリング開始」ボタン
- 2パス選択カード+サブオプション完全削除
- 停滞ポイントのタグ色分け: 外部依存=赤, 体調=オレンジ, 時間不足=グレー

**#05d メモ:**
- AI理解メモ閲覧専用表示（読み取りのみ、編集不可）
- FAB重なり防止: padding-bottom:52px

**#05e 設定:**
- 「達成済み」→ ゴールド色表示
- 「削除」→ 赤色表示
- AIロール「変更する」→ テキスト入力フィールド展開（任意入力）

### デザインセッション「私をデザイン」（#06a〜#06d）

**4タブ構成:** 自分を知る / ビジョン / ゴール連携 / プロフィール
**ヘッダー:** 背景 #c8920a、テキスト白、ハンバーガー白

**#06a 自分を知る:**
- セッション進捗バー（n/5テーマ）
- テーマチップ: 完了済み=タップ可能、現在=アクティブ、未完了=ロック表示
- 対話形式（ライフデザイナー固定、Claude Sonnet）
- 入力欄: CRN-03統一（例外なし）
- セッション完了時 → ビジョンタブに自動遷移

**#06b ビジョン:**
- セッション未完了時: 空表示 +「セッションを続ける（残りNテーマ）」CTA
- セッション完了後:
  - MY CHARACTER（ゴールド枠1.5px、中央配置、背景rgba(200,146,10,0.06)）
  - ビジョンステートメント（イタリック、60文字以内・小学生でもわかる表現）
  - 見られたい姿 / 強みの言語化（2カラム）
  - 5年後の理想の平日 / やりたくない生活
  - 各セクション: ペンアイコン(SVG)のみ、ボックス内右下に配置
  - 再分析セクション: 6チップ選択式 → 「選択した項目を再分析」ボタン
  - SNS共有:「キャラクターをシェア」最下部

**#06c ゴール連携:**
- 各ゴール: アイコン+名前+AIマッチ説明+相性%バー+AIアドバイス
- 60%以下: バー色オレンジ(`#ef9f27`)、数値もオレンジ
- 「改善方法をAIに相談する」→ ゴールハブチャット遷移

**#06d プロフィール:**
- 配置順: アバター → AI理解度 → 内訳 → 基本情報
- AI理解度: タップで内訳展開（プロフィール回答率で算出）
- 年齢を別行追加、生年月日から年齢除外
- @ニックネーム表示削除（名前のみ）
- 強み・弱み: AI自動提案チップ（✨NEW破線枠）

### オンボーディング（#07 — 3ステップ）

**全体仕様:**
- 3ステップ構成、ウェルカム画面廃止
- 左右スワイプでもページ遷移可能
- 初回ユーザー → オンボーディング → ホーム、2回目以降スキップ
- スキップ押下時も完了フラグを立てる（再表示防止）
- ゴールドCTA: position absolute, bottom: 44px
- 「スキップして始める」: bottom: 16px
- アイコン: SVGストロークアニメーション（描画2.1s、間隔0.4s、テキストは即表示）

**Step 1「AIに何でも聞ける」:**
- アイコン: 3人の賢人（横一列+弧）
- Gemini · ChatGPT · Claude バッジ（3色）
- 「3つのAIがチームであなたを支えます」

**Step 2「一緒にゴールまで並走」:**
- アイコン: 2人で並走（ロードマップ道）
- 会話からタスクを自動作成 / ゴールまでナビゲート / AIが活動を分析

**Step 3「あなたを理解して進化」:**
- アイコン: 2人が手を伸ばす（寄り添い）
- 会話を重ねて学ぶ / 人生を分析＆デザイン
- CTA:「今すぐ分析＆デザイン」→ 私をデザインへ遷移
- 「GOAL AIを始める」は削除（スキップと重複）

### 解析ダッシュボード（#08a）

- ストリーク: 🔥n日連続 + 最高記録n日
- 統計3カード: タスク完了率 / 完了タスクn/m / 会話件数
- 月別進捗チャート: 2色ペアバー（左=全体グレー、右=達成ゴールド）
  - 期間切替チップ: 3ヶ月 / 6ヶ月 / 12ヶ月
  - 凡例: 全体(グレー) + 達成(ゴールド)
- タスク溜まり警告: 未完了タスクが多い月にオレンジ警告バー+「整理する →」
- 停滞ポイント: 日付+内容+タグ（同一行）、タグ色分け
- 「3人寄れば文殊の知恵」: 説明文+モデルバッジ3色+「ヒアリング開始」+残り回数

### フィードバック（#08b）

- 対話形式（王冠アバター + GOAL AI名前 + Claude Sonnet固定）
- クイック返信ピル: 使いやすかった / 改善してほしい / 新機能リクエスト / バグ
- NPS: 2-3往復後にAI判断で自然挿入（チャット冒頭ではない）
  - 0-10スコア選択 → フォローアップ質問
- 王冠アイコン: viewBoxトリミング済み、コンテナなし直接配置
- 入力欄: CRN-03統一

### 設定パネル（#08c）

- プランBox: プラン名32px、アップグレードメリット説明（グレー文字）
- テーマ: ダーク/ライト/ハラジュク + システム追従トグル + グラスモード on/off
  - グラスモード説明:「背景を半透明ガラス風に」、デフォルトoff
- 文字サイズスライダー / 位置情報トグル / 通知トグル / 言語ドロップダウン
- データ管理:「会話履歴を削除」+「アカウント削除」（赤）
  - アカウント削除: 確認ダイアログ2段階（「本当に削除しますか？」→「全データが完全に消去されます」）
- 友達紹介（コードコピー）/ プロモコード / バージョン表示

### 8b 事前grep確認

```bash
# ゴールハブタブ構造
grep -rn "hub-tabs\|ht on\|goal-tab" frontend/
# デザインセッション
grep -rn "design.*session\|自分を知る\|ビジョン\|MY CHARACTER" frontend/
# オンボーディング
grep -rn "onboarding\|welcome\|skipOnboarding" frontend/
# 分析・FB・設定
grep -rn "analytics\|dashboard\|feedback\|settings\|NPS" frontend/
# 既存保全
grep -rn "renderChatUI\|sendMessage\|showToast" frontend/
```

### 8b デプロイ + テスト

```bash
wrangler deploy
bash tests/smoke/test_005_grep.sh
```

### 8b 承認チェックポイント

```
□ ゴールハブの5タブが正常に切替わる
□ タスク一覧でフィルターチップ（すべて/進行中/完了）が動作
□ デザインセッション4タブが動作する
□ オンボーディング3ステップが完了できる（スキップも動作）
□ 分析画面: 月別チャート+期間切替+停滞ポイントが表示される
□ フィードバック: NPS挿入が動作する
□ 設定: グラスモードトグル+アカウント削除2段階が動作
□ grep保全PASS
→ ふとしに報告して承認を得る
```

---

## Part 8c: プラン選択演出 + ゴール検出トースト

### プラン選択画面（#08d — 5プラン v6.3）

**レイアウト:**
- スマホ: カルーセル + ドットインジケーター（scroll-snap-type、Pro初期表示）
- PC: 縦並びリスト

**ヘッダー:**
- 淡色背景 + 金文字「プランを選ぶ」
- サブコピー:「使った分だけ。上限があるから安心。」

**各プランカード — 統一4項目フォーマット:**
- チャット上限 / AIモデル / ディープ分析 / AI理解メモ
- アイコン+値+ラベルの統一レイアウト
- Pro: アイコン背景ゴールド、SVGストロークゴールド、人気No.1バッジ（2px gold border）
- Free/Light/Max: アイコン背景グレー、SVGストロークグレー
- 現在のプラン:「現在のプラン」バッジ表示、CTAなし

**一言キャッチ:**
- Free「まずは試してみる」
- Light「広告なしで3AI」
- Pro「ChatGPTと同じGPT-5が使える」
- Max「上位モデル+1ターン半額」
- Ultra「全モデル使い放題+Extended Thinking」

**Pro料金イメージバー:**
- ¥1,500〜¥2,980 のプログレスバー
- 「使わない月は¥1,500。74ターンで上限。」

**ChatGPT比較ボックス:**
- カルーセル下に配置
- Plus ¥3,000 vs Pro ¥1,500〜2,980
- 3サービス別々¥9,000 → 取り消し線

### Ultra カード演出

- グラデーションボーダー（ゴールド→パープル→ゴールド）
- パーティクルエフェクト（CSS animation、微細な光粒子）
- Extended Thinking 140回/週 を目立つバッジで表示
- コンテキスト2倍を強調

### 機能比較テーブル（折りたたみ）

- 料金/チャット/GPT/Claude/Gemini/分析/理解メモの7行×5プラン
- デフォルト折りたたみ、タップで展開

### 年額トグル

- 月額/年額切替トグル
- 年額選択時: 具体的割引額表示（「年間¥5,960お得」等）
- 通常価格は右寄せ配置
- Checkout時にintervalパラメータ（month/year）を送信

### フェアユース表示

- 5h窓+週間窓の説明テキスト（プランカード下部に小さく表示）
- Free 10/5h+140/週, Light 50/5h+200/週, Pro 80/5h+500/週, Max 200/5h+1500/週, Ultra 200/5h+1500/週

### ゴール検出トーストアニメーション

- ホームチャットでAIがゴール候補を検出した時に表示
- スライドインアニメーション → タップでゴール作成フローへ
- 無視した場合は自動消滅（5秒）

### 8c 事前grep確認

```bash
# プラン選択
grep -rn "plan-select\|plan-card\|carousel\|カルーセル" frontend/
# Ultra演出
grep -rn "ultra\|Ultra\|particle\|gradient.*border" frontend/
# 比較テーブル
grep -rn "compare\|比較\|feature-table" frontend/
# 年額トグル
grep -rn "annual\|yearly\|年額\|interval" frontend/
# ゴール検出
grep -rn "goal.*detect\|goal.*toast\|ゴール検出" frontend/
# 既存保全
grep -rn "showPlanModal\|handleCheckout\|plan-modal" frontend/
```

### 8c デプロイ + テスト

```bash
wrangler deploy
bash tests/smoke/test_005_grep.sh
# Playwright E2E全実行
npx playwright test
```

### 8c 承認チェックポイント

```
□ プラン選択カルーセルが動作する（スマホ: スワイプ、PC: 縦並び）
□ 5プランカードが正しく表示される（統一4項目フォーマット）
□ Ultra演出（グラデーション+パーティクル）が適用されている
□ 比較テーブルの折りたたみが動作する
□ 年額トグルが動作し、割引額が表示される
□ ChatGPT比較ボックスが表示される
□ ゴール検出トーストが表示される
□ grep保全PASS
□ Playwright E2E が全テストPASS
→ ふとしに報告して承認を得る
```

---

## ロールバック

```bash
# Cloudflare Pagesのロールバック
# Dashboard > Pages > goal-ai-frontend > Deployments > 前回デプロイをロールバック
# Worker側には影響なし
```

---

## タスク一覧の追加デザイン変更（#04a〜#04c、8bで一緒に実装）

- 完了タスクを各カテゴリ内下部に自動移動（別セクションではない）
- 「完了を表示」トグル廃止 → フィルターチップ（すべて/進行中/完了）
- フィルター切替時のアニメーション（フェードイン/アウト）
- ソート「重み順」にアクティブ色（ゴールド）
- FAB重なり防止: padding-bottom:52px
- PC版: FAB削除 → ヘッダーに「＋ タスク追加」テキストボタン
- タスク詳細: クイックアクションをチャットと入力ボックスの間に配置（タイトル削除）

---

## セルフチェックリスト（grep検証用）

デプロイ前に以下を全て実行し、FAILがないことを確認する。
canopy.sh #14 にも組み込み済み。

### CRN-01: 王冠アイコン統一SVG
```bash
# 王冠SVGパスが2箇所以上（サイドバー+ウェルカム+チャット）
grep -rc "M5 24l4-11 3 5L16 6" frontend/ | awk -F: '{s+=$2}END{print s}'  # ≥2
```

### CRN-02: フッターモデル名グレー統一
```bash
# .msg-model が --muted または --text-tertiary を使用
grep "msg-model" frontend/style.css | grep -c "muted\|tertiary"  # ≥1
```

### CRN-03: チャット入力ボックス統一
```bash
# --input-radius または border-radius:14px がCSS内に存在
grep -c "input-radius\|border-radius:14px" frontend/style.css  # ≥2
# 送信ボタンが丸型 (border-radius:50%)
grep -c "border-radius:50%" frontend/style.css  # ≥3 (send-btn, hub-send, task-send, htp-send)
# 送信ボタンがグラデーション (--send-btn-grad)
grep -c "send-btn-grad" frontend/style.css  # ≥3
# 送信ボタンサイズ (--send-btn-size: 28px)
grep -c "send-btn-size" frontend/style.css  # ≥3
```

### 8a: 共通コンポーネント
```bash
grep -rc "getGptSVG" frontend/  # ≥2 (GPT電球アイコン)
grep -rc "_saveScroll\|_restoreScroll" frontend/  # ≥2 (スクロール復元)
grep -rc "stopHomeStream\|_setHomeSendIcon" frontend/  # ≥2 (送信→停止切替)
```

### 8b: 各画面UI
```bash
# ゴールハブ5タブ
grep -c "hub-tab" frontend/index.html  # ≥5
# オンボーディング3ステップ
grep -c "ob-slides\|ob-dot" frontend/index.html  # ≥2
# 分析画面文言
grep -c "停滞ポイント" frontend/index.html  # ≥1
grep -c "3人寄れば" frontend/  -r  # ≥1
# 設定: アカウント削除2段階
grep -c "confirmDeleteAccount" frontend/  -r  # ≥2
```

### 8c: プラン演出+ゴール検出
```bash
# プランカード (5プラン)
grep -c "pc-free\|pc-light\|pc-pro\|pc-max\|pc-ultra" frontend/ -r  # ≥5
# Ultra演出
grep -c "ultraFloat\|ultra-particles" frontend/ -r  # ≥2
# 比較テーブル
grep -c "plan-compare-table" frontend/ -r  # ≥1
# ゴール検出トースト
grep -c "showGoalDetectToast\|goal-detect-toast" frontend/ -r  # ≥2
```

### CSS変数一元定義
```bash
# モデル色が3テーマ全てに定義
for v in "model-claude" "model-gpt" "model-gemini"; do
  grep -c "$v" frontend/style.css  # ≥3 (dark+light+harajuku)
done
# コンポーネントトークンが定義
for v in "input-radius" "send-btn-size" "send-btn-grad" "card-radius" "popup-radius" "pill-radius"; do
  grep -c "$v" frontend/style.css  # ≥3
done
```

---

*次の指示書: UX-001〜003（UX改善3件）*
