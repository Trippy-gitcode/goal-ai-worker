# dev_system v3.3→v3.4 R1 最終トリアージ（10本フル版）

> **状態:** R1 完遂。10/10 valid。CRITICAL 16 / HIGH 46 / MED 35 / LOW 4（計 101 件）
> **対象:** Gemini 3.1 Pro Preview × 5ペルソナ + GPT-5.4 × 5ペルソナ = 10本
> **作成:** 2026-04-18 G_42 Claude.ai (ADV)
> **用途:** R2パッケージ作成の判定基盤
> **棄却方針:** LOW 4件は個別トリアージ対象外（集計のみ）。CRITICAL/HIGH/MED 97件を分析
> **前版:** lais/verify/dev_system_v34_r1_triage.md（Gemini 3本の暫定版）を本ファイルが上書き

---

## §1. 全体サマリー

### 1.1 ペルソナ別 severity 件数

| ペルソナ | CRIT | HIGH | MED | LOW | 合計 |
|---|---:|---:|---:|---:|---:|
| gemini × ai_ops | 1 | 4 | 1 | 0 | 6 |
| gemini × devops_engineer | 2 | 1 | 1 | 0 | 4 |
| gemini × qa_lead | 2 | 5 | 2 | 0 | 9 |
| gemini × solo_dev | 1 | 3 | 1 | 0 | 5 |
| gemini × tech_writer | 3 | 4 | 2 | 0 | 9 |
| gpt54 × ai_ops | 0 | 5 | 5 | 0 | 10 |
| gpt54 × devops_engineer | 1 | 5 | 5 | 1 | 12 |
| gpt54 × qa_lead | 0 | 8 | 5 | 1 | 14 |
| gpt54 × solo_dev | 3 | 5 | 4 | 0 | 12 |
| gpt54 × tech_writer | 3 | 6 | 9 | 2 | 20 |
| **合計** | **16** | **46** | **35** | **4** | **101** |

### 1.2 カテゴリ別 件数（LOW除く）

| カテゴリ | CRIT | HIGH | MED | 合計 |
|---|---:|---:|---:|---:|
| CONTRADICTION | 10 | 12 | 7 | 29 |
| FEASIBILITY | 5 | 18 | 4 | 27 |
| AMBIGUITY | 0 | 5 | 8 | 13 |
| MISSING | 0 | 3 | 3 | 6 |
| STRUCTURE | 0 | 1 | 4 | 5 |
| BEST_PRACTICE | 0 | 1 | 3 | 4 |
| UNDEFINED | 0 | 0 | 2 | 2 |
| USER_CONCERN | 0 | 1 | 0 | 1 |
| ROBUSTNESS | 0 | 0 | 1 | 1 |

### 1.3 注目パターン

- **CONTRADICTION が最多（29件）**: 改訂案間の整合性破綻がレビューで露呈。G11/G12/G13 採番、§C規範の位置づけ、§3.1のReadリスト、§5.1 vs §9.1 等
- **FEASIBILITY が僅差の2位（27件）**: macOS環境・Vite挙動・Cloudflare Pages取得可能範囲・AI運用負荷
- **GPT-5.4 は MED を大量に出す（35件中 28件）**: severity inflation の逆。GPT は繊細な整合性・文書品質問題を拾う傾向
- **Gemini は CRITICAL に集中（9件）**: 「実行不能 = CRITICAL」のFEASIBILITY判定が鋭い

---

## §2. クラスター別分析

以下、同テーマの指摘を統合して「クラスター」として扱う。採用/棄却/差分候補の判定はADV 3ペルソナ制で各クラスター末尾に記載。

---

### クラスター A — macOS環境非互換（GNU拡張コマンド依存）

**指摘ID:** gemini/devops R-001, R-002, R-003, R-004 / gemini/qa_lead R-002 / gemini/tech_writer R-004 R-005 R-007 / gpt54/devops R-009 / gpt54/solo R-005

**テーマ統合:** macOS 標準環境（Bash 3.2, BSD grep/sed/date）と非互換の構文・コマンドが新設スクリプト群で多用されている。

