#!/bin/sh
# scripts/review_framework_v1_check.sh — §13.7 旧 review framework 互換 機械強制 (Lais 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §13.7 Nightly Review v3 (diff-focused 5-persona LLM review)
#   - core_spec.md §11.7 ペルソナ定義詳細 + §11.2 必須 3 ペルソナ
#   - PO 直命 (2026-05-04): 「機械強制 しない 理由 が ない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-MECHANICAL-ENFORCEMENT-RESIDUAL-DEPLOY-V1 (RESIDUAL-3 配備)
#
# 動作 (dev-system pre-commit hook 経由):
#   1. instructions/persona_review/<DATE>/ 配下 file 内で v1 framework keyword (= 「ペルソナ評価 v1」 / 「review_framework: v1」)
#      を grep
#   2. v1 framework hit ≥ 1 + v3 framework keyword 0 件 → 旧版 framework drift 検出
#   3. 1 件でも 「v1 のみ + v3 不在」 → §13.7 違反
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#
# 連動 (settings.json + pre-commit hook):
#   - settings.json: pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step w3 に結線)
#   - core_spec.md §13.7 mechanical_enforcement row
#   - templates/scripts/review_framework_v1_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

echo "================================================================"
echo "  §13.7 review framework v1 → v3 互換 check (Lais 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

REVIEW_DIR="${REPO_ROOT}/instructions/persona_review"
V1_HIT=0
V3_HIT=0

if [ -d "$REVIEW_DIR" ]; then
  # 直近 14 日 の review file のみ scan
  FOUND_FILES=$(find "$REVIEW_DIR" -type f -name '*.md' -mtime -14 2>/dev/null || true)
  for f in $FOUND_FILES; do
    [ -f "$f" ] || continue
    V1=$(grep -cE 'review_framework[[:space:]]*:[[:space:]]*v1|ペルソナ評価[[:space:]]*v1' "$f" 2>/dev/null || echo 0)
    V1=$(echo "$V1" | tr -d '[:space:]')
    V1_HIT=$((V1_HIT + V1))
    V3=$(grep -cE 'review_framework[[:space:]]*:[[:space:]]*v3|Nightly Review v3|5-persona LLM review' "$f" 2>/dev/null || echo 0)
    V3=$(echo "$V3" | tr -d '[:space:]')
    V3_HIT=$((V3_HIT + V3))
  done
fi

echo ""
echo "review framework v1 hit: $V1_HIT"
echo "review framework v3 hit: $V3_HIT"

# 判定: v1 hit ≥ 1 + v3 hit 0 → §13.7 violation
if [ "$V1_HIT" -ge 1 ] && [ "$V3_HIT" -eq 0 ]; then
  echo ""
  echo "🛑 §13.7 違反: v1 framework ${V1_HIT} 件 + v3 keyword 0"
  echo ""
  echo "対処:"
  echo "  1. persona_review file を §13.7 v3 (5-persona LLM review) に migration"
  echo "  2. review_framework: v3 marker 必須化"
  echo ""
  if [ "${REVIEW_FRAMEWORK_STRICT:-0}" = "1" ]; then
    echo "BLOCK: REVIEW_FRAMEWORK_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 REVIEW_FRAMEWORK_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §13.7 review framework 健全 (v1=$V1_HIT, v3=$V3_HIT)"
exit 0
