#!/bin/sh
# scripts/external_review_postcommit.sh
# dev-system v3.5 Phase 2（案 D'、sub_external_review_protocol §5.1 + §10 Phase 2）
# post-commit hook から発火、lais/review_feed/YYYY-MM-DD.md に §5.1 フォーマットで追記。
#
# 処理:
#   1. 直前 commit のメタ情報取得（sha / MISSION_ID / diff サイズ / RISK_PATHS 該当判定）
#   2. lais/verify/external_review/ 配下の Phase 1 非同期結果 JSON を集約
#   3. lais/review_feed/YYYY-MM-DD.md に §5.1 フォーマットで追記
#   4. CRITICAL 検出時は lais/review_feed/_critical.md にサマリ追記（§5.2）
#   5. record_api_cost / record_api_failure を ai_review.js 実行結果から適切に呼出し
#      （Bug V35-P1-S2-02 解消: Phase 1 では未結線だったガードレール状態更新を結線）
#
# 根拠:
#   - docs/plans/sub_external_review_protocol.md §5.1 ログフォーマット + §5.2 CRITICAL 集約
#   - docs/plans/sub_external_review_protocol.md §3.3 record_api_* 結線（Bug V35-P1-S2-02）
#   - docs/plans/dev_system_v35_roadmap.md §3.1 Phase 2
#   - RISK_PATHS SSOT: sub_hflow_protocol.md §1（10 項目、PATCH-23 で app_config.yaml 追加）
#
# 実装方針:
#   - POSIX sh 互換（bash 拡張禁止）、python3 を JSON 読解・数値計算に使用（§C6.3 runtime_preflight 依存）
#   - guardrail lib を source し record_api_cost / record_api_failure を呼出し（Phase 1 凍結スクリプトを改変せず、本スクリプトから結線）

set -eu

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$REPO_ROOT"

SCRIPT_DIR="${REPO_ROOT}/scripts"

# --- Phase 1 ガードレール関数を source ---------------------------------------
GUARDRAIL_LIB="${SCRIPT_DIR}/external_review_guardrail.sh"
if [ -f "$GUARDRAIL_LIB" ]; then
  # shellcheck disable=SC1090
  . "$GUARDRAIL_LIB"
fi

# --- commit メタ情報取得 -----------------------------------------------------
COMMIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
COMMIT_ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ)
TODAY=$(date -u +%Y-%m-%d)

# 環境変数による上書きを許容（PATCH-25 検証用、既定値は従来通り）
FEED_DIR="${FEED_DIR:-lais/review_feed}"
FEED_FILE="${FEED_FILE:-${FEED_DIR}/${TODAY}.md}"
CRITICAL_FILE="${CRITICAL_FILE:-${FEED_DIR}/_critical.md}"
EXTERNAL_REVIEW_DIR="${EXTERNAL_REVIEW_DIR:-lais/verify/external_review}"

mkdir -p "$FEED_DIR" "$EXTERNAL_REVIEW_DIR"

# --- MISSION_ID 解決（extract_mission_block 相当、失敗時は "unknown"） -------
MISSION_ID=$(sh "${SCRIPT_DIR}/resolve_target_mission.sh" canopy 2>/dev/null || echo "unknown")
[ -n "$MISSION_ID" ] || MISSION_ID="unknown"

# --- diff メタ（直前 commit の numstat 合計） --------------------------------
DIFF_LINES=$(git show --numstat HEAD 2>/dev/null \
  | awk 'NF==3 && $1 ~ /^[0-9]+$/ && $2 ~ /^[0-9]+$/ {added+=$1; removed+=$2} END {print added+removed+0}')
DIFF_LINES="${DIFF_LINES:-0}"

# --- RISK_PATHS 判定（sub_hflow_protocol §1 SSOT、PATCH-23 で 10 項目化） ----
RISK_PATTERN='^(src/auth/|src/payment/|src/services/supabase\.ts|src/services/external/|src/services/stripe/|supabase/migrations/|\.env|\.dev\.vars|wrangler\.toml|app_config\.yaml)'
RISK_HIT=$(git show --name-only HEAD 2>/dev/null | grep -cE "$RISK_PATTERN" || true)
RISK_HIT="${RISK_HIT:-0}"

