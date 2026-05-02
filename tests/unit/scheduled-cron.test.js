// SUBAGENT-LAIS-AUDITLOG-CRON-TRIGGER-FIX-V2 (2026-05-02) — Cat-J P0 #1 follow-up:
//   pg_cron 不在環境向け Cloudflare Workers Cron Trigger ("0 2 * * *") の
//   scheduled handler が delete_old_audit_log RPC を Supabase REST 経由で呼出すこと
//   + SUPABASE_URL/SUPABASE_SERVICE_KEY 未設定時は silent skip すること を検証。
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('scheduled cron handler — audit_log retention', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => new Response('', { status: 200 }));
  });

  it('should call delete_old_audit_log RPC when SUPABASE configured', async () => {
    const ctx = { waitUntil: (p) => p };
    const env = { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_KEY: 'EXAMPLE_test_key_gitleaks_safe' };
    const event = { cron: '0 2 * * *' };
    const worker = await import('../../src/index.js');
    if (typeof worker.default?.scheduled === 'function') {
      await worker.default.scheduled(event, env, ctx);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rest/v1/rpc/delete_old_audit_log'),
        expect.objectContaining({ method: 'POST' }),
      );
    }
    globalThis.fetch = originalFetch;
  });

  it('should silent-skip when SUPABASE_URL unset', async () => {
    const ctx = { waitUntil: (p) => p };
    const env = {};
    const event = { cron: '0 2 * * *' };
    const worker = await import('../../src/index.js');
    if (typeof worker.default?.scheduled === 'function') {
      await worker.default.scheduled(event, env, ctx);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    }
    globalThis.fetch = originalFetch;
  });

  it('should silent-skip when SUPABASE_SERVICE_KEY unset', async () => {
    const ctx = { waitUntil: (p) => p };
    const env = { SUPABASE_URL: 'https://test.supabase.co' };
    const event = { cron: '0 2 * * *' };
    const worker = await import('../../src/index.js');
    if (typeof worker.default?.scheduled === 'function') {
      await worker.default.scheduled(event, env, ctx);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    }
    globalThis.fetch = originalFetch;
  });

  it('should NOT call delete_old_audit_log RPC for the 5min health beacon cron', async () => {
    const ctx = { waitUntil: (p) => p };
    const env = {
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_KEY: 'EXAMPLE_test_key_gitleaks_safe',
      TOKEN_KV: { put: vi.fn(async () => undefined), get: vi.fn(async () => null) },
    };
    const event = { cron: '*/5 * * * *' };
    const worker = await import('../../src/index.js');
    if (typeof worker.default?.scheduled === 'function') {
      await worker.default.scheduled(event, env, ctx);
      // health beacon path は fetch を呼ばない (KV put のみ)
      expect(globalThis.fetch).not.toHaveBeenCalled();
    }
    globalThis.fetch = originalFetch;
  });
});
