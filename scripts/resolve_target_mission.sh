#!/bin/sh
# scripts/resolve_target_mission.sh — MISSION_ID 解決 SSOT
# 根拠: R2.2 §3.1 入力契約 SSOT / R3-CRIT-B（context 別ルール統一）
# POSIX sh 互換（§3.7）。bash 拡張禁止。
#
# 使い方: resolve_target_mission.sh <deploy|canopy|classifier> [mission_file]
#   deploy     = READY_FOR_DEPLOY 優先、複数時は最新（出現順で最下位）、なければ exit 1
#   canopy     = IN_PROGRESS 優先、なければ QUEUED の先頭
#   classifier = $2=mission_file を入力、session_progress 全体は読まない

set -eu
CONTEXT="${1:?Usage: $0 <deploy|canopy|classifier> [mission_file]}"
PROGRESS="${PROGRESS:-instructions/session_progress.md}"

case "$CONTEXT" in
  deploy)
    MID=$(awk '
      /^### [A-Z][A-Z0-9_-]*:/ { sub(/^### /,""); sub(/:.*$/,""); mid=$0 }
      /^- \*\*STATUS:\*\*[[:space:]]*READY_FOR_DEPLOY/ { last=mid }
      END { if (last != "") print last; else exit 1 }
    ' "$PROGRESS") || { echo "ERROR: deploy context: no READY_FOR_DEPLOY mission found" >&2; exit 1; }
    ;;
  canopy)
    MID=$(awk '
      /^### [A-Z][A-Z0-9_-]*:/ { sub(/^### /,""); sub(/:.*$/,""); mid=$0 }
      /^- \*\*STATUS:\*\*[[:space:]]*IN_PROGRESS/ { print mid; exit }
      /^- \*\*STATUS:\*\*[[:space:]]*QUEUED/ && !q_found { q_mid=mid; q_found=1 }
      END { if (q_found) print q_mid }
    ' "$PROGRESS")
    [ -n "$MID" ] || { echo "ERROR: canopy context: no IN_PROGRESS or QUEUED mission" >&2; exit 1; }
    ;;
  classifier)
    MISSION_FILE="${2:?Usage: $0 classifier <mission_file>}"
    [ -f "$MISSION_FILE" ] || { echo "ERROR: $MISSION_FILE not found" >&2; exit 2; }
    MID=$(awk '/^### [A-Z][A-Z0-9_-]*:/ { sub(/^### /,""); sub(/:.*$/,""); print; exit }' "$MISSION_FILE")
    ;;
  *)
    echo "ERROR: unknown context: $CONTEXT (expected: deploy|canopy|classifier)" >&2
    exit 2
    ;;
esac

printf '%s\n' "$MID"
