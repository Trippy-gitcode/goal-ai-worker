/*
 * CF Pages 再デプロイ実機スモーク（LAIS-CF-REDEPLOY-2026-04-26）
 *
 * 目的: 新デプロイ URL (TEST_BASE_URL=https://4f376031.lais-3yk.pages.dev) に対し
 *      BUG-RT-01 / BUG-RT-AUTH-GATE 解消 + 既存 12 ルート PASS 維持を実機検証。
 *
 * 設計:
 * - mock 不使用（CF Pages 実機 = 実 Supabase へ向く本番バンドル）
 * - 未認証セッションが既定（手動ログインしていないため supabase.auth.getSession() は null）
 * - protected route は RequireAuth → /auth?mode=login redirect、main.s01 で観測可能
 * - 公開ルート (/, /auth?mode=login, /auth?mode=signup, /auth/callback) は素通し
 * - /goal/create は protected。BUG-RT-01 は "id=create が S14 GoalDetail (.s14-goal) に
 *   吸収されないこと" を否定検証で確認、redirect 後 .s01 を観測することで二重確認。
 *
 * 仕様根拠:
 * - lais/src/components/App.jsx GoalCreateRoute（/goal/create を /goal/:id より前に登録）
 * - lais/src/components/shared/RequireAuth.jsx（未認証→/auth?mode=login replace）
 * - lais/logs/smoke_results.log（既存 PASS ベースライン）
 *
 * クラス対応表（main role の root class を観測）:
 *   s00       = main.s00              （S00Splash）
 *   s01       = main.s01              （S01Auth）
 *   s02       = .s02-onboarding       （S02Onboarding、main 要素ではないが root 観測可）
 *   s10       = .s10-grow
 *   s14       = .s14-goal
 *   s15       = .s15-modal
 *   s20       = .s20-talk
 *   s30       = .s30-me
 *   callback  = main.auth-callback
 */
import { test, expect } from '@playwright/test';

const ROUTE_SWEEP = [
  { name: 'S00_root',                 path: '/',                  rootSel: 'main.s00' },
  { name: 'S01_signin',               path: '/auth?mode=login',   rootSel: 'main.s01' },
  { name: 'S01_signup',               path: '/auth?mode=signup',  rootSel: 'main.s01' },
  // /auth/callback は code 欠落で 2 秒 fallback → S01 へ。redirect 後 .s01 を観測。
  { name: 'AuthCallback_no_code',     path: '/auth/callback',     rootSel: 'main.s01' },
  // 以下 protected → 未認証で /auth?mode=login redirect → main.s01
  { name: 'authgate_onboarding',      path: '/onboarding',        rootSel: 'main.s01' },
  { name: 'authgate_grow',            path: '/grow',              rootSel: 'main.s01' },
  { name: 'authgate_goal_detail',     path: '/goal/sample-id',    rootSel: 'main.s01' },
  { name: 'authgate_talk',            path: '/talk',              rootSel: 'main.s01' },
  { name: 'authgate_me',              path: '/me',                rootSel: 'main.s01' },
  // NotFound 系 → SPA トップ /
  { name: 'NotFound_S12_taskadd',     path: '/task/add',          rootSel: 'main.s00' },
  { name: 'NotFound_S13_taskdetail',  path: '/task/sample-id',    rootSel: 'main.s00' },
];

test.describe('CF Pages 再デプロイ実機スモーク（LAIS-CF-REDEPLOY-2026-04-26）', () => {
  test('BUG-RT-01: /goal/create は S14 (.s14-goal) に吸収されず、未認証で /auth?mode=login redirect', async ({ page }) => {
    await page.goto('/goal/create');
    await page.waitForURL(/\/auth\?mode=login/, { timeout: 15_000 });
    await expect(page.locator('main.s01')).toBeVisible({ timeout: 5_000 });
    // 否定: S14 GoalDetail に id="create" で吸収されていない
    await expect(page.locator('.s14-goal')).toHaveCount(0);
  });

  test('BUG-RT-AUTH-GATE: /grow 未認証で /auth?mode=login redirect', async ({ page }) => {
    await page.goto('/grow');
    await page.waitForURL(/\/auth\?mode=login/, { timeout: 15_000 });
    await expect(page.locator('main.s01')).toBeVisible({ timeout: 5_000 });
  });

  test('BUG-RT-AUTH-GATE: /me 未認証で /auth?mode=login redirect', async ({ page }) => {
    await page.goto('/me');
    await page.waitForURL(/\/auth\?mode=login/, { timeout: 15_000 });
    await expect(page.locator('main.s01')).toBeVisible({ timeout: 5_000 });
  });

  test('BUG-RT-AUTH-GATE: /onboarding 未認証で /auth?mode=login redirect', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForURL(/\/auth\?mode=login/, { timeout: 15_000 });
    await expect(page.locator('main.s01')).toBeVisible({ timeout: 5_000 });
  });

  test('BUG-RT-AUTH-GATE: /talk 未認証で /auth?mode=login redirect', async ({ page }) => {
    await page.goto('/talk');
    await page.waitForURL(/\/auth\?mode=login/, { timeout: 15_000 });
    await expect(page.locator('main.s01')).toBeVisible({ timeout: 5_000 });
  });

  for (const r of ROUTE_SWEEP) {
    test(`既存 ROUTE_SWEEP: ${r.name} ${r.path} → ${r.rootSel}`, async ({ page }) => {
      const resp = await page.goto(r.path);
      expect(resp?.status(), `HTTP status for ${r.path}`).toBe(200);
      await expect(page.locator(r.rootSel).first()).toBeVisible({ timeout: 15_000 });
    });
  }
});
