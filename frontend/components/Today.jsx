// ARCH-02: TODAY画面 完全Preact移行
// タイムライン/リストビュー + タスク詳細パネル連携 + ドラッグ&ドロップ
// 既存のwindow関数（autoSchedule, toggleTodayTask, openHomeTaskById, updateTaskTime, updateTaskDuration）を利用
import { h, Fragment } from 'preact';
import { useEffect, useState, useCallback, useRef } from 'preact/hooks';

const HOUR_START = 6, HOUR_END = 23;
const PX_PER_HOUR = 60;

function escapeHtml(s){
  if(!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// Timeline view renderer（レガシーHTMLを直接生成してinnerHTMLで埋める）
// Preactの純粋実装ではなく、既存のchat.jsロジックをそのまま移植
function buildTimelineHTML(allTasks, todayStr) {
  const routines = window._routines || [];
  const pref = window._schedulingPref || {};
  const schedule = window.autoSchedule ? window.autoSchedule(allTasks, routines, pref) : { slots: [], overflow: 0 };
  const totalHeight = (HOUR_END - HOUR_START) * PX_PER_HOUR;
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const nowPx = Math.max(0, Math.min(totalHeight, (nowMin - HOUR_START*60) / 60 * PX_PER_HOUR));

  let html = `<div style="position:relative;height:${totalHeight}px;margin-left:42px;">`;
  html += `<div class="timeline-line" style="position:absolute;top:0;bottom:0;left:7px;width:1px;background:var(--timeline-line,var(--border));z-index:0;"></div>`;
  for(let hour = HOUR_START; hour <= HOUR_END; hour++){
    const y = (hour - HOUR_START) * PX_PER_HOUR;
    const isCurrent = Math.abs(nowMin - hour * 60) < 30;
    const dotColor = isCurrent ? 'var(--dot-active,var(--accent))' : 'var(--dot-inactive,var(--border))';
    html += `<div style="position:absolute;top:${y}px;left:-42px;width:36px;text-align:right;font-size:10px;color:var(--text-tertiary,var(--muted2));line-height:1;transform:translateY(-5px);letter-spacing:0.5px;">${hour}:00</div>`;
    html += `<div class="timeline-dot ${isCurrent?'dot-active':'dot-inactive'}" style="position:absolute;top:${y - 3}px;left:4px;width:7px;height:7px;border-radius:50%;background:${dotColor};z-index:3;"></div>`;
  }
  if(nowMin >= HOUR_START*60 && nowMin <= HOUR_END*60){
    html += `<div style="position:absolute;top:${nowPx}px;left:-6px;right:0;height:1.5px;background:var(--dot-active,var(--accent));z-index:5;border-radius:1px;opacity:0.6;"></div>`;
    html += `<div style="position:absolute;top:${nowPx-4}px;left:3px;width:9px;height:9px;border-radius:50%;background:var(--dot-active,var(--accent));z-index:5;box-shadow:0 0 6px var(--dot-active,var(--accent));"></div>`;
  }

  schedule.slots.forEach(slot => {
    const top = Math.max(0, (slot.startMin - HOUR_START*60) / 60 * PX_PER_HOUR);
    const height = Math.max(20, (slot.endMin - slot.startMin) / 60 * PX_PER_HOUR);
    const startTime = `${Math.floor(slot.startMin/60)}:${String(slot.startMin%60).padStart(2,'0')}`;
    if(slot.type === 'routine'){
      html += `<div style="position:absolute;top:${top}px;left:4px;right:4px;height:${height}px;background:rgba(255,255,255,0.03);border:0.5px solid var(--border);border-radius:6px;display:flex;align-items:center;padding:0 8px;overflow:hidden;">
        <span style="font-size:11px;color:var(--muted2);">░ ${escapeHtml(slot.title)}</span>
      </div>`;
    } else if(slot.type !== 'task-done'){
      const item = slot.data;
      const t = item.task;
      const isDone = t.status === 'done';
      const isOverdue = t.due && t.due < todayStr && !isDone;
      const durStr = t.estimated_minutes ? `${t.estimated_minutes}分` : '';
      const rawGoalName = item.goal?.title || '';
      const goalName = (rawGoalName === '日常タスク' || t.goalLinked === false) ? '' : rawGoalName.slice(0,6);
      html += `<div data-task-id="${t.id}" data-start-min="${slot.startMin}" onclick="openHomeTaskById('${t.id}')" style="position:absolute;top:${top}px;left:20px;right:4px;height:${Math.max(28,height-2)}px;background:${isDone?'var(--green-d)':'var(--bg2)'};border:0.5px solid ${isDone?'var(--success)':isOverdue?'var(--danger)':'var(--border)'};border-radius:var(--card-radius);padding:4px 8px;cursor:pointer;overflow:hidden;display:flex;align-items:${height>36?'flex-start':'center'};gap:6px;z-index:2;touch-action:none;">
        <div onclick="event.stopPropagation();toggleTodayTask('${t.id}')" style="width:18px;height:18px;border-radius:50%;${isDone?'':'border:1px solid '+(isOverdue?'var(--danger)':'var(--accent)')+';'}display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;margin-top:1px;">
          ${isDone?'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>':''}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;color:${isDone?'var(--green)':isOverdue?'var(--red)':'var(--cream)'};${isDone?'text-decoration:line-through;opacity:0.6;':''}overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.3;">${escapeHtml(t.title)}</div>
          ${height > 36 ? `<div style="font-size:10px;color:var(--muted2);margin-top:2px;">${startTime}${durStr ? ' · '+durStr : ''}${goalName ? ' · '+goalName : ''}</div>` : ''}
        </div>
        ${!isDone && height > 36 ? `<div data-resize-handle="${t.id}" style="position:absolute;bottom:0;left:0;right:0;height:8px;cursor:ns-resize;touch-action:none;display:flex;align-items:center;justify-content:center;"><div style="width:24px;height:3px;border-radius:2px;background:var(--border2);"></div></div>` : ''}
      </div>`;
    }
  });
  html += '</div>';

  const doneCount = allTasks.filter(i => i.task.status === 'done').length;
  const totalCount = allTasks.length;
  if(totalCount > 0){
    html += `<div style="margin-top:8px;padding:8px 0;border-top:0.5px solid var(--border);display:flex;align-items:center;gap:8px;">
      <span style="font-size:11px;color:var(--muted2);">完了 ${doneCount}/${totalCount}</span>
      <div style="flex:1;height:3px;background:var(--bg3);border-radius:2px;overflow:hidden;"><div style="height:100%;background:var(--green);border-radius:2px;width:${totalCount?Math.round(doneCount/totalCount*100):0}%;transition:width .3s;"></div></div>
    </div>`;
  }
  if(schedule.overflow > 0){
    html += `<div style="font-size:11px;color:var(--amber);padding:4px 0;">⚠ ${schedule.overflow}件のタスクが今日に収まりません。明日に回す検討を。</div>`;
  }
  return { html, nowPx };
}

function buildListHTML(allTasks, todayStr) {
  if(allTasks.length === 0){
    return '<div style="text-align:center;padding:24px 0;color:var(--muted2);font-size:12px;">タスクがありません</div>';
  }
  const savedOrder = JSON.parse(localStorage.getItem('today_task_order') || '[]');
  const items = [...allTasks];
  if(savedOrder.length) items.sort((a,b) => {
    const ia = savedOrder.indexOf(String(a.task.id)), ib = savedOrder.indexOf(String(b.task.id));
    if(ia === -1 && ib === -1) return 0;
    if(ia === -1) return 1;
    if(ib === -1) return -1;
    return ia - ib;
  });
  items.sort((a,b) => {
    const aDone = a.task.status === 'done' ? 1 : 0;
    const bDone = b.task.status === 'done' ? 1 : 0;
    return aDone - bDone;
  });
  return items.map((item, idx) => {
    const t = item.task;
    const isDone = t.status === 'done';
    const isOverdue = t.due && t.due < todayStr && !isDone;
    const rawGN = item.goalName || '';
    const goalName = (rawGN === '日常タスク' || t.goalLinked === false) ? '' : rawGN;
    const timeStr = t.estimated_time ? `${t.estimated_time}` : '';
    return `<div data-task-id="${t.id}" style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:0.5px solid var(--border);${isDone?'opacity:0.35;':''}cursor:pointer;">
      <div data-drag="1" style="width:16px;height:28px;display:flex;flex-direction:column;gap:1.5px;align-items:center;justify-content:center;opacity:0.2;flex-shrink:0;touch-action:none;cursor:grab;"><span style="display:flex;gap:2px;"><span style="width:2px;height:2px;border-radius:50%;background:var(--muted2);"></span><span style="width:2px;height:2px;border-radius:50%;background:var(--muted2);"></span></span><span style="display:flex;gap:2px;"><span style="width:2px;height:2px;border-radius:50%;background:var(--muted2);"></span><span style="width:2px;height:2px;border-radius:50%;background:var(--muted2);"></span></span><span style="display:flex;gap:2px;"><span style="width:2px;height:2px;border-radius:50%;background:var(--muted2);"></span><span style="width:2px;height:2px;border-radius:50%;background:var(--muted2);"></span></span></div>
      <div onclick="event.stopPropagation();toggleTodayTask('${t.id}')" style="width:28px;height:28px;border-radius:50%;${isDone?'':'border:1px solid '+(idx===0&&!isDone?'var(--amber)':'var(--border2)')+';'}display:flex;align-items:center;justify-content:center;font-size:12px;color:${idx===0&&!isDone?'var(--amber)':'var(--muted2)'};flex-shrink:0;${idx===0&&!isDone?'background:var(--amber-d);':''}cursor:pointer;">${isDone?'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>':(idx+1)}</div>
      <div style="flex:1;min-width:0;" onclick="openHomeTaskById('${t.id}')">
        <div style="font-size:12px;color:${isOverdue?'var(--red)':'var(--cream)'};line-height:1.3;${isDone?'text-decoration:line-through;':''}overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(t.title)}</div>
        ${timeStr ? `<div style="font-size:12px;color:${isOverdue?'var(--red)':'var(--muted2)'};margin-top:1px;">${isOverdue?'期限切れ':timeStr}</div>` : (isOverdue ? '<div style="font-size:12px;color:var(--red);margin-top:1px;">期限切れ</div>' : '')}
      </div>
      ${goalName ? `<div style="font-size:12px;padding:2px 6px;border-radius:3px;background:var(--amber-d);color:var(--amber);border:0.5px solid var(--border2);flex-shrink:0;white-space:nowrap;">${escapeHtml(goalName)}</div>` : ''}
    </div>`;
  }).join('');
}

// ARCH-02: タイムラインドラッグ&ドロップ初期化（旧initTimelineDragを移植）
function initDragInContainer(container, pxPerHour, hourStart) {
  if(!container || container.__dragInited) return;
  container.__dragInited = true;

  let dragEl = null, startY = 0, origTop = 0, taskId = null, dragTimer = null;
  let resizeEl = null, resizeStartY = 0, resizeOrigH = 0, resizeTaskId = null;

  container.addEventListener('touchstart', (e) => {
    const card = e.target.closest('[data-task-id]');
    if(!card || e.target.closest('[onclick*="toggleTodayTask"]')) return;
    dragTimer = setTimeout(() => {
      dragEl = card;
      taskId = card.dataset.taskId;
      origTop = parseInt(card.style.top) || 0;
      startY = e.touches[0].clientY;
      card.style.zIndex = '10';
      card.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
      card.style.transition = 'none';
      if(navigator.vibrate) navigator.vibrate(30);
    }, 300);
  }, {passive:true});
  container.addEventListener('touchmove', (e) => {
    if(dragTimer){ clearTimeout(dragTimer); dragTimer = null; }
    if(!dragEl) return;
    e.preventDefault();
    const dy = e.touches[0].clientY - startY;
    dragEl.style.top = `${origTop + dy}px`;
  }, {passive:false});
  container.addEventListener('touchend', () => {
    if(dragTimer){ clearTimeout(dragTimer); dragTimer = null; }
    if(!dragEl && !resizeEl) return;
    if(resizeEl){
      const newH = parseInt(resizeEl.style.height) || 30;
      const newMin = Math.round((newH / pxPerHour) * 60 / 15) * 15;
      resizeEl.style.transition = 'height .2s ease';
      resizeEl.style.height = `${Math.max(20, (newMin / 60) * pxPerHour)}px`;
      if(window.updateTaskDuration) window.updateTaskDuration(resizeTaskId, Math.max(15, newMin));
      resizeEl = null; resizeTaskId = null;
      return;
    }
    const newTop = parseInt(dragEl.style.top) || 0;
    const minFromTop = (newTop / pxPerHour) * 60 + hourStart * 60;
    const snappedMin = Math.max(hourStart * 60, Math.min(23 * 60, Math.round(minFromTop / 15) * 15));
    const snappedTop = (snappedMin - hourStart * 60) / 60 * pxPerHour;
    dragEl.style.top = `${Math.max(0, snappedTop)}px`;
    dragEl.style.zIndex = '2';
    dragEl.style.boxShadow = '';
    dragEl.style.transition = 'top .2s ease';
    if(window.updateTaskTime) window.updateTaskTime(taskId, snappedMin);
    dragEl = null; taskId = null;
  }, {passive:true});

  // リサイズハンドル
  container.addEventListener('touchstart', (e) => {
    const handle = e.target.closest('[data-resize-handle]');
    if(!handle) return;
    e.stopPropagation();
    resizeTaskId = handle.dataset.resizeHandle;
    resizeEl = handle.closest('[data-task-id]');
    resizeOrigH = parseInt(resizeEl.style.height) || 30;
    resizeStartY = e.touches[0].clientY;
    resizeEl.style.transition = 'none';
    if(navigator.vibrate) navigator.vibrate(20);
  }, {passive:true});
  container.addEventListener('touchmove', (e) => {
    if(!resizeEl) return;
    e.preventDefault();
    const dy = e.touches[0].clientY - resizeStartY;
    resizeEl.style.height = `${Math.max(20, resizeOrigH + dy)}px`;
  }, {passive:false});
}

// Phase 8.2 BUG-08 fix 2026-05-01: skeleton loading state
function TodaySkeleton({ viewMode }) {
  if (viewMode === 'timeline') {
    return (
      <div role="status" aria-live="polite" aria-label="読み込み中" style={{ padding: '8px 0' }}>
        <span class="sr-only">タイムラインを読み込んでいます</span>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} class="skel skel-card" style={{ height: '46px', marginLeft: '42px' }} aria-hidden="true" />
        ))}
      </div>
    );
  }
  return (
    <div role="status" aria-live="polite" aria-label="読み込み中" style={{ padding: '8px 0' }}>
      <span class="sr-only">タスク一覧を読み込んでいます</span>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} style={{ display: 'flex', gap: '8px', padding: '8px 0', borderBottom: '0.5px solid var(--border)' }} aria-hidden="true">
          <div class="skel" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
          <div style={{ flex: 1 }}>
            <div class="skel skel-line medium" />
            <div class="skel skel-line short" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Today() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const initialMode = (typeof localStorage !== 'undefined' && localStorage.getItem('today_view_mode')) || 'timeline';
  const [viewMode, setViewMode] = useState(initialMode);
  const timelineRef = useRef(null);
  const listRef = useRef(null);

  const loadTasks = useCallback(() => {
    if (typeof window.getTodayTasks === 'function') {
      setTasks(window.getTodayTasks() || []);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 初回ロード: getTodayTasks がまだ未定義の場合は短時間待ってから再試行
    if (typeof window.getTodayTasks === 'function') {
      loadTasks();
    } else {
      const t = setTimeout(loadTasks, 200);
      // フォールバック: 1.5 秒後にスケルトン解除
      const fallback = setTimeout(() => setLoading(false), 1500);
      return () => { clearTimeout(t); clearTimeout(fallback); };
    }
    // Expose refresh for legacy code
    window._preactTodayRefresh = loadTasks;
    // view mode toggle: レガシー window._todayViewMode を監視
    const syncView = () => {
      const mode = (typeof window !== 'undefined' && window._todayViewMode) || localStorage.getItem('today_view_mode') || 'timeline';
      setViewMode(mode);
    };
    window._preactSyncViewMode = syncView;
    return () => {
      delete window._preactTodayRefresh;
      delete window._preactSyncViewMode;
    };
  }, [loadTasks]);

  // タイムライン/リストHTML生成 + ドラッグ初期化
  useEffect(() => {
    if (loading) return;
    const todayStr = new Date().toISOString().slice(0,10);
    if (viewMode === 'timeline' && timelineRef.current) {
      const { html, nowPx } = buildTimelineHTML(tasks, todayStr);
      timelineRef.current.innerHTML = html;
      const scrollParent = timelineRef.current.parentElement;
      if (scrollParent && nowPx > 100) scrollParent.scrollTop = nowPx - 80;
      const inner = timelineRef.current.querySelector('div[style*="position:relative"]');
      if (inner) initDragInContainer(inner, PX_PER_HOUR, HOUR_START);
    } else if (viewMode === 'list' && listRef.current) {
      listRef.current.innerHTML = buildListHTML(tasks, todayStr);
    }
  }, [tasks, viewMode, loading]);

  // ARCH-02: 薄いコンポーネント。グリーティングはレガシーDOM側。Preactはタイムライン/リスト描画のみ。
  if (loading) {
    return (
      <div id="preact-today-root" data-view-mode={viewMode}>
        <TodaySkeleton viewMode={viewMode} />
      </div>
    );
  }
  return (
    <div id="preact-today-root" data-view-mode={viewMode}>
      {viewMode === 'timeline' && (
        <div ref={timelineRef} style={{ position: 'relative', overflow: 'auto' }} />
      )}
      {viewMode === 'list' && (
        <div ref={listRef} />
      )}
    </div>
  );
}
