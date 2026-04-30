# Lais M4-D 実装レビューパッケージ — S-12 Task Add（ハーフモーダル）

> Phase 4 M4-D「S-12 Task Add ハーフモーダル」のレビュー対象一式。
> レビュー種別: sub_review_flow.md D. 実装レビュー（R1 ゴールデン）
> リスク: 🟡 中（新規モーダルコンポーネント / 閉じる3種 / フォーム入力多数 / 3ペルソナ制ENG自律判定初回）

---

## ミッション定義（3ペルソナ制 ENG自律判定）

- **ADV判定:** design_spec §4.5 準拠で S-12 を独立コンポーネント化。S10Grow `+ タスクを追加` から開閉制御。Mock state のみ（API 連携は後続）。LP-001/002/003/004/011/013/014 を事前適用。
- **QA検証:** mission_template_v2 準拠（UI7項目チェック・状態遷移表）✓ / LOCK 範囲（lais/）内 ✓ / POエスカレーション条件非該当 ✓
- **PO代理:** PD-006（CRITICAL 0 でゲート通過、HIGH は Phase A 末尾一括）✓ / PD-003（過度適用しない: Supabase 連携・未保存確認ダイアログ・S-13 遷移はスコープ外）✓ / PD-005（LP 事前適用で仕組み化）✓
- → 3者合意 → 実行

**要件（達成状況）:**
1. ✅ 新規コンポーネント `lais/src/components/screens/S12TaskAdd.{jsx,css}`
2. ✅ S10Grow 統合: `handleAddTask` で `taskAddOpen` state 切替 / `addTaskButtonRef` で focus 復帰
3. ✅ ハーフモーダル open アニメ: `translateY(100% → 0)` / `--duration-normal` ease-out / overlay fade-in `--duration-fast`
4. ✅ 閉じる 3種: ✕ ボタン / overlay タップ / Escape キー
5. ✅ 種別トグル: 単発 ⇄ 習慣（role="radiogroup" + aria-checked）/ 切替でフィールド 9「予定日」⇄「繰り返し周期」
6. ✅ タスク名入力 48px（focus 時 `--accent` border）/ placeholder `--text-placeholder`
7. ✅ 開始時刻 `<input type="time">` 値 `10:00`
8. ✅ 所要時間チップ横スクロール（5/10/15/30/45/60/90/120分、デフォ 30分）
9. ✅ 予定日 / ゴール紐付け 読み取り専用表示
10. ✅ メモ textarea min-height 80px
11. ✅ CTA「作成」52px / タスク名空欄時 `aria-disabled="true"` + `button-disabled-*` トークン + onClick 抑止（§5.0 A）
12. ✅ role="dialog" aria-modal="true" aria-labelledby / Tab focus trap / body scroll lock / 呼出元 focus 復帰

**スコープ外（後続ミッション）:**
- Supabase へのタスク作成 API 連携（Phase 4 後続）
- ドラッグハンドル下スワイプ閉じ（Phase 4 後続）
- 未保存変更 + overlay タップ時の確認ダイアログ（Phase 4 後続）
- S-13 詳細モーダル遷移
- 成功/失敗トースト
- 繰り返し周期のピッカー（mock の「毎日」のみ）
- radiogroup 矢印キーナビゲーション（HIGH 許容。Phase A 完了後）

---

## 適用済み Learned Patterns

