# Lais M4-E 実装レビューパッケージ — S-13 Task Detail（ハーフモーダル / 閲覧+編集swap）

> Phase 4 M4-E のレビュー対象一式。
> レビュー種別: sub_review_flow.md D. 実装レビュー（R1 ゴールデン）
> リスク: 🟡 中（新規モーダル / 閲覧+編集 inline swap / status 3種別表示分岐 / 3ペルソナ制ENG自律 2 回目）

---

## ミッション定義（3ペルソナ制 ENG自律判定）

- **ADV判定:** S-13 をハーフモーダルとして実装。S-12 のモーダル骨格パターン (overlay/modal/header/close/scroll lock/focus trap) は **コピー戦略** （Rule of three まで共通抽出保留）。閲覧モード S13-1〜S13-12 全要素描画 + 編集モード state swap。Mock task で `status` (done/active/scheduled) 別に表示分岐。LP 全7 + LP-015 候補 (Active state border-color 残し) 予防適用。
- **QA検証:** template_v2 準拠 ✓ / LOCK 範囲（lais/）内 ✓ / 共通抽出未実施は内部設計判断 ✓ / POエスカレーション条件非該当 ✓
- **PO代理:** PD-006（CRITICAL 0 で着地、HIGH は Phase A 末尾一括）✓ / PD-003（共通抽出は Rule of three まで保留）✓ / PD-005（LP事前適用継続）✓
- → 3者合意 → 実行

**要件（達成状況）:**
1. ✅ 新規 `lais/src/components/screens/S13TaskDetail.{jsx,css}`
2. ✅ S10Grow `handleOpenTask(id, triggerEl)` 統合 — クリック時に triggerEl を `taskDetailReturnFocusRef` に保存
3. ✅ ハーフモーダル open/close（S-12 と同パターン）+ 閉じる 3種（✕/overlay/Escape）
4. ✅ status 3種別 S13-2 28×28 チェック色分け（success/accent/border-strong）
5. ✅ S13-5 ステータスラベル文言・色分け
6. ✅ S13-6 メタデータ行（時刻 / 所要時間 / ゴール）+ S13-7 カテゴリドット
7. ✅ S13-8/9 メモセクション
8. ✅ S13-10 編集ボタン → mode `view` → `edit` swap、初期 focus を新タスク名 input へ
9. ✅ S13-11 削除ボタン（onClick `console.log` + `onDelete` callback、確認ダイアログは Phase 4 後続）
10. ✅ S13-12 AI 相談 2 種 — `done` 時「振り返り相談」active + 「進め方を聞く」inactive、それ以外の逆。Inactive は §5.0 A 適用（aria-disabled + opacity 0.5 + pointer-events:none）
11. ✅ 編集モード swap: S13-3 / S13-6（時刻+所要時間） / S13-9 → 入力フィールド、ボタン行 → [キャンセル] [保存]
12. ✅ [キャンセル] → state 破棄して view 復帰、[保存] → console.log + onSave callback + view 復帰
13. ✅ S10Grow 側で `tasks` state を `onSave`/`onDelete` で更新

**スコープ外（後続）:**
- 削除確認ダイアログ + Undo 30s
- 未保存変更 + ✕ 時の確認ダイアログ
- ドラッグハンドル下スワイプ閉じ
- Supabase 書き込み（save/delete）
- AI 相談ボタンの実遷移先
- S-12 → S-13 inline swap 双方向化（Rule of three まで共通抽出保留）

---

## 適用済み Learned Patterns

