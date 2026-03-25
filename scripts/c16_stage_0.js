// C16 Stage 0: Generate mockup-only screenshots for newly created mockup files
// Since all 8 mockups were newly created (no "before" version exists),
// s0_ images show the new mockup with a "NEW" label
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENS = [
  { id: 'a2_vision',        mockup: '06b_design_vision.html',   fragment: true  },
  { id: 'a3_goal_link',     mockup: '06c_design_connect.html',  fragment: false },
  { id: 'a4_profile',       mockup: '06d_design_profile.html',  fragment: false },
  { id: 'a5_plan',          mockup: '08d_plan.html',            fragment: true  },
  { id: 'b1_hub_tasks',     mockup: '05b_goalhub_tasks.html',   fragment: false },
  { id: 'b2_hub_settings',  mockup: '05e_goalhub_settings.html',fragment: false },
  { id: 'b3_analytics',     mockup: '08a_analytics.html',       fragment: true  },
  { id: 'b4b5_fb_settings', mockup: '08b_feedback.html',        fragment: true  },
];

const MOCKUP_BASE = 'http://localhost:8765';
const OUT_DIR = 'docs/mockups/screenshots';

(async () => {
  const browser = await chromium.launch();
  const { createCanvas, loadImage } = require('canvas');

  for (const screen of SCREENS) {
    console.log(`\n=== ${screen.id} ===`);

    // --- Take mockup screenshot ---
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    try {
      const url = screen.fragment
        ? `${MOCKUP_BASE}/_viewer.html?f=${screen.mockup}`
        : `${MOCKUP_BASE}/${screen.mockup}`;
      await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(800);

      const phoneFrame = await page.$('.phone');
      const mockPath = path.join(OUT_DIR, `s0_${screen.id}_new.png`);
      if (phoneFrame) {
        await phoneFrame.screenshot({ path: mockPath });
      } else {
        await page.screenshot({ path: mockPath, fullPage: false });
      }
      console.log(`OK: ${screen.id} mockup screenshot`);

      // --- Create diff image (left=NEW placeholder, right=new mockup) ---
      const mockImg = await loadImage(mockPath);
      const gap = 20;
      const leftW = mockImg.width;
      const w = leftW + mockImg.width + gap * 3;
      const h = mockImg.height + 50;
      const canvas = createCanvas(w, h);
      const c = canvas.getContext('2d');
      c.fillStyle = '#0e0e18';
      c.fillRect(0, 0, w, h);

      // Left: "BEFORE (none)" placeholder
      c.fillStyle = '#333';
      c.font = '14px sans-serif';
      c.fillText(`BEFORE — ${screen.id}`, gap, 20);
      c.fillStyle = '#1a1a2e';
      c.fillRect(gap, 35, leftW, mockImg.height);
      c.fillStyle = '#555';
      c.font = '18px sans-serif';
      c.fillText('NEW FILE', gap + leftW/2 - 40, 35 + mockImg.height/2 - 10);
      c.fillText('(no previous version)', gap + leftW/2 - 80, 35 + mockImg.height/2 + 20);

      // Right: new mockup
      c.fillStyle = '#888';
      c.font = '14px sans-serif';
      c.fillText('AFTER (current mockup)', leftW + gap * 2, 20);
      c.drawImage(mockImg, leftW + gap * 2, 35);

      const diffPath = path.join(OUT_DIR, `s0_${screen.id}_diff.png`);
      fs.writeFileSync(diffPath, canvas.toBuffer('image/png'));
      console.log(`OK: ${screen.id} diff image`);
    } catch(e) {
      console.log(`FAIL: ${screen.id} — ${e.message}`);
    }
    await ctx.close();
  }

  await browser.close();
  console.log('\n=== C16 Stage 0 complete ===');
})();
