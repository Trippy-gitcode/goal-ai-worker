#!/bin/sh
# GENERATED: DO NOT MODIFY
# scripts/nightly_spec_review.sh
#
# derived-from: SUBAGENT-DEVSYS-NIGHTLY-REVIEW-V1 + SUBAGENT-DEVSYS-NIGHTLY-WIRING-V1
# spec-ref: core_spec.md §11 / §9 (夜間自動着手モード) / §8 (外部 LLM 連携)
# app-independence: APP_REPO_ROOT_ENV / APP_REPO_MARKER / APP_REPO_CANDIDATES
#
# 用途:
#   PO-DIRECTIVE-002 / PD-009 で定義された夜間仕様書総点検ルーティンの runner。
#   日付から rotation index を計算し、instructions/nightly_review_rotation.md から
#   5 ペルソナを抽出、claude CLI 並列ペルソナ呼出 + 出力集約を実施する。
#
# 引数:
#   --date YYYY-MM-DD   対象日付 (省略時は今日)
#   --dry-run           実 Read / API 呼出をスキップし、rotation_id + 5 ペルソナだけ stdout 出力
#   --mock              claude CLI 並列呼出を mock fallback (V1 stub 動作維持)
#   --help              ヘルプ表示
#
# 動作:
#   1. 引数 / 既定日付の決定
#   2. REVIEW_START_DATE (2026-04-29) からの経過日数で N 算出
#   3. rotation_index = ((N - 1) mod 15) + 1
#   4. instructions/nightly_review_rotation.md から該当行抽出 (TAB 区切り)
#   5. external_review_guardrail.sh で月次/日次上限確認
#   6. 5 ペルソナの prompt を templates/nightly_persona_prompts/ から動的構築
#   7. claude CLI 並列 (5 並列) で起動、wait で同期、各 60s timeout
#   8. CRITICAL / HIGH / MEDIUM / LOW 4 段階で集計
#   9. verify/nightly_review_YYYY-MM-DD.md に出力
#
# 認証:
#   ANTHROPIC_API_KEY 環境変数が未設定の場合、claude CLI 経路を mock fallback
#   (claude CLI は OAuth 経由でも動作するが、wiring の安全装置として明示チェック)
#
# Exit codes:
#   0 = SUCCESS
#   1 = 引数 / 環境エラー
#   2 = 上限到達 (external_review_guardrail.sh で BLOCK)

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
  # dev-system 自身が点検対象なので、SCRIPT_DIR の親を fallback とする
  REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
fi
cd "$REPO_ROOT"

PROGRESS_LOG="${REPO_ROOT}/verify/nightly_wiring_progress.log"
mkdir -p "${REPO_ROOT}/verify"
log_progress() {
  printf '%s\t%s\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "nightly_spec_review" "$1" >>"$PROGRESS_LOG" 2>/dev/null || true
}

# --- 引数パース --------------------------------------------------------------
TARGET_DATE=""
DRY_RUN=0
MOCK=0

show_help() {
  cat <<HLP
nightly_spec_review.sh - 夜間仕様書総点検 runner (claude CLI 並列ペルソナ呼出版)
Usage:
  nightly_spec_review.sh [--date YYYY-MM-DD] [--dry-run] [--mock] [--help]
Options:
  --date YYYY-MM-DD   対象日付 (省略時は今日)
  --dry-run           実 Read / API 呼出をスキップ、rotation_id + 5 ペルソナだけ出力
  --mock              claude CLI 並列呼出を mock fallback (V1 stub 動作維持)
  --help              本ヘルプ
Examples:
  nightly_spec_review.sh --date 2026-04-29 --dry-run
  nightly_spec_review.sh --date 2026-04-29 --mock
  nightly_spec_review.sh --date 2026-04-29              # 実呼出 (ANTHROPIC_API_KEY 必須)
HLP
}

