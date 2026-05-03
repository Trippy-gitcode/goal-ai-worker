#!/bin/sh
# scripts/g50_prod_source_triple_verify.sh — G50 production / source / commit SHA 三点照合 gate
#
# 根拠:
#   - 違反 #50 (2026-05-03): production deploy 17 batches NOT EFFECTIVE = source vs prod gap silent
#   - 5 persona aggregate (P1 + P3 + P5 consensus): production 三点照合不在 = #50 同型 構造再生産リスク
#   - batch 38 PERSONA-AGGREGATE TKT-G50-PROD-TRIPLE-VERIFY ticket 起票
#
# 動作 (manual or pre-push hook):
#   1. source APP_VERSION 取得 (src/utils/constants.js)
#   2. production /api/version 取得 (curl)
#   3. local HEAD commit SHA 取得 (git rev-parse)
#   4. 三点 mismatch 検出 → exit 2 + reason
#
# 起動 timing:
#   (a) commit + push 後 manual 起動 (sh scripts/g50_prod_source_triple_verify.sh)
#   (b) Stop hook で 「deploy 完了」 を含む応答時 自動 trigger
#   (c) deploy.yml CI 内 post-deploy verify step

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  G50 production / source / commit SHA 三点照合"
echo "  (違反 #50 防止、 5 persona consensus)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. source APP_VERSION
SOURCE_VER=$(grep -E "export const APP_VERSION" src/utils/constants.js 2>/dev/null | head -1 | sed -E "s/.*'([0-9]+\.[0-9]+\.[0-9]+)'.*/\1/")
if [ -z "$SOURCE_VER" ]; then
  echo "🛑 G50 FAIL: source APP_VERSION 取得不能 (src/utils/constants.js)"
  exit 2
fi
echo "source APP_VERSION:    $SOURCE_VER"

# 2. production /api/version
WORKER_URL="${WORKER_PROD_URL:-https://goal-ai-worker.goalai-futoshi.workers.dev}"
PROD_RESP=$(curl -sS --max-time 10 "${WORKER_URL}/api/version" 2>/dev/null || echo "")
if [ -z "$PROD_RESP" ]; then
  echo "🛑 G50 FAIL: production /api/version 取得不能 (${WORKER_URL}/api/version)"
  exit 2
fi
PROD_VER=$(echo "$PROD_RESP" | python3 -c 'import sys,json
try:
    print(json.load(sys.stdin).get("version",""))
except: print("")' 2>/dev/null)
echo "production /api/version: $PROD_VER"

# 3. local HEAD commit SHA + push 状態
LOCAL_SHA=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
ORIGIN_SHA=$(git rev-parse origin/main 2>/dev/null || echo "unknown")
echo "local HEAD:            $LOCAL_SHA"
echo "origin/main:           $ORIGIN_SHA"

# 4. 三点 mismatch 検出
ERRORS=""
if [ "$SOURCE_VER" != "$PROD_VER" ]; then
  ERRORS="${ERRORS}\n  - source ($SOURCE_VER) ≠ production ($PROD_VER) = deploy 未到達 / drift"
fi
if [ "$LOCAL_SHA" != "$ORIGIN_SHA" ]; then
  ERRORS="${ERRORS}\n  - local HEAD ($LOCAL_SHA) ≠ origin/main ($ORIGIN_SHA) = push 未完了"
fi

if [ -n "$ERRORS" ]; then
  echo ""
  printf "🛑 G50 FAIL: 三点照合 mismatch 検出%b\n" "$ERRORS"
  echo ""
  echo "対処:"
  echo "  source ≠ prod の場合: wrangler deploy --env production を実行"
  echo "  local ≠ origin の場合: git push origin main を実行"
  echo "  両方一致するまで 本 gate を pass させない (#50 同型 防止)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 2
fi

echo ""
echo "✅ G50 PASS: 三点 完全一致 (source = prod = $SOURCE_VER, local = origin = $LOCAL_SHA)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
exit 0