**具体:**
- `declare -A`（連想配列）は bash 4.0+ 専用 → step0_lint.sh クラッシュ
- `grep -oP`（Perl正規表現）は BSD grep 非対応 → proposal_log_lint.sh / verify_env.sh / verify_external_services.sh 全FAIL
- `sed +20p` は GNU sed 拡張 → step0_lint.sh 範囲指定不成立
- `date -Iseconds` は GNU date 拡張 → canopy発火ログ不成立

**重複度:** 8指摘。最大重複クラスター。

**ADV判定:** **採用確定**
- 根拠: ソロ開発者の macOS 環境で実行不能 = FEASIBILITY CRITICAL。§1.5 severity 定義に整合
- 対応方針: 改訂案③D の scripts 全4本を POSIX 互換に書き換え。bash 3.2 互換配列パターン（改行区切り文字列リスト + `${ENTRY%%:*}` / `${ENTRY##*:}`）。grep -oP → awk/sed/grep -o。sed +20p → `head` と組み合わせ。date -Iseconds → `date -u +"%Y-%m-%dT%H:%M:%SZ"`
- G11 step0_lint.sh の仕様変更を伴うため、R2 でもう一度外部検証を推奨

**QA検証:** sub_review_flow §1.5「実行不能 = CRITICAL」に完全合致。severity inflation 該当なし
**PO代理:** ソロ開発者の macOS 継続使用はふとしの環境方針として確定。Linux 対応は将来課題。PO方針と整合

---

### クラスター B — Vite ビルド挙動との矛盾

**指摘ID:** gemini/ai_ops R-001 / gemini/devops R-002 / gemini/tech_writer R-001 / gpt54/devops R-002 / gpt54/devops R-007 / gpt54/qa_lead R-007 / gpt54/tech_writer R-010

**テーマ統合:** `VITE_*` 環境変数は Vite がビルド時に**値に静的置換**するため、`dist/` 内に変数名は残らない。そのため `grep -rq "$VAR" dist/` は常にFAIL → デプロイ確実ブロック。

**派生論点:**
- Cloudflare Pages の環境変数全体を `wrangler pages secret list` で一貫取得できる前提が不明（Pages のビルド時変数と Worker secret は性質が異なる）
- ローカル build の dist 検査は「PaaS に実反映された値」の証明にならない
- `.env` 記法の揺れ（`export VAR=...` / スペース混入）

**重複度:** 7指摘。クラスターA に次ぐ重複。

**ADV判定:** **採用確定**
- 根拠: Vite仕様として公式に静的置換。確実にデプロイがブロックされる
- 対応方針:
  1. `VITE_*` の dist/ grep チェックを廃止
  2. `.env` / `.dev.vars` に値存在の canopy E3 チェックのみで担保
  3. E3 の .env 記法を柔軟化: `grep -qE "^(export[[:space:]]+)?${VAR}[[:space:]]*=" "$ENV_FILE"`
  4. Cloudflare Pages の build-time 変数 vs Worker secret の取得方法を verify_env.sh で**分岐明記**
  5. 取得不可能な項目は FAIL ではなく WARN + 手動証跡必須（認証・決済を除く）
  6. 認証・決済は「証跡なし=FAIL」として例外化

**QA検証:** §1.5「確実にFAIL」で CRITICAL。spec_v1のSSOT原則とも整合
**PO代理:** 認証・決済の扱いは PO 方針「品質最優先」と整合。WARN 許容の線引きは明確化が必須

---

### クラスター C — 品質ゲート番号体系の破綻

**指摘ID:** gpt54/ai_ops R-008 / gpt54/qa_lead R-006 / gpt54/solo R-002 / gpt54/tech_writer R-002 R-003 R-004 / gemini/tech_writer R-001

**テーマ統合:** G11/G12/G13 の採番管理が複数改訂案にまたがり破綻。
- 改訂案①でG11新設、改訂案③でG12新設、改訂案⑤でG13新設
- development_rules.md は G1-G9 表現のまま
- §4.1 のゲート一覧表にG11の正式行が明示されていない
- Step 0 適用一覧の対象が G1-G9 と G1-G13 で揺れ
- §C1〜§C6の見出し表記が「§C1.」と「§C1」で揺れ、step0_lint.sh が誤検知する可能性

**重複度:** 7指摘（CRIT 3含む）

