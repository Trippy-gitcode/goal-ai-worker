// ═══════ PLAN_CONFIG — Single Source of Truth (v6.3) ═══════

export const PLAN_CONFIG = {
  free: {
    display_name: 'Free', price_fixed: 0, per_turn: 0, cap: 0, daily_limit: 20,
    deep_monthly: 3, ai_memo: false, context_multiplier: 1.0, fallback_model: 'gpt-5-nano',
    models: { claude: 'claude-sonnet-4-20250514', openai: 'gpt-5-mini', gemini: 'gemini-3-flash-preview', router: 'gpt-5-mini' },
    fair_use: { h5_limit: 10, weekly_limit: 140 }
  },
  light: {
    display_name: 'Light', price_fixed: 500, per_turn: 8, cap: 980, daily_limit: null,
    deep_monthly: 5, ai_memo: false, context_multiplier: 1.0, fallback_model: 'gpt-5-nano',
    models: { claude: 'claude-sonnet-4-20250514', openai: 'gpt-5-mini', gemini: 'gemini-3-flash-preview', router: 'gpt-5-mini' },
    fair_use: { h5_limit: 50, weekly_limit: 200 }
  },
  pro: {
    display_name: 'Pro', price_fixed: 1500, per_turn: 20, cap: 2980, daily_limit: null,
    deep_monthly: 30, ai_memo: true, context_multiplier: 1.0, fallback_model: 'gpt-5-nano',
    models: { claude: 'claude-sonnet-4-20250514', openai: 'gpt-5', gemini: 'gemini-3-flash-preview', router: 'gpt-5-mini' },
    fair_use: { h5_limit: 80, weekly_limit: 500 }
  },
  max: {
    display_name: 'Max', price_fixed: 1500, per_turn: 10, cap: 9800, daily_limit: null,
    deep_monthly: Infinity, ai_memo: true, context_multiplier: 1.0, fallback_model: 'gpt-5-mini',
    models: { claude: 'claude-opus-4-20250514', openai: 'gpt-5', gemini: 'gemini-3.1-pro-preview', router: 'gpt-5-mini' },
    fair_use: { h5_limit: 200, weekly_limit: 1500 }
  },
  ultra: {
    display_name: 'Ultra', price_fixed: 20000, per_turn: 0, cap: 0, daily_limit: null,
    deep_monthly: Infinity, ai_memo: true, context_multiplier: 2.0, fallback_model: null,
    et_weekly_limit: 140, priority_queue: true,
    models: { claude: 'claude-opus-4-20250514', openai: 'gpt-5', gemini: 'gemini-3.1-pro-preview', router: 'gpt-5-mini' },
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

// Round 31 Cat-F S-1 fix (2026-05-02): Stripe API version pin。
//   旧: outbound API call に Stripe-Version 未指定 → Stripe account default version 採用 →
//       Stripe rollout 時に silent breaking change リスク。
//   新: 明示 pin (2024-11-20.acacia)。 update 時は本 const + 関連 release note レビュー必須。
export const STRIPE_API_VERSION = '2024-11-20.acacia';

export const STRIPE_PRICE_IDS = {
  light: 'price_1TCzZj4084X0uakahTbAwTYK', light_metered: 'price_1TCzsw4084X0uakajD8aUGIm', light_annual: 'price_1TCztW4084X0uakaqwlf41QK',
  pro: 'price_1TCzv64084X0uakaeTSyND0a', pro_metered: 'price_1TCzwJ4084X0uakapKKWw6nV', pro_annual: 'price_1TCzwo4084X0uakatfRAkNFr',
  max: 'price_1TCzz44084X0uakaYnrDA4vv', max_metered: 'price_1TCzzk4084X0uakaiQmUneA7', max_annual: 'price_1TD0094084X0uaka1yAJuPoz',
  ultra: 'price_1TD03i4084X0uakalPdCgNCJ', ultra_annual: 'price_1TD0414084X0uakaVSJtVFrd',
  addon_50: 'price_1TD3QJ4084X0uakaOlOzERwV', addon_120: 'price_1TD3QK4084X0uakauP63gUOn',
};
// Round 30 schema audit fix (2026-05-02): production frontend は Netlify
//   (delicate-bienenstitch-b734d6.netlify.app) で v4.0.67 LIVE。
//   旧 goal-ai-frontend.pages.dev は v4.0.42 で stale (Round 22-30 fix 未反映)。
//   paid user 決済後の redirect 先を current production frontend に修正。
export const STRIPE_SUCCESS_URL = 'https://delicate-bienenstitch-b734d6.netlify.app?checkout=success';
export const STRIPE_CANCEL_URL  = 'https://delicate-bienenstitch-b734d6.netlify.app?checkout=cancel';

export const USAGE_BATCH_SIZE = 1; // ローンチ直前に5に変更
export function getCurrentMonth() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, '0')}`;
}

export const APP_VERSION = '4.0.71';

// ============================================================================
// Stripe Webhook billing-critical event types
// Round 23 R-004 fix (2026-05-01) — external review GPT-5.4 指摘対応
//   旧: prefix regex `/^(charge|invoice|customer\.subscription|checkout\.session|payment_intent|setup_intent)/`
//       で判定 → 列挙不完全、Stripe 側 API 進化で漏れ追加発生時に意図せず KV
//       fallback (race) に流れて double-process 再発。
//   新: 明示的 Set + 説明コメント。Stripe 公式 API ref で billing 影響のあるものを
//       列挙、新 event 追加時は本ファイルを更新する単一ソースに集約。
//
// Reference (2026 時点):
//   https://docs.stripe.com/api/events/types
// ============================================================================
export const STRIPE_BILLING_CRITICAL_EVENTS = new Set([
  // checkout
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'checkout.session.expired',
  // charge
  'charge.succeeded',
  'charge.failed',
  'charge.refunded',
  'charge.refund.updated',
  'charge.dispute.created',
  'charge.dispute.closed',
  'charge.dispute.updated',
  'charge.captured',
  'charge.expired',
  'charge.pending',
  'charge.updated',
  // invoice (subscription billing)
  'invoice.created',
  'invoice.finalized',
  'invoice.paid',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'invoice.payment_action_required',
  'invoice.upcoming',
  'invoice.updated',
  'invoice.voided',
  'invoice.marked_uncollectable',
  // customer.subscription
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
  'customer.subscription.trial_will_end',
  'customer.subscription.pending_update_applied',
  'customer.subscription.pending_update_expired',
  // payment_intent
  'payment_intent.created',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
  'payment_intent.requires_action',
  'payment_intent.processing',
  'payment_intent.amount_capturable_updated',
  // setup_intent
  'setup_intent.created',
  'setup_intent.succeeded',
  'setup_intent.setup_failed',
  'setup_intent.canceled',
  // refund (Stripe 2024+ direct refund namespace)
  'refund.created',
  'refund.updated',
  // payout (Connect 等で利用、課金影響を考慮し含める)
  'payout.created',
  'payout.failed',
  'payout.paid',
  'payout.updated',
]);

// Stripe webhook event が billing-critical かを判定。
// Round 23 R-004: prefix regex から explicit Set 判定 + safety fallback regex に変更。
// allowlist 外でも `charge.` / `invoice.` / `customer.subscription.` / `payment_intent.` /
// `setup_intent.` / `checkout.session.` / `refund.` / `payout.` で始まる新 event を
// safety net で critical 判定し、未知の billing event を leak させない。
export function isStripeBillingCriticalEvent(eventType) {
  if (!eventType || typeof eventType !== 'string') return false;
  if (STRIPE_BILLING_CRITICAL_EVENTS.has(eventType)) return true;
  // Safety net: 既知 prefix の未列挙 event は保守的に critical 扱い (R-004 推奨)
  // 例: Stripe が将来 `charge.application_fee.created` 等を追加した場合に対応
  const SAFETY_PREFIXES = [
    'charge.',
    'invoice.',
    'customer.subscription.',
    'payment_intent.',
    'setup_intent.',
    'checkout.session.',
    'refund.',
    'payout.',
  ];
  for (const prefix of SAFETY_PREFIXES) {
    if (eventType.startsWith(prefix)) return true;
  }
  return false;
}
export const COMMON_RULES = `【共通ルール】
- ユーザーの質問にはまず答える。質問を聞き返す前にまず回答する。
- 2〜3文で簡潔に。長文禁止。質問は1回まで。
- ユーザーの質問を無視してゴール設定に誘導することを禁止。
- 同じ内容の繰り返し禁止。
- タスクの背景や目的を推測して断言しない。contextフィールドに情報があればそれを参照。なければ「何の用件ですか？」と聞くか、推測なしで操作だけ行う。
- ユーザーが言っていないことを補完しない（「副業のためですね」等の断定禁止）。
- タスク追加時、deadline/contextが不明なら1-2問で聞く。答えなければnull保存。`;
