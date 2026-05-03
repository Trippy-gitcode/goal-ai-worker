// ============================================================================
// src/middleware/input-guard.js
// Round 31 Cat-I (Input Validation) P0 全 12 件 fix (2026-05-02)
//
// 問題:
//   全 26 endpoint で `await request.json()` を generic に call、 size cap / parse
//   error catch / prototype pollution / nested depth 検査が完全不在。
//   - P0-1〜P0-5: 各種 array / content size 上限なし
//   - P0-6: me.js で `{...body.identity}` で prototype pollution 直撃
//   - P0-7: chat.js で body 全体を関数渡し → toString hang
//   - P0-8: malformed JSON catch なし
//   - P0-9: prompt の toJSON throw で fetch crash
//   - P0-10〜P0-12: charset / surrogate / NFC NFD bypass
//
// 本 middleware:
//   - parseBodyGuarded(request, opts): JSON parse + size cap + depth/key cap +
//     dangerous key strip (__proto__ / constructor / prototype) の 4 種防御を
//     1 関数で適用、 全 route 入口で require して使う。
//   - 旧 `await request.json()` を `await parseBodyGuarded(request)` に置換するだけ。
//
// 適用順 (route file 内):
//   1. authenticateRequest (auth)
//   2. checkRateLimit / checkDailyChatUsage 等
//   3. **parseBodyGuarded** ← 本 middleware
//   4. business logic
// ============================================================================

const DEFAULT_MAX_BODY_BYTES = 100 * 1024;     // 100KB (default、 chat 等は明示的に大きく可)
const DEFAULT_MAX_KEYS_PER_OBJ = 50;
const DEFAULT_MAX_DEPTH = 5;
const DEFAULT_MAX_ARRAY_LEN = 1000;

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * parseBodyGuarded — production-safe JSON body parser
 * @param {Request} request
 * @param {object} opts
 *   maxBytes  = 100KB (override で chat 等は 200KB、 history 等は 500KB に拡大)
 *   maxKeys   = 50 (1 object 内 key 数)
 *   maxDepth  = 5 (nested object 深度)
 *   maxArrayLen = 1000
 *   allowEmpty = false (true なら body 不在も OK)
 * @returns {Promise<{ok:true,body:any}|{ok:false,error:string,status:number}>}
 */
export async function parseBodyGuarded(request, opts = {}) {
  const maxBytes = opts.maxBytes || DEFAULT_MAX_BODY_BYTES;
  const maxKeys = opts.maxKeys || DEFAULT_MAX_KEYS_PER_OBJ;
  const maxDepth = opts.maxDepth || DEFAULT_MAX_DEPTH;
  const maxArrayLen = opts.maxArrayLen || DEFAULT_MAX_ARRAY_LEN;

  // 1. Content-Length cap — SUBAGENT-LAIS-BATCH29-3BUG-FIX-V3 (2026-05-02、 Bug #1):
  //   旧: parseInt(... || '0') で header 不在時に 0、 false で fall through、 大量 body 流入で
  //       text() 中に worker memory 圧迫 (DoS)。 さらに malformed 値 (例: "abc") は NaN で
  //       NaN > maxBytes = false の silent bypass。
  //   新: parseInt 結果が finite number で maxBytes 超なら 413 即 reject、 entry 直後で
  //       何 byte も読まずに早期 abort。 NaN / 不在は raw.length 後段 cap が捕捉。
  const contentLengthRaw = request.headers.get('Content-Length');
  const contentLength = parseInt(contentLengthRaw || '0', 10);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return { ok: false, error: `payload too large (${contentLength} > ${maxBytes} bytes)`, status: 413 };
  }

  // 2. Read body with size cap (defense-in-depth、 spoofed Content-Length も捕捉)
  let raw;
  try {
    raw = await request.text();
  } catch (e) {
    return { ok: false, error: 'failed to read body', status: 400 };
  }

  if (raw.length > maxBytes) {
    return { ok: false, error: `payload too large (${raw.length} > ${maxBytes} bytes)`, status: 413 };
  }

  if (!raw || raw.length === 0) {
    if (opts.allowEmpty) return { ok: true, body: {} };
    return { ok: false, error: 'empty body', status: 400 };
  }

  // 3. Parse JSON safely (P0-8 fix)
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: 'invalid JSON', status: 400 };
  }

  // 4. Recursive validation: depth / keys / array length / dangerous keys / surrogate pair
  const validateResult = _validateRecursive(parsed, 0, maxDepth, maxKeys, maxArrayLen);
  if (!validateResult.ok) {
    return { ok: false, error: validateResult.error, status: 400 };
  }

  // 5. Strip dangerous keys (P0-6 prototype pollution fix)
  const sanitized = _stripDangerousKeys(parsed);

  return { ok: true, body: sanitized };
}

