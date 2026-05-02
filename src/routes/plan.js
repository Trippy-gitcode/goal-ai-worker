import { authenticateRequest } from '../middleware/auth.js';
import { jsonRes, safePgrestValue } from '../utils/helpers.js';
import { getPlanConfig, getCurrentMonth } from '../utils/constants.js';
import { checkRateLimit } from '../utils/rate-limit.js';
import { safeError } from '../utils/safeLog.js';
// SUBAGENT-LAIS-INPUTGUARD-9ROUTES-V1 (2026-05-02、 Round 31 P4 #39 fix):
//   plan.js は現状 body parse 無し (status は GET)、 ただし parseBodyGuarded import を
//   保持して将来 plan change endpoint 追加時の漏れを防ぐ defensive import。
//   8 KB cap は plan change request 想定の合理上限 (mission spec 準拠)。
import { parseBodyGuarded } from '../middleware/input-guard.js';

export async function handlePlanStatus(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1: H-07 rate-limit roll-out
  const rl = await checkRateLimit(env, auth.userId);
  if (!rl.ok) return jsonRes({ error: 'Rate limit exceeded' }, 429);

  const config = getPlanConfig(auth.plan);
  const month = getCurrentMonth();
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_KEY;

  let usage = { turns_used: 0, current_amount: 0, cap_reached: false };
  try {
    // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1: D-02 PostgREST filter injection fix
    const res = await fetch(
      `${supabaseUrl}/rest/v1/usage_tracking?user_id=eq.${safePgrestValue(auth.userId)}&month=eq.${safePgrestValue(month)}&select=turns_used,current_amount,cap_reached`,
      { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
    );
    const data = await res.json();
    if (data?.[0]) usage = data[0];
  } catch (e) {
    // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 — Wave 1 #52 P1 #7 unstructured log fix
    safeError('plan.status_fetch_failed', e);
  }

  const percent = config.cap > 0 ? Math.round((usage.current_amount / config.cap) * 100) : 0;

  // ET週間使用量（Ultra専用）
  let et = null;
  if (config.et_weekly_limit) {
    const weekKey = getETWeekKey();
    const etUsed = parseInt(await env.TOKEN_KV.get(`et:${auth.userId}:${weekKey}`) || '0');
    et = { used: etUsed, limit: config.et_weekly_limit, remaining: Math.max(0, config.et_weekly_limit - etUsed) };
  }

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
    ai_memo: config.ai_memo,
    et
  });
}

function getETWeekKey() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = jst.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  jst.setUTCDate(jst.getUTCDate() - diff);
  return `${jst.getUTCFullYear()}-W${String(Math.ceil(jst.getUTCDate() / 7)).padStart(2, '0')}`;
}

export async function incrementETUsage(env, userId) {
  const weekKey = getETWeekKey();
  const kvKey = `et:${userId}:${weekKey}`;
  const current = parseInt(await env.TOKEN_KV.get(kvKey) || '0');
  await env.TOKEN_KV.put(kvKey, String(current + 1), { expirationTtl: 86400 * 8 });
  return current + 1;
}

export async function checkETLimit(env, userId, plan) {
  const config = getPlanConfig(plan);
  if (!config.et_weekly_limit) return { ok: true };
  const weekKey = getETWeekKey();
  const used = parseInt(await env.TOKEN_KV.get(`et:${userId}:${weekKey}`) || '0');
  return { ok: used < config.et_weekly_limit, used, limit: config.et_weekly_limit };
}
