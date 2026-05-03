#!/bin/sh
# tests/unit/gates/gate_g48_test.sh — G48 行動ベース ADV 自律性 gate 自動テスト
#
# 根拠 (TKT-G53 / 違反 #34 同型 防止):
#   - P1 SRE + P3 Behavioral consensus: gate 自己 unit test 不在
#   - 違反 #34 (G22 設計 bug = catch すべき pattern miss) 同型 構造再発防止
#   - 期待動作 vs 実動作 機械 verify
#
# 4 シナリオ (G48 v4 仕様 cover):
#   1. NORMAL_PASS: PO 委譲 keyword 0 → exit 0 (PASS)
#   2. C1_BLOCK: PO 委譲 keyword あり + autonomy tool 0 + rationale なし → exit 2 (BLOCK)
#   3. BYPASS_VIOLATION_LOG: PO 委譲 keyword あり + 違反 log 記録 中 → exit 0 (PASS, bypass)
#   4. RATIONALE_PASS: PO 委譲 keyword あり + ADV tried 失敗 + §4 該当根拠 → exit 0 (PASS)

set -u  # -e を外す (期待 BLOCK で早期 exit させない)

GATE_SCRIPT="/Users/futoshi/Desktop/goal-ai-worker/scripts/adv_action_based_autonomy_check.sh"
TMP_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t 'g48test')
trap "rm -rf '$TMP_DIR'" EXIT

PASS_COUNT=0
FAIL_COUNT=0
RESULTS=""

# Helper: シナリオ実行 + verify
run_scenario() {
  local SCENARIO_NAME="$1"
  local TRANSCRIPT_FILE="$2"
  local LAST_RESP="$3"
  local EXPECTED_EXIT="$4"

  # Stop hook JSON 構築
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

# transcript fixture 構築 helper
mk_transcript_with_user_only() {
  local FILE="$1"
  cat > "$FILE" <<'EOF'
{"type":"user","isSidechain":false,"message":{"role":"user","content":"test"}}
EOF
}

mk_transcript_with_autonomy_tool() {
  local FILE="$1"
  cat > "$FILE" <<'EOF'
{"type":"user","isSidechain":false,"message":{"role":"user","content":"test"}}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","name":"Bash","input":{"command":"gh secret list"}}]}}
EOF
}

# === シナリオ 1: NORMAL_PASS ===
TRANS1="$TMP_DIR/scenario1.jsonl"
mk_transcript_with_user_only "$TRANS1"
RESP1="続行します。 mission COMPLETED。 root cause analysis 提供。"
run_scenario "1.NORMAL_PASS (PO keyword 0)" "$TRANS1" "$RESP1" 0

# === シナリオ 2: C1_BLOCK (PO 委譲 + autonomy 0 + rationale なし) ===
TRANS2="$TMP_DIR/scenario2.jsonl"
mk_transcript_with_user_only "$TRANS2"
RESP2="申し訳ございません。 PO 操作が必要です。 PO お願いします。"
run_scenario "2.C1_BLOCK (PO委譲 + autonomy 0)" "$TRANS2" "$RESP2" 2

# === シナリオ 3: BYPASS_VIOLATION_LOG (違反 log 記録 中) ===
TRANS3="$TMP_DIR/scenario3.jsonl"
mk_transcript_with_user_only "$TRANS3"
RESP3="違反 #45 (2026-05-03): adv_violation_log.md に記録。 §2.25.3 PO 委譲禁止 違反。 PO 操作 keyword は few-shot 違反例 として 残す。 sub_po_delegation.md 参照。"
run_scenario "3.BYPASS_VIOLATION_LOG (違反記録)" "$TRANS3" "$RESP3" 0

# === シナリオ 4: RATIONALE_PASS (§4 escalation rationale) ===
TRANS4="$TMP_DIR/scenario4.jsonl"
mk_transcript_with_autonomy_tool "$TRANS4"
RESP4="ADV tried gh secret set GH_PAT で 設定 試行 failed because 環境変数 不在。 §4 escalation 該当 cost ≥ ¥500/月 (Plan Max 20 必須)。 PO 確認 お願いします。"
run_scenario "4.RATIONALE_PASS (§4 rationale)" "$TRANS4" "$RESP4" 0

# === 結果 ===
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  G48 行動ベース ADV 自律性 gate test (4 シナリオ)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
printf "%b\n" "$RESULTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  PASS: $PASS_COUNT / 4   FAIL: $FAIL_COUNT / 4"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi
exit 0
