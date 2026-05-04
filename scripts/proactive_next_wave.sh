#!/bin/sh
# scripts/proactive_next_wave.sh
# G39 proactive next-wave dispatcher (goal-ai-worker)
#
# 元: dev-system core_spec.md §2.25.16 ADV autonomous mechanisms (G37-G40)
# Mission: SUBAGENT-DEVSYS-G37-G40-AUTONOMOUS-MECHANISMS-V1 (2026-05-02)
# 関連 PO-DIRECTIVE: 「私が毎回聞かなくてもそうなるようにして、 仕組みを開発システムに入れる」
#
# 目的:
#   全 task 完了 detect (`verify/adv_in_flight_tasks.txt` empty) 時、
#   PO に「次は？」 を言わせず ADV 自律で次 wave priorities を re-eval + dispatch。
#   adv_continuous_executor.sh (§13.8) queue 空時 自動 trigger される。
#
# 起動 (adv_continuous_executor.sh から trigger):
#   queue 空 → sh scripts/proactive_next_wave.sh
#
# 動作 (TODO: actual implementation は別 mission):
#   1. instructions/in_flight_topics.md / docs/po-decisions.md 等から
#      pending priority を抽出
#   2. verify/adv_completed_tasks.log delta 解析で次 wave 候補 score 化
#   3. 3 ペルソナ合議 (dispatch_3persona.sh) で次 wave priorities 確定
#   4. verify/adv_in_flight_tasks.txt に新 task append (TASK_ID|TYPE|PAYLOAD)
#   5. adv_continuous_executor.sh の次 cron loop で自動消化開始
#
# PO escalation:
#   §4 該当 (コスト ≥ ¥500/月 / 新プロセス / ブランド変更) のみ G16 mechanical check 経由
#   それ以外は 3 ペルソナ合議で ADV 自律判定
#
# 失敗時:
#   verify/adv_violation_log.md に §2.25.16 違反 として 4 部構成 で記録 (§3.5 自己申告)

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

LOG_FILE="verify/proactive_next_wave.log"
QUEUE_FILE="verify/adv_in_flight_tasks.txt"
mkdir -p verify

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] G39 dispatcher start" >> "$LOG_FILE"

# TODO: step 1 pending priority 抽出 (別 mission で実装)
# TODO: step 2 next wave 候補 score 化 (別 mission で実装)
# TODO: step 3 3 ペルソナ合議 dispatch (別 mission で実装)
# TODO: step 4 queue append (別 mission で実装)
# TODO: step 5 §4 escalation 判定 (別 mission で実装)

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] G39 dispatcher end (stub, no-op)" >> "$LOG_FILE"
exit 0
