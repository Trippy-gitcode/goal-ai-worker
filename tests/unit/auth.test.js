import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authenticateRequest } from '../../src/middleware/auth.js';

// In-memory KV fake (matches the surface area used by auth.js)
function makeKV(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    async get(key, type) {
      const raw = store.get(key);
      if (raw === undefined) return null;
      if (type === 'json') return JSON.parse(raw);
      return raw;
    },
    async put(key, value /* , opts */) {
      store.set(key, value);
    },
    _store: store,
  };
}

function makeReq(headers = {}) {
  return new Request('https://example.test/x', { headers });
}

// ════════════════════════════════════════════════════════════════
// authenticateRequest() — token + plan + role authorization
// ════════════════════════════════════════════════════════════════

describe('authenticateRequest', () => {
  let env;
  beforeEach(() => {
    env = { TOKEN_KV: makeKV(), OWNER_SECRET: 'OWNER_KEY' };
  });

  it('should reject when Authorization header is missing', async () => {
    const res = await authenticateRequest(makeReq(), env);
    expect(res.ok).toBe(false);
    expect(res.status).toBe(401);
    expect(res.error).toMatch(/Authorization required/);
  });

  it('should reject when Authorization header is empty string after Bearer strip', async () => {
    const res = await authenticateRequest(makeReq({ Authorization: 'Bearer ' }), env);
    expect(res.ok).toBe(false);
    expect(res.status).toBe(401);
  });

  it('should reject malformed token (not goal_test_ prefix)', async () => {
    const res = await authenticateRequest(makeReq({ Authorization: 'Bearer invalid_token' }), env);
    expect(res.ok).toBe(false);
    expect(res.error).toBe('Invalid token format');
  });

  it('should reject unknown goal_test_ token (not in KV)', async () => {
    const res = await authenticateRequest(
      makeReq({ Authorization: 'Bearer goal_test_unknown_xxx' }),
      env,
    );
    expect(res.ok).toBe(false);
    expect(res.error).toBe('Invalid token');
  });

  it('should accept a valid token and return plan + tokenId', async () => {
    const token = 'goal_test_abc123';
    await env.TOKEN_KV.put(`token:${token}`, JSON.stringify({ plan: 'pro', userId: 'u-1' }));
    const res = await authenticateRequest(makeReq({ Authorization: `Bearer ${token}` }), env);
    expect(res.ok).toBe(true);
    expect(res.tokenId).toBe(token);
    expect(res.plan).toBe('pro');
    expect(res.userId).toBe('u-1');
  });

  it('should reject token marked revoked', async () => {
    const token = 'goal_test_revoked';
    await env.TOKEN_KV.put(`token:${token}`, JSON.stringify({ plan: 'pro', revoked: true }));
    const res = await authenticateRequest(makeReq({ Authorization: `Bearer ${token}` }), env);
    expect(res.ok).toBe(false);
    expect(res.error).toBe('Token revoked');
  });

  it('should reject expired token', async () => {
    const token = 'goal_test_expired';
    const past = new Date(Date.now() - 86400000).toISOString();
    await env.TOKEN_KV.put(
      `token:${token}`,
      JSON.stringify({ plan: 'pro', expiresAt: past }),
    );
    const res = await authenticateRequest(makeReq({ Authorization: `Bearer ${token}` }), env);
    expect(res.ok).toBe(false);
    expect(res.error).toBe('Token expired');
  });

  it('should downgrade trial to free when trialEnd is in the past', async () => {
    const token = 'goal_test_trial_done';
    const past = new Date(Date.now() - 86400000).toISOString();
    await env.TOKEN_KV.put(
      `token:${token}`,
      JSON.stringify({ plan: 'trial', trialEnd: past }),
    );
    const res = await authenticateRequest(makeReq({ Authorization: `Bearer ${token}` }), env);
    expect(res.ok).toBe(true);
    expect(res.plan).toBe('free');
  });

  it('should keep trial plan if trialEnd has not yet passed', async () => {
    const token = 'goal_test_trial_alive';
    const future = new Date(Date.now() + 86400000).toISOString();
    await env.TOKEN_KV.put(
      `token:${token}`,
      JSON.stringify({ plan: 'trial', trialEnd: future }),
    );
    const res = await authenticateRequest(makeReq({ Authorization: `Bearer ${token}` }), env);
    expect(res.ok).toBe(true);
    expect(res.plan).toBe('trial');
    expect(res.trialEnd).toBe(future);
  });

  it('should downgrade tester plan when tester_expires_at is past', async () => {
    const token = 'goal_test_tester_done';
    const past = new Date(Date.now() - 1000).toISOString();
    await env.TOKEN_KV.put(
      `token:${token}`,
      JSON.stringify({ plan: 'pro', tester_tier: 'TESTER01', tester_expires_at: past }),
    );
    const res = await authenticateRequest(makeReq({ Authorization: `Bearer ${token}` }), env);
    expect(res.ok).toBe(true);
    expect(res.plan).toBe('free');
  });

  it('should elevate plan to max when X-Owner-Key matches OWNER_SECRET', async () => {
    const token = 'goal_test_owner';
    await env.TOKEN_KV.put(`token:${token}`, JSON.stringify({ plan: 'free' }));
    const res = await authenticateRequest(
      makeReq({ Authorization: `Bearer ${token}`, 'X-Owner-Key': 'OWNER_KEY' }),
      env,
    );
    expect(res.ok).toBe(true);
    expect(res.plan).toBe('max');
  });

  it('should NOT elevate plan when X-Owner-Key is wrong', async () => {
    const token = 'goal_test_fake_owner';
    await env.TOKEN_KV.put(`token:${token}`, JSON.stringify({ plan: 'free' }));
    const res = await authenticateRequest(
      makeReq({ Authorization: `Bearer ${token}`, 'X-Owner-Key': 'WRONG' }),
      env,
    );
    expect(res.ok).toBe(true);
    expect(res.plan).toBe('free');
  });

  it('should accept owner_key cookie as alternative to header', async () => {
    const token = 'goal_test_cookie_owner';
    await env.TOKEN_KV.put(`token:${token}`, JSON.stringify({ plan: 'free' }));
    const res = await authenticateRequest(
      makeReq({
        Authorization: `Bearer ${token}`,
        Cookie: 'foo=bar; owner_key=OWNER_KEY; baz=qux',
      }),
      env,
    );
    expect(res.ok).toBe(true);
    expect(res.plan).toBe('max');
  });

  it('should treat case-insensitive Bearer prefix', async () => {
    const token = 'goal_test_case';
    await env.TOKEN_KV.put(`token:${token}`, JSON.stringify({ plan: 'pro' }));
    const res = await authenticateRequest(
      makeReq({ Authorization: `bearer ${token}` }),
      env,
    );
    expect(res.ok).toBe(true);
    expect(res.plan).toBe('pro');
  });

  it('should default plan to trial when plan field is absent on token', async () => {
    const token = 'goal_test_no_plan';
    await env.TOKEN_KV.put(`token:${token}`, JSON.stringify({ userId: 'u-x' }));
    const res = await authenticateRequest(
      makeReq({ Authorization: `Bearer ${token}` }),
      env,
    );
    expect(res.ok).toBe(true);
    expect(res.plan).toBe('trial');
  });
});
