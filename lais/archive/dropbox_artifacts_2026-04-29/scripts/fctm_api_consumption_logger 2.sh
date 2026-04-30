#!/bin/sh
# scripts/fctm_api_consumption_logger.sh
# PATCH-FCTM-API-REDUCTION（2026-04-26）: API 消費計測（Step 5）
#
# 用途:
#   subagent 起動 / persona_review / vote_dispatcher 各呼出時に推定トークン数を記録。
#   月次レポート自動生成（毎月 1 日 cron で集計、当面は手動コマンド）。
#
# 引数:
#   --event <name>     必須（subagent_start | persona_review | vote_dispatch | claude_p）
#   --tokens <num>     推定トークン数（任意、未指定時は -）
#   --model <id>       モデル ID（任意、例: haiku, sonnet）
#   --tier <name>      lite | hybrid | full（任意）
#   --note <text>      自由メモ（任意、120 字まで）
#
# 出力:
#   logs/api_consumption.log（TAB 区切り 6 列、1 行 1 イベント）
#     ts | event | tokens | model | tier | note
#
# 月次レポート:
#   --report YYYY-MM   指定月の集計サマリー（イベント別合計トークン）を stdout へ
#
# 根拠:
#   - lais/verify/parallel_speedup_review_2026-04-26.md FCTM Step 5
#   - PATCH-FCTM-API-REDUCTION

set -eu

. "$(dirname "$0")/lib/resolve_repo_root.sh"
if ! REPO_ROOT="$(resolve_repo_root)" || [ -z "${REPO_ROOT:-}" ] || [ ! -d "${REPO_ROOT}" ]; then
  echo "ERROR: fctm_api_consumption_logger could not resolve REPO_ROOT" >&2
  exit 0  # fail-open
fi

LOG_FILE="${REPO_ROOT}/logs/api_consumption.log"
mkdir -p "${REPO_ROOT}/logs"

EVENT=""
TOKENS="-"
MODEL="-"
TIER="-"
NOTE="-"
REPORT_MONTH=""

while [ $# -gt 0 ]; do
  case "$1" in
    --event)  shift; EVENT="${1:-}" ;;
    --tokens) shift; TOKENS="${1:-}" ;;
    --model)  shift; MODEL="${1:-}" ;;
    --tier)   shift; TIER="${1:-}" ;;
    --note)   shift; NOTE="${1:-}" ;;
    --report) shift; REPORT_MONTH="${1:-}" ;;
    *) ;;
  esac
  shift || true
done

ts() { date -u +%Y-%m-%dT%H:%M:%SZ; }

# --- レポートモード ---------------------------------------------------------
if [ -n "$REPORT_MONTH" ]; then
  if [ ! -f "$LOG_FILE" ]; then
    echo "[fctm_logger] $LOG_FILE 不在、レポート生成不可"
    exit 0
  fi
  echo "# FCTM API 消費レポート（${REPORT_MONTH}）"
  echo
  echo "## イベント別集計"
  awk -F'\t' -v m="$REPORT_MONTH" '
    $1 ~ "^"m {
      cnt[$2]++
      if ($3 != "-" && $3 ~ /^[0-9]+$/) tok[$2] += $3
    }
    END {
      for (e in cnt) {
        printf "- %s: %d 回 / 推定トークン %d\n", e, cnt[e], tok[e]+0
      }
    }
  ' "$LOG_FILE"
  echo
  echo "## モデル / tier 別集計"
  awk -F'\t' -v m="$REPORT_MONTH" '
    $1 ~ "^"m {
      key = $4 "/" $5
      cnt[key]++
      if ($3 != "-" && $3 ~ /^[0-9]+$/) tok[key] += $3
    }
    END {
      for (k in cnt) {
        printf "- %s: %d 回 / 推定トークン %d\n", k, cnt[k], tok[k]+0
      }
    }
  ' "$LOG_FILE"
  exit 0
fi

# --- 通常モード（イベント記録）---------------------------------------------
if [ -z "$EVENT" ]; then
  echo "[fctm_logger] --event 必須" >&2
  exit 1
fi

# NOTE 120 字制限
NOTE_TRIM=$(printf '%s' "$NOTE" | head -c 120 | tr '\t' ' ' | tr '\n' ' ')

# レコード書込
printf '%s\t%s\t%s\t%s\t%s\t%s\n' \
  "$(ts)" "$EVENT" "${TOKENS:-}" "${MODEL:-}" "${TIER:-}" "${NOTE_TRIM:-}" \
  >>"$LOG_FILE" 2>/dev/null || true

# 古いログ清掃（4 週間保持、5MB rotate）
if [ -f "$LOG_FILE" ]; then
  SZ=$(wc -c <"$LOG_FILE" 2>/dev/null | tr -d ' ')
  if [ "${SZ:-0}" -gt 5242880 ]; then
    ROT="${LOG_FILE}.$(date -u +%Y%m%d).gz"
    gzip -c "$LOG_FILE" > "$ROT" 2>/dev/null || true
    : > "$LOG_FILE"
  fi
  find "$(dirname "$LOG_FILE")" -name "$(basename "$LOG_FILE").*.gz" -mtime +28 -delete 2>/dev/null || true
fi

exit 0
