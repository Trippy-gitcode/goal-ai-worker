# Lais M4-C S-10 GROW レビューパッケージ R2

> R1 ゴールデンレビュー結果: CRITICAL 9 / HIGH 19 / MEDIUM 34 / LOW 34
> R2 は **スコープ外の CRITICAL 4 件（再提示）** + **分類 B 実装ミス CRITICAL 5 件の修正** を対象とする差分ラウンド
> R1 パッケージ: lais/verify/m4c_s10_grow_review_package.md（仕様引用・LP 適用・実装パッケージ全文はそちらを参照）
> レビュー種別: sub_review_flow.md D. 実装レビュー差分ラウンド

---

## ⚠️ 最重要: ミッション定義によるスコープ外リスト（PO 承認済み）

**本ミッション LAIS-PHASE4-M4C は以下の機能を明示的にスコープ外としています。** R1 で spec_compliance ペルソナから CRITICAL 指摘を受けた項目のうち、以下 4 件はミッション定義により **console.log 代替で完了扱い** とすることが PO により承認されています。レビュアー各位は severity inflation を避け、これらの指摘を R2 で CRITICAL として再提示しないでください。

### スコープ外 4 件（R1 CRITICAL の再提示 = 棄却要請）

| R1 ID | 指摘内容 | ミッション定義の該当箇所 | 本実装の対応 |
|---|---|---|---|
| **spec_compliance R-001** | Task 行タップ → S-13 詳細パネル未実装 | **session_progress.md 要件 9「タスク行タップ / Goal 行タップ: console.log（S-13/S-14 は未実装）」** | `handleOpenTask` が `console.log('[S10Grow] openTask:', id)` を呼び出す |
| **spec_compliance R-002** | Goal 行タップ → S-14 フルスクリーン遷移未実装 | **session_progress.md 要件 9「タスク行タップ / Goal 行タップ: console.log（S-13/S-14 は未実装）」** | `handleOpenGoal` が `console.log('[S10Grow] openGoal:', id)` を呼び出す |
| **spec_compliance R-004** | EXP バー `--duration-slow` 伸長アニメーション未実装 | **R1 パッケージ「スコープ外」節「EXP バー加算アニメーション（ローカル state のみ、加算ロジックは /api/me 接続後）」** | HERO_PROFILE は固定 mock（62%）。加算ロジックは /api/me 接続後の後続ミッション |
| **spec_compliance R-005** | Undo 30s スナックバー未実装 | **R1 パッケージ「スコープ外」節「Undo スナックバー 30s（Phase 4 B-1 予定）」 + session_progress.md の Phase A 積み残し `Phase B-1` との関連** | チェックタップ / Overdue 延期で console.log のみ |

**PO 判定（2026-04-15）:** 上記 4 件は本ミッションのスコープ外であり、R1 の CRITICAL 指摘は severity inflation と判定されました。R2 ではこれらを CRITICAL として再掲示しないでください。ただし **「スコープ外であること自体を明示的に確認できない」場合は HIGH 以下で記録して構いません**。

**R2 レビュアーへの具体的依頼:**
- R2 では上記 4 件を除いた「分類 B 5 件の修正」のみを CRITICAL 判定対象とする
- スコープ外 4 件については「スコープ外を確認」とコメントするか、severity を下げる（HIGH 以下）

---

## R1 CRITICAL 9 件の対応一覧

| # | 分類 | R1 ID | 対応 |
|---|---|---|---|
| 1 | **A スコープ外** | spec_compliance R-001 | 上記リスト参照 / 棄却要請 |
| 2 | **A スコープ外** | spec_compliance R-002 | 上記リスト参照 / 棄却要請 |
| 3 | **A スコープ外** | spec_compliance R-004 | 上記リスト参照 / 棄却要請 |
| 4 | **A スコープ外** | spec_compliance R-005 | 上記リスト参照 / 棄却要請 |
| 5 | **B 実装ミス** | spec_compliance R-003 | チェックタップ spring 実装 |
| 6 | **B 実装ミス** | a11y_engineer R-001 | BottomTabBar の ARIA 設計変更 |
| 7 | **B 実装ミス** | a11y_engineer R-002 | チェックのヒット領域を 44×44 に拡張 |
| 8 | **B 実装ミス** | a11y_engineer R-003 | role="checkbox" → role="button" + aria-pressed |
| 9 | **B 実装ミス** | a11y_engineer R-004 | OverdueRow で Check 流用を廃止 |

