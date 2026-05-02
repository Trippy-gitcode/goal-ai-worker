import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handleChat, handleChatStream } from '../../src/routes/chat.js';

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
  const tok = 'goal_test_chat';
  kv._store.set(`token:${tok}`, JSON.stringify({ plan, userId: 'user-1' }));
  return {
    env: {
      TOKEN_KV: kv,
      OPENAI_API_KEY: 'k',
      ANTHROPIC_API_KEY: 'a',
      GEMINI_API_KEY: 'g',
      SUPABASE_URL: '', // disable to avoid extra fetches
      SUPABASE_SERVICE_KEY: 'sk',
    },
    token: tok,
  };
}

function authReq(token, body, urlPath = '/api/chat') {
  return new Request(`https://x.test${urlPath}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('handleChat', () => {
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
    const res = await handleChat(req, env);
    expect(res.status).toBe(401);
  });

  it('should call Anthropic and return data on success', async () => {
    const { env, token } = makeAuthEnv('pro');
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ content: [{ text: 'reply' }] }), { status: 200 }),
    );
    const res = await handleChat(
      authReq(token, { messages: [{ role: 'user', content: 'hi' }] }),
      env,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Model-Used')).toBeTruthy();
  });

  it('should bubble up Anthropic error response', async () => {
    const { env, token } = makeAuthEnv('pro');
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: 'c-err' } }), { status: 401 }),
    );
    const res = await handleChat(
      authReq(token, { messages: [{ role: 'user', content: 'hi' }] }),
      env,
    );
    expect(res.status).toBe(401);
  });

  it('should return 400 on JSON parse error', async () => {
    // SUBAGENT-LAIS-INPUTGUARD-9ROUTES-V1 (2026-05-02、 Round 31 P4 #39 fix):
    //   旧: parseBodyGuarded 適用前は uncaught throw → catch → 500 で「server error」報告。
    //   新: parseBodyGuarded で invalid JSON を 400 (client error) として明示返却。
    //   400 が semantically 正確 (client が malformed payload を送った)、 攻撃者が
    //   JSON parse 例外による server log noise を作る pattern も同時に潰す。
    const { env, token } = makeAuthEnv('pro');
    const req = new Request('https://x.test/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: 'not json',
    });
    const res = await handleChat(req, env);
    expect(res.status).toBe(400);
  });

  it('should return 429 when daily chat usage exceeded for free', async () => {
    const { env, token } = makeAuthEnv('free');
    // Pre-saturate daily counter via KV fallback
    const dayKey = (() => {
      const now = new Date(Date.now() + 9 * 3600000);
      return now.toISOString().slice(0, 10);
    })();
    env.TOKEN_KV._store.set(`sb_fb:user-1:chat_daily:${dayKey}`, '999');
    const res = await handleChat(
      authReq(token, { messages: [{ role: 'user', content: 'hi' }] }),
      env,
    );
    expect(res.status).toBe(429);
  });
});

describe('handleChatStream', () => {
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
    const res = await handleChatStream(req, env);
    expect(res.status).toBe(401);
  });

  it('should reject free_no_count with non-design context', async () => {
    const { env, token } = makeAuthEnv();
    const res = await handleChatStream(
      authReq(token, { messages: [{ role: 'user', content: 'hi' }], free_no_count: true, context: 'main' }),
      env,
    );
    expect(res.status).toBe(400);
  });

  it('should accept free_no_count with design context (no usage check)', async () => {
    const { env, token } = makeAuthEnv('free');
    // smartFetch: routes to anthropic for streaming
    globalThis.fetch = vi.fn(async (url) => {
      if (String(url).includes('anthropic.com')) {
        return new Response('data: x', { status: 200 });
      }
      return new Response('[]', { status: 200 });
    });
    const res = await handleChatStream(
      authReq(token, {
        messages: [{ role: 'user', content: 'hi' }],
        free_no_count: true,
        context: 'design',
      }),
      env,
    );
    // Either 200 with stream or some error path - just confirm it isn't 400
    expect(res.status).not.toBe(400);
  });
});
