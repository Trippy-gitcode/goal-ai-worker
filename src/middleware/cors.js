export function corsResponse(env, response, request) {
  const allowedOrigins = (env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:8080').split(',');
  const requestOrigin = request ? (request.headers.get('Origin') || '') : '';
  const headers = new Headers(response.headers);
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) { headers.set('Access-Control-Allow-Origin', requestOrigin); }
  else if (!requestOrigin) { headers.set('Access-Control-Allow-Origin', allowedOrigins[0] || 'https://goal-ai-frontend.pages.dev'); }
  else { headers.set('Access-Control-Allow-Origin', 'null'); }
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Secret, X-Owner-Key');
  headers.set('Access-Control-Expose-Headers', 'X-RateLimit-Remaining, X-Model-Used, X-Show-NPS, X-Model-Fallback, X-Reset-Hours');
  headers.set('Access-Control-Max-Age', '86400');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
