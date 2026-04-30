/*
 * GET   /api/lais/chat?limit=100 → { messages }
 * POST  /api/lais/chat   body { role, content }   → { message }
 *
 * INSERT 後に Supabase Realtime broadcast チャネル `lais:chat:<user_id>` に
 * 新規メッセージを broadcast する（postgres_changes は publication 未登録のため
 * 使えない代替策）。クライアントは `supabase.channel('lais:chat:<uid>')` を購読する。
 */
import {
  authenticateRequest,
  errorResponse,
  jsonResponse,
  decodeChatRow,
  ensureUsersRow,
  sb,
  sanitize,
} from './_lib.js';

const CHAT_KEYS = ['role', 'content', 'message_type', 'client_msg_id'];

export const onRequestOptions = () =>
  new Response(null, {
    status: 204,
    headers: { 'access-control-allow-methods': 'GET,POST,OPTIONS' },
  });

export const onRequestGet = async ({ request, env }) => {
  let user;
  try {
    user = await authenticateRequest(request, env);
  } catch (err) {
    return errorResponse(err.message, 401, 'unauthorized');
  }
  try {
    const url = new URL(request.url);
    const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit') || 100)));
    const path =
      `/rest/v1/chat_messages?user_id=eq.${user.id}` +
      `&session_tag=eq.lais-default` +
      `&select=*&order=created_at.asc&limit=${limit}`;
    const rows = await sb(env, 'GET', path);
    const messages = (rows || []).map(decodeChatRow);
    return jsonResponse({ messages });
  } catch (err) {
    return errorResponse(err.message, 500, 'chat_list_error');
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
  const input = sanitize(body, CHAT_KEYS);
  const role = input.role === 'assistant' || input.role === 'system' ? input.role : 'user';
  const content = typeof input.content === 'string' ? input.content : '';
  if (!content.trim()) return errorResponse('content is required', 400, 'validation_error');
  // BUG-RT-TALK-CRITICAL-3-FIX (Bug 1): client_msg_id を broadcast payload にエコーバック
  // して、楽観更新メッセージと broadcast 受信メッセージの 1:1 対応を保証する。
  // DB には保存しない（schema 非破壊）— 単に request → broadcast へのトンネル。
  const clientMsgId =
    typeof input.client_msg_id === 'string' && input.client_msg_id.length > 0 && input.client_msg_id.length <= 64
      ? input.client_msg_id
      : '';
  try {
    await ensureUsersRow(env, user.id, user.email);
    const row = {
      user_id: user.id,
      role,
      content: content.slice(0, 8000),
      message_type: 'chat',
      session_tag: 'lais-default',
    };
    const inserted = await sb(env, 'POST', `/rest/v1/chat_messages`, {
      body: row,
      prefer: 'return=representation',
    });
    const message =
      Array.isArray(inserted) && inserted.length > 0 ? decodeChatRow(inserted[0]) : null;

    // Broadcast を発火（postgres_changes 代替）
    if (message) {
      // client_msg_id をエコーして dedup を可能化（DB には保存しない、メモリ層のみ）
      if (clientMsgId) message.client_msg_id = clientMsgId;
      try {
        await broadcastChatMessage(env, user.id, message);
      } catch (err) {
        // broadcast 失敗は致命でないため warn のみ
        // eslint-disable-next-line no-console
        console.warn('[Lais] chat broadcast failed:', err && err.message);
      }
    }
    return jsonResponse({ message }, 201);
  } catch (err) {
    return errorResponse(err.message, 500, 'chat_post_error');
  }
};

/**
 * Supabase Realtime broadcast (HTTP API). publication 未登録の chat_messages の代替。
 * channel 名: lais:chat:<user_id>, event 名: 'message'
 */
async function broadcastChatMessage(env, userId, message) {
  const url = `${env.SUPABASE_URL}/realtime/v1/api/broadcast`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        {
          topic: `lais:chat:${userId}`,
          event: 'message',
          payload: { message },
        },
      ],
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`broadcast ${res.status}: ${txt.slice(0, 120)}`);
  }
  return true;
}
