import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  autoTagSession,
  generateConversationSummary,
  buildCompressedMessages,
  countSessionMessages,
} from '../../src/services/history.js';

function makeKV(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    async get(key) {
      const v = store.get(key);
      return v === undefined ? null : v;
    },
    async put(key, value) {
      store.set(key, value);
    },
  };
}

describe('autoTagSession', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should no-op for null messages', async () => {
    const env = { OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    let called = false;
    globalThis.fetch = vi.fn(async () => { called = true; return new Response('{}', { status: 200 }); });
    await autoTagSession('sid', null, env);
    expect(called).toBe(false);
  });

  it('should no-op for too few messages (< 2)', async () => {
    const env = { OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    let called = false;
    globalThis.fetch = vi.fn(async () => { called = true; return new Response('{}', { status: 200 }); });
    await autoTagSession('sid', [{ content: 'one' }], env);
    expect(called).toBe(false);
  });

  it('should call OpenAI then PATCH chat_messages with tag', async () => {
    const calls = [];
    globalThis.fetch = vi.fn(async (url, init) => {
      calls.push({ url: String(url), method: init?.method, body: init?.body });
      if (String(url).includes('openai.com')) {
        return new Response(
          JSON.stringify({ choices: [{ message: { content: '健康' } }] }),
          { status: 200 },
        );
      }
      return new Response('[]', { status: 200 });
    });
    const env = { OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    await autoTagSession('sid-abc', [{ content: 'hi' }, { content: 'hello' }, { content: 'thx' }], env);
    expect(calls.length).toBeGreaterThanOrEqual(2);
    const patchCall = calls.find((c) => c.method === 'PATCH');
    expect(patchCall).toBeDefined();
    const body = JSON.parse(patchCall.body);
    expect(body.session_tag).toBe('健康');
  });

  it('should not patch when LLM returns empty tag', async () => {
    const calls = [];
    globalThis.fetch = vi.fn(async (url, init) => {
      calls.push({ url: String(url), method: init?.method });
      return new Response(JSON.stringify({ choices: [{ message: { content: '' } }] }), { status: 200 });
    });
    const env = { OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    await autoTagSession('sid', [{ content: 'a' }, { content: 'b' }], env);
    const patchCall = calls.find((c) => c.method === 'PATCH');
    expect(patchCall).toBeUndefined();
  });

  it('should not patch when LLM tag exceeds 10 chars', async () => {
    const calls = [];
    globalThis.fetch = vi.fn(async (url, init) => {
      calls.push({ method: init?.method });
      return new Response(JSON.stringify({ choices: [{ message: { content: 'a'.repeat(50) } }] }), { status: 200 });
    });
    const env = { OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    await autoTagSession('sid', [{ content: 'a' }, { content: 'b' }], env);
    expect(calls.find((c) => c.method === 'PATCH')).toBeUndefined();
  });

  it('should swallow errors silently', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('boom'); });
    const env = { OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    await expect(autoTagSession('sid', [{ content: 'a' }, { content: 'b' }], env)).resolves.toBeUndefined();
  });
});

describe('generateConversationSummary', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should return existing KV cache without API call', async () => {
    const kv = makeKV({ 'summary:tok-x:sid-1': 'cached summary' });
    const env = { TOKEN_KV: kv, OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    let called = false;
    globalThis.fetch = vi.fn(async () => { called = true; return new Response('{}', { status: 200 }); });
    const r = await generateConversationSummary(env, 'tok-x', 'sid-1');
    expect(r).toBe('cached summary');
    expect(called).toBe(false);
  });

  it('should return null when user not found', async () => {
    const kv = makeKV();
    const env = { TOKEN_KV: kv, OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    globalThis.fetch = vi.fn(async () => new Response('[]', { status: 200 }));
    const r = await generateConversationSummary(env, 'tok-missing', 'sid');
    expect(r).toBeNull();
  });

  it('should return null when too few messages (< 6)', async () => {
    const kv = makeKV();
    const env = { TOKEN_KV: kv, OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    let stage = 0;
    globalThis.fetch = vi.fn(async () => {
      if (stage++ === 0) return new Response(JSON.stringify([{ id: 'u' }]), { status: 200 });
      // few messages
      return new Response(JSON.stringify([{ role: 'user', content: 'x' }]), { status: 200 });
    });
    const r = await generateConversationSummary(env, 'tok', 'sid');
    expect(r).toBeNull();
  });

  it('should generate summary, cache it in KV, and return it', async () => {
    const kv = makeKV();
    const env = { TOKEN_KV: kv, OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    let stage = 0;
    globalThis.fetch = vi.fn(async (url) => {
      if (stage++ === 0) return new Response(JSON.stringify([{ id: 'u' }]), { status: 200 });
      if (String(url).includes('openai.com')) {
        return new Response(JSON.stringify({ choices: [{ message: { content: 'TEST_SUMMARY' } }] }), { status: 200 });
      }
      // 20 messages so olderMessages.length >= 3
      const messages = Array.from({ length: 20 }, (_, i) => ({ role: i % 2 === 0 ? 'user' : 'assistant', content: 'm' + i }));
      return new Response(JSON.stringify(messages), { status: 200 });
    });
    const r = await generateConversationSummary(env, 'tok-y', 'sid-y');
    expect(r).toBe('TEST_SUMMARY');
    // KV cached
    expect(await kv.get('summary:tok-y:sid-y')).toBe('TEST_SUMMARY');
  });

  it('should swallow errors and return null', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('boom'); });
    const env = { TOKEN_KV: makeKV(), OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    expect(await generateConversationSummary(env, 't', 's')).toBeNull();
  });
});

