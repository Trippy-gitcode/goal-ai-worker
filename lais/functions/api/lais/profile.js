/*
 * GET  /api/lais/profile  → { profile }
 * PATCH /api/lais/profile body { display_name?, partner_avatar?, age?, occupation?, hobby?, prefs? }
 *
 * Lais ユーザープロフィール（既存 users.ai_memo に LAIS_PROFILE_V1 JSON 形式で格納）
 */
import {
  authenticateRequest,
  AuthError,
  errorResponse,
  jsonResponse,
  decodeUsersProfile,
  encodeUsersProfile,
  ensureUsersRow,
  sb,
  sanitize,
} from './_lib.js';

const PROFILE_KEYS = ['display_name', 'partner_avatar', 'age', 'occupation', 'hobby', 'prefs'];

async function readProfile(env, userId, email) {
  const rows = await sb(env, 'GET', `/rest/v1/users?id=eq.${userId}&select=*`);
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      id: userId,
      email,
      display_name: '',
      partner_avatar: null,
      age: null,
      occupation: null,
      hobby: null,
      prefs: {},
      _row_exists: false,
    };
  }
  const row = rows[0];
  const profile = decodeUsersProfile(row.ai_memo);
  return {
    id: row.id,
    email,
    display_name: profile.display_name || '',
    partner_avatar: profile.partner_avatar || null,
    age: typeof profile.age === 'number' ? profile.age : null,
    occupation: profile.occupation || null,
    hobby: profile.hobby || null,
    prefs: profile.prefs || {},
    _row_exists: true,
  };
}

export const onRequestOptions = () =>
  new Response(null, { status: 204, headers: { 'access-control-allow-methods': 'GET,PATCH,OPTIONS' } });

export const onRequestGet = async ({ request, env }) => {
  let user;
  try {
    user = await authenticateRequest(request, env);
  } catch (err) {
    return errorResponse(err.message, 401, 'unauthorized');
  }
  try {
    const profile = await readProfile(env, user.id, user.email);
    return jsonResponse({ profile });
  } catch (err) {
    return errorResponse(err.message, 500, 'profile_read_error');
  }
};

export const onRequestPatch = async ({ request, env }) => {
  let user;
  try {
    user = await authenticateRequest(request, env);
  } catch (err) {
    return errorResponse(err.message, 401, 'unauthorized');
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('invalid json', 400, 'bad_request');
  }
  const patch = sanitize(body, PROFILE_KEYS);
  try {
    await ensureUsersRow(env, user.id, user.email);
    const current = await readProfile(env, user.id, user.email);
    const merged = {
      display_name: patch.display_name ?? current.display_name,
      partner_avatar: patch.partner_avatar ?? current.partner_avatar,
      age: patch.age ?? current.age,
      occupation: patch.occupation ?? current.occupation,
      hobby: patch.hobby ?? current.hobby,
      prefs: { ...(current.prefs || {}), ...(patch.prefs || {}) },
    };
    const ai_memo = encodeUsersProfile(merged);
    await sb(env, 'PATCH', `/rest/v1/users?id=eq.${user.id}`, {
      body: {
        ai_memo,
        ai_memo_updated_at: new Date().toISOString(),
      },
      prefer: 'return=minimal',
    });
    const updated = await readProfile(env, user.id, user.email);
    return jsonResponse({ profile: updated });
  } catch (err) {
    return errorResponse(err.message, 500, 'profile_update_error');
  }
};
