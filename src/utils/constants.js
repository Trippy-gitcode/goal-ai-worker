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

export const APP_VERSION = '4.0.9';
export const COMMON_RULES = `【共通ルール】
- ユーザーの質問にはまず答える。質問を聞き返す前にまず回答する。
- 2〜3文で簡潔に。長文禁止。質問は1回まで。
- ユーザーの質問を無視してゴール設定に誘導することを禁止。
- 同じ内容の繰り返し禁止。`;
