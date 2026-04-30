#!/bin/sh
# scripts/extract_mission_block.sh — session_progress.md から該当ミッションブロックのみ切り出し
# 根拠: R2.2 §3.1 入力契約 SSOT / §2.5 υcrit
# POSIX sh 互換（§3.7）。bash 拡張禁止。
#
# 使い方: extract_mission_block.sh <MISSION_ID> [progress_file] > /tmp/mission_${MISSION_ID}.md

set -eu
MISSION_ID="${1:?Usage: $0 <MISSION_ID> [progress_file]}"
PROGRESS="${2:-instructions/session_progress.md}"
[ -f "$PROGRESS" ] || { echo "ERROR: $PROGRESS not found" >&2; exit 2; }

awk -v mid="$MISSION_ID" '
  $0 ~ "^### " mid ":" { in_block=1; print; next }
  in_block && /^### [A-Z][A-Z0-9_-]*:/ { exit }
  in_block { print }
' "$PROGRESS"
