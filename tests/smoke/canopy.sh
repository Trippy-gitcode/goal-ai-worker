#!/bin/bash
# canopy.sh — 全Step横断の既存機能生死確認
CANOPY_START=$(date +%s)

# 結果保存先
mkdir -p instructions/results
RESULT_FILE="instructions/results/canopy_latest.txt"
PREV_FILE="instructions/results/canopy_prev.txt"
if [ -f "$RESULT_FILE" ]; then cp "$RESULT_FILE" "$PREV_FILE"; fi

# 全出力をファイルにもtee
exec > >(tee "$RESULT_FILE") 2>&1

echo "=== CANOPY TEST ($(date '+%H:%M:%S')) ==="
FAIL=0

# 1. Worker稼働確認
VERSION=$(curl -s https://goal-ai-worker.goalai-futoshi.workers.dev/api/version | grep -o '"version":"[^"]*"')
echo "Worker: $VERSION"
if [ -z "$VERSION" ]; then echo "FAIL: Worker not responding"; FAIL=1; fi

# 1b. HTTP smoke tests — 主要エンドポイント200確認
echo "--- HTTP Smoke Tests ---"
BASE="https://goal-ai-worker.goalai-futoshi.workers.dev"
for ep in "/api/version" "/health"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$ep")
  if [ "$STATUS" = "200" ]; then echo "OK: GET $ep → $STATUS"; else echo "FAIL: GET $ep → $STATUS"; FAIL=1; fi
done
# 認証必須エンドポイント → 401が正常
for ep in "/api/usage" "/api/plan/status" "/api/goals"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$ep")
  if [ "$STATUS" = "401" ]; then echo "OK: GET $ep → 401 (auth required)"; else echo "FAIL: GET $ep → $STATUS (expected 401)"; FAIL=1; fi
done
# POST without body → 400 or 401
for ep in "/api/chat/stream" "/api/checkout/create"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE$ep")
  if [ "$STATUS" = "400" ] || [ "$STATUS" = "401" ]; then echo "OK: POST $ep → $STATUS"; else echo "FAIL: POST $ep → $STATUS"; FAIL=1; fi
done
# Frontend Pages
FE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://goal-ai-frontend.pages.dev/")
if [ "$FE_STATUS" = "200" ]; then echo "OK: Frontend → $FE_STATUS"; else echo "FAIL: Frontend → $FE_STATUS"; FAIL=1; fi

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

# 9. Step 8a: 共通コンポーネント
echo "--- Common Components (8a) ---"
for pattern in "M5 24l4-11" "getGptSVG" "_saveScroll" "stopHomeStream" "_setHomeSendIcon"; do
  COUNT=$(grep -rc "$pattern" frontend/ 2>/dev/null | awk -F: '{s+=$2}END{print s}')
  if [ "$COUNT" -eq 0 ]; then echo "FAIL: $pattern not found in frontend"; FAIL=1; else echo "OK: $pattern ($COUNT refs)"; fi
done

# 10. Step 8b: 各画面UI変更
echo "--- Screen UI changes (8b) ---"
for pattern in "ob-slides" "obNext" "confirmDeleteAccount" "3人寄れば" "停滞ポイント"; do
  COUNT=$(grep -rc "$pattern" frontend/ 2>/dev/null | awk -F: '{s+=$2}END{print s}')
  if [ "$COUNT" -eq 0 ]; then echo "FAIL: $pattern not found in frontend"; FAIL=1; else echo "OK: $pattern ($COUNT refs)"; fi
done
# 旧文言が残っていないか
OLD_TEXT=$(grep -c "週平均作業時間\|できなかった理由の履歴" frontend/index.html 2>/dev/null)
if [ "$OLD_TEXT" -gt 0 ]; then echo "FAIL: old text still in index.html"; FAIL=1; else echo "OK: old text removed"; fi

# 11. Step 8c: プラン演出+ゴール検出トースト
echo "--- Plan presentation + Goal toast (8c) ---"
for pattern in "ultra-particles\|ultraFloat" "plan-compare-table" "フェアユース制限" "goal-detect-toast\|showGoalDetectToast"; do
  COUNT=$(grep -rc "$pattern" frontend/ 2>/dev/null | awk -F: '{s+=$2}END{print s}')
  if [ "$COUNT" -eq 0 ]; then echo "FAIL: $pattern not found in frontend"; FAIL=1; else echo "OK: $pattern ($COUNT refs)"; fi
done

# 12. C10: バージョン同期チェック（4箇所一致）
echo "--- Version sync (C10) ---"
V_GLOBALS=$(grep -o "APP_VERSION = '[^']*'" frontend/js/globals.js | grep -o "'[^']*'" | tr -d "'")
V_SW=$(grep -o "goal-ai-v[^']*" frontend/public/sw.js | head -1 | sed 's/goal-ai-v//')
V_HTML=$(grep -o 'v[0-9]\+\.[0-9]\+\.[0-9]\+' frontend/index.html | head -1 | sed 's/v//')
echo "  globals.js=$V_GLOBALS  sw.js=$V_SW  index.html=$V_HTML"
if [ "$V_GLOBALS" = "$V_SW" ] && [ "$V_SW" = "$V_HTML" ]; then
  echo "OK: version sync ($V_GLOBALS)"
else
  echo "FAIL: version mismatch"; FAIL=1
fi

# 13. C12: スタイル整合性チェック（インラインスタイル禁止ルール）
echo "--- Style integrity (C12) ---"
# 旧デザイン値の残存チェック（JSファイル内）
for bad in "border-radius:24px" "border-radius:20px" "#c4a0e8" "#252a40" "#323855"; do
  COUNT=$(grep -rc "$bad" frontend/js/ 2>/dev/null | awk -F: '{s+=$2}END{print s}')
  if [ "$COUNT" -gt 0 ]; then echo "FAIL: old style '$bad' found in JS ($COUNT)"; FAIL=1; else echo "OK: no '$bad' in JS"; fi
done
# ハードコードモデル色の残存チェック（PDF/export除く）
for bad in "#5b8def" "#e07070" "#e8913a"; do
  COUNT=$(grep -c "$bad" frontend/js/chat.js frontend/js/ui.js frontend/js/goals.js frontend/js/profile.js 2>/dev/null | awk -F: '{s+=$2}END{print s}')
  if [ "$COUNT" -gt 0 ]; then echo "WARN: hardcoded model color '$bad' in JS ($COUNT)"; fi
done
# インラインstyle= 総数ベースライン（増加検出用）
STYLE_COUNT=$(grep -rc 'style=' frontend/js/ 2>/dev/null | awk -F: '{s+=$2}END{print s}')
echo "INFO: inline style= count in JS: $STYLE_COUNT (baseline)"

# 14. UI仕様チェック（design_spec_v3 8a〜8c 全仕様統合）
echo "--- UI spec values (design_spec_v3 8a-8c) ---"
# CRN-01: 統一王冠SVG
CRN01=$(grep -rc "M5 24l4-11 3 5L16 6" frontend/ 2>/dev/null | awk -F: '{s+=$2}END{print s}')
if [ "$CRN01" -ge 2 ]; then echo "OK: CRN-01 crown SVG ($CRN01 refs)"; else echo "FAIL: CRN-01 crown SVG missing ($CRN01)"; FAIL=1; fi
# CRN-02: モデル名グレー (--text-tertiary or --muted)
CRN02=$(grep -c "msg-model.*muted\|msg-model.*tertiary" frontend/style.css 2>/dev/null)
if [ "$CRN02" -ge 1 ]; then echo "OK: CRN-02 model name gray"; else echo "FAIL: CRN-02 model name not gray"; FAIL=1; fi
# CRN-03: 入力ボックス統一 (border-radius:14px or --input-radius)
CRN03=$(grep -c "input-radius\|border-radius:14px" frontend/style.css 2>/dev/null)
if [ "$CRN03" -ge 2 ]; then echo "OK: CRN-03 input radius ($CRN03 refs)"; else echo "FAIL: CRN-03 input radius missing ($CRN03)"; FAIL=1; fi
# 送信ボタンサイズ (--send-btn-size)
SBS=$(grep -c "send-btn-size" frontend/style.css 2>/dev/null)
if [ "$SBS" -ge 3 ]; then echo "OK: send-btn-size ($SBS refs)"; else echo "FAIL: send-btn-size missing ($SBS)"; FAIL=1; fi
# 送信ボタングラデーション (--send-btn-grad)
SBG=$(grep -c "send-btn-grad" frontend/style.css 2>/dev/null)
if [ "$SBG" -ge 3 ]; then echo "OK: send-btn-grad ($SBG refs)"; else echo "FAIL: send-btn-grad missing ($SBG)"; FAIL=1; fi
# 送信ボタン丸型 (border-radius:50%)
SBR=$(grep -c "border-radius:50%" frontend/style.css 2>/dev/null)
if [ "$SBR" -ge 3 ]; then echo "OK: send-btn round ($SBR refs)"; else echo "FAIL: send-btn not round ($SBR)"; FAIL=1; fi
# モデル色CSS変数
for v in "model-claude" "model-gpt" "model-gemini"; do
  VC=$(grep -c "$v" frontend/style.css 2>/dev/null)
  if [ "$VC" -ge 3 ]; then echo "OK: --$v ($VC refs)"; else echo "FAIL: --$v missing ($VC)"; FAIL=1; fi
done
# CSS変数トークン: card-radius, popup-radius, pill-radius
for v in "card-radius" "popup-radius" "pill-radius"; do
  VC=$(grep -c "$v" frontend/style.css 2>/dev/null)
  if [ "$VC" -ge 3 ]; then echo "OK: --$v ($VC refs)"; else echo "FAIL: --$v missing ($VC)"; FAIL=1; fi
done
# 8b: ゴールハブ5タブ
HT=$(grep -c "hub-tab" frontend/index.html 2>/dev/null)
if [ "$HT" -ge 5 ]; then echo "OK: 8b hub-tabs ($HT)"; else echo "FAIL: 8b hub-tabs missing ($HT, need ≥5)"; FAIL=1; fi
# 8b: オンボーディング3ステップ
OB=$(grep -c "ob-slides\|ob-dot" frontend/index.html 2>/dev/null)
if [ "$OB" -ge 2 ]; then echo "OK: 8b onboarding slides ($OB)"; else echo "FAIL: 8b onboarding slides missing ($OB)"; FAIL=1; fi
# 8c: プランカルーセル（5プラン全クラス）
PC=$(grep -c "pc-free\|pc-light\|pc-pro\|pc-max\|pc-ultra" frontend/ -r 2>/dev/null | awk -F: '{s+=$2}END{print s}')
if [ "$PC" -ge 5 ]; then echo "OK: 8c plan cards ($PC refs)"; else echo "FAIL: 8c plan cards missing ($PC, need ≥5)"; FAIL=1; fi
# 8c: ゴール検出トースト
GDT=$(grep -c "showGoalDetectToast\|goal-detect-toast" frontend/ -r 2>/dev/null | awk -F: '{s+=$2}END{print s}')
if [ "$GDT" -ge 2 ]; then echo "OK: 8c goal detect toast ($GDT refs)"; else echo "FAIL: 8c goal detect toast missing ($GDT)"; FAIL=1; fi

# 15. 参照ドキュメント全ファイル存在チェック
echo "--- Reference docs exist ---"
for ref in "docs/goal_ai_project_v6_4.md" "docs/goal_ai_reference_v2.md" "docs/goal_ai_design_spec_v3.md" "docs/design_review_changelog_v3.md" "docs/design_amendment_001.md" "instructions/design_impl_001.md" "instructions/stripe_005_frontend.md" "instructions/stripe_amendment_001.md" "instructions/stripe_amendment_002.md" "development_rules.md"; do
  if [ -f "$ref" ]; then echo "OK: $ref"; else echo "FAIL: $ref missing"; FAIL=1; fi
done

# 16. 旧ファイルがルートに残っていないこと
echo "--- No stale root files ---"
STALE=0
for old in "audit_batch_04.md" "fix_persistent_bugs.md" "fix_persistent_bugs_v2.md" "fix_pre_launch_10items.md" "fix_profile_page.md" "fix_system_concept_change.md" "fix_tester_setup.md" "fix_ui_batch_04.md" "render_chat_ui_integration.md" "v3.9.1_worker_full_split.md" "v3_9_0_location_vite_hono_v2.md"; do
  if [ -f "$old" ]; then echo "FAIL: stale file $old in root"; STALE=1; FAIL=1; fi
done
if [ "$STALE" -eq 0 ]; then echo "OK: no stale root files"; fi

# 18. Gemini 3.x モデル名チェック
echo "--- Gemini 3.x model names ---"
G3F=$(grep -c "gemini-3-flash-preview" src/utils/constants.js 2>/dev/null)
G3P=$(grep -c "gemini-3.1-pro-preview" src/utils/constants.js 2>/dev/null)
if [ "$G3F" -ge 3 ]; then echo "OK: gemini-3-flash-preview ($G3F refs)"; else echo "FAIL: gemini-3-flash-preview missing ($G3F, need ≥3)"; FAIL=1; fi
if [ "$G3P" -ge 2 ]; then echo "OK: gemini-3.1-pro-preview ($G3P refs)"; else echo "FAIL: gemini-3.1-pro-preview missing ($G3P, need ≥2)"; FAIL=1; fi
# 旧Geminiモデル名が残っていないこと
OLD_GEM=$(grep -c "gemini-2\.5" src/utils/constants.js 2>/dev/null)
if [ "$OLD_GEM" -eq 0 ]; then echo "OK: no old gemini-2.5 models"; else echo "FAIL: old gemini-2.5 still in constants.js ($OLD_GEM refs)"; FAIL=1; fi

# 19. ルーティングcatch-all=GPT確認
echo "--- Routing catch-all ---"
CATCH_GPT=$(grep -c "return 'gpt'" src/services/ai/routing.js 2>/dev/null)
if [ "$CATCH_GPT" -ge 2 ]; then echo "OK: routing catch-all=gpt ($CATCH_GPT)"; else echo "FAIL: routing catch-all not gpt ($CATCH_GPT, need ≥2)"; FAIL=1; fi

# 17. session_progress.mdバージョンとAPP_VERSIONの一致
echo "--- SP version sync ---"
SP_VER=$(grep -o 'バージョン:.*v[0-9.]*' instructions/session_progress.md 2>/dev/null | grep -o 'v[0-9.]*')
echo "  session_progress=$SP_VER  APP_VERSION=$V_GLOBALS"
# INFO only (SP version may lag during development)

CANOPY_END=$(date +%s)
CANOPY_DUR=$((CANOPY_END - CANOPY_START))

echo "=== CANOPY $([ $FAIL -eq 0 ] && echo 'PASS' || echo 'FAIL') (${CANOPY_DUR}s) ==="

# 前回差分出力
if [ -f "$PREV_FILE" ]; then
  echo ""
  echo "--- Diff from previous run ---"
  diff "$PREV_FILE" "$RESULT_FILE" || true
fi

exit $FAIL
