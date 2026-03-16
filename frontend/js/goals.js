// ════════ STATE ════════
let spartanMode = false;
let mencareMode = false;
let mencareEndTime = null;
let mencareTimerInterval = null;
let curPage = 'chat';
// Legacy — kept for backward compatibility with applyModeUI references
let msgs = [];
let history = [];
let isLoading = false;
let isNewGoal = false;
let curGoal = '';
let calYear = 2026, calMonth = 2; // 0-indexed month

// ════════ TASK DATA ════════
const TASKS = [];

let taskFilter = 'all';
let selectedTask = null;
let selectedPhase = null;
let taskChatHistory = {};
let taskChatLoading = false;
let dragSrcIdx = null;
let dragSrcPhase = null;
let taskView = 'goal';     // 'goal' | 'today'
let activeGoalIdx = 0;     // which goal is selected in goal view

// ─ Multiple goals data (Supabaseから読み込み) ─
const ALL_GOALS = [];
// Sync TASKS ref so existing code still works
function getActiveGoalPhases(){
  return ALL_GOALS[activeGoalIdx]?.phases || TASKS;
}

// ─ View switching ─
function switchTaskView(view, el){
  taskView = view;
  document.querySelectorAll('.vs-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  closeTaskDetail();
  const ganttCont     = document.getElementById('gantt-container');
  const timeviewCont  = document.getElementById('timeview-container');
  const phaseList     = document.getElementById('phase-list');
  const taskFilter    = document.querySelector('.tasks-filter');
  const goalBar       = document.getElementById('goal-selector-bar');
  const todayBar      = document.getElementById('today-summary-bar');

  // Hide all first
  phaseList.style.display   = 'none';
  ganttCont.style.display   = 'none';
  timeviewCont.style.display= 'none';
  if(taskFilter) taskFilter.style.display = 'none';
  goalBar.style.display     = 'none';
  todayBar.style.display    = 'none';

  if(view === 'gantt'){
    ganttCont.style.display = 'flex';
    renderGoalSelectorBar();
    goalBar.style.display = '';
    renderGantt();
  } else if(view === 'goal'){
    phaseList.style.display = '';
    if(taskFilter) taskFilter.style.display = '';
    goalBar.style.display = '';
    renderGoalSelectorBar();
    renderTasks();
  } else {
    // today / 3days / week
    timeviewCont.style.display = 'flex';
    renderTaskTimeView(view);
  }
}

function renderTaskTimeView(view){
  const content = document.getElementById('timeview-content');
  content.innerHTML = '';
  const now = new Date();
  const todayStr = now.toISOString().slice(0,10);

  let endDate, label;
  if(view === 'today'){
    endDate = todayStr;
    label = '今日やること';
  } else if(view === '3days'){
    endDate = new Date(now.getTime() + 2*86400000).toISOString().slice(0,10);
    label = '3日間のタスク';
  } else {
    const day = now.getDay();
    const sunday = new Date(now);
    sunday.setDate(now.getDate() + (7 - (day===0?7:day)));
    endDate = sunday.toISOString().slice(0,10);
    label = '今週のタスク';
  }

  // Collect tasks
  const overdue=[], upcoming=[], inprogress=[], nodate=[];
  ALL_GOALS.forEach(goal => {
    goal.phases.forEach(phase => {
      phase.tasks.forEach(task => {
        if(task.status === 'done') return;
        const item = {task, phase, goal};
        if(task.status === 'current' && (!task.due || task.due > endDate)){
          inprogress.push(item);
        } else if(task.due && task.due < todayStr){
          overdue.push(item);
        } else if(task.due && task.due <= endDate){
          upcoming.push(item);
        } else if(view !== 'today' && task.status === 'current'){
          inprogress.push(item);
        }
      });
    });
  });

  const renderGroup = (items, title, color) => {
    if(!items.length) return;
    const hd = document.createElement('div'); hd.className = 'tv-group-hd';
    hd.innerHTML = `${title} <span>${items.length}件</span>`;
    hd.style.color = color;
    content.appendChild(hd);
    items.forEach(({task, phase, goal}) => {
      const row = document.createElement('div'); row.className = 'tv-task-row';
      const sc = {done:'var(--green)',current:'var(--amber)',todo:'var(--muted2)',blocked:'var(--red)'};
      row.innerHTML = `
        <div class="tv-status-dot" style="background:${sc[task.status]||'var(--muted2)'}"></div>
        <div class="tv-task-name ${task.status==='done'?'done':''}">${escapeHtml(task.title)}</div>
        <div class="tv-goal-tag" style="background:${goal.color}22;color:${goal.color};border:1px solid ${goal.color}44">${goal.title.slice(0,8)}…</div>
        <div class="tv-due">${task.due||''}</div>`;
      row.onclick = () => openTaskDetail(task, phase, goal);
      content.appendChild(row);
    });
  };

  renderGroup(overdue,   '⚠ 期限切れ',  'var(--red)');
  renderGroup(upcoming,  label,           'var(--cream)');
  renderGroup(inprogress,'🔵 進行中',     'var(--amber)');

  if(!overdue.length && !upcoming.length && !inprogress.length){
    content.innerHTML = `<div style="text-align:center;padding:60px 0;color:var(--muted2);font-size:12px;">
      ${view==='today'?'今日のタスクはありません 🎉':view==='3days'?'3日間タスクはありません':'今週のタスクはありません 🎉'}</div>`;
  }
}



function renderGoalSelectorBar(){
  const bar = document.getElementById('goal-selector-bar');
  bar.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'goal-sel-bar';
  ALL_GOALS.forEach((g, i) => {
    const chip = document.createElement('div');
    chip.className = 'goal-sel-chip' + (i===activeGoalIdx?' active':'');
    chip.innerHTML = `<span class="goal-sel-dot" style="background:${g.color}"></span>${escapeHtml(g.title)}`;
    chip.onclick = () => {
      activeGoalIdx = i;
      if(taskView === 'gantt'){ renderGoalSelectorBar(); renderGantt(); }
      else renderTasks();
    };
    wrap.appendChild(chip);
  });
  bar.appendChild(wrap);
}

function renderTodaySummaryBar(){
  const bar = document.getElementById('today-summary-bar');
  bar.style.display = '';
  const today = new Date().toISOString().slice(0,10);
  const todayTasks = getTodayTasks();
  const urgent = todayTasks.filter(t=>t.urgency==='urgent').length;
  const total = todayTasks.length;
  const done = todayTasks.filter(t=>t.task.status==='done').length;
  bar.innerHTML = `
    <div class="today-summary">
      <div class="today-stat">
        <div class="today-stat-val">${total}</div>
        <div class="today-stat-lbl">今日のタスク</div>
      </div>
      <div class="today-stat" style="border-color:rgba(224,104,104,.3)">
        <div class="today-stat-val" style="color:var(--red)">${urgent}</div>
        <div class="today-stat-lbl">期限切れ / 今日締切</div>
      </div>
      <div class="today-stat" style="border-color:rgba(93,184,150,.3)">
        <div class="today-stat-val" style="color:var(--green)">${done}</div>
        <div class="today-stat-lbl">完了済み</div>
      </div>
    </div>`;
}

// Get tasks to show in "today" view — overdue, due today, due this week, in-progress
function getTodayTasks(){
  const now = new Date();
  const todayStr = now.toISOString().slice(0,10);
  const weekLater = new Date(now.getTime() + 7*24*60*60*1000).toISOString().slice(0,10);
  const result = [];
  ALL_GOALS.forEach(goal => {
    goal.phases.forEach(phase => {
      phase.tasks.forEach(task => {
        if(task.status === 'done') return;
        let urgency = null;
        if(task.due && task.due < todayStr) urgency = 'urgent';
        else if(task.due === todayStr) urgency = 'urgent';
        else if(task.due && task.due <= weekLater) urgency = 'this-week';
        else if(task.status === 'current') urgency = 'in-progress';
        if(urgency) result.push({task, phase, goal, urgency});
      });
    });
  });
  // Sort: urgent first, then this-week, then in-progress
  const order = {urgent:0,'this-week':1,'in-progress':2};
  result.sort((a,b)=>(order[a.urgency]||9)-(order[b.urgency]||9));
  return result;
}



function setFilter(f, el){
  taskFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  renderTasks();
}

function renderTasks(){
  const container = document.getElementById('phase-list');
  container.innerHTML = '';

  if(taskView === 'today'){
    document.getElementById('goal-selector-bar').style.display = 'none';
    document.getElementById('today-summary-bar').style.display = '';
    renderTodaySummaryBar();
    renderTodayView(container);
  } else {
    document.getElementById('today-summary-bar').style.display = 'none';
    document.getElementById('goal-selector-bar').style.display = '';
    renderGoalSelectorBar();
    renderGoalView(container);
  }
}

function renderGoalView(container){
  const phases = getActiveGoalPhases();
  phases.forEach(phase => {
    const visible = phase.tasks.filter(t => {
      if(taskFilter === 'done') return t.status === 'done';
      if(taskFilter === 'active') return t.status !== 'done';
      return true;
    });
    if(visible.length === 0) return;

    const doneCnt = phase.tasks.filter(t=>t.status==='done').length;
    const pct = Math.round(doneCnt / phase.tasks.length * 100);
    const block = document.createElement('div');
    block.className = 'phase-block';

    const phd = document.createElement('div');
    phd.className = 'phase-hd';
    phd.innerHTML = `
      <div class="phase-num" style="background:rgba(255,255,255,.06);border:1px solid ${phase.phaseColor}33;color:${phase.phaseColor}">${phase.phase}</div>
      <div class="phase-title">${phase.phaseTitle}</div>
      <div class="phase-meta">${doneCnt}/${phase.tasks.length}</div>
      <div class="phase-prog">
        <div class="phase-prog-bar"><div class="phase-prog-fill" style="width:${pct}%;background:${phase.phaseColor}"></div></div>
        <span style="color:${phase.phaseColor};font-family:var(--fm);font-size:10px">${pct}%</span>
      </div>`;
    block.appendChild(phd);

    const taskWrap = document.createElement('div');
    taskWrap.dataset.phase = phase.phase;
    visible.forEach((task, ti) => taskWrap.appendChild(mkTaskRow(task, phase, ti, null)));
    const addRow = document.createElement('div');
    addRow.className = 'add-task-row';
    addRow.innerHTML = `<span style="font-size:14px">＋</span> タスクを追加`;
    addRow.onclick = () => addTask(phase.phase);
    taskWrap.appendChild(addRow);
    block.appendChild(taskWrap);
    container.appendChild(block);
  });
}

function renderTodayView(container){
  const groups = [
    {key:'urgent', label:'期限切れ・今日締切', color:'var(--red)'},
    {key:'this-week', label:'今週中', color:'var(--amber)'},
    {key:'in-progress', label:'進行中（締切なし）', color:'var(--blue)'},
  ];
  const allItems = getTodayTasks();
  if(allItems.length === 0){
    container.innerHTML = `<div style="text-align:center;padding:40px 0;color:var(--muted2);font-size:13px;">
      🎉 今日のタスクはすべて完了しています
    </div>`;
    return;
  }
  groups.forEach(g => {
    const items = allItems.filter(i => i.urgency === g.key);
    if(items.length === 0) return;
    const block = document.createElement('div');
    block.className = 'phase-block';
    const ghd = document.createElement('div');
    ghd.className = 'today-group-hd';
    ghd.innerHTML = `
      <span style="color:${g.color}">${g.label}</span>
      <span class="today-group-count" style="background:${g.color}22;color:${g.color}">${items.length}件</span>`;
    block.appendChild(ghd);
    items.forEach((item, ti) => {
      const row = mkTaskRow(item.task, item.phase, ti, item.goal);
      block.appendChild(row);
    });
    container.appendChild(block);
  });
}


function mkTaskRow(task, phase, idx, goal){
  const isDone = task.status === 'done';
  const isOverdue = task.due && !isDone && new Date(task.due) < new Date();
  const hasChat = task.chatLog && task.chatLog.length > 0;
  const isSelected = selectedTask && selectedTask.id === task.id;
  const priorityColor = task.priority==='high'?'var(--red)':task.priority==='mid'?'var(--amber)':'var(--border2)';

  const row = document.createElement('div');
  row.className = `task-row${isDone?' done-row':''}${isSelected?' selected':''}`;
  row.draggable = true;

  // In today view, show goal name badge; in goal view, show phase badge
  const contextBadge = goal
    ? `<span class="task-goal-label" style="background:${goal.color}22;color:${goal.color}">${escapeHtml(goal.title)}</span>`
    : `<span class="task-tag" style="background:${phase.phaseColor}1a;color:${phase.phaseColor}">Phase ${phase.phase}</span>`;

  row.innerHTML = `
    <div class="task-priority" style="background:${priorityColor}"></div>
    <div class="task-drag" title="ドラッグで並び替え">⠿</div>
    <div class="task-check">
      <div class="check-circle ${task.status}" onclick="cycleStatus(event,'${task.id}')">
        ${task.status==='done'?'✓':task.status==='blocked'?'!':''}
      </div>
    </div>
    <div class="task-content">
      <div class="task-title">${escapeHtml(task.title)}</div>
      <div class="task-meta-row">
        ${task.due?`<span class="task-due${isOverdue?' overdue':''}">${task.due}${isOverdue?' ⚠':''}</span>`:''}
        ${contextBadge}
        ${hasChat?`<span class="task-chat-badge">💬 ${Math.floor(task.chatLog.length/2)}件</span>`:''}
      </div>
      ${task.note?`<div class="task-note">${task.note}</div>`:''}
    </div>
    <div class="task-arrow">›</div>`;

  row.addEventListener('click', e => {
    if(e.target.classList.contains('check-circle')) return;
    openTaskDetail(task, phase);
  });
  row.addEventListener('dragstart', e => {
    dragSrcIdx = idx; dragSrcPhase = phase.phase;
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  row.addEventListener('dragend', () => row.classList.remove('dragging'));
  row.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect='move'; });
  row.addEventListener('drop', e => {
    e.preventDefault();
    if(dragSrcPhase !== phase.phase) return;
    const phases = getActiveGoalPhases();
    const phaseObj = phases.find(p=>p.phase===phase.phase);
    const srcTask = phaseObj.tasks.splice(dragSrcIdx, 1)[0];
    phaseObj.tasks.splice(idx, 0, srcTask);
    renderTasks();
    toast('順序を変更しました');
  });
  return row;
}

function cycleStatus(e, taskId){
  e.stopPropagation();
  const order = ['todo','current','done'];
  for(const goal of ALL_GOALS){
    for(const phase of goal.phases){
      const task = phase.tasks.find(t=>t.id===taskId);
      if(task){
        const i = order.indexOf(task.status);
        task.status = order[(i+1)%order.length];
        renderTasks();
        if(selectedTask && selectedTask.id === taskId)
          document.getElementById('tdp-status-sel').value = task.status;
        return;
      }
    }
  }
}

function addTask(phaseNum){
  const title = prompt('タスク名を入力してください:');
  if(!title) return;
  const phases = getActiveGoalPhases();
  const phase = phases.find(p=>p.phase===phaseNum);
  const newId = 't_' + Date.now();
  phase.tasks.push({id:newId, title, status:'todo', due:'', priority:'mid', note:'', chatLog:[]});
  renderTasks();
  toast('タスクを追加しました');
}

// ─── Task Detail Chat ───
function openTaskDetail(task, phase){
  selectedTask = task;
  selectedPhase = phase;
  document.getElementById('pg-tasks-layout').classList.add('detail-open');
  document.getElementById('task-detail-panel').style.display = 'flex';
  document.getElementById('tdp-phase').textContent = `Phase ${phase.phase} — ${phase.phaseTitle}`;
  document.getElementById('tdp-title').textContent = task.title;
  document.getElementById('tdp-due').textContent = task.due ? `📅 ${task.due}` : '';
  document.getElementById('tdp-status-sel').value = task.status;

  // Style status selector
  const statusColors = {todo:'var(--muted)',current:'var(--amber)',done:'var(--green)',blocked:'var(--red)'};
  const sel = document.getElementById('tdp-status-sel');
  sel.style.color = statusColors[task.status]||'var(--muted)';
  sel.style.borderColor = statusColors[task.status]||'var(--border2)';

  // Quick reply buttons
  const qbtns = document.getElementById('tdp-qbtns');
  qbtns.innerHTML = '';
  const quickReplies = [
    'このタスクの進め方を教えて',
    '詰まっているので助けて',
    '優先度を見直したい',
    '所要時間の目安は？',
  ];
  quickReplies.forEach(q=>{
    const b = document.createElement('div');
    b.className = 'tdp-qbtn'; b.textContent = q;
    b.onclick = ()=>{ document.getElementById('task-msg-in').value=q; sendTaskMsg(); };
    qbtns.appendChild(b);
  });

  renderTaskChat(task);
  renderTasks(); // re-render to show selected state
}

function closeTaskDetail(){
  document.getElementById('pg-tasks-layout').classList.remove('detail-open');
  document.getElementById('task-detail-panel').style.display = 'none';
  selectedTask = null;
  renderTasks();
}

function updateTaskStatus(val){
  if(!selectedTask) return;
  const statusColors = {todo:'var(--muted)',current:'var(--amber)',done:'var(--green)',blocked:'var(--red)'};
  const sel = document.getElementById('tdp-status-sel');
  sel.style.color = statusColors[val];
  sel.style.borderColor = statusColors[val];
  for(const phase of TASKS){
    const t = phase.tasks.find(t=>t.id===selectedTask.id);
    if(t){ t.status = val; selectedTask.status = val; renderTasks(); return; }
  }
}

function renderTaskChat(task){
  const chat = document.getElementById('tdp-chat');
  chat.innerHTML = '';

  // If no chat log, show intro message
  if(!task.chatLog || task.chatLog.length === 0){
    const intro = {
      role:'ai',
      content:`「${task.title}」について話しましょう。\n\nこのタスクに関してAIがサポートできます。進め方の相談・詰まった場所の壁打ち・優先度の見直しなど、何でも聞いてください。`,
    };
    chat.appendChild(mkTdpMsg(intro));
    return;
  }
  task.chatLog.forEach(m => chat.appendChild(mkTdpMsg(m)));
  chat.scrollTop = chat.scrollHeight;
}

function mkTdpMsg(m){
  const wrap = document.createElement('div');
  wrap.className = `tdp-msg ${m.role}`;
  const av = document.createElement('div');
  av.className = `tdp-av ${m.role}`;
  if(m.role==='ai'){av.innerHTML=getLogoSVG(14);}else{const ut=getUserAvatarText();if(ut)av.textContent=ut;else av.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z"/></svg>';}
  const bub = document.createElement('div');
  bub.className = 'tdp-bubble';
  bub.innerHTML = m.content.replace(/\n/g,'<br>');
  wrap.appendChild(av);
  wrap.appendChild(bub);
  return wrap;
}

async function sendTaskMsg(){
  if(!selectedTask || taskChatLoading) return;
  const inp = document.getElementById('task-msg-in');
  const text = inp.value.trim(); if(!text) return;
  inp.value = ''; tdpResize(inp);

  if(!selectedTask.chatLog) selectedTask.chatLog = [];
  selectedTask.chatLog.push({role:'user', content:text});

  const chat = document.getElementById('tdp-chat');
  chat.innerHTML = '';
  if(selectedTask.chatLog.length === 1){
    chat.appendChild(mkTdpMsg({role:'ai',content:`「${selectedTask.title}」について話しましょう。\n\nこのタスクに関してAIがサポートできます。`}));
  }
  selectedTask.chatLog.forEach(m=>chat.appendChild(mkTdpMsg(m)));
  chat.scrollTop = chat.scrollHeight;
  taskChatLoading = true;

  const taskSys = `あなたはGOAL AIのタスクコーチです。
ゴール：${curGoal}
対象タスク：「${selectedTask.title}」
フェーズ：${selectedPhase.phaseTitle}（Phase ${selectedPhase.phase}）
ステータス：${selectedTask.status}
期限：${selectedTask.due||'未設定'}
メモ：${selectedTask.note||'なし'}

このタスクに特化した具体的なアドバイスをしてください。
日本語・簡潔・現場の言葉で。一度に聞く質問は1つ。`;
  const taskHistory = (selectedTask.chatLog||[]).map(m=>({role:m.role==='ai'?'assistant':m.role, content:m.content}));

  // Custom bubble (tdp style, not standard msg)
  const tdpWrap = document.createElement('div'); tdpWrap.className = 'tdp-msg ai';
  const tdpBub = document.createElement('div'); tdpBub.className = 'tdp-bubble stream-bubble';
  tdpWrap.appendChild(tdpBub); chat.appendChild(tdpWrap); chat.scrollTop = chat.scrollHeight;

  await streamAI(
    { system: taskSys, messages: taskHistory, maxTokens: 800 },
    (t) => { tdpBub.innerHTML = renderMsgContent(t); chat.scrollTop = chat.scrollHeight; },
    (t) => { tdpBub.classList.remove('stream-bubble'); selectedTask.chatLog.push({role:'ai',content:t}); renderTasks(); },
    (e) => { tdpBub.classList.remove('stream-bubble'); tdpBub.textContent = 'エラーが発生しました。'; }
  );
  taskChatLoading = false;
}

function tdpResize(el) { chatResize(el, 80); }
function tdpKey(e) { chatKey(sendTaskMsg, e); }




// ════════ CALENDAR ════════
const calPersonalEvents = {};
let calPanelDate = null;
let calPanelKey  = null;
let calChatHistory = {};
let calChatLoading = false;

function calNav(d){
  calMonth+=d;
  if(calMonth>11){calMonth=0;calYear++;}
  if(calMonth<0){calMonth=11;calYear--;}
  renderCalendar();
}

function renderCalendar(){
  const lbl=document.getElementById('cal-month-lbl');
  lbl.textContent=`${calYear}年 ${calMonth+1}月`;
  const events=getCalEvents();
  const grid=document.getElementById('cal-grid');
  grid.innerHTML='';
  const dows=['日','月','火','水','木','金','土'];
  dows.forEach(d=>{const el=document.createElement('div');el.className='cal-dow';el.textContent=d;grid.appendChild(el);});

  const firstDay=new Date(calYear,calMonth,1).getDay();
  const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
  const daysInPrev=new Date(calYear,calMonth,0).getDate();
  const today=new Date();

  for(let i=0;i<firstDay;i++){
    const cell=document.createElement('div');cell.className='cal-cell other-month';
    const d=daysInPrev-firstDay+1+i;
    cell.innerHTML=`<div class="cal-date">${d}</div>`;
    grid.appendChild(cell);
  }
  for(let d=1;d<=daysInMonth;d++){
    const cell=document.createElement('div');
    cell.className='cal-cell';
    const isToday=today.getFullYear()===calYear&&today.getMonth()===calMonth&&today.getDate()===d;
    const isReview=d>=1&&d<=7;
    if(isToday)cell.classList.add('today');
    if(isReview){cell.classList.add('review-period');if(spartanMode)cell.classList.add('spartan-on');}
    cell.innerHTML=`<div class="cal-date">${d}</div><div class="cal-events"></div>`;
    const evKey=`${calYear}-${calMonth+1}-${d}`;
    const evList=(events[evKey]||[]).concat(calPersonalEvents[evKey]||[]);
    const evContainer=cell.querySelector('.cal-events');
    evList.forEach(ev=>{
      const el=document.createElement('div');
      el.className=`cal-ev ${ev.type}`;
      el.textContent=ev.text;
      el.onclick=(e)=>{e.stopPropagation();openCalPanel(d,evKey,ev);};
      evContainer.appendChild(el);
    });
    cell.onclick=()=>openCalPanel(d,evKey,null);
    grid.appendChild(cell);
  }
  const total=firstDay+daysInMonth;
  const remaining=(7-total%7)%7;
  for(let i=1;i<=remaining;i++){
    const cell=document.createElement('div');cell.className='cal-cell other-month';
    cell.innerHTML=`<div class="cal-date">${i}</div>`;
    grid.appendChild(cell);
  }
}

// ════════ CALENDAR PANEL ════════
function openCalPanel(day, evKey, focusEv){
  calPanelDate = day;
  calPanelKey  = evKey;
  const [y,m,d] = evKey.split('-');
  const dateObj = new Date(y, m-1, d);
  const label = dateObj.toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric',weekday:'short'});
  document.getElementById('cal-panel-date').textContent = label;

  // Events list
  const allEv = (getCalEvents()[evKey]||[]).concat(calPersonalEvents[evKey]||[]);
  const evEl = document.getElementById('cal-panel-events');
  if(allEv.length){
    const typeLabel = {task:'タスク',milestone:'マイルストーン',done:'完了',review:'レビュー',personal:'個人予定'};
    const typeColor = {task:'var(--blue)',milestone:'var(--amber)',done:'var(--green)',review:'var(--red)',personal:'var(--muted2)'};
    evEl.innerHTML = allEv.map(ev=>`
      <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);">
        <span style="width:6px;height:6px;border-radius:50%;background:${typeColor[ev.type]||'var(--muted2)'};flex-shrink:0;"></span>
        <span style="font-size:12px;color:var(--cream);flex:1;">${ev.text}</span>
        <span style="font-size:9px;color:var(--muted2);font-family:var(--fm);">${typeLabel[ev.type]||ev.type}</span>
      </div>`).join('');
  } else {
    evEl.innerHTML = '<div style="font-size:11px;color:var(--muted2);padding:8px 0;">この日の予定はありません</div>';
  }
  document.getElementById('cal-panel-subtitle').textContent = `予定 ${allEv.length}件`;

  // Init chat for this day
  if(!calChatHistory[evKey]) calChatHistory[evKey] = [];
  renderCalChat(evKey);

  // If no chat yet, send an AI opening
  if(calChatHistory[evKey].length === 0 && allEv.length > 0){
    const evSummary = allEv.map(e=>e.text).join('、');
    setTimeout(()=>autoGreetCalDay(evKey, label, evSummary), 300);
  }

  document.getElementById('cal-panel').style.transform = 'translateX(0)';
}

function closeCalPanel(){
  document.getElementById('cal-panel').style.transform = 'translateX(100%)';
  document.getElementById('cal-add-form').style.display = 'none';
}

function openAddEventForm(){
  const f = document.getElementById('cal-add-form');
  f.style.display = f.style.display==='none' ? 'block' : 'none';
  document.getElementById('cal-ev-title').focus();
}

function saveCalEvent(){
  const title = document.getElementById('cal-ev-title').value.trim();
  const type  = document.getElementById('cal-ev-type').value;
  if(!title || !calPanelKey) return;
  if(!calPersonalEvents[calPanelKey]) calPersonalEvents[calPanelKey]=[];
  calPersonalEvents[calPanelKey].push({type, text:title});
  document.getElementById('cal-ev-title').value = '';
  document.getElementById('cal-add-form').style.display = 'none';
  renderCalendar();
  openCalPanel(calPanelDate, calPanelKey, null);
}

function renderCalChat(evKey){
  const chat = document.getElementById('cal-chat');
  chat.innerHTML = '';
  (calChatHistory[evKey]||[]).forEach(m=>{
    const wrap=document.createElement('div');
    wrap.className=`tdp-msg ${m.role==='user'?'user':'ai'}`;
    wrap.innerHTML=`<div class="tdp-bubble">${m.content.replace(/\n/g,'<br>')}</div>`;
    chat.appendChild(wrap);
  });
  setTimeout(()=>chat.scrollTop=99999,50);
}

async function autoGreetCalDay(evKey, label, evSummary){
  if(calChatLoading) return;
  calChatLoading = true;
  try{
    const res = await fetch(`${WORKER_URL}/api/chat`,{
      method:'POST', headers:getAuthHeaders(),
      body: JSON.stringify({
        system:`${buildAIContext()}\n\nカレンダーの日付パネルを開いたとき、その日の予定に関して1〜2文でコンテキストに合った一言を言う。提案や質問でもよい。`,
        messages:[{role:'user',content:`日付：${label}、予定：${evSummary}`}],
        maxTokens:200
      })
    });
    const data=await res.json();
    const text=data.content?.map(b=>b.text||'').join('')||'';
    if(text){
      calChatHistory[evKey].push({role:'ai',content:text});
      renderCalChat(evKey);
    }
  }catch(e){}
  calChatLoading=false;
}

async function sendCalMsg(){
  if(calChatLoading||!calPanelKey) return;
  const inp=document.getElementById('cal-msg-in');
  const text=inp.value.trim(); if(!text) return;
  inp.value=''; inp.style.height='auto';
  calChatHistory[calPanelKey].push({role:'user',content:text});
  renderCalChat(calPanelKey); calChatLoading=true;
  const chat=document.getElementById('cal-chat');
  const allEv=(getCalEvents()[calPanelKey]||[]).concat(calPersonalEvents[calPanelKey]||[]);
  const evSummary=allEv.map(e=>e.text).join('、')||'予定なし';
  const calSys=`${buildAIContextCached()}\n\n対象日：${document.getElementById('cal-panel-date').textContent}\n予定：${evSummary}\n\nこの日の予定・スケジュール調整・方針についてのチャット。日程変更の提案は具体的に。3〜4文で。`;

  // Custom bubble (tdp style)
  const cWrap=document.createElement('div'); cWrap.className='tdp-msg ai';
  const cBub=document.createElement('div'); cBub.className='tdp-bubble stream-bubble';
  cWrap.appendChild(cBub); chat.appendChild(cWrap); chat.scrollTop=99999;
  try{
    await streamAI(
      { system:calSys, messages:calChatHistory[calPanelKey].slice(-12), maxTokens:400 },
      (t)=>{ cBub.innerHTML=renderMsgContent(t); chat.scrollTop=99999; },
      (t)=>{ cBub.classList.remove('stream-bubble'); calChatHistory[calPanelKey].push({role:'ai',content:t}); renderCalChat(calPanelKey); },
      (e)=>{ cBub.classList.remove('stream-bubble'); calChatHistory[calPanelKey].push({role:'ai',content:'エラーが発生しました。'}); renderCalChat(calPanelKey); }
    );
  }catch(e){
    calChatHistory[calPanelKey].push({role:'ai',content:'エラーが発生しました。'});
    renderCalChat(calPanelKey);
  }
  calChatLoading=false;
}
function calMsgKey(e) { chatKey(sendCalMsg, e); }


// ════════ GANTT CHART ════════
function renderGantt(){
  const inner = document.getElementById('gantt-inner');
  inner.innerHTML = '';

  const goal = ALL_GOALS[activeGoalIdx];
  if(!goal) return;

  // Calculate date range
  const start = new Date('2025-11-01');
  const end   = new Date(goal.deadline);
  const totalMs = end - start;
  const totalDays = totalMs / 86400000;

  // Month header
  const monthHd = document.createElement('div');
  monthHd.className = 'gantt-hd-row';
  const months = [];
  let cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while(cur <= end){
    months.push(new Date(cur));
    cur.setMonth(cur.getMonth()+1);
  }
  months.forEach(m => {
    const daysInMonth = new Date(m.getFullYear(), m.getMonth()+1, 0).getDate();
    const widthPct = (daysInMonth / totalDays * 100).toFixed(2);
    const lbl = document.createElement('div');
    lbl.className = 'gantt-month-lbl';
    lbl.style.width = widthPct + '%';
    lbl.textContent = `${m.getMonth()+1}月`;
    monthHd.appendChild(lbl);
  });
  inner.appendChild(monthHd);

  // Today line position
  const todayPct = Math.max(0, Math.min(100, (new Date() - start) / totalMs * 100));

  // Render phases + tasks
  goal.phases.forEach(phase => {
    // Phase group header
    const phd = document.createElement('div');
    phd.className = 'gantt-phase-hd';
    phd.innerHTML = `<span style="color:${phase.phaseColor}">${phase.phaseTitle}</span><div class="gantt-phase-hd-line"></div>`;
    inner.appendChild(phd);

    phase.tasks.forEach(task => {
      if(!task.due) return;
      const row = document.createElement('div');
      row.className = 'gantt-row';

      // Label
      const lbl = document.createElement('div');
      lbl.className = 'gantt-label';
      const statusDot = task.status==='done'?'✓':task.status==='current'?'●':'○';
      const statusColor = task.status==='done'?'var(--green)':task.status==='current'?'var(--amber)':'var(--muted2)';
      lbl.innerHTML = `<span style="color:${statusColor};font-size:10px;flex-shrink:0">${statusDot}</span><span title="${escapeHtml(task.title)}">${escapeHtml(task.title)}</span>`;

      // Bar track
      const track = document.createElement('div');
      track.className = 'gantt-bar-track';
      track.style.position = 'relative';

      // Today line
      const todayLine = document.createElement('div');
      todayLine.className = 'gantt-today-line';
      todayLine.style.left = todayPct + '%';
      track.appendChild(todayLine);

      // Task bar (estimate start = due - estimated duration based on priority)
      const dueDate = new Date(task.due);
      const durationDays = task.priority==='high'?21:task.priority==='mid'?14:7;
      const barStart = new Date(Math.max(start, dueDate - durationDays*86400000));
      const leftPct  = Math.max(0, (barStart - start) / totalMs * 100);
      const widthPct = Math.max(1, (dueDate - barStart) / totalMs * 100);

      const barColor = task.status==='done' ? 'var(--green)' : task.status==='current' ? phase.phaseColor : phase.phaseColor+'88';
      const textColor = task.status==='done' ? '#fff' : '#fff';

      const bar = document.createElement('div');
      bar.className = 'gantt-bar';
      bar.style.left  = leftPct.toFixed(2) + '%';
      bar.style.width = widthPct.toFixed(2) + '%';
      bar.style.background = barColor;
      bar.style.color = textColor;
      bar.style.opacity = task.status==='done' ? '0.7' : '1';
      bar.textContent = task.title;
      bar.onclick = () => openTaskDetail(task, phase);
      bar.title = `${task.title}\n期限: ${task.due}`;

      // For done tasks, add strikethrough overlay
      if(task.status==='done'){
        bar.style.textDecoration = 'line-through';
        bar.style.opacity = '0.6';
      }

      track.appendChild(bar);
      row.appendChild(lbl);
      row.appendChild(track);
      inner.appendChild(row);
    });
  });

  // Today marker legend
  const legend = document.createElement('div');
  legend.style.cssText = 'display:flex;align-items:center;gap:6px;margin-top:16px;font-size:10px;color:var(--muted2);font-family:var(--fm);';
  legend.innerHTML = `<span style="width:12px;height:1px;background:var(--amber);opacity:.7;display:inline-block"></span> 今日 (${new Date().toLocaleDateString('ja-JP',{month:'numeric',day:'numeric'})})　　クリックでタスク詳細を開けます`;
  inner.appendChild(legend);
}


// ════════ GOAL HUB ════════
let hubGoalIdx = 0;
let hubTab = 'chat';
const hubChatHistories = {}; // keyed by goal id
const hubChatMsgs = {};      // keyed by goal id
const hubMemos = {};         // keyed by goal id
let hubChatLoading = false;

function openGoalHub(idx){
  hubGoalIdx = idx;
  const goal = ALL_GOALS[idx];
  if(!goal) return;
  document.getElementById('home-chat-inner').innerHTML='';

  // Header
  document.getElementById('hub-title').textContent = goal.title;
  document.getElementById('hub-dot').style.background = goal.color;

  // Progress
  const isOk = goal.actual >= goal.target;
  const progActual = document.getElementById('hub-prog-actual');
  progActual.style.width = goal.actual + '%';
  progActual.style.background = isOk ? 'var(--green)' : 'var(--red)';
  document.getElementById('hub-prog-target').style.left = goal.target + '%';
  document.getElementById('hub-stat-pct').innerHTML =
    `<span style="color:${isOk?'var(--green)':'var(--red)'};font-weight:500">${goal.actual}%</span>` +
    `<span style="color:var(--muted2);font-size:9px"> / 目安${goal.target}%</span>`;

  // Deadline
  const hasDeadline = goal.deadline && goal.deadline !== 'null';
  if(hasDeadline){
    const deadline = new Date(goal.deadline);
    const daysLeft = Math.ceil((deadline - new Date()) / 86400000);
    document.getElementById('hub-stat-deadline').textContent = daysLeft > 0 ? `残り${daysLeft}日` : '期限超過';
  } else {
    document.getElementById('hub-stat-deadline').textContent = '期限未設定';
  }

  // Status chip - hide for new goals (actual=0, target=0) or no deadline
  const chipEl = document.getElementById('hub-status-chip');
  if(goal.actual === 0 && goal.target === 0){
    chipEl.innerHTML = '';
  } else if(!isOk){
    const diff = goal.target - goal.actual;
    chipEl.innerHTML = `<span class="hub-delay-chip">⚠ ${diff}%遅延</span>`;
  } else {
    chipEl.innerHTML = `<span class="hub-ok-chip">✓ 順調</span>`;
  }

  // Init chat for this goal if not exists
  if(!hubChatHistories[goal.id]) hubChatHistories[goal.id] = [];
  if(!hubChatMsgs[goal.id]) hubChatMsgs[goal.id] = [];
  if(!hubMemos[goal.id]) hubMemos[goal.id] = [];

  // Switch to hub page
  showPage('goal-hub');
  switchHubTab(hubTab === 'chat' ? 'chat' : hubTab);
  renderHubChat();
  renderHubTasks();
  renderHubAnalytics();
  renderHubMemo();
  renderHubSettings(goal);

  // Supabaseからチャット履歴読み込み（初回のみ）
  if (goal.supabaseId && hubChatMsgs[goal.id].length === 0 && AUTH_TOKEN) {
    apiLoadHistory(goal.supabaseId, 50).then(msgs => {
      if (msgs.length > 0 && hubChatMsgs[goal.id].length === 0) {
        msgs.reverse().forEach(m => {
          const time = new Date(m.created_at).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});
          hubChatMsgs[goal.id].push({ role: m.role==='assistant'?'ai':m.role, content:m.content, time });
          hubChatHistories[goal.id].push({ role:m.role, content:m.content });
        });
        renderHubChat();
      }
    });
  }
}

