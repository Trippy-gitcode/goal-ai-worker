# Lais M3 実装レビューパッケージ R2 — S-01 Auth 修正版

> 本パッケージは M3 1st ラウンドで検出された CRITICAL 4 / HIGH 19 を受けて修正した R2。
> 1st ラウンドで失敗した Gemini 6 本は Preview 不安定のため本 R2 では gpt5 のみを対象とする。
> 1st ラウンドの `m3_s01_review_package.md` からの差分と、残存する既知事項（design_spec §7 Phase 4 対応リスト該当など）を明示する。

---

## 1st ラウンドで検出された主要項目と本 R2 での対応

### CRITICAL (4)

| # | 1st 指摘 | 本 R2 対応 |
|---|---|---|
| C1 | checkbox 20×20 が WCAG 2.5.8 (24×24) / 44×44 未満（gemini+gpt5 a11y 収束） | **spec §4.2 S01-7 を更新**（視覚サイズ 20×20 は維持、周囲 label の padding で 44×44+ のタップ領域を確保）+ 実装で `.s01-agree-label` の `padding: var(--space-sm) 0; min-height: 44px` により準拠 |
| C2 | 規約リンク `<a href="#">` + `preventDefault` でキーボード操作不可 / tabnabbing 無対策 | `<a href="/terms" target="_blank" rel="noopener noreferrer">` に変更。`/terms` / `/privacy` は Phase B でページ実装 |
| C3 | プレースホルダー contrast 2.93:1 < 4.5:1 | **design_spec §7 Phase 4 対応リスト A-1 として既登録**（本 M3 スコープ外）。変更なし |
| C4 (集約) | 1st の CRITICAL 4 件は実質 C1/C2/C3 の 3 論点（checkbox 論点が gemini/gpt5 で重複） | — |

### HIGH (対応済)

| # | 1st 指摘 | 本 R2 対応 |
|---|---|---|
| H1 | label 内リンクで checkbox トグルされる副作用 | 規約/ポリシーリンクを label 外の `<p class="s01-agree-links">` に分離 |
| H2 | login 時も 8 文字強制で既存ユーザーログイン不能 | `SIGNUP_MIN_PASSWORD=8` / `LOGIN_MIN_PASSWORD=6`（Supabase 既定）で分岐 |
| H3 | signUp 成功 session null 時も route('/') で未ログイン遷移 | signUp 応答の `data.session` が null の場合はトップ遷移せず `confirmNotice` で「確認メール送信」を表示 |
| H4 | NotFound が render 中に route('/') を同期実行 | `useEffect(() => { route('/', true); }, [])` に移動 |
| H5 | getSession() に catch なし → authLoading 永続 | `.catch` + `.finally` で authLoading を確実に false 化 |
| H6 | セカンダリリンクを `<button>` 化してセマンティクス逸脱 | `preact-router/match` の `<Link>` に差し替え（実体は `<a>`）、SPA ナビゲーション維持 |
| H7 | AuthRoute が window.location.search を直接参照 | `AuthRoute({ url })` で preact-router の props から取得 |
| H8 | prefers-reduced-motion 未対応 | `@media (prefers-reduced-motion: reduce)` で transition/transform 無効化 |
| H9 | password 最小長の視認性欠如 | signup 時のみ `<p class="s01-hint">8文字以上で設定してください</p>` を恒常表示 + `aria-describedby` |
| H10 | `.s01-server-error` が spec にない追加要素 | **spec §4.2 に S01-9b として正式追加** |
| H11 | submitting 中にモード切替可能→完了時レース | フッター `<Link>` に `aria-disabled={submitting}` + `tabIndex={-1}` + onClick で preventDefault、入力欄も `disabled={submitting}` |
| H12 | localStorage 保存で service_role 誤配置検知不可 | 本 R2 では対応保留（publishable key は JWT でないため起動時検証不可。CI gitleaks は別タスク） |
| H13 | オートフィル対応（onInput のみ） | `onChange` 併用、`name="email"` / `name="password"` 付与、`autocomplete` 既に指定済 |

