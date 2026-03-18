import { supabaseQuery } from '../utils/supabase.js';

export async function generateAndStoreEmbedding(env, tokenId, sessionId, goalId, text) {
  try {
    if (!text || text.length < 20) return;
    const truncatedForEmbed = text.slice(0, 500);
    const truncatedContent = text.slice(0, 200);

    const embRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: truncatedForEmbed }),
    });
    if (!embRes.ok) { console.error('Embedding API error:', await embRes.text()); return; }
    const embData = await embRes.json();
    const embedding = embData.data?.[0]?.embedding;
    if (!embedding) return;

    await supabaseQuery(env, 'chat_embeddings', 'POST', {
      body: { token_id: tokenId, session_id: sessionId || null, goal_id: goalId || null, content: truncatedContent, embedding: JSON.stringify(embedding) },
    });
  } catch (e) { console.error('generateAndStoreEmbedding error:', e); }
}

export async function searchRelatedMessages(env, tokenId, userMessage, goalId) {
  try {
    if (!userMessage || userMessage.length < 10) return [];
    const embRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: userMessage.slice(0, 500) }),
    });
    if (!embRes.ok) return [];
    const embData = await embRes.json();
    const queryEmbedding = embData.data?.[0]?.embedding;
    if (!queryEmbedding) return [];

    const rpcRes = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/match_embeddings`, {
      method: 'POST',
      headers: { 'apikey': env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query_embedding: queryEmbedding, match_token_id: tokenId, match_threshold: 0.75, match_count: 3 }),
    });
    if (!rpcRes.ok) { console.error('match_embeddings RPC error:', await rpcRes.text()); return []; }
    return await rpcRes.json() || [];
  } catch (e) { console.error('searchRelatedMessages error:', e); return []; }
}
