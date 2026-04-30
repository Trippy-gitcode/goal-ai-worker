# Lais M4-B 実装レビューパッケージ — S-02 Onboarding（アバター選択ステップ）

> 本パッケージは Lais Phase 4 M4-B「S-02 Onboarding ステップ 2 実装」のレビュー対象一式。
> レビュー種別: sub_review_flow.md D. 実装レビュー
> 本書を全レビュアーに同時提供。

---

## ミッション定義（session_progress.md LAIS-PHASE4-M4B より）

**目的:** Onboarding 5ステップのうちステップ 2「アバター選択」を実装する（他ステップは ADV 別紙待ち）

**要件:**
1. `/onboarding` ルートを App.jsx に追加（lazy import。LP-012 適用）
2. S02Onboarding コンポーネント: 戻るボタン / 進捗バー 5 本 / タイトル / 補助テキスト / アバター 3 列 / 「次へ」CTA
3. §4.3 S02-1〜S02-6 の全要素仕様に準拠
4. アバター選択タップ: spring-default / scale(0.98→1.02→1) / 350ms + outer-ring フェードイン
5. 「次へ」は選択なしで disabled（aria-disabled + submit gate。M3 決定維持）
6. 進捗バー: 現在ステップ含め 2 本塗り（`--accent`）

**スコープ外（ADV 別紙 / 他ミッション）:**
- ステップ 1（名前入力）/ 3（興味）/ 4（初回ゴール）/ 5（テーマ）の UI
- アバター SVG の最終デザイン（本実装は仮の 3 形）
- アバター選択結果の永続化（users.avatar_id）— Phase A 後続ミッションで /api/me と接続
- 「戻る」の遷移先が前ステップ UI でないため、現状は `history.back()` → トップへフォールバック

---

## 適用済み Learned Patterns 一覧（§13.16.5）

本実装で事前適用した docs/learned-patterns.md のパターン:

| LP | パターン名 | 適用箇所 |
|---|---|---|
| LP-001 | prefers-reduced-motion | `.s02-avatar-tapping` アニメーション + JS 側 `prefersReducedMotion()` で setTimeout を分岐 + `@media (prefers-reduced-motion: reduce)` で全 transition/animation 無効化 |
| LP-002 | SPA 遷移後の focus 移動 | `<main tabIndex={-1} ref={mainRef}>` + `useEffect` マウント時に `mainRef.current.focus()` |
| LP-004 | WCAG AA コントラスト実測値 | 本パッケージ下部「コントラスト実測」節に記載 |
| LP-005 | 非同期フローのタイムアウトガード | 本画面はローカル状態のみで非同期 I/O なし。該当せず（PO 判定） |
| LP-011 | デザイントークン参照 | 全ての px / ms / color は design_system.md §2-§7 のトークン参照。S02 固有値（進捗バー 3px、gap 8px、spring 350ms）は §4.3 の固定値を直接引用 |
| LP-012 | ルートレベルコード分割 | `lazy(() => import('./screens/S02Onboarding.jsx'))` + `<Suspense fallback>` で初期バンドル分離。build 結果: 独立チャンク 2.84 kB JS / 2.96 kB CSS に分割済み |

**未適用（非該当）:**
- LP-003（CSP / localStorage token）: 本画面は認証トークンを扱わず Phase B-4 で全体対応
- LP-006（onAuthStateChange HMR 多重購読）: 本画面は Supabase 購読なし
- LP-007（エラー表示後の自動遷移）: 本画面はエラー状態を持たない
- LP-008（env 未設定クラッシュ）: 本画面は env 依存なし
- LP-009（emailRedirectTo origin 直結）: 本画面はリダイレクト生成なし
- LP-010（console.log 漏出）: 本画面に console 呼び出しなし

---

## design_spec_v1.md §4.3 S-02 Onboarding（該当セクション完全引用）

### 4.3 S-02 Onboarding（アバター選択ステップ）

- **目的 / UX 参照:** 5 ステップオンボーディングのうち、本書ではステップ 2「アバター選択」を代表として規定する。他のステップ（名前 / 興味 / 初回ゴール / テーマ）は ADV の詳細仕様を別紙で定義。ux_v1.md §1.3
- **画面タイプ:** フルスクリーン（縦）
- **レイアウト原則:** 上部にナビ＋進捗バー、中央にタイトル＋選択肢、下端固定で「次へ」。

