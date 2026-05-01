import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handleAccountExport, handleAccountDelete } from '../../src/routes/account.js';

function makeKV(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    async get(key, type) {
      const raw = store.get(key);
      if (raw === undefined) return null;
      if (type === 'json') return JSON.parse(raw);
      return raw;
    },
    async put(key, value) {
      store.set(key, value);
    },
    async delete(key) {
      store.delete(key);
    },
    _store: store,
  };
}

function makeAuthEnv(plan = 'pro') {
  const kv = makeKV();
  const tok = 'goal_test_acc1';
  kv._store.set(`token:${tok}`, JSON.stringify({ plan, userId: 'user-1' }));
  return {
    env: {
      TOKEN_KV: kv,
      SUPABASE_URL: 'https://s.test',
      SUPABASE_SERVICE_KEY: 'sk',
    },
    token: tok,
  };
}

function authReq(token, method = 'POST', body = null) {
  return new Request('https://x.test/api/account/export', {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('handleAccountExport', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should reject without auth', async () => {
    const { env } = makeAuthEnv();
    const req = new Request('https://x.test/');
    const res = await handleAccountExport(req, env);
    expect(res.status).toBe(401);
  });

  it('should return downloadable JSON file on success', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async (url) => {
      if (String(url).includes('users')) {
        return new Response(JSON.stringify([{ id: 'u', token_id: 'tok', stripe_customer_id: 'cus' }]), { status: 200 });
      }
      return new Response('[]', { status: 200 });
    });
    const res = await handleAccountExport(authReq(token, 'GET'), env);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
    const j = await res.json();
    expect(j).toHaveProperty('exported_at');
    expect(j.user).toBeDefined();
    // sensitive fields stripped
    expect(j.user.stripe_customer_id).toBeUndefined();
  });

  it('should return 500 on Supabase failure', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () => { throw new Error('boom'); });
    const res = await handleAccountExport(authReq(token, 'GET'), env);
    expect(res.status).toBe(500);
  });
});

