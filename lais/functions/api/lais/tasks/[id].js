/*
 * GET    /api/lais/tasks/:id          → { task }
 * PATCH  /api/lais/tasks/:id  body Task → { task }
 * DELETE /api/lais/tasks/:id          → { ok: true }
 */
import {
  authenticateRequest,
  errorResponse,
  jsonResponse,
  decodeTaskRow,
  encodeTaskRow,
  sb,
  sanitize,
} from '../_lib.js';

const TASK_KEYS = [
  'name',
  'time',
  'duration',
  'category',
  'memo',
  'parentGoalId',
  'status',
  'date',
];

async function readOne(env, userId, id) {
  const rows = await sb(
    env,
    'GET',
    `/rest/v1/goals?id=eq.${id}&user_id=eq.${userId}&task_type=eq.task&select=*`
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return decodeTaskRow(rows[0]);
}

export const onRequestOptions = () =>
  new Response(null, {
    status: 204,
    headers: { 'access-control-allow-methods': 'GET,PATCH,DELETE,OPTIONS' },
  });

export const onRequestGet = async ({ request, env, params }) => {
  let user;
  try {
    user = await authenticateRequest(request, env);
  } catch (err) {
    return errorResponse(err.message, 401, 'unauthorized');
  }
  const id = params?.id;
  if (!id) return errorResponse('missing id', 400, 'bad_request');
  try {
    const task = await readOne(env, user.id, id);
    if (!task) return errorResponse('not found', 404, 'not_found');
    return jsonResponse({ task });
  } catch (err) {
    return errorResponse(err.message, 500, 'task_read_error');
  }
};

export const onRequestPatch = async ({ request, env, params }) => {
  let user;
  try {
    user = await authenticateRequest(request, env);
  } catch (err) {
    return errorResponse(err.message, 401, 'unauthorized');
  }
  const id = params?.id;
  if (!id) return errorResponse('missing id', 400, 'bad_request');
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('invalid json', 400, 'bad_request');
  }
  const input = sanitize(body, TASK_KEYS);
  try {
    const existing = await readOne(env, user.id, id);
    if (!existing) return errorResponse('not found', 404, 'not_found');
    const merged = { ...existing, ...input };
    const row = encodeTaskRow(merged, user.id);
    const updated = await sb(
      env,
      'PATCH',
      `/rest/v1/goals?id=eq.${id}&user_id=eq.${user.id}&task_type=eq.task`,
      {
        body: row,
        prefer: 'return=representation',
      }
    );
    const task = Array.isArray(updated) && updated.length > 0 ? decodeTaskRow(updated[0]) : null;
    return jsonResponse({ task });
  } catch (err) {
    return errorResponse(err.message, 500, 'task_update_error');
  }
};

export const onRequestDelete = async ({ request, env, params }) => {
  let user;
  try {
    user = await authenticateRequest(request, env);
  } catch (err) {
    return errorResponse(err.message, 401, 'unauthorized');
  }
  const id = params?.id;
  if (!id) return errorResponse('missing id', 400, 'bad_request');
  try {
    await sb(
      env,
      'DELETE',
      `/rest/v1/goals?id=eq.${id}&user_id=eq.${user.id}&task_type=eq.task`,
      {
        prefer: 'return=minimal',
      }
    );
    return jsonResponse({ ok: true });
  } catch (err) {
    return errorResponse(err.message, 500, 'task_delete_error');
  }
};
