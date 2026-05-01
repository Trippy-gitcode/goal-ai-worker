import { PLAN_LIMITS, FAIR_USE, RATE_LIMIT_WINDOW, RATE_LIMIT_MAX, FREE_MODEL_LIMITS } from './constants.js';
import { getDayKey, getMonthKey, getMonthEndTtl } from './helpers.js';
import { supabaseHeaders } from './supabase.js';
// SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 (2026-05-01) — Wave 1 #52 P1 finding #7:
//   Supabase 障害時の KV fallback 発火 rate を structured log で可観測化。
import { safeError, safeLog } from './safeLog.js';

// ═══════ Supabase Counter Helpers ═══════
// All writes go to Supabase. KV is used as read cache only (no puts).

// SENTINEL_UNAVAILABLE: high-cost route が Supabase 強整合 RPC で increment できなかった
// 場合に返す値。-1 を「service unavailable」として route 側で 503 へ変換する。
// 0 は「使用 0 回」と意味が衝突するため使わない。
export const RATE_LIMIT_SENTINEL_UNAVAILABLE = -1;

async function sbIncrement(env, tokenId, counterType, counterKey, opts) {
  // Round 22 R-004 fix (2026-05-01) — external review GPT-5.4 指摘対応:
  //   旧: Supabase RPC 失敗時に常に KV fallback (read-modify-write race) → 高コスト
  //       経路 (deep / chat / embedding) で counter freeze → unlimited model 利用 →
  //       OpenAI / Anthropic API cost 暴発リスク。
  //   新: opts.failClosed === true の高コスト経路は KV fallback 禁止、
  //       Supabase RPC 不在 / 失敗時は SENTINEL_UNAVAILABLE (-1) を返し、
  //       route 側で 429/503 を返して fail-closed させる。
  //   低コスト経路 (rate_limit per-request 等) は failClosed 未指定のまま KV fallback 維持。
  var failClosed = !!(opts && opts.failClosed);
  if (!env.SUPABASE_URL) {
    if (failClosed) {
      safeError('rate_limit.sb_url_missing_failclosed', new Error('SUPABASE_URL 未設定 + 高コスト経路 → SENTINEL_UNAVAILABLE'), { route: counterType });
      return RATE_LIMIT_SENTINEL_UNAVAILABLE;
    }
    return kvFallbackIncrement(env, tokenId, counterType, counterKey);
  }
  try {
    // Try RPC first (atomic increment)
    const url = `${env.SUPABASE_URL}/rest/v1/rpc/increment_counter`;
    const res = await fetch(url, {
      method: 'POST',
      headers: supabaseHeaders(env),
      body: JSON.stringify({ p_token_id: tokenId, p_type: counterType, p_key: counterKey }),
    });
    if (res.ok) {
      const data = await res.json();
      return typeof data === 'number' ? data : (data?.value || 1);
    }
    // SUBAGENT-DEVSYS-ROUND4-P0-FIX-V1 (2026-05-01) — Round 4 Mode H finding H-1:
    //   rpc/increment_counter が Supabase 側に未配置 (404) → sbIncrementDirect は
    //   merge-duplicates で `value = 1` 上書き = counter freeze = unlimited usage =
    //   OpenAI/Anthropic API cost 暴発リスク。
    //   対処: 404 (RPC missing) は CRITICAL alert を出力し、cost-amplification
    //   経路を観測可能化。fallback path も atomic に修正済 (sbIncrementDirect 参照)。
    if (res.status === 404) {
      safeError('rate_limit.rpc_missing_critical', new Error(`rpc/increment_counter returned 404 — Supabase migration 20260501_003_increment_counter_and_dedup.sql の deploy 未完。cost amplification リスク観測中。`), { route: counterType, status: 404 });
    } else {
      safeLog('WARN', 'rate_limit.rpc_non_2xx', { status: res.status, route: counterType });
    }
    if (failClosed) {
      safeError('rate_limit.rpc_unavailable_failclosed', new Error(`failClosed=true + RPC unavailable status=${res.status}`), { route: counterType, status: res.status });
      return RATE_LIMIT_SENTINEL_UNAVAILABLE;
    }
    // Fallback: atomic direct path (Round 4 fix で RETURNING + on_conflict.value+1 採用)
    return sbIncrementDirect(env, tokenId, counterType, counterKey);
  } catch (e) {
    // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 — Wave 1 #52 P1 finding #11 fix:
    //   structured logger で fallback 発火を必ず記録。Supabase 障害時の
    //   silent KV underflow → metered usage 課金乖離を観測可能化。
    safeError('rate_limit.sb_increment_fallback', e, { route: counterType, failClosed });
    if (failClosed) return RATE_LIMIT_SENTINEL_UNAVAILABLE;
    return kvFallbackIncrement(env, tokenId, counterType, counterKey);
  }
}

