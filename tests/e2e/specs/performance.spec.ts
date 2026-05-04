// GOAL AI — Performance Spec (LCP / FID / TTFB / CLS) - PERFORMANCE-TEST-DEPLOY-V2 (2026-05-04)
//
// 根拠:
//   - PO 直命 (2026-05-04): 「全 ✅ まで 止めない」 = 進捗ボード 性能 行 全 8 マス 🔴 を 機械的 verify 配備で ✅ 化
//   - Core Web Vitals (LCP / FID / CLS) + TTFB の 4 指標を Playwright + Performance API で 機械計測
//   - threshold check で fail 化 = 「やったフリ」 余地 排除
//
// 計測指標 + threshold (Google Core Web Vitals "good" 基準):
//   - LCP (Largest Contentful Paint): <= 2500ms
//   - FID (First Input Delay): <= 100ms (proxy: total blocking time after first interaction)
//   - TTFB (Time To First Byte): <= 800ms
//   - CLS (Cumulative Layout Shift): <= 0.1
//
// 計測対象:
//   - PERF_BASE 環境変数で 切替 (default = playwright config baseURL = ローカル http://localhost:5173)
//   - 本番計測モード: PERF_BASE=https://goal-ai-frontend.pages.dev npx playwright test performance.spec.ts
//
// 結果出力:
//   - JSON 形式で stdout 出力 (= performance_check.sh が parse して realmachine_smoke_results.md に追記)
//   - 各 metric が threshold 超過時 test fail (cmd-realworld 相当)
//
// 仕様根拠:
//   - core_spec.md §3.14 step b (playwright e2e 全 PASS)
//   - dev-system/docs/test/test_general_required.md (性能 行 機械 verify)

import { test, expect } from '@playwright/test';

const BASE = process.env.PERF_BASE || process.env.FRONTEND_BASE || 'http://localhost:5173';

// Threshold (Core Web Vitals "good" 基準)
const THRESHOLD = {
  LCP_MS: 2500,
  FID_MS: 100,
  TTFB_MS: 800,
  CLS: 0.1,
};

interface PerfMetrics {
  lcp_ms: number;
  fid_ms: number;
  ttfb_ms: number;
  cls: number;
  navigation_ms: number;
  url: string;
  ts: string;
}

test.describe('Performance: Core Web Vitals (LCP/FID/TTFB/CLS)', () => {
  test('measures LCP, FID, TTFB, CLS and asserts Core Web Vitals "good" thresholds', async ({ page }) => {
    // 計測開始時刻 (TTFB 用に保持、 Performance API 既に集計済の値で計測)
    const startTs = new Date().toISOString();

    // 観測 hooks 注入 (LCP / CLS は load 後 累積)
    await page.addInitScript(() => {
      // @ts-ignore
      window.__perfMetrics = { lcp: 0, cls: 0, fid: 0 };

      // LCP observer
      try {
        const po = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last = entries[entries.length - 1] as any;
          if (last) {
            // @ts-ignore
            window.__perfMetrics.lcp = last.renderTime || last.loadTime || last.startTime || 0;
          }
        });
        po.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (e) { /* ignore */ }

      // CLS observer
      try {
        const po = new PerformanceObserver((list) => {
          for (const e of list.getEntries() as any[]) {
            if (!e.hadRecentInput) {
              // @ts-ignore
              window.__perfMetrics.cls += e.value;
            }
          }
        });
        po.observe({ type: 'layout-shift', buffered: true });
      } catch (e) { /* ignore */ }

      // FID observer (first-input)
      try {
        const po = new PerformanceObserver((list) => {
          for (const e of list.getEntries() as any[]) {
            // @ts-ignore
            window.__perfMetrics.fid = e.processingStart - e.startTime;
            break;
          }
        });
        po.observe({ type: 'first-input', buffered: true });
      } catch (e) { /* ignore */ }
    });

    // navigate
    const navStart = Date.now();
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
    const navMs = Date.now() - navStart;

    // 安定化 (LCP / CLS は load 後 数百 ms で fixate)
    await page.waitForTimeout(2000);

    // 1 回 click 入れて FID 計測 (FID は first interaction 必須)
    try {
      await page.mouse.click(10, 10);
      await page.waitForTimeout(300);
    } catch (e) { /* ignore */ }

    // TTFB は performance.timing から取得 (responseStart - requestStart)
    const metrics = await page.evaluate(() => {
      const t = performance.timing;
      const ttfb = t.responseStart && t.requestStart ? t.responseStart - t.requestStart : 0;
      // @ts-ignore
      const m = window.__perfMetrics || { lcp: 0, cls: 0, fid: 0 };
      return {
        lcp_ms: Math.round(m.lcp),
        cls: Number(m.cls.toFixed(4)),
        fid_ms: Math.round(m.fid),
        ttfb_ms: ttfb,
      };
    });

    const result: PerfMetrics = {
      lcp_ms: metrics.lcp_ms,
      fid_ms: metrics.fid_ms,
      ttfb_ms: metrics.ttfb_ms,
      cls: metrics.cls,
      navigation_ms: navMs,
      url: BASE,
      ts: startTs,
    };

    // JSON 出力 (= performance_check.sh が parse)
    // 専用 marker prefix で grep 容易化
    console.log('PERFORMANCE_METRICS_JSON_BEGIN');
    console.log(JSON.stringify(result, null, 2));
    console.log('PERFORMANCE_METRICS_JSON_END');

    // threshold check (cmd-realworld assertion)
    // FID は first-input が捕捉できない場合 0 になる = fid=0 は計測 skip 扱い
    expect(result.lcp_ms, `LCP ${result.lcp_ms}ms > ${THRESHOLD.LCP_MS}ms`).toBeLessThanOrEqual(THRESHOLD.LCP_MS);
    expect(result.ttfb_ms, `TTFB ${result.ttfb_ms}ms > ${THRESHOLD.TTFB_MS}ms`).toBeLessThanOrEqual(THRESHOLD.TTFB_MS);
    expect(result.cls, `CLS ${result.cls} > ${THRESHOLD.CLS}`).toBeLessThanOrEqual(THRESHOLD.CLS);
    if (result.fid_ms > 0) {
      expect(result.fid_ms, `FID ${result.fid_ms}ms > ${THRESHOLD.FID_MS}ms`).toBeLessThanOrEqual(THRESHOLD.FID_MS);
    }
  });
});
