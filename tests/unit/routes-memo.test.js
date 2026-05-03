// SUBAGENT-LAIS-BATCH29-3BUG-FIX-V3 (2026-05-02、 Bug #4 IDOR):
//   /api/ai-memo/generate に user_id ownership check 追加 を unit test で固定。
//   旧: goal_id を client から受信、 goals?id=eq.<goal_id> で取得 → cross-tenant data leak。
//   新: id=eq.<goal_id>&user_id=eq.<userId> filter、 attacker が他 user の goal_id 指定 → 404。

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handleAIMemoGenerate } from '../../src/routes/memo.js';

function makeKV(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    async get(key, type) {
      const raw = store.get(key);
      if (raw === undefined) return null;
      if (type === 'json') return JSON.parse(raw);
      return raw;
    },
    async put(key, value) { store.set(key, value); },
    async delete(key) { store.delete(key); },
    _store: store,
  };
}

function makeAuthEnv(plan = 'pro') {
  const kv = makeKV();
  const tok = 'goal_test_memo';
  kv._store.set(`token:${tok}`, JSON.stringify({ plan, userId: 'user-1' }));
  return {
    env: {
      TOKEN_KV: kv,
      SUPABASE_URL: 'https://s.test',
      SUPABASE_SERVICE_KEY: 'sk',
      OPENAI_API_KEY: 'k',
      TOKEN_SECRET: 'TOPSECRET',
    },
    token: tok,
  };
}

function authReq(token, body, urlPath = '/api/ai-memo/generate') {
  return new Request(`https://x.test${urlPath}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('handleAIMemoGenerate — Bug #4 IDOR fix', () => {
  let originalFetch;
  beforeEach(() => { originalFetch = globalThis.fetch; });
  afterEach(() => { globalThis.fetch = originalFetch; });

  it('should reject cross-user goal_id with 404 (IDOR fix)', async () => {
    // attacker (user-1 token) が victim (user-2) の goal_id を指定。
    // server は id=eq.<goal_id>&user_id=eq.user-1 で query → 0 件 → 404。
    const { env, token } = makeAuthEnv();
    const queryUrls = [];
    globalThis.fetch = vi.fn(async (url) => {
      queryUrls.push(String(url));
      const u = String(url);
      // 1st call: getUserIdFromToken via TOKEN_KV (skip)
      // supabase users lookup for userId
      if (u.includes('/users?') && u.includes('select=id')) {
        return new Response(JSON.stringify([{ id: 'user-1' }]), { status: 200 });
      }
      // profile lookup
      if (u.includes('/users?') && u.includes('select=*')) {
        return new Response(JSON.stringify([{ id: 'user-1', nickname: 'A' }]), { status: 200 });
      }
      // goals lookup with user_id filter → 0 件 (cross-user reject)
      if (u.includes('/goals?') && u.includes('id=eq.victim-goal-id')) {
        // Bug #4 fix の判定: user_id=eq.user-1 が含まれている = ownership check が効いている
        if (u.includes('user_id=eq.user-1')) {
          return new Response('[]', { status: 200 });
        }
        // user_id filter なしの呼出は即座に fail (regression detection)
        return new Response(JSON.stringify([{ id: 'victim-goal-id', user_id: 'user-2' }]), { status: 200 });
      }
      return new Response('[]', { status: 200 });
    });
    const res = await handleAIMemoGenerate(
      authReq(token, { type: 'goal', goal_id: 'victim-goal-id' }),
      env,
    );
    expect(res.status).toBe(404);
    // ownership check が実際に発火している証拠 (user_id=eq filter 付き query が出ている)
    const goalQueries = queryUrls.filter(u => u.includes('/goals?') && u.includes('id=eq.victim-goal-id'));
    expect(goalQueries.length).toBeGreaterThan(0);
    expect(goalQueries.some(u => u.includes('user_id=eq.user-1'))).toBe(true);
  });

  it('should accept own goal_id and generate memo (positive path)', async () => {
    const { env, token } = makeAuthEnv();
    let stage = 0;
    globalThis.fetch = vi.fn(async (url) => {
      stage++;
      const u = String(url);
      if (u.includes('/users?') && u.includes('select=id')) {
        return new Response(JSON.stringify([{ id: 'user-1' }]), { status: 200 });
      }
      if (u.includes('/users?') && u.includes('select=*')) {
        return new Response(JSON.stringify([{ id: 'user-1', nickname: 'A', strengths: 's' }]), { status: 200 });
      }
      if (u.includes('/goals?') && u.includes('user_id=eq.user-1')) {
        return new Response(JSON.stringify([{ id: 'own-goal', user_id: 'user-1', title: 'My Goal' }]), { status: 200 });
      }
      if (u.includes('openai.com')) {
        return new Response(JSON.stringify({ choices: [{ message: { content: 'memo content' } }] }), { status: 200 });
      }
      return new Response('[]', { status: 200 });
    });
    const res = await handleAIMemoGenerate(
      authReq(token, { type: 'goal', goal_id: 'own-goal' }),
      env,
    );
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.memo).toBe('memo content');
  });

  it('should reject without auth', async () => {
    const { env } = makeAuthEnv();
    const req = new Request('https://x.test/');
    const res = await handleAIMemoGenerate(req, env);
    expect(res.status).toBe(401);
  });
});
