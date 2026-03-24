// GOAL AI — E2E Design Visual Tests (design_spec_v3 compliance)
// Validates CSS variables and computed styles match the design spec
import { test, expect } from '@playwright/test';

const BASE = process.env.FRONTEND_BASE || 'https://goal-ai-frontend.pages.dev';

test.describe('Design Spec: CSS Variables', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(3000);
  });

  test('border-radius tokens are defined correctly', async ({ page }) => {
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
    expect(vars.cardRadius).toBe('10px');
    expect(vars.popupRadius).toBe('16px');
    expect(vars.pillRadius).toBe('20px');
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
    await page.goto(BASE);
    await page.waitForTimeout(3000);
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
    await page.goto(BASE);
    await page.waitForTimeout(3000);
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
    await page.goto(BASE);
    await page.waitForTimeout(3000);
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
    await page.goto(BASE);
    await page.waitForTimeout(3000);
    await page.locator('#hamburger-btn').click();
    await page.waitForTimeout(500);
    await page.locator('#sb-upgrade-nudge, [onclick*="openPlanModal"]').first().click();
    await page.waitForTimeout(500);

    const proCard = page.locator('#pc-pro');
    if (await proCard.isVisible()) {
      const styles = await proCard.evaluate((el) => {
        const s = getComputedStyle(el);
        return {
          borderRadius: s.borderRadius,
        };
      });
      // card-radius: 10px
      expect(styles.borderRadius).toBe('10px');
    }
  });
});