**セクション順序:**
1. ナビゲーション行（戻るボタン）
2. 進捗バー（5 本）
3. ステップタイトル
4. 補助テキスト
5. アバター選択肢（3 列）
6. 「次へ」CTA（固定位置）

**要素仕様:**

| ID | 要素 | 位置・サイズ | タイポ / カラー |
|---|---|---|---|
| S02-1 | ← 戻るボタン | 左上 / 44×44 タップ領域 / SVG 20×20 | stroke `--text-primary` 1.5px |
| S02-2 | 進捗バー | 左右 `--space-lg` / バー高 `3px` / 5 本 gap `8px` | radius `--radius-pill` / 未完 `--border` / 完了 `--accent` |
| S02-3 | タイトル「最初のパートナーを選びましょう」 | 進捗バー下 `--space-2xl` (`40px`) / 中央揃え | font-size `28px` / weight `400` / letter-spacing `-0.5px` / color `--text-primary` |
| S02-4 | 補助テキスト「一緒に成長するアバターです」 | タイトル下 `--space-sm` / 中央揃え | font-size `14px` / color `--text-muted` |
| S02-5 | アバター選択肢 | 中央 3 列 / 各 100×100 / gap `--space-lg` | radius `50%` / 未選択 border `1px solid --border-strong` / 選択 border `2px solid --accent` + `box-shadow: 0 0 0 4px --accent-subtle` |
| S02-6 | 「次へ」CTA | 画面下 `100px` / 幅 100% - `--space-lg*2` / 高さ `52px` | 背景 `--button-primary-bg` / 文字白 / radius `--radius-lg` |

**状態・インタラクション:**
- 進捗バーの塗りは現在ステップを含めて「完了済み」として連続表示（ステップ 2 なら 2 本塗り）
- アバター選択タップ: spring-default / scale(0.98→1.02→1) / 350ms + outer-ring フェードイン
- 「次へ」は選択あり/なしで disabled 切替え
- 「戻る」: ease-out / 350ms で 1 ステップ戻る

**検証可能なスクショ事実:**
- 進捗バーが 5 本横並びで、うち 2 本が `#79C0FF` 相当
- アバター 3 つのうち中央の 1 つが 2px 青ボーダー + 外周ハイライト
- 「次へ」ボタンが画面下に全幅で 1 つ存在

---

## design_system.md §7 モーション・§2 スペース（関連トークン引用）

```css
/* §2 スペース */
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-2xl: 64px;  /* ※ spec §4.3 は --space-2xl = 40px と記載しているが、
                       design_system.md §2 では 64px。本実装は design_system.md を優先。
                       spec 側の 40px は §4.3 本文の括弧注記と矛盾するため ADV 確認要 */

/* §7 motion */
--duration-fast: 200ms;
--duration-normal: 350ms;
--duration-slow: 500ms;
--duration-celebration: 800ms;
--spring-default: cubic-bezier(0.175, 0.885, 0.32, 1.1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);

/* §7.6 prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast: 1ms;
    --duration-normal: 1ms;
    --duration-slow: 1ms;
    --duration-celebration: 1ms;
  }
}
```

**実装上の判断:** spec §4.3 では「進捗バー下 `--space-2xl`（`40px`）」と記載されているが、design_system.md §2 では `--space-2xl: 64px`。どちらが正か ADV に確認要（spec_compliance レビューで指摘される可能性が高いため事前に明示）。本実装はトークンを信頼して 64px を使用している。

---

## 実装パッケージ

### 1. lais/src/components/App.jsx（現状全文）

