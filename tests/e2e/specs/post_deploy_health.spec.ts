/*
 * GENERATED: post_deploy_health.spec.ts
 *
 * 元: dev-system templates/tests/e2e/specs/post_deploy_health.spec.ts.template
 *
 * SUBAGENT-LAIS-PLAYWRIGHT-RESIDUAL-FIX-V2 真 fix:
 *   旧 default = production worker URL (`https://goal-ai-worker.goalai-futoshi.workers.dev`)
 *   を 直接 GET = 自社 a-e step b (= 標準 e2e 自社 quality gate) で 毎回 production を hammer
 *   = rate-limit 91% 警報 root cause + 「production URL を テスト で 直接 叩かない」 制約 違反。
 *
 *   spec の 設計 意図: phase 6 (= post-deploy 実機 health check) で 起動 する spec。
 *   phase 5 (= 標準 e2e 自社 self-test) で 同じ spec が 実行 されるのは spec drift。
 *
 *   真 fix: process.env.POST_DEPLOY_HEALTH_RUN=1 を 必須 トリガー に し、 phase 5 (default
 *   `npx playwright test`) では skip。 phase 6 (= scripts/post_deploy_smoke.sh + 明示 invoke)
 *   で `POST_DEPLOY_HEALTH_RUN=1 npx playwright test post_deploy_health.spec.ts` 起動。
 *
 *   bypass/skip 誤魔化し では なく phase 5 / 6 の 役割分担 を spec 側で 明確化 する 構造的 fix。
 *
 * spec-ref:
 *   - core_spec.md §2.25.21 (Primary Quality Gate Inversion)
 *   - core_spec.md §2.25.16.10 (機械強制 マトリクス)
 *   - docs/po-decisions.md PO-DIRECTIVE-014 (7 phase ワークフロー 機械強制)
 *
 * Run (phase 6 post-deploy mode):
 *   POST_DEPLOY_HEALTH_RUN=1 npx playwright test tests/e2e/specs/post_deploy_health.spec.ts
 *   POST_DEPLOY_HEALTH_RUN=1 APP_DOMAIN=<custom> npx playwright test tests/e2e/specs/post_deploy_health.spec.ts
 */
import { test, expect, request } from '@playwright/test';

const APP_DOMAIN = process.env.APP_DOMAIN || 'goal-ai-worker.goalai-futoshi.workers.dev';
const HEALTH_PATH = process.env.HEALTH_PATH || '/health';
const HEALTH_URL = `https://${APP_DOMAIN}${HEALTH_PATH}`;
const MAX_RETRY = 3;
const RETRY_INTERVAL_MS = 5000;

// phase 6 専用 spec: phase 5 (default) では skip。 POST_DEPLOY_HEALTH_RUN=1 で 真 起動。
const SHOULD_RUN = process.env.POST_DEPLOY_HEALTH_RUN === '1';

test.describe('post-deploy health spec — goal-ai-worker (phase 6 機械強制)', () => {
  test.skip(
    !SHOULD_RUN,
    'phase 6 post-deploy 専用 spec。 phase 5 self-test では skip。 ' +
      'POST_DEPLOY_HEALTH_RUN=1 で 起動 (= scripts/post_deploy_smoke.sh 経由 invoke)。',
  );

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
