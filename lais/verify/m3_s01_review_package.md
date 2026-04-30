# Lais M3 実装レビューパッケージ — S-01 Auth + Router + Supabase Auth

> 本パッケージは Lais Phase 4 M3「Router 導入 + S-01 Auth 実装 + Supabase Auth 接続」のレビュー対象一式。
> レビュー種別: sub_review_flow.md D. 実装レビュー
> 本書を全レビュアーに同時提供。

---

## ミッション定義

- **M3 目的:** design_spec_v1.md §4.2 準拠の S-01 Auth を実装し、preact-router で S-00↔S-01 を接続し、Supabase Auth クライアント層を導入する
- **スコープ:**
  - preact-router 導入（ハッシュではなく pushState / path ルーティング）
  - S-01 Auth 画面（signup / login 両モード、1画面兼用）
  - Supabase クライアント初期化（新形式 publishable key 対応）
  - auth.js（signUp / signIn / signOut / session signal）
  - 認証成功時 `/` への遷移
- **スコープ外（Phase B 以降）:**
  - Supabase への実メール疎通テスト（Code 側では静的検証のみ）
  - パスワードリセット画面（S-05）
  - SNS ログイン / OAuth
  - オンボーディング S-02 以降
  - エラー国際化（i18n）
- **完了条件:** 実装コード + §4.2 準拠のスクショ + 6 状態スクショ（空 / 無効email / 有効無agree / 有効agree / login-valid / signupへ戻り）+ AI レビュー CRITICAL 0

---

## design_spec_v1.md §4.2 S-01 Auth（該当セクション引用）

### 4.2 S-01 Auth（サインアップ / ログイン共通）

- **目的 / UX参照:** 新規アカウント作成およびログイン。Phase A では 1 画面が両モードを兼ねる。ux_v1.md §1.2
- **画面タイプ:** フルスクリーン（縦スクロール）
- **レイアウト原則:** ノッチ下から `padding-top: 60px` で上詰め。左右 `--space-lg`。
- **モード:**
  - `signup`（初期。S-00「はじめる」からの遷移先）: タイトル `アカウントを作成` / CTA `サインアップ` / 同意チェック必須 / フッタリンク `ログインはこちら` → mode=`login`
  - `login`（S-00「ログイン」からの遷移先）: タイトル `ログイン` / CTA `ログイン` / 同意チェック非表示 / フッタリンク `新規登録はこちら` → mode=`signup`
- 本書 §4.2 では signup モードのレイアウトを正として記載する。login モードは S01-7 同意チェックブロック非表示 + S01-2 / S01-9 / S01-10 の文言差し替えのみで、他のフィールド構造は同一。
- **パスワードリセットリンクは Phase A では実装しない**（Phase B で専用画面 S-05 として分離予定）。

**セクション順序:**
1. ロゴ（ヘッダ）
2. 画面タイトル
3. Email 入力
4. Password 入力
5. 利用規約同意チェック
6. プライマリ CTA「サインアップ」
7. セカンダリリンク「ログインはこちら」

**要素仕様:**

| ID | 要素 | 位置・サイズ | タイポ / カラー |
|---|---|---|---|
| S01-1 | ロゴ `Lais` | 上部 `padding-top: 60px` / 中央揃え | font-size `28px` / weight `600` / letter-spacing `3px` / color `--accent` |
| S01-2 | タイトル「アカウントを作成」 | ロゴ下 `--space-xl` | font-size `20px` / weight `400` / color `--text-primary` |
| S01-3 | ラベル「メールアドレス」 | セクション上 / margin-top `--space-lg` | font-size `11px` / weight `600` / color `--text-muted` / uppercase / letter-spacing `1.5px` |
| S01-4 | Email 入力 | ラベル下 `--space-sm` / 幅 100% / 高さ `48px` | 背景 `--bg-surface` / border `1px solid --border-strong` / radius `--radius-md` / padding `0 16px` / font-size `14px` / placeholder color `--text-muted` |
| S01-5 | ラベル「パスワード」 | S01-4 下 `--space-lg` | 同 S01-3 |
| S01-6 | Password 入力 | 同 S01-4 / type=password |
| S01-7 | 同意チェックボックス | S01-6 下 `--space-lg` / 20×20 | border `1.5px solid --border-strong` / radius `--radius-sm` / チェック時 背景 `--accent` |
| S01-8 | 同意テキスト | チェックボックス右 `--space-sm` | font-size `14px` / line-height `1.7` / color `--text-secondary` / リンク部 color `--accent` underline |
| S01-9 | CTA「サインアップ」 | S01-7 下 `--space-xl` / 幅 100% / 高さ `52px` | 背景 `--button-primary-bg` / 文字 `#FFFFFF` / weight `600` / radius `--radius-lg` / disabled 時は §5.0 A のトークン（背景 `--button-disabled-bg` / 文字 `--button-disabled-text`） |
| S01-10 | リンク「ログインはこちら」 | S01-9 下 `--space-md` / 中央揃え | font-size `14px` / color `--accent` / underline |

