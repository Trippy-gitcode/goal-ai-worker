#!/bin/sh
# scripts/autonomy_loop_check.sh — §2.25.22 ADV Autonomy Loop 必須化 機械強制 (dev-system 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §2.25.22 ADV Autonomy Loop 必須化 (PO 反応待ち default 禁止)
#   - core_spec.md §3.15 ADV Autonomy Loop 義務 (turn 終了時 a-c 3 chain self-check)
#   - core_spec.md §3.10 end-to-end ownership / §3.11 active monitoring
#   - PO 直命 (2026-05-04): 「全 ✅ まで 止めない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-P1-MECHANICAL-ENFORCEMENT-DEPLOY-V1 (P1-7 配備)
#
# 動作 (dev-system pre-commit hook 経由 + Stop hook 経由):
#   1. SSoT 4 file (session_progress / in_flight_topics / subagent_status / adv_violation_log) を walk
#   2. 残 work 件数 (= 「未着手」 / 「[ ]」 / 「open」 / 「IN_PROGRESS」 等) を count
#   3. 残 work ≥ 1 か → (a) (b) (c) 3 chain self-check 実行
#       (a) 残 work 件数 ≥ 1 か (= 「全 ✅ 達成」 未満 か)
#       (b) dispatched subagent 数 ≥ 1 か (= 並列 work fire 済 か)
#       (c) ScheduleWakeup 起動済 か (= 自動復活 trigger 仕込み 済 か)
#   4. (a)(b)(c) いずれか 0 + 残 work ≥ 1 → BLOCK (= §2.25.22 違反 + §3.15 違反)
#   5. 「PO 反応待ち default」 keyword 残存 → BLOCK
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#
# 連動 (settings.json + Stop hook + pre-commit hook):
#   - settings.json: Stop hook + pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step y に結線)
#   - core_spec.md §2.25.22 mechanical_enforcement row
#   - templates/scripts/autonomy_loop_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

SESSION_PROGRESS_FILE="${REPO_ROOT}/instructions/session_progress.md"
INFLIGHT_FILE="${REPO_ROOT}/instructions/in_flight_topics.md"
SUBAGENT_STATUS_FILE="${REPO_ROOT}/instructions/subagent_status.md"
VIOLATION_LOG_FILE="${REPO_ROOT}/verify/adv_violation_log.md"

echo "================================================================"
echo "  §2.25.22 ADV Autonomy Loop check (dev-system 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

# Step 1: 残 work 件数 (a) を count
RESIDUAL_COUNT=0
for f in "$SESSION_PROGRESS_FILE" "$INFLIGHT_FILE"; do
  [ -f "$f" ] || continue
  HITS=$(grep -cE '^- \[ \]|^[*-] \[ \]|未着手|残 work|open|IN_PROGRESS' "$f" 2>/dev/null || echo 0)
  HITS=$(echo "$HITS" | tr -d '[:space:]')
  RESIDUAL_COUNT=$((RESIDUAL_COUNT + HITS))
done

# Step 2: dispatched subagent 数 (b) を count
DISPATCHED_COUNT=0
if [ -f "$SUBAGENT_STATUS_FILE" ]; then
  DISPATCHED_COUNT=$(grep -cE '^[|]\s*SUBAGENT-|^- \[\s*[xX✓]?\s*\]\s+SUBAGENT-|SUBAGENT-[A-Z0-9-]+' "$SUBAGENT_STATUS_FILE" 2>/dev/null || echo 0)
  DISPATCHED_COUNT=$(echo "$DISPATCHED_COUNT" | tr -d '[:space:]')
fi

# Step 3: ScheduleWakeup 起動 (c) を 確認
# 痕跡 = log / SSoT 内 「ScheduleWakeup」 / 「scheduled-tasks」 / 「mcp__scheduled-tasks__create_scheduled_task」 hit
SCHEDULE_HIT_COUNT=0
for f in "$SESSION_PROGRESS_FILE" "$INFLIGHT_FILE" "$SUBAGENT_STATUS_FILE"; do
  [ -f "$f" ] || continue
  HITS=$(grep -cE 'ScheduleWakeup|scheduled-tasks|create_scheduled_task|wakeup invoke' "$f" 2>/dev/null || echo 0)
  HITS=$(echo "$HITS" | tr -d '[:space:]')
  SCHEDULE_HIT_COUNT=$((SCHEDULE_HIT_COUNT + HITS))
