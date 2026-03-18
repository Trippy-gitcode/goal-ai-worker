export async function updateStreak(tokenId, supabaseUrl, supabaseKey) {
  try {
    const today = new Date(Date.now() + 9 * 3600000).toISOString().split('T')[0];
    const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' };
    const res = await fetch(
      `${supabaseUrl}/rest/v1/users?token_id=eq.${encodeURIComponent(tokenId)}&select=streak_count,streak_best,last_active_date`,
      { headers }
    );
    const users = await res.json();
    if (!users.length) return;
    const user = users[0];
    if (user.last_active_date === today) return;

    const yesterday = new Date(Date.now() + 9 * 3600000 - 86400000).toISOString().split('T')[0];
    const streak = user.last_active_date === yesterday ? (user.streak_count || 0) + 1 : 1;
    const best = Math.max(streak, user.streak_best || 0);

    await fetch(`${supabaseUrl}/rest/v1/users?token_id=eq.${encodeURIComponent(tokenId)}`, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ streak_count: streak, streak_best: best, last_active_date: today })
    });
  } catch (e) { /* silent */ }
}
