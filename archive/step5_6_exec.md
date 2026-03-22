# Step 5+6: キャップ+フェアユース+降格 & API+Webhook
> INSTRUCTION_ID: STEP5-6-EXEC
> REQUIRES_VERSION: v3.9.3（Step 4 完了済み）
> リスクレベル: 🔴高（モデル選択ロジック変更 + Webhook拡張）
> 追加ルール: development_rules.md の C1〜C7 を遵守
> 2段階デプロイ: Step 5 → デプロイ+テスト → Step 6 → デプロイ+テスト

---

## ⚠ 鉄則

1. **指示書にない変更は一切加えない**。改善案はsession_progress.md「## 提案ログ」に記録のみ
2. **DB操作は user_id (UUID) = auth.userId**
3. **旧KVフェアユース(rate-limit.js)をv6.3の5h/weekly窓で完全置換** → 旧checkFairUse呼び出しを削除しI/O半減
4. **design/feedback (free_no_count=true) はキャップ・フェアユースの対象外**
5. **Ultra は降格しない** (fallback_model=null)。フェアユースのみ適用
6. **gpt.js / gemini.js の getModel 呼び出しに overrideModels パススルー追加**

---

# ═══════ STEP 5: キャップ + フェアユース + モデル降格 ═══════

## Phase 0: プリフライトチェック

```bash
echo "=== Step 5 Preflight ===" > instructions/results/step5_preflight.txt

# 1. Step 4 の成果物確認
echo "--- Step 4 artifacts ---" >> instructions/results/step5_preflight.txt
grep -c "recordTurnUsage\|getPlanConfig\|PLAN_CONFIG" src/routes/chat.js >> instructions/results/step5_preflight.txt
# → 3以上

# 2. chat_messages.user_id がUUIDカラムであること確認
echo "--- chat_messages user_id column ---" >> instructions/results/step5_preflight.txt
grep -n "user_id" src/utils/supabase.js >> instructions/results/step5_preflight.txt
# → saveChatMessage内で user_id: users[0].id と設定されていること

# 3. getModel に overrideModels 引数が追加済みであること
echo "--- getModel overrideModels ---" >> instructions/results/step5_preflight.txt
grep "overrideModels" src/utils/constants.js >> instructions/results/step5_preflight.txt
# → 1行以上

# 4. gpt.js / gemini.js の getModel呼び出し箇所
echo "--- getModel in ai handlers ---" >> instructions/results/step5_preflight.txt
grep -n "getModel" src/services/ai/gpt.js src/services/ai/gemini.js >> instructions/results/step5_preflight.txt

# 5. chat_messages インデックス確認（Step 3で作成済みか）
echo "--- idx check ---" >> instructions/results/step5_preflight.txt
echo "CHECK: session_progress.md の Step 3 でインデックス idx_chat_messages_user_created 作成済みか確認" >> instructions/results/step5_preflight.txt

echo "=== Preflight DONE ===" >> instructions/results/step5_preflight.txt
cat instructions/results/step5_preflight.txt
```

**全PASS → Phase 1 に進む。FAIL → 停止+記録。**

---

## Phase 1: gpt.js / gemini.js に overrideModels パススルー

### src/services/ai/gpt.js

変更1: `handleGPTChat` の引数に `overrideModels` 追加:
```javascript
// 旧: export async function handleGPTChat(env, system, messages, auth, maxTokens) {
//       const model = getModel(auth.plan, 'openai');
// 新:
export async function handleGPTChat(env, system, messages, auth, maxTokens, overrideModels) {
  const model = getModel(auth.plan, 'openai', overrideModels);
```

変更2: `handleGPTSimpleChat` も同様:
```javascript
// 旧: export async function handleGPTSimpleChat(env, system, messages, auth) {
//       const model = getModel(auth.plan, 'openai');
// 新:
export async function handleGPTSimpleChat(env, system, messages, auth, overrideModels) {
  const model = getModel(auth.plan, 'openai', overrideModels);
```

### src/services/ai/gemini.js

