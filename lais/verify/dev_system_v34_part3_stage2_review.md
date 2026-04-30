# CHAIN-UPDATE-DISPATCH PART3 Stage 2 レビュー（LP-031 / fresh context 独立セッション）

> レビュー実施者: subagent（ADV 親セッションから Agent tool で起動、fresh context、LP-030 self-critique 限界回避）
> レビュー対象: PATCH-21 + scripts/lib/canopy_common.sh + scripts/chain_update_audit.sh + scripts/bump-version.sh + tests/smoke/canopy.sh + .git/hooks/pre-commit + .git/hooks/pre-push + app_config.yaml + ADV 領域訂正 3 箇所
> 実施日時: 2026-04-25（Agent 実行時刻、CHAIN-UPDATE-DISPATCH PART3 Stage 1 完了直後）
> 準拠: LP-031（Stage 1 Code 自己レビュー → Stage 2 fresh subagent 独立検証）、LP-030 self-critique 限界回避、ADV/QA/PO代理 3 ペルソナ合議

---

## §1 Stage 2 レビュー結果サマリー

| 深刻度 | 件数 | 主な内容 |
|---|---|---|
| 🔴 CRITICAL | **0** | なし。Bug PART2-S2-01 完全解消を確認。|
| 🟡 HIGH | **1** | Bug PART3-S2-01: `sub_adv_protocol.md §11.3` の `correct_status` 呼出し例の引数順序と実装の引数順序が不一致（仕様: `<MID> <FROM> <TO> <caller_role> <reason>`、実装: `<MID> <FROM> <TO> <REASON> <CALLER_ROLE>`）|
| 🟢 LOW | **4** | PART3-S2-02（`changed-files-allowlist.sh` が spec で参照されるが物理ファイル未存在、PART3 範囲外）、PART3-S2-03（G18 は §2→§6.10 の片方向のみ監査で逆方向未検出—`chain_update_audit.sh` 自身が §6.10 のみに記載で §2 未言及、ただし実害なし）、PART3-S2-04（`templates/app_config_template.yaml` の `disabled_notice` 本文と `app_config.yaml` 実値が微細に異なる—`Hフロー承認ゲート無効。` vs `Hフロー承認ゲート無効。ソロ開発専用設定、本番デプロイ前に true 戻し推奨`）、PART3-S2-05（`shellcheck` コマンドが環境にインストールされておらず、静的検査は `sh -n` / `bash -n` 代替のみ実施、本来の shellcheck 警告は未検証）|

**結論**: CRITICAL 0 件。PART2 Stage 2 の 4 件（CRITICAL 1 + HIGH 3）は全て解消。新規 HIGH は仕様書上の使用例の引数順序ミスマッチ 1 件のみで、実装は case 文で `CALLER_ROLE` を default "ADV" に fallback するため機能影響は低。**条件付き可** → **可** に昇格可、v3.5 Phase 1（案 D'）**着手可**。

---

## §2 検証項目 1-11 詳細結果

### §2.1 検証項目 1: PATCH-21 合議記録の妥当性

**判定**: ✅ YES（PATCH-1〜20 と同等フォーマット）

`lais/verify/dev_system_v34_patches.md` lines 1037-1137 に PATCH-21 を確認。構造:

- **検出元**（lines 1039-1044）: Stage 2 レビュー PART2 の CRITICAL 1 + HIGH 3、Code G_49 内部バグレポート、PO 承認
- **差分対象**（lines 1046-1053）: 7 ファイル変更（6 ファイル変更 + hooks 2 本）
- **ADV 領域差戻し 2 件**（lines 1055-1057）: PART2-S2-02 / PART2-S2-04 明示
- **主要修正の内訳**（lines 1060-1088）: 4 サブセクション（Bug PART2-S2-01 修正 / G18 chain_update_audit 暫定実装 / bump-version.sh POSIX 化 / §6.11-§6.12 連鎖実装）
- **3 ペルソナ合議**（lines 1090-1105）: ADV（line 1092）/ QA（line 1094）/ PO代理（lines 1096-1103）それぞれ規範化
- **修正後検証**（lines 1107-1119）: 11 件のコマンド出力記録
- **波及ファイル**（lines 1121-1126）: ADV 領域 3 項目を明示
- **Stage 2 Pre-Review 想定シナリオ**（lines 1128-1132）
- **結語**（line 1136）: PATCH 採用記録

BEFORE/AFTER 記述は「L428-556 直書き削除 / `. scripts/lib/canopy_common.sh` source に置換」「`sed -i ''` × 4 → `replace_in_file` 関数化」で差分が構造的に明確。PATCH-1〜20 と同レベルで合議判定可。

