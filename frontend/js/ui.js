// ════════ SYSTEM PROMPTS ════════
function getSysNormal(){
  return `あなたはGOAL AIというAIコーチです。ユーザーと一緒にゴールを形作り、達成を伴走します。
${curGoal ? '\nゴール：'+curGoal : ''}

【対話の原則】
- ユーザーがまだ漠然としたビジョンを話しているなら、すぐ提案せず動機や感情を掘り下げる
- 「なぜそう思った？」「それが実現したらどうなる？」のような問いかけをする
- ゴールの輪郭が見えてきたら「こういうゴールにまとめてみない？」と提案する
- タスクはゴールがなくても独立して作成できる。ゴールを前提条件にしない
- 2〜3文で返す。質問は1回に1つだけ

【JSON出力（ゴール確定後、必要な場合のみ）】
ロードマップ：
\`\`\`json
{"type":"roadmap","steps":[{"num":1,"title":"ステップ名","period":"期間","status":"done|current|todo"}]}
\`\`\`

期間延長予測：
\`\`\`json
{"type":"forecast","scenarios":[{"label":"ラベル","date":"YYYY年MM月末","delta":"+Xヶ月","color":"red|amber|green"}]}
\`\`\`

トレードオフ：
\`\`\`json
{"type":"tradeoff","items":[{"give":"諦めること","detail":"詳細","gain":"得られる時間・効果"}]}
\`\`\``;
}

function getSysSpartan(){
  const goal = ALL_GOALS[activeGoalIdx];
  const progressStr = goal ? `進捗：${goal.actual}%（目安${goal.target}%）| 遅延：${goal.target-goal.actual>0?'-'+(goal.target-goal.actual)+'%':'なし'}` : '';
  return `あなたは端的で辛口なコーチです。口調は丁寧語を使いますが、無駄な褒め言葉・フォロー・励ましは一切しません。甘さゼロです。問題点や甘さを率直に指摘し、具体的な改善点だけを伝えます。共感・慰め・サポートの言葉は不要です。短く、的確に、事実だけを述べてください。ユーザーが言い訳をした場合、その言い訳の妥当性を論理的に検証し、妥当でなければ率直に指摘してください。
${curGoal ? '\nゴール：'+curGoal+(progressStr?' | '+progressStr:'') : ''}`;
}

function getSysMencare(){
  return `あなたはGOAL AIのメンケアモードです。今、ユーザーは精神的に疲れています。
${curGoal ? '\nゴール：'+curGoal : ''}

【最優先ルール】
- 進捗や遅延の話は自分からしない。聞かれても「今は大丈夫。まず気持ちを整えよう」と流す
- 共感を最初に。気持ちをしっかり受け取ってから、次の話をする
- 小さな一歩だけを提案する。「今日5分だけやってみよう」レベル
- 弱みを指摘しない。強みだけに光を当てる
- ユーザーが「ダメだ」と言っても「そんなことない」と否定せず、「そう感じるのは当然だよ」と受け止める
- 絵文字は控えめに。温かい言葉を選ぶ
- 一度に提案は1つだけ。選択肢を押しつけない

【個人情報の活用】
ユーザーの強み・日課・生活リズムを把握した上で、「あなたならできる」という根拠を具体的に示す。`;
}


// ════════ INITIAL WELCOME MESSAGE ════════
const DEMO_MSGS = [];

// ════════ CHART DATA ════════
const CHART_DATA = [];

const FAIL_HISTORY = [];

// ════════ CALENDAR DATA ════════
function getCalEvents() {
  const events = {};
  ALL_GOALS.filter(g=>!g.archived).forEach((goal,gi) => {
    const color = getGoalColor(gi);
    (goal.phases||[]).forEach(phase => {
      (phase.tasks||[]).forEach(task => {
        if(!task.due) return;
        const d = new Date(task.due);
        const key = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
        if(!events[key]) events[key] = [];
        events[key].push({
          type: task.status==='done'?'done':'task',
          text: task.title,
          goalName: goal.title,
          goalColor: color,
          goalIdx: gi,
          source: task.source||'user'
        });
      });
    });
  });
  return events;
}

// ════════ MOBILE SIDEBAR ════════
function toggleSidebar(){
  const sb = document.getElementById('sb');
  const ov = document.getElementById('sb-overlay');
  const hb = document.getElementById('hamburger-btn');
  const isOpen = sb.classList.contains('open');
  sb.classList.toggle('open');
  ov.classList.toggle('open');
  if(hb) hb.style.display = isOpen ? '' : 'none';
  document.body.style.overflow = isOpen ? '' : 'hidden';
  // サイドバー表示時にモーダルを閉じる
  if(!isOpen) document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
}
function closeSidebar(){
  const sb = document.getElementById('sb');
  const ov = document.getElementById('sb-overlay');
  const hb = document.getElementById('hamburger-btn');
  if(sb.classList.contains('open')){
    sb.classList.remove('open');
    ov.classList.remove('open');
    if(hb) hb.style.display = '';
    document.body.style.overflow = '';
  }
}

// ════════ GLOBAL HEADER (全タブ共通) ════════
function renderGlobalHeader(title, rightButtons) {
  return `<div style="display:flex;align-items:center;height:48px;padding:0 8px;gap:6px;background:var(--bg);border-bottom:1px solid var(--border);flex-shrink:0;">
    <button onclick="toggleSidebar()" style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;flex-shrink:0;padding:0;background:transparent;border:none;cursor:pointer;color:var(--cream);border-radius:10px;" aria-label="メニュー"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>
    <span style="flex:1;font-size:14px;font-weight:500;color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title||''}</span>
    <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">${rightButtons||''}</div>
  </div>`;
}

// ════════ SWIPE TO OPEN SIDEBAR ════════
function initSwipeToOpenSidebar(){
  let touchStartX=0, touchStartY=0;
  document.addEventListener('touchstart', e=>{ touchStartX=e.touches[0].clientX; touchStartY=e.touches[0].clientY; }, {passive:true});
  document.addEventListener('touchend', e=>{
    const dx=e.changedTouches[0].clientX-touchStartX;
    const dy=Math.abs(e.changedTouches[0].clientY-touchStartY);
    if(touchStartX<25 && dx>60 && dy<30) toggleSidebar();
  }, {passive:true});
}

// ════════ TAB SWIPE ════════
function initTabSwipe(container, onSwipe) {
  let startX = 0, startY = 0;
  container.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; }, { passive: true });
  container.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = Math.abs(e.changedTouches[0].clientY - startY);
    if (Math.abs(dx) > 50 && dy < 40) onSwipe(dx > 0 ? 'right' : 'left');
  }, { passive: true });
}

// ════════ PAGE NAVIGATION ════════
function _saveScroll(){
  const scrollEls = {'home':'home-chat-wrap','goal-hub':'hub-chat-wrap'};
  const el = scrollEls[curPage] && document.getElementById(scrollEls[curPage]);
  if(el) sessionStorage.setItem('scroll_'+curPage, el.scrollTop);
}
function _restoreScroll(pg){
  const scrollEls = {'home':'home-chat-wrap','goal-hub':'hub-chat-wrap'};
  const el = scrollEls[pg] && document.getElementById(scrollEls[pg]);
  const saved = sessionStorage.getItem('scroll_'+pg);
  if(el && saved) requestAnimationFrame(()=>{ el.scrollTop = parseInt(saved); });
}
function showPage(pg) {
  _saveScroll();
  document.querySelectorAll('.page').forEach(p=>{p.classList.remove('active');p.classList.remove('page-enter');});
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  curPage = pg;
  closeSidebar();
  if(pg==='home'){
    document.getElementById('pg-home-wrap').classList.add('active');
    document.getElementById('nav-home').classList.add('active');
    document.getElementById('topbar').style.display='none';
    renderHomeSummary();
    _restoreScroll('home');
  } else if(pg==='goal-hub'){
    document.getElementById('pg-goal-hub-wrap').classList.add('active');
    document.getElementById('topbar').style.display='none';
    _restoreScroll('goal-hub');
  } else if(pg==='myself'){
    document.getElementById('pg-myself-wrap').classList.add('active');
    document.getElementById('topbar').style.display='none';
    renderMyselfProfile();
    runConnectAnalysis();
  } else if(pg==='tasks'){
    document.getElementById('pg-tasks-wrap').classList.add('active');
    document.getElementById('nav-tasks').classList.add('active');
    document.getElementById('topbar').style.display='none';
    renderTasks();
  } else if(pg==='calendar'){
    document.getElementById('pg-calendar-wrap').classList.add('active');
    document.getElementById('nav-calendar').classList.add('active');
    renderCalendar();
    document.getElementById('topbar').style.display='none';
  } else if(pg==='analytics'){
    document.getElementById('pg-analytics-wrap').classList.add('active');
    document.getElementById('nav-analytics').classList.add('active');
    renderCharts();
    updateAnalyticsExtras();
    document.getElementById('topbar').style.display='none';
  } else if(pg==='settings'){
    document.getElementById('pg-settings-wrap').classList.add('active');
    document.getElementById('nav-settings').classList.add('active');
    document.getElementById('topbar').style.display='none';
  } else if(pg==='welcome'){
    document.getElementById('pg-welcome-wrap').classList.add('active');
    document.getElementById('topbar').style.display='none';
  }
  // D-8: Page transition animation (skip on initial load)
  if (window._appInitDone) {
    const activePg = document.querySelector('.page.active');
    if (activePg) activePg.classList.add('page-enter');
  }
}

// ════════ SPARTAN MODE ════════
// ════════ MODE SELECTION ════════
function selectMode(mode) {
  if(mode === 'mencare' && !mencareMode) {
    // Use a simple select instead of prompt() for better UX
    const days = 3;
    // Show inline selector via small modal
    const sel = window._mencaredays || 3;
    const input = document.createElement('div');
    input.style.cssText = 'position:fixed;inset:0;z-index:3000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;';
    input.innerHTML = `<div style="background:var(--bg2);border:1px solid var(--border-card);border-radius:14px;padding:24px;width:min(320px,85vw);text-align:center;">
      <div style="font-size:14px;color:var(--cream);margin-bottom:14px;">メンケアモードの期間</div>
      <div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px;" id="_mencare-days">
        ${[1,2,3,5,7].map(d=>`<button onclick="window._mencaredays=${d};document.querySelectorAll('#_mencare-days button').forEach(b=>b.style.background='var(--bg3)');this.style.background='var(--mencare-d)';this.style.borderColor='var(--mencare)'" style="padding:8px 14px;background:${d===3?'var(--mencare-d)':'var(--bg3)'};border:1px solid ${d===3?'var(--mencare)':'var(--border)'};border-radius:8px;color:var(--cream);font-size:13px;cursor:pointer;font-family:var(--ff);">${d}日</button>`).join('')}
      </div>
      <div style="display:flex;gap:8px;justify-content:center;">
        <button onclick="this.closest('div[style*=fixed]')._confirm=true;this.closest('div[style*=fixed]').remove()" style="padding:8px 20px;background:var(--mencare-d);border:1px solid var(--mencare);border-radius:8px;color:var(--cream);font-size:13px;cursor:pointer;font-family:var(--ff);">開始</button>
        <button onclick="this.closest('div[style*=fixed]').remove()" style="padding:8px 20px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--muted);font-size:13px;cursor:pointer;font-family:var(--ff);">キャンセル</button>
      </div>
    </div>`;
    window._mencaredays = 3;
    const observer = new MutationObserver(() => {
      if(!document.body.contains(input)){
        observer.disconnect();
        if(input._confirm) activateMencare(window._mencaredays || 3);
      }
    });
    document.body.appendChild(input);
    observer.observe(document.body, {childList:true});
    return;
  }
  if(mode !== 'mencare') {
    clearInterval(mencareTimerInterval);
    mencareEndTime = null;
    document.getElementById('mencare-timer').style.display = 'none';
    document.getElementById('mbox-mencare-sub').textContent = '無理せず';
  }
  if(mode === 'kabeuchi') kabeuchiMode = true;
  applyModeUI(mode);
}
function activateMencare(days) {
  mencareEndTime = Date.now() + days * 24 * 60 * 60 * 1000;
  clearInterval(mencareTimerInterval);
  mencareTimerInterval = setInterval(() => {
    if(Date.now() >= mencareEndTime) selectMode('normal');
    else updateMencareTimer();
  }, 60000);
  updateMencareTimer();
  document.getElementById('mencare-timer').style.display = '';
  document.getElementById('mbox-mencare-sub').textContent = `${days}日間`;
  applyModeUI('mencare');
}
function applyModeUI(mode) {
  spartanMode  = mode === 'spartan';
  mencareMode  = mode === 'mencare';
  kabeuchiMode = mode === 'kabeuchi';

  const boxes = {
    mencare: document.getElementById('mbox-mencare'),
    normal:  document.getElementById('mbox-normal'),
    spartan: document.getElementById('mbox-spartan'),
    kabeuchi: document.getElementById('mbox-kabeuchi'),
  };
  if(boxes.mencare)  boxes.mencare.className  = 'mode-box' + (mencareMode ? ' active-mencare' : '');
  if(boxes.normal)   boxes.normal.className   = 'mode-box' + (mode==='normal' ? ' active' : '');
  if(boxes.spartan)  boxes.spartan.className  = 'mode-box' + (spartanMode ? ' active-spartan' : '');
  if(boxes.kabeuchi) boxes.kabeuchi.className = 'mode-box' + (kabeuchiMode ? ' active-kabeuchi' : '');

  // 壁打ちインジケーター
  const ki = document.getElementById('kabeuchi-indicator');
  if(ki) ki.style.display = kabeuchiMode ? 'inline-block' : 'none';

  const msgIn = document.getElementById('msg-in');
  if(msgIn) msgIn.placeholder = '返信する';

  const labels = { mencare:'🌸 メンケアモード ON', normal:'💬 通常モードに戻りました', spartan:'🔥 スパルタモード ON', kabeuchi:'💭 ソクラテスモード ON' };
  toast(labels[mode]);

  // AIロールバッジ更新
  const roleBadgeLabels = { spartan:'🔥 スパルタ', mencare:'🌸 メンケア', kabeuchi:'💭 ソクラテス', normal:'' };
  if(typeof updateRoleBadge === 'function') updateRoleBadge(roleBadgeLabels[mode] || '');

  // モード別背景色
  document.body.classList.remove('mode-spartan','mode-mencare','mode-kabeuchi');
  if(mode==='spartan') document.body.classList.add('mode-spartan');
  if(mode==='mencare') document.body.classList.add('mode-mencare');
  if(mode==='kabeuchi') document.body.classList.add('mode-kabeuchi');

  // Update pill buttons
  if(typeof updateModePills === 'function') updateModePills();

  showPage('home');
}

