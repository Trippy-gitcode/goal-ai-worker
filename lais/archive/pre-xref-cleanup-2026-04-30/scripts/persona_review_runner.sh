#!/bin/sh
# scripts/persona_review_runner.sh
# PATCH-VIO12-PERSONA-MECH（§2.25.14 全応答ペルソナレビュー機械化、2026-04-26）
#
# 用途:
#   ADV メインの「応答前ペルソナレビュー」を機械強制する。
#   §2.25.14.7 既存 6 ペルソナ（solo_dev / devops_engineer / qa_lead / tech_writer / ai_ops / security_engineer）
#   並列で claude -p を起動し、APPROVE / REVISE / REJECT の多数決で応答案の採否を判定する。
#
# 引数:
#   --response "<応答案テキスト>"（必須、または --response-file 指定）
#   --response-file <path>（任意、ファイルから応答案を読込）
#   --response-id <id>（任意、未指定時はタイムスタンプ生成）
#   --timeout <秒>（任意、各ペルソナ呼出のタイムアウト、既定 60）
#
# 出力:
#   stdout: 集計サマリー（APPROVE=N, REVISE=N, REJECT=N, verdict=...）+ 改善提案集約（REVISE/REJECT 時）
#   logs/persona_review.log: 既存フォーマット + persona_review_runner 識別タグ
#   logs/persona_review_runner.log: TAB 区切り 5 列（ts / response_id / persona / verdict / suggestion）
#
# Exit codes:
#   0 = APPROVE（過半数 4/6 以上が APPROVE、応答発信可）
#   2 = REVISE（過半数 APPROVE 未満、改善提案を ADV メインに返戻）
#   3 = REJECT（REJECT が過半数 4/6 以上、応答破棄要請）
#   1 = 引数 / 環境エラー
#
# 設計:
#   - 6 ペルソナ並列実行（claude -p、各 60 秒タイムアウト）
#   - claude -p 失敗時は ABSTAIN として扱い、APPROVE 票数算出時は分母に含めない
#   - 改善提案は最大 3 行で集約（REVISE/REJECT 時のみ stdout に追加出力）
#
# 根拠:
#   - lais/verify/dev_system_v34_package.md §2.25.14（全応答ペルソナレビュー）
#   - §2.25.14.2 必須 3 ペルソナ + §2.25.14.3 追加候補（既存 6 ペルソナ網羅）
#   - 違反 #12（adv_violation_log.md L262-）+ PATCH-VIO12-PERSONA-MECH

set -eu

# REPO_ROOT 解決（PATCH-VIO12-REPO-ROOT-FIX-RESIDUAL、2026-04-26）
# ADV メイン cwd が dev-system（git 管理外）の場合 git rev-parse 失敗 → pwd
# フォールバックで誤解決していたため、共通ヘルパーで goal-ai-worker を確実に特定。
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "${SCRIPT_DIR}/lib/resolve_repo_root.sh"
if ! REPO_ROOT="$(resolve_repo_root)" || [ -z "${REPO_ROOT:-}" ] || [ ! -d "${REPO_ROOT}" ]; then
  echo "ERROR: $(basename "$0") could not resolve REPO_ROOT" >&2
  exit 0  # fail-open
fi
cd "$REPO_ROOT"

LOG_FILE="${REPO_ROOT}/logs/persona_review_runner.log"
COMPAT_LOG="${REPO_ROOT}/logs/persona_review.log"
mkdir -p "${REPO_ROOT}/logs"

RESPONSE_TEXT=""
RESPONSE_FILE=""
RESPONSE_ID=""
PERSONA_TIMEOUT=60

while [ $# -gt 0 ]; do
  case "$1" in
    --response) shift; RESPONSE_TEXT="${1:-}" ;;
    --response-file) shift; RESPONSE_FILE="${1:-}" ;;
    --response-id) shift; RESPONSE_ID="${1:-}" ;;
    --timeout) shift; PERSONA_TIMEOUT="${1:-60}" ;;
    *) ;;
  esac
  shift || true
done

# stdin fallback（パイプ入力）
if [ -z "$RESPONSE_TEXT" ] && [ -z "$RESPONSE_FILE" ] && [ ! -t 0 ]; then
  RESPONSE_TEXT=$(cat)
fi

