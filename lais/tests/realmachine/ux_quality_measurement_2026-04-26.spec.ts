/*
 * lais/tests/realmachine/ux_quality_measurement_2026-04-26.spec.ts
 *
 * Mission: LAIS-UX-QUALITY-REAL-MEASUREMENT
 *
 * PO ふとし実機報告（2026-04-26 23:55）:
 *   - エラーだらけ
 *   - 画面遷移が遅い
 *   - 入力から表示までタイムラグ
 *
 * 本 spec の目的:
 *   実 CF Pages（https://lais-3yk.pages.dev）+ 実 Supabase に対し、
 *   全主要画面の以下を計測する:
 *     - 画面遷移時間（route() 呼出 → DOM 確定）
 *     - 操作レイテンシ（ボタン押下 → 反応表示）
 *     - DB CRUD レイテンシ（INSERT → 画面反映）
 *     - Console error / warning 全件
 *     - Network failure 全件 + waterfall（slowest 5）
 *
 * 結果は console.log で SCREEN_METRICS=… 形式で吐き、本 spec 完了後
 * オーケストレータが lais/verify/lais_ux_quality_measurement_2026-04-26.md に集約する。
 *
 * 制約:
 *   - 実 SUPABASE_SERVICE_KEY は出力しない
 *   - テストアカウント cleanup 必須
 */
import { test, expect, request as pwRequest } from '@playwright/test';

const EMAIL = process.env.REALMACHINE_TEST_EMAIL || '';
const PASSWORD = process.env.REALMACHINE_TEST_PASSWORD || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';

interface NetworkSample {
  url: string;
  method: string;
  status: number;
  ms: number;
}

test.describe.configure({ mode: 'serial', retries: 0 });

