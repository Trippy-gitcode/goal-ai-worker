// C16 visual verification: take screenshots of mockup and implementation
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

  // 2. Implementation screenshot (local preview or production)
  const implUrl = process.argv[2] || 'http://localhost:4173/';
  const prodPage = await ctx.newPage();
  await prodPage.goto(implUrl, { waitUntil: 'networkidle' });
  await prodPage.waitForTimeout(2000);
  await prodPage.screenshot({ path: 'docs/mockups/screenshots/a1_impl.png', fullPage: false });
  console.log('OK: impl screenshot saved (' + implUrl + ')');

  // 3. Side-by-side comparison image
  const { createCanvas, loadImage } = require('canvas');
  try {
    const mockImg = await loadImage('docs/mockups/screenshots/a1_mockup.png');
    const implImg = await loadImage('docs/mockups/screenshots/a1_impl.png');
    const gap = 20;
    const canvas = createCanvas(mockImg.width + implImg.width + gap * 3, Math.max(mockImg.height, implImg.height) + 60);
    const c = canvas.getContext('2d');
    c.fillStyle = '#0e0e18';
    c.fillRect(0, 0, canvas.width, canvas.height);
    // Labels
    c.fillStyle = '#888';
    c.font = '14px sans-serif';
    c.fillText('MOCKUP', gap, 20);
    c.fillText('IMPLEMENTATION', mockImg.width + gap * 2, 20);
    // Images
    c.drawImage(mockImg, gap, 35);
    c.drawImage(implImg, mockImg.width + gap * 2, 35);
    const fs = require('fs');
    fs.writeFileSync('docs/mockups/screenshots/a1_compare.png', canvas.toBuffer('image/png'));
    console.log('OK: comparison image saved');
  } catch(e) {
    console.log('WARN: canvas not available, skipping comparison image: ' + e.message);
  }

  await browser.close();
  console.log('Done.');
})();
