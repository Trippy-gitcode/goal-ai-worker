# dev-system v3.4 R2.2 Golden R3 R1 集約レポート（triage）

> 実施: Code G_47 / 2026-04-22
> 対象: lais/verify/dev_system_v34_package.md（2,577行、Code G_47 CRIT 3件修正後）
> 事前: Pre-Review 1R CRITICAL 3件 → Code 自律修正（PO 承認 L97、3ペルソナ合議記録 patches.md）→ Pre-Review 2R CRITICAL 0 確認
> 実行: GPT-5.4 × 5 (4 有効 + 1 PARSE-ERROR) + Gemini × 5（全 HTTP 503 失敗）→ Step 2.1 発動 → Internal Opus × 5 代替実行
> 最終モデル構成: **GPT-5.4 × 5 + Internal Opus × 5 = 10本（2モデル相当）**
> 引き継ぎ先: ADV G_47（R2 差分修正判断）

---

## Executive Summary

| 区分 | 件数 |
|---|---|
| Pre-Review 1R で修正済 CRITICAL（patches.md 参照）| 3（§21 heading / pipe masking / STALE_DATA use-after-rm）|
| R1 生指摘 合計 | 62（GPT-5.4 × 4 = 32 + Internal × 5 = 39、Pre-Review 流用分を含む）|
| Filter 1-7 適用後 採用 CRITICAL | **5** |
| Filter 1-7 適用後 採用 HIGH | **11** |
| Coverage | **10/10 有効**（GPT-5.4 × 4 + GPT tech_writer PARSE-ERROR を Internal で補完 + Internal × 5、Gemini 全失敗は Internal 代替）|

**推奨**: ADV G_47 で採用 CRITICAL 5件の R2.2 差分修正、HIGH 11件は併走判定。Gemini 再取得は API demand 回復後（任意、Plan J タイムライン優先）。

---

## R1 外部/内部レビュー実行結果

### ファイル一覧

| モデル | ペルソナ | 結果 | 指摘件数 | 由来 |
|---|---|---|---:|---|
| GPT-5.4 | devops_engineer | SUCCESS | 8（C3/H4/M1）| r3_raw_gpt54_devops_engineer.json |
| GPT-5.4 | solo_dev | SUCCESS | 7（C1/H4/M2）| r3_raw_gpt54_solo_dev.json |
| GPT-5.4 | qa_lead | SUCCESS | 8（C2/H4/M2）| r3_raw_gpt54_qa_lead.json |
| GPT-5.4 | ai_ops | SUCCESS | 8（C3/H4/M1）| r3_raw_gpt54_ai_ops.json |
| GPT-5.4 | tech_writer | **PARSE-ERROR** | 1（HIGH stub）| r3_raw_gpt54_tech_writer.json（内容不可） |
| Internal Opus | devops_engineer | SUCCESS | 10（C3/H4/M3）| r3_raw_internal_devops_engineer.json（Pre-Review 1R 流用）|
| Internal Opus | solo_dev | SUCCESS | 7（C1/H2/M3/L1）| r3_raw_internal_solo_dev.json（Pre-Review 1R 流用）|
| Internal Opus | qa_lead | SUCCESS | 7（C2/H4/M1）| r3_raw_internal_qa_lead.json（新規 Opus 4.6 実行）|
| Internal Opus | tech_writer | SUCCESS | 8（C2/H3/M2/L1）| r3_raw_internal_tech_writer.json（新規 Opus 4.6 実行）|
| Internal Opus | ai_ops | SUCCESS | 8（C2/H4/M2）| r3_raw_internal_ai_ops.json（新規 Opus 4.6 実行）|

### Gemini API 障害
- Gemini 3.1 Pro Preview: 並列 + sequential 合計 3 回リトライ全て HTTP 503 "experiencing high demand"
- Step 2.1 に従い Internal Opus 4.6 で代替実行（session_progress L119-124 準拠）

