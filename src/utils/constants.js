// ═══════ CONFIG ═══════

export const PLAN_LIMITS = {
  free:            { deep: 3,     chat: 5,    chatPer: 'day'   },
  trial:           { deep: 30,    chat: 9999, chatPer: 'day'   },
  pro:             { deep: 30,    chat: 9999, chatPer: 'day'   },
  premium:         { deep: 60,    chat: 9999, chatPer: 'day'   },
  max:             { deep: 99999, chat: 9999, chatPer: 'day'   },
  annual:          { deep: 30,    chat: 9999, chatPer: 'day'   },
  premium_annual:  { deep: 60,    chat: 9999, chatPer: 'day'   },
  max_annual:      { deep: 99999, chat: 9999, chatPer: 'day'   },
};

export const FAIR_USE = { hourly: 30, daily: 100, delayMs: 7000 };

export const PLAN_MODELS = {
  free:            { claude: 'claude-sonnet-4-20250514', openai: 'gpt-5-mini', gemini: 'gemini-2.5-flash', router: 'gpt-5-mini' },
  pro:             { claude: 'claude-sonnet-4-20250514', openai: 'gpt-5-mini', gemini: 'gemini-2.5-flash', router: 'gpt-5-mini' },
  annual:          { claude: 'claude-sonnet-4-20250514', openai: 'gpt-5-mini', gemini: 'gemini-2.5-flash', router: 'gpt-5-mini' },
  premium:         { claude: 'claude-opus-4-20250514', openai: 'gpt-5', gemini: 'gemini-2.5-pro', router: 'gpt-5-mini' },
  premium_annual:  { claude: 'claude-opus-4-20250514', openai: 'gpt-5', gemini: 'gemini-2.5-pro', router: 'gpt-5-mini' },
  max:             { claude: 'claude-opus-4-20250514', openai: 'gpt-5', gemini: 'gemini-2.5-pro', router: 'gpt-5-mini' },
  max_annual:      { claude: 'claude-opus-4-20250514', openai: 'gpt-5', gemini: 'gemini-2.5-pro', router: 'gpt-5-mini' },
  _default:        { claude: 'claude-sonnet-4-20250514', openai: 'gpt-5-mini', gemini: 'gemini-2.5-flash', router: 'gpt-5-mini' },
};

export function getModel(plan, provider) {
  const models = PLAN_MODELS[plan] || PLAN_MODELS._default;
  return models[provider];
}

export const PROMO_CODES = {
  'LAUNCH30':   { plan: 'pro', days: 30,  desc: 'Pro 30日間無料（ローンチ記念）' },
  'INVITE2026': { plan: 'pro', days: 14,  desc: 'Pro 14日間無料（招待コード）' },
  'BETA3MONTH': { plan: 'pro', days: 90,  desc: 'Pro 90日間無料（ベータ感謝）' },
  'GOALPRO7':   { plan: 'pro', days: 7,   desc: 'Pro 7日間無料体験' },
};

export const TESTER_CODES = {
  TESTER01: { plan: 'premium', max_uses: 5 },
  TESTER02: { plan: 'pro', max_uses: 5 },
  TESTER03: { plan: 'pro', max_uses: 10 },
  TESTER04: { plan: 'pro', max_uses: 10 },
  TESTER05: { plan: 'pro', max_uses: 10 },
};
export const TESTER_TOTAL_LIMIT = 50;
export const TESTER_DURATION_HOURS = 72;

export const RATE_LIMIT_WINDOW = 60;
export const RATE_LIMIT_MAX = 30;

export const FREE_MODEL_LIMITS = { claude: 5, gemini: 5, gpt: 10 };

export const STRIPE_PRICE_IDS = {
  pro:             'price_1TAJNZ4084X0uakaB1IoYYuI',
  premium:         'price_1TBCKT4084X0uakaZg3wdluF',
  annual:          'price_1TAJUm4084X0uakakFD0smoF',
  premium_annual:  'price_1TBUKE4084X0uakaolxB0a4b',
  max:             'price_1TBUJh4084X0uaka60rFQJHq',
  max_annual:      'price_1TBUJn4084X0uakaKJ7XcUAz',
};

export const STRIPE_SUCCESS_URL = 'https://goal-ai-frontend.pages.dev?checkout=success';
export const STRIPE_CANCEL_URL  = 'https://goal-ai-frontend.pages.dev?checkout=cancel';

export const APP_VERSION = '3.9.1';

export const COMMON_RULES = `【共通ルール】
- ユーザーの質問にはまず答える。質問を聞き返す前にまず回答する。
- 2〜3文で簡潔に。長文禁止。質問は1回まで。
- ユーザーの質問を無視してゴール設定に誘導することを禁止。
- 同じ内容の繰り返し禁止。`;