while [ $# -gt 0 ]; do
  case "$1" in
    --date) shift; TARGET_DATE="${1:-}" ;;
    --dry-run) DRY_RUN=1 ;;
    --mock) MOCK=1 ;;
    --help|-h) show_help; exit 0 ;;
    *) ;;
  esac
  shift || true
done

if [ -z "${TARGET_DATE:-}" ]; then
  TARGET_DATE="$(date -u +%Y-%m-%d)"
fi

# 日付フォーマット検証 (YYYY-MM-DD)
case "$TARGET_DATE" in
  [0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]) ;;
  *)
    echo "ERROR: --date は YYYY-MM-DD 形式必須 (受領=${TARGET_DATE})" >&2
    exit 1
    ;;
esac

# --- 認証チェック (環境変数未設定時は mock 強制) -----------------------------
# 注意: claude CLI は OAuth 経由でも動作可能だが、wiring 安全装置として
#       ANTHROPIC_API_KEY を明示的に確認 (未設定なら mock fallback)
if [ -z "${ANTHROPIC_API_KEY:-}" ] && [ "$MOCK" = "0" ] && [ "$DRY_RUN" = "0" ]; then
  echo "[nightly_spec_review] WARN: ANTHROPIC_API_KEY not set, mock fallback enabled" >&2
  log_progress "auth_warn ANTHROPIC_API_KEY_not_set mock_fallback"
  MOCK=1
fi

# --- 経過日数算出 (REVIEW_START_DATE = 2026-04-29) ---------------------------
REVIEW_START_DATE="2026-04-29"

# epoch 変換 (macOS / Linux fallback)
to_epoch() {
  _d="$1"
  date -j -u -f "%Y-%m-%d" "$_d" +%s 2>/dev/null \
    || date -u -d "$_d" +%s 2>/dev/null \
    || echo ""
}

START_EPOCH=$(to_epoch "$REVIEW_START_DATE")
TARGET_EPOCH=$(to_epoch "$TARGET_DATE")

if [ -z "$START_EPOCH" ] || [ -z "$TARGET_EPOCH" ]; then
  echo "ERROR: 日付 epoch 変換失敗 (start=${REVIEW_START_DATE} target=${TARGET_DATE})" >&2
  exit 1
fi

DAY_N=$(( (TARGET_EPOCH - START_EPOCH) / 86400 + 1 ))
if [ "$DAY_N" -lt 1 ]; then
  echo "ERROR: target_date が REVIEW_START_DATE (${REVIEW_START_DATE}) より前 (day_n=${DAY_N})" >&2
  exit 1
fi

ROTATION_INDEX=$(( ((DAY_N - 1) % 15) + 1 ))

# --- rotation_id 算出 (1〜15 → A1..A5 / B1..B5 / C1..C5) ---------------------
case "$ROTATION_INDEX" in
  1)  ROTATION_ID="A1" ;;
  2)  ROTATION_ID="A2" ;;
  3)  ROTATION_ID="A3" ;;
  4)  ROTATION_ID="A4" ;;
  5)  ROTATION_ID="A5" ;;
  6)  ROTATION_ID="B1" ;;
  7)  ROTATION_ID="B2" ;;
  8)  ROTATION_ID="B3" ;;
  9)  ROTATION_ID="B4" ;;
  10) ROTATION_ID="B5" ;;
  11) ROTATION_ID="C1" ;;
  12) ROTATION_ID="C2" ;;
  13) ROTATION_ID="C3" ;;
  14) ROTATION_ID="C4" ;;
  15) ROTATION_ID="C5" ;;
  *)
    echo "ERROR: rotation_index 範囲外 (${ROTATION_INDEX})" >&2
    exit 1
    ;;
esac

# --- ローテーション SSoT から 5 ペルソナ抽出 --------------------------------
ROTATION_FILE="${REPO_ROOT}/instructions/nightly_review_rotation.md"
if [ ! -f "$ROTATION_FILE" ]; then
  echo "ERROR: rotation SSoT 不在 (${ROTATION_FILE})" >&2
  exit 1
