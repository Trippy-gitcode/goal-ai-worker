import { authenticateRequest, getUserIdFromToken } from '../middleware/auth.js';
import { jsonRes } from '../utils/helpers.js';
import { supabaseQuery } from '../utils/supabase.js';

const DEFAULT_IDENTITY = {
  vision: null,
  identity: {},
  mindset_preset: 'futoshi',
  qol_proposals: [],
};

export async function handleIdentityGet(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);

  const rows = await supabaseQuery(env, 'user_identity', 'GET', {
    filters: `user_id=eq.${userId}`,
  });

  if (rows && rows[0]) {
    return jsonRes(rows[0]);
  }
  return jsonRes({ user_id: userId, ...DEFAULT_IDENTITY });
}

export async function handleIdentityPut(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);

  const body = await request.json();
  const updates = { user_id: userId };
  if (body.vision !== undefined) updates.vision = body.vision;
  if (body.identity !== undefined) updates.identity = body.identity;
  if (body.mindset_preset !== undefined) updates.mindset_preset = body.mindset_preset;
  if (body.qol_proposals !== undefined) updates.qol_proposals = body.qol_proposals;
  updates.updated_at = new Date().toISOString();

  const result = await supabaseQuery(env, 'user_identity', 'POST', {
    body: updates,
    filters: 'on_conflict=user_id',
  });

  return jsonRes(result?.[0] || { user_id: userId, ...updates });
}
