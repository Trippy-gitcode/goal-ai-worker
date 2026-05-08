# Lais T82/T72 Codex Review - 2026-05-08

Tasks:
- T82 `TASK-LAIS-SUPABASE-RPC-MIGRATION-APPLY-AND-PROD-SMOKE`
- T72 `TASK-LAIS-PHASE5-RPC-PROBE`

## Findings Fixed

1. The production read-only smoke did not exercise a Worker route protected by the RPC gate. It checked the Supabase OpenAPI schema and `/health`, but `/health` intentionally bypasses the startup gate. `scripts/e2e_prod_readonly_smoke.sh` now also calls `GET /api/usage` and passes only when production reaches the application auth/validation layer instead of `503 RPC missing`.
2. `npm run build` was not reproducible from a fresh root install because root `vite.config.js` aliases React imports to Preact while root `package.json` did not declare `preact`. `preact` is now an explicit root devDependency.

## Review Evidence

- `sh -n scripts/e2e_prod_readonly_smoke.sh scripts/rpc_probe_smoke.sh scripts/post_deploy_smoke.sh` PASS
- `npm test -- tests/unit/rpc_probe.test.js tests/unit/rpc_probe_e2e.test.js` PASS: 2 files, 26 tests
- `npm test` PASS: 40 files, 679 tests
- `npm run build` PASS from a fresh review worktree after root `preact` dependency fix
- `set -a; . /Users/futoshi/Desktop/goal-ai-worker/.dev.vars; set +a; sh scripts/e2e_prod_readonly_smoke.sh` PASS:
  - Supabase OpenAPI RPC check found all 5 required RPC paths
  - Production `GET /api/usage` returned 401 auth rejection, proving the non-bypass RPC gate path reached application code rather than `503 RPC missing`
  - Production `/health` returned HTTP 200 and `status: ok`
- `sh scripts/g50_prod_source_triple_verify.sh` PASS: source `APP_VERSION=4.0.99`, production `/api/version=4.0.99`, local HEAD equals `origin/main` before review fixes

## Decision

T82/T72 are acceptable for official DONE after this review fix is pushed and dev-system records the review evidence. No production redeploy is required for this script/dependency-only review fix.
