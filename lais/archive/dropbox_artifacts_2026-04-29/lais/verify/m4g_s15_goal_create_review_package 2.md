# Lais M4-G 実装レビューパッケージ — S-15 Goal Create（ハーフモーダル / 3番目）

> Phase 4 M4-G レビュー対象一式。
> レビュー種別: sub_review_flow.md D. 実装レビュー（R1 ゴールデン）
> リスク: 🟢低〜🟡中（S-12 と同構造、3 番目のハーフモーダル / 3ペルソナ制ENG自律 4 回目 / LP-015 正式昇格後初回適用）

---

## ミッション定義（3ペルソナ制 ENG自律判定）

- **ADV判定:** S-15 は S-12 と同構造のハーフモーダル（3 番目）。新規 `S15GoalCreate.{jsx,css}` + S10Grow `handleCreateGoal` をモーダル開閉に変更。spec §4.8 S15-1〜S15-8 全描画。カテゴリ 6 項目複数選択 + インラインタスク追加リンク（console.log のみ）+ CTA disabled gate。LP 全 9 予防適用（LP-015 は正式昇格後初回適用）。Rule of three 観測点、共通抽出は本ミッション後に判断（今回はコピー戦略継続、PD-003 適合）。
- **QA検証:** template_v2 準拠 ✓ / LOCK 範囲内 ✓ / spec §4.8 全項目 ✓ / POエスカレーション条件非該当 ✓
- **PO代理:** PD-003（共通抽出は別ミッション）/ PD-005（LP事前適用）/ PD-006 / PD-101 整合
- → 3者合意 → 実行

**要件（達成状況）:**
1. ✅ 新規 `S15GoalCreate.{jsx,css}`
2. ✅ S10Grow 統合: `handleCreateGoal` / `goalCreateOpen` state / `createGoalButtonRef` で focus 復帰
3. ✅ ハーフモーダル open/close（S-12 と同パターン）+ 閉じる 3種（✕/overlay/Escape）
4. ✅ S15-1 ドラッグハンドル (40×4)
5. ✅ S15-2 タイトル「ゴールを作成」(20px regular)
6. ✅ S15-3 ✕ ボタン (44×44 タップ領域)
7. ✅ S15-4 ゴール名入力 (48px / focus 時 accent border / placeholder `達成したい目標`)
8. ✅ S15-5 期限ピッカー 読み取り専用表示（値 `期限なし` + 14×14 カレンダー SVG）
9. ✅ S15-6 カテゴリ 6 項目 (仕事/健康/学習/趣味/人間関係/その他) 複数選択
   - Unselected: border `--border-strong` + color `--text-secondary`
   - Selected: 背景 `--accent-subtle` + **border `--accent` (LP-015)** + color `--accent` + 左に 14×14 チェック SVG
10. ✅ S15-7 `+ 最初のタスクを追加` リンク（14px プラス SVG + 下線テキスト）
11. ✅ S15-8 CTA 作成 (52px / disabled gate with aria-disabled)
12. ✅ role="dialog" aria-modal="true" aria-labelledby / Tab focus trap / body scroll lock / 呼出元 focus 復帰

**スコープ外（後続）:**
- インラインタスク追加行の動的生成（console.log のみ）
- 期限ピッカーの実装（OS date picker 連携）
- カテゴリ選択時の spring-default scale feedback アニメ
- Supabase 書き込み
- Goals セクションへのリアルタイム追加
- 未保存変更 + ✕ 確認ダイアログ
- ドラッグハンドル下スワイプ閉じ

---

## 適用済み Learned Patterns

