# Step 4: constants.js v6.3更新 + ターン記録
> INSTRUCTION_ID: STEP4-EXEC
> REQUIRES_VERSION: v3.9.2（Step 0〜3 完了済み）
> リスクレベル: 🔴高（constants.js全面書き換え + chat.js変更 + Stripe API連携）
> 参照: stripe_002_turn_record.md + stripe_amendment_001.md + stripe_amendment_002.md
> 追加ルール: development_rules.md の C1〜C7 を遵守

---

## ⚠ 鉄則

1. **指示書にない変更は一切加えない**。改善案はsession_progress.md「## 提案ログ」に記録のみ
2. **token_id → user_id 読み替え**: DB操作は全て `user_id` (UUID)。Worker側の `auth.userId` を使用
3. **free_no_count の保護**: design/feedbackコンテキストではターン記録しない
4. **既存のKVベース日次制限は残す**: Freeプランの20回/日はKVで引き続き管理
5. **checkout.js の metered subscription 対応は Step 6 に回す**: ここではプラン名バリデーションのみ更新
6. **グローバルルール**: 以降の全ステップで、指示書中の `token_id` は `auth.userId`（UUID）に読み替えること。CLAUDE.md にもこのルールを追記すること

---

## Phase 0: プリフライトチェック

以下を全て実行し、結果を `instructions/results/step4_preflight.txt` に保存。
**1つでもFAILなら実装に入らず停止。session_progress.mdにエラー記録。**

```bash
echo "=== Step 4 Preflight ===" > instructions/results/step4_preflight.txt

# 1. 旧プラン名の参照箇所を特定（変更対象の把握）
echo "--- grep: premium references ---" >> instructions/results/step4_preflight.txt
grep -rn "premium" src/utils/constants.js src/routes/checkout.js >> instructions/results/step4_preflight.txt 2>&1
echo "CHECK: 上記が存在する = 旧構成が残っている = 更新対象" >> instructions/results/step4_preflight.txt

# 2. increment_turn_usage RPC はStep 3で作成済み。引数名を確認
echo "--- DB RPC check ---" >> instructions/results/step4_preflight.txt
echo "CHECK: session_progress.md の Step 3 結果を確認。RPCの引数名 p_user_id を確認" >> instructions/results/step4_preflight.txt

# 3. 環境変数の確認
echo "--- env check ---" >> instructions/results/step4_preflight.txt
grep -c "STRIPE_SECRET_KEY" wrangler.toml >> instructions/results/step4_preflight.txt 2>&1 || echo "wrangler.toml にない（secretsで管理=OK）" >> instructions/results/step4_preflight.txt

# 4. 現在のファイル構造確認
echo "--- file structure ---" >> instructions/results/step4_preflight.txt
wc -l src/utils/constants.js src/utils/rate-limit.js src/routes/chat.js src/routes/checkout.js >> instructions/results/step4_preflight.txt

# 5. getModel の現在の使用箇所（Step 5 準備のため把握）
echo "--- getModel usage ---" >> instructions/results/step4_preflight.txt
grep -rn "getModel(" src/ >> instructions/results/step4_preflight.txt

# 6. auth.userId vs auth.tokenId の使い分け確認
echo "--- auth.userId vs auth.tokenId ---" >> instructions/results/step4_preflight.txt
grep -n "auth\.userId\|auth\.tokenId" src/routes/chat.js >> instructions/results/step4_preflight.txt

echo "=== Preflight DONE ===" >> instructions/results/step4_preflight.txt
cat instructions/results/step4_preflight.txt
```

全てのCHECK項目に問題がないことを確認してから Phase 1 に進む。

---

## Phase 1: src/utils/constants.js 全面更新

**方針:** PLAN_CONFIG を Single Source of Truth にする。PLAN_MODELS と PLAN_LIMITS は PLAN_CONFIG から自動導出。既存の `getModel(plan, provider)` シグネチャは維持しつつ、Step 5 用の `overrideModels` 引数を追加。

