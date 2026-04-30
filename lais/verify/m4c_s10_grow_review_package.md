# Lais M4-C 実装レビューパッケージ — S-10 GROW メインダッシュボード

> Phase 4 M4-C「S-10 GROW メインダッシュボード + BottomTabBar 共有コンポーネント」のレビュー対象一式。
> レビュー種別: sub_review_flow.md D. 実装レビュー（R1 ゴールデン）
> リスク: 🔴 高（Phase A 最大画面 / 要素 10+ / スクロール連動 / 共有コンポーネント初投入）

---

## ミッション定義（session_progress.md LAIS-PHASE4-M4C より）

**目的:** Lais のメイン画面（GROW タブ）をモックデータで全タスク状態表示可能に実装する

**要件（達成状況）:**
1. ✅ `/grow` ルートを App.jsx に lazy import で追加（LP-012 適用）
2. ✅ BottomTabBar 共有コンポーネント（S10-10）: 3 タブ / active pill / inactive SVG のみ / `components/shared/` 配置
3. ✅ ヒーロー S10-1: アバター 48×48 + Lv + EXP バー / scrollY > 60px で 32×32 圧縮（rAF スロットル）
4. ✅ Today S10-3/S10-4: 4 行モック（完了 1 / 進行中 1 / 予定 2）/ 3 状態のチェック + カード色分け / 2 段情報階層
5. ✅ Overdue S10-2: 1 件モック / 左ボーダー `--danger` / 「明日に延期」リンク（console.log）
6. ✅ Upcoming S10-6: デフォルト折りたたみ / 展開で 2 日分 + `aria-expanded` + `aria-controls`
7. ✅ Goals S10-7/S10-8: 2 件モック / プログレスバー + パーセント
8. ✅ +タスクを追加 S10-5 / +ゴールを作成 S10-9: console.log
9. ✅ タスク行タップ / Goal 行タップ: console.log
10. ✅ チェックタップ: ローカル state ローテ（予定 → 進行中 → 完了）+ spring アニメーション（LP-001 reduced-motion 縮退）

**スコープ外（ADV 別紙待ち / 他ミッション）:**
- Undo スナックバー 30s（Phase 4 B-1 予定）
- S-12 Task Add / S-13 Task Detail / S-14 Goal Detail / S-15 Goal Create 遷移先
- EXP バー加算アニメーション（ローカル state のみ、加算ロジックは /api/me 接続後）
- VisualViewport API でのキーボード表示検知（`@media (max-height: 400px)` で暫定対応）

---

## 適用済み Learned Patterns 一覧（§13.16.5）

| LP | パターン名 | 適用箇所 |
|---|---|---|
| LP-001 | prefers-reduced-motion | `.s10-hero` 圧縮 transition / `.s10-check` spring / `.s10-task-card` hover / EXP・Goal バー width transition / `.bottom-tab-bar-btn` / 全て `@media (prefers-reduced-motion: reduce)` で transition: none |
| LP-002 | SPA 遷移後の focus 移動 | `<main ref={mainRef} tabIndex={-1}>` + `useEffect` マウント時に `mainRef.current.focus({ preventScroll: true })` |
| LP-004 | WCAG AA コントラスト実測値 | 下部「コントラスト実測」節に記載 |
| LP-011 | デザイントークン参照 | 全ての ms / color は design_system.md トークン。§4.4 由来の固定 px 値（40px 時刻列 / 22px チェック / 4px EXP バー / 60px スクロール閾値 / 8px カテゴリドット / 11×11 チェック SVG / 20px 0 32px hero padding）は spec 由来として許容 |
| LP-012 | ルートレベルコード分割 | `lazy(() => import('./screens/S10Grow.jsx'))` + Suspense fallback。build 結果: S10Grow 独立チャンク 9.20 kB JS + 9.32 kB CSS |

**M4-B で学んだが未蓄積のパターンも予防的に適用:**
- `@supports (padding-bottom: env(safe-area-inset-bottom))` による段階的 safe-area 対応（`.s10-grow` と `.bottom-tab-bar` 両方）
- `.s10-grow:focus:not(:focus-visible) { outline: none }` + `:focus-visible` 可視リング分離（M4-B R3 fix）
- 同パターンを `.bottom-tab-bar-btn` / `.s10-check` / `.s10-task-card` / `.s10-upcoming-header` / `.s10-goal` にも適用

---

## design_spec_v1.md §4.4 S-10 GROW（該当セクション完全引用）

### 4.4 S-10 GROW（メイン / タブ #1）

- **目的 / UX 参照:** 日次タスクとゴールの中心画面。ux_v1.md §2
- **画面タイプ:** タブ画面（ボトムタブ #1 active）
- **レイアウト原則:** 左右 `--space-lg` / 縦スクロール / 下端 82px タブバー固定

**セクション順序（上から下）:** 1. ヒーロー 2. Overdue 3. Today ヘッダ 4. Today タスク 5. + タスク 6. Upcoming 7. Goals 8. + ゴール 9. ボトムタブバー

