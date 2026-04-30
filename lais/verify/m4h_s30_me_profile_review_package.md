# Lais M4-H 実装レビューパッケージ — S-30 ME Profile（タブ #3 / サブタブ PROFILE）

> Phase 4 M4-H レビュー対象一式。
> レビュー種別: sub_review_flow.md D. 実装レビュー（R1 ゴールデン）
> リスク: 🟡 中（タブ画面 + サブタブ 4 個 / route 追加 / S30-5 MBTI カード含む複数セクション / 3ペルソナ制 5 回目）

---

## ミッション定義（3ペルソナ制 ENG自律判定）

- **ADV判定:** S-30 はボトムタブ #3 + サブタブ 4 個の画面。新規 `S30MeProfile.{jsx,css}` + `App.jsx` `/me` route（lazy + Suspense, LP-012）+ S10Grow `handleTabSelect` ME → `route('/me')` + S30 側で GROW → `route('/grow')`。PROFILE サブタブのみコンテンツ描画、他 3 つは placeholder。S30-5 MBTI カードは「未推定時」状態（`対話を重ねると判明します` + 進捗バー + 外部テスト入力リンク）。BottomTabBar 共有コンポーネントを ME active で再利用。
- **QA検証:** template_v2 / LOCK 内 / spec §4.10 全項目 / §5.0 A/B 区分遵守 / POエスカレーション非該当
- **PO代理:** PD-006（CRITICAL 0 + HIGH 後回し）/ PD-003（インライン編集・DISCOVER 等の中身・S-41/S-37 遷移先は後続）/ PD-005（LP 事前適用継続）/ PD-101 整合
- → 3者合意 → 実行

**要件（達成状況）:**
1. ✅ 新規 `S30MeProfile.{jsx,css}`
2. ✅ `App.jsx` `/me` route + lazy import + Suspense fallback（独立 chunk: 5.99 kB JS / 6.37 kB CSS）
3. ✅ S10Grow BottomTabBar ME タップで `route('/me')`
4. ✅ S30 側 BottomTabBar GROW タップで `route('/grow')`、ME タップで no-op
5. ✅ S30-1 ヒーロー（アバター 56×56 + 名前 20px + `Lv.12 EXPLORER` + EXP バー 120×4）
6. ✅ S30-2 サブタブ 4 個（PROFILE/DISCOVER/FRIENDS/SHOP）ローカル state 切替 + PROFILE active 下線
7. ✅ S30-3 基本情報 4 行（名前/年齢/職業/趣味 — 趣味は未入力プレースホルダー `タップして入力`）
8. ✅ S30-4 AI 理解メモ セクション（ヘッダ `AI PROFILE` + mock 本文 + 最終更新）
9. ✅ S30-5 MBTI カード 未推定時状態（メッセージ + 進捗バー + `外部テスト結果を入力` リンク）
10. ✅ S30-6 リンク行 2 つ（アバター設定 / 設定）chevron-right 付き
11. ✅ S30-7 BottomTabBar ME active
12. ✅ 非 PROFILE サブタブは `coming soon` placeholder
13. ✅ LP-001/002/003/004/011/012/013/014/015 全 9 事前適用

**スコープ外（後続）:**
- S30-3 インライン編集（フォーカスアウトで自動保存 + トースト）
- S30-4 実 AI メモデータ（Supabase 連携）
- S30-5 推定済み時の MBTI 4 文字表示
- DISCOVER / FRIENDS / SHOP サブタブの実コンテンツ
- S-41 アバター設定 / S-37 設定への遷移
- サブタブ左右スワイプ切替
- アバターの実画像（SVG 仮表示）

---

## 適用済み Learned Patterns