**ADV判定:** **採用確定（構造的修正）**
- 根拠: 仕様書間の整合性破綻。CRITICAL扱いが妥当（確実に参照崩壊）
- 対応方針:
  1. dev_system_spec §4.1 に**G1-G13 完全版ゲート一覧**を再掲（名称・スクリプト・目的・参照§C を表形式）
  2. development_rules.md の Step 0 対象を **G1-G13 に更新**
  3. §C1〜§C6 の見出しを「**### §C1. 書き込み規約**」形式に統一（ドット付きに確定）
  4. step0_lint.sh の検出パターンを統一見出しに合わせる
  5. 全改訂案サマリー・連鎖更新表の記述を再チェック

**QA検証:** §1.5 CONTRADICTION CRITICAL（参照番号解釈不能）に合致
**PO代理:** PD-005「仕組みで解決」と整合。採番は一度決めたら固定する方針が妥当

---

### クラスター D — ADV/ENG/PO の責務境界と Read リストの矛盾

**指摘ID:** gemini/ai_ops R-002 / gpt54/ai_ops R-001 R-002 / gpt54/qa_lead R-001 / gpt54/solo R-001 R-003 R-008 / gpt54/tech_writer R-006

**テーマ統合:** §0・§3.1・§3.2・§3.3・§C1・改訂案③ の間で ADV/ENG/PO の役割が多重矛盾。

**具体矛盾点:**
1. **§0 vs §3.1**（gpt54/solo R-001 CRIT）: §0 Step 0-2 で「§C1-C6 は全層で必須Read」としながら、§3.1 PO起動時Readには session_progress.md しか含まれず、POが規範Readから除外されているのか含まれるのか不明
2. **§3.3 ENG実行範囲**（gpt54/ai_ops R-001 / gpt54/qa_lead R-001 / gpt54/solo R-008 HIGH×3）: 「ミッション定義の完了コマンドしか実行しない」とあるが、§8 Step 10-12 のデプロイ検証・canopy実行・提案ログ更新・Step 0 lint など、ミッション定義外で仕様上必須の実行が多数。現状ENGが違反せず実行できる根拠がない
3. **ADV の書き込み許可**（gpt54/ai_ops R-002 HIGH）: §C1「ADV/POはコードを書かない」と改訂案③「ADVが提案ログ更新」が衝突。session_progress.md が ADV 書き込み許可対象であることが §C1 や sub_adv_protocol.md で明示されていない
4. **「コード」の定義**（gpt54/tech_writer R-006 HIGH）: §C1「コード書かない」と §3.2「ADVが多数の仕様書Read」「ADVが契約セクション削除」が矛盾。「コード」「ドキュメント」「契約セクション」の用語境界が未定義
5. **ADVの起動時暴走リスク**（gemini/ai_ops R-002 HIGH）: §0 Step 0-4/0-5 の「キュー先頭ミッション判定」をADVも実行すると、POの指示を無視してキュー処理を優先する暴走リスク

**重複度:** 9指摘（CRIT 1, HIGH 8）

**ADV判定:** **採用確定（大規模改訂）**
- 根拠: 責務境界は dev-system の中核。矛盾放置で運用破綻
- 対応方針:
  1. §0 Step 0-2 の「全層で必須Read」を ENG/ADV/PO 3分岐に再構成
     - ENG: §C1-C6 全文 + CLAUDE.md + development_rules.md + session_progress.md
     - ADV: §C1-C6 全文 + sub_adv_protocol.md + session_progress.md + po-decisions.md 直近10件
     - PO: 5行サマリー + キュー先頭ミッションID のみ（§C1-C6 は任意）
  2. §3.1 〜 §3.3 を §0 と完全一致させる（表で対応表を掲載）
  3. §3.3 ENG 実行範囲を「**キュー先頭ミッション定義の完了コマンド + 該当フローで必須化された補助コマンド**」に修正
  4. §C1 「コード」を「**アプリ実装コード（src/ / frontend/ / scripts実装）**」に限定定義。ドキュメント・テンプレート・契約セクションは別扱いで別表定義
  5. §0 Step 0-4/0-5 を **ENG限定**に明記。ADV は「POの指示内容に基づくフロー判定」を最優先
  6. §C1 に「session_progress.md（提案ログ含む）はADV書き込み許可対象」を追加