fi

# TAB 区切り行 "| <id>\t<p1>\t<p2>\t<p3>\t<p4>\t<p5>\t<intent> |" を抽出
ROTATION_LINE=$(grep -E "^\| ${ROTATION_ID}	" "$ROTATION_FILE" | head -1 || true)
if [ -z "$ROTATION_LINE" ]; then
  echo "ERROR: rotation_id=${ROTATION_ID} が SSoT に未登録" >&2
  exit 1
fi

# TAB で分割 (POSIX awk, FS=tab)
PERSONA_1=$(printf '%s\n' "$ROTATION_LINE" | awk -F'	' '{print $2}' | sed 's/^ *//; s/ *$//')
PERSONA_2=$(printf '%s\n' "$ROTATION_LINE" | awk -F'	' '{print $3}' | sed 's/^ *//; s/ *$//')
PERSONA_3=$(printf '%s\n' "$ROTATION_LINE" | awk -F'	' '{print $4}' | sed 's/^ *//; s/ *$//')
PERSONA_4=$(printf '%s\n' "$ROTATION_LINE" | awk -F'	' '{print $5}' | sed 's/^ *//; s/ *$//')
PERSONA_5=$(printf '%s\n' "$ROTATION_LINE" | awk -F'	' '{print $6}' | sed 's/^ *//; s/ *$//')
PATTERN_INTENT=$(printf '%s\n' "$ROTATION_LINE" | awk -F'	' '{print $7}' | sed 's/ *|.*$//; s/^ *//; s/ *$//')

PERSONAS_CSV="${PERSONA_1},${PERSONA_2},${PERSONA_3},${PERSONA_4},${PERSONA_5}"

# --- dry-run 早期出力 -------------------------------------------------------
if [ "$DRY_RUN" = "1" ]; then
  cat <<DRY
target_date=${TARGET_DATE}
day_n=${DAY_N}
rotation_index=${ROTATION_INDEX}
rotation_id=${ROTATION_ID}
pattern_intent=${PATTERN_INTENT}
personas=${PERSONAS_CSV}
DRY
  log_progress "dry_run date=${TARGET_DATE} rotation_id=${ROTATION_ID}"
  exit 0
fi

# --- 点検対象ファイル列挙 (po-decisions.md PO-DIRECTIVE-002 準拠) -----------
TARGET_FILES_LIST="$(mktemp -t nightly_targets.XXXXXX)"
trap 'rm -f "$TARGET_FILES_LIST"' EXIT

{
  [ -f "${REPO_ROOT}/core_spec.md" ] && echo "core_spec.md"
  [ -f "${REPO_ROOT}/docs/architecture.md" ] && echo "docs/architecture.md"
  [ -f "${REPO_ROOT}/docs/changeable_policy.md" ] && echo "docs/changeable_policy.md"
  find "${REPO_ROOT}/docs/plans" -maxdepth 1 -type f -name 'sub_*.md' 2>/dev/null \
    | sed "s|^${REPO_ROOT}/||"
  find "${REPO_ROOT}/docs/test" -maxdepth 1 -type f -name '*.md' 2>/dev/null \
    | sed "s|^${REPO_ROOT}/||"
  find "${REPO_ROOT}/templates" -maxdepth 2 -type f -name '*.template.*' 2>/dev/null \
    | sed "s|^${REPO_ROOT}/||"
  find "${REPO_ROOT}/instructions/templates" -maxdepth 1 -type f -name '*.template.md' 2>/dev/null \
    | sed "s|^${REPO_ROOT}/||"
  echo "instructions/session_progress.md"
  echo "docs/decision_log.md"
  echo "instructions/in_flight_topics.md"
  echo "instructions/subagent_status.md"
  echo "verify/adv_violation_log.md"
} > "$TARGET_FILES_LIST"

