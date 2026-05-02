import { describe, it, expect } from 'vitest';
import {
  BASELINE_CSP,
  BASELINE_HEADERS,
  applySecurityHeaders,
  withSecurityHeaders,
} from '../../src/middleware/security-headers.js';

// ════════════════════════════════════════════════════════════════
// BASELINE_CSP — CSP directive constant
// ════════════════════════════════════════════════════════════════

describe('BASELINE_CSP', () => {
  it('should start with default-src none', () => {
    expect(BASELINE_CSP).toContain("default-src 'none'");
  });

  it('should restrict frame-ancestors', () => {
    expect(BASELINE_CSP).toContain("frame-ancestors 'none'");
  });

  it('should set object-src to none', () => {
    expect(BASELINE_CSP).toContain("object-src 'none'");
  });

  it('should include report-uri pointing to /api/csp-report', () => {
    expect(BASELINE_CSP).toContain('report-uri /api/csp-report');
  });

  it('should set script-src and style-src to self', () => {
    expect(BASELINE_CSP).toContain("script-src 'self'");
    expect(BASELINE_CSP).toContain("style-src 'self'");
  });
});

// ════════════════════════════════════════════════════════════════
// BASELINE_HEADERS — security headers map
// ════════════════════════════════════════════════════════════════

describe('BASELINE_HEADERS', () => {
  it('should set HSTS with 1y max-age + includeSubDomains', () => {
    expect(BASELINE_HEADERS['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains');
  });

  it('should set X-Content-Type-Options nosniff', () => {
    expect(BASELINE_HEADERS['X-Content-Type-Options']).toBe('nosniff');
  });

  it('should set X-Frame-Options DENY', () => {
    expect(BASELINE_HEADERS['X-Frame-Options']).toBe('DENY');
  });

  it('should set Referrer-Policy strict-origin-when-cross-origin', () => {
    expect(BASELINE_HEADERS['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
  });

  it('should disable cameras + microphones in Permissions-Policy', () => {
    const pp = BASELINE_HEADERS['Permissions-Policy'];
    expect(pp).toContain('camera=()');
    expect(pp).toContain('microphone=()');
    expect(pp).toContain('geolocation=()');
  });

  it('should set CSP equal to BASELINE_CSP', () => {
    expect(BASELINE_HEADERS['Content-Security-Policy']).toBe(BASELINE_CSP);
  });

  it('should set Cross-Origin-Opener-Policy and Cross-Origin-Resource-Policy', () => {
    expect(BASELINE_HEADERS['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(BASELINE_HEADERS['Cross-Origin-Resource-Policy']).toBe('same-origin');
  });
});

// ════════════════════════════════════════════════════════════════
// applySecurityHeaders() — wrap Response with hardening headers
// ════════════════════════════════════════════════════════════════

describe('applySecurityHeaders', () => {
  it('should preserve status and statusText of original response', () => {
    const r = new Response('body', { status: 418, statusText: "I'm a teapot" });
    const out = applySecurityHeaders(r);
    expect(out.status).toBe(418);
    expect(out.statusText).toBe("I'm a teapot");
  });

  it('should attach all baseline security headers', () => {
    const r = new Response('');
    const out = applySecurityHeaders(r);
    expect(out.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(out.headers.get('X-Frame-Options')).toBe('DENY');
    expect(out.headers.get('Strict-Transport-Security')).toContain('max-age=');
    expect(out.headers.get('Content-Security-Policy')).toContain("default-src 'none'");
  });

  it('should allow overriding individual headers', () => {
    const r = new Response('');
    const out = applySecurityHeaders(r, { 'X-Frame-Options': 'SAMEORIGIN' });
    expect(out.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
  });

  it('should skip header when override sets it to null (null skipped from merged map)', () => {
    const r = new Response('');
    const out = applySecurityHeaders(r, { 'X-Frame-Options': null });
    // Override null is in the merged map, so the if(v==null) skips it entirely;
    // the original Response had no X-Frame-Options header, so result is null.
    expect(out.headers.get('X-Frame-Options')).toBeNull();
  });

  it('should pass through non-Response objects unchanged', () => {
    expect(applySecurityHeaders(null)).toBeNull();
    expect(applySecurityHeaders(undefined)).toBeUndefined();
    const obj = { foo: 'bar' };
    expect(applySecurityHeaders(obj)).toBe(obj);
  });
});

// ════════════════════════════════════════════════════════════════
// withSecurityHeaders() — handler wrapper
// ════════════════════════════════════════════════════════════════

describe('withSecurityHeaders', () => {
  it('should wrap an async handler and apply baseline headers', async () => {
    const handler = async () => new Response('hi', { status: 200 });
    const wrapped = withSecurityHeaders(handler);
    const out = await wrapped(new Request('https://x.test/'));
    expect(out.headers.get('X-Frame-Options')).toBe('DENY');
    expect(out.status).toBe(200);
  });

  it('should accept overrides per wrap', async () => {
    const handler = async () => new Response('hi');
    const wrapped = withSecurityHeaders(handler, { 'X-Custom-Sec': 'on' });
    const out = await wrapped(new Request('https://x.test/'));
    expect(out.headers.get('X-Custom-Sec')).toBe('on');
  });

  it('should pass extra args through to handler', async () => {
    const handler = async (req, ctx) => new Response(ctx.tag);
    const wrapped = withSecurityHeaders(handler);
    const out = await wrapped(new Request('https://x.test/'), { tag: 'TAGVAL' });
    expect(await out.text()).toBe('TAGVAL');
  });
});
