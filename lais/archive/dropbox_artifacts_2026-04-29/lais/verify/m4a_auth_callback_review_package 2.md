# Lais M4-A 実装レビューパッケージ — /auth/callback Deep-link 受け口

> 本パッケージは Lais Phase 4 M4-A「/auth/callback deep-link 受け口実装」のレビュー対象一式。
> レビュー種別: sub_review_flow.md D. 実装レビュー
> 本書を全レビュアーに同時提供。
> 実装規模: 新規 1 画面 (AuthCallback) + ルーティング 1 行 + bootstrapAuth 配置変更 + signUp redirect option

---

## ミッション定義（session_progress.md LAIS-PHASE4-M4A より）

**目的:** Supabase メール確認後の deep-link（/auth/callback）を受け取り、セッション確立後にトップ（/）へ遷移する

**要件:**
1. `/auth/callback` ルートを App.jsx に追加
2. AuthCallback コンポーネント: URL fragment から session を検出 → supabase.auth.getSession() で確認 → 成功時 `/` へ route() → 失敗時 `/auth?mode=login` へ route() + エラー表示
3. ローディング状態の表示（「認証確認中…」等）
4. PKCE flow の code exchange 対応（Supabase が URL に code= パラメータを付与するケース）
5. `bootstrapAuth()` を main.jsx から App コンポーネント内に移動（SSR/prerender 将来対応）
6. callback 成功後に一瞬のウェルカムアニメーション（「あなたの冒険が始まります」等。Lais 主人公体験ブランド。design_system motion トークン準拠）

**テスト要件:** PKCE code exchange の E2E テストは Supabase mock で実装すること（外部依存を排除）— 本ミッションではレビュー後に別ミッションで整備予定

**スコープ外:**
- パスワードリセット（Phase B / S-05）
- OAuth プロバイダー経由コールバック（本ミッションは Supabase メール確認 PKCE のみ想定、ただし hash fragment エラー検出は先行して実装済）
- Supabase 実サーバとの E2E 疎通（Code 側では静的検証のみ）

**完了条件:** 実装 + cmd1-5 PASS + AI レビュー CRITICAL 0

---

## 参照セクション引用

### design_spec_v1.md §4.2 S-01 Auth（状態・インタラクション節のみ抜粋）

`/auth/callback` は §4.2 の以下の状態遷移の受け口として動作する:

- サインアップ時メール確認必須フロー（Supabase `confirm email` 有効）: `signUp` 成功しても `session` が null の場合はトップ遷移せず、S01-9b に「確認メールを送信しました」のメッセージ表示（画面遷移しない）
- 成功（session 取得済み）: `ease-out` / `--duration-normal` で次画面へ
- `prefers-reduced-motion: reduce`: 全 transition / transform を無効化（スプリング・scale・slide）

**補足:** `/auth/callback` 画面自体は design_spec_v1.md §4.2 には登場しない（§4.2 は S-01 フォーム画面のレイアウトのみを規定）。callback 受け口は M4-A ミッション定義により新設される中間画面であり、**本パッケージにおける「仕様」は上記ミッション定義 + design_system.md §7 モーショントークンとする。**

### design_system.md §7.5 モーショントークン（該当箇所引用）

```css
--duration-fast: 200ms;
--duration-normal: 350ms;
--duration-slow: 500ms;
--duration-celebration: 800ms; /* 特別な演出 */

--spring-default: cubic-bezier(0.175, 0.885, 0.32, 1.1);   /* 軽いovershoot */
--spring-gentle:  cubic-bezier(0.25, 0.46, 0.45, 0.94);    /* 減衰 */
--spring-bouncy:  cubic-bezier(0.34, 1.56, 0.64, 1);       /* scale系演出専用 */

--ease-out: cubic-bezier(0, 0, 0.2, 1);
```

- scale 系（タスク完了チェック、レベルアップバッジ）は spring-default / spring-bouncy を使用可
- translate 系はスプリング禁止（画面外突き抜け回避）