---

## 分類 B 5 件の修正詳細

### B-1: spec_compliance R-003 — チェックタップ spring アニメーション実装

**R1 指摘:** §4.4「チェックタップ: spring-default scale(0.9→1.1→1) + --duration-fast」が未実装。R1 では `transform` に対する transition 定義のみで、class 切替時の scale 変化が発火しなかった。

**修正:** S02 アバタータップと同じパターン（M4-B で確立）を採用:
1. JS 側: `setTappingId(id)` で 400ms の間 `s10-check-tap` class を付与 → タイマーで解除
2. CSS 側: `.s10-check-tap` に `animation: s10-check-spring var(--duration-fast) var(--spring-default) both`
3. `@keyframes s10-check-spring { 0% scale(0.9); 50% scale(1.1); 100% scale(1); }`
4. LP-001: `@media (prefers-reduced-motion: reduce) { .s10-check-tap { animation: none; } }` で縮退
5. JS 側でも unmount 時に `tapTimerRef` を clearTimeout（mountedRef ガード）

### B-2: a11y_engineer R-001 — BottomTabBar ARIA 設計変更

**R1 指摘:** `role="tablist"` + `role="tab"` は tabpanel を伴わない画面遷移ナビには不適切。WAI-ARIA 1.2 Authoring Practices では、画面遷移ナビゲーションは `<nav>` + `<a>` または `<button>` + `aria-current="page"` で表現する。キーボード操作（左右矢印、Home/End）も tablist パターンでは要求されるが未実装だった。

**修正（PO 判断 B-a 承認 / Batch 2 以降も同設計）:**
- `<ul role="tablist">` → `<ul>`（role 削除）
- `<button role="tab" aria-selected={isActive}>` → `<button aria-current={isActive ? 'page' : undefined}>`
- `role="none"` も削除（plain `<li>`）
- `<nav aria-label="メインナビゲーション">` は維持（landmark として正しい）

**Batch 2 以降の影響:** 本コンポーネントは S-20 TALK / S-30 ME でも共有利用される。これらの画面でも同じ `aria-current="page"` パターンで active 状態を通知する。

### B-3: a11y_engineer R-002 — チェックのタップ領域を 44×44 に拡張

**R1 指摘:** 視覚サイズ 22×22px で WCAG 2.5.5 Target Size (Enhanced) 44×44 + 2.5.8 Target Size (Minimum) 24×24 の両方未達。

**修正:** 視覚サイズ 22×22 は §4.4 固定値のため維持。`::before` で 44×44 の透明なヒット領域を拡張:
```css
.s10-check {
  position: relative;
  width: 22px;
  height: 22px;
  /* ... */
}

.s10-check::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 44px;
  height: 44px;
  transform: translate(-50%, -50%);
  /* ヒット領域のみ。視覚的には不可視 */
}
```

絶対位置での擬似要素なので本体レイアウトに影響しない。ポインタイベントは自動的に `::before` も含めて親ボタンにバブルする。

### B-4: a11y_engineer R-003 — role="checkbox" → role="button" + aria-pressed

**R1 指摘:** `role="checkbox"` は二値（true/false）または tri-state の mixed セマンティクスを想定するが、本実装の tri-state ローテ（scheduled → active → done → scheduled）は checkbox の意味付けと不一致。

**修正:**
- `role="checkbox"` を削除（button 要素の default role に戻す）
- `aria-checked={status === 'done'}` → `aria-pressed={status === 'done'}`
- `aria-label` は tri-state の次の遷移先を明示:
  - `scheduled`: 「予定。タップすると進行中にする」
  - `active`: 「進行中。タップすると完了にする」
  - `done`: 「完了済み。タップすると予定に戻す」

**補足:** `aria-pressed` は 3 値（true/false/mixed）を持つが、ここでは done のみ true として扱う。進行中状態は button の label で説明される。

### B-5: a11y_engineer R-004 — OverdueRow で Check 流用を廃止

**R1 指摘:** OverdueRow が Check コンポーネントを流用しているが、実動作は「明日に延期」であり aria-label の「タップすると完了にする」と不一致。WCAG 4.1.2 Name, Role, Value 違反。

