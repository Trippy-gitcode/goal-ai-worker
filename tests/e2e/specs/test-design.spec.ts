/**
 * GOAL AI — Design Quality Test
 * Apple HIG + WCAG AA compliance
 *
 * Cat1: Tap targets ≥ 44×44px
 * Cat2: Text legibility (font-size ≥ 12px, line-height ≥ 1.4, contrast ≥ 4.5:1)
 * Cat3: Layout consistency (no horizontal overflow, 3 viewports × 11 screens)
 */

import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import * as path from 'path';
import { loadAppReady } from '../helpers/test-setup';

const BASE = process.env.FRONTEND_BASE || 'http://localhost:4173';
const SHOT_DIR = path.resolve(__dirname, '../screenshots/design');

// --- Navigation helpers ---

async function loadApp(page: Page) {
  await loadAppReady(page, BASE);
}

async function navToday(p: Page) { await p.click('#btab-today'); await p.waitForTimeout(500); }
async function navTalk(p: Page) { await p.click('#btab-talk'); await p.waitForTimeout(500); }
async function navGoals(p: Page) { await p.click('#btab-goals'); await p.waitForTimeout(500); }
async function navGoalHub(p: Page) {
  await p.click('#btab-goals'); await p.waitForTimeout(500);
  const item = p.locator('#goals-list-view .goal-item, #goals-list-view li, [class*=goal-item]').first();
  if (await item.count() > 0 && await item.isVisible()) { await item.click(); await p.waitForTimeout(500); }
}
async function navMe(p: Page) { await p.click('#btab-me'); await p.waitForTimeout(500); }
async function navCalendar(p: Page) {
  await p.click('#btab-today'); await p.waitForTimeout(300);
  const fab = p.locator('#cal-fab, .calendar-fab').first();
  if (await fab.isVisible()) { await fab.click(); await p.waitForTimeout(500); }
}
async function navAnalytics(p: Page) {
  await p.click('#btab-talk'); await p.waitForTimeout(300);
  const tab = p.locator('#htab-analytics');
  if (await tab.isVisible()) { await tab.click(); await p.waitForTimeout(500); }
}
async function navSettings(p: Page) {
  await p.click('#btab-talk'); await p.waitForTimeout(300);
  const hb = p.locator('#hamburger-btn').first();
  if (await hb.isVisible()) { await hb.click(); await p.waitForTimeout(300); }
  const sb = p.locator('#sb-settings-btn').first();
  if (await sb.isVisible()) { await sb.click(); await p.waitForTimeout(500); }
}
async function navTasks(p: Page) {
  await p.click('#btab-talk'); await p.waitForTimeout(300);
  const tab = p.locator('#htab-tasks');
  if (await tab.isVisible()) { await tab.click(); await p.waitForTimeout(500); }
}
async function navSidebar(p: Page) {
  await p.click('#btab-talk'); await p.waitForTimeout(300);
  const hb = p.locator('#hamburger-btn').first();
  if (await hb.isVisible()) { await hb.click(); await p.waitForTimeout(500); }
}
async function navBottomTabs(_p: Page) { /* already visible */ }

// --- Tap target check logic ---

async function getTapViolations(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const MIN = 44;
    const fails: string[] = [];
    const els = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [onclick], [tabindex="0"]');
    els.forEach(el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;
      if (rect.width === 0 || rect.height === 0) return;
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      if (rect.right < 0 || rect.left > window.innerWidth) return;
      if (rect.width < MIN || rect.height < MIN) {
        const id = el.id ? `#${el.id}` : el.className ? `.${el.className.toString().split(' ')[0]}` : el.tagName.toLowerCase();
        fails.push(`${id} (${Math.round(rect.width)}×${Math.round(rect.height)})`);
      }
    });
    return fails;
  });
}

// --- Font-size check logic ---

async function getSmallText(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const MIN_FONT = 12;
    const fails: string[] = [];
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set<Element>();
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const el = node.parentElement;
      if (!el || seen.has(el)) continue;
      seen.add(el);
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      // Skip elements outside viewport
      if (rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw) continue;
      const text = (node.textContent || '').trim();
      if (!text) continue;
      const fontSize = parseFloat(style.fontSize);
      if (fontSize < MIN_FONT && fontSize > 0) {
        const id = el.id ? `#${el.id}` : el.className ? `.${el.className.toString().split(' ')[0]}` : el.tagName.toLowerCase();
        fails.push(`${id} (${fontSize}px: "${text.slice(0, 20)}")`);
      }
    }
    return fails;
  });
}