変更: `handleGeminiChat` の引数に `overrideModels` 追加:
```javascript
// 旧: export async function handleGeminiChat(env, system, messages, auth, userLocation) {
//       const model = getModel(auth.plan, 'gemini');
// 新:
export async function handleGeminiChat(env, system, messages, auth, userLocation, overrideModels) {
  const model = getModel(auth.plan, 'gemini', overrideModels);
```

**既存の呼び出し元は overrideModels を渡さないので undefined → getModel は通常動作。後方互換OK。**

---

## Phase 2: chat.js にキャップ+フェアユース+降格ロジック追加

### 2-1. 旧KVフェアユースの呼び出しを削除

handleChatStream 内の以下を**削除**:
```javascript
  // 削除対象（旧KVベースフェアユース）:
  const fu = await checkFairUse(env, auth.userId);
  if (fu.throttle) await new Promise(r => setTimeout(r, fu.delayMs));
```

import文から `checkFairUse` も削除:
```javascript
// 旧:
import { checkRateLimit, checkDailyChatUsage, incrementDailyChatUsage, checkFairUse, canUseModel, incrementFreeModelUsage, getEffectiveModel } from '../utils/rate-limit.js';
// 新:
import { checkRateLimit, checkDailyChatUsage, incrementDailyChatUsage, canUseModel, incrementFreeModelUsage, getEffectiveModel } from '../utils/rate-limit.js';
```

**注意:** handleChat（非ストリーム版、L29付近）にも `checkFairUse` がある。こちらも同様に削除。

### 2-2. chat.js 末尾に新関数を追加

```javascript
// ═══════ モデル降格（STEP5-EXEC） ═══════
function getDegradedModels(plan) {
  const config = getPlanConfig(plan);
  const fallback = config.fallback_model;
  if (!fallback) return null; // Ultra: 降格なし
  return {
    claude: fallback === 'gpt-5-nano' ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-20250514',
    openai: fallback,
    gemini: 'gemini-2.5-flash',
    router: 'gpt-5-mini'
  };
}

// ═══════ v6.3 フェアユース（5h窓 + 週間窓） ═══════
async function checkFairUseV2(env, userId, plan) {
  const config = getPlanConfig(plan);
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_KEY;

  // 5h窓チェック
  const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
  try {
    const res5h = await fetch(
      `${supabaseUrl}/rest/v1/chat_messages?user_id=eq.${userId}&role=eq.user&created_at=gte.${fiveHoursAgo}&select=id`,
      { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Prefer': 'count=exact', 'Range': '0-0' } }
    );
    const count5h = parseInt(res5h.headers.get('content-range')?.split('/')?.[1] || '0');
    if (count5h >= config.fair_use.h5_limit) {
      return { degraded: true, reason: 'fair_use_5h' };
    }
  } catch (e) { console.error('Fair use 5h check failed:', e.message); }

  // 週間窓チェック
  const weekStart = getWeekStartUTC();
  try {
    const resWeek = await fetch(
      `${supabaseUrl}/rest/v1/chat_messages?user_id=eq.${userId}&role=eq.user&created_at=gte.${weekStart}&select=id`,
      { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Prefer': 'count=exact', 'Range': '0-0' } }
    );
    const countWeekly = parseInt(resWeek.headers.get('content-range')?.split('/')?.[1] || '0');
    if (countWeekly >= config.fair_use.weekly_limit) {
      return { degraded: true, reason: 'fair_use_weekly' };
    }
  } catch (e) { console.error('Fair use weekly check failed:', e.message); }

  return { degraded: false, reason: null };
}

function getWeekStartUTC() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = jst.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  jst.setUTCDate(jst.getUTCDate() - diff);
  jst.setUTCHours(0, 0, 0, 0);
  return new Date(jst.getTime() - 9 * 60 * 60 * 1000).toISOString();
}
```

### 2-3. handleChatStream の `if (!free_no_count)` ブロックを拡張

現在のブロック:
```javascript
  if (!free_no_count) {
    const chatUsage = await checkDailyChatUsage(env, auth.userId, auth.plan);
    if (!chatUsage.ok) return jsonRes({ error: '本日のチャット上限に達しました', remaining: 0 }, 429);
    await incrementDailyChatUsage(env, auth.userId);
    if (auth.plan !== 'free') {
      const usageResult = await recordTurnUsage(env, auth.userId, auth.plan);
      console.log(`[TURN] user=${auth.userId} plan=${auth.plan} turns=${usageResult.turns_used} amount=¥${usageResult.current_amount}`);
    }
  }
```

