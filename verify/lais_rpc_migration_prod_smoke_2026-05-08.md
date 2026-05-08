# Lais RPC migration production smoke — 2026-05-08

Task: dev-system T82 `TASK-LAIS-SUPABASE-RPC-MIGRATION-APPLY-AND-PROD-SMOKE`

## Conclusion

The production Supabase database already contains all five RPCs required by the
Worker fail-closed startup probe. No DDL migration was applied.

The previous smoke script produced a false negative because it executed
`POST /rest/v1/rpc/<name>` with an empty JSON body. PostgREST reports required
argument RPCs as missing when the request body does not match the function
signature. That method also risked executing side-effecting RPCs.

The probe and smoke check now use the PostgREST OpenAPI schema at `/rest/v1/`
and verify the presence of `/rpc/<name>` paths without executing any RPC.

## Required RPC inventory

Direct `pg_proc` catalog check against the Supabase database:

```text
OK account_atomic_delete(p_user_id text, p_token_id text) returns jsonb security_definer=true
OK delete_old_audit_log() returns void security_definer=false
OK increment_counter(p_token_id text, p_type text, p_key text) returns integer security_definer=false
OK increment_turn_usage(p_user_id uuid, p_month text, p_per_turn integer) returns json security_definer=false
OK match_embeddings(query_embedding vector, match_token_id text, match_threshold double precision, match_count integer) returns TABLE(id uuid, content text, session_id text, goal_id uuid, created_at timestamp with time zone, similarity double precision) security_definer=false
summary found=5/5
```

OpenAPI path smoke:

```text
OK account_atomic_delete (openapi)
OK delete_old_audit_log (openapi)
OK increment_counter (openapi)
OK increment_turn_usage (openapi)
OK match_embeddings (openapi)

summary:
  exists:  5
  missing: 0
  errored: 0
```

## Code changes

- `src/utils/rpc_probe.js`
  - Replaced per-RPC empty-body POST checks with one OpenAPI schema fetch.
  - Keeps fail-closed behavior for schema fetch failures, non-2xx responses,
    malformed JSON, or absent RPC paths.
  - Keeps success caching on the Worker `env` object.
- `scripts/rpc_probe_smoke.sh`
  - Replaced side-effecting RPC execution with OpenAPI path verification.
- `tests/unit/rpc_probe.test.js`
  - Updated unit coverage for OpenAPI success, missing path, network failure,
    non-2xx schema fetch, and cache behavior.
- `tests/unit/rpc_probe_e2e.test.js`
  - Updated Worker-level gate tests to expect one schema fetch per cold env.

## Verification

```text
node -c src/utils/rpc_probe.js
bash -n scripts/rpc_probe_smoke.sh
npm test -- tests/unit/rpc_probe.test.js tests/unit/rpc_probe_e2e.test.js
  Test Files  2 passed (2)
  Tests       26 passed (26)
npm test
  Test Files  40 passed (40)
  Tests       679 passed (679)
npm run build
  PASS
bash scripts/rpc_probe_smoke.sh
  PASS: every required Supabase RPC is reachable
```

## Deployment

Production deploy and post-deploy smoke are recorded separately after push.