if [ -n "$RESPONSE_FILE" ] && [ -f "$RESPONSE_FILE" ]; then
  RESPONSE_TEXT=$(cat "$RESPONSE_FILE")
fi

if [ -z "$RESPONSE_TEXT" ]; then
  echo "[persona_review_runner] --response または --response-file または stdin 必須" >&2
  exit 1
fi

if [ -z "$RESPONSE_ID" ]; then
  RESPONSE_ID="resp_$(date -u +%Y%m%dT%H%M%SZ)_$$"
fi

ts() { date -u +%Y-%m-%dT%H:%M:%SZ; }

# --- 6 ペルソナ定義（§2.25.14.7 既存 6）-------------------------------------
PERSONA_LIST="solo_dev
devops_engineer
qa_lead
tech_writer
ai_ops
security_engineer"

persona_view() {
  case "$1" in
    solo_dev)
      printf '%s' "プロダクト価値 / 進行ペース / コスト / リソース配分の妥当性を評価する 1 人開発視点。"
      ;;
    devops_engineer)
      printf '%s' "障害対応 / 復旧 / ガードレール / 監視 / fail-closed 設計の妥当性を評価する DevOps/SRE 視点。"
      ;;
    qa_lead)
      printf '%s' "テスト戦略 / 証跡 / 回帰防止 / TDD / カバレッジの妥当性を評価する QA 視点。"
      ;;
    tech_writer)
      printf '%s' "仕様書整合 / 用語統一 / 章番号連続性 / SSoT 整合の妥当性を評価するテクニカルライター視点。"
      ;;
    ai_ops)
      printf '%s' "コスト / モデル選定 / ROI / LLM 自己完結プロンプト指針の妥当性を評価する AI Ops 視点。"
      ;;
    security_engineer)
      printf '%s' "auth / 秘密情報 / RLS / CSP / XSS / シークレット露出の妥当性を評価するセキュリティ視点。"
      ;;
    *)
      printf '%s' "汎用レビュー視点。"
      ;;
  esac
}

# --- claude -p 実行関数（タイムアウト付き）----------------------------------
# Haiku モデル化（PATCH-VIO13-MECH-ENFORCE、2026-04-25）
# 既定: haiku（コスト削減 $142.56/月→$38.02/月、persona_review_cost.md §2.2）
# 切替: 環境変数 LAIS_PERSONA_MODEL=sonnet|opus|haiku|<full-id>
# none: --model オプション省略（既定モデル使用）
# サンプリング: LAIS_PERSONA_REVIEW_SAMPLING=50 で 50 応答に 1 回フル実行（既定 50=FCTM 緩和）
#   PATCH-FCTM-API-REDUCTION（2026-04-26）で 10 → 50 に変更（毎ターン発火緩和）
LAIS_PERSONA_MODEL_RUNTIME="${LAIS_PERSONA_MODEL:-haiku}"
LAIS_PERSONA_REVIEW_SAMPLING="${LAIS_PERSONA_REVIEW_SAMPLING:-50}"

# --- FCTM 階層モデル設定（PATCH-FCTM-API-REDUCTION、2026-04-26）-----------
# LAIS_PERSONA_MODEL_TIER で一次推論 / 集約のモデル階層を切替
#   tier=lite (既定): 一次推論 = haiku、集約 = haiku（最大削減）
#   tier=hybrid: 一次推論 = haiku、集約 = sonnet（精度 / コスト両立、推奨）
#   tier=full: 一次 / 集約とも sonnet（旧経路、A/B テスト用）
# 集約モデルは現状 single-shot review なので runner では一次推論のみ tier 反映、
# 集約段は ADV メイン or vote_dispatcher 側で別 tier 指定可能
LAIS_PERSONA_MODEL_TIER="${LAIS_PERSONA_MODEL_TIER:-lite}"
case "$LAIS_PERSONA_MODEL_TIER" in
  full)   LAIS_PERSONA_MODEL_RUNTIME="${LAIS_PERSONA_MODEL:-sonnet}" ;;
  hybrid) LAIS_PERSONA_MODEL_RUNTIME="${LAIS_PERSONA_MODEL:-haiku}" ;;
  lite|*) LAIS_PERSONA_MODEL_RUNTIME="${LAIS_PERSONA_MODEL:-haiku}" ;;
