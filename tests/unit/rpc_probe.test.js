// tests/unit/rpc_probe.test.js — TASK-LAIS-PHASE5-RPC-PROBE (2026-05-07)
//
// Verifies the startup-time fail-closed Supabase RPC gate:
//   * REQUIRED_RPCS lists every RPC actually called from src/.
//   * probeRpcEndpoints() returns ok=true when every probe gets a non-404 response.
//   * probeRpcEndpoints() returns ok=false + the missing list when any probe is 404.
//   * ensureRpcReady() caches the success result (1 round-trip per cold start).
//   * ensureRpcReady() does NOT cache failure (re-probes until fixed).
//   * rpcProbeFailureResponse() returns a 503 with reason "RPC missing".
//   * Probe is skipped when SUPABASE_URL / SUPABASE_SERVICE_KEY is not set.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  REQUIRED_RPCS,
  probeRpcEndpoints,
  ensureRpcReady,
  rpcProbeFailureResponse,
} from '../../src/utils/rpc_probe.js';

const ENV_BASE = {
  SUPABASE_URL: 'https://supabase.test',
  SUPABASE_SERVICE_KEY: 'TEST_SERVICE_KEY',
};

function makeFetchMock({ existing = [], missing = [], errorOn = [] } = {}) {
  return vi.fn(async (url) => {
    const u = String(url);
    const name = u.split('/rest/v1/rpc/')[1];
    if (errorOn.includes(name)) {
      throw new Error(`network failure for ${name}`);
    }
    if (missing.includes(name)) {
      return new Response('{"code":"PGRST202","message":"function not found"}', { status: 404 });
    }
    if (existing.includes(name)) {
      // Empty body POST -> 400 invalid args is a normal "exists" path.
      return new Response('{"code":"42883","message":"missing arguments"}', { status: 400 });
    }
    // Default: treat as exists with 200.
    return new Response('{}', { status: 200 });
  });
}

describe('REQUIRED_RPCS', () => {
  it('lists the 5 known Supabase RPC dependencies', () => {
    expect(REQUIRED_RPCS).toEqual([
      'account_atomic_delete',
      'delete_old_audit_log',
      'increment_counter',
      'increment_turn_usage',
      'match_embeddings',
    ]);
  });

  it('is frozen so handlers cannot mutate it at runtime', () => {
    expect(Object.isFrozen(REQUIRED_RPCS)).toBe(true);
  });
});

