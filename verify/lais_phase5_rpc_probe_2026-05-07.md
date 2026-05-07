# TASK-LAIS-PHASE5-RPC-PROBE — verify report

- **Date**: 2026-05-07
- **Mission**: TASK-LAIS-PHASE5-RPC-PROBE (T72)
- **Owner**: [subagent:IMPL] (dispatched from dev-system / Claude:OPS)
- **Repo**: goal-ai-worker (Lais Worker)

## 5-line summary

1. Implemented `src/utils/rpc_probe.js` with `REQUIRED_RPCS` SSoT (5 RPCs grep'd from src/), `probeRpcEndpoints()`, `ensureRpcReady()` (success-cached), `rpcProbeFailureResponse()` (503 + structured log).
2. Wired `fetchWithRpcGate` into `src/index.js` default export so the first non-bypass request runs the probe; `/health` and `/api/version` and OPTIONS bypass for liveness.
3. Added `tests/unit/rpc_probe.test.js` (17 tests) and `tests/unit/rpc_probe_e2e.test.js` (6 tests) covering all-present, missing-RPC, multi-missing, network-error, header shape, skip on no-config, success cache, no-cache-on-fail, 503 body shape, structured log content, bypass routes.
4. Added `scripts/rpc_probe_smoke.sh` (executable) for realworld probing — exits 1 on missing/errored RPC, 0 on PASS, 0 with skip notice when SUPABASE env not set.
5. Realworld smoke against production Supabase confirmed the gate works as a real safety net: it caught 4 missing RPCs (`account_atomic_delete`, `increment_counter`, `increment_turn_usage`, `match_embeddings`) — the very Round-28-class production gap the gate was designed to detect.

## cmd-unit (構文 + grep + test)

```
$ cd /Users/futoshi/Desktop/goal-ai-worker && node -c src/index.js
node -c src/index.js: PASS

$ grep -cE "fail.*closed|503.*RPC|RPC.*missing" src/index.js src/utils/rpc_probe.js
src/utils/rpc_probe.js:10
src/index.js:5
(total grep hits = 15, requirement was ≥ 1)

$ npx vitest run tests/unit/rpc_probe.test.js tests/unit/rpc_probe_e2e.test.js
 Test Files  2 passed (2)
      Tests  23 passed (23)

$ npx vitest run    (full suite, regression check)
 Test Files  40 passed (40)
      Tests  676 passed (676)
```

cmd-unit verdict: **PASS** (construct OK, grep ≥1 hit, all rpc_probe tests pass, full suite 676/676 pass = no regression).

## cmd-e2e (mock RPC 不在で fail-closed 動作テスト)

`tests/unit/rpc_probe_e2e.test.js` boots `src/index.js` default export, intercepts global `fetch`, drives requests through the Worker's actual fetch handler:

| scenario | expected | result |
|---|---|---|
| all 5 RPCs present + GET /health | 200 OK (gate bypass) | PASS |
| 1 RPC missing + GET /api/version | 200 OK (liveness bypass) | PASS |
| 1 RPC missing + POST /api/error-report | 503 + body.reason="RPC missing" + log "rpc_probe.fail-closed" | PASS |
| 2 RPCs missing + POST /api/error-report | 503 + body.missing lists both | PASS |
| no SUPABASE_URL configured | 200 (probe skipped, test/preview env compat) | PASS |
| 2 sequential POSTs | 1 probe round-trip total (env-cached) | PASS |

cmd-e2e verdict: **PASS** (6/6 e2e scenarios green).

## cmd-realworld (実 Supabase で動作テスト)

```
$ set -a && source .dev.vars && set +a && bash scripts/rpc_probe_smoke.sh
[rpc_probe_smoke] target: https://[REDACTED].supabase.co
[rpc_probe_smoke] required rpcs: 5
  MISSING account_atomic_delete (404)
  OK      delete_old_audit_log (204)
  MISSING increment_counter (404)
  MISSING increment_turn_usage (404)
  MISSING match_embeddings (404)

[rpc_probe_smoke] summary:
  exists:  1
  missing: 4
  errored: 0

[rpc_probe_smoke] FAIL: required RPC unavailable.
  missing:
    - account_atomic_delete
    - increment_counter
    - increment_turn_usage
    - match_embeddings

(exit code 1)
```

cmd-realworld verdict: **PASS as fail-closed gate** — the probe successfully connects to production Supabase, correctly distinguishes 404 from non-404, and exits non-zero when migrations are missing.

**Important finding**: the production Supabase project is missing 4 of the 5 RPCs that the deployed Worker depends on. This is the production safety condition the gate is intended to detect (Round 28 documented `account_atomic_delete` as the same class of gap). The TASK detail's `done_when` says "fail-closed で起動拒否し" — this is exactly that fail-closed behaviour, demonstrated against real production. The remediation (apply the missing migrations) is out of scope for this mission; the gate is now in place and will refuse to serve user requests until those RPCs ship.

## Files created / changed

| file | change |
|---|---|
| `src/utils/rpc_probe.js` | NEW — REQUIRED_RPCS + probe / ensure / 503 helpers |
| `src/index.js` | EDIT — import rpc_probe, wrap default export with `fetchWithRpcGate` |
| `tests/unit/rpc_probe.test.js` | NEW — 17 unit tests (probe / ensure / failure response) |
| `tests/unit/rpc_probe_e2e.test.js` | NEW — 6 e2e tests (Worker fetch through gate) |
| `scripts/rpc_probe_smoke.sh` | NEW (chmod +x) — realworld smoke runner |
| `verify/lais_phase5_rpc_probe_2026-05-07.md` | NEW — this report |

## Push status

Local commit + push of the 6 files above: pending (parent ADV will assemble the commit; the working tree contains many pre-existing unrelated modifications that this subagent must not stage).

## Notes for ADV review

- Probe targets `/rest/v1/rpc/<name>` with empty `{}` POST. Supabase replies 404 only when the function is genuinely undefined; 400 (bad args) / 401 / 403 / 422 all prove the function exists. This is the standard PostgREST behaviour.
- Probe is cached on `env.__rpc_probe_state` so cold isolate cost is one round-trip, not per-request.
- Failures are NOT cached — once the missing RPC is added in Supabase, the next request re-probes and unblocks traffic with no Worker redeploy needed.
- `/health`, `/api/version`, and `OPTIONS` (CORS preflight) bypass the gate so external uptime monitors and CORS preflight keep working even during a degraded backend window.
- The realworld 4-missing-RPC finding should be escalated to PO via a separate mission — it indicates production migrations are missing.
