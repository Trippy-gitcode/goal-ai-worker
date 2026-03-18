import { authenticateRequest } from '../middleware/auth.js';
import { jsonRes } from '../utils/helpers.js';
import { getModel, FREE_MODEL_LIMITS } from '../utils/constants.js';
import { checkRateLimit, checkDailyChatUsage, incrementDailyChatUsage, checkFairUse, canUseModel, incrementFreeModelUsage, getEffectiveModel } from '../utils/rate-limit.js';
import { getDayKey } from '../utils/helpers.js';
import { saveChatMessage } from '../utils/supabase.js';
import { updateStreak } from '../utils/streak.js';
import { quickRoute, callRoutingAPI } from '../services/ai/routing.js';
import { handleGeminiChat } from '../services/ai/gemini.js';
import { handleGPTChat, handleGPTSimpleChat } from '../services/ai/gpt.js';
import { buildAnthropicRequest } from '../services/ai/claude.js';
import { buildServerSystemPrompt } from '../services/prompt.js';
import { getProfileWithCache } from '../services/profile.js';
import { searchRelatedMessages, generateAndStoreEmbedding } from '../services/embedding.js';
import { countRecentMessages, regenerateAiMemo } from '../services/memo.js';
import { buildCompressedMessages, countSessionMessages, generateConversationSummary } from '../services/history.js';

export async function handleChat(request, env, ctx) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const rl = await checkRateLimit(env, auth.userId);
  if (!rl.ok) return jsonRes({ error: 'Rate limit exceeded', retryAfter: 60 }, 429);

  const chatUsage = await checkDailyChatUsage(env, auth.userId, auth.plan);
  if (!chatUsage.ok) return jsonRes({ error: '本日のチャット上限に達しました。明日またお試しください。', used: chatUsage.used, limit: chatUsage.limit, remaining: 0 }, 429);
  await incrementDailyChatUsage(env, auth.userId);

  const fu = await checkFairUse(env, auth.userId);
  if (fu.throttle) await new Promise(r => setTimeout(r, fu.delayMs));

  const body = await request.json();
  const { system, messages, maxTokens = 1000, goalId } = body;
  const claudeModel = getModel(auth.plan, 'claude');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: claudeModel, max_tokens: Math.min(maxTokens, auth.plan === 'premium' ? 4000 : 2000), system: system || undefined, messages }),
  });

  const data = await res.json();
  if (!res.ok) return jsonRes({ error: data.error?.message || 'Claude API error' }, res.status);

  if (ctx && env.SUPABASE_URL) {
    const lastUserMsg = messages[messages.length - 1];
    const aiContent = data.content?.[0]?.text || '';
    ctx.waitUntil(Promise.all([
      saveChatMessage(env, auth.tokenId, lastUserMsg.role, lastUserMsg.content, null, goalId, 'chat'),
      saveChatMessage(env, auth.tokenId, 'assistant', aiContent, 'claude', goalId, 'chat'),
    ]));
  }

  if (ctx && env.SUPABASE_URL) ctx.waitUntil(updateStreak(auth.tokenId, env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY));

  const dailyKey = getDayKey();
  const chatCountKey = `usage:chat:${auth.userId}:${dailyKey}`;
  const chatCount = parseInt(await env.TOKEN_KV.get(chatCountKey) || '0');
  const show_nps = (chatCount > 0 && chatCount % 5 === 0);

  return jsonRes(data, 200, { 'X-RateLimit-Remaining': String(rl.remaining), 'X-Model-Used': claudeModel, 'X-Show-NPS': show_nps ? '1' : '0' });
}

