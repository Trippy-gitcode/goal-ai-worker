#!/bin/sh
# scripts/subagent_mission_validator.sh
# §2.25.16.10 subagent ミッション目的整合性チェック必須化（PATCH-SUBAGENT-MISSION-PURPOSE-ALIGNMENT、2026-04-26）
# §2.25.16.10 ミッションタイプ判定追加（PATCH-VALIDATOR-OVERFIRE-REDUCTION-V1、2026-04-27）
# §2.25.16.10 spec/analysis 絶対優先化（PATCH-VALIDATOR-OVERFIRE-REDUCTION-V2、2026-04-27）
#
# 用途:
#   ADV メインが Agent / Task ツールで subagent を起動する直前 (PreToolUse hook) に、
#   ミッションプロンプトに「目的（成功定義）」と「完了条件（測定可能な検証項目）」が
#   両方含まれているか機械検証し、両者の整合性を grep ベースで判定する。
#   違反 #14 / #15 の根本原因「subagent ミッション設計手抜き構造」の構造解消が一次目的。
#
# 入力モード:
#   モード A (file 渡し):  subagent_mission_validator.sh <mission_prompt_file>
#   モード B (stdin JSON): hook 入力 JSON を stdin で受け取り、tool_input.prompt を抽出
#
# 出力（TAB 区切り、stderr）:
#   detect_status\tcategory\treason
#
# 終了コード:
#   0 = PASS（目的 + 完了条件あり、整合性 OK）
#   2 = BLOCK（目的 / 完了条件不在、または目的キーワードに対応する完了条件欠落）
#
# Stop hook / PreToolUse hook 用 stdout 出力:
#   PASS: 何も出さない
#   BLOCK: {"decision":"block","reason":"§2.25.16.10 subagent ミッション目的整合性なし: <reason>"}
#
# skip 条件:
#   - subagent prompt が hook 入力に含まれない（tool_input.prompt 不在 or 空）
#   - prompt 200 文字未満（軽量 grep / read 系 task は対象外）
#   - SUBAGENT_MISSION_VALIDATOR_DISABLE=1 で完全無効化（緊急時 PO override 用）
#
# POSIX sh 互換（§3.7）。bash 拡張禁止。

set -eu

SELF_DIR="$(cd "$(dirname "$0")" && pwd)"
# 旧来 `. ... 2>/dev/null || true` だと set -eu 配下で `.` が unfound 失敗時に
# || を待たず exit 1 する POSIX sh 挙動があるため、`[ -f ]` で先にガード。
if [ -f "${SELF_DIR}/lib/resolve_repo_root.sh" ]; then
  # shellcheck disable=SC1091
  . "${SELF_DIR}/lib/resolve_repo_root.sh" 2>/dev/null || true
fi

REPO_ROOT="${LAIS_REPO_ROOT:-/Users/futoshi/Desktop/goal-ai-worker}"
if command -v resolve_repo_root >/dev/null 2>&1; then
  _r="$(resolve_repo_root 2>/dev/null || true)"
  [ -n "$_r" ] && [ -d "$_r" ] && REPO_ROOT="$_r"
fi

LOG_FILE="${REPO_ROOT}/logs/subagent_mission_validator.log"
mkdir -p "${REPO_ROOT}/logs" 2>/dev/null || true

ts() { date -u +%Y-%m-%dT%H:%M:%SZ; }
log() {
  printf '%s\t%s\n' "$(ts)" "$1" >>"$LOG_FILE" 2>/dev/null || true
}

# --- override / disable ----------------------------------------------------
if [ "${SUBAGENT_MISSION_VALIDATOR_DISABLE:-0}" = "1" ]; then
  log "[SKIP] disabled via SUBAGENT_MISSION_VALIDATOR_DISABLE"
  exit 0
fi

# --- 入力解決 -------------------------------------------------------------
PROMPT_FILE=""
PROMPT_TEXT=""
TMP_PROMPT=""
cleanup() { [ -n "$TMP_PROMPT" ] && rm -f "$TMP_PROMPT" 2>/dev/null || true; }
trap cleanup EXIT

if [ "$#" -ge 1 ] && [ -f "$1" ]; then
  PROMPT_FILE="$1"
  PROMPT_TEXT="$(cat "$PROMPT_FILE")"
