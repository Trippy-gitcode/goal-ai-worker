import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  supabaseHeaders,
  supabaseQuery,
  syncUserToSupabase,
  saveChatMessage,
  syncUsageToSupabase,
  saveDeepAnalysis,
} from '../../src/utils/supabase.js';

// ════════════════════════════════════════════════════════════════
// supabaseHeaders() — pure helper
// ════════════════════════════════════════════════════════════════

describe('supabaseHeaders', () => {
  it('should produce apikey + Authorization Bearer + Content-Type', () => {
    const h = supabaseHeaders({ SUPABASE_SERVICE_KEY: 'TESTKEY' });
    expect(h.apikey).toBe('TESTKEY');
    expect(h.Authorization).toBe('Bearer TESTKEY');
    expect(h['Content-Type']).toBe('application/json');
    expect(h.Prefer).toBe('return=representation');
  });

  it('should pass through undefined service key (defensive)', () => {
    const h = supabaseHeaders({});
    expect(h.apikey).toBeUndefined();
    expect(h.Authorization).toBe('Bearer undefined');
  });
});

// ════════════════════════════════════════════════════════════════
// supabaseQuery() — fetch wrapper
// ════════════════════════════════════════════════════════════════

describe('supabaseQuery', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockFetch(body, opts = {}) {
    const status = opts.status || 200;
    globalThis.fetch = vi.fn(async (url, init) => {
      mockFetch.calls.push({ url, init });
      return new Response(JSON.stringify(body), { status });
    });
    mockFetch.calls = [];
  }

  it('should construct URL from base + table for GET', async () => {
    mockFetch([{ id: 1 }]);
    await supabaseQuery({ SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'k' }, 'users', 'GET');
    expect(mockFetch.calls[0].url).toBe('https://s.test/rest/v1/users');
    expect(mockFetch.calls[0].init.method).toBe('GET');
  });

  it('should append filters as query string', async () => {
    mockFetch([]);
    await supabaseQuery({ SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'k' }, 'users', 'GET', {
      filters: 'token_id=eq.abc',
    });
    expect(mockFetch.calls[0].url).toContain('?token_id=eq.abc');
  });

  it('should append select param via select=', async () => {
    mockFetch([]);
    await supabaseQuery({ SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'k' }, 'users', 'GET', {
      select: 'id,plan',
    });
    expect(mockFetch.calls[0].url).toContain('select=id,plan');
  });

  it('should join filters + params + select with &', async () => {
    mockFetch([]);
    await supabaseQuery({ SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'k' }, 'users', 'GET', {
      filters: 'a=eq.1',
      params: 'b=eq.2',
      select: 'id',
    });
    const url = mockFetch.calls[0].url;
    expect(url).toContain('a=eq.1');
    expect(url).toContain('b=eq.2');
    expect(url).toContain('select=id');
  });

  it('should serialise body as JSON for POST', async () => {
    mockFetch([{ id: 'new' }]);
    await supabaseQuery({ SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'k' }, 'users', 'POST', {
      body: { name: 'alice' },
    });
    expect(mockFetch.calls[0].init.body).toBe(JSON.stringify({ name: 'alice' }));
    expect(mockFetch.calls[0].init.headers.Prefer).toContain('merge-duplicates');
  });

  it('should not attach body for GET even if provided', async () => {
    mockFetch([]);
    await supabaseQuery({ SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'k' }, 'users', 'GET', {
      body: { ignored: true },
    });
    expect(mockFetch.calls[0].init.body).toBeUndefined();
  });

  it('should attach body for PATCH', async () => {
    mockFetch([{ id: 1 }]);
    await supabaseQuery({ SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'k' }, 'users', 'PATCH', {
      body: { plan: 'pro' },
    });
    expect(mockFetch.calls[0].init.body).toBe(JSON.stringify({ plan: 'pro' }));
  });

  it('should return null on non-OK response', async () => {
    mockFetch({ error: 'boom' }, { status: 500 });
    const r = await supabaseQuery({ SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'k' }, 'users', 'GET');
    expect(r).toBeNull();
  });

  it('should return parsed JSON on success', async () => {
    mockFetch([{ id: 7, name: 'x' }]);
    const r = await supabaseQuery({ SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'k' }, 'users', 'GET');
    expect(r).toEqual([{ id: 7, name: 'x' }]);
  });

  it('should handle empty body (return null)', async () => {
    globalThis.fetch = vi.fn(async () => new Response('', { status: 200 }));
    const r = await supabaseQuery({ SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'k' }, 'users', 'DELETE');
    expect(r).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════
// syncUserToSupabase / saveChatMessage / syncUsageToSupabase / saveDeepAnalysis
// ════════════════════════════════════════════════════════════════

describe('syncUserToSupabase', () => {
  let originalFetch;
  let calls;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
    calls = [];
    globalThis.fetch = vi.fn(async (url, init) => {
      calls.push({ url: String(url), method: init?.method, body: init?.body });
      return new Response('[]', { status: 200 });
    });
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should POST to /users with token_id and plan', async () => {
    await syncUserToSupabase(
      { SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'k' },
      { tokenId: 't1', userId: 't1', plan: 'pro' },
    );
    expect(calls[0].url).toContain('/rest/v1/users');
    expect(calls[0].method).toBe('POST');
    const body = JSON.parse(calls[0].body);
    expect(body.token_id).toBe('t1');
    expect(body.plan).toBe('pro');
    expect(body.device_id).toBeNull(); // userId === tokenId
  });

  it('should set device_id when userId differs from tokenId', async () => {
    await syncUserToSupabase(
      { SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'k' },
      { tokenId: 't1', userId: 'different-device', plan: 'free' },
    );
    const body = JSON.parse(calls[0].body);
    expect(body.device_id).toBe('different-device');
  });

  it('should swallow errors silently', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('net'); });
    await expect(
      syncUserToSupabase({ SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'k' }, { tokenId: 't', plan: 'free' }),
    ).resolves.toBeUndefined();
  });
});

