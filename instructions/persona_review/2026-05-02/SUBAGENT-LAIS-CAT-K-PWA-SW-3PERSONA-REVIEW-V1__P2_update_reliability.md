# P2 Update Reliability — Cat-K PWA / Service Worker

Mission: SUBAGENT-LAIS-CAT-K-PWA-SW-3PERSONA-REVIEW-V1
Persona: P2 Update Reliability (skipWaiting / clients.claim / update notification / cache version sync / fetch race)
Date: 2026-05-02

## Spot-checked sources
- frontend/public/sw.js (CACHE_NAME, install/activate/fetch listeners)
- frontend/js/sw-register.js (registration call site)
- frontend/js/globals.js L74-87 (`checkForUpdate`), L163-167 (APP_VERSION = '4.0.82'), L250-269 (`startVersionCheck` 5-min poll)
- frontend/public/_headers (`/sw.js Cache-Control: no-cache` + `Service-Worker-Allowed: /`)

## Findings

### F1 [P0] Forced `skipWaiting` + `clients.claim` with no user notification = mid-session breakage
sw.js L7: `install` → unconditional `skipWaiting()`. L15: `activate` → `clients.claim()`.
Effect: user opens tab, deploys ship, page makes XHR for `/assets/main-{old-hash}.js`, new SW takes control, old hashed asset purged from cache, network 404 → blank screen mid-session. No `Update available, click to refresh` toast.
Worse: in-flight POST during activation can race with cache.delete() in activate handler.
Action: remove `skipWaiting()` from install; emit postMessage to clients on `waiting`; SW skips only after client confirms via MessageChannel `{type:'SKIP_WAITING'}`.

### F2 [P0] CACHE_NAME and APP_VERSION drift (manual sync == time bomb)
sw.js L1-3 has hard-coded comment: `CACHE_NAME must stay in sync with APP_VERSION in js/globals.js (BUG-09 fix 2026-05-01)`. Currently both at `4.0.82` / `goal-ai-v4.0.82`. There is NO build-time enforcement. Next release where dev bumps APP_VERSION but forgets sw.js → cache never invalidates → users stuck on old build.
Action: Vite plugin to inject `CACHE_NAME = 'goal-ai-v' + import.meta.env.APP_VERSION` at build, OR pre-build script to grep both files and abort if mismatch.

### F3 [P1] `checkForUpdate` (globals.js L74-87) deletes caches BEFORE `reg.update()` resolves new SW install
Sequence:
```
await reg.update();         // schedules check, returns immediately if already current
const keys = await caches.keys();
for(const k of keys) await caches.delete(k);  // wipes caches even when no new SW
location.reload(true);      // legacy boolean ignored in modern browsers
```
Issues: (a) `reg.update()` does not await new SW activation, so user clicks "更新を確認中" → cache gone → reload onto same APP_VERSION with cold cache → toast 「新しいバージョンに更新しました」 lies. (b) `location.reload(true)` is non-standard.
Action: await `reg.installing.state === 'activated'` via state listener; only delete caches if new SW installed; replace `reload(true)` with plain `reload()`.

### F4 [P1] startVersionCheck (globals.js L250-269) only runs for tester accounts
Polls `/api/version` every 5 min, but gated on `MEMBERSHIP.tester_tier`. Free + paid users never auto-detect new releases → reliant on manual tap on version badge (checkForUpdate).
Action: poll for all users at slower cadence (e.g. 30 min) OR rely on SW updatefound + user prompt.

### F5 [P1] sw-register.js silent failure (`.catch(()=>{})`)
`navigator.serviceWorker.register('/sw.js').then(()=>{}).catch(()=>{})` swallows all errors. SW registration failure (cert, scope, parse error) invisible.
Action: `console.error('SW register failed:', e)` minimum; ideally report to /api/csp-report style error endpoint.

### F6 [P2] No `updatefound` listener → user has no way to know a new SW is waiting
sw-register.js immediately discards the registration object. Standard pattern:
```
const reg = await navigator.serviceWorker.register('/sw.js');
reg.addEventListener('updatefound', () => {
  const sw = reg.installing;
  sw.addEventListener('statechange', () => {
    if (sw.state === 'installed' && navigator.serviceWorker.controller) {
      // new SW waiting → show toast
    }
  });
});
```
Without this, even after F1 fix the user has no signal.

### F7 [P2] Fetch handler caches authenticated GETs
sw.js L26-31 caches ANY `response.ok` non-/api/ response. `/api/` skipped, but same-origin authenticated routes (e.g. future `/profile/me` SSR) would persist tokens in Cache Storage. Currently low risk (no such routes), but architectural smell.
Action: skip cache when request.headers includes `Authorization` OR response.headers `Cache-Control` includes `no-store`.

## Vote
REJECT FOR PROD WITHOUT F1 + F2 FIX. Combined risk: silent stale users (F2) + mid-session breakage (F1) is the worst PWA UX outcome. F3-F4 within sprint. F5-F7 backlog.

## Estimated cost impact
Zero API spend. F1 + F2 require ~30 min sw.js + Vite plugin work.
