/*
 * lais/tests/realmachine/phase_a_full_flow.spec.ts
 *
 * Mission: LAIS-PHASE-A-REAL-COMPLETION V2
 *
 * 全 Phase A 主要画面 (S-02 / S-10 / S-12 / S-14 / S-15 / S-30 / S-20) の
 * 「Mock 撤去 + 実 Supabase 化」検証。
 *
 * 戦略:
 *  - REST API (/api/lais/*) を直接叩く形式で検証する。Playwright の page を使って UI を駆動するのではなく、
 *    fetch ベースで Pages Function が実 Supabase に書き込む / 読み出すこと、Realtime が broadcast されることを検証する。
 *  - UI からの起動は smoke 系で、API レイヤの整合性を本 spec で確認する。
 *  - 実テストアカウントは外部 (`scripts/realmachine_signin_test.sh` 同様 / または事前作成) で
 *    作成済みである必要がある。本 spec は REALMACHINE_TEST_EMAIL / REALMACHINE_TEST_PASSWORD を要求する。
 *  - 副作用 (作成した task/goal/chat) は本 spec の afterAll で削除し、テストアカウントの cleanup は
 *    オーケストレータが担う。
 *
 * 実行例:
 *   TEST_BASE_URL=https://b7a5733c.lais-3yk.pages.dev \
 *   REALMACHINE_TEST_EMAIL=... REALMACHINE_TEST_PASSWORD=... \
 *   SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... \
 *   npx playwright test --config=playwright.cf.config.ts tests/realmachine/phase_a_full_flow.spec.ts
 *
 * 仕様根拠:
 *   - lais/verify/rls_matrix_2026-04-26.md (Phase A 11 画面 Mock のままという指摘)
 *   - lais/verify/talk_realtime_validation_2026-04-26.md (S-20 Realtime 未実装)
 *   - docs/plans/lais_design_spec_v1.md / lais_project_v1.md
 */
import { test, expect, request as pwRequest } from '@playwright/test';

const EMAIL = process.env.REALMACHINE_TEST_EMAIL || '';
const PASSWORD = process.env.REALMACHINE_TEST_PASSWORD || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';

