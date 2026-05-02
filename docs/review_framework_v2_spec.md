# Review Framework v2 — 再発防止仕様

> 制定: 2026-05-02 (Round 30 schema audit で 6 件 latent bug 発見後)
> 根拠: 30 round の review が production-actual issue を体系的に見逃していた事実
> 適用: Lais (goal-ai-worker) の全 future review、 ADV 自己拘束 + subagent dispatch 必須要件

---

## 1. 失敗事例 (本仕様の原点)

Round 22-30 で計 59 件のバグが検出されたが、 そのうち **6 件 (10%)** は **30 round 連続で見逃されていた latent bug** だった:

| Bug | 内容 | 30 round 連続見逃しの理由 |
|---|---|---|
| 1 | `account_atomic_delete` RPC の `referrer_user_id` 列不在 (実際は `referrer_token_id`) | 実 DB schema を query しなかった |
| 2 | `users.user_id` 列不在 (実際は `users.id`) (account delete) | 同上 |
| 3 | `users.user_id` 列不在 (account export endpoint) | 同上 |
| 4 | `users.user_id` 列不在 (chat metered billing) | 同上 + revenue leak が silent fallback で隠蔽 |
| 5 | `increment_turn_usage` RPC 引数不一致 (4 vs 3 args) | RPC signature catalog を引かなかった |
| 6 | `STRIPE_SUCCESS_URL` が stale frontend を指す | production deploy URL を verify しなかった |

加えて **HTTP security headers** (Netlify frontend に CSP/X-Frame 不在) も同種の prod-parity gap で発見。

これらは全て **「production という現実」を見ずに code 抽象空間だけで review していた**ことが原因。

---

## 2. 7 つの構造的 Bias (review framework v1 が患っていた)

| # | Bias | 症状 |
|---|---|---|
| B1 | Production-environment 抽象化 bias | 実 DB schema / deploy 設定 / 実 traffic を見ない |
| B2 | Happy-path bias | 成功時のみ評価、 rollback / DR / IR / capacity exhaustion 不在 |
| B3 | Component-isolation bias | persona ごと領域固定、 境界 / interaction が誰の担当でもない |
| B4 | Static-snapshot bias | 「今のコード」のみ、 build/deploy/rotate/sunset 時間軸不在 |
| B5 | Technical-only bias | engineer/security/qa しかいない、 legal/PM/CS/HR 不在 |
| B6 | Inside-out bias | 自社 code のみ、 外部 vendor 挙動・契約・status 未 verify |
| B7 | Cultural / regional bias | global SaaS 標準のみ、 JP 固有 (PPC/特商法/個情法 28 条) 漏れ |

---

## 3. v2 で必須化するレビュー手順 (7 phase 直列)

各 review は以下 7 phase を順次実行。 1 phase でも skip した review は **「未完」** とみなし、 commit / deploy / Phase 完了宣言を block する。

### Phase A: Production-environment Verify (B1 対策)

**ADV 必須コマンド** (review 着手前に必ず実行):
```bash
# A1. DB schema 全 dump
psql "$SUPABASE_DB_URL" -c "
  SELECT table_name, column_name, data_type FROM information_schema.columns
  WHERE table_schema='public' ORDER BY table_name, ordinal_position;
" > /tmp/prod_schema.txt

# A2. 全 RPC signature catalog
psql "$SUPABASE_DB_URL" -c "
  SELECT proname, pg_get_function_arguments(oid) FROM pg_proc
  JOIN pg_namespace n ON pronamespace=n.oid WHERE n.nspname='public';
" > /tmp/prod_rpc.txt

# A3. 実 deploy URL 確認
curl -sI https://goal-ai-worker.goalai-futoshi.workers.dev/health
curl -sI https://delicate-bienenstitch-b734d6.netlify.app/

# A4. 実 secrets list (worker)
wrangler secret list --env production

# A5. 全 cron / scheduled task active
curl -s "https://api.cloudflare.com/client/v4/accounts/$ID/workers/scripts/$NAME/schedules" -H "Authorization: Bearer $TOKEN"

# A6. 全 fetch URL pattern を src/ から抽出 → schema cross-check
sh scripts/schema_drift_check.sh
```

**完了条件**: A1-A6 全 PASS、 結果が review prompt に含まれている。

### Phase B: Time-axis Review (B4 対策)

各 review は以下 4 時間断面を全て評価:

| 断面 | 評価項目 |
|---|---|
| **Build** | dependency lock pin、 compatibility_date、 supply chain integrity |
| **Deploy** | rollback path、 canary / blue-green、 migration forward/backward compat |
| **Run** | 通常運用 (これまでの review はこれだけ) |
| **Rotate / Sunset** | secret rotation 期日、 vendor SLA renewal、 model deprecation 対応 |