function switchHubTab(tab){
  hubTab = tab;
  document.querySelectorAll('.hub-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.hub-pane').forEach(p => p.classList.remove('active'));
  document.getElementById('htab-' + tab).classList.add('active');
  document.getElementById('hub-pane-' + tab).classList.add('active');
  if(tab === 'chat') setTimeout(() => {
    document.getElementById('hub-chat-wrap').scrollTop = 99999;
  }, 50);
}

// ─ Hub Chat ─
function renderHubChat(){
  const goal = ALL_GOALS[hubGoalIdx];
  const msgs = hubChatMsgs[goal.id] || [];
  const inner = document.getElementById('hub-chat-inner');
  inner.innerHTML = '';
  if(msgs.length === 0){
    inner.innerHTML = `<div style="text-align:center;padding:60px 0 20px;color:var(--muted2);font-size:12px;line-height:2;">
      <div style="font-size:36px;margin-bottom:8px;opacity:.4">${escapeHtml(goal.title[0])}</div>
      「${escapeHtml(goal.title)}」についてのチャット専用スペースです。<br>進め方・詰まり・アイデアなど何でも話せます。</div>`;
    return;
  }
  msgs.forEach(m => {
    const wrap = document.createElement('div'); wrap.className = `msg ${m.role}`; wrap.style.marginBottom = '18px';
    const av = document.createElement('div'); av.className = `msg-av ${m.role}`;
    if(m.role==='ai'){av.innerHTML=getLogoSVG(14);}else{const ut=getUserAvatarText();if(ut)av.textContent=ut;else av.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z"/></svg>';}
    const body = document.createElement('div'); body.className = 'msg-body';
    const bub = document.createElement('div'); bub.className = 'bubble';
    bub.innerHTML = renderMsgContent(m.content);
    const t = document.createElement('div'); t.className = 'msg-time'; t.textContent = m.time||'';
    body.appendChild(bub); body.appendChild(t); wrap.appendChild(av); wrap.appendChild(body);
    inner.appendChild(wrap);
  });
  setTimeout(() => { document.getElementById('hub-chat-wrap').scrollTop = 99999; }, 50);
}

const _hubLoading = {get v(){return hubChatLoading}, set v(x){hubChatLoading=x}};

async function sendHubMsg(){
  const goal = ALL_GOALS[hubGoalIdx];
  if(!goal) return;
  const goalId = goal.supabaseId || null;
  const _msgs = {get v(){return hubChatMsgs[goal.id]}, set v(x){}};
  const _hist = {get v(){return hubChatHistories[goal.id]}, set v(x){}};
  updateStreak();

  await sendChatMsg({
    inputId: 'hub-msg-in',
    innerElId: 'hub-chat-inner',
    scrollElId: 'hub-chat-wrap',
    loadingRef: _hubLoading,
    msgsRef: _msgs,
    historyRef: _hist,
    systemPrompt: () => `あなたはGOAL AIのゴール専用コーチです。\n\n${buildAIContextCached()}\n\n現在のゴール「${goal.title}」に特化して具体的に。3〜5文で簡潔に。`,
    goalId, messageType: 'hub_chat',
    resizeFn: hubMsgResize,
    enableDeepAnalysis: true,
    enableRouting: true,
    renderFn: () => renderHubChat(),
  });
}
function hubMsgResize(el) { chatResize(el, 110); }
function hubMsgKey(e) { chatKey(sendHubMsg, e); }

// ─ Hub Tasks ─
function renderHubTasks(){
  const goal = ALL_GOALS[hubGoalIdx];
  const inner = document.getElementById('hub-tasks-inner');
  inner.innerHTML = `<div class="section-hd" style="margin-bottom:16px">${escapeHtml(goal.title)} — タスク一覧</div>`;
  goal.phases.forEach(phase => {
    const ph = document.createElement('div');
    ph.style.marginBottom = '20px';
    const phHd = document.createElement('div');
    phHd.style.cssText = `display:flex;align-items:center;gap:8px;margin-bottom:10px;`;
    phHd.innerHTML = `
      <div style="width:4px;height:14px;background:${phase.phaseColor};border-radius:2px;"></div>
      <div style="font-size:12px;font-weight:500;color:var(--cream)">${phase.phaseTitle}</div>
      <div style="font-size:9px;font-family:var(--fm);padding:1px 7px;border-radius:4px;background:${phase.phaseColor}22;color:${phase.phaseColor}">
        ${phase.tasks.filter(t=>t.status==='done').length}/${phase.tasks.length}</div>`;
    ph.appendChild(phHd);
    phase.tasks.forEach(task => {
      const row = document.createElement('div');
      const statusColors = {done:'var(--green)',current:'var(--amber)',todo:'var(--muted2)',blocked:'var(--red)'};
      const statusLabels = {done:'✅ 完了',current:'🔵 進行中',todo:'⬜ 未着手',blocked:'🔴 ブロック'};
      row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--bg3);border:1px solid var(--border);border-radius:9px;margin-bottom:6px;cursor:pointer;transition:border-color .15s;';
      row.onmouseover = () => row.style.borderColor = 'var(--border2)';
      row.onmouseout  = () => row.style.borderColor = 'var(--border)';
      row.innerHTML = `
        <div style="width:7px;height:7px;border-radius:50%;background:${statusColors[task.status]||'var(--muted2)'};flex-shrink:0;"></div>
        <div style="flex:1;font-size:12px;color:var(--cream);${task.status==='done'?'text-decoration:line-through;opacity:.5':''}">${escapeHtml(task.title)}</div>
        <div style="font-size:9px;font-family:var(--fm);color:${statusColors[task.status]||'var(--muted2)'}">${statusLabels[task.status]||''}</div>
        <div style="font-size:9px;color:var(--muted2);font-family:var(--fm)">${task.due||''}</div>`;
      ph.appendChild(row);
    });
    inner.appendChild(ph);
  });
}

