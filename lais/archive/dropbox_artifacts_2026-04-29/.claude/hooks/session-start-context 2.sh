#!/bin/bash
# SessionStart hook: セッション開始時にコンテキストを注入
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
VERSION=$(grep -o "APP_VERSION = '[^']*'" frontend/js/globals.js 2>/dev/null | grep -o "'[^']*'" | tr -d "'" || echo "unknown")
SP_LINES=$(wc -l < instructions/session_progress.md 2>/dev/null || echo "0")
NEXT=$(grep -m1 "Next:" instructions/session_progress.md 2>/dev/null | head -1 || echo "unknown")

# JSON出力でClaude Codeのコンテキストに追加
cat <<EOF
{"additionalContext": "Branch: $BRANCH | Version: v$VERSION | session_progress: ${SP_LINES}行 | $NEXT"}
EOF
