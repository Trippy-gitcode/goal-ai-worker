#!/bin/sh
# GENERATED: DO NOT MODIFY
# scripts/nightly_gpt_crossreview.sh
#
# derived-from: SUBAGENT-DEVSYS-NIGHTLY-REVIEW-V1 + SUBAGENT-DEVSYS-NIGHTLY-WIRING-V1
# spec-ref: core_spec.md §8 (14 票投票機構、外部 LLM 2 種参考) / §8.4 (月次上限到達時 fallback)
# app-independence: APP_REPO_ROOT_ENV / APP_REPO_MARKER / APP_REPO_CANDIDATES
#
# 用途:
#   PO-DIRECTIVE-002 / PD-009 で定義された夜間仕様書総点検レポートを GPT (OpenAI) に
#   クロスレビューさせる runner。
#   nightly_spec_review.sh が出力した verify/nightly_review_YYYY-MM-DD.md を入力とし、
#   OpenAI Chat Completions API (curl) を呼び、verify/nightly_review_YYYY-MM-DD_gpt.md
#   に GPT 所見を出力する。
#
# 引数:
#   --input <path>   入力レポート (必須、例: verify/nightly_review_2026-04-29.md)
#   --mock           実 API 呼出をスキップし、stub 出力のみ生成
#   --help           ヘルプ表示
#
# 動作:
#   1. 入力レポートを Read
#   2. external_review_guardrail.sh で月次/日次上限確認 (共有)
#   3. OPENAI_API_KEY チェック (未設定なら mock fallback)
#   4. OpenAI Chat Completions API へ POST (curl + JSON)
#      - timeout 60s, retry 1 回
#      - HTTP 4xx/5xx / 認証失敗は ERROR ログ + mock fallback
#   5. record_api_cost / record_api_failure で guardrail 状態更新
#   6. verify/nightly_review_YYYY-MM-DD_gpt.md に GPT 所見出力
#
# 認証:
#   OPENAI_API_KEY 環境変数必須 (未設定なら自動 mock fallback)
#
# Exit codes:
#   0 = SUCCESS
#   1 = 引数 / 環境エラー
#   2 = guardrail BLOCK (月次/日次上限到達)

set -eu

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

PROGRESS_LOG="${REPO_ROOT}/verify/nightly_wiring_progress.log"
mkdir -p "${REPO_ROOT}/verify"
log_progress() {
  printf '%s\t%s\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "nightly_gpt_crossreview" "$1" >>"$PROGRESS_LOG" 2>/dev/null || true
}

INPUT_FILE=""
MOCK=0

show_help() {
  cat <<HLP
nightly_gpt_crossreview.sh - 夜間仕様書総点検レポートの GPT クロスレビュー (OpenAI wiring)
Usage:
  nightly_gpt_crossreview.sh --input <path> [--mock] [--help]
Options:
  --input <path>   入力レポートのパス (必須)
                   例: verify/nightly_review_2026-04-29.md
  --mock           実 API 呼出をスキップ、stub 出力のみ
  --help           本ヘルプ
Environment:
  OPENAI_API_KEY            OpenAI API key (未設定時は mock fallback)
  NIGHTLY_GPT_MODEL         OpenAI model (既定: gpt-4o-mini)
  NIGHTLY_GPT_TIMEOUT       curl timeout 秒 (既定: 60)
HLP
}

while [ $# -gt 0 ]; do
  case "$1" in
    --input) shift; INPUT_FILE="${1:-}" ;;
    --mock) MOCK=1 ;;
    --help|-h) show_help; exit 0 ;;
    *) ;;
  esac
  shift || true
done

if [ -z "${INPUT_FILE:-}" ]; then
  echo "ERROR: --input <path> 必須" >&2
  show_help
  exit 1
fi

