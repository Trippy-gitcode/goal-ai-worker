# Lais M4-F 実装レビューパッケージ — S-14 Goal Detail（フルスクリーン）

> Phase 4 M4-F のレビュー対象一式。
> レビュー種別: sub_review_flow.md D. 実装レビュー（R1 ゴールデン）
> リスク: 🟡 中（フルスクリーン画面 / route 追加 / Mock goal データ / 3ペルソナ制ENG自律 3 回目）

---

## ミッション定義（3ペルソナ制 ENG自律判定）

- **ADV判定:** S-14 はフルスクリーン画面（GROW から右スライド遷移）。新規 `lais/src/components/screens/S14GoalDetail.{jsx,css}` + `App.jsx` に `/goal/:id` route 追加（lazy + Suspense, LP-012）+ `S10Grow.handleOpenGoal` を `route()` に変更。Mock goal から S14-1〜S14-10c 全描画。S14-8 タスク行は spec 「S10-4 と完全一致」明記のため S10 スタイル参考に同等を実装（コピー戦略継続）。LP 全 8 + LP-015 候補（S14-6/S14-10a Active 要素）予防適用。
- **QA検証:** template_v2 準拠 ✓ / LOCK 範囲（lais/）内 ✓ / spec §4.7 全項目 ✓ / POエスカレーション条件非該当 ✓
- **PO代理:** PD-006（CRITICAL 0、HIGH 後回し）✓ / PD-003（削除確認・編集モード・7日ルール演出は後続）✓ / PD-005（LP事前適用）✓
- → 3者合意 → 実行

**要件（達成状況）:**
1. ✅ 新規 `S14GoalDetail.{jsx,css}`
2. ✅ `App.jsx` `/goal/:id` route + lazy import + Suspense fallback
3. ✅ `S10Grow.handleOpenGoal(id)` → `route('/goal/' + id)` 遷移
4. ✅ S14-1 ← 戻る + GROW ラベル / `route('/grow')`
5. ✅ S14-2 ゴールタイトル (28px / 400 / -0.5px)
6. ✅ S14-3 進捗% (48px thin + 20px 単位 / `--accent`)
7. ✅ S14-4 プログレスバー 8px / `role="progressbar"` + `aria-valuenow`
8. ✅ S14-5 残り日数（カレンダー SVG + テキスト）
9. ✅ S14-6 カテゴリタグ（`--accent-subtle` + border `--accent` で LP-015 適用）
10. ✅ S14-7 TASK ラベル
11. ✅ S14-8 タスク行 (S10-4 と一致): 22×22 チェック + 状態別色 + タスク名 + 日時
12. ✅ S14-9 `+ タスクを追加`（onClick console.log）
13. ✅ S14-10a/b/c 3 ボタン等幅 (AI / 編集 / 削除)
14. ✅ LP-001/002/003/011/012/013/014 + LP-015 候補

**スコープ外（後続）:**
- 削除確認ダイアログ + Undo 30s
- 編集モード（spec に inline edit 言及なし）
- タスク行のチェックトグル動作（表示のみ）
- タスク行タップ → S-13 統合
- + タスクを追加 → S-12 統合
- 7 日ルール演出（達成バナー + EXP 加算）
- 右スライド遷移カスタムアニメ
- AI 相談実遷移先
- Supabase 連携

---

## 適用済み Learned Patterns

