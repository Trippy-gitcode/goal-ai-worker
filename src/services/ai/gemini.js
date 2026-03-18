import { getModel } from '../../utils/constants.js';

export async function handleGeminiChat(env, system, messages, auth, userLocation) {
  const model = getModel(auth.plan, 'gemini');
  try {
    const geminiContents = messages
      .filter(m => m.content && (typeof m.content === 'string' ? m.content.trim() : true))
      .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }] }));
    if (geminiContents.length > 0 && geminiContents[0].role === 'model') {
      geminiContents.unshift({ role: 'user', parts: [{ text: '...' }] });
    }
    if (geminiContents.length === 0) throw new Error('No valid messages');

    let geminiSystem = system || '';
    if (userLocation && userLocation.city) {
      geminiSystem += `\n\nユーザーの現在地: ${userLocation.region} ${userLocation.city}`;
      geminiSystem += `\n天気・交通・地域情報の質問には、この位置情報を踏まえて回答してください。`;
    }

    const reqBody = {
      contents: geminiContents,
      generationConfig: { maxOutputTokens: 1000 }
    };
    if (geminiSystem) reqBody.system_instruction = { parts: [{ text: geminiSystem }] };
    reqBody.tools = [{ google_search: {} }];

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reqBody) }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error('Gemini API error:', res.status, errText);
      throw new Error('Gemini API error: ' + res.status);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    if (!text) throw new Error('Empty Gemini response');
    const sseBody = `data: {"type":"content_block_delta","delta":{"text":${JSON.stringify(text)}}}\n\ndata: [DONE]\n\n`;
    return new Response(sseBody, { status: 200, headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'X-Model-Used': model } });
  } catch (e) {
    console.error('handleGeminiChat failed:', e.message);
    return null;
  }
}
