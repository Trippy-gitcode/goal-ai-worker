import { authenticateRequest, getUserIdFromToken } from '../middleware/auth.js';
import { jsonRes, getDayKey, safePgrestValue } from '../utils/helpers.js';
import { getMonthKey } from '../utils/helpers.js';
import { FREE_MODEL_LIMITS } from '../utils/constants.js';
import { checkDeepUsage, getFreeModelUsage } from '../utils/rate-limit.js';
import { checkRateLimit } from '../utils/rate-limit.js';
import { syncUsageToSupabase, supabaseQuery } from '../utils/supabase.js';

export async function handleUsageGet(request, env, ctx) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1: H-07 rate-limit roll-out
  const rl = await checkRateLimit(env, auth.userId);
  if (!rl.ok) return jsonRes({ error: 'Rate limit exceeded' }, 429);
  const usage = await checkDeepUsage(env, auth.userId, auth.plan);
  if (ctx && env.SUPABASE_URL) ctx.waitUntil(syncUsageToSupabase(env, auth.tokenId, getMonthKey(), usage.used, 0));
  const model_usage = {};
  if (auth.plan === 'free') {
    for (const m of ['claude', 'gemini', 'gpt']) {
      const used = await getFreeModelUsage(auth.tokenId, m, env);
      const limit = FREE_MODEL_LIMITS[m];
      model_usage[m] = { used, limit, remaining: Math.max(0, limit - used) };
    }
  }
  return jsonRes({ plan: auth.plan, month: getMonthKey(), deep: usage, model_usage });
}

export async function handleAvatarUpload(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1: H-07 rate-limit roll-out
  const rl = await checkRateLimit(env, auth.userId);
  if (!rl.ok) return jsonRes({ error: 'Rate limit exceeded' }, 429);
  const body = await request.json();
  const { avatar_base64 } = body;
  if (!avatar_base64 || avatar_base64.length > 7_000_000) return jsonRes({ error: '画像サイズは5MB以下にしてください' }, 400);
  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 — Wave 1 #35 M-02 fix:
  //   MIME whitelist (PNG/JPEG/WebP のみ許可)。SVG (script tag 含み得る) reject。
  if (!/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(avatar_base64)) {
    return jsonRes({ error: '画像形式が不正です (PNG/JPEG/WebP のみ)' }, 400);
  }
  const supabaseRes = await fetch(`${env.SUPABASE_URL}/rest/v1/users?token_id=eq.${auth.tokenId}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', 'apikey': env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ avatar_base64 }),
  });
  if (!supabaseRes.ok) return jsonRes({ error: 'アバター保存に失敗しました' }, 500);
  return jsonRes({ success: true });
}

export async function handleFeedbackSave(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1: H-07 rate-limit roll-out
  const rl = await checkRateLimit(env, auth.userId);
  if (!rl.ok) return jsonRes({ error: 'Rate limit exceeded' }, 429);
  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);
  const body = await request.json();
  const { summary, rawChat } = body;
  if (!summary) return jsonRes({ error: 'summary is required' }, 400);
  let sentiment = 'neutral';
  try {
    // A4: gpt-5-nano — 1単語判定のみなので品質影響なし、コスト大幅削減
    const sentRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
      // A15: 入力トークン削減 — summaryを優先、rawChatは先頭200文字のみ
      body: JSON.stringify({ model: 'gpt-5-nano', max_completion_tokens: 5, messages: [{ role: 'user', content: `以下のフィードバックの感情を positive/neutral/negative の1単語だけで答えてください：「${summary || (typeof rawChat === 'string' ? rawChat.slice(0, 200) : JSON.stringify(rawChat).slice(0, 200))}」` }] })
    });
    const sentData = await sentRes.json();
    const raw = (sentData.choices?.[0]?.message?.content || '').trim().toLowerCase();
    if (['positive','neutral','negative'].includes(raw)) sentiment = raw;
  } catch(e) {}
  const result = await supabaseQuery(env, 'feedbacks', 'POST', {
    body: { user_id: userId, summary, raw_chat: rawChat || null, status: 'new', sentiment, source: body.source || 'chat', nps_score: body.nps_score || null, feature_tag: body.feature_tag || null, is_beta: body.is_beta || false, device: body.device || 'unknown', platform: body.platform || 'unknown', screen_width: body.screen_width || null, app_version: body.app_version || null, tester_tier: body.tester_tier || null },
  });
  return jsonRes({ feedback: result?.[0] || null }, 201);
}

// H-03: 日記 CRUD
export async function handleDiarySave(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, 401);
  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'user not found' }, 404);
  const body = await request.json();
  const date = body.date || new Date().toISOString().slice(0, 10);
  const content = (body.content || '').slice(0, 5000);
  const result = await supabaseQuery(env, 'diaries', 'POST', {
    body: { user_id: userId, date, content },
  });
  return jsonRes({ diary: result?.[0] || { date, content } });
}

export async function handleDiaryGet(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, 401);
  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'user not found' }, 404);
  const url = new URL(request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 — D-02 PostgREST filter injection fix:
  //   `date` is user-supplied; PostgREST eq.<value> + `&` separator could be
  //   subverted. Strict YYYY-MM-DD format check + safePgrestValue encode.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return jsonRes({ error: 'Invalid date format' }, 400);
  const result = await supabaseQuery(env, 'diaries', 'GET', {
    filters: `user_id=eq.${safePgrestValue(userId)}&date=eq.${safePgrestValue(date)}`,
  });
  return jsonRes({ diary: result?.[0] || null });
}
