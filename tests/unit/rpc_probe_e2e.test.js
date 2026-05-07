// tests/unit/rpc_probe_e2e.test.js — TASK-LAIS-PHASE5-RPC-PROBE (2026-05-07)
//
// End-to-end test of the Worker fetch handler integration:
//   * Mock remote backend with all RPCs present → fetch returns 200
//     (the underlying Hono route is allowed to handle the request).
//   * Mock remote backend with one RPC missing → fetch returns 503 + log
//     line containing "RPC missing".
//   * /health and /api/version bypass the gate even when an RPC is missing.
//
// This test imports the default export from src/index.js and invokes it
// directly. The Hono router covers /health and /api/version, so for the
// "all present" case we exercise those endpoints and confirm the probe
// did not block the request.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { REQUIRED_RPCS } from '../../src/utils/rpc_probe.js';

const ENV_BASE = {
  SUPABASE_URL: 'https://supabase.test',
  SUPABASE_SERVICE_KEY: 'TEST_SERVICE_KEY',
  // Required by other middleware (CORS / security headers) — give safe defaults.
  ALLOWED_ORIGINS: 'http://localhost',
  NODE_ENV: 'test',
};

// fetch interceptor that records calls and routes Supabase RPC URLs
// through a controllable fixture, while letting any other URLs return 200.
function installFetchMock({ missing = [], errorOn = [] } = {}) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = vi.fn(async (url, init) => {
    const u = String(url);
    calls.push({ url: u, method: init?.method });
    if (u.includes('/rest/v1/rpc/')) {
      const name = u.split('/rest/v1/rpc/')[1];
      if (errorOn.includes(name)) throw new Error(`network failure for ${name}`);
      if (missing.includes(name)) {
        return new Response(JSON.stringify({ code: 'PGRST202', message: 'function not found' }), { status: 404 });
      }
      return new Response('{}', { status: 200 });
    }
    return new Response('{}', { status: 200 });
  });
  return { calls, restore: () => { globalThis.fetch = original; } };
}

describe('Worker fetchWithRpcGate (E2E)', () => {
  let mock;
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (mock) mock.restore();
    consoleErrorSpy.mockRestore();
  });

  it('returns 200 for /health when all RPCs are present', async () => {
    mock = installFetchMock({});
    const worker = (await import('../../src/index.js')).default;
    const env = { ...ENV_BASE };
    const req = new Request('https://worker.test/health');
    const res = await worker.fetch(req, env, {});
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('routes /api/version through Hono regardless of RPC state', async () => {
    // Even with a missing RPC, /api/version is a liveness probe and must
    // remain reachable so external monitors keep functioning.
    mock = installFetchMock({ missing: ['account_atomic_delete'] });
    const worker = (await import('../../src/index.js')).default;
    const env = { ...ENV_BASE };
    const req = new Request('https://worker.test/api/version');
    const res = await worker.fetch(req, env, {});
    expect(res.status).toBe(200);
  });

  it('returns 503 + "RPC missing" log when a required RPC is absent', async () => {
    mock = installFetchMock({ missing: ['account_atomic_delete'] });
    const worker = (await import('../../src/index.js')).default;
    const env = { ...ENV_BASE };
    // Use a non-bypass route — /api/error-report is a public POST.
    const req = new Request('https://worker.test/api/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const res = await worker.fetch(req, env, {});
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.reason).toBe('RPC missing');
    expect(body.missing).toContain('account_atomic_delete');

    // The structured log was emitted with "RPC missing" + missing name.
    const logged = consoleErrorSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('rpc_probe.fail-closed');
    expect(logged).toContain('RPC missing');
    expect(logged).toContain('account_atomic_delete');
  });

  it('reports multiple missing RPCs in a single 503 response', async () => {
    mock = installFetchMock({ missing: ['increment_counter', 'match_embeddings'] });
    const worker = (await import('../../src/index.js')).default;
    const env = { ...ENV_BASE };
    const req = new Request('https://worker.test/api/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const res = await worker.fetch(req, env, {});
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.missing.sort()).toEqual(['increment_counter', 'match_embeddings']);
  });

  it('skips the gate when SUPABASE is not configured (test/preview env)', async () => {
    mock = installFetchMock({});
    const worker = (await import('../../src/index.js')).default;
    const env = { NODE_ENV: 'test' }; // no SUPABASE_URL / SERVICE_KEY
    const req = new Request('https://worker.test/health');
    const res = await worker.fetch(req, env, {});
    expect(res.status).toBe(200);
  });

  it('caches a successful probe across requests in the same isolate', async () => {
    mock = installFetchMock({});
    const worker = (await import('../../src/index.js')).default;
    const env = { ...ENV_BASE };
    // First non-bypass request runs the probe (REQUIRED_RPCS.length fetches
    // to /rest/v1/rpc/*).
    const req1 = new Request('https://worker.test/api/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    await worker.fetch(req1, env, {});
    const probeCalls1 = mock.calls.filter((c) => c.url.includes('/rest/v1/rpc/')).length;
    expect(probeCalls1).toBe(REQUIRED_RPCS.length);

    // Second request — probe is cached on env, so no extra RPC pings.
    const req2 = new Request('https://worker.test/api/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    await worker.fetch(req2, env, {});
    const probeCalls2 = mock.calls.filter((c) => c.url.includes('/rest/v1/rpc/')).length;
    expect(probeCalls2).toBe(REQUIRED_RPCS.length); // unchanged
  });
});
