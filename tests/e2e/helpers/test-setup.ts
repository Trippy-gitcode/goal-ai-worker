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
  // Safari の service-worker は 前 session から persist されている 場合があり、
  // 旧 SW が /api/* に対して 502 を 返し続ける。 全 SW を unregister + cache delete = 完全 reset。
  await page.evaluate(async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (_) {}
  });

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
 * frontend は localhost で WORKER_URL='' のため /api/* が vite dev server に hit して 502。
 * 全 spec で 共通 mock を 配備する standard route handler。
 *   - GET /api/version => { version: 'mock-1.0.0' }
 *   - GET /api/usage => { used: 0, limit: 20, plan: 'trial' }
 *   - GET /api/goals => { goals: [] }
 *   - GET /api/diary?date=... => { date, entry: '' }
 *   - GET /api/me/identity => { id: 'test-user', name: 'Test', plan: 'trial' }
 *   - POST /api/token/validate => { valid: true, plan: 'trial' }
 *   - POST /api/account/age-gate => 204
 *   - POST /api/account/consent/cross-border => 204
 *   - その他 /api/* => 200 {} (未知 endpoint は 安全 fallback)
 *
 * 真 fix の要点: spec が production worker を hammer する 旧 default を 排除して 全 mock 化。
 * production 検証が 必要な spec (= critical_01) は 個別に opt-in (本 helper を 呼ばない)。
 */
export async function installApiMocks(page: Page) {
  // 単一 handler で /api/* + sw.js + RUM を 全部 routing。
  // playwright の route handler は 重複登録すると LIFO で 最新が 呼ばれるが、 単一 dispatcher
  // にしておけば 登録順問題が 発生しない (= shadowing バグ 構造的 防止)。
  // PO 直命 (2026-05-04): 「機械的な仕組み で 背く pattern を 是正」 反映、
  // ハマりやすい 仕様 を 構造的に 排除。
  await page.route('**/*', (route) => {
    const url = route.request().url();
    const method = route.request().method();

    // sw.js を 無効化 (registration は 通すが listener 無し)
    if (url.endsWith('/sw.js')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: '/* sw disabled in test */ self.addEventListener("install", () => self.skipWaiting()); self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));',
      });
    }
    // CF RUM
    if (/cloudflareinsights\.com/.test(url) || /\/cdn-cgi\/rum/.test(url)) {
      return route.fulfill({ status: 204, body: '' });
    }
    // /api/* の dispatcher
    if (/\/api\//.test(url)) {
      // /api/chat/* と /api/voice/* は spec 個別 mock (= installChatMock) に 譲る。
      // dispatcher で 触らず route.fallback() で 次 (= 後 登録) handler に 委譲。
      // 旧版 (空 200 dispatch) で AI response 出なかった root cause。
      if (/\/api\/chat\//.test(url) || /\/api\/voice\//.test(url)) {
        return route.fallback();
      }
      if (/\/api\/version$/.test(url)) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ version: 'mock-1.0.0' }) });
      }
      if (/\/api\/usage(\?|$)/.test(url)) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ used: 0, limit: 20, plan: 'trial', remaining: 20 }) });
      }
      if (/\/api\/goals(\?|$)/.test(url)) {
        if (method === 'GET') {
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ goals: [] }) });
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
      }
      if (/\/api\/diary/.test(url)) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ entry: '', date: new Date().toISOString().slice(0, 10) }) });
      }
      if (/\/api\/me\/identity$/.test(url)) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'test-user', name: 'Test', plan: 'trial' }) });
      }
      if (/\/api\/token\/validate$/.test(url)) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, plan: 'trial' }) });
      }
      if (/\/api\/account\/age-gate$/.test(url)) {
        return route.fulfill({ status: 204, body: '' });
      }
      if (/\/api\/account\/consent\/cross-border$/.test(url)) {
        return route.fulfill({ status: 204, body: '' });
      }
      if (/\/api\/history/.test(url)) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) });
      }
      if (/\/api\/error-report$/.test(url)) {
        return route.fulfill({ status: 204, body: '' });
      }
      // 安全 fallback: 未指定 /api/* は 空 200 で 返す (502 を 避けて 後続 spec を 通す)
      if (method === 'GET' || method === 'HEAD') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    }
    // それ 以外は 通常通り (vite dev server / static files)
    return route.continue();
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

  // /api/* は vite dev server で 502 を 返すため 全 spec で 共通 mock を 先に 配備
  await installApiMocks(page);

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
  // /api/* は vite dev server で 502 を 返すため、 全 spec で 共通 mock を 先に 配備
  await installApiMocks(page);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await seedAppLocalStorage(page);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('#btab-today', { timeout: 15000 });
  // 万一 各種 overlay が race で 出ていたら 確実に 除去
  await removeAnyResidualOverlays(page);
}

/**
 * 既存 setup 済 page を 再 navigate するための 軽量 helper。
 * loadAppForUI 後 inner test で page.goto(BASE) を 呼ぶ 旧 pattern (= localStorage 維持 だが
 * race で overlay が 復活する 可能性 あり) の 真 fix。
 *
 * SUBAGENT-LAIS-PLAYWRIGHT-RESIDUAL-FIX-V2 配備:
 *   test01-checklist.spec.ts 130 tests / test01-ux.spec.ts 143 tests で 多用される
 *   `await page.goto(BASE, { waitUntil: 'domcontentloaded' })` の 1 行 置換用。
 *   navigate 後 必ず removeAnyResidualOverlays を 走らせる ことで race を 構造的 排除。
 */
export async function reloadApp(page: Page, base?: string) {
  const url = base || BASE;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('#btab-today', { timeout: 10000 });
  await removeAnyResidualOverlays(page);
}