TARGET_COUNT=$(wc -l <"$TARGET_FILES_LIST" | tr -d ' ')

# --- external_review_guardrail.sh で上限確認 (本 runner も外部 LLM 経路) ----
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
else
  GUARDRAIL_RESULT="GUARDRAIL_UNAVAILABLE"
fi

log_progress "guardrail=${GUARDRAIL_RESULT} date=${TARGET_DATE} rotation_id=${ROTATION_ID} target=${TARGET_COUNT}"

# --- 出力ファイル雛形書出 ---------------------------------------------------
OUTPUT_FILE="${REPO_ROOT}/verify/nightly_review_${TARGET_DATE}.md"
TEMPLATE_FILE="${REPO_ROOT}/templates/nightly_review.template.md"

# dev-system バージョン取得 (templates/dev-system-generated.template.json から)
DEV_SYSTEM_VERSION="v0.1.0"
if [ -f "${REPO_ROOT}/templates/dev-system-generated.template.json" ]; then
  _v=$(grep -E '"generatedByVersion"' "${REPO_ROOT}/templates/dev-system-generated.template.json" 2>/dev/null \
    | head -1 | sed 's/.*"generatedByVersion"[ ]*:[ ]*"\([^"]*\)".*/\1/')
  [ -n "$_v" ] && DEV_SYSTEM_VERSION="$_v"
fi

mkdir -p "${REPO_ROOT}/verify"

if [ -f "$TEMPLATE_FILE" ]; then
  sed \
    -e "s/{{REVIEW_DATE}}/${TARGET_DATE}/g" \
    -e "s/{{ROTATION_ID}}/${ROTATION_ID}/g" \
    -e "s/{{PERSONAS}}/${PERSONAS_CSV}/g" \
    -e "s|{{TARGET_FILES}}|${TARGET_COUNT} files (see verify/nightly_targets_${TARGET_DATE}.list)|g" \
    -e "s/{{DEV_SYSTEM_VERSION}}/${DEV_SYSTEM_VERSION}/g" \
    "$TEMPLATE_FILE" > "$OUTPUT_FILE"
else
  cat > "$OUTPUT_FILE" <<MOCK
# nightly_review_${TARGET_DATE}.md
review_date: ${TARGET_DATE}
rotation_id: ${ROTATION_ID}
personas: ${PERSONAS_CSV}
target_files_count: ${TARGET_COUNT}
dev_system_version: ${DEV_SYSTEM_VERSION}
guardrail: ${GUARDRAIL_RESULT}

(template absent: ${TEMPLATE_FILE})
MOCK
fi

# 点検対象リストを別ファイルに保存
cp "$TARGET_FILES_LIST" "${REPO_ROOT}/verify/nightly_targets_${TARGET_DATE}.list"

# guardrail BLOCK 時は exit 2
if [ "$GUARDRAIL_RESULT" = "BLOCK" ]; then
  echo "[nightly_spec_review] guardrail BLOCK (月次/日次上限到達)、出力ファイルは生成済 (${OUTPUT_FILE})" >&2
  log_progress "exit_2 guardrail_block"
  exit 2
fi

# --- ペルソナ prompt 動的構築 + claude CLI 並列呼出 -------------------------
PERSONA_PROMPTS_DIR="${REPO_ROOT}/templates/nightly_persona_prompts"
PERSONAS_TMP_DIR="$(mktemp -d -t nightly_personas.XXXXXX)"
trap 'rm -f "$TARGET_FILES_LIST"; rm -rf "$PERSONAS_TMP_DIR"' EXIT

# 点検対象ファイルブロック (絶対パス, 各行 "- /abs/path") の生成
TARGET_FILES_BLOCK_FILE="${PERSONAS_TMP_DIR}/target_files_block.txt"
: >"$TARGET_FILES_BLOCK_FILE"
while IFS= read -r _rel; do
  [ -z "$_rel" ] && continue
  printf '%s\n' "- ${REPO_ROOT}/${_rel}" >>"$TARGET_FILES_BLOCK_FILE"