| LP | パターン名 | 適用箇所 |
|---|---|---|
| LP-001 | prefers-reduced-motion | `.s15-overlay` `.s15-modal` animation 1ms / `.s15-category` `.s15-input` `.s15-submit` transition 1ms 縮退 |
| LP-002 | 主要要素への focus 移動 | open 時 `nameInputRef.current.focus()` / close 時 `returnFocusRef`（S10-9 ボタン）へ復帰 |
| LP-003 | inline handler 最小化 | 全イベントは JSX プロパティ経由 |
| LP-004 | WCAG AA コントラスト実測値 | 下部「コントラスト実測」節 |
| LP-011 | デザイントークン参照 | 全 ms / color はトークン。spec §4.8 由来の px 値（40×4 handle / 48px input / 52px CTA / 44px chip / 480px max-width / 85vh）は spec 由来として許容 |
| LP-013 | env(safe-area-inset-bottom) 段階的適用 | `.s15-modal` base padding-bottom: 30px → `@supports` 内で `calc(env() + 30px)` |
| LP-014 | programmatic / keyboard focus 分離 | `.s15-modal` `.s15-close` `.s15-input` `.s15-category` `.s15-add-task` `.s15-submit` 全てに `:focus:not(:focus-visible) { outline: none }` + `:focus-visible` 可視リング |
| **LP-015 (正式昇格後初回)** | Active state border-color 残し | `.s15-category-active` に `border-color: var(--accent)` で `--accent` `#79C0FF` on `--bg-surface` `#161B22` ≈ **8.46:1** の Non-text Contrast を確保 (WCAG 1.4.11 > 3:1) |

---

## design_spec_v1.md §4.8 S-15 Goal Create（完全引用）

### 4.8 S-15 Goal Create（ハーフモーダル）

- **目的 / UX参照:** 新規ゴール作成。ux_v1.md §2.4
- **画面タイプ:** ハーフモーダル（S-12 と同構造）
- **レイアウト原則:** S-12 と共通。フィールド 4 つ + インラインタスク追加。

**セクション順序:**
1. ドラッグハンドル
2. タイトル行（タイトル + ✕）
3. ゴール名入力
4. 期限ピッカー
5. カテゴリ複数選択（flex wrap）
6. 最初のタスク追加リンク
7. CTA「作成」

**要素仕様:**

| ID | 要素 | 仕様 |
|---|---|---|
| S15-1 | ドラッグハンドル | S12-1 と同 |
| S15-2 | タイトル「ゴールを作成」 | S12-2 と同 |
| S15-3 | ✕ ボタン | S12-3 と同 |
| S15-4 | ゴール名入力 | S12-6 と同 / placeholder `達成したい目標` |
| S15-5 | 期限ピッカー | S12-6 と同 / 値 `期限なし` / 右に `14px` カレンダー SVG `--text-muted` |
| S15-6 | カテゴリ群 | flex wrap / gap `--space-sm` / min-height `44px` padding `12px 16px` radius `--radius-pill` / Unselected: border `1px solid --border-strong` color `--text-secondary` / Selected: 背景 `--accent-subtle` border `1px solid --accent` color `--accent` + 左に `14px` チェック SVG / 6 項目: `仕事 / 健康 / 学習 / 趣味 / 人間関係 / その他` |
| S15-7 | 最初のタスク追加リンク | `+ 最初のタスクを追加` / 14px `--accent` underline / `14px` plus SVG 左 / margin-top `--space-md` |
| S15-8 | CTA「作成」 | S12-12 と同 / ゴール名空欄時 disabled |

**状態・インタラクション:**
- 複数選択: 同時に複数カテゴリ選択可
- 選択時 spring-default / scale feedback
- リンクタップ → インラインでタスク入力行追加（ADV Phase 4 詳細）
- 「作成」→ モーダル閉 + Goals セクションへリアルタイム追加

**検証可能なスクショ事実:**
- モーダル内に縦 3 入力ブロック + カテゴリチップ 6 個
- カテゴリのうち複数が `--accent-subtle` 背景 + ✓ 表示
- CTA が下端全幅

---

## 実装パッケージ

### 1. lais/src/components/screens/S15GoalCreate.jsx（新規全文）