### 対応保留（design_spec §7 Phase 4 対応リスト / 別ミッション）

- **C3** placeholder contrast → §7 A-1
- **H12** service_role 検知 → CI gitleaks 導入ミッションで対応
- **コード分割**（gpt5/performance MEDIUM R-001 系）→ パフォーマンス最適化ミッションで対応
- **onAuthStateChange unsubscribe/HMR 重複購読**（gpt5 4ペルソナ収束 MEDIUM）→ R3 で対応予定

---

## 2. design_spec §4.2 S-01 Auth（R2 更新版）

### 要素仕様（更新箇所のみ抜粋）

| ID | 要素 | 位置・サイズ |
|---|---|---|
| S01-6b | パスワードヒント | S01-6 下 `--space-xs` / 左揃え / font 11px weight 400 color `--text-muted` / 文言「8文字以上」恒常表示 |
| S01-7 | 同意チェックボックス | S01-6b 下 `--space-lg` / **視覚サイズ 20×20 / ヒット領域 44×44 以上**（周囲ラベルの padding で拡張、WCAG 2.5.5 / 2.5.8 準拠） |
| S01-9 | CTA | **min-height 52px**（固定 52px から伸縮許可に変更） |
| S01-9b | サーバエラー/通知表示 | S01-9 直上、フォーム内 / `.s01-server-error` / `role="alert"` / 認証失敗時のみ |
| S01-10 | リンク「ログインはこちら」 | 実装は `<Link>` / 実体 `<a>` + SPA ナビゲーション / min-height 44px |

### 状態（R2 追加分）

- **送信中:** S01-9 ラベル「送信中…」、モード切替リンク(S01-10) disabled（レース防止）
- **signUp 成功 session null (メール確認必須):** トップ遷移せず S01-9b に「確認メール送信」
- **ログイン時 password 最小長:** Supabase 設定既定 6 文字（8 文字強制は signup のみ）
- **prefers-reduced-motion: reduce:** 全 transition/transform 無効化

---

## 3. 実装パッケージ（R2 修正後）

### 3.1 lais/src/components/App.jsx

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

function NotFound() {
  useEffect(() => {
    route('/', true);
  }, []);
  return null;
}
```

### 3.2 lais/src/lib/auth.js

```js
import { signal } from '@preact/signals';
import { supabase } from './supabase.js';

export const session = signal(null);
export const authLoading = signal(true);

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

### 3.3 lais/src/components/screens/S01Auth.jsx

