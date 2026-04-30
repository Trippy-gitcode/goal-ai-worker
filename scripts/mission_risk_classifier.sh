#!/bin/sh
# scripts/mission_risk_classifier.sh — 単一ミッションブロック入力のリスク判定
# 根拠: R2.2 §2.5 υcrit / §3.1 入力契約 SSOT
# POSIX sh 互換（§3.7）。bash 拡張禁止。
#
# 使い方: mission_risk_classifier.sh <mission_block_file>
# 出力: high / low を stdout

set -eu
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/lib/risk_match.sh"

MISSION_FILE="${1:?Usage: $0 <mission_block_file>}"
[ -f "$MISSION_FILE" ] || { echo "ERROR: $MISSION_FILE not found" >&2; exit 2; }

# 対象ファイル抽出（形式1: "> 対象ファイル: a.js, b.js" / 形式2: 複数行リスト）
target_files=$(awk '
  /^>?[[:space:]]*対象ファイル:/ {
    in_target = 1
    line = $0
    sub(/^>?[[:space:]]*対象ファイル:[[:space:]]*/, "", line)
    if (length(line) > 0) {
      n = split(line, arr, /,[[:space:]]*/)
      for (i = 1; i <= n; i++) if (arr[i] != "") print arr[i]
    }
    next
  }
  in_target && /^>?[[:space:]]*-[[:space:]]+/ {
    line = $0
    sub(/^>?[[:space:]]*-[[:space:]]+/, "", line)
    if (length(line) > 0) print line
    next
  }
  in_target && /^$/ { in_target = 0 }
  in_target && !/^>/ { in_target = 0 }
' "$MISSION_FILE")

[ -z "$target_files" ] && { echo "low"; exit 0; }

for f in $target_files; do
  if is_risk_path "$f" > /dev/null 2>&1; then
    echo "high"; exit 0
  fi
done

echo "low"
