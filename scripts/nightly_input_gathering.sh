#!/bin/sh
# GENERATED: DO NOT MODIFY
# scripts/nightly_input_gathering.sh — Nightly Review v3 Phase 0 (input gathering, ~5 min, scripted, LLM 不要)
#
# 元: dev-system Review Framework v2 + Nightly Review v3 (DEVSYS-RFV2-F)
# テンプレ ID: TPL-NIGHTLY-INPUT-GATHERING-V1
# 派生根拠: PO 直命「夜間は時間あるので script のみではなく LLM diff review もしろ」 (2026-05-02)
#           Phase 0 で 6 種 input を mechanically dump、Phase 1 で 5 persona LLM が diff review。
#
# 連動 (core_spec.md §13.4):
#   - §13.4 Nightly Review v3 (diff-focused 5-persona LLM)
#   - prod_verify_phase_a.sh (DEVSYS-RFV2-A)
#   - persona_pool_v2.json p066-p070 (5 nightly v3 persona)
#
# プレースホルダ (`new <app>` 時に展開):
#   {{SUPABASE_DB_URL}}     - Supabase production DB URL (psql + information_schema 用)
#   {{WORKER_URL}}          - Cloudflare Workers production URL
#   {{FRONTEND_URL}}        - Frontend production URL
#   {{ACCOUNT_ID}}          - Cloudflare account ID (Workers Logs tail 用)
#   {{WORKER_NAME}}         - Cloudflare Worker name
#
# 6 input source:
#   I1. git log --since=24h --all --pretty=fuller       → 24h commit dump
#   I2. git diff HEAD@{24h.ago}..HEAD                   → 24h code diff dump
#   I3. prod_verify_phase_a.sh                          → 全 production state dump (psql 全 schema 含む)
#   I4. diff prod_state_yesterday vs today              → 昨日 snapshot 差分
#   I5. Cloudflare Workers Logs tail + Postgres audit log tail (24h)
#   I6. Vendor status page snapshot (CF / Stripe / Anthropic / OpenAI / Gemini)
#
# 出力:
#   verify/nightly_input_<YYYY-MM-DD>.md  (5 persona LLM の input、 Phase 1 で消費)
#
# 終了コード:
#   0 = 全 input 取得成功 (一部 SKIP は許容)
#   1 = critical input 取得失敗 (I1 / I2 / I3 のいずれかが取れず)
#   2 = 必須 CLI 不在 (git / curl)

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

DATE_TODAY="${NIGHTLY_REVIEW_DATE:-$(date -u +%Y-%m-%d)}"
OUT_DIR="${REPO_ROOT}/verify"
mkdir -p "$OUT_DIR" 2>/dev/null || true
OUT_FILE="${OUT_DIR}/nightly_input_${DATE_TODAY}.md"
TS="$(date -u +%Y%m%dT%H%M%SZ)"

# Placeholder normalize
DB_URL_DEFAULT="{{SUPABASE_DB_URL}}"
WORKER_URL_DEFAULT="{{WORKER_URL}}"
FRONTEND_URL_DEFAULT="{{FRONTEND_URL}}"
ACCOUNT_ID_DEFAULT="{{ACCOUNT_ID}}"
WORKER_NAME_DEFAULT="{{WORKER_NAME}}"

for _v in DB_URL_DEFAULT WORKER_URL_DEFAULT FRONTEND_URL_DEFAULT ACCOUNT_ID_DEFAULT WORKER_NAME_DEFAULT; do
  eval "_val=\"\$$_v\""
  case "$_val" in
    '{'*) eval "$_v=\"\"" ;;
  esac
done

DB_URL="${SUPABASE_DB_URL:-$DB_URL_DEFAULT}"
WORKER_URL="${WORKER_URL:-$WORKER_URL_DEFAULT}"
FRONTEND_URL="${FRONTEND_URL:-$FRONTEND_URL_DEFAULT}"
ACCOUNT_ID="${CF_ACCOUNT_ID:-$ACCOUNT_ID_DEFAULT}"
WORKER_NAME="${WORKER_NAME:-$WORKER_NAME_DEFAULT}"