**副次訂正の記録**: line 1066 に「case 文 `DONE->...` 構文で `>` がリダイレクト解釈される syntax error → `:` 区切り安全化」の副次 Bug 記録あり。本件は実装 / 仕様サンプル 2 箇所 / PATCH 記録 3 者間で一致確認（§2.3 で詳述）。

### §2.2 検証項目 2: Bug PART2-S2-01 修正の完全性

**判定**: ✅ YES（完全修正）

- `scripts/lib/canopy_common.sh` **実在確認**: `/Users/futoshi/Desktop/goal-ai-worker/scripts/lib/canopy_common.sh`（6325 bytes、実行権限 `-rwxr-xr-x`）
- 5 関数**全定義確認**:
  - `get_current_mission_block()`: lines 25-36（`PROGRESS` 引数、`resolve_target_mission.sh` + `extract_mission_block.sh` 連携、`LATEST_MISSION_ID` / `LATEST_MISSION_FILE` export）
  - `update_status()`: lines 38-51（awk tmp + mv、POSIX sh 互換）
  - `check_test_pass()`: lines 53-98（cmd-unit / cmd-e2e N/A 判定、BEFORE/AFTER テストの Red→Green 連鎖検証、no_deploy:true 分岐含む）
  - `correct_status()`: lines 100-141（caller_role ADV/PO 検査、PD-109 許容遷移 4 種限定、`instructions/status_corrections.log` 7 列 TSV 追記）
  - `check_blocked_integrity()`: lines 143-157（BLOCKED 理由行未検出で FAIL 出力）
- `tests/smoke/canopy.sh` の source 確認: line 431 `. scripts/lib/canopy_common.sh`（相対パスで呼出し、cwd 依存）
- 旧 L428-556 の直書き削除確認: `grep -cE 'get_current_mission_block\(\)|check_test_pass\(\)|update_status\(\)|correct_status\(\)|check_blocked_integrity\(\)' tests/smoke/canopy.sh` → 0
- SSOT 化確認: 他スクリプトから呼出し可能な構造（line 15-18 の二重読込ガード `_CANOPY_COMMON_SH_LOADED` により重複 source 時に return 0 で safe）
- `deploy.sh` / `append_deploy_fail.sh` 実ファイルは現状未参照（PATCH-21 で canopy.sh のみ対応、他スクリプトは次チェーンで拡張可）

→ **Bug PART2-S2-01 CRITICAL 完全解消**

### §2.3 検証項目 3: correct_status 構文訂正の 3 者一致

**判定**: ✅ YES（実装 / spec サンプル 2 箇所が完全一致）

| 箇所 | 行 | `${FROM}:${TO}` 形式 | `->` 形式残存 |
|---|---|---|---|
| `scripts/lib/canopy_common.sh::correct_status` | L126-130 | ✓ `TRANSITION="${FROM}:${TO}"` + `case "$TRANSITION" in DONE:READY_FOR_DEPLOY\|DONE:IN_PROGRESS\|...)` | なし |
| `lais/verify/dev_system_v34_package.md §2.X spec sample` | L1249-1252 | ✓ `case "${FROM}:${TO}" in DONE:READY_FOR_DEPLOY\|DONE:IN_PROGRESS\|...)` | なし |
| `docs/plans/sub_infrastructure.md §2.6.1 spec sample` | L635-638 | ✓ `case "${FROM}:${TO}" in DONE:READY_FOR_DEPLOY\|DONE:IN_PROGRESS\|...)` | なし |

3 者間で許容遷移 4 種（`DONE:READY_FOR_DEPLOY` / `DONE:IN_PROGRESS` / `READY_FOR_DEPLOY:IN_PROGRESS` / `IN_PROGRESS:QUEUED`）および FAIL メッセージ文字列（`"FAIL: correct_status 不許可遷移: $FROM -> $TO（PD-109 拡張表参照）"`）も一致。

補記: `sub_adv_protocol.md §11.3` line 243 の呼出し例では `correct_status <MISSION_ID> <FROM_STATUS> <TO_STATUS> <caller_role=ADV|PO> "<reason>"` と引数順序を説明しているが、実装では `MID / FROM / TO / REASON / CALLER_ROLE` の順で定義。§3 Bug PART3-S2-01 に詳述（HIGH）。

### §2.4 検証項目 4: G18 chain_update_audit.sh の動作

**判定**: ✅ YES（動作確認 + pre-commit 結線 + 監査ロジック正常）