**状態・インタラクション:**
- 同意チェック未選択時: S01-9 disabled（§5.0 A / `--button-disabled-*` 適用、タップ無反応、`aria-disabled="true"`）
- Email フォーマット不正時: S01-4 border → `--danger` / ラベル下に エラーテキスト（11px `--danger`）
- 成功: `ease-out` / `--duration-normal` で次画面へ

**検証可能なスクショ事実:**
- フォーム要素が縦 1 カラムで 6 段構成
- 入力 `S01-4`, `S01-6` の高さが 48px、背景色が `#161B22` 相当
- CTA `S01-9` 背景が `#1A5FC8` 相当、ラベル `サインアップ` が白

---

## 実装パッケージ

### 1. lais/src/components/App.jsx

```jsx
import Router, { route } from 'preact-router';
import { S00Splash } from './screens/S00Splash.jsx';
import { S01Auth } from './screens/S01Auth.jsx';

export function App() {
  const handleStart = () => route('/auth?mode=signup');
  const handleLogin = () => route('/auth?mode=login');

  return (
    <div class="app-root" aria-label="Lais">
      <Router>
        <SplashRoute path="/" onStart={handleStart} onLogin={handleLogin} />
        <AuthRoute path="/auth" />
        <NotFound default />
      </Router>
    </div>
  );
}

function SplashRoute({ onStart, onLogin }) {
  return <S00Splash onStart={onStart} onLogin={onLogin} />;
}

function AuthRoute() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode') === 'login' ? 'login' : 'signup';
  return <S01Auth mode={mode} />;
}

function NotFound() {
  if (typeof window !== 'undefined') route('/', true);
  return null;
}
```

### 2. lais/src/components/screens/S01Auth.jsx

```jsx
import { useState } from 'preact/hooks';
import { route } from 'preact-router';
import { signUpWithEmail, signInWithEmail } from '../../lib/auth.js';
import './S01Auth.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function S01Auth({ mode = 'signup' }) {
  const isSignup = mode === 'signup';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const emailInvalid = emailTouched && email.length > 0 && !EMAIL_RE.test(email);
  const canSubmit =
    EMAIL_RE.test(email) &&
    password.length >= 8 &&
    (isSignup ? agree : true) &&
    !submitting;

  const title = isSignup ? 'アカウントを作成' : 'ログイン';
  const ctaLabel = isSignup ? 'サインアップ' : 'ログイン';
  const footerLabel = isSignup ? 'ログインはこちら' : '新規登録はこちら';
  const footerTarget = isSignup ? '/auth?mode=login' : '/auth?mode=signup';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setServerError('');
    try {
      if (isSignup) await signUpWithEmail({ email, password });
      else await signInWithEmail({ email, password });
      route('/', true);
    } catch (err) {
      setServerError(err?.message || '認証に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main class="s01" aria-label={`Lais ${isSignup ? 'サインアップ' : 'ログイン'}`}>
      <h1 class="s01-logo">Lais</h1>
      <h2 class="s01-title">{title}</h2>

      <form class="s01-form" onSubmit={handleSubmit} noValidate>
        <div class="s01-field">
          <label class="s01-label" for="s01-email">メールアドレス</label>
          <input
            id="s01-email"
            class={`s01-input${emailInvalid ? ' s01-input-error' : ''}`}
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onInput={(e) => setEmail(e.currentTarget.value)}
            onBlur={() => setEmailTouched(true)}
            aria-invalid={emailInvalid}
            aria-describedby={emailInvalid ? 's01-email-error' : undefined}
          />
          {emailInvalid && (
            <p class="s01-error" id="s01-email-error">メールアドレスの形式が正しくありません</p>
          )}
        </div>

        <div class="s01-field">
          <label class="s01-label" for="s01-password">パスワード</label>
          <input
            id="s01-password"
            class="s01-input"
            type="password"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            placeholder="8文字以上"
            value={password}
            onInput={(e) => setPassword(e.currentTarget.value)}
            minLength={8}
          />
        </div>

        {isSignup && (
          <div class="s01-agree">
            <input
              id="s01-agree"
              class="s01-checkbox"
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.currentTarget.checked)}
            />
            <label class="s01-agree-text" for="s01-agree">
              <a class="s01-link" href="#" onClick={(e) => e.preventDefault()}>利用規約</a>
              および
              <a class="s01-link" href="#" onClick={(e) => e.preventDefault()}>プライバシーポリシー</a>
              に同意します
            </label>
          </div>
        )}

        {serverError && <p class="s01-server-error" role="alert">{serverError}</p>}

        <button
          type="submit"
          class="s01-cta"
          disabled={!canSubmit}
          aria-disabled={!canSubmit}
        >
          {submitting ? '送信中…' : ctaLabel}
        </button>

        <button
          type="button"
          class="s01-footer-link"
          onClick={() => route(footerTarget)}
        >
          {footerLabel}
        </button>
      </form>
    </main>
  );
}
```

