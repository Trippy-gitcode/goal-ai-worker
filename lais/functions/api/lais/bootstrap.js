/*
 * POST /api/lais/bootstrap
 *
 * 初回ログイン時、または明示的に呼ばれたとき public.users 行を ensure する。
 * 既存 goal-ai-worker RLS が user-self INSERT を拒否するため、service_role bypass で
 * 代行する。Lais Phase A 実 Supabase 化の前提条件。
 */
import {
  authenticateRequest,
  AuthError,
  errorResponse,
  jsonResponse,
  ensureUsersRow,
} from './_lib.js';

export const onRequestOptions = () =>
  new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-methods': 'POST,OPTIONS',
      'access-control-allow-headers': 'authorization,content-type',
      'access-control-max-age': '86400',
    },
  });

export const onRequestPost = async ({ request, env }) => {
  let user;
  try {
    user = await authenticateRequest(request, env);
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, 401, 'unauthorized');
    return errorResponse(err.message || 'auth error', 500, 'auth_unknown');
  }
  try {
    const created = await ensureUsersRow(env, user.id, user.email);
    return jsonResponse({ ok: true, user_id: user.id, created });
  } catch (err) {
    return errorResponse(err.message || 'bootstrap failed', 500, 'bootstrap_error');
  }
};