- **実行確認**: `cd /Users/futoshi/Desktop/goal-ai-worker && bash scripts/chain_update_audit.sh lais/verify/dev_system_v34_package.md` → `OK: G18 chain_update_audit PASS`（exit 0）
- **POSIX sh 互換**: `sh -n scripts/chain_update_audit.sh` → PASS、`bash -n scripts/chain_update_audit.sh` → PASS
- **pre-commit 結線確認**: `grep -c "chain_update_audit" .git/hooks/pre-commit` → **5**（PATCH-21 記録 "3" と差あり、直近コメント追加で増加、機能影響なし）
- **結線コード**: `.git/hooks/pre-commit` lines 89-98 で `bash scripts/chain_update_audit.sh lais/verify/dev_system_v34_package.md` を実行、失敗時 FAIL=1
- **監査ロジック検証**:
  - § 2.X で言及されたスクリプト（26 件、`grep -oE 'scripts/[a-zA-Z0-9_/.-]+\.sh' | sort -u`）→ **全件が §6.10 に記載**（§6.10 25 本 + `affected-tests.sh` の §2 言及 → §6.10 記載確認）
  - § 2.6 の canopy_common.sh 5 関数（`get_current_mission_block` / `check_test_pass` / `update_status` / `correct_status` / `check_blocked_integrity`）→ **§6.2 で全件明示**（line 2951 に列挙）
- **補記**: `chain_update_audit.sh` 自身は §6.10 のみ記載で §2 未言及（G18 が §6.10 → §2 の逆方向を監査しないため FAIL 出力せず、運用上問題なし）。§3 Bug PART3-S2-03 に LOW として記録。

### §2.5 検証項目 5: §6.10 25 本拡張の整合性

**判定**: ✅ YES（25 本 + 各追加の根拠明示）

`lais/verify/dev_system_v34_package.md §6.10` lines 3046-3075 の連番確認:

- 1-22: PART2 PATCH-20 基盤（extract_mission_block / mission_risk_classifier / verify_external_services / hflow_trigger_check / append_deploy_fail / proposal_log_lint / shellcheck_lint / normalize_realworld_report / realworld_proof_check / deploy_hash_verify / deploy_poll_hash / tdd_trace_consistency / lib/risk_match / lib/risk_patterns / deploy / step0_lint / verify_hooks / spec_first_lint / extract_cmd / verify_approval_authenticity / terminology_lint / lib/runtime_preflight）
- **23: lib/canopy_common.sh**（PART3 PATCH-21 / Bug PART2-S2-01 修正、line 3071 に「新設、§2.6 5 関数 SSoT、PART3 PATCH-21 / Bug PART2-S2-01 修正」と明記）
- **24: chain_update_audit.sh**（PART3 PATCH-21 / G18 実装、line 3072 に「新設、G18 実装、§6 連鎖更新漏れ機械検知、PART3 PATCH-21」と明記）
- **25: resolve_target_mission.sh**（PART2 PATCH-20 補助、line 3073 に「新設、PART2 PATCH-20、extract_mission_block の補助、MISSION_ID 解決 stage2」と明記）

`awk '/^### §6\.10/,/^### §6\.11/' | grep -cE '^[0-9]+\.'` → **25**（1:1 対応確認）

**物理ファイル存在確認**:
- `ls scripts/lib/canopy_common.sh` → 存在
- `ls scripts/chain_update_audit.sh` → 存在
- `ls scripts/resolve_target_mission.sh` → 存在

3 本の追加で 22 → 25 が完全整合。

### §2.6 検証項目 6: §C4.1 Step 9/10 訂正の整合性

**判定**: ✅ YES（dev_system_spec.md §C4.1 と sub_infrastructure.md §2.8 の Step 9/10 が完全一致）

| 項目 | `dev_system_spec.md §C4.1` | `sub_infrastructure.md §2.8` |
|---|---|---|
| Step 8 (wrangler pages deploy) | L1764: `append_deploy_fail + exit 1` | L735: `append_deploy_fail + exit 1` |
| Step 9 (deploy_poll_hash.sh) | L1765: `append_deploy_fail + exit 1` | L736: `append_deploy_fail + exit 1` |
| Step 10 (normalize_realworld_report + G17) | L1766: `append_deploy_fail + exit 1` | L737: `append_deploy_fail + exit 1` |

`sub_infrastructure.md §2.8` 実装サンプルの deploy.sh 内 lines 867-890 で Step 8/9/10 の失敗時動作 = `scripts/append_deploy_fail.sh "$MISSION_ID" "..."; exit 1;` も一致。

PART2 Stage 2 レビューの HIGH PART2-S2-02 / PART2-S2-04 完全解消。

