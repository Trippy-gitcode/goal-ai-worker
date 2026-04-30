#!/bin/sh
# scripts/main_session_writeguard.sh
# MISSION-G49-PKG-FINAL-V2 Phase 0（§2.25.16.2 書込禁止対象）
#
# 用途:
#   ~/.claude/settings.json PreToolUse hook に結線。
#   Edit / Write の対象パスが §2.25.16.2 リストに合致したら
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
# 例外（§2.25.16.3）:
#   - instructions/session_progress.md
#   - lais/verify/adv_violation_log.md
#   - docs/po-decisions.md
#   - docs/learned-patterns.md
#   - docs/decision_log.md
#   - instructions/in_flight_topics.md
#   - instructions/subagent_status.md
#   - instructions/po_alerts.md
#   - logs/* （履歴ログ）
#
# 根拠:
#   - lais/verify/dev_system_v34_package.md §2.25.16.2 / §2.25.16.3

set -eu

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
LOG_FILE="${REPO_ROOT}/logs/main_session_writeguard.log"
mkdir -p "${REPO_ROOT}/logs" 2>/dev/null || true

# dev-system context delegation:
# dev-system 配下で動作中（REPO_ROOT が dev-system 直下 or その配下）なら
# 本 writeguard は適用しない。dev-system は core_spec.md §2.2 / §5.1 で別個の
# ホワイトリスト + 自前 main_session_writeguard.sh を持つため。
# dev-system 側 writeguard は REPO_ROOT 不一致 = outside-repo PASS で goal-ai-worker
# 配下を干渉しない設計のため相互独立。
case "$REPO_ROOT" in
  */dev-system|*/dev-system/*)
    printf '%s\t[PASS-DELEGATED-DEVSYS]\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >>"$LOG_FILE" 2>/dev/null || true
    exit 0
    ;;
esac

# subagent コンテキスト判定: Task tool 経由で起動された subagent は
# DEV_SYSTEM_SUBAGENT=1 環境変数を立てる運用を期待。立っていれば writeguard をスキップ。
# 主セッションは環境変数を設定しないため、§2.25.16.2 BLOCK が機能する。
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
# realpath -m で存在しないパスも正規化（書込前なのでファイル不在の可能性あり）
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
    REASON="BLOCK [§2.25.16.2] path traversal 検出: ${FILE_PATH}（正規化後 ${REL_PATH}）"
    log "[BLOCK] traversal tool=$TOOL_NAME path=$FILE_PATH"
    printf '{"decision":"block","reason":"%s"}\n' "$REASON"
    exit 0
    ;;
esac

# 例外（§2.25.16.3）リスト先判定
case "$REL_PATH" in
  instructions/session_progress.md|\
  lais/verify/adv_violation_log.md|\
  docs/po-decisions.md|\
  docs/learned-patterns.md|\
  docs/decision_log.md|\
  instructions/in_flight_topics.md|\
  instructions/subagent_status.md|\
  instructions/po_alerts.md|\
  instructions/po_offline.flag|\
  instructions/night_mode_consent.flag|\
  instructions/gate_override.flag|\
  logs/*)
    log "[PASS] exception path=$REL_PATH tool=$TOOL_NAME"
    exit 0
    ;;
esac

# 書込禁止対象（§2.25.16.2）判定
BLOCKED=0
case "$REL_PATH" in
  docs/plans/*) BLOCKED=1 ;;
  lais/verify/*) BLOCKED=1 ;;
  scripts/*) BLOCKED=1 ;;
  templates/*) BLOCKED=1 ;;
  .git/hooks/*) BLOCKED=1 ;;
  development_rules.md) BLOCKED=1 ;;
  bootstrap.md) BLOCKED=1 ;;
  app_config.yaml) BLOCKED=1 ;;
esac

if [ "$BLOCKED" -eq 1 ]; then
  REASON="BLOCK [§2.25.16.2] main session 直接書込禁止: ${REL_PATH}（subagent 経由必須）"
  log "[BLOCK] tool=$TOOL_NAME path=$REL_PATH"
  printf '{"decision":"block","reason":"%s"}\n' "$REASON"
  exit 0
fi

# 通過
log "[PASS] tool=$TOOL_NAME path=$REL_PATH"
exit 0
