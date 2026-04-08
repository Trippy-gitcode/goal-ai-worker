# GOAL AI — CLAUDE.md（Claude Code専用）
> 最終更新：2026-03-24（実装その18: canopy #20/#21追加、C2/C10/C15ルール追加。次回canopyでFAILする項目あり）
> **このファイルを読んだらsession_progress.mdのキューを上から自律実行**
> **アドホック指示の場合も、まずこのファイルの参照ドキュメントリストを確認すること**
> 判断に迷ったら development_rules.md を参照

---

## 🔒 契約セクション（Code変更禁止。変更権限はClaude.ai経由のみ）

### プラン構成（v6.3 + ルーティングv2）
Free(¥0,20回/日,Sonnet+mini+3Flash) / Light(¥500~980,¥8/t,cap¥980) / Pro(¥1,500~2,980,¥20/t,cap¥2,980,Sonnet4.6+GPT-5+3Flash) / Max(¥1,500~9,800,¥10/t,cap¥9,800,Opus4.6+GPT-5+3.1ProPreview) / Ultra(¥20,000使い放題,Maxと同モデル,ET140回/週,コンテキスト2倍)

### 変更不可の設計
- AIルーティング: quickRoute→callRoutingAPI→モデル振り分け（廃止禁止）。catch-allはGPT（Claude 15%/GPT 40%/simple 15%/Gemini 30%目標）
- フェアユース: 5h窓+週間窓の2層（checkFairUseV2。削除禁止）
- 従量課金: Stripe Metered Billing（recordTurnUsage→maybeSendUsageRecord）
- DB: user_id(UUID)。指示書のtoken_idはauth.userIdに読み替え
- PLAN_CONFIGがSingle Source of Truth

### ふとしの方針メモ
- 品質最優先。スピードのために品質を犠牲にしない
- GPT-5をProに投入（粗利88%維持、ChatGPT Plus対抗）
- GPT比率を積極的に拡大（アイディア出し・一般会話・クリエイティブ）。Claudeは感情・コーチング核心部に特化
- Geminiは3.x系に更新（Free〜Pro: 3 Flash, Max/Ultra: 3.1 Pro Preview）。Previewステータスに注意
- 旧KVフェアユースはv6.3で完全削除済み（I/O半減）
- このチャット(Claude.ai)は経営者+アドバイザーの場。実務は全てCode
- **デザイン照合は双方向必須。** 正方向（mockup→実装）だけでは、後から追加した要素・JS動的生成要素を検出できない。逆方向（実装→mockup）+視覚検証を必ず行う（C14-B, C16）
- **チェックリスト検証の一括PASS禁止（C20）。** 各項目に個別のタイムスタンプ＋スクショパスがなければ✅無効。「実装したので全PASS」は禁止。verify.sh/canopyで未検証項目をブロック
- **mockup HTMLは原本。手書き再構成禁止。** localhostで元ファイルを配信してブラウザレンダリングする。コードを読んで推測して描くのは不正確（要素順序入替・SVG省略・CSS省略が発生する）。Claude.ai側はA8、Code側はC16で規定
- **UI変更フロー（A9）:** 新規=Claude.aiがビジュアライザーでデザイン案→ふとし承認→Codeがmockup HTML化+実装。変更=Codeが差分調査レポート→Claude.aiが推奨判断付きで提示→ふとし判断→Codeがmockup更新→**C16 Stage 0: mockup更新前後の比較画像をふとしに提示→ふとし承認→実装修正→Stage A（localhost比較）→デプロイ→Stage B（本番比較）。** mockup承認なしに実装に着手しない。Claude.aiはHTML編集しない（鉄則2・7）。ファイル書き込みはふとし承諾後（鉄則追加）
- **「忘れた」「間違えた」「見落とした」等の人間的ミス表現は禁止。** AIにうっかりは存在しない。エラー発生時は構造的原因（ルール不在/検証不在/参照フロー欠如/コンテキスト制約/指示の曖昧さ）を特定し、機械的ゲートの改善を提案する。Code側はC19、Claude.ai側は鉄則8の拡張で適用
- **コンテキスト残量が推定20%未満になったら、ふとしに通知する。** 「コンテキスト残量が少なくなっています。新しいチャットへの移行を推奨します」と伝え、未完了の作業があればリストアップする