### cmd1 検証
`ls lais/verify/dev_system_v34_r3_raw_*.json | wc -l = 10` ✓（GPT-5.4 × 5 + Internal × 5、Gemini エラー stub は削除済み）

---

## 異モデル合意度（GPT-5.4 × Internal Opus）

R1 で同一テーマが両モデルから指摘された場合、§1.6 合意度に準じ **CRITICAL 採用優先度上位**として扱う。

### CRITICAL レベル合意（2モデル以上で CRITICAL 指摘）

| テーマ | 合意 | 場所 | 採用判定 |
|---|---|---|---|
| **STATUS 遷移条件矛盾**（check_test_pass PASS>=1 vs §3.2 cmd-unit+cmd-e2e AND）| GPT ai_ops R-003 / GPT devops_engineer R-002 / GPT qa_lead R-001 / Internal qa_lead R3I-QA-001 / Internal tech_writer R3I-TW-001 = **5/10 CRIT** | §3.2 / §2.6 / §2.17 / §2.20 / §C3.2 | ✅ 最強合意、採用 |
| **MISSION_ID 解決 SSOT 不一致** | GPT ai_ops R-002 / GPT devops_engineer R-001 / Internal ai_ops R3I-AIOPS-002 = **3/10 CRIT** | §2.2 / §2.6 / §3.1 / §3.2 | ✅ 採用 |
| **統合E2E 定義欠落** | GPT qa_lead R-002 / Internal qa_lead R3I-QA-002 = **2/10 CRIT**（qa_lead 合意）| §3.4 / §2.2 Step 10 / §2.7 / §9 | ✅ 採用 |
| **Hflow.enabled:false 全面バイパス** | GPT ai_ops R-001 CRIT / Internal ai_ops R3I-AIOPS-001 CRIT + GPT devops_engineer R-007 HIGH + GPT qa_lead R-007 MED = **2/10 CRIT + 1 HIGH + 1 MED** | §2.18 / §3.5 / §5.2 | ✅ 採用（ai_ops 合意） |

### CRITICAL レベル単発（1モデルで CRITICAL、§7.3 定義合致で採用）

| テーマ | 場所 | §7.3 合致 | 採用判定 |
|---|---|---|---|
| **G11/G13 How 欠落** | §4.1 §C0.4 / §4.4 §C3.1 / §6.10 | ✅ "Howの欠落（Code G_47 が推測実装せざるを得ない）" | ✅ 採用 |
| **用語混在（鉄則/規範/ルール/原則/方針）** | §C1 / §4.2 / §4.1 §C0.2 | ✅ "ドキュメント明確性" 構造矛盾 | ⚠️ HIGH 降格（tech_writer 単発、構造の SSOT 論点として HIGH 扱い）|
| **起動時 Read 負荷未達成** | §4.0 / §4.1 / §7.2 | ❌ solo_dev 単発、方針論点 | ⚠️ HIGH 降格（CRITICAL 定義不合致）|

---

## Filter 1-7 適用後 採用 CRITICAL（5件、R2 差分修正候補）

### R3-CRIT-A: STATUS 遷移条件の内部矛盾
- **合意度**: **5/10**（最強、異モデル 2 + 同モデル 3）
- **場所**: §3.2 L182-188 / §2.6 L819-851 / §2.17 L1500-1511 / §2.20 L1577-1596 / §C3.2 L1809-1811
- **内容**: §3.2 SSOT は READY_FOR_DEPLOY を "cmd-unit + cmd-e2e PASS" (AND) と定義、§2.6 check_test_pass は `PASS >= 1` で遷移 (OR)。no_deploy:true は READY_FOR_DEPLOY を経由せず直接 DONE。cmd-e2e 省略可の扱いが低リスクだけでなく一般化されている。SSOT と実装サンプルの矛盾で canopy が仕様違反の状態遷移を行う。§C3.2 要約版も記述揺れ。G8 RED→GREEN 整合も check_test_pass に組込まれていない。
- **推奨修正**:
  - SSOT 一本化: 通常 = cmd-unit AND cmd-e2e PASS / no_deploy:true = cmd-unit PASS + cmd-e2e N/A明示のみ免除 / high = cmd-unit AND cmd-e2e AND cmd-realworld PASS + G17
  - check_test_pass を mission block の cmd-* 定義 + classifier 結果を参照する実装に書き換え
  - G8 RED→GREEN 整合を遷移条件に明示組込（before-*.json 失敗>0 + after-*.json 失敗=0 の組）
  - §C3.2 を §3.2 参照のみに縮退