// ─ Hub Analytics ─
function renderHubAnalytics(){
  const goal = ALL_GOALS[hubGoalIdx];
  const inner = document.getElementById('hub-analytics-inner');
  const isOk = goal.actual >= goal.target;
  const diff = goal.target - goal.actual;
  const daysLeft = Math.ceil((new Date(goal.deadline) - new Date()) / 86400000);
  const projectedDays = diff > 0 ? Math.ceil(daysLeft * (100 - goal.actual) / (100 - goal.target + 0.01)) : daysLeft;

  inner.innerHTML = `
    <div class="section-hd" style="margin-bottom:20px">${escapeHtml(goal.title)} — 解析</div>

    <!-- 3 stat tiles -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;">
      <div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:14px 16px;text-align:center;">
        <div style="font-family:var(--fd);font-size:28px;font-weight:300;color:${isOk?'var(--green)':'var(--red)'}">${goal.actual}%</div>
        <div style="font-size:9px;color:var(--muted2);margin-top:3px;letter-spacing:.1em;font-family:var(--fm)">現在の進捗</div>
      </div>
      <div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:14px 16px;text-align:center;">
        <div style="font-family:var(--fd);font-size:28px;font-weight:300;color:var(--amber)">${goal.target}%</div>
        <div style="font-size:9px;color:var(--muted2);margin-top:3px;letter-spacing:.1em;font-family:var(--fm)">今日の目安</div>
      </div>
      <div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:14px 16px;text-align:center;">
        <div style="font-family:var(--fd);font-size:28px;font-weight:300;color:${daysLeft<30?'var(--red)':'var(--cream)'}">${daysLeft}</div>
        <div style="font-size:9px;color:var(--muted2);margin-top:3px;letter-spacing:.1em;font-family:var(--fm)">残り日数</div>
      </div>
    </div>

    <!-- Pace prediction -->
    <div style="background:${isOk?'var(--green-d)':'var(--red-d)'};border:1px solid ${isOk?'rgba(93,184,150,.3)':'rgba(224,104,104,.3)'};border-radius:10px;padding:16px 18px;margin-bottom:20px;">
      <div style="font-size:10px;letter-spacing:.12em;color:${isOk?'var(--green)':'var(--red)'};font-family:var(--fm);margin-bottom:8px;">
        ${isOk ? '✓ 現在のペースで順調' : '⚠ このペースが続くと…'}
      </div>
      ${isOk
        ? `<div style="font-size:12px;color:var(--cream);line-height:1.7">目安より<strong>${-diff}%</strong>先行しています。このままのペースなら予定より早く完了できます。</div>`
        : `<div style="font-size:12px;color:var(--cream);line-height:1.7">目安より<strong style="color:var(--red)">${diff}%遅延</strong>中です。現ペースでは期限内完了が厳しくなる可能性があります。毎週の作業量を<strong>${Math.ceil(diff/4)}%</strong>増やす必要があります。</div>`
      }
    </div>

    <!-- Phase progress bars -->
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:16px 18px;">
      <div style="font-size:10px;letter-spacing:.12em;color:var(--muted2);font-family:var(--fm);margin-bottom:14px;">フェーズ別進捗</div>
      ${goal.phases.map(ph => {
        const done = ph.tasks.filter(t=>t.status==='done').length;
        const total = ph.tasks.length;
        const pct = total ? Math.round(done/total*100) : 0;
        return `<div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <div style="font-size:11px;color:var(--cream)">${ph.phaseTitle}</div>
            <div style="font-size:10px;font-family:var(--fm);color:${ph.phaseColor}">${done}/${total}</div>
          </div>
          <div style="height:5px;background:var(--muted3);border-radius:3px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${ph.phaseColor};border-radius:3px;transition:width .4s;"></div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

// ─ Hub Memo ─
function openMemoEditor(){
  document.getElementById('hub-memo-editor').style.display = 'block';
  document.getElementById('memo-save-row').style.display = 'flex';
  document.getElementById('hub-memo-editor').focus();
}
function closeMemoEditor(){
  document.getElementById('hub-memo-editor').style.display = 'none';
  document.getElementById('memo-save-row').style.display = 'none';
  document.getElementById('hub-memo-editor').value = '';
}
function saveMemo(){
  const goal = ALL_GOALS[hubGoalIdx];
  const text = document.getElementById('hub-memo-editor').value.trim();
  if(!text) return;
  if(!hubMemos[goal.id]) hubMemos[goal.id] = [];
  hubMemos[goal.id].unshift({
    text, date: new Date().toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric'})
  });
  closeMemoEditor();
  renderHubMemo();
}
function renderHubMemo(){
  const goal = ALL_GOALS[hubGoalIdx];
  const list = document.getElementById('hub-memo-list');
  if(!list) return;
  const memos = hubMemos[goal.id] || [];
  list.innerHTML = '';
  if(memos.length === 0){
    list.innerHTML = `<div style="text-align:center;padding:30px 0;color:var(--muted2);font-size:12px;">メモがまだありません。気づきや考えを書き留めておきましょう。</div>`;
    return;
  }
  memos.forEach((m, i) => {
    const el = document.createElement('div'); el.className = 'memo-entry';
    el.innerHTML = `<div class="memo-entry-date">${m.date}</div><div class="memo-entry-text">${m.text.replace(/\n/g,'<br>')}</div>`;
    list.appendChild(el);
  });
}

// ─ Hub Settings ─
function renderHubSettings(goal){
  const titleIn = document.getElementById('hub-goal-title-in');
  const deadlineIn = document.getElementById('hub-goal-deadline-in');
  const kpiIn = document.getElementById('hub-goal-kpi-in');
  if(titleIn) titleIn.value = goal.title;
  if(deadlineIn) deadlineIn.value = goal.deadline;
  if(kpiIn) kpiIn.value = goal.kpi || '';
}
function saveHubGoalSettings(){
  const goal = ALL_GOALS[hubGoalIdx];
  goal.title = document.getElementById('hub-goal-title-in').value || goal.title;
  goal.deadline = document.getElementById('hub-goal-deadline-in').value || goal.deadline;
  toast('ゴール設定を保存しました ✓');
  // Supabaseに同期
  if (goal.supabaseId) {
    apiUpdateGoal(goal.supabaseId, { title: goal.title, targetDate: goal.deadline });
  }
  // Refresh hub header
  openGoalHub(hubGoalIdx);
}


// ════════ GOAL DELETE / ARCHIVE ════════
function confirmDeleteGoal(){
  const goal = ALL_GOALS[hubGoalIdx];
  if(!goal) return;
  const nameEl = document.getElementById('modal-delete-goal-name');
  if(nameEl) nameEl.textContent = goal.title;
  document.getElementById('modal-delete-goal').style.display='flex';
}
function closeDeleteModal(){
  document.getElementById('modal-delete-goal').style.display='none';
}
function executeDeleteGoal(){
  const idx = hubGoalIdx;
  const goal = ALL_GOALS[idx];
  if(!goal){ closeDeleteModal(); return; }

  // Supabaseから削除
  if (goal.supabaseId) {
    apiDeleteGoal(goal.supabaseId);
  }

  // Remove from array
  ALL_GOALS.splice(idx, 1);

  // Clean up associated state
  delete hubChatHistories[goal.id];
  delete hubChatMsgs[goal.id];
  delete hubMemos[goal.id];

  closeDeleteModal();

  // Rebuild sidebar goal cards
  renderSidebarGoals();

  // Go back to home
  showPage('home');
  toast(`「${goal.title}」を削除しました`);
}

function archiveGoal(reason){
  const goal = ALL_GOALS[hubGoalIdx];
  if(!goal) return;
  goal.archived = true;
  goal.archiveReason = reason;
  goal.archivedAt = new Date().toISOString();
  // Supabaseに同期
  if (goal.supabaseId) {
    apiUpdateGoal(goal.supabaseId, { status: 'archived' });
  }
  renderSidebarGoals();
  renderArchiveList();  // update count badge
  showPage('home');
  toast(reason==='done' ? `🏆「${goal.title}」を達成済みにしました！` : `「${goal.title}」をアーカイブしました`);
}

function renderSidebarGoals(){
  // Find the goals section in sidebar and rebuild
  const activeGoals = ALL_GOALS.filter(g => !g.archived);
  const section = document.getElementById('sb-goals-section');
  if(!section) return;

  // Remove existing goal cards (between nav-section and btn-add-goal)
  let next = section.nextElementSibling;
  while(next && !next.classList.contains('btn-add-goal') && !next.classList.contains('nav-section')){
    const tmp = next.nextElementSibling;
    next.remove();
    next = tmp;
  }

  // Re-insert updated cards
  const addBtn = document.querySelector('.btn-add-goal');
  activeGoals.forEach((g,i)=>{
    const isOk = g.actual >= g.target;
    const div = document.createElement('div');
    div.className='goal-card'; div.id=`gc-${i}`;
    div.onclick=()=>openGoalHub(ALL_GOALS.indexOf(g));
    div.innerHTML=`
      <div class="gc-title">${g.title}</div>
      <div class="gc-meta">
        <span id="gc-pct-${i}">${g.actual}%</span>
        <span style="color:var(--border2)">|</span>
        <span>${g.deadline ? '目標 '+new Date(g.deadline).toLocaleDateString('ja-JP',{month:'short',day:'numeric'}) : '期限未設定'}</span>
      </div>
      <div class="gc-progress">
        <div class="gc-prog-bar">
          <div class="gc-prog-target" style="left:${g.target}%;" title="今日の目安 ${g.target}%"></div>
          <div class="gc-prog-actual" style="width:${g.actual}%;background:${isOk?'var(--green)':'var(--red)'}"></div>
        </div>
        <div class="gc-prog-labels">
          <span style="color:var(--muted2)">実績 ${g.actual}%</span>
          <span style="color:${isOk?'var(--green)':'var(--amber)'}">目安 ${g.target}%${isOk?' ✓':' ▲'}</span>
        </div>
      </div>
      <div class="gc-hub-hint">→ ゴールハブを開く</div>`;
    addBtn.parentNode.insertBefore(div, addBtn);
  });

  // Show upgrade nudge if free + >1 goal attempted
  if(MEMBERSHIP.plan==='free' && ALL_GOALS.length >= 1) renderMembershipUI();
}

// Close modals on overlay click
document.addEventListener('click', e=>{
  if(e.target.id==='modal-delete-goal') closeDeleteModal();
  if(e.target.id==='modal-plan') closePlanModal();
});

async function init(){
  // Legacy chat vars cleared
  initHomePlaceholder();
  renderMembershipUI();
  updateNotifSettingUI();
  showPage('home');

  // Load streak from cookie
  try{ const s = getCookie('goal_streak'); if(s) STREAK = JSON.parse(s); renderStreak(); }catch(e){}

  // Stripe Checkout戻り処理
  const urlParams = new URLSearchParams(window.location.search);
  if(urlParams.get('checkout')==='success'){
    toast('決済が完了しました！プランが更新されます');
    window.history.replaceState({}, '', window.location.pathname);
    if(AUTH_TOKEN){
      setTimeout(()=>validateToken().then(data=>{
        if(data){ renderMembershipUI(); renderAPIKeySettings(); }
      }), 1500);
    }
  } else if(urlParams.get('checkout')==='cancel'){
    toast('決済がキャンセルされました');
    window.history.replaceState({}, '', window.location.pathname);
  }

  // Auto-register if no token
  if (!AUTH_TOKEN) await ensureAuth();

  // Validate saved token + load Supabase data on startup
  if (AUTH_TOKEN) {
    validateToken().then(data => {
      if (data) {
        renderMembershipUI();
        renderAPIKeySettings();
      }
    });
    // ゴールをSupabaseから読み込み
    const savedGoals = await apiLoadGoals();
    if (savedGoals.length > 0) {
      ALL_GOALS.length = 0;
      savedGoals.forEach(g => ALL_GOALS.push(g));
      renderSidebarGoals();
    }
    // ホームチャット履歴をSupabaseから読み込み
    const savedHistory = await apiLoadHistory(null, 100);
    if (savedHistory.length > 0) {
      homeMsgs = [];
      homeHistory = [];
      // 時系列順（created_at asc）に変換
      savedHistory.reverse().forEach(m => {
        const time = new Date(m.created_at).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});
        const date = new Date(m.created_at).toLocaleDateString('ja-JP',{month:'long',day:'numeric',weekday:'short'});
        homeMsgs.push({ role: m.role === 'assistant' ? 'ai' : m.role, content: m.content, time, date });
        homeHistory.push({ role: m.role, content: m.content });
      });
    }
  }
  renderHomeMsgs();
  // Show onboarding popup if "私をデザイン" not done
  setTimeout(()=> checkOnboarding(), 500);
  setTimeout(()=> renderAIUnderstanding(), 600);
}

