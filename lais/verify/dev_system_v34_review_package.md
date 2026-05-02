# dev-system v3.3 → v3.4 改訂レビューパッケージ

> 作成: 2026-04-17（G_41。G_40消失分を全再読型で再作成）
> 前提: dev-system関連8ファイル計3,646行をADVが全再読。22点抜けはG_40で既発見・3AI合議全採用済み（PD-008準拠）
> 責務: 22点抜けに対する改訂案全文 + レビュープロトコル + CUMULATIVE_CONTEXT
> レビューフロー: sub_review_flow.md §4.C（dev-system仕様レビュー）+ §3.1（主審制あり）
> PO承認: 2026-04-17 G_40時点で「改訂方針」は合議全採用（エスカレーション不要）。本パッケージは「全文の妥当性」をレビュー対象とする

---

## §0. パッケージの目的と前提

### 0.1 発端

Lais M5 実装完了後、Cloudflare Pagesへデプロイ → 発行URL（https://lais-3yk.pages.dev/）で実機テスト → メールサインイン後にダッシュボードへ遷移せず、サインイン画面をループする事象が発生。

M5ミッションの完了報告ではCRITICAL 0達成（curl /,/talk,/me 全HTTP 200、スクショ3枚保存済み）。しかし実機の認証フローは破綻していた。

PO（ふとし）の指摘:
> 「Laisの仕様書ってAIが実行可能な行動の全集合じゃない？書いてないと、AIが実行しないよね」

この指摘を起点にdev-system全仕様を総点検した結果、22点の抜けが発見された。

### 0.2 G_40で実施済みの判断

G_40セッションで以下を完了:

1. **dev-system関連6ファイル計3,646行を完読**
   - dev_system_spec.md 1,422行
   - sub_infrastructure.md 901行
   - sub_testing.md 236行
   - sub_adv_protocol.md 194行
   - sub_system_map.md 155行（※テンプレート。レビュー対象外）
   - sub_review_flow.md 391行
   - CLAUDE.md 221行
   - development_rules.md 126行

2. **22点の抜けを7カテゴリに整理**（§2で詳述）

3. **3AI合議（ADV/QA/PO代理）で全採用確定**
   - 優先順位: F（鉄則呼称）→ A（動作検証）→ C（PO判定待ち）→ D（完了条件）→ B（境界）→ E（環境変数）→ G（その他）
   - エスカレーション不要（既存ルールの改訂であり、新規プロセス導入ではない）
   - PD-002（既決定は覆さない）準拠: project/ux/design仕様には一切触れない。dev-system仕様のみの改訂

4. **7つの改訂案の方針を確定**（§3で詳述）

### 0.3 本レビューのスコープ

| 観点 | IN | OUT |
|------|-----|-----|
| 改訂案の**全文の妥当性** | ✅ | — |
| 改訂方針そのものの再議論 | — | ✅ G_40で合議済み |
| 22点抜けの追加発見 | ✅ | — |
| アプリ仕様（lais_project/ux/design_spec等）への影響 | — | ✅ スコープ外 |
| 既存ルールとの矛盾検出 | ✅ | — |
| 連鎖更新ファイルの整合性 | ✅ | — |

**重要:** 改訂案を再議論するのではなく、「全文が正しく書けているか」「既存ルールと矛盾しないか」「連鎖更新が完全か」を検証する。

### 0.4 再発防止（G_40でのパッケージ消失事案）

G_40セッションで本パッケージ初版787行を作成したが、セッション終了時に書き込み完了の確認を怠り、ディスク上に保存されていなかった（git履歴にも残らず）。G_41で全再作成。

**再発防止策（本改訂案に含める候補）:**
- ADVが大ファイル（200行超）を書き込んだ際、直後に `get_file_info` で行数を確認し、完了報告に明記する
- session_historyに「作成ファイル名 + 行数」を必須記載とする
- 改訂案②（§8 拡張）に関連するため、本パッケージでは §3.2 に言及のみ

---

## §1. 対象ファイル一覧と現行版情報

### 1.1 改訂対象（9ファイル）

| # | ファイル | 現行行数 | 現行バージョン | 改訂内容 |
|---|---------|---------|-------------|---------|
| 1 | docs/plans/dev_system_spec.md | 1,422 | v3.3 | 改訂案①②③④⑤⑦ 全て関連 |
| 2 | docs/plans/sub_infrastructure.md | 901 | v3.0 | 改訂案⑤（init_app.sh --subdir） |
| 3 | docs/plans/sub_testing.md | 236 | v3.0 | 改訂案④（完了コマンド3区分の1つ「統合E2E」定義） |
| 4 | docs/plans/sub_adv_protocol.md | 194 | v3.0 | 改訂案①（鉄則呼称の整合）+ ⑦（auto-compact） |
| 5 | docs/plans/sub_review_flow.md | 391 | v3（CONFIRMED） | 改訂案⑥（§4.H 統合フローレビュー） |
| 6 | docs/plans/sub_system_map.md | 155 | v3.0 | 改訂なし（テンプレート。アプリ固有扱い） |
| 7a | CLAUDE.md（契約セクション外） | 221 | — | 改訂案①（鉄則セクション削除 + 起動時Read指示追加）+ ⑦（Compact/絶対禁止を参照に縮退）。**実行者: Code** |
| 7b | CLAUDE.md（契約セクション内） | — | — | 改訂案⑦（ふとしの方針メモから共通知見2項目を削除）。**実行者: Claude.ai（ADV）経由必須** |
| 8 | development_rules.md | 126 | v3 | 改訂案①（G1-G10ゲート呼称の整合）+ ④（完了コマンド3区分） |
| 9 | templates/mission_template_v2.md | — | v2 | 改訂案④で v3 化（完了コマンド3区分必須） |

### 1.2 レビュアーへの送信資料

| 資料 | 用途 |
|------|------|
| 本パッケージ（dev_system_v34_review_package.md） | 改訂案全文。レビュー対象 |
| 現行 dev_system_spec.md v3.3 | 改訂前のベースライン |
| 現行 sub_infrastructure.md / sub_testing.md / sub_adv_protocol.md / sub_review_flow.md | 連鎖更新の整合性検証用 |
| 現行 CLAUDE.md / development_rules.md | 連鎖更新の整合性検証用 |

sub_system_map.md は §1.2 の棲み分け原則に従いアプリ固有テンプレートのため、dev-systemレビューには含めない。

### 1.3 バージョニング

本改訂により dev_system_spec は **v3.3 → v3.4** にインクリメント。
- MAJOR=3: 構造的設計変更（canopy体系・3層構造・変更フロー6ステップ）
- MINOR=4: 仕様拡張（今回の22点抜け修正）
- PATCH=0: バグ修正なし

sub_*.md はそれぞれv3.0 → v3.1 にインクリメント（改訂対象のみ）。

---

## §2. 22点抜けの全量

G_40で発見された22点をカテゴリA〜Gに整理。各項目について「現状ギャップ」「発見経緯」「改訂案との対応」を記載。

### カテゴリA（動作検証の抜け）— 3点

**A1: 本番実機検証の必須化が未定義**
- 現状: §8 C2デプロイフローは「curl -s $URL | grep version」で疎通確認するが、**ユーザー操作の実機検証**は定義されていない
- ギャップ: Lais M5のように「curl は 200 を返すが実機でログインループ」という状況を検知できない
- 改訂対応: 改訂案② §8拡張（ステップ12: 実機E2Eスモーク追加）

**A2: 画面遷移フローの完了条件が未定義**
- 現状: ミッション定義テンプレv3（§5）では「ATで操作→期待→検証」を書くが、**画面A→画面B→データ永続化→画面Cへ戻る**という複数画面をまたぐフローの完了条件が曖昧
- ギャップ: 認証フロー（サインイン→ダッシュボード→リロード後も認証維持）のような横断的挙動がATに分解されないまま完了扱いになる
- 改訂対応: 改訂案④ 完了コマンド3区分（統合E2E）+ 改訂案② §7 L1再定義（認証含む5操作明記）

**A3: 3層テストL1スモークの具体定義が曖昧**
- 現状: §7「基本5操作（起動/機能A/機能B/AI送受信/データ永続化）」と記載されているが、**認証がL1に含まれるかが明記されていない**
- ギャップ: Lais M5で認証L1が実行されずにデプロイ完了
- 改訂対応: 改訂案② §7 L1再定義（認証含む5操作を明記）

### カテゴリB（プロジェクト境界の抜け）— 3点

**B1: サブディレクトリでの新規構築手順が未定義**
- 現状: §10.4 / sub_infrastructure §1.2 は「アプリ＝リポジトリルート」を前提。LaisのようにGoal AIリポジトリ内のサブディレクトリ（`lais/`）で新規構築する手順がない
- ギャップ: init_app.sh が APP_DIR を受け取る設計にはなっているが、親リポジトリとの共存（`.gitignore` の統合、canopy パスの解決、dev-system VERSION pin の配置）の定義が不足
- 改訂対応: 改訂案⑤ §10.4拡張 + init_app.sh --subdir オプション

**B2: hooks/scriptsのカレントディレクトリ（cwd）が未定義**
- 現状: deploy.sh は `cd "$APP_DIR"` するが、Lais のサブディレクトリ構成では `APP_DIR=lais/` を指定したときに親の `.git/hooks/pre-commit` が発火するかが不明瞭
- ギャップ: pre-commit hook が子ディレクトリの変更でも親の hooks から発火する仕様だが、Lais の環境変数・G10検出パターンが親側で検証されるか未定義
- 改訂対応: 改訂案⑤ サブディレクトリ対応に統合

**B3: 品質ゲート発火のトリガー確認が未定義**
- 現状: canopy_common.sh は「呼び出されたときに」実行されるが、**どのタイミングで呼び出されるか（pre-commit / pre-push / CI / 手動）が自動検証されない**
- ギャップ: Lais で pre-commit hook が設置されていたかを確認する仕組みがなく、G10（シークレットスキャン）が実際には発火していなかった可能性がある
- 改訂対応: 改訂案② §8ステップ10（環境変数反映確認）+ ⑤ sub-dir時のhooks配置確認

### カテゴリC（PO判定待ち項目の扱い）— 3点

**C1: 提案ログの推奨対応タイミングが未定義**
- 現状: §15.3 棚卸しに「提案ログに未処理の項目がないか」はあるが、**提案ログ単体での「いつ処理するか」のステータス管理がない**
- ギャップ: PO判定待ち項目がキューに入らず、棚卸し（5セッションごと）まで見落とされる
- 改訂対応: 改訂案③ §1.5 新設（SUGGESTED / WAITING_PO / APPROVED ステータス導入）

**C2: 棚卸し滞留チェックの自動化が未定義**
- 現状: §15.3 棚卸しは5セッションごと。しかし「提案ログに3セッション以上WAITING_POで滞留している項目がある」というチェックが未定義
- ギャップ: PO判定待ちが無限に積み上がる
- 改訂対応: 改訂案③ §15.3 項目10追加（滞留チェック）

**C3: ステータス区別（SUGGESTED vs WAITING_PO vs APPROVED）が未導入**
- 現状: 提案ログは平文で「提案」として並んでいるだけ
- ギャップ: 「ADVが提案中」「POへ判定依頼中」「承認済みキュー待ち」の区別がつかない
- 改訂対応: 改訂案③ §1.5 新設

### カテゴリD（完了条件の粒度）— 3点

**D1: 画面実装ミッションの完了コマンド粒度が不統一**
- 現状: §5 ミッション定義テンプレv3 は「cmd1: npx playwright test --project=mobile」を1つ書けば通る
- ギャップ: 画面実装なのにユニットテストなし、統合E2Eなし、実機検証なしでもDONE扱いになる
- 改訂対応: 改訂案④ 完了コマンド3区分必須（ユニット / 統合E2E / 実機検証）

**D2: 認証関連ミッションの完了コマンドが画面実装と同じ扱い**
- 現状: 認証フローは複数画面+Supabase連携+リダイレクトをまたぐが、画面実装ミッションと区別されない
- ギャップ: M5のように「curlが200」だけで完了扱いになる
- 改訂対応: 改訂案④ 完了コマンド3区分の「実機検証」に認証フロー明記

**D3: デプロイ系ミッションの完了コマンドが疎通確認のみ**
- 現状: §8 deploy.sh は HTTP 200 のみ検証
- ギャップ: デプロイ完了＝機能正常ではない。リダイレクトURL設定・環境変数反映・外部API連携確認が未定義
- 改訂対応: 改訂案② §8拡張（ステップ10-12）

### カテゴリE（環境変数・外部設定）— 3点

**E1: 環境変数反映の完了条件が未定義**
- 現状: `.env` / `.dev.vars` の管理ルール（§20）はあるが、**「デプロイ先に環境変数が実際に設定されたか」を検証する仕組みがない**
- ギャップ: Cloudflare Pages の VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY が未設定でもデプロイ成功する
- 改訂対応: 改訂案② §8ステップ10（環境変数反映確認）

**E2: 外部サービス連携設定の完了条件が未定義**
- 現状: Supabase Auth Allowed Redirect URLs / Stripe Webhook / OAuth Callback URL などの外部サービス側設定は「PO が手動で設定」とされるが、**設定済みかの検証が未定義**
- ギャップ: redirect URL 未追加でログインループ発生
- 改訂対応: 改訂案② §8ステップ11（外部サービス連携確認）

**E3: 必須環境変数の存在チェックが canopy にない**
- 現状: canopy_common.sh は app_config.yaml の version 同期・ルーティング比率は検証するが、**環境変数そのものの有無は検証しない**
- ギャップ: `.env.example` と実際の `.env` の差分が放置される
- 改訂対応: 改訂案② §8ステップ10に統合（canopy拡張）

### カテゴリF（鉄則の呼称と配置）— 5点

**F1: 鉄則の呼称が dev-system と CLAUDE.md で食い違う**
- 現状: dev_system_spec §3 では「鉄則15個」、CLAUDE.md では「鉄則11個」。番号付けも異なる（CLAUDE.md #9 がdev-system #9 と同じ内容だが、CLAUDE.md #10 が重複番号になっている）
- ギャップ: ENGがどちらを参照すべきか不明。development_rules.md は「索引」とされるが鉄則への参照がない
- 改訂対応: 改訂案① §3全面改訂（鉄則→共通行動、3層別整理）

**F2: 鉄則15個は多すぎて覚えられない**
- 現状: 鉄則①〜⑮が並列に並び、意味上のグルーピングがない
- ギャップ: セッションごとに全15個を意識するのは非現実的。実効性が低い
- 改訂対応: 改訂案① グルーピング（品質維持 / 実装委任 / 方針整合性 / 動作検証 / セキュリティ の5群）

**F3: 3層（PO / ADV / ENG）向けの鉄則が混在**
- 現状: 鉄則①「品質維持最優先」はPO向け、②「実装はENGに全委任」はADV向け、⑨「UI検証はスクショ」はENG向け、と層をまたいで混在
- ギャップ: 層ごとの責務が見えにくい
- 改訂対応: 改訂案① 3層別整理（PO鉄則 / ADV鉄則 / ENG鉄則 のセクション分け）

**F4: 曖昧用語禁止リスト（12語）が鉄則と別セクション**
- 現状: §3「鉄則一覧」の末尾に曖昧用語12語が追加される形。鉄則との関係が不明瞭
- ギャップ: 鉄則⑨「UI検証はスクショ画像判定」と12語禁止が分離され、両方を参照する必要がある
- 改訂対応: 改訂案① §3の「動作検証」グループに統合

**F5: CLAUDE.md の鉄則 #10 が重複番号**
- 現状: CLAUDE.md §鉄則の #10 が2つある（「デバイス依存の挙動について〜」が2回記載）
- ギャップ: 編集時のミスが放置されている。鉄則番号での参照が壊れる
- 改訂対応: 改訂案① CLAUDE.md の鉄則をdev-system §3と整合させ、重複除去

### カテゴリG（その他）— 3点

**G1: CLAUDE.md 独自の行動ルールが dev-system と二重管理**
- 現状: CLAUDE.md「契約セクション」の「ふとしの方針メモ」に「デザイン照合は双方向必須」「チェックリスト検証の一括PASS禁止」等のルールが記載されるが、dev_system_spec § には反映されていない
- ギャップ: CLAUDE.md が「アプリ固有」なのか「全プロジェクト共通」なのか曖昧。次プロジェクトで持ち越されない
- 改訂対応: 改訂案⑦ 分散追記（§4.7.1 双方向デザイン照合を dev-system に昇格）

**G2: auto-compact 発動時の引継ぎルールが CLAUDE.md にのみ存在**
- 現状: CLAUDE.md「Compact Instructions」に「auto-compact発動時に保持すべき5項目」が記載されるが、dev-system仕様にはない
- ギャップ: 次プロジェクトで同じ仕組みが再構築されない。CLAUDE.md を刷新するとルール自体が失われる
- 改訂対応: 改訂案⑦ §16.8 新設（auto-compact引継ぎルールをdev-systemに昇格）

**G3: 再デプロイ（PaaS側の Env/Redirect URL 変更時）の知識が未定義**
- 現状: §8 deploy.sh は git push + wrangler deploy で完結する前提。Cloudflare Pages の環境変数やSupabase の Redirect URLs を PaaS ダッシュボードで変更した後、**自動で再ビルド・再デプロイが走るわけではない** という知識が仕様書にない
- ギャップ: ENGが「環境変数を PaaS ダッシュボードで更新した→自動反映される」と誤認し、反映されないまま完了報告
- 改訂対応: 改訂案⑦ §8.1 新設（PaaS再デプロイ手順）

### 合計22点

| カテゴリ | 件数 | 優先順位 |
|---------|------|---------|
| F（鉄則の呼称と配置） | 5 | 1（最優先。他の改訂案の前提となる） |
| A（動作検証の抜け） | 3 | 2 |
| C（PO判定待ち項目の扱い） | 3 | 3 |
| D（完了条件の粒度） | 3 | 4 |
| B（プロジェクト境界の抜け） | 3 | 5 |
| E（環境変数・外部設定） | 3 | 6 |
| G（その他） | 3 | 7 |
| **合計** | **22** | — |

---

## §3. 改訂案全文（①〜⑦）

（次チャンクで展開）

---

## §4. 連鎖更新対象ファイルのチェックリスト

改訂案ごとに「どのファイルのどの§に何を書くか」を整理。本レビューでは連鎖更新の完全性もレビュー対象とする。

### 4.1 改訂案①（鉄則全面改訂）の連鎖更新

| ファイル | 更新箇所 | 内容 |
|---------|---------|------|
| dev_system_spec.md | §3 全面改訂 | 鉄則15個→5グループ構造（品質維持 / 実装委任 / 方針整合性 / 動作検証 / セキュリティ）。3層別に整理 |
| dev_system_spec.md | §16.5（絶対禁止） | §3との参照関係を整理。重複除去 |
| sub_adv_protocol.md | §8（禁止事項） | 「正本: dev_system_spec.md §16.5」の参照先を§3と§16.5の2箇所に拡張 |
| CLAUDE.md | 鉄則セクション | dev-system §3 と整合。重複番号 #10 を解消。11個→15個に拡張（またはdev-system参照に一本化） |
| development_rules.md | 冒頭の「索引」 | §3鉄則への参照を追加 |
| templates/CLAUDE_TEMPLATE.md | 鉄則セクション | dev-system §3参照に統一 |

### 4.2 改訂案②（§8 C2デプロイ拡張 + §7 L1再定義）の連鎖更新

| ファイル | 更新箇所 | 内容 |
|---------|---------|------|
| dev_system_spec.md | §7（3層テスト戦略） | L1スモーク5操作に「認証」を明記。5操作: 起動 / 認証 / 主機能A / AI送受信 / データ永続化 |
| dev_system_spec.md | §8（C2デプロイフロー） | ステップ10-12を追加（環境変数反映確認 / 外部サービス連携確認 / 実機E2Eスモーク） |
| sub_infrastructure.md | §2.8 deploy.sh | ステップ10-12に対応するコマンド追加 |
| sub_infrastructure.md | §2.6 canopy_common.sh | 環境変数存在チェック追加（新セクション） |

### 4.3 改訂案③（提案ログ発火フロー §1.5 新設）の連鎖更新

| ファイル | 更新箇所 | 内容 |
|---------|---------|------|
| dev_system_spec.md | §1.5 新設 | 提案ログステータス管理（SUGGESTED / WAITING_PO / APPROVED） |
| dev_system_spec.md | §15.3（棚卸し） | 項目10追加: WAITING_PO滞留3セッション超の警告 |
| sub_adv_protocol.md | §2（トリガー対応表） | 提案ログ追記時のステータス指定ルール追加 |

### 4.4 改訂案④（ミッション定義テンプレv3→v4）の連鎖更新

| ファイル | 更新箇所 | 内容 |
|---------|---------|------|
| dev_system_spec.md | §5 ミッション定義テンプレ | v3→v4。完了コマンド3区分必須（ユニット / 統合E2E / 実機検証） |
| templates/mission_template_v2.md | 全面改訂 | v2→v3。v4仕様を反映 |
| sub_testing.md | 新セクション§9 | 「統合E2E」の定義と実装ガイド |
| development_rules.md | G7 仕様↔完了コマンド対応 | 3区分の存在検証に拡張 |

### 4.5 改訂案⑤（サブディレクトリ構築）の連鎖更新

| ファイル | 更新箇所 | 内容 |
|---------|---------|------|
| dev_system_spec.md | §10.4（ディレクトリ構成） | サブディレクトリ構成の追加記述 |
| sub_infrastructure.md | §1.2（アプリ構成） | サブディレクトリパターン追記 |
| sub_infrastructure.md | §2.1 init_app.sh | --subdir オプション追加。親リポジトリとの共存ロジック |
| sub_infrastructure.md | §2.2 update_app.sh | サブディレクトリ対応の更新 |

### 4.6 改訂案⑥（sub_review_flow §4.H 統合フローレビュー）の連鎖更新