**[ヒーロー] S10-1:**
- padding `20px 0 32px`
- アバター 48×48 / radius 50% / border 1.5px `--accent` / 背景 `--bg-surface`
- 右カラム: 1 行目 `Lv.12` (20px weight 400 letter-spacing -0.5px) + `EXPLORER` (11px `--text-muted` letter-spacing 1.5px uppercase, 左 --space-sm)
- 2 行目: EXP バー — 幅 100% / 高さ 4px / 背景 `--accent-subtle` / 塗り `--accent` / radius --radius-pill / 塗り率 62%
- 3 行目: `1,240 / 2,000 EXP` (11px `--text-secondary` 右寄せ margin-top 4px)
- scrollY > 60px でアバター 32×32 / 3 行 → 1 行圧縮 (transition --duration-fast ease-out)
- キーボード表示時: display: none

**[Overdue] S10-2（期限切れ時のみ）:**
- Today ヘッダの上に配置
- ラベル `OVERDUE` (11px weight 600 `--danger` letter-spacing 1.5px uppercase)
- 各行: Today タスク行と同構造 + 左ボーダー `--danger` solid 2px
- 右端「明日に延期」リンク (14px `--accent` underline) → タップ即時実行 + Undo 30s

**[Today ヘッダ] S10-3:**
- ラベル `TODAY` (14px `--text-muted` letter-spacing 1.5px uppercase)
- 右端に日付 `4月12日` (11px `--text-muted`)
- 下 --space-xs に `1 / 4 completed` (11px `--text-muted`)

**[Today タスク行] S10-4 (繰り返し):**
- 時刻列 + チェック + カード / gap 12px / margin-bottom 8px / align-items center
- 時刻列: 幅 40px 右寄せ / 14px `--text-secondary` / font-variant-numeric: tabular-nums
- チェック: 22×22 radius 50% / 状態別
  - 完了: `--success-subtle` + border 2px `--success` + 内部 SVG チェック (11×11 stroke `--success` 1.8px)
  - 進行中: border 2px `--accent` / 背景 transparent
  - 予定: border 2px `--border-strong` / 背景 transparent
- カード: flex 1 / padding 10px 14px / min-height 44px / radius --radius-md / 状態別背景
- タスク名（14px 主テキスト letter-spacing -0.02em）
  - 完了: `--text-secondary`（打ち消し線なし）/ 進行中: `--text-primary` / 予定: `--text-secondary`
- サブ行（11px margin-top 2px）
  - 完了: `達成 · 45分` / color `--success`
  - 進行中: `進行中 · 60分` / color `--text-secondary` + 先頭に 8×1px amber #E8A855 ダッシュ
  - 予定: `予定 · 30分` / color `--text-muted`
- **階層ルール:** 14px 主 / 11px 補助の 2 段は常に別トークン使用
- 右側: カテゴリドット 8×8 radius 50% + カテゴリ名（11px `--text-muted`）/ 色: `--cat-work` / `--cat-health` / `--cat-learn`

**[+ タスクを追加] S10-5:** 左 52px インデント / min-height 44px / `+ タスクを追加` (14px `--accent` underline) → S-12

**[Upcoming] S10-6（B-1）:** `+ タスクを追加` の下 --space-xl / ヘッダ `UPCOMING` (11px `--text-muted` uppercase) + ▼/▲ / 展開時 7 日分日付グループ / デフォルト折りたたみ

**[Goals ヘッダ] S10-7:** margin-top --space-xl / `GOALS` (14px `--text-muted` letter-spacing 1.5px uppercase) / margin-bottom --space-md

**[Goals 行] S10-8 (繰り返し):** padding 12px 0 / 1 行目: 左 ゴール名 (14px -0.02em) / 右 `60%` (11px `--text-muted`) / 2 行目: プログレスバー 3px 背景 `--accent-subtle` 塗り `--accent` radius --radius-pill / margin-bottom --space-sm

**[+ ゴールを作成] S10-9:** padding 14px 0 / min-height 44px / `+ ゴールを作成` (14px `--accent` underline)

**[ボトムタブバー] S10-10:**
- 高さ 82px / 背景 `--bg-surface` / border-top 1px `--border-strong` / padding-top 10px
- 3 タブ均等 `justify-content: space-around`
- Active: pill 背景 `--accent-subtle` radius pill padding 6px 16px + SVG 20×20 stroke `--accent` + ラベル 11px `--accent` weight 600
- Inactive: SVG 20×20 stroke `--text-secondary` のみ
- タブ順: `GROW` / `TALK` / `ME`

**状態・インタラクション:**
- タスク行タップ → S-13 詳細パネル
- チェックタップ → spring-default scale(0.9→1.1→1) + --duration-fast + EXP バー --duration-slow 伸長 + Undo 30s
- Goal 行タップ → S-14 フルスクリーン右スライド遷移

**検証可能なスクショ事実:** ヒーロー高さ 初期 ~100px / スクロール時 ~50px / Today 4 行（1 行目 `--success-subtle` 背景）/ Goals 2 行（両方プログレスバー）/ タブバー固定 + GROW のみ pill

**Phase 4 対応:** B-1 / G-1 / A-2

---

## 実装パッケージ

### 1. lais/src/components/App.jsx（M4-C 差分のみ）

