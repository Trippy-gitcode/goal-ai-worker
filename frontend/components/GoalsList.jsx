// REWRITE-04: ゴール一覧 + やりたいことリスト Preactコンポーネント
import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';

function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// Phase 8.2 BUG-08 fix 2026-05-01: skeleton loading for GoalsList
function GoalsListSkeleton() {
  return h('div', {
    role: 'status',
    'aria-live': 'polite',
    'aria-label': '読み込み中',
    style: 'padding:0 12px;'
  },
    h('span', { class: 'sr-only' }, 'ゴール一覧を読み込んでいます'),
    [0, 1, 2].map((i) => h('div', {
      key: i,
      'aria-hidden': 'true',
      class: 'skel skel-card',
      style: 'border-radius:8px;border:0.5px solid var(--border2);background:var(--bg2);padding:12px;margin-bottom:10px;height:64px;'
    }))
  );
}

export function GoalsList() {
  const [tab, setTab] = useState('goals');
  const [wishes, setWishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, forceUpdate] = useState(0);

  // Load wishes from localStorage
  useEffect(() => {
    try { setWishes(JSON.parse(localStorage.getItem('goal_ai_wishes') || '[]')); } catch (e) { setWishes([]); }
  }, [tab]);

  // ═══ Window bridge ═══
  useEffect(() => {
    window._preactGoalsListMounted = true;
    window.renderGoalsList = () => forceUpdate(n => n + 1);
    window.switchGoalsTab = (t) => setTab(t);
    // Phase 8.2 BUG-08 fix: ALL_GOALS が後から hydrate される場合 skeleton を表示
    if (Array.isArray(window.ALL_GOALS)) {
      setLoading(false);
    } else {
      const t = setTimeout(() => setLoading(false), 200);
      const fallback = setTimeout(() => setLoading(false), 1500);
      return () => {
        clearTimeout(t);
        clearTimeout(fallback);
        delete window._preactGoalsListMounted;
      };
    }
    return () => { delete window._preactGoalsListMounted; };
  }, []);

  if (loading) {
    return GoalsListSkeleton();
  }

  const goals = (window.ALL_GOALS || []).filter(g => !g.archived);

  const openGoal = useCallback((goalId) => {
    // Switch to hub view
    const listView = document.getElementById('goals-list-view');
    const hubView = document.getElementById('pg-goal-hub');
    if (listView) listView.style.display = 'none';
    if (hubView) hubView.style.display = '';
    // Find goal index and open hub
    const idx = (window.ALL_GOALS || []).findIndex(g => String(g.id) === String(goalId));
    if (idx >= 0 && typeof window.openGoalHub === 'function') window.openGoalHub(idx);
  }, []);

  const startCreation = useCallback(() => {
    if (typeof window.goPage === 'function') window.goPage('home');
    setTimeout(() => {
      const inp = document.getElementById('home-msg-in');
      if (inp) {
        inp.value = '新しいゴールを設定したい';
        if (typeof window.homeResize === 'function') window.homeResize(inp);
        if (typeof window.sendHomeMsg === 'function') window.sendHomeMsg();
      }
    }, 200);
  }, []);

  // ═══ Wish helpers ═══
  const addWish = useCallback((title) => {
    if (!title.trim()) return;
    const next = [...wishes, { title: title.trim(), done: false }];
    setWishes(next);
    localStorage.setItem('goal_ai_wishes', JSON.stringify(next));
  }, [wishes]);

  const toggleWish = useCallback((idx) => {
    const next = [...wishes];
    if (next[idx]) next[idx].done = !next[idx].done;
    setWishes(next);
    localStorage.setItem('goal_ai_wishes', JSON.stringify(next));
  }, [wishes]);

  const promoteWish = useCallback((idx) => {
    const w = wishes[idx];
    if (!w) return;
    const next = wishes.filter((_, i) => i !== idx);
    setWishes(next);
    localStorage.setItem('goal_ai_wishes', JSON.stringify(next));
    if (typeof window.showWelcome === 'function') {
      window.showWelcome();
      setTimeout(() => { const inp = document.getElementById('wlc-in'); if (inp) inp.value = w.title; }, 200);
    }
  }, [wishes]);

  const tabStyle = (active) => `padding:8px 16px;font-size:12px;font-weight:500;cursor:pointer;border:none;background:none;font-family:var(--ff);border-bottom:2px solid ${active ? 'var(--amber)' : 'transparent'};color:${active ? 'var(--amber)' : 'var(--muted2)'};`;

  return h('div', { style: 'display:contents;' },
    // Tabs
    h('div', { style: 'display:flex;border-bottom:0.5px solid var(--border);margin-bottom:8px;' },
      h('button', { onClick: () => setTab('goals'), style: tabStyle(tab === 'goals') }, 'ゴール'),
      h('button', { onClick: () => setTab('wishes'), style: tabStyle(tab === 'wishes') }, 'やりたいこと')
    ),

    // Goals tab
    tab === 'goals' ? h('div', { id: 'goals-list-content', style: 'padding:0 12px;' },
      goals.length === 0
        ? h('div', { style: 'text-align:center;padding:40px 0;color:var(--muted2);font-size:12px;' }, 'ゴールがありません')
        : goals.map(g => {
          const ag = (window.ALL_GOALS || []).find(a => String(a.id) === String(g.id));
          const totalTasks = (ag?.phases || []).reduce((s, p) => s + (p.tasks || []).length, 0);
          const doneTasks = (ag?.phases || []).reduce((s, p) => s + (p.tasks || []).filter(t => t.status === 'done').length, 0);
          const pct = g.progress || ag?.actual || 0;
          return h('div', {
            key: g.id, onClick: () => openGoal(g.id),
            style: 'border-radius:8px;border:0.5px solid var(--border2);background:var(--bg2);padding:12px;margin-bottom:10px;cursor:pointer;'
          },
            h('div', { style: 'display:flex;align-items:center;gap:8px;margin-bottom:8px;' },
              h('div', { style: 'flex:1;min-width:0;' },
                h('div', { style: 'font-size:12px;font-weight:500;color:var(--cream);line-height:1.3;' }, g.title)
              ),
              h('div', { style: 'font-size:16px;font-weight:600;color:var(--amber);flex-shrink:0;' }, pct + '%')
            ),
            h('div', { style: 'height:3px;background:var(--bg3);border-radius:2px;overflow:hidden;' },
              h('div', { style: `height:100%;width:${pct}%;background:var(--accent);border-radius:2px;` })
            ),
            h('div', { style: 'font-size:12px;color:var(--muted2);margin-top:6px;' }, `タスク ${doneTasks}/${totalTasks}完了`)
          );
        })
    ) : null,

    // Wishes tab
    tab === 'wishes' ? h('div', { id: 'wishes-list-content', style: 'padding:0 12px;' },
      wishes.map((w, i) => h('div', { key: i, style: 'display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:0.5px solid var(--border);' },
        h('div', {
          onClick: () => toggleWish(i),
          style: `width:20px;height:20px;border-radius:50%;border:1px solid ${w.done ? 'var(--green)' : 'var(--border2)'};display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;`
        }, w.done ? h('svg', { width: 10, height: 10, viewBox: '0 0 24 24', fill: 'none', stroke: 'var(--green)', 'stroke-width': 2.5 }, h('polyline', { points: '20 6 9 17 4 12' })) : null),
        h('div', { style: `flex:1;font-size:12px;color:${w.done ? 'var(--muted2)' : 'var(--cream)'};${w.done ? 'text-decoration:line-through;' : ''}` }, w.title),
        h('button', { onClick: (e) => { e.stopPropagation(); promoteWish(i); }, style: 'font-size:12px;padding:3px 8px;background:var(--amber-d);border:none;border-radius:6px;color:var(--amber);cursor:pointer;' }, 'ゴール化')
      )),
      h('div', { style: 'padding:10px 0;' },
        h('input', {
          placeholder: 'やりたいことを追加...',
          style: 'width:100%;padding:8px 10px;background:var(--bg2);border:0.5px solid var(--border);border-radius:8px;color:var(--cream);font-family:var(--ff);font-size:12px;outline:none;box-sizing:border-box;',
          onKeyDown: (e) => { if (e.key === 'Enter') { addWish(e.target.value); e.target.value = ''; } }
        })
      )
    ) : null,

    // FAB
    h('button', {
      onClick: startCreation,
      style: 'position:absolute;bottom:60px;right:16px;width:40px;height:40px;border-radius:50%;background:var(--send-btn-grad);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(0,0,0,0.2);z-index:10;'
    }, h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'var(--text-on-accent)', 'stroke-width': 2.5 },
      h('line', { x1: 12, y1: 5, x2: 12, y2: 19 }), h('line', { x1: 5, y1: 12, x2: 19, y2: 12 })
    ))
  );
}