**QA検証:** §1.5 CONTRADICTION + CRITICAL相当（POが仕様通りに動くと必ず違反）
**PO代理:** PD-002「既決定は覆さない」と整合。ただし責務境界の不整合は新問題として再定義OK。PD-007「新プロセスはPO承認」該当のため、修正方針への PO 承認を明示取得する

---

### クラスター E — ADV運用「滞留セッション数手動+1」の破綻

**指摘ID:** gemini/ai_ops R-004 / gemini/solo R-001 / gpt54/devops R-010 / gpt54/solo R-007

**テーマ統合:** 提案ログの「滞留セッション数」を毎セッション開始時にADVが手動で+1する仕様は、AI運用として破綻。

**具体:**
- 毎セッションで無意味なGit差分が発生
- コンフリクトの温床
- AIの計算・書き換えミスを誘発
- Chat UIのADVはセッション開始を自動検知できず、POの手動トリガーが必須
- 項目数が増えるほど毎セッション負荷が増大
- G12 は検知のみで自動更新はしない仕様矛盾

**重複度:** 4指摘（CRIT 1, HIGH 2, MED 1）

**ADV判定:** **採用確定**
- 根拠: AI運用アンチパターン。「PO手動作業最小化」の§1.1 基本思想と矛盾
- 対応方針:
  1. 「滞留セッション数」手動インクリメント仕様を**廃止**
  2. 代替: 提案ログに**提案日（YYYY-MM-DD）**または**提案セッションID**を静的記録
  3. `proposal_log_lint.sh` が現在日時/セッションIDとの差分を動的計算し滞留警告（例: 3日以上 or 3セッション以上で警告）
  4. G12 の機能を「未更新検知」から「滞留動的判定 + 閾値警告」に変更

**QA検証:** §1.5 FEASIBILITY CRITICAL（AI運用で継続破綻）
**PO代理:** PD-005「仕組みで解決」と完全一致。自動化が正解

---

### クラスター F — 起動時Read量の過大・Step 0 再Read問題

**指摘ID:** gemini/solo R-002（triage前版と重複）/ gpt54/solo R-004, R-005

**テーマ統合:** 起動時Read量がソロ運用として過大 + 22フローStep 0 の「Readして」指示がI/O爆発を招く。

**具体:**
- ADV起動時Read: session_progress全文 + bootstrap + CLAUDE契約 + dev_system目次 + §C1-C6 + sub_adv_protocol全文 + po-decisions直近10件 + learned-patterns目次 ≈ 相当量
- ENG起動時も同量
- 22フロー各 Step 0 で「§C○ を Read して遵守」 → AI が毎回 Read ツール発火 → APIコスト・時間膨張
- 短時間修正でも同量Readは遵守率低下

**重複度:** 3指摘（HIGH 2, MED 1）。Gemini版triage ですでに1件採用済み

**ADV判定:** **採用（既採用案を強化）**
- 根拠: トリアージ前版で既に採用済み。GPT-5.4が規模問題を追加指摘
- 対応方針:
  1. 22フロー Step 0 文言を「**起動時にReadした§C○を遵守する**」に統一（「Readして」削除）
  2. 起動時Readを「**毎回必須**」と「**条件付き再読**」に分離
     - 毎回必須: 5行サマリー + キュー先頭ミッション + §C1-C6（短縮版/1ページ要約）
     - 条件付き再読: §C1-C6 全文 / sub_adv_protocol 全文は「新セッション初回」「仕様更新後」「auto-compact後」のみ
  3. §C1-C6 に 1ページ要約版（§C0: 規範サマリー）を新設

**QA検証:** FEASIBILITY HIGH。起動コストの実測値を記載すればさらに強化可能
**PO代理:** ソロ開発アジリティとの両立が核心。採用妥当

---

### クラスター G — canopy 発火保証の不足（B3解消未達）

**指摘ID:** gpt54/devops R-001 CRIT / gpt54/qa_lead R-008 R-009 / gpt54/solo R-011

**テーマ統合:** G13は「フックの存在」しか検証せず、実際の canopy 発火を保証しない。B3対策として掲げた「発火保証」が実装未達。

