#!/bin/bash
# PreToolUse hook: デプロイ/push前にcanopy PASSを強制
# exit 0 = 許可, exit 2 = ブロック（stderrがCodeへのフィードバック）
set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

# デプロイ/push系コマンドを検出
if echo "$COMMAND" | grep -qE 'wrangler deploy|git push|npm run deploy'; then
  # canopyの最新結果を確認
  CANOPY_RESULT="instructions/results/canopy_latest.txt"
  if [ ! -f "$CANOPY_RESULT" ]; then
    echo "デプロイ前にcanopy.shを実行してください。canopy結果ファイルが見つかりません。" >&2
    exit 2
  fi
  
  # canopy結果がPASSかチェック
  if ! grep -q "CANOPY PASS" "$CANOPY_RESULT"; then
    echo "canopyがFAILしています。FAILを修正してからデプロイしてください。" >&2
    echo "結果: $(tail -1 $CANOPY_RESULT)" >&2
    exit 2
  fi
  
  # canopy結果が1時間以内かチェック
  CANOPY_AGE=$(( $(date +%s) - $(stat -f%m "$CANOPY_RESULT") ))
  if [ "$CANOPY_AGE" -gt 3600 ]; then
    echo "canopy結果が1時間以上前です。再実行してください: bash tests/smoke/canopy.sh" >&2
    exit 2
  fi
fi

exit 0
