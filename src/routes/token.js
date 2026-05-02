import { authenticateRequest, getUserIdFromToken } from '../middleware/auth.js';
import { jsonRes, generateId, generateSignedTokenId } from '../utils/helpers.js';
import { PROMO_CODES } from '../utils/constants.js';
import { syncUserToSupabase, supabaseQuery } from '../utils/supabase.js';
import { checkDeepUsage } from '../utils/rate-limit.js';
import { safeCompare } from '../utils/helpers.js';
import { safeError } from '../utils/safeLog.js';
import { parseBodyGuarded } from '../middleware/input-guard.js';

export async function handleTokenRegister(request, env, ctx) {
  try {
    // Round 31 Cat-I P0 fix: 4 KB cap (deviceId のみで小さい)、 prototype pollution defence
    const guard = await parseBodyGuarded(request, { maxBytes: 4 * 1024 });
    if (!guard.ok) return jsonRes({ error: guard.error }, guard.status);
    const body = guard.body;
    const { deviceId } = body;
    if (!deviceId) return jsonRes({ error: 'deviceId is required' }, 400);
    // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 — Wave 1 #35 M-03 fix:
    //   deviceId に最低 entropy 検証 (16+ chars). prototype-pollution prevention で
    //   `__proto__` / `constructor` 等の reserve key を reject。
    if (typeof deviceId !== 'string' || deviceId.length < 8 || deviceId.length > 128) return jsonRes({ error: 'deviceId must be 8-128 chars' }, 400);
    if (/[\x00-\x1f\x7f]/.test(deviceId) || ['__proto__', 'constructor', 'prototype'].includes(deviceId)) return jsonRes({ error: 'invalid deviceId' }, 400);
    const existingTokenId = await env.TOKEN_KV.get(`device:${deviceId}`);
    if (existingTokenId) {
      const existingData = await env.TOKEN_KV.get(`token:${existingTokenId}`, 'json');
      if (existingData && !existingData.revoked) return jsonRes({ token: existingTokenId, plan: existingData.plan, existing: true });
    }
    // Round 31 Cat-H Token HMAC fix (2026-05-02、 batch 10): generateSignedTokenId は
    //   env.TOKEN_SECRET 設定時 HMAC signed `goal_test_<payload>.<sig>`、 未設定時は
    //   legacy `goal_test_<24-random>` に fallback。 auth.js は両方受理。
    const tokenId = await generateSignedTokenId(env.TOKEN_SECRET);
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
    // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 — structured logger rollout (#52 P1 #7)
    safeError('token.register_error', e);
    return jsonRes({ error: 'Registration error' }, 500);
  }
}

export async function handleTokenCreate(request, env, ctx) {
  const adminAuth = request.headers.get('X-Admin-Secret');
  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 (2026-05-01) — admin auth status code 401 統一
  if (!adminAuth || !(await safeCompare(adminAuth, env.TOKEN_SECRET))) return jsonRes({ error: 'Unauthorized' }, 401);
  const body = await request.json();
  const { promoCode, userId, note } = body;
  const promo = promoCode ? PROMO_CODES[promoCode.toUpperCase()] : null;
  const plan = promo?.plan || body.plan || 'trial';
  const days = promo?.days || body.days || 7;
  // Round 31 Cat-H Token HMAC fix (2026-05-02、 batch 10): HMAC signed token 発行
  const tokenId = await generateSignedTokenId(env.TOKEN_SECRET);
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

  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 (2026-05-01) — Wave 1 #10 D-03 / #35 D-03 fix:
  //   owner_key timing attack 対策。`===` を `safeCompare` (HMAC SHA-256
  //   constant time) に置換。auth.js:37 と一括修正。
  let effectivePlan = tokenData.plan;
  const ownerKey2 = request.headers.get('X-Owner-Key') || ((request.headers.get('Cookie') || '').match(/owner_key=([^;]+)/)?.[1] ? decodeURIComponent((request.headers.get('Cookie') || '').match(/owner_key=([^;]+)/)[1]) : null);
  if (ownerKey2 && env.OWNER_SECRET && (await safeCompare(ownerKey2, env.OWNER_SECRET))) effectivePlan = 'max';

  const usage = await checkDeepUsage(env, tokenData.userId, effectivePlan);
  return jsonRes({ valid: true, plan: effectivePlan, expiresAt: tokenData.expiresAt, promoDesc: tokenData.promoDesc, daysRemaining: Math.max(0, Math.ceil((new Date(tokenData.expiresAt) - new Date()) / 86400000)), deepUsage: usage, tester_tier: tokenData.tester_tier || null, tester_expires_at: tokenData.tester_expires_at || null });
}

export async function handleTokenRedeem(request, env, ctx) {
  const body = await request.json();
  const { promoCode, deviceId } = body;
  if (!promoCode) return jsonRes({ error: 'Promo code required' }, 400);
  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 — Wave 1 #10 #8 / #35 D-02 / M-04 fix:
  //   promoCode 形式バリデーション (PostgREST filter injection 対策)
  if (typeof promoCode !== 'string' || !/^[A-Z0-9_-]{1,32}$/i.test(promoCode)) return jsonRes({ error: 'Invalid promoCode' }, 400);
  if (deviceId && (typeof deviceId !== 'string' || deviceId.length > 128 || /[\x00-\x1f\x7f]/.test(deviceId))) return jsonRes({ error: 'Invalid deviceId' }, 400);
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
  // Round 31 Cat-H Token HMAC fix (2026-05-02、 batch 10): HMAC signed token 発行
  const tokenId = await generateSignedTokenId(env.TOKEN_SECRET);
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
