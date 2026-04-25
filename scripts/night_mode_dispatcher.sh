#!/bin/sh
# scripts/night_mode_dispatcher.sh
# MISSION-G49-PKG-FINAL-V2 Phase 0（§2.25.22 夜間自動着手モード）
#
# 用途:
#   多重ガード（§2.25.22.6）を全 PASS でのみ subagent を起動。
#   時刻判定 + フラグ + /usage + auto_eligible タスク存在確認。
#   起動条件不足時は exit 0 + ステータスを stdout、副作用なし。
#
# 引数:
#   --dry-run             ガード判定のみ、subagent 起動しない（既定）
#   --execute             ガード PASS で subagent dispatch（caller 側 wrapper）
#   --force-time HHMM     時刻モック（テスト用）
#   --usage-percent N     /usage 残量モック（既定: 環境変数 USAGE_PERCENT）
#
# 出力（stdout）:
#   GO\t<reason>
#   SKIP\t<reason>\t<details>
#
# exit code:
#   0: 通常（GO / SKIP どちらでも 0）
#   2: ガード違反疑義（fail-closed、起動禁止）
#
# 根拠:
#   - lais/verify/dev_system_v34_package.md §2.25.22.1〜.6

set -eu

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

CONSENT_FLAG="${REPO_ROOT}/instructions/night_mode_consent.flag"
PO_OFFLINE_FLAG="${REPO_ROOT}/instructions/po_offline.flag"
IN_FLIGHT="${REPO_ROOT}/instructions/in_flight_topics.md"
ALERTS_LOG="${REPO_ROOT}/logs/night_mode_alerts.log"

mkdir -p "${REPO_ROOT}/logs"

DRY_RUN=1
FORCE_TIME=""
USAGE_PERCENT="${USAGE_PERCENT:-}"

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --execute) DRY_RUN=0; shift ;;
    --force-time) FORCE_TIME="${2:-}"; shift 2 ;;
    --usage-percent) USAGE_PERCENT="${2:-}"; shift 2 ;;
    *) shift ;;
  esac
done

# (1) 時刻判定（JST 23:00-06:00）
NOW_HHMM=""
if [ -n "$FORCE_TIME" ]; then
  NOW_HHMM="$FORCE_TIME"
else
  # JST = UTC+9。BSD/Linux date 両対応で TZ 指定
  NOW_HHMM=$(TZ='Asia/Tokyo' date +%H%M 2>/dev/null || date +%H%M)
fi

case "$NOW_HHMM" in
  ''|*[!0-9]*) NOW_HHMM=0000 ;;
esac

# 8 進数解釈回避: 先頭ゼロを除去して 10 進整数として比較
# `0800` → 800, `0700` → 700, `2330` → 2330
NOW_INT=$(printf '%s' "$NOW_HHMM" | sed 's/^0*//')
[ -z "$NOW_INT" ] && NOW_INT=0
case "$NOW_INT" in
  ''|*[!0-9]*) NOW_INT=0 ;;
esac

# 23:00-23:59 (>=2300) または 00:00-05:59 (<600)
TIME_OK=0
if [ "$NOW_INT" -ge 2300 ] || [ "$NOW_INT" -lt 600 ]; then
  TIME_OK=1
fi

if [ "$TIME_OK" -ne 1 ]; then
  printf 'SKIP\ttime\thhmm=%s\trange=2300-0559\n' "$NOW_HHMM"
  exit 0
fi

# (2) night_mode_consent.flag 存在
if [ ! -f "$CONSENT_FLAG" ]; then
  printf 'SKIP\tconsent-flag-missing\t%s\n' "$CONSENT_FLAG"
  exit 0
fi

# (3) po_offline.flag 存在
if [ ! -f "$PO_OFFLINE_FLAG" ]; then
  printf 'SKIP\tpo-offline-flag-missing\t%s\n' "$PO_OFFLINE_FLAG"
  exit 0
fi

# (4) /usage 残量 30% 以上
USAGE_OK=0
case "$USAGE_PERCENT" in
  ''|*[!0-9]*)
    # /usage 取得不可なら fail-closed
    printf 'SKIP\tusage-unknown\tset USAGE_PERCENT env or --usage-percent\n'
    exit 0
    ;;
  *)
    if [ "$USAGE_PERCENT" -ge 30 ]; then
      USAGE_OK=1
    fi
    ;;
esac

if [ "$USAGE_OK" -ne 1 ]; then
  printf 'SKIP\tusage-low\tpercent=%s\n' "$USAGE_PERCENT"
  exit 0
fi

# (5) auto_eligible: true の pending タスクが存在するか
if [ ! -f "$IN_FLIGHT" ]; then
  printf 'SKIP\tin-flight-missing\t%s\n' "$IN_FLIGHT"
  exit 0
fi

# pending かつ auto_eligible: true を **同一 TASK ブロック内** で AND 判定
# `## TASK-...` 見出しから次の `## ` または `---` までを 1 ブロックと扱う
# テンプレート行（`## TASK-<ID>` の `<` 含み）は除外
ELIGIBLE_COUNT=$(awk '
  function reset() { in_block=0; has_pending=0; has_eligible=0 }
  BEGIN { reset(); count=0 }
  /^## TASK-/ {
    if (in_block && has_pending && has_eligible) count++
    reset()
    if ($0 ~ /<.*>/) { next }   # テンプレ `## TASK-<ID>` を除外
    in_block=1
    next
  }
  /^## / && !/^## TASK-/ {
    if (in_block && has_pending && has_eligible) count++
    reset()
    next
  }
  /^---/ {
    if (in_block && has_pending && has_eligible) count++
    reset()
    next
  }
  # 正規 status 値のみ受理: `status: pending` 形式（pending 単独、列挙テンプレ除外）
  in_block && /^- \*\*status\*\*:[[:space:]]*pending[[:space:]]*$/ { has_pending=1 }
  # `auto_eligible: true` 単独受理（`true / false` 列挙テンプレ除外）
  in_block && /^- \*\*auto_eligible\*\*:[[:space:]]*true/ {
    if ($0 !~ /\/[[:space:]]*false/) has_eligible=1
  }
  END {
    if (in_block && has_pending && has_eligible) count++
    print count
  }
' "$IN_FLIGHT" 2>/dev/null || echo 0)

case "$ELIGIBLE_COUNT" in
  ''|*[!0-9]*) ELIGIBLE_COUNT=0 ;;
esac

if [ "$ELIGIBLE_COUNT" -le 0 ]; then
  printf 'SKIP\tno-eligible-task\teligible_blocks=%s\n' "$ELIGIBLE_COUNT"
  exit 0
fi
P_COUNT="$ELIGIBLE_COUNT"

# 全ガード PASS
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
if [ "$DRY_RUN" -eq 1 ]; then
  printf 'GO\tdry-run\thhmm=%s\tusage=%s\teligible_pending=%s\n' \
    "$NOW_HHMM" "$USAGE_PERCENT" "$P_COUNT"
  printf '%s\tGO\tdry-run\n' "$TS" >>"$ALERTS_LOG" 2>/dev/null || true
  exit 0
fi

printf 'GO\texecute\thhmm=%s\tusage=%s\teligible_pending=%s\n' \
  "$NOW_HHMM" "$USAGE_PERCENT" "$P_COUNT"
printf '%s\tGO\texecute\n' "$TS" >>"$ALERTS_LOG" 2>/dev/null || true
# 実行は caller 側 wrapper（本スクリプトは判定責務のみ、§2.25.16.2 scripts 領域の薄い起点）
exit 0
