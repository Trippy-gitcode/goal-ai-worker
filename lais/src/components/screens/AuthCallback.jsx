import { useEffect, useState } from 'preact/hooks';
import { route } from 'preact-router';
import { supabase } from '../../lib/supabase.js';
import { postSignInDestination } from '../../lib/auth.js';
import { bootstrapUser } from '../../lib/db.js';
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

        // BUG-RT-SIGNIN-LATENCY-REDUCTION（2026-04-26）:
        //   bootstrapUser() の `await` を外し、route() を先に実行する。
        //   /grow 描画には bootstrap 行は不要で、service_role API は別途 ensure するため、
        //   ここで 200-400ms 待つ意味がない。失敗は warn のみ（既存挙動と等価）。
        // LAIS-PHASE-A-REAL-COMPLETION:
        //   public.users 行を ensure（既存 RLS が user-self INSERT を拒否するため
        //   service_role 経由で代行）。
        bootstrapUser().catch((bootErr) => {
          // eslint-disable-next-line no-console
          console.warn('[Lais] bootstrapUser failed:', bootErr && bootErr.message);
        });

        // BUG-RT-LOGIN-REDIRECT-FIX（2026-04-26）:
        // 旧コードは `route('/', true)` で S00Splash に戻っていたため、
        // メール確認 / マジックリンク完了後に Splash に逆戻り → 「ログインできない」と
        // 認識されていた。postSignInDestination() で deeplink 復帰または /grow へ。
        // ※ destination は同期で 1 回確定し、reduced-motion 経路と welcome 経路で同じ値を使う。
        const destination = postSignInDestination();

        if (prefersReducedMotion) {
          route(destination, true);
          return;
        }

        setStatus('welcome');
        welcomeTimer = setTimeout(() => {
          if (!cancelled) route(destination, true);
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
    <main id="main-content" class="auth-callback" aria-live="polite" role="status">
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

// PATCH-BUG-RT-AUTH-GATE 補正（2026-04-26）: App.jsx の lazy() 用 default export 必須
// （named export 単独だと preact/compat lazy で "Cannot convert object to primitive value"）
export default AuthCallback;
