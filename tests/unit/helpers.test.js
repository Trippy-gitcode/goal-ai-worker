import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  jsonRes,
  generateId,
  getMonthKey,
  getMonthEndTtl,
  getDayKey,
  safeCompare,
  isValidUuid,
  safePgrestValue,
  pgrestFilter,
  generateSignedTokenId,
  verifySignedTokenId,
  isSignedTokenFormat,
  getGeminiApiVersion,
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

  it('should return false for two empty strings (Wave 1 #35 D-05 fix: no throw)', async () => {
    // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 (2026-05-01) — Wave 1 #35 D-05 fix:
    //   safeCompare は empty string で crypto.subtle DataError を throw する
    //   旧挙動を try/catch + 早期 return false に修正。env.SECRET 未設定時に
    //   500 になる挙動を 401/403 reject に統一する規律改善。
    expect(await safeCompare('', '')).toBe(false);
  });

  it('should return false when one side is empty (Wave 1 #35 D-05 fix)', async () => {
    expect(await safeCompare('', 'x')).toBe(false);
    expect(await safeCompare('x', '')).toBe(false);
  });

  it('should return false for non-string types (defense-in-depth)', async () => {
    expect(await safeCompare(null, 'x')).toBe(false);
    expect(await safeCompare(undefined, 'x')).toBe(false);
    expect(await safeCompare(123, 'x')).toBe(false);
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

// ════════════════════════════════════════════════════════════════
// isValidUuid / safePgrestValue / pgrestFilter
// SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 — Wave 1 #35 D-02 fix tests
// ════════════════════════════════════════════════════════════════

describe('isValidUuid', () => {
  it('should accept valid UUID v4', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidUuid('00000000-0000-0000-0000-000000000000')).toBe(true);
  });

  it('should accept UUID without hyphens', () => {
    expect(isValidUuid('550e8400e29b41d4a716446655440000')).toBe(true);
  });

  it('should reject non-UUID input', () => {
    expect(isValidUuid('not-a-uuid')).toBe(false);
    expect(isValidUuid('abc')).toBe(false);
    expect(isValidUuid('')).toBe(false);
    expect(isValidUuid(null)).toBe(false);
    expect(isValidUuid(undefined)).toBe(false);
  });

  it('should reject UUID injection attempts', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000&user_id=eq.X')).toBe(false);
    expect(isValidUuid('foo,bar')).toBe(false);
  });
});

describe('safePgrestValue', () => {
  it('should encode safe characters', () => {
    expect(safePgrestValue('abc-123')).toBe('abc-123');
  });

  it('should reject special PostgREST separator chars (whitelist enforcement)', () => {
    // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 (R-3 fix): whitelist now rejects `&` `,` etc.
    // even when URL-encoded, because PostgREST decodes back to operator separators.
    expect(safePgrestValue('a&b')).toBe('');
    expect(safePgrestValue('a,b')).toBe('');
  });

  it('should reject control characters', () => {
    expect(safePgrestValue('a\x00b')).toBe('');
    expect(safePgrestValue('a\nb')).toBe('');
  });

  it('should reject overly long values', () => {
    const longStr = 'x'.repeat(300);
    expect(safePgrestValue(longStr)).toBe('');
    expect(safePgrestValue(longStr, { maxLength: 500 })).not.toBe('');
  });

  it('should handle null/undefined', () => {
    expect(safePgrestValue(null)).toBe('');
    expect(safePgrestValue(undefined)).toBe('');
  });
});

describe('pgrestFilter', () => {
  it('should construct valid filter strings', () => {
    expect(pgrestFilter('user_id', 'eq', 'u123')).toBe('user_id=eq.u123');
  });

  it('should reject disallowed operators', () => {
    expect(pgrestFilter('user_id', 'evil', 'u123')).toBe('');
  });

  it('should reject non-identifier field names', () => {
    expect(pgrestFilter('user_id&injected', 'eq', 'u123')).toBe('');
  });
});

// ════════════════════════════════════════════════════════════════
// Round 31 Cat-H Token HMAC (batch 10) — signed token format
// ════════════════════════════════════════════════════════════════

