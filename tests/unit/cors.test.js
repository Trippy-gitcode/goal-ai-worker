import { describe, it, expect } from 'vitest';
import { corsResponse } from '../../src/middleware/cors.js';

function makeReq(origin) {
  const headers = origin ? { Origin: origin } : {};
  return new Request('https://example.test/', { headers });
}

// ════════════════════════════════════════════════════════════════
// corsResponse() — origin allowlist + reflection
// ════════════════════════════════════════════════════════════════

describe('corsResponse', () => {
  it('should reflect allowed origin in Access-Control-Allow-Origin', () => {
    const env = { ALLOWED_ORIGINS: 'https://app.example,https://other.example' };
    const req = makeReq('https://app.example');
    const res = corsResponse(env, new Response('', { status: 200 }), req);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example');
  });

  it('should omit Access-Control-Allow-Origin for unknown origin (CVE-2018-19840 fix)', () => {
    // SUBAGENT-LAIS-COMPREHENSIVE-FIX-V1 (2026-05-01) — Wave 1 #10/#35:
    //   CVE-2018-19840 系 (sandboxed iframe / data: URI で `null` origin 偽装) 対策。
    //   旧: 不正 origin → ACAO: 'null' (literal) を set
    //   新: 不正 origin → ACAO header を set しない (fail-closed)
    const env = { ALLOWED_ORIGINS: 'https://app.example' };
    const req = makeReq('https://attacker.test');
    const res = corsResponse(env, new Response('', { status: 200 }), req);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    // Vary: Origin は cache 汚染防止のため必ず set する
    expect(res.headers.get('Vary')).toBe('Origin');
  });

  it('should also omit ACAO for literal "null" origin (sandboxed iframe attack)', () => {
    const env = { ALLOWED_ORIGINS: 'https://app.example' };
    const req = makeReq('null');
    const res = corsResponse(env, new Response('', { status: 200 }), req);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('should default to first allowed origin when Origin missing', () => {
    const env = { ALLOWED_ORIGINS: 'https://default.example,https://other.example' };
    const res = corsResponse(env, new Response('', { status: 200 }), makeReq());
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://default.example');
  });

  it('should fall back to localhost defaults when ALLOWED_ORIGINS absent', () => {
    const env = {};
    const res = corsResponse(env, new Response('', { status: 200 }), makeReq('http://localhost:3000'));
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
  });

  it('should set Access-Control-Allow-Methods header to standard list', () => {
    const res = corsResponse({}, new Response(''), makeReq());
    const methods = res.headers.get('Access-Control-Allow-Methods');
    expect(methods).toContain('GET');
    expect(methods).toContain('POST');
    expect(methods).toContain('OPTIONS');
    expect(methods).toContain('DELETE');
    expect(methods).toContain('PATCH');
  });

  it('should expose rate-limit + model headers', () => {
    const res = corsResponse({}, new Response(''), makeReq());
    const exposed = res.headers.get('Access-Control-Expose-Headers');
    expect(exposed).toContain('X-RateLimit-Remaining');
    expect(exposed).toContain('X-Model-Used');
    expect(exposed).toContain('X-Show-NPS');
  });

  it('should set Access-Control-Max-Age to 86400', () => {
    const res = corsResponse({}, new Response(''), makeReq());
    expect(res.headers.get('Access-Control-Max-Age')).toBe('86400');
  });

  it('should preserve original status and statusText', () => {
    const res = corsResponse(
      {},
      new Response('boom', { status: 418, statusText: "I'm a teapot" }),
      makeReq(),
    );
    expect(res.status).toBe(418);
    expect(res.statusText).toBe("I'm a teapot");
  });
});
