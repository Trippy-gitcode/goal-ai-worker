// C16 visual verification: take screenshots of mockup and production
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });

  // 1. Mockup screenshot
  const mockupPage = await ctx.newPage();
  await mockupPage.goto('http://localhost:8765/_viewer.html?f=02a_home_prechat.html', { waitUntil: 'networkidle' });
  await mockupPage.waitForTimeout(500);
  await mockupPage.screenshot({ path: 'docs/mockups/screenshots/a1_mockup.png', fullPage: false });
  console.log('OK: mockup screenshot saved');

  // 2. Production screenshot
  const prodPage = await ctx.newPage();
  await prodPage.goto('https://goal-ai-frontend.pages.dev/', { waitUntil: 'networkidle' });
  await prodPage.waitForTimeout(2000);
  await prodPage.screenshot({ path: 'docs/mockups/screenshots/a1_impl.png', fullPage: false });
  console.log('OK: production screenshot saved');

  await browser.close();
  console.log('Done. Compare screenshots in docs/mockups/screenshots/');
})();