// ════════ FEATURE 4: AI理解度 ════════
function renderAIUnderstanding(){
  const fields = [
    {key:'nickname', label:'ニックネーム', check:()=>!!USER_PROFILE.nickname},
    {key:'age', label:'年齢', check:()=>!!USER_PROFILE.age},
    {key:'occupation', label:'職業', check:()=>!!USER_PROFILE.occupation},
    {key:'field', label:'分野', check:()=>!!USER_PROFILE.field},
    {key:'mbti', label:'MBTI', check:()=>!!USER_PROFILE.mbti},
    {key:'strengths', label:'強み', check:()=>USER_PROFILE.strengths?.length>0},
    {key:'weaknesses', label:'弱み', check:()=>USER_PROFILE.weaknesses?.length>0},
    {key:'interests', label:'興味', check:()=>USER_PROFILE.interests?.length>0||!!USER_PROFILE.interestsFree},
    {key:'constraints', label:'制約', check:()=>!!USER_PROFILE.constraints},
    {key:'vision', label:'ビジョン', check:()=>!!USER_PROFILE.vision},
    {key:'worries', label:'悩み', check:()=>!!USER_PROFILE.worries},
    {key:'goals', label:'ゴール', check:()=>ALL_GOALS.filter(g=>!g.archived).length>0},
  ];
  const filled = fields.filter(f=>f.check()).length;
  const pct = Math.round(filled/fields.length*100);
  const pctEl = document.getElementById('ai-understand-pct');
  const numEl = document.getElementById('ai-understand-num');
  const itemsEl = document.getElementById('ai-understand-items');
  if(pctEl) pctEl.style.width = pct+'%';
  if(numEl) numEl.textContent = pct+'%';
  if(itemsEl){
    itemsEl.innerHTML = fields.map(f=>{
      const ok = f.check();
      return `<div class="ai-understand-item"><span class="label">${f.label}</span><span class="status" style="color:${ok?'var(--green)':'var(--muted2)'}">${ok?'✓ 設定済':'— 未設定'}</span></div>`;
    }).join('');
  }
}

