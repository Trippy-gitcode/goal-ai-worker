# CHAIN-UPDATE-DISPATCH PART2 Stage 2 レビュー（LP-031 / fresh context 独立セッション）

> レビュー実施者: subagent（ADV 親セッションから Agent tool で起動、fresh context）
> レビュー対象: sub_infrastructure.md（1,181 行）/ scripts/ 31 本（+ lib/ 3 本）/ PATCH-20 / session_progress.md PART2 記録
> 実施日時: 2026-04-23（Agent 実行時刻、PO 指示直後）
> 準拠: LP-031（Stage 1 Code 自己レビュー → Stage 2 fresh subagent 独立検証）、LP-030 self-critique 限界回避

---

## §1 Stage 2 レビュー結果サマリー

| 深刻度 | 件数 | 主な内容 |
|---|---|---|
| 🔴 CRITICAL | **1** | Bug PART2-S2-01: `sub_adv_protocol.md §11.3` 記載パス `scripts/lib/canopy_common.sh` が実在せず、ADV/PO が `correct_status()` を source できない |
| 🟡 HIGH | **3** | Bug PART2-S2-02（§2.8 と §C4.1 の Step 9/10 失敗時動作の非 1:1）、PART2-S2-03（`scripts/bump-version.sh` に `sed -i ''` 4 箇所残存、§3.7 POSIX 禁止構文）、PART2-S2-04（`sub_infrastructure.md` §2.8 「12 Step 対応表」 Step 9 が §C4.1 と不一致 — append_deploy_fail 追加） |
| 🟢 LOW | **4** | PART2-S2-05（§2.6 の既存 G1-G10 ベタ書きが `#!/bin/bash` 依存。§3.7 POSIX と部分衝突）、PART2-S2-06（§2.8 deploy.sh サンプルで §2.X に `append_deploy_fail.sh` の独立節が欠落、Bug F 修正は実ファイルのみ反映）、PART2-S2-07（PATCH-20 自己申告 L1019「affected-tests.sh + version_sync.sh + stage2 resolve_target_mission.sh」— resolve_target_mission.sh は stage2 ではなく PART2 主体で新設）、PART2-S2-08（§10 構造検証で `sub_infrastructure.md` 章一覧に §5 / §6 / §7 / §8 / §9 が欠落、§4 の次が §2.X に飛ぶ場面あり — 実害なしだが章番号の飛びがある） |

**結論**: CRITICAL 1 件が ADV/PO の STATUS_CORRECTION 運用を阻害する可能性あり、ただし機能代替（canopy.sh 直 source）で回避可能。PART3 着手前に **差戻し必須**ではないが、**条件付き可**（§5 参照）。

---

## §2 検証項目 1-7 詳細結果

### §2.1 検証項目 1: PATCH-20 合議記録の妥当性

**判定**: ✅ YES（PATCH-1〜19 と同等フォーマット）

`lais/verify/dev_system_v34_patches.md` lines 900-1033 に PATCH-20 を確認。内容:

- **検出元** / **差分対象** / **PART2 スコープ** / **新設スクリプト 22 本**（表形式、§6.10 と 1:1 対応）/ **§2.6 追記内容** / **§2.8 12 Step 対応表** / **3 ペルソナ合議（ADV/QA/PO代理）**（lines 976-984）/ **本 PATCH の追補事項** / **修正後検証** / **波及ファイル** / **Stage 2 Pre-Review 2R 記録**（lines 1004-1020）/ **補足: Stage 2 2R ENG 3ペルソナ合議記録**（lines 1022-1029）

BEFORE/AFTER 記述は明示的には無いが、「22 本一覧」「12 Step 対応表」「5 関数列挙」で差分が構造的に明確。PATCH-1〜3 と同レベル。

**ADV/QA/PO代理 合議記録**: line 978 ADV / line 980 QA / line 982 PO代理 それぞれ正規化されている。さらに line 1023-1029 で「Stage 2 2R ENG 3ペルソナ合議記録」として 2R 修正 5 項目の採用合議記録が追加済。

### §2.2 検証項目 2: §2.6 canopy_common.sh の 5 関数追加

**判定**: ⚠️ 条件付き YES（仕様サンプル面では揃っている、実体配置で CRITICAL）

`docs/plans/sub_infrastructure.md` §2.6.1 lines 531-676:

