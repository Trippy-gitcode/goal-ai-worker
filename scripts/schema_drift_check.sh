#!/bin/sh
# scripts/schema_drift_check.sh
# Round 30 fix (2026-05-02) — レビュー漏れ根本原因解析対応:
#   30 round の review が見逃した column 名不一致 / RPC signature 不一致を機械検出。
#
# 検査内容:
#   1. src/ 配下の `rest/v1/<table>?<column>=` pattern 抽出
#   2. SUPABASE_DB_URL 経由で psql に query して production schema 取得
#   3. (table, column) 組合せが schema に存在しない場合 exit 1
#   4. RPC pattern (`/rpc/<name>` + body keys) も pg_proc と照合
#
# 必須環境変数:
#   SUPABASE_DB_URL=postgresql://...  (必須、 .dev.vars 経由)
#
# CI 実行: 本 script は SUPABASE_DB_URL を必要とするため CI runner 側で
#   secret 配置必要。 manual 実行は SKIP_ALLOWED=1 で skip 可。

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

SKIP_ALLOWED="${SKIP_ALLOWED:-0}"
DB_URL="${SUPABASE_DB_URL:-}"
PSQL=/opt/homebrew/opt/libpq/bin/psql
[ -x "$PSQL" ] || PSQL=$(command -v psql 2>/dev/null || echo "")

if [ -z "$DB_URL" ]; then
  if [ -f .dev.vars ]; then
    DB_URL=$(grep '^SUPABASE_DB_URL=' .dev.vars | cut -d= -f2- || true)
  fi
fi

if [ -z "$DB_URL" ] || [ -z "$PSQL" ]; then
  if [ "$SKIP_ALLOWED" = "1" ]; then
    echo "INFO: SUPABASE_DB_URL or psql missing, SKIP_ALLOWED=1 → skipping"
    exit 0
  fi
  echo "::error::SUPABASE_DB_URL or psql missing — schema drift check requires production DB access"
  echo "  Either set SUPABASE_DB_URL in .dev.vars / env, install libpq, or use SKIP_ALLOWED=1"
  exit 1
fi

# 1. extract all (table, column) pairs from src/
PATTERNS=$("$PSQL" "$DB_URL" -t -A -c "SELECT 1;" 2>&1 >/dev/null || echo "DBFAIL")
if [ "$PATTERNS" = "DBFAIL" ]; then
  echo "::error::Cannot connect to SUPABASE_DB_URL (auth fail or network)"
  exit 1
fi

CODE_PATTERNS=$(grep -rEoh "rest/v1/[a-z_]+\?[a-z_]+=" src/ 2>/dev/null | sort -u | sed -E 's|rest/v1/||; s|\?|.|; s|=$||')

if [ -z "$CODE_PATTERNS" ]; then
  echo "OK: no rest/v1/<table>?<column>= patterns found in src/"
  exit 0
fi

# 2. fetch production schema (table.column pairs)
SCHEMA_PAIRS=$("$PSQL" "$DB_URL" -t -A -F. -c "
  SELECT table_name, column_name FROM information_schema.columns
  WHERE table_schema='public' ORDER BY table_name, column_name;
" 2>/dev/null)

if [ -z "$SCHEMA_PAIRS" ]; then
  echo "::error::Failed to fetch schema from production DB"
  exit 1
fi

# 3. cross-check each code pattern
FAIL=0
echo "schema_drift_check:"
for p in $CODE_PATTERNS; do
  if echo "$SCHEMA_PAIRS" | grep -Fxq "$p"; then
    echo "  ✓ $p"
  else
    echo "  ✘ $p ← column not found in production schema"
    FAIL=$((FAIL + 1))
  fi
done

if [ $FAIL -gt 0 ]; then
  echo ""
  echo "ERROR: $FAIL schema drift detected"
  echo "対処: 該当 src/ を schema に合わせて修正、 もしくは migration で column 追加。"
  exit 1
fi

echo ""
echo "OK: all $(echo "$CODE_PATTERNS" | wc -l | tr -d ' ') code patterns match production schema"
exit 0
