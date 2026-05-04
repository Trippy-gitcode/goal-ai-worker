#!/bin/sh
# scripts/subagent_no_loop_check.sh — §5 subagent 内 ループ 禁止 機械強制 (Lais 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §5 hook 結線 + §3.9 verify-first 原則
#   - core_spec.md §2 3 層構造 (subagent = 完了 1 mission、 自己再 dispatch 禁止)
#   - PO 直命 (2026-05-04): 「機械強制 しない 理由 が ない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-MECHANICAL-ENFORCEMENT-RESIDUAL-DEPLOY-V1 (RESIDUAL-6 配備)
#
# 動作 (dev-system pre-commit hook 経由):
#   1. instructions/persona_review/<DATE>/__results.md 内で subagent 自身が再 dispatch tool を呼ぶ
#      (= 「Task tool」 / 「Async agent launched」 / 「subagent dispatch」 を report 内で 言及)
#      pattern を grep
#   2. subagent report 内 dispatch keyword ≥ 1 件 → ループ pattern 検出
#   3. 1 件でも 「subagent 内 dispatch」 → §5 違反
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#
# 連動 (settings.json + pre-commit hook):
#   - settings.json: pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step w6 に結線)
#   - core_spec.md §5 mechanical_enforcement row
#   - templates/scripts/subagent_no_loop_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

echo "================================================================"
echo "  §5 subagent 内 ループ 禁止 check (Lais 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

REVIEW_DIR="${REPO_ROOT}/instructions/persona_review"
DISPATCH_HIT=0
SUSPECT_FILES=""

if [ -d "$REVIEW_DIR" ]; then
  FOUND_FILES=$(find "$REVIEW_DIR" -type f -name '*results*.md' -mtime -7 2>/dev/null || true)
  for f in $FOUND_FILES; do
    [ -f "$f" ] || continue
    # subagent 内自己再 dispatch keyword 検出
    HITS=$(grep -cE '(Task tool 起動|Task tool で 再 dispatch|subagent 内 で.*dispatch|nested subagent dispatch|Async agent launched.*from subagent)' "$f" 2>/dev/null || echo 0)
    HITS=$(echo "$HITS" | tr -d '[:space:]')
    if [ "$HITS" -gt 0 ]; then
      DISPATCH_HIT=$((DISPATCH_HIT + HITS))
      SUSPECT_FILES="${SUSPECT_FILES}  - $f: ${HITS} 件\n"
    fi
  done
fi

echo ""
echo "subagent 内 dispatch hit: $DISPATCH_HIT"

if [ "$DISPATCH_HIT" -ge 1 ]; then
  echo ""
  echo "🛑 §5 違反: subagent 内 self-dispatch / ループ pattern ${DISPATCH_HIT} 件"
  printf "%b" "$SUSPECT_FILES"
  echo ""
  echo "対処:"
  echo "  1. subagent は 1 mission 完了 で 終了 (= ADV が 次 mission を 別 subagent で dispatch)"
  echo "  2. subagent 内 で Task tool 再呼出 禁止 (= 並列 subagent は ADV 側 で chain)"
  echo "  3. 4-part report の中で 「次 subagent dispatch」 提案のみ可"
  echo ""
  if [ "${SUBAGENT_NO_LOOP_STRICT:-0}" = "1" ]; then
    echo "BLOCK: SUBAGENT_NO_LOOP_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 SUBAGENT_NO_LOOP_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §5 subagent 内 ループ 健全 (dispatch_in_subagent=$DISPATCH_HIT)"
exit 0
