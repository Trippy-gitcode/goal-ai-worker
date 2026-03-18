/**
 * GOAL AI — Cloudflare Worker (APIプロキシ + テストトークン管理)
 * ─────────────────────────────────────────────────────────────
 * 環境変数 (wrangler.toml の [vars] or Secrets):
 *   ANTHROPIC_API_KEY   — Claude API key
 *   OPENAI_API_KEY      — OpenAI API key
 *   GEMINI_API_KEY      — Gemini API key
 *   TOKEN_SECRET        — テストトークン署名用シークレット
 *   STRIPE_SECRET_KEY   — Stripe APIシークレットキー
 *   STRIPE_WEBHOOK_SECRET — Stripe Webhook署名検証シークレット
 *   ALLOWED_ORIGINS     — カンマ区切りの許可オリジン (例: "https://goalai.netlify.app,http://localhost:3000")
 *
 * KV Namespace (binding名):
 *   TOKEN_KV  — テストトークン・使用量管理
 * ─────────────────────────────────────────────────────────────
 */

// ═══════ CONFIG ═══════

const PLAN_LIMITS = {
  free:            { deep: 3,     chat: 5,    chatPer: 'day'   },
  trial:           { deep: 30,    chat: 9999, chatPer: 'day'   },
  pro:             { deep: 30,    chat: 9999, chatPer: 'day'   },
  premium:         { deep: 60,    chat: 9999, chatPer: 'day'   },
  max:             { deep: 99999, chat: 9999, chatPer: 'day'   },
  annual:          { deep: 30,    chat: 9999, chatPer: 'day'   },
  premium_annual:  { deep: 60,    chat: 9999, chatPer: 'day'   },
  max_annual:      { deep: 99999, chat: 9999, chatPer: 'day'   },
};

// フェアユースポリシー: 1時間30回超 or 1日100回超で5-10秒待機
const FAIR_USE = { hourly: 30, daily: 100, delayMs: 7000 };

// プランごとのAIモデル設定
const PLAN_MODELS = {
  free: {
    claude:  'claude-sonnet-4-20250514',
    openai:  'gpt-5-mini',
    gemini:  'gemini-2.5-flash',
    router:  'gpt-5-mini',
  },
  pro: {
    claude:  'claude-sonnet-4-20250514',
    openai:  'gpt-5-mini',
    gemini:  'gemini-2.5-flash',
    router:  'gpt-5-mini',
  },
  annual: {
    claude:  'claude-sonnet-4-20250514',
    openai:  'gpt-5-mini',
    gemini:  'gemini-2.5-flash',
    router:  'gpt-5-mini',
  },
  premium: {
    claude:  'claude-opus-4-20250514',
    openai:  'gpt-5',
    gemini:  'gemini-2.5-pro',
    router:  'gpt-5-mini',
  },
  premium_annual: {
    claude:  'claude-opus-4-20250514',
    openai:  'gpt-5',
    gemini:  'gemini-2.5-pro',
    router:  'gpt-5-mini',
  },
  max: {
    claude:  'claude-opus-4-20250514',
    openai:  'gpt-5',
    gemini:  'gemini-2.5-pro',
    router:  'gpt-5-mini',
  },
  max_annual: {
    claude:  'claude-opus-4-20250514',
    openai:  'gpt-5',
    gemini:  'gemini-2.5-pro',
    router:  'gpt-5-mini',
  },
  _default: {
    claude:  'claude-sonnet-4-20250514',
    openai:  'gpt-5-mini',
    gemini:  'gemini-2.5-flash',
    router:  'gpt-5-mini',
  },
};

function getModel(plan, provider) {
  const models = PLAN_MODELS[plan] || PLAN_MODELS._default;
  return models[provider];
}

const PROMO_CODES = {
  'LAUNCH30':   { plan: 'pro', days: 30,  desc: 'Pro 30日間無料（ローンチ記念）' },
  'INVITE2026': { plan: 'pro', days: 14,  desc: 'Pro 14日間無料（招待コード）' },
  'BETA3MONTH': { plan: 'pro', days: 90,  desc: 'Pro 90日間無料（ベータ感謝）' },
  'GOALPRO7':   { plan: 'pro', days: 7,   desc: 'Pro 7日間無料体験' },
};

const TESTER_CODES = {
  TESTER01: { plan: 'premium', max_uses: 5 },
  TESTER02: { plan: 'pro', max_uses: 5 },
  TESTER03: { plan: 'pro', max_uses: 10 },
  TESTER04: { plan: 'pro', max_uses: 10 },
  TESTER05: { plan: 'pro', max_uses: 10 },
};
const TESTER_TOTAL_LIMIT = 50;
const TESTER_DURATION_HOURS = 72;

const RATE_LIMIT_WINDOW = 60;
const RATE_LIMIT_MAX    = 30;

const STRIPE_PRICE_IDS = {
  pro:             'price_1TAJNZ4084X0uakaB1IoYYuI',
  premium:         'price_1TBCKT4084X0uakaZg3wdluF',
  annual:          'price_1TAJUm4084X0uakakFD0smoF',
  premium_annual:  'price_1TBUKE4084X0uakaolxB0a4b',
  max:             'price_1TBUJh4084X0uaka60rFQJHq',
  max_annual:      'price_1TBUJn4084X0uakaKJ7XcUAz',
};

const STRIPE_SUCCESS_URL = 'https://goal-ai-frontend.pages.dev?checkout=success';
const STRIPE_CANCEL_URL  = 'https://goal-ai-frontend.pages.dev?checkout=cancel';

// ═══════ ROUTER ═══════

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(env, new Response(null, { status: 204 }), request);
    }

    try {
      // ── Version ──
      if (url.pathname === '/api/version') {
        return corsResponse(env, jsonRes({ version: '3.5.1', deployed_at: new Date().toISOString() }), request);
      }

      // ── Error Report ──
      if (url.pathname === '/api/error-report' && request.method === 'POST') {
        try {
          const body = await request.json();
          const key = `err:${new Date().toISOString().slice(0,13)}`;
          const existing = JSON.parse(await env.TOKEN_KV.get(key) || '[]');
          existing.push({ ...body, ip: request.headers.get('CF-Connecting-IP') });
          if (existing.length <= 100) {
            await env.TOKEN_KV.put(key, JSON.stringify(existing), { expirationTtl: 86400 * 7 });
          }
        } catch(e) {}
        return corsResponse(env, jsonRes({ ok: true }), request);
      }

      // ── Routes ──
      if (url.pathname === '/api/chat' && request.method === 'POST') {
        return corsResponse(env, await handleChat(request, env, ctx));
      }
      if (url.pathname === '/api/chat/stream' && request.method === 'POST') {
        return corsResponse(env, await handleChatStream(request, env, ctx));
      }
      if (url.pathname === '/api/deep/openai' && request.method === 'POST') {
        return corsResponse(env, await handleDeepOpenAI(request, env, ctx));
      }
      if (url.pathname === '/api/chat/gpt-simple' && request.method === 'POST') {
        return corsResponse(env, await handleGptSimple(request, env));
      }
      if (url.pathname === '/api/deep/gemini' && request.method === 'POST') {
        return corsResponse(env, await handleDeepGemini(request, env, ctx));
      }
      if (url.pathname === '/api/deep/claude' && request.method === 'POST') {
        return corsResponse(env, await handleDeepClaude(request, env, ctx));
      }
      if (url.pathname === '/api/deep/claude/stream' && request.method === 'POST') {
        return corsResponse(env, await handleDeepClaudeStream(request, env, ctx));
      }

      // ── Token management ──
      if (url.pathname === '/api/token/register' && request.method === 'POST') {
        return corsResponse(env, await handleTokenRegister(request, env, ctx), request);
      }
      if (url.pathname === '/api/token/create' && request.method === 'POST') {
        return corsResponse(env, await handleTokenCreate(request, env, ctx));
      }
      if (url.pathname === '/api/token/validate' && request.method === 'POST') {
        return corsResponse(env, await handleTokenValidate(request, env));
      }
      if (url.pathname === '/api/token/redeem' && request.method === 'POST') {
        return corsResponse(env, await handleTokenRedeem(request, env, ctx));
      }
      if (url.pathname === '/api/usage' && request.method === 'GET') {
        return corsResponse(env, await handleUsageGet(request, env, ctx));
      }

      // ── Stripe ──
      if (url.pathname === '/api/checkout/create' && request.method === 'POST') {
        return corsResponse(env, await handleCheckoutCreate(request, env), request);
      }
      if (url.pathname === '/api/checkout/portal' && request.method === 'POST') {
        return corsResponse(env, await handleCheckoutPortal(request, env), request);
      }
      if (url.pathname === '/api/webhook/stripe' && request.method === 'POST') {
        return await handleStripeWebhook(request, env, ctx);
      }

      // ── Goals (Supabase) ──
      if (url.pathname === '/api/goals' && request.method === 'GET') {
        return corsResponse(env, await handleGoalsList(request, env), request);
      }
      if (url.pathname === '/api/goals' && request.method === 'POST') {
        return corsResponse(env, await handleGoalCreate(request, env), request);
      }
      if (url.pathname.startsWith('/api/goals/') && request.method === 'PATCH') {
        return corsResponse(env, await handleGoalUpdate(request, env, url), request);
      }
      if (url.pathname.match(/^\/api\/goals\/[^/]+\/suggest-roles$/) && request.method === 'POST') {
        return corsResponse(env, await handleSuggestRoles(request, env), request);
      }
      if (url.pathname.startsWith('/api/goals/') && request.method === 'DELETE') {
        return corsResponse(env, await handleGoalDelete(request, env, url), request);
      }

      // ── Chat history (Supabase) ──
      if (url.pathname === '/api/history' && request.method === 'GET') {
        return corsResponse(env, await handleHistoryGet(request, env, url), request);
      }
      if (url.pathname === '/api/history' && request.method === 'POST') {
        return corsResponse(env, await handleHistorySave(request, env, ctx), request);
      }

      // ── Voice transcription ──
      if (url.pathname === '/api/voice/transcribe' && request.method === 'POST') {
        return corsResponse(env, await handleVoiceTranscribe(request, env), request);
      }

      // ── Profile avatar ──
      if (url.pathname === '/api/profile/avatar' && request.method === 'POST') {
        return corsResponse(env, await handleAvatarUpload(request, env), request);
      }

      // ── Referral ──
      if (url.pathname === '/api/referral/code' && request.method === 'GET') {
        return corsResponse(env, await handleReferralCode(request, env), request);
      }
      if (url.pathname === '/api/referral/create' && request.method === 'POST') {
        return corsResponse(env, await handleReferralCreate(request, env), request);
      }
      if (url.pathname === '/api/referral/apply' && request.method === 'POST') {
        return corsResponse(env, await handleReferralApply(request, env), request);
      }
      if (url.pathname === '/api/referral/status' && request.method === 'GET') {
        return corsResponse(env, await handleReferralStatus(request, env), request);
      }

      // ── Tester ──
      if (url.pathname === '/api/tester/apply' && request.method === 'POST') {
        return corsResponse(env, await handleTesterApply(request, env), request);
      }

      // ── AI Memo ──
      if (url.pathname === '/api/ai-memo/generate' && request.method === 'POST') {
        return corsResponse(env, await handleAIMemoGenerate(request, env), request);
      }

      // ── Admin ──
      if (url.pathname === '/api/admin/testers' && request.method === 'GET') {
        return corsResponse(env, await handleAdminTesters(request, env), request);
      }

      // ── Feedbacks ──
      if (url.pathname === '/api/feedbacks' && request.method === 'POST') {
        return corsResponse(env, await handleFeedbackSave(request, env), request);
      }
      if (url.pathname === '/api/feedbacks' && request.method === 'GET') {
        return corsResponse(env, await handleFeedbackList(request, env), request);
      }

      // ── Health check ──
      if (url.pathname === '/health') {
        return corsResponse(env, jsonRes({ status: 'ok', service: 'goal-ai-worker', ts: Date.now() }));
      }

      return corsResponse(env, jsonRes({ error: 'Not found' }, 404));
    } catch (e) {
      console.error('Worker error:', e);
      if (e instanceof SyntaxError) {
        return corsResponse(env, jsonRes({ error: 'Invalid JSON in request body' }, 400));
      }
      return corsResponse(env, jsonRes({ error: 'Internal server error' }, 500));
    }
  }
};