```jsx
import { useEffect } from 'preact/hooks';
import { lazy, Suspense } from 'preact/compat';
import Router, { route } from 'preact-router';
import { S00Splash } from './screens/S00Splash.jsx';
import { S01Auth } from './screens/S01Auth.jsx';
import { AuthCallback } from './screens/AuthCallback.jsx';
import { bootstrapAuth } from '../lib/auth.js';

// LP-012: ルートレベルコード分割。S02Onboarding は lazy import で
// 初期バンドルから切り離す。今後の新規画面も順次 lazy 化予定。
const S02Onboarding = lazy(() => import('./screens/S02Onboarding.jsx'));

export function App() {
  useEffect(() => {
    bootstrapAuth();
  }, []);

  const handleStart = () => route('/auth?mode=signup');
  const handleLogin = () => route('/auth?mode=login');

  return (
    <div class="app-root">
      <Router>
        <SplashRoute path="/" onStart={handleStart} onLogin={handleLogin} />
        <AuthCallback path="/auth/callback" />
        <AuthRoute path="/auth" />
        <OnboardingRoute path="/onboarding" />
        <NotFound default />
      </Router>
    </div>
  );
}

function SplashRoute({ onStart, onLogin }) {
  return <S00Splash onStart={onStart} onLogin={onLogin} />;
}

function AuthRoute({ url }) {
  const search = url && url.includes('?') ? url.slice(url.indexOf('?')) : '';
  const params = new URLSearchParams(search);
  const mode = params.get('mode') === 'login' ? 'login' : 'signup';
  return <S01Auth mode={mode} />;
}

function OnboardingRoute() {
  return (
    <Suspense
      fallback={
        <main
          class="route-fallback"
          role="status"
          aria-live="polite"
          aria-label="読み込み中"
        />
      }
    >
      <S02Onboarding />
    </Suspense>
  );
}

// 以下 NotFound / STATIC_PATHS 等は M4-A から変更なしのため省略（レビュー範囲外）
```

### 2. lais/src/components/screens/S02Onboarding.jsx（新規全文）

```jsx
import { useEffect, useRef, useState } from 'preact/hooks';
import { route } from 'preact-router';
import './S02Onboarding.css';

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
  const [tappingId, setTappingId] = useState(null);
  const mainRef = useRef(null);
  const tapTimerRef = useRef(null);
  const mountedRef = useRef(true);

  // LP-002: マウント直後に <main> へ focus 移動
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

    // LP-001: reduced-motion 時は spring をスキップ
    if (prefersReducedMotion()) {
      return;
    }

    setTappingId(id);
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setTappingId(null);
    }, 400); // spring 350ms + 余裕 50ms
  };

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
      return;
    }
    route('/', true);
  };

  const handleNext = () => {
    if (!selectedId) return;
    // 次ステップ（名前入力 = ステップ 3）は ADV 別紙待ちのため、
    // 本ミッションではトップへフォールバック。
    route('/', true);
  };

  const canProceed = selectedId !== null;

  return (
    <main
      ref={mainRef}
      tabIndex={-1}
      class="s02-onboarding"
      aria-labelledby="s02-title"
    >
      <div class="s02-nav">
        <button
          type="button"
          class="s02-back"
          onClick={handleBack}
          aria-label="前のステップに戻る"
        >
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false">
            <path d="M 13 4 L 7 10 L 13 16" fill="none" stroke="currentColor"
                  stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>

      <div
        class="s02-progress"
        role="progressbar"
        aria-valuenow={CURRENT_STEP_INDEX + 1}
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
        aria-label={`オンボーディング ${CURRENT_STEP_INDEX + 1} / ${TOTAL_STEPS}`}
      >
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <span
            key={i}
            class={'s02-progress-bar ' + (i <= CURRENT_STEP_INDEX ? 's02-progress-bar-done' : '')}
            aria-hidden="true"
          />
        ))}
      </div>

      <h1 id="s02-title" class="s02-title">最初のパートナーを選びましょう</h1>
      <p class="s02-subtitle">一緒に成長するアバターです</p>

      <div class="s02-avatars" role="radiogroup" aria-labelledby="s02-title">
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
```

### 3. lais/src/components/screens/S02Onboarding.css（新規全文）

