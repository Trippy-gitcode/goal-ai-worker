# dev-system v3.3 → v3.4 R2 レビューパッケージ

> 作成: 2026-04-18 G_43 Claude.ai (ADV)
> 前版: lais/verify/dev_system_v34_review_package.md（R1パッケージ 3,336行 — 改訂案①〜⑦の全文）
> 直近R1結果: lais/verify/dev_system_v34_r1_triage.md（491行 — 101件→14クラスター統合トリアージ）
> 位置づけ: R1結果に基づき確定した「採用76件 + PO承認済み差分4件」の妥当性を外部レビューで最終検証するための差分化パッケージ
> レビューフロー: sub_review_flow.md §4.C（dev-system仕様レビュー）+ §1.7 修正ラウンド上限4回
> PO承認: PD-104 / PD-105 / PD-106（2026-04-18 G_42 取得済）

---

## §0. パッケージの位置づけ

### 0.1 R1からR2へのスコープ変化

R1パッケージは「改訂案①〜⑦の**全文**の妥当性」を問う 3,336行の大型レビュー対象だった。R1結果（Gemini 3.1 Pro + GPT-5.4 × 5ペルソナ = 10本）で計101件の指摘が寄せられ、ADV 3ペルソナ制で14クラスター（A〜N）に統合・トリアージした。

R2パッケージは R1結果を前提に以下をスコープとする:

- **採用76件**（クラスターA〜H, K〜N の採用分）が改訂案にどう反映されるか、反映方針の妥当性をチェック
- **PO承認済み差分4件**（クラスターI 3件 + クラスターJ 1件、すべて案B確定）の具体仕様が設計として成立しているか検証
- 新たに CRITICAL を出すことは原則抑制（R1で出ていない論点が R2 初出で CRITICAL 化することは severity inflation 扱い）

**R1の改訂案全文は本R2パッケージには再掲しない。** レビュアーは R1 パッケージを「現行案」の参照先として扱い、本R2パッケージで「採用76件の反映差分 + 差分確定4件」を読み、妥当性を判定する。

### 0.2 PO承認事項（R2パッケージ作成の前提）

G_42 で取得した PO（ふとし）の承認3件は本R2パッケージの基盤:

- **PD-104** (クラスターD 責務境界): ADV/ENG/PO の §0 Read リストを3分岐で明文化
  - **ENG** = §C1-C6 全文 + CLAUDE.md + development_rules.md + session_progress.md
  - **ADV** = §C1-C6 全文 + sub_adv_protocol.md + session_progress.md + po-decisions.md 直近10件
  - **PO** = 5行サマリー + キュー先頭ミッションID のみ（§C1-C6 は任意）

- **PD-105** (クラスターI 仕様厳格化): 案B採用 — 仕様厳格化は**認証・決済・外部API呼び出し**に集中
  - 22フロー Step 0 は **章単位集約**（全フローで個別列挙せず）
  - 完了コマンド3区分 N/A理由必須は**高リスク系ミッションのみ**
  - 認証・決済・外部APIは**3区分必須分類**（エスケープ不可）

- **PD-106** (クラスターJ Hフロー): 案B採用 — Hフロー発火条件を **git diff ファイルパスで機械判定**
  - `src/auth/**` / `src/payment/**` / `supabase.ts` / 外部API呼び出しパス変更時のみ発火
  - 機械判定は scripts/hflow_trigger_check.sh として新設
  - それ以外のデプロイは通常フロー（C2）のみで完了

これらは R2 レビュアーにとって「確定仕様」であり、反対意見は severity HIGH 以下でのみ受理する（CRITICAL では受理しない）。

### 0.3 R2レビュアーへのゴール

R2レビュアーは以下を判定する:

1. **採用76件の反映差分**が正しく整合しているか（CONTRADICTION / MISSING / FEASIBILITY 観点）
2. **差分確定4件**（PD-105/PD-106 由来）の具体実装が設計として成立しているか
3. **連鎖更新の網羅性**: 改訂案群の相互依存が取り残しなく反映されているか（特に §4.1 ゲート一覧と §C1-C6 規範間）
4. **R1未指摘の新発見**: R1で出ていない論点で重大なものがあれば HIGH 以下で提出可

**CRITICAL は以下の場合のみ妥当**:
- PD-104/105/106 の前提を破る構造矛盾が R2 差分に含まれている場合
- 採用76件のうち複数クラスターが相互に矛盾している場合
- R1で見落とされた FEASIBILITY CRITICAL（実行不能）が R2 反映差分内に新たに発生している場合

### 0.4 関連ファイル参照

| 資料 | 用途 | 位置 |
|------|------|------|
| 本R2パッケージ | レビュー対象本体 | lais/verify/dev_system_v34_r2_package.md |
| R1パッケージ（改訂案全文） | 現行案の参照先 | lais/verify/dev_system_v34_review_package.md |
| R1トリアージ | 採用/差分/棄却の判定根拠 | lais/verify/dev_system_v34_r1_triage.md |
| R1レビュー結果（10本） | 指摘の原文 | lais/verify/dev_system_v34_r1_{gemini,gpt54}_*.json |
| 現行 dev_system_spec.md v3.3 | 改訂前ベースライン | docs/plans/dev_system_spec.md |
| 現行 sub_infrastructure / sub_testing / sub_adv_protocol / sub_review_flow | 連鎖更新検証用 | docs/plans/sub_*.md |
| 現行 CLAUDE.md / development_rules.md | 連鎖更新検証用 | ルート直下 |

### 0.5 本R2パッケージの章構成

| §  | 内容 | 想定ページ感 |
|----|------|-------------|
| §0 | パッケージの位置づけ（本章） | 概要 |
| §1 | R1結果サマリー | 件数表 |
| §2 | 採用確定項目 Part I（14クラスター） | 中心 |
| §3 | PO承認済み差分確定 Part II（4件） | 仕様 |
| §4 | 改訂案への反映差分 Part III（改訂案①〜⑦） | 差分 |
| §5 | レビュアー指示 Part IV | プロトコル |
| §6 | Cumulative Context Part V | 全履歴 |

---

## §1. R1結果サマリー

### 1.1 ペルソナ別 severity 件数（R1 最終 10本）

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

### 1.2 カテゴリ別 件数（LOW除く 97件）

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

### 1.3 トリアージ結果サマリー

| 区分 | 件数 | 概要 |
|---|---:|---|
| 採用確定（本R2 §2） | 76 | クラスターA〜H, K〜N の採用分 |
| 差分確定（本R2 §3） | 4 | クラスターI 3件 + クラスターJ 1件（PO承認済み案B） |
| 前版triage既解決（内包） | 13 | Gemini3本の暫定トリアージで既採用済み。本R2で整合確認のみ |
| 棄却（LOW個別対象外） | 4 | gpt54 devops/qa_lead/tech_writer の LOW 4件 |
| **合計** | **97** | CRIT 16 + HIGH 46 + MED 35 |

### 1.4 R1で観測された注目パターン

- **CONTRADICTION が最多（29件）**: 改訂案間の整合性破綻がR1で露呈。G11/G12/G13採番、§C規範の位置づけ、§3.1のReadリスト、§5.1 vs §9.1等
- **FEASIBILITY が僅差2位（27件）**: macOS環境・Vite挙動・Cloudflare Pages取得可能範囲・AI運用負荷
- **GPT-5.4 は MED を大量（35件中28件）**: severity inflation の逆傾向。繊細な整合性・文書品質問題を拾う
- **Gemini は CRITICAL に集中（9件）**: 「実行不能 = CRITICAL」のFEASIBILITY判定が鋭い

---

## §2. 採用確定項目 Part I（76件、14クラスター別）

### 2.1 クラスター A — macOS環境非互換（GNU拡張コマンド依存）

**採用件数:** 8件 / **severity分布:** FEASIBILITY CRITICAL × 4 + HIGH × 4

**関連指摘ID:**
- gemini/devops R-001, R-002, R-003, R-004
- gemini/qa_lead R-002
- gemini/tech_writer R-004, R-005, R-007
- gpt54/devops R-009
- gpt54/solo R-005

**統合テーマ:** 改訂案③で新設する scripts群が macOS 標準環境（Bash 3.2, BSD grep/sed/date）と非互換のGNU拡張コマンドを多用しており、ソロ開発者の環境で実行不能。

**主な非互換箇所:**
| 構文/コマンド | 対象スクリプト | BSD/bash3.2 の代替 |
|---|---|---|
| `declare -A`（連想配列） | step0_lint.sh | 改行区切り文字列リスト + `${ENTRY%%:*}` / `${ENTRY##*:}` |
| `grep -oP`（Perl正規表現） | proposal_log_lint.sh / verify_env.sh / verify_external_services.sh | `grep -Eo` + awk 分割、または sed -E |
| `sed '+20p'` | step0_lint.sh 範囲指定 | `head -n N \| tail -n M` の組み合わせ |
| `date -Iseconds` | canopy発火ログ | `date -u +"%Y-%m-%dT%H:%M:%SZ"` |

