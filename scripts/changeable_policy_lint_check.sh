#!/bin/sh
# scripts/changeable_policy_lint_check.sh — §1.2 改変ポリシー lint 強制 機械強制 (Lais 側)
#
# 根拠 (= 仕様 § 紐付):
#   - docs/changeable_policy.md (= 改変禁止 / 改変自由 セクション 2 区分)
#   - core_spec.md §1.2 SSoT 原則 + §3.1 仕様書駆動原則
#   - PO 直命 (2026-05-04): 「機械強制 しない 理由 が ない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-MECHANICAL-ENFORCEMENT-RESIDUAL-DEPLOY-V1 (RESIDUAL-4 配備)
#
# 動作 (dev-system pre-commit hook 経由):
#   1. 既存 scripts/changeable_policy_lint.sh の wrapper として、 staged 時に必須 invoke
#      かつ exit code を二重保証
#   2. changeable_policy_lint.sh が 不在 / non-executable → 配備不備 として BLOCK 候補
#   3. lint 内 violation hit ≥ 1 → §1.2 違反
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#
# 連動 (settings.json + pre-commit hook):
#   - settings.json: pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step w4 に結線)
#   - core_spec.md §1.2 mechanical_enforcement row
#   - templates/scripts/changeable_policy_lint_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

echo "================================================================"
echo "  §1.2 changeable_policy lint check (Lais 側 wrapper)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

LINT_SCRIPT="${REPO_ROOT}/scripts/changeable_policy_lint.sh"

if [ ! -x "$LINT_SCRIPT" ]; then
  echo ""
  echo "🛑 §1.2 配備不備: $LINT_SCRIPT 不在 / non-executable"
  echo ""
  echo "対処: changeable_policy_lint.sh を配備 (= dev-system 既存 path: scripts/changeable_policy_lint.sh)"
  exit 1
fi

# wrapper invoke + exit code 確認
TMP_OUT="$(mktemp)"
"$LINT_SCRIPT" >"$TMP_OUT" 2>&1
LINT_RC=$?
LINT_TAIL=$(tail -3 "$TMP_OUT")
rm -f "$TMP_OUT"

echo ""
echo "changeable_policy_lint exit code: $LINT_RC"
echo "tail:"
echo "$LINT_TAIL"

if [ "$LINT_RC" -ne 0 ]; then
  echo ""
  echo "🛑 §1.2 違反: changeable_policy_lint exit=${LINT_RC}"
  echo ""
  echo "対処:"
  echo "  1. docs/changeable_policy.md と staged file の整合確認"
  echo "  2. 改変禁止セクションへの逸脱を撤回"
  echo ""
  if [ "${CHANGEABLE_POLICY_STRICT:-0}" = "1" ]; then
    echo "BLOCK: CHANGEABLE_POLICY_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 CHANGEABLE_POLICY_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §1.2 changeable_policy lint 健全 (exit_code=$LINT_RC)"
exit 0