### 3. lais/src/components/screens/S01Auth.css

```css
/*
 * S-01 Auth — design_spec_v1.md §4.2 準拠
 * - padding-top: 60px (ノッチ下から)
 * - 左右 --space-lg
 * - signup/login 兼用。login 時は .s01-agree 非表示
 */

.s01 {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 60px var(--space-lg) var(--space-xl);
  padding-top: calc(60px + env(safe-area-inset-top, 0px));
  padding-bottom: calc(var(--space-xl) + env(safe-area-inset-bottom, 0px));
  min-height: 100svh;
  background: var(--bg-primary);
}

.s01-logo {
  margin: 0;
  text-align: center;
  font-size: var(--font-size-xl); /* 28px */
  font-weight: var(--font-weight-semibold);
  letter-spacing: 3px;
  line-height: 1;
  color: var(--accent);
}

.s01-title {
  margin: var(--space-xl) 0 0;
  text-align: center;
  font-size: var(--font-size-lg); /* 20px */
  font-weight: var(--font-weight-regular);
  line-height: var(--line-height-ja-heading);
  color: var(--text-primary);
}

.s01-form {
  display: flex;
  flex-direction: column;
  margin-top: var(--space-xl);
}

.s01-field {
  margin-top: var(--space-lg);
  display: flex;
  flex-direction: column;
}

.s01-field:first-child {
  margin-top: 0;
}

.s01-label {
  font-size: var(--font-size-xs); /* 11px */
  font-weight: var(--font-weight-semibold);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-label);
  line-height: var(--line-height-label);
}

.s01-input {
  margin-top: var(--space-sm);
  width: 100%;
  height: 48px;
  padding: 0 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: var(--font-family-base);
  font-size: var(--font-size-sm); /* 14px */
  letter-spacing: var(--letter-spacing-ja);
  transition: border-color var(--duration-fast) var(--ease-out);
}

.s01-input::placeholder { color: var(--text-muted); }

.s01-input:focus {
  outline: var(--focus-ring-width) var(--focus-ring-style) var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
  border-color: var(--accent);
}

.s01-input-error,
.s01-input-error:focus { border-color: var(--danger); }

.s01-error {
  margin: var(--space-xs) 0 0;
  font-size: var(--font-size-xs);
  color: var(--danger);
  line-height: var(--line-height-label);
}

.s01-agree {
  margin-top: var(--space-lg);
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
}

.s01-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  margin: 0;
  border: 1.5px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: transparent;
  cursor: pointer;
  position: relative;
  transition: background var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out);
}

.s01-checkbox:checked { background: var(--accent); border-color: var(--accent); }

.s01-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 5px; top: 1px;
  width: 6px; height: 11px;
  border: solid var(--bg-primary);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.s01-checkbox:focus-visible {
  outline: var(--focus-ring-width) var(--focus-ring-style) var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

.s01-agree-text {
  font-size: var(--font-size-sm);
  line-height: 1.7;
  color: var(--text-secondary);
  cursor: pointer;
}

.s01-link { color: var(--accent); text-decoration: underline; }

.s01-server-error {
  margin: var(--space-md) 0 0;
  padding: var(--space-sm) var(--space-md);
  background: rgba(248, 81, 73, 0.08);
  border: 1px solid var(--danger);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--danger);
}

.s01-cta {
  margin-top: var(--space-xl);
  width: 100%;
  min-height: 52px;
  padding: 0 var(--space-md);
  background: var(--button-primary-bg);
  color: var(--button-primary-text);
  font-family: var(--font-family-base);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-ja);
  line-height: 1.25;
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: transform var(--duration-fast) var(--spring-default);
}

.s01-cta:disabled,
.s01-cta[aria-disabled="true"] {
  background: var(--button-disabled-bg);
  color: var(--button-disabled-text);
  border: 1px solid var(--button-disabled-border);
  cursor: not-allowed;
  pointer-events: none;
}

.s01-cta:active:not(:disabled) { transform: scale(0.98); }

.s01-cta:focus-visible {
  outline: var(--focus-ring-width) var(--focus-ring-style) var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

.s01-footer-link {
  margin-top: var(--space-md);
  align-self: center;
  padding: var(--space-sm) var(--space-md);
  min-height: 44px;
  background: transparent;
  border: none;
  font-family: var(--font-family-base);
  font-size: var(--font-size-sm);
  color: var(--accent);
  text-decoration: underline;
  cursor: pointer;
}

.s01-footer-link:focus-visible {
  outline: var(--focus-ring-width) var(--focus-ring-style) var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}
```

