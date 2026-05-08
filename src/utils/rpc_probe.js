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
//   - probeRpcEndpoints(env) fetches the PostgREST OpenAPI schema once and
//     checks whether `/rpc/<name>` paths are exposed. This is intentionally
//     side-effect free: some required RPCs mutate counters or delete data and
//     must not be executed by a startup probe.
//   - Any missing OpenAPI path causes probeRpcEndpoints() to resolve with
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

// Internal: fetch the OpenAPI schema that PostgREST serves at /rest/v1/.
// Returns one detail entry per required RPC without executing any RPC.
async function _probeOpenApiSchema(env, list, fetchImpl) {
  const url = `${env.SUPABASE_URL}/rest/v1/`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, {
      method: 'GET',
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Accept': 'application/openapi+json, application/json',
      },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) {
      return list.map((name) => ({
        name,
        exists: false,
        status: res.status,
        error: `openapi schema fetch failed: status=${res.status}`,
      }));
    }
    const schema = await res.json();
    const paths = schema?.paths || {};
    return list.map((name) => {
      const path = `/rpc/${name}`;
      return {
        name,
        exists: Object.prototype.hasOwnProperty.call(paths, path),
        status: res.status,
        error: null,
      };
    });
  } catch (err) {
    clearTimeout(t);
    // Network / timeout / malformed JSON = treat all as missing (fail-closed).
    return list.map((name) => ({
      name,
      exists: false,
      status: 0,
      error: err?.message || String(err),
    }));
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
  const details = await _probeOpenApiSchema(env, list, fetchImpl);
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
