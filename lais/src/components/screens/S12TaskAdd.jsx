import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'preact/hooks';
import './S12TaskAdd.css';

/*
 * S-12 Task Add（ハーフモーダル）
 * design_spec_v1.md §4.5 準拠
 *
 * 本ミッション（M4-D）スコープ:
 * - mock state で全フィールド描画。Supabase 書き込みは後続ミッション
 * - 閉じる 3 種: close ボタン / overlay tap / Escape
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
    // 開いたとき: 値はそのまま（未保存確認は Phase 4 後続）。focus はタスク名入力へ
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
    // LP-002: 呼出元へ focus を戻す（非同期で実行し、close アニメ後に移動）
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
      // 値リセット（成功時）
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
    <div
      class="s12-overlay"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <section
        id="main-content"
        ref={dialogRef}
        class="s12-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {/* S12-1 ドラッグハンドル（視覚のみ。スワイプ閉じは Phase 4 後続） */}
        <div class="s12-drag-handle" aria-hidden="true" />

        {/* S12-2 / S12-3 タイトル + 閉じるボタン (IconClose) */}
        <header class="s12-header">
          <h2 id={titleId} class="s12-title">タスクを追加</h2>
          <button
            type="button"
            class="s12-close"
            onClick={handleClose}
            aria-label="閉じる"
          >
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
              >
                単発タスク
              </button>
              <button
                type="button"
                class={'s12-type-pill' + (type === 'habit' ? ' s12-type-pill-active' : '')}
                role="radio"
                aria-checked={type === 'habit'}
                onClick={() => setType('habit')}
              >
                習慣
              </button>
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
                  class={
                    's12-duration-chip' + (duration === min ? ' s12-duration-chip-active' : '')
                  }
                  role="radio"
                  aria-checked={duration === min}
                  onClick={() => setDuration(min)}
                >
                  {min}分
                </button>
              ))}
            </div>
          </fieldset>

          {/* S12-9 予定日 / 繰り返し周期 (種別で swap) */}
          <div class="s12-field">
            <span class="s12-label">{type === 'single' ? '予定日' : '繰り返し周期'}</span>
            <div
              class="s12-readonly s12-input s12-readonly-with-icon"
            >
              <span>{type === 'single' ? '今日' : RECURRENCE_DEFAULT}</span>
              {/* R2 spec fix R-001: §4.5 S12-9 要求 — 14px カレンダーアイコン */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
                focusable="false"
              >
                <rect x="2" y="3" width="10" height="9" rx="1.5" stroke="currentColor" stroke-width="1.2" />
                <path d="M5 1.5v2M9 1.5v2M2 6h10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
              </svg>
            </div>
          </div>

          {/* S12-10 ゴール紐付け */}
          <div class="s12-field">
            <span class="s12-label">ゴール紐付け</span>
            <div class="s12-readonly s12-input s12-readonly-with-chevron">
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
            onClick={(e) => {
              if (!isValid) {
                e.preventDefault();
                // aria-disabled は submit を止めないので、ここで明示的に抑止
                return;
              }
            }}
          >
            作成
          </button>
        </form>
      </section>
    </div>
  );
}

export default S12TaskAdd;
