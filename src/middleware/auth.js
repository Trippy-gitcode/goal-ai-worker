import { supabaseQuery } from '../utils/supabase.js';

export async function authenticateRequest(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return { ok: false, error: 'Authorization required', status: 401 };
  }

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
    let effectivePlan = tokenData.plan || 'trial';
    if (effectivePlan === 'trial' && tokenData.trialEnd && new Date(tokenData.trialEnd) < new Date()) {
      effectivePlan = 'free';
      tokenData.plan = 'free';
      await env.TOKEN_KV.put(`token:${token}`, JSON.stringify(tokenData), { expirationTtl: 365 * 86400 });
    }
    if (tokenData.tester_expires_at && new Date(tokenData.tester_expires_at) < new Date()) {
      effectivePlan = 'free';
      tokenData.plan = 'free';
      tokenData.tester_tier = null;
      tokenData.tester_expires_at = null;
      await env.TOKEN_KV.put(`token:${token}`, JSON.stringify(tokenData), { expirationTtl: 365 * 86400 });
    }

    const ownerKey = request.headers.get('X-Owner-Key') || ((request.headers.get('Cookie') || '').match(/owner_key=([^;]+)/)?.[1] ? decodeURIComponent((request.headers.get('Cookie') || '').match(/owner_key=([^;]+)/)[1]) : null);
    if (ownerKey && env.OWNER_SECRET && ownerKey === env.OWNER_SECRET) {
      effectivePlan = 'max';
    }

    return { ok: true, tokenId: token, plan: effectivePlan, userId: tokenData.userId || token, trialEnd: tokenData.trialEnd || null };
  }

  return { ok: false, error: 'Invalid token format', status: 401 };
}

export async function getUserIdFromToken(env, tokenId) {
  const users = await supabaseQuery(env, 'users', 'GET', {
    filters: `token_id=eq.${encodeURIComponent(tokenId)}`,
    select: 'id',
  });
  return users?.[0]?.id || null;
}
