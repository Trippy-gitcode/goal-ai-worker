// ════════ SUPABASE API HELPERS ════════
async function apiLoadGoals() {
  if (!AUTH_TOKEN) return [];
  try {
    const res = await fetch(`${WORKER_URL}/api/goals`, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.goals || []).map(g => ({
      id: g.id,
      supabaseId: g.id,
      title: g.title,
      color: g.color || 'var(--amber)',
      actual: g.progress || 0,
      target: g.target_progress || 50,
      deadline: g.target_date || '2026-12-31',
      status: g.status || 'active',
      description: g.description || '',
      archived: g.status === 'archived',
      archiveReason: g.archive_reason || null,
      archivedAt: g.archived_at || null,
      phases: []
    }));
  } catch (e) { console.error('apiLoadGoals error:', e); return []; }
}

async function apiCreateGoal(title, description, targetDate) {
  if (!AUTH_TOKEN) return null;
  try {
    const res = await fetch(`${WORKER_URL}/api/goals`, {
      method: 'POST', headers: getAuthHeaders(),
      body: JSON.stringify({ title, description: description || null, targetDate: targetDate || null }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.goal;
  } catch (e) { console.error('apiCreateGoal error:', e); return null; }
}

async function apiUpdateGoal(goalId, updates) {
  if (!AUTH_TOKEN || !goalId) return null;
  try {
    const res = await fetch(`${WORKER_URL}/api/goals/${goalId}`, {
      method: 'PATCH', headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.goal;
  } catch (e) { console.error('apiUpdateGoal error:', e); return null; }
}

async function apiDeleteGoal(goalId) {
  if (!AUTH_TOKEN || !goalId) return false;
  try {
    const res = await fetch(`${WORKER_URL}/api/goals/${goalId}`, {
      method: 'DELETE', headers: getAuthHeaders(),
    });
    return res.ok;
  } catch (e) { console.error('apiDeleteGoal error:', e); return false; }
}

async function apiLoadHistory(goalId, limit) {
  if (!AUTH_TOKEN) return [];
  try {
    let url = `${WORKER_URL}/api/history?limit=${limit || 50}`;
    if (goalId) url += `&goalId=${goalId}`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return data.messages || [];
  } catch (e) { console.error('apiLoadHistory error:', e); return []; }
}

async function apiSaveMessages(messages) {
  if (!AUTH_TOKEN || !messages.length) return;
  try {
    await fetch(`${WORKER_URL}/api/history`, {
      method: 'POST', headers: getAuthHeaders(),
      body: JSON.stringify({ messages, sessionId: currentSessionId }),
    });
  } catch (e) { console.error('apiSaveMessages error:', e); }
}

async function redeemPromoCode(code) {
  const res = await fetch(`${WORKER_URL}/api/token/redeem`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ promoCode: code, deviceId: getDeviceId() }),
  });
  const data = await res.json();
  if (res.status === 409 && data.existingToken) {
    // Already redeemed — reuse existing token
    AUTH_TOKEN = data.existingToken;
    setCookie('goal_auth_token', data.existingToken, 90);
    return { token: data.existingToken, plan: 'pro', desc: 'トークンを復元しました' };
  }
  if (!res.ok) throw new Error(data.error || 'エラー');
  AUTH_TOKEN = data.token;
  setCookie('goal_auth_token', data.token, 90);
  return data;
}

async function validateToken() {
  if (!AUTH_TOKEN) return null;
  try {
    const res = await fetch(`${WORKER_URL}/api/token/validate`, {
      method: 'POST', headers: getAuthHeaders(),
      body: JSON.stringify({ token: AUTH_TOKEN }),
    });
    if (!res.ok) return null; // Network/server error — keep token, don't delete
    const data = await res.json();
    if (!data.valid) {
      // Only delete if explicitly expired or revoked
      if (data.error === 'Token expired' || data.error === 'Token revoked') {
        AUTH_TOKEN = null; deleteCookie('goal_auth_token');
      }
      return null;
    }
    // Sync membership state from server
    if (data.plan) {
      MEMBERSHIP.plan = data.plan;
      MEMBERSHIP.trialEnd = data.expiresAt || null;
    }
    // Sync tester info
    if (data.tester_tier) {
      MEMBERSHIP.tester_tier = data.tester_tier;
      MEMBERSHIP.tester_expires_at = data.tester_expires_at;
    } else {
      MEMBERSHIP.tester_tier = null;
      MEMBERSHIP.tester_expires_at = null;
    }
    return data;
  } catch {
    // Network error — keep token, don't delete
    return null;
  }
}

async function fetchUsage() {
  try {
    const res = await fetch(`${WORKER_URL}/api/usage`, { headers: getAuthHeaders() });
    return await res.json();
  } catch { return null; }
}


// ════════ TOAST ════════
function escapeHtml(s){if(!s)return '';return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function toast(msg){
  const existing=document.getElementById('toast');if(existing)existing.remove();
  const t=document.createElement('div');t.id='toast';
  t.setAttribute('role','status');t.setAttribute('aria-live','polite');
  t.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--toast-bg,#1e2333);border:1px solid var(--border2,rgba(255,255,255,.15));color:var(--toast-text,var(--cream));padding:9px 18px;border-radius:8px;font-size:12px;z-index:9999;animation:fadeUp .3s ease;white-space:nowrap;box-shadow:0 8px 32px rgba(0,0,0,.5)';
  t.textContent=msg;document.body.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transition='opacity .3s';setTimeout(()=>t.remove(),300);},3000);
}


// ════════ SHARED CHAT ENGINE ════════
const CHAT_CONFIG = {
  maxResizeHeight: { home: 110, hub: 110, task: 80, cal: 80, worries: 80, htp: 80 },
};

function chatResize(el, maxH) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, maxH || 110) + 'px';
}

