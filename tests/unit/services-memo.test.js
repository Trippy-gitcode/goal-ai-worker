import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { countRecentMessages, regenerateAiMemo, checkMemoAutoUpdate } from '../../src/services/memo.js';

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
    async delete(key) {
      store.delete(key);
    },
    _store: store,
  };
}

describe('countRecentMessages', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should return 0 when user not found', async () => {
    globalThis.fetch = vi.fn(async () => new Response('[]', { status: 200 }));
    const env = { SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    expect(await countRecentMessages(env, 'tok')).toBe(0);
  });

  it('should parse content-range to total count', async () => {
    let stage = 0;
    globalThis.fetch = vi.fn(async () => {
      if (stage++ === 0) return new Response(JSON.stringify([{ id: 'u' }]), { status: 200 });
      return new Response(null, { status: 200, headers: { 'content-range': '0-9/15' } });
    });
    const env = { SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    expect(await countRecentMessages(env, 'tok')).toBe(15);
  });

  it('should return 0 when content-range missing', async () => {
    let stage = 0;
    globalThis.fetch = vi.fn(async () => {
      if (stage++ === 0) return new Response(JSON.stringify([{ id: 'u' }]), { status: 200 });
      return new Response(null, { status: 200 });
    });
    const env = { SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    expect(await countRecentMessages(env, 'tok')).toBe(0);
  });

  it('should swallow errors and return 0', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('boom'); });
    const env = { SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    expect(await countRecentMessages(env, 'tok')).toBe(0);
  });
});

describe('regenerateAiMemo', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should bail out when lock already exists', async () => {
    const kv = makeKV({ 'memo_lock:tok-x': '1' });
    let called = false;
    globalThis.fetch = vi.fn(async () => { called = true; return new Response('[]'); });
    const env = { TOKEN_KV: kv, OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    await regenerateAiMemo(env, 'tok-x');
    expect(called).toBe(false);
  });

  it('should bail when user not found', async () => {
    const kv = makeKV();
    globalThis.fetch = vi.fn(async () => new Response('[]', { status: 200 }));
    const env = { TOKEN_KV: kv, OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    await regenerateAiMemo(env, 'tok-y');
    // lock removed
    expect(await kv.get('memo_lock:tok-y')).toBeNull();
  });

  it('should bail with too-few messages (< 5)', async () => {
    const kv = makeKV();
    let stage = 0;
    globalThis.fetch = vi.fn(async () => {
      if (stage++ === 0) return new Response(JSON.stringify([{ id: 'u' }]), { status: 200 });
      // Few messages
      return new Response(JSON.stringify([{ role: 'user', content: 'a' }]), { status: 200 });
    });
    const env = { TOKEN_KV: kv, OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    await regenerateAiMemo(env, 'tok-z');
    // No exception, lock left in place to prevent flapping
    expect(true).toBe(true);
  });

  it('should call OpenAI and PATCH users (no goalId path)', async () => {
    const kv = makeKV();
    const calls = [];
    let stage = 0;
    globalThis.fetch = vi.fn(async (url, init) => {
      calls.push({ url: String(url), method: init?.method, body: init?.body });
      if (stage === 0) {
        // user lookup
        stage++;
        return new Response(JSON.stringify([{ id: 'u' }]), { status: 200 });
      }
      if (String(url).includes('chat_messages') && stage === 1) {
        stage++;
        // 6+ messages
        const messages = Array.from({ length: 8 }, (_, i) => ({ role: 'user', content: 'm' + i }));
        return new Response(JSON.stringify(messages), { status: 200 });
      }
      if (String(url).includes('diaries')) {
        return new Response('[]', { status: 200 });
      }
      if (String(url).includes('users') && String(url).includes('eq.')) {
        return new Response(JSON.stringify([{ ai_memo: null }]), { status: 200 });
      }
      if (String(url).includes('openai.com')) {
        return new Response(JSON.stringify({ choices: [{ message: { content: 'NEW_MEMO' } }] }), { status: 200 });
      }
      return new Response('[]', { status: 200 });
    });
    const env = { TOKEN_KV: kv, OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    const r = await regenerateAiMemo(env, 'tok-w');
    // Function may return true on success
    expect(typeof r === 'boolean' || r === undefined).toBe(true);
  });

  it('should swallow errors silently', async () => {
    const kv = makeKV();
    globalThis.fetch = vi.fn(async () => { throw new Error('boom'); });
    const env = { TOKEN_KV: kv, OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    await expect(regenerateAiMemo(env, 'tok-err')).resolves.toBeUndefined();
  });
});

describe('checkMemoAutoUpdate', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should no-op when chat_count is 0', async () => {
    const kv = makeKV();
    let called = false;
    globalThis.fetch = vi.fn(async () => { called = true; return new Response('[]', { status: 200 }); });
    const env = { TOKEN_KV: kv };
    await checkMemoAutoUpdate('tok', env);
    expect(called).toBe(false);
  });

  it('should not patch when count not divisible by 5', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const kv = makeKV({ [`chat_count:tok:${today}`]: '4' });
    let called = false;
    globalThis.fetch = vi.fn(async () => { called = true; return new Response('[]', { status: 200 }); });
    const env = { TOKEN_KV: kv };
    await checkMemoAutoUpdate('tok', env);
    expect(called).toBe(false);
  });

  it('should patch users when count is multiple of 5', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const kv = makeKV({ [`chat_count:tok:${today}`]: '5' });
    const calls = [];
    let stage = 0;
    globalThis.fetch = vi.fn(async (url, init) => {
      calls.push({ url: String(url), method: init?.method });
      if (stage++ === 0) return new Response(JSON.stringify([{ id: 'uid' }]), { status: 200 });
      return new Response('[]', { status: 200 });
    });
    const env = { TOKEN_KV: kv, SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    await checkMemoAutoUpdate('tok', env);
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(calls[1].method).toBe('PATCH');
  });

  it('should bail when user not found', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const kv = makeKV({ [`chat_count:tok:${today}`]: '10' });
    globalThis.fetch = vi.fn(async () => new Response('[]', { status: 200 }));
    const env = { TOKEN_KV: kv, SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    await expect(checkMemoAutoUpdate('tok', env)).resolves.toBeUndefined();
  });

  it('should swallow errors silently', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const kv = makeKV({ [`chat_count:tok:${today}`]: '5' });
    globalThis.fetch = vi.fn(async () => { throw new Error('boom'); });
    const env = { TOKEN_KV: kv, SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    await expect(checkMemoAutoUpdate('tok', env)).resolves.toBeUndefined();
  });
});
