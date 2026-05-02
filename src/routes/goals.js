import { authenticateRequest, getUserIdFromToken } from '../middleware/auth.js';
import { jsonRes, isValidUuid, safePgrestValue } from '../utils/helpers.js';
import { supabaseQuery } from '../utils/supabase.js';
import { checkRateLimit } from '../utils/rate-limit.js';
import { parseBodyGuarded } from '../middleware/input-guard.js';
// SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 (2026-05-01) — Wave 1 #35 H-07 fix:
//   rate-limit が 3 routes (chat / voice) のみ。本ファイルでも auth 後に
//   `checkRateLimit` を全 handler 入口で発火、IDOR + brute-force 防御。

export async function handleGoalsList(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1: H-07 rate-limit roll-out
  const rl = await checkRateLimit(env, auth.userId);
  if (!rl.ok) return jsonRes({ error: 'Rate limit exceeded' }, 429);
  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);
  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1: PostgREST filter injection (D-02) 対策で safePgrestValue
  const goals = await supabaseQuery(env, 'goals', 'GET', { filters: `user_id=eq.${safePgrestValue(userId)}&order=created_at.desc` });
  return jsonRes({ goals: goals || [] });
}

export async function handleGoalCreate(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);
  const _g = await parseBodyGuarded(request, { maxBytes: 50 * 1024, maxArrayLen: 200 }); if (!_g.ok) return jsonRes({ error: _g.error }, _g.status); const body = _g.body;
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
  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1: UUID 検証を isValidUuid に統一 + safePgrestValue で encode
  if (!isValidUuid(goalId)) return jsonRes({ error: 'Invalid goalId' }, 400);
  const _g = await parseBodyGuarded(request, { maxBytes: 50 * 1024, maxArrayLen: 200 }); if (!_g.ok) return jsonRes({ error: _g.error }, _g.status); const body = _g.body;
  const updates = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.status !== undefined) updates.status = body.status;
  if (body.progress !== undefined) updates.progress = body.progress;
  if (body.targetDate !== undefined) updates.target_date = body.targetDate;
  if (body.lastMilestonePct !== undefined) updates.last_milestone_pct = body.lastMilestonePct;
  if (body.phases !== undefined) updates.phases = body.phases;
  const result = await supabaseQuery(env, 'goals', 'PATCH', { filters: `id=eq.${safePgrestValue(goalId)}&user_id=eq.${safePgrestValue(userId)}`, body: updates });
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
  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1: UUID 検証 + safePgrestValue で encode
  if (!isValidUuid(goalId)) return jsonRes({ error: 'Invalid goalId' }, 400);
  await supabaseQuery(env, 'goals', 'DELETE', { filters: `id=eq.${safePgrestValue(goalId)}&user_id=eq.${safePgrestValue(userId)}` });
  // B4: ゴール変更時にprofile KVキャッシュをinvalidate
  await env.TOKEN_KV.delete(`profile:${auth.tokenId}`).catch(() => {});
  return jsonRes({ deleted: true });
}

export async function handleSuggestTasks(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const _g = await parseBodyGuarded(request, { maxBytes: 50 * 1024, maxArrayLen: 200 }); if (!_g.ok) return jsonRes({ error: _g.error }, _g.status); const body = _g.body;
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
//
// SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 (2026-05-01) — Wave 1 #35 H-06 fix:
//   IDOR 対策。`goal_id_from` / `goal_id_to` が user の所有 goal か事前検証。
//   non-owner goal で goal-graph poison を作る攻撃を遮断。UUID format も検証。
export async function handleGoalLinkCreate(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);
  const _g = await parseBodyGuarded(request, { maxBytes: 50 * 1024, maxArrayLen: 200 }); if (!_g.ok) return jsonRes({ error: _g.error }, _g.status); const body = _g.body;
  const { goal_id_from, goal_id_to, link_type, created_by } = body;
  if (!goal_id_from || !goal_id_to) return jsonRes({ error: 'goal_id_from and goal_id_to required' }, 400);
  // Wave 1 #35 H-06: UUID 形式 + ownership 検証
  if (!isValidUuid(goal_id_from) || !isValidUuid(goal_id_to)) return jsonRes({ error: 'Invalid goal id format' }, 400);
  // 両 goal が user の所有か確認 (PostgREST poison check 込み)
  const ownedFrom = await supabaseQuery(env, 'goals', 'GET', { filters: `id=eq.${safePgrestValue(goal_id_from)}&user_id=eq.${safePgrestValue(userId)}`, select: 'id' });
  const ownedTo = await supabaseQuery(env, 'goals', 'GET', { filters: `id=eq.${safePgrestValue(goal_id_to)}&user_id=eq.${safePgrestValue(userId)}`, select: 'id' });
  if (!ownedFrom?.length || !ownedTo?.length) return jsonRes({ error: 'goal_id_from and goal_id_to must be owned by you' }, 403);
  const result = await supabaseQuery(env, 'goal_links', 'POST', {
    body: { goal_id_from, goal_id_to, link_type: link_type || 'related', created_by: created_by || 'manual' },
  });
  return jsonRes({ link: result?.[0] || null }, 201);
}

// UX-01-A5: ゴールの関連ゴール取得
//
// SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 (2026-05-01) — Wave 1 #35 H-05 / D-02 fix:
//   IDOR + PostgREST filter injection 対策。`goalId` を UUID 検証 + safe encode、
//   かつ user 所有 goal でなければ早期 403 reject。tenant isolation を確立。
export async function handleGoalLinksGet(request, env, url) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);
  const parts = url.pathname.split('/');
  const goalId = parts[parts.indexOf('goals') + 1];
  // Wave 1 #35 H-05 / D-02: UUID 検証 + tenant ownership 確認
  if (!isValidUuid(goalId)) return jsonRes({ error: 'Invalid goalId' }, 400);
  const owned = await supabaseQuery(env, 'goals', 'GET', { filters: `id=eq.${safePgrestValue(goalId)}&user_id=eq.${safePgrestValue(userId)}`, select: 'id' });
  if (!owned?.length) return jsonRes({ error: 'Goal not found or not owned' }, 403);
  const safeGoalId = safePgrestValue(goalId);
  const links = await supabaseQuery(env, 'goal_links', 'GET', {
    filters: `or=(goal_id_from.eq.${safeGoalId},goal_id_to.eq.${safeGoalId})`,
  });
  return jsonRes({ links: links || [] });
}

export async function handleSuggestRoles(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const _g = await parseBodyGuarded(request, { maxBytes: 50 * 1024, maxArrayLen: 200 }); if (!_g.ok) return jsonRes({ error: _g.error }, _g.status); const body = _g.body;
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
