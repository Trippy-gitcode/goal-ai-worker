import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handleGPTChat, handleGPTSimpleChat } from '../../src/services/ai/gpt.js';

describe('handleGPTChat', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should return a Response with text/event-stream Content-Type when LLM returns text', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: 'hello world' } }] }), { status: 200 }),
    );
    const env = { OPENAI_API_KEY: 'k' };
    const auth = { plan: 'pro' };
    const r = await handleGPTChat(env, 'sys', [{ role: 'user', content: 'hi' }], auth, 100);
    expect(r).toBeInstanceOf(Response);
    expect(r.headers.get('Content-Type')).toBe('text/event-stream');
    expect(r.status).toBe(200);
  });

  it('should embed the LLM text into SSE delta payload', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: 'TEST_RESP' } }] }), { status: 200 }),
    );
    const env = { OPENAI_API_KEY: 'k' };
    const auth = { plan: 'pro' };
    const r = await handleGPTChat(env, 'sys', [], auth, 100);
    const text = await r.text();
    expect(text).toContain('TEST_RESP');
    expect(text).toContain('content_block_delta');
    expect(text).toContain('[DONE]');
  });

  it('should expose X-Model-Used header', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: 'x' } }] }), { status: 200 }),
    );
    const env = { OPENAI_API_KEY: 'k' };
    const r = await handleGPTChat(env, '', [], { plan: 'pro' }, 100);
    expect(r.headers.get('X-Model-Used')).toBeTruthy();
  });

  it('should clamp maxTokens to 1000 in request body', async () => {
    let captured;
    globalThis.fetch = vi.fn(async (_url, init) => {
      captured = JSON.parse(init.body);
      return new Response(JSON.stringify({ choices: [{ message: { content: 'x' } }] }), { status: 200 });
    });
    await handleGPTChat({ OPENAI_API_KEY: 'k' }, '', [], { plan: 'pro' }, 5000);
    expect(captured.max_completion_tokens).toBe(1000);
  });

  it('should return null when LLM returns empty text', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: '' } }] }), { status: 200 }),
    );
    expect(await handleGPTChat({ OPENAI_API_KEY: 'k' }, '', [], { plan: 'pro' }, 100)).toBeNull();
  });

  it('should return null on fetch throw', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('net'); });
    expect(await handleGPTChat({ OPENAI_API_KEY: 'k' }, '', [], { plan: 'pro' }, 100)).toBeNull();
  });

  it('should accept overrideModels and use provided openai model', async () => {
    let captured;
    globalThis.fetch = vi.fn(async (_url, init) => {
      captured = JSON.parse(init.body);
      return new Response(JSON.stringify({ choices: [{ message: { content: 'x' } }] }), { status: 200 });
    });
    await handleGPTChat({ OPENAI_API_KEY: 'k' }, '', [], { plan: 'pro' }, 100, { openai: 'override-gpt' });
    expect(captured.model).toBe('override-gpt');
  });
});

describe('handleGPTSimpleChat', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should set max_completion_tokens to 80', async () => {
    let captured;
    globalThis.fetch = vi.fn(async (_url, init) => {
      captured = JSON.parse(init.body);
      return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 });
    });
    await handleGPTSimpleChat({ OPENAI_API_KEY: 'k' }, '', [], { plan: 'pro' });
    expect(captured.max_completion_tokens).toBe(80);
  });

  it('should return SSE Response on success', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: 'short reply' } }] }), { status: 200 }),
    );
    const r = await handleGPTSimpleChat({ OPENAI_API_KEY: 'k' }, '', [], { plan: 'pro' });
    expect(r).toBeInstanceOf(Response);
    expect(r.headers.get('Content-Type')).toBe('text/event-stream');
  });

  it('should return null on empty LLM response', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: '' } }] }), { status: 200 }),
    );
    expect(await handleGPTSimpleChat({ OPENAI_API_KEY: 'k' }, '', [], { plan: 'pro' })).toBeNull();
  });

  it('should return null on fetch throw', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('boom'); });
    expect(await handleGPTSimpleChat({ OPENAI_API_KEY: 'k' }, '', [], { plan: 'pro' })).toBeNull();
  });
});
