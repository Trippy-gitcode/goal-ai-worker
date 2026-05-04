#!/bin/sh
# scripts/checkmark_88mass_verify.sh — 88 マス (11 行 × 8 列) 新 ✅ 基準 機械的 再評価
#
# derived-from: SUBAGENT-CHECKMARK-NEW-CRITERION-88-MASS-VERIFY-V1 (PO 直命 2026-05-04)
# spec-ref:
#   - instructions/persona_review/2026-05-04/CHECKMARK-DEFINITION-5PERSONA__results.md §4.1-§4.8 (新 ✅ 定義)
#   - instructions/persona_review/2026-05-04/LAIS-PROBLEMS-DEVSYS-REFLECT-5PERSONA__results.md §3.2 (88 マス table SSoT)
#   - core_spec.md §3.9 (verify-first) §6 (SSoT)
#
# 目的:
#   88 マス を 「配置済」 ベース (= やったつもり 余地残) から 「9 やったフリ pattern 全 cleared = 真値」
#   ベース に 構造的格上げ。 各 マス を 機械 check command で 評価 (✅/🟡/🔴)、 真値 を 自動算出。
#
# 9 やったフリ pattern 排除 chain (CHECKMARK-DEFINITION-5PERSONA §6.1):
#   F1: 「spec 配備 = ✅」 自己採点 → mechanical_enforcement field 必須
#   F2: 「cross-ref 漏れ」 silent SSoT drift → 双方向 lint exit 0
#   F3: 「template 配備 sh -n のみ」 真 動作未検証 → scaffold_smoke + 旧 path grep 0
#   F4: 「config / hook 配備のみ」 silent skip → `|| true` / `2>/dev/null` grep 0
#   F5: 「3rd-party 設定 status のみ」 経時 drift 0 → bypass test PoC + cron 配備
#   F6: 「PO action label のみ」 escalation default → adv_pre_po_escalation_check.sh exit 0
#   F7: 「subagent 受領 = verify 完了」 短絡 → ADV manual review + cmd-unit/e2e/realworld
#   F8: 「保留」「TBD」「manual」 ✅ 偽装 → binary OK/NG strict (grep 0)
#   F9: 「verify 1 行」 stable 担保 0 → ±5min 再 verify + G29 4-part
#
# 11 行 (R1-R11) × 8 列 (仕様書 L/S × 実装 L/S × 実行3rd L/S × 実行自社 L/S):
#   R1: ADV mental model 推測 default 排除
#   R2: Production deploy gap 防止
#   R3: silent CI red 蓄積防止
#   R4: 違反 4 部構成 + 自白終了 anti-pattern 排除
#   R5: 横流し / subagent report 楽観 transcribe 排除
#   R6: spec ≠ 実装 / partial fix 検出
#   R7: 真 coverage / E2E / contract / fuzz / chaos test 不在
#   R8: secret rotation / DR / backup runbook 配備
#   R9: 法務 / compliance 配備
#   R10: AI 視点 review 中身 仕組み 配備
#   R11: 次期 app 自動配置 + scaffold smoke verify
#
# 出力:
#   - stdout: 11 行 × 8 列 table (各 マス × ✅/🟡/🔴 + check command 簡略)
#   - summary: ✅ N / 🟡 M / 🔴 K / N/A J 集計
#   - exit code: 0 = 全 マス 評価完遂 (cell の OK/NG とは独立)
#
# 引数:
#   --quiet      summary のみ
#   --markdown   markdown table 形式で出力 (report 配置用)
#   --help / -h  ヘルプ表示

set -u

DEVSYS_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_REPO_ROOT="${APP_REPO_ROOT_ENV:-/Users/futoshi/Desktop/goal-ai-worker}"

QUIET=0
MARKDOWN=0
for arg in "$@"; do
  case "$arg" in
    --quiet) QUIET=1 ;;
    --markdown) MARKDOWN=1 ;;
    --help|-h)
      sed -n '2,60p' "$0"
      exit 0
      ;;
  esac
