import { authenticateRequest, getUserIdFromToken } from '../middleware/auth.js';
import { jsonRes } from '../utils/helpers.js';
import { TESTER_CODES, TESTER_TOTAL_LIMIT, TESTER_DURATION_HOURS } from '../utils/constants.js';
import { supabaseQuery } from '../utils/supabase.js';

export async function handleTesterApply(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const body = await request.json();
  const { tester_code } = body;
  if (!tester_code || !TESTER_CODES[tester_code]) return jsonRes({ error: '無効なテスターコードです' }, 400);
  const config = TESTER_CODES[tester_code];
  const allTesters = await supabaseQuery(env, 'users', 'GET', { filters: 'tester_code=not.is.null', select: 'id' });
  if (allTesters && allTesters.length >= TESTER_TOTAL_LIMIT) return jsonRes({ error: 'テスター枠が満員です' }, 429);
  const codeUsers = await supabaseQuery(env, 'users', 'GET', { filters: `tester_code=eq.${tester_code}`, select: 'id' });
  if (codeUsers && codeUsers.length >= config.max_uses) return jsonRes({ error: 'このコードは使用上限に達しました' }, 429);
  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'User not found' }, 404);
  const userRes = await supabaseQuery(env, 'users', 'GET', { filters: `id=eq.${userId}`, select: 'tester_code' });
  if (userRes?.[0]?.tester_code) return jsonRes({ error: '既にテスターコードが適用されています' }, 400);
  const expiresAt = new Date(Date.now() + TESTER_DURATION_HOURS * 60 * 60 * 1000).toISOString();
  await supabaseQuery(env, 'users', 'PATCH', { filters: `id=eq.${userId}`, body: { plan: config.plan, tester_tier: tester_code, tester_code: tester_code, tester_expires_at: expiresAt } });
  const tokenData = JSON.parse(await env.TOKEN_KV.get(`token:${auth.tokenId}`) || '{}');
  tokenData.plan = config.plan; tokenData.tester_tier = tester_code; tokenData.tester_expires_at = expiresAt;
  await env.TOKEN_KV.put(`token:${auth.tokenId}`, JSON.stringify(tokenData), { expirationTtl: 365 * 86400 });
  return jsonRes({ status: 'success', plan: config.plan, expires_at: expiresAt, tier: tester_code });
}