| ファイル | 更新箇所 | 内容 |
|---------|---------|------|
| sub_review_flow.md | §4.H 新設 | 統合フローレビュー（integration_tester / end_user / security_auditor 3ペルソナ）|
| sub_review_flow.md | §5（成果物×フロー） | Hフローの追加 |
| dev_system_spec.md | §19.10（AIレビューフロー） | 8種別に拡張（A〜H） |

### 4.7 改訂案⑦（分散追記）の連鎖更新

| ファイル | 更新箇所 | 内容 |
|---------|---------|------|
| dev_system_spec.md | §4.7.1 新設 | 双方向デザイン照合（CLAUDE.mdから昇格） |
| dev_system_spec.md | §8.1 新設 | PaaS再デプロイ手順 |
| dev_system_spec.md | §16.8 新設 | auto-compact引継ぎルール |
| CLAUDE.md（契約セクション外） | 鉄則削除 + Compact/絶対禁止縮退 | dev-system参照に変更。**実行者: Code** |
| CLAUDE.md（契約セクション内） | ふとしの方針メモ2項目削除 | 共通知見を§4.7.1/§16.8に昇格後、CLAUDE.mdから削除。**実行者: Claude.ai（ADV）経由必須。Code変更禁止（§16.5項目2）** |

### 4.8 連鎖更新完全性の検証方法

改訂完了後、以下を検証:

1. 各改訂案の更新範囲が§4の表と完全一致する
2. 各ファイルで「正本」と「参照」の関係が明確
3. 重複記述がない（同じ内容が2箇所以上に書かれていない）
4. 相互参照が切れていない（§X 参照 → 実際に §X が存在する）

---

## §5. CUMULATIVE_CONTEXT（レビュー再指摘防止）

レビュアーに送るプロンプトに必ず含める文脈。Filter 3（既決定チェック）で参照される。

### 5.1 PO決定済みリスト

本改訂案はG_40で以下がPO承認済み。これらを再議論・再指摘することは Filter 3 で棄却される。

| # | 決定事項 | 承認日 | 根拠 |
|---|---------|--------|------|
| 1 | 22点抜けの発見は3AI合議で全採用 | 2026-04-17 G_40 | ADV/QA/PO代理の3者合意 |
| 2 | 改訂優先順位 F→A→C→D→B→E→G | 2026-04-17 G_40 | 影響度ベース |
| 3 | 改訂案①〜⑦の方針確定 | 2026-04-17 G_40 | §3各案のタイトルレベル |
| 4 | dev_system_spec のバージョン v3.3 → v3.4 | 2026-04-17 G_40 | MINOR バンプ |
| 5 | エスカレーション不要（既存ルール改訂） | 2026-04-17 G_40 | PD-007準拠 |
| 6 | project/ux/design仕様には一切触れない | 2026-04-17 G_40 | PD-002準拠 |
| 7 | sub_system_map.md はレビュー対象外 | 2026-04-11（既存） | §1.2棲み分け原則 |

### 5.2 過去レビューで収束済みの論点（再指摘禁止）

dev-system v3.0〜v3.3の過去レビューで既に議論・収束済みの論点。再指摘は棄却。

- **canopy項目の削除可否** → 追加は可、削除はPO承認必須（§16.5）
- **ホットフィックスパスの条件** → mockup変更なし + 対象2ファイル以内 + 仕様変更なし（§6, §16.3）
- **修正試行3回制限** → 同一バグ3回失敗→HOLD→ADVエスカレーション（§9.2, §16.1）
- **session_progress.md 300行制限** → 超過時session_archiver.shでアーカイブ（§16.2）
- **2プロバイダー + Code Pre-Review** → Claude系は使わない（§13.13プロバイダー分離）
- **レビューモデル使い分け** → ゴールデン=GPT-5.4 / 修正=GPT-5（§13.15.6）
- **LP蓄積ルール** → 2ミッション以上再出現。予防適用成功もカウント（§13.16.2）
- **3ペルソナ制（ADV/QA/PO代理）** → ENG自律判定の合議フロー（§13.17）

### 5.3 既知の矛盾（レビュー対象外）

現時点で認識されている矛盾。改訂で解消されるため、レビューでCRITICAL指摘しない。

1. dev-system鉄則15個 vs CLAUDE.md鉄則11個 → 改訂案①で解消予定
2. CLAUDE.md鉄則 #10 の重複番号 → 改訂案①で解消予定
3. §8 C2デプロイの実機検証欠如 → 改訂案②で解消予定

これらは本改訂の**目的**であり、改訂案③〜⑦の妥当性レビューではCRITICAL扱いしない。

### 5.4 スコープOUT（指摘しない）

- アプリ側の仕様変更（lais_project_v1.md / lais_ux_v1.md / lais_design_spec_v1.md 等）
- 新規ルール・新規プロセスの追加提案（PD-007準拠。既存ルール改訂の範囲外は却下）
- ブランド・UXコンセプト（PD-003準拠）
- スタイル・好みの議論（sub_review_flow §1.5.1 LOW定義に該当）

---

## §6. レビュープロトコル

sub_review_flow.md §4.C（dev-system仕様レビュー）+ §3.1（主審制あり）に完全準拠。

### 6.1 ペルソナ構成

| ペルソナ | 役割 | 主審 |
|---------|------|------|
| devops_engineer | CI/CD・ゲート整合性・自動化可能性 | ✅ |
| solo_dev | ソロ開発者視点・運用負荷・現実的か | ✅ |
| qa_lead | テスト戦略・品質ゲート網羅性・anti-pattern | — |
| tech_writer | ドキュメント明確性・曖昧表現・矛盾 | — |
| ai_ops | AIレビュー基盤・プロンプト設計・コスト効率 | — |

### 6.2 実行フロー

```
Phase 1: Code Pre-Review（主審2名。コスト¥0）
  devops_engineer + solo_dev が Code 自身で順次実行
  CRITICAL > 0 → Code が自律修正 → Pre-Review再実行（上限3回）
  CRITICAL 0 → Phase 2 へ

Phase 2: R1外部API初回フル（全5ペルソナ × 2モデル = 10本）
  モデル: GPT-5.4 + Gemini 3.1 Pro
  Filter 1-7 を必ず適用
  CUMULATIVE_CONTEXT（§5）を全プロンプトに含める
  CRITICAL > 0 → Phase 3 / CRITICAL 0 → Phase 4 へ

Phase 3: R2-R4 差分レビュー（主審のみ × 2モデル = 最大4本）
  CRITICALを出したペルソナのみ
  差分（修正箇所）+ 前後200行のコンテキスト
  上限4ラウンド → 超過はPOエスカレーション

Phase 4: ゴールデンレビュー（全5ペルソナ × 2モデル = 10本。全文再送）
  上限2ラウンド
  全10本で CRITICAL 0 → 確定
```

### 6.3 出力ファイル命名規則

```
Pre-Review: lais/verify/dev_system_v34_pre_r{N}_{persona}.json
R1外部API: lais/verify/dev_system_v34_r1_{model}_{persona}.json
R2-R4差分: lais/verify/dev_system_v34_r{N}_{model}_{persona}.json
ゴールデン: lais/verify/dev_system_v34_golden_{model}_{persona}.json
```

### 6.4 FAIL条件

- 主審diffラウンド4回超過 → POエスカレーション
- ゴールデン2回超過でCRITICAL残存 → POエスカレーション
- upstream_issue（既存spec v3.3との矛盾発見）→ 即一時停止 → ADV判断

### 6.5 収束後の処理

1. 改訂案の全文を dev_system_spec.md v3.3 → v3.4 に書き込み
2. 連鎖更新対象9ファイルを一括更新（§4チェックリスト準拠）
3. §5.1 に「本レビュー CRITICAL 0 達成」を追記
4. session_progress.md の完了記録追加
5. session_history.md に G_41 セクション追記
6. 新LP候補を docs/learned-patterns.md に追加検討

---

## §7. severity定義 + 7段階フィルター

sub_review_flow.md §1.5.1 + §2 を全文引用。レビュアーへの指示に必ず含める。

### 7.1 severity定義（厳守）

```
- CRITICAL: 仕様との明確な矛盾 / セキュリティ脆弱性 / データ破壊 / ブランドDNA違反。即修正必須。
- HIGH: 技術的事実として問題があるが、修正方針の判断が必要なもの。「こうした方がいい」はHIGHではない。
- MEDIUM: 機能に影響しない改善余地。動作はする。
- LOW: 好みの問題。修正しないことが正解の場合もある。

HIGHの判定基準（重要）:
- 「推奨」「べき」「方が良い」という表現になる指摘 → MEDIUM以下
- 実際にバグ・破壊・仕様違反が起きている、または高確度で起きる → CRITICAL or HIGH
- 哲学的・スタイル的な議論になる指摘 → LOW
```

### 7.2 7段階フィルター

- **Filter 1: 事実確認** — 改訂案の記述が現行spec/本パッケージに存在するか
- **Filter 2: 仕様照合** — 引用する§番号・行番号が正しいか
- **Filter 3: 既決定チェック** — §5.1〜5.3 の PO決定済み / 収束済み / 既知矛盾 に該当しないか
- **Filter 4: スコープ判定** — §5.4 スコープOUT に該当しないか
- **Filter 5: 再現性（合意度）** — 3+モデル/ペルソナ=高、2=中、1=低（severity1段階ダウン）
- **Filter 6: 影響度** — 致命的/重大=CRITICAL、中程度=HIGH、軽微=MEDIUM
- **Filter 7: 修正の影響範囲** — 対象ファイル完結 / 関連ファイル波及（Code修正可）/ DS/UX/project仕様変更必要（ADV/POエスカレーション）

### 7.3 severity inflation 対策

sub_review_flow §13.9 準拠。同一テーマが3R連続出現 → 棄却検討。

---

## §8. レビュー送信時の添付ファイル一覧

レビュアーに毎回送信する資料:

| # | ファイル | 送信タイミング |
|---|---------|---------------|
| 1 | 本パッケージ（dev_system_v34_review_package.md） | 全ラウンド |
| 2 | 現行 docs/plans/dev_system_spec.md v3.3 | R1 / ゴールデン（差分ラウンドは不要） |
| 3 | 現行 docs/plans/sub_infrastructure.md | R1 / ゴールデン |
| 4 | 現行 docs/plans/sub_testing.md | R1 / ゴールデン |
| 5 | 現行 docs/plans/sub_adv_protocol.md | R1 / ゴールデン |
| 6 | 現行 docs/plans/sub_review_flow.md | R1 / ゴールデン |
| 7 | 現行 CLAUDE.md | R1 / ゴールデン |
| 8 | 現行 development_rules.md | R1 / ゴールデン |
| 9 | docs/po-decisions.md（PD-001〜008＋PD-101〜103） | 全ラウンド（Filter 3の根拠） |

差分ラウンド（R2-R4）は本パッケージ + §5 CUMULATIVE_CONTEXT + 差分記述のみ送信。

---

（§3 改訂案全文は以降のセクションで展開）
---

## §3.1 改訂案①: §3 鉄則廃止 → セッション起動プロトコル + §共通行動規範集 + 全22フローへのStep 0参照

### 3.1.A 改訂の目的

- F1〜F5 の5点抜け（鉄則呼称の不整合、15個は多すぎ、3層混在、曖昧用語分離、#10重複）を解消
- PO指示「フローに書かれたこと以外はAIが実行しない」の実装
- Single Source of Truth 原則の規範領域への適用: **規範本文は §C1-C6 の1箇所のみ**に集約
- 全22フローに「Step 0 参照Read」を追記し、Readチェーンを機械的に発生させる
- 修正漏れ防止: 規範変更時は §C1-C6 のみ修正、フロー側は不変

### 3.1.B 書き込む内容

**新設セクション: §0 本仕様書の利用フロー（冒頭、目次直後）**

```
## §0. 本仕様書の利用フロー

全てのセッションは以下の順で開始する。

Step 0-1: 本ファイル §3 を Read
Step 0-2: §3 に従い、該当層（PO/ADV/ENG）の起動時読み込みファイルを Read
          必須Readに §共通行動規範集 §C1-C6 を含む
Step 0-3: §3.5「フローに書かれたこと以外やらない原則」を確認
Step 0-4: instructions/session_progress.md を Read → キュー先頭のミッション判定
Step 0-5: キュー先頭のミッションタイプに該当するフローの先頭に移動
          （該当フロー一覧: §1.4 / §2 / §4 / §5 / §6 / §7 / §8 / §9 / §9.3 /
          §10 / §13 / §13.15 / §13.17 / §14 / §15.2 / §15.3 / §20
          + sub_adv_protocol §2 / §4 + sub_review_flow §3 / §6 + development_rules G1-G9）

Step 0 を省略したセッションは無効。実行結果は全てDONEにできない。
```

**改訂セクション: §3 セッション起動プロトコル（旧「鉄則一覧」を全面改訂）**

```
## §3. セッション起動プロトコル

### §3.1 PO（ふとし）の起動時Read
- instructions/session_progress.md（5行サマリー + キュー先頭のみ）

### §3.2 ADV（Claude.ai）の起動時Read
1. instructions/session_progress.md 全文
2. bootstrap.md + CLAUDE.md 契約セクション
3. docs/plans/dev_system_spec.md 目次（§番号と見出し）
4. docs/plans/dev_system_spec.md §C1〜§C6 全文
5. docs/plans/sub_adv_protocol.md 全文
6. docs/po-decisions.md 直近10件
7. docs/learned-patterns.md 目次

ADVは起動後、「処理フローに書かれていないタスク」を実行しない。
POから指示を受けた場合、該当する処理フロー（§2 / §5 / §13等）を特定してから
アクションに移る。該当フローがない場合はPOに「どのフローで処理しますか」と確認する。

### §3.3 ENG（Claude Code）の起動時Read
1. CLAUDE.md 全文（契約セクション含む）
2. development_rules.md 全文
3. instructions/session_progress.md 全文
4. docs/plans/dev_system_spec.md §C1〜§C6 全文
5. docs/learned-patterns.md 該当パターン（実装対象に応じて）
6. docs/po-decisions.md 直近5件

ENGは起動後、session_progress.md のキュー先頭のミッション定義に書かれた
完了コマンド以外を実行しない。ミッション定義に不足がある場合、実行せずに
ADVへ報告する。

### §3.4 セッション終了プロトコル
§C4「セッション規約」を参照。

### §3.5 フローに書かれたこと以外やらない原則
本仕様書の全ての処理フロー（§1.4 / §2 / §4 / §5 / §6 / §7 / §8 / §9 / §9.3 /
§10 / §13 / §13.15 / §13.17 / §14 / §15.2 / §15.3 / §20）に記載された手順の
みを実行する。

フローに記載のない判断・行動が必要になった場合:
1. 該当する既存フローを再確認
2. 既存フローで対応不可能と判断した場合、POエスカレーション
3. 新規フローの追加はPO承認後に §2 変更フロー経由で本仕様書に追記

旧「鉄則15個」および「曖昧用語禁止リスト12語」は本改訂で §3 から撤去。
本文は §共通行動規範集（§C1〜§C6）に集約された（§3.6 移行マップ参照）。

### §3.6 旧鉄則→規範集 移行マップ（検証用）

| 旧鉄則# | 旧内容 | 新配置 |
|--------|------|-------|
| ① | 品質維持最優先 | 廃止（§4ゲート体系が品質を強制） |
| ② | 実装はENGに全委任 | §C1 書き込み規約 |
| ③ | 仕様変更時は影響範囲チェック | §C3 連鎖更新規約 |
| ④ | 判断し根拠を示す | §C5 改善ループ規範 |
| ⑤ | 方針整合性自己チェック | §C3 連鎖更新規約 |
| ⑥ | 方針違反→ルール追加 | §C5 改善ループ規範 |
| ⑦ | コードは読まない | §C1 書き込み規約 |
| ⑧ | 事実確認せずに断言禁止 | §C2 動作検証規約 |
| ⑨ | UI検証はスクショ画像判定 | §C2 動作検証規約 |
| ⑩ | ミッション定義セルフチェック | §C2 動作検証規約 |
| ⑪ | 操作フロー確認 | §C2 動作検証規約 |
| ⑫ | セッション終了時未書き込みチェック | §C4 セッション規約 |
| ⑬ | レビュー修正≠仕様変更 | §C5 改善ループ規範 |
| ⑭ | ルールを曲げるな、変えろ | §C5 改善ループ規範 |
| ⑮ | シークレットをコードに書かない | §C6 セキュリティ規範 |
| 曖昧用語12語 | 報告時の禁止リスト | §C2 動作検証規約 |
```


**新設セクション: §共通行動規範集（§C1〜§C6）**

本仕様書における全規範の正本。他のセクション・ファイルは本セクションへの参照のみ。
規範変更時は本セクションを修正すれば全フローに伝播する。

```
## §共通行動規範集（§C1〜§C6）

### §C1 書き込み規約
- ADV/POはコードを書かない・読まない
- ADVの書き込みホワイトリスト: sub_adv_protocol.md §1 を参照
- ENGは対象ファイル外を変更しない
  検証: changed-files-allowlist.sh（sub_infrastructure.md §2.13）

### §C2 動作検証規約
- UI検証はスクショ画像判定のみ
  禁止: DOM API（hasClass/getAttribute/boundingBox）での視覚判定
  実装: §4.1 G9 スクショ証跡規約
- ミッション定義セルフチェック: sub_adv_protocol.md §4 の11項目を参照
- 操作フロー確認: 開始 / 中断・キャンセル / 戻り先 の全てを仕様に定義
- 事実確認せずに断言禁止。未検証は「未検証」と明記
  デバイス依存バグ: §9.3 フローで実機/シミュレーター検証を必須
- 完了報告で使用禁止の曖昧用語12語:
  「確認した」「表示されている」「正常に動作」「問題なし」「対応済み」
  「修正済み」「実装済み」「開いている」「閉じている」「存在する」
  「反映されている」「変化した」
  代替: スクショから読み取れる具体的事実のみ記述
  検証: §4.1 G5 / report_lint.sh（sub_infrastructure.md §2.10）

### §C3 連鎖更新規約
- 仕様変更時は影響範囲チェック→一括更新
  影響範囲の判定: §18 依存関係マップ を参照
- 方針整合性自己チェック: bootstrap + CLAUDE.md + 過去PO決定（po-decisions.md）
  と矛盾しないかを実行前に確認
- 一括更新完了後、更新ファイル一覧を報告

### §C4 セッション規約
- 起動時: §0 Step 0-1〜0-5 を必ず実行
  Step 0 を省略したセッションは無効
- 終了時:
  1. 未書き込みの仕様変更・判断結果・教訓がないか確認
  2. ある場合は該当ファイル（session_progress.md / session_history.md /
     dev_system_spec.md / sub_*.md / learned-patterns.md / po-decisions.md）
     に書き込み
  3. get_file_info で行数確認 → 完了報告に行数明記
  4. 確認後にセッション終了
- 「次回やる」「メモしておく」等の揮発先送り禁止

### §C5 改善ループ規範
- ADVは判断時に根拠を提示（推奨案1つ + 理由）
- 方針違反発生時 → 再発防止ルールを提案ログ追記 → §2 変更フローでリポジトリ反映
- レビュー修正 ≠ 仕様変更
  PO承認済み仕様（テーマ / 画面構成 / プラン / 機能追加削除）はCRITICALでも
  変更しない。提案ログに記載して報告
- フロー違反時の対応:
  「今回だけの例外」禁止。該当フローの改訂提案を §2 で提出 → PO承認後に
  新フローに従う。フローを曲げる = 信頼性崩壊。フローを変える = 一貫性維持

### §C6 セキュリティ規範
- シークレット（APIキー / サービスキー / 秘密鍵）をコード / コミット / ログ /
  コメントに書かない
- 環境変数（.env / .dev.vars）で管理
- 詳細: §20 セキュリティ管理 + G10 機械検証
```

---

## §3. 改訂案全文（①〜⑦）

### 改訂案① 鉄則全面廃止 + §共通行動規範集（§C1-C6）新設 + 全22フローへ Step 0 参照Read追加

**目的:** F1〜F5の5点抜けを解消する。現行「鉄則15個」は並列・層混在・機械検証なしで実効性が低く、CLAUDE.md と内容不一致。Single Source of Truth原則に沿って、規範本文を§C1-C6に集約し、各フローは参照Readのみを持つ参照体制に再編する。

**コンセプト:**
- やっていいこと・やってはいけないことは処理フローの中で参照される形で実行される
- 規範本文は1箇所（§C1-C6）に集約。フロー側は本文を持たず、参照Readのみ
- 起動時に §0 → §3 → §C1-C6 の Read チェーンが機械的に発生
- フローに書かれていない行動は実行しない（POエスカレーション）
- 修正漏れ防止: 規範変更は §C1-C6 のみ修正。フロー側は不変

---

#### A. §0 新設（本仕様書の利用フロー）

本仕様書の冒頭（目次の直後）に新設。全セッションの起動手順を定義する唯一のエントリーポイント。

```
§0. 本仕様書の利用フロー

全てのセッションは以下の順で開始する:

Step 0-1: 本ファイル §3「セッション起動プロトコル」を Read
Step 0-2: §3 に従い、該当層（PO/ADV/ENG）の起動時読み込みファイルを Read
          ※ §共通行動規範集 §C1-C6 は全層で必須Read
Step 0-3: §3.5「フローに書かれたこと以外やらない原則」を確認
Step 0-4: instructions/session_progress.md を Read → キュー先頭のミッション判定
Step 0-5: キュー先頭のミッションタイプに該当するフロー（§2/§4/§5/§8/§13/§14/§15 等）の
          先頭に移動 → 各フローの Step 0（参照Read）を実行 → Step 1 へ

Step 0 を省略したセッションは無効。実行結果はDONEにできない。
canopy検証: step0_lint.sh（§4 G11 新設）が Step 0 参照行の存在を検証する。
```


#### B. §3 全面改訂（旧「鉄則一覧15個」→「セッション起動プロトコル」）

現行 §3 は全面削除し、以下で置き換える。

