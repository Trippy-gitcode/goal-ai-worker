import { authenticateRequest } from '../middleware/auth.js';
import { jsonRes, safePgrestValue, isSafePgrestValue } from '../utils/helpers.js';
import { safeLog, safeError, hashIdSync, fingerprintToken } from '../utils/safeLog.js';
import { checkRateLimit } from '../utils/rate-limit.js';

export async function handleAccountExport(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1: H-07 rate-limit roll-out
  //   account export は heavy + Stripe metadata 含むため厳格 throttle。
  const rl = await checkRateLimit(env, auth.userId);
  if (!rl.ok) return jsonRes({ error: 'Rate limit exceeded' }, 429);

  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_KEY;
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };
  const userId = auth.userId;
  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 — D-02 PostgREST filter injection fix:
  //   userId を safePgrestValue で encode、5 つの並列 fetch URL に適用。
  // SUBAGENT-DEVSYS-ROUND4-P0-FIX-V1 (2026-05-01) — Round 4 Mode A finding A-2:
  //   `safeUid === ''` を early reject。空 right-hand side で PostgREST に
  //   `?user_id=eq.` を送ると uuid column 400 / text column 全件 read リスク。
  const safeUid = safePgrestValue(userId);
  if (!isSafePgrestValue(safeUid)) {
    safeError('account.export_invalid_uid', new Error('safePgrestValue rejected userId'));
    return jsonRes({ error: 'Invalid user id' }, 400);
  }

  try {
    const [userRes, goalsRes, msgsRes, usageRes, feedbackRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/users?user_id=eq.${safeUid}&select=*`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/goals?user_id=eq.${safeUid}&select=*&order=created_at.desc`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/chat_messages?user_id=eq.${safeUid}&select=role,content,ai_model,created_at,session_id,goal_id&order=created_at.desc&limit=500`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/usage_tracking?user_id=eq.${safeUid}&select=*`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/feedbacks?user_id=eq.${safeUid}&select=*`, { headers }),
    ]);

    const data = {
      exported_at: new Date().toISOString(),
      user: (await userRes.json())?.[0] || null,
      goals: await goalsRes.json(),
      chat_messages: await msgsRes.json(),
      usage: await usageRes.json(),
      feedbacks: await feedbackRes.json(),
    };

    // Redact sensitive fields
    if (data.user) {
      delete data.user.stripe_customer_id;
      delete data.user.stripe_subscription_id;
      delete data.user.stripe_metered_subscription_item_id;
    }

    return new Response(JSON.stringify(data, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="goal-ai-export.json"' },
    });
  } catch (e) {
    safeError('account.export_error', e);
    return jsonRes({ error: 'データエクスポートに失敗しました' }, 500);
  }
}

export async function handleAccountDelete(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1: H-07 rate-limit roll-out (destructive op を厳格 throttle)
  const rl = await checkRateLimit(env, auth.userId);
  if (!rl.ok) return jsonRes({ error: 'Rate limit exceeded' }, 429);

  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_KEY;
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' };

  const userId = auth.userId;
  const tokenId = auth.tokenId;
  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 — D-02 PostgREST filter injection fix:
  //   delete も userId を safePgrestValue で encode 統一。
  // SUBAGENT-DEVSYS-ROUND4-P0-FIX-V1 (2026-05-01) — Round 4 Mode A finding A-2:
  //   DELETE endpoint で `safeUid === ''` を絶対に許さない (全件 DELETE 化を防ぐ)。
  const safeUid = safePgrestValue(userId);
  if (!isSafePgrestValue(safeUid)) {
    safeError('account.delete_invalid_uid', new Error('safePgrestValue rejected userId for DELETE'));
    return jsonRes({ error: 'Invalid user id' }, 400);
  }

  // FIX (external review CRITICAL R-5): res.ok を check しないと HTTP 4xx/5xx で
  // 例外スローされず、partial deletion = GDPR Art.17 / 個人情報保護法 §35 違反 risk。
  // 1 件でも fail で全体 abort、retry queue 経由で再試行可能に。
  //
  // SUBAGENT-DEVSYS-ROUND5-FIX-V1 (2026-05-01) — Round 5 finding B-4:
  //   GDPR Art.5(2) accountability + Art.30 Records of Processing Activities 準拠のため
  //   各 table 毎に table_done event を発火し、最後に集約 audit trail (account.deleted) を残す。
  //   referrals は 2 経路 (referrer / referred) を別々に log し、retention policy で
  //   30 日以内の subject right 行使履歴を自証可能化する。
  const _doDel = async (url, label) => {
    const res = await fetch(url, { method: 'DELETE', headers });
    if (!res.ok && res.status !== 404) {
      const body = await res.text().catch(() => '');
      throw new Error(`account delete ${label} failed: status=${res.status} body=${body.slice(0, 200)}`);
    }
    return res;
  };
  // Round 5 B-4 audit-trail per-table emitter (pseudonymised user_hash only).
  const userHashAudit = hashIdSync(userId);
  const tokenFpAudit = fingerprintToken(tokenId);
  const totalTables = 7; // chat_messages / usage_tracking / goals / feedbacks / referrals_referrer / referrals_referred / users
  const _logTable = (idx, table) => {
    safeLog('INFO', 'account.delete.table_done', {
      user_hash: userHashAudit,
      table,
      table_index: idx,
      total_tables: totalTables,
    });
  };
  try {
    // 1. chat_messages
    await _doDel(`${supabaseUrl}/rest/v1/chat_messages?user_id=eq.${safeUid}`, 'chat_messages');
    _logTable(1, 'chat_messages');
    // 2. usage_tracking
    await _doDel(`${supabaseUrl}/rest/v1/usage_tracking?user_id=eq.${safeUid}`, 'usage_tracking');
    _logTable(2, 'usage_tracking');
    // 3. goals + tasks (goals has user_id)
    await _doDel(`${supabaseUrl}/rest/v1/goals?user_id=eq.${safeUid}`, 'goals');
    _logTable(3, 'goals');
    // 4. feedbacks
    await _doDel(`${supabaseUrl}/rest/v1/feedbacks?user_id=eq.${safeUid}`, 'feedbacks');
    _logTable(4, 'feedbacks');
    // 5. referrals (both as referrer and referred) — Round 5 B-4: 2 経路を別々に log
    await _doDel(`${supabaseUrl}/rest/v1/referrals?referrer_user_id=eq.${safeUid}`, 'referrals_referrer');
    _logTable(5, 'referrals_referrer');
    await _doDel(`${supabaseUrl}/rest/v1/referrals?referred_user_id=eq.${safeUid}`, 'referrals_referred');
    _logTable(6, 'referrals_referred');
    // 6. users table (last)
    await _doDel(`${supabaseUrl}/rest/v1/users?user_id=eq.${safeUid}`, 'users');
    _logTable(7, 'users');

    // 7. KV cleanup
    if (tokenId) {
      await env.TOKEN_KV.delete(`token:${tokenId}`);
    }

    // PII: subject-rights audit trail must not retain raw identifiers — emit
    // hashed user fingerprint + token prefix only (Wave 1 #11/#41 P0 finding).
    // Round 5 B-4: 集約 audit trail = table_done × 7 件後の status='success' 集計。
    safeLog('INFO', 'account.deleted', {
      user_hash: userHashAudit,
      token_fp: tokenFpAudit,
      total_tables_processed: totalTables,
      status: 'success',
    });
    return jsonRes({ ok: true, message: 'アカウントを削除しました' });
  } catch (e) {
    safeError('account.delete_error', e);
    // Round 5 B-4: 失敗時も pseudonymised audit trail を残す (どこまで進んだか trace 可能化)。
    safeLog('WARN', 'account.deleted', {
      user_hash: userHashAudit,
      token_fp: tokenFpAudit,
      total_tables_processed: totalTables,
      status: 'failed',
    });
    return jsonRes({ error: 'アカウント削除に失敗しました' }, 500);
  }
}