describe('saveChatMessage', () => {
  let originalFetch;
  let calls;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
    calls = [];
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should no-op when user lookup returns empty', async () => {
    globalThis.fetch = vi.fn(async (url, init) => {
      calls.push({ url: String(url), method: init?.method });
      // Return empty user list
      return new Response('[]', { status: 200 });
    });
    await saveChatMessage(
      { SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'k' },
      'token-x',
      'user',
      'hello',
      'gpt-5',
      null,
      'chat',
    );
    // 1 fetch (GET users), no chat insert
    expect(calls).toHaveLength(1);
  });

  it('should POST chat_messages when user found', async () => {
    let stage = 0;
    globalThis.fetch = vi.fn(async (url, init) => {
      calls.push({ url: String(url), method: init?.method, body: init?.body });
      if (stage++ === 0) return new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 });
      return new Response('[]', { status: 200 });
    });
    await saveChatMessage(
      { SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'k' },
      'tok',
      'user',
      'hello',
      'gpt-5',
      'goal-1',
      'chat',
    );
    expect(calls).toHaveLength(2);
    expect(calls[1].url).toContain('chat_messages');
    expect(calls[1].method).toBe('POST');
    const body = JSON.parse(calls[1].body);
    expect(body.user_id).toBe('u1');
    expect(body.content).toBe('hello');
    expect(body.goal_id).toBe('goal-1');
  });

  it('should truncate content to 50000 chars', async () => {
    let stage = 0;
    globalThis.fetch = vi.fn(async (url, init) => {
      calls.push({ url: String(url), body: init?.body });
      if (stage++ === 0) return new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 });
      return new Response('[]', { status: 200 });
    });
    const big = 'x'.repeat(99999);
    await saveChatMessage(
      { SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'k' },
      'tok',
      'user',
      big,
      'gpt-5',
      null,
      'chat',
    );
    const body = JSON.parse(calls[1].body);
    expect(body.content.length).toBe(50000);
  });

  it('should swallow exceptions', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('boom'); });
    await expect(
      saveChatMessage({ SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'k' }, 't', 'user', 'x', 'm', null, 'c'),
    ).resolves.toBeUndefined();
  });
});

describe('syncUsageToSupabase', () => {
  let calls;
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    calls = [];
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should no-op when user not found', async () => {
    globalThis.fetch = vi.fn(async () => new Response('[]', { status: 200 }));
    await expect(
      syncUsageToSupabase({ SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'k' }, 't1', '2026-05', 1, 1),
    ).resolves.toBeUndefined();
  });

  it('should upsert usage_tracking on success', async () => {
    let stage = 0;
    globalThis.fetch = vi.fn(async (url, init) => {
      calls.push({ url: String(url), body: init?.body });
      if (stage++ === 0) return new Response(JSON.stringify([{ id: 'uid' }]), { status: 200 });
      return new Response('[]', { status: 200 });
    });
    await syncUsageToSupabase({ SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'k' }, 'tok', '2026-05', 7, 12);
    expect(calls[1].url).toContain('usage_tracking');
    const body = JSON.parse(calls[1].body);
    expect(body.deep_count).toBe(7);
    expect(body.chat_count).toBe(12);
  });
});

describe('saveDeepAnalysis', () => {
  let calls;
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    calls = [];
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should POST deep_analyses payload with correct fields', async () => {
    let stage = 0;
    globalThis.fetch = vi.fn(async (url, init) => {
      calls.push({ url: String(url), body: init?.body });
      if (stage++ === 0) return new Response(JSON.stringify([{ id: 'uid' }]), { status: 200 });
      return new Response('[]', { status: 200 });
    });
    await saveDeepAnalysis(
      { SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'k' },
      'tok',
      'reflect',
      { goalId: 'g', input: 'in', gpt: 'g-result', claude: 'c-result', gemini: 'gem', final: 'final' },
    );
    const body = JSON.parse(calls[1].body);
    expect(body.analysis_type).toBe('reflect');
    expect(body.input_text).toBe('in');
    expect(body.gpt_result).toBe('g-result');
    expect(body.claude_result).toBe('c-result');
    expect(body.gemini_result).toBe('gem');
    expect(body.final_result).toBe('final');
  });

  it('should swallow errors', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('net'); });
    await expect(
      saveDeepAnalysis({ SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'k' }, 't', 'r', {}),
    ).resolves.toBeUndefined();
  });
});