**対応方針（改訂案③D 全面書き換え）:**
1. 改訂案③で新設する4本（step0_lint.sh / proposal_log_lint.sh / verify_env.sh / verify_external_services.sh）をすべて POSIX互換 + bash 3.2互換に書き換え
2. shebang を `#!/usr/bin/env bash` 維持しつつ、連想配列・`grep -oP`・GNU date拡張を廃止
3. G11 step0_lint.sh は「章見出しの列挙＋遵守確認」のみ担うよう機能簡素化
4. R2 でPOSIX互換版の再検証を推奨（R1で露呈した非互換をすべて潰せているかをレビュアーが確認）

**改訂案反映先:** 改訂案③-D「新設scripts群」全文の書き換え（§4.3 参照）

**QA検証:** sub_review_flow §1.5「実行不能 = FEASIBILITY CRITICAL」に完全合致
**PO代理:** PO方針「ソロ開発者の macOS 継続使用」と整合。Linux 環境対応は将来課題

---

### 2.2 クラスター B — Vite ビルド挙動との矛盾（VITE_* 静的置換）

**採用件数:** 7件 / **severity分布:** CONTRADICTION CRITICAL × 2 + HIGH × 4 + MED × 1

**関連指摘ID:**
- gemini/ai_ops R-001
- gemini/devops R-002
- gemini/tech_writer R-001
- gpt54/devops R-002, R-007
- gpt54/qa_lead R-007
- gpt54/tech_writer R-010

**統合テーマ:** `VITE_*` 環境変数は Vite がビルド時に**値に静的置換**するため、`dist/` 内に変数名は残らない。verify_env.sh の `grep -rq "$VAR" dist/` チェックは常にFAIL → デプロイ確実ブロック。

**派生論点:**
- Cloudflare Pages の環境変数全体を `wrangler pages secret list` で一貫取得できる前提が不明（Pagesビルド時変数と Worker secret は性質が異なる）
- ローカル build の dist 検査は「PaaS に実反映された値」の証明にならない
- `.env` 記法の揺れ（`export VAR=...` / スペース混入）で E3 canopyゲートが誤検知

**対応方針（改訂案③ verify_env.sh 再設計）:**
1. `VITE_*` の **dist/ grep チェックを廃止**（Vite仕様上不可）
2. `.env` / `.dev.vars` に値存在の canopy E3 チェックのみで担保
3. E3 の .env 記法を柔軟化: `grep -qE "^(export[[:space:]]+)?${VAR}[[:space:]]*=" "$ENV_FILE"`
4. Cloudflare Pages の build-time 変数 vs Worker secret の取得方法を verify_env.sh で**分岐明記**
5. 取得不可能な項目は FAIL ではなく **WARN + 手動証跡必須**（認証・決済を除く）
6. **認証・決済は「証跡なし=FAIL」として例外化**（PD-105 と整合）

**改訂案反映先:** 改訂案③-D verify_env.sh 再設計（§4.3）+ 改訂案②§8 Step11 外部サービス連携WARN/FAIL基準表（§4.2）

**QA検証:** §1.5 CONTRADICTION CRITICAL（Vite公式仕様で確実にFAIL）
**PO代理:** PD-105 整合（認証・決済は例外化）+ PD-001 品質最優先

---

### 2.3 クラスター C — 品質ゲート番号体系（G1-G13）の破綻

**採用件数:** 7件 / **severity分布:** CONTRADICTION CRITICAL × 3 + HIGH × 2 + MED × 2

**関連指摘ID:**
- gpt54/ai_ops R-008
- gpt54/qa_lead R-006
- gpt54/solo R-002
- gpt54/tech_writer R-002, R-003, R-004
- gemini/tech_writer R-001

**統合テーマ:** G11/G12/G13 の採番管理が複数改訂案にまたがり破綻。

**具体矛盾:**
- 改訂案①でG11新設、改訂案③でG12新設、改訂案⑤でG13新設
- development_rules.md は G1-G9 表現のまま（改訂案①で G1-G10 拡張のはずが齟齬）
- §4.1 のゲート一覧表にG11の正式行が明示されていない
- Step 0 適用一覧の対象が G1-G9 と G1-G13 で揺れ
- §C1〜§C6の見出し表記が「§C1.」と「§C1」で揺れ → step0_lint.sh が誤検知

**対応方針（構造的修正、複数改訂案に横断反映）:**
1. dev_system_spec §4.1 に **G1-G13 完全版ゲート一覧** を再掲（名称・スクリプト・目的・参照§C を表形式）→ §4.8 参照
2. development_rules.md の Step 0 対象を **G1-G13 に更新**
3. §C1〜§C6 の見出しを「**### §C1. 書き込み規約**」形式に統一（ドット付きに確定）
4. step0_lint.sh の検出パターンを統一見出しに合わせる
5. 全改訂案サマリー・連鎖更新表の記述を再チェック

**改訂案反映先:** 改訂案①（G呼称統合）+ 改訂案③（G12新設）+ 改訂案⑤（G13新設）+ development_rules.md 連鎖更新（§4.1/§4.8/§4.9 参照）

**QA検証:** §1.5 CONTRADICTION CRITICAL（参照番号解釈不能）
**PO代理:** PD-005「仕組みで解決」整合

---

### 2.4 クラスター D — ADV/ENG/PO 責務境界と Read リストの矛盾

**採用件数:** 9件 / **severity分布:** CRITICAL × 1 + HIGH × 8

**関連指摘ID:**
- gemini/ai_ops R-002
- gpt54/ai_ops R-001, R-002
- gpt54/qa_lead R-001
- gpt54/solo R-001, R-003, R-008
- gpt54/tech_writer R-006

**統合テーマ:** §0・§3.1・§3.2・§3.3・§C1・改訂案③ の間で ADV/ENG/PO の役割が多重矛盾。

**具体矛盾点:**
1. **§0 vs §3.1**: §0 Step 0-2 で「§C1-C6 は全層で必須Read」としながら、§3.1 PO起動時Readには session_progress.md しか含まれず、POが規範Readから除外されているのか含まれるのか不明
2. **§3.3 ENG実行範囲**: 「ミッション定義の完了コマンドしか実行しない」とあるが、§8 Step 10-12 のデプロイ検証・canopy実行・提案ログ更新・Step 0 lint など、ミッション定義外で仕様上必須の実行が多数
3. **ADV の書き込み許可**: §C1「ADV/POはコードを書かない」と改訂案③「ADVが提案ログ更新」が衝突
4. **「コード」の定義**: §C1「コード書かない」と §3.2「ADVが多数の仕様書Read」が矛盾。「コード」「ドキュメント」「契約セクション」の用語境界が未定義
5. **ADVの起動時暴走リスク**: §0 Step 0-4/0-5 の「キュー先頭ミッション判定」をADVも実行すると、POの指示を無視してキュー処理を優先する暴走リスク

**対応方針（PD-104 PO承認済み — 3分岐Readリストで決着）:**
1. §0 Step 0-2 の「全層で必須Read」を **ENG/ADV/PO 3分岐** に再構成
   - **ENG**: §C1-C6 全文 + CLAUDE.md + development_rules.md + session_progress.md
   - **ADV**: §C1-C6 全文 + sub_adv_protocol.md + session_progress.md + po-decisions.md 直近10件
   - **PO**: 5行サマリー + キュー先頭ミッションID のみ（§C1-C6 は任意）
2. §3.1 〜 §3.3 を §0 と**完全一致させる表形式**で掲載
3. §3.3 ENG 実行範囲を「**キュー先頭ミッション定義の完了コマンド + 該当フローで必須化された補助コマンド**」に修正
4. §C1 「コード」を「**アプリ実装コード（src/ / frontend/ / scripts実装）**」に限定定義。ドキュメント・テンプレート・契約セクションは別扱いで別表定義
5. §0 Step 0-4/0-5 を **ENG限定**に明記。ADV は「POの指示内容に基づくフロー判定」を最優先
6. §C1 に「session_progress.md（提案ログ含む）はADV書き込み許可対象」を追加

**改訂案反映先:** §0 / §3.1-§3.3 / §C1 全面整理（§4.8 参照）+ sub_adv_protocol.md 連鎖更新

**QA検証:** §1.5 CONTRADICTION CRITICAL（POが仕様通り動くと必ず違反）
**PO代理:** **PD-104 取得済**（2026-04-18）。PD-002「既決定は覆さない」違反なし（責務境界の穴埋め）

---

### 2.5 クラスター E — ADV運用「滞留セッション数手動+1」の破綻

**採用件数:** 4件 / **severity分布:** FEASIBILITY CRITICAL × 1 + HIGH × 2 + MED × 1

**関連指摘ID:**
- gemini/ai_ops R-004
- gemini/solo R-001
- gpt54/devops R-010
- gpt54/solo R-007

**統合テーマ:** 提案ログの「滞留セッション数」を毎セッション開始時にADVが手動で+1する仕様は、AI運用として破綻。

**具体問題:**
- 毎セッションで無意味なGit差分が発生
- コンフリクトの温床
- AIの計算・書き換えミスを誘発
- Chat UI の ADV はセッション開始を自動検知できず、PO の手動トリガーが必須
- 項目数が増えるほど毎セッション負荷が増大
- G12 は検知のみで自動更新はしない仕様矛盾