// ════════ FEATURE 8: マイルストーン演出＆シェア ════════
function launchConfetti(){
  const colors = ['#e4b86a','#5db896','#9d78d8','#e8785e','#6aafe4'];
  for(let i=0;i<40;i++){
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.left = Math.random()*100+'vw';
    p.style.background = colors[Math.floor(Math.random()*colors.length)];
    p.style.animationDelay = Math.random()*1.5+'s';
    p.style.animationDuration = (2+Math.random()*1.5)+'s';
    p.style.borderRadius = Math.random()>0.5?'50%':'2px';
    p.style.width = (6+Math.random()*8)+'px';
    p.style.height = (6+Math.random()*8)+'px';
    document.body.appendChild(p);
    setTimeout(()=>p.remove(), 4000);
  }
}

function checkMilestone(goal){
  const milestones = [25,50,75,100];
  const prev = goal.lastMilestonePct || 0;
  for(const m of milestones){
    if(goal.actual >= m && prev < m){
      goal.lastMilestonePct = m;
      // Supabaseに永続化（goalIdがあればPATCH）
      if(goal.supabaseId && AUTH_TOKEN){
        fetch(`${WORKER_URL}/api/goals/${goal.supabaseId}`,{
          method:'PATCH', headers:getAuthHeaders(),
          body:JSON.stringify({lastMilestonePct:m})
        }).catch(()=>{});
      }
      showMilestoneCard(goal, m);
      return;
    }
  }
}

