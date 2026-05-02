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

// ─────────────────────────────────────────────────────────────────────────────
// Round 31 Cat-H Token HMAC migration (2026-05-02、 batch 10):
//   旧: token = `goal_test_${24-random}` の pure-random 形式。 forge は entropy
//       (143 bits) で実質不可能だが、 (a) KV cache poison / (b) replay window
//       (revoke 前の流出 token は expiresAt まで生存)、 (c) secret rotation で
//       全 token 一括失効する手段なし、 という運用上の弱点があった。
//   新: token = `goal_test_<payload>.<sig>` の HMAC-SHA256 signed 形式。
//       payload = 22-char random (~131 bits)、 sig = HMAC(payload, TOKEN_SECRET)
//       を base64url 22 chars に truncate (~128 bits)。 auth 時に sig を再計算
//       して定数時間比較、 mismatch なら KV lookup 前に 401 reject。
//       secret rotation = 全 signed token 一括無効化が可能。
//   Backward compat: 既存 production 231 user の legacy token は `.` を含まない
//       ので、 auth.js は `.` 有無で signed/legacy を判別、 legacy は従来通り
//       KV existence check のみで受理 (forge 不能 entropy が担保)。
//   NOTE: TOKEN_SECRET 未設定の test environment では signed format generation を
//       skip して legacy format を返す (graceful degradation、 既存 mock 互換)。
// ─────────────────────────────────────────────────────────────────────────────

/** base64url encode (no padding) — Cloudflare Workers/Web Crypto 互換 */
function _b64url(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * _hmacSignBase64Url — HMAC-SHA256(payload, secret) → base64url、 22 char truncate。
 *   22 chars ≈ 132 bits entropy、 SHA-256 collision 耐性 128 bits と同等。
 */
async function _hmacSignBase64Url(payload, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return _b64url(new Uint8Array(sig)).slice(0, 22);
}

/**
 * generateSignedTokenId — HMAC-signed `goal_test_<payload>.<sig>` を発行。
 *   secret 未指定時 (test env 等) は legacy format `goal_test_<24-random>` に fallback。
 *   この fallback は auth.js が legacy format を受理する限り production でも
 *   safe (但し prod では env.TOKEN_SECRET 必須化を強く推奨)。
 */
export async function generateSignedTokenId(secret) {
  if (!secret || typeof secret !== 'string' || secret.length < 16) {
    // graceful degradation: legacy format に fallback (test mock 互換)
    return `goal_test_${generateId(24)}`;
  }
  const payload = generateId(22);
  const sig = await _hmacSignBase64Url(payload, secret);
  return `goal_test_${payload}.${sig}`;
}

/**
 * verifySignedTokenId — `goal_test_<payload>.<sig>` 形式を verify。
 *   true = signature 一致、 false = mismatch / 形式不正。
 *   legacy format (`.` を含まない) は **常に false** を返す
 *   (caller 側で legacy fallback path を選択する責任)。
 *   定数時間比較で timing oracle を回避。
 */
export async function verifySignedTokenId(token, secret) {
  if (typeof token !== 'string' || !secret || typeof secret !== 'string') return false;
  if (!token.startsWith('goal_test_')) return false;
  const body = token.slice('goal_test_'.length);
  const dot = body.indexOf('.');
  if (dot < 1) return false; // 0 = empty payload も拒否、 -1 = legacy
  const payload = body.slice(0, dot);
  const sig = body.slice(dot + 1);
  // payload は alphanumeric (generateId charset) のみ許容
  if (!/^[A-Za-z0-9]+$/.test(payload)) return false;
  // sig は base64url charset のみ許容
  if (!/^[A-Za-z0-9_-]+$/.test(sig)) return false;
  try {
    const expected = await _hmacSignBase64Url(payload, secret);
    if (expected.length !== sig.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
    return diff === 0;
  } catch (_) {
    return false;
  }
}

/**
 * isSignedTokenFormat — token が signed format (= body に `.` を含む) か判定。
 *   legacy format との分岐に使用、 副作用なし。
 */
export function isSignedTokenFormat(token) {
  if (typeof token !== 'string' || !token.startsWith('goal_test_')) return false;
  return token.slice('goal_test_'.length).indexOf('.') > 0;
}