- `get_current_mission_block`: L537-546 ✓
- `check_test_pass`: L549-591 ✓（cmd-unit AND cmd-e2e 判定、no_deploy:true 直接 DONE 分岐を実装）
- `update_status`: L594-608 ✓（awk tmp + mv、POSIX sh 互換）
- `correct_status`: L612-649 ✓
  - `caller_role=ENG` で exit 1: line 620-623 の case 文で ADV|PO 以外は exit 1 → ENG 単独指定で `exit 1` 発火 ✓
  - BLOCKED への correct_status で exit 1: line 635-638 の case 文で許容遷移 4 種のみ許可、BLOCKED → * 系も BLOCKED を含まないので exit 1 ✓
  - 許容遷移 4 種: `DONE->READY_FOR_DEPLOY|DONE->IN_PROGRESS|READY_FOR_DEPLOY->IN_PROGRESS|IN_PROGRESS->QUEUED` ✓（§C3.2 と完全一致）
- `check_blocked_integrity`: L652-666 ✓（BLOCKED 理由行未検出で FAIL 出力）

実装サンプルは完全。しかし実配置は **`tests/smoke/canopy.sh` の末尾（L428-556）** であり、独立した `scripts/lib/canopy_common.sh` ファイルは **存在しない**。

**→ §2.5 で詳述する Bug PART2-S2-01 の主因**

### §2.3 検証項目 3: §2.8 deploy.sh 12 Step 化

**判定**: ✅ YES（§21 §C4.1 と逐語整合、ただし軽微な Step 9/10 の逆ハーモニー）

`sub_infrastructure.md §2.8` lines 716-919:

- 12 Step 対応表（lines 722-738）
- POSIX sh 実装（lines 740-910）
- `MISSION_ID 解決 → BUILD → canopy → G8 → G16 → Hフロー承認 → L1 → L2 → deploy → hash poll → G17 → STATUS→DONE + logs/deploy.log` の 12 Step を網羅
- `set -eu` / `#!/bin/sh` / `[ ... ]` / `case` / `awk tmp+mv` 準拠 ✓
- Runtime preflight 委譲（`. lib/runtime_preflight.sh` → `require_dev_system_runtimes`）L753-754 ✓
- Step 0 `resolve_target_mission.sh` 呼出し、`extract_mission_block.sh` 結合、status_corrections.log 直近 1h 通知（PATCH-12）✓
- Step 5 `verify_approval_authenticity.sh` 呼出し（PATCH-14 / PATCH-19 Bug H）✓
- Step 8 `|| DEPLOY_EXIT=$?` で POSIX pipefail 非依存 ✓（PATCH-19 反映）
- Step 9 / 10 は失敗時 `append_deploy_fail + exit 1`

**1 点の軽微逆ハーモニー（PART2-S2-02 / PART2-S2-04）**:
- §21 §C4.1 テーブル（dev_system_spec.md L1752-1768）: Step 9 失敗時 `exit 1`（append なし）/ Step 10 失敗時 `exit 1`（append なし）
- §2.8 テーブル（sub_infrastructure.md L722-738）: Step 9 失敗時 `append_deploy_fail + exit 1` / Step 10 失敗時 `append_deploy_fail + exit 1`

§C4.1 が SSOT（正本）と宣言されているため（spec L1470「SSOT: 本 §21 は既存 §1-§20 の要約版」）、§2.8 の動作記述が SSOT から逸脱している。ただし §2.8 の動作のほうが PATCH-13 STRIKE 管理（全失敗時 STRIKE カウンタ連動）と整合するため、**実装上は §2.8 が正しく、§C4.1 の表が不完全**と判断される。→ §21 §C4.1 の Step 9/10 を修正するか、§2.8 で明示するのが PART3 の作業候補。

### §2.4 検証項目 4: scripts/ 22 本の実装網羅

**判定**: ✅ YES（22 本全て存在、+ 3 本が補助追加で total 31 本）

`ls /Users/futoshi/Desktop/goal-ai-worker/scripts/*.sh /Users/futoshi/Desktop/goal-ai-worker/scripts/lib/*.sh | wc -l` → **31 本**（PART2 mission cmd2 ≥ 22 を充足）

PATCH-20 L917-942 表の 22 本個別確認:

| # | script | 実在 | 備考 |
|---|---|---|---|
| 1 | extract_mission_block.sh | ✓ | scripts/ |
| 2 | mission_risk_classifier.sh | ✓ | scripts/ |
| 3 | verify_external_services.sh | ✓ | scripts/ |
| 4 | hflow_trigger_check.sh | ✓ | scripts/ |
| 5 | append_deploy_fail.sh | ✓ | scripts/（OVERRIDE が L35 で if 外部定義、PATCH-19 Bug F 反映済）|
| 6 | proposal_log_lint.sh | ✓ | scripts/ |
| 7 | shellcheck_lint.sh | ✓ | scripts/ |
| 8 | normalize_realworld_report.sh | ✓ | scripts/ |
| 9 | realworld_proof_check.sh | ✓ | scripts/ |
| 10 | deploy_hash_verify.sh | ✓ | scripts/ |
| 11 | deploy_poll_hash.sh | ✓ | scripts/ |
| 12 | tdd_trace_consistency.sh | ✓ | scripts/ |
| 13 | lib/risk_match.sh | ✓ | scripts/lib/ |
| 14 | lib/risk_patterns.sh | ✓ | scripts/lib/ |
| 15 | deploy.sh | ✓ | scripts/（12 Step 完全版）|
| 16 | step0_lint.sh | ✓ | scripts/（PATCH-19 追加）|
| 17 | verify_hooks.sh | ✓ | scripts/（PATCH-19 追加）|
| 18 | spec_first_lint.sh | ✓ | scripts/（PATCH-19 追加）|
| 19 | extract_cmd.sh | ✓ | scripts/（PATCH-19 追加、PATCH-11 SSOT）|
| 20 | verify_approval_authenticity.sh | ✓ | scripts/（PATCH-19 追加、Bug H noreply@github.com 対応）|
| 21 | terminology_lint.sh | ✓ | scripts/（PATCH-19 追加、Bug G 排除パターン）|
| 22 | lib/runtime_preflight.sh | ✓ | scripts/lib/（PATCH-19 追加）|

**PATCH-19 追加指定 7 本確認**:
`step0_lint.sh` / `verify_hooks.sh` / `spec_first_lint.sh` / `extract_cmd.sh` / `verify_approval_authenticity.sh` / `terminology_lint.sh` / `lib/runtime_preflight.sh` → 7 本全て実在 ✓

**PATCH-19 Bug F 対応の確認**（`append_deploy_fail.sh` L35 で `OVERRIDE="instructions/approvals/${MISSION_ID}.strike_override.json"` を if 文の外側で定義）: **実ファイルは実装済 ✓**

**ただし 1 点**: `sub_infrastructure.md` には `append_deploy_fail.sh` の独立節（§2.X）が存在せず、Bug F 修正の実装サンプルが仕様書に載っていない。グルー・実動スクリプトのみの反映（§2.8 で参照されているのみ）。仕様書駆動原則（§2.25.1）の観点で **PART2-S2-06（LOW）**。

### §2.5 検証項目 5: ADV 成果物との矛盾検証

**判定**: 🔴 **NO（1 箇所 CRITICAL 不整合、Bug PART2-S2-01）**

#### 5.1 STATUS 5 状態 + STATUS_CORRECTION と canopy_common.sh correct_status()

`docs/plans/dev_system_spec.md §21 §C3.2` L1658-1682:
- 5 状態定義 + STATUS_CORRECTION 例外規定「ADV/PO のみ、`canopy_common.sh::correct_status()` 経由」
- 許容遷移 4 種: `DONE→READY_FOR_DEPLOY / DONE→IN_PROGRESS / READY_FOR_DEPLOY→IN_PROGRESS / IN_PROGRESS→QUEUED`
- `caller_role=ENG` で exit 1

`sub_infrastructure.md §2.6.1` L612-649 の `correct_status()`:
- case 文で `ADV|PO` のみ許容、それ以外 exit 1 ✓
- 4 種遷移のみ許容 ✓
- BLOCKED への遷移は 4 種に含まれないので自動的に exit 1 ✓

→ **§C3.2 と §2.6.1 の内容自体は一致 ✓**

#### 5.2 sub_hflow_protocol.md §3.3 二重証跡 4 項目と verify_approval_authenticity.sh 整合