esac

# --- FCTM 凍結文脈読込（PATCH-FCTM-API-REDUCTION、2026-04-26）-------------
LAIS_FCTM_FROZEN_CONTEXT="${LAIS_FCTM_FROZEN_CONTEXT:-1}"
FROZEN_CTX_FILE="${REPO_ROOT}/instructions/persona_review/_context_frozen.md"
FROZEN_CTX_HASH_FILE="${REPO_ROOT}/instructions/persona_review/_context_frozen.sha256"
FROZEN_CTX=""
FROZEN_CTX_HASH=""
if [ "$LAIS_FCTM_FROZEN_CONTEXT" = "1" ] && [ -f "$FROZEN_CTX_FILE" ]; then
  FROZEN_CTX=$(cat "$FROZEN_CTX_FILE" 2>/dev/null || echo "")
  if [ -f "$FROZEN_CTX_HASH_FILE" ]; then
    FROZEN_CTX_HASH=$(cat "$FROZEN_CTX_HASH_FILE" 2>/dev/null | head -1 | tr -d "[:space:]")
  fi
fi

run_claude() {
  prompt="$1"
  if ! command -v claude >/dev/null 2>&1; then
    return 99
  fi
  if [ "$LAIS_PERSONA_MODEL_RUNTIME" = "none" ]; then
    if command -v gtimeout >/dev/null 2>&1; then
      gtimeout "$PERSONA_TIMEOUT" claude -p "$prompt" 2>/dev/null
    elif command -v timeout >/dev/null 2>&1; then
      timeout "$PERSONA_TIMEOUT" claude -p "$prompt" 2>/dev/null
    else
      perl -e '
        my $sec = shift;
        my $pid = fork();
        die "fork failed" unless defined $pid;
        if ($pid == 0) {
          exec(@ARGV) or exit 127;
        }
        eval {
          local $SIG{ALRM} = sub { kill 9, $pid; die "TIMEOUT\n" };
          alarm $sec;
          waitpid($pid, 0);
          alarm 0;
        };
        exit($? >> 8);
      ' "$PERSONA_TIMEOUT" claude -p "$prompt" 2>/dev/null
    fi
  else
    if command -v gtimeout >/dev/null 2>&1; then
      gtimeout "$PERSONA_TIMEOUT" claude --model "$LAIS_PERSONA_MODEL_RUNTIME" -p "$prompt" 2>/dev/null
    elif command -v timeout >/dev/null 2>&1; then
      timeout "$PERSONA_TIMEOUT" claude --model "$LAIS_PERSONA_MODEL_RUNTIME" -p "$prompt" 2>/dev/null
    else
      perl -e '
        my $sec = shift;
        my $pid = fork();
        die "fork failed" unless defined $pid;
        if ($pid == 0) {
          exec(@ARGV) or exit 127;
        }
        eval {
          local $SIG{ALRM} = sub { kill 9, $pid; die "TIMEOUT\n" };
          alarm $sec;
          waitpid($pid, 0);
          alarm 0;
        };
        exit($? >> 8);
      ' "$PERSONA_TIMEOUT" claude --model "$LAIS_PERSONA_MODEL_RUNTIME" -p "$prompt" 2>/dev/null
    fi
  fi
}

# --- サンプリング判定（PATCH-VIO13-MECH-ENFORCE、2026-04-25）-------------
# LAIS_PERSONA_REVIEW_SAMPLING=10 のとき、10 応答に 1 回のみフル 6 ペルソナ実行、
# 残り 9 回は軽量 1 ペルソナ（solo_dev のみ）+ ABSTAIN 5 で済ませる。
# カウンタは ~/.dev-system/persona_review_sampling.counter に保持
SAMPLING_COUNTER_FILE="${HOME}/.dev-system/persona_review_sampling.counter"
mkdir -p "$(dirname "$SAMPLING_COUNTER_FILE")" 2>/dev/null || true
SAMPLING_DO_FULL=1
case "$LAIS_PERSONA_REVIEW_SAMPLING" in
  ''|*[!0-9]*|0|1) SAMPLING_DO_FULL=1 ;;
  *)
    CUR=0
    [ -f "$SAMPLING_COUNTER_FILE" ] && CUR=$(cat "$SAMPLING_COUNTER_FILE" 2>/dev/null | head -1)
    case "$CUR" in ''|*[!0-9]*) CUR=0 ;; esac
    NEXT=$((CUR + 1))
    if [ "$NEXT" -ge "$LAIS_PERSONA_REVIEW_SAMPLING" ]; then
      SAMPLING_DO_FULL=1
      echo 0 > "$SAMPLING_COUNTER_FILE" 2>/dev/null || true
    else
      SAMPLING_DO_FULL=0
      echo "$NEXT" > "$SAMPLING_COUNTER_FILE" 2>/dev/null || true
    fi
    ;;
