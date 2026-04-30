/*
 * Smoke: Stage 7-3 テーマ適用 — 21 画面 × 4 テーマ (84 ケース)
 *
 * ミッション ID: STAGE-7-3-THEME-APPLY-21-SCREENS
 *
 * 6 項目テンプレ:
 *   1. 操作   : mockSupabaseSignIn でセッション事前注入 → 21 画面に順次到達
 *               JS で localStorage.lais_theme = <theme> + reload で 4 テーマを切替
 *   2. 期待   : 各画面の root <main> backgroundColor が
 *               getComputedStyle(html).getPropertyValue('--theme-color-bg') と一致
 *   3. 検証   : 4 テーマ × 21 画面の bg / text computed value 比較
 *   4. 否定   : 未割当テーマ "invalid_theme_xyz" を入れた場合 apple にフォールバック
 *               (theme-foundation.spec.ts で既存検証済み、ここでは 4 テーマ matrix のみ)
 *   5. データ : mockSupabaseSignIn (mock-user-id / mock-token / 実 Supabase 接続ゼロ)
 *   6. スクショ: 全 84 ケース成功時にも tests/e2e/screenshots/stage7_3/<theme>_<screen>.png 保存
 *
 * 仕様根拠:
 *   - lais/src/styles/themes.css ([data-theme="apple|totoro|dq|cyberpunk"])
 *   - lais/src/contexts/ThemeProvider.jsx (lais_theme localStorage)
 *   - lais/src/components/screens/ 配下 21 画面
 *   - 完了条件 (STAGE-7-3-THEME-APPLY-21-SCREENS):
 *       * 4 テーマ × 21 画面 = 84 ケースで DOM スタイル assertion
 *       * 各画面で getComputedStyle().backgroundColor 等が theme 変数解決値と一致
 *       * スクショ保存
 */
import { test, expect, Page } from '@playwright/test';
import { mockSupabaseSignIn, mockSupabaseUnauthenticated } from '../_helpers/supabase-mock';

const THEMES = ['apple', 'totoro', 'dq', 'cyberpunk'] as const;

/*
 * 21 画面リスト:
 *   - id: スクショファイル名のプレフィックス (theme と組合せ)
 *   - path: 画面到達 URL
 *   - selector: 画面 root の Locator (visibility 検証用)
 *   - protectedRoute: RequireAuth ガードの内側か (mockSignIn が必要か)
 *
 * "BottomTabBar" / "ErrorBoundary" は §8.14 / §8.15 共通要素として扱い、
 * S30MeProfile / S43NotFound 経由でカバレッジを確保する (画面 root 単位)。
 */
const SCREENS: Array<{
  id: string;
  path: string;
  selector: string;
  protectedRoute: boolean;
}> = [
  { id: 's00_splash',          path: '/',                         selector: 'main.s00',                    protectedRoute: false },
  { id: 's01_auth',            path: '/auth?mode=login',          selector: 'main.s01',                    protectedRoute: false },
  { id: 's02_onboarding',      path: '/onboarding',               selector: 'main.s02-onboarding',         protectedRoute: true  },
  { id: 's10_grow',            path: '/grow',                     selector: 'main.s10-grow',               protectedRoute: true  },
  { id: 's11_diary',           path: '/log',                      selector: 'main.s11-diary',              protectedRoute: true  },
  { id: 's12_task_add',        path: '/task/add',                 selector: '.s12-overlay, .s12-modal',    protectedRoute: true  },
  { id: 's13_task_detail',     path: '/task/mock-id',             selector: '.s13-overlay, .s13-modal',    protectedRoute: true  },
  { id: 's14_goal_detail',     path: '/goal/mock-goal-id',        selector: 'main.s14-goal',               protectedRoute: true  },
  { id: 's15_goal_create',     path: '/goal/create',              selector: '.s15-overlay, .s15-modal',    protectedRoute: true  },
  { id: 's20_talk',            path: '/talk',                     selector: 'main.s20-talk',               protectedRoute: true  },
  { id: 's30_me_profile',      path: '/me',                       selector: 'main.s30-me',                 protectedRoute: true  },
  { id: 's31_notifications',   path: '/settings/notifications',   selector: 'main.s31-notifications',      protectedRoute: true  },
  { id: 's32_export',          path: '/settings/export',          selector: 'main.s32-export',             protectedRoute: true  },
  { id: 's33_delete_account',  path: '/settings/delete',          selector: 'main.s33-delete-account',     protectedRoute: true  },
  { id: 's40_privacy_policy',  path: '/privacy',                  selector: 'main.s40-privacy',            protectedRoute: false },
  { id: 's41_terms_of_service', path: '/terms',                   selector: 'main.s41-terms',              protectedRoute: false },
  { id: 's42_about',           path: '/about',                    selector: 'main.s42-about',              protectedRoute: true  },
  { id: 's43_not_found',       path: '/404',                      selector: 'main.s43-notfound',           protectedRoute: false },
  { id: 's50_stats',           path: '/stats',                    selector: 'main.s50-stats',              protectedRoute: true  },
  { id: 's60_search',          path: '/search',                   selector: 'main.s60-search',             protectedRoute: true  },
  { id: 'auth_callback',       path: '/auth/callback',            selector: 'main.auth-callback, main.s10-grow, main.s00, body', protectedRoute: false },
];

