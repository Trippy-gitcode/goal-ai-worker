import { supabaseQuery, supabaseHeaders } from '../utils/supabase.js';

export async function countRecentMessages(env, tokenId) {
  try {
    const users = await supabaseQuery(env, 'users', 'GET', {
      filters: `token_id=eq.${encodeURIComponent(tokenId)}`,
      select: 'id',
    });
    const userId = users?.[0]?.id;
    if (!userId) return 0;

    const url = `${env.SUPABASE_URL}/rest/v1/chat_messages?user_id=eq.${userId}&role=eq.user&select=id`;
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { ...supabaseHeaders(env), 'Prefer': 'count=exact' },
    });
    const contentRange = res.headers.get('content-range');
    if (contentRange) {
      const total = contentRange.split('/')[1];
      return parseInt(total) || 0;
    }
    return 0;
  } catch (e) { return 0; }
}

export async function regenerateAiMemo(env, tokenId, goalId) {
  try {
    // J: KVロックで重複実行防止
    const lockKey = `memo_lock:${tokenId}`;
    const locked = await env.TOKEN_KV.get(lockKey);
    if (locked) return; // 既に実行中
    await env.TOKEN_KV.put(lockKey, '1', { expirationTtl: 60 }); // 60秒ロック

    const users = await supabaseQuery(env, 'users', 'GET', {
      filters: `token_id=eq.${encodeURIComponent(tokenId)}`,
      select: 'id',
    });
    const userId = users?.[0]?.id;
    if (!userId) { await env.TOKEN_KV.delete(lockKey); return; }

    // A13/B17: limit=20 — buildCompressedMessagesのwindowSize=10なので20件で十分
    let filters = `user_id=eq.${userId}&order=created_at.desc&limit=20`;
    if (goalId) filters += `&goal_id=eq.${goalId}`;

    const messages = await supabaseQuery(env, 'chat_messages', 'GET', { filters, select: 'role,content,created_at' });
    if (!messages || messages.length < 5) return;

    const conversationText = messages.reverse().map(m => `${m.role}: ${m.content}`).join('\n');

    // B-17: 直近7日間の日記を注入
    let diaryText = '';
    try {
      const diaries = await supabaseQuery(env, 'diaries', 'GET', {
        filters: `user_id=eq.${userId}&order=date.desc&limit=7`,
        select: 'date,content',
      });
      if (diaries?.length) {
        diaryText = '\n\n【直近の日記】\n' + diaries.map(d => `${d.date}: ${d.content}`).join('\n');
      }
    } catch(e) {}

    // A5: 前回のai_memoがあればdiff更新（入力60%削減）
    let existingMemo = null;
    if (goalId) {
      const goals = await supabaseQuery(env, 'goals', 'GET', { filters: `id=eq.${goalId}`, select: 'ai_memo' });
      existingMemo = goals?.[0]?.ai_memo;
    } else {
      const userRows = await supabaseQuery(env, 'users', 'GET', { filters: `token_id=eq.${encodeURIComponent(tokenId)}`, select: 'ai_memo' });
      existingMemo = userRows?.[0]?.ai_memo;
    }

    const prompt = existingMemo
      ? `以下は前回のAI理解メモです。最近の会話と日記を踏まえて変更点のみ更新してください。変更がない項目はそのまま残してください。\n\n【前回のメモ】\n${existingMemo}\n\n【最近の会話】\n${conversationText}${diaryText}\n\n【出力ルール】\n- 箇条書き10〜15項目以内、合計1,200文字以内\n- 変更・追加があった項目のみ書き換え`
      : `以下の会話履歴から、このユーザーについてわかったことを要約してください。\n\n【出力ルール】\n- 箇条書き10〜15項目以内\n- 合計1,200文字以内（厳守）\n- 性格傾向・行動パターン・コミュニケーションの好み・モチベーション源・弱点と対処法を含めること\n\n【会話履歴】\n${conversationText}${diaryText}`;

    // A11: gpt-5-mini — 構造化要約タスクにSonnet不要、コスト¥2.2/月/ユーザー削減
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-5-mini', max_completion_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const memo = data.choices?.[0]?.message?.content;
    if (!memo) return;

    if (goalId) {
      await supabaseQuery(env, 'goals', 'PATCH', { filters: `id=eq.${goalId}`, body: { ai_memo: memo, ai_memo_updated_at: new Date().toISOString() } });
    } else {
      await supabaseQuery(env, 'users', 'PATCH', { filters: `token_id=eq.${encodeURIComponent(tokenId)}`, body: { ai_memo: memo, ai_memo_updated_at: new Date().toISOString() } });
    }

    await env.TOKEN_KV.delete(`profile:${tokenId}`);
    return true;
  } catch (e) { /* silent */ }
}

export async function checkMemoAutoUpdate(tokenId, env) {
  try {
    const dateKey = new Date().toISOString().slice(0,10);
    const countKey = `chat_count:${tokenId}:${dateKey}`;
    const count = parseInt(await env.TOKEN_KV.get(countKey) || '0');
    if (count > 0 && count % 5 === 0) {
      const users = await supabaseQuery(env, 'users', 'GET', {
        filters: `token_id=eq.${encodeURIComponent(tokenId)}`,
        select: 'id',
      });
      const userId = users?.[0]?.id;
      if (!userId) return;
      await supabaseQuery(env, 'users', 'PATCH', {
        filters: `id=eq.${userId}`,
        body: { ai_memo_updated_at: new Date().toISOString() }
      });
    }
  } catch(e) {}
}