**対応方針（改訂案③ 提案ログ仕様 + G12 再定義）:**
1. 「滞留セッション数」手動インクリメント仕様を**廃止**
2. 代替: 提案ログに**提案日（YYYY-MM-DD）**または**提案セッションID**を静的記録
3. `proposal_log_lint.sh` が現在日時/セッションIDとの差分を動的計算し滞留警告（例: 3日以上 or 3セッション以上で警告）
4. G12 の機能を「未更新検知」から「**滞留動的判定 + 閾値警告**」に変更

**改訂案反映先:** 改訂案③-C 提案ログ運用仕様 + G12 定義（§4.3 参照）

**QA検証:** §1.5 FEASIBILITY CRITICAL（AI運用で継続破綻）
**PO代理:** PD-005「仕組みで解決」と完全一致

---

### 2.6 クラスター F — 起動時Read量の過大・Step 0再Read問題

**採用件数:** 3件 / **severity分布:** HIGH × 2 + MED × 1（Gemini版暫定triageで既採用、GPT-5.4が追加指摘）

**関連指摘ID:**
- gemini/solo R-002（暫定triage版と重複）
- gpt54/solo R-004, R-005

**統合テーマ:** 起動時Read量がソロ運用として過大 + 22フローStep 0 の「Readして」指示がI/O爆発を招く。

**具体問題:**
- ADV起動時Read: session_progress全文 + bootstrap + CLAUDE契約 + dev_system目次 + §C1-C6 + sub_adv_protocol全文 + po-decisions直近10件 + learned-patterns目次 ≈ 相当量
- ENG起動時も同量
- 22フロー各 Step 0 で「§C○ を Read して遵守」 → AI が毎回 Read ツール発火 → APIコスト・時間膨張
- 短時間修正でも同量Readは遵守率低下

**対応方針（§C0 新設 + Step 0 文言変更 + PD-105 整合）:**
1. **22フロー Step 0 文言を「起動時にReadした§C○を遵守する」に統一**（「Readして」削除 → Step 0 は「参照」のみ）
2. **起動時Readを「毎回必須」と「条件付き再読」に分離**
   - 毎回必須: 5行サマリー + キュー先頭ミッション + **§C0: 規範サマリー（1ページ要約版）**
   - 条件付き再読: §C1-C6 全文 / sub_adv_protocol 全文は「新セッション初回」「仕様更新後」「auto-compact後」のみ
3. **§C0: 規範サマリー を新設**（§C1-C6 の1ページ要約）
4. PD-105 と整合: Step 0 は**章単位集約**（個別22フローで詳細反復しない）

**改訂案反映先:** 改訂案① §C0 新設 + 22フロー Step 0 文言統一（§4.1 / §4.8 参照）

**QA検証:** FEASIBILITY HIGH。起動コストの実測値を R2 後のゴールデンで補完推奨
**PO代理:** PD-105 整合 + ソロ開発アジリティとの両立

---

### 2.7 クラスター G — canopy発火保証の不足（B3解消未達）

**採用件数:** 4件 / **severity分布:** CRITICAL × 1 + HIGH × 1 + MED × 2

**関連指摘ID:**
- gpt54/devops R-001 CRIT
- gpt54/qa_lead R-008, R-009
- gpt54/solo R-011

**統合テーマ:** G13は「フックの存在」しか検証せず、実際の canopy 発火を保証しない。B3対策として掲げた「発火保証」が実装未達。

**具体問題:**
- G13 は `.git/hooks/pre-commit-sub` の存在検証のみ
- pre-commit-sub は git commit 時にしか動作せず、deploy.sh/CI/手動実行との接続未定義
- フック未経由のデプロイ/CI/手動実行でゲート素通り可能
- サブディレクトリアプリは通常 `.git` がない → 配置先として不成立
- G13 の subdir 判定（`.dev-system.version + 親.git`）が誤判定しやすい
- canopy 発火ログが手動実行でも残る → hook 経由発火の証明にならない

**対応方針（改訂案⑤ G13 再設計 + 配置変更）:**
1. pre-commit-sub の配置を `.git/hooks/pre-commit-sub` から **`<SUBDIR>/scripts/pre-commit-sub.sh`**（通常ファイル）に変更
2. 親 `.git/hooks/pre-commit` から通常ファイルパスを直接実行
3. G13 の検証対象を実配置先 `<SUBDIR>/scripts/pre-commit-sub.sh` に更新
4. canopy 実行を **deploy.sh の必須ステップ**として明示（hook以外の経路を閉じる）
5. canopy 発火ログに「**呼び出し元**（pre-commit/pre-push/manual/CI）」を記録
6. G13 の発火保証検証を「**最近N日以内に hook 経由の発火ログが存在する**」に変更
7. subdir 判定を「`init_app.sh --subdir` 時に明示フラグファイル（`.dev-system-subdir`）を配置」で一意化

**改訂案反映先:** 改訂案⑤ init_app.sh --subdir + G13 定義（§4.5）+ 改訂案②§8 deploy.sh 必須ステップ（§4.2）

**QA検証:** §1.5 CONTRADICTION CRITICAL（B3目的と実装未達）
**PO代理:** PD-005「仕組みで解決」整合

---

### 2.8 クラスター H — 3層テスト戦略と完了コマンド3区分の対応破綻

**採用件数:** 7件 / **severity分布:** CRITICAL × 1 + HIGH × 6

**関連指摘ID:**
- gemini/qa_lead R-001, R-003, R-004
- gpt54/qa_lead R-002, R-003, R-004, R-005, R-011
- gpt54/ai_ops R-003

**統合テーマ:** L1/L2/L3 と cmd-unit/cmd-e2e/cmd-realworld の対応、および認証・単一画面ミッションの扱いが複数箇所で矛盾。

**具体矛盾:**
1. サマリー「L1=cmd-realworld / L2=cmd-e2e」 vs §8 Step4（L1をデプロイ前）+ Step12（realworld再実行）で二重定義
2. cmd-realworld が §5.1 で「認証・複数画面・デプロイ系で必須」だが、実行例は `DEPLOY_URL` 前提 → デプロイ前完了判定不能（デッドロック）
3. 認証を含む単一画面ミッションが「画面実装（単一画面）」に分類され cmd-realworld 任意に → 認証漏れリスク（D2解消目的と矛盾）
4. playwright.realworld.config.ts の testDir が `./tests/realworld` ハードコード → 統合E2E（`tests/e2e/integration/`）と分離、テスト0件PASS
5. cmd-e2e の必須条件が §5.1（単一画面でも必須）と §9.1（単一画面は任意）で矛盾
6. 外部サービス連携確認の PASS/WARN/FAIL 基準が Step 11 / Hフロー / deploy.sh で不整合
7. G8 TDD証跡と完了コマンド3区分（cmd-realworld は証跡対象か）の関係未定義

**対応方針（§4.1.1 新設 + §5.1/§9.1 統一 + PD-105 整合）:**
1. **対応表を1箇所で正本化（§4.1.1 新設）:**
   - L1-local（ローカルスモーク・デプロイ前）= cmd-unit の一部
   - L1-realworld（デプロイ後実機スモーク）= cmd-realworld
   - L2 = cmd-e2e
   - L3 = cmd-unit 全体（週次フル）
2. **認証ミッションの分類規則を明記**: 「認証を含むミッションは画面数に関わらず認証・セッション関連として分類し、cmd-realworld 必須」（PD-105 整合）
3. cmd-realworld の完了判定タイミングを**「デプロイ後完了判定」**と明示（実装完了とデプロイ完了を分離）
4. playwright.realworld.config.ts の testDir を `./tests` に広げ、`--grep "MISSION-ID"` でミッション固有を探索
5. §5.1 と §9.1 を統一（「単一画面でも cmd-e2e 必須」推奨）
6. **外部サービス連携のPASS/WARN/FAIL基準表を新設**（サービス種別 × 認証情報有無）
7. G8 TDD証跡を **「AT単位」**に固定。cmd-realworld は AT とは別で「実機検証証跡」に分類

**改訂案反映先:** 改訂案②§8 Step拡張 + §4.1.1 新設（§4.2 参照）+ 改訂案④完了コマンド3区分（§4.4）+ sub_testing.md 連鎖更新

**QA検証:** §1.5 CONTRADICTION CRITICAL（テスト戦略崩壊）
**PO代理:** PD-005 + PD-002 整合。認証分類ルールは PD-105 に含まれる

---

### 2.9 クラスター K — デプロイ反映タイムラグ（前版triageで採用済み、強化）

**採用件数:** 3件 / **severity分布:** HIGH × 2 + MED × 1

**関連指摘ID:**
- gemini/solo R-003
- gemini/devops R-006
- gpt54/ai_ops R-007（一部該当）

**統合テーマ:** Cloudflare Pages のデプロイ反映タイムラグにより、`curl -s $URL | grep version` が旧版を返すタイミングでゲート素通りの可能性。

**対応方針（改訂案② §8 Step8 強化、前版triageと継続）:**
- Step 8 の curl 疎通確認を「**新バージョン（コミットハッシュ）が返るまでポーリング**（最大30秒/2秒間隔）」に拡張
- Step 12 の Playwright は**反映確認後に実行**
- 追加: deploy.sh の**失敗時リカバリ処理**（session_progress.md への失敗記録）を明文化

