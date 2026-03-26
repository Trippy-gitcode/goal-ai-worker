import { Hono } from 'hono';
import { corsResponse } from './middleware/cors.js';
import { jsonRes } from './utils/helpers.js';
import { APP_VERSION } from './utils/constants.js';

// Route handlers
import { handleChat, handleChatStream, handleGptSimple } from './routes/chat.js';
import { handleDeepOpenAI, handleDeepGemini, handleDeepClaude, handleDeepClaudeStream } from './routes/deep.js';
import { handleTokenRegister, handleTokenCreate, handleTokenValidate, handleTokenRedeem } from './routes/token.js';
import { handleUsageGet, handleAvatarUpload, handleFeedbackSave } from './routes/misc.js';
import { handleCheckoutCreate, handleCheckoutPortal, handleStripeWebhook } from './routes/checkout.js';
import { handleGoalsList, handleGoalCreate, handleGoalUpdate, handleGoalDelete, handleSuggestRoles, handleSuggestTasks, handleExtractGoals } from './routes/goals.js';
import { handleHistoryGet, handleHistorySave, handleHistoryDelete } from './routes/history.js';
import { handleVoiceTranscribe } from './routes/voice.js';
import { handleReferralCode, handleReferralCreate, handleReferralApply, handleReferralStatus } from './routes/referral.js';
import { handleTesterApply } from './routes/tester.js';
import { handleAIMemoGenerate } from './routes/memo.js';
import { handlePlanStatus } from './routes/plan.js';
import { handleAdminTesters, handleFeedbackList } from './routes/admin.js';
import { handleAccountDelete, handleAccountExport } from './routes/account.js';

const app = new Hono();

// ── CORS middleware ──
app.use('*', async (c, next) => {
  if (c.req.method === 'OPTIONS') {
    return corsResponse(c.env, new Response(null, { status: 204 }), c.req.raw);
  }
  await next();
});

function withCors(c, response) {
  return corsResponse(c.env, response, c.req.raw);
}

// ── Version / Health / Debug ──
app.get('/api/version', (c) => withCors(c, jsonRes({ version: APP_VERSION, deployed_at: new Date().toISOString() })));
app.get('/health', (c) => withCors(c, jsonRes({ status: 'ok', service: 'goal-ai-worker', ts: Date.now() })));

app.post('/api/error-report', async (c) => {
  try {
    const body = await c.req.json();
    const key = `err:${new Date().toISOString().slice(0,13)}`;
    const existing = JSON.parse(await c.env.TOKEN_KV.get(key) || '[]');
    existing.push({ ...body, ip: c.req.header('CF-Connecting-IP') });
    if (existing.length <= 100) await c.env.TOKEN_KV.put(key, JSON.stringify(existing), { expirationTtl: 86400 * 7 });
  } catch(e) {}
  return withCors(c, jsonRes({ ok: true }));
});

app.get('/api/debug/errors', async (c) => {
  const hour = new Date().toISOString().slice(0,13);
  const errors = JSON.parse(await c.env.TOKEN_KV.get(`err:${hour}`) || '[]');
  const prevHour = new Date(Date.now() - 3600000).toISOString().slice(0,13);
  const prevErrors = JSON.parse(await c.env.TOKEN_KV.get(`err:${prevHour}`) || '[]');
  const lastError = JSON.parse(await c.env.TOKEN_KV.get('debug:last_error') || 'null');
  return withCors(c, jsonRes({ lastError, current: errors, previous: prevErrors }));
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

// ── AI Memo ──
app.post('/api/ai-memo/generate', async (c) => withCors(c, await handleAIMemoGenerate(c.req.raw, c.env)));

// ── Admin ──
app.get('/api/admin/testers', async (c) => withCors(c, await handleAdminTesters(c.req.raw, c.env)));

// ── Feedbacks ──
app.post('/api/feedbacks', async (c) => withCors(c, await handleFeedbackSave(c.req.raw, c.env)));
app.get('/api/feedbacks', async (c) => withCors(c, await handleFeedbackList(c.req.raw, c.env)));

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

export default app;
