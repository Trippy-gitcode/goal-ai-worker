import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  handleTokenRegister,
  handleTokenCreate,
  handleTokenValidate,
  handleTokenRedeem,
} from '../../src/routes/token.js';

function makeKV(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    async get(key, type) {
      const raw = store.get(key);
      if (raw === undefined) return null;
      if (type === 'json') return JSON.parse(raw);
      return raw;
    },
    async put(key, value) {
      store.set(key, value);
    },
    async delete(key) {
      store.delete(key);
    },
    _store: store,
  };
}

function makeReq(body, headers = {}) {
  return new Request('https://x.test/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('handleTokenRegister', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => new Response('[]', { status: 200 }));
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should reject when deviceId is missing', async () => {
    const env = { TOKEN_KV: makeKV() };
    const res = await handleTokenRegister(makeReq({}), env);
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.error).toMatch(/deviceId/);
  });

  it('should reject deviceId shorter than 8 chars', async () => {
    const env = { TOKEN_KV: makeKV() };
    const res = await handleTokenRegister(makeReq({ deviceId: 'abc' }), env);
    expect(res.status).toBe(400);
  });

  it('should reject deviceId longer than 128 chars', async () => {
    const env = { TOKEN_KV: makeKV() };
    const res = await handleTokenRegister(makeReq({ deviceId: 'a'.repeat(200) }), env);
    expect(res.status).toBe(400);
  });

  it('should reject deviceId equal to __proto__', async () => {
    const env = { TOKEN_KV: makeKV() };
    const res = await handleTokenRegister(makeReq({ deviceId: '__proto__' }), env);
    expect(res.status).toBe(400);
  });

  it('should reject deviceId with control chars', async () => {
    const env = { TOKEN_KV: makeKV() };
    const res = await handleTokenRegister(makeReq({ deviceId: 'abc\x00def_padding' }), env);
    expect(res.status).toBe(400);
  });

  it('should issue new token for fresh deviceId', async () => {
    const env = { TOKEN_KV: makeKV() };
    const res = await handleTokenRegister(makeReq({ deviceId: 'device12345abc' }), env);
    expect(res.status).toBe(201);
    const j = await res.json();
    expect(j.token).toMatch(/^goal_test_/);
    expect(j.existing).toBe(false);
  });

  it('should reuse existing token if device already registered', async () => {
    const kv = makeKV();
    await kv.put('device:dev123abc456', 'goal_test_existing');
    await kv.put('token:goal_test_existing', JSON.stringify({ plan: 'pro', revoked: false }));
    const env = { TOKEN_KV: kv };
    const res = await handleTokenRegister(makeReq({ deviceId: 'dev123abc456' }), env);
    const j = await res.json();
    expect(j.existing).toBe(true);
    expect(j.token).toBe('goal_test_existing');
    expect(j.plan).toBe('pro');
  });

  it('should not reuse revoked existing token', async () => {
    const kv = makeKV();
    await kv.put('device:dev123abc456', 'goal_test_revoked');
    await kv.put('token:goal_test_revoked', JSON.stringify({ plan: 'pro', revoked: true }));
    const env = { TOKEN_KV: kv };
    const res = await handleTokenRegister(makeReq({ deviceId: 'dev123abc456' }), env);
    expect(res.status).toBe(201);
  });

  it('should return 500 on json parse error', async () => {
    const req = new Request('https://x.test/', { method: 'POST', body: 'not json' });
    const env = { TOKEN_KV: makeKV() };
    const res = await handleTokenRegister(req, env);
    expect(res.status).toBe(500);
  });
});

describe('handleTokenCreate', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => new Response('[]', { status: 200 }));
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should reject without admin secret', async () => {
    const env = { TOKEN_KV: makeKV(), TOKEN_SECRET: 'TOPSECRET' };
    const res = await handleTokenCreate(makeReq({}), env);
    expect(res.status).toBe(401);
  });

  it('should reject when admin secret mismatched', async () => {
    const env = { TOKEN_KV: makeKV(), TOKEN_SECRET: 'TOPSECRET' };
    const res = await handleTokenCreate(makeReq({}, { 'X-Admin-Secret': 'WRONG' }), env);
    expect(res.status).toBe(401);
  });

  it('should issue token when admin secret correct', async () => {
    const env = { TOKEN_KV: makeKV(), TOKEN_SECRET: 'TOPSECRET' };
    const res = await handleTokenCreate(
      makeReq({ plan: 'pro', days: 7 }, { 'X-Admin-Secret': 'TOPSECRET' }),
      env,
    );
    const j = await res.json();
    expect(j.token).toMatch(/^goal_test_/);
    expect(j.plan).toBe('pro');
  });

  it('should apply known promoCode plan', async () => {
    const env = { TOKEN_KV: makeKV(), TOKEN_SECRET: 'TOPSECRET' };
    const res = await handleTokenCreate(
      makeReq({ promoCode: 'LAUNCH30' }, { 'X-Admin-Secret': 'TOPSECRET' }),
      env,
    );
    const j = await res.json();
    expect(j.plan).toBe('pro');
  });
});