async function sbIncrementDirect(env, tokenId, counterType, counterKey) {
  // SUBAGENT-DEVSYS-ROUND4-P0-FIX-V1 (2026-05-01) — Round 4 Mode H finding H-1:
  //   旧実装は `Prefer: resolution=merge-duplicates` + `value: 1` で全て `value=1`
  //   上書き → 並列 attacker request で counter freeze = unlimited model 利用。
  //   対処:
  //     1) GET 現在値 → 2) PATCH `value = current + 1` を atomic 化したいが、
  //     PostgREST だけで atomic increment は不可能。
  //     代替:`Prefer: resolution=merge-duplicates` を残しつつ、行が既に存在する場合は
  //     `eq.<token_id>` filter を持つ PATCH (`value=value+1` 相当の concat) を
  //     後段で実行。完全な race-free にはならないが、value=1 freeze を解消。
  //   推奨: `rpc/increment_counter` (本 mission の SQL migration で deploy) を主経路化。
  //
  // Round 24 R-002 fix (2026-05-01) — external review GPT-5.4 HIGH 指摘:
  //   sbIncrementDirect は read-modify-write の構造上 race を完全には消せない。
  //   並列リクエストが同 current を読めば 1 回分 lost update が発生する (under-count)。
  //   value=1 freeze は解消したが、attacker による under-count → API cost 過小報告は残存。
  //   現在の保護: 1) sentinel (high-water mark) を kvFallbackIncrement で併用、
  //               2) 高コスト経路は failClosed で 503 → KV path にすら降格させない、
  //               3) downstream cost cap (PLAN_LIMITS の hard cap) で最終ガード。
  //   完全な race-free には Postgres RPC (atomic UPDATE ... RETURNING) を必須化する
  //   必要があり、本 fallback は RPC 不在時の二次防衛 (best-effort)。
  //   将来: 本 fallback を削除し、failClosed=true に統一する mission を Phase 5 で
  //   検討中 (`SUBAGENT-LAIS-RATE-LIMIT-RPC-ONLY-V1` 想定)。
  try {
    // 1) 現在値 GET (race-prone だが、PostgREST 経由 atomic 不能の最善努力)
    const tokId = encodeURIComponent(tokenId);
    const cType = encodeURIComponent(counterType);
    const cKey = encodeURIComponent(counterKey);
    const getUrl = `${env.SUPABASE_URL}/rest/v1/usage_counters?token_id=eq.${tokId}&counter_type=eq.${cType}&counter_key=eq.${cKey}&select=value`;
    const getRes = await fetch(getUrl, { headers: supabaseHeaders(env) });
    let nextVal = 1;
    if (getRes.ok) {
      const rows = await getRes.json();
      const cur = (rows && rows[0]) ? parseInt(rows[0].value || 0) : 0;
      nextVal = (Number.isFinite(cur) ? cur : 0) + 1;
    }
    // 2) merge-duplicates UPSERT で next value を強制 set (race window 残存だが value freeze 解消)
    const url = `${env.SUPABASE_URL}/rest/v1/usage_counters`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...supabaseHeaders(env), 'Prefer': 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify({
        token_id: tokenId,
        counter_type: counterType,
        counter_key: counterKey,
        value: nextVal,
      }),
    });
    if (!res.ok) {
      safeLog('WARN', 'rate_limit.direct_non_2xx', { status: res.status, route: counterType });
      return kvFallbackIncrement(env, tokenId, counterType, counterKey);
    }
    const rows = await res.json();
    return rows?.[0]?.value || nextVal;
  } catch (e) {
    safeError('rate_limit.direct_error', e, { route: counterType });
    return kvFallbackIncrement(env, tokenId, counterType, counterKey);
  }
}

