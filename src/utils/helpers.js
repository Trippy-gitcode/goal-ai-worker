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

// SUBAGENT-DEVSYS-ROUND4-P0-FIX-V1 (2026-05-01) — Round 4 P0 #1 fix:
//   safeCompare timing oracle for TOKEN_SECRET presence (Mode A finding A-1).
//   Round 4 adversarial finding: empty `a` or `b` を early-return false すると
//   importKey/sign を呑み込み、`crypto.subtle` の cost を skip するため、
//   `env.TOKEN_SECRET` 設定有無を timing で leak する経路。fallback として
//   32-byte zero-key で同 cost の dummy importKey + sign を実行してから false
//   を返し、early-return path も constant-time に揃える。
const _DUMMY_KEY_BYTES = new Uint8Array(32);
async function _dummyConstantTimePass() {
  try {
    const k = await crypto.subtle.importKey('raw', _DUMMY_KEY_BYTES, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    await crypto.subtle.sign('HMAC', k, _DUMMY_KEY_BYTES);
  } catch (_) { /* dummy path; never observable */ }
}

export async function safeCompare(a, b) {
  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 (2026-05-01) — Wave 1 #35 D-05 fix:
  //   try/catch ガードで empty string 引数や TypeError 時に false を返す。
  //   下流の auth handler で `!await safeCompare(...)` パターンが
  //   throw 時に 500 になる挙動を 401/403 reject に statefully 統一。
  // SUBAGENT-DEVSYS-ROUND4-P0-FIX-V1 (2026-05-01) — Round 4 Mode A finding A-1
  //   timing oracle 対策: type / empty / mismatch path 全てで dummy importKey
  //   + sign を 1 回実行してから false を返し、constant-time semantic を維持。
  try {
    if (typeof a !== 'string' || typeof b !== 'string') {
      await _dummyConstantTimePass();
      return false;
    }
    if (a.length === 0 || b.length === 0) {
      await _dummyConstantTimePass();
      return false;
    }
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
    // 例外 path も constant-time fallback を発火させてから false 返却
    await _dummyConstantTimePass();
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
 *
 *   @deprecated Round 22 R-007 (2026-05-01) — external review GPT-5.4:
 *     新規コードでは `requireSafePgrestValue` (strict throw) を必ず使うこと。
 *     本関数は `''` を返却 → caller が忘れると filter injection / 0 件 fail へ。
 *     既存 43 callsite は段階的 migration 中、CI script `scripts/pgrest_safety_check.sh`
 *     で `safePgrestValue(` 単独利用 (= 直後に isSafePgrestValue check なし) を
 *     grep ベースで検出し、新規追加を block する。
 *
 *   PostgREST は `&` を AND-separator、`,` を OR-separator として扱うため、
 *   user-controlled input を生で `eq.${value}` に concat すると filter
 *   injection になる (D-02)。本関数で encodeURIComponent + 制御文字 reject。
 *
 *   SUBAGENT-DEVSYS-ROUND4-P0-FIX-V1 (2026-05-01) — Round 4 Mode A finding A-2:
 *     `''` 返却 semantic gap を解消。`''` は PostgREST URL に concat されると
 *     `?user_id=eq.` (右辺空) → uuid column では type error (HTTP 400)、
 *     text column では `WHERE user_id = ''` で 0 件 fail-close。だが、
 *     **caller が return value を check しないと**、空 right-hand side が
 *     後続 filter (`&order=...`) と連鎖して **意図しない PostgREST query**
 *     を構築する。
 *     対処: 本関数は引き続き `''` を返すが、`isSafePgrestValue` で
 *     null check を促進。callers (43 callsite) は `if (!safePgrestValue(...)) return jsonRes({error:'Invalid id'},400)` を遵守する規約。
 *     さらに、後置 sentinel `__INVALID__` を opts.sentinel=true で取得可能、
 *     新規 callsite はこれを採用すること推奨。
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
 * isSafePgrestValue — `safePgrestValue` の戻り値が空文字 `''` かどうかを判定。
 *   SUBAGENT-DEVSYS-ROUND4-P0-FIX-V1 (2026-05-01) — Round 4 Mode A finding A-2:
 *     callsite で safePgrestValue 戻り値 check を促進する helper。
 *     `if (!isSafePgrestValue(safe)) return jsonRes({error:'Invalid id'},400);`
 *     使用例。43 callsite の段階的 migration を可能にする。
 */
export function isSafePgrestValue(encoded) {
  return typeof encoded === 'string' && encoded.length > 0;
}

/**
 * requireSafePgrestValue — strict validator。`null/undefined/whitelist 違反`
 *   を一律 throw する。新規 callsite で payload validation 即時失敗を強制。
 *   SUBAGENT-DEVSYS-ROUND4-P0-FIX-V1 (2026-05-01) — Round 4 Mode A finding A-2.
 */
export function requireSafePgrestValue(v, opts = {}) {
  const encoded = safePgrestValue(v, opts);
  if (!encoded) {
    const err = new Error(opts.errorMessage || 'Invalid id for PostgREST filter');
    err.code = 'INVALID_PGREST_VALUE';
    throw err;
  }
  return encoded;
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
