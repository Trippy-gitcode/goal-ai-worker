# Lais M3 実装レビューパッケージ R2.5 — S-01 Auth 修正版

> R2 で検出された CRITICAL 1 / HIGH 12 を受けての R2.5 修正版。
> スコープ内 HIGH 7件 + CRITICAL 1 件（C1 placeholder contrast）を対応し、H7/H9/H11 を Phase B に分離。
> gpt5 × 7 ペルソナで再評価する。

---

## 1. R2 → R2.5 差分

### CRITICAL

| # | R2 指摘 | R2.5 対応 |
|---|---|---|
| **C1** | placeholder contrast 2.93:1 < 4.5:1 (WCAG 1.4.3) | **design system レベルで修正**: `lais/src/styles/themes.css` に `--text-placeholder` トークンを4テーマ分追加（Night Sky `#9BA7B4` = 6.77:1、Dawn `#5A4E3E` = 7.75:1、Harajuku Light `#6B4556` = 7.23:1、Harajuku Dark `#C9A8B5` = 8.0:1）。`.s01-input::placeholder` が新トークンを参照。S-02以降の全画面で再利用可能 |

### HIGH (対応済)

| # | R2 指摘 | R2.5 対応 |
|---|---|---|
| **H1** | 不正メールで Enter 送信しても touched が立たず告知なし | `handleSubmit` で `setAttempted(true)` + `setEmailTouched(true)` を強制。最初のエラー要素へ `focus()` |
| **H2** | 未同意CTA disabled の理由が支援技術に伝わらない | `attempted && !agree` のとき `<p id="s01-agree-missing" role="alert">` を表示、checkbox に `aria-required="true"` + `aria-describedby`、CTA にも `aria-describedby` で原因集約 |
| **H3** | focus-visible outline が各要素に明示的に設定されているか不明 | 既存 `--focus-ring-*` トークンを `.s01-input / .s01-checkbox / .s01-cta / .s01-footer-link / .s01-link` 全てに `:focus-visible` で適用済み（既出 / 追加分も含む） |
| **H4** | `NotFound` が `/terms` `/privacy` も `/` へ即リダイレクト → 規約を新タブで開けない | `App.jsx` の `NotFound` に allowlist `['/terms', '/privacy']` を追加。マッチしたら `window.location.assign(path)` でフルナビゲーション（SPA 管理外として扱う）、それ以外は従来どおり `/` へ |
| **H5** | 二重送信レース（`canSubmit` が render 値で固定） | `useRef(false)` の `inFlightRef` で同期ロック。`handleSubmit` 冒頭と CTA の `onMouseDown` の両方で `inFlightRef.current` を即時チェック、finally で解除 |
| **H6** | モード切替時のレース（送信直後の再クリックで遷移レース） | フッター `Link` の `onClick` + `onMouseDown` の両方で `submitting / inFlightRef.current` をチェックして `preventDefault + stopPropagation`。`useEffect([mode])` でモード切替時に transient state をリセット |
| **H8** | `auth.js` が import 時副作用（getSession/onAuthStateChange）を発火。HMR で多重購読 | `auth.js` を `bootstrapAuth()` 関数化。`teardownAuth()` で unsubscribe。`import.meta.hot.dispose(teardownAuth)` で HMR 対応。`main.jsx` が明示的に `bootstrapAuth()` を呼ぶ |
| **H10** | `supabase.js` が R2 パッケージに未掲載 | 本 R2.5 パッケージに全文掲載（下記 §3.5） |
| **H12** | `.s01-server-notice` が spec にない追加要素 | spec §4.2 S01-9b を error/notice 2 バリアント対応に更新。実装は `.s01-server-message` ベース + `.s01-server-message-error` / `.s01-server-message-notice` モディファイア統一 |

### Phase B / 別ミッションへ分離（本 R2.5 スコープ外）

| # | R2 指摘 | 理由 |
|---|---|---|
| **H7** | ルートレベルのコード分割なし、supabase-js 同梱 | パフォーマンス最適化ミッションで対応 |
| **H9** | Supabase RLS 設定状況が package から確認不能 | Supabase バックエンドミッション（クライアント側作業ではない） |
| **H11** | 明示的 CSP 未設定 | 配信インフラ（index.html / HTTP ヘッダ）設定ミッション |

---

## 2. design_spec §4.2 S-01 Auth（R2.5 更新箇所）

- **S01-9b:** `.s01-server-message` に統一、`.s01-server-message-error` (role=alert) と `.s01-server-message-notice` (role=status) の2バリアント

