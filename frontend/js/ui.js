// ════════ SYSTEM PROMPTS ════════
function getSysNormal(){
  return `あなたはGOAL AIというAIコーチです。ユーザーと一緒にゴールを形作り、達成を伴走します。
${curGoal ? '\nゴール：'+curGoal : ''}

【対話の原則】
- ユーザーがまだ漠然としたビジョンを話しているなら、すぐ提案せず動機や感情を掘り下げる
- 「なぜそう思った？」「それが実現したらどうなる？」のような問いかけをする
- ゴールの輪郭が見えてきたら「こういうゴールにまとめてみない？」と提案する
- ゴールが確定して初めてタスクやアクションの話に入る
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
const SYS_NORMAL = getSysNormal();

function getSysSpartan(){
  const goal = ALL_GOALS[activeGoalIdx];
  const progressStr = goal ? `進捗：${goal.actual}%（目安${goal.target}%）| 遅延：${goal.target-goal.actual>0?'-'+(goal.target-goal.actual)+'%':'なし'}` : '';
  return `あなたはGOAL AIのスパルタモードです。甘さゼロ、結果だけ。
${curGoal ? '\nゴール：'+curGoal+(progressStr?' | '+progressStr:'') : ''}

【スタイル】断定的。共感なし。数字と事実から始める。来月のタスクはAIが決めて提示する。「〜かもしれない」は使わない。

【必須JSON出力】SYS_NORMALと同じJSON形式を使う。ただし tradeoff は必ず含める。`;
}
const SYS_SPARTAN = getSysSpartan();

const SYS_MENCARE = `あなたはGOAL AIのメンケアモードです。今、ユーザーは精神的に疲れています。
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


// ════════ INITIAL WELCOME MESSAGE ════════
const DEMO_MSGS = [];

// ════════ CHART DATA ════════
const CHART_DATA = [];

const FAIL_HISTORY = [];

// ════════ CALENDAR DATA ════════
function getCalEvents() {
  // タスクの期限からカレンダーイベントを動的生成
  const events = {};
  ALL_GOALS.forEach(goal => {
    goal.phases.forEach(phase => {
      phase.tasks.forEach(task => {
        if(!task.due) return;
        const d = new Date(task.due);
        const key = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
        if(!events[key]) events[key] = [];
        const type = task.status==='done'?'done':task.status==='current'?'task':'task';
        events[key].push({type, text: task.title});
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

// ════════ PAGE NAVIGATION ════════
function showPage(pg) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  curPage = pg;
  closeSidebar();
  if(pg==='home'){
    document.getElementById('pg-home-wrap').classList.add('active');
    document.getElementById('nav-home').classList.add('active');
    document.getElementById('topbar').style.display='none';
    renderHomeSummary();
  } else if(pg==='goal-hub'){
    document.getElementById('pg-goal-hub-wrap').classList.add('active');
    document.getElementById('topbar').style.display='none';
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
    document.getElementById('topbar').style.display='none';
  } else if(pg==='settings'){
    document.getElementById('pg-settings-wrap').classList.add('active');
    document.getElementById('nav-settings').classList.add('active');
    document.getElementById('topbar').style.display='none';
  } else if(pg==='welcome'){
    document.getElementById('pg-welcome-wrap').classList.add('active');
    document.getElementById('topbar').style.display='none';
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
    input.innerHTML = `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:24px;width:min(320px,85vw);text-align:center;">
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

  const labels = { mencare:'🌸 メンケアモード ON', normal:'💬 通常モードに戻りました', spartan:'🔥 スパルタモード ON', kabeuchi:'💭 壁打ちモード ON' };
  toast(labels[mode]);

  const notices = {
    mencare: 'メンケアモードになりました。\n\nまず、今どんな気持ちか教えてもらえますか？ゴールとか進捗の話は後でいいから。',
    normal:  '通常モードに戻りました。引き続き一緒に進めましょう。',
    spartan: 'スパルタモードをONにしました。\n\n甘えは禁止です。結果だけで判断します。今から何を変えますか？',
    kabeuchi: '壁打ちモードをONにしました。\n\n答えは出しません。あなた自身の中にある答えを、質問で引き出します。\nさて、今一番頭にあることは何ですか？',
  };
  if(homeMsgs.length > 0) {
    homeMsgs.push({role:'ai', content: notices[mode], time: now()});
    renderHomeMsgs();
    showPage('home');
  }
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
  pro:    30,    // Pro: 30回/月
  premium: 60,   // Premium: 60回/月
  max:   9999,   // Max: 無制限
  annual: 60,    // 年間Pro: 60回/月
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
  const planLabel = plan === 'premium' ? 'Premium' : plan === 'annual' ? 'Pro年間' : plan === 'pro' ? 'Pro' :
    (MEMBERSHIP.trialEnd && new Date() < new Date(MEMBERSHIP.trialEnd)) ? 'テスト' : 'Free';

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
const DEEP_TRIGGERS = [
  '事業計画','ビジネスプラン','ビジネス計画',
  'クラファン','クラウドファンディング',
  '戦略','マーケティング戦略','集客戦略','SNS戦略',
  '競合','競合分析','市場調査','市場分析','リサーチ',
  'LP','ランディングページ','セールスコピー',
  '資金調達','投資','融資','ROI','収益',
  'ブランディング','ポジショニング','差別化',
  'コンテンツ計画','プロモーション','広告戦略',
  'ビジネスモデル','収益モデル','マネタイズ',
  'ピッチ','提案書','企画書',
];

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
      ディープ分析を実行しますか？
    </div>
    ${usageBadge}
    <div class="deep-confirm-desc">
      Gemini（リサーチ）→ GPT（アイデア）→ Claude（戦略）→ デュアルレビュー<br>
      の順で自動実行されます。<span style="color:var(--amber)">所要時間：30〜60秒</span>
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
        ⚡ ディープ分析で実行（残り${remaining}回）
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

    panel.remove();
    onComplete(results);

  } catch (e) {
    panel.remove();
    const errWrap = document.createElement('div');
    errWrap.className = 'msg ai'; errWrap.style.marginBottom = '16px';
    errWrap.innerHTML = `<div class="msg-av ai">${getLogoSVG(14)}</div><div class="msg-body"><div class="bubble" style="border-color:var(--red-d)">ディープ分析中にエラーが発生しました：${e.message}<br><br>設定パネル（⚙）→「3AI ディープ分析 — API設定」でAPIキーを確認してください。</div></div>`;
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
    <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;margin-bottom:12px;background:var(--amber-g);border:1px solid rgba(228,184,106,.2);border-radius:8px;font-size:10px;color:var(--amber);font-family:var(--fm);">
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
          <div style="font-size:9.5px;color:#6a9fd4;margin-bottom:4px;font-weight:600;">🔵 Gemini レビュー（エビデンス・競合整合性）</div>
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
        <button class="deep-pdf-btn" style="border-color:rgba(157,120,216,.3);color:#9d78d8;margin-left:auto;" onclick="continueDeepChat('${userQuery.replace(/'/g,'').slice(0,30)}')">＋ 深掘り</button>
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
      <style>body{font-family:sans-serif;max-width:800px;margin:40px auto;font-size:13px;line-height:1.7;color:#222;}
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
      <style>body{font-family:'Meiryo',sans-serif;font-size:11pt;} h1{font-size:16pt;color:#b8882a;} h2{font-size:13pt;}</style></head>
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
    const slideHTML = slides.map((s,i)=>`
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
    const tokenInfo = AUTH_TOKEN.slice(0, 18) + '...';
    el.innerHTML = `
      <div style="padding:10px;background:var(--green-d);border-radius:8px;border:1px solid rgba(93,184,150,.3);margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
          <div style="width:7px;height:7px;border-radius:50%;background:var(--green);"></div>
          <span style="font-size:10px;color:var(--green);font-weight:600;">接続済み</span>
        </div>
        <div style="font-size:9px;color:var(--muted);font-family:var(--fm);">${tokenInfo}</div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--bg4);border-radius:6px;border:1px solid var(--border);">
        <span style="font-size:9.5px;color:var(--muted2);">今月のディープ分析</span>
        <span style="font-size:10px;font-family:var(--fm);color:${remaining<=2?'var(--amber)':'var(--green)'};">${used} / ${limit}回　残り${remaining}回</span>
      </div>
      <div style="font-size:9px;color:var(--muted2);margin-top:6px;">APIキーはCloudflare Workerで安全に管理されています。</div>`;
  } else {
    el.innerHTML = `
      <div style="padding:10px;background:var(--amber-d);border-radius:8px;border:1px solid rgba(228,184,106,.3);margin-bottom:10px;">
        <div style="font-size:10px;color:var(--amber);margin-bottom:6px;font-weight:600;">プロモコードで接続</div>
        <div style="display:flex;gap:6px;">
          <input type="text" id="settings-promo-input" placeholder="コードを入力..."
            style="flex:1;background:var(--bg4);border:1px solid var(--border);border-radius:6px;padding:7px 10px;font-size:11px;color:var(--cream);outline:none;font-family:var(--fm);">
          <button onclick="applyPromoFromSettings()" style="background:var(--amber);color:#000;border:none;border-radius:6px;padding:7px 14px;font-size:11px;cursor:pointer;font-weight:600;">適用</button>
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
  pop:   { label:'ポップ',    emoji:'🌈' },
  zen:   { label:'禅',        emoji:'🍵' },
};
let currentTheme = 'dark';
let currentFontSize = 'md';

function applyTheme(t){
  currentTheme = t;
  document.documentElement.setAttribute('data-theme', t);
  // Update active card
  Object.keys(THEMES).forEach(k=>{
    const c = document.getElementById(`tc-${k}`);
    if(c) c.classList.toggle('active', k===t);
  });
  // Update sidebar label
  const lbl = document.getElementById('sb-theme-label');
  if(lbl) lbl.textContent = `テーマ：${THEMES[t].label}`;
}

function applyFontSize(sz){
  currentFontSize = sz;
  const sizes = {sm:'12px', md:'13px', lg:'15px'};
  document.body.style.fontSize = sizes[sz] || '13px';
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
}
function closeSettingsPanel(){
  document.getElementById('settings-panel').style.display = 'none';
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
      <div class="ac-badge" style="background:${isDone?'var(--green-d)':'var(--bg4)'};color:${isDone?'var(--green)':'var(--muted2)'};">
        ${isDone?`<svg width=12 height=12><use href='#ic-award'/></svg> 達成済み`:`<svg width=12 height=12><use href='#ic-archive'/></svg> アーカイブ`}
      </div>
      <div style="font-size:13px;font-weight:500;color:var(--cream);margin-bottom:6px;">${g.title}</div>
      <div style="display:flex;gap:12px;font-size:10px;color:var(--muted);">
        <span>最終進捗 ${g.actual}%</span>
        <span>目標期限 ${g.deadline}</span>
        ${daysAgo!==null?`<span>${daysAgo}日前にアーカイブ</span>`:''}
      </div>
      <div style="margin-top:10px;display:flex;gap:7px;">
        <button onclick="event.stopPropagation();restoreGoal('${g.id}')" style="padding:5px 12px;background:var(--amber-g);border:1px solid rgba(228,184,106,.3);border-radius:6px;font-size:10.5px;color:var(--amber);cursor:pointer;"><svg width="13" height="13" class="svg-ic"><use href="#ic-restore"/></svg> 復元する</button>
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
function exportData(){
  const data = {
    goals: ALL_GOALS,
    profile: USER_PROFILE,
    membership: MEMBERSHIP,
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`goalai_export_${new Date().toISOString().split('T')[0]}.json`;
  a.click(); URL.revokeObjectURL(a.href);
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

// Membership state
const MEMBERSHIP = {
  plan: 'pro',          // 'free' | 'pro' | 'annual'
  trialEnd: null,       // Date or null
  promoApplied: null,
  selectedPlan: 'pro',  // in modal
};

function getMembershipLabel(){
  if(MEMBERSHIP.trialEnd && new Date() < new Date(MEMBERSHIP.trialEnd)){
    const days = Math.ceil((new Date(MEMBERSHIP.trialEnd)-new Date())/86400000);
    return {badge:'trial', text:'無料体験中', sub:`残 ${days}日`};
  }
  if(MEMBERSHIP.plan==='max') return {badge:'max', text:'Max', sub:null};
  if(MEMBERSHIP.plan==='premium') return {badge:'premium', text:'Premium', sub:null};
  if(MEMBERSHIP.plan==='pro') return {badge:'pro', text:'Pro', sub:null};
  if(MEMBERSHIP.plan==='annual') return {badge:'pro', text:'Pro 年間', sub:null};
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
    badge.textContent = (lbl.badge==='pro'||lbl.badge==='premium'||lbl.badge==='max')?'▲ '+lbl.text:lbl.text;
  }
  if(trialEl){
    if(lbl.sub && lbl.badge==='trial'){
      trialEl.style.display='inline'; trialEl.textContent=lbl.sub;
    } else {
      trialEl.style.display='none';
    }
  }
  if(nudge){
    if(MEMBERSHIP.plan==='free'){
      nudge.style.display='block';
      if(nudgeSub) nudgeSub.textContent='ゴール無制限・毎週レビュー';
    } else if(lbl.badge==='trial'){
      nudge.style.display='block';
      if(nudgeSub) nudgeSub.textContent = lbl.sub+' · このまま続けるにはProへ';
    } else {
      nudge.style.display='none';
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
    const isPaidPlan = MEMBERSHIP.plan==='pro'||MEMBERSHIP.plan==='premium'||MEMBERSHIP.plan==='max'||MEMBERSHIP.plan==='annual';
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
      cur.style.cssText='background:rgba(93,184,150,.1);border:1px solid rgba(93,184,150,.3);color:var(--green);display:inline-flex;align-items:center;gap:7px;padding:6px 14px;border-radius:8px;font-size:11px;';
      cur.innerHTML=`✓ 無料体験中 <span style="opacity:.7">${document.getElementById('sb-trial-days')?.textContent||''}</span>`;
    } else if(lbl.badge==='max'){
      cur.style.cssText='background:linear-gradient(90deg,rgba(228,184,106,.2),rgba(228,184,106,.08));border:1px solid rgba(228,184,106,.7);color:var(--amber);display:inline-flex;align-items:center;gap:7px;padding:6px 14px;border-radius:8px;font-size:11px;font-weight:600;';
      cur.innerHTML=`👑 現在のプラン：Max`;
    } else if(lbl.badge==='premium'){
      cur.style.cssText='background:linear-gradient(90deg,rgba(228,184,106,.15),rgba(228,184,106,.05));border:1px solid rgba(228,184,106,.5);color:var(--amber);display:inline-flex;align-items:center;gap:7px;padding:6px 14px;border-radius:8px;font-size:11px;';
      cur.innerHTML=`👑 現在のプラン：Premium`;
    } else if(lbl.badge==='pro'){
      cur.style.cssText='background:var(--amber-g);border:1px solid rgba(228,184,106,.4);color:var(--amber);display:inline-flex;align-items:center;gap:7px;padding:6px 14px;border-radius:8px;font-size:11px;';
      cur.innerHTML=`★ 現在のプラン：${lbl.text}`;
    } else {
      cur.style.cssText='background:var(--bg3);border:1px solid var(--border2);color:var(--muted);display:inline-flex;align-items:center;gap:7px;padding:6px 14px;border-radius:8px;font-size:11px;';
      cur.innerHTML='現在のプラン：Free（無料）';
    }
  }
  // Highlight selected
  ['free','pro','premium','max'].forEach(p=>{
    const el=document.getElementById(`pc-${p}`);
    if(el){ el.style.outline = (p===MEMBERSHIP.plan||p===MEMBERSHIP.selectedPlan)?'2px solid var(--amber)':'none'; }
  });
  updatePlanCTA();
  // 課金済みユーザーにはポータルリンクを表示
  const portalWrap = document.getElementById('plan-portal-wrap');
  if(portalWrap){
    const isPaid = MEMBERSHIP.plan==='pro'||MEMBERSHIP.plan==='premium'||MEMBERSHIP.plan==='max'||MEMBERSHIP.plan==='annual';
    portalWrap.style.display = isPaid ? 'block' : 'none';
  }
}

function selectPlan(p){
  MEMBERSHIP.selectedPlan = p;
  ['free','pro','premium','max'].forEach(id=>{
    const el=document.getElementById(`pc-${id}`);
    if(el) el.style.outline = id===p?'2px solid var(--amber)':'none';
  });
  updatePlanCTA();
}

function updatePlanCTA(){
  const btn = document.getElementById('plan-cta-btn');
  const wrap = document.getElementById('plan-cta-wrap');
  if(!btn) return;
  const p = MEMBERSHIP.selectedPlan;
  if(p==='free'){
    btn.textContent='Freeプランに戻す';
    btn.style.background='var(--bg3)'; btn.style.color='var(--muted)';
    btn.style.border='1px solid var(--border2)';
  } else if(p==='max'){
    btn.textContent='Maxプランを始める（¥12,800/月）';
    btn.style.background='linear-gradient(90deg,#e4b86a,#d4a456)'; btn.style.color='var(--bg)'; btn.style.border='none';
  } else if(p==='premium'){
    btn.textContent='Premiumプランを始める（¥4,980/月）';
    btn.style.background='linear-gradient(90deg,#e4b86a,#d4a456)'; btn.style.color='var(--bg)'; btn.style.border='none';
  } else {
    btn.textContent= MEMBERSHIP.promoApplied ? `プロモコードでProを開始` : 'Proプランを始める（¥2,980/月）';
    btn.style.background='var(--amber)'; btn.style.color='var(--bg)'; btn.style.border='none';
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
    pro: { monthly: '¥2,980', annual: '¥29,800', annualMonthly: '¥2,483/月' },
    premium: { monthly: '¥4,980', annual: '¥49,800', annualMonthly: '¥4,150/月' },
    max: { monthly: '¥12,800', annual: '¥128,000', annualMonthly: '¥10,666/月' },
  };
  ['pro','premium','max'].forEach(plan => {
    const priceEl = document.getElementById('plan-price-' + plan);
    if(!priceEl) return;
    if(planBilling === 'annual'){
      priceEl.innerHTML = `<span style="font-size:20px;">${prices[plan].annual}</span><span style="font-size:10px;color:var(--muted)">/年</span><br><span style="font-size:11px;color:var(--green);">${prices[plan].annualMonthly}</span>`;
    } else {
      priceEl.innerHTML = `<span style="font-size:20px;">${prices[plan].monthly}</span><span style="font-size:10px;color:var(--muted)">/月</span>`;
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

  // Stripe Checkoutへリダイレクト
  if(!AUTH_TOKEN){ toast('先にトークンを設定してください'); return; }
  const btn = document.getElementById('plan-cta-btn');
  if(btn){ btn.textContent='決済ページへ移動中…'; btn.disabled=true; }
  try {
    const res = await fetch(`${WORKER_URL}/api/checkout/create`, {
      method:'POST', headers:getAuthHeaders(),
      body: JSON.stringify({ plan: planBilling === 'annual' ? p + '_annual' : p })
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

