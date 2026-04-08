// ════════ USER PROFILE (global state — all AI calls use this) ════════
const USER_PROFILE = {
  nickname:   '',
  name:       '',
  age:        null,
  gender:     null,
  dob:        null,
  occupation: '',
  field:      '',
  family:     '',
  mbti:       '',
  mbtiName:   '',
  strengths:  [],
  weaknesses: [],
  interests:  [],
  interestsFree: '',
  energyGain:  [],
  energyDrain: [],
  constraints: '',
  network:    { canConsult:null, hasCheerleader:null, hasMentor:null, hasSafeBase:null },
  vision:     '',
  wantedImage: [],
  catchcopy:  '',
  worries:    '',
  knowSummary: '',
  ideal_day:  '',
  unwanted_life: ''
};

// ─ Build full AI context string from all profile + goals data ─
function buildAIContext(){
  const mode = getActiveMode();
  const modeStr = mode==='spartan'?'スパルタ（断定的・甘さゼロ）':mode==='mencare'?'メンケア（寄り添い最優先）':mode==='kabeuchi'?'ソクラテス（質問のみ・ソクラテス式問答）':'通常（共感＋具体的提案）';
  const activeGoals = ALL_GOALS.filter(g=>!g.archived && g.status!=='done');
  const goalsStr = activeGoals.map(g=>{
    const daysLeft = Math.ceil((new Date(g.deadline)-new Date())/86400000);
    const delay = g.target - g.actual;
    return `▶ ${g.title}（進捗${g.actual}%、${delay>0?`▼${delay}%遅延`:'順調'}、残${daysLeft}日）`;
  }).join('\n');

  // プロフィール情報（設定済みの項目のみ出力）
  const parts = [];
  const p = USER_PROFILE;
  const profileParts = [];
  if(p.nickname||p.name) profileParts.push(`呼び名：${p.nickname||p.name}`);
  if(p.age) profileParts.push(`年齢：${p.age}歳`);
  if(p.gender) profileParts.push(`性別：${p.gender}`);
  if(p.occupation) profileParts.push(`職種：${p.occupation}`);
  if(p.mbti) profileParts.push(`MBTI：${p.mbti}${p.mbtiName?'（'+p.mbtiName+'）':''}`);
  if(p.field) profileParts.push(`専門：${p.field}`);
  if(p.family) profileParts.push(`家族：${p.family}`);
  if(p.strengths.length) profileParts.push(`強み：${p.strengths.join('・')}`);
  if(p.weaknesses.length) profileParts.push(`弱み：${p.weaknesses.join('・')}`);
  if(p.interests.length) profileParts.push(`興味：${p.interests.join('・')}${p.interestsFree?'・'+p.interestsFree:''}`);
  if(p.energyGain.length) profileParts.push(`エネルギー源：${p.energyGain.join('・')}`);
  if(p.energyDrain.length) profileParts.push(`消耗：${p.energyDrain.join('・')}`);
  if(p.constraints) profileParts.push(`生活上の制約：${p.constraints}`);

  if(profileParts.length) parts.push('【ユーザー情報】\n' + profileParts.join(' | '));

  // ビジョン（設定済みの場合のみ）
  const visionParts = [];
  if(p.vision) visionParts.push(`ビジョン：${p.vision}`);
  if(p.wantedImage.length) visionParts.push(`見られたい姿：${p.wantedImage.join('・')}`);
  if(p.catchcopy) visionParts.push(`キャッチコピー：${p.catchcopy}`);
  if(p.knowSummary) visionParts.push(`デザインサマリー：${p.knowSummary.slice(0,200)}`);
  if(visionParts.length) parts.push('【ビジョン・ブランディング】\n' + visionParts.join('\n'));

  // ゴール
  if(goalsStr) parts.push('【現在のゴール】\n' + goalsStr);
  else parts.push('【現在のゴール】\nまだゴールが設定されていません。ゴール設定を強要せず、ユーザーの話題に応じて自然に対応してください。');

  parts.push('【現在のモード】' + modeStr);

  // 重要な指示（設定済み情報に基づく）
  const instructions = [];
  if(p.nickname||p.name) instructions.push(`- 「${p.nickname||p.name}」という呼び名で話しかける`);
  if(p.strengths.length) instructions.push(`- 強みを活かしたアドバイスをする`);
  if(p.weaknesses.length) instructions.push(`- 弱み（特に${p.weaknesses[0]}）を先回りしてサポートする`);
  instructions.push('- ゴールがある場合は遅延状況を把握した上で応答する');
  instructions.push('- ゴールがない場合でもタスク作成は可能。ゴール設定を強要しない');
  if(p.vision) instructions.push('- ビジョンとゴールの整合性を意識したアドバイスをする');
  parts.push('【重要な指示】\n' + instructions.join('\n'));

  return parts.join('\n\n');
}


// ════════ MBTI FULL VERSION (93-question authentic dimensions) ════════
// #21: 期間切替
let _chartPeriod = 3;
function setChartPeriod(months){
  _chartPeriod = months;
  document.querySelectorAll('.chart-period-chip').forEach(c => {
    const active = parseInt(c.dataset.period) === months;
    c.style.background = active ? 'var(--amber)' : 'var(--bg3)';
    c.style.color = active ? 'var(--text-on-accent)' : 'var(--muted)';
  });
  // Re-render chart with filtered data
  const chart = document.getElementById('progress-chart');
  if(chart) chart.innerHTML = '';
  renderCharts();
}

function renderCharts(){
  // Bar chart
  const chart=document.getElementById('progress-chart');
  const labels=document.getElementById('chart-labels');
  if(chart.children.length>0)return; // Already rendered
  const maxVal=100;
  CHART_DATA.forEach(d=>{
    const g=document.createElement('div');g.className='bar-group';
    const wrap=document.createElement('div');wrap.className='bar-wrap';

    const bT=document.createElement('div');
    bT.className='bar bar-target';
    bT.style.height=`${(d.target/maxVal)*100}%`;
    bT.setAttribute('data-v',`目安 ${d.target}%`);

    if(d.actual!==null){
      const bA=document.createElement('div');
      bA.className=`bar bar-actual${d.ok?'':' behind'}`;
      bA.style.height=`${(d.actual/maxVal)*100}%`;
      bA.setAttribute('data-v',`実績 ${d.actual}%`);
      wrap.appendChild(bT);wrap.appendChild(bA);
    } else {
      bT.style.opacity='0.3';
      wrap.appendChild(bT);
    }

    g.appendChild(wrap);
    const lbl=document.createElement('div');lbl.className='bar-lbl';lbl.textContent=d.lbl;
    g.appendChild(lbl);
    chart.appendChild(g);
  });

  // Failure timeline
  const tl=document.getElementById('fail-timeline');
  FAIL_HISTORY.forEach((f,i)=>{
    const item=document.createElement('div');item.className='fail-item';
    item.innerHTML=`
      <div class="fail-dot-wrap">
        <div class="fail-dot" style="background:${f.color}"></div>
        ${i<FAIL_HISTORY.length-1?'<div class="fail-line"></div>':''}
      </div>
      <div class="fail-content">
        <div class="fail-date">${escapeHtml(f.date || '')}</div>
        <div class="fail-reason">${escapeHtml(f.reason || '')}</div>
        <div class="fail-deep">${escapeHtml(f.deep || '')}</div>
        <span class="fail-tag" style="background:var(--muted3);color:var(--muted)"># ${escapeHtml(f.tag || '')}</span>
      </div>`;
    tl.appendChild(item);
  });
}

// ════════ SETTINGS HELPERS ════════
function selRadio(el,group){
  el.closest('.radio-group').querySelectorAll('.radio-opt').forEach(e=>{e.classList.remove('sel');e.classList.remove('sel-red');});
  el.classList.add('sel');
}
function selMBTI(el){
  document.querySelectorAll('.mbti-btn').forEach(e=>e.classList.remove('sel'));
  el.classList.add('sel');
}
function saveGoal(){
  const title=document.getElementById('goal-title-input').value;
  document.getElementById('tb-title').textContent=title;
  toast('ゴールを保存しました');
}


// ════════ PROFILE MODAL ════════
function openProfile(){
  document.getElementById('pg-profile-wrap').classList.add('open');
  // Init worries chat if empty
  const chat = document.getElementById('worries-chat');
  if(chat.children.length === 0) initWorriesChat();
}
function closeProfile(){
  document.getElementById('pg-profile-wrap').classList.remove('open');
}
function closeProfileOutside(e){
  if(e.target === document.getElementById('pg-profile-wrap')) closeProfile();
}
// ════════ WORRIES CHAT ════════
let worriesHistory = [];
let worriesLoading = false;
let worriesTurnCount = 0;
const WORRIES_SYS = `あなたはGOAL AIの「パーソナル悩み聴取」モードです。
ユーザーの個人的な悩みや不安をやさしく引き出し、最終的にAIが活用しやすい形で整理します。

【進め方】
1. まず温かく迎え入れ、「最近一番気になっていることは何ですか？」と聞く
2. 1〜2回のやり取りで深掘り（なぜそう感じるか、いつからか、など）
3. 3〜4回のやり取り後、「少し整理してもいいですか？」と一言添えてから以下のJSON形式で出力する

【出力タイミング】合計3〜5往復したら整理メモを生成する。それ以前は純粋に聴く。

【整理メモJSON形式】
\`\`\`json
{"type":"worries_summary","text":"（ここに整理した文章。箇条書きOK。AIがコーチング時に参照する内容として書く。200字以内）"}
\`\`\`

【スタイル】
- 短く、温かく
- 「そうなんですね」「それは大変でしたね」など受け止めから始める
- 解決策を急がない。まず聴く
- 質問は一度に1つだけ
- 絵文字は使わない`;

function initWorriesChat(){
  worriesHistory = [];
  worriesTurnCount = 0;
  const chat = document.getElementById('worries-chat');
  chat.innerHTML = '';
  document.getElementById('worries-summary-box').style.display = 'none';

  // Inject opening AI bubble
  const intro = {role:'ai', content:'今日はここに来てくれてありがとうございます。\n\nここで話したことは、AIがあなたへの接し方を調整するためだけに使われます。最近、一番気になっていることや、ちょっとしんどいなと感じていることはありますか？'};
  appendWorryBubble(intro);
}

function appendWorryBubble(m){
  const chat = document.getElementById('worries-chat');
  const wrap = document.createElement('div');
  wrap.style.cssText = `display:flex;gap:8px;${m.role==='user'?'flex-direction:row-reverse;':''}animation:fadeUp .3s ease both`;
  const av = document.createElement('div');
  av.style.cssText = `width:22px;height:22px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;margin-top:1px;${m.role==='ai'?'background:var(--avatar-bg);color:var(--mencare);border:1px solid var(--mencare-d)':'background:linear-gradient(135deg,var(--amber),var(--accent));color:var(--text-on-accent);font-weight:700'}`;
  if(m.role==='ai'){av.innerHTML=getLogoSVG(12);}else{const ut=getUserAvatarText();if(ut)av.textContent=ut;else av.textContent='U';}
  const bub = document.createElement('div');
  bub.style.cssText = `max-width:85%;padding:9px 13px;border-radius:11px;font-size:12px;line-height:1.75;${m.role==='ai'?'background:var(--bg3);border:1px solid var(--border);border-radius:3px 11px 11px 11px;color:var(--cream)':'background:var(--mencare-d);border:1px solid var(--mencare-d);border-radius:11px 3px 11px 11px;color:var(--cream)'}`;
  bub.innerHTML = m.content.replace(/\n/g,'<br>');
  wrap.appendChild(av); wrap.appendChild(bub);
  chat.appendChild(wrap);
  chat.scrollTop = chat.scrollHeight;
}