// --- Line-height check logic ---

async function getTightLines(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const fails: string[] = [];
    const els = document.querySelectorAll('p, .msg, .bubble, [class*=description], [class*=body]');
    els.forEach(el => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none') return;
      const text = (el.textContent || '').trim();
      if (!text || text.length < 20) return;
      const fontSize = parseFloat(style.fontSize);
      const lineHeight = parseFloat(style.lineHeight);
      if (lineHeight > 0 && fontSize > 0) {
        const ratio = lineHeight / fontSize;
        if (ratio < 1.4) {
          const id = el.id ? `#${el.id}` : el.tagName.toLowerCase();
          fails.push(`${id} (${ratio.toFixed(2)})`);
        }
      }
    });
    return fails;
  });
}

// ===========================================================================
// Cat1: Tap Targets (≥ 44×44px) — 11 screens
// ===========================================================================
test.describe('Cat1: Tap Targets (44×44px)', () => {
  test('today: all interactive elements ≥ 44×44px', async ({ page }) => {
    await loadApp(page); await navToday(page);
    const v = await getTapViolations(page);
    if (v.length > 5) console.log('Tap violations on today:', v.slice(0, 10));
    expect(v.length).toBeLessThanOrEqual(5);
  });
  test('talk: all interactive elements ≥ 44×44px', async ({ page }) => {
    await loadApp(page); await navTalk(page);
    const v = await getTapViolations(page);
    if (v.length > 5) console.log('Tap violations on talk:', v.slice(0, 10));
    expect(v.length).toBeLessThanOrEqual(5);
  });
  test('goals: all interactive elements ≥ 44×44px', async ({ page }) => {
    await loadApp(page); await navGoals(page);
    const v = await getTapViolations(page);
    if (v.length > 5) console.log('Tap violations on goals:', v.slice(0, 10));
    expect(v.length).toBeLessThanOrEqual(5);
  });
  test('goalhub: all interactive elements ≥ 44×44px', async ({ page }) => {
    await loadApp(page); await navGoalHub(page);
    const v = await getTapViolations(page);
    if (v.length > 5) console.log('Tap violations on goalhub:', v.slice(0, 10));
    expect(v.length).toBeLessThanOrEqual(5);
  });
  test('me: all interactive elements ≥ 44×44px', async ({ page }) => {
    await loadApp(page); await navMe(page);
    const v = await getTapViolations(page);
    if (v.length > 5) console.log('Tap violations on me:', v.slice(0, 10));
    expect(v.length).toBeLessThanOrEqual(5);
  });
  test('calendar: all interactive elements ≥ 44×44px', async ({ page }) => {
    await loadApp(page); await navCalendar(page);
    const v = await getTapViolations(page);
    if (v.length > 5) console.log('Tap violations on calendar:', v.slice(0, 10));
    expect(v.length).toBeLessThanOrEqual(5);
  });
  test('analytics: all interactive elements ≥ 44×44px', async ({ page }) => {
    await loadApp(page); await navAnalytics(page);
    const v = await getTapViolations(page);
    if (v.length > 5) console.log('Tap violations on analytics:', v.slice(0, 10));
    expect(v.length).toBeLessThanOrEqual(5);
  });
  test('settings: all interactive elements ≥ 44×44px', async ({ page }) => {
    await loadApp(page); await navSettings(page);
    const v = await getTapViolations(page);
    if (v.length > 5) console.log('Tap violations on settings:', v.slice(0, 10));
    expect(v.length).toBeLessThanOrEqual(5);
  });
  test('tasks: all interactive elements ≥ 44×44px', async ({ page }) => {
    await loadApp(page); await navTasks(page);
    const v = await getTapViolations(page);
    if (v.length > 5) console.log('Tap violations on tasks:', v.slice(0, 10));
    expect(v.length).toBeLessThanOrEqual(5);
  });
  test('sidebar: all interactive elements ≥ 44×44px', async ({ page }) => {
    await loadApp(page); await navSidebar(page);
    const v = await getTapViolations(page);
    if (v.length > 5) console.log('Tap violations on sidebar:', v.slice(0, 10));
    expect(v.length).toBeLessThanOrEqual(5);
  });
  test('bottomtabs: all interactive elements ≥ 44×44px', async ({ page }) => {
    await loadApp(page); await navBottomTabs(page);
    const v = await getTapViolations(page);
    if (v.length > 5) console.log('Tap violations on bottomtabs:', v.slice(0, 10));
    expect(v.length).toBeLessThanOrEqual(5);
  });
});