---

## 3. 実装パッケージ（R2.5 修正後）

### 3.1 lais/src/main.jsx

```jsx
import { render } from 'preact';
import { App } from './components/App.jsx';
import { bootstrapAuth } from './lib/auth.js';

bootstrapAuth();

render(<App />, document.getElementById('app'));
```

### 3.2 lais/src/components/App.jsx

```jsx
import { useEffect } from 'preact/hooks';
import Router, { route } from 'preact-router';
import { S00Splash } from './screens/S00Splash.jsx';
import { S01Auth } from './screens/S01Auth.jsx';

export function App() {
  const handleStart = () => route('/auth?mode=signup');
  const handleLogin = () => route('/auth?mode=login');

  return (
    <div class="app-root">
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

function AuthRoute({ url }) {
  const search = url && url.includes('?') ? url.slice(url.indexOf('?')) : '';
  const params = new URLSearchParams(search);
  const mode = params.get('mode') === 'login' ? 'login' : 'signup';
  return <S01Auth mode={mode} />;
}

/*
 * 静的ページ (/terms /privacy 等) は SPA 管理外としてブラウザに任せる。
 * allowlist にマッチした場合はフルナビゲーション、それ以外は SPA のトップへ。
 */
const STATIC_PATHS = ['/terms', '/privacy'];

function NotFound({ url }) {
  useEffect(() => {
    const path = (url || '').split('?')[0];
    if (STATIC_PATHS.includes(path)) {
      window.location.assign(path);
      return;
    }
    route('/', true);
  }, [url]);
  return null;
}
```

### 3.3 lais/src/lib/auth.js