```
§3. セッション起動プロトコル

### 3.0 原則
本セクションは全セッションで必ず実行される起動手順を定義する。
旧「鉄則15個」および「曖昧用語禁止リスト12語」は §共通行動規範集（§C1-C6）に
規範として集約された（§3.6 移行マップ参照）。本仕様書全体における規範の正本は
§C1-C6 のみであり、各フローは §C1-C6 への参照Readのみを持つ。

### 3.1 PO（ふとし）の起動時Read
1. instructions/session_progress.md（5行サマリー + キュー先頭）
※ POは承認判断を担う。詳細ルールは ADV が要約する。

### 3.2 ADV（Claude.ai）の起動時Read
1. instructions/session_progress.md 全文
2. bootstrap.md + CLAUDE.md 契約セクション
3. docs/plans/dev_system_spec.md 目次（§番号と見出し）
4. docs/plans/dev_system_spec.md §C1-C6（必須。全文）
5. docs/plans/sub_adv_protocol.md 全文
6. docs/po-decisions.md 直近10件
7. docs/learned-patterns.md 目次

ADV は起動後、「処理フローに書かれていないタスク」を実行しない。POから指示を
受けた場合、該当する処理フロー（§2 変更フロー / §5 ミッション定義 / §13 AI
レビュー等）を特定してからアクションに移る。該当フローがない場合は PO に
「どのフローで処理しますか」と確認する。

### 3.3 ENG（Claude Code）の起動時Read
1. CLAUDE.md 全文
2. development_rules.md 全文
3. instructions/session_progress.md 全文
4. docs/plans/dev_system_spec.md §C1-C6（必須。全文）
5. docs/learned-patterns.md 該当パターン（実装対象に応じて）
6. docs/po-decisions.md 直近5件

ENG は起動後、「session_progress.md のキュー先頭ミッション定義に書かれた完了
コマンド」以外を実行しない。ミッション定義に不足がある場合、実行せずに ADV へ
報告する。

### 3.4 セッション終了プロトコル
セッション終了前に全層が実行する:
1. 未書き込みの仕様変更・判断結果・教訓がないか確認
2. ある場合は該当ファイル（session_progress / session_history / dev_system_spec /
   sub_*.md / learned-patterns / po-decisions）に書き込み
3. 書き込み直後に get_file_info で行数確認 → 完了報告に記載
4. 確認後にセッション終了

「次回やる」「メモしておく」等の揮発先送りは禁止。詳細は §C4 参照。

### 3.5 フローに書かれたこと以外やらない原則
本仕様書に記述された処理フロー（§1.4 / §2 / §4 / §5 / §6 / §7 / §8 / §9 / §10 /
§13 / §14 / §15.2 / §15.3 / §20 / §19.10 および sub_*.md の各フロー）に記載された
手順のみを実行する。

フローに記載のない判断・行動が必要になった場合:
1. 該当する既存フローを再確認（索引: §3.6 参照）
2. 既存フローで対応不可能と判断した場合、POエスカレーション
3. 新規フローの追加はPO承認後に §2 変更フロー経由で本仕様書に追記
```


#### C. §3.6 旧鉄則 → §C規範集 移行マップ（検証用表）

§3 末尾に設置。改訂時の連鎖チェック用。全17項目（旧鉄則15個 + 曖昧用語12語カテゴリ + L1-L2テスト関連）が §C1-C6 のいずれに統合されたかを表示する。

```
### 3.6 旧鉄則 → §C規範集 移行マップ

| 旧鉄則 | 内容 | 移行先 |
|--------|------|--------|
| ① 品質最優先 | 思想宣言 | 廃止（§4 ゲート体系が品質を強制） |
| ② 実装委任 | 書き込み規約 | §C1 + sub_adv_protocol §1 |
| ③ 影響範囲チェック | 連鎖更新 | §C3 + §2 Step 1 + §18 |
| ④ 判断根拠 | ADV行動 | §C5 + sub_adv_protocol §7 |
| ⑤ 方針整合性 | ADV行動 | §C3 + §3.2 Read |
| ⑥ ルール追加 | 改善ループ | §C5 + §15.2 |
| ⑦ コードは読まない | PO/ADV行動 | §C1 + sub_adv_protocol §1 |
| ⑧ 事実確認 | 検証規範 | §C2 + §9.3 |
| ⑨ スクショ判定 | UI検証 | §C2 + §4.1 G9 |
| ⑩ ミッション定義セルフチェック | ADV行動 | §C2 + sub_adv_protocol §4 |
| ⑪ 操作フロー確認 | 仕様協議 | §C2 + §2 Step 1 |
| ⑫ セッション終了未書き込み | 運用 | §C4 + §3.4 |
| ⑬ レビュー修正≠仕様変更 | レビュー | §C5 + sub_review_flow §2 Filter 3 |
| ⑭ フロー変更規約 | 改善ループ | §C5 + §2冒頭 |
| ⑮ シークレット管理 | セキュリティ | §C6 + §20 + G10 |
| 曖昧用語12語 | 報告規範 | §C2 + §4.1 G5 report_lint.sh |
```


#### D. §共通行動規範集（§C1-C6）新設 — 規範本文の唯一の正本

現行 §3 の「鉄則一覧15個」と「曖昧用語禁止リスト12語」を、以下の6つの規範として集約する。本文は本セクションにのみ存在し、他の全フローは §C○ への参照Readを持つのみとする。

```
§C. 共通行動規範集（全層・全フローの参照対象）

本セクションは dev-system 全体における規範の正本である。各フローは §C1-C6 の
いずれかを参照Readする形で遵守する。規範変更は本セクションのみで行い、他ファ
イル/他セクションに本文を重複記述してはならない（Single Source of Truth）。

### §C1. 書き込み規約（旧鉄則②⑦）
- ADV（Claude.ai）/PO はコードを書かない。読まない。
- 書き込みホワイトリストは sub_adv_protocol §1 に定義。対象ファイル外の書き込み禁止。
- ENG（Claude Code）は対象ファイル外を変更しない。
- 自動検証: scripts/changed-files-allowlist.sh（canopy 組込み）

### §C2. 動作検証規範（旧鉄則⑧⑨⑩⑪ + 曖昧用語禁止リスト12語）
- UI検証はスクショ画像判定のみで行う。DOM API（hasClass / getAttribute /
  boundingBox / toHaveAttribute 等）による表示状態判定は禁止。詳細: §4.1 G9
- ミッション定義セルフチェック11項目を実行: sub_adv_protocol §4
- 操作フロー確認: ユーザー操作の開始点 / 中断・キャンセル手段 / 操作完了後の
  戻り先を全て定義する。詳細: §2 Step 1 の仕様協議時必須確認項目
- 事実確認せずに断言禁止。特にデバイス依存バグでは、シミュレーター/実機検証の
  結果を添付する。未検証の場合は「未検証」と明記する。詳細: §9.3
- 完了報告で使用禁止の曖昧用語12語:
  「確認した」「表示されている」「正常に動作」「問題なし」「対応済み」「修正済み」
  「実装済み」「開いている」「閉じている」「存在する」「反映されている」「変化した」
  代替: スクショから読み取れる具体的事実を書く（「スクショ前：X → スクショ後：Y」）
- 自動検証: scripts/report_lint.sh（§4.1 G5）

### §C3. 連鎖更新規範（旧鉄則③⑤）
- 仕様変更時は影響範囲チェック → 一括更新。対象は §18 依存関係マップに従う。
- 方針整合性自己チェック: bootstrap.md / CLAUDE.md / 過去の PO 決定（docs/
  po-decisions.md）と矛盾する提案をしない。
- 「1箇所だけ更新して他を放置」は禁止。更新完了後、更新ファイル一覧を報告。
- 詳細: §2 Step 1 + §16.7

### §C4. セッション規範（旧鉄則⑫）
- 起動時: §0 Step 0-1〜0-5 を必ず実行。§3 を経由せず作業を開始してはならない。
- 終了時: 未書き込みの仕様変更・判断結果・教訓がないか確認 → 該当ファイル
  (session_progress / session_history / dev_system_spec / sub_*.md /
  learned-patterns / po-decisions) に書き込み → get_file_info で行数確認 →
  完了報告に記載。
- 「次回やる」「メモしておく」等の揮発先送り禁止。リポジトリに書き込んで
  から終了する。
- 詳細: §3.4

### §C5. 改善ループ規範（旧鉄則④⑥⑬⑭）
- ADV は判断時に根拠を示す。選択肢を提示するだけでなく「推奨案+理由」を述べる。
- 方針違反・誤り発生時は再発防止ルールを提案ログに追記 → §2 変更フローで
  リポジトリ反映。曖昧な行動規範（「気をつける」「意識する」）ではなく機械検証
  可能な形で追加する。詳細: §15.2 教訓逆流プロセス
- レビュー修正≠仕様変更。CRITICAL 指摘でも PO 承認済み仕様（テーマ構成 /
  画面構成 / プラン / 機能の追加削除）は変えない。該当する場合は提案ログに
  記載。詳細: sub_review_flow §2 Filter 3
- フロー違反時の対応: 「今回だけ」の例外を禁止。該当フローの改訂提案を §2 で
  提出し、新フローに従って実行する。フローを曲げる＝信頼性崩壊、フローを
  変える＝一貫性維持。詳細: §2 冒頭

### §C6. セキュリティ規範（旧鉄則⑮）
- API キー・サービスキー・秘密鍵をコード/コミット/ログ/コメントに書かない。
  環境変数（.env / .dev.vars）で管理する。
- .env* は .gitignore に含める（.env.example は除外）。
- git 履歴に秘密値が入った場合、即座にキーをローテーション。
- DC 読み取り禁止リスト（.claude/settings.local.json の deny）に .env* /
  .dev.vars / *.key / *.pem を含める。
- 自動検証: scripts/pre-commit G10 + canopy G10
- 詳細: §20 セキュリティ管理
```


#### E. 全22フローへの Step 0（参照Read）追加

本仕様書および sub_*.md / development_rules.md に記述された全22フローの冒頭に、「Step 0 (参照Read): §C○ を Read して遵守」を追加する。本文は §C1-C6 に集約されているため、フロー側は1行の参照のみとする。

```
Step 0 適用対象フロー一覧（全22フロー）:

| # | フロー | 追加場所 | 参照 §C |
|---|-------|--------|--------|
| 1 | §1.4 バグ対応フロー | フロー冒頭 | §C1 / §C5 |
| 2 | §2 変更フロー（6ステップ） | Step 1 の前 | §C1 / §C3 / §C5 |
| 3 | §4 品質ゲート体系（G1-G10） | §4.1 表の前 | §C2 / §C5 / §C6 |
| 4 | §5 ミッション定義テンプレ | テンプレ記述の前 | §C1 / §C2 / §C5 |
| 5 | §6 承認ルール | 表の前 | §C1 / §C3 |
| 6 | §7 3層テスト戦略（L1/L2/L3） | L1/L2/L3 表の前 | §C2 |
| 7 | §8 C2デプロイフロー | Step 1 の前 | §C2 / §C6 |
| 8 | §9 デバッグ4フェーズ | Phase 1 の前 | §C2 / §C5 |
| 9 | §9.3 デバイス依存バグ診断 | Step 1 の前 | §C2 |
| 10 | §10 共通資産管理 | §10.1 の前 | §C1 / §C3 |
| 11 | §13 AIレビュー基盤 | §13.1 の前 | §C5 |
| 12 | §13.15 レビューコスト最適化 | §13.15.1 の前 | §C5 |
| 13 | §13.17 ENG自律判定3ペルソナ制 | §13.17.1 の前 | §C1 / §C3 / §C5 |
| 14 | §14 仕様書開発6フェーズ | 表の前 | §C3 / §C5 |
| 15 | §15.2 教訓逆流プロセス | Step 1 の前 | §C5 |
| 16 | §15.3 棚卸し（5セッションごと） | 項目 1 の前 | §C1 / §C2 / §C5 |
| 17 | §20 セキュリティ管理 | §20.1 の前 | §C6 |
| 18 | sub_adv_protocol §2 トリガー対応表 | 表の前 | §C1 / §C3 |
| 19 | sub_adv_protocol §4 セルフチェック | §4 冒頭 | §C2 |
| 20 | sub_review_flow §3 共通レビューフロー | §3.1 の前 | §C5 |
| 21 | sub_review_flow §6 信頼度スコアリング | §6 冒頭 | §C5 |
| 22 | development_rules.md G1-G9 品質ゲート | G1 の前 | §C2 / §C6 |
```

**追記フォーマット（全22フロー共通）:**

```
Step 0 (参照Read): dev_system_spec.md §C○ を Read して遵守する。本フローの実行中は
§C○ の規範内容を遵守する。

Step 1: ...（既存のフロー内容）
```

本文は §C1-C6 にのみ存在する。フロー側は参照行1〜2行のみ。修正が発生した場合、
§C1-C6 のみを修正すれば全22フローに反映される（Single Source of Truth 原則）。


#### F. canopy 新ゲート「Step 0 参照漏れ検出」（§4 G11 新設）

全22フローの冒頭に Step 0 参照行が存在することを機械検証する新ゲート。

```bash
# scripts/step0_lint.sh（新設）
#!/bin/bash
set -euo pipefail
FAIL=0
SPEC="docs/plans/dev_system_spec.md"

# 全22フローの識別子とStep 0必須参照§C
declare -A FLOWS=(
  ["§1.4 バグ対応フロー"]="§C1 / §C5"
  ["§2. 変更フロー"]="§C1 / §C3 / §C5"
  ["§4. 品質ゲート体系"]="§C2 / §C5 / §C6"
  ["§5. ミッション定義テンプレート"]="§C1 / §C2 / §C5"
  ["§6. 承認ルール"]="§C1 / §C3"
  ["§7. 3層テスト戦略"]="§C2"
  ["§8. C2デプロイフロー"]="§C2 / §C6"
  ["§9. デバッグ"]="§C2 / §C5"
  ["§9.3 デバイス依存バグ診断"]="§C2"
  ["§10. 共通資産の管理方式"]="§C1 / §C3"
  ["§13. AIレビュー基盤"]="§C5"
  ["§13.15 レビューコスト最適化"]="§C5"
  ["§13.17 ENG自律判定"]="§C1 / §C3 / §C5"
  ["§14. 仕様書開発フロー"]="§C3 / §C5"
  ["§15.2 逆流プロセス"]="§C5"
  ["§15.3 棚卸し"]="§C1 / §C2 / §C5"
  ["§20. セキュリティ管理"]="§C6"
)

for FLOW in "${!FLOWS[@]}"; do
  REQUIRED="${FLOWS[$FLOW]}"
  FLOW_START=$(grep -n "^## $FLOW\|^### $FLOW" "$SPEC" | head -1 | cut -d: -f1)
  if [ -z "$FLOW_START" ]; then
    echo "WARN: フロー「$FLOW」が spec に見つかりません"
    continue
  fi
  # フロー開始から20行以内に Step 0 参照行があるか
  STEP0=$(sed -n "${FLOW_START},+20p" "$SPEC" | grep -c "Step 0.*参照Read.*$REQUIRED" || echo 0)
  if [ "$STEP0" -eq 0 ]; then
    echo "FAIL: フロー「$FLOW」に Step 0 参照Read ($REQUIRED) が不足"; FAIL=1
  fi
done

# sub_*.md / development_rules.md の5フローも同様に検証
SUBCHECKS=(
  "docs/plans/sub_adv_protocol.md:§2.:§C1 / §C3"
  "docs/plans/sub_adv_protocol.md:§4.:§C2"
  "docs/plans/sub_review_flow.md:§3.:§C5"
  "docs/plans/sub_review_flow.md:§6.:§C5"
  "development_rules.md:G1:§C2 / §C6"
)
for CHECK in "${SUBCHECKS[@]}"; do
  FILE="${CHECK%%:*}"; REST="${CHECK#*:}"
  SEC="${REST%%:*}"; REQ="${REST##*:}"
  if [ ! -f "$FILE" ]; then continue; fi
  STEP0=$(grep -c "Step 0.*参照Read.*$REQ" "$FILE" || echo 0)
  if [ "$STEP0" -eq 0 ]; then
    echo "FAIL: $FILE $SEC に Step 0 参照Read ($REQ) が不足"; FAIL=1
  fi
done

# §C1-C6 セクションの存在確認
for C in C1 C2 C3 C4 C5 C6; do
  EXISTS=$(grep -c "^### §$C\." "$SPEC" || echo 0)
  if [ "$EXISTS" -eq 0 ]; then
    echo "FAIL: §$C セクションが $SPEC に存在しません"; FAIL=1
  fi
done

exit $FAIL
```

canopy_common.sh に組み込み:
```bash
# --- G11: Step 0 参照漏れ検出 ---
if [ -f "scripts/step0_lint.sh" ]; then
  bash scripts/step0_lint.sh || FAIL=1
fi
```


#### G. CLAUDE.md / development_rules.md 連鎖更新

**CLAUDE.md 変更（実行主体の区別。§16.5 項目2 準拠）:**

**Code（ENG）が実行可能な変更（契約セクション外）:**

1. 「鉄則（常に意識する11個。詳細はdevelopment_rules.md）」セクション → **全削除**
   - #1〜#11 の列挙を全て削除
   - CLAUDE.md #10 重複番号問題が自動解消
2. 代替として「起動時 Read 指示」セクションを冒頭に追加:
   ```
   ## 起動時 Read 指示（ENG向け。§C4 セッション規範 準拠）

   このファイルを読んだ後、必ず以下を実行する:
   1. docs/plans/dev_system_spec.md §0「本仕様書の利用フロー」を Read
   2. §0 Step 0-1〜0-5 を順番に実行
   3. §3.3 ENG 起動時 Read リストに従い、§C1-C6 を含む必須ファイルを Read
   4. session_progress.md のキュー先頭ミッションを判定し、該当フローに移動
   5. フローの Step 0（参照Read）を実行してから Step 1 に着手

   Step 0 を省略したセッションは無効。完了報告できない。
   ```
3. 「契約セクション（Code変更禁止）」は残す（アプリ固有の契約のため）
4. 「Compact Instructions」セクション → 改訂案⑦で dev_system_spec §16.8 に昇格。
   CLAUDE.md 側は「詳細: dev_system_spec §16.8」参照に変更
5. 「Design Context」セクションは残す（アプリ固有のデザインブリーフ）
6. 「【絶対禁止】」セクション → 本文削除し、「正本: dev_system_spec §16.5」参照のみに

**Claude.ai（ADV）経由必須の変更（契約セクション内）:**

7. 「ふとしの方針メモ」の「デザイン照合は双方向必須」→ 削除（§4.7.1 に昇格）
8. 「ふとしの方針メモ」の「チェックリスト検証の一括PASS禁止（C20）」→ 削除（§4.7.1.5 に昇格）
   **注意:** 項目7-8は契約セクション内のため Code 変更禁止。改訂確定後に Claude.ai が DC 経由で削除。

**development_rules.md 変更:**

1. 冒頭「> 索引ファイル。各ゲートの1行要約と参照先パス。」の下に追加:
   ```
   > **起動時 Read 指示（§C4 セッション規範 準拠）:**
   > ENGはこのファイルを読んだ後、必ず dev_system_spec.md §0 Step 0-1〜0-5 を
   > 実行する。§C1-C6 共通行動規範集は全層で必須Read。
   > 本ファイルの品質ゲート（G1-G9）発火時も §C2 / §C6 を遵守する。
   ```
2. G1-G9 の各ゲート冒頭に「Step 0 (参照Read): §C○」を1行追加（全22フロー対象の1つとして）

**templates/CLAUDE_TEMPLATE.md 変更:**

新アプリ立ち上げ時のテンプレート。鉄則列挙セクションを削除し、「起動時 Read 指示」を追加。アプリ固有の契約セクション・Design Context は [TODO] として残す。

---

#### H. 改訂案① のサマリー

**F1〜F5 の5点抜け解消:**
- F1（鉄則の呼称食い違い）→ CLAUDE.md の鉄則を全削除 + dev-system §3/§C参照に一本化
- F2（15個は多すぎ）→ §C1-C6 の6つに集約
- F3（3層混在）→ §3.1-3.3 で層別起動Readを明示。§C規範は全層共通として統一
- F4（曖昧用語12語が別セクション）→ §C2 動作検証規範に統合
- F5（#10 重複番号）→ CLAUDE.md 鉄則セクション全削除で自動解消

**Single Source of Truth の実現:**
- 規範本文: §C1-C6 のみ（1箇所）
- 参照: 全22フローが Step 0 で参照Read
- 修正時: §C1-C6 のみ修正 → 全フローに伝播（フロー側は不変）

**機械検証の実装:**
- G11 新設: scripts/step0_lint.sh が全22フローの Step 0 参照行存在を検証
- G5 既存: scripts/report_lint.sh が曖昧用語12語を自動検出（§C2）
- G9 既存: スクショ画像判定の強制（§C2）
- G10 既存: シークレット検出（§C6）

**想定ボリューム（改訂後 dev_system_spec.md）:**
- §0 新設: 15行
- §3 全面改訂: 50行
- §C1-C6 新設: 60行（§3 と §4 の間に挿入）
- §3.6 移行マップ: 17行
- 全22フローへの Step 0 追加: 22行（1行 × 22フロー）
- §4 G11 新設: 10行
- **合計追加: 約175行**（現行1,422行 → 約1,597行）

**既存行の削除:**
- §3 鉄則一覧15個 + 曖昧用語リスト: 約40行削除
- 差引増加: 約135行


---

### 改訂案② §7 L1再定義 + §8 C2デプロイフロー拡張（Step 10-12 追加）

**目的:** A1（本番実機検証）/ A3（L1具体定義）/ D3（デプロイ完了条件）/ E1（環境変数反映）/ E2（外部サービス連携）/ E3（必須環境変数存在）の6点抜けを解消。

**コンセプト:**
- デプロイ完了 ≠ 機能正常の分離。HTTP 200 は疎通確認でしかない
- 実機での認証を含むユーザー操作まで検証して初めてデプロイ完了
- 環境変数・外部サービス連携は PaaS ダッシュボード設定依存のため、自動検証が必須

---

#### A. §7 L1スモーク5項目の明文化