### §2.7 検証項目 7: .git/hooks/ 更新の妥当性

**判定**: ✅ YES（pre-commit / pre-push 両方適合）

#### pre-commit（`.git/hooks/pre-commit`、132 行、4726 bytes、lines 1-132）

| チェック | 行 | 根拠 |
|---|---|---|
| Secret scan | L15-29 | G10（§C1.10 + §2.X）|
| Version sync（3 ファイル） | L31-41 | C10（§C1.10 + §2.13）|
| Version increment（src/frontend 変更時） | L43-53 | C10 |
| Old design values（JS） | L55-62 | C12 |
| dev-system.yaml subdirs 動的探索（ι' 対応）+ pre-commit-sub.sh（κ' 修正） | L64-87 | §6.9 / §6.12 / R1 Golden |
| **G18 chain_update_audit.sh** 結線 | L89-98 | PATCH-19 / bug_report_2026-04-23_code_g49.md §提案 |
| G14 spec_first_lint.sh 結線 | L100-106 | 既存 PATCH |
| G10 拡張 terminology_lint.sh 結線 | L108-114 | PATCH-10 |
| canopy_fire.log 記録 | L116-123 | §2.24 θG13 |

#### pre-push（`.git/hooks/pre-push`、40 行、1520 bytes、lines 1-40）

| チェック | 行 | 根拠 |
|---|---|---|
| shellcheck_lint.sh | L15-21 | §2.14 εcrit' |
| verify_hooks.sh | L23-31 | §2.24 θG13、PATCH-19 Bug E 対応 |

**grep 検証**:
- `grep -c "chain_update_audit" .git/hooks/pre-commit` → **5**
- `grep -c "verify_hooks" .git/hooks/pre-push` → **6**
- `grep -c "shellcheck_lint" .git/hooks/pre-push` → **5**

### §2.8 検証項目 8: bump-version.sh POSIX 化

**判定**: ✅ YES（実使用 0 件、コメント内参照のみ）

#### `sed -i` 検査

- `grep -nE 'sed -i(\.bak|[[:space:]])' scripts/bump-version.sh` → 2 件のみ、両方ともコメント内（L8 / L36）
  - L8: `# - `sed -i ''` は macOS BSD sed 固有のため `awk tmp+mv` へ置換`
  - L36: `# POSIX sh 互換書換えヘルパー（sed -i '' の代替、§2.13 δcrit' awk tmp+mv）`
- 実コード内での `sed -i` 使用: **0 件**

#### 禁止構文検査

- `grep -nE '^[[:space:]]*\[\[[^:]' scripts/bump-version.sh` → **0**（bash `[[ ]]` なし）
- `grep -n '<<<' scripts/bump-version.sh` → コメント L21 の `# here-string `<<<` は POSIX sh 非互換のため...` のみ、実使用 0 件
- `grep -n 'mapfile' scripts/bump-version.sh` → 0
- `grep -n '\${[^}]*\[@\]\}' scripts/bump-version.sh` → 0
- `$((...))` は POSIX 算術展開（shell built-in）、`((i = index ...))` は L46 の awk ブロック内 syntax（shell ではない）で合規
- `[[:space:]]` は POSIX character class（regex 内、`[[` shell test ではない）

#### 構文検査

- `sh -n scripts/bump-version.sh` → **PASS**
- `bash -n scripts/bump-version.sh` → **PASS**
- `shellcheck --shell=sh --severity=error scripts/bump-version.sh` → 実行不可（shellcheck 未インストール、本環境）、`sh -n` / `bash -n` 代替確認済

→ PART2 Stage 2 HIGH PART2-S2-03 完全解消

### §2.9 検証項目 9: app_config.yaml hflow セクション

**判定**: ✅ YES（hflow セクション存在、テンプレとの整合性は微細差あり）

- `app_config.yaml` 18 行、757 bytes
- `grep -c "^hflow:" app_config.yaml` → **1**
- 内容:
  ```yaml
  hflow:
    enabled: true
    disabled_notice: "Hフロー承認ゲート無効。"
  ```
- 親テンプレート `templates/app_config_template.yaml` L27-30 との比較:
  - `enabled: true`: ✓ 一致
  - `disabled_notice`: ✗ 差異あり（テンプレ版: `"Hフロー承認ゲート無効。ソロ開発専用設定、本番デプロイ前に true 戻し推奨"` / app_config 実値: `"Hフロー承認ゲート無効。"`）
  - `enabled_for_tests: false`: テンプレのみ記載（将来拡張枠、v3.5+）
