#!/bin/sh
# scripts/hflow_trigger_check.sh — Hフロー発火判定（git diff × RISK_PATHS）
# 根拠: R2.2 §2.3 σcrit / §3.5 Hフロー承認証跡 SSOT / PD-110 / sub_hflow_protocol.md §1
# POSIX sh 互換（§3.7）。bash 拡張禁止。
#
# 環境変数:
#   HFLOW_CONTEXT: pre-commit | pre-push | deploy（ログ用）
# 出力:
#   HFLOW_TRIGGER=1 / HFLOW_TRIGGER=0 を stdout に出力
#   発火ファイル一覧を stderr に出力

set -eu
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/lib/risk_match.sh"

CTX="${HFLOW_CONTEXT:-deploy}"

# CONTEXT 別の diff 取得範囲
case "$CTX" in
  pre-commit) DIFF_RANGE="--cached" ;;
  pre-push)   DIFF_RANGE="@{upstream}..HEAD" ;;
  deploy)     DIFF_RANGE="HEAD~1..HEAD" ;;
  *)          DIFF_RANGE="HEAD~1..HEAD" ;;
esac

CHANGED=$(git diff --name-only $DIFF_RANGE 2>/dev/null || git diff --name-only HEAD 2>/dev/null || true)
[ -n "$CHANGED" ] || { echo "HFLOW_TRIGGER=0"; exit 0; }

HIT=""
for f in $CHANGED; do
  [ -n "$f" ] || continue
  if is_risk_path "$f" > /dev/null 2>&1; then
    HIT="$HIT $f"
  fi
done

if [ -n "$HIT" ]; then
  echo "HFLOW_TRIGGER=1"
  echo "[hflow] triggered by context=$CTX files:$HIT" >&2
  exit 0
fi

echo "HFLOW_TRIGGER=0"
