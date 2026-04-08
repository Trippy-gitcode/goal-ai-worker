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
  // B4: ゴール変更時にprofile KVキャッシュをinvalidate
  await env.TOKEN_KV.delete(`profile:${auth.tokenId}`).catch(() => {});
  return jsonRes({ goal: goal?.[0] || null }, 201);
}

export async function handleGoalUpdate(request, env, url) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);
  const goalId = url.pathname.split('/').pop();
  // #619 FIX: UUID形式検証
  if (!goalId || !/^[0-9a-f-]{36}$/.test(goalId)) return jsonRes({ error: 'Invalid goalId' }, 400);
  const body = await request.json();
  const updates = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.status !== undefined) updates.status = body.status;
  if (body.progress !== undefined) updates.progress = body.progress;
  if (body.targetDate !== undefined) updates.target_date = body.targetDate;
  if (body.lastMilestonePct !== undefined) updates.last_milestone_pct = body.lastMilestonePct;
  if (body.phases !== undefined) updates.phases = body.phases;
  const result = await supabaseQuery(env, 'goals', 'PATCH', { filters: `id=eq.${goalId}&user_id=eq.${userId}`, body: updates });
  // B4: ゴール変更時にprofile KVキャッシュをinvalidate
  await env.TOKEN_KV.delete(`profile:${auth.tokenId}`).catch(() => {});
  return jsonRes({ goal: result?.[0] || null });
}

export async function handleGoalDelete(request, env, url) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);
  const goalId = url.pathname.split('/').pop();
  await supabaseQuery(env, 'goals', 'DELETE', { filters: `id=eq.${goalId}&user_id=eq.${userId}` });
  // B4: ゴール変更時にprofile KVキャッシュをinvalidate
  await env.TOKEN_KV.delete(`profile:${auth.tokenId}`).catch(() => {});
  return jsonRes({ deleted: true });
}

export async function handleSuggestTasks(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const body = await request.json();
  const { goal_title, existing_tasks } = body;
  if (!goal_title) return jsonRes({ error: 'goal_title required' }, 400);
  try {
    const taskList = (existing_tasks || []).join('、') || 'なし';
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [{ role: 'user', content: `ゴール「${goal_title}」の達成に向けて、次にやるべきタスクを2〜3個提案してください。既存タスク：${taskList}。既存と重複しない新しいタスクを提案。各タスクは15文字以内の簡潔なタイトル。JSON形式で返却：{"tasks":["タスク名1","タスク名2"]}` }],
        max_tokens: 200, response_format: { type: 'json_object' }
      })
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    return jsonRes(JSON.parse(content));
  } catch(e) {
    return jsonRes({ tasks: ['進捗を振り返る', '次のマイルストーンを設定'] });
  }
}

export async function handleExtractGoals(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);
  try {
    // Fetch recent chat history
    const messages = await supabaseQuery(env, 'chat_messages', 'GET', {
      filters: `user_id=eq.${userId}&order=created_at.desc&limit=50`
    });
    if (!messages || messages.length < 3) return jsonRes({ goals: [] });
    const context = messages.map(m => `${m.role}: ${(m.content || '').slice(0, 200)}`).join('\n').slice(0, 2000);
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [{ role: 'user', content: `以下の会話履歴から、ユーザーが取り組みたそうなゴール候補を最大3つ抽出してください。既に明示的にゴール化されたものは除外。各ゴールはタイトル（20文字以内）と根拠（会話のどの部分から推定したか、15文字以内）。JSON形式：{"goals":[{"title":"ゴール名","reason":"根拠"}]}\n\n${context}` }],
        max_tokens: 300, response_format: { type: 'json_object' }
      })
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    return jsonRes(JSON.parse(content));
  } catch(e) {
    return jsonRes({ goals: [] });
  }
}

// UX-01-A5: ゴール間リンク作成
export async function handleGoalLinkCreate(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);
  const body = await request.json();
  const { goal_id_from, goal_id_to, link_type, created_by } = body;
  if (!goal_id_from || !goal_id_to) return jsonRes({ error: 'goal_id_from and goal_id_to required' }, 400);
  const result = await supabaseQuery(env, 'goal_links', 'POST', {
    body: { goal_id_from, goal_id_to, link_type: link_type || 'related', created_by: created_by || 'manual' },
  });
  return jsonRes({ link: result?.[0] || null }, 201);
}

// UX-01-A5: ゴールの関連ゴール取得
export async function handleGoalLinksGet(request, env, url) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const parts = url.pathname.split('/');
  const goalId = parts[parts.indexOf('goals') + 1];
  const links = await supabaseQuery(env, 'goal_links', 'GET', {
    filters: `or=(goal_id_from.eq.${goalId},goal_id_to.eq.${goalId})`,
  });
  return jsonRes({ links: links || [] });
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
