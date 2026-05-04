#!/bin/sh
# scripts/po_zero_touch_reporter.sh
# G38 PO zero-touch reporter (goal-ai-worker)
#
# 元: dev-system core_spec.md §2.25.16 ADV autonomous mechanisms (G37-G40)
# Mission: SUBAGENT-DEVSYS-G37-G40-AUTONOMOUS-MECHANISMS-V1 (2026-05-02)
# 関連 PO-DIRECTIVE: 「私が毎回聞かなくてもそうなるようにして、 仕組みを開発システムに入れる」
#
# 目的:
#   24h cadence で `instructions/status_summary.md` を自動生成、 PO に
#   能動報告 (zero-touch)。 bug 検出時 即 GitHub Issue auto-open で
#   PO が tooling 切替なしに status 把握可能。
#
# 起動 (cron / launchd / GitHub Actions schedule、 daily 09:00 JST):
#   0 0 * * * cd /path/to/goal-ai-worker && sh scripts/po_zero_touch_reporter.sh
#
# 動作 (TODO: actual implementation は別 mission):
#   1. instructions/session_progress.md / docs/decision_log.md 等 SSoT 4 file から
#      過去 24h delta を抽出
#   2. verify/adv_completed_tasks.log / verify/adv_failed_tasks.log から
#      task 完了率 / 失敗率 集計
#   3. instructions/status_summary.md を Markdown で自動生成 (固定 template)
#   4. verify/bugs_detected.txt から open bug を抽出 → gh issue create で auto-open
#   5. PO 通知 (任意の channel: email / Slack / GitHub Issue mention)
#
# 失敗時:
#   verify/adv_violation_log.md に §2.25.16 違反 として 4 部構成 で記録 (§3.5 自己申告)

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

LOG_FILE="verify/po_zero_touch_reporter.log"
SUMMARY_FILE="instructions/status_summary.md"
mkdir -p verify instructions

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] G38 reporter start" >> "$LOG_FILE"

# TODO: step 1 SSoT delta 抽出 (別 mission で実装)
# TODO: step 2 task 完了率 / 失敗率 集計 (別 mission で実装)
# TODO: step 3 status_summary.md 生成 (別 mission で実装)
# TODO: step 4 bug → gh issue create (別 mission で実装)
# TODO: step 5 PO 通知 (別 mission で実装)

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] G38 reporter end (stub, no-op)" >> "$LOG_FILE"
exit 0