async function sendWorriesMsg(){
  if(worriesLoading) return;
  const inp = document.getElementById('worries-in');
  const text = inp.value.trim(); if(!text) return;
  inp.value = ''; worriesResize(inp);

  appendWorryBubble({role:'user', content:text});
  worriesHistory.push({role:'user', content:text});
  worriesTurnCount++;
  worriesLoading = true;

  const wChat = document.getElementById('worries-chat');
  // Streaming bubble (inline worries style)
  const wWrap = document.createElement('div');
  wWrap.style.cssText = 'display:flex;gap:8px;animation:fadeUp .3s ease both';
  const wAv = document.createElement('div');
  wAv.style.cssText = 'width:22px;height:22px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;margin-top:1px;background:var(--avatar-bg);color:var(--mencare);border:1px solid var(--mencare-d)';
  wAv.innerHTML = getLogoSVG(12);
  const wBub = document.createElement('div');
  wBub.className = 'stream-bubble';
  wBub.style.cssText = 'max-width:85%;padding:9px 13px;border-radius:3px 11px 11px 11px;font-size:12px;line-height:1.75;background:var(--bg3);border:1px solid var(--border);color:var(--cream)';
  wWrap.appendChild(wAv); wWrap.appendChild(wBub);
  wChat.appendChild(wWrap); wChat.scrollTop = wChat.scrollHeight;

  await streamAI(
    { system: WORRIES_SYS, messages: worriesHistory, maxTokens: 600 },
    (t) => { wBub.innerHTML = renderMsgContent(t); wChat.scrollTop = wChat.scrollHeight; },
    (raw) => {
      wBub.classList.remove('stream-bubble');
      worriesHistory.push({ role:'assistant', content:raw });
      // Check for summary JSON
      const match = raw.match(/```json\n([\s\S]*?)\n```/);
      if(match){
        try{
          const parsed = JSON.parse(match[1]);
          if(parsed.type === 'worries_summary'){
            wBub.innerHTML = renderMsgContent(raw.replace(/```json\n[\s\S]*?\n```/,'').trim());
            document.getElementById('worries-summary-text').textContent = parsed.text;
            document.getElementById('worries-summary-box').style.display = 'block';
            document.getElementById('worries-input-row').style.display = 'none';
            setTimeout(()=>appendWorryBubble({role:'ai', content:'整理しました。この内容はコーチングの参考として保存されます。必要なときはいつでも編集できます。'}), 400);
            worriesLoading = false; return;
          }
        }catch(e){}
      }
      worriesLoading = false;
    },
    (e) => {
      wBub.classList.remove('stream-bubble');
      wBub.textContent = '通信エラーが発生しました。もう一度お試しください。';
      worriesLoading = false;
    }
  );
}

function editWorriesSummary(){
  const box = document.getElementById('worries-summary-text');
  const current = box.textContent;
  const ta = document.createElement('textarea');
  ta.style.cssText = 'width:100%;background:transparent;border:none;color:var(--cream);font-family:var(--ff);font-size:12px;line-height:1.75;resize:none;outline:none;';
  ta.rows = 4; ta.value = current;
  box.replaceWith(ta);
  ta.focus();
  ta.addEventListener('blur', ()=>{
    const newDiv = document.createElement('div');
    newDiv.id = 'worries-summary-text';
    newDiv.style.cssText = 'font-size:12px;color:var(--cream);line-height:1.75;white-space:pre-wrap;';
    newDiv.textContent = ta.value;
    ta.replaceWith(newDiv);
  });
  // Show input again if they want to continue chatting
  document.getElementById('worries-input-row').style.display = '';
}

function worriesResize(el) { chatResize(el, 80); }
function worriesKey(e) { chatKey(sendWorriesMsg, e); }

// ═══ UX-01-B4: ルーティン管理 ═══
let _routines = [];
let _schedulingPref = { hard_tasks_first:true, batch_errands:true, buffer_minutes:15, focus_hours:'morning', max_daily_tasks:5 };

function renderRoutineList(){
  const list = document.getElementById('routine-list');
  if(!list) return;
  if(!_routines.length){
    list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);font-size:13px;">ルーティンが未登録です</div>';
    return;
  }
  const dayLabels = {mon:'月',tue:'火',wed:'水',thu:'木',fri:'金',sat:'土',sun:'日'};
  list.innerHTML = _routines.map((r, i) => {
    const daysStr = r.days === 'daily' ? '毎日' : (r.days||[]).map(d => dayLabels[d]||d).join('');
    const timeStr = r.time + (r.end ? ' – '+r.end : r.duration ? ` (${r.duration}分)` : '');
    return `<div class="routine-row" style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--bg3);border:0.5px solid var(--border);border-radius:8px;">
      <span style="font-size:12px;color:var(--amber);min-width:90px;font-weight:500;">${escapeHtml(timeStr)}</span>
      <span style="flex:1;font-size:13px;color:var(--cream);">${escapeHtml(r.title)}</span>
      <span style="font-size:11px;color:var(--muted);min-width:40px;">${daysStr}</span>
      <button onclick="editRoutine(${i})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:12px;padding:4px;">✎</button>
      <button onclick="delRoutine(${i})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;padding:4px;">×</button>
    </div>`;
  }).join('');
}

function renderSchedulingPref(){
  const form = document.getElementById('scheduling-pref-form');
  if(!form) return;
  const p = _schedulingPref;
  const focusOpts = [{l:'朝',v:'morning'},{l:'午後',v:'afternoon'},{l:'夜',v:'evening'}];
  form.innerHTML = `
    <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--cream);cursor:pointer;">
      <input type="checkbox" ${p.hard_tasks_first?'checked':''} onchange="_schedulingPref.hard_tasks_first=this.checked;saveRoutinesToServer()"> 難しいタスクを先に
    </label>
    <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--cream);cursor:pointer;">
      <input type="checkbox" ${p.batch_errands?'checked':''} onchange="_schedulingPref.batch_errands=this.checked;saveRoutinesToServer()"> 外出タスクをまとめる
    </label>
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="font-size:12px;color:var(--cream);">集中タイム</span>
      <select onchange="_schedulingPref.focus_hours=this.value;saveRoutinesToServer()" style="padding:4px 8px;background:var(--bg);border:0.5px solid var(--border);border-radius:6px;color:var(--cream);font-size:12px;">
        ${focusOpts.map(o => `<option value="${o.v}" ${p.focus_hours===o.v?'selected':''}>${o.l}</option>`).join('')}
      </select>
    </div>
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="font-size:12px;color:var(--cream);">タスク間バッファ</span>
      <input type="number" value="${p.buffer_minutes}" min="0" max="60" style="width:50px;padding:4px 6px;background:var(--bg);border:0.5px solid var(--border);border-radius:6px;color:var(--cream);font-size:12px;text-align:center;" onchange="_schedulingPref.buffer_minutes=parseInt(this.value)||15;saveRoutinesToServer()">
      <span style="font-size:12px;color:var(--muted);">分</span>
    </div>
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="font-size:12px;color:var(--cream);">1日の最大タスク数</span>
      <input type="number" value="${p.max_daily_tasks}" min="1" max="20" style="width:50px;padding:4px 6px;background:var(--bg);border:0.5px solid var(--border);border-radius:6px;color:var(--cream);font-size:12px;text-align:center;" onchange="_schedulingPref.max_daily_tasks=parseInt(this.value)||5;saveRoutinesToServer()">
    </div>`;
}

function addRoutine(){
  const title = prompt('ルーティン名（例: ヨガ、通勤）:','');
  if(!title) return;
  const time = prompt('開始時間（例: 06:00）:','');
  if(!time) return;
  const durOrEnd = prompt('所要時間（分）or 終了時間（例: 30 or 07:00）:','30');
  const daysInput = prompt('曜日（mon,tue,wed,thu,fri,sat,sun / daily）:','daily');
  const routine = { title, time };
  if(durOrEnd && durOrEnd.includes(':')) routine.end = durOrEnd;
  else routine.duration = parseInt(durOrEnd, 10) || 30;
  routine.days = daysInput === 'daily' ? 'daily' : (daysInput||'daily').split(',').map(d=>d.trim());
  _routines.push(routine);
  renderRoutineList();
  saveRoutinesToServer();
}

function editRoutine(idx){
  const r = _routines[idx];
  if(!r) return;
  const title = prompt('ルーティン名:', r.title);
  if(title === null) return;
  const time = prompt('開始時間:', r.time);
  if(time === null) return;
  const durOrEnd = prompt('所要時間（分）or 終了時間:', r.end || String(r.duration||30));
  const daysInput = prompt('曜日:', r.days === 'daily' ? 'daily' : (r.days||[]).join(','));
  r.title = title || r.title;
  r.time = time || r.time;
  if(durOrEnd && durOrEnd.includes(':')){ r.end = durOrEnd; delete r.duration; }
  else { r.duration = parseInt(durOrEnd, 10) || 30; delete r.end; }
  r.days = daysInput === 'daily' ? 'daily' : (daysInput||'daily').split(',').map(d=>d.trim());
  renderRoutineList();
  saveRoutinesToServer();
}

function delRoutine(idx){
  _routines.splice(idx, 1);
  renderRoutineList();
  saveRoutinesToServer();
}

async function saveRoutinesToServer(){
  try {
    await fetch(`${WORKER_URL}/api/me/identity`, {
      method:'PUT', headers:{ ...getAuthHeaders(), 'Content-Type':'application/json' },
      body:JSON.stringify({ routines:_routines, scheduling_preference:_schedulingPref })
    });
  } catch(e){ console.warn('Routine save failed', e); }
}

function cyclePri(el){
  const cycle = [
    {label:'高優先',bg:'var(--green-d)',color:'var(--green)',border:'var(--green-d)'},
    {label:'目標時間',bg:'var(--amber-d)',color:'var(--amber)',border:'var(--mode-normal-border)'},
    {label:'健康維持',bg:'var(--blue-d)',color:'var(--blue)',border:'rgba(120,168,216,.4)'},
    {label:'固定',bg:'var(--red-d)',color:'var(--red)',border:'var(--red-d)'},
    {label:'任意',bg:'var(--bg3)',color:'var(--muted)',border:'var(--border2)'},
  ];
  const cur = el.textContent.trim();
  const idx = cycle.findIndex(c=>c.label===cur);
  const next = cycle[(idx+1)%cycle.length];
  el.textContent = next.label;
  el.style.background = next.bg;
  el.style.color = next.color;
  el.style.borderColor = next.border;
}


// ════════ 私をデザイン ════════
const KNOW_THEMES = [
  {
    label: 'あなたについて',
    questions: [
      'まず、なんて呼んだらいい？（ニックネームでOK）',
      '年齢と、今やってること（仕事・学校など）を教えて？',
      '普段使える時間はどれくらい？（例：平日夜2時間、週末は自由）',
      '好きなこと・ハマっていることは？'
    ]
  },
  {
    label: '今の自分',
    questions: [
      '友達や同僚によく頼まれることは？',
      'やってると時間を忘れることは？',
      '苦にならないけど周りは大変そうにしてることは？',
      '「それ上手だね」と言われたことは？'
    ]
  },
  {
    label: '苦手なこと',
    questions: [
      'いつも先延ばしにしてしまうことは？',
      '人に任せたいと思うことは？',
      'やると疲れるけど避けられないことは？'
    ]
  },
  {
    label: '大切にしていること',
    questions: [
      'お金と時間、今どっちが欲しい？',
      '安定と挑戦、どっちにワクワクする？',
      '一人で集中 vs チームでワイワイ、どっちが好き？',
      '今の生活で一番幸せを感じる瞬間は？'
    ]
  },
  {
    label: 'なりたい自分',
    questions: [
      '5年後の平日、朝起きてから何してたい？',
      '「あの人みたいになりたい」と思う人は誰？なぜ？',
      '絶対にやりたくない仕事や生活は？',
      'お金の心配がなかったら何する？'
    ]
  },
  {
    label: '恐れと障壁',
    questions: [
      '本当はやりたいのに踏み出せていないことは？',
      'それを止めているのは何？（お金？時間？自信？周囲の目？）',
      'もし絶対に失敗しないとしたら、何をやる？'
    ]
  }
];

let knowState = {
  active: false,
  themeIdx: 0,
  questionIdx: 0,
  answers: {},   // themeIdx -> [answers]
  history: [],
  loading: false,
  done: false,
  summary: ''
};

let myselfTab = 'know';