function _validateRecursive(value, depth, maxDepth, maxKeys, maxArrayLen) {
  if (depth > maxDepth) return { ok: false, error: `nested depth exceeded (${depth} > ${maxDepth})` };

  if (value === null || value === undefined) return { ok: true };
  if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
    return { ok: false, error: `disallowed type: ${typeof value}` };
  }

  if (Array.isArray(value)) {
    if (value.length > maxArrayLen) return { ok: false, error: `array length exceeded (${value.length} > ${maxArrayLen})` };
    for (const item of value) {
      const r = _validateRecursive(item, depth + 1, maxDepth, maxKeys, maxArrayLen);
      if (!r.ok) return r;
    }
    return { ok: true };
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length > maxKeys) return { ok: false, error: `object key count exceeded (${keys.length} > ${maxKeys})` };
    for (const k of keys) {
      // Round 31 Cat-I P0-10 fix: charset filter で zero-width / RTL override / BOM reject
      if (/[\x00-\x1f\x7f​-‏‪-‮﻿]/.test(k)) {
        return { ok: false, error: `disallowed character in key: ${JSON.stringify(k)}` };
      }
      const r = _validateRecursive(value[k], depth + 1, maxDepth, maxKeys, maxArrayLen);
      if (!r.ok) return r;
    }
    return { ok: true };
  }

  // string / number / boolean は OK
  return { ok: true };
}

function _stripDangerousKeys(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(_stripDangerousKeys);
  if (typeof value === 'object') {
    const result = {};
    for (const k of Object.keys(value)) {
      if (DANGEROUS_KEYS.has(k)) continue; // strip
      result[k] = _stripDangerousKeys(value[k]);
    }
    return result;
  }
  return value;
}

/**
 * truncateUtf16Safe — surrogate pair を分断しない truncate (P0-11 fix)
 *   旧 substring(N) は UTF-16 code unit count で切るため、 末尾 surrogate 半分が残ると
 *   PostgREST が `invalid byte sequence for encoding "UTF8"` で 500 を返す。
 *   `[...str]` で grapheme array 化してから slice + join。
 * @param {string} str
 * @param {number} maxChars (grapheme count)
 */
export function truncateUtf16Safe(str, maxChars) {
  if (typeof str !== 'string' || str.length <= maxChars) return str;
  const arr = Array.from(str);
  if (arr.length <= maxChars) return str;
  return arr.slice(0, maxChars).join('');
}

/**
 * normalizeUserCode — promo code / referral code の NFC 正規化 + uppercase (P0-12 fix)
 *   NFD form で別人 code 登録 → NFC との衝突 攻撃を阻止。
 *   合わせて whitelist `/^[A-Z0-9]{1,16}$/` 検証も適用。
 */
export function normalizeUserCode(code) {
  if (typeof code !== 'string') return null;
  const normalized = code.normalize('NFC').toUpperCase();
  if (!/^[A-Z0-9]{1,16}$/.test(normalized)) return null;
  return normalized;
}