↓ 以下に置換:

```javascript
  let effectiveModels = null; // null = 通常モデル（overrideなし）
  let isDegraded = false;
  let degradeReason = null;
  let usageResult = null;

  if (!free_no_count) {
    const chatUsage = await checkDailyChatUsage(env, auth.userId, auth.plan);
    if (!chatUsage.ok) return jsonRes({ error: '本日のチャット上限に達しました', remaining: 0 }, 429);
    await incrementDailyChatUsage(env, auth.userId);

    // ═══ ターン記録（Step 4） ═══
    if (auth.plan !== 'free') {
      usageResult = await recordTurnUsage(env, auth.userId, auth.plan);
      console.log(`[TURN] user=${auth.userId} plan=${auth.plan} turns=${usageResult.turns_used} amount=¥${usageResult.current_amount}`);

      // ═══ キャップ判定（Step 5） ═══
      if (usageResult.should_degrade) {
        const degraded = getDegradedModels(auth.plan);
        if (degraded) { // Ultra は null → 降格しない
          effectiveModels = degraded;
          isDegraded = true;
          degradeReason = 'cap';
        }
      }
    }

    // ═══ フェアユース判定（Step 5） ═══
    if (!isDegraded) {
      const fairUse = await checkFairUseV2(env, auth.userId, auth.plan);
      if (fairUse.degraded) {
        const degraded = getDegradedModels(auth.plan);
        if (degraded) {
          effectiveModels = degraded;
          isDegraded = true;
          degradeReason = fairUse.reason;
        }
      }
    }
  }
```

### 2-4. ルーティング後のモデル選択に effectiveModels を反映

handleChatStream 内の非Claude ルート（L135付近）を変更:

```javascript
  // 旧:
  if (finalRoute === 'gemini') {
    routeResponse = await handleGeminiChat(env, enhancedSystem, compressedMessages, auth, userLocation);
  } else if (finalRoute === 'gpt') {
    routeResponse = await handleGPTChat(env, enhancedSystem, compressedMessages, auth, maxTokens);
  } else if (finalRoute === 'gpt-simple') {
    routeResponse = await handleGPTSimpleChat(env, enhancedSystem, compressedMessages, auth);
  }

  // 新（overrideModels パススルー）:
  if (finalRoute === 'gemini') {
    routeResponse = await handleGeminiChat(env, enhancedSystem, compressedMessages, auth, userLocation, effectiveModels);
  } else if (finalRoute === 'gpt') {
    routeResponse = await handleGPTChat(env, enhancedSystem, compressedMessages, auth, maxTokens, effectiveModels);
  } else if (finalRoute === 'gpt-simple') {
    routeResponse = await handleGPTSimpleChat(env, enhancedSystem, compressedMessages, auth, effectiveModels);
  }
```

Claude ルート（L164付近）のモデル選択も変更:
```javascript
  // 旧:
  const claudeModel = getModel(auth.plan, 'claude');
  // 新:
  const claudeModel = getModel(auth.plan, 'claude', effectiveModels);
```

effectiveMaxTokens のプラン判定も修正:
```javascript
  // 旧:
  const effectiveMaxTokens = Math.min(maxTokens, auth.plan === 'premium' ? 4000 : 2000);
  // 新（premiumは廃止済み。max/ultraで4000）:
  const effectiveMaxTokens = Math.min(maxTokens, ['max', 'ultra'].includes(auth.plan) ? 4000 : 2000);
```

### 2-5. SSEストリーム完了後にメタデータ送信

handleChatStream の `return new Response(res.body, ...)` の**直前**に、TransformStreamでメタデータを注入:

**ただしこれはSSEストリーム処理の大改造になるため、Step 5 では console.log + レスポンスヘッダーのみで対応する。TransformStream版はStep 7（フロントエンド）と同時に実装。**

