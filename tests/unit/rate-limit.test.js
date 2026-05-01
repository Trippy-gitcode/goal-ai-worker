import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkRateLimit,
  checkDeepUsage,
  incrementDeepUsage,
  checkDailyChatUsage,
  incrementDailyChatUsage,
  getEffectiveModel,
  canUseModel,
  checkFairUse,
} from '../../src/utils/rate-limit.js';

// In-memory KV fake matching the surface used by rate-limit.js KV fallback path
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

// Build env with Supabase **disabled** so KV fallback path is exercised
function makeEnv() {
  return { TOKEN_KV: makeKV() };
}

// ════════════════════════════════════════════════════════════════
// checkRateLimit() — Per-window rolling limit
// ════════════════════════════════════════════════════════════════

describe('checkRateLimit', () => {
  it('should return ok=true and remaining < max on first call', async () => {
    const env = makeEnv();
    const r = await checkRateLimit(env, 'user-1');
    expect(r.ok).toBe(true);
    expect(r.remaining).toBeGreaterThanOrEqual(0);
    expect(r.remaining).toBeLessThan(30); // RATE_LIMIT_MAX = 30
  });

  it('should decrement remaining count on repeated calls within same window', async () => {
    const env = makeEnv();
    const r1 = await checkRateLimit(env, 'user-2');
    const r2 = await checkRateLimit(env, 'user-2');
    expect(r2.remaining).toBeLessThan(r1.remaining);
  });

  it('should reject (ok=false) once max requests exceeded', async () => {
    const env = makeEnv();
    let last;
    for (let i = 0; i < 35; i++) last = await checkRateLimit(env, 'user-3');
    expect(last.ok).toBe(false);
    expect(last.remaining).toBe(0);
  });

  it('should track different users in independent counters', async () => {
    const env = makeEnv();
    for (let i = 0; i < 5; i++) await checkRateLimit(env, 'user-A');
    const otherFirst = await checkRateLimit(env, 'user-B');
    // user-B is fresh, remaining should be near max-1
    expect(otherFirst.remaining).toBeGreaterThan(25);
  });
});

// ════════════════════════════════════════════════════════════════
// checkDeepUsage() / incrementDeepUsage() — monthly per-plan
// ════════════════════════════════════════════════════════════════

describe('checkDeepUsage', () => {
  it('should return free plan limit 3 with used 0 initially', async () => {
    const env = makeEnv();
    const r = await checkDeepUsage(env, 'u', 'free');
    expect(r.limit).toBe(3);
    expect(r.used).toBe(0);
    expect(r.remaining).toBe(3);
  });

  it('should reflect increments via incrementDeepUsage', async () => {
    const env = makeEnv();
    await incrementDeepUsage(env, 'u');
    await incrementDeepUsage(env, 'u');
    const r = await checkDeepUsage(env, 'u', 'free');
    expect(r.used).toBe(2);
    expect(r.remaining).toBe(1);
  });

  it('should clamp remaining at 0 when used exceeds limit', async () => {
    const env = makeEnv();
    for (let i = 0; i < 10; i++) await incrementDeepUsage(env, 'u');
    const r = await checkDeepUsage(env, 'u', 'free');
    expect(r.remaining).toBe(0);
  });

  it('should fall back to free limit if plan key is unknown', async () => {
    const env = makeEnv();
    const r = await checkDeepUsage(env, 'u', 'nonexistent');
    expect(r.limit).toBe(3); // PLAN_LIMITS.free.deep
  });

  it('should return high limit (99999) for max/ultra plans (Infinity → 99999)', async () => {
    const env = makeEnv();
    const max = await checkDeepUsage(env, 'u', 'max');
    expect(max.limit).toBe(99999);
    const ultra = await checkDeepUsage(env, 'u2', 'ultra');
    expect(ultra.limit).toBe(99999);
  });
});

// ════════════════════════════════════════════════════════════════
// checkDailyChatUsage() / incrementDailyChatUsage()
// ════════════════════════════════════════════════════════════════

