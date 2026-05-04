#!/bin/sh
# scripts/g13_post_commit_check.sh — §3.13 G13 post-commit canopy 強制 機械強制 (Lais 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §3.13 CI Verification Standing Rule (push 後 CI 結果機械確認義務)
#   - core_spec.md §2.25.5 PO-directive auto-codify (G13/G17 連動)
#   - PO 直命 (2026-05-04): 「機械強制 しない 理由 が ない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-MECHANICAL-ENFORCEMENT-RESIDUAL-DEPLOY-V1 (RESIDUAL-13 配備)
#
# 動作 (dev-system pre-commit hook 経由):
#   1. .git/hooks/post-commit が 存在 + 実行可能 か verify
#   2. post-commit hook 内に CI check / canopy 起動 keyword (= ci_status_check.sh / gh run list)
#      が含まれるか check
#   3. post-commit 不在 / canopy keyword 0 件 → §3.13 違反
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#
# 連動 (settings.json + pre-commit hook):
#   - settings.json: pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step w13 に結線)
#   - core_spec.md §3.13 mechanical_enforcement row
#   - templates/scripts/g13_post_commit_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

echo "================================================================"
echo "  §3.13 G13 post-commit canopy check (Lais 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

POST_COMMIT_HOOK="${REPO_ROOT}/.git/hooks/post-commit"
CANOPY_KW='ci_status_check\.sh|gh run list|gh run watch|workflow run|ci_status'

POST_COMMIT_OK=0
CANOPY_KW_HIT=0

if [ -x "$POST_COMMIT_HOOK" ]; then
  POST_COMMIT_OK=1
  CANOPY_KW_HIT=$(grep -cE "$CANOPY_KW" "$POST_COMMIT_HOOK" 2>/dev/null || echo 0)
  CANOPY_KW_HIT=$(echo "$CANOPY_KW_HIT" | tr -d '[:space:]')
fi

echo ""
echo "post-commit hook executable: $POST_COMMIT_OK"
echo "canopy keyword hit: $CANOPY_KW_HIT"

# 判定: post-commit 不在 OR canopy keyword 0 → §3.13 違反
if [ "$POST_COMMIT_OK" -eq 0 ] || [ "$CANOPY_KW_HIT" -eq 0 ]; then
  echo ""
  echo "🛑 §3.13 違反: post-commit hook 不備 (executable=${POST_COMMIT_OK}, canopy_kw=${CANOPY_KW_HIT})"
  echo ""
  echo "対処:"
  echo "  1. .git/hooks/post-commit を作成 + chmod +x"
  echo "  2. post-commit 内で sh scripts/ci_status_check.sh を起動"
  echo "  3. push 後 CI 結果 機械確認 義務 (G13 canopy)"
  echo ""
  if [ "${G13_POST_COMMIT_STRICT:-0}" = "1" ]; then
    echo "BLOCK: G13_POST_COMMIT_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 G13_POST_COMMIT_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §3.13 G13 post-commit canopy 健全 (executable=$POST_COMMIT_OK, canopy_kw=$CANOPY_KW_HIT)"
exit 0
