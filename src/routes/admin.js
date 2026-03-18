import { jsonRes, safeCompare } from '../utils/helpers.js';
import { authenticateRequest, getUserIdFromToken } from '../middleware/auth.js';
import { TESTER_CODES, TESTER_TOTAL_LIMIT } from '../utils/constants.js';
import { supabaseQuery } from '../utils/supabase.js';

export async function handleAdminTesters(request, env) {
  const adminAuth = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!adminAuth || !(await safeCompare(adminAuth, env.TOKEN_SECRET))) return jsonRes({ error: 'Unauthorized' }, 401);
  const testers = await supabaseQuery(env, 'users', 'GET', { params: 'tester_code=not.is.null&select=token_id,tester_code,tester_tier,plan,tester_expires_at' }) || [];
  const byTier = {};
  for (const [code, config] of Object.entries(TESTER_CODES)) {
    byTier[code] = { used: testers.filter(t => t.tester_code === code).length, max: config.max_uses, plan: config.plan };
  }
  const now = new Date();
  const active = testers.filter(t => t.tester_expires_at && new Date(t.tester_expires_at) > now);
  return jsonRes({ total_testers: testers.length, total_limit: TESTER_TOTAL_LIMIT, by_tier: byTier, active_count: active.length, expired_count: testers.length - active.length });
}

export async function handleFeedbackList(request, env) {
  const adminAuth = request.headers.get('X-Admin-Secret');
  if (!adminAuth) {
    const auth = await authenticateRequest(request, env);
    if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
    const userId = await getUserIdFromToken(env, auth.tokenId);
    if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);
    const feedbacks = await supabaseQuery(env, 'feedbacks', 'GET', { filters: `user_id=eq.${userId}&order=created_at.desc` });
    return jsonRes({ feedbacks: feedbacks || [] });
  }
  if (!(await safeCompare(adminAuth, env.TOKEN_SECRET))) return jsonRes({ error: 'Unauthorized' }, 403);
  const feedbacks = await supabaseQuery(env, 'feedbacks', 'GET', { filters: 'order=created_at.desc&limit=200' });
  return jsonRes({ feedbacks: feedbacks || [] });
}
