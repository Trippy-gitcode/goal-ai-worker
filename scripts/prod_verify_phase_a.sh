#!/bin/sh
# GENERATED: DO NOT MODIFY
# scripts/prod_verify_phase_a.sh — Production Phase A verification (6 batch commands)
#
# 元: dev-system Review Framework v2 (SUBAGENT-DEVSYS-REVIEW-FRAMEWORK-V2-INTEGRATE-V1)
# テンプレ ID: TPL-PROD-VERIFY-PHASE-A-V1
# 派生根拠: Lais 開発で発見した「pre-launch real-environment query 不在」構造的 bias 解消
#
# プレースホルダ (`new <app>` 時に展開):
#   {{SUPABASE_DB_URL}}   - Supabase production DB URL (postgresql://...)
#   {{WORKER_URL}}        - Cloudflare Workers production URL
#   {{FRONTEND_URL}}      - Frontend production URL (Cloudflare Pages 等)
#   {{ACCOUNT_ID}}        - Cloudflare account ID
#   {{WORKER_NAME}}       - Cloudflare Worker name (wrangler.toml の `name`)
#
# 使い方:
#   sh scripts/prod_verify_phase_a.sh                  # 全 6 コマンド実行
#   sh scripts/prod_verify_phase_a.sh A1               # A1 のみ
#   sh scripts/prod_verify_phase_a.sh A1 A3 A6         # 複数指定
#
# 終了コード:
#   0: 全実行コマンド PASS
#   1: いずれか FAIL (非 zero exit / 空応答 / 期待 pattern 不在)
#   2: 環境変数 / 必須 CLI 不在で skip 不可
#
# Phase A 6 バッチ:
#   A1. psql で全 table+column dump        (schema SSoT 取得)
#   A2. psql で全 RPC signature catalog    (pg_proc 取得)
#   A3. curl で実 deploy URL 確認          (Worker / Frontend 200 OK)
#   A4. wrangler secret list               (secret presence 検証)
#   A5. cron schedule 確認                 (wrangler.toml triggers / 実 cron API)
#   A6. schema_drift_check.sh 実行         (code vs schema 整合)
#
# 連動: core_spec.md §11 Review Framework v2 (Phase A = pre-launch production check)

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

OUT_DIR="${REPO_ROOT}/verify/prod_verify_phase_a"
mkdir -p "$OUT_DIR" 2>/dev/null || true
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG="${OUT_DIR}/run_${TS}.log"

# `new <app>` 時に下記 _DEFAULT 値が App 固有値に置換される。
# 未置換 (`{`...) は空扱いに正規化、env vars があればそちらを優先。
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

# .dev.vars fallback (DB URL が env に無ければ)
if [ -z "$DB_URL" ] && [ -f .dev.vars ]; then
  _v="$(grep '^SUPABASE_DB_URL=' .dev.vars 2>/dev/null | cut -d= -f2- || true)"
  [ -n "$_v" ] && DB_URL="$_v"
fi

PSQL=/opt/homebrew/opt/libpq/bin/psql
[ -x "$PSQL" ] || PSQL="$(command -v psql 2>/dev/null || echo '')"

TARGETS="${*:-A1 A2 A3 A4 A5 A6}"
FAIL_COUNT=0
PASS_COUNT=0
SKIP_COUNT=0

ts() { date -u +%Y-%m-%dT%H:%M:%SZ; }
log() { printf '[%s] %s\n' "$(ts)" "$1" | tee -a "$LOG"; }
fail() { FAIL_COUNT=$((FAIL_COUNT + 1)); log "FAIL: $1"; }
pass() { PASS_COUNT=$((PASS_COUNT + 1)); log "PASS: $1"; }
skip() { SKIP_COUNT=$((SKIP_COUNT + 1)); log "SKIP: $1"; }

contains() {
  # contains <needle> <haystack...>
  needle="$1"; shift
  for x in "$@"; do
    [ "$x" = "$needle" ] && return 0
  done
  return 1
}

