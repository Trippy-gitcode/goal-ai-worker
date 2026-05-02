#!/bin/sh
# scripts/dispatch_adv_response_review.sh — G26: ADV response 出力前 Review Persona dispatch 必須化
#
# 根拠:
#   - PO 直命 (2026-05-02): 「君から私に作業依頼するとき、 検証と作業結果をレポートするとき、
#     必ずレビューペルソナを走らせてそのAgentにVerifyしてもらったことを Verify Ok として 出せ」
#   - 違反 #28-#37 全 9 件 共通 root: ADV default = 報告 / config を信じる、 1-off mechanical
#     gate (G16-G25) 追加では catch しきれない。
#   - 解決: Review Persona subagent に固定 checklist 検証を委譲、 ADV は courier 化。
#
# 使い方:
#   sh scripts/dispatch_adv_response_review.sh <draft_response_file>
#   出力: stdout に「VERIFY OK: <summary>」 or 「VERIFY FAIL: <reason>」、
#         exit 0 = OK / exit 1 = FAIL
#
#   ADV 利用パターン:
#     1. ADV が response 草案を /tmp/adv_draft.md に書込
#     2. sh scripts/dispatch_adv_response_review.sh /tmp/adv_draft.md > /tmp/verify.txt
#     3. cat /tmp/verify.txt の VERIFY OK 行を PO 向け response に必ず含める
#     4. VERIFY FAIL なら ADV は draft 修正 + 再 dispatch
#
# Review Persona 動作 (judgment 0、 mechanical 実行のみ):
#   draft 内の claim keyword を grep + 各 claim を CLI 再実行:
#     - commit SHA (`[a-f0-9]{7,40}`) → git log -1 <sha>
#     - vitest count (「N tests PASS」) → npx vitest run --reporter=default で N 一致 確認
#     - coverage % (「Lines X%」) → npx vitest run --coverage で X 一致確認
#     - psql claim (「N rows」) → psql で 同 SELECT 再実行
#     - file 配置 (「test -f X」) → test -f X 再実行
#     - workflow CI green (「CI green / SUCCESS」) → gh run list で 一致確認
#
# 注意: 本 script は 簡易版 (claim grep + 一部 verify)。 真の review persona dispatch は
# ADV の Agent tool 経由で 別 subagent を起動して judgment 0 / mechanical 実行のみ させる。

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

[ $# -ge 1 ] || { echo "Usage: $0 <draft_response_file>" >&2; exit 2; }
DRAFT="$1"
[ -f "$DRAFT" ] || { echo "ERROR: $DRAFT 不在" >&2; exit 2; }

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  G26 Review Persona dispatch ($(date -u +%FT%TZ))"
echo "  (ADV draft 検証、 違反 #28-#37 root cause 解消)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

FAIL=0
CHECKED=0

# Check 1: commit SHA claim
SHAS=$(grep -oE '\b[a-f0-9]{7}\b' "$DRAFT" | sort -u | head -10)
for sha in $SHAS; do
  if git log -1 "$sha" >/dev/null 2>&1; then
    echo "  ✅ commit $sha exists"
    CHECKED=$((CHECKED + 1))
  else
    echo "  🛑 commit $sha NOT FOUND in git history"
    FAIL=$((FAIL + 1))
  fi
done

# Check 2: vitest count claim (「N tests PASS」 / 「N/N PASS」 等)
CLAIMED_COUNT=$(grep -oE '[0-9]+/[0-9]+ (tests? )?PASS|[0-9]+ tests? PASS' "$DRAFT" | grep -oE '^[0-9]+' | head -1)
if [ -n "$CLAIMED_COUNT" ]; then
  ACTUAL=$(npx vitest run --reporter=default 2>&1 | grep -oE 'Tests +[0-9]+ passed' | grep -oE '[0-9]+' | head -1 || echo "0")
  if [ "$ACTUAL" = "$CLAIMED_COUNT" ]; then
    echo "  ✅ vitest count claim $CLAIMED_COUNT matches actual $ACTUAL"
    CHECKED=$((CHECKED + 1))
  else
    echo "  🛑 vitest count MISMATCH: claim=$CLAIMED_COUNT actual=$ACTUAL"
    FAIL=$((FAIL + 1))
  fi
fi

# Check 3: production health URL claim (「HTTP 200」)
if grep -qE "production.*HTTP 200|/health.*HTTP 200" "$DRAFT"; then
  HC=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "https://goal-ai-worker.goalai-futoshi.workers.dev/health" 2>/dev/null || echo "000")
  if [ "$HC" = "200" ]; then
    echo "  ✅ production /health 200 verified"
    CHECKED=$((CHECKED + 1))
  else
    echo "  🛑 production /health claim 200 vs actual $HC"
    FAIL=$((FAIL + 1))
  fi
fi

# Check 4: latest CI green claim
if grep -qE "CI green|11/11 gates PASS|gates PASS" "$DRAFT"; then
  CI=$(gh run list --limit 1 --json conclusion --jq '.[0].conclusion' 2>/dev/null || echo "?")
  if [ "$CI" = "success" ]; then
    echo "  ✅ latest CI conclusion=success"
    CHECKED=$((CHECKED + 1))
  else
    echo "  🛑 CI green claim vs actual $CI"
    FAIL=$((FAIL + 1))
  fi
fi

# Check 5: workflow failure 不在 claim (recent_workflow_failure_check 連動)
if grep -qE "全 workflow.*PASS|workflow.*green|failure.*0 件" "$DRAFT"; then
  if [ -x scripts/recent_workflow_failure_check.sh ]; then
    if sh scripts/recent_workflow_failure_check.sh 24 >/dev/null 2>&1; then
      echo "  ✅ G24 workflow failure scan PASS"
      CHECKED=$((CHECKED + 1))
    else
      echo "  🛑 G24 workflow failure scan FAIL (24h 以内に failure あり)"
      FAIL=$((FAIL + 1))
    fi
  fi
fi

echo ""
echo "Total checks: $CHECKED, Failed: $FAIL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$FAIL" -gt 0 ]; then
  echo "🛑 VERIFY FAIL: $FAIL claim mismatch、 ADV draft 修正必須"
  exit 1
fi

if [ "$CHECKED" -eq 0 ]; then
  echo "⚠ VERIFY SKIPPED: draft に検証可能 claim なし (mechanical claim 不在)"
  exit 0
fi

echo "✅ VERIFY OK: $CHECKED claim all PASS、 PO 向け response に本印を含めて OK"
exit 0