```javascript
  // レスポンスヘッダーに降格情報を付与（Step 5）
  const responseHeaders = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Model-Used': claudeModel,
    'X-Model-Degraded': isDegraded ? '1' : '0',
    'X-Degrade-Reason': degradeReason || '',
  };
  if (usageResult && usageResult.current_amount > 0) {
    const config = getPlanConfig(auth.plan);
    responseHeaders['X-Usage-Amount'] = String(usageResult.current_amount);
    responseHeaders['X-Usage-Cap'] = String(config.cap);
    responseHeaders['X-Usage-Percent'] = String(Math.round((usageResult.current_amount / config.cap) * 100));
  }

  return new Response(res.body, { status: 200, headers: responseHeaders });
```

**既存の `return new Response(res.body, { status: 200, headers: { ... } })` をこれに置換。**

---

## Phase 3: Step 5 デプロイ前レビュー

```bash
git diff --stat > instructions/results/step5_diff_stat.txt
git diff src/ > instructions/results/step5_diff_full.txt

echo "=== Step 5 Grep Check ===" > instructions/results/step5_grep.txt
# 新規追加
grep -c "getDegradedModels\|effectiveModels" src/routes/chat.js >> instructions/results/step5_grep.txt  # 2以上
grep -c "checkFairUseV2\|fair_use_5h\|fair_use_weekly" src/routes/chat.js >> instructions/results/step5_grep.txt  # 2以上
grep -c "getWeekStartUTC" src/routes/chat.js >> instructions/results/step5_grep.txt  # 1以上
grep -c "X-Model-Degraded\|X-Degrade-Reason" src/routes/chat.js >> instructions/results/step5_grep.txt  # 1以上
grep -c "overrideModels" src/services/ai/gpt.js >> instructions/results/step5_grep.txt  # 2以上
grep -c "overrideModels" src/services/ai/gemini.js >> instructions/results/step5_grep.txt  # 1以上
# Step 4 保全
grep -c "recordTurnUsage\|maybeSendUsageRecord" src/routes/chat.js >> instructions/results/step5_grep.txt  # 4以上
grep -c "PLAN_CONFIG\|getPlanConfig" src/utils/constants.js >> instructions/results/step5_grep.txt  # 2以上
# 既存保全
grep -c "handleChatStream\|buildServerSystemPrompt" src/routes/chat.js >> instructions/results/step5_grep.txt  # 2以上
grep -c "quickRoute\|callRoutingAPI" src/routes/chat.js >> instructions/results/step5_grep.txt  # 2以上
grep -c "MEMO_ENABLED\|RAG_ENABLED\|CACHE_ENABLED" src/routes/chat.js >> instructions/results/step5_grep.txt  # 3以上
# 旧フェアユース削除確認
echo "--- old checkFairUse should be removed from chat.js ---" >> instructions/results/step5_grep.txt
grep -c "checkFairUse[^V]" src/routes/chat.js >> instructions/results/step5_grep.txt
# → 0 であること（checkFairUseV2 は残る）

echo "=== Grep DONE ===" >> instructions/results/step5_grep.txt
cat instructions/results/step5_grep.txt
```

---

## Phase 4: Step 5 デプロイ + テスト

```bash
wrangler deploy
curl -s https://goal-ai-worker.goalai-futoshi.workers.dev/api/version | jq .
# → version: "3.9.3" のまま（constants.js未変更なので同じ。変える必要なし）

# キャノピーテスト（canopy.shは Step 4 で作成済み）
bash tests/smoke/canopy.sh 2>&1 | tee instructions/results/step5_smoke.txt

# Step 5 固有の追加grep
echo "--- Step 5 specific ---" >> instructions/results/step5_smoke.txt
for pattern in "getDegradedModels" "checkFairUseV2" "effectiveModels" "X-Model-Degraded"; do
  COUNT=$(grep -rc "$pattern" src/ 2>/dev/null | awk -F: '{s+=$2}END{print s}')
  echo "  $pattern: $COUNT refs" >> instructions/results/step5_smoke.txt
done
```

**FAIL → wrangler rollback → git checkout step4-complete → 停止。**

```bash
git add -A
git commit -m "Step 5: cap + fair use + model degradation (STEP5-EXEC)"
git tag step5-complete
```

