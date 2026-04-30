import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { route } from 'preact-router';
import { BottomTabBar } from '../shared/BottomTabBar.jsx';
import { ErrorBoundary } from '../shared/ErrorBoundary.jsx';
import { IconChevronUp, IconChevronDown } from '../icons/index.js';
import { S12TaskAdd } from './S12TaskAdd.jsx';
import { S13TaskDetail } from './S13TaskDetail.jsx';
import { S15GoalCreate } from './S15GoalCreate.jsx';
import {
  loadDashboard,
  createTask,
  updateTask,
  deleteTask,
  createGoal,
  isoDate,
} from '../../lib/db.js';
import './S10Grow.css';

/*
 * S-10 GROW（メインダッシュボード）
 * design_spec_v1.md §4.4 準拠
 *
 * 本ミッション（M4-C）スコープ:
 * - モックデータで全タスク状態を表示
 * - スクロール連動ヒーロー圧縮（scrollY > 60px で avatar 48→32 / 3 行→1 行）
 * - タスクチェック状態切替（ローカル state のみ / API 連携は後続ミッション）
 * - 遷移先（S-12/S-13/S-14）は未実装のため console.log + route('/') 代替なし
 *
 * Learned Patterns 適用:
 * - LP-001: スクロール圧縮 / チェック spring animation を prefers-reduced-motion で縮退
 * - LP-002: マウント時に <main> へ focus 移動
 * - LP-011: 全寸法・時間をトークン参照（spec §4.4 固定値は spec 由来として許容）
 * - LP-012: 本ファイル自体が lazy import 対象
 */

const SCROLL_COMPRESS_THRESHOLD = 60; // §4.4 固定値
const HERO_PROFILE_DEFAULT = {
  avatar: null,
  level: 1,
  label: 'EXPLORER',
  expCurrent: 0,
  expNext: 1000,
};

function adaptTaskForRow(t) {
  // db.js の task オブジェクトを S-10 行表示形式へ
  return {
    id: t.id,
    time: t.time || '--:--',
    name: t.name,
    category: t.category || 'other',
    categoryLabel: t.categoryLabel || 'Other',
    status: t.status || 'scheduled',
    meta: t.meta_text || '予定',
    duration: t.duration ?? null,
    memo: t.memo || '',
    // BUG-RT-S12-OPTIMISTIC-UPDATE V4: 楽観更新中フラグを伝播（半透明 UI 用）
    __optimistic: t.__optimistic === true,
  };
}

