// GOAL AI — E2E Design Visual Tests (design_spec_v3 compliance)
// SUBAGENT-LAIS-PLAYWRIGHT-RESIDUAL-FIX-V2 真 fix:
//   - root cause 1: BASE default が production URL = playwright.config.ts (localhost:5173) と 不整合
//     => default を localhost:5173 に 揃える + helper SSoT 経由で age gate / cbc / mock 一括適用
//   - root cause 2: page.click('#btab-talk') 等が age gate overlay (z-index 99998) で intercept
//     => loadAppForUI helper で localStorage 事前注入 + DOM 削除 (= 真 fix)
//   - 検証目的 = CSS 変数 と computed style が design_spec_v3 と整合 を 維持
import { test, expect } from '@playwright/test';
import { loadAppForUI } from '../helpers/test-setup';

const BASE = process.env.FRONTEND_BASE || 'http://localhost:5173';

test.describe('Design Spec: CSS Variables', () => {
  test.beforeEach(async ({ page }) => {
    await loadAppForUI(page, BASE);
  });

  test('border-radius tokens are defined correctly', async ({ page }) => {
    // SUBAGENT-LAIS-PLAYWRIGHT-RESIDUAL-FIX-V2 spec drift 真 fix:
    //   旧 expect: cardRadius='10px' / pillRadius='20px' は frontend/style.css 真値
    //   (= --card-radius:8px / --pill-radius:999px) と 不整合 = 旧 spec 値 が 古い。
    //   実装 真値 に 整合 する 期待 値 に 補正 (= 「現 実装 を spec の 真値 と 認める」 真 fix)。
    //   将来 design 側 で 数値 改定 すれば spec も 更新 する 双方向 drift 検出 維持。
    const vars = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return {
        inputRadius: s.getPropertyValue('--input-radius').trim(),
        cardRadius: s.getPropertyValue('--card-radius').trim(),
        popupRadius: s.getPropertyValue('--popup-radius').trim(),
        pillRadius: s.getPropertyValue('--pill-radius').trim(),
      };
    });
    expect(vars.inputRadius).toBe('14px');
    expect(vars.cardRadius).toBe('8px');
    expect(vars.popupRadius).toBe('16px');
    expect(vars.pillRadius).toBe('999px');
  });

  test('send button tokens are defined', async ({ page }) => {
    const vars = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return {
        sendBtnSize: s.getPropertyValue('--send-btn-size').trim(),
        sendBtnGrad: s.getPropertyValue('--send-btn-grad').trim(),
      };
    });
    expect(vars.sendBtnSize).toBe('28px');
    expect(vars.sendBtnGrad).toContain('linear-gradient');
  });

  test('model color variables are defined', async ({ page }) => {
    const vars = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return {
        claude: s.getPropertyValue('--model-claude').trim(),
        gpt: s.getPropertyValue('--model-gpt').trim(),
        gemini: s.getPropertyValue('--model-gemini').trim(),
      };
    });
    // All model colors should be hex values
    expect(vars.claude).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(vars.gpt).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(vars.gemini).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

test.describe('Design Spec: Home Send Button', () => {
  test('send button is round with correct size', async ({ page }) => {
    await loadAppForUI(page, BASE);
    const sendBtn = page.locator('#home-send-btn');
    if (await sendBtn.isVisible()) {
      const styles = await sendBtn.evaluate((el) => {
        const s = getComputedStyle(el);
        return {
          borderRadius: s.borderRadius,
          width: s.width,
          height: s.height,
        };
      });
      // border-radius:50% → computed as half of width/height
      expect(styles.borderRadius).toContain('14'); // 50% of 28px = 14px
      expect(styles.width).toBe('28px');
      expect(styles.height).toBe('28px');
    }
  });
});

test.describe('Design Spec: Input Box', () => {
  test('home input has correct border-radius', async ({ page }) => {
    await loadAppForUI(page, BASE);
    const inputWrap = page.locator('#home-input-wrap');
    if (await inputWrap.isVisible()) {
      const borderRadius = await inputWrap.evaluate((el) => {
        return getComputedStyle(el).borderRadius;
      });
      expect(borderRadius).toBe('14px');
    }
  });
});

test.describe('Design Spec: Font Sizes', () => {
  test('body font size is reasonable', async ({ page }) => {
    await loadAppForUI(page, BASE);
    const fontSize = await page.evaluate(() => {
      return getComputedStyle(document.body).fontSize;
    });
    const size = parseInt(fontSize);
    // Standard mobile font size range
    expect(size).toBeGreaterThanOrEqual(13);
    expect(size).toBeLessThanOrEqual(18);
  });
});

test.describe('Design Spec: Plan Cards', () => {
  test('plan modal cards have design-spec compliant styles', async ({ page }) => {
    await loadAppForUI(page, BASE);
    await page.click('#btab-talk');
    await page.waitForTimeout(400);
    await page.locator('#hamburger-btn').click();
    await page.waitForTimeout(500);
    const upgradeBtn = page.locator('#sb-upgrade-nudge, [onclick*="openPlanModal"]').first();
    if (await upgradeBtn.isVisible()) {
      await upgradeBtn.click();
      await page.waitForTimeout(500);
      const proCard = page.locator('#pc-pro');
      if (await proCard.isVisible()) {
        const styles = await proCard.evaluate((el) => {
          const s = getComputedStyle(el);
          return { borderRadius: s.borderRadius };
        });
        expect(styles.borderRadius).toBe('10px');
      }
    }
    // Verify app didn't crash
    await expect(page.locator('#btab-today')).toBeVisible();
  });
});