```jsx
import { useState } from 'preact/hooks';
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
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [confirmNotice, setConfirmNotice] = useState('');

  const trimmedEmail = email.trim();
  const emailFormatOk = EMAIL_RE.test(trimmedEmail);
  const emailInvalid = emailTouched && trimmedEmail.length > 0 && !emailFormatOk;
  const minPw = isSignup ? SIGNUP_MIN_PASSWORD : LOGIN_MIN_PASSWORD;
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
    if (!canSubmit) return;
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
      setSubmitting(false);
    }
  };

  const handleFooterClick = (e) => {
    if (submitting) {
      e.preventDefault();
      return;
    }
  };

  return (
    <main class="s01">
      <h1 class="s01-logo">Lais</h1>
      <h2 class="s01-title">{title}</h2>

      <form class="s01-form" onSubmit={handleSubmit} noValidate>
        <div class="s01-field">
          <label class="s01-label" for="s01-email">メールアドレス</label>
          <input
            id="s01-email"
            class={`s01-input${emailInvalid ? ' s01-input-error' : ''}`}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onInput={handleEmailInput}
            onChange={handleEmailInput}
            onBlur={() => setEmailTouched(true)}
            aria-invalid={emailInvalid}
            aria-describedby={emailInvalid ? 's01-email-error' : undefined}
            disabled={submitting}
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
            name="password"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            placeholder={isSignup ? '8文字以上' : 'パスワード'}
            value={password}
            onInput={handlePasswordInput}
            onChange={handlePasswordInput}
            minLength={minPw}
            aria-describedby={isSignup ? 's01-password-hint' : undefined}
            disabled={submitting}
          />
          {isSignup && (
            <p class="s01-hint" id="s01-password-hint">8文字以上で設定してください</p>
          )}
        </div>

        {isSignup && (
          <div class="s01-agree">
            <label class="s01-agree-label" for="s01-agree">
              <input
                id="s01-agree"
                class="s01-checkbox"
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.currentTarget.checked)}
                disabled={submitting}
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
          </div>
        )}

        {serverError && (
          <p class="s01-server-error" role="alert">{serverError}</p>
        )}
        {confirmNotice && (
          <p class="s01-server-notice" role="status">{confirmNotice}</p>
        )}

        <button
          type="submit"
          class="s01-cta"
          disabled={!canSubmit}
          aria-disabled={!canSubmit}
          aria-busy={submitting}
        >
          {ctaLabel}
        </button>

        <Link
          class="s01-footer-link"
          href={footerTarget}
          onClick={handleFooterClick}
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

### 3.4 lais/src/components/screens/S01Auth.css （末尾 `@media (prefers-reduced-motion)` を含む全文）

```css
/* (省略せず全文。本パッケージ外の読者は repo の lais/src/components/screens/S01Auth.css を参照) */
```

※ 長文のため CSS 全文は R2 パッケージでは省略。レビュアーは `lais/src/components/screens/S01Auth.css` を参照してほしい。主要差分:
- `.s01-agree-label { padding: var(--space-sm) 0; min-height: 44px; }`（タップ領域 44×44+）
- `.s01-agree-links` を label 外の独立ブロックに分離
- `.s01-hint` / `.s01-server-notice` を新規追加
- `.s01-footer-link` を `<a>` 用スタイルに再設計（inline-flex、`aria-disabled` で無効化）
- `@media (prefers-reduced-motion: reduce)` 追加

---

## 4. Playwright 実測 (R2)

6 状態スクショ（375×812 viewport、前回と同様）:

1. **01_splash:** S-00 スプラッシュ
2. **02_signup_empty:** signup 初期 / CTA disabled / パスワードヒント「8文字以上で設定してください」恒常表示 / 規約リンクが label 外
3. **03_signup_email_invalid:** email 不正 → border --danger + エラーテキスト
4. **04_signup_valid_no_agree:** email+password 有効、agree 未選択 → CTA disabled
5. **05_signup_agreed:** チェック済 → CTA enabled
6. **06_login_mode:** Link 経由で /auth?mode=login 遷移 / タイトル「ログイン」 / checkbox・ヒント非表示

コンソールエラー: 0

---

## 5. R2 レビュー観点（重点）

- **C1 (checkbox target):** spec §4.2 S01-7 が 20×20 視覚サイズ + 44×44 タップ領域の仕様に更新済み。実装が準拠しているか確認してほしい
- **C2 (規約リンク):** `<a href="/terms" target="_blank" rel="noopener noreferrer">` に修正。キーボード操作・tabnabbing 両方対応
- **H1 (label 内リンク):** 規約リンクを label 外に分離したため副作用が消えたか確認
- **H3 (signUp session null):** Supabase confirm email 有効時のフロー（session 取得なし→確認メッセージ）
- **H6 (Link):** preact-router/match の `<Link>` に戻し、anchor セマンティクス + SPA ナビゲーション両立
- **H8 (reduced-motion):** @media で無効化されているか
- **未対応の既知項目:** §7 A-1 placeholder contrast / onAuthStateChange unsubscribe / コード分割

---

## 6. スコープ外（Phase B 以降）

- Supabase 実メール疎通テスト
- /terms / /privacy ページ（Phase B）
- パスワードリセット (S-05)
- OAuth / SNS ログイン
- オンボーディング S-02
