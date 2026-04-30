// REWRITE-03: チャットからのタスク化モーダル Preactコンポーネント
import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';

function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

export function TaskCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [checked, setChecked] = useState([]);
  const [taskType, setTaskType] = useState('life');
  const [goalId, setGoalId] = useState('');
  const [priority, setPriority] = useState('normal');

  // ═══ Open from chat context ═══
  const openFromChat = useCallback(async (contextText) => {
    if (typeof window.toast === 'function') window.toast('タスクを分析中...');
    try {
      const res = await fetch(`${window.WORKER_URL}/api/chat/gpt-simple`, {
        method: 'POST', headers: window.getAuthHeaders(),
        body: JSON.stringify({
          system: '以下の会話内容からタスクを抽出してJSON配列で返してください。各タスクにはtitle（20文字以内）とdeadline（YYYY-MM-DD or null）を含めてください。3〜7個。JSONのみ返す。',
          messages: [{ role: 'user', content: (contextText || '').slice(0, 1000) }],
          maxTokens: 400
        })
      });
      const data = await res.json();
      const raw = (data.choices?.[0]?.message?.content || '').replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setTasks(parsed);
        setChecked(parsed.map(() => true));
        setTaskType('life'); setGoalId(''); setPriority('normal');
        setIsOpen(true);
      } else {
        if (typeof window.toast === 'function') window.toast('タスクの分析に失敗しました');
      }
    } catch (e) {
      if (typeof window.toast === 'function') window.toast('タスクの分析に失敗しました');
    }
  }, []);

  // ═══ Confirm ═══
  const confirm = useCallback(() => {
    const goals = window.ALL_GOALS || [];
    let count = 0;
    tasks.forEach((t, i) => {
      if (!checked[i]) return;
      if (taskType === 'goal' && goalId) {
        const goal = goals.find(g => String(g.id) === String(goalId));
        if (goal) {
          if (!goal.phases || !goal.phases.length) goal.phases = [{ title: 'タスク', tasks: [] }];
          goal.phases[0].tasks.push({ id: 'task_' + Date.now() + '_' + i, title: t.title, done: false, deadline: t.deadline, source: 'chat', priority, status: 'todo' });
        }
      } else {
        // Add to 日常タスク goal (or create one)
        let dailyGoal = goals.find(g => g.title === '日常タスク');
        if (!dailyGoal) {
          dailyGoal = { id: 'daily_' + Date.now(), title: '日常タスク', phases: [{ title: 'タスク', tasks: [] }] };
          goals.push(dailyGoal);
        }
        if (!dailyGoal.phases?.length) dailyGoal.phases = [{ title: 'タスク', tasks: [] }];
        dailyGoal.phases[0].tasks.push({ id: 'task_' + Date.now() + '_' + i, title: t.title, done: false, deadline: t.deadline, source: 'chat', priority, goalLinked: false, status: 'todo' });
      }
      count++;
    });
    setIsOpen(false);
    if (typeof window.toast === 'function') window.toast(`${count}件のタスクを追加しました`);
    if (typeof window.renderTodayScreen === 'function') window.renderTodayScreen();
    if (typeof window.saveGoals === 'function') window.saveGoals();
  }, [tasks, checked, taskType, goalId, priority]);

  // ═══ Window bridge ═══
  useEffect(() => {
    window._preactTaskCardMounted = true;
    window.openTaskFromChat = () => {
      const msgs = document.querySelectorAll('#home-chat-inner .msg.ai .bubble, #talk-msg-list .msg.ai .bubble');
      const lastAI = msgs.length > 0 ? msgs[msgs.length - 1].textContent : '';
      if (!lastAI) { if (typeof window.toast === 'function') window.toast('タスク化する会話がありません'); return; }
      openFromChat(lastAI);
    };
    window.requestTaskBreakdown = openFromChat;
    window.showTaskCard = (ts) => { setTasks(ts); setChecked(ts.map(() => true)); setTaskType('life'); setGoalId(''); setPriority('normal'); setIsOpen(true); };
    window.confirmTaskCard = confirm;
    window.appendTaskSuggestionButton = (bubbleEl) => {
      if (!bubbleEl) return;
      const btn = document.createElement('button');
      btn.className = 'inline-task-btn';
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v10"/><path d="M8 6h8l-2 8h-4z"/><path d="M12 14v8"/><path d="M9 22h6"/></svg> タスクにする';
      btn.onclick = () => openFromChat(bubbleEl.textContent);
      bubbleEl.parentElement?.appendChild(btn);
    };
    return () => { delete window._preactTaskCardMounted; };
  }, [openFromChat, confirm]);

  if (!isOpen) return null;

  const goals = (window.ALL_GOALS || []).filter(g => !g.archived);

  return h('div', { class: 'task-card-modal', onClick: (e) => { if (e.target.className === 'task-card-modal') setIsOpen(false); } },
    h('div', { class: 'task-card' },
      // Title
      h('h3', { class: 'task-card-title' },
        h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2 },
          h('path', { d: 'M12 2v10' }), h('path', { d: 'M8 6h8l-2 8h-4z' }),
          h('path', { d: 'M12 14v8' }), h('path', { d: 'M9 22h6' })
        ), ' タスク化'
      ),
      // Task list
      h('div', { class: 'task-card-list' },
        tasks.map((t, i) => h('label', { key: i, class: 'task-card-item' },
          h('input', { type: 'checkbox', checked: checked[i], onChange: () => setChecked(prev => { const n = [...prev]; n[i] = !n[i]; return n; }) }),
          h('span', { class: 'task-card-name' }, esc(t.title)),
          t.deadline ? h('span', { class: 'task-card-date' }, t.deadline) : null
        ))
      ),
      // Options
      h('div', { class: 'task-card-options' },
        // Task type
        h('div', { style: 'display:flex;gap:8px;align-items:center;' },
          h('span', { style: 'font-size:0.8rem;color:var(--muted);' }, '種類:'),
          h('label', { style: 'font-size:0.8rem;' }, h('input', { type: 'radio', name: 'tc-type', checked: taskType === 'life', onChange: () => setTaskType('life') }), ' ライフ'),
          h('label', { style: 'font-size:0.8rem;' }, h('input', { type: 'radio', name: 'tc-type', checked: taskType === 'goal', onChange: () => setTaskType('goal') }), ' ゴール紐付')
        ),
        taskType === 'goal' ? h('div', { style: 'margin-top:4px;' },
          h('select', { value: goalId, onChange: (e) => setGoalId(e.target.value), class: 'field-select', style: 'font-size:0.8rem;' },
            h('option', { value: '' }, 'ゴールを選択...'),
            goals.map(g => h('option', { key: g.id, value: g.id }, esc(g.title)))
          )
        ) : null,
        // Priority
        h('div', { style: 'display:flex;gap:8px;align-items:center;margin-top:6px;' },
          h('span', { style: 'font-size:0.8rem;color:var(--muted);' }, '重み:'),
          h('label', { style: 'font-size:0.8rem;' }, h('input', { type: 'radio', name: 'tc-pri', checked: priority === 'high', onChange: () => setPriority('high') }), ' 重要'),
          h('label', { style: 'font-size:0.8rem;' }, h('input', { type: 'radio', name: 'tc-pri', checked: priority === 'normal', onChange: () => setPriority('normal') }), ' 普通'),
          h('label', { style: 'font-size:0.8rem;' }, h('input', { type: 'radio', name: 'tc-pri', checked: priority === 'low', onChange: () => setPriority('low') }), ' 軽い')
        )
      ),
      // Actions
      h('div', { class: 'task-card-actions' },
        h('button', { onClick: () => setIsOpen(false), class: 'task-card-cancel' }, 'キャンセル'),
        h('button', { onClick: confirm, class: 'task-card-confirm' }, '追加する')
      )
    )
  );
}