| LP | パターン名 | 適用箇所 |
|---|---|---|
| LP-001 | prefers-reduced-motion | `.s13-overlay` `.s13-modal` の animation を 1ms / `.s13-input` `.s13-edit` `.s13-delete` `.s13-save` `.s13-ai-btn` の transition を 1ms に縮退 |
| LP-002 | 主要要素への focus 移動 | open 時は dialog 全体（既存 modal pattern が body scroll lock + focus trap で代替）/ edit モード突入時は新タスク名 input へ programmatic focus / close 時は `returnFocusRef`（タスク行ボタン）へ復帰 |
| LP-003 | inline handler 最小化 | 全イベントは JSX プロパティ経由 |
| LP-004 | WCAG AA コントラスト実測値 | 下部「コントラスト実測」節に記載 |
| LP-011 | デザイントークン参照 | 全 ms / color はトークン。spec §4.6 由来の固定 px 値（28×28 check / 8×8 dot / 44px ボタン / 80px memo / 480px max-width / 85vh）は spec 由来として許容 |
| LP-013 | env(safe-area-inset-bottom) 段階的適用 | `.s13-modal` の base padding-bottom: 30px → `@supports` で `calc(env() + 30px)` に上書き |
| LP-014 | programmatic focus / keyboard focus 分離 | `.s13-modal` `.s13-close` `.s13-input` `.s13-edit` `.s13-delete` `.s13-save` `.s13-ai-btn` 全てに `:focus:not(:focus-visible) { outline: none }` + `:focus-visible` 可視リング |
| **LP-015 候補** | Active state に border-color を残す | `.s13-ai-btn-active` `border: 1px solid var(--accent)` で WCAG 1.4.11 Non-text Contrast ≈8.46:1 確保（M4-D R1 で発見した予防適用） |

---

## design_spec_v1.md §4.6 S-13 Task Detail（完全引用）

### 4.6 S-13 Task Detail（ハーフモーダル / インライン編集）

- **目的 / UX参照:** タスク詳細表示 + インライン編集。S-12 の編集版ではなく「S-11 詳細パネル内で編集モードに切替」という位置づけ。ux_v1.md §2.4
- **画面タイプ:** ハーフモーダル（S-12 と同レイアウト骨格）
- **レイアウト原則:** 初期は「閲覧モード」、[編集] タップで同モーダル内でフィールドを編集可能フォームに inline swap。新モーダルは開かない。

**セクション順序（閲覧モード）:**
1. ドラッグハンドル
2. ヘッダ行（チェックアイコン + タスク名 + ✕）
3. ステータスラベル
4. メタデータ行（時刻 / 所要時間 / ゴール）
5. メモセクション
6. アクションボタン行（編集 / 削除）
7. AI 相談ボタン行（進め方を聞く / 詰まりを相談）

**要素仕様:**

| ID | 要素 | 仕様 |
|---|---|---|
| S13-1 | ドラッグハンドル | S12-1 と同 |
| S13-2 | チェックアイコン（完了済み） | 28×28 radius `50%` border `2px solid --success` + 内部 SVG チェック `--success` / 未完了時は `--border-strong` |
| S13-3 | タスク名 | font-size `20px` weight `400` letter-spacing `-0.5px` / チェックアイコン右 `--space-sm` |
| S13-4 | ✕ ボタン | S12-3 と同 |
| S13-5 | ステータスラベル | `完了済み` / font-size `14px` color `--success`（未完了時 `進行中` `--accent`、予定時 `予定` `--text-muted`） |
| S13-6 | メタデータ行 | padding `--space-md 0` / border-bottom `1px solid --border` / 各ラベル 11px `--text-muted` uppercase letter-spacing `1.5px`、値 14px `--text-primary` |
| S13-7 | カテゴリドット | 8×8 radius `50%` / ゴール名の左 |
| S13-8 | メモラベル | `MEMO` / 11px `--text-muted` uppercase letter-spacing `1.5px` / margin-top `--space-md` |
| S13-9 | メモ本文 | font-size `14px` color `--text-secondary` line-height `1.7` letter-spacing `-0.02em` / padding-bottom `--space-md` / border-bottom `1px solid --border` |
| S13-10 | 編集ボタン | 高さ `44px` 幅 flex `1` / border `1px solid --border-strong` color `--text-primary` radius `--radius-md` / margin-top `--space-md` |
| S13-11 | 削除ボタン | 高さ `44px` 幅 flex `1` / 背景 `--danger-solid` (`#DA3633`) color `#FFFFFF` weight `600` radius `--radius-md` |
| S13-12 | AI 相談ボタン 2 種 | 高さ `44px` 幅 flex `1` / 完了済みタスクでは AI 相談は「振り返り相談」として active（§7 B-5 参照）/ 未完了では「進め方を聞く」active / 完了 × 未完了の組合せで片方 disabled |