// ═══════ AUTH & RATE LIMIT ═══════

async function authenticateRequest(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return { ok: false, error: 'Authorization required', status: 401 };
  }

  // テストトークンの場合
  if (token.startsWith('goal_test_')) {
    const tokenData = await env.TOKEN_KV.get(`token:${token}`, 'json');
    if (!tokenData) {
      return { ok: false, error: 'Invalid token', status: 401 };
    }
    if (tokenData.expiresAt && new Date(tokenData.expiresAt) < new Date()) {
      return { ok: false, error: 'Token expired', status: 401 };
    }
    if (tokenData.revoked) {
      return { ok: false, error: 'Token revoked', status: 401 };
    }
    // トライアル期限切れチェック → Freeに自動ダウングレード
    let effectivePlan = tokenData.plan || 'trial';
    if (effectivePlan === 'trial' && tokenData.trialEnd && new Date(tokenData.trialEnd) < new Date()) {
      effectivePlan = 'free';
      tokenData.plan = 'free';
      await env.TOKEN_KV.put(`token:${token}`, JSON.stringify(tokenData), { expirationTtl: 365 * 86400 });
    }
    // Tester expiry check in auth
    if (tokenData.tester_expires_at && new Date(tokenData.tester_expires_at) < new Date()) {
      effectivePlan = 'free';
      tokenData.plan = 'free';
      tokenData.tester_tier = null;
      tokenData.tester_expires_at = null;
      await env.TOKEN_KV.put(`token:${token}`, JSON.stringify(tokenData), { expirationTtl: 365 * 86400 });
    }

    // Owner bypass: X-Owner-Key header or Cookie matches OWNER_SECRET → max plan
    const ownerKey = request.headers.get('X-Owner-Key') || ((request.headers.get('Cookie') || '').match(/owner_key=([^;]+)/)?.[1] ? decodeURIComponent((request.headers.get('Cookie') || '').match(/owner_key=([^;]+)/)[1]) : null);
    if (ownerKey && env.OWNER_SECRET && ownerKey === env.OWNER_SECRET) {
      effectivePlan = 'max';
    }

    return { ok: true, tokenId: token, plan: effectivePlan, userId: tokenData.userId || token, trialEnd: tokenData.trialEnd || null };
  }

  // 将来的にSupabase JWT検証を追加予定
  // if (token.startsWith('eyJ')) { ... }

  return { ok: false, error: 'Invalid token format', status: 401 };
}

async function checkRateLimit(env, userId) {
  const key = `rl:${userId}:${Math.floor(Date.now() / 1000 / RATE_LIMIT_WINDOW)}`;
  const current = parseInt(await env.TOKEN_KV.get(key) || '0');
  if (current >= RATE_LIMIT_MAX) {
    return { ok: false, remaining: 0 };
  }
  await env.TOKEN_KV.put(key, String(current + 1), { expirationTtl: RATE_LIMIT_WINDOW * 2 });
  return { ok: true, remaining: RATE_LIMIT_MAX - current - 1 };
}

async function checkDeepUsage(env, userId, plan) {
  const monthKey = getMonthKey();
  const usageKey = `usage:deep:${userId}:${monthKey}`;
  const used = parseInt(await env.TOKEN_KV.get(usageKey) || '0');
  const limit = PLAN_LIMITS[plan]?.deep || PLAN_LIMITS.free.deep;
  return { used, limit, remaining: Math.max(0, limit - used) };
}

// Free日次チャット制限チェック
async function checkDailyChatUsage(env, userId, plan) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  if (limits.chat >= 9999) return { ok: true, remaining: 9999 }; // 無制限プラン
  const dayKey = getDayKey();
  const usageKey = `usage:chat:${userId}:${dayKey}`;
  const used = parseInt(await env.TOKEN_KV.get(usageKey) || '0');
  return { ok: used < limits.chat, used, limit: limits.chat, remaining: Math.max(0, limits.chat - used) };
}

async function incrementDailyChatUsage(env, userId) {
  const dayKey = getDayKey();
  const usageKey = `usage:chat:${userId}:${dayKey}`;
  const used = parseInt(await env.TOKEN_KV.get(usageKey) || '0');
  await env.TOKEN_KV.put(usageKey, String(used + 1), { expirationTtl: 86400 * 2 });
}

function getDayKey() {
  // JST (UTC+9)
  const now = new Date(Date.now() + 9 * 3600000);
  return now.toISOString().slice(0, 10);
}

// ═══════ FREE MODEL USAGE LIMITS ═══════
const FREE_MODEL_LIMITS = { claude: 5, gemini: 5, gpt: 10 };

function getEffectiveModel(plan, category, used) {
  if (plan !== 'free') return null;
  const limits = { claude: 5, gpt: 10, gemini: 5 };
  if ((used || 0) >= (limits[category] || 5)) {
    const jst = new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Tokyo'}));
    const midnight = new Date(jst); midnight.setDate(midnight.getDate()+1); midnight.setHours(0,0,0,0);
    const resetH = Math.ceil((midnight - jst) / 3600000);
    return { fallback: true, resetHour: resetH };
  }
  return null;
}

async function getFreeModelUsage(tokenId, model, env) {
  const key = `free_model:${tokenId}:${getDayKey()}:${model}`;
  return parseInt(await env.TOKEN_KV.get(key) || '0');
}

async function incrementFreeModelUsage(tokenId, model, env) {
  const key = `free_model:${tokenId}:${getDayKey()}:${model}`;
  const current = await getFreeModelUsage(tokenId, model, env);
  await env.TOKEN_KV.put(key, String(current + 1), { expirationTtl: 86400 * 2 });
}

async function canUseModel(tokenId, plan, model, env) {
  if (plan !== 'free') return { allowed: true, remaining: 9999 };
  const limit = FREE_MODEL_LIMITS[model];
  if (!limit) return { allowed: true, remaining: 9999 };
  const used = await getFreeModelUsage(tokenId, model, env);
  return { allowed: used < limit, remaining: Math.max(0, limit - used) };
}

// フェアユースポリシーチェック
async function checkFairUse(env, userId) {
  const hourKey = `fu:h:${userId}:${Math.floor(Date.now() / 3600000)}`;
  const dayKey = `fu:d:${userId}:${getDayKey()}`;
  const hourly = parseInt(await env.TOKEN_KV.get(hourKey) || '0');
  const daily = parseInt(await env.TOKEN_KV.get(dayKey) || '0');
  const throttle = hourly >= FAIR_USE.hourly || daily >= FAIR_USE.daily;
  // Increment
  await env.TOKEN_KV.put(hourKey, String(hourly + 1), { expirationTtl: 7200 });
  await env.TOKEN_KV.put(dayKey, String(daily + 1), { expirationTtl: 86400 * 2 });
  return { throttle, delayMs: throttle ? FAIR_USE.delayMs : 0 };
}

async function incrementDeepUsage(env, userId) {
  const monthKey = getMonthKey();
  const usageKey = `usage:deep:${userId}:${monthKey}`;
  const used = parseInt(await env.TOKEN_KV.get(usageKey) || '0');
  // 月末+3日で自動削除
  const expiry = getMonthEndTtl();
  await env.TOKEN_KV.put(usageKey, String(used + 1), { expirationTtl: expiry });
}

// ═══════ PROFILE & SYSTEM PROMPT BUILDER ═══════

function buildProfileBlock(profile, fields) {
  if (!profile) return '';
  const lines = [];
  const map = {
    nickname: () => profile.nickname ? `名前: ${profile.nickname}` : null,
    occupation: () => profile.occupation ? `職種: ${profile.occupation}` : null,
    age: () => profile.age ? `年齢: ${profile.age}歳` : null,
    mbti: () => profile.mbti ? `MBTI: ${profile.mbti}` : null,
    strengths: () => profile.strengths ? `強み: ${profile.strengths}` : null,
    weaknesses: () => profile.weaknesses ? `弱み: ${profile.weaknesses}` : null,
    values: () => profile.values ? `価値観: ${profile.values}` : null,
    vision: () => profile.vision ? `ビジョン: ${profile.vision}` : null,
    constraints: () => profile.constraints ? `制約: ${profile.constraints}` : null,
  };
  for (const f of fields) {
    if (map[f]) { const line = map[f](); if (line) lines.push(line); }
  }
  return lines.join('\n');
}

