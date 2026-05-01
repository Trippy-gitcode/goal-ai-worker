#!/bin/sh
# GENERATED: DO NOT MODIFY
# scripts/main_session_writeguard.sh
#
# derived-from: PRIOR-APP scripts/main_session_writeguard.sh (SUBAGENT-DEVSYS-SCRIPTS-PHASE2)
# app-independence: APP_REPO_ROOT_ENV / APP_REPO_MARKER / APP_REPO_CANDIDATES
# spec-ref: core_spec.md §2.2 (ADV 書込ホワイトリスト) / §5.1 (PreToolUse hook)
#
# 用途:
#   ~/.claude/settings.json PreToolUse hook に結線。
#   Edit / Write / MultiEdit / NotebookEdit の対象パスが書込禁止対象に合致したら
#   {"decision":"block","reason":"..."} を出力して Tool 実行を block。
#
# 入力（stdin JSON、PreToolUse hook 仕様）:
#   {
#     "hook_event_name": "PreToolUse",
#     "tool_name": "Edit" | "Write" | ... ,
#     "tool_input": {"file_path": "/path/to/file", ...}
#   }
#
# 出力:
#   block 時: {"decision":"block","reason":"<msg>"} → Tool 実行 block
#   PASS 時: 何も出力せず exit 0
#
# 例外（core_spec.md §2.2 ホワイトリスト 7 件 + フラグ・ログ系）:
#   - instructions/session_progress.md
#   - docs/decision_log.md
#   - instructions/in_flight_topics.md
#   - instructions/subagent_status.md
#   - verify/adv_violation_log.md            （App 側のパスは可変）
#   - docs/po-decisions.md
#   - docs/learned-patterns.md
#   - instructions/po_alerts.md
#   - instructions/po_offline.flag           （night mode 系フラグ）
#   - instructions/night_mode_consent.flag
#   - instructions/gate_override.flag        （PO override フラグ）
#   - logs/*                                  （履歴ログ）
#
# 環境変数（App 非依存化）:
#   APP_REPO_ROOT_ENV / APP_REPO_MARKER / APP_REPO_CANDIDATES
#   DEV_SYSTEM_SUBAGENT          1 で subagent コンテキストとして全 Edit/Write 通過
#   APP_VIOLATION_LOG_PATH       App 側違反ログのパス（既定 verify/adv_violation_log.md）
#
# 設計指針:
#   - Lais-style `verify/adv_violation_log.md` ハードコードを除去（APP_VIOLATION_LOG_PATH で可変）
#   - REPO_ROOT 解決は resolve_repo_root.sh 経由
#   - subagent コンテキストでは DEV_SYSTEM_SUBAGENT=1 を立ててこの hook を skip
#
# 根拠:
#   - core_spec.md §2.2 ADV 書込ホワイトリスト
#   - core_spec.md §5.1 PreToolUse hook 群

set -eu

SELF_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "${SELF_DIR}/lib/resolve_repo_root.sh" ]; then
  # shellcheck disable=SC1091
  . "${SELF_DIR}/lib/resolve_repo_root.sh" 2>/dev/null || true
fi

REPO_ROOT=""
if command -v resolve_repo_root >/dev/null 2>&1; then
  REPO_ROOT="$(resolve_repo_root 2>/dev/null || true)"
fi
if [ -z "${REPO_ROOT}" ]; then
  REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
fi

LOG_FILE="${REPO_ROOT}/logs/main_session_writeguard.log"
mkdir -p "${REPO_ROOT}/logs" 2>/dev/null || true