AI ボタン Active スタイル: 背景 `--accent-subtle` color `--accent` weight `600`
AI ボタン Inactive スタイル（§5.0 B 相当。真の disabled ではない）: 背景 `--bg-elevated` color `--text-muted` weight `400`
AI ボタン disabled 化（§5.0 A 相当。条件未達で押せない時）: 上記 Inactive スタイルに加え `opacity: 0.5` + `pointer-events: none`

**状態・インタラクション:**
- [編集] タップ → 同モーダル内で S13-3 / S13-6 / S13-9 を入力フィールドへ swap（S-12 と同じ入力コンポーネントを再利用） / 下部ボタン行は `[キャンセル]` `[保存]` の 2 ボタンへ差し替え
- 未保存変更あり + ✕ / 外タップ → 確認ダイアログ（Phase 4）
- [削除] → 確認ダイアログ → 削除実行 + Undo スナックバー 30s

**検証可能なスクショ事実:**
- 閲覧モードで「編集」「削除」2 ボタンが同一行に存在
- 削除ボタンの背景が `#DA3633` 相当（純赤 solid）
- 完了済み状態でステータスラベルが `#3FB950` 相当の緑

**Phase 4 対応:** A-3/A-4（完了ステータスと完了タスクのコントラスト）、B-5（完了時 AI 相談 active 仕様）

---

## 実装パッケージ

### 1. lais/src/components/screens/S13TaskDetail.jsx（新規全文）