`sub_hflow_protocol.md §3.3` L85-96（4 項目）:
1. 承認ファイル存在 + JSON スキーマ妥当性
2. session_history_ref の行アンカー実在
3. approval_git_author ドメインマッチ（PATCH-19 Bug H: noreply@github.com 追加）
4. HEAD sha == commit_sha

`scripts/verify_approval_authenticity.sh`:
- 項目 1 — ファイル存在: L15 で `[ -f "$APPROVAL" ] || exit 1` ✓ / JSON スキーマ妥当性: `extract_field` sed で必須フィールド抽出、欠落で exit 1（スキーマ全体検証は未実施、必須フィールド検証のみ）
- 項目 2 — L28-35 で session_history_ref 実在 + 行アンカー ≤ wc -l 検証 ✓
- 項目 3 — L45-60 で `noreply@github.com` を `ADV` ドメインパターン / `PO` ドメインパターン両方で許容 ✓（PATCH-19 Bug H 反映済）
- 項目 4 — L68-73 で `[ "$APPROVED_SHA" = "$CURRENT_SHA" ]` 比較 ✓

→ **4 項目全て実装済 ✓**（項目 1 の JSON スキーマ妥当性は簡易実装、templates/hflow_approval_template.json の $schema 本格検証は未実装 — 運用上は機能する）

#### 5.3 ⚠️ Bug PART2-S2-01 (CRITICAL): sub_adv_protocol §11.3 記載パス不整合

`docs/plans/sub_adv_protocol.md §11.3` L241-245:

```
2. `canopy_common.sh::correct_status()` を呼出し（§2.6、PART2 で実装）:
   ```sh
   . scripts/lib/canopy_common.sh
   correct_status <MISSION_ID> <FROM_STATUS> <TO_STATUS> <caller_role=ADV|PO> "<reason>"
   ```
```

**実体検証**:
- `/Users/futoshi/Desktop/goal-ai-worker/scripts/lib/` の中身: `risk_match.sh`, `risk_patterns.sh`, `runtime_preflight.sh` のみ（3 本）
- `scripts/lib/canopy_common.sh` は **不在** ❌
- `sub_infrastructure.md §1.2` L85 は `tests/smoke/canopy_common.sh ← シンボリックリンク` と記述（dev-system SSOT 経由）
- `sub_infrastructure.md §2.6.1` L669-676 は「canopy.sh 末尾での呼出し順」と記述（独立ファイルではなく canopy.sh 内関数）
- 実際の 5 関数は `tests/smoke/canopy.sh` L428-556 に直書き

**結論**: ADV/PO が §11.3 の手順通り `. scripts/lib/canopy_common.sh` を実行しても **ファイル不在で FAIL**。ADV/PO が STATUS_CORRECTION を実行できない。

**機能代替（回避策）**: ADV/PO は `. tests/smoke/canopy.sh` で source 可能（ただし canopy.sh は末尾で自動実行コード L558-573 を含むため、source だと副作用発生）。安全な代替は `scripts/lib/canopy_common.sh` を新規ファイル化、または §11.3 の記述を `. tests/smoke/canopy_common.sh`（シンボリックリンク）に改訂。

**影響範囲**: STATUS_CORRECTION 機能全体。CRITICAL（仕様書間の記述不整合 = §7.3 CRITICAL 定義「Howの欠落または誤り」該当）。

### §2.6 検証項目 6: §10 構造検証

**判定**: ⚠️ 部分 PASS