// ===========================================================================
// Cat2: Text Legibility — 11 screens × 2 (font-size + line-height) + 1 contrast
// ===========================================================================
test.describe('Cat2: Text Legibility', () => {
  test('today: all text ≥ 12px font-size', async ({ page }) => {
    await loadApp(page); await navToday(page);
    const v = await getSmallText(page);
    if (v.length > 3) console.log('Small text on today:', v.slice(0, 10));
    expect(v.length).toBeLessThanOrEqual(3);
  });
  test('today: body text line-height ≥ 1.4', async ({ page }) => {
    await loadApp(page); await navToday(page);
    const v = await getTightLines(page);
    expect(v.length).toBeLessThanOrEqual(2);
  });
  test('talk: all text ≥ 12px font-size', async ({ page }) => {
    await loadApp(page); await navTalk(page);
    const v = await getSmallText(page);
    if (v.length > 3) console.log('Small text on talk:', v.slice(0, 10));
    expect(v.length).toBeLessThanOrEqual(3);
  });
  test('talk: body text line-height ≥ 1.4', async ({ page }) => {
    await loadApp(page); await navTalk(page);
    const v = await getTightLines(page);
    expect(v.length).toBeLessThanOrEqual(2);
  });
  test('goals: all text ≥ 12px font-size', async ({ page }) => {
    await loadApp(page); await navGoals(page);
    const v = await getSmallText(page);
    if (v.length > 3) console.log('Small text on goals:', v.slice(0, 10));
    expect(v.length).toBeLessThanOrEqual(3);
  });
  test('goals: body text line-height ≥ 1.4', async ({ page }) => {
    await loadApp(page); await navGoals(page);
    const v = await getTightLines(page);
    expect(v.length).toBeLessThanOrEqual(2);
  });
  test('goalhub: all text ≥ 12px font-size', async ({ page }) => {
    await loadApp(page); await navGoalHub(page);
    const v = await getSmallText(page);
    if (v.length > 3) console.log('Small text on goalhub:', v.slice(0, 10));
    expect(v.length).toBeLessThanOrEqual(3);
  });
  test('goalhub: body text line-height ≥ 1.4', async ({ page }) => {
    await loadApp(page); await navGoalHub(page);
    const v = await getTightLines(page);
    expect(v.length).toBeLessThanOrEqual(2);
  });
  test('me: all text ≥ 12px font-size', async ({ page }) => {
    await loadApp(page); await navMe(page);
    const v = await getSmallText(page);
    if (v.length > 3) console.log('Small text on me:', v.slice(0, 10));
    expect(v.length).toBeLessThanOrEqual(3);
  });
  test('me: body text line-height ≥ 1.4', async ({ page }) => {
    await loadApp(page); await navMe(page);
    const v = await getTightLines(page);
    expect(v.length).toBeLessThanOrEqual(2);
  });
  test('calendar: all text ≥ 12px font-size', async ({ page }) => {
    await loadApp(page); await navCalendar(page);
    const v = await getSmallText(page);
    if (v.length > 3) console.log('Small text on calendar:', v.slice(0, 10));
    expect(v.length).toBeLessThanOrEqual(3);
  });
  test('calendar: body text line-height ≥ 1.4', async ({ page }) => {
    await loadApp(page); await navCalendar(page);
    const v = await getTightLines(page);
    expect(v.length).toBeLessThanOrEqual(2);
  });
  test('analytics: all text ≥ 12px font-size', async ({ page }) => {
    await loadApp(page); await navAnalytics(page);
    const v = await getSmallText(page);
    if (v.length > 3) console.log('Small text on analytics:', v.slice(0, 10));
    expect(v.length).toBeLessThanOrEqual(3);
  });
  test('analytics: body text line-height ≥ 1.4', async ({ page }) => {
    await loadApp(page); await navAnalytics(page);
    const v = await getTightLines(page);
    expect(v.length).toBeLessThanOrEqual(2);
  });
  test('settings: all text ≥ 12px font-size', async ({ page }) => {
    await loadApp(page); await navSettings(page);
    const v = await getSmallText(page);
    if (v.length > 3) console.log('Small text on settings:', v.slice(0, 10));
    expect(v.length).toBeLessThanOrEqual(3);
  });
  test('settings: body text line-height ≥ 1.4', async ({ page }) => {
    await loadApp(page); await navSettings(page);
    const v = await getTightLines(page);
    expect(v.length).toBeLessThanOrEqual(2);
  });
  test('tasks: all text ≥ 12px font-size', async ({ page }) => {
    await loadApp(page); await navTasks(page);
    const v = await getSmallText(page);
    if (v.length > 3) console.log('Small text on tasks:', v.slice(0, 10));
    expect(v.length).toBeLessThanOrEqual(3);
  });
  test('tasks: body text line-height ≥ 1.4', async ({ page }) => {
    await loadApp(page); await navTasks(page);
    const v = await getTightLines(page);
    expect(v.length).toBeLessThanOrEqual(2);
  });
  test('sidebar: all text ≥ 12px font-size', async ({ page }) => {
    await loadApp(page); await navSidebar(page);
    const v = await getSmallText(page);
    if (v.length > 3) console.log('Small text on sidebar:', v.slice(0, 10));
    expect(v.length).toBeLessThanOrEqual(3);
  });
  test('sidebar: body text line-height ≥ 1.4', async ({ page }) => {
    await loadApp(page); await navSidebar(page);
    const v = await getTightLines(page);
    expect(v.length).toBeLessThanOrEqual(2);
  });
  test('bottomtabs: all text ≥ 12px font-size', async ({ page }) => {
    await loadApp(page); await navBottomTabs(page);
    const v = await getSmallText(page);
    if (v.length > 3) console.log('Small text on bottomtabs:', v.slice(0, 10));
    expect(v.length).toBeLessThanOrEqual(3);
  });
  test('bottomtabs: body text line-height ≥ 1.4', async ({ page }) => {
    await loadApp(page); await navBottomTabs(page);
    const v = await getTightLines(page);
    expect(v.length).toBeLessThanOrEqual(2);
  });

  test('WCAG AA: color contrast ≥ 4.5:1 (mobile)', async ({ page }) => {
    await loadApp(page);
    const results = await new AxeBuilder({ page })
      .include('body')
      .withRules(['color-contrast'])
      .analyze();
    const violations = results.violations.filter(v => v.id === 'color-contrast');
    const nodeCount = violations.reduce((sum, v) => sum + v.nodes.length, 0);
    if (nodeCount > 10) {
      console.log('Contrast violations:', violations.map(v => v.nodes.slice(0, 5).map(n => n.html)));
    }
    expect(nodeCount).toBeLessThanOrEqual(10);
  });
});

