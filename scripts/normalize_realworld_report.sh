#!/bin/sh
# scripts/normalize_realworld_report.sh — Playwright 生JSON → v3.4 正規化スキーマ
# 根拠: R2.2 §2.7 χcrit / §3.3 証跡パス SSOT
# POSIX sh 互換（§3.7）。bash 拡張禁止。
#
# 正規化スキーマ:
#   { "timestamp": "ISO-8601 no-millis UTC",
#     "timestamp_epoch": 数値,
#     "mission_id": "...",
#     "commit_sha": "...",
#     "results": { "passed": N, "failed": N, "skipped": N },
#     "screenshots": { "launch": "path", ... } }

set -eu
MID="${1:?Usage: $0 <MISSION_ID>}"
RAW="evidence/$MID/realworld-proof.json.raw"
OUT="evidence/$MID/realworld-proof.json"
SHOTS_DIR="evidence/$MID/realworld-screenshots"

[ -f "$RAW" ] || { echo "FAIL: $RAW not found" >&2; exit 1; }

iso_to_epoch() {
  iso="$1"
  iso_nomilli=$(printf '%s\n' "$iso" | sed -E 's/\.[0-9]+Z$/Z/')
  if e=$(date -j -u -f "%Y-%m-%dT%H:%M:%SZ" "$iso_nomilli" +%s 2>/dev/null); then
    echo "$e"; return 0
  fi
  date -u -d "$iso_nomilli" +%s 2>/dev/null
}

NOW_ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ)
NOW_EPOCH=$(iso_to_epoch "$NOW_ISO")
COMMIT=$(git rev-parse HEAD)

PASSED=$(jq '[.suites[]?.specs[]?.tests[]? | select(.status=="passed")] | length // 0' "$RAW" 2>/dev/null || echo 0)
FAILED=$(jq '[.suites[]?.specs[]?.tests[]? | select(.status=="failed" or .status=="timedOut")] | length // 0' "$RAW" 2>/dev/null || echo 0)
SKIPPED=$(jq '[.suites[]?.specs[]?.tests[]? | select(.status=="skipped")] | length // 0' "$RAW" 2>/dev/null || echo 0)

SHOTS_JSON=$(
  if [ -d "$SHOTS_DIR" ]; then
    ls "$SHOTS_DIR"/*.png 2>/dev/null | python3 -c '
import sys, json, os
d = {}
for line in sys.stdin:
    p = line.strip()
    if p:
        name = os.path.splitext(os.path.basename(p))[0]
        d[name] = p
print(json.dumps(d))
'
  else
    echo '{}'
  fi
)

python3 -c "
import json, sys
out = {
  'timestamp': '$NOW_ISO',
  'timestamp_epoch': $NOW_EPOCH,
  'mission_id': '$MID',
  'commit_sha': '$COMMIT',
  'results': {'passed': $PASSED, 'failed': $FAILED, 'skipped': $SKIPPED},
  'screenshots': json.loads('''$SHOTS_JSON''')
}
json.dump(out, open('$OUT', 'w'), indent=2)
"
echo "OK: normalized $OUT"
