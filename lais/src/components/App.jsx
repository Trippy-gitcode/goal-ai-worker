import { useCallback, useEffect } from 'preact/hooks';
import { lazy, Suspense } from 'preact/compat';
import Router, { route } from 'preact-router';
import { S00Splash } from './screens/S00Splash.jsx';
import { ErrorBoundary } from './shared/ErrorBoundary.jsx';
import { Loading } from './shared/Loading.jsx';
import { RequireAuth } from './shared/RequireAuth.jsx';
import '../components/shared/ErrorBoundary.css';
import { bootstrapAuth } from '../lib/auth.js';

/*
 * Phase B-5 — ルートレベル コード分割（PATCH-PB5-CODE-SPLIT、2026-04-25）
 *
 * 設計方針:
 * - S00Splash は First Contentful Paint（FCP）画面のため eager import を維持。
 *   初期 bundle に含まれることで遷移ゼロ秒で描画可能。
 * - 認証系（S01Auth / AuthCallback）と全アプリ画面は lazy() で chunk 分離。
 *   - S01Auth: Splash の「はじめる/ログイン」操作後にだけ必要。
 *   - AuthCallback: メール確認 / OAuth コールバックでだけ必要（直接到達は稀）。
 *   - S02Onboarding 以降: 認証完了後にしか到達しない。
 * - Suspense fallback は共通 Loading コンポーネント（components/shared/Loading.jsx）を使用。
 *
 * 参照: docs/ops/code_splitting.md / vite.config.js manualChunks / LP-012
 */
const S01Auth = lazy(() => import('./screens/S01Auth.jsx'));
const AuthCallback = lazy(() => import('./screens/AuthCallback.jsx'));
const S02Onboarding = lazy(() => import('./screens/S02Onboarding.jsx'));
const S10Grow = lazy(() => import('./screens/S10Grow.jsx'));
const S11DiaryLog = lazy(() => import('./screens/S11DiaryLog.jsx'));
const S12TaskAdd = lazy(() => import('./screens/S12TaskAdd.jsx'));
const S13TaskDetail = lazy(() => import('./screens/S13TaskDetail.jsx'));
const S14GoalDetail = lazy(() => import('./screens/S14GoalDetail.jsx'));
const S15GoalCreate = lazy(() => import('./screens/S15GoalCreate.jsx'));
const S20Talk = lazy(() => import('./screens/S20Talk.jsx'));
const S30MeProfile = lazy(() => import('./screens/S30MeProfile.jsx'));
const S31Notifications = lazy(() => import('./screens/S31Notifications.jsx'));
const S32Export = lazy(() => import('./screens/S32Export.jsx'));
const S33DeleteAccount = lazy(() => import('./screens/S33DeleteAccount.jsx'));
const S40PrivacyPolicy = lazy(() => import('./screens/S40PrivacyPolicy.jsx'));
const S41TermsOfService = lazy(() => import('./screens/S41TermsOfService.jsx'));
const S42About = lazy(() => import('./screens/S42About.jsx'));
const S43NotFound = lazy(() => import('./screens/S43NotFound.jsx'));
const S50Stats = lazy(() => import('./screens/S50Stats.jsx'));
const S60Search = lazy(() => import('./screens/S60Search.jsx'));