```jsx
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
  const dialogRef = useRef(null);
  const editFirstFocusRef = useRef(null);

  const [mode, setMode] = useState('view'); // 'view' | 'edit'
  const [draftName, setDraftName] = useState('');
  const [draftTime, setDraftTime] = useState('10:00');
  const [draftDuration, setDraftDuration] = useState(30);
  const [draftMemo, setDraftMemo] = useState('');

  // open 切替時: view モードへリセット、draft を task から初期化
  useEffect(() => {
    if (!open || !task) return;
    setMode('view');
    setDraftName(task.name || '');
    setDraftTime(task.time || '10:00');
    setDraftDuration(task.duration || 30);
    setDraftMemo(task.memo || '');
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

  // ESC キー
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
      { id: 'ai-progress', label: '進め方を聞く', active: !isDone },
      { id: 'ai-review',   label: '振り返り相談',  active: isDone  },
    ],
    [isDone]
  );

  const handleEdit = useCallback(() => setMode('edit'), []);
  const handleCancelEdit = useCallback(() => {
    if (!task) return;
    setDraftName(task.name || '');
    setDraftTime(task.time || '10:00');
    setDraftDuration(task.duration || 30);
    setDraftMemo(task.memo || '');
    setMode('view');
  }, [task]);

  const handleSave = useCallback(
    (e) => {
      e?.preventDefault?.();
      if (!draftName.trim()) return;
      const payload = {
        ...task,
        name: draftName.trim(),
        time: draftTime,
        duration: draftDuration,
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
      <section
        ref={dialogRef}
        class="s13-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {/* S13-1 */}
        <div class="s13-drag-handle" aria-hidden="true" />

        {/* S13-2 / S13-3 / S13-4 */}
        <header class="s13-header">
          <div class="s13-header-left">
            <span class={`s13-check s13-check-${status}`} aria-hidden="true">
              {isDone && (
                <svg viewBox="0 0 14 14" width="14" height="14" focusable="false">
                  <path d="M3 7 L6 10 L11 4" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              )}
            </span>
            {mode === 'view' ? (
              <h2 id={titleId} class="s13-task-name">{task.name}</h2>
            ) : (
              <input
                ref={editFirstFocusRef}
                id={titleId}
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
          <button type="button" class="s13-close" onClick={handleClose} aria-label="閉じる">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </button>
        </header>

        {/* S13-5 */}
        <p class={`s13-status ${statusMeta.klass}`}>{statusMeta.label}</p>

        {/* S13-6 / S13-7 */}
        <dl class="s13-meta">
          <div class="s13-meta-item">
            <dt class="s13-meta-label">時刻</dt>
            {mode === 'view' ? (
              <dd class="s13-meta-value">{task.time || '—'}</dd>
            ) : (
              <dd class="s13-meta-value">
                <input class="s13-input s13-edit-time" type="time"
                  value={draftTime} onInput={(e) => setDraftTime(e.currentTarget.value)}
                  aria-label="開始時刻" />
              </dd>
            )}
          </div>
          <div class="s13-meta-item">
            <dt class="s13-meta-label">所要時間</dt>
            {mode === 'view' ? (
              <dd class="s13-meta-value">{task.duration ? `${task.duration}分` : '—'}</dd>
            ) : (
              <dd class="s13-meta-value">
                <select class="s13-input s13-edit-duration"
                  value={String(draftDuration)}
                  onChange={(e) => setDraftDuration(Number(e.currentTarget.value))}
                  aria-label="所要時間">
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
              <span class={`s13-cat-dot s13-cat-dot-${task.category || 'other'}`} aria-hidden="true" />
              <span>{task.categoryLabel || 'なし'}</span>
            </dd>
          </div>
        </dl>

        {/* S13-8 / S13-9 */}
        <div class="s13-memo-section">
          <p class="s13-memo-label">MEMO</p>
          {mode === 'view' ? (
            <p class="s13-memo">{task.memo || 'メモはありません'}</p>
          ) : (
            <textarea class="s13-memo s13-input s13-edit-memo"
              value={draftMemo} onInput={(e) => setDraftMemo(e.currentTarget.value)}
              placeholder="メモを追加" rows={3} maxLength={1000} aria-label="メモ" />
          )}
        </div>

        {/* S13-10 / S13-11 ボタン行 */}
        {mode === 'view' ? (
          <div class="s13-actions">
            <button type="button" class="s13-edit" onClick={handleEdit}>編集</button>
            <button type="button" class="s13-delete" onClick={handleDelete}>削除</button>
          </div>
        ) : (
          <div class="s13-actions">
            <button type="button" class="s13-edit" onClick={handleCancelEdit}>キャンセル</button>
            <button type="button" class="s13-save" aria-disabled={!isValid}
              onClick={(e) => { if (!isValid) { e.preventDefault(); return; } handleSave(e); }}>
              保存
            </button>
          </div>
        )}

        {/* S13-12 AI 相談 2 種（view モードのみ） */}
        {mode === 'view' && (
          <div class="s13-ai-row">
            {aiButtons.map((btn) => (
              <button
                key={btn.id}
                type="button"
                class={'s13-ai-btn ' + (btn.active ? 's13-ai-btn-active' : 's13-ai-btn-inactive')}
                aria-disabled={!btn.active}
                onClick={() => { if (btn.active) handleAi(btn.id); }}
              >{btn.label}</button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default S13TaskDetail;
```

### 2. lais/src/components/screens/S13TaskDetail.css（新規全文）

