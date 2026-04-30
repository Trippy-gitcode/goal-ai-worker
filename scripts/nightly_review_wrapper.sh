#!/bin/sh
# GENERATED: DO NOT MODIFY
# scripts/nightly_review_wrapper.sh
#
# derived-from: SUBAGENT-DEVSYS-LAUNCHD-V1
# spec-ref:
#   - core_spec.md §9 (夜間自動着手モード) / §9.3 (障害時動作) / §9.4 (朝報告)
#   - docs/po-decisions.md PO-DIRECTIVE-002 (期間 2026-04-29 〜 2026-05-20、22 夜)
#   - docs/decision_log.md PD-009 (launchd 採用)
# app-independence: APP_REPO_ROOT_ENV / APP_REPO_MARKER / APP_REPO_CANDIDATES
#                   (scripts/lib/resolve_repo_root.sh 経由)
#
# 用途:
#   launchd LaunchAgent (com.dev-system.nightly-review / com.dev-system.nightly-summary)
#   が発火する実体 wrapper。モードに応じて動作切替:
#     --mode=nightly-review   23:00 JST 起動: nightly_spec_review.sh + nightly_gpt_crossreview.sh
#     --mode=morning-summary  06:00 JST 起動: 前夜 review の 5 行サマリー追記
#
#   期間外 (今日 >= EXPIRY_DATE) は self-uninstall 判定:
#     EXPIRY_DATE 以降にこの wrapper が発火されたら
#       1. ログに "expired / self-uninstall 開始" 記録
#       2. launchctl unload ~/Library/LaunchAgents/com.dev-system.nightly-{review,summary}.plist
#       3. plist 2 種を削除
#       4. pmset schedule cancelall (本ジョブ用 wake は 5/20 が最終なので残らない想定だが念のため)
#       5. exit 0
#
#   --no-execute / --mock オプションで dry-run 可能 (テスト時)。
#
# 引数:
#   --mode <nightly-review|morning-summary>   発火モード (必須)
#   --date YYYY-MM-DD                         対象日付 override (既定: today)
#   --mock                                    実 invoke せずに動作確認
#   --no-execute                              実コマンド (claude / 子 script) skip、判定のみ
#   --help                                    ヘルプ表示
#
# 環境変数:
#   APP_REPO_ROOT                             dev-system or 生成 App のルート
#   NIGHTLY_REVIEW_EXPIRY_DATE                既定 2026-05-21 (この日以降は self-uninstall)
#   NIGHTLY_SUMMARY_EXPIRY_DATE               既定 2026-05-22
#   NIGHTLY_REVIEW_TZ                         既定 Asia/Tokyo
#
# Exit codes:
#   0 = SUCCESS / SKIPPED / EXPIRED-UNINSTALLED
#   1 = 引数 / 環境エラー
#   2 = 子 script (nightly_spec_review / nightly_gpt_crossreview) FAIL
#   3 = self-uninstall 部分失敗

set -eu

# --- REPO_ROOT 解決 (App 非依存化) -------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "${SCRIPT_DIR}/lib/resolve_repo_root.sh" ]; then
  # shellcheck disable=SC1091
  . "${SCRIPT_DIR}/lib/resolve_repo_root.sh"
fi

REPO_ROOT=""
if command -v resolve_repo_root >/dev/null 2>&1; then
  REPO_ROOT="$(resolve_repo_root 2>/dev/null || true)"
fi
if [ -z "${REPO_ROOT:-}" ]; then
  # fallback: SCRIPT_DIR の親
  REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
fi
cd "$REPO_ROOT"

# --- 引数パース --------------------------------------------------------------
MODE=""
TARGET_DATE=""
MOCK=0
NO_EXECUTE=0

show_help() {
  cat <<HLP
nightly_review_wrapper.sh - 夜間仕様書総点検ルーティン launchd wrapper
Usage:
  nightly_review_wrapper.sh --mode <nightly-review|morning-summary> [options]
Options:
  --mode <mode>           nightly-review (23:00) | morning-summary (06:00)
  --date YYYY-MM-DD       対象日付 override (既定: today)
  --mock                  実 invoke せずに動作確認
  --no-execute            実コマンド skip、判定のみ
  --help                  本ヘルプ
Examples:
  nightly_review_wrapper.sh --mode=nightly-review
  nightly_review_wrapper.sh --mode=morning-summary --date 2026-04-30
  nightly_review_wrapper.sh --date 2026-05-21 --mock           # self-uninstall 確認
  nightly_review_wrapper.sh --date 2026-04-29 --mock --no-execute
HLP
}