function showMilestoneCard(goal, pct){
  launchConfetti();
  const msgs = {25:'最初の一歩を踏み出した！🚀',50:'折り返し地点！ハーフウェイ達成 🎯',75:'あと少し！ゴールが見えてきた 🔥',100:'おめでとう！ゴール達成！🎉🎊'};
  const card = document.createElement('div');
  card.className = 'milestone-card';
  card.innerHTML = `
    <div style="font-size:28px;margin-bottom:8px;">${pct===100?'🏆':'🎯'}</div>
    <div style="font-size:16px;font-weight:600;color:var(--cream);margin-bottom:4px;">${escapeHtml(goal.title)}</div>
    <div style="font-size:13px;color:var(--amber);margin-bottom:4px;">${pct}% 達成！</div>
    <div style="font-size:12px;color:var(--muted);">${msgs[pct]}</div>
    <div class="share-btns">
      <button class="share-btn" onclick="shareMilestone('${goal.title.replace(/'/g,"\\'")}',${pct},'twitter')">𝕏 シェア</button>
      <button class="share-btn" onclick="shareMilestone('${goal.title.replace(/'/g,"\\'")}',${pct},'copy')">📋 コピー</button>
      <button class="share-btn" onclick="shareMilestone('${goal.title.replace(/'/g,"\\'")}',${pct},'native')">📤 共有</button>
    </div>`;
  const container = document.getElementById('home-chat-inner')||document.body;
  container.appendChild(card);
  setTimeout(()=>{if(card.parentNode)card.remove();}, 15000);
}

