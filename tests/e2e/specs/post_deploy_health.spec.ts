/*
 * GENERATED: DO NOT MODIFY
 * templates/tests/e2e/specs/post_deploy_health.spec.ts.template
 *
 * derived-from: SUBAGENT-DEVSYS-7PHASE-TEST-DEPLOY-V1 (PO 直命 2026-05-04 PO-DIRECTIVE-014)
 * spec-ref:
 *   - core_spec.md §2.25.21 (Primary Quality Gate Inversion)
 *   - core_spec.md §2.25.16.10 (機械強制 マトリクス)
 *   - docs/po-decisions.md PO-DIRECTIVE-014 (7 phase ワークフロー 機械強制)
 *
 * 用途:
 *   goal-ai-worker の post-deploy 実機 health check spec。 production /health endpoint に
 *   Playwright APIRequestContext で curl 相当 invoke、 HTTP 200 + JSON status ok を機械強制 verify。
 *
 * Phase 6 連携:
 *   - 7 phase: コンセプト → 仕様書 → 実装 → 仕様↔実装一致 test → spec通り動くか test → 実機 test → 配布
 *   - 本 spec = 「実機 test」 (= phase 6) の post-deploy mechanical verification
 *   - scripts/post_deploy_smoke.sh と並列、 Playwright runtime で同等 verify
 *
 * Placeholders:
 *   goal-ai-worker    : 生成 App 名 (例: lais / goal-ai-worker)
 *   goal-ai-worker.goalai-futoshi.workers.dev  : production domain (例: goal-ai-worker.goalai-futoshi.workers.dev)
 *
 * Run:
 *   npx playwright test tests/e2e/specs/post_deploy_health.spec.ts
 *   APP_DOMAIN=<custom> npx playwright test tests/e2e/specs/post_deploy_health.spec.ts
 */
import { test, expect, request } from '@playwright/test';

const APP_DOMAIN = process.env.APP_DOMAIN || 'goal-ai-worker.goalai-futoshi.workers.dev';
const HEALTH_PATH = process.env.HEALTH_PATH || '/health';
const HEALTH_URL = `https://${APP_DOMAIN}${HEALTH_PATH}`;
const MAX_RETRY = 3;
const RETRY_INTERVAL_MS = 5000;

test.describe('post-deploy health spec — goal-ai-worker (phase 6 機械強制)', () => {
  test('production /health 200 + status ok (3 retry)', async () => {
    const apiContext = await request.newContext({
      baseURL: `https://${APP_DOMAIN}`,
      timeout: 30000,
    });

    let attempt = 1;
    let success = false;
    let lastStatus = 0;
    let lastBody = '';

    while (attempt <= MAX_RETRY) {
      console.log(`[post_deploy_health][goal-ai-worker] attempt ${attempt}/${MAX_RETRY}: GET ${HEALTH_URL}`);
      try {
        const response = await apiContext.get(HEALTH_PATH, { failOnStatusCode: false });
        lastStatus = response.status();
        lastBody = await response.text();

        if (lastStatus === 200) {
          if (/("status"\s*:\s*"ok"|"ok"\s*:\s*true|status.*ok)/i.test(lastBody)) {
            console.log(`[post_deploy_health][goal-ai-worker] HTTP 200 + status ok 確認`);
            success = true;
            break;
          }
          console.log(`[post_deploy_health][goal-ai-worker] HTTP 200 だが status not ok: ${lastBody}`);
        } else {
          console.log(`[post_deploy_health][goal-ai-worker] HTTP ${lastStatus} != 200`);
        }
      } catch (e) {
        console.log(`[post_deploy_health][goal-ai-worker] curl error: ${e}`);
      }

      attempt++;
      if (attempt <= MAX_RETRY) {
        await new Promise((r) => setTimeout(r, RETRY_INTERVAL_MS));
      }
    }

    await apiContext.dispose();

    expect(success, `post-deploy health check FAIL: HTTP ${lastStatus}, body=${lastBody}`).toBe(true);
  });

  test('production /health response time < 5000ms', async () => {
    const apiContext = await request.newContext({
      baseURL: `https://${APP_DOMAIN}`,
      timeout: 30000,
    });

    const start = Date.now();
    const response = await apiContext.get(HEALTH_PATH, { failOnStatusCode: false });
    const elapsedMs = Date.now() - start;

    await apiContext.dispose();

    console.log(`[post_deploy_health][goal-ai-worker] /health response time: ${elapsedMs}ms`);
    expect(elapsedMs, `/health response time ${elapsedMs}ms > 5000ms`).toBeLessThan(5000);
    expect(response.status()).toBe(200);
  });
});
