import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getProfileWithCache, buildProfileBlock } from '../../src/services/profile.js';

// in-memory KV fake
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

describe('buildProfileBlock', () => {
  it('should return empty string when profile is null', () => {
    expect(buildProfileBlock(null, ['nickname'])).toBe('');
  });

  it('should produce nickname line when included', () => {
    const out = buildProfileBlock({ nickname: 'Alice' }, ['nickname']);
    expect(out).toBe('名前: Alice');
  });

  it('should join multiple lines with newline', () => {
    const out = buildProfileBlock(
      { nickname: 'A', occupation: 'Eng', age: 30 },
      ['nickname', 'occupation', 'age'],
    );
    expect(out).toContain('名前: A');
    expect(out).toContain('職種: Eng');
    expect(out).toContain('年齢: 30歳');
    expect(out.split('\n')).toHaveLength(3);
  });

  it('should skip undefined fields', () => {
    const out = buildProfileBlock({ nickname: 'A' }, ['nickname', 'occupation']);
    expect(out).toBe('名前: A');
  });

  it('should support all 9 known field keys', () => {
    const profile = {
      nickname: 'A',
      occupation: 'Eng',
      age: 25,
      mbti: 'INTJ',
      strengths: 'fast',
      weaknesses: 'tired',
      values: 'truth',
      vision: 'changeworld',
      constraints: 'time',
    };
    const out = buildProfileBlock(profile, [
      'nickname', 'occupation', 'age', 'mbti', 'strengths', 'weaknesses', 'values', 'vision', 'constraints',
    ]);
    expect(out).toContain('名前');
    expect(out).toContain('MBTI: INTJ');
    expect(out).toContain('強み: fast');
    expect(out).toContain('弱み: tired');
    expect(out).toContain('価値観: truth');
    expect(out).toContain('ビジョン: changeworld');
    expect(out).toContain('制約: time');
  });

  it('should ignore unknown field keys silently', () => {
    const out = buildProfileBlock({ nickname: 'A' }, ['nickname', 'unknown', 'foo']);
    expect(out).toBe('名前: A');
  });

  it('should skip falsy values (null/empty string)', () => {
    const out = buildProfileBlock({ nickname: '', occupation: 'Eng' }, ['nickname', 'occupation']);
    expect(out).toBe('職種: Eng');
  });
});

describe('getProfileWithCache', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should return cached profile when KV has cached entry', async () => {
    const kv = makeKV({ 'profile:tok-x': JSON.stringify({ nickname: 'Cached' }) });
    const env = { TOKEN_KV: kv, SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'k' };
    globalThis.fetch = vi.fn(); // should not be called
    const profile = await getProfileWithCache(env, 'tok-x');
    expect(profile.nickname).toBe('Cached');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('should return null when no user found in users table', async () => {
    const kv = makeKV();
    const env = { TOKEN_KV: kv, SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'k' };
    globalThis.fetch = vi.fn(async () => new Response('[]', { status: 200 }));
    const profile = await getProfileWithCache(env, 'tok-missing');
    expect(profile).toBeNull();
  });

  it('should fetch + return profile when not cached', async () => {
    const kv = makeKV();
    const env = { TOKEN_KV: kv, SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'k' };
    let stage = 0;
    globalThis.fetch = vi.fn(async () => {
      // 1st call: getUserIdFromToken (returns user id)
      // 2nd call: profile fetch
      if (stage++ === 0) return new Response(JSON.stringify([{ id: 'uid-1' }]), { status: 200 });
      return new Response(JSON.stringify([{ nickname: 'Bob', age: 28 }]), { status: 200 });
    });
    const profile = await getProfileWithCache(env, 'tok-y');
    expect(profile.nickname).toBe('Bob');
  });

  it('should cache profile with ctx.waitUntil', async () => {
    const kv = makeKV();
    const env = { TOKEN_KV: kv, SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'k' };
    let stage = 0;
    globalThis.fetch = vi.fn(async () => {
      if (stage++ === 0) return new Response(JSON.stringify([{ id: 'uid-1' }]), { status: 200 });
      return new Response(JSON.stringify([{ nickname: 'C' }]), { status: 200 });
    });
    const ctx = { waitUntil: vi.fn(p => p) };
    await getProfileWithCache(env, 'tok-z', ctx);
    // ctx.waitUntil was called with KV put promise
    expect(ctx.waitUntil).toHaveBeenCalled();
  });

  it('should not waitUntil when ctx is null', async () => {
    const kv = makeKV();
    const env = { TOKEN_KV: kv, SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'k' };
    let stage = 0;
    globalThis.fetch = vi.fn(async () => {
      if (stage++ === 0) return new Response(JSON.stringify([{ id: 'uid-1' }]), { status: 200 });
      return new Response(JSON.stringify([{ nickname: 'D' }]), { status: 200 });
    });
    // no ctx — must not throw
    const result = await getProfileWithCache(env, 'tok-w');
    expect(result.nickname).toBe('D');
  });
});
