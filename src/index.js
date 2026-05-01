import { Hono } from 'hono';
import { corsResponse } from './middleware/cors.js';
import { applySecurityHeaders } from './middleware/security-headers.js';
import { jsonRes, safeCompare } from './utils/helpers.js';
import { APP_VERSION } from './utils/constants.js';

// Route handlers
import { handleChat, handleChatStream, handleGptSimple } from './routes/chat.js';
import { handleDeepOpenAI, handleDeepGemini, handleDeepClaude, handleDeepClaudeStream } from './routes/deep.js';
import { handleTokenRegister, handleTokenCreate, handleTokenValidate, handleTokenRedeem } from './routes/token.js';
import { handleUsageGet, handleAvatarUpload, handleFeedbackSave, handleDiarySave, handleDiaryGet } from './routes/misc.js';
import { handleCheckoutCreate, handleCheckoutPortal, handleStripeWebhook } from './routes/checkout.js';
import { handleGoalsList, handleGoalCreate, handleGoalUpdate, handleGoalDelete, handleSuggestRoles, handleSuggestTasks, handleExtractGoals, handleGoalLinkCreate, handleGoalLinksGet } from './routes/goals.js';
import { handleHistoryGet, handleHistorySave, handleHistoryDelete } from './routes/history.js';
import { handleVoiceTranscribe } from './routes/voice.js';
import { handleReferralCode, handleReferralCreate, handleReferralApply, handleReferralStatus } from './routes/referral.js';
import { handleTesterApply } from './routes/tester.js';
import { handleAIMemoGenerate } from './routes/memo.js';
import { handlePlanStatus } from './routes/plan.js';
import { handleAdminTesters, handleFeedbackList } from './routes/admin.js';
import { handleAccountDelete, handleAccountExport } from './routes/account.js';
import { handleIdentityGet, handleIdentityPut, handleQOLGenerate } from './routes/me.js';

const app = new Hono();

// ── CORS middleware ──
app.use('*', async (c, next) => {
  if (c.req.method === 'OPTIONS') {
    return applySecurityHeaders(corsResponse(c.env, new Response(null, { status: 204 }), c.req.raw));
  }
  await next();
});

// SUBAGENT-LAIS-COMPREHENSIVE-FIX-V1 (2026-05-01) — Wave 1 persona #10/#35 P0/P1:
//   CSP / HSTS / X-Frame-Options / Referrer-Policy / Permissions-Policy 等の
//   security headers baseline を CORS 後に適用。withCors() ヘルパーで一括 wrap。
function withCors(c, response) {
  return applySecurityHeaders(corsResponse(c.env, response, c.req.raw));
}

// ── Version / Health / Debug ──
app.get('/api/version', (c) => withCors(c, jsonRes({ version: APP_VERSION, deployed_at: new Date().toISOString() })));
app.get('/health', (c) => withCors(c, jsonRes({ status: 'ok', service: 'goal-ai-worker', ts: Date.now() })));