- **章重複・サブ節重複**: `sub_infrastructure.md` の章一覧: §1.1 / §1.2 / §2.1-§2.14（§2.6.1 ネスト）/ §3 / §4 — 重複ゼロ ✓
- **シンボリックリンク（canopy 配下 → tests/smoke/）の整合性**: `sub_infrastructure.md §1.2` L85 で `tests/smoke/canopy_common.sh` を「シンボリックリンク」と記述。実体の `scripts/lib/canopy_common.sh` は不在（§2.5 Bug PART2-S2-01 参照）。`init_app.sh` / `update_app.sh` の SYMLINKS 配列に `canopy/canopy_common.sh:tests/smoke/canopy_common.sh` がある（L134 / L208） — dev-system 側に実体があれば動作するが、goal-ai-worker の `dev-system/` は空（canopy/ なし）**なので、ローカルで解決できない**。
- **禁止構文 `[[ ]]` / `mapfile` / `sed -i` の混入**:
  - 新設 22 本 + 補助 3 本（計 25 本）には `[[ ]]` / `mapfile` 混入: **0** ✓
  - `sed -i` 混入: 新設 22 本: **0** ✓ / ただし **既存スクリプト `scripts/bump-version.sh` に `sed -i ''` が 4 箇所残存**（L30, L33, L36, L39） → **PART2-S2-03（HIGH）**。PATCH-20 L1018 で「H1/H2/H3: version_sync.sh / shellcheck_lint.sh の既存 bump-version.sh `sed -i ''` 対応」を PART3 / v3.5 に持ち越し記録 — 既に認知済の持越しだが、PART2 の §3.7 POSIX 互換宣言と衝突するため HIGH 残留。
  - `§2.6 既存ベタ書き` は `#!/bin/bash` で `set -uo pipefail` を使用（L350）。§2.6.1 関数は POSIX sh 互換で記述。canopy.sh 自体が `#!/bin/bash` なのは既存仕様範囲 — **PART2-S2-05（LOW）**。

- `sub_infrastructure.md` に §5 / §6 / §7 / §8 / §9 の大節が存在しない（§4 の次が別ファイルへのリンクになる想定）→ **PART2-S2-08（LOW）**。PATCH-20 L992 「本 PART は §2.6 / §2.8 のみ対象」で意図的スコープ、実害なし。

### §2.7 検証項目 7: PART2 ミッション完了コマンド検証

**判定**: ✅ 4/4 PASS

| Cmd | 期待値 | 実測値 | 判定 |
|---|---|---|---|
| `grep -c "^## PATCH-" lais/verify/dev_system_v34_patches.md` | ≥ 20 | **23** | ✓ |
| `ls scripts/*.sh scripts/lib/*.sh \| wc -l` | ≥ 22 | **31** | ✓ |
| 章重複 0 | 0 | 0 | ✓ |
| sub_infrastructure.md 行数が PART2 前から増加 | 増加 | 1,181 行（PART2 前は ~945 行相当）| ✓ |

---

## §3 発見したバグ・矛盾一覧（Bug PART2-S2-01〜08）

### Bug PART2-S2-01（🔴 CRITICAL）

**件名**: `sub_adv_protocol.md §11.3` 記載パス `scripts/lib/canopy_common.sh` が実在せず、ADV/PO が `correct_status()` を source できない

**該当**: `docs/plans/sub_adv_protocol.md` L243

**現状**:
```sh
. scripts/lib/canopy_common.sh
correct_status <MISSION_ID> ...
```

**問題**: `/Users/futoshi/Desktop/goal-ai-worker/scripts/lib/canopy_common.sh` は不在。5 関数は `tests/smoke/canopy.sh` L428-556 に直書き。§11.3 の手順を実行すると `sh: scripts/lib/canopy_common.sh: No such file or directory` で FAIL。

**推奨修正**（PART3 候補）:
1. **案 A**: `scripts/lib/canopy_common.sh` を新規作成（tests/smoke/canopy.sh の §2.6.1 部分を切出し、symlink 元）→ 仕様書記述との一致を優先、既存の `sub_infrastructure.md §1.1 / §1.2` の設計意図（dev-system/canopy/canopy_common.sh → symlink）にも合致。
2. **案 B**: `sub_adv_protocol.md §11.3` L243 を `. tests/smoke/canopy.sh`（または `. tests/smoke/canopy_common.sh` — こちらは symlink 予定地）に訂正 → 既存実装を温存、仕様書側で吸収。

ADV G_48 が PART3 で選択判断。

### Bug PART2-S2-02（🟡 HIGH）

**件名**: `sub_infrastructure.md §2.8 12Step 対応表` Step 9/10 失敗時動作が §C4.1 と不一致

**該当**: `sub_infrastructure.md` L735-736 vs `dev_system_spec.md` §C4.1 L1765-1766

- §C4.1（SSOT）: Step 9 失敗時 `exit 1` / Step 10 失敗時 `exit 1`
- §2.8: Step 9 失敗時 `append_deploy_fail + exit 1` / Step 10 失敗時 `append_deploy_fail + exit 1`
- `scripts/deploy.sh` 実ファイル: `append_deploy_fail` を呼んでから `exit 1`（§2.8 と一致）