const COMMON_RULES = `【共通ルール】
- ユーザーの質問にはまず答える。質問を聞き返す前にまず回答する。
- 2〜3文で簡潔に。長文禁止。質問は1回まで。
- ユーザーの質問を無視してゴール設定に誘導することを禁止。
- 同じ内容の繰り返し禁止。`;

async function buildServerSystemPrompt(body, tokenId, env) {
  // profile_inject fields from frontend
  const injectFields = body.profile_inject || ['nickname'];

  // Get profile from Supabase
  let profile = null;
  try {
    const userId = await getUserIdFromToken(env, tokenId);
    if (userId) {
      const res = await supabaseQuery(env, 'users', 'GET', {
        filters: `id=eq.${userId}`,
        select: 'nickname,occupation,age,mbti,strengths,weaknesses,values,vision,constraints',
      });
      if (res && res.length > 0) profile = res[0];
    }
  } catch(e) {}

  // If coaching_mode, expand inject fields
  let fields = injectFields;
  if (body.coaching_mode) {
    fields = ['nickname', 'occupation', 'age', 'mbti', 'strengths', 'weaknesses', 'values', 'vision', 'constraints'];
  }

  const profileBlock = buildProfileBlock(profile, fields);

  let prompt = '';
  if (body.role) prompt += `【あなたの役割】${body.role}\n\n`;
  if (profileBlock) prompt += `【ユーザー情報】\n${profileBlock}\n\n`;
  prompt += COMMON_RULES;
  if (body.system) prompt += `\n\n${body.system}`;

  return prompt;
}

// ═══════ CHAT HANDLERS (Claude) ═══════

async function handleChat(request, env, ctx) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const rl = await checkRateLimit(env, auth.userId);
  if (!rl.ok) return jsonRes({ error: 'Rate limit exceeded', retryAfter: RATE_LIMIT_WINDOW }, 429);

  // 日次チャット制限（Free: 5回/日）
  const chatUsage = await checkDailyChatUsage(env, auth.userId, auth.plan);
  if (!chatUsage.ok) return jsonRes({ error: '本日のチャット上限に達しました。明日またお試しください。', used: chatUsage.used, limit: chatUsage.limit, remaining: 0 }, 429);
  await incrementDailyChatUsage(env, auth.userId);

  // フェアユースポリシー
  const fu = await checkFairUse(env, auth.userId);
  if (fu.throttle) await new Promise(r => setTimeout(r, fu.delayMs));

  const body = await request.json();
  const { system, messages, maxTokens = 1000, goalId } = body;
  const claudeModel = getModel(auth.plan, 'claude');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: claudeModel,
      max_tokens: Math.min(maxTokens, auth.plan === 'premium' ? 4000 : 2000),
      system: system || undefined,
      messages,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return jsonRes({ error: data.error?.message || 'Claude API error' }, res.status);
  }

  // Supabaseにチャット履歴保存（非同期）
  if (ctx && env.SUPABASE_URL) {
    const lastUserMsg = messages[messages.length - 1];
    const aiContent = data.content?.[0]?.text || '';
    ctx.waitUntil(Promise.all([
      saveChatMessage(env, auth.tokenId, lastUserMsg.role, lastUserMsg.content, null, goalId, 'chat'),
      saveChatMessage(env, auth.tokenId, 'assistant', aiContent, 'claude', goalId, 'chat'),
    ]));
  }

  // ストリーク更新（非同期）
  if (ctx && env.SUPABASE_URL) ctx.waitUntil(updateStreak(auth.tokenId, env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY));

  // NPS表示判定（チャット5回ごと）
  const dailyKey = getDayKey();
  const chatCountKey = `usage:chat:${auth.userId}:${dailyKey}`;
  const chatCount = parseInt(await env.TOKEN_KV.get(chatCountKey) || '0');
  const show_nps = (chatCount > 0 && chatCount % 5 === 0);

  return jsonRes(data, 200, { 'X-RateLimit-Remaining': String(rl.remaining), 'X-Model-Used': claudeModel, 'X-Show-NPS': show_nps ? '1' : '0' });
}

async function handleChatStream(request, env, ctx) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const rl = await checkRateLimit(env, auth.userId);
  if (!rl.ok) return jsonRes({ error: 'Rate limit exceeded' }, 429);

  const body = await request.json();
  const { system, messages, maxTokens = 600, free_no_count, context } = body;

  // free_no_count validation: only allowed for design/feedback contexts
  if (free_no_count && !['design', 'feedback'].includes(context)) {
    return jsonRes({ error: 'Invalid context for free_no_count' }, 400);
  }

  // 日次チャット制限（free_no_countの場合はスキップ）
  if (!free_no_count) {
    const chatUsage = await checkDailyChatUsage(env, auth.userId, auth.plan);
    if (!chatUsage.ok) return jsonRes({ error: '本日のチャット上限に達しました', remaining: 0 }, 429);
    await incrementDailyChatUsage(env, auth.userId);
  }

  // フェアユースポリシー
  const fu = await checkFairUse(env, auth.userId);
  if (fu.throttle) await new Promise(r => setTimeout(r, fu.delayMs));

  // Build enhanced system prompt with profile injection
  const enhancedSystem = body.profile_inject
    ? await buildServerSystemPrompt(body, auth.tokenId, env)
    : (body.system || '');

  // Freeプラン: Claude上限チェック → 超過時はnanoでSSE応答
  if (auth.plan === 'free' && !free_no_count) {
    const cm = await canUseModel(auth.tokenId, auth.plan, 'claude', env);
    if (!cm.allowed) {
      // nanoで非ストリーミング応答をSSE形式にラップして返す
      const nanoRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: 'gpt-5-nano', max_completion_tokens: Math.min(maxTokens, 600),
          messages: [{ role: 'system', content: enhancedSystem || '' }, ...messages] }),
      });
      const nanoData = await nanoRes.json();
      const text = nanoData.choices?.[0]?.message?.content || '';
      const sseBody = `data: {"type":"content_block_delta","delta":{"text":${JSON.stringify(text)}}}\n\ndata: [DONE]\n\n`;
      const fallbackInfo = getEffectiveModel(auth.plan, 'claude', cm.remaining === 0 ? FREE_MODEL_LIMITS.claude : 0);
      return new Response(sseBody, { status: 200, headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'X-Model-Used': 'gpt-5-nano', 'X-Model-Fallback': 'true', 'X-Reset-Hours': String(fallbackInfo ? fallbackInfo.resetHour : 12) } });
    }
    await incrementFreeModelUsage(auth.tokenId, 'claude', env);
  }

  const claudeModel = getModel(auth.plan, 'claude');

  const controller = new AbortController();
  request.signal?.addEventListener('abort', () => controller.abort());

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: claudeModel,
      max_tokens: Math.min(maxTokens, auth.plan === 'premium' ? 4000 : 2000),
      stream: true,
      system: enhancedSystem || undefined,
      messages,
    }),
    signal: controller.signal,
  });

  if (!res.ok) {
    const err = await res.text();
    return new Response(err, { status: res.status, headers: { 'Content-Type': 'text/plain' } });
  }

  // ストリーク更新（非同期、ctx不要 — fire and forget）
  if (env.SUPABASE_URL) updateStreak(auth.tokenId, env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  // AI理解メモ自動更新（5回ごと、非同期）
  if (ctx) ctx.waitUntil(checkMemoAutoUpdate(auth.tokenId, env));

  // SSEストリームをそのまま透過プロキシ
  return new Response(res.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Model-Used': claudeModel,
    },
  });
}

// ═══════ AI MEMO AUTO UPDATE (5回ごと) ═══════

async function checkMemoAutoUpdate(tokenId, env) {
  try {
    const dateKey = new Date().toISOString().slice(0,10);
    const countKey = `chat_count:${tokenId}:${dateKey}`;
    const count = parseInt(await env.TOKEN_KV.get(countKey) || '0');
    if (count > 0 && count % 5 === 0) {
      const userId = await getUserIdFromToken(env, tokenId);
      if (!userId) return;
      await supabaseQuery(env, 'users', 'PATCH', {
        filters: `id=eq.${userId}`,
        body: { ai_memo_updated_at: new Date().toISOString() }
      });
    }
  } catch(e) {}
}

// ═══════ GPT-SIMPLE (軽量応答、deep使用量カウントなし) ═══════

async function handleGptSimple(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const body = await request.json();
  const { messages, system, maxTokens = 150 } = body;

  // ルーティング判定キャッシュ（systemにROUTE_PROMPTが含まれる場合）
  const isRouting = system && system.includes('1単語のみ返せ');
  if (isRouting && messages?.[0]?.content) {
    const userText = messages[0].content;
    const cacheKey = `route:${userText.slice(0, 50)}`;
    const cached = await env.TOKEN_KV.get(cacheKey);
    if (cached) return jsonRes({ choices: [{ message: { content: cached } }] }, 200, { 'X-Route-Cache': 'hit' });
  }

  // ルーティング判定はmini、相槌応答はnano
  const model = isRouting ? getModel(auth.plan, 'router') : 'gpt-5-nano';

  const openaiMessages = [];
  if (system) openaiMessages.push({ role: 'system', content: system });
  if (Array.isArray(messages)) openaiMessages.push(...messages);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      max_completion_tokens: Math.min(Math.max(maxTokens, 50), 300),
      messages: openaiMessages,
    }),
  });

  const data = await res.json();
  if (!res.ok) return jsonRes({ error: data.error?.message || 'GPT error' }, res.status);

  // ルーティング判定結果をキャッシュ
  if (isRouting && messages?.[0]?.content) {
    const routeResult = (data.choices?.[0]?.message?.content || '').trim().toLowerCase();
    if (['gemini','gpt','gpt-simple','claude'].includes(routeResult.replace(/[^a-z-]/g,''))) {
      const cacheKey = `route:${messages[0].content.slice(0, 50)}`;
      await env.TOKEN_KV.put(cacheKey, routeResult.replace(/[^a-z-]/g,''), { expirationTtl: 3600 });
    }
  }

  return jsonRes(data, 200, { 'X-Model-Used': model, 'X-Route': 'gpt-simple' });
}

// ═══════ DEEP ANALYSIS HANDLERS ═══════

