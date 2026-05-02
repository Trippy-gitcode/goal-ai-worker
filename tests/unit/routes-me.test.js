import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handleIdentityGet, handleIdentityPut, handleQOLGenerate } from '../../src/routes/me.js';

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
  const tok = 'goal_test_me';
  kv._store.set(`token:${tok}`, JSON.stringify({ plan: 'pro', userId: 'user-1' }));
  return {
    env: {
      TOKEN_KV: kv,
      SUPABASE_URL: 'https://s.test',
      SUPABASE_SERVICE_KEY: 'sk',
      OPENAI_API_KEY: 'k',
    },
    token: tok,
  };
}

function authReq(token, body, method = 'POST') {
  return new Request('https://x.test/api/me/identity', {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('handleIdentityGet', () => {
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
    const res = await handleIdentityGet(req, env);
    expect(res.status).toBe(401);
  });

  it('should return 404 when user not found', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () => new Response('[]', { status: 200 }));
    const res = await handleIdentityGet(authReq(token, null, 'GET'), env);
    expect(res.status).toBe(404);
  });

  it('should return existing identity row when found', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async (url) => {
      const u = String(url);
      if (u.includes('user_identity')) {
        return new Response(JSON.stringify([{ user_id: 'u1', vision: 'V', identity: { age: 30 } }]), { status: 200 });
      }
      // users
      return new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 });
    });
    const res = await handleIdentityGet(authReq(token, null, 'GET'), env);
    const j = await res.json();
    expect(j.vision).toBe('V');
    expect(j.identity.age).toBe(30);
  });

  it('should return DEFAULT_IDENTITY when no row exists', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async (url) => {
      const u = String(url);
      if (u.includes('user_identity')) {
        return new Response('[]', { status: 200 });
      }
      return new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 });
    });
    const res = await handleIdentityGet(authReq(token, null, 'GET'), env);
    const j = await res.json();
    expect(j.vision).toBeNull();
    expect(j.mindset_preset).toBe('futoshi');
  });
});

describe('handleIdentityPut', () => {
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
    const res = await handleIdentityPut(req, env);
    expect(res.status).toBe(401);
  });

  it('should merge identity field with existing row', async () => {
    const { env, token } = makeAuthEnv();
    let calls = 0;
    let lastBody;
    globalThis.fetch = vi.fn(async (_url, init) => {
      calls++;
      // 1st: getUserIdFromToken users select
      if (calls === 1) return new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 });
      // 2nd: existing identity (merge)
      if (calls === 2) return new Response(JSON.stringify([{ identity: { existing: true } }]), { status: 200 });
      // 3rd: POST upsert
      lastBody = JSON.parse(init.body);
      return new Response(JSON.stringify([lastBody]), { status: 200 });
    });
    const res = await handleIdentityPut(
      authReq(token, { identity: { age: 30 } }, 'PUT'),
      env,
    );
    expect(res.status).toBe(200);
    expect(lastBody.identity).toEqual({ existing: true, age: 30 });
  });

  it('should accept vision update without identity merge fetch', async () => {
    const { env, token } = makeAuthEnv();
    let calls = 0;
    globalThis.fetch = vi.fn(async () => {
      calls++;
      if (calls === 1) return new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 });
      return new Response(JSON.stringify([{ vision: 'NEW' }]), { status: 200 });
    });
    const res = await handleIdentityPut(authReq(token, { vision: 'NEW' }, 'PUT'), env);
    expect(res.status).toBe(200);
  });
});

describe('handleQOLGenerate', () => {
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
    const res = await handleQOLGenerate(req, env);
    expect(res.status).toBe(401);
  });

  it('should return proposals on LLM success', async () => {
    const { env, token } = makeAuthEnv();
    let calls = 0;
    globalThis.fetch = vi.fn(async (url) => {
      calls++;
      if (calls === 1) return new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 });
      // identity row
      if (calls === 2) return new Response(JSON.stringify([{ identity: {}, vision: '' }]), { status: 200 });
      // existing goals
      if (calls === 3) return new Response('[]', { status: 200 });
      // openai
      if (String(url).includes('openai.com')) {
        const proposals = [
          { title: 'P1', description: 'd', category: 'lifestyle', urgency: 'now' },
          { title: 'P2', description: 'd', category: 'health', urgency: 'this_month' },
        ];
        return new Response(
          JSON.stringify({ choices: [{ message: { content: JSON.stringify({ proposals }) } }] }),
          { status: 200 },
        );
      }
      return new Response('[]', { status: 200 });
    });
    const res = await handleQOLGenerate(authReq(token, {}, 'POST'), env);
    const j = await res.json();
    expect(Array.isArray(j.qol_proposals)).toBe(true);
    expect(j.qol_proposals.length).toBeGreaterThan(0);
  });

  it('should return 500 on LLM exception', async () => {
    const { env, token } = makeAuthEnv();
    let calls = 0;
    globalThis.fetch = vi.fn(async (url) => {
      calls++;
      if (calls === 1) return new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 });
      if (calls === 2) return new Response('[]', { status: 200 });
      if (calls === 3) return new Response('[]', { status: 200 });
      if (String(url).includes('openai.com')) throw new Error('boom');
      return new Response('[]', { status: 200 });
    });
    const res = await handleQOLGenerate(authReq(token, {}, 'POST'), env);
    expect(res.status).toBe(500);
  });
});
