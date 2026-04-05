/**
 * GOAL AI — Test Setup Helpers
 * Common setup for all localhost E2E tests
 */

import { Page } from '@playwright/test';

const BASE = process.env.FRONTEND_BASE || 'http://localhost:4173';

// Pre-registered test token (dev_test123 deviceId)
const TEST_TOKEN = 'goal_test_7BDSzrA2f3pzQN0z2yNGYSKS';

/**
 * Load the app with standard test setup:
 * - Inject valid auth token (skips auto-register API call)
 * - Skip onboarding modal
 * - Wait for main UI to be ready
 */
export async function loadAppReady(page: Page, base?: string) {
  const url = base || BASE;
  const hostname = new URL(url).hostname;

  // Set auth cookie before page load
  await page.context().addCookies([{
    name: 'goal_auth_token',
    value: TEST_TOKEN,
    domain: hostname,
    path: '/',
  }]);

  // First load to set localStorage
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.evaluate(() => {
    localStorage.setItem('ob_done', '1');
  });

  // Reload with all settings applied
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('#btab-today', { timeout: 10000 });
}
