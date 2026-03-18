#!/bin/bash
# GOAL AI — デプロイ後スモークテスト
# Usage: bash scripts/smoke_test.sh

BASE="https://goal-ai-worker.goalai-futoshi.workers.dev"
PASS=0
FAIL=0

check() {
  local name=$1 url=$2 method=${3:-GET} data=$4 expect=${5:-200}
  if [ "$method" = "POST" ]; then
    CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$url" -H "Content-Type: application/json" -d "$data" 2>/dev/null)
  else
    CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
  fi
  if [ "$CODE" = "$expect" ]; then
    echo "✅ $name (HTTP $CODE)"
    PASS=$((PASS+1))
  else
    echo "❌ $name (HTTP $CODE, expected $expect)"
    FAIL=$((FAIL+1))
  fi
}

echo "=== GOAL AI Smoke Test ==="
echo ""

# 基本エンドポイント
check "Health" "$BASE/health"
check "Version" "$BASE/api/version"

# バージョン表示
echo ""
echo "Version: $(curl -s $BASE/api/version 2>/dev/null)"

# 最新エラー確認
echo ""
echo "Last error:"
curl -s "$BASE/api/debug/errors" 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); e=d.get('lastError'); print(json.dumps(e,indent=2,ensure_ascii=False) if e else 'None')" 2>/dev/null || echo "N/A"

echo ""
echo "=== Result: ✅ $PASS passed / ❌ $FAIL failed ==="
if [ $FAIL -gt 0 ]; then
  echo "⚠️  ROLLBACK REQUIRED: npx wrangler rollback"
  exit 1
fi
