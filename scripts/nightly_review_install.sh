#!/bin/sh
# GENERATED: DO NOT MODIFY
# scripts/nightly_review_install.sh
#
# derived-from: SUBAGENT-DEVSYS-LAUNCHD-V1
# spec-ref:
#   - core_spec.md §9 (夜間自動着手モード)
#   - docs/po-decisions.md PO-DIRECTIVE-002 (期間 4/29 〜 5/20、22 夜)
#   - docs/decision_log.md PD-009 (launchd 採用)
# app-independence: APP_REPO_ROOT_ENV / APP_REPO_MARKER / APP_REPO_CANDIDATES
#                   (scripts/lib/resolve_repo_root.sh 経由)
#
# 用途:
#   templates/launchd/com.dev-system.nightly-{review,summary}.plist.template を
#   placeholder 置換し、~/Library/LaunchAgents/ に配置 + launchctl load する。
#   pmset schedule wake で 22 夜分の事前 wake (22:55 JST) も登録する (sudo 必要)。
#
# 引数:
#   --dry-run      plist 配置 + 出力のみ、launchctl load / pmset は実行しない
#   --no-pmset     pmset schedule wake をスキップ (sudo 不要)
#   --force        既存 plist を upcoming 確認なしに overwrite
#   --help         ヘルプ表示
#
# 環境変数:
#   APP_REPO_ROOT       dev-system or 生成 App ルート (resolve_repo_root.sh が解決)
#   APP_NAME            生成 App 名 (既定: dev-system)
#   DEV_SYSTEM_VERSION  バージョン (既定: dev-system-generated.template.json から取得)
#
# Exit codes:
#   0 = SUCCESS
#   1 = 引数 / 環境エラー
#   2 = plist 配置失敗
#   3 = launchctl load 失敗
#   4 = pmset schedule wake 失敗 (--no-pmset 指定時は skip)

set -eu

# --- REPO_ROOT 解決 ---------------------------------------------------------
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
  REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
fi
cd "$REPO_ROOT"

# --- 引数 -------------------------------------------------------------------
DRY_RUN=0
NO_PMSET=0
FORCE=0

show_help() {
  cat <<HLP
nightly_review_install.sh - 夜間仕様書総点検ルーティン launchd インストーラ
Usage:
  nightly_review_install.sh [--dry-run] [--no-pmset] [--force] [--help]
Options:
  --dry-run      plist 配置 + 出力のみ、launchctl load / pmset は実行しない
  --no-pmset     pmset schedule wake をスキップ (sudo 不要)
  --force        既存 plist を upcoming 確認なしに overwrite
  --help         本ヘルプ
Examples:
  nightly_review_install.sh --dry-run --no-pmset
  sudo nightly_review_install.sh                 # 実 install (pmset 設定含む)
HLP
}

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --no-pmset) NO_PMSET=1 ;;
    --force) FORCE=1 ;;
    --help|-h) show_help; exit 0 ;;
    *) ;;
  esac
  shift || true
done

# --- placeholder 値 ----------------------------------------------------------
APP_REPO_ROOT_VAL="${APP_REPO_ROOT:-${REPO_ROOT}}"
APP_NAME_VAL="${APP_NAME:-dev-system}"
DEV_SYSTEM_VERSION_VAL="${DEV_SYSTEM_VERSION:-}"
GENERATED_DATE_VAL="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# バージョン未指定時は templates/dev-system-generated.template.json から取得
if [ -z "${DEV_SYSTEM_VERSION_VAL:-}" ]; then
  GEN_TPL="${REPO_ROOT}/templates/dev-system-generated.template.json"
  if [ -f "$GEN_TPL" ]; then
    _v=$(grep -E '"generatedByVersion"' "$GEN_TPL" 2>/dev/null \
      | head -1 | sed 's/.*"generatedByVersion"[ ]*:[ ]*"\([^"]*\)".*/\1/')
    [ -n "$_v" ] && DEV_SYSTEM_VERSION_VAL="$_v"
  fi
  [ -z "$DEV_SYSTEM_VERSION_VAL" ] && DEV_SYSTEM_VERSION_VAL="v0.1.0"
fi

# --- ログ初期化 -------------------------------------------------------------
LOG_DIR="${REPO_ROOT}/logs"
mkdir -p "$LOG_DIR"
INSTALL_LOG="${LOG_DIR}/nightly_launchd_install.log"

log_line() {
  printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "$INSTALL_LOG"
}

log_line "START dry_run=${DRY_RUN} no_pmset=${NO_PMSET} force=${FORCE} repo_root=${APP_REPO_ROOT_VAL}"

