import { useEffect, useRef, useState } from 'preact/hooks';
import { route } from 'preact-router';
import { updateProfile } from '../../lib/db.js';
import './S02Onboarding.css';

/*
 * S-02 Onboarding（アバター選択ステップ）
 * design_spec_v1.md §4.3 準拠
 *
 * スコープ: 5 ステップのうちステップ 2（アバター選択）のみ実装。
 * 他ステップ（名前 / 興味 / 初回ゴール / テーマ）は ADV 別紙待ち。
 *
 * Learned Patterns 適用:
 * - LP-001: アバタータップの spring アニメーション / 背景スケールは
 *   `prefers-reduced-motion: reduce` 下で無効化（CSS 側 + JS タイマー側双方）
 * - LP-002: マウント時に <main> へ focus 移動。SPA 遷移直後でも
 *   スクリーンリーダーに画面変化を通知する
 * - LP-011: 全数値は design_system.md のトークン参照。魔法の数字禁止
 *
 * アバター SVG は仮実装（ADV 別紙で最終決定予定）。3 つの抽象形で差別化。
 */

const TOTAL_STEPS = 5;
const CURRENT_STEP_INDEX = 1; // 0-based. ステップ 2 = index 1（2 本塗り）

const AVATARS = [
  {
    id: 'lumen',
    label: 'Lumen',
    description: '静かな朝の光',
    svg: (
      <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <circle cx="50" cy="50" r="32" fill="var(--accent)" opacity="0.18" />
        <circle cx="50" cy="50" r="18" fill="var(--accent)" />
      </svg>
    ),
  },
  {
    id: 'noct',
    label: 'Noct',
    description: '月夜の静けさ',
    svg: (
      <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <path
          d="M 62 28 A 28 28 0 1 0 72 68 A 22 22 0 1 1 62 28 Z"
          fill="var(--accent)"
        />
      </svg>
    ),
  },
  {
    id: 'spark',
    label: 'Spark',
    description: '軽やかな風',
    svg: (
      <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <polygon
          points="50,20 58,42 82,46 62,60 70,84 50,70 30,84 38,60 18,46 42,42"
          fill="var(--accent)"
        />
      </svg>
    ),
  },
];

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function S02Onboarding() {
  const [selectedId, setSelectedId] = useState(null);
  // キータップ/クリック直後の spring アニメーション対象 id を 350ms 保持
  const [tappingId, setTappingId] = useState(null);
  const mainRef = useRef(null);
  const tapTimerRef = useRef(null);
  const mountedRef = useRef(true);

  // LP-002: マウント直後に <main> へ focus 移動（SPA 遷移後のフォーカス管理）
  useEffect(() => {
    mountedRef.current = true;
    if (mainRef.current) {
      mainRef.current.focus({ preventScroll: false });
    }
    return () => {
      mountedRef.current = false;
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    };
  }, []);

  const handleSelect = (id) => {
    setSelectedId(id);

    // LP-001: reduced-motion 時は spring アニメーションをスキップ
    if (prefersReducedMotion()) {
      return;
    }

    setTappingId(id);
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    // spring duration 350ms + 余裕 50ms（§4.3 `spring-default / 350ms`）
    tapTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setTappingId(null);
    }, 400);
  };

  const handleBack = () => {
    // §4.3「戻る: ease-out / 350ms で 1 ステップ戻る」
    // 現状はステップ 2 のみ実装のため、ステップ 1 が未実装ならトップへフォールバック
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
      return;
    }
    route('/', true);
  };

  const handleNext = async () => {
    if (!selectedId) return;
    // LAIS-PHASE-A-REAL-COMPLETION: パートナー選択を Supabase users.ai_memo の
    // Lais プロフィール JSON に保存する。失敗してもフロー継続（後で再試行可能）。
    try {
      await updateProfile({ partner_avatar: selectedId });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[S02] updateProfile failed:', err && err.message);
    }
    route('/grow', true);
  };

  const canProceed = selectedId !== null;

  return (
    <main
      id="main-content"
      ref={mainRef}
      tabIndex={-1}
      class="s02-onboarding"
      aria-labelledby="s02-title"
    >
      {/* S02-1: 戻るボタン */}
      <div class="s02-nav">
        <button
          type="button"
          class="s02-back"
          onClick={handleBack}
          aria-label="前のステップに戻る"
        >
          <svg
            viewBox="0 0 20 20"
            width="20"
            height="20"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M 13 4 L 7 10 L 13 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* S02-2: 進捗バー */}
      <div
        class="s02-progress"
        role="progressbar"
        aria-valuenow={CURRENT_STEP_INDEX + 1}
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
        aria-valuetext={`${CURRENT_STEP_INDEX + 1} / ${TOTAL_STEPS} 完了`}
        aria-label="オンボーディング進捗"
      >
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <span
            key={i}
            class={
              's02-progress-bar ' +
              (i <= CURRENT_STEP_INDEX ? 's02-progress-bar-done' : '')
            }
            aria-hidden="true"
          />
        ))}
      </div>
      {/* R-002 a11y fix (WCAG 1.4.1): 色だけでなくテキストでも進捗を明示 */}
      <p class="s02-progress-label" aria-hidden="true">
        {CURRENT_STEP_INDEX + 1} / {TOTAL_STEPS}
      </p>

      {/* S02-3: タイトル */}
      <h1 id="s02-title" class="s02-title">
        最初のパートナーを選びましょう
      </h1>

      {/* S02-4: 補助テキスト */}
      <p class="s02-subtitle">一緒に成長するアバターです</p>

      {/* S02-5: アバター選択肢 */}
      <div
        class="s02-avatars"
        role="radiogroup"
        aria-labelledby="s02-title"
      >
        {AVATARS.map((a) => {
          const selected = selectedId === a.id;
          const tapping = tappingId === a.id;
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${a.label} — ${a.description}`}
              class={
                's02-avatar ' +
                (selected ? 's02-avatar-selected ' : '') +
                (tapping ? 's02-avatar-tapping' : '')
              }
              onClick={() => handleSelect(a.id)}
            >
              <span class="s02-avatar-inner">{a.svg}</span>
            </button>
          );
        })}
      </div>

      {/* S02-6: 「次へ」CTA */}
      <button
        type="button"
        class="s02-next"
        onClick={handleNext}
        disabled={!canProceed}
        aria-disabled={!canProceed}
      >
        次へ
      </button>
    </main>
  );
}

export default S02Onboarding;
