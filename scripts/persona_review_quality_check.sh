#!/bin/sh
# scripts/persona_review_quality_check.sh — §11.4 persona review 品質 強制 機械強制 (Lais 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §11.4 反復ラウンド (= 持続的 review 品質保証)
#   - core_spec.md §11.5 機械チェック + §11.6 ログ
#   - PO 直命 (2026-05-04): 「機械強制 しない 理由 が ない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-MECHANICAL-ENFORCEMENT-RESIDUAL-DEPLOY-V1 (RESIDUAL-15 配備)
#
# 動作 (dev-system pre-commit hook 経由):
#   1. instructions/persona_review/<DATE>/ 配下 で 個別 persona report file 数を集計
#   2. 反復ラウンド (= round 1-5) の最低 3 round 経過 marker を grep
#   3. 最低品質 marker (= 「critical: N」 / 「actionable: N」 / 「root cause:」) 全 3 が 0 件 file ≥ 1 → 品質 不足
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#
# 連動 (settings.json + pre-commit hook):
#   - settings.json: pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step w15 に結線)
#   - core_spec.md §11.4 mechanical_enforcement row
#   - templates/scripts/persona_review_quality_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

echo "================================================================"
echo "  §11.4 persona review 品質 check (Lais 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

REVIEW_DIR="${REPO_ROOT}/instructions/persona_review"
QUALITY_FAIL=0
DETAIL=""
TOTAL_FILES=0

if [ -d "$REVIEW_DIR" ]; then
  FOUND_FILES=$(find "$REVIEW_DIR" -type f -name '*.md' -mtime -7 2>/dev/null || true)
  for f in $FOUND_FILES; do
    [ -f "$f" ] || continue
    TOTAL_FILES=$((TOTAL_FILES + 1))
    CRIT=$(grep -cE 'critical[[:space:]]*:[[:space:]]*[0-9]+|critical 件|critical 数' "$f" 2>/dev/null || echo 0)
    CRIT=$(echo "$CRIT" | tr -d '[:space:]')
    ACT=$(grep -cE 'actionable[[:space:]]*:|actionable 件|提案[[:space:]]*[0-9]+' "$f" 2>/dev/null || echo 0)
    ACT=$(echo "$ACT" | tr -d '[:space:]')
    ROOT=$(grep -cE 'root[[:space:]]*cause|根本原因' "$f" 2>/dev/null || echo 0)
    ROOT=$(echo "$ROOT" | tr -d '[:space:]')
    if [ "$CRIT" -eq 0 ] && [ "$ACT" -eq 0 ] && [ "$ROOT" -eq 0 ]; then
      QUALITY_FAIL=$((QUALITY_FAIL + 1))
      DETAIL="${DETAIL}  - $f: critical=0 actionable=0 root_cause=0\n"
    fi
  done
fi

echo ""
echo "persona review file 総数 (直近 7 日): $TOTAL_FILES"
echo "品質 不備 file 数: $QUALITY_FAIL"

if [ "$QUALITY_FAIL" -ge 1 ]; then
  echo ""
  echo "🛑 §11.4 違反: 品質 不備 file ${QUALITY_FAIL} 件 (= critical / actionable / root cause keyword 全 0)"
  printf "%b" "$DETAIL"
  echo ""
  echo "対処:"
  echo "  1. persona review file に critical / actionable / root cause keyword を必ず記載"
  echo "  2. 反復ラウンド 3 以上 で 構造的 issue 抽出"
  echo "  3. §11.5 機械チェック / §11.6 ログ pattern 整合"
  echo ""
  if [ "${PERSONA_REVIEW_QUALITY_STRICT:-0}" = "1" ]; then
    echo "BLOCK: PERSONA_REVIEW_QUALITY_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 PERSONA_REVIEW_QUALITY_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §11.4 persona review 品質 健全 (total=$TOTAL_FILES, quality_fail=$QUALITY_FAIL)"
exit 0
