import { PLAN_LIMITS, FAIR_USE, RATE_LIMIT_WINDOW, RATE_LIMIT_MAX, FREE_MODEL_LIMITS } from './constants.js';
import { getDayKey, getMonthKey, getMonthEndTtl } from './helpers.js';
import { supabaseHeaders } from './supabase.js';

// ═══════ Supabase Counter Helpers ═══════
// All writes go to Supabase. KV is used as read cache only (no puts).

async function sbIncrement(env, tokenId, counterType, counterKey) {
  if (!env.SUPABASE_URL) return kvFallbackIncrement(env, tokenId, counterType, counterKey);
  try {
    // Try RPC first (atomic increment)
    const url = `${env.SUPABASE_URL}/rest/v1/rpc/increment_counter`;
    const res = await fetch(url, {
      method: 'POST',
      headers: supabaseHeaders(env),
      body: JSON.stringify({ p_token_id: tokenId, p_type: counterType, p_key: counterKey }),
    });
    if (res.ok) {
      const data = await res.json();
      return typeof data === 'number' ? data : (data?.value || 1);
    }
    // Fallback: direct upsert if RPC doesn't exist
    return sbIncrementDirect(env, tokenId, counterType, counterKey);
  } catch (e) {
    console.error('sbIncrement error, falling back to KV:', e.message);
    return kvFallbackIncrement(env, tokenId, counterType, counterKey);
  }
}

async function sbIncrementDirect(env, tokenId, counterType, counterKey) {
  try {
    const url = `${env.SUPABASE_URL}/rest/v1/usage_counters`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...supabaseHeaders(env), 'Prefer': 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify({
        token_id: tokenId,
        counter_type: counterType,
        counter_key: counterKey,
        value: 1,
      }),
    });
    if (!res.ok) {
      return kvFallbackIncrement(env, tokenId, counterType, counterKey);
    }
    const rows = await res.json();
    return rows?.[0]?.value || 1;
  } catch (e) {
    return kvFallbackIncrement(env, tokenId, counterType, counterKey);
  }
}

async function sbGetCounter(env, tokenId, counterType, counterKey) {
  if (!env.SUPABASE_URL) return kvFallbackGet(env, tokenId, counterType, counterKey);
  try {
    const url = `${env.SUPABASE_URL}/rest/v1/usage_counters?token_id=eq.${encodeURIComponent(tokenId)}&counter_type=eq.${encodeURIComponent(counterType)}&counter_key=eq.${encodeURIComponent(counterKey)}&select=value`;
    const res = await fetch(url, { headers: supabaseHeaders(env) });
    if (!res.ok) return kvFallbackGet(env, tokenId, counterType, counterKey);
    const rows = await res.json();
    return rows?.[0]?.value || 0;
  } catch (e) {
    return kvFallbackGet(env, tokenId, counterType, counterKey);
  }
}

// KV fallback (when Supabase unavailable or table not yet created)
async function kvFallbackIncrement(env, tokenId, counterType, counterKey) {
  const key = `sb_fb:${tokenId}:${counterType}:${counterKey}`;
  const current = parseInt(await env.TOKEN_KV.get(key) || '0');
  try { await env.TOKEN_KV.put(key, String(current + 1), { expirationTtl: 86400 }); } catch(_) {}
  return current + 1;
}

async function kvFallbackGet(env, tokenId, counterType, counterKey) {
  const key = `sb_fb:${tokenId}:${counterType}:${counterKey}`;
  return parseInt(await env.TOKEN_KV.get(key) || '0');
}

// ═══════ Rate Limiting (was: KV put per request → now: Supabase) ═══════

export async function checkRateLimit(env, userId) {
  const windowKey = String(Math.floor(Date.now() / 1000 / RATE_LIMIT_WINDOW));
  // Increment via Supabase
  const current = await sbIncrement(env, userId, 'rate_limit', windowKey);
  if (current > RATE_LIMIT_MAX) {
    return { ok: false, remaining: 0 };
  }
  return { ok: true, remaining: RATE_LIMIT_MAX - current };
}

// ═══════ Deep Usage (monthly) ═══════

export async function checkDeepUsage(env, userId, plan) {
  const monthKey = getMonthKey();
  const used = await sbGetCounter(env, userId, 'deep', monthKey);
  const limit = PLAN_LIMITS[plan]?.deep || PLAN_LIMITS.free.deep;
  return { used, limit, remaining: Math.max(0, limit - used) };
}

export async function incrementDeepUsage(env, userId) {
  const monthKey = getMonthKey();
  await sbIncrement(env, userId, 'deep', monthKey);
}

// ═══════ Daily Chat Usage ═══════

export async function checkDailyChatUsage(env, userId, plan) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  if (limits.chat >= 9999) return { ok: true, remaining: 9999 };
  const dayKey = getDayKey();
  const used = await sbGetCounter(env, userId, 'chat_daily', dayKey);
  return { ok: used < limits.chat, used, limit: limits.chat, remaining: Math.max(0, limits.chat - used) };
}

export async function incrementDailyChatUsage(env, userId) {
  const dayKey = getDayKey();
  await sbIncrement(env, userId, 'chat_daily', dayKey);
}

// ═══════ Free Model Usage (daily per model) ═══════

export function getEffectiveModel(plan, category, used) {
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

export async function getFreeModelUsage(tokenId, model, env) {
  const dayKey = getDayKey();
  return sbGetCounter(env, tokenId, `free_model_${model}`, dayKey);
}

export async function incrementFreeModelUsage(tokenId, model, env) {
  const dayKey = getDayKey();
  await sbIncrement(env, tokenId, `free_model_${model}`, dayKey);
}

export async function canUseModel(tokenId, plan, model, env) {
  if (plan !== 'free') return { allowed: true, remaining: 9999 };
  const limit = FREE_MODEL_LIMITS[model];
  if (!limit) return { allowed: true, remaining: 9999 };
  const used = await getFreeModelUsage(tokenId, model, env);
  return { allowed: used < limit, remaining: Math.max(0, limit - used) };
}

// ═══════ Embedding Turn Count (was: KV emb_tc: → now: Supabase) ═══════

export async function incrementEmbeddingTurnCount(env, tokenId) {
  const dayKey = getDayKey();
  return sbIncrement(env, tokenId, 'emb_tc', dayKey);
}

// ═══════ Fair Use (hourly + weekly, was: KV 2 puts → now: Supabase) ═══════

export async function checkFairUse(env, userId) {
  const hourKey = String(Math.floor(Date.now() / 3600000));
  const weekKey = getWeekKey();
  // Increment both via Supabase
  const [hourly, weekly] = await Promise.all([
    sbIncrement(env, userId, 'fair_use_h', hourKey),
    sbIncrement(env, userId, 'fair_use_w', weekKey),
  ]);
  const throttle = hourly > FAIR_USE.hourly || weekly > (FAIR_USE.weekly_limit || 1500);
  return { throttle, delayMs: throttle ? FAIR_USE.delayMs : 0 };
}

function getWeekKey() {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}