### design_system.md §7.6 prefers-reduced-motion 対応（WCAG 2.3.3）

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast: 1ms;
    --duration-normal: 1ms;
    --duration-slow: 1ms;
    --duration-celebration: 1ms;
  }
  *, *::before, *::after {
    animation-duration: 1ms !important;
  }
}
```

### system_map.md §2.5 起動シーケンス（該当箇所）

```
1. checkAuth()           ← JWT / localStorage / Supabase session
2. applyTheme()
3. loadIdentity()
4. loadGoals()
...
各ステップは独立。失敗しても他は継続。
```

### reference_v1.md §5.1 認証・共通

- 全 `/api/*` は `Authorization: Bearer <supabase_jwt>` 必須（/api/auth/* 以外）
- 失敗時: 401 `{ error: "unauthorized" }`

### Supabase PKCE flow 前提

`lais/src/lib/supabase.js` で既に `flowType: 'pkce'` と `detectSessionInUrl: true` が設定されている。そのため:
- Supabase SDK は createClient 時に URL を検出して自動的に `exchangeCodeForSession` を実行する（非同期）
- しかし SDK 初期化と AuthCallback マウントのタイミングによっては、マウント時点で未消費のことがある
- AuthCallback は保険として明示的な `exchangeCodeForSession` を試行し、既に消費済みエラーは無視する

---

## 実装パッケージ

### 1. lais/src/components/App.jsx（現状全文）

```jsx
import { useEffect } from 'preact/hooks';
import Router, { route } from 'preact-router';
import { S00Splash } from './screens/S00Splash.jsx';
import { S01Auth } from './screens/S01Auth.jsx';
import { AuthCallback } from './screens/AuthCallback.jsx';
import { bootstrapAuth } from '../lib/auth.js';

export function App() {
  // bootstrapAuth は module-scope flag で多重実行をガード済みのため、
  // StrictMode / HMR による再マウントでも安全。SSR/prerender 将来対応のため
  // module top-level の副作用ではなく、クライアントマウント後に実行する。
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
 *
 * R4 対応:
 * - J: `location.replace` で history を増やさない（戻るボタンでのピンポンループ防止）
 * - N: sessionStorage アクセスを try/catch（Safari private mode の SecurityError 対策）
 */
const STATIC_PATHS = ['/terms', '/privacy'];
const STATIC_NAV_GUARD_KEY = 'lais.static-nav-guard';

function safeSessionStorage() {
  try {
    const test = '__lais_test__';
    sessionStorage.setItem(test, test);
    sessionStorage.removeItem(test);
    return sessionStorage;
  } catch {
    return null;
  }
}

function NotFound({ url }) {
  useEffect(() => {
    const path = (url || '').split('?')[0];
    const store = safeSessionStorage();

    if (STATIC_PATHS.includes(path)) {
      if (!store) {
        route('/', true);
        return;
      }
      const guard = store.getItem(STATIC_NAV_GUARD_KEY);
      if (guard === path) {
        store.removeItem(STATIC_NAV_GUARD_KEY);
        route('/', true);
        return;
      }
      store.setItem(STATIC_NAV_GUARD_KEY, path);
      window.location.replace(path);
      return;
    }
    try { store?.removeItem(STATIC_NAV_GUARD_KEY); } catch { /* ignore */ }
    route('/', true);
  }, [url]);
  return null;
}
```

### 2. lais/src/components/screens/AuthCallback.jsx（新規全文）

```jsx
import { useEffect, useState } from 'preact/hooks';
import { route } from 'preact-router';
import { supabase } from '../../lib/supabase.js';
import './AuthCallback.css';

/*
 * /auth/callback
 * Supabase のメール確認 / マジックリンク / OAuth からの deep-link 受け口。
 *
 * 処理順:
 * 1. URL から error_description を検出したら即エラー表示
 * 2. `?code=...` があれば exchangeCodeForSession で PKCE 交換を試行
 *    （detectSessionInUrl が先に成功していた場合、ここは "invalid / used" で
 *     エラーになるが session 自体は確立されているので無視する）
 * 3. getSession でセッション存在を確認し、あれば `/` へ、無ければログイン画面へ
 *
 * 遷移はすべて route(path, true) で history を増やさない（戻るボタンのピンポン防止）。
 */
