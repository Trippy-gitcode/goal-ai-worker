import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'preact/hooks';
import './S13TaskDetail.css';

/*
 * S-13 Task Detail（ハーフモーダル / 閲覧+編集 inline swap）
 * design_spec_v1.md §4.6 準拠
 *
 * 本ミッション（M4-E）スコープ:
 * - 閲覧モード S13-1〜S13-12 全要素描画
 * - 編集モード state swap（S13-3/6/9 を入力フィールドへ、ボタン行を [キャンセル][保存] へ）
 * - 削除確認ダイアログ・Undo・Supabase 連携・S-12 への双方向 inline swap は後続
 * - AI 相談ボタンの実遷移先は console.log
 *
 * Rule of three: S-12 と同じモーダル骨格をコピー。3 つ目のハーフモーダル登場時に共通抽出する
 *
 * Learned Patterns 事前適用:
 * - LP-001/002/003/011/013/014: S-12 と同じ
 * - LP-015 候補: Active state border-color 残し（M4-D R1 で発見、Rule of three まで暫定適用）
 */

const STATUS_META = {
  done:      { label: '完了済み',  klass: 's13-status-done' },
  active:    { label: '進行中',    klass: 's13-status-active' },
  scheduled: { label: '予定',      klass: 's13-status-scheduled' },
};

const DURATION_OPTIONS = [5, 10, 15, 30, 45, 60, 90, 120];

