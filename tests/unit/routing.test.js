import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { quickRoute, callRoutingAPI } from '../../src/services/ai/routing.js';

// ════════════════════════════════════════════════════════════════
// quickRoute() — pre-LLM regex fast path
// ════════════════════════════════════════════════════════════════

describe('quickRoute', () => {
  it('should return gpt-simple for short affirmation tokens', () => {
    expect(quickRoute('うん')).toEqual({ route: 'gpt-simple', coaching: false });
    expect(quickRoute('ok')).toEqual({ route: 'gpt-simple', coaching: false });
    expect(quickRoute('ありがと')).toEqual({ route: 'gpt-simple', coaching: false });
    expect(quickRoute('なるほど')).toEqual({ route: 'gpt-simple', coaching: false });
  });

  it('should NOT return gpt-simple for short non-affirmation tokens', () => {
    // 15 chars limit + the word doesn't match the prefix list
    expect(quickRoute('abc')).toBeNull();
  });

  it('should route weather/news questions to gemini', () => {
    expect(quickRoute('天気')?.route).toBe('gemini');
    expect(quickRoute('今日の天気')?.route).toBe('gemini');
    expect(quickRoute('明日の天気')?.route).toBe('gemini');
    expect(quickRoute('ニュース')?.route).toBe('gemini');
    expect(quickRoute('検索して')?.route).toBe('gemini');
  });

  it('should route fact/geo lookups to gemini', () => {
    expect(quickRoute('時刻表を調べたい')?.route).toBe('gemini');
    expect(quickRoute('最寄り駅')?.route).toBe('gemini');
    expect(quickRoute('住所を知りたい')?.route).toBe('gemini');
  });

  it('should route translation/summary requests to gpt', () => {
    expect(quickRoute('翻訳して')?.route).toBe('gpt');
    expect(quickRoute('英語に直して')?.route).toBe('gpt');
    expect(quickRoute('要約して')?.route).toBe('gpt');
    expect(quickRoute('まとめて')?.route).toBe('gpt');
  });

  it('should route ideation prompts to gpt', () => {
    expect(quickRoute('アイディアちょうだい')?.route).toBe('gpt');
    expect(quickRoute('提案して')?.route).toBe('gpt');
    expect(quickRoute('比較してほしい')?.route).toBe('gpt');
  });

  it('should route task management prompts to gpt', () => {
    expect(quickRoute('今日やることを整理')?.route).toBe('gpt');
    expect(quickRoute('TODOリスト')?.route).toBe('gpt');
    expect(quickRoute('スケジュール組んで')?.route).toBe('gpt');
  });

  it('should return null when nothing matches (fall through to LLM router)', () => {
    expect(quickRoute('最近すごく落ち込んでいて、自分の人生について悩んでます')).toBeNull();
    expect(quickRoute('価値観って大事だと思うんだけどどう思う？人生において一番何を重視すべきだと思う？')).toBeNull();
  });

  it('should never return coaching=true for any quickRoute decision', () => {
    const inputs = ['天気', 'ok', '翻訳して', 'TODOリスト', 'アイディアちょうだい'];
    for (const i of inputs) {
      const r = quickRoute(i);
      if (r) expect(r.coaching).toBe(false);
    }
  });

  it('should be case insensitive for English affirmations', () => {
    expect(quickRoute('OK')?.route).toBe('gpt-simple');
    expect(quickRoute('Ok')?.route).toBe('gpt-simple');
  });
});

// ════════════════════════════════════════════════════════════════
// callRoutingAPI() — LLM fallback router (mock fetch)
// ════════════════════════════════════════════════════════════════

describe('callRoutingAPI', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockFetch(content) {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  }

  it('should accept claude when LLM returns "claude"', async () => {
    mockFetch('claude');
    const r = await callRoutingAPI({ OPENAI_API_KEY: 'k' }, { plan: 'pro' }, 'message');
    expect(r).toBe('claude');
  });

  it('should accept gemini when LLM returns "gemini"', async () => {
    mockFetch('gemini');
    expect(await callRoutingAPI({}, { plan: 'pro' }, 'message')).toBe('gemini');
  });

  it('should normalise punctuation/case from LLM ("GPT.")', async () => {
    mockFetch('GPT.');
    expect(await callRoutingAPI({}, { plan: 'pro' }, 'message')).toBe('gpt');
  });

  it('should accept gpt-simple as canonical', async () => {
    mockFetch(' gpt-simple ');
    expect(await callRoutingAPI({}, { plan: 'pro' }, 'message')).toBe('gpt-simple');
  });

  it('should default to gpt for unrecognised LLM output', async () => {
    mockFetch('mystery');
    expect(await callRoutingAPI({}, { plan: 'pro' }, 'message')).toBe('gpt');
  });

  it('should default to gpt when fetch throws (network error)', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('boom');
    });
    expect(await callRoutingAPI({}, { plan: 'pro' }, 'message')).toBe('gpt');
  });

  it('should truncate user message to 300 chars before sending', async () => {
    let captured;
    globalThis.fetch = vi.fn(async (_url, init) => {
      captured = JSON.parse(init.body);
      return new Response(JSON.stringify({ choices: [{ message: { content: 'gpt' } }] }));
    });
    const long = 'x'.repeat(1000);
    await callRoutingAPI({}, { plan: 'pro' }, long);
    const userMsg = captured.messages.find((m) => m.role === 'user');
    expect(userMsg.content.length).toBe(300);
  });
});
