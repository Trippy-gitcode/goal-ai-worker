export function jsonRes(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

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

export function generateId(length = 24) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => chars[b % chars.length]).join('');
}

export function getMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthEndTtl() {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const diff = Math.ceil((endOfMonth - now) / 1000);
  return diff + 3 * 86400;
}

export function getDayKey() {
  const now = new Date(Date.now() + 9 * 3600000);
  return now.toISOString().slice(0, 10);
}

export async function safeCompare(a, b) {
  const encoder = new TextEncoder();
  const keyA = await crypto.subtle.importKey('raw', encoder.encode(a), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigA = await crypto.subtle.sign('HMAC', keyA, encoder.encode('compare'));
  const keyB = await crypto.subtle.importKey('raw', encoder.encode(b), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigB = await crypto.subtle.sign('HMAC', keyB, encoder.encode('compare'));
  const bufA = new Uint8Array(sigA);
  const bufB = new Uint8Array(sigB);
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) diff |= bufA[i] ^ bufB[i];
  return diff === 0;
}
