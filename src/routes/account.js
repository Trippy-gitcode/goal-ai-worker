import { authenticateRequest } from '../middleware/auth.js';
import { jsonRes } from '../utils/helpers.js';

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

    console.log(`Account deleted: user_id=${userId} token_id=${tokenId}`);
    return jsonRes({ ok: true, message: 'アカウントを削除しました' });
  } catch (e) {
    console.error('Account delete error:', e.message);
    return jsonRes({ error: 'アカウント削除に失敗しました' }, 500);
  }
}