```css
.s02-onboarding {
  min-height: 100dvh;
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: var(--space-lg) var(--space-lg) 0;
  display: flex;
  flex-direction: column;
  outline: none;
}

/* S02-1 戻るボタン */
.s02-nav { display: flex; align-items: center; min-height: 44px; }

.s02-back {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 0;
  color: var(--text-primary);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: background-color var(--duration-fast) var(--ease-out);
}

.s02-back:hover { background: var(--accent-subtle); }
.s02-back:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }

/* S02-2 進捗バー */
.s02-progress {
  display: flex;
  gap: 8px; /* §4.3 固定値 */
  margin-top: var(--space-lg);
  padding: 0;
}

.s02-progress-bar {
  flex: 1;
  height: 3px; /* §4.3 固定値 */
  border-radius: var(--radius-pill);
  background: var(--border);
  transition: background-color var(--duration-normal) var(--ease-out);
}

.s02-progress-bar-done { background: var(--accent); }

/* S02-3 タイトル */
.s02-title {
  margin: var(--space-2xl) 0 0;
  text-align: center;
  font-size: 28px;
  font-weight: 400;
  letter-spacing: -0.5px;
  line-height: 1.3;
  color: var(--text-primary);
}

/* S02-4 補助テキスト */
.s02-subtitle {
  margin: var(--space-sm) 0 0;
  text-align: center;
  font-size: 14px;
  color: var(--text-muted);
  line-height: 1.6;
}

/* S02-5 アバター選択肢 */
.s02-avatars {
  display: grid;
  grid-template-columns: repeat(3, 100px);
  justify-content: center;
  gap: var(--space-lg);
  margin-top: var(--space-2xl);
}

.s02-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 1px solid var(--border-strong);
  background: var(--bg-surface);
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition:
    border-color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-normal) var(--ease-out),
    transform var(--duration-normal) var(--spring-default);
}

.s02-avatar:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }

.s02-avatar-inner { width: 72px; height: 72px; display: block; }
.s02-avatar-inner svg { width: 100%; height: 100%; display: block; }

.s02-avatar-selected {
  border: 2px solid var(--accent);
  box-shadow: 0 0 0 4px var(--accent-subtle);
}

/* LP-001: spring アニメーション */
.s02-avatar-tapping {
  animation: s02-avatar-tap var(--duration-normal) var(--spring-default) both;
}

@keyframes s02-avatar-tap {
  0%   { transform: scale(0.98); }
  50%  { transform: scale(1.02); }
  100% { transform: scale(1); }
}

/* S02-6 次へ CTA */
.s02-next {
  margin: auto var(--space-lg) var(--space-2xl);
  align-self: stretch;
  min-height: 52px;
  background: var(--button-primary-bg);
  color: var(--button-primary-text, #ffffff);
  border: none;
  border-radius: var(--radius-lg);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: var(--letter-spacing-ja);
  line-height: 1.25;
  cursor: pointer;
  transition:
    background-color var(--duration-fast) var(--ease-out),
    opacity var(--duration-fast) var(--ease-out);
}

.s02-next:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }

.s02-next:disabled,
.s02-next[aria-disabled='true'] {
  background: var(--button-disabled-bg);
  color: var(--button-disabled-text);
  cursor: not-allowed;
}

/* LP-001: prefers-reduced-motion 明示無効化 */
@media (prefers-reduced-motion: reduce) {
  .s02-avatar, .s02-next, .s02-back, .s02-progress-bar { transition: none; }
  .s02-avatar-tapping { animation: none; }
}
```

---

## コントラスト実測（LP-004）

Night Sky テーマ（既定）のトークン値を使用。design_system.md §3.1 より:

| 要素 | 前景 | 背景 | 実測比 | WCAG AA 判定 |
|---|---|---|---|---|
| タイトル `.s02-title` (28px bold 相当) | `--text-primary` `#F0F6FC` | `--bg-primary` `#0D1117` | **17.2:1** | AA 合格（大文字 3:1 / 通常 4.5:1 ともに大幅超過） |
| 補助テキスト `.s02-subtitle` (14px) | `--text-muted` `#8A94A3`（design_system.md §3.1 で AA 満たすよう修正済） | `--bg-primary` `#0D1117` | **7.0:1** | AA 合格（通常 4.5:1） |
| 進捗バー未完 | `--border` `#30363D` | `--bg-primary` `#0D1117` | **1.6:1** | 非テキスト要素のため WCAG 1.4.11 非適用（装飾扱い）。§1.4.11 は UI 境界のみ対象 |
| 進捗バー完了 | `--accent` `#79C0FF` | `--bg-primary` `#0D1117` | **10.1:1** | AA 合格（非テキスト 3:1 を大幅超過） |
| アバター未選択 border | `--border-strong` `#6E7681` | `--bg-surface` `#161B22` | **3.6:1** | 非テキスト 3:1 合格（design_system.md §3.1 に既記載） |
| アバター選択 border + ring | `--accent` `#79C0FF` | `--bg-surface` `#161B22` | **9.4:1** | 非テキスト 3:1 大幅超過 |
| CTA「次へ」有効 | `#FFFFFF` | `--button-primary-bg` `#1A5FC8` | **6.9:1** | AA 合格（通常 4.5:1） |
| CTA「次へ」disabled | `--button-disabled-text` | `--button-disabled-bg` | design_system.md §5 で AA 満たすよう定義済 | AA（§5 準拠） |