# --- LaunchAgents ディレクトリ ----------------------------------------------
LA_DIR="${HOME}/Library/LaunchAgents"
if [ "$DRY_RUN" = "0" ]; then
  mkdir -p "$LA_DIR"
fi

# --- plist 雛形 → 配置 -------------------------------------------------------
TPL_DIR="${REPO_ROOT}/templates/launchd"
TPL_REVIEW="${TPL_DIR}/com.dev-system.nightly-review.plist.template"
TPL_SUMMARY="${TPL_DIR}/com.dev-system.nightly-summary.plist.template"

if [ ! -f "$TPL_REVIEW" ] || [ ! -f "$TPL_SUMMARY" ]; then
  log_line "FAIL plist 雛形不在 (${TPL_REVIEW} / ${TPL_SUMMARY})"
  echo "ERROR: plist 雛形不在" >&2
  exit 1
fi

DEST_REVIEW="${LA_DIR}/com.dev-system.nightly-review.plist"
DEST_SUMMARY="${LA_DIR}/com.dev-system.nightly-summary.plist"

# placeholder 置換は sed で実施 (絶対パス内 / は s|...|...|g で回避)
substitute_plist() {
  _src="$1"
  _dst="$2"
  sed \
    -e "s|{{APP_REPO_ROOT}}|${APP_REPO_ROOT_VAL}|g" \
    -e "s|{{APP_NAME}}|${APP_NAME_VAL}|g" \
    -e "s|{{DEV_SYSTEM_VERSION}}|${DEV_SYSTEM_VERSION_VAL}|g" \
    -e "s|{{GENERATED_DATE}}|${GENERATED_DATE_VAL}|g" \
    "$_src" > "$_dst"
}

# 出力先決定: dry-run はテンポラリ、実 install は ~/Library/LaunchAgents/
if [ "$DRY_RUN" = "1" ]; then
  TMP_REVIEW="$(mktemp -t nightly_review.XXXXXX).plist"
  TMP_SUMMARY="$(mktemp -t nightly_summary.XXXXXX).plist"
  substitute_plist "$TPL_REVIEW" "$TMP_REVIEW"
  substitute_plist "$TPL_SUMMARY" "$TMP_SUMMARY"
  echo "[install] dry-run plist (review)  : $TMP_REVIEW"
  echo "[install] dry-run plist (summary) : $TMP_SUMMARY"
  log_line "DRY_RUN plist generated review=${TMP_REVIEW} summary=${TMP_SUMMARY}"

  # plist xml 構文確認
  if command -v plutil >/dev/null 2>&1; then
    if plutil "$TMP_REVIEW" 2>&1 | tee -a "$INSTALL_LOG" | grep -qE "OK|valid"; then
      echo "[install] plutil PASS (review)"
    else
      echo "[install] plutil FAIL (review)" >&2
      exit 2
    fi
    if plutil "$TMP_SUMMARY" 2>&1 | tee -a "$INSTALL_LOG" | grep -qE "OK|valid"; then
      echo "[install] plutil PASS (summary)"
    else
      echo "[install] plutil FAIL (summary)" >&2
      exit 2
    fi
  else
    echo "[install] plutil 不在のため構文確認 skip (dry-run)"
  fi
else
  # 既存 plist 確認
  for _existing in "$DEST_REVIEW" "$DEST_SUMMARY"; do
    if [ -f "$_existing" ] && [ "$FORCE" = "0" ]; then
      log_line "FAIL existing plist (${_existing}), --force 必須"
      echo "ERROR: 既存 plist あり (${_existing})。--force で overwrite 可" >&2
      exit 2
    fi
  done

  substitute_plist "$TPL_REVIEW" "$DEST_REVIEW" || {
    log_line "FAIL substitute review"
    exit 2
  }
  substitute_plist "$TPL_SUMMARY" "$DEST_SUMMARY" || {
    log_line "FAIL substitute summary"
    exit 2
  }
  log_line "PASS plist 配置 review=${DEST_REVIEW} summary=${DEST_SUMMARY}"
  echo "[install] plist 配置完了"

  # plutil で構文確認
  if command -v plutil >/dev/null 2>&1; then
    plutil "$DEST_REVIEW"  2>&1 | tee -a "$INSTALL_LOG" | grep -qE "OK|valid" \
      || { log_line "FAIL plutil review"; exit 2; }
    plutil "$DEST_SUMMARY" 2>&1 | tee -a "$INSTALL_LOG" | grep -qE "OK|valid" \
      || { log_line "FAIL plutil summary"; exit 2; }
  fi
fi

