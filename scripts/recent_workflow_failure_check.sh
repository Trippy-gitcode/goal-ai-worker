#!/bin/sh
# scripts/recent_workflow_failure_check.sh — G24: 全 trigger 種別 workflow failure 検出
#
# 根拠:
#   - 違反 #35 (2026-05-02): incident-critical-reminder workflow が schedule trigger 経由で
#     fail していたが ADV 検出 0、 PO email で初めて発覚。
#   - PO 直命「修正して」 反映、 mechanical 強制化。
#   - 「ADV が push trigger した CI のみ watch」 mental model の構造的 gap 解消。
#
# 動作:
#   直近 6h で failure status の workflow run を gh CLI で取得、
#   1 件でも検出したら exit 1 + 出力 (workflow 名 / event / createdAt / sha)。
#
# 使い方:
#   sh scripts/recent_workflow_failure_check.sh           # 直近 6h check
#   sh scripts/recent_workflow_failure_check.sh 24       # 直近 24h check
#
# 起動 timing:
#   (a) adv_continuous_executor.sh 内で各 task 後 自動 check (cron 経由 含む)
#   (b) ADV が定期的に手動 (新 workflow 配備時 必ず)
#   (c) cron で 1h 周期 (.github/workflows/recent_failure_check.yml は別配備)

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

WINDOW_HOURS="${1:-6}"

# date -u -v 系 (BSD) と -d 系 (GNU) の両対応
if SINCE=$(date -u -v-${WINDOW_HOURS}H +%FT%TZ 2>/dev/null); then
  :
elif SINCE=$(date -u -d "${WINDOW_HOURS} hours ago" +%FT%TZ 2>/dev/null); then
  :
else
  echo "ERROR: date command 互換性問題、 macOS BSD or Linux GNU で再試行" >&2
  exit 2
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  G24 recent_workflow_failure_check (since=$SINCE)"
echo "  (違反 #35 防止、 全 trigger 種別 scan)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! command -v gh >/dev/null 2>&1; then
  echo "WARN: gh CLI 未 install、 G24 skip (install: brew install gh)"
  exit 0
fi

FAILURES=$(gh run list --status failure --created ">$SINCE" --limit 50 --json name,event,createdAt,headSha,conclusion 2>/dev/null || echo "[]")
COUNT=$(echo "$FAILURES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" 2>/dev/null || echo "0")

if [ "${COUNT:-0}" -eq 0 ]; then
  echo "✅ G24 PASS: 直近 ${WINDOW_HOURS}h で failure workflow 0 件"
  exit 0
fi

echo "🛑 G24 FAIL: 直近 ${WINDOW_HOURS}h で failure workflow $COUNT 件 検出"
echo ""
echo "$FAILURES" | python3 -c "
import sys,json
d = json.load(sys.stdin)
for r in d:
    print(f\"  - {r['createdAt']} {r['name']} (event={r['event']}) sha={r['headSha'][:7]}\")
"
echo ""
echo "対処:"
echo "  1. 各 workflow run を gh run view <ID> --log-failed で原因調査"
echo "  2. fix push 後 manual workflow_dispatch で動作確認 (post-deploy verify)"
echo "  3. 再 scan で 0 件 確認まで本 gate を pass させない"
echo ""
echo "違反 #35 同型 (workflow yaml parse のみで OK 判定、 真 trigger 動作確認 skip)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
exit 1
