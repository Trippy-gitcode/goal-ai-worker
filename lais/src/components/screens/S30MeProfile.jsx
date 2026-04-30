import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'preact/hooks';
import { route } from 'preact-router';
import { BottomTabBar } from '../shared/BottomTabBar.jsx';
import { ThemeSwitcher } from '../ThemeSwitcher.jsx';
import { getProfile, updateProfile } from '../../lib/db.js';
import './S30MeProfile.css';

/*
 * S-30 ME Profile（タブ #3 / サブタブ PROFILE）
 * design_spec_v1.md §4.10 準拠
 *
 * 本ミッション（M4-H）スコープ:
 * - S30-1〜S30-7 全要素描画
 * - サブタブ切替は local state のみ、PROFILE 以外は placeholder
 * - S30-5 MBTI カードは「未推定時」状態で描画
 * - S30-3 インライン編集・S30-4 実データ・S-41/S-37 遷移は後続
 *
 * Learned Patterns 事前適用:
 * - LP-001/002/003/004/011/012/013/014: M4-C/F と同パターン
 * - LP-015: サブタブ active 下線 + MBTI アクセント + EXP バー塗り で Non-text Contrast 確保
 */

const SUBTABS = [
  { id: 'profile',  label: 'PROFILE'  },
  { id: 'discover', label: 'DISCOVER' },
  { id: 'friends',  label: 'FRIENDS'  },
  { id: 'shop',     label: 'SHOP'     },
];

// プロフィールの DB 取得失敗時 / 未ログイン時のフォールバック表示用
const USER_FALLBACK = {
  name: 'あなた',
  level: 1,
  label: 'EXPLORER',
  expCurrent: 0,
  expNext: 1000,
  age: null,
  occupation: null,
  hobby: null,
};

/*
 * R2 spec fix R-004 (§4.10 S30-4):
 * 仕様「max 800 文字」を JS 側でも明示的に担保する。
 * CSS 側でも max-height + overflow で視覚的クランプ。
 */
const AI_MEMO_MAX_LENGTH = 800;
const AI_MEMO_MOCK_RAW =
  'まだ対話が少ないですが、あなたは目標に向かってコツコツ積み上げるタイプに見えます。' +
  '毎日のタスク完了率が高く、習慣化に強い傾向があります。' +
  '対話を重ねるごとにこのプロフィールは更新されます。';
const AI_MEMO_MOCK = AI_MEMO_MOCK_RAW.slice(0, AI_MEMO_MAX_LENGTH);