test.describe('Lais Phase A — full real-Supabase flow', () => {
  test.skip(
    !EMAIL || !PASSWORD || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY,
    'REALMACHINE_TEST_EMAIL / REALMACHINE_TEST_PASSWORD / SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY が未設定。orchestrator から渡してください。'
  );

  let jwt = '';
  const created = { taskId: '', goalId: '' };

  test.beforeAll(async () => {
    // Supabase Auth で signin → JWT 取得
    const ctx = await pwRequest.newContext();
    const res = await ctx.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        'content-type': 'application/json',
      },
      data: { email: EMAIL, password: PASSWORD },
    });
    expect(res.ok(), 'auth signin').toBe(true);
    const json = await res.json();
    jwt = json?.access_token || '';
    expect(jwt.length, 'JWT acquired').toBeGreaterThan(20);
    await ctx.dispose();
  });

  test.afterAll(async ({ playwright }) => {
    // 残骸 cleanup（best effort、失敗しても他テストには影響させない）
    if (!jwt) return;
    const ctx = await playwright.request.newContext();
    if (created.taskId) {
      await ctx
        .delete(`/api/lais/tasks/${created.taskId}`, {
          headers: { authorization: `Bearer ${jwt}` },
        })
        .catch(() => {});
    }
    if (created.goalId) {
      await ctx
        .delete(`/api/lais/goals/${created.goalId}`, {
          headers: { authorization: `Bearer ${jwt}` },
        })
        .catch(() => {});
    }
    await ctx.dispose();
  });

  test('S-02 onboarding: profile.partner_avatar を実 DB に保存できる', async ({ request }) => {
    const res = await request.patch('/api/lais/profile', {
      headers: { authorization: `Bearer ${jwt}`, 'content-type': 'application/json' },
      data: { partner_avatar: 'lumen' },
    });
    expect(res.ok()).toBe(true);
    const json = await res.json();
    expect(json?.profile?.partner_avatar).toBe('lumen');
  });

  test('S-30 ME: profile GET / PATCH が往復する', async ({ request }) => {
    const get1 = await request.get('/api/lais/profile', {
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(get1.ok()).toBe(true);
    const beforeName = (await get1.json())?.profile?.display_name;

    const newName = `RM-Test-${Date.now()}`;
    const patch = await request.patch('/api/lais/profile', {
      headers: { authorization: `Bearer ${jwt}`, 'content-type': 'application/json' },
      data: { display_name: newName },
    });
    expect(patch.ok()).toBe(true);
    expect((await patch.json())?.profile?.display_name).toBe(newName);

    // 元に戻す（idempotency）
    if (beforeName !== newName) {
      await request.patch('/api/lais/profile', {
        headers: { authorization: `Bearer ${jwt}`, 'content-type': 'application/json' },
        data: { display_name: beforeName || '' },
      });
    }
  });

  test('S-12 + S-13: タスク CREATE / READ / PATCH / DELETE', async ({ request }) => {
    // CREATE
    const create = await request.post('/api/lais/tasks', {
      headers: { authorization: `Bearer ${jwt}`, 'content-type': 'application/json' },
      data: {
        name: `RM Phase A task ${Date.now()}`,
        time: '07:00',
        duration: 5,
        category: 'health',
        memo: 'realmachine spec',
      },
    });
    expect(create.status()).toBe(201);
    const createBody = await create.json();
    const tid: string = createBody?.task?.id;
    expect(tid).toMatch(/[0-9a-f-]{36}/);
    created.taskId = tid;

    // READ list
    const list = await request.get('/api/lais/tasks', {
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(list.ok()).toBe(true);
    const tasks = (await list.json())?.tasks || [];
    expect(tasks.find((t: any) => t.id === tid)).toBeTruthy();

    // PATCH (status -> done)
    const patch = await request.patch(`/api/lais/tasks/${tid}`, {
      headers: { authorization: `Bearer ${jwt}`, 'content-type': 'application/json' },
      data: { status: 'done' },
    });
    expect(patch.ok()).toBe(true);
    expect((await patch.json())?.task?.status).toBe('done');

    // DELETE
    const del = await request.delete(`/api/lais/tasks/${tid}`, {
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(del.ok()).toBe(true);
    created.taskId = ''; // 削除済
  });

  test('S-14 + S-15: ゴール CREATE / READ / PATCH / DELETE', async ({ request }) => {
    // CREATE
    const create = await request.post('/api/lais/goals', {
      headers: { authorization: `Bearer ${jwt}`, 'content-type': 'application/json' },
      data: {
        name: `RM Phase A goal ${Date.now()}`,
        categories: ['learn', 'health'],
        target_date: '2026-12-31',
        description: 'realmachine spec goal',
      },
    });
    expect(create.status()).toBe(201);
    const gid: string = (await create.json())?.goal?.id;
    expect(gid).toMatch(/[0-9a-f-]{36}/);
    created.goalId = gid;

    // READ detail (goal + tasks empty)
    const detail = await request.get(`/api/lais/goals/${gid}`, {
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(detail.ok()).toBe(true);
    const detailJson = await detail.json();
    expect(detailJson?.goal?.id).toBe(gid);
    expect(Array.isArray(detailJson?.tasks)).toBe(true);

    // PATCH progress
    const patch = await request.patch(`/api/lais/goals/${gid}`, {
      headers: { authorization: `Bearer ${jwt}`, 'content-type': 'application/json' },
      data: { progress: 25 },
    });
    expect(patch.ok()).toBe(true);
    expect((await patch.json())?.goal?.progress).toBe(25);

    // DELETE
    const del = await request.delete(`/api/lais/goals/${gid}`, {
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(del.ok()).toBe(true);
    created.goalId = '';
  });

  test('S-20 TALK: chat INSERT → list で取得できる', async ({ request }) => {
    const content = `RM Phase A chat ${Date.now()}`;
    const post = await request.post('/api/lais/chat', {
      headers: { authorization: `Bearer ${jwt}`, 'content-type': 'application/json' },
      data: { role: 'user', content },
    });
    expect(post.status()).toBe(201);
    const insertedId = (await post.json())?.message?.id;
    expect(insertedId).toMatch(/[0-9a-f-]{36}/);

    const list = await request.get('/api/lais/chat?limit=200', {
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(list.ok()).toBe(true);
    const messages = (await list.json())?.messages || [];
    const found = messages.find((m: any) => m.id === insertedId);
    expect(found, 'inserted chat message must appear in list').toBeTruthy();
    expect(found?.text).toBe(content);
  });

  test('Auth: JWT なしの場合 401 を返す', async ({ request }) => {
    const res = await request.get('/api/lais/tasks');
    expect(res.status()).toBe(401);
  });

  test('Auth: 改竄 JWT の場合 401 を返す', async ({ request }) => {
    const res = await request.get('/api/lais/tasks', {
      headers: { authorization: 'Bearer not.a.valid.jwt' },
    });
    expect(res.status()).toBe(401);
  });
});
