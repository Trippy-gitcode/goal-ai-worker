import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import './S15GoalCreate.css';

/*
 * S-15 Goal Create（ハーフモーダル / 3 番目）
 * design_spec_v1.md §4.8 準拠
 *
 * 本ミッション（M4-G）スコープ:
 * - S15-1〜S15-8 全要素描画
 * - カテゴリ複数選択 (6 項目 / LP-015 適用)
 * - インラインタスク追加は console.log のみ
 * - 期限ピッカーは読み取り専用表示（OS ピッカー連携は Phase 4 後続）
 * - Supabase 書き込み・spring feedback は後続
 *
 * Rule of three 観測点:
 * - S-12, S-13, S-15 の 3 つ目ハーフモーダル
 * - 共通抽出（BaseHalfModal コンポーネント）は本ミッション後に判断
 *
 * Learned Patterns 事前適用:
 * - LP-001/002/003/004/011/013/014: S-12/S-13 と同パターン
 * - LP-015: Active カテゴリチップに border-color 残し（正式昇格後初回適用）
 *
 * PATCH-BUG-RT-S15-MODAL-CLOSE-FIX V3（2026-04-26）:
 * - ESC + close + overlay click が閉じない致命バグ修正（lais_ux_quality_measurement_2026-04-26.md CRITICAL-A）
 * - Root cause: lazy + Suspense + 親 onClose props identity churn により useEffect の deps が
 *   毎レンダで再評価されリスナー再アタッチ → keydown 取りこぼし／キャプチャ漏れ
 * - 修正方針:
 *   1) onClose を ref 経由で参照（callback identity churn の影響を遮断）
 *   2) keydown は capture: true で document に登録（focus trap より先に Escape を捕捉）
 *   3) useLayoutEffect で commit phase 直後にハンドラ設置（Suspense lazy 描画後の初回操作も拾う）
 *   4) data-testid="s15-modal" / "s15-overlay" / "s15-close" を真 E2E 3 軸検証用に付与
 *   5) component unmount 時に body overflow を確実復元（modal trap 解消後の next page 操作可）
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
  const [dueLabel] = useState('期限なし'); // 期限ピッカーは Phase 4 後続で OS 連携
  const [selectedCategories, setSelectedCategories] = useState([]);

  // PATCH-BUG-RT-S15-MODAL-CLOSE-FIX V3:
  // 親 (App.jsx GoalCreateRoute) は onClose={() => route('/grow')} をインラインで毎レンダ生成。
  // これにより onClose の identity が毎レンダ churn し useCallback(handleClose) も churn、
  // useEffect deps([open, handleClose]) で listener が毎フレーム再アタッチされる。
  // Lazy + Suspense 直後の commit timing でユーザの ESC が再アタッチ window に落ち取りこぼされた。
  // 解決: onClose を ref に格納し、ハンドラはマウント時 1 度だけ登録する。
  const onCloseRef = useRef(onClose);
  const returnFocusRefRef = useRef(returnFocusRef);
  useEffect(() => {
    onCloseRef.current = onClose;
    returnFocusRefRef.current = returnFocusRef;
  }, [onClose, returnFocusRef]);

  const handleClose = useCallback(() => {
    onCloseRef.current?.();
    setTimeout(() => {
      const ref = returnFocusRefRef.current;
      if (ref?.current) ref.current.focus();
    }, 0);
  }, []);

  // open 時: focus を name input へ
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => nameInputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  // body scroll lock
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // ESC キー — capture phase で focus trap より先に拾う、deps 安定化で listener churn 防止
  // useLayoutEffect: Suspense lazy chunk 描画直後 commit timing で確実にアタッチ
  useLayoutEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };
    document.addEventListener('keydown', onKey, { capture: true });
    return () => document.removeEventListener('keydown', onKey, { capture: true });
  }, [open, handleClose]);

  // Tab focus trap — bubble phase で OK、ESC とは別ハンドラなので干渉しない
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

  // unmount 時の保険: body overflow を必ず復元（route 切替で stuck 状態が残らないように）
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

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
    // eslint-disable-next-line no-console
    console.log('[S15GoalCreate] add inline task (Phase 4 後続)');
  }, []);

  const isValid = useMemo(() => name.trim().length > 0, [name]);

  const handleSubmit = useCallback(
    (e) => {
      e?.preventDefault?.();
      if (!isValid) return;
      const payload = {
        name: name.trim(),
        due: null, // Phase 4 後続で期限ピッカー実装
        categories: selectedCategories,
      };
      // eslint-disable-next-line no-console
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
    <div
      class="s15-overlay"
      data-testid="s15-overlay"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <section
        id="main-content"
        ref={dialogRef}
        class="s15-modal"
        data-testid="s15-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {/* S15-1 ドラッグハンドル */}
        <div class="s15-drag-handle" aria-hidden="true" />

        {/* S15-2 / S15-3 タイトル + 閉じる */}
        <header class="s15-header">
          <h2 id={titleId} class="s15-title">ゴールを作成</h2>
          <button
            type="button"
            class="s15-close"
            data-testid="s15-close"
            onClick={handleClose}
            aria-label="閉じる"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </button>
        </header>

        <form class="s15-form" onSubmit={handleSubmit}>
          {/* S15-4 ゴール名入力 */}
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

          {/* S15-5 期限ピッカー (読み取り専用表示) */}
          <div class="s15-field">
            <span class="s15-label">期限</span>
            {/*
              R2 a11y fix R-001 (WCAG 4.1.2 Name/Role/Value):
              aria-readonly は role="textbox"/combobox/etc に限定されるため、
              プレーン div では無効。読み取り専用表示は視覚のみなので aria 属性を外す。
              インタラクション可能になった時点で <input readonly> に変更する。
            */}
            <div class="s15-date s15-input s15-readonly-with-icon">
              <span>{dueLabel}</span>
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

          {/*
            S15-6 カテゴリ 6 項目複数選択
            LP-015: Active 時に border を --accent で残し WCAG 1.4.11 3:1 確保
            LP-014: :focus-visible 分離
          */}
          <fieldset class="s15-field">
            <legend class="s15-label">カテゴリ（複数選択可）</legend>
            <div class="s15-category-row" role="group" aria-label="カテゴリ選択">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    class={
                      's15-category' +
                      (isSelected ? ' s15-category-active' : '')
                    }
                    aria-pressed={isSelected}
                    onClick={() => toggleCategory(cat.id)}
                  >
                    {isSelected && (
                      <svg
                        class="s15-category-check"
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path
                          d="M3 7 L6 10 L11 4"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    )}
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* S15-7 + 最初のタスクを追加 */}
          <button
            type="button"
            class="s15-add-task"
            onClick={handleAddInlineTask}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            最初のタスクを追加
          </button>

          {/* S15-8 CTA 作成 */}
          <button
            type="submit"
            class="s15-submit"
            aria-disabled={!isValid}
            onClick={(e) => {
              if (!isValid) {
                e.preventDefault();
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

export default S15GoalCreate;