**具体:**
- G13 は `.git/hooks/pre-commit-sub` の存在検証のみ
- pre-commit-sub は git commit 時にしか動作せず、deploy.sh/CI/手動実行との接続未定義
- フック未経由のデプロイ/CI/手動実行でゲート素通り可能
- サブディレクトリアプリは通常 `.git` がない → 配置先として不成立
- G13 の subdir 判定（`.dev-system.version + 親.git`）が誤判定しやすい
- canopy 発火ログが手動実行でも残る → hook 経由発火の証明にならない

**重複度:** 4指摘（CRIT 1, HIGH 1, MED 2）

**ADV判定:** **採用確定（設計見直し）**
- 根拠: B3対策の目的「発火保証」が未達のまま CRITICAL
- 対応方針:
  1. pre-commit-sub の配置を `.git/hooks/pre-commit-sub` から **`<SUBDIR>/scripts/pre-commit-sub.sh`**（通常ファイル）に変更
  2. 親 `.git/hooks/pre-commit` から通常ファイルパスを直接実行
  3. G13 の検証対象を実配置先 `<SUBDIR>/scripts/pre-commit-sub.sh` に更新
  4. canopy 実行を **deploy.sh の必須ステップ**として明示（hook 以外の経路を閉じる）
  5. canopy 発火ログに「呼び出し元（pre-commit/pre-push/manual/CI）」を記録
  6. G13 の発火保証検証を「最近N日以内に hook 経由の発火ログが存在する」に変更
  7. subdir 判定を「init_app.sh --subdir 時に明示フラグファイル（`.dev-system-subdir`）を配置」で一意化

**QA検証:** §1.5 CONTRADICTION CRITICAL（B3目的と実装未達）
**PO代理:** PD-005「仕組みで解決」と整合。発火保証は品質ゲート核心

---

### クラスター H — 3層テスト戦略と完了コマンド3区分の対応破綻

**指摘ID:** gemini/qa_lead R-001 R-003 R-004 / gpt54/qa_lead R-002 R-003 R-004 R-005 R-011 / gpt54/ai_ops R-003

**テーマ統合:** L1/L2/L3 と cmd-unit/cmd-e2e/cmd-realworld の対応、および認証・単一画面ミッションの扱いが複数箇所で矛盾。

**具体:**
1. サマリー「L1=cmd-realworld / L2=cmd-e2e」 vs §8 Step4（L1をデプロイ前）+ Step12（realworld再実行）で二重定義
2. cmd-realworld が §5.1 で「認証・複数画面・デプロイ系で必須」だが、実行例は `DEPLOY_URL` 前提 → デプロイ前完了判定不能（デッドロック）
3. 認証を含む単一画面ミッションが「画面実装（単一画面）」に分類され cmd-realworld 任意に → 認証漏れリスク（D2解消目的と矛盾）
4. playwright.realworld.config.ts の testDir が `./tests/realworld` ハードコード → 統合E2E（`tests/e2e/integration/`）と分離、テスト0件PASS
5. cmd-e2e の必須条件が §5.1（単一画面でも必須）と §9.1（単一画面は任意）で矛盾
6. 外部サービス連携確認の PASS/WARN/FAIL 基準が Step 11 / Hフロー / deploy.sh で不整合
7. G8 TDD証跡と完了コマンド3区分（cmd-realworld は証跡対象か）の関係未定義

**重複度:** 7指摘（CRIT 1, HIGH 6）

**ADV判定:** **採用確定（仕様書全面整備）**
- 根拠: テスト戦略の中核矛盾。放置すれば品質ゲートが全FAILまたは解釈ブレで機能不全
- 対応方針:
  1. **対応表を1箇所で正本化**（§4.1.1 新設 or §7.1 再定義）:
     - L1-local（ローカルスモーク・デプロイ前）= cmd-unit の一部
     - L1-realworld（デプロイ後実機スモーク）= cmd-realworld
     - L2 = cmd-e2e
     - L3 = cmd-unit 全体（週次フル）
  2. 認証ミッションの分類規則を明記: **「認証を含むミッションは画面数に関わらず認証・セッション関連として分類し、cmd-realworld 必須」**
  3. cmd-realworld の完了判定タイミングを**「デプロイ後完了判定」**と明示（実装完了とデプロイ完了を分離）
  4. playwright.realworld.config.ts の testDir を `./tests` に広げ、`--grep "MISSION-ID"` でミッション固有を探索
  5. §5.1 と §9.1 を統一（どちらかに揃える。「単一画面でも cmd-e2e 必須」推奨）
  6. 外部サービス連携の PASS/WARN/FAIL 基準表を新設（サービス種別 × 認証情報有無）
  7. G8 TDD証跡を **「AT単位」** に固定。cmd-realworld は AT とは別で「実機検証証跡」に分類