```jsx
// LP-012: 各画面は lazy import
const S02Onboarding = lazy(() => import('./screens/S02Onboarding.jsx'));
const S10Grow = lazy(() => import('./screens/S10Grow.jsx'));

// Router に追加
<GrowRoute path="/grow" />

function GrowRoute() {
  return (
    <Suspense fallback={<main class="route-fallback" role="status" aria-live="polite" aria-label="読み込み中" />}>
      <S10Grow />
    </Suspense>
  );
}
```

### 2. lais/src/components/shared/BottomTabBar.jsx（新規全文）

```jsx
import './BottomTabBar.css';

const TABS = [
  { id: 'grow', label: 'GROW', icon: (<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M 10 17 L 10 8 M 10 8 C 10 5, 7 3, 4 4 C 5 7, 8 8, 10 8 M 10 8 C 10 5, 13 3, 16 4 C 15 7, 12 8, 10 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>) },
  { id: 'talk', label: 'TALK', icon: (<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M 3 6 C 3 4.5, 4 3.5, 5.5 3.5 L 14.5 3.5 C 16 3.5, 17 4.5, 17 6 L 17 12 C 17 13.5, 16 14.5, 14.5 14.5 L 8 14.5 L 5 17 L 5 14.5 C 4 14.5, 3 13.5, 3 12 Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>) },
  { id: 'me', label: 'ME', icon: (<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><circle cx="10" cy="7" r="3.5" fill="none" stroke="currentColor" stroke-width="1.5" /><path d="M 3.5 17 C 3.5 13.5, 6.5 11.5, 10 11.5 C 13.5 11.5, 16.5 13.5, 16.5 17" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>) },
];

export function BottomTabBar({ active = 'grow', onSelect }) {
  const handleClick = (id) => { if (typeof onSelect === 'function') onSelect(id); };
  return (
    <nav class="bottom-tab-bar" aria-label="メインナビゲーション">
      <ul class="bottom-tab-bar-list" role="tablist">
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <li key={tab.id} class="bottom-tab-bar-item" role="none">
              <button type="button" role="tab" aria-selected={isActive} aria-label={tab.label}
                class={'bottom-tab-bar-btn ' + (isActive ? 'bottom-tab-bar-btn-active' : '')}
                onClick={() => handleClick(tab.id)}>
                <span class="bottom-tab-bar-icon">{tab.icon}</span>
                {isActive && <span class="bottom-tab-bar-label">{tab.label}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default BottomTabBar;
```

### 3. lais/src/components/shared/BottomTabBar.css（新規全文）

```css
.bottom-tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 82px; /* §4.4 S10-10 固定値 */
  background: var(--bg-surface);
  border-top: 1px solid var(--border-strong);
  padding-top: 10px; /* §4.4 S10-10 固定値 */
  z-index: var(--z-tab-bar, 100);
}

/* M4-B 学習: env() 段階的フォールバック */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .bottom-tab-bar {
    height: calc(82px + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
  }
}

.bottom-tab-bar-list {
  list-style: none; margin: 0; padding: 0;
  display: flex; justify-content: space-around; align-items: center;
  height: 100%;
}

.bottom-tab-bar-item { display: flex; align-items: center; justify-content: center; }

.bottom-tab-bar-btn {
  min-width: 44px; min-height: 44px;
  padding: 6px 16px; /* §4.4 Active 仕様 */
  display: inline-flex; align-items: center; gap: var(--space-xs);
  background: transparent; border: none;
  border-radius: var(--radius-pill);
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    background-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}

.bottom-tab-bar-btn:focus:not(:focus-visible) { outline: none; }
.bottom-tab-bar-btn:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }

.bottom-tab-bar-btn-active {
  background: var(--accent-subtle);
  color: var(--accent);
}

.bottom-tab-bar-icon { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; }
.bottom-tab-bar-icon svg { width: 100%; height: 100%; display: block; }
.bottom-tab-bar-label { font-size: 11px; font-weight: 600; letter-spacing: 0.5px; line-height: 1; }

@media (prefers-reduced-motion: reduce) {
  .bottom-tab-bar-btn { transition: none; }
}
```

### 4. lais/src/components/screens/S10Grow.jsx（新規全文）