export async function handleChatStream(request, env, ctx) {
 try {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const rl = await checkRateLimit(env, auth.userId);
  if (!rl.ok) return jsonRes({ error: 'Rate limit exceeded' }, 429);

  const body = await request.json();
  const { system, messages, maxTokens = 600, free_no_count, context, location } = body;

  if (free_no_count && !['design', 'feedback'].includes(context)) {
    return jsonRes({ error: 'Invalid context for free_no_count' }, 400);
  }

  if (!free_no_count) {
    const chatUsage = await checkDailyChatUsage(env, auth.userId, auth.plan);
    if (!chatUsage.ok) return jsonRes({ error: '本日のチャット上限に達しました', remaining: 0 }, 429);
    await incrementDailyChatUsage(env, auth.userId);
  }

  const fu = await checkFairUse(env, auth.userId);
  if (fu.throttle) await new Promise(r => setTimeout(r, fu.delayMs));

  let userLocation = location;
  if (location && location.city) {
    ctx.waitUntil(env.KV.put(`location:${auth.tokenId}`, JSON.stringify(location), { expirationTtl: 3600 }).catch(() => {}));
  }
  if (!userLocation) {
    try { const cached = await env.KV.get(`location:${auth.tokenId}`); if (cached) userLocation = JSON.parse(cached); } catch(e) {}
  }

  const userMessage = messages?.[messages.length - 1]?.content || '';
  const sessionId = body.sessionId || null;
  const goalId = body.goal_id || null;

  let localRoute = quickRoute(userMessage);

  const [routeFromAPI, profile, ragResults] = await Promise.all([
    (!localRoute) ? callRoutingAPI(env, auth, userMessage).catch(() => 'claude') : Promise.resolve(null),
    getProfileWithCache(env, auth.tokenId, ctx).catch(() => null),
    env.RAG_ENABLED === 'true' ? searchRelatedMessages(env, auth.tokenId, userMessage, goalId).catch(() => []) : Promise.resolve([])
  ]);

  const finalRoute = localRoute?.route || routeFromAPI || 'claude';

  let compressedMessages = messages;
  try {
    if (sessionId) compressedMessages = await buildCompressedMessages(env, auth.tokenId, sessionId, messages);
  } catch(e) { console.error('compression failed:', e.message); }

  const aiMemo = profile?.ai_memo || null;
  let enhancedSystem = body.system || '';
  let fixedPart = '', variablePart = '';

  if (body.profile_inject) {
    try {
      const result = await buildServerSystemPrompt(body, auth.tokenId, env, { aiMemo, ragResults });
      fixedPart = result.fixedPart || '';
      variablePart = result.variablePart || '';
      enhancedSystem = fixedPart + variablePart;
    } catch(e) { console.error('buildServerSystemPrompt error:', e.message); }
  }

  if (finalRoute !== 'claude') {
    let routeResponse = null;
    if (finalRoute === 'gemini') {
      routeResponse = await handleGeminiChat(env, enhancedSystem, compressedMessages, auth, userLocation);
    } else if (finalRoute === 'gpt') {
      routeResponse = await handleGPTChat(env, enhancedSystem, compressedMessages, auth, maxTokens);
    } else if (finalRoute === 'gpt-simple') {
      routeResponse = await handleGPTSimpleChat(env, enhancedSystem, compressedMessages, auth);
    }
    if (routeResponse) {
      if (env.SUPABASE_URL) updateStreak(auth.tokenId, env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
      if (ctx) {
        if (env.MEMO_ENABLED === 'true') ctx.waitUntil(countRecentMessages(env, auth.tokenId).then(c => { if (c > 0 && c % 5 === 0) return regenerateAiMemo(env, auth.tokenId, goalId); }).catch(() => {}));
        if (env.RAG_ENABLED === 'true' && userMessage) ctx.waitUntil(generateAndStoreEmbedding(env, auth.tokenId, sessionId, goalId, userMessage).catch(() => {}));
      }
      return routeResponse;
    }
  }

  if (auth.plan === 'free' && !free_no_count) {
    const cm = await canUseModel(auth.tokenId, auth.plan, 'claude', env);
    if (!cm.allowed) {
      const nanoRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: 'gpt-5-nano', max_completion_tokens: Math.min(maxTokens, 600), messages: [{ role: 'system', content: enhancedSystem || '' }, ...messages] }),
      });
      const nanoData = await nanoRes.json();
      const text = nanoData.choices?.[0]?.message?.content || '';
      const sseBody = `data: {"type":"content_block_delta","delta":{"text":${JSON.stringify(text)}}}\n\ndata: [DONE]\n\n`;
      const fallbackInfo = getEffectiveModel(auth.plan, 'claude', cm.remaining === 0 ? FREE_MODEL_LIMITS.claude : 0);
      return new Response(sseBody, { status: 200, headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'X-Model-Used': 'gpt-5-nano', 'X-Model-Fallback': 'true', 'X-Reset-Hours': String(fallbackInfo ? fallbackInfo.resetHour : 12) } });
    }
    await incrementFreeModelUsage(auth.tokenId, 'claude', env);
  }

  const claudeModel = getModel(auth.plan, 'claude');

  const controller = new AbortController();
  request.signal?.addEventListener('abort', () => controller.abort());

  const effectiveMaxTokens = Math.min(maxTokens, auth.plan === 'premium' ? 4000 : 2000);
  const apiBody = (env.CACHE_ENABLED === 'true' && fixedPart)
    ? buildAnthropicRequest(fixedPart, variablePart, compressedMessages, claudeModel, effectiveMaxTokens, env)
    : { model: claudeModel, max_tokens: effectiveMaxTokens, stream: true, system: enhancedSystem || undefined, messages: compressedMessages };
  if (!apiBody.stream) apiBody.stream = true;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(apiBody),
    signal: controller.signal,
  });

  if (!res.ok) {
    const err = await res.text();
    return new Response(err, { status: res.status, headers: { 'Content-Type': 'text/plain' } });
  }

  if (env.SUPABASE_URL) updateStreak(auth.tokenId, env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  if (ctx) {
    if (env.MEMO_ENABLED === 'true') {
      ctx.waitUntil(countRecentMessages(env, auth.tokenId).then(count => {
        if (count > 0 && count % 5 === 0) return regenerateAiMemo(env, auth.tokenId, goalId);
      }).catch(() => {}));
    }
    if (env.RAG_ENABLED === 'true' && userMessage) {
      ctx.waitUntil(generateAndStoreEmbedding(env, auth.tokenId, sessionId, goalId, userMessage).catch(() => {}));
    }
    if (sessionId) {
      ctx.waitUntil(countSessionMessages(env, auth.tokenId, sessionId).then(sc => {
        if (sc >= 10 && sc % 10 === 0) return generateConversationSummary(env, auth.tokenId, sessionId);
      }).catch(() => {}));
    }
  }

  return new Response(res.body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Model-Used': claudeModel },
  });
 } catch(e) {
  console.error('handleChatStream FATAL:', e.message, e.stack);
  try { await env.TOKEN_KV.put('debug:last_error', JSON.stringify({ msg: e.message, stack: (e.stack||'').slice(0,500), ts: Date.now() }), { expirationTtl: 3600 }); } catch(_){}
  return jsonRes({ error: 'Internal error: ' + e.message }, 500);
 }
}

