// E2E-PERSONA-PARALLEL-VERIFY-V2 (2026-05-03)
// PO 直命 v2: 視覚障害者 persona は スコープ対象外 (a11y project 削除)。
// 4 device persona × 全 spec 並行実行を可能にする projects 配備。
// 既存単一 viewport (390x844) は CI 実機 device 別バグ検出 0 状態を解消できないため、
// iPhone Safari / Android Chrome / PC Chrome / iPad の 4 persona を追加。
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e/specs',
  timeout: 30000,
  retries: 1,
  // workers=4 で 4 persona 並行 (各 persona は内部で worker pool を再利用)
  fullyParallel: true,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'tests/e2e/playwright-report' }],
    ['json', { outputFile: 'tests/e2e/playwright-report/results.json' }],
  ],
  // PO 直命 (2026-05-04): 「ローカル テストで バグを潰した 後に 本番 テスト 1 回 すれば 良くない？」 = 完全正解。
  // 旧 default = 本番 URL = テスト走らせる たび Cloudflare 大量消費 (= 91% 警報 root cause)。
  // 新 default = ローカル (http://localhost:5173 = vite dev server) = Cloudflare 0 消費。
  // 本番 test 1 回 mode: `FRONTEND_BASE=https://goal-ai-frontend.pages.dev npx playwright test` で env 切替。
  use: {
    baseURL: process.env.FRONTEND_BASE || 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  // webServer: ローカル mode で test 開始時 自動で vite dev server 起動 + ready 待ち + test 終了時 停止
  // 本番 mode (FRONTEND_BASE 指定時) は webServer skip (= 本物の本番 hit)
  webServer: process.env.FRONTEND_BASE ? undefined : {
    command: 'cd frontend && npm run dev -- --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
  projects: [
    // P1: iPhone Safari (375x667 iOS 16 縦)
    {
      name: 'iphone-safari',
      use: {
        ...devices['iPhone SE'],
        viewport: { width: 375, height: 667 },
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      },
    },
    // P2: Android Chrome (393x873 Android 14 縦)
    {
      name: 'android-chrome',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 873 },
        userAgent:
          'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
      },
    },
    // P3: PC Chrome (1280x720 デスクトップ)
    {
      name: 'pc-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    // P4: iPad (768x1024 タブレット)
    {
      name: 'ipad',
      use: {
        ...devices['iPad (gen 7)'],
        viewport: { width: 768, height: 1024 },
        userAgent:
          'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      },
    },
  ],
});
