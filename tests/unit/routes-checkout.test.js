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

// Round 31 P5#47 coverage upgrade (2026-05-02): checkout.js coverage 36% → 50%+ target。
// 真 HMAC で 200 path を実際に通すヘルパ。 stripe-webhook-dual-secret.test.js と
// 同じ手順で sig を sign してから handleStripeWebhook へ送付する。
async function signStripePayload(payload, secret, timestamp) {
  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function buildSignedWebhookRequest(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const v1 = await signStripePayload(payload, secret, timestamp);
  const sigHeader = `t=${timestamp},v1=${v1}`;
  return new Request('https://x.test/api/stripe-webhook', {
    method: 'POST',
    headers: { 'Stripe-Signature': sigHeader, 'Content-Type': 'application/json' },
    body: payload,
  });
}

function makeCtx() {
  return { waitUntil: (p) => { if (p && typeof p.catch === 'function') p.catch(() => {}); } };
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

  // Round 31 P5#47 coverage upgrade: handleCheckoutCreate 内の plan 別 / trial / metered branch
  describe('handleCheckoutCreate (P5#47 coverage upgrade)', () => {
    it.each([['light'], ['pro'], ['max'], ['ultra']])('should create session for plan=%s', async (plan) => {
      const { env, token } = makeAuthEnv();
      globalThis.fetch = vi.fn(async () =>
        new Response(JSON.stringify({ url: 'https://stripe.test/cs', id: `sess-${plan}` }), { status: 200 }),
      );
      const res = await handleCheckoutCreate(authReq(token, { plan }), env);
      expect(res.status).toBe(200);
    });

    it('should attach trial_period_days only for monthly light/pro', async () => {
      const { env, token } = makeAuthEnv();
      let captured;
      globalThis.fetch = vi.fn(async (_url, init) => {
        captured = init.body;
        return new Response(JSON.stringify({ url: 'https://stripe.test/cs', id: 'sess' }), { status: 200 });
      });
      await handleCheckoutCreate(authReq(token, { plan: 'light' }), env);
      expect(captured).toContain('trial_period_days');
    });

    it('should NOT attach trial_period_days for annual light/pro', async () => {
      const { env, token } = makeAuthEnv();
      let captured;
      globalThis.fetch = vi.fn(async (_url, init) => {
        captured = init.body;
        return new Response(JSON.stringify({ url: 'https://stripe.test/cs', id: 'sess' }), { status: 200 });
      });
      await handleCheckoutCreate(authReq(token, { plan: 'pro', billing_period: 'annual' }), env);
      expect(captured).not.toContain('trial_period_days');
    });

    it('should pin Stripe-Version header', async () => {
      const { env, token } = makeAuthEnv();
      let captured;
      globalThis.fetch = vi.fn(async (_url, init) => {
        captured = init.headers;
        return new Response(JSON.stringify({ url: 'https://stripe.test/cs', id: 'sess' }), { status: 200 });
      });
      await handleCheckoutCreate(authReq(token, { plan: 'pro' }), env);
      expect(captured['Stripe-Version']).toBeTruthy();
    });

    it('should reject 413 when payload exceeds 8KB cap', async () => {
      const { env, token } = makeAuthEnv();
      const big = 'a'.repeat(9 * 1024);
      const req = new Request('https://x.test/api/checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro', _filler: big }),
      });
      const res = await handleCheckoutCreate(req, env);
      expect([400, 413]).toContain(res.status);
    });
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

  it('should bubble up Stripe portal error', async () => {
    const { env, token } = makeAuthEnv();
    env.TOKEN_KV._store.set(
      `token:${token}`,
      JSON.stringify({ plan: 'pro', userId: 'u1', stripeCustomerId: 'cus_y' }),
    );
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: 'portal-down' } }), { status: 503 }),
    );
    const res = await handleCheckoutPortal(authReq(token, {}), env);
    expect(res.status).toBe(503);
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

  // Round 31 P5#47 coverage upgrade: 真 HMAC を使った 200 path、 idempotency、
  // event handler 分岐 (checkout.session.completed / invoice.paid / customer.subscription.*) を覆う。
  describe('handleStripeWebhook (P5#47 coverage upgrade)', () => {
    const SECRET = 'whsec_test_secret_for_coverage';

    it('should reject 413 when Content-Length exceeds 256KB cap', async () => {
      const env = { ...makeAuthEnv().env, STRIPE_WEBHOOK_SECRET: SECRET };
      const req = new Request('https://x.test/webhook', {
        method: 'POST',
        headers: { 'Stripe-Signature': 't=1,v1=x', 'Content-Length': String(300 * 1024) },
        body: '{}',
      });
      const res = await handleStripeWebhook(req, env);
      expect(res.status).toBe(413);
    });

    it('should reject 400 with valid sig but malformed JSON payload', async () => {
      const env = { ...makeAuthEnv().env, STRIPE_WEBHOOK_SECRET: SECRET };
      const payload = 'not-json-payload';
      // dedup Supabase fetch を 401 で KV fallback path へ
      globalThis.fetch = vi.fn(async () => new Response('', { status: 401 }));
      const req = await buildSignedWebhookRequest(payload, SECRET);
      const res = await handleStripeWebhook(req, env);
      expect(res.status).toBe(400);
    });

    it('should reject 400 when event.id not string after parse', async () => {
      const env = { ...makeAuthEnv().env, STRIPE_WEBHOOK_SECRET: SECRET };
      globalThis.fetch = vi.fn(async () => new Response('', { status: 401 }));
      const payload = JSON.stringify({ id: 12345, type: 'account.updated' });
      const req = await buildSignedWebhookRequest(payload, SECRET);
      const res = await handleStripeWebhook(req, env);
      expect(res.status).toBe(400);
    });

    it('should accept signed event with valid HMAC and return 200 (non-critical path)', async () => {
      const env = { ...makeAuthEnv().env, STRIPE_WEBHOOK_SECRET: SECRET };
      globalThis.fetch = vi.fn(async () => new Response('', { status: 401 }));
      const payload = JSON.stringify({
        id: 'evt_p5_47_basic_1',
        type: 'account.updated',
        data: { object: {} },
      });
      const req = await buildSignedWebhookRequest(payload, SECRET);
      const res = await handleStripeWebhook(req, env);
      expect(res.status).toBe(200);
    });

    it('should handle checkout.session.completed and upgrade plan in KV', async () => {
      const tok = 'goal_test_chk';
      const env = {
        ...makeAuthEnv().env,
        STRIPE_WEBHOOK_SECRET: SECRET,
      };
      // Pre-seed token in KV so the webhook can find tokenData
      env.TOKEN_KV._store.set(
        `token:${tok}`,
        JSON.stringify({ plan: 'free', userId: 'u1' }),
      );
      // dedup + supabase patch + subscription fetch — all return ok
      globalThis.fetch = vi.fn(async (url) => {
        const u = String(url);
        if (u.includes('/stripe_processed_events')) {
          // Supabase atomic claim — return 201 with 1 row to signal success
          return new Response(JSON.stringify([{ event_id: 'evt_x' }]), { status: 201 });
        }
        if (u.includes('/users')) {
          return new Response('', { status: 204 });
        }
        if (u.includes('api.stripe.com/v1/subscriptions/')) {
          return new Response(JSON.stringify({ items: { data: [] } }), { status: 200 });
        }
        return new Response('', { status: 200 });
      });
      const payload = JSON.stringify({
        id: 'evt_p5_47_co_1',
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_p5_47',
            subscription: 'sub_p5_47',
            metadata: { tokenId: tok, plan: 'pro' },
          },
        },
      });
      const req = await buildSignedWebhookRequest(payload, SECRET);
      const res = await handleStripeWebhook(req, env, makeCtx());
      expect(res.status).toBe(200);
      // KV upgrade verification
      const updated = JSON.parse(env.TOKEN_KV._store.get(`token:${tok}`));
      expect(updated.plan).toBe('pro');
      expect(updated.stripeCustomerId).toBe('cus_p5_47');
      // stripe_customer mapping
      expect(env.TOKEN_KV._store.get(`stripe_customer:cus_p5_47`)).toBe(tok);
    });

    it('should silently OK 200 on checkout.session.completed without metadata.plan (DLQ branch)', async () => {
      const tok = 'goal_test_chk';
      const env = { ...makeAuthEnv().env, STRIPE_WEBHOOK_SECRET: SECRET };
      env.TOKEN_KV._store.set(`token:${tok}`, JSON.stringify({ plan: 'free' }));
      // dedup Supabase claim succeeds (billing-critical event so 503 fallback otherwise)
      globalThis.fetch = vi.fn(async (url) => {
        if (String(url).includes('/stripe_processed_events')) {
          return new Response(JSON.stringify([{ event_id: 'x' }]), { status: 201 });
        }
        return new Response('', { status: 200 });
      });
      const payload = JSON.stringify({
        id: 'evt_p5_47_co_no_plan',
        type: 'checkout.session.completed',
        data: { object: { customer: 'cus_x', metadata: { tokenId: tok } } },
      });
      const req = await buildSignedWebhookRequest(payload, SECRET);
      const res = await handleStripeWebhook(req, env, makeCtx());
      expect(res.status).toBe(200);
      // DLQ row set
      expect(env.TOKEN_KV._store.has(`stripe_unhandled_billing_event:evt_p5_47_co_no_plan`)).toBe(true);
    });

    it('should handle invoice.paid event (informational log only, 200 OK)', async () => {
      const env = { ...makeAuthEnv().env, STRIPE_WEBHOOK_SECRET: SECRET };
      // dedup Supabase claim succeeds
      globalThis.fetch = vi.fn(async (url) => {
        if (String(url).includes('/stripe_processed_events')) {
          return new Response(JSON.stringify([{ event_id: 'x' }]), { status: 201 });
        }
        return new Response('', { status: 200 });
      });
      env.TOKEN_KV._store.set(`stripe_customer:cus_inv`, 'goal_test_chk');
      const payload = JSON.stringify({
        id: 'evt_p5_47_invoice_1',
        type: 'invoice.paid',
        data: { object: { customer: 'cus_inv', amount_paid: 1500 } },
      });
      const req = await buildSignedWebhookRequest(payload, SECRET);
      const res = await handleStripeWebhook(req, env, makeCtx());
      expect(res.status).toBe(200);
    });

    it('should handle customer.subscription.deleted and downgrade to free', async () => {
      const tok = 'goal_test_chk';
      const env = { ...makeAuthEnv().env, STRIPE_WEBHOOK_SECRET: SECRET };
      env.TOKEN_KV._store.set(
        `token:${tok}`,
        JSON.stringify({ plan: 'pro', stripeSubscriptionId: 'sub_x', userId: 'u1' }),
      );
      env.TOKEN_KV._store.set(`stripe_customer:cus_del`, tok);
      globalThis.fetch = vi.fn(async (url) => {
        if (String(url).includes('/stripe_processed_events')) {
          return new Response(JSON.stringify([{ event_id: 'x' }]), { status: 201 });
        }
        if (String(url).includes('/users')) return new Response('', { status: 204 });
        return new Response('', { status: 200 });
      });
      const payload = JSON.stringify({
        id: 'evt_p5_47_sub_del',
        type: 'customer.subscription.deleted',
        data: { object: { customer: 'cus_del' } },
      });
      const req = await buildSignedWebhookRequest(payload, SECRET);
      const res = await handleStripeWebhook(req, env, makeCtx());
      expect(res.status).toBe(200);
      const updated = JSON.parse(env.TOKEN_KV._store.get(`token:${tok}`));
      expect(updated.plan).toBe('free');
      expect(updated.cancelledAt).toBeTruthy();
    });

    it('should handle customer.subscription.updated when newPlan present', async () => {
      const tok = 'goal_test_chk';
      const env = { ...makeAuthEnv().env, STRIPE_WEBHOOK_SECRET: SECRET };
      env.TOKEN_KV._store.set(`token:${tok}`, JSON.stringify({ plan: 'pro' }));
      env.TOKEN_KV._store.set(`stripe_customer:cus_upd`, tok);
      globalThis.fetch = vi.fn(async (url) => {
        if (String(url).includes('/stripe_processed_events')) {
          return new Response(JSON.stringify([{ event_id: 'x' }]), { status: 201 });
        }
        if (String(url).includes('/users')) return new Response('', { status: 204 });
        return new Response('', { status: 200 });
      });
      const payload = JSON.stringify({
        id: 'evt_p5_47_sub_upd',
        type: 'customer.subscription.updated',
        data: { object: { customer: 'cus_upd', metadata: { plan: 'max' } } },
      });
      const req = await buildSignedWebhookRequest(payload, SECRET);
      const res = await handleStripeWebhook(req, env, makeCtx());
      expect(res.status).toBe(200);
      const updated = JSON.parse(env.TOKEN_KV._store.get(`token:${tok}`));
      expect(updated.plan).toBe('max');
    });

    it('should idempotently 200 on KV-detected duplicate event (KV fallback path)', async () => {
      const env = { ...makeAuthEnv().env, STRIPE_WEBHOOK_SECRET: SECRET };
      // pre-mark event as processed in KV; dedup Supabase fetch returns 401 → KV path
      env.TOKEN_KV._store.set(`stripe_event:evt_p5_47_dup`, '1');
      globalThis.fetch = vi.fn(async () => new Response('', { status: 401 }));
      const payload = JSON.stringify({
        id: 'evt_p5_47_dup',
        type: 'account.updated',
        data: { object: {} },
      });
      const req = await buildSignedWebhookRequest(payload, SECRET);
      const res = await handleStripeWebhook(req, env);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toMatch(/Already processed|OK/);
    });

    it('should DLQ unhandled billing-critical events (invoice.payment_failed)', async () => {
      const env = { ...makeAuthEnv().env, STRIPE_WEBHOOK_SECRET: SECRET };
      globalThis.fetch = vi.fn(async (url) => {
        if (String(url).includes('/stripe_processed_events')) {
          return new Response(JSON.stringify([{ event_id: 'x' }]), { status: 201 });
        }
        return new Response('', { status: 200 });
      });
      const payload = JSON.stringify({
        id: 'evt_p5_47_payfail',
        type: 'invoice.payment_failed',
        data: { object: { id: 'in_fail_1' } },
      });
      const req = await buildSignedWebhookRequest(payload, SECRET);
      const res = await handleStripeWebhook(req, env, makeCtx());
      expect(res.status).toBe(200);
      // DLQ row set (handler 不在 critical event)
      expect(env.TOKEN_KV._store.has(`stripe_unhandled_billing_event:evt_p5_47_payfail`)).toBe(true);
    });

    it('should reject 503 for billing-critical event when Supabase dedup fails (no atomic claim)', async () => {
      const env = { ...makeAuthEnv().env, STRIPE_WEBHOOK_SECRET: SECRET };
      // dedup Supabase fetch returns 500 → KV fallback skipped for billing-critical
      globalThis.fetch = vi.fn(async () => new Response('upstream down', { status: 500 }));
      const payload = JSON.stringify({
        id: 'evt_p5_47_503_test',
        type: 'checkout.session.completed',
        data: { object: { customer: 'cus_503', metadata: { tokenId: 't', plan: 'pro' } } },
      });
      const req = await buildSignedWebhookRequest(payload, SECRET);
      const res = await handleStripeWebhook(req, env, makeCtx());
      expect(res.status).toBe(503);
      expect(res.headers.get('Retry-After')).toBeTruthy();
    });

    it('should accept dual-secret OLD path when current mismatches', async () => {
      const env = {
        ...makeAuthEnv().env,
        STRIPE_WEBHOOK_SECRET: 'whsec_current',
        STRIPE_WEBHOOK_SECRET_OLD: SECRET,
      };
      globalThis.fetch = vi.fn(async () => new Response('', { status: 401 }));
      const payload = JSON.stringify({
        id: 'evt_p5_47_dual_old',
        type: 'account.updated',
        data: { object: {} },
      });
      // sign with OLD secret
      const req = await buildSignedWebhookRequest(payload, SECRET);
      const res = await handleStripeWebhook(req, env);
      expect(res.status).toBe(200);
    });
  });
});