現行の「基本5操作（起動/機能A/機能B/AI送受信/データ永続化）」は曖昧。以下に置き換える。

```
### 7.1 L1スモークテスト必須5項目（全アプリ共通）

| ID | 項目 | 内容 | タイムアウト |
|----|------|------|------------|
| L1-1 | 起動 | splash/初期ロード〜ホーム画面表示 | 10秒 |
| L1-2 | 認証 | サインイン成功 → ダッシュボード遷移 → リロード後も認証維持 | 30秒 |
| L1-3 | 主機能A | アプリ固有の中核操作1（app_config.yaml の l1.main_a で定義） | 20秒 |
| L1-4 | 主機能B or AI送受信 | AI機能ありの場合はAI応答受信、なしの場合は app_config.yaml の l1.main_b | 30秒 |
| L1-5 | データ永続化 | 書き込み操作 → リロード → データ表示維持 | 20秒 |

**L1 PASS条件:** 5項目全てが期待結果を返す。1つでもFAILならデプロイ中止（§8 Step 5）。

**L1-2 認証の完了条件（必須）:**
- メール + パスワード（または該当アプリの認証方式）でログイン
- ログイン後のトップ画面でユーザー固有データが表示されていることをスクショ判定
- ページリロード後も同じ画面に留まる（再ログイン不要）
- 検証: スクショ画像判定のみ（§C2 動作検証規範 準拠）

**認証なしアプリの扱い:** L1-2 を `[SKIP-AUTH] app_config.yaml で disable_auth: true` と
明示的に宣言。暗黙のSKIP禁止（§4.5 SKIPルール準拠）。

**L1-3/L1-4 の app_config.yaml 定義（新設）:**
```yaml
l1:
  main_a:
    test_grep: "dashboard-main"
    description: "ダッシュボード主機能"
  main_b:
    test_grep: "ai-chat-send"
    description: "AI送受信"
  disable_auth: false  # 認証なしアプリのみ true
```
```


#### B. §8 C2デプロイフロー Step 10-12 新設

現行 §8 の9ステップの後（git tag の前）に、以下の3ステップを追加する。

```
§8. C2デプロイフロー（v3.4改訂版）

Step 0 (参照Read): §C2 / §C6 を Read して遵守する。

Step 1: version_sync.sh 実行（既存）
Step 2: ${build.cmd} 実行（既存）
Step 3: canopy.sh（全ゲート）（既存）
Step 4: L1スモーク（§7 の5項目。認証含む）（既存。L1再定義により強化）
Step 5: L2影響範囲（既存）
Step 6: ${deploy.frontend_cmd} 実行（既存）
Step 7: ${deploy.backend_cmd} 実行（既存）
Step 8: curl -s $URL → HTTP 200 確認（既存。疎通のみ）
Step 9: （Step 10-12 に繰り上げ。旧 Step 9「git tag」は Step 13 へ移動）

Step 10: 環境変数反映確認（E1・E3 対応）
  目的: デプロイ先（Cloudflare Pages 等）に必須環境変数が実際に設定されているか検証
  コマンド: bash scripts/verify_env.sh --target=$ENV
  検証内容:
    - app_config.yaml の required_env リストと、PaaS側の実設定値を照合
    - 未設定の環境変数があれば FAIL
    - VITE_* / PUBLIC_* プレフィックスの変数はビルド成果物に埋め込まれるため、
      dist/ 内の実値を grep で確認（G10シークレット検出パターンでマスク）
  FAIL時: デプロイを失敗扱いとし、rollback.sh 実行の要否を PO に報告

Step 11: 外部サービス連携確認（E2 対応）
  目的: Supabase Auth Redirect URLs / Stripe Webhook endpoint / OAuth Callback URL 等の
  外部サービス側設定が、デプロイ先URLと整合しているか検証
  コマンド: bash scripts/verify_external_services.sh --target=$ENV
  検証内容:
    - app_config.yaml の external_services リストに基づく
    - 例: supabase.auth_redirect_urls が $DEPLOY_URL と $DEPLOY_URL/** を含むか
    - 例: stripe.webhook_endpoint が $DEPLOY_URL/api/stripe/webhook と一致するか
    - 検証はプロバイダーの管理API経由。APIキーは .dev.vars または secrets manager から取得
    - APIキーがない項目は WARN 扱い（PO手動確認のチェックリストを出力）
  FAIL時: 不整合項目と修正手順を表示。PO判断で継続 or rollback

Step 12: 実機E2Eスモーク（A1 対応）
  目的: HTTP 疎通だけでなく、実際のユーザー操作が機能するか検証
  コマンド: npx playwright test --config=playwright.realworld.config.ts
  検証内容:
    - §7 L1-1〜L1-5 の5項目を、本番/ステージングURL（$DEPLOY_URL）に対して実行
    - ローカル開発環境（localhost）ではなく、実際のデプロイ先に対してPlaywrightを動かす
    - 認証テストは dev-system/templates/test_realworld_template.ts をベースに作成
    - テスト用アカウント（.env.test の REALWORLD_TEST_USER / REALWORLD_TEST_PASS）を使用
    - スクショを evidence/deploy-${VERSION}/ に保存
  FAIL時: 自動rollback.sh の実行を提案（即実行はしない。PO判断）
         提案時は「FAILしたL1項目 + 対応候補」を session_progress.md に記録

Step 13: git tag vX.Y.Z（旧 Step 9）
```


#### C. canopy_common.sh 拡張（E3 必須環境変数存在チェック）

sub_infrastructure.md §2.6 canopy_common.sh に以下を追加。

```bash
# --- E3: 必須環境変数存在チェック（app_config.yaml の required_env） ---
if command -v yq &>/dev/null && [ -f "app_config.yaml" ]; then
  REQUIRED_ENV=$(yq e '.required_env[]' app_config.yaml 2>/dev/null || echo "")
  if [ -n "$REQUIRED_ENV" ]; then
    # .env または .dev.vars の存在確認（優先順位: .dev.vars > .env）
    ENV_FILE=""
    [ -f ".env" ] && ENV_FILE=".env"
    [ -f ".dev.vars" ] && ENV_FILE=".dev.vars"
    if [ -z "$ENV_FILE" ]; then
      echo "FAIL: required_env defined but no .env/.dev.vars found"; FAIL=1
    else
      while IFS= read -r VAR; do
        [ -z "$VAR" ] && continue
        if ! grep -q "^${VAR}=" "$ENV_FILE"; then
          echo "FAIL: required_env '$VAR' missing in $ENV_FILE"; FAIL=1
        fi
      done <<< "$REQUIRED_ENV"
    fi
  fi
fi
```

WARN: この検証はローカル `.env*` のみを対象とする。PaaS側（Cloudflare Pages 等）への
反映確認は §8 Step 10 の `verify_env.sh` で行う。

---

#### D. 新設スクリプト（sub_infrastructure.md §2 に追加）

##### D.1 scripts/verify_env.sh（新設）

```bash
#!/bin/bash
set -euo pipefail
# §8 Step 10: PaaS側の環境変数反映確認
TARGET="${1:-prod}"
FAIL=0

if ! command -v yq &>/dev/null; then echo "ERROR: yq not installed"; exit 1; fi

REQUIRED_ENV=$(yq e '.required_env[]' app_config.yaml 2>/dev/null || echo "")
PROVIDER=$(yq e '.infrastructure.frontend // ""' app_config.yaml)

if [ -z "$REQUIRED_ENV" ]; then
  echo "OK: no required_env defined"; exit 0
fi

case "$PROVIDER" in
  "cloudflare-pages")
    # wrangler pages secret list でデプロイ先の環境変数を取得
    PROJECT_NAME=$(yq e '.deploy.project_name // ""' app_config.yaml)
    if [ -z "$PROJECT_NAME" ]; then
      echo "FAIL: deploy.project_name not set in app_config.yaml"; exit 1
    fi
    DEPLOYED_VARS=$(npx wrangler pages secret list --project-name="$PROJECT_NAME" 2>/dev/null \
                    | grep -oP '(?<=name:\s)[A-Z_]+' || echo "")
    while IFS= read -r VAR; do
      [ -z "$VAR" ] && continue
      # VITE_* / PUBLIC_* プレフィックスはビルド埋め込みなので dist/ で確認
      if [[ "$VAR" == VITE_* ]] || [[ "$VAR" == PUBLIC_* ]]; then
        if ! grep -rq "$VAR" dist/ 2>/dev/null; then
          echo "FAIL: $VAR not found in dist/ (build-time env)"; FAIL=1
        fi
      else
        # サーバーサイド env は wrangler secret で確認
        if ! echo "$DEPLOYED_VARS" | grep -q "^${VAR}$"; then
          echo "FAIL: $VAR not set on Cloudflare Pages ($PROJECT_NAME)"; FAIL=1
        fi
      fi
    done <<< "$REQUIRED_ENV"
    ;;
  *)
    echo "WARN: env verification not implemented for provider: $PROVIDER"
    echo "WARN: manual PO check required — list: $REQUIRED_ENV"
    ;;
esac

exit $FAIL
```


##### D.2 scripts/verify_external_services.sh（新設）

```bash
#!/bin/bash
set -euo pipefail
# §8 Step 11: 外部サービス連携設定の整合性検証
TARGET="${1:-prod}"
FAIL=0
WARN_COUNT=0

if ! command -v yq &>/dev/null; then echo "ERROR: yq not installed"; exit 1; fi

DEPLOY_URL=$(yq e ".env.${TARGET}.url // \"\"" app_config.yaml)
if [ -z "$DEPLOY_URL" ]; then
  echo "FAIL: env.${TARGET}.url not set in app_config.yaml"; exit 1
fi

# Supabase Auth Redirect URLs 検証
SUPABASE_URL=$(yq e '.external_services.supabase.project_url // ""' app_config.yaml)
if [ -n "$SUPABASE_URL" ]; then
  if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
    echo "WARN: SUPABASE_ACCESS_TOKEN not set. Manual verification required:"
    echo "  → Supabase Dashboard > Authentication > URL Configuration"
    echo "  → Redirect URLs must include: $DEPLOY_URL, $DEPLOY_URL/**, $DEPLOY_URL/auth/callback"
    WARN_COUNT=$((WARN_COUNT + 1))
  else
    EXPECTED_URLS=$(yq e '.external_services.supabase.auth_redirect_urls[]' app_config.yaml)
    EXPECTED_URLS=$(echo "$EXPECTED_URLS" | sed "s|\${deploy_url}|$DEPLOY_URL|g")
    PROJECT_REF=$(echo "$SUPABASE_URL" | grep -oP '(?<=//)[^.]+')
    ACTUAL_URLS=$(curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
                  "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
                  | python3 -c "import sys,json;d=json.load(sys.stdin);print('\n'.join(d.get('redirect_urls','').split(',')))" 2>/dev/null || echo "")
    while IFS= read -r EXPECTED; do
      [ -z "$EXPECTED" ] && continue
      if ! echo "$ACTUAL_URLS" | grep -qF "$EXPECTED"; then
        echo "FAIL: Supabase Auth Redirect URL missing: $EXPECTED"; FAIL=1
      fi
    done <<< "$EXPECTED_URLS"
  fi
fi

# Stripe Webhook endpoint 検証
STRIPE_WEBHOOK_EXPECTED=$(yq e '.external_services.stripe.webhook_endpoint // ""' app_config.yaml \
                         | sed "s|\${deploy_url}|$DEPLOY_URL|g")
if [ -n "$STRIPE_WEBHOOK_EXPECTED" ]; then
  if [ -z "${STRIPE_SECRET_KEY:-}" ]; then
    echo "WARN: STRIPE_SECRET_KEY not set. Manual verification required:"
    echo "  → Stripe Dashboard > Developers > Webhooks"
    echo "  → Endpoint must be: $STRIPE_WEBHOOK_EXPECTED"
    WARN_COUNT=$((WARN_COUNT + 1))
  else
    # gitleaks allowlist: `-u "$SECRET:"` 形式は curl-auth-user rule に反応するため
    # Authorization header 経由に変更 (機能同等、 docs として安全)。
    ACTUAL=$(curl -s -H "Authorization: Bearer $STRIPE_SECRET_KEY" https://api.stripe.com/v1/webhook_endpoints \
             | python3 -c "import sys,json;[print(w['url']) for w in json.load(sys.stdin).get('data',[])]" 2>/dev/null || echo "")
    if ! echo "$ACTUAL" | grep -qF "$STRIPE_WEBHOOK_EXPECTED"; then
      echo "FAIL: Stripe webhook endpoint not registered: $STRIPE_WEBHOOK_EXPECTED"; FAIL=1
    fi
  fi
fi

echo "Verified external services (WARN: $WARN_COUNT)"
exit $FAIL
```


##### D.3 templates/test_realworld_template.ts（新設）

dev-system/templates/test_realworld_template.ts として配置。init_app.sh 実行時にアプリ側の tests/realworld/ にコピーされる。

```typescript
// dev-system/templates/test_realworld_template.ts
// §8 Step 12: 実機E2Eスモーク用のL1テストテンプレート
// 使い方: アプリ側の tests/realworld/l1.spec.ts にコピーして app 固有に書き換える
import { test, expect } from '@playwright/test';

const DEPLOY_URL = process.env.DEPLOY_URL || '';
const TEST_USER = process.env.REALWORLD_TEST_USER || '';
const TEST_PASS = process.env.REALWORLD_TEST_PASS || '';

test.describe('L1 Realworld Smoke', () => {
  test('[L1-1] 起動 splash→home', async ({ page }) => {
    await page.goto(DEPLOY_URL);
    await expect(page).toHaveURL(/./, { timeout: 10000 });
    // app固有: ホーム画面の特徴要素でスクショ判定
    await page.screenshot({ path: 'evidence/realworld-l1-1.png' });
  });

  test('[L1-2] 認証 signin→dashboard→reload', async ({ page }) => {
    await page.goto(`${DEPLOY_URL}/auth/signin`);
    await page.fill('input[type=email]', TEST_USER);
    await page.fill('input[type=password]', TEST_PASS);
    await page.click('button[type=submit]');
    // ダッシュボード遷移（app固有のURLに書き換え）
    await page.waitForURL(/\/(dashboard|home|grow)/, { timeout: 30000 });
    await page.screenshot({ path: 'evidence/realworld-l1-2a.png' });
    // リロード後も認証維持
    await page.reload();
    await expect(page).not.toHaveURL(/\/auth\/signin/);
    await page.screenshot({ path: 'evidence/realworld-l1-2b.png' });
  });

  // L1-3 / L1-4 / L1-5 は app 固有のため、init_app.sh実行後にアプリ側で書く
  test('[L1-3] 主機能A（app固有）', async ({ page }) => {
    // TODO: app_config.yaml の l1.main_a に基づき記述
  });

  test('[L1-4] 主機能B or AI送受信', async ({ page }) => {
    // TODO: app_config.yaml の l1.main_b に基づき記述
  });

  test('[L1-5] データ永続化', async ({ page }) => {
    // TODO: 書き込み → リロード → 維持を検証
  });
});
```

##### D.4 playwright.realworld.config.ts（新設テンプレート）

```typescript
// dev-system/templates/playwright.realworld.config.ts
// §8 Step 12 専用設定: 本番/ステージングURLに対してPlaywrightを実行
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/realworld',
  timeout: 60_000,
  retries: 1,
  fullyParallel: false,  // 認証テストは順次実行
  use: {
    baseURL: process.env.DEPLOY_URL || 'http://localhost:8787',
    screenshot: 'on',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'realworld-mobile', use: { ...devices['iPhone 13'] } },
  ],
});
```


#### E. app_config.yaml テンプレート拡張（sub_infrastructure.md §3）

現行 app_config_template.yaml に以下のブロックを追加。

```yaml
# === v3.4 新設 ===

# 必須環境変数（canopy E3 + §8 Step 10 verify_env.sh で検証）
required_env:
  # - VITE_SUPABASE_URL
  # - VITE_SUPABASE_PUBLISHABLE_KEY
  # プロジェクトごとに記述

# 外部サービス連携（§8 Step 11 verify_external_services.sh で検証）
external_services:
  # supabase:
  #   project_url: "https://xxxxx.supabase.co"
  #   auth_redirect_urls:
  #     - "${deploy_url}/auth/callback"
  #     - "${deploy_url}/**"
  # stripe:
  #   webhook_endpoint: "${deploy_url}/api/stripe/webhook"

# L1スモーク設定（§7 L1 で参照）
l1:
  main_a:
    test_grep: "dashboard-main"
    description: "アプリ固有の中核操作1"
  main_b:
    test_grep: "ai-chat-send"
    description: "アプリ固有の中核操作2 or AI送受信"
  disable_auth: false  # 認証なしアプリのみ true
```

---

#### F. sub_infrastructure.md §2.8 deploy.sh 拡張

現行 deploy.sh の「curl で HTTP 200 確認」の後、`git tag` の前に、以下のブロックを挿入。

```bash
# --- §8 v3.4 Step 10: 環境変数反映確認 ---
if [ -f "scripts/verify_env.sh" ]; then
  if ! bash scripts/verify_env.sh "$ENV"; then
    echo "FAIL: Step 10 env verification failed"
    exit 1
  fi
fi

# --- §8 v3.4 Step 11: 外部サービス連携確認 ---
if [ -f "scripts/verify_external_services.sh" ]; then
  if ! bash scripts/verify_external_services.sh "$ENV"; then
    echo "FAIL: Step 11 external services verification failed"
    exit 1
  fi
fi

# --- §8 v3.4 Step 12: 実機E2Eスモーク ---
if [ -f "playwright.realworld.config.ts" ] && [ -d "tests/realworld" ]; then
  export DEPLOY_URL="$DEPLOY_URL"
  if ! npx playwright test --config=playwright.realworld.config.ts; then
    echo "FAIL: Step 12 realworld smoke failed"
    echo "Proposal: run 'bash scripts/rollback.sh' (PO approval required)"
    # rollback.sh は自動実行しない。session_progress.md に提案を書いて終了
    exit 1
  fi
fi
```

---

#### G. 改訂案② のサマリー

**A1・A3・D3・E1・E2・E3 の6点解消:**

| 抜け | 対応 |
|-----|-----|
| A1（本番実機検証） | §8 Step 12 実機E2Eスモーク |
| A3（L1具体定義） | §7 L1-1〜L1-5 の5項目明文化。認証必須 |
| D3（デプロイ完了条件） | Step 10-12 で機能検証を追加 |
| E1（環境変数反映） | §8 Step 10 verify_env.sh |
| E2（外部サービス連携） | §8 Step 11 verify_external_services.sh |
| E3（必須環境変数存在） | canopy E3 チェック（ローカル） |

**連鎖更新（6ファイル + 4新設）:**

| 種別 | ファイル | 変更内容 |
|-----|---------|---------|
| 改訂 | dev_system_spec.md §7.1 | L1-1〜L1-5 の5項目表を新設 |
| 改訂 | dev_system_spec.md §8 | Step 10-12 追加（既存9ステップは保持、Step 9→13に繰り下げ） |
| 改訂 | sub_infrastructure.md §2.6 canopy_common.sh | E3 必須環境変数存在チェック追加 |
| 改訂 | sub_infrastructure.md §2.8 deploy.sh | Step 10-12 bash実装追加 |
| 改訂 | sub_infrastructure.md §3 app_config_template.yaml | required_env / external_services / l1 ブロック追加 |
| 改訂 | sub_infrastructure.md §1.1 | scripts/ 一覧に verify_env.sh / verify_external_services.sh 追加 |
| 新設 | scripts/verify_env.sh | §8 Step 10 本体 |
| 新設 | scripts/verify_external_services.sh | §8 Step 11 本体 |
| 新設 | dev-system/templates/test_realworld_template.ts | §8 Step 12 L1テストテンプレ |
| 新設 | dev-system/templates/playwright.realworld.config.ts | §8 Step 12 設定テンプレ |

**想定ボリューム（改訂後 dev_system_spec.md）:**
- §7.1 新設: 約25行
- §8 Step 10-12 追加: 約35行
- sub_infrastructure.md 拡張分: 約180行
- 新設ファイル4本: 約170行（sub_infrastructure.md §2 内に記載）
- **dev_system_spec.md 増加分: 約60行**
- **sub_infrastructure.md 増加分: 約350行**

**既存ルールとの整合性:**
- §C2 動作検証規範 準拠（Step 12 のスクショ判定）
- §C6 セキュリティ規範 準拠（Step 10 の .env 値の grep 時に G10 パターンでマスク）
- §4.1 G4 既存の終了コード判定方式 準拠
- §4.5 SKIPルール 準拠（disable_auth: true 時の L1-2 明示的SKIP）


---

### 改訂案③ §1.5 新設（提案ログ発火フロー）+ §15.3 項目10追加（滞留警告）+ G12 新設

**目的:** C1（推奨対応タイミング）/ C2（棚卸し滞留チェック）/ C3（ステータス区別）の3点抜けを解消。

**コンセプト:**
- 提案ログの項目は必ず明示的なステータスを持つ（暗黙の「検討中」「PO判断待ち」を禁止）
- 滞留は数値（セッション数）で可視化し、閾値超過時に機械検証で警告
- 棚卸し（5セッション）を待たずに、各セッションで自動的に滞留が追跡される

---

#### A. §1.5 新設「提案ログ発火フロー」

dev_system_spec.md §1 の末尾（§1.4 バグ対応フローの後）に §1.5 として新設。