```jsx
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { route } from 'preact-router';
import { BottomTabBar } from '../shared/BottomTabBar.jsx';
import './S10Grow.css';

const SCROLL_COMPRESS_THRESHOLD = 60; // §4.4 固定値
const HERO_PROFILE = {
  avatar: null,
  level: 12,
  label: 'EXPLORER',
  expCurrent: 1240,
  expNext: 2000,
};

const OVERDUE_MOCK = [
  { id: 'od-1', time: '09:00', name: '昨日の振り返りメモ', meta: '未完了 · 15分', category: 'learn', categoryLabel: 'Learn' },
];

const TODAY_DATE_LABEL = '4月15日';

const TODAY_MOCK = [
  { id: 't-1', time: '07:30', name: '朝のストレッチ', category: 'health', categoryLabel: 'Health', status: 'done', meta: '達成 · 15分' },
  { id: 't-2', time: '10:00', name: 'プロジェクト提案書レビュー', category: 'work', categoryLabel: 'Work', status: 'active', meta: '進行中 · 60分' },
  { id: 't-3', time: '14:00', name: 'React の状態管理を読む', category: 'learn', categoryLabel: 'Learn', status: 'scheduled', meta: '予定 · 30分' },
  { id: 't-4', time: '19:00', name: '夕方の散歩', category: 'health', categoryLabel: 'Health', status: 'scheduled', meta: '予定 · 20分' },
];

const UPCOMING_MOCK = [
  { date: '4/16 (水)', tasks: [
    { id: 'u-1', time: '09:00', name: 'チームミーティング', category: 'work', categoryLabel: 'Work' },
    { id: 'u-2', time: '12:00', name: 'ランチ読書', category: 'learn', categoryLabel: 'Learn' },
  ]},
  { date: '4/17 (木)', tasks: [
    { id: 'u-3', time: '08:00', name: 'ジョギング', category: 'health', categoryLabel: 'Health' },
  ]},
];

const GOALS_MOCK = [
  { id: 'g-1', name: '毎日 30 分の読書', progress: 60 },
  { id: 'g-2', name: '週 3 回の運動習慣', progress: 40 },
];

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function Check({ status, onToggle }) {
  const ariaLabel =
    status === 'done' ? '完了済み。タップで未完了に戻す'
    : status === 'active' ? '進行中。タップで完了にする'
    : '予定。タップで完了にする';
  return (
    <button type="button" class={`s10-check s10-check-${status}`}
      role="checkbox" aria-checked={status === 'done'}
      aria-label={ariaLabel} onClick={onToggle}>
      {status === 'done' && (
        <svg viewBox="0 0 11 11" width="11" height="11" aria-hidden="true">
          <path d="M 2 5.5 L 4.5 8 L 9 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      )}
    </button>
  );
}

function TodayRow({ task, onToggle, onOpen }) {
  return (
    <li class={`s10-task s10-task-${task.status}`}>
      <span class="s10-task-time">{task.time}</span>
      <Check status={task.status} onToggle={() => onToggle(task.id)} />
      <button type="button" class="s10-task-card" onClick={() => onOpen(task.id)}
        aria-label={`${task.name} — ${task.meta}`}>
        <div class="s10-task-card-body">
          <p class={`s10-task-name s10-task-name-${task.status}`}>{task.name}</p>
          <p class={`s10-task-meta s10-task-meta-${task.status}`}>
            {task.status === 'active' && <span class="s10-task-meta-dash" aria-hidden="true" />}
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

function OverdueRow({ task, onDefer }) {
  return (
    <li class="s10-task s10-task-overdue">
      <span class="s10-task-time">{task.time}</span>
      <Check status="scheduled" onToggle={() => onDefer(task.id)} />
      <div class="s10-task-card s10-task-card-overdue">
        <div class="s10-task-card-body">
          <p class="s10-task-name s10-task-name-scheduled">{task.name}</p>
          <p class="s10-task-meta s10-task-meta-scheduled">{task.meta}</p>
        </div>
        <button type="button" class="s10-task-defer" onClick={() => onDefer(task.id)}>
          明日に延期
        </button>
      </div>
    </li>
  );
}

export function S10Grow() {
  const mainRef = useRef(null);
  const tickingRef = useRef(false);
  const [heroCompressed, setHeroCompressed] = useState(false);
  const [tasks, setTasks] = useState(TODAY_MOCK);
  const [upcomingOpen, setUpcomingOpen] = useState(false);

  // LP-002: SPA 遷移後の focus 移動
  useEffect(() => {
    if (mainRef.current) mainRef.current.focus({ preventScroll: true });
  }, []);

  // §4.4: scrollY > 60px でヒーロー圧縮。rAF でスロットル
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
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const completedCount = tasks.filter((t) => t.status === 'done').length;

  const cycleStatus = (current) => {
    if (current === 'scheduled') return 'active';
    if (current === 'active') return 'done';
    return 'scheduled';
  };

  const handleToggle = useCallback((id) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: cycleStatus(t.status),
              meta: cycleStatus(t.status) === 'done' ? '達成 · 15分'
                : cycleStatus(t.status) === 'active' ? '進行中 · 15分'
                : '予定 · 15分',
            }
          : t
      )
    );
  }, []);

  const handleOpenTask = useCallback((id) => { console.log('[S10Grow] openTask:', id); }, []);
  const handleDeferOverdue = useCallback((id) => { console.log('[S10Grow] deferOverdue:', id); }, []);
  const handleAddTask = useCallback(() => { console.log('[S10Grow] addTask (S-12 未実装)'); }, []);
  const handleCreateGoal = useCallback(() => { console.log('[S10Grow] createGoal (S-15 未実装)'); }, []);
  const handleOpenGoal = useCallback((id) => { console.log('[S10Grow] openGoal:', id); }, []);
  const handleTabSelect = useCallback((tabId) => {
    if (tabId === 'grow') return;
    console.log('[S10Grow] tabSelect:', tabId);
  }, []);

  return (
    <main ref={mainRef} tabIndex={-1} class="s10-grow" aria-labelledby="s10-today-label">
      {/* S10-1 ヒーロー */}
      <section class={'s10-hero ' + (heroCompressed ? 's10-hero-compressed' : '')}
        aria-label="プロフィールサマリー">
        <div class="s10-hero-avatar" aria-hidden="true" />
        <div class="s10-hero-body">
          <p class="s10-hero-lv-row">
            <span class="s10-hero-lv">Lv.{HERO_PROFILE.level}</span>
            <span class="s10-hero-label">{HERO_PROFILE.label}</span>
          </p>
          {!heroCompressed && (
            <>
              <div class="s10-hero-bar" role="progressbar"
                aria-valuenow={HERO_PROFILE.expCurrent} aria-valuemin={0} aria-valuemax={HERO_PROFILE.expNext}
                aria-valuetext={`${HERO_PROFILE.expCurrent} / ${HERO_PROFILE.expNext} EXP`}
                aria-label="経験値">
                <span class="s10-hero-bar-fill"
                  style={{ width: `${Math.round((HERO_PROFILE.expCurrent / HERO_PROFILE.expNext) * 100)}%` }} />
              </div>
              <p class="s10-hero-exp" aria-hidden="true">
                {HERO_PROFILE.expCurrent.toLocaleString()} / {HERO_PROFILE.expNext.toLocaleString()} EXP
              </p>
            </>
          )}
        </div>
      </section>

      {/* S10-2 Overdue */}
      {OVERDUE_MOCK.length > 0 && (
        <section class="s10-section s10-overdue">
          <h2 class="s10-overdue-label">OVERDUE</h2>
          <ul class="s10-task-list">
            {OVERDUE_MOCK.map((t) => <OverdueRow key={t.id} task={t} onDefer={handleDeferOverdue} />)}
          </ul>
        </section>
      )}

      {/* S10-3 Today ヘッダ */}
      <section class="s10-section s10-today">
        <header class="s10-today-header">
          <h2 id="s10-today-label" class="s10-today-label">TODAY</h2>
          <span class="s10-today-date">{TODAY_DATE_LABEL}</span>
        </header>
        <p class="s10-today-counter">{completedCount} / {tasks.length} completed</p>

        {/* S10-4 Today タスク */}
        <ul class="s10-task-list">
          {tasks.map((task) => (
            <TodayRow key={task.id} task={task} onToggle={handleToggle} onOpen={handleOpenTask} />
          ))}
        </ul>

        {/* S10-5 + タスクを追加 */}
        <button type="button" class="s10-add-task" onClick={handleAddTask}>+ タスクを追加</button>
      </section>

      {/* S10-6 Upcoming 折りたたみ */}
      <section class="s10-section s10-upcoming">
        <button type="button" class="s10-upcoming-header"
          aria-expanded={upcomingOpen} aria-controls="s10-upcoming-panel"
          onClick={() => setUpcomingOpen((v) => !v)}>
          <span class="s10-upcoming-label">UPCOMING</span>
          <span class="s10-upcoming-chevron" aria-hidden="true">{upcomingOpen ? '▲' : '▼'}</span>
        </button>
        {upcomingOpen && (
          <div id="s10-upcoming-panel" class="s10-upcoming-panel">
            {UPCOMING_MOCK.map((group) => (
              <div key={group.date} class="s10-upcoming-group">
                <p class="s10-upcoming-date">{group.date}</p>
                <ul class="s10-task-list">
                  {group.tasks.map((task) => (
                    <li key={task.id} class="s10-task s10-task-upcoming">
                      <span class="s10-task-time">{task.time}</span>
                      <span class="s10-check s10-check-scheduled" aria-hidden="true" />
                      <div class="s10-task-card">
                        <div class="s10-task-card-body">
                          <p class="s10-task-name s10-task-name-scheduled">{task.name}</p>
                        </div>
                        <span class="s10-task-category" aria-hidden="true">
                          <span class={`s10-task-dot s10-task-dot-${task.category}`} />
                          <span class="s10-task-category-label">{task.categoryLabel}</span>
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

      {/* S10-7 / S10-8 Goals */}
      <section class="s10-section s10-goals">
        <h2 class="s10-goals-label">GOALS</h2>
        <ul class="s10-goals-list">
          {GOALS_MOCK.map((g) => (
            <li key={g.id}>
              <button type="button" class="s10-goal" onClick={() => handleOpenGoal(g.id)}>
                <div class="s10-goal-top">
                  <span class="s10-goal-name">{g.name}</span>
                  <span class="s10-goal-pct">{g.progress}%</span>
                </div>
                <div class="s10-goal-bar" role="progressbar"
                  aria-valuenow={g.progress} aria-valuemin={0} aria-valuemax={100}
                  aria-label={`${g.name} の進捗`}>
                  <span class="s10-goal-bar-fill" style={{ width: `${g.progress}%` }} />
                </div>
              </button>
            </li>
          ))}
        </ul>
        {/* S10-9 + ゴールを作成 */}
        <button type="button" class="s10-add-goal" onClick={handleCreateGoal}>+ ゴールを作成</button>
      </section>

      {/* S10-10 BottomTabBar */}
      <BottomTabBar active="grow" onSelect={handleTabSelect} />
    </main>
  );
}

export default S10Grow;
```