**改訂案反映先:** 改訂案② §8 Step8 ポーリング + Step12 前提（§4.2 参照）

**QA検証:** HIGH（確実にFAILする条件は限定的だが、再現性がタイミング依存）
**PO代理:** PD-001 品質最優先整合

---

### 2.10 クラスター L — verify_external_services.sh 実装不具合

**採用件数:** 4件 / **severity分布:** CRITICAL × 1 + HIGH × 1 + MED × 2

**関連指摘ID:**
- gemini/tech_writer R-003 CRIT
- gemini/qa_lead R-005
- gpt54/ai_ops R-003（派生）
- gpt54/tech_writer R-010

**統合テーマ:** Supabase API の redirect_urls は配列なのに `.split(',')` を呼んでいる → AttributeError でクラッシュ。他の項目も型想定ミス。

**対応方針（改訂案③ verify_external_services.sh 型安全化）:**
- 型安全な実装に修正: `urls=d.get('redirect_urls', []); print('\n'.join(urls) if isinstance(urls, list) else '\n'.join(urls.split(',')))`
- または jq 使用で型に依存しない抽出
- **`wrangler whoami` による認証状態確認を事前に追加**。未認証時は FAIL ではなく WARN + 手動確認
- クラスターA（POSIX互換化）と連動して書き換える

**改訂案反映先:** 改訂案③-D verify_external_services.sh 再設計（§4.3 参照）

**QA検証:** §1.5 FEASIBILITY CRITICAL（AttributeError で確実にクラッシュ）
**PO代理:** PD-001 + PD-105（認証・決済は別扱い）整合

---

### 2.11 クラスター M — 移行マップ・採番一覧の不完全性（まとめて対応）

**採用件数:** 11件 / **severity分布:** MED多数 + HIGH 数件

**関連指摘ID:**
- gemini/tech_writer R-005, R-006
- gpt54/ai_ops R-005
- gpt54/tech_writer R-011〜R-018

**統合テーマ:** 改訂案間の記述と本文の整合性が全体的に甘い。参照表記・連鎖更新表・ファイル一覧・項目番号の不完全性が多数。

**対応方針（全改訂案横断で整備）:**
1. 参照表記を統一ルールで全文リファクタ: `§4.1 / §C2 / §4.1 G11`、複数参照は `§C2, §C6`
2. §1.1 を「改訂対象 + 新設対象」に再整理（ファイル数を実数に修正）
3. §15.3 項目10/11 の最終形を §15.3 本文内で完全掲載
4. §4.3 連鎖更新表に `templates/session_progress_template.md` 等を追加
5. §3.6 旧→新移行マップの項目数を表の実数に一致
6. `app_config_template.yaml` に `deploy.project_name` 定義追加
7. 用語統一: 規範=横断ルール / フロー=手順 / ゲート=機械検証 / ルール=総称。「鉄則」は §3.6 のみで使用

**改訂案反映先:** 全改訂案横断（特に改訂案① §1.1 + §4.3 + §3.6）

**QA検証:** AMBIGUITY HIGH〜MED（参照解釈ブレ）
**PO代理:** PD-005 整合

---

### 2.12 クラスター N — その他 HIGH/MED 単体採用（15件）

以下は単発ながら採用妥当。個別に改訂案へ反映:

| # | ID | severity | 指摘 | 改訂案反映先 |
|---|-----|---------|------|-----------|
| N-1 | gemini/ai_ops R-003 | HIGH | auto-compact検知は Code に不可能 → 代替トリガー | 改訂案⑦: 「ミッション再開時」「エラー連続時」「テスト実行前」に変更 |
| N-2 | gemini/ai_ops R-005 | HIGH | 認証系 cmd-realworld 必須でデプロイ環境未構築時デッドロック | 改訂案④: フェーズ別エスケープハッチ明記（ローカルエミュ代替可） |
| N-3 | gemini/ai_ops R-006 | MED | report_lint.sh に曖昧用語12語検知ロジック未記載 | 改訂案③: 正規表現追記 |
| N-4 | gemini/qa_lead R-006 | HIGH | Code Pre-Review でブラウザ直接操作を要求 → 不可能 | 改訂案⑥: E2Eテスト経由の検証要件に修正 |
| N-5 | gemini/qa_lead R-007 | HIGH | toHaveURL(/./) は何でもPASS → 検証不十分 | 改訂案④: ホーム画面特有要素の waitForSelector に変更 |
| N-6 | gemini/tech_writer R-002 | CRIT | init_app.sh --subdir の .gitignore 部分一致バグ | 改訂案⑤: `grep -q "^# Sub-app: $SUBDIR_NAME$"` で完全一致 |
| N-7 | gemini/qa_lead R-004 | HIGH | TDD証跡のファイル名衝突（before.json） | 改訂案⑥: before-unit.json / before-e2e.json に分離 |
| N-8 | gpt54/qa_lead R-012 | MED | realworld テンプレが DOM アサーション多用 → §C2と境界曖昧 | 改訂案⑥: §C2で「非視覚条件の自動アサーションは可」を限定記述 |
| N-9 | gpt54/qa_lead R-013 | MED | SKIP/N/A/WARN の用語混在 | 改訂案④: 統一定義（SKIP=理由必須、N/A=仕様上不要、WARN=手動移譲） |
| N-10 | gemini/qa_lead R-009 | MED | end_user.md と end_user_integration.md の表記揺れ | 改訂案⑥: end_user_integration.md に統一 |
| N-11 | gpt54/tech_writer R-015, R-016, R-018 | MED | 滞留セッション数のセッション定義 / bidir_design_lint の実装時期 | 改訂案③ + 別注記に分離 |
| N-12 | gpt54/devops R-008 | MED | canopy発火ログの fail_count が真偽値と件数の混用 | 改訂案⑤: `failed`（真偽値）に改名 |
| N-13 | gemini/devops R-004 | MED | pre-commit-sub の git diff パス抽出が core.quotepath 影響 | 改訂案⑤: `git diff --cached --name-only --relative` に変更 |
| N-14 | gemini/qa_lead R-008 | MED | init_app.sh の .git/hooks ディレクトリ未作成 | 改訂案⑤: `mkdir -p` 追加 |
| N-15 | gemini/tech_writer R-009 | MED | test_realworld_template で絶対URL組み立て | 改訂案⑥: `page.goto('/')` に変更（baseURL 活用） |

**改訂案反映先:** §4.3 / §4.5 / §4.6 / §4.7 に分散反映

**QA検証:** 個別検証。N-6 は CRITICAL（実行不能バグ）、他は HIGH/MED
**PO代理:** PD-001 + PD-005 整合

---

## §3. PO承認済み差分確定 Part II（4件）

R1で「差分候補」として分類された4件は、G_42 で PO（ふとし）承認を取得し、それぞれ**案Bを確定仕様**として採用済み。本§3はその確定仕様の詳細を定義する。

### 3.1 クラスター I — 仕様厳格化は認証・決済・外部APIに集中（PD-105）

**採用件数:** 差分候補3件 → **案B確定**（PD-105 = 2026-04-18 G_42 取得）

**関連指摘ID:**
- gpt54/solo R-005, R-006, R-009
- gemini/solo R-005

**元のトレードオフ（R1時点）:**
- **案A（仕様厳守）**: 現行通り22フロー Step 0 + 3区分 N/A 理由必須。G11/mission_linter で機械検証
- **案B（ソロ最適化）**: Step 0 は章単位集約。N/A 理由必須は高リスク系ミッションのみ

**PO確定案（案B + 条件付き厳格化）:**

#### 3.1.1 Step 0 は章単位集約（全22フロー個別列挙廃止）

- 各22フローのStep 0 は「**起動時にReadした §C0-C6 を遵守する**」の一文のみ記載
- §C0-C6 本体が「全フロー横断で適用」と明記
- ただし以下のフローは **Step 0 で適用対象§Cを明示列挙**（誤認防止）:
  - 認証ミッションフロー: §C2（テスト戦略）+ §C6（外部サービス連携）
  - 決済ミッションフロー: §C2 + §C6
  - 外部API呼び出しミッション: §C6

#### 3.1.2 完了コマンド3区分 N/A理由必須は高リスク系ミッションのみ

- 高リスク系（以下のいずれか該当）は **N/A理由必須 + mission_linter 機械検証**:
  - 認証を含むミッション
  - 決済を含むミッション
  - 外部API呼び出しを含むミッション
  - 既存 DB スキーマ変更を含むミッション
- 低リスク系（画面実装のみ、UIスタイル調整、仕様ドキュメント更新等）は **N/A理由を任意化**

#### 3.1.3 認証・決済・外部APIは3区分必須分類（エスケープ不可）

- 3区分とは: cmd-unit / cmd-e2e / cmd-realworld（クラスターH参照）
- 認証・決済・外部APIを含むミッションは、画面数に関わらず**3区分すべてが必須**
- 「単一画面だから cmd-realworld 任意」というエスケープは認めない

#### 3.1.4 機械検証の実装

- `scripts/mission_risk_classifier.sh` を新設
- ミッション定義の `対象ファイル:` から `src/auth/**` / `src/payment/**` / `src/services/external/**` を検出
- 該当あり → 「**高リスク** ミッション」フラグ付与 → N/A理由必須ルール適用
- 該当なし → 低リスク扱い
- G11 step0_lint.sh は常にStep 0 参照を検証（高低問わず）

