import { useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { session, authLoading, postSignInDestination } from '../../lib/auth.js';
import './S00Splash.css';

/*
 * S00Splash — Lais スプラッシュ（FCP 画面）
 *
 * BUG-RT-LOGIN-REDIRECT-FIX（2026-04-26）:
 * UX §14.1 リピーターフロー: signed-in 状態で `/` を踏んだ場合、Splash は
 * ログイン CTA を出すと混乱を招く（「もうログインしてるのに」）。
 * authLoading が解け session.value が真なら即 /grow（or deeplink）へ replace 遷移。
 * 旧仕様（常に Splash 表示）は signin 直後に `route('/', true)` でここに戻されると
 * 「ログインできない」と誤認させる原因になっていた。
 *
 * 設計上の注意:
 * - replace=true で history を増やさない（戻るボタンのピンポン防止）。
 * - useEffect 内で route() 呼出（render 中の副作用回避）。
 * - signal の `.value` 参照で reactivity 取得。
 * - authLoading 中は CTA を描画したまま（loading フォールバックで FCP を遅延させない）。
 */
export function S00Splash({ onStart, onLogin }) {
  const sess = session.value;
  const loading = authLoading.value;

  useEffect(() => {
    if (loading) return;
    if (!sess) return;
    // signed-in: deeplink 復帰 or /grow
    route(postSignInDestination(), true);
  }, [loading, sess]);

  return (
    <main id="main-content" class="s00" aria-label="Lais スプラッシュ">
      <div class="s00-center">
        <h1 class="s00-logo">Lais</h1>
        <p class="s00-tagline">あなたの人生を、あなたらしく</p>
      </div>
      <div class="s00-cta">
        <button
          type="button"
          class="s00-cta-primary"
          onClick={onStart}
        >
          はじめる
        </button>
        <button
          type="button"
          class="s00-cta-secondary"
          onClick={onLogin}
        >
          ログイン
        </button>
      </div>
    </main>
  );
}
