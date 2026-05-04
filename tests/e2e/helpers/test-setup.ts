/**
 * GOAL AI — Test Setup Helpers
 * Common setup for all localhost E2E tests
 *
 * SUBAGENT-LAIS-PLAYWRIGHT-FAIL-SPEC-FIX-V1 (2026-05-04):
 *   age gate overlay (frontend/js/age_gate.js) z-index 99998 が page 全体を 覆い、
 *   bottom-tabs / hamburger / chat input click を 全 intercept = PC Chrome 全 spec 失敗 root cause。
 *   helper で localStorage('goal_age_gate_passed') = JSON({passed:true,minAge:13}) を 事前 注入
 *   = age gate 表示 path skip = 真 fix。
 *   bypass / skip ではなく、 ログイン済み user state を 再現する 標準 helper として 整備。
 */

import { Page } from '@playwright/test';

const BASE = process.env.FRONTEND_BASE || 'http://localhost:5173';

// Pre-registered test token (dev_test123 deviceId)
const TEST_TOKEN = 'goal_test_7BDSzrA2f3pzQN0z2yNGYSKS';

// Production worker URL — used for cookie domain alignment when FRONTEND_BASE points to prod.
// localhost session の場合 hostname=localhost、 production の場合 goal-ai-frontend.pages.dev。

/**
 * 全 spec が 共通で 通過する 事前 storage state を localStorage に 注入。
 * - goal_age_gate_passed: age gate overlay (z-index 99998) が page を 覆うのを 防止
 * - ob_done: onboarding modal を skip
 * - 必要に応じて auth token も localStorage に 直書き (cookie 設定不能 host 用 fallback)
 */
async function seedAppLocalStorage(page: Page) {
  await page.evaluate(({ token }) => {
    // age gate を 通過済み state に 固定 (frontend/js/age_gate.js の MIN_AGE=13 と整合)
    try {
      localStorage.setItem(
        'goal_age_gate_passed',
        JSON.stringify({ passed: true, minAge: 13, ts: Date.now() }),
      );
    } catch (_) {}
    // 個情法 §28 cross border consent modal (frontend/js/cross_border_consent_modal.js) を skip
    // CONSENT_VERSION = '2026-05-02-v1' は modal 側 と 同期 必要。 改訂時 here も bump。
    try {
      localStorage.setItem(
        'goal_cross_border_consent',
        JSON.stringify({ granted: true, version: '2026-05-02-v1', ts: Date.now() }),
      );
    } catch (_) {}
    // onboarding modal を skip
    try { localStorage.setItem('ob_done', '1'); } catch (_) {}
    // auth token を localStorage にも 注入 (cookie 経路の補強)
    try { localStorage.setItem('goal_auth_token', token); } catch (_) {}
    try { localStorage.setItem('authToken', token); } catch (_) {}
  }, { token: TEST_TOKEN });
}

/**
 * race で 出ていた 各種 overlay (age_gate / cbc / onboarding) を 強制除去。
 * loadAppReady / loadAppForUI から call される。
 */
async function removeAnyResidualOverlays(page: Page) {
  await page.evaluate(() => {
    const ids = ['age-gate-overlay', 'cbc-modal-overlay', 'onboarding-modal'];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }
  });
}

/**
 * Load the app with standard test setup:
 * - Inject valid auth token (skips auto-register API call)
 * - Skip onboarding modal
 * - Skip age gate overlay (z-index 99998 が click を 全 intercept する root cause)
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
  await seedAppLocalStorage(page);

  // Reload with all settings applied
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('#btab-today', { timeout: 10000 });
  // 万一 各種 overlay が race で 出ていたら 確実に 除去
  await removeAnyResidualOverlays(page);
}

/**
 * 既存 spec で page.goto() 直後に #btab-today を 待つだけの 軽量 setup を 行う 用 helper。
 * baseline.spec.ts のような auth 不要の UI smoke 系 で 利用。
 *   1. localStorage 事前注入のため initial goto は domcontentloaded only で 軽く
 *   2. age gate と onboarding state を 注入
 *   3. 再度 goto して app state が 反映された 状態で UI 待ち
 */
export async function loadAppForUI(page: Page, base?: string) {
  const url = base || BASE;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await seedAppLocalStorage(page);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('#btab-today', { timeout: 15000 });
  // 万一 各種 overlay が race で 出ていたら 確実に 除去
  await removeAnyResidualOverlays(page);
}