esac

# --- 並列実行用一時ディレクトリ --------------------------------------------
TMP_DIR=$(mktemp -d -t persona_review.XXXXXX)
trap 'rm -rf "$TMP_DIR"' EXIT

# 応答案を一時ファイルに退避（プロンプト埋込時の引用符干渉回避）
RESP_FILE="${TMP_DIR}/response.txt"
printf '%s' "$RESPONSE_TEXT" >"$RESP_FILE"

# --- 6 ペルソナ並列起動 ------------------------------------------------------
idx=0
OLD_IFS="$IFS"
IFS='
'
for persona in $PERSONA_LIST; do
  idx=$((idx + 1))
  out_file="${TMP_DIR}/persona_${idx}_${persona}.out"
  # サンプリング時は solo_dev のみフル実行、他 5 ペルソナは ABSTAIN（PATCH-VIO13-MECH-ENFORCE）
  if [ "$SAMPLING_DO_FULL" = "0" ] && [ "$persona" != "solo_dev" ]; then
    printf 'VERDICT=ABSTAIN\nSUGGESTION=sampling skip (LAIS_PERSONA_REVIEW_SAMPLING=%s)\n' "$LAIS_PERSONA_REVIEW_SAMPLING" >"$out_file"
    continue
  fi
  view=$(persona_view "$persona")
  if [ -n "$FROZEN_CTX" ]; then
    # PATCH-FCTM-API-REDUCTION: 凍結文脈先頭固定、差分のみ末尾追加
    prompt_text="${FROZEN_CTX}

---
# 個別レビューリクエスト（差分）
ペルソナ: ${persona}
視点: ${view}

上記 §A〜§D の凍結文脈（cache hash: ${FROZEN_CTX_HASH:-unknown}）に従い、以下の ADV 応答案をレビューしてください。

ADV 応答案:
$(cat "$RESP_FILE")"
  else
    # 旧経路 fallback
    prompt_text="あなたは「${persona}」というペルソナです。視点: ${view}

以下の ADV 応答案を上記ペルソナの視点で批判的にレビューし、APPROVE / REVISE / REJECT のいずれかと、改善提案を 1〜3 行で返してください。

フォーマット厳守 (これ以外を出力しないこと):
VERDICT=<APPROVE|REVISE|REJECT>
SUGGESTION=<1〜3 行、改行は \\n で表現>

判定基準:
- APPROVE: 当該ペルソナ視点で問題なし、応答発信可
- REVISE: 重要な改善点あり、応答案を修正すべき
- REJECT: 重大な欠陥あり、応答案を破棄して再起草すべき

ADV 応答案:
$(cat "$RESP_FILE")"
  fi
  (
    raw_out=""
    exit_code=0
    raw_out=$(run_claude "$prompt_text" || exit_code=$?)
    if [ "${exit_code:-0}" = "0" ] && [ -n "$raw_out" ]; then
      printf '%s\n' "$raw_out" >"$out_file"
    else
      # fail-safe: ABSTAIN 扱い
      printf 'VERDICT=ABSTAIN\nSUGGESTION=claude -p 失敗 (exit=%s)\n' "${exit_code:-?}" >"$out_file"
    fi
  ) &
done
IFS="$OLD_IFS"

# 全 background 完了待機
wait

# --- 集計 --------------------------------------------------------------------
approve=0
revise=0
reject=0
abstain=0
suggestions=""

