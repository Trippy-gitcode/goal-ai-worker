// SUBAGENT-LAIS-STRIPE-WEBHOOK-DUAL-SECRET-V1 (2026-05-02) — Round 31 honest
//   audit P4 #40 fix: Stripe webhook secret rotation 機構の dual-secret window。
//   handleStripeWebhook (verifyStripeSignature 経由) が以下 4 ケースを満たすことを検証:
//     1. current secret で sig 検証 PASS
//     2. old secret で sig 検証 PASS (rotation 期間)
//     3. current/old 両方 mismatch で reject (400)
//     4. secret 1 つしか set されてない場合の後方互換 PASS
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handleStripeWebhook } from '../../src/routes/checkout.js';

// Stripe webhook 署名生成ヘルパ (実装側 verifyStripeSignature と対称)
async function signStripePayload(payload, secret, timestamp) {
  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

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

function makeWebhookEnv(extra = {}) {
  return {
    TOKEN_KV: makeKV(),
    STRIPE_SECRET_KEY: 'sk_test_x',
    SUPABASE_URL: 'https://s.test',
    SUPABASE_SERVICE_KEY: 'sk',
    ...extra,
  };
}

async function buildWebhookRequest(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const v1 = await signStripePayload(payload, secret, timestamp);
  const sigHeader = `t=${timestamp},v1=${v1}`;
  return new Request('https://x.test/api/stripe-webhook', {
    method: 'POST',
    headers: { 'Stripe-Signature': sigHeader, 'Content-Type': 'application/json' },
    body: payload,
  });
}

describe('handleStripeWebhook dual-secret window (SUBAGENT-LAIS-STRIPE-WEBHOOK-DUAL-SECRET-V1)', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
    // dedup Supabase 経路は本テストで意味なし → 401 status で KV fallback path に降格
    // （非 critical event なので 200 OK 返却される想定、 sig verify のみを検査）
    globalThis.fetch = vi.fn(async () => new Response('', { status: 401 }));
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // 非 critical event を使用 (account.updated) → KV fallback path で 200 返却 = sig verify PASS の可観測 signal
  const payload = JSON.stringify({ id: 'evt_dual_test_1', type: 'account.updated', data: { object: {} } });

  it('case 1: current secret で sig 検証 PASS (200)', async () => {
    const env = makeWebhookEnv({
      STRIPE_WEBHOOK_SECRET: 'whsec_current_xyz',
      STRIPE_WEBHOOK_SECRET_OLD: 'whsec_old_abc',
    });
    const req = await buildWebhookRequest(payload, 'whsec_current_xyz');
    const res = await handleStripeWebhook(req, env);
    expect(res.status).toBe(200);
  });

  it('case 2: old secret で sig 検証 PASS (rotation 期間, 200)', async () => {
    const env = makeWebhookEnv({
      STRIPE_WEBHOOK_SECRET: 'whsec_current_xyz',
      STRIPE_WEBHOOK_SECRET_OLD: 'whsec_old_abc',
    });
    // event id 衝突回避 (KV fallback で同 evt id は "Already processed" 扱い)
    const p2 = JSON.stringify({ id: 'evt_dual_test_2', type: 'account.updated', data: { object: {} } });
    const req = await buildWebhookRequest(p2, 'whsec_old_abc');
    const res = await handleStripeWebhook(req, env);
    expect(res.status).toBe(200);
  });

  it('case 3: 両方 mismatch で reject (400 invalid signature)', async () => {
    const env = makeWebhookEnv({
      STRIPE_WEBHOOK_SECRET: 'whsec_current_xyz',
      STRIPE_WEBHOOK_SECRET_OLD: 'whsec_old_abc',
    });
    const p3 = JSON.stringify({ id: 'evt_dual_test_3', type: 'account.updated', data: { object: {} } });
    // 全く別の secret で署名 → current/old どちらにもマッチしない
    const req = await buildWebhookRequest(p3, 'whsec_attacker_unrelated');
    const res = await handleStripeWebhook(req, env);
    expect(res.status).toBe(400);
  });

  it('case 4: secret 1 つのみ set (STRIPE_WEBHOOK_SECRET) で後方互換 PASS (200)', async () => {
    const env = makeWebhookEnv({
      STRIPE_WEBHOOK_SECRET: 'whsec_only_current',
      // STRIPE_WEBHOOK_SECRET_OLD は未定義 → filter(Boolean) で skip
    });
    const p4 = JSON.stringify({ id: 'evt_dual_test_4', type: 'account.updated', data: { object: {} } });
    const req = await buildWebhookRequest(p4, 'whsec_only_current');
    const res = await handleStripeWebhook(req, env);
    expect(res.status).toBe(200);
  });
});