function chatKey(sendFn, e) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !_isComposing) {
    e.preventDefault();
    sendFn();
  }
}

function showChatTyping(chatEl, typingId, avatarHtml, bubbleClass) {
  const d = document.createElement('div');
  d.id = typingId;
  d.className = bubbleClass || 'msg ai';
  d.style.marginBottom = '16px';
  d.innerHTML = `<div class="${bubbleClass === 'tdp-msg ai' ? 'tdp-av ai' : 'msg-av ai'}">${avatarHtml || getLogoSVG(14)}</div><div class="${bubbleClass === 'tdp-msg ai' ? 'tdp-bubble' : 'msg-body'}" style="${bubbleClass === 'tdp-msg ai' ? '' : ''}"><div class="${bubbleClass === 'tdp-msg ai' ? '' : 'bubble'}" style="padding:0;"><div class="typing-dots"><span></span><span></span><span></span></div></div></div>`;
  chatEl.appendChild(d);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function hideChatTyping(typingId) {
  const e = document.getElementById(typingId);
  if (e) e.remove();
}

// ════════ SHARED API CALL ════════
async function apiCall(endpoint, method, body) {
  const opts = { method, headers: getAuthHeaders() };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(`${WORKER_URL}${endpoint}`, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'サーバーエラー' }));
      if (res.status === 401) { toast('認証エラー。ページを再読み込みしてください'); }
      else if (res.status === 429) { toast('利用制限に達しました。しばらくお待ちください'); }
      else { toast(err.error || 'エラーが発生しました'); }
      return null;
    }
    return await res.json();
  } catch (e) {
    if (!navigator.onLine) toast('ネットワークに接続されていません');
    else toast('通信エラーが発生しました');
    return null;
  }
}

// ════════ UNIFIED CHAT STREAM ════════
async function chatStream({ system, messages, maxTokens, innerEl, scrollEl, onDone, onError, signal, modelLabel }) {
  const inner = typeof innerEl === 'string' ? document.getElementById(innerEl) : innerEl;
  const scroll = typeof scrollEl === 'string' ? document.getElementById(scrollEl) : scrollEl;
  const { bub, wrap } = mkStreamBubble(inner, scroll);
  await streamAI(
    { system, messages, maxTokens: maxTokens || 500, signal },
    (t) => { streamAppend(bub, t); if (scroll) scroll.scrollTop = 99999; },
    (t) => { streamFinalize(bub, t, modelLabel || 'Claude'); if (onDone) onDone(t); },
    (e) => {
      if (signal?.aborted) { wrap.remove(); return; }
      bub.classList.remove('stream-bubble'); bub.textContent = 'エラーが発生しました。'; if (onError) onError(e);
    }
  );
}