while [ $# -gt 0 ]; do
  case "$1" in
    --mode=*) MODE="${1#--mode=}" ;;
    --mode) shift; MODE="${1:-}" ;;
    --date) shift; TARGET_DATE="${1:-}" ;;
    --date=*) TARGET_DATE="${1#--date=}" ;;
    --mock) MOCK=1 ;;
    --no-execute) NO_EXECUTE=1 ;;
    --help|-h) show_help; exit 0 ;;
    *) ;;
  esac
  shift || true
done

# モード未指定時は nightly-review (launchd plist 既定との整合)
if [ -z "${MODE:-}" ]; then
  MODE="nightly-review"
fi

case "$MODE" in
  nightly-review|morning-summary) ;;
  *)
    echo "ERROR: --mode は nightly-review | morning-summary 必須 (受領=${MODE})" >&2
    exit 1
    ;;
esac

# --- 日付決定 (Asia/Tokyo 基準) ---------------------------------------------
# launchd は local time で発火するため TZ=Asia/Tokyo を明示
NIGHTLY_TZ="${NIGHTLY_REVIEW_TZ:-Asia/Tokyo}"
if [ -z "${TARGET_DATE:-}" ]; then
  TARGET_DATE="$(TZ="$NIGHTLY_TZ" date +%Y-%m-%d)"
fi

case "$TARGET_DATE" in
  [0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]) ;;
  *)
    echo "ERROR: --date は YYYY-MM-DD 形式必須 (受領=${TARGET_DATE})" >&2
    exit 1
    ;;
esac

# --- ログ出力先 ---------------------------------------------------------------
LOG_DIR="${REPO_ROOT}/logs"
mkdir -p "$LOG_DIR"
WRAPPER_LOG="${LOG_DIR}/nightly_review_wrapper.log"

log_line() {
  # 共通ログ出力 (timestamp + mode + date + message)
  printf '[%s] mode=%s date=%s %s\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    "$MODE" \
    "$TARGET_DATE" \
    "$*" >> "$WRAPPER_LOG"
}

log_line "START mock=${MOCK} no_execute=${NO_EXECUTE} repo_root=${REPO_ROOT}"

# --- 期間判定 (5/21 以降は self-uninstall) ----------------------------------
# 終了日は環境変数で override 可、既定は PO-DIRECTIVE-002 終了日翌日 = 2026-05-21
EXPIRY_DATE="${NIGHTLY_REVIEW_EXPIRY_DATE:-2026-05-21}"
START_DATE="${NIGHTLY_REVIEW_START_DATE:-2026-04-29}"

# epoch 変換 (macOS / Linux fallback)
to_epoch() {
  _d="$1"
  date -j -u -f "%Y-%m-%d" "$_d" +%s 2>/dev/null \
    || date -u -d "$_d" +%s 2>/dev/null \
    || echo ""
}

TARGET_EPOCH=$(to_epoch "$TARGET_DATE")
START_EPOCH=$(to_epoch "$START_DATE")
EXPIRY_EPOCH=$(to_epoch "$EXPIRY_DATE")

if [ -z "$TARGET_EPOCH" ] || [ -z "$START_EPOCH" ] || [ -z "$EXPIRY_EPOCH" ]; then
  log_line "FAIL date epoch 変換失敗"
  echo "ERROR: 日付 epoch 変換失敗" >&2
  exit 1
fi

