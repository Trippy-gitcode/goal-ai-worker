# Data Governance — PII Inventory SSoT (GOAL AI / Lais)

> **Mission**: Round 5 finding B-1 (P0) — PII inventory SSoT が repo / docs に物理不在 だった問題を解消するため、`docs/data_governance.md` を新設する。
> **Compliance**: GDPR Art.30 (Records of Processing Activities) / 個人情報保護法 §26 (取扱い状況の公表努力義務) / GDPR Art.5(1)(f) (security of processing) / GDPR Art.4(5) (pseudonymisation)。
> **施行日**: 2026-05-01。
> **Owner**: Lais 運営チーム (data steward + privacy engineer)。
> **Review cadence**: 6 ヶ月毎、または PII column 追加 / 削除時に随時。

---

## 1. 目的

GOAL AI (Lais) における Supabase / Cloudflare KV / Cloudflare Workers Logs に格納される全データの **PII (個人情報) classification SSoT** を定義する。`frontend/privacy.html` §2 で開示する 9 項目の取得情報と、code 側の column / KV key / log attribute との **physical mapping** を明示し、GDPR / 個人情報保護法 / PPC ガイドラインへの **accountability** を担保する。

---

## 2. PII Classification 体系 (4 段階)

| classification | 定義 | 取扱い要件 |
|---|---|---|
| **PII (direct)** | 単独で個人を特定可能な情報 (氏名 / メール / 電話 / ID 等) | 暗号化保管必須、retention 最小化、log 直接出力禁止 |
| **pseudonymous** | 単独では個人を特定不能だが、追加情報で照合可能 (user_id / hash 値 / fingerprint) | hash 関数で削減、log 出力時は user_hash / token_fp 形式に redact |
| **sensitive special category** | GDPR Art.9 / 個人情報保護法 §2-3 「要配慮個人情報」 (健康 / 思想 / 信条 / 出自 / 性的指向 / 病歴 等) | 明示同意必須、暗号化必須、retention 短縮 |
| **non-PII** | 個人を特定する情報を含まない (集計値 / system metadata / public 設定) | 通常運用、masking 不要 |

---

## 3. Supabase Tables — Column-level PII Inventory

### 3.1 `users` (中核 user metadata)

| column | classification | privacy.html §2 mapping | retention | 備考 |
|---|---|---|---|---|
| `user_id` (uuid PK) | pseudonymous | (system-internal) | アカウント存続期間中 | サービス内 SSoT、UUID v4 |
| `display_name` | PII (direct) | 「氏名・ニックネーム」 | アカウント存続期間中 | account.delete で即時 DELETE |
| `email` | PII (direct) | 「メールアドレス」 | アカウント存続期間中 | account.delete で即時 DELETE |
| `age` / `occupation` | PII (direct) | 「職業・年齢」 | アカウント存続期間中 | quasi-identifier、年齢 5 歳刻み推奨 |
| `mbti` / `strengths` / `weaknesses` (profile_json) | sensitive special category | 「MBTI・強み・弱み等のプロフィール情報」 | アカウント存続期間中 | 心理プロファイルは要配慮個人情報相当 |
| `stripe_customer_id` | pseudonymous | 「決済情報」 | アカウント存続期間中、退会時 export で redact | Stripe 内 PII を Lais 側では fingerprint のみ保持 |
| `stripe_subscription_id` | pseudonymous | 「決済情報」 | アカウント存続期間中、export で redact | 同上 |
| `stripe_metered_subscription_item_id` | pseudonymous | 「決済情報」 | アカウント存続期間中、export で redact | 同上 |
| `terms_accepted_at` (TIMESTAMPTZ) | non-PII (audit) | 「同意 record」 | 監査記録 (5 年) | 同意取得日時 (Round 5 B-5 fix) |
| `terms_accepted_version` (TEXT) | non-PII (audit) | 「同意 record」 | 監査記録 (5 年) | terms.html 施行日バージョン |
| `privacy_accepted_at` (TIMESTAMPTZ) | non-PII (audit) | 「同意 record」 | 監査記録 (5 年) | 同上 |
| `privacy_accepted_version` (TEXT) | non-PII (audit) | 「同意 record」 | 監査記録 (5 年) | privacy.html 施行日バージョン |
| `cross_border_consent_at` (TIMESTAMPTZ) | non-PII (audit) | 「同意 record」 | 監査記録 (5 年) | 越境移転同意取得日時 (Round 5 A-3 fix) |
| `cookie_consent_settings` (JSONB) | non-PII (audit) | 「同意 record」 | 監査記録 (5 年) | Cookie banner 個別 opt-in 状態 |
| `guardian_consent_at` (TIMESTAMPTZ) | non-PII (audit) | (privacy.html §8) | 監査記録 (5 年) | VPC 取得日時 (未成年用、Round 5 A-6 fix) |
| `guardian_consent_method` (TEXT) | non-PII (audit) | (privacy.html §8) | 監査記録 (5 年) | email / credit_card / id_check |