async function handleDeepOpenAI(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const usage = await checkDeepUsage(env, auth.userId, auth.plan);
  if (usage.remaining <= 0) {
    return jsonRes({
      error: 'ディープ分析の月間上限に達しました',
      used: usage.used, limit: usage.limit, plan: auth.plan,
    }, 429);
  }

  const body = await request.json();
  const { messages, system, maxTokens = 1000 } = body;
  let openaiModel = getModel(auth.plan, 'openai');

  // Freeプラン: GPT使用量チェック → nano切替
  if (auth.plan === 'free') {
    const gm = await canUseModel(auth.tokenId, auth.plan, 'gpt', env);
    if (!gm.allowed) {
      openaiModel = 'gpt-5-nano';
    } else {
      await incrementFreeModelUsage(auth.tokenId, 'gpt', env);
    }
  }

  const openaiMessages = [];
  if (system) openaiMessages.push({ role: 'system', content: system });
  if (Array.isArray(messages)) openaiMessages.push(...messages);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: openaiModel,
      max_completion_tokens: Math.min(maxTokens, 2000),
      messages: openaiMessages,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return jsonRes({ error: data.error?.message || 'OpenAI API error' }, res.status);
  }
  await incrementDeepUsage(env, auth.userId);
  return jsonRes(data, 200, { 'X-Model-Used': openaiModel });
}

async function handleDeepGemini(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const usage = await checkDeepUsage(env, auth.userId, auth.plan);
  if (usage.remaining <= 0) {
    return jsonRes({
      error: 'ディープ分析の月間上限に達しました',
      used: usage.used, limit: usage.limit, plan: auth.plan,
    }, 429);
  }

  const body = await request.json();
  const { prompt, systemCtx, maxTokens = 1200 } = body;

  // Freeプラン: Gemini使用量チェック → nano切替
  if (auth.plan === 'free') {
    const gm = await canUseModel(auth.tokenId, auth.plan, 'gemini', env);
    if (!gm.allowed) {
      // nanoで代替応答
      const nanoMessages = [{ role: 'system', content: systemCtx || '' }, { role: 'user', content: prompt }];
      const nanoRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: 'gpt-5-nano', max_completion_tokens: Math.min(maxTokens, 600), messages: nanoMessages }),
      });
      const nanoData = await nanoRes.json();
      // Gemini互換のレスポンス形式で返す
      const nanoText = nanoData.choices?.[0]?.message?.content || '';
      return jsonRes({ candidates: [{ content: { parts: [{ text: nanoText }] } }] }, 200, { 'X-Model-Used': 'gpt-5-nano' });
    }
    await incrementFreeModelUsage(auth.tokenId, 'gemini', env);
  }

  const geminiModel = getModel(auth.plan, 'gemini');

  const text = systemCtx ? `${systemCtx}\n\n${prompt}` : prompt;
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${env.GEMINI_API_KEY}`;

  const res = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: { maxOutputTokens: Math.min(maxTokens, 2000), temperature: 0.7 },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return jsonRes({ error: data.error?.message || 'Gemini API error' }, res.status);
  }
  await incrementDeepUsage(env, auth.userId);
  return jsonRes(data, 200, { 'X-Model-Used': geminiModel });
}

async function handleDeepClaude(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const body = await request.json();
  const { system, messages, maxTokens = 1500, countUsage = false } = body;

  // ディープ分析カウント対象の場合のみ使用量チェック
  if (countUsage) {
    const usage = await checkDeepUsage(env, auth.userId, auth.plan);
    if (usage.remaining <= 0) {
      return jsonRes({
        error: 'ディープ分析の月間上限に達しました',
        used: usage.used, limit: usage.limit, plan: auth.plan,
      }, 429);
    }
    await incrementDeepUsage(env, auth.userId);
  }

  const claudeModel = getModel(auth.plan, 'claude');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: claudeModel,
      max_tokens: Math.min(maxTokens, 4000),
      system: system || undefined,
      messages,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return jsonRes({ error: data.error?.message || 'Claude API error' }, res.status);
  }
  return jsonRes(data, 200, { 'X-Model-Used': claudeModel });
}

async function handleDeepClaudeStream(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const body = await request.json();
  const { system, messages, maxTokens = 1500 } = body;
  const claudeModel = getModel(auth.plan, 'claude');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: claudeModel,
      max_tokens: Math.min(maxTokens, 4000),
      stream: true,
      system: system || undefined,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return new Response(err, { status: res.status });
  }

  return new Response(res.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Model-Used': claudeModel,
    },
  });
}


// ═══════ TOKEN MANAGEMENT ═══════

async function handleTokenRegister(request, env, ctx) {
  const body = await request.json();
  const { deviceId } = body;
  if (!deviceId) return jsonRes({ error: 'deviceId is required' }, 400);

  // 同じdeviceIdで既存トークンがあれば返す
  const existingTokenId = await env.TOKEN_KV.get(`device:${deviceId}`);
  if (existingTokenId) {
    const existingData = await env.TOKEN_KV.get(`token:${existingTokenId}`, 'json');
    if (existingData && !existingData.revoked) {
      return jsonRes({ token: existingTokenId, plan: existingData.plan, existing: true });
    }
  }

  // 14日間トライアル付きトークン自動発行
  const tokenId = `goal_test_${generateId(24)}`;
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 14 * 86400000);
  const tokenData = {
    tokenId,
    plan: 'trial',
    userId: deviceId,
    promoCode: null,
    promoDesc: 'Pro体験トライアル（14日間）',
    note: 'auto-register-trial',
    createdAt: now.toISOString(),
    expiresAt: null, // トークン自体は無期限
    trialEnd: trialEnd.toISOString(), // トライアル終了日
    revoked: false,
  };

  // KVに保存（無期限だが1年TTL）
  const ttl = 365 * 86400;
  await env.TOKEN_KV.put(`token:${tokenId}`, JSON.stringify(tokenData), { expirationTtl: ttl });
  await env.TOKEN_KV.put(`device:${deviceId}`, tokenId, { expirationTtl: ttl });
  await env.TOKEN_KV.put(`user_token:${deviceId}`, tokenId, { expirationTtl: ttl });

  // Supabaseに同期
  if (ctx && env.SUPABASE_URL) {
    ctx.waitUntil(syncUserToSupabase(env, tokenData));
  }

  return jsonRes({ token: tokenId, plan: 'free', existing: false }, 201);
}

async function handleTokenCreate(request, env, ctx) {
  // 管理者認証（TOKEN_SECRETで簡易認証・定数時間比較）
  const adminAuth = request.headers.get('X-Admin-Secret');
  if (!adminAuth || !(await safeCompare(adminAuth, env.TOKEN_SECRET))) {
    return jsonRes({ error: 'Unauthorized' }, 403);
  }

  const body = await request.json();
  const { promoCode, userId, note } = body;

  // プロモコード検証
  const promo = promoCode ? PROMO_CODES[promoCode.toUpperCase()] : null;
  const plan  = promo?.plan || body.plan || 'trial';
  const days  = promo?.days || body.days || 7;

  // トークン生成
  const tokenId = `goal_test_${generateId(24)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + days * 86400000);

  const tokenData = {
    tokenId,
    plan,
    userId: userId || tokenId,
    promoCode: promoCode || null,
    promoDesc: promo?.desc || null,
    note: note || null,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    revoked: false,
  };

  // KVに保存（有効期限+7日バッファで自動削除）
  const ttl = days * 86400 + 7 * 86400;
  await env.TOKEN_KV.put(`token:${tokenId}`, JSON.stringify(tokenData), { expirationTtl: ttl });

  // ユーザーID → トークン逆引きも保存
  if (userId) {
    await env.TOKEN_KV.put(`user_token:${userId}`, tokenId, { expirationTtl: ttl });
  }

  // Supabaseに同期
  ctx && ctx.waitUntil && ctx.waitUntil(syncUserToSupabase(env, tokenData));

  return jsonRes({
    token: tokenId,
    plan,
    expiresAt: expiresAt.toISOString(),
    promoDesc: promo?.desc || `${plan}プラン ${days}日間`,
  });
}

async function handleTokenValidate(request, env) {
  const body = await request.json();
  const { token } = body;

  if (!token) return jsonRes({ valid: false, error: 'Token required' });

  const tokenData = await env.TOKEN_KV.get(`token:${token}`, 'json');
  if (!tokenData) return jsonRes({ valid: false, error: 'Token not found' });

  const expired = tokenData.expiresAt && new Date(tokenData.expiresAt) < new Date();
  if (expired || tokenData.revoked) {
    return jsonRes({
      valid: false,
      error: expired ? 'Token expired' : 'Token revoked',
      plan: tokenData.plan,
      expiresAt: tokenData.expiresAt,
    });
  }

  // Tester expiry check
  if (tokenData.tester_expires_at && new Date(tokenData.tester_expires_at) < new Date()) {
    tokenData.plan = 'free';
    tokenData.tester_tier = null;
    tokenData.tester_expires_at = null;
    await env.TOKEN_KV.put(`token:${token}`, JSON.stringify(tokenData), { expirationTtl: 365 * 86400 });
    // Also update Supabase
    const testerUserId = await getUserIdFromToken(env, token);
    if (testerUserId) {
      await supabaseQuery(env, 'users', 'PATCH', {
        filters: `id=eq.${testerUserId}`,
        body: { plan: 'free', tester_tier: null, tester_code: null, tester_expires_at: null },
      });
    }
  }

  // Owner bypass: X-Owner-Key header or Cookie matches OWNER_SECRET → max plan
  let effectivePlan = tokenData.plan;
  const ownerKey2 = request.headers.get('X-Owner-Key') || ((request.headers.get('Cookie') || '').match(/owner_key=([^;]+)/)?.[1] ? decodeURIComponent((request.headers.get('Cookie') || '').match(/owner_key=([^;]+)/)[1]) : null);
  if (ownerKey2 && env.OWNER_SECRET && ownerKey2 === env.OWNER_SECRET) {
    effectivePlan = 'max';
  }

  // 使用量も返す
  const usage = await checkDeepUsage(env, tokenData.userId, effectivePlan);

  return jsonRes({
    valid: true,
    plan: effectivePlan,
    expiresAt: tokenData.expiresAt,
    promoDesc: tokenData.promoDesc,
    daysRemaining: Math.max(0, Math.ceil((new Date(tokenData.expiresAt) - new Date()) / 86400000)),
    deepUsage: usage,
    tester_tier: tokenData.tester_tier || null,
    tester_expires_at: tokenData.tester_expires_at || null,
  });
}