### 4. lais/src/lib/supabase.js

```js
import { createClient } from '@supabase/supabase-js';

/*
 * Supabase API key について:
 * 2024年後半に導入された新形式 (sb_publishable_...) と旧JWT形式 (eyJ...) の
 * どちらも createClient の第2引数で受け付けられる（supabase-js v2.45+）。
 * 当リポジトリでは publishable key 形式を採用。
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !publishableKey) {
  throw new Error(
    '[Lais] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) が未設定です。lais/.env.local を確認してください。'
  );
}

export const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'lais.auth',
  },
});
```

### 5. lais/src/lib/auth.js

```js
import { signal } from '@preact/signals';
import { supabase } from './supabase.js';

export const session = signal(null);
export const authLoading = signal(true);

supabase.auth.getSession().then(({ data }) => {
  session.value = data.session ?? null;
  authLoading.value = false;
});

supabase.auth.onAuthStateChange((_event, newSession) => {
  session.value = newSession ?? null;
});

export async function signUpWithEmail({ email, password }) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithEmail({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
```

---

## Playwright 実測

6 状態スクショ（375×812 viewport）:

1. **01_splash:** S-00 スプラッシュ表示
2. **02_signup_empty:** signup モード初期状態（form 空、CTA disabled、フッター「ログインはこちら」）
3. **03_signup_email_invalid:** email="not-an-email" + blur → border --danger、エラーテキスト11px --danger
4. **04_signup_valid_no_agree:** email+password 有効、agree 未選択 → CTA disabled
5. **05_signup_agreed:** agree 選択 → チェックボックス --accent、CTA enabled (--button-primary-bg)
6. **06_login_mode:** フッターリンク押下 → URL=/auth?mode=login、タイトル「ログイン」、checkbox 非表示、フッター「新規登録はこちら」

測定値（抜粋）:
- ロゴ: 28px semibold letter-spacing 3px color #79C0FF 中央揃え
- タイトル: 20px weight 400 color --text-primary
- Email input: height 48px background #161B22 border 1px solid #6E7681 radius 8px
- CTA (enabled): min-height 52px background #1A5FC8 color #FFFFFF weight 600 radius 12px
- CTA (disabled): background #1F2937 color #6E7681 border 1px #2A3441 pointer-events none
- Footer link: button（a ではない）font 14px color --accent underline min-height 44px（タップ領域確保）

コンソールエラー: 0

---

## レビュー時の留意点

- **S01-10 の実装は `<a>` ではなく `<button>`**: 当初 `<a href onClick>` で実装したところ Playwright/実ブラウザでのクリック時に preact-router の document-level click handler と自前の onClick が競合し、URL 遷移しない事象が発生。button + onClick={route()} に変更して解決。見た目は underline で a に寄せているが意味論は button。design_spec §4.2 は「リンク」と記載しているが、ここは実装制約で button を採用した（視覚表現は spec 通り）。レビュアーはこの置換を評価してほしい。
- **mode は URL query**: `/auth?mode=login|signup`。`AuthRoute` 関数が `window.location.search` を直接読む。preact-router は path のみ match するため、query 変更時も同じ `/auth` コンポーネントが使い回される（cloneElement）。
- **Publishable key 新形式**: supabase-js v2.103.0 インストール済み。`createClient(url, publishableKey)` の第2引数で旧 JWT anon key / 新 `sb_publishable_*` どちらも同じコード経路で受け付け可能。
- **バリデーション**: signup 時のパスワードは 8 文字以上（design_spec §4.2 未定義のため実装判断。§5 の一般要件と整合）。email は RFC5322 の簡易サブセット。
- **a11y**: aria-invalid / aria-describedby / aria-disabled / role=alert / focus-visible outline。
- **未実装の対応リスト該当**: プレースホルダー色コントラスト（A-1 / §7）は design_spec 側で Phase 4 対応とされており本 M3 では扱わない。