// Keep stubs so settings page toggles still work
function toggleSpartan(){ selectMode(spartanMode ? 'normal' : 'spartan'); }
function toggleMencare(){ selectMode(mencareMode ? 'normal' : 'mencare'); }

let kabeuchiMode = false;
function getActiveMode(){ return kabeuchiMode?'kabeuchi':mencareMode?'mencare':spartanMode?'spartan':'normal'; }
function updateModeUI(){} // no-op, handled by selectMode now

function updateMencareTimer(){
  if(!mencareEndTime) return;
  const diff = mencareEndTime - Date.now();
  if(diff <= 0){ selectMode('normal'); return; }
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const el = document.getElementById('mencare-timer');
  if(el) el.textContent = `残り${days}日${hours}時間`;
}




// ════════ DEEP ANALYSIS SYSTEM ════════

// API keys are now managed by Cloudflare Worker — AUTH_TOKEN used for auth

// ── Usage limits per plan ──
const DEEP_LIMITS = {
  free:    3,    // Free: 3回/月
  trial:   5,    // テストユーザー/Trial: 5回/日
  light:   5,    // Light: 5回/月
  pro:    30,    // Pro: 30回/月
  max:   9999,   // Max: 無制限
  ultra: 9999,   // Ultra: 無制限
};

// Usage tracker (in-memory, keyed by YYYY-MM)
const _deepUsage = {};  // { 'YYYY-MM': count }

function getDeepMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function getDeepUsedCount() {
  return _deepUsage[getDeepMonthKey()] || 0;
}

function getDeepLimit() {
  const plan = MEMBERSHIP.plan;
  // Trial check
  if (MEMBERSHIP.trialEnd && new Date() < new Date(MEMBERSHIP.trialEnd)) return DEEP_LIMITS.trial;
  return DEEP_LIMITS[plan] || DEEP_LIMITS.free;
}

function getDeepRemaining() {
  return Math.max(0, getDeepLimit() - getDeepUsedCount());
}

function incrementDeepUsage() {
  const key = getDeepMonthKey();
  _deepUsage[key] = (_deepUsage[key] || 0) + 1;
}

function getDeepUsageBadgeHTML() {
  const remaining = getDeepRemaining();
  const limit = getDeepLimit();
  const used = getDeepUsedCount();
  const plan = MEMBERSHIP.plan;
  const planLabel = {ultra:'Ultra',max:'Max',pro:'Pro',light:'Light',free:'Free'}[plan] ||
    ((MEMBERSHIP.trialEnd && new Date() < new Date(MEMBERSHIP.trialEnd)) ? 'テスト' : 'Free');

  if (remaining === 0) {
    return `<span class="deep-usage-badge deep-usage-zero">⚠ 今月の残り回数：0回（${planLabel}プラン 上限${limit}回）</span>`;
  }
  const cls = remaining <= 2 ? 'deep-usage-warn' : 'deep-usage-ok';
  return `<span class="deep-usage-badge ${cls}">今月の残り：<strong>${remaining}回</strong>（${used}/${limit}回使用 · ${planLabel}）</span>`;
}

// Output formats
const OUTPUT_FORMATS = [
  { id:'text', label:'テキスト', icon:'📝' },
  { id:'pdf',  label:'PDF',    icon:'📄' },
  { id:'word', label:'Word',   icon:'🔵' },
  { id:'excel',label:'Excel',  icon:'🟢' },
  { id:'pptx', label:'パワポ',  icon:'🟠' },
];
let _selectedFormat = 'text';

// Keywords that trigger deep analysis suggestion
function isDeepAnalysisNeeded(text) {
  return DEEP_TRIGGERS.some(kw => text.includes(kw));
}

// Show confirm bubble with usage info + format selector
function showDeepConfirm(containerId, scrollId, onYes, onNo) {
  const inner = document.getElementById(containerId);
  const scrollEl = document.getElementById(scrollId);
  const remaining = getDeepRemaining();
  const usageBadge = getDeepUsageBadgeHTML();

  const bubble = document.createElement('div');
  bubble.className = 'deep-confirm-bubble';
  bubble.id = 'deep-confirm-bubble';

  if (remaining === 0) {
    // Usage limit reached
    bubble.innerHTML = `
      <div class="deep-confirm-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        今月のディープ分析回数を使い切りました
      </div>
      ${usageBadge}
      <div class="deep-confirm-desc" style="margin-top:6px;">
        プランをアップグレードするか、来月までお待ちください。<br>
        通常モードでも回答できます。
      </div>
      <div class="deep-confirm-btns">
        <button class="deep-confirm-btn deep-btn-yes" onclick="this.closest('.deep-confirm-bubble').remove();openPlanModal()">
          ▲ プランをアップグレード
        </button>
        <button class="deep-confirm-btn deep-btn-no" onclick="this.closest('.deep-confirm-bubble').remove();__deepNo()">
          通常の返答でOK
        </button>
      </div>`;
    inner.appendChild(bubble);
    if (scrollEl) scrollEl.scrollTop = 99999;
    window.__deepNo = onNo;
    return;
  }

  bubble.innerHTML = `
    <div class="deep-confirm-title">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
      3人寄れば文殊の知恵
    </div>
    ${usageBadge}
    <div class="deep-confirm-desc">
      3つのAIが連携して深く分析します。<br>
      Gemini（リサーチ）→ GPT（アイデア）→ Claude（戦略）<span style="color:var(--amber)">　約30〜60秒</span>
    </div>
    <div style="font-size:9.5px;color:var(--muted2);margin-bottom:5px;">出力形式を選択：</div>
    <div class="deep-format-row" id="deep-fmt-row">
      ${OUTPUT_FORMATS.map(f =>
        `<button class="deep-fmt-btn${f.id===_selectedFormat?' selected':''}" onclick="selectDeepFormat('${f.id}',this)">
          ${f.icon} ${f.label}
        </button>`
      ).join('')}
    </div>
    <div class="deep-confirm-btns" style="margin-top:10px;">
      <button class="deep-confirm-btn deep-btn-yes" onclick="this.closest('.deep-confirm-bubble').remove();__deepYes()">
        ⚡ ヒアリング開始（残り${remaining}回）
      </button>
      <button class="deep-confirm-btn deep-btn-no" onclick="this.closest('.deep-confirm-bubble').remove();__deepNo()">
        通常の返答でOK
      </button>
    </div>`;
  inner.appendChild(bubble);
  if (scrollEl) scrollEl.scrollTop = 99999;
  window.__deepYes = onYes;
  window.__deepNo = onNo;
}