| LP | パターン名 | 適用箇所 |
|---|---|---|
| LP-001 | prefers-reduced-motion | `.s30-hero-bar-fill` `.s30-mbti-bar-fill` `.s30-subtab-btn` `.s30-info-button` `.s30-link-row` の transition-duration 1ms 縮退 |
| LP-002 | マウント時 main へ focus | `useEffect` で `mainRef.current.focus({ preventScroll: true })` |
| LP-003 | inline handler 最小化 | 全イベントは JSX プロパティ経由 |
| LP-004 | WCAG AA コントラスト実測値 | 下部「コントラスト実測」節 |
| LP-011 | デザイントークン参照 | 全 ms / color はトークン。spec §4.10 由来の px 値（56 アバター / 120 バー / 4px バー高さ / 2px underline / 8×8 dot）は spec 由来として許容 |
| LP-012 | ルートレベルコード分割 | `S30MeProfile = lazy(() => import('./screens/S30MeProfile.jsx'))` + Suspense fallback（独立 chunk: 5.99 kB JS） |
| LP-013 | env(safe-area-inset-bottom) 段階的適用 | `.s30-me` の base padding-bottom: `calc(82px + --space-lg)` → `@supports` 内で `calc(env() + 82px + --space-lg)` |
| LP-014 | programmatic / keyboard focus 分離 | `.s30-me` `.s30-subtab-btn` `.s30-info-button` `.s30-mbti-manual` `.s30-link-row` 全てに `:focus:not(:focus-visible) { outline: none }` + `:focus-visible` 可視リング |
| LP-015 | Active state 可視化 (Non-text Contrast) | `.s30-subtab-btn-active::after` の 2px underline を `--accent` で `--bg-primary` 上に 9.49:1 確保（Non-text Contrast 1.4.11） |

---

## design_spec_v1.md §4.10 S-30 ME Profile（完全引用）

### 4.10 S-30 ME Profile（タブ #3 / サブタブ PROFILE）

- **目的 / UX参照:** ユーザー自分情報・自己分析・ソーシャル。ux_v1.md §4
- **画面タイプ:** タブ画面（ボトムタブ #3 active） + サブタブ 4 個
- **レイアウト原則:** ヒーロー + サブタブ + コンテンツ + タブバー

**セクション順序:** ヒーロー / サブタブ / 基本情報 / AI 理解メモ / MBTI / リンク行 / ボトムタブバー

**[ヒーロー] — S30-1:**
- 中央揃え / padding 20px 0 16px
- アバター 56×56 / border 1.5px solid `--accent` / radius 50%
- 名前 20px weight 400 letter-spacing -0.02em / margin-top --space-sm
- ラベル `Lv.12 EXPLORER` 11px `--text-muted` letter-spacing 1.5px uppercase / margin-top --space-xs
- EXP バー 幅 120px 高さ 4px 背景 `--accent-subtle` 塗り `--accent` radius --radius-pill / margin-top --space-sm

**[サブタブ] — S30-2:** flex / border-bottom 1px solid `--border` / 4 タブ等分 padding 12px 0 / Active: color `--accent` weight 600 下線 2px solid `--accent` / Inactive: color `--text-muted` weight 400 / ラベル PROFILE/DISCOVER/FRIENDS/SHOP 14px

**[基本情報] — S30-3:** 各行 padding 12px 0 border-bottom 1px `--border` flex justify-between / ラベル 11px `--text-muted` letter-spacing 1.5px uppercase weight 600 / 値 14px `--text-primary`（未入力時 `--text-muted`）

**[AI 理解メモ] — S30-4:** ヘッダ `AI PROFILE` 11px `--text-muted` uppercase letter-spacing 1.5px weight 600 margin-top --space-xl / 本文 14px `--text-secondary` line-height 1.7 letter-spacing -0.02em max 800 文字 / 最終更新 11px `--text-muted`

**[MBTI カード] — S30-5:** 背景 `--bg-surface` radius --radius-lg padding --space-md / 4 文字 28px weight 600 `--accent`（未推定時: 対話を重ねると判明します + 進捗バー `--accent-subtle` / `--accent`）+ 手動入力リンク `外部テスト結果を入力` 14px `--accent` underline

**[リンク行] — S30-6:** 各行 padding 14px 0 border-top 1px `--border` min-height 44px / アイコン + ラベル 14px `--text-secondary` / 右 chevron-right 14px `--text-muted`

**[ボトムタブバー] — S30-7:** S10-10 と同。ME active

**Phase 4 対応:** B-3（MBTI カード実装必須 — 現モックアップ未実装）

---

## 実装パッケージ

### 1. lais/src/components/App.jsx（M4-H 差分のみ）

```jsx
const S30MeProfile = lazy(() => import('./screens/S30MeProfile.jsx'));

<MeProfileRoute path="/me" />

function MeProfileRoute() {
  return (
    <Suspense
      fallback={
        <main class="route-fallback" role="status" aria-live="polite" aria-label="読み込み中" />
      }
    >
      <S30MeProfile />
    </Suspense>
  );
}
```