export function S30MeProfile() {
  const titleId = useId();
  const editLabelId = useId();
  const editInputId = useId();
  const mainRef = useRef(null);
  const editDialogRef = useRef(null);
  const editInputRef = useRef(null);
  const editTriggerRef = useRef(null); // 編集発動 button (戻り focus 用)
  const [activeSubtab, setActiveSubtab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  /*
   * Stage 7-4 prep (TASK-STAGE7-4-PREP-DEBT-CLEANUP-V1, 2026-04-29):
   * a11y HIGH/CRITICAL S4/E1 — 旧 native dialog API を撤廃しインライン編集モーダル化.
   * editingKey: 'name' | 'age' | 'occupation' | 'hobby' | null (=未編集)
   */
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editError, setEditError] = useState('');

  // LP-002: マウント時 main へ focus
  useEffect(() => {
    if (mainRef.current) mainRef.current.focus({ preventScroll: true });
  }, []);

  // プロフィール読込
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const p = await getProfile();
        if (!cancelled) setProfile(p);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'プロフィール取得失敗');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleTabSelect = useCallback((tabId) => {
    if (tabId === 'me') return; // 現在地
    if (tabId === 'grow') {
      route('/grow');
      return;
    }
    if (tabId === 'talk') {
      route('/talk');
      return;
    }
  }, []);

  const handleSubtabClick = useCallback((id) => {
    setActiveSubtab(id);
  }, []);

  /*
   * Stage 7-4 prep (TASK-STAGE7-4-PREP-DEBT-CLEANUP-V1, 2026-04-29):
   * a11y HIGH S4/E1 解消 — 旧 native dialog API 撤廃。
   * 編集はインラインモーダル (`<section role="dialog">`) で実施し、
   *   - `aria-labelledby` でラベル紐付け
   *   - `aria-describedby` でエラー紐付け
   *   - Escape で閉じる + 背景クリックで閉じる
   *   - submit (Enter) で保存、保存失敗は `role="alert"` 表示
   *   - 開く時に focus を input へ、閉じる時に元の trigger へ復帰
   */
  const FIELD_LABELS = useMemo(() => ({
    name: '名前',
    age: '年齢',
    occupation: '職業',
    hobby: '趣味',
  }), []);

  const handleInfoRowClick = useCallback((key, ev) => {
    if (!key) return;
    const current = profile && profile[
      key === 'name' ? 'display_name' : key
    ];
    editTriggerRef.current = ev?.currentTarget || null;
    setEditingKey(key);
    setEditValue(current != null ? String(current) : '');
    setEditError('');
  }, [profile]);

  const closeEditDialog = useCallback(() => {
    setEditingKey(null);
    setEditValue('');
    setEditError('');
    setTimeout(() => {
      if (editTriggerRef.current) editTriggerRef.current.focus();
      editTriggerRef.current = null;
    }, 0);
  }, []);

  const submitEditDialog = useCallback(async (ev) => {
    if (ev) ev.preventDefault();
    const key = editingKey;
    if (!key) return;
    const raw = (editValue || '').trim();
    const patch = {};
    if (key === 'name') {
      if (!raw) { setEditError('名前を入力してください'); return; }
      patch.display_name = raw;
    } else if (key === 'age') {
      const n = Number(raw);
      if (raw === '') {
        patch.age = null;
      } else if (!Number.isFinite(n) || n <= 0 || n > 150) {
        setEditError('正しい年齢を入力してください');
        return;
      } else {
        patch.age = n;
      }
    } else {
      patch[key] = raw || null;
    }
    try {
      const updated = await updateProfile(patch);
      setProfile(updated);
      closeEditDialog();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[S30] updateProfile failed:', err && err.message);
      setEditError(err?.message || '保存失敗');
    }
  }, [editingKey, editValue, closeEditDialog]);

  // 編集ダイアログ: マウント時に input へ focus
  useEffect(() => {
    if (!editingKey) return;
    const t = setTimeout(() => {
      if (editInputRef.current) editInputRef.current.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [editingKey]);

  // 編集ダイアログ: Escape で閉じる + Tab focus trap
  useEffect(() => {
    if (!editingKey) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeEditDialog();
      }
      if (e.key === 'Tab' && editDialogRef.current) {
        const focusables = editDialogRef.current.querySelectorAll(
          'button, input, [tabindex]:not([tabindex="-1"])'
        );
        const list = Array.from(focusables).filter((el) => !el.hasAttribute('disabled'));
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [editingKey, closeEditDialog]);

  const handleMbtiManualInput = useCallback(() => {
    // eslint-disable-next-line no-console
    console.log('[S30] MBTI manual input (後続)');
  }, []);

  const handleLinkAvatar = useCallback(() => {
    // eslint-disable-next-line no-console
    console.log('[S30] link → アバター設定 (S-41 後続)');
  }, []);

  const handleLinkSettings = useCallback(() => {
    // eslint-disable-next-line no-console
    console.log('[S30] link → 設定 (S-37 後続)');
  }, []);

  // 表示用 view（プロフィール未取得時は fallback）
  const view = {
    name: (profile && profile.display_name) || USER_FALLBACK.name,
    level: USER_FALLBACK.level,
    label: USER_FALLBACK.label,
    expCurrent: USER_FALLBACK.expCurrent,
    expNext: USER_FALLBACK.expNext,
    age: profile && profile.age != null ? profile.age : USER_FALLBACK.age,
    occupation:
      profile && profile.occupation != null ? profile.occupation : USER_FALLBACK.occupation,
    hobby: profile && profile.hobby != null ? profile.hobby : USER_FALLBACK.hobby,
  };
  const expPercent = Math.round((view.expCurrent / view.expNext) * 100);
  // MBTI 推定進捗（mock、対話数に応じた将来的な値）
  const mbtiProgress = 35;

  return (
    <main
      id="main-content"
      ref={mainRef}
      tabIndex={-1}
      class="s30-me"
      aria-labelledby={titleId}
    >
      {error && (
        <div role="alert" class="s30-load-error">
          {error}
        </div>
      )}

      {/* S30-1 ヒーロー */}
      <section class="s30-hero" aria-label="プロフィールサマリー">
        <div class="s30-hero-avatar" aria-hidden="true">
          {/* アバター仮表示 */}
          <svg viewBox="0 0 32 32" width="32" height="32" focusable="false">
            <circle cx="16" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="1.8" />
            <path
              d="M6 26 C 6 20, 10 17, 16 17 C 22 17, 26 20, 26 26"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
        </div>
        <h1 id={titleId} class="s30-hero-name">{view.name}</h1>
        <p class="s30-hero-lv">
          Lv.{view.level} {view.label}
        </p>
        <div
          class="s30-hero-bar"
          role="progressbar"
          aria-valuenow={view.expCurrent}
          aria-valuemin={0}
          aria-valuemax={view.expNext}
          aria-valuetext={`${view.expCurrent} / ${view.expNext} EXP`}
          aria-label="経験値"
        >
          <span
            class="s30-hero-bar-fill"
            style={{ width: `${expPercent}%` }}
          />
        </div>
      </section>

      {/* S30-2 サブタブ */}
      <nav class="s30-subtab" aria-label="プロフィールサブナビゲーション">
        <ul class="s30-subtab-list">
          {SUBTABS.map((tab) => {
            const isActive = tab.id === activeSubtab;
            return (
              <li key={tab.id} class="s30-subtab-item">
                <button
                  type="button"
                  class={
                    's30-subtab-btn' +
                    (isActive ? ' s30-subtab-btn-active' : '')
                  }
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => handleSubtabClick(tab.id)}
                >
                  {tab.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* サブタブ content */}
      {activeSubtab === 'profile' && (
        <>
          {/* S30-3 基本情報 */}
          <section class="s30-info" aria-label="基本情報">
            <dl class="s30-info-list">
              <div class="s30-info-row">
                <dt class="s30-info-label">名前</dt>
                <dd class="s30-info-value">
                  <button
                    type="button"
                    class="s30-info-button"
                    onClick={(ev) => handleInfoRowClick('name', ev)}
                    aria-label="名前を編集"
                    aria-haspopup="dialog"
                  >
                    {view.name}
                  </button>
                </dd>
              </div>
              <div class="s30-info-row">
                <dt class="s30-info-label">年齢</dt>
                <dd class="s30-info-value">
                  <button
                    type="button"
                    class="s30-info-button"
                    onClick={(ev) => handleInfoRowClick('age', ev)}
                    aria-label="年齢を編集"
                    aria-haspopup="dialog"
                  >
                    {view.age}
                  </button>
                </dd>
              </div>
              <div class="s30-info-row">
                <dt class="s30-info-label">職業</dt>
                <dd class="s30-info-value">
                  <button
                    type="button"
                    class="s30-info-button"
                    onClick={(ev) => handleInfoRowClick('occupation', ev)}
                    aria-label="職業を編集"
                    aria-haspopup="dialog"
                  >
                    {view.occupation}
                  </button>
                </dd>
              </div>
              <div class="s30-info-row">
                <dt class="s30-info-label">趣味</dt>
                <dd class="s30-info-value">
                  <button
                    type="button"
                    class={
                      's30-info-button' +
                      (view.hobby ? '' : ' s30-info-button-empty')
                    }
                    onClick={(ev) => handleInfoRowClick('hobby', ev)}
                    aria-label="趣味を編集"
                    aria-haspopup="dialog"
                  >
                    {view.hobby || 'タップして入力'}
                  </button>
                </dd>
              </div>
            </dl>
          </section>

          {/* S30-4 AI 理解メモ */}
          <section class="s30-ai-memo" aria-labelledby="s30-ai-memo-label">
            <h2 id="s30-ai-memo-label" class="s30-ai-memo-label">AI PROFILE</h2>
            <p class="s30-ai-memo-body">{AI_MEMO_MOCK}</p>
            <p class="s30-ai-memo-updated">最終更新: 2026-04-15 09:30</p>
          </section>

          {/*
            S30-5 MBTI カード (未推定時状態)
            LP-015: 進捗バー塗り (--accent) は background でも 3:1 以上確保
          */}
          <section class="s30-mbti" aria-labelledby="s30-mbti-label">
            <h2 id="s30-mbti-label" class="s30-mbti-label">MBTI / 性格タイプ</h2>
            <p class="s30-mbti-message">対話を重ねると判明します</p>
            <div
              class="s30-mbti-bar"
              role="progressbar"
              aria-valuenow={mbtiProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="MBTI 推定進捗"
            >
              <span
                class="s30-mbti-bar-fill"
                style={{ width: `${mbtiProgress}%` }}
              />
            </div>
            <button
              type="button"
              class="s30-mbti-manual"
              onClick={handleMbtiManualInput}
            >
              外部テスト結果を入力
            </button>
          </section>

          {/*
            Stage 7-1 (2026-04-27, STAGE7-1-THEME-FOUNDATION-IMPL-V1):
            S-30 Settings 内「テーマ選択」セクション
            ThemeSwitcher は ThemeProvider Context から theme/setTheme を取得し、
            4 ラジオ + ミニプレビューで切替を提供する。
          */}
          <ThemeSwitcher />

          {/* S30-6 リンク行 */}
          <nav class="s30-links" aria-label="設定リンク">
            <button
              type="button"
              class="s30-link-row"
              onClick={handleLinkAvatar}
            >
              <span class="s30-link-label">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" focusable="false">
                  <circle cx="7" cy="5" r="2.5" stroke="currentColor" stroke-width="1.3" />
                  <path d="M2 12 C 2 9, 4 8, 7 8 C 10 8, 12 9, 12 12" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round" />
                </svg>
                アバター設定
              </span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" focusable="false">
                <path d="M5 3 l4 4 l-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
              </svg>
            </button>
            <button
              type="button"
              class="s30-link-row"
              onClick={handleLinkSettings}
            >
              <span class="s30-link-label">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" focusable="false">
                  <circle cx="7" cy="7" r="2" stroke="currentColor" stroke-width="1.3" />
                  <path d="M7 1.5v1.5 M7 11v1.5 M1.5 7h1.5 M11 7h1.5 M3 3l1 1 M10 10l1 1 M10 4l1-1 M3 11l1-1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
                </svg>
                設定
              </span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" focusable="false">
                <path d="M5 3 l4 4 l-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
              </svg>
            </button>
          </nav>
        </>
      )}

      {/* DISCOVER / FRIENDS / SHOP は placeholder */}
      {activeSubtab !== 'profile' && (
        <section class="s30-placeholder" aria-live="polite">
          <p class="s30-placeholder-text">
            {SUBTABS.find((t) => t.id === activeSubtab)?.label} is coming soon.
          </p>
        </section>
      )}

      {/*
        Stage 7-4 prep — S30 編集モーダル (旧 native API 撤廃).
        S13TaskDetail の dialog パターンを準用 (Rule of three にて将来共通化候補).
      */}
      {editingKey && (
        <div
          class="s30-edit-overlay"
          role="presentation"
          onClick={(ev) => {
            if (ev.target === ev.currentTarget) closeEditDialog();
          }}
        >
          <section
            ref={editDialogRef}
            class="s30-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={editLabelId}
            aria-describedby={editError ? `${editLabelId}-err` : undefined}
          >
            <h2 id={editLabelId} class="s30-edit-label">{FIELD_LABELS[editingKey]} を編集</h2>
            <form class="s30-edit-form" onSubmit={submitEditDialog}>
              <label class="s30-edit-input-label" htmlFor={editInputId}>{FIELD_LABELS[editingKey]}</label>
              <input
                ref={editInputRef}
                id={editInputId}
                class="s30-edit-input"
                type={editingKey === 'age' ? 'number' : 'text'}
                inputMode={editingKey === 'age' ? 'numeric' : 'text'}
                min={editingKey === 'age' ? 0 : undefined}
                max={editingKey === 'age' ? 150 : undefined}
                value={editValue}
                onInput={(e) => setEditValue(e.currentTarget.value)}
                aria-invalid={editError ? 'true' : undefined}
                aria-describedby={editError ? `${editLabelId}-err` : undefined}
                autoComplete="off"
              />
              {editError && (
                <p id={`${editLabelId}-err`} role="alert" class="s30-edit-error">{editError}</p>
              )}
              <div class="s30-edit-actions">
                <button type="button" class="s30-edit-cancel" onClick={closeEditDialog}>
                  キャンセル
                </button>
                <button type="submit" class="s30-edit-submit">
                  保存
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* S30-7 BottomTabBar */}
      <BottomTabBar active="me" onSelect={handleTabSelect} />
    </main>
  );
}

export default S30MeProfile;
