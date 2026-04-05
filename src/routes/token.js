import { authenticateRequest, getUserIdFromToken } from '../middleware/auth.js';
import { jsonRes, generateId } from '../utils/helpers.js';
import { PROMO_CODES } from '../utils/constants.js';
import { syncUserToSupabase, supabaseQuery } from '../utils/supabase.js';
import { checkDeepUsage } from '../utils/rate-limit.js';
import { safeCompare } from '../utils/helpers.js';

export async function handleTokenRegister(request, env, ctx) {
  try {
    const body = await request.json();
    const { deviceId } = body;
    if (!deviceId) return jsonRes({ error: 'deviceId is required' }, 400);
    const existingTokenId = await env.TOKEN_KV.get(`device:${deviceId}`);
    if (existingTokenId) {
      const existingData = await env.TOKEN_KV.get(`token:${existingTokenId}`, 'json');
      if (existingData && !existingData.revoked) return jsonRes({ token: existingTokenId, plan: existingData.plan, existing: true });
    }
    const tokenId = `goal_test_${generateId(24)}`;
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 86400000);
    const tokenData = { tokenId, plan: 'trial', userId: deviceId, promoCode: null, promoDesc: 'Pro体験トライアル（14日間）', note: 'auto-register-trial', createdAt: now.toISOString(), expiresAt: null, trialEnd: trialEnd.toISOString(), revoked: false };
    const ttl = 365 * 86400;
    await env.TOKEN_KV.put(`token:${tokenId}`, JSON.stringify(tokenData), { expirationTtl: ttl });
    await env.TOKEN_KV.put(`device:${deviceId}`, tokenId, { expirationTtl: ttl });
    await env.TOKEN_KV.put(`user_token:${deviceId}`, tokenId, { expirationTtl: ttl });
    if (ctx && env.SUPABASE_URL) ctx.waitUntil(syncUserToSupabase(env, tokenData));
    return jsonRes({ token: tokenId, plan: 'free', existing: false }, 201);
  } catch (e) {
    console.error('handleTokenRegister error:', e);
    return jsonRes({ error: e.message || 'Registration error' }, 500);
  }
}

