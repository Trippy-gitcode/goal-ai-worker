import { authenticateRequest, getUserIdFromToken } from '../middleware/auth.js';
import { jsonRes, isValidUuid, safePgrestValue } from '../utils/helpers.js';
import { supabaseQuery } from '../utils/supabase.js';
import { autoTagSession } from '../services/history.js';
import { checkRateLimit } from '../utils/rate-limit.js';

export async function handleHistoryGet(request, env, url) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1: H-07 rate-limit roll-out
  const rl = await checkRateLimit(env, auth.userId);
  if (!rl.ok) return jsonRes({ error: 'Rate limit exceeded' }, 429);
  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);

  const params = url.searchParams;
  const limit = Math.min(parseInt(params.get('limit') || '50'), 200);
  const goalId = params.get('goalId');
  const sessionId = params.get('sessionId');
  const listSessions = params.get('sessions');

  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 (2026-05-01) — Wave 1 #35 D-02 fix:
  //   PostgREST filter injection 対策。goalId / sessionId を validate + safe encode。
  if (goalId && !isValidUuid(goalId)) return jsonRes({ error: 'Invalid goalId' }, 400);
  if (sessionId && !/^[A-Za-z0-9_-]{1,64}$/.test(sessionId)) return jsonRes({ error: 'Invalid sessionId' }, 400);
  const safeUserId = safePgrestValue(userId);
  const safeGoalId = goalId ? safePgrestValue(goalId) : '';
  const safeSessionId = sessionId ? safePgrestValue(sessionId) : '';

  if (listSessions === 'true') {
    const sessions = await supabaseQuery(env, 'chat_messages', 'GET', {
      filters: `user_id=eq.${safeUserId}${goalId ? '&goal_id=eq.' + safeGoalId : ''}&order=created_at.desc`,
      select: 'session_id,content,role,created_at',
    });
    const sessionMap = {};
    (sessions || []).forEach(m => {
      const sid = m.session_id || 'default';
      if (!sessionMap[sid]) sessionMap[sid] = { sessionId: sid, firstMsg: '', date: m.created_at, count: 0 };
      sessionMap[sid].count++;
      if (m.role === 'user' && !sessionMap[sid].firstMsg) sessionMap[sid].firstMsg = (m.content || '').substring(0, 40);
    });
    return jsonRes({ sessions: Object.values(sessionMap).slice(0, 50) });
  }

  let filters = `user_id=eq.${safeUserId}&order=created_at.asc&limit=${limit}`;
  if (goalId) filters += `&goal_id=eq.${safeGoalId}`;
  if (sessionId) filters += `&session_id=eq.${safeSessionId}`;
  const messages = await supabaseQuery(env, 'chat_messages', 'GET', { filters });
  return jsonRes({ messages: messages || [] });
}

export async function handleHistorySave(request, env, ctx) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);

  const body = await request.json();
  const { messages, sessionId } = body;
  if (!Array.isArray(messages) || messages.length === 0) return jsonRes({ error: 'messages配列が必要です' }, 400);

  const rows = messages.map(m => ({
    user_id: userId, goal_id: m.goalId || null, session_id: sessionId || m.sessionId || null,
    role: m.role, content: (m.content || '').substring(0, 50000), ai_model: m.aiModel || null, message_type: m.messageType || 'chat',
  }));
  const result = await supabaseQuery(env, 'chat_messages', 'POST', { body: rows });
  if (ctx && ctx.waitUntil && sessionId && messages.length >= 2) {
    ctx.waitUntil(autoTagSession(sessionId, messages, env));
  }
  return jsonRes({ saved: result?.length || 0 });
}

export async function handleHistoryDelete(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'User not found' }, 404);
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');
  if (!sessionId) return jsonRes({ error: 'sessionId required' }, 400);
  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 — D-02 PostgREST filter injection fix
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(sessionId)) return jsonRes({ error: 'Invalid sessionId' }, 400);
  await supabaseQuery(env, 'chat_messages', 'DELETE', { filters: `user_id=eq.${safePgrestValue(userId)}&session_id=eq.${safePgrestValue(sessionId)}` });
  return jsonRes({ deleted: true });
}
