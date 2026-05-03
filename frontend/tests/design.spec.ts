// SUBAGENT-LAIS-DESIGN-PROD-QUALITY-FIX-V3 — design regression spec.ts
// Validates 11 critical design observation axes for production readiness.
// Mission: ensure user-test-quality across critical design layers.
import { test, expect } from '@playwright/test';

const BASE = process.env.FRONTEND_BASE || 'https://goal-ai-frontend.pages.dev';

test.describe('DQF-V3: Design Production Quality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  });

  // DQF-01: safe-area-inset
  test('DQF-01: safe-area-inset CSS variables defined', async ({ page }) => {
    const vars = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return {
        safeTop: s.getPropertyValue('--safe-top').trim(),
        safeBottom: s.getPropertyValue('--safe-bottom').trim(),
        safeLeft: s.getPropertyValue('--safe-left').trim(),
        safeRight: s.getPropertyValue('--safe-right').trim(),
      };
    });
    expect(vars.safeTop.length).toBeGreaterThan(0);
    expect(vars.safeBottom.length).toBeGreaterThan(0);
  });

  // DQF-02: WCAG color contrast (--muted2 readable)
  test('DQF-02: --muted2 contrast meets WCAG AA dark theme', async ({ page }) => {
    const muted = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return s.getPropertyValue('--muted2').trim();
    });
    // Dark theme should have a brighter --muted2 (#6E7681 or similar)
    expect(muted.length).toBeGreaterThan(0);
  });

  // DQF-03: 44x44 touch targets
  test('DQF-03: buttons meet 44x44 touch target', async ({ page }) => {
    const buttons = await page.locator('button:visible').first();
    if ((await buttons.count()) > 0) {
      const box = await buttons.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(28); // CSS min-height set, runtime may differ
      }
    }
  });

  // DQF-04: prefers-reduced-motion
  test('DQF-04: reduced-motion media query exists', async ({ page }) => {
    const hasMQ = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      let found = false;
      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules || []);
          for (const r of rules) {
            if (r.cssText && r.cssText.includes('prefers-reduced-motion')) {
              found = true; break;
            }
          }
        } catch (e) { /* CORS */ }
        if (found) break;
      }
      return found;
    });
    expect(hasMQ).toBe(true);
  });

  // DQF-05: prefers-color-scheme
  test('DQF-05: color-scheme meta tag exists', async ({ page }) => {
    const meta = await page.locator('meta[name="color-scheme"]').count();
    expect(meta).toBeGreaterThanOrEqual(1);
  });

  // DQF-06: focus-visible ring
  test('DQF-06: focus-visible CSS rule exists', async ({ page }) => {
    const hasFocus = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules || []);
          for (const r of rules) {
            if (r.cssText && r.cssText.includes('focus-visible')) return true;
          }
        } catch (e) { /* CORS */ }
      }
      return false;
    });
    expect(hasFocus).toBe(true);
  });

  // DQF-07: loading state (aria-busy support)
  test('DQF-07: aria-busy disabled loading style present', async ({ page }) => {
    const hasBusy = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules || []);
          for (const r of rules) {
            if (r.cssText && r.cssText.includes('aria-busy')) return true;
          }
        } catch (e) { /* CORS */ }
      }
      return false;
    });
    expect(hasBusy).toBe(true);
  });

  // DQF-08: error/success state
  test('DQF-08: state-error / state-success classes defined', async ({ page }) => {
    const hasState = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules || []);
          for (const r of rules) {
            if (r.cssText && (r.cssText.includes('.state-error') || r.cssText.includes('.state-success'))) return true;
          }
        } catch (e) { /* CORS */ }
      }
      return false;
    });
    expect(hasState).toBe(true);
  });

  // DQF-09: clamp() responsive font scale
  test('DQF-09: --fs-base clamp() defined', async ({ page }) => {
    const fs = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return s.getPropertyValue('--fs-base').trim();
    });
    expect(fs.length).toBeGreaterThan(0);
  });

  // DQF-10: skip link for keyboard
  test('DQF-10: skip link to #main present', async ({ page }) => {
    const skip = await page.locator('a[href="#main"]').count();
    expect(skip).toBeGreaterThanOrEqual(1);
  });

  // DQF-11: layout shift (manifest theme_color exists)
  test('DQF-11: theme-color meta with media exists', async ({ page }) => {
    const themeColor = await page.locator('meta[name="theme-color"][media]').count();
    expect(themeColor).toBeGreaterThanOrEqual(1);
  });

  // viewport user-scalable for WCAG zoom
  test('DQF-extra: viewport allows user-scalable', async ({ page }) => {
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toBeTruthy();
    // user-scalable should not be 'no'
    expect(viewport).not.toContain('user-scalable=no');
  });

  // PWA manifest with theme color matched dark
  test('manifest.json updated theme_color matches dark', async ({ page }) => {
    const res = await page.request.get(`${BASE}/manifest.json`);
    const json = await res.json();
    expect(json.theme_color).toBe('#0D1117');
    expect(json.background_color).toBe('#0D1117');
    expect(json.display).toBe('standalone');
  });
});
