import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handleGeminiChat } from '../../src/services/ai/gemini.js';

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

function geminiPayload(text, thoughtSig) {
  const parts = [{ text }];
  if (thoughtSig) parts.push({ thoughtSignature: thoughtSig });
  return { candidates: [{ content: { parts } }] };
}

describe('handleGeminiChat', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should return SSE Response with model header on success', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify(geminiPayload('hello')), { status: 200 }),
    );
    const env = { GEMINI_API_KEY: 'k', TOKEN_KV: makeKV() };
    const r = await handleGeminiChat(env, 'sys', [{ role: 'user', content: 'hi' }], { plan: 'pro' });
    expect(r).toBeInstanceOf(Response);
    expect(r.headers.get('X-Model-Used')).toBeTruthy();
    expect(r.headers.get('Content-Type')).toBe('text/event-stream');
  });

  it('should encode SSE delta with text payload', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify(geminiPayload('GEMINI_RESP')), { status: 200 }),
    );
    const env = { GEMINI_API_KEY: 'k', TOKEN_KV: makeKV() };
    const r = await handleGeminiChat(env, '', [{ role: 'user', content: 'hi' }], { plan: 'pro' });
    const text = await r.text();
    expect(text).toContain('GEMINI_RESP');
    expect(text).toContain('[DONE]');
  });

  it('should return null when API errors', async () => {
    globalThis.fetch = vi.fn(async () => new Response('{"error":"x"}', { status: 500 }));
    const env = { GEMINI_API_KEY: 'k', TOKEN_KV: makeKV() };
    const r = await handleGeminiChat(env, '', [{ role: 'user', content: 'hi' }], { plan: 'pro' });
    expect(r).toBeNull();
  });

  it('should return null when text response is empty', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '' }] } }] }), { status: 200 }));
    const env = { GEMINI_API_KEY: 'k', TOKEN_KV: makeKV() };
    expect(await handleGeminiChat(env, '', [{ role: 'user', content: 'hi' }], { plan: 'pro' })).toBeNull();
  });

  it('should return null when no valid messages', async () => {
    globalThis.fetch = vi.fn(); // shouldn't be called
    const env = { GEMINI_API_KEY: 'k', TOKEN_KV: makeKV() };
    const r = await handleGeminiChat(env, '', [], { plan: 'pro' });
    expect(r).toBeNull();
  });

  it('should prepend a placeholder when first message is assistant', async () => {
    let captured;
    globalThis.fetch = vi.fn(async (_url, init) => {
      captured = JSON.parse(init.body);
      return new Response(JSON.stringify(geminiPayload('ok')), { status: 200 });
    });
    const env = { GEMINI_API_KEY: 'k', TOKEN_KV: makeKV() };
    await handleGeminiChat(
      env,
      '',
      [{ role: 'assistant', content: 'first' }, { role: 'user', content: 'second' }],
      { plan: 'pro' },
    );
    expect(captured.contents[0].role).toBe('user');
    expect(captured.contents[0].parts[0].text).toBe('...');
  });

  it('should append location info to system_instruction when userLocation given', async () => {
    let captured;
    globalThis.fetch = vi.fn(async (_url, init) => {
      captured = JSON.parse(init.body);
      return new Response(JSON.stringify(geminiPayload('ok')), { status: 200 });
    });
    const env = { GEMINI_API_KEY: 'k', TOKEN_KV: makeKV() };
    await handleGeminiChat(
      env,
      'base',
      [{ role: 'user', content: 'hi' }],
      { plan: 'pro' },
      { region: 'Tokyo', city: 'Shibuya' },
    );
    const sysText = captured.system_instruction.parts[0].text;
    expect(sysText).toContain('Shibuya');
    expect(sysText).toContain('Tokyo');
  });

  it('should set thinkingBudget=0 for flash model', async () => {
    let captured;
    globalThis.fetch = vi.fn(async (_url, init) => {
      captured = JSON.parse(init.body);
      return new Response(JSON.stringify(geminiPayload('ok')), { status: 200 });
    });
    const env = { GEMINI_API_KEY: 'k', TOKEN_KV: makeKV() };
    // free plan defaults to gemini flash
    await handleGeminiChat(env, '', [{ role: 'user', content: 'hi' }], { plan: 'free' });
    expect(captured.generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
  });

  it('should attach previous thoughtSignature from KV when present', async () => {
    let captured;
    const kv = makeKV({ 'thought_sig:tok-x': 'PREVSIG' });
    globalThis.fetch = vi.fn(async (_url, init) => {
      captured = JSON.parse(init.body);
      return new Response(JSON.stringify(geminiPayload('ok')), { status: 200 });
    });
    const env = { GEMINI_API_KEY: 'k', TOKEN_KV: kv };
    await handleGeminiChat(
      env,
      '',
      [
        { role: 'user', content: 'hi1' },
        { role: 'assistant', content: 'm1' },
        { role: 'user', content: 'hi2' },
      ],
      { plan: 'pro', tokenId: 'tok-x' },
    );
    // The model message should now have parts[+1] with thoughtSignature
    const modelMsg = captured.contents.find((c) => c.role === 'model');
    expect(modelMsg).toBeDefined();
    expect(modelMsg.parts.some((p) => p.thoughtSignature === 'PREVSIG')).toBe(true);
  });

  it('should store new thoughtSignature in KV via ctx.waitUntil', async () => {
    const kv = makeKV();
    let waitUntilCalled = false;
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify(geminiPayload('ok', 'NEWSIG')), { status: 200 }),
    );
    const env = { GEMINI_API_KEY: 'k', TOKEN_KV: kv };
    const ctx = { waitUntil: (p) => { waitUntilCalled = true; return p; } };
    await handleGeminiChat(env, '', [{ role: 'user', content: 'hi' }], { plan: 'pro', tokenId: 'tok-y' }, null, undefined, ctx);
    expect(waitUntilCalled).toBe(true);
  });

  it('should serialise complex message content via JSON.stringify', async () => {
    let captured;
    globalThis.fetch = vi.fn(async (_url, init) => {
      captured = JSON.parse(init.body);
      return new Response(JSON.stringify(geminiPayload('ok')), { status: 200 });
    });
    const env = { GEMINI_API_KEY: 'k', TOKEN_KV: makeKV() };
    await handleGeminiChat(env, '', [{ role: 'user', content: { tool_call: 'x' } }], { plan: 'pro' });
    expect(captured.contents[0].parts[0].text).toContain('tool_call');
  });
});