### 契約変更ルール
- 契約セクションの編集権限はClaude.ai（Desktop Commander経由）のみ
- Codeによる契約セクションの変更は絶対禁止
- 変更時はClaude.aiがsession_progress.mdにも記録する

### 役割分担と設計権限
- Claude.ai: 仕様（何を作るか）+ 方針（なぜそう作るか）+ コスト/プラン影響のある設計判断
- Code: アーキテクチャ設計 + 実装設計 + 手順ルール管理（development_rules.md C2,C5,C7,C10）
- 仕様変更（禁止）= ユーザーから見える挙動が変わること
- 設計変更（自由）= 内部構造・実装方法の選択。判断根拠を記録
- **制約:** コスト構造またはプラン間の差別化に影響するアーキテクチャ変更は、提案ログに記載して承認を待つ
- バグ対応フロー: development_rules.md C11参照

### verify.sh 最低基準
- 新規関数: 全てgrep存在確認
- 既存保全: canopy.shの全項目（累積。削除禁止）
- PLAN_CONFIG数値: 契約セクションの値と一致すること
- 旧コード残存: 削除対象が残っていないこと

### 承認ルール
- 🟢低リスク: バッチ承認可（複数ステップまとめて実行→まとめて報告）
- 🟡中リスク: 3件まで連続実行可（まとめて報告→承認）
- 🔴高リスク: ふとしの個別承認必須（実行前に停止して報告）
- 🟠デザイン: UI変更はふとしのビジュアルチェック合格済みmockupが必須（C18）。Codeの提案ログでUI変更ありの場合、承認されても自律実装しない→Claude.aiチャット経由でmockup作成→ふとしOK→キュー

---

## 鉄則（常に意識する8つだけ。詳細はdevelopment_rules.md）

1. **仕様変更禁止。** 契約セクション参照。設計判断は自由、根拠を記録
2. **C2基準フロー厳守:** 実装→**E2E(該当セクション)**→bump-version→build→canopy→デプロイ→ヘルスチェック→git tag→push。省略・順序変更禁止。**frontend/ or src/ の変更が1行でもあればE2E必須。** テスト省略はdocs/, instructions/, *.md のみの変更に限定
3. **verify.shを自分で作り自分で実行。** canopyに新項目を累積追加（削除禁止）
4. **判断根拠・結果・提案をsession_progress.mdに記録。** レポート規約に従う
5. **ミッション遂行に必要なバグ修正はOK（記録必須）。無関係なバグは報告のみ**
6. **デザイン変更時はdocs/goal_ai_design_spec_v3.mdを必ず参照。** spec未記載のUI変更は仕様変更扱い
7. **mockup HTMLはデザインの唯一の正（原本）。改変・再構成・要約を禁止し、元ファイルをブラウザでそのままレンダリングする。** UI照合はspec_v3.md+mockup CSSの両方に合致すること。デザイン検証はlocalhostでmockup配信→ブラウザで実装と横並び比較→スクショ撮影（C16手順）。実装にあってmockupにない要素も報告（C14-B）。Claude.aiもCodeも手書き再構成禁止（A8）
8. **「忘れた」「間違えた」「見落とした」禁止。** エラー時は構造的原因を特定する（C19）。「一致」「完了」「問題なし」の判定には検証方法と結果を明記。未検証を「確認済み」と書かない

---

## ミッションキュー運用
- Claude.aiがDC経由でsession_progress.mdのキューに直接追記する
- **書き込み分担:** キューセクション=Claude.ai専用、完了済み/変更履歴セクション=Code専用（同時編集コンフリクト防止）
- Codeはステップ完了後、session_progress.mdのキューを再読してから次に進む
- **各ミッション完了後、次のミッションに着手する前にsession_progress.mdを必ず再読する**（セッション中にキューが更新されている可能性があるため）
- キュー消化時は完了記録を書く
- ふとしのコピペは不要

### キュー空時の自律フロー
ミッションキューが空になった場合、Codeは以下を自律実行する:
1. project_v6_4.md §8 TODO + reference_v2.md の未実装バックログを読む
2. docs/goal_ai_design_spec_v3.md + docs/design_amendment_001.md の仕様を読み、現在のコードに未実装の項目がないか検出する
3. 現在のコードベースをgrepで確認し、実際に未実装のものを特定する
4. session_progress.mdの「提案ログ」セクションに候補リストを記載する（実装はしない）
5. ふとしに「キューが空になりました。提案ログに次の候補を記載しました」と報告して停止する
6. ふとし（またはClaude.ai経由）が承認した項目だけがキューに移動される

