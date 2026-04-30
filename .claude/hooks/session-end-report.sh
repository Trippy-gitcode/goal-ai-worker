#!/bin/bash
# SessionEnd hook: セッション終了時にgit diff statをログに記録
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

LOG="instructions/results/session_end_log.txt"
echo "=== Session End $(date '+%Y-%m-%d %H:%M:%S') ===" >> "$LOG"
echo "Branch: $(git branch --show-current 2>/dev/null)" >> "$LOG"
git diff --stat >> "$LOG" 2>/dev/null || true
echo "---" >> "$LOG"