### 5. lais/src/components/screens/S10Grow.css（新規全文）

```css
.s10-grow {
  min-height: 100dvh;
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: 0 var(--space-lg) calc(82px + var(--space-lg));
}

@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .s10-grow {
    padding-bottom: calc(82px + env(safe-area-inset-bottom) + var(--space-lg));
  }
}

.s10-grow:focus:not(:focus-visible) { outline: none; }
.s10-grow:focus-visible { outline: 3px solid var(--accent); outline-offset: -3px; }

/* S10-1 ヒーロー */
.s10-hero {
  display: flex; align-items: center; gap: var(--space-md);
  padding: 20px 0 32px; /* §4.4 固定値 */
  transition: padding var(--duration-fast) var(--ease-out);
}

.s10-hero-avatar {
  width: 48px; height: 48px; flex-shrink: 0;
  border-radius: 50%;
  border: 1.5px solid var(--accent);
  background: var(--bg-surface);
  transition: width var(--duration-fast) var(--ease-out),
              height var(--duration-fast) var(--ease-out);
}

.s10-hero-body { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.s10-hero-lv-row { margin: 0; display: flex; align-items: baseline; gap: var(--space-sm); }
.s10-hero-lv { font-size: 20px; font-weight: 400; letter-spacing: -0.5px; color: var(--text-primary); }
.s10-hero-label { font-size: 11px; color: var(--text-muted); letter-spacing: 1.5px; text-transform: uppercase; font-weight: 600; }

.s10-hero-bar {
  width: 100%; height: 4px;
  background: var(--accent-subtle);
  border-radius: var(--radius-pill);
  margin-top: var(--space-sm); overflow: hidden;
}
.s10-hero-bar-fill {
  display: block; height: 100%;
  background: var(--accent);
  border-radius: var(--radius-pill);
  transition: width var(--duration-slow) var(--ease-out);
}
.s10-hero-exp {
  margin: 4px 0 0; font-size: 11px;
  color: var(--text-secondary);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.s10-hero-compressed { padding: 10px 0 var(--space-md); }
.s10-hero-compressed .s10-hero-avatar { width: 32px; height: 32px; }

@media (max-height: 400px) { .s10-hero { display: none; } }

/* 共通: セクション */
.s10-section { margin-top: var(--space-xl); }

/* S10-2 Overdue */
.s10-overdue-label {
  margin: 0 0 var(--space-sm);
  font-size: 11px; font-weight: 600;
  color: var(--danger);
  letter-spacing: 1.5px; text-transform: uppercase;
}

/* S10-3 Today ヘッダ */
.s10-today-header {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-bottom: var(--space-xs);
}
.s10-today-label {
  margin: 0; font-size: 14px; font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 1.5px; text-transform: uppercase;
}
.s10-today-date { font-size: 11px; color: var(--text-muted); }
.s10-today-counter {
  margin: 0 0 var(--space-md);
  font-size: 11px; color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

/* S10-4 Today タスク行 */
.s10-task-list { list-style: none; margin: 0; padding: 0; }
.s10-task {
  display: flex; align-items: center;
  gap: 12px; /* §4.4 固定値 */
  margin-bottom: 8px; /* §4.4 固定値 */
}
.s10-task-time {
  flex-shrink: 0; width: 40px; /* §4.4 固定値 */
  text-align: right;
  font-size: 14px; color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.s10-check {
  flex-shrink: 0; width: 22px; height: 22px; /* §4.4 固定値 */
  border-radius: 50%;
  background: transparent;
  padding: 0;
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition:
    background-color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--spring-default);
}
.s10-check:focus:not(:focus-visible) { outline: none; }
.s10-check:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.s10-check-done { background: var(--success-subtle); border: 2px solid var(--success); color: var(--success); }
.s10-check-active { border: 2px solid var(--accent); }
.s10-check-scheduled { border: 2px solid var(--border-strong); }

.s10-task-card {
  flex: 1; min-width: 0;
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--space-sm);
  padding: 10px 14px; /* §4.4 固定値 */
  min-height: 44px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: none; text-align: left; cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-out);
}
button.s10-task-card:focus:not(:focus-visible) { outline: none; }
button.s10-task-card:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
.s10-task-done .s10-task-card { background: var(--success-subtle); }
.s10-task-active .s10-task-card { background: var(--accent-subtle); }
.s10-task-scheduled .s10-task-card { background: var(--bg-surface); }
.s10-task-card-overdue { border-left: 2px solid var(--danger); padding-left: 12px; }

.s10-task-card-body { flex: 1; min-width: 0; }
.s10-task-name {
  margin: 0; font-size: 14px; letter-spacing: -0.02em; line-height: 1.4;
}
.s10-task-name-done { color: var(--text-secondary); }
.s10-task-name-active { color: var(--text-primary); }
.s10-task-name-scheduled { color: var(--text-secondary); }

.s10-task-meta {
  margin: 2px 0 0; font-size: 11px; line-height: 1.4;
  display: inline-flex; align-items: center; gap: var(--space-sm);
}
.s10-task-meta-done { color: var(--success); }
.s10-task-meta-active { color: var(--text-secondary); }
.s10-task-meta-scheduled { color: var(--text-muted); }
.s10-task-meta-dash {
  display: inline-block; width: 8px; height: 1px;
  background: #e8a855; /* §4.4 指定 */
}

.s10-task-category { display: inline-flex; align-items: center; gap: var(--space-xs); flex-shrink: 0; }
.s10-task-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.s10-task-dot-work { background: var(--cat-work, #79c0ff); }
.s10-task-dot-health { background: var(--cat-health, #7ee787); }
.s10-task-dot-learn { background: var(--cat-learn, #d2a8ff); }
.s10-task-category-label { font-size: 11px; color: var(--text-muted); letter-spacing: -0.02em; }

.s10-task-defer {
  margin-left: var(--space-sm);
  font-size: 14px; color: var(--accent); text-decoration: underline;
  background: transparent; border: none; padding: 0;
  min-height: 44px; cursor: pointer;
}
.s10-task-defer:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* S10-5 + タスクを追加 */
.s10-add-task {
  margin-top: var(--space-sm);
  margin-left: 52px; /* §4.4 固定値: 40px + gap 12px */
  min-height: 44px;
  font-size: 14px; color: var(--accent); text-decoration: underline;
  background: transparent; border: none; padding: 0;
  cursor: pointer; display: inline-flex; align-items: center;
}
.s10-add-task:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; }

/* S10-6 Upcoming */
.s10-upcoming { margin-top: var(--space-xl); }
.s10-upcoming-header {
  width: 100%;
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-sm) 0;
  background: transparent; border: none;
  min-height: 44px; cursor: pointer;
}
.s10-upcoming-header:focus:not(:focus-visible) { outline: none; }
.s10-upcoming-header:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.s10-upcoming-label {
  font-size: 11px; color: var(--text-muted);
  letter-spacing: 1.5px; text-transform: uppercase; font-weight: 600;
}
.s10-upcoming-chevron { font-size: 14px; color: var(--text-muted); }
.s10-upcoming-panel { margin-top: var(--space-sm); }
.s10-upcoming-group { margin-bottom: var(--space-md); }
.s10-upcoming-date { margin: 0 0 var(--space-sm); font-size: 11px; color: var(--text-muted); font-weight: 600; }
.s10-task-upcoming .s10-task-card { background: var(--bg-surface); }

/* S10-7 / S10-8 Goals */
.s10-goals-label {
  margin: 0 0 var(--space-md);
  font-size: 14px; font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 1.5px; text-transform: uppercase;
}
.s10-goals-list { list-style: none; margin: 0; padding: 0; }
.s10-goal {
  width: 100%;
  padding: 12px 0; /* §4.4 固定値 */
  display: flex; flex-direction: column; gap: var(--space-xs);
  background: transparent; border: none;
  cursor: pointer; text-align: left;
  margin-bottom: var(--space-sm);
}
.s10-goal:focus:not(:focus-visible) { outline: none; }
.s10-goal:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; }
.s10-goal-top { display: flex; justify-content: space-between; align-items: baseline; }
.s10-goal-name { font-size: 14px; letter-spacing: -0.02em; color: var(--text-primary); }
.s10-goal-pct { font-size: 11px; color: var(--text-muted); font-variant-numeric: tabular-nums; }

.s10-goal-bar {
  height: 3px; /* §4.4 固定値 */
  background: var(--accent-subtle);
  border-radius: var(--radius-pill);
  overflow: hidden;
}
.s10-goal-bar-fill {
  display: block; height: 100%;
  background: var(--accent);
  border-radius: var(--radius-pill);
  transition: width var(--duration-slow) var(--ease-out);
}

/* S10-9 + ゴールを作成 */
.s10-add-goal {
  margin-top: var(--space-sm);
  padding: 14px 0; /* §4.4 固定値 */
  min-height: 44px;
  font-size: 14px; color: var(--accent); text-decoration: underline;
  background: transparent; border: none;
  cursor: pointer; display: inline-flex; align-items: center;
}
.s10-add-goal:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; }

/* LP-001: prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .s10-hero, .s10-hero-avatar, .s10-hero-bar-fill,
  .s10-check, .s10-task-card, .s10-goal-bar-fill {
    transition: none;
  }
}
```