src/utils/constants.js を**全体書き換え**する。以下の内容で置換:

```javascript
// ═══════ PLAN_CONFIG — Single Source of Truth (v6.3) ═══════

export const PLAN_CONFIG = {
  free: {
    display_name: 'Free', price_fixed: 0, per_turn: 0, cap: 0, daily_limit: 20,
    deep_monthly: 3, ai_memo: false, context_multiplier: 1.0, fallback_model: 'gpt-5-nano',
    models: { claude: 'claude-sonnet-4-20250514', openai: 'gpt-5-mini', gemini: 'gemini-2.5-flash', router: 'gpt-5-mini' },
    fair_use: { h5_limit: 10, weekly_limit: 140 }
  },
  light: {
    display_name: 'Light', price_fixed: 500, per_turn: 8, cap: 980, daily_limit: null,
    deep_monthly: 5, ai_memo: false, context_multiplier: 1.0, fallback_model: 'gpt-5-nano',
    models: { claude: 'claude-sonnet-4-20250514', openai: 'gpt-5-mini', gemini: 'gemini-2.5-flash', router: 'gpt-5-mini' },
    fair_use: { h5_limit: 50, weekly_limit: 200 }
  },
  pro: {
    display_name: 'Pro', price_fixed: 1500, per_turn: 20, cap: 2980, daily_limit: null,
    deep_monthly: 30, ai_memo: true, context_multiplier: 1.0, fallback_model: 'gpt-5-nano',
    models: { claude: 'claude-sonnet-4-20250514', openai: 'gpt-5', gemini: 'gemini-2.5-flash', router: 'gpt-5-mini' },
    fair_use: { h5_limit: 80, weekly_limit: 500 }
  },
  max: {
    display_name: 'Max', price_fixed: 1500, per_turn: 10, cap: 9800, daily_limit: null,
    deep_monthly: Infinity, ai_memo: true, context_multiplier: 1.0, fallback_model: 'gpt-5-mini',
    models: { claude: 'claude-opus-4-20250514', openai: 'gpt-5', gemini: 'gemini-2.5-pro', router: 'gpt-5-mini' },
    fair_use: { h5_limit: 200, weekly_limit: 1500 }
  },
  ultra: {
    display_name: 'Ultra', price_fixed: 20000, per_turn: 0, cap: 0, daily_limit: null,
    deep_monthly: Infinity, ai_memo: true, context_multiplier: 2.0, fallback_model: null,
    et_weekly_limit: 140, priority_queue: true,
    models: { claude: 'claude-opus-4-20250514', openai: 'gpt-5', gemini: 'gemini-2.5-pro', router: 'gpt-5-mini' },
    fair_use: { h5_limit: 200, weekly_limit: 1500 }
  }
};

// ═══════ 導出定数（後方互換） ═══════
export const PLAN_LIMITS = Object.fromEntries(
  Object.entries(PLAN_CONFIG).map(([key, cfg]) => [key, {
    deep: cfg.deep_monthly === Infinity ? 99999 : cfg.deep_monthly,
    chat: cfg.daily_limit || 9999, chatPer: 'day'
  }])
);

export const PLAN_MODELS = Object.fromEntries(
  Object.entries(PLAN_CONFIG).map(([key, cfg]) => [key, cfg.models])
);
PLAN_MODELS._default = PLAN_CONFIG.free.models;

// ═══════ getModel（Step 5 準備: overrideModels 引数追加） ═══════
export function getModel(plan, provider, overrideModels) {
  if (overrideModels) return overrideModels[provider] || PLAN_MODELS._default[provider];
  const models = PLAN_MODELS[plan] || PLAN_MODELS._default;
  return models[provider];
}

export function getPlanConfig(plan) {
  return PLAN_CONFIG[plan] || PLAN_CONFIG.free;
}

export const FAIR_USE = { hourly: 30, daily: 100, delayMs: 7000 };
export const FREE_MODEL_LIMITS = { claude: 5, gemini: 5, gpt: 10 };

export const PROMO_CODES = {
  'LAUNCH30':   { plan: 'pro', days: 30,  desc: 'Pro 30日間無料（ローンチ記念）' },
  'INVITE2026': { plan: 'pro', days: 14,  desc: 'Pro 14日間無料（招待コード）' },
  'BETA3MONTH': { plan: 'pro', days: 90,  desc: 'Pro 90日間無料（ベータ感謝）' },
  'GOALPRO7':   { plan: 'pro', days: 7,   desc: 'Pro 7日間無料体験' },
};

export const TESTER_CODES = {
  TESTER01: { plan: 'max', max_uses: 5 },
  TESTER02: { plan: 'pro', max_uses: 5 },
  TESTER03: { plan: 'pro', max_uses: 10 },
  TESTER04: { plan: 'pro', max_uses: 10 },
  TESTER05: { plan: 'pro', max_uses: 10 },
};
export const TESTER_TOTAL_LIMIT = 50;
export const TESTER_DURATION_HOURS = 72;
export const RATE_LIMIT_WINDOW = 60;
export const RATE_LIMIT_MAX = 30;

export const STRIPE_PRICE_IDS = {
  light: 'price_1TCzZj4084X0uakahTbAwTYK', light_metered: 'price_1TCzsw4084X0uakajD8aUGIm', light_annual: 'price_1TCztW4084X0uakaqwlf41QK',
  pro: 'price_1TCzv64084X0uakaeTSyND0a', pro_metered: 'price_1TCzwJ4084X0uakapKKWw6nV', pro_annual: 'price_1TCzwo4084X0uakatfRAkNFr',
  max: 'price_1TCzz44084X0uakaYnrDA4vv', max_metered: 'price_1TCzzk4084X0uakaiQmUneA7', max_annual: 'price_1TD0094084X0uaka1yAJuPoz',
  ultra: 'price_1TD03i4084X0uakalPdCgNCJ', ultra_annual: 'price_1TD0414084X0uakaVSJtVFrd',
  addon_50: 'price_1TD3QJ4084X0uakaOlOzERwV', addon_120: 'price_1TD3QK4084X0uakauP63gUOn',
};
export const STRIPE_SUCCESS_URL = 'https://goal-ai-frontend.pages.dev?checkout=success';
export const STRIPE_CANCEL_URL  = 'https://goal-ai-frontend.pages.dev?checkout=cancel';

export const USAGE_BATCH_SIZE = 1; // ローンチ直前に5に変更
export function getCurrentMonth() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, '0')}`;
}

