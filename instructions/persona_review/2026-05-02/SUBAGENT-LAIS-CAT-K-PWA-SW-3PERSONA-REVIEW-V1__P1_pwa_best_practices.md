# P1 PWA Best Practices — Cat-K PWA / Service Worker

Mission: SUBAGENT-LAIS-CAT-K-PWA-SW-3PERSONA-REVIEW-V1
Persona: P1 PWA Best Practices (install prompt UX / icon set / offline shell / cache strategy / iOS Safari / Android Chrome)
Date: 2026-05-02

## Spot-checked sources
- frontend/public/sw.js (full, 41 lines)
- frontend/public/manifest.json + frontend/manifest.json (duplicates, 15 lines each)
- frontend/index.html L1-60 (PWA meta block)
- frontend/offline.html (full, 206 lines)
- frontend/js/sw-register.js (full, 11 lines)
- frontend/public/_headers (sw.js Cache-Control / Service-Worker-Allowed)
- frontend/public/icons/ (icon-192.png, icon-512.png, icon-192.svg, icon-512.svg, apple-touch-icon.png)

## Findings

### F1 [P0] Manifest icon set incomplete — Android install prompt fails
manifest.json declares only `icon-192.png` + `apple-touch-icon.png` (180x180).
`/icons/icon-512.png` exists on disk but is NOT declared in manifest.icons.
Android Chrome `beforeinstallprompt` minimum requirement: at least one 192x192 AND one 512x512 PNG icon.
Current state: 512 missing → install banner suppressed on Android, "add to home screen" still works manually but loses prompt CTA.
Action: add `{"src":"/icons/icon-512.png","sizes":"512x512","type":"image/png","purpose":"any maskable"}` entry.

### F2 [P0] Navigation requests do not fall back to offline.html
offline.html L8 comment claims `sw.js が mode === 'navigate' 時のキャッシュ miss でこの fallback を返す` (Round 6 P0 #O-1).
Actual sw.js L18-40 has NO `event.request.mode === 'navigate'` branch. fetch().catch() returns `caches.match(event.request)` which on navigation miss returns undefined → browser shows generic offline page.
offline.html exists on disk but is unreachable via SW. Round 6 fix is incomplete / regressed.
Action: in sw.js fetch handler, when `request.mode === 'navigate'` and network fails, return `caches.match('/offline.html')` with fallback `Response('', {status:503})`.

### F3 [P1] Duplicate manifest files (frontend/manifest.json + frontend/public/manifest.json)
Both files identical (15 lines, byte-equal). Vite copies public/* to dist root, so only public/manifest.json reaches production. The frontend/manifest.json is dead source-of-confusion that could drift out of sync.
Action: delete frontend/manifest.json; rely on public/manifest.json only.

### F4 [P1] iOS Safari apple-touch-icon ambiguity
index.html L30-32 declares 3 apple-touch-icon links: bare, 180x180, 192x192. iOS only honors 180 for home screen. The 192 link is silently ignored by Safari and confuses tooling lighthouse audits.
Action: keep only the 180x180 link; the icons array entry handles other sizes.

### F5 [P1] Theme color drift (3 declarations, 2 values)
- index.html L33: `#e8b84b` (gold)
- public/manifest.json L8: `#e8b84b` (gold)
- offline.html L11: `#0c0e14` (dark bg)
Status bar color flips between page navigations on iOS standalone mode — visual jank.
Action: pick single SSoT (likely `#0c0e14` or `#e8b84b`); standardize across all 3 sites.

### F6 [P2] No `start_url` UTM tracking for install attribution
manifest start_url=`/`. PWA install vs. browser launch indistinguishable in analytics.
Action: `start_url: "/?utm_source=pwa"` for funnel attribution (P3 doesn't see this).

### F7 [P2] Cache strategy is naive NetworkFirst-only
sw.js caches all `response.ok` GETs into single CACHE_NAME with no TTL, no size cap, no SWR. Vite hash-named assets (`/assets/*-{hash}.js`) accumulate forever across builds → quota eviction unpredictable.
Action: split into 2 caches (`static-v{ver}` immutable hash assets / `runtime-v{ver}` short-TTL HTML), prune runtime entries by LRU.

## Vote
APPROVE WITH CHANGES. F1 and F2 must ship before next release (install prompt + offline UX broken). F3-F5 within 1 sprint. F6-F7 backlog.

## Estimated cost impact
Zero API spend. F1 manifest edit + F2 sw.js fetch handler ~10 min implementation.