| LP | パターン名 | 適用箇所 |
|---|---|---|
| LP-001 | prefers-reduced-motion | `.s14-progress-bar-fill` `.s14-action-*` の transition-duration を 1ms 縮退 |
| LP-002 | マウント時 main へ focus | `<main ref={mainRef} tabIndex={-1}>` + useEffect で `mainRef.current.focus({ preventScroll: true })` |
| LP-003 | inline handler 最小化 | 全イベントは JSX プロパティ経由 |
| LP-004 | WCAG AA コントラスト実測値 | 下部「コントラスト実測」節に記載 |
| LP-011 | デザイントークン参照 | 全 ms / color はトークン。spec §4.7 由来の固定 px 値（48px % / 20px 単位 / 8px バー / 22×22 チェック / 11×11 SVG / 14×14 SVG / 8×8 ドット / 28px タイトル）は spec 由来として許容 |
| LP-012 | ルートレベルコード分割 | `S14GoalDetail = lazy(() => import('./screens/S14GoalDetail.jsx'))` + Suspense fallback。build 結果: 独立 chunk 4.25 kB JS / 6.27 kB CSS |
| LP-013 | env(safe-area-inset-bottom) 段階的適用 | `.s14-goal` の base padding-bottom: var(--space-2xl) → `@supports` 内で `calc(env() + var(--space-2xl))` |
| LP-014 | programmatic / keyboard focus 分離 | `.s14-goal` `.s14-back` `.s14-task-card` `.s14-add-task` `.s14-action-*` 全てに `:focus:not(:focus-visible) { outline: none }` + `:focus-visible` 可視リング |
| **LP-015 候補** | Active state border-color 残し | `.s14-cat-tag` `border: 1px solid var(--accent)` / `.s14-action-ai` `border: 1px solid var(--accent)` で WCAG 1.4.11 Non-text Contrast を確保（M4-D 初出 / M4-E 2回目 / **M4-F 3回目 → 正式昇格判定対象**） |

---

## design_spec_v1.md §4.7 S-14 Goal Detail（完全引用）

### 4.7 S-14 Goal Detail（フルスクリーン）

- **目的 / UX参照:** ゴール進捗管理。ux_v1.md §3
- **画面タイプ:** フルスクリーン、右スライド遷移で GROW から入る
- **レイアウト原則:** 左右 `--space-lg` / 縦スクロール

**セクション順序:**
1. ナビゲーション行（← GROW）
2. ゴールタイトル
3. 大進捗表示（48px % + 大プログレスバー）
4. メタデータ行（残り日数 + カテゴリタグ）
5. タスクセクションラベル
6. タスク一覧
7. `+ タスクを追加` リンク
8. アクションボタン行（AI 相談 / 編集 / 削除）

**要素仕様:**

| ID | 要素 | 仕様 |
|---|---|---|
| S14-1 | ← 戻るボタン | 左上 44×44 タップ領域 / SVG 20×20 stroke `--text-primary` / 右に ラベル `GROW` 11px `--text-muted` uppercase |
| S14-2 | ゴールタイトル | font-size `28px` weight `400` letter-spacing `-0.5px` color `--text-primary` / padding-top `--space-md` |
| S14-3 | 大進捗表示 | font-size `48px` weight `200` color `--accent` letter-spacing `-2px` / 単位 `%` は 20px weight `400` / margin-top `--space-lg` |
| S14-4 | 大プログレスバー | 幅 100% 高さ `8px` 背景 `--accent-subtle` 塗り `--accent` radius `--radius-pill` / margin-top `--space-sm` |
| S14-5 | 残り日数 | `14px` カレンダー SVG + テキスト `残り28日` 14px `--text-secondary` / margin-top `--space-md` |
| S14-6 | カテゴリタグ | 背景 `--accent-subtle` color `--accent` font-size `11px` padding `4px 12px` radius `--radius-pill` / S14-5 の右 |
| S14-7 | タスクセクションラベル | `TASK` / 11px `--text-muted` uppercase letter-spacing `1.5px` / margin-top `--space-xl` |
| S14-8 | タスク行 | padding `12px 0` / border-bottom `1px solid --border` / flex / チェック 22×22（S10-4 と同状態別スタイル）+ タスク名 14px（完了・予定ともに `--text-secondary`、進行中は `--text-primary`。S10-4 と完全一致）+ 日時 11px `--text-muted` |
| S14-9 | `+ タスクを追加` | S10-5 と同スタイル |
| S14-10 | アクションボタン行 | 3 ボタン等幅 / 高さ `44px` / gap `--space-sm` / margin-top `--space-xl` |
| S14-10a | AI 相談 | 背景 `--accent-subtle` color `--accent` weight `600` radius `--radius-md` |
| S14-10b | 編集 | border `1px solid --border-strong` color `--text-secondary` radius `--radius-md` |
| S14-10c | 削除 | 背景 `--danger-solid` color `#FFFFFF` weight `600` radius `--radius-md` |