async function handleTokenRedeem(request, env, ctx) {
  const body = await request.json();
  const { promoCode, deviceId } = body;

  if (!promoCode) return jsonRes({ error: 'Promo code required' }, 400);

  // クーポン一回限りチェック
  if (promoCode && env.SUPABASE_URL) {
    const ucRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/used_coupons?token_id=eq.${encodeURIComponent(deviceId || '')}&coupon_code=eq.${encodeURIComponent(promoCode.toUpperCase())}`,
      { headers: { 'apikey': env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}` } }
    );
    const ucRows = await ucRes.json();
    if (Array.isArray(ucRows) && ucRows.length > 0) {
      return jsonRes({ error: 'このコードはすでに使用済みです' }, 400);
    }
  }

  const promo = PROMO_CODES[promoCode.toUpperCase()];
  if (!promo) return jsonRes({ error: '無効なプロモコードです' }, 400);

  // deviceId がある場合、同一デバイスでの二重適用チェック
  if (deviceId) {
    const existing = await env.TOKEN_KV.get(`redeemed:${deviceId}:${promoCode.toUpperCase()}`);
    if (existing) {
      return jsonRes({ error: 'このコードは既に適用済みです', existingToken: existing }, 409);
    }
  }

  // トークン生成
  const tokenId = `goal_test_${generateId(24)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + promo.days * 86400000);

  const tokenData = {
    tokenId,
    plan: promo.plan,
    userId: deviceId || tokenId,
    promoCode: promoCode.toUpperCase(),
    promoDesc: promo.desc,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    revoked: false,
  };

  const ttl = promo.days * 86400 + 7 * 86400;
  await env.TOKEN_KV.put(`token:${tokenId}`, JSON.stringify(tokenData), { expirationTtl: ttl });

  if (deviceId) {
    await env.TOKEN_KV.put(`redeemed:${deviceId}:${promoCode.toUpperCase()}`, tokenId, { expirationTtl: ttl });
  }

  // Supabaseに同期
  if (ctx && env.SUPABASE_URL) {
    ctx.waitUntil(syncUserToSupabase(env, tokenData));
  }

  // 使用済み記録
  if (promoCode && env.SUPABASE_URL) {
    ctx.waitUntil(fetch(`${env.SUPABASE_URL}/rest/v1/used_coupons`, {
      method: 'POST',
      headers: { 'apikey': env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ token_id: deviceId || tokenId, coupon_code: promoCode.toUpperCase() })
    }));
  }

  return jsonRes({
    token: tokenId,
    plan: promo.plan,
    desc: promo.desc,
    expiresAt: expiresAt.toISOString(),
    daysRemaining: promo.days,
  });
}


// ═══════ TESTER ═══════

async function handleTesterApply(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const body = await request.json();
  const { tester_code } = body;

  if (!tester_code || !TESTER_CODES[tester_code]) {
    return jsonRes({ error: '無効なテスターコードです' }, 400);
  }

  const config = TESTER_CODES[tester_code];

  // Total limit check
  const allTesters = await supabaseQuery(env, 'users', 'GET', {
    filters: 'tester_code=not.is.null',
    select: 'id',
  });
  if (allTesters && allTesters.length >= TESTER_TOTAL_LIMIT) {
    return jsonRes({ error: 'テスター枠が満員です' }, 429);
  }

  // Code-specific limit check
  const codeUsers = await supabaseQuery(env, 'users', 'GET', {
    filters: `tester_code=eq.${tester_code}`,
    select: 'id',
  });
  if (codeUsers && codeUsers.length >= config.max_uses) {
    return jsonRes({ error: 'このコードは使用上限に達しました' }, 429);
  }

  // Check if user already has tester code
  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'User not found' }, 404);

  const userRes = await supabaseQuery(env, 'users', 'GET', {
    filters: `id=eq.${userId}`,
    select: 'tester_code',
  });
  if (userRes?.[0]?.tester_code) {
    return jsonRes({ error: '既にテスターコードが適用されています' }, 400);
  }

  // Apply tester code
  const expiresAt = new Date(Date.now() + TESTER_DURATION_HOURS * 60 * 60 * 1000).toISOString();
  await supabaseQuery(env, 'users', 'PATCH', {
    filters: `id=eq.${userId}`,
    body: { plan: config.plan, tester_tier: tester_code, tester_code: tester_code, tester_expires_at: expiresAt },
  });

  // Also update KV token data
  const tokenData = JSON.parse(await env.TOKEN_KV.get(`token:${auth.tokenId}`) || '{}');
  tokenData.plan = config.plan;
  tokenData.tester_tier = tester_code;
  tokenData.tester_expires_at = expiresAt;
  await env.TOKEN_KV.put(`token:${auth.tokenId}`, JSON.stringify(tokenData), { expirationTtl: 365 * 86400 });

  return jsonRes({ status: 'success', plan: config.plan, expires_at: expiresAt, tier: tester_code });
}


// ═══════ USAGE ═══════

async function handleUsageGet(request, env, ctx) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const usage = await checkDeepUsage(env, auth.userId, auth.plan);

  // Supabaseに使用量同期（非同期）
  if (ctx && env.SUPABASE_URL) {
    ctx.waitUntil(syncUsageToSupabase(env, auth.tokenId, getMonthKey(), usage.used, 0));
  }

  // Freeプランのモデル別使用量
  const model_usage = {};
  if (auth.plan === 'free') {
    for (const m of ['claude', 'gemini', 'gpt']) {
      const used = await getFreeModelUsage(auth.tokenId, m, env);
      const limit = FREE_MODEL_LIMITS[m];
      model_usage[m] = { used, limit, remaining: Math.max(0, limit - used) };
    }
  }

  return jsonRes({
    plan: auth.plan,
    month: getMonthKey(),
    deep: usage,
    model_usage,
  });
}


// ═══════ STRIPE CHECKOUT ═══════

async function handleCheckoutCreate(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const body = await request.json();
  const { plan } = body;

  const priceId = STRIPE_PRICE_IDS[plan];
  if (!priceId) {
    return jsonRes({ error: '無効なプランです。pro, premium, max, annual, premium_annual, max_annual のいずれかを指定してください' }, 400);
  }

  // Stripe Checkout Session作成（REST API直接呼び出し）
  const params = new URLSearchParams();
  params.append('mode', 'subscription');
  params.append('line_items[0][price]', priceId);
  params.append('line_items[0][quantity]', '1');
  params.append('success_url', STRIPE_SUCCESS_URL);
  params.append('cancel_url', STRIPE_CANCEL_URL);
  params.append('metadata[tokenId]', auth.tokenId);
  params.append('metadata[plan]', plan);

  // 初回割引クーポン自動適用（月額プランのみ）
  if (plan === 'pro' || plan === 'premium') {
    params.append('discounts[0][coupon]', 'LAUNCH500');
  } else if (plan === 'max') {
    params.append('discounts[0][coupon]', 'LAUNCHMAX');
  }

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const session = await res.json();
  if (!res.ok) {
    console.error('Stripe Checkout error:', session);
    return jsonRes({ error: session.error?.message || 'Stripe error' }, res.status);
  }

  return jsonRes({ url: session.url, sessionId: session.id });
}

async function handleCheckoutPortal(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  // KVからstripeCustomerIdを取得
  const tokenData = await env.TOKEN_KV.get(`token:${auth.tokenId}`, 'json');
  if (!tokenData?.stripeCustomerId) {
    return jsonRes({ error: 'Stripe顧客情報が見つかりません。先に決済を完了してください' }, 400);
  }

  const params = new URLSearchParams();
  params.append('customer', tokenData.stripeCustomerId);
  params.append('return_url', STRIPE_SUCCESS_URL.replace('?checkout=success', ''));

  const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const session = await res.json();
  if (!res.ok) {
    console.error('Stripe Portal error:', session);
    return jsonRes({ error: session.error?.message || 'Stripe error' }, res.status);
  }

  return jsonRes({ url: session.url });
}

async function handleStripeWebhook(request, env, ctx) {
  const payload = await request.text();
  const sigHeader = request.headers.get('Stripe-Signature') || '';

  // 署名検証
  const isValid = await verifyStripeSignature(payload, sigHeader, env.STRIPE_WEBHOOK_SECRET);
  if (!isValid) {
    console.error('Stripe webhook signature verification failed');
    return new Response('Invalid signature', { status: 400 });
  }

  // タイムスタンプ検証（リプレイ攻撃防止）
  const timestamp = request.headers.get('stripe-signature')?.match(/t=(\d+)/)?.[1];
  if (!timestamp) {
    return jsonRes({ error: 'Missing timestamp' }, 400);
  }
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
  if (Math.abs(age) > 300) {
    return jsonRes({ error: 'Webhook timestamp too old' }, 400);
  }

  const event = JSON.parse(payload);

  // べき等性チェック（同じイベントの重複処理を防ぐ）
  const eventKey = `stripe_event:${event.id}`;
  const processed = await env.TOKEN_KV.get(eventKey);
  if (processed) {
    return new Response('Already processed', { status: 200 });
  }
  await env.TOKEN_KV.put(eventKey, '1', { expirationTtl: 86400 }); // 24時間保持

  // checkout.session.completed — 決済完了
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const tokenId = session.metadata?.tokenId;
    if (!tokenId) {
      console.error('Webhook: tokenId not found in metadata');
      return new Response('OK', { status: 200 });
    }

    const plan = session.metadata?.plan || 'pro';
    const tokenData = await env.TOKEN_KV.get(`token:${tokenId}`, 'json');
    if (!tokenData) {
      console.error('Webhook: token not found in KV:', tokenId);
      return new Response('OK', { status: 200 });
    }

    // KV更新：プラン昇格、有効期限無期限化、Stripe情報保存
    tokenData.plan = plan;
    tokenData.expiresAt = null; // サブスク有効中は無期限
    tokenData.stripeCustomerId = session.customer;
    tokenData.stripeSubscriptionId = session.subscription;
    tokenData.paidPlan = plan;
    tokenData.paidAt = new Date().toISOString();

    await env.TOKEN_KV.put(`token:${tokenId}`, JSON.stringify(tokenData));
    console.log(`Webhook: token ${tokenId} upgraded to ${plan}`);

    // Supabaseに同期
    if (ctx && env.SUPABASE_URL) {
      ctx.waitUntil(syncUserToSupabase(env, tokenData));
    }

    // Supabase直接更新（stripe情報 + plan_updated_at）
    try {
      await fetch(`${env.SUPABASE_URL}/rest/v1/users?token_id=eq.${tokenId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          plan: plan,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          plan_updated_at: new Date().toISOString()
        })
      });
    } catch(e) { /* Supabase sync failure is non-blocking */ }
  }

  // customer.subscription.deleted — 解約
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const customerId = subscription.customer;

    // customerId からトークンを探す（全トークン検索は非効率なのでcustomer逆引きを使う）
    const tokenId = await env.TOKEN_KV.get(`stripe_customer:${customerId}`);
    if (tokenId) {
      const tokenData = await env.TOKEN_KV.get(`token:${tokenId}`, 'json');
      if (tokenData) {
        tokenData.plan = 'free';
        tokenData.paidPlan = null;
        tokenData.stripeSubscriptionId = null;
        tokenData.cancelledAt = new Date().toISOString();
        // 解約後30日間は猶予（即座にfreeにしない場合はここを調整）
        await env.TOKEN_KV.put(`token:${tokenId}`, JSON.stringify(tokenData));
        console.log(`Webhook: subscription cancelled for ${tokenId}, downgraded to free`);

        // Supabaseに同期
        if (ctx && env.SUPABASE_URL) {
          ctx.waitUntil(syncUserToSupabase(env, tokenData));
        }

        // Supabase直接更新（解約 → free降格）
        try {
          await fetch(`${env.SUPABASE_URL}/rest/v1/users?token_id=eq.${tokenId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': env.SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              plan: 'free',
              cancelled_at: new Date().toISOString(),
              plan_updated_at: new Date().toISOString()
            })
          });
        } catch(e) { /* Supabase sync failure is non-blocking */ }
      }
    }
  }

  // checkout.session.completed時にcustomer逆引きも保存
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (session.customer && session.metadata?.tokenId) {
      await env.TOKEN_KV.put(`stripe_customer:${session.customer}`, session.metadata.tokenId);
    }
  }

  return new Response('OK', { status: 200 });
}

// Stripe Webhook署名検証（Web Crypto API）
async function verifyStripeSignature(payload, sigHeader, secret) {
  try {
    const parts = {};
    sigHeader.split(',').forEach(item => {
      const [key, value] = item.split('=');
      parts[key.trim()] = value;
    });

    const timestamp = parts['t'];
    const signature = parts['v1'];
    if (!timestamp || !signature) return false;

    // タイムスタンプが5分以上古い場合は拒否
    const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
    if (age > 300) return false;

    // HMAC-SHA256で署名検証
    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
    const expectedSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

    return expectedSig === signature;
  } catch (e) {
    console.error('Signature verification error:', e);
    return false;
  }
}


// ═══════ GOALS & HISTORY HANDLERS ═══════

async function getUserIdFromToken(env, tokenId) {
  const users = await supabaseQuery(env, 'users', 'GET', {
    filters: `token_id=eq.${encodeURIComponent(tokenId)}`,
    select: 'id',
  });
  return users?.[0]?.id || null;
}

async function handleGoalsList(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);

  const goals = await supabaseQuery(env, 'goals', 'GET', {
    filters: `user_id=eq.${userId}&order=created_at.desc`,
  });

  return jsonRes({ goals: goals || [] });
}

async function handleGoalCreate(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);

  const body = await request.json();
  const { title, description, targetDate } = body;
  if (!title) return jsonRes({ error: 'タイトルは必須です' }, 400);

  const goal = await supabaseQuery(env, 'goals', 'POST', {
    body: {
      user_id: userId,
      title,
      description: description || null,
      target_date: targetDate || null,
    },
  });

  return jsonRes({ goal: goal?.[0] || null }, 201);
}

async function handleGoalUpdate(request, env, url) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);

  const goalId = url.pathname.split('/').pop();
  const body = await request.json();

  const updates = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.status !== undefined) updates.status = body.status;
  if (body.progress !== undefined) updates.progress = body.progress;
  if (body.targetDate !== undefined) updates.target_date = body.targetDate;
  if (body.lastMilestonePct !== undefined) updates.last_milestone_pct = body.lastMilestonePct;

  const result = await supabaseQuery(env, 'goals', 'PATCH', {
    filters: `id=eq.${goalId}&user_id=eq.${userId}`,
    body: updates,
  });

  return jsonRes({ goal: result?.[0] || null });
}

async function handleGoalDelete(request, env, url) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);

  const goalId = url.pathname.split('/').pop();
  await supabaseQuery(env, 'goals', 'DELETE', {
    filters: `id=eq.${goalId}&user_id=eq.${userId}`,
  });

  return jsonRes({ deleted: true });
}

async function handleSuggestRoles(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const body = await request.json();
  const { goal_title, goal_why } = body;
  if (!goal_title) return jsonRes({ error: 'goal_title required' }, 400);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [{
          role: 'user',
          content: `ゴール「${goal_title}」（理由：${goal_why || '未設定'}）に最適なコーチングロールを3つ提案。各ロールはアイコン（絵文字1つ）・名前（8文字以内）・説明（20文字以内）。JSON形式で返却：{"suggestions":[{"icon":"📚","name":"学習コーチ","description":"計画的な学習管理と弱点分析"}]}`
        }],
        max_tokens: 300,
        response_format: { type: 'json_object' }
      })
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    return jsonRes(parsed);
  } catch(e) {
    return jsonRes({ suggestions: [
      { icon: '🎯', name: '万能コーチ', description: 'バランスの取れた総合支援' },
      { icon: '🔥', name: 'スパルタ', description: '厳しく追い込む' },
      { icon: '🤝', name: '伴走者', description: '寄り添い型サポート' }
    ]});
  }
}

async function handleHistoryGet(request, env, url) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);

  const params = url.searchParams;
  const limit = Math.min(parseInt(params.get('limit') || '50'), 200);
  const goalId = params.get('goalId');

  const sessionId = params.get('sessionId');
  const listSessions = params.get('sessions');

  // セッション一覧モード
  if (listSessions === 'true') {
    const sessions = await supabaseQuery(env, 'chat_messages', 'GET', {
      filters: `user_id=eq.${userId}${goalId ? '&goal_id=eq.' + goalId : ''}&order=created_at.desc`,
      select: 'session_id,content,role,created_at',
    });
    // セッションごとにグループ化して最初のメッセージを返す
    const sessionMap = {};
    (sessions || []).forEach(m => {
      const sid = m.session_id || 'default';
      if (!sessionMap[sid]) sessionMap[sid] = { sessionId: sid, firstMsg: '', date: m.created_at, count: 0 };
      sessionMap[sid].count++;
      if (m.role === 'user' && !sessionMap[sid].firstMsg) sessionMap[sid].firstMsg = (m.content || '').substring(0, 40);
    });
    return jsonRes({ sessions: Object.values(sessionMap).slice(0, 50) });
  }

  let filters = `user_id=eq.${userId}&order=created_at.desc&limit=${limit}`;
  if (goalId) filters += `&goal_id=eq.${goalId}`;
  if (sessionId) filters += `&session_id=eq.${sessionId}`;

  const messages = await supabaseQuery(env, 'chat_messages', 'GET', { filters });

  return jsonRes({ messages: messages || [] });
}

async function handleHistorySave(request, env, ctx) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);

  const body = await request.json();
  const { messages, sessionId } = body; // [{role, content, goalId, aiModel, messageType}]
  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonRes({ error: 'messages配列が必要です' }, 400);
  }

  const rows = messages.map(m => ({
    user_id: userId,
    goal_id: m.goalId || null,
    session_id: sessionId || m.sessionId || null,
    role: m.role,
    content: (m.content || '').substring(0, 50000),
    ai_model: m.aiModel || null,
    message_type: m.messageType || 'chat',
  }));

  const result = await supabaseQuery(env, 'chat_messages', 'POST', { body: rows });

  // 非同期で会話テーマ自動タグ付け
  if (ctx && ctx.waitUntil && sessionId && messages.length >= 2) {
    ctx.waitUntil(autoTagSession(sessionId, messages, env));
  }

  return jsonRes({ saved: result?.length || 0 });
}

async function autoTagSession(sessionId, messages, env) {
  try {
    if (!messages || messages.length < 2) return;
    const context = messages.slice(0, 6).map(m => m.content || '').join('\n').slice(0, 500);
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-5-nano', messages: [{ role: 'user', content: `以下の会話のテーマを1つだけ、5文字以内の日本語タグで返してください。タグのみを返してください。\n\n${context}` }], max_tokens: 20 })
    });
    const data = await res.json();
    const tag = (data.choices?.[0]?.message?.content || '').trim();
    if (tag && tag.length <= 10) {
      await supabaseQuery(env, 'chat_messages', 'PATCH', {
        filters: `session_id=eq.${sessionId}`,
        body: { session_tag: tag }
      });
    }
  } catch(e) {}
}


// ═══════ SUPABASE HELPERS ═══════

function supabaseHeaders(env) {
  return {
    'apikey': env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
}

async function supabaseQuery(env, table, method, { filters, body, select } = {}) {
  let url = `${env.SUPABASE_URL}/rest/v1/${table}`;
  const params = [];
  if (filters) params.push(filters);
  if (select) params.push(`select=${select}`);
  if (params.length) url += `?${params.join('&')}`;

  const opts = { method, headers: supabaseHeaders(env) };
  if (body && (method === 'POST' || method === 'PATCH')) {
    opts.body = JSON.stringify(body);
  }
  // UPSERT用
  if (method === 'POST' && body) {
    opts.headers['Prefer'] = 'return=representation,resolution=merge-duplicates';
  }

  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.text();
    console.error(`Supabase ${method} ${table} error:`, err);
    return null;
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ユーザーをSupabaseに同期（KVのtokenDataをSupabaseにも保存）
async function syncUserToSupabase(env, tokenData) {
  try {
    await supabaseQuery(env, 'users', 'POST', {
      body: {
        token_id: tokenData.tokenId,
        device_id: tokenData.userId !== tokenData.tokenId ? tokenData.userId : null,
        plan: tokenData.plan,
        promo_code: tokenData.promoCode || null,
        promo_desc: tokenData.promoDesc || null,
        stripe_customer_id: tokenData.stripeCustomerId || null,
        stripe_subscription_id: tokenData.stripeSubscriptionId || null,
        paid_plan: tokenData.paidPlan || null,
        paid_at: tokenData.paidAt || null,
        cancelled_at: tokenData.cancelledAt || null,
        expires_at: tokenData.expiresAt || null,
        revoked: tokenData.revoked || false,
      },
      filters: 'on_conflict=token_id',
    });
  } catch (e) {
    console.error('syncUserToSupabase error:', e);
  }
}

// チャットメッセージをSupabaseに保存
async function saveChatMessage(env, tokenId, role, content, aiModel, goalId, messageType) {
  try {
    // ユーザーIDをtoken_idから取得
    const users = await supabaseQuery(env, 'users', 'GET', {
      filters: `token_id=eq.${encodeURIComponent(tokenId)}`,
      select: 'id',
    });
    if (!users || !users[0]) return;

    await supabaseQuery(env, 'chat_messages', 'POST', {
      body: {
        user_id: users[0].id,
        goal_id: goalId || null,
        role,
        content: content.substring(0, 50000), // 50KB上限
        ai_model: aiModel || null,
        message_type: messageType || 'chat',
      },
    });
  } catch (e) {
    console.error('saveChatMessage error:', e);
  }
}

// ディープ分析結果をSupabaseに保存
async function saveDeepAnalysis(env, tokenId, analysisType, data) {
  try {
    const users = await supabaseQuery(env, 'users', 'GET', {
      filters: `token_id=eq.${encodeURIComponent(tokenId)}`,
      select: 'id',
    });
    if (!users || !users[0]) return;

    await supabaseQuery(env, 'deep_analyses', 'POST', {
      body: {
        user_id: users[0].id,
        goal_id: data.goalId || null,
        analysis_type: analysisType,
        input_text: data.input || null,
        gemini_result: data.gemini || null,
        gpt_result: data.gpt || null,
        claude_result: data.claude || null,
        final_result: data.final || null,
      },
    });
  } catch (e) {
    console.error('saveDeepAnalysis error:', e);
  }
}

// 使用量をSupabaseに同期
async function syncUsageToSupabase(env, tokenId, month, deepCount, chatCount) {
  try {
    const users = await supabaseQuery(env, 'users', 'GET', {
      filters: `token_id=eq.${encodeURIComponent(tokenId)}`,
      select: 'id',
    });
    if (!users || !users[0]) return;

    await supabaseQuery(env, 'usage_tracking', 'POST', {
      body: {
        user_id: users[0].id,
        month,
        deep_count: deepCount,
        chat_count: chatCount,
      },
      filters: 'on_conflict=user_id,month',
    });
  } catch (e) {
    console.error('syncUsageToSupabase error:', e);
  }
}


// ═══════ DB MIGRATION (admin only) ═══════

// ═══════ VOICE TRANSCRIPTION ═══════

async function handleAvatarUpload(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const body = await request.json();
  const { avatar_base64 } = body;

  if (!avatar_base64 || avatar_base64.length > 7_000_000) {
    return jsonRes({ error: '画像サイズは5MB以下にしてください' }, 400);
  }
  if (!avatar_base64.startsWith('data:image/')) {
    return jsonRes({ error: '画像形式が不正です' }, 400);
  }

  // Supabaseのusersテーブルに保存
  const supabaseRes = await fetch(`${env.SUPABASE_URL}/rest/v1/users?token_id=eq.${auth.tokenId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ avatar_base64 }),
  });

  if (!supabaseRes.ok) {
    return jsonRes({ error: 'アバター保存に失敗しました' }, 500);
  }

  return jsonRes({ success: true });
}