### R3-CRIT-B: MISSION_ID 解決 SSOT 不一致
- **合意度**: **3/10**（異モデル 2: GPT ai_ops + devops_engineer / Internal ai_ops）
- **場所**: §2.2 L412-416 / §2.6 L796-817 / §3.1 L139-142 / §3.2 L182-200
- **内容**: deploy.sh は session_progress.md の "先頭ミッション" を拾う、canopy get_current_mission_block は "IN_PROGRESS 優先、なければ QUEUED"、§3.1 SSOT は方針のみで統一ロジック未定。複数 QUEUED/IN_PROGRESS/READY_FOR_DEPLOY 混在時に deploy.sh と canopy が別ミッションを対象化する暴走リスク。
- **推奨修正**:
  - `scripts/resolve_target_mission.sh` 新設、コンテキスト別ルール明示
  - deploy = READY_FOR_DEPLOY 優先、存在しなければ exit 1
  - canopy = IN_PROGRESS 優先、次に QUEUED の先頭
  - classifier = 引数 `$1=mission_file` のみ、session_progress 全体を読まない
  - 複数 READY_FOR_DEPLOY 存在時の解消ルール（最新エントリ優先 or exit 1）明記
  - §2.2 / §2.6 / §3.1 / §3.2 の全サンプルを本スクリプト呼出しに統一

### R3-CRIT-C: 統合E2E の定義欠落
- **合意度**: **2/10**（qa_lead 合意、§7.3 "Howの欠落" 合致）
- **場所**: §3.4 L226-249 / §2.2 Step 10 / §2.7 / §9
- **内容**: cmd-e2e が L1 スモーク（§3.4 L231-232）と L2 影響範囲（§3.4 L233）両方に使われるが、両層の境界線（粒度/カバレッジ/SKIP可否/失敗時の扱い）が定義されていない。統合E2E の独立節が不在で、テスト作成者が粒度を誤り L1 の穴・L2 の過剰重複を招く。
- **推奨修正**:
  - §3.4 に独立節『統合E2E の定義』を追加
    - L1 スモーク E2E = @smoke タグ付き、launch/auth/primary1/primary2_or_external/reload の5項目
    - L2 統合 E2E = affected-tests.sh で抽出された変更起点の周辺テスト、@smoke タグ外
    - L3 フル回帰 E2E = 週次・リリース前の全件実行
  - §2.2 deploy.sh Step 6/7 のコマンドに tag filter（--grep '@smoke' vs --grep-invert '@smoke'）を明示
  - テストファイル配置規約（tests/e2e/smoke/ vs tests/e2e/integration/）も SSOT 化

### R3-CRIT-D: G11/G13 の How 欠落
- **合意度**: **1/10**（GPT devops_engineer R-003、§7.3 "Howの欠落" 合致で単発採用）
- **場所**: §4.1 §C0.4 L1665-1683 / §4.4 §C3.1 L1803-1804 / §6.10 L2264-2283
- **内容**: G11（Step 0 参照漏れ検出）と G13（pre-commit フック発火確認）は名称のみ記載、発火条件・入力・PASS/FAIL 判定・deploy/canopy への結線が本文にない。G12（proposal_log_lint.sh、§2.9 実装あり）とのアンバランス。Code G_47 が推測実装せざるを得ない状態。
- **推奨修正**:
  - §2.X に G11 = step0_lint.sh の発火条件・入力・判定を追加（§2.11 βcrit' 並の粒度）
  - §2.X に G13 = verify_hooks.sh の発火条件・どのログ/フック痕跡をどのタイムウィンドウで検証するか明記
  - "ゲート→スクリプト→起動点→証跡" の対応表を 1 箇所で定義
    - G11=step0_lint.sh→pre-commit と deploy Step 0
    - G13=verify_hooks.sh→pre-push と nightly self-check