**状態・インタラクション:**
- タスク行タップ → S-13 ハーフモーダル
- チェックタップ → S10-4 と同じスプリングアニメ + Undo
- [← GROW] → ease-out 350ms 右スライド戻り
- [削除] → 確認ダイアログ → 実行 + Undo スナックバー 30s
- 7 日ルール（ux_v1.md §3.5）

**検証可能なスクショ事実:**
- 上端に戻る矢印 + `GROW` ラベル
- 中央に大きな `%` 数字（48px 相当）
- タスクセクションに複数タスク行
- 下端に 3 ボタンが等幅で並ぶ

**Phase 4 対応:** A-5（メモ本文コントラスト 4.30:1 ギリギリ）

---

## 実装パッケージ

### 1. lais/src/components/App.jsx（M4-F 差分のみ）

```jsx
const S14GoalDetail = lazy(() => import('./screens/S14GoalDetail.jsx'));

// Router 内
<GoalDetailRoute path="/goal/:id" />

function GoalDetailRoute({ id }) {
  return (
    <Suspense
      fallback={
        <main class="route-fallback" role="status" aria-live="polite" aria-label="読み込み中" />
      }
    >
      <S14GoalDetail id={id} />
    </Suspense>
  );
}
```

### 2. lais/src/components/screens/S10Grow.jsx（M4-F 差分のみ）

```jsx
const handleOpenGoal = useCallback((id) => {
  route('/goal/' + id);
}, []);
```

### 3. lais/src/components/screens/S14GoalDetail.jsx（新規全文）