done <"$TARGET_FILES_LIST"

# persona_key → template ファイル名のマッピング
persona_template_path() {
  case "$1" in
    llm_app_designer)    echo "${PERSONA_PROMPTS_DIR}/llm_app_designer.template.md" ;;
    prompt_engineer)     echo "${PERSONA_PROMPTS_DIR}/prompt_engineer.template.md" ;;
    sw_pm)               echo "${PERSONA_PROMPTS_DIR}/sw_pm.template.md" ;;
    sw_architect)        echo "${PERSONA_PROMPTS_DIR}/sw_architect.template.md" ;;
    sre)                 echo "${PERSONA_PROMPTS_DIR}/sre.template.md" ;;
    qa_engineer)         echo "${PERSONA_PROMPTS_DIR}/qa.template.md" ;;
    tech_writer)         echo "${PERSONA_PROMPTS_DIR}/tech_writer.template.md" ;;
    security_engineer)   echo "${PERSONA_PROMPTS_DIR}/security.template.md" ;;
    ai_consultant)       echo "${PERSONA_PROMPTS_DIR}/ai_consultant.template.md" ;;
    data_governance)     echo "${PERSONA_PROMPTS_DIR}/data_governance.template.md" ;;
    *)                   echo "" ;;
  esac
}

# claude CLI 経路 (60s timeout, retry 1)
NIGHTLY_PERSONA_TIMEOUT="${NIGHTLY_PERSONA_TIMEOUT:-60}"
NIGHTLY_PERSONA_MODEL="${NIGHTLY_PERSONA_MODEL:-haiku}"

run_persona_claude() {
  _pp="$1"   # prompt path
  _attempt=0
  _max=2
  while [ "$_attempt" -lt "$_max" ]; do
    _attempt=$((_attempt + 1))
    if [ "${NIGHTLY_PERSONA_MODEL}" = "none" ]; then
      if command -v gtimeout >/dev/null 2>&1; then
        gtimeout "$NIGHTLY_PERSONA_TIMEOUT" claude -p "$(cat "$_pp")" 2>/dev/null && return 0
      elif command -v timeout >/dev/null 2>&1; then
        timeout "$NIGHTLY_PERSONA_TIMEOUT" claude -p "$(cat "$_pp")" 2>/dev/null && return 0
      else
        claude -p "$(cat "$_pp")" 2>/dev/null && return 0
      fi
    else
      if command -v gtimeout >/dev/null 2>&1; then
        gtimeout "$NIGHTLY_PERSONA_TIMEOUT" claude --model "$NIGHTLY_PERSONA_MODEL" -p "$(cat "$_pp")" 2>/dev/null && return 0
      elif command -v timeout >/dev/null 2>&1; then
        timeout "$NIGHTLY_PERSONA_TIMEOUT" claude --model "$NIGHTLY_PERSONA_MODEL" -p "$(cat "$_pp")" 2>/dev/null && return 0
      else
        claude --model "$NIGHTLY_PERSONA_MODEL" -p "$(cat "$_pp")" 2>/dev/null && return 0
      fi
    fi
  done
  return 1
}

