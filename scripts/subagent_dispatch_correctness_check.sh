#!/bin/sh
# scripts/subagent_dispatch_correctness_check.sh — subagent dispatch 正当性 機械強制 (Lais 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §3.9 verify-first 原則 (dispatch 後の機械検証必須)
#   - core_spec.md §5 機械強制 hook 仕様 (subagent_mission_validator.sh)
#   - PO 直命 (2026-05-04): 「機械強制 しない 理由 が ない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-P2-MECHANICAL-ENFORCEMENT-DEPLOY-V1 (P2-8 配備)
#
# 動作 (dev-system pre-commit hook 経由 / Stop hook 経由):
#   1. 直近 commit msg / staged で SUBAGENT-XXX-XXX dispatch keyword 検出
#   2. dispatch 痕跡 ≥ 1 件 ある場合、 verify-first 痕跡 (= grep / log / Async agent launched 件数 一致 / wc -l) を verify
#   3. dispatch ≥ 1 + verify-first 痕跡 0 件 → §3.9 verify-first 違反 = BLOCK
#   4. dispatch mission ID format check (= SUBAGENT-DEVSYS-... or SUBAGENT-... pattern)
#   5. 1 件でも 違反 → exit 1
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#         SKIP_X / DISABLED_BYPASS / DRIFT_REPORT_ONLY 不採用 (= 違反 #53 再生産 禁止)
#
# 連動 (settings.json + pre-commit hook):
#   - settings.json: pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step u8 に結線)
#   - core_spec.md §3.9 / §5 mechanical_enforcement row
#   - templates/scripts/subagent_dispatch_correctness_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

echo "================================================================"
echo "  §3.9 + §5 subagent dispatch 正当性 check (Lais 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

# Step 1: subagent dispatch keyword pattern
DISPATCH_PATTERN='SUBAGENT-[A-Z0-9-]+|Async agent launched successfully|dispatch.*subagent|Task tool dispatch'
# verify-first keyword pattern
VERIFY_PATTERN='verify|VERIFY|verified|grep |wc -l|test -f|ci_status_check|Async agent launched.*件数'

DISPATCH_COUNT=0
VERIFY_COUNT=0
VIOLATION_COUNT=0
VIOLATION_DETAIL=""

# Step 2: 直近 commit msg 検査
HAS_GIT=0
if command -v git >/dev/null 2>&1 && [ -d "${REPO_ROOT}/.git" ]; then
  HAS_GIT=1
  LAST_MSG=$(cd "$REPO_ROOT" && git log -1 --pretty=%B 2>/dev/null || true)
  if [ -n "$LAST_MSG" ]; then
    DISPATCH_COUNT=$(echo "$LAST_MSG" | grep -cE "$DISPATCH_PATTERN" || echo 0)
    DISPATCH_COUNT=$(echo "$DISPATCH_COUNT" | tr -d '[:space:]')
    VERIFY_COUNT=$(echo "$LAST_MSG" | grep -cE "$VERIFY_PATTERN" || echo 0)
    VERIFY_COUNT=$(echo "$VERIFY_COUNT" | tr -d '[:space:]')
  fi

  # staged file 内 でも dispatch 痕跡 を 集計 (instructions/subagent_status.md など)
  STAGED_INSTRUCTIONS=$(cd "$REPO_ROOT" && git diff --cached --name-only --diff-filter=ACM 2>/dev/null | grep -E '^instructions/(subagent_status|session_progress)\.md$' || true)
  for f in $STAGED_INSTRUCTIONS; do
    [ -f "${REPO_ROOT}/$f" ] || continue
    SHITS=$(grep -cE "$DISPATCH_PATTERN" "${REPO_ROOT}/$f" 2>/dev/null || echo 0)
    SHITS=$(echo "$SHITS" | tr -d '[:space:]')
    DISPATCH_COUNT=$((DISPATCH_COUNT + SHITS))
    VHITS=$(grep -cE "$VERIFY_PATTERN" "${REPO_ROOT}/$f" 2>/dev/null || echo 0)
    VHITS=$(echo "$VHITS" | tr -d '[:space:]')
    VERIFY_COUNT=$((VERIFY_COUNT + VHITS))
  done
fi

# 判定: dispatch ≥ 1 + verify 0 = §3.9 違反
if [ "$DISPATCH_COUNT" -ge 1 ] && [ "$VERIFY_COUNT" -eq 0 ]; then
  VIOLATION_COUNT=1
  VIOLATION_DETAIL="${VIOLATION_DETAIL}  - dispatch 痕跡 ${DISPATCH_COUNT} 件 + verify-first 痕跡 0 件 (= §3.9 verify-first 違反)\n"
fi

# Step 3: subagent_mission_validator.sh 配備 verify
if [ ! -x "${REPO_ROOT}/scripts/subagent_mission_validator.sh" ]; then
  VIOLATION_COUNT=$((VIOLATION_COUNT + 1))
  VIOLATION_DETAIL="${VIOLATION_DETAIL}  - scripts/subagent_mission_validator.sh 不在 (= §5 配備不備)\n"
fi

echo ""
echo "dispatch 痕跡: $DISPATCH_COUNT"
echo "verify-first 痕跡: $VERIFY_COUNT"
echo "§3.9 + §5 違反 候補: $VIOLATION_COUNT"

if [ "$VIOLATION_COUNT" -ge 1 ]; then
  echo ""
  echo "🛑 subagent dispatch 正当性 違反検出:"
  printf "%b" "$VIOLATION_DETAIL"
  echo ""
  echo "対処 (= §3.9 + §5 履行):"
  echo "  1. dispatch 後 verify-first 必須 (= grep / wc -l / Async agent launched 件数 一致)"
  echo "  2. mission ID format = SUBAGENT-DEVSYS-XXX-XXX 厳守"
  echo "  3. scripts/subagent_mission_validator.sh 通過 後 dispatch"
  echo "  4. dispatch 後 commit msg に verify 痕跡 (= grep ログ / wc -l 出力) 含める"
  echo ""
  if [ "${SUBAGENT_DISPATCH_CORRECTNESS_STRICT:-0}" = "1" ]; then
    echo "BLOCK: SUBAGENT_DISPATCH_CORRECTNESS_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 SUBAGENT_DISPATCH_CORRECTNESS_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: subagent dispatch 正当性 健全 (dispatch=$DISPATCH_COUNT, verify=$VERIFY_COUNT)"
exit 0
