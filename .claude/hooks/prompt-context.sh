#!/bin/bash
# UserPromptSubmit hook: ふとしからのメッセージ送信時にテスト結果・git statusを添付
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

CHANGED=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
STAGED=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')

CONTEXT="[Git: ${CHANGED}変更, ${STAGED}ステージ済み]"

# テスト結果があれば添付
if [ -f "tests/e2e/report/index.html" ]; then
  REPORT_AGE=$(( $(date +%s) - $(stat -f%m "tests/e2e/report/index.html") ))
  if [ "$REPORT_AGE" -lt 3600 ]; then
    CONTEXT="$CONTEXT [テストレポート: ${REPORT_AGE}秒前に生成]"
  fi
fi

echo "{\"additionalContext\": \"$CONTEXT\"}"
