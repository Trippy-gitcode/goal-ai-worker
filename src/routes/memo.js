import { authenticateRequest, getUserIdFromToken } from '../middleware/auth.js';
import { jsonRes } from '../utils/helpers.js';
import { supabaseQuery } from '../utils/supabase.js';
// SUBAGENT-LAIS-INPUTGUARD-9ROUTES-V1 (2026-05-02、 Round 31 P4 #39 fix): 16 KB cap (memo content)
import { parseBodyGuarded } from '../middleware/input-guard.js';

export async function handleAIMemoGenerate(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const _g = await parseBodyGuarded(request, { maxBytes: 16 * 1024 });
  if (!_g.ok) return jsonRes({ error: _g.error }, _g.status);
  const body = _g.body;
  const { type, goal_id, trigger } = body;
  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'User not found' }, 404);
  const users = await supabaseQuery(env, 'users', 'GET', { params: `id=eq.${userId}&select=*` });
  const profile = users?.[0];
  if (!profile) return jsonRes({ error: 'Profile not found' }, 404);
  let memoText = '';

  if (type === 'goal' && goal_id) {
    const goals = await supabaseQuery(env, 'goals', 'GET', { params: `id=eq.${goal_id}&select=*` });
    const goal = goals?.[0];
    if (!goal) return jsonRes({ error: 'Goal not found' }, 404);
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST', headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-5-mini', messages: [{ role: 'user', content: `以下の情報からAI理解メモを生成。200字以内で簡潔に。\nユーザー: ${profile.nickname||'未設定'}, ${profile.occupation||''}, ${profile.age||''}歳, MBTI:${profile.mbti||''}\n強み:${profile.strengths||''} 弱み:${profile.weaknesses||''}\nゴール:${goal.title} 理由:${goal.why||''} 期限:${goal.target_date||'未設定'}\nAIロール:${goal.ai_role_icon||''} ${goal.ai_role_name||'万能コーチ'}\n\nフォーマット:\n【あなたについて】...\n【このゴールについて】...\n【AIの行動方針】3-5項目` }], max_tokens: 400 })
      });
      const data = await res.json();
      memoText = data.choices?.[0]?.message?.content || '';
    } catch(e) { memoText = ''; }
    if (memoText) await supabaseQuery(env, 'goals', 'PATCH', { params: `id=eq.${goal_id}`, body: { ai_memo: memoText, ai_memo_updated_at: new Date().toISOString() } });
  } else if (type === 'home') {
    try {
      const goalsRes = await supabaseQuery(env, 'goals', 'GET', { params: `user_id=eq.${userId}&select=title,progress,target_date&archived=eq.false` });
      const goalsList = (goalsRes || []).map(g => `🎯 ${g.title}（${g.progress||0}%）`).join('\n');
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST', headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-5-mini', messages: [{ role: 'user', content: `以下の情報からAI理解メモを生成。200字以内で簡潔に。\nユーザー: ${profile.nickname||'未設定'}, ${profile.occupation||''}, ${profile.age||''}歳\nMBTI:${profile.mbti||''} 強み:${profile.strengths||''} 弱み:${profile.weaknesses||''}\n価値観:${profile.values||''} ビジョン:${profile.vision||''}\nゴール:\n${goalsList||'なし'}\n\nフォーマット:\n【あなたについて】...\n【取り組み中のゴール】...\n【AIの行動方針】3-5項目` }], max_tokens: 400 })
      });
      const data = await res.json();
      memoText = data.choices?.[0]?.message?.content || '';
    } catch(e) { memoText = ''; }
    if (memoText) await supabaseQuery(env, 'users', 'PATCH', { params: `id=eq.${userId}`, body: { ai_memo: memoText, ai_memo_updated_at: new Date().toISOString() } });
  }
  return jsonRes({ memo: memoText, type, trigger });
}
