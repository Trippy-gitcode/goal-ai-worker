import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  handleCheckoutCreate,
  handleCheckoutPortal,
  handleStripeWebhook,
} from '../../src/routes/checkout.js';

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

function makeAuthEnv(plan = 'free', extra = {}) {
  const kv = makeKV();
  const tok = 'goal_test_chk';
  kv._store.set(`token:${tok}`, JSON.stringify({ plan, userId: 'user-1' }));
  return {
    env: {
      TOKEN_KV: kv,
      STRIPE_SECRET_KEY: 'stripe_sk',
      SUPABASE_URL: 'https://s.test',
      SUPABASE_SERVICE_KEY: 'sk',
      ...extra,
    },
    token: tok,
  };
}

function authReq(token, body, headers = {}) {
  return new Request('https://x.test/api/checkout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('handleCheckoutCreate', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should reject without auth', async () => {
    const { env } = makeAuthEnv();
    const req = new Request('https://x.test/', { method: 'POST', body: '{}' });
    const res = await handleCheckoutCreate(req, env);
    expect(res.status).toBe(401);
  });

  it('should reject invalid plan', async () => {
    const { env, token } = makeAuthEnv();
    const res = await handleCheckoutCreate(authReq(token, { plan: 'unknown' }), env);
    expect(res.status).toBe(400);
  });

  it('should create monthly Stripe session for valid plan', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ url: 'https://stripe.test/cs', id: 'sess-1' }), { status: 200 }),
    );
    const res = await handleCheckoutCreate(authReq(token, { plan: 'pro' }), env);
    const j = await res.json();
    expect(j.url).toBe('https://stripe.test/cs');
    expect(j.sessionId).toBe('sess-1');
  });

  it('should create annual Stripe session for billing_period=annual', async () => {
    const { env, token } = makeAuthEnv();
    let captured;
    globalThis.fetch = vi.fn(async (_url, init) => {
      captured = init.body;
      return new Response(JSON.stringify({ url: 'https://stripe.test/cs', id: 'sess-2' }), { status: 200 });
    });
    await handleCheckoutCreate(authReq(token, { plan: 'pro', billing_period: 'annual' }), env);
    expect(captured).toContain('annual');
  });

  it('should bubble up Stripe error response', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: 'Stripe err' } }), { status: 400 }),
    );
    const res = await handleCheckoutCreate(authReq(token, { plan: 'pro' }), env);
    expect(res.status).toBe(400);
  });
});

describe('handleCheckoutPortal', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should reject without auth', async () => {
    const { env } = makeAuthEnv();
    const req = new Request('https://x.test/');
    const res = await handleCheckoutPortal(req, env);
    expect(res.status).toBe(401);
  });

  it('should reject when no Stripe customer attached', async () => {
    const { env, token } = makeAuthEnv();
    const res = await handleCheckoutPortal(authReq(token, {}), env);
    expect(res.status).toBe(400);
  });

  it('should return portal URL when customer present', async () => {
    const { env, token } = makeAuthEnv();
    env.TOKEN_KV._store.set(
      `token:${token}`,
      JSON.stringify({ plan: 'pro', userId: 'u1', stripeCustomerId: 'cus_x' }),
    );
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ url: 'https://stripe.test/portal' }), { status: 200 }),
    );
    const res = await handleCheckoutPortal(authReq(token, {}), env);
    const j = await res.json();
    expect(j.url).toBe('https://stripe.test/portal');
  });
});

describe('handleStripeWebhook', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should reject when signature invalid', async () => {
    const { env } = makeAuthEnv();
    env.STRIPE_WEBHOOK_SECRET = 'whsec_x';
    const req = new Request('https://x.test/webhook', {
      method: 'POST',
      headers: { 'Stripe-Signature': 'invalid' },
      body: '{}',
    });
    const res = await handleStripeWebhook(req, env);
    expect(res.status).toBe(400);
  });

  it('should reject when sigHeader missing entirely', async () => {
    const { env } = makeAuthEnv();
    env.STRIPE_WEBHOOK_SECRET = 'whsec_x';
    const req = new Request('https://x.test/webhook', {
      method: 'POST',
      body: '{}',
    });
    const res = await handleStripeWebhook(req, env);
    expect(res.status).toBe(400);
  });
});