export function S13TaskDetail({ open, task, onClose, onSave, onDelete, returnFocusRef }) {
  const titleId = useId();
  const editNameId = useId();
  const dialogRef = useRef(null);
  const editFirstFocusRef = useRef(null);

  const [mode, setMode] = useState('view'); // 'view' | 'edit'
  /*
   * R2 code_reviewer R-001 fix:
   * 未設定（undefined/null）は空文字列で保持し、保存時に null/未指定として元値を温存する。
   * 固定デフォルト ('10:00' / 30) で初期化すると、未設定の意味が破壊される。
   */
  const [draftName, setDraftName] = useState('');
  const [draftTime, setDraftTime] = useState('');
  const [draftDuration, setDraftDuration] = useState('');
  const [draftMemo, setDraftMemo] = useState('');

  // open 切替時: view モードへリセット、draft を task から忠実に初期化
  useEffect(() => {
    if (!open || !task) return;
    setMode('view');
    setDraftName(task.name ?? '');
    setDraftTime(task.time ?? '');
    setDraftDuration(task.duration != null ? String(task.duration) : '');
    setDraftMemo(task.memo ?? '');
  }, [open, task]);

  // 編集モード突入時: 最初の入力フィールド (タスク名) に focus
  useEffect(() => {
    if (mode !== 'edit') return;
    const t = setTimeout(() => editFirstFocusRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [mode]);

  // body scroll lock
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

  // ESC キー（M4-D LP-002/closure 注意点を踏襲）
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

  // Tab focus trap
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

  const status = task?.status || 'scheduled';
  const statusMeta = STATUS_META[status] || STATUS_META.scheduled;
  const isDone = status === 'done';

  // S13-12 AI 相談 2 種: 完了済みは「振り返り相談」active、未完了は「進め方を聞く」active
  const aiButtons = useMemo(
    () => [
      {
        id: 'ai-progress',
        label: '進め方を聞く',
        active: !isDone,
      },
      {
        id: 'ai-review',
        label: '振り返り相談',
        active: isDone,
      },
    ],
    [isDone]
  );

  const handleEdit = useCallback(() => setMode('edit'), []);
  const handleCancelEdit = useCallback(() => {
    if (!task) return;
    setDraftName(task.name ?? '');
    setDraftTime(task.time ?? '');
    setDraftDuration(task.duration != null ? String(task.duration) : '');
    setDraftMemo(task.memo ?? '');
    setMode('view');
  }, [task]);

  const handleSave = useCallback(
    (e) => {
      e?.preventDefault?.();
      if (!draftName.trim()) return;
      // R2 code_reviewer R-001 fix: 空文字列は null として保持（未設定の意味を温存）
      const payload = {
        ...task,
        name: draftName.trim(),
        time: draftTime === '' ? null : draftTime,
        duration: draftDuration === '' ? null : Number(draftDuration),
        memo: draftMemo,
      };
      // eslint-disable-next-line no-console
      console.log('[S13TaskDetail] save:', payload);
      onSave?.(payload);
      setMode('view');
    },
    [task, draftName, draftTime, draftDuration, draftMemo, onSave]
  );

  const handleDelete = useCallback(() => {
    // eslint-disable-next-line no-console
    console.log('[S13TaskDetail] delete:', task?.id);
    onDelete?.(task);
    handleClose();
  }, [task, onDelete, handleClose]);

  const handleAi = useCallback((id) => {
    // eslint-disable-next-line no-console
    console.log('[S13TaskDetail] ai:', id);
  }, []);

  if (!open || !task) return null;

  const isValid = draftName.trim().length > 0;

  return (
    <div class="s13-overlay" onClick={handleOverlayClick} role="presentation">
      {/*
        R2 sw_debugger R-001 fix (WCAG 2.4.6 / 4.1.2):
        edit モードでは <h2 id={titleId}> が <input> に置換されるため、
        aria-labelledby だとアクセシブルネームが失われる。
        aria-label に切替え、現在のタスク名を含めて常に有効な name を提供する。
      */}
      <section
        id="main-content"
        ref={dialogRef}
        class="s13-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`タスク詳細: ${task.name}`}
      >
        {/* S13-1 ドラッグハンドル */}
        <div class="s13-drag-handle" aria-hidden="true" />

        {/* S13-2 / S13-3 / S13-4 ヘッダ行（チェック + タスク名 + 閉じる） */}
        <header class="s13-header">
          <div class="s13-header-left">
            {/* S13-2: 28×28 status 別チェック（装飾。実際の状態切替は S10 側） */}
            <span class={`s13-check s13-check-${status}`} aria-hidden="true">
              {isDone && (
                <svg viewBox="0 0 14 14" width="14" height="14" focusable="false">
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
            </span>
            {/* h2 は view モード固有。edit モードでは別 id の input を使う */}
            {mode === 'view' ? (
              <h2 id={titleId} class="s13-task-name">{task.name}</h2>
            ) : (
              <input
                ref={editFirstFocusRef}
                id={editNameId}
                class="s13-task-name s13-input s13-edit-name"
                type="text"
                value={draftName}
                onInput={(e) => setDraftName(e.currentTarget.value)}
                placeholder="タスク名"
                aria-label="タスク名"
                maxLength={120}
              />
            )}
          </div>
          <button
            type="button"
            class="s13-close"
            onClick={handleClose}
            aria-label="閉じる"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </button>
        </header>

        {/* S13-5 ステータスラベル */}
        <p class={`s13-status ${statusMeta.klass}`}>{statusMeta.label}</p>

        {/* S13-6 メタデータ行 */}
        <dl class="s13-meta">
          <div class="s13-meta-item">
            <dt class="s13-meta-label">時刻</dt>
            {mode === 'view' ? (
              <dd class="s13-meta-value">{task.time || '—'}</dd>
            ) : (
              <dd class="s13-meta-value">
                <input
                  class="s13-input s13-edit-time"
                  type="time"
                  value={draftTime}
                  onInput={(e) => setDraftTime(e.currentTarget.value)}
                  aria-label="開始時刻"
                />
              </dd>
            )}
          </div>
          <div class="s13-meta-item">
            <dt class="s13-meta-label">所要時間</dt>
            {mode === 'view' ? (
              <dd class="s13-meta-value">{task.duration ? `${task.duration}分` : '—'}</dd>
            ) : (
              <dd class="s13-meta-value">
                <select
                  class="s13-input s13-edit-duration"
                  value={draftDuration}
                  onChange={(e) => setDraftDuration(e.currentTarget.value)}
                  aria-label="所要時間"
                >
                  <option value="">未設定</option>
                  {DURATION_OPTIONS.map((min) => (
                    <option key={min} value={String(min)}>{min}分</option>
                  ))}
                </select>
              </dd>
            )}
          </div>
          <div class="s13-meta-item">
            <dt class="s13-meta-label">ゴール</dt>
            <dd class="s13-meta-value s13-meta-goal">
              <span
                class={`s13-cat-dot s13-cat-dot-${task.category || 'other'}`}
                aria-hidden="true"
              />
              <span>{task.categoryLabel || 'なし'}</span>
            </dd>
          </div>
        </dl>

        {/* S13-8 / S13-9 メモ */}
        <div class="s13-memo-section">
          <p class="s13-memo-label">MEMO</p>
          {mode === 'view' ? (
            <p class="s13-memo">{task.memo || 'メモはありません'}</p>
          ) : (
            <textarea
              class="s13-memo s13-input s13-edit-memo"
              value={draftMemo}
              onInput={(e) => setDraftMemo(e.currentTarget.value)}
              placeholder="メモを追加"
              rows={3}
              maxLength={1000}
              aria-label="メモ"
            />
          )}
        </div>

        {/* ボタン行: view → S13-10/11 編集+削除 / edit → キャンセル+保存 */}
        {mode === 'view' ? (
          <div class="s13-actions">
            <button type="button" class="s13-edit" onClick={handleEdit}>
              編集
            </button>
            <button type="button" class="s13-delete" onClick={handleDelete}>
              削除
            </button>
          </div>
        ) : (
          <div class="s13-actions">
            <button
              type="button"
              class="s13-edit"
              onClick={handleCancelEdit}
            >
              キャンセル
            </button>
            <button
              type="button"
              class="s13-save"
              aria-disabled={!isValid}
              onClick={(e) => { if (!isValid) { e.preventDefault(); return; } handleSave(e); }}
            >
              保存
            </button>
          </div>
        )}

        {/* S13-12 AI 相談ボタン 2 種（view モードのみ） */}
        {mode === 'view' && (
          <div class="s13-ai-row">
            {aiButtons.map((btn) => (
              <button
                key={btn.id}
                type="button"
                class={
                  's13-ai-btn ' +
                  (btn.active ? 's13-ai-btn-active' : 's13-ai-btn-inactive')
                }
                aria-disabled={!btn.active}
                onClick={() => { if (btn.active) handleAi(btn.id); }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default S13TaskDetail;
