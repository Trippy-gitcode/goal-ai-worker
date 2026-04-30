/*
 * CF Pages 実機テスト専用 Playwright 設定（LAIS-CF-REDEPLOY-2026-04-26）
 *
 * - 標準 playwright.config.ts は webServer (npm run dev) を起動しローカル 5175 を叩く。
 *   実 CF Pages URL を叩く本テストでは webServer 不要のため、専用設定を分離。
 * - baseURL は env TEST_BASE_URL（必須）。デフォルトは新デプロイ URL を fallback として記載。
 * - 実行: TEST_BASE_URL=https://4f376031.lais-3yk.pages.dev npx playwright test \
 *           --config=playwright.cf.config.ts tests/smoke/cf-redeploy-2026-04-26.spec.ts
 */
import { defineConfig, devices } from '@playwright/test';

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'https://4f376031.lais-3yk.pages.dev';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: TEST_BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // PATCH-TEST-GAP-LOGIN-REDIRECT-IMPL（2026-04-26）: video 添付必須化
    // 既存 'retain-on-failure' から 'on' に拡張、PASS 時も録画保持して Phase 完了添付ログ用に確実な証跡化
    video: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // webServer 無し（実機 URL を直接叩く）
});