// ════════ AI SELECTION POPUP ════════
function checkAndShowSelections(bubEl, text){
  // Detect numbered list (1. xxx 2. xxx 3. xxx) with 3-6 items
  const matches = text.match(/^(\d+)\.\s+(.+)$/gm);
  if(!matches || matches.length < 3 || matches.length > 6) return;
  const items = matches.map(m => {
    const mm = m.match(/^(\d+)\.\s+(.+)$/);
    return mm ? {num:mm[1], text:mm[2].trim()} : null;
  }).filter(Boolean);
  if(items.length < 3) return;

  // Create popup
  const popup = document.createElement('div');
  popup.className = 'ai-selection-popup';
  popup.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);width:90%;max-width:400px;background:var(--bg2);border:1px solid var(--border2);border-radius:16px;padding:16px;z-index:800;box-shadow:0 -4px 24px rgba(0,0,0,.5);animation:fadeUp .3s ease;';
  popup.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <div style="font-size:12px;color:var(--amber);font-weight:500;">選択してください</div>
      <button onclick="this.closest('.ai-selection-popup').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px;padding:2px 6px;">✕</button>
    </div>
    ${items.map(i => `<div onclick="selectAIOption('${escapeHtml(i.text).replace(/'/g,"\\'")}');this.closest('.ai-selection-popup').remove();" style="padding:10px 12px;margin-bottom:6px;background:var(--bg3);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:13px;color:var(--cream);transition:border-color .15s;" onmouseover="this.style.borderColor='var(--amber)'" onmouseout="this.style.borderColor='var(--border)'">${i.num}. ${escapeHtml(i.text)}</div>`).join('')}
  `;
  // Remove existing popup
  document.querySelector('.ai-selection-popup')?.remove();
  document.body.appendChild(popup);
  // Auto-remove after 30s
  setTimeout(() => popup.remove(), 30000);
}

function selectAIOption(text){
  const inp = document.getElementById('home-msg-in') || document.getElementById('hub-msg-in');
  if(inp){
    inp.value = text;
    // Trigger send
    if(document.getElementById('home-msg-in') === inp) sendHomeMsg();
    else sendHubMsg();
  }
}

// ════════ UNIFIED CHAT SEND ════════
async function sendChatMsg({
  inputId, innerElId, scrollElId, loadingRef, msgsRef, historyRef,
  systemPrompt, maxTokens, goalId, messageType, resizeFn,
  enableDeepAnalysis, enableRouting, onBeforeSend, onAfterAI, renderFn,
  bubbleStyle // 'standard' | 'tdp' | 'worries'
}){
  if(loadingRef.v) return;
  if(!navigator.onLine){ toast('ネットワークに接続されていません'); return; }

  const inp = document.getElementById(inputId);
  const text = inp.value.trim();
  if(!text && !(inputId === 'home-msg-in' && homeImageData)) return;
  inp.value = '';
  if(resizeFn) resizeFn(inp);

  // Pre-send hook (image handling etc)
  const userContent = onBeforeSend ? onBeforeSend(text) : text;
  const displayText = typeof userContent === 'string' ? userContent : text;

  // Push user message
  const today = new Date().toLocaleDateString('ja-JP',{month:'long',day:'numeric',weekday:'short'});
  if(msgsRef){
    msgsRef.v.push({role:'user', content:displayText, time:now(), date:today});
  }
  if(historyRef){
    historyRef.v.push({role:'user', content:userContent});
  }
  if(renderFn) renderFn();
  loadingRef.v = true;

  // Save user message to Supabase
  if(AUTH_TOKEN && messageType){
    apiSaveMessages([{role:'user', content:displayText, goalId:goalId||null, messageType}]);
  }

  const inner = document.getElementById(innerElId);
  const scroll = document.getElementById(scrollElId);
  const sys = typeof systemPrompt === 'function' ? systemPrompt() : systemPrompt;

  // Deep analysis check
  if(enableDeepAnalysis && text && isDeepAnalysisNeeded(text) && AUTH_TOKEN){
    showDeepConfirm(innerElId, scrollElId,
      async () => {
        await runDeepAnalysis(text, innerElId, scrollElId, (results) => {
          if(results){
            renderDeepResult(innerElId, scrollElId, results, text);
            if(msgsRef) msgsRef.v.push({role:'ai', content:results.finalOutput.slice(0,300)+'…', time:now(), date:today});
            if(historyRef) historyRef.v.push({role:'assistant', content:results.finalOutput});
            if(AUTH_TOKEN && messageType) apiSaveMessages([{role:'assistant', content:results.finalOutput, goalId:goalId||null, aiModel:'deep', messageType}]);
          }
          loadingRef.v = false;
        });
      },
      async () => {
        await _doChatStream(sys, historyRef, msgsRef, inner, scroll, today, goalId, messageType, loadingRef, onAfterAI, renderFn, enableRouting);
      }
    );
    return;
  }

  await _doChatStream(sys, historyRef, msgsRef, inner, scroll, today, goalId, messageType, loadingRef, onAfterAI, renderFn, enableRouting);
}

async function _doChatStream(sys, historyRef, msgsRef, inner, scroll, today, goalId, messageType, loadingRef, onAfterAI, renderFn, enableRouting){
  try{
    await chatStream({
      system: sys,
      messages: historyRef ? historyRef.v.slice(-8) : [],
      maxTokens: 500,
      innerEl: inner, scrollEl: scroll,
      onDone(t){
        if(msgsRef) msgsRef.v.push({role:'ai', content:t, time:now(), date:today});
        if(historyRef) historyRef.v.push({role:'assistant', content:t});
        if(renderFn) renderFn();
        if(AUTH_TOKEN && messageType) apiSaveMessages([{role:'assistant', content:t, goalId:goalId||null, aiModel:'claude', messageType}]);
        if(onAfterAI) onAfterAI(t);
        loadingRef.v = false;
      },
      onError(e){ loadingRef.v = false; }
    });
  }catch(e){
    loadingRef.v = false;
  }
}


// ════════ UTILS ════════
function now(){return new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});}
function scrollDown(){
  const w=document.getElementById('home-chat-wrap');if(!w)return;
  // ユーザーが上にスクロール中は自動スクロールしない
  const gap=w.scrollHeight-w.scrollTop-w.clientHeight;
  if(gap<200) setTimeout(()=>w.scrollTop=w.scrollHeight,50);
}
function scrollToLatest(){const w=document.getElementById('home-chat-wrap');if(w)w.scrollTo({top:w.scrollHeight,behavior:'smooth'});}
(function(){
  let _scrollTick=false;
  function checkScrollBtn(){
    const w=document.getElementById('home-chat-wrap');
    const btn=document.getElementById('scroll-latest-btn');
    if(!w||!btn)return;
    // メッセージが0件なら非表示
    const msgs=document.querySelectorAll('#home-chat-inner .msg');
    if(!msgs||msgs.length===0){btn.style.display='none';return;}
    const gap=w.scrollHeight-w.scrollTop-w.clientHeight;
    if(gap>200){
      btn.style.display='flex';
      requestAnimationFrame(()=>{btn.style.opacity='1';btn.style.transform='translateY(0)';});
    } else {
      btn.style.opacity='0';btn.style.transform='translateY(8px)';
      setTimeout(()=>{if(parseFloat(btn.style.opacity)===0)btn.style.display='none';},250);
    }
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const w=document.getElementById('home-chat-wrap');
    if(w) w.addEventListener('scroll',()=>{if(!_scrollTick){_scrollTick=true;requestAnimationFrame(()=>{checkScrollBtn();_scrollTick=false;});}});
  });
})();
function autoResize(el) { chatResize(el, 110); }
function handleKey(e) { chatKey(sendHomeMsg, e); }


// ════════ STREAMING AI HELPER ════════
async function streamAI({ system, messages, maxTokens = 600, signal }, onChunk, onDone, onError) {
  try {
    const fetchOpts = {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ system, messages, maxTokens })
    };
    if (signal) fetchOpts.signal = signal;
    const res = await fetch(`${WORKER_URL}/api/chat/stream`, fetchOpts);
    if (!res.ok || !res.body) throw new Error('HTTP ' + res.status);
    const isFallback = res.headers.get('X-Model-Fallback') === 'true';
    const resetHours = res.headers.get('X-Reset-Hours');
    if (isFallback) showNanoFallbackBanner(resetHours);
    // モデル名をヘッダーから取得（フッター表示用）
    window._lastModelUsed = res.headers.get('X-Model-Used') || null;
    const reader = res.body.getReader();
    const dec = new TextDecoder('utf-8');
    let full = '';
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += dec.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6);
        if (raw === '[DONE]') continue;
        try {
          const d = JSON.parse(raw);
          let textChunk = null;
          // Anthropic標準: content_block_delta + delta.text
          if (d.type === 'content_block_delta' && d.delta?.text) {
            textChunk = d.delta.text;
          }
          // Anthropic text_delta形式
          else if (d.type === 'content_block_delta' && d.delta?.type === 'text_delta') {
            textChunk = d.delta.text;
          }
          // Worker独自フォーマット（フォールバック）
          else if (d.text && typeof d.text === 'string') {
            textChunk = d.text;
          }
          // メモ更新通知 (Step 12)
          if (d.type === 'meta' && d.memo_updated && !memoToastShown) {
            toast('AIの理解が更新されました');
            memoToastShown = true;
          }
          if (textChunk) {
            full += textChunk;
            onChunk(full);
          }
        } catch {}
      }
    }
    onDone(full);
  } catch (e) { onError(e); }
}

// Shared helper: create streaming AI bubble with typing dots
function mkStreamBubble(innerEl, scrollEl, extraBubStyle) {
  const wrap = document.createElement('div');
  wrap.className = 'msg ai';
  wrap.style.marginBottom = '16px';
  const av = document.createElement('div');
  av.className = 'msg-av ai'; av.innerHTML = getLogoSVG(14);
  const body = document.createElement('div');
  body.className = 'msg-body';
  const bub = document.createElement('div');
  bub.className = 'bubble stream-bubble';
  if (extraBubStyle) bub.style.cssText = extraBubStyle;
  // 「考え中...」ドットアニメーション
  bub.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
  const t = document.createElement('div');
  t.className = 'msg-footer'; t.textContent = now();
  body.appendChild(bub); body.appendChild(t);
  wrap.appendChild(av); wrap.appendChild(body);
  innerEl.appendChild(wrap);
  if (scrollEl) scrollEl.scrollTop = 99999;
  // テキストノード追記用
  bub._textNode = null;
  bub._dotsRemoved = false;
  return { wrap, bub, t };
}

// ストリーミング中のテキストアニメーション（30ms/文字の一定速度）
function streamAppend(bub, fullText){
  if(!bub._dotsRemoved){
    bub.innerHTML = '';
    bub._textNode = document.createTextNode('');
    bub.appendChild(bub._textNode);
    bub._dotsRemoved = true;
    // Scroll to bubble top once
    if(bub.parentElement) bub.parentElement.scrollIntoView({block:'start',behavior:'smooth'});
    bub._displayedLen = 0;
    bub._targetText = '';
    bub._animTimer = null;
  }
  bub._targetText = fullText;
  if(!bub._animTimer){
    bub._animTimer = setInterval(()=>{
      if(bub._displayedLen < bub._targetText.length){
        bub._displayedLen++;
        bub._textNode.textContent = bub._targetText.slice(0, bub._displayedLen);
      } else if(bub._streamDone){
        clearInterval(bub._animTimer);
        bub._animTimer = null;
      }
    }, 15);
  }
}

function formatModelName(model) {
  if (!model) return 'Claude';
  if (model.includes('gemini')) return 'Gemini';
  if (model.includes('gpt-5-nano')) return 'GPT nano';
  if (model.includes('gpt-5-mini')) return 'GPT';
  if (model.includes('gpt-5')) return 'GPT';
  if (model.includes('gpt')) return 'GPT';
  if (model.includes('opus')) return 'Claude Opus';
  if (model.includes('sonnet')) return 'Claude Sonnet';
  if (model.includes('claude')) return 'Claude';
  return model;
}

// ストリーミング完了時 — バッファ残りを一括表示してMarkdown変換
function streamFinalize(bub, fullText, modelLabel){
  // X-Model-Usedヘッダーからモデル名を取得（ルーティングで動的に変わる）
  const actualModel = window._lastModelUsed || modelLabel;
  const displayName = formatModelName(actualModel);
  modelLabel = displayName;
  bub._streamDone = true;
  if(bub._animTimer){ clearInterval(bub._animTimer); bub._animTimer = null; }
  // 【1】空テキストならバブルごと削除
  if(!fullText || fullText.trim() === ''){ bub.closest('.msg')?.remove(); return; }
  bub.innerHTML = renderMsgContent(fullText);
  // Check for numbered selection list
  checkAndShowSelections(bub, fullText);
  bub.classList.remove('stream-bubble');
  // Update msg-footer with model name
  const footer = bub.parentElement?.querySelector('.msg-footer');
  if(footer){ footer.innerHTML = `<span class="msg-time">${now()}</span> · <span class="msg-model">${modelLabel || 'Claude'}</span><span class="msg-actions"><button class="msg-action-btn" title="コピー" onclick="copyMessage(this)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button><button class="msg-action-btn" title="引用" onclick="quoteMessage(this)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.76-2.02-2-2H5c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h2c0 4-3 5-6 5z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.76-2.02-2-2h-3c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h2c0 4-3 5-6 5z"/></svg></button></span>`; }
}


