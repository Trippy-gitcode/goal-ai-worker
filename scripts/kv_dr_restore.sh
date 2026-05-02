#!/bin/sh
# scripts/kv_dr_restore.sh — P2#33 KV DR restore
set -eu
[ $# -lt 1 ] && { echo "Usage: $0 <export.json>" >&2; exit 1; }
SRC="$1"
[ -f "$SRC" ] || { echo "ERROR: $SRC 不在" >&2; exit 1; }
NAMESPACE_ID="${KV_NAMESPACE_ID:-}"
[ -n "$NAMESPACE_ID" ] || { echo "ERROR: KV_NAMESPACE_ID 必須" >&2; exit 1; }
KEY_COUNT=$(python3 -c "import json; print(len(json.load(open('$SRC'))))")
echo "INFO: $KEY_COUNT keys to restore from $SRC"
# wrangler kv:bulk put 経由 (max 10000 keys per batch)
npx wrangler kv:bulk put "$SRC" --namespace-id "$NAMESPACE_ID" --remote
echo "OK: KV DR restore complete"