export async function handleTokenCreate(request, env, ctx) {
  const adminAuth = request.headers.get('X-Admin-Secret');
  if (!adminAuth || !(await safeCompare(adminAuth, env.TOKEN_SECRET))) return jsonRes({ error: 'Unauthorized' }, 403);
  const body = await request.json();
  const { promoCode, userId, note } = body;
  const promo = promoCode ? PROMO_CODES[promoCode.toUpperCase()] : null;
  const plan = promo?.plan || body.plan || 'trial';
  const days = promo?.days || body.days || 7;
  const tokenId = `goal_test_${generateId(24)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + days * 86400000);
  const tokenData = { tokenId, plan, userId: userId || tokenId, promoCode: promoCode || null, promoDesc: promo?.desc || null, note: note || null, createdAt: now.toISOString(), expiresAt: expiresAt.toISOString(), revoked: false };
  const ttl = days * 86400 + 7 * 86400;
  await env.TOKEN_KV.put(`token:${tokenId}`, JSON.stringify(tokenData), { expirationTtl: ttl });
  if (userId) await env.TOKEN_KV.put(`user_token:${userId}`, tokenId, { expirationTtl: ttl });
  ctx && ctx.waitUntil && ctx.waitUntil(syncUserToSupabase(env, tokenData));
  return jsonRes({ token: tokenId, plan, expiresAt: expiresAt.toISOString(), promoDesc: promo?.desc || `${plan}プラン ${days}日間` });
}

export async function handleTokenValidate(request, env) {
  const body = await request.json();
  const { token } = body;
  if (!token) return jsonRes({ valid: false, error: 'Token required' });
  const tokenData = await env.TOKEN_KV.get(`token:${token}`, 'json');
  if (!tokenData) return jsonRes({ valid: false, error: 'Token not found' });
  const expired = tokenData.expiresAt && new Date(tokenData.expiresAt) < new Date();
  if (expired || tokenData.revoked) return jsonRes({ valid: false, error: expired ? 'Token expired' : 'Token revoked', plan: tokenData.plan, expiresAt: tokenData.expiresAt });

  if (tokenData.tester_expires_at && new Date(tokenData.tester_expires_at) < new Date()) {
    tokenData.plan = 'free'; tokenData.tester_tier = null; tokenData.tester_expires_at = null;
    await env.TOKEN_KV.put(`token:${token}`, JSON.stringify(tokenData), { expirationTtl: 365 * 86400 });
    const testerUserId = await getUserIdFromToken(env, token);
    if (testerUserId) await supabaseQuery(env, 'users', 'PATCH', { filters: `id=eq.${testerUserId}`, body: { plan: 'free', tester_tier: null, tester_code: null, tester_expires_at: null } });
  }

  let effectivePlan = tokenData.plan;
  const ownerKey2 = request.headers.get('X-Owner-Key') || ((request.headers.get('Cookie') || '').match(/owner_key=([^;]+)/)?.[1] ? decodeURIComponent((request.headers.get('Cookie') || '').match(/owner_key=([^;]+)/)[1]) : null);
  if (ownerKey2 && env.OWNER_SECRET && ownerKey2 === env.OWNER_SECRET) effectivePlan = 'max';

  const usage = await checkDeepUsage(env, tokenData.userId, effectivePlan);
  return jsonRes({ valid: true, plan: effectivePlan, expiresAt: tokenData.expiresAt, promoDesc: tokenData.promoDesc, daysRemaining: Math.max(0, Math.ceil((new Date(tokenData.expiresAt) - new Date()) / 86400000)), deepUsage: usage, tester_tier: tokenData.tester_tier || null, tester_expires_at: tokenData.tester_expires_at || null });
}

export async function handleTokenRedeem(request, env, ctx) {
  const body = await request.json();
  const { promoCode, deviceId } = body;
  if (!promoCode) return jsonRes({ error: 'Promo code required' }, 400);
  if (promoCode && env.SUPABASE_URL) {
    const ucRes = await fetch(`${env.SUPABASE_URL}/rest/v1/used_coupons?token_id=eq.${encodeURIComponent(deviceId || '')}&coupon_code=eq.${encodeURIComponent(promoCode.toUpperCase())}`, { headers: { 'apikey': env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}` } });
    const ucRows = await ucRes.json();
    if (Array.isArray(ucRows) && ucRows.length > 0) return jsonRes({ error: 'このコードはすでに使用済みです' }, 400);
  }
  const promo = PROMO_CODES[promoCode.toUpperCase()];
  if (!promo) return jsonRes({ error: '無効なプロモコードです' }, 400);
  if (deviceId) {
    const existing = await env.TOKEN_KV.get(`redeemed:${deviceId}:${promoCode.toUpperCase()}`);
    if (existing) return jsonRes({ error: 'このコードは既に適用済みです', existingToken: existing }, 409);
  }
  const tokenId = `goal_test_${generateId(24)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + promo.days * 86400000);
  const tokenData = { tokenId, plan: promo.plan, userId: deviceId || tokenId, promoCode: promoCode.toUpperCase(), promoDesc: promo.desc, createdAt: now.toISOString(), expiresAt: expiresAt.toISOString(), revoked: false };
  const ttl = promo.days * 86400 + 7 * 86400;
  await env.TOKEN_KV.put(`token:${tokenId}`, JSON.stringify(tokenData), { expirationTtl: ttl });
  if (deviceId) await env.TOKEN_KV.put(`redeemed:${deviceId}:${promoCode.toUpperCase()}`, tokenId, { expirationTtl: ttl });
  if (ctx && env.SUPABASE_URL) ctx.waitUntil(syncUserToSupabase(env, tokenData));
  if (promoCode && env.SUPABASE_URL) {
    ctx.waitUntil(fetch(`${env.SUPABASE_URL}/rest/v1/used_coupons`, { method: 'POST', headers: { 'apikey': env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify({ token_id: deviceId || tokenId, coupon_code: promoCode.toUpperCase() }) }));
  }
  return jsonRes({ token: tokenId, plan: promo.plan, desc: promo.desc, expiresAt: expiresAt.toISOString(), daysRemaining: promo.days });
}
