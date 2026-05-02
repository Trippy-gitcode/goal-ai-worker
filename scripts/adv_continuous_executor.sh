#!/bin/sh
# scripts/adv_continuous_executor.sh
# 「止めない仕組み」 (Round 31 PO 直命対応、 2026-05-02)
#
# 目的:
#   ADV が手動 confirmation で止まることなく、 PO 不在でも残 task を消化し続ける
#   continuous executor。 launchd / cron / Cloudflare Cron Trigger / GitHub Actions
#   いずれかで periodic 実行する想定。
#
# 動作:
#   1. verify/adv_in_flight_tasks.txt を読込み (1 task / line)
#   2. 先頭 1 task を pop → 子 process で実行
#   3. 完了したら verify/adv_completed_tasks.log に append
#   4. 失敗したら verify/adv_failed_tasks.log に append + slack alert
#   5. queue 空なら exit 0 (PO に「全 task 完了」通知)
#
# task 形式 (verify/adv_in_flight_tasks.txt):
#   TASK_ID|TASK_TYPE|TASK_PAYLOAD
#   例: ROUND31-CAT-A-OWNER-KEY|fix|sed -i ... + git commit + push
#   例: ROUND31-CAT-J-AUDIT|review|sh scripts/dispatch_3persona.sh CAT-J
#
# 起動:
#   sh scripts/adv_continuous_executor.sh
#
# Self-loop (cron 不要、 1 process で連続実行):
#   while sh scripts/adv_continuous_executor.sh; do sleep 60; done

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

QUEUE="verify/adv_in_flight_tasks.txt"
COMPLETED="verify/adv_completed_tasks.log"
FAILED="verify/adv_failed_tasks.log"

mkdir -p verify

if [ ! -f "$QUEUE" ]; then
  echo "INFO: queue $QUEUE empty/absent → all tasks completed"
  exit 0
fi

# Pop first non-comment / non-empty line
TASK=$(grep -v '^#' "$QUEUE" | grep -v '^[[:space:]]*$' | head -1)
if [ -z "$TASK" ]; then
  echo "INFO: queue empty → exit 0"
  exit 0
fi

# Remove popped line from queue
TMPF=$(mktemp)
grep -v "$(echo "$TASK" | sed 's/[]\/$*.^[]/\\&/g')" "$QUEUE" > "$TMPF" || true
mv "$TMPF" "$QUEUE"

TASK_ID=$(echo "$TASK" | cut -d'|' -f1)
TASK_TYPE=$(echo "$TASK" | cut -d'|' -f2)
TASK_PAYLOAD=$(echo "$TASK" | cut -d'|' -f3-)

echo "executing: $TASK_ID type=$TASK_TYPE"

START_TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Execute in subprocess、 capture exit code
if eval "$TASK_PAYLOAD"; then
  END_TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  echo "$START_TS|$END_TS|$TASK_ID|OK" >> "$COMPLETED"
  echo "OK: $TASK_ID completed"
  exit 0
else
  END_TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  echo "$START_TS|$END_TS|$TASK_ID|FAIL" >> "$FAILED"
  echo "FAIL: $TASK_ID failed (exit non-zero)"
  exit 1
fi