```
§1.5 提案ログ発火フロー

Step 0 (参照Read): §C1 / §C3 / §C5 を Read して遵守する。

### 1.5.1 提案ログのステータス定義（v3.4 新設）

提案ログの全項目は以下のいずれかのステータスを持つ。ステータスなしの項目は
SUGGESTED 扱い（デフォルト）。

| ステータス | 意味 | 起案者 | 次の処理者 |
|----------|------|-------|----------|
| SUGGESTED | ADV が提案中 or ENG が提案中。検討段階 | ADV / ENG | ADV（内容整備） |
| WAITING_PO | POの判定待ち。ADVが「実施すべきかPO判断が必要」と結論した状態 | ADV | PO（APPROVE / REJECT） |
| APPROVED | PO承認済み。キュー投入待ち | PO | ADV（ミッション定義作成） |
| REJECTED | PO却下。アーカイブ | PO | — |

各項目の書式:
```
### [ステータス] 提案ID (提案日: YYYY-MM-DD, 滞留セッション数: N)
提案内容: （1-2行）
根拠: （なぜこの提案が必要か）
想定影響: （ファイル/時間/コスト）
PO判断必要事項: WAITING_PO の場合のみ記述
```

提案IDは `PROP-{連番}` とする。連番はプロジェクト単位でリセットしない。

### 1.5.2 ステータス遷移フロー

```
ADV/ENG が発見/提案
  ↓
[SUGGESTED]
  ↓ ADV が検討 → 「PO判断が必要」と判定
[WAITING_PO]
  ↓ PO が判断
  ├── 承認 → [APPROVED] → ADVがミッション定義 → キュー投入 → 項目削除
  └── 却下 → [REJECTED] → §15.3 棚卸し時にアーカイブへ移動
```

### 1.5.3 ステータス変更の責務

| 遷移 | 実行者 | タイミング |
|------|-------|---------|
| （新規）→ SUGGESTED | ADV / ENG | 提案発生時 |
| SUGGESTED → WAITING_PO | ADV | 内容整備後、PO判断が必要と結論したとき |
| WAITING_PO → APPROVED | PO | PO判断時 |
| WAITING_PO → REJECTED | PO | PO判断時 |
| APPROVED → （削除） | ADV | ミッション定義作成後、キュー投入時 |
| REJECTED → （アーカイブ） | ADV | §15.3 棚卸し時 |

### 1.5.4 滞留セッション数の更新

- 各セッション開始時、ADV は提案ログを Read し、全項目の「滞留セッション数」を +1 する
- ステータスが変更された項目は滞留セッション数を 0 にリセット
- 機械検証: scripts/proposal_log_lint.sh（§4.1 G12 新設）
- ADV起動時Read（§3.2）に instructions/session_progress.md の提案ログが含まれるため、
  必ず本更新処理が発火する

### 1.5.5 滞留の閾値と警告

| ステータス | 滞留セッション数 | 警告内容 | エスカレーション |
|----------|---------------|---------|--------------|
| SUGGESTED | ≥ 5 | ADVが内容整備 or 削除を判断 | §15.3 棚卸し時 |
| WAITING_PO | ≥ 3 | POに個別エスカレーション（5行サマリーに記載） | 即座 |
| APPROVED | ≥ 2 | ADVがミッション定義を作成してキュー投入 | 即座 |
| REJECTED | ≥ 10 | §15.3 棚卸し時にアーカイブ移動 | 棚卸し時 |

閾値超過は G12（§4.1 新設）で機械検証する。
```


#### B. §15.3 棚卸し項目10 追加（滞留警告）

現行 §15.3 棚卸しは9項目。項目10を追加。

```
### §15.3 棚卸し（5セッションごと）

Step 0 (参照Read): §C1 / §C2 / §C5 を Read して遵守する。

1. CLAUDE.md・development_rules.md・session_progress.md の整合性
2. session_progress.md ≤ 300行
3. development_rules.md が過度に肥大化していないか
4. 提案ログに未処理の項目がないか
5. 全ルールファイル間の矛盾チェック
6. CLAUDE.mdに改善提案
7. dev-systemテンプレートへの逆流が必要な教訓がないか
8. metrics.jsonlのトレンド分析
9. 技術負債比率を計測（§15.6準拠）
10. 提案ログ滞留チェック（v3.4 新設）
    - WAITING_PO で滞留セッション数 ≥ 3 の項目を PO に個別エスカレーション
    - SUGGESTED で滞留 ≥ 5 の項目は ADV が内容整備 or 削除を判断
    - REJECTED で滞留 ≥ 10 の項目は instructions/results/proposal_archive.md に移動
    - 検証: scripts/proposal_log_lint.sh（§4.1 G12）で自動実行
```

---

#### C. §4.1 G12 新設（提案ログ形式検証）

現行 §4.1 品質ゲート一覧（G1-G10）に G12 を追加（G11 は改訂案①で Step 0 参照漏れ検出用に予約済み）。

```
| G12 | 提案ログ形式検証 | proposal_log_lint.sh | ✅実装 | §1.5 の書式・ステータス・滞留閾値を検証 |
```

G12 の詳細は §1.5.5 の滞留閾値に基づく。

---

#### D. scripts/proposal_log_lint.sh 新設

sub_infrastructure.md §2 に以下のスクリプトを追加。

```bash
#!/bin/bash
set -euo pipefail
# §4.1 G12: 提案ログ形式検証（§1.5 準拠）
SP="${1:-instructions/session_progress.md}"
FAIL=0
WARN_COUNT=0

if [ ! -f "$SP" ]; then exit 0; fi

# 提案ログセクションの範囲を特定
LOG_START=$(grep -n "^## 提案ログ" "$SP" | head -1 | cut -d: -f1)
if [ -z "$LOG_START" ]; then
  echo "WARN: ## 提案ログ section not found in $SP"; exit 0
fi
NEXT_SECTION=$(tail -n +$((LOG_START + 1)) "$SP" | grep -n "^## " | head -1 | cut -d: -f1)
if [ -n "$NEXT_SECTION" ]; then
  LOG_END=$((LOG_START + NEXT_SECTION - 1))
else
  LOG_END=$(wc -l < "$SP")
fi
LOG_BLOCK=$(sed -n "${LOG_START},${LOG_END}p" "$SP")

# 各提案項目を検証
ITEMS=$(echo "$LOG_BLOCK" | grep -c "^### \[.*\].*PROP-" || echo 0)

while IFS= read -r LINE; do
  [ -z "$LINE" ] && continue
  # ステータス抽出
  STATUS=$(echo "$LINE" | grep -oP '(?<=### \[)[A-Z_]+(?=\])')
  PROP_ID=$(echo "$LINE" | grep -oP 'PROP-[0-9]+')
  STAY_COUNT=$(echo "$LINE" | grep -oP '滞留セッション数:\s*\K[0-9]+')

  # ステータス検証
  case "$STATUS" in
    SUGGESTED|WAITING_PO|APPROVED|REJECTED) ;;
    *)
      echo "FAIL: $PROP_ID has invalid status: '$STATUS'"; FAIL=1
      continue
      ;;
  esac

  # 滞留セッション数の記載必須
  if [ -z "$STAY_COUNT" ]; then
    echo "FAIL: $PROP_ID missing '滞留セッション数'"; FAIL=1
    continue
  fi

  # 閾値チェック（§1.5.5）
  case "$STATUS" in
    WAITING_PO)
      if [ "$STAY_COUNT" -ge 3 ]; then
        echo "WARN: $PROP_ID WAITING_PO stuck for $STAY_COUNT sessions (threshold 3). PO escalation required"
        WARN_COUNT=$((WARN_COUNT + 1))
      fi
      ;;
    SUGGESTED)
      if [ "$STAY_COUNT" -ge 5 ]; then
        echo "WARN: $PROP_ID SUGGESTED stuck for $STAY_COUNT sessions (threshold 5). ADV review required"
        WARN_COUNT=$((WARN_COUNT + 1))
      fi
      ;;
    APPROVED)
      if [ "$STAY_COUNT" -ge 2 ]; then
        echo "WARN: $PROP_ID APPROVED for $STAY_COUNT sessions (threshold 2). ADV should create mission definition"
        WARN_COUNT=$((WARN_COUNT + 1))
      fi
      ;;
    REJECTED)
      if [ "$STAY_COUNT" -ge 10 ]; then
        echo "WARN: $PROP_ID REJECTED for $STAY_COUNT sessions. Move to archive at next §15.3 inventory"
        WARN_COUNT=$((WARN_COUNT + 1))
      fi
      ;;
  esac
done < <(echo "$LOG_BLOCK" | grep "^### \[")

echo "Proposal log check: $ITEMS items, $WARN_COUNT warnings"
exit $FAIL
```

canopy_common.sh への組込み（sub_infrastructure.md §2.6）:
```bash
# --- G12: 提案ログ形式検証 ---
if [ -f "scripts/proposal_log_lint.sh" ]; then
  bash scripts/proposal_log_lint.sh || FAIL=1
fi
```


#### E. sub_adv_protocol.md §2 トリガー対応表拡張

現行 §2 に以下を追加。

```
IF ENG/ADV が提案発生
  DO: 提案ログに [SUGGESTED] ステータスで追記。PROP-{連番} を付与。
      滞留セッション数=0 で開始

IF ADV が「この提案はPO判断が必要」と結論
  DO: ステータスを [SUGGESTED] → [WAITING_PO] に変更。
      PO判断必要事項を明記。滞留セッション数を 0 にリセット

IF PO が WAITING_PO 項目を承認
  DO: ステータスを [WAITING_PO] → [APPROVED] に変更。
      滞留セッション数を 0 にリセット → ミッション定義作成フロー（§5）へ

IF PO が WAITING_PO 項目を却下
  DO: ステータスを [WAITING_PO] → [REJECTED] に変更。
      滞留セッション数を 0 にリセット。理由を記述

IF 新セッション開始時
  DO: 提案ログの全項目の滞留セッション数を +1（§1.5.4）
  DO: WAITING_PO で滞留 ≥ 3 の項目を session_progress.md の5行サマリーに抽出
  DO: APPROVED で滞留 ≥ 2 の項目をミッション定義作成フロー（§5）へ投入候補にする
```

---

#### F. templates/session_progress_template.md 書式更新

現行テンプレートの「提案ログ」セクションを v3.4 書式に更新。

```markdown
## 提案ログ

<!-- v3.4: ステータス付き。詳細: dev_system_spec §1.5 -->
<!-- ステータス: SUGGESTED / WAITING_PO / APPROVED / REJECTED -->
<!-- 各セッション開始時に滞留セッション数を +1 する（§1.5.4） -->

### [WAITING_PO] PROP-001 (提案日: 2026-04-17, 滞留セッション数: 0)
提案内容: (1-2行)
根拠: (なぜこの提案が必要か)
想定影響: (ファイル/時間/コスト)
PO判断必要事項: (承認/却下の判断に必要な情報)

### [SUGGESTED] PROP-002 (提案日: 2026-04-17, 滞留セッション数: 0)
提案内容: (1-2行)
根拠: (なぜこの提案が必要か)
想定影響: (ファイル/時間/コスト)

### [APPROVED] PROP-003 (提案日: 2026-04-15, 滞留セッション数: 1)
提案内容: (1-2行)
ミッション定義作成中（次セッションでキュー投入予定）
```

---

#### G. 既存提案ログの v3.4 書式への移行

現行 session_progress.md に存在する提案ログ項目は、以下の初回移行ルールで
v3.4 書式に変換する。

**移行ルール:**
1. ステータスが不明な項目はすべて [SUGGESTED] として扱う
2. PROP-ID を付与する（既存項目に連番を新規に付与。PROP-001 から開始）
3. 提案日が記載されていない項目は「提案日: 移行時点」として記載
4. 滞留セッション数は全項目で 0 から開始（過去のセッション数を遡及カウントしない）
5. 移行は改訂案③の書き込みと同時に ADV が実施。G_41 セッション内で完了

**既存 Lais 提案ログの移行対象（G_40 session_progress.md より）:**
- M4-A security_engineer HIGH 3件（R-001 / R-002 / R-003）
  - Phase B で対応予定と既に記載済み → [SUGGESTED] に変換。滞留 0 で開始
- dev-system v3.3→v3.4 改訂レビューパッケージ → [APPROVED]（本ミッション自体）

---

#### H. 改訂案③ のサマリー

**C1・C2・C3 の3点解消:**

| 抜け | 対応 |
|-----|-----|
| C1（推奨対応タイミング） | §1.5.2 ステータス遷移フロー + §1.5.5 滞留閾値 |
| C2（棚卸し滞留チェック） | §15.3 項目10 + G12 自動検証 |
| C3（ステータス区別） | §1.5.1 SUGGESTED/WAITING_PO/APPROVED/REJECTED |

**連鎖更新:**

| 種別 | ファイル | 変更内容 |
|-----|---------|---------|
| 新設 | dev_system_spec.md §1.5 | 提案ログ発火フロー本体（§1.5.1〜§1.5.5） |
| 改訂 | dev_system_spec.md §15.3 | 項目10（滞留チェック）追加 |
| 改訂 | dev_system_spec.md §4.1 | G12（提案ログ形式検証）追加 |
| 新設 | scripts/proposal_log_lint.sh | G12 本体 |
| 改訂 | sub_infrastructure.md §2.6 canopy_common.sh | G12 組込み |
| 改訂 | sub_infrastructure.md §1.1 scripts/ 一覧 | proposal_log_lint.sh 追加 |
| 改訂 | sub_adv_protocol.md §2 | トリガー対応表に提案ログ関連5項目追加 |
| 改訂 | templates/session_progress_template.md | 提案ログセクションを v3.4 書式に更新 |
| 運用 | 既存 instructions/session_progress.md 提案ログ | §G 移行ルールに従い G_41 セッション内で移行 |

**想定ボリューム:**
- §1.5 新設: 約80行
- §15.3 項目10追加: 約7行
- §4.1 G12 追加: 約1行
- scripts/proposal_log_lint.sh 新設: 約70行
- sub_adv_protocol.md §2 拡張: 約20行
- templates 更新: 約20行

**既存ルールとの整合性:**
- §C1（書き込み規約）準拠: 提案ログの書き込みは ADV / ENG のホワイトリスト範囲内
- §C3（連鎖更新規範）準拠: ステータス変更時は session_progress.md のみ更新。他ファイル連鎖なし
- §C5（改善ループ規範）準拠: PO判断待ち項目を機械的に追跡することで改善サイクルを閉じる
- 既存の「提案ログ」「バックログ」「WAITING_PO」表現（CLAUDE.md / 既存 session_progress.md 参照）と整合


---

### 改訂案④ §5 ミッション定義テンプレ v3→v4（完了コマンド3区分必須 + ミッションタイプ別マトリクス）

**目的:** D1（画面実装の完了コマンド粒度不統一）/ D2（認証関連と画面実装の区別なし）の2点抜けを解消。

**コンセプト:**
- 完了コマンドを「単体検証（unit）/ 統合検証（e2e）/ 実機検証（realworld）」の3区分で必須化
- ミッションタイプを宣言し、タイプに応じて N/A 許容の組み合わせを機械検証
- 認証・デプロイ系は cmd-realworld を例外なく必須化（M5ログインループの再発防止）

---

#### A. §5 ミッション定義テンプレ v4 全面改訂

現行 §5 を以下に置き換える。

```
§5. ミッション定義テンプレート v4

Step 0 (参照Read): §C1 / §C2 / §C5 を Read して遵守する。

### 5.0 原則（v3.4 改訂）
- 完了条件は全てbashコマンドで記述する。自然言語の「全件」「すべて」「全て」禁止
- 完了コマンドは3区分（cmd-unit / cmd-e2e / cmd-realworld）で必須。N/A の場合は理由を明記
- ミッションタイプを宣言。タイプ別必須マトリクス（§5.1）で機械検証される

### 5.1 ミッションタイプ別 完了コマンド必須マトリクス

| タイプ | cmd-unit | cmd-e2e | cmd-realworld |
|-------|----------|---------|---------------|
| 画面実装（単一画面） | 必須 | 必須 | 任意（デプロイ伴う場合必須） |
| 画面実装（複数画面・画面間遷移あり） | 必須 | 必須 | 必須 |
| 認証・セッション関連 | 必須 | 必須 | **必須（例外なし）** |
| API実装（Worker endpoint） | 必須 | 必須 | 必須（デプロイ後） |
| リファクタリング（挙動変化なし） | 任意 | 必須（regressionなし確認） | 任意 |
| デザイン調整（CSS変更のみ） | N/A | 任意（VRT で代替可） | 任意 |
| ドキュメント更新 | N/A | N/A | N/A |
| dev-system仕様改訂 | N/A | N/A | N/A |
| デプロイ系ミッション | N/A | N/A | **必須（例外なし）** |

N/A の場合は理由を明記する。例:
- 「cmd-e2e: N/A — 単一画面ミッションのため画面間遷移E2Eなし」
- 「cmd-realworld: N/A — ローカルのみで検証可能。デプロイは §8 フローで別途」

### 5.2 ミッション定義テンプレート v4

```markdown
### MISSION-ID: タイトル
> リスク: 🟢低 / 🟡中 / 🔴高
> ミッションタイプ: （§5.1マトリクスのいずれかを選択）
> 参照: docs/xxx.md（フルパスで列挙）
> 対象ファイル: src/xxx.js（変更してよいファイル。対象外変更は
              changed-files-allowlist.sh でFAIL）

**目的:** 1行

**プリフライト（実装前に必ず実行・結果をログに記録）:**
  wc -l docs/xxx.md
  grep -c '条件' source.md

**AT（ADV記述。ENGはspec.tsにコード化。§C2 動作検証規範 準拠）:**
AT-N: テスト名
  前提: （必須。省略不可）
  操作: ユーザーが行う操作
  期待: スクショで確認できる期待結果
  検証: スクショで見えるべきもの
  否定検証: スクショで見えてはいけないもの
  データ検証: リロード後の永続化確認
  スクショ: 撮影タイミング
  RED: ☐（実装前にテスト実行→FAIL確認→FAILログパス）
  GREEN: ☐（実装後にテスト実行→PASS確認→PASSログパス）

ストレスパス: 主要操作を3回連続。最後も正常

**完了コマンド（3区分必須。§5.1マトリクス準拠）:**

cmd-unit:
  npx vitest run path/to/unit.test.ts || exit 1
  [N/A の場合: cmd-unit: N/A — （理由を記載）]

cmd-e2e:
  npx playwright test path/to/e2e.spec.ts --project=mobile || exit 1
  [N/A の場合: cmd-e2e: N/A — （理由を記載）]

cmd-realworld:
  DEPLOY_URL=$DEPLOY_URL npx playwright test --config=playwright.realworld.config.ts \
    --grep "MISSION-ID" || exit 1
  [N/A の場合: cmd-realworld: N/A — （理由を記載）]

**FAIL条件:** cmd-unit / cmd-e2e / cmd-realworld のいずれかが非ゼロ終了
            （N/A 宣言された区分は検証しない）

**完了報告:**
MISSION-ID: cmd-unit {PASS|FAIL|N/A} / cmd-e2e {PASS|FAIL|N/A} / cmd-realworld {PASS|FAIL|N/A}
+ AT各結果 + スクショ枚数 + evidence/MISSION-ID/ファイル一覧
```

### 5.3 v3→v4 の差分（既存ミッション定義の移行）

v3 のテンプレで書かれた既存ミッション定義は、以下のルールで v4 に移行する:

1. ミッションタイプ宣言を追加（§5.1 マトリクスから選択）
2. 既存の `cmd1: ...` を `cmd-unit: ...` または `cmd-e2e: ...` に再分類
3. cmd-realworld が不足している場合は追加 or N/A 宣言
4. 移行は改訂案④の書き込み完了後、各ミッションを次回実行時に v4 に変換

**強制移行タイミング:** DEV-SYSTEM-V34-REVIEW（本ミッション）完了後の最初のキュー投入時。
それ以降に投入される全ミッションは v4 テンプレ必須。既存キューの v3 ミッションは
そのまま実行可（後方互換を2セッションのみ許容）。
```


#### B. sub_testing.md §9 新設「統合E2Eテスト（cmd-e2e）の定義」

sub_testing.md の末尾（現行 §8 test_meta.json テンプレートの後）に §9 を新設。

```
§9. 統合E2Eテスト（cmd-e2e）の定義

Step 0 (参照Read): §C2 動作検証規範 を Read して遵守する。

### 9.1 統合E2Eの判定基準
「複数画面・複数状態をまたぐユーザーシナリオ」を1テストで完走させる。
単一画面の操作のみで完結する場合は §5.1 マトリクスの任意扱い。

判定:
- 画面数 ≥ 2 → 統合E2E必須
- 状態遷移 ≥ 2回 → 統合E2E必須
- 認証を含む → 統合E2E必須（画面数に関わらず）
- API実装 → 統合E2E必須（フロント→API→DB→フロントの往復検証）

### 9.2 必須パターン
統合E2Eで検証する4パターン:

**パターン1: 画面遷移完走**
画面A → 操作 → 画面B → データ永続化 → 画面Aに戻る → データが反映されている

**パターン2: 状態保持**
書き込み → リロード → 表示維持 → 再操作 → 正常動作

**パターン3: エラー分岐**
失敗操作（不正入力/ネットワーク失敗）→ エラー表示 → 回復操作 → 成功

**パターン4: 認証維持**
ログイン → 保護ルート → リロード → 認証維持 → ログアウト → 保護ルート拒否

### 9.3 実装テンプレート
dev-system/templates/test_e2e_integration_template.ts を使用。init_app.sh 実行時に
アプリ側の tests/e2e/integration/ にコピーされる。

```typescript
// dev-system/templates/test_e2e_integration_template.ts
import { test, expect } from '@playwright/test';

test.describe('Integration E2E: MISSION-ID', () => {
  // パターン1: 画面遷移完走
  test('画面A→操作→画面B→データ永続化→画面A', async ({ page }) => {
    await page.goto('/screen-a');
    await page.screenshot({ path: 'evidence/MISSION-ID/p1-1-before.png' });
    await page.click('[data-action="navigate-to-b"]');
    await page.waitForURL(/\/screen-b/);
    // 操作
    await page.fill('[data-field="input"]', 'test-data');
    await page.click('[data-action="save"]');
    // 画面Aに戻る
    await page.click('[data-action="back"]');
    await page.waitForURL(/\/screen-a/);
    // データ反映
    await expect(page.locator('[data-display="saved-data"]')).toContainText('test-data');
    await page.screenshot({ path: 'evidence/MISSION-ID/p1-2-after.png' });
  });

  // パターン2〜4 は同様のパターンで記述（app固有に書き換え）
});
```

### 9.4 localhostとrealworldの棲み分け
- cmd-e2e: localhost（開発ビルド）に対して実行。playwright.config.ts
- cmd-realworld: デプロイ先URL（$DEPLOY_URL）に対して実行。playwright.realworld.config.ts
- 同じテストコードを両方で使い回せるように baseURL のみ差し替える構成にする
- cmd-e2e は開発中の高速フィードバック、cmd-realworld はデプロイ後の最終検証
```