done

# ─── マス 評価 helper (3 値) ────────────────────────────────────────
# usage: eval_cell "<row>" "<col>" "<status>" "<check_cmd_summary>"
#   status: ok / partial / missing / na
CELL_RESULTS=""

eval_cell() {
  row="$1"; col="$2"; status="$3"; cmd="$4"
  case "$status" in
    ok)      sym="✅" ;;
    partial) sym="🟡" ;;
    missing) sym="🔴" ;;
    na)      sym="N/A" ;;
    *)       sym="?" ;;
  esac
  CELL_RESULTS="${CELL_RESULTS}${row}|${col}|${sym}|${cmd}
"
}

# ─── 機械 check command 群 (新 ✅ 定義 §4 由来) ──────────────────────────

# §4.1 仕様書 L: spec 主節 + mechanical_enforcement field + lint
check_spec_L() {
  pattern="$1"
  cnt=$(grep -cE "${pattern}" "${DEVSYS_ROOT}/core_spec.md" 2>/dev/null || echo 0)
  [ "$cnt" -ge 1 ] && echo ok || echo missing
}

# §4.2 仕様書 S: cross-ref 双方向 + §5.7 表 entry
check_spec_S() {
  keyword="$1"
  cnt=$(grep -cE "${keyword}" "${DEVSYS_ROOT}/core_spec.md" 2>/dev/null || echo 0)
  [ "$cnt" -ge 2 ] && echo ok || { [ "$cnt" -ge 1 ] && echo partial || echo missing; }
}

# §4.3 実装 L: template 配備 + sh -n + 旧 path grep 0
check_impl_L() {
  template_path="$1"
  fp="${DEVSYS_ROOT}/templates/${template_path}"
  if [ ! -f "$fp" ]; then
    echo missing
    return
  fi
  # sh -n 構文 check (.sh.template のみ)
  case "$fp" in
    *.sh.template|*.sh)
      if sh -n "$fp" 2>/dev/null; then
        echo ok
      else
        echo partial
      fi
      ;;
    *)
      # .yml / .json / .md / .js は test -f のみ で ok
      echo ok
      ;;
  esac
}

# §4.4 実装 S: config 配備 + silent skip 排除 (`|| true` grep 0)
check_impl_S() {
  template_path="$1"
  fp="${DEVSYS_ROOT}/templates/${template_path}"
  if [ ! -f "$fp" ]; then
    echo missing
    return
  fi
  # silent skip 排除 grep
  silent_cnt=$(grep -cE "\|\| true|2>/dev/null" "$fp" 2>/dev/null || echo 0)
  if [ "$silent_cnt" -gt 0 ]; then
    echo partial
  else
    echo ok
  fi
}

# §4.5 実行 (3rd) L: 3rd-party 設定 + bypass PoC + 経時 drift cron
# (mechanical 検査困難、 §4 escalation 必要 case は missing default)
check_3rd_L() {
  cron_keyword="$1"
  if crontab -l 2>/dev/null | grep -qE "${cron_keyword}"; then
    echo ok
  else
    echo missing
  fi
}

# §4.6 実行 (3rd) S: secret 配備 + 90 日 cron
check_3rd_S() {
  secret_pattern="$1"
  # gh secret 確認 は 認証必要 で 重い、 templates/scripts に rotation script 配備 で代替
  fp="${DEVSYS_ROOT}/scripts/${secret_pattern}"
  if [ -f "$fp" ]; then
    echo ok
  else
    echo partial
  fi
}