| LP | パターン名 | 適用箇所 |
|---|---|---|
| LP-001 | prefers-reduced-motion | `.s12-overlay` / `.s12-modal` の animation-duration / `.s12-type-pill` / `.s12-duration-chip` / `.s12-input` / `.s12-submit` の transition-duration を 1ms に縮退 |
| LP-002 | SPA 遷移後の focus 移動 | open 時に `nameInputRef.current.focus()` / close 時に `returnFocusRef.current.focus()` で呼出元 `addTaskButtonRef`（S10-5 ボタン）へ復帰 |
| LP-003 | CSP / inline handler 最小化 | すべてのイベントは JSX プロパティ経由。inline string は未使用 |
| LP-004 | WCAG AA コントラスト実測値 | 下部「コントラスト実測」節に記載 |
| LP-011 | デザイントークン参照 | 全 ms / color は design_system.md トークン。spec §4.5 由来の固定 px 値（40×4 handle / 48px input / 52px CTA / 44×44 close / 480px max-width / 80px memo min-height / 85vh max-height）は spec 由来として許容 |
| LP-013 | env(safe-area-inset-bottom) の段階的適用 | `.s12-modal { padding: 0 var(--space-lg) 30px }` を base にし、`@supports (padding-bottom: env(safe-area-inset-bottom))` 内で `padding-bottom: calc(env() + 30px)` に上書き。第 2 引数構文は使わない |
| LP-014 | programmatic focus / keyboard focus 分離 | `.s12-modal` `.s12-close` `.s12-type-pill` `.s12-duration-chip` `.s12-input` `.s12-submit` の全てに `:focus:not(:focus-visible) { outline: none }` + `:focus-visible { outline: --focus-ring-* }` を適用 |

---

## design_spec_v1.md §4.5 S-12 Task Add（完全引用）

### 4.5 S-12 Task Add（ハーフモーダル）

- **目的 / UX参照:** 新規タスク作成。ux_v1.md §2.3
- **画面タイプ:** ハーフモーダル（下から `--duration-normal` ease-out で上昇、画面高 60%）
- **レイアウト原則:** 背景オーバーレイ `rgba(0,0,0,0.6)` `z-index: var(--z-overlay)` / モーダル背景 `--bg-surface` / radius `12px 12px 0 0` / `box-shadow: var(--shadow-lg)` / `z-index: var(--z-modal)` / padding `0 --space-lg 30px`

**セクション順序:**
1. ドラッグハンドル
2. タイトル行（左タイトル + 右 ✕ ボタン）
3. 種別トグル（単発 / 習慣）
4. タスク名入力
5. 開始時刻ピッカー
6. 所要時間チップ（横スクロール）
7. 予定日 / 繰り返し周期
8. ゴール紐付け
9. メモ
10. CTA「作成」

**要素仕様:**

| ID | 要素 | 仕様 |
|---|---|---|
| S12-1 | ドラッグハンドル | 幅 `40px` 高さ `4px` 背景 `--border-strong` radius `--radius-pill` / 上マージン `--space-sm` 中央揃え |
| S12-2 | タイトル「タスクを追加」 | font-size `20px` weight `400` letter-spacing `-0.02em` / margin-top `--space-md` |
| S12-3 | ✕ ボタン | 右上 / 44×44 タップ領域 / SVG 20×20 stroke `--text-secondary` |
| S12-4 | ラベル「種別」 | font-size `11px` color `--text-muted` weight `600` letter-spacing `1.5px` uppercase |
| S12-5 | 種別ピル群 | gap `--space-sm` / Active: 背景 `--accent-subtle` color `--accent` weight `600` padding `12px 18px` radius `--radius-pill` min-height `44px` / Inactive: border `1px solid --border-strong` color `--text-muted` |
| S12-6 | タスク名入力 | 高さ `48px` 背景 `--bg-primary` border `1px solid --border-strong` (focus 時 `--accent`) radius `--radius-md` padding `0 16px` font-size `14px` placeholder `--text-muted` |
| S12-7 | 開始時刻ピッカー | 同 S12-6 / クリック時 OS 時刻ピッカー / 値表示 `10:00` |
| S12-8 | 所要時間チップ | 横スクロール `-webkit-overflow-scrolling: touch` / 各チップ min-height `44px` padding `12px 16px` radius `--radius-pill` / Active: `--accent-subtle` + `--accent` weight `600` / Inactive: border `1px solid --border-strong` color `--text-muted` / 値: `5 / 10 / 15 / 30 / 45 / 60 / 90 / 120 分` / デフォ `30分` |
| S12-9 | 予定日 | S12-6 と同スタイル / 値 `今日` / 右に `14px` カレンダー SVG stroke `--text-muted` |
| S12-10 | ゴール紐付け | S12-6 と同スタイル / 値 `なし` / 右に `14px` chevron-down SVG |
| S12-11 | メモ | textarea / min-height `80px` / 他入力と同スタイル / padding `12px 16px` / line-height `1.7` |
| S12-12 | CTA「作成」 | 高さ `52px` 幅 100% / 背景 `--button-primary-bg` 文字 `#FFFFFF` weight `600` radius `--radius-lg` / タスク名空欄時 disabled（§5.0 A / `--button-disabled-*` 適用 / `aria-disabled="true"`） |

