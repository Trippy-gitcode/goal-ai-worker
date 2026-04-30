#!/bin/sh
# tests/adv_gate_e2e.sh
# MISSION-G49-PKG Phase 2.2 e2e テスト
#
# 用途: 違反パターン応答 → adv_response_gate.sh BLOCK 動作 + ログ出力検証
#
# 検査対象:
#   1. §2.25.14 [Review: ...] 付記欠落 → BLOCK
#   2. §2.25.9 PO 作業発生キーワード + §2.25.3 メタタグ欠落 → BLOCK
#   3. §2.25.10 違反 #N 記録のみ + 構造解消提案欠落 → BLOCK
#   4. §2.25.12 外部 CLI 言及 + 引用元 / 「未確認」欠落 → BLOCK
#   5. 正常応答（§2.25.14 付記あり）→ PASS

set -eu
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

GATE="${REPO_ROOT}/scripts/adv_response_gate.sh"
LOG="${REPO_ROOT}/logs/adv_violation_gate.log"

[ -x "$GATE" ] || { echo "FAIL: $GATE 未実行可"; exit 1; }

PASS=0
FAIL=0

assert_block() {
  desc="$1"
  json="$2"
  out=$(printf '%s' "$json" | bash "$GATE" 2>/dev/null || true)
  if printf '%s' "$out" | grep -qE '"decision":[[:space:]]*"block"'; then
    echo "PASS: $desc"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $desc (expected block, got: $out)"
    FAIL=$((FAIL + 1))
  fi
}

assert_pass() {
  desc="$1"
  json="$2"
  out=$(printf '%s' "$json" | bash "$GATE" 2>/dev/null || true)
  if [ -z "$out" ]; then
    echo "PASS: $desc"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $desc (expected pass, got block: $out)"
    FAIL=$((FAIL + 1))
  fi
}

# テスト 1: §2.25.14 ペルソナレビュー付記欠落
SID1="testsid-$(date +%s)-1"
JSON1="{\"session_id\":\"${SID1}\",\"hook_event_name\":\"Stop\",\"last_assistant_message\":\"完了しました。詳細は省略。\"}"
assert_block "[1] §2.25.14 [Review: ...] 付記欠落 → BLOCK" "$JSON1"

# テスト 2: §2.25.9 違反（PO 作業発生キーワード + §2.25.3 メタタグ欠落）
SID2="testsid-$(date +%s)-2"
JSON2="{\"session_id\":\"${SID2}\",\"hook_event_name\":\"Stop\",\"last_assistant_message\":\"テンプレを貼付してください。起動のタイミングを判断仰ぎたいです。[Review: 1 rounds, 3 personas]\"}"
assert_block "[2] §2.25.9 PO 作業発生キーワード + §2.25.3 メタタグ欠落 → BLOCK" "$JSON2"

# テスト 3: §2.25.10 違反（違反記録のみ + 構造解消提案欠落）
SID3="testsid-$(date +%s)-3"
JSON3="{\"session_id\":\"${SID3}\",\"hook_event_name\":\"Stop\",\"last_assistant_message\":\"違反 #11 として記録しました。次回気をつけます。[Review: 1 rounds, 3 personas]\"}"
assert_block "[3] §2.25.10 違反記録のみ + 構造解消提案欠落 → BLOCK" "$JSON3"

# テスト 4: §2.25.12 違反（外部 CLI 言及 + 引用元欠落）
SID4="testsid-$(date +%s)-4"
JSON4="{\"session_id\":\"${SID4}\",\"hook_event_name\":\"Stop\",\"last_assistant_message\":\"claude CLI で wrangler を起動できます。supabase の RLS は省略可能です。[Review: 1 rounds, 3 personas]\"}"
assert_block "[4] §2.25.12 外部 CLI 言及 + 引用元 / 未確認 欠落 → BLOCK" "$JSON4"

# テスト 5: 正常応答（全項目クリア）
SID5="testsid-$(date +%s)-5"
JSON5="{\"session_id\":\"${SID5}\",\"hook_event_name\":\"Stop\",\"last_assistant_message\":\"Phase 2 完了。cmd 全 PASS、evidence/PHASE2-FIX/ 参照。[Review: 1 rounds, 3 personas]\"}"
assert_pass "[5] 全項目クリア応答 → PASS" "$JSON5"

# テスト 6: PO 緊急 override flag 動作
touch "${REPO_ROOT}/instructions/gate_override.flag"
SID6="testsid-$(date +%s)-6"
JSON6="{\"session_id\":\"${SID6}\",\"hook_event_name\":\"Stop\",\"last_assistant_message\":\"違反応答だが override で通る\"}"
out6=$(printf '%s' "$JSON6" | bash "$GATE" 2>/dev/null || true)
if [ -z "$out6" ]; then
  echo "PASS: [6] gate_override.flag 存在時、gate 一時無効化"
  PASS=$((PASS + 1))
else
  echo "FAIL: [6] override flag 動作 (got: $out6)"
  FAIL=$((FAIL + 1))
fi
rm -f "${REPO_ROOT}/instructions/gate_override.flag"

# ログ出力確認
if [ -f "$LOG" ]; then
  RECENT=$(tail -20 "$LOG" | grep -cE "(BLOCK|PASS|OVERRIDE)" || true)
  if [ "${RECENT:-0}" -ge 4 ]; then
    echo "PASS: [LOG] adv_violation_gate.log にエントリ ${RECENT} 件記録"
    PASS=$((PASS + 1))
  else
    echo "FAIL: [LOG] エントリ不足 (recent=${RECENT})"
    FAIL=$((FAIL + 1))
  fi
else
  echo "FAIL: [LOG] $LOG 不在"
  FAIL=$((FAIL + 1))
fi

echo "---"
echo "adv_gate_e2e: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ] || exit 1
exit 0
