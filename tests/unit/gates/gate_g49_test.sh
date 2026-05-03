#!/bin/sh
# tests/unit/gates/gate_g49_test.sh — G49 言行一致 gate 自動テスト
#
# 根拠 (TKT-G53 / 違反 #44 + #52 同型 防止):
#   - P1 SRE + P3 Behavioral consensus: gate 自己 unit test 不在
#   - 違反 #44 / #52 「forward-action 宣言だけして tool_use なしで turn 終了」 構造再発防止
#
# 3 シナリオ (G49 v2 仕様 cover):
#   1. NORMAL_PASS: forward-action keyword 0 → exit 0 (PASS, 静的報告)
#   2. BLOCK_FORWARD_NO_TOOL: 続行宣言 あり + 真 fix tool 0 → exit 2 (BLOCK)
#   3. PASS_WITH_FIX_TOOL: 続行宣言 あり + 真 fix tool 1+ → exit 0 (PASS)

set -u

GATE_SCRIPT="/Users/futoshi/Desktop/goal-ai-worker/scripts/adv_word_action_consistency_check.sh"
TMP_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t 'g49test')
trap "rm -rf '$TMP_DIR'" EXIT

PASS_COUNT=0
FAIL_COUNT=0
RESULTS=""

run_scenario() {
  local SCENARIO_NAME="$1"
  local TRANSCRIPT_FILE="$2"
  local LAST_RESP="$3"
  local EXPECTED_EXIT="$4"

  local INPUT_JSON
  INPUT_JSON=$(python3 -c "
import json
print(json.dumps({
    'transcript_path': '$TRANSCRIPT_FILE',
    'last_assistant_message': '''$LAST_RESP'''
}))
")

  printf '%s' "$INPUT_JSON" | sh "$GATE_SCRIPT" >/dev/null 2>&1
  local ACTUAL_EXIT=$?

  if [ "$ACTUAL_EXIT" -eq "$EXPECTED_EXIT" ]; then
    PASS_COUNT=$((PASS_COUNT + 1))
    RESULTS="${RESULTS}\n  [PASS] $SCENARIO_NAME (expected=$EXPECTED_EXIT, actual=$ACTUAL_EXIT)"
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
    RESULTS="${RESULTS}\n  [FAIL] $SCENARIO_NAME (expected=$EXPECTED_EXIT, actual=$ACTUAL_EXIT)"
  fi
}

# transcript fixture (user message only, no fix tools)
mk_transcript_no_fix_tool() {
  local FILE="$1"
  cat > "$FILE" <<'EOF'
{"type":"user","isSidechain":false,"message":{"role":"user","content":"test"}}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","name":"Bash","input":{"command":"ls -la"}}]}}
EOF
}

# transcript with Edit tool (= fix tool)
mk_transcript_with_fix_tool() {
  local FILE="$1"
  cat > "$FILE" <<'EOF'
{"type":"user","isSidechain":false,"message":{"role":"user","content":"test"}}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","name":"Edit","input":{"file_path":"/tmp/foo","old_string":"a","new_string":"b"}}]}}
EOF
}

# === シナリオ 1: NORMAL_PASS (静的報告のみ) ===
TRANS1="$TMP_DIR/scenario1.jsonl"
mk_transcript_no_fix_tool "$TRANS1"
RESP1="本 mission COMPLETED。 結果は report 参照。"
run_scenario "1.NORMAL_PASS (静的報告)" "$TRANS1" "$RESP1" 0

# === シナリオ 2: BLOCK_FORWARD_NO_TOOL (続行宣言 + tool 0) ===
TRANS2="$TMP_DIR/scenario2.jsonl"
mk_transcript_no_fix_tool "$TRANS2"
RESP2="続行します。 次は subagent dispatch 順次 着手 します。"
run_scenario "2.BLOCK_FORWARD_NO_TOOL" "$TRANS2" "$RESP2" 2

# === シナリオ 3: PASS_WITH_FIX_TOOL (続行宣言 + Edit tool) ===
TRANS3="$TMP_DIR/scenario3.jsonl"
mk_transcript_with_fix_tool "$TRANS3"
RESP3="続行します。 即実行 した。 fix 完了。"
run_scenario "3.PASS_WITH_FIX_TOOL" "$TRANS3" "$RESP3" 0

# === 結果 ===
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  G49 言行一致 gate test (3 シナリオ)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
printf "%b\n" "$RESULTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  PASS: $PASS_COUNT / 3   FAIL: $FAIL_COUNT / 3"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi
exit 0