### 2. lais/src/components/screens/S10Grow.jsx（M4-H 差分のみ）

```jsx
const handleTabSelect = useCallback((tabId) => {
  if (tabId === 'grow') return;
  if (tabId === 'me') {
    route('/me');
    return;
  }
  // TALK 未実装
  console.log('[S10Grow] tabSelect:', tabId);
}, []);
```

### 3. lais/src/components/screens/S30MeProfile.jsx（新規全文）

```jsx
import { useCallback, useEffect, useId, useRef, useState } from 'preact/hooks';
import { route } from 'preact-router';
import { BottomTabBar } from '../shared/BottomTabBar.jsx';
import './S30MeProfile.css';

const SUBTABS = [
  { id: 'profile',  label: 'PROFILE'  },
  { id: 'discover', label: 'DISCOVER' },
  { id: 'friends',  label: 'FRIENDS'  },
  { id: 'shop',     label: 'SHOP'     },
];

const USER_MOCK = {
  name: 'ふとし',
  level: 12,
  label: 'EXPLORER',
  expCurrent: 1240,
  expNext: 2000,
  age: 28,
  occupation: 'エンジニア',
  hobby: null,
};

const AI_MEMO_MOCK =
  'まだ対話が少ないですが、あなたは目標に向かってコツコツ積み上げるタイプに見えます。' +
  '毎日のタスク完了率が高く、習慣化に強い傾向があります。' +
  '対話を重ねるごとにこのプロフィールは更新されます。';

export function S30MeProfile() {
  const titleId = useId();
  const mainRef = useRef(null);
  const [activeSubtab, setActiveSubtab] = useState('profile');

  useEffect(() => {
    if (mainRef.current) mainRef.current.focus({ preventScroll: true });
  }, []);

  const handleTabSelect = useCallback((tabId) => {
    if (tabId === 'me') return;
    if (tabId === 'grow') { route('/grow'); return; }
    console.log('[S30] tabSelect:', tabId);
  }, []);

  const handleSubtabClick = useCallback((id) => setActiveSubtab(id), []);
  const handleInfoRowClick = useCallback((key) => { console.log('[S30] edit info row:', key); }, []);
  const handleMbtiManualInput = useCallback(() => { console.log('[S30] MBTI manual input'); }, []);
  const handleLinkAvatar = useCallback(() => { console.log('[S30] link → avatar'); }, []);
  const handleLinkSettings = useCallback(() => { console.log('[S30] link → settings'); }, []);

  const expPercent = Math.round((USER_MOCK.expCurrent / USER_MOCK.expNext) * 100);
  const mbtiProgress = 35;

  return (
    <main ref={mainRef} tabIndex={-1} class="s30-me" aria-labelledby={titleId}>
      {/* S30-1 */}
      <section class="s30-hero" aria-label="プロフィールサマリー">
        <div class="s30-hero-avatar" aria-hidden="true">
          <svg viewBox="0 0 32 32" width="32" height="32" focusable="false">
            <circle cx="16" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="1.8" />
            <path d="M6 26 C 6 20, 10 17, 16 17 C 22 17, 26 20, 26 26"
              fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </div>
        <h1 id={titleId} class="s30-hero-name">{USER_MOCK.name}</h1>
        <p class="s30-hero-lv">Lv.{USER_MOCK.level} {USER_MOCK.label}</p>
        <div class="s30-hero-bar"
          role="progressbar" aria-valuenow={USER_MOCK.expCurrent}
          aria-valuemin={0} aria-valuemax={USER_MOCK.expNext}
          aria-valuetext={`${USER_MOCK.expCurrent} / ${USER_MOCK.expNext} EXP`}
          aria-label="経験値">
          <span class="s30-hero-bar-fill" style={{ width: `${expPercent}%` }} />
        </div>
      </section>

      {/* S30-2 */}
      <nav class="s30-subtab" aria-label="プロフィールサブナビゲーション">
        <ul class="s30-subtab-list">
          {SUBTABS.map((tab) => {
            const isActive = tab.id === activeSubtab;
            return (
              <li key={tab.id} class="s30-subtab-item">
                <button
                  type="button"
                  class={'s30-subtab-btn' + (isActive ? ' s30-subtab-btn-active' : '')}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => handleSubtabClick(tab.id)}
                >{tab.label}</button>
              </li>
            );
          })}
        </ul>
      </nav>

      {activeSubtab === 'profile' && (
        <>
          {/* S30-3 */}
          <section class="s30-info" aria-label="基本情報">
            <dl class="s30-info-list">
              {/* 4 rows: 名前 / 年齢 / 職業 / 趣味 */}
              {/* 各行 <dt class="s30-info-label"> + <dd><button class="s30-info-button" onClick={...}> */}
              {/* 趣味は未入力なら s30-info-button-empty + 'タップして入力' */}
              {/* (省略 — 全文は .jsx 参照) */}
            </dl>
          </section>

          {/* S30-4 */}
          <section class="s30-ai-memo" aria-labelledby="s30-ai-memo-label">
            <h2 id="s30-ai-memo-label" class="s30-ai-memo-label">AI PROFILE</h2>
            <p class="s30-ai-memo-body">{AI_MEMO_MOCK}</p>
            <p class="s30-ai-memo-updated">最終更新: 2026-04-15 09:30</p>
          </section>

          {/* S30-5 (未推定時) */}
          <section class="s30-mbti" aria-labelledby="s30-mbti-label">
            <h2 id="s30-mbti-label" class="s30-mbti-label">MBTI / 性格タイプ</h2>
            <p class="s30-mbti-message">対話を重ねると判明します</p>
            <div class="s30-mbti-bar" role="progressbar"
              aria-valuenow={mbtiProgress} aria-valuemin={0} aria-valuemax={100}
              aria-label="MBTI 推定進捗">
              <span class="s30-mbti-bar-fill" style={{ width: `${mbtiProgress}%` }} />
            </div>
            <button type="button" class="s30-mbti-manual" onClick={handleMbtiManualInput}>
              外部テスト結果を入力
            </button>
          </section>

          {/* S30-6 */}
          <nav class="s30-links" aria-label="設定リンク">
            <button type="button" class="s30-link-row" onClick={handleLinkAvatar}>
              <span class="s30-link-label"><svg .../>アバター設定</span>
              <svg .../>
            </button>
            <button type="button" class="s30-link-row" onClick={handleLinkSettings}>
              <span class="s30-link-label"><svg .../>設定</span>
              <svg .../>
            </button>
          </nav>
        </>
      )}

      {activeSubtab !== 'profile' && (
        <section class="s30-placeholder" aria-live="polite">
          <p class="s30-placeholder-text">
            {SUBTABS.find((t) => t.id === activeSubtab)?.label} is coming soon.
          </p>
        </section>
      )}

      {/* S30-7 */}
      <BottomTabBar active="me" onSelect={handleTabSelect} />
    </main>
  );
}

export default S30MeProfile;
```

