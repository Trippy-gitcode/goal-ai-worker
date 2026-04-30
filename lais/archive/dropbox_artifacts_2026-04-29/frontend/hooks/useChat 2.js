// REWRITE-01: TALK画面チャットロジック hook
// 送受信・ストリーミング・ルーティング・post-processing を管理
import { useState, useRef, useCallback, useEffect } from 'preact/hooks';
import { routeMessage } from '../js/chatRouting.js';
import { renderMsgContent } from '../js/markdown.js';

// SYS_HOME prompt (extracted from chat.js)
const SYS_HOME = `あなたはGOAL AIのAIアシスタントです。

【最優先ルール】ユーザーの質問・依頼にまず答えること。質問を聞き返す前にまず回答する。
- 質問されたら答える。調べものには調べて答える。雑談には雑談で返す。
- 翻訳を頼まれたら翻訳する。おすすめを聞かれたらおすすめを教える。
- ChatGPT・Claude・Geminiと同等の応答品質を最低ラインとする。
- まず回答し、その上で必要なら追加質問してもよい。

【位置情報が必要な質問】
- 「近くの」「この辺の」等の質問には、まず一般的なおすすめを回答した上で「お住まいの地域やエリアを教えていただければ、もっと具体的におすすめできます！」と添える。
- エリアを教えてもらったら即座に具体的な回答をする。
- 聞き返しだけで回答しないのは禁止。必ずまず回答する。

【ゴール提案の条件】以下の全てを満たす場合のみ、自然にゴール化を提案してよい：
1. ユーザー自身が「〜したい」「〜になりたい」「〜を目指す」等の目標・夢・やりたいことを語っている
2. What（何を）とWhy（なぜ）の両方が会話の中で明確になっている
3. 提案は「一緒にゴールを設定して、タスクを作っていきますか？」のように軽く聞く形で

【禁止事項】
- ユーザーの質問を無視してゴール設定に誘導すること
- 「あなたの大切にしたいことから考えましょう」等の押し付けコーチング
- 回答の代わりに質問だけを返すこと
- 何でもかんでもゴールに結びつけようとすること

【応答スタイル】
- 2〜3文で簡潔に。長文禁止
- 質問は1回まで
- 同じ内容の繰り返し禁止
- まとめ後に「これで合ってますか？」確認（ゴール提案時のみ）

【チャットモード】
- 通常: 上記ルール通り
- メンケア: 寄り添い重視。解決策より共感
- スパルタ: 甘さゼロ。率直に指摘
- ソクラテス: 答え禁止。ソクラテス式問答で考えを引き出す

【パーソナライズ】
ユーザープロフィール（名前・職種・強み・弱み・価値観等）が設定されている場合は、
回答をその人に合わせて最適化する。

【秘書機能: タスク操作】
会話の中でタスクの追加・変更・削除・並替の意図を検出した場合:
- 変更内容を簡潔に提案する
- ユーザーが承認したら、回答の最後に以下のタグを付加:
  [TASK_UPDATE:add:タスク名] — 新タスク追加
  [TASK_UPDATE:done:タスク名] — タスク完了
  [TASK_UPDATE:move:タスク名:明日] — タスク移動
- タグはユーザーに見せない（フロント側で非表示処理される）
- 提案なしにタグだけ出力することは禁止`;

export { SYS_HOME };

function getToday() {
  return new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
}

/**
 * useChat — TALK画面のチャット状態管理フック
 * @param {object} opts
 * @param {React.RefObject} opts.streamContainerRef - ストリーミングバブルの親DOM ref
 * @param {React.RefObject} opts.scrollRef - スクロールコンテナ ref
 */