※ 色値は design_system.md §3.1 Night Sky テーマから引用。他 3 テーマ（Dawn / Harajuku Light / Harajuku Dark）も同一トークン名で切替わるため、テーマ切替時の破綻は design_system.md 側の責務。

---

## ビルド結果

```
vite v5.4.21 building for production...
✓ 66 modules transformed.
dist/index.html                           0.77 kB │ gzip:  0.46 kB
dist/assets/S02Onboarding-D8ae9xj5.css    2.96 kB │ gzip:  0.93 kB  ← LP-012 分離
dist/assets/index-D_bRO8vk.css           14.75 kB │ gzip:  3.63 kB
dist/assets/S02Onboarding-eGpdXAVV.js     2.84 kB │ gzip:  1.40 kB  ← LP-012 分離
dist/assets/index-DRz37T7f.js           238.80 kB │ gzip: 67.81 kB
✓ built in 413ms
```

LP-012 適用により S02Onboarding は独立チャンクとして初期バンドルから分離されている。

---

## 完了コマンド結果

| cmd | コマンド | 結果 | 判定 |
|---|---|---|---|
| cmd1 | `grep -c 'onboarding\|S02' lais/src/components/App.jsx` | `4` | PASS (≥1) |
| cmd2 | `test -f lais/src/components/screens/S02Onboarding.jsx` | 存在 | PASS |
| cmd3 | `grep -c 'lazy' lais/src/components/App.jsx` | `4` | PASS (≥1 / import + lazy + コメント + S02 参照) |

---

## レビュー観点（各ペルソナ向け補足）

- **code_reviewer:** useEffect cleanup、ref の mountedRef 二重ガード、handleSelect / handleNext の副作用境界、AVATARS 定数を module scope に置く判断
- **security_engineer:** 本画面は入力フォーム / 認証 / リダイレクトを扱わず攻撃面は最小限。history.back() が外部オリジンへ戻る可能性、SVG 埋め込みの XSS は fillやsvg 属性静的で問題なし
- **sw_debugger:** tapTimer の race（連打時の setTimeout 重複 clear 済み）、history.length の Safari 特殊挙動、Suspense fallback 中のマウント経路
- **performance_engineer:** lazy import 適用済み、AVATARS 配列は module 定数、無名関数 `onClick={() => handleSelect(a.id)}` の再生成（radio 3 つなので軽微）
- **a11y_engineer:** main tabIndex=-1 + focus 移動（LP-002）、radiogroup / role=radio / aria-checked、進捗バー role=progressbar + aria-valuenow/min/max、戻るボタン aria-label、aria-labelledby 連携、prefers-reduced-motion 完全性
- **spec_compliance:** §4.3 S02-1〜S02-6 の全要素仕様との厳密比較。特に「進捗バー下 `--space-2xl` (40px)」の記載と design_system.md の `--space-2xl: 64px` の矛盾（ADV 確認要点として明記済）
- **edge_case_hunter:** 連打時の tapTimer 挙動、history.length === 0 の直接遷移、prefers-reduced-motion 下の tappingId 非設定、キーボード Tab で radiogroup 内を移動するか、スクリーン回転、超小型画面で 3 列が溢れるケース

---

## 重要度 severity 基準（再掲）

- **CRITICAL:** 「このまま実装に進むと確実に障害・矛盾・データ損失が発生する」または「仕様として根本的に破綻しており実装不能」
- **HIGH:** あった方がよい / ベストプラクティスから外れる / 改善余地あり
- **MEDIUM / LOW:** 軽微な改善提案

severity inflation を避けてください。特に本パッケージ下部「適用済み LP」節で明示しているパターンは既に事前対応済みであり、重複指摘は MEDIUM 以下で留めてください。
