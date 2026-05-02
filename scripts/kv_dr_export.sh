#!/bin/sh
# scripts/kv_dr_export.sh — P2#33 KV DR export (Lais TOKEN_KV namespace を全 key 取得 → JSON dump)
set -eu
NAMESPACE_ID="${KV_NAMESPACE_ID:-}"
[ -n "$NAMESPACE_ID" ] || { echo "ERROR: KV_NAMESPACE_ID 必須 (wrangler.toml の TOKEN_KV.id を確認)" >&2; exit 1; }
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT="/tmp/kv_dr_${TS}.json"
npx wrangler kv:key list --namespace-id "$NAMESPACE_ID" --remote > /tmp/kv_keys_$$.json 2>&1 || {
  echo "ERROR: wrangler kv:key list failed" >&2; exit 1;
}
KEY_COUNT=$(python3 -c "import json,sys; print(len(json.load(open('/tmp/kv_keys_$$.json'))))")
echo "INFO: $KEY_COUNT keys to export"
# 各 key value を取得 (大規模 namespace では rate limit 注意、 batch 化 別途検討)
echo "[" > "$OUT"
FIRST=1
python3 -c "import json; print('\n'.join(k['name'] for k in json.load(open('/tmp/kv_keys_$$.json'))))" | while read -r KEY; do
  VAL=$(npx wrangler kv:key get "$KEY" --namespace-id "$NAMESPACE_ID" --remote 2>/dev/null || echo "")
  [ "$FIRST" -eq 1 ] && FIRST=0 || echo "," >> "$OUT"
  python3 -c "import json,sys; print(json.dumps({'key': sys.argv[1], 'value': sys.argv[2]}))" "$KEY" "$VAL" >> "$OUT"
done
echo "]" >> "$OUT"
SIZE=$(stat -f %z "$OUT" 2>/dev/null || stat -c %s "$OUT" 2>/dev/null)
echo "OK: KV DR export $OUT ($KEY_COUNT keys, $SIZE bytes)"
rm -f /tmp/kv_keys_$$.json
