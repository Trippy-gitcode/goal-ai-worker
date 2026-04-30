/*
 * Playwright 設定（軽微整備、LAIS-PHASE4-TEST-SETUP）
 *
 * - testDir: ./tests
 * - baseURL: 環境変数 TEST_BASE_URL で切替（デフォルト http://localhost:5175 = vite.config.js port）
 * - projects: chromium 単独（webkit / firefox は v3.5.x 拡張）
 * - webServer: npm run dev（CI でなければ既存サーバを再利用）
 * - timeout: 30000
 * - retries: CI 2 回 / ローカル 0 回
 *
 * 仕様根拠:
 *   - lais/vite.config.js port: 5175（strictPort: true）
 *   - lais/src/lib/supabase.js は VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY が
 *     未設定だとモジュール評価時に throw する（LP-008）。テストでは page.route()
 *     による Supabase mock 前にロードできないため、テスト用ダミー値を webServer.env に
 *     注入する（実 API キー / Supabase キーは絶対にハードコード禁止）。
 *
 * 参考: dev_system_v34_package.md §2.25.16.6 必須参照マトリクス（QA カテゴリ）
 */
import { defineConfig, devices } from '@playwright/test';

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5175';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: TEST_BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: TEST_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      // Supabase クライアントのモジュール評価時 throw を回避するためのダミー値。
      // 実 API キー / 実 Supabase URL は絶対に設定しない（page.route() で全リクエストをモックする）。
      // 注意: CSP `connect-src https://*.supabase.co` を満たすため `*.supabase.co` 配下の
      // ダミー host を使用する。test.supabase.invalid は CSP 違反で fetch がブロックされ、
      // page.route がインターセプトする前に Failed to fetch を起こすため避ける。
      VITE_SUPABASE_URL: 'https://playwright-test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'sb_publishable_test_dummy_key_for_playwright',
    },
  },
});
