/*
 * lais/tests/realmachine/talk_realtime.spec.ts
 *
 * Mission: LAIS-PHASE-A-REAL-COMPLETION V2
 *
 * S-20 TALK Realtime broadcast の E2E 検証。
 *
 * 戦略:
 *   - Node 上で supabase-js (npm 依存) を直接 import し、`lais:chat:<user_id>` channel に subscribe
 *   - その間に Pages Function `/api/lais/chat` で INSERT（サーバ側 broadcast 発火）
 *   - broadcast event が subscribe 側に届くこと、payload に message が含まれることを検証
 *   - leak 防止のため、test 終了時に removeChannel を呼び出す
 *
 * 注: ブラウザ context での実証は CSP `script-src 'self'` のため CDN 注入不可。
 *     代わりに Node 側の supabase-js を使い、Realtime プロトコル自体の互換を検証する。
 *     アプリ側の購読コードは src/lib/db.js subscribeChatMessages であり、同 SDK を使うため
 *     実機 UI と同一プロトコル経路の検証となる。
 *
 * 仕様根拠:
 *   - lais/verify/talk_realtime_validation_2026-04-26.md (S-20 Realtime 未実装)
 *   - lais/src/lib/db.js subscribeChatMessages / unsubscribeChannel 実装
 *   - lais/functions/api/lais/chat.js broadcastChatMessage 実装
 */
import { test, expect, request as pwRequest } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const EMAIL = process.env.REALMACHINE_TEST_EMAIL || '';
const PASSWORD = process.env.REALMACHINE_TEST_PASSWORD || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';

test.describe.configure({ retries: 2 });

test.describe('Lais Phase A — S-20 TALK Realtime broadcast', () => {
  test.skip(
    !EMAIL || !PASSWORD || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY,
    'Realtime spec は env 必須'
  );

  let jwt = '';
  let userId = '';

  test.beforeAll(async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'content-type': 'application/json' },
      data: { email: EMAIL, password: PASSWORD },
    });
    expect(res.ok()).toBe(true);
    const json = await res.json();
    jwt = json?.access_token || '';
    userId = json?.user?.id || '';
    expect(jwt.length).toBeGreaterThan(20);
    expect(userId).toMatch(/[0-9a-f-]{36}/);
    await ctx.dispose();
  });

  test('chat broadcast を subscribe 側で受信できる', async ({ request }) => {
    // Node 上で supabase client を作って channel に subscribe する
    const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      realtime: { params: { eventsPerSecond: 10 } },
    });

    // SUBSCRIBED 状態を待ってから INSERT する
    let subscribedResolve: (() => void) | null = null;
    const subscribedPromise = new Promise<void>((r) => { subscribedResolve = r; });

    const recvPromise = new Promise<{ ok: boolean; payload?: any; error?: string }>((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        try { sb.removeAllChannels?.(); } catch (_) {}
        resolve({ ok: false, error: 'timeout 20s' });
      }, 20000);

      const channel = sb
        .channel(`lais:chat:${userId}`)
        .on('broadcast', { event: 'message' }, (payload: any) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeout);
          try { sb.removeChannel(channel); } catch (_) {}
          resolve({ ok: true, payload });
        })
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED' && subscribedResolve) {
            subscribedResolve();
            subscribedResolve = null;
          }
        });
    });

    // subscribe 確立を最大 5s 待つ
    await Promise.race([
      subscribedPromise,
      new Promise((r) => setTimeout(r, 5000)),
    ]);

    // Pages Function 経由で INSERT。サーバ側で broadcast が発火する。
    const content = `RT-spec ${Date.now()}`;
    const post = await request.post('/api/lais/chat', {
      headers: { authorization: `Bearer ${jwt}`, 'content-type': 'application/json' },
      data: { role: 'user', content },
    });
    expect(post.status()).toBe(201);

    const recv = await recvPromise;

    // leak 防止
    try { await sb.removeAllChannels(); } catch (_) {}

    expect(recv.ok, `broadcast not received: ${recv.error || ''}`).toBe(true);
    expect(recv.payload?.payload?.message?.text).toBe(content);
  });
});
