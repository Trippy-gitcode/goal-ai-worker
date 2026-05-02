// src/utils/audit_log.js — Round 31 P3#25 fix (2026-05-02): GDPR/個情法 audit trail helper.
//   appendAuditLog は audit_log table へ event を 1 件 insert する best-effort helper。
//   ip / ua は raw 保持せず SHA-256 hash 16 byte (32 hex char) prefix のみ保存し privacy 保護。
//   audit log 失敗で main flow を止めない fail-open ポリシー (try/catch silent return)。
import { supabaseQuery } from './supabase.js';

/**
 * SHA-256 hash の hex 文字列の先頭 32 文字 (= 16 byte) を返す。
 * 入力が空 / falsy の場合は null を返す (insert で NULL 列とする)。
 */
async function sha256Hex32(input) {
  if (!input) return null;
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(String(input)));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

/**
 * appendAuditLog — audit_log table に event を記録 (Supabase REST 経由)。
 *
 * @param {object} env  Cloudflare Worker env (SUPABASE_URL / SUPABASE_SERVICE_KEY)
 * @param {object} opts
 *   - userId    {string|null}  users.id (UUID) — anonymous な場合 null
 *   - eventType {string}       'consent_grant' | 'consent_revoke' | 'data_export' |
 *                              'data_delete' | 'sensitive_opt_in' | 'sensitive_opt_out' 等
 *   - eventData {object|null}  structured detail (任意)
 *   - request   {Request}      Cloudflare Worker Request — header から ip/ua 取得
 *
 * 失敗時は silent return (audit log は best-effort、 main flow を止めない)。
 */
export async function appendAuditLog(env, { userId, eventType, eventData, request } = {}) {
  try {
    if (!eventType) return;
    const ipRaw =
      request?.headers?.get?.('cf-connecting-ip') ||
      request?.headers?.get?.('x-forwarded-for') ||
      '';
    const uaRaw = request?.headers?.get?.('user-agent') || '';
    const ipHash = await sha256Hex32(ipRaw);
    const uaHash = await sha256Hex32(uaRaw);
    await supabaseQuery(env, 'audit_log', 'POST', {
      body: {
        user_id: userId || null,
        event_type: eventType,
        event_data: eventData || null,
        ip_hash: ipHash,
        ua_hash: uaHash,
      },
    });
  } catch (_e) {
    /* silent — audit log は best-effort */
  }
}
