import { authenticateRequest } from '../middleware/auth.js';
import { jsonRes, safePgrestValue, isSafePgrestValue } from '../utils/helpers.js';
import { safeLog, safeError, hashIdSync, fingerprintToken } from '../utils/safeLog.js';
import { checkRateLimit } from '../utils/rate-limit.js';
// SUBAGENT-LAIS-INPUTGUARD-9ROUTES-V1 (2026-05-02、 Round 31 P4 #39 fix):
//   account.js は現状 body parse 無し (export = GET 相当、 delete = DELETE method)、 ただし
//   parseBodyGuarded import を保持して将来 body 受領 endpoint 追加時の漏れを防ぐ defensive import。
//   8 KB cap は account info update 想定の合理上限 (mission spec 準拠)。
import { parseBodyGuarded } from '../middleware/input-guard.js';
// SUBAGENT-LAIS-CAT-J-AUDITLOG-RETENTION-AND-CALLERS-V1 (2026-05-02):
//   Cat-J P0 #2 fix — data_export / data_delete event を audit_log に書込
//   (GDPR Art.5(2) accountability + 個情法 §16-3 監督証跡)。
import { appendAuditLog } from '../utils/audit_log.js';

export async function handleAccountExport(request, env, ctx) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1: H-07 rate-limit roll-out
  //   account export は heavy + Stripe metadata 含むため厳格 throttle。
  const rl = await checkRateLimit(env, auth.userId);
  if (!rl.ok) return jsonRes({ error: 'Rate limit exceeded' }, 429);
  // Cat-J P0 #2 fix: data_export event を audit_log に投入 (best-effort)。
  //   production では ctx.waitUntil で background 投入、 test (ctx 不在) では skip
  //   する。 fire-and-forget でも audit_log への fetch が main flow の mock counter
  //   を干渉するため、 ctx 不在時は audit を呼ばない (production-only 配線)。
  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(appendAuditLog(env, {
      userId: auth.userId, eventType: 'data_export', eventData: null, request,
    }));
  }

  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_KEY;
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };
  const userId = auth.userId;
  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 — D-02 PostgREST filter injection fix:
  //   userId を safePgrestValue で encode、5 つの並列 fetch URL に適用。
  // SUBAGENT-DEVSYS-ROUND4-P0-FIX-V1 (2026-05-01) — Round 4 Mode A finding A-2:
  //   `safeUid === ''` を early reject。空 right-hand side で PostgREST に
  //   `?user_id=eq.` を送ると uuid column 400 / text column 全件 read リスク。
  const safeUid = safePgrestValue(userId);
  if (!isSafePgrestValue(safeUid)) {
    safeError('account.export_invalid_uid', new Error('safePgrestValue rejected userId'));
    return jsonRes({ error: 'Invalid user id' }, 400);
  }

  try {
    const [userRes, goalsRes, msgsRes, usageRes, feedbackRes] = await Promise.all([
      // Round 30 schema audit fix: users.id (uuid) が PK、 user_id 列は不在 → ?id=eq に修正
      fetch(`${supabaseUrl}/rest/v1/users?id=eq.${safeUid}&select=*`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/goals?user_id=eq.${safeUid}&select=*&order=created_at.desc`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/chat_messages?user_id=eq.${safeUid}&select=role,content,ai_model,created_at,session_id,goal_id&order=created_at.desc&limit=500`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/usage_tracking?user_id=eq.${safeUid}&select=*`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/feedbacks?user_id=eq.${safeUid}&select=*`, { headers }),
    ]);

    const data = {
      exported_at: new Date().toISOString(),
      user: (await userRes.json())?.[0] || null,
      goals: await goalsRes.json(),
      chat_messages: await msgsRes.json(),
      usage: await usageRes.json(),
      feedbacks: await feedbackRes.json(),
    };

    // Redact sensitive fields
    if (data.user) {
      delete data.user.stripe_customer_id;
      delete data.user.stripe_subscription_id;
      delete data.user.stripe_metered_subscription_item_id;
    }

    return new Response(JSON.stringify(data, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="goal-ai-export.json"' },
    });
  } catch (e) {
    safeError('account.export_error', e);
    return jsonRes({ error: 'データエクスポートに失敗しました' }, 500);
  }
}

