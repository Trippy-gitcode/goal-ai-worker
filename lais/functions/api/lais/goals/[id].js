/*
 * GET    /api/lais/goals/:id           → { goal, tasks }
 * PATCH  /api/lais/goals/:id   body Goal → { goal }
 * DELETE /api/lais/goals/:id           → { ok: true }
 */
import {
  authenticateRequest,
  errorResponse,
  jsonResponse,
  decodeGoalRow,
  encodeGoalRow,
  decodeTaskRow,
  sb,
  sanitize,
} from '../_lib.js';

const GOAL_KEYS = ['name', 'description', 'progress', 'status', 'target_date', 'category', 'categories'];

async function readOne(env, userId, id) {
  const rows = await sb(
    env,
    'GET',
    `/rest/v1/goals?id=eq.${id}&user_id=eq.${userId}&task_type=neq.task&select=*`
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return decodeGoalRow(rows[0]);
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
    const goal = await readOne(env, user.id, id);
    if (!goal) return errorResponse('not found', 404, 'not_found');
    // related tasks
    const taskRows = await sb(
      env,
      'GET',
      `/rest/v1/goals?user_id=eq.${user.id}&task_type=eq.task&select=*&order=target_date.asc.nullslast,created_at.asc`
    );
    const tasks = (taskRows || []).map(decodeTaskRow).filter((t) => t.parentGoalId === id);
    return jsonResponse({ goal, tasks });
  } catch (err) {
    return errorResponse(err.message, 500, 'goal_read_error');
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
  const input = sanitize(body, GOAL_KEYS);
  try {
    const existing = await readOne(env, user.id, id);
    if (!existing) return errorResponse('not found', 404, 'not_found');
    const merged = { ...existing, ...input };
    const row = encodeGoalRow(merged, user.id);
    const updated = await sb(
      env,
      'PATCH',
      `/rest/v1/goals?id=eq.${id}&user_id=eq.${user.id}&task_type=neq.task`,
      {
        body: row,
        prefer: 'return=representation',
      }
    );
    const goal = Array.isArray(updated) && updated.length > 0 ? decodeGoalRow(updated[0]) : null;
    return jsonResponse({ goal });
  } catch (err) {
    return errorResponse(err.message, 500, 'goal_update_error');
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
      `/rest/v1/goals?id=eq.${id}&user_id=eq.${user.id}&task_type=neq.task`,
      {
        prefer: 'return=minimal',
      }
    );
    return jsonResponse({ ok: true });
  } catch (err) {
    return errorResponse(err.message, 500, 'goal_delete_error');
  }
};
