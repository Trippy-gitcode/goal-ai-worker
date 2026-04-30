#!/bin/sh
# scripts/deploy_poll_hash.sh — G16: デプロイ URL hash 検証（本番側）
# 根拠: R2.2 §2.7 χcrit / R1 §4.1 γ'
# POSIX sh 互換（§3.7）。bash 拡張禁止。
#
# 使い方: deploy_poll_hash.sh <DEPLOY_URL> <EXPECTED_SHA>
# 指定 URL の HTML / index / meta から commit sha を取得 → 期待値と一致を最大 N 回ポーリング

set -eu
URL="${1:?Usage: $0 <DEPLOY_URL> <EXPECTED_SHA>}"
EXPECTED="${2:?Usage: $0 <DEPLOY_URL> <EXPECTED_SHA>}"
MAX_TRY="${DEPLOY_POLL_MAX:-12}"
SLEEP_SEC="${DEPLOY_POLL_INTERVAL:-10}"

EXPECTED_SHORT=$(printf '%s' "$EXPECTED" | cut -c1-7)

i=0
while [ "$i" -lt "$MAX_TRY" ]; do
  i=$((i + 1))
  BODY=$(curl -fsS --max-time 20 "$URL" 2>/dev/null || true)
  if [ -n "$BODY" ] && printf '%s' "$BODY" | grep -qE "$EXPECTED|$EXPECTED_SHORT"; then
    echo "OK: G16 URL $URL hash matched ($EXPECTED_SHORT) on try=$i"
    exit 0
  fi
  echo "WAIT: G16 poll try=$i/$MAX_TRY ($URL)" >&2
  sleep "$SLEEP_SEC"
done

echo "FAIL: G16 URL $URL did not reflect hash $EXPECTED_SHORT after $MAX_TRY tries" >&2
exit 1
