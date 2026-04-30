#!/bin/sh
# scripts/extract_cmd.sh — mission block からの cmd 抽出 SSOT
# 根拠: R2.2 §3.4 cmd-3区分 SSOT / PATCH-11 / R3-H-05
# POSIX sh 互換（§3.7）。bash 拡張禁止。
#
# 使い方: extract_cmd.sh <mission_file> <cmd_name>
#   cmd_name: cmd-unit | cmd-e2e | cmd-realworld
# 出力: 値（空文字列なら行なし = 省略扱い）

set -eu
MISSION_FILE="${1:?Usage: $0 <mission_file> <cmd_name>}"
CMD_NAME="${2:?Usage: $0 <mission_file> <cmd_name>}"
[ -f "$MISSION_FILE" ] || { echo "ERROR: $MISSION_FILE not found" >&2; exit 2; }

case "$CMD_NAME" in
  cmd-unit|cmd-e2e|cmd-realworld) ;;
  *) echo "ERROR: invalid cmd_name: $CMD_NAME (expected: cmd-unit|cmd-e2e|cmd-realworld)" >&2; exit 2 ;;
esac

awk -v key="$CMD_NAME" '
  BEGIN { pat = "^[[:space:]]*" key ":[[:space:]]*" }
  $0 ~ pat {
    sub(pat, "", $0)
    print
    exit
  }
' "$MISSION_FILE"