**QA検証:** §1.5 CONTRADICTION CRITICAL（テスト戦略崩壊）
**PO代理:** PD-005「仕組みで解決」+ PD-002「既決定は覆さない」整合。ただし認証分類ルールはPO承認必須

---

### クラスター I — 仕様書肥大化と将来保守負荷（差分候補）

**指摘ID:** gpt54/solo R-005 R-006 R-009 / gemini/solo R-005

**テーマ統合:** 22フローStep 0追加・cmd3区分N/A理由必須・仕様書1,900行への肥大化がソロ保守コストを超過

**ADV判定:** **差分候補（PO承認必須）**
- 両案:
  - 案A（仕様厳守）: 現行通り22フロー Step 0 + 3区分 N/A 理由必須。G11/mission_linter で機械検証
  - 案B（ソロ最適化）: Step 0 は章単位に集約。N/A 理由必須は高リスク系ミッションのみ
- R2 で両案を明示してゴールデン判定

**QA検証:** 保守コストと品質ゲート厳密性のトレードオフ。どちらも §1.5 上成立
**PO代理:** PD-001「品質最優先」 vs PD-003「ソロアジリティ」のトレードオフ。PO判断が核

---

### クラスター J — Hフロー運用負荷（差分候補）

**指摘ID:** gemini/solo R-004 / gpt54/solo R-012

**テーマ統合:** デプロイ毎にHフロー実行は運用負荷過大

**ADV判定:** **差分候補（PO承認必須）**
- 両案:
  - 案A（厳格）: 現行通りデプロイ毎にHフロー
  - 案B（限定）: 認証/決済/外部連携ありのケース、または大型機能完了後のみ
- R2 で両案併記

**QA検証:** Hフローの目的（統合観点）を損なわない範囲で限定可能か要検証
**PO代理:** PO判断必要

---

### クラスター K — デプロイ反映タイムラグ（前版triageで採用済み）

**指摘ID:** gemini/solo R-003 / gemini/devops R-006 / gpt54/ai_ops R-007 も一部該当

**ADV判定:** **採用確定（前版と同）**
- Step 8 の curl 疎通確認を「新バージョン（コミットハッシュ）が返るまでポーリング（最大30秒/2秒間隔）」に拡張
- Step 12 の Playwright は反映確認後に実行
- 追加: deploy.sh の失敗時リカバリ処理（session_progress.md への失敗記録）を明文化

---

### クラスター L — verify_external_services.sh 実装不具合

**指摘ID:** gemini/tech_writer R-003 CRIT / gemini/qa_lead R-005 / gpt54/ai_ops R-003 派生 / gpt54/tech_writer R-010

**テーマ統合:** Supabase API の redirect_urls は配列なのに `.split(',')` を呼んでいる → AttributeError でクラッシュ。他の項目も型想定ミス。

**ADV判定:** **採用確定**
- 型安全な実装に修正: `urls=d.get('redirect_urls', []); print('\n'.join(urls) if isinstance(urls, list) else '\n'.join(urls.split(',')))`
- または jq 使用
- wrangler 認証状態確認（`wrangler whoami`）を事前に追加。未認証時は FAIL ではなく WARN + 手動確認

---

### クラスター M — 移行マップ・採番一覧の不完全性

**指摘ID:** gemini/tech_writer R-005（移行マップ）/ gemini/tech_writer R-006（app_config.yaml の project_name 未定義）/ gpt54/ai_ops R-005（§15.3 項目11 本文欠落）/ gpt54/tech_writer R-011〜R-018（参照表記揺れ・ファイル一覧不足・項目番号破綻 等）

**テーマ統合:** 改訂案間の記述と本文の整合性が全体的に甘い。参照表記・連鎖更新表・ファイル一覧・項目番号の不完全性が多数。

