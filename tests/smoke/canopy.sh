#!/bin/bash
# canopy.sh — 全Step横断の既存機能生死確認
echo "=== CANOPY TEST ==="
FAIL=0

# 1. Worker稼働確認
VERSION=$(curl -s https://goal-ai-worker.goalai-futoshi.workers.dev/api/version | grep -o '"version":"[^"]*"')
echo "Worker: $VERSION"
if [ -z "$VERSION" ]; then echo "FAIL: Worker not responding"; FAIL=1; fi

# 2. 既存機能grep（src/全体）
echo "--- Core functions ---"
for pattern in "handleChatStream" "buildServerSystemPrompt" "quickRoute" "callRoutingAPI" "handleGeminiChat" "handleGPTChat" "MEMO_ENABLED" "RAG_ENABLED" "CACHE_ENABLED"; do
  COUNT=$(grep -rc "$pattern" src/ 2>/dev/null | awk -F: '{s+=$2}END{print s}')
  if [ "$COUNT" -eq 0 ]; then echo "FAIL: $pattern not found"; FAIL=1; else echo "OK: $pattern ($COUNT refs)"; fi
done

# 3. PLAN_CONFIG v6.3 確認
echo "--- PLAN_CONFIG ---"
for plan in "free" "light" "pro" "max" "ultra"; do
  COUNT=$(grep -c "  $plan:" src/utils/constants.js 2>/dev/null)
  if [ "$COUNT" -eq 0 ]; then echo "FAIL: plan $plan not in PLAN_CONFIG"; FAIL=1; else echo "OK: plan $plan"; fi
done

# 4. 旧プラン名が残っていないか
echo "--- Old plan cleanup ---"
OLD=$(grep -rc "premium\b" src/utils/constants.js 2>/dev/null | awk -F: '{s+=$2}END{print s}')
if [ "$OLD" -gt 0 ]; then echo "FAIL: 'premium' still in constants.js"; FAIL=1; else echo "OK: no old plan names"; fi

# 5. Step 4 固有: ターン記録
echo "--- Turn recording ---"
for pattern in "recordTurnUsage" "maybeSendUsageRecord" "increment_turn_usage"; do
  COUNT=$(grep -rc "$pattern" src/ 2>/dev/null | awk -F: '{s+=$2}END{print s}')
  if [ "$COUNT" -eq 0 ]; then echo "FAIL: $pattern not found"; FAIL=1; else echo "OK: $pattern ($COUNT refs)"; fi
done

# 6. Step 5 固有: キャップ+フェアユース+降格
echo "--- Cap + FairUse + Degradation ---"
for pattern in "getDegradedModels" "checkFairUseV2" "effectiveModels" "X-Model-Degraded"; do
  COUNT=$(grep -rc "$pattern" src/ 2>/dev/null | awk -F: '{s+=$2}END{print s}')
  if [ "$COUNT" -eq 0 ]; then echo "FAIL: $pattern not found"; FAIL=1; else echo "OK: $pattern ($COUNT refs)"; fi
done

# 7. Step 6 固有: API + Webhook
echo "--- API + Webhook ---"
for pattern in "handlePlanStatus" "invoice.paid" "stripe_metered_subscription_item_id" "trial_period_days"; do
  COUNT=$(grep -rc "$pattern" src/ 2>/dev/null | awk -F: '{s+=$2}END{print s}')
  if [ "$COUNT" -eq 0 ]; then echo "FAIL: $pattern not found"; FAIL=1; else echo "OK: $pattern ($COUNT refs)"; fi
done

# 8. Step 7 固有: フロントエンドv6.3
echo "--- Frontend v6.3 ---"
for pattern in "pc-light" "pc-ultra" "plan-usage-bar" "fetchPlanStatus" "showDegradeBadge" "X-Model-Degraded"; do
  COUNT=$(grep -rc "$pattern" frontend/ 2>/dev/null | awk -F: '{s+=$2}END{print s}')
  if [ "$COUNT" -eq 0 ]; then echo "FAIL: $pattern not found in frontend"; FAIL=1; else echo "OK: $pattern ($COUNT refs)"; fi
done
# 旧プラン名がフロントエンドのプランカードに残っていないか
OLD_FE=$(grep -c "pc-premium\|selectPlan('premium')\|selectPlan('annual')" frontend/index.html 2>/dev/null)
if [ "$OLD_FE" -gt 0 ]; then echo "FAIL: old plan cards in index.html"; FAIL=1; else echo "OK: no old plan cards in HTML"; fi

echo "=== CANOPY $([ $FAIL -eq 0 ] && echo 'PASS' || echo 'FAIL') ==="
exit $FAIL
