#!/bin/sh
# scripts/persona_selector.sh
# MISSION-G49-PKG Phase 2.2（PD-111 §2.25.14 全応答ペルソナレビュー）
#
# 用途:
#   応答対象の質問内容を grep ベースでタグ付けし、§2.25.14.3 発火トリガ表に従って
#   必須 3 ペルソナ + 追加候補（最大 3、計 6）を自動選択。
#   選択結果を logs/persona_review.log に応答 ID / ペルソナ / ラウンド / severity 集計で記録。
#
# 引数:
#   --query "<質問テキスト>"（必須）
#   --response-id "<応答 ID>"（任意、未指定時はタイムスタンプ生成）
#   --rounds N（任意、ラウンド数記録、既定 1）
#   --severity-summary "C0H0M0L0"（任意、CRITICAL/HIGH/MED/LOW 集計）
#
# 出力:
#   stdout: 選択ペルソナ名（カンマ区切り）
#   logs/persona_review.log: TAB 区切り 6 列
#     ts | response_id | rounds | personas_csv | severity_summary | trigger_tags
#
# 根拠:
#   - core_spec.md §11.2 必須 3 / §11.3 追加候補 (legacy v34 spec §2.25.14.2 / §2.25.14.3, archived 2026-04-30)
#   - docs/po-decisions.md PD-111

set -eu

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

LOG_FILE="${REPO_ROOT}/logs/persona_review.log"
mkdir -p "${REPO_ROOT}/logs"

QUERY=""
RESPONSE_ID=""
ROUNDS=1
SEVERITY="C0H0M0L0"

while [ $# -gt 0 ]; do
  case "$1" in
    --query) shift; QUERY="${1:-}" ;;
    --response-id) shift; RESPONSE_ID="${1:-}" ;;
    --rounds) shift; ROUNDS="${1:-1}" ;;
    --severity-summary) shift; SEVERITY="${1:-C0H0M0L0}" ;;
    *) ;;
  esac
  shift || true
done

if [ -z "$QUERY" ]; then
  echo "[persona_selector] --query が必須" >&2
  exit 1
fi

if [ -z "$RESPONSE_ID" ]; then
  RESPONSE_ID="resp_$(date -u +%Y%m%dT%H%M%SZ)_$$"
fi

# --- 必須 3 ペルソナ（§2.25.14.2、全応答固定） ---------------------------
REQUIRED="LLM アプリケーション設計者,プロンプトエンジニア,SW PM"

# --- 追加候補（§2.25.14.3、grep ベース発火トリガ） -----------------------
ADDITIONAL=""
TAGS=""

# SW アーキテクト: 「実装」「アーキテクチャ」「責務」「依存」「SSoT」
if printf '%s' "$QUERY" | grep -qE "(実装|アーキテクチャ|責務|依存|SSoT)"; then
  ADDITIONAL="${ADDITIONAL},SW アーキテクト"
  TAGS="${TAGS}arch,"
fi

# SRE: 「障害」「復旧」「ガードレール」「監視」「リトライ」
if printf '%s' "$QUERY" | grep -qE "(障害|復旧|ガードレール|監視|リトライ)"; then
  ADDITIONAL="${ADDITIONAL},SRE"
  TAGS="${TAGS}sre,"
fi

# QA テストエンジニア: 「テスト」「検証」「カバレッジ」「証跡」「TDD」
if printf '%s' "$QUERY" | grep -qE "(テスト|検証|カバレッジ|証跡|TDD)"; then
  ADDITIONAL="${ADDITIONAL},QA テストエンジニア"
  TAGS="${TAGS}qa,"
fi

# テクニカルライター: 「仕様書」「§」「用語」「文書」「整合」
if printf '%s' "$QUERY" | grep -qE "(仕様書|§|用語|文書|整合)"; then
  ADDITIONAL="${ADDITIONAL},テクニカルライター"
  TAGS="${TAGS}tw,"
fi

# セキュリティエンジニア: 「auth」「秘密」「RLS」「CSP」「XSS」「シークレット」
if printf '%s' "$QUERY" | grep -qiE "(auth|秘密|rls|csp|xss|シークレット)"; then
  ADDITIONAL="${ADDITIONAL},セキュリティエンジニア"
  TAGS="${TAGS}sec,"
fi

# AI コンサルタント: 「コスト」「モデル」「Opus」「ROI」「効果」
if printf '%s' "$QUERY" | grep -qiE "(コスト|モデル|opus|roi|効果)"; then
  ADDITIONAL="${ADDITIONAL},AI コンサルタント"
  TAGS="${TAGS}ai,"
fi

# データガバナンス専門家: 「SSoT」「バックアップ」「git」「監査ログ」「データ整合」「バージョン管理」
if printf '%s' "$QUERY" | grep -qiE "(SSoT|バックアップ|git|監査ログ|データ整合|バージョン管理)"; then
  ADDITIONAL="${ADDITIONAL},データガバナンス専門家"
  TAGS="${TAGS}gov,"
fi

# 追加候補から最大 4 採用（出現順、§2.25.14.3 PD-112 拡張で 3→4）
# Gemini CRITICAL 対応（2026-04-25）: ADDITIONAL が空の場合 paste が "\n" のみ出力し、
# -n テストが真になって PERSONAS に改行混入 → TSV ログ破壊。空白 + 改行を完全 strip
if [ -z "${ADDITIONAL#,}" ]; then
  # 空（カンマだけ or 完全空）
  ADDITIONAL_TRIMMED=""
else
  ADDITIONAL_TRIMMED=$(printf '%s' "$ADDITIONAL" | sed 's/^,//' | tr ',' '\n' | head -4 | paste -sd ',' - | tr -d '\n\r')
fi

if [ -n "$ADDITIONAL_TRIMMED" ]; then
  PERSONAS="${REQUIRED},${ADDITIONAL_TRIMMED}"
else
  PERSONAS="$REQUIRED"
fi

# --- ログ書き込み（TAB 区切り 6 列） ------------------------------------
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
TAGS_TRIMMED=$(printf '%s' "$TAGS" | sed 's/,$//')
[ -z "$TAGS_TRIMMED" ] && TAGS_TRIMMED="-"

printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$TS" "$RESPONSE_ID" "$ROUNDS" "$PERSONAS" "$SEVERITY" "$TAGS_TRIMMED" >>"$LOG_FILE"

# --- 古いログ清掃（4 週間保持） ------------------------------------------
# 週次ローテ: log ファイルが 1MB 超で gzip rotate
if [ -f "$LOG_FILE" ]; then
  SZ=$(wc -c <"$LOG_FILE" 2>/dev/null | tr -d ' ')
  if [ "${SZ:-0}" -gt 1048576 ]; then
    ROT="${LOG_FILE}.$(date -u +%Y%m%d).gz"
    gzip -c "$LOG_FILE" > "$ROT" 2>/dev/null || true
    : > "$LOG_FILE"
  fi
  # 28 日経過 .gz 削除
  find "$(dirname "$LOG_FILE")" -name "$(basename "$LOG_FILE").*.gz" -mtime +28 -delete 2>/dev/null || true
fi

# --- 出力 ---------------------------------------------------------------
echo "$PERSONAS"
exit 0