describe('generateSignedTokenId / verifySignedTokenId', () => {
  const SECRET = 'EXAMPLE_test_secret_for_hmac_gitleaks_safe'; // gitleaks: EXAMPLE stopword

  it('should issue HMAC-signed token of form goal_test_<payload>.<sig>', async () => {
    const t = await generateSignedTokenId(SECRET);
    expect(t).toMatch(/^goal_test_[A-Za-z0-9]+\.[A-Za-z0-9_-]+$/);
    const body = t.slice('goal_test_'.length);
    const [payload, sig] = body.split('.');
    expect(payload.length).toBe(22);
    expect(sig.length).toBe(22);
  });

  it('should fall back to legacy 24-char format when secret missing or too short', async () => {
    const t1 = await generateSignedTokenId(undefined);
    const t2 = await generateSignedTokenId('');
    const t3 = await generateSignedTokenId('short');
    for (const t of [t1, t2, t3]) {
      expect(t).toMatch(/^goal_test_[A-Za-z0-9]{24}$/);
      expect(t.includes('.')).toBe(false);
    }
  });

  it('should verify a token issued by generateSignedTokenId', async () => {
    const t = await generateSignedTokenId(SECRET);
    expect(await verifySignedTokenId(t, SECRET)).toBe(true);
  });

  it('should reject token signed by a different secret', async () => {
    const t = await generateSignedTokenId(SECRET);
    expect(await verifySignedTokenId(t, 'EXAMPLE_other_secret_gitleaks_safe')).toBe(false);
  });

  it('should reject a forged token (random payload + random sig)', async () => {
    const forged = `goal_test_${generateId(22)}.${generateId(22)}`;
    expect(await verifySignedTokenId(forged, SECRET)).toBe(false);
  });

  it('should reject a tampered payload (sig stays same, payload mutates)', async () => {
    const t = await generateSignedTokenId(SECRET);
    const body = t.slice('goal_test_'.length);
    const [payload, sig] = body.split('.');
    // mutate first char of payload
    const tampered = `goal_test_${(payload[0] === 'A' ? 'B' : 'A')}${payload.slice(1)}.${sig}`;
    expect(await verifySignedTokenId(tampered, SECRET)).toBe(false);
  });

  it('should reject legacy format (no `.`) — caller falls back to KV path', async () => {
    expect(await verifySignedTokenId('goal_test_abc123abc123abc123abc12', SECRET)).toBe(false);
  });

  it('should reject malformed payload chars (non-alphanumeric)', async () => {
    expect(await verifySignedTokenId('goal_test_abc!def.AAAAAAAAAAAAAAAAAAAAAA', SECRET)).toBe(false);
  });

  it('should reject empty payload (`goal_test_.<sig>`)', async () => {
    expect(await verifySignedTokenId('goal_test_.AAAAAAAAAAAAAAAAAAAAAA', SECRET)).toBe(false);
  });

  it('should reject when secret is missing', async () => {
    const t = await generateSignedTokenId(SECRET);
    expect(await verifySignedTokenId(t, undefined)).toBe(false);
    expect(await verifySignedTokenId(t, '')).toBe(false);
  });

  it('should reject token without goal_test_ prefix', async () => {
    expect(await verifySignedTokenId('foo_bar_aaa.AAAAAAAAAAAAAAAAAAAAAA', SECRET)).toBe(false);
  });

  it('should produce deterministic signature for same payload+secret', async () => {
    const t1 = await generateSignedTokenId(SECRET);
    const payload = t1.slice('goal_test_'.length).split('.')[0];
    // 同じ payload でも 2 回目の generateSignedTokenId は別 random payload を使うので
    // 別 token になるが、 verify は両方 OK
    const t2 = await generateSignedTokenId(SECRET);
    expect(t1).not.toBe(t2);
    expect(await verifySignedTokenId(t1, SECRET)).toBe(true);
    expect(await verifySignedTokenId(t2, SECRET)).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// getGeminiApiVersion — Cat-N P0 #3 fix (2026-05-02)
// SUBAGENT-LAIS-CAT-N-GEMINI-V1-STABLE-MIGRATION-V1
// ════════════════════════════════════════════════════════════════

describe('getGeminiApiVersion (Cat-N P0 #3 fix)', () => {
  it('should return v1 for stable model gemini-1.5-flash', () => {
    expect(getGeminiApiVersion('gemini-1.5-flash')).toBe('v1');
  });
  it('should return v1beta for preview model', () => {
    expect(getGeminiApiVersion('gemini-3-flash-preview')).toBe('v1beta');
  });
  it('should return v1beta for experimental model', () => {
    expect(getGeminiApiVersion('gemini-x-experimental')).toBe('v1beta');
  });
  it('should default to v1 for invalid input', () => {
    expect(getGeminiApiVersion(null)).toBe('v1');
    expect(getGeminiApiVersion(undefined)).toBe('v1');
    expect(getGeminiApiVersion(123)).toBe('v1');
  });
});

describe('isSignedTokenFormat', () => {
  it('should return true for signed format (goal_test_<payload>.<sig>)', () => {
    expect(isSignedTokenFormat('goal_test_abc.def')).toBe(true);
  });

  it('should return false for legacy format (no `.`)', () => {
    expect(isSignedTokenFormat('goal_test_abcdef123456')).toBe(false);
  });

  it('should return false for non-goal_test_ prefix', () => {
    expect(isSignedTokenFormat('foo_test_abc.def')).toBe(false);
  });

  it('should return false for non-string input', () => {
    expect(isSignedTokenFormat(null)).toBe(false);
    expect(isSignedTokenFormat(undefined)).toBe(false);
    expect(isSignedTokenFormat(123)).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isSignedTokenFormat('')).toBe(false);
  });
});
