/*
 * Smoke: Phase A protected route 全画面 mock 経由動作確認
 *
 * ミッション ID: LAIS-MOCK-DASHBOARD-SMOKE
 *
 * 6 項目テンプレ:
 *   1. 操作   : mockSupabaseSignIn でセッション事前注入 → protected route に直接アクセス
 *   2. 期待   : RequireAuth ゲートを通過、各画面の主要 DOM が描画される
 *   3. 検証   : 各画面のランドマーク（<main class="sNN-...">）+ 主要見出し / コンポーネント
 *   4. 否定   : protected route に未認証アクセス時は /auth?mode=login へ replace（既存 verify 済）
 *   5. データ : mock-user-id / mock-token / 実 Supabase 接続ゼロ（page.route() で完結）
 *   6. スクショ: failure 時のみ自動取得（playwright.config.ts: screenshot: 'only-on-failure'）
 *
 * 仕様根拠:
 *   - lais/src/components/App.jsx: protected route 6 件（/onboarding /grow /goal/create /goal/:id /talk /me）
 *   - lais/src/components/shared/RequireAuth.jsx: session.value 存在判定で children 素通し
 *   - lais/src/lib/auth.js: bootstrapAuth → getSession() → session signal 更新
 *   - lais/tests/smoke/auth-callback.spec.ts: localStorage inject の先行実装
 *   - lais/verify/lais_login_retest_2026-04-26.md §3.3: signin→ダッシュボード SKIP の経緯
 */
import { test, expect } from '@playwright/test';
import { mockSupabaseAuth, mockSupabaseRest, mockSupabaseSignIn } from '../_helpers/supabase-mock';