```jsx
import { useCallback, useEffect, useId, useRef, useState } from 'preact/hooks';
import { route } from 'preact-router';
import './S14GoalDetail.css';

/*
 * S-14 Goal Detail（フルスクリーン）
 * design_spec_v1.md §4.7 準拠
 */

const GOALS_MOCK = {
  'g-1': {
    id: 'g-1', name: '毎日 30 分の読書', progress: 60, daysLeft: 28,
    category: 'learn', categoryLabel: 'Learn',
    tasks: [
      { id: 't-r1', name: '今日の章を読む',  time: '10:00', dateLabel: '今日', status: 'done',      meta: '達成 · 30分' },
      { id: 't-r2', name: '昨日の振り返り',  time: '21:00', dateLabel: '昨日', status: 'done',      meta: '達成 · 5分' },
      { id: 't-r3', name: '次の本を選ぶ',    time: '12:00', dateLabel: '今日', status: 'active',    meta: '進行中 · 15分' },
      { id: 't-r4', name: '読書ノート整理',  time: '20:00', dateLabel: '4/16', status: 'scheduled', meta: '予定 · 20分' },
      { id: 't-r5', name: '感想を書く',      time: '21:30', dateLabel: '4/16', status: 'scheduled', meta: '予定 · 10分' },
    ],
  },
  'g-2': {
    id: 'g-2', name: '週 3 回の運動習慣', progress: 40, daysLeft: 14,
    category: 'health', categoryLabel: 'Health',
    tasks: [
      { id: 't-w1', name: '朝のストレッチ',  time: '07:30', dateLabel: '今日', status: 'done',      meta: '達成 · 15分' },
      { id: 't-w2', name: 'ジョギング',      time: '18:00', dateLabel: '今日', status: 'active',    meta: '進行中 · 30分' },
      { id: 't-w3', name: '筋トレ',          time: '19:00', dateLabel: '4/16', status: 'scheduled', meta: '予定 · 30分' },
    ],
  },
};

const DEFAULT_GOAL = GOALS_MOCK['g-1'];

export function S14GoalDetail({ id }) {
  const titleId = useId();
  const mainRef = useRef(null);
  const [goal] = useState(() => GOALS_MOCK[id] || DEFAULT_GOAL);

  useEffect(() => {
    if (mainRef.current) mainRef.current.focus({ preventScroll: true });
  }, []);

  const handleBack      = useCallback(() => route('/grow'), []);
  const handleAddTask   = useCallback(() => { console.log('[S14] addTask'); }, []);
  const handleOpenTask  = useCallback((tid) => { console.log('[S14] openTask:', tid); }, []);
  const handleAi        = useCallback(() => { console.log('[S14] AI'); }, []);
  const handleEdit      = useCallback(() => { console.log('[S14] edit'); }, []);
  const handleDelete    = useCallback(() => { console.log('[S14] delete'); }, []);

  return (
    <main ref={mainRef} tabIndex={-1} class="s14-goal" aria-labelledby={titleId}>
      {/* S14-1 */}
      <nav class="s14-nav" aria-label="ゴール詳細ナビゲーション">
        <button type="button" class="s14-back" onClick={handleBack} aria-label="GROW に戻る">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
            <path d="M12.5 4 L6.5 10 L12.5 16" stroke="currentColor" stroke-width="1.6"
              stroke-linecap="round" stroke-linejoin="round" fill="none" />
          </svg>
          <span class="s14-back-label" aria-hidden="true">GROW</span>
        </button>
      </nav>

      {/* S14-2 */}
      <h1 id={titleId} class="s14-title">{goal.name}</h1>

      {/* S14-3 */}
      <p class="s14-progress" aria-hidden="true">
        <span class="s14-progress-pct">{goal.progress}</span>
        <span class="s14-progress-unit">%</span>
      </p>

      {/* S14-4 */}
      <div class="s14-progress-bar" role="progressbar"
        aria-valuenow={goal.progress} aria-valuemin={0} aria-valuemax={100}
        aria-label={`${goal.name} の進捗 ${goal.progress}%`}>
        <span class="s14-progress-bar-fill" style={{ width: `${goal.progress}%` }} />
      </div>

      {/* S14-5 / S14-6 */}
      <div class="s14-meta">
        <p class="s14-days-left">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" focusable="false">
            <rect x="2" y="3" width="10" height="9" rx="1.5" stroke="currentColor" stroke-width="1.2" />
            <path d="M5 1.5v2M9 1.5v2M2 6h10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
          </svg>
          <span>残り{goal.daysLeft}日</span>
        </p>
        <span class={`s14-cat-tag s14-cat-tag-${goal.category}`}>{goal.categoryLabel}</span>
      </div>

      {/* S14-7 */}
      <h2 class="s14-task-label">TASK</h2>

      {/* S14-8 */}
      <ul class="s14-task-list">
        {goal.tasks.map((task) => (
          <li key={task.id} class={`s14-task-row s14-task-row-${task.status}`}>
            <span class={`s14-check s14-check-${task.status}`} aria-hidden="true">
              {task.status === 'done' && (
                <svg viewBox="0 0 11 11" width="11" height="11" focusable="false">
                  <path d="M 2 5.5 L 4.5 8 L 9 3" fill="none" stroke="currentColor"
                    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              )}
            </span>
            <button type="button" class="s14-task-card"
              onClick={() => handleOpenTask(task.id)}
              aria-label={`${task.name} — ${task.meta}`}>
              <span class={`s14-task-name s14-task-name-${task.status}`}>{task.name}</span>
              <span class="s14-task-date">{task.dateLabel} {task.time}</span>
            </button>
          </li>
        ))}
      </ul>

      {/* S14-9 */}
      <button type="button" class="s14-add-task" onClick={handleAddTask}>+ タスクを追加</button>

      {/* S14-10 */}
      <div class="s14-actions">
        <button type="button" class="s14-action-ai"     onClick={handleAi}>AI 相談</button>
        <button type="button" class="s14-action-edit"   onClick={handleEdit}>編集</button>
        <button type="button" class="s14-action-delete" onClick={handleDelete}>削除</button>
      </div>
    </main>
  );
}

export default S14GoalDetail;
```

