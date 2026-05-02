import { authenticateRequest, getUserIdFromToken } from '../middleware/auth.js';
import { jsonRes, safePgrestValue } from '../utils/helpers.js';
import { supabaseQuery } from '../utils/supabase.js';
import { QOL_PROPOSAL_PROMPT } from '../services/prompt.js';
import { checkRateLimit } from '../utils/rate-limit.js';
import { safeError } from '../utils/safeLog.js';
import { parseBodyGuarded } from '../middleware/input-guard.js';

const DEFAULT_IDENTITY = {
  vision: null,
  identity: {},
  mindset_preset: 'futoshi',
  qol_proposals: [],
  routines: [],
  scheduling_preference: {
    hard_tasks_first: true,
    batch_errands: true,
    buffer_minutes: 15,
    focus_hours: 'morning',
    max_daily_tasks: 5,
  },
};

export async function handleIdentityGet(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1: H-07 rate-limit roll-out
  const rl = await checkRateLimit(env, auth.userId);
  if (!rl.ok) return jsonRes({ error: 'Rate limit exceeded' }, 429);
  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);

  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 — D-02 PostgREST filter injection fix
  const rows = await supabaseQuery(env, 'user_identity', 'GET', {
    filters: `user_id=eq.${safePgrestValue(userId)}`,
  });

  if (rows && rows[0]) {
    return jsonRes(rows[0]);
  }
  return jsonRes({ user_id: userId, ...DEFAULT_IDENTITY });
}

export async function handleIdentityPut(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);

  // Round 31 Cat-I P0 fix (2026-05-02): parseBodyGuarded で size cap + prototype pollution +
  //   nested depth + dangerous key strip (__proto__) を防御。 識別 50KB cap (identity / routines /
  //   qol_proposals が large 可能性、 但し 100KB 超は reject)。
  const guard = await parseBodyGuarded(request, { maxBytes: 100 * 1024, maxKeys: 100, maxDepth: 8 });
  if (!guard.ok) return jsonRes({ error: guard.error }, guard.status);
  const body = guard.body;
  const updates = { user_id: userId };
  if (body.vision !== undefined) updates.vision = body.vision;
  // BUG-03: identityはマージ（profile追加時に既存のstrengths/vision等を消さない）
  if (body.identity !== undefined) {
    // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 — D-02 PostgREST filter injection fix
    const existing = await supabaseQuery(env, 'user_identity', 'GET', {
      filters: `user_id=eq.${safePgrestValue(userId)}`, select: 'identity',
    });
    const existingIdentity = existing?.[0]?.identity || {};
    updates.identity = { ...existingIdentity, ...body.identity };
  }
  if (body.mindset_preset !== undefined) updates.mindset_preset = body.mindset_preset;
  if (body.qol_proposals !== undefined) updates.qol_proposals = body.qol_proposals;
  if (body.routines !== undefined) updates.routines = body.routines;
  if (body.scheduling_preference !== undefined) updates.scheduling_preference = body.scheduling_preference;
  updates.updated_at = new Date().toISOString();

  const result = await supabaseQuery(env, 'user_identity', 'POST', {
    body: updates,
    filters: 'on_conflict=user_id',
  });

  return jsonRes(result?.[0] || { user_id: userId, ...updates });
}

export async function handleQOLGenerate(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'ユーザーが見つかりません' }, 404);

  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 — D-02 PostgREST filter injection fix
  const rows = await supabaseQuery(env, 'user_identity', 'GET', {
    filters: `user_id=eq.${safePgrestValue(userId)}`,
  });
  const identity = rows?.[0]?.identity || {};
  const vision = rows?.[0]?.vision || '';

  // Load existing goals to avoid duplicates
  const goals = await supabaseQuery(env, 'goals', 'GET', {
    filters: `user_id=eq.${safePgrestValue(userId)}&status=neq.archived`,
    select: 'title',
  });
  const goalTitles = (goals || []).map(g => g.title).filter(Boolean);

  // Build user context for AI
  const now = new Date();
  const month = now.getMonth() + 1;
  const seasons = { 1:'冬',2:'冬',3:'春',4:'春',5:'春',6:'夏',7:'夏',8:'夏',9:'秋',10:'秋',11:'秋',12:'冬' };
  const timingHints = [];
  if (month >= 1 && month <= 3) timingHints.push('確定申告期（2-3月）');
  if (month === 6 || month === 12) timingHints.push('ボーナス期');
  if (month >= 10 && month <= 12) timingHints.push('年末調整・ふるさと納税締切');
  if (month === 4) timingHints.push('新年度・新生活');

  const userContext = `ユーザー情報:
ビジョン: ${vision || '未設定'}
年齢: ${identity.age || '不明'}
職業: ${identity.occupation || '不明'}(${identity.field || ''})
年収帯: ${identity.income_range || '不明'}
エリア: ${identity.area || '不明'}
見られたい姿: ${(identity.desired_image || []).join('、') || '未設定'}
強み: ${(identity.strengths || []).join('、') || '未設定'}
趣味・興味: ${(identity.interests || []).join('、') || '未設定'}
価値観: ${(identity.values || []).join('、') || '未設定'}
現在時期: ${now.getFullYear()}年${month}月（${seasons[month]}）
時期ヒント: ${timingHints.join('、') || 'なし'}
既存ゴール: ${goalTitles.length ? goalTitles.join('、') : 'なし'}`;

  // Call GPT for structured JSON generation
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_completion_tokens: 500,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: QOL_PROPOSAL_PROMPT },
          { role: 'user', content: userContext },
        ],
      }),
    });
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || '[]';
    let proposals;
    try {
      const parsed = JSON.parse(raw);
      proposals = Array.isArray(parsed) ? parsed : parsed.proposals || parsed.items || [];
    } catch { proposals = []; }

    // Add generated_at timestamp
    const generated_at = now.toISOString();
    proposals = proposals.slice(0, 3).map(p => ({
      title: p.title || '',
      description: p.description || '',
      category: p.category || 'lifestyle',
      urgency: p.urgency || 'this_month',
      generated_at,
    }));

    // Save to user_identity
    await supabaseQuery(env, 'user_identity', 'POST', {
      body: { user_id: userId, qol_proposals: proposals, updated_at: generated_at },
      filters: 'on_conflict=user_id',
    });

    return jsonRes({ qol_proposals: proposals });
  } catch (e) {
    // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 — Wave 1 #52 P1 finding #7 fix:
    //   unstructured console.error を safeError (PII-aware structured) に置換
    safeError('me.qol_generate_failed', e);
    return jsonRes({ error: 'QOL生成に失敗しました' }, 500);
  }
}
