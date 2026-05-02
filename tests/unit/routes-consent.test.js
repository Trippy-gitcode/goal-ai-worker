// tests/unit/routes-consent.test.js
// SUBAGENT-LAIS-CAT-J-AUDITLOG-RETENTION-AND-CALLERS-V1 unit test (2026-05-02)
//   handleConsentCrossBorder / handleAgeGate の 4 ケース:
//   success / unauth / invalid body / DB error。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handleConsentCrossBorder, handleAgeGate } from '../../src/routes/consent.js';

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

function makeAuthEnv() {
  const kv = makeKV();
  const tok = 'goal_test_consent1';
  kv._store.set(`token:${tok}`, JSON.stringify({ plan: 'pro', userId: 'user-1' }));
  // uid:<tok> cache を仕込み、 getUserIdFromToken を即返却化 (Supabase users GET fetch 抑止)
  kv._store.set(`uid:${tok}`, 'user-uuid-1');
  return {
    env: {
      TOKEN_KV: kv,
      SUPABASE_URL: 'https://s.test',
      SUPABASE_SERVICE_KEY: 'sk',
    },
    token: tok,
  };
}

function authReq(token, url, body = null) {
  return new Request(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeCtx() {
  const waited = [];
  return {
    ctx: {
      waitUntil: (p) => { waited.push(p); },
    },
    waited,
  };
}

describe('handleConsentCrossBorder', () => {
  let originalFetch;
  let calls;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
    calls = [];
    globalThis.fetch = vi.fn(async (url, init) => {
      calls.push({ url: String(url), method: init?.method, body: init?.body });
      return new Response('[]', { status: 200 });
    });
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('success: PATCH users + audit_log POST 投入 + 200 ok', async () => {
    const { env, token } = makeAuthEnv();
    const { ctx, waited } = makeCtx();
    const req = authReq(token, 'https://x.test/api/account/consent/cross-border', {
      granted: true, version: 'v3.2', ts: '2026-05-02T00:00:00Z',
    });
    const res = await handleConsentCrossBorder(req, env, ctx);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.ok).toBe(true);
    // PATCH users + (waitUntil 経由で) audit_log POST が実行される
    await Promise.all(waited);
    const patchCall = calls.find(c => c.url.includes('/users') && c.method === 'PATCH');
    expect(patchCall).toBeDefined();
    const auditCall = calls.find(c => c.url.includes('/audit_log'));
    expect(auditCall).toBeDefined();
    const auditBody = JSON.parse(auditCall.body);
    expect(auditBody.event_type).toBe('consent_grant');
    expect(auditBody.event_data.type).toBe('cross_border');
    expect(auditBody.event_data.version).toBe('v3.2');
  });

  it('unauth: 401 を返却', async () => {
    const { env } = makeAuthEnv();
    const req = new Request('https://x.test/api/account/consent/cross-border', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ granted: true }),
    });
    const res = await handleConsentCrossBorder(req, env, makeCtx().ctx);
    expect(res.status).toBe(401);
  });

  it('invalid body: granted 不在 → 400', async () => {
    const { env, token } = makeAuthEnv();
    const req = authReq(token, 'https://x.test/api/account/consent/cross-border', { version: 'v1' });
    const res = await handleConsentCrossBorder(req, env, makeCtx().ctx);
    expect(res.status).toBe(400);
  });

  it('DB error: PATCH 失敗時 500 を返却', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () => { throw new Error('DB down'); });
    const req = authReq(token, 'https://x.test/api/account/consent/cross-border', { granted: false, version: 'v1' });
    const res = await handleConsentCrossBorder(req, env, makeCtx().ctx);
    expect(res.status).toBe(500);
  });
});

describe('handleAgeGate', () => {
  let originalFetch;
  let calls;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
    calls = [];
    globalThis.fetch = vi.fn(async (url, init) => {
      calls.push({ url: String(url), method: init?.method, body: init?.body });
      return new Response('[]', { status: 200 });
    });
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('success: PATCH users + audit_log age_gate_pass 投入 + 200', async () => {
    const { env, token } = makeAuthEnv();
    const { ctx, waited } = makeCtx();
    const req = authReq(token, 'https://x.test/api/account/age-gate', {
      passed: true, declared_age: 25, min_age: 13, ts: '2026-05-02T00:00:00Z',
    });
    const res = await handleAgeGate(req, env, ctx);
    expect(res.status).toBe(200);
    await Promise.all(waited);
    const auditCall = calls.find(c => c.url.includes('/audit_log'));
    expect(auditCall).toBeDefined();
    const body = JSON.parse(auditCall.body);
    expect(body.event_type).toBe('age_gate_pass');
    expect(body.event_data.min_age).toBe(13);
    expect(body.event_data.declared_age).toBe(25);
  });

  it('unauth: 401', async () => {
    const { env } = makeAuthEnv();
    const req = new Request('https://x.test/api/account/age-gate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passed: true }),
    });
    const res = await handleAgeGate(req, env, makeCtx().ctx);
    expect(res.status).toBe(401);
  });

  it('invalid body: passed 不在 → 400', async () => {
    const { env, token } = makeAuthEnv();
    const req = authReq(token, 'https://x.test/api/account/age-gate', { declared_age: 25 });
    const res = await handleAgeGate(req, env, makeCtx().ctx);
    expect(res.status).toBe(400);
  });

  it('DB error: PATCH 失敗時 500', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () => { throw new Error('DB down'); });
    const req = authReq(token, 'https://x.test/api/account/age-gate', { passed: true, min_age: 13 });
    const res = await handleAgeGate(req, env, makeCtx().ctx);
    expect(res.status).toBe(500);
  });
});
