import { COMMON_RULES } from '../utils/constants.js';
import { supabaseQuery } from '../utils/supabase.js';
import { getUserIdFromToken } from '../middleware/auth.js';
import { buildProfileBlock } from './profile.js';

export async function buildServerSystemPrompt(body, tokenId, env, { aiMemo, ragResults } = {}) {
  const injectFields = body.profile_inject || ['nickname'];

  let profile = null;
  try {
    const userId = await getUserIdFromToken(env, tokenId);
    if (userId) {
      const res = await supabaseQuery(env, 'users', 'GET', {
        filters: `id=eq.${userId}`,
        select: 'nickname,occupation,age,mbti,strengths,weaknesses,values,vision,constraints,ai_memo,ai_memo_updated_at',
      });
      if (res && res.length > 0) profile = res[0];
    }
  } catch(e) {}

  let fields = injectFields;
  if (body.coaching_mode) {
    fields = ['nickname', 'occupation', 'age', 'mbti', 'strengths', 'weaknesses', 'values', 'vision', 'constraints'];
  }

  const profileBlock = buildProfileBlock(profile, fields);

  let fixedPart = '';
  if (body.role) fixedPart += `【あなたの役割】${body.role}\n\n`;
  if (profileBlock) fixedPart += `【ユーザー情報】\n${profileBlock}\n\n`;

  const memoText = aiMemo || profile?.ai_memo || null;
  if (env.MEMO_ENABLED === 'true' && memoText) {
    fixedPart += `【AIの理解メモ】\n${memoText}\n\n`;
  }

  fixedPart += COMMON_RULES;
  if (body.system) fixedPart += `\n\n${body.system}`;

  let variablePart = '';
  if (env.RAG_ENABLED === 'true' && ragResults && ragResults.length > 0) {
    variablePart += `\n【関連する過去の会話】\n`;
    ragResults.forEach(r => { variablePart += `・${r.date}: ${r.content}\n`; });
    variablePart += `※直近の会話が最優先。過去の会話は参考情報として扱うこと\n`;
  }

  return { fixedPart, variablePart };
}