### 4. lais/src/components/screens/S14GoalDetail.css（新規全文）

```css
/*
 * S-14 Goal Detail — design_spec_v1.md §4.7 準拠
 * フルスクリーン画面（S-10 と同構造）
 * LP-001/011/013/014 + LP-015 候補（S14-6/S14-10a Active border-color 残し）事前適用
 */

.s14-goal {
  min-height: 100dvh;
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: var(--space-md) var(--space-lg) var(--space-2xl);
  display: flex;
  flex-direction: column;
}

@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .s14-goal { padding-bottom: calc(env(safe-area-inset-bottom) + var(--space-2xl)); }
}

.s14-goal:focus:not(:focus-visible) { outline: none; }
.s14-goal:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: calc(var(--focus-ring-offset) * -1);
}

/* S14-1 */
.s14-nav { display: flex; align-items: center; min-height: var(--tap-target-min); }

.s14-back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: var(--tap-target-min);
  min-height: var(--tap-target-min);
  padding: 0 var(--space-sm) 0 var(--space-md);
  background: transparent;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  font-family: var(--font-family-base);
  margin-left: calc(var(--space-md) * -1);
  border-radius: var(--radius-sm);
}

.s14-back-label {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-label);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-label);
}

.s14-back:focus:not(:focus-visible) { outline: none; }
.s14-back:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

/* S14-2 */
.s14-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-regular);
  letter-spacing: -0.5px;
  color: var(--text-primary);
  line-height: var(--line-height-ja-heading);
  margin: 0;
  padting-top: var(--space-md);
}

/* S14-3 */
.s14-progress {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin: var(--space-lg) 0 0;
  color: var(--accent);
  letter-spacing: -2px;
}
.s14-progress-pct { font-size: var(--font-size-3xl); font-weight: var(--font-weight-thin); }
.s14-progress-unit { font-size: var(--font-size-lg); font-weight: var(--font-weight-regular); letter-spacing: 0; }

/* S14-4 */
.s14-progress-bar {
  width: 100%; height: 8px;
  background: var(--accent-subtle);
  border-radius: var(--radius-pill);
  overflow: hidden;
  margin-top: var(--space-sm);
}
.s14-progress-bar-fill {
  display: block;
  height: 100%;
  background: var(--accent);
  border-radius: var(--radius-pill);
  transition: width var(--duration-slow) var(--ease-out);
}

/* S14-5 / S14-6 */
.s14-meta {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-top: var(--space-md);
  flex-wrap: wrap;
}
.s14-days-left {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0;
  letter-spacing: var(--letter-spacing-ja);
}
.s14-days-left svg { color: var(--text-muted); flex-shrink: 0; }

/* LP-015 候補: Active state border-color 残し */
.s14-cat-tag {
  background: var(--accent-subtle);
  color: var(--accent);
  font-size: var(--font-size-xs);
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--accent);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-label);
  text-transform: uppercase;
  line-height: var(--line-height-label);
}

/* S14-7 */
.s14-task-label {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-label);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-label);
  margin: var(--space-xl) 0 var(--space-sm);
}

/* S14-8 */
.s14-task-list { list-style: none; margin: 0; padding: 0; }
.s14-task-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}

.s14-check {
  width: 22px; height: 22px;
  border-radius: 50%;
  border: 2px solid var(--border-strong);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: transparent;
}
.s14-check-done {
  border-color: var(--success);
  color: var(--success);
  background: var(--success-subtle);
}
.s14-check-active { border-color: var(--accent); }
.s14-check-scheduled { border-color: var(--border-strong); }

.s14-task-card {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: var(--font-family-base);
  text-align: left;
  min-width: 0;
  border-radius: var(--radius-sm);
}
.s14-task-card:focus:not(:focus-visible) { outline: none; }
.s14-task-card:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

.s14-task-name {
  font-size: var(--font-size-sm);
  letter-spacing: var(--letter-spacing-ja);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.s14-task-name-done, .s14-task-name-scheduled { color: var(--text-secondary); }
.s14-task-name-active { color: var(--text-primary); }

.s14-task-date {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  flex-shrink: 0;
  margin-left: var(--space-sm);
  font-variant-numeric: tabular-nums;
}

/* S14-9 */
.s14-add-task {
  display: inline-block;
  align-self: flex-start;
  background: transparent;
  border: none;
  color: var(--accent);
  font-size: var(--font-size-sm);
  font-family: var(--font-family-base);
  text-decoration: underline;
  cursor: pointer;
  padding: var(--space-md) 0;
  min-height: var(--tap-target-min);
  letter-spacing: var(--letter-spacing-ja);
}
.s14-add-task:focus:not(:focus-visible) { outline: none; }
.s14-add-task:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

/* S14-10 */
.s14-actions {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-xl);
}

.s14-action-ai, .s14-action-edit, .s14-action-delete {
  flex: 1;
  min-height: var(--tap-target-min);
  height: var(--tap-target-min);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-family: var(--font-family-base);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

/* S14-10a — LP-015 候補 border 残し */
.s14-action-ai {
  background: var(--accent-subtle);
  color: var(--accent);
  font-weight: var(--font-weight-semibold);
  border: 1px solid var(--accent);
}

/* S14-10b */
.s14-action-edit {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-strong);
}

/* S14-10c */
.s14-action-delete {
  background: var(--danger-solid);
  color: #FFFFFF;
  border: 1px solid var(--danger-solid);
  font-weight: var(--font-weight-semibold);
}

.s14-action-ai:focus:not(:focus-visible),
.s14-action-edit:focus:not(:focus-visible),
.s14-action-delete:focus:not(:focus-visible) { outline: none; }

.s14-action-ai:focus-visible,
.s14-action-edit:focus-visible,
.s14-action-delete:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

@media (prefers-reduced-motion: reduce) {
  .s14-progress-bar-fill,
  .s14-action-ai, .s14-action-edit, .s14-action-delete {
    transition-duration: 1ms !important;
  }
}
```

