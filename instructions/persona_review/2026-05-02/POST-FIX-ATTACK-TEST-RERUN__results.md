# SUBAGENT-LAIS-POST-FIX-ATTACK-TEST-RERUN-V1: Results

- **Date (UTC)**: 2026-05-03T05:31:02Z
- **Production URL**: https://goal-ai-worker.goalai-futoshi.workers.dev
- **APP_VERSION (assumed LIVE)**: 4.0.90 (commit 788682, batch 29-31)
- **/health baseline**: 200 OK (`{"status":"ok","service":"goal-ai-worker","ts":1777786211063}`)
- **Token register**: 200 OK, `goal_test_cZa9itLp7mRvzAW0b8skLC2V` (plan=free)

## psql DB Sanity (cmd-realworld)

- Cmd: `/opt/homebrew/opt/libpq/bin/psql "$SUPABASE_DB_URL" -c "SELECT version();"`
- Exit code: **0**
- Output: `PostgreSQL 17.6 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 15.2.0, 64-bit`

## Test Results

| # | Bug | Test | Expected | Actual HTTP | Body (head) | Verdict |
|---|---|---|---|---|---|---|
| 1 | Bug #1 DoS input-guard | POST /api/chat with 5 MB JSON body | **413** | **500** | `{"error":"エラーが発生しました。"}` | **FAIL** (旧挙動 = 500、 input-guard not effective) |
| 2 | Bug #3 SSRF-1 streaming | POST /api/chat/stream with `system:"INJECTED EVIL PROMPT"` | 200 + system ignored + LLM 出力に EVIL 反映 0 | **401** | `{"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"},"request_id":"req_011Caf5xvtPjC5XYx2czBcdy"}` | **PARTIAL/INCONCLUSIVE** (server reached upstream Anthropic; key auth rejected upstream → fix path can't be confirmed end-to-end. EVIL/INJECTED string occurrences in response = 0 (auth error body 内にも 0 件)。 fix の effective 可否は LLM 200 path で再確認必須) |
| 3 | Bug #4 memo IDOR | POST /api/ai-memo/generate with foreign goal_id `00000000-0000-0000-0000-000000000099` | **404** Not Found | **200** | `{"memo":""}` | **FAIL** (旧挙動 ≒ silent success、 404 ガード未適用) |

## Residual Bug Summary

- **Bug #1 (DoS)**: STILL EXPLOITABLE — 5 MB body returns 500 (no 413 size limit guard). batch 29-31 fix did NOT land in production for `/api/chat` request body parsing.
- **Bug #3 (SSRF-1)**: VERIFY BLOCKED by upstream Anthropic 401. Cannot confirm `body.system ignored` from external HTTP alone — needs server log inspection or LLM 200 path test (Anthropic key issue must be resolved first).
- **Bug #4 (memo IDOR)**: STILL EXPLOITABLE — foreign UUID returns 200 with `{"memo":""}` instead of 404. Cross-tenant guard未適用 or returns empty memo silently (still IDOR-like info-leak: confirms goal_id non-existent vs. returns 200 — but no proper 404).

## Notes on Test 2 (Anthropic 401)

The Workers endpoint passed the request through to Anthropic API and Anthropic returned 401 with `invalid x-api-key`. This means:
- The Workers code DID accept the request (no 4xx from Workers itself for the `system` injection).
- Anthropic key in production env is broken/rotated → all `/api/chat/stream` are currently failing for all users.
- Fix verification for Bug #3 cannot be confirmed via blackbox until Anthropic key is restored.
