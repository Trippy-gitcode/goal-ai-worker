import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: process.env.FRONTEND_BASE || 'https://goal-ai-frontend.pages.dev',
    headless: true,
    viewport: { width: 390, height: 844 }, // iPhone 14
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
    { name: 'mobile-se', use: { viewport: { width: 320, height: 568 } } },
    { name: 'mobile-plus', use: { viewport: { width: 414, height: 896 } } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 720 } } },
  ],
  outputDir: '../screenshots/test-results',
});