build_persona_prompt() {
  _persona="$1"
  _out="$2"
  _tmpl=$(persona_template_path "$_persona")
  if [ -z "$_tmpl" ] || [ ! -f "$_tmpl" ]; then
    cat >"$_out" <<FALLBACK
# nightly persona prompt (template absent: ${_persona})
review_date: ${TARGET_DATE}
rotation_id: ${ROTATION_ID}
repo_root: ${REPO_ROOT}

点検対象:
$(cat "$TARGET_FILES_BLOCK_FILE")
FALLBACK
    return
  fi
  # placeholder 置換 (sed 安全のため | 区切り)
  _block_escaped=$(awk 'BEGIN{ORS="\\n"} {gsub(/\\/,"\\\\"); gsub(/[&|]/,"\\\\&"); print}' "$TARGET_FILES_BLOCK_FILE")
  sed \
    -e "s|{{REVIEW_DATE}}|${TARGET_DATE}|g" \
    -e "s|{{ROTATION_ID}}|${ROTATION_ID}|g" \
    -e "s|{{REPO_ROOT}}|${REPO_ROOT}|g" \
    "$_tmpl" >"${_out}.tmp"
  # TARGET_FILES_BLOCK は複数行のため別経路で挿入
  awk -v block_file="$TARGET_FILES_BLOCK_FILE" '
    /\{\{TARGET_FILES_BLOCK\}\}/ {
      while ((getline line < block_file) > 0) {
        print line
      }
      close(block_file)
      next
    }
    { print }
  ' "${_out}.tmp" >"$_out"
  rm -f "${_out}.tmp"
}

# 5 ペルソナ並列呼出
PERSONA_LIST="${PERSONA_1}
${PERSONA_2}
${PERSONA_3}
${PERSONA_4}
${PERSONA_5}"

idx=0
OLD_IFS="$IFS"
IFS='
'
for persona in $PERSONA_LIST; do
  idx=$((idx + 1))
  prompt_path="${PERSONAS_TMP_DIR}/persona_${idx}_${persona}.prompt"
  out_path="${PERSONAS_TMP_DIR}/persona_${idx}_${persona}.out"
  err_path="${PERSONAS_TMP_DIR}/persona_${idx}_${persona}.err"
  status_path="${PERSONAS_TMP_DIR}/persona_${idx}_${persona}.status"
  build_persona_prompt "$persona" "$prompt_path"
  (
    if [ "$MOCK" = "1" ]; then
      cat >"$out_path" <<MOCKOUT
SUMMARY: critical=0 high=0 medium=0 low=0
NOTE: mock fallback (NIGHTLY_PERSONA_MOCK=1 or ANTHROPIC_API_KEY not set)
persona=${persona}
review_date=${TARGET_DATE}
rotation_id=${ROTATION_ID}
MOCKOUT
      echo "MOCK" >"$status_path"
    elif ! command -v claude >/dev/null 2>&1; then
      cat >"$out_path" <<NOCMD
SUMMARY: critical=0 high=0 medium=0 low=0
ERROR: claude CLI not found in PATH
persona=${persona}
NOCMD
      echo "ERROR_NO_CLI" >"$status_path"
    else
      _raw=""
      _rc=0
      _raw=$(run_persona_claude "$prompt_path" 2>>"$err_path") || _rc=$?
      if [ "${_rc:-0}" = "0" ] && [ -n "$_raw" ]; then
        printf '%s\n' "$_raw" >"$out_path"
        echo "OK" >"$status_path"
      else
        cat >"$out_path" <<ERROUT
SUMMARY: critical=0 high=0 medium=0 low=0
ERROR: claude CLI failed (exit=${_rc:-?}), persona=${persona}, see ${err_path#${REPO_ROOT}/}
ERROUT
        echo "ERROR" >"$status_path"
      fi
    fi
  ) &
done
IFS="$OLD_IFS"

# 全 background 完了待機
wait

# --- 集計 -------------------------------------------------------------------
TOTAL_CRITICAL=0
TOTAL_HIGH=0
TOTAL_MEDIUM=0
TOTAL_LOW=0
TOTAL_OK=0
TOTAL_ERROR=0
TOTAL_MOCK=0
TOTAL_ABSTAIN=0

PERSONA_DETAILS_FILE="${PERSONAS_TMP_DIR}/persona_details.md"
: >"$PERSONA_DETAILS_FILE"

idx=0
IFS='
'
for persona in $PERSONA_LIST; do
  idx=$((idx + 1))
  out_path="${PERSONAS_TMP_DIR}/persona_${idx}_${persona}.out"
  status_path="${PERSONAS_TMP_DIR}/persona_${idx}_${persona}.status"
  status="UNKNOWN"
  [ -f "$status_path" ] && status=$(cat "$status_path" 2>/dev/null | head -1)
  case "$status" in
    OK)            TOTAL_OK=$((TOTAL_OK + 1)) ;;
    MOCK)          TOTAL_MOCK=$((TOTAL_MOCK + 1)) ;;
    ERROR|ERROR_NO_CLI) TOTAL_ERROR=$((TOTAL_ERROR + 1)) ;;
    ABSTAIN)       TOTAL_ABSTAIN=$((TOTAL_ABSTAIN + 1)) ;;
  esac

  if [ -f "$out_path" ]; then
    # SUMMARY: critical=N high=N medium=N low=N を集計
    _sum_line=$(grep -E '^SUMMARY:' "$out_path" 2>/dev/null | head -1 || true)
    if [ -n "$_sum_line" ]; then
      _c=$(printf '%s' "$_sum_line" | sed -n 's/.*critical=\([0-9][0-9]*\).*/\1/p')
      _h=$(printf '%s' "$_sum_line" | sed -n 's/.*high=\([0-9][0-9]*\).*/\1/p')
      _m=$(printf '%s' "$_sum_line" | sed -n 's/.*medium=\([0-9][0-9]*\).*/\1/p')
      _l=$(printf '%s' "$_sum_line" | sed -n 's/.*low=\([0-9][0-9]*\).*/\1/p')
      [ -z "$_c" ] && _c=0
      [ -z "$_h" ] && _h=0
      [ -z "$_m" ] && _m=0
      [ -z "$_l" ] && _l=0
      TOTAL_CRITICAL=$((TOTAL_CRITICAL + _c))
      TOTAL_HIGH=$((TOTAL_HIGH + _h))
      TOTAL_MEDIUM=$((TOTAL_MEDIUM + _m))
      TOTAL_LOW=$((TOTAL_LOW + _l))
    fi
    {
      printf '\n### Persona %d: %s (status=%s)\n\n' "$idx" "$persona" "$status"
      printf '```\n'
      cat "$out_path"
      printf '\n```\n'
    } >>"$PERSONA_DETAILS_FILE"
  fi