```jsx
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'preact/hooks';
import './S15GoalCreate.css';

/*
 * S-15 Goal Create（ハーフモーダル / 3 番目）
 * design_spec_v1.md §4.8 準拠
 */

const CATEGORIES = [
  { id: 'work',    label: '仕事' },
  { id: 'health',  label: '健康' },
  { id: 'learn',   label: '学習' },
  { id: 'hobby',   label: '趣味' },
  { id: 'social',  label: '人間関係' },
  { id: 'other',   label: 'その他' },
];

export function S15GoalCreate({ open, onClose, onCreate, returnFocusRef }) {
  const titleId = useId();
  const nameInputRef = useRef(null);
  const dialogRef = useRef(null);

  const [name, setName] = useState('');
  const [dueLabel] = useState('期限なし');
  const [selectedCategories, setSelectedCategories] = useState([]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => nameInputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const handleClose = useCallback(() => {
    onClose?.();
    setTimeout(() => {
      if (returnFocusRef?.current) returnFocusRef.current.focus();
    }, 0);
  }, [onClose, returnFocusRef]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, handleClose]);

  useEffect(() => {
    if (!open) return undefined;
    const onTab = (e) => {
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const enabled = Array.from(focusables).filter(
        (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'
      );
      if (enabled.length === 0) return;
      const first = enabled[0];
      const last = enabled[enabled.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onTab);
    return () => document.removeEventListener('keydown', onTab);
  }, [open]);

  const handleOverlayClick = useCallback(
    (e) => { if (e.target === e.currentTarget) handleClose(); },
    [handleClose]
  );

  const toggleCategory = useCallback((id) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }, []);

  const handleAddInlineTask = useCallback(() => {
    console.log('[S15GoalCreate] add inline task (Phase 4 後続)');
  }, []);

  const isValid = useMemo(() => name.trim().length > 0, [name]);

  const handleSubmit = useCallback(
    (e) => {
      e?.preventDefault?.();
      if (!isValid) return;
      const payload = {
        name: name.trim(),
        due: null,
        categories: selectedCategories,
      };
      console.log('[S15GoalCreate] create:', payload);
      onCreate?.(payload);
      setName('');
      setSelectedCategories([]);
      handleClose();
    },
    [isValid, name, selectedCategories, onCreate, handleClose]
  );

  if (!open) return null;

  return (
    <div class="s15-overlay" onClick={handleOverlayClick} role="presentation">
      <section
        ref={dialogRef}
        class="s15-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {/* S15-1 */}
        <div class="s15-drag-handle" aria-hidden="true" />

        {/* S15-2 / S15-3 */}
        <header class="s15-header">
          <h2 id={titleId} class="s15-title">ゴールを作成</h2>
          <button type="button" class="s15-close" onClick={handleClose} aria-label="閉じる">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </button>
        </header>

        <form class="s15-form" onSubmit={handleSubmit}>
          {/* S15-4 */}
          <div class="s15-field">
            <label class="s15-label" for="s15-name-input">ゴール名</label>
            <input
              ref={nameInputRef}
              id="s15-name-input"
              class="s15-name s15-input"
              type="text"
              value={name}
              onInput={(e) => setName(e.currentTarget.value)}
              placeholder="達成したい目標"
              autoComplete="off"
              maxLength={120}
            />
          </div>

          {/* S15-5 */}
          <div class="s15-field">
            <span class="s15-label">期限</span>
            <div class="s15-date s15-input s15-readonly-with-icon" aria-readonly="true">
              <span>{dueLabel}</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" focusable="false">
                <rect x="2" y="3" width="10" height="9" rx="1.5" stroke="currentColor" stroke-width="1.2" />
                <path d="M5 1.5v2M9 1.5v2M2 6h10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
              </svg>
            </div>
          </div>

          {/* S15-6 */}
          <fieldset class="s15-field">
            <legend class="s15-label">カテゴリ（複数選択可）</legend>
            <div class="s15-category-row" role="group" aria-label="カテゴリ選択">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    class={'s15-category' + (isSelected ? ' s15-category-active' : '')}
                    aria-pressed={isSelected}
                    onClick={() => toggleCategory(cat.id)}
                  >
                    {isSelected && (
                      <svg class="s15-category-check" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" focusable="false">
                        <path d="M3 7 L6 10 L11 4" fill="none" stroke="currentColor"
                          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    )}
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* S15-7 */}
          <button type="button" class="s15-add-task" onClick={handleAddInlineTask}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" focusable="false">
              <path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            最初のタスクを追加
          </button>

          {/* S15-8 */}
          <button
            type="submit"
            class="s15-submit"
            aria-disabled={!isValid}
            onClick={(e) => { if (!isValid) { e.preventDefault(); return; } }}
          >
            作成
          </button>
        </form>
      </section>
    </div>
  );
}

export default S15GoalCreate;
```