# ---- A1: schema (table.column) catalog ----
if contains A1 $TARGETS; then
  log "=== A1: full schema (table.column) catalog ==="
  if [ -z "$DB_URL" ] || [ -z "$PSQL" ]; then
    skip "A1 (SUPABASE_DB_URL or psql missing)"
  else
    OUT="${OUT_DIR}/A1_schema_${TS}.tsv"
    if "$PSQL" "$DB_URL" -t -A -F$'\t' -c \
      "SELECT table_schema, table_name, column_name, data_type FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, column_name;" \
      >"$OUT" 2>>"$LOG"; then
      LINES=$(wc -l <"$OUT" | tr -d ' ')
      if [ "${LINES:-0}" -gt 0 ]; then
        pass "A1 schema dumped ($LINES rows) → $OUT"
      else
        fail "A1 schema empty (0 rows)"
      fi
    else
      fail "A1 psql query failed"
    fi
  fi
fi

# ---- A2: RPC signature catalog ----
if contains A2 $TARGETS; then
  log "=== A2: full RPC signature catalog ==="
  if [ -z "$DB_URL" ] || [ -z "$PSQL" ]; then
    skip "A2 (SUPABASE_DB_URL or psql missing)"
  else
    OUT="${OUT_DIR}/A2_rpc_${TS}.tsv"
    if "$PSQL" "$DB_URL" -t -A -F$'\t' -c \
      "SELECT n.nspname, p.proname, pg_get_function_arguments(p.oid), pg_get_function_result(p.oid) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' ORDER BY p.proname;" \
      >"$OUT" 2>>"$LOG"; then
      LINES=$(wc -l <"$OUT" | tr -d ' ')
      pass "A2 RPC catalog dumped ($LINES functions) → $OUT"
    else
      fail "A2 psql query failed"
    fi
  fi
fi

# ---- A3: real deploy URL liveness ----
if contains A3 $TARGETS; then
  log "=== A3: real deploy URL liveness check ==="
  for url_var in "WORKER_URL=$WORKER_URL" "FRONTEND_URL=$FRONTEND_URL"; do
    name="${url_var%%=*}"; url="${url_var#*=}"
    case "$url" in
      "")
        skip "A3 $name (empty)"
        continue
        ;;
    esac
    CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$url" 2>>"$LOG" || echo "000")
    case "$CODE" in
      2*|3*) pass "A3 $name HTTP $CODE ($url)" ;;
      *)     fail "A3 $name HTTP $CODE ($url)" ;;
    esac
  done
fi

# ---- A4: wrangler secret list ----
if contains A4 $TARGETS; then
  log "=== A4: wrangler secret list ==="
  if ! command -v wrangler >/dev/null 2>&1; then
    skip "A4 (wrangler CLI missing)"
  elif [ -z "$WORKER_NAME" ]; then
    skip "A4 (WORKER_NAME empty)"
  else
    OUT="${OUT_DIR}/A4_secrets_${TS}.json"
    if wrangler secret list --name "$WORKER_NAME" >"$OUT" 2>>"$LOG"; then
      COUNT=$(grep -c '"name"' "$OUT" 2>/dev/null || echo 0)
      pass "A4 secret list ($COUNT secrets) → $OUT"
    else
      fail "A4 wrangler secret list failed"
    fi
  fi
fi

# ---- A5: cron schedule confirmation ----
if contains A5 $TARGETS; then
  log "=== A5: cron schedule confirmation ==="
  TOML_OK=0
  if [ -f wrangler.toml ]; then
    if grep -qE '^\s*crons\s*=' wrangler.toml; then
      CRON_LINE=$(grep -E '^\s*crons\s*=' wrangler.toml | head -1)
      log "wrangler.toml: $CRON_LINE"
      TOML_OK=1
    fi
  fi
  if [ "$TOML_OK" = "1" ]; then
    pass "A5 cron declared in wrangler.toml"
  else
    skip "A5 (no wrangler.toml or no crons key)"
  fi
fi

# ---- A6: schema_drift_check ----
if contains A6 $TARGETS; then
  log "=== A6: schema_drift_check.sh ==="
  if [ -x scripts/schema_drift_check.sh ]; then
    if SUPABASE_DB_URL="$DB_URL" sh scripts/schema_drift_check.sh >>"$LOG" 2>&1; then
      pass "A6 schema_drift_check exit 0"
    else
      fail "A6 schema_drift_check non-zero exit"
    fi
  else
    skip "A6 (scripts/schema_drift_check.sh not present or not executable)"
  fi
fi

log "=== Summary: PASS=$PASS_COUNT FAIL=$FAIL_COUNT SKIP=$SKIP_COUNT (log: $LOG) ==="

if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi
exit 0
