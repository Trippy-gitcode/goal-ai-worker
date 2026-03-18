import { PLAN_LIMITS, FAIR_USE, RATE_LIMIT_WINDOW, RATE_LIMIT_MAX, FREE_MODEL_LIMITS } from './constants.js';
import { getDayKey, getMonthKey, getMonthEndTtl } from './helpers.js';

export async function checkRateLimit(env, userId) {
  const key = `rl:${userId}:${Math.floor(Date.now() / 1000 / RATE_LIMIT_WINDOW)}`;
  const current = parseInt(await env.TOKEN_KV.get(key) || '0');
  if (current >= RATE_LIMIT_MAX) {
    return { ok: false, remaining: 0 };
  }
  await env.TOKEN_KV.put(key, String(current + 1), { expirationTtl: RATE_LIMIT_WINDOW * 2 });
  return { ok: true, remaining: RATE_LIMIT_MAX - current - 1 };
}

export async function checkDeepUsage(env, userId, plan) {
  const monthKey = getMonthKey();
  const usageKey = `usage:deep:${userId}:${monthKey}`;
  const used = parseInt(await env.TOKEN_KV.get(usageKey) || '0');
  const limit = PLAN_LIMITS[plan]?.deep || PLAN_LIMITS.free.deep;
  return { used, limit, remaining: Math.max(0, limit - used) };
}

export async function checkDailyChatUsage(env, userId, plan) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  if (limits.chat >= 9999) return { ok: true, remaining: 9999 };
  const dayKey = getDayKey();
  const usageKey = `usage:chat:${userId}:${dayKey}`;
  const used = parseInt(await env.TOKEN_KV.get(usageKey) || '0');
  return { ok: used < limits.chat, used, limit: limits.chat, remaining: Math.max(0, limits.chat - used) };
}

export async function incrementDailyChatUsage(env, userId) {
  const dayKey = getDayKey();
  const usageKey = `usage:chat:${userId}:${dayKey}`;
  const used = parseInt(await env.TOKEN_KV.get(usageKey) || '0');
  await env.TOKEN_KV.put(usageKey, String(used + 1), { expirationTtl: 86400 * 2 });
}

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
  const key = `free_model:${tokenId}:${getDayKey()}:${model}`;
  return parseInt(await env.TOKEN_KV.get(key) || '0');
}

export async function incrementFreeModelUsage(tokenId, model, env) {
  const key = `free_model:${tokenId}:${getDayKey()}:${model}`;
  const current = await getFreeModelUsage(tokenId, model, env);
  await env.TOKEN_KV.put(key, String(current + 1), { expirationTtl: 86400 * 2 });
}

export async function canUseModel(tokenId, plan, model, env) {
  if (plan !== 'free') return { allowed: true, remaining: 9999 };
  const limit = FREE_MODEL_LIMITS[model];
  if (!limit) return { allowed: true, remaining: 9999 };
  const used = await getFreeModelUsage(tokenId, model, env);
  return { allowed: used < limit, remaining: Math.max(0, limit - used) };
}

export async function checkFairUse(env, userId) {
  const hourKey = `fu:h:${userId}:${Math.floor(Date.now() / 3600000)}`;
  const dayKey = `fu:d:${userId}:${getDayKey()}`;
  const hourly = parseInt(await env.TOKEN_KV.get(hourKey) || '0');
  const daily = parseInt(await env.TOKEN_KV.get(dayKey) || '0');
  const throttle = hourly >= FAIR_USE.hourly || daily >= FAIR_USE.daily;
  await env.TOKEN_KV.put(hourKey, String(hourly + 1), { expirationTtl: 7200 });
  await env.TOKEN_KV.put(dayKey, String(daily + 1), { expirationTtl: 86400 * 2 });
  return { throttle, delayMs: throttle ? FAIR_USE.delayMs : 0 };
}

export async function incrementDeepUsage(env, userId) {
  const monthKey = getMonthKey();
  const usageKey = `usage:deep:${userId}:${monthKey}`;
  const used = parseInt(await env.TOKEN_KV.get(usageKey) || '0');
  const expiry = getMonthEndTtl();
  await env.TOKEN_KV.put(usageKey, String(used + 1), { expirationTtl: expiry });
}