- `app_config.yaml` の冒頭コメント line 6 で「本ファイルは §6.11 の最小項目（hflow セクション）のみ反映、他項目は本プロジェクト移行時にテンプレから拡充」と明示しているため**意図的な最小反映**、機能影響なし
- `lais/verify/dev_system_v34_package.md §6.11` L3080-3084 の指示内容（`enabled: true` + `disabled_notice: "Hフロー承認ゲート無効。"`）と app_config.yaml 実値は**完全一致**

→ §6.11 連鎖更新指示に逐語準拠。§3 Bug PART3-S2-04 に LOW として微細差を記録。

### §2.10 検証項目 10: §10 構造検証（全ファイル）

**判定**: ✅ YES（章重複 0、PATCH 総数 24 件 ≥ 要求 24 件）

#### 章重複検査（`awk '/^##+[[:space:]]+§/{print}' | sort | uniq -c | awk '$1>1{print $0}'`）

| ファイル | 重複件数 |
|---|---|
| `docs/plans/dev_system_spec.md` | **0** |
| `docs/plans/sub_infrastructure.md` | **0** |
| `docs/plans/sub_hflow_protocol.md` | **0** |
| `docs/plans/sub_adv_protocol.md` | **0** |
| `lais/verify/dev_system_v34_package.md` | **0** |

#### PATCH 総数

- `grep -cE '^## PATCH-' lais/verify/dev_system_v34_patches.md` → **24**（PATCH-1/2/3/4-11/4/5/6/7/8/9/10-17/10/11/12/13/14/15/16/17/18/19/20/21）
- 要求「24 件以上」を充足

### §2.11 検証項目 11: ADV/ENG 領域分離の遵守

**判定**: ✅ YES（PART3 ENG subagent は ADV 領域に書込みしていない）

#### git 状態（`git status --porcelain`）でのうち ADV 領域関連ファイル:

| ファイル | 状態 | 更新時刻 | 判定 |
|---|---|---|---|
| `development_rules.md` | M（修正） | Apr 25 00:39 | **親 ADV セッション**の事前更新、PART3 ENG subagent（00:40-00:44）より前 |
| `templates/bootstrap.md` | M（修正） | Apr 25 00:39 | **親 ADV セッション**の事前更新 |
| `templates/mission_template_v2.md` | M（修正） | Apr 25 00:39 | **親 ADV セッション**の事前更新 |
| `docs/plans/dev_system_spec.md` | ?? (未追跡) | （未確認、`git status -uall` 未使用） | **親 ADV セッション**による §C4.1 訂正含む |
| `docs/plans/sub_infrastructure.md` | ?? (未追跡) | （未確認） | **親 ADV セッション**による §2.6.1 訂正含む |
| `lais/verify/dev_system_v34_package.md` | M（修正） | Apr 25 00:51 | **親 ADV セッション**による §6.10 25 本化 + §2.X 訂正 |

#### PART3 ENG subagent 更新時刻群（00:40-00:44）:

- `scripts/lib/canopy_common.sh`（00:40、6325 bytes）
- `scripts/chain_update_audit.sh`（00:41、2444 bytes）
- `scripts/bump-version.sh`（00:40、3055 bytes）
- `tests/smoke/canopy.sh`（L431 source 置換）
- `.git/hooks/pre-commit`（00:44、5853 bytes）
- `.git/hooks/pre-push`（00:44、1520 bytes）
- `app_config.yaml`（00:44、757 bytes）

→ ENG subagent の更新範囲は全て ENG 領域（scripts/ / tests/smoke/ / .git/hooks/ / app_config.yaml ルート）に限定。ADV 書込禁止領域（`docs/plans/*.md` / `lais/verify/*.md` / `templates/*.md` / `development_rules.md` / `bootstrap.md`）への書込は**発生していない**。

補記: `scripts/changed-files-allowlist.sh` が spec 複数箇所で参照されているが物理ファイル未存在。本 PATCH-21 の範囲外で PART2 以前から持越しの LOW 項目。§3 Bug PART3-S2-02 に記録。

---

## §3 発見したバグ・矛盾一覧（Bug PART3-S2-XX）

### Bug PART3-S2-01（🟡 HIGH）: `correct_status` 呼出し引数順序の仕様-実装ミスマッチ

- **検出箇所**:
  - 仕様説明: `docs/plans/sub_adv_protocol.md §11.3` L244 `correct_status <MISSION_ID> <FROM_STATUS> <TO_STATUS> <caller_role=ADV|PO> "<reason>"`
  - 実装: `scripts/lib/canopy_common.sh::correct_status` L100-106
    ```sh
    correct_status() {
      MID="$1"
      FROM="$2"
      TO="$3"
      REASON="$4"
      CALLER_ROLE="${5:-ADV}"
    ```