**改訂案反映先:** 改訂案④（完了コマンド3区分）§4.4 + 改訂案③（mission_risk_classifier.sh 新設）§4.3

**QA検証:** PD-105 整合。厳格化を高リスクに限定することで「最重要箇所の品質保全」と「ソロ運用負荷」を両立
**PO代理:** PD-001 + PD-003（ソロアジリティ）の明示的トレードオフ。PD-105 で確定

---

### 3.2 クラスター J — Hフロー発火条件を git diff で機械判定（PD-106）

**採用件数:** 差分候補1件 → **案B確定**（PD-106 = 2026-04-18 G_42 取得）

**関連指摘ID:**
- gemini/solo R-004
- gpt54/solo R-012

**元のトレードオフ（R1時点）:**
- **案A（厳格）**: 現行通りデプロイ毎にHフロー実行
- **案B（限定）**: 認証/決済/外部連携ありのケース、または大型機能完了後のみ

**PO確定案（案B + 機械判定自動化）:**

#### 3.2.1 Hフロー発火条件（機械判定）

以下のファイルパスを `git diff` で検出し、**1つでも該当すればHフロー発火**:

```
src/auth/**              # 認証関連
src/payment/**           # 決済関連
src/services/supabase.ts # Supabase クライアント
src/services/external/** # 外部API呼び出し群
worker/src/auth/**       # Worker側認証
worker/src/payment/**    # Worker側決済
```

ファイルパターンの完全な定義は `scripts/hflow_trigger_check.sh` に集約する。

#### 3.2.2 hflow_trigger_check.sh の仕様

- 前提: git diff --cached --name-only --relative で変更ファイル一覧を取得
- 検出ロジック: 上記パターンとの完全一致（ワイルドカード展開は shell ではなく awk/sed で実装。macOS互換）
- 出力:
  - 該当あり → `HFLOW_REQUIRED=1` を返す（deploy.sh が検知してHフロー起動）
  - 該当なし → `HFLOW_REQUIRED=0` を返す（通常C2フロー継続）
- ログ: `logs/hflow_trigger.log` に発火判定履歴を記録（判定時刻 + 検出ファイル名 + 判定結果）

#### 3.2.3 Hフロー非発火時のフォールバック

- 該当なしで通常C2フロー実行 → §8 Step12（L1-realworld スモーク）は必須継続
- 「Hフロー非発火 = テスト軽量化」とは扱わない（L1-realworld 4基本操作は全デプロイで実行）

#### 3.2.4 強制発火フラグ（手動上書き）

- 大型リファクタ・アーキテクチャ変更等、自動判定では拾えないケース向けに:
- ミッション定義に `HFLOW_FORCE: true` フラグ → hflow_trigger_check.sh がこれを検知して強制発火
- PO または ADV が意図的にフラグを立てる（ENGからの自律追加は禁止）

**改訂案反映先:** 改訂案⑥ sub_review_flow §4.H 統合フローレビュー（§4.6 参照）+ 改訂案③ hflow_trigger_check.sh 新設（§4.3）

**QA検証:** PD-106 整合。発火条件を機械判定することで運用負荷と品質ゲート厳密性を両立
**PO代理:** PD-003 + PD-007（新プロセスはPO承認）整合。PD-106 で確定

---

### 3.3 差分確定4件の整合性チェック

- **PD-105（Iの3件）と PD-106（Jの1件）は独立運用可**: I は「完了コマンド厳格化の対象範囲」、J は「Hフロー発火条件」で別軸
- **両者に共通する「高リスクの定義」**: src/auth/\*\* / src/payment/\*\* / supabase.ts / 外部API呼び出し群 → 同一パターンを使う
- **実装共有**: `scripts/mission_risk_classifier.sh`（PD-105用）と `scripts/hflow_trigger_check.sh`（PD-106用）は**共通ライブラリ `scripts/lib/risk_patterns.sh`** に risk_paths 定義を集約してDRY化
- 本R2で R2 レビュアーは「両者の共通パターン定義が崩れていないか」を確認すること（§5 参照）

---

## §4. 改訂案への反映差分 Part III

本章は改訂案①〜⑦の各々に対し、本R2で追加される差分パッチを示す。**改訂案本文の全文再掲は行わず、該当セクション番号＋変更内容のみ記述する。** レビュアーはR1パッケージ（`lais/verify/dev_system_v34_review_package.md`）の該当行を参照しつつ、本差分の妥当性を判定する。

### 4.1 改訂案①（鉄則呼称統合 + §C規範再構成）への差分

R1パッケージの該当行: 687行〜（改訂案①）

**4.1.1 §C見出し統一（クラスターC, M 反映）**

- §C1〜§C6 の見出しを「`### §C1. 書き込み規約`」形式に統一（ドット付き）
- step0_lint.sh の検出パターンも同形式に合わせる: `^### §C[0-9]\.\s+`
- §C0「規範サマリー（1ページ要約）」を新設 — §C1〜§C6 を各2行程度で要約

**4.1.2 §0 Read リスト 3分岐化（クラスターD, PD-104 反映）**

- §0 Step 0-2 を以下の表形式に置換:

```
| 層   | 必須Read                                                                 | 条件付き再読                    |
|------|--------------------------------------------------------------------------|--------------------------------|
| ENG  | §C0-C6 全文 + CLAUDE.md + development_rules.md + session_progress.md    | auto-compact後、仕様更新後      |
| ADV  | §C0-C6 全文 + sub_adv_protocol.md + session_progress.md + po-decisions直近10件 | 同上                     |
| PO   | 5行サマリー + キュー先頭ミッションID のみ                                 | §C1-C6 は任意                  |
```

**4.1.3 §3.1-§3.3 を §0 と完全一致（クラスターD 反映）**

- §3.1（PO起動時Read）: §0 の PO 層に一致
- §3.2（ADV起動時Read）: §0 の ADV 層に一致
- §3.3（ENG起動時Read + 実行範囲）: §0 の ENG 層に一致
- §3.3 ENG実行範囲の定義を変更: 「**キュー先頭ミッション定義の完了コマンド + 該当フローで必須化された補助コマンド**」
- §3.3 補助コマンド一覧表を新設: §8 Step10-12 / canopy 実行 / Step 0 lint / 提案ログ更新（ADV委託時）

**4.1.4 §C1「コード」定義明確化（クラスターD 反映）**

- §C1 冒頭に用語定義を追加:
  - **アプリ実装コード** = `src/**` / `frontend/**` / `scripts/*実装*.js` / `worker/src/**`（ADV/POは書かない）
  - **ドキュメント** = `docs/**` / `README.md` / `*.md`（ADVが書いて良い）
  - **テンプレート** = `templates/**`（ADVが書いて良い）
  - **契約セクション** = CLAUDE.md の「🔒 契約セクション」以下（ADV経由のみ書ける）
  - **session_progress.md** = ADV が提案ログ・キュー更新で書ける（例外的許可）

**4.1.5 §0 Step 0-4/0-5 をENG限定化（クラスターD 反映）**

- §0 Step 0-4「キュー先頭ミッション判定」に「**ENG限定**」注記
- §0 Step 0-5「自律実行着手」に「**ENG限定**」注記
- ADV/PO の Step 0 には「POの指示内容を最優先」を追加

**4.1.6 §C0 規範サマリー 新設（クラスターF 反映）**

新規見出し `### §C0. 規範サマリー（1ページ要約）` を §C1 直前に挿入。内容:

```
- §C1: ファイル書き込み権限。src/frontend/scripts実装 はENG限定。ドキュメント・templates・session_progress.md はADV可
- §C2: テスト戦略。L1-local/L1-realworld/L2/L3 と cmd-unit/cmd-e2e/cmd-realworld の対応は §4.1.1 表参照
- §C3: デプロイフロー C2/Hフロー。Hフロー発火はscripts/hflow_trigger_check.sh判定（PD-106）
- §C4: 提案ログ運用。滞留判定は日付/セッションIDの動的計算（proposal_log_lint.sh）
- §C5: レビュー（sub_review_flow.md）の層分け。主審制 / Cumulative Context / severity inflation注意
- §C6: 外部サービス連携の証跡。認証・決済は証跡なし=FAIL。他は WARN+手動確認可
```

**4.1.7 22フロー Step 0 文言統一（クラスターF, PD-105 反映）**

全22フローの Step 0 を以下の文言に統一:

```
Step 0: 起動時にReadした §C0-C6 を遵守する。(※フローによる適用§C明示列挙は次行)
[該当§C明示リスト]:
- 認証ミッション: §C2 + §C6
- 決済ミッション: §C2 + §C6
- 外部API呼び出しミッション: §C6
- その他: §C0 のみ
```

### 4.2 改訂案②（§8 C2デプロイフロー拡張）への差分

R1パッケージの該当行: 1104行〜（改訂案②）

**4.2.1 §8 Step8 ポーリング強化（クラスターK 反映）**

- 現行「`curl -s $URL | grep version`」を以下に置換:

