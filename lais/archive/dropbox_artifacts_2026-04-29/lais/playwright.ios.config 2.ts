/*
 * iOS Safari エミュレーション専用 Playwright 設定（PATCH-LAIS-IOS-SMOKE-MANDATORY、2026-04-26）
 *
 * 目的:
 *  - PO ふとし指摘「ふとしがバグ発見 = ADV 検出漏れ」の構造解消（FULL-SCREEN-TEST-GAP §2 隠れバグ #3 系統）。
 *  - 既存 playwright.config.ts (chromium dev mock) と playwright.cf.config.ts (CF 実機) は触らず、
 *    iPhone エミュレーションのみ独立 config として分離する（領域分離 + 既存 mock smoke / 実機 smoke と並走可）。
 *  - testDir は同一 (./tests) のままだが、本 config は projects で webkit デバイスエミュレーションのみ宣言、
 *    実行対象は --project=ios-... で明示的に指定 or tests/realmachine/ios-modal.spec.ts のみ実行。
 *
 * 設計方針（FULL-SCREEN-TEST-GAP §2 隠れバグパターン #3 直撃）:
 *  - キーボード被り（focus → iOS keyboard 出現で入力欄非表示）→ visualViewport simulating
 *  - safe-area 重なり（Dynamic Island / 角丸 / ホームインジケータ）→ env(safe-area-inset-*) CSS 検証
 *  - scroll lock 解除漏れ（モーダル閉じた後の body scroll 固定残存）→ DOM 検証
 *  - iOS Safari の `100vh` バグ（アドレスバー含む高さ計算）→ viewport 実測
 *  - タッチイベント / 慣性スクロール → hasTouch:true で simulating
 *
 * 実行例:
 *  - dev mock 経由（既存 webServer で 5175 起動、iPhone 14 のみ）:
 *      npx playwright test --config=playwright.ios.config.ts --project=ios-iphone-14 \
 *        tests/realmachine/ios-modal.spec.ts
 *  - 全 iPhone デバイス並列:
 *      npx playwright test --config=playwright.ios.config.ts tests/realmachine/ios-modal.spec.ts
 *  - CF 実機 URL:
 *      TEST_BASE_URL=https://lais-3yk.pages.dev IOS_USE_REMOTE=1 \
 *        npx playwright test --config=playwright.ios.config.ts tests/realmachine/ios-modal.spec.ts
 *
 * 仕様根拠:
 *  - lais/verify/dev_system_v34_package.md §2.25.21.4（iOS smoke 必須化、PATCH-LAIS-IOS-SMOKE-MANDATORY）
 *  - lais/verify/full_screen_test_gap_review_2026-04-26.md §2 隠れバグ #3
 */
import { defineConfig, devices } from '@playwright/test';

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5175';
const IOS_USE_REMOTE = process.env.IOS_USE_REMOTE === '1';

/*
 * iPhone デバイスエミュレーション設定。
 * Playwright 公式 devices からは 'iPhone 14' / 'iPhone 14 Pro' / 'iPhone 15 Pro' / 'iPhone 15 Pro Max' が
 * 提供されているが、@playwright/test 1.59.x 時点で名称が揺れているため、明示 viewport / userAgent 値で
 * 上書きして仕様明示性を高める。SSoT は本 config の values 定義。
 */
const IPHONE_DEVICES = [
  {
    name: 'ios-iphone-14',
    label: 'iPhone 14',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
  {
    name: 'ios-iphone-14-pro',
    label: 'iPhone 14 Pro',
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
  {
    name: 'ios-iphone-15-pro-max',
    label: 'iPhone 15 Pro Max',
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
];

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  timeout: 45_000, // モーダル開閉 + キーボード simulating で chromium config (30s) より長め
  expect: { timeout: 7_000 },
  use: {
    baseURL: TEST_BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: IPHONE_DEVICES.map((d) => ({
    name: d.name,
    use: {
      // webkit ベースの Mobile Safari エミュレーション
      ...devices['iPhone 14'],
      viewport: d.viewport,
      deviceScaleFactor: d.deviceScaleFactor,
      userAgent: d.userAgent,
      hasTouch: true,
      isMobile: true,
      defaultBrowserType: 'webkit',
      // 仕様明示: env 内で読み出すための label
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      __iosLabel: d.label,
    } as Record<string, unknown>,
  })),
  // webServer は IOS_USE_REMOTE=1 のとき不要（CF Pages 実機 URL を直接叩く）
  // それ以外は既存 dev サーバ (npm run dev) を再利用。
  webServer: IOS_USE_REMOTE
    ? undefined
    : {
        command: 'npm run dev',
        url: TEST_BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        env: {
          // 既存 playwright.config.ts と同等のダミー値（page.route() で全モック）
          VITE_SUPABASE_URL: 'https://playwright-test.supabase.co',
          VITE_SUPABASE_ANON_KEY: 'sb_publishable_test_dummy_key_for_playwright',
        },
      },
});
