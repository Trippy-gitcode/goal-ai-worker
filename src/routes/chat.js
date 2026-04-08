import { authenticateRequest } from '../middleware/auth.js';
import { jsonRes } from '../utils/helpers.js';
import { getModel, FREE_MODEL_LIMITS, getPlanConfig, getCurrentMonth, USAGE_BATCH_SIZE } from '../utils/constants.js';
import { checkRateLimit, checkDailyChatUsage, incrementDailyChatUsage, canUseModel, incrementFreeModelUsage, getEffectiveModel, incrementEmbeddingTurnCount } from '../utils/rate-limit.js';
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
  try {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const rl = await checkRateLimit(env, auth.userId);
  if (!rl.ok) return jsonRes({ error: 'Rate limit exceeded', retryAfter: 60 }, 429);

  const chatUsage = await checkDailyChatUsage(env, auth.userId, auth.plan);
  if (!chatUsage.ok) return jsonRes({ error: '本日のチャット上限に達しました。明日またお試しください。', used: chatUsage.used, limit: chatUsage.limit, remaining: 0 }, 429);
  await incrementDailyChatUsage(env, auth.userId);

  const body = await request.json();
  const { system, messages, maxTokens = 1000, goalId } = body;
  const claudeModel = getModel(auth.plan, 'claude');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: claudeModel, max_tokens: Math.min(maxTokens, ['max', 'ultra'].includes(auth.plan) ? 4000 : 2000), system: system || undefined, messages }),
  });

  const data = await res.json();
  if (!res.ok) return jsonRes({ error: data.error?.message || 'Claude API error' }, res.status);

  if (ctx && env.SUPABASE_URL) {
    const lastUserMsg = messages[messages.length - 1];
    const aiContent = data.content?.[0]?.text || '';
    // UX-01-A1: INTENT/GOAL_PROPOSAL タグ検出ログ
    const intentMatch = aiContent.match(/\[INTENT:(\w+)\]/);
    if (intentMatch) console.log(`[INTENT] user=${auth.userId} intent=${intentMatch[1]}`);
    const hasGoalProposal = aiContent.includes('[GOAL_PROPOSAL]');
    if (hasGoalProposal) console.log(`[GOAL_PROPOSAL] user=${auth.userId} detected in non-stream response`);
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
  } catch (e) {
    console.error('handleChat error:', e);
    // #613 FIX: stack trace漏洩防止
    return jsonRes({ error: 'エラーが発生しました。' }, 500);
  }
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

  let effectiveModels = null; // null = 通常モデル（overrideなし）
  let isDegraded = false;
  let degradeReason = null;
  let usageResult = null;

  if (!free_no_count) {
    const chatUsage = await checkDailyChatUsage(env, auth.userId, auth.plan);
    await incrementDailyChatUsage(env, auth.userId);
    // Free日次上限超過→nanoフォールバック（#5）
    if (!chatUsage.ok && auth.plan === 'free') {
      const nanoRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: 'gpt-5-nano', max_completion_tokens: Math.min(maxTokens, 600), messages: [{ role: 'system', content: body.system || '' }, ...messages] }),
      });
      const nanoData = await nanoRes.json();
      const text = nanoData.choices?.[0]?.message?.content || '';
      const sseBody = `data: {"type":"content_block_delta","delta":{"text":${JSON.stringify(text)}}}\n\ndata: [DONE]\n\n`;
      return new Response(sseBody, { status: 200, headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'X-Model-Used': 'gpt-5-nano', 'X-Model-Fallback': 'true', 'X-Reset-Hours': '12' } });
    }
    if (!chatUsage.ok) return jsonRes({ error: '本日のチャット上限に達しました', remaining: 0 }, 429);

    // ═══ ターン記録（Step 4） ═══
    if (auth.plan !== 'free') {
      usageResult = await recordTurnUsage(env, auth.userId, auth.plan);
      console.log(`[TURN] user=${auth.userId} plan=${auth.plan} turns=${usageResult.turns_used} amount=¥${usageResult.current_amount}`);

      // ═══ キャップ判定（Step 5） ═══
      if (usageResult.should_degrade) {
        const degraded = getDegradedModels(auth.plan);
        if (degraded) { // Ultra は null → 降格しない
          effectiveModels = degraded;
          isDegraded = true;
          degradeReason = 'cap';
        }
      }
    }

    // ═══ フェアユース判定（Step 5） ═══
    if (!isDegraded) {
      const fairUse = await checkFairUseV2(env, auth.userId, auth.plan);
      if (fairUse.degraded) {
        const degraded = getDegradedModels(auth.plan);
        if (degraded) {
          effectiveModels = degraded;
          isDegraded = true;
          degradeReason = fairUse.reason;
        }
      }
    }
  }

  let userLocation = location;
  if (location && location.city) {
    ctx.waitUntil(env.TOKEN_KV.put(`location:${auth.tokenId}`, JSON.stringify(location), { expirationTtl: 3600 }).catch(() => {}));
  }
  if (!userLocation) {
    try { const cached = await env.TOKEN_KV.get(`location:${auth.tokenId}`); if (cached) userLocation = JSON.parse(cached); } catch(e) {}
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
    const ctxMultiplier = getPlanConfig(auth.plan).context_multiplier || 1.0;
    if (sessionId) compressedMessages = await buildCompressedMessages(env, auth.tokenId, sessionId, messages, ctxMultiplier);
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

  // M: ディープ分析結果をシステムプロンプトに注入
  if (body.deep_context && body.deep_context.summary) {
    const age = Date.now() - (body.deep_context.timestamp || 0);
    if (age < 3600000) { // 1時間以内のみ有効
      enhancedSystem += `\n\n【直近のディープ分析結果】\nユーザーの質問: ${body.deep_context.query}\n分析サマリー: ${body.deep_context.summary}\nこの分析結果を踏まえて回答してください。`;
    }
  }

  if (finalRoute !== 'claude') {
    let routeResponse = null;
    if (finalRoute === 'gemini') {
      routeResponse = await handleGeminiChat(env, enhancedSystem, compressedMessages, auth, userLocation, effectiveModels, ctx);
    } else if (finalRoute === 'gpt') {
      routeResponse = await handleGPTChat(env, enhancedSystem, compressedMessages, auth, maxTokens, effectiveModels);
    } else if (finalRoute === 'gpt-simple') {
      routeResponse = await handleGPTSimpleChat(env, enhancedSystem, compressedMessages, auth, effectiveModels);
    }
    if (routeResponse) {
      if (env.SUPABASE_URL) updateStreak(auth.tokenId, env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
      if (ctx) {
        if (env.MEMO_ENABLED === 'true') ctx.waitUntil(countRecentMessages(env, auth.tokenId).then(c => { if (c > 0 && c % 5 === 0) return regenerateAiMemo(env, auth.tokenId, goalId); }).catch(() => {}));
        // A8: embedding生成は5ターンに1回（RAG検索は毎ターン実行済み）
        if (env.RAG_ENABLED === 'true' && userMessage) {
          ctx.waitUntil((async () => {
            const tc = await incrementEmbeddingTurnCount(env, auth.tokenId);
            if (tc % 5 === 0) await generateAndStoreEmbedding(env, auth.tokenId, sessionId, goalId, userMessage);
          })().catch(() => {}));
        }
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

  const claudeModel = getModel(auth.plan, 'claude', effectiveModels);

  const controller = new AbortController();
  request.signal?.addEventListener('abort', () => controller.abort());

  const effectiveMaxTokens = Math.min(maxTokens, ['max', 'ultra'].includes(auth.plan) ? 4000 : 2000);
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
    // A8: embedding生成は5ターンに1回（RAG検索は毎ターン実行済み）
    if (env.RAG_ENABLED === 'true' && userMessage) {
      ctx.waitUntil((async () => {
        const tc = await incrementEmbeddingTurnCount(env, auth.tokenId);
        if (tc % 5 === 0) await generateAndStoreEmbedding(env, auth.tokenId, sessionId, goalId, userMessage);
      })().catch(() => {}));
    }
    if (sessionId) {
      ctx.waitUntil(countSessionMessages(env, auth.tokenId, sessionId).then(sc => {
        if (sc >= 10 && sc % 10 === 0) return generateConversationSummary(env, auth.tokenId, sessionId);
      }).catch(() => {}));
    }
  }

  // レスポンスヘッダーに降格情報を付与（Step 5）
  const responseHeaders = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Model-Used': claudeModel,
    'X-Model-Degraded': isDegraded ? '1' : '0',
    'X-Degrade-Reason': degradeReason || '',
  };
  if (usageResult && usageResult.current_amount > 0) {
    const config = getPlanConfig(auth.plan);
    responseHeaders['X-Usage-Amount'] = String(usageResult.current_amount);
    responseHeaders['X-Usage-Cap'] = String(config.cap);
    responseHeaders['X-Usage-Percent'] = String(Math.round((usageResult.current_amount / config.cap) * 100));
  }

  return new Response(res.body, { status: 200, headers: responseHeaders });
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

// ═══════ ターン記録 + Stripe従量課金（STEP4-EXEC） ═══════
async function recordTurnUsage(env, userId, plan) {
  const config = getPlanConfig(plan);
  if (config.per_turn === 0) {
    return { current_amount: 0, turns_used: 0, cap_reached: false, is_capped: false, should_degrade: false };
  }
  const month = getCurrentMonth();
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_KEY;
  let result;
  try {
    const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/increment_turn_usage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` },
      body: JSON.stringify({ p_user_id: userId, p_month: month, p_per_turn: config.per_turn, p_cap: config.cap })
    });
    if (!rpcRes.ok) { console.error('increment_turn_usage RPC failed:', await rpcRes.text()); return { current_amount: 0, turns_used: 0, cap_reached: false, is_capped: false, should_degrade: false }; }
    const rpcData = await rpcRes.json();
    result = Array.isArray(rpcData) ? rpcData[0] : rpcData;
  } catch (e) { console.error('recordTurnUsage error:', e.message); return { current_amount: 0, turns_used: 0, cap_reached: false, is_capped: false, should_degrade: false }; }
  const { turns_used, current_amount, cap_reached, is_capped } = result || {};
  if (!is_capped) await maybeSendUsageRecord(env, userId, turns_used || 0, plan);
  return { current_amount: current_amount || 0, turns_used: turns_used || 0, cap_reached: cap_reached || is_capped || false, is_capped: is_capped || false, should_degrade: cap_reached || is_capped || false };
}

async function maybeSendUsageRecord(env, userId, turnsUsed, plan) {
  const config = getPlanConfig(plan);
  if (config.per_turn === 0) return;
  const month = getCurrentMonth();
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_KEY;
  // A20: KVキャッシュでstripe_usage_synced取得（5分間）
  let synced = 0;
  const syncKV = `usage_sync:${userId}:${month}`;
  try {
    const cached = await env.TOKEN_KV.get(syncKV);
    if (cached !== null) { synced = parseInt(cached); }
    else {
      const res = await fetch(`${supabaseUrl}/rest/v1/usage_tracking?user_id=eq.${userId}&month=eq.${month}&select=stripe_usage_synced`, { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } });
      const data = await res.json();
      synced = data?.[0]?.stripe_usage_synced || 0;
      try { await env.TOKEN_KV.put(syncKV, String(synced), { expirationTtl: 300 }); } catch(_) {}
    }
  } catch (e) { console.error('Failed to get stripe_usage_synced:', e.message); return; }
  const unsent = turnsUsed - synced;
  if (unsent < USAGE_BATCH_SIZE) return;
  let meteredItemId;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/users?user_id=eq.${userId}&select=stripe_metered_subscription_item_id`, { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } });
    const data = await res.json();
    meteredItemId = data?.[0]?.stripe_metered_subscription_item_id;
  } catch (e) { console.error('Failed to get metered item ID:', e.message); return; }
  if (!meteredItemId) return; // テスター等はスキップ
  try {
    const response = await fetch(`https://api.stripe.com/v1/subscription_items/${meteredItemId}/usage_records`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `quantity=${unsent}&action=increment&timestamp=${Math.floor(Date.now() / 1000)}`
    });
    if (response.ok) {
      await fetch(`${supabaseUrl}/rest/v1/usage_tracking?user_id=eq.${userId}&month=eq.${month}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ stripe_usage_synced: turnsUsed })
      });
      // A20: KVキャッシュも更新（KV制限超過時は無視）
      try { await env.TOKEN_KV.put(syncKV, String(turnsUsed), { expirationTtl: 300 }); } catch(_) {}
    } else { console.error('Stripe usage_record failed:', await response.json()); }
  } catch (e) { console.error('Stripe usage_record error:', e.message); }
}

// ═══════ モデル降格（STEP5-EXEC） ═══════
function getDegradedModels(plan) {
  const config = getPlanConfig(plan);
  const fallback = config.fallback_model;
  if (!fallback) return null; // Ultra: 降格なし
  return {
    claude: fallback === 'gpt-5-nano' ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-20250514',
    openai: fallback,
    gemini: 'gemini-2.5-flash',
    router: 'gpt-5-mini'
  };
}

// ═══════ v6.3 フェアユース（5h窓 + 週間窓） ═══════
async function checkFairUseV2(env, userId, plan) {
  const config = getPlanConfig(plan);
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_KEY;

  // 5h窓チェック
  const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
  try {
    const res5h = await fetch(
      `${supabaseUrl}/rest/v1/chat_messages?user_id=eq.${userId}&role=eq.user&created_at=gte.${fiveHoursAgo}&select=id`,
      { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Prefer': 'count=exact', 'Range': '0-0' } }
    );
    const count5h = parseInt(res5h.headers.get('content-range')?.split('/')?.[1] || '0');
    if (count5h >= config.fair_use.h5_limit) {
      return { degraded: true, reason: 'fair_use_5h' };
    }
  } catch (e) { console.error('Fair use 5h check failed:', e.message); }

  // 週間窓チェック
  const weekStart = getWeekStartUTC();
  try {
    const resWeek = await fetch(
      `${supabaseUrl}/rest/v1/chat_messages?user_id=eq.${userId}&role=eq.user&created_at=gte.${weekStart}&select=id`,
      { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Prefer': 'count=exact', 'Range': '0-0' } }
    );
    const countWeekly = parseInt(resWeek.headers.get('content-range')?.split('/')?.[1] || '0');
    if (countWeekly >= config.fair_use.weekly_limit) {
      return { degraded: true, reason: 'fair_use_weekly' };
    }
  } catch (e) { console.error('Fair use weekly check failed:', e.message); }

  return { degraded: false, reason: null };
}

function getWeekStartUTC() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = jst.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  jst.setUTCDate(jst.getUTCDate() - diff);
  jst.setUTCHours(0, 0, 0, 0);
  return new Date(jst.getTime() - 9 * 60 * 60 * 1000).toISOString();
}