# dev-system context delegation (PD-006 / re-applied 2026-04-30 post lais-retro PD-019 overwrite):
# dev-system 配下で動作中なら本 writeguard は適用しない。
# dev-system 自身が独立 writeguard を持つため相互独立を担保。
case "$REPO_ROOT" in
  */dev-system|*/dev-system/*)
    printf '%s\t[PASS-DELEGATED-DEVSYS]\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >>"$LOG_FILE" 2>/dev/null || true
    exit 0
    ;;
esac

# subagent コンテキスト判定: Task tool 経由で起動された subagent は
# DEV_SYSTEM_SUBAGENT=1 環境変数を立てる運用を期待。立っていれば writeguard をスキップ。
# 主セッションは環境変数を設定しないため、書込禁止が機能する。
if [ "${DEV_SYSTEM_SUBAGENT:-}" = "1" ]; then
  log() { printf '%s\t[PASS-SUBAGENT]\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >>"$LOG_FILE" 2>/dev/null || true; }
  log
  exit 0
fi

ts() { date -u +%Y-%m-%dT%H:%M:%SZ; }
log() { printf '%s\t%s\n' "$(ts)" "$1" >>"$LOG_FILE" 2>/dev/null || true; }

# stdin 取得（PreToolUse hook JSON）
INPUT_JSON=""
if [ ! -t 0 ]; then
  INPUT_JSON="$(cat)"
fi

if [ -z "$INPUT_JSON" ]; then
  log "[PASS] no-input"
  exit 0
fi

# tool_name 抽出（jq 不要、grep + sed で十分）
TOOL_NAME=$(printf '%s' "$INPUT_JSON" | sed -n 's/.*"tool_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)

case "$TOOL_NAME" in
  Edit|Write|MultiEdit|NotebookEdit) ;;
  *)
    # 書込系以外は通過
    log "[PASS] tool=$TOOL_NAME (non-write)"
    exit 0
    ;;
esac

# file_path 抽出
FILE_PATH=$(printf '%s' "$INPUT_JSON" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)

if [ -z "$FILE_PATH" ]; then
  log "[PASS] no-file_path tool=$TOOL_NAME"
  exit 0
fi

# 絶対パス化（既に絶対なら変更なし）
case "$FILE_PATH" in
  /*) ABS_PATH="$FILE_PATH" ;;
  *) ABS_PATH="${REPO_ROOT}/${FILE_PATH}" ;;
esac

# realpath で `../` を解決（path traversal 防止）
NORMALIZED_PATH=""
if command -v realpath >/dev/null 2>&1; then
  NORMALIZED_PATH="$(realpath -m -- "$ABS_PATH" 2>/dev/null || true)"
fi
if [ -z "$NORMALIZED_PATH" ]; then
  # python3 fallback（realpath -m 不在環境）
  NORMALIZED_PATH="$(python3 -c "import os,sys; print(os.path.normpath(sys.argv[1]))" "$ABS_PATH" 2>/dev/null || echo "$ABS_PATH")"
fi
ABS_PATH="$NORMALIZED_PATH"

# REPO_ROOT 配下チェック（外部書込は別 hook 範疇、ここでは PASS）
case "$ABS_PATH" in
  "${REPO_ROOT}/"*) ;;
  *) log "[PASS] outside-repo path=$ABS_PATH"; exit 0 ;;
esac

# REPO_ROOT 配下に正規化された相対パス
REL_PATH="${ABS_PATH#${REPO_ROOT}/}"

# `../` 残存検出（多重防衛、normalize 後は通常無いが念のため）
case "$REL_PATH" in
  *..*)
    REASON="BLOCK [§2.2] path traversal 検出: ${FILE_PATH}（正規化後 ${REL_PATH}）"
    log "[BLOCK] traversal tool=$TOOL_NAME path=$FILE_PATH"
    printf '{"decision":"block","reason":"%s"}\n' "$REASON"
    exit 0
    ;;
esac

# App 側の違反ログパス（既定 verify/adv_violation_log.md、App 側で APP_VIOLATION_LOG_PATH 上書き可）
VIOLATION_LOG_REL="${APP_VIOLATION_LOG_PATH:-verify/adv_violation_log.md}"

# 例外（core_spec.md §2.2 ホワイトリスト 7 件 + フラグ・ログ系）
case "$REL_PATH" in
  instructions/session_progress.md|\
  docs/decision_log.md|\
  instructions/in_flight_topics.md|\
  instructions/subagent_status.md|\
  docs/po-decisions.md|\
  docs/learned-patterns.md|\
  instructions/po_alerts.md|\
  instructions/po_offline.flag|\
  instructions/night_mode_consent.flag|\
  instructions/gate_override.flag|\
  logs/*)
    log "[PASS] exception path=$REL_PATH tool=$TOOL_NAME"
    exit 0
    ;;
esac

# App 側違反ログパスの動的マッチ（${VIOLATION_LOG_REL} 一致でホワイトリスト通過）
if [ "$REL_PATH" = "$VIOLATION_LOG_REL" ]; then
  log "[PASS] violation-log path=$REL_PATH tool=$TOOL_NAME"
  exit 0
fi

# 書込禁止対象（core_spec.md §2.2 ホワイトリスト外、subagent 経由必須）判定
BLOCKED=0
case "$REL_PATH" in
  docs/plans/*) BLOCKED=1 ;;
  scripts/*) BLOCKED=1 ;;
  templates/*) BLOCKED=1 ;;
  skills/*) BLOCKED=1 ;;
  .git/hooks/*) BLOCKED=1 ;;
  core_spec.md) BLOCKED=1 ;;
  development_rules.md) BLOCKED=1 ;;
  bootstrap.md) BLOCKED=1 ;;
  app_config.yaml) BLOCKED=1 ;;
  CLAUDE.md) BLOCKED=1 ;;
  docs/architecture.md) BLOCKED=1 ;;
  docs/changeable_policy.md) BLOCKED=1 ;;
esac

if [ "$BLOCKED" -eq 1 ]; then
  REASON="BLOCK [§2.2] main session 直接書込禁止: ${REL_PATH}（subagent 経由必須）"
  log "[BLOCK] tool=$TOOL_NAME path=$REL_PATH"
  printf '{"decision":"block","reason":"%s"}\n' "$REASON"
  exit 0
fi

# 通過
log "[PASS] tool=$TOOL_NAME path=$REL_PATH"
exit 0
