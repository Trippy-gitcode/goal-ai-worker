import { authenticateRequest, getUserIdFromToken } from '../middleware/auth.js';
import { jsonRes, generateId, getMonthKey } from '../utils/helpers.js';
import { supabaseQuery } from '../utils/supabase.js';

export async function handleReferralCode(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const paidPlans = ['pro','premium','max','annual','premium_annual','max_annual'];
  if (!paidPlans.includes(auth.plan)) return jsonRes({ error: '有料プランのユーザーのみ紹介可能です', eligible: false }, 403);
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
    await supabaseQuery(env, 'users', 'PATCH', { filters: `id=eq.${userId}`, body: { plan_expires_at: base.toISOString(), plan: referrer.plan === 'free' ? 'pro' : referrer.plan } });
  } catch(e) {}
}

export async function handleReferralApply(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const body = await request.json();
  const { code } = body;
  if (!code) return jsonRes({ error: '紹介コードを入力してください' }, 400);
  const referrerTokenId = await env.TOKEN_KV.get(`referral:owner:${code.toUpperCase()}`);
  if (!referrerTokenId) return jsonRes({ error: '無効な紹介コードです' }, 404);
  if (referrerTokenId === auth.tokenId) return jsonRes({ error: '自分のコードは使えません' }, 400);
  const monthKey = getMonthKey();
  const usedKey = `referral:used:${auth.tokenId}:${monthKey}`;
  if (await env.TOKEN_KV.get(usedKey)) return jsonRes({ error: '今月は既に紹介特典を利用済みです' }, 409);
  await env.TOKEN_KV.put(usedKey, '1', { expirationTtl: 35 * 86400 });
  await env.TOKEN_KV.put(`referral:applied:${auth.tokenId}`, referrerTokenId, { expirationTtl: 365 * 86400 });
  try { await applyReferralReward(referrerTokenId, env); } catch(e) {}
  return jsonRes({ ok: true, message: '紹介コードが適用されました。Pro以上のプランを選択すると初月75%OFFが適用されます。' });
}

export async function handleReferralCreate(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const paidPlans = ['pro','premium','max','annual','premium_annual','max_annual'];
  if (!paidPlans.includes(auth.plan)) return jsonRes({ error: '有料プランのユーザーのみ紹介可能です' }, 403);
  const supaUrl = env.SUPABASE_URL, supaKey = env.SUPABASE_SERVICE_KEY;
  const headers = { 'apikey': supaKey, 'Authorization': `Bearer ${supaKey}`, 'Content-Type': 'application/json' };
  const userRes = await fetch(`${supaUrl}/rest/v1/users?token_id=eq.${encodeURIComponent(auth.tokenId)}&select=referral_code`, { headers });
  const users = await userRes.json();
  if (users.length && users[0].referral_code) return jsonRes({ referral_code: users[0].referral_code });
  const code = 'REF' + generateId(5).toUpperCase();
  await Promise.all([
    fetch(`${supaUrl}/rest/v1/users?token_id=eq.${encodeURIComponent(auth.tokenId)}`, { method: 'PATCH', headers: { ...headers, 'Prefer': 'return=minimal' }, body: JSON.stringify({ referral_code: code }) }),
    fetch(`${supaUrl}/rest/v1/referrals`, { method: 'POST', headers: { ...headers, 'Prefer': 'return=minimal' }, body: JSON.stringify({ referrer_token_id: auth.tokenId, referral_code: code, status: 'pending' }) })
  ]);
  return jsonRes({ referral_code: code });
}

export async function handleReferralStatus(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const supaUrl = env.SUPABASE_URL, supaKey = env.SUPABASE_SERVICE_KEY;
  const headers = { 'apikey': supaKey, 'Authorization': `Bearer ${supaKey}` };
  const userRes = await fetch(`${supaUrl}/rest/v1/users?token_id=eq.${encodeURIComponent(auth.tokenId)}&select=referral_code,streak_count,streak_best`, { headers });
  const users = await userRes.json();
  if (!users.length) return jsonRes({ error: 'User not found' }, 404);
  let completed_count = 0;
  const referral_code = users[0].referral_code || null;
  if (referral_code) { const cntRes = await fetch(`${supaUrl}/rest/v1/referrals?referral_code=eq.${encodeURIComponent(referral_code)}&status=eq.completed&select=id`, { headers }); completed_count = (await cntRes.json()).length; }
  return jsonRes({ referral_code, completed_count, streak_count: users[0].streak_count || 0, streak_best: users[0].streak_best || 0 });
}
