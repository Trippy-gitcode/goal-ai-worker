import { authenticateRequest } from '../middleware/auth.js';
import { jsonRes } from '../utils/helpers.js';
import { safeLog, safeError, hashIdSync, fingerprintToken } from '../utils/safeLog.js';

export async function handleAccountExport(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);

  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_KEY;
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };
  const userId = auth.userId;

  try {
    const [userRes, goalsRes, msgsRes, usageRes, feedbackRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/users?user_id=eq.${userId}&select=*`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/goals?user_id=eq.${userId}&select=*&order=created_at.desc`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/chat_messages?user_id=eq.${userId}&select=role,content,ai_model,created_at,session_id,goal_id&order=created_at.desc&limit=500`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/usage_tracking?user_id=eq.${userId}&select=*`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/feedbacks?user_id=eq.${userId}&select=*`, { headers }),
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

  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_KEY;
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' };

  const userId = auth.userId;
  const tokenId = auth.tokenId;

  try {
    // 1. chat_messages
    await fetch(`${supabaseUrl}/rest/v1/chat_messages?user_id=eq.${userId}`, { method: 'DELETE', headers });
    // 2. usage_tracking
    await fetch(`${supabaseUrl}/rest/v1/usage_tracking?user_id=eq.${userId}`, { method: 'DELETE', headers });
    // 3. goals + tasks (goals has user_id)
    await fetch(`${supabaseUrl}/rest/v1/goals?user_id=eq.${userId}`, { method: 'DELETE', headers });
    // 4. feedbacks
    await fetch(`${supabaseUrl}/rest/v1/feedbacks?user_id=eq.${userId}`, { method: 'DELETE', headers });
    // 5. referrals (both as referrer and referred)
    await fetch(`${supabaseUrl}/rest/v1/referrals?referrer_user_id=eq.${userId}`, { method: 'DELETE', headers });
    await fetch(`${supabaseUrl}/rest/v1/referrals?referred_user_id=eq.${userId}`, { method: 'DELETE', headers });
    // 6. users table (last)
    await fetch(`${supabaseUrl}/rest/v1/users?user_id=eq.${userId}`, { method: 'DELETE', headers });

    // 7. KV cleanup
    if (tokenId) {
      await env.TOKEN_KV.delete(`token:${tokenId}`);
    }

    // PII: subject-rights audit trail must not retain raw identifiers — emit
    // hashed user fingerprint + token prefix only (Wave 1 #11/#41 P0 finding).
    safeLog('INFO', 'account.deleted', { user_hash: hashIdSync(userId), token_fp: fingerprintToken(tokenId) });
    return jsonRes({ ok: true, message: 'アカウントを削除しました' });
  } catch (e) {
    safeError('account.delete_error', e);
    return jsonRes({ error: 'アカウント削除に失敗しました' }, 500);
  }
}
