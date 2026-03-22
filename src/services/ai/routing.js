import { getModel } from '../../utils/constants.js';

export function quickRoute(message) {
  const msg = message.trim().toLowerCase();
  if (msg.length < 15) {
    if (/^(うん|はい|ok|おk|そう|ありがと|了解|わかった|なるほど|いいね|おー|へー|ほー|そうだね|たしかに)/.test(msg)) {
      return { route: 'gpt-simple', coaching: false };
    }
  }
  if (/^(天気|今日の天気|明日の天気|ニュース|最新の|検索して|調べて|〜とは\?|〜って何)/.test(msg)) {
    return { route: 'gemini', coaching: false };
  }
  if (/天気.*(教えて|おしえて|知りたい)|ニュース.*(教えて|おしえて|知りたい)/.test(msg)) {
    return { route: 'gemini', coaching: false };
  }
  if (/^(翻訳して|英語に|日本語に|要約して|まとめて|SNS.*書いて|キャッチコピー|タイトル案)/.test(msg)) {
    return { route: 'gpt', coaching: false };
  }
  if (/^(アイディア|おすすめ|提案して|考えて|リスト|比較して|教えて|作って|書いて)/.test(msg)) {
    return { route: 'gpt', coaching: false };
  }
  return null;
}

export async function callRoutingAPI(env, auth, userMessage) {
  try {
    const routeSystem = 'ユーザーのメッセージを分類せよ。以下のカテゴリから1単語のみ返せ: claude（深い感情サポート・人生相談・コーチング核心部・悩み・自己分析・価値観・モチベーション）, gemini（検索・天気・ニュース・事実Q&A・比較分析・データ処理・調査）, gpt-simple（相槌・短い返事・挨拶）, gpt（アイディア出し・一般会話・翻訳・要約・クリエイティブ・タスク相談・その他すべて）';
    const model = getModel(auth.plan, 'router');
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model, max_completion_tokens: 10, messages: [{ role: 'system', content: routeSystem }, { role: 'user', content: userMessage.slice(0, 300) }] })
    });
    const data = await res.json();
    const result = (data.choices?.[0]?.message?.content || '').trim().toLowerCase().replace(/[^a-z-]/g, '');
    if (['gemini', 'gpt', 'gpt-simple', 'claude'].includes(result)) return result;
    return 'gpt';
  } catch (e) { return 'gpt'; }
}