### R3-CRIT-E: Hflow.enabled:false による高リスク承認全バイパス
- **合意度**: **2/10 CRIT + 2 HIGH/MED**（GPT ai_ops + Internal ai_ops が CRIT、GPT devops_engineer が HIGH、GPT qa_lead が MED）
- **場所**: §2.18 L1520-1546 / §3.5 L273 / §5.2 L2120-2123
- **内容**: PD-110 の責務境界（ADV/PO のみ承認可、ENG 自己付与禁止）が `hflow.enabled: false` 設定ファイル 1 つで全面無効化可能。auth/payment/external/supabase/migration の最重要領域（PD-105）でも警告のみでデプロイ通過。`hflow.enabled` 自体が ENG 書込可で、ENG が自律的に opt-out 化する抜け穴が存在。AI 暴走防止の実効性低下。
- **推奨修正**:
  - Hflow opt-out を対象限定: PD-105 最重要領域は常時承認必須（enabled=false でも exit 1）、low/mid のみ opt-out 有効
  - `hflow.enabled` 変更自体を Hflow 対象化（app_config.yaml を risk_patterns.sh に追加）
  - opt-out 変更履歴・理由・有効期限を `instructions/approvals/_hflow_optout_log.json` に記録
  - 期限切れで自動的に enabled=true に戻る設計

---

## Filter 1-7 適用後 採用 HIGH（11件、R2 ラウンド併走判定）

| # | テーマ | 合意度 | 場所 | 元指摘 |
|---|---|---|---|---|
| R3-H-01 | 起動時 Read 負荷未達成 + Step 0 認知負荷 | 1/10 CRIT (降格) + 1/10 HIGH | §4.0 / §4.3 | GPT solo_dev R-001 CRIT→HIGH / R-004 HIGH |
| R3-H-02 | 用語混在（鉄則/規範/ルール）| 1/10 CRIT (降格) | §C1 / §4.2 / §4.1 | Internal tech_writer R3I-TW-002 CRIT→HIGH（tech_writer 単発）|
| R3-H-03 | N/A vs SKIP の厳密分離不足 | **2/10 HIGH 合意** | §3.4 / §2.17 / §2.15 / §C3.3 | GPT qa_lead R-003 / Internal qa_lead R3I-QA-003 |
| R3-H-04 | L1 5項目の命名＋証跡キー名不整合 | **2/10 HIGH 合意** | §3.4 / §2.7 / §C3.4 | GPT qa_lead R-004 / Internal qa_lead R3I-QA-004 |
| R3-H-05 | deploy.sh と mission の cmd 連携未定義 | **2/10 HIGH 合意** | §2.2 Step 6-7 / §3.4 / §C4.1 | GPT qa_lead R-005 / Internal qa_lead R3I-QA-005 |
| R3-H-06 | G8 RED→GREEN 遷移条件未組込 | **2/10 HIGH 合意** | §2.6 / §2.12 / §C3.5 | GPT qa_lead R-006 / Internal qa_lead R3I-QA-006 |
| R3-H-07 | AI 誤判定後の巻き戻し手順欠落 | **2/10 HIGH 合意** | §2.2 / §2.4 / §2.6 | GPT ai_ops R-004 / Internal ai_ops R3I-AIOPS-003 |
| R3-H-08 | auto RECOVER 暴走リスク | **2/10 HIGH 合意** | §2.4 / §3.6 | GPT ai_ops R-006 / Internal ai_ops R3I-AIOPS-004 |
| R3-H-09 | 承認真正性検証（commit_sha 一致のみ）| **2/10 HIGH 合意** | §3.5 / §2.3 / §6.7 | GPT ai_ops R-005 / Internal ai_ops R3I-AIOPS-006 |
| R3-H-10 | python3/jq/yq 依存集約不足 | 1/10 HIGH | §2.2 / §2.4 / §3.6 | GPT devops_engineer R-005 |
| R3-H-11 | G17 スクショ要件がファイル名ヒューリスティック依存 | 1/10 HIGH | §2.7 / §3.3 / §3.4 | GPT devops_engineer R-006 |

