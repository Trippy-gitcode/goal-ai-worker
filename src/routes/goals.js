import { authenticateRequest, getUserIdFromToken } from '../middleware/auth.js';
import { jsonRes } from '../utils/helpers.js';
import { supabaseQuery } from '../utils/supabase.js';

export async function handleGoalsList(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);
  const goals = await supabaseQuery(env, 'goals', 'GET', { filters: `user_id=eq.${userId}&order=created_at.desc` });
  return jsonRes({ goals: goals || [] });
}

export async function handleGoalCreate(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);
  const body = await request.json();
  const { title, description, targetDate } = body;
  if (!title) return jsonRes({ error: 'タイトルは必須です' }, 400);
  const goal = await supabaseQuery(env, 'goals', 'POST', { body: { user_id: userId, title, description: description || null, target_date: targetDate || null } });
  return jsonRes({ goal: goal?.[0] || null }, 201);
}

export async function handleGoalUpdate(request, env, url) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);
  const goalId = url.pathname.split('/').pop();
  const body = await request.json();
  const updates = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.status !== undefined) updates.status = body.status;
  if (body.progress !== undefined) updates.progress = body.progress;
  if (body.targetDate !== undefined) updates.target_date = body.targetDate;
  if (body.lastMilestonePct !== undefined) updates.last_milestone_pct = body.lastMilestonePct;
  const result = await supabaseQuery(env, 'goals', 'PATCH', { filters: `id=eq.${goalId}&user_id=eq.${userId}`, body: updates });
  return jsonRes({ goal: result?.[0] || null });
}

export async function handleGoalDelete(request, env, url) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);
  const goalId = url.pathname.split('/').pop();
  await supabaseQuery(env, 'goals', 'DELETE', { filters: `id=eq.${goalId}&user_id=eq.${userId}` });
  return jsonRes({ deleted: true });
}

export async function handleSuggestRoles(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const body = await request.json();
  const { goal_title, goal_why } = body;
  if (!goal_title) return jsonRes({ error: 'goal_title required' }, 400);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [{ role: 'user', content: `ゴール「${goal_title}」（理由：${goal_why || '未設定'}）に最適なコーチングロールを3つ提案。各ロールはアイコン（絵文字1つ）・名前（8文字以内）・説明（20文字以内）。JSON形式で返却：{"suggestions":[{"icon":"📚","name":"学習コーチ","description":"計画的な学習管理と弱点分析"}]}` }],
        max_tokens: 300, response_format: { type: 'json_object' }
      })
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    return jsonRes(JSON.parse(content));
  } catch(e) {
    return jsonRes({ suggestions: [
      { icon: '🎯', name: '万能コーチ', description: 'バランスの取れた総合支援' },
      { icon: '🔥', name: 'スパルタ', description: '厳しく追い込む' },
      { icon: '🤝', name: '伴走者', description: '寄り添い型サポート' }
    ]});
  }
}
