#!/bin/sh
# scripts/vote_dispatcher.sh
# MISSION-G49-PKG-FINAL-V2 Phase 2（PD-112 §2.25.23 14 票投票機構）
#
# 用途:
#   §2.25.3 PO 判断必須事項該当時の承認質問発信前に、10 ペルソナ + GPT-5.4 + Gemini 3.1 Pro
#   = 計 14 票（外部 AI 各 2 票分）の多数決で「拮抗（PO 承認取得）/ 圧倒的（ADV 自律）」を判定。
#
# 引数:
#   --proposal "<提案テキスト>"（必須）
#   --vote-id "<投票 ID>"（任意、未指定時はタイムスタンプ生成）
#
# Exit codes:
#   0 = 圧倒的（margin >= 5、14 票時 / margin >= 4、10 票 fallback 時）→ ADV 自律
#   2 = 拮抗（margin <= 4、14 票時 / margin <= 3、10 票 fallback 時）→ PO 承認取得（呼出側で AskUserQuestion 起動）
#   1 = 引数 / 環境エラー
#
# 出力:
#   stdout: 集計結果サマリー（FOR=N, AGAINST=N, ABSTAIN=N, margin=N, verdict=...）
#   logs/vote_log.log: TAB 区切り 8 列（ts / vote_id / mode / score_for / score_against / score_abstain / margin / verdict）
#
# 根拠:
#   - lais/verify/dev_system_v34_package.md §2.25.23.1〜.8
#   - docs/po-decisions.md PD-112

set -eu

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

LOG_FILE="${REPO_ROOT}/logs/vote_log.log"
mkdir -p "${REPO_ROOT}/logs"

PROPOSAL=""
VOTE_ID=""

while [ $# -gt 0 ]; do
  case "$1" in
    --proposal) shift; PROPOSAL="${1:-}" ;;
    --vote-id) shift; VOTE_ID="${1:-}" ;;
    *) ;;
  esac
  shift || true
done

if [ -z "$PROPOSAL" ]; then
  echo "[vote_dispatcher] --proposal が必須" >&2
  exit 1
fi

if [ -z "$VOTE_ID" ]; then
  VOTE_ID="vote_$(date -u +%Y%m%dT%H%M%SZ)_$$"
fi

# --- ガードレール判定（外部 AI 呼出可否）------------------------------------
GUARDRAIL_SH="${REPO_ROOT}/scripts/external_review_guardrail.sh"
USE_EXTERNAL=1

if [ -f "$GUARDRAIL_SH" ]; then
  # source して check_guardrail を呼ぶ
  # shellcheck disable=SC1090
  . "$GUARDRAIL_SH"
  if check_guardrail >/dev/null 2>&1; then
    USE_EXTERNAL=1
  else
    USE_EXTERNAL=0
    echo "[vote_dispatcher] guardrail 発動、10 票 fallback 経路に切替" >&2
  fi
else
  echo "[vote_dispatcher] $GUARDRAIL_SH 不在、外部 AI 呼出スキップ" >&2
  USE_EXTERNAL=0
fi

# --- 内部 10 ペルソナ投票 ----------------------------------------------------
PERSONA_LIST="LLM アプリケーション設計者
プロンプトエンジニア
SW PM
SW アーキテクト
SRE
QA テストエンジニア
テクニカルライター
セキュリティエンジニア
AI コンサルタント
データガバナンス専門家"

PERSONA_VOTE_SH="${REPO_ROOT}/scripts/persona_vote.sh"

if [ ! -x "$PERSONA_VOTE_SH" ]; then
  echo "[vote_dispatcher] $PERSONA_VOTE_SH が実行不能" >&2
  exit 1
fi

score_for=0
score_against=0
score_abstain=0

# IFS 改行で 10 ペルソナ反復
OLD_IFS="$IFS"
IFS='
'
for persona in $PERSONA_LIST; do
  v=$("$PERSONA_VOTE_SH" --proposal "$PROPOSAL" --persona "$persona" 2>/dev/null || echo "ABSTAIN")
  case "$v" in
    FOR)     score_for=$((score_for + 1)) ;;
    AGAINST) score_against=$((score_against + 1)) ;;
    ABSTAIN|*) score_abstain=$((score_abstain + 1)) ;;
  esac
done
IFS="$OLD_IFS"

# --- 外部 AI 投票（USE_EXTERNAL=1 時のみ）-----------------------------------
MODE="14vote"
if [ "$USE_EXTERNAL" = "1" ]; then
  AI_REVIEW_JS="${REPO_ROOT}/scripts/ai_review.js"
  if [ -f "$AI_REVIEW_JS" ]; then
    for provider in gpt5 gemini; do
      v=$(node "$AI_REVIEW_JS" --mode=vote --provider="$provider" --proposal "$PROPOSAL" 2>/dev/null || echo "ABSTAIN")
      # 出力末尾の単語（FOR/AGAINST/ABSTAIN）を抽出
      v_clean=$(printf '%s' "$v" | tr -d '[:space:]' | grep -oE "(FOR|AGAINST|ABSTAIN)" | tail -1 || echo "ABSTAIN")
      case "$v_clean" in
        FOR)     score_for=$((score_for + 2)) ;;
        AGAINST) score_against=$((score_against + 2)) ;;
        ABSTAIN|*) score_abstain=$((score_abstain + 2)) ;;
      esac
    done
  else
    echo "[vote_dispatcher] $AI_REVIEW_JS 不在、外部 AI スキップ" >&2
    MODE="10vote_fallback"
  fi
else
  MODE="10vote_fallback"
fi

# --- 集計 + margin 算出 -----------------------------------------------------
margin=$((score_for - score_against))
if [ "$margin" -lt 0 ]; then
  margin=$((0 - margin))
fi

# 判定閾値（モード別）
verdict="autonomous"
if [ "$MODE" = "14vote" ]; then
  # margin >= 5 圧倒的 / margin <= 4 拮抗
  if [ "$margin" -le 4 ]; then
    verdict="escalate"
  fi
else
  # 10vote_fallback: margin >= 4 圧倒的 / margin <= 3 拮抗
  if [ "$margin" -le 3 ]; then
    verdict="escalate"
  fi
fi

# --- ログ書込 ---------------------------------------------------------------
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
printf '%s\t%s\t%s\t%d\t%d\t%d\t%d\t%s\n' \
  "$TS" "$VOTE_ID" "$MODE" "$score_for" "$score_against" "$score_abstain" "$margin" "$verdict" \
  >>"$LOG_FILE"

# --- 古いログ清掃（4 週間保持、1MB rotate）---------------------------------
if [ -f "$LOG_FILE" ]; then
  SZ=$(wc -c <"$LOG_FILE" 2>/dev/null | tr -d ' ')
  if [ "${SZ:-0}" -gt 1048576 ]; then
    ROT="${LOG_FILE}.$(date -u +%Y%m%d).gz"
    gzip -c "$LOG_FILE" > "$ROT" 2>/dev/null || true
    : > "$LOG_FILE"
  fi
  find "$(dirname "$LOG_FILE")" -name "$(basename "$LOG_FILE").*.gz" -mtime +28 -delete 2>/dev/null || true
fi

# --- 結果出力 + exit code --------------------------------------------------
echo "vote_dispatcher: mode=$MODE FOR=$score_for AGAINST=$score_against ABSTAIN=$score_abstain margin=$margin verdict=$verdict"

if [ "$verdict" = "escalate" ]; then
  exit 2
else
  exit 0
fi
