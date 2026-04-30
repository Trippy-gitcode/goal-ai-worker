import { render } from 'preact';
import { App } from './components/App.jsx';
import { ThemeProvider } from './contexts/ThemeProvider.jsx';

/*
 * Stage 7-1 (2026-04-27, STAGE7-1-THEME-FOUNDATION-IMPL-V1):
 *   <ThemeProvider> で全アプリを wrap し、useTheme() / setTheme() を全画面で利用可能にする。
 *   FOUC 防止は index.html の <head> inline script が初回ペイント前に
 *   `localStorage.lais_theme` から data-theme を復元する役割を担う。
 *   onPersist は Stage 7-3 で Supabase profile.theme_preference 連携時に
 *   bootstrap auth 完了後に注入する想定（本 Stage では未注入）。
 */
render(
  <ThemeProvider>
    <App />
  </ThemeProvider>,
  document.getElementById('app')
);

/*
 * Phase B-5 — 認証後主導線 prefetch（PATCH-PB5-CODE-SPLIT、2026-04-25）
 *
 * 戦略:
 * - First Contentful Paint（S00Splash）描画後、idle 時間に S01Auth を prefetch。
 *   Splash → 「はじめる/ログイン」タップ後の体感遅延を解消。
 * - requestIdleCallback サポート時のみ prefetch（古いブラウザは遷移時に load）。
 * - chunk 名は content-hash 付きのため、import() 文を経由して Vite に解決させる。
 *   下記の `import().then(() => {})` はモジュールを評価せず chunk を取得するだけ
 *   （副作用回避のため import() の結果は捨てる、Vite/Rollup が自動 prefetch 化）。
 * - 認証完了後の主導線（S10Grow / S20Talk / S30MeProfile）は Splash 段階では
 *   優先度が低く、未認証ユーザーへ無駄な転送が発生するため prefetch しない。
 *   （認証コールバック完了後の AuthCallback または bootstrapAuth で別途仕掛けるのが
 *   ベストだが、本パッチでは S01Auth のみ対象 — 過剰な早期 prefetch を避ける）
 *
 * 参照: docs/ops/code_splitting.md §4
 */
const idle =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? window.requestIdleCallback
    : (cb) => setTimeout(cb, 1500);

idle(() => {
  // S01Auth は Splash の次に最も訪問頻度が高いルート（はじめる/ログイン）
  import('./components/screens/S01Auth.jsx').catch(() => {
    /* prefetch 失敗は黙殺（実遷移時に再 fetch される）*/
  });
});