# --- launchctl load ---------------------------------------------------------
if [ "$DRY_RUN" = "1" ]; then
  echo "[install] dry-run: launchctl load skip"
  log_line "DRY_RUN launchctl load skip"
else
  # 既存 load を unload してから再 load (-w で disabled 状態解除)
  launchctl unload "$DEST_REVIEW"  2>/dev/null || true
  launchctl unload "$DEST_SUMMARY" 2>/dev/null || true

  if launchctl load -w "$DEST_REVIEW"; then
    log_line "PASS launchctl load review"
    echo "[install] launchctl load review PASS"
  else
    log_line "FAIL launchctl load review"
    echo "ERROR: launchctl load review 失敗" >&2
    exit 3
  fi

  if launchctl load -w "$DEST_SUMMARY"; then
    log_line "PASS launchctl load summary"
    echo "[install] launchctl load summary PASS"
  else
    log_line "FAIL launchctl load summary"
    echo "ERROR: launchctl load summary 失敗" >&2
    exit 3
  fi
fi

# --- pmset schedule wake (22 夜分、22:55 JST 起床) -------------------------
# PO-DIRECTIVE-002: 4/29 〜 5/20 (22 夜) の各夜 22:55 に Mac wake、
# 23:00 launchd 発火を保証する。
# pmset schedule は単発登録、22 夜分を一括登録 (sudo 必要)。
PMSET_NIGHTS_START="2026-04-29"
PMSET_NIGHTS_END="2026-05-20"
PMSET_WAKE_TIME="22:55:00"

if [ "$NO_PMSET" = "1" ]; then
  echo "[install] --no-pmset 指定、pmset schedule wake skip"
  log_line "SKIP pmset (--no-pmset)"
elif [ "$DRY_RUN" = "1" ]; then
  echo "[install] dry-run: pmset schedule wake 22 夜分 (22:55:00 JST) 模擬出力のみ"
  log_line "DRY_RUN pmset schedule wake 22 夜分 (22:55 JST)"
  # 22 夜の日付を sequential 出力 (実 pmset は実行しない)
  _d="$PMSET_NIGHTS_START"
  _i=0
  while [ "$_i" -lt 22 ]; do
    # MM/DD/YY 形式に変換 (pmset 仕様)
    _mmddyy=$(date -j -f "%Y-%m-%d" "$_d" +"%m/%d/%y" 2>/dev/null \
      || date -d "$_d" +"%m/%d/%y" 2>/dev/null \
      || echo "$_d")
    echo "[install] dry-run pmset schedule wake \"${_mmddyy} ${PMSET_WAKE_TIME}\""
    # 翌日 (BSD date / GNU date)
    _d=$(date -j -v+1d -f "%Y-%m-%d" "$_d" +%Y-%m-%d 2>/dev/null \
      || date -d "${_d} +1 day" +%Y-%m-%d 2>/dev/null \
      || break)
    _i=$(( _i + 1 ))
  done
else
  if [ "$(id -u)" != "0" ]; then
    log_line "FAIL pmset 要 sudo (現在 $(id -u))"
    echo "ERROR: pmset schedule wake は sudo 必須。--no-pmset で skip 可" >&2
    exit 4
  fi

  echo "[install] pmset schedule wake 22 夜分登録 (22:55:00 JST)"
  log_line "PMSET start ${PMSET_NIGHTS_START} → ${PMSET_NIGHTS_END} 22:55:00"

  _d="$PMSET_NIGHTS_START"
  _i=0
  _ok=0
  _ng=0
  while [ "$_i" -lt 22 ]; do
    _mmddyy=$(date -j -f "%Y-%m-%d" "$_d" +"%m/%d/%y" 2>/dev/null \
      || date -d "$_d" +"%m/%d/%y" 2>/dev/null \
      || echo "$_d")
    if pmset schedule wake "${_mmddyy} ${PMSET_WAKE_TIME}" >> "$INSTALL_LOG" 2>&1; then
      _ok=$(( _ok + 1 ))
    else
      _ng=$(( _ng + 1 ))
    fi
    _d=$(date -j -v+1d -f "%Y-%m-%d" "$_d" +%Y-%m-%d 2>/dev/null \
      || date -d "${_d} +1 day" +%Y-%m-%d 2>/dev/null \
      || break)
    _i=$(( _i + 1 ))
  done

  log_line "PMSET ok=${_ok} ng=${_ng}"
  echo "[install] pmset schedule wake 完了 ok=${_ok} ng=${_ng}"
  if [ "$_ng" -gt 0 ]; then
    echo "ERROR: pmset 部分失敗 (${INSTALL_LOG})" >&2
    exit 4
  fi
fi

log_line "END SUCCESS"
echo "[install] DONE"
exit 0
