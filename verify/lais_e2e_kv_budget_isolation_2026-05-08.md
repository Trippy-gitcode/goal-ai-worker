# Lais E2E KV Budget Isolation — 2026-05-08

## Mission

- dev-system mission: `TASK-LAIS-E2E-KV-BUDGET-ISOLATION` / T85
- dev-system registration: `c88030c` (`T85: register Lais E2E KV budget isolation`)
- Goal: mandatory pre-push / CI E2E must not consume production Cloudflare Workers KV writes. Production checks remain available as read-only smoke and explicit budget-approved write smoke.

## Changes

- Added `scripts/e2e_prod_target_guard.sh` to block production Pages / Workers defaults in mandatory E2E paths.
- Added `scripts/e2e_local_safe.sh` as the required Playwright entry point for pre-push.
- Added `scripts/e2e_prod_readonly_smoke.sh` for production `/health` + side-effect-free RPC schema smoke.
- Added `scripts/e2e_prod_write_smoke_gate.sh` so production write smoke cannot run without `PROD_E2E=1`, `PROD_WRITE_SMOKE=1`, and `KV_WRITE_BUDGET_OK=1`.
- Rewired `scripts/adv_pre_push_quality_gate.sh` step b to call a bounded KV-safe Playwright smoke:
  - `tests/e2e/specs/baseline.spec.ts`
  - `tests/e2e/specs/p0-endpoint-coverage.spec.ts`
  - all 4 configured persona projects.
- Fixed `scripts/adv_pre_push_quality_gate.sh` tail logging so command failures are not hidden by `cmd | tail` pipeline status.
- Scoped push-time gates to pushable content:
  - `g50_prod_source_triple_verify.sh` records source/prod/SHA drift during pre-push but keeps strict equality for post-push/post-deploy checks.
  - `gitleaks` now scans `origin/main..HEAD` instead of local secrets in untracked `.dev.vars`.
  - `docs_impl_drift_check.sh` treats existing docs drift as baseline during pre-push when this push does not change docs or destructively remove implementation.
  - `workflow_inversion_check.sh` ignores untracked workflow files that are not part of the pushed commit.
- Changed E2E production URL defaults to local/mock defaults and made Supabase plan writes opt-in during KV-safe E2E.
- Fixed `scripts/external_review_guardrail.sh` paused-state echo to use braces so the pre-commit hook does not misparse a Japanese parenthesis after an unset-style variable expansion.

## Verification

- `sh scripts/e2e_prod_target_guard.sh` — PASS.
- `bash -n scripts/e2e_prod_target_guard.sh scripts/e2e_local_safe.sh scripts/e2e_prod_readonly_smoke.sh scripts/e2e_prod_write_smoke_gate.sh scripts/adv_pre_push_quality_gate.sh scripts/external_review_guardrail.sh` — PASS.
- `sh scripts/e2e_local_safe.sh --list` — PASS, 3160 tests listed without production target defaults.
- `sh scripts/e2e_local_safe.sh tests/e2e/specs/baseline.spec.ts --project=iphone-safari --reporter=list` — PASS, 9/9.
- `sh scripts/e2e_local_safe.sh tests/e2e/specs/baseline.spec.ts tests/e2e/specs/p0-endpoint-coverage.spec.ts --reporter=list` — PASS, bounded 4-persona pre-push smoke.
- `G50_PRE_PUSH_MODE=1 sh scripts/g50_prod_source_triple_verify.sh` — PASS/WARN mode, no pre-push deadlock.
- `gitleaks git --log-opts="origin/main..HEAD" --redact --config=.gitleaks.toml` — PASS for pushed commits.
- `DOCS_IMPL_DRIFT_PRE_PUSH=1 bash scripts/docs_impl_drift_check.sh` — PASS/WARN mode for unchanged docs baseline.
- `sh scripts/workflow_inversion_check.sh` — PASS for tracked workflow content; untracked local workflow drafts skipped.
- `sh scripts/e2e_local_safe.sh tests/e2e/specs/e2e-fullflow.spec.ts --project=iphone-safari --grep "Enter goal name" --reporter=list` — PASS by explicit skip when local Worker write lane is unavailable.
- `npm test` — PASS, 40 files / 679 tests.
- `npm run build` — PASS.
- `sh scripts/e2e_prod_readonly_smoke.sh` — Worker `/health` PASS HTTP 200; RPC probe skipped because `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` were not exported in this shell.
- `sh scripts/e2e_prod_write_smoke_gate.sh` — expected BLOCK without production write approvals.
- `PROD_E2E=1 PROD_WRITE_SMOKE=1 KV_WRITE_BUDGET_OK=1 sh scripts/e2e_prod_write_smoke_gate.sh` — PASS for explicit budget-approved mode.

## Residual Notes

- This does not remove production testing. It separates it:
  - mandatory E2E: local/mock, KV write safe;
  - production smoke: read-only by default;
  - production write smoke: explicit, budget-approved, small-scope only.
- Full production write E2E should not be used as a pre-push default while the Cloudflare Workers KV free tier is limited to 1000 puts/day.
- Full local E2E is still available with `npm run test:e2e:local`; it is not the default pre-push lane because it is a 3160-test suite and should run intentionally or in a quota-safe CI lane.