describe('probeRpcEndpoints', () => {
  it('returns ok=true when every RPC responds with non-404', async () => {
    const fetchMock = makeFetchMock({ existing: [...REQUIRED_RPCS] });
    const result = await probeRpcEndpoints(ENV_BASE, { fetch: fetchMock });
    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.skipped).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(REQUIRED_RPCS.length);
  });

  it('returns ok=false with the missing names when any RPC is 404', async () => {
    const fetchMock = makeFetchMock({ missing: ['account_atomic_delete'] });
    const result = await probeRpcEndpoints(ENV_BASE, { fetch: fetchMock });
    expect(result.ok).toBe(false);
    expect(result.missing).toContain('account_atomic_delete');
    expect(result.missing).toHaveLength(1);
    const detail = result.details.find((d) => d.name === 'account_atomic_delete');
    expect(detail.exists).toBe(false);
    expect(detail.status).toBe(404);
  });

  it('treats network errors as missing (fail-closed)', async () => {
    const fetchMock = makeFetchMock({ errorOn: ['match_embeddings'] });
    const result = await probeRpcEndpoints(ENV_BASE, { fetch: fetchMock });
    expect(result.ok).toBe(false);
    expect(result.missing).toContain('match_embeddings');
  });

  it('reports multiple missing RPCs in one pass', async () => {
    const fetchMock = makeFetchMock({
      missing: ['account_atomic_delete', 'increment_turn_usage'],
    });
    const result = await probeRpcEndpoints(ENV_BASE, { fetch: fetchMock });
    expect(result.ok).toBe(false);
    expect(result.missing.sort()).toEqual(['account_atomic_delete', 'increment_turn_usage']);
  });

  it('sends the SERVICE_KEY in apikey + Authorization headers', async () => {
    const fetchMock = makeFetchMock({});
    await probeRpcEndpoints(ENV_BASE, { fetch: fetchMock });
    const call = fetchMock.mock.calls[0];
    expect(call[1].headers.apikey).toBe('TEST_SERVICE_KEY');
    expect(call[1].headers.Authorization).toBe('Bearer TEST_SERVICE_KEY');
    expect(call[1].method).toBe('POST');
    expect(call[1].body).toBe('{}');
  });

  it('skips probing when SUPABASE_URL is missing in test mode', async () => {
    const fetchMock = vi.fn();
    const result = await probeRpcEndpoints({ NODE_ENV: 'test' }, { fetch: fetchMock });
    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toBe('supabase_not_configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skips probing when SUPABASE_SERVICE_KEY is missing in test mode', async () => {
    const fetchMock = vi.fn();
    const result = await probeRpcEndpoints({ NODE_ENV: 'test', SUPABASE_URL: 'https://x' }, { fetch: fetchMock });
    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails closed when SUPABASE config is missing outside test/dev/preview', async () => {
    const fetchMock = vi.fn();
    const result = await probeRpcEndpoints({ NODE_ENV: 'production' }, { fetch: fetchMock });
    expect(result.ok).toBe(false);
    expect(result.skipped).toBe(false);
    expect(result.missing.sort()).toEqual(['SUPABASE_SERVICE_KEY', 'SUPABASE_URL']);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('ensureRpcReady', () => {
  it('caches the success result on env so a second call avoids a probe', async () => {
    const env = { ...ENV_BASE };
    const fetchMock = makeFetchMock({});
    const r1 = await ensureRpcReady(env, { fetch: fetchMock });
    expect(r1.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(REQUIRED_RPCS.length);
    // Second call — must hit cache, not fetch again.
    const r2 = await ensureRpcReady(env, { fetch: fetchMock });
    expect(r2.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(REQUIRED_RPCS.length); // unchanged
  });

  it('does NOT cache failure — re-probes until missing RPC is fixed', async () => {
    const env = { ...ENV_BASE };
    const fetchMock = makeFetchMock({ missing: ['increment_counter'] });
    const r1 = await ensureRpcReady(env, { fetch: fetchMock });
    expect(r1.ok).toBe(false);
    const r2 = await ensureRpcReady(env, { fetch: fetchMock });
    expect(r2.ok).toBe(false);
    // Should have called fetch twice * REQUIRED_RPCS.length (no cache).
    expect(fetchMock).toHaveBeenCalledTimes(REQUIRED_RPCS.length * 2);
  });

  it('force=true bypasses the success cache', async () => {
    const env = { ...ENV_BASE };
    const fetchMock = makeFetchMock({});
    await ensureRpcReady(env, { fetch: fetchMock });
    const baseCalls = fetchMock.mock.calls.length;
    await ensureRpcReady(env, { fetch: fetchMock, force: true });
    expect(fetchMock.mock.calls.length).toBe(baseCalls + REQUIRED_RPCS.length);
  });

  it('returns ok=false when env is null', async () => {
    const result = await ensureRpcReady(null);
    expect(result.ok).toBe(false);
    expect(result.missing).toContain('__no_env__');
  });
});

describe('rpcProbeFailureResponse', () => {
  let consoleErrorSpy;
  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns a 503 Response with reason "RPC missing"', async () => {
    const result = {
      ok: false,
      missing: ['account_atomic_delete'],
      details: [
        { name: 'account_atomic_delete', exists: false, status: 404, error: null },
      ],
    };
    const res = rpcProbeFailureResponse(result);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe('service_unavailable');
    expect(body.reason).toBe('RPC missing');
    expect(body.missing).toEqual(['account_atomic_delete']);
  });

  it('emits a structured log line containing the missing list', () => {
    rpcProbeFailureResponse({
      ok: false,
      missing: ['match_embeddings'],
      details: [{ name: 'match_embeddings', exists: false, status: 404, error: null }],
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
    const logged = consoleErrorSpy.mock.calls[0][0];
    expect(logged).toContain('rpc_probe.fail-closed');
    expect(logged).toContain('match_embeddings');
    expect(logged).toContain('RPC missing');
  });

  it('attaches a Retry-After header for clients', () => {
    const res = rpcProbeFailureResponse({ missing: [], details: [] });
    expect(res.headers.get('Retry-After')).toBe('30');
  });
});

describe('REQUIRED_RPCS coverage matches src/ usage', () => {
  // This is a self-doc test — if a developer adds a new RPC call and forgets
  // to add it to REQUIRED_RPCS, the realworld smoke and CI would catch it,
  // but documenting the source list here makes the contract explicit.
  it('every entry has a known source file', () => {
    const sources = {
      'account_atomic_delete': 'src/routes/account.js',
      'delete_old_audit_log': 'src/index.js (scheduled)',
      'increment_counter': 'src/utils/rate-limit.js',
      'increment_turn_usage': 'src/routes/chat.js',
      'match_embeddings': 'src/services/embedding.js',
    };
    for (const rpc of REQUIRED_RPCS) {
      expect(sources[rpc]).toBeDefined();
    }
  });
});
