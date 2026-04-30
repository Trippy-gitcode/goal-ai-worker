/*
 * GET    /api/lais/goals              → { goals }
 * POST   /api/lais/goals     body Goal → { goal }
 */
import {
  authenticateRequest,
  errorResponse,
  jsonResponse,
  decodeGoalRow,
  encodeGoalRow,
  ensureUsersRow,
  sb,
  sanitize,
} from './_lib.js';

const GOAL_KEYS = ['name', 'description', 'progress', 'status', 'target_date', 'category', 'categories'];

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
    const path =
      `/rest/v1/goals?user_id=eq.${user.id}` +
      `&task_type=neq.task&select=*&order=created_at.desc`;
    const rows = await sb(env, 'GET', path);
    const goals = (rows || []).map(decodeGoalRow);
    return jsonResponse({ goals });
  } catch (err) {
    return errorResponse(err.message, 500, 'goals_list_error');
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
  const input = sanitize(body, GOAL_KEYS);
  if (!input.name || typeof input.name !== 'string' || !input.name.trim()) {
    return errorResponse('name is required', 400, 'validation_error');
  }
  try {
    await ensureUsersRow(env, user.id, user.email);
    const row = encodeGoalRow(input, user.id);
    const inserted = await sb(env, 'POST', `/rest/v1/goals`, {
      body: row,
      prefer: 'return=representation',
    });
    const created = Array.isArray(inserted) && inserted.length > 0 ? decodeGoalRow(inserted[0]) : null;
    return jsonResponse({ goal: created }, 201);
  } catch (err) {
    return errorResponse(err.message, 500, 'goal_create_error');
  }
};
