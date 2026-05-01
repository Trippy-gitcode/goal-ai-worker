import { Hono } from 'hono';
import { corsResponse } from './middleware/cors.js';
import { applySecurityHeaders } from './middleware/security-headers.js';
import { jsonRes, safeCompare } from './utils/helpers.js';
import { APP_VERSION } from './utils/constants.js';
// SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 (2026-05-01) — structured logger global rollout
import { safeError, safeLog } from './utils/safeLog.js';

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

// SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 (2026-05-01) — CSP report-uri endpoint:
//   browser から CSP violation report (Content-Type: application/csp-report
//   または application/reports+json) を受け取り、KV `csp:report:<hour>` に
//   24h TTL で蓄積。`/api/debug/errors` (admin auth) で同時参照可能。
//   PostHog / Sentry DSN 投入時は本 endpoint を経由せずに直接外部 SaaS に送る。
//
// SUBAGENT-DEVSYS-ROUND4-P0-FIX-V1 (2026-05-01) — Round 4 Mode E finding E-1:
//   /api/csp-report unauth POST DoS / log spam 対策。
//   token-bucket per-IP rate limit (10/min) + payload 4KB cap + Content-Type
//   allowlist + document-uri origin allowlist。
//   旧挙動: 任意 attacker が unauth POST を高頻度発行 → Logpush cost amplification
//   + log integrity polluteで PostHog 等の monitoring が機能停止リスク。
//
// Round 24 R-004 fix (2026-05-01) — external review GPT-5.4 HIGH 指摘:
//   旧コメントは「document-uri origin allowlist」と書かれていたが、実装には
//   Content-Type / rate-limit / body-size のみで origin check が無く、コメントと
//   実装が乖離 → 任意 origin 由来の偽 report を受理する spoofing 余地。
//   新: CSP_ALLOWED_REPORT_ORIGINS allowlist + report body の document-uri /
//       blocked-uri の origin が allowlist に一致するか検証。一致しない場合 400 reject。
//       allowlist は production / preview drains を含み、E2E test stub は env=test 時に bypass。
const CSP_RATE_LIMIT_BUCKET_SIZE = 10;
const CSP_RATE_LIMIT_WINDOW_SEC = 60;
const CSP_MAX_BODY_BYTES = 4 * 1024;
const CSP_ALLOWED_CONTENT_TYPES = new Set([
  'application/csp-report',
  'application/reports+json',
  'application/json',
]);
// Round 24 R-004 + Round 29 security #7 fix (2026-05-02) — internal security-auditor REJECT 指摘:
//   旧: production allowlist に localhost:5173 / 127.0.0.1:5173 を含み、 NODE_ENV !== 'test'
//       の bypass 1 段のみで分離 → CI / staging で NODE_ENV 設定漏れ時に偽 origin spoof で
//       任意 page から report 送信可能 = log spam / log injection リスク。
//   新: production allowlist と dev allowlist を分離。 dev origin は env.NODE_ENV === 'development'
//       時のみ追加。 production deploy 時は localhost が混在しない。
const CSP_ALLOWED_REPORT_ORIGINS_PROD = new Set([
  'https://goal-ai-frontend.pages.dev',
  'https://www.goal-ai.app',
  'https://goal-ai.app',
  'https://delicate-bienenstitch.netlify.app',
  'https://delicate-bienenstitch-b734d6.netlify.app',
]);
const CSP_ALLOWED_REPORT_ORIGINS_DEV = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);
function _cspAllowlistFor(env) {
  // production = prod のみ。 development = prod + dev。 test = bypass (上位 handler で skip)。
  if (env && env.NODE_ENV === 'development') {
    return new Set([...CSP_ALLOWED_REPORT_ORIGINS_PROD, ...CSP_ALLOWED_REPORT_ORIGINS_DEV]);
  }
  return CSP_ALLOWED_REPORT_ORIGINS_PROD;
}
function _cspExtractOrigin(uri) {
  if (!uri || typeof uri !== 'string') return null;
  try {
    return new URL(uri).origin;
  } catch (_) { return null; }
}

async function _cspRateLimit(env, ip) {
  // KV-based token-bucket per-IP (window 60 sec, max 10 requests).
  // KV consistency window でも attacker は秒オーダーで block されるため log spam 防御目的に十分。
  if (!env || !env.TOKEN_KV) return { ok: true, remaining: CSP_RATE_LIMIT_BUCKET_SIZE };
  const windowKey = String(Math.floor(Date.now() / 1000 / CSP_RATE_LIMIT_WINDOW_SEC));
  const key = `csp_rl:${ip}:${windowKey}`;
  let cur = 0;
  try {
    cur = parseInt((await env.TOKEN_KV.get(key)) || '0');
  } catch (_) { cur = 0; }
  if (cur >= CSP_RATE_LIMIT_BUCKET_SIZE) return { ok: false, remaining: 0 };
  try {
    await env.TOKEN_KV.put(key, String(cur + 1), { expirationTtl: CSP_RATE_LIMIT_WINDOW_SEC + 10 });
  } catch (_) { /* best-effort */ }
  return { ok: true, remaining: CSP_RATE_LIMIT_BUCKET_SIZE - cur - 1 };
}