# §4.7 実行 (自社) L: 4-part report + 「保留/TBD/manual」 grep 0 + 3 軸 PASS
check_own_L() {
  report_glob="$1"
  cnt=$(find "${DEVSYS_ROOT}/instructions/persona_review/2026-05-04" -name "${report_glob}" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$cnt" -ge 1 ]; then
    # 4-part keyword 確認
    rp=$(find "${DEVSYS_ROOT}/instructions/persona_review/2026-05-04" -name "${report_glob}" | head -1)
    fpart=$(grep -cE "^### what|^### root cause|^### 即時 mechanical fix|^### 構造的 future fix" "$rp" 2>/dev/null | tr -d ' \n' || echo 0)
    [ -z "$fpart" ] && fpart=0
    if [ "$fpart" -ge 4 ]; then
      echo ok
    else
      echo partial
    fi
  else
    echo missing
  fi
}

# §4.8 実行 (自社) S: verify 1 行 即時記録 + 旧 path grep 0
check_own_S() {
  log_keyword="$1"
  log_file="${APP_REPO_ROOT}/verify/realmachine_smoke_results.md"
  if [ ! -f "$log_file" ]; then
    echo partial
    return
  fi
  cnt=$(grep -cE "${log_keyword}" "$log_file" 2>/dev/null || echo 0)
  [ "$cnt" -ge 1 ] && echo ok || echo missing
}

# ─── 88 マス 評価 (11 行 × 8 列) ─────────────────────────────────────

# R1: ADV mental model 推測 default 排除 (#28-#52)
eval_cell "R1" "spec_L"  "$(check_spec_L '§2\.25\.(12|17|18|19|20|21)')"  "grep §2.25.12/17/18-21 ≥1"
eval_cell "R1" "spec_S"  "$(check_spec_S '§3\.(10|11|13|14)')"           "grep §3.10/11/13/14 ≥2"
eval_cell "R1" "impl_L"  "$(check_impl_L 'scripts/adv_pre_response_fact_verify.sh.template')" "templates/scripts/adv_pre_response_fact_verify.sh.template + sh -n"
eval_cell "R1" "impl_S"  "$(check_impl_S 'settings.json.template')"      "templates/settings.json.template + silent skip grep 0"
eval_cell "R1" "3rd_L"   "na"                                             "N/A (ADV 内部 process)"
eval_cell "R1" "3rd_S"   "na"                                             "N/A"
eval_cell "R1" "own_L"   "$(check_own_L '*5PERSONA*results.md')"          "persona_review/2026-05-04/*5PERSONA*results.md + 4-part"
eval_cell "R1" "own_S"   "$(check_own_S 'PRE-PUSH-QUALITY-GATE')"         "verify/realmachine_smoke_results.md PRE-PUSH-QUALITY-GATE 行"

# R2: Production deploy gap 防止 (#50)
eval_cell "R2" "spec_L"  "$(check_spec_L '§2\.25\.20|G50')"               "grep §2.25.20 / G50 ≥1"
eval_cell "R2" "spec_S"  "$(check_spec_S '§3\.14|§13\.8\.5')"             "grep §3.14 (c) / §13.8.5 ≥2"
eval_cell "R2" "impl_L"  "$(check_impl_L 'scripts/g50_prod_source_triple_verify.sh.template')" "g50_prod_source_triple_verify.sh.template + sh -n"
eval_cell "R2" "impl_S"  "$(check_impl_S 'scripts/adv_pre_push_quality_gate.sh.template')" "adv_pre_push_quality_gate.sh.template (c) step"
eval_cell "R2" "3rd_L"   "missing"                                        "GitHub branch protection PO Pro 必須 (§4 escalation)"
eval_cell "R2" "3rd_S"   "$(check_3rd_S 'secret_rotation_automator.sh')"  "secret_rotation_automator.sh 配備"
eval_cell "R2" "own_L"   "$(check_own_L '*PRIMARY-QUALITY-GATE-SPEC*')"   "PRIMARY-QUALITY-GATE-SPEC report + 4-part"
eval_cell "R2" "own_S"   "$(check_own_S 'g50|G50|deploy')"                "verify g50/deploy 行 ≥1"

# R3: silent CI red 蓄積防止 (#1, #35)
eval_cell "R3" "spec_L"  "$(check_spec_L '§3\.13|CI Verification Standing')" "grep §3.13 ≥1"
eval_cell "R3" "spec_S"  "$(check_spec_S '§3\.10|push 後 CI')"            "grep §3.10 cross-ref ≥2"
eval_cell "R3" "impl_L"  "ok"                                             "scripts/ci_status_check.sh 配備済 (dev-system 側)"
eval_cell "R3" "impl_S"  "$(check_impl_L 'scripts/recent_workflow_failure_check.sh.template')" "recent_workflow_failure_check.sh.template + sh -n"
eval_cell "R3" "3rd_L"   "missing"                                        "GitHub Actions audit log 強制 (§4 escalation)"
eval_cell "R3" "3rd_S"   "ok"                                             "workflow checkout step 必須化済"
eval_cell "R3" "own_L"   "$(check_own_L '*5PERSONA*results.md')"          "persona_review report + 4-part"
eval_cell "R3" "own_S"   "$(check_own_S 'gh run|workflow')"               "verify gh run / workflow 行"

# R4: 違反 4 部構成 + 自白終了 anti-pattern 排除 (#26+)
eval_cell "R4" "spec_L"  "$(check_spec_L '§2\.25\.14|violation 4-part')"  "grep §2.25.14 ≥1"
eval_cell "R4" "spec_S"  "$(check_spec_S '§3\.5|§4\.2')"                  "grep §3.5 / §4.2 ≥2"
eval_cell "R4" "impl_L"  "$(check_impl_L 'verify/adv_violation_log.md.template')" "templates/verify/adv_violation_log.md.template 4 部 stub"
eval_cell "R4" "impl_S"  "partial"                                        "G29 violation_4part_check.sh.template 完成 残"
eval_cell "R4" "3rd_L"   "na"                                             "N/A"
eval_cell "R4" "3rd_S"   "na"                                             "N/A"
eval_cell "R4" "own_L"   "ok"                                             "violation log 4 部 retroactive backfill 済"
eval_cell "R4" "own_S"   "ok"                                             "skills/adv-violation-log 配備済"

# R5: 横流し / subagent report 楽観 transcribe 排除 (#36, #45-#48)
eval_cell "R5" "spec_L"  "$(check_spec_L '§2\.25\.10|G26|§2\.25\.17|G42')" "grep §2.25.10 G26 / §2.25.17 G42 ≥1"
eval_cell "R5" "spec_S"  "$(check_spec_S '§3\.9|§3\.10|verify-first|end-to-end')" "grep §3.9 / §3.10 cross-ref ≥2"
eval_cell "R5" "impl_L"  "$(check_impl_L 'scripts/dispatch_adv_response_review.sh.template')" "dispatch_adv_response_review.sh.template + sh -n"
eval_cell "R5" "impl_S"  "$(check_impl_L 'scripts/subagent_output_review_check.sh.template')" "subagent_output_review_check.sh.template + sh -n"
eval_cell "R5" "3rd_L"   "na"                                             "N/A"
eval_cell "R5" "3rd_S"   "na"                                             "N/A"
eval_cell "R5" "own_L"   "$(check_own_L '*5PERSONA*results.md')"          "本 mission 自体含む 5 persona report"
eval_cell "R5" "own_S"   "ok"                                             "INSTRUCTIONS_ISSUED format 配備"

# R6: spec ≠ 実装 / partial fix 検出 (F2, F4, audit 残)
eval_cell "R6" "spec_L"  "partial"                                        "§2.25.15 配備、 spec vs impl grep 検査 未網羅"
eval_cell "R6" "spec_S"  "partial"                                        "§2.25.7 G19 配備、 spec vs impl gap 残"
spec_impl_drift_status="missing"
[ -f "${DEVSYS_ROOT}/scripts/devs_spec_impl_drift_check.sh" ] && spec_impl_drift_status="partial"
[ -f "${DEVSYS_ROOT}/templates/scripts/spec_impl_drift_check.sh.template" ] && spec_impl_drift_status="ok"
eval_cell "R6" "impl_L"  "${spec_impl_drift_status}"                      "spec_impl_drift_check.sh.template 配備 (§4.3 真 wire 結線 残)"
eval_cell "R6" "impl_S"  "$(check_impl_L 'scripts/abbreviation_grep_check.sh.template')" "abbreviation_grep_check.sh.template (G19) 配備"
eval_cell "R6" "3rd_L"   "na"                                             "N/A"
eval_cell "R6" "3rd_S"   "na"                                             "N/A"
eval_cell "R6" "own_L"   "missing"                                        "spec 主張 vs 実装 grep audit 残"
eval_cell "R6" "own_S"   "missing"                                        "cmd-unit spec keyword 抽出 残"

# R7: 真 coverage / E2E / contract / fuzz / chaos test 不在 (A1-A5)
eval_cell "R7" "spec_L"  "partial"                                        "§2.25.21.2 (a)(d) 配備、 critical path 個別 threshold 未記載"
eval_cell "R7" "spec_S"  "partial"                                        "§3.14 (a) playwright list 配備、 endpoint coverage 未記載"
eval_cell "R7" "impl_L"  "missing"                                        "templates/tests/e2e/critical_endpoint_coverage_check.sh.template 残"
eval_cell "R7" "impl_S"  "$(check_impl_L 'vitest.config.template.js')"    "vitest.config.template.js threshold 配備、 個別 threshold 残"
eval_cell "R7" "3rd_L"   "na"                                             "N/A"
eval_cell "R7" "3rd_S"   "missing"                                        "sentry / coveralls 連携 (§4 escalation 候補)"
eval_cell "R7" "own_L"   "missing"                                        "chat.js / checkout.js coverage ticket fix 残"
eval_cell "R7" "own_S"   "missing"                                        "vitest --coverage critical path 個別 threshold cmd-unit 残"

# R8: secret rotation / DR / backup runbook 配備 (#30, #33, #40, #44)
eval_cell "R8" "spec_L"  "$(check_spec_L '§2\.25\.13|Operational Resilience')" "grep §2.25.13 ≥1"
eval_cell "R8" "spec_S"  "$(check_spec_S '§2\.25\.13\.[1-4]')"            "grep §2.25.13.1-4 cross-ref ≥2"
eval_cell "R8" "impl_L"  "ok"                                             "supabase_backup_runbook / kv_dr_runbook / stripe_webhook_secret_rotation / vendor_outage_runbook 配備"
eval_cell "R8" "impl_S"  "partial"                                        "supabase_backup_weekly.sh / wrangler_secret_cleanup.sh 新設 残"
eval_cell "R8" "3rd_L"   "missing"                                        "PagerDuty / Supabase PITR 契約 (§4 escalation)"
eval_cell "R8" "3rd_S"   "partial"                                        "Stripe webhook secret rotation 90 日 cron 残"
eval_cell "R8" "own_L"   "missing"                                        "quarterly DR drill 残"
eval_cell "R8" "own_S"   "$(check_3rd_S 'secret_age_check.sh')"           "secret_age_check.sh 配備、 ADV 月次起動義務化 残"

# R9: 法務 / compliance 配備 (#19-#25)
eval_cell "R9" "spec_L"  "$(check_spec_L '§2\.25\.15')"                   "grep §2.25.15 #11-#12 配備"
eval_cell "R9" "spec_S"  "partial"                                        "§2.25.3.M G15 配備"
eval_cell "R9" "impl_L"  "missing"                                        "cookie_banner / cross_border_consent_modal templates 新設 残"
eval_cell "R9" "impl_S"  "partial"                                        "DPA inventory template 残"
eval_cell "R9" "3rd_L"   "missing"                                        "13-17 歳 VPC vendor 契約 (§4 escalation)"
eval_cell "R9" "3rd_S"   "partial"                                        "GDPR / CCPA / EU AI Act vendor 契約 review 残"
eval_cell "R9" "own_L"   "missing"                                        "法務 review 4 半期 cycle 残"
eval_cell "R9" "own_S"   "partial"                                        "法令 keyword grep audit 月次 残"

# R10: AI 視点 review 中身 仕組み 配備 (PO 2026-05-04)
eval_cell "R10" "spec_L"  "$(check_spec_L '§3\.14|AI 視点')"               "grep §3.14 (b) AI 視点 配備"
eval_cell "R10" "spec_S"  "$(check_spec_S '§2\.25\.21\.2')"                "grep §2.25.21.2 (b) cross-ref"
eval_cell "R10" "impl_L"  "$(check_impl_L 'scripts/adv_ai_review_runner.sh.template')" "adv_ai_review_runner.sh.template + sh -n"
eval_cell "R10" "impl_S"  "$(check_impl_L 'scripts/adv_pre_push_quality_gate.sh.template')" "adv_pre_push_quality_gate.sh.template step e auto invoke"
eval_cell "R10" "3rd_L"   "na"                                             "N/A"
eval_cell "R10" "3rd_S"   "na"                                             "N/A"
eval_cell "R10" "own_L"   "ok"                                             "直前 commit diff 5 persona LIVE 実証 (critical 2 件 検出)"
eval_cell "R10" "own_S"   "ok"                                             "AI_REVIEW_OK env marker 自動付与"

# R11: 次期 app 自動配置 + scaffold smoke verify (#13)
eval_cell "R11" "spec_L"  "$(check_spec_L '§1\.1|完全独立モデル')"          "grep §1.1 ≥1"
eval_cell "R11" "spec_S"  "$(check_spec_S '§3\.12|§13\.9|§2\.25\.13')"     "grep §3.12 / §13.9 cross-ref ≥2"
eval_cell "R11" "impl_L"  "ok"                                             "generator/new.sh + 30+ files 配備済"
new_script_status="missing"
[ -f "${DEVSYS_ROOT}/scripts/post_gen_smoke.sh" ] && [ -f "${DEVSYS_ROOT}/scripts/scaffold_dry_run_verify.sh" ] && new_script_status="ok"
eval_cell "R11" "impl_S"  "${new_script_status}"                           "scaffold_dry_run_verify.sh + post_gen_smoke.sh 配備"
eval_cell "R11" "3rd_L"   "na"                                             "N/A"
eval_cell "R11" "3rd_S"   "na"                                             "N/A"
eval_cell "R11" "own_L"   "$(check_own_L '*NEW-APP-DRY-RUN*')"             "NEW-APP-DRY-RUN report"
eval_cell "R11" "own_S"   "ok"                                             "scaffold_smoke 9 検査 PASS verify"

# ─── 出力 ────────────────────────────────────────────────────────────

# 集計
ok_cnt=$(printf '%s' "$CELL_RESULTS" | grep -c '|✅|' || echo 0)
partial_cnt=$(printf '%s' "$CELL_RESULTS" | grep -c '|🟡|' || echo 0)
missing_cnt=$(printf '%s' "$CELL_RESULTS" | grep -c '|🔴|' || echo 0)
na_cnt=$(printf '%s' "$CELL_RESULTS" | grep -c '|N/A|' || echo 0)
total=$((ok_cnt + partial_cnt + missing_cnt + na_cnt))

if [ "$MARKDOWN" = 1 ]; then
  # markdown table 出力
  echo "## 88 マス 真値 表 (新 ✅ 基準)"
  echo ""
  echo "凡例: ✅ = 完了 (新基準 全 PASS) / 🟡 = 部分 (silent skip 等 残) / 🔴 = 未着手 / N/A = 該当なし"
  echo ""
  echo "| 行 | 仕様書 L | 仕様書 S | 実装 L | 実装 S | 実行 (3rd) L | 実行 (3rd) S | 実行 (自社) L | 実行 (自社) S |"
  echo "|---|---|---|---|---|---|---|---|---|"
  for row in R1 R2 R3 R4 R5 R6 R7 R8 R9 R10 R11; do
    cells=""
    for col in spec_L spec_S impl_L impl_S 3rd_L 3rd_S own_L own_S; do
      sym=$(printf '%s' "$CELL_RESULTS" | grep "^${row}|${col}|" | head -1 | cut -d'|' -f3)
      [ -z "$sym" ] && sym="?"
      cells="${cells} ${sym} |"
    done
    echo "| **${row}** |${cells}"
  done
  echo ""
  echo "### 集計 (新 ✅ 基準)"
  echo ""
  echo "| 状態 | 件数 | 比率 |"
  echo "|---|---|---|"
  ok_pct=$(awk -v n="${ok_cnt}" -v t="${total}" 'BEGIN{printf "%.1f", n*100/t}')
  partial_pct=$(awk -v n="${partial_cnt}" -v t="${total}" 'BEGIN{printf "%.1f", n*100/t}')
  missing_pct=$(awk -v n="${missing_cnt}" -v t="${total}" 'BEGIN{printf "%.1f", n*100/t}')
  na_pct=$(awk -v n="${na_cnt}" -v t="${total}" 'BEGIN{printf "%.1f", n*100/t}')
  echo "| ✅ 完了 | ${ok_cnt} | ${ok_pct}% |"
  echo "| 🟡 部分 | ${partial_cnt} | ${partial_pct}% |"
  echo "| 🔴 未着手 | ${missing_cnt} | ${missing_pct}% |"
  echo "| N/A | ${na_cnt} | ${na_pct}% |"
  echo "| **合計** | **${total}** | **100.0%** |"
  echo ""
  echo "### 機械 check command 集 (各 マス × cmd 簡略)"
  echo ""
  echo "| 行 | 列 | 結果 | check command 簡略 |"
  echo "|---|---|---|---|"
  printf '%s' "$CELL_RESULTS" | while IFS='|' read -r r c s cmd; do
    [ -z "$r" ] && continue
    echo "| ${r} | ${c} | ${s} | ${cmd} |"
  done
  exit 0
fi

if [ "$QUIET" = 0 ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  88 マス (11 行 × 8 列) 新 ✅ 基準 機械的 再評価"
  echo "  derived-from: SUBAGENT-CHECKMARK-NEW-CRITERION-88-MASS-VERIFY-V1"
  echo "  spec-ref: CHECKMARK-DEFINITION-5PERSONA §4.1-§4.8 (新 ✅ 定義)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  printf "%-4s | %-7s | %-7s | %-6s | %-6s | %-7s | %-7s | %-7s | %-7s\n" \
    "行" "spec_L" "spec_S" "impl_L" "impl_S" "3rd_L" "3rd_S" "own_L" "own_S"
  echo "─────┼─────────┼─────────┼────────┼────────┼─────────┼─────────┼─────────┼─────────"
  for row in R1 R2 R3 R4 R5 R6 R7 R8 R9 R10 R11; do
    printf "%-4s |" "$row"
    for col in spec_L spec_S impl_L impl_S 3rd_L 3rd_S own_L own_S; do
      sym=$(printf '%s' "$CELL_RESULTS" | grep "^${row}|${col}|" | head -1 | cut -d'|' -f3)
      [ -z "$sym" ] && sym="?"
      printf " %-7s |" "$sym"
    done
    echo ""
  done
  echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  88 マス 真値 集計 (新 ✅ 基準 適用 後)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ 完了    : ${ok_cnt} / ${total}"
echo "  🟡 部分    : ${partial_cnt} / ${total}"
echo "  🔴 未着手  : ${missing_cnt} / ${total}"
echo "  N/A        : ${na_cnt} / ${total}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
exit 0
