// REWRITE-01: AI routing logic (extracted from chat.js)
// Determines which AI model handles a message: claude/gpt/gemini/gpt-simple

// Uses window.WORKER_URL, window.getAuthHeaders from globals.js

// ════════ ROUTE PROMPT ════════
export const ROUTE_PROMPT = `ユーザーのメッセージを分類せよ。JSON形式で返せ。
{"route":"gemini|gpt|gpt-simple|claude","coaching":true|false}

route:
gemini: 天気、ニュース、検索、最新情報、長文の要約依頼（500文字超）
gpt: 翻訳、SNS投稿案、キャッチコピー、短い要約（500文字以下）、アイデア出し、ブレスト
gpt-simple: 相槌や短い返事（ありがとう、OK、うん、了解、いいね等）
claude: 上記以外（感情、悩み、ゴール、戦略、コーチング、雑談で深い対話が必要なもの）

coaching: ユーザーが目標・悩み・将来・キャリア・成長・自己改善について語っている場合はtrue

追加のルーティング判定項目:
- goal_intent: ユーザーの発言からゴール化の意図レベルを判定
  - "none": 雑談・質問・調べもの（例：「天気教えて」「翻訳して」）
  - "level1": 漠然とした願望（例：「英語できるようになりたいな」）
  - "level2": 具体的意図あり（例：「来年までにTOEIC800取りたい」）
  - "level3": 明示的要求（例：「ゴール設定したい」「目標作りたい」）

- task_potential: ユーザーの発言にタスク化できる行動・予定・やるべきことが含まれる場合はtrue

- goal_topics: goal_intentがlevel2以上の場合、検出したゴール候補を配列で返す（例: ["TOEIC800点","英会話力向上"]）。1つだけの場合も配列。

- confidence: ルーティングの確信度(0-100)。迷いがある場合は低く

JSONで返してください: { "route": "...", "coaching": true|false, "goal_intent": "none|level1|level2|level3", "task_potential": true|false, "goal_topics": [], "confidence": 80 }`;

// ════════ PRE-ROUTE CACHE ════════
let _preRouteTimer = null;
let _preRouteAbort = null;
let _preRoutedResult = null;
let _preRouteExpiry = 0;

// C: Time-based routing hint
export function getTimeHint() {
  const h = new Date().getHours();
  if (h >= 6 && h < 10) return '（朝の時間帯: タスク・計画系はgpt優先）';
  if (h >= 21 || h < 2) return '（夜の時間帯: 感情・振り返り系はclaude優先）';
  return '';
}

// S5: Routing cache (sessionStorage, last 20 entries)
export function getRoutingCache(text) {
  try {
    const cache = JSON.parse(sessionStorage.getItem('route_cache') || '{}');
    return cache[text] || null;
  } catch (e) { return null; }
}

export function setRoutingCache(text, route) {
  try {
    const cache = JSON.parse(sessionStorage.getItem('route_cache') || '{}');
    cache[text] = route;
    const keys = Object.keys(cache);
    if (keys.length > 20) delete cache[keys[0]];
    sessionStorage.setItem('route_cache', JSON.stringify(cache));
  } catch (e) {}
}

/**
 * Determine which AI model to route a message to.
 * @param {string} text - User message text
 * @param {object} callbacks - Side-effect callbacks for goal/task detection
 * @param {function} callbacks.onGoalDetect - Called with {goalIntent, goalTopics, pendingGoalProposal}
 * @param {function} callbacks.onTaskDetect - Called when task_potential is true
 * @param {function} callbacks.onCoaching - Called when coaching mode detected
 * @returns {Promise<string>} Route: 'gemini'|'gpt'|'gpt-simple'|'claude'
 */
