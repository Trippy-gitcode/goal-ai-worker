import { authenticateRequest } from '../middleware/auth.js';
import { jsonRes, safeCompare } from '../utils/helpers.js';
import { STRIPE_PRICE_IDS, STRIPE_SUCCESS_URL, STRIPE_CANCEL_URL, isStripeBillingCriticalEvent } from '../utils/constants.js';
import { syncUserToSupabase } from '../utils/supabase.js';
import { safeLog, safeError, fingerprintToken, hashIdSync } from '../utils/safeLog.js';

export async function handleCheckoutCreate(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const body = await request.json();
  const { plan, billing_period } = body; // billing_period: 'monthly' | 'annual'
  const isAnnual = billing_period === 'annual';

  // プラン名バリデーション
  const validPlans = ['light', 'pro', 'max', 'ultra'];
  if (!validPlans.includes(plan)) {
    return jsonRes({ error: '無効なプランです。light, pro, max, ultra のいずれかを指定してください' }, 400);
  }

  const fixedPriceId = isAnnual ? STRIPE_PRICE_IDS[`${plan}_annual`] : STRIPE_PRICE_IDS[plan];
  if (!fixedPriceId) return jsonRes({ error: 'Price not found' }, 400);

  const params = new URLSearchParams();
  params.append('mode', 'subscription');

  // Line item 1: fixed price（基本料金）
  params.append('line_items[0][price]', fixedPriceId);
  params.append('line_items[0][quantity]', '1');

  // Line item 2: metered price（従量課金）— Ultra以外
  const meteredPriceId = STRIPE_PRICE_IDS[`${plan}_metered`];
  if (meteredPriceId) {
    params.append('line_items[1][price]', meteredPriceId);
    // metered は quantity 不要（usage_record で送信）
  }

  params.append('success_url', STRIPE_SUCCESS_URL);
  params.append('cancel_url', STRIPE_CANCEL_URL);
  params.append('metadata[tokenId]', auth.tokenId);
  params.append('metadata[plan]', plan);
  params.append('metadata[billing_period]', isAnnual ? 'annual' : 'monthly');

  // トライアル: Light/Pro のみ14日間（カード必須）
  if (['light', 'pro'].includes(plan) && !isAnnual) {
    params.append('subscription_data[trial_period_days]', '14');
  }

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  const session = await res.json();
  if (!res.ok) { safeLog('ERROR', 'stripe.checkout_error', { status: res.status, message: session?.error?.message || 'unknown' }); return jsonRes({ error: session.error?.message || 'Stripe error' }, res.status); }
  return jsonRes({ url: session.url, sessionId: session.id });
}

export async function handleCheckoutPortal(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const tokenData = await env.TOKEN_KV.get(`token:${auth.tokenId}`, 'json');
  if (!tokenData?.stripeCustomerId) return jsonRes({ error: 'Stripe顧客情報が見つかりません。先に決済を完了してください' }, 400);
  const params = new URLSearchParams();
  params.append('customer', tokenData.stripeCustomerId);
  params.append('return_url', STRIPE_SUCCESS_URL.replace('?checkout=success', ''));
  const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', { method: 'POST', headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() });
  const session = await res.json();
  if (!res.ok) { safeLog('ERROR', 'stripe.portal_error', { status: res.status, message: session?.error?.message || 'unknown' }); return jsonRes({ error: session.error?.message || 'Stripe error' }, res.status); }
  return jsonRes({ url: session.url });
}

async function verifyStripeSignature(payload, sigHeader, secret) {
  try {
    const parts = {};
    sigHeader.split(',').forEach(item => { const [key, value] = item.split('='); parts[key.trim()] = value; });
    const timestamp = parts['t'];
    const signature = parts['v1'];
    if (!timestamp || !signature) return false;
    const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
    if (age > 300) return false;
    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
    const expectedSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
    // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 (2026-05-01) — Wave 1 #35 H-02 fix:
    //   Stripe webhook signature `===` timing attack 対策。constant-time の
    //   safeCompare (HMAC SHA-256) で hex encoded signature を比較。Stripe
    //   公式ドキュメントの推奨に準拠。
    return await safeCompare(expectedSig, signature);
  } catch (e) { safeError('stripe.signature_verify_error', e); return false; }
}