done
IFS="$OLD_IFS"

# --- ペルソナ別所見を出力ファイルに追記 -------------------------------------
{
  printf '\n---\n\n## 8. ペルソナ呼出結果 (wiring)\n\n'
  printf '%s\n' "- claude CLI 実行ステータス: OK=${TOTAL_OK} MOCK=${TOTAL_MOCK} ERROR=${TOTAL_ERROR} ABSTAIN=${TOTAL_ABSTAIN}"
  printf '%s\n' "- 集計: CRITICAL=${TOTAL_CRITICAL} HIGH=${TOTAL_HIGH} MEDIUM=${TOTAL_MEDIUM} LOW=${TOTAL_LOW}"
  printf '%s\n' "- guardrail: ${GUARDRAIL_RESULT}"
  printf '%s\n' "- mock_mode: ${MOCK}"
  cat "$PERSONA_DETAILS_FILE"
} >>"$OUTPUT_FILE"

# --- §3 集計表 sed 置換 (real mode のみ、mock_mode=1 時は all 0 維持) --------
# persona output 本文の `- severity: <S>` + `  file: <path>` + `  line: <range>` を
# 抽出し、severity 毎に count + 主要箇所 sample (≤ 3 件 file:line) を計算。
if [ "$MOCK" = "0" ] && [ "$TOTAL_OK" -gt 0 ]; then
  collect_severity() {
    _sev="$1"
    _count=$(awk -v sev="$_sev" '
      /^- severity: / { current = ($3 == sev) ? 1 : 0; next }
      current && /^  file: / { f = $2 }
      current && /^  line: / { l = $2; if (f != "" && l != "") { print f ":L" l; f=""; l=""; current=0 } }
    ' "$OUTPUT_FILE" | wc -l | tr -d ' ')
    _samples=$(awk -v sev="$_sev" '
      /^- severity: / { current = ($3 == sev) ? 1 : 0; next }
      current && /^  file: / { f = $2 }
      current && /^  line: / { l = $2; if (f != "" && l != "") { print f ":L" l; f=""; l=""; current=0 } }
    ' "$OUTPUT_FILE" | head -3 | tr '\n' ',' | sed 's/,$//; s/,/, /g')
    [ -z "$_samples" ] && _samples="(none)"
    [ -z "$_count" ] && _count=0
    printf '%s\t%s\n' "$_count" "$_samples"
  }
  _crit_pair=$(collect_severity CRITICAL)
  _high_pair=$(collect_severity HIGH)
  _med_pair=$(collect_severity MEDIUM)
  _low_pair=$(collect_severity LOW)
  _crit_c=$(printf '%s' "$_crit_pair" | awk -F'\t' '{print $1}')
  _crit_s=$(printf '%s' "$_crit_pair" | awk -F'\t' '{print $2}')
  _high_c=$(printf '%s' "$_high_pair" | awk -F'\t' '{print $1}')
  _high_s=$(printf '%s' "$_high_pair" | awk -F'\t' '{print $2}')
  _med_c=$(printf '%s' "$_med_pair" | awk -F'\t' '{print $1}')
  _med_s=$(printf '%s' "$_med_pair" | awk -F'\t' '{print $2}')
  _low_c=$(printf '%s' "$_low_pair" | awk -F'\t' '{print $1}')
  _low_s=$(printf '%s' "$_low_pair" | awk -F'\t' '{print $2}')
  # sed 安全化 (区切り文字 # 使用、& と \ と # をエスケープ)
  esc() { printf '%s' "$1" | sed -e 's/[\\&#]/\\&/g'; }
  _crit_se=$(esc "$_crit_s")
  _high_se=$(esc "$_high_s")
  _med_se=$(esc "$_med_s")
  _low_se=$(esc "$_low_s")
  _tmp_out="${OUTPUT_FILE}.summary.tmp"
  # sed CRITICAL/HIGH/MEDIUM/LOW severity table replacement (§3 集計表 wiring)
  sed -e "s#^| CRITICAL | 0 | (none) |\$#| CRITICAL | ${_crit_c} | ${_crit_se} |#" \
      -e "s#^| HIGH | 0 | (none) |\$#| HIGH | ${_high_c} | ${_high_se} |#" \
      -e "s#^| MEDIUM | 0 | (none) |\$#| MEDIUM | ${_med_c} | ${_med_se} |#" \
      -e "s#^| LOW | 0 | (none) |\$#| LOW | ${_low_c} | ${_low_se} |#" \
      "$OUTPUT_FILE" >"$_tmp_out" && mv "$_tmp_out" "$OUTPUT_FILE"
  TOTAL_CRITICAL="$_crit_c"
  TOTAL_HIGH="$_high_c"
  TOTAL_MEDIUM="$_med_c"
  TOTAL_LOW="$_low_c"
fi

log_progress "wiring_done OK=${TOTAL_OK} MOCK=${TOTAL_MOCK} ERROR=${TOTAL_ERROR} sev=C${TOTAL_CRITICAL}H${TOTAL_HIGH}M${TOTAL_MEDIUM}L${TOTAL_LOW}"

echo "[nightly_spec_review] OK date=${TARGET_DATE} rotation_id=${ROTATION_ID} personas=${PERSONAS_CSV} target=${TARGET_COUNT} guardrail=${GUARDRAIL_RESULT} mock=${MOCK} OK=${TOTAL_OK} ERROR=${TOTAL_ERROR} sev=C${TOTAL_CRITICAL}H${TOTAL_HIGH}M${TOTAL_MEDIUM}L${TOTAL_LOW} output=${OUTPUT_FILE}"
exit 0