else
  # stdin から JSON 受領 → tool_input.prompt 抽出
  STDIN_BUF="$(cat 2>/dev/null || true)"
  if [ -z "$STDIN_BUF" ]; then
    log "[SKIP] no input (no file arg, no stdin)"
    exit 0
  fi
  TMP_PROMPT="$(mktemp -t subagent_mission_validator.XXXXXX 2>/dev/null || mktemp 2>/dev/null || echo /tmp/_sv_$$)"
  printf '%s' "$STDIN_BUF" > "$TMP_PROMPT.json" 2>/dev/null || { log "[SKIP] cannot write tmp"; exit 0; }
  EXTRACT="$(python3 - "$TMP_PROMPT.json" <<'PYEXTRACT' 2>/dev/null || true
import json, sys
try:
    with open(sys.argv[1], "r", encoding="utf-8") as f:
        d = json.load(f)
except Exception:
    sys.exit(0)
ti = d.get("tool_input") or {}
# subagent_type / description / prompt のうち prompt を最優先、なければ description
prompt = ti.get("prompt") or ti.get("description") or ""
tn = (d.get("tool_name") or "").lower()
event = (d.get("hook_event_name") or "").lower()
# Task|Agent 系のみ対象、それ以外 skip
if tn and tn not in ("task", "agent"):
    sys.exit(0)
print(prompt)
PYEXTRACT
)"
  rm -f "$TMP_PROMPT.json" 2>/dev/null || true
  if [ -z "$EXTRACT" ]; then
    log "[SKIP] tool_input.prompt empty or non-Task/Agent event"
    exit 0
  fi
  printf '%s' "$EXTRACT" > "$TMP_PROMPT"
  PROMPT_FILE="$TMP_PROMPT"
  PROMPT_TEXT="$EXTRACT"
fi

# --- 軽量 task skip（200 文字未満） ----------------------------------------
PROMPT_LEN="$(printf '%s' "$PROMPT_TEXT" | wc -c | tr -d ' ')"
if [ "${PROMPT_LEN:-0}" -lt 200 ]; then
  log "[SKIP] prompt too short ($PROMPT_LEN < 200): lightweight task"
  exit 0
fi

# --- 目的見出し検出 -------------------------------------------------------
PURPOSE_HIT=0
if printf '%s' "$PROMPT_TEXT" \
   | grep -qE "(ミッション ?ID|目的|目標|成功定義|成功基準|完了定義|Mission|Purpose|Goal|Objective)" \
     ; then
  PURPOSE_HIT=1
fi

# --- 完了条件見出し検出 ---------------------------------------------------
COMPLETION_HIT=0
COMPLETION_HAS_COMMAND=0
if printf '%s' "$PROMPT_TEXT" \
   | grep -qE "(完了条件|完了報告|動作テスト|検証|検収|Acceptance|Acceptance Criteria|実機検証|verification|completion criteria)" \
     ; then
  COMPLETION_HIT=1
  # 測定可能なコマンド（grep / find / log / tail / sh -n / npx playwright / curl / psql / supabase / git status / wc 等）を含むか
  if printf '%s' "$PROMPT_TEXT" \
     | grep -qE "(grep|find|tail|head|cat|sh -n|npx playwright|curl|psql|supabase|git status|wc -l|awk|logs/[A-Za-z_]+\.log|\.spec\.ts|sh /[^ ]+\.sh|test_assertion_validator|realmachine_smoke|smoke_results)" \
       ; then
    COMPLETION_HAS_COMMAND=1
  fi
fi

# --- パターン 1: 目的のみで完了条件なし ----------------------------------
if [ "$PURPOSE_HIT" = "1" ] && [ "$COMPLETION_HIT" = "0" ]; then
  REASON="パターン 1（目的のみ、完了条件不在）: ミッションに目的見出しはあるが「完了条件 / 検証 / 検収 / 動作テスト」見出しが欠落。grep / find / log 確認等の測定可能なコマンドを含む完了条件節を追加してください"
  printf 'BLOCK\tcompletion_missing\t%s\n' "$REASON" 1>&2
  log "[BLOCK] pattern1 completion_missing"
  cat <<JSONOUT
{"decision":"block","reason":"§2.25.16.10 subagent ミッション目的整合性なし: ${REASON}"}
JSONOUT
  exit 2
fi