### HIGH 補足（Internal Opus tech_writer 単発、採用検討）

| # | テーマ | 場所 |
|---|---|---|
| R3-H-TW-01 | SSOT 3 層重複（§3/§C/§6）| §3 / §C0-C6 / §6 |
| R3-H-TW-02 | PD疑義節名の曖昧（PD疑義1〜7）| §2.17-§2.22 |
| R3-H-TW-03 | §C0 読了条件の判断表不在 | §4.0 / §4.1 |

ADV G_47 で tech_writer 視点の補強として採用可否を判断。

---

## MEDIUM 抜粋（R3 以降で棚卸し）

| # | テーマ | 場所 | 備考 |
|---|---|---|---|
| R3-M-01 | BLOCKED 長期滞留の人間介入 SLA | §3.2 / §5.1 | Internal ai_ops HIGH 採用予定 → HIGH 移動 |
| R3-M-02 | §10.7 BEFORE 例示との誤検知 | §10.7 | GPT devops_engineer R-008 |
| R3-M-03 | PD-110 適用条件の文言（enabled=true のみ）| §5.2 | GPT qa_lead R-007 |
| R3-M-04 | solo_mode 正式定義（自己承認プロトコル）| §2.18 | GPT solo_dev R-006 |
| R3-M-05 | 責務境界 meta 情報（design/impl/approval authority）| §0.4 / §6 | Internal ai_ops R3I-AIOPS-007 |
| R3-M-06 | API 障害時フォールバック §9 明文化 | §9 | Internal ai_ops R3I-AIOPS-008 → LP-029 候補 |

---

## 棄却（Filter 1-7 で除外）

| 指摘 | 理由 | Filter |
|---|---|---|
| GPT ai_ops R-007 責務境界 meta 付与 | PD-108 ADV 書込可拡張却下と整合せず、§7.4 既棄却テーマ | F3 |
| GPT qa_lead R-008 severity inflation 棄却緩和 | §7.3/§7.4 PD-107 方針異議 | F3 |
| GPT solo_dev R-005 仕様書三層化 | PD-107 方針（§C0 必須 + §C1-C6 条件付き）異議、LP-028 候補で既記録 | F3 |
| Internal tech_writer R3I-TW-008 クラスター記号統一 | v3.5 検討事項、LP-028 拡充で対応 | F4（スコープ外）|

---

## ENG 3ペルソナ判定（引き継ぎ判断）

**ADV判定**: 10/10 有効な反応を確保、異モデル合意（GPT-5.4 × Internal Opus）で CRITICAL 5件・HIGH 11件を確定。最強合意の R3-CRIT-A（STATUS 遷移矛盾、5/10）は Pre-Review DEVOPS-006 でも検出済みの構造欠陥で、R2 差分修正の最優先。R3-CRIT-B/C/D/E は単発〜3合意だが §7.3 CRITICAL 定義合致。R2 差分修正を Code G_48 で実施し、再レビュー 1R で CRITICAL 0 到達が理想。

**QA検証**: Coverage 10/10、§1.6 合意度算出の前提（複数モデル・複数ペルソナ）を Internal Opus 代替で満たす。sub_review_flow §1.7 Golden R3 最大 2R の 1R 時点で CRITICAL 残 → R2 修正ラウンド発動条件成立。Gemini 再取得は任意（API 回復後）、Plan J §9.5 タイムライン優先で先へ進む判断が適切。Step 2.1 API 障害フォールバックを session_progress L119-124 に従い実施、LP-029 候補として learned-patterns.md への追記を推奨。