```bash
# 新バージョン（コミットハッシュ）反映まで最大30秒ポーリング
COMMIT_HASH=$(git rev-parse --short HEAD)
for i in $(seq 1 15); do
  if curl -s "$URL" | grep -q "$COMMIT_HASH"; then
    echo "PASS: $COMMIT_HASH reflected after ${i}x2s"
    break
  fi
  sleep 2
done
# 15回（30秒）経過後もHITなしならFAIL
curl -s "$URL" | grep -q "$COMMIT_HASH" || { echo "FAIL: deploy not reflected in 30s"; exit 1; }
```

**4.2.2 §8 Step11 外部サービス連携 WARN/FAIL基準表（クラスターB, H 反映）**

- 現行の一律FAIL扱いを以下の表に置換:

| サービス種別 | 認証情報あり | 認証情報なし（未設定） |
|---|---|---|
| 認証（Supabase Auth等） | FAIL | FAIL（エスケープ不可） |
| 決済（Stripe等） | FAIL | FAIL（エスケープ不可） |
| 外部API（AI APIs等） | FAIL | WARN + 手動証跡（session_progress.md 追記必須）|
| その他（ログ系・解析系） | WARN | WARN |

**4.2.3 §8 Step12 L1-realworld スモーク義務化（クラスターH 反映）**

- Step12 を「デプロイ後 Playwright realworld スモーク」として必須化
- 対象: 4基本操作（起動 / 主機能1操作 / 主機能2操作 / リロード残存確認）
- Step12 は Step8 のポーリング完了後に実行
- 失敗時: deploy.sh がロールバック or session_progress.md に失敗記録 + 次ミッション先頭に「DEPLOY-RECOVER-{タイムスタンプ}」として追加

**4.2.4 §8 deploy.sh 失敗時リカバリ処理（クラスターK 反映）**

- Step8/Step11/Step12 の何れかがFAIL時の動作を明文化:
  1. session_progress.md に「DEPLOY-FAIL」提案ログを追記（失敗Step + エラー要約 + ログパス）
  2. 次ミッションとして「DEPLOY-RECOVER-{MISSION-ID}」を先頭に挿入
  3. CF Pages 直前リビジョンへの rollback コマンド例を `docs/debugging-guide.md` から参照（scripts/cf_rollback.sh 新設）
- rollback が自動成功した場合も、原因調査ミッションは必須キュー化

**4.2.5 §4.1.1 3層テスト戦略対応表 新設（クラスターH 反映）**

新規セクション `### §4.1.1 3層テスト戦略と完了コマンド3区分の対応表`:

```
| 層          | 目的                     | タイミング          | 完了コマンド          | 証跡          |
|-------------|--------------------------|---------------------|---------------------|---------------|
| L1-local    | ローカル最小スモーク      | デプロイ前          | cmd-unit の一部      | tests/unit/   |
| L1-realworld| デプロイ後実機スモーク    | デプロイ直後        | cmd-realworld       | tests/realworld/ |
| L2          | 画面単位/フロー単位E2E    | 実装完了時          | cmd-e2e             | tests/e2e/    |
| L3          | 全テスト+週次フル        | 週次 or リリース前   | cmd-unit + cmd-e2e 全体 | tests/全域    |
```

### 4.3 改訂案③（新設scripts群 + 責務境界）への差分

R1パッケージの該当行: 1553行〜（改訂案③）

**4.3.1 新設scripts群 POSIX互換化（クラスターA 反映）**

改訂案③-Dで新設する4本を全面書き換え:

- `scripts/step0_lint.sh`: Bash 3.2互換 + BSD grep/sed 対応
- `scripts/proposal_log_lint.sh`: `grep -oP` → `grep -Eo` + awk
- `scripts/verify_env.sh`: `grep -oP` 削除 + .env記法柔軟化（§4.2.2 WARN/FAIL表と整合）
- `scripts/verify_external_services.sh`: 型安全化（クラスターL 反映）+ wrangler whoami 事前確認

**4.3.2 verify_external_services.sh 型安全化（クラスターL 反映）**

Python 部分の修正例:

```python
urls = d.get('redirect_urls', [])
if isinstance(urls, list):
    print('\n'.join(urls))
elif isinstance(urls, str):
    print('\n'.join(urls.split(',')))
else:
    print('', file=sys.stderr)
    sys.exit(2)  # unexpected type → WARN扱い
```

事前チェック追加:

```bash
wrangler whoami > /dev/null 2>&1 || { echo "WARN: wrangler not authenticated, skipping CF Pages check"; exit 0; }
```

**4.3.3 提案ログ「滞留セッション数」自動化（クラスターE 反映）**

- 手動+1仕様を廃止
- 提案ログ項目に「**提案日（YYYY-MM-DD）**」または「**提案セッションID（例: G_42）**」を必須化
- `proposal_log_lint.sh` が現在日時/セッションIDとの差分を動的計算
- 警告閾値: 3日以上 or 3セッション以上で `stale: true` フラグ付与
- G12 の定義を「未更新検知」から「**滞留動的判定 + 閾値警告**」に変更

**4.3.4 mission_risk_classifier.sh 新設（PD-105 反映）**

新規スクリプト `scripts/mission_risk_classifier.sh`:

```bash
#!/usr/bin/env bash
# ミッション定義から高リスク/低リスクを判定
# 入力: ミッション定義ファイルパス
# 出力: HIGH_RISK=1 or 0
MISSION_FILE="$1"
source scripts/lib/risk_patterns.sh  # risk_paths 定義の共通化

# 対象ファイルセクションからパス抽出
TARGET_FILES=$(awk '/^対象ファイル:/,/^$/' "$MISSION_FILE" | tail -n +2)

HIGH_RISK=0
for pattern in "${RISK_PATHS[@]}"; do
  if echo "$TARGET_FILES" | grep -q "$pattern"; then
    HIGH_RISK=1
    break
  fi
done
echo "HIGH_RISK=$HIGH_RISK"
```

**4.3.5 hflow_trigger_check.sh 新設（PD-106 反映）**

新規スクリプト `scripts/hflow_trigger_check.sh`: §3.2.2 参照。risk_patterns.sh を共有ライブラリ化。

**4.3.6 scripts/lib/risk_patterns.sh 共通化（PD-105/106 整合）**

```bash
# scripts/lib/risk_patterns.sh
RISK_PATHS=(
  "src/auth/"
  "src/payment/"
  "src/services/supabase.ts"
  "src/services/external/"
  "worker/src/auth/"
  "worker/src/payment/"
)
```

mission_risk_classifier.sh と hflow_trigger_check.sh の両方がこれを source して使う。

**4.3.7 report_lint.sh 曖昧用語検知（クラスターN N-3 反映）**

development_rules.md G9 の12語禁止リストを report_lint.sh で正規表現検知:

```bash
FORBIDDEN_WORDS="確認した|表示されている|正常に動作|問題なし|対応済み|修正済み|実装済み|開いている|閉じている|存在する|反映されている|変化した"
grep -nE "$FORBIDDEN_WORDS" "$REPORT_FILE" && exit 1 || exit 0
```

### 4.4 改訂案④（完了コマンド3区分）への差分

R1パッケージの該当行: 1892行〜（改訂案④）

**4.4.1 3区分の対応関係と L層との対応表（クラスターH 反映）**

改訂案④冒頭に §4.1.1 表を参照する注記を追加（§4.2.5 で新設）。

**4.4.2 N/A理由必須化の条件分岐（PD-105 反映）**

- 高リスク系ミッション（mission_risk_classifier.sh で HIGH_RISK=1）:
  - cmd-unit / cmd-e2e / cmd-realworld すべて定義必須
  - 省略時は **N/A理由必須**（mission_linter がチェック）
- 低リスク系ミッション（HIGH_RISK=0）:
  - 3区分のうち該当する区分のみ定義
  - 省略時の N/A理由 は **任意**

**4.4.3 cmd-realworld の完了判定タイミング明示（クラスターH 反映）**

- 実装完了 ≠ ミッション完了
- 高リスク系ミッションの完了判定は「**デプロイ後の cmd-realworld PASS を確認した時点**」
- deploy.sh の §8 Step12 PASS がミッションDONE の必要条件

**4.4.4 認証ミッションの分類（PD-105 反映）**

- 画面数に関わらず、認証を含むミッションは `MISSION_TYPE: auth` 必須
- auth タイプは cmd-realworld 必須（エスケープ不可）

**4.4.5 playwright.realworld.config.ts testDir 広域化（クラスターH 反映）**

- testDir を `./tests` に変更
- 各テストファイル冒頭に `test.describe('MISSION-ID', ...)` ラベル付与
- 実行時は `--grep "MISSION-ID"` でミッション固有のみ抽出

**4.4.6 toHaveURL 廃止（N-5 反映）**

- `toHaveURL(/./)` を禁止
- 代わりに各画面のホーム要素（例: `data-screen="dashboard"`）を `waitForSelector` で検証

**4.4.7 SKIP/N/A/WARN 用語統一（N-9 反映）**

| 用語  | 意味 | 用法 |
|-------|------|------|
| SKIP  | 実行可能だが意図的にスキップ。理由必須 | cmd-* のセル値 |
| N/A   | 仕様上不要。該当しないため省略 | cmd-* のセル値 |
| WARN  | 完了判定外の手動確認に移譲 | 外部サービス連携等 |