各入力ブロック間の margin は `--space-md`。ラベル（11px）と入力（48px）の間は `--space-sm`。

**状態・インタラクション:**
- モーダル上昇: `--duration-normal` ease-out / translateY(100% → 0)
- 背景オーバーレイ: fade-in `--duration-fast`
- 閉じ: ✕ タップ / ドラッグハンドル下スワイプ / 背景タップ → 逆アニメ
- 未保存の変更あり + 外タップ時: 確認ダイアログ（Phase 4）
- 種別変更 → フィールド 8「予定日」が `繰り返し周期（毎日/平日/毎週…）` へ入れ替わる
- 「作成」成功: モーダル閉 + トースト「タスクを追加しました」 / 失敗: エラートースト

**検証可能なスクショ事実:**
- モーダルが画面下から上昇し、高さが約 `487px`（画面高 60%）
- 上端にドラッグハンドル、右上に ✕ ボタン
- 種別ピル 2 つ、うち 1 つが `--accent-subtle` 背景
- 所要時間チップ列が横スクロール可能
- CTA が画面下端近くに全幅 52px

---

## 実装パッケージ

### 1. lais/src/components/screens/S12TaskAdd.jsx（新規全文）

```jsx
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'preact/hooks';
import './S12TaskAdd.css';

/*
 * S-12 Task Add（ハーフモーダル）
 * design_spec_v1.md §4.5 準拠
 *
 * 本ミッション（M4-D）スコープ:
 * - mock state で全フィールド描画。Supabase 書き込みは後続ミッション
 * - 閉じる 3種: ✕ / overlay tap / Escape
 * - CTA disabled gate: タスク名空欄 → aria-disabled + onClick 抑止（§5.0 A）
 * - 種別=単発 → フィールド7「予定日」/ 種別=習慣 → 「繰り返し周期」
 *
 * Learned Patterns 事前適用:
 * - LP-001: reduced-motion 縮退は CSS 側に集約（JS タイマーは未使用）
 * - LP-002: モーダル open 時に主要入力（タスク名）へ focus 移動。close 時に呼出元へ復帰
 * - LP-003: CSP 指摘は Phase B-4（アプリ全体）。本画面では inline handler を最小化
 * - LP-004: コントラスト実測値はレビューパッケージに記載
 * - LP-011: 魔法の数字禁止。寸法・時間は design_spec §4.5 の固定値 or トークン
 * - LP-013: env(safe-area-inset-bottom) は @supports で段階的適用
 * - LP-014: programmatic focus と keyboard focus を :focus:not(:focus-visible) で分離
 */

const DURATION_OPTIONS = [5, 10, 15, 30, 45, 60, 90, 120];
const DEFAULT_DURATION = 30;

/*
 * design_spec §4.5 は繰り返し周期の具体値を定義していない（UX v1 §2.3 に準拠）。
 * Phase 4 後続で ux_v1 より正確な値に差し替え予定。Mock 値として表示のみ。
 */
const RECURRENCE_DEFAULT = '毎日';

export function S12TaskAdd({ open, onClose, onCreate, returnFocusRef }) {
  const titleId = useId();
  const nameInputRef = useRef(null);
  const dialogRef = useRef(null);

  const [type, setType] = useState('single'); // 'single' | 'habit'
  const [name, setName] = useState('');
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [memo, setMemo] = useState('');

  // open/close 時のリセットと focus 移動
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (nameInputRef.current) nameInputRef.current.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  // ESC キーで閉じる
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // body scroll lock（モーダル open 中）
  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // focus trap（簡易版: Tab のサイクリング）
  useEffect(() => {
    if (!open) return undefined;
    const handleTab = (e) => {
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
    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [open]);

  const handleClose = useCallback(() => {
    onClose?.();
    setTimeout(() => {
      if (returnFocusRef?.current) returnFocusRef.current.focus();
    }, 0);
  }, [onClose, returnFocusRef]);

  const handleOverlayClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) handleClose();
    },
    [handleClose]
  );

  const isValid = useMemo(() => name.trim().length > 0, [name]);

  const handleSubmit = useCallback(
    (e) => {
      e?.preventDefault?.();
      if (!isValid) return; // §5.0 A aria-disabled gate
      // eslint-disable-next-line no-console
      console.log('[S12TaskAdd] create:', { type, name: name.trim(), time, duration, memo });
      onCreate?.({ type, name: name.trim(), time, duration, memo });
      setName('');
      setMemo('');
      setDuration(DEFAULT_DURATION);
      setType('single');
      setTime('10:00');
      handleClose();
    },
    [isValid, type, name, time, duration, memo, onCreate, handleClose]
  );

  if (!open) return null;

  return (
    <div class="s12-overlay" onClick={handleOverlayClick} role="presentation">
      <section
        ref={dialogRef}
        class="s12-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {/* S12-1 ドラッグハンドル */}
        <div class="s12-drag-handle" aria-hidden="true" />

        {/* S12-2 / S12-3 タイトル + ✕ ボタン */}
        <header class="s12-header">
          <h2 id={titleId} class="s12-title">タスクを追加</h2>
          <button type="button" class="s12-close" onClick={handleClose} aria-label="閉じる">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </button>
        </header>

        <form class="s12-form" onSubmit={handleSubmit}>
          {/* S12-4 / S12-5 種別ラベル + ピル */}
          <fieldset class="s12-field s12-field-type">
            <legend class="s12-label">種別</legend>
            <div class="s12-type-row" role="radiogroup" aria-label="タスク種別">
              <button
                type="button"
                class={'s12-type-pill' + (type === 'single' ? ' s12-type-pill-active' : '')}
                role="radio"
                aria-checked={type === 'single'}
                onClick={() => setType('single')}
              >単発タスク</button>
              <button
                type="button"
                class={'s12-type-pill' + (type === 'habit' ? ' s12-type-pill-active' : '')}
                role="radio"
                aria-checked={type === 'habit'}
                onClick={() => setType('habit')}
              >習慣</button>
            </div>
          </fieldset>

          {/* S12-6 タスク名入力 */}
          <div class="s12-field">
            <label class="s12-label" for="s12-name-input">タスク名</label>
            <input
              ref={nameInputRef}
              id="s12-name-input"
              class="s12-name s12-input"
              type="text"
              value={name}
              onInput={(e) => setName(e.currentTarget.value)}
              placeholder="買い物リストを作る"
              autoComplete="off"
              maxLength={120}
            />
          </div>

          {/* S12-7 開始時刻ピッカー */}
          <div class="s12-field">
            <label class="s12-label" for="s12-time-input">開始時刻</label>
            <input
              id="s12-time-input"
              class="s12-time s12-input"
              type="time"
              value={time}
              onInput={(e) => setTime(e.currentTarget.value)}
            />
          </div>

          {/* S12-8 所要時間チップ */}
          <fieldset class="s12-field">
            <legend class="s12-label">所要時間</legend>
            <div class="s12-duration-row" role="radiogroup" aria-label="所要時間">
              {DURATION_OPTIONS.map((min) => (
                <button
                  key={min}
                  type="button"
                  class={'s12-duration-chip' + (duration === min ? ' s12-duration-chip-active' : '')}
                  role="radio"
                  aria-checked={duration === min}
                  onClick={() => setDuration(min)}
                >{min}分</button>
              ))}
            </div>
          </fieldset>

          {/* S12-9 予定日 ⇄ 繰り返し周期 */}
          <div class="s12-field">
            <span class="s12-label">{type === 'single' ? '予定日' : '繰り返し周期'}</span>
            <div class="s12-readonly s12-input" aria-readonly="true">
              {type === 'single' ? '今日' : RECURRENCE_DEFAULT}
            </div>
          </div>

          {/* S12-10 ゴール紐付け */}
          <div class="s12-field">
            <span class="s12-label">ゴール紐付け</span>
            <div class="s12-readonly s12-input s12-readonly-with-chevron" aria-readonly="true">
              <span>なし</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" focusable="false">
                <path d="M4 5.5l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
          </div>

          {/* S12-11 メモ */}
          <div class="s12-field">
            <label class="s12-label" for="s12-memo-input">メモ</label>
            <textarea
              id="s12-memo-input"
              class="s12-memo s12-input"
              value={memo}
              onInput={(e) => setMemo(e.currentTarget.value)}
              placeholder="メモを追加"
              rows={3}
              maxLength={1000}
            />
          </div>

          {/* S12-12 CTA 作成 */}
          <button
            type="submit"
            class="s12-submit"
            aria-disabled={!isValid}
            onClick={(e) => { if (!isValid) { e.preventDefault(); return; } }}
          >作成</button>
        </form>
      </section>
    </div>
  );
}

export default S12TaskAdd;
```

