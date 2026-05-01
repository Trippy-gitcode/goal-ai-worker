/**
 * safeLog.js — PII-aware structured logging helper for Cloudflare Worker logs.
 *
 * Background:
 *   Wave 1 persona reviews #11 (privacy-engineer) and #41 (logging-observability-reviewer)
 *   identified P0 / CRITICAL findings: tokenId / userId / token_id were emitted as plaintext
 *   into `console.log` / `console.error` calls inside chat.js, checkout.js and account.js.
 *   Cloudflare Worker logs (wrangler tail / Logpush / dashboard) persist these as bearer-equivalent
 *   identifiers, breaching individual_information_protection_law §2 (容易照合性) and GDPR Art.5
 *   (data minimisation) / Art.32 (security of processing).
 *
 * Goal:
 *   Provide a single redaction filter so every routes/* file can emit logs without leaking PII.
 *   The helper hashes user identifiers (SHA-256, first 8 hex chars) and masks token-bearing ids
 *   (`prefix…suffix4`). Free-text strings are scanned for incidental PII patterns
 *   (email / IP / token-shaped identifiers) and scrubbed before emission.
 *
 * Output shape:
 *   `console.log` and `console.error` are wrapped to emit a single JSON line so that
 *   Cloudflare Workers Observability can parse facets (event, level, request_id, attrs).
 *
 * Notes:
 *   - This file MUST NOT throw; logging must never break a request path.
 *   - We intentionally do not import any external dependency to keep Worker bundle small.
 *   - SubtleCrypto is available in Cloudflare Workers — async hash.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Allowlisted attribute keys — anything else is dropped before serialisation.
//    This is a defence-in-depth measure: even if a caller forgets to redact, the
//    serialised payload only carries a small, well-defined surface.
// ─────────────────────────────────────────────────────────────────────────────
const ALLOWED_ATTR_KEYS = new Set([
  'event',
  'plan',
  'turns_used',
  'amount_jpy',
  'amount_bucket',
  'intent',
  'route',
  'reason',
  'status',
  'duration_ms',
  'user_hash',
  'token_fp',
  'request_id',
  'goal_id_fp',
  'session_id_fp',
  'subscription_fp',
  'metered_item_fp',
  'context',
  'message',
]);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Pattern scrubbers — applied to every free-text string that flows through
//    safeLog(). Patterns are intentionally conservative; we accept false-positive
//    masking over false-negative leaks.
// ─────────────────────────────────────────────────────────────────────────────
const PATTERNS = [
  { name: 'email', re: /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g, sub: '[REDACTED_EMAIL]' },
  { name: 'ipv4', re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, sub: '[REDACTED_IP]' },
  { name: 'sk_live', re: /sk_live_[A-Za-z0-9]{20,}/g, sub: '[REDACTED_STRIPE_SK]' },
  { name: 'rk_live', re: /rk_live_[A-Za-z0-9]{20,}/g, sub: '[REDACTED_STRIPE_RK]' },
  { name: 'whsec', re: /whsec_[A-Za-z0-9]{20,}/g, sub: '[REDACTED_STRIPE_WHSEC]' },
  { name: 'goog_api', re: /AIza[A-Za-z0-9_\-]{35}/g, sub: '[REDACTED_GOOG_KEY]' },
  { name: 'jwt', re: /eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}/g, sub: '[REDACTED_JWT]' },
  { name: 'bearer', re: /Bearer\s+[A-Za-z0-9._\-]{10,}/gi, sub: 'Bearer [REDACTED]' },
  // goal_test_* / goal_live_* style session tokens — Lais auth tokens
  { name: 'lais_token', re: /goal_(?:test|live)_[A-Za-z0-9]{8,}/g, sub: '[REDACTED_LAIS_TOKEN]' },
  // Generic phone-like 9-12 digits sequence (loose; only redacts standalone runs)
  { name: 'phone', re: /(?<![\w-])\d{9,12}(?![\w-])/g, sub: '[REDACTED_NUM]' },
];

/**
 * scrubString — return a scrubbed copy of the input string.
 * Never mutates input.
 */
