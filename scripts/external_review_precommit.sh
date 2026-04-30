#!/bin/sh
# scripts/external_review_precommit.sh
# dev-system v3.5 Phase 1 MVP (案 D'、sub_external_review_protocol §3)
# pre-commit hook から発火、diff サイズで skip / 非同期 / 同期 に分岐し、
# CRITICAL 検出で commit をブロックする外部 API クロスチェック起動スクリプト。
#
# 根拠:
#   - docs/plans/sub_external_review_protocol.md §3 Pre-commit 外部 API クロスチェック
#   - docs/plans/dev_system_v35_roadmap.md §3.1 Phase 1
#   - RISK_PATHS SSOT: docs/plans/sub_hflow_protocol.md §1（scripts/lib/risk_patterns.sh と共有）
#
# 実装方針:
#   - POSIX sh 互換（bash 拡張禁止）。§3.7 対応。
#   - ガードレール（§3.3）は external_review_guardrail.sh に集約、check_guardrail で判定。
#   - diff サイズ分岐（§3.2）: < 30 行 = skip / 30-300 行 = 非同期 / >= 300 行 or RISK_PATHS = 同期
#   - 同期モードで CRITICAL 検出時は exit 1 → pre-commit 側で FAIL 扱い（commit ブロック）。

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# --- ガードレール（§3.3） ----------------------------------------------------
# 月次 $30 / 日次 $5 / 3 連続失敗で 1h 停止。発動時は skip モードで終了。
GUARDRAIL_LIB="${SCRIPT_DIR}/external_review_guardrail.sh"
if [ -f "$GUARDRAIL_LIB" ]; then
  # shellcheck disable=SC1090
  . "$GUARDRAIL_LIB"
  if ! check_guardrail; then
    echo "external_review: ガードレール発動、skip モードで commit 許可"
    exit 0
  fi
fi

# --- diff サイズ取得（§3.2） ------------------------------------------------
DIFF_LINES=$(git diff --cached --numstat 2>/dev/null \
  | awk 'BEGIN{s=0} { if ($1 ~ /^[0-9]+$/) s+=$1; if ($2 ~ /^[0-9]+$/) s+=$2 } END{ print s+0 }')
DIFF_LINES="${DIFF_LINES:-0}"

# --- RISK_PATHS 判定（sub_hflow_protocol §1 SSOT 共有） ---------------------
# scripts/lib/risk_patterns.sh の RISK_PATHS と同期。変更時は両方更新。
RISK_PATTERN='^(src/auth/|src/payment/|src/services/supabase\.ts|src/services/external/|src/services/stripe/|supabase/migrations/|\.env|\.dev\.vars|wrangler\.toml|app_config\.yaml)'
RISK_HIT=$(git diff --cached --name-only 2>/dev/null | grep -cE "$RISK_PATTERN" || true)
RISK_HIT="${RISK_HIT:-0}"

# --- 閾値（§3.2） -----------------------------------------------------------
# 将来 app_config.yaml の review.* から読込予定。Phase 1 MVP ではハードコード。
SMALL_THRESHOLD=30
LARGE_THRESHOLD=300

# --- モード判定（§3.2） ------------------------------------------------------
if [ "$RISK_HIT" -gt 0 ] || [ "$DIFF_LINES" -ge "$LARGE_THRESHOLD" ]; then
  MODE="sync"
elif [ "$DIFF_LINES" -ge "$SMALL_THRESHOLD" ]; then
  MODE="async"
else
  MODE="skip"
fi

AI_REVIEW="${REPO_ROOT}/scripts/ai_review.js"

case "$MODE" in
  skip)
    echo "external_review: skip（diff=${DIFF_LINES} 行 < ${SMALL_THRESHOLD}、RISK_HIT=${RISK_HIT}）"
    exit 0
    ;;
  async)
    echo "external_review: 非同期実行（diff=${DIFF_LINES} 行、RISK_HIT=${RISK_HIT}）"
    if [ -f "$AI_REVIEW" ]; then
      # fire-and-forget、post-commit hook が結果を lais/review_feed/ に集約する想定（Phase 2）
      ( node "$AI_REVIEW" --mode=precommit --async > /dev/null 2>&1 & ) >/dev/null 2>&1 || true
    else
      echo "external_review: ai_review.js 不在、非同期呼出しスキップ"
    fi
    exit 0
    ;;
  sync)
    echo "external_review: 同期実行（diff=${DIFF_LINES} 行、RISK_HIT=${RISK_HIT}）"
    if [ ! -f "$AI_REVIEW" ]; then
      echo "external_review: ai_review.js 不在、同期呼出しをスキップ（commit 許可）"
      exit 0
    fi
    if node "$AI_REVIEW" --mode=precommit --sync; then
      exit 0
    else
      echo "FAIL: external_review CRITICAL 検出、commit ブロック" >&2
      exit 1
    fi
    ;;
esac