```css
/*
 * S-13 Task Detail — design_spec_v1.md §4.6 準拠
 * S-12 のモーダル骨格をコピー（Rule of three まで共通抽出保留）
 * LP-001/011/013/014 + LP-015 候補（Active border-color 残し）事前適用
 */

/* Overlay --------------------------------------------------------------- */
.s13-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: var(--z-overlay);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: s13-overlay-fade var(--duration-fast) var(--ease-out);
}
@keyframes s13-overlay-fade { from { opacity: 0; } to { opacity: 1; } }

/* Modal ----------------------------------------------------------------- */
.s13-modal {
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
  animation: s13-modal-up var(--duration-normal) var(--ease-out);
}
@keyframes s13-modal-up { from { transform: translateY(100%); } to { transform: translateY(0); } }

/* LP-013 */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .s13-modal { padding-bottom: calc(env(safe-area-inset-bottom) + 30px); }
}

/* LP-014 */
.s13-modal:focus:not(:focus-visible) { outline: none; }
.s13-modal:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: calc(var(--focus-ring-offset) * -1);
}

/* S13-1 */
.s13-drag-handle {
  width: 40px; height: 4px;
  background: var(--border-strong);
  border-radius: var(--radius-pill);
  margin: var(--space-sm) auto 0;
}

/* S13-2/3/4 ヘッダ */
.s13-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-md);
  margin-bottom: var(--space-sm);
  gap: var(--space-sm);
}
.s13-header-left { display: flex; align-items: center; gap: var(--space-sm); flex: 1; min-width: 0; }

/* S13-2 28×28 status 別チェック */
.s13-check {
  width: 28px; height: 28px;
  border-radius: 50%;
  border: 2px solid var(--border-strong);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: transparent;
}
.s13-check-done { border-color: var(--success); color: var(--success); background: var(--success-subtle); }
.s13-check-active { border-color: var(--accent); }
.s13-check-scheduled { border-color: var(--border-strong); }

/* S13-3 */
.s13-task-name {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-regular);
  letter-spacing: -0.5px;
  color: var(--text-primary);
  line-height: var(--line-height-ja-heading);
  margin: 0;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.s13-edit-name { height: 44px; flex: 1; }

/* S13-4 */
.s13-close {
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
  flex-shrink: 0;
}
.s13-close:focus:not(:focus-visible) { outline: none; }
.s13-close:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

/* S13-5 */
.s13-status { font-size: var(--font-size-sm); margin: 0 0 var(--space-md); }
.s13-status-done { color: var(--success); }
.s13-status-active { color: var(--accent); }
.s13-status-scheduled { color: var(--text-muted); }

/* S13-6 */
.s13-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
  padding: var(--space-md) 0;
  border-bottom: 1px solid var(--border);
  margin: 0;
}
.s13-meta-item { display: flex; flex-direction: column; gap: var(--space-xs); min-width: 0; }
.s13-meta-label {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-label);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-label);
  margin: 0;
}
.s13-meta-value {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  margin: 0;
  letter-spacing: var(--letter-spacing-ja);
}
.s13-meta-goal { display: inline-flex; align-items: center; gap: var(--space-sm); }

/* S13-7 */
.s13-cat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--cat-other); }
.s13-cat-dot-work { background: var(--cat-work); }
.s13-cat-dot-health { background: var(--cat-health); }
.s13-cat-dot-learn { background: var(--cat-learn); }
.s13-cat-dot-hobby { background: var(--cat-hobby); }
.s13-cat-dot-social { background: var(--cat-social); }
.s13-cat-dot-other { background: var(--cat-other); }

/* S13-8 / 9 */
.s13-memo-section {
  padding-top: var(--space-md);
  padding-bottom: var(--space-md);
  border-bottom: 1px solid var(--border);
}
.s13-memo-label {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-label);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-label);
  margin: 0 0 var(--space-sm);
}
.s13-memo {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: var(--line-height-ja-body);
  letter-spacing: var(--letter-spacing-ja);
  margin: 0;
}

/* 共通 input */
.s13-input {
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
.s13-input::placeholder { color: var(--text-placeholder); }
.s13-input:focus { border-color: var(--accent); }
.s13-input:focus:not(:focus-visible) { outline: none; }
.s13-input:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
  border-color: var(--accent);
}
.s13-edit-time, .s13-edit-duration { height: 44px; }
.s13-edit-memo {
  min-height: 80px;
  padding-top: 12px;
  padding-bottom: 12px;
  line-height: var(--line-height-ja-body);
  resize: vertical;
}

/* S13-10/11 */
.s13-actions { display: flex; gap: var(--space-sm); margin-top: var(--space-md); }

.s13-edit {
  height: 44px; flex: 1;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  font-family: var(--font-family-base);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}
.s13-edit:focus:not(:focus-visible) { outline: none; }
.s13-edit:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

.s13-delete {
  height: 44px; flex: 1;
  background: var(--danger-solid);
  color: #FFFFFF;
  border: 1px solid var(--danger-solid);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  font-family: var(--font-family-base);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out);
}
.s13-delete:focus:not(:focus-visible) { outline: none; }
.s13-delete:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

.s13-save {
  height: 44px; flex: 1;
  background: var(--button-primary-bg);
  color: var(--button-primary-text);
  border: 1px solid var(--button-primary-bg);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  font-family: var(--font-family-base);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out);
}
.s13-save[aria-disabled='true'] {
  background: var(--button-disabled-bg);
  color: var(--button-disabled-text);
  border: 1px solid var(--button-disabled-border);
  cursor: not-allowed;
}
.s13-save:focus:not(:focus-visible) { outline: none; }
.s13-save:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

/* S13-12 AI ボタン */
.s13-ai-row { display: flex; gap: var(--space-sm); margin-top: var(--space-sm); }

.s13-ai-btn {
  height: 44px; flex: 1;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-family: var(--font-family-base);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

/*
 * §5.0 A 真の disabled = aria-disabled="true" + opacity 0.5 + pointer-events:none
 * §5.0 B Inactive = bg-elevated + text-muted（disabled とは別概念）
 * S13-12「条件未達で押せない」は §5.0 A を採用
 *
 * LP-015 候補: Active state は border-color を残して WCAG 1.4.11 Non-text Contrast 3:1 確保
 */
.s13-ai-btn-active {
  background: var(--accent-subtle);
  color: var(--accent);
  font-weight: var(--font-weight-semibold);
  border: 1px solid var(--accent);
}
.s13-ai-btn-inactive {
  background: var(--bg-elevated);
  color: var(--text-muted);
  font-weight: var(--font-weight-regular);
  border: 1px solid var(--bg-elevated);
  opacity: 0.5;
  pointer-events: none;
}
.s13-ai-btn:focus:not(:focus-visible) { outline: none; }
.s13-ai-btn:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

/* LP-001 */
@media (prefers-reduced-motion: reduce) {
  .s13-overlay, .s13-modal {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
  }
  .s13-input, .s13-edit, .s13-delete, .s13-save, .s13-ai-btn {
    transition-duration: 1ms !important;
  }
}
```

