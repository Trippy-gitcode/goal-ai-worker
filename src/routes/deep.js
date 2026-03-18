import { authenticateRequest } from '../middleware/auth.js';
import { jsonRes } from '../utils/helpers.js';
import { getModel } from '../utils/constants.js';
import { checkDeepUsage, incrementDeepUsage, canUseModel, incrementFreeModelUsage } from '../utils/rate-limit.js';

export async function handleDeepOpenAI(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const usage = await checkDeepUsage(env, auth.userId, auth.plan);
  if (usage.remaining <= 0) return jsonRes({ error: 'ディープ分析の月間上限に達しました', used: usage.used, limit: usage.limit, plan: auth.plan }, 429);

  const body = await request.json();
  const { messages, system, maxTokens = 1000 } = body;
  let openaiModel = getModel(auth.plan, 'openai');

  if (auth.plan === 'free') {
    const gm = await canUseModel(auth.tokenId, auth.plan, 'gpt', env);
    if (!gm.allowed) { openaiModel = 'gpt-5-nano'; } else { await incrementFreeModelUsage(auth.tokenId, 'gpt', env); }
  }

  const openaiMessages = [];
  if (system) openaiMessages.push({ role: 'system', content: system });
  if (Array.isArray(messages)) openaiMessages.push(...messages);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: openaiModel, max_completion_tokens: Math.min(maxTokens, 2000), messages: openaiMessages }),
  });

  const data = await res.json();
  if (!res.ok) return jsonRes({ error: data.error?.message || 'OpenAI API error' }, res.status);
  await incrementDeepUsage(env, auth.userId);
  return jsonRes(data, 200, { 'X-Model-Used': openaiModel });
}

export async function handleDeepGemini(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const usage = await checkDeepUsage(env, auth.userId, auth.plan);
  if (usage.remaining <= 0) return jsonRes({ error: 'ディープ分析の月間上限に達しました', used: usage.used, limit: usage.limit, plan: auth.plan }, 429);

  const body = await request.json();
  const { prompt, systemCtx, maxTokens = 1200 } = body;

  if (auth.plan === 'free') {
    const gm = await canUseModel(auth.tokenId, auth.plan, 'gemini', env);
    if (!gm.allowed) {
      const nanoMessages = [{ role: 'system', content: systemCtx || '' }, { role: 'user', content: prompt }];
      const nanoRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: 'gpt-5-nano', max_completion_tokens: Math.min(maxTokens, 600), messages: nanoMessages }),
      });
      const nanoData = await nanoRes.json();
      const nanoText = nanoData.choices?.[0]?.message?.content || '';
      return jsonRes({ candidates: [{ content: { parts: [{ text: nanoText }] } }] }, 200, { 'X-Model-Used': 'gpt-5-nano' });
    }
    await incrementFreeModelUsage(auth.tokenId, 'gemini', env);
  }

  const geminiModel = getModel(auth.plan, 'gemini');
  const text = systemCtx ? `${systemCtx}\n\n${prompt}` : prompt;
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${env.GEMINI_API_KEY}`;

  const res = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text }] }], generationConfig: { maxOutputTokens: Math.min(maxTokens, 2000), temperature: 0.7 } }),
  });

  const data = await res.json();
  if (!res.ok) return jsonRes({ error: data.error?.message || 'Gemini API error' }, res.status);
  await incrementDeepUsage(env, auth.userId);
  return jsonRes(data, 200, { 'X-Model-Used': geminiModel });
}

export async function handleDeepClaude(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const body = await request.json();
  const { system, messages, maxTokens = 1500, countUsage = false } = body;

  if (countUsage) {
    const usage = await checkDeepUsage(env, auth.userId, auth.plan);
    if (usage.remaining <= 0) return jsonRes({ error: 'ディープ分析の月間上限に達しました', used: usage.used, limit: usage.limit, plan: auth.plan }, 429);
    await incrementDeepUsage(env, auth.userId);
  }

  const claudeModel = getModel(auth.plan, 'claude');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: claudeModel, max_tokens: Math.min(maxTokens, 4000), system: system || undefined, messages }),
  });

  const data = await res.json();
  if (!res.ok) return jsonRes({ error: data.error?.message || 'Claude API error' }, res.status);
  return jsonRes(data, 200, { 'X-Model-Used': claudeModel });
}

export async function handleDeepClaudeStream(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const body = await request.json();
  const { system, messages, maxTokens = 1500 } = body;
  const claudeModel = getModel(auth.plan, 'claude');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: claudeModel, max_tokens: Math.min(maxTokens, 4000), stream: true, system: system || undefined, messages }),
  });

  if (!res.ok) { const err = await res.text(); return new Response(err, { status: res.status }); }

  return new Response(res.body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Model-Used': claudeModel },
  });
}