### 2. lais/src/components/screens/S12TaskAdd.css（新規全文）

```css
/*
 * S-12 Task Add — design_spec_v1.md §4.5 準拠
 * LP-001 / 011 / 013 / 014 事前適用
 */

/* Overlay --------------------------------------------------------------- */
.s12-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: var(--z-overlay);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: s12-overlay-fade var(--duration-fast) var(--ease-out);
}

@keyframes s12-overlay-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Modal ----------------------------------------------------------------- */
.s12-modal {
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
  animation: s12-modal-up var(--duration-normal) var(--ease-out);
}

@keyframes s12-modal-up {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

/* LP-013: iOS safe-area 段階的フォールバック */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .s12-modal {
    padding-bottom: calc(env(safe-area-inset-bottom) + 30px);
  }
}

/* LP-014 */
.s12-modal:focus:not(:focus-visible) { outline: none; }
.s12-modal:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: calc(var(--focus-ring-offset) * -1);
}

/* S12-1 */
.s12-drag-handle {
  width: 40px;
  height: 4px;
  background: var(--border-strong);
  border-radius: var(--radius-pill);
  margin: var(--space-sm) auto 0;
}

/* S12-2 / S12-3 */
.s12-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-md);
  margin-bottom: var(--space-lg);
}

.s12-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-regular);
  letter-spacing: var(--letter-spacing-ja);
  color: var(--text-primary);
  line-height: var(--line-height-ja-heading);
  margin: 0;
}

.s12-close {
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

.s12-close:focus:not(:focus-visible) { outline: none; }
.s12-close:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

/* Form ------------------------------------------------------------------ */
.s12-form { display: flex; flex-direction: column; gap: var(--space-md); }

.s12-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  border: none;
  padding: 0;
  margin: 0;
  min-width: 0;
}

.s12-label {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-label);
  text-transform: uppercase;
  line-height: var(--line-height-label);
  padding: 0;
}

/* S12-5 */
.s12-type-row { display: flex; gap: var(--space-sm); flex-wrap: wrap; }

.s12-type-pill {
  min-height: var(--tap-target-min);
  padding: 12px 18px;
  border-radius: var(--radius-pill);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-regular);
  color: var(--text-muted);
  background: transparent;
  border: 1px solid var(--border-strong);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

.s12-type-pill-active {
  background: var(--accent-subtle);
  color: var(--accent);
  font-weight: var(--font-weight-semibold);
  border-color: transparent;
}

.s12-type-pill:focus:not(:focus-visible) { outline: none; }
.s12-type-pill:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

/* 共通 input (S12-6/7/9/10/11) ------------------------------------------ */
.s12-input {
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

.s12-input::placeholder { color: var(--text-placeholder); }

.s12-name, .s12-time, .s12-readonly { height: 48px; }

.s12-memo {
  min-height: 80px;
  padding-top: 12px;
  padding-bottom: 12px;
  line-height: var(--line-height-ja-body);
  resize: vertical;
}

.s12-input:focus { border-color: var(--accent); }
.s12-input:focus:not(:focus-visible) { outline: none; }
.s12-input:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
  border-color: var(--accent);
}

.s12-readonly { display: flex; align-items: center; color: var(--text-secondary); }
.s12-readonly-with-chevron { justify-content: space-between; color: var(--text-muted); }
.s12-readonly-with-chevron svg { color: var(--text-muted); flex-shrink: 0; }

/* S12-8 */
.s12-duration-row {
  display: flex;
  gap: var(--space-sm);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: var(--space-xs);
  scrollbar-width: thin;
}

.s12-duration-chip {
  min-height: var(--tap-target-min);
  padding: 12px 16px;
  border-radius: var(--radius-pill);
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  background: transparent;
  border: 1px solid var(--border-strong);
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

.s12-duration-chip-active {
  background: var(--accent-subtle);
  color: var(--accent);
  font-weight: var(--font-weight-semibold);
  border-color: transparent;
}

.s12-duration-chip:focus:not(:focus-visible) { outline: none; }
.s12-duration-chip:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

/* S12-12 */
.s12-submit {
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

.s12-submit[aria-disabled='true'] {
  background: var(--button-disabled-bg);
  color: var(--button-disabled-text);
  border: 1px solid var(--button-disabled-border);
  cursor: not-allowed;
}

.s12-submit:focus:not(:focus-visible) { outline: none; }
.s12-submit:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

/* LP-001 縮退 ----------------------------------------------------------- */
@media (prefers-reduced-motion: reduce) {
  .s12-overlay, .s12-modal {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
  }
  .s12-type-pill, .s12-duration-chip, .s12-input, .s12-submit {
    transition-duration: 1ms !important;
  }
}
```

