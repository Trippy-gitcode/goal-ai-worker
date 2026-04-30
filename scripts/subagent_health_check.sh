#!/bin/sh
# scripts/subagent_health_check.sh
# MISSION-G49-PKG-FINAL-V2 Phase 0（§2.25.20 障害検出と暴走停止）
#
# 用途:
#   subagent の健全性を検査。タイムアウト / エラー応答 / 出力欠落を検知し
#   ステータス JSON を logs/subagent_health.log に追記。連続 3 失敗で
#   instructions/po_alerts.md に通知エントリ追加。
#
# 引数:
#   --subagent-id <ID>          必須
#   --status <running|completed|failed_timeout|failed_error|failed_missing_output>
#                               必須
#   --note <free text>          任意
#   --report-file <path>        任意（出力欠落チェック対象）
#
# 出力（stdout）:
#   OK\t<state>   または   ALERT\t<state>\tconsecutive_failures=<N>
#
# exit code:
#   0: 正常
#   1: ALERT（連続失敗 3 回到達、PO 通知発生）
#
# 根拠:
#   - core_spec.md §5 機械強制 hook 仕様 (legacy v34 spec §2.25.20.1〜.4, archived 2026-04-30)

set -eu

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

LOG_FILE="${REPO_ROOT}/logs/subagent_health.log"
ALERT_FILE="${REPO_ROOT}/instructions/po_alerts.md"
FAIL_STATE="${HOME}/.dev-system/subagent_failures"
FAIL_THRESHOLD=3

mkdir -p "${REPO_ROOT}/logs" "$(dirname "$FAIL_STATE")"

SUBAGENT_ID=""
STATUS=""
NOTE=""
REPORT_FILE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --subagent-id) SUBAGENT_ID="${2:-}"; shift 2 ;;
    --status) STATUS="${2:-}"; shift 2 ;;
    --note) NOTE="${2:-}"; shift 2 ;;
    --report-file) REPORT_FILE="${2:-}"; shift 2 ;;
    *) shift ;;
  esac
done

if [ -z "$SUBAGENT_ID" ] || [ -z "$STATUS" ]; then
  echo "[subagent_health_check] --subagent-id と --status は必須" >&2
  exit 2
fi

# 出力欠落チェック（report-file 指定時）
DERIVED_STATUS="$STATUS"
if [ -n "$REPORT_FILE" ]; then
  if [ ! -f "$REPORT_FILE" ] || [ ! -s "$REPORT_FILE" ]; then
    DERIVED_STATUS="failed_missing_output"
  fi
fi

TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# JSON ライク 1 行で記録（jq 不要）
ESCAPED_NOTE=$(printf '%s' "$NOTE" | sed 's/"/\\"/g')
printf '{"ts":"%s","subagent_id":"%s","status":"%s","note":"%s"}\n' \
  "$TS" "$SUBAGENT_ID" "$DERIVED_STATUS" "$ESCAPED_NOTE" >>"$LOG_FILE"

# 失敗カウンタ更新
case "$DERIVED_STATUS" in
  failed_*)
    COUNT=0
    [ -f "$FAIL_STATE" ] && COUNT=$(head -1 "$FAIL_STATE" 2>/dev/null || echo 0)
    case "$COUNT" in ''|*[!0-9]*) COUNT=0 ;; esac
    COUNT=$((COUNT + 1))
    printf '%s\n' "$COUNT" >"$FAIL_STATE"
    if [ "$COUNT" -ge "$FAIL_THRESHOLD" ]; then
      # PO 通知
      if [ ! -f "$ALERT_FILE" ]; then
        printf '# PO Alerts\n\n> §2.25.20.3 連続失敗 fail-open 通知記録\n\n' >"$ALERT_FILE"
      fi
      printf -- '- %s subagent=%s status=%s consecutive=%s note=%s\n' \
        "$TS" "$SUBAGENT_ID" "$DERIVED_STATUS" "$COUNT" "$NOTE" >>"$ALERT_FILE"
      printf 'ALERT\t%s\tconsecutive_failures=%s\n' "$DERIVED_STATUS" "$COUNT"
      exit 1
    fi
    printf 'OK\t%s\tconsecutive_failures=%s\n' "$DERIVED_STATUS" "$COUNT"
    exit 0
    ;;
  completed)
    # 成功で失敗カウンタリセット
    printf '0\n' >"$FAIL_STATE"
    printf 'OK\t%s\n' "$DERIVED_STATUS"
    exit 0
    ;;
  *)
    printf 'OK\t%s\n' "$DERIVED_STATUS"
    exit 0
    ;;
esac