export function App() {
  // bootstrapAuth は module-scope flag で多重実行をガード済みのため、
  // StrictMode / HMR による再マウントでも安全。SSR/prerender 将来対応のため
  // module top-level の副作用ではなく、クライアントマウント後に実行する。
  useEffect(() => {
    bootstrapAuth();
  }, []);

  const handleStart = () => route('/auth?mode=signup');
  const handleLogin = () => route('/auth?mode=login');

  // PATCH-PB4-ERROR-BOUNDARY: 二重防御
  // - 外側 ErrorBoundary: Router 全体をラップ。Router / route() / 静的 import 画面の
  //   レンダリング中に投げられた予期せぬエラーを最終キャッチし、白画面を防ぐ。
  // - 内側 ErrorBoundary: <LazyRoute> 内で個別画面をラップ。Suspense 連携 + 個別画面の
  //   失敗を Router 全体に波及させない（個別画面ごとに「再試行」可能）。
  // 静的 import 画面（S00Splash / S01Auth / AuthCallback）は内側 ErrorBoundary を持たないため、
  // 個別ラッパ（StaticRoute）で各画面をラップする。
  //
  // Stage 7-4 prep (TASK-STAGE7-4-PREP-DEBT-CLEANUP-V1, 2026-04-29):
  // - WCAG 2.4.1 (Bypass Blocks Level A) 準拠の skip-link を最上位に挿入.
  //   各 Route の <main> 要素は id="main-content" を持つ運用 (Stage 7-3 既存 + 本ミッションで補完).
  return (
    <div class="app-root">
      <a class="skip-link" href="#main-content">メインコンテンツへスキップ</a>
      <ErrorBoundary>
        <Router>
          <SplashRoute path="/" onStart={handleStart} onLogin={handleLogin} />
          <AuthCallbackRoute path="/auth/callback" />
          <AuthRoute path="/auth" />
          <OnboardingRoute path="/onboarding" />
          <GrowRoute path="/grow" />
          <DiaryLogRoute path="/log" />
          <TaskAddRoute path="/task/add" />
          <TaskDetailRoute path="/task/:id" />
          <GoalCreateRoute path="/goal/create" />
          <GoalDetailRoute path="/goal/:id" />
          <TalkRoute path="/talk" />
          <MeProfileRoute path="/me" />
          <SettingsNotificationsRoute path="/settings/notifications" />
          <SettingsExportRoute path="/settings/export" />
          <SettingsDeleteRoute path="/settings/delete" />
          <PrivacyRoute path="/privacy" />
          <TermsRoute path="/terms" />
          <AboutRoute path="/about" />
          <StatsRoute path="/stats" />
          <SearchRoute path="/search" />
          <SearchRoute path="/search/:rest*" />
          <NotFoundScreenRoute path="/404" />
          <NotFound default />
        </Router>
      </ErrorBoundary>
    </div>
  );
}

// 静的 import 画面用ラッパ。Suspense は不要だが ErrorBoundary は個別注入。
function StaticRoute({ children, label }) {
  return <ErrorBoundary label={label}>{children}</ErrorBoundary>;
}

function SplashRoute({ onStart, onLogin }) {
  return (
    <StaticRoute label="スプラッシュの読み込みに失敗しました">
      <S00Splash onStart={onStart} onLogin={onLogin} />
    </StaticRoute>
  );
}

function AuthRoute({ url }) {
  const search = url && url.includes('?') ? url.slice(url.indexOf('?')) : '';
  const params = new URLSearchParams(search);
  const mode = params.get('mode') === 'login' ? 'login' : 'signup';
  return (
    <LazyRoute label="認証画面の読み込みに失敗しました">
      <S01Auth mode={mode} />
    </LazyRoute>
  );
}

function AuthCallbackRoute() {
  return (
    <LazyRoute label="認証コールバックでエラーが発生しました">
      <AuthCallback />
    </LazyRoute>
  );
}