function closeOnboarding(){
  document.getElementById('onboarding-modal').style.display='none';
  localStorage.setItem('ob_done','1');
  if(typeof initLifeTasks === 'function') initLifeTasks();
  if(typeof renderLifeTasks === 'function') setTimeout(renderLifeTasks, 500);
}
function checkOnboarding(){
  if(localStorage.getItem('ob_done')) return;
  if(!knowState.done && !USER_PROFILE.knowSummary){
    document.getElementById('onboarding-modal').style.display='flex';
    _initObScroll();
  }
}
let _obStep = 0;
function obNext(){
  const slides = document.getElementById('ob-slides');
  if(!slides) return;
  _obStep++;
  if(_obStep >= 3){
    closeOnboarding(); openMyselfHub(); startKnowSession(); return;
  }
  slides.scrollTo({ left: slides.clientWidth * _obStep, behavior: 'smooth' });
  _updateObDots();
  if(_obStep === 2) document.getElementById('ob-cta').textContent = '今すぐ分析＆デザイン';
}
function _updateObDots(){
  document.querySelectorAll('#ob-dots .ob-dot').forEach((d,i) => {
    d.style.background = i === _obStep ? 'var(--amber)' : 'var(--muted3)';
    d.style.width = i === _obStep ? '20px' : '8px';
    d.style.borderRadius = i === _obStep ? '4px' : '50%';
  });
}
function _initObScroll(){
  _obStep = 0; _updateObDots();
  const cta = document.getElementById('ob-cta');
  if(cta) cta.textContent = '次へ';
  const slides = document.getElementById('ob-slides');
  if(slides){ slides.scrollLeft = 0; slides.addEventListener('scroll', () => {
    const idx = Math.round(slides.scrollLeft / slides.clientWidth);
    if(idx !== _obStep){ _obStep = idx; _updateObDots();
      if(idx === 2 && cta) cta.textContent = '今すぐ分析＆デザイン';
      else if(cta) cta.textContent = '次へ';
    }
  }); }
}

function openMyselfHub(){
  showPage('myself');
  switchMyselfTab(myselfTab);
  loadIdentityFromServer();
}
function openProfileDirect(){
  showPage('myself');
  switchMyselfTab('profile');
}

function switchMyselfTab(tab){
  myselfTab = tab;
  document.querySelectorAll('[id^="mtab-"]').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('[id^="myself-pane-"]').forEach(p => p.classList.remove('active'));
  document.getElementById('mtab-' + tab).classList.add('active');
  document.getElementById('myself-pane-' + tab).classList.add('active');
  if(tab === 'connect') renderConnectContent();
  if(tab === 'routine'){ renderRoutineList(); renderSchedulingPref(); }
  if(tab === 'profile') initProfileScrollHandler();
}

// ─ 自分を知る ─
function startKnowSession(){
  knowState = { active:true, themeIdx:0, questionIdx:0, answers:{}, history:[], loading:false, done:false, summary:'' };
  document.getElementById('know-chat').style.display = 'flex';
  document.getElementById('know-input-row').style.display = 'block';
  document.getElementById('know-summary-box').style.display = 'none';
  document.getElementById('know-start-btn').textContent = 'リセット';
  document.getElementById('know-status-title').textContent = 'セッション進行中';
  updateKnowChips();
  appendKnowMsg('ai', KNOW_THEMES[0].questions[0]);
}

function updateKnowChips(){
  KNOW_THEMES.forEach((t, i) => {
    const chip = document.querySelector(`.know-chip[data-theme="${i}"]`);
    if(!chip) return;
    chip.className = 'know-chip';
    if(i < knowState.themeIdx) chip.classList.add('done');
    else if(i === knowState.themeIdx && knowState.active) chip.classList.add('active');
  });
}

function appendKnowMsg(role, text){
  const chat = document.getElementById('know-chat');
  const wrap = document.createElement('div');
  wrap.style.cssText = `display:flex;gap:10px;align-items:flex-start;${role==='user'?'flex-direction:row-reverse':''}`;
  const av = document.createElement('div');
  av.style.cssText = `width:28px;height:28px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;${role==='ai'?'background:var(--know-purple-border);color:var(--know-purple)':'background:var(--amber-g);border:1px solid var(--mode-normal-border);color:var(--amber)'}`;
  if(role==='ai'){av.textContent='🪞';}else{const ut=getUserAvatarText();av.textContent=ut||'U';}
  const bub = document.createElement('div');
  bub.style.cssText = `max-width:80%;padding:11px 15px;border-radius:10px;font-size:12.5px;line-height:1.75;${role==='ai'?'background:var(--know-purple-bg);border:1px solid var(--know-purple-bg);color:var(--cream)':'background:var(--bg3);border:1px solid var(--border2);color:var(--cream)'}`;
  bub.innerHTML = escapeHtml(text).replace(/\n/g,'<br>');
  wrap.appendChild(av); wrap.appendChild(bub);
  chat.appendChild(wrap);
  setTimeout(()=>{ const p=chat.closest('[style*="overflow-y"]')||chat.parentElement; if(p) p.scrollTop=99999; },50);
}

async function sendKnowMsg(){
  if(knowState.loading || !knowState.active) return;
  const inp = document.getElementById('know-msg-in');
  const text = inp.value.trim(); if(!text) return;
  inp.value = ''; knowResize(inp);

  appendKnowMsg('user', text);
  knowState.history.push({role:'user', content:text});
  if(!knowState.answers[knowState.themeIdx]) knowState.answers[knowState.themeIdx] = [];
  knowState.answers[knowState.themeIdx].push(text);
  knowState.loading = true;

  const theme = KNOW_THEMES[knowState.themeIdx];
  const isLastQ = knowState.questionIdx >= theme.questions.length - 1;
  const isLastTheme = knowState.themeIdx >= KNOW_THEMES.length - 1;

  // Typing
  const typId = 'know-typ-' + Date.now();
  const typWrap = document.createElement('div');
  typWrap.id = typId;
  typWrap.style.cssText = 'display:flex;gap:10px;align-items:flex-start;';
  typWrap.innerHTML = `<div style="width:28px;height:28px;border-radius:50%;background:var(--know-purple-border);display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--know-purple);flex-shrink:0">🪞</div>
    <div style="padding:11px 15px;border-radius:10px;background:var(--know-purple-bg);border:1px solid var(--know-purple-bg)"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
  document.getElementById('know-chat').appendChild(typWrap);

  try {
    let nextMsg;
    if(isLastQ && isLastTheme){
      // Generate final summary
      nextMsg = await generateKnowSummary();
    } else {
      // Move to next question with brief acknowledgment
      if(isLastQ){
        // テーマ終了時：AIがまとめフィードバックを返す
        const themeAnswers = (knowState.answers[knowState.themeIdx]||[]).join('\n');
        const themeName = KNOW_THEMES[knowState.themeIdx].label;
        knowState.themeIdx++;
        knowState.questionIdx = 0;
        updateKnowChips();
        const nextTheme = KNOW_THEMES[knowState.themeIdx];
        const nextQ = nextTheme.questions[0];
        const bridgeRes = await fetch(`${WORKER_URL}/api/chat`,{
          method:'POST', headers:getAuthHeaders(),
          body: JSON.stringify({
            system:`あなたはコーチです。「${themeName}」テーマのユーザーの回答をまとめて、1〜2文で気づきやフィードバックを伝えてください（例：「あなたの強みは〇〇ですね」）。その後「しっくりきますか？」と確認してください。ユーザーが同意したら次の質問「${nextQ}」に進みます。全体で3文以内。`,
            messages:[{role:'user', content:themeAnswers}],
            maxTokens:200
          })
        });
        const bd = await bridgeRes.json();
        nextMsg = (bd.content?.map(b=>b.text||'').join('') || '');
      } else {
        knowState.questionIdx++;
        updateKnowChips();
        const nextTheme = KNOW_THEMES[knowState.themeIdx];
        const nextQ = nextTheme.questions[knowState.questionIdx];
        // Simple bridging response
        const bridgeRes = await fetch(`${WORKER_URL}/api/chat`,{
          method:'POST', headers:getAuthHeaders(),
          body: JSON.stringify({
            system:`あなたはコーチです。ユーザーの答えに対して1文で共感・受け止めを伝え、次の質問「${nextQ}」に自然につなげてください。全体で2〜3文以内。まとめや結論を出した場合は「しっくりきますか？」と確認する。`,
            messages:[{role:'user', content:text}],
            maxTokens:120
          })
        });
        const bd = await bridgeRes.json();
        nextMsg = (bd.content?.map(b=>b.text||'').join('') || '');
      }
    }
    document.getElementById(typId)?.remove();
    appendKnowMsg('ai', nextMsg);
    knowState.history.push({role:'assistant', content:nextMsg});
    if(isLastQ && isLastTheme){
      knowState.done = true;
      knowState.active = false;
      document.getElementById('know-input-row').style.display = 'none';
      document.getElementById('know-summary-box').style.display = 'block';
      document.getElementById('know-summary-content').textContent = (knowState.summary||'').replace(/```json[\s\S]*?```\s*/g, '').replace(/\[IDENTITY_UPDATE\][\s\S]*?\[\/IDENTITY_UPDATE\]\s*/g, '').trim();
      document.getElementById('know-status-title').textContent = 'セッション完了 ✓';
      document.getElementById('know-status-sub').textContent = '最終更新：' + new Date().toLocaleDateString('ja-JP');
      document.getElementById('know-start-btn').textContent = '再セッション';
      document.querySelectorAll('.know-chip').forEach(c=>c.classList.add('done'));
    }
  } catch(e){
    document.getElementById(typId)?.remove();
    appendKnowMsg('ai','エラーが発生しました。もう一度お試しください。');
  }
  knowState.loading = false;
}

async function generateKnowSummary(){
  const answersText = KNOW_THEMES.map((t,i) =>
    `【${t.label}】\n${(knowState.answers[i]||[]).join('\n')}`
  ).join('\n\n');
  const res = await fetch(`${WORKER_URL}/api/chat`,{
    method:'POST', headers:getAuthHeaders(),
    body: JSON.stringify({
      system:`あなたはパーソナルコーチです。ユーザーの自己分析セッションの回答を元に、2つのブロックを生成してください。

■ ブロック1: [IDENTITY_UPDATE]タグ（自動保存用）
[IDENTITY_UPDATE]
{
  "vision": "ビジョンステートメント",
  "identity": {
    "age": null,
    "income_range": "",
    "area": "",
    "desired_image": ["見られたい姿3つ"],
    "strengths": ["強みキーワード3つ"],
    "weaknesses": ["弱みキーワード2つ"],
    "values": ["大切にしている価値観3つ"],
    "occupation": "職業カテゴリ",
    "field": "専門分野",
    "interests": ["興味あるジャンル"],
    "background": "背景の要約1文",
    "ideal_day": "5年後の理想の平日",
    "unwanted_life": "やりたくない生活"
  }
}
[/IDENTITY_UPDATE]
読み取れない項目はnullにしてください。

■ ブロック2: デザインサマリー（以下の形式）

【あなたのビジョン】
（1〜2文でビジョンステートメント）

【見られたい姿】
・（3つ）

【強みの言語化】
・（3つ）

【キャッチコピー】
「〜〜〜」

【今の自分への気づき】
（2〜3文）

【次のステップ提案】
・（2〜3つ）

最後に「この分析結果、しっくりきますか？違和感がある部分があれば教えてください」と確認を入れてください。日本語で、本人に語りかける温かいトーンで。`,
      messages:[{role:'user', content: answersText}],
      maxTokens:1200
    })
  });
  const data = await res.json();
  const summary = data.content?.map(b=>b.text||'').join('') || '';
  knowState.summary = summary;
  // Extract [IDENTITY_UPDATE] tag for auto-save to user_identity
  try {
    const identityMatch = summary.match(/\[IDENTITY_UPDATE\]\s*([\s\S]*?)\[\/IDENTITY_UPDATE\]/);
    if(identityMatch){
      const identityData = JSON.parse(identityMatch[1].trim());
      knowState.identityData = identityData;
      await saveIdentityToServer(identityData);
    }
  } catch(e){ console.warn('IDENTITY_UPDATE parse failed', e); }
  // Fallback: extract profile JSON from ```json block
  try {
    const jsonMatch = summary.match(/```json\s*([\s\S]*?)```/);
    if(jsonMatch && !knowState.identityData) knowState.profileData = JSON.parse(jsonMatch[1].trim());
  } catch(e){ console.warn('Profile JSON parse failed', e); }
  return 'セッションが完了しました！あなたのデザインサマリーを生成しました。下のボックスを確認してください。';
}