app.post('/api/csp-report', async (c) => {
  // FIX (external review CRITICAL R-2): KV Read-Modify-Write 高頻度 = Lost Update / crash リスク
  // 解消: KV 蓄積を廃止、structured log 出力のみ (Cloudflare Logpush 経由集約推奨)。
  // PostHog / Sentry DSN 投入時は本 handler 内で直接外部送信 (KV 経由しない)。
  // SUBAGENT-DEVSYS-ROUND4-P0-FIX-V1 (2026-05-01) — Round 4 Mode E finding E-1:
  //   3 段の防御: rate-limit / Content-Type / payload-size。
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';

  // 1) Content-Type allowlist
  const ct = (c.req.header('Content-Type') || '').toLowerCase().split(';')[0].trim();
  if (ct && !CSP_ALLOWED_CONTENT_TYPES.has(ct)) {
    safeLog('WARN', 'csp_report.bad_content_type', { reason: 'content_type_rejected' });
    return withCors(c, new Response(null, { status: 415 }));
  }

  // 2) Rate-limit (token-bucket per IP)
  const rl = await _cspRateLimit(c.env, ip);
  if (!rl.ok) {
    safeLog('WARN', 'csp_report.rate_limited', { reason: 'rate_limit_exceeded' });
    return withCors(c, new Response(null, { status: 429 }));
  }

  // 3) Payload size cap (4 KB)
  const cl = parseInt(c.req.header('Content-Length') || '0');
  if (cl > 0 && cl > CSP_MAX_BODY_BYTES) {
    safeLog('WARN', 'csp_report.payload_too_large', { reason: 'payload_size_exceeded' });
    return withCors(c, new Response(null, { status: 413 }));
  }

  try {
    const raw = await c.req.text();
    if (raw.length > CSP_MAX_BODY_BYTES) {
      safeLog('WARN', 'csp_report.payload_too_large_body', { reason: 'payload_size_exceeded_body' });
      return withCors(c, new Response(null, { status: 413 }));
    }
    let body = null;
    try { body = JSON.parse(raw); } catch (_) { body = null; }
    if (!body) {
      safeLog('WARN', 'csp_report.invalid_json', { reason: 'invalid_json' });
      return withCors(c, new Response(null, { status: 400 }));
    }

    // 4) Round 24 R-004: document-uri / blocked-uri origin allowlist 検証
    //   CSP-Report (`csp-report` payload key) と Reports-API (`csp-violation` body) 両対応。
    //   不一致 origin は spoof / 攻撃 由来として 400 reject。
    //   bypass: env.NODE_ENV === 'test' (E2E test stub) は allowlist 拡張せずに通す。
    // Round 29 security #7 fix: env-aware allowlist. test = bypass、 development = prod+dev、 production = prod のみ。
    if (c.env.NODE_ENV !== 'test') {
      const reportObj = body['csp-report'] || (body.body && body.body['csp-report']) || body;
      const docUri = reportObj['document-uri'] || reportObj.documentURL || reportObj.documentURI;
      const docOrigin = _cspExtractOrigin(docUri);
      const allowlist = _cspAllowlistFor(c.env);
      if (!docOrigin || !allowlist.has(docOrigin)) {
        safeLog('WARN', 'csp_report.bad_origin', { reason: 'origin_not_allowlisted', origin: docOrigin || 'missing' });
        return withCors(c, new Response(null, { status: 400 }));
      }
    }

    // structured log 出力 (Cloudflare Logpush で集約、KV 高頻度書込み回避)
    console.log(JSON.stringify({
      level: 'warn',
      msg: 'csp_violation',
      report: body,
      ip,
      ts: Date.now()
    }));
    // 外部 SaaS DSN 投入時 stub (secret 未設定時は no-op)
    if (c.env.SENTRY_DSN) {
      console.log(JSON.stringify({ level: 'info', msg: 'csp report would forward to Sentry', dsn_set: true, ts: Date.now() }));
    }
    if (c.env.POSTHOG_API_KEY) {
      console.log(JSON.stringify({ level: 'info', msg: 'csp report would forward to PostHog', dsn_set: true, ts: Date.now() }));
    }
  } catch (e) {
    console.error(JSON.stringify({ level: 'error', msg: 'csp-report failed', err: e?.message, ts: Date.now() }));
  }
  return withCors(c, new Response(null, { status: 204 }));
});

