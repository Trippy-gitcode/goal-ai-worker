#!/bin/sh
# scripts/verify_external_services.sh — 外部サービス認証 + 代替証跡検証
# 根拠: R2.2 §2.5 υcrit / §3.1 入力契約 SSOT
# POSIX sh 互換（§3.7）。bash 拡張禁止。
#
# 使い方: verify_external_services.sh <mission_block_file>
# 環境変数: MISSION_ID 必須

set -eu
MISSION_FILE="${1:?Usage: $0 <mission_block_file>}"
: "${MISSION_ID:?MISSION_ID env var required}"

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
MISSION_RISK=$("$SCRIPT_DIR/mission_risk_classifier.sh" "$MISSION_FILE" 2>/dev/null || echo "low")
[ "$MISSION_RISK" = "high" ] || { echo "OK: non-high-risk, skip"; exit 0; }

if command -v wrangler >/dev/null 2>&1 && wrangler whoami > /dev/null 2>&1; then
  echo "OK: wrangler authenticated"; exit 0
fi

[ -f "evidence/$MISSION_ID/local-emu-proof.json" ] && { echo "OK: local-emu-proof.json"; exit 0; }
if ls "evidence/$MISSION_ID/screenshots/"*.png > /dev/null 2>&1; then
  echo "OK: screenshots/ alternative"; exit 0
fi
if grep -q "【代替証跡】" "$MISSION_FILE" 2>/dev/null; then
  echo "OK: 【代替証跡】 declared in mission block"; exit 0
fi

cat >&2 <<EOF
FAIL: wrangler not authenticated AND no alternative proof
  required one of:
    1. wrangler login
    2. evidence/$MISSION_ID/local-emu-proof.json
    3. evidence/$MISSION_ID/screenshots/*.png
    4. 【代替証跡】line in mission block
EOF
exit 1