### Phase C: Boundary Review (B3 対策)

interaction を専門に見る persona を 1 件最低必ず assign:
- frontend ↔ Service Worker version mismatch
- worker ↔ KV ↔ Supabase 3 段 cache 伝播
- Stripe webhook ↔ DB ↔ KV 順序保証
- migration ↔ code rollout 順序
- frontend ↔ worker contract drift

### Phase D: Non-technical Review (B5 対策)

review pool に最低 4 persona 含める:
- Legal Counsel (JP + EU)
- Compliance Officer (PPC / GDPR / Apple / Google)
- Product Manager (CVR / churn / NPS / pricing)
- Customer Support (inquiry / refund / dispute triage)

### Phase E: Vendor-side Review (B6 対策)

外部 dashboard / API / contract を直接 verify:
- Stripe Dashboard で Price ID / Webhook / Tax / Connect 設定
- Anthropic Console で model availability / quota
- OpenAI Dashboard で API key scope / billing
- Supabase Dashboard で RLS policies / backups / region
- Cloudflare Dashboard で WAF / Cron / R2 / Logpush

### Phase F: Regional / Local Compliance Review (B7 対策)

JP 固有 + 適用 jurisdiction 全件:
- 個人情報保護法 (PPC 報告義務 / 28 条越境移転)
- 特定商取引法 (定期購入確認画面)
- 消費者契約法
- 資金決済法 (前払式の場合)
- 著作権法 (AI 生成物の権利帰属)
- 景品表示法
- 電気通信事業法 (chat 履歴の通信秘密)

### Phase G: Failure-mode Review (B2 対策)

以下 8 failure mode を全 path で評価:
1. Network failure (offline / slow / spotty)
2. Vendor outage (Stripe / Anthropic / Supabase / CF / Netlify いずれか down)
3. Account 凍結 (vendor side で account suspended)
4. Capacity exhaustion (Workers CPU / KV ops / Supabase rows / API quota)
5. Race conditions (concurrent requests, KV eventual consistency)
6. Replay / retry attack (Stripe webhook duplicate, idempotency violation)
7. Partial failure (1 step succeeds, next fails)
8. Time skew (clock drift, JWT exp, cron mistiming)

---

## 4. Review 完了判定 (機械強制)

`scripts/review_framework_v2_check.sh` を新設、 以下を CI で機械強制:

```bash
# 各 review session の output に以下 7 phase の証拠が含まれているか check
grep -q "Phase A: Production verify" $REVIEW_OUTPUT && \
grep -q "Phase B: Time-axis" $REVIEW_OUTPUT && \
grep -q "Phase C: Boundary" $REVIEW_OUTPUT && \
grep -q "Phase D: Non-tech" $REVIEW_OUTPUT && \
grep -q "Phase E: Vendor" $REVIEW_OUTPUT && \
grep -q "Phase F: Regional" $REVIEW_OUTPUT && \
grep -q "Phase G: Failure-mode" $REVIEW_OUTPUT
```

### 判定 fail = review 「未完」 として扱う、 commit / Phase 宣言不可

---

## 5. ADV 自己拘束ルール (Round 30 以降)

| ルール | 違反検出時 |
|---|---|
| ADV は review 着手前に Phase A の 6 コマンドを必ず実行 | `verify/adv_violation_log.md` 自動記録 |
| review 完了宣言時に Phase A-G 全件証拠提示必須 | 同上 |
| 「自信あり」発言は production で **24h smoke + paid user 退会 / refund / multi-device 全 flow 実機 PASS** 後のみ可 | 同上 |
| Latent bug 検出時は「review が見逃した」と分類、 同種他箇所を grep audit 必須 | 同上 |

---

## 6. Phase 5 mission として登録 (本 spec の自動化)

| ID | mission | 効果 |
|---|---|---|
| F-RFV2-A | scripts/prod_verify_phase_a.sh | Phase A 6 コマンドを 1 script 化 |
| F-RFV2-CHECK | scripts/review_framework_v2_check.sh | 上記 7 phase の grep-based 強制 |
| F-RFV2-PERSONA | docs/persona_pool_v2.md | 既存 60 persona に Legal/PM/CS/Vendor/Boundary/Regional persona 追加 |
| F-RFV2-CRON | nightly review framework v2 audit cron | 24h ごとに schema_drift / deploy URL drift / cert 期限 / vendor status 全件 check |

---

## 7. 適用開始

本 spec は **2026-05-02 以降の全 review に即適用**。 過去の review 成果物 (Round 1-30) は本 spec 不適用、 但し latent bug 検出ごとに同種 audit を retroactively 実行。