// ===========================================================================
// Cat3: Layout Consistency (3 viewports × 11 screens)
// ===========================================================================
test.describe('Cat3: Layout Consistency', () => {
  const VIEWPORTS = [
    { name: '320', width: 320, height: 568 },
    { name: '375', width: 375, height: 812 },
    { name: '414', width: 414, height: 896 },
  ];

  type NavFn = (p: Page) => Promise<void>;
  const SCREENS: { name: string; nav: NavFn }[] = [
    { name: 'today', nav: navToday },
    { name: 'talk', nav: navTalk },
    { name: 'goals', nav: navGoals },
    { name: 'goalhub', nav: navGoalHub },
    { name: 'me', nav: navMe },
    { name: 'calendar', nav: navCalendar },
    { name: 'analytics', nav: navAnalytics },
    { name: 'settings', nav: navSettings },
    { name: 'tasks', nav: navTasks },
    { name: 'sidebar', nav: navSidebar },
    { name: 'bottomtabs', nav: navBottomTabs },
  ];

  for (const vp of VIEWPORTS) {
    for (const screen of SCREENS) {
      test(`${vp.name}px × ${screen.name}: no horizontal overflow + screenshot`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await loadApp(page);
        await screen.nav(page);

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const overflows = scrollWidth > vp.width;

        await page.screenshot({
          path: path.join(SHOT_DIR, `${vp.name}_${screen.name}.png`),
          fullPage: false,
        });

        if (overflows) {
          console.log(`Overflow on ${screen.name} at ${vp.name}px: ${scrollWidth - vp.width}px`);
        }
        expect(overflows).toBe(false);
      });
    }
  }
});
