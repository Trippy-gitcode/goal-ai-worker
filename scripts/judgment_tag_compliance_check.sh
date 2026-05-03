#!/bin/sh
# scripts/judgment_tag_compliance_check.sh — G28: 「[判断]」 tag compliance
# 根拠: PO 承認 (2026-05-02) mental model 制限 R4 軸補強条件 #2
set -eu
[ $# -ge 1 ] || { echo "Usage: $0 <draft_file>"; exit 2; }
DRAFT="$1"
[ -f "$DRAFT" ] || { echo "ERROR: $DRAFT not found"; exit 2; }

FAIL=0
echo "━ G28 judgment tag compliance check ━"

# Pattern A: creative / design / priority keyword あり、 [判断] tag なし → FAIL
CREATIVE_HITS=$(grep -E "優先|ベスト|推奨|美しい|直感的|エレガント|綺麗|シンプル|スマート|妥当" "$DRAFT" || true)
if [ -n "$CREATIVE_HITS" ]; then
  if ! grep -q "\[判断\]" "$DRAFT"; then
    echo "🛑 G28-A FAIL: creative/design/priority keyword あり、 「[判断]」 tag なし"
    echo "$CREATIVE_HITS" | head -3
    FAIL=$((FAIL+1))
  fi
fi

# Pattern B: 「[判断]」 tag が fact-like keyword に付与 → FAIL (scope 違反)
if grep -qE "\[判断\].*\b[0-9]+ (件|tests?|files?|lines?|commits?)" "$DRAFT" 2>/dev/null; then
  echo "🛑 G28-B FAIL: 「[判断]」 tag が fact 系 (N 件 / N tests / commit SHA) に付与"
  FAIL=$((FAIL+1))
fi

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "🛑 G28 FAIL: $FAIL violation (R4 軸 補強条件 #2 = tag scope strict)"
  exit 1
fi

echo "✅ G28 PASS: 「[判断]」 tag compliance 整合"
exit 0
