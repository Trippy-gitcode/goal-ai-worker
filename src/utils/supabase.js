// SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 (2026-05-01) — Wave 1 #52 P1 finding #7:
//   unstructured console.error を safeError (PII-aware structured) に置換。
//   request_id / route 等の context が落ちないよう、event 名を明示。
import { safeError } from './safeLog.js';

export function supabaseHeaders(env) {
  return {
    'apikey': env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
}

export async function supabaseQuery(env, table, method, { filters, body, select, params } = {}) {
  let url = `${env.SUPABASE_URL}/rest/v1/${table}`;
  const queryParts = [];
  if (filters) queryParts.push(filters);
  if (params) queryParts.push(params);
  if (select) queryParts.push(`select=${select}`);
  if (queryParts.length) url += `?${queryParts.join('&')}`;

  const opts = { method, headers: supabaseHeaders(env) };
  if (body && (method === 'POST' || method === 'PATCH')) {
    opts.body = JSON.stringify(body);
  }
  if (method === 'POST' && body) {
    opts.headers['Prefer'] = 'return=representation,resolution=merge-duplicates';
  }

  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.text();
    safeError('supabase.query_error', new Error(err), { route: `${method} ${table}` });
    return null;
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function syncUserToSupabase(env, tokenData) {
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
    safeError('supabase.sync_user_failed', e);
  }
}

export async function saveChatMessage(env, tokenId, role, content, aiModel, goalId, messageType) {
  try {
    const users = await supabaseQuery(env, 'users', 'GET', {
      filters: `token_id=eq.${encodeURIComponent(tokenId)}`,
      select: 'id',
    });
    if (!users || !users[0]) return;
    await supabaseQuery(env, 'chat_messages', 'POST', {
      body: {
        user_id: users[0].id, goal_id: goalId || null,
        role, content: content.substring(0, 50000),
        ai_model: aiModel || null, message_type: messageType || 'chat',
      },
    });
  } catch (e) { safeError('supabase.save_chat_message_failed', e); }
}

export async function syncUsageToSupabase(env, tokenId, month, deepCount, chatCount) {
  try {
    const users = await supabaseQuery(env, 'users', 'GET', {
      filters: `token_id=eq.${encodeURIComponent(tokenId)}`,
      select: 'id',
    });
    if (!users || !users[0]) return;
    await supabaseQuery(env, 'usage_tracking', 'POST', {
      body: { user_id: users[0].id, month, deep_count: deepCount, chat_count: chatCount },
      filters: 'on_conflict=user_id,month',
    });
  } catch (e) { safeError('supabase.sync_usage_failed', e); }
}

export async function saveDeepAnalysis(env, tokenId, analysisType, data) {
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
  } catch (e) { safeError('supabase.save_deep_analysis_failed', e); }
}
