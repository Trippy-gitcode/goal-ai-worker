// REWRITE-03: 秘書メモ Preactコンポーネント
// ルールベースのタスクアラート表示
import { h } from 'preact';
import { useState } from 'preact/hooks';

const WARN_ICON = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="1.5" style="flex-shrink:0;margin-top:1px;"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
const NOTE_ICON = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="1.5" style="flex-shrink:0;margin-top:1px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
const MEMO_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';

function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function generateMemos(allTasks, todayStr) {
  const memos = [];

  // Rule 1: Overdue
  allTasks.filter(i => i.task.due && i.task.due < todayStr && i.task.status !== 'done').forEach(i => {
    memos.push({ type: 'warn', icon: WARN_ICON, text: `${i.task.title} が期限切れです。早めに対応を。` });
  });

  // Rule 2: Urgent today (high priority)
  allTasks.filter(i => i.task.due === todayStr && i.task.priority === 'high' && i.task.status !== 'done').forEach(i => {
    memos.push({ type: 'warn', icon: WARN_ICON, text: `${i.task.title} は今日が締切です。` });
  });

  // Rule 3: Time budget > 8h
  const active = allTasks.filter(i => i.task.status !== 'done');
  let totalMin = 0, hasEst = false;
  active.forEach(i => {
    const et = i.task.estimated_time;
    if (et) {
      hasEst = true;
      const hm = et.match(/(\d+)\s*h/i); if (hm) totalMin += parseInt(hm[1]) * 60;
      const mm = et.match(/(\d+)\s*m/i); if (mm) totalMin += parseInt(mm[1]);
    }
  });
  if (hasEst && totalMin > 480) {
    memos.push({ type: 'warn', icon: WARN_ICON, text: `今日のタスク合計は約${Math.round(totalMin / 60 * 10) / 10}時間。8時間を超えています。優先順位の見直しを。` });
  }

  // Rule 4: First task recommendation
  const overdue = allTasks.filter(i => i.task.due && i.task.due < todayStr && i.task.status !== 'done');
  if (active.length > 0 && !overdue.length) {
    const first = active[0];
    const goalName = first.goal?.title || '';
    const isExplicit = goalName && goalName !== '日常タスク' && first.task.goalLinked !== false;
    memos.push({ type: 'note', icon: NOTE_ICON, text: isExplicit
      ? `まずは「${first.task.title}」から。${goalName}の進捗に直結します。`
      : `まずは「${first.task.title}」から。日常タスクの進捗に直結します。` });
  }

  // Rule 5: All done
  if (allTasks.length > 0 && active.length === 0) {
    memos.push({ type: 'note', icon: NOTE_ICON, text: '今日のタスクは全て完了。お疲れさまでした！' });
  }

  return memos;
}

export function SecretaryMemo({ allTasks, todayStr }) {
  const [collapsed, setCollapsed] = useState(false);
  const memos = generateMemos(allTasks || [], todayStr || '');

  if (memos.length === 0) return null;

  return h('div', {
    id: 'today-memo',
    style: 'margin:12px 0 0;border-radius:8px;border:0.5px solid var(--border2);background:var(--bg2);overflow:hidden;'
  },
    // Header (clickable toggle)
    h('div', {
      onClick: () => setCollapsed(!collapsed),
      style: 'display:flex;align-items:center;gap:6px;padding:8px 10px;cursor:pointer;'
    },
      h('span', { dangerouslySetInnerHTML: { __html: MEMO_ICON } }),
      h('span', { style: 'font-size:12px;font-weight:500;color:var(--amber);flex:1;' }, '秘書メモ'),
      h('span', { style: 'font-size:12px;color:var(--muted2);' }, collapsed ? '>' : 'v')
    ),
    // Body
    !collapsed ? h('div', { id: 'today-memo-body', style: 'padding:0 10px 8px;' },
      memos.map((m, i) => h('div', {
        key: i,
        style: 'display:flex;align-items:flex-start;gap:6px;padding:3px 0;font-size:12px;color:var(--muted);line-height:1.4;'
      },
        h('span', { dangerouslySetInnerHTML: { __html: m.icon } }),
        h('span', null, m.text)
      ))
    ) : null
  );
}
