import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
const page = await ctx.newPage();

const results = [];

async function measure(url, label) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);
  const items = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('button, a, input[type="checkbox"], input[type="submit"], [role="button"]'));
    return nodes.map(n => {
      const r = n.getBoundingClientRect();
      // ヒット領域は閉じた ancestor label/button の padding 込みで判定したいので
      // parent label があれば parent のサイズも返す
      const parentLabel = n.closest('label');
      const pr = parentLabel?.getBoundingClientRect();
      return {
        tag: n.tagName.toLowerCase(),
        type: n.getAttribute('type') || undefined,
        cls: n.className || undefined,
        text: (n.innerText || n.value || '').slice(0, 20),
        w: r.width, h: r.height,
        parentLabelW: pr?.width, parentLabelH: pr?.height,
        hidden: r.width === 0 && r.height === 0,
      };
    });
  });
  results.push({ label, url, items });
}

await measure('http://localhost:5175/', 'S-00 Splash');
await measure('http://localhost:5175/auth?mode=signup', 'S-01 Signup');
await measure('http://localhost:5175/auth?mode=login', 'S-01 Login');

for (const page of results) {
  console.log(`\n=== ${page.label} ===`);
  for (const it of page.items) {
    if (it.hidden) continue;
    // Effective hit size = max(self, parent label if exists)
    const effW = Math.max(it.w, it.parentLabelW || 0);
    const effH = Math.max(it.h, it.parentLabelH || 0);
    const pass = effW >= 44 && effH >= 44;
    const mark = pass ? '✅' : '❌';
    console.log(`${mark} ${it.tag}${it.type ? '['+it.type+']' : ''} ${it.cls || ''}`.slice(0, 60), `| ${effW.toFixed(0)}×${effH.toFixed(0)}`, `| "${it.text}"`);
  }
}

await browser.close();