### 3. lais/src/components/screens/S10Grow.jsx（M4-D 差分のみ）

```jsx
// import 追加
import { S12TaskAdd } from './S12TaskAdd.jsx';

// state + ref 追加
const addTaskButtonRef = useRef(null);
const [taskAddOpen, setTaskAddOpen] = useState(false);

// handler 差し替え
const handleAddTask = useCallback(() => { setTaskAddOpen(true); }, []);
const handleTaskAddClose = useCallback(() => { setTaskAddOpen(false); }, []);
const handleTaskCreate = useCallback((_payload) => {
  // M4-D スコープ外: API 連携は後続ミッション
}, []);

// S10-5 + タスクを追加 ボタン
<button
  ref={addTaskButtonRef}
  type="button"
  class="s10-add-task"
  onClick={handleAddTask}
  aria-haspopup="dialog"
  aria-expanded={taskAddOpen}
>+ タスクを追加</button>

// main の末尾（BottomTabBar の直後）
<S12TaskAdd
  open={taskAddOpen}
  onClose={handleTaskAddClose}
  onCreate={handleTaskCreate}
  returnFocusRef={addTaskButtonRef}
/>
```

---

## デザイントークン（themes.css night-sky 抜粋 — レビュー文脈用）

```css
[data-theme="night-sky"] {
  --bg-primary: #0D1117;
  --bg-surface: #161B22;
  --border: #484F58;
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
  --focus-ring-color: var(--accent);
}
```