// ── user_identity API保存・読み込み ──
async function saveIdentityToServer(data){
  try {
    await fetch(`${WORKER_URL}/api/me/identity`,{
      method:'PUT', headers:getAuthHeaders(),
      body: JSON.stringify(data)
    });
    console.log('Identity saved to server');
  } catch(e){ console.warn('Identity save failed', e); }
}

async function loadIdentityFromServer(){
  try {
    const res = await fetch(`${WORKER_URL}/api/me/identity`,{ headers:getAuthHeaders() });
    if(!res.ok) return;
    const data = await res.json();
    if(!data || !data.vision) return;
    // Apply to USER_PROFILE
    if(data.vision) USER_PROFILE.vision = data.vision;
    const id = data.identity || {};
    if(id.desired_image) USER_PROFILE.wantedImage = id.desired_image;
    if(id.strengths) USER_PROFILE.strengths = id.strengths;
    if(id.weaknesses) USER_PROFILE.weaknesses = id.weaknesses;
    if(id.ideal_day) USER_PROFILE.ideal_day = id.ideal_day;
    if(id.unwanted_life) USER_PROFILE.unwanted_life = id.unwanted_life;
    if(id.values) USER_PROFILE.values = id.values;
    if(id.age) USER_PROFILE.age = id.age;
    if(id.occupation) USER_PROFILE.occupation = id.occupation;
    if(id.field) USER_PROFILE.field = id.field;
    if(id.interests) USER_PROFILE.interests = id.interests;
    // BUG-03: identity.profileから基本プロフィール復元
    const prof = id.profile;
    if(prof){
      if(prof.nickname) USER_PROFILE.nickname = prof.nickname;
      if(prof.name) USER_PROFILE.name = prof.name;
      if(prof.age) USER_PROFILE.age = prof.age;
      if(prof.gender) USER_PROFILE.gender = prof.gender;
      if(prof.dob) USER_PROFILE.dob = prof.dob;
      if(prof.occupation) USER_PROFILE.occupation = prof.occupation;
      if(prof.field) USER_PROFILE.field = prof.field;
      if(prof.family) USER_PROFILE.family = prof.family;
      if(prof.mbti) USER_PROFILE.mbti = prof.mbti;
      if(prof.strengths?.length) USER_PROFILE.strengths = prof.strengths;
      if(prof.weaknesses?.length) USER_PROFILE.weaknesses = prof.weaknesses;
      if(prof.interests?.length) USER_PROFILE.interests = prof.interests;
      if(prof.interestsFree) USER_PROFILE.interestsFree = prof.interestsFree;
      if(prof.energyGain?.length) USER_PROFILE.energyGain = prof.energyGain;
      if(prof.energyDrain?.length) USER_PROFILE.energyDrain = prof.energyDrain;
      // ME画面のフォーム反映
      renderMyselfProfile();
    }
    // C: QOL提案キャッシュ（TODAY画面用）
    if(data.qol_proposals && typeof window.loadQOLProposals === 'function'){
      window._qolProposalsCache = data.qol_proposals;
    }
    // B4: ルーティン + スケジューリング設定
    if(data.routines) _routines = data.routines;
    if(data.scheduling_preference) _schedulingPref = { ..._schedulingPref, ...data.scheduling_preference };
    renderRoutineList();
    renderSchedulingPref();
    // Render on ME screen
    renderVision();
    renderIdentityOnME(id);
    _meQolData = data.qol_proposals || [];
    renderQOLOnME(_meQolData);
  } catch(e){ console.warn('Identity load failed', e); }
}

function renderIdentityOnME(id){
  // desired_image tags
  const imgList = document.getElementById('vision-image-list');
  if(imgList && id.desired_image?.length){
    imgList.innerHTML = id.desired_image.map(img =>
      `<span style="display:inline-block;padding:5px 12px;background:var(--know-purple-bg);border:1px solid var(--know-purple-border);border-radius:var(--pill-radius);color:var(--know-purple);font-size:12px;">${escapeHtml(img)}</span>`
    ).join('');
  }
  // strengths
  const strList = document.getElementById('vision-strength-list');
  if(strList && id.strengths?.length){
    strList.innerHTML = id.strengths.map(s =>
      `<span style="display:inline-block;padding:5px 12px;background:var(--green-d);border:1px solid var(--green-d);border-radius:var(--pill-radius);color:var(--green);font-size:12px;">${escapeHtml(s)}</span>`
    ).join('');
  }
  // weaknesses
  const weakList = document.getElementById('vision-weakness-list');
  if(weakList && id.weaknesses?.length){
    weakList.innerHTML = id.weaknesses.map(w =>
      `<span style="display:inline-block;padding:5px 12px;background:var(--red-d);border:1px solid var(--red-d);border-radius:var(--pill-radius);color:var(--red);font-size:12px;">${escapeHtml(w)}</span>`
    ).join('');
  }
}

// ── UX-01-C: QOL提案 ME画面表示 ──
function renderQOLOnME(proposals){
  const list = document.getElementById('me-qol-list');
  if(!list) return;
  if(!proposals || !proposals.length){
    list.innerHTML = '<div style="font-size:12px;color:var(--muted2);">「自分を知る」セッション完了後に提案が生成されます</div>';
    return;
  }
  const catIcons = { health:'💪', finance:'💰', career:'🚀', lifestyle:'✨', relationship:'💬' };
  const urgLabels = { now:'今すぐ', this_month:'今月中', this_quarter:'今期中' };
  list.innerHTML = proposals.map((p, i) => `
    <div style="padding:10px;background:var(--bg);border:0.5px solid var(--border);border-radius:8px;">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
        <span style="font-size:14px;">${catIcons[p.category] || '💡'}</span>
        <span style="font-size:13px;color:var(--cream);font-weight:500;flex:1;">${escapeHtml(p.title)}</span>
        <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:var(--amber-d);color:var(--amber);">${urgLabels[p.urgency] || p.urgency}</span>
      </div>
      <div style="font-size:11px;color:var(--muted);line-height:1.4;margin-bottom:8px;">${escapeHtml(p.description)}</div>
      <button onclick="startQOLGoal(${i})" style="padding:6px 14px;background:var(--amber);color:#1a1a2e;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">やる</button>
    </div>
  `).join('');
}

let _meQolData = [];
function startQOLGoal(idx){
  const proposals = _meQolData;
  if(!proposals || !proposals[idx]) return;
  const title = proposals[idx].title;
  if(typeof switchTab === 'function') switchTab('chat');
  setTimeout(() => {
    const input = document.getElementById('home-input');
    if(input){
      input.value = `${title}をやりたい`;
      input.focus();
      input.dispatchEvent(new Event('input'));
    }
  }, 300);
}

async function refreshQOLProposals(){
  const btn = document.getElementById('qol-refresh-btn');
  if(btn) btn.textContent = '生成中...';
  try {
    const res = await fetch(`${WORKER_URL}/api/me/qol-proposals/generate`, {
      method: 'POST', headers: getAuthHeaders()
    });
    if(!res.ok) throw new Error('QOL generate failed');
    const data = await res.json();
    const proposals = data.qol_proposals || [];
    _meQolData = proposals;
    renderQOLOnME(proposals);
    // Update TODAY screen cache
    window._qolProposalsCache = proposals;
    if(typeof renderQOLProposals === 'function') renderQOLProposals();
    if(typeof toast === 'function') toast('QOL提案を更新しました');
  } catch(e){
    console.warn('QOL refresh failed', e);
    if(typeof toast === 'function') toast('QOL提案の更新に失敗しました');
  } finally {
    if(btn) btn.textContent = '↺ 提案を更新';
  }
}

window.startQOLGoal = startQOLGoal;
window.refreshQOLProposals = refreshQOLProposals;

function applySummaryToProfile(){
  // Use identityData (from [IDENTITY_UPDATE]) if available, fallback to profileData
  const id = knowState.identityData;
  const pd = knowState.profileData || (id ? {
    nickname: null,
    age: id.identity?.age,
    occupation: id.identity?.occupation,
    field: id.identity?.field,
    constraints: null,
    strengths: id.identity?.strengths,
    weaknesses: id.identity?.weaknesses,
    interests: id.identity?.interests,
    energyGain: null,
    energyDrain: null,
    mbtiGuess: null
  } : null);
  // Apply identity vision/desired_image to profile state
  if(id){
    if(id.vision) USER_PROFILE.vision = id.vision;
    if(id.identity?.desired_image) USER_PROFILE.wantedImage = id.identity.desired_image;
    if(id.identity?.ideal_day) USER_PROFILE.ideal_day = id.identity.ideal_day;
    if(id.identity?.unwanted_life) USER_PROFILE.unwanted_life = id.identity.unwanted_life;
    if(id.identity?.values) USER_PROFILE.values = id.identity.values;
  }
  if(pd){
    if(pd.nickname){ USER_PROFILE.nickname = pd.nickname; const el=document.getElementById('mp-nickname'); if(el) el.value=pd.nickname; }
    if(pd.age){ USER_PROFILE.age = pd.age; const el=document.getElementById('mp-age'); if(el) el.value=pd.age; }
    if(pd.occupation){ USER_PROFILE.occupation = pd.occupation; const el=document.getElementById('mp-occupation'); if(el) el.value=pd.occupation; }
    if(pd.field){ USER_PROFILE.field = pd.field; const el=document.getElementById('mp-field'); if(el) el.value=pd.field; }
    if(pd.constraints){ USER_PROFILE.constraints = pd.constraints; const el=document.getElementById('mp-constraints'); if(el) el.value=pd.constraints; }
    if(pd.strengths?.length){
      USER_PROFILE.strengths = pd.strengths;
      document.querySelectorAll('#mp-strengths .pf-chip').forEach(c=>{
        c.classList.toggle('active', pd.strengths.some(s=>c.textContent.trim().includes(s)||s.includes(c.textContent.trim())));
      });
    }
    if(pd.weaknesses?.length){
      USER_PROFILE.weaknesses = pd.weaknesses;
      document.querySelectorAll('#mp-weaknesses .pf-chip').forEach(c=>{
        c.classList.toggle('active', pd.weaknesses.some(w=>c.textContent.trim().includes(w)||w.includes(c.textContent.trim())));
      });
    }
    if(pd.interests?.length){
      USER_PROFILE.interests = pd.interests;
      document.querySelectorAll('#interest-chips .interest-chip').forEach(c=>{
        c.classList.toggle('active', pd.interests.some(i=>c.textContent.trim().includes(i)||i.includes(c.textContent.trim())));
      });
    }
    if(pd.energyGain?.length){
      USER_PROFILE.energyGain = pd.energyGain;
      const cont = document.getElementById('energy-gain-tags');
      if(cont){ cont.innerHTML=''; pd.energyGain.forEach(t=>{ const tag=document.createElement('span'); tag.className='energy-tag'; tag.style.cssText='background:var(--green-d);border:1px solid var(--green-d);color:var(--green);'; tag.innerHTML=`${escapeHtml(t)} <span class="remove-x" onclick="this.parentElement.remove();updateProfile()">×</span>`; cont.appendChild(tag); }); }
    }
    if(pd.energyDrain?.length){
      USER_PROFILE.energyDrain = pd.energyDrain;
      const cont = document.getElementById('energy-drain-tags');
      if(cont){ cont.innerHTML=''; pd.energyDrain.forEach(t=>{ const tag=document.createElement('span'); tag.className='energy-tag'; tag.style.cssText='background:var(--red-d);border:1px solid var(--red-d);color:var(--red);'; tag.innerHTML=`${escapeHtml(t)} <span class="remove-x" onclick="this.parentElement.remove();updateProfile()">×</span>`; cont.appendChild(tag); }); }
    }
    if(pd.mbtiGuess){
      USER_PROFILE.mbti = pd.mbtiGuess;
      const badge = document.getElementById('mbti-current-badge');
      if(badge) badge.textContent = pd.mbtiGuess;
      const nameEl = document.querySelector('.mbti-current-name');
      const info = MBTI_TYPES?.[pd.mbtiGuess];
      if(nameEl && info) nameEl.textContent = info.n;
    }
    // Update sidebar avatar & name
    const displayName = USER_PROFILE.nickname || USER_PROFILE.name || '';
    const pn = document.getElementById('sb-prof-name');
    if(pn) pn.textContent = displayName;
    const avEl = document.getElementById('sb-avatar');
    if(avEl) avEl.textContent = displayName ? displayName.charAt(0) : '?';
  }
  // Apply vision data from summary text
  const summary = knowState.summary || '';
  const cleanSummary = summary.replace(/```json[\s\S]*?```\s*/g, '').replace(/\[IDENTITY_UPDATE\][\s\S]*?\[\/IDENTITY_UPDATE\]\s*/g, '').trim();
  const visionMatch = cleanSummary.match(/【あなたのビジョン】\s*([\s\S]*?)(?=【|$)/);
  if(visionMatch){ USER_PROFILE.vision = visionMatch[1].trim(); const el=document.getElementById('vision-statement'); if(el) el.textContent=USER_PROFILE.vision; }
  const catchMatch = cleanSummary.match(/【キャッチコピー】\s*「?([\s\S]*?)」?\s*(?=【|$)/);
  if(catchMatch){ USER_PROFILE.catchcopy = catchMatch[1].trim().replace(/^「|」$/g,''); const el=document.getElementById('vision-catchcopy'); if(el) el.textContent=USER_PROFILE.catchcopy; }
  const idealMatch = cleanSummary.match(/【5年後の理想の平日】\s*([\s\S]*?)(?=【|$)/);
  if(idealMatch){ USER_PROFILE.ideal_day = idealMatch[1].trim(); }
  const unwantedMatch = cleanSummary.match(/【やりたくない生活】\s*([\s\S]*?)(?=【|$)/);
  if(unwantedMatch){ USER_PROFILE.unwanted_life = unwantedMatch[1].trim(); }
  USER_PROFILE.knowSummary = cleanSummary;
  renderVision();
  toast('プロフィールに反映しました ✓');
  switchMyselfTab('profile');
}