### 3.2 `goals` / `tasks` (目標管理)

| column | classification | privacy.html §2 mapping | retention | 備考 |
|---|---|---|---|---|
| `goal_id` (uuid PK) | pseudonymous | (system-internal) | アカウント存続期間中 | UUID v4 |
| `user_id` | pseudonymous | (system-internal) | アカウント存続期間中 | FK |
| `title` / `description` | PII (direct) | 「ゴール情報」 | アカウント存続期間中 | 個人の目標 = 自由記述 = PII |
| `metadata` (JSONB) | sensitive special category | 「ゴール情報」 | アカウント存続期間中 | 目標は心理状態に紐付き要配慮個人情報相当 |
| `created_at` / `updated_at` | non-PII | (system-internal) | アカウント存続期間中 | system metadata |

### 3.3 `chat_messages` (AI コーチング履歴)

| column | classification | privacy.html §2 mapping | retention | 備考 |
|---|---|---|---|---|
| `message_id` (uuid PK) | pseudonymous | (system-internal) | アカウント存続期間中、500 件 cap | UUID v4 |
| `user_id` | pseudonymous | (system-internal) | 同上 | FK |
| `role` | non-PII | (system-internal) | 同上 | user / assistant / system |
| `content` | sensitive special category | 「チャット内容」 | 同上、500 件 cap | 心理相談含む = 要配慮個人情報相当 |
| `ai_model` | non-PII | (system-internal) | 同上 | claude / gpt / gemini |
| `session_id` | pseudonymous | (system-internal) | 同上 | UUID |
| `goal_id` | pseudonymous | (system-internal) | 同上 | FK |
| `created_at` | non-PII | (system-internal) | 同上 | timestamp |

### 3.4 `usage_tracking` (利用データ)

| column | classification | privacy.html §2 mapping | retention | 備考 |
|---|---|---|---|---|
| `tracking_id` (uuid PK) | pseudonymous | (system-internal) | アカウント存続期間中、月単位 | UUID |
| `user_id` | pseudonymous | (system-internal) | 同上 | FK |
| `feature_name` | non-PII | 「利用データ」 | 同上 | 集計用 |
| `count` | non-PII | 「利用データ」 | 同上 | 集計値 |
| `period_start` / `period_end` | non-PII | 「利用データ」 | 同上 | 月単位 window |

### 3.5 `feedbacks` (改善フィードバック)

| column | classification | retention | 備考 |
|---|---|---|---|
| `feedback_id` (uuid PK) | pseudonymous | アカウント存続期間中 | UUID |
| `user_id` | pseudonymous | 同上 | FK |
| `rating` | non-PII | 同上 | 1-5 |
| `comment` | PII (direct) | 同上 | 自由記述 = PII |

