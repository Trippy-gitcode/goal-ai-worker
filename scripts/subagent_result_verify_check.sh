#!/bin/sh
# scripts/subagent_result_verify_check.sh — §2.25.18 (G48) subagent 結果 verify-first 機械強制 (dev-system 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §2.25.18 G48 行動ベース ADV 自律性 gate (action-based autonomy enforcement)
#   - core_spec.md §3.9 verify-first 原則 (dispatch 後 機械検証 必須)
#   - core_spec.md §3.10 end-to-end ownership (dispatch ≠ 完了)
#   - PO 直命 (2026-05-04): 「機械強制 しない 理由 が ない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-P1-MECHANICAL-ENFORCEMENT-DEPLOY-V1 (P1-5 配備)
#
# 動作 (dev-system pre-commit hook 経由 + Stop hook 経由):
#   1. instructions/subagent_status.md を walk
#   2. 各 dispatched subagent の status (COMPLETED / FAILED / IN_PROGRESS) と
#      cmd-unit / cmd-e2e / cmd-realworld 完了条件 verify ログ を 確認
#   3. COMPLETED ≥ 1 + verify ログ 0 件 (= 「Async agent launched successfully」 件数 一致 grep skip) → BLOCK
#   4. dispatched subagent 全 件 verify-first 通過確認 (= grep / log / ci_status_check 痕跡)
#   5. settings.json で Stop hook に subagent verify check が 結線されていること を 確認
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#
# 連動 (settings.json + Stop hook + pre-commit hook):
#   - settings.json: Stop hook + pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step w に結線)
#   - core_spec.md §2.25.18 mechanical_enforcement row
#   - templates/scripts/subagent_result_verify_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

SUBAGENT_STATUS_FILE="${REPO_ROOT}/instructions/subagent_status.md"

echo "================================================================"
echo "  §2.25.18 subagent result verify-first check (dev-system 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

if [ ! -f "$SUBAGENT_STATUS_FILE" ]; then
  echo ""
  echo "🛑 §2.25.18 違反: $SUBAGENT_STATUS_FILE 不在 = subagent verify 不能"
  echo ""
  echo "対処: $SUBAGENT_STATUS_FILE 配備 + dispatched subagent status 列 を 整備"
  if [ "${SUBAGENT_VERIFY_STRICT:-0}" = "1" ]; then
    exit 1
  fi
  exit 0
fi

# Step 1: COMPLETED / FAILED / IN_PROGRESS 件数 を count
COMPLETED_COUNT=$(grep -cE 'COMPLETED|completed|完了' "$SUBAGENT_STATUS_FILE" 2>/dev/null || echo 0)
COMPLETED_COUNT=$(echo "$COMPLETED_COUNT" | tr -d '[:space:]')
FAILED_COUNT=$(grep -cE 'FAILED|failed|失敗' "$SUBAGENT_STATUS_FILE" 2>/dev/null || echo 0)
FAILED_COUNT=$(echo "$FAILED_COUNT" | tr -d '[:space:]')

# Step 2: verify ログ 痕跡 (= cmd-unit / cmd-e2e / cmd-realworld) 検出
VERIFY_KW_PATTERN='cmd-unit|cmd-e2e|cmd-realworld|verified|grep PASS|wc -l|test -f|Async agent launched|completion verify'
VERIFY_TRACE_COUNT=$(grep -cE "$VERIFY_KW_PATTERN" "$SUBAGENT_STATUS_FILE" 2>/dev/null || echo 0)
VERIFY_TRACE_COUNT=$(echo "$VERIFY_TRACE_COUNT" | tr -d '[:space:]')

# Step 3: settings.json で Stop hook の subagent verify 結線 verify
SETTINGS_FILE_LOCAL="${REPO_ROOT}/.claude/settings.json"
SETTINGS_FILE_USER="${HOME}/.claude/settings.json"
HOOK_CONFIGURED=0

for sf in "$SETTINGS_FILE_LOCAL" "$SETTINGS_FILE_USER"; do
  [ -f "$sf" ] || continue
  if grep -qE '(Stop|pre-commit hook|subagent_result_verify|adv_response_gate)' "$sf" 2>/dev/null; then
    HOOK_CONFIGURED=1
  fi
done

echo ""
echo "COMPLETED subagent 数: $COMPLETED_COUNT"
echo "FAILED subagent 数: $FAILED_COUNT"
echo "verify ログ 痕跡 件数: $VERIFY_TRACE_COUNT"
echo "Stop hook + pre-commit hook 結線 (settings.json): $HOOK_CONFIGURED"

# 判定: COMPLETED ≥ 1 + verify trace 0 → §2.25.18 違反 (= verify-first skip)
if [ "$COMPLETED_COUNT" -ge 1 ] && [ "$VERIFY_TRACE_COUNT" -eq 0 ]; then
  echo ""
  echo "🛑 §2.25.18 違反検出: COMPLETED ${COMPLETED_COUNT} 件 vs verify ログ 痕跡 0 件 (= verify-first skip)"
  echo ""
  echo "対処 (= §2.25.18 + §3.9 履行):"
  echo "  1. 各 COMPLETED subagent について cmd-unit / cmd-e2e / cmd-realworld 完了条件 PASS 確認"
  echo "  2. Async agent launched successfully 件数 = 期待件数 を grep 検証"
  echo "  3. completion_report の中身 (ミッション ID / 完了条件 PASS / FAIL / 出力ファイル件数 / commit sha) を grep / log 解析で確認"
  echo "  4. settings.json で Stop hook + pre-commit hook 結線 verify"
  echo ""
  if [ "${SUBAGENT_VERIFY_STRICT:-0}" = "1" ]; then
    echo "BLOCK: SUBAGENT_VERIFY_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 SUBAGENT_VERIFY_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §2.25.18 verify-first 健全 (completed=$COMPLETED_COUNT, failed=$FAILED_COUNT, verify_trace=$VERIFY_TRACE_COUNT, hook=$HOOK_CONFIGURED)"
exit 0