// SUBAGENT-LAIS-COMPREHENSIVE-FIX-V1 (2026-05-01) — Wave 1 persona #52 P0:
//   error-of-error 黙殺 (`} catch(e) {}`) 解消。
//   外側 try/catch で receive 自体の失敗を console.error に出力 + alert キーへ
//   `eo:e:<hour>` (error-of-error) を蓄積する。受信成功・蓄積成功・蓄積失敗の
//   3 経路すべて log レコードを残す。これで "error reporter 自体が壊れている"
//   状態を後追い検知可能。
app.post('/api/error-report', async (c) => {
  const hour = new Date().toISOString().slice(0, 13);
  let body = null;
  // outer: 入力 parse / KV access の error は必ず console.error + alert キーへ
  try {
    try {
      body = await c.req.json();
    } catch (parseErr) {
      console.error(JSON.stringify({
        level: 'error',
        msg: 'error-report: invalid JSON body',
        err: parseErr?.message,
        ts: Date.now(),
        route: '/api/error-report',
      }));
      // body parse 失敗自体を eo:e (error-of-error) として記録
      try {
        const eoeKey = `eo:e:${hour}`;
        const eoe = JSON.parse((await c.env.TOKEN_KV.get(eoeKey)) || '[]');
        eoe.push({ phase: 'parse', err: String(parseErr?.message || parseErr), ts: Date.now(), ip: c.req.header('CF-Connecting-IP') });
        if (eoe.length <= 100) await c.env.TOKEN_KV.put(eoeKey, JSON.stringify(eoe), { expirationTtl: 86400 * 7 });
      } catch (_) { /* TOKEN_KV bind 不在 など最終 fallback */ }
      return withCors(c, jsonRes({ ok: false, error: 'invalid_body' }, 400));
    }

    // body 受領成功: 既存ロジックで蓄積
    const key = `err:${hour}`;
    const existing = JSON.parse((await c.env.TOKEN_KV.get(key)) || '[]');
    existing.push({ ...body, ip: c.req.header('CF-Connecting-IP') });
    if (existing.length <= 100) {
      await c.env.TOKEN_KV.put(key, JSON.stringify(existing), { expirationTtl: 86400 * 7 });
    } else {
      // 100 件超過: alert キーへ "spike 観測" として記録 (sampling 1/10)
      if (Math.random() < 0.1) {
        const spikeKey = `err:spike:${hour}`;
        await c.env.TOKEN_KV.put(spikeKey, JSON.stringify({ count: existing.length, sample: body, ts: Date.now() }), { expirationTtl: 86400 * 7 });
      }
    }
  } catch (outerErr) {
    // 想定外 (KV 障害 / Workers ランタイム例外) を必ず console.error
    console.error(JSON.stringify({
      level: 'error',
      msg: 'error-report: unexpected failure (error-of-error)',
      err: outerErr?.message,
      stack: (outerErr?.stack || '').slice(0, 300),
      ts: Date.now(),
      route: '/api/error-report',
    }));
    // alert キーへ最後の砦として書込 (失敗は console.error のみ)
    try {
      const eoeKey = `eo:e:${hour}`;
      const eoe = JSON.parse((await c.env.TOKEN_KV.get(eoeKey)) || '[]');
      eoe.push({ phase: 'outer', err: String(outerErr?.message || outerErr), ts: Date.now(), ip: c.req.header('CF-Connecting-IP') });
      if (eoe.length <= 100) await c.env.TOKEN_KV.put(eoeKey, JSON.stringify(eoe), { expirationTtl: 86400 * 7 });
    } catch (innerErr) {
      console.error(JSON.stringify({
        level: 'critical',
        msg: 'error-report: alert KV write also failed',
        err: innerErr?.message,
        ts: Date.now(),
      }));
    }
  }
  return withCors(c, jsonRes({ ok: true }));
});

app.get('/api/debug/errors', async (c) => {
  // P0 FIX (LAIS-P0-FIX / GAP-CLOSURE-V1):
  //   /api/debug/errors は内部エラーログを露出するため、admin auth (TOKEN_SECRET HMAC 一致) 必須化。
  //   safeCompare 経由で timing attack 防御。Authorization: Bearer <TOKEN_SECRET> または X-Admin-Secret header 受付。
  const adminAuth = (c.req.header('Authorization') || '').replace(/^Bearer\s+/i, '') || c.req.header('X-Admin-Secret');
  if (!adminAuth || !c.env.TOKEN_SECRET || !(await safeCompare(adminAuth, c.env.TOKEN_SECRET))) {
    return withCors(c, jsonRes({ error: 'Unauthorized' }, 401));
  }
  const hour = new Date().toISOString().slice(0,13);
  const errors = JSON.parse(await c.env.TOKEN_KV.get(`err:${hour}`) || '[]');
  const prevHour = new Date(Date.now() - 3600000).toISOString().slice(0,13);
  const prevErrors = JSON.parse(await c.env.TOKEN_KV.get(`err:${prevHour}`) || '[]');
  const lastError = JSON.parse(await c.env.TOKEN_KV.get('debug:last_error') || 'null');
  // SUBAGENT-LAIS-COMPREHENSIVE-FIX-V1 (2026-05-01): error-of-error も同時返却
  const eoe = JSON.parse(await c.env.TOKEN_KV.get(`eo:e:${hour}`) || '[]');
  return withCors(c, jsonRes({ lastError, current: errors, previous: prevErrors, errorOfError: eoe }));
});

// ── Chat ──
app.post('/api/chat', async (c) => withCors(c, await handleChat(c.req.raw, c.env, c.executionCtx)));
app.post('/api/chat/stream', async (c) => withCors(c, await handleChatStream(c.req.raw, c.env, c.executionCtx)));
app.post('/api/chat/gpt-simple', async (c) => withCors(c, await handleGptSimple(c.req.raw, c.env)));