export async function handleGptSimple(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const body = await request.json();
  const { messages, system, maxTokens = 150 } = body;

  const isRouting = system && system.includes('1単語のみ返せ');
  if (isRouting && messages?.[0]?.content) {
    const userText = messages[0].content;
    const cacheKey = `route:${userText.slice(0, 50)}`;
    const cached = await env.TOKEN_KV.get(cacheKey);
    if (cached) return jsonRes({ choices: [{ message: { content: cached } }] }, 200, { 'X-Route-Cache': 'hit' });
  }

  const model = isRouting ? getModel(auth.plan, 'router') : 'gpt-5-nano';

  const openaiMessages = [];
  if (system) openaiMessages.push({ role: 'system', content: system });
  if (Array.isArray(messages)) openaiMessages.push(...messages);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model, max_completion_tokens: Math.min(Math.max(maxTokens, 50), 300), messages: openaiMessages }),
  });

  const data = await res.json();
  if (!res.ok) return jsonRes({ error: data.error?.message || 'GPT error' }, res.status);

  if (isRouting && messages?.[0]?.content) {
    const routeResult = (data.choices?.[0]?.message?.content || '').trim().toLowerCase();
    if (['gemini','gpt','gpt-simple','claude'].includes(routeResult.replace(/[^a-z-]/g,''))) {
      const cacheKey = `route:${messages[0].content.slice(0, 50)}`;
      await env.TOKEN_KV.put(cacheKey, routeResult.replace(/[^a-z-]/g,''), { expirationTtl: 3600 });
    }
  }

  return jsonRes(data, 200, { 'X-Model-Used': model, 'X-Route': 'gpt-simple' });
}
