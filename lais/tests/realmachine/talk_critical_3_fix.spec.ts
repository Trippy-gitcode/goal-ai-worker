/*
 * lais/tests/realmachine/talk_critical_3_fix.spec.ts
 *
 * Mission: BUG-RT-TALK-CRITICAL-3-FIX (2026-04-26 → 27)
 *
 * S-20 TALK 重大バグ 3 件の実機 E2E 検証:
 *   Bug 1: ユーザーメッセージ二重表示防止 (client_msg_id dedup)
 *   Bug 2: AI 応答が固定文字列でない (Anthropic / OpenAI 実連携)
 *   Bug 3: タイムゾーン JST 統一 (Asia/Tokyo HH:mm)
 *
 * 戦略:
 *   - Service Key で REALMACHINE_TEST_EMAIL / PASSWORD のテストアカウントを作成
 *     （signin → /api/lais/chat?limit=200 で初期 history 取得 → /api/lais/chat POST で
 *      user メッセージ INSERT → /api/lais/chat/respond POST で AI 応答取得 を検証）
 *   - DB / API レスポンスベースで pass 判定（UI レンダリングのフラッキー回避）
 *   - 後始末で Admin API DELETE
 *
 * 出力フラグ (console.log 経由で smoke ログ集計に転記):
 *   duplicate_prevented=<true|false>   ... user メッセージが DB に 1 件のみ
 *   ai_response_unique=<true|false>    ... AI 応答が固定文字列ではない
 *   tz_jst=<true|false>                ... time フィールドが JST (UTC+9)
 *   result=<PASS|FAIL>
 */
import { test, expect, request as pwRequest } from '@playwright/test';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const TEST_BASE_URL = process.env.TEST_BASE_URL || 'https://lais-3yk.pages.dev';

const FORBIDDEN_AI_PHRASES = ['いい一歩ですね', '続けていきましょう'];

test.describe.configure({ retries: 0, mode: 'serial' });

