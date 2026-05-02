import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  handleUsageGet,
  handleAvatarUpload,
  handleFeedbackSave,
  handleDiarySave,
  handleDiaryGet,
} from '../../src/routes/misc.js';

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

function makeAuthEnv(plan = 'free') {
  const kv = makeKV();
  const tok = 'goal_test_misc';
  kv._store.set(`token:${tok}`, JSON.stringify({ plan, userId: 'user-1' }));
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
  return new Request('https://x.test/api/usage', {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('handleUsageGet', () => {
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
    const res = await handleUsageGet(req, env);
    expect(res.status).toBe(401);
  });

  it('should return usage stats with model_usage for free', async () => {
    const { env, token } = makeAuthEnv('free');
    globalThis.fetch = vi.fn(async () => new Response('[]', { status: 200 }));
    const res = await handleUsageGet(authReq(token, null, 'GET'), env);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.plan).toBe('free');
    expect(j.model_usage).toBeDefined();
    expect(j.model_usage.claude.limit).toBe(5);
  });

  it('should not include model_usage breakdown for paid plan', async () => {
    const { env, token } = makeAuthEnv('pro');
    globalThis.fetch = vi.fn(async () => new Response('[]', { status: 200 }));
    const res = await handleUsageGet(authReq(token, null, 'GET'), env);
    const j = await res.json();
    expect(j.plan).toBe('pro');
    expect(Object.keys(j.model_usage)).toHaveLength(0);
  });
});

describe('handleAvatarUpload', () => {
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
    const res = await handleAvatarUpload(req, env);
    expect(res.status).toBe(401);
  });

  it('should reject when avatar_base64 missing', async () => {
    const { env, token } = makeAuthEnv();
    const res = await handleAvatarUpload(authReq(token, {}), env);
    expect(res.status).toBe(400);
  });

  it('should reject avatar over 7MB', async () => {
    const { env, token } = makeAuthEnv();
    const big = 'a'.repeat(8_000_000);
    const res = await handleAvatarUpload(authReq(token, { avatar_base64: big }), env);
    expect(res.status).toBe(400);
  });

  it('should reject SVG / non-PNG/JPEG/WebP MIME', async () => {
    const { env, token } = makeAuthEnv();
    const svg = 'data:image/svg+xml;base64,abc';
    const res = await handleAvatarUpload(authReq(token, { avatar_base64: svg }), env);
    expect(res.status).toBe(400);
  });

  it('should accept valid PNG and 200 OK on Supabase success', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 }));
    const png = 'data:image/png;base64,abc';
    const res = await handleAvatarUpload(authReq(token, { avatar_base64: png }), env);
    expect(res.status).toBe(200);
  });

  it('should return 500 on Supabase error', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () => new Response('err', { status: 500 }));
    const png = 'data:image/png;base64,abc';
    const res = await handleAvatarUpload(authReq(token, { avatar_base64: png }), env);
    expect(res.status).toBe(500);
  });
});

describe('handleFeedbackSave', () => {
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
    const res = await handleFeedbackSave(req, env);
    expect(res.status).toBe(401);
  });

  it('should reject when summary missing', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 }));
    const res = await handleFeedbackSave(authReq(token, {}), env);
    expect(res.status).toBe(400);
  });

  it('should save feedback with sentiment classification', async () => {
    const { env, token } = makeAuthEnv();
    let calls = 0;
    globalThis.fetch = vi.fn(async (url) => {
      calls++;
      if (calls === 1) return new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 });
      if (String(url).includes('openai.com')) {
        return new Response(JSON.stringify({ choices: [{ message: { content: 'positive' } }] }), { status: 200 });
      }
      return new Response(JSON.stringify([{ id: 'fb1' }]), { status: 200 });
    });
    const res = await handleFeedbackSave(authReq(token, { summary: 'great app' }), env);
    expect(res.status).toBe(201);
  });

  it('should still save even when sentiment classification throws', async () => {
    const { env, token } = makeAuthEnv();
    let calls = 0;
    globalThis.fetch = vi.fn(async (url) => {
      calls++;
      if (calls === 1) return new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 });
      if (String(url).includes('openai.com')) throw new Error('boom');
      return new Response(JSON.stringify([{ id: 'fb1' }]), { status: 200 });
    });
    const res = await handleFeedbackSave(authReq(token, { summary: 'x' }), env);
    expect(res.status).toBe(201);
  });
});

describe('handleDiarySave', () => {
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
    const res = await handleDiarySave(req, env);
    expect(res.status).toBe(401);
  });

  it('should save diary with default date when missing', async () => {
    const { env, token } = makeAuthEnv();
    let stage = 0;
    globalThis.fetch = vi.fn(async () => {
      if (stage++ === 0) return new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 });
      return new Response(JSON.stringify([{ id: 'd', content: 'today' }]), { status: 200 });
    });
    const res = await handleDiarySave(authReq(token, { content: 'today' }), env);
    const j = await res.json();
    expect(j.diary).toBeDefined();
  });

  it('should truncate content > 5000 chars', async () => {
    const { env, token } = makeAuthEnv();
    let lastBody;
    let stage = 0;
    globalThis.fetch = vi.fn(async (_url, init) => {
      if (stage++ === 0) return new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 });
      lastBody = JSON.parse(init.body);
      return new Response(JSON.stringify([lastBody]), { status: 200 });
    });
    await handleDiarySave(authReq(token, { content: 'x'.repeat(7000), date: '2026-05-01' }), env);
    expect(lastBody.content.length).toBe(5000);
  });
});

describe('handleDiaryGet', () => {
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
    const res = await handleDiaryGet(req, env);
    expect(res.status).toBe(401);
  });

  it('should reject malformed date param', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 }));
    const req = new Request('https://x.test/api/diary?date=not-a-date', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const res = await handleDiaryGet(req, env);
    expect(res.status).toBe(400);
  });

  it('should return diary row when found', async () => {
    const { env, token } = makeAuthEnv();
    let stage = 0;
    globalThis.fetch = vi.fn(async () => {
      if (stage++ === 0) return new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 });
      return new Response(JSON.stringify([{ id: 'd', content: 'note' }]), { status: 200 });
    });
    const req = new Request('https://x.test/api/diary?date=2026-05-01', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const res = await handleDiaryGet(req, env);
    const j = await res.json();
    expect(j.diary).toBeDefined();
  });
});