describe('handleTokenValidate', () => {
  it('should return invalid when token missing', async () => {
    const env = { TOKEN_KV: makeKV() };
    const res = await handleTokenValidate(makeReq({}), env);
    const j = await res.json();
    expect(j.valid).toBe(false);
    expect(j.error).toMatch(/required/i);
  });

  it('should return invalid when token not in KV', async () => {
    const env = { TOKEN_KV: makeKV() };
    const res = await handleTokenValidate(makeReq({ token: 'goal_test_unknown' }), env);
    const j = await res.json();
    expect(j.valid).toBe(false);
  });

  it('should report expired tokens', async () => {
    const kv = makeKV();
    const past = new Date(Date.now() - 86400000).toISOString();
    await kv.put('token:goal_test_old', JSON.stringify({ plan: 'pro', expiresAt: past, userId: 'u' }));
    const env = { TOKEN_KV: kv };
    const res = await handleTokenValidate(makeReq({ token: 'goal_test_old' }), env);
    const j = await res.json();
    expect(j.valid).toBe(false);
  });

  it('should report revoked tokens', async () => {
    const kv = makeKV();
    await kv.put(
      'token:goal_test_rev',
      JSON.stringify({ plan: 'pro', revoked: true, userId: 'u' }),
    );
    const env = { TOKEN_KV: kv };
    const res = await handleTokenValidate(makeReq({ token: 'goal_test_rev' }), env);
    const j = await res.json();
    expect(j.valid).toBe(false);
  });

  it('should return valid for active future-expiry token', async () => {
    const kv = makeKV();
    const future = new Date(Date.now() + 86400000).toISOString();
    await kv.put(
      'token:goal_test_alive',
      JSON.stringify({ plan: 'pro', expiresAt: future, userId: 'user-1' }),
    );
    const env = { TOKEN_KV: kv };
    const res = await handleTokenValidate(makeReq({ token: 'goal_test_alive' }), env);
    const j = await res.json();
    expect(j.valid).toBe(true);
    expect(j.plan).toBe('pro');
    expect(j.daysRemaining).toBeGreaterThanOrEqual(0);
  });
});

describe('handleTokenRedeem', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => new Response('[]', { status: 200 }));
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should reject when promoCode missing', async () => {
    const env = { TOKEN_KV: makeKV() };
    const res = await handleTokenRedeem(makeReq({}), env);
    expect(res.status).toBe(400);
  });

  it('should reject malformed promoCode', async () => {
    const env = { TOKEN_KV: makeKV() };
    const res = await handleTokenRedeem(makeReq({ promoCode: 'bad code with space!' }), env);
    expect(res.status).toBe(400);
  });

  it('should reject unknown promoCode', async () => {
    const env = { TOKEN_KV: makeKV() };
    const res = await handleTokenRedeem(makeReq({ promoCode: 'NONEXISTENT' }), env);
    expect(res.status).toBe(400);
  });

  it('should issue token for valid promo (LAUNCH30)', async () => {
    const env = { TOKEN_KV: makeKV() };
    const ctx = { waitUntil: () => {} };
    const res = await handleTokenRedeem(makeReq({ promoCode: 'LAUNCH30', deviceId: 'devicex123' }), env, ctx);
    const j = await res.json();
    expect(j.token).toMatch(/^goal_test_/);
    expect(j.plan).toBe('pro');
  });

  it('should reject already redeemed promo for same device', async () => {
    const kv = makeKV();
    await kv.put('redeemed:devy123:LAUNCH30', 'goal_test_oldredeem');
    const env = { TOKEN_KV: kv };
    const ctx = { waitUntil: () => {} };
    const res = await handleTokenRedeem(makeReq({ promoCode: 'LAUNCH30', deviceId: 'devy123' }), env, ctx);
    expect(res.status).toBe(409);
  });

  it('should reject deviceId with bad chars', async () => {
    const env = { TOKEN_KV: makeKV() };
    const res = await handleTokenRedeem(
      makeReq({ promoCode: 'LAUNCH30', deviceId: 'd\x00ev' }),
      env,
    );
    expect(res.status).toBe(400);
  });
});
