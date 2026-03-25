// C16 Stage A: Screenshot all 8 screens (mockup + implementation) and create comparison images
// Fragment mockups (no DOCTYPE) are loaded via _viewer.html to ensure charset=UTF-8
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENS = [
  { id: 'a2_vision',        mockup: '06b_design_vision.html',   fragment: true,  implPage: 'myself', implTab: 'vision' },
  { id: 'a3_goal_link',     mockup: '06c_design_connect.html',  fragment: false, implPage: 'myself', implTab: 'connect' },
  { id: 'a4_profile',       mockup: '06d_design_profile.html',  fragment: false, implPage: 'myself', implTab: 'profile' },
  { id: 'a5_plan',          mockup: '08d_plan.html',            fragment: true,  implPage: 'plan' },
  { id: 'b1_hub_tasks',     mockup: '05b_goalhub_tasks.html',   fragment: false, implPage: 'goalhub', implTab: 'tasks' },
  { id: 'b2_hub_settings',  mockup: '05e_goalhub_settings.html',fragment: false, implPage: 'goalhub', implTab: 'settings' },
  { id: 'b3_analytics',     mockup: '08a_analytics.html',       fragment: true,  implPage: 'analytics' },
  { id: 'b4b5_fb_settings', mockup: '08b_feedback.html',        fragment: true,  implPage: 'settings' },
];

const MOCKUP_BASE = 'http://localhost:8765';
const IMPL_BASE = process.argv[2] || 'http://localhost:4173';
const OUT_DIR = 'docs/mockups/screenshots';

(async () => {
  const browser = await chromium.launch();

  for (const screen of SCREENS) {
    console.log(`\n=== ${screen.id} ===`);

    // --- Mockup screenshot ---
    const mockupCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mockupPage = await mockupCtx.newPage();
    try {
      // Fragment files: load via _viewer.html (has charset=UTF-8)
      // Full HTML files: load directly
      const url = screen.fragment
        ? `${MOCKUP_BASE}/_viewer.html?f=${screen.mockup}`
        : `${MOCKUP_BASE}/${screen.mockup}`;
      await mockupPage.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
      await mockupPage.waitForTimeout(800);

      // Check if mockup has a .phone frame — screenshot just that
      const phoneFrame = await mockupPage.$('.phone');
      if (phoneFrame) {
        await phoneFrame.screenshot({ path: path.join(OUT_DIR, `sa_${screen.id}_mockup.png`) });
      } else {
        await mockupPage.screenshot({ path: path.join(OUT_DIR, `sa_${screen.id}_mockup.png`), fullPage: false });
      }
      console.log(`OK: ${screen.id} mockup screenshot`);
    } catch(e) {
      console.log(`FAIL: ${screen.id} mockup — ${e.message}`);
    }
    await mockupCtx.close();

    // --- Implementation screenshot ---
    const implCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const implPage = await implCtx.newPage();
    try {
      await implPage.goto(IMPL_BASE, { waitUntil: 'networkidle', timeout: 15000 });
      await implPage.waitForTimeout(1000);

      if (screen.implPage === 'myself') {
        await implPage.evaluate(() => { if(typeof showPage === 'function') showPage('myself'); });
        await implPage.waitForTimeout(500);
        if (screen.implTab) {
          await implPage.evaluate((tab) => { if(typeof switchMyselfTab === 'function') switchMyselfTab(tab); }, screen.implTab);
          await implPage.waitForTimeout(500);
        }
      } else if (screen.implPage === 'plan') {
        await implPage.evaluate(() => { if(typeof openPlanModal === 'function') openPlanModal(); });
        await implPage.waitForTimeout(500);
      } else if (screen.implPage === 'goalhub') {
        await implPage.evaluate(() => { if(typeof openGoalHub === 'function') openGoalHub(0); });
        await implPage.waitForTimeout(500);
        if (screen.implTab) {
          await implPage.evaluate((tab) => { if(typeof switchHubTab === 'function') switchHubTab(tab); }, screen.implTab);
          await implPage.waitForTimeout(500);
        }
      } else if (screen.implPage === 'analytics') {
        await implPage.evaluate(() => {
          document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
          const el = document.getElementById('pg-analytics-wrap');
          if(el){ el.classList.add('active'); el.style.display = 'flex'; }
        });
        await implPage.waitForTimeout(500);
      } else if (screen.implPage === 'settings') {
        await implPage.evaluate(() => {
          document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
          const el = document.getElementById('pg-settings-wrap');
          if(el){ el.classList.add('active'); el.style.display = 'flex'; }
        });
        await implPage.waitForTimeout(500);
      }

      await implPage.screenshot({ path: path.join(OUT_DIR, `sa_${screen.id}_impl.png`), fullPage: false });
      console.log(`OK: ${screen.id} impl screenshot`);
    } catch(e) {
      console.log(`FAIL: ${screen.id} impl — ${e.message}`);
    }
    await implCtx.close();

    // --- Comparison image ---
    try {
      const { createCanvas, loadImage } = require('canvas');
      const mockImg = await loadImage(path.join(OUT_DIR, `sa_${screen.id}_mockup.png`));
      const implImg = await loadImage(path.join(OUT_DIR, `sa_${screen.id}_impl.png`));
      const gap = 20;
      const w = mockImg.width + implImg.width + gap * 3;
      const h = Math.max(mockImg.height, implImg.height) + 50;
      const canvas = createCanvas(w, h);
      const c = canvas.getContext('2d');
      c.fillStyle = '#0e0e18';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#888';
      c.font = '14px sans-serif';
      c.fillText(`MOCKUP (${screen.id})`, gap, 20);
      c.fillText('IMPLEMENTATION', mockImg.width + gap * 2, 20);
      c.drawImage(mockImg, gap, 35);
      c.drawImage(implImg, mockImg.width + gap * 2, 35);
      fs.writeFileSync(path.join(OUT_DIR, `sa_${screen.id}_compare.png`), canvas.toBuffer('image/png'));
      console.log(`OK: ${screen.id} compare image`);
    } catch(e) {
      console.log(`WARN: ${screen.id} compare image skipped — ${e.message}`);
    }
  }

  await browser.close();
  console.log('\n=== C16 Stage A screenshot capture complete ===');
})();