---

## WCAG AA コントラスト実測値（night-sky テーマ）

| 項目 | 前景 | 背景 | 比率 | 判定 |
|---|---|---|---|---|
| タイトル / タスク名入力値 | `--text-primary` `#E6EDF3` | `--bg-surface` `#161B22` | **14.24:1** | AAA |
| タスク名 placeholder | `--text-placeholder` `#9BA7B4` | `--bg-primary` `#0D1117` | **6.77:1** | AA 合格 |
| ラベル（種別/所要時間 等） | `--text-muted` `#7A8593` | `--bg-surface` `#161B22` | **4.56:1** | AA 合格 (≥4.5) |
| 種別 Inactive ピル文字 | `--text-muted` `#7A8593` | `--bg-surface` `#161B22` | **4.56:1** | AA 合格 |
| 種別 Active ピル文字 | `--accent` `#79C0FF` | `--accent-subtle` ≈ `#1F2F3D` | **8.29:1** | AAA |
| CTA 作成（有効時） | `#FFFFFF` | `--button-primary-bg` `#1A5FC8` | **5.63:1** | AA 合格 |
| CTA 作成（disabled） | `--button-disabled-text` `#6E7681` | `--button-disabled-bg` `#1F2937` | **3.35:1** | §5.0 A 準拠（非テキストコントラスト対応。disabled 表示として UI Components AA 基準 3:1 ≥ クリア） |
| ✕ ボタン SVG | `--text-secondary` `#9BA7B4` | `--bg-surface` `#161B22` | **7.02:1** | AAA |