export function useChat({ streamContainerRef, scrollRef } = {}) {
  const [messages, setMessages] = useState([]);   // {role, content, time, date, img?, model?, streaming?}
  const [history, setHistory] = useState([]);      // API format: {role:'user'|'assistant', content}
  const [loading, setLoading] = useState(false);
  const [currentRoute, setCurrentRoute] = useState(null);
  const abortRef = useRef(null);
  const turnCountRef = useRef(0);
  const historyRef = useRef([]);  // mirror of history for sync access in callbacks

  // Keep historyRef in sync
  useEffect(() => { historyRef.current = history; }, [history]);

  // Save last 2 messages to Supabase
  const saveMessages = useCallback((msgs) => {
    if (!window.AUTH_TOKEN || msgs.length < 2) return;
    const last2 = msgs.slice(-2);
    const toSave = last2.filter(m => m.role === 'user' || m.role === 'ai').map(m => ({
      role: m.role === 'ai' ? 'assistant' : m.role,
      content: m.content,
      messageType: 'home_chat',
    }));
    if (toSave.length && typeof window.apiSaveMessages === 'function') {
      window.apiSaveMessages(toSave);
    }
    if (typeof window.updateTopicTags === 'function') window.updateTopicTags();
  }, []);

  // Post-process AI response
  const postProcess = useCallback((text, container) => {
    if (!text || !text.trim()) return;
    // D: Achievement detection → confetti
    if (typeof window.detectAchievement === 'function') window.detectAchievement(text);
    // Task suggestion button
    if (window._pendingTaskSuggestion) {
      window._pendingTaskSuggestion = false;
      if (typeof window.appendTaskSuggestionButton === 'function' && window._currentStreamBubble) {
        window.appendTaskSuggestionButton(window._currentStreamBubble);
      }
    }
    // TASK_UPDATE tags
    if (typeof window.processTaskUpdateTags === 'function') window.processTaskUpdateTags(text);
    // INTENT / GOAL_PROPOSAL tags
    if (typeof window.processIntentTags === 'function') {
      const cleaned = window.processIntentTags(text);
      if (cleaned !== text && window._currentStreamBubble) {
        window._currentStreamBubble.innerHTML = renderMsgContent(cleaned);
      }
    }
    // Refresh TODAY screen
    if (typeof window.renderTodayScreen === 'function') window.renderTodayScreen();
  }, []);

  // Handle non-streaming response (Gemini/GPT/GPT-simple)
  const handleNonStreamResponse = useCallback(async (route, text, today, inner, scroll) => {
    const ctx = typeof window.buildAIContextCached === 'function' ? window.buildAIContextCached() : '';
    const { mkStreamBubble } = await getMkStreamBubble();

    if (route === 'gemini') {
      const { bub } = mkStreamBubble(inner, scroll, undefined, 'gemini');
      try {
        const result = await window.callGemini(text, `【絶対ルール】ユーザーの質問にまず具体的に回答すること。聞き返し禁止。
- ニュースを聞かれたら→主要ニュースを3〜5件紹介する
- おすすめを聞かれたら→具体的な候補を3〜5件挙げる
- 天気を聞かれたら→天気情報を回答する
- 検索を頼まれたら→検索結果を要約して回答する
回答した後に「他に気になることはありますか？」と1回だけ聞いてよい。
「どんなジャンル？」「どの地域？」等の聞き返しは禁止。情報が足りなければ幅広く回答する。
日本語で回答。\n\nユーザー背景：${ctx}`);
        if (!result || !result.trim()) { bub.closest('.msg')?.remove(); return null; }
        bub.innerHTML = renderMsgContent(result);
        bub.classList.remove('stream-bubble'); bub.style.cssText = '';
        const footer = bub.parentElement?.querySelector('.msg-footer');
        if (footer) footer.innerHTML = `<span class="msg-time">${window.now()}</span>&nbsp;&nbsp;<span class="msg-model">Gemini</span>${window._msgActionsHtml()}`;
        return { content: result, model: 'Gemini' };
      } catch (e) {
        bub.closest('.msg')?.remove();
        return null; // fallback to Claude
      }
    }

    if (route === 'gpt') {
      const { bub } = mkStreamBubble(inner, scroll, undefined, 'gpt');
      try {
        const result = await window.callOpenAI(text, `【絶対ルール】ユーザーのリクエストにまず具体的に回答すること。聞き返し禁止。
- 翻訳を頼まれたら→即座に翻訳結果を返す
- アイデアを聞かれたら→具体的なアイデアを3〜5件挙げる
- 要約を頼まれたら→即座に要約する
回答した後に補足質問を1回だけしてよい。依頼されたことをそのまま実行する。日本語で回答。\n\nユーザー背景：${ctx}`, 800);
        if (!result || !result.trim()) { bub.closest('.msg')?.remove(); return null; }
        bub.innerHTML = renderMsgContent(result);
        bub.classList.remove('stream-bubble'); bub.style.cssText = '';
        const footer = bub.parentElement?.querySelector('.msg-footer');
        if (footer) footer.innerHTML = `<span class="msg-time">${window.now()}</span>&nbsp;&nbsp;<span class="msg-model">GPT</span>${window._msgActionsHtml()}`;
        return { content: result, model: 'GPT' };
      } catch (e) {
        bub.closest('.msg')?.remove();
        return null;
      }
    }

    if (route === 'gpt-simple') {
      const { bub } = mkStreamBubble(inner, scroll);
      try {
        const res = await fetch(`${window.WORKER_URL}/api/chat/gpt-simple`, {
          method: 'POST', headers: window.getAuthHeaders(),
          body: JSON.stringify({
            system: '日本語で端的に1文で返答してください。',
            messages: [{ role: 'user', content: text }],
            maxTokens: 100
          })
        });
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply && reply.trim()) {
          bub.innerHTML = renderMsgContent(reply);
          bub.classList.remove('stream-bubble');
          const footer = bub.parentElement?.querySelector('.msg-footer');
          if (footer) footer.innerHTML = `<span class="msg-time">${window.now()}</span>&nbsp;&nbsp;<span class="msg-model">GPT</span>${window._msgActionsHtml()}`;
          return { content: reply, model: 'GPT' };
        } else {
          bub.closest('.msg')?.remove();
          return null;
        }
      } catch (e) {
        bub.closest('.msg')?.remove();
        return null;
      }
    }

    return null; // fallback to Claude
  }, []);

  // Claude streaming response
  const streamClaude = useCallback(async (today, inner, scroll, signal) => {
    const sys = SYS_HOME + `\n\n${typeof window.buildAIContextCached === 'function' ? window.buildAIContextCached() : ''}`;
    return new Promise((resolve, reject) => {
      window.chatStream({
        system: sys,
        messages: historyRef.current.slice(-8),
        maxTokens: 350,
        innerEl: inner,
        scrollEl: scroll,
        signal,
        onDone(t) {
          if (!t || !t.trim()) { resolve(null); return; }
          const modelName = window._lastModelUsed
            ? (typeof window.formatModelName === 'function' ? window.formatModelName(window._lastModelUsed) : window._lastModelUsed)
            : 'Claude';
          postProcess(t, inner);
          resolve({ content: t, model: modelName });
        },
        onError(e) { reject(e); }
      });
    });
  }, [postProcess]);

  // Main send function
  const sendMessage = useCallback(async (text, imageData = null) => {
    if (loading) return;
    if (!text && !imageData) return;

    // Ensure auth
    if (!window.AUTH_TOKEN && typeof window.ensureAuth === 'function') {
      await window.ensureAuth();
    }

    setLoading(true);
    const abort = new AbortController();
    abortRef.current = abort;

    // Build user message
    let userContent;
    if (imageData) {
      userContent = [
        { type: 'image', source: { type: 'base64', media_type: imageData.type, data: imageData.base64 } },
        { type: 'text', text: text || 'この画像について話しましょう' }
      ];
    } else {
      userContent = text;
    }
    const displayText = text || (imageData ? `画像: ${imageData.name}` : '');
    const today = getToday();
    const time = typeof window.now === 'function' ? window.now() : new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

    const userMsg = {
      role: 'user', content: displayText, time, date: today,
      img: imageData?.base64 || null, imgType: imageData?.type
    };

    // Update state
    const newMsgs = [...messages, userMsg];
    const newHist = [...history, { role: 'user', content: userContent }];
    setMessages(newMsgs);
    setHistory(newHist);
    historyRef.current = newHist;

    turnCountRef.current++;
    window._homeMsgCount = (window._homeMsgCount || 0) + 1;
    if (typeof window.renderFreeUsageBar === 'function') window.renderFreeUsageBar();
    if (turnCountRef.current >= 2 && typeof window.showTaskChip === 'function') window.showTaskChip();
    if (typeof window.updateStreak === 'function') window.updateStreak();

    const inner = streamContainerRef?.current;
    const scroll = scrollRef?.current;

    // Deep analysis check
    if (text && !imageData && typeof window.isDeepAnalysisNeeded === 'function' && window.isDeepAnalysisNeeded(text) && window.AUTH_TOKEN) {
      // Deep analysis handled by existing UI flow
      if (typeof window.showDeepConfirm === 'function') {
        window.showDeepConfirm(inner, scroll,
          async () => {
            await window.runDeepAnalysis(text, inner, scroll, (results) => {
              if (results) {
                window.renderDeepResult(inner, scroll, results, text);
                const aiMsg = { role: 'ai', content: `【ディープ分析完了】${results.finalOutput.slice(0, 200)}…`, time: window.now(), date: today };
                setMessages(prev => [...prev, aiMsg]);
                setHistory(prev => [...prev, { role: 'assistant', content: results.finalOutput }]);
                saveMessages([...newMsgs, aiMsg]);
              }
              setLoading(false);
            });
          },
          async () => {
            await doSmartRoute(text, today, inner, scroll, abort.signal, newMsgs, newHist);
            setLoading(false);
          }
        );
        return;
      }
    }

    try {
      await doSmartRoute(text, today, inner, scroll, abort.signal, newMsgs, newHist);
    } catch (e) {
      if (!abort.signal.aborted) {
        const errMsg = { role: 'ai', content: '通信エラーが発生しました。もう一度お試しください。', time, date: today, error: true };
        setMessages(prev => [...prev, errMsg]);
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [messages, history, loading, streamContainerRef, scrollRef, saveMessages, postProcess, streamClaude, handleNonStreamResponse]);

  // Smart routing: decide AI and get response
  const doSmartRoute = useCallback(async (text, today, inner, scroll, signal, currentMsgs, currentHist) => {
    let route;
    if (currentRoute) {
      route = currentRoute;
    } else {
      // Show typing after 1s
      const routeTimer = setTimeout(() => {
        if (typeof window.showTyping === 'function') window.showTyping();
      }, 1000);
      // S4: Warm up connection in parallel
      const warmup = fetch(`${window.WORKER_URL}/api/chat/stream`, { method: 'OPTIONS' }).catch(() => {});
      const routeCallbacks = {
        onGoalDetect({ goalIntent, goalTopics, pendingGoalProposal }) {
          if (pendingGoalProposal && typeof window.showGoalDetectToast === 'function') {
            window.showGoalDetectToast(goalTopics);
          }
        },
        onTaskDetect() {
          if (typeof window.highlightTaskChip === 'function') window.highlightTaskChip();
        },
        onCoaching() { /* coaching mode flag if needed */ }
      };
      route = await routeMessage(text, routeCallbacks);
      clearTimeout(routeTimer);
      if (typeof window.hideTyping === 'function') window.hideTyping();
      warmup;
      const lockedRoute = (route === 'gpt-simple') ? 'claude' : route;
      setCurrentRoute(lockedRoute);
    }

    // Try non-streaming routes first
    if (route === 'gemini' || route === 'gpt' || route === 'gpt-simple') {
      const result = await handleNonStreamResponse(route, text, today, inner, scroll);
      if (result) {
        const aiMsg = { role: 'ai', content: result.content, time: window.now(), date: today, model: result.model };
        setMessages(prev => [...prev, aiMsg]);
        setHistory(prev => {
          const next = [...prev, { role: 'assistant', content: result.content }];
          historyRef.current = next;
          return next;
        });
        saveMessages([...currentMsgs, aiMsg]);
        return;
      }
      // Fallback to Claude on failure
      setCurrentRoute('claude');
    }

    // Claude streaming
    const result = await streamClaude(today, inner, scroll, signal);
    if (result) {
      const aiMsg = { role: 'ai', content: result.content, time: window.now(), date: today, model: result.model };
      setMessages(prev => [...prev, aiMsg]);
      setHistory(prev => {
        const next = [...prev, { role: 'assistant', content: result.content }];
        historyRef.current = next;
        return next;
      });
      saveMessages([...currentMsgs, aiMsg]);
    }

    // Alternative AI suggestion when confidence < 70
    if (window._lastRouteConfidence < 70 && currentRoute && typeof window.showAlternativeAISuggest === 'function') {
      const alt = currentRoute === 'claude' ? 'ChatGPT' : 'Claude';
      const altRoute = currentRoute === 'claude' ? 'gpt' : 'claude';
      window.showAlternativeAISuggest(inner, alt, altRoute, text, today, scroll);
    }
    window._lastRouteConfidence = 100;
  }, [currentRoute, handleNonStreamResponse, streamClaude, saveMessages]);

  // Stop streaming
  const stopStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setLoading(false);
  }, []);

  // New chat: reset state
  const newChat = useCallback(() => {
    setMessages([]);
    setHistory([]);
    historyRef.current = [];
    setCurrentRoute(null);
    turnCountRef.current = 0;
    setLoading(false);
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
  }, []);

  return { messages, setMessages, loading, currentRoute, sendMessage, stopStream, newChat };
}

// Helper to get mkStreamBubble from api.js (already on window)
async function getMkStreamBubble() {
  return { mkStreamBubble: window.mkStreamBubble };
}