async function handleVoiceTranscribe(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const rl = await checkRateLimit(env, auth.userId);
  if (!rl.ok) return jsonRes({ error: 'Rate limit exceeded' }, 429);

  const body = await request.json();
  const { audio, mimeType } = body;
  if (!audio) return jsonRes({ error: 'audio (base64) is required' }, 400);

  // base64 → binary
  const binaryStr = atob(audio);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

  // Determine file extension from mime type
  const ext = (mimeType || 'audio/webm').includes('mp4') ? 'mp4'
            : (mimeType || 'audio/webm').includes('ogg') ? 'ogg' : 'webm';

  // Build multipart form data manually for Cloudflare Workers
  const boundary = '----FormBoundary' + generateId(16);
  const formParts = [
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.${ext}"\r\nContent-Type: ${mimeType || 'audio/webm'}\r\n\r\n`,
    bytes,
    `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1`,
    `\r\n--${boundary}--\r\n`,
  ];

  // Concatenate parts into single ArrayBuffer
  const encoder = new TextEncoder();
  const parts = [
    encoder.encode(formParts[0]),
    formParts[1],
    encoder.encode(formParts[2]),
    encoder.encode(formParts[3]),
    encoder.encode(formParts[4]),
  ];
  const totalLen = parts.reduce((sum, p) => sum + p.byteLength, 0);
  const combined = new Uint8Array(totalLen);
  let offset = 0;
  for (const p of parts) { combined.set(new Uint8Array(p.buffer || p), offset); offset += p.byteLength; }

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: combined,
  });

  const data = await res.json();
  if (!res.ok) {
    return jsonRes({ error: data.error?.message || 'Whisper API error' }, res.status);
  }

  return jsonRes({ text: data.text || '' });
}