export const APP_VERSION = '3.9.3';
export const COMMON_RULES = `【共通ルール】
- ユーザーの質問にはまず答える。質問を聞き返す前にまず回答する。
- 2〜3文で簡潔に。長文禁止。質問は1回まで。
- ユーザーの質問を無視してゴール設定に誘導することを禁止。
- 同じ内容の繰り返し禁止。`;
```

**確認ポイント:** TESTER01=max、旧プラン名なし、PLAN_LIMITS/MODELS自動導出、getModel+overrideModels、APP_VERSION=3.9.3

---

## Phase 2: rate-limit.js は変更不要（既存動作を維持）

grepで旧プラン名が残っていないことのみ確認:
```bash
grep -n "premium\|max_annual\|premium_annual" src/utils/rate-limit.js
# → 0件であること
```

---

## Phase 3: src/routes/chat.js にターン記録追加

### 3-1. import 追加
ファイル冒頭に追加:
```javascript
import { getPlanConfig, getCurrentMonth, USAGE_BATCH_SIZE } from '../utils/constants.js';
```

### 3-2. recordTurnUsage + maybeSendUsageRecord を chat.js 末尾に追加

```javascript
// ═══════ ターン記録 + Stripe従量課金（STEP4-EXEC） ═══════
async function recordTurnUsage(env, userId, plan) {
  const config = getPlanConfig(plan);
  if (config.per_turn === 0) {
    return { current_amount: 0, turns_used: 0, cap_reached: false, is_capped: false, should_degrade: false };
  }
  const month = getCurrentMonth();
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_KEY;
  let result;
  try {
    const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/increment_turn_usage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` },
      body: JSON.stringify({ p_user_id: userId, p_month: month, p_per_turn: config.per_turn, p_cap: config.cap })
    });
    if (!rpcRes.ok) { console.error('increment_turn_usage RPC failed:', await rpcRes.text()); return { current_amount: 0, turns_used: 0, cap_reached: false, is_capped: false, should_degrade: false }; }
    const rpcData = await rpcRes.json();
    result = Array.isArray(rpcData) ? rpcData[0] : rpcData;
  } catch (e) { console.error('recordTurnUsage error:', e.message); return { current_amount: 0, turns_used: 0, cap_reached: false, is_capped: false, should_degrade: false }; }
  const { turns_used, current_amount, cap_reached, is_capped } = result || {};
  if (!is_capped) await maybeSendUsageRecord(env, userId, turns_used || 0, plan);
  return { current_amount: current_amount || 0, turns_used: turns_used || 0, cap_reached: cap_reached || is_capped || false, is_capped: is_capped || false, should_degrade: cap_reached || is_capped || false };
}

async function maybeSendUsageRecord(env, userId, turnsUsed, plan) {
  const config = getPlanConfig(plan);
  if (config.per_turn === 0) return;
  const month = getCurrentMonth();
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_KEY;
  let synced = 0;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/usage_tracking?user_id=eq.${userId}&month=eq.${month}&select=stripe_usage_synced`, { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } });
    const data = await res.json();
    synced = data?.[0]?.stripe_usage_synced || 0;
  } catch (e) { console.error('Failed to get stripe_usage_synced:', e.message); return; }
  const unsent = turnsUsed - synced;
  if (unsent < USAGE_BATCH_SIZE) return;
  let meteredItemId;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/users?user_id=eq.${userId}&select=stripe_metered_subscription_item_id`, { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } });
    const data = await res.json();
    meteredItemId = data?.[0]?.stripe_metered_subscription_item_id;
  } catch (e) { console.error('Failed to get metered item ID:', e.message); return; }
  if (!meteredItemId) return; // テスター等はスキップ
  try {
    const response = await fetch(`https://api.stripe.com/v1/subscription_items/${meteredItemId}/usage_records`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `quantity=${unsent}&action=increment&timestamp=${Math.floor(Date.now() / 1000)}`
    });
    if (response.ok) {
      await fetch(`${supabaseUrl}/rest/v1/usage_tracking?user_id=eq.${userId}&month=eq.${month}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ stripe_usage_synced: turnsUsed })
      });
    } else { console.error('Stripe usage_record failed:', await response.json()); }
  } catch (e) { console.error('Stripe usage_record error:', e.message); }
}
```

### 3-3. handleChatStream の `if (!free_no_count)` ブロック内に追加

`await incrementDailyChatUsage(env, auth.userId);` の直後に:
```javascript
    // ═══ ターン記録 + 従量課金（STEP4-EXEC） ═══
    if (auth.plan !== 'free') {
      const usageResult = await recordTurnUsage(env, auth.userId, auth.plan);
      console.log(`[TURN] user=${auth.userId} plan=${auth.plan} turns=${usageResult.turns_used} amount=¥${usageResult.current_amount}`);
    }
```

---

## Phase 3b: checkout.js プラン名バリデーション更新

1. エラーメッセージ: `'pro, premium, max...'` → `'light, pro, max, ultra'`
2. クーポン適用ロジック: コメントアウト（`// TODO: Step 6 でクーポン・従量課金対応`）
3. `premium` への参照を削除（portal, webhookは変更しない）

---

## Phase 3c: APP_VERSION 3.9.3 更新（globals.js, sw.js, index.html）

```bash
grep -rn "3\.9\.\(1\|2\)" frontend/js/globals.js frontend/sw.js frontend/index.html src/utils/constants.js
```
全箇所を 3.9.3 に更新。

---

## Phase 4: デプロイ前レビュー

```bash
git diff --stat > instructions/results/step4_diff_stat.txt
git diff src/ > instructions/results/step4_diff_full.txt
git diff frontend/ >> instructions/results/step4_diff_full.txt
echo "" >> instructions/session_progress.md
echo "### Step 4 変更サマリー" >> instructions/session_progress.md
git diff --stat >> instructions/session_progress.md

# grep保全チェック
echo "=== Step 4 Grep Check ===" > instructions/results/step4_grep.txt
grep -c "PLAN_CONFIG\|getPlanConfig" src/utils/constants.js >> instructions/results/step4_grep.txt  # 2以上
grep -c "USAGE_BATCH_SIZE" src/utils/constants.js >> instructions/results/step4_grep.txt  # 1以上
grep -c "recordTurnUsage" src/routes/chat.js >> instructions/results/step4_grep.txt  # 2以上
grep -c "maybeSendUsageRecord" src/routes/chat.js >> instructions/results/step4_grep.txt  # 2以上
grep -c "getCurrentMonth" src/utils/constants.js >> instructions/results/step4_grep.txt  # 1以上
grep -c "increment_turn_usage" src/routes/chat.js >> instructions/results/step4_grep.txt  # 1以上
grep -c "handleChatStream\|buildServerSystemPrompt" src/routes/chat.js >> instructions/results/step4_grep.txt  # 2以上
grep -c "quickRoute\|callRoutingAPI" src/routes/chat.js >> instructions/results/step4_grep.txt  # 2以上
grep -c "MEMO_ENABLED\|RAG_ENABLED\|CACHE_ENABLED" src/routes/chat.js >> instructions/results/step4_grep.txt  # 3以上
grep -rn "premium\|premium_annual\|max_annual" src/utils/constants.js >> instructions/results/step4_grep.txt  # 0件
echo "=== Grep DONE ===" >> instructions/results/step4_grep.txt
cat instructions/results/step4_grep.txt
```

**1つでもFAILならデプロイしない。**

---

## Phase 5: デプロイ + テスト

```bash
wrangler deploy
curl -s https://goal-ai-worker.goalai-futoshi.workers.dev/api/version | jq .
# → version: "3.9.3"

bash tests/smoke/test_001_schema.sh 2>&1 | tee instructions/results/step4_smoke.txt
```

### canopy.sh を tests/smoke/ に新規作成して実行（内容は別ファイル参照 or 指示書冒頭Phase 0参考）

```bash
chmod +x tests/smoke/canopy.sh
bash tests/smoke/canopy.sh 2>&1 | tee -a instructions/results/step4_smoke.txt
```

**キャノピーFAILなら即 `wrangler rollback` → 結果記録 → 停止。**

---

## Phase 6: 完了処理

```bash
git add -A
git commit -m "Step 4: constants.js v6.3 + turn recording (STEP4-EXEC)"
git tag step4-complete
```

session_progress.md に Step 4 完了を追記。CLAUDE.md の実行チェーン表で Step 4 を ⬜→✅ に更新。

---

## ロールバック手順

```bash
wrangler rollback
git checkout step3-complete
```

---

## 🔴 承認チェックポイント（ふとし確認用）

1. `/api/version` が 3.9.3 を返す
2. 有料プランでチャット送信 → Supabase `usage_tracking` の `turns_used` が増加
3. `current_amount` が `per_turn × turns_used` と一致
4. Freeプランでは `usage_tracking` が更新されない
5. design/feedbackではターン記録されない
6. 既存チャット機能（ルーティング・ストリーミング・メモ・RAG）が正常動作
7. canopy.sh が全PASS

**承認後、Step 5（STRIPE-003-CAP-FAIRUSE）に進む。**
