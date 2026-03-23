# GOAL AI — プロジェクトダッシュボード
> このファイルが Code のセッション引き継ぎの唯一の情報源
> セッション開始時に必ず読む。セッション終了時に必ず更新する。
> 仕様参照: docs/goal_ai_project_v6_4.md / docs/goal_ai_reference_v2.md

---

## 5行サマリー
- **Version:** v3.11.0
- **Next:** デザインmockup完全準拠ミッション（構造差5件+スケーリング差20件+機能未実装7件）
- **Last done:** AP ✅ + AJ ✅ + AN既実装 ✅ + デザイン構造照合v2 ✅
- **Open issues:** design_checklist_v2.mdの乖離を全修正する
- **Proposals:** 0件

## 現在地
- **バージョン:** v3.11.0
- **チェーン:** デザインmockup完全準拠 → テスト配布
- **次のミッション:** デザインmockup完全準拠（キュー先頭）

## ミッションキュー（上から順に実行）

### デザインmockup完全準拠（ふとし承認済み 2026-03-23 実装その18）
> 目的: design_checklist_v2.mdで検出された全乖離をmockupに準拠させる。構造差・スケーリング差・機能未実装を全て修正。
> リスク: 🔴高（全画面に影響する大規模UI修正。1画面ずつデプロイ→canopy→確認のサイクルで進める）
> 参照: docs/design_checklist_v2.md（照合結果）、docs/mockups/（正のデザイン）

**方針:**
- **全ての乖離をmockupに寄せる**（mockupが正）
- **例外2件のみ実装値を維持:**
  1. input font-size 16px（iOS Safari自動ズーム防止。12pxにするとフォーカス時に画面がズームする）
  2. 送信/画像/音声ボタンサイズ 44px（Apple HIG最小タッチターゲット。28pxだとタップしにくい）
- 上記2件以外は、mockupのCSS値（font-size, padding, margin, border, icon size, 構造等）に完全準拠する

**修正カテゴリと優先順:**

**STEP 1: 構造差修正（最優先 — UIの見た目が根本的に違う5件）**
各修正後に1デプロイ → canopy → 次

1-1. サイドバーモードチップ: `<button class="mode-f">` SVGアイコン付き → `<span class="chip">` テキストのみピル（border-radius:8px, border:0.5px solid, font-size:8px, padding:2px 6px, gap:3px）。active状態はgradient背景。mockup 01_sidebar.html参照
1-2. ホームヒーローモデル名: バッジ風 → テキスト+ドット区切り（font-size:12px, gap:7px）。mockup 02a_home_prechat.html参照
1-3. タスク行: `.task-row` rich → `.tc` compact（gap:5px, padding:6px 4px, border-radius:6px, title font-size:9px）。カテゴリヘッダーも `.tgroup` テキスト+絵文字に。mockup 04a_tasks_mobile.html参照
1-4. GoalHubタスク: インラインスタイル → CSS class（.tc/.tch/.phase）。チェックボックスを14px circle に。mockup 05b_goalhub_tasks.html参照
1-5. 自分を知る入力欄: 紫テーマ独自 → CRN-03統一入力欄。mockup 06a_design_discover.html参照

**STEP 2: スケーリング差修正（全画面のCSS値をmockupに準拠）**
※ input font-size 16px と ボタン44px の2件は除外

2-1. #01 サイドバー:
  - ロゴSVG 28→22px
  - ブランドテキスト 22→13px
  - サブテキスト "Your private AI partner" → 削除（mockupにない）
  - ヘッダーpadding 16px 20px 10px → 0 12px 6px
  - ヘッダーborder 1px → 0.5px
  - ナビアイテム font-size 12→10px, padding 9px 20px → 5px 12px
  - ナビアイコン 18→15px
  - 「すべて見る→」色 gray → #c8920a (gold)
  - ゴールセクション名「ゴールプロジェクト」→「ゴール一覧」、サブテキスト「目標に本気で…」削除
  - フッターpadding 14px → 4px 12px
  - アバター 30→22px

2-2. #02a ホーム会話前:
  - ツールバーアイコン 32-36px → 20px
  - プリセットチップ font-size 12→10px, border 1px→0.5px
  - 入力ボックスpadding → 8px 12px（mockup値）

2-3. #02b ホーム会話中:
  - メッセージアバター 24→18px
  - フッター font-size 9→7px

2-4. #03 ホーム全機能:
  - モデル名ヘッダー色: gray統一 → Claude:#e8913a, GPT:#5b8def, Gemini:#e07070（AI名前のみカラー。CRN-02再確認）

2-5. #04a タスク一覧:
  - タスクタイトル font-size 12.5→9px
  - チェックボックス 16→14px
  - カテゴリ名 font-size 13→11px

2-6. #05a/c GoalHub:
  - ヘッダーpadding 20px 28px 0 → 8px 14px
  - タイトル font-size 21→13px, font-weight 400→500
  - 戻るボタン: ボタン(border/bg付き) → テキストリンク
  - 進捗バー高さ 6→4px
  - タブ font-size 12→9px, padding 9px 18px → 7px 10px
  - タブ active: solid border → gradient underline

2-7. #05b GoalHubタスク:
  - フェーズヘッダー・タスク行をCSS classに統一（STEP 1-4に含む）

2-8. #06d プロフィール:
  - アバター 80→48px