function knowResize(el){ el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,110)+'px'; }
function knowKey(e){ if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&!_isComposing){ e.preventDefault(); sendKnowMsg(); } }

// ─ ビジョン ─
function editVision(){
  const el = document.getElementById('vision-statement');
  const current = el.textContent.trim().replace(/^「|」$/g,'');
  el.innerHTML = `<textarea style="width:100%;background:transparent;border:none;color:var(--cream);font-family:var(--ff);font-size:14px;line-height:1.9;resize:none;outline:none;font-style:italic;" rows="3" id="vision-edit">${escapeHtml(current)}</textarea>
  <div style="display:flex;gap:8px;margin-top:8px;">
    <button onclick="saveVision()" style="padding:5px 13px;background:var(--know-purple-bg);border:1px solid var(--know-purple-border);border-radius:6px;color:var(--know-purple);font-size:12px;cursor:pointer;font-family:var(--ff);">保存</button>
    <button onclick="renderVision()" style="padding:5px 13px;background:var(--bg);border:1px solid var(--border2);border-radius:6px;color:var(--muted);font-size:12px;cursor:pointer;font-family:var(--ff);">キャンセル</button>
  </div>`;
}
function saveVision(){
  const text = document.getElementById('vision-edit')?.value.trim();
  if(text) document.getElementById('vision-statement').innerHTML = `「${escapeHtml(text)}」`;
  else renderVision();
}
function renderVision(){
  document.getElementById('vision-statement').innerHTML = USER_PROFILE.vision ? '「'+escapeHtml(USER_PROFILE.vision)+'」' : '<span style="color:var(--muted2)">ビジョンを設定すると表示されます</span>';
  // 5年後の理想の平日
  const idealEl = document.getElementById('vision-ideal-day');
  if(idealEl){
    idealEl.innerHTML = USER_PROFILE.ideal_day ? escapeHtml(USER_PROFILE.ideal_day) : '<span style="color:var(--muted2);font-size:12px;">「自分を知る」セッション完了後に表示されます</span>';
  }
  // やりたくない生活
  const unwantedEl = document.getElementById('vision-unwanted-life');
  if(unwantedEl){
    unwantedEl.innerHTML = USER_PROFILE.unwanted_life ? escapeHtml(USER_PROFILE.unwanted_life) : '<span style="color:var(--muted2);font-size:12px;">「自分を知る」セッション完了後に表示されます</span>';
  }
}
function editVisionField(field){
  const elId = field === 'ideal_day' ? 'vision-ideal-day' : 'vision-unwanted-life';
  const label = field === 'ideal_day' ? '5年後の理想の平日' : 'やりたくない生活';
  const el = document.getElementById(elId);
  if(!el) return;
  const current = USER_PROFILE[field] || '';
  const ta = document.createElement('textarea');
  ta.value = current;
  ta.style.cssText = 'width:100%;min-height:80px;padding:10px;border-radius:8px;background:var(--bg);color:var(--cream);border:1px solid var(--amber);font-size:13px;font-family:var(--ff);resize:vertical;line-height:1.7;';
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:6px;margin-top:8px;';
  row.innerHTML = `<button style="padding:6px 14px;background:var(--amber);color:var(--text-on-accent);border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">保存</button><button style="padding:6px 14px;background:var(--bg3);color:var(--cream);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:12px;">キャンセル</button>`;
  el.innerHTML = '';
  el.appendChild(ta);
  el.appendChild(row);
  ta.focus();
  row.children[1].onclick = () => renderVision();
  row.children[0].onclick = () => {
    USER_PROFILE[field] = ta.value.trim();
    saveProfile();
    renderVision();
  };
}
function addVisionItem(type){
  const text = prompt(type==='image'?'見られたい姿を入力:':'強みを入力:');
  if(!text) return;
  const listId = type==='image'?'vision-image-list':'vision-strength-list';
  const el = document.createElement('div'); el.className = 'vision-item'; el.textContent = '・' + text;
  document.getElementById(listId).appendChild(el);
}
async function regenCatchcopy(){
  const el = document.getElementById('vision-catchcopy');
  el.style.opacity = '.4'; el.textContent = '生成中…';
  try{
    const res = await fetch(`${WORKER_URL}/api/chat`,{
      method:'POST', headers:getAuthHeaders(),
      body: JSON.stringify({
        system:'日本語で、10〜20文字のパーソナルキャッチコピーを1つだけ生成してください。鍵括弧で囲んで出力。',
        messages:[{role:'user', content:'ビジョン：'+(USER_PROFILE.vision||'未設定')+' 強み：'+(USER_PROFILE.strengths.length?USER_PROFILE.strengths.join('・'):'未設定')}],
        maxTokens:80
      })
    });
    const data = await res.json();
    el.textContent = data.content?.map(b=>b.text||'').join('').trim() || '「アイデアを、形に変える人。」';
  } catch(e){ el.textContent = '「アイデアを、形に変える人。」'; }
  el.style.opacity = '1';
}

function toggleReanalyzeChip(el){
  const isOn = el.style.borderColor === 'rgba(200, 146, 10, 0.4)' || el.style.background.includes('rgba(200');
  if(isOn){
    el.style.border = '1px solid var(--border)';
    el.style.background = 'transparent';
    el.style.color = 'var(--muted)';
  } else {
    el.style.border = '1px solid var(--amber-d)';
    el.style.background = 'var(--amber-g)';
    el.style.color = 'var(--accent)';
  }
}
function runReanalysis(){
  const selected = [];
  document.querySelectorAll('.reanalyze-chip').forEach(c => {
    if(c.style.color === 'rgb(200, 146, 10)') selected.push(c.dataset.section);
  });
  if(!selected.length){ toast('再分析する項目を選択してください'); return; }
  toast(`${selected.length}項目を再分析します…`);
  // Trigger know session restart for selected sections
  switchMyselfTab('know');
}

function shareCharacter(){
  const char = document.getElementById('my-character-card');
  const traits = char ? char.innerText : '';
  const vision = USER_PROFILE.vision || '';
  const text = `【MY CHARACTER】\n${traits}\n\nビジョン: ${vision}\n\n#GOALAI`;
  if(navigator.share){
    navigator.share({title:'MY CHARACTER - GOAL AI',text}).catch(()=>{});
  } else {
    navigator.clipboard.writeText(text).then(()=>toast('クリップボードにコピーしました'));
  }
}

// ─ MY CHARACTER (Vision tab) ─
function editMyCharacter(){
  const fields = [
    {id:'char-personality', label:'性格タイプ'},
    {id:'char-action-style', label:'行動スタイル'},
    {id:'char-core-value', label:'コアバリュー'},
    {id:'char-growth-edge', label:'成長エッジ'}
  ];
  fields.forEach(f => {
    const el = document.getElementById(f.id);
    const cur = el.textContent.trim() === '--' ? '' : el.textContent.trim();
    const val = prompt(f.label + 'を入力:', cur);
    if(val !== null && val.trim()) el.textContent = val.trim();
  });
}

// ─ ゴールとの連携 ─
let connectLoading = false;
async function runConnectAnalysis(){
  if(connectLoading) return;
  connectLoading = true;
  renderConnectContent(true);
  try{
    const goalsText = ALL_GOALS.map(g=>`・${g.title}（進捗${g.actual}%/目安${g.target}%）`).join('\n');
    const res = await fetch(`${WORKER_URL}/api/chat`,{
      method:'POST', headers:getAuthHeaders(),
      body: JSON.stringify({
        system:`あなたはコーチです。ユーザーのビジョン・強み・弱みと現在のゴールを照合し、以下のJSONで返してください：
{
  "goals": [
    {
      "goal": "ゴール名",
      "compatibility": 0〜100の整数（ビジョン・強み・弱みとの相性スコア）,
      "description": "なぜこの相性スコアか（強み/弱みとの関連を具体的に）",
      "advice": "AIアドバイス（改善策や活かし方）"
    }
  ],
  "ideas": [{"title":"ビジョンから生まれる新ゴール候補", "reason":"理由"}]
}
60%以下は警告色で表示される。日本語。JSONのみ出力。マークダウン不要。`,
        messages:[{role:'user', content:`ビジョン：${USER_PROFILE.vision||'未設定'}\n強み：${(USER_PROFILE.strengths||[]).join('・')||'未設定'}\n弱み：${(USER_PROFILE.weaknesses||[]).join('・')||'未設定'}\nゴール一覧：\n${goalsText}`}],
        maxTokens:700
      })
    });
    const data = await res.json();
    const raw = data.content?.map(b=>b.text||'').join('').trim();
    let parsed;
    try{ parsed = JSON.parse(raw); } catch(e){ parsed = null; }
    renderConnectContent(false, parsed);
  } catch(e){ renderConnectContent(false, null); }
  connectLoading = false;
}

