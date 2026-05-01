import { jsonRes, safeCompare, safePgrestValue } from '../utils/helpers.js';
import { authenticateRequest, getUserIdFromToken } from '../middleware/auth.js';
import { TESTER_CODES, TESTER_TOTAL_LIMIT } from '../utils/constants.js';
import { supabaseQuery } from '../utils/supabase.js';

// SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 (2026-05-01) — Wave 1 #10 #6 / #35 L-02 fix:
//   admin auth status code 401/403 を 401 (認証情報不足) に統一。
//   admin secret 認証は「権限不足」概念がなく、401 = 認証必須が REST 慣行。
//   401 vs 403 混在で攻撃者が status code から認証段階を推定できる side-channel
//   を遮断する defense-in-depth。
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
    // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1: PostgREST D-02 fix
    const feedbacks = await supabaseQuery(env, 'feedbacks', 'GET', { filters: `user_id=eq.${safePgrestValue(userId)}&order=created_at.desc` });
    return jsonRes({ feedbacks: feedbacks || [] });
  }
  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1: 401 統一 (旧 403)
  if (!(await safeCompare(adminAuth, env.TOKEN_SECRET))) return jsonRes({ error: 'Unauthorized' }, 401);
  const feedbacks = await supabaseQuery(env, 'feedbacks', 'GET', { filters: 'order=created_at.desc&limit=200' });
  return jsonRes({ feedbacks: feedbacks || [] });
}