# self-uninstall 判定 (今日 >= EXPIRY_DATE)
if [ "$TARGET_EPOCH" -ge "$EXPIRY_EPOCH" ]; then
  log_line "EXPIRED ${TARGET_DATE} >= ${EXPIRY_DATE}, self-uninstall 開始"
  echo "[wrapper] expired (${TARGET_DATE} >= ${EXPIRY_DATE}), 終了日到達のため self-uninstall 実行"

  # mock / no-execute 時は判定のみで exit
  if [ "$MOCK" = "1" ] || [ "$NO_EXECUTE" = "1" ]; then
    log_line "EXPIRED MOCK self-uninstall 模擬完了"
    echo "[wrapper] mock=${MOCK} no_execute=${NO_EXECUTE}, self-uninstall は dry-run スキップ"
    exit 0
  fi

  # uninstall script 経路に委譲 (実 launchctl unload + plist 削除)
  UNINSTALL_SH="${REPO_ROOT}/scripts/nightly_review_uninstall.sh"
  if [ -x "$UNINSTALL_SH" ]; then
    if "$UNINSTALL_SH" --reason="EXPIRED:${TARGET_DATE}" >> "$WRAPPER_LOG" 2>&1; then
      log_line "EXPIRED self-uninstall PASS"
      echo "[wrapper] self-uninstall 成功"
      exit 0
    else
      log_line "EXPIRED self-uninstall FAIL"
      echo "[wrapper] self-uninstall 部分失敗 (詳細は ${WRAPPER_LOG})" >&2
      exit 3
    fi
  else
    log_line "EXPIRED uninstall script 不在 (${UNINSTALL_SH})"
    echo "[wrapper] uninstall script 不在、手動 launchctl unload 必須" >&2
    exit 3
  fi
fi

# 期間前 (今日 < START_DATE) も skip
if [ "$TARGET_EPOCH" -lt "$START_EPOCH" ]; then
  log_line "SKIPPED ${TARGET_DATE} < ${START_DATE} (期間前)"
  echo "[wrapper] skipped: ${TARGET_DATE} は START_DATE (${START_DATE}) 前"
  exit 0
fi

# --- mode=nightly-review (23:00 JST) -----------------------------------------
if [ "$MODE" = "nightly-review" ]; then
  REVIEW_SH="${REPO_ROOT}/scripts/nightly_spec_review.sh"
  GPT_SH="${REPO_ROOT}/scripts/nightly_gpt_crossreview.sh"
  PROMPT_TPL="${REPO_ROOT}/templates/nightly_invoke_prompt.template.md"
  REVIEW_OUT="${REPO_ROOT}/verify/nightly_review_${TARGET_DATE}.md"

  log_line "INVOKE nightly-review pipeline"

  # mock / no-execute 時は実行せずに対象だけログ
  if [ "$MOCK" = "1" ] || [ "$NO_EXECUTE" = "1" ]; then
    echo "[wrapper] mock/no-execute: would invoke nightly_spec_review.sh --date ${TARGET_DATE}"
    echo "[wrapper] mock/no-execute: would invoke nightly_gpt_crossreview.sh --input verify/nightly_review_${TARGET_DATE}.md"
    log_line "MOCK would invoke nightly_spec_review + nightly_gpt_crossreview"
    exit 0
  fi

  EXIT_CODE=0

  # claude CLI 経由で発火 (実 wiring 後): templates/nightly_invoke_prompt.template.md を
  # 展開して claude セッションを起動。本実装は子 script 直接呼出が基本動作 (mock 段階の
  # nightly_spec_review.sh も子 script 呼出で完結)。claude CLI 経路は環境変数で opt-in。
  if [ -n "${NIGHTLY_USE_CLAUDE_CLI:-}" ] && command -v claude >/dev/null 2>&1; then
    if [ -f "$PROMPT_TPL" ]; then
      # placeholder 置換 (簡易): {{REVIEW_DATE}} → TARGET_DATE のみ置換、
      # ROTATION_ID / PERSONAS は claude セッション内で nightly_spec_review.sh が解決
      INVOKE_PROMPT=$(sed "s/{{REVIEW_DATE}}/${TARGET_DATE}/g" "$PROMPT_TPL")
      log_line "CLAUDE_CLI invoke (prompt size=$(printf '%s' "$INVOKE_PROMPT" | wc -c | tr -d ' '))"
      if claude -p "$INVOKE_PROMPT" >> "$WRAPPER_LOG" 2>&1; then
        log_line "CLAUDE_CLI PASS"
      else
        log_line "CLAUDE_CLI FAIL"
        EXIT_CODE=2
      fi
    else
      log_line "CLAUDE_CLI prompt template 不在 (${PROMPT_TPL})"
      EXIT_CODE=1
    fi
  else
    # 直接子 script 呼出経路 (mock 段階の既定動作)
    if [ -x "$REVIEW_SH" ]; then
      if "$REVIEW_SH" --date "$TARGET_DATE" >> "$WRAPPER_LOG" 2>&1; then
        log_line "nightly_spec_review PASS"
      else
        log_line "nightly_spec_review FAIL"
        EXIT_CODE=2
      fi
    else
      log_line "nightly_spec_review.sh 不在 (${REVIEW_SH})"
      EXIT_CODE=2
    fi

    if [ "$EXIT_CODE" = "0" ] && [ -x "$GPT_SH" ] && [ -f "$REVIEW_OUT" ]; then
      if "$GPT_SH" --input "$REVIEW_OUT" >> "$WRAPPER_LOG" 2>&1; then
        log_line "nightly_gpt_crossreview PASS"
      else
        log_line "nightly_gpt_crossreview FAIL (review は完了済)"
        # GPT review 失敗は致命ではない (review レポートは既に生成済)
        # exit_code は 0 のまま、guardrail BLOCK ケースもここに該当
      fi
    fi
  fi

  log_line "END nightly-review exit=${EXIT_CODE}"
  exit "$EXIT_CODE"