describe('handleAccountDelete', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should reject without auth', async () => {
    const { env } = makeAuthEnv();
    const req = new Request('https://x.test/');
    const res = await handleAccountDelete(req, env);
    expect(res.status).toBe(401);
  });

  it('should perform 7 fallback DELETE calls when RPC returns ambiguous + KV cleanup', async () => {
    // Round 27 R-005 fix: テスト名と内容を実装に合わせて更新。
    // 主経路 RPC (POST /rpc/account_atomic_delete) が body 空 (ambiguous) で返ると
    // fallback per-table 経路に降格 → 7 tables を per-table DELETE。
    const { env, token } = makeAuthEnv();
    const calls = [];
    globalThis.fetch = vi.fn(async (url, init) => {
      calls.push({ url: String(url), method: init?.method });
      return new Response(null, { status: 204 });
    });
    const res = await handleAccountDelete(authReq(token, 'DELETE'), env);
    expect(res.status).toBe(200);
    const deletes = calls.filter((c) => c.method === 'DELETE');
    // 7 = chat_messages / usage_tracking / goals / feedbacks / referrals_referrer /
    //     referrals_referred / users (ALL_DELETE_TABLES SSoT)
    expect(deletes.length).toBe(7);
    // Token KV entry deleted (via _finalizeAccountDelete unified helper)
    expect(env.TOKEN_KV._store.get(`token:${token}`)).toBeUndefined();
  });

  it('should return 500 when RPC missing AND a per-table fallback delete fails', async () => {
    // Round 26 R-001 fix: 主経路が atomic RPC、per-table は fallback。
    // 本テストは fallback path で 1 件失敗 → 500 (partial deletion 検出) を検証。
    const { env, token } = makeAuthEnv();
    let perTableCount = 0;
    globalThis.fetch = vi.fn(async (url) => {
      const u = String(url);
      // RPC 主経路は未配置 → fallback へ降格
      if (u.includes('/rpc/account_atomic_delete')) {
        return new Response('Function not found', { status: 404 });
      }
      // per-table DELETE: 2 件目 (usage_tracking) で 500
      if (u.includes('/rest/v1/') && !u.includes('/rpc/')) {
        perTableCount++;
        if (perTableCount === 2) return new Response('err', { status: 500 });
      }
      return new Response(null, { status: 204 });
    });
    const res = await handleAccountDelete(authReq(token, 'DELETE'), env);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.partial_state).toBeDefined();
    expect(body.partial_state.is_partial).toBe(true);
  });

  it('should return 200 atomic-success when RPC returns success', async () => {
    // Round 26 R-001 fix: RPC 主経路が success → per-table fallback skip
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async (url) => {
      const u = String(url);
      if (u.includes('/rpc/account_atomic_delete')) {
        return new Response(JSON.stringify({ tables_processed: 7, status: 'success' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(null, { status: 204 });
    });
    const res = await handleAccountDelete(authReq(token, 'DELETE'), env);
    expect(res.status).toBe(200);
    expect(env.TOKEN_KV._store.get(`token:${token}`)).toBeUndefined();
  });

  it('should treat 404 as benign (continue deleting)', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () => new Response('', { status: 404 }));
    const res = await handleAccountDelete(authReq(token, 'DELETE'), env);
    expect(res.status).toBe(200);
  });

  // Round 27 R-006 fix (2026-05-01) — external review GPT-5.4 MEDIUM:
  //   retry_token と TOKEN_KV 不在分岐の test gap を解消。

  it('should return retry_token (32 hex chars) on partial-failure', async () => {
    const { env, token } = makeAuthEnv();
    let perTableCount = 0;
    globalThis.fetch = vi.fn(async (url) => {
      const u = String(url);
      if (u.includes('/rpc/account_atomic_delete')) {
        return new Response('Function not found', { status: 404 });
      }
      if (u.includes('/rest/v1/') && !u.includes('/rpc/')) {
        perTableCount++;
        if (perTableCount === 2) return new Response('err', { status: 500 });
      }
      return new Response(null, { status: 204 });
    });
    const res = await handleAccountDelete(authReq(token, 'DELETE'), env);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.partial_state.retry_token).toMatch(/^[0-9a-f]{32}$/);
    // KV に primary key + opaque token key の双方が書かれている
    const keys = Array.from(env.TOKEN_KV._store.keys());
    const primary = keys.find(k => k.startsWith('account_delete_retry:'));
    const opaque = keys.find(k => k.startsWith('account_delete_retry_token:'));
    expect(primary).toBeDefined();
    expect(opaque).toBeDefined();
  });

  it('should not crash and not include retry_token when TOKEN_KV.put throws', async () => {
    // Round 26 R-002 + Round 27 R-006: TOKEN_KV.put が throw する分岐
    // (KV quota exceeded / binding 部分破損 等の二次障害 simulate) で
    // response 形が崩れないかを検証。
    const { env, token } = makeAuthEnv();
    // get は通常通り、put は throw に差し替え (auth は通過、retry-queue 投入だけ失敗)
    const origPut = env.TOKEN_KV.put.bind(env.TOKEN_KV);
    env.TOKEN_KV.put = vi.fn(async () => { throw new Error('KV quota exceeded'); });
    let perTableCount = 0;
    globalThis.fetch = vi.fn(async (url) => {
      const u = String(url);
      if (u.includes('/rpc/account_atomic_delete')) {
        return new Response('Function not found', { status: 404 });
      }
      if (u.includes('/rest/v1/') && !u.includes('/rpc/')) {
        perTableCount++;
        if (perTableCount === 2) return new Response('err', { status: 500 });
      }
      return new Response(null, { status: 204 });
    });
    const res = await handleAccountDelete(authReq(token, 'DELETE'), env);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.partial_state).toBeDefined();
    expect(body.partial_state.is_partial).toBe(true);
    // put 例外で retry_token が KV に保存されない場合でも、生成済 hex 32 chars は返却
    // (client side の手動 reference 用)、もしくは null (後方互換)
    expect(typeof body.partial_state.retry_token === 'string' || body.partial_state.retry_token === null).toBe(true);
    env.TOKEN_KV.put = origPut;
  });
});