// ════════ AI CONTEXT CACHE ════════
let _ctxCache = null, _ctxHash = '';
function buildAIContextCached() {
  const h = USER_PROFILE.nickname + USER_PROFILE.name +
    ALL_GOALS.map(g => g.title + g.actual + g.archived).join('|');
  if (_ctxCache && h === _ctxHash) return _ctxCache;
  _ctxHash = h; _ctxCache = buildAIContext(); return _ctxCache;
}
function invalidateCtxCache() { _ctxCache = null; renderAIUnderstanding(); }

// ════════ IMAGE COMPRESSION ════════
function compressImage(file, maxPx, quality) {
  maxPx = maxPx || 1200; quality = quality || 0.82;
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        resolve({ base64: canvas.toDataURL(type, quality).split(',')[1], type, name: file.name });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ═══ 共通チャットエンジン ═══

/**
 * 共通デバイス情報取得（フィードバック送信時に自動付与）
 */
function getDeviceInfo() {
  const ua = navigator.userAgent;
  let device = 'pc', platform = 'unknown';
  if (/iPad|Macintosh.*Touch/i.test(ua) && 'ontouchend' in document) { device = 'tablet'; platform = 'iPad'; }
  else if (/Android/i.test(ua) && !/Mobile/i.test(ua)) { device = 'tablet'; platform = 'Android'; }
  else if (/iPhone/i.test(ua)) { device = 'smartphone'; platform = 'iPhone'; }
  else if (/Android.*Mobile/i.test(ua)) { device = 'smartphone'; platform = 'Android'; }
  else if (/Macintosh/i.test(ua)) { device = 'pc'; platform = 'Mac'; }
  else if (/Windows/i.test(ua)) { device = 'pc'; platform = 'Windows'; }
  return { device, platform, screen_width: window.innerWidth, ua_short: ua.slice(0, 120) };
}

/**
 * 共通チャットメッセージ表示
 */
function appendChatMsg(container, role, text, opts = {}) {
  if (!text || !text.trim()) return null;
  const wrap = document.createElement('div');
  wrap.className = `msg ${role === 'user' ? 'user' : 'ai'}`;
  wrap.style.position = 'relative';
  const av = document.createElement('div');
  av.className = `msg-av ${role === 'user' ? 'user' : 'ai'}`;
  if (role === 'ai') { av.innerHTML = opts.avatar || getLogoSVG(14); }
  else { const ut = getUserAvatarText(); if (ut) av.textContent = ut; else av.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z"/></svg>'; }
  const body = document.createElement('div');
  body.className = 'msg-body';
  const bub = document.createElement('div');
  bub.className = 'bubble';
  bub.innerHTML = renderMsgContent(text);
  const footer = document.createElement('div');
  footer.className = 'msg-footer';
  if (role === 'ai' && opts.model) { footer.innerHTML = `<span class="msg-time">${now()}</span> · <span class="msg-model">${opts.model}</span>`; }
  else { footer.innerHTML = `<span class="msg-time">${now()}</span>`; }
  body.appendChild(bub); body.appendChild(footer);
  wrap.appendChild(av); wrap.appendChild(body);
  container.appendChild(wrap);
  if (opts.scrollEl) opts.scrollEl.scrollTop = opts.scrollEl.scrollHeight;
  return { wrap, bub };
}

/**
 * 共通AI送信（非ストリーミング）
 */
async function sendChatAPI(params) {
  const endpoint = params.endpoint || '/api/chat';
  const res = await apiCall(endpoint, 'POST', {
    system: params.system,
    messages: params.messages,
    maxTokens: params.maxTokens || 600
  });
  if (!res || res.error) throw new Error(res?.error || 'API error');
  if (res.content) return res.content.map(b => b.text || '').join('');
  if (res.choices) return res.choices[0]?.message?.content || '';
  return '';
}

/**
 * 共通AI送信（ストリーミング）
 */
async function sendChatStream(container, scrollEl, params, onDone) {
  const { bub } = mkStreamBubble(container, scrollEl);
  await streamAI(
    { system: params.system, messages: params.messages, maxTokens: params.maxTokens || 600 },
    (chunk) => { streamAppend(bub, chunk); if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight; },
    (fullText) => { streamFinalize(bub, fullText, params.model || 'Claude'); if (onDone) onDone(fullText); },
    (err) => { bub.closest('.msg')?.remove(); toast('エラーが発生しました'); }
  );
}

/**
 * 共通チャット入力セットアップ
 */
function setupChatInput(config) {
  const { inputEl, sendBtn, voiceBtn, onSend, maxH } = config;
  if (inputEl) {
    inputEl.addEventListener('input', () => chatResize(inputEl, maxH || 150));
    inputEl.addEventListener('keydown', (e) => chatKey(() => {
      const text = inputEl.value.trim();
      if (text) { onSend(text); inputEl.value = ''; chatResize(inputEl, maxH || 150); }
    }, e));
  }
  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      const text = inputEl?.value?.trim();
      if (text) { onSend(text); inputEl.value = ''; chatResize(inputEl, maxH || 150); }
    });
  }
  if (voiceBtn && inputEl) {
    voiceBtn.addEventListener('click', () => toggleHomeVoice());
  }
}

/**
 * 共通音声入力
 */
async function startVoiceInput(inputEl) {
  if (!inputEl) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm';
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      try {
        const blob = new Blob(chunks, { type: mimeType });
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const res = await fetch(`${WORKER_URL}/api/voice/transcribe`, {
          method: 'POST', headers: getAuthHeaders(),
          body: JSON.stringify({ audio: base64, mimeType })
        });
        const data = await res.json();
        if (data.text) {
          inputEl.value += (inputEl.value ? ' ' : '') + data.text;
          chatResize(inputEl, 150);
          inputEl.focus();
        } else { toast('音声を認識できませんでした'); }
      } catch (e) { toast('音声認識に失敗しました'); }
    };
    recorder.start();
    toast('録音中…タップで停止');
    inputEl._voiceRecorder = recorder;
  } catch (e) { toast('マイクへのアクセスが許可されていません'); }
}

/**
 * 共通画像アップロード処理
 */
function handleImageUpload(event, inputEl) {
  const file = event?.target?.files?.[0];
  if (!file || !file.type.startsWith('image/')) return;
  toast('画像を添付しました: ' + file.name);
  event.target.value = '';
}