export function scrubString(input) {
  if (typeof input !== 'string' || input.length === 0) return input;
  let out = input;
  for (const p of PATTERNS) {
    out = out.replace(p.re, p.sub);
  }
  return out;
}

/**
 * hashIdSync — synchronous fallback fingerprint for ids in hot paths where we
 * cannot await crypto.subtle. Uses a non-cryptographic FNV-1a 32-bit hash and
 * encodes 8 hex chars. Sufficient for collision-resistant *fingerprints* in logs;
 * this is NOT a security primitive.
 */
export function hashIdSync(id) {
  if (id == null) return 'na';
  const s = String(id);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ('00000000' + h.toString(16)).slice(-8);
}

/**
 * hashId — preferred async SHA-256 truncated fingerprint. Use when caller can
 * await. Returns first 8 lowercase hex chars of SHA-256(id).
 */
export async function hashId(id) {
  if (id == null) return 'na';
  try {
    const enc = new TextEncoder().encode(String(id));
    const buf = await crypto.subtle.digest('SHA-256', enc);
    const arr = Array.from(new Uint8Array(buf));
    return arr.slice(0, 4).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (_) {
    return hashIdSync(id);
  }
}

/**
 * fingerprintToken — never log a bearer token whole. Render `prefix…suffix4`.
 * For very short ids, returns a static 'tok_***'.
 */
export function fingerprintToken(token) {
  if (typeof token !== 'string' || token.length < 8) return 'tok_***';
  const head = token.slice(0, 4);
  const tail = token.slice(-4);
  return `${head}***${tail}`;
}

/**
 * filterAttrs — drop any key not in ALLOWED_ATTR_KEYS, scrub string values,
 * recursively walk one level deep for nested objects (logs should be shallow).
 */
function filterAttrs(attrs) {
  if (!attrs || typeof attrs !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (!ALLOWED_ATTR_KEYS.has(k)) continue;
    if (typeof v === 'string') {
      out[k] = scrubString(v);
    } else if (typeof v === 'number' || typeof v === 'boolean' || v == null) {
      out[k] = v;
    } else if (typeof v === 'object') {
      // Shallow object: only stringify after scrub
      try {
        out[k] = scrubString(JSON.stringify(v));
      } catch (_) {
        out[k] = '[unserialisable]';
      }
    }
  }
  return out;
}

/**
 * safeLog — primary entry point. level ∈ {DEBUG,INFO,WARN,ERROR,FATAL}.
 * Emits a single JSON line via console[level] for parser-friendly output.
 *
 * Usage:
 *   safeLog('INFO', 'chat.turn', { user_hash, plan: auth.plan, turns_used, amount_jpy });
 *   safeLog('INFO', 'webhook.upgrade', { token_fp, plan });
 *   safeLog('ERROR', 'chat.fatal', { message: e.message });
 */
export function safeLog(level, event, attrs = {}) {
  const lvl = String(level || 'INFO').toUpperCase();
  const filtered = filterAttrs(attrs);
  const line = {
    ts: new Date().toISOString(),
    level: lvl,
    event: scrubString(String(event || 'unknown')),
    ...filtered,
  };
  let serialised;
  try {
    serialised = JSON.stringify(line);
  } catch (_) {
    serialised = `{"ts":"${line.ts}","level":"${lvl}","event":"serialise_failed"}`;
  }
  if (lvl === 'ERROR' || lvl === 'FATAL') {
    console.error(serialised);
  } else if (lvl === 'WARN') {
    console.warn(serialised);
  } else {
    console.log(serialised);
  }
}

/**
 * safeError — convenience wrapper for catch blocks. Accepts an Error and
 * extracts message + truncated stack while scrubbing potential PII.
 */
export function safeError(event, err, extra = {}) {
  const msg = err && err.message ? scrubString(err.message) : 'unknown';
  const filtered = filterAttrs(extra);
  safeLog('ERROR', event, { message: msg, ...filtered });
}

// Default export covers common case
export default safeLog;