# --- パターン 2: 完了条件のみで目的なし ----------------------------------
if [ "$PURPOSE_HIT" = "0" ] && [ "$COMPLETION_HIT" = "1" ]; then
  REASON="パターン 2（完了条件のみ、目的不在）: 目的（成功定義）見出しが欠落。何を達成すれば成功かを「ミッション ID / 目的 / 成功定義」のいずれかの見出しブロックで明示してください"
  printf 'BLOCK\tpurpose_missing\t%s\n' "$REASON" 1>&2
  log "[BLOCK] pattern2 purpose_missing"
  cat <<JSONOUT
{"decision":"block","reason":"§2.25.16.10 subagent ミッション目的整合性なし: ${REASON}"}
JSONOUT
  exit 2
fi

# --- 両方欠落（軽微 task ではない長文 prompt なのに目的・完了条件両方なし） ---
if [ "$PURPOSE_HIT" = "0" ] && [ "$COMPLETION_HIT" = "0" ]; then
  # 200 文字以上あるが目的/完了条件キーワード両方ヒットしない = 構造化されていない自由文
  # この場合は WARN レベルとして記録のみ、PASS（汎用 task の可能性）
  log "[WARN] purpose & completion both missing but pass (>=200 chars, possibly free-form task)"
  exit 0
fi

# --- パターン 3: 目的 × 完了条件マトリクス整合性検証 ----------------------
# 目的キーワードに対応する完了条件期待マトリクス（§2.25.16.10 表）
# パターンマッチ: 目的キーワードが prompt 全体に存在 → 完了条件節（COMPLETION_HIT）に
# 対応する検証手段キーワードが存在しなければ BLOCK

mismatches=""
add_mismatch() {
  if [ -z "$mismatches" ]; then
    mismatches="$1"
  else
    mismatches="${mismatches}; $1"
  fi
}

# 完了条件ブロックを抽出（簡易: 「完了条件 / 完了報告 / 動作テスト / 検証 / 検収」見出し以降の本文 50 行を対象）
COMPLETION_BLOCK="$(printf '%s' "$PROMPT_TEXT" | awk '
  /^.*(完了条件|完了報告|動作テスト|検証|検収|Acceptance|実機検証|verification).*$/ {
    in_block = 1
    print
    capture = 50
    next
  }
  in_block && capture > 0 { print; capture-- }
  in_block && capture <= 0 { in_block = 0 }
')"

# fallback: COMPLETION_BLOCK が空なら prompt 全文を完了条件側として扱う（過剰検出を避ける）
[ -z "$COMPLETION_BLOCK" ] && COMPLETION_BLOCK="$PROMPT_TEXT"

# --- ミッションタイプ判定（PATCH-VALIDATOR-OVERFIRE-REDUCTION-V2、2026-04-27） ----
# v1 (PATCH-VALIDATOR-OVERFIRE-REDUCTION-V1) のバグ修正:
#   v1 では impl 優位キーワード（実装 / デプロイ / hook 改修 等）が spec / analysis より先に
#   判定されるため、長大プロンプト + 多 keyword 時に「SSoT 化ミッションだが impl 優位語彙が
#   多数含まれる」ケースで impl 判定 → MATRIX 検証発火 → 誤 BLOCK が発生していた。
#   2026-04-27 午後の ALPHA-PO-EXPECTATIONS-SSOT-V2-UPDATE（800 行超、SSoT 化明示）で再現。
#
# v2 修正方針:
#   1. 「目的」セクション内に spec 明示キーワードがあれば spec 確定（impl 優位を上書き）
#   2. 「目的」セクション内に analysis 明示キーワードがあれば analysis 確定
#   3. 上記いずれも該当しない場合のみ impl タイプ + MATRIX 検証
#   → spec / analysis の明示出現を「絶対優先」ルールとして実装
#
# タイプ:
#   impl     → 既存 MATRIX 検証実施（現状維持）
#   spec     → 仕様書化 / SSoT 化 / 雛形作成 / 文書化  → MATRIX skip + ファイル新設・行数検証要求
#   analysis → 分析 / レビュー / 計画作成 / 提案書 / 評価レポート → MATRIX skip + 分析レポート出力検証要求
#
# 判定優先度（v2、絶対優先ルール）: spec 明示 > analysis 明示 > 既定 impl
# 「目的」セクション抽出（先頭から「制約 / 入力データ / 完了条件」見出し直前まで、最大 50 行）
PURPOSE_BLOCK="$(printf '%s' "$PROMPT_TEXT" | awk '
  BEGIN { capture = 0; cnt = 0 }
  /^.*(目的|成功定義|成功基準|目標|Mission|Purpose|Goal|Objective).*$/ {
    capture = 1; print; next
  }
  capture && /^.*(制約|入力データ|完了条件|完了報告|背景).*$/ { capture = 0 }
  capture { print; cnt++; if (cnt > 50) capture = 0 }