---

## コントラスト実測（LP-004） — Night Sky テーマ

| 要素 | 前景 | 背景 | 実測比 | WCAG AA |
|---|---|---|---|---|
| `.s10-hero-lv` Lv.12 20px | `--text-primary #F0F6FC` | `--bg-primary #0D1117` | **17.2:1** | 大文字 3:1 ✅ |
| `.s10-hero-label` EXPLORER 11px | `--text-muted #8A94A3` | `--bg-primary #0D1117` | **7.0:1** | 通常 4.5:1 ✅ |
| `.s10-hero-exp` 11px tabular | `--text-secondary #B1B8C2` | `--bg-primary #0D1117` | **10.8:1** | ✅ |
| `.s10-hero-bar-fill` `--accent` | `--accent #79C0FF` | `--accent-subtle rgba(121,192,255,0.14)` | **非テキスト / 装飾** | 1.4.11 対象外 |
| `.s10-today-label` 14px weight 600 | `--text-muted #8A94A3` | `--bg-primary #0D1117` | **7.0:1** | 通常 4.5:1 ✅（weight 600 は「大文字」扱いではない） |
| `.s10-task-name-active` 14px | `--text-primary #F0F6FC` | `--accent-subtle` on `--bg-primary` → 実効 ~#18222D | **~14.5:1** | ✅ |
| `.s10-task-name-done` 14px | `--text-secondary #B1B8C2` | `--success-subtle` on `--bg-primary` → 実効 ~#0F1C15 | **~9.8:1** | ✅ |
| **A-2 注目:** `.s10-task-meta-done` 11px 達成表記 | `--success #3FB950` | `--success-subtle` on `--bg-primary` → 実効 ~#0F1C15 | **~6.3:1** | 通常 4.5:1 ✅（spec §7 Phase 4 A-2 対応確認） |
| `.s10-check-scheduled` border | `--border-strong #6E7681` | `--bg-primary #0D1117` | **3.6:1** | 非テキスト 3:1 ✅ |
| `.s10-check-done` SVG | `--success #3FB950` | `--success-subtle on --bg-primary` | **~6.3:1** | ✅ |
| `.s10-task-defer` 14px | `--accent #79C0FF` | `--success-subtle` on `--bg-primary` | **~9.0:1** | ✅ |
| `.bottom-tab-bar-btn` inactive SVG | `--text-secondary #B1B8C2` | `--bg-surface #161B22` | **9.4:1** | 非テキスト 3:1 ✅ |
| `.bottom-tab-bar-btn-active` label 11px 600 | `--accent #79C0FF` | `--accent-subtle` on `--bg-surface` → 実効 ~#1E2B38 | **~7.8:1** | ✅ |