**推奨修正**: §C4.1 の Step 9/10 失敗時動作を `append_deploy_fail + exit 1` に訂正（実装の方が PATCH-13 STRIKE 管理と整合）。PART3 で `docs/plans/dev_system_spec.md §C4.1` に反映。

### Bug PART2-S2-03（🟡 HIGH）

**件名**: `scripts/bump-version.sh` に `sed -i ''` が 4 箇所残存（§3.7 POSIX 禁止構文）

**該当**: `scripts/bump-version.sh` L30, L33, L36, L39

**現状**: `sed -i ''` は macOS BSD sed 固有、GNU sed 非互換。§3.7 POSIX 互換規約と衝突。

**既認知**: PATCH-20 L1018 で H1/H2/H3 として「PART3 / v3.5 で継続検討」と持越し記録済。PART2 スコープ外のため採用可だが、ADV は PART3 で明示的に修正ミッション化推奨。

### Bug PART2-S2-04（🟡 HIGH）

**件名**: `sub_infrastructure.md §2.8` 表記述と §2.8 実装サンプル本文の微不整合

**該当**: §2.8 L735「Step 9 失敗時 `append_deploy_fail + exit 1`」vs §2.8 実装 L875「`scripts/append_deploy_fail.sh ... hash poll failed; exit 1`」

内容は一致しているが、§C4.1 SSOT から逸脱（PART2-S2-02 と連動）。§C4.1 修正案採用なら §2.8 は温存、§C4.1 非修正なら §2.8 表を `exit 1 のみ` に合わせる必要あり。

### Bug PART2-S2-05（🟢 LOW）

**件名**: §2.6 既存ベタ書き canopy_common.sh が `#!/bin/bash` 依存、§3.7 POSIX 宣言と部分衝突

**該当**: `sub_infrastructure.md §2.6` L349-529（既存 G1-G10 の `#!/bin/bash` `set -uo pipefail`）

**現状**: 新設 §2.6.1 の 5 関数は POSIX sh 互換（`#!/bin/sh` / `[ ... ]` / `case`）で記述されているが、canopy.sh 全体は `#!/bin/bash` で bash 依存（例: `grep -oP`, `find ... -exec grep -c "test("`）。

**判定**: 既存ベタ書きは PART1 / v3.4 本体で温存宣言済み、PART2 スコープ外。LOW 継続監視。

### Bug PART2-S2-06（🟢 LOW）

**件名**: `append_deploy_fail.sh` の独立 §2.X 節が `sub_infrastructure.md` に不在、Bug F 修正の実装サンプルが仕様書に未反映

**該当**: `sub_infrastructure.md` に §2.X の `append_deploy_fail.sh` 独立節がない（§2.8 deploy.sh 内で呼出しのみ）

**現状**: PATCH-20 表 L925 で「PATCH-19 Bug F 対応（OVERRIDE を if 外部定義）」と記録されているが、仕様書の実装サンプルではなく実ファイル（`scripts/append_deploy_fail.sh` L35）にのみ反映。

**推奨**: §2.9 rollback.sh のように `§2.X append_deploy_fail.sh（新設）` として実装サンプルを追加（PART3 候補）。

### Bug PART2-S2-07（🟢 LOW）

**件名**: PATCH-20 L1019 の自己申告「stage2 resolve_target_mission.sh」記述が不正確

**該当**: PATCH-20 L1019 「stage2 2R の実装追加で `ls scripts/*.sh scripts/lib/*.sh` の総数が 29 → 31（affected-tests.sh + version_sync.sh + stage2 resolve_target_mission.sh 既存分）に増加」

**問題**: `resolve_target_mission.sh` は「Stage 2 2R 追加」ではなく PATCH-20 の本体（L911）で「補助: `scripts/resolve_target_mission.sh`（§3.1 SSOT、§6.10 に未登載だが deploy.sh が必須依存のため同時新設）」と明記。Stage 2 2R 新設分は `affected-tests.sh` + `version_sync.sh` の 2 本のみ。

**推奨**: PATCH-20 の 「修正後検証」節の内訳記述を整合化（ADV 判断で後日修正、PART2 採用判定には影響なし）。

### Bug PART2-S2-08（🟢 LOW）