export async function routeMessage(text, callbacks = {}) {
  // 500文字超の要約依頼はgemini
  if (text.length > 500) return 'gemini';
  const msg = text.trim().toLowerCase();
  // G3: フロント側quickRoute
  if (msg.length < 15 && /^(うん|はい|ok|おk|そう|ありがと|了解|わかった|なるほど|いいね|おー|へー|ほー|そうだね|たしかに)/.test(msg)) return 'gpt-simple';
  if (/^(天気|今日の天気|明日の天気|ニュース|最新の|検索して|調べて)/.test(msg)) return 'gemini';
  if (/天気.*(教えて|おしえて|知りたい)|ニュース.*(教えて|おしえて|知りたい)/.test(msg)) return 'gemini';
  if (/ダイヤ|時刻表|路線|行き方|乗り換え|運賃|料金|営業時間|場所|住所|電話番号|地図|アクセス|最寄り/.test(msg)) return 'gemini';
  if (/^(翻訳して|英語に|日本語に|要約して|まとめて|SNS.*書いて|キャッチコピー|タイトル案)/.test(msg)) return 'gpt';
  if (/^(アイディア|おすすめ|提案して|考えて|リスト|比較して|教えて|作って|書いて)/.test(msg)) return 'gpt';
  if (/^(今日やること|タスク|やること.*整理|TODO|to.?do|スケジュール|予定.*整理|段取り)/.test(msg)) return 'gpt';
  // S1: Check pre-routed cache
  if (_preRoutedResult && Date.now() < _preRouteExpiry) {
    const cached = _preRoutedResult;
    _preRoutedResult = null;
    return cached;
  }
  // GPT-simpleでルーティング判定
  try {
    const timeHint = getTimeHint();
    const res = await fetch(`${window.WORKER_URL}/api/chat/gpt-simple`, {
      method: 'POST', headers: window.getAuthHeaders(),
      body: JSON.stringify({
        system: ROUTE_PROMPT + (timeHint ? '\n\nヒント: ' + timeHint : ''),
        messages: [{ role: 'user', content: text }],
        maxTokens: 300
      }),
      signal: _preRouteAbort?.signal
    });
    if (!res.ok) return 'claude';
    const data = await res.json();
    const answer = (data.choices?.[0]?.message?.content || '').trim();
    try {
      const parsed = JSON.parse(answer);
      const route = parsed.route || 'claude';
      if (parsed.coaching && callbacks.onCoaching) callbacks.onCoaching();
      if (parsed.goal_intent) {
        window._lastGoalIntent = parsed.goal_intent;
        if (callbacks.onGoalDetect) {
          callbacks.onGoalDetect({
            goalIntent: parsed.goal_intent,
            goalTopics: parsed.goal_topics || [],
            pendingGoalProposal: parsed.goal_intent === 'level3' || (parsed.goal_intent === 'level2' && parsed.goal_topics?.length > 0)
          });
        }
      }
      if (parsed.task_potential) {
        window._pendingTaskSuggestion = true;
        if (callbacks.onTaskDetect) callbacks.onTaskDetect();
      }
      window._lastRouteConfidence = parsed.confidence ?? 100;
      if (['gemini', 'gpt', 'gpt-simple', 'claude'].includes(route)) return route;
    } catch (e) {
      const clean = answer.toLowerCase().replace(/[^a-z-]/g, '');
      if (['gemini', 'gpt', 'gpt-simple', 'claude'].includes(clean)) return clean;
    }
  } catch (e) {}
  return 'claude';
}

// F: AI name preview in toolbar
export function showRoutePreview(route) {
  const name = route === 'gemini' ? 'Gemini' : route === 'gpt' || route === 'gpt-simple' ? 'ChatGPT' : 'Claude';
  let el = document.getElementById('route-preview-badge');
  if (!el) {
    el = document.createElement('span');
    el.id = 'route-preview-badge';
    el.style.cssText = 'font-size:12px;color:var(--muted);font-family:var(--fm);opacity:0;transition:opacity .3s;margin-left:4px;';
    const toolbar = document.getElementById('home-chat-toolbar');
    const spacer = toolbar?.querySelector('[style*="flex:1"]');
    if (spacer) spacer.after(el); else return;
  }
  el.textContent = name;
  requestAnimationFrame(() => el.style.opacity = '0.7');
}

export function hideRoutePreview() {
  const el = document.getElementById('route-preview-badge');
  if (el) el.style.opacity = '0';
}

/**
 * Pre-route on input change (debounced 800ms)
 * @param {string} text - Current input text
 */
export function preRouteOnInput(text) {
  if (!text || text.length < 5) { _preRoutedResult = null; hideRoutePreview(); return; }
  if (_preRouteAbort) { _preRouteAbort.abort(); _preRouteAbort = null; }
  clearTimeout(_preRouteTimer);
  _preRouteTimer = setTimeout(async () => {
    const cached = getRoutingCache(text);
    if (cached) { _preRoutedResult = cached; _preRouteExpiry = Date.now() + 3000; showRoutePreview(cached); return; }
    _preRouteAbort = new AbortController();
    try {
      const route = await routeMessage(text);
      _preRoutedResult = route;
      _preRouteExpiry = Date.now() + 3000;
      setRoutingCache(text, route);
      showRoutePreview(route);
    } catch (e) { _preRoutedResult = null; }
    _preRouteAbort = null;
  }, 800);
}

// Backward compat
window.ROUTE_PROMPT = ROUTE_PROMPT;
window.routeMessage = routeMessage;
window.preRouteOnInput = preRouteOnInput;
window.showRoutePreview = showRoutePreview;
window.hideRoutePreview = hideRoutePreview;