fi

# --- mode=morning-summary (06:00 JST) ---------------------------------------
if [ "$MODE" = "morning-summary" ]; then
  # 前夜分の日付 (yesterday)
  YESTERDAY=$(TZ="$NIGHTLY_TZ" date -j -v-1d -f "%Y-%m-%d" "$TARGET_DATE" +%Y-%m-%d 2>/dev/null \
    || TZ="$NIGHTLY_TZ" date -d "${TARGET_DATE} -1 day" +%Y-%m-%d 2>/dev/null \
    || echo "$TARGET_DATE")

  REVIEW_OUT="${REPO_ROOT}/verify/nightly_review_${YESTERDAY}.md"
  GPT_OUT="${REPO_ROOT}/verify/nightly_review_${YESTERDAY}_gpt.md"
  PROGRESS_FILE="${REPO_ROOT}/instructions/session_progress.md"

  log_line "INVOKE morning-summary yesterday=${YESTERDAY}"

  if [ "$MOCK" = "1" ] || [ "$NO_EXECUTE" = "1" ]; then
    echo "[wrapper] mock/no-execute: would append 5-line summary for ${YESTERDAY} into session_progress.md"
    log_line "MOCK would append summary"
    exit 0
  fi

  if [ ! -f "$REVIEW_OUT" ]; then
    log_line "morning-summary: 前夜 review 不在 (${REVIEW_OUT}), skip"
    echo "[wrapper] morning-summary skipped: 前夜 review 不在"
    exit 0
  fi

  # 簡易サマリー追記 (実 5 行集約は ADV メイン後続 wiring、ここは枠組のみ)
  TIMESTAMP_JST=$(TZ="$NIGHTLY_TZ" date +%Y-%m-%dT%H:%M:%S%z)
  GPT_NOTE="(stub)"
  [ -f "$GPT_OUT" ] && GPT_NOTE="$(basename "$GPT_OUT") 生成済"

  SUMMARY_BLOCK=$(cat <<SUM

### morning-summary (${TIMESTAMP_JST}) — 夜間点検 ${YESTERDAY}

1. 夜間点検 (${YESTERDAY}) 完了 (rotation は review レポート参照)
2. 集計: review レポート §3 集計表参照 (verify/nightly_review_${YESTERDAY}.md)
3. 主要 CRITICAL: 自動取込前 (実 wiring で本行を上書き)
4. GPT クロスレビュー: ${GPT_NOTE}
5. アクション: TASK-NIGHTLY-FIX-${YESTERDAY}-NNN を in_flight_topics に登録 (該当時)

SUM
)

  if [ -f "$PROGRESS_FILE" ]; then
    printf '%s\n' "$SUMMARY_BLOCK" >> "$PROGRESS_FILE"
    log_line "morning-summary appended to session_progress.md"
    echo "[wrapper] morning-summary OK appended for ${YESTERDAY}"
  else
    log_line "morning-summary: session_progress.md 不在 (${PROGRESS_FILE})"
    echo "[wrapper] session_progress.md 不在、追記 skip" >&2
  fi

  log_line "END morning-summary exit=0"
  exit 0
fi

# 到達不能 (上で全 mode 分岐済)
log_line "UNEXPECTED mode=${MODE}"
exit 1
