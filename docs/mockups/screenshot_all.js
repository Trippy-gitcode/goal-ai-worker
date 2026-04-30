// docs/mockups/screenshot_all.js
// Usage: npx playwright test docs/mockups/screenshot_all.js
// Generates 375x812 screenshots for all Phase A mockups

const { test } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const screens = [
  's00_splash', 's01_signin', 's02_onboarding',
  's10_grow', 's20_talk', 's30_me',
  's12_task_add', 's13_task_detail',
  's14_goal_detail', 's15_goal_create'
];

const mockupDir = path.resolve(__dirname);
const screenshotDir = path.join(mockupDir, 'screenshots');

test.describe('Phase A Mockup Screenshots', () => {
  for (const screen of screens) {
    test(`screenshot ${screen}`, async ({ page }) => {
      const htmlPath = path.join(mockupDir, `${screen}.html`);
      if (!fs.existsSync(htmlPath)) {
        console.warn(`SKIP: ${htmlPath} not found`);
        return;
      }
      await page.setViewportSize({ width: 430, height: 932 });
      await page.goto(`file://${htmlPath}`);
      await page.waitForTimeout(500);
      // Clip to phone frame area (centered)
      const phone = await page.locator('.phone').first();
      await phone.screenshot({
        path: path.join(screenshotDir, `${screen}.png`),
      });
      console.log(`✓ ${screen}.png`);
    });
  }
});