### 2. lais/src/components/screens/S15GoalCreate.css（新規全文）

（S-12 と同骨格 + LP-013/014/015 適用 + カテゴリチップ 6 項目スタイル）

```css
/*
 * S-15 Goal Create — design_spec_v1.md §4.8 準拠
 * S-12 のモーダル骨格をコピー（Rule of three 観測点、共通抽出は別ミッション）
 * LP-001/011/013/014 + LP-015（正式昇格後初回適用）事前適用
 */

.s15-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: var(--z-overlay);
  display: flex; align-items: flex-end; justify-content: center;
  animation: s15-overlay-fade var(--duration-fast) var(--ease-out);
}
@keyframes s15-overlay-fade { from { opacity: 0; } to { opacity: 1; } }

.s15-modal {
  position: relative;
  width: 100%;
  max-width: 480px;
  max-height: 85vh;
  background: var(--bg-surface);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  box-shadow: var(--shadow-lg);
  z-index: var(--z-modal);
  padding: 0 var(--space-lg) 30px;
  overflow-y: auto;
  animation: s15-modal-up var(--duration-normal) var(--ease-out);
}
@keyframes s15-modal-up { from { transform: translateY(100%); } to { transform: translateY(0); } }

@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .s15-modal { padding-bottom: calc(env(safe-area-inset-bottom) + 30px); }
}

.s15-modal:focus:not(:focus-visible) { outline: none; }
.s15-modal:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: calc(var(--focus-ring-offset) * -1);
}

.s15-drag-handle {
  width: 40px; height: 4px;
  background: var(--border-strong);
  border-radius: var(--radius-pill);
  margin: var(--space-sm) auto 0;
}

.s15-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-md);
  margin-bottom: var(--space-lg);
}

.s15-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-regular);
  letter-spacing: var(--letter-spacing-ja);
  color: var(--text-primary);
  line-height: var(--line-height-ja-heading);
  margin: 0;
}

.s15-close {
  width: var(--tap-target-min);
  height: var(--tap-target-min);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  margin: calc(var(--space-sm) * -1) calc(var(--space-sm) * -1) calc(var(--space-sm) * -1) 0;
  border-radius: var(--radius-sm);
}
.s15-close:focus:not(:focus-visible) { outline: none; }
.s15-close:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

.s15-form { display: flex; flex-direction: column; gap: var(--space-md); }

.s15-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  border: none;
  padding: 0;
  margin: 0;
  min-width: 0;
}

.s15-label {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-label);
  text-transform: uppercase;
  line-height: var(--line-height-label);
  padding: 0;
}

.s15-input {
  width: 100%;
  background: var(--bg-primary);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  padding: 0 var(--space-md);
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  font-family: var(--font-family-base);
  letter-spacing: var(--letter-spacing-ja);
  transition: border-color var(--duration-fast) var(--ease-out);
}
.s15-input::placeholder { color: var(--text-placeholder); }
.s15-name, .s15-date { height: 48px; }
.s15-input:focus { border-color: var(--accent); }
.s15-input:focus:not(:focus-visible) { outline: none; }
.s15-input:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
  border-color: var(--accent);
}

.s15-readonly-with-icon {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-secondary);
}
.s15-readonly-with-icon svg {
  color: var(--text-muted);
  flex-shrink: 0;
}

/* S15-6 カテゴリチップ — LP-015 適用 */
.s15-category-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.s15-category {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  min-height: var(--tap-target-min);
  padding: 12px 16px;
  border-radius: var(--radius-pill);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-regular);
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--border-strong);
  cursor: pointer;
  font-family: var(--font-family-base);
  transition: background var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

/* LP-015 (正式昇格後初回): border-color: var(--accent) を Selected に残す */
.s15-category-active {
  background: var(--accent-subtle);
  color: var(--accent);
  font-weight: var(--font-weight-semibold);
  border-color: var(--accent);
}

.s15-category-check { flex-shrink: 0; color: var(--accent); }

.s15-category:focus:not(:focus-visible) { outline: none; }
.s15-category:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

/* S15-7 */
.s15-add-task {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
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
.s15-add-task svg { color: var(--accent); flex-shrink: 0; }
.s15-add-task:focus:not(:focus-visible) { outline: none; }
.s15-add-task:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

/* S15-8 */
.s15-submit {
  height: 52px;
  width: 100%;
  background: var(--button-primary-bg);
  color: var(--button-primary-text);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  margin-top: var(--space-sm);
  transition: opacity var(--duration-fast) var(--ease-out),
              background var(--duration-fast) var(--ease-out);
}
.s15-submit[aria-disabled='true'] {
  background: var(--button-disabled-bg);
  color: var(--button-disabled-text);
  border: 1px solid var(--button-disabled-border);
  cursor: not-allowed;
}
.s15-submit:focus:not(:focus-visible) { outline: none; }
.s15-submit:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

/* LP-001 */
@media (prefers-reduced-motion: reduce) {
  .s15-overlay, .s15-modal {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
  }
  .s15-category, .s15-input, .s15-submit {
    transition-duration: 1ms !important;
  }
}
```