function todayDateLabel() {
  const d = new Date();
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function groupUpcoming(tasks) {
  // by date
  const map = new Map();
  for (const t of tasks) {
    const k = t.date || 'inbox';
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(t);
  }
  const out = [];
  for (const [k, list] of map.entries()) {
    out.push({
      date: k === 'inbox' ? '未指定' : formatDateLabel(k),
      tasks: list.map(adaptTaskForRow),
    });
  }
  return out;
}

function formatDateLabel(iso) {
  // YYYY-MM-DD → M/D (曜日)
  try {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const dow = ['日', '月', '火', '水', '木', '金', '土'][dt.getDay()];
    return `${m}/${d} (${dow})`;
  } catch {
    return iso;
  }
}

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/*
 * R2 a11y fix:
 * - R-002: 視覚 22×22 は §4.4 固定。ヒット領域は CSS の ::before で 44×44 確保
 * - R-003: role="checkbox" は二値 (or mixed) のため tri-state ローテと不一致。
 *   role="button" + aria-pressed に変更し、tri-state の意味は aria-label で明示
 */
function Check({ status, onToggle, tapping }) {
  const ariaLabel =
    status === 'done'
      ? '完了済み。タップすると予定に戻す'
      : status === 'active'
      ? '進行中。タップすると完了にする'
      : '予定。タップすると進行中にする';
  return (
    <button
      type="button"
      class={
        `s10-check s10-check-${status}` +
        (tapping ? ' s10-check-tap' : '')
      }
      aria-pressed={status === 'done'}
      aria-label={ariaLabel}
      onClick={onToggle}
    >
      {status === 'done' && (
        <svg
          viewBox="0 0 11 11"
          width="11"
          height="11"
          aria-hidden="true"
          focusable="false"
        >
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
    </button>
  );
}

function TodayRow({ task, onToggle, onOpen, tappingId }) {
  // BUG-RT-S12-OPTIMISTIC-UPDATE V4: __optimistic=true は半透明 UI 表示 + aria-busy
  const optimisticCls = task.__optimistic ? ' s10-task-optimistic' : '';
  return (
    <li
      class={`s10-task s10-task-${task.status}${optimisticCls}`}
      aria-busy={task.__optimistic ? 'true' : undefined}
    >
      <span class="s10-task-time">{task.time}</span>
      <Check
        status={task.status}
        onToggle={() => onToggle(task.id)}
        tapping={tappingId === task.id}
      />
      <button
        type="button"
        class="s10-task-card"
        onClick={(e) => onOpen(task.id, e.currentTarget)}
        aria-label={`${task.name} — ${task.meta}`}
      >
        <div class="s10-task-card-body">
          <p class={`s10-task-name s10-task-name-${task.status}`}>{task.name}</p>
          <p class={`s10-task-meta s10-task-meta-${task.status}`}>
            {task.status === 'active' && (
              <span class="s10-task-meta-dash" aria-hidden="true" />
            )}
            {task.meta}
          </p>
        </div>
        <span class="s10-task-category" aria-hidden="true">
          <span class={`s10-task-dot s10-task-dot-${task.category}`} />
          <span class="s10-task-category-label">{task.categoryLabel}</span>
        </span>
      </button>
    </li>
  );
}

/*
 * R2 a11y fix R-004:
 * Overdue 行では Check コンポーネントを流用しない（実動作が「完了」ではなく
 * 「延期」のため、aria-label と action が一致しない = WCAG 4.1.2 違反）。
 * 視覚的なマーカー（装飾のみの <span>）に置き換え、唯一のインタラクションは
 * 「明日に延期」ボタン1つに統一する。
 */
function OverdueRow({ task, onDefer }) {
  return (
    <li class="s10-task s10-task-overdue">
      <span class="s10-task-time">{task.time}</span>
      <span class="s10-check s10-check-overdue" aria-hidden="true" />
      <div class="s10-task-card s10-task-card-overdue">
        <div class="s10-task-card-body">
          <p class="s10-task-name s10-task-name-scheduled">{task.name}</p>
          <p class="s10-task-meta s10-task-meta-scheduled">{task.meta}</p>
        </div>
        <button
          type="button"
          class="s10-task-defer"
          onClick={() => onDefer(task.id)}
          aria-label={`${task.name} を明日に延期する`}
        >
          明日に延期
        </button>
      </div>
    </li>
  );
}

export function S10Grow() {
  const mainRef = useRef(null);
  const tickingRef = useRef(false);
  const tapTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const addTaskButtonRef = useRef(null);
  const createGoalButtonRef = useRef(null);
  const taskDetailReturnFocusRef = useRef(null);
  const [heroCompressed, setHeroCompressed] = useState(false);
  const [tasks, setTasks] = useState([]);            // today
  const [overdueList, setOverdueList] = useState([]);
  const [upcomingGroups, setUpcomingGroups] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [upcomingOpen, setUpcomingOpen] = useState(false);
  const [taskAddOpen, setTaskAddOpen] = useState(false);
  const [taskDetailOpenId, setTaskDetailOpenId] = useState(null);
  const [goalCreateOpen, setGoalCreateOpen] = useState(false);
  // R2 spec-compliance fix R-003: spring アニメーション対象 task id を 400ms 保持
  const [tappingId, setTappingId] = useState(null);

  // LP-002: マウント直後に <main> へ focus 移動
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.focus({ preventScroll: true });
    }
  }, []);

  // データ読込
  const reloadData = useCallback(async () => {
    setLoadError('');
    try {
      const data = await loadDashboard();
      if (!mountedRef.current) return;
      setTasks(data.today.map(adaptTaskForRow));
      setOverdueList(data.overdue.map(adaptTaskForRow));
      setUpcomingGroups(groupUpcoming(data.upcoming));
      setGoals(
        (data.goals || []).map((g) => ({
          id: g.id,
          name: g.name,
          progress: g.progress || 0,
        }))
      );
    } catch (err) {
      if (!mountedRef.current) return;
      setLoadError(err?.message || 'データの取得に失敗しました');
    } finally {
      if (mountedRef.current) setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    reloadData();
    return () => {
      mountedRef.current = false;
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    };
  }, [reloadData]);

  // §4.4 ヒーロー圧縮: scrollY > 60px で切替。rAF でスロットル。
  useEffect(() => {
    const handleScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      window.requestAnimationFrame(() => {
        setHeroCompressed(window.scrollY > SCROLL_COMPRESS_THRESHOLD);
        tickingRef.current = false;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    // 初期同期（リロード時に既にスクロール位置がある場合）
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const completedCount = tasks.filter((t) => t.status === 'done').length;

  const cycleStatus = (current) => {
    // 予定 → 進行中 → 完了 → 予定 のシンプルローテ（UI 確認用）
    if (current === 'scheduled') return 'active';
    if (current === 'active') return 'done';
    return 'scheduled';
  };

  const handleToggle = useCallback(async (id) => {
    const current = tasks.find((t) => t.id === id);
    if (!current) return;
    const next = cycleStatus(current.status);
    // 楽観的 UI 更新
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: next,
              meta:
                next === 'done'
                  ? `達成${current.duration ? ` · ${current.duration}分` : ''}`
                  : next === 'active'
                  ? `進行中${current.duration ? ` · ${current.duration}分` : ''}`
                  : `予定${current.duration ? ` · ${current.duration}分` : ''}`,
            }
          : t
      )
    );
    setTappingId(id);
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setTappingId(null);
    }, 400);
    // 永続化
    try {
      await updateTask(id, { status: next });
    } catch (err) {
      // 失敗時はリロードして state を真値に戻す
      // eslint-disable-next-line no-console
      console.warn('[S10Grow] updateTask failed:', err && err.message);
      reloadData();
    }
  }, [tasks, reloadData]);

  const handleOpenTask = useCallback((id, triggerEl) => {
    if (triggerEl) {
      taskDetailReturnFocusRef.current = triggerEl;
    }
    setTaskDetailOpenId(id);
  }, []);

  const handleTaskDetailClose = useCallback(() => {
    setTaskDetailOpenId(null);
  }, []);

  const handleTaskDetailSave = useCallback(async (updated) => {
    try {
      await updateTask(updated.id, {
        name: updated.name,
        time: updated.time,
        duration: updated.duration,
        memo: updated.memo,
      });
      reloadData();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[S10Grow] save task failed:', err && err.message);
    }
  }, [reloadData]);

  const handleTaskDetailDelete = useCallback(async (target) => {
    if (!target) return;
    try {
      await deleteTask(target.id);
      reloadData();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[S10Grow] delete task failed:', err && err.message);
    }
  }, [reloadData]);

  const handleDeferOverdue = useCallback(async (id) => {
    // 「明日に延期」: target_date を明日にずらす
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await updateTask(id, { date: isoDate(tomorrow) });
      reloadData();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[S10Grow] defer overdue failed:', err && err.message);
    }
  }, [reloadData]);

  const handleAddTask = useCallback(() => {
    setTaskAddOpen(true);
  }, []);

  const handleTaskAddClose = useCallback(() => {
    setTaskAddOpen(false);
  }, []);

  /*
   * BUG-RT-S12-OPTIMISTIC-UPDATE V4:
   *   楽観更新: tempId 付与で即時 setTasks → 背景で createTask → 成功で tempId をマッチ + DB id へ置換 / 失敗でロールバック
   *   reloadDashboard 全件リロード撤廃 → 差分のみ反映で 1988ms → < 500ms 短縮
   *
   *   tempId は `tmp-<timestamp>-<random>` 形式（DB id と衝突しない接頭辞）
   *   楽観 task は __optimistic=true フラグで識別（半透明 UI 用）
   */
  const handleTaskCreate = useCallback(async (payload) => {
    const today = isoDate(new Date());
    const targetDate = payload.date || today;
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticTask = {
      id: tempId,
      name: payload.name,
      time: payload.time,
      duration: payload.duration,
      memo: payload.memo || '',
      category: payload.category || 'other',
      categoryLabel: 'Other',
      date: targetDate,
      status: 'scheduled',
      meta_text: '予定',
      __optimistic: true,
    };

    // 楽観更新: 当日タスクなら today list に即時追加
    if (targetDate === today) {
      setTasks((prev) => [...prev, adaptTaskForRow(optimisticTask)]);
    } else if (targetDate < today) {
      setOverdueList((prev) => [...prev, adaptTaskForRow(optimisticTask)]);
    } else {
      // upcoming groups は再構築（差分だけ）
      setUpcomingGroups((prev) => {
        const next = prev.map((g) => ({ ...g, tasks: [...g.tasks] }));
        const dateLabel = formatDateLabel(targetDate);
        const grp = next.find((g) => g.date === dateLabel);
        if (grp) {
          grp.tasks.push(adaptTaskForRow(optimisticTask));
        } else {
          next.push({ date: dateLabel, tasks: [adaptTaskForRow(optimisticTask)] });
        }
        return next;
      });
    }

    // 背景で DB INSERT
    try {
      const created = await createTask({
        name: payload.name,
        time: payload.time,
        duration: payload.duration,
        memo: payload.memo,
        category: payload.category || 'other',
        date: targetDate,
        status: 'scheduled',
      });
      if (!mountedRef.current) return;
      // 成功: tempId をマッチして DB 由来 task で置換（id 確定 + __optimistic 解除）
      const finalRow = adaptTaskForRow(created);
      const replace = (list) => list.map((t) => (t.id === tempId ? finalRow : t));
      if (targetDate === today) {
        setTasks(replace);
      } else if (targetDate < today) {
        setOverdueList(replace);
      } else {
        setUpcomingGroups((prev) =>
          prev.map((g) => ({ ...g, tasks: replace(g.tasks) }))
        );
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[S10Grow] createTask failed (rollback):', err && err.message);
      if (!mountedRef.current) return;
      // ロールバック: tempId 行を削除
      const remove = (list) => list.filter((t) => t.id !== tempId);
      if (targetDate === today) {
        setTasks(remove);
      } else if (targetDate < today) {
        setOverdueList(remove);
      } else {
        setUpcomingGroups((prev) =>
          prev.map((g) => ({ ...g, tasks: remove(g.tasks) }))
        );
      }
    }
  }, []);

  const handleCreateGoal = useCallback(() => {
    setGoalCreateOpen(true);
  }, []);

  const handleGoalCreateClose = useCallback(() => {
    setGoalCreateOpen(false);
  }, []);

  const handleGoalCreate = useCallback(async (payload) => {
    try {
      await createGoal({
        name: payload.name,
        target_date: payload.due,
        categories: Array.isArray(payload.categories) ? payload.categories : [],
        description: payload.description || '',
      });
      reloadData();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[S10Grow] createGoal failed:', err && err.message);
    }
  }, [reloadData]);

  const handleOpenGoal = useCallback((id) => {
    route('/goal/' + id);
  }, []);

  const handleTabSelect = useCallback((tabId) => {
    if (tabId === 'grow') return; // 現在地
    if (tabId === 'me') {
      route('/me');
      return;
    }
    if (tabId === 'talk') {
      route('/talk');
      return;
    }
  }, []);

  return (
    <main
      id="main-content"
      ref={mainRef}
      tabIndex={-1}
      class="s10-grow"
      aria-labelledby="s10-today-label"
    >
      {loadError && (
        <div role="alert" class="s10-load-error" style={{ padding: '8px 16px', background: 'var(--bg-error, #fff0f0)', color: 'var(--text-error, #b00020)', fontSize: '12px' }}>
          {loadError}
        </div>
      )}

      {/* S10-1 ヒーロー */}
      <section
        class={'s10-hero ' + (heroCompressed ? 's10-hero-compressed' : '')}
        aria-label="プロフィールサマリー"
      >
        <div class="s10-hero-avatar" aria-hidden="true">
          {/* アバター仮表示（ADV 別紙待ち） */}
        </div>
        <div class="s10-hero-body">
          <p class="s10-hero-lv-row">
            <span class="s10-hero-lv">Lv.{HERO_PROFILE_DEFAULT.level}</span>
            <span class="s10-hero-label">{HERO_PROFILE_DEFAULT.label}</span>
          </p>
          {!heroCompressed && (
            <>
              <div
                class="s10-hero-bar"
                role="progressbar"
                aria-valuenow={HERO_PROFILE_DEFAULT.expCurrent}
                aria-valuemin={0}
                aria-valuemax={HERO_PROFILE_DEFAULT.expNext}
                aria-valuetext={`${HERO_PROFILE_DEFAULT.expCurrent} / ${HERO_PROFILE_DEFAULT.expNext} EXP`}
                aria-label="経験値"
              >
                <span
                  class="s10-hero-bar-fill"
                  style={{
                    width: `${Math.round(
                      (HERO_PROFILE_DEFAULT.expCurrent / HERO_PROFILE_DEFAULT.expNext) * 100
                    )}%`,
                  }}
                />
              </div>
              <p class="s10-hero-exp" aria-hidden="true">
                {HERO_PROFILE_DEFAULT.expCurrent.toLocaleString()} /{' '}
                {HERO_PROFILE_DEFAULT.expNext.toLocaleString()} EXP
              </p>
            </>
          )}
        </div>
      </section>

      {/* S10-2 Overdue */}
      {overdueList.length > 0 && (
        <section class="s10-section s10-overdue">
          <h2 class="s10-overdue-label">OVERDUE</h2>
          <ul class="s10-task-list">
            {overdueList.map((t) => (
              <OverdueRow key={t.id} task={t} onDefer={handleDeferOverdue} />
            ))}
          </ul>
        </section>
      )}

      {/* S10-3 Today ヘッダ */}
      <section class="s10-section s10-today">
        <header class="s10-today-header">
          <h2 id="s10-today-label" class="s10-today-label">
            TODAY
          </h2>
          <span class="s10-today-date">{todayDateLabel()}</span>
        </header>
        <p class="s10-today-counter">
          {completedCount} / {tasks.length} completed
        </p>

        {/* S10-4 Today タスク */}
        <ul class="s10-task-list">
          {tasks.map((task) => (
            <TodayRow
              key={task.id}
              task={task}
              onToggle={handleToggle}
              onOpen={handleOpenTask}
              tappingId={tappingId}
            />
          ))}
        </ul>

        {/* S10-5 + タスクを追加 */}
        <button
          ref={addTaskButtonRef}
          type="button"
          class="s10-add-task"
          onClick={handleAddTask}
          aria-haspopup="dialog"
          aria-expanded={taskAddOpen}
        >
          + タスクを追加
        </button>
      </section>

      {/* S10-6 Upcoming 折りたたみ */}
      <section class="s10-section s10-upcoming">
        <button
          type="button"
          class="s10-upcoming-header"
          aria-expanded={upcomingOpen}
          aria-controls="s10-upcoming-panel"
          onClick={() => setUpcomingOpen((v) => !v)}
        >
          <span class="s10-upcoming-label">UPCOMING</span>
          <span class="s10-upcoming-chevron" aria-hidden="true">
            {upcomingOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          </span>
        </button>
        {upcomingOpen && (
          <div id="s10-upcoming-panel" class="s10-upcoming-panel">
            {upcomingGroups.length === 0 && (
              <p class="s10-upcoming-empty" style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                明日以降のタスクはありません
              </p>
            )}
            {upcomingGroups.map((group) => (
              <div key={group.date} class="s10-upcoming-group">
                <p class="s10-upcoming-date">{group.date}</p>
                <ul class="s10-task-list">
                  {group.tasks.map((task) => (
                    <li key={task.id} class="s10-task s10-task-upcoming">
                      <span class="s10-task-time">{task.time}</span>
                      <span class="s10-check s10-check-scheduled" aria-hidden="true" />
                      <div class="s10-task-card">
                        <div class="s10-task-card-body">
                          <p class="s10-task-name s10-task-name-scheduled">
                            {task.name}
                          </p>
                        </div>
                        <span class="s10-task-category" aria-hidden="true">
                          <span class={`s10-task-dot s10-task-dot-${task.category}`} />
                          <span class="s10-task-category-label">
                            {task.categoryLabel}
                          </span>
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* S10-7 Goals ヘッダ + S10-8 Goals 行 */}
      <section class="s10-section s10-goals">
        <h2 class="s10-goals-label">GOALS</h2>
        {goals.length === 0 && !loadingData && (
          <p class="s10-goals-empty" style={{ padding: '12px 0', color: 'var(--text-muted)' }}>
            ゴールはまだ作成されていません
          </p>
        )}
        <ul class="s10-goals-list">
          {goals.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                class="s10-goal"
                onClick={() => handleOpenGoal(g.id)}
              >
                <div class="s10-goal-top">
                  <span class="s10-goal-name">{g.name}</span>
                  <span class="s10-goal-pct">{g.progress}%</span>
                </div>
                <div
                  class="s10-goal-bar"
                  role="progressbar"
                  aria-valuenow={g.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${g.name} の進捗`}
                >
                  <span
                    class="s10-goal-bar-fill"
                    style={{ width: `${g.progress}%` }}
                  />
                </div>
              </button>
            </li>
          ))}
        </ul>

        {/* S10-9 + ゴールを作成 */}
        <button
          ref={createGoalButtonRef}
          type="button"
          class="s10-add-goal"
          onClick={handleCreateGoal}
          aria-haspopup="dialog"
          aria-expanded={goalCreateOpen}
        >
          + ゴールを作成
        </button>
      </section>

      {/* S10-10 BottomTabBar */}
      <BottomTabBar active="grow" onSelect={handleTabSelect} />

      {/* S-12 Task Add ハーフモーダル（M4-D） */}
      {/* PATCH-PB4-ERROR-BOUNDARY: モーダル失敗が S-10 全体を巻き込まないよう個別ラップ */}
      <ErrorBoundary label="タスク追加モーダルでエラーが発生しました">
        <S12TaskAdd
          open={taskAddOpen}
          onClose={handleTaskAddClose}
          onCreate={handleTaskCreate}
          returnFocusRef={addTaskButtonRef}
        />
      </ErrorBoundary>

      {/* S-13 Task Detail ハーフモーダル（M4-E） */}
      <ErrorBoundary label="タスク詳細モーダルでエラーが発生しました">
        <S13TaskDetail
          open={taskDetailOpenId !== null}
          task={tasks.find((t) => t.id === taskDetailOpenId) || null}
          onClose={handleTaskDetailClose}
          onSave={handleTaskDetailSave}
          onDelete={handleTaskDetailDelete}
          returnFocusRef={taskDetailReturnFocusRef}
        />
      </ErrorBoundary>

      {/* S-15 Goal Create ハーフモーダル（M4-G） */}
      <ErrorBoundary label="ゴール作成モーダルでエラーが発生しました">
        <S15GoalCreate
          open={goalCreateOpen}
          onClose={handleGoalCreateClose}
          onCreate={handleGoalCreate}
          returnFocusRef={createGoalButtonRef}
        />
      </ErrorBoundary>
    </main>
  );
}

export default S10Grow;