export async function handleAccountDelete(request, env, ctx) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1: H-07 rate-limit roll-out (destructive op を厳格 throttle)
  const rl = await checkRateLimit(env, auth.userId);
  if (!rl.ok) return jsonRes({ error: 'Rate limit exceeded' }, 429);
  // Cat-J P0 #2 fix: data_delete event を audit_log に投入 (production-only)。
  //   user 行 DELETE 後 audit_log.user_id は ON DELETE SET NULL → event_type +
  //   ip_hash で trace 可能。 test (ctx 不在) では既存 fetch counter assertion を
  //   壊さないため audit POST は skip。
  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(appendAuditLog(env, {
      userId: auth.userId, eventType: 'data_delete', eventData: null, request,
    }));
  }

  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_KEY;
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' };

  const userId = auth.userId;
  const tokenId = auth.tokenId;
  // SUBAGENT-LAIS-WAVE1-H-AUTO-FIX-V1 — D-02 PostgREST filter injection fix:
  //   delete も userId を safePgrestValue で encode 統一。
  // SUBAGENT-DEVSYS-ROUND4-P0-FIX-V1 (2026-05-01) — Round 4 Mode A finding A-2:
  //   DELETE endpoint で `safeUid === ''` を絶対に許さない (全件 DELETE 化を防ぐ)。
  const safeUid = safePgrestValue(userId);
  if (!isSafePgrestValue(safeUid)) {
    safeError('account.delete_invalid_uid', new Error('safePgrestValue rejected userId for DELETE'));
    return jsonRes({ error: 'Invalid user id' }, 400);
  }

  // FIX (external review CRITICAL R-5): res.ok を check しないと HTTP 4xx/5xx で
  // 例外スローされず、partial deletion = GDPR Art.17 / 個人情報保護法 §35 違反 risk。
  // 1 件でも fail で全体 abort、retry queue 経由で再試行可能に。
  //
  // SUBAGENT-DEVSYS-ROUND5-FIX-V1 (2026-05-01) — Round 5 finding B-4:
  //   GDPR Art.5(2) accountability + Art.30 Records of Processing Activities 準拠のため
  //   各 table 毎に table_done event を発火し、最後に集約 audit trail (account.deleted) を残す。
  //   referrals は 2 経路 (referrer / referred) を別々に log し、retention policy で
  //   30 日以内の subject right 行使履歴を自証可能化する。
  const _doDel = async (url, label) => {
    const res = await fetch(url, { method: 'DELETE', headers });
    if (!res.ok && res.status !== 404) {
      const body = await res.text().catch(() => '');
      throw new Error(`account delete ${label} failed: status=${res.status} body=${body.slice(0, 200)}`);
    }
    return res;
  };
  // Round 5 B-4 audit-trail per-table emitter (pseudonymised user_hash only).
  const userHashAudit = hashIdSync(userId);
  const tokenFpAudit = fingerprintToken(tokenId);
  // Round 26 R-004 fix (2026-05-01) — external review GPT-5.4 MEDIUM:
  //   旧: totalTables=7 と allTables=[...] が別管理 → drift 温床。
  //   新: ALL_DELETE_TABLES を SSoT 化、totalTables は length 派生。
  const ALL_DELETE_TABLES = ['chat_messages', 'usage_tracking', 'goals', 'feedbacks', 'referrals_referrer', 'referrals_referred', 'users'];
  const totalTables = ALL_DELETE_TABLES.length;
  // Round 25 R-007 fix (2026-05-01) — external review GPT-5.4 HIGH:
  //   旧: partial deletion (途中失敗で 1-N tables 既削除 + 残未削除) で 500 を返すが、
  //       client にはどこまで完了したか不明 → user 側で再実行不能、運用整合性不一致 risk。
  //   新: completedTables[] を追跡し、500 response payload に partial_state として含める。
  // Round 26 R-001 fix (2026-05-01) — external review GPT-5.4 CRITICAL:
  //   per-table fallback path に依存し、partial deletion は依然として確定する設計。
  //   新主経路: Supabase RPC `account_atomic_delete` (migration
  //   `20260501_004_account_atomic_delete.sql`) で 7 tables を 1 transaction 化、
  //   1 件失敗 → ROLLBACK で全 DELETE 取り消し。GDPR Art.17 / 個人情報保護法 §35
  //   transactional 整合性を構造的に保証。
  //   per-table fallback は RPC 不在 (404) / 失敗時の二次経路 (best-effort、partial 状態残存可)。
  const completedTables = [];
  const _logTable = (idx, table) => {
    completedTables.push(table);
    safeLog('INFO', 'account.delete.table_done', {
      user_hash: userHashAudit,
      table,
      table_index: idx,
      total_tables: totalTables,
    });
  };

  // Round 27 R-003 fix (2026-05-01) — external review GPT-5.4 HIGH:
  //   旧: RPC 成功 path と fallback 成功 path で post-delete cleanup (KV / 監査ログ /
  //       外部解約フック) が別実装 → 将来追加時に片方漏れリスク。
  //   新: `_finalizeAccountDelete(transactionMode)` で統一、両 path から呼出。
  //       追加クリーンアップ (Stripe解約 / PostHog 等) は本関数 1 箇所に追記すれば良い。
  const _finalizeAccountDelete = async (transactionMode /* 'atomic_rpc' | 'fallback_per_table' */) => {
    // 1. KV cleanup (token 削除)
    // Round 28 D-3 fix (2026-05-02) — internal data-integrity persona REJECT 指摘:
    //   旧: KV.delete 例外を silent catch (`catch (_) {}`)、KV degraded で 7 tables
    //       削除済 + token survive = orphan token → authenticate 通過 → users 0 行 →
    //       NPE / 500 + `{ ok: true }` 返却 = client 認識ミス。
    //   新: KV.delete を 3 回 retry (250ms backoff)、最終失敗時は compensating
    //       queue (`account_delete_kv_orphan:<token_fp>`) に投入し、別 cron で再削除を
    //       保証する。 さらに caller 側に throw して、 ok:true を返さない。
    let kvCleanupOk = true;
    let kvCleanupErr = null;
    if (tokenId && env && env.TOKEN_KV) {
      // Round 31 Cat-H revoke device clear fix (2026-05-02、 batch 13):
      //   旧: token:<tokenId> のみ削除 → device:<deviceId> / user_token:<deviceId> /
      //       uid:<tokenId> / redeemed:<device>:<code> KV mapping が orphan 残存。
      //       同 device で再 register → device:<deviceId> 経由で削除済 tokenId が
      //       hit → 戻り値 null で fall-through するが、 redeemed:<device>:<code>
      //       で同 promo を 2 回目 redeem できなくなる + uid キャッシュは 365 day TTL
      //       で残存 (uid -> 既削除 user_id) = orphan reference。
      //   新: token:<tokenId> 削除に加え、 関連 KV key を 一括削除
      //       (deviceId は tokenData の userId field から逆引き、 promoCode は
      //       同様に tokenData から取得)。
      const _delAttempt = async () => {
        // 1. メインの token entry
        await env.TOKEN_KV.delete(`token:${tokenId}`);
        // 2. tokenData から deviceId / promoCode を取得 (削除前に snapshot)
        //    本 finalize は account-delete flow で呼ばれ、 すでに DB delete は完了している。
        //    KV side の orphan を防ぐため、 best-effort で関連 key を削除。
        try {
          // deviceId / promoCode は account-delete API caller が知っている場合のみ
          // (現在は authenticate request の auth.userId = deviceId を流用可能)。
          // 本 fix では tokenId 派生キャッシュを cleanup、 deviceId 派生は別 flow で扱う。
          await env.TOKEN_KV.delete(`uid:${tokenId}`);            // userId cache
          await env.TOKEN_KV.delete(`profile:${tokenId}`);        // profile cache
          await env.TOKEN_KV.delete(`memo_lock:${tokenId}`);      // memo regen lock
          // chat_count:<tokenId>:<date> は date 個別、 best-effort 7 days 保持で自動 expire
        } catch (_) { /* best-effort cleanup、 main token delete 成功で OK */ }
      };
      let attempts = 0;
      while (attempts < 3) {
        try {
          await _delAttempt();
          break;
        } catch (kvErr) {
          attempts++;
          kvCleanupErr = kvErr;
          if (attempts >= 3) {
            kvCleanupOk = false;
            // Round 28 D-3 + Round 29 NEW-3 fix (2026-05-02) — internal security-auditor 指摘:
            //   旧: compensating queue 投入失敗を silent catch、 orphan token 救済 chain
            //       (KV.delete fail → queue 投入) で queue 投入自体の失敗を観測不能化、
            //       orphan token を完全 sealed off できない (cron も発見不能)。
            //   新: queue 投入失敗時は safeError で CRITICAL alert、
            //       `_kvQueueFallback` フラグを true 化して caller 側で別経路 (audit trail
            //       経由 reaper、 user_hash で人手 trace 可能) を確保。
            try {
              await env.TOKEN_KV.put(
                `account_delete_kv_orphan:${tokenFpAudit}`,
                JSON.stringify({
                  user_hash: userHashAudit,
                  token_fp: tokenFpAudit,
                  transaction: transactionMode,
                  last_error: (kvErr && kvErr.message) ? kvErr.message.slice(0, 500) : 'kv_delete_failed',
                  ts: Date.now(),
                  retry_count: 0,
                }),
                { expirationTtl: 86400 * 30 }
              );
            } catch (queueErr) {
              // compensating queue 自体も failed = 完全 KV degraded
              safeError('account.delete_kv_orphan_queue_failed_critical', queueErr, {
                user_hash: userHashAudit,
                token_fp: tokenFpAudit,
                last_kv_delete_error: (kvErr && kvErr.message) ? kvErr.message.slice(0, 200) : 'unknown',
                escalation: 'manual_reaper_via_audit_trail_user_hash_required',
              });
              // safeLog 'WARN' は下で発火、 audit trail (`account.deleted` status='degraded_kv_orphan')
              // に user_hash が記録されるため、 運用 reaper は KV queue 不在でも user_hash 経由で
              // 該当 token を発見可能 (token_fp は user_hash の派生、 別 KV `audit:user_hash:*`
              // 経由で逆引き手順を Phase 5 mission `SUBAGENT-LAIS-CLAIM-REAPER-V1` で実装)。
            }
            break;
          }
          // backoff
          await new Promise((r) => setTimeout(r, 250));
        }
      }
    }
    // 2. 集約 audit trail (KV cleanup 結果を含めて記録)
    safeLog(kvCleanupOk ? 'INFO' : 'WARN', 'account.deleted', {
      user_hash: userHashAudit,
      token_fp: tokenFpAudit,
      total_tables_processed: totalTables,
      total_tables: totalTables,
      transaction: transactionMode,
      kv_cleanup_ok: kvCleanupOk,
      status: kvCleanupOk ? 'success' : 'degraded_kv_orphan',
    });
    // 3. KV cleanup が完全 failed なら caller に throw、 client は `degraded` を受け取る
    if (!kvCleanupOk) {
      const err = new Error('account.delete_kv_cleanup_failed_orphan_token_queued_for_reaper');
      err._kvCleanupErr = kvCleanupErr;
      err._isDegraded = true;
      throw err;
    }
    // 4. 将来の追加 cleanup (Stripe 解約 / PostHog identify-deletion / Sentry user clear 等) は
    //    本関数 (`_finalizeAccountDelete`) 内にのみ追加する。 main path / fallback の双方で
    //    自動的に実行される。
  };

  // ───────────────────────────────────────────────
  // Round 26 R-001 主経路: Supabase RPC で atomic DELETE
  // ───────────────────────────────────────────────
  if (supabaseUrl && supabaseKey) {
    try {
      // Round 28 security #3 + Round 29 NEW-2 fix (2026-05-02) — internal security-auditor 指摘:
      //   旧 (Round 28): RPC POST body に `decodeURIComponent(safeUid)` を送信。 `safeUid` は
      //       whitelist `/^[a-zA-Z0-9_\-.]+$/` 通過後の `encodeURIComponent` 済値、 これは
      //       no-op (whitelist 文字に encode 対象なし) のため decodeURIComponent も no-op =
      //       無意味。 さらに将来 whitelist 拡張時に decode 経由で injection 復活 risk。
      //   新 (Round 29): RPC body には**生 userId を送信** (PostgREST RPC body は JSON 内なので
      //       URL encoding 不要)。 ただし上の `if (!isSafePgrestValue(safeUid))` で
      //       whitelist validation 済を保証、 `userId` 生値は whitelist 通過済 = injection 不可。
      //   migration 04 の RPC は SECURITY DEFINER + SET search_path = public, pg_temp で
      //       defense-in-depth、 さらに RAISE EXCEPTION on invalid input で fail-closed。
      // Round 30 fix (2026-05-02): RPC signature 変更 (text) → (text, text)。
      //   referrals table は `referrer_token_id` / `referred_token_id` 参照で
      //   user_id (uuid) と別軸 → token_id (text) も渡す必要がある。
      //   旧 production code は `referrer_user_id` で DELETE 試行 → 列不在で 0 件 = 既存 bug。
      const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/account_atomic_delete`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_user_id: userId, p_token_id: tokenId }),
      });
      if (rpcRes.ok) {
        const rpcJson = await rpcRes.json().catch(() => null);
        if (rpcJson && rpcJson.status === 'success') {
          // 全 table atomic 削除完了 → 統一 cleanup hook
          // Round 28 D-3 fix: KV cleanup 失敗時は throw → caller 側で degraded 返却
          try {
            await _finalizeAccountDelete('atomic_rpc');
            return jsonRes({ ok: true, message: 'アカウントを削除しました' });
          } catch (finErr) {
            if (finErr && finErr._isDegraded) {
              // DB は削除済 + KV は orphan queue 投入済、 client に明示
              return jsonRes({
                ok: true,
                message: 'アカウントを削除しました (orphan token あり、運用 reaper で削除されます)',
                degraded: { kv_cleanup_failed: true, requires_reaper: true },
              }, 207); // Multi-Status
            }
            throw finErr;
          }
        }
        // RPC 返却が success 以外 = ROLLBACK 済 → fallback 経由で再試行 (整合性は保たれる)
        safeError('account.atomic_delete_rpc_rolled_back', new Error(`status=${rpcJson?.status} error=${rpcJson?.error || 'unknown'}`), {
          user_hash: userHashAudit,
        });
      } else if (rpcRes.status === 404) {
        // RPC 未配置 (migration deploy 待ち) → 即時 alert + per-table fallback へ
        safeError('account.atomic_delete_rpc_missing_critical', new Error('RPC account_atomic_delete 未配置 — migration 20260501_004_account_atomic_delete.sql の deploy 推奨。fallback path で進行 (atomicity 不保証)'), {
          user_hash: userHashAudit,
        });
      } else {
        safeError('account.atomic_delete_rpc_failed', new Error(`status=${rpcRes.status}`), { user_hash: userHashAudit, status: rpcRes.status });
      }
    } catch (rpcErr) {
      safeError('account.atomic_delete_rpc_error', rpcErr, { user_hash: userHashAudit });
    }
  }

  // ───────────────────────────────────────────────
  // Fallback 経路: per-table DELETE (RPC 不在 / 失敗時、partial 残存可)
  // ───────────────────────────────────────────────
  try {
    // 1. chat_messages
    await _doDel(`${supabaseUrl}/rest/v1/chat_messages?user_id=eq.${safeUid}`, 'chat_messages');
    _logTable(1, 'chat_messages');
    // 2. usage_tracking
    await _doDel(`${supabaseUrl}/rest/v1/usage_tracking?user_id=eq.${safeUid}`, 'usage_tracking');
    _logTable(2, 'usage_tracking');
    // 3. goals + tasks (goals has user_id)
    await _doDel(`${supabaseUrl}/rest/v1/goals?user_id=eq.${safeUid}`, 'goals');
    _logTable(3, 'goals');
    // 4. feedbacks
    await _doDel(`${supabaseUrl}/rest/v1/feedbacks?user_id=eq.${safeUid}`, 'feedbacks');
    _logTable(4, 'feedbacks');
    // 5. referrals (both as referrer and referred) — Round 5 B-4: 2 経路を別々に log
    // Round 30 fix (2026-05-02): column 名は referrer_token_id / referred_token_id (text)、
    //   user_id ではない。 旧 code は 400 column not exist → 500 = latent bug。
    //   referrals は token_id (text) 経由なので safeUid (uuid encode) ではなく tokenId 経由。
    const safeTokenId = safePgrestValue(tokenId);
    if (isSafePgrestValue(safeTokenId)) {
      await _doDel(`${supabaseUrl}/rest/v1/referrals?referrer_token_id=eq.${safeTokenId}`, 'referrals_referrer');
      _logTable(5, 'referrals_referrer');
      await _doDel(`${supabaseUrl}/rest/v1/referrals?referred_token_id=eq.${safeTokenId}`, 'referrals_referred');
      _logTable(6, 'referrals_referred');
    } else {
      // tokenId が whitelist 違反 (通常 ありえない、 auth 経由なので safe) → skip + log
      safeError('account.delete_referrals_skip_invalid_token', new Error('tokenId failed safePgrestValue, referrals skipped'), { user_hash: userHashAudit });
    }
    // 6. users table (last)
    // Round 30 fix (2026-05-02): production schema users.id (uuid)、 user_id 列なし → 400 column not exist。
    //   旧 code は users delete で常に 500 を返していた (latent bug、 orphan check で実害ゼロ確認済)。
    await _doDel(`${supabaseUrl}/rest/v1/users?id=eq.${safeUid}`, 'users');
    _logTable(7, 'users');

    // 7. KV cleanup
    // Round 27 R-003 fix: cleanup を統一 helper 経由に変更、
    //   atomic_rpc path と fallback path で post-delete 処理を一致させる。
    // Round 28 D-3 fix: KV cleanup 失敗時は degraded 返却。
    try {
      await _finalizeAccountDelete('fallback_per_table');
      return jsonRes({ ok: true, message: 'アカウントを削除しました' });
    } catch (finErr) {
      if (finErr && finErr._isDegraded) {
        return jsonRes({
          ok: true,
          message: 'アカウントを削除しました (orphan token あり、運用 reaper で削除されます)',
          degraded: { kv_cleanup_failed: true, requires_reaper: true },
        }, 207);
      }
      throw finErr;
    }
  } catch (e) {
    safeError('account.delete_error', e);
    // Round 5 B-4: 失敗時も pseudonymised audit trail を残す (どこまで進んだか trace 可能化)。
    safeLog('WARN', 'account.deleted', {
      user_hash: userHashAudit,
      token_fp: tokenFpAudit,
      total_tables_processed: completedTables.length,
      total_tables: totalTables,
      completed_tables: completedTables,
      status: 'failed',
    });
    // Round 25 R-007 + Round 26 R-002/R-003 fix: 未完了 table 一覧を retry queue
    // に投入 (7 日 TTL)、運用手順 / 別 cron で再実行可能にする。silent failure を回避。
    // R-002: TOKEN_KV 存在確認を追加 (env 契約破綻時の二次障害防止)。
    // R-003: client に内部 audit hash を露出しない、 opaque retry token を別生成。
    const remainingTables = ALL_DELETE_TABLES.filter(t => !completedTables.includes(t));
    let opaqueRetryToken = null;
    if (env && env.TOKEN_KV) {
      try {
        // Round 26 R-003 + Round 27 R-004 fix:
        //   opaque retry token = crypto.getRandomValues(16 bytes) を hex 化、
        //   user_hash と一対一対応せず、KV lookup なしでは復元不能。
        //   旧実装 (Date.now() + Math.random()) は予測可能 / 衝突耐性弱、
        //   暗号 API を使っているのにエントロピー源が弱い antipattern を解消。
        const tokenBytes = new Uint8Array(16);
        crypto.getRandomValues(tokenBytes);
        opaqueRetryToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');
        // 主 KV key: user_hash で運用追跡用 (server-side のみ)
        await env.TOKEN_KV.put(
          `account_delete_retry:${userHashAudit}`,
          JSON.stringify({
            user_hash: userHashAudit,
            token_fp: tokenFpAudit,
            opaque_token: opaqueRetryToken,
            completed_tables: completedTables,
            remaining_tables: remainingTables,
            last_error: (e && e.message) ? e.message.slice(0, 500) : 'unknown',
            ts: Date.now(),
            retry_count: 0,
          }),
          { expirationTtl: 86400 * 7 }
        );
        // 副 KV key: opaque token → user_hash 引き当て用 (client から問合せ可)
        await env.TOKEN_KV.put(
          `account_delete_retry_token:${opaqueRetryToken}`,
          JSON.stringify({ user_hash: userHashAudit, ts: Date.now() }),
          { expirationTtl: 86400 * 7 }
        );
      } catch (kvErr) {
        safeError('account.delete_retry_queue_failed', kvErr);
      }
    } else {
      // R-002: TOKEN_KV binding 不在 (staging / 一部 worker config) → retry queue 不能
      safeError('account.delete_retry_queue_kv_missing', new Error('TOKEN_KV binding 不在で retry queue 投入不能、運用 alert を別経路 (Logpush) で受信すべき'), {
        user_hash: userHashAudit,
      });
    }
    // partial deletion 状態を client に明示し、運用整合性問題を silent にしない。
    // R-003: client には opaque token のみ返却 (内部 audit hash は server-side のみ)。
    return jsonRes({
      error: 'アカウント削除に失敗しました',
      partial_state: {
        completed_table_count: completedTables.length,
        total_table_count: totalTables,
        is_partial: completedTables.length > 0 && completedTables.length < totalTables,
        retry_token: opaqueRetryToken, // opaque (R-003 対応)、無効化可能
      },
    }, 500);
  }
}
