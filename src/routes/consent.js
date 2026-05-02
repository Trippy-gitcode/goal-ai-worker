// src/routes/consent.js
// SUBAGENT-LAIS-CAT-J-AUDITLOG-RETENTION-AND-CALLERS-V1 (2026-05-02):
//   Cat-J observability review P0 #2 fix —
//   appendAuditLog 呼出側 配線 (cross-border consent / age-gate endpoint)。
//   GDPR Art.5(2) accountability + 個情法 §28 越境同意 / COPPA §312.5 verifiable
//   parental consent 監督証跡。
//   audit_log は ctx.waitUntil で best-effort 投入、 main response を block しない。
import { jsonRes } from '../utils/helpers.js';
import { authenticateRequest, getUserIdFromToken } from '../middleware/auth.js';
import { supabaseQuery } from '../utils/supabase.js';
import { appendAuditLog } from '../utils/audit_log.js';
import { parseBodyGuarded } from '../middleware/input-guard.js';

/**
 * POST /api/account/consent/cross-border
 * body: { granted: boolean, version: string, ts?: string }
 *   個情法 §28 越境移転同意 record + audit_log 書込。
 */
export async function handleConsentCrossBorder(request, env, ctx) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const guard = await parseBodyGuarded(request, { maxBytes: 4 * 1024 });
  if (!guard.ok) return jsonRes({ error: guard.error }, guard.status);
  const { granted, version, ts } = guard.body || {};
  if (typeof granted !== 'boolean') {
    return jsonRes({ error: 'granted (boolean) required' }, 400);
  }
  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'user not found' }, 404);
  try {
    await supabaseQuery(env, 'users', 'PATCH', {
      filters: `id=eq.${userId}`,
      body: {
        cross_border_consent_at: ts || new Date().toISOString(),
        cross_border_consent_version: version || null,
        cross_border_consent_granted: granted,
      },
    });
  } catch (e) {
    return jsonRes({ error: 'consent update failed' }, 500);
  }
  // audit log は ctx.waitUntil で best-effort、 main flow を block しない
  const auditP = appendAuditLog(env, {
    userId,
    eventType: granted ? 'consent_grant' : 'consent_revoke',
    eventData: { type: 'cross_border', version: version || null, granted },
    request,
  });
  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(auditP);
  } else {
    // test 環境等で ctx 不在の場合は await して silent error
    try { await auditP; } catch (_) { /* fail-open */ }
  }
  return jsonRes({ ok: true });
}

/**
 * POST /api/account/age-gate
 * body: { passed: boolean, declared_age?: number, min_age?: number, ts?: string }
 *   COPPA §312.5 / Apple §5.1.4 / 個情法 14 歳未満 法定代理人同意 監督証跡。
 */
export async function handleAgeGate(request, env, ctx) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const guard = await parseBodyGuarded(request, { maxBytes: 4 * 1024 });
  if (!guard.ok) return jsonRes({ error: guard.error }, guard.status);
  const { passed, declared_age, min_age, ts } = guard.body || {};
  if (typeof passed !== 'boolean') {
    return jsonRes({ error: 'passed (boolean) required' }, 400);
  }
  const userId = await getUserIdFromToken(env, auth.tokenId);
  if (!userId) return jsonRes({ error: 'user not found' }, 404);
  try {
    await supabaseQuery(env, 'users', 'PATCH', {
      filters: `id=eq.${userId}`,
      body: {
        age_gate_passed_at: passed ? (ts || new Date().toISOString()) : null,
        age_gate_min_age: typeof min_age === 'number' ? min_age : null,
        age_gate_declared_age: typeof declared_age === 'number' ? declared_age : null,
      },
    });
  } catch (e) {
    return jsonRes({ error: 'age-gate update failed' }, 500);
  }
  const auditP = appendAuditLog(env, {
    userId,
    eventType: passed ? 'age_gate_pass' : 'age_gate_fail',
    eventData: {
      min_age: typeof min_age === 'number' ? min_age : null,
      declared_age: typeof declared_age === 'number' ? declared_age : null,
    },
    request,
  });
  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(auditP);
  } else {
    try { await auditP; } catch (_) { /* fail-open */ }
  }
  return jsonRes({ ok: true });
}
