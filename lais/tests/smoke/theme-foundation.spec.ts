/*
 * Smoke: Stage 7-1 Theme Foundation — 4 テーマ × 主要 5 token の値変化
 *
 * 6 項目テンプレ:
 *   1. 操作   : `/` (Splash) にアクセス → JS で document.documentElement.dataset.theme を切替
 *   2. 期待   : 4 テーマ (apple / totoro / dq / cyberpunk) の各々で
 *               主要 5 トークン (--theme-color-bg / --theme-color-accent /
 *               --theme-color-text / --theme-font-base / --theme-motion-normal)
 *               の computed value が 4 通りそれぞれ異なる。
 *   3. 検証   : getComputedStyle(document.documentElement).getPropertyValue() の
 *               4 テーマでの値の一意性。
 *   4. 否定   : 同じトークンが 4 テーマで同一文字列ではない（少なくとも 3 通り以上の値）。
 *   5. データ : Supabase は未認証モック（Splash は認証不要なため十分）。
 *   6. スクショ: failure 時のみ自動取得。
 *
 * 仕様根拠:
 *   - lais/src/styles/themes.css ([data-theme="apple|totoro|dq|cyberpunk"])
 *   - 完了条件 (STAGE7-1-THEME-FOUNDATION-IMPL-V1): 4 テーマ × 主要 5 token の値変化
 */
import { test, expect } from '@playwright/test';
import { mockSupabaseUnauthenticated } from '../_helpers/supabase-mock';

const THEMES = ['apple', 'totoro', 'dq', 'cyberpunk'] as const;
const TOKENS = [
  '--theme-color-bg',
  '--theme-color-accent',
  '--theme-color-text',
  '--theme-font-base',
  '--theme-motion-normal',
] as const;

test.describe('Smoke: Stage 7-1 Theme Foundation', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseUnauthenticated(page);
  });

  test('正常系: themes.css が link されている (FOUC bootstrap が機能)', async ({ page }) => {
    await page.goto('/');
    // FOUC bootstrap script が <html data-theme> を設定済み
    const dataTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(THEMES).toContain(dataTheme);
  });

  test('4 テーマ × 主要 5 token の値が切替で変化する', async ({ page }) => {
    await page.goto('/');

    // 各テーマでの token computed value を集める
    const matrix: Record<string, Record<string, string>> = {};
    for (const theme of THEMES) {
      const values = await page.evaluate(
        ({ theme, tokens }) => {
          document.documentElement.setAttribute('data-theme', theme);
          // 強制 reflow して :root セレクタの再評価を保証
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          void document.documentElement.offsetHeight;
          const cs = getComputedStyle(document.documentElement);
          const out: Record<string, string> = {};
          for (const t of tokens) {
            out[t] = cs.getPropertyValue(t).trim();
          }
          return out;
        },
        { theme, tokens: TOKENS as unknown as string[] }
      );
      matrix[theme] = values;
    }

    // 各 token について、4 テーマの値が「最低 3 通り」異なることを確認
    // (motion-normal は dq が 0ms / cyberpunk が 200ms / apple が 250ms / totoro が 350ms = 4 通り)
    // (font-base は dq が DotGothic / cyberpunk が Orbitron / apple が SF / totoro が Yu = 4 通り)
    // (color-bg/accent/text は 4 通り全部別)
    for (const token of TOKENS) {
      const values = THEMES.map((t) => matrix[t][token]);
      const unique = new Set(values);
      expect(unique.size, `${token} の 4 テーマ値: ${values.join(' | ')}`).toBeGreaterThanOrEqual(3);
    }

    // 否定検証: 例えば apple の bg と cyberpunk の bg は別物（白 vs 黒）
    expect(matrix.apple['--theme-color-bg']).not.toBe(matrix.cyberpunk['--theme-color-bg']);
    expect(matrix.apple['--theme-color-text']).not.toBe(matrix.cyberpunk['--theme-color-text']);
    expect(matrix.dq['--theme-motion-normal']).not.toBe(matrix.totoro['--theme-motion-normal']);
  });

  test('localStorage 永続化: lais_theme キーで読み戻し', async ({ page }) => {
    // 操作: lais_theme=cyberpunk を localStorage に書いてからリロード
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('lais_theme', 'cyberpunk');
    });
    await page.reload();

    // 期待: FOUC bootstrap が data-theme="cyberpunk" を即セット
    const dataTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(dataTheme).toBe('cyberpunk');

    // クリーンアップ
    await page.evaluate(() => localStorage.removeItem('lais_theme'));
  });

  test('不正な lais_theme 値は apple にフォールバック', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('lais_theme', 'invalid_theme_xyz');
    });
    await page.reload();
    const dataTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(dataTheme).toBe('apple');
    await page.evaluate(() => localStorage.removeItem('lais_theme'));
  });
});
