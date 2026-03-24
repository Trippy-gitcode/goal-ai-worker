#!/bin/bash
# post-deploy-check.sh — デプロイ後ヘルスチェック
# C2基準フローのステップ6で使用

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAIL=0

WORKER_URL="https://goal-ai-worker.goalai-futoshi.workers.dev"
PAGES_URL="https://goal-ai-frontend.pages.dev"

# ローカルAPP_VERSION
LOCAL_VER=$(grep -o "APP_VERSION = '[^']*'" "$ROOT/frontend/js/globals.js" | grep -o "'[^']*'" | tr -d "'")
echo "Local APP_VERSION: $LOCAL_VER"
echo ""

# 1. Worker /api/version チェック
echo "--- Worker health check ---"
WORKER_RES=$(curl -s --max-time 10 "$WORKER_URL/api/version" 2>/dev/null || echo '{"error":"timeout"}')
WORKER_VER=$(echo "$WORKER_RES" | sed -n 's/.*"version":"\([^"]*\)".*/\1/p')

if [ -z "$WORKER_VER" ]; then
  echo "FAIL: Could not reach $WORKER_URL/api/version"
  FAIL=1
elif [ "$WORKER_VER" = "$LOCAL_VER" ]; then
  echo "OK: Worker version=$WORKER_VER (matches local)"
else
  echo "FAIL: Worker version=$WORKER_VER != local=$LOCAL_VER"
  FAIL=1
fi

# 2. Worker /health チェック
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$WORKER_URL/health" 2>/dev/null || echo "000")
if [ "$HEALTH_STATUS" = "200" ]; then
  echo "OK: Worker /health → 200"
else
  echo "FAIL: Worker /health → $HEALTH_STATUS"
  FAIL=1
fi

# 3. Pages バージョン チェック
echo ""
echo "--- Pages health check ---"
PAGES_HTML=$(curl -s --max-time 10 "$PAGES_URL/" 2>/dev/null || echo "")
PAGES_VER=$(echo "$PAGES_HTML" | grep -o 'v[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1 | sed 's/v//')

if [ -z "$PAGES_VER" ]; then
  echo "FAIL: Could not reach $PAGES_URL or no version found"
  FAIL=1
elif [ "$PAGES_VER" = "$LOCAL_VER" ]; then
  echo "OK: Pages version=$PAGES_VER (matches local)"
else
  echo "WARN: Pages version=$PAGES_VER != local=$LOCAL_VER (CDN cache may need time)"
fi

PAGES_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$PAGES_URL/" 2>/dev/null || echo "000")
if [ "$PAGES_STATUS" = "200" ]; then
  echo "OK: Pages / → 200"
else
  echo "FAIL: Pages / → $PAGES_STATUS"
  FAIL=1
fi

echo ""
if [ $FAIL -eq 0 ]; then
  echo "=== POST-DEPLOY CHECK PASS ==="
else
  echo "=== POST-DEPLOY CHECK FAIL ==="
  echo "Consider: npx wrangler rollback"
  exit 1
fi
