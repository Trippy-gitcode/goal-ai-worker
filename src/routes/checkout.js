import { authenticateRequest } from '../middleware/auth.js';
import { jsonRes } from '../utils/helpers.js';
import { STRIPE_PRICE_IDS, STRIPE_SUCCESS_URL, STRIPE_CANCEL_URL } from '../utils/constants.js';
import { syncUserToSupabase } from '../utils/supabase.js';

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
  if (!res.ok) { console.error('Stripe Checkout error:', session); return jsonRes({ error: session.error?.message || 'Stripe error' }, res.status); }
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
  if (!res.ok) { console.error('Stripe Portal error:', session); return jsonRes({ error: session.error?.message || 'Stripe error' }, res.status); }
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
    return expectedSig === signature;
  } catch (e) { console.error('Signature verification error:', e); return false; }
}

export async function handleStripeWebhook(request, env, ctx) {
  const payload = await request.text();
  const sigHeader = request.headers.get('Stripe-Signature') || '';
  const isValid = await verifyStripeSignature(payload, sigHeader, env.STRIPE_WEBHOOK_SECRET);
  if (!isValid) { console.error('Stripe webhook signature verification failed'); return new Response('Invalid signature', { status: 400 }); }
  const timestamp = request.headers.get('stripe-signature')?.match(/t=(\d+)/)?.[1];
  if (!timestamp) return jsonRes({ error: 'Missing timestamp' }, 400);
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
  if (Math.abs(age) > 300) return jsonRes({ error: 'Webhook timestamp too old' }, 400);

  const event = JSON.parse(payload);
  const eventKey = `stripe_event:${event.id}`;
  const processed = await env.TOKEN_KV.get(eventKey);
  if (processed) return new Response('Already processed', { status: 200 });
  await env.TOKEN_KV.put(eventKey, '1', { expirationTtl: 86400 });

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const tokenId = session.metadata?.tokenId;
    if (!tokenId) { console.error('Webhook: tokenId not found in metadata'); return new Response('OK', { status: 200 }); }
    const plan = session.metadata?.plan || 'pro';
    const tokenData = await env.TOKEN_KV.get(`token:${tokenId}`, 'json');
    if (!tokenData) { console.error('Webhook: token not found in KV:', tokenId); return new Response('OK', { status: 200 }); }
    tokenData.plan = plan; tokenData.expiresAt = null; tokenData.stripeCustomerId = session.customer; tokenData.stripeSubscriptionId = session.subscription; tokenData.paidPlan = plan; tokenData.paidAt = new Date().toISOString();
    await env.TOKEN_KV.put(`token:${tokenId}`, JSON.stringify(tokenData));
    console.log(`Webhook: token ${tokenId} upgraded to ${plan}`);
    if (ctx && env.SUPABASE_URL) ctx.waitUntil(syncUserToSupabase(env, tokenData));
    try {
      await fetch(`${env.SUPABASE_URL}/rest/v1/users?token_id=eq.${tokenId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'apikey': env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'Prefer': 'return=minimal' }, body: JSON.stringify({ plan, stripe_customer_id: session.customer, stripe_subscription_id: session.subscription, plan_updated_at: new Date().toISOString() }) });
    } catch(e) {}
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
          console.log(`Webhook: saved metered item ${meteredItem.id} for ${tokenId}`);
        }
      } catch (e) { console.error('Webhook: failed to save metered item ID:', e.message); }
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
        console.log(`Webhook: subscription cancelled for ${tokenId}, downgraded to free`);
        if (ctx && env.SUPABASE_URL) ctx.waitUntil(syncUserToSupabase(env, tokenData));
        try { await fetch(`${env.SUPABASE_URL}/rest/v1/users?token_id=eq.${tokenId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'apikey': env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'Prefer': 'return=minimal' }, body: JSON.stringify({ plan: 'free', cancelled_at: new Date().toISOString(), plan_updated_at: new Date().toISOString() }) }); } catch(e) {}
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
      console.log(`Webhook: invoice.paid for ${tokenId}, amount: ${invoice.amount_paid}`);
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
          } catch (e) {}
          console.log(`Webhook: plan changed to ${newPlan} for ${tokenId}`);
        }
      }
    }
  }

  return new Response('OK', { status: 200 });
}