session_progress.md に Step 5 完了を追記。CLAUDE.md のチェーン表で Step 5 を ⬜→✅ に更新。

**⚠ Step 6 に進む前に、Step 5 の結果をsession_progress.mdに必ず記録してから進むこと。**

---

# ═══════ STEP 6: API + Webhook ═══════

## Phase 5: /api/plan/status エンドポイント

### 新規ファイル: src/routes/plan.js

```javascript
import { authenticateRequest } from '../middleware/auth.js';
import { jsonRes } from '../utils/helpers.js';
import { getPlanConfig, getCurrentMonth } from '../utils/constants.js';

export async function handlePlanStatus(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const config = getPlanConfig(auth.plan);
  const month = getCurrentMonth();
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_KEY;

  let usage = { turns_used: 0, current_amount: 0, cap_reached: false };
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/usage_tracking?user_id=eq.${auth.userId}&month=eq.${month}&select=turns_used,current_amount,cap_reached`,
      { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
    );
    const data = await res.json();
    if (data?.[0]) usage = data[0];
  } catch (e) { console.error('Plan status fetch error:', e.message); }

  const percent = config.cap > 0 ? Math.round((usage.current_amount / config.cap) * 100) : 0;

  return jsonRes({
    plan: auth.plan,
    display_name: config.display_name,
    turns_used: usage.turns_used,
    current_amount: usage.current_amount,
    cap: config.cap,
    per_turn: config.per_turn,
    percent: Math.min(percent, 100),
    is_capped: usage.cap_reached || false,
    models: config.models,
    fair_use: config.fair_use,
    deep_monthly: config.deep_monthly === Infinity ? null : config.deep_monthly,
    ai_memo: config.ai_memo
  });
}
```

### src/index.js にルート追加

import追加:
```javascript
import { handlePlanStatus } from './routes/plan.js';
```

ルート追加（// ── Usage ── セクションの近くに）:
```javascript
app.get('/api/plan/status', async (c) => withCors(c, await handlePlanStatus(c.req.raw, c.env)));
```

---

## Phase 6: checkout.js metered subscription 対応

handleCheckoutCreate を書き換え。fixed + metered の2ラインアイテムで Checkout Session を作成。

```javascript
export async function handleCheckoutCreate(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const body = await request.json();
  const { plan, billing_period } = body; // billing_period: 'monthly' | 'annual'
  const isAnnual = billing_period === 'annual';

  // プラン名バリデーション
  const validPlans = ['light', 'pro', 'max', 'ultra'];
  if (!validPlans.includes(plan)) {
    return jsonRes({ error: '無効なプランです。light, pro, max, ultra のいずれかを指定してください' }, 400);
  }

  const fixedPriceId = isAnnual ? STRIPE_PRICE_IDS[`${plan}_annual`] : STRIPE_PRICE_IDS[plan];
  if (!fixedPriceId) return jsonRes({ error: 'Price not found' }, 400);

  const params = new URLSearchParams();
  params.append('mode', 'subscription');

  // Line item 1: fixed price（基本料金）
  params.append('line_items[0][price]', fixedPriceId);
  params.append('line_items[0][quantity]', '1');

  // Line item 2: metered price（従量課金）— Ultra以外
  const meteredPriceId = STRIPE_PRICE_IDS[`${plan}_metered`];
  if (meteredPriceId) {
    params.append('line_items[1][price]', meteredPriceId);
    // metered は quantity 不要（usage_record で送信）
  }

  params.append('success_url', STRIPE_SUCCESS_URL);
  params.append('cancel_url', STRIPE_CANCEL_URL);
  params.append('metadata[tokenId]', auth.tokenId);
  params.append('metadata[plan]', plan);
  params.append('metadata[billing_period]', isAnnual ? 'annual' : 'monthly');

  // トライアル: Light/Pro のみ14日間（カード必須）
  if (['light', 'pro'].includes(plan) && !isAnnual) {
    params.append('subscription_data[trial_period_days]', '14');
  }

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  const session = await res.json();
  if (!res.ok) { console.error('Stripe Checkout error:', session); return jsonRes({ error: session.error?.message || 'Stripe error' }, res.status); }
  return jsonRes({ url: session.url, sessionId: session.id });
}
```

---

## Phase 7: Webhook 拡張

handleStripeWebhook 内に以下のイベントハンドラを追加:

### checkout.session.completed の拡張（metered subscription item ID を保存）

既存の `checkout.session.completed` ハンドラ内、`tokenData.plan = plan;` の後に追加:

```javascript
    // metered subscription item ID を取得して保存（Step 6）
    if (session.subscription) {
      try {
        const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${session.subscription}`, {
          headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` }
        });
        const sub = await subRes.json();
        const meteredItem = sub.items?.data?.find(item => item.price?.recurring?.usage_type === 'metered');
        if (meteredItem) {
          // Supabase に metered item ID を保存
          await fetch(`${env.SUPABASE_URL}/rest/v1/users?token_id=eq.${tokenId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'apikey': env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'Prefer': 'return=minimal' },
            body: JSON.stringify({ stripe_metered_subscription_item_id: meteredItem.id })
          });
          console.log(`Webhook: saved metered item ${meteredItem.id} for ${tokenId}`);
        }
      } catch (e) { console.error('Webhook: failed to save metered item ID:', e.message); }
    }
```

### invoice.paid ハンドラ追加（月初リセット）

```javascript
  if (event.type === 'invoice.paid') {
    const invoice = event.data.object;
    const customerId = invoice.customer;
    const tokenId = await env.TOKEN_KV.get(`stripe_customer:${customerId}`);
    if (tokenId) {
      // usage_tracking の月次リセットはcurrent_monthが変わると自動的に新行が作られるので
      // ここでは明示的なリセットは不要。ログのみ。
      console.log(`Webhook: invoice.paid for ${tokenId}, amount: ${invoice.amount_paid}`);
    }
  }
```

### customer.subscription.updated ハンドラ追加（プラン変更）

```javascript
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    const customerId = subscription.customer;
    const tokenId = await env.TOKEN_KV.get(`stripe_customer:${customerId}`);
    if (tokenId) {
      // 新プランを metadata から取得（Checkout 時に設定済み）
      const newPlan = subscription.metadata?.plan;
      if (newPlan) {
        const tokenData = await env.TOKEN_KV.get(`token:${tokenId}`, 'json');
        if (tokenData && tokenData.plan !== newPlan) {
          tokenData.plan = newPlan;
          tokenData.paidPlan = newPlan;
          await env.TOKEN_KV.put(`token:${tokenId}`, JSON.stringify(tokenData));
          try {
            await fetch(`${env.SUPABASE_URL}/rest/v1/users?token_id=eq.${tokenId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'apikey': env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'Prefer': 'return=minimal' },
              body: JSON.stringify({ plan: newPlan, plan_updated_at: new Date().toISOString() })
            });
          } catch (e) {}
          console.log(`Webhook: plan changed to ${newPlan} for ${tokenId}`);
        }
      }
    }
  }