---

#### C. development_rules.md G7 拡張（v3.4 改訂）

現行 G7「仕様↔完了コマンド対応検証」を3区分対応に拡張。

```
### G7: 仕様↔完了コマンド対応検証（v3.4改訂）

Step 0 (参照Read): §C2 / §C6 を Read して遵守する。

ミッション定義に以下が全て存在することを検証:
1. ミッションタイプ宣言（> ミッションタイプ: ...）
2. cmd-unit（N/A の場合は理由付き）
3. cmd-e2e（N/A の場合は理由付き）
4. cmd-realworld（N/A の場合は理由付き）

検証: scripts/mission_linter.sh（sub_infrastructure.md §2.4 v3.4改訂版）
```


#### D. scripts/mission_linter.sh v3.4 改訂

sub_infrastructure.md §2.4 mission_linter.sh に v3.4 拡張を追加。現行 linter の検証に加えて以下を追加。

```bash
# --- v3.4 追加: ミッションタイプ宣言 + 3区分コマンド存在検証 ---

# ミッションタイプ宣言必須
if ! echo "$BLOCK" | grep -q "^> ミッションタイプ:"; then
  echo "FAIL: $MISSION — ミッションタイプ宣言が不足（> ミッションタイプ: ...）"; FAIL=1
fi

# 3区分コマンドの存在検証
for CMD in "cmd-unit" "cmd-e2e" "cmd-realworld"; do
  if ! echo "$BLOCK" | grep -q "^[[:space:]]*${CMD}:"; then
    echo "FAIL: $MISSION — $CMD が不足"; FAIL=1
  fi
done

# ミッションタイプ別必須マトリクス検証（§5.1準拠）
TYPE=$(echo "$BLOCK" | grep "^> ミッションタイプ:" | sed 's/.*ミッションタイプ:[[:space:]]*//')

case "$TYPE" in
  "認証"*|*"認証・セッション関連"*)
    # 認証系は cmd-realworld 必須（N/A不可）
    if echo "$BLOCK" | grep -qE "cmd-realworld:[[:space:]]*N/A"; then
      echo "FAIL: $MISSION — 認証系で cmd-realworld: N/A は禁止（§5.1 例外なし）"; FAIL=1
    fi
    ;;
  *"デプロイ系"*)
    # デプロイ系は cmd-realworld 必須
    if echo "$BLOCK" | grep -qE "cmd-realworld:[[:space:]]*N/A"; then
      echo "FAIL: $MISSION — デプロイ系で cmd-realworld: N/A は禁止（§5.1 例外なし）"; FAIL=1
    fi
    ;;
  *"画面実装（複数画面"*)
    # 複数画面は cmd-realworld 必須
    if echo "$BLOCK" | grep -qE "cmd-realworld:[[:space:]]*N/A"; then
      echo "FAIL: $MISSION — 複数画面実装で cmd-realworld: N/A は禁止（§5.1）"; FAIL=1
    fi
    ;;
esac

# N/A 宣言時の理由必須
for CMD in "cmd-unit" "cmd-e2e" "cmd-realworld"; do
  if echo "$BLOCK" | grep -qE "^[[:space:]]*${CMD}:[[:space:]]*N/A[[:space:]]*$"; then
    echo "FAIL: $MISSION — $CMD: N/A は理由記載必須（N/A — 理由）"; FAIL=1
  fi
done
```

既存の曖昧用語チェック・FAIL条件・参照ファイル検証は v3 と同じ。

---

#### E. templates/mission_template_v2.md v3 化（実態は v4 仕様）

現行ファイル名 `mission_template_v2.md` のファイル名を維持したまま、内容を v4 仕様に更新する（ファイル名変更は参照元の連鎖更新コストが高いため v3 と呼び、内容で v4 を表現）。

**ファイル名:** `templates/mission_template_v2.md`（変更なし）  
**内容のバージョン表記:** ファイル冒頭で「# ミッション定義テンプレート v3（実装: v4仕様準拠）」と明記

テンプレート本文は §5.2 の内容をコピー。init_app.sh 経由で新アプリに配布される。

---

#### F. dev-system/templates/test_e2e_integration_template.ts 新設

sub_testing.md §9.3 に記載したテンプレートを、物理ファイルとして dev-system 側に配置。
init_app.sh が新アプリの tests/e2e/integration/ にコピーする。

内容: §9.3 のコードブロック参照。

---

#### G. 改訂案④ のサマリー

**D1・D2 の2点解消:**

| 抜け | 対応 |
|-----|-----|
| D1（完了コマンド粒度不統一） | cmd-unit / cmd-e2e / cmd-realworld の3区分必須化 |
| D2（認証関連と画面実装の区別なし） | ミッションタイプ別必須マトリクス（認証・デプロイ・複数画面は cmd-realworld 必須） |

**連鎖更新:**

| 種別 | ファイル | 変更内容 |
|-----|---------|---------|
| 改訂 | dev_system_spec.md §5 | v3→v4 全面改訂（§5.0 原則 / §5.1 マトリクス / §5.2 テンプレ / §5.3 移行ルール） |
| 新設 | sub_testing.md §9 | 統合E2Eテスト（cmd-e2e）の定義 |
| 改訂 | sub_infrastructure.md §2.4 mission_linter.sh | v3.4 拡張（3区分 + マトリクス検証） |
| 改訂 | development_rules.md G7 | 3区分コマンド対応に拡張 |
| 改訂 | templates/mission_template_v2.md | 内容を v4 仕様に更新（ファイル名は維持） |
| 新設 | dev-system/templates/test_e2e_integration_template.ts | §9.3 テンプレ物理ファイル化 |
| 新設 | dev-system/templates/playwright.realworld.config.ts | （改訂案②で既に新設済み。§9.4 で参照） |

**想定ボリューム:**
- §5 改訂: 約70行
- §5.1 マトリクス: 約15行
- §5.3 移行ルール: 約10行
- sub_testing.md §9 新設: 約60行
- development_rules.md G7 拡張: 約10行
- mission_linter.sh v3.4 拡張: 約35行
- **dev_system_spec.md 増加分: 約90行**
- **sub_testing.md 増加分: 約60行**

**既存ルールとの整合性:**
- §C2 動作検証規範 準拠: 3区分全てでスクショ判定必須（DOM API禁止）
- §4.6 G8 TDD証跡: before.json（RED）/ after.json（GREEN）が cmd-unit / cmd-e2e 両方で必須
- §7 3層テスト戦略: L1（cmd-realworld に相当）/ L2（cmd-e2e に相当）/ L3（週次フル）との対応関係を明確化
- §4.5 SKIPルール: N/A は明示宣言のみ許容（暗黙SKIP禁止。理由なしの N/A も禁止）
- §13.16 Learned Patterns: cmd-unit での指摘パターンを LP 蓄積対象に追加（LP-{番号}-unit タグ付け）

**注意事項（レビュー時の確認ポイント）:**
- 「画面実装（単一画面）」での cmd-realworld 任意扱いは M5ログインループ再発リスクを残す。
  レビュアーは「単一画面でも認証を含む場合は必須にすべきか」を検討する
- 「リファクタリング（挙動変化なし）」の regression 検証は cmd-e2e のみ必須。
  cmd-unit を任意としたが、関数名変更・モジュール分割等でも cmd-unit 必須にすべきか検討
- v3→v4 後方互換を2セッション許容しているが、これで十分か PO判断


---

### 改訂案⑤ §10.4 サブディレクトリ構成 + init_app.sh --subdir オプション + G13 新設

**目的:** B1（サブディレクトリ構築手順未定義）/ B2（hooks/scripts の cwd 未定義）/ B3（ゲート発火トリガー確認なし）の3点抜けを解消。

**コンセプト:**
- 親リポジトリ内のサブディレクトリで新規アプリを構築する構成を正式サポート
- 親 pre-commit に連鎖ロジックを追加することで、サブディレクトリでも G10 が確実に発火
- canopy 発火ログを永続化し、「実際に検証が実行されたか」を追跡可能にする

---

#### A. §10.4 拡張「ディレクトリ構成」v3.4

現行 §10.4 は「dev-system/とアプリ側の構成詳細: sub_infrastructure.md §1」のみの薄い記述。以下に拡張。

```
§10.4 ディレクトリ構成

Step 0 (参照Read): §C1 / §C3 を Read して遵守する。

### 10.4.1 標準構成（リポジトリ=アプリ）
詳細: sub_infrastructure.md §1.2

### 10.4.2 サブディレクトリ構成（親リポジトリとの共存。v3.4 新設）

親リポジトリ（例: goal-ai-worker/）内のサブディレクトリ（例: lais/）で新規アプリを
構築する場合の構成を定義する。Lais の M1〜M5 で実績あり。

構成図:
```
parent-repo/（既存の親リポジトリ）
├── .git/hooks/pre-commit       ← 親の pre-commit が全ての変更をフック
├── .gitignore                  ← サブディレクトリ用パターンを追加
├── goal-ai/                    ← 既存アプリ（触らない）
└── lais/                       ← 新規サブディレクトリアプリ
    ├── CLAUDE.md
    ├── development_rules.md
    ├── .dev-system.version
    ├── app_config.yaml
    ├── instructions/
    ├── evidence/
    ├── tests/
    ├── scripts/                ← 親共通ではなくサブディレクトリ専用
    ├── docs/
    ├── frontend/ or src/
    └── .git/hooks/pre-commit-sub  ← 親 pre-commit から cd 後に呼ばれる
```

### 10.4.3 親リポジトリ側の必須設定

親リポジトリに以下が存在すること:

1. `.git/hooks/pre-commit` にサブディレクトリ連鎖ロジック追加（init_app.sh が冪等に追記）:
   ```bash
   # Sub-app hook chain: <SUBDIR_NAME>
   CHANGED_FILES=$(git diff --cached --name-only)
   if echo "$CHANGED_FILES" | grep -q "^<SUBDIR_NAME>/"; then
     (cd "<SUBDIR_NAME>" && [ -f .git/hooks/pre-commit-sub ] && bash .git/hooks/pre-commit-sub || exit 1)
   fi
   ```

2. `.gitignore` にサブディレクトリ用パターン追加:
   ```
   # Sub-app: <SUBDIR_NAME>
   <SUBDIR_NAME>/node_modules/
   <SUBDIR_NAME>/dist/
   <SUBDIR_NAME>/.wrangler/
   <SUBDIR_NAME>/.env
   <SUBDIR_NAME>/.env.*
   !<SUBDIR_NAME>/.env.example
   <SUBDIR_NAME>/.dev.vars
   ```

3. dev-system VERSION ピンは各サブディレクトリの `.dev-system.version` で独立管理
   （親ルートの VERSION pin と同じでなくても可）

### 10.4.4 サブディレクトリアプリ側の必須設定

サブディレクトリ側（例: lais/）に以下が存在すること:

1. `.git/hooks/pre-commit-sub`（dev-system/templates/hooks/pre-commit-sub をコピー）
2. `tests/smoke/canopy.sh`（標準のcanopy。親の .git から独立）
3. `scripts/` シンボリックリンクは dev-system/ へ直接向ける（親の scripts/ と共有しない）
4. `.dev-system.version`（親ルートとは独立）

### 10.4.5 制約事項

- 同一親リポジトリ内に複数サブディレクトリアプリを共存させる場合、各アプリの
  dev-system VERSION pin は独立（同一バージョンでなくても可）
- サブディレクトリアプリのデプロイは親リポジトリのデプロイと分離すること
  （各アプリが独自の wrangler.toml / app_config.yaml を持つ）
- G10 シークレット検出は親 pre-commit と子 pre-commit-sub の両方で実行される
  （親: 全体ステージング対象、子: サブディレクトリ内のみ。二重検証）
- 親 pre-commit の連鎖ロジックは init_app.sh --subdir でのみ追加される
  （手動追加は禁止。修正漏れを防ぐため）

### 10.4.6 判定基準（標準 vs サブディレクトリ）

新規アプリ構築時の構成選択:

| 条件 | 構成 |
|------|------|
| 独立リポジトリとして管理したい | 標準（§10.4.1） |
| 既存リポジトリの一部として管理したい | サブディレクトリ（§10.4.2） |
| 複数アプリを同時管理したい | サブディレクトリ（複数並存可） |
| CI/CD が独立している | 標準 |
| 親リポジトリと同じ CI/CD に相乗りしたい | サブディレクトリ |

どちらも dev-system VERSION pin + canopy + G10 が機能する。
```


#### B. sub_infrastructure.md §2.1 init_app.sh --subdir オプション追加

現行 init_app.sh に `--subdir` オプション処理を追加。既存ロジックは維持したまま、サブディレクトリモード時のみ追加処理を実行する。

```bash
#!/bin/bash
set -euo pipefail
APP_DIR=${1:-}
DEV_SYSTEM=${DEV_SYSTEM_DIR:-"$(cd "$(dirname "$0")/.." && pwd)"}

# --- v3.4 追加: --subdir オプション解析 ---
SUBDIR_MODE=false
FRONTEND=""
for ARG in "$@"; do
  case "$ARG" in
    --subdir) SUBDIR_MODE=true ;;
    --frontend=*) FRONTEND="${ARG#*=}" ;;
  esac
done

if [ -z "$APP_DIR" ]; then
  echo "Usage: init_app.sh /path/to/new-app [--subdir] [--frontend=preact]"; exit 1
fi

# 標準の mkdir / cp / SYMLINKS 処理（既存のまま）
# ...

# --- v3.4 追加: サブディレクトリモード時の追加処理 ---
if [ "$SUBDIR_MODE" = "true" ]; then
  PARENT_DIR=$(dirname "$APP_DIR")
  SUBDIR_NAME=$(basename "$APP_DIR")
  
  echo "=== Sub-app mode: parent=$PARENT_DIR, subdir=$SUBDIR_NAME ==="
  
  # 親リポジトリの存在確認
  if [ ! -d "$PARENT_DIR/.git" ]; then
    echo "ERROR: Parent $PARENT_DIR is not a git repository"; exit 1
  fi
  
  # 1. 親 .gitignore にサブディレクトリパターン追記（冪等）
  GITIGNORE_BLOCK="# Sub-app: $SUBDIR_NAME
$SUBDIR_NAME/node_modules/
$SUBDIR_NAME/dist/
$SUBDIR_NAME/.wrangler/
$SUBDIR_NAME/.env
$SUBDIR_NAME/.env.*
!$SUBDIR_NAME/.env.example
$SUBDIR_NAME/.dev.vars"
  
  if [ ! -f "$PARENT_DIR/.gitignore" ]; then
    touch "$PARENT_DIR/.gitignore"
  fi
  if ! grep -q "# Sub-app: $SUBDIR_NAME" "$PARENT_DIR/.gitignore"; then
    echo "" >> "$PARENT_DIR/.gitignore"
    echo "$GITIGNORE_BLOCK" >> "$PARENT_DIR/.gitignore"
    echo "  → Added .gitignore entries for $SUBDIR_NAME"
  fi
  
  # 2. 親 pre-commit に連鎖ロジック追記（冪等）
  PARENT_HOOK="$PARENT_DIR/.git/hooks/pre-commit"
  # 親 pre-commit がなければ新規作成
  if [ ! -f "$PARENT_HOOK" ]; then
    echo '#!/bin/bash' > "$PARENT_HOOK"
    echo 'set -euo pipefail' >> "$PARENT_HOOK"
    chmod +x "$PARENT_HOOK"
  fi
  if ! grep -q "Sub-app hook chain: $SUBDIR_NAME" "$PARENT_HOOK"; then
    cat >> "$PARENT_HOOK" << EOF

# Sub-app hook chain: $SUBDIR_NAME
CHANGED_FILES=\$(git diff --cached --name-only)
if echo "\$CHANGED_FILES" | grep -q "^$SUBDIR_NAME/"; then
  (cd "$SUBDIR_NAME" && [ -f .git/hooks/pre-commit-sub ] && bash .git/hooks/pre-commit-sub || exit 1)
fi
EOF
    echo "  → Added hook chain to parent pre-commit for $SUBDIR_NAME"
  fi
  
  # 3. サブディレクトリ側の pre-commit-sub 配置
  mkdir -p "$APP_DIR/.git/hooks"
  if [ -f "$DEV_SYSTEM/templates/hooks/pre-commit-sub" ]; then
    cp "$DEV_SYSTEM/templates/hooks/pre-commit-sub" "$APP_DIR/.git/hooks/pre-commit-sub"
    chmod +x "$APP_DIR/.git/hooks/pre-commit-sub"
    echo "  → Installed pre-commit-sub in $APP_DIR"
  else
    echo "WARN: $DEV_SYSTEM/templates/hooks/pre-commit-sub not found"
  fi
  
  # 4. サブディレクトリアプリの dev-system VERSION pin（独立）
  cp "$DEV_SYSTEM/VERSION" "$APP_DIR/.dev-system.version"
  
  echo "✅ Sub-app mode initialized for $APP_DIR"
  echo "  Parent: $PARENT_DIR"
  echo "  VERSION pin: $(cat $APP_DIR/.dev-system.version)"
fi

# --frontend=preact オプション処理（既存）
# ...

echo "✅ $APP_DIR initialized (dev-system $(cat $APP_DIR/.dev-system.version))"
```


#### C. dev-system/templates/hooks/pre-commit-sub 新設

サブディレクトリアプリ用 pre-commit。親 pre-commit から `cd <SUBDIR> && bash .git/hooks/pre-commit-sub` で呼ばれる。

```bash
#!/bin/bash
set -euo pipefail
# サブディレクトリアプリ用 pre-commit（§10.4.2 v3.4）
# cwd: サブディレクトリ（例: lais/）
# 呼び出し元: 親 .git/hooks/pre-commit の「Sub-app hook chain」ブロック

SUBDIR=$(basename $(pwd))

# --- G10: シークレット検出（サブディレクトリ内のみ） ---
CHANGED=$(git diff --cached --name-only 2>/dev/null | grep "^${SUBDIR}/" | sed "s|^${SUBDIR}/||" || echo "")
if [ -n "$CHANGED" ]; then
  for FILE in $CHANGED; do
    [ -f "$FILE" ] || continue
    # .example / .md は除外（ドキュメント内のパターン説明）
    echo "$FILE" | grep -qE '\.(example|md)$' && continue
    # G10検出パターン（§20.2）
    if grep -qE 'sk-[a-zA-Z0-9]{20,}|sk-ant-[a-zA-Z0-9_-]{20,}|AIza[a-zA-Z0-9_-]{35}|ghp_[a-zA-Z0-9]{36}|service_role\s*[=:]\s*ey|-----BEGIN (RSA |EC )?PRIVATE KEY' "$FILE"; then
      echo "FAIL: G10 secret detected in $FILE (sub-app: $SUBDIR)"; exit 1
    fi
  done
fi

# --- canopy 発火（軽量版。サブディレクトリ内のみ） ---
if [ -f "tests/smoke/canopy.sh" ]; then
  bash tests/smoke/canopy.sh || exit 1
fi

exit 0
```

配置: `dev-system/templates/hooks/pre-commit-sub`（新設）
init_app.sh --subdir 実行時に `$APP_DIR/.git/hooks/pre-commit-sub` にコピーされる。

---

#### D. canopy G13 新設「pre-commit フック存在検証」

sub_infrastructure.md §2.6 canopy_common.sh に G13 を追加。

```bash
# --- G13: pre-commit フック存在検証（v3.4 新設） ---
# サブディレクトリモード判定: .dev-system.version と親 .git の存在で判定
HOOK_STATE=""
if [ -f ".dev-system.version" ]; then
  PARENT_DIR=$(cd .. 2>/dev/null && pwd || echo "")
  if [ -n "$PARENT_DIR" ] && [ -d "$PARENT_DIR/.git" ]; then
    # サブディレクトリモード
    HOOK_STATE="subdir"
    SUBDIR=$(basename $(pwd))
    PARENT_HOOK="$PARENT_DIR/.git/hooks/pre-commit"
    
    # 親 pre-commit に連鎖ロジックがあるか
    if [ ! -f "$PARENT_HOOK" ]; then
      echo "FAIL: G13 parent pre-commit not found at $PARENT_HOOK"; FAIL=1
    elif ! grep -q "Sub-app hook chain: $SUBDIR" "$PARENT_HOOK"; then
      echo "FAIL: G13 parent pre-commit missing hook chain for $SUBDIR"; FAIL=1
    fi
    
    # サブディレクトリ側 pre-commit-sub 存在
    if [ ! -f ".git/hooks/pre-commit-sub" ]; then
      echo "FAIL: G13 pre-commit-sub not installed in $SUBDIR"; FAIL=1
    elif [ ! -x ".git/hooks/pre-commit-sub" ]; then
      echo "FAIL: G13 pre-commit-sub not executable"; FAIL=1
    fi
  fi
fi

# スタンドアロンモード（または判定不可）
if [ -z "$HOOK_STATE" ] || [ "$HOOK_STATE" = "standalone" ]; then
  if [ -d ".git" ]; then
    HOOK_PATH=".git/hooks/pre-commit"
    if [ ! -f "$HOOK_PATH" ]; then
      echo "FAIL: G13 pre-commit hook not installed at $HOOK_PATH"; FAIL=1
    elif [ ! -x "$HOOK_PATH" ]; then
      echo "FAIL: G13 pre-commit not executable"; FAIL=1
    fi
  fi
fi
```

---

#### E. canopy 発火ログ永続化（B3 対応）

canopy_common.sh の末尾に追加。「canopyが実際に発火したか」の履歴を残す。