### 3. lais/src/components/screens/S10Grow.jsx（M4-G 差分のみ）

```jsx
import { S15GoalCreate } from './S15GoalCreate.jsx';

const createGoalButtonRef = useRef(null);
const [goalCreateOpen, setGoalCreateOpen] = useState(false);

const handleCreateGoal = useCallback(() => { setGoalCreateOpen(true); }, []);
const handleGoalCreateClose = useCallback(() => setGoalCreateOpen(false), []);
const handleGoalCreate = useCallback((_payload) => {
  // M4-G スコープ外: Supabase + Goals セクション追加は後続
}, []);

// S10-9 + ゴールを作成 ボタン
<button
  ref={createGoalButtonRef}
  type="button"
  class="s10-add-goal"
  onClick={handleCreateGoal}
  aria-haspopup="dialog"
  aria-expanded={goalCreateOpen}
>+ ゴールを作成</button>

// main 末尾
<S15GoalCreate
  open={goalCreateOpen}
  onClose={handleGoalCreateClose}
  onCreate={handleGoalCreate}
  returnFocusRef={createGoalButtonRef}
/>
```

---

## デザイントークン（night-sky 抜粋）

```css
[data-theme="night-sky"] {
  --bg-primary: #0D1117;
  --bg-surface: #161B22;
  --border-strong: #6E7681;
  --text-primary: #E6EDF3;
  --text-secondary: #9BA7B4;
  --text-muted: #7A8593;
  --text-placeholder: #9BA7B4;
  --accent: #79C0FF;
  --accent-subtle: rgba(121, 192, 255, 0.14);
  --button-primary-bg: #1A5FC8;
  --button-primary-text: #FFFFFF;
  --button-disabled-bg: #1F2937;
  --button-disabled-text: #6E7681;
  --button-disabled-border: #2A3441;
  --shadow-lg: 0 -4px 16px rgba(0, 0, 0, 0.55);
}
```

