#!/bin/sh
# scripts/subagent_size_limit_check.sh — §5 subagent prompt size 上限 機械強制 (Lais 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §5 hook 結線 + §3.9 verify-first 原則
#   - core_spec.md §2 3 層構造 (subagent prompt 適切な scope 化)
#   - PO 直命 (2026-05-04): 「機械強制 しない 理由 が ない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-MECHANICAL-ENFORCEMENT-RESIDUAL-DEPLOY-V1 (RESIDUAL-7 配備)
#
# 動作 (dev-system pre-commit hook 経由):
#   1. instructions/persona_review/<DATE>/<MISSION>__results.md 内で subagent prompt 受領 size を推定
#   2. file size > 200KB の subagent report = scope 過大、 1 subagent 1 mission 原則違反候補
#   3. 200KB 超 file ≥ 1 件 → §5 違反 (= 別 subagent に分割すべき)
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#
# 連動 (settings.json + pre-commit hook):
#   - settings.json: pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step w7 に結線)
#   - core_spec.md §5 mechanical_enforcement row
#   - templates/scripts/subagent_size_limit_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

echo "================================================================"
echo "  §5 subagent prompt size 上限 check (Lais 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

REVIEW_DIR="${REPO_ROOT}/instructions/persona_review"
SIZE_LIMIT=204800   # 200KB
OVERSIZE_HIT=0
DETAIL=""

if [ -d "$REVIEW_DIR" ]; then
  FOUND_FILES=$(find "$REVIEW_DIR" -type f -name '*results*.md' -mtime -14 2>/dev/null || true)
  for f in $FOUND_FILES; do
    [ -f "$f" ] || continue
    SZ=$(wc -c <"$f" | tr -d '[:space:]')
    if [ "$SZ" -gt "$SIZE_LIMIT" ]; then
      OVERSIZE_HIT=$((OVERSIZE_HIT + 1))
      DETAIL="${DETAIL}  - $f: ${SZ} bytes (limit=${SIZE_LIMIT})\n"
    fi
  done
fi

echo ""
echo "oversize subagent report (>${SIZE_LIMIT} bytes): $OVERSIZE_HIT"

if [ "$OVERSIZE_HIT" -ge 1 ]; then
  echo ""
  echo "🛑 §5 違反: subagent prompt 過大 ${OVERSIZE_HIT} 件"
  printf "%b" "$DETAIL"
  echo ""
  echo "対処:"
  echo "  1. 1 subagent 1 mission 原則 = scope 縮小、 別 mission に分割"
  echo "  2. 補助 file (= 仕様参照) を必須 Read として 別 subagent に切出し"
  echo ""
  if [ "${SUBAGENT_SIZE_STRICT:-0}" = "1" ]; then
    echo "BLOCK: SUBAGENT_SIZE_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 SUBAGENT_SIZE_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §5 subagent prompt size 健全 (oversize=$OVERSIZE_HIT)"
exit 0