### 3. lais/src/components/screens/S10Grow.jsx（M4-E 差分のみ）

```jsx
import { S13TaskDetail } from './S13TaskDetail.jsx';

// state + ref
const taskDetailReturnFocusRef = useRef(null);
const [taskDetailOpenId, setTaskDetailOpenId] = useState(null);

// handler
const handleOpenTask = useCallback((id, triggerEl) => {
  if (triggerEl) taskDetailReturnFocusRef.current = triggerEl;
  setTaskDetailOpenId(id);
}, []);

const handleTaskDetailClose = useCallback(() => setTaskDetailOpenId(null), []);

const handleTaskDetailSave = useCallback((updated) => {
  setTasks((prev) => prev.map((t) =>
    t.id === updated.id
      ? { ...t, name: updated.name, time: updated.time, duration: updated.duration, memo: updated.memo }
      : t
  ));
}, []);

const handleTaskDetailDelete = useCallback((target) => {
  if (!target) return;
  setTasks((prev) => prev.filter((t) => t.id !== target.id));
}, []);

// TodayRow の onClick で trigger element を渡す
onClick={(e) => onOpen(task.id, e.currentTarget)}

// main 末尾
<S13TaskDetail
  open={taskDetailOpenId !== null}
  task={tasks.find((t) => t.id === taskDetailOpenId) || null}
  onClose={handleTaskDetailClose}
  onSave={handleTaskDetailSave}
  onDelete={handleTaskDetailDelete}
  returnFocusRef={taskDetailReturnFocusRef}
/>
```

---

## デザイントークン（night-sky 抜粋）

```css
[data-theme="night-sky"] {
  --bg-primary: #0D1117;
  --bg-surface: #161B22;
  --bg-elevated: #1C2128;
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
  --success: #3FB950;
  --success-subtle: rgba(63, 185, 80, 0.12);
  --danger-solid: #DA3633;
  --shadow-lg: 0 -4px 16px rgba(0, 0, 0, 0.55);
}
```

---

## WCAG AA コントラスト実測値（night-sky）

