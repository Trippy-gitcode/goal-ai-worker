#!/bin/sh
# scripts/context_monitor.sh
# MISSION-G49-PKG-FINAL-V2 Phase 0（§2.25.16.4 コンテキスト管理）
#
# 用途:
#   stdin で context_size（int、token 数 or 推定 ratio %）を受信、
#   70% / 85% / 95% 閾値で WARN / ORGANIZE / HANDOFF を判定 stdout 出力。
#
# 入力（stdin、改行区切り、最初の数値行のみ評価）:
#   72       # ratio % として解釈（0-100 の整数値）
#   または:
#   140000   # token 数として解釈（max_tokens 環境変数 CONTEXT_MAX_TOKENS = 200000 既定）
#
# 出力（stdout）:
#   PASS / WARN / ORGANIZE / HANDOFF（1 ラベル + 詳細 1 行）
#
# exit code:
#   0: 通常（PASS / WARN / ORGANIZE）
#   2: HANDOFF 推奨（caller は引継ぎ準備に入る）
#
# 根拠:
#   - core_spec.md §6.3 コンテキスト管理閾値 (legacy v34 spec §2.25.16.4, archived 2026-04-30)

set -eu

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

CONTEXT_MAX_TOKENS="${CONTEXT_MAX_TOKENS:-200000}"

# stdin から最初の数値行を取得
INPUT=""
if [ -t 0 ]; then
  echo "[context_monitor] stdin から context_size（数値）を入力してください" >&2
  echo "PASS\tno-input"
  exit 0
fi

INPUT="$(head -1 || true)"
case "$INPUT" in
  ''|*[!0-9]*) echo "PASS\tinvalid-input:${INPUT}"; exit 0 ;;
esac

# ratio 計算（100 以下なら % として、それ以外は token 数として CONTEXT_MAX_TOKENS で除算）
if [ "$INPUT" -le 100 ]; then
  RATIO="$INPUT"
else
  # awk で整数除算
  RATIO=$(awk -v t="$INPUT" -v m="$CONTEXT_MAX_TOKENS" 'BEGIN { printf "%d", (t * 100) / m }')
fi

# 閾値判定
if [ "$RATIO" -ge 95 ]; then
  printf 'HANDOFF\tratio=%s%%\thandoff_validator.sh 起動推奨\n' "$RATIO"
  exit 2
elif [ "$RATIO" -ge 85 ]; then
  printf 'ORGANIZE\tratio=%s%%\tSSOT 4 ファイル圧縮 + 引継ぎ準備開始\n' "$RATIO"
  exit 0
elif [ "$RATIO" -ge 70 ]; then
  printf 'WARN\tratio=%s%%\t整理候補の提案（不要転記の削減）\n' "$RATIO"
  exit 0
else
  printf 'PASS\tratio=%s%%\n' "$RATIO"
  exit 0
fi
