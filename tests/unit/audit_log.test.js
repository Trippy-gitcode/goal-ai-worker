// tests/unit/audit_log.test.js — Round 31 P3#25 fix unit test
//   appendAuditLog の hash 化 / supabase POST / fail-open / 必須 field 振る舞い検証。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { appendAuditLog } from '../../src/utils/audit_log.js';

const ENV = { SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'TESTKEY' };

function makeRequest(headers = {}) {
  return {
    headers: {
      get: (k) => headers[k.toLowerCase()] ?? null,
    },
  };
}

describe('appendAuditLog', () => {
  let originalFetch;
  let calls;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    calls = [];
    globalThis.fetch = vi.fn(async (url, init) => {
      calls.push({ url: String(url), method: init?.method, body: init?.body, headers: init?.headers });
      return new Response('[]', { status: 200 });
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should POST to /audit_log with user_id and event_type', async () => {
    await appendAuditLog(ENV, {
      userId: 'user-uuid-1',
      eventType: 'consent_grant',
      eventData: { scope: 'mbti' },
      request: makeRequest({ 'cf-connecting-ip': '1.2.3.4', 'user-agent': 'Mozilla/5.0' }),
    });
    expect(calls.length).toBe(1);
    expect(calls[0].url).toContain('/rest/v1/audit_log');
    expect(calls[0].method).toBe('POST');
    const body = JSON.parse(calls[0].body);
    expect(body.user_id).toBe('user-uuid-1');
    expect(body.event_type).toBe('consent_grant');
    expect(body.event_data).toEqual({ scope: 'mbti' });
  });

  it('should hash IP and UA to 32-char hex (no raw values stored)', async () => {
    await appendAuditLog(ENV, {
      userId: 'u',
      eventType: 'sensitive_opt_in',
      request: makeRequest({ 'cf-connecting-ip': '203.0.113.7', 'user-agent': 'curl/8' }),
    });
    const body = JSON.parse(calls[0].body);
    expect(body.ip_hash).toMatch(/^[0-9a-f]{32}$/);
    expect(body.ua_hash).toMatch(/^[0-9a-f]{32}$/);
    // raw 値は body に出現しない
    expect(calls[0].body).not.toContain('203.0.113.7');
    expect(calls[0].body).not.toContain('curl/8');
  });

  it('should set ip_hash/ua_hash to null when headers absent', async () => {
    await appendAuditLog(ENV, {
      userId: null,
      eventType: 'data_export',
      request: makeRequest({}),
    });
    const body = JSON.parse(calls[0].body);
    expect(body.ip_hash).toBeNull();
    expect(body.ua_hash).toBeNull();
    expect(body.user_id).toBeNull();
  });

  it('should fall back to x-forwarded-for when cf-connecting-ip is absent', async () => {
    await appendAuditLog(ENV, {
      userId: 'u',
      eventType: 'consent_revoke',
      request: makeRequest({ 'x-forwarded-for': '198.51.100.1' }),
    });
    const body = JSON.parse(calls[0].body);
    expect(body.ip_hash).toMatch(/^[0-9a-f]{32}$/);
  });

  it('should silently return without throwing when eventType is missing', async () => {
    await expect(
      appendAuditLog(ENV, { userId: 'u', request: makeRequest({}) }),
    ).resolves.toBeUndefined();
    expect(calls.length).toBe(0); // no fetch call
  });

  it('should swallow errors silently (fail-open) when fetch throws', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('network down');
    });
    await expect(
      appendAuditLog(ENV, {
        userId: 'u',
        eventType: 'data_delete',
        request: makeRequest({ 'cf-connecting-ip': '1.1.1.1' }),
      }),
    ).resolves.toBeUndefined();
  });
});
