/*
 * GET    /api/lais/tasks            → { tasks: [] }
 * POST   /api/lais/tasks   body Task → { task }
 *
 * Lais タスクの一覧 / 作成。
 */
import {
  authenticateRequest,
  errorResponse,
  jsonResponse,
  decodeTaskRow,
  encodeTaskRow,
  ensureUsersRow,
  sb,
  sanitize,
} from './_lib.js';

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

export const onRequestOptions = () =>
  new Response(null, { status: 204, headers: { 'access-control-allow-methods': 'GET,POST,OPTIONS' } });

export const onRequestGet = async ({ request, env }) => {
  let user;
  try {
    user = await authenticateRequest(request, env);
  } catch (err) {
    return errorResponse(err.message, 401, 'unauthorized');
  }
  try {
    const url = new URL(request.url);
    const parent = url.searchParams.get('parentGoalId') || null;
    const path =
      `/rest/v1/goals?user_id=eq.${user.id}` +
      `&task_type=eq.task&select=*&order=target_date.asc.nullslast,created_at.asc`;
    const rows = await sb(env, 'GET', path);
    let tasks = (rows || []).map(decodeTaskRow);
    if (parent) tasks = tasks.filter((t) => t.parentGoalId === parent);
    return jsonResponse({ tasks });
  } catch (err) {
    return errorResponse(err.message, 500, 'tasks_list_error');
  }
};

export const onRequestPost = async ({ request, env }) => {
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
  const input = sanitize(body, TASK_KEYS);
  if (!input.name || typeof input.name !== 'string' || !input.name.trim()) {
    return errorResponse('name is required', 400, 'validation_error');
  }
  try {
    await ensureUsersRow(env, user.id, user.email);
    const row = encodeTaskRow(input, user.id);
    const inserted = await sb(env, 'POST', `/rest/v1/goals`, {
      body: row,
      prefer: 'return=representation',
    });
    const created = Array.isArray(inserted) && inserted.length > 0 ? decodeTaskRow(inserted[0]) : null;
    return jsonResponse({ task: created }, 201);
  } catch (err) {
    return errorResponse(err.message, 500, 'task_create_error');
  }
};
