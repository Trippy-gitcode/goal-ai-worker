// REWRITE-02: タスク詳細パネル Preactコンポーネント (BUG-05/06解消)
// - 永続マウント: preact-bridge.jsからdocument.bodyに固定
// - isOpen stateでtransform制御 → BUG-05(width:0)を構造的解消
// - TaskEditor.jsxで全フィールド編集 → BUG-06解消
import { h } from 'preact';
import { useState, useRef, useEffect, useCallback } from 'preact/hooks';
import { renderMsgContent } from '../js/markdown.js';
import { TaskEditor } from './TaskEditor.jsx';

const SVG_BACK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>';
const SVG_SEND = '<svg width="13" height="13" viewBox="0 0 24 24" fill="var(--text-on-accent)"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>';
const SVG_BULB = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="1.5" style="vertical-align:middle;"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z"/></svg>';
const SVG_ZAP = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="1.5" style="vertical-align:middle;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
const SVG_EDIT = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="1.5" style="vertical-align:middle;"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
const SVG_DEL = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="1.5" style="vertical-align:middle;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>';

export function TaskDetailPanel() {
  const [task, setTask] = useState(null);
  const [phase, setPhase] = useState(null);
  const [goal, setGoal] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [chatMsgs, setChatMsgs] = useState([]); // {role, html}
  const [chatLoading, setChatLoading] = useState(false);
  const chatHistoryRef = useRef([]);
  const chatRef = useRef(null);
  const inputRef = useRef(null);

  // ═══ Open panel ═══
  const open = useCallback((taskId) => {
    const goals = window.ALL_GOALS || [];
    for (const g of goals) {
      for (const p of (g.phases || [])) {
        const t = (p.tasks || []).find(t => t.id === taskId);
        if (t) {
          setTask(t); setPhase(p); setGoal(g);
          setIsOpen(true); setIsEditing(false);
          setChatMsgs([{ role: 'ai', html: `「<strong>${esc(t.title)}</strong>」について、何でも聞いてください。進め方・詰まりの相談・タスク分解など対応します。` }]);
          chatHistoryRef.current = [];
          setChatLoading(false);
          return;
        }
      }
    }
  }, []);

  const openWithItem = useCallback((item) => {
    setTask(item.task); setPhase(item.phase); setGoal(item.goal || null);
    setIsOpen(true); setIsEditing(false);
    setChatMsgs([{ role: 'ai', html: `「<strong>${esc(item.task.title)}</strong>」について、何でも聞いてください。` }]);
    chatHistoryRef.current = [];
    setChatLoading(false);
  }, []);

  // ═══ Close panel ═══
  const close = useCallback(() => {
    setIsOpen(false);
    setTask(null); setPhase(null); setGoal(null);
    setIsEditing(false); setChatMsgs([]); setChatLoading(false);
    chatHistoryRef.current = [];
    if (typeof window.renderTodayScreen === 'function') window.renderTodayScreen();
  }, []);

  // ═══ Window bridge ═══
  useEffect(() => {
    window._openTaskPanel = open;
    window._closeTaskPanel = close;
    window._preactTaskPanelMounted = true;
    window.openHomeTaskById = open;
    window.openHomeTaskPanel = openWithItem;
    window.closeHomeTaskPanel = close;
    return () => {
      delete window._openTaskPanel;
      delete window._closeTaskPanel;
      delete window._preactTaskPanelMounted;
    };
  }, [open, openWithItem, close]);

  // ═══ Status change with persistence (BUG-06 fix) ═══
  const updateStatus = useCallback((val) => {
    if (!task) return;
    task.status = val;
    setTask({ ...task }); // trigger re-render
    persistTask();
  }, [task, goal]);

  // ═══ Delete task ═══
  const deleteTask = useCallback(() => {
    if (!task || !confirm(`「${task.title}」を削除しますか？`)) return;
    const goals = window.ALL_GOALS || [];
    for (const g of goals) {
      for (const p of (g.phases || [])) {
        const idx = p.tasks.indexOf(task);
        if (idx >= 0) {
          p.tasks.splice(idx, 1);
          if (g.supabaseId && typeof window.apiUpdateGoal === 'function') {
            window.apiUpdateGoal(g.supabaseId, { phases: g.phases }).catch(() => {});
          }
          break;
        }
      }
    }
    close();
    if (typeof window.toast === 'function') window.toast('タスクを削除しました');
  }, [task, close]);

  // ═══ Save edit (from TaskEditor) ═══
  const handleEditSave = useCallback((fields) => {
    if (!task) return;
    Object.assign(task, fields);
    setTask({ ...task });
    persistTask();
    setIsEditing(false);
    if (typeof window.toast === 'function') window.toast('タスクを更新しました');
  }, [task, goal]);

  // ═══ Persist task changes ═══
  const persistTask = useCallback(() => {
    if (!goal) return;
    if (goal.supabaseId && typeof window.apiUpdateGoal === 'function') {
      window.apiUpdateGoal(goal.supabaseId, { phases: goal.phases }).catch(() => {});
    }
  }, [goal]);

  // ═══ Quick chat ═══
  const quickChat = useCallback((text) => {
    if (inputRef.current) inputRef.current.value = text;
    sendChat();
  }, []);

  // ═══ Send chat message ═══
  const sendChat = useCallback(async () => {
    if (chatLoading || !task) return;
    const text = inputRef.current?.value?.trim();
    if (!text) return;
    inputRef.current.value = '';

    setChatMsgs(prev => [...prev, { role: 'user', html: renderMsgContent(text) }]);
    chatHistoryRef.current.push({ role: 'user', content: text });
    setChatLoading(true);

    const sys = `あなたはGOAL AIのタスク専門コーチです。
タスク：「${task.title}」| フェーズ：${phase?.phaseTitle || ''} | ステータス：${task.status} | 期限：${task.due || '未設定'}

${typeof window.buildAIContextCached === 'function' ? window.buildAIContextCached() : ''}

このタスクに特化した具体的・実践的なアドバイスを3〜5文で。`;

    // Add streaming placeholder
    const streamIdx = chatHistoryRef.current.length; // for tracking
    setChatMsgs(prev => [...prev, { role: 'ai', html: '', streaming: true }]);

    try {
      await window.streamAI(
        { system: sys, messages: chatHistoryRef.current.slice(-8), maxTokens: 400 },
        (t) => { setChatMsgs(prev => { const next = [...prev]; next[next.length - 1] = { role: 'ai', html: renderMsgContent(t), streaming: true }; return next; }); },
        (t) => {
          setChatMsgs(prev => { const next = [...prev]; next[next.length - 1] = { role: 'ai', html: renderMsgContent(t), streaming: false }; return next; });
          chatHistoryRef.current.push({ role: 'assistant', content: t });
        },
        () => {
          setChatMsgs(prev => { const next = [...prev]; next[next.length - 1] = { role: 'ai', html: 'エラーが発生しました。', streaming: false }; return next; });
        }
      );
    } catch (e) {
      setChatMsgs(prev => { const next = [...prev]; next[next.length - 1] = { role: 'ai', html: 'エラーが発生しました。', streaming: false }; return next; });
    } finally {
      setChatLoading(false);
    }
  }, [task, phase, chatLoading]);

  // ═══ Auto-scroll chat ═══
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMsgs]);

  // ═══ Keyboard handler ═══
  const onKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      sendChat();
    }
  }, [sendChat]);

  // ═══ Don't render content when not open (but keep DOM for transition) ═══
  const goalTitle = goal?.title || '';
  const showGoalTag = task && goalTitle && goalTitle !== '日常タスク' && task.goalLinked !== false;

  // Metadata rows
  const metaRows = [];
  if (task) {
    if (task.deadline) metaRows.push({ label: '期限', value: task.deadline });
    if (task.estimated_minutes) metaRows.push({ label: '所要時間', value: `${task.estimated_minutes}分` });
    if (task.energy_level) metaRows.push({ label: 'エネルギー', value: { low: '低', medium: '中', high: '高' }[task.energy_level] || task.energy_level });
    if (task.location) metaRows.push({ label: '場所', value: task.location });
    if (task.time_constraint) metaRows.push({ label: '時間制約', value: task.time_constraint });
    if (task.context) metaRows.push({ label: '背景', value: task.context });
    if (task.risk) metaRows.push({ label: 'リスク', value: task.risk });
  }

  return h('div', { id: 'home-task-panel', class: isOpen ? 'open' : '' },
    task && !isEditing ? h('div', { style: 'display:flex;flex-direction:column;height:100%;' },
      // Header
      h('div', { class: 'htp-hd' },
        h('div', { class: 'htp-back', onClick: close, dangerouslySetInnerHTML: { __html: SVG_BACK } }),
        h('div', { class: 'htp-info' },
          h('div', { class: 'htp-task-name' }, task.title),
          h('div', { class: 'htp-meta' },
            showGoalTag ? h('span', {
              class: 'htp-phase-tag',
              style: `background:${(phase?.phaseColor || 'var(--amber)') + '22'};color:${phase?.phaseColor || 'var(--amber)'};border:1px solid ${(phase?.phaseColor || 'var(--amber)') + '44'};`
            }, goalTitle) : null,
            task.due ? h('span', { class: 'htp-due' }, '期限: ' + task.due) : null
          )
        )
      ),
      // Metadata
      h('div', { style: 'padding:0 16px 8px;' },
        metaRows.length > 0
          ? metaRows.map((r, i) => h('div', { key: i, style: 'display:flex;gap:8px;padding:4px 0;border-bottom:0.5px solid var(--border);font-size:12px;' },
              h('span', { style: 'color:var(--muted2);width:60px;flex-shrink:0;' }, r.label),
              h('span', { style: 'color:var(--cream);flex:1;' }, r.value)
            ))
          : h('div', { style: 'font-size:12px;color:var(--muted2);padding:4px 0;' }, 'メタデータなし')
      ),
      // Actions
      h('div', { class: 'htp-actions' },
        h('select', {
          class: 'htp-status-sel', value: task.status || 'todo',
          onChange: (e) => updateStatus(e.target.value)
        },
          h('option', { value: 'todo' }, '⬜ 未着手'),
          h('option', { value: 'current' }, '🔵 進行中'),
          h('option', { value: 'done' }, '✅ 完了'),
          h('option', { value: 'blocked' }, '🔴 ブロック中')
        ),
        h('div', { class: 'htp-action-btn', onClick: () => quickChat('このタスクの進め方を教えて'), dangerouslySetInnerHTML: { __html: SVG_BULB + ' 進め方を聞く' } }),
        h('div', { class: 'htp-action-btn', onClick: () => quickChat('このタスクで詰まっていることを相談したい') }, '→ 詰まりを相談'),
        h('div', { class: 'htp-action-btn', onClick: () => quickChat('このタスクを今日30分で終わらせる方法は？'), dangerouslySetInnerHTML: { __html: SVG_ZAP + ' 30分で終わらせる' } }),
        h('div', { style: 'display:flex;gap:8px;margin-top:4px;' },
          h('div', { class: 'htp-action-btn', style: 'flex:1;text-align:center;', onClick: () => setIsEditing(true), dangerouslySetInnerHTML: { __html: SVG_EDIT + ' 編集' } }),
          h('div', { class: 'htp-action-btn', style: 'flex:1;text-align:center;color:var(--red);border-color:rgba(239,83,80,0.3);', onClick: deleteTask, dangerouslySetInnerHTML: { __html: SVG_DEL + ' 削除' } })
        )
      ),
      // Chat messages
      h('div', { ref: chatRef, id: 'htp-chat', style: 'flex:1;overflow-y:auto;padding:14px 18px;display:flex;flex-direction:column;gap:10px;' },
        chatMsgs.map((m, i) => h('div', { key: i, class: `tdp-msg ${m.role}` },
          h('div', {
            class: `tdp-bubble${m.streaming ? ' stream-bubble' : ''}`,
            dangerouslySetInnerHTML: { __html: m.html }
          })
        ))
      ),
      // Input
      h('div', { id: 'htp-input-area' },
        h('div', { class: 'htp-input-wrap' },
          h('textarea', {
            ref: inputRef, rows: 1, placeholder: 'このタスクについて質問する…',
            onKeyDown,
            onInput: (e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px'; },
          }),
          h('button', { id: 'htp-send-btn', onClick: sendChat, dangerouslySetInnerHTML: { __html: SVG_SEND } })
        )
      )
    ) : null,
    // Edit mode
    task && isEditing ? h('div', { style: 'display:flex;flex-direction:column;height:100%;' },
      h('div', { class: 'htp-hd' },
        h('div', { class: 'htp-back', onClick: () => setIsEditing(false), dangerouslySetInnerHTML: { __html: SVG_BACK } }),
        h('div', { class: 'htp-info' },
          h('div', { class: 'htp-task-name' }, 'タスクを編集')
        )
      ),
      h('div', { style: 'flex:1;overflow-y:auto;' },
        h(TaskEditor, { task, onSave: handleEditSave, onCancel: () => setIsEditing(false) })
      )
    ) : null
  );
}

function esc(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