**修正:**
- OverdueRow は Check コンポーネントを使わず、装飾のみの `<span class="s10-check s10-check-overdue" aria-hidden="true" />` に置き換え
- インタラクションは「明日に延期」ボタン 1 つに統一
- 延期ボタンに `aria-label={`${task.name} を明日に延期する`}` を追加し、具体的な action を明示

---

## 修正後のファイル全文

### lais/src/components/shared/BottomTabBar.jsx（変更箇所のみ）

```jsx
/*
 * ARIA 設計（M4-C R2-B1 で確定）:
 * 本コンポーネントは画面遷移ナビゲーションであり、tabpanel を持つタブウィジェットではない。
 * そのため role="tablist" / role="tab" / aria-selected は使わず、
 * <nav> + <button> + aria-current="page" で表現する（WAI-ARIA 1.2 Authoring Practices 準拠）。
 * Batch 2 以降の全画面で同じ設計を共有する。
 */
export function BottomTabBar({ active = 'grow', onSelect }) {
  const handleClick = (id) => {
    if (typeof onSelect === 'function') onSelect(id);
  };

  return (
    <nav class="bottom-tab-bar" aria-label="メインナビゲーション">
      <ul class="bottom-tab-bar-list">
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <li key={tab.id} class="bottom-tab-bar-item">
              <button
                type="button"
                aria-current={isActive ? 'page' : undefined}
                aria-label={tab.label}
                class={'bottom-tab-bar-btn ' + (isActive ? 'bottom-tab-bar-btn-active' : '')}
                onClick={() => handleClick(tab.id)}
              >
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
```

### lais/src/components/screens/S10Grow.jsx（変更箇所のみ）

```jsx
function Check({ status, onToggle, tapping }) {
  const ariaLabel =
    status === 'done' ? '完了済み。タップすると予定に戻す'
    : status === 'active' ? '進行中。タップすると完了にする'
    : '予定。タップすると進行中にする';
  return (
    <button
      type="button"
      class={`s10-check s10-check-${status}` + (tapping ? ' s10-check-tap' : '')}
      aria-pressed={status === 'done'}
      aria-label={ariaLabel}
      onClick={onToggle}
    >
      {status === 'done' && (
        <svg viewBox="0 0 11 11" width="11" height="11" aria-hidden="true">
          <path d="M 2 5.5 L 4.5 8 L 9 3" fill="none" stroke="currentColor"
            stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      )}
    </button>
  );
}

function TodayRow({ task, onToggle, onOpen, tappingId }) {
  return (
    <li class={`s10-task s10-task-${task.status}`}>
      <span class="s10-task-time">{task.time}</span>
      <Check status={task.status} onToggle={() => onToggle(task.id)} tapping={tappingId === task.id} />
      {/* ... カード以下は R1 から変更なし ... */}
    </li>
  );
}

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
        <button type="button" class="s10-task-defer"
          onClick={() => onDefer(task.id)}
          aria-label={`${task.name} を明日に延期する`}>
          明日に延期
        </button>
      </div>
    </li>
  );
}

// S10Grow 本体 — R2 追加の state / ref
export function S10Grow() {
  const mainRef = useRef(null);
  const tickingRef = useRef(false);
  const tapTimerRef = useRef(null);      // R2 追加
  const mountedRef = useRef(true);       // R2 追加
  const [heroCompressed, setHeroCompressed] = useState(false);
  const [tasks, setTasks] = useState(TODAY_MOCK);
  const [upcomingOpen, setUpcomingOpen] = useState(false);
  const [tappingId, setTappingId] = useState(null); // R2 追加: spring 発火対象

  // LP-002 + R2 cleanup
  useEffect(() => {
    mountedRef.current = true;
    if (mainRef.current) mainRef.current.focus({ preventScroll: true });
    return () => {
      mountedRef.current = false;
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    };
  }, []);

  // ... scroll useEffect / cycleStatus は R1 から変更なし ...

  const handleToggle = useCallback((id) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: cycleStatus(t.status), meta: /* R1 と同じ */ }
          : t
      )
    );
    // R2 spec-compliance R-003 fix: spring 発火
    setTappingId(id);
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setTappingId(null);
    }, 400);
  }, []);

  // ... 他の handler / render は R1 から unchanged（TodayRow に tappingId={tappingId} を渡すだけ変更）...
}
```

