#!/bin/sh
# scripts/seven_phase_process_check.sh — §13.2 7 Phase 強制 process 機械強制 (Lais 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §13.2 7 Phase 強制 process (Phase A-G、 各 phase 必ず実施 省略不可)
#   - core_spec.md §13.5 102 観点全件 review 必須
#   - PO 直命 (2026-05-04): 「機械強制 しない 理由 が ない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-P2-MECHANICAL-ENFORCEMENT-DEPLOY-V1 (P2-10 配備)
#
# 動作 (dev-system pre-commit hook 経由 / Stop hook 経由):
#   1. instructions/persona_review/<DATE>/__results.md walk
#   2. 7 Phase keyword (Phase A / Phase B / ... / Phase G) 言及 count
#   3. 4 phase 未満言及 → §13.2 違反 (省略 検出)
#   4. 全 7 phase 言及 = §13.2 履行
#   5. devs_seven_phase_review_check.sh (P0-3 配備済) と 補完運用
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#         SKIP_X / DISABLED_BYPASS / DRIFT_REPORT_ONLY 不採用 (= 違反 #53 再生産 禁止)
#
# 連動 (settings.json + pre-commit hook):
#   - settings.json: pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step u10 に結線)
#   - core_spec.md §13.2 / §13.5 mechanical_enforcement row
#   - templates/scripts/seven_phase_process_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

echo "================================================================"
echo "  §13.2 7 Phase 強制 process check (Lais 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

# Step 1: 7 Phase keyword pattern (§13.2)
PHASE_A='Phase A|pre-launch|prod_verify_phase_a'
PHASE_B='Phase B|code-vs-spec|schema_drift_check|version_drift_check'
PHASE_C='Phase C|secret.*config|secret_age_check|secret_rotation'
PHASE_D='Phase D|runtime resilience|nightly_real_invoke|external_state_monitor'
PHASE_E='Phase E|UX.*a11y|i18n|axe|Lighthouse|i18n_coverage'
PHASE_F='Phase F|documentation.*SSoT|spec_lint_extended|changeable_policy_lint'
PHASE_G='Phase G|meta-process|persona_review_runner|weekly_violation_audit'

# 7 phase 全 言及閾値 (= §13.2 「省略不可」 = 4 以上 = baseline、 7 = 完全)
MIN_PHASE_THRESHOLD=4

VIOLATION_COUNT=0
VIOLATION_DETAIL=""

# Step 2: persona_review/<DATE>/__results.md scan
REVIEW_DIR="${REPO_ROOT}/instructions/persona_review"
if [ -d "$REVIEW_DIR" ]; then
  while IFS= read -r f; do
    [ -f "$f" ] || continue

    PHASES_HIT=0
    grep -qE "$PHASE_A" "$f" 2>/dev/null && PHASES_HIT=$((PHASES_HIT + 1))
    grep -qE "$PHASE_B" "$f" 2>/dev/null && PHASES_HIT=$((PHASES_HIT + 1))
    grep -qE "$PHASE_C" "$f" 2>/dev/null && PHASES_HIT=$((PHASES_HIT + 1))
    grep -qE "$PHASE_D" "$f" 2>/dev/null && PHASES_HIT=$((PHASES_HIT + 1))
    grep -qE "$PHASE_E" "$f" 2>/dev/null && PHASES_HIT=$((PHASES_HIT + 1))
    grep -qE "$PHASE_F" "$f" 2>/dev/null && PHASES_HIT=$((PHASES_HIT + 1))
    grep -qE "$PHASE_G" "$f" 2>/dev/null && PHASES_HIT=$((PHASES_HIT + 1))

    if [ "$PHASES_HIT" -lt "$MIN_PHASE_THRESHOLD" ]; then
      VIOLATION_COUNT=$((VIOLATION_COUNT + 1))
      VIOLATION_DETAIL="${VIOLATION_DETAIL}  - $f: phase 言及 ${PHASES_HIT}/7 (< ${MIN_PHASE_THRESHOLD} = §13.2 違反 = 省略検出)\n"
    fi
  done <<EOF
$(find "$REVIEW_DIR" -type f -name '__results.md' 2>/dev/null)
EOF
fi

echo ""
echo "§13.2 7 Phase 言及不足 違反: $VIOLATION_COUNT (threshold=${MIN_PHASE_THRESHOLD}/7)"

if [ "$VIOLATION_COUNT" -ge 1 ]; then
  echo ""
  echo "🛑 §13.2 7 Phase 強制 process 違反検出:"
  printf "%b" "$VIOLATION_DETAIL"
  echo ""
  echo "対処 (= §13.2 履行):"
  echo "  1. 7 Phase (A-G) 各 必ず実施 省略不可"
  echo "  2. persona_review/<DATE>/__results.md に 全 7 phase 言及 必須"
  echo "  3. Phase A: pre-launch / Phase B: drift / Phase C: secret / Phase D: runtime / Phase E: UX / Phase F: docs / Phase G: meta"
  echo "  4. 102 観点全件 (§13.5) を 7 phase に 分割 して 全件 review"
  echo ""
  if [ "${SEVEN_PHASE_PROCESS_STRICT:-0}" = "1" ]; then
    echo "BLOCK: SEVEN_PHASE_PROCESS_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 SEVEN_PHASE_PROCESS_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §13.2 7 Phase 強制 process 健全 (violation=$VIOLATION_COUNT)"
exit 0
