#!/bin/sh
# scripts/verify_hooks.sh — G13: pre-commit hook 発火確認
# 根拠: R2.2 §2.24 θG13 / R3-CRIT-D / §3.3 logs/canopy_fire.log
# POSIX sh 互換（§3.7）。bash 拡張禁止。
#
# 使い方: verify_hooks.sh [timewindow_hours]
# PASS: 現 HEAD SHA が logs/canopy_fire.log の timewindow_hours 以内のエントリに存在
# FAIL: エントリ欠落 = hook バイパス疑い（--no-verify 使用など）
# 発火点: (1) pre-push hook / (2) nightly self-check

set -eu
WINDOW_HOURS="${1:-24}"
LOG="logs/canopy_fire.log"
[ -f "$LOG" ] || { echo "FAIL: G13 $LOG not found（pre-commit hook 未設定 or 未発火）" >&2; exit 1; }

CURRENT_SHA=$(git rev-parse HEAD)
NOW_EPOCH=$(date -u +%s)
WINDOW_SEC=$((WINDOW_HOURS * 3600))

FOUND=$(awk -v sha="$CURRENT_SHA" -v now="$NOW_EPOCH" -v win="$WINDOW_SEC" '
  {
    iso=$1; sub(/\.[0-9]+Z$/, "Z", iso)
    cmd = "date -j -u -f \"%Y-%m-%dT%H:%M:%SZ\" \"" iso "\" +%s 2>/dev/null || date -u -d \"" iso "\" +%s 2>/dev/null"
    cmd | getline epoch; close(cmd)
    if (epoch+0 > 0 && (now - epoch) <= win && $2 == sha) { print; exit }
  }
' "$LOG")

if [ -z "$FOUND" ]; then
  echo "FAIL: G13 現 HEAD $CURRENT_SHA の pre-commit 発火記録が ${WINDOW_HOURS}h 以内に見つからない（hook バイパス疑い、--no-verify 使用など）" >&2
  exit 1
fi
echo "OK: G13 pre-commit hook 発火確認（SHA=$CURRENT_SHA, ${WINDOW_HOURS}h 以内）"