function renderConnectContent(loading=false, data=null){
  const el = document.getElementById('connect-content');
  if(!el) return;
  if(loading){
    el.innerHTML = `<div style="display:flex;align-items:center;gap:8px;color:var(--muted2);font-size:12px;padding:20px 0;"><div class="typing-dots"><span></span><span></span><span></span></div> ビジョンとゴールを照合中…</div>`;
    return;
  }
  if(!data){ el.innerHTML = `<div style="color:var(--muted2);font-size:12px;padding:10px 0;">分析データがありません。「再分析」を押してください。</div>`; return; }
  let html = '';
  // 新形式: goals[] with compatibility bar (mockup準拠)
  if(data.goals?.length){
    data.goals.forEach(g=>{
      const pct = g.compatibility || 0;
      const isWarn = pct <= 60;
      const barColor = isWarn ? '#ef9f27' : 'var(--accent)';
      const pctColor = isWarn ? '#ef9f27' : 'var(--accent)';
      const goalSafe = (g.goal||'').replace(/'/g,"\\'");
      html += `<div class="connect-card" style="border-color:${isWarn?'rgba(239,159,39,0.3)':'var(--amber-d)'}">
        <div class="connect-card-hd">${g.goal}</div>
        <div class="connect-card-body">${g.description||''}</div>
        <div style="display:flex;align-items:center;gap:6px;margin:8px 0;">
          <span style="font-size:12px;color:var(--muted);">相性:</span>
          <div style="width:80px;height:4px;border-radius:2px;background:var(--muted3);overflow:hidden;">
            <div style="height:100%;width:${pct}%;border-radius:2px;background:${barColor};"></div>
          </div>
          <span style="font-size:12px;font-weight:500;color:${pctColor};">${pct}%</span>
        </div>
        ${g.advice?`<div style="padding:8px 10px;border-radius:6px;background:var(--amber-g);border:0.5px solid var(--amber-d);margin-top:6px;font-size:12px;color:var(--muted);line-height:1.5;">
          <div style="font-size:12px;font-weight:500;color:var(--amber);margin-bottom:3px;">${getLogoSVG(10)} AIアドバイス</div>${g.advice}
        </div>`:''}
        ${isWarn?`<div onclick="hubChatFromConnect('${goalSafe}','改善方法を教えて')" style="display:flex;align-items:center;gap:4px;padding:6px 12px;border-radius:6px;border:0.5px solid var(--amber-d);color:var(--accent);font-size:12px;cursor:pointer;width:fit-content;margin-top:6px;">→ 改善方法をAIに相談する</div>`:''}
      </div>`;
    });
  }
  // フォールバック: 旧形式 (checks/feedback) — パース失敗時の互換性維持
  else if(data.checks?.length || data.feedback?.length){
    if(data.checks?.length){
      html += `<div style="font-size:12px;letter-spacing:.15em;color:var(--muted2);font-family:var(--fm);margin-bottom:8px;">⚠ 確認項目</div>`;
      data.checks.forEach(c=>{
        html += `<div class="connect-card" style="border-color:${c.type==='warning'?'var(--red-d)':'var(--green-d)'}">
          <div class="connect-card-hd" style="color:${c.type==='warning'?'var(--red)':'var(--green)'}">${c.type==='warning'?'⚠':'✓'} ${c.goal}</div>
          <div class="connect-card-body">${c.message}</div>
        </div>`;
      });
    }
    if(data.feedback?.length){
      html += `<div style="font-size:12px;letter-spacing:.15em;color:var(--muted2);font-family:var(--fm);margin:16px 0 8px;">📊 フィードバック</div>`;
      data.feedback.forEach(f=>{
        html += `<div class="connect-card">
          <div class="connect-card-hd" style="color:${f.type==='ok'?'var(--green)':'var(--amber)'}">${f.type==='ok'?'✓':'⚠'} ${f.goal}</div>
          <div class="connect-card-body">${f.message}</div>
        </div>`;
      });
    }
  }
  // ideas（新旧共通）
  if(data.ideas?.length){
    html += `<div style="font-size:12px;letter-spacing:.15em;color:var(--muted2);font-family:var(--fm);margin:16px 0 8px;">◇ ビジョンから生まれるゴールアイデア</div>`;
    data.ideas.forEach(id=>{
      html += `<div class="connect-card">
        <div class="connect-card-hd" style="color:var(--know-purple)">◇ ${id.title}</div>
        <div class="connect-card-body">${id.reason}</div>
      </div>`;
    });
  }
  el.innerHTML = html || `<div style="color:var(--green);font-size:12px;padding:10px 0;">✓ ビジョンとゴールは整合しています</div>`;
}

function hubChatFromConnect(goalTitle, message){
  const idx = ALL_GOALS.findIndex(g=>g.title.includes(goalTitle.slice(0,6)));
  if(idx>=0){ openGoalHub(idx); return; }
  showPage('home');
}

// ─ プロフィール state helpers ─
let _profileSaveTimer = null;
function updateProfile(){
  const n = v => document.getElementById(v)?.value || '';
  USER_PROFILE.nickname    = n('mp-nickname');
  USER_PROFILE.name        = n('mp-name') || USER_PROFILE.name;
  // #122 FIX: occupationも読み取る
  const occSel = document.getElementById('mp-occupation');
  if(occSel) USER_PROFILE.occupation = occSel.value || '';
  USER_PROFILE.field       = n('mp-field');
  USER_PROFILE.family      = n('mp-family');
  USER_PROFILE.interestsFree = n('mp-interests-free');
  USER_PROFILE.strengths   = [...document.querySelectorAll('#mp-strengths .pf-chip.active')].map(c=>c.textContent.trim());
  USER_PROFILE.weaknesses  = [...document.querySelectorAll('#mp-weaknesses .pf-chip.active')].map(c=>c.textContent.trim());
  USER_PROFILE.interests   = [...document.querySelectorAll('#interest-chips .interest-chip.active')].map(c=>c.textContent.trim());
  USER_PROFILE.energyGain  = [...document.querySelectorAll('#energy-gain-tags .energy-tag')].map(t=>t.firstChild.textContent.trim());
  USER_PROFILE.energyDrain = [...document.querySelectorAll('#energy-drain-tags .energy-tag')].map(t=>t.firstChild.textContent.trim());
  // BUG-03: デバウンス3秒でサーバー自動保存（入力の度にAPIコールしない）
  clearTimeout(_profileSaveTimer);
  _profileSaveTimer = setTimeout(() => saveProfileToServer(), 3000);
}
function saveProfile(){
  updateProfile();
  // Update nickname and avatar in sidebar
  const displayName = USER_PROFILE.nickname || USER_PROFILE.name || '';
  const pn = document.querySelector('.prof-name');
  if(pn) pn.textContent = displayName;
  const avEl = document.getElementById('sb-avatar');
  if(avEl) avEl.textContent = displayName ? displayName.charAt(0) : '?';
  // BUG-03: サーバーに永続化（identity.profileフィールドに保存）
  saveProfileToServer();
  toast('プロフィールを保存しました。全AIチャットに反映済み ✓');
}

// BUG-03: プロフィール基本情報をサーバー+localStorageに保存
async function saveProfileToServer(){
  const profileData = {
    nickname: USER_PROFILE.nickname,
    name: USER_PROFILE.name,
    age: USER_PROFILE.age,
    gender: USER_PROFILE.gender,
    dob: USER_PROFILE.dob,
    occupation: USER_PROFILE.occupation,
    field: USER_PROFILE.field,
    family: USER_PROFILE.family,
    mbti: USER_PROFILE.mbti,
    strengths: USER_PROFILE.strengths,
    weaknesses: USER_PROFILE.weaknesses,
    interests: USER_PROFILE.interests,
    interestsFree: USER_PROFILE.interestsFree,
    energyGain: USER_PROFILE.energyGain,
    energyDrain: USER_PROFILE.energyDrain,
  };
  // localStorageバックアップ（同期復元用）
  try{ localStorage.setItem('goal_ai_profile', JSON.stringify(profileData)); }catch(e){}
  // サーバー保存（非同期）
  try{
    await saveIdentityToServer({ identity: { profile: profileData } });
  } catch(e){ console.warn('Profile server save failed', e); }
}

// BUG-03: localStorageからプロフィール復元（init時に同期的に呼ぶ）
function restoreProfileFromLocalStorage(){
  try{
    const saved = localStorage.getItem('goal_ai_profile');
    if(!saved) return;
    const p = JSON.parse(saved);
    if(p.nickname) USER_PROFILE.nickname = p.nickname;
    if(p.name) USER_PROFILE.name = p.name;
    if(p.age) USER_PROFILE.age = p.age;
    if(p.gender) USER_PROFILE.gender = p.gender;
    if(p.dob) USER_PROFILE.dob = p.dob;
    if(p.occupation) USER_PROFILE.occupation = p.occupation;
    if(p.field) USER_PROFILE.field = p.field;
    if(p.family) USER_PROFILE.family = p.family;
    if(p.mbti) USER_PROFILE.mbti = p.mbti;
    if(p.strengths?.length) USER_PROFILE.strengths = p.strengths;
    if(p.weaknesses?.length) USER_PROFILE.weaknesses = p.weaknesses;
    if(p.interests?.length) USER_PROFILE.interests = p.interests;
    if(p.interestsFree) USER_PROFILE.interestsFree = p.interestsFree;
    if(p.energyGain?.length) USER_PROFILE.energyGain = p.energyGain;
    if(p.energyDrain?.length) USER_PROFILE.energyDrain = p.energyDrain;
    renderMyselfProfile();
    // サイドバーにも反映
    const displayName = USER_PROFILE.nickname || USER_PROFILE.name || '';
    const pn = document.querySelector('.prof-name');
    if(pn) pn.textContent = displayName;
    const avEl = document.getElementById('sb-avatar');
    if(avEl) avEl.textContent = displayName ? displayName.charAt(0) : '?';
  }catch(e){}
}
function updateAge(){
  const dob = document.getElementById('mp-dob')?.value;
  if(!dob) return;
  const d = new Date(dob);
  const age = Math.floor((new Date()-d)/(365.25*86400000));
  USER_PROFILE.age = age;
  USER_PROFILE.dob = dob;
  const el = document.getElementById('mp-age-display');
  if(el) el.textContent = `${age}歳`;
}
function selGender(el, val){
  document.querySelectorAll('#mp-gender-group .nq-btn').forEach(b=>b.classList.remove('active-yes'));
  el.classList.add('active-yes');
  USER_PROFILE.gender = val;
}
function toggleInterest(el){
  el.classList.toggle('active');
  updateProfile();
}
function addEnergyTag(type){
  const inId = type==='gain'?'energy-gain-in':'energy-drain-in';
  const contId = type==='gain'?'energy-gain-tags':'energy-drain-tags';
  const inp = document.getElementById(inId);
  const text = inp?.value.trim(); if(!text) return;
  inp.value = '';
  const color = type==='gain'?'var(--green)':'var(--red)';
  const bg    = type==='gain'?'var(--green-d)':'var(--red-d)';
  const border= type==='gain'?'var(--green-d)':'var(--red-d)';
  const tag = document.createElement('span');
  tag.className = 'energy-tag';
  tag.style.cssText = `background:${bg};border:1px solid ${border};color:${color};`;
  tag.innerHTML = `${escapeHtml(text)} <span class="remove-x" onclick="this.parentElement.remove();updateProfile()">×</span>`;
  document.getElementById(contId)?.appendChild(tag);
  updateProfile();
}
function setNetworkQ(idx, val){
  const keys = ['canConsult','hasCheerleader','hasMentor','hasSafeBase'];
  USER_PROFILE.network[keys[idx]] = val;
  document.getElementById(`nq${idx}-yes`).className = 'nq-btn' + (val===true?' active-yes':'');
  document.getElementById(`nq${idx}-no`).className  = 'nq-btn' + (val===false?' active-no':'');
}
function renderMyselfProfile(){ /* HTML is static — just restore values from USER_PROFILE */
  const s = (id, v) => { const el=document.getElementById(id); if(el&&v) el.value=v; };
  s('mp-nickname', USER_PROFILE.nickname);
  s('mp-name',     USER_PROFILE.name);
  s('mp-dob',      USER_PROFILE.dob);
  s('mp-field',    USER_PROFILE.field);
  s('mp-family',   USER_PROFILE.family);
  const occSel = document.getElementById('mp-occupation');
  if(occSel) occSel.value = USER_PROFILE.occupation || '';
  const ageIn = document.getElementById('mp-age');
  if(ageIn && USER_PROFILE.age) ageIn.value = USER_PROFILE.age;
  const conIn = document.getElementById('mp-constraints');
  if(conIn) conIn.value = USER_PROFILE.constraints || '';
  s('mp-interests-free', USER_PROFILE.interestsFree);
  if(USER_PROFILE.dob) updateAge();
}

// ─ MBTI Test ─
// ════════ MBTI FULL VERSION (60-question, 4 dimensions × 15) ════════
const MBTI_QUICK = [
  {q:'初対面の人と話すとき、どちらに近いですか？',a:['自分から積極的に話しかける','相手から話しかけてくるのを待つ'],dim:'EI'},
  {q:'情報を集めるとき、どちらを重視しますか？',a:['具体的な事実・データ・経験','可能性・アイデア・直感'],dim:'SN'},
  {q:'決断するとき、どちらで判断しますか？',a:['論理・原則・客観的な分析','感情・価値観・人への影響'],dim:'TF'},
  {q:'日々の生活で、どちらが落ち着きますか？',a:['計画を立てて行動する','その場の流れに任せる'],dim:'JP'},
  {q:'エネルギーはどこから来ますか？',a:['人との交流・外の世界','一人の時間・内側の思考'],dim:'EI'},
  {q:'将来を考えるとき、何に惹かれますか？',a:['現実的にできることを積み上げる','まだ存在しない可能性を追う'],dim:'SN'},
  {q:'友人が悩んでいるとき、まず何をしますか？',a:['解決策を一緒に考える','気持ちを受け止めて共感する'],dim:'TF'},
  {q:'プロジェクトを進めるとき？',a:['最初に全体計画を立てる','動きながら考える'],dim:'JP'},
  {q:'パーティや飲み会の後、どう感じますか？',a:['楽しかった、もっといたかった','疲れた、一人になりたい'],dim:'EI'},
  {q:'新しいことを学ぶとき？',a:['細部から積み上げて全体を理解','全体像をつかんでから細部へ'],dim:'SN'},
];

const MBTI_FULL = [
  // E/I × 15
  {q:'週末の過ごし方として理想に近いのは？',a:['友達や仲間と賑やかに過ごす','自宅や静かな場所で一人の時間を楽しむ'],dim:'EI'},
  {q:'グループ作業のとき、自分はどちらに近い？',a:['積極的に発言してリードしようとする','じっくり聞いて、ここぞという時に話す'],dim:'EI'},
  {q:'初対面の人が多い場所では？',a:['自然と輪の中に入って話し始める','最初は様子を見て、慣れてから話す'],dim:'EI'},
  {q:'長電話やビデオ通話は？',a:['問題ない。むしろ楽しい','なるべく短く済ませたい'],dim:'EI'},
  {q:'考えを整理するとき、あなたは？',a:['誰かに話しながら考える','一人で静かに考えをまとめる'],dim:'EI'},
  {q:'仕事や勉強での集中スタイルは？',a:['周りの音や人の気配があった方がはかどる','静かな一人の空間でないと集中できない'],dim:'EI'},
  {q:'悩んでいるとき、どうすることが多い？',a:['信頼できる人に話して発散する','自分の中で消化してから、必要なら話す'],dim:'EI'},
  {q:'SNSや発信について？',a:['積極的に投稿・コメントする','主に見る側。発信は少ない'],dim:'EI'},
  {q:'長い沈黙は？',a:['気まずい。何か話そうとする','落ち着く。無理に埋めなくてよい'],dim:'EI'},
  {q:'人と過ごした後の感覚は？',a:['元気になる。もっといたかった','疲れる。一人でリチャージしたい'],dim:'EI'},
  {q:'会議やミーティングでは？',a:['その場でどんどん発言する','事前に考えて、整理してから話す'],dim:'EI'},
  {q:'知らない土地を旅するとき？',a:['地元の人と積極的に話して情報を得る','事前にリサーチして計画を立てる'],dim:'EI'},
  {q:'友人と過ごす時間と一人の時間、どちらが心地よい？',a:['友人と過ごす時間','一人の時間'],dim:'EI'},
  {q:'プレゼンや人前で話すことは？',a:['得意。むしろ好き','苦手。できれば避けたい'],dim:'EI'},
  {q:'感情や考えを言葉にして表現することは？',a:['自然にすぐ言葉になる','時間をかけてやっと言葉になる'],dim:'EI'},
  // S/N × 15
  {q:'仕事で大切にしているのはどちら？',a:['実績・実証された方法・確実な手順','アイデア・可能性・新しいやり方'],dim:'SN'},
  {q:'本を読むとき、好きなジャンルは？',a:['実用書・ノンフィクション・具体的な方法論','小説・哲学・抽象的な概念の本'],dim:'SN'},
  {q:'問題を解決するとき？',a:['まず現状の事実とデータを集める','まず可能性や仮説を広げて考える'],dim:'SN'},
  {q:'未来について考えるとき？',a:['現実的な計画・リスク管理が気になる','まだ見ぬ可能性・大きなビジョンが気になる'],dim:'SN'},
  {q:'細かいこと（数字・手順・ルール）への向き合い方は？',a:['重要。しっかり確認する','面倒。概要が分かれば十分'],dim:'SN'},
  {q:'新しいスキルを習得するとき？',a:['基礎から順番に着実に習得する','全体像をつかんでから、必要なところだけ深掘りする'],dim:'SN'},
  {q:'直感について？',a:['直感より証拠・実績を信頼する','直感は重要な情報源として活用する'],dim:'SN'},
  {q:'「今」と「未来」、どちらに意識が向きやすい？',a:['今・現実・目の前のこと','未来・可能性・まだ存在しないこと'],dim:'SN'},
  {q:'創造的な作業（デザイン・文章・企画）で重視するのは？',a:['具体的な成果・実現可能性','独自性・新しい視点・アイデアの面白さ'],dim:'SN'},
  {q:'会話で好きな話題は？',a:['具体的な出来事・体験・実用的な情報','仮説・哲学・「もしも」の話'],dim:'SN'},
  {q:'指示を受けるとき？',a:['具体的なステップを教えてほしい','方向性だけ示してもらえれば、やり方は自分で考える'],dim:'SN'},
  {q:'意思決定で重視するのは？',a:['過去の事例・統計・実績','直感・将来の可能性・独自判断'],dim:'SN'},
  {q:'ルーティンワークについて？',a:['安心感がある。一貫性があってよい','退屈。変化や新しいことの方が好き'],dim:'SN'},
  {q:'抽象的な概念や理論の話は？',a:['具体例がないと理解しにくい','概念そのものが面白い'],dim:'SN'},
  {q:'「木を見て森を見ず」「森を見て木を見ず」、どちらに近い？',a:['木（細部）に集中しがち','森（全体像）を見がち'],dim:'SN'},
  // T/F × 15
  {q:'友人が「仕事をやめようか迷っている」と相談してきたら？',a:['メリット・デメリットを一緒に整理する','まずどんな気持ちなのか、じっくり聞く'],dim:'TF'},
  {q:'重大な決断をするとき？',a:['客観的なデータと論理で判断する','自分や周囲への影響・感情も大事にする'],dim:'TF'},
  {q:'チームでミスがあったとき、まず何をする？',a:['原因を分析して再発防止策を考える','メンバーの気持ちに寄り添う'],dim:'TF'},
  {q:'議論で大切にしているのは？',a:['事実と論理。感情論は避けたい','相手の気持ちや関係性への配慮'],dim:'TF'},
  {q:'「正しいことを言う」と「相手の気持ちを守る」が衝突したら？',a:['正しいことを言う（柔らかく伝える工夫はする）','相手の気持ちを優先する（正論は後で）'],dim:'TF'},
  {q:'批判的なフィードバックを受けたとき？',a:['内容を冷静に分析して活かせるか考える','まず感情的にダメージを受ける'],dim:'TF'},
  {q:'職場・チームの雰囲気と業務効率、どちらを優先する？',a:['業務効率・成果','雰囲気・人間関係の調和'],dim:'TF'},
  {q:'映画を見て泣くことは？',a:['滅多にない','よくある'],dim:'TF'},
  {q:'ルールが理不尽だと感じたとき？',a:['論理的に問題提起する','波風を立てないよう従いつつ、内心モヤモヤする'],dim:'TF'},
  {q:'誰かを評価・採用するとき、重視するのは？',a:['スキル・実績・論理的思考力','人柄・チームへのフィット・誠実さ'],dim:'TF'},
  {q:'正直に言うと傷つくかもしれないとき？',a:['それでも正直に言うべき','相手への影響を考えて言い方を変えるか言わない'],dim:'TF'},
  {q:'自分が下した判断に誰かが異論を唱えたとき？',a:['根拠を示して論理的に説明する','相手の視点も取り込もうとする'],dim:'TF'},
  {q:'価値観の異なる人と仕事するとき？',a:['価値観より仕事の質・成果で評価する','価値観が合うかどうかが重要'],dim:'TF'},
  {q:'「冷たい」と言われることは？',a:['よくある（論理的なだけなのに）','滅多にない'],dim:'TF'},
  {q:'感情と論理、どちらで動くことが多い？',a:['論理','感情・直感'],dim:'TF'},
  // J/P × 15
  {q:'旅行の計画は？',a:['事前にしっかり計画・予約する','大まかに決めて、現地で決める'],dim:'JP'},
  {q:'締め切りに対する姿勢は？',a:['早めに終わらせてスッキリしたい','締め切り直前の方が集中できる'],dim:'JP'},
  {q:'仕事や家の片付け・整理整頓は？',a:['すぐやる。散らかっているのが落ち着かない','後でまとめてやる。多少散らかっていても気にならない'],dim:'JP'},
  {q:'カバンや机の中は？',a:['整理されている','カオス（どこに何があるかは分かる）'],dim:'JP'},
  {q:'複数のタスクを抱えているとき？',a:['優先順位をつけてリスト化する','その時の気分や流れで動く'],dim:'JP'},
  {q:'突然の予定変更は？',a:['ストレス。できれば事前に知りたい','対応できる。むしろ臨機応変が得意'],dim:'JP'},
  {q:'決断は？',a:['早めに決めてスッキリしたい','可能な限り選択肢を残しておきたい'],dim:'JP'},
  {q:'仕事の進め方は？',a:['早めに着手して計画通り進める','アイデアを練りながら直前に一気に仕上げる'],dim:'JP'},
  {q:'「マルチタスク」と「一つに集中」どちらが得意？',a:['一つずつ完了させる方が好き','複数を並行して進める方が好き'],dim:'JP'},
  {q:'未完了のタスクが残っているとき？',a:['頭から離れない。終わらせないと落ち着かない','まあいいか。後でやればいい'],dim:'JP'},
  {q:'長期プロジェクトで、最初の行動は？',a:['全体のスケジュールと工程表を作る','まずやりながら方向を定める'],dim:'JP'},
  {q:'柔軟性と計画性、どちらが大事？',a:['計画性','柔軟性'],dim:'JP'},
  {q:'ルーティンはある？',a:['朝・夜のルーティンが決まっている','その日によって違う。ルーティンは窮屈'],dim:'JP'},
  {q:'締め切りより早く終わったとき？',a:['達成感。よし次へ','余った時間でもっとよくできるか考える'],dim:'JP'},
  {q:'人生設計（5年後・10年後）について？',a:['具体的な計画・目標がある','おおまかなイメージはあるが、流れに任せる部分も多い'],dim:'JP'},
];


const MBTI_TYPES = {
  INTJ:{n:'建築家',d:'戦略的・独立的・完璧主義。長期ビジョンを描いて実行する。'},
  INTP:{n:'論理学者',d:'分析的・独創的・客観的。アイデアと理論を愛する。'},
  ENTJ:{n:'指揮官',d:'リーダーシップ・目標志向・カリスマ。困難も機会に変える。'},
  ENTP:{n:'討論者',d:'革新的・機転が利く・チャレンジ好き。可能性を探求する。'},
  INFJ:{n:'提唱者',d:'理想主義・共感力・決意が固い。世界をより良くしたい。'},
  INFP:{n:'仲介者',d:'詩的・親切・利他的。より良い世界を求める。'},
  ENFJ:{n:'主人公',d:'カリスマ・共感力・影響力。人を鼓舞して導く。'},
  ENFP:{n:'広報運動家',d:'熱狂的・創造的・社交的。可能性と人のつながりを信じる。'},
  ISTJ:{n:'管理者',d:'責任感・実直・誠実。伝統と秩序を重んじる。'},
  ISFJ:{n:'擁護者',d:'勤勉・温かい・信頼できる。大切な人を守る。'},
  ESTJ:{n:'幹部',d:'組織力・献身的・正直。社会の秩序を作る。'},
  ESFJ:{n:'領事館員',d:'思いやり・社交的・人気者。調和を大切にする。'},
  ISTP:{n:'巨匠',d:'大胆・実践的・実験好き。あらゆるツールを使いこなす。'},
  ISFP:{n:'冒険家',d:'柔軟・魅力的・好奇心旺盛。常に新しい可能性を探す。'},
  ESTP:{n:'起業家',d:'エネルギッシュ・鋭い・挑戦的。常に何かを行動している。'},
  ESFP:{n:'エンターテイナー',d:'自発的・エネルギッシュ・熱狂的。人生を楽しむ。'},
};
let mbtiMode = 'quick'; // 'quick' | 'full'
let mbtiAnswers = {};
let mbtiCurrentQ = 0;

function startMbtiTest(mode){
  mbtiMode = mode || 'quick';
  mbtiAnswers = {}; mbtiCurrentQ = 0;
  const wrap = document.getElementById('mbti-test-wrap');
  wrap.style.display = 'block';
  // Show mode toggle
  wrap.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:12px;align-items:center;">
      <div style="font-size:12px;color:var(--muted2);">診断モード：</div>
      <div onclick="startMbtiTest('quick')" style="padding:4px 11px;border-radius:5px;font-size:12px;cursor:pointer;border:1px solid ${mbtiMode==='quick'?'var(--mode-normal-border)':'var(--border2)'};background:${mbtiMode==='quick'?'var(--amber-g)':'transparent'};color:${mbtiMode==='quick'?'var(--amber)':'var(--muted2)'}">簡易（10問・2分）</div>
      <div onclick="startMbtiTest('full')" style="padding:4px 11px;border-radius:5px;font-size:12px;cursor:pointer;border:1px solid ${mbtiMode==='full'?'var(--mode-normal-border)':'var(--border2)'};background:${mbtiMode==='full'?'var(--amber-g)':'transparent'};color:${mbtiMode==='full'?'var(--amber)':'var(--muted2)'}">本格（60問・15分）</div>
    </div>
    <div class="mbti-progress-bar"><div class="mbti-progress-fill" id="mbti-prog" style="width:0%"></div></div>
    <div id="mbti-questions-area"></div>`;
  renderMbtiQuestion();
}

function renderMbtiQuestion(){
  const qs = mbtiMode==='full' ? MBTI_FULL : MBTI_QUICK;
  const area = document.getElementById('mbti-questions-area');
  const prog = document.getElementById('mbti-prog');
  if(!area) return;
  if(mbtiCurrentQ >= qs.length){
    const type = calcMbtiType(qs);
    const info = MBTI_TYPES[type] || {n:'',d:''};
    USER_PROFILE.mbti = type; USER_PROFILE.mbtiName = info.n;
    const badge = document.getElementById('mbti-current-badge');
    if(badge){ badge.textContent=type; }
    const nameEl = document.querySelector('.mbti-current-name');
    if(nameEl){ nameEl.textContent=info.n; }
    area.innerHTML = `<div class="mbti-result-card">
      <div style="font-size:12px;color:var(--muted2);font-family:var(--fm);margin-bottom:8px;">${mbtiMode==='full'?'本格診断':'簡易診断'}の結果</div>
      <div class="mbti-result-type">${type}</div>
      <div class="mbti-result-name">${info.n}</div>
      <div class="mbti-result-desc">${info.d}</div>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:16px;flex-wrap:wrap;">
        <button onclick="document.getElementById('mbti-test-wrap').style.display='none';saveProfile()" style="padding:8px 20px;background:var(--amber-g);border:1px solid var(--mode-normal-border);border-radius:8px;color:var(--amber);font-size:12px;cursor:pointer;font-family:var(--ff);">プロフィールに保存</button>
        ${mbtiMode==='quick'?`<button onclick="startMbtiTest('full')" style="padding:8px 16px;background:var(--bg3);border:1px solid var(--border2);border-radius:8px;color:var(--muted);font-size:12px;cursor:pointer;font-family:var(--ff);">本格診断（60問）で再診断</button>`:''}
      </div>
    </div>`;
    if(prog) prog.style.width='100%';
    return;
  }
  const q = qs[mbtiCurrentQ];
  if(prog) prog.style.width = (mbtiCurrentQ/qs.length*100)+'%';
  area.innerHTML = `<div class="mbti-q active">
    <div class="mbti-q-num">質問 ${mbtiCurrentQ+1} / ${qs.length}</div>
    <div class="mbti-q-text">${q.q}</div>
    <div class="mbti-opts">
      <div class="mbti-opt" onclick="answerMbti(0)">${q.a[0]}</div>
      <div class="mbti-opt" onclick="answerMbti(1)">${q.a[1]}</div>
    </div>
  </div>`;
}

function answerMbti(choice){
  const qs = mbtiMode==='full' ? MBTI_FULL : MBTI_QUICK;
  const q = qs[mbtiCurrentQ];
  if(!mbtiAnswers[q.dim]) mbtiAnswers[q.dim]={a:0,b:0};
  choice===0 ? mbtiAnswers[q.dim].a++ : mbtiAnswers[q.dim].b++;
  mbtiCurrentQ++;
  setTimeout(renderMbtiQuestion,100);
}

function calcMbtiType(qs){
  const pick=(dim,a,b)=>((mbtiAnswers[dim]?.a||0)>=(mbtiAnswers[dim]?.b||0))?a:b;
  return pick('EI','E','I')+pick('SN','N','S')+pick('TF','T','F')+pick('JP','J','P');
}


// ─ Gap Analysis ─
let gapLoading = false;
async function runGapAnalysis(){
  if(gapLoading) return;
  gapLoading = true;
  const el = document.getElementById('gap-analysis-content');
  if(!el) return;
  el.innerHTML = `<div style="display:flex;align-items:center;gap:8px;color:var(--muted2);font-size:12px;padding:16px 0;"><div class="typing-dots"><span></span><span></span><span></span></div> ゴール・ビジョン・プロフィールを照合中…</div>`;
  try{
    const ctx = buildAIContext();
    const res = await fetch(`${WORKER_URL}/api/chat`,{
      method:'POST', headers:getAuthHeaders(),
      body: JSON.stringify({
        system:`あなたはパーソナルコーチです。ユーザーのプロフィール・ビジョン・ゴール進捗を分析し、以下のJSONのみを返してください：
{"gaps":[{"title":"乖離タイトル","detail":"具体的な説明（2〜3文）","severity":"high|medium|low"}],
 "challenges":[{"title":"課題タイトル","detail":"具体的な取り組み方（2〜3文）","type":"action|mindset|skill"}],
 "quickwins":[{"title":"今週できること","detail":"具体的なアクション"}]}
JSONのみ。マークダウン不要。日本語。`,
        messages:[{role:'user', content:ctx}],
        maxTokens:800
      })
    });
    const data = await res.json();
    const raw = data.content?.map(b=>b.text||'').join('').trim();
    let parsed;
    try{ parsed = JSON.parse(raw); }catch(e){ parsed=null; }
    renderGapContent(parsed);
  }catch(e){ el.innerHTML='<div style="color:var(--muted2);font-size:12px;">エラーが発生しました。</div>'; }
  gapLoading = false;
}
function renderGapContent(data){
  const el = document.getElementById('gap-analysis-content');
  if(!el) return;
  if(!data){ el.innerHTML='<div style="color:var(--muted2);font-size:12px;padding:8px 0;">分析に失敗しました。再試行してください。</div>'; return; }
  const sev = {high:'var(--red)',medium:'var(--amber)',low:'var(--muted2)'};
  const typ = {action:'▲',mindset:'◆',skill:'■'};
  let html = '';
  if(data.gaps?.length){
    html += `<div style="font-size:12px;letter-spacing:.15em;color:var(--muted2);font-family:var(--fm);margin-bottom:9px;">現実との乖離</div>`;
    data.gaps.forEach(g=>{
      html += `<div style="background:var(--bg);border:1px solid var(--border);border-radius:9px;padding:13px 16px;margin-bottom:8px;border-left:3px solid ${sev[g.severity]||'var(--muted2)'};">
        <div style="font-size:12px;font-weight:500;color:var(--cream);margin-bottom:5px;">${g.title}</div>
        <div style="font-size:12px;color:var(--muted);line-height:1.7;">${g.detail}</div></div>`;
    });
  }
  if(data.challenges?.length){
    html += `<div style="font-size:12px;letter-spacing:.15em;color:var(--muted2);font-family:var(--fm);margin:14px 0 9px;">パーソナル課題提案</div>`;
    data.challenges.forEach(c=>{
      html += `<div style="background:var(--bg);border:1px solid var(--border);border-radius:9px;padding:13px 16px;margin-bottom:8px;">
        <div style="font-size:12px;font-weight:500;color:var(--cream);margin-bottom:5px;">${typ[c.type]||'◇'} ${c.title}</div>
        <div style="font-size:12px;color:var(--muted);line-height:1.7;">${c.detail}</div></div>`;
    });
  }
  if(data.quickwins?.length){
    html += `<div style="font-size:12px;letter-spacing:.15em;color:var(--green);font-family:var(--fm);margin:14px 0 9px;">→ 今週できること</div>`;
    data.quickwins.forEach(q=>{
      html += `<div style="background:var(--green-d);border:1px solid var(--green-d);border-radius:9px;padding:11px 15px;margin-bottom:7px;">
        <div style="font-size:12px;font-weight:500;color:var(--green);margin-bottom:4px;">${q.title}</div>
        <div style="font-size:12px;color:var(--muted);line-height:1.65;">${q.detail}</div></div>`;
    });
  }
  el.innerHTML = html || '<div style="color:var(--green);font-size:12px;padding:8px 0;">✓ 大きな乖離は検出されませんでした。このまま継続しましょう。</div>';
}

// ════════ AVATAR UPLOAD ════════

async function handleAvatarUpload(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    toast('画像は5MB以下にしてください');
    return;
  }
  try {
    const base64 = await cropToCircle(file, 200);
    updateAvatarDisplay(base64);
    await apiCall('/api/profile/avatar', 'POST', { avatar_base64: base64 });
    USER_PROFILE.avatar_base64 = base64;
    toast('プロフィール画像を更新しました');
  } catch(e) {
    toast('画像のアップロードに失敗しました');
  }
}

function cropToCircle(file, size) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function updateAvatarDisplay(base64) {
  const img = document.getElementById('profile-avatar-img');
  const text = document.getElementById('profile-avatar-text');
  if (!img || !text) return;
  if (base64) {
    img.src = base64;
    img.style.display = 'block';
    text.style.display = 'none';
  } else {
    img.style.display = 'none';
    text.style.display = 'flex';
    const name = USER_PROFILE.nickname || USER_PROFILE.name || '';
    if (name) {
      text.textContent = name.charAt(0);
    } else {
      text.innerHTML = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';
    }
  }
}

// ═══ AI理解度 折りたたみ ═══
function toggleCompletenessDetail() {
  const detail = document.getElementById('completeness-detail');
  const toggle = document.getElementById('completeness-toggle');
  if (!detail || !toggle) return;
  const isOpen = detail.style.display !== 'none';
  detail.style.display = isOpen ? 'none' : 'block';
  toggle.textContent = isOpen ? '↓ 詳細' : '↑ 閉じる';
}

function initProfileScrollHandler() {
  const container = document.querySelector('#myself-pane-profile') || document.querySelector('.profile-page');
  if (!container) return;
  container.addEventListener('scroll', () => {
    const detail = document.getElementById('completeness-detail');
    if (detail && detail.style.display !== 'none') {
      detail.style.display = 'none';
      const toggle = document.getElementById('completeness-toggle');
      if (toggle) toggle.textContent = '↓ 詳細';
    }
  }, { passive: true });
}

function initAvatarDisplay() {
  updateAvatarDisplay(USER_PROFILE.avatar_base64 || null);
}

// ═══ ES Module: expose to window ═══
Object.assign(window, {
  USER_PROFILE, buildAIContext, renderCharts, setChartPeriod,
  selRadio, selMBTI, saveGoal, openProfile, closeProfile, closeProfileOutside,
  WORRIES_SYS, initWorriesChat, appendWorryBubble, sendWorriesMsg,
  editWorriesSummary, worriesResize, worriesKey,
  delRoutine, cyclePri, addRoutine, editRoutine, renderRoutineList, renderSchedulingPref, saveRoutinesToServer, KNOW_THEMES,
  closeOnboarding, checkOnboarding,
  openMyselfHub, openProfileDirect, switchMyselfTab,
  startKnowSession, updateKnowChips, appendKnowMsg, sendKnowMsg,
  generateKnowSummary, applySummaryToProfile, saveIdentityToServer, loadIdentityFromServer,
  knowResize, knowKey, editVision, saveVision, renderVision, addVisionItem, editVisionField, editMyCharacter, shareCharacter, toggleReanalyzeChip, runReanalysis,
  renderQOLOnME, refreshQOLProposals, startQOLGoal,
  regenCatchcopy, runConnectAnalysis, renderConnectContent, hubChatFromConnect,
  updateProfile, saveProfile, saveProfileToServer, restoreProfileFromLocalStorage, updateAge, selGender, toggleInterest,
  addEnergyTag, setNetworkQ, renderMyselfProfile,
  MBTI_QUICK, MBTI_FULL, MBTI_TYPES,
  startMbtiTest, renderMbtiQuestion, answerMbti, calcMbtiType,
  runGapAnalysis, renderGapContent,
  handleAvatarUpload, cropToCircle, updateAvatarDisplay,
  toggleCompletenessDetail, initProfileScrollHandler, initAvatarDisplay,
  obNext
});

