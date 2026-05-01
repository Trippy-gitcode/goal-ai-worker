import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { updateStreak } from '../../src/utils/streak.js';

// ════════════════════════════════════════════════════════════════
// updateStreak() — JST-aware streak incrementer (uses fetch + Supabase)
// ════════════════════════════════════════════════════════════════

describe('updateStreak', () => {
  let originalFetch;
  let calls;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    calls = [];
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T03:00:00Z')); // JST 2026-05-01 12:00
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  function mockFetch(getResponse) {
    globalThis.fetch = vi.fn(async (url, init) => {
      calls.push({ url: String(url), method: init?.method || 'GET', body: init?.body });
      if (init?.method === 'PATCH') {
        return new Response(null, { status: 204 });
      }
      return new Response(JSON.stringify(getResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
  }

  it('should silently no-op when user does not exist (empty array)', async () => {
    mockFetch([]);
    await updateStreak('tok-x', 'https://supa.test', 'k');
    // Only 1 fetch (the GET); no PATCH because the user array was empty
    expect(calls.length).toBe(1);
    expect(calls[0].method).toBe('GET');
  });

  it('should no-op when last_active_date equals today (already counted)', async () => {
    mockFetch([{ streak_count: 7, streak_best: 10, last_active_date: '2026-05-01' }]);
    await updateStreak('tok-y', 'https://supa.test', 'k');
    // Only the GET, no PATCH
    expect(calls.length).toBe(1);
    expect(calls[0].method).toBe('GET');
  });

  it('should increment streak when last_active_date is yesterday (JST)', async () => {
    mockFetch([{ streak_count: 4, streak_best: 5, last_active_date: '2026-04-30' }]);
    await updateStreak('tok-z', 'https://supa.test', 'k');
    expect(calls.length).toBe(2);
    const patch = calls.find((c) => c.method === 'PATCH');
    const body = JSON.parse(patch.body);
    expect(body.streak_count).toBe(5);
    expect(body.streak_best).toBe(5);
    expect(body.last_active_date).toBe('2026-05-01');
  });

  it('should reset streak to 1 when last_active_date is older than yesterday', async () => {
    mockFetch([{ streak_count: 12, streak_best: 30, last_active_date: '2026-04-25' }]);
    await updateStreak('tok-r', 'https://supa.test', 'k');
    const patch = calls.find((c) => c.method === 'PATCH');
    const body = JSON.parse(patch.body);
    expect(body.streak_count).toBe(1);
    expect(body.streak_best).toBe(30); // best preserved
  });

  it('should bump streak_best when current streak surpasses it', async () => {
    mockFetch([{ streak_count: 9, streak_best: 9, last_active_date: '2026-04-30' }]);
    await updateStreak('tok-best', 'https://supa.test', 'k');
    const patch = calls.find((c) => c.method === 'PATCH');
    const body = JSON.parse(patch.body);
    expect(body.streak_count).toBe(10);
    expect(body.streak_best).toBe(10);
  });

  it('should swallow errors silently when fetch throws', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('network down');
    });
    // updateStreak swallows in try/catch — must not throw
    await expect(updateStreak('tok-err', 'https://supa.test', 'k')).resolves.toBeUndefined();
  });

  it('should encode tokenId in URL (path-injection safety)', async () => {
    mockFetch([]);
    await updateStreak('tok with space&', 'https://supa.test', 'k');
    expect(calls[0].url).toContain('tok%20with%20space%26');
  });

  it('should treat null streak_count as starting from 0 → first increment = 1', async () => {
    mockFetch([{ streak_count: null, streak_best: null, last_active_date: '2026-04-30' }]);
    await updateStreak('tok-null', 'https://supa.test', 'k');
    const patch = calls.find((c) => c.method === 'PATCH');
    const body = JSON.parse(patch.body);
    expect(body.streak_count).toBe(1);
    expect(body.streak_best).toBe(1);
  });
});