```

---

## Phase 8: Step 6 デプロイ前レビュー

```bash
git diff --stat > instructions/results/step6_diff_stat.txt
git diff src/ > instructions/results/step6_diff_full.txt

echo "=== Step 6 Grep Check ===" > instructions/results/step6_grep.txt
# 新規
grep -c "handlePlanStatus" src/routes/plan.js >> instructions/results/step6_grep.txt  # 1以上
grep -c "plan/status" src/index.js >> instructions/results/step6_grep.txt  # 1以上
grep -c "metered\|usage_type" src/routes/checkout.js >> instructions/results/step6_grep.txt  # 1以上
grep -c "invoice.paid\|subscription.updated" src/routes/checkout.js >> instructions/results/step6_grep.txt  # 2以上
grep -c "stripe_metered_subscription_item_id" src/routes/checkout.js >> instructions/results/step6_grep.txt  # 1以上
grep -c "trial_period_days" src/routes/checkout.js >> instructions/results/step6_grep.txt  # 1以上
# Step 5 保全
grep -c "getDegradedModels\|checkFairUseV2\|effectiveModels" src/routes/chat.js >> instructions/results/step6_grep.txt  # 3以上
# Step 4 保全
grep -c "recordTurnUsage\|maybeSendUsageRecord" src/routes/chat.js >> instructions/results/step6_grep.txt  # 4以上
# 既存保全
grep -c "handleChatStream\|buildServerSystemPrompt" src/routes/chat.js >> instructions/results/step6_grep.txt  # 2以上
grep -c "quickRoute\|callRoutingAPI" src/routes/chat.js >> instructions/results/step6_grep.txt  # 2以上