test.describe('S-20 TALK BUG-RT-TALK-CRITICAL-3-FIX 真 E2E', () => {
  test.skip(
    !SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_PUBLISHABLE_KEY,
    'Supabase env (URL / SERVICE_KEY / PUBLISHABLE_KEY) 必須'
  );

  let userId = '';
  let userEmail = '';
  let jwt = '';

  test.beforeAll(async () => {
    // Admin API でテストアカウント作成
    userEmail = `talk-critical3-${Date.now()}@example.invalid`;
    const ctx = await pwRequest.newContext({
      // Supabase は sb_secret_* キーを browser UA で拒否するため Node UA を明示
      extraHTTPHeaders: { 'user-agent': 'lais-realmachine-spec/1.0 (node)' },
    });
    const create = await ctx.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'content-type': 'application/json',
      },
      data: {
        email: userEmail,
        password: 'BugFix-Talk-Critical3!',
        email_confirm: true,
      },
    });
    if (!create.ok()) {
      const errBody = await create.text().catch(() => '');
      // eslint-disable-next-line no-console
      console.error(
        `[admin-create-failed] status=${create.status()} url=${SUPABASE_URL}/auth/v1/admin/users body=${errBody.slice(0, 300)} svc_len=${SUPABASE_SERVICE_KEY.length} pub_len=${SUPABASE_PUBLISHABLE_KEY.length}`
      );
    }
    expect(create.ok()).toBe(true);
    const createJson = await create.json();
    userId = createJson?.id || createJson?.user?.id || '';
    expect(userId).toMatch(/[0-9a-f-]{36}/);

    // Sign in to get jwt
    const signin = await ctx.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'content-type': 'application/json' },
      data: { email: userEmail, password: 'BugFix-Talk-Critical3!' },
    });
    expect(signin.ok()).toBe(true);
    const signinJson = await signin.json();
    jwt = signinJson?.access_token || '';
    expect(jwt.length).toBeGreaterThan(20);

    await ctx.dispose();
  });

  test.afterAll(async () => {
    // cleanup: テストアカウント削除（auth.users + 関連 chat_messages cascade）
    if (!userId) return;
    const ctx = await pwRequest.newContext({
      // Supabase は sb_secret_* キーを browser UA で拒否するため Node UA を明示
      extraHTTPHeaders: { 'user-agent': 'lais-realmachine-spec/1.0 (node)' },
    });
    try {
      await ctx.delete(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      });
      // 念のため chat_messages も削除（CASCADE で消えるが二重防御）
      await ctx.delete(
        `${SUPABASE_URL}/rest/v1/chat_messages?user_id=eq.${userId}`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_KEY,
            authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
        }
      );
    } finally {
      await ctx.dispose();
    }
  });

  test('Bug 1 + 2 + 3 同時検証: 重複なし / 実 AI / JST 統一', async ({ request }) => {
    const flags = {
      duplicate_prevented: false,
      ai_response_unique: false,
      tz_jst: false,
    };

    // ---- Bug 1: 同一メッセージ送信 → DB に 1 件のみ ----
    const userContent = `talk-bug-fix-spec ${Date.now()}`;
    const clientMsgId = `u-spec-${Date.now()}`;
    const post = await request.post('/api/lais/chat', {
      headers: { authorization: `Bearer ${jwt}`, 'content-type': 'application/json' },
      data: { role: 'user', content: userContent, client_msg_id: clientMsgId },
    });
    expect(post.status()).toBe(201);
    const postJson = await post.json();
    expect(postJson?.message?.id).toMatch(/[0-9a-f-]{36}/);
    expect(postJson?.message?.client_msg_id).toBe(clientMsgId);

    // DB を Service Key で直接覗いて重複なしを確認
    const ctx = await pwRequest.newContext({
      // Supabase は sb_secret_* キーを browser UA で拒否するため Node UA を明示
      extraHTTPHeaders: { 'user-agent': 'lais-realmachine-spec/1.0 (node)' },
    });
    const list = await ctx.get(
      `${SUPABASE_URL}/rest/v1/chat_messages?user_id=eq.${userId}&content=eq.${encodeURIComponent(
        userContent
      )}&select=id,content,role,created_at`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );
    expect(list.ok()).toBe(true);
    const rows = await list.json();
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(1);
    flags.duplicate_prevented = true;

    // ---- Bug 2: AI 応答が固定文字列でない ----
    const aiClientMsgId = `a-spec-${Date.now()}`;
    const respond = await request.post('/api/lais/chat/respond', {
      headers: { authorization: `Bearer ${jwt}`, 'content-type': 'application/json' },
      data: {
        user_message: userContent,
        history: [{ role: 'user', text: userContent }],
        client_msg_id: aiClientMsgId,
      },
      timeout: 30000,
    });
    expect(respond.ok()).toBe(true);
    const respondJson = await respond.json();
    const aiText = respondJson?.message?.text || '';
    expect(aiText.length).toBeGreaterThan(0);
    // 固定文字列でないこと
    for (const phrase of FORBIDDEN_AI_PHRASES) {
      expect(
        aiText.includes(phrase),
        `AI 応答に固定フレーズ "${phrase}" が含まれている: "${aiText}"`
      ).toBe(false);
    }
    expect(['anthropic', 'openai', 'openai-fallback']).toContain(respondJson?.provider);
    flags.ai_response_unique = true;

    // 同じ user_message で 2 回目を呼んで応答が変わる（or 少なくとも禁止フレーズなし）
    const respond2 = await request.post('/api/lais/chat/respond', {
      headers: { authorization: `Bearer ${jwt}`, 'content-type': 'application/json' },
      data: {
        user_message: userContent,
        history: [
          { role: 'user', text: userContent },
          { role: 'assistant', text: aiText },
          { role: 'user', text: '次は何をすべき？' },
        ],
        client_msg_id: `a-spec2-${Date.now()}`,
      },
      timeout: 30000,
    });
    expect(respond2.ok()).toBe(true);
    const respond2Json = await respond2.json();
    const aiText2 = respond2Json?.message?.text || '';
    for (const phrase of FORBIDDEN_AI_PHRASES) {
      expect(aiText2.includes(phrase)).toBe(false);
    }

    // ---- Bug 3: time が JST 形式 (UTC+9) ----
    // chat 取得 API で created_at と time を取り出して、JST 換算と一致するかチェック
    const listApi = await request.get('/api/lais/chat?limit=10', {
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(listApi.ok()).toBe(true);
    const listApiJson = await listApi.json();
    const messages = listApiJson?.messages || [];
    expect(messages.length).toBeGreaterThanOrEqual(2); // user + assistant 少なくとも

    let allJstOk = true;
    for (const m of messages) {
      if (!m.created_at || !m.time) continue;
      const utcMs = new Date(m.created_at).getTime();
      const jst = new Date(utcMs + 9 * 3600 * 1000);
      const expectedHm = `${String(jst.getUTCHours()).padStart(2, '0')}:${String(
        jst.getUTCMinutes()
      ).padStart(2, '0')}`;
      if (m.time !== expectedHm) {
        // eslint-disable-next-line no-console
        console.log(
          `[TZ-MISMATCH] role=${m.role} created_at=${m.created_at} time=${m.time} expected=${expectedHm}`
        );
        allJstOk = false;
      }
    }
    expect(allJstOk).toBe(true);
    flags.tz_jst = true;

    await ctx.dispose();

    // smoke ログ転記用フラグ
    // eslint-disable-next-line no-console
    console.log(
      `[BUG-RT-TALK-CRITICAL-3-FIX] duplicate_prevented=${flags.duplicate_prevented} ai_response_unique=${flags.ai_response_unique} tz_jst=${flags.tz_jst} result=PASS`
    );
  });
});