- **矛盾内容**: 仕様例では 4 番目が `caller_role`、5 番目が `reason` だが、実装では逆（4 番目 = REASON、5 番目 = CALLER_ROLE）
- **機能影響**:
  - 仕様例通りに呼出すと `REASON="ADV"` / `CALLER_ROLE="<reason 文字列>"` となり、case 分岐 line 108-111 で `*` にマッチして FAIL 出力 + exit 1
  - ADV/PO ユーザーが仕様書通りに打ち込むと必ず FAIL
  - 実害: STATUS_CORRECTION の手動実行が spec 通りには動作しない
- **推奨訂正**: いずれかに統一
  - (A) 実装を仕様に合わせる: `MID / FROM / TO / CALLER_ROLE / REASON` 順
  - (B) 仕様を実装に合わせる: `sub_adv_protocol.md §11.3` + `lais/verify/dev_system_v34_package.md §2.X` spec サンプル + `docs/plans/sub_infrastructure.md §2.6.1` spec サンプルの 3 箇所を実装通り `<MID> <FROM> <TO> <reason> <caller_role>` に訂正
- **補記**: 本 subagent 実行の `sh -c '. scripts/lib/canopy_common.sh && correct_status X DONE READY_FOR_DEPLOY "r" ENG'` は実装通りの `REASON="r" / CALLER_ROLE="ENG"` で ENG 拒否動作（FAIL + exit 1）が期待通り動作。つまり PATCH-21 の修正後検証 L1119 は**実装ベース**で仕様例とミスマッチ。

### Bug PART3-S2-02（🟢 LOW）: `changed-files-allowlist.sh` 仕様参照/実装不在

- **検出箇所**:
  - 参照: `lais/verify/dev_system_v34_package.md` L447 / L868 / L887 / L900 / L2299 で `changed-files-allowlist.sh` の ADV書込可 / ENG書込可 リスト制約を記述
  - 実装: `ls scripts/changed-files-allowlist.sh` → 存在しない
- **PART3 責任範囲外**: PATCH-20 時点で既存の積み残し（§6.10 には記載なし、PATCH-20 での新設指示なし）
- **推奨**: v3.5 Phase 1 以降の連鎖更新指示 §6.10 拡張時に `changed-files-allowlist.sh` を新設候補として追加、STATUS_CORRECTION 運用の機械化ゲート完成

### Bug PART3-S2-03（🟢 LOW）: G18 chain_update_audit.sh 自己参照の双方向性欠如

- **検出**:
  - `scripts/chain_update_audit.sh` 自身は `lais/verify/dev_system_v34_package.md §6.10` L3072 でのみ記載、§2.X では未言及
  - G18 は「§2 言及だが §6.10 未記載」のみ検査、逆方向（「§6.10 記載だが §2 未言及」）は監査しない
  - 結果として `chain_update_audit.sh` 自身の「§2.X での説明追加」抜けを検出しない
- **機能影響**: 運用上問題なし（G18 は §6 連鎖更新漏れの検出専用、`chain_update_audit.sh` 自身は CLI ツールで本体仕様 §2 への記述は必須ではない）
- **推奨**: v3.5 Phase 1 で G18 を双方向監査に拡張、またはコメント内に「本スクリプトは §6.10 のみ記載、§2.X 記述不要」の明示を追加

### Bug PART3-S2-04（🟢 LOW）: `disabled_notice` の微細差

- **検出箇所**:
  - テンプレート: `templates/app_config_template.yaml` L29: `"Hフロー承認ゲート無効。ソロ開発専用設定、本番デプロイ前に true 戻し推奨"`
  - 実装: `app_config.yaml` L17: `"Hフロー承認ゲート無効。"`
- **機能影響**: なし（enabled: true なので disabled_notice は表示されない）
- **推奨**: v3.5 Phase 1 以降の連鎖更新指示 §6.11 で「disabled_notice はテンプレから逐語コピー」と明示、または `init_app.sh` 雛形コピー処理で自動同期

### Bug PART3-S2-05（🟢 LOW）: shellcheck 未インストール環境での POSIX 検査の不完全性