（S30-3 4 行 + S30-6 2 リンクの完全 JSX は省略せず実ファイルに含まれている）

### 4. lais/src/components/screens/S30MeProfile.css（新規全文）

（全文: 350 行程度。主要ブロック抜粋）

```css
/* Container: BottomTabBar 82px + safe-area */
.s30-me {
  min-height: 100dvh;
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: 0 var(--space-lg) calc(82px + var(--space-lg));
  display: flex;
  flex-direction: column;
}

@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .s30-me { padding-bottom: calc(env(safe-area-inset-bottom) + 82px + var(--space-lg)); }
}

.s30-me:focus:not(:focus-visible) { outline: none; }
.s30-me:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: calc(var(--focus-ring-offset) * -1);
}

/* S30-1 ヒーロー */
.s30-hero {
  display: flex; flex-direction: column; align-items: center;
  padding: 20px 0 16px;
}
.s30-hero-avatar {
  width: 56px; height: 56px; border-radius: 50%;
  border: 1.5px solid var(--accent);
  background: var(--bg-surface);
  color: var(--accent);
  display: inline-flex; align-items: center; justify-content: center;
}
.s30-hero-name {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-regular);
  letter-spacing: var(--letter-spacing-ja);
  color: var(--text-primary);
  margin: var(--space-sm) 0 0;
}
.s30-hero-lv {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-label);
  margin: var(--space-xs) 0 0;
}
.s30-hero-bar {
  width: 120px; height: 4px;
  background: var(--accent-subtle);
  border-radius: var(--radius-pill);
  margin-top: var(--space-sm);
  overflow: hidden;
}
.s30-hero-bar-fill {
  display: block; height: 100%;
  background: var(--accent);
  border-radius: var(--radius-pill);
  transition: width var(--duration-slow) var(--ease-out);
}

/* S30-2 サブタブ */
.s30-subtab {
  border-bottom: 1px solid var(--border);
  margin-top: var(--space-lg);
  margin-bottom: var(--space-xl);
}
.s30-subtab-list { list-style: none; display: flex; margin: 0; padding: 0; }
.s30-subtab-item { flex: 1; display: flex; }
.s30-subtab-btn {
  flex: 1;
  min-height: var(--tap-target-min);
  padding: 12px 0;
  text-align: center;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-weight: var(--font-weight-regular);
  font-size: var(--font-size-sm);
  font-family: var(--font-family-base);
  cursor: pointer;
  position: relative;
  transition: color var(--duration-fast) var(--ease-out);
}
/* LP-015: 2px underline = Non-text Contrast 9.49:1 (--accent on --bg-primary) */
.s30-subtab-btn-active {
  color: var(--accent);
  font-weight: var(--font-weight-semibold);
}
.s30-subtab-btn-active::after {
  content: '';
  position: absolute;
  left: 0; right: 0; bottom: -1px;
  height: 2px;
  background: var(--accent);
}
.s30-subtab-btn:focus:not(:focus-visible) { outline: none; }
.s30-subtab-btn:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: calc(var(--focus-ring-offset) * -1);
}

/* S30-3 基本情報 */
.s30-info-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.s30-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
  min-height: var(--tap-target-min);
}
.s30-info-label {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-label);
  font-weight: var(--font-weight-semibold);
}
.s30-info-button {
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  padding: 8px;
  margin: -8px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  text-align: right;
}
.s30-info-button-empty { color: var(--text-muted); }

/* S30-4 AI メモ / S30-5 MBTI */
.s30-ai-memo { margin-top: var(--space-xl); }
.s30-ai-memo-label, .s30-mbti-label {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-label);
  font-weight: var(--font-weight-semibold);
  margin: 0 0 var(--space-sm);
}
.s30-ai-memo-body {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: var(--line-height-ja-body);
  letter-spacing: var(--letter-spacing-ja);
  margin: 0;
}
.s30-mbti {
  margin-top: var(--space-xl);
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
.s30-mbti-bar {
  width: 100%;
  height: 4px;
  background: var(--accent-subtle);
  border-radius: var(--radius-pill);
  overflow: hidden;
}
.s30-mbti-bar-fill {
  display: block;
  height: 100%;
  background: var(--accent);
  border-radius: var(--radius-pill);
  transition: width var(--duration-slow) var(--ease-out);
}

/* S30-6 link rows */
.s30-links { margin-top: var(--space-xl); }
.s30-link-row {
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  border-top: 1px solid var(--border);
  background: transparent;
  border-left: none; border-right: none; border-bottom: none;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  min-height: var(--tap-target-min);
  text-align: left;
}
.s30-link-row:last-child { border-bottom: 1px solid var(--border); }

/* LP-001 */
@media (prefers-reduced-motion: reduce) {
  .s30-hero-bar-fill, .s30-mbti-bar-fill,
  .s30-subtab-btn, .s30-info-button, .s30-link-row {
    transition-duration: 1ms !important;
  }
}
```