function shareMilestone(title, pct, method){
  const text = `【GOAL AI】「${title}」${pct}%達成！💪\n#GOALAI #目標達成`;
  if(method==='twitter'){
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,'_blank');
  } else if(method==='copy'){
    navigator.clipboard?.writeText(text).then(()=>toast('コピーしました'));
  } else if(method==='native' && navigator.share){
    navigator.share({title:'GOAL AI マイルストーン',text}).catch(()=>{});
  } else {
    navigator.clipboard?.writeText(text).then(()=>toast('コピーしました'));
  }
}

// ════════ FEATURE 9: 音声要約→タスク変換 ════════
function voiceSetFinalWithSummary(text){
  voiceSetFinal(text);
  if(text.length > 50){
    setTimeout(()=>proposeVoiceTask(text), 500);
  }
}

async function proposeVoiceTask(text){
  if(!AUTH_TOKEN) return;
  try{
    const res = await fetch(`${WORKER_URL}/api/chat`,{
      method:'POST',headers:getAuthHeaders(),
      body:JSON.stringify({system:'ユーザーの音声入力テキストから、具体的なタスク1つを抽出してJSON形式で返して。{\"title\":\"タスク名\",\"due\":\"YYYY-MM-DD\"}。タスクにならない場合は{\"skip\":true}を返して。',messages:[{role:'user',content:text}],maxTokens:100})
    });
    const data = await res.json();
    const content = data.content?.[0]?.text || data.content || '';
    const m = content.match(/\{[\s\S]*?\}/);
    if(!m) return;
    const parsed = JSON.parse(m[0]);
    if(parsed.skip) return;
    showVoiceTaskProposal(parsed.title, parsed.due);
  }catch(e){}
}

function showVoiceTaskProposal(title, due){
  const el = document.createElement('div');
  el.style.cssText = 'padding:10px 16px;background:var(--amber-g);border:1px solid rgba(228,184,106,.3);border-radius:10px;margin:8px 16px;font-size:12px;display:flex;align-items:center;gap:10px;';
  el.innerHTML = `<span style="flex:1;color:var(--cream);">📝 「${title}」をタスクに追加？</span>
    <button onclick="addVoiceTask('${title.replace(/'/g,"\\'")}','${due||''}');this.parentElement.remove();" style="padding:5px 12px;background:var(--amber);border:none;border-radius:6px;font-size:11px;color:var(--bg);cursor:pointer;font-family:var(--ff);">追加</button>
    <button onclick="this.parentElement.remove();" style="padding:5px 8px;background:none;border:1px solid var(--border2);border-radius:6px;font-size:11px;color:var(--muted);cursor:pointer;font-family:var(--ff);">✕</button>`;
  const inner = document.getElementById('home-chat-inner');
  if(inner) inner.appendChild(el);
}

function addVoiceTask(title, due){
  const activeGoals = ALL_GOALS.filter(g=>!g.archived && g.status!=='done');
  if(!activeGoals.length){ toast('まずゴールを作成してください'); return; }
  const goal = activeGoals[0];
  if(!goal.phases) goal.phases = [];
  if(!goal.phases.length) goal.phases.push({name:'タスク',tasks:[]});
  goal.phases[0].tasks.push({id:crypto.randomUUID?crypto.randomUUID():'t_'+Date.now(),title,status:'todo',due:due||'',priority:'medium'});
  saveGoals();
  toast('タスクを追加しました：'+title);
}

// ════════ FEATURE 11: 今日の1%マイクロタスク ════════
let _microTaskToday = null;
function renderMicroTask(){
  const el = document.getElementById('hs-micro-task');
  if(!el) return;
  const todayKey = new Date().toISOString().slice(0,10);
  const saved = _microTaskToday;
  if(saved && saved.date === todayKey){
    renderMicroTaskUI(el, saved);
    return;
  }
  // ゴールがなければ表示しない
  const activeGoals = ALL_GOALS.filter(g=>!g.archived && g.status!=='done');
  if(!activeGoals.length){ el.innerHTML=''; return; }
  // AIに今日の1%タスクを聞く
  el.innerHTML = `<div class="micro-task-card" style="padding:12px 16px;background:var(--amber-g);border:1px solid rgba(228,184,106,.2);border-radius:10px;margin-top:10px;">
    <div style="font-size:10px;color:var(--amber);font-weight:600;letter-spacing:.1em;margin-bottom:6px;">🎯 今日の1%</div>
    <div style="font-size:12px;color:var(--muted);">生成中…</div>
  </div>`;
  generateMicroTask(el, todayKey, activeGoals);
}

async function generateMicroTask(el, todayKey, goals){
  try{
    const goalNames = goals.map(g=>`${g.title}(${g.actual}%)`).join(', ');
    const res = await fetch(`${WORKER_URL}/api/chat`,{
      method:'POST',headers:getAuthHeaders(),
      body:JSON.stringify({system:'ゴール達成に向けて「今日やるべきたった1つの小さなアクション」を提案して。5分以内にできる具体的なもの。タスク名だけを1行で返して。説明不要。',messages:[{role:'user',content:`ゴール: ${goalNames}`}],maxTokens:60})
    });
    const data = await res.json();
    const content = (data.content?.[0]?.text || data.content || '').trim();
    if(!content){ el.innerHTML=''; return; }
    _microTaskToday = {date:todayKey, task:content, done:false};
    renderMicroTaskUI(el, _microTaskToday);
  }catch(e){ el.innerHTML=''; }
}

function renderMicroTaskUI(el, micro){
  el.innerHTML = `<div class="micro-task-card" style="padding:12px 16px;background:${micro.done?'rgba(93,184,150,.08)':'var(--amber-g)'};border:1px solid ${micro.done?'rgba(93,184,150,.2)':'rgba(228,184,106,.2)'};border-radius:10px;margin-top:10px;display:flex;align-items:center;gap:12px;transition:all .3s;">
    <div class="micro-check" onclick="completeMicroTask()" style="width:22px;height:22px;border-radius:50%;border:2px solid ${micro.done?'var(--green)':'var(--amber)'};display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;font-size:12px;background:${micro.done?'var(--green)':'transparent'};color:${micro.done?'var(--bg)':'transparent'};transition:all .3s;">${micro.done?'✓':''}</div>
    <div style="flex:1;">
      <div style="font-size:10px;color:${micro.done?'var(--green)':'var(--amber)'};font-weight:600;letter-spacing:.1em;margin-bottom:3px;">🎯 今日の1%</div>
      <div style="font-size:12.5px;color:var(--cream);${micro.done?'text-decoration:line-through;opacity:.6;':''}">${micro.task}</div>
    </div>
  </div>`;
}