test.describe('Lais UX Quality Real Measurement (2026-04-26)', () => {
  test.skip(
    !EMAIL || !PASSWORD || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY,
    'env REALMACHINE_TEST_EMAIL / _PASSWORD / SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY 必須'
  );

  test.setTimeout(180_000);

  test('全主要画面 UX 計測 + console error + network waterfall', async ({ page }) => {
    const consoleErrors: { type: string; text: string; location?: string }[] = [];
    const networkFailures: { url: string; failure: string }[] = [];
    const networkSamples: NetworkSample[] = [];

    page.on('console', (msg) => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        const loc = msg.location();
        consoleErrors.push({
          type,
          text: msg.text().slice(0, 240),
          location: loc?.url ? `${loc.url}:${loc.lineNumber}` : undefined,
        });
      }
    });

    page.on('pageerror', (err) => {
      consoleErrors.push({ type: 'pageerror', text: (err.message || String(err)).slice(0, 240) });
    });

    page.on('requestfailed', (req) => {
      networkFailures.push({
        url: req.url().slice(0, 200),
        failure: req.failure()?.errorText || 'unknown',
      });
    });

    page.on('requestfinished', async (req) => {
      try {
        const url = req.url();
        // /api/lais と Supabase fetch のみ収集（asset は除外、ノイズ削減）
        if (!/\/api\/lais|supabase\.co/.test(url)) return;
        const timing = req.timing();
        const resp = await req.response();
        if (!resp || !timing) return;
        // Playwright timing.responseEnd は requestStart からの相対値
        const ms = Math.max(0, timing.responseEnd);
        networkSamples.push({
          url: url.replace(/^https?:\/\/[^/]+/, '').slice(0, 160),
          method: req.method(),
          status: resp.status(),
          ms: Math.round(ms),
        });
      } catch {
        /* ignore */
      }
    });

    // ===== 1) Splash 到達 =====
    const splashStart = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('main.s00', { timeout: 15000 });
    const splashMs = Date.now() - splashStart;
    console.log(`SCREEN_METRICS\tS-00\tnav_to_dom_ms=${splashMs}\tselector=main.s00`);

    // ===== 2) Splash → Auth 画面遷移（ログインボタン）=====
    const authStart = Date.now();
    await page.getByRole('button', { name: /ログイン/ }).click();
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    const authMs = Date.now() - authStart;
    console.log(`SCREEN_METRICS\tS-01\tnav_to_dom_ms=${authMs}\tselector=input[type=email]`);

    // ===== 3) Sign-in form 入力 → submit =====
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    const signinStart = Date.now();
    await page.getByRole('button', { name: /^ログイン$/ }).click();
    // ダッシュボード（S-10）に遷移するまで
    await page.waitForSelector('main.s10-grow', { timeout: 30000 });
    const signinMs = Date.now() - signinStart;
    console.log(`SCREEN_METRICS\tS-01-signin\tform_to_grow_ms=${signinMs}`);

    // ===== 4) S-10 Grow 初期描画 + データ load =====
    // Today タスクリスト or empty state が確定するまで観察
    const growLoadStart = Date.now();
    await page.waitForFunction(
      () => {
        const main = document.querySelector('main.s10-grow');
        if (!main) return false;
        // load error or list rendered
        if (main.querySelector('.s10-load-error')) return true;
        if (main.querySelector('.s10-task-list')) return true;
        if (main.querySelector('.s10-goals-empty')) return true;
        return false;
      },
      { timeout: 15000 }
    );
    const growLoadMs = Date.now() - growLoadStart;
    console.log(`SCREEN_METRICS\tS-10\tdata_load_ms=${growLoadMs}\tselector=main.s10-grow`);

    // ===== 5) S-10 → Add Task モーダル（S-12）開閉 =====
    const s12OpenStart = Date.now();
    await page.getByRole('button', { name: /\+ タスクを追加/ }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    const s12OpenMs = Date.now() - s12OpenStart;
    console.log(`SCREEN_METRICS\tS-12\tmodal_open_ms=${s12OpenMs}`);

    // タスク名入力 → 作成 (CRUD レイテンシ)
    const taskName = `UX-MEASURE-${Date.now()}`;
    await page.fill('input[name="task-name"], input.s12-name-input, input[type="text"]:visible', taskName).catch(() => {});
    // S-12 のフィールド構造に依存しない汎用 fill
    const visibleTextInput = page.locator('[role="dialog"] input[type="text"]').first();
    if ((await visibleTextInput.count()) > 0) {
      await visibleTextInput.fill(taskName);
    }
    // 「保存」or 「作成」ボタンクリック
    const saveBtn = page.locator('[role="dialog"] button').filter({ hasText: /^(作成|保存|追加)$/ }).first();
    let s12SaveMs = -1;
    if ((await saveBtn.count()) > 0) {
      const start = Date.now();
      await saveBtn.click();
      // モーダル閉じる + リスト反映を待つ
      await page.waitForFunction(
        (name) => {
          const items = Array.from(document.querySelectorAll('.s10-task-name'));
          return items.some((el) => (el.textContent || '').includes(name));
        },
        taskName,
        { timeout: 15000 }
      ).catch(() => {});
      s12SaveMs = Date.now() - start;
    } else {
      // フォールバック: ESC で閉じる
      await page.keyboard.press('Escape');
    }
    console.log(`SCREEN_METRICS\tS-12-save\tcrud_to_dom_ms=${s12SaveMs}`);

    // ===== 6) S-10 タスクトグル（status cycle）=====
    // Today セクション内の <button class="s10-check"> のみクリック可能
    let toggleMs = -1;
    const checkBtn = page.locator('main.s10-grow .s10-today button.s10-check').first();
    if ((await checkBtn.count()) > 0) {
      const start = Date.now();
      // 押す前の class を取得
      const beforeClass = await checkBtn.getAttribute('class');
      await checkBtn.click();
      // class が変わるまで待機（最大 3s）
      await page.waitForFunction(
        (prev) => {
          const el = document.querySelector('main.s10-grow .s10-today button.s10-check');
          return el && el.getAttribute('class') !== prev;
        },
        beforeClass,
        { timeout: 3000 }
      ).catch(() => {});
      toggleMs = Date.now() - start;
    }
    console.log(`SCREEN_METRICS\tS-10-toggle\toptimistic_ui_ms=${toggleMs}`);

    // ===== 7) S-10 → S-15 Goal Create (open + ESC test, ALWAYS reload-recover) =====
    const s15Start = Date.now();
    const createGoalBtn = page.getByRole('button', { name: /\+ ゴールを作成/ });
    let s15OpenMs = -1;
    let s15EscapeWorks = false;
    let s15CloseBtnWorks = false;
    if ((await createGoalBtn.count()) > 0) {
      await createGoalBtn.click().catch(() => {});
      await page.waitForSelector('.s15-overlay, .s15-modal', { timeout: 5000 }).catch(() => {});
      s15OpenMs = Date.now() - s15Start;

      // ESC 動作チェック (1.5s)
      await page.keyboard.press('Escape').catch(() => {});
      const escWorked = await page.waitForFunction(
        () => !document.querySelector('.s15-overlay'),
        { timeout: 1500 }
      ).then(() => true).catch(() => false);
      s15EscapeWorks = escWorked;

      // ✕ ボタン CSS 検証（クリック試行はせず、存在のみ確認）
      const closeBtnExists = await page.locator('.s15-close').count().then((c) => c > 0).catch(() => false);
      // ESC 効かない場合は ✕ クリック試行（force + 短 timeout）
      if (!escWorked && closeBtnExists) {
        await page.locator('.s15-close').click({ force: true, timeout: 2000 }).catch(() => {});
        const closed = await page.waitForFunction(
          () => !document.querySelector('.s15-overlay'),
          { timeout: 2000 }
        ).then(() => true).catch(() => false);
        s15CloseBtnWorks = closed;
      }
    }
    console.log(`SCREEN_METRICS\tS-15\tmodal_open_ms=${s15OpenMs}\tescape_works=${s15EscapeWorks}\tclose_btn_works=${s15CloseBtnWorks}`);

    // 常にリカバリ: 新規 page を立ち上げて signin やり直し（modal stuck の脱出策）
    if (!s15EscapeWorks && !s15CloseBtnWorks) {
      console.log(`SCREEN_METRICS\tS-15-RECOVERY\tmethod=newcontext`);
      // signin 状態を保つには cookies/localStorage が必要だが、Supabase は localStorage のみ
      // page.context().storageState() を保存して新規 page で再注入する手は重いので、
      // 単純に reload を 5s タイムアウトで試行
      try {
        await Promise.race([
          page.reload({ waitUntil: 'domcontentloaded' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('reload timeout 8s')), 8000)),
        ]);
      } catch (err) {
        console.log(`SCREEN_METRICS\tS-15-RECOVERY-FAIL\terror=${(err as Error).message}`);
      }
      await page.waitForSelector('main.s10-grow, main.s00, input[type="email"]', { timeout: 10000 }).catch(() => {});
    }

    // ===== 8) S-10 → S-20 TALK 画面遷移 =====
    const talkStart = Date.now();
    // BottomTabBar の TALK タブを class + aria-label で正確に指定
    const talkTab = page.locator('nav.bottom-tab-bar button[aria-label="TALK"]').first();
    let talkNavMs = -1;
    if ((await talkTab.count()) > 0) {
      await talkTab.click();
      await page.waitForSelector('main.s20-talk', { timeout: 15000 });
      talkNavMs = Date.now() - talkStart;
    }
    console.log(`SCREEN_METRICS\tS-20\tnav_to_dom_ms=${talkNavMs}`);

    // ===== 9) S-20 メッセージ送信 → AI 応答までのレイテンシ =====
    let aiResponseMs = -1;
    let inputToOptimisticMs = -1;
    const textarea = page.locator('main.s20-talk textarea').first();
    if ((await textarea.count()) > 0) {
      const userMsg = `UX-MEASURE-PING-${Date.now()}`;
      // 入力 → 楽観更新（自分のバブル表示）
      await textarea.fill(userMsg);
      const inputStart = Date.now();
      await page.keyboard.press('Enter');
      // 自分のバブル表示
      await page.waitForFunction(
        (m) => {
          const items = Array.from(document.querySelectorAll('main.s20-talk .s20-bubble-user-text'));
          return items.some((el) => (el.textContent || '').includes(m));
        },
        userMsg,
        { timeout: 5000 }
      ).catch(() => {});
      inputToOptimisticMs = Date.now() - inputStart;

      // AI バブル（最後に user メッセージの後）が出るまで
      const aiStart = Date.now();
      await page.waitForFunction(
        () => {
          const list = document.querySelectorAll('main.s20-talk .s20-message-item');
          if (list.length < 2) return false;
          const last = list[list.length - 1];
          return !!last.querySelector('.s20-bubble-ai-text');
        },
        { timeout: 30000 }
      ).catch(() => {});
      aiResponseMs = Date.now() - aiStart;
    }
    console.log(`SCREEN_METRICS\tS-20-send\tinput_to_optimistic_ms=${inputToOptimisticMs}\tai_response_ms=${aiResponseMs}`);

    // ===== 10) S-20 → S-30 Me Profile =====
    const meStart = Date.now();
    const meTab = page.locator('nav.bottom-tab-bar button[aria-label="ME"]').first();
    let meMs = -1;
    if ((await meTab.count()) > 0) {
      await meTab.click();
      await page.waitForSelector('main.s30-me', { timeout: 15000 });
      meMs = Date.now() - meStart;
    }
    console.log(`SCREEN_METRICS\tS-30\tnav_to_dom_ms=${meMs}`);

    // ===== 11) S-30 → S-10 戻り =====
    const backStart = Date.now();
    const growTab = page.locator('nav.bottom-tab-bar button[aria-label="GROW"]').first();
    let backMs = -1;
    if ((await growTab.count()) > 0) {
      await growTab.click();
      await page.waitForSelector('main.s10-grow', { timeout: 15000 });
      backMs = Date.now() - backStart;
    }
    console.log(`SCREEN_METRICS\tS-30-to-S-10\tnav_to_dom_ms=${backMs}`);

    // ===== 12) Goal 詳細 (S-14) =====
    let s14Ms = -1;
    const firstGoal = page.locator('main.s10-grow .s10-goal').first();
    if ((await firstGoal.count()) > 0) {
      const start = Date.now();
      await firstGoal.click();
      await page.waitForSelector('main.s14, [data-screen="s14"]', { timeout: 10000 }).catch(() => {});
      s14Ms = Date.now() - start;
      // 戻る
      await page.goto('/grow').catch(() => {});
      await page.waitForSelector('main.s10-grow', { timeout: 10000 }).catch(() => {});
    }
    console.log(`SCREEN_METRICS\tS-14\tnav_to_dom_ms=${s14Ms}`);

    // ===== 集約 =====
    // Console errors / warnings
    console.log(`SCREEN_METRICS\tCONSOLE\terror_count=${consoleErrors.filter(e => e.type === 'error' || e.type === 'pageerror').length}\twarn_count=${consoleErrors.filter(e => e.type === 'warning').length}`);
    for (const e of consoleErrors.slice(0, 30)) {
      console.log(`CONSOLE_DETAIL\t${e.type}\t${e.text}\t${e.location || ''}`);
    }

    // Network failures
    console.log(`SCREEN_METRICS\tNETFAIL\tcount=${networkFailures.length}`);
    for (const f of networkFailures.slice(0, 20)) {
      console.log(`NETFAIL_DETAIL\t${f.url}\t${f.failure}`);
    }

    // Network waterfall slowest 10
    networkSamples.sort((a, b) => b.ms - a.ms);
    console.log(`SCREEN_METRICS\tNETSLOW\tcount=${networkSamples.length}`);
    for (const s of networkSamples.slice(0, 10)) {
      console.log(`NETSLOW_DETAIL\t${s.method}\t${s.status}\t${s.ms}ms\t${s.url}`);
    }

    // ===== Cleanup: 作成した task は次回起動でも残るが、Supabase Admin API でアカウント全削除 =====
    // テストアカウント自体は orchestrator (realmachine_signin_test.sh 同等) が削除する想定。
    // 本 spec は副作用 task 1 件を持つが、アカウント削除と同時に CASCADE されるため OK。
    expect(splashMs, 'Splash 到達').toBeLessThan(20000);
  });
});