```bash
# --- canopy 発火ログ永続化（v3.4 新設。B3 対応） ---
TODAY=$(date '+%Y-%m-%d')
CANOPY_LOG_DIR="instructions/results"
CANOPY_LOG_FILE="$CANOPY_LOG_DIR/canopy_fired_${TODAY}.log"
mkdir -p "$CANOPY_LOG_DIR"

# JSONL 形式で追記（1行1発火）
echo "{\"timestamp\":\"$(date -Iseconds)\",\"result\":\"$([ $FAIL -eq 0 ] && echo PASS || echo FAIL)\",\"fail_count\":$FAIL,\"duration_s\":$DURATION}" >> "$CANOPY_LOG_FILE"
```

棚卸し時の検証（§15.3 項目11 として追加）:
```
11. canopy 発火履歴確認（v3.4 新設）
    - 直近5セッションで canopy_fired_*.log が存在するか
    - 存在しない場合、G13 が発火していない可能性 → 要調査
```


#### F. sub_infrastructure.md §2.2 update_app.sh サブディレクトリ対応

update_app.sh にも `--subdir` モード対応を追加。既存アプリが v3.3 → v3.4 にアップデートする際、サブディレクトリ構成であれば親 hook の連鎖ロジックを再確認・再インストールする。

```bash
# --- v3.4 追加: サブディレクトリモード時の親 hook 再検証 ---
if [ -f "$APP_DIR/.dev-system.version" ]; then
  PARENT_DIR=$(dirname "$APP_DIR")
  if [ -d "$PARENT_DIR/.git" ] && [ "$APP_DIR" != "$PARENT_DIR" ]; then
    SUBDIR_NAME=$(basename "$APP_DIR")
    PARENT_HOOK="$PARENT_DIR/.git/hooks/pre-commit"
    
    # 親 pre-commit に連鎖ロジックが存在するか確認、なければ追加
    if [ -f "$PARENT_HOOK" ]; then
      if ! grep -q "Sub-app hook chain: $SUBDIR_NAME" "$PARENT_HOOK"; then
        cat >> "$PARENT_HOOK" << EOF

# Sub-app hook chain: $SUBDIR_NAME
CHANGED_FILES=\$(git diff --cached --name-only)
if echo "\$CHANGED_FILES" | grep -q "^$SUBDIR_NAME/"; then
  (cd "$SUBDIR_NAME" && [ -f .git/hooks/pre-commit-sub ] && bash .git/hooks/pre-commit-sub || exit 1)
fi
EOF
        echo "  → Re-added hook chain to parent pre-commit for $SUBDIR_NAME"
      fi
    fi
    
    # pre-commit-sub の最新版を再配置
    if [ -f "$DEV_SYSTEM/templates/hooks/pre-commit-sub" ]; then
      cp "$DEV_SYSTEM/templates/hooks/pre-commit-sub" "$APP_DIR/.git/hooks/pre-commit-sub"
      chmod +x "$APP_DIR/.git/hooks/pre-commit-sub"
    fi
  fi
fi
```

---

#### G. 改訂案⑤ のサマリー

**B1・B2・B3 の3点解消:**

| 抜け | 対応 |
|-----|-----|
| B1（サブディレクトリ構築手順未定義） | §10.4.2〜§10.4.6 新設 + init_app.sh --subdir |
| B2（hooks/scripts の cwd 未定義） | §10.4.3 親 pre-commit 連鎖ロジック + pre-commit-sub テンプレート |
| B3（ゲート発火トリガー確認なし） | G13 新設（hook存在検証）+ canopy 発火ログ永続化 |

**連鎖更新:**

| 種別 | ファイル | 変更内容 |
|-----|---------|---------|
| 改訂 | dev_system_spec.md §10.4 | §10.4.2〜§10.4.6 サブディレクトリ構成定義 |
| 改訂 | sub_infrastructure.md §1.1 | ディレクトリ構成にサブディレクトリパターン追記 |
| 改訂 | sub_infrastructure.md §2.1 init_app.sh | --subdir オプション追加 |
| 改訂 | sub_infrastructure.md §2.2 update_app.sh | サブディレクトリ対応 |
| 改訂 | sub_infrastructure.md §2.6 canopy_common.sh | G13 + 発火ログ追加 |
| 改訂 | dev_system_spec.md §4.1 | G13 追加 |
| 改訂 | dev_system_spec.md §15.3 | 項目11（canopy発火履歴）追加 |
| 新設 | dev-system/templates/hooks/pre-commit-sub | サブディレクトリ用 pre-commit テンプレート |

**想定ボリューム:**
- §10.4 拡張: 約90行
- init_app.sh --subdir: 約60行
- pre-commit-sub テンプレ: 約25行
- G13 新設: 約30行
- canopy 発火ログ: 約10行
- update_app.sh 拡張: 約25行
- **dev_system_spec.md 増加分: 約100行**
- **sub_infrastructure.md 増加分: 約150行**

**既存ルールとの整合性:**
- §C1（書き込み規約）準拠: init_app.sh は ADV 書き込みホワイトリスト外（スクリプト実行）。ENG が実行する
- §C3（連鎖更新規範）準拠: 親 pre-commit + サブディレクトリ hook + VERSION pin を一括セットアップ
- §C6（セキュリティ規範）準拠: G10 を親・子の両方で二重検証
- §4.1 G10（既存）との整合: pre-commit-sub は G10 パターンを共有（§20.2）
- Lais の M1〜M5 実績に基づく構成（goal-ai-worker/lais/ の実装パターン）

**リスクと緩和策:**

- **リスク1:** 既存の親 pre-commit を上書きする可能性
  - 緩和: 冪等追記（`grep -q "Sub-app hook chain: $SUBDIR_NAME"` で既存確認）
  - 初回のみ pre-commit がなければ新規作成、既存があれば追記のみ
- **リスク2:** 複数サブディレクトリアプリ間での連鎖ロジックの順序依存
  - 緩和: 各 SUBDIR_NAME が独立した連鎖ブロックを持つ（名前空間分離）
  - 実行順序は追加順（後から追加したものが後実行）
- **リスク3:** pre-commit-sub 内の canopy が重くなる
  - 緩和: G8/G9 の重いチェックは commit 時ではなく push 時に移す（将来対応）
  - 現時点では G1 / G10 / G13 等の軽量チェックのみを pre-commit-sub で実行
- **リスク4:** 親の CI が子の変更も検知してしまう
  - 緩和: 親 .github/workflows 側で paths filter を設定（init_app.sh では自動設定せず、
    アプリ側で手動設定。将来的にテンプレ化を検討）


---

### 改訂案⑥ sub_review_flow §4.H 新設（統合フローレビュー）

**目的:** 既存のレビューフロー7種別（A〜G）が捕捉できない「画面間遷移・実機環境依存・外部連携・認証横断」の問題を検出する統合レビューカテゴリを新設する。Lais M5 ログインループ事案の根本分析から、G_40 3AI合議で「7種別では盲点」と判断。

**注意:** 本改訂案は22点抜けには該当しない。G_40 で確定した追加改訂案。改訂案②（§8 Step 12 実機スモーク）と対をなし、実装フローとレビュー体系の両面で統合検証を成立させる。

**コンセプト:**
- 単一画面の品質はA/Dで保証、横断シナリオはHで保証
- デプロイ後の本番環境に対するレビューも含める（実機証跡必須）
- 主審制なし・ペルソナ3人（§3.2 Eフロー型）

---

#### A. sub_review_flow.md §4.H 新設

sub_review_flow.md §4 に以下を追加（現行 §4.G の直後）。

```
### H. 統合フローレビュー（v3.4 新設）

**対象:** 複数画面・複数コンポーネント・実機環境をまたぐ統合シナリオ

**発動タイミング:**
- Phase A 完了後（全画面実装完了時）
- 認証・決済・外部連携を含む大型機能の実装完了後
- デプロイ後の本番環境に対して（§8 Step 12 実機スモークと併用）

**フロー:** 3.2（主審制なし。ペルソナ3人毎回全員）

| ペルソナ | 役割 |
|---------|------|
| integration_tester | 画面間遷移・状態保持・データ整合性・エラー伝播 |
| end_user | 実際のユーザー体験・操作の自然さ・エラーからの回復性 |
| security_auditor | セッション管理・認証バイパス・権限昇格・CSRF・外部連携の秘密情報 |

**CRITICAL追加定義:**
- 複数画面にまたがる状態破壊（ログイン後のデータが他画面で表示されない等）
- 認証セッションの消失（リロード後に再ログイン要求される等）
- 本番環境のみで発現する問題（CORS / リダイレクト / キャッシュ / CDN）
- 外部サービス連携の設定ミス（Stripe webhook URL / Supabase redirect URLs 等）
- 画面遷移中のデータロス（遷移時に入力が消える、保存済みデータが見えない）

**ステージスコープ:**
- IN: 画面間遷移、認証維持、データ整合性、実機環境依存問題、外部連携検証
- OUT: 単一画面の見た目（A）、単一画面の実装詳細（D）、API単体仕様（E）

**対象ファイル/成果物:**
- 実装完了した複数画面のセット（src/ + frontend/ の全量）
- §8 Step 12 実機スモークのスクショ + 動画（evidence/deploy-${VERSION}/）
- app_config.yaml の external_services セクション
- 本番URLへの curl / fetch 疎通結果
- Supabase / Stripe / OAuth の設定ダッシュボードのスクショ（手動撮影）

**差分について:**
- 単一画面の差分ではなく、「画面Aと画面B間の遷移シナリオ」全体が差分対象
- 画面Aのみ変更でも、連携する画面Bの影響を必ずレビュー（A→B遷移テストを実行）

**上限:** §1.7 に準拠
- Pre-Review: 最大3回
- 主審diff: 該当なし（主審制なし）
- ゴールデン: 最大2回
- 上限超過 → POエスカレーション

**Code Pre-Review（実行必須）:**
Pre-Review フェーズで Code が以下を事前検証する:
1. §7 L1 スモーク5項目の通過（L1-1 起動 / L1-2 認証 / L1-3 主機能A / L1-4 主機能B or AI / L1-5 データ永続化）
2. 認証フロー完走（サインイン → ダッシュボード → リロード後も認証維持）
3. 主要な画面間遷移5パターン以上の完走（app固有に選定）
4. §8 Step 10-12 の実機検証スクショが evidence/ に全て存在するか
5. external_services 設定と実設定の整合性（verify_external_services.sh の出力）

Pre-Review で CRITICAL 0 になるまで外部APIに回さない（コスト節約）。

**出力:**
lais/verify/review_integration_{mission}_r{N}_{model}_{persona}.json
命名規則は他フローと統一（§13.15.4 ai_review.js 実装要件準拠）。

**既存フローとの連動:**
- §8 Step 12 実機スモークが PASS してから H フロー実施
- H フロー収束後、§4.D 実装レビューの CRITICAL 0 と併せて最終リリース判定
- H フローで発見された問題は、発生源（A/B/C/D/E/F/G いずれか）にフィードバック
  例: 画面A→B遷移でデータロスが発見 → Dフロー（実装）で該当画面の修正 → H再実行

**severity inflation 対策:**
H フローは統合シナリオを対象とするため、同一の根本原因から複数の派生指摘が
生まれやすい。§13.9 準拠で以下を適用:
- 同一テーマが3R連続でCRITICAL指摘 → 棄却検討（ADV判断）
- 派生指摘は1件にマージ（親指摘 + 影響範囲リスト）
```


#### B. sub_review_flow.md §5 成果物×フローマッピング拡張

現行 §5 の表に「統合シナリオ」行を追加。

```
| 成果物 | フロー | ペルソナ数 | 初回APIコール数 |
|--------|--------|----------|---------------|
| デザインモックアップ | A | 6 | 12本 |
| lais_project_v1.md | B | 8 | 16本 |
| lais_ux_v1.md | B | 8 | 16本 |
| lais_design_system.md | B | 8 | 16本 |
| lais_design_spec_v1.md | B | 8 | 16本 |
| dev_system_spec.md + サブ4本 | C | 5 | 10本 |
| CLAUDE.md / development_rules.md | C | 5 | 10本 |
| 実装コード（src/frontend/） | D | 6 | 12本 |
| reference_v1.md / system_map.md | E | 3 | 6本 |
| e2e_fullflow_test.md | F | 3 | 6本 |
| AIプロンプト設計 | G | 3 | 6本 |
| **統合シナリオ（Phase A完了後/大型機能後/デプロイ後）** ※v3.4新設 | **H** | **3** | **6本** |
```

---

#### C. sub_review_flow.md §7 棲み分け表拡張

現行 §7「デザインレビュー(A)と実装レビュー(D)の棲み分け」を A/D/H の3カテゴリに拡張。

```
## 7. レビューフロー別の棲み分け（v3.4 改訂）

| 観点 | A（デザイン） | D（実装） | H（統合フロー） |
|------|-----------|---------|--------------|
| DSトークン整合 | ✅ CRITICAL | 検証済み前提 | 対象外 |
| 単一画面UX仕様 | ✅ CRITICAL | ✅ 動作で再検証 | 対象外 |
| **画面間遷移・連携** | 対象外 | ⚠ 個別検証 | ✅ CRITICAL |
| **認証セッション横断** | 対象外 | ⚠ 個別検証 | ✅ CRITICAL |
| **実機環境依存問題** | 対象外 | 対象外 | ✅ CRITICAL |
| **外部サービス連携設定** | 対象外 | ✅ HIGH | ✅ CRITICAL |
| **デプロイ後の挙動** | 対象外 | 対象外 | ✅ CRITICAL |
| WCAG フォーカスリング | OUT | ✅ CRITICAL | 対象外（Dで検証済み） |
| WCAG タップ44px | OUT | ✅ CRITICAL | 対象外（Dで検証済み） |
| WCAG ARIA | OUT | ✅ CRITICAL | 対象外（Dで検証済み） |
| テキストコントラスト | ✅ IN | ✅ 再検証 | 対象外 |
| セキュリティ | 対象外 | ✅ CRITICAL（単体脆弱性） | ✅ CRITICAL（セッション・CSRF） |
| パフォーマンス | 対象外 | ✅ HIGH | ⚠ 実機応答時間のみ |
| ブランドDNA違反 | ✅ CRITICAL | 対象外 | 対象外 |
```

---

#### D. sub_review_flow.md §8.4 新設ペルソナ3種定義

sub_review_flow.md §8「ペルソナプロンプト管理」に §8.4 を追加。

```
### 8.4 v3.4 新設ペルソナ（H フロー用）

以下の3ペルソナを templates/review_personas/ に新設する。

**integration_tester.md**
- 役割: 画面間遷移・状態保持・データ整合性・エラー伝播の検証
- 観点:
  - 「画面Aの操作が画面Bに正しく反映されるか」
  - 「途中エラーで戻り先が保たれるか」
  - 「同時操作時のデータ競合は起きないか」
  - 「非同期処理（API待ち中の画面遷移）で状態が破壊されないか」
- スコープ:
  - IN: 画面間連携、状態管理、データ整合性、エラーハンドリング、非同期処理
  - OUT: 単一画面のUX、単一APIの実装、デザイントークン

**end_user.md**（H フロー用。既存B/Fの end_user とは観点が異なる）
- 役割: 実際のユーザー体験の自然さを、統合フロー全体で検証
- 観点:
  - 「このフローを初めて使う人が迷わないか」
  - 「想定外の操作で詰まらないか（戻るボタン連打 / ブラウザリロード / タブ複数開き）」
  - 「エラー時のリカバリーが自然か」
  - 「認証期限切れからの復帰が違和感ないか」
- スコープ:
  - IN: 操作の自然さ、エラーからの回復、期待と挙動のギャップ、全体シナリオの流れ
  - OUT: 実装詳細、技術的最適性、単一画面の見た目

**security_auditor.md**
- 役割: 統合フローの連携部分のセキュリティ検証
- 観点:
  - 「認証が連携途中で失われる経路はないか」
  - 「外部連携時の秘密情報が露出する経路はないか」
  - 「CSRFトークンがリダイレクト経由で失われないか」
  - 「認証済みユーザーが他ユーザーのデータを見られる経路がないか（IDOR）」
  - 「OAuth callback でのリダイレクト先検証が適切か」
- スコープ:
  - IN: セッション管理、認証バイパス、CSRF、IDOR、外部連携のAPIキー管理、
        リダイレクト挙動、クッキー/localStorage への秘密情報保管
  - OUT: 単体脆弱性（DはDで検証）、ブランドDNA、UX、性能
```

---

#### E. sub_review_flow.md §1.3 RACI 表への H フロー行追加

§1.3 RACI 表は既存で A/B/C/D フローに共通して適用されている。H フローも同様に適用。現行 §1.3 の記述変更は不要（「全フロー共通」と明示されているため）。

補足として §1.3 の末尾に以下を追記:

```
**H フローの補足:**
H フローは複数成果物をまたぐ統合シナリオを対象とするため、以下を特記事項とする:
- 実行は Code Pre-Review + 外部2プロバイダー × 3ペルソナ
- 結果記録は lais/verify/review_integration_{mission}_r{N}_{model}_{persona}.json
- Phase A 完了判定に含める（D と併せて両方CRITICAL 0 で Phase A 完了）
```


#### F. dev_system_spec.md §19.10 7種別→8種別化

現行 §19.10「AIレビューフロー（v3）」の「7種別」表を「8種別」に拡張。

```
### 19.10 AIレビューフロー（v3.4改訂）

Step 0 (参照Read): §C5 改善ループ規範 を Read して遵守する。

**詳細定義:** docs/plans/sub_review_flow.md

**基本原則（変更なし）:**
- ミッション = 「問題を見つける」ではなく「仕様通りか検証する」。問題なければPASS（空配列）
- 指摘数ノルマなし。各指摘に spec_reference（仕様引用）必須。引用なし→機械棄却
- 2プロバイダー（GPT-5 + Gemini 2.5 Pro）+ Code Pre-Review
- 妥当性判定: 7段階フィルター（事実確認→仕様照合→既決定→スコープ→合意度→影響度→影響範囲）

**8種別（v3.4改訂。v3.3 までの 7種別に H を追加）:**

| フロー | 対象 | ペルソナ数 | 主審 | 方式 |
|--------|------|----------|------|------|
| A. デザイン | モックアップ | 6 | web_designer + color_coordinator | 主審制 |
| B. アプリ仕様 | project/ux/DS/design_spec | 8 | pm + ux_researcher | 主審制 |
| C. dev-system | dev_system/CLAUDE.md/rules | 5 | devops_engineer + solo_dev | 主審制 |
| D. 実装 | src/frontend/テスト | 6 | code_reviewer + security_engineer | 主審制 |
| E. 技術文書 | reference/system_map | 3 | — | 毎回全員 |
| F. テスト仕様 | e2e_fullflow_test | 3 | — | 毎回全員 |
| G. プロンプト | AIプロンプト全般 | 3 | — | 毎回全員 |
| **H. 統合フロー** ※v3.4新設 | 画面間/実機/外部連携 | 3 | — | 毎回全員 |

**共通フロー（A-D）:** Code Pre-Review → 初回フル → 修正ラウンド（主審diff。上限4回）→ ゴールデン（全員フル。上限2回）
**共通フロー（E-H）:** Code Pre-Review → 毎ラウンド全員diff → ゴールデン（上限2回）
**上限超過 → POエスカレーション**

**Hフローの発動タイミング:**
- Phase A 完了後（全画面実装完了時）
- 認証・決済・外部連携を含む大型機能の実装完了後
- デプロイ後の本番環境に対して

詳細: sub_review_flow.md §4.H
```

---

#### G. 改訂案⑥ のサマリー

**新設（22点外。G_40 で方針確定済み追加改訂案）:**

| 項目 | 内容 |
|-----|-----|
| Hフロー新設 | integration_tester / end_user（H用）/ security_auditor の3ペルソナ |
| 発動タイミング | Phase A完了 / 大型機能完了 / デプロイ後 |
| スコープ | 画面間遷移・実機環境依存・外部連携・認証横断 |
| Code Pre-Review必須項目 | L1 5項目 + 認証完走 + 画面間遷移5+ + evidence/ + external_services |

**連鎖更新:**

| 種別 | ファイル | 変更内容 |
|-----|---------|---------|
| 新設 | sub_review_flow.md §4.H | 統合フローレビュー本体（94行） |
| 改訂 | sub_review_flow.md §5 | 成果物×フロー表に H 行追加 |
| 改訂 | sub_review_flow.md §7 | 棲み分け表を A/D/H 3カテゴリに拡張 |
| 新設 | sub_review_flow.md §8.4 | 新設ペルソナ3種定義 |
| 補足 | sub_review_flow.md §1.3 | H フロー補足追記 |
| 改訂 | dev_system_spec.md §19.10 | 7種別→8種別化 |
| 新設 | templates/review_personas/integration_tester.md | ペルソナプロンプト |
| 新設 | templates/review_personas/end_user_integration.md | ペルソナプロンプト（既存 end_user と区別） |
| 新設 | templates/review_personas/security_auditor.md | ペルソナプロンプト |

**想定ボリューム:**
- sub_review_flow.md §4.H 新設: 約75行
- sub_review_flow.md §5 / §7 / §8.4 / §1.3 補足: 約50行
- dev_system_spec.md §19.10 拡張: 約15行
- ペルソナプロンプト3本: 約100行（templates 側。sub_review_flow.md 内の定義で代替可）
- **sub_review_flow.md 増加分: 約125行（391行 → 516行）**
- **dev_system_spec.md 増加分: 約15行**

**既存ルールとの整合性:**
- §C5 改善ループ規範 準拠: H フローも PO 決定済み事項は再指摘禁止（Filter 3）
- §13.15 レビューコスト最適化 準拠: Code Pre-Review（¥0）で事前検証 → 外部APIコスト削減
- §13.16 Learned Patterns 準拠: H フローで発見された問題も LP 蓄積対象
- §8 Step 12（改訂案②）との連動: Step 12 の実機スモーク証跡がそのまま H フローの入力資料
- §4.1 G9 準拠: スクショ画像判定が H フローでも必須（DOM API 禁止）

**リスクと緩和策:**