// ═══════ FEEDBACKS ═══════

async function handleFeedbackSave(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);

  const body = await request.json();
  const { summary, rawChat } = body;
  if (!summary) return jsonRes({ error: 'summary is required' }, 400);

  // AI感情分析
  let sentiment = 'neutral';
  try {
    const sentRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 10,
        messages: [{ role: 'user', content: `以下のフィードバックの感情を positive/neutral/negative の1単語だけで答えてください：「${summary || JSON.stringify(rawChat)}」` }]
      })
    });
    const sentData = await sentRes.json();
    const raw = (sentData.content?.[0]?.text || '').trim().toLowerCase();
    if (['positive','neutral','negative'].includes(raw)) sentiment = raw;
  } catch(e) {}

  const result = await supabaseQuery(env, 'feedbacks', 'POST', {
    body: {
      user_id: userId,
      summary,
      raw_chat: rawChat || null,
      status: 'new',
      sentiment,
      source: body.source || 'chat',
      nps_score: body.nps_score || null,
      feature_tag: body.feature_tag || null,
      is_beta: body.is_beta || false,
      device: body.device || 'unknown',
      platform: body.platform || 'unknown',
      screen_width: body.screen_width || null,
      app_version: body.app_version || null,
      tester_tier: body.tester_tier || null,
    },
  });

  return jsonRes({ feedback: result?.[0] || null }, 201);
}

async function handleAdminTesters(request, env) {
  const adminAuth = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!adminAuth || !(await safeCompare(adminAuth, env.TOKEN_SECRET))) {
    return jsonRes({ error: 'Unauthorized' }, 401);
  }

  const testers = await supabaseQuery(env, 'users', 'GET', { params: 'tester_code=not.is.null&select=token_id,tester_code,tester_tier,plan,tester_expires_at' }) || [];

  const byTier = {};
  for (const [code, config] of Object.entries(TESTER_CODES)) {
    byTier[code] = { used: testers.filter(t => t.tester_code === code).length, max: config.max_uses, plan: config.plan };
  }

  const now = new Date();
  const active = testers.filter(t => t.tester_expires_at && new Date(t.tester_expires_at) > now);
  const expired = testers.length - active.length;

  return jsonRes({
    total_testers: testers.length,
    total_limit: TESTER_TOTAL_LIMIT,
    by_tier: byTier,
    active_count: active.length,
    expired_count: expired
  });
}

async function handleFeedbackList(request, env) {
  // 管理者認証
  const adminAuth = request.headers.get('X-Admin-Secret');
  if (!adminAuth) {
    // 通常ユーザーは自分のフィードバックのみ
    const auth = await authenticateRequest(request, env);
    if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
    const userId = await getUserIdFromToken(env, auth.tokenId);
    if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);
    const feedbacks = await supabaseQuery(env, 'feedbacks', 'GET', {
      filters: `user_id=eq.${userId}&order=created_at.desc`,
    });
    return jsonRes({ feedbacks: feedbacks || [] });
  }

  // 管理者は全件取得（定数時間比較）
  if (!(await safeCompare(adminAuth, env.TOKEN_SECRET))) {
    return jsonRes({ error: 'Unauthorized' }, 403);
  }
  const feedbacks = await supabaseQuery(env, 'feedbacks', 'GET', {
    filters: 'order=created_at.desc&limit=200',
  });
  return jsonRes({ feedbacks: feedbacks || [] });
}


// ═══════ AI MEMO ═══════