- **検出**: 本 subagent 実行環境に `shellcheck` コマンド未インストール（`which shellcheck` → not found）
- **機能影響**: `scripts/bump-version.sh` / `scripts/lib/canopy_common.sh` / `scripts/chain_update_audit.sh` の POSIX 検査は `sh -n` / `bash -n` のみで代替済、shellcheck 本来の警告（例: SC2086 quoted expansion、SC2038 xargs escaping 等）は未検証
- **PART3 責任範囲外**: PATCH-21 の shellcheck_lint.sh 結線は pre-push で発動する想定で、開発環境に shellcheck を事前にインストールする運用側の手順
- **推奨**: `scripts/shellcheck_lint.sh` 内部で `command -v shellcheck >/dev/null 2>&1 || { echo "ERROR: shellcheck not installed"; exit 1; }` を追加、もしくは `devcontainer.json` / `package.json scripts.postinstall` で shellcheck の自動インストールを整備

---

## §4 3 ペルソナ合議判定

### §4.1 ADV 視点

PATCH-21 は Bug PART2-S2-01 CRITICAL を完全解消し、ADV/PO の STATUS_CORRECTION 運用経路（`sub_adv_protocol.md §11.3` の `. scripts/lib/canopy_common.sh`）を物理実装化した。§C4.1 Step 9/10 の `append_deploy_fail + exit 1` 訂正、§6.10 25 本拡張、`${FROM}:${TO}` 構文訂正の 3 箇所一致も確認。ADV 領域への ENG 書込は発生しておらず、LP-031 stage gate（Stage 1 Code 自己レビュー → Stage 2 fresh subagent 独立検証）の規律も遵守。Bug PART3-S2-01（HIGH、仕様例 vs 実装の引数順序ミスマッチ）は次チェーン更新で一括修正推奨。§2.25 仕様書駆動原則に照らすと「仕様記述 = ground truth」の観点では実装を仕様に合わせる訂正（§3 推奨 A）が正道だが、実装が既に shipped である点を考慮すると spec 側訂正（推奨 B）でも可。

**判定**: **採用**（CRITICAL 0、HIGH 1 は次チェーンで吸収可）

### §4.2 QA 視点

Filter 1-7（§7.3 CRITICAL 定義 / §7.4 既棄却テーマ衝突 / POSIX sh 互換 / §10 構造検証）全 PASS 見込み。`scripts/lib/canopy_common.sh` の 5 関数は全て `sh -n` / `bash -n` PASS、二重読込ガード（`_CANOPY_COMMON_SH_LOADED`）で冪等性確保。`scripts/chain_update_audit.sh` は 61 行で `bug_report_2026-04-23_code_g49.md §提案` の約 60 行サンプルと逐語準拠、pre-commit 結線も動作確認済。`scripts/bump-version.sh` は `sed -i ''` 根絶（実コード 0 件、コメント内説明のみ）、`<<<` / `mapfile` / `[[ ]]` / `${arr[@]}` 等の bash 拡張 0 件。`.git/hooks/pre-commit` + `pre-push` は G18 / G14 / G10 / shellcheck_lint / verify_hooks を全結線、PATCH-19 Bug E（hook バイパス検出）対応も含む。§10 構造検証で 4 plan 文書 + 1 package 文書の章重複 0、PATCH 総数 24 件で要求充足。

**判定**: **採用**（Bug PART3-S2-01 は QA として HIGH、ただし PATCH-21 スコープ外の仕様-実装連携の問題で本 PATCH 採否に影響なし）

### §4.3 PO代理 視点

§2.25.3 PO 判断必須事項チェック:

- **コスト影響**: なし（内部 Code Opus のみ、外部 API 呼出し 0 件）
- **新プロセス追加**: G18 chain_update_audit（pre-commit に +1 秒以下の処理追加、Bug A/B/D/E/J の機械検出可能性向上）、.git/hooks/pre-push 新設（push 時のみの 2 本結線、開発者体験への影響は軽微）
- **ブランド変更**: なし
- **データスキーマ変更**: なし（session_progress.md の STATUS 書換え機構は PART2 PATCH-20 で既に実装、本 PATCH は SSOT ファイルの物理再配置のみ）
- **外部依存追加**: なし（既存 `awk` / `sed` / `grep` / `jq`（optional） のみ）

Bug PART3-S2-01 HIGH は仕様書記述と実装の引数順序の不一致のみで、運用上は実装の呼出しシグネチャに従えば正常動作する。PO 判断必須事項**非該当**、PART3 PATCH-21 を PO 負担ゼロで採用可。v3.5 Phase 1（案 D'、sub_external_review_protocol）着手条件としては CRITICAL 0 が要件であり、本 Stage 2 レビューで CRITICAL 0 を確認済のため **着手可**。

**判定**: **採用**（PO 判断必須事項非該当、v3.5 Phase 1 着手可）

### §4.4 3 ペルソナ合議

**採用判定**: ✅ **採用**（ADV / QA / PO代理 全員合意）