**ADV判定:** **採用確定（まとめて対応）**
- 対応方針:
  1. 参照表記を統一ルールで全文リファクタ: §4.1 / §C2 / §4.1 G11 / 複数参照は `§C2, §C6`
  2. §1.1 を「改訂対象 + 新設対象」に再整理（ファイル数を実数に修正）
  3. §15.3 項目10/11 の最終形を §15.3 本文内で完全掲載
  4. §4.3 連鎖更新表に `templates/session_progress_template.md` 等を追加
  5. §3.6 旧→新移行マップの項目数を表の実数に一致
  6. app_config_template.yaml に `deploy.project_name` 定義追加
  7. 用語統一: 規範=横断ルール / フロー=手順 / ゲート=機械検証 / ルール=総称。「鉄則」は §3.6 のみ

---

### クラスター N — その他HIGH/MED（単体採用）

以下は単発ながら採用妥当:

| ID | 指摘 | ADV判定 |
|---|---|---|
| gemini/ai_ops R-003 HIGH | auto-compact検知は Code に不可能 → 代替トリガー | 採用: 「ミッション再開時」「エラー連続時」「テスト実行前」に変更 |
| gemini/ai_ops R-005 HIGH | 認証系 cmd-realworld 必須でデプロイ環境未構築時デッドロック | 採用: フェーズ別エスケープハッチ明記（ローカルエミュ代替可） |
| gemini/ai_ops R-006 MED | report_lint.sh に曖昧用語12語検知ロジック未記載 | 採用: 改訂案に正規表現追記 |
| gemini/qa_lead R-006 HIGH | Code Pre-Review でブラウザ直接操作を要求 → 不可能 | 採用: E2Eテスト経由の検証要件に修正 |
| gemini/qa_lead R-007 HIGH | toHaveURL(/./) は何でもPASS → 検証不十分 | 採用: ホーム画面特有要素の waitForSelector に変更 |
| gemini/tech_writer R-002 CRIT | init_app.sh --subdir の .gitignore 部分一致バグ | 採用: `grep -q "^# Sub-app: $SUBDIR_NAME$"` で完全一致 |
| gemini/qa_lead R-004 HIGH | TDD証跡のファイル名衝突（before.json） | 採用: before-unit.json / before-e2e.json に分離 |
| gpt54/qa_lead R-012 MED | realworld テンプレが DOM アサーション多用 → §C2と境界曖昧 | 採用: §C2で「非視覚条件の自動アサーションは可」を限定記述 |
| gpt54/qa_lead R-013 MED | SKIP/N/A/WARN の用語混在 | 採用: 統一定義（SKIP=理由必須、N/A=仕様上不要、WARN=手動移譲） |
| gemini/qa_lead R-009 MED | end_user.md と end_user_integration.md の表記揺れ | 採用: end_user_integration.md に統一 |
| gpt54/tech_writer R-015 R-016 R-018 MED | 滞留セッション数のセッション定義・bidir_design_lint の実装時期 | 採用: セッション定義明確化 / 将来対応を別注記に分離 |
| gpt54/devops R-008 MED | canopy 発火ログの fail_count が真偽値と件数の混用 | 採用: `failed`（真偽値）に改名 |
| gemini/devops R-004 MED | pre-commit-sub の git diff パス抽出が core.quotepath 影響 | 採用: `git diff --cached --name-only --relative` に変更 |
| gemini/qa_lead R-008 MED | init_app.sh の .git/hooks ディレクトリ未作成 | 採用: `mkdir -p` 追加 |
| gemini/tech_writer R-009 MED | test_realworld_template で絶対URL組み立て | 採用: `page.goto('/')` に変更（baseURL 活用） |

---

## §3. 採用/棄却/差分候補 サマリー

| 区分 | 件数 | 概要 |
|---|---:|---|
| **採用確定（そのまま改訂案に反映）** | 76 | クラスターA〜H, K〜N の採用分 |
| **差分候補（両案併記でR2へ）** | 4 | クラスターI（3件: Step0集約 / 3区分簡略化 / 仕様肥大対策）+ クラスターJ（1件: Hフロー限定） |
| **前版triageで解決済**（重複内包） | 13 | Gemini 3本分の前版採用項目は統合 |
| **棄却** | 4 | LOW 4件（個別トリアージ対象外） |
| **合計** | **97** | CRIT 16 + HIGH 46 + MED 35 |

---

## §4. R2 作成判定

### 4.1 R2 必要性

