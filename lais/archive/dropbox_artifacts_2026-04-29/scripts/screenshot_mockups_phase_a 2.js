const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const screens = [
  's00_splash', 's01_signin', 's02_onboarding',
  's10_grow', 's20_talk', 's30_me',
  's12_task_add', 's13_task_detail',
  's14_goal_detail', 's15_goal_create'
];

const mockupDir = '/Users/futoshi/Desktop/goal-ai-worker/docs/mockups';
const screenshotDir = path.join(mockupDir, 'screenshots');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const page = await context.newPage();
  for (const screen of screens) {
    const htmlPath = path.join(mockupDir, `${screen}.html`);
    if (!fs.existsSync(htmlPath)) { console.warn(`SKIP: ${screen}`); continue; }
    await page.goto(`file://${htmlPath}`);
    await page.waitForTimeout(600);
    const phone = page.locator('.phone').first();
    const cnt = await phone.count();
    const target = cnt > 0 ? phone : page;
    await target.screenshot({ path: path.join(screenshotDir, `${screen}.png`) });
    console.log(`✓ ${screen}.png`);
  }
  await browser.close();
})();