')"
[ -z "$PURPOSE_BLOCK" ] && PURPOSE_BLOCK="$PROMPT_TEXT"

# v2: spec / analysis 明示キーワードを絶対優先で判定（impl 優位キーワード判定は撤廃）
MISSION_TYPE="impl"
if printf '%s' "$PURPOSE_BLOCK" \
   | grep -qE "(仕様書化|SSoT ?化|SSoT ?起票|雛形作成|テンプレ作成|テンプレ更新|文書化)"; then
  MISSION_TYPE="spec"
elif printf '%s' "$PURPOSE_BLOCK" \
   | grep -qE "(分析|レビュー|計画作成|提案書|評価レポート|アーカイブ計画|圧縮計画|診断|考察|批評)"; then
  MISSION_TYPE="analysis"
fi

log "[INFO] mission_type=${MISSION_TYPE} purpose_block_len=$(printf '%s' "$PURPOSE_BLOCK" | wc -c | tr -d ' ') v2"

# --- spec / analysis タイプの代替検証（MATRIX 完全 skip ではなく代替手段検証） ----
if [ "$MISSION_TYPE" = "spec" ]; then
  # spec タイプ: ファイル新設 / 行数 / セクション grep 等の機械検証が完了条件にあるか
  if ! printf '%s' "$COMPLETION_BLOCK" \
       | grep -qE "(新設|新規作成|ファイル.*作成|行数|wc -l|grep.*-n|セクション|見出し|test -f|ls .*-l|stat |cat.*\.md|\.md.*存在)"; then
    REASON="パターン 3-spec（仕様書化ミッション、代替検証欠落）: 仕様書化系ミッションでは「ファイル新設 / 行数 / セクション grep / test -f」等の機械検証が完了条件に必要。MATRIX 検証は skip しましたが代替検証が不在のため BLOCK"
    printf 'BLOCK\tspec_alt_verification_missing\t%s\n' "$REASON" 1>&2
    log "[BLOCK] pattern3-spec alt_verification_missing"
    cat <<JSONOUT
{"decision":"block","reason":"§2.25.16.10 subagent ミッション目的整合性なし: ${REASON}"}
JSONOUT
    exit 2
  fi
  log "[PASS] mission_type=spec MATRIX_skipped alt_verification_ok prompt_len=${PROMPT_LEN}"
  exit 0
fi

if [ "$MISSION_TYPE" = "analysis" ]; then
  # analysis タイプ: 分析レポート出力 / 主要発見記載 / 出力先パス指定 等の検証
  if ! printf '%s' "$COMPLETION_BLOCK" \
       | grep -qE "(分析レポート|主要発見|発見記載|出力先|レポート出力|完了報告|要約|サマリー|結論|所見|提言)"; then
    REASON="パターン 3-analysis（分析・レビュー・計画ミッション、代替検証欠落）: 分析系ミッションでは「分析レポート出力 / 主要発見記載 / 完了報告フォーマット」等が完了条件に必要。MATRIX 検証は skip しましたが代替検証が不在のため BLOCK"
    printf 'BLOCK\tanalysis_alt_verification_missing\t%s\n' "$REASON" 1>&2
    log "[BLOCK] pattern3-analysis alt_verification_missing"
    cat <<JSONOUT
{"decision":"block","reason":"§2.25.16.10 subagent ミッション目的整合性なし: ${REASON}"}
JSONOUT
    exit 2
  fi
  log "[PASS] mission_type=analysis MATRIX_skipped alt_verification_ok prompt_len=${PROMPT_LEN}"
  exit 0
fi

# 以下は MISSION_TYPE=impl の場合のみ実行（既存 MATRIX 検証）