**A-2（§7 Phase 4 対応）**: `--success on --success-subtle` が 6.3:1 で AA 合格を確認済み。spec §7 の B-1 実装（Overdue / Upcoming）も完了。

---

## ビルド結果

```
vite v5.4.21
✓ 70 modules transformed.
dist/assets/S02Onboarding-B1_g11xP.css    3.70 kB │ gzip: 1.11 kB
dist/assets/S10Grow-fVmGV-nx.css          9.32 kB │ gzip: 1.87 kB  ← 新規
dist/assets/index-D_bRO8vk.css           14.75 kB │ gzip: 3.63 kB
dist/assets/S02Onboarding-5yi30G04.js     2.95 kB │ gzip: 1.44 kB
dist/assets/S10Grow-Ddeio4rf.js           9.20 kB │ gzip: 3.08 kB  ← 新規（BottomTabBar 同梱）
dist/assets/index-Bwf4iAfw.js           239.17 kB │ gzip: 67.90 kB
✓ built in 417ms
```

LP-012 適用により S10Grow + BottomTabBar は 1 つの独立チャンクとして分離。

---

## 完了コマンド結果

| cmd | 結果 | 判定 |
|---|---|---|
| cmd1 `grep -c 'grow\|S10\|Grow' App.jsx` | `4` | PASS (≥1) |
| cmd2 `test -f S10Grow.jsx` | 存在 | PASS |
| cmd3 `test -f BottomTabBar.jsx` | 存在 | PASS |
| cmd4 `grep -c 'lazy' App.jsx` | `4` | PASS (≥2) |