# 相対パスは REPO_ROOT 起点で解釈
case "$INPUT_FILE" in
  /*) INPUT_ABS="$INPUT_FILE" ;;
  *)  INPUT_ABS="${REPO_ROOT}/${INPUT_FILE}" ;;
esac

if [ ! -f "$INPUT_ABS" ]; then
  echo "ERROR: 入力レポート不在 (${INPUT_ABS})" >&2
  exit 1
fi

# 入力ファイル名から YYYY-MM-DD を抽出
INPUT_BASENAME=$(basename "$INPUT_ABS")
REVIEW_DATE=$(printf '%s\n' "$INPUT_BASENAME" \
  | sed -n 's/^nightly_review_\([0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]\)\.md$/\1/p')

if [ -z "$REVIEW_DATE" ]; then
  REVIEW_DATE="$(date -u +%Y-%m-%d)"
fi

OUTPUT_FILE="${REPO_ROOT}/verify/nightly_review_${REVIEW_DATE}_gpt.md"

# --- 認証チェック (環境変数未設定時は mock 強制) -----------------------------
if [ -z "${OPENAI_API_KEY:-}" ] && [ "$MOCK" = "0" ]; then
  echo "[nightly_gpt_crossreview] WARN: OPENAI_API_KEY not set, mock fallback enabled" >&2
  log_progress "auth_warn OPENAI_API_KEY_not_set mock_fallback"
  MOCK=1
fi

# --- guardrail 確認 (external_review_guardrail.sh 共有) ---------------------
GUARDRAIL_SH="${REPO_ROOT}/scripts/external_review_guardrail.sh"
GUARDRAIL_RESULT="UNCHECKED"
if [ -f "$GUARDRAIL_SH" ]; then
  if . "$GUARDRAIL_SH" >/dev/null 2>&1; then
    if check_guardrail >/dev/null 2>&1; then
      GUARDRAIL_RESULT="PASS"
    else
      GUARDRAIL_RESULT="BLOCK"
    fi
  fi
fi

log_progress "guardrail=${GUARDRAIL_RESULT} review_date=${REVIEW_DATE} mock=${MOCK}"

if [ "$GUARDRAIL_RESULT" = "BLOCK" ]; then
  cat > "$OUTPUT_FILE" <<BLOCKED
# nightly_review_${REVIEW_DATE}_gpt.md (BLOCKED)

<!-- GENERATED: DO NOT MODIFY -->

> **status**: GUARDRAIL_BLOCK
> **review_date**: ${REVIEW_DATE}
> **note**: external_review_guardrail.sh で月次/日次上限到達。GPT クロスレビューは skip。
BLOCKED
  echo "[nightly_gpt_crossreview] guardrail BLOCK、stub 出力のみ生成 (${OUTPUT_FILE})" >&2
  exit 2
fi

# --- mock fallback 経路 -----------------------------------------------------
write_mock_output() {
  _reason="$1"
  cat > "$OUTPUT_FILE" <<STUB
# nightly_review_${REVIEW_DATE}_gpt.md (MOCK)

<!-- GENERATED: DO NOT MODIFY -->

> **status**: MOCK_FALLBACK (${_reason})
> **derived-from**: SUBAGENT-DEVSYS-NIGHTLY-WIRING-V1
> **input**: ${INPUT_ABS#${REPO_ROOT}/}
> **review_date**: ${REVIEW_DATE}
> **guardrail**: ${GUARDRAIL_RESULT}
> **mock_mode**: 1

## 1. GPT クロスレビュー所見 (mock placeholder)

実 API 呼出は \`OPENAI_API_KEY\` 環境変数設定 + \`--mock\` 未指定時のみ。
本実行時は OpenAI Chat Completions API (gpt-4o-mini 既定) を呼び、独立第三者視点で
誤検知 / 抜け漏れ / 重大度判定の妥当性を再評価する。

## 2. 雛形フォーマット

\`\`\`
- severity: <CRITICAL|HIGH|MEDIUM|LOW>
  file: <repo_root 相対 path>
  line: <行番号>
  issue: <一文要約>
  spec_reference: <core_spec.md §NNN>
  suggestion: <改善提案>
\`\`\`

## 3. wiring 後の動作

1. 入力レポート (${INPUT_ABS#${REPO_ROOT}/}) 全文を OpenAI Chat Completions API に POST
2. system prompt: dev-system 仕様書総点検のクロスレビュー指示
3. レスポンスの assistant content を本ファイル §1 に展開
4. \`record_api_cost <USD>\` で guardrail 状態更新

## 4. 5 行サマリー (mock)

1. mock fallback 動作確認
2. CRITICAL=0 / HIGH=0 / MEDIUM=0 / LOW=0 (mock)
3. 入力: ${INPUT_ABS#${REPO_ROOT}/}
4. guardrail: ${GUARDRAIL_RESULT}
5. 実 API 呼出は OPENAI_API_KEY 設定時のみ
STUB
}

if [ "$MOCK" = "1" ]; then
  write_mock_output "MOCK flag or OPENAI_API_KEY absent"
  log_progress "mock_done review_date=${REVIEW_DATE}"
  echo "[nightly_gpt_crossreview] MOCK OK input=${INPUT_FILE} output=${OUTPUT_FILE} guardrail=${GUARDRAIL_RESULT}"
  exit 0
fi

# --- 実 API 呼出 (OpenAI Chat Completions) ----------------------------------
GPT_MODEL="${NIGHTLY_GPT_MODEL:-gpt-4o-mini}"
GPT_TIMEOUT="${NIGHTLY_GPT_TIMEOUT:-60}"
GPT_API_URL="https://api.openai.com/v1/chat/completions"

if ! command -v curl >/dev/null 2>&1; then
  echo "[nightly_gpt_crossreview] ERROR: curl not found, fallback to mock" >&2
  log_progress "error_no_curl mock_fallback"
  write_mock_output "curl not found"
  echo "[nightly_gpt_crossreview] MOCK OK (no curl) input=${INPUT_FILE} output=${OUTPUT_FILE}"
  exit 0
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "[nightly_gpt_crossreview] ERROR: python3 not found, fallback to mock" >&2
  log_progress "error_no_python3 mock_fallback"
  write_mock_output "python3 not found"
  exit 0
fi

# JSON payload を python3 で生成 (入力レポート全文 + system prompt)
TMP_DIR="$(mktemp -d -t nightly_gpt.XXXXXX)"
trap 'rm -rf "$TMP_DIR"' EXIT

PAYLOAD_FILE="${TMP_DIR}/payload.json"
RESPONSE_FILE="${TMP_DIR}/response.json"
HTTP_STATUS_FILE="${TMP_DIR}/http_status.txt"

INPUT_ABS_ENV="$INPUT_ABS" GPT_MODEL_ENV="$GPT_MODEL" python3 - <<'PY' >"$PAYLOAD_FILE"
import json
import os
import sys

with open(os.environ["INPUT_ABS_ENV"], "r", encoding="utf-8") as f:
    report = f.read()

system_prompt = (
    "あなたは dev-system 仕様書総点検レポートの独立第三者レビュー担当です。"
    "以下のレポートを独立評価し、誤検知 / 抜け漏れ / 重大度判定の妥当性を再評価してください。"
    "CRITICAL / HIGH / MEDIUM / LOW で再分類し、最終 5 行サマリーを末尾に付記してください。"
    "出力フォーマットは strict (- severity / file / line / issue / spec_reference / suggestion ブロック)。"
    "末尾に SUMMARY: critical=N high=N medium=N low=N を付記。"
)

user_prompt = f"以下は dev-system 仕様書総点検レポートです。クロスレビューしてください。\n\n---\n\n{report}"

payload = {
    "model": os.environ["GPT_MODEL_ENV"],
    "messages": [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ],
    "temperature": 0.2,
}
print(json.dumps(payload))
PY

# curl POST (timeout + retry 1)
GPT_HTTP_STATUS=""
GPT_RESPONSE_BODY=""
GPT_ATTEMPT=0
GPT_MAX=2
GPT_SUCCESS=0

while [ "$GPT_ATTEMPT" -lt "$GPT_MAX" ]; do
  GPT_ATTEMPT=$((GPT_ATTEMPT + 1))
  if curl -sS -o "$RESPONSE_FILE" -w '%{http_code}' \
       --max-time "$GPT_TIMEOUT" \
       -X POST "$GPT_API_URL" \
       -H "Authorization: Bearer ${OPENAI_API_KEY}" \
       -H "Content-Type: application/json" \
       -d "@${PAYLOAD_FILE}" >"$HTTP_STATUS_FILE" 2>>"${TMP_DIR}/curl.err"; then
    GPT_HTTP_STATUS=$(cat "$HTTP_STATUS_FILE" 2>/dev/null | head -1 | tr -d ' \n\r')
    case "$GPT_HTTP_STATUS" in
      2*)
        GPT_SUCCESS=1
        break
        ;;
      4*|5*|*)
        log_progress "http_error attempt=${GPT_ATTEMPT} status=${GPT_HTTP_STATUS}"
        ;;
    esac
  else
    log_progress "curl_failed attempt=${GPT_ATTEMPT}"
  fi
done

if [ "$GPT_SUCCESS" = "0" ]; then
  echo "[nightly_gpt_crossreview] ERROR: API call failed (status=${GPT_HTTP_STATUS:-?}), fallback to mock" >&2
  log_progress "api_failed status=${GPT_HTTP_STATUS:-?} mock_fallback"
  # record_api_failure (連続失敗カウンタ +1, 3 到達で 1h paused)
  if command -v record_api_failure >/dev/null 2>&1; then
    record_api_failure || true
  fi
  write_mock_output "API call failed status=${GPT_HTTP_STATUS:-unknown}"
  echo "[nightly_gpt_crossreview] MOCK OK (API failed) input=${INPUT_FILE} output=${OUTPUT_FILE}"
  exit 0
fi

# --- レスポンス解析 + 出力ファイル生成 -------------------------------------
ASSISTANT_CONTENT=$(RESPONSE_FILE_ENV="$RESPONSE_FILE" python3 - <<'PY'
import json
import os
import sys

try:
    with open(os.environ["RESPONSE_FILE_ENV"], "r", encoding="utf-8") as f:
        d = json.load(f)
    choices = d.get("choices", [])
    if choices:
        msg = choices[0].get("message", {})
        print(msg.get("content", ""))
except Exception as e:
    print(f"(response parse error: {e})", file=sys.stderr)
PY
)

# トークン使用量から USD 概算 (gpt-4o-mini: input $0.15/1M, output $0.60/1M)
USAGE_USD=$(RESPONSE_FILE_ENV="$RESPONSE_FILE" GPT_MODEL_ENV="$GPT_MODEL" python3 - <<'PY' 2>/dev/null || echo "0"
import json
import os

with open(os.environ["RESPONSE_FILE_ENV"], "r", encoding="utf-8") as f:
    d = json.load(f)
usage = d.get("usage", {})
in_tokens = int(usage.get("prompt_tokens", 0))
out_tokens = int(usage.get("completion_tokens", 0))
model = os.environ.get("GPT_MODEL_ENV", "gpt-4o-mini")
# gpt-4o-mini 既定価格 (USD per 1M tokens)
if "gpt-4o-mini" in model:
    in_rate = 0.15
    out_rate = 0.60
elif "gpt-4o" in model:
    in_rate = 2.50
    out_rate = 10.00
else:
    in_rate = 0.50
    out_rate = 1.50
usd = (in_tokens * in_rate + out_tokens * out_rate) / 1_000_000
print(f"{usd:.6f}")
PY
)

# guardrail 消費量更新
if command -v record_api_cost >/dev/null 2>&1; then
  record_api_cost "${USAGE_USD:-0}" || true
fi

mkdir -p "${REPO_ROOT}/verify"
cat > "$OUTPUT_FILE" <<HEADER
# nightly_review_${REVIEW_DATE}_gpt.md

<!-- GENERATED: DO NOT MODIFY -->

> **status**: OK
> **derived-from**: SUBAGENT-DEVSYS-NIGHTLY-WIRING-V1
> **input**: ${INPUT_ABS#${REPO_ROOT}/}
> **review_date**: ${REVIEW_DATE}
> **guardrail**: ${GUARDRAIL_RESULT}
> **gpt_model**: ${GPT_MODEL}
> **http_status**: ${GPT_HTTP_STATUS}
> **estimated_usd**: ${USAGE_USD:-0}
> **mock_mode**: 0

## 1. GPT クロスレビュー所見

HEADER

if [ -n "$ASSISTANT_CONTENT" ]; then
  printf '%s\n' "$ASSISTANT_CONTENT" >>"$OUTPUT_FILE"
else
  printf '\n(empty assistant content; HTTP=%s)\n' "$GPT_HTTP_STATUS" >>"$OUTPUT_FILE"
fi

cat >>"$OUTPUT_FILE" <<FOOTER

---

## 2. 実行メタデータ

- review_date: ${REVIEW_DATE}
- input: ${INPUT_ABS#${REPO_ROOT}/}
- gpt_model: ${GPT_MODEL}
- http_status: ${GPT_HTTP_STATUS}
- estimated_usd: ${USAGE_USD:-0}
- guardrail: ${GUARDRAIL_RESULT}
FOOTER

log_progress "api_ok status=${GPT_HTTP_STATUS} usd=${USAGE_USD:-0} review_date=${REVIEW_DATE}"
echo "[nightly_gpt_crossreview] OK input=${INPUT_FILE} output=${OUTPUT_FILE} status=${GPT_HTTP_STATUS} usd=${USAGE_USD:-0} guardrail=${GUARDRAIL_RESULT}"
exit 0
