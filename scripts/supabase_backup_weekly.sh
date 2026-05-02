#!/bin/sh
set -eu
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT="/tmp/supabase_backup_${TS}.sql.gz"
[ -n "${SUPABASE_DB_URL:-}" ] || { echo "ERROR: SUPABASE_DB_URL 必須" >&2; exit 1; }
DUMP_BIN="${PG_DUMP_BIN:-/opt/homebrew/opt/libpq/bin/pg_dump}"
[ -x "$DUMP_BIN" ] || { echo "ERROR: pg_dump binary 不在" >&2; exit 1; }
"$DUMP_BIN" "$SUPABASE_DB_URL" --no-owner --no-acl --schema-only | gzip > "$OUT"
SIZE=$(stat -f %z "$OUT" 2>/dev/null || stat -c %s "$OUT" 2>/dev/null)
echo "OK: backup $OUT (${SIZE} bytes)"
