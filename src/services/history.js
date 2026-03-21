import { supabaseQuery, supabaseHeaders } from '../utils/supabase.js';

export async function autoTagSession(sessionId, messages, env) {
  try {
    if (!messages || messages.length < 2) return;
    const context = messages.slice(0, 6).map(m => m.content || '').join('\n').slice(0, 500);
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-5-nano', messages: [{ role: 'user', content: `以下の会話のテーマを1つだけ、5文字以内の日本語タグで返してください。タグのみを返してください。\n\n${context}` }], max_tokens: 20 })
    });
    const data = await res.json();
    const tag = (data.choices?.[0]?.message?.content || '').trim();
    if (tag && tag.length <= 10) {
      await supabaseQuery(env, 'chat_messages', 'PATCH', { filters: `session_id=eq.${sessionId}`, body: { session_tag: tag } });
    }
  } catch(e) {}
}

export async function generateConversationSummary(env, tokenId, sessionId) {
  try {
    const kvKey = `summary:${tokenId}:${sessionId}`;
    const existing = await env.TOKEN_KV.get(kvKey);
    if (existing) return existing;

    const users = await supabaseQuery(env, 'users', 'GET', {
      filters: `token_id=eq.${encodeURIComponent(tokenId)}`,
      select: 'id',
    });
    if (!users || !users[0]) return null;

    const messages = await supabaseQuery(env, 'chat_messages', 'GET', {
      filters: `user_id=eq.${users[0].id}&session_id=eq.${encodeURIComponent(sessionId)}&order=created_at.asc`,
      select: 'role,content',
    });
    if (!messages || messages.length < 6) return null;

    const olderMessages = messages.slice(0, -10);
    if (olderMessages.length < 3) return null;

    const conversationText = olderMessages
      .map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${(m.content || '').slice(0, 200)}`)
      .join('\n');

    const summaryRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-5-nano', max_completion_tokens: 300,
        messages: [
          { role: 'system', content: 'あなたは会話の要約を行うアシスタントです。以下の会話履歴を、重要なポイントと文脈を保持しながら簡潔に日本語で要約してください。200文字以内で要約してください。' },
          { role: 'user', content: conversationText.slice(0, 3000) },
        ],
      }),
    });
    if (!summaryRes.ok) return null;
    const summaryData = await summaryRes.json();
    const summary = summaryData.choices?.[0]?.message?.content || '';
    if (!summary) return null;

    await env.TOKEN_KV.put(kvKey, summary, { expirationTtl: 86400 });
    return summary;
  } catch (e) { console.error('generateConversationSummary error:', e); return null; }
}

export async function buildCompressedMessages(env, tokenId, sessionId, currentMessages, contextMultiplier = 1.0) {
  try {
    const windowSize = Math.round(10 * contextMultiplier);
    if (!currentMessages || currentMessages.length <= windowSize) return currentMessages;
    const summary = await generateConversationSummary(env, tokenId, sessionId);
    const recentMessages = currentMessages.slice(-windowSize);
    if (summary) {
      return [
        { role: 'user', content: `[前回までの会話の要約]: ${summary}` },
        { role: 'assistant', content: 'はい、前回の会話内容を理解しました。続けてください。' },
        ...recentMessages,
      ];
    }
    return recentMessages;
  } catch (e) { console.error('buildCompressedMessages error:', e); return currentMessages.slice(-(Math.round(10 * (contextMultiplier || 1)))); }
}

export async function countSessionMessages(env, tokenId, sessionId) {
  try {
    const users = await supabaseQuery(env, 'users', 'GET', {
      filters: `token_id=eq.${encodeURIComponent(tokenId)}`,
      select: 'id',
    });
    if (!users || !users[0]) return 0;
    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/chat_messages?user_id=eq.${users[0].id}&session_id=eq.${encodeURIComponent(sessionId)}&select=id`,
      { method: 'HEAD', headers: { ...supabaseHeaders(env), 'Prefer': 'count=exact' } }
    );
    const count = res.headers.get('content-range');
    if (count) { const match = count.match(/\/(\d+)/); return match ? parseInt(match[1], 10) : 0; }
    return 0;
  } catch (e) { console.error('countSessionMessages error:', e); return 0; }
}