# .dev.vars fallback
if [ -z "$DB_URL" ] && [ -f .dev.vars ]; then
  _v="$(grep '^SUPABASE_DB_URL=' .dev.vars 2>/dev/null | cut -d= -f2- || true)"
  [ -n "$_v" ] && DB_URL="$_v"
fi

PSQL=/opt/homebrew/opt/libpq/bin/psql
[ -x "$PSQL" ] || PSQL="$(command -v psql 2>/dev/null || echo '')"

if ! command -v git >/dev/null 2>&1; then
  echo "::error::git CLI required" 1>&2
  exit 2
fi
if ! command -v curl >/dev/null 2>&1; then
  echo "::error::curl CLI required" 1>&2
  exit 2
fi

CRITICAL_FAIL=0

# Header
{
  printf '# Nightly Review v3 — Phase 0 input gathering (%s)\n\n' "$DATE_TODAY"
  printf '> generated-by: nightly_input_gathering.sh (TPL-NIGHTLY-INPUT-GATHERING-V1)\n'
  printf '> generated-at: %s\n' "$TS"
  printf '> spec-ref: core_spec.md §13.4 Nightly Review v3\n'
  printf '> consumed-by: nightly_review_v3.sh Phase 1 (5 persona LLM diff review)\n\n'
} > "$OUT_FILE"

# ---- I1: 24h git commit log ----
{
  printf '## I1. 24h commit log (`git log --since=24h --all --pretty=fuller`)\n\n```\n'
  if git log --since='24 hours ago' --all --pretty=fuller 2>/dev/null; then
    :
  else
    printf '(I1 FAIL: git log returned non-zero)\n'
    CRITICAL_FAIL=1
  fi
  printf '```\n\n'
} >> "$OUT_FILE"

# ---- I2: 24h code diff ----
{
  printf '## I2. 24h code diff (`git diff HEAD@{24h.ago}..HEAD`)\n\n```diff\n'
  # HEAD@{24h.ago} は reflog 依存。 fallback: --since の commit 範囲
  REF_24H="$(git rev-list -n1 --before='24 hours ago' HEAD 2>/dev/null || true)"
  if [ -n "$REF_24H" ]; then
    git diff "$REF_24H..HEAD" 2>/dev/null || printf '(I2 partial: git diff failed)\n'
  else
    printf '(I2 SKIP: no commit older than 24h on current branch)\n'
  fi
  printf '\n```\n\n'
} >> "$OUT_FILE"

# ---- I3: prod_verify_phase_a (全 production state dump) ----
{
  printf '## I3. Production state dump (prod_verify_phase_a.sh, 6 batch incl. psql information_schema)\n\n```\n'
  if [ -x scripts/prod_verify_phase_a.sh ]; then
    SUPABASE_DB_URL="$DB_URL" WORKER_URL="$WORKER_URL" FRONTEND_URL="$FRONTEND_URL" \
      CF_ACCOUNT_ID="$ACCOUNT_ID" WORKER_NAME="$WORKER_NAME" \
      sh scripts/prod_verify_phase_a.sh 2>&1 | head -300 || printf '(I3 partial: prod_verify_phase_a non-zero exit)\n'
  else
    printf '(I3 SKIP: scripts/prod_verify_phase_a.sh not present)\n'
  fi
  printf '```\n\n'
} >> "$OUT_FILE"

# Snapshot today's prod state for tomorrow's I4
SNAPSHOT_TODAY="${OUT_DIR}/prod_state_${DATE_TODAY}.txt"
SNAPSHOT_YESTERDAY=""
# detect yesterday snapshot (date -d 不在 OS 互換のため glob で 1 つ前を探す)
PREV_SNAP="$(ls -1 "${OUT_DIR}/prod_state_"*.txt 2>/dev/null | grep -v "$SNAPSHOT_TODAY" | tail -1 || true)"