// 成功時ウェルカム演出の表示時間。design_system.md §7.5 `--duration-celebration` (800ms) に合わせる。
// prefers-reduced-motion 時は CSS 側でトークンが 1ms に縮退するが、JS タイマーは独立なので
// reduced-motion 判定でスキップする（表示を見せない = 即トップへ）。
const WELCOME_HOLD_MS = 900;

export function AuthCallback() {
  // 'loading' → 'welcome' → route('/') / 'error' → route('/auth?mode=login')
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    let welcomeTimer = null;
    let errorTimer = null;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const handle = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(
          window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
        );
        const errorDesc =
          params.get('error_description') ||
          params.get('error') ||
          hashParams.get('error_description') ||
          hashParams.get('error');
        if (errorDesc) {
          throw new Error(decodeURIComponent(errorDesc.replace(/\+/g, ' ')));
        }

        const code = params.get('code');
        if (code) {
          try {
            await supabase.auth.exchangeCodeForSession(code);
          } catch {
            // detectSessionInUrl で既に消費済みのケースは getSession で最終判定する
          }
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (cancelled) return;

        if (!data?.session) {
          throw new Error('セッションを確立できませんでした。もう一度お試しください。');
        }

        if (prefersReducedMotion) {
          route('/', true);
          return;
        }

        setStatus('welcome');
        welcomeTimer = setTimeout(() => {
          if (!cancelled) route('/', true);
        }, WELCOME_HOLD_MS);
      } catch (e) {
        if (cancelled) return;
        const msg = e?.message || '認証に失敗しました。';
        setErrorMessage(msg);
        setStatus('error');
        errorTimer = setTimeout(() => {
          if (!cancelled) route('/auth?mode=login', true);
        }, 2000);
      }
    };

    handle();

    return () => {
      cancelled = true;
      if (welcomeTimer) clearTimeout(welcomeTimer);
      if (errorTimer) clearTimeout(errorTimer);
    };
  }, []);

  return (
    <main class="auth-callback" aria-live="polite" role="status">
      {status === 'loading' && <p class="auth-callback-text">認証確認中…</p>}
      {status === 'welcome' && (
        <div class="auth-callback-welcome" data-testid="auth-welcome">
          <p class="auth-callback-welcome-text">あなたの冒険が始まります</p>
        </div>
      )}
      {status === 'error' && (
        <p class="auth-callback-text auth-callback-text-error">
          {errorMessage}
          <br />
          ログイン画面に戻ります…
        </p>
      )}
    </main>
  );
}
```

### 3. lais/src/components/screens/AuthCallback.css（新規全文）

```css
.auth-callback {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  background: var(--bg-primary);
}

.auth-callback-text {
  font-size: 14px;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.7;
  margin: 0;
}

.auth-callback-text-error {
  color: var(--danger);
}

/*
 * ウェルカム演出 — Lais 主人公体験ブランド導入の最初の瞬間。
 * design_system.md §7.5 に準拠:
 *   duration: --duration-celebration (800ms)
 *   easing:   --spring-default (scale系はspring許可)
 *   opacity:  --ease-out
 * prefers-reduced-motion 時は §7.6 によりトークンが 1ms に縮退し、
 * JS 側でも表示をスキップ（main component 側で判定）。
 */
.auth-callback-welcome {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0.96);
  animation:
    auth-callback-welcome-fade var(--duration-celebration, 800ms) var(--ease-out, ease-out) forwards,
    auth-callback-welcome-scale var(--duration-celebration, 800ms)
      var(--spring-default, cubic-bezier(0.175, 0.885, 0.32, 1.1)) forwards;
}

