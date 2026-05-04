#!/bin/sh
# scripts/subagent_completion_format_check.sh — §7.2/§7.3 完了報告 format 強制 機械強制 (Lais 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §7.2 FAIL 条件の明記必須
#   - core_spec.md §7.3 cmd-unit / cmd-e2e / cmd-realworld 3 区分 必須
#   - PO 直命 (2026-05-04): 「機械強制 しない 理由 が ない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-MECHANICAL-ENFORCEMENT-RESIDUAL-DEPLOY-V1 (RESIDUAL-8 配備)
#
# 動作 (dev-system pre-commit hook 経由):
#   1. instructions/persona_review/<DATE>/<MISSION>__results.md 内で
#      cmd-unit / cmd-e2e / cmd-realworld 3 keyword 全 hit を verify
#   2. 4-part 構造 (= what / root cause / 即時 fix / 構造的 future fix) 不在 file は 不備
#   3. 1 keyword でも欠落 → §7.2/§7.3 違反
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#
# 連動 (settings.json + pre-commit hook):
#   - settings.json: pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step w8 に結線)
#   - core_spec.md §7.2/§7.3 mechanical_enforcement row
#   - templates/scripts/subagent_completion_format_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

echo "================================================================"
echo "  §7.2/§7.3 subagent completion format check (Lais 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

REVIEW_DIR="${REPO_ROOT}/instructions/persona_review"
INCOMPLETE_HIT=0
DETAIL=""

if [ -d "$REVIEW_DIR" ]; then
  FOUND_FILES=$(find "$REVIEW_DIR" -type f -name '*results*.md' -mtime -7 2>/dev/null || true)
  for f in $FOUND_FILES; do
    [ -f "$f" ] || continue
    CU=$(grep -cE 'cmd-unit' "$f" 2>/dev/null || echo 0)
    CU=$(echo "$CU" | tr -d '[:space:]')
    CE=$(grep -cE 'cmd-e2e' "$f" 2>/dev/null || echo 0)
    CE=$(echo "$CE" | tr -d '[:space:]')
    CR=$(grep -cE 'cmd-realworld' "$f" 2>/dev/null || echo 0)
    CR=$(echo "$CR" | tr -d '[:space:]')
    if [ "$CU" -eq 0 ] || [ "$CE" -eq 0 ] || [ "$CR" -eq 0 ]; then
      INCOMPLETE_HIT=$((INCOMPLETE_HIT + 1))
      DETAIL="${DETAIL}  - $f: cmd-unit=${CU} cmd-e2e=${CE} cmd-realworld=${CR}\n"
    fi
  done
fi

echo ""
echo "完了 format 不備 file count: $INCOMPLETE_HIT"

if [ "$INCOMPLETE_HIT" -ge 1 ]; then
  echo ""
  echo "🛑 §7.2/§7.3 違反: 3 keyword 不備 file ${INCOMPLETE_HIT} 件"
  printf "%b" "$DETAIL"
  echo ""
  echo "対処:"
  echo "  1. 4-part 構造 (cmd-unit / cmd-e2e / cmd-realworld + FAIL 条件) を report に明記"
  echo "  2. core_spec.md §7.2 FAIL 条件 / §7.3 3 区分 必須 履行"
  echo ""
  if [ "${COMPLETION_FORMAT_STRICT:-0}" = "1" ]; then
    echo "BLOCK: COMPLETION_FORMAT_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 COMPLETION_FORMAT_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §7.2/§7.3 完了 format 健全 (不備=$INCOMPLETE_HIT)"
exit 0