async function handleAIMemoGenerate(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const body = await request.json();
  const { type, goal_id, trigger } = body;

  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'User not found' }, 404);

  // Get profile
  const users = await supabaseQuery(env, 'users', 'GET', { params: `id=eq.${userId}&select=*` });
  const profile = users?.[0];
  if (!profile) return jsonRes({ error: 'Profile not found' }, 404);

  let memoText = '';

  if (type === 'goal' && goal_id) {
    // Get goal
    const goals = await supabaseQuery(env, 'goals', 'GET', { params: `id=eq.${goal_id}&select=*` });
    const goal = goals?.[0];
    if (!goal) return jsonRes({ error: 'Goal not found' }, 404);

    // Generate memo with GPT-5 mini
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-5-mini',
          messages: [{ role: 'user', content: `以下の情報からAI理解メモを生成。200字以内で簡潔に。\nユーザー: ${profile.nickname||'未設定'}, ${profile.occupation||''}, ${profile.age||''}歳, MBTI:${profile.mbti||''}\n強み:${profile.strengths||''} 弱み:${profile.weaknesses||''}\nゴール:${goal.title} 理由:${goal.why||''} 期限:${goal.target_date||'未設定'}\nAIロール:${goal.ai_role_icon||''} ${goal.ai_role_name||'万能コーチ'}\n\nフォーマット:\n【あなたについて】...\n【このゴールについて】...\n【AIの行動方針】3-5項目` }],
          max_tokens: 400
        })
      });
      const data = await res.json();
      memoText = data.choices?.[0]?.message?.content || '';
    } catch(e) { memoText = ''; }

    // Save to goals table
    if (memoText) {
      await supabaseQuery(env, 'goals', 'PATCH', {
        params: `id=eq.${goal_id}`,
        body: { ai_memo: memoText, ai_memo_updated_at: new Date().toISOString() }
      });
    }
  } else if (type === 'home') {
    // Generate home memo
    try {
      const goalsRes = await supabaseQuery(env, 'goals', 'GET', { params: `user_id=eq.${userId}&select=title,progress,target_date&archived=eq.false` });
      const goalsList = (goalsRes || []).map(g => `🎯 ${g.title}（${g.progress||0}%）`).join('\n');

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-5-mini',
          messages: [{ role: 'user', content: `以下の情報からAI理解メモを生成。200字以内で簡潔に。\nユーザー: ${profile.nickname||'未設定'}, ${profile.occupation||''}, ${profile.age||''}歳\nMBTI:${profile.mbti||''} 強み:${profile.strengths||''} 弱み:${profile.weaknesses||''}\n価値観:${profile.values||''} ビジョン:${profile.vision||''}\nゴール:\n${goalsList||'なし'}\n\nフォーマット:\n【あなたについて】...\n【取り組み中のゴール】...\n【AIの行動方針】3-5項目` }],
          max_tokens: 400
        })
      });
      const data = await res.json();
      memoText = data.choices?.[0]?.message?.content || '';
    } catch(e) { memoText = ''; }

    // Save to users table
    if (memoText) {
      await supabaseQuery(env, 'users', 'PATCH', {
        params: `id=eq.${userId}`,
        body: { ai_memo: memoText, ai_memo_updated_at: new Date().toISOString() }
      });
    }
  }

  return jsonRes({ memo: memoText, type, trigger });
}


// ═══════ SECURITY ═══════

async function safeCompare(a, b) {
  const encoder = new TextEncoder();
  const keyA = await crypto.subtle.importKey('raw', encoder.encode(a), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigA = await crypto.subtle.sign('HMAC', keyA, encoder.encode('compare'));
  const keyB = await crypto.subtle.importKey('raw', encoder.encode(b), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigB = await crypto.subtle.sign('HMAC', keyB, encoder.encode('compare'));
  const bufA = new Uint8Array(sigA);
  const bufB = new Uint8Array(sigB);
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) diff |= bufA[i] ^ bufB[i];
  return diff === 0;
}

// ═══════ HELPERS ═══════

function jsonRes(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}

function corsResponse(env, response, request) {
  const allowedOrigins = (env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:8080').split(',');
  const requestOrigin = request ? (request.headers.get('Origin') || '') : ''; // request origin を直接参照できないのでワイルドカード or 固定
  const headers = new Headers(response.headers);
  // プロダクションでは特定オリジンに変更
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) { headers.set('Access-Control-Allow-Origin', requestOrigin); } else if (!requestOrigin) { headers.set('Access-Control-Allow-Origin', allowedOrigins[0] || 'https://goal-ai-frontend.pages.dev'); } else { headers.set('Access-Control-Allow-Origin', 'null'); }
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Secret, X-Owner-Key');
  headers.set('Access-Control-Expose-Headers', 'X-RateLimit-Remaining, X-Model-Used, X-Show-NPS');
  headers.set('Access-Control-Max-Age', '86400');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ═══════ REFERRAL (友達紹介) ═══════

async function handleReferralCode(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  // 有料プランのみ紹介可能
  const paidPlans = ['pro','premium','max','annual','premium_annual','max_annual'];
  if (!paidPlans.includes(auth.plan)) {
    return jsonRes({ error: '有料プランのユーザーのみ紹介可能です', eligible: false }, 403);
  }

  // 既存コード確認 or 新規生成
  let code = await env.TOKEN_KV.get(`referral:code:${auth.tokenId}`);
  if (!code) {
    code = generateId(8).toUpperCase();
    await env.TOKEN_KV.put(`referral:code:${auth.tokenId}`, code, { expirationTtl: 365 * 86400 });
    await env.TOKEN_KV.put(`referral:owner:${code}`, auth.tokenId, { expirationTtl: 365 * 86400 });
  }
  return jsonRes({ code, eligible: true });
}

async function applyReferralReward(referrerTokenId, env) {
  try {
    const userId = await getUserIdFromToken(env, referrerTokenId);
    if (!userId) return;
    const users = await supabaseQuery(env, 'users', 'GET', { filters: `id=eq.${userId}`, select: 'plan,plan_expires_at' });
    const referrer = users?.[0];
    if (!referrer) return;
    const now = new Date();
    const currentExpiry = referrer.plan_expires_at ? new Date(referrer.plan_expires_at) : now;
    const base = currentExpiry > now ? currentExpiry : now;
    base.setMonth(base.getMonth() + 1);
    await supabaseQuery(env, 'users', 'PATCH', {
      filters: `id=eq.${userId}`,
      body: { plan_expires_at: base.toISOString(), plan: referrer.plan === 'free' ? 'pro' : referrer.plan }
    });
  } catch(e) {}
}

async function handleReferralApply(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const body = await request.json();
  const { code } = body;
  if (!code) return jsonRes({ error: '紹介コードを入力してください' }, 400);

  const referrerTokenId = await env.TOKEN_KV.get(`referral:owner:${code.toUpperCase()}`);
  if (!referrerTokenId) return jsonRes({ error: '無効な紹介コードです' }, 404);
  if (referrerTokenId === auth.tokenId) return jsonRes({ error: '自分のコードは使えません' }, 400);

  // 月1回制限チェック
  const monthKey = getMonthKey();
  const usedKey = `referral:used:${auth.tokenId}:${monthKey}`;
  if (await env.TOKEN_KV.get(usedKey)) return jsonRes({ error: '今月は既に紹介特典を利用済みです' }, 409);

  // 記録
  await env.TOKEN_KV.put(usedKey, '1', { expirationTtl: 35 * 86400 });
  await env.TOKEN_KV.put(`referral:applied:${auth.tokenId}`, referrerTokenId, { expirationTtl: 365 * 86400 });

  // 紹介者に報酬を自動付与（1ヶ月Pro延長）
  try { await applyReferralReward(referrerTokenId, env); } catch(e) {}

  return jsonRes({ ok: true, message: '紹介コードが適用されました。Pro以上のプランを選択すると初月75%OFFが適用されます。' });
}

async function handleReferralCreate(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const paidPlans = ['pro','premium','max','annual','premium_annual','max_annual'];
  if (!paidPlans.includes(auth.plan)) {
    return jsonRes({ error: '有料プランのユーザーのみ紹介可能です' }, 403);
  }

  const supaUrl = env.SUPABASE_URL, supaKey = env.SUPABASE_SERVICE_KEY;
  const headers = { 'apikey': supaKey, 'Authorization': `Bearer ${supaKey}`, 'Content-Type': 'application/json' };

  // 既存コード確認
  const userRes = await fetch(`${supaUrl}/rest/v1/users?token_id=eq.${encodeURIComponent(auth.tokenId)}&select=referral_code`, { headers });
  const users = await userRes.json();
  if (users.length && users[0].referral_code) {
    return jsonRes({ referral_code: users[0].referral_code });
  }

  // 新規コード生成
  const code = 'REF' + generateId(5).toUpperCase();
  await Promise.all([
    fetch(`${supaUrl}/rest/v1/users?token_id=eq.${encodeURIComponent(auth.tokenId)}`, {
      method: 'PATCH', headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ referral_code: code })
    }),
    fetch(`${supaUrl}/rest/v1/referrals`, {
      method: 'POST', headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ referrer_token_id: auth.tokenId, referral_code: code, status: 'pending' })
    })
  ]);
  return jsonRes({ referral_code: code });
}

async function handleReferralStatus(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const supaUrl = env.SUPABASE_URL, supaKey = env.SUPABASE_SERVICE_KEY;
  const headers = { 'apikey': supaKey, 'Authorization': `Bearer ${supaKey}` };

  const userRes = await fetch(`${supaUrl}/rest/v1/users?token_id=eq.${encodeURIComponent(auth.tokenId)}&select=referral_code,streak_count,streak_best`, { headers });
  const users = await userRes.json();
  if (!users.length) return jsonRes({ error: 'User not found' }, 404);

  let completed_count = 0;
  const referral_code = users[0].referral_code || null;
  if (referral_code) {
    const cntRes = await fetch(`${supaUrl}/rest/v1/referrals?referral_code=eq.${encodeURIComponent(referral_code)}&status=eq.completed&select=id`, { headers });
    completed_count = (await cntRes.json()).length;
  }
  return jsonRes({ referral_code, completed_count, streak_count: users[0].streak_count || 0, streak_best: users[0].streak_best || 0 });
}

// ═══════ STREAK UPDATE ═══════

async function updateStreak(tokenId, supabaseUrl, supabaseKey) {
  try {
    const today = new Date(Date.now() + 9 * 3600000).toISOString().split('T')[0]; // JST
    const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' };
    const res = await fetch(
      `${supabaseUrl}/rest/v1/users?token_id=eq.${encodeURIComponent(tokenId)}&select=streak_count,streak_best,last_active_date`,
      { headers }
    );
    const users = await res.json();
    if (!users.length) return;
    const user = users[0];
    if (user.last_active_date === today) return;

    const yesterday = new Date(Date.now() + 9 * 3600000 - 86400000).toISOString().split('T')[0];
    const streak = user.last_active_date === yesterday ? (user.streak_count || 0) + 1 : 1;
    const best = Math.max(streak, user.streak_best || 0);

    await fetch(`${supabaseUrl}/rest/v1/users?token_id=eq.${encodeURIComponent(tokenId)}`, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ streak_count: streak, streak_best: best, last_active_date: today })
    });
  } catch (e) { /* silent */ }
}

function generateId(length = 24) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => chars[b % chars.length]).join('');
}

function getMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthEndTtl() {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const diff = Math.ceil((endOfMonth - now) / 1000);
  return diff + 3 * 86400; // +3日バッファ
}