---

## デザイントークン（night-sky 抜粋）

```css
[data-theme="night-sky"] {
  --bg-primary: #0D1117;
  --bg-surface: #161B22;
  --border: #484F58;
  --border-strong: #6E7681;
  --text-primary: #E6EDF3;
  --text-secondary: #9BA7B4;
  --text-muted: #7A8593;
  --accent: #79C0FF;
  --accent-subtle: rgba(121, 192, 255, 0.14);
  --success: #3FB950;
  --success-subtle: rgba(63, 185, 80, 0.12);
  --danger-solid: #DA3633;
  --cat-learn: #A5D6FF;
  --cat-health: #E8A855;
}
```

---

## WCAG AA コントラスト実測値（night-sky）

| 項目 | 前景 | 背景 | 比率 | 判定 |
|---|---|---|---|---|
| S14-2 ゴールタイトル | `#E6EDF3` | `#0D1117` | **15.81:1** | AAA |
| S14-3 進捗 % 数字 | `--accent` `#79C0FF` | `#0D1117` | **9.49:1** | AAA |
| S14-5 残り日数 | `--text-secondary` `#9BA7B4` | `#0D1117` | **7.51:1** | AA 合格 |
| S14-5 カレンダー SVG | `--text-muted` `#7A8593` | `#0D1117` | **5.06:1** | AA 合格 |
| S14-6 カテゴリタグ 文字 | `--accent` | `--accent-subtle ≈ #1F2F3D` | **8.29:1** | AAA |
| S14-6 カテゴリタグ border vs bg | `--accent` `#79C0FF` | `--bg-primary` `#0D1117` | **9.49:1** | WCAG 1.4.11 ✓ (LP-015 候補) |
| S14-7 TASK ラベル | `--text-muted` | `#0D1117` | **5.06:1** | AA 合格 |
| S14-8 タスク名 active | `#E6EDF3` | `#0D1117` | **15.81:1** | AAA |
| S14-8 タスク名 done/scheduled | `--text-secondary` | `#0D1117` | **7.51:1** | AA 合格 |
| S14-8 タスク日時 | `--text-muted` | `#0D1117` | **5.06:1** | AA 合格 |
| S14-9 + タスクを追加 | `--accent` | `#0D1117` | **9.49:1** | AAA |
| S14-10a AI 文字 | `--accent` | `--accent-subtle ≈ #1F2F3D` | **8.29:1** | AAA |
| S14-10a AI border vs bg | `--accent` | `#0D1117` | **9.49:1** | WCAG 1.4.11 ✓ |
| S14-10b 編集 文字 | `--text-secondary` | `#0D1117` | **7.51:1** | AA 合格 |
| S14-10c 削除 文字 | `#FFFFFF` | `--danger-solid` `#DA3633` | **4.59:1** | AA 合格 |