### 3.6 `referrals` (紹介プログラム)

| column | classification | retention | 備考 |
|---|---|---|---|
| `referrer_user_id` / `referred_user_id` | pseudonymous | アカウント存続期間中 | FK 両経路 |
| `code` | non-PII | 同上 | 共有コード (8 char) |
| `redeemed_at` | non-PII | 同上 | timestamp |

---

## 4. Cloudflare KV — Key-level PII Inventory

| key pattern | classification | TTL | 備考 |
|---|---|---|---|
| `token:<token>` | pseudonymous | 90 日 (auth.js) | owner_key Cookie 認証、token は high-entropy random |
| `stripe_event:<event_id>` | non-PII | 7 日 (idempotency window) | webhook event ID のみ |
| `stripe_sync_fail:<event_id>` | non-PII | 7 日 (retry queue) | retry queue payload (encrypted JSON) |
| `rate_limit:<user_id>:<window>` | pseudonymous | 60 秒 (window) | rate limit 集計 |
| `geo_cache:<token_hash>` | pseudonymous | 1 時間 | 位置情報キャッシュ |

---

## 5. Cloudflare Workers Logs — Attribute-level PII Inventory

`safeLog(level, event, attrs)` の `attrs` は `ALLOWED_ATTR_KEYS` で whitelist 制御 (utils/safeLog.js:33-53)。各 attr の classification:

| attr | classification | 生成元 | 備考 |
|---|---|---|---|
| `user_hash` | pseudonymous | `hashIdSync(userId)` (FNV-1a 32-bit) または `hashId(userId)` (SHA-256 async) | 衝突可能性あり、SHA-256 化推奨 (Round 4 A-3 / Round 5 B-6) |
| `token_fp` | pseudonymous | `fingerprintToken(tokenId)` (prefix***suffix4) | token 全体は出力禁止 |
| `goal_id_fp` | pseudonymous | `fingerprintToken(goalId)` (uuid prefix4***suffix4) | goal_id は uuid なので fingerprint で十分 |
| `session_id_fp` | pseudonymous | `fingerprintToken(sessionId)` | 同上 |
| `subscription_fp` | pseudonymous | `fingerprintToken(subId)` | Stripe sub id 圧縮 |
| `metered_item_fp` | pseudonymous | `fingerprintToken(itemId)` | 同上 |
| `event` | non-PII | enum (account.deleted / chat.turn / webhook.upgrade 等) | system metadata |
| `level` | non-PII | DEBUG / INFO / WARN / ERROR / FATAL | system metadata |
| `table` / `table_index` / `total_tables` | non-PII | account.delete.table_done attr (Round 5 B-4) | 監査用 |
| `status` | non-PII | success / failed | 監査用 |

### 5.1 Log retention policy (privacy.html §6 SSoT)

- **Cloudflare Workers Logs (default)**: 7 日。
- **Cloudflare Logpush 経由 R2 / Sentry**: 30 日 (障害解析・監査用)。
- **`account.deleted` / `account.delete.table_done` audit trail**: 30 日 (Round 5 B-4 fix)。
- **CSP violation report**: Cloudflare Logpush 経由 structured log として保管 (KV 直接保存は廃止)。

---

## 6. Cross-border Transfer (越境移転) Inventory

| 移転先 (国) | 業者 | 移転される PII | privacy.html §4 mapping | DPA status (privacy.html §4) |
|---|---|---|---|---|
| 米国 | Anthropic (Claude) | chat content / profile / 位置情報 | privacy.html §2 §4 | Anthropic Commercial Terms + Sub-processor agreement |
| 米国 | OpenAI (GPT-4o mini) | chat content / profile / 位置情報 | privacy.html §2 §4 | OpenAI DPA (Enterprise / API) |
| 米国 | Google (Gemini, Vertex AI) | chat content / profile / 位置情報 | privacy.html §2 §4 | Google Cloud DPA (Vertex AI) |
| 米国 | Stripe | stripe_customer_id / 決済 metadata | privacy.html §4 | Stripe DPA (PCI DSS Level 1) |
| 米国 | Supabase | 全 user PII (US region) | privacy.html §4 | Supabase DPA (SOC 2 Type II) |
| Global Edge | Cloudflare | request metadata / KV / Workers Logs | privacy.html §4 | Cloudflare Customer DPA (EU SCCs 適用可能) |

