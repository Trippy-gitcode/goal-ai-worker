#!/bin/sh
# tests/unit/gates/gate_test_runner.sh — 全 gate test 順次 実行 runner
#
# 根拠 (TKT-G53 / SUBAGENT-G53-GATE-SELF-UNIT-TEST-SUITE-V2):
#   - 違反 #34 同型 (gate 設計 bug = catch すべき pattern miss) 構造再発防止
#   - 1 つでも 期待外 → exit 1 (regression 即検知)
#
# 起動:
#   sh tests/unit/gates/gate_test_runner.sh

set -u

GATE_TEST_DIR="$(cd "$(dirname "$0")" && pwd)"

OVERALL_PASS=0
OVERALL_FAIL=0
SUMMARY=""

run_test() {
  local TEST_NAME="$1"
  local TEST_SCRIPT="$2"

  echo ""
  echo "━━━ Running: $TEST_NAME ━━━"
  sh "$TEST_SCRIPT"
  local TEST_EXIT=$?

  if [ "$TEST_EXIT" -eq 0 ]; then
    OVERALL_PASS=$((OVERALL_PASS + 1))
    SUMMARY="${SUMMARY}\n  [PASS] $TEST_NAME"
  else
    OVERALL_FAIL=$((OVERALL_FAIL + 1))
    SUMMARY="${SUMMARY}\n  [FAIL] $TEST_NAME (exit=$TEST_EXIT)"
  fi
}

echo "═══════════════════════════════════════════════════"
echo "  Gate Self Unit Test Suite Runner (TKT-G53)"
echo "  違反 #34 同型 構造再発防止"
echo "═══════════════════════════════════════════════════"

run_test "G48 行動ベース ADV 自律性 gate" "$GATE_TEST_DIR/gate_g48_test.sh"
run_test "G49 言行一致 gate" "$GATE_TEST_DIR/gate_g49_test.sh"
run_test "G50 production 三点照合 gate" "$GATE_TEST_DIR/gate_g50_test.sh"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Overall Summary"
echo "═══════════════════════════════════════════════════"
printf "%b\n" "$SUMMARY"
echo "───────────────────────────────────────────────────"
echo "  PASS: $OVERALL_PASS / 3 gate test"
echo "  FAIL: $OVERALL_FAIL / 3 gate test"
echo "═══════════════════════════════════════════════════"

if [ "$OVERALL_FAIL" -gt 0 ]; then
  echo "[runner] FAIL: 1 つ以上 gate test が 期待外 = regression 検知"
  exit 1
fi

echo "[runner] PASS: 全 gate test 期待通り = regression 0"
exit 0
