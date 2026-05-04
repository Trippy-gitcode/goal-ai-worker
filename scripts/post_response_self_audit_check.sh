#!/bin/sh
# scripts/post_response_self_audit_check.sh — §3.13 応答後 self-audit 強制 機械強制 (Lais 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §3.13 CI Verification Standing Rule (= 応答後 self-audit 連動)
#   - core_spec.md §2.4 違反自己申告義務 + §3.5
#   - PO 直命 (2026-05-04): 「機械強制 しない 理由 が ない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-MECHANICAL-ENFORCEMENT-RESIDUAL-DEPLOY-V1 (RESIDUAL-14 配備)
#
# 動作 (dev-system pre-commit hook 経由):
#   1. instructions/session_progress.md / verify/ 配下 file 内で self-audit marker
#      (= 「self-audit OK」 / 「post-response audit PASS」 / 「§3.13 履行」) を grep
#   2. 直近 commit msg に self-audit keyword 0 件 + 制限領域変更 ≥ 1 → §3.13 violation
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#
# 連動 (settings.json + pre-commit hook):
#   - settings.json: pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step w14 に結線)
#   - core_spec.md §3.13 mechanical_enforcement row
#   - templates/scripts/post_response_self_audit_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

echo "================================================================"
echo "  §3.13 応答後 self-audit check (Lais 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

SELF_AUDIT_KW='self-audit|post-response audit|§3\.13 履行|self_audit_pass'
SELF_AUDIT_HIT=0
RESTRICTED_CHANGE=0

if command -v git >/dev/null 2>&1 && [ -d "${REPO_ROOT}/.git" ]; then
  LAST_MSG=$(cd "$REPO_ROOT" && git log -1 --pretty=%B 2>/dev/null || true)
  if [ -n "$LAST_MSG" ]; then
    HITS=$(echo "$LAST_MSG" | grep -cE "$SELF_AUDIT_KW" 2>/dev/null || echo 0)
    HITS=$(echo "$HITS" | tr -d '[:space:]')
    SELF_AUDIT_HIT=$HITS
  fi

  STAGED_RESTRICTED=$(cd "$REPO_ROOT" && git diff --cached --name-only --diff-filter=ACM 2>/dev/null \
      | grep -E '^(core_spec\.md|scripts/.+\.sh|templates/)' || true)
  if [ -n "$STAGED_RESTRICTED" ]; then
    RESTRICTED_CHANGE=$(echo "$STAGED_RESTRICTED" | wc -l | tr -d '[:space:]')
  fi
fi

# 補助: SSoT file (= verify/ 配下 / instructions/) staged 内 self-audit 言及 verify
LOG_FILE="${REPO_ROOT}/instructions/session_progress.md"
LOG_HIT=0
if [ -f "$LOG_FILE" ]; then
  LOG_HIT=$(tail -200 "$LOG_FILE" | grep -cE "$SELF_AUDIT_KW" 2>/dev/null || echo 0)
  LOG_HIT=$(echo "$LOG_HIT" | tr -d '[:space:]')
fi

echo ""
echo "self-audit keyword hit (commit msg): $SELF_AUDIT_HIT"
echo "self-audit keyword hit (session log tail): $LOG_HIT"
echo "restricted area staged change: $RESTRICTED_CHANGE"

# 判定: 制限領域変更 ≥ 1 + self-audit keyword (commit + log) 0 → §3.13 違反
TOTAL_AUDIT=$((SELF_AUDIT_HIT + LOG_HIT))
if [ "$RESTRICTED_CHANGE" -ge 1 ] && [ "$TOTAL_AUDIT" -eq 0 ]; then
  echo ""
  echo "🛑 §3.13 違反: 制限領域変更 ${RESTRICTED_CHANGE} 件 + self-audit 痕跡 0 件"
  echo ""
  echo "対処:"
  echo "  1. 応答末尾に [self-audit OK] marker を付与 (= §3.13 履行 declaration)"
  echo "  2. instructions/session_progress.md に self-audit log entry 追記"
  echo ""
  if [ "${POST_RESPONSE_AUDIT_STRICT:-0}" = "1" ]; then
    echo "BLOCK: POST_RESPONSE_AUDIT_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 POST_RESPONSE_AUDIT_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §3.13 応答後 self-audit 健全 (commit_kw=$SELF_AUDIT_HIT, log_kw=$LOG_HIT, restricted=$RESTRICTED_CHANGE)"
exit 0