---

## 実行チェーン

### KICKOFF-001 ✅ 全完了
Step 0〜8c + UX-001〜003

### テスト配布前ミッション（進行中）
session_progress.md のミッションキュー参照

---

## 参照ドキュメント（リポジトリ内）
- 仕様: docs/goal_ai_project_v6_4.md / docs/goal_ai_reference_v2.md
- デザイン全画面仕様（What）: docs/goal_ai_design_spec_v3.md + docs/design_review_changelog_v3.md + docs/design_amendment_001.md
- **デザインモックアップHTML（CSS詳細リファレンス）: docs/mockups/** — 全21画面の承認済みHTML。UI実装時に必ず該当画面を開いてCSS値・レイアウト・色・アイコンを照合すること
- 旧版仕様（補助参照）: docs/mockups/goal_ai_design_spec_v2.md / design_review_changelog.md / session_handoff_v8.md
- デザイン実装手順（How）: instructions/design_impl_001.md（※spec_v3の一部をCode向け手順に変換したもの。specが上流・正）
- Stripe: instructions/stripe_005_frontend.md / stripe_amendment_001.md / stripe_amendment_002.md
- ルール: development_rules.md（索引）+ docs/rules/（詳細: g2_ui_verification/g4_testing/g5_reporting/mission_status）

---

## Compact Instructions
auto-compact発動時に以下を必ず保持:
1. session_progress.mdの5行サマリー全文
2. 現在実行中のミッションIDと完了コマンド
3. テスト実行中の場合: 最後に記録した中間結果（PASS/FAIL/SKIP数とFAILしたテストID）
4. 未解決のエラーメッセージ（直近3件）
5. 直前のgit diff --stat出力

---

## ファイル構成（v3.10.0）
src/: index.js, routes/(chat,checkout,plan,deep,goals,history,memo,misc,referral,tester,token,voice,admin), services/ai/(gpt,gemini,routing,claude), services/(embedding,history,memo,profile,prompt), utils/(constants,helpers,rate-limit,streak,supabase)
frontend/js/: globals,api,chat,goals,profile,ui,app,location,main
docs/: goal_ai_project_v6_4.md, goal_ai_reference_v2.md, goal_ai_design_spec_v3.md, design_review_changelog_v3.md, design_amendment_001.md, design_system.md, mockups/(21画面HTML+旧版仕様)

---

## Design Context（全UI変更時に参照必須）
- **Brand:** Night Sky Journal — 月明かりの下で静かにジャーナルを書いている感覚
- **Audience:** 20-40代、自分の人生を整理したい人
- **Tone:** 静かな安心感。深呼吸したくなる
- **Reference:** Apple Reminders dark mode + GitHub Dark
- **Color:** `docs/design_system.md` のCSSトークンのみ使用。テーマ4種（Night Sky / Dawn / Harajuku Light / Harajuku Dark）
- **Layout:** Vertical journal（縦ライン+ドット進行）、Open air（余白で区切る。カードで囲まない）
- **Tab:** Pill active（Active=pill+icon+label、非Active=icon only）
- **Font:** system-ui のみ。Inter/Roboto/Arial 禁止
- **Animation:** spring-based のみ。ease-in-out 禁止
- **Anti-patterns:** `docs/design_system.md` のNGリスト全項目を遵守
- **テーマ実装:** CSS custom properties でテーマ切替。root変数差し替え方式

---

## 【絶対禁止】
- ルーティング廃止 / プラン構成変更 / テーブル削除 / API削除 / 実装スキップ / 契約変更(署名なし) / canopy項目削除
- **UI変更をgrep確認だけで「完了」にすること** — 関数が存在してもレンダリングパスで実際に呼ばれていなければ意味がない。UI変更は必ずHTMLの実際の出力パスを追跡して検証する
- **design_spec_v3.mdの仕様と矛盾するUI実装** — specが正。矛盾を発見したら提案ログに記録して停止
- **`⛔ BLOCKED` がキュー先頭にある場合の実装実行** — Claude.aiが設計変更をドキュメントに反映中。ふとしに「BLOCKED状態です。Claude.aiの書き込み完了を待ってください」と報告して即停止する