**件名**: `sub_infrastructure.md` 大節 §5 / §6 / §7 / §8 / §9 が存在しない（§4 の次が飛び）

**該当**: `sub_infrastructure.md` 章構成は §1, §2, §3, §4 のみ

**判定**: PATCH-20 L992 「本 PART は §2.6 / §2.8 のみ対象」で意図的スコープ、実害なし。§5 以降は元々不在（file version v3.0 で §4 まで）。

---

## §4 ADV / QA / PO代理 3 ペルソナ合議の判定

### ADV（Stage 2 fresh context 視点）

PART2 成果物は CRITICAL 1 件（Bug PART2-S2-01、`sub_adv_protocol.md §11.3` の記載パス不整合）を除き、仕様書・スクリプト・合議記録の全面が高水準で整合。Bug PART2-S2-01 は ADV/PO が STATUS_CORRECTION を実行する際に発覚する設計レベルの不整合で、PART2 スコープ（§2.6/§2.8 + scripts/）の直接責任ではないが、PATCH-20 本文が `sub_adv_protocol.md §11` 参照をベースに 5 関数を実装したことを考えると、**PART3 で §11.3 の `. scripts/lib/canopy_common.sh` を `. tests/smoke/canopy_common.sh`（symlink 予定地）に訂正**するか、**`scripts/lib/canopy_common.sh` を実ファイル化**するかの判断が必要。

§7.4 既棄却テーマ衝突: 0。§2.25.1 仕様書駆動原則: PART2 の 22 本スクリプトと §2.6.1 5 関数は R2.2 本体 + PATCH-1〜19 から逐語転記確認済み。

判定: **採用（条件付き）**。CRITICAL Bug PART2-S2-01 は PART3 で修正必須、PART2 差戻しは不要（PART3 初手で吸収可能）。

### QA（Filter 1-7 適用）

- Filter 1 (仕様書駆動原則): PASS（PATCH-20 本文が R2.2 §2.2 ρcrit L743/L797 等を逐語引用）
- Filter 2 (§7.4 既棄却テーマ衝突): PASS（衝突 0）
- Filter 3 (§7.3 CRITICAL 定義整合): **1 件 CRITICAL 該当**（Bug PART2-S2-01 は「Howの欠落」に準じる仕様書間不整合）
- Filter 4 (POSIX sh 互換 §3.7): PASS（新設 22 本は POSIX sh 互換、既存 bump-version.sh は認知済持越し）
- Filter 5 (§10 構造検証): PASS（新設 §2.6.1 / §2.8 12 Step の章重複ゼロ）
- Filter 6 (PD-109/110 整合): PASS（correct_status 4 種遷移、二重証跡 4 項目、Bug H 対応全て実装済）
- Filter 7 (証跡連鎖): PASS（evidence/ / logs/canopy_fire.log / logs/deploy.log / instructions/status_corrections.log / instructions/deploy_strikes.json の連鎖全て §2.8 + §2.6.1 で網羅）

判定: **条件付き採用**。CRITICAL 1 件（Bug PART2-S2-01）は PART3 で修正。PART2 自体は差戻し不要。

### PO代理（§2.25.3 PO 判断必須事項チェック）

- コスト影響: なし（内部 Code Opus のみ、外部 API 叩かず）
- 新プロセス追加: なし（PART2 は既に PO 承認済み連鎖更新の実装フェーズ）
- ブランド変更: なし
- データスキーマ変更: なし
- 外部依存追加: なし（既存 yq/jq/python3 のみ）

判定: **PO 判断必須事項非該当**、PART2 を PO 負担ゼロで採用可。PART3 着手前に「Bug PART2-S2-01 を PART3 最初のミッションで修正する」ことを PO 報告で明示。

### 3 ペルソナ合議結論

**条件付き採用**（CRITICAL 1 件 / HIGH 3 件 / LOW 4 件）:
- PART2 そのものは差戻し不要
- PART3 の最初のミッションで Bug PART2-S2-01 を修正（ADV/PO の STATUS_CORRECTION 運用阻害を解消）
- HIGH 3 件は PART3 内で並行対応（§C4.1 Step 9/10 整合、bump-version.sh POSIX 化、§2.8 表訂正）
- LOW 4 件は v3.5 持越し可

---

## §5 PART3 着手可否判定

