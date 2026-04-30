#!/bin/sh
# GENERATED: DO NOT MODIFY
# scripts/nightly_review_uninstall.sh
#
# derived-from: SUBAGENT-DEVSYS-LAUNCHD-V1
# spec-ref:
#   - core_spec.md §9 (夜間自動着手モード)
#   - docs/po-decisions.md PO-DIRECTIVE-002 (5/21 自動停止)
#   - docs/decision_log.md PD-009 (launchd 採用)
# app-independence: APP_REPO_ROOT_ENV / APP_REPO_MARKER / APP_REPO_CANDIDATES
#                   (scripts/lib/resolve_repo_root.sh 経由)
#
# 用途:
#   nightly_review_install.sh で配置した launchd LaunchAgent を撤収する。
#     1. launchctl unload com.dev-system.nightly-review.plist + nightly-summary.plist
#     2. ~/Library/LaunchAgents/com.dev-system.nightly-{review,summary}.plist 削除
#     3. pmset schedule cancelall は副作用が大きいため、本スクリプトでは
#        既定 skip (--cancel-pmset で opt-in)。本ジョブの wake は 5/20 で
#        最終なので 5/21 以降は自然消滅する。
#
# 引数:
#   --reason <text>     uninstall 理由 (ログに記録、wrapper の self-uninstall から渡される)
#   --cancel-pmset      pmset schedule cancelall を実行 (sudo 必要、他 wake も削除)
#   --dry-run           launchctl unload / 削除 / pmset を実行しない
#   --help              ヘルプ表示
#
# Exit codes:
#   0 = SUCCESS / NOT-INSTALLED (idempotent)
#   1 = 引数 / 環境エラー
#   2 = launchctl unload 失敗
#   3 = plist 削除失敗
#   4 = pmset cancelall 失敗 (--cancel-pmset 指定時)

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
REASON=""
CANCEL_PMSET=0
DRY_RUN=0

show_help() {
  cat <<HLP
nightly_review_uninstall.sh - 夜間仕様書総点検ルーティン launchd アンインストーラ
Usage:
  nightly_review_uninstall.sh [--reason <text>] [--cancel-pmset] [--dry-run] [--help]
Options:
  --reason <text>     uninstall 理由 (ログ用)
  --cancel-pmset      pmset schedule cancelall (sudo 必要、他 wake も削除)
  --dry-run           launchctl unload / 削除 / pmset を実行しない
  --help              本ヘルプ
Examples:
  nightly_review_uninstall.sh --reason "manual stop"
  nightly_review_uninstall.sh --reason "EXPIRED:2026-05-21" --cancel-pmset
  nightly_review_uninstall.sh --dry-run
HLP
}

while [ $# -gt 0 ]; do
  case "$1" in
    --reason=*) REASON="${1#--reason=}" ;;
    --reason) shift; REASON="${1:-}" ;;
    --cancel-pmset) CANCEL_PMSET=1 ;;
    --dry-run) DRY_RUN=1 ;;
    --help|-h) show_help; exit 0 ;;
    *) ;;
  esac
  shift || true
done

# --- ログ初期化 -------------------------------------------------------------
LOG_DIR="${REPO_ROOT}/logs"
mkdir -p "$LOG_DIR"
UNINSTALL_LOG="${LOG_DIR}/nightly_launchd_uninstall.log"

log_line() {
  printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "$UNINSTALL_LOG"
}

log_line "START reason=${REASON:-(none)} cancel_pmset=${CANCEL_PMSET} dry_run=${DRY_RUN}"

LA_DIR="${HOME}/Library/LaunchAgents"
DEST_REVIEW="${LA_DIR}/com.dev-system.nightly-review.plist"
DEST_SUMMARY="${LA_DIR}/com.dev-system.nightly-summary.plist"

# --- launchctl unload --------------------------------------------------------
unload_one() {
  _plist="$1"
  if [ ! -f "$_plist" ]; then
    log_line "SKIP not-installed (${_plist})"
    echo "[uninstall] not installed: ${_plist}"
    return 0
  fi
  if [ "$DRY_RUN" = "1" ]; then
    log_line "DRY_RUN launchctl unload ${_plist}"
    echo "[uninstall] dry-run launchctl unload ${_plist}"
    return 0
  fi
  if launchctl unload "$_plist" 2>>"$UNINSTALL_LOG"; then
    log_line "PASS launchctl unload ${_plist}"
    echo "[uninstall] launchctl unload PASS: ${_plist}"
    return 0
  else
    log_line "FAIL launchctl unload ${_plist}"
    echo "[uninstall] launchctl unload FAIL: ${_plist}" >&2
    return 1
  fi
}

unload_one "$DEST_REVIEW"  || exit 2
unload_one "$DEST_SUMMARY" || exit 2

# --- plist 削除 -------------------------------------------------------------
remove_one() {
  _plist="$1"
  if [ ! -f "$_plist" ]; then
    return 0
  fi
  if [ "$DRY_RUN" = "1" ]; then
    log_line "DRY_RUN rm ${_plist}"
    echo "[uninstall] dry-run rm ${_plist}"
    return 0
  fi
  if rm -f "$_plist"; then
    log_line "PASS rm ${_plist}"
    echo "[uninstall] rm PASS: ${_plist}"
    return 0
  else
    log_line "FAIL rm ${_plist}"
    return 1
  fi
}

remove_one "$DEST_REVIEW"  || exit 3
remove_one "$DEST_SUMMARY" || exit 3

# --- pmset schedule cancelall (opt-in) -------------------------------------
if [ "$CANCEL_PMSET" = "1" ]; then
  if [ "$DRY_RUN" = "1" ]; then
    echo "[uninstall] dry-run: pmset schedule cancelall (skip)"
    log_line "DRY_RUN pmset schedule cancelall"
  else
    if [ "$(id -u)" != "0" ]; then
      log_line "FAIL pmset cancelall 要 sudo"
      echo "ERROR: pmset schedule cancelall は sudo 必須" >&2
      exit 4
    fi
    if pmset schedule cancelall >>"$UNINSTALL_LOG" 2>&1; then
      log_line "PASS pmset schedule cancelall"
      echo "[uninstall] pmset schedule cancelall PASS"
    else
      log_line "FAIL pmset schedule cancelall"
      echo "ERROR: pmset schedule cancelall 失敗" >&2
      exit 4
    fi
  fi
else
  echo "[uninstall] --cancel-pmset 未指定、pmset wake schedule は残置 (5/20 で自然消滅)"
  log_line "SKIP pmset (--cancel-pmset 未指定)"
fi

log_line "END SUCCESS"
echo "[uninstall] DONE"
exit 0