function selectDeepFormat(id, btn) {
  _selectedFormat = id;
  document.querySelectorAll('.deep-fmt-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

// Progress panel
function createDeepProgressPanel(containerId, scrollId) {
  const inner = document.getElementById(containerId);
  const scrollEl = document.getElementById(scrollId);
  const panel = document.createElement('div');
  panel.className = 'deep-progress-wrap';
  panel.id = 'deep-progress-panel';
  const phases = [
    { id:'ph-gemini1', icon:'🔵', name:'Gemini — 市場・競合リサーチ' },
    { id:'ph-gpt1',    icon:'🟡', name:'GPT — アイデア・仮説生成' },
    { id:'ph-gemini2', icon:'🔵', name:'Gemini — 仮説検証・深掘り' },
    { id:'ph-gpt2',    icon:'🟡', name:'GPT — アイデア精度UP' },
    { id:'ph-claude',  icon:'🟣', name:'Claude — 戦略立案・文章生成' },
    { id:'ph-review',  icon:'⚖️',  name:'デュアルレビュー（GPT × Gemini）' },
    { id:'ph-fix',     icon:'✨', name:'Claude — 最終調整・出力' },
  ];
  const fmtLabel = OUTPUT_FORMATS.find(f=>f.id===_selectedFormat)?.label || 'テキスト';
  panel.innerHTML = `
    <div class="deep-progress-title">
      <span style="animation:spin 1s linear infinite;display:inline-block">${getLogoSVG(16)}</span>
      ディープ分析実行中… <span style="font-size:9px;color:var(--muted2);font-weight:400;margin-left:4px;">出力：${fmtLabel}</span>
    </div>
    ${phases.map(p => `
      <div class="deep-phase-row" id="${p.id}">
        <span class="deep-phase-icon">${p.icon}</span>
        <span class="deep-phase-name">${p.name}</span>
        <div class="deep-phase-bar"><div class="deep-phase-fill" id="${p.id}-fill" style="width:0%"></div></div>
        <span class="deep-phase-status" id="${p.id}-status">待機</span>
      </div>`).join('')}`;
  inner.appendChild(panel);
  if (scrollEl) scrollEl.scrollTop = 99999;
  return panel;
}

function setPhaseStatus(phaseId, status) {
  const row = document.getElementById(phaseId);
  const fill = document.getElementById(phaseId + '-fill');
  const statusEl = document.getElementById(phaseId + '-status');
  if (!row) return;
  const nameEl = row.querySelector('.deep-phase-name');
  if (status === 'active') {
    nameEl.className = 'deep-phase-name active';
    fill.className = 'deep-phase-fill active'; fill.style.width = '60%';
    statusEl.className = 'deep-phase-status active'; statusEl.textContent = '実行中';
    setTimeout(() => { if(fill) fill.style.width = '90%'; }, 800);
  } else if (status === 'done') {
    nameEl.className = 'deep-phase-name done';
    fill.className = 'deep-phase-fill done'; fill.style.width = '100%';
    statusEl.className = 'deep-phase-status done'; statusEl.textContent = '完了';
  }
}

// Gemini API call (via Worker proxy)
async function callGemini(prompt, systemCtx) {
  if (!AUTH_TOKEN) throw new Error('認証トークンが設定されていません');
  const res = await fetch(`${WORKER_URL}/api/deep/gemini`, {
    method:'POST', headers:getAuthHeaders(),
    body:JSON.stringify({ prompt, systemCtx, maxTokens: 1200 })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gemini error');
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// OpenAI API call (via Worker proxy)
async function callOpenAI(prompt, system, maxTokens) {
  if (!AUTH_TOKEN) throw new Error('認証トークンが設定されていません');
  maxTokens = maxTokens || 1000;
  const messages = [];
  if (system) messages.push({ role:'system', content:system });
  messages.push({ role:'user', content:prompt });
  const res = await fetch(`${WORKER_URL}/api/deep/openai`, {
    method:'POST', headers:getAuthHeaders(),
    body:JSON.stringify({ messages, maxTokens })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'OpenAI error');
  return data.choices?.[0]?.message?.content || '';
}

// Full deep analysis pipeline
async function runDeepAnalysis(userQuery, containerId, scrollId, onComplete) {
  incrementDeepUsage();  // Count usage immediately
  const panel = createDeepProgressPanel(containerId, scrollId);
  const scrollEl = document.getElementById(scrollId);
  const ctx = buildAIContextCached();
  let results = {};

  try {
    setPhaseStatus('ph-gemini1', 'active');
    results.geminiResearch = await callGemini(
      `以下のテーマについて市場調査・競合分析・最新トレンドをリサーチしてください。\n\nテーマ：${userQuery}\n\nユーザー背景：${ctx}\n\n箇条書きで簡潔に。重要なデータ・数字を含めること。`,
      'あなたは市場調査の専門家です。事実・データ・トレンドに基づいた客観的なリサーチをしてください。'
    );
    setPhaseStatus('ph-gemini1', 'done');
    if (scrollEl) scrollEl.scrollTop = 99999;

    setPhaseStatus('ph-gpt1', 'active');
    results.gptIdeas = await callOpenAI(
      `以下のリサーチ結果を踏まえて、革新的なアイデアと仮説を生成してください。\n\nテーマ：${userQuery}\nリサーチ：${results.geminiResearch}\n\nユーザー背景：${ctx}\n\n5〜8個の具体的なアイデアを提示。各アイデアに根拠も含めること。`,
      'あなたは創造的なビジネスストラテジストです。既成概念にとらわれない斬新なアイデアを生成してください。'
    );
    setPhaseStatus('ph-gpt1', 'done');

    setPhaseStatus('ph-gemini2', 'active');
    results.geminiVerify = await callGemini(
      `以下のアイデアをリサーチデータで検証・深掘りしてください。\n\nアイデア：${results.gptIdeas}\n\n各アイデアの実現可能性・市場規模・リスクを評価。エビデンスがある項目は数字で示すこと。`,
      'あなたは事実検証の専門家です。データと事実に基づいてアイデアを評価してください。'
    );
    setPhaseStatus('ph-gemini2', 'done');

    setPhaseStatus('ph-gpt2', 'active');
    results.gptRefined = await callOpenAI(
      `検証結果を踏まえて、最も有望な戦略を3つに絞り、具体的なアクションプランに昇華させてください。\n\n検証結果：${results.geminiVerify}\n\n各戦略に：① 概要 ② 具体的な実行ステップ ③ 期待効果 ④ リスク対策 を含めること。`,
      'あなたは実践的なビジネスコンサルタントです。実行可能な具体策を提案してください。'
    );
    setPhaseStatus('ph-gpt2', 'done');
    if (scrollEl) scrollEl.scrollTop = 99999;

    setPhaseStatus('ph-claude', 'active');
    let claudeOutput = '';
    const claudeSys = `あなたはGOAL AIの戦略コーチです。\n\n${ctx}\n\n【リサーチ結果】\n${results.geminiResearch}\n\n【検証済みアイデア】\n${results.gptRefined}\n\n以上を統合して、ユーザーに最適化された具体的な戦略文書を作成してください。構造的に、実行可能な形で。`;
    await streamAI(
      { system: claudeSys, messages:[{role:'user',content:userQuery}], maxTokens:1200 },
      (text) => {
        claudeOutput = text;
        const fill = document.getElementById('ph-claude-fill');
        if (fill) fill.style.width = Math.min(90, 30 + text.length/20) + '%';
      },
      (text) => { claudeOutput = text; },
      (e) => { throw e; }
    );
    results.claudeStrategy = claudeOutput;
    setPhaseStatus('ph-claude', 'done');

    setPhaseStatus('ph-review', 'active');
    const [gptReview, geminiReview] = await Promise.all([
      callOpenAI(
        `以下の戦略文書をレビューしてください。\n\n${results.claudeStrategy}\n\n評価観点：① 事実/推論のバランス ② 実現性 ③ 論理的矛盾 ④ 改善提案\n\n各観点を簡潔に。問題点があれば具体的に指摘。`,
        'あなたは批判的思考の専門家です。事実と推論を明確に区別し、論理的矛盾を指摘してください。', 600
      ),
      callGemini(
        `以下の戦略文書のエビデンスを検証してください。\n\n${results.claudeStrategy}\n\n評価観点：① データ・数字の根拠 ② 競合事例との整合性 ③ 最新情報との照合 ④ 改善提案\n\n各観点を簡潔に。`,
        'あなたはデータアナリストです。エビデンスと市場データの観点から戦略を検証してください。'
      )
    ]);
    results.gptReview = gptReview;
    results.geminiReview = geminiReview;
    setPhaseStatus('ph-review', 'done');

    setPhaseStatus('ph-fix', 'active');
    let finalOutput = results.claudeStrategy;
    await streamAI(
      { system:`あなたはGOAL AIの戦略コーチです。\n\n${ctx}`,
        messages:[{role:'user',content:`以下の戦略文書をレビュー指摘を踏まえて改善してください。\n\n【元の戦略】\n${results.claudeStrategy}\n\n【GPTレビュー】\n${gptReview}\n\n【Geminiレビュー】\n${geminiReview}\n\n重要な指摘のみ反映。最終版を出力してください。`}],
        maxTokens:1200
      },
      (text) => {
        finalOutput = text;
        const fill = document.getElementById('ph-fix-fill');
        if (fill) fill.style.width = Math.min(90, 20 + text.length/20) + '%';
      },
      (text) => { finalOutput = text; },
      (e) => { finalOutput = results.claudeStrategy; }
    );
    results.finalOutput = finalOutput;
    results.format = _selectedFormat;
    setPhaseStatus('ph-fix', 'done');
    // M: ディープ分析結果を保持（次の会話のコンテキストに注入）
    window._lastDeepResult = { query: userQuery, summary: finalOutput.slice(0, 1000), timestamp: Date.now() };

    panel.remove();
    onComplete(results);

  } catch (e) {
    panel.remove();
    const errWrap = document.createElement('div');
    errWrap.className = 'msg ai'; errWrap.style.marginBottom = '16px';
    errWrap.innerHTML = `<div class="msg-av ai">${getLogoSVG(14)}</div><div class="msg-body"><div class="bubble" style="border-color:var(--red-d)">ディープ分析中にエラーが発生しました：${escapeHtml(e.message || '')}<br><br>設定パネル（⚙）→「3AI ディープ分析 — API設定」でAPIキーを確認してください。</div></div>`;
    const inner = document.getElementById(containerId);
    if (inner) inner.appendChild(errWrap);
    const s = document.getElementById(scrollId);
    if (s) s.scrollTop = 99999;
    onComplete(null);
  }
}

// Render deep analysis result
function renderDeepResult(containerId, scrollId, results, userQuery) {
  const inner = document.getElementById(containerId);
  const scrollEl = document.getElementById(scrollId);
  const text = results.finalOutput;
  const factCount    = (text.match(/\d+[%万億円人]/g) || []).length;
  const inferCount   = (text.match(/と考えられ|と推測|可能性|見込み/g) || []).length;
  const suggestCount = (text.match(/おすすめ|提案|検討|べき|ほうが/g) || []).length;
  const fmtLabel = OUTPUT_FORMATS.find(f=>f.id===results.format)?.label || 'テキスト';
  const remaining = getDeepRemaining();

  const wrap = document.createElement('div');
  wrap.className = 'deep-result-wrap';
  wrap.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;margin-bottom:12px;background:var(--amber-g);border:1px solid var(--amber-d);border-radius:8px;font-size:10px;color:var(--amber);font-family:var(--fm);">
      <span>🔍 Gemini</span><span style="color:var(--border2)">→</span>
      <span>💡 GPT</span><span style="color:var(--border2)">→</span>
      <span>🧠 Claude</span>
      <span style="margin-left:auto;color:var(--muted2);">3AI連携分析</span>
    </div>
    <div class="deep-result-header">
      <span style="color:var(--amber);">${getLogoSVG(18)}</span>
      <div style="flex:1">
        <div style="font-size:11px;font-weight:600;color:var(--amber);">ディープ分析 — 完了</div>
        <div style="font-size:9px;color:var(--muted2);">Gemini × GPT × Claude + デュアルレビュー</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
        <div class="deep-label-row" style="margin:0;">
          ${factCount > 0 ? `<span class="deep-label deep-label-fact">🔵 事実 ${factCount}</span>` : ''}
          ${inferCount > 0 ? `<span class="deep-label deep-label-infer">🟡 推論 ${inferCount}</span>` : ''}
          ${suggestCount > 0 ? `<span class="deep-label deep-label-suggest">🟠 提案 ${suggestCount}</span>` : ''}
        </div>
        <span style="font-size:9px;color:var(--muted2);">今月の残り：<span style="color:${remaining<=2?'var(--amber)':'var(--green)'};">${remaining}回</span></span>
      </div>
    </div>
    <div class="deep-result-body">
      <div style="font-size:12px;line-height:1.75;color:var(--cream);">${renderMsgContent(results.finalOutput)}</div>
      <div class="deep-review-toggle" onclick="this.nextElementSibling.classList.toggle('open');this.querySelector('.toggle-arrow').textContent=this.nextElementSibling.classList.contains('open')?'▲':'▼'">
        <span class="toggle-arrow">▼</span>
        レビューサマリーを見る（GPT × Gemini）
      </div>
      <div class="deep-review-content">
        <div style="margin-bottom:10px;">
          <div style="font-size:9.5px;color:var(--green);margin-bottom:4px;font-weight:600;">🟡 GPT レビュー（事実・推論・実現性）</div>
          <div>${renderMsgContent(results.gptReview)}</div>
        </div>
        <div>
          <div style="font-size:9.5px;color:var(--blue);margin-bottom:4px;font-weight:600;">🔵 Gemini レビュー（エビデンス・競合整合性）</div>
          <div>${renderMsgContent(results.geminiReview)}</div>
        </div>
      </div>
      <!-- Output format download buttons -->
      <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:1px solid var(--border);">
        <button class="deep-pdf-btn${results.format==='text'?' selected':''}" onclick="exportDeepFormat('text', window.__lastDeepResults, '${userQuery.replace(/'/g,'').slice(0,20)}')">📝 テキスト</button>
        <button class="deep-pdf-btn${results.format==='pdf'?' selected':''}" onclick="exportDeepFormat('pdf', window.__lastDeepResults, '${userQuery.replace(/'/g,'').slice(0,20)}')">📄 PDF</button>
        <button class="deep-pdf-btn${results.format==='word'?' selected':''}" onclick="exportDeepFormat('word', window.__lastDeepResults, '${userQuery.replace(/'/g,'').slice(0,20)}')">🔵 Word</button>
        <button class="deep-pdf-btn${results.format==='excel'?' selected':''}" onclick="exportDeepFormat('excel', window.__lastDeepResults, '${userQuery.replace(/'/g,'').slice(0,20)}')">🟢 Excel</button>
        <button class="deep-pdf-btn${results.format==='pptx'?' selected':''}" onclick="exportDeepFormat('pptx', window.__lastDeepResults, '${userQuery.replace(/'/g,'').slice(0,20)}')">🟠 パワポ</button>
        <button class="deep-pdf-btn" style="border-color:var(--know-purple-border);color:var(--purple);margin-left:auto;" onclick="continueDeepChat('${userQuery.replace(/'/g,'').slice(0,30)}')">＋ 深掘り</button>
      </div>
    </div>`;
  inner.appendChild(wrap);
  window.__lastDeepResults = results;
  if (scrollEl) scrollEl.scrollTop = 99999;

  // Auto-trigger selected format download
  if (results.format !== 'text') {
    setTimeout(() => exportDeepFormat(results.format, results, userQuery.slice(0,20)), 500);
  }
}

// Export in selected format
function exportDeepFormat(format, results, title) {
  if (!results) return;
  const ts = new Date().toISOString().slice(0,10);
  const safeName = `GOALAI_${title}_${ts}`;

  if (format === 'text') {
    const body = [
      `GOAL AI ディープ分析レポート`,
      `テーマ：${title}`,
      `生成日時：${new Date().toLocaleString('ja-JP')}`,
      `\n${'='.repeat(60)}\n`,
      `【戦略立案（Claude）】\n${results.finalOutput}`,
      `\n${'='.repeat(60)}\n`,
      `【GPTレビュー】\n${results.gptReview}`,
      `\n${'─'.repeat(40)}\n`,
      `【Geminiレビュー】\n${results.geminiReview}`,
      `\nPowered by GOAL AI（Gemini × GPT × Claude）`,
    ].join('\n');
    const blob = new Blob([body], {type:'text/plain;charset=utf-8'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download=`${safeName}.txt`; a.click();
    toast('テキストをダウンロードしました');

  } else if (format === 'pdf') {
    // HTML→print PDF (browser built-in)
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <style>/* PDF/print: hardcoded colors intentional */body{font-family:sans-serif;max-width:800px;margin:40px auto;font-size:13px;line-height:1.7;color:#222;}
      h1{font-size:18px;border-bottom:2px solid #e4b86a;padding-bottom:6px;color:#b8882a;}
      h2{font-size:14px;color:#555;margin-top:24px;}
      .review{background:#f8f8f8;border-left:3px solid #ccc;padding:10px 14px;margin:10px 0;font-size:12px;}
      .meta{font-size:11px;color:#888;margin-bottom:20px;}
      pre{white-space:pre-wrap;font-family:inherit;}</style>
      </head><body>
      <h1>GOAL AI ディープ分析レポート</h1>
      <div class="meta">テーマ：${title} ／ 生成：${new Date().toLocaleString('ja-JP')}<br>Powered by Gemini × GPT × Claude</div>
      <h2>戦略立案（Claude）</h2>
      <pre>${results.finalOutput}</pre>
      <h2>レビューサマリー</h2>
      <div class="review"><strong>🟡 GPTレビュー</strong><br><pre>${results.gptReview}</pre></div>
      <div class="review"><strong>🔵 Geminiレビュー</strong><br><pre>${results.geminiReview}</pre></div>
      </body></html>`;
    const w = window.open('','_blank');
    w.document.write(html); w.document.close();
    setTimeout(()=>{ w.print(); }, 400);
    toast('印刷ダイアログからPDFとして保存できます');

  } else if (format === 'word') {
    // Word-compatible HTML
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
      <head><meta charset="utf-8"><title>${title}</title>
      <style>/* PDF/print: hardcoded colors intentional */body{font-family:'Meiryo',sans-serif;font-size:11pt;} h1{font-size:16pt;color:#b8882a;} h2{font-size:13pt;}</style></head>
      <body><h1>GOAL AI ディープ分析レポート</h1>
      <p>テーマ：${title}　生成：${new Date().toLocaleString('ja-JP')}</p>
      <h2>戦略立案</h2><p>${results.finalOutput.replace(/\n/g,'</p><p>')}</p>
      <h2>GPTレビュー</h2><p>${results.gptReview.replace(/\n/g,'</p><p>')}</p>
      <h2>Geminiレビュー</h2><p>${results.geminiReview.replace(/\n/g,'</p><p>')}</p>
      </body></html>`;
    const blob = new Blob(['\ufeff'+html],{type:'application/msword'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download=`${safeName}.doc`; a.click();
    toast('Wordファイルをダウンロードしました');

  } else if (format === 'excel') {
    // Simple TSV → Excel
    const rows = [
      ['セクション','内容'],
      ['テーマ', title],
      ['生成日時', new Date().toLocaleString('ja-JP')],
      ['', ''],
      ['戦略立案（Claude）', results.finalOutput.replace(/\n/g,' ')],
      ['GPTレビュー', results.gptReview.replace(/\n/g,' ')],
      ['Geminiレビュー', results.geminiReview.replace(/\n/g,' ')],
    ];
    const tsv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join('\t')).join('\n');
    const blob = new Blob(['\ufeff'+tsv],{type:'text/tab-separated-values;charset=utf-8'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download=`${safeName}.xls`; a.click();
    toast('Excelファイルをダウンロードしました');

  } else if (format === 'pptx') {
    // HTML slideshow → print
    const slides = [
      { title: `${title}`, body: `GOAL AI ディープ分析レポート\n${new Date().toLocaleString('ja-JP')}` },
      { title: '戦略立案（Claude）', body: results.finalOutput.slice(0, 800) },
      { title: 'GPT レビュー', body: results.gptReview.slice(0, 600) },
      { title: 'Gemini レビュー', body: results.geminiReview.slice(0, 600) },
      { title: 'Powered by', body: 'GOAL AI\nGemini × GPT × Claude\nデュアルレビュー完了' },
    ];
    const slideHTML = slides.map((s,i)=>` /* PDF/print: hardcoded colors intentional */
      <div style="width:25.4cm;height:14.3cm;padding:1.5cm 2cm;background:${i===0?'#0c0e14':'#fff'};
        color:${i===0?'#e4b86a':'#222'};border:1px solid #ddd;page-break-after:always;
        display:flex;flex-direction:column;justify-content:center;box-sizing:border-box;">
        <div style="font-size:${i===0?'28':'22'}pt;font-weight:700;margin-bottom:16px;
          color:${i===0?'#e4b86a':'#b8882a'}">${s.title}</div>
        <div style="font-size:12pt;line-height:1.65;white-space:pre-wrap;">${s.body}</div>
        ${i===0?'<div style="margin-top:24px;font-size:10pt;color:#8a8fa8;">Gemini × GPT × Claude + デュアルレビュー</div>':''}
      </div>`).join('');
    const html2 = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <style>@media print{body{margin:0}}</style></head>
      <body style="margin:0;background:#eee;">${slideHTML}</body></html>`;
    const w = window.open('','_blank');
    w.document.write(html2); w.document.close();
    setTimeout(()=>{ w.print(); }, 400);
    toast('印刷ダイアログ → PDFで保存 → パワポとして使用できます');
  }
}

function continueDeepChat(query) {
  const inp = document.getElementById('home-msg-in') || document.getElementById('hub-msg-in');
  if (inp) { inp.value = query + 'について、さらに詳しく教えてください'; inp.focus(); }
}

// Settings panel: Token management
function renderAPIKeySettings() {
  const el = document.getElementById('api-key-settings');
  if (!el) return;
  const remaining = getDeepRemaining();
  const limit = getDeepLimit();
  const used = getDeepUsedCount();

  if (AUTH_TOKEN) {
    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--bg4);border-radius:6px;border:1px solid var(--border-card);">
        <span style="font-size:9.5px;color:var(--muted2);">今月のディープ分析</span>
        <span style="font-size:10px;font-family:var(--fm);color:${remaining<=2?'var(--amber)':'var(--green)'};">${used} / ${limit}回　残り${remaining}回</span>
      </div>`;
  } else {
    el.innerHTML = `
      <div style="padding:10px;background:var(--amber-d);border-radius:8px;border:1px solid var(--mode-normal-border);margin-bottom:10px;">
        <div style="font-size:10px;color:var(--amber);margin-bottom:6px;font-weight:600;">プロモコードで接続</div>
        <div style="display:flex;gap:6px;">
          <input type="text" id="settings-promo-input" placeholder="コードを入力..."
            style="flex:1;background:var(--bg4);border:1px solid var(--border-card);border-radius:6px;padding:7px 10px;font-size:11px;color:var(--cream);outline:none;font-family:var(--fm);">
          <button onclick="applyPromoFromSettings()" style="background:var(--send-btn-grad);color:var(--text-on-accent);border:none;border-radius:6px;padding:7px 14px;font-size:11px;cursor:pointer;font-weight:600;">適用</button>
        </div>
      </div>
      <div style="font-size:9px;color:var(--muted2);">プロモコードを入力するとAI機能が利用可能になります。</div>`;
  }
}

async function applyPromoFromSettings() {
  const input = document.getElementById('settings-promo-input');
  if (!input) return;
  const code = input.value.trim();
  if (!code) return;
  try {
    const result = await redeemPromoCode(code);
    toast(result.desc + ' が適用されました！');
    MEMBERSHIP.plan = result.plan;
    MEMBERSHIP.trialEnd = result.expiresAt;
    renderMembershipUI();
    renderAPIKeySettings();
  } catch (e) {
    toast(e.message || 'エラーが発生しました');
  }
}

// ════════ THEME SYSTEM ════════
const THEMES = {
  dark:  { label:'ダーク',    emoji:'🌙' },
  light: { label:'ライト',   emoji:'☀️' },
  harajuku: { label:'ハラジュク', emoji:'🌈' },
  'bright-glass': { label:'ライトグラス', emoji:'💎' },
  'dark-glass':   { label:'ダークグラス',   emoji:'🔮' },
  'harajuku-glass': { label:'ハラジュクグラス', emoji:'🌸' },
};
let currentTheme = 'dark';
let currentFontSize = 'md';
let currentBaseTheme = 'dark';
let glassMode = false;

function applyTheme(t){
  currentTheme = t;
  document.documentElement.setAttribute('data-theme', t);
  document.cookie = `goal_ai_theme=${t};path=/;max-age=31536000;Secure;SameSite=Lax`;
  // Update active card
  document.querySelectorAll('.theme-card').forEach(c=>{
    c.classList.toggle('active', c.dataset.theme === t);
  });
  // Update sidebar label
  const lbl = document.getElementById('sb-theme-label');
  if(lbl && THEMES[t]) lbl.textContent = `テーマ：${THEMES[t].label}`;
}

function setBaseTheme(base){
  currentBaseTheme = base;
  const themeMap = {'light-glass':'bright-glass','harajuku-glass':'harajuku-glass'};
  const theme = glassMode ? (themeMap[base+'-glass'] || base+'-glass') : base;
  applyTheme(theme);
  document.querySelectorAll('[data-theme-btn]').forEach(btn=>{
    btn.style.borderColor = btn.dataset.themeBtn === base ? 'var(--amber)' : 'var(--border)';
  });
  document.cookie = `goal_ai_basetheme=${base};path=/;max-age=31536000;Secure;SameSite=Lax`;
}

function toggleGlassMode(){
  glassMode = !glassMode;
  const toggle = document.getElementById('glass-toggle');
  const knob = document.getElementById('glass-toggle-knob');
  if(toggle) toggle.style.background = glassMode ? 'var(--amber)' : 'var(--border)';
  if(knob) knob.style.left = glassMode ? '25px' : '3px';
  const themeMap = {'light-glass':'bright-glass','harajuku-glass':'harajuku-glass'};
  const theme = glassMode ? (themeMap[currentBaseTheme+'-glass'] || currentBaseTheme+'-glass') : currentBaseTheme;
  applyTheme(theme);
  document.cookie = `goal_ai_glass=${glassMode};path=/;max-age=31536000;Secure;SameSite=Lax`;
}

function restoreThemeUI(){
  const base = document.cookie.match(/goal_ai_basetheme=([^;]+)/)?.[1] || 'dark';
  const glass = document.cookie.match(/goal_ai_glass=([^;]+)/)?.[1] === 'true';
  currentBaseTheme = base;
  glassMode = glass;
  const toggle = document.getElementById('glass-toggle');
  const knob = document.getElementById('glass-toggle-knob');
  if(toggle) toggle.style.background = glass ? 'var(--amber)' : 'var(--border)';
  if(knob) knob.style.left = glass ? '25px' : '3px';
  document.querySelectorAll('[data-theme-btn]').forEach(btn=>{
    btn.style.borderColor = btn.dataset.themeBtn === base ? 'var(--amber)' : 'var(--border)';
  });
}

// ═══ C-16: AUTO THEME (follow system) ═══
let autoTheme = false;
function applySystemTheme() {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  setBaseTheme(prefersDark ? 'dark' : 'light');
}
function toggleAutoTheme() {
  autoTheme = !autoTheme;
  const toggle = document.getElementById('auto-theme-toggle');
  const knob = document.getElementById('auto-theme-toggle-knob');
  if(toggle) toggle.style.background = autoTheme ? 'var(--amber)' : 'var(--border)';
  if(knob) knob.style.left = autoTheme ? '25px' : '3px';
  document.cookie = `goal_ai_autotheme=${autoTheme};path=/;max-age=31536000;Secure;SameSite=Lax`;
  if(autoTheme) applySystemTheme();
}
function restoreAutoThemeUI() {
  autoTheme = document.cookie.match(/goal_ai_autotheme=([^;]+)/)?.[1] === 'true';
  const toggle = document.getElementById('auto-theme-toggle');
  const knob = document.getElementById('auto-theme-toggle-knob');
  if(toggle) toggle.style.background = autoTheme ? 'var(--amber)' : 'var(--border)';
  if(knob) knob.style.left = autoTheme ? '25px' : '3px';
  if(autoTheme) applySystemTheme();
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if(autoTheme) applySystemTheme();
});

function applyFontSize(sz){
  currentFontSize = sz;
  const sizes = {xs:'14px', sm:'16px', md:'18px', lg:'20px'};
  const px = sizes[sz] || '18px';
  document.documentElement.style.setProperty('--font-size-chat', px);
  document.body.style.fontSize = sz === 'xs' ? '13px' : sz === 'sm' ? '14px' : sz === 'lg' ? '15px' : '14px';
  document.cookie = `goal_ai_fontsize=${sz};path=/;max-age=31536000;Secure;SameSite=Lax`;
  document.querySelectorAll('.size-btn').forEach(b=>b.classList.remove('active'));
  const el = document.getElementById(`sz-${sz}`);
  if(el) el.classList.add('active');
}

function applyLanguage(lang){
  // Stub — future i18n
  toast(lang==='en'?'English mode coming soon！':'日本語モードです');
}

// ════════ SETTINGS PANEL ════════
function openSettingsPanel(){
  const p = document.getElementById('settings-panel');
  p.style.display = 'block';
  applyTheme(currentTheme);
  renderAPIKeySettings();
  restoreLocationToggleUI();
}
function closeSettingsPanel(){
  document.getElementById('settings-panel').style.display = 'none';
}

// ════════ ACCOUNT DELETE (2-step confirmation, #08c) ════════
async function confirmDeleteAccount(){
  if(!confirm('本当にアカウントを削除しますか？\nすべてのゴール・タスク・チャット履歴が完全に消去されます。')) return;
  if(!confirm('この操作は元に戻せません。\n本当に全データを完全に削除してよろしいですか？')) return;
  try {
    const res = await fetch(`${WORKER_URL}/api/account/delete`, { method:'POST', headers:getAuthHeaders() });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error);
    toast('アカウントを削除しました');
    closeSettingsPanel();
    // ローカルデータクリア
    localStorage.clear();
    document.cookie.split(';').forEach(c => { document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'; });
    setTimeout(() => location.reload(), 1500);
  } catch(e) { toast(e.message || 'アカウント削除に失敗しました'); }
}

// ════════ G: チャット背景プリセット ════════
const CHAT_BG_PRESETS = [
  { id:'none', label:'なし', css:'' },
  { id:'dots', label:'ドット', css:'radial-gradient(circle, var(--amber-g) 1px, transparent 1px)' },
  { id:'grid', label:'グリッド', css:'linear-gradient(var(--amber-g) 1px, transparent 1px), linear-gradient(90deg, var(--amber-g) 1px, transparent 1px)' },
  { id:'wave', label:'ウェーブ', css:'repeating-linear-gradient(135deg, transparent, transparent 20px, var(--amber-g) 20px, var(--amber-g) 40px)' },
];
function applyChatBg(id){
  const p = CHAT_BG_PRESETS.find(x=>x.id===id) || CHAT_BG_PRESETS[0];
  const chatWrap = document.getElementById('home-chat-wrap');
  if(chatWrap){
    chatWrap.style.backgroundImage = p.css || 'none';
    if(p.id==='dots') chatWrap.style.backgroundSize = '20px 20px';
    else if(p.id==='grid') chatWrap.style.backgroundSize = '20px 20px';
    else chatWrap.style.backgroundSize = '';
  }
  localStorage.setItem('chat_bg', id);
  document.querySelectorAll('.bg-btn').forEach(b => b.classList.toggle('active', b.dataset.bg===id));
}
function initChatBg(){ const saved = localStorage.getItem('chat_bg'); if(saved) applyChatBg(saved); }

// ════════ VERSION CHECK ════════
(function initVersionCheck(){
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.version')?.addEventListener('click', async () => {
      try {
        const res = await fetch(WORKER_URL + '/api/version');
        const data = await res.json();
        if (data.version !== APP_VERSION) {
          if (confirm('新しいバージョン v' + data.version + ' があります。更新しますか？')) {
            location.reload(true);
          }
        } else {
          toast('最新バージョンです (v' + APP_VERSION + ')');
        }
      } catch(e) { toast('バージョン確認に失敗しました'); }
    });
  });
})();

// ════════ HELP GUIDE ════════
const _hGold = 'url(#helpGoldG)';
const _hSvg = (p) => `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${_hGold}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const HELP_SLIDES = [
  { title: '何でも聞いてみよう', icon: _hSvg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'), body: 'ホーム画面のチャットで何でも質問できます。天気、翻訳、アイデア出し — 最適なAIが自動で答えます。' },
  { title: 'ゴールを設定しよう', icon: _hSvg('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'), body: '「ゴールハブ」で目標を設定すると、AIがあなた専用のコーチになります。タスク管理・進捗追跡もお任せ。' },
  { title: '自分を知ろう', icon: _hSvg('<path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 16.4 5.7 21l2.3-7L2 9.4h7.6z"/>'), body: '「私をデザイン」であなたの強み・価値観を教えると、AIがもっと的確なアドバイスをしてくれます。' }
];

function showHelpGuide() {
  let current = 0;
  function render() {
    const slide = HELP_SLIDES[current];
    const isLast = current === HELP_SLIDES.length - 1;
    const existing = document.getElementById('help-guide-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'help-guide-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `<svg style="position:absolute;width:0;height:0;"><defs><linearGradient id="helpGoldG" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#c8920a"/><stop offset="100%" stop-color="#f5d380"/></linearGradient></defs></svg><div class="modal-content" style="max-width:400px;padding:32px;text-align:center;">
      <div style="margin-bottom:12px;">${slide.icon}</div>
      <h3 style="font-size:1.2rem;font-weight:700;color:var(--cream);margin-bottom:8px;">${slide.title}</h3>
      <p style="font-size:0.9rem;color:var(--muted);line-height:1.6;margin-bottom:16px;">${slide.body}</p>
      <div style="display:flex;justify-content:center;gap:8px;margin-bottom:16px;">
        ${HELP_SLIDES.map((_,i) => `<span style="width:8px;height:8px;border-radius:50%;background:${i===current?'var(--amber)':'var(--muted2)'};"></span>`).join('')}
      </div>
      <div style="display:flex;gap:8px;justify-content:center;">
        ${current > 0 ? `<button onclick="document.getElementById('help-guide-modal').remove();showHelpSlide(${current-1})" style="padding:8px 20px;background:var(--bg3);color:var(--cream);border:1px solid var(--border);border-radius:8px;cursor:pointer;">← 戻る</button>` : ''}
        <button onclick="document.getElementById('help-guide-modal').remove();${isLast ? '' : `showHelpSlide(${current+1})`}" style="padding:8px 20px;background:var(--send-btn-grad);color:var(--text-on-accent);border:none;border-radius:8px;cursor:pointer;font-weight:600;">${isLast ? '始める！' : '次へ →'}</button>
      </div>
    </div>`;
    modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
    document.body.appendChild(modal);
  }
  render();
  window.showHelpSlide = function(idx) { current = idx; render(); };
}

// ════════ ARCHIVE VIEW ════════
function openArchiveView(){
  renderArchiveList();
  document.getElementById('modal-archive').style.display = 'flex';
}
function closeArchiveView(){
  document.getElementById('modal-archive').style.display = 'none';
}

function renderArchiveList(){
  const el = document.getElementById('archive-list');
  const archived = ALL_GOALS.filter(g=>g.archived);
  const count = document.getElementById('sb-archive-count');
  if(count){
    if(archived.length > 0){ count.style.display='inline'; count.textContent=archived.length; }
    else count.style.display='none';
  }
  if(!archived.length){
    el.innerHTML='<div style="text-align:center;padding:30px 0;color:var(--muted2);font-size:12px;">アーカイブ済みのゴールはありません</div>';
    return;
  }
  el.innerHTML = archived.map((g,i)=>{
    const isDone = g.archiveReason==='done';
    const daysAgo = g.archivedAt ? Math.floor((Date.now()-new Date(g.archivedAt))/86400000) : null;
    return `<div class="archive-card" onclick="openArchivedGoalDetail('${g.id}')">
      <div class="ac-badge" style="background:${isDone?'var(--amber-d)':'var(--bg4)'};color:${isDone?'var(--amber)':'var(--muted2)'};">
        ${isDone?`<svg width=12 height=12><use href='#ic-award'/></svg> 達成済み`:`<svg width=12 height=12><use href='#ic-archive'/></svg> アーカイブ`}
      </div>
      <div style="font-size:13px;font-weight:500;color:var(--cream);margin-bottom:6px;">${escapeHtml(g.title || '')}</div>
      <div style="display:flex;gap:12px;font-size:10px;color:var(--muted);">
        <span>最終進捗 ${g.actual}%</span>
        <span>目標期限 ${escapeHtml(g.deadline || '')}</span>
        ${daysAgo!==null?`<span>${daysAgo}日前にアーカイブ</span>`:''}
      </div>
      <div style="margin-top:10px;display:flex;gap:7px;">
        <button onclick="event.stopPropagation();restoreGoal('${g.id}')" style="padding:5px 12px;background:var(--amber-g);border:1px solid var(--mode-normal-border);border-radius:6px;font-size:10.5px;color:var(--amber);cursor:pointer;"><svg width="13" height="13" class="svg-ic"><use href="#ic-restore"/></svg> 復元する</button>
        <button onclick="event.stopPropagation();openArchivedGoalDetail('${g.id}')" style="padding:5px 12px;background:var(--bg3);border:1px solid var(--border2);border-radius:6px;font-size:10.5px;color:var(--muted);cursor:pointer;"><svg width="13" height="13" class="svg-ic"><use href="#ic-memo"/></svg> 詳細を見る</button>
      </div>
    </div>`;
  }).join('');
}

function openArchivedGoalDetail(id){
  const g = ALL_GOALS.find(x=>x.id===id);
  if(!g) return;
  // Open goal hub in read-only mode
  closeArchiveView();
  const idx = ALL_GOALS.indexOf(g);
  openGoalHub(idx);
}

function restoreGoal(id){
  const g = ALL_GOALS.find(x=>x.id===id);
  if(!g) return;
  g.archived = false; g.archiveReason = null; g.archivedAt = null;
  // Supabaseに同期
  if (g.supabaseId) {
    apiUpdateGoal(g.supabaseId, { status: 'active' });
  }
  renderSidebarGoals();
  renderArchiveList();
  toast(`「${g.title}」をアクティブゴールに復元しました`);
}

// ─ Export data ─
async function exportData(){
  if(!AUTH_TOKEN){ toast('ログインが必要です'); return; }
  toast('データをエクスポート中…');
  try {
    const res = await fetch(`${WORKER_URL}/api/account/export`, { headers: getAuthHeaders() });
    if(!res.ok) throw new Error('エクスポート失敗');
    const blob = await res.blob();
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `goalai_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(a.href);
    toast('エクスポート完了');
  } catch(e) {
    // フォールバック: ローカルデータ
    const data = { goals: ALL_GOALS, profile: USER_PROFILE, membership: MEMBERSHIP, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download=`goalai_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(a.href);
  }
}

// ─ Close overlay clicks ─
document.addEventListener('click', e=>{
  if(e.target.id==='modal-archive') closeArchiveView();
});


const PROMO_CODES = {
  'LAUNCH30':  {plan:'pro', days:30,  desc:'Pro 30日間無料（ローンチ記念）'},
  'INVITE2026':{plan:'pro', days:14,  desc:'Pro 14日間無料（招待コード）'},
  'BETA3MONTH':{plan:'pro', days:90,  desc:'Pro 90日間無料（ベータ感謝）'},
  'GOALPRO7':  {plan:'pro', days:7,   desc:'Pro 7日間無料体験'},
};

// Membership state is defined in globals.js

function getMembershipLabel(){
  if(MEMBERSHIP.trialEnd && new Date() < new Date(MEMBERSHIP.trialEnd)){
    const days = Math.ceil((new Date(MEMBERSHIP.trialEnd)-new Date())/86400000);
    return {badge:'trial', text:'無料体験中', sub:`残 ${days}日`};
  }
  if(MEMBERSHIP.plan==='ultra') return {badge:'ultra', text:'Ultra', sub:null};
  if(MEMBERSHIP.plan==='max') return {badge:'max', text:'Max', sub:null};
  if(MEMBERSHIP.plan==='pro') return {badge:'pro', text:'Pro', sub:null};
  if(MEMBERSHIP.plan==='light') return {badge:'light', text:'Light', sub:null};
  return {badge:'free', text:'Free', sub:'アップグレード'};
}

function renderMembershipUI(){
  const lbl = getMembershipLabel();
  const badge = document.getElementById('sb-plan-badge');
  const trialEl = document.getElementById('sb-trial-days');
  const nudge = document.getElementById('sb-upgrade-nudge');
  const nudgeSub = document.getElementById('sb-nudge-sub');

  if(badge){
    badge.className = `plan-badge-${lbl.badge}`;
    badge.textContent = (['light','pro','max','ultra'].includes(lbl.badge))?'▲ '+lbl.text:lbl.text;
  }
  if(trialEl){
    if(lbl.sub && lbl.badge==='trial'){
      trialEl.style.display='inline'; trialEl.textContent=lbl.sub;
    } else {
      trialEl.style.display='none';
    }
  }
  if(nudge){
    const nudgeLabel = nudge.querySelector('div:first-child');
    if(MEMBERSHIP.plan==='free'){
      nudge.style.display='block';
      if(nudgeLabel) nudgeLabel.innerHTML='<svg width="13" height="13" class="svg-ic"><use href="#ic-zap"/></svg> Proで全機能を解放';
      if(nudgeSub) nudgeSub.textContent='GPT-5 + Opus 4.6が使える';
    } else if(lbl.badge==='trial'){
      nudge.style.display='block';
      if(nudgeSub) nudgeSub.textContent = lbl.sub+' · このまま続けるにはProへ';
    } else if(MEMBERSHIP.plan==='light'){
      nudge.style.display='block';
      if(nudgeLabel) nudgeLabel.innerHTML='<svg width="13" height="13" class="svg-ic"><use href="#ic-zap"/></svg> Proで全機能を解放';
      if(nudgeSub) nudgeSub.textContent='GPT-5 + Opus 4.6が使える';
    } else if(MEMBERSHIP.plan==='pro'){
      nudge.style.display='block';
      if(nudgeLabel) nudgeLabel.innerHTML='<svg width="13" height="13" class="svg-ic"><use href="#ic-zap"/></svg> Maxで更に強力なAIを解放';
      if(nudgeSub) nudgeSub.textContent='Opus 4.6 + 2.5 Pro';
    } else {
      nudge.style.display='none';
    }
  }

  // Free残り回数バー (#3)
  renderFreeUsageBar();

  // Update logo plan badge
  const logoPlan = document.getElementById('sb-logo-plan');
  if(logoPlan){
    if(MEMBERSHIP.plan && MEMBERSHIP.plan !== 'free'){
      logoPlan.style.display = 'inline';
      logoPlan.textContent = lbl.text;
    } else {
      logoPlan.style.display = 'none';
    }
  }

  // Update sb-prof-name and avatar from USER_PROFILE
  const nameEl = document.getElementById('sb-prof-name');
  if(nameEl) nameEl.textContent = USER_PROFILE.nickname || USER_PROFILE.name;
  const avEl = document.getElementById('sb-avatar');
  const avName = USER_PROFILE.nickname || USER_PROFILE.name || '';
  if(avEl) avEl.textContent = avName ? avName.charAt(0) : '?';

  // Referral card — show only for paid users
  const refCard = document.getElementById('referral-card');
  if(refCard){
    const isPaidPlan = ['light','pro','max','ultra'].includes(MEMBERSHIP.plan);
    refCard.style.display = isPaidPlan ? 'block' : 'none';
    if(isPaidPlan && AUTH_TOKEN){
      const refCodeEl = document.getElementById('referral-code');
      if(refCodeEl && !refCodeEl.textContent) refCodeEl.textContent = 'REF-' + AUTH_TOKEN.slice(-8).toUpperCase();
    }
  }
}

function copyReferralCode(){
  const code = document.getElementById('referral-code')?.textContent;
  if(code) navigator.clipboard?.writeText(code).then(()=>toast('紹介コードをコピーしました'));
}

function openPlanModal(){
  fetchPlanStatus().then(() => { renderPlanModal(); });
  renderPlanModal();
  document.getElementById('modal-plan').style.display='flex';
}
function closePlanModal(){
  document.getElementById('modal-plan').style.display='none';
}

function renderPlanModal(){
  const lbl = getMembershipLabel();
  const cur = document.getElementById('plan-current-badge');
  if(cur){
    if(lbl.badge==='trial'){
      cur.style.cssText='background:var(--green-d);border:1px solid var(--green-d);color:var(--green);display:inline-flex;align-items:center;gap:7px;padding:6px 14px;border-radius:8px;font-size:11px;';
      cur.innerHTML=`✓ 無料体験中 <span style="opacity:.7">${document.getElementById('sb-trial-days')?.textContent||''}</span>`;
    } else if(lbl.badge==='ultra'){
      cur.style.cssText='background:linear-gradient(135deg,var(--amber-d),var(--know-purple-border));border:1px solid var(--amber);color:var(--amber);display:inline-flex;align-items:center;gap:7px;padding:6px 14px;border-radius:8px;font-size:11px;font-weight:700;';
      cur.innerHTML=`👑 現在のプラン：Ultra`;
    } else if(lbl.badge==='max'){
      cur.style.cssText='background:linear-gradient(90deg,var(--amber-d),var(--amber-g));border:1px solid var(--amber);color:var(--amber);display:inline-flex;align-items:center;gap:7px;padding:6px 14px;border-radius:8px;font-size:11px;font-weight:600;';
      cur.innerHTML=`👑 現在のプラン：Max`;
    } else if(lbl.badge==='pro'){
      cur.style.cssText='background:var(--amber-g);border:1px solid var(--amber-d);color:var(--amber);display:inline-flex;align-items:center;gap:7px;padding:6px 14px;border-radius:8px;font-size:11px;';
      cur.innerHTML=`★ 現在のプラン：${lbl.text}`;
    } else {
      cur.style.cssText='background:var(--bg3);border:1px solid var(--border2);color:var(--muted);display:inline-flex;align-items:center;gap:7px;padding:6px 14px;border-radius:8px;font-size:11px;';
      cur.innerHTML='現在のプラン：Free（無料）';
    }
  }
  // Highlight selected + downgrade buttons (L: E-13)
  const tiers = ['free','light','pro','max','ultra'];
  const curIdx = tiers.indexOf(MEMBERSHIP.plan);
  ['free','light','pro','max','ultra'].forEach(p=>{
    const el=document.getElementById(`pc-${p}`);
    if(el){
      el.style.outline = (p===MEMBERSHIP.plan||p===MEMBERSHIP.selectedPlan)?'2px solid var(--amber)':'none';
      // Remove existing downgrade link if any
      const existing = el.querySelector('.plan-downgrade-link');
      if(existing) existing.remove();
      // Add downgrade link for plans below current
      const pIdx = tiers.indexOf(p);
      if(curIdx > 0 && pIdx < curIdx && p !== 'free') {
        const link = document.createElement('div');
        link.className = 'plan-downgrade-link';
        link.style.cssText = 'margin-top:8px;text-align:right;';
        link.innerHTML = `<span onclick="event.stopPropagation();openCustomerPortal();" style="font-size:10px;color:var(--muted);cursor:pointer;text-decoration:underline;text-underline-offset:2px;">ダウングレード</span>`;
        el.appendChild(link);
      }
      // Show "現在のプラン" badge on current plan card
      const existingBadge = el.querySelector('.plan-current-inline');
      if(existingBadge) existingBadge.remove();
      if(p === MEMBERSHIP.plan) {
        const badge = document.createElement('div');
        badge.className = 'plan-current-inline';
        badge.style.cssText = 'margin-top:8px;text-align:right;font-size:9px;color:var(--amber);font-family:var(--fm);';
        badge.textContent = '✓ 現在のプラン';
        el.appendChild(badge);
      }
    }
  });
  updatePlanCTA();
  // 利用額バー表示
  renderUsageBar();
  // 課金済みユーザーにはポータルリンクを表示
  const portalWrap = document.getElementById('plan-portal-wrap');
  if(portalWrap){
    const isPaid = ['light','pro','max','ultra'].includes(MEMBERSHIP.plan);
    portalWrap.style.display = isPaid ? 'block' : 'none';
  }
}

function selectPlan(p){
  MEMBERSHIP.selectedPlan = p;
  ['free','light','pro','max','ultra'].forEach(id=>{
    const el=document.getElementById(`pc-${id}`);
    if(el) el.style.outline = id===p?'2px solid var(--amber)':'none';
  });
  updatePlanCTA();
  updatePlanDots(p);
}
function updatePlanDots(p){
  const plans=['free','light','pro','max','ultra'];
  const idx=plans.indexOf(p);
  const dots=document.querySelectorAll('#plan-dots .plan-dot');
  dots.forEach((d,i)=>{
    if(i===idx){d.style.width='16px';d.style.borderRadius='3px';d.style.background='var(--amber)';}
    else{d.style.width='6px';d.style.borderRadius='50%';d.style.background='rgba(255,255,255,0.15)';}
  });
}
// Scroll-based dot update
(function(){
  const el=document.getElementById('plan-cards');
  if(!el)return;
  el.addEventListener('scroll',()=>{
    const cards=el.querySelectorAll('.plan-card');
    const scrollLeft=el.scrollLeft;
    const cardWidth=cards[0]?.offsetWidth||280;
    const idx=Math.round(scrollLeft/(cardWidth+12));
    const plans=['free','light','pro','max','ultra'];
    if(plans[idx]) updatePlanDots(plans[idx]);
  },{passive:true});
})();

function updatePlanCTA(){
  const btn = document.getElementById('plan-cta-btn');
  if(!btn) return;
  const p = MEMBERSHIP.selectedPlan;
  const cur = MEMBERSHIP.plan;
  const tiers = ['free','light','pro','max','ultra'];
  const curIdx = tiers.indexOf(cur);
  const selIdx = tiers.indexOf(p);
  const isDowngrade = curIdx > 0 && selIdx < curIdx;
  const isCurrent = p === cur;

  if(isCurrent){
    btn.textContent='現在のプラン';
    btn.style.background='var(--bg3)'; btn.style.color='var(--muted)'; btn.style.border='1px solid var(--border2)';
    btn.onclick = null;
  } else if(isDowngrade){
    btn.textContent= p === 'free' ? 'Freeプランに戻す' : `${p.charAt(0).toUpperCase()+p.slice(1)}にダウングレード`;
    btn.style.background='var(--bg3)'; btn.style.color='var(--muted)'; btn.style.border='1px solid var(--border2)';
    btn.onclick = () => { openCustomerPortal(); };
  } else if(p==='free'){
    btn.textContent='Freeプランに戻す';
    btn.style.background='var(--bg3)'; btn.style.color='var(--muted)'; btn.style.border='1px solid var(--border2)';
    btn.onclick = () => { subscribePlan(); };
  } else if(p==='ultra'){
    btn.textContent='Ultraプランを始める';
    btn.style.background='linear-gradient(135deg,var(--amber),var(--purple))'; btn.style.color='var(--text-on-accent)'; btn.style.border='none';
    btn.onclick = () => { subscribePlan(); };
  } else {
    const names = { light:'Light', pro:'Pro', max:'Max' };
    const label = MEMBERSHIP.promoApplied && p==='pro' ? 'プロモコードでProを開始' : `${names[p]||p}プランを始める`;
    btn.textContent=label;
    btn.style.background='var(--amber)'; btn.style.color='var(--bg)'; btn.style.border='none';
    btn.onclick = () => { subscribePlan(); };
  }
}

let planBilling = 'monthly'; // 'monthly' | 'annual'

function toggleBillingPeriod(){
  const sw = document.getElementById('billing-switch');
  const knob = document.getElementById('billing-knob');
  const mLabel = document.getElementById('billing-monthly-label');
  const aLabel = document.getElementById('billing-annual-label');

  if(sw.checked){
    planBilling = 'annual';
    knob.style.transform = 'translateX(22px)';
    mLabel.style.color = 'var(--muted)'; mLabel.style.fontWeight = '400';
    aLabel.style.color = 'var(--cream)'; aLabel.style.fontWeight = '500';
  } else {
    planBilling = 'monthly';
    knob.style.transform = 'translateX(0)';
    mLabel.style.color = 'var(--cream)'; mLabel.style.fontWeight = '500';
    aLabel.style.color = 'var(--muted)'; aLabel.style.fontWeight = '400';
  }
  updatePlanPrices();
}

function updatePlanPrices(){
  const prices = {
    light: { monthly: '¥500〜980', annual: '¥6,000', annualMonthly: '¥500/月', sub: '¥8/ターン · 上限¥980' },
    pro: { monthly: '¥1,500〜2,980', annual: '¥18,000', annualMonthly: '¥1,500/月', sub: '¥20/ターン · 上限¥2,980' },
    max: { monthly: '¥1,500〜9,800', annual: '¥18,000', annualMonthly: '¥1,500/月', sub: '¥10/ターン · 上限¥9,800' },
    ultra: { monthly: '¥20,000', annual: '¥200,000', annualMonthly: '¥16,666/月', sub: '使い放題' },
  };
  ['light','pro','max','ultra'].forEach(plan => {
    const priceEl = document.getElementById('plan-price-' + plan);
    if(!priceEl) return;
    if(planBilling === 'annual'){
      priceEl.innerHTML = `<div style="font-size:20px;font-family:var(--fd);color:var(--amber);">${prices[plan].annual}</div><div style="font-size:9px;color:var(--muted2);">/年（${prices[plan].annualMonthly}）</div>`;
    } else {
      priceEl.innerHTML = `<div style="font-size:20px;font-family:var(--fd);color:var(--amber);">${prices[plan].monthly}</div><div style="font-size:9px;color:var(--muted2);">/月（税込）</div>`;
    }
  });
}

async function applyPromoCode(){
  const code = document.getElementById('promo-code-in')?.value.trim().toUpperCase();
  if(!code){ toast('コードを入力してください'); return; }
  const promo = PROMO_CODES[code];
  if(!promo){ toast('無効なコードです。ご確認ください。'); return; }

  // Worker側でトークン発行
  try {
    const result = await redeemPromoCode(code);
    MEMBERSHIP.plan = result.plan || promo.plan;
    MEMBERSHIP.trialEnd = result.expiresAt;
    MEMBERSHIP.promoApplied = code;
  } catch(e) {
    // 既に適用済みの場合でもローカル状態は更新
    const trialEnd = new Date(); trialEnd.setDate(trialEnd.getDate()+promo.days);
    MEMBERSHIP.plan = promo.plan;
    MEMBERSHIP.trialEnd = trialEnd.toISOString();
    MEMBERSHIP.promoApplied = code;
  }

  // Show success banner
  const banner = document.getElementById('promo-applied-banner');
  const bannerText = document.getElementById('promo-applied-text');
  const inputRow = document.getElementById('promo-input-row');
  if(banner){ banner.style.display='block'; }
  if(bannerText) bannerText.textContent=`✓ ${promo.desc}`;
  if(inputRow) inputRow.style.display='none';

  // Update CTA
  const btn = document.getElementById('plan-cta-btn');
  if(btn){
    btn.textContent=`このコードで ${promo.days}日間 Proを開始`;
    btn.style.background='var(--green)';
  }
  const sub = document.querySelector('#plan-cta-wrap + div');
  renderMembershipUI();
  renderAPIKeySettings();
}

async function subscribePlan(){
  const p = MEMBERSHIP.selectedPlan;
  if(p==='free'){
    MEMBERSHIP.plan='free'; MEMBERSHIP.trialEnd=null;
    closePlanModal(); renderMembershipUI();
    toast('Freeプランに変更しました');
    return;
  }

  // プロモコードが適用済みの場合はそのまま開始（既にWorker側でトークン発行済み）
  if(MEMBERSHIP.promoApplied && MEMBERSHIP.trialEnd){
    closePlanModal(); renderMembershipUI();
    toast(`プロモコードで${p==='annual'?'年間':'Pro'}プランが有効です`);
    return;
  }

  // 2ステップ確認（BD: project_v6_4 §8）
  const names = {light:'Light',pro:'Pro',max:'Max',ultra:'Ultra'};
  const priceLabel = planBilling==='annual' ? '年額プラン' : '月額プラン';
  const confirmed = await new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:1100;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:24px;max-width:320px;width:90%;text-align:center;">
      <div style="font-size:14px;font-weight:600;color:var(--cream);margin-bottom:12px;">${names[p]||p}プラン（${priceLabel}）に変更しますか？</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:16px;line-height:1.6;">決済ページに移動します。<br>いつでもキャンセル可能です。</div>
      <div style="display:flex;gap:8px;justify-content:center;">
        <button id="plan-confirm-no" style="padding:8px 20px;background:var(--bg3);color:var(--cream);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px;">キャンセル</button>
        <button id="plan-confirm-yes" style="padding:8px 20px;background:var(--amber);color:var(--bg);border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;">決済に進む</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#plan-confirm-yes').onclick = ()=>{ overlay.remove(); resolve(true); };
    overlay.querySelector('#plan-confirm-no').onclick = ()=>{ overlay.remove(); resolve(false); };
    overlay.onclick = (e)=>{ if(e.target===overlay){ overlay.remove(); resolve(false); } };
  });
  if(!confirmed) return;

  // Stripe Checkoutへリダイレクト
  if(!AUTH_TOKEN){ toast('先にトークンを設定してください'); return; }
  const btn = document.getElementById('plan-cta-btn');
  if(btn){ btn.textContent='決済ページへ移動中…'; btn.disabled=true; }
  try {
    const res = await fetch(`${WORKER_URL}/api/checkout/create`, {
      method:'POST', headers:getAuthHeaders(),
      body: JSON.stringify({ plan: p, billing_period: planBilling })
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'Checkout作成に失敗');
    window.location.href = data.url;
  } catch(e) {
    toast(e.message || '決済の開始に失敗しました');
    if(btn){ btn.textContent='再試行'; btn.disabled=false; }
  }
}

async function openCustomerPortal(){
  if(!AUTH_TOKEN){ toast('先にトークンを設定してください'); return; }
  try {
    const res = await fetch(`${WORKER_URL}/api/checkout/portal`, {
      method:'POST', headers:getAuthHeaders(),
      body: JSON.stringify({})
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'ポータルの作成に失敗');
    window.location.href = data.url;
  } catch(e) {
    toast(e.message || 'サブスクリプション管理を開けませんでした');
  }
}

// ═══════ 利用額バー（Step 7） ═══════
let _planStatusCache = null;
async function fetchPlanStatus(){
  if(!AUTH_TOKEN) return null;
  try {
    const res = await fetch(`${WORKER_URL}/api/plan/status`, { headers: getAuthHeaders() });
    if(!res.ok) return null;
    _planStatusCache = await res.json();
    return _planStatusCache;
  } catch { return null; }
}

function renderFreeUsageBar(){
  if(MEMBERSHIP.plan !== 'free') { const el=document.getElementById('sb-free-usage'); if(el) el.style.display='none'; return; }
  const nudge = document.getElementById('sb-upgrade-nudge');
  if(!nudge) return;
  let bar = document.getElementById('sb-free-usage');
  if(!bar){ bar=document.createElement('div'); bar.id='sb-free-usage'; bar.style.cssText='padding:4px 16px 8px;'; nudge.after(bar); }
  const limit = 20;
  // KV日次使用量はWorker側管理のため、フロント側ではセッション内カウントで近似表示
  const used = window._homeMsgCount || 0;
  const remaining = Math.max(0, limit - used);
  const pct = Math.round(used / limit * 100);
  bar.style.display = 'block';
  bar.innerHTML = `<div style="display:flex;justify-content:space-between;font-size:9px;color:var(--muted2);margin-bottom:3px;"><span>今日の残り</span><span>${remaining}/${limit}回</span></div><div style="height:3px;background:var(--bg3);border-radius:2px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:${pct>=90?'var(--red)':pct>=70?'var(--amber)':'var(--green)'};border-radius:2px;transition:width .3s;"></div></div>`;
}

function renderUsageBar(){
  const container = document.getElementById('plan-usage-bar');
  if(!container) return;
  const d = _planStatusCache;
  if(!d || d.plan === 'free' || d.cap === 0){
    container.style.display='none'; return;
  }
  container.style.display='block';
  const pct = Math.min(d.percent || 0, 100);
  const barColor = pct >= 100 ? 'var(--red)' : pct >= 80 ? '#e8a040' : 'var(--amber)';
  container.innerHTML = `
    <div style="font-size:10px;color:var(--muted);margin-bottom:6px;display:flex;justify-content:space-between;">
      <span>今月の利用額</span>
      <span style="color:${pct>=100?'var(--red)':'var(--cream)'};font-family:var(--fm);">¥${(d.current_amount||0).toLocaleString()} / ¥${(d.cap||0).toLocaleString()}</span>
    </div>
    <div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden;">
      <div style="height:100%;width:${pct}%;background:${barColor};border-radius:3px;transition:width .4s;"></div>
    </div>
    ${pct>=100?'<div style="font-size:9px;color:var(--red);margin-top:4px;">上限到達 · モデルが自動降格されています</div>':''}
    <div style="font-size:9px;color:var(--muted2);margin-top:2px;">${d.turns_used||0}ターン使用 · ¥${d.per_turn}/ターン</div>
  `;
}

// ═══════ 降格バッジ（Step 7） ═══════
function showDegradeBadge(reason){
  let existing = document.getElementById('degrade-badge');
  if(!existing){
    existing = document.createElement('div');
    existing.id = 'degrade-badge';
    existing.style.cssText = 'padding:6px 12px;background:var(--red-d);border:1px solid var(--red-d);border-radius:8px;font-size:11px;color:var(--red);text-align:center;margin:4px 12px;';
    const toolbar = document.getElementById('home-chat-toolbar');
    if(toolbar) toolbar.after(existing);
  }
  const reasonText = reason === 'cap' ? '利用上限到達' : reason === 'fair_use_5h' ? '短時間集中利用' : reason === 'fair_use_weekly' ? '週間上限接近' : '利用制限';
  existing.textContent = `⚠ ${reasonText}のため、軽量モデルで応答しています`;
  existing.style.display = 'block';
}
function hideDegradeBadge(){
  const el = document.getElementById('degrade-badge');
  if(el) el.style.display = 'none';
}

// ════════ D-2: LOGO TAP → HOME ════════
document.querySelector('.sb-logo')?.addEventListener('click', () => {
  goHomeNewChat();
});
if (document.querySelector('.sb-logo')) {
  document.querySelector('.sb-logo').style.cursor = 'pointer';
}

// ════════ D-9: SIDEBAR EMPTY AREA TAP → HOME ════════
document.getElementById('sb')?.addEventListener('click', (e) => {
  if (e.target.closest('a, button, .nav-item, .mode-box, .goal-card, .upgrade-box, .sb-logo, .prof-row, .btn-add-goal, select, input, .upgrade-nudge, .nav-section, .mode-selector, .sb-bottom')) return;
  closeSidebar();
  showPage('home');
});

// ════════ AI理解メモ表示 ════════
async function showAIMemo(type, goalId) {
  let memo = '';
  if (type === 'goal') {
    const goal = ALL_GOALS.find(g => String(g.id) === String(goalId));
    memo = goal?.ai_memo || '';
  } else {
    memo = USER_PROFILE.ai_memo || '';
  }

  if (!memo) {
    toast('AI理解メモはまだ作成されていません');
    // Generate it
    try {
      const res = await apiCall('/api/ai-memo/generate', 'POST', { type, goal_id: goalId, trigger: 'manual' });
      if (res?.memo) {
        memo = res.memo;
        if (type === 'goal') {
          const goal = ALL_GOALS.find(g => String(g.id) === String(goalId));
          if (goal) goal.ai_memo = memo;
        } else {
          USER_PROFILE.ai_memo = memo;
        }
      } else { return; }
    } catch(e) { return; }
  }

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `<div class="modal-content" style="max-width:500px;padding:24px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h3 style="color:var(--cream);margin:0;">📋 AIの理解メモ</h3>
      <button onclick="this.closest('.modal-overlay').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px;">×</button>
    </div>
    <div style="font-size:13px;color:var(--cream);line-height:1.7;white-space:pre-wrap;">${escapeHtml(memo)}</div>
    <p style="font-size:11px;color:var(--muted);margin-top:12px;line-height:1.5;">内容が違うと感じたら、チャットで「もっと厳しくして」「私の強みは〇〇」など伝えてください。</p>
    <div style="display:flex;justify-content:flex-end;margin-top:12px;">
      <button onclick="this.closest('.modal-overlay').remove()" style="padding:8px 16px;background:var(--bg3);color:var(--cream);border:1px solid var(--border);border-radius:8px;cursor:pointer;">閉じる</button>
    </div>
  </div>`;
  modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
  document.body.appendChild(modal);
}

// ════════ MODE PILLS & POPUP ════════
const MODE_DESCRIPTIONS = {
  mencare: { name: 'メンケアモード', description: '寄り添い型のメンタルケアパートナー。共感を第一に、あなたの気持ちを受け止めます。' },
  kabeuchi: { name: 'ソクラテスモード', description: '答えを出さず思考を引き出すソクラテス式。質問だけで考えを深めます。' },
  spartan: { name: 'スパルタモード', description: '丁寧だけど辛口。甘さゼロで言い訳の妥当性もチェック。無駄なフォローなしで、率直に問題点と改善点だけを伝えます。' }
};

function handleModeClick(mode) {
  const currentMode = spartanMode ? 'spartan' : mencareMode ? 'mencare' : kabeuchiMode ? 'kabeuchi' : 'normal';
  if(mode === 'normal'){ selectMode('normal'); updateModePills(); return; }
  const info = MODE_DESCRIPTIONS[mode];
  const isActive = currentMode === mode;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = '<div class="modal-content" style="max-width:340px;padding:24px;text-align:center;">' +
    '<h3 style="color:var(--cream);margin-bottom:8px;">' + info.name + (isActive ? ' (ON)' : '') + '</h3>' +
    '<p style="color:var(--muted);font-size:0.85rem;line-height:1.6;margin-bottom:16px;">' + (isActive ? '通常モードに戻しますか？' : info.description) + '</p>' +
    '<div style="display:flex;gap:8px;justify-content:center;">' +
      '<button id="_mode-confirm-btn" style="padding:8px 16px;background:var(--send-btn-grad);color:var(--text-on-accent);border:none;border-radius:8px;cursor:pointer;font-weight:600;">' + (isActive ? '停止する' : '設定する') + '</button>' +
      '<button onclick="this.closest(\'.modal-overlay\').remove()" style="padding:8px 16px;background:var(--bg3);color:var(--cream);border:1px solid var(--border);border-radius:8px;cursor:pointer;">キャンセル</button>' +
    '</div>' +
  '</div>';
  modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
  const confirmBtn = modal.querySelector('#_mode-confirm-btn');
  confirmBtn.addEventListener('click', function() {
    if (isActive) {
      selectMode('normal');
    } else {
      selectMode(mode);
    }
    updateModePills();
    modal.remove();
  });
  document.body.appendChild(modal);
}

function updateModePills() {
  const current = spartanMode ? 'spartan' : mencareMode ? 'mencare' : kabeuchiMode ? 'kabeuchi' : 'normal';
  document.querySelectorAll('.mode-pill,.mode-box-v2,.mode-e,.mode-f,.mode-chip').forEach(function(p) {
    const isActive = p.dataset.mode === current;
    p.classList.toggle('active', isActive);
    p.classList.toggle('on', isActive);
  });
}

// ════════ SIDEBAR TASK LIST ════════
function updateSidebarTaskList() {
  const container = document.getElementById('sb-task-list');
  if (!container) return;
  // Get pending tasks from ALL_GOALS
  const tasks = [];
  ALL_GOALS.forEach(function(g, gi) {
    if (!g.phases) return;
    g.phases.forEach(function(phase) {
      if (!phase.tasks) return;
      phase.tasks.forEach(function(task) {
        if (!task.done) tasks.push({ title: task.title, deadline: task.deadline, priority: task.priority, goalTitle: g.title, goalIdx: gi });
      });
    });
  });
  // Sort by deadline (nearest first), limit 5
  tasks.sort(function(a, b) {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.localeCompare(b.deadline);
  });
  var top5 = tasks.slice(0, 5);
  if (top5.length === 0) {
    container.innerHTML = '<div class="sb-task-empty">タスクなし</div>';
    return;
  }
  container.innerHTML = top5.map(function(t) {
    var dot = t.priority === 'high' ? '🔴' : t.priority === 'low' ? '🟢' : '🟡';
    var dl = t.deadline ? t.deadline.slice(5) : '';
    return '<div class="sb-task-item"><span class="sb-task-name">' + escapeHtml((t.title || '').slice(0, 20)) + '</span><span class="sb-task-meta">' + dot + ' ' + dl + '</span></div>';
  }).join('') + '<div class="sb-task-more" onclick="showPage(\'tasks\')">全タスク →</div>';
}

// ════════ UX-001: 初期タスク段階式 ════════
const LIFE_TASKS_STAGE1 = [
  { id: 'lt1', title: 'プロフィールを完成させる', done: false },
  { id: 'lt2', title: 'GOAL AIと自分について話す', done: false },
  { id: 'lt3', title: 'AIに今気になっていることを相談する', done: false },
];
const LIFE_TASKS_STAGE2 = [
  { id: 'lt4', title: '「私をデザイン」を体験する', done: false },
  { id: 'lt5', title: '最初のゴールを設定する', done: false },
];

function getLifeTasks(){
  try { return JSON.parse(localStorage.getItem('life_tasks') || 'null'); } catch { return null; }
}
function saveLifeTasks(tasks){ localStorage.setItem('life_tasks', JSON.stringify(tasks)); }

function initLifeTasks(){
  if(getLifeTasks()) return; // 既に初期化済み
  saveLifeTasks(LIFE_TASKS_STAGE1.map(t => ({...t})));
}

function completeLifeTask(id){
  const tasks = getLifeTasks();
  if(!tasks) return;
  const t = tasks.find(x => x.id === id);
  if(t) t.done = true;
  // ステージ2チェック: ステージ1の3個中2個完了
  const s1Done = tasks.filter(x => ['lt1','lt2','lt3'].includes(x.id) && x.done).length;
  if(s1Done >= 2 && !tasks.find(x => x.id === 'lt4')){
    LIFE_TASKS_STAGE2.forEach(s2 => tasks.push({...s2}));
    toast('新しいタスクが追加されました');
  }
  saveLifeTasks(tasks);
  renderLifeTasks();
}

function renderLifeTasks(){
  const tasks = getLifeTasks();
  if(!tasks || tasks.length === 0) return;
  const pending = tasks.filter(t => !t.done);
  if(pending.length === 0) return;
  const container = document.getElementById('sb-task-list');
  if(!container) return;
  // ライフタスクをサイドバー先頭に挿入
  let wrap = document.getElementById('life-tasks-wrap');
  if(!wrap){ wrap = document.createElement('div'); wrap.id = 'life-tasks-wrap'; container.prepend(wrap); }
  wrap.innerHTML = pending.map(t =>
    `<div class="sb-task-item" onclick="completeLifeTask('${t.id}')" style="cursor:pointer;">
      <span class="sb-task-name">🟢 ${escapeHtml(t.title)}</span>
      <span class="sb-task-meta" style="font-size:9px;color:var(--green);">タップで完了</span>
    </div>`
  ).join('');
}

// ════════ D-15: KEYBOARD SHORTCUTS ════════
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.querySelector('.modal-overlay');
    if (modal) { modal.remove(); return; }
    document.getElementById('goal-fullscreen-modal')?.remove();
    showPage('home');
  }
});

// ════════ UX-002: コーチマーク ════════
const COACH_STEPS = [
  { target: '.mode-row-f', text: '会話のスタイルを切り替えられます', pos: 'bottom' },
  { target: '#sb-task-list', text: '会話から生まれたタスクがここに表示されます', pos: 'bottom' },
  { target: '#hamburger-btn', text: 'ゴール管理や自己分析はここから', pos: 'bottom' },
];
let _coachStep = 0;

function showCoachMarks(){
  if(localStorage.getItem('coach_done')) return;
  _coachStep = 0;
  _renderCoachStep();
}

function _renderCoachStep(){
  // 既存オーバーレイ削除
  document.getElementById('coach-overlay')?.remove();
  if(_coachStep >= COACH_STEPS.length){
    localStorage.setItem('coach_done','1');
    return;
  }
  const step = COACH_STEPS[_coachStep];
  const el = document.querySelector(step.target);
  if(!el){ _coachStep++; _renderCoachStep(); return; }

  const rect = el.getBoundingClientRect();
  const overlay = document.createElement('div');
  overlay.id = 'coach-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.6);';
  overlay.onclick = () => { _coachStep++; _renderCoachStep(); };

  // スポットライト（切り抜き）
  const spot = document.createElement('div');
  spot.style.cssText = `position:absolute;top:${rect.top-4}px;left:${rect.left-4}px;width:${rect.width+8}px;height:${rect.height+8}px;border-radius:10px;box-shadow:0 0 0 9999px rgba(0,0,0,.6);background:transparent;z-index:1;`;
  overlay.appendChild(spot);

  // 吹き出し
  const tip = document.createElement('div');
  tip.style.cssText = `position:absolute;left:50%;transform:translateX(-50%);top:${rect.bottom+12}px;background:var(--amber);color:var(--bg);padding:10px 18px;border-radius:10px;font-size:12px;font-family:var(--ff);max-width:280px;text-align:center;z-index:2;box-shadow:0 4px 16px rgba(0,0,0,.3);`;
  tip.innerHTML = `${step.text}<div style="font-size:9px;margin-top:6px;opacity:.7;">タップで次へ (${_coachStep+1}/${COACH_STEPS.length})</div>`;
  overlay.appendChild(tip);

  document.body.appendChild(overlay);
}

// ════════ Analytics extras ════════
let _analyticsPeriod = 6;
function updateAnalyticsExtras(){
  // Streak
  const countEl = document.getElementById('analytics-streak-count');
  const bestEl = document.getElementById('analytics-streak-best');
  if(countEl && typeof STREAK !== 'undefined'){
    countEl.textContent = STREAK.count || 0;
    if(bestEl) bestEl.textContent = '最高: ' + (STREAK.best || 0) + '日';
  }
  // Task backlog warning
  const backlogBar = document.getElementById('analytics-backlog-bar');
  if(backlogBar && typeof GOALS !== 'undefined'){
    let pending = 0;
    (GOALS || []).forEach(g => { (g.tasks || []).forEach(t => { if(!t.done) pending++; }); });
    backlogBar.style.display = pending >= 5 ? '' : 'none';
  }
}
function setAnalyticsPeriod(months){
  _analyticsPeriod = months;
  document.querySelectorAll('.period-chip').forEach(c => {
    c.classList.toggle('active', parseInt(c.dataset.period) === months);
  });
  renderCharts();
}

// ════════ Settings: Delete chat history ════════
async function deleteChatHistory(){
  if(!confirm('全ての会話履歴を削除しますか？\nこの操作は元に戻せません。')) return;
  try {
    localStorage.removeItem('homeMsgs');
    localStorage.removeItem('goalMsgs');
    localStorage.removeItem('chatHistory');
    toast('会話履歴を削除しました');
  } catch(e){
    toast('削除に失敗しました');
  }
}

// ════════ Settings: Location toggle ════════
function toggleLocationSetting(){
  const enabled = localStorage.getItem('location_enabled') !== 'false';
  const newVal = !enabled;
  localStorage.setItem('location_enabled', newVal ? 'true' : 'false');
  const knob = document.getElementById('location-toggle-knob');
  const toggle = document.getElementById('location-toggle');
  if(toggle && knob){
    if(newVal){
      toggle.style.background = 'var(--amber)';
      knob.style.left = '25px';
      if(typeof initLocation === 'function') initLocation();
    } else {
      toggle.style.background = 'var(--border)';
      knob.style.left = '3px';
      window.USER_LOCATION = null;
    }
  }
  toast(newVal ? '位置情報を有効にしました' : '位置情報を無効にしました');
}

function restoreLocationToggleUI(){
  const enabled = localStorage.getItem('location_enabled') !== 'false';
  const knob = document.getElementById('location-toggle-knob');
  const toggle = document.getElementById('location-toggle');
  if(toggle && knob){
    if(enabled){
      toggle.style.background = 'var(--amber)';
      knob.style.left = '25px';
    } else {
      toggle.style.background = 'var(--border)';
      knob.style.left = '3px';
    }
  }
}

// ═══ ES Module: expose to window ═══
Object.defineProperty(window, 'kabeuchiMode', {
  get() { return kabeuchiMode; }, set(v) { kabeuchiMode = v; },
  configurable: true, enumerable: true
});
Object.assign(window, {
  getSysNormal, getSysSpartan, getSysMencare,
  DEMO_MSGS, CHART_DATA, FAIL_HISTORY, getCalEvents,
  toggleSidebar, closeSidebar, renderGlobalHeader,
  initSwipeToOpenSidebar, initTabSwipe,
  showPage, selectMode, activateMencare, applyModeUI,
  toggleSpartan, toggleMencare, getActiveMode, updateModeUI, updateMencareTimer,
  DEEP_LIMITS, getDeepMonthKey, getDeepUsedCount, getDeepLimit,
  getDeepRemaining, incrementDeepUsage, getDeepUsageBadgeHTML,
  OUTPUT_FORMATS, isDeepAnalysisNeeded, showDeepConfirm,
  selectDeepFormat, createDeepProgressPanel, setPhaseStatus,
  callGemini, callOpenAI, runDeepAnalysis, renderDeepResult,
  exportDeepFormat, continueDeepChat,
  renderAPIKeySettings, applyPromoFromSettings,
  THEMES, applyTheme, setBaseTheme, toggleGlassMode,
  restoreThemeUI, applySystemTheme, toggleAutoTheme, restoreAutoThemeUI,
  applyFontSize, applyLanguage, openSettingsPanel, closeSettingsPanel,
  HELP_SLIDES, showHelpGuide,
  openArchiveView, closeArchiveView, renderArchiveList,
  openArchivedGoalDetail, restoreGoal, exportData,
  PROMO_CODES, getMembershipLabel, renderMembershipUI,
  copyReferralCode, openPlanModal, closePlanModal, renderPlanModal,
  selectPlan, updatePlanCTA, updatePlanDots, toggleBillingPeriod, updatePlanPrices,
  applyPromoCode, subscribePlan, openCustomerPortal,
  showAIMemo, MODE_DESCRIPTIONS, handleModeClick,
  updateModePills, updateSidebarTaskList,
  updateAnalyticsExtras, setAnalyticsPeriod,
  deleteChatHistory, toggleLocationSetting, restoreLocationToggleUI,
  applyChatBg, confirmDeleteAccount, completeLifeTask
});

