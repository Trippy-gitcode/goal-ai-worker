# P3 Security & Privacy — Cat-K PWA / Service Worker

Mission: SUBAGENT-LAIS-CAT-K-PWA-SW-3PERSONA-REVIEW-V1
Persona: P3 Security & Privacy (token leak / sensitive data in cache / Origin trust / postMessage XSS)
Date: 2026-05-02

## Spot-checked sources
- frontend/public/sw.js (full)
- frontend/public/_headers (CSP, Service-Worker-Allowed, Cache-Control)
- frontend/js/sw-register.js
- frontend/js/globals.js L94-111 (cookie helpers), L114-129 (ensureAuth), L186-220 (owner_key HttpOnly migration note)
- offline.html (inline script + CSP-friendliness check)

## Findings

### F1 [P1] sw.js fetch handler caches every response.ok response from same-origin
L26-31 unconditionally caches GETs that return 2xx outside `/api/*`. This creates 3 leak vectors:
(a) Future authenticated SSR routes (e.g. `/account`) cached in Cache Storage, accessible via DevTools / extensions even after logout.
(b) Vary: Authorization not honored — same URL with different Bearer tokens overwrites cache → cross-user leak in shared-device scenarios.
(c) Set-Cookie headers in cached responses are lost (not stored in Cache API), but body content with embedded user data IS persisted.
Currently low risk because all auth flows go through `/api/*` (worker), but the pattern is brittle.
Action: explicit allowlist for cacheable URLs (static assets only), OR check `response.headers.get('Cache-Control')` for `private` / `no-store` / `s-maxage=0` and skip.

### F2 [P1] hostname check `url.hostname.includes('workers.dev')` is too loose
L22: API skip rule passes if hostname contains `workers.dev`. Subdomain hijack scenario: attacker registers `goalai-futoshi-evil.workers.dev` — request to it would also be skipped. More relevant: any third-party `*.workers.dev` link rendered in markdown chat would not be cached, but the includes() match invites future false-positives if domain naming changes.
Action: exact match `url.hostname === 'goal-ai-worker.goalai-futoshi.workers.dev'`, OR origin allowlist constant.

### F3 [P2] No CSP for SW context
SW worker context inherits scope but has no separate CSP. The `_headers` CSP applies to HTML doc, not to scripts evaluated inside SW. SW currently has zero `importScripts()` or eval, so concrete risk = 0, but if future code adds importScripts of CDN, no CSP guard.
Action: future-proof by adding `Content-Security-Policy` header to `/sw.js` response in _headers (e.g. `script-src 'self'`).

### F4 [P2] No `message` event handler — but no validation either, so future surface is undefended
sw.js currently has no `addEventListener('message', ...)`. Good (zero attack surface today). But P2 review recommends adding `SKIP_WAITING` postMessage flow → at that point validation MUST be added: check `event.origin` (same-origin), check `event.source` is a Client (not WindowClient from iframe), validate message.type whitelist. Document this requirement now to avoid future XSS-via-iframe pivot.
Action: when adding postMessage handler (P2 F1), include origin check.

### F5 [P2] APP_VERSION publicly exposed in globals.js
L167: `const APP_VERSION = '4.0.82'` shipped in client bundle and assigned to `window.APP_VERSION` (L295). Combined with `/api/version` endpoint (existence implied by L258), an attacker can fingerprint exact build → CVE-matching. Low severity (frontend code is reverse-engineerable anyway), but version leak invites targeted exploitation.
Action: accept as documentation tradeoff (version display useful to users); ensure backend does not echo APP_VERSION in error pages.

### F6 [P3] offline.html inline `<script>` requires `'unsafe-inline'` in CSP
Confirmed _headers `script-src 'self' 'unsafe-inline'` — already permits this. But `'unsafe-inline'` blanket-permits all inline scripts everywhere → defeats CSP XSS protection. The offline.html script is small enough to externalize, but then SW must cache the external file.
Action: long-term — nonce-based CSP; near-term — accept tradeoff. Document.

### F7 [P3] sw-register.js error swallowed = blind to security signals
`.catch(()=>{})` discards SW registration failures. If an attacker MitMs `/sw.js` to inject malicious cached worker, registration may fail (signature mismatch, etc.) but page proceeds normally without alert.
Action: log to console at minimum; production add CSP `report-uri` style error reporting.

### F8 [P3] No integrity check on `/sw.js`
SW source is fetched fresh each visit (Cache-Control: no-cache) — good. But no Subresource Integrity (SRI) hash. If origin compromised, malicious SW persists across reloads (until uninstall). Browsers do enforce same-origin SW source, so risk = origin compromise scenario only.
Action: out of scope; mitigation = origin hardening.

## Vote
APPROVE. No active token leaks today. F1 + F2 are defense-in-depth hardening, not blockers. F3-F8 backlog. Document F4 origin-check requirement before any postMessage feature lands.

## Estimated cost impact
Zero API spend. All findings are code hardening, no infra change.