done

# Step 4: 「PO 反応待ち default」 keyword 検出
WAIT_KW_PATTERN='PO 反応待ち|PO message 来たら|PO 待ち|PO 判断待ち|待機中|PO 反応 を 待つ'
WAIT_HIT_COUNT=0
for f in "$SESSION_PROGRESS_FILE" "$INFLIGHT_FILE" "$SUBAGENT_STATUS_FILE"; do
  [ -f "$f" ] || continue
  HITS=$(grep -cE "$WAIT_KW_PATTERN" "$f" 2>/dev/null || echo 0)
  HITS=$(echo "$HITS" | tr -d '[:space:]')
  WAIT_HIT_COUNT=$((WAIT_HIT_COUNT + HITS))
done

echo ""
echo "(a) 残 work 件数: $RESIDUAL_COUNT"
echo "(b) dispatched subagent 数: $DISPATCHED_COUNT"
echo "(c) ScheduleWakeup 痕跡 件数: $SCHEDULE_HIT_COUNT"
echo "「PO 反応待ち default」 keyword hit: $WAIT_HIT_COUNT"

# 判定: 残 work ≥ 1 + ((a) (b) (c) いずれか 0 OR PO 待ち keyword ≥ 1) → BLOCK
FAIL_DETAIL=""
FAIL_FLAG=0

if [ "$RESIDUAL_COUNT" -ge 1 ]; then
  if [ "$DISPATCHED_COUNT" -eq 0 ]; then
    FAIL_FLAG=1
    FAIL_DETAIL="${FAIL_DETAIL}  - (b) 残 work ${RESIDUAL_COUNT} 件 + dispatched subagent 0 件 (= dispatch chain 中断、 §2.25.22 違反 / #44 同型 再生産)\n"
  fi
  if [ "$SCHEDULE_HIT_COUNT" -eq 0 ]; then
    FAIL_FLAG=1
    FAIL_DETAIL="${FAIL_DETAIL}  - (c) 残 work ${RESIDUAL_COUNT} 件 + ScheduleWakeup invoke 0 件 (= 自動復活 trigger 不在、 §2.25.22 違反 / #52 同型 再生産)\n"
  fi
  if [ "$WAIT_HIT_COUNT" -ge 1 ]; then
    FAIL_FLAG=1
    FAIL_DETAIL="${FAIL_DETAIL}  - 「PO 反応待ち default」 keyword ${WAIT_HIT_COUNT} 件 + 残 work ${RESIDUAL_COUNT} 件 (= §2.25.22 違反、 §3.15 違反)\n"
  fi
fi

if [ "$FAIL_FLAG" -eq 1 ]; then
  echo ""
  echo "🛑 §2.25.22 ADV Autonomy Loop 違反検出:"
  printf "%b" "$FAIL_DETAIL"
  echo ""
  echo "対処 (= §2.25.22 + §3.15 履行):"
  echo "  1. (b) Task tool で subagent dispatch ≥ 1 件 fire (= 並列 work active)"
  echo "  2. (c) mcp__scheduled-tasks__create_scheduled_task で 30 分間隔 ScheduleWakeup invoke"
  echo "  3. 「PO 反応待ち default」 keyword 削除"
  echo "  4. 「全 ✅ 達成」 まで dispatch chain 継続 (= subagent 完了通知 即 ADV review + 次 dispatch)"
  echo ""
  if [ "${AUTONOMY_LOOP_STRICT:-0}" = "1" ]; then
    echo "BLOCK: AUTONOMY_LOOP_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 AUTONOMY_LOOP_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §2.25.22 ADV Autonomy Loop 健全 (residual=$RESIDUAL_COUNT, dispatched=$DISPATCHED_COUNT, schedule=$SCHEDULE_HIT_COUNT, wait_kw=$WAIT_HIT_COUNT)"
exit 0