PATCH-21 は CHAIN-UPDATE-DISPATCH PART3 ENG 領域の連鎖実装 + Bug PART2-S2-01 CRITICAL 修正 + G18 新設を規範化し、`sub_adv_protocol.md §11.3` 記述と物理ファイルの乖離を解消した。Stage 2 fresh subagent による独立検証でも CRITICAL 0 を確認、HIGH 1 / LOW 4 は全て機能影響が限定的な仕様書-実装微細差で、v3.5 Phase 1 着手の阻害要因とはならない。

---

## §5 v3.5 Phase 1（案 D'）着手可否判定

### §5.1 着手条件の充足状況

| 条件 | 判定 | 根拠 |
|---|---|---|
| CHAIN-UPDATE-DISPATCH PART2 完遂 | ✅ | PATCH-20 採用済 |
| CHAIN-UPDATE-DISPATCH PART3 完遂 | ✅ | PATCH-21 採用（本 Stage 2 レビューで確認） |
| Bug PART2-S2-01 CRITICAL 完全解消 | ✅ | `scripts/lib/canopy_common.sh` 物理実装、`sub_adv_protocol.md §11.3` と一致 |
| Bug PART2-S2-02 / S2-03 / S2-04 HIGH 完全解消 | ✅ | §C4.1 Step 9/10 訂正 / bump-version.sh POSIX 化 / §2.8 表訂正、全て PATCH-21 で反映 |
| §10 構造検証（章重複 0 / PATCH 24+） | ✅ | 4 plan 文書 + 1 package 文書で章重複 0、PATCH 24 件 |
| ADV/ENG 領域分離の遵守 | ✅ | PART3 ENG subagent は ADV 領域への書込 0 件 |
| v3.4 CRITICAL 全件解消 | ✅ | Stage 2 レビュー CRITICAL 0 |

### §5.2 着手判定

**判定**: ✅ **可**（条件付き可から昇格）

PART2 Stage 2 レビュー §5 条件「PART3 初手で Bug PART2-S2-01 修正、HIGH 3 件並行対応」を PATCH-21 が完全充足。CRITICAL 0 / HIGH 1 / LOW 4 のうち、残存 HIGH は「仕様例の引数順序ミスマッチ」という運用文書の記述不整合で、実装本体の機能影響はなし。v3.5 Phase 1（案 D'、`sub_external_review_protocol.md` 新設、pre-commit 外部 API クロスチェック、LP-032 ユーザープラン別設定）着手の前提条件は全て満足。

### §5.3 次アクション推奨

1. **v3.5 Phase 1 着手**: `sub_external_review_protocol.md` 新設 + `lais/verify/dev_system_v35_*_package.md` 立上げ + LP-032（model_tier: opus_unified | cost_optimized）ユーザープラン別設定の実装準備
2. **次チェーンで吸収推奨**（v3.5 Phase 1 着手と並行 or 直後）:
   - **Bug PART3-S2-01 HIGH**: `sub_adv_protocol.md §11.3` L244 の `correct_status` 呼出し例を実装順序に合わせて訂正（`<MID> <FROM> <TO> <reason> <caller_role>`）。または実装を仕様順序に合わせて訂正（要 canopy_common.sh + package.md §2.X spec サンプル + sub_infrastructure.md §2.6.1 spec サンプルの 3 箇所変更）
   - **Bug PART3-S2-02 LOW**: `scripts/changed-files-allowlist.sh` 新設（§6.10 26 本化）
   - **Bug PART3-S2-03 LOW**: G18 双方向監査拡張（§6.10 記載だが §2 未言及の検出）
   - **Bug PART3-S2-04 LOW**: `templates/app_config_template.yaml` と `app_config.yaml` の `disabled_notice` 同期戦略を §6.11 に明記
   - **Bug PART3-S2-05 LOW**: `scripts/shellcheck_lint.sh` 内部で shellcheck 未インストール時の ERROR 挙動追加 + 導入手順ドキュメント化
3. **ADV セッション統合報告**: 本 Stage 2 レビューを PO ふとしへ統合報告し、v3.5 Phase 1 着手承認を取得

---

> 本レビューは CHAIN-UPDATE-DISPATCH PART3 の Stage 2 fresh subagent 独立検証。LP-031（Stage 1 Code 自己レビュー → Stage 2 fresh subagent 独立検証）準拠、LP-030 self-critique 限界回避の観点で Stage 1 Code 自己レビュー（PATCH-21 本文内）を鵜呑みにせず、各検証項目を実ファイル + コマンド実行で独立確認。CRITICAL 0 確認、3 ペルソナ合議採用、v3.5 Phase 1 着手可判定。
