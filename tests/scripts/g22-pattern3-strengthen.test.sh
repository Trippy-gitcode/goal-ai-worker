#!/bin/sh
# tests/scripts/g22-pattern3-strengthen.test.sh — 違反 #34 fix 動作テスト
set -e
cd "$(dirname "$0")/../.."

PASS_COUNT=0
FAIL_COUNT=0

# Test 1: 「三択 から PO 判断」 で exit 1 (違反 #34 解消確認)
if echo "三択 から PO 判断 願います" | sh scripts/adv_response_po_escalation_grep.sh >/dev/null 2>&1; then
  echo "❌ Test 1 FAIL: 「三択 から PO 判断」 が exit 0、 違反 #34 未解消"
  FAIL_COUNT=$((FAIL_COUNT + 1))
else
  echo "✅ Test 1 PASS: 「三択 から PO 判断」 → exit 1 (違反 #34 解消)"
  PASS_COUNT=$((PASS_COUNT + 1))
fi

# Test 2: 「PO 判断 ください」 単体 で exit 1
if echo "PO 判断 ください" | sh scripts/adv_response_po_escalation_grep.sh >/dev/null 2>&1; then
  echo "❌ Test 2 FAIL: 「PO 判断」 単体 が exit 0"
  FAIL_COUNT=$((FAIL_COUNT + 1))
else
  echo "✅ Test 2 PASS: 「PO 判断」 単体 → exit 1"
  PASS_COUNT=$((PASS_COUNT + 1))
fi

# Test 3: cost keyword 併記なら exit 0 (legitimate escalation)
if echo "PO 判断 cost 月額 \$4 必要" | sh scripts/adv_response_po_escalation_grep.sh >/dev/null 2>&1; then
  echo "✅ Test 3 PASS: cost keyword 併記 → exit 0 (legitimate)"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "❌ Test 3 FAIL: cost keyword 併記でも exit 1"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Test 4: 普通の fix report で exit 0
if echo "fix を続けます、 commit + push 完了" | sh scripts/adv_response_po_escalation_grep.sh >/dev/null 2>&1; then
  echo "✅ Test 4 PASS: 普通 fix report → exit 0"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "❌ Test 4 FAIL: 普通 fix report で 不正 exit 1"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

echo ""
echo "Total: $PASS_COUNT pass / $FAIL_COUNT fail"
[ "$FAIL_COUNT" -eq 0 ]