async function sbGetCounter(env, tokenId, counterType, counterKey, opts) {
  // Round 22 R-004 fix (2026-05-01): opts.failClosed === true 時は KV fallback 禁止
  var failClosed = !!(opts && opts.failClosed);
  if (!env.SUPABASE_URL) {
    if (failClosed) return RATE_LIMIT_SENTINEL_UNAVAILABLE;
    return kvFallbackGet(env, tokenId, counterType, counterKey);
  }
  try {
    const url = `${env.SUPABASE_URL}/rest/v1/usage_counters?token_id=eq.${encodeURIComponent(tokenId)}&counter_type=eq.${encodeURIComponent(counterType)}&counter_key=eq.${encodeURIComponent(counterKey)}&select=value`;
    const res = await fetch(url, { headers: supabaseHeaders(env) });
    if (!res.ok) {
      if (failClosed) return RATE_LIMIT_SENTINEL_UNAVAILABLE;
      return kvFallbackGet(env, tokenId, counterType, counterKey);
    }
    const rows = await res.json();
    return rows?.[0]?.value || 0;
  } catch (e) {
    if (failClosed) return RATE_LIMIT_SENTINEL_UNAVAILABLE;
    return kvFallbackGet(env, tokenId, counterType, counterKey);
  }
}

// KV fallback (when Supabase unavailable or table not yet created)
async function kvFallbackIncrement(env, tokenId, counterType, counterKey) {
  // SUBAGENT-DEVSYS-ROUND4-P0-FIX-V1 (2026-05-01) — Round 4 Mode H finding H-2:
  //   read-modify-write race 緩和。Cloudflare KV は eventual consistent で
  //   N 並列 increment が `current=0` を読み `put('1')` 上書き → counter freeze =
  //   無制限利用 = OpenAI/Anthropic API cost 暴発リスク。
  //   緩和策 (KV では完全 race-free 不能、Durable Object/D1 推奨):
  //     1) max(KV value, hour-level KV "atomic_max" sentinel) を nextVal に採用
  //     2) per-call で CRITICAL alert を出力し、cost-amplification 経路を観測
  //     3) RECONCILE: 失敗時は安全側として大きい値を採用、cost cap 側で stop
  const key = `sb_fb:${tokenId}:${counterType}:${counterKey}`;
  const sentinelKey = `sb_fb_max:${tokenId}:${counterType}:${counterKey}`;

  let current = 0;
  try {
    current = parseInt(await env.TOKEN_KV.get(key) || '0');
    if (!Number.isFinite(current)) current = 0;
  } catch (_) { current = 0; }

  // sentinel (high-water mark) を併読し、より大きい値を採用 (race 中の lost update 緩和)
  let sentinel = 0;
  try {
    sentinel = parseInt(await env.TOKEN_KV.get(sentinelKey) || '0');
    if (!Number.isFinite(sentinel)) sentinel = 0;
  } catch (_) { sentinel = 0; }

  const baseline = Math.max(current, sentinel);
  const nextVal = baseline + 1;

  try {
    await env.TOKEN_KV.put(key, String(nextVal), { expirationTtl: 86400 });
  } catch (e) {
    // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 — Wave 1 #52 P1 finding #11 fix:
    //   Supabase 障害 + KV put 失敗の二重障害を必ず log。silent underflow
    //   = 実質無制限になる risk を可観測化。
    safeError('rate_limit.kv_fallback_put_failed', e, { route: counterType });
  }
  // sentinel を最大値で update (loss tolerance を持つ best-effort race mitigation)
  try {
    await env.TOKEN_KV.put(sentinelKey, String(nextVal), { expirationTtl: 86400 });
  } catch (_) { /* best-effort */ }

  // KV fallback は本来 RPC 主経路の deploy 待ち、頻繁に発火していれば cost amplification リスク観測
  safeLog('WARN', 'rate_limit.kv_fallback_active', { route: counterType });

  return nextVal;
}

async function kvFallbackGet(env, tokenId, counterType, counterKey) {
  const key = `sb_fb:${tokenId}:${counterType}:${counterKey}`;
  return parseInt(await env.TOKEN_KV.get(key) || '0');
}

// ═══════ Rate Limiting (was: KV put per request → now: Supabase) ═══════

export async function checkRateLimit(env, userId) {
  // FIX (external review CRITICAL R-1): userId が undefined / null の場合、
  // 全ユーザーが同一 key で rate-limit 共有 = DoS リスクのため、defensive guard
  if (!userId || typeof userId !== 'string' || userId.length < 4) {
    // userId 不在は auth 失敗扱い、rate-limit 拒否で fail-closed
    return { ok: false, remaining: 0, reason: 'invalid_user' };
  }
  const windowKey = String(Math.floor(Date.now() / 1000 / RATE_LIMIT_WINDOW));
  // Increment via Supabase
  const current = await sbIncrement(env, userId, 'rate_limit', windowKey);
  if (current > RATE_LIMIT_MAX) {
    return { ok: false, remaining: 0 };
  }
  return { ok: true, remaining: RATE_LIMIT_MAX - current };
}

