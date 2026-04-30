// REWRITE-02: タスク全フィールド編集フォーム (BUG-06解消)
import { h } from 'preact';
import { useState, useCallback } from 'preact/hooks';

const STATUS_OPTIONS = [
  { value: 'todo', label: '⬜ 未着手' },
  { value: 'current', label: '🔵 進行中' },
  { value: 'done', label: '✅ 完了' },
  { value: 'blocked', label: '🔴 ブロック中' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: '低' },
  { value: 'mid', label: '普通' },
  { value: 'high', label: '重要' },
];

/**
 * TaskEditor — 全フィールド編集フォーム
 * @param {object} props
 * @param {object} props.task - タスクオブジェクト
 * @param {function} props.onSave - (updatedFields) => void
 * @param {function} props.onCancel - () => void
 */
export function TaskEditor({ task, onSave, onCancel }) {
  const [title, setTitle] = useState(task.title || '');
  const [due, setDue] = useState(task.due || '');
  const [minutes, setMinutes] = useState(task.estimated_minutes || '');
  const [priority, setPriority] = useState(task.priority || 'mid');
  const [status, setStatus] = useState(task.status || 'todo');

  const handleSave = useCallback(() => {
    if (!title.trim()) {
      if (typeof window.toast === 'function') window.toast('タスク名を入力してください');
      return;
    }
    onSave({
      title: title.trim(),
      due: due || null,
      estimated_minutes: minutes ? parseInt(minutes, 10) : null,
      priority,
      status,
    });
  }, [title, due, minutes, priority, status, onSave]);

  const fieldStyle = 'width:100%;padding:8px 12px;background:var(--bg3);border:1px solid var(--border2);border-radius:8px;color:var(--cream);font-family:var(--ff);font-size:13px;outline:none;';
  const labelStyle = 'font-size:12px;color:var(--muted);margin-bottom:4px;display:block;';
  const rowStyle = 'margin-bottom:12px;';

  return h('div', { style: 'padding:16px;' },
    // Title
    h('div', { style: rowStyle },
      h('label', { style: labelStyle }, 'タスク名'),
      h('input', {
        type: 'text', value: title,
        style: fieldStyle,
        onInput: (e) => setTitle(e.target.value),
        onKeyDown: (e) => { if (e.key === 'Enter') handleSave(); },
        autoFocus: true,
      })
    ),
    // Due date
    h('div', { style: rowStyle },
      h('label', { style: labelStyle }, '期限'),
      h('input', {
        type: 'date', value: due,
        style: fieldStyle + 'color-scheme:dark;',
        onInput: (e) => setDue(e.target.value),
      })
    ),
    // Row: minutes + priority
    h('div', { style: 'display:flex;gap:12px;' + rowStyle },
      h('div', { style: 'flex:1;' },
        h('label', { style: labelStyle }, '所要時間（分）'),
        h('input', {
          type: 'number', value: minutes, min: 1, max: 480,
          style: fieldStyle,
          onInput: (e) => setMinutes(e.target.value),
        })
      ),
      h('div', { style: 'flex:1;' },
        h('label', { style: labelStyle }, '優先度'),
        h('select', {
          value: priority, style: fieldStyle,
          onChange: (e) => setPriority(e.target.value),
        }, PRIORITY_OPTIONS.map(o => h('option', { key: o.value, value: o.value }, o.label)))
      )
    ),
    // Status
    h('div', { style: rowStyle },
      h('label', { style: labelStyle }, 'ステータス'),
      h('select', {
        value: status, style: fieldStyle,
        onChange: (e) => setStatus(e.target.value),
      }, STATUS_OPTIONS.map(o => h('option', { key: o.value, value: o.value }, o.label)))
    ),
    // Buttons
    h('div', { style: 'display:flex;gap:8px;margin-top:16px;' },
      h('button', {
        onClick: handleSave,
        style: 'flex:1;padding:10px;background:var(--amber);color:var(--text-on-accent);border:none;border-radius:8px;font-family:var(--ff);font-size:13px;font-weight:500;cursor:pointer;',
      }, '保存'),
      h('button', {
        onClick: onCancel,
        style: 'flex:1;padding:10px;background:var(--bg3);color:var(--muted);border:1px solid var(--border2);border-radius:8px;font-family:var(--ff);font-size:13px;cursor:pointer;',
      }, 'キャンセル')
    )
  );
}