# 目的キーワードカテゴリ × 完了条件期待手段（マトリクス）
# 形式: "<purpose_pattern>|<expected_pattern>|<category_label>"
MATRIX="$(cat <<'MATRIX_EOF'
実機|realmachine_smoke_results|category_realmachine
実機|signin_success=true|category_realmachine
真 ?E2E|realmachine_smoke_results|category_real_e2e
真 ?E2E|3 ?軸|category_real_e2e
動作確認|realmachine_smoke_results|category_realmachine_or_smoke
動作確認|smoke_results|category_realmachine_or_smoke
ログイン|realmachine_smoke_results|category_login
ログイン|URL.*assertion|category_login
ログイン|DOM.*assertion|category_login
signin|realmachine_smoke_results|category_signin
ダッシュボード|realmachine_smoke_results|category_dashboard
dashboard|realmachine_smoke_results|category_dashboard
DB|psql|category_db
データベース|psql|category_db
Supabase|supabase|category_db
schema|psql|category_db_schema
migration|psql|category_db_migration
E2E|spec\.ts|category_e2e
Playwright|spec\.ts|category_playwright
Playwright|npx playwright|category_playwright
Phase 完了|realmachine_smoke_results|category_phase_complete
Phase A 完走|realmachine_smoke_results|category_phase_complete
Phase 通過|realmachine_smoke_results|category_phase_complete
PreToolUse|settings\.json|category_hook
Stop hook|settings\.json|category_hook
hook|settings\.json|category_hook
機械強制|sh -n|category_machine_enforce
機械強制|動作テスト|category_machine_enforce
機械検証|動作テスト|category_machine_verify
機械ゲート|動作テスト|category_machine_gate
MATRIX_EOF
)"

# マトリクス検証
echo "$MATRIX" | while IFS='|' read -r purpose_kw expected_kw category; do
  [ -z "$purpose_kw" ] && continue
  # 目的キーワードが prompt 全体に存在
  if printf '%s' "$PROMPT_TEXT" | grep -qE "$purpose_kw"; then
    # 完了条件ブロックに対応する検証手段がない
    if ! printf '%s' "$COMPLETION_BLOCK" | grep -qE "$expected_kw"; then
      printf 'MISMATCH\t%s\t%s\t%s\n' "$category" "$purpose_kw" "$expected_kw"
    fi
  fi
done > /tmp/_sv_mismatch_$$ 2>/dev/null

MISMATCH_COUNT=0
if [ -f "/tmp/_sv_mismatch_$$" ]; then
  MISMATCH_COUNT="$(wc -l < /tmp/_sv_mismatch_$$ | tr -d ' ')"
fi

# パターン 3 判定: マトリクスで複数カテゴリ不整合 OR 完了条件にコマンド一切なし
if [ "${MISMATCH_COUNT:-0}" -gt 0 ]; then
  # 同一カテゴリの重複は集約（例: category_realmachine が 2 行 → 1 件カウント）
  UNIQUE_CATEGORIES="$(awk -F'\t' '{print $2}' /tmp/_sv_mismatch_$$ 2>/dev/null | sort -u | head -5)"
  CAT_COUNT="$(printf '%s\n' "$UNIQUE_CATEGORIES" | grep -c . 2>/dev/null || echo 0)"
  if [ "${CAT_COUNT:-0}" -ge 1 ]; then
    SAMPLE_LINES="$(head -3 /tmp/_sv_mismatch_$$ | tr '\t' ' ' | tr '\n' '|')"
    rm -f /tmp/_sv_mismatch_$$ 2>/dev/null
    REASON="パターン 3（目的と完了条件の乖離）: 目的キーワードに対応する検証手段が完了条件ブロックに不在。不整合カテゴリ ${CAT_COUNT} 件 [${SAMPLE_LINES}]。完了条件を §2.25.21.4 真 E2E 3 軸定義 / §2.25.16.10 マトリクスと整合させてください"
    printf 'BLOCK\tmatrix_mismatch\t%s\n' "$REASON" 1>&2
    log "[BLOCK] pattern3 matrix_mismatch categories=${CAT_COUNT}"
    cat <<JSONOUT
{"decision":"block","reason":"§2.25.16.10 subagent ミッション目的整合性なし: ${REASON}"}
JSONOUT
    exit 2
  fi
fi

rm -f /tmp/_sv_mismatch_$$ 2>/dev/null

# 完了条件にコマンド一切なし → WARN（PASS 維持、観測ログのみ）
if [ "$COMPLETION_HIT" = "1" ] && [ "$COMPLETION_HAS_COMMAND" = "0" ]; then
  log "[WARN] completion block has no measurable command (grep/find/tail/sh等不在) but pass"
fi

log "[PASS] purpose=${PURPOSE_HIT} completion=${COMPLETION_HIT} cmd=${COMPLETION_HAS_COMMAND} prompt_len=${PROMPT_LEN}"
exit 0