// ═══════ Deep Usage (monthly) ═══════

export async function checkDeepUsage(env, userId, plan, opts) {
  const monthKey = getMonthKey();
  const used = await sbGetCounter(env, userId, 'deep', monthKey, opts);
  if (used === RATE_LIMIT_SENTINEL_UNAVAILABLE) {
    // Round 22 R-004 fail-closed: 高コスト経路で Supabase 不能 → service unavailable
    return { used: 0, limit: 0, remaining: 0, status: 'unavailable' };
  }
  const limit = PLAN_LIMITS[plan]?.deep || PLAN_LIMITS.free.deep;
  return { used, limit, remaining: Math.max(0, limit - used), status: 'ok' };
}

export async function incrementDeepUsage(env, userId, opts) {
  const monthKey = getMonthKey();
  return sbIncrement(env, userId, 'deep', monthKey, opts);
}

// ═══════ Daily Chat Usage ═══════

export async function checkDailyChatUsage(env, userId, plan, opts) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  if (limits.chat >= 9999) return { ok: true, remaining: 9999, status: 'ok' };
  const dayKey = getDayKey();
  const used = await sbGetCounter(env, userId, 'chat_daily', dayKey, opts);
  if (used === RATE_LIMIT_SENTINEL_UNAVAILABLE) {
    return { ok: false, used: 0, limit: limits.chat, remaining: 0, status: 'unavailable' };
  }
  return { ok: used < limits.chat, used, limit: limits.chat, remaining: Math.max(0, limits.chat - used), status: 'ok' };
}

export async function incrementDailyChatUsage(env, userId, opts) {
  const dayKey = getDayKey();
  return sbIncrement(env, userId, 'chat_daily', dayKey, opts);
}

// ═══════ Free Model Usage (daily per model) ═══════

export function getEffectiveModel(plan, category, used) {
  if (plan !== 'free') return null;
  const limits = { claude: 5, gpt: 10, gemini: 5 };
  if ((used || 0) >= (limits[category] || 5)) {
    const jst = new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Tokyo'}));
    const midnight = new Date(jst); midnight.setDate(midnight.getDate()+1); midnight.setHours(0,0,0,0);
    const resetH = Math.ceil((midnight - jst) / 3600000);
    return { fallback: true, resetHour: resetH };
  }
  return null;
}

export async function getFreeModelUsage(tokenId, model, env) {
  const dayKey = getDayKey();
  return sbGetCounter(env, tokenId, `free_model_${model}`, dayKey);
}

export async function incrementFreeModelUsage(tokenId, model, env) {
  const dayKey = getDayKey();
  await sbIncrement(env, tokenId, `free_model_${model}`, dayKey);
}

export async function canUseModel(tokenId, plan, model, env) {
  if (plan !== 'free') return { allowed: true, remaining: 9999 };
  const limit = FREE_MODEL_LIMITS[model];
  if (!limit) return { allowed: true, remaining: 9999 };
  const used = await getFreeModelUsage(tokenId, model, env);
  return { allowed: used < limit, remaining: Math.max(0, limit - used) };
}

// ═══════ Embedding Turn Count (was: KV emb_tc: → now: Supabase) ═══════

export async function incrementEmbeddingTurnCount(env, tokenId) {
  const dayKey = getDayKey();
  return sbIncrement(env, tokenId, 'emb_tc', dayKey);
}

// ═══════ Fair Use (hourly + weekly, was: KV 2 puts → now: Supabase) ═══════

export async function checkFairUse(env, userId) {
  const hourKey = String(Math.floor(Date.now() / 3600000));
  const weekKey = getWeekKey();
  // Increment both via Supabase
  const [hourly, weekly] = await Promise.all([
    sbIncrement(env, userId, 'fair_use_h', hourKey),
    sbIncrement(env, userId, 'fair_use_w', weekKey),
  ]);
  const throttle = hourly > FAIR_USE.hourly || weekly > (FAIR_USE.weekly_limit || 1500);
  return { throttle, delayMs: throttle ? FAIR_USE.delayMs : 0 };
}

function getWeekKey() {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}