```js
import { signal } from '@preact/signals';
import { supabase } from './supabase.js';

export const session = signal(null);
export const authLoading = signal(true);

let bootstrapped = false;
let authSubscription = null;

/**
 * アプリ起動時に一度だけ呼び出し、Supabase セッション初期化と
 * auth state の購読を開始する。import 副作用を避けるため明示呼び出し方式。
 * HMR / 二重マウントでも安全: 同一モジュール内で一度しか実行されない。
 */
export function bootstrapAuth() {
  if (bootstrapped) return;
  bootstrapped = true;

  supabase.auth
    .getSession()
    .then(({ data }) => {
      session.value = data?.session ?? null;
    })
    .catch((err) => {
      console.error('[Lais] getSession failed:', err);
      session.value = null;
    })
    .finally(() => {
      authLoading.value = false;
    });

  const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
    session.value = newSession ?? null;
  });
  authSubscription = data?.subscription ?? null;
}

export function teardownAuth() {
  if (authSubscription) {
    authSubscription.unsubscribe();
    authSubscription = null;
  }
  bootstrapped = false;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    teardownAuth();
  });
}

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

### 3.4 lais/src/components/screens/S01Auth.jsx（R2.5 全文）

```jsx
import { useState, useRef, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { Link } from 'preact-router/match';
import { signUpWithEmail, signInWithEmail } from '../../lib/auth.js';
import './S01Auth.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SIGNUP_MIN_PASSWORD = 8;
const LOGIN_MIN_PASSWORD = 6;

export function S01Auth({ mode = 'signup' }) {
  const isSignup = mode === 'signup';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [confirmNotice, setConfirmNotice] = useState('');

  const inFlightRef = useRef(false);
  const emailInputRef = useRef(null);
  const agreeRef = useRef(null);

  // モード切替時に transient state をリセット（H6 レース対策）
  useEffect(() => {
    setServerError('');
    setConfirmNotice('');
    setAttempted(false);
  }, [mode]);

  const trimmedEmail = email.trim();
  const emailFormatOk = EMAIL_RE.test(trimmedEmail);
  const emailInvalid = (emailTouched || attempted) && trimmedEmail.length > 0 && !emailFormatOk;
  const emailMissing = attempted && trimmedEmail.length === 0;
  const minPw = isSignup ? SIGNUP_MIN_PASSWORD : LOGIN_MIN_PASSWORD;
  const passwordTooShort = attempted && password.length < minPw;
  const agreeMissing = isSignup && attempted && !agree;

  const canSubmit =
    emailFormatOk &&
    password.length >= minPw &&
    (isSignup ? agree : true) &&
    !submitting;

  const title = isSignup ? 'アカウントを作成' : 'ログイン';
  const ctaLabel = submitting ? '送信中…' : isSignup ? 'サインアップ' : 'ログイン';
  const footerLabel = isSignup ? 'ログインはこちら' : '新規登録はこちら';
  const footerTarget = isSignup ? '/auth?mode=login' : '/auth?mode=signup';

  const resetTransientMessages = () => {
    setServerError('');
    setConfirmNotice('');
  };

  const handleEmailInput = (e) => {
    setEmail(e.currentTarget.value);
    if (serverError) resetTransientMessages();
  };

  const handlePasswordInput = (e) => {
    setPassword(e.currentTarget.value);
    if (serverError) resetTransientMessages();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEmailTouched(true);
    setAttempted(true);

    // H5 同期ロック
    if (inFlightRef.current) return;
    if (!canSubmit) {
      if (!emailFormatOk && emailInputRef.current) {
        emailInputRef.current.focus();
      } else if (isSignup && !agree && agreeRef.current) {
        agreeRef.current.focus();
      }
      return;
    }

    inFlightRef.current = true;
    setSubmitting(true);
    resetTransientMessages();
    try {
      if (isSignup) {
        const data = await signUpWithEmail({ email: trimmedEmail, password });
        if (!data?.session) {
          setConfirmNotice(
            '確認メールを送信しました。メール内のリンクをクリックするとサインインできます。'
          );
          return;
        }
      } else {
        await signInWithEmail({ email: trimmedEmail, password });
      }
      route('/', true);
    } catch (err) {
      setServerError(err?.message || '認証に失敗しました');
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  };

  // H6 同期ガード
  const handleFooterClick = (e) => {
    if (submitting || inFlightRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const ctaDescribedBy = [
    emailMissing ? 's01-email-missing' : null,
    emailInvalid ? 's01-email-error' : null,
    passwordTooShort ? 's01-password-short' : null,
    agreeMissing ? 's01-agree-missing' : null,
  ].filter(Boolean).join(' ') || undefined;

  return (
    <main class="s01">
      <h1 class="s01-logo">Lais</h1>
      <h2 class="s01-title">{title}</h2>

      <form class="s01-form" onSubmit={handleSubmit} noValidate>
        <div class="s01-field">
          <label class="s01-label" for="s01-email">メールアドレス</label>
          <input
            ref={emailInputRef}
            id="s01-email"
            class={`s01-input${emailInvalid || emailMissing ? ' s01-input-error' : ''}`}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onInput={handleEmailInput}
            onChange={handleEmailInput}
            onBlur={() => setEmailTouched(true)}
            aria-invalid={emailInvalid || emailMissing}
            aria-describedby={
              emailInvalid ? 's01-email-error'
              : emailMissing ? 's01-email-missing'
              : undefined
            }
            disabled={submitting}
            required
          />
          {emailInvalid && (
            <p class="s01-error" id="s01-email-error" role="alert">
              メールアドレスの形式が正しくありません
            </p>
          )}
          {emailMissing && (
            <p class="s01-error" id="s01-email-missing" role="alert">
              メールアドレスを入力してください
            </p>
          )}
        </div>

        <div class="s01-field">
          <label class="s01-label" for="s01-password">パスワード</label>
          <input
            id="s01-password"
            class={`s01-input${passwordTooShort ? ' s01-input-error' : ''}`}
            type="password"
            name="password"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            placeholder={isSignup ? '8文字以上' : 'パスワード'}
            value={password}
            onInput={handlePasswordInput}
            onChange={handlePasswordInput}
            minLength={minPw}
            aria-invalid={passwordTooShort}
            aria-describedby={
              passwordTooShort ? 's01-password-short'
              : isSignup ? 's01-password-hint'
              : undefined
            }
            disabled={submitting}
            required
          />
          {isSignup && !passwordTooShort && (
            <p class="s01-hint" id="s01-password-hint">8文字以上で設定してください</p>
          )}
          {passwordTooShort && (
            <p class="s01-error" id="s01-password-short" role="alert">
              {isSignup ? 'パスワードは8文字以上で入力してください' : 'パスワードは6文字以上で入力してください'}
            </p>
          )}
        </div>

        {isSignup && (
          <div class="s01-agree">
            <label class="s01-agree-label" for="s01-agree">
              <input
                ref={agreeRef}
                id="s01-agree"
                class="s01-checkbox"
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.currentTarget.checked)}
                disabled={submitting}
                aria-required="true"
                aria-invalid={agreeMissing}
                aria-describedby={agreeMissing ? 's01-agree-missing' : undefined}
              />
              <span class="s01-agree-text">
                利用規約およびプライバシーポリシーに同意します
              </span>
            </label>
            <p class="s01-agree-links">
              <a class="s01-link" href="/terms" target="_blank" rel="noopener noreferrer">利用規約</a>
              <span class="s01-link-sep"> / </span>
              <a class="s01-link" href="/privacy" target="_blank" rel="noopener noreferrer">プライバシーポリシー</a>
            </p>
            {agreeMissing && (
              <p class="s01-error" id="s01-agree-missing" role="alert">
                利用規約とプライバシーポリシーへの同意が必要です
              </p>
            )}
          </div>
        )}

        {serverError && (
          <p class="s01-server-message s01-server-message-error" role="alert">{serverError}</p>
        )}
        {confirmNotice && (
          <p class="s01-server-message s01-server-message-notice" role="status">{confirmNotice}</p>
        )}

        <button
          type="submit"
          class="s01-cta"
          disabled={!canSubmit}
          aria-disabled={!canSubmit}
          aria-busy={submitting}
          aria-describedby={ctaDescribedBy}
          onMouseDown={(e) => { if (inFlightRef.current) e.preventDefault(); }}
        >
          {ctaLabel}
        </button>

        <Link
          class="s01-footer-link"
          href={footerTarget}
          onClick={handleFooterClick}
          onMouseDown={handleFooterClick}
          aria-disabled={submitting}
          tabIndex={submitting ? -1 : 0}
        >
          {footerLabel}
        </Link>
      </form>
    </main>
  );
}
```

### 3.5 lais/src/lib/supabase.js （H10 対応: 本 R2.5 で新規掲載）

```js
import { createClient } from '@supabase/supabase-js';

/*
 * Supabase API key について:
 * 2024年後半に導入された新形式 (sb_publishable_...) と旧JWT形式 (eyJ...) の
 * どちらも createClient の第2引数で受け付けられる（supabase-js v2.45+）。
 * 当リポジトリでは publishable key 形式を採用。
 * クライアント側は必ず publishable key または anon JWT を使う。
 * service_role キーは絶対にフロントに置かない（CI gitleaks は別ミッションで導入予定）。
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

### 3.6 lais/src/styles/themes.css （抜粋: C1 対応）

4テーマ全てに `--text-placeholder` トークンを追加:

```css
/* Night Sky (dark) */
--text-placeholder: #9BA7B4; /* 6.77:1 on #161B22 */

/* Dawn (light) */
--text-placeholder: #5A4E3E; /* 7.75:1 on #F4EFE8 */

/* Harajuku Light */
--text-placeholder: #6B4556; /* 7.23:1 on #FFEDF0 */

/* Harajuku Dark */
--text-placeholder: #C9A8B5; /* 8.0:1 on #241219 */
```

### 3.7 lais/src/components/screens/S01Auth.css （主要差分のみ）

- `.s01-input::placeholder { color: var(--text-placeholder); }` に変更（C1）
- `.s01-server-error / .s01-server-notice` → `.s01-server-message` + `.s01-server-message-error / .s01-server-message-notice` に統一（H12）
- それ以外の箇所（`.s01-agree-label` の 44×44 タップ領域、`@media (prefers-reduced-motion: reduce)`, focus-visible ring）は R2 からそのまま継承

---

## 4. Playwright 実測 (R2.5)

6 状態スクショ（375×812 viewport）全て PASS:
- コンソールエラー: 0
- m1 (splash → signup) / m4 (有効入力 + 未同意) / m5 (同意済) / m6 (Link でlogin遷移) / m7 (login valid) / m8 (signup 戻り) 全 PASS
- CTA disabled / aria-disabled state 全 PASS

---

## 5. R2.5 レビュー観点（重点）

- **C1:** `--text-placeholder` トークンの追加と参照箇所が妥当か（design system レベル修正）
- **H1/H2:** エラー告知の `role=alert` と focus 誘導
- **H5/H6:** `inFlightRef` 同期ロック + `onMouseDown` の組み合わせが十分か
- **H4:** `NotFound` allowlist の妥当性
- **H8:** `bootstrapAuth()` 関数化 + HMR dispose
- **H12:** `.s01-server-message` 統一命名

---

## 6. スコープ外（Phase B 以降）

- H7 コード分割 / H9 Supabase RLS / H11 CSP
- Supabase 実メール疎通テスト
- /terms /privacy ページ実装（allowlist 受け先）
- パスワードリセット (S-05)
- OAuth / SNS ログイン
- オンボーディング S-02