**STEP 3: 機能未実装修正（照合v2で検出された残り）**
3-1. GoalHub分析 停滞ポイントセクション — mockup 05ac参照
3-2. GoalHub分析 「3人寄れば文殊の知恵」セクション — mockup 05ac参照
3-3. AIメモ アコーディオン形式 — mockup 05d参照
3-4. AIロール「変更する」テキスト入力展開 — mockup 05e参照
3-5. ビジョン再分析6チップUI — mockup 06b参照
3-6. Connect 60%以下オレンジ(#ef9f27) + 「改善方法をAIに相談する」ボタン — mockup 06c参照
3-7. SNS共有「キャラクターをシェア」ボタン — mockup 06b参照

**デプロイ戦略:**
- STEP 1: 1件ずつデプロイ（構造変更は高リスク）。1-1完了→canopy→確認→1-2…
- STEP 2: 画面単位でバッチ（2-1全部→デプロイ→canopy→2-2全部→デプロイ…）
- STEP 3: 機能単位でデプロイ
- 各デプロイ後にcanopy PASS必須。FAILならrollback

---

### デザイン構造照合v2（ふとし承認済み 2026-03-23 実装その18）✅ 完了
> 目的: 前回照合（v1）が「機能の有無」だけを確認し、HTML構造・CSS値・レイアウトの乖離を大量に見逃した。今回はmockup HTMLの要素を1つずつ実装コードと構造比較する。
> リスク: 🟢低（調査のみ。コード変更なし）
> 重要: 前回の照合レポート（デザイン完全照合結果セクション）は信頼できない。「✅一致」と判定された画面も全て再照合すること。

**⚠ 前回照合の失敗理由（再発防止のため理解必須）:**
前回は「specに書いてある機能が実装にあるか」をgrep確認しただけだった。
例: サイドバーのモードチップ — specには「モード選択チップがある」と書いてある → grepで「mode」を検索 → 実装に存在する → ✅一致と判定。
しかし実際はmockupは `<span class="chip">通常</span>`（テキストのみのピル）、実装は `<button class="mode-f"><svg>...</svg>スパルタ</button>`（SVGアイコン付きボタン）で、タグ名すら違う。
**「機能が存在する」と「mockup通りに実装されている」は全く別の判定。** 今回は後者を行う。

**照合手順（各画面で必ず実行）:**
1. docs/mockups/ の該当HTMLファイルを開く
2. HTMLを上から読み、主要なUI要素を順にリスト化する。各要素について以下を記録:
   - タグ名（div/span/button/a等）
   - テキスト内容（日本語ラベル）
   - クラス名
   - CSS値（color, font-size, padding, margin, border-radius, gap, width, height, background, border）
   - アイコン: SVGかemojiか、SVGならstroke/fill色
   - 子要素の構成（何がネストされているか）
3. frontend/index.html + 該当JSファイルの同じUI要素を特定する
4. 1と3を項目ごとに比較。以下の基準で判定:
   - ✅ 一致: タグ名・テキスト・構造・CSS値が同じ（±2pxの誤差はOK）
   - ❌ 乖離: 上記のいずれかが異なる
5. ❌の場合、mockup値と実装値を両方記録する

**比較例（このレベルの精度で全画面を照合すること）:**

**例1: #01サイドバー モードチップ**
mockup: `<span class="chip">通常</span>` — テキストのみ、border-radius:8px、border:0.5px solid、font-size:8px、アイコンなし
実装: `<button class="mode-f mencare"><svg width="16" height="16" stroke="#28b464">...</svg><span class="mode-f-name">メンケア</span></button>` — SVGアイコン付きボタン、色つきstroke
判定: ❌ タグ名(span→button)、アイコン追加、CSS構造全体が異なる

**例2: #01サイドバー ゴールセクション**
mockup: `<div class="sb-sec-title">ゴール一覧</div>` + 各ゴールに `<div class="sb-prog"><div class="sb-prog-fill" style="width:65%">` プログレスバー付き
実装: `<div class="nav-section">ゴールプロジェクト</div>` + `<div style="font-size:0.65rem">目標に本気で取り組むエキスパートモード</div>` + プログレスバーなし
判定: ❌ テキスト違い(ゴール一覧→ゴールプロジェクト)、サブテキスト余分、プログレスバー欠落

**例3: #01サイドバー パーソナル「私をデザイン」**
mockup: `<div class="sub">私をデザイン</div>` — font-size:9px、シンプルなテキストサブアイテム
実装: `<div class="goal-card" style="border-color:var(--know-purple-border);background:rgba(157,120,216,.06)">` — 紫ボーダー付きカード、🪞絵文字16px、サブテキスト「あなたを知るほど、AIはもっと的確になる。」、→ アイコン
判定: ❌ 構造全体が異なる（テキスト1行→カードUI）、装飾追加

**全画面リスト（1画面ずつ順に照合）:**
- [x] #01 サイドバー → 01_sidebar.html
- [x] #02a ホーム会話前 → 02a_home_prechat.html
- [x] #02b ホーム会話中 → 02b_home_chat.html
- [x] #02c キーボード → 02c_home_keyboard.html
- [x] #03 ホーム全機能 → 03_home_full.html
- [x] #04a タスク一覧 → 04a_tasks_mobile.html
- [x] #04b タスク詳細 → 04b_tasks_detail.html
- [x] #04c タスクPC → 04c_tasks_pc.html
- [x] #05a ゴールハブチャット → 05ac_goalhub_chat_analysis.html
- [x] #05b ゴールハブタスク → 05b_goalhub_tasks.html
- [x] #05c ゴールハブ分析 → 05ac_goalhub_chat_analysis.html
- [x] #05d ゴールハブメモ → 05d_goalhub_memo.html
- [x] #05e ゴールハブ設定 → 05e_goalhub_settings.html
- [x] #06a 自分を知る → 06a_design_discover.html
- [x] #06b ビジョン → 06b_design_vision.html
- [x] #06c ゴール連携 → 06c_design_connect.html
- [x] #06d プロフィール → 06d_design_profile.html
- [x] #07 オンボーディング → 07_onboarding.html
- [x] #08a 解析 → 08a_analytics.html
- [x] #08b フィードバック → 08b_feedback.html
- [x] #08c 設定 → 08c_settings.html
- [x] #08d プラン選択 → 08d_plan.html

**出力:** docs/design_checklist_v2.md に結果を記載。画面ごとに要素リスト+判定+乖離詳細。
**前回結果との差分:** 前回「✅一致」だった画面で新たに乖離が発見された場合は特に注目して記録すること。
**修正はしない。報告のみ。**

---

### AJ: AIメモ空状態テキスト（ふとし承認済み 2026-03-22 実装その18）※照合v2完了後に実行
> 目的: GoalHubメモ画面で「AIメモがまだない場合」のガイダンステキストを表示
> リスク: 🟢低（表示テキスト追加のみ）
> 参照: design_amendment_001.md #4、mockup 05d_goalhub_memo.html

**仕様:**
- AIメモが0件の場合、空状態テキスト「AIがあなたを理解中です…」を表示
- テスターが初回アクセス時に「何もない」状態にならないようにする
- mockupのCSS値（色・サイズ・配置）に準拠

---

### AN: ユーザーメッセージ編集機能（ふとし承認済み 2026-03-22 実装その18）
> 目的: 送信済みユーザーメッセージの編集機能を実装
> リスク: 🟡中（チャット履歴の再送信ロジックを含む）
> 参照: design_spec_v3 P-30、mockup 03_home_full.html

**仕様:**
- ユーザーメッセージに編集ボタンを表示（ホバーまたはタップで出現）
- 編集モード: メッセージがテキストエリアに変化し、再送信可能
- 再送信時: 編集メッセージ以降の会話履歴を削除し、新しいAI応答を取得
- Supabase chat_messages テーブルの該当メッセージ以降を削除+新メッセージ保存
- **設計判断はCodeに委任**（UIの出し方、undo対応等）

---

### AP: ビジョン画面「5年後/やりたくない」セクション（ふとし承認済み 2026-03-22 実装その18）
> 目的: 「私をデザイン」ビジョン画面に未実装セクションを追加
> リスク: 🟡中（新UIセクション追加）
> 参照: design_spec_v3 #06b、mockup 06b_design_vision.html

**仕様:**
- 「5年後の理想の平日」セクション: AI分析結果をカード形式で表示
- 「やりたくない生活」セクション: 同上
- 既存のビジョン画面のレイアウト・スタイルに統一
- データはAI分析結果から取得（既存のdeep_analysis結果を活用）
- mockupのCSS値に準拠

---

### デザイン完全照合（ふとし承認済み 2026-03-22 Claude.ai承認済み）✅ 完了
> 目的: spec仕様 × モックアップHTML × 実装コードの3点照合。全画面の乖離を完全リスト化する。
> リスク: 🟢低（調査のみ。コード変更なし）
> 重要: これはテスト配布前のデザイン品質ゲートである。全乖離を特定しないと次に進まない。

**手順:**
1. docs/goal_ai_design_spec_v3.md の各画面セクションを読む
2. docs/design_review_changelog_v3.md の該当画面の変更記録を読む
3. docs/design_amendment_001.md の該当変更を確認する
4. docs/mockups/ の該当HTMLファイルを開き、CSS値（色コード・px値・font-size・padding・border-radius・アイコンSVG等）を確認する
5. frontend/ の実装コードと照合し、以下を記録する:
   - specに書いてあるがmockupと異なる点
   - mockupに書いてあるが実装にない点
   - 実装にあるがspec/mockupと異なる点

**全画面リスト（1画面ずつ順に照合）:**
- [x] #01 サイドバー → 01_sidebar.html
- [x] #02a ホーム会話前 → 02a_home_prechat.html
- [x] #02b ホーム会話中 → 02b_home_chat.html
- [x] #02c キーボード → 02c_home_keyboard.html
- [x] #03 ホーム全機能 → 03_home_full.html
- [x] #04a タスク一覧 → 04a_tasks_mobile.html
- [x] #04b タスク詳細 → 04b_tasks_detail.html
- [x] #04c タスクPC → 04c_tasks_pc.html
- [x] #05a ゴールハブチャット → 05ac_goalhub_chat_analysis.html
- [x] #05b ゴールハブタスク → 05b_goalhub_tasks.html
- [x] #05c ゴールハブ分析 → 05ac_goalhub_chat_analysis.html
- [x] #05d ゴールハブメモ → 05d_goalhub_memo.html
- [x] #05e ゴールハブ設定 → 05e_goalhub_settings.html
- [x] #06a 自分を知る → 06a_design_discover.html
- [x] #06b ビジョン → 06b_design_vision.html
- [x] #06c ゴール連携 → 06c_design_connect.html
- [x] #06d プロフィール → 06d_design_profile.html
- [x] #07 オンボーディング → 07_onboarding.html
- [x] #08a 解析 → 08a_analytics.html
- [x] #08b フィードバック → 08b_feedback.html
- [x] #08c 設定 → 08c_settings.html
- [x] #08d プラン選択 → 08d_plan.html

**出力:** session_progress.mdに「デザイン照合結果」セクションとして乖離リストを記載。修正はしない。報告のみ。

**注意:**
- mockupのサンプルデータ（ユーザー名・ゴール名・日付等）はハードコードしない。CSS/レイアウトのみ照合対象
- 色コード・px値・font-size・border-radius・SVGパス等、数値レベルで一致確認すること
- 「だいたい合っている」は不可。完全一致か、明確な乖離かの二択で判定する

---

### ルーティング最適化 v2（ふとし承認済み 2026-03-22 Claude.ai承認済み）
> 目的: GPT比率を拡大しコスト-32〜41%削減。Geminiを3.x系に更新。テスト配布前に攻めた配分で品質をテスターに検証してもらう。
> リスク: 🟡中（ルーティング変更。ロールバック可能）
> ロールバック: constants.jsのモデル名とrouting.jsのプロンプトを元に戻す

**1. PLAN_CONFIG モデル名更新（constants.js）**
- Free/Light/Pro: gemini `gemini-2.5-flash` → `gemini-3-flash-preview`
- Max/Ultra: gemini `gemini-2.5-pro` → `gemini-3.1-pro-preview`
- 他のモデル（Claude/GPT/router）は変更なし

**2. ルーティングプロンプト再定義（routing.js callRoutingAPI）**
- 旧: `claude（コーチング・戦略・感情・その他すべて）`
- 新: catch-allを `gpt` に変更。分類定義:
  - `claude`: 深い感情サポート・人生相談・コーチング核心部（悩み・自己分析・価値観・モチベーション）
  - `gpt`: アイディア出し・一般会話・翻訳・要約・クリエイティブ・タスク相談・その他すべて（catch-all）
  - `gpt-simple`: 相槌・短い返事・挨拶
  - `gemini`: 検索・天気・ニュース・事実Q&A・比較分析・データ処理・調査

**3. quickRoute パターン拡張（routing.js quickRoute）**
- 既存のgemini/gptパターンは維持
- 新規GPTパターン追加: アイディア/おすすめ/提案して/考えて/リスト/比較して/教えて/作って/書いて
- catch-all変更: quickRouteで捕まらない場合 → callRoutingAPI → GPTがcatch-all

**4. gemini.js Thought Signatures対応（品質維持のため）**
- Gemini 3のAPIレスポンスに含まれる `thoughtSignature` を検出
- 次のリクエスト時にhistoryに含めて返送
- テキストチャットでは厳密検証されないが、未返送で品質劣化する
- 実装方針はCodeに委任（GOAL AIの会話履歴の構造に合わせた最適なアプローチを選択）

**5. Gemini 3 Flash のthinkingConfig設定**
- GOAL AIのチャット用途では `thinking_level: "minimal"` を設定（コスト抑制・速度優先）
- ※thinkingトークンはoutput料金で課金されるため、chat用途ではminimal推奨

**注意事項:**
- 両Geminiモデルは Preview ステータス（2週間前通知で変更の可能性あり）
- Max/Ultraの3.1 Pro Previewは1ターン¥3.26（旧2.5 Proの3倍）。ルーティングでGemini比率が上がりすぎないよう注意
- デプロイ後、スモークテストで各ルートの動作確認必須（gemini/gpt/gpt-simple/claude 各1回以上）
- canopy.shにGeminiモデル名チェック項目を追加（gemini-3-flash-preview / gemini-3.1-pro-preview が存在すること）

### 構造改善バッチ（ふとし承認済み 2026-03-22 Claude.ai承認済み）
1. ✅ 旧ファイル整理（commit 6d0adc2で実施済み）
2. ✅ canopy強化（canopy.sh #15-17で実装済み）
3. ✅ canopyにdesign_spec_v3 grepチェック統合（card-radius/popup-radius/pill-radius/hub-tabs追加。canopy PASS）

### Code自律性・品質強化バッチ（ふとし承認済み 2026-03-22 Claude.ai承認済み）
4. ✅ 5行サマリー（既に冒頭に存在）
5. ✅ バグパターン集一元化（project_v6_4.mdに§14なし。development_rules.md C11に一元化済み）
6. ✅ ミッション完了チェックリスト（development_rules.md C13に存在）
7. ✅ 提案ログテンプレートに参照ドキュメント列（既にテンプレートに存在）
8. ✅ キュー空時フローにdesign_spec検出（CLAUDE.md step 2に記載済み）
9. ✅ バグ横展開チェック（development_rules.md C11 line 100に記載済み）
10. ✅ Playwright E2Eデザイン視覚テスト追加（tests/e2e/specs/design-visual.spec.ts新規作成）
11. ✅ git pre-commitフック（.git/hooks/pre-commit: バージョン同期+旧デザイン値チェック）

### デザイン全画面検証（ふとし承認済み 2026-03-22 Claude.ai承認済み）
12. ✅ 全画面検証完了（報告のみ。下記「デザイン全画面検証結果」参照）

### 再発防止策ルール定着（ふとし承認済み 2026-03-22 Claude.ai承認済み）
1. ✅ R1+R2: development_rules.md C12追記 — インラインスタイル禁止ルール + UI変更時のJS検査必須化
2. ✅ R5: canopy.sh #12追加 — 旧デザイン値残存チェック(5パターン) + モデル色ハードコード警告 + style=ベースライン計測
3. ✅ R3: CSS変数一元定義 — 3テーマ全てに --model-*, --send-btn-*, --input-radius, --card-radius, --know-purple-* 追加済み
※ R1/R2/R5は手順ルールの領域。C10同様にCodeが自律管理する。追加OK、削除・緩和はClaude.ai承認必要。

### 完了済み
- KICKOFF-001 Step 0〜8c ✅
- UX-001〜003 ✅
- テスト配布前 #1〜12 ✅（#2 Vite化のみ後回し）

### 開発体制改善ミッション（Code自律実行）
1. ✅ デザイン実装検証+修正: CRN-02 .msg-model gray, CRN-03 入力ボックス4画面統一(0.5px amber/14px), GPT電球アイコン実使用
2. ✅ canopy.sh HTTPスモークテスト (8エンドポイント: version/health/auth-401s/frontend)
3. ✅ canopy.sh実行時間計測 (start/end + total秒数)
4. ✅ Freeプラン残り回数バー (サイドバー、セッションカウント)
5. ✅ Pages プレビュー → Dashboard設定のみ (ドキュメント化)
6. ✅ 提案ログテンプレート → 既存

### テスト配布前 追加ミッション（ふとし承認済み 2026-03-22）
A. ✅ アカウント削除（POST /api/account/delete + 2段階confirm + Supabase全テーブル削除 + KVクリア + localStorage/cookieクリア）
B. ✅ Ultraコンテキスト2倍（buildCompressedMessagesにcontextMultiplier引数、Ultra=20メッセージ窓）
C. ✅ ET週間上限トラッキング（KVベース、checkETLimit/incrementETUsage、/api/plan/statusにet情報追加）

### 提案ログD-J実装（ふとし承認 2026-03-22）
D. ✅ 達成報告検出+コンフェッティ（AI応答パターンマッチ→confetti/milestone）
E. ✅ 定期チェックイン（ストリーク連動、1日1回localStorage）
F. ✅ クイックゴール（600msロングタップ→ゴール作成画面）
G. ✅ チャット背景プリセット（なし/ドット/グリッド/ウェーブ、設定パネル）
H. ✅ Vite + ES Modules完全移行（publicDir, esbuild minify, hashed assets, deploy:frontend）
I. ✅ Playwright E2E（features.spec.ts: プランモーダル/設定/オンボーディング/API認証）
J. ✅ メモ生成KVロック（60秒TTL、重複実行防止）

### ふとし手動タスク（Code実行不可）
- [ ] スマホ+PC通しテスト
- [ ] 自分で1週間テスト使用
- [ ] テスターにURL共有（TESTER01〜05コード）
- [ ] テスト配布FB項目に「料金プランの分かりやすさ」含める
- [ ] 1分間使い方デモ動画を用意
- [ ] ローンチ時「ソロ開発者がAIと3週間で作ったSaaS」ストーリー活用

## デザイン完全照合結果（2026-03-22 デザイン完全照合ミッション）

spec_v3.md × mockup HTML × 実装コードの3点照合。全22画面を検証。以下は**乖離リスト**（修正はしない。報告のみ）。
※ 前回Mission12の検証後にK〜AF実装で多数解消済み。本照合はその後の最新状態との差分。

### A. 機能未実装（spec/mockupにあるが実装にない）

| # | 画面 | 未実装項目 | 参照 |
|---|------|-----------|------|
| A1 | #03 Home | ユーザーメッセージ編集機能（editMessage関数が存在しない） | P-30 |
| A2 | #05b GoalHub Tasks | AI提案アイコンが王冠ではなくテキスト(✨) | G05B-02 |
| A3 | #05c GoalHub Analysis | 停滞ポイントセクション未実装 | G05C-02 |
| A4 | #05c GoalHub Analysis | 「3人寄れば文殊の知恵」セクション未実装 | G05C-03 |
| A5 | #05d GoalHub Memo | AIメモのアコーディオン形式未実装（単純ボックス表示のみ） | AMEND-001 #4 |
| A6 | #05d GoalHub Memo | 空状態テキスト「AIがあなたを理解中です…」未実装 | AMEND-001 #4 |
| A7 | #05e GoalHub Settings | AIロール「変更する」→テキスト入力フィールド展開未実装 | G05E-03 |
| A8 | #06b Vision | 「5年後の理想の平日」「やりたくない生活」セクション未実装 | Spec |
| A9 | #06b Vision | 再分析6チップ選択式UI（「選択した項目を再分析」）未実装 | G06B-04 |
| A10 | #06b Vision | 「キャラクターをシェア」SNS共有ボタン未実装 | G06B-05 |
| A11 | #06c Connect | 60%以下バー色オレンジ(#ef9f27)未実装 | G06C-01 |
| A12 | #06c Connect | 「改善方法をAIに相談する」ボタン未実装 | Spec |
| A13 | #01 Sidebar | タスクナビ重要度バッジ（🔴n 🟡n 🟢n）未実装 | Spec |
| A14 | #01 Sidebar | 利用状況バー（Pro/Max: 「今月の利用: ¥X / ¥Y」）未実装 | Spec |

### B. CSS値レベルの乖離（mockupと実装の数値差異）

| # | 画面 | 乖離項目 | mockup/spec値 | 実装値 | 参照 |
|---|------|---------|-------------|--------|------|
| B1 | #02a Home | プリセットチップgap | 6px | 8px | mockup .presets vs index.html #home-presets |
| B2 | #02a Home | hero margin-bottom（コンテンツ上シフト） | 35px | なし（padding:24px 16px 0のみ） | H02-02 |
| B3 | #02a Home | ゴールド区切りライン+11px gap | 存在する | sep要素なし | H02-03 |
| B4 | #02a Home | タスクボックス高さ | 208px | 明示的height設定なし | H02-04 |
| B5 | #02b Home | フッターセパレータ | スペース（「·」ではない） | ` · `（中点使用） | CRN-02, chat.js L770 |
| B6 | #07 Onboarding | スキップボタンbottom位置 | 16px | 12px (margin-bottom:12px) | G07-08 |
| B7 | #08d Plan | Pro border | 2px solid #c8920a | 2px solid rgba(228,184,106,.5) | G08D-07 |
| B8 | #08d Plan | 料金イメージバー幅 | 60% | 50% | G08D-07 |

### C. spec × mockup間の不整合（実装に影響）

| # | 画面 | 不整合項目 | spec値 | mockup値 | 備考 |
|---|------|-----------|--------|----------|------|
| C1 | #02a Home | 入力欄border-radius | 14px（スマホ） | 16px | spec=14px(CRN-03), mockup=16px。実装は14px=spec準拠 |
| C2 | #02a Home | 入力欄padding | 記載なし | 8px 12px | 実装=4px 8px。mockupの方が余裕あり |

### D. 前回Mission12で報告後に実装完了済み（解消確認）

| # | 画面 | 項目 | 現状 |
|---|------|------|------|
| D1 | #02a Home | プレースホルダー「質問、相談、なんでも...」 | ✅ 実装済み |
| D2 | #02b Home | C-variant ノッチ（4pxゴールドバー） | ✅ has-msgs::after |
| D3 | #04 Tasks | ソート「重み順」ゴールド色 | ✅ .sort-btn.active color:#c8920a |
| D4 | #04 Tasks | FAB重なり防止 52px | ✅ #task-list-scroll padding-bottom:52px |
| D5 | #04 Tasks | ヒント「タップで詳細·長押しで並べ替え」 | ✅ renderTasks()内に実装 |
| D6 | #06 Header | D-variant ゴールドヘッダー | ✅ .myself-hub-hd background:#c8920a |
| D7 | #06b Vision | MY CHARACTERカード（ゴールド枠） | ✅ .my-character-card 実装済み |
| D8 | #08b Feedback | NPS 0-10スコア | ✅ chat.js NPS scoring + style.css .nps-row |
| D9 | #08c Settings | 位置情報トグル | ✅ location-toggle 実装済み |
| D10 | #08c Settings | 「会話履歴を削除」ボタン | ✅ deleteChatHistory() 実装済み |
| D11 | #08d Plan | トライアル注記 | ✅ 実装済み |
| D12 | #08a Analytics | ストリーク/期間切替/タスク溜まり警告 | ✅ K〜AF実装で完了 |

### E. 画面別サマリー

| 画面 | 乖離数 | 判定 |
|------|--------|------|
| #01 サイドバー | 2件(A13-14) | 🟡 機能未実装あり |
| #02a ホーム会話前 | 4件(B1-B4) | 🟡 CSS値ずれ |
| #02b ホーム会話中 | 1件(B5) | 🟡 セパレータ不一致 |
| #02c キーボード | 0件 | ✅ 一致 |
| #03 ホーム全機能 | 1件(A1) | 🟡 編集機能未実装 |
| #04a タスク一覧 | 0件 | ✅ 一致 |
| #04b タスク詳細 | 0件 | ✅ 一致 |
| #04c タスクPC | 0件 | ✅ 一致 |
| #05a GoalHubチャット | 0件 | ✅ 一致 |
| #05b GoalHubタスク | 1件(A2) | 🟡 アイコン差異 |
| #05c GoalHub分析 | 2件(A3-4) | 🔴 セクション未実装 |
| #05d GoalHubメモ | 2件(A5-6) | 🔴 アコーディオン未実装 |
| #05e GoalHub設定 | 1件(A7) | 🟡 入力展開未実装 |
| #06a 自分を知る | 0件 | ✅ 一致 |
| #06b ビジョン | 3件(A8-10) | 🔴 複数セクション未実装 |
| #06c ゴール連携 | 2件(A11-12) | 🟡 UX機能未実装 |
| #06d プロフィール | 0件 | ✅ 一致 |
| #07 オンボーディング | 1件(B6) | 🟢 微小CSS差 |
| #08a 解析 | 0件 | ✅ 一致 |
| #08b フィードバック | 0件 | ✅ 一致 |
| #08c 設定 | 0件 | ✅ 一致 |
| #08d プラン選択 | 2件(B7-8) | 🟢 微小CSS差 |

**統計: 全22画面中 ✅一致12画面 / 🟢微小2画面 / 🟡要修正6画面 / 🔴要大対応3画面（重複あり計23件）**

---

## 直近の変更履歴（直近3件のみ。過去分はinstructions/results/に保存）

### AP: ビジョン画面セクション追加 (2026-03-23) ✅
- 「5年後の理想の平日」セクション追加（mockup 06b準拠: 13px, 12px radius, 1.8 line-height, ペンアイコン）
- 「やりたくない生活」セクション追加（同上）
- editVisionField()関数: インライン編集→保存→renderVision()
- applySummaryToProfile()拡張: 【5年後の理想の平日】【やりたくない生活】パターンマッチ追加
- USER_PROFILE.ideal_day, .unwanted_life フィールド追加
- AN（ユーザーメッセージ編集）: editAndResend()として既に実装済みを確認→スキップ
- canopy PASS → deploy → git tag v3.11.0-ap-vision

### デザインmockup完全準拠 STEP 1+2 (2026-03-24) 進行中
- 1-1 ✅ サイドバーモードチップ → テキストのみピル（span.mode-chip, gradient active）
- 1-2 ✅ ヒーローモデル名 → テキスト+ドット区切り（12px, gap:7px）
- 1-5 ✅ 自分を知る入力欄 → CRN-03統一（gold border, round send btn）
- 2-1 ✅ サイドバースケーリング全修正（ロゴ22px/ブランド13px/ナビ10px/アイコン15px/アバター22px/フッター4px 12px/ゴール一覧テキスト/私をデザインsub化）
- 1-3, 1-4 未着手（タスク画面大規模リファクタ — 要慎重実装）
- 2-2〜2-8, STEP 3 未着手
- canopy全PASS → 全deploy済み

### AJ: AIメモ空状態テキスト (2026-03-23) ✅
- GoalHubメモペインに「AIの理解メモ」セクション新設
- 空状態: 「AIがあなたを理解中です。5回ほど会話すると…」(13px, --text-secondary)
- データ有: goal.ai_memo をpre-wrap表示
- mockup 05d準拠: gold accent border + 背景
- canopy PASS → deploy → git tag v3.11.0-aj-memo

### デザイン構造照合v2 (2026-03-23) ✅
- 全22画面のmockup HTML要素を1つずつ実装と構造比較（タグ名・CSS値・テキスト・アイコン）
- 結果: docs/design_checklist_v2.md に全詳細記録
- 4パターン検出: スケーリング差(22件)/構造差(5件)/機能未実装(7件)/mockup限定(4件)
- 前回v1で「✅一致」だった#01/#02a/#04aで構造差を多数発見
- スケーリング差はmockup 340px固定 vs 実装レスポンシブの意図的な差異の可能性あり
- 修正はしない。報告のみ（ミッション要件通り）

### デザイン全画面実装 K〜AF (2026-03-22) ✅
- K: 複数ゴール同時検出（showGoalDetectToast配列対応）
- L: ダウングレードボタン（プランモーダルにStripeポータルリンク）
- R: ホームヒーロー（王冠48px+AIバッジ+プリセット6チップ）
- S: プレースホルダー→「質問、相談、なんでも...」
- T: ゴール検出トースト（バウンスアニメ+永続+金枠+王冠）
- V: タスクフィルター（ライフ/ゴール追加+重み順ソート）
- W: 私をデザインゴールドヘッダー+MY CHARACTERカード
- X: Analytics（ストリーク+期間切替+タスク溜まり警告）
- Y: Settings（位置情報トグル+会話履歴削除）
- Z: トライアル注記「14日間無料トライアル・カード不要」
- AB: PC版タスクFAB→ヘッダーボタン+52pxパディング
- AC: フィードバックNPS（0-10スコア）
- AD: オンボーディングSVG描画アニメーション
- AE: タスクヒント初回表示
- AF: 達成済みゴールド色
- canopy PASS

### CSS微修正バッチ AG-AM (2026-03-22) ✅
- AG: フッターセパレータ `·` → スペース（chat.js 5箇所全置換、CRN-02準拠）
- AH: プリセットgap 8px → 6px（mockup 02a一致）
- AL: Onboardingスキップbottom margin 12→16px（G07-08）
- AM: Proカードborder rgba(.5) → ソリッド#c8920a（G08D-07）
- AI(AI提案王冠): GoalHubタスクにAI提案セクション自体がないためスキップ（機能未実装レイヤー）
- AK(Connect 60%オレンジ): renderConnectContent内にロジックがないためスキップ（機能未実装レイヤー）
- canopy PASS → deploy → git tag v3.11.0-css-fixes

### ルーティング最適化v2 (2026-03-22) ✅
- Step 1: PLAN_CONFIG Geminiモデル更新 — Free/Light/Pro: gemini-3-flash-preview, Max/Ultra: gemini-3.1-pro-preview
- Step 2: ルーティングプロンプト再定義 — catch-all=GPTに変更、claude=感情・コーチング核心部に特化
- Step 3: quickRouteパターン拡張 — GPT向け9パターン追加（アイディア/おすすめ/提案して/考えて/リスト/比較して/教えて/作って/書いて）
- Step 4: Gemini 3 Thought Signatures対応 — KVベースで前回signatureを保存・次回リクエストに含める
- Step 5: Gemini 3 Flash thinkingConfig — thinkingBudget:0設定（チャット用途コスト抑制）
- canopy #18-19追加（Geminiモデル名+routing catch-all確認）
- canopy PASS → deploy → git tag v3.11.0-routing-v2

### デザイン完全照合 (2026-03-22) ✅
- 全22画面のspec × mockup × 実装の3点照合を実施
- 機能未実装14件(A1-A14)、CSS値乖離8件(B1-B8)、spec-mockup不整合1件(C1) を検出
- 前回Mission12の報告後に解消済み12件(D1-D12)を確認
- 一致12画面 / 微小2画面 / 要修正6画面 / 要大対応3画面
- 修正はしない。報告のみ（ミッション要件通り）

### 構造改善+品質強化+デザイン全画面検証 (2026-03-22) ✅
- #1-3: 構造改善バッチ（旧ファイル整理済確認、canopy強化済確認、design_spec grepチェック4項目追加）
- #4-9: 品質強化バッチ（5行サマリー/バグパターン/チェックリスト/提案テンプレ/キュー空フロー/横展開 — 全て実装済確認）
- #10: Playwright E2Eデザイン視覚テスト新規作成（design-visual.spec.ts: CSS変数/送信ボタン/入力ボックス/フォント/プランカード検証）
- #11: git pre-commitフック作成（バージョン同期+旧デザイン値チェック）
- #12: デザイン全画面検証 — HIGH 23件 / MEDIUM 10件の未実装を特定（session_progress.mdに詳細記録）
- canopy PASS（全項目OK）

### テスト配布前 追加3件 (2026-03-22) ✅
- A: POST /api/account/delete + Supabase CASCADE + KV/localStorage全削除
- B: Ultra context_multiplier 2.0 → buildCompressedMessages 20メッセージ窓
- C: ET KV週間カウンタ + /api/plan/status et情報
- git tags: v3.9.3-account-delete / v3.9.3-ultra-et

### 開発体制改善ミッション (2026-03-22) ✅
- #1: デザイン検証修正 (CRN-02 gray, CRN-03 入力統一4画面, GPT電球アイコン)
- #2-3: canopy HTTP 8エンドポイント + 実行時間計測
- #4: Free残り回数バー (サイドバー)
- git tag: design-verify-complete / devinfra-complete

### テスト配布前ミッション (2026-03-22) ✅
- #1: fontsize-init.js + sw-register.js 外部化
- #3: manifest.json新規作成（PWA installable）
- #5: Free daily_limit超過→nano fallback
- #7: data-model属性でバブル固有モデル名保持
- #2 Vite化→後回し、#4,6,8-12: 既存実装確認済み
- git tags: mission1-complete / mission3-complete / mission5-complete

### UX-001〜003 (2026-03-22) ✅
- 初期タスク段階式 / コーチマーク3点 / AI最適化%表示
- git tags: ux001-complete / ux002-complete / ux003-complete

### KICKOFF-001 Step 7〜8c (2026-03-21) ✅
- フロントエンドv6.3 / 共通コンポーネント / 各画面UI / プラン演出
- canopy.sh 49項目全PASS
- git tags: step7-complete 〜 step8c-complete

## 未解決の問題
- ✅ 解決済み: デザイン未反映の根本原因はAPP_VERSIONの未更新。v3.9.3のままだったためSWが古いキャッシュを配信。v3.10.0に更新してSWキャッシュパージ完了
- ✅ 解決済み: スマホチャットエラーの根本原因はenv.KV(undefined)→env.TOKEN_KVの誤参照。修正済み
- 🟡 教訓: CLAUDE.md v16の鉄則5項に「APP_VERSION更新」が含まれていなかった。今後はデプロイ時に必ず更新する

## 提案ログ
### キュー空時のルール
キュー空 → docs/goal_ai_project_v6_4.md §8 + docs/goal_ai_reference_v2.md + コードベースgrepで未実装を特定 → ここに候補記載 → ふとしに報告して停止 → 承認後キューに移動

### テンプレート（候補記載時）
| # | タスク名 | 影響範囲 | 工数目安 | 優先度案 | 関連参照ドキュメント |
|---|---------|---------|---------|---------|-------------------|
| - | 例: ○○ | frontend/js/chat.js | 30分 | 🟡 | docs/goal_ai_project_v6_4.md §X |

### 第4回調査（2026-03-22 キュー空時自律提案）

**デザイン照合A1-A14の修正候補（テスト配布前ゲート）**

| # | タスク名 | 影響範囲 | 工数目安 | 優先度案 | 関連参照ドキュメント |
|---|---------|---------|---------|---------|-------------------|
| AG | フッターセパレータ修正（·→スペース） | frontend/js/chat.js L770等 | 15min | 🟢 | design_spec_v3 CRN-02 |
| AH | プリセットgap修正（8px→6px） | frontend/index.html #home-presets | 5min | 🟢 | mockup 02a |
| AI | AI提案アイコン王冠化（✨→crown SVG） | frontend/js/goals.js | 20min | 🟢 | design_spec_v3 G05B-02 |
| AJ | AIメモ空状態テキスト追加 | frontend/js/goals.js | 15min | 🟢 | design_spec_v3 AMEND-001 #4 |
| AK | Connect画面オレンジ色(#ef9f27)60%以下 | frontend/js/profile.js | 15min | 🟢 | design_spec_v3 G06C-01 |
| AL | Onboardingスキップbottom位置(12→16px) | frontend/index.html | 5min | 🟢 | design_spec_v3 G07-08 |
| AM | Proカードborder修正（alpha→ソリッド） | frontend/index.html | 5min | 🟢 | design_spec_v3 G08D-07 |

**機能未実装候補（中期）**

| # | タスク名 | 影響範囲 | 工数目安 | 優先度案 | 関連参照ドキュメント |
|---|---------|---------|---------|---------|-------------------|
| AN | ユーザーメッセージ編集機能 | frontend/js/chat.js | 2h | 🟡 | design_spec_v3 P-30 |
| AO | AIメモアコーディオン形式 | frontend/js/goals.js, style.css | 1.5h | 🟡 | design_spec_v3 AMEND-001 #4 |
| AP | ビジョン画面「5年後/やりたくない」セクション | frontend/index.html, profile.js | 1h | 🟡 | design_spec_v3 #06b |
| AQ | ビジョン再分析6チップUI | frontend/js/profile.js | 1h | 🟡 | design_spec_v3 G06B-04 |
| AR | Connect「改善方法をAIに相談する」ボタン | frontend/js/profile.js | 30min | 🟢 | design_spec_v3 #06c |
| AS | SNS共有「キャラクターをシェア」ボタン | frontend/js/profile.js | 30min | 🟢 | design_spec_v3 G06B-05 |
| AT | サイドバー重要度バッジ（🔴n 🟡n 🟢n） | frontend/js/ui.js | 1h | 🟡 | design_spec_v3 #01 |
| AU | サイドバー利用状況バー（Pro/Max） | frontend/js/ui.js | 1h | 🟡 | design_spec_v3 #01 |
| AV | AIロール「変更する」テキスト入力展開 | frontend/js/goals.js | 30min | 🟢 | design_spec_v3 G05E-03 |

**バックログ候補（reference_v2.md由来）**

| # | タスク名 | 影響範囲 | 工数目安 | 優先度案 | 関連参照ドキュメント |
|---|---------|---------|---------|---------|-------------------|
| AW | AIメモ更新トースト通知 | frontend/js/profile.js, ui.js | 30min | 🟢 | reference_v2 #14 |
| AX | 紹介報酬自動処理 | src/routes/referral.js | 2h | 🟡 | reference_v2 #24 |
| AY | トリセツPDF出力 | frontend/js | 3h | 🟡 | reference_v2 #32 |

### 承認済み未実装 → 全完了
- ✅ Vitestユニットテスト基盤（12テスト、constants.test.js）
- ✅ git tagにバージョン番号含める（v3.9.3-vite, v3.9.3-vitest適用済み）
- ✅ C9/A2: 運用ルールとしてCLAUDE.mdに記載済み

### 第2回調査 K-O → 全完了 ✅
- K: 複数ゴール同時検出 → showGoalDetectToastが複数トピック対応
- L: ダウングレードボタン → プランモーダルにStripeポータルリンク追加
- M: ディープ分析注入 → 既に実装済み（deep_context経由）
- N: データエクスポートAPI → 既に実装済み（/api/account/export）
- O: docs TODO更新 → 既に最新

### 第3回調査 R-AF → 全完了 ✅
- R: ホームヒーロー+プリセットチップ → 王冠48px+AIバッジ+6チップ追加
- S: プレースホルダー「質問、相談、なんでも...」に変更
- T: ゴール検出トースト → バウンスアニメ+永続+複数ゴール対応
- U: ユーザーメッセージ編集 → 未実装（仕様確認中、次回対応）
- V: タスクフィルター拡張 → ライフ/ゴール+重み順ソート追加
- W: ゴールドヘッダー+MY CHARACTERカード追加
- X: Analytics → ストリーク+期間切替+タスク溜まり警告追加
- Y: Settings → 位置情報トグル+会話履歴削除ボタン追加
- Z: トライアル注記テキスト更新
- AA: C-variantノッチ → 既に実装済み（has-msgs::after）
- AB: PC版FAB非表示+ヘッダーテキストボタン+52pxパディング
- AC: フィードバックNPS → 0-10スコア+フォローアップ追加
- AD: オンボーディングSVG描画アニメーション追加
- AE: タスクヒント初回表示追加
- AF: 達成済みボタンをゴールド色に変更
| AD | オンボーディングSVG描画アニメーション | frontend/style.css | 1h | 🟢 | design_spec_v3 G07-02 |
| AE | タスクヒント「タップで詳細・長押しで並べ替え」初回表示 | frontend/js/goals.js | 30min | 🟢 | design_spec_v3 P-32 |
| AF | ゴール設定「達成済み」ゴールド色に変更 | frontend/style.css or js/goals.js | 10min | 🟢 | design_spec_v3 G05E-01 |

**手動確認のみ（ふとし対応）**

| # | 項目 | 確認方法 |
|---|------|---------|
| P | Supabaseマイグレーション確認 | Dashboard確認 |
| Q | OWNER_SECRET環境変数 | wrangler secret list |

---

### 未実装候補（2026-03-22 第1回調査 A-J → 全完了）

**テスト配布に影響するもの（優先度高）**

| # | タスク名 | 影響範囲 | 工数目安 | 優先度案 |
|---|---------|---------|---------|---------|
| A | アカウント削除の実装（現在toast「準備中」） | src/routes/新規, Supabase CASCADE | 2h | 🔴 |
| B | Ultraコンテキスト2倍の適用 | src/services/history.js, chat.js | 30min | 🟡 |
| C | ET(Extended Thinking)週間上限トラッキング | src/routes/chat.js, constants.js | 1h | 🟡 |

**UX改善（中期）**

| # | タスク名 | 影響範囲 | 工数目安 | 優先度案 |
|---|---------|---------|---------|---------|
| D | 達成報告検出+コンフェッティ自動トリガー | src/routes/chat.js, frontend/js/goals.js | 1h | 🟡 |
| E | 定期チェックイン（ストリーク連動） | frontend/js/chat.js, Worker通知 | 2h | 🟡 |
| F | クイックゴール（ロングタップ→即登録） | frontend/js/chat.js, style.css | 1h | 🟢 |
| G | チャット背景プリセット | frontend/style.css, ui.js | 30min | 🟢 |

**アーキテクチャ（後回し可）**

| # | タスク名 | 影響範囲 | 工数目安 | 優先度案 |
|---|---------|---------|---------|---------|
| H | Vite + ES Modules完全移行 | frontend/全体, ビルドパイプライン | 4h | 🔴 |
| I | Playwright E2Eテスト拡充 | tests/e2e/ | 2h | 🟡 |
| J | AI理解メモ生成キューイング | src/services/memo.js | 2h | 🟢 |

---

## ふとし ↔ Claude.ai 議論待ちリスト

1. **競合比較分析（ルーティングv2後）** — 今回のモデル変更がGOAL AIの売り文句にどう影響するか。Google(Gemini)・OpenAI(ChatGPT Plus/Pro)・Anthropic(Claude Pro/Max)の各プランと比較し、ライトユーザー・通常ユーザー・ヘビーユーザー目線で徹底解析。特に使用AIのグレード・性能・コスパの見え方。

---

## Stripe / Supabase
- Price ID・接続情報は tests/.env.test を参照（git管理外）
