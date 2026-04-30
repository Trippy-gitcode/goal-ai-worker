#!/bin/bash
# Stop hook: テストミッション中にテスト未完了で停止しようとしたらブロック
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

# 現在のミッションがTEST系か確認
CURRENT=$(grep -m1 "Next:" instructions/session_progress.md 2>/dev/null || echo "")
if echo "$CURRENT" | grep -qi "TEST"; then
  # テストレポートが存在するか
  if [ ! -f "tests/e2e/report/index.html" ]; then
    echo '{"decision":"block","reason":"テストミッション中です。HTMLレポート(tests/e2e/report/index.html)が未生成です。テスト実行を完了してから停止してください。"}'
    exit 0
  fi
fi

exit 0