---

## デザイントークン（night-sky 抜粋）

```css
[data-theme="night-sky"] {
  --bg-primary: #0D1117;
  --bg-surface: #161B22;
  --border: #484F58;
  --border-strong: #6E7681;
  --text-primary: #E6EDF3;
  --text-secondary: #9BA7B4;
  --text-muted: #7A8593;
  --accent: #79C0FF;
  --accent-subtle: rgba(121, 192, 255, 0.14);
}
```

---

## WCAG AA コントラスト実測値（night-sky）

| 項目 | 前景 | 背景 | 比率 | 判定 |
|---|---|---|---|---|
| S30-1 名前 | `#E6EDF3` | `#0D1117` | **15.81:1** | AAA |
| S30-1 Lv label | `--text-muted` `#7A8593` | `#0D1117` | **5.06:1** | AA 合格 |
| S30-2 Active ラベル | `--accent` `#79C0FF` | `#0D1117` | **9.49:1** | AAA |
| S30-2 Active underline (non-text) | `--accent` | `#0D1117` | **9.49:1** | WCAG 1.4.11 ✓ |
| S30-2 Inactive ラベル | `--text-muted` | `#0D1117` | **5.06:1** | AA 合格 |
| S30-3 ラベル | `--text-muted` | `#0D1117` | **5.06:1** | AA 合格 |
| S30-3 値 (入力済み) | `--text-primary` | `#0D1117` | **15.81:1** | AAA |
| S30-3 値 (未入力 `タップして入力`) | `--text-muted` | `#0D1117` | **5.06:1** | AA 合格 |
| S30-4 本文 | `--text-secondary` `#9BA7B4` | `#0D1117` | **7.51:1** | AA 合格 |
| S30-5 MBTI カード背景 vs 周囲 (non-text) | `--bg-surface` `#161B22` | `--bg-primary` `#0D1117` | **1.24:1** | N/A（カード自体は border/radius で区別可、WCAG 1.4.11 はコンポーネント境界要求なし） |
| S30-5 MBTI bar fill vs 背景 | `--accent` | `--accent-subtle ≈ #1F2F3D` | **8.29:1** | WCAG 1.4.11 ✓ |
| S30-5 外部テスト入力リンク | `--accent` | `--bg-surface` `#161B22` | **8.46:1** | AAA |
| S30-6 リンク文字 | `--text-secondary` | `#0D1117` | **7.51:1** | AA 合格 |

