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
      <div class="today-stat" style="border-color:var(--red-d)">
        <div class="today-stat-val" style="color:var(--red)">${urgent}</div>
        <div class="today-stat-lbl">期限切れ / 今日締切</div>
      </div>
      <div class="today-stat" style="border-color:var(--green-d)">
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



let weightSortActive = false;

function setFilter(f, el){
  taskFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  renderTasks();
}

function toggleWeightSort(el){
  weightSortActive = !weightSortActive;
  el.classList.toggle('active', weightSortActive);
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
  // First-time task hint (P-32)
  if(!localStorage.getItem('task_hint_shown') && container.children.length > 0){
    localStorage.setItem('task_hint_shown','1');
    const hint = document.createElement('div');
    hint.className = 'task-hint-banner';
    hint.textContent = 'タップで詳細・長押しで並べ替え';
    hint.onclick = () => hint.remove();
    container.prepend(hint);
    setTimeout(()=>hint.remove(), 5000);
  }
}

function renderGoalView(container){
  // 'life' and 'goal' filters: check active goal's type
  const activeGoal = ALL_GOALS[activeGoalIdx];
  if(taskFilter === 'life' && activeGoal && activeGoal.type !== 'life') return;
  if(taskFilter === 'goal' && activeGoal && activeGoal.type === 'life') return;

  const phases = getActiveGoalPhases();
  phases.forEach(phase => {
    let visible = phase.tasks.filter(t => {
      if(taskFilter === 'done') return t.status === 'done';
      if(taskFilter === 'active') return t.status !== 'done';
      return true;
    });
    // Weight sort: sort by task.weight descending (higher weight first)
    if(weightSortActive){
      visible = visible.slice().sort((a,b) => (b.weight||0) - (a.weight||0));
    }
    if(visible.length === 0) return;

    const doneCnt = phase.tasks.filter(t=>t.status==='done').length;
    const pct = Math.round(doneCnt / phase.tasks.length * 100);
    const block = document.createElement('div');
    block.className = 'phase-block';

    const phd = document.createElement('div');
    phd.className = 'tgroup';
    phd.innerHTML = `<span class="tgroup-icon">${phase.icon||''}</span>${phase.phaseTitle}<div class="tgroup-prog"><div class="tgroup-prog-fill" style="width:${pct}%"></div></div>`;
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
  const isSelected = selectedTask && selectedTask.id === task.id;

  const row = document.createElement('div');
  row.className = `tc${isDone?' done-tc':''}${isSelected?' sel':''}${isOverdue?' overdue':''}`;
  row.draggable = true;

  // Weight tag
  const wt = task.priority==='high'?'<span class="tw twr">重要</span>':task.priority==='mid'?'<span class="tw twy">普通</span>':'<span class="tw twg">軽い</span>';
  // Due date
  const dueHtml = task.due ? `<span class="td${isOverdue?' tdo':''}">${isOverdue?'期限切れ':task.due}</span>` : '<span class="td">—</span>';
  // AI badge
  const aiHtml = task.source==='ai' ? '<span class="tai">✨</span>' : '';
  // Recurrence
  const repHtml = task.repeat ? `<span class="trp">🔁${task.repeat}</span>` : '';

  row.innerHTML = `
    <div class="tch${isDone?' done':''}" onclick="cycleStatus(event,'${task.id}')">${isDone?'':''}${''}</div>
    <div class="tt${isDone?' dn':''}">${escapeHtml(task.title)}</div>
    ${aiHtml}${wt}${repHtml}${dueHtml}`;

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
      content:`「${task.title}」について話しましょう。\n\nこのタスクに関してAIがサポートできます。進め方の相談・詰まった場所のソクラテス対話・優先度の見直しなど、何でも聞いてください。`,
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

  try{
    await streamAI(
      { system: taskSys, messages: taskHistory, maxTokens: 800 },
      (t) => { tdpBub.innerHTML = renderMsgContent(t); chat.scrollTop = chat.scrollHeight; },
      (t) => { tdpBub.classList.remove('stream-bubble'); selectedTask.chatLog.push({role:'ai',content:t}); renderTasks(); },
      (e) => { tdpBub.classList.remove('stream-bubble'); tdpBub.textContent = 'エラーが発生しました。'; }
    );
  }catch(e){
    tdpBub.classList.remove('stream-bubble'); tdpBub.textContent = 'エラーが発生しました。';
  }finally{
    taskChatLoading = false;
  }
}

function tdpResize(el) { chatResize(el, 80); }
function tdpKey(e) { chatKey(sendTaskMsg, e); }




// ════════ CALENDAR (v3 — redesigned month grid) ════════
const calPersonalEvents = {};
let calPanelDate = null;
let calPanelKey  = null;
let calChatHistory = {};
let calView = 'month'; // month | week | day
let calSelectedDay = null;
let calFilterGoal = -1;
let calChatLoading = false;

const GOAL_COLORS = ['#FF6B6B','#4ECDC4','#45B7D1','#F7B731','#A55EEA','#26DE81','#FC5C65','#778CA3'];
function getGoalColor(idx){ return GOAL_COLORS[idx % GOAL_COLORS.length]; }

// ── B-16: Japanese holidays ──
function getJapaneseHoliday(year, month, day) {
  // month is 0-indexed
  const m = month + 1;
  const holidays = {
    '1-1':'元日','1-2':'振替休日','1-13':'成人の日','2-11':'建国記念の日','2-23':'天皇誕生日',
    '3-20':'春分の日','3-21':'春分の日','4-29':'昭和の日','5-3':'憲法記念日','5-4':'みどりの日',
    '5-5':'こどもの日','7-21':'海の日','8-11':'山の日','9-15':'敬老の日','9-23':'秋分の日',
    '10-13':'スポーツの日','11-3':'文化の日','11-23':'勤労感謝の日'
  };
  return holidays[m+'-'+day] || null;
}

// Legacy compat alias
function getHoliday(m,d){ return getJapaneseHoliday(0, m-1, d) || ''; }

function getRokuyo(year, month, day) {
  // Simplified Rokuyo calculation (month is 0-indexed)
  const rokuyoNames = ['大安','赤口','先勝','友引','先負','仏滅'];
  const idx = (month + 1 + day) % 6;
  return rokuyoNames[idx];
}

// ── B-1: Month grid view ──
function getTasksForMonth(year, month) {
  const tasks = [];
  ALL_GOALS.forEach((g, gi) => {
    if (g.archived) return;
    if (!g.phases) return;
    g.phases.forEach(phase => {
      if (!phase.tasks) return;
      phase.tasks.forEach(task => {
        const dl = task.deadline || task.due;
        if (!dl) return;
        const d = new Date(dl);
        if (d.getFullYear() === year && d.getMonth() === month) {
          tasks.push({
            title: task.title, date: dl.slice(0,10),
            done: task.done || task.status === 'done', color: getGoalColor(gi),
            goalTitle: g.title, source: task.source || 'user',
            taskId: task.id, goalId: g.id, goalIdx: gi
          });
        }
      });
    });
  });
  return tasks;
}

function renderCalendar(){
  const container = document.getElementById('cal-container');
  if (!container) return;
  const now = new Date();
  if (calYear === undefined) { calYear = now.getFullYear(); calMonth = now.getMonth(); }

  const first = new Date(calYear, calMonth, 1);
  const last = new Date(calYear, calMonth + 1, 0);
  const startDay = first.getDay(); // 0=Sun
  const daysInMonth = last.getDate();
  const daysInPrev = new Date(calYear, calMonth, 0).getDate();
  const today = now.getDate();
  const isCurrentMonth = (calYear === now.getFullYear() && calMonth === now.getMonth());
  const todayStr = now.toISOString().slice(0,10);

  const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  const dayNames = ['日','月','火','水','木','金','土'];

  // Get tasks for this month from ALL_GOALS
  let monthTasks = getTasksForMonth(calYear, calMonth);
  if (calFilterGoal >= 0) monthTasks = monthTasks.filter(t => t.goalIdx === calFilterGoal);

  let html = `<div class="cal-header">
    <button class="cal-nav-btn" onclick="calPrev()">‹</button>
    <span class="cal-month">${calYear}年${monthNames[calMonth]}</span>
    <button class="cal-nav-btn" onclick="calNext()">›</button>
    <button class="cal-today-btn" onclick="calToday()">今日</button>
  </div>`;

  // Goal progress bars
  if (ALL_GOALS.length > 0) {
    html += '<div class="cal-progress-area">';
    ALL_GOALS.forEach((g, i) => {
      if (g.archived) return;
      const pct = g.target > 0 ? Math.round(g.actual / g.target * 100) : (g.actual || 0);
      const color = getGoalColor(i);
      const activeClass = calFilterGoal === i ? ' cal-goal-bar-active' : '';
      html += `<div class="cal-goal-bar${activeClass}" onclick="filterCalByGoal(${i})">
        <span class="cal-goal-dot" style="background:${color}"></span>
        <span class="cal-goal-name">${escapeHtml((g.title||'').slice(0,10))}</span>
        <div class="cal-goal-prog"><div class="cal-goal-prog-fill" style="width:${Math.min(pct,100)}%;background:${color}"></div></div>
        <span class="cal-goal-pct">${pct}%</span>
      </div>`;
    });
    html += '</div>';
  }

  // View tabs
  html += `<div class="cal-view-tabs">
    <button class="cal-view-btn ${calView==='month'?'active':''}" onclick="setCalView('month')">月</button>
    <button class="cal-view-btn ${calView==='week'?'active':''}" onclick="setCalView('week')">週</button>
    <button class="cal-view-btn ${calView==='day'?'active':''}" onclick="setCalView('day')">日</button>
  </div>`;

  if (calView === 'week') {
    // Get the week containing the selected date or today
    const today2 = new Date();
    const startOfWeek = new Date(calYear, calMonth, today2.getDate() - today2.getDay());

    html += '<div class="cal-week-grid">';
    // Header row with day names
    html += '<div class="cal-week-header"><div class="cal-time-col"></div>';
    for (let d = 0; d < 7; d++) {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + d);
      const isToday2 = day.toDateString() === today2.toDateString();
      const wDayNames = ['日','月','火','水','木','金','土'];
      html += `<div class="cal-week-day ${isToday2?'today':''} ${d===0?'sun':''} ${d===6?'sat':''}">${wDayNames[d]} ${day.getDate()}</div>`;
    }
    html += '</div>';

    // All-day tasks row
    html += '<div class="cal-week-allday"><div class="cal-time-col" style="font-size:10px;color:var(--muted);">終日</div>';
    for (let d = 0; d < 7; d++) {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + d);
      const dateStr2 = day.toISOString().slice(0,10);
      const dayTasks2 = getTasksForMonth(day.getFullYear(), day.getMonth()).filter(t => t.date === dateStr2);
      html += '<div class="cal-week-allday-cell">';
      dayTasks2.forEach(t => {
        html += `<div class="task-pill" style="background:${t.color}">${escapeHtml((t.title||'').slice(0,8))}</div>`;
      });
      html += '</div>';
    }
    html += '</div>';

    // Time slots (6:00 - 23:00)
    for (let h = 6; h < 24; h++) {
      html += `<div class="cal-week-row"><div class="cal-time-col">${h}:00</div>`;
      for (let d = 0; d < 7; d++) {
        html += '<div class="cal-week-cell"></div>';
      }
      html += '</div>';
    }
    html += '</div>';
  }

  // Day headers
  if (calView === 'month') {
  html += '<div class="cal-grid">';
  dayNames.forEach((d, i) => {
    const cls = i === 0 ? 'cal-day-hdr sun' : i === 6 ? 'cal-day-hdr sat' : 'cal-day-hdr';
    html += `<div class="${cls}">${d}</div>`;
  });

  // Empty cells before first day (show prev month dates)
  for (let i = 0; i < startDay; i++) {
    const d = daysInPrev - startDay + 1 + i;
    html += `<div class="cal-cell empty"><div class="cal-date">${d}</div></div>`;
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = isCurrentMonth && d === today;
    const dayOfWeek = (startDay + d - 1) % 7;
    const isSun = dayOfWeek === 0, isSat = dayOfWeek === 6;
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayTasks = monthTasks.filter(t => t.date === dateStr);
    const holiday = getJapaneseHoliday(calYear, calMonth, d);
    const rokuyo = getRokuyo(calYear, calMonth, d);

    html += `<div class="cal-cell ${isToday?'today':''}" onclick="showDayDetail('${dateStr}')">
      <div class="cal-date ${isSun||holiday?'sun':''} ${isSat?'sat':''}">
        ${isToday ? `<span class="cal-today-num">${d}</span>` : d}
      </div>`;

    // Holiday & rokuyo
    if (holiday) html += `<div class="cal-holiday">${holiday}</div>`;
    html += `<div class="cal-rokuyo">${rokuyo}</div>`;

    // Task pills (max 3 visible)
    dayTasks.slice(0, 3).forEach(t => {
      const overdue = !t.done && dateStr < todayStr;
      const pillColor = overdue ? '#FF4444' : (t.color || '#778CA3');
      html += `<div class="task-pill" style="background:${pillColor}">${escapeHtml((t.title||'').slice(0,6))}${t.source==='ai'?' ✨':''}</div>`;
    });
    if (dayTasks.length > 3) html += `<div class="task-pill-more">+${dayTasks.length-3}</div>`;

    html += '</div>';
  }

  // Trailing empty cells
  const total = startDay + daysInMonth;
  const remaining = (7 - total % 7) % 7;
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="cal-cell empty"><div class="cal-date">${i}</div></div>`;
  }

  html += '</div>';
  } // end if (calView === 'month')

  // FAB
  html += '<button class="cal-fab" onclick="openTaskAddModal()">＋</button>';

  // Day detail panel
  html += '<div id="cal-day-detail" class="cal-day-detail" style="display:none"></div>';

  container.innerHTML = html;
}

function calPrev() { calMonth--; if(calMonth<0){calMonth=11;calYear--;} renderCalendar(); }
function calNext() { calMonth++; if(calMonth>11){calMonth=0;calYear++;} renderCalendar(); }
function calToday() { const n=new Date(); calYear=n.getFullYear(); calMonth=n.getMonth(); renderCalendar(); }
function setCalView(v) { calView = v; renderCalendar(); }
function filterCalByGoal(idx) { calFilterGoal = calFilterGoal === idx ? -1 : idx; renderCalendar(); }

// Legacy aliases
function calNav(d) { if(d>0) calNext(); else calPrev(); }
function calGoToday() { calToday(); }
function switchCalView(v) { setCalView(v); }
function filterCalGoal(idx) { filterCalByGoal(idx); }

function showDayDetail(dateStr) {
  const detail = document.getElementById('cal-day-detail');
  if (!detail) return;
  const tasks = getTasksForMonth(parseInt(dateStr.slice(0,4)), parseInt(dateStr.slice(5,7))-1)
    .filter(t => t.date === dateStr);
  if (calFilterGoal >= 0) {
    // respect active goal filter in day detail too
  }

  const d = new Date(dateStr);
  const dayLabel = d.toLocaleDateString('ja-JP', {month:'long', day:'numeric', weekday:'short'});
  const holiday = getJapaneseHoliday(d.getFullYear(), d.getMonth(), d.getDate());
  const rokuyo = getRokuyo(d.getFullYear(), d.getMonth(), d.getDate());

  let html = `<div class="cal-detail-hdr">
    <span>${dayLabel}${holiday ? ' <span style="color:var(--red);font-size:12px;">'+holiday+'</span>' : ''} <span style="font-size:11px;color:var(--muted);font-weight:normal;">${rokuyo}</span></span>
    <button onclick="document.getElementById('cal-day-detail').style.display='none'" style="background:none;border:none;color:var(--cream);font-size:18px;cursor:pointer;">×</button>
  </div>`;

  if (tasks.length === 0) {
    html += '<div class="cal-detail-empty">この日のタスクはありません</div>';
  } else {
    tasks.forEach(t => {
      html += `<div class="cal-detail-task">
        <span class="cal-goal-dot" style="background:${t.color}"></span>
        <input type="checkbox" ${t.done?'checked':''} onchange="toggleCalTask('${t.taskId}','${t.goalId}',this.checked)" style="accent-color:var(--amber);cursor:pointer;">
        <span class="cal-task-title ${t.done?'done':''}">${escapeHtml(t.title)}</span>
        <span class="cal-task-goal">${escapeHtml((t.goalTitle||'').slice(0,8))}</span>
      </div>`;
    });
  }

  detail.innerHTML = html;
  detail.style.display = 'block';
}

function toggleCalTask(taskId, goalId, done) {
  ALL_GOALS.forEach(g => {
    if (!g.phases) return;
    g.phases.forEach(phase => {
      if (!phase.tasks) return;
      phase.tasks.forEach(task => {
        if (String(task.id) === String(taskId)) {
          task.done = done;
          task.status = done ? 'done' : 'todo';
        }
      });
    });
  });
  renderCalendar();
}

// Task add modal
function openTaskAddModal() {
  const modal = document.createElement('div');
  modal.id = 'task-add-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `<div class="modal-content" style="max-width:420px;padding:24px;">
    <h3 style="margin-bottom:16px;color:var(--cream);">＋ 新しいタスク</h3>
    <label style="font-size:12px;color:var(--muted);margin-bottom:4px;display:block;">タスク名</label>
    <input id="new-task-name" class="field-input" placeholder="タスク名を入力" style="margin-bottom:12px;">
    <label style="font-size:12px;color:var(--muted);margin-bottom:4px;display:block;">ゴール紐付き</label>
    <select id="new-task-goal" class="field-select" style="margin-bottom:12px;">
      <option value="">なし（独立タスク）</option>
      ${ALL_GOALS.filter(g=>!g.archived).map((g,i)=>`<option value="${g.id}">${escapeHtml(g.title)}</option>`).join('')}
    </select>
    <label style="font-size:12px;color:var(--muted);margin-bottom:4px;display:block;">期限（任意）</label>
    <input id="new-task-deadline" type="date" class="field-input" style="margin-bottom:12px;">
    <label style="font-size:12px;color:var(--muted);margin-bottom:4px;display:block;">繰り返し</label>
    <select id="new-task-recurrence" class="field-select" style="margin-bottom:16px;">
      <option value="">なし</option>
      <option value="daily">毎日</option>
      <option value="weekly">毎週</option>
      <option value="monthly">毎月</option>
    </select>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button onclick="document.getElementById('task-add-modal')?.remove()" style="padding:8px 16px;background:var(--bg3);color:var(--cream);border:1px solid var(--border-card);border-radius:8px;cursor:pointer;">キャンセル</button>
      <button onclick="addTaskFromModal()" style="padding:8px 16px;background:var(--send-btn-grad);color:var(--text-on-accent);border:none;border-radius:8px;cursor:pointer;font-weight:600;">追加する</button>
    </div>
  </div>`;
  modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
  document.body.appendChild(modal);
}
// Legacy alias
function openCalAddModal() { openTaskAddModal(); }

function addTaskFromModal() {
  const name = document.getElementById('new-task-name')?.value?.trim();
  if (!name) { toast('タスク名を入力してください'); return; }
  const goalId = document.getElementById('new-task-goal')?.value || null;
  const deadline = document.getElementById('new-task-deadline')?.value || null;
  const recurrence = document.getElementById('new-task-recurrence')?.value || null;

  if (goalId) {
    const goal = ALL_GOALS.find(g => String(g.id) === String(goalId));
    if (goal) {
      if (!goal.phases || goal.phases.length === 0) {
        goal.phases = [{ title: 'タスク', tasks: [] }];
      }
      goal.phases[0].tasks.push({ id: 'task_'+Date.now(), title: name, done: false, status:'todo', deadline, due: deadline, source: 'user', recurrence });
    }
  }

  document.getElementById('task-add-modal')?.remove();
  renderCalendar();
  toast('タスクを追加しました');
}

// ── Legacy panel compat ──
function closeCalDayPanel() { const d=document.getElementById('cal-day-detail'); if(d) d.style.display='none'; }
function openCalDayPanel(day, evKey) { showDayDetail(`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`); }
function openCalPanel(day, evKey, focusEv) { openCalDayPanel(day, evKey); }
function closeCalPanel() { closeCalDayPanel(); }

// ── B-6: Calendar swipe navigation ──
let calTouchStartX = 0;
document.addEventListener('touchstart', e => {
  const calPage = document.getElementById('pg-calendar-wrap') || document.getElementById('pg-calendar');
  if (!calPage || !calPage.classList.contains('active')) return;
  calTouchStartX = e.touches[0].clientX;
}, {passive:true});
document.addEventListener('touchend', e => {
  const calPage = document.getElementById('pg-calendar-wrap') || document.getElementById('pg-calendar');
  if (!calPage || !calPage.classList.contains('active')) return;
  const dx = e.changedTouches[0].clientX - calTouchStartX;
  if (Math.abs(dx) > 60) {
    if (dx < 0) calNext(); else calPrev();
  }
}, {passive:true});

// ── Legacy calendar helpers ──
function saveCalEvent(){
  const title = document.getElementById('cal-ev-title')?.value?.trim();
  const type  = document.getElementById('cal-ev-type')?.value || 'personal';
  if(!title || !calPanelKey) return;
  if(!calPersonalEvents[calPanelKey]) calPersonalEvents[calPanelKey]=[];
  calPersonalEvents[calPanelKey].push({type, text:title});
  renderCalendar();
}

function renderCalChat(evKey){
  const chat = document.getElementById('cal-chat');
  if (!chat) return;
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
  if(!inp) return;
  const text=inp.value.trim(); if(!text) return;
  inp.value=''; inp.style.height='auto';
  if(!calChatHistory[calPanelKey]) calChatHistory[calPanelKey]=[];
  calChatHistory[calPanelKey].push({role:'user',content:text});
  renderCalChat(calPanelKey); calChatLoading=true;
  const chat=document.getElementById('cal-chat');
  if(!chat) return;
  const monthTasks=getTasksForMonth(calYear,calMonth);
  const evSummary=monthTasks.map(e=>e.title).join('、')||'予定なし';
  const calSys=`${buildAIContextCached()}\n\n対象日：${calPanelKey}\n予定：${evSummary}\n\nこの日の予定・スケジュール調整・方針についてのチャット。日程変更の提案は具体的に。3〜4文で。`;

  const cWrap=document.createElement('div'); cWrap.className='tdp-msg ai';
  const cBub=document.createElement('div'); cBub.className='tdp-bubble stream-bubble';
  cWrap.appendChild(cBub); chat.appendChild(cWrap); chat.scrollTop=99999;
  try{
    await streamAI(
      { system:calSys, messages:calChatHistory[calPanelKey].slice(-8), maxTokens:400 },
      (t)=>{ cBub.innerHTML=renderMsgContent(t); chat.scrollTop=99999; },
      (t)=>{ cBub.classList.remove('stream-bubble'); calChatHistory[calPanelKey].push({role:'ai',content:t}); renderCalChat(calPanelKey); },
      (e)=>{ cBub.classList.remove('stream-bubble'); calChatHistory[calPanelKey].push({role:'ai',content:'エラーが発生しました。'}); renderCalChat(calPanelKey); }
    );
  }catch(e){
    calChatHistory[calPanelKey].push({role:'ai',content:'エラーが発生しました。'});
    renderCalChat(calPanelKey);
  }finally{
    calChatLoading=false;
  }
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
      const textColor = task.status==='done' ? 'var(--text-primary)' : 'var(--text-primary)';

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

  // Breadcrumb (D-4)
  const bcContainer = document.getElementById('hub-breadcrumb');
  if (bcContainer) bcContainer.innerHTML = renderBreadcrumb(goal.title);
  else {
    const hubHeader = document.getElementById('hub-title')?.parentElement;
    if (hubHeader) {
      let bc = document.getElementById('hub-breadcrumb');
      if (!bc) {
        bc = document.createElement('div');
        bc.id = 'hub-breadcrumb';
        hubHeader.parentElement.insertBefore(bc, hubHeader);
      }
      bc.innerHTML = renderBreadcrumb(goal.title);
    }
  }

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

  // Status chip - hide for new goals (actual=0, target=0), no deadline, or no tasks
  const chipEl = document.getElementById('hub-status-chip');
  const goalTasks = (goal.phases||[]).flatMap(p=>(p.tasks||[]));
  if((goal.actual === 0 && goal.target === 0) || !goal.deadline || goalTasks.length === 0){
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
    phHd.className = 'tgroup';
    const doneCnt = phase.tasks.filter(t=>t.status==='done').length;
    const pct = phase.tasks.length ? Math.round(doneCnt/phase.tasks.length*100) : 0;
    phHd.innerHTML = `<span class="tgroup-icon">${phase.icon||''}</span>${phase.phaseTitle}<span style="font-size:8px;color:var(--muted2);margin-left:4px;">${doneCnt}/${phase.tasks.length}</span><div class="tgroup-prog"><div class="tgroup-prog-fill" style="width:${pct}%"></div></div>`;
    ph.appendChild(phHd);
    // 完了タスクを下部に自動移動（#05b）
    const sorted = [...phase.tasks].sort((a,b) => (a.status==='done'?1:0) - (b.status==='done'?1:0));
    sorted.forEach(task => {
      const isDone = task.status === 'done';
      const row = document.createElement('div');
      row.className = `tc${isDone?' done-tc':''}`;
      const wt = task.priority==='high'?'<span class="tw twr">重要</span>':task.priority==='mid'?'<span class="tw twy">普通</span>':'<span class="tw twg">軽い</span>';
      row.innerHTML = `
        <div class="tch${isDone?' done':''}"></div>
        <div class="tt${isDone?' dn':''}">${escapeHtml(task.title)}</div>
        ${task.source==='ai'?'<span class="tai">✨</span>':''}${wt}
        <span class="td">${task.due||'—'}</span>`;
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
      <div style="background:var(--bg3);border:1px solid var(--border-card);border-radius:10px;padding:14px 16px;text-align:center;">
        <div style="font-family:var(--fd);font-size:28px;font-weight:300;color:${isOk?'var(--green)':'var(--red)'}">${goal.actual}%</div>
        <div style="font-size:9px;color:var(--muted2);margin-top:3px;letter-spacing:.1em;font-family:var(--fm)">現在の進捗</div>
      </div>
      <div style="background:var(--bg3);border:1px solid var(--border-card);border-radius:10px;padding:14px 16px;text-align:center;">
        <div style="font-family:var(--fd);font-size:28px;font-weight:300;color:var(--amber)">${goal.target}%</div>
        <div style="font-size:9px;color:var(--muted2);margin-top:3px;letter-spacing:.1em;font-family:var(--fm)">今日の予定</div>
      </div>
      <div style="background:var(--bg3);border:1px solid var(--border-card);border-radius:10px;padding:14px 16px;text-align:center;">
        <div style="font-family:var(--fd);font-size:28px;font-weight:300;color:${daysLeft<30?'var(--red)':'var(--cream)'}">${daysLeft}</div>
        <div style="font-size:9px;color:var(--muted2);margin-top:3px;letter-spacing:.1em;font-family:var(--fm)">残り日数</div>
      </div>
    </div>

    <!-- Pace prediction -->
    <div style="background:${isOk?'var(--green-d)':'var(--red-d)'};border:1px solid ${isOk?'var(--green-d)':'var(--red-d)'};border-radius:10px;padding:16px 18px;margin-bottom:20px;">
      <div style="font-size:10px;letter-spacing:.12em;color:${isOk?'var(--green)':'var(--red)'};font-family:var(--fm);margin-bottom:8px;">
        ${isOk ? '✓ 現在のペースで順調' : '⚠ このペースが続くと…'}
      </div>
      ${isOk
        ? `<div style="font-size:12px;color:var(--cream);line-height:1.7">目安より<strong>${-diff}%</strong>先行しています。このままのペースなら予定より早く完了できます。</div>`
        : `<div style="font-size:12px;color:var(--cream);line-height:1.7">目安より<strong style="color:var(--red)">${diff}%遅延</strong>中です。現ペースでは期限内完了が厳しくなる可能性があります。毎週の作業量を<strong>${Math.ceil(diff/4)}%</strong>増やす必要があります。</div>`
      }
    </div>

    <!-- Phase progress bars -->
    <div style="background:var(--bg3);border:1px solid var(--border-card);border-radius:10px;padding:16px 18px;">
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
    </div>

    <!-- 停滞ポイント (3-1) -->
    <div style="background:var(--bg3);border:1px solid var(--border-card);border-radius:10px;padding:16px 18px;margin-top:16px;">
      <div style="font-size:10px;letter-spacing:.12em;color:var(--muted2);font-family:var(--fm);margin-bottom:10px;">停滞ポイント</div>
      <div id="hub-stagnation-${goal.id}" style="font-size:11px;color:var(--muted);line-height:1.6;">
        ${(goal.stagnation_points || []).length ? goal.stagnation_points.map(sp =>
          `<div style="display:flex;align-items:baseline;gap:6px;padding:4px 0;border-bottom:0.5px solid var(--border);">
            <span style="font-size:8px;color:var(--muted2);font-family:var(--fm);flex-shrink:0;">${sp.date||''}</span>
            <span style="flex:1;">${sp.content||''}</span>
            ${sp.tag ? `<span style="font-size:7px;padding:1px 4px;border-radius:3px;flex-shrink:0;background:${sp.tag==='外部依存'?'var(--red-d)':sp.tag==='体調'?'var(--orange-d)':'var(--muted3)'};color:${sp.tag==='外部依存'?'var(--red)':sp.tag==='体調'?'var(--orange)':'var(--muted2)'};">${sp.tag}</span>` : ''}
          </div>`
        ).join('') : '<div style="color:var(--muted2);font-size:10px;">停滞ポイントはまだ記録されていません。</div>'}
      </div>
    </div>

    <!-- 3人寄れば文殊の知恵 (3-2) -->
    <div style="background:var(--bg3);border:1px solid var(--border-card);border-radius:10px;padding:16px 18px;margin-top:16px;">
      <div style="font-size:10px;letter-spacing:.12em;color:var(--muted2);font-family:var(--fm);margin-bottom:6px;">3人寄れば文殊の知恵</div>
      <div style="font-size:11px;color:var(--muted);line-height:1.6;margin-bottom:10px;">3つのAI（Gemini・ChatGPT・Claude）がそれぞれの視点でこのゴールを深く分析します。</div>
      <div style="display:flex;gap:6px;margin-bottom:10px;">
        <span style="font-size:8px;padding:2px 8px;border-radius:10px;background:rgba(224,112,112,.1);color:var(--model-gemini);">Gemini</span>
        <span style="font-size:8px;padding:2px 8px;border-radius:10px;background:rgba(91,141,239,.1);color:var(--model-gpt);">ChatGPT</span>
        <span style="font-size:8px;padding:2px 8px;border-radius:10px;background:rgba(232,145,58,.1);color:var(--model-claude);">Claude</span>
      </div>
      <button onclick="startDeepAnalysis(${hubGoalIdx})" style="width:100%;padding:10px;background:var(--send-btn-grad);border:none;border-radius:10px;color:var(--text-on-accent);font-size:12px;font-weight:500;cursor:pointer;font-family:var(--ff);">ヒアリング開始</button>
      <div style="font-size:9px;color:var(--muted2);text-align:center;margin-top:6px;">残り ${goal.deep_remaining ?? '—'} 回</div>
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

  // AIの理解メモ — アコーディオン表示 (AMEND-001 #4)
  const accEl = document.getElementById('hub-ai-memo-accordion');
  const dateEl = document.getElementById('hub-ai-memo-date');
  if(accEl){
    const aiMemo = goal.ai_memo || '';
    if(aiMemo){
      if(dateEl) dateEl.textContent = goal.ai_memo_updated_at ? new Date(goal.ai_memo_updated_at).toLocaleDateString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}) + ' 更新' : '';
      // カテゴリ分類: 箇条書きをカテゴリに振り分け
      const categories = [
        {title:'性格・コミュニケーション', pattern:/性格|コミュニケーション|話し方|人間関係|共感|対人/i, items:[]},
        {title:'行動パターン', pattern:/行動|習慣|ルーティン|先延ばし|計画|実行|時間/i, items:[]},
        {title:'モチベーション', pattern:/モチベ|やる気|目標|成長|挑戦|達成|情熱|興味/i, items:[]},
        {title:'弱点・課題', pattern:/弱|苦手|課題|問題|不安|恐|克服|改善/i, items:[]}
      ];
      const lines = aiMemo.split(/\n/).filter(l=>l.trim());
      lines.forEach(l=>{
        const clean = l.replace(/^[-・●]\s*/,'').trim();
        if(!clean) return;
        let placed = false;
        for(const cat of categories){ if(cat.pattern.test(clean)){ cat.items.push(clean); placed=true; break; } }
        if(!placed && categories.length) categories[0].items.push(clean);
      });
      // fallback: all in one if no categorization worked
      const nonEmpty = categories.filter(c=>c.items.length);
      if(nonEmpty.length === 0){ nonEmpty.push({title:'メモ',items:lines.map(l=>l.replace(/^[-・●]\s*/,'').trim()).filter(Boolean)}); }
      let html = '';
      nonEmpty.forEach((cat,i)=>{
        html += `<div class="ai-memo-acc-item${i<2?' open':''}">
          <div class="ai-memo-acc-hd" onclick="this.parentElement.classList.toggle('open')">
            <span class="ai-memo-acc-title">${cat.title}</span><span class="ai-memo-acc-arrow">▶</span>
          </div>
          <div class="ai-memo-acc-body">${cat.items.map(it=>'・'+it).join('\n')}</div>
        </div>`;
      });
      accEl.innerHTML = html;
    } else {
      if(dateEl) dateEl.textContent = '';
      accEl.innerHTML = `<div style="text-align:center;padding:12px 0;color:var(--text-secondary);font-size:13px;line-height:1.7;">AIがあなたを理解中です。<br>5回ほど会話すると、ここにAIの理解メモが表示されます。</div>`;
    }
  }

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
  // AI Role display
  const roleDisplay = document.getElementById('hub-role-display');
  if(roleDisplay) roleDisplay.textContent = goal.ai_role_name ? `${goal.ai_role_icon||'🤖'} ${goal.ai_role_name}` : '未設定';
}
function toggleHubRoleEdit(){
  const el = document.getElementById('hub-role-edit');
  if(!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
  if(el.style.display === 'block'){
    const goal = ALL_GOALS[hubGoalIdx];
    document.getElementById('hub-role-input').value = goal.ai_role_name || '';
  }
}
function saveHubRole(){
  const goal = ALL_GOALS[hubGoalIdx];
  const val = document.getElementById('hub-role-input').value.trim();
  goal.ai_role_name = val;
  document.getElementById('hub-role-display').textContent = val ? `🤖 ${val}` : '未設定';
  document.getElementById('hub-role-edit').style.display = 'none';
  toast('AIロールを更新しました ✓');
  if(goal.supabaseId) apiUpdateGoal(goal.supabaseId, { ai_role_name: val });
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
          <div class="gc-prog-target" style="left:${g.target}%;" title="今日の予定 ${g.target}%"></div>
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
  // テーマ・フォントサイズ復元（Cookie）
  const savedTheme = document.cookie.match(/goal_ai_theme=([^;]+)/)?.[1];
  if(savedTheme) applyTheme(savedTheme);
  restoreThemeUI();
  if(typeof restoreAutoThemeUI === 'function') restoreAutoThemeUI();
  const savedFontSize = document.cookie.match(/goal_ai_fontsize=([^;]+)/)?.[1];
  if(savedFontSize) applyFontSize(savedFontSize);

  initSwipeToOpenSidebar();
  initHomePlaceholder();
  renderMembershipUI();
  if(typeof initChatBg === 'function') initChatBg();
  updateNotifSettingUI();
  showPage('home');
  window._appInitDone = true; // 初回ロード完了フラグ（以降のshowPageでアニメーション有効）
  showHomeScreen();
  initAvatarDisplay();

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

  // Owner bypass check (before auth)
  checkOwnerParam();

  // Auto-register if no token
  if (!AUTH_TOKEN) await ensureAuth();

  // Tester URL auto-apply (after auth)
  await checkTesterParam();

  // Plan expiry banner for testers
  checkPlanExpiry();

  // Help guide auto-show for testers on first visit
  if (MEMBERSHIP.tester_tier && !getCookie('help_shown')) {
    setTimeout(() => showHelpGuide(), 1000);
    setCookie('help_shown', 'true', 365);
  }

  // Validate saved token + load Supabase data on startup
  if (AUTH_TOKEN) {
    validateToken().then(data => {
      if (data) {
        renderMembershipUI();
        renderAPIKeySettings();
      }
    });
    // Free model usage取得
    try {
      const usageData = await apiCall('/api/usage', 'GET');
      if (usageData && usageData.model_usage) {
        FREE_MODEL_USAGE = usageData.model_usage;
      }
      renderModelUsageBadge();
    } catch(e){}

    // ゴールをSupabaseから読み込み
    const savedGoals = await apiLoadGoals();
    if (savedGoals.length > 0) {
      ALL_GOALS.length = 0;
      savedGoals.forEach(g => ALL_GOALS.push(g));
      renderSidebarGoals();
    }
  }
  if(typeof renderLifeTasks === 'function') renderLifeTasks();
  // リロード時は常に新しいチャット開始画面を表示
  showHomeScreen();
  // Show onboarding popup if "私をデザイン" not done
  setTimeout(()=> checkOnboarding(), 500);
  // UX-002: コーチマーク（オンボーディング完了後のみ）
  setTimeout(()=> { if(localStorage.getItem('ob_done') && typeof showCoachMarks === 'function') showCoachMarks(); }, 1000);
  setTimeout(()=> renderAIUnderstanding(), 600);

  // Tester auto-version check
  startVersionCheck();
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
  // 折りたたみ式AI理解度スコアも更新
  const scoreEl = document.getElementById('completeness-score');
  if(scoreEl) scoreEl.textContent = pct+'%';
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
  el.style.cssText = 'padding:10px 16px;background:var(--amber-g);border:1px solid var(--amber-d);border-radius:10px;margin:8px 16px;font-size:12px;display:flex;align-items:center;gap:10px;';
  el.innerHTML = `<span style="flex:1;color:var(--cream);">📝 「${title}」をタスクに追加？</span>
    <button onclick="addVoiceTask('${title.replace(/'/g,"\\'")}','${due||''}');this.parentElement.remove();" style="padding:5px 12px;background:var(--send-btn-grad);border:none;border-radius:6px;font-size:11px;color:var(--text-on-accent);cursor:pointer;font-family:var(--ff);">追加</button>
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
  el.innerHTML = `<div class="micro-task-card" style="padding:12px 16px;background:var(--amber-g);border:1px solid var(--amber-d);border-radius:10px;margin-top:10px;">
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
  el.innerHTML = `<div class="micro-task-card" style="padding:12px 16px;background:${micro.done?'var(--green-d)':'var(--amber-g)'};border:1px solid ${micro.done?'var(--green-d)':'var(--amber-d)'};border-radius:10px;margin-top:10px;display:flex;align-items:center;gap:12px;transition:all .3s;">
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

  /* PDF export: hardcoded colors intentional for print */
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

// ════════ D-13: GOAL & TASK FULLSCREEN MODAL ════════
function openGoalModal() {
  let existing = document.getElementById('goal-fullscreen-modal');
  if (existing) { existing.remove(); return; }

  const modal = document.createElement('div');
  modal.id = 'goal-fullscreen-modal';
  modal.className = 'modal-overlay';
  modal.style.cssText = 'display:flex;align-items:stretch;justify-content:center;';

  let html = '<div class="modal-content" style="width:100%;max-width:600px;max-height:90vh;overflow-y:auto;padding:20px;">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><h3 style="color:var(--cream);margin:0;">ゴール＆タスク</h3><button onclick="document.getElementById(\'goal-fullscreen-modal\')?.remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:20px;">×</button></div>';

  ALL_GOALS.forEach((g, i) => {
    if (g.archived) return;
    const color = getGoalColor ? getGoalColor(i) : 'var(--amber)';
    const pct = g.target > 0 ? Math.round(g.actual / g.target * 100) : 0;
    html += '<div style="margin-bottom:16px;">';
    html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;cursor:pointer;" onclick="document.getElementById(\'goal-fullscreen-modal\')?.remove();openGoalHub(' + i + ');">';
    html += '<span style="width:12px;height:12px;border-radius:50%;background:' + color + ';flex-shrink:0;"></span>';
    html += '<span style="color:var(--cream);font-weight:600;flex:1;">' + escapeHtml(g.title) + '</span>';
    html += '<span style="font-size:11px;color:var(--muted);">' + pct + '%</span>';
    html += '<div style="width:60px;height:4px;background:var(--bg4);border-radius:2px;overflow:hidden;"><div style="height:100%;width:' + pct + '%;background:' + color + ';border-radius:2px;"></div></div>';
    html += '</div>';

    // Tasks
    if (g.phases) {
      g.phases.forEach(phase => {
        if (!phase.tasks) return;
        phase.tasks.forEach(task => {
          const taskDone = task.done || task.status === 'done';
          html += '<div style="display:flex;align-items:center;gap:8px;padding:6px 0 6px 20px;">';
          html += '<input type="checkbox" ' + (taskDone ? 'checked' : '') + ' onchange="toggleGoalModalTask(\'' + g.id + '\',\'' + task.id + '\',this.checked)">';
          html += '<span style="color:var(--cream);font-size:13px;flex:1;' + (taskDone ? 'text-decoration:line-through;opacity:.5;' : '') + '">' + escapeHtml(task.title) + '</span>';
          html += '</div>';
        });
      });
    }
    html += '</div>';
  });

  html += '<button onclick="document.getElementById(\'goal-fullscreen-modal\')?.remove();showWelcome();" style="width:100%;padding:12px;background:var(--amber-d);border:1.5px solid var(--amber);color:var(--amber);border-radius:8px;cursor:pointer;font-size:13px;margin-top:8px;">＋ 新しいゴール</button>';
  html += '</div>';

  modal.innerHTML = html;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

function toggleGoalModalTask(goalId, taskId, done) {
  ALL_GOALS.forEach(g => {
    if (String(g.id) !== String(goalId)) return;
    if (!g.phases) return;
    g.phases.forEach(phase => {
      if (!phase.tasks) return;
      phase.tasks.forEach(task => {
        if (String(task.id) === String(taskId)) {
          task.done = done;
          task.status = done ? 'done' : 'todo';
        }
      });
    });
  });
}

// ════════ E-4: Goal assist complete → home transition ════════
function onGoalAssistComplete(goal) {
  toast('ゴールとタスクを設定しました！');
  setTimeout(() => {
    showPage('home');
    const inner = document.getElementById('home-chat-inner');
    if (inner) {
      const msg = document.createElement('div');
      msg.className = 'msg ai';
      msg.style.marginBottom = '16px';
      msg.innerHTML = `<div class="msg-av ai">${getLogoSVG(14)}</div><div class="msg-body"><div class="bubble">🎯 「${escapeHtml(goal.title)}」のゴールとタスクを設定しました！何か他に気になることはありますか？</div></div>`;
      inner.appendChild(msg);
      const scroll = document.getElementById('home-chat-wrap');
      if (scroll) scroll.scrollTop = scroll.scrollHeight;
    }
  }, 1500);
}

// ════════ D-3: Goal save → task setup phase auto-transition ════════
function showTaskSetupPhase(goalObj) {
  toast('ゴールを設定しました！');
  setTimeout(() => {
    const modal = document.createElement('div');
    modal.id = 'task-setup-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal-content" style="max-width:500px;padding:24px;">
      <h3 style="color:var(--cream);margin-bottom:8px;">${escapeHtml(goalObj.title)}</h3>
      <div style="font-size:12px;color:var(--muted);margin-bottom:16px;">ステップ 1 ゴール ✅ → 2 タスク 👈</div>
      <p style="color:var(--cream);margin-bottom:16px;">AIがタスクを提案します。一緒にタスクを作りましょう！</p>
      <div style="margin-bottom:16px;">
        <input id="task-setup-input" class="field-input" placeholder="タスクを入力して追加" style="margin-bottom:8px;">
        <button onclick="addTaskSetupItem()" style="padding:6px 14px;background:var(--send-btn-grad);color:var(--text-on-accent);border:none;border-radius:8px;cursor:pointer;font-size:12px;">＋ 追加</button>
      </div>
      <div id="task-setup-list" style="margin-bottom:16px;"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button onclick="document.getElementById('task-setup-modal')?.remove();showPage('home');" style="padding:8px 16px;background:var(--bg3);color:var(--cream);border:1px solid var(--border-card);border-radius:8px;cursor:pointer;">ホームに戻る</button>
        <button onclick="document.getElementById('task-setup-modal')?.remove();onGoalAssistComplete({title:'${escapeHtml(goalObj.title).replace(/'/g, "\\'")}',id:'${goalObj.id}'});" style="padding:8px 16px;background:var(--send-btn-grad);color:var(--text-on-accent);border:none;border-radius:8px;cursor:pointer;font-weight:600;">完了</button>
      </div>
    </div>`;
    modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
    document.body.appendChild(modal);
  }, 1000);
}

function addTaskSetupItem() {
  const input = document.getElementById('task-setup-input');
  const list = document.getElementById('task-setup-list');
  if (!input || !list || !input.value.trim()) return;
  const item = document.createElement('div');
  item.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);';
  item.innerHTML = `<input type="checkbox" checked><span style="color:var(--cream);font-size:13px;">${escapeHtml(input.value.trim())}</span>`;
  list.appendChild(item);
  input.value = '';
}

// ════════ D-4: Breadcrumb ════════
function renderBreadcrumb(current) {
  return `<div class="breadcrumb"><a onclick="showPage('home');closeSidebar();">ホーム</a><span class="sep">›</span><a onclick="showPage('goal');">ゴール</a><span class="sep">›</span><span>${escapeHtml(current)}</span></div>`;
}

// ════════ D-12: Progress stepper for goal setup ════════
function renderStepIndicator(currentStep) {
  const steps = ['ゴール名', '理由', '期限', '確認'];
  return `<div class="step-indicator">${steps.map((s, i) => {
    const cls = i < currentStep ? 'done' : i === currentStep ? 'active' : '';
    return (i > 0 ? '<div class="step-line ' + (i <= currentStep ? 'done' : '') + '"></div>' : '') +
      '<div class="step-dot ' + cls + '">' + (i < currentStep ? '✓' : (i+1)) + '</div>';
  }).join('')}</div>`;
}

// ════════ AIロール提案・選択 ════════
async function showRoleSelection(goal) {
  try {
    const res = await apiCall(`/api/goals/${goal.id}/suggest-roles`, 'POST', {
      goal_title: goal.title, goal_why: goal.why || ''
    });
    const suggestions = res?.suggestions || [
      { icon: '🎯', name: '万能コーチ', description: 'バランスの取れた総合支援' },
      { icon: '🔥', name: 'スパルタ', description: '厳しく追い込む' },
      { icon: '🤝', name: '伴走者', description: '寄り添い型サポート' }
    ];

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal-content" style="max-width:420px;padding:24px;">
      <h3 style="color:var(--cream);margin-bottom:12px;">🎯 このゴールに最適なAIロール</h3>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
        ${suggestions.map((s,i) => `<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg3);border:1px solid var(--border-card);border-radius:10px;cursor:pointer;transition:border-color .15s;" onclick="this.querySelector('input').checked=true;this.closest('.modal-content').querySelectorAll('label').forEach(l=>l.style.borderColor='var(--border-card)');this.style.borderColor='var(--amber)';">
          <input type="radio" name="ai-role" value="${i}" style="display:none;">
          <span style="font-size:24px;">${s.icon}</span>
          <div><div style="font-weight:600;color:var(--cream);font-size:13px;">${escapeHtml(s.name)}</div><div style="font-size:11px;color:var(--muted);">${escapeHtml(s.description)}</div></div>
        </label>`).join('')}
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button onclick="this.closest('.modal-overlay').remove();" style="padding:8px 16px;background:var(--bg3);color:var(--cream);border:1px solid var(--border-card);border-radius:8px;cursor:pointer;">後で選ぶ</button>
        <button onclick="confirmGoalRole('${goal.id}',this.closest('.modal-overlay'))" style="padding:8px 16px;background:var(--send-btn-grad);color:var(--text-on-accent);border:none;border-radius:8px;cursor:pointer;font-weight:600;">決定</button>
      </div>
    </div>`;
    modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
    modal._suggestions = suggestions;
    document.body.appendChild(modal);
  } catch(e) { toast('ロール提案の取得に失敗しました'); }
}

function confirmGoalRole(goalId, modal) {
  const checked = modal.querySelector('input[name="ai-role"]:checked');
  if (!checked) { toast('ロールを選択してください'); return; }
  const idx = parseInt(checked.value);
  const suggestion = modal._suggestions[idx];
  // Save to goal
  const goal = ALL_GOALS.find(g => String(g.id) === String(goalId));
  if (goal) {
    goal.ai_role_icon = suggestion.icon;
    goal.ai_role_name = suggestion.name;
    goal.ai_role_description = suggestion.description;
    // Save to Supabase
    apiCall(`/api/goals/${goalId}`, 'PATCH', {
      ai_role_icon: suggestion.icon,
      ai_role_name: suggestion.name,
      ai_role_description: suggestion.description
    });
  }
  modal.remove();
  toast(`${suggestion.icon} ${suggestion.name}を設定しました`);
}

// ═══ ES Module: expose to window ═══
// Mutable primitives shared cross-file (used in ui.js, chat.js)
Object.defineProperty(window, 'spartanMode', {
  get() { return spartanMode; }, set(v) { spartanMode = v; },
  configurable: true, enumerable: true
});
Object.defineProperty(window, 'mencareMode', {
  get() { return mencareMode; }, set(v) { mencareMode = v; },
  configurable: true, enumerable: true
});
Object.defineProperty(window, 'mencareEndTime', {
  get() { return mencareEndTime; }, set(v) { mencareEndTime = v; },
  configurable: true, enumerable: true
});
Object.defineProperty(window, 'mencareTimerInterval', {
  get() { return mencareTimerInterval; }, set(v) { mencareTimerInterval = v; },
  configurable: true, enumerable: true
});
Object.defineProperty(window, 'curPage', {
  get() { return curPage; }, set(v) { curPage = v; },
  configurable: true, enumerable: true
});
// Constants, arrays, functions
Object.assign(window, {
  TASKS, ALL_GOALS, GOAL_COLORS, getGoalColor,
  getActiveGoalPhases, switchTaskView, renderTaskTimeView,
  renderGoalSelectorBar, renderTodaySummaryBar, getTodayTasks,
  setFilter, toggleWeightSort, renderTasks, renderGoalView, renderTodayView,
  mkTaskRow, cycleStatus, addTask, openTaskDetail, closeTaskDetail,
  updateTaskStatus, renderTaskChat, mkTdpMsg, sendTaskMsg, tdpResize, tdpKey,
  getJapaneseHoliday, getHoliday, getRokuyo, getTasksForMonth,
  renderCalendar, calPrev, calNext, calToday, setCalView, filterCalByGoal,
  calNav, calGoToday, switchCalView, filterCalGoal,
  showDayDetail, toggleCalTask, openTaskAddModal, openCalAddModal,
  addTaskFromModal, closeCalDayPanel, openCalDayPanel, openCalPanel, closeCalPanel,
  saveCalEvent, renderCalChat, autoGreetCalDay, sendCalMsg, calMsgKey,
  renderGantt, openGoalHub, switchHubTab, renderHubChat,
  sendHubMsg, hubMsgResize, hubMsgKey,
  renderHubTasks, renderHubAnalytics,
  openMemoEditor, closeMemoEditor, saveMemo, renderHubMemo,
  renderHubSettings, saveHubGoalSettings, toggleHubRoleEdit, saveHubRole,
  confirmDeleteGoal, closeDeleteModal, executeDeleteGoal, archiveGoal,
  renderSidebarGoals, init, renderAIUnderstanding,
  launchConfetti, checkMilestone, showMilestoneCard, shareMilestone,
  voiceSetFinalWithSummary, proposeVoiceTask, showVoiceTaskProposal, addVoiceTask,
  renderMicroTask, generateMicroTask, renderMicroTaskUI, completeMicroTask,
  exportTorisetsuPDF, openExportModal, exportICS, exportNotion, exportText,
  openGoalModal, toggleGoalModalTask, onGoalAssistComplete,
  showTaskSetupPhase, addTaskSetupItem, renderBreadcrumb, renderStepIndicator,
  showRoleSelection, confirmGoalRole
});