利用者同意 mechanism: privacy.html §2「外部AIサービスへのデータ送信」+「越境移転に関する同意取得」セクション。同意取得は `users.cross_border_consent_at` で SSoT 化 (Round 5 A-3 / B-5 fix)。

---

## 7. Data Subject Rights (個人情報の権利行使)

privacy.html §7 / terms.html §7 で開示する 4 権利の operationalisation:

| 権利 | API endpoint | 実装 file | retention 影響 |
|---|---|---|---|
| 開示請求 | `/account/export` | `routes/account.js handleAccountExport` | (read-only) stripe_customer_id 等 redact |
| 訂正・追加・削除 | `support@goal-ai.com` 経由手動 | (manual ops) | case-by-case |
| 利用停止 | アカウント削除 (退会) で代替 | `routes/account.js handleAccountDelete` | 即時 DELETE |
| 完全削除 | `/account/delete` | 同上 | 6 table 即時 DELETE + KV cleanup |

GDPR Art.17 (right to erasure) compliance: terms.html §7 で「過度な遅延なく即時削除」明示 (Round 5 B-2 fix で 30 日保持文言を即時削除に統一)。

---

## 8. Pseudonymisation Hash Function Policy

| 用途 | 関数 | bits | 衝突確率 (1k user) | 衝突確率 (50k user) |
|---|---|---|---|---|
| log 同期出力 (audit trail) | `hashIdSync` (FNV-1a) | 32-bit | ~10⁻⁴ | ~30% (birthday paradox) |
| log 非同期出力 / sensitive | `hashId` (SHA-256 async) | 256-bit | ~10⁻⁶⁰ | ~10⁻⁶⁰ |

**migration roadmap** (Round 4 A-3 / Round 5 B-6): audit-critical path (`account.deleted` / payment events) は SHA-256 (async) に移行する。Cloudflare Workers cold start で `crypto.subtle.digest` が 50-100ms stall する case (Round 5 C-6) は scheduled handler の warm-up batch で緩和する。

---

## 9. Review & Audit Cadence

- **6 ヶ月毎**: 本 SSoT を full review、新規 column 追加 / 既存 column の classification 変更を反映。
- **migration 時**: Supabase migration で column 追加する際、本 SSoT への entry 追加を必須化 (PR チェックリスト)。
- **PII finding 検出時**: Round 1-N adversarial sweep で PII gap を検出した場合、24h 以内に本 SSoT を更新。
- **PPC 監査時**: 本 SSoT を監査資料として提示可能な状態に維持。

---

## 10. Round 5 fix cross-reference

- **B-1** (本 file 新設): PII inventory SSoT 物理不在 → 本 file 新設で解消。
- **B-2** (right to erasure 30日 vs 即時): terms.html §7 を即時削除文言に統一済 (privacy.html §6 retention policy 整合)。
- **B-3** (log retention 文言不在): privacy.html §6 に「動作ログの保管」セクション追加済、本 file §5.1 で SSoT 化。
- **B-4** (audit trail SSoT 不在): account.js に per-table `account.delete.table_done` event 追加済、本 file §5 で attr 体系化。
- **B-5** (同意 record SSoT 不在): privacy.html §2 で `users.terms_accepted_at` 等 7 column 追加済、本 file §3.1 で SSoT 化。
- **B-6** (FNV-1a 衝突 governance): 本 file §8 で migration roadmap 明記。

---

end of data governance SSoT.
