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

/*
 * BUG-RT-SIGNUP-DUPLICATE-UX 補正（2026-04-26）:
 * Supabase は既登録メールアドレスでの signUp 試行に対して
 *  - confirm email 経由では `data.user` を返すが `identities` 配列が空 (`[]`)
 *  - レアケースで `error.message` に "already registered" / "User already registered" を返す
 * のいずれかで重複を通知する仕様（公式: supabase-js v2 + GoTrue）。
 * 確認メールは送信されないため、UI で明示的に通知しないと
 * ユーザーは「メール届かない」と困り続けるバグになる。
 *
 * 検出パターンは UX 層で参照しやすい helper として export し、
 * S01Auth.jsx 側で `isDuplicateEmailSignup(...)` で判定する。
 */
export function isDuplicateEmailSignup(data, error) {
  // パターン A: error.message に "already registered" が含まれる
  if (error && typeof error.message === 'string') {
    const msg = error.message.toLowerCase();
    if (msg.includes('already registered') || msg.includes('user already registered')) {
      return true;
    }
  }
  // パターン B: data.user.identities が空配列（confirm email 必須プロジェクトの重複検出）
  // identities は Supabase が provider ごとに 1 件入れるため、新規ユーザーなら必ず 1 件以上。
  // 既登録ユーザーで signUp を叩いた場合のみ length === 0 となる。
  if (data && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return true;
  }
  return false;
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

/*
 * BUG-RT-LOGIN-REDIRECT-FIX（2026-04-26）:
 * signin / AuthCallback / Splash 自動遷移で「signed-in なら何処へ復帰すべきか」を
 * 一元化する helper。
 *
 * 優先順位:
 *  1. RequireAuth が保存した sessionStorage['lais.deeplink']（未認証時の元 URL）
 *  2. それが無い / 取得失敗（Safari private mode 等）→ '/grow'（S-10 GROW Dashboard）
 *
 * 既存仕様:
 *  - RequireAuth.jsx は未認証で protected route を踏むと
 *    `lais.deeplink` に `pathname + search` を保存して `/auth?mode=login` へ replace。
 *  - 復帰先が `/`（Splash）/`/auth*` の場合は不正値とみなし `/grow` にフォールバック。
 *
 * SSoT: UX §14.1 リピーターフロー（signed-in は Splash を経由しない）。
 */
export function postSignInDestination() {
  let dest = '/grow';
  try {
    if (typeof sessionStorage === 'undefined') return dest;
    const saved = sessionStorage.getItem('lais.deeplink');
    if (saved && typeof saved === 'string' && saved.startsWith('/') &&
        saved !== '/' && !saved.startsWith('/auth')) {
      dest = saved;
    }
    // 一度復帰したら消費（次回ピンポンを避ける）
    sessionStorage.removeItem('lais.deeplink');
  } catch {
    // sessionStorage 不可: '/grow' フォールバックで継続
  }
  return dest;
}
