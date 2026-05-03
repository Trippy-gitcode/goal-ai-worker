// SUBAGENT-LAIS-BATCH29-3BUG-FIX-V3 (2026-05-02、 Bug #1):
//   parseBodyGuarded の Content-Length 早期 reject 順序を unit test で固定。
//   旧: parseInt(... || '0') で fall through、 大量 body 流入で text() 中に worker memory 圧迫。
//   新: Content-Length が finite で maxBytes 超なら entry 直後に 413、 何 byte も読まずに abort。

import { describe, it, expect } from 'vitest';
import { parseBodyGuarded, truncateUtf16Safe, normalizeUserCode } from '../../src/middleware/input-guard.js';

function makeReq(body, headers = {}) {
  return new Request('https://x.test/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  });
}

describe('parseBodyGuarded — Bug #1 Content-Length early reject', () => {
  it('should 413 reject when Content-Length header > maxBytes (entry early reject)', async () => {
    // header で 200KB を申告、 maxBytes=100KB → entry 直後で 413
    const req = makeReq(JSON.stringify({ x: 'small' }), { 'Content-Length': '204800' });
    const result = await parseBodyGuarded(req, { maxBytes: 100 * 1024 });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(413);
    expect(result.error).toMatch(/payload too large/);
  });

  it('should 413 reject when actual body > maxBytes (defense-in-depth)', async () => {
    // Content-Length 偽装 (small) + 実 body 大 → 後段の raw.length cap が捕捉
    const big = 'a'.repeat(150 * 1024);
    const req = makeReq(JSON.stringify({ x: big }), { 'Content-Length': '100' });
    const result = await parseBodyGuarded(req, { maxBytes: 100 * 1024 });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(413);
  });

  it('should accept payload at exactly maxBytes boundary', async () => {
    const body = JSON.stringify({ x: 'ok' });
    const req = makeReq(body, { 'Content-Length': String(body.length) });
    const result = await parseBodyGuarded(req, { maxBytes: 1024 });
    expect(result.ok).toBe(true);
    expect(result.body.x).toBe('ok');
  });

  it('should treat malformed Content-Length (NaN) as unknown, fall through to raw.length cap', async () => {
    // parseInt('abc') = NaN、 Number.isFinite(NaN) = false → entry check skip、
    // raw.length が maxBytes 超なら後段で 413
    const big = 'a'.repeat(200 * 1024);
    const req = makeReq(JSON.stringify({ x: big }), { 'Content-Length': 'abc' });
    const result = await parseBodyGuarded(req, { maxBytes: 100 * 1024 });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(413);
  });

  it('should treat missing Content-Length as 0, accept small body', async () => {
    // header 不在 → parseInt('0') = 0 → check skip、 raw が小なら OK
    const req = new Request('https://x.test/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x: 'ok' }),
    });
    const result = await parseBodyGuarded(req, { maxBytes: 1024 });
    expect(result.ok).toBe(true);
    expect(result.body.x).toBe('ok');
  });
});

describe('parseBodyGuarded — existing protections (regression guard)', () => {
  it('should reject invalid JSON with 400', async () => {
    const req = makeReq('{not json');
    const result = await parseBodyGuarded(req);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error).toBe('invalid JSON');
  });

  it('should strip __proto__ / constructor / prototype keys', async () => {
    const payload = JSON.stringify({ safe: 1, __proto__: { polluted: 1 }, constructor: 'evil', prototype: 'p' });
    const req = makeReq(payload);
    const result = await parseBodyGuarded(req);
    expect(result.ok).toBe(true);
    expect(result.body.safe).toBe(1);
    expect(result.body.__proto__).not.toEqual({ polluted: 1 });
    expect(result.body.constructor).not.toBe('evil');
  });

  it('should reject nested depth exceeded', async () => {
    let nested = { v: 'leaf' };
    for (let i = 0; i < 10; i++) nested = { n: nested };
    const req = makeReq(JSON.stringify(nested));
    const result = await parseBodyGuarded(req, { maxDepth: 3 });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/nested depth/);
  });

  it('should reject array longer than maxArrayLen', async () => {
    const req = makeReq(JSON.stringify({ arr: new Array(2000).fill(0) }));
    const result = await parseBodyGuarded(req, { maxArrayLen: 100 });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/array length/);
  });

  it('should reject empty body when allowEmpty=false', async () => {
    const req = makeReq('');
    const result = await parseBodyGuarded(req);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('empty body');
  });

  it('should accept empty body when allowEmpty=true', async () => {
    const req = makeReq('');
    const result = await parseBodyGuarded(req, { allowEmpty: true });
    expect(result.ok).toBe(true);
    expect(result.body).toEqual({});
  });
});

describe('truncateUtf16Safe', () => {
  it('should not split surrogate pairs', () => {
    const str = 'a' + '😀' + 'b'; // a + emoji + b
    const trunc = truncateUtf16Safe(str, 2);
    expect(trunc).toBe('a😀');
  });
});

describe('normalizeUserCode', () => {
  it('should normalize NFD to NFC + uppercase', () => {
    const code = 'aBc12';
    expect(normalizeUserCode(code)).toBe('ABC12');
  });

  it('should reject invalid characters', () => {
    expect(normalizeUserCode('abc!@#')).toBe(null);
  });

  it('should reject non-string input', () => {
    expect(normalizeUserCode(123)).toBe(null);
  });
});