.auth-callback-welcome-text {
  font-size: 20px;
  font-weight: 400;
  letter-spacing: var(--letter-spacing-ja, 0.02em);
  color: var(--accent);
  text-align: center;
  margin: 0;
  line-height: 1.6;
}

@keyframes auth-callback-welcome-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes auth-callback-welcome-scale {
  from { transform: scale(0.96); }
  to   { transform: scale(1); }
}
```

### 4. lais/src/main.jsx（現状全文）

```jsx
import { render } from 'preact';
import { App } from './components/App.jsx';

render(<App />, document.getElementById('app'));
```

**差分ポイント:** 以前は `import { bootstrapAuth } ... ; bootstrapAuth();` が module top-level にあったが、要件 5 に従い App 内 useEffect に移動。これにより SSR / prerender 時に `window` / `supabase` の副作用が main.jsx evaluation 中に走らない。

### 5. lais/src/lib/auth.js（現状全文）

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
  const emailRedirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: emailRedirectTo ? { emailRedirectTo } : undefined,
  });
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

### 6. lais/src/lib/supabase.js（参考 — 変更なし）

```js
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !publishableKey) {
  throw new Error('[Lais] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY 未設定');
}

export const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});
```

---

## 完了コマンド結果

| cmd | コマンド | 結果 | 判定 |
|---|---|---|---|
| cmd1 | `grep -c 'callback' lais/src/components/App.jsx` | `1` | PASS (≥1) |
| cmd2 | `test -f lais/src/components/screens/AuthCallback.jsx` | 存在 | PASS |
| cmd3 | `npx playwright test lais/` | N/A | 未整備（後続ミッションで Supabase mock E2E 整備予定） |
| cmd4 | `grep -c 'bootstrapAuth' lais/src/components/App.jsx` | `3` | PASS (≥1 / import + useEffect + コメント内) |
| cmd5 | `grep -c 'bootstrapAuth' lais/src/main.jsx` | `0` | PASS (==0) |

**build:** `npm run build` → 62 modules transformed, CSS 14.75 kB, JS 231.74 kB, 363ms, エラーなし

---

## レビュー観点（各ペルソナ向け補足）

- **code_reviewer:** useEffect cleanup の timer クリア、cancelled フラグ、副作用管理の責務分離
- **security_engineer:** error_description の decodeURIComponent 経路での XSS / open redirect 可能性、PKCE code 再利用、URL hash に token が含まれる OAuth implicit flow 誤用がないか
- **sw_debugger:** detectSessionInUrl と明示 exchangeCodeForSession のレース、複数回マウント時の挙動、onAuthStateChange との競合、タイマー leak
- **performance_engineer:** 900ms ハードコードの根拠、アニメーションの compositor-only 化、不要な再レンダリング
- **a11y_engineer:** `role="status"` / `aria-live="polite"` の妥当性、スクリーンリーダーでの「認証確認中…→あなたの冒険が始まります」読み上げ順、prefers-reduced-motion 対応の完全性
- **spec_compliance:** §4.2 状態節 + §7.5/§7.6 モーショントークンとの整合、トークン名のハードコード値使用がないか、AuthCallback の UI が Design Context（Night Sky Journal / 手触り感）に合致するか
- **edge_case_hunter:** URL に code も error も無いケース、code だけあり session 取得失敗、error_description に特殊文字、マウント直後アンマウント、同じ /auth/callback に二重遷移、Safari private mode での sessionStorage 不在、ネットワーク断、Supabase レスポンス遅延 10 秒、ブラウザ戻るボタン連打

---

## 重要度 severity 基準（再掲）

- **CRITICAL:** 「このまま実装に進むと確実に障害・矛盾・データ損失が発生する」または「仕様として根本的に破綻しており実装不能」
- **HIGH:** あった方がよい / ベストプラクティスから外れる / 改善余地あり
- **MEDIUM / LOW:** 軽微な改善提案

severity inflation（HIGH 相当を CRITICAL にする等）は避けてください。
