import { authenticateRequest, getUserIdFromToken } from '../middleware/auth.js';
import { jsonRes, getDayKey } from '../utils/helpers.js';
import { getMonthKey } from '../utils/helpers.js';
import { FREE_MODEL_LIMITS } from '../utils/constants.js';
import { checkDeepUsage, getFreeModelUsage } from '../utils/rate-limit.js';
import { checkRateLimit } from '../utils/rate-limit.js';
import { syncUsageToSupabase, supabaseQuery } from '../utils/supabase.js';

export async function handleUsageGet(request, env, ctx) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
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
  const body = await request.json();
  const { avatar_base64 } = body;
  if (!avatar_base64 || avatar_base64.length > 7_000_000) return jsonRes({ error: '画像サイズは5MB以下にしてください' }, 400);
  if (!avatar_base64.startsWith('data:image/')) return jsonRes({ error: '画像形式が不正です' }, 400);
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
  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);
  const body = await request.json();
  const { summary, rawChat } = body;
  if (!summary) return jsonRes({ error: 'summary is required' }, 400);
  let sentiment = 'neutral';
  try {
    const sentRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 10, messages: [{ role: 'user', content: `以下のフィードバックの感情を positive/neutral/negative の1単語だけで答えてください：「${summary || JSON.stringify(rawChat)}」` }] })
    });
    const sentData = await sentRes.json();
    const raw = (sentData.content?.[0]?.text || '').trim().toLowerCase();
    if (['positive','neutral','negative'].includes(raw)) sentiment = raw;
  } catch(e) {}
  const result = await supabaseQuery(env, 'feedbacks', 'POST', {
    body: { user_id: userId, summary, raw_chat: rawChat || null, status: 'new', sentiment, source: body.source || 'chat', nps_score: body.nps_score || null, feature_tag: body.feature_tag || null, is_beta: body.is_beta || false, device: body.device || 'unknown', platform: body.platform || 'unknown', screen_width: body.screen_width || null, app_version: body.app_version || null, tester_tier: body.tester_tier || null },
  });
  return jsonRes({ feedback: result?.[0] || null }, 201);
}