if [ -n "$DB_URL" ] && [ -n "$PSQL" ]; then
  "$PSQL" "$DB_URL" -t -A -F$'\t' -c \
    "SELECT table_schema, table_name, column_name, data_type FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, column_name;" \
    >"$SNAPSHOT_TODAY" 2>/dev/null || true
fi

# ---- I4: snapshot diff ----
{
  printf '## I4. Production state diff (yesterday vs today snapshot)\n\n```diff\n'
  if [ -n "$PREV_SNAP" ] && [ -f "$SNAPSHOT_TODAY" ]; then
    diff "$PREV_SNAP" "$SNAPSHOT_TODAY" 2>/dev/null | head -200 || printf '(no diff)\n'
  else
    printf '(I4 SKIP: no yesterday snapshot available — first run will seed it)\n'
  fi
  printf '```\n\n'
} >> "$OUT_FILE"

# ---- I5: Workers Logs tail + Postgres audit log tail (24h) ----
{
  printf '## I5. Cloudflare Workers Logs tail + Postgres audit log tail (24h)\n\n```\n'
  # Workers Logs (wrangler tail は live、 24h 履歴は GraphQL Logs API 経由が必要。 stub: wrangler tail --format=pretty を tail で limit)
  if command -v wrangler >/dev/null 2>&1 && [ -n "$WORKER_NAME" ]; then
    printf '### Workers Logs (last 200 lines, wrangler tail attempted, stub)\n'
    timeout 5 wrangler tail --name "$WORKER_NAME" --format pretty 2>&1 | head -200 || printf '(wrangler tail timeout / stub)\n'
  else
    printf '(I5 wrangler SKIP: wrangler missing or WORKER_NAME empty)\n'
  fi
  printf '\n### Postgres audit log tail\n'
  if [ -n "$DB_URL" ] && [ -n "$PSQL" ]; then
    "$PSQL" "$DB_URL" -t -A -F$'\t' -c \
      "SELECT now() - INTERVAL '24 hour' AS since_24h;" 2>/dev/null || true
    # actual audit log tail は schema 依存 (audit.audit_log 等)。 stub:
    printf '(audit table 名は app schema 依存。 SQL: SELECT * FROM audit.audit_log WHERE created_at > now() - INTERVAL %c24 hour%c LIMIT 100;)\n' "'" "'"
  else
    printf '(I5 psql SKIP)\n'
  fi
  printf '```\n\n'
} >> "$OUT_FILE"

# ---- I6: Vendor status page snapshot ----
{
  printf '## I6. Vendor status page snapshot (CF / Stripe / Anthropic / OpenAI / Gemini)\n\n```\n'
  for entry in \
    "Cloudflare https://www.cloudflarestatus.com/api/v2/status.json" \
    "Stripe https://status.stripe.com/api/v2/status.json" \
    "Anthropic https://status.anthropic.com/api/v2/status.json" \
    "OpenAI https://status.openai.com/api/v2/status.json" \
    "Gemini https://status.cloud.google.com/incidents.json"; do
    name="${entry%% *}"; url="${entry##* }"
    printf '### %s\n' "$name"
    curl -s --max-time 10 "$url" 2>/dev/null | head -20 || printf '(curl timeout for %s)\n' "$name"
    printf '\n'
  done
  printf '```\n\n'
} >> "$OUT_FILE"

# Footer
{
  printf '---\n\n'
  printf '## Phase 0 summary\n\n'
  printf '- output: `%s`\n' "$OUT_FILE"
  printf '- snapshot today: `%s`\n' "$SNAPSHOT_TODAY"
  printf '- snapshot yesterday: `%s`\n' "${PREV_SNAP:-(none)}"
  printf '- next: `sh scripts/nightly_review_v3.sh --input %s`\n' "$OUT_FILE"
} >> "$OUT_FILE"

echo "Phase 0 input gathering done → $OUT_FILE"

if [ "$CRITICAL_FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