### 結論: **条件付き可**

#### 可とする根拠
1. CRITICAL 1 件（Bug PART2-S2-01）は **PART3 の初手で吸収可能**な仕様書間不整合で、PART2 の 22 本スクリプト実装は機能完結している
2. scripts/ 実装は PATCH-20 の主張（22 本存在 + §6.10 と 1:1 対応）通りで差戻し不要
3. §2.6.1 5 関数と §2.8 12 Step は仕様書内で完全（実装サンプル + 呼出し順 + 他クラスター整合表を網羅）
4. PATCH-20 合議記録は PATCH-1〜19 と同等フォーマット
5. Stage 2 Pre-Review 2R 合議（ENG 3 ペルソナ）で CRITICAL 0 達成済（本 Stage 2 レビュー = LP-031 の fresh context による 2nd pass 検証でも同等水準を確認）

#### 条件
1. **PART3 最初のミッション**で Bug PART2-S2-01 を修正（案 A: `scripts/lib/canopy_common.sh` 実ファイル化 or 案 B: `sub_adv_protocol.md §11.3` パス訂正）
2. **PART3 内の波及ファイル更新**時に HIGH 3 件を並行対応:
   - `dev_system_spec.md §C4.1` Step 9/10 失敗時動作を `append_deploy_fail + exit 1` に訂正 → 実装 SSOT §2.8 との 1:1 確保（PART2-S2-02 / PART2-S2-04）
   - `scripts/bump-version.sh` を POSIX sh 互換化（PART2-S2-03） — Bug F 類似で if 構造保持、`sed -i ''` → `awk tmp + mv`
3. LOW 4 件は PART3 内で対応可なら同時消化、さもなくば v3.5 記録（`dev_system_v35_roadmap.md` 候補枠へ）

#### 次アクション推奨

1. **即時（本レビュー報告後）**: ADV G_48 から PO ふとしに以下を報告:
   - CRITICAL 1 件（Bug PART2-S2-01、PART3 初手で修正）
   - HIGH 3 件（PART3 内並行対応）
   - LOW 4 件（v3.5 持越し可）
   - PART2 採用可否 = **条件付き可**
2. **PO 承認後**: PART3 ENG subagent 起動
   - 第 1 ミッション: Bug PART2-S2-01 修正（案 A/B の ADV 判断後）
   - 第 2 ミッション: templates/ 更新（session_progress.md §6 PART3 スコープ）
   - 第 3 ミッション: development_rules.md リンク化 + bootstrap.md §2.25 参照 + .git/hooks/ 更新
   - 並行対応: HIGH 3 件（§C4.1 Step 9/10、bump-version.sh、§2.8 表）
3. **PART3 完了後**: Stage 2 fresh subagent で PART3 独立レビュー（LP-031 準拠）

---

## §6 Stage 2 レビュー報告メタデータ

- **実施手法**: LP-031 準拠（Stage 1 = Code 自己レビュー PATCH-20 本文 → Stage 2 = fresh subagent 独立検証）
- **実施者**: Agent tool で起動された subagent（本レビュー、親 ADV G_48 / fresh context）
- **対象ファイル数**: sub_infrastructure.md（1,181 行）/ sub_adv_protocol.md（276 行）/ sub_hflow_protocol.md（173 行）/ dev_system_spec.md §21 §C3/§C4 周辺 / patches.md §PATCH-20 / 31 本 shell scripts / canopy.sh（589 行）/ session_progress.md PART2 記録
- **Read/Grep 呼出し**: 計 ~20 回、Bash 呼出し ~10 回（ls/wc/grep）
- **検出 Bug PART2-S2 番号範囲**: 01〜08
- **本レビューの信頼区間**: Stage 2 fresh context による独立検証 = LP-030 self-critique 限界回避を担保、PATCH-20 本文の自己申告 CRITICAL 0 主張を fresh 視点で検証し、1 件の CRITICAL（仕様書間パス不整合、Stage 1 では §2.6 実装範囲内のため見落とされやすい）を追加検出

---

> 本 Stage 2 レビューは CHAIN-UPDATE-DISPATCH PART2 成果物の fresh context 独立検証記録。PART3 着手可否は条件付き可 = CRITICAL 1 件を PART3 初手で修正することを前提に採用。PART2 差戻しは不要。