describe('buildCompressedMessages', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should return original list when length <= window', async () => {
    const env = { TOKEN_KV: makeKV(), OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    const msgs = [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }];
    const r = await buildCompressedMessages(env, 'tok', 'sid', msgs, 1.0);
    expect(r).toEqual(msgs);
  });

  it('should slice to recent window when no summary obtainable', async () => {
    const env = { TOKEN_KV: makeKV(), OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    // user lookup empty → summary = null → returns recent slice
    globalThis.fetch = vi.fn(async () => new Response('[]', { status: 200 }));
    const msgs = Array.from({ length: 25 }, (_, i) => ({ role: 'user', content: String(i) }));
    const r = await buildCompressedMessages(env, 'tok', 'sid', msgs, 1.0);
    expect(r).toHaveLength(10);
    expect(r[0].content).toBe('15'); // last 10
  });

  it('should respect contextMultiplier=2 (window=20)', async () => {
    const env = { TOKEN_KV: makeKV(), OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    globalThis.fetch = vi.fn(async () => new Response('[]', { status: 200 }));
    const msgs = Array.from({ length: 50 }, (_, i) => ({ role: 'user', content: String(i) }));
    const r = await buildCompressedMessages(env, 'tok', 'sid', msgs, 2.0);
    expect(r).toHaveLength(20);
  });

  it('should prepend summary as user+assistant when summary present', async () => {
    const kv = makeKV({ 'summary:tok:sid': 'PRE_SUMMARY' });
    const env = { TOKEN_KV: kv, OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    globalThis.fetch = vi.fn();
    const msgs = Array.from({ length: 25 }, (_, i) => ({ role: 'user', content: 'm' + i }));
    const r = await buildCompressedMessages(env, 'tok', 'sid', msgs, 1.0);
    // prepended 2 messages (summary user + ack assistant) + last 10
    expect(r[0].content).toContain('PRE_SUMMARY');
    expect(r[1].role).toBe('assistant');
    expect(r).toHaveLength(12);
  });

  it('should fallback to slice on any thrown error', async () => {
    const env = { TOKEN_KV: makeKV(), OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    globalThis.fetch = vi.fn(async () => { throw new Error('boom'); });
    const msgs = Array.from({ length: 30 }, (_, i) => ({ role: 'user', content: String(i) }));
    const r = await buildCompressedMessages(env, 'tok', 'sid', msgs, 1.0);
    expect(r.length).toBeLessThanOrEqual(15);
  });
});

describe('countSessionMessages', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should return 0 when user not found', async () => {
    const env = { OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    globalThis.fetch = vi.fn(async () => new Response('[]', { status: 200 }));
    expect(await countSessionMessages(env, 'tok', 'sid')).toBe(0);
  });

  it('should parse content-range header to extract total', async () => {
    const env = { OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    let stage = 0;
    globalThis.fetch = vi.fn(async () => {
      if (stage++ === 0) return new Response(JSON.stringify([{ id: 'u' }]), { status: 200 });
      return new Response(null, { status: 200, headers: { 'content-range': '0-9/42' } });
    });
    expect(await countSessionMessages(env, 'tok', 'sid')).toBe(42);
  });

  it('should swallow errors and return 0', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('boom'); });
    const env = { OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    expect(await countSessionMessages(env, 't', 's')).toBe(0);
  });
});
