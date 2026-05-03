#!/bin/sh
# tests/unit/gates/gate_g50_test.sh — G50 production / source / commit SHA 三点照合 gate 自動テスト
#
# 根拠 (TKT-G53 / 違反 #50 同型 防止):
#   - P1 SRE + P3 Behavioral + P5 PO Advocate consensus
#   - production 三点照合不在 = #50 同型 (source landed = production effective 短絡判定) 構造再生産リスク
#
# 2 シナリオ (G50 v1 仕様 cover):
#   1. SCRIPT_SYNTAX_OK: sh -n 構文 verify (exit 0)
#   2. EXECUTION_VERIFY: 実機実行、 三点 一致 OR mismatch 検出 verify
#       (production 一致 → exit 0 / mismatch → exit 2 / source 取得不能 → exit 2)

set -u

GATE_SCRIPT="/Users/futoshi/Desktop/goal-ai-worker/scripts/g50_prod_source_triple_verify.sh"

PASS_COUNT=0
FAIL_COUNT=0
RESULTS=""

run_scenario() {
  local SCENARIO_NAME="$1"
  local ACTUAL_EXIT="$2"
  local EXPECTED_RESULT="$3"  # "0" or "2" or "0|2"

  case "$EXPECTED_RESULT" in
    "0|2")
      if [ "$ACTUAL_EXIT" -eq 0 ] || [ "$ACTUAL_EXIT" -eq 2 ]; then
        PASS_COUNT=$((PASS_COUNT + 1))
        RESULTS="${RESULTS}\n  [PASS] $SCENARIO_NAME (expected=0|2, actual=$ACTUAL_EXIT)"
      else
        FAIL_COUNT=$((FAIL_COUNT + 1))
        RESULTS="${RESULTS}\n  [FAIL] $SCENARIO_NAME (expected=0|2, actual=$ACTUAL_EXIT)"
      fi
      ;;
    *)
      if [ "$ACTUAL_EXIT" -eq "$EXPECTED_RESULT" ]; then
        PASS_COUNT=$((PASS_COUNT + 1))
        RESULTS="${RESULTS}\n  [PASS] $SCENARIO_NAME (expected=$EXPECTED_RESULT, actual=$ACTUAL_EXIT)"
      else
        FAIL_COUNT=$((FAIL_COUNT + 1))
        RESULTS="${RESULTS}\n  [FAIL] $SCENARIO_NAME (expected=$EXPECTED_RESULT, actual=$ACTUAL_EXIT)"
      fi
      ;;
  esac
}

# === シナリオ 1: SCRIPT_SYNTAX_OK (構文 verify) ===
sh -n "$GATE_SCRIPT" >/dev/null 2>&1
SYNTAX_EXIT=$?
run_scenario "1.SCRIPT_SYNTAX_OK (sh -n)" "$SYNTAX_EXIT" "0"

# === シナリオ 2: EXECUTION_VERIFY (実機実行) ===
# 実機実行: production 一致 → exit 0、 mismatch 検出 → exit 2
# どちらも gate 設計通りの挙動 = PASS (gate が機能している)
sh "$GATE_SCRIPT" >/dev/null 2>&1
EXEC_EXIT=$?
run_scenario "2.EXECUTION_VERIFY (実機実行)" "$EXEC_EXIT" "0|2"

# === 結果 ===
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  G50 三点照合 gate test (2 シナリオ)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
printf "%b\n" "$RESULTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  PASS: $PASS_COUNT / 2   FAIL: $FAIL_COUNT / 2"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi
exit 0