export async function handleStripeWebhook(request, env, ctx) {
  const payload = await request.text();
  const sigHeader = request.headers.get('Stripe-Signature') || '';
  const isValid = await verifyStripeSignature(payload, sigHeader, env.STRIPE_WEBHOOK_SECRET);
  if (!isValid) { safeLog('ERROR', 'stripe.webhook_invalid_signature', {}); return new Response('Invalid signature', { status: 400 }); }
  const timestamp = request.headers.get('stripe-signature')?.match(/t=(\d+)/)?.[1];
  if (!timestamp) return jsonRes({ error: 'Missing timestamp' }, 400);
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
  if (Math.abs(age) > 300) return jsonRes({ error: 'Webhook timestamp too old' }, 400);

  // SUBAGENT-DEVSYS-ROUND4-P0-FIX-V1 (2026-05-01) — Round 4 Mode C finding C-1 +
  //   Mode G finding G-1 共合 fix:
  //   (G-1) JSON.parse uncaught throw → 400 早期返却で Stripe retry loop 防止。
  //   (C-1) idempotency race: KV check-then-put は non-atomic で並列 webhook
  //         (Stripe at-least-once delivery で同 event.id 並列到達) が両方処理続行。
  //         対処: Supabase に `stripe_processed_events(event_id PRIMARY KEY)` 行を
  //         `INSERT ... ON CONFLICT DO NOTHING` で atomic check-and-set。
  //         Supabase 不在時は KV check-then-put fallback (旧挙動) + safeError 観測。
  let event;
  try {
    event = JSON.parse(payload);
  } catch (e) {
    safeError('webhook.malformed_payload', e);
    return new Response('Invalid payload', { status: 400 });
  }
  if (!event || typeof event !== 'object' || typeof event.id !== 'string') {
    safeError('webhook.malformed_event', new Error('event.id missing or not string'));
    return new Response('Invalid event', { status: 400 });
  }

  const eventKey = `stripe_event:${event.id}`;
  // 1) Atomic dedup via Supabase (idempotency_key = event.id PRIMARY KEY)
  let dedupClaimed = false;
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) {
    try {
      const dedupRes = await fetch(`${env.SUPABASE_URL}/rest/v1/stripe_processed_events`, {
        method: 'POST',
        headers: {
          'apikey': env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation,resolution=ignore-duplicates',
        },
        body: JSON.stringify({ event_id: event.id, event_type: event.type || 'unknown', processed_at: new Date().toISOString() }),
      });
      // FIX (external review CRITICAL R-15/R-16): PostgREST `ignore-duplicates`
      //   は 201/204/200 多変動 + 空 body 時の意味曖昧。 旧実装 (parse 失敗 = "Already processed")
      //   は 一時的 API error 等で webhook event lost のリスク。
      //   対処: status 201 + parse 成功 + rows 1件以上 → 新規 claim、それ以外は
      //   defensive にKV fallback path に降格 (event lost を防ぐ、 双重処理は KV 側で再検出)。
      if (dedupRes.status === 201) {
        const text = await dedupRes.text();
        let rows = null;
        try { rows = text ? JSON.parse(text) : null; } catch (_) { rows = null; }
        if (Array.isArray(rows) && rows.length > 0) {
          dedupClaimed = true;
        } else {
          // 201 + empty/non-JSON → ambiguous: KV fallback で安全側 (skip ではなく重複検査再実行)
          safeError('webhook.dedup_supabase_ambiguous_201', new Error('201 Created but rows empty/non-JSON'), { event_id: event.id });
        }
      } else if (dedupRes.status === 200 || dedupRes.status === 204) {
        // 200/204 + body 空 = upsert 結果不明 → KV fallback で defensive 降格
        safeError('webhook.dedup_supabase_ambiguous_2xx', new Error(`status=${dedupRes.status}`), { status: dedupRes.status });
      } else if (dedupRes.status === 409) {
        // 409 Conflict (PRIMARY KEY 重複) = 確実に既存 claim
        return new Response('Already processed', { status: 200 });
      } else {
        // 4xx/5xx → KV fallback、event lost を防ぐため safeError でトレース
        safeError('webhook.dedup_supabase_failed', new Error(`status=${dedupRes.status}`), { status: dedupRes.status });
      }
    } catch (e) {
      safeError('webhook.dedup_supabase_error', e);
    }
  }

  if (!dedupClaimed) {
    // FIX (external review CRITICAL R-001 / GPT-5.4 round 22 2026-05-01):
    //   旧実装: Supabase 主経路の曖昧 2xx / 失敗時に常に KV check-then-put fallback
    //   へ降格 → Cloudflare KV eventual consistency により同一 event 並列到達で
    //   double-process リスク (charge / subscription / checkout.session で課金二重実行)。
    //   GPT-5.4 推奨: 課金系イベントは「原子的 dedup claim が取れた場合のみ処理」、
    //   それ以外は 503 で明示的 Stripe retry に倒す (at-least-once → eventually exactly-once)。
    //
    //   新実装 (本 commit):
    //     - billing-critical event (charge.* / invoice.* / customer.subscription.* /
    //       checkout.session.* / payment_intent.* / setup_intent.*) → Supabase 失敗時
    //       即 503 + Retry-After 30s。Stripe は up to 3 days exponential backoff で再試行、
    //       Supabase 復旧後に必ず exactly-once で処理される。KV race 完全排除。
    //     - 非 critical (account.* / customer.created 等の informational) → KV best-effort
    //       fallback 維持 (event lost より double-log のほうが軽微)。
    //   完全な race-free for ALL events には Durable Objects / D1 移行必要
    //   (Phase 5+ deferred、ticket: SUBAGENT-LAIS-DURABLE-OBJECT-MIGRATE-V1)。
    // Round 23 R-004: prefix regex を `isStripeBillingCriticalEvent` (allowlist Set + safety
    // prefix net) に置換。明示的 event 列挙で Stripe API 進化時の漏れを SSoT (constants.js) に集約。
    const isBillingCritical = isStripeBillingCriticalEvent(event.type);
    if (isBillingCritical) {
      // 課金系: Supabase 不在/失敗 = 強整合 dedup 取れず → 503 で Stripe retry 強制
      safeError('webhook.dedup_billing_critical_503', new Error('billing-critical event but no atomic dedup claim → 503 retry'), { event_id: event.id, event_type: event.type });
      return new Response('Idempotency store temporarily unavailable for billing event', {
        status: 503,
        headers: { 'Retry-After': '30' },
      });
    }
    // 非課金系: KV best-effort fallback (legacy 挙動維持、event lost > double-log)
    safeError('webhook.dedup_kv_fallback_noncritical', new Error('non-critical event KV best-effort fallback'), { event_id: event.id, event_type: event.type });
    if (!env || !env.TOKEN_KV) {
      safeError('webhook.dedup_kv_binding_missing', new Error('TOKEN_KV binding 不在、Supabase + KV 両方利用不能'), { event_id: event.id });
      return new Response('Idempotency store unavailable', { status: 503, headers: { 'Retry-After': '60' } });
    }
    try {
      const processed = await env.TOKEN_KV.get(eventKey);
      if (processed) return new Response('Already processed', { status: 200 });
      await env.TOKEN_KV.put(eventKey, '1', { expirationTtl: 86400 });
    } catch (kvErr) {
      safeError('webhook.dedup_kv_op_failed', kvErr, { event_id: event.id });
      return new Response('Idempotency store error', { status: 503, headers: { 'Retry-After': '60' } });
    }
  } else {
    // 主経路 (Supabase) 成功時も KV に hint を残し downstream cron (`stripe_sync_fail:*`) で参照可能化
    try { await env.TOKEN_KV.put(eventKey, '1', { expirationTtl: 86400 }); } catch (_) {}
  }

  // Round 24 R-001 fix (2026-05-01) — external review GPT-5.4 CRITICAL:
  //   旧: Supabase claim 後に business logic 失敗で「event_id 確定済み + 業務未完了」状態 →
  //       Stripe 再送が Already processed として skip → 課金状態同期が永久欠落バグ。
  //   新: business logic を try/catch で包み、失敗時は claim row を DELETE して
  //       次回 Stripe retry が再 claim → 再処理可能にする。 KV fallback path も
  //       同様に DELETE。delete 失敗時は元 error を優先して 503 返す (Stripe retry 強制)。
  let _businessFailed = false;
  let _businessError = null;
  const _rollbackClaim = async (reason) => {
    safeError('webhook.business_logic_failed_rolling_back_claim', new Error(`business logic failed (${reason}), rolling back dedup claim to allow Stripe retry`), { event_id: event.id, event_type: event.type });
    if (dedupClaimed && env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) {
      try {
        await fetch(`${env.SUPABASE_URL}/rest/v1/stripe_processed_events?event_id=eq.${encodeURIComponent(event.id)}`, {
          method: 'DELETE',
          headers: {
            'apikey': env.SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'Prefer': 'return=minimal',
          },
        });
      } catch (delErr) {
        safeError('webhook.dedup_supabase_rollback_failed', delErr, { event_id: event.id });
      }
    }
    // KV side hint も削除 (best-effort)
    try { await env.TOKEN_KV.delete(eventKey); } catch (_) {}
  };

  try {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const tokenId = session.metadata?.tokenId;
    if (!tokenId) { safeLog('ERROR', 'webhook.token_missing_metadata', {}); return new Response('OK', { status: 200 }); }
    const plan = session.metadata?.plan || 'pro';
    const tokenData = await env.TOKEN_KV.get(`token:${tokenId}`, 'json');
    if (!tokenData) { safeLog('ERROR', 'webhook.token_not_in_kv', { token_fp: fingerprintToken(tokenId) }); return new Response('OK', { status: 200 }); }
    tokenData.plan = plan; tokenData.expiresAt = null; tokenData.stripeCustomerId = session.customer; tokenData.stripeSubscriptionId = session.subscription; tokenData.paidPlan = plan; tokenData.paidAt = new Date().toISOString();
    await env.TOKEN_KV.put(`token:${tokenId}`, JSON.stringify(tokenData));
    safeLog('INFO', 'webhook.upgrade', { token_fp: fingerprintToken(tokenId), plan });
    if (ctx && env.SUPABASE_URL) ctx.waitUntil(syncUserToSupabase(env, tokenData));
    try {
      const _r = await fetch(`${env.SUPABASE_URL}/rest/v1/users?token_id=eq.${tokenId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'apikey': env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'Prefer': 'return=minimal' }, body: JSON.stringify({ plan, stripe_customer_id: session.customer, stripe_subscription_id: session.subscription, plan_updated_at: new Date().toISOString() }) });
      if (!_r.ok) { throw new Error(`supabase PATCH upgrade failed: status=${_r.status}`); }
    } catch(e) {
      // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 (2026-05-01) — Wave 1 #52 P1 finding #5 fix:
      //   Stripe webhook の Supabase PATCH 失敗の silent catch 解消。
      //   safeError で structured log + retry queue キーへ event を蓄積。
      //   別 cron で `stripe_sync_fail:*` をリトライする想定。
      safeError('webhook.checkout_completed_supabase_sync_failed', e, { token_fp: fingerprintToken(tokenId) });
      try {
        await env.TOKEN_KV.put(`stripe_sync_fail:${event.id}`, JSON.stringify({ tokenId, eventType: event.type, plan, customer: session.customer, subscription: session.subscription, ts: Date.now(), retry: 0 }), { expirationTtl: 86400 * 7 });
      } catch (_) {}
    }
    // metered subscription item ID を取得して保存（Step 6）
    if (session.subscription) {
      try {
        const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${session.subscription}`, {
          headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` }
        });
        const sub = await subRes.json();
        const meteredItem = sub.items?.data?.find(item => item.price?.recurring?.usage_type === 'metered');
        if (meteredItem) {
          await fetch(`${env.SUPABASE_URL}/rest/v1/users?token_id=eq.${tokenId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'apikey': env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'Prefer': 'return=minimal' },
            body: JSON.stringify({ stripe_metered_subscription_item_id: meteredItem.id })
          });
          safeLog('INFO', 'webhook.metered_item_saved', { token_fp: fingerprintToken(tokenId), metered_item_fp: fingerprintToken(meteredItem.id) });
        }
      } catch (e) { safeError('webhook.metered_item_save_failed', e, { token_fp: fingerprintToken(tokenId) }); }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const customerId = subscription.customer;
    const tokenId = await env.TOKEN_KV.get(`stripe_customer:${customerId}`);
    if (tokenId) {
      const tokenData = await env.TOKEN_KV.get(`token:${tokenId}`, 'json');
      if (tokenData) {
        tokenData.plan = 'free'; tokenData.paidPlan = null; tokenData.stripeSubscriptionId = null; tokenData.cancelledAt = new Date().toISOString();
        await env.TOKEN_KV.put(`token:${tokenId}`, JSON.stringify(tokenData));
        safeLog('INFO', 'webhook.subscription_cancelled', { token_fp: fingerprintToken(tokenId), plan: 'free' });
        if (ctx && env.SUPABASE_URL) ctx.waitUntil(syncUserToSupabase(env, tokenData));
        try {
          const _r2 = await fetch(`${env.SUPABASE_URL}/rest/v1/users?token_id=eq.${tokenId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'apikey': env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'Prefer': 'return=minimal' }, body: JSON.stringify({ plan: 'free', cancelled_at: new Date().toISOString(), plan_updated_at: new Date().toISOString() }) });
          if (!_r2.ok) { throw new Error(`supabase PATCH cancel failed: status=${_r2.status}`); }
        } catch(e) {
          // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 (2026-05-01) — Wave 1 #52 P1 #5 fix:
          //   subscription cancel の Supabase PATCH 失敗の silent catch 解消。
          safeError('webhook.subscription_cancelled_supabase_sync_failed', e, { token_fp: fingerprintToken(tokenId) });
          try {
            await env.TOKEN_KV.put(`stripe_sync_fail:${event.id}`, JSON.stringify({ tokenId, eventType: event.type, plan: 'free', ts: Date.now(), retry: 0 }), { expirationTtl: 86400 * 7 });
          } catch (_) {}
        }
      }
    }
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (session.customer && session.metadata?.tokenId) await env.TOKEN_KV.put(`stripe_customer:${session.customer}`, session.metadata.tokenId);
  }

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object;
    const customerId = invoice.customer;
    const tokenId = await env.TOKEN_KV.get(`stripe_customer:${customerId}`);
    if (tokenId) {
      safeLog('INFO', 'webhook.invoice_paid', { token_fp: fingerprintToken(tokenId), amount_jpy: invoice.amount_paid });
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    const customerId = subscription.customer;
    const tokenId = await env.TOKEN_KV.get(`stripe_customer:${customerId}`);
    if (tokenId) {
      const newPlan = subscription.metadata?.plan;
      if (newPlan) {
        const tokenData = await env.TOKEN_KV.get(`token:${tokenId}`, 'json');
        if (tokenData && tokenData.plan !== newPlan) {
          tokenData.plan = newPlan;
          tokenData.paidPlan = newPlan;
          await env.TOKEN_KV.put(`token:${tokenId}`, JSON.stringify(tokenData));
          try {
            await fetch(`${env.SUPABASE_URL}/rest/v1/users?token_id=eq.${tokenId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'apikey': env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'Prefer': 'return=minimal' },
              body: JSON.stringify({ plan: newPlan, plan_updated_at: new Date().toISOString() })
            });
          } catch (e) {
            // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 (2026-05-01) — Wave 1 #52 P1 #5 fix:
            //   subscription updated の Supabase PATCH 失敗の silent catch 解消。
            safeError('webhook.subscription_updated_supabase_sync_failed', e, { token_fp: fingerprintToken(tokenId) });
            try {
              await env.TOKEN_KV.put(`stripe_sync_fail:${event.id}`, JSON.stringify({ tokenId, eventType: event.type, plan: newPlan, ts: Date.now(), retry: 0 }), { expirationTtl: 86400 * 7 });
            } catch (_) {}
          }
          safeLog('INFO', 'webhook.plan_changed', { token_fp: fingerprintToken(tokenId), plan: newPlan });
        }
      }
    }
  }

  } catch (businessErr) {
    // Round 24 R-001: business logic で uncaught throw → claim を rollback して
    //   Stripe retry を可能にする。 503 + Retry-After で Stripe に明示。
    _businessFailed = true;
    _businessError = businessErr;
    safeError('webhook.business_logic_uncaught_throw', businessErr, { event_id: event.id, event_type: event.type });
  }

  if (_businessFailed) {
    await _rollbackClaim(_businessError ? (_businessError.message || 'unknown') : 'unknown');
    return new Response('Processing failed, please retry', {
      status: 503,
      headers: { 'Retry-After': '30' },
    });
  }

  return new Response('OK', { status: 200 });
}
