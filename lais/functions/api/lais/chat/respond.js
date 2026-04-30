/*
 * POST /api/lais/chat/respond  body { user_message: string, history?: [{role, text}] }
 *   → { message }
 *
 * BUG-RT-TALK-CRITICAL-3-FIX (Bug 2): 固定文字列「いい一歩ですね。続けていきましょう。」
 * の置換。Anthropic API（フォールバック OpenAI）でユーザーメッセージに対する文脈応答を
 * 生成し、assistant メッセージとして DB INSERT + broadcast する。
 *
 * 戦略:
 *   1. 認証 → user 取得
 *   2. body.history（任意）+ body.user_message から prompt を構築
 *   3. Anthropic Messages API を呼出（claude-haiku-4-5 既定、軽量・低レイテンシ）
 *      → 失敗時は OpenAI gpt-4o-mini で fallback
 *   4. 生成テキストを assistant ロールで chat_messages に INSERT
 *   5. broadcast チャネルに発火（クライアント subscribe で表示）
 *
 * 環境変数:
 *   - ANTHROPIC_API_KEY   (主)
 *   - OPENAI_API_KEY      (fallback)
 *   - SUPABASE_URL / SUPABASE_SERVICE_KEY (chat 永続化 / broadcast)
 *
 * セキュリティ:
 *   - 実 API key は絶対に response body / log に出さない（length のみ）
 *   - JWT 検証必須
 *   - history は最大 20 件 / 各 1000 文字に切詰
 */
import {
  authenticateRequest,
  errorResponse,
  jsonResponse,
  decodeChatRow,
  ensureUsersRow,
  sb,
  sanitize,
} from '../_lib.js';

const REQ_KEYS = ['user_message', 'history', 'client_msg_id'];
const MAX_HISTORY = 20;
const MAX_MESSAGE_CHARS = 4000;
const MAX_HISTORY_CHARS = 1000;

const SYSTEM_PROMPT = `あなたは「Lais」という日本語の自己実現コーチ AI です。
ユーザーの目標達成を、温かく、具体的で、実行可能な提案で支援します。

応答スタイル:
- 日本語で 1〜3 文、自然な口調
- 抽象的な励ましだけで終わらせず、ユーザーの発言内容に踏み込む
- 質問が来たら答える、共有が来たら受け止めて次の小さな一歩を提案する
- 同じ言い回しを繰り返さない（特に「いい一歩ですね」「続けていきましょう」のような決まり文句は禁止）
- ユーザーが提示した固有名詞・数値・状況を 1 つ以上引用する`;

export const onRequestOptions = () =>
  new Response(null, {
    status: 204,
    headers: { 'access-control-allow-methods': 'POST,OPTIONS' },
  });

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
  const input = sanitize(body, REQ_KEYS);
  const userMessage =
    typeof input.user_message === 'string' ? input.user_message.slice(0, MAX_MESSAGE_CHARS) : '';
  if (!userMessage.trim()) {
    return errorResponse('user_message is required', 400, 'validation_error');
  }
  const history = Array.isArray(input.history) ? input.history.slice(-MAX_HISTORY) : [];
  // history は client から渡される {role, text}[]
  const safeHistory = history
    .filter((m) => m && typeof m === 'object' && typeof m.text === 'string')
    .map((m) => ({
      role: m.role === 'ai' || m.role === 'assistant' ? 'assistant' : 'user',
      text: String(m.text).slice(0, MAX_HISTORY_CHARS),
    }));

  // 1) AI 推論
  let aiText = '';
  let provider = '';
  let aiError = '';
  try {
    if (env.ANTHROPIC_API_KEY) {
      aiText = await callAnthropic(env, safeHistory, userMessage);
      provider = 'anthropic';
    } else if (env.OPENAI_API_KEY) {
      aiText = await callOpenAI(env, safeHistory, userMessage);
      provider = 'openai';
    } else {
      throw new Error('no AI provider configured');
    }
  } catch (errPrimary) {
    aiError = errPrimary?.message || String(errPrimary);
    // Anthropic 失敗時の fallback
    if (env.OPENAI_API_KEY && provider !== 'openai') {
      try {
        aiText = await callOpenAI(env, safeHistory, userMessage);
        provider = 'openai-fallback';
        aiError = '';
      } catch (errFallback) {
        aiError = `${aiError} / fallback: ${errFallback?.message || errFallback}`;
      }
    }
  }
  if (!aiText.trim()) {
    return errorResponse(`ai inference failed: ${aiError || 'empty response'}`, 502, 'ai_inference_error');
  }
  aiText = aiText.trim().slice(0, MAX_MESSAGE_CHARS);

  // 2) DB INSERT (assistant)
  let message = null;
  try {
    await ensureUsersRow(env, user.id, user.email);
    const row = {
      user_id: user.id,
      role: 'assistant',
      content: aiText,
      message_type: 'chat',
      session_tag: 'lais-default',
    };
    const inserted = await sb(env, 'POST', `/rest/v1/chat_messages`, {
      body: row,
      prefer: 'return=representation',
    });
    message =
      Array.isArray(inserted) && inserted.length > 0 ? decodeChatRow(inserted[0]) : null;
  } catch (err) {
    return errorResponse(`assistant insert failed: ${err.message}`, 500, 'chat_post_error');
  }

  // 3) broadcast（クライアントが subscribe 済）
  if (message) {
    // client_msg_id を AI 側でも採番してエコー（user 側と区別するため "ai-" prefix）
    if (typeof input.client_msg_id === 'string' && input.client_msg_id.length > 0 && input.client_msg_id.length <= 64) {
      message.client_msg_id = input.client_msg_id;
    }
    try {
      await broadcastChatMessage(env, user.id, message);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[Lais] chat broadcast failed:', err && err.message);
    }
  }

  return jsonResponse({ message, provider }, 201);
};

async function callAnthropic(env, history, userMessage) {
  const url = 'https://api.anthropic.com/v1/messages';
  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.text })),
    { role: 'user', content: userMessage },
  ];
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages,
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`anthropic ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = await res.json();
  const block = Array.isArray(json?.content) ? json.content.find((b) => b.type === 'text') : null;
  return block?.text || '';
}

async function callOpenAI(env, history, userMessage) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.text })),
    { role: 'user', content: userMessage },
  ];
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 512,
      messages,
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`openai ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = await res.json();
  return json?.choices?.[0]?.message?.content || '';
}

/**
 * chat.js と同じ broadcast。SUPABASE Realtime HTTP API で `lais:chat:<user_id>` topic に発火。
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