- **リスク1:** H フローが他フローと重複してレビューコスト増加
  - 緩和: Code Pre-Review で事前に絞り込む。外部API初回フルは CRITICAL が出るまで実施
- **リスク2:** 画面実装完了ごとに H を実施すると頻度が高すぎる
  - 緩和: 「Phase A完了 / 大型機能完了 / デプロイ後」の3タイミングに限定。個別画面実装では D のみ
- **リスク3:** ペルソナ end_user が B フローと H フローで観点が混在する可能性
  - 緩和: テンプレートファイルを end_user.md（B用）と end_user_integration.md（H用）で分離
- **リスク4:** integration_tester が具体的な検証項目を持たず曖昧な指摘を出す
  - 緩和: Code Pre-Review で「L1 5項目 + 認証完走 + 画面間遷移5+」を事前検証することで、外部APIには「それらが通過済みの前提で」より深い統合検証を要求


---

### 改訂案⑦ 分散追記（§4.7.1 双方向デザイン照合 / §8.1 PaaS再デプロイ / §16.8 auto-compact引継ぎ）

**目的:** G1（CLAUDE.md と dev-system の二重管理）/ G2（auto-compact 引継ぎルールが CLAUDE.md のみ）/ G3（PaaS再デプロイ知識未定義）の3点抜けを解消。

**コンセプト:**
- CLAUDE.md に存在する「全プロジェクト共通の知見」を dev-system に昇格
- 次プロジェクトに引き継がれる形で保存する（CLAUDE.md は刷新されるため）
- 複数セクションへの分散追記（§4.7.1 / §8.1 / §16.8）のため改訂案⑦として統合

---

#### A. §4.7.1 新設「双方向デザイン照合」（G1対応）

現行 §4.7「AIっぽさ排除基準」の直後に §4.7.1 を新設する。

```
§4.7.1 双方向デザイン照合（v3.4 新設）

Step 0 (参照Read): §C2 動作検証規範 を Read して遵守する。

UI実装のデザイン照合は「正方向」「逆方向」「視覚検証」の3段階で実施する。
片方向のみでは検出できない乖離（追加要素・JS動的生成要素・省略要素）が発生する。

### 4.7.1.1 正方向照合（mockup → 実装）
- mockup HTML の全要素が実装に反映されているか
- 検証方法: mockup の DOM ツリーを grep し、実装側に対応要素があるか確認
- 検出できる問題: 実装漏れ、要素省略、属性欠落

### 4.7.1.2 逆方向照合（実装 → mockup）
- 実装側に存在する要素が mockup にも定義されているか
- 検証方法: 実装の DOM ツリーを grep し、mockup に対応定義があるか確認
- 検出できる問題: 後から追加した要素、JS動的生成要素、実装独自の追加
- **v3.4 必須化:** UI実装完了時は必ず逆方向照合も実行する

### 4.7.1.3 視覚検証（スクショ画像判定）
- mockup と実装を localhost で並べてレンダリング → スクショ撮影 → 画像として比較
- 検証方法: §4.1 G9 + §19.9 デザイン実装忠実度
- 検出できる問題: 色ズレ、余白差、要素順入替、SVG簡略化

### 4.7.1.4 3段階の発動タイミング

| タイミング | 正方向 | 逆方向 | 視覚検証 |
|----------|-------|-------|---------|
| 画面実装完了時（UI新規） | ✅ 必須 | ✅ 必須 | ✅ 必須 |
| デザイン調整（CSS変更のみ） | ⚠ 任意 | ⚠ 任意 | ✅ 必須 |
| リファクタリング（JSX構造変更あり） | ✅ 必須 | ✅ 必須 | ✅ 必須 |
| リファクタリング（純粋ロジックのみ） | N/A | N/A | ✅ 必須（念のため） |

リファクタリング時でも JSX 構造を触る場合は必須。要素順入替や属性変更が意図せず
混入することを防ぐ。

### 4.7.1.5 チェックリスト検証の一括PASS禁止（v3.4 新設）

デザイン照合チェックリストで「全項目PASS」と報告する場合、各項目に以下を明記する:
- タイムスタンプ（検証実行時刻）
- スクショパス（evidence/MISSION-ID/ 内）
- 検証方法（正方向 / 逆方向 / 視覚 のいずれか）

「全項目PASS」のみの報告は §C2 動作検証規範 の曖昧用語12語違反として FAIL 扱い。
Code Pre-Review（§19.10 D フロー）で自動棄却される。

### 4.7.1.6 自動検証
双方向照合と視覚検証の一部は自動化可能:
- 正方向/逆方向: scripts/bidir_design_lint.sh（新設。mockup と 実装 の DOM 差分を出力）
- 視覚検証: Playwright の toHaveScreenshot() + 差分閾値 0.5%（§19.9 B準拠）

**新設スクリプト:** scripts/bidir_design_lint.sh（将来対応。まずは手動運用で開始）
```


#### B. §8.1 新設「PaaS再デプロイ手順」（G3対応）

現行 §8「C2デプロイフロー」の末尾に §8.1 を新設する。

```
§8.1 PaaS再デプロイ手順（v3.4 新設）

Step 0 (参照Read): §C3 / §C6 を Read して遵守する。

### 8.1.1 再デプロイが必要な設定変更

以下の設定変更は、git push による自動再デプロイでは反映されない。
手動で再デプロイを実行する必要がある:

| 設定対象 | 反映に必要な操作 | 関連する §8 Step |
|---------|---------------|----------------|
| Cloudflare Pages の環境変数（VITE_*等ビルド時埋込） | 再ビルド + 再デプロイ | Step 2-7 + Step 10 |
| Cloudflare Pages の環境変数（ランタイム） | 再デプロイのみ | Step 6-7 + Step 10 |
| Cloudflare Workers の環境変数（wrangler secret） | wrangler deploy | Step 7 |
| Supabase Auth Redirect URLs | 即反映（ただしアプリ側再デプロイは不要） | Step 11 検証のみ |
| Supabase RLS ポリシー | 即反映 | Step 11 検証のみ |
| Stripe Webhook endpoint | 即反映（Stripe側） | Step 11 検証のみ |
| OAuth Provider の Redirect URL | 即反映（Provider側） | Step 11 検証のみ |
| wrangler.toml 変更 | 再デプロイ必要 | Step 7 |

### 8.1.2 再デプロイ手順

```bash
# フル再デプロイ（環境変数変更を含む）
bash scripts/deploy.sh prod .
# → version_sync → build → canopy → L1 → L2 → deploy → Step 10-12 実機検証

# Cloudflare Workers のみ
npx wrangler deploy

# 環境変数変更のみ（コード変更なし）場合の強制再デプロイ
# 方法1: trigger commit（docs/ に空改行を追加して git push）
# 方法2: wrangler pages deployment create --project-name=$PROJECT
```

### 8.1.3 再デプロイ後の必須検証

PaaS側設定変更後の再デプロイは以下を必ず実行:
1. §8 Step 10 verify_env.sh（環境変数反映確認）
2. §8 Step 11 verify_external_services.sh（外部サービス連携確認）
3. §8 Step 12 実機E2Eスモーク（L1 5項目）
4. §19.10 H フロー（統合フローレビュー）の Code Pre-Review（軽量版）

「設定変更した → 反映された」と誤認しないこと。必ず検証スクリプトで確認する。
§C2 動作検証規範 準拠: 「反映されている」は曖昧用語12語の1つ。検証結果の具体的事実
（Step 10-12 の出力ログ）を記述する。

### 8.1.4 典型的な誤解パターン（ENGが犯しがちなミス）

- ❌「PaaS ダッシュボードで環境変数を更新したら即反映される」
  → 実際は再デプロイが必要。VITE_* / PUBLIC_* プレフィックスは再ビルド必須
- ❌「Supabase Redirect URL を更新したら即反映される」
  → Supabase側では即反映されるが、アプリ側で Redirect 先を参照する
     ロジックが動作しているか別途検証必要
- ❌「Stripe Webhook Secret を更新したら自動で全環境に反映される」
  → 実際は環境ごとに個別設定。prod / staging / dev で Secret が異なる
- ❌「wrangler.toml を更新したら即反映される」
  → 実際は wrangler deploy が必要
- ❌「CDN キャッシュがクリアされれば即反映される」
  → Cloudflare Pages の Preview / Production 切り替えにはビルドが必要
- ❌「Cookie / localStorage に保持された値は PaaS変更に影響されない」
  → Auth トークンなど一部は PaaS 側のキー変更で無効化される。ユーザー再ログインが必要

### 8.1.5 Lais M5 事案での具体例

Lais M5 の実機ログインループは以下の連鎖で発生:
1. VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY を Cloudflare Pages Dashboard で設定
2. ただし設定後に再ビルドしていなかった（旧ビルドには環境変数が埋め込まれていない）
3. curl で HTTP 200 は返るが、実機では Supabase Auth が初期化されず認証後に遷移失敗
4. §8 Step 12 実機E2Eスモーク（改訂案② で追加）がないため未検知

本改訂案⑦の §8.1 記述により、ENG は「PaaS ダッシュボードで更新した」後の必須手順を
参照することができる。
```


#### C. §16.8 新設「auto-compact引継ぎルール」（G2対応）

現行 §16「構造的制約」の末尾に §16.8 を新設する。

```
§16.8 auto-compact引継ぎルール（v3.4 新設）

Step 0 (参照Read): §C4 セッション規範 を Read して遵守する。

### 16.8.1 発動条件と保持必須項目

Claude Code の auto-compact 機能（コンテキスト圧縮）が発動した場合、
圧縮後も以下の情報が必ず保持されること:

1. instructions/session_progress.md の5行サマリー全文
2. 現在実行中のミッションIDと完了コマンド（cmd-unit / cmd-e2e / cmd-realworld）
3. テスト実行中の場合: 最後に記録した中間結果（PASS/FAIL/SKIP 数 + FAIL テストID）
4. 未解決のエラーメッセージ（直近3件）
5. 直前の git diff --stat 出力
6. ADV判定 / QA検証 / PO代理 の3ペルソナ判定結果（§13.17 準拠。直近1件のみ）

項目6は最新の3ペルソナ判定1件のみ保持（過去分は session_history.md に記録済みで復元可能）。

### 16.8.2 CLAUDE.md 側の記述

本ルールは dev-system §16.8 が正本。CLAUDE.md の「Compact Instructions」セクションは
本改訂で「詳細: dev_system_spec §16.8」参照のみに縮退する（改訂案①の CLAUDE.md 連鎖
更新に追加）。

### 16.8.3 auto-compact 発動後の確認フロー

ENG は auto-compact 発動を検知したら、以下を順に確認:

1. session_progress.md の5行サマリーがコンテキストに残っているか
2. 実行中のミッション情報（ID + 完了コマンド）が失われていないか
3. テスト中間結果が失われていないか
4. 3ペルソナ判定結果（直近1件）が失われていないか

いずれか失われている場合、即座に該当ファイルを Read し直してから処理を継続する。
「続きをやります」と言って記憶を当てにするのは禁止（§C4 セッション規範 準拠）。
必ずファイルから復元する。

### 16.8.4 auto-compact を前提とした設計

本ルールを満たすため、以下の運用を徹底する:

- テスト実行の中間結果は必ず session_progress.md に書き込んでから次のテストに進む
- 3ペルソナ判定は実行直後に session_progress.md または session_history.md に
  「ADV判定: / QA検証: / PO代理: 」の3行形式で記録
- エラー発生時は直近3件を session_progress.md の「未解決エラー」セクションに記載
- git diff --stat は commit 前の必須操作とする（完了報告の一部として記録）

これにより auto-compact 発動で in-memory 情報が失われても、リポジトリから全て復元可能。
```

---

#### D. CLAUDE.md 連鎖更新（G1・G2対応の追加）

改訂案①で既に以下が決まっている:
- CLAUDE.md の鉄則11個削除 → dev-system §3.3 + §C1-C6 参照に一本化

改訂案⑦で追加する連鎖更新:

**削除対象（dev-system に昇格したため CLAUDE.md からは削除）:**

**(A) Code 実行可能な変更（契約セクション外）:**
- 「Compact Instructions」セクションの本文（5項目リスト）→ 「詳細: dev_system_spec §16.8」参照に変更

**(B) Claude.ai（ADV）経由必須の変更（契約セクション内。§16.5 項目2 準拠）:**
- 「ふとしの方針メモ」の「デザイン照合は双方向必須」記述 → 削除（dev-system §4.7.1 に昇格済み）
- 「ふとしの方針メモ」の「チェックリスト検証の一括PASS禁止」記述 → 削除（dev-system §4.7.1.5 に昇格済み）
- **注意:** これらは CLAUDE.md 契約セクション内のため、Code（ENG）が直接変更することは禁止。
  改訂確定後、ADV（Claude.ai）が Desktop Commander 経由で削除を実行する。
  Code は dev-system 側（§4.7.1 / §16.8）の書き込みのみ担当する。

**置き換え後の CLAUDE.md:**
```markdown
## 起動時 Read 指示（改訂案①で設定済み）
...

## 契約セクション（Code変更禁止）
### プラン構成・変更不可の設計
...（アプリ固有の契約。残す）

### ふとしの方針メモ（アプリ固有のみ残す。共通知見は dev-system に昇格）
- 品質最優先
- GPT-5 を Pro に投入（粗利88%維持、ChatGPT Plus対抗）
- GPT比率を積極的に拡大
- Geminiは3.x系に更新
- 旧KVフェアユースはv6.3で完全削除済み

### デザイン照合の手順
詳細: dev_system_spec §4.7.1 双方向デザイン照合

### auto-compact 引継ぎルール
詳細: dev_system_spec §16.8

## Design Context
...（アプリ固有のデザインブリーフ。残す）

## 【絶対禁止】
詳細: dev_system_spec §16.5
（アプリ固有のもののみ残す）
- ルーティング廃止 / プラン構成変更 / テーブル削除 / API削除
```

**UI変更フロー（A9）の扱い:**
- 現行 CLAUDE.md の「UI変更フロー（A9）: 新規=Claude.ai がビジュアライザーでデザイン案 → 
  ふとし承認 → Code が mockup HTML化+実装。変更=Code が差分調査レポート → ...」
- **これは Lais / Goal AI 固有の手順のため CLAUDE.md に残す**
- dev-system §4.7.1 は「双方向照合」の原則のみ定義。具体的なA9フローはアプリ仕様

---

#### E. sub_infrastructure.md §4 incident_runbook.md 拡張

現行 incident_runbook.md に「PaaS設定変更時の再デプロイ手順」セクションを追加。

```
## PaaS設定変更時の再デプロイ手順（v3.4 新設）

### 判断基準
以下の設定変更時は必ず再デプロイと §8 Step 10-12 検証を実施:
- Cloudflare Pages / Workers の環境変数
- Supabase Auth / RLS ポリシー
- Stripe Webhook endpoint
- OAuth Provider の Redirect URL

### 手順
詳細: dev_system_spec.md §8.1

### 失敗時
bash scripts/rollback.sh → 直前バージョンに復帰
```


#### F. 改訂案⑦ のサマリー

**G1・G2・G3 の3点解消:**

| 抜け | 対応 |
|-----|-----|
| G1（CLAUDE.md と dev-system の二重管理） | §4.7.1 新設（双方向デザイン照合 + チェックリスト一括PASS禁止を dev-system に昇格） |
| G2（auto-compact 引継ぎが CLAUDE.md のみ） | §16.8 新設（dev-system に昇格。CLAUDE.md は参照のみ） |
| G3（PaaS再デプロイ知識未定義） | §8.1 新設（再デプロイが必要な設定 + 手順 + 誤解パターン + Lais M5事例） |

**連鎖更新:**

| 種別 | ファイル | 変更内容 |
|-----|---------|---------|
| 新設 | dev_system_spec.md §4.7.1 | 双方向デザイン照合（§4.7 AIっぽさ排除基準の後） |
| 新設 | dev_system_spec.md §8.1 | PaaS再デプロイ手順（§8 C2デプロイフローの末尾） |
| 新設 | dev_system_spec.md §16.8 | auto-compact引継ぎルール（§16 構造的制約の末尾） |
| 改訂 | CLAUDE.md | 共通知見を §4.7.1 / §16.8 参照に縮退。アプリ固有（A9/ふとし方針/Design Context）は残す |
| 改訂 | sub_infrastructure.md §4 | incident_runbook.md に PaaS再デプロイセクション追加 |
| 将来対応 | scripts/bidir_design_lint.sh | §4.7.1.6 自動化（Phase B 以降で実装） |

**想定ボリューム:**
- §4.7.1 新設: 約55行
- §8.1 新設: 約60行
- §16.8 新設: 約40行
- CLAUDE.md 改訂: 約20行（削除 + 参照追加）
- incident_runbook.md 拡張: 約15行
- **dev_system_spec.md 増加分: 約155行**
- **CLAUDE.md 減少分: 約40行（削除） + 増加分 5行（参照）= 差引減少約35行**
- **sub_infrastructure.md 増加分: 約15行**

**既存ルールとの整合性:**
- §C2 動作検証規範 準拠: §4.7.1.5 チェックリスト一括PASS禁止は曖昧用語12語と整合
- §C3 連鎖更新規範 準拠: §8.1 PaaS再デプロイ後の検証は連鎖更新の一部
- §C4 セッション規範 準拠: §16.8 auto-compact 後の復元フローは未書き込み禁止と整合
- §C6 セキュリティ規範 準拠: §8.1 環境変数再デプロイは G10 シークレット管理と連動
- §19.9 デザイン実装忠実度 準拠: §4.7.1 は §19.9 の5アプローチのうち A/B/C/D を具体化

**リスクと緩和策:**

- **リスク1:** §4.7.1 で「UI実装完了時は逆方向照合も必須」としたが、小さな修正で毎回要求すると工数増
  - 緩和: §4.7.1.4 発動タイミング表で「リファクタリング（純粋ロジックのみ）」は N/A 指定可
  - ミッション定義時に ADV が判断し、ENG は指示に従う
- **リスク2:** §8.1 の誤解パターン6項目は実例ベースで書かれているが、網羅性は今後の経験次第
  - 緩和: LP（Learned Patterns）として §13.16 に蓄積。3件以上の類似エラー発生で §8.1.4 に追記
- **リスク3:** §16.8 の auto-compact 発動検知が困難（Code が自身の圧縮を検知できない可能性）
  - 緩和: §16.8.4 で「発動を前提とした設計」を明記。各テスト結果・判定結果を即座に書き込む
  - 運用で補完する（「圧縮検知」ではなく「常に書き込む」ことで対応）
- **リスク4:** CLAUDE.md から共通知見が削除されると、CLAUDE.md のみ読む ENG が参照を忘れる
  - 緩和: 改訂案①で §3.3 ENG起動時Read に §C1-C6 + §4.7.1 / §8.1 / §16.8 を含める
  - §0 Step 0-5 で該当フローに移動する際、必ず Step 0 参照Read で関連 §C が読まれる

---

## 改訂案①〜⑦ の総合サマリー（本パッケージ §3 完了）

本パッケージ §3 で改訂案①〜⑦ を全て展開した。

**解消された抜け:**

| カテゴリ | 件数 | 改訂案 |
|---------|------|--------|
| F（鉄則の呼称と配置） | 5 | ① |
| A（動作検証の抜け） | 3 | ② |
| C（PO判定待ち項目の扱い） | 3 | ③ |
| D（完了条件の粒度） | 3 | ② + ④ |
| B（プロジェクト境界の抜け） | 3 | ⑤ |
| E（環境変数・外部設定） | 3 | ② |
| G（その他） | 3 | ⑦ |
| **合計** | **22** | — |

**追加新設（G_40 で方針確定済み）:**
- H フロー（sub_review_flow §4.H）: 改訂案⑥

**対象ファイル変更サマリー:**

| ファイル | 現行行数 | 改訂後行数（概算） | 変更内容 |
|---------|---------|----------------|---------|
| dev_system_spec.md | 1,422 | 約1,900 | §0/§1.5/§C/§3.6/§4.7.1/§5/§7.1/§8.1/§10.4/§16.8 等 全面改訂 |
| sub_infrastructure.md | 901 | 約1,200 | §2.1 (--subdir) / §2.4 / §2.6 / §3 / §4 拡張 + 3新設スクリプト |
| sub_testing.md | 236 | 約300 | §9 新設 |
| sub_adv_protocol.md | 194 | 約215 | §2 トリガー対応表拡張 |
| sub_review_flow.md | 391 | 約515 | §4.H 新設 + §5/§7/§8.4 拡張 |
| sub_system_map.md | 155 | 155 | 変更なし |
| CLAUDE.md | 221 | 約190 | 鉄則削除 + 共通知見を dev-system 参照に縮退 |
| development_rules.md | 126 | 約140 | G7 拡張 + G1-G9 Step 0 追加 |
| templates/mission_template_v2.md | — | 約150 | v3 化（実態 v4 仕様） |

**新設ファイル:**
- scripts/step0_lint.sh（G11）
- scripts/proposal_log_lint.sh（G12）
- scripts/verify_env.sh（§8 Step 10）
- scripts/verify_external_services.sh（§8 Step 11）
- dev-system/templates/hooks/pre-commit-sub（サブディレクトリ用）
- dev-system/templates/test_e2e_integration_template.ts（§9.3）
- dev-system/templates/test_realworld_template.ts（§8 Step 12）
- dev-system/templates/playwright.realworld.config.ts（§8 Step 12）
- dev-system/templates/review_personas/integration_tester.md（§4.H）
- dev-system/templates/review_personas/end_user_integration.md（§4.H）
- dev-system/templates/review_personas/security_auditor.md（§4.H）

**新設 canopy ゲート:**
- G11: Step 0 参照漏れ検出（step0_lint.sh）
- G12: 提案ログ形式検証（proposal_log_lint.sh）
- G13: pre-commit フック存在検証（canopy_common.sh 内）

本改訂で dev-system は v3.3 → v3.4 にインクリメント。sub_*.md は v3.0 → v3.1。
CLAUDE.md / development_rules.md のバージョン管理はアプリ固有のため各アプリで決定。