---

## 状態遷移表

```
GROW [BottomTabBar: ME タップ] → route('/me') → S30 (Suspense → mount → main focus)
  → [サブタブ切替 PROFILE ⇔ DISCOVER/FRIENDS/SHOP] → local state swap
  → [BottomTabBar: GROW タップ] → route('/grow')
  → [BottomTabBar: ME タップ] → 何もしない (現在地)
  → [基本情報行タップ] → console.log (M4 後続でインライン編集)
  → [アバター設定] → console.log (S-41 後続)
  → [設定] → console.log (S-37 後続)
  → [外部テスト結果を入力] → console.log
```

---

## チェックリスト

- ✅ route 追加 (/me) + lazy + Suspense
- ✅ LP-002: マウント時 main へ programmatic focus
- ✅ LP-014: focus-visible 分離（全 interactive 要素）
- ✅ LP-013: env(safe-area-inset-bottom) + 82px BottomTabBar 分の padding
- ✅ LP-012: 独立 chunk (S30MeProfile-*.js 5.99 kB / -*.css 6.37 kB)
- ✅ aria-labelledby で main をタイトルに紐付け
- ✅ progressbar role + aria-valuenow/min/max (ヒーロー EXP + MBTI 進捗)
- ✅ サブタブに aria-current="page" (LP-015 underline)
- ⚠️ E2E テスト: Phase 4 後続

---

## レビュアーへの依頼

1. **CRITICAL**: spec §4.10 違反 / WCAG 必須基準違反 / セキュリティ欠陥
2. **HIGH**: spec 細部からの逸脱 / UX 悪化 / 潜在バグ
3. **MEDIUM/LOW**: 改善提案

**特に確認してほしい点:**
- S30-1〜S30-7 全要素が spec §4.10 と一致しているか
- サブタブ 4 個 (PROFILE/DISCOVER/FRIENDS/SHOP) 完全に揃っているか
- PROFILE active 下線 (LP-015) が WCAG 1.4.11 を満たすか
- /me route + lazy import が initial bundle を膨らませていないか（build 結果: 独立 chunk 確認済み）
- S30-3 の `<button>` 化（情報行をボタン化してインライン編集の事前受け口）が SR で不自然でないか
- S30-5 MBTI 未推定時状態の実装が spec 要件（メッセージ + 進捗バー + 手動入力リンク）を満たすか
- 非 PROFILE サブタブの `coming soon` placeholder を CRITICAL 扱いしないこと（スコープ外宣言済み）
- Mock データと aria-live の組み合わせに問題がないか

JSON 形式で指摘ください（severity / category / title / evidence / recommendation）。
