// src/middleware/cors.js — CORS handler
//
// SUBAGENT-LAIS-COMPREHENSIVE-FIX-V1 (2026-05-01) — Wave 1 persona #10/#35 P0/P1 fix:
//   CVE-2018-19840 系 (sandboxed iframe / data: URI で `null` origin を偽装) 対策:
//   不正 origin 時は `Access-Control-Allow-Origin` ヘッダ自体を omit する fail-closed
//   挙動に変更。OWASP CORS guideline 準拠。
//
//   旧実装: 不正 origin → `Access-Control-Allow-Origin: 'null'` (literal "null") 返却
//   新実装: 不正 origin → ACAO ヘッダを set しない (browser 側 fail-closed)
//
//   absent origin 時 (server-to-server, 一部 CLI 等) は allowedOrigins[0] に fallback
//   する旧挙動を維持 (backward compat)。
//
// security: applySecurityHeaders と組み合わせて使うことを前提。

export function corsResponse(env, response, request) {
  const allowedOrigins = (env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:8080').split(',').map((s) => s.trim()).filter(Boolean);
  const requestOrigin = request ? (request.headers.get('Origin') || '') : '';
  const headers = new Headers(response.headers);

  // SUBAGENT-LAIS-COMPREHENSIVE-FIX-V1 (2026-05-01): CVE-2018-19840 fix
  // 1) 許可済 origin → echo back
  // 2) origin 不在 (server-to-server) → 既定 fallback (安全側 default)
  // 3) 上記以外 (不正 origin / 'null' literal / sandboxed iframe) → ACAO 完全 omit
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    headers.set('Access-Control-Allow-Origin', requestOrigin);
    headers.set('Vary', 'Origin');
  } else if (!requestOrigin) {
    headers.set('Access-Control-Allow-Origin', allowedOrigins[0] || 'https://goal-ai-frontend.pages.dev');
    headers.set('Vary', 'Origin');
  } else {
    // 不正 origin: ACAO ヘッダを敢えて set しない (fail-closed)
    // 同時に Vary: Origin で intermediate cache の cross-origin 汚染防止
    headers.set('Vary', 'Origin');
  }

  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Secret, X-Owner-Key');
  headers.set('Access-Control-Expose-Headers', 'X-RateLimit-Remaining, X-Model-Used, X-Show-NPS, X-Model-Fallback, X-Reset-Hours');
  headers.set('Access-Control-Max-Age', '86400');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