### lais/src/components/screens/S10Grow.css（変更・追加箇所のみ）

```css
/*
 * R2 a11y fix R-002 (WCAG 2.5.5 / 2.5.8 Target Size):
 * 視覚 22×22 は §4.4 固定値として維持、::before で 44×44 ヒット領域を拡張。
 * position: relative + ::before absolute で本体レイアウトに影響なし。
 */
.s10-check {
  flex-shrink: 0;
  position: relative;                       /* R2 追加 */
  width: 22px; /* §4.4 視覚サイズ */
  height: 22px;
  border-radius: 50%;
  background: transparent;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    background-color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out);
  /* transform transition は keyframes animation に置換（R2 B-1 fix）*/
}

.s10-check::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 44px;
  height: 44px;
  transform: translate(-50%, -50%);
}

.s10-check:focus:not(:focus-visible) { outline: none; }
.s10-check:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

.s10-check-done { background: var(--success-subtle); border: 2px solid var(--success); color: var(--success); }
.s10-check-active { border: 2px solid var(--accent); }
.s10-check-scheduled { border: 2px solid var(--border-strong); }

/* R2 追加: Overdue 行用の装飾チェック（インタラクションなし） */
.s10-check-overdue { border: 2px solid var(--danger); }

/*
 * R2 spec-compliance R-003 fix:
 * §4.4 チェックタップ: spring-default / scale(0.9 → 1.1 → 1) / --duration-fast
 */
.s10-check-tap {
  animation: s10-check-spring var(--duration-fast) var(--spring-default) both;
}

@keyframes s10-check-spring {
  0%   { transform: scale(0.9); }
  50%  { transform: scale(1.1); }
  100% { transform: scale(1); }
}

/* prefers-reduced-motion 縮退にアニメーションも追加（R2 B-1 fix） */
@media (prefers-reduced-motion: reduce) {
  .s10-hero, .s10-hero-avatar, .s10-hero-bar-fill,
  .s10-check, .s10-task-card, .s10-goal-bar-fill {
    transition: none;
  }
  .s10-check-tap { animation: none; }
}
```

**その他の CSS / JSX は R1 から変更なし。** `.s10-grow` の padding / `:focus-visible` 分離 / hero 圧縮 / Today ヘッダ / タスクカード色分け / Goals / + タスク / + ゴール / Upcoming 折りたたみはすべて R1 で既に実装されています。

---

## ビルド結果

```
vite v5.4.21
✓ 70 modules transformed.
dist/assets/S10Grow-CI6BppJI.css    9.67 kB │ gzip: 1.99 kB  ← +0.35 kB (R2 fixes)
dist/assets/S10Grow-CiZz-Fu8.js     9.42 kB │ gzip: 3.17 kB  ← +0.22 kB (mountedRef / tappingId)
✓ built in 436ms
```

パースエラーなし。

---

## R2 レビュー観点

### 主審（R1 で CRITICAL を出した 2 ペルソナ）

- **spec_compliance:** **まずスコープ外 4 件の棄却を確認**（上記リスト参照）。その後 R-003 チェックタップ spring が正しく発火するか検証
- **a11y_engineer:** 4 件の分類 B 修正が全て有効か:
  - R-001: `role="tablist"` → `aria-current="page"` への移行が完全か
  - R-002: ::before 44×44 がポインタイベントを正しく捕捉するか
  - R-003: `aria-pressed` の 3 値表現が SR で正しく読み上げられるか
  - R-004: Overdue の装飾 span が aria-hidden で SR から除外されるか

### 軽審（他 5 ペルソナ）

- R1 から変化なし。新規 CRITICAL が混入していないことのみ確認
- R2 の修正で副作用（例: ::before で本体 border 干渉 / aria-pressed の ARIA 違反）が発生していないか

### severity 基準

- **CRITICAL:** R1 分類 B 5 件が確実に修正されているか。新たな CRITICAL が混入していないか
- **スコープ外 4 件:** severity inflation 禁止。スコープ外として確認、もしくは HIGH 以下で記録
- **HIGH 以下:** R1 の未対応 HIGH/MEDIUM/LOW は Phase A 完了後まとめて対応予定。再指摘不要

severity inflation を避けること。