// ── Deep Analysis ──
app.post('/api/deep/openai', async (c) => withCors(c, await handleDeepOpenAI(c.req.raw, c.env, c.executionCtx)));
app.post('/api/deep/gemini', async (c) => withCors(c, await handleDeepGemini(c.req.raw, c.env, c.executionCtx)));
app.post('/api/deep/claude', async (c) => withCors(c, await handleDeepClaude(c.req.raw, c.env, c.executionCtx)));
app.post('/api/deep/claude/stream', async (c) => withCors(c, await handleDeepClaudeStream(c.req.raw, c.env, c.executionCtx)));

// ── Token ──
app.post('/api/token/register', async (c) => withCors(c, await handleTokenRegister(c.req.raw, c.env, c.executionCtx)));
app.post('/api/token/create', async (c) => withCors(c, await handleTokenCreate(c.req.raw, c.env, c.executionCtx)));
app.post('/api/token/validate', async (c) => withCors(c, await handleTokenValidate(c.req.raw, c.env)));
app.post('/api/token/redeem', async (c) => withCors(c, await handleTokenRedeem(c.req.raw, c.env, c.executionCtx)));

// ── Usage ──
app.get('/api/usage', async (c) => withCors(c, await handleUsageGet(c.req.raw, c.env, c.executionCtx)));
app.get('/api/plan/status', async (c) => withCors(c, await handlePlanStatus(c.req.raw, c.env)));

// ── Stripe ──
app.post('/api/checkout/create', async (c) => withCors(c, await handleCheckoutCreate(c.req.raw, c.env)));
app.post('/api/checkout/portal', async (c) => withCors(c, await handleCheckoutPortal(c.req.raw, c.env)));
app.post('/api/webhook/stripe', async (c) => await handleStripeWebhook(c.req.raw, c.env, c.executionCtx));

// ── Goals ──
app.get('/api/goals', async (c) => withCors(c, await handleGoalsList(c.req.raw, c.env)));
app.post('/api/goals', async (c) => withCors(c, await handleGoalCreate(c.req.raw, c.env)));
app.patch('/api/goals/:id', async (c) => withCors(c, await handleGoalUpdate(c.req.raw, c.env, new URL(c.req.url))));
app.post('/api/goals/:id/suggest-roles', async (c) => withCors(c, await handleSuggestRoles(c.req.raw, c.env)));
app.post('/api/goals/:id/suggest-tasks', async (c) => withCors(c, await handleSuggestTasks(c.req.raw, c.env)));
app.post('/api/goals/extract-from-history', async (c) => withCors(c, await handleExtractGoals(c.req.raw, c.env)));
app.delete('/api/goals/:id', async (c) => withCors(c, await handleGoalDelete(c.req.raw, c.env, new URL(c.req.url))));
app.post('/api/goals/link', async (c) => withCors(c, await handleGoalLinkCreate(c.req.raw, c.env)));
app.get('/api/goals/:id/links', async (c) => withCors(c, await handleGoalLinksGet(c.req.raw, c.env, new URL(c.req.url))));

// ── History ──
app.get('/api/history', async (c) => withCors(c, await handleHistoryGet(c.req.raw, c.env, new URL(c.req.url))));
app.post('/api/history', async (c) => withCors(c, await handleHistorySave(c.req.raw, c.env, c.executionCtx)));
app.delete('/api/history', async (c) => withCors(c, await handleHistoryDelete(c.req.raw, c.env)));

// ── Voice & Profile ──
app.post('/api/voice/transcribe', async (c) => withCors(c, await handleVoiceTranscribe(c.req.raw, c.env)));
app.post('/api/profile/avatar', async (c) => withCors(c, await handleAvatarUpload(c.req.raw, c.env)));

// ── Referral ──
app.get('/api/referral/code', async (c) => withCors(c, await handleReferralCode(c.req.raw, c.env)));
app.post('/api/referral/create', async (c) => withCors(c, await handleReferralCreate(c.req.raw, c.env)));
app.post('/api/referral/apply', async (c) => withCors(c, await handleReferralApply(c.req.raw, c.env)));
app.get('/api/referral/status', async (c) => withCors(c, await handleReferralStatus(c.req.raw, c.env)));

// ── Tester ──
app.post('/api/tester/apply', async (c) => withCors(c, await handleTesterApply(c.req.raw, c.env)));