---

## 状態遷移表

```
GROW [Goal 行 click] → route('/goal/g-1') → S14 (Suspense → mount → main focus)
  → [← GROW] → route('/grow') → GROW
  → [+ タスクを追加] → console.log（M4 後続で S-12 統合）
  → [タスク行 click] → console.log（M4 後続で S-13 統合）
  → [AI 相談 / 編集 / 削除] → console.log（後続で実遷移先 + 削除確認ダイアログ）
```

---

## チェックリスト（フルスクリーン画面）

- ✅ route 追加: `/goal/:id` + lazy import + Suspense fallback
- ✅ LP-002: マウント時 main へ programmatic focus
- ✅ LP-014: focus-visible 分離（全 interactive 要素）
- ✅ LP-013: env(safe-area-inset-bottom) 段階的適用
- ✅ LP-012: 独立 chunk として bundle 分離（S14GoalDetail-*.js / -*.css）
- ✅ aria-labelledby={titleId} で main をタイトルに紐付け
- ✅ progressbar role + aria-valuenow/min/max
- ⚠️ E2E テスト追加: Playwright 未整備 → Phase 4 後続

---

## レビュアーへの依頼

1. **CRITICAL**: spec §4.7 違反 / WCAG 必須基準違反 / セキュリティ欠陥
2. **HIGH**: spec 細部からの逸脱 / UX 悪化 / 潜在バグ
3. **MEDIUM/LOW**: 改善提案

**特に確認してほしい点:**
- S14-1〜S14-10c 全要素が spec §4.7 と一致しているか
- S14-8 タスク行が spec 「S10-4 と完全一致」を満たしているか
- /goal/:id route + lazy import が正しく動作するか（initial bundle に S14 が含まれていないか → build 結果で S14GoalDetail-*.js 独立 chunk 確認済み）
- S14-3 大進捗 % が `--accent` で 48px 200 weight + 単位 20px / `aria-hidden` 適切か
- LP-015 候補（S14-6 + S14-10a の border 残し）が WCAG 1.4.11 を満たすか
- S14-1 戻るボタン aria-label「GROW に戻る」が NVDA/VoiceOver 上で問題ないか
- Mock goal の id が見つからない場合の default fallback の挙動

JSON 形式で指摘ください（severity / category / title / evidence / recommendation）。
