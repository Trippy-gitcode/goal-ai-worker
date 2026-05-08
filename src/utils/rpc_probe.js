// ─────────────────────────────────────────────────────────────────────────────
// rpc_probe.js — TASK-LAIS-PHASE5-RPC-PROBE (2026-05-07)
//
// Purpose:
//   Lais Worker startup-time fail-closed gate that confirms every Supabase
//   RPC endpoint the route handlers depend on actually exists in the
//   configured Supabase project. New RPC additions that forget a migration
//   (e.g. account_atomic_delete in Round 28) are caught at first fetch
//   instead of leaking through to production traffic as 404 / runtime errors.
//
// Strategy:
//   - REQUIRED_RPCS is the single source of truth grep'd from src/.
//   - probeRpcEndpoints(env) issues one HTTP HEAD-equivalent POST per RPC.
//     Supabase RPC accepts an empty JSON body and replies with:
//       * 200 / 204 / 4xx (e.g. 400 invalid args) → RPC EXISTS
//       * 404 → RPC MISSING (handler not deployed)
//   - Any 404 response causes probeRpcEndpoints() to resolve with
//     { ok: false, missing: [...] }. The Worker fetch handler maps that to
//     a 503 Service Unavailable, satisfying the fail-closed contract.
//   - A successful probe is cached on the env object (Workers reuse env
//     across requests in the same isolate) so the cost is one round-trip
//     per cold isolate start, not per request.
//   - When SUPABASE is not configured (test / preview environments) the
//     probe is skipped (skipReason='supabase_not_configured') so unit tests
//     and local dev keep working.
//
// References:
//   - core_spec.md §2.25.21 push-前 primary quality gate (fail-closed)
//   - decision_log.md TASK-LAIS-PHASE5-RPC-PROBE goal_state
// ─────────────────────────────────────────────────────────────────────────────

// Required Supabase RPC handlers (sorted; grep src/ to refresh).
//   - account_atomic_delete   src/routes/account.js  (GDPR account delete)
//   - delete_old_audit_log    src/index.js scheduled (audit_log retention cron)
//   - increment_counter       src/utils/rate-limit.js (per-IP rate limit)
//   - increment_turn_usage    src/routes/chat.js    (chat turn quota)
//   - match_embeddings        src/services/embedding.js (history vector search)
export const REQUIRED_RPCS = Object.freeze([
  'account_atomic_delete',
  'delete_old_audit_log',
  'increment_counter',
  'increment_turn_usage',
  'match_embeddings',
]);

const PROBE_TIMEOUT_MS = 5000;

function shouldSkipProbeForEnv(env) {
  const mode = String(env?.NODE_ENV || env?.ENVIRONMENT || '').toLowerCase();
  return mode === 'test' || mode === 'development' || mode === 'preview';
}

// Internal: probe a single RPC endpoint. Returns { name, exists, status, error }.
async function _probeOne(env, name, fetchImpl) {
  const url = `${env.SUPABASE_URL}/rest/v1/rpc/${name}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
      signal: ctrl.signal,
    });
    clearTimeout(t);
    // Supabase returns 404 only when the RPC handler is genuinely missing.
    // 200/204 = success, 4xx (400/401/403/422) = exists but rejected (auth,
    // bad args), all of which prove the handler is deployed. We treat any
    // response other than 404 as "exists".
    return {
      name,
      exists: res.status !== 404,
      status: res.status,
      error: null,
    };
  } catch (err) {
    clearTimeout(t);
    // Network / timeout / abort = treat as missing (fail-closed).
    return {
      name,
      exists: false,
      status: 0,
      error: err?.message || String(err),
    };
  }
}

// probeRpcEndpoints(env, opts?) → Promise<Result>
//   Result = {
//     ok: boolean,
//     missing: string[],          // RPC names that returned 404 / errored
//     details: Array<{ name, exists, status, error }>,
//     skipped: boolean,
//     skipReason?: string,
//   }
export async function probeRpcEndpoints(env, opts = {}) {
  const fetchImpl = opts.fetch || globalThis.fetch;
  if (!env || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    if (!env || !shouldSkipProbeForEnv(env)) {
      const missing = [];
      if (!env) missing.push('__env__');
      if (env && !env.SUPABASE_URL) missing.push('SUPABASE_URL');
      if (env && !env.SUPABASE_SERVICE_KEY) missing.push('SUPABASE_SERVICE_KEY');
      return {
        ok: false,
        missing,
        details: missing.map((name) => ({
          name,
          exists: false,
          status: 0,
          error: 'required runtime config missing',
        })),
        skipped: false,
      };
    }
    return {
      ok: true,
      missing: [],
      details: [],
      skipped: true,
      skipReason: 'supabase_not_configured',
    };
  }
  const list = opts.required || REQUIRED_RPCS;
  const details = await Promise.all(list.map((n) => _probeOne(env, n, fetchImpl)));
  const missing = details.filter((d) => !d.exists).map((d) => d.name);
  return {
    ok: missing.length === 0,
    missing,
    details,
    skipped: false,
  };
}

// ensureRpcReady(env, opts?) — memoised wrapper used from the fetch handler.
//   Caches the successful probe on env.__rpc_probe_state so the round-trip
//   only happens once per Worker isolate cold start. A FAIL result is NOT
//   cached, so subsequent requests re-probe until the missing RPC is fixed.
export async function ensureRpcReady(env, opts = {}) {
  if (!env) {
    return { ok: false, missing: ['__no_env__'], details: [], skipped: false };
  }
  // Test override — allow callers to force a fresh probe.
  if (!opts.force && env.__rpc_probe_state && env.__rpc_probe_state.ok) {
    return env.__rpc_probe_state;
  }
  const result = await probeRpcEndpoints(env, opts);
  if (result.ok) {
    try { env.__rpc_probe_state = result; } catch (_) { /* env may be frozen */ }
  }
  return result;
}

// rpcProbeFailureResponse(result) — shared 503 response factory.
//   Emits a structured log line so Cloudflare Workers Observability can
//   facet on `event=rpc_probe.fail-closed` and surface the missing list.
//
// Note: This intentionally does NOT leak SUPABASE_URL or SERVICE_KEY into
// the response body. The 503 body lists missing RPC names only — that
// information is already in the source tree, so disclosure is bounded.
export function rpcProbeFailureResponse(result) {
  const payload = {
    error: 'service_unavailable',
    reason: 'RPC missing',
    missing: result?.missing || [],
    ts: Date.now(),
  };
  // Structured log — keep keys allowlisted so Logpush can parse facets.
  try {
    console.error(JSON.stringify({
      level: 'error',
      event: 'rpc_probe.fail-closed',
      msg: '503 Service Unavailable: required Supabase RPC missing',
      missing: result?.missing || [],
      details: (result?.details || []).filter((d) => !d.exists).map((d) => ({
        name: d.name,
        status: d.status,
        error: d.error,
      })),
      ts: Date.now(),
    }));
  } catch (_) { /* logging must never throw */ }
  return new Response(JSON.stringify(payload), {
    status: 503,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': '30',
    },
  });
}