# --- 分類判定（Phase 1 precommit.sh と同一ロジック） ------------------------
if [ "$RISK_HIT" -gt 0 ] || [ "$DIFF_LINES" -ge 300 ]; then
  MODE="sync"
elif [ "$DIFF_LINES" -ge 30 ]; then
  MODE="async"
else
  MODE="skip"
fi

# --- Phase 1 が生成した外部レビュー結果 JSON を集約 --------------------------
# ai_review.js runPrecommitMode が lais/verify/external_review/{TS}_{provider}.json に書出す想定
LATEST_GPT=$(ls -t "${EXTERNAL_REVIEW_DIR}"/*_gpt5.json 2>/dev/null | head -1 || true)
LATEST_GEMINI=$(ls -t "${EXTERNAL_REVIEW_DIR}"/*_gemini.json 2>/dev/null | head -1 || true)

# --- severity 件数集計（python3、jq 非依存） --------------------------------
# Bug V35-P2-S2-01 解消（PATCH-25）:
#   ai_review.js runPrecommitMode は JSON 配列（[{...}] または [{id:'ERROR',...}]）を出力（L427/L433）。
#   従来の d.get('findings') / d.get('error') は dict 想定で AttributeError（'list' object has no attribute 'get'）落ち。
#   修正: isinstance(d, list) 分岐で配列を直接 items として扱い、dict 時は後方互換で d.get('findings', []) を維持。
summarize_json() {
  _sj_file="$1"
  if [ -z "$_sj_file" ] || [ ! -f "$_sj_file" ]; then
    echo "— (no result)"
    return 0
  fi
  FILE="$_sj_file" python3 -c "
import json, os
p = os.environ['FILE']
try:
    with open(p, 'r') as f:
        d = json.load(f)
    items = d if isinstance(d, list) else (d.get('findings', []) or [])
    sev = {'CRITICAL': 0, 'HIGH': 0, 'MEDIUM': 0, 'LOW': 0}
    for fi in items:
        if not isinstance(fi, dict):
            continue
        s = (fi.get('severity') or 'LOW').upper()
        if s not in sev:
            sev[s] = 0
        sev[s] += 1
    print('CRITICAL {} / HIGH {} / MEDIUM {} / LOW {}'.format(sev['CRITICAL'], sev['HIGH'], sev['MEDIUM'], sev['LOW']))
except Exception as e:
    print('\u2014 (parse error: {})'.format(e.__class__.__name__))
" 2>/dev/null || echo "— (parse error)"
}

count_severity() {
  _cs_file="$1"
  _cs_level="$2"
  if [ -z "$_cs_file" ] || [ ! -f "$_cs_file" ]; then
    echo 0
    return 0
  fi
  FILE="$_cs_file" LEVEL="$_cs_level" python3 -c '
import json, os
p = os.environ["FILE"]
lv = os.environ["LEVEL"].upper()
try:
    with open(p, "r") as f:
        d = json.load(f)
    items = d if isinstance(d, list) else (d.get("findings", []) or [])
    print(sum(1 for fi in items if isinstance(fi, dict) and (fi.get("severity") or "").upper() == lv))
except Exception:
    print(0)
' 2>/dev/null || echo 0
}

GPT_SUMMARY=$(summarize_json "$LATEST_GPT")
GEMINI_SUMMARY=$(summarize_json "$LATEST_GEMINI")

GPT_CRIT=$(count_severity "$LATEST_GPT" "CRITICAL")
GEMINI_CRIT=$(count_severity "$LATEST_GEMINI" "CRITICAL")

# --- 合意度算出（§1.6 準拠: 両モデル一致件数 = min） -----------------------
CRIT_AGREE=$(GPT="$GPT_CRIT" GEM="$GEMINI_CRIT" python3 -c '
import os
try:
    g = int(os.environ.get("GPT") or 0)
    m = int(os.environ.get("GEM") or 0)
    print(min(g, m))
except Exception:
    print(0)
' 2>/dev/null || echo 0)

# 最大検出件数（分母）
CRIT_MAX=$(GPT="$GPT_CRIT" GEM="$GEMINI_CRIT" python3 -c '
import os
try:
    g = int(os.environ.get("GPT") or 0)
    m = int(os.environ.get("GEM") or 0)
    print(max(g, m))
except Exception:
    print(0)
' 2>/dev/null || echo 0)

# --- review_feed/YYYY-MM-DD.md に §5.1 フォーマットで追記 -------------------
GPT_DISPLAY="${LATEST_GPT:-—}"
GEMINI_DISPLAY="${LATEST_GEMINI:-—}"

cat >> "$FEED_FILE" <<EOF

## ${COMMIT_ISO} | commit ${COMMIT_SHA}

**ミッション**: ${MISSION_ID}（session_progress.md 参照）
**diff サイズ**: ${DIFF_LINES} 行（${MODE} 分類）
**RISK_PATHS 該当**: ${RISK_HIT} 件
**外部 API 判定**: ${MODE} 実行

### GPT-5.4 結果
- severity: ${GPT_SUMMARY}
- 詳細 JSON: \`${GPT_DISPLAY}\`

### Gemini 3.1 Pro 結果
- severity: ${GEMINI_SUMMARY}
- 詳細 JSON: \`${GEMINI_DISPLAY}\`

### 合意度（§1.6 準拠）
- CRITICAL 合意: ${CRIT_AGREE}/${CRIT_MAX}（両モデル一致件数 / 最大検出件数）
EOF

# --- CRITICAL 合意 1 以上なら _critical.md にサマリ追記（§5.2） -------------
if [ "$CRIT_AGREE" -gt 0 ]; then
  cat >> "$CRITICAL_FILE" <<EOF

## ${TODAY} 未解消 CRITICAL

### [commit ${COMMIT_SHA}] ${MISSION_ID}
- GPT-5.4: CRITICAL ${GPT_CRIT} 件
- Gemini: CRITICAL ${GEMINI_CRIT} 件（合意度 ${CRIT_AGREE}/2）
- 対応: （未対応）
EOF
fi

# --- ガードレール結線（Bug V35-P1-S2-02 解消） ------------------------------
# Phase 1 で定義されたが未結線だった record_api_cost / record_api_failure を、
# ai_review.js が残した JSON の存在・error フィールドを参照して呼出す。
# Phase 1 同期 1 回想定コスト（§5.1 推定）: GPT-5.4 $0.10 + Gemini $0.05 = $0.15

# error フィールドを持つ JSON を検出する関数（1=error 有 / 0=error 無 / 2=file なし or パース不能）
# Bug V35-P2-S2-01 解消（PATCH-25）:
#   ai_review.js は失敗時 [{id:'ERROR', severity:'HIGH', issue:...}] 形式の配列を出力（L433）。
#   修正: isinstance(d, list) で配列を items として扱い、id=='ERROR' の存在で error 判定。
#   dict 時は後方互換で d.get('error') を維持。
has_error_field() {
  _hef_file="$1"
  if [ -z "$_hef_file" ] || [ ! -f "$_hef_file" ]; then
    echo "2"
    return 0
  fi
  FILE="$_hef_file" python3 -c '
import json, os
p = os.environ["FILE"]
try:
    with open(p, "r") as f:
        d = json.load(f)
    if isinstance(d, list):
        items = d
        has_err = any(isinstance(it, dict) and it.get("id") == "ERROR" for it in items)
        print("1" if has_err else "0")
    else:
        print("1" if d.get("error") else "0")
except Exception:
    print("2")
' 2>/dev/null || echo "2"
}

GPT_ERR=$(has_error_field "$LATEST_GPT")
GEMINI_ERR=$(has_error_field "$LATEST_GEMINI")

# 成功判定: 両モデルの結果 JSON が存在かつ error フィールドなし → record_api_cost
if command -v record_api_cost >/dev/null 2>&1 \
   && [ "$GPT_ERR" = "0" ] && [ "$GEMINI_ERR" = "0" ]; then
  record_api_cost 0.15 || true
fi

# 失敗判定: JSON が error フィールドを持つ場合のみ record_api_failure
# （file なし = 非同期で未到着 or precommit skip、失敗としてカウントしない）
if command -v record_api_failure >/dev/null 2>&1; then
  [ "$GPT_ERR" = "1" ] && record_api_failure || true
  [ "$GEMINI_ERR" = "1" ] && record_api_failure || true
fi

echo "post-commit: external_review logged to $FEED_FILE (MODE=$MODE, CRITICAL agree=$CRIT_AGREE)"
