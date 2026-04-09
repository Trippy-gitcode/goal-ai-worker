// ARCH-00: TODAY画面のPreact版
// 既存のglobal関数（getTodayTasks, toggleTodayTask, openHomeTaskById）を使用
// state/mount/unmountがPreactで管理される

import { h, Fragment } from 'preact';
import { useEffect, useState, useCallback } from 'preact/hooks';

export function Today() {
  const [tasks, setTasks] = useState([]);
  const [now, setNow] = useState(new Date());

  // タスクロード + 1分ごとに現在時刻更新
  const loadTasks = useCallback(() => {
    if (typeof window.getTodayTasks === 'function') {
      setTasks(window.getTodayTasks() || []);
    }
  }, []);

  useEffect(() => {
    loadTasks();
    const interval = setInterval(() => setNow(new Date()), 60000);
    // グローバルイベントでリフレッシュ（既存コードからの呼び出し対応）
    window._preactTodayRefresh = loadTasks;
    return () => {
      clearInterval(interval);
      delete window._preactTodayRefresh;
    };
  }, [loadTasks]);

  const handleToggle = (taskId, e) => {
    e.stopPropagation();
    if (typeof window.toggleTodayTask === 'function') {
      window.toggleTodayTask(taskId);
      setTimeout(loadTasks, 100);
    }
  };

  const handleOpen = (taskId) => {
    if (typeof window.openHomeTaskById === 'function') {
      window.openHomeTaskById(taskId);
    }
  };

  const remaining = tasks.filter(i => i.task.status !== 'done').length;
  const todayStr = now.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
  const h24 = now.getHours();
  const greeting = h24 < 12 ? 'おはよう。' : h24 < 17 ? 'こんにちは。' : 'おつかれさま。';

  return (
    <div id="preact-today-root" style={{ padding: '20px 16px 80px', maxWidth: 700, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: 'var(--muted2)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 4 }}>
          {h24 < 12 ? 'GOOD MORNING' : h24 < 17 ? 'GOOD AFTERNOON' : 'GOOD EVENING'}
        </div>
        <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--cream)', marginBottom: 6 }}>
          {remaining > 0 ? `${greeting}今日は${remaining}つのタスク。` : `${greeting}今日のタスクは完了です。`}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted2)' }}>{todayStr}</div>
      </div>

      <div data-testid="preact-today-list" style={{ position: 'relative' }}>
        {/* Vertical journal line */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 7, width: 1, background: 'var(--border)', zIndex: 0 }} />

        {tasks.length === 0 && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted2)', fontSize: 12 }}>
            タスクがありません
          </div>
        )}

        {tasks.map((item, idx) => {
          const t = item.task;
          const isDone = t.status === 'done';
          return (
            <div
              key={t.id}
              data-task-id={t.id}
              onClick={() => handleOpen(t.id)}
              style={{
                position: 'relative',
                paddingLeft: 24,
                marginBottom: 20,
                cursor: 'pointer',
                opacity: isDone ? 0.5 : 1
              }}
            >
              {/* Dot marker */}
              <div style={{
                position: 'absolute',
                left: 4,
                top: 6,
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: isDone ? 'var(--success)' : (idx === 0 ? 'var(--accent)' : 'var(--dot-inactive)'),
                zIndex: 2
              }} />
              {/* Check circle */}
              <div
                onClick={(e) => handleToggle(t.id, e)}
                data-task-check={t.id}
                style={{
                  display: 'inline-block',
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  border: isDone ? 'none' : `1px solid var(--accent)`,
                  background: isDone ? 'var(--success)' : 'transparent',
                  marginRight: 8,
                  verticalAlign: 'middle',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              />
              <span style={{
                fontSize: 14,
                color: isDone ? 'var(--muted)' : 'var(--cream)',
                textDecoration: isDone ? 'line-through' : 'none',
                verticalAlign: 'middle'
              }}>
                {t.title}
              </span>
              {t.estimated_minutes && (
                <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 2, marginLeft: 26 }}>
                  {t.estimated_minutes}分
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