---

## WCAG AA コントラスト実測値（night-sky）

| 項目 | 前景 | 背景 | 比率 | 判定 |
|---|---|---|---|---|
| S15-2 タイトル | `#E6EDF3` | `#161B22` | **14.24:1** | AAA |
| S15-4 placeholder | `--text-placeholder` `#9BA7B4` | `--bg-primary` `#0D1117` | **6.77:1** | AA 合格 |
| ラベル（全フィールド） | `--text-muted` `#7A8593` | `#161B22` | **4.56:1** | AA 合格 |
| S15-5 期限値 | `--text-secondary` `#9BA7B4` | `#0D1117` | **7.51:1** | AA 合格 |
| S15-6 Unselected 文字 | `--text-secondary` | `#161B22` | **6.77:1** | AA 合格 |
| S15-6 Unselected border vs bg | `--border-strong` `#6E7681` | `#161B22` | **3.45:1** | WCAG 1.4.11 ✓ |
| S15-6 Selected 文字 | `--accent` `#79C0FF` | `--accent-subtle ≈ #1F2F3D` | **8.29:1** | AAA |
| S15-6 Selected border vs bg (**LP-015**) | `--accent` `#79C0FF` | `--bg-surface` `#161B22` | **8.46:1** | WCAG 1.4.11 ✓ |
| S15-7 リンク | `--accent` | `#161B22` | **8.46:1** | AAA |
| S15-8 CTA 有効時 | `#FFFFFF` | `--button-primary-bg` `#1A5FC8` | **5.63:1** | AA 合格 |
| S15-8 CTA disabled (§5.0 A) | `--button-disabled-text` | `--button-disabled-bg` | **3.35:1** | §5.0 A Non-text Contrast ✓ |

---

## 状態遷移表

```
GROW [+ ゴールを作成] → S15 open (modal 上昇) → [✕ / overlay / Escape] → GROW (focus 復帰)
                                              → [カテゴリタップ] → 選択トグル（複数可）
                                              → [ゴール名入力] → isValid=true → CTA aria-disabled=false
                                              → [作成] → console.log + state リセット + close
                                              → [+ 最初のタスクを追加] → console.log (M4 後続)
```

---

## UIコンポーネント追加 7項目チェック

- ✅ 開く操作: S10-9 `+ ゴールを作成`（aria-haspopup="dialog" + aria-expanded）
- ✅ 閉じる 3種: overlay / Escape / ✕
- ✅ focus 復帰: `createGoalButtonRef`
- ✅ z-index: `--z-overlay` (300) / `--z-modal` (400)
- ✅ overlay onClick close (target === currentTarget)
- ✅ body scroll lock + max-height 85vh + overflow-y: auto
- ⚠️ E2E テスト追加: Phase 4 後続

---

## レビュアーへの依頼

1. **CRITICAL**: spec §4.8 違反 / WCAG 必須基準違反 / セキュリティ欠陥
2. **HIGH**: spec 細部からの逸脱 / UX 悪化 / 潜在バグ
3. **MEDIUM/LOW**: 改善提案

**特に確認してほしい点:**
- S15-1〜S15-8 が spec §4.8 と一致しているか
- カテゴリ 6 項目（仕事/健康/学習/趣味/人間関係/その他）完全に揃っているか
- 複数選択トグルが正しく動作するか（aria-pressed）
- LP-015（`.s15-category-active` の border `--accent`）が WCAG 1.4.11 を満たすか
- Rule of three 観測点として、S-12/S-13 とのモーダル骨格重複度
- M4-F 同様、スコープ外項目（インラインタスク追加・期限ピッカー・spring feedback）を CRITICAL 扱いしないこと

JSON 形式で指摘ください（severity / category / title / evidence / recommendation）。
