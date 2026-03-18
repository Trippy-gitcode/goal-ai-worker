import { getModel } from '../../utils/constants.js';

export async function handleGPTChat(env, system, messages, auth, maxTokens) {
  const model = getModel(auth.plan, 'openai');
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model, max_completion_tokens: Math.min(maxTokens, 1000), messages: [{ role: 'system', content: system || '' }, ...messages] })
    });
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    if (!text) throw new Error('Empty GPT response');
    const sseBody = `data: {"type":"content_block_delta","delta":{"text":${JSON.stringify(text)}}}\n\ndata: [DONE]\n\n`;
    return new Response(sseBody, { status: 200, headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'X-Model-Used': model } });
  } catch (e) { console.error('handleGPTChat failed:', e.message); return null; }
}

export async function handleGPTSimpleChat(env, system, messages, auth) {
  const model = getModel(auth.plan, 'openai');
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model, max_completion_tokens: 150, messages: [{ role: 'system', content: system || '' }, ...messages] })
    });
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    if (!text) throw new Error('Empty GPT-simple response');
    const sseBody = `data: {"type":"content_block_delta","delta":{"text":${JSON.stringify(text)}}}\n\ndata: [DONE]\n\n`;
    return new Response(sseBody, { status: 200, headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'X-Model-Used': model } });
  } catch (e) { return null; }
}
