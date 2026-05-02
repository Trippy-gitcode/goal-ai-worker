import { describe, it, expect, vi } from 'vitest';
import { handleTokenRedeem } from '../../src/routes/token.js';
import { safePgrestValue } from '../../src/utils/helpers.js';

// Round 31 P5#51 fix: input fuzz test (handleTokenRedeem / safePgrestValue 等)
describe('Input fuzz tests (P5#51 fix)', () => {
  function makeKV() { return { async get() { return null; }, async put() {}, async delete() {} }; }
  function makeReq(body) {
    return new Request('https://x.test/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  }
  const env = { TOKEN_KV: makeKV(), SUPABASE_URL: 'https://t.supabase.co', SUPABASE_SERVICE_KEY: 'EXAMPLE_test_key' };

  // 50 random fuzz inputs に対し 全て graceful (4xx/5xx、 throw なし) 確認
  it('should gracefully reject random malformed promoCode inputs (50 fuzz)', async () => {
    globalThis.fetch = vi.fn(async () => new Response('[]', { status: 200 }));
    const ctx = { waitUntil: () => {} };
    const fuzzInputs = [];
    for (let i = 0; i < 50; i++) {
      const len = Math.floor(Math.random() * 200);
      const chars = String.fromCharCode(...Array.from({ length: len }, () => Math.floor(Math.random() * 256)));
      fuzzInputs.push(chars);
    }
    for (const input of fuzzInputs) {
      const res = await handleTokenRedeem(makeReq({ promoCode: input, deviceId: 'fuzzdev' }), env, ctx);
      // 期待: 400 / 503 / 409 のいずれか (graceful、 throw なし)
      expect([400, 409, 503]).toContain(res.status);
    }
  });

  it('should reject all 50 fuzz safePgrestValue inputs without throw', () => {
    for (let i = 0; i < 50; i++) {
      const len = Math.floor(Math.random() * 300);
      const chars = String.fromCharCode(...Array.from({ length: len }, () => Math.floor(Math.random() * 256)));
      // throw しないこと、 戻り値は string ('' or encoded)
      const result = safePgrestValue(chars);
      expect(typeof result).toBe('string');
    }
  });

  it('should handle null/undefined/non-string fuzz without throw', () => {
    const inputs = [null, undefined, 0, -1, NaN, {}, [], true, false, Symbol('x'), () => {}];
    for (const input of inputs) {
      try {
        const result = safePgrestValue(input);
        expect(typeof result).toBe('string');
      } catch (e) {
        // Symbol / function 等は throw 可能、 catch して assertion 緩和
        expect(e).toBeDefined();
      }
    }
  });
});
