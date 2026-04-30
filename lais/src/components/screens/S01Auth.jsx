import { useState, useRef, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { Link } from 'preact-router/match';
import { signUpWithEmail, signInWithEmail, isDuplicateEmailSignup, postSignInDestination } from '../../lib/auth.js';
import { bootstrapUser } from '../../lib/db.js';
import './S01Auth.css';

/*
 * BUG-RT-SIGNIN-LATENCY-REDUCTION（2026-04-26）:
 *   S-10 GROW Dashboard の lazy chunk と db.js を signin 完了「直前」に
 *   並列フェッチして、`/grow` 遷移後の chunk fetch + 初期データ fetch を
 *   form submit 中の Supabase /auth/v1/token RTT と重ねる。
 *
 *   呼出は副作用フリー（import() の結果を捨てるだけ）で、ネットワーク失敗時も
 *   実遷移時に再 fetch されるため安全。signin 失敗時には何も起きない。
 *
 *   旧実装では: form submit → token RTT → bootstrap → route('/grow') → chunk fetch → loadDashboard
 *   新実装では: form submit + chunk prefetch + db prefetch (並列) → ... → route('/grow') → 既に warm
 */
function prefetchPostSigninAssets() {
  // S-10 chunk 自体（preact + S10Grow.jsx に依存する CSS / vendor 含む）
  import('./S10Grow.jsx').catch(() => {});
  // db.js は S-10 mount 時の loadDashboard() を即時実行可能にするため
  import('../../lib/db.js').catch(() => {});
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SIGNUP_MIN_PASSWORD = 8;
// ログイン時のパスワード最小長はサーバ検証に委譲（過去の6文字未満アカウントを締め出さないため）
const LOGIN_MIN_PASSWORD = 1;
const SUBMIT_TIMEOUT_MS = 15000;

// PATCH-BUG-RT-AUTH-GATE 補正（2026-04-26）:
// App.jsx は `lazy(() => import('./screens/S01Auth.jsx'))` で読込むため、
// default export が必須。named export 単独だと chunk の default が undefined となり、
// preact/compat の lazy() ラッパが描画時に "Cannot convert object to primitive value"
// を投げて ErrorBoundary fallback に落ちる。S10Grow / S02Onboarding と同じ
// `export default <Component>` を末尾に追加する（named export は維持、互換）。
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
  // BUG-RT-SIGNUP-DUPLICATE-UX: 既登録メアドで signup された旨の明示通知
  const [duplicateNotice, setDuplicateNotice] = useState(false);

  const inFlightRef = useRef(false);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const agreeRef = useRef(null);
  const mountedRef = useRef(true);
  // R5 Group A+B: 操作 ID 採番。同時実行できる送信は常に 1 本だが、
  // タイムアウト後の遅延成功応答 / 旧 timeout コールバックを
  // 「currentOpId と一致する操作のみ有効」とみなして無効化する。
  const opIdRef = useRef(0);

  // モード切替時に transient state をリセット（H6 レース: 送信→切替→古いハンドラの遷移を防ぐ）
  useEffect(() => {
    setServerError('');
    setConfirmNotice('');
    setDuplicateNotice(false);
    setAttempted(false);
  }, [mode]);

  // R4-K オートフィル対応:
  // 一部ブラウザ/パスワードマネージャは controlled input 初期値を書き換えた際
  // onInput を発火させないため、マウント後に DOM の実値を state に同期する。
  useEffect(() => {
    const syncFromDOM = () => {
      if (emailInputRef.current && emailInputRef.current.value !== email) {
        setEmail(emailInputRef.current.value);
      }
      if (passwordInputRef.current && passwordInputRef.current.value !== password) {
        setPassword(passwordInputRef.current.value);
      }
    };
    // マウント直後 + 100ms 後（オートフィルの非同期挿入対策）
    syncFromDOM();
    const t = setTimeout(syncFromDOM, 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // BUG-RT-SIGNUP-DUPLICATE-UX: URL クエリ ?email=... を初期値として読み込み
  // signup 画面で「ログインに切替」を押したときにメアドを保持するため。
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const prefilled = params.get('email');
      if (prefilled && prefilled.length <= 320 && !email) {
        setEmail(prefilled);
      }
    } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // アンマウント検知（非同期レスポンス後の setState ガード）
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
    setDuplicateNotice(false);
  };

  const handleEmailInput = (e) => {
    setEmail(e.currentTarget.value);
    if (serverError || confirmNotice || duplicateNotice) resetTransientMessages();
  };

  const handlePasswordInput = (e) => {
    setPassword(e.currentTarget.value);
    if (serverError || confirmNotice || duplicateNotice) resetTransientMessages();
  };

  // BUG-RT-SIGNUP-DUPLICATE-UX: 「ログインに切替」ボタン
  // メアドを保持したまま signin モードへ遷移（誤検出時の救済として強制ではなくユーザー操作）
  const handleSwitchToLogin = (e) => {
    if (e) e.preventDefault();
    // mode 切替の useEffect が transient state をリセットするので
    // ここでは route のみ呼ぶ。email state は localStorage 経由 ではなく
    // URL クエリで保持して signin 画面に渡す（router 再マウントで state は失われるため）。
    const trimmed = (email || '').trim();
    const target = trimmed
      ? `/auth?mode=login&email=${encodeURIComponent(trimmed)}`
      : '/auth?mode=login';
    route(target, true);
  };

  const safeSetState = (fn) => {
    if (mountedRef.current) fn();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // H1: 未入力/不正でもエラー告知を出すため touched/attempted を立てる
    setEmailTouched(true);
    setAttempted(true);

    // H5 二重送信ガード: ref で同期的に弾く（state 更新より先に効く）
    if (inFlightRef.current) return;
    if (!canSubmit) {
      // H2: email → password → agree の順にフォーカス誘導
      if (!emailFormatOk && emailInputRef.current) {
        emailInputRef.current.focus();
      } else if (password.length < minPw && passwordInputRef.current) {
        passwordInputRef.current.focus();
      } else if (isSignup && !agree && agreeRef.current) {
        agreeRef.current.focus();
      }
      return;
    }

    // R4-M オフライン検知: navigator.onLine で送信前に拒否
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setServerError('オフラインです。ネットワーク接続を確認してください。');
      return;
    }

    // R5.1 Group A+B: opId 採番（単調増加で ABA 回避）
    // 一度使った opId は二度と再利用しない。リセットは増分のみ。
    // これにより古いコールバックが isCurrent() を誤って通過する ABA 問題を防止。
    const myOpId = ++opIdRef.current;
    const isCurrent = () => opIdRef.current === myOpId;

    inFlightRef.current = true;
    setSubmitting(true);
    resetTransientMessages();

    // BUG-RT-SIGNIN-LATENCY-REDUCTION（2026-04-26）:
    // signin 確定前から S-10 chunk + db.js を並列 prefetch。
    // Supabase /auth/v1/token RTT (~400-800ms) と chunk fetch (~200-400ms) を
    // 重ねることで、/grow 到達後の lazy load 待機を 0 に近づける。
    prefetchPostSigninAssets();

    // R4-M / R5 タイムアウト: myOpId が現行のときのみ中断処理を実行
    // 無効化は opIdRef をさらに増分することで実現（0 にリセットしない）
    const timeoutId = setTimeout(() => {
      if (!isCurrent()) return;
      opIdRef.current++; // 単調増加で無効化
      inFlightRef.current = false;
      safeSetState(() => {
        setSubmitting(false);
        setServerError('接続がタイムアウトしました。もう一度お試しください。');
      });
    }, SUBMIT_TIMEOUT_MS);

    try {
      let data;
      let signupError = null;
      if (isSignup) {
        try {
          data = await signUpWithEmail({ email: trimmedEmail, password });
        } catch (err) {
          // BUG-RT-SIGNUP-DUPLICATE-UX: error.message に "already registered" 等の
          // 重複サインアル を含むケースは throw を握りつぶして重複通知に振り分ける。
          // それ以外の本物の失敗は再度 throw して下の catch で serverError に出す。
          if (isDuplicateEmailSignup(null, err)) {
            signupError = err;
          } else {
            throw err;
          }
        }
      } else {
        data = await signInWithEmail({ email: trimmedEmail, password });
      }
      // R5 stale-response guard: 応答到着時、既に別の操作にスイッチしていたら破棄
      if (!isCurrent()) return;

      // BUG-RT-SIGNUP-DUPLICATE-UX: 既登録メアド検出
      // - identities: [] パターン（confirm email 必須プロジェクト、Supabase 重複検出仕様）
      // - error.message に "already registered" を含むパターン（例外経由）
      if (isSignup && (signupError || isDuplicateEmailSignup(data, null))) {
        safeSetState(() => {
          setDuplicateNotice(true);
        });
      } else if (isSignup && !data?.session) {
        safeSetState(() => {
          setConfirmNotice(
            '確認メールを送信しました。メール内のリンクをクリックするとサインインできます。'
          );
        });
      } else if (mountedRef.current) {
        // BUG-RT-SIGNIN-LATENCY-REDUCTION（2026-04-26）:
        //   bootstrapUser() は public.users 行 ensure のためのバックグラウンド処理で、
        //   /grow 描画には不要（loadDashboard() は service_role 経由 API で別途 ensure される）。
        //   旧実装は `await bootstrapUser()` で 200-400ms 遅延させていたが、
        //   await を外して route() を即時実行し、bootstrap は fire-and-forget に変更。
        //   失敗時は warn のみ（既存挙動と同等）。
        // LAIS-PHASE-A-REAL-COMPLETION:
        //   既存 RLS が user-self INSERT を拒否するため public.users 行を service_role で ensure。
        bootstrapUser().catch((bootErr) => {
          // eslint-disable-next-line no-console
          console.warn('[Lais] bootstrapUser failed:', bootErr && bootErr.message);
        });
        // BUG-RT-LOGIN-REDIRECT-FIX（2026-04-26）:
        // postSignInDestination() で RequireAuth が保存した deeplink を消費しつつ
        // 既定の /grow（S-10 GROW Dashboard）へ復帰する。
        route(postSignInDestination(), true);
      }
    } catch (err) {
      if (!isCurrent()) return;
      safeSetState(() => {
        setServerError(err?.message || '認証に失敗しました');
      });
    } finally {
      // 現行操作のときのみ clearTimeout / inFlight 解除 / submitting 解除
      // opIdRef はリセットせず、次の送信が ++ でさらに進む（ABA 回避）
      if (isCurrent()) {
        clearTimeout(timeoutId);
        inFlightRef.current = false;
        safeSetState(() => setSubmitting(false));
      }
    }
  };

  // H6: Link クリック時の同期ガード（レンダー反映前でも連打を弾く）
  const handleFooterClick = (e) => {
    if (submitting || inFlightRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  /*
   * R4-I aria-describedby ID 存在保証:
   * 下記の各 ID はそれぞれ同じ条件式で条件レンダリングされているため、
   * 参照時点で必ず DOM に存在する（例: emailMissing → <p id="s01-email-missing"/> が描画される）。
   */
  const ctaDescribedBy = [
    emailMissing ? 's01-email-missing' : null,
    emailInvalid ? 's01-email-error' : null,
    passwordTooShort ? 's01-password-short' : null,
    agreeMissing ? 's01-agree-missing' : null,
  ].filter(Boolean).join(' ') || undefined;

  return (
    <main id="main-content" class="s01">
      {/*
        BUG-RT-SIGNIN-LATENCY-REDUCTION（2026-04-26）:
          submitting=true で即時オーバーレイ表示（< 200ms 要件）。
          spec.ts の locator('.s01-signin-overlay').waitFor で計測。
          aria-live=polite + role=status で SR にも告知。
          data-testid="signin-loading-overlay" は実機計測 spec の locator key。
      */}
      {submitting && (
        <div
          class="s01-signin-overlay"
          data-testid="signin-loading-overlay"
          role="status"
          aria-live="polite"
        >
          <div class="s01-signin-overlay-inner">
            <span class="s01-signin-spinner" aria-hidden="true" />
            <p class="s01-signin-overlay-text">サインイン中…</p>
          </div>
        </div>
      )}
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
            ref={passwordInputRef}
            id="s01-password"
            class={`s01-input${passwordTooShort ? ' s01-input-error' : ''}`}
            type="password"
            name="password"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            placeholder={isSignup ? '8文字以上' : 'パスワード'}
            value={password}
            onInput={handlePasswordInput}
            minLength={isSignup ? SIGNUP_MIN_PASSWORD : undefined}
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
        {/*
          BUG-RT-SIGNUP-DUPLICATE-UX: 既登録メアド通知
          - role=status + aria-live=polite で SR ユーザーにも告知（同期遷移なし）
          - 「ログインに切替」ボタンは強制せず、ユーザー操作で signin モードへ遷移
            （誤検出時の救済として自動切替は禁止、設計仕様）
          - メアドは URL クエリで保持（再入力不要、UX 1.4.2 シングルキー保持原則）
        */}
        {duplicateNotice && (
          <div class="s01-duplicate-notice" role="status" aria-live="polite">
            <p class="s01-server-message s01-server-message-notice s01-duplicate-message">
              このメールアドレスは既に登録されています。ログインに切り替えますか？
            </p>
            <button
              type="button"
              class="s01-duplicate-switch"
              onClick={handleSwitchToLogin}
            >
              ログインに切替
            </button>
          </div>
        )}

        {/*
          H3: disabled ではなく aria-disabled を使用。
          disabled だと keyboard ユーザーが form を submit 試行できず、
          attempted 状態に入らないため aria-describedby のエラー原因が読み上げられない。
          aria-disabled + handleSubmit 内の canSubmit ガードで制御する。
        */}
        <button
          type="submit"
          class={`s01-cta${canSubmit ? '' : ' s01-cta-inactive'}`}
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

// PATCH-BUG-RT-AUTH-GATE 補正: App.jsx の lazy() 用 default export
export default S01Auth;