function completeMicroTask(){
  if(!_microTaskToday || _microTaskToday.done) return;
  _microTaskToday.done = true;
  renderMicroTaskUI(document.getElementById('hs-micro-task'), _microTaskToday);
  launchConfetti();
  toast('1%達成！小さな一歩が大きな変化に 🎯');
}

// ════════ FEATURE 13: トリセツPDF出力 ════════
async function exportTorisetsuPDF(){
  if(typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined'){
    toast('PDF機能を読み込み中…しばらくお待ちください'); return;
  }
  toast('PDF生成中…');
  const p = USER_PROFILE;
  const name = p.nickname || p.name || 'ユーザー';
  const activeGoals = ALL_GOALS.filter(g=>!g.archived);

  // 一時的なHTMLコンテナを作成（日本語フォント対応）
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;padding:48px;background:#fff;font-family:"Hiragino Sans","Noto Sans JP",sans-serif;color:#333;line-height:1.8;';

  const section = (title, content) => `<div style="margin-bottom:20px;"><div style="font-size:16px;font-weight:700;color:#e4b86a;margin-bottom:8px;border-bottom:2px solid #e4b86a;padding-bottom:4px;">${title}</div><div style="font-size:13px;padding-left:4px;">${content}</div></div>`;

  let html = `<div style="text-align:center;margin-bottom:24px;">
    <div style="font-size:28px;font-weight:700;color:#e4b86a;letter-spacing:.15em;">GOAL AI</div>
    <div style="font-size:14px;color:#999;margin-top:4px;">— 自分のトリセツ —</div>
    <div style="font-size:12px;color:#bbb;margin-top:4px;">${new Date().toLocaleDateString('ja-JP')} 作成</div>
  </div>`;

  const info = [];
  if(name) info.push(`ニックネーム：${name}`);
  if(p.age) info.push(`年齢：${p.age}歳`);
  if(p.occupation) info.push(`職業：${p.occupation}`);
  if(p.field) info.push(`分野：${p.field}`);
  if(p.mbti) info.push(`MBTI：${p.mbti}（${p.mbtiName||''}）`);
  if(p.constraints) info.push(`制約：${p.constraints}`);
  if(info.length) html += section('基本情報', info.join('<br>'));

  if(p.strengths?.length) html += section('強み', p.strengths.map((s,i)=>`${i+1}. ${s}`).join('<br>'));
  if(p.weaknesses?.length) html += section('弱み', p.weaknesses.map((s,i)=>`${i+1}. ${s}`).join('<br>'));
  if(p.interests?.length) html += section('興味・関心', p.interests.join('、'));
  if(p.vision) html += section('ビジョン', p.vision);

  if(activeGoals.length){
    html += section('ゴール', activeGoals.map(g=>`● ${g.title}（進捗 ${g.actual}%）`).join('<br>'));
  }
  if(p.knowSummary) html += section('AIによるまとめ', p.knowSummary);

  html += `<div style="margin-top:32px;text-align:center;font-size:10px;color:#ccc;">Generated by GOAL AI — https://goal-ai-frontend.pages.dev</div>`;

  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {scale:2, useCORS:true, backgroundColor:'#ffffff'});
    document.body.removeChild(container);
    const {jsPDF} = window.jspdf;
    const imgW = 210; // A4 mm
    const imgH = canvas.height * imgW / canvas.width;
    const doc = new jsPDF({unit:'mm', format:'a4'});
    let posY = 0;
    const pageH = 297;
    // 複数ページ対応
    while(posY < imgH){
      if(posY > 0) doc.addPage();
      doc.addImage(canvas.toDataURL('image/jpeg',0.92), 'JPEG', 0, -posY, imgW, imgH);
      posY += pageH;
    }
    doc.save(`GOALAI_トリセツ_${name}.pdf`);
    toast('PDFをダウンロードしました');
  } catch(e){
    document.body.removeChild(container);
    toast('PDF生成に失敗しました');
    console.error('PDF error:', e);
  }
}

// ════════ FEATURE 18: 外部ツールエクスポート ════════
function openExportModal(){
  const activeGoals = ALL_GOALS.filter(g=>!g.archived);
  if(!activeGoals.length){ toast('エクスポートするゴールがありません'); return; }
  const goal = activeGoals.find(g=>g.id===currentGoalId) || activeGoals[0];
  const modal = document.createElement('div');
  modal.className = 'export-modal';
  modal.id = 'export-modal';
  modal.onclick = (e)=>{ if(e.target===modal) modal.remove(); };
  modal.innerHTML = `<div class="export-modal-inner">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <div style="font-size:14px;font-weight:600;color:var(--cream);">エクスポート</div>
      <button onclick="document.getElementById('export-modal').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px;">✕</button>
    </div>
    <div style="font-size:11px;color:var(--muted);margin-bottom:14px;">${goal.title}</div>
    <div style="display:flex;flex-direction:column;gap:8px;">
      <button class="export-opt" onclick="exportICS('${goal.title.replace(/'/g,"\\'")}');document.getElementById('export-modal').remove();" style="padding:12px 16px;background:var(--bg3);border:1px solid var(--border2);border-radius:10px;color:var(--cream);cursor:pointer;font-family:var(--ff);font-size:12px;text-align:left;transition:all .15s;" onmouseover="this.style.borderColor='var(--amber)'" onmouseout="this.style.borderColor='var(--border2)'">📅 Google Calendar (.ics)</button>
      <button class="export-opt" onclick="exportNotion();document.getElementById('export-modal').remove();" style="padding:12px 16px;background:var(--bg3);border:1px solid var(--border2);border-radius:10px;color:var(--cream);cursor:pointer;font-family:var(--ff);font-size:12px;text-align:left;transition:all .15s;" onmouseover="this.style.borderColor='var(--amber)'" onmouseout="this.style.borderColor='var(--border2)'">📝 Notion (Markdown)</button>
      <button class="export-opt" onclick="exportText();document.getElementById('export-modal').remove();" style="padding:12px 16px;background:var(--bg3);border:1px solid var(--border2);border-radius:10px;color:var(--cream);cursor:pointer;font-family:var(--ff);font-size:12px;text-align:left;transition:all .15s;" onmouseover="this.style.borderColor='var(--amber)'" onmouseout="this.style.borderColor='var(--border2)'">📋 テキストコピー</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
}

function exportICS(goalTitle){
  const goal = ALL_GOALS.find(g=>g.title===goalTitle) || ALL_GOALS.filter(g=>!g.archived)[0];
  if(!goal) return;
  let events = '';
  const tasks = [];
  (goal.phases||[]).forEach(phase=>{
    (phase.tasks||[]).forEach(task=>{
      if(task.status!=='done') tasks.push(task);
    });
  });
  if(!tasks.length){ toast('未完了タスクがありません'); return; }
  tasks.forEach(task=>{
    const due = task.due || new Date(Date.now()+7*86400000).toISOString().slice(0,10);
    const dtStart = due.replace(/-/g,'');
    const dtEnd = dtStart;
    const uid = (task.id||Math.random().toString(36))+'@goalai';
    events += `BEGIN:VEVENT\r\nUID:${uid}\r\nDTSTART;VALUE=DATE:${dtStart}\r\nDTEND;VALUE=DATE:${dtEnd}\r\nSUMMARY:${task.title}\r\nDESCRIPTION:GOAL AI - ${goal.title}\r\nEND:VEVENT\r\n`;
  });
  const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//GOAL AI//EN\r\nCALSCALE:GREGORIAN\r\n${events}END:VCALENDAR`;
  const blob = new Blob([ics],{type:'text/calendar'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `GOALAI_${goal.title}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('ICSファイルをダウンロードしました');
}

function exportNotion(){
  const goal = ALL_GOALS.find(g=>g.id===currentGoalId) || ALL_GOALS.filter(g=>!g.archived)[0];
  if(!goal) return;
  let md = `# ${goal.title}\n\n`;
  md += `**Why:** ${goal.why||'-'}\n\n`;
  md += `**Progress:** ${goal.actual}%\n\n`;
  md += `---\n\n`;
  (goal.phases||[]).forEach(phase=>{
    md += `## ${phase.name}\n\n`;
    (phase.tasks||[]).forEach(task=>{
      const check = task.status==='done'?'x':' ';
      md += `- [${check}] ${task.title}${task.due?' ('+task.due+')':''}\n`;
    });
    md += '\n';
  });
  navigator.clipboard?.writeText(md).then(()=>toast('Markdownをコピーしました（Notionに貼り付け）'));
}

function exportText(){
  const goal = ALL_GOALS.find(g=>g.id===currentGoalId) || ALL_GOALS.filter(g=>!g.archived)[0];
  if(!goal) return;
  let text = `【${goal.title}】\n`;
  text += `理由: ${goal.why||'-'}\n`;
  text += `進捗: ${goal.actual}%\n\n`;
  (goal.phases||[]).forEach(phase=>{
    text += `■ ${phase.name}\n`;
    (phase.tasks||[]).forEach(task=>{
      text += `  ${task.status==='done'?'✓':'○'} ${task.title}${task.due?' ('+task.due+')':''}\n`;
    });
    text += '\n';
  });
  navigator.clipboard?.writeText(text).then(()=>toast('テキストをコピーしました'));
}