// ── Diary ──
app.post('/api/diary', async (c) => withCors(c, await handleDiarySave(c.req.raw, c.env)));
app.get('/api/diary', async (c) => withCors(c, await handleDiaryGet(c.req.raw, c.env)));

// ── AI Memo ──
app.post('/api/ai-memo/generate', async (c) => withCors(c, await handleAIMemoGenerate(c.req.raw, c.env)));

// ── Admin ──
app.get('/api/admin/testers', async (c) => withCors(c, await handleAdminTesters(c.req.raw, c.env)));

// ── Feedbacks ──
app.post('/api/feedbacks', async (c) => withCors(c, await handleFeedbackSave(c.req.raw, c.env)));
app.get('/api/feedbacks', async (c) => withCors(c, await handleFeedbackList(c.req.raw, c.env)));

// #14: Routing feedback (KV蓄積→テスト配布後にバッチ分析)
app.post('/api/feedback/routing', async (c) => {
  try {
    const body = await c.req.json();
    const key = `rf:${Date.now()}`;
    await c.env.TOKEN_KV.put(key, JSON.stringify(body), { expirationTtl: 86400 * 30 });
  } catch(e) {
    // SUBAGENT-LAIS-COMPREHENSIVE-FIX-V1 (2026-05-01): silent catch を可視化
    console.error(JSON.stringify({ level: 'error', msg: 'feedback/routing failed', err: e?.message, ts: Date.now() }));
  }
  return withCors(c, jsonRes({ ok: true }));
});

// ── ME (Identity) ──
app.get('/api/me/identity', async (c) => withCors(c, await handleIdentityGet(c.req.raw, c.env)));
app.put('/api/me/identity', async (c) => withCors(c, await handleIdentityPut(c.req.raw, c.env)));
app.post('/api/me/qol-proposals/generate', async (c) => withCors(c, await handleQOLGenerate(c.req.raw, c.env)));

// ── Account ──
app.post('/api/account/delete', async (c) => withCors(c, await handleAccountDelete(c.req.raw, c.env)));
app.get('/api/account/export', async (c) => withCors(c, await handleAccountExport(c.req.raw, c.env)));
app.post('/api/account/export', async (c) => withCors(c, await handleAccountExport(c.req.raw, c.env)));

// ── 404 ──
app.notFound((c) => withCors(c, jsonRes({ error: 'Not found' }, 404)));

// ── Error ──
app.onError((err, c) => {
  console.error('Worker error:', err);
  if (err instanceof SyntaxError) return withCors(c, jsonRes({ error: 'Invalid JSON in request body' }, 400));
  return withCors(c, jsonRes({ error: 'Internal server error' }, 500));
});

// SUBAGENT-LAIS-COMPREHENSIVE-FIX-V1 (2026-05-01) — Wave 1 persona #52 P1:
//   Cron Triggers + scheduled handler 不在 → 5 min 周期 health check cron を結線。
//   wrangler.toml [triggers] crons = ["*/5 * * * *"] と対応。
//   実行内容: 自身の /health endpoint を beacon として叩き、KV "cron:last_health"
//   に成功/失敗履歴を 24h TTL で蓄積。Cloudflare Workers Cron Triggers タブで
//   成功率を観測可能 + KV 直接 GET で post-mortem 用に最後の状態を取得可能。
async function scheduledHandler(event, env, ctx) {
  const ts = Date.now();
  const cronExpr = event?.cron || 'unknown';
  try {
    const record = {
      ts,
      cron: cronExpr,
      version: APP_VERSION,
      ok: true,
    };
    if (env.TOKEN_KV) {
      await env.TOKEN_KV.put('cron:last_health', JSON.stringify(record), { expirationTtl: 86400 });
    }
    console.log(JSON.stringify({ level: 'info', msg: 'cron health beacon', ...record }));
  } catch (err) {
    console.error(JSON.stringify({
      level: 'error',
      msg: 'scheduled handler failed',
      err: err?.message,
      stack: (err?.stack || '').slice(0, 300),
      ts,
      cron: cronExpr,
    }));
  }
}

// SUBAGENT-LAIS-COMPREHENSIVE-FIX-V1 (2026-05-01):
//   Hono の `app` を default export していたが、scheduled handler 結線のため
//   `{ fetch, scheduled }` 形式に切替。Cloudflare Workers のモジュール ESM
//   contract を満たす。後方互換: fetch handler は Hono の app.fetch をそのまま使う。
export default {
  fetch: app.fetch,
  scheduled: scheduledHandler,
};