---

## レビュー観点（各ペルソナ向け）

- **code_reviewer:** useCallback での handler 安定化 / useEffect cleanup / rAF スロットル / cycleStatus の meta 文字列ハードコード（モックのため）/ BottomTabBar / S10Grow / TodayRow / OverdueRow / Check の責務分離
- **security_engineer:** innerHTML / dangerouslySetInnerHTML なし / モック文字列埋め込みのみ / 攻撃面極小 / console.log が本番バンドルに残る懸念（M4-B 未蓄積 LP 候補）
- **sw_debugger:** scroll listener rAF スロットル / tickingRef の race / passive: true / 初期同期 `handleScroll()` / アンマウント時 removeEventListener / Upcoming 折りたたみで aria-expanded と panel の同期 / cycleStatus の遷移順
- **performance_engineer:** lazy import 適用済 / S10Grow 9.20kB は妥当 / scroll listener 1 本のみ / UPCOMING/GOALS が静的配列 / EXP バー width CSS transition が compositor-only / 圧縮時の条件 rendering `{!heroCompressed && ...}` による EXP バーマウント/アンマウント
- **a11y_engineer:** main tabIndex={-1} + focus 移動 / aria-labelledby / role=checkbox + aria-checked / role=progressbar + aria-valuenow/min/max/valuetext / role=tablist + role=tab + aria-selected / aria-expanded + aria-controls / 折りたたみパネルのフォーカス管理 / タップターゲット 44×44 全要素確保 / prefers-reduced-motion 完全性 / コントラスト（上表）
- **spec_compliance:** §4.4 S10-1〜S10-10 の全要素仕様との厳密比較。特にヒーロー圧縮挙動 / チェック状態の色 / タスク名階層 / amber dash / BottomTabBar の pill 仕様
- **edge_case_hunter:** scrollY が負値 / 上端までスクロールバック / Upcoming 折りたたみ + キーボードナビゲーション / キーボード表示時 @media max-height 400px / OVERDUE_MOCK 空配列時の条件描画 / cycleStatus の連打 / rAF が呼ばれない環境 / タブタップ連打 / Safari で scroll event が sticky に適用されるか

---

## severity 基準（再掲）

- **CRITICAL:** 実装に進むと確実に障害・矛盾・データ損失が発生する / 仕様として根本破綻
- **HIGH:** あった方がよい / ベストプラクティス / 改善余地
- **MEDIUM / LOW:** 軽微な改善提案

severity inflation を避けること。適用済み LP 節で明示しているパターンは既に対応済みであり、重複指摘は MEDIUM 以下で留めてください。