echo "=== Grep DONE ===" >> instructions/results/step6_grep.txt
cat instructions/results/step6_grep.txt
```

---

## Phase 9: Step 6 デプロイ + テスト

```bash
wrangler deploy

# /api/plan/status エンドポイントのテスト
curl -s https://goal-ai-worker.goalai-futoshi.workers.dev/api/plan/status \
  -H "Authorization: Bearer TEST_TOKEN" | jq .
# → plan, turns_used, current_amount, cap, percent が返ること

# キャノピーテスト
bash tests/smoke/canopy.sh 2>&1 | tee instructions/results/step6_smoke.txt

# Step 6 固有grep
echo "--- Step 6 specific ---" >> instructions/results/step6_smoke.txt
for pattern in "handlePlanStatus" "invoice.paid" "subscription.updated" "trial_period_days" "stripe_metered_subscription_item_id"; do
  COUNT=$(grep -rc "$pattern" src/ 2>/dev/null | awk -F: '{s+=$2}END{print s}')
  echo "  $pattern: $COUNT refs" >> instructions/results/step6_smoke.txt
done
```

**FAIL → wrangler rollback → git checkout step5-complete → 停止。**

```bash
git add -A
git commit -m "Step 6: API plan/status + webhook expansion (STEP6-EXEC)"
git tag step6-complete
```

session_progress.md に Step 5+6 完了を追記。CLAUDE.md のチェーン表で Step 5, 6 を ⬜→✅ に更新。

---

## ロールバック手順

```bash
# Step 6 でFAIL → Step 5 完了時点に戻す
wrangler rollback
git checkout step5-complete

# Step 5 でFAIL → Step 4 完了時点に戻す
wrangler rollback
git checkout step4-complete
```

---

## 🔴 承認チェックポイント（ふとし確認用）

### Step 5
1. キャップ到達時にモデルが降格される（X-Model-Degraded: 1）
2. キャップ未到達時は通常モデル（X-Model-Degraded: 0）
3. Ultraプランは降格しない
4. design/feedback はキャップ・フェアユース対象外
5. 旧KVフェアユースが削除されている
6. gpt.js / gemini.js で overrideModels が動作する

### Step 6
7. `/api/plan/status` が正しいデータを返す
8. Checkout で fixed + metered の2ラインアイテムが送られる
9. Light/Pro に14日間トライアルが設定される
10. Webhook: checkout.session.completed で metered item ID が保存される
11. canopy.sh 全PASS

**承認後、Step 7（STRIPE-005-FRONTEND）に進む。**

---

## ⚠ 結果レポート規約（全Phase共通）

**Codeは各Phase完了時に、自分で results/ のファイルを読み、session_progress.md に以下のフォーマットでサマリーを書くこと。**

```markdown
## Step N 結果レポート

### 判定: ✅ PASS / ❌ FAIL

### プリフライト
- 結果: PASS/FAIL
- 問題点: （あれば）

### 変更サマリー
- 変更ファイル数: N
- 追加行数: +N / 削除行数: -N
- 主な変更: （箇条書き3行以内）

### grep保全
- 新規項目: N/N PASS
- 既存保全: N/N PASS
- FAIL項目: （あれば具体的に）

### キャノピーテスト
- 結果: PASS/FAIL
- FAIL項目: （あれば具体的に）

### デプロイ
- バージョン: 3.9.x
- /api/version 応答: OK/NG

### git
- コミット: （ハッシュ7桁）
- タグ: stepN-complete

### 提案ログ
- [ ] （Codeが気づいた改善点）
```

**Claude.ai は session_progress.md のこのセクションだけ読めば判断できる。results/ の個別ファイルは詳細確認時のみ参照。**