**4.4.8 デプロイ環境未構築時のエスケープハッチ（N-2 反映）**

- 初期セットアップ期など、デプロイ環境未構築時は cmd-realworld を**ローカルエミュで代替可**
- エスケープ条件: `wrangler dev` または `supabase start` のいずれかでローカル起動可能
- エスケープ期間: 初回デプロイまで（以後は必須）

### 4.5 改訂案⑤（init_app.sh --subdir + G13）への差分

R1パッケージの該当行: 2218行〜（改訂案⑤）

**4.5.1 pre-commit-sub 配置変更（クラスターG 反映）**

- 配置先: `<SUBDIR>/scripts/pre-commit-sub.sh`（通常ファイル、実行権限付き）
- 親 `.git/hooks/pre-commit` から以下で呼び出し:

```bash
for subdir in $(find . -maxdepth 2 -name ".dev-system-subdir" -type f); do
  SUBDIR_ROOT=$(dirname "$subdir")
  HOOK="$SUBDIR_ROOT/scripts/pre-commit-sub.sh"
  [ -x "$HOOK" ] && "$HOOK" || exit 1
done
```

**4.5.2 subdir判定フラグファイル（クラスターG 反映）**

- `init_app.sh --subdir` 時に `.dev-system-subdir` フラグファイルを配置
- G13 は `.dev-system-subdir` 存在時のみ subdir判定

**4.5.3 .gitignore 完全一致（N-6 反映）**

- 現行「`grep -q "$SUBDIR_NAME"`」を「`grep -q "^# Sub-app: $SUBDIR_NAME$"`」に変更
- コメント行マーカーで完全一致化 → 誤マッチ防止

**4.5.4 canopy発火ログ 呼び出し元記録（クラスターG 反映）**

- `logs/canopy_fire.log` の各行に呼び出し元タグを追加:
  - `[pre-commit]` / `[pre-push]` / `[manual]` / `[ci]` / `[deploy.sh]`
- G13 検証: 最近N日以内に `[pre-commit]` または `[deploy.sh]` タグが存在することを確認

**4.5.5 fail_count → failed 改名（N-12 反映）**

- canopy発火ログの `fail_count` フィールドを真偽値 `failed` に改名（型混用解消）
- 件数は別フィールド `failed_items` で記録

**4.5.6 git diff --relative 指定（N-13 反映）**

- pre-commit-sub.sh 内の git diff 呼び出しを以下に変更:

```bash
git diff --cached --name-only --relative
```

- core.quotepath 影響を受けず、マルチバイトファイル名でも正しく抽出

**4.5.7 mkdir -p 追加（N-14 反映）**

- init_app.sh 冒頭に `.git/hooks` ディレクトリ作成を追加:

```bash
mkdir -p "$PARENT_GIT_ROOT/.git/hooks"
```

### 4.6 改訂案⑥（sub_review_flow §4.H 統合フローレビュー）への差分

R1パッケージの該当行: 2639行〜（改訂案⑥）

**4.6.1 §4.H Hフロー発火条件の機械判定化（PD-106 反映）**

- §4.H 冒頭に「Hフロー発火判定は scripts/hflow_trigger_check.sh が行う」を明記
- §3.2（本R2）で定義した機械判定パターンを §4.H に参照リンク
- 手動強制フラグ `HFLOW_FORCE: true` の運用を §4.H-5 として新設

**4.6.2 Pre-Review のブラウザ直接操作廃止（N-4 反映）**

- 現行「Pre-Review で devops_engineer がブラウザ直接操作」を廃止
- 代替: E2E テスト経由での検証（Playwright spec 実行結果の JSON を Pre-Review に入力）

**4.6.3 TDD証跡ファイル名分離（N-7 反映）**

- `before.json` → `before-unit.json` / `before-e2e.json` / `before-realworld.json` に分離
- 3区分それぞれの RED 段階ログを別名保存 → ファイル衝突解消

**4.6.4 realworld テンプレの DOM アサーション境界（N-8 反映）**

- §C2 に「非視覚条件の自動アサーション（URL / data-* 属性 / JSON応答検証）は可」を限定記述
- 視覚検証（スクショ判定）は G9 の管轄として明確化

**4.6.5 end_user.md → end_user_integration.md 統一（N-10 反映）**

- 改訂案⑥で新設するテンプレート名を `end_user_integration.md` に統一
- 旧 end_user.md は廃止 or 参照リダイレクトのみ残す

**4.6.6 test_realworld_template baseURL 利用（N-15 反映）**

- 絶対URL組み立てを廃止
- `page.goto('/')` 方式（playwright.realworld.config.ts の baseURL 設定を活用）

### 4.7 改訂案⑦（auto-compact + CLAUDE.md契約セクション整理）への差分

R1パッケージの該当行: 2940行〜（改訂案⑦）

**4.7.1 auto-compact 検知の代替トリガー（N-1 反映）**

- Code側から auto-compact 発生を自動検知する手段はないため、代替トリガー:
  - 「**ミッション再開時**」に過去セッションログの最終行を照合
  - 「**エラー連続時**」（3連続同一エラー）にコンテキスト喪失を疑う
  - 「**テスト実行前**」に §C0-C6 の再読を義務化

**4.7.2 CLAUDE.md 鉄則セクション削除 + 起動時Read指示追加**

- 「🔒 契約セクション」外の鉄則セクションを削除（sub_adv_protocol.md + §C1-C6 に移管）
- CLAUDE.md 冒頭に「起動時にdocs/plans/dev_system_spec.md §C0-C6 を参照」を明記
- ENG実行時の判断根拠として §C を First-class citizen に位置付け

**4.7.3 CLAUDE.md 契約セクション内「ふとしの方針メモ」整理**

- 共通知見（全プロジェクト共通）2項目を削除（§C / sub_adv_protocol.md に移管）
- プロジェクト固有（Goal AI / Lais）は残す
- 整理作業は **ADV経由必須**（§C1 の契約セクション書き込み権限に従う）

### 4.8 §4.1 G1-G13完全版ゲート一覧の再構築

R1 クラスターC で指摘された番号体系破綻を解消する新しい §4.1 表:

```
| #   | 名称                  | スクリプト                          | 目的                                    | 参照§C  |
|-----|----------------------|-----------------------------------|----------------------------------------|--------|
| G1  | バージョン同期        | canopy_common.sh::check_version   | APP_VERSION の4箇所整合性                | §C1    |
| G2  | UI変更時Stage A       | scripts/c16_stage_a.js            | mockup vs 実装の比較画像                 | §C2    |
| G3  | テスト項目数カウント  | canopy_common.sh::check_test_count| TEST >= SPEC                          | §C2    |
| G4  | テスト全件PASS        | canopy_common.sh::check_test_pass | failed=0                              | §C2    |
| G5  | 完了報告フォーマット   | scripts/report_lint.sh            | 分母付き3区分+曖昧用語禁止               | §C5    |
| G6  | デプロイ前パイプライン | scripts/deploy.sh (pre-flight)    | canopy→テスト→tag→push→deploy            | §C3    |
| G7  | 仕様↔完了コマンド対応  | canopy_common.sh::check_spec_map  | SPEC == MAP                           | §C2    |
| G8  | テストファースト       | canopy_common.sh::check_tdd       | RED→GREEN の証跡                       | §C2    |
| G9  | デプロイ前スクショ検証 | scripts/c16_screenshot.js         | 視覚変化の実装確認                       | §C2    |
| G10 | 仕様書ファースト      | scripts/spec_first_lint.sh        | 実装着手前にSPEC存在検証                 | §C1    |
| G11 | Step 0参照漏れ検出    | scripts/step0_lint.sh             | 22フロー Step 0 の §C参照遵守           | §C0    |
| G12 | 提案ログ滞留判定      | scripts/proposal_log_lint.sh      | 日付/セッションID動的計算+閾値警告       | §C4    |
| G13 | canopy発火保証        | scripts/canopy_fire_check.sh      | 最近N日のhook経由発火ログ確認            | §C3    |
```

### 4.9 development_rules.md / templates/mission_template_v2.md 連鎖更新

**4.9.1 development_rules.md**

- G1-G9 記述を G1-G13 完全版に更新（§4.8 表と一致）
- 絶対禁止に「G10-G13 の無断削除禁止」を追加
- 3層テスト戦略セクションを §4.2.5 の表と同期

**4.9.2 templates/mission_template_v2.md → v3 昇格**

- 完了コマンド3区分（cmd-unit / cmd-e2e / cmd-realworld）の記述ブロックを必須化
- 高リスク/低リスク別の N/A 理由欄テンプレート追加
- `MISSION_TYPE:` フィールド新設（auth / payment / external_api / screen / refactor / etc）
- risk_classifier の判定結果を `HIGH_RISK:` に自動記入（mission_linter が付与）

**4.9.3 sub_adv_protocol.md**

- ADV起動時Read リストを §0 の ADV 層に一致させる
- 「ADV は session_progress.md / 提案ログ / po-decisions.md / docs/**/*.md / templates/**/*.md に書き込み可」を明記
- 「src/ / frontend/ / worker/src/ には書き込まない」を明記

### 4.10 差分パッチの連鎖整合性

