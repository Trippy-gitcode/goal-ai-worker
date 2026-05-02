import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  handleDeepOpenAI,
  handleDeepGemini,
  handleDeepClaude,
  handleDeepClaudeStream,
} from '../../src/routes/deep.js';

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

function makeAuthEnv(plan = 'pro') {
  const kv = makeKV();
  const tok = 'goal_test_dp';
  kv._store.set(`token:${tok}`, JSON.stringify({ plan, userId: 'user-1' }));
  return {
    env: {
      TOKEN_KV: kv,
      OPENAI_API_KEY: 'k',
      GEMINI_API_KEY: 'g',
      ANTHROPIC_API_KEY: 'a',
    },
    token: tok,
  };
}

function authReq(token, body) {
  return new Request('https://x.test/api/deep', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('handleDeepOpenAI', () => {
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
    const res = await handleDeepOpenAI(req, env);
    expect(res.status).toBe(401);
  });

  it('should return 429 when monthly limit exceeded', async () => {
    const { env, token } = makeAuthEnv('free');
    // Pre-saturate counter via KV fallback path
    for (let i = 0; i < 5; i++) {
      env.TOKEN_KV._store.set(
        `sb_fb:user-1:deep:${new Date().toISOString().slice(0, 7)}`,
        '99',
      );
    }
    const res = await handleDeepOpenAI(authReq(token, { messages: [{ role: 'user', content: 'x' }] }), env);
    expect(res.status).toBe(429);
  });

  it('should call OpenAI and return data on success', async () => {
    const { env, token } = makeAuthEnv('pro');
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: 'reply' } }] }), { status: 200 }),
    );
    const res = await handleDeepOpenAI(authReq(token, { messages: [{ role: 'user', content: 'x' }] }), env);
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Model-Used')).toBeTruthy();
  });

  it('should bubble up OpenAI error', async () => {
    const { env, token } = makeAuthEnv('pro');
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ error: { message: 'bad' } }), { status: 400 }));
    const res = await handleDeepOpenAI(authReq(token, { messages: [] }), env);
    expect(res.status).toBe(400);
  });
});

describe('handleDeepGemini', () => {
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
    const res = await handleDeepGemini(req, env);
    expect(res.status).toBe(401);
  });

  it('should call Gemini API and return body', async () => {
    const { env, token } = makeAuthEnv('pro');
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'hi' }] } }] }), { status: 200 }),
    );
    const res = await handleDeepGemini(authReq(token, { prompt: 'analyze me' }), env);
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Model-Used')).toBeTruthy();
  });

  it('should bubble up Gemini error', async () => {
    const { env, token } = makeAuthEnv('pro');
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ error: { message: 'g-err' } }), { status: 500 }));
    const res = await handleDeepGemini(authReq(token, { prompt: 'x' }), env);
    expect(res.status).toBe(500);
  });
});

describe('handleDeepClaude', () => {
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
    const res = await handleDeepClaude(req, env);
    expect(res.status).toBe(401);
  });

  it('should not check usage when countUsage is false', async () => {
    const { env, token } = makeAuthEnv('pro');
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ content: [{ text: 'reply' }] }), { status: 200 }),
    );
    const res = await handleDeepClaude(authReq(token, { messages: [{ role: 'user', content: 'x' }] }), env);
    expect(res.status).toBe(200);
  });

  it('should bubble up Claude error', async () => {
    const { env, token } = makeAuthEnv('pro');
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ error: { message: 'c-err' } }), { status: 401 }));
    const res = await handleDeepClaude(authReq(token, { messages: [] }), env);
    expect(res.status).toBe(401);
  });
});

describe('handleDeepClaudeStream', () => {
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
    const res = await handleDeepClaudeStream(req, env);
    expect(res.status).toBe(401);
  });

  it('should pass stream through with text/event-stream Content-Type', async () => {
    const { env, token } = makeAuthEnv('pro');
    globalThis.fetch = vi.fn(async () =>
      new Response('data: x', { status: 200 }),
    );
    const res = await handleDeepClaudeStream(authReq(token, { messages: [] }), env);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
  });

  it('should bubble up upstream non-OK status', async () => {
    const { env, token } = makeAuthEnv('pro');
    globalThis.fetch = vi.fn(async () => new Response('error', { status: 500 }));
    const res = await handleDeepClaudeStream(authReq(token, { messages: [] }), env);
    expect(res.status).toBe(500);
  });
});
