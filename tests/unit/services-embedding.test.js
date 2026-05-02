import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateAndStoreEmbedding, searchRelatedMessages } from '../../src/services/embedding.js';

describe('generateAndStoreEmbedding', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should no-op for empty/short text (< 20 chars)', async () => {
    let called = false;
    globalThis.fetch = vi.fn(async () => { called = true; return new Response('{}'); });
    const env = { OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    await generateAndStoreEmbedding(env, 'tok', 'sid', null, 'short');
    expect(called).toBe(false);
  });

  it('should no-op when text is null', async () => {
    let called = false;
    globalThis.fetch = vi.fn(async () => { called = true; return new Response('{}'); });
    const env = { OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    await generateAndStoreEmbedding(env, 'tok', 'sid', null, null);
    expect(called).toBe(false);
  });

  it('should call embedding API with text truncated to 500 chars', async () => {
    const calls = [];
    globalThis.fetch = vi.fn(async (url, init) => {
      calls.push({ url: String(url), body: init?.body });
      if (String(url).includes('embeddings')) {
        return new Response(
          JSON.stringify({ data: [{ embedding: [0.1, 0.2, 0.3] }] }),
          { status: 200 },
        );
      }
      return new Response('[]', { status: 200 });
    });
    const env = { OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    const longText = 'a'.repeat(1000);
    await generateAndStoreEmbedding(env, 'tok', 'sid', null, longText);
    const embCall = calls.find((c) => c.url.includes('embeddings'));
    const body = JSON.parse(embCall.body);
    expect(body.input.length).toBe(500);
  });

  it('should POST to chat_embeddings on success', async () => {
    const calls = [];
    globalThis.fetch = vi.fn(async (url, init) => {
      calls.push({ url: String(url), method: init?.method, body: init?.body });
      if (String(url).includes('embeddings') && !String(url).includes('chat_embeddings')) {
        return new Response(
          JSON.stringify({ data: [{ embedding: [1, 2, 3] }] }),
          { status: 200 },
        );
      }
      return new Response('[]', { status: 200 });
    });
    const env = { OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    await generateAndStoreEmbedding(env, 'tok', 'sid', 'goal-1', 'a'.repeat(50));
    const sbCall = calls.find((c) => c.url.includes('chat_embeddings'));
    expect(sbCall).toBeDefined();
    const body = JSON.parse(sbCall.body);
    expect(body.token_id).toBe('tok');
    expect(body.session_id).toBe('sid');
    expect(body.goal_id).toBe('goal-1');
    expect(body.embedding).toContain('1');
  });

  it('should return early on embedding API error', async () => {
    let stage = 0;
    let supabaseCalled = false;
    globalThis.fetch = vi.fn(async (url) => {
      if (stage++ === 0 && String(url).includes('embeddings')) {
        return new Response('{"error":"no key"}', { status: 401 });
      }
      supabaseCalled = true;
      return new Response('[]', { status: 200 });
    });
    const env = { OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    await generateAndStoreEmbedding(env, 'tok', 'sid', null, 'a'.repeat(50));
    expect(supabaseCalled).toBe(false);
  });

  it('should return early when embedding payload missing', async () => {
    let supabaseCalled = false;
    globalThis.fetch = vi.fn(async (url) => {
      if (String(url).includes('embeddings')) {
        return new Response(JSON.stringify({ data: [{}] }), { status: 200 });
      }
      supabaseCalled = true;
      return new Response('[]', { status: 200 });
    });
    const env = { OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    await generateAndStoreEmbedding(env, 'tok', 'sid', null, 'a'.repeat(50));
    expect(supabaseCalled).toBe(false);
  });

  it('should swallow exceptions', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('boom'); });
    const env = { OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    await expect(generateAndStoreEmbedding(env, 'tok', 'sid', null, 'a'.repeat(50))).resolves.toBeUndefined();
  });
});

describe('searchRelatedMessages', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should return [] for short user message (< 10 chars)', async () => {
    let called = false;
    globalThis.fetch = vi.fn(async () => { called = true; return new Response('{}'); });
    const env = { OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    expect(await searchRelatedMessages(env, 'tok', 'short', null)).toEqual([]);
    expect(called).toBe(false);
  });

  it('should return [] when embedding API errors', async () => {
    globalThis.fetch = vi.fn(async (url) => {
      if (String(url).includes('embeddings')) return new Response('{}', { status: 500 });
      return new Response('[]');
    });
    const env = { OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    expect(await searchRelatedMessages(env, 'tok', 'a long enough message please', null)).toEqual([]);
  });

  it('should return [] when embedding response missing', async () => {
    globalThis.fetch = vi.fn(async (url) => {
      if (String(url).includes('embeddings')) {
        return new Response(JSON.stringify({ data: [{}] }), { status: 200 });
      }
      return new Response('[]');
    });
    const env = { OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    expect(await searchRelatedMessages(env, 'tok', 'a long enough message please', null)).toEqual([]);
  });

  it('should call match_embeddings RPC and return its rows', async () => {
    let stage = 0;
    globalThis.fetch = vi.fn(async (url) => {
      if (stage++ === 0) {
        return new Response(JSON.stringify({ data: [{ embedding: [1, 2] }] }), { status: 200 });
      }
      // RPC
      expect(String(url)).toContain('rpc/match_embeddings');
      return new Response(JSON.stringify([{ content: 'past msg' }]), { status: 200 });
    });
    const env = { OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    const r = await searchRelatedMessages(env, 'tok', 'a long enough message please', 'goal-1');
    expect(r).toEqual([{ content: 'past msg' }]);
  });

  it('should return [] when RPC errors', async () => {
    let stage = 0;
    globalThis.fetch = vi.fn(async () => {
      if (stage++ === 0) return new Response(JSON.stringify({ data: [{ embedding: [1] }] }), { status: 200 });
      return new Response('{}', { status: 500 });
    });
    const env = { OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    const r = await searchRelatedMessages(env, 'tok', 'a long enough message please', null);
    expect(r).toEqual([]);
  });

  it('should swallow exceptions and return []', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('boom'); });
    const env = { OPENAI_API_KEY: 'k', SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'sk' };
    expect(await searchRelatedMessages(env, 'tok', 'a long enough message please', null)).toEqual([]);
  });
});