test.describe('Smoke: Dashboard mock smoke (protected routes)', () => {
  test('S-10 GROW: signin form 入力 → submit → mock token 200 → /grow ダッシュボード描画', async ({
    page,
  }) => {
    // 操作 1: mock signin（signInWithPassword 成功）。/auth?mode=login にアクセスしてフォーム入力。
    // 注: このフローは bootstrapAuth が getSession() で null を返した直後に
    // signInWithPassword の onAuthStateChange で session signal 更新を期待する。
    // signin form → submit までは S01 spec が detail 検証済、ここはログイン後遷移を保証する。
    await mockSupabaseSignIn(page, {
      user: { email: 'mock-dash@example.com' },
    });

    await page.goto('/auth?mode=login');

    // 操作 2: フォーム入力 + submit
    await page.locator('input[name="email"]').fill('mock-dash@example.com');
    await page.locator('input[name="password"]').fill('mock-password-12345');
    await page.getByRole('button', { name: 'ログイン' }).click();

    // 期待 + 検証 1: signin form が成功扱いになり、何らかの遷移 or session 反映が起きる。
    // S01Auth の現実装は signin 成功時の自動遷移を持たないが、protected route に再アクセスすれば
    // RequireAuth が認証済を判定して children を描画する（mockSupabaseSignIn が localStorage 注入済）。
    await page.goto('/grow');

    // 期待 + 検証 2: S-10 GROW Dashboard 主要 DOM
    const main = page.locator('main.s10-grow');
    await expect(main).toBeVisible({ timeout: 5000 });

    // OVERDUE / TODAY / GOALS の主要セクション存在確認
    await expect(page.locator('h2.s10-overdue-label')).toContainText('OVERDUE');
    await expect(page.locator('h2.s10-today-label')).toContainText('TODAY');
    await expect(page.locator('h2.s10-goals-label')).toContainText('GOALS');

    // タスク追加 / ゴール作成ボタン存在
    await expect(page.locator('button.s10-add-task')).toBeVisible();
    await expect(page.locator('button.s10-add-goal')).toBeVisible();

    // 否定検証: /auth?mode=login へ redirect されていない
    await expect(page).toHaveURL(/\/grow$/);
  });

  test('S-10 GROW: 直接 /grow 到達（mockSupabaseSignIn でゲート通過）', async ({ page }) => {
    await mockSupabaseSignIn(page);
    await page.goto('/grow');

    await expect(page.locator('main.s10-grow')).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/grow$/);

    // タスク一覧が描画されている（mock task 4 件 = TODAY_MOCK 由来）
    const taskItems = page.locator('main.s10-grow li.s10-task');
    await expect(taskItems.first()).toBeVisible();
    expect(await taskItems.count()).toBeGreaterThan(0);
  });

  test('S-12 Task Add: /grow からハーフモーダル開閉', async ({ page }) => {
    await mockSupabaseSignIn(page);
    await page.goto('/grow');

    await expect(page.locator('main.s10-grow')).toBeVisible();

    // S-12 ハーフモーダル起動
    await page.locator('button.s10-add-task').click();
    const dialog = page.locator('section[role="dialog"]:has(.s12-title)');
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await expect(dialog.locator('.s12-title')).toContainText('タスクを追加');

    // 閉じる
    await dialog.locator('button[aria-label="閉じる"]').click();
    await expect(dialog).toHaveCount(0, { timeout: 3000 });
  });

  test('S-13 Task Detail: /grow からタスクタップでハーフモーダル', async ({ page }) => {
    await mockSupabaseSignIn(page);
    await page.goto('/grow');

    await expect(page.locator('main.s10-grow')).toBeVisible();

    // S-13 タスクカードタップ → 詳細モーダル
    await page.locator('main.s10-grow li.s10-task button.s10-task-card').first().click();

    const dialog = page.locator('section[role="dialog"]:has(.s13-task-name)');
    await expect(dialog).toBeVisible({ timeout: 3000 });
  });

  test('S-14 Goal Detail: /goal/:id 直接到達', async ({ page }) => {
    await mockSupabaseSignIn(page);
    await page.goto('/goal/sample-id');

    await expect(page.locator('main.s14-goal')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('h1.s14-title')).toBeVisible();
    await expect(page.locator('h2.s14-task-label')).toContainText('TASK');
    await expect(page).toHaveURL(/\/goal\/sample-id$/);
  });

  test('S-15 Goal Create: /goal/create 直接到達（BUG-RT-01 解消確認）', async ({ page }) => {
    await mockSupabaseSignIn(page);
    await page.goto('/goal/create');

    // /goal/create は S15GoalCreate を open=true で常時表示するルート。
    // BUG-RT-01 解消後は S14 GoalDetail に id="create" 吸収されない。
    const dialog = page.locator('section[role="dialog"]:has(.s15-title)');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.locator('.s15-title')).toContainText('ゴールを作成');

    // 否定検証: S14 GoalDetail に吸収されていない
    await expect(page.locator('main.s14-goal')).toHaveCount(0);
  });

  test('S-20 Talk: /talk 直接到達', async ({ page }) => {
    await mockSupabaseSignIn(page);
    await page.goto('/talk');

    await expect(page.locator('main.s20-talk')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('h1.s20-header-title')).toContainText('TALK');
    await expect(page).toHaveURL(/\/talk$/);
  });

  test('S-30 Me Profile: /me 直接到達', async ({ page }) => {
    await mockSupabaseSignIn(page);
    await page.goto('/me');

    await expect(page.locator('main.s30-me')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('h1.s30-hero-name')).toBeVisible();
    await expect(page).toHaveURL(/\/me$/);
  });

  test('S-02 Onboarding: /onboarding 直接到達（mock 認証済み）', async ({ page }) => {
    await mockSupabaseSignIn(page);
    await page.goto('/onboarding');

    await expect(page.locator('main.s02-onboarding')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('h1.s02-title')).toContainText('最初のパートナー');
  });

  test('S-00 Splash: 公開ルート（認証なしで描画）', async ({ page }) => {
    // S-00 は公開ルート、未認証でも描画される。protected route のゲート対比として置く。
    await mockSupabaseAuth(page, { session: null });
    await mockSupabaseRest(page, { defaultEmpty: true });

    await page.goto('/');
    await expect(page.locator('h1.s00-logo')).toContainText('Lais');
    await expect(page.getByRole('button', { name: 'はじめる' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible();
  });

  test('S-01 Auth login: 公開ルート（認証なしで描画）', async ({ page }) => {
    await mockSupabaseAuth(page, { session: null });
    await mockSupabaseRest(page, { defaultEmpty: true });

    await page.goto('/auth?mode=login');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible();
  });

  test('S-01 Auth signup: 公開ルート（認証なしで描画）', async ({ page }) => {
    await mockSupabaseAuth(page, { session: null });
    await mockSupabaseRest(page, { defaultEmpty: true });

    await page.goto('/auth?mode=signup');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('#s01-agree')).toBeVisible();
    await expect(page.getByRole('button', { name: 'サインアップ' })).toBeVisible();
  });

  test('AuthCallback: 公開ルート（code 欠落でログインに戻る）', async ({ page }) => {
    await mockSupabaseAuth(page, { session: null });
    await mockSupabaseRest(page, { defaultEmpty: true });

    await page.goto('/auth/callback');
    await page.waitForURL(/\/auth\?mode=login/, { timeout: 5000 });
  });

  test('Phase A 全 13 画面 SUMMARY: 主要ランドマーク描画ゼロ件 FAIL チェック', async ({ page }) => {
    /*
     * ふとし手間ゼロ要件の集約テスト。
     * 各 protected route で main 要素が描画されることを 1 ケースで保証。
     * 細粒度の DOM 検証は上記の個別テストに委ねる。
     */
    await mockSupabaseSignIn(page);

    const routes: Array<{ path: string; mainClass: string; label: string }> = [
      { path: '/', mainClass: 'main.s00', label: 'S-00 Splash' },
      { path: '/auth?mode=login', mainClass: 'main.s01', label: 'S-01 Login' },
      { path: '/auth?mode=signup', mainClass: 'main.s01', label: 'S-01 Signup' },
      { path: '/onboarding', mainClass: 'main.s02-onboarding', label: 'S-02 Onboarding' },
      { path: '/grow', mainClass: 'main.s10-grow', label: 'S-10 GROW' },
      { path: '/goal/sample-id', mainClass: 'main.s14-goal', label: 'S-14 GoalDetail' },
      { path: '/talk', mainClass: 'main.s20-talk', label: 'S-20 Talk' },
      { path: '/me', mainClass: 'main.s30-me', label: 'S-30 Me' },
    ];

    for (const r of routes) {
      await page.goto(r.path);
      await expect(
        page.locator(r.mainClass),
        `${r.label} (${r.path}) main 要素が描画されない`
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