- 採用確定 76件 + 差分候補 4件 = **R2 必須**（CRITICAL 16件全てが採用確定のため）
- ゴールデン直行は不可

### 4.2 R2 パッケージの構成方針

1. **Part I: 採用項目一覧**（76件、クラスター別）
2. **Part II: 差分候補の両案**（4件、各案の根拠とトレードオフ）
3. **Part III: 改訂案本体の差分**（クラスター別に原案からの差分を明示）
4. **Part IV: レビュアーへの指示**
   - 採用項目は「採用妥当性チェック」のみ（新規CRITICALは出さない）
   - 差分候補は「A/B どちらを推奨するか」を必ず明示
   - severity inflation 注意（§13.9）: 前ラウンドで出ている論点の再指摘はsev降格
   - Filter 1-7 適用（sub_review_flow §2）

### 4.3 R2 実行計画

- モデル: Gemini 3.1 Pro Preview + GPT-5.4（R1 と同じ2モデル）
- ペルソナ: devops_engineer / solo_dev / qa_lead / tech_writer / ai_ops（R1と同5ペルソナ）
- 本数: 10本（5ペルソナ × 2モデル）
- 入力: R2パッケージ + R1 採用リスト（Cumulative Context として）
- 予想コスト: GPT-5.4 側 $3〜5 + Gemini 無料枠

---

## §5. 3ペルソナ判定

### 5.1 ADV判定（Claude.ai）
- 採用76 / 差分4 / 棄却0（LOW除外）で R2 パッケージ作成に進む
- 差分候補2クラスター（I / J）は PO 承認必須（ソロ運用の保守負荷 vs 品質厳密性のトレードオフ）
- それ以外の採用76件は ADV 単独判定で改訂案差分化可

### 5.2 QA検証（ルール適用正確性）
- §1.5 severity定義との整合性: 全クラスターで検証済み
- §13.9 severity inflation 該当: なし（R1初出）
- sub_review_flow §2 Filter 1-7: R2 プロンプトで再適用必須
- §16.5 changed-files-allowlist: R2 パッケージ作成は docs/plans/*.md + lais/verify/*.md 範囲内で正当

### 5.3 PO代理検証（PO方針整合性）
- PD-001「品質最優先」: 全採用項目と整合
- PD-002「既決定は覆さない」: クラスターA〜Hは前版決定の穴を埋める修正。PD-002違反なし
- PD-005「仕組みで解決」: クラスターE（自動化）・G（発火保証）・H（対応表正本化）で完全整合
- PD-007「新プロセスはPO承認」: クラスターD（責務境界再定義）とクラスターI・J（差分候補）は **PO承認必須**
- PD-008「dev-system優先」: 本改訂の位置付けと整合

### 5.4 合議結果
- **採用76件 + 差分候補4件で R2 パッケージ作成に進む**
- **PO承認必須項目**: クラスターD の責務境界再定義 + クラスターI/J の差分候補 → ふとし判断
- **エスカレーション不要**: それ以外の採用項目は ADV 単独判定で進行可

---

## §6. 次アクション

1. **PO承認取得**:
   - クラスターD の責務境界再定義方針（§0/§3.1-§3.3/§C1 の全面整理）
   - クラスターI の差分候補（3件）のA/B選択推奨 or 両案R2投入
   - クラスターJ の差分候補（Hフロー限定化）のA/B選択推奨 or 両案R2投入

2. **R2 パッケージ作成**（ADV、Claude.ai G_43以降）:
   - 本トリアージ §4.2 構成に従い lais/verify/dev_system_v34_r2_package.md を作成
   - dev_system_v34_review_package.md（3,319行）の該当セクションを差分化

3. **R2 外部レビュー実行**（ENG、Code）:
   - Gemini 3.1 Pro + GPT-5.4 × 5ペルソナ = 10本
   - CRITICAL 0 → ゴールデンへ / CRITICAL > 0 → R3（差分縮小）

---

## §7. 参考: LOW 4件（個別トリアージ対象外、集計のみ）

- gpt54/devops_engineer LOW: 1件
- gpt54/qa_lead LOW: 1件
- gpt54/tech_writer LOW: 2件

必要に応じてR2完了後のゴールデン段階で個別確認。

---

（作成: 2026-04-18 G_42 Claude.ai ADV / 10本フル版）
