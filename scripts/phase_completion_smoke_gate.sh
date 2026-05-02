#!/bin/sh
# scripts/phase_completion_smoke_gate.sh — G19: §2.25.21.4 Phase 完了 smoke PASS 必須
#
# 根拠:
#   - core_spec.md §2.25.21.4「Phase 完了は smoke PASS 必須」 を mechanical 強制化
#   - 違反 #7 (機械強制未配線、 ADV 自己回避必須): 過去 ADV が「Phase 完了」 と
#     宣言しながら smoke PASS を skip → silent CI red 8 連続放置
#
# 動作:
#   commit message に「Phase」「batch」「完了」「LIVE」 keyword を含む場合、 以下を必須:
#     1. production /health 200 確認 (curl)
#     2. 直近 CI run conclusion = success 確認 (gh run list)
#     3. unit test PASS 確認 (npx vitest run)
#   いずれかが FAIL なら exit 1 で commit block
#
# 使い方:
#   COMMIT_MSG_FILE="$1" sh scripts/phase_completion_smoke_gate.sh
#   または pre-commit hook 内で commit msg を引数渡し
#
# 起動 timing:
#   (a) pre-commit hook (commit-msg phase) で commit message 読み込み後

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# commit message を取得 (引数 or env or last commit)
COMMIT_MSG=""
if [ $# -ge 1 ] && [ -f "$1" ]; then
  COMMIT_MSG=$(cat "$1")
elif [ -n "${COMMIT_MSG_TEXT:-}" ]; then
  COMMIT_MSG="$COMMIT_MSG_TEXT"
elif [ -f .git/COMMIT_EDITMSG ]; then
  COMMIT_MSG=$(cat .git/COMMIT_EDITMSG)
fi

# Phase / batch 完了 keyword grep (case-insensitive)
if ! echo "$COMMIT_MSG" | grep -qiE "(Phase.*完了|Phase.*PASS|batch.*完了|LIVE|production.*deploy|stage.*完了|release|v[0-9]+\.[0-9]+\.[0-9]+ ship)"; then
  # Phase 完了 宣言 keyword なし = G19 skip
  exit 0
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  G19 Phase completion smoke PASS gate"
echo "  (§2.25.21.4 mechanical 強制、 違反 #7 再発防止)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ENV: PROD_HEALTH_URL を環境変数で override 可、 default は Lais worker
HEALTH_URL="${PROD_HEALTH_URL:-https://goal-ai-worker.goalai-futoshi.workers.dev/health}"

FAIL=0

# 1. production /health 200 check
HC=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "$HEALTH_URL" 2>/dev/null || echo "000")
if [ "$HC" = "200" ]; then
  echo "✅ production smoke: /health $HC ($HEALTH_URL)"
else
  echo "🛑 production smoke FAIL: /health $HC ($HEALTH_URL) — Phase 完了 宣言不可"
  FAIL=1
fi

# 2. 直近 CI conclusion check (gh CLI)
if command -v gh >/dev/null 2>&1; then
  CI_STATUS=$(gh run list --limit 1 --json conclusion,status --jq '.[0].conclusion + " " + .[0].status' 2>/dev/null || echo "unknown unknown")
  CI_CONCL=$(echo "$CI_STATUS" | awk '{print $1}')
  if [ "$CI_CONCL" = "success" ] || [ "$CI_CONCL" = "" ]; then  # 空 = まだ run なし、 直前 push 前 OK
    echo "✅ latest CI conclusion: ${CI_CONCL:-pending}"
  else
    echo "🛑 latest CI conclusion: $CI_CONCL — Phase 完了 宣言不可 (commit 前に CI green 確認)"
    FAIL=1
  fi
else
  echo "⚠ gh CLI 未 install、 CI conclusion check skip (warning only)"
fi

# 3. unit test PASS check (vitest 利用前提、 そうでなければ skip)
if [ -f package.json ] && grep -q '"vitest"' package.json 2>/dev/null; then
  if npx vitest run --reporter=default >/tmp/g19_vitest.log 2>&1; then
    PASS_LINE=$(grep -E "Tests +[0-9]+ passed" /tmp/g19_vitest.log | tail -1 || echo "")
    echo "✅ vitest: $PASS_LINE"
  else
    echo "🛑 vitest FAIL — Phase 完了 宣言不可"
    tail -10 /tmp/g19_vitest.log
    FAIL=1
  fi
fi

echo ""
if [ "$FAIL" -ne 0 ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🛑 G19 FAIL: §2.25.21.4 Phase 完了 smoke PASS 必須 違反"
  echo "   commit message に Phase/batch 完了 keyword を含むが、 smoke 1 つ以上 FAIL"
  echo "   → fix 後再 commit、 または commit message から完了宣言 keyword を削除"
  exit 1
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ G19 PASS: Phase 完了 smoke 全 PASS、 commit OK"
exit 0