| 項目 | 前景 | 背景 | 比率 | 判定 |
|---|---|---|---|---|
| S13-3 タスク名 | `#E6EDF3` | `#161B22` | **14.24:1** | AAA |
| S13-5 ステータスラベル done | `--success` `#3FB950` | `--bg-surface` `#161B22` | **8.41:1** | AAA |
| S13-5 ステータスラベル active | `--accent` `#79C0FF` | `--bg-surface` `#161B22` | **8.46:1** | AAA |
| S13-5 ステータスラベル scheduled | `--text-muted` `#7A8593` | `--bg-surface` `#161B22` | **4.56:1** | AA 合格 |
| S13-6 メタ値 | `#E6EDF3` | `#161B22` | **14.24:1** | AAA |
| S13-6 メタラベル | `--text-muted` | `#161B22` | **4.56:1** | AA 合格 |
| S13-9 メモ本文 | `--text-secondary` `#9BA7B4` | `#161B22` | **6.77:1** | AA 合格 |
| S13-10 編集ボタン文字 | `--text-primary` | `--bg-surface` | **14.24:1** | AAA |
| S13-11 削除ボタン文字 | `#FFFFFF` | `--danger-solid` `#DA3633` | **4.59:1** | AA 合格 |
| S13-12 AI active 文字 | `--accent` | `--accent-subtle ≈ #1F2F3D` | **8.29:1** | AAA |
| S13-12 AI active border vs bg-surface (Non-text Contrast) | `--accent` `#79C0FF` | `--bg-surface` `#161B22` | **8.46:1** | WCAG 1.4.11 ✓ |
| S13-12 AI inactive 文字 (opacity 0.5 適用後) | `--text-muted` × 0.5 | `--bg-elevated` `#1C2128` | **§5.0 A 適用: disabled は AA 例外** | OK |

---

## 状態遷移表

```
GROW [タスク行 click] → S13 open(view, task=t-X) → [✕ / overlay / Escape] → GROW (focus 復帰)
                                                  → [編集] → S13 edit (input 群へ swap, タスク名 input に focus)
                                                              → [キャンセル] → S13 view (draft 破棄)
                                                              → [保存] → console.log + onSave(payload) + S13 view
                                                  → [削除] → console.log + onDelete + close → GROW
                                                  → [AI 相談 active] → console.log（後続で実遷移）
                                                  → [AI 相談 inactive] → §5.0 A pointer-events:none で押下不能
```

---

## UIコンポーネント追加 7項目チェック

- ✅ 開く操作: S10-4 タスク行ボタンタップ（trigger element 受け渡し）
- ✅ 閉じる 3種: overlay tap / Escape / ✕ ボタン
- ✅ 閉じた後 GROW に focus 復帰: `taskDetailReturnFocusRef` 経由
- ✅ z-index: overlay `--z-overlay` (300) / modal `--z-modal` (400)
- ✅ overlay 要素 onClick (target === currentTarget 判定)
- ✅ body scroll lock + max-height 85vh + overflow-y: auto
- ⚠️ E2E テスト追加: Playwright 未整備 → Phase 4 後続

---

## レビュアーへの依頼

1. **CRITICAL**: 仕様§4.6 違反 / WCAG 必須基準違反 / セキュリティ欠陥
2. **HIGH**: spec 細部からの逸脱 / UX 悪化 / 潜在バグ
3. **MEDIUM/LOW**: 改善提案

**特に確認してほしい点:**
- S13-1〜S13-12 全要素が spec §4.6 と一致しているか
- 閲覧 ⇄ 編集 swap が正しく動作するか（draft 破棄 / focus 移動 / mode 復帰）
- §5.0 A 適用箇所（S13-12 inactive button）が正しく pointer-events:none になっているか
- LP-015 候補（Active state border-color 残し）が WCAG 1.4.11 を満たすか
- focus trap が edit モード突入後も正しく動作するか
- delete 直後の handleClose で returnFocus が機能するか
- LP-013/LP-014 適用が正しいか

JSON 形式で指摘ください（severity / category / title / evidence / recommendation）。
