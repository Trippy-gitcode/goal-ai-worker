import { supabaseQuery } from '../utils/supabase.js';
import { getUserIdFromToken } from '../middleware/auth.js';

export async function getProfileWithCache(env, tokenId, ctx) {
  const cacheKey = `profile:${tokenId}`;
  const cached = await env.TOKEN_KV.get(cacheKey, 'json');
  if (cached) return cached;

  const userId = await getUserIdFromToken(env, tokenId);
  if (!userId) return null;

  const res = await supabaseQuery(env, 'users', 'GET', {
    filters: `id=eq.${userId}`,
    select: 'nickname,occupation,age,mbti,strengths,weaknesses,values,vision,constraints,ai_memo,ai_memo_updated_at',
  });
  const profile = res?.[0] || null;

  if (profile && ctx) {
    ctx.waitUntil(env.TOKEN_KV.put(cacheKey, JSON.stringify(profile), { expirationTtl: 300 }));
  }
  return profile;
}

export function buildProfileBlock(profile, fields) {
  if (!profile) return '';
  const lines = [];
  const map = {
    nickname: () => profile.nickname ? `名前: ${profile.nickname}` : null,
    occupation: () => profile.occupation ? `職種: ${profile.occupation}` : null,
    age: () => profile.age ? `年齢: ${profile.age}歳` : null,
    mbti: () => profile.mbti ? `MBTI: ${profile.mbti}` : null,
    strengths: () => profile.strengths ? `強み: ${profile.strengths}` : null,
    weaknesses: () => profile.weaknesses ? `弱み: ${profile.weaknesses}` : null,
    values: () => profile.values ? `価値観: ${profile.values}` : null,
    vision: () => profile.vision ? `ビジョン: ${profile.vision}` : null,
    constraints: () => profile.constraints ? `制約: ${profile.constraints}` : null,
  };
  for (const f of fields) {
    if (map[f]) { const line = map[f](); if (line) lines.push(line); }
  }
  return lines.join('\n');
}