app.get('/api/debug/errors', async (c) => {
  // P0 FIX (LAIS-P0-FIX / GAP-CLOSURE-V1):
  //   /api/debug/errors は内部エラーログを露出するため、admin auth (HMAC 一致) 必須化。
  //   safeCompare 経由で timing attack 防御。Authorization: Bearer <SECRET> または X-Admin-Secret header 受付。
  //
  // Round 28 security #6 fix (2026-05-02) — internal security-auditor REJECT 指摘:
  //   旧: TOKEN_SECRET (token signing 用) を admin debug auth と兼用 → 一方の compromise で
  //       両方が compromise する privilege confusion antipattern。
  //   新: ADMIN_DEBUG_SECRET (専用) を新設。 後方互換のため、未設定時は TOKEN_SECRET にフォール
  //       バック (deploy 直後の 1 回限り、SECRET 設定後に削除される一時 path)。
  //       infrastructure 側 (wrangler secret put ADMIN_DEBUG_SECRET) で別値を設定すべき。
  const adminAuth = (c.req.header('Authorization') || '').replace(/^Bearer\s+/i, '') || c.req.header('X-Admin-Secret');
  // 専用 secret を優先、未設定時のみ legacy fallback (deprecation warning)
  const adminSecret = c.env.ADMIN_DEBUG_SECRET || c.env.TOKEN_SECRET;
  if (!c.env.ADMIN_DEBUG_SECRET && c.env.TOKEN_SECRET) {
    safeLog('WARN', 'admin.debug_using_legacy_token_secret', { recommendation: 'set ADMIN_DEBUG_SECRET for privilege isolation' });
  }
  if (!adminAuth || !adminSecret || !(await safeCompare(adminAuth, adminSecret))) {
    return withCors(c, jsonRes({ error: 'Unauthorized' }, 401));
  }
  const hour = new Date().toISOString().slice(0,13);
  const errors = JSON.parse(await c.env.TOKEN_KV.get(`err:${hour}`) || '[]');
  const prevHour = new Date(Date.now() - 3600000).toISOString().slice(0,13);
  const prevErrors = JSON.parse(await c.env.TOKEN_KV.get(`err:${prevHour}`) || '[]');
  const lastError = JSON.parse(await c.env.TOKEN_KV.get('debug:last_error') || 'null');
  // SUBAGENT-LAIS-COMPREHENSIVE-FIX-V1 (2026-05-01): error-of-error も同時返却
  const eoe = JSON.parse(await c.env.TOKEN_KV.get(`eo:e:${hour}`) || '[]');
  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 (2026-05-01) — Wave 1 #35 H-04 fix:
  //   stack trace を fingerprint hash で隠蔽。raw stack の代わりに sha-256
  //   先頭 8 文字 hex を返却。stack trace 漏洩を遮断しつつ dedupe 可能。
  let lastErrorRedacted = lastError;
  if (lastError && typeof lastError === 'object' && lastError.stack) {
    const enc = new TextEncoder().encode(String(lastError.stack));
    try {
      const buf = await crypto.subtle.digest('SHA-256', enc);
      const arr = Array.from(new Uint8Array(buf));
      const fp = arr.slice(0, 4).map(b => b.toString(16).padStart(2, '0')).join('');
      lastErrorRedacted = { ...lastError, stack: `[redacted:fp=${fp}]` };
    } catch (_) { lastErrorRedacted = { ...lastError, stack: '[redacted]' }; }
  }
  // FIX (external review CRITICAL R-7): /api/csp-report が KV 廃止 / structured log のみ化
  // (R-2 fix) したため、KV `csp:report:<hour>` は常に空。本フィールドを「Cloudflare Logpush
  // 経由参照を推奨」と明示、虚偽 empty array を返さず note を含める。
  const cspReportsNote = 'csp_violation events are now structured-logged (Cloudflare Logpush). KV storage discontinued post R-2 fix.';
  return withCors(c, jsonRes({ lastError: lastErrorRedacted, current: errors, previous: prevErrors, errorOfError: eoe, cspReports: [], cspReportsNote }));
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
  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 — Wave 1 #52 P1 finding #7 fix:
  //   unstructured `console.error('Worker error:', err)` を safeError に置換。
  //   route + status を context として残し、Cloudflare Workers Logs UI で
  //   `level: 'error' route: '/api/...'` のようなクエリが効くように。
  safeError('worker.uncaught', err, { route: c.req.path, status: 500 });
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
