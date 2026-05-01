// src/middleware/security-headers.js — Security headers middleware
//
// SUBAGENT-LAIS-COMPREHENSIVE-FIX-V1 (2026-05-01) — Wave 1 persona #10/#35 P0/P1 fix:
//   CSP / HSTS / X-Frame-Options / Referrer-Policy / X-Content-Type-Options /
//   Permissions-Policy / Cross-Origin-* baseline を全 response に適用。
//   dev-system/templates/security-headers.template.js の baseline を Lais 向けに
//   wiring し、API-only worker としての default-src 'none' を維持しつつ、
//   account export / avatar 等が data:image を返す場合も nosniff で defense-in-depth。
//
// 設計指針:
//   - "default-deny + explicit allow" — CSP の default-src 'none' から開始
//   - HSTS は max-age=31536000 (1年) + includeSubDomains
//   - フレームバスト (X-Frame-Options DENY) で clickjack 防御
//   - Referrer leak 0 (Referrer-Policy strict-origin-when-cross-origin)
//   - Permissions-Policy で不要な API (camera/mic/usb/etc.) を明示 disable
//
// 改変ポリシー:
//   - dev-system/templates/security-headers.template.js §1〜§4 GENERATED 由来
//   - §5 App 固有 override は本ファイルで管理 (Lais 用)

// ─────────────────────────────────────────────────────────────────────────────
// §1. baseline CSP (Content-Security-Policy)
//     API-only worker は default-src 'none' で十分、HTML を返す場合は CSP を
//     呼び出し側で override 可。
// ─────────────────────────────────────────────────────────────────────────────
export const BASELINE_CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ');

// ─────────────────────────────────────────────────────────────────────────────
// §2. baseline security headers
// ─────────────────────────────────────────────────────────────────────────────
export const BASELINE_HEADERS = {
  'Content-Security-Policy': BASELINE_CSP,
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'usb=()',
    'payment=()',
    'magnetometer=()',
    'accelerometer=()',
    'gyroscope=()',
  ].join(', '),
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

// ─────────────────────────────────────────────────────────────────────────────
// §3. applySecurityHeaders — Response に header 適用
//     既存 Response を clone してヘッダ追加し、新 Response を返す
// ─────────────────────────────────────────────────────────────────────────────
export function applySecurityHeaders(response, overrides = {}) {
  if (!response || typeof response.headers?.set !== 'function') {
    return response;
  }
  const headers = new Headers(response.headers);
  const merged = { ...BASELINE_HEADERS, ...overrides };
  for (const [k, v] of Object.entries(merged)) {
    if (v == null) continue;
    headers.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// §4. middleware wrapper — fetch handler chain で使う
// ─────────────────────────────────────────────────────────────────────────────
export function withSecurityHeaders(handler, overrides = {}) {
  return async function wrapped(request, ...rest) {
    const res = await handler(request, ...rest);
    return applySecurityHeaders(res, overrides);
  };
}

export default applySecurityHeaders;