function LazyRoute({ children, label }) {
  return (
    <ErrorBoundary label={label}>
      <Suspense fallback={<Loading />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

// PATCH-BUG-RT-AUTH-GATE（2026-04-26）: 以下 6 関数は protected route。
// 未認証セッションでの直 URL アクセスを RequireAuth で遮断 → /auth?mode=login redirect。
// 仕様根拠: UX §14.1 / project §3.5 / §14.2、SPEC-CHECK §1.5。
// 公開ルート（/, /auth, /auth/callback）はラップしない。

function OnboardingRoute() {
  return (
    <RequireAuth>
      <LazyRoute><S02Onboarding /></LazyRoute>
    </RequireAuth>
  );
}

function GrowRoute() {
  return (
    <RequireAuth>
      <LazyRoute><S10Grow /></LazyRoute>
    </RequireAuth>
  );
}

function GoalCreateRoute() {
  // BUG-RT-01 修正（PATCH-LAIS-PHASE-A-ROUTER-S15、2026-04-26）
  // /goal/create を /goal/:id より前に登録し、id="create" 吸収を防ぐ。
  // S15GoalCreate はハーフモーダル設計のため open=true で常時表示、
  // onClose は SPA トップ /grow へ route で復帰、onCreate は当面 console.log 維持。
  //
  // PATCH-BUG-RT-S15-MODAL-CLOSE-FIX V3（2026-04-26）:
  // - 旧実装は onClose / onCreate をインライン arrow で渡しており、毎レンダで identity が churn。
  //   S15GoalCreate 内部は ref 経由で吸収するが、念のため useCallback で stable 化しておく。
  const handleClose = useCallback(() => route('/grow'), []);
  const handleCreate = useCallback((payload) => {
    // Phase A: Supabase 書込は後続、当面 console.log のみ（S15 仕様コメント踏襲）
    console.log('[S15GoalCreate] onCreate', payload);
    route('/grow');
  }, []);
  return (
    <RequireAuth>
      <LazyRoute label="ゴール作成画面の読み込みに失敗しました">
        <S15GoalCreate
          open={true}
          onClose={handleClose}
          onCreate={handleCreate}
        />
      </LazyRoute>
    </RequireAuth>
  );
}

function GoalDetailRoute({ id }) {
  return (
    <RequireAuth>
      <LazyRoute><S14GoalDetail id={id} /></LazyRoute>
    </RequireAuth>
  );
}

function TalkRoute() {
  return (
    <RequireAuth>
      <LazyRoute><S20Talk /></LazyRoute>
    </RequireAuth>
  );
}

function MeProfileRoute() {
  return (
    <RequireAuth>
      <LazyRoute><S30MeProfile /></LazyRoute>
    </RequireAuth>
  );
}

/*
 * Stage 7-3 新規 Route 群 (21 画面テーマ適用、STAGE-7-3-THEME-APPLY-21-SCREENS).
 * 設定系 / 静的ページ / 統計 / 検索 / 日記 / 404 を SPA 内 route として配信する。
 * - /privacy /terms は SPA route 化、`STATIC_PATHS` 配列から除外。
 */
function DiaryLogRoute() {
  return (
    <RequireAuth>
      <LazyRoute><S11DiaryLog /></LazyRoute>
    </RequireAuth>
  );
}

function TaskAddRoute() {
  const handleClose = useCallback(() => route('/grow'), []);
  const handleCreate = useCallback((payload) => {
    // eslint-disable-next-line no-console
    console.log('[S12TaskAdd] onCreate', payload);
    route('/grow');
  }, []);
  return (
    <RequireAuth>
      <LazyRoute><S12TaskAdd open onClose={handleClose} onCreate={handleCreate} /></LazyRoute>
    </RequireAuth>
  );
}

function TaskDetailRoute({ id }) {
  const handleClose = useCallback(() => route('/grow'), []);
  // 表示用のダミー task オブジェクト (実 fetch は後続フェーズで wire)
  const task = { id, name: 'タスク詳細', status: 'scheduled', category: 'work' };
  return (
    <RequireAuth>
      <LazyRoute><S13TaskDetail open task={task} onClose={handleClose} /></LazyRoute>
    </RequireAuth>
  );
}

function SettingsNotificationsRoute() {
  return (
    <RequireAuth>
      <LazyRoute><S31Notifications /></LazyRoute>
    </RequireAuth>
  );
}

function SettingsExportRoute() {
  return (
    <RequireAuth>
      <LazyRoute><S32Export /></LazyRoute>
    </RequireAuth>
  );
}

function SettingsDeleteRoute() {
  return (
    <RequireAuth>
      <LazyRoute><S33DeleteAccount /></LazyRoute>
    </RequireAuth>
  );
}

function PrivacyRoute() {
  return (
    <LazyRoute><S40PrivacyPolicy /></LazyRoute>
  );
}

function TermsRoute() {
  return (
    <LazyRoute><S41TermsOfService /></LazyRoute>
  );
}

function AboutRoute() {
  return (
    <RequireAuth>
      <LazyRoute><S42About /></LazyRoute>
    </RequireAuth>
  );
}

function StatsRoute() {
  return (
    <RequireAuth>
      <LazyRoute><S50Stats /></LazyRoute>
    </RequireAuth>
  );
}

function SearchRoute() {
  return (
    <RequireAuth>
      <LazyRoute><S60Search /></LazyRoute>
    </RequireAuth>
  );
}

function NotFoundScreenRoute() {
  return (
    <LazyRoute><S43NotFound /></LazyRoute>
  );
}

/*
 * 旧仕様 fallback: /terms /privacy がブラウザレベル fullnav に逃げていた挙動を
 * Stage 7-3 で SPA 化したため、STATIC_PATHS は空配列に縮める。
 */
const STATIC_PATHS = [];
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
      // R4 CRITICAL fix: sessionStorage が使えない環境 (Safari private mode 等) では
      // ガードが機能しないため、location.replace を試行すると無限リロードになる。
      // store が null の場合は安全のため SPA トップへフォールバック。
      if (!store) {
        route('/', true);
        return;
      }
      const guard = store.getItem(STATIC_NAV_GUARD_KEY);
      if (guard === path) {
        // 直前にフルナビを試行済み = 配信側が 404 の可能性 → SPA トップへフォールバック
        store.removeItem(STATIC_NAV_GUARD_KEY);
        route('/', true);
        return;
      }
      store.setItem(STATIC_NAV_GUARD_KEY, path);
      // J: replace で history を増やさない（戻るボタンのピンポン防止）
      window.location.replace(path);
      return;
    }
    try { store?.removeItem(STATIC_NAV_GUARD_KEY); } catch { /* ignore */ }
    route('/', true);
  }, [url]);
  return null;
}