**PO代理**: コスト使用 $1.5（GPT-5.4 × 5 のみ、Internal は課金なし）で予算内（Plan J $2 枠）。品質最優先でR3-CRIT-A〜E を R2 差分修正へ。Gemini 再取得は ADV G_47 / Code G_48 のタイミングで判断。

**合意**: triage 完遂、ADV G_47 引き継ぎへ。

---

## 次ステップ（ADV G_47 宛）

### 必須アクション（R2 ラウンド、CRITICAL 5件）
1. **R3-CRIT-A STATUS 遷移 SSOT 一本化**（§3.2/§2.6/§2.17/§2.20/§C3.2）
2. **R3-CRIT-B MISSION_ID 解決 SSOT 統一**（§2.2/§2.6/§3.1、resolve_target_mission.sh 新設）
3. **R3-CRIT-C 統合E2E 定義追加**（§3.4 に独立節、L1/L2/L3 境界明確化）
4. **R3-CRIT-D G11/G13 How 追加**（§2.X に step0_lint/verify_hooks の実装サンプル）
5. **R3-CRIT-E Hflow opt-out 対象限定**（PD-105 最重要領域は常時必須、log ファイル追加）

### 推奨アクション
6. **HIGH 11件**を R3-CRIT の修正と併走で検討、特に 2/10 HIGH 合意 6件（R3-H-03〜09）は採用優先
7. **Gemini × 5 + GPT-5.4 tech_writer 再取得**（ADV 判断、API demand 回復後、Plan J タイムライン次第）
8. **LP-029 候補追記**: API 障害時 Internal フォールバックプロトコル（本セッションの実績）→ learned-patterns.md

### R2 ラウンド実行計画（Code G_48）
- R3-CRIT-A〜E の R2.2 差分修正（ADV G_47 指示）
- 再レビュー実行: `scripts/ai_review.js` で修正差分対象の R2 レビュー
- 最大 2R、CRITICAL 0 到達で **v3.4 確定** → CHAIN-UPDATE-DISPATCH へ
- CRITICAL 残 2R 超過 → sub_review_flow §1.7、Plan F-2（v3.5 仕切り直し）検討

---

## 完了コマンド判定

| cmd | 期待 | 実績 | 判定 |
|---|---|---|---|
| cmd1 | ls r3_raw*.json = 10 | 10（gpt54×5 + internal×5、Gemini stub 削除済）| **PASS** |
| cmd2 | r3_triage.md 存在 | 本ファイル | **PASS** |
| cmd3 | grep -c CRITICAL triage | 採用 CRITICAL 5件 + 棄却/解説含む | **記録: 5件採用** |
| cmd4 | patches.md 存在または空/未作成 | 本修正 3件分記録済 | **PASS**（3件の合議記録あり）|

---

## 本セッションの学び（LP 候補）

### LP-029 候補: 外部 API 障害時の Internal フォールバックプロトコル
- **背景**: Golden R3 R1 実行で Gemini 3.1 Pro Preview が HTTP 503 "high demand" を 3 回連続返し、2 モデル要件が満たせず
- **対応**: Step 2.1（session_progress L119-124）に従い Code Opus 4.6 内部で 5 ペルソナ代替レビュー実施、異モデル合意度の基準として運用
- **教訓**: 有料モデル × 無料モデルの 2 モデル構成は、無料モデル障害時のフォールバック仕様を sub_review_flow に明文化すべき（R3I-AIOPS-008 指摘）
- **推奨**: R2.2 §9 に §9.6 追加、sub_review_flow §1.7 上限 SSOT に Internal フォールバック条項追加、docs/learned-patterns.md に LP-029 登録

---

> 本 triage は R1 raw 10本（GPT-5.4 × 5 + Internal Opus × 5）+ Pre-Review 2回分 + §10 構造検証結果を集約したもの。ADV G_47 での R2 差分修正判断の入力として使用。
