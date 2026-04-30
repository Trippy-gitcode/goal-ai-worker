import { useCallback, useEffect, useId, useRef, useState } from 'preact/hooks';
import { route } from 'preact-router';
import { getGoal, deleteGoal } from '../../lib/db.js';
import './S14GoalDetail.css';

/*
 * S-14 Goal Detail（フルスクリーン）
 * design_spec_v1.md §4.7 準拠
 *
 * LAIS-PHASE-A-REAL-COMPLETION: Mock 撤去、/api/lais/goals/:id から実取得。
 */

function dateLabelFor(iso) {
  if (!iso) return '';
  try {
    const today = new Date();
    const t = today.toISOString().slice(0, 10);
    if (iso === t) return '今日';
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    if (iso === tomorrow) return '明日';
    const [y, m, d] = iso.split('-').map(Number);
    return `${m}/${d}`;
  } catch {
    return iso;
  }
}

export function S14GoalDetail({ id }) {
  const titleId = useId();
  const mainRef = useRef(null);
  const [goal, setGoal] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mainRef.current) mainRef.current.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const { goal: g, tasks: ts } = await getGoal(id);
        if (cancelled) return;
        setGoal(g);
        setTasks(ts || []);
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || 'ゴールの取得に失敗しました');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (id) load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleBack = useCallback(() => {
    route('/grow');
  }, []);

  const handleAddTask = useCallback(() => {
    // S-12 をハーフモーダルで開くのは S10 から。S14 では直接タスク追加 = /grow に戻し addTask クエリ。
    route('/grow');
  }, []);

  const handleOpenTask = useCallback((taskId) => {
    // 詳細は S-10 のハーフモーダルで開かれる流儀。ここでは /grow に戻して focus 委譲。
    route('/grow');
  }, []);

  const handleAi = useCallback(() => {
    // AI 相談は TALK 画面へ
    route('/talk');
  }, []);

  const handleEdit = useCallback(() => {
    // 編集は将来の inline モード / 現状は再 navigate でリロード扱い
    if (id) route(`/goal/${id}`);
  }, [id]);

  const handleDelete = useCallback(async () => {
    if (!id) return;
    // 簡易確認 → 削除（design_spec の確認ダイアログは将来実装）
    if (typeof window !== 'undefined' && !window.confirm('このゴールを削除しますか？')) return;
    try {
      await deleteGoal(id);
      route('/grow');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[S14] deleteGoal failed:', err && err.message);
    }
  }, [id]);

  if (loading) {
    return (
      <main id="main-content" ref={mainRef} tabIndex={-1} class="s14-goal" aria-labelledby={titleId} aria-busy="true">
        <p style={{ padding: 24 }}>読み込み中…</p>
      </main>
    );
  }
  if (error || !goal) {
    return (
      <main id="main-content" ref={mainRef} tabIndex={-1} class="s14-goal" aria-labelledby={titleId}>
        <p role="alert" style={{ padding: 24 }}>{error || 'ゴールが見つかりません'}</p>
        <button type="button" class="s14-back" onClick={handleBack} style={{ margin: 16 }}>
          GROW へ戻る
        </button>
      </main>
    );
  }
  const enrichedTasks = tasks.map((t) => ({
    id: t.id,
    name: t.name,
    time: t.time || '',
    dateLabel: dateLabelFor(t.date),
    status: t.status,
    meta: t.meta_text,
  }));
  const view = {
    id: goal.id,
    name: goal.name,
    progress: goal.progress || 0,
    daysLeft: goal.daysLeft != null ? goal.daysLeft : '-',
    category: goal.category || 'other',
    categoryLabel: goal.categoryLabel || 'Other',
    tasks: enrichedTasks,
  };

  return (
    <main
      id="main-content"
      ref={mainRef}
      tabIndex={-1}
      class="s14-goal"
      aria-labelledby={titleId}
    >
      {/* S14-1 ナビゲーション行 */}
      <nav class="s14-nav" aria-label="ゴール詳細ナビゲーション">
        <button
          type="button"
          class="s14-back"
          onClick={handleBack}
          aria-label="GROW に戻る"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
            <path
              d="M12.5 4 L6.5 10 L12.5 16"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
              fill="none"
            />
          </svg>
          <span class="s14-back-label" aria-hidden="true">GROW</span>
        </button>
      </nav>

      {/* S14-2 ゴールタイトル */}
      <h1 id={titleId} class="s14-title">{view.name}</h1>

      {/* S14-3 大進捗表示 */}
      <p class="s14-progress" aria-hidden="true">
        <span class="s14-progress-pct">{view.progress}</span>
        <span class="s14-progress-unit">%</span>
      </p>

      {/* S14-4 大プログレスバー */}
      <div
        class="s14-progress-bar"
        role="progressbar"
        aria-valuenow={view.progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${view.name} の進捗 ${view.progress}%`}
      >
        <span
          class="s14-progress-bar-fill"
          style={{ width: `${view.progress}%` }}
        />
      </div>

      {/* S14-5 / S14-6 メタデータ行 */}
      <div class="s14-meta">
        <p class="s14-days-left">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" focusable="false">
            <rect x="2" y="3" width="10" height="9" rx="1.5" stroke="currentColor" stroke-width="1.2" />
            <path d="M5 1.5v2M9 1.5v2M2 6h10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
          </svg>
          <span>残り{view.daysLeft}日</span>
        </p>
        <span class={`s14-cat-tag s14-cat-tag-${view.category}`}>
          {view.categoryLabel}
        </span>
      </div>

      {/* S14-7 タスクセクションラベル */}
      <h2 class="s14-task-label">TASK</h2>

      {/*
        S14-8 タスク一覧
        R2 a11y fix R-001 (WCAG 1.4.1 色の使用):
        状態を色（枠線）だけで区別すると非色覚ユーザーで判別不能。
        - done: チェックマーク SVG
        - active: 内部ドット SVG（アイコン差）
        - scheduled: 中空（アイコンなし）
        さらに visually-hidden な状態テキスト + aria-label に状態を含めることで
        SR ユーザーにも形/言葉の二重で伝える。
      */}
      <ul class="s14-task-list">
        {view.tasks.length === 0 && (
          <li style={{ padding: '12px 0', color: 'var(--text-muted)' }}>このゴールに紐付くタスクはまだありません</li>
        )}
        {view.tasks.map((task) => {
          const statusLabel =
            task.status === 'done' ? '完了済み'
            : task.status === 'active' ? '進行中'
            : '予定';
          return (
            <li key={task.id} class={`s14-task-row s14-task-row-${task.status}`}>
              <span class={`s14-check s14-check-${task.status}`} aria-hidden="true">
                {task.status === 'done' && (
                  <svg viewBox="0 0 11 11" width="11" height="11" focusable="false">
                    <path
                      d="M 2 5.5 L 4.5 8 L 9 3"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                )}
                {task.status === 'active' && (
                  <svg viewBox="0 0 11 11" width="11" height="11" focusable="false">
                    <circle cx="5.5" cy="5.5" r="2.5" fill="currentColor" />
                  </svg>
                )}
              </span>
              <button
                type="button"
                class="s14-task-card"
                onClick={() => handleOpenTask(task.id)}
                aria-label={`${statusLabel}: ${task.name} — ${task.meta}`}
              >
                <span class={`s14-task-name s14-task-name-${task.status}`}>
                  {task.name}
                </span>
                <span class="s14-task-date">
                  {task.dateLabel} {task.time}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* S14-9 + タスクを追加 */}
      <button type="button" class="s14-add-task" onClick={handleAddTask}>
        + タスクを追加
      </button>

      {/* S14-10 アクションボタン行 */}
      <div class="s14-actions">
        <button
          type="button"
          class="s14-action-ai"
          onClick={handleAi}
        >
          AI 相談
        </button>
        <button
          type="button"
          class="s14-action-edit"
          onClick={handleEdit}
        >
          編集
        </button>
        <button
          type="button"
          class="s14-action-delete"
          onClick={handleDelete}
        >
          削除
        </button>
      </div>
    </main>
  );
}

export default S14GoalDetail;