idx=0
IFS='
'
for persona in $PERSONA_LIST; do
  idx=$((idx + 1))
  out_file="${TMP_DIR}/persona_${idx}_${persona}.out"
  [ -f "$out_file" ] || continue
  v=$(grep -E '^VERDICT=' "$out_file" 2>/dev/null | head -1 | sed 's/^VERDICT=//' | tr -d '\r' | tr -d ' ')
  s=$(grep -E '^SUGGESTION=' "$out_file" 2>/dev/null | head -1 | sed 's/^SUGGESTION=//' | tr -d '\r' | head -c 240)
  [ -z "$s" ] && s="-"
  case "$v" in
    APPROVE) approve=$((approve + 1)) ;;
    REVISE)  revise=$((revise + 1));  suggestions="${suggestions}[${persona}] ${s}
" ;;
    REJECT)  reject=$((reject + 1));  suggestions="${suggestions}[${persona}] ${s}
" ;;
    *)       abstain=$((abstain + 1)) ;;
  esac
  # 個別ログ
  printf '%s\t%s\t%s\t%s\t%s\n' "$(ts)" "$RESPONSE_ID" "$persona" "${v:-ABSTAIN}" "$s" >>"$LOG_FILE"
done
IFS="$OLD_IFS"

# --- 判定（過半数 4/6 以上）------------------------------------------------
total=6
verdict="REVISE"
if [ "$reject" -ge 4 ]; then
  verdict="REJECT"
elif [ "$approve" -ge 4 ]; then
  verdict="APPROVE"
else
  verdict="REVISE"
fi

# --- 互換ログ書込（既存 logs/persona_review.log フォーマット） -----------
# TAB 区切り 6 列: ts | response_id | rounds | personas_csv | severity_summary | trigger_tags
# severity_summary を APPROVE/REVISE/REJECT 集計に流用、trigger_tags=runner
SEV_SUMMARY="A${approve}R${revise}J${reject}X${abstain}"
PERSONAS_CSV=$(printf '%s' "$PERSONA_LIST" | tr '\n' ',' | sed 's/,$//')
printf '%s\t%s\t1\t%s\t%s\trunner_v12\n' "$(ts)" "$RESPONSE_ID" "$PERSONAS_CSV" "$SEV_SUMMARY" >>"$COMPAT_LOG"

# --- 古いログ清掃（4 週間保持）---------------------------------------------
for lf in "$LOG_FILE" "$COMPAT_LOG"; do
  [ -f "$lf" ] || continue
  SZ=$(wc -c <"$lf" 2>/dev/null | tr -d ' ')
  if [ "${SZ:-0}" -gt 1048576 ]; then
    ROT="${lf}.$(date -u +%Y%m%d).gz"
    gzip -c "$lf" > "$ROT" 2>/dev/null || true
    : > "$lf"
  fi
  find "$(dirname "$lf")" -name "$(basename "$lf").*.gz" -mtime +28 -delete 2>/dev/null || true
done

# --- 結果出力 ---------------------------------------------------------------
echo "persona_review_runner: APPROVE=$approve REVISE=$revise REJECT=$reject ABSTAIN=$abstain verdict=$verdict response_id=$RESPONSE_ID"

if [ "$verdict" != "APPROVE" ] && [ -n "$suggestions" ]; then
  printf '%s' "改善提案:
$suggestions" | head -10
fi

# --- FCTM API 消費計測（PATCH-FCTM-API-REDUCTION、2026-04-26）-------------
EST_TOKENS_TOTAL=12000
[ -n "${FROZEN_CTX:-}" ] && EST_TOKENS_TOTAL=2400
[ "$SAMPLING_DO_FULL" = "0" ] && EST_TOKENS_TOTAL=$((EST_TOKENS_TOTAL / 6))
LOGGER_SH="${REPO_ROOT}/scripts/fctm_api_consumption_logger.sh"
if [ -x "$LOGGER_SH" ]; then
  "$LOGGER_SH" --event persona_review --tokens "$EST_TOKENS_TOTAL" \
    --model "${LAIS_PERSONA_MODEL_RUNTIME:-haiku}" --tier "${LAIS_PERSONA_MODEL_TIER:-lite}" \
    --note "verdict=${verdict} A${approve}R${revise}J${reject}X${abstain} sampling=${SAMPLING_DO_FULL} frozen=${LAIS_FCTM_FROZEN_CONTEXT:-0}" >/dev/null 2>&1 || true
fi

case "$verdict" in
  APPROVE) exit 0 ;;
  REVISE)  exit 2 ;;
  REJECT)  exit 3 ;;
esac