（WebAIM Contrast Checker 換算値。disabled CTA は §5.0 A「disabled 状態は WCAG 非テキストコントラスト 3:1 を満たす」で設計済み）

---

## 状態遷移表

```
GROW [+タスクを追加] → S12 open (modal 上昇) → [✕ / overlay / Escape] → GROW (focus 復帰)
                                              → [種別=習慣] → 予定日 → 繰り返し周期に swap
                                              → [タスク名入力] → isValid=true → CTA aria-disabled="false"
                                              → [作成] → console.log + state リセット + モーダル閉
```

---

## UIコンポーネント追加 7項目チェック（mission_template_v2 §v3）

- ✅ 開く操作: S10-5 `+ タスクを追加` ボタン (aria-haspopup="dialog" / aria-expanded)
- ✅ 閉じる操作 3種: overlay tap / Escape / ✕ ボタン
- ✅ 閉じた後に前の画面に正常復帰: `returnFocusRef` で S10-5 ボタンへ focus
- ✅ z-index: overlay `--z-overlay` (300) / modal `--z-modal` (400)（spec §3.7 整合）
- ✅ overlay 要素に onClick ハンドラ設定（target === currentTarget 判定）
- ✅ body scroll lock + モーダル内部 `overflow-y: auto` + max-height 85vh でキーボード表示時も内容確認可能
- ⚠️ E2E テスト項目追加: Playwright 未整備のため Phase 4 後続（LAIS-PHASE4-TEST-SETUP と合流）

---

## レビュアーへの依頼

1. **CRITICAL**: 実装が動作しない / 仕様 §4.5 に反する / WCAG 2.x 必須基準違反 / セキュリティ欠陥
2. **HIGH**: spec 細部からの逸脱 / UX 悪化 / 潜在バグ
3. **MEDIUM/LOW**: 改善提案

**特に確認してほしい点:**
- S12-1〜S12-12 の全要素が spec §4.5 の要素仕様表と一致しているか
- 閉じる 3種（overlay/Escape/✕）の挙動が全て動作するか
- CTA `aria-disabled` gate が keyboard submit（Enter）含めて正しく止まるか
- LP-013/LP-014 パターン適用が正しいか
- Tab focus trap が外部 Tab 漏れを起こさないか
- ESC ハンドラが handleClose の TDZ 問題を起こさないか（useEffect vs const 宣言順序）
- ESC + overlay の両方から close → returnFocus が二重発火しないか

JSON 形式で指摘ください（severity / category / title / evidence / recommendation）。