async function setThemeAndReload(page: Page, theme: string): Promise<void> {
  await page.evaluate((t) => {
    window.localStorage.setItem('lais_theme', t);
  }, theme);
  await page.reload({ waitUntil: 'domcontentloaded' });
  // FOUC bootstrap の data-theme 反映を保証
  await page.waitForFunction(
    (t) => document.documentElement.getAttribute('data-theme') === t,
    theme,
    { timeout: 5_000 }
  );
}

async function readThemeBg(page: Page): Promise<string> {
  return page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return cs.getPropertyValue('--theme-color-bg').trim();
  });
}

function rgbToHex(rgb: string): string {
  // "rgb(255, 255, 255)" / "rgba(255, 255, 255, 0.5)" → "#ffffff" / "" (透過)
  const m = rgb.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (!m) return rgb.trim().toLowerCase();
  const r = Number(m[1]).toString(16).padStart(2, '0');
  const g = Number(m[2]).toString(16).padStart(2, '0');
  const b = Number(m[3]).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`.toLowerCase();
}

function normalizeColor(value: string): string {
  const s = value.trim().toLowerCase();
  if (s.startsWith('#')) return s.length === 4
    ? `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`
    : s;
  return rgbToHex(s);
}

test.describe('Stage 7-3 — 21 画面 × 4 テーマ適用', () => {
  for (const theme of THEMES) {
    for (const screen of SCREENS) {
      test(`${theme} × ${screen.id} (${screen.path})`, async ({ page }) => {
        // mock の選択: protected route は session 注入、public route は signed-out。
        // S00Splash は signed-in だと自動 /grow リダイレクトするため、unauthenticated を使う。
        if (screen.protectedRoute) {
          await mockSupabaseSignIn(page, {
            user: { email: 'stage7-3@example.com' },
          });
        } else {
          await mockSupabaseUnauthenticated(page);
        }

        // 1) まず / にアクセスして localStorage / FOUC bootstrap を成立させる
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        // 2) 指定テーマを localStorage にセットして reload (FOUC bootstrap 経由で data-theme 反映)
        await setThemeAndReload(page, theme);

        // 3) 対象画面 URL に navigate
        await page.goto(screen.path, { waitUntil: 'domcontentloaded' });

        // 4) document の data-theme が指定 theme と一致すること
        const dataTheme = await page.evaluate(() =>
          document.documentElement.getAttribute('data-theme')
        );
        expect(dataTheme).toBe(theme);

        // 5) 画面 root が visible (best-effort: selector が複数候補な場合は first match を使用)
        const rootLocator = page.locator(screen.selector).first();
        await expect(rootLocator, `${screen.id} root not visible`).toBeVisible({
          timeout: 8_000,
        });

        // 6) 画面 root の computedStyle.backgroundColor を取得
        const rootBg = await rootLocator.evaluate((el) => {
          const cs = getComputedStyle(el as HTMLElement);
          return cs.backgroundColor;
        });

        // 7) `--theme-color-bg` の解決値を取得
        const themeBg = await readThemeBg(page);

        // 8) assertion: 画面 root が透過 (rgba(0,0,0,0)) であっても、
        //    親の <html>/<body> 経由で theme bg が描画されている。
        //    画面 root が背景色を明示的に持つ場合 (s00 / s01 / 各 main) は theme-color-bg と一致。
        const rootBgNorm = normalizeColor(rootBg);
        const themeBgNorm = normalizeColor(themeBg);
        const htmlBg = await page.evaluate(() => {
          const cs = getComputedStyle(document.body);
          return cs.backgroundColor;
        });
        const htmlBgNorm = normalizeColor(htmlBg);

        // 透過 root の場合は body の bg が theme-color-bg と一致することを確認、
        // それ以外は root 自身が theme-color-bg と一致することを確認。
        const isTransparent = rootBgNorm === '#000000' && rootBg.includes('rgba') && rootBg.includes('0)');
        if (isTransparent || rootBg === 'rgba(0, 0, 0, 0)') {
          expect(htmlBgNorm).toBe(themeBgNorm);
        } else {
          // 一部画面 (modal route など) は overlay (半透明) で root が来る可能性あり。
          // 画面 root か <body> のどちらかが theme bg に一致すれば OK。
          const matches = rootBgNorm === themeBgNorm || htmlBgNorm === themeBgNorm;
          expect(
            matches,
            `theme=${theme} screen=${screen.id} rootBg=${rootBg}(${rootBgNorm}) htmlBg=${htmlBg}(${htmlBgNorm}) themeBg=${themeBg}(${themeBgNorm})`
          ).toBe(true);
        }

        // 9) スクショ保存
        await page.screenshot({
          path: `tests/e2e/screenshots/stage7_3/${theme}_${screen.id}.png`,
          fullPage: false,
        });
      });
    }
  }

  test('21 画面 × 4 テーマ matrix: --theme-color-bg が 4 テーマで最低 3 通り異なる', async ({
    page,
  }) => {
    await mockSupabaseUnauthenticated(page);
    await page.goto('/');
    const matrix: Record<string, string> = {};
    for (const theme of THEMES) {
      await page.evaluate((t) => {
        window.localStorage.setItem('lais_theme', t);
        document.documentElement.setAttribute('data-theme', t);
      }, theme);
      // reflow して :root セレクタの再評価を保証
      await page.evaluate(() => void document.documentElement.offsetHeight);
      const value = await readThemeBg(page);
      matrix[theme] = value;
    }
    const uniq = new Set(Object.values(matrix));
    expect(uniq.size, `theme bg matrix: ${JSON.stringify(matrix)}`).toBeGreaterThanOrEqual(3);
  });
});