本 §4 の全差分は以下の依存関係で整合していなければならない（R2レビュアーは整合性を確認すること）:

1. **§4.1.2（3分岐Read）** ⇔ **§4.9.3（sub_adv_protocol.md ADV Read）** — 完全一致必須
2. **§4.1.7（22フロー Step 0 文言）** ⇔ **§4.1.6（§C0）** — §C0が前提
3. **§4.2.5（3層対応表）** ⇔ **§4.4.1（改訂案④参照）** ⇔ **§4.9.1（development_rules.md）** — 三者同期
4. **§3.1.4 + §3.2.2（risk_patterns）** ⇔ **§4.3.4/§4.3.5/§4.3.6（scripts新設）** — risk_paths 配列の一元管理
5. **§4.5.1-5.7（G13関連）** ⇔ **§4.8（G一覧）** — G13 定義整合

---

## §5. レビュアーへの指示 Part IV

### 5.1 レビュースコープ

本R2レビューは以下に集中する:

- **採用76件**（§2）の反映差分が改訂案①〜⑦に正しく落ちているか
- **差分確定4件**（§3、PD-104/105/106 由来）の具体仕様が設計として成立しているか
- **連鎖更新の網羅性**: §4.10 の5つの依存関係がすべて整合しているか
- **R1未指摘の新発見**: 重大なものがあれば HIGH 以下で提出可

### 5.2 severity 方針

- **CRITICAL は以下に限定**:
  - PD-104/105/106 の前提を破る構造矛盾
  - 採用76件のうち複数クラスター間の相互矛盾
  - R1で見落とされた FEASIBILITY CRITICAL（実行不能）の新発生
- **HIGH**: §4.10 連鎖整合の破れ、採用項目の部分的な漏れ、未定義の用語、設計上の曖昧さ
- **MED**: 記述の揺れ、表記統一の漏れ、参照番号の不整合
- **LOW**: 軽微な文言改善提案

### 5.3 severity inflation 注意（§13.9 適用）

- R1 で既に採用された項目を R2 で再び指摘しても新規CRITICALとは扱わない
- クラスターA〜N で既に採用/棄却判定済みのテーマを蒸し返す場合は必ず **MED 以下**
- 「前ラウンドで議論済み」と判断される場合は **棄却扱い**（§13.9）

### 5.4 Filter 1-7 適用（sub_review_flow §2）

全ペルソナで以下のフィルタを R1 同様に適用:

1. Filter 1: 既存仕様との照合（R1採用リスト含む）
2. Filter 2: PO決定事項（PD-104/105/106）との整合
3. Filter 3: 実行可能性（macOS / bash3.2 / BSD コマンド前提）
4. Filter 4: 連鎖更新の完全性
5. Filter 5: severity 妥当性
6. Filter 6: カテゴリ妥当性（CONTRADICTION/FEASIBILITY/等）
7. Filter 7: 採用判定の重複排除

### 5.5 差分確定案（§3）への異論

- PD-104/105/106 の**方針**は確定済み（ふとし承認取得済）
- 方針への反対は **受理しない**
- **実装詳細**（§3.1.4 / §3.2.2 等）への改善提案は **HIGH までで受理**
- ただし「実装詳細に重大な実行不能バグ」があれば **CRITICAL** も受理

### 5.6 出力フォーマット

R1と同じJSON形式:

```json
[
  {
    "id": "R-001",
    "severity": "HIGH",
    "category": "CONTRADICTION",
    "section": "§4.1.2",
    "title": "...",
    "detail": "...",
    "suggestion": "..."
  }
]
```

各ペルソナ10件程度を目安に、網羅性より妥当性を優先。

### 5.7 禁止事項

- R1 で棄却された LOW 4件の蒸し返し
- PD-104/105/106 の方針そのものへの異議
- 「**念のため**」「**一応**」「**もしかしたら**」で水増しした指摘
- severity を曖昧にした保留的指摘（severity は必ず確定）

---

## §6. Cumulative Context Part V

### 6.1 R1 採用76件の要約リスト（クラスター別）

| クラスター | テーマ | 採用件数 | 主な対応 |
|---|---|---:|---|
| A | macOS環境非互換 | 8 | POSIX+bash3.2 互換化 |
| B | Vite VITE_* 静的置換 | 7 | dist/ grep廃止、.env/.dev.vars担保 |
| C | G1-G13 採番破綻 | 7 | §4.1 表再構築、§C見出し統一 |
| D | ADV/ENG/PO 責務境界 | 9 | PD-104 3分岐Read |
| E | 滞留セッション数手動+1 | 4 | 日付/セッションID動的判定 |
| F | 起動時Read過大 | 3 | §C0 要約版新設、22フロー文言統一 |
| G | canopy発火保証 | 4 | pre-commit-sub 配置変更、呼び出し元記録 |
| H | 3層テスト/3区分対応 | 7 | §4.1.1 対応表新設、認証分類 |
| K | デプロイ反映タイムラグ | 3 | Step8 ポーリング、失敗リカバリ |
| L | verify_external_services 型安全 | 4 | Python型チェック、wrangler事前確認 |
| M | 移行マップ・採番一覧 | 11 | 参照表記統一、用語統一 |
| N | その他単発 | 15 | 個別反映（§4.3/§4.5/§4.6/§4.7） |

**合計: 82件（重複内包13件を差し引くと純粋採用76件 — R1トリアージ §3 と一致）**

### 6.2 PO決定事項の原文（PD-104 / PD-105 / PD-106）

**PD-104（2026-04-18 G_42）:**
> ADV/ENG/PO責務境界は3分岐で明文化。§0 Read リストを以下に分離する。
> - ENG = §C1-C6 全文 + CLAUDE.md + development_rules.md + session_progress.md
> - ADV = §C1-C6 全文 + sub_adv_protocol.md + session_progress.md + po-decisions.md 直近10件
> - PO = 5行サマリー + キュー先頭ミッションID のみ

**PD-105（2026-04-18 G_42）:**
> 仕様厳格化は認証・決済・外部API呼び出しに集中する。案B採用。
> - 22フロー Step 0 は章単位集約（全フロー個別列挙廃止）
> - 完了コマンド3区分 N/A理由必須は高リスク系ミッションのみ
> - 認証・決済・外部APIを含むミッションは3区分必須分類（エスケープ不可）

**PD-106（2026-04-18 G_42）:**
> Hフロー発火条件は git diff ファイルパスで機械判定。案B採用。
> - src/auth/** / src/payment/** / supabase.ts / 外部API呼び出しパス変更時のみ発火
> - それ以外は通常C2フロー
> - 機械判定は scripts/hflow_trigger_check.sh として自動化

### 6.3 R1 Cumulative Context からの引き継ぎ（既決定）

R1パッケージ §8 で参照された既決定事項は本R2でも適用する:

**既存 PO 決定（抜粋、優先適用順）:**
- **PD-001**: 品質最優先
- **PD-002**: 既決定は覆さない
- **PD-003**: ソロ開発アジリティ維持
- **PD-005**: 仕組みで解決（人間判断に依存しない）
- **PD-007**: 新プロセスは PO 承認必須
- **PD-008**: dev-system 改訂は Phase B より優先

**R1で既採用された改訂方針（G_40〜G_41 で合議確定）:**
- 22点抜け全採用（F/A/C/D/B/E/G の7カテゴリ）
- 改訂案①〜⑦の方針そのもの
- Hフロー（sub_review_flow §4.H）新設
- §C1-C6 集約方式
- G11/G12/G13 新設
- 新設スクリプト群（step0_lint / proposal_log_lint / verify_env / verify_external_services / pre-commit-sub）
- 新設テンプレート群（test_realworld / test_e2e_integration / playwright.realworld.config / integration_tester / end_user_integration / security_auditor）

**severity 基準（sub_review_flow §1.5 準拠）:**
- CRITICAL: 確実に実行不能、参照崩壊、構造矛盾
- HIGH: 重大な整合性/網羅性の問題
- MED: 運用・記述の改善余地
- LOW: 軽微な文言・表記改善

**Filter 1-7 適用（sub_review_flow §2）:**
- 全ペルソナで必須
- R1で既判定のテーマは Filter 1（既存仕様照合）で除外

### 6.4 R2で変化した前提（R1 → R2）

- R1: 改訂案全文（3,336行）の妥当性レビュー
- R2: **採用76件の反映差分 + 差分確定4件**の妥当性レビュー（1,300行規模）
- CRITICAL の基準が厳格化（§5.2 参照）
- severity inflation 注意（§5.3 参照）
- 差分確定案（§3）への方針異議不可（§5.5 参照）

### 6.5 R2完了後の次ステップ（参考）

- CRITICAL 0 → **ゴールデンラウンド**（sub_review_flow §1.6）: 全5ペルソナ × 2モデル = 10本の全文再送検証、上限2ラウンド
- CRITICAL > 0 → **R3〜R4 差分ラウンド**（sub_review_flow §1.7）: CRITICAL 出したペルソナのみ、上限4ラウンド
- ゴールデン完遂 → **改訂案確定書き込みミッション**: dev_system_spec.md v3.3 → v3.4 + 連鎖8ファイル更新

---

（作成: 2026-04-18 G_43 Claude.ai ADV / R2パッケージ初版）
