import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  jsonRes,
  generateId,
  getMonthKey,
  getMonthEndTtl,
  getDayKey,
  safeCompare,
} from '../../src/utils/helpers.js';

// ════════════════════════════════════════════════════════════════
// jsonRes() — Response wrapper
// ════════════════════════════════════════════════════════════════

describe('jsonRes', () => {
  it('should return Response with default status 200 when no status passed', async () => {
    const res = jsonRes({ ok: true });
    expect(res).toBeInstanceOf(Response);
    expect(res.status).toBe(200);
  });

  it('should set Content-Type to application/json', () => {
    const res = jsonRes({ msg: 'hello' });
    expect(res.headers.get('Content-Type')).toBe('application/json');
  });

  it('should serialize body as JSON string', async () => {
    const res = jsonRes({ a: 1, b: 'two' });
    const body = await res.text();
    expect(body).toBe(JSON.stringify({ a: 1, b: 'two' }));
  });

  it('should accept custom status code', () => {
    expect(jsonRes({ error: 'boom' }, 500).status).toBe(500);
    expect(jsonRes({ error: 'unauthorized' }, 401).status).toBe(401);
  });

  it('should merge extra headers without losing Content-Type', () => {
    const res = jsonRes({ ok: true }, 200, { 'X-Custom': 'foo', 'X-Trace': 'bar' });
    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(res.headers.get('X-Custom')).toBe('foo');
    expect(res.headers.get('X-Trace')).toBe('bar');
  });

  it('should allow overriding Content-Type via extraHeaders', () => {
    const res = jsonRes({ ok: true }, 200, { 'Content-Type': 'text/plain' });
    expect(res.headers.get('Content-Type')).toBe('text/plain');
  });

  it('should handle null and arrays as data', async () => {
    expect(await jsonRes(null).text()).toBe('null');
    expect(await jsonRes([1, 2]).text()).toBe('[1,2]');
  });
});

// ════════════════════════════════════════════════════════════════
// generateId() — random id generator
// ════════════════════════════════════════════════════════════════

describe('generateId', () => {
  it('should produce string of default length 24 when no arg', () => {
    expect(generateId()).toHaveLength(24);
  });

  it('should produce string of requested length when arg passed', () => {
    expect(generateId(10)).toHaveLength(10);
    expect(generateId(40)).toHaveLength(40);
    expect(generateId(1)).toHaveLength(1);
  });

  it('should use only alphanumeric characters', () => {
    const id = generateId(100);
    expect(id).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('should produce different ids on each invocation (collision resistance)', () => {
    const ids = new Set();
    for (let i = 0; i < 50; i++) ids.add(generateId());
    expect(ids.size).toBe(50);
  });

  it('should produce empty string when length is 0', () => {
    expect(generateId(0)).toBe('');
  });
});

// ════════════════════════════════════════════════════════════════
// getMonthKey() — YYYY-MM (UTC)
// ════════════════════════════════════════════════════════════════

describe('getMonthKey', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return YYYY-MM format', () => {
    expect(getMonthKey()).toMatch(/^\d{4}-\d{2}$/);
  });

  it('should pad single digit month with leading zero', () => {
    vi.setSystemTime(new Date(2026, 0, 15)); // Jan
    expect(getMonthKey()).toBe('2026-01');
  });

  it('should not pad two digit month', () => {
    vi.setSystemTime(new Date(2026, 11, 31)); // Dec
    expect(getMonthKey()).toBe('2026-12');
  });

  it('should handle month rollover correctly', () => {
    vi.setSystemTime(new Date(2026, 4, 1)); // May
    expect(getMonthKey()).toBe('2026-05');
  });
});

// ════════════════════════════════════════════════════════════════
// getMonthEndTtl() — seconds until end of month + 3 day buffer
// ════════════════════════════════════════════════════════════════

describe('getMonthEndTtl', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return positive number of seconds', () => {
    vi.setSystemTime(new Date(2026, 4, 15));
    expect(getMonthEndTtl()).toBeGreaterThan(0);
  });

  it('should include 3 day buffer (3 * 86400 = 259200s)', () => {
    vi.setSystemTime(new Date(2026, 4, 31, 23, 59, 59)); // Last second of May
    const ttl = getMonthEndTtl();
    // approx 1 sec to month end + 259200 buffer
    expect(ttl).toBeGreaterThanOrEqual(259200);
    expect(ttl).toBeLessThan(259300);
  });

  it('should be larger near month start than near month end', () => {
    vi.setSystemTime(new Date(2026, 4, 1));
    const start = getMonthEndTtl();
    vi.setSystemTime(new Date(2026, 4, 30));
    const end = getMonthEndTtl();
    expect(start).toBeGreaterThan(end);
  });
});

// ════════════════════════════════════════════════════════════════
// getDayKey() — YYYY-MM-DD with JST adjustment (+9h)
// ════════════════════════════════════════════════════════════════

describe('getDayKey', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return YYYY-MM-DD format', () => {
    expect(getDayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should apply +9 hour JST offset (UTC midnight crosses to JST 09:00 same day)', () => {
    // 2026-05-01T00:00:00Z = JST 2026-05-01T09:00 → key 2026-05-01
    vi.setSystemTime(new Date('2026-05-01T00:00:00Z'));
    expect(getDayKey()).toBe('2026-05-01');
  });

  it('should rollover at JST midnight (UTC 15:00 prev day)', () => {
    // 2026-05-01T15:00:00Z = JST 2026-05-02T00:00 → key 2026-05-02
    vi.setSystemTime(new Date('2026-05-01T15:00:00Z'));
    expect(getDayKey()).toBe('2026-05-02');
  });

  it('should not rollover at UTC midnight if before 15:00 UTC', () => {
    vi.setSystemTime(new Date('2026-05-01T14:59:59Z'));
    expect(getDayKey()).toBe('2026-05-01');
  });
});

// ════════════════════════════════════════════════════════════════
// safeCompare() — HMAC-based timing-safe comparison
// ════════════════════════════════════════════════════════════════

describe('safeCompare', () => {
  it('should return true for two identical strings', async () => {
    expect(await safeCompare('hello', 'hello')).toBe(true);
    expect(await safeCompare('SECRET_TOKEN_123', 'SECRET_TOKEN_123')).toBe(true);
  });

  it('should return false for different strings of same length', async () => {
    expect(await safeCompare('hello', 'world')).toBe(false);
    expect(await safeCompare('abc12', 'abc34')).toBe(false);
  });

  it('should return false for different strings of different length', async () => {
    expect(await safeCompare('short', 'longer-string')).toBe(false);
    expect(await safeCompare('a', 'aaa')).toBe(false);
  });

  it('should throw DataError when comparing two empty strings (HMAC zero-length key)', async () => {
    // Documents that safeCompare propagates the underlying crypto.subtle DataError
    // when called with zero-length input. Callers must not pass empty strings.
    await expect(safeCompare('', '')).rejects.toThrow();
  });

  it('should throw DataError when one side is empty (HMAC zero-length key)', async () => {
    await expect(safeCompare('', 'x')).rejects.toThrow();
  });

  it('should handle unicode without throwing', async () => {
    expect(await safeCompare('日本語', '日本語')).toBe(true);
    expect(await safeCompare('日本語', '中国語')).toBe(false);
  });

  it('should be deterministic across repeated calls', async () => {
    const a = await safeCompare('xx', 'yy');
    const b = await safeCompare('xx', 'yy');
    expect(a).toBe(b);
  });
});
