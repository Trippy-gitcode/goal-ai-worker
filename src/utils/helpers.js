export function jsonRes(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

export function generateId(length = 24) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => chars[b % chars.length]).join('');
}

export function getMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthEndTtl() {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const diff = Math.ceil((endOfMonth - now) / 1000);
  return diff + 3 * 86400;
}

export function getDayKey() {
  const now = new Date(Date.now() + 9 * 3600000);
  return now.toISOString().slice(0, 10);
}

export async function safeCompare(a, b) {
  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 (2026-05-01) — Wave 1 #35 D-05 fix:
  //   try/catch ガードで empty string 引数や TypeError 時に false を返す。
  //   下流の auth handler で `!await safeCompare(...)` パターンが
  //   throw 時に 500 になる挙動を 401/403 reject に statefully 統一。
  try {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    if (a.length === 0 || b.length === 0) return false;
    const encoder = new TextEncoder();
    const keyA = await crypto.subtle.importKey('raw', encoder.encode(a), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sigA = await crypto.subtle.sign('HMAC', keyA, encoder.encode('compare'));
    const keyB = await crypto.subtle.importKey('raw', encoder.encode(b), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sigB = await crypto.subtle.sign('HMAC', keyB, encoder.encode('compare'));
    const bufA = new Uint8Array(sigA);
    const bufB = new Uint8Array(sigB);
    if (bufA.length !== bufB.length) return false;
    let diff = 0;
    for (let i = 0; i < bufA.length; i++) diff |= bufA[i] ^ bufB[i];
    return diff === 0;
  } catch (_) {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 (2026-05-01) — Wave 1 #35 D-02 fix:
//   PostgREST filter injection 対策。25+ call site で raw `${id}` を URL に
//   concat していた問題を、UUID 形式バリデーション + 安全な encode で統一。
// ─────────────────────────────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

/**
 * isValidUuid — UUID v4 / v5 形式を受け入れる。`-` 省略可。
 * PostgREST の eq.<id> 用 ID が UUID 由来と分かっている場面で使う。
 */
export function isValidUuid(s) {
  if (typeof s !== 'string') return false;
  if (s.length < 32 || s.length > 36) return false;
  return UUID_REGEX.test(s);
}

/**
 * safePgrestValue — PostgREST filter value のエスケープヘルパー。
 *   PostgREST は `&` を AND-separator、`,` を OR-separator として扱うため、
 *   user-controlled input を生で `eq.${value}` に concat すると filter
 *   injection になる (D-02)。本関数で encodeURIComponent + 制御文字 reject。
 */
export function safePgrestValue(v, opts = {}) {
  if (v == null) return '';
  const s = String(v);
  // 制御文字 / null / 改行は早期 reject
  if (/[\x00-\x1f\x7f]/.test(s)) return '';
  // length 上限 (max 256, 必要なら opts.maxLength で override)
  const max = opts.maxLength || 256;
  if (s.length > max) return '';
  // FIX (external review CRITICAL R-3): encodeURIComponent では PostgREST が
  //   URL decode 後に `,` / `&` を OR/AND separator として再解釈する injection 脆弱性。
  //   PostgREST 値として安全な文字を whitelist 化:
  //   - UUID v4 (alphanumeric + 4 dashes): 認可された ID 形式
  //   - 数値 / boolean: 業務値
  //   - alphanumeric + dash + underscore + dot (例: TKT ID, version 文字列)
  //   それ以外 (`,` `&` `(` `)` `=` `:` `'` `*` 等 PostgREST operator) は reject。
  //   この whitelist は ID / token-like 値専用、自由文 string は別 endpoint で扱う。
  const allowedPattern = opts.pattern || /^[a-zA-Z0-9_\-.]+$/;
  if (!allowedPattern.test(s)) return '';
  // double-encode で defence-in-depth (% も reject されているので冗長だが安全側)
  return encodeURIComponent(s);
}

/**
 * pgrestFilter — `field=eq.${encoded}` の安全な構築。
 *   filter operator 固定 (eq / neq / gt / gte / lt / lte / like / ilike / is / in)。
 */
export function pgrestFilter(field, op, value, opts = {}) {
  const allowedOps = new Set(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in']);
  if (!allowedOps.has(op)) return '';
  if (!/^[a-z_][a-z0-9_]*$/i.test(field)) return '';
  const encoded = safePgrestValue(value, opts);
  if (!encoded) return '';
  return `${field}=${op}.${encoded}`;
}
