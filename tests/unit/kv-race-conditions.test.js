import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleTokenRedeem } from '../../src/routes/token.js';

describe('Concurrent token redeem race conditions (P5#49 fix)', () => {
  function makeKV(initial = {}) {
    const store = new Map(Object.entries(initial));
    return {
      async get(key, type) { const r = store.get(key); return r === undefined ? null : (type === 'json' ? JSON.parse(r) : r); },
      async put(key, value) { store.set(key, value); },
      async delete(key) { store.delete(key); },
    };
  }
  function makeReq(body) {
    return new Request('https://x.test/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  }

  it('should reject concurrent duplicate redeem via UNIQUE constraint (race detection)', async () => {
    let insertCount = 0;
    globalThis.fetch = vi.fn(async (url, opts) => {
      const method = (opts && opts.method) || 'GET';
      if (method === 'POST') {
        insertCount++;
        return insertCount === 1 ? new Response('', { status: 201 }) : new Response('', { status: 409 });
      }
      return new Response('[]', { status: 200 });
    });
    const env = { TOKEN_KV: makeKV(), SUPABASE_URL: 'https://t.supabase.co', SUPABASE_SERVICE_KEY: 'EXAMPLE_test_key_safe' };
    const ctx = { waitUntil: () => {} };
    const [r1, r2] = await Promise.all([
      handleTokenRedeem(makeReq({ promoCode: 'LAUNCH30', deviceId: 'devrace1' }), env, ctx),
      handleTokenRedeem(makeReq({ promoCode: 'LAUNCH30', deviceId: 'devrace1' }), env, ctx),
    ]);
    const codes = [r1.status, r2.status].sort();
    expect(codes).toContain(200);
    expect(codes.some(s => s === 409 || s === 400)).toBe(true);
  });

  it('should preserve KV when DB INSERT fails (no orphan)', async () => {
    globalThis.fetch = vi.fn(async (url, opts) => {
      const method = (opts && opts.method) || 'GET';
      if (method === 'POST') return new Response('boom', { status: 500 });
      return new Response('[]', { status: 200 });
    });
    const env = { TOKEN_KV: makeKV(), SUPABASE_URL: 'https://t.supabase.co', SUPABASE_SERVICE_KEY: 'EXAMPLE_test_key_safe' };
    const ctx = { waitUntil: () => {} };
    const res = await handleTokenRedeem(makeReq({ promoCode: 'LAUNCH30', deviceId: 'devorphan' }), env, ctx);
    expect(res.status).toBe(503);
    const cache = await env.TOKEN_KV.get('redeemed:devorphan:LAUNCH30');
    expect(cache).toBeNull();
  });

  it('should detect KV cache hit before remote SELECT (early reject)', async () => {
    globalThis.fetch = vi.fn(async () => new Response('[]', { status: 200 }));
    const kv = makeKV({ 'redeemed:devcached:LAUNCH30': 'goal_test_old' });
    const env = { TOKEN_KV: kv, SUPABASE_URL: 'https://t.supabase.co', SUPABASE_SERVICE_KEY: 'EXAMPLE_test_key_safe' };
    const ctx = { waitUntil: () => {} };
    const res = await handleTokenRedeem(makeReq({ promoCode: 'LAUNCH30', deviceId: 'devcached' }), env, ctx);
    expect(res.status).toBe(409);
  });
});