describe('checkDailyChatUsage', () => {
  it('should return free plan limit 20 initially with ok=true', async () => {
    const env = makeEnv();
    const r = await checkDailyChatUsage(env, 'u', 'free');
    expect(r.limit).toBe(20);
    expect(r.used).toBe(0);
    expect(r.ok).toBe(true);
  });

  it('should treat paid plan (limit 9999) as effectively unlimited', async () => {
    const env = makeEnv();
    const r = await checkDailyChatUsage(env, 'u', 'pro');
    expect(r.ok).toBe(true);
    expect(r.remaining).toBe(9999);
  });

  it('should reject free user once 20 chats used', async () => {
    const env = makeEnv();
    for (let i = 0; i < 20; i++) await incrementDailyChatUsage(env, 'u');
    const r = await checkDailyChatUsage(env, 'u', 'free');
    expect(r.ok).toBe(false);
    expect(r.remaining).toBe(0);
  });

  it('should still allow when used is just below limit', async () => {
    const env = makeEnv();
    for (let i = 0; i < 19; i++) await incrementDailyChatUsage(env, 'u');
    const r = await checkDailyChatUsage(env, 'u', 'free');
    expect(r.ok).toBe(true);
    expect(r.remaining).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════════
// getEffectiveModel() — fallback decision for free plan
// ════════════════════════════════════════════════════════════════

describe('getEffectiveModel', () => {
  it('should return null for non-free plans regardless of usage', () => {
    expect(getEffectiveModel('pro', 'claude', 100)).toBe(null);
    expect(getEffectiveModel('max', 'gpt', 999)).toBe(null);
  });

  it('should return null when free user is under category limit', () => {
    expect(getEffectiveModel('free', 'claude', 0)).toBe(null);
    expect(getEffectiveModel('free', 'gpt', 5)).toBe(null);
  });

  it('should return fallback object when free user hits claude limit (5)', () => {
    const r = getEffectiveModel('free', 'claude', 5);
    expect(r).toBeDefined();
    expect(r.fallback).toBe(true);
    expect(typeof r.resetHour).toBe('number');
    expect(r.resetHour).toBeGreaterThan(0);
  });

  it('should return fallback object when free user hits gpt limit (10)', () => {
    const r = getEffectiveModel('free', 'gpt', 10);
    expect(r).toBeDefined();
    expect(r.fallback).toBe(true);
  });

  it('should treat undefined used as 0 (no fallback triggered)', () => {
    expect(getEffectiveModel('free', 'claude', undefined)).toBe(null);
  });

  it('should default unknown category to limit 5', () => {
    expect(getEffectiveModel('free', 'mystery', 4)).toBe(null);
    expect(getEffectiveModel('free', 'mystery', 5)).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════════
// canUseModel() — per-plan model gate
// ════════════════════════════════════════════════════════════════

describe('canUseModel', () => {
  it('should always allow non-free plans (large remaining)', async () => {
    const env = makeEnv();
    const r = await canUseModel('u', 'pro', 'claude', env);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(9999);
  });

  it('should allow free user when limit not reached', async () => {
    const env = makeEnv();
    const r = await canUseModel('u', 'free', 'claude', env);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBeGreaterThan(0);
  });

  it('should treat unknown model as unlimited for free', async () => {
    const env = makeEnv();
    const r = await canUseModel('u', 'free', 'mystery_unknown', env);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(9999);
  });
});

// ════════════════════════════════════════════════════════════════
// checkFairUse() — hourly + weekly throttle
// ════════════════════════════════════════════════════════════════

describe('checkFairUse', () => {
  it('should not throttle on first call', async () => {
    const env = makeEnv();
    const r = await checkFairUse(env, 'u-fair-1');
    expect(r.throttle).toBe(false);
    expect(r.delayMs).toBe(0);
  });

  it('should throttle once hourly limit (30) exceeded', async () => {
    const env = makeEnv();
    let last;
    for (let i = 0; i < 35; i++) last = await checkFairUse(env, 'u-fair-2');
    expect(last.throttle).toBe(true);
    expect(last.delayMs).toBe(7000);
  });
});
