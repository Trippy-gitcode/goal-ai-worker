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
