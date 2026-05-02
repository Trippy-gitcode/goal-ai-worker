# Vote Tally — Cat-K PWA / Service Worker 3-Persona Review

Mission: SUBAGENT-LAIS-CAT-K-PWA-SW-3PERSONA-REVIEW-V1
Date: 2026-05-02
Personas: P1 PWA Best Practices / P2 Update Reliability / P3 Security & Privacy

## Final votes
| Persona | Vote | Blocking conditions |
|---|---|---|
| P1 PWA Best Practices | APPROVE WITH CHANGES | F1 (manifest 512 icon), F2 (offline.html navigate fallback) before next release |
| P2 Update Reliability | REJECT FOR PROD WITHOUT FIX | F1 (skipWaiting user prompt), F2 (CACHE_NAME / APP_VERSION sync) |
| P3 Security & Privacy | APPROVE | No blockers; F1-F2 defense-in-depth |

## Aggregate verdict
2 of 3 require changes before next deploy. P2 raises P0 update-reliability blockers (silent stale users + mid-session breakage) that overlap with P1 F2 (offline navigate fallback regression). Net: REJECT FOR PROD until 4 fixes ship:
1. P1 F1 manifest 512 icon entry.
2. P1 F2 sw.js navigate-mode offline.html fallback (closes Round 6 regression).
3. P2 F1 remove forced skipWaiting; add update-available toast via postMessage SKIP_WAITING.
4. P2 F2 build-time CACHE_NAME / APP_VERSION sync enforcement.

## Cross-persona consensus
- All three personas flag sw.js fetch handler as central risk locus: P1 wants offline shell, P2 wants update messaging, P3 wants cache filtering.
- All three call out the manual sync between CACHE_NAME and APP_VERSION as an unbounded tail risk.
- None require changes to settings.json, realmachine_smoke_results, or spec.ts.

## Spot-check coverage
sw.js (41 lines, 100%), sw-register.js (11 lines, 100%), public/manifest.json (15 lines, 100%), index.html PWA meta block (L1-60), offline.html (full 206 lines), public/_headers (full), globals.js update flow (L74-87, L163-167, L250-269), icons/ inventory.

SUBAGENT-LAIS-CAT-K-PWA-SW-3PERSONA-REVIEW-V1: COMPLETED — settings.json 影響なし、 realmachine_smoke_results 該当なし、 spec.ts 変更不要
