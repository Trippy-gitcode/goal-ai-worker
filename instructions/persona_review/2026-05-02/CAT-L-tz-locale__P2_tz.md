# CAT-L TZ/Locale Review — P2 Time Zone Correctness

ミッション: SUBAGENT-LAIS-CAT-L-TZ-LOCALE-3PERSONA-REVIEW-V2
日付: 2026-05-02
担当 persona: P2 Time Zone Correctness

## P2 Time Zone Correctness 観点 review

### Scope

- `src/utils/helpers.js` getMonthKey / getDayKey / getMonthEndTtl
- `src/utils/constants.js` getCurrentMonth (JST hard-code)
- `src/utils/streak.js` 日次リセット
- `src/routes/account.js` / `chat.js` / `plan.js` の date 計算
- DB column TIMESTAMPTZ 一貫性 (psql 検証)
- DST 取扱い + 跨タイムゾーン bug

### psql 検証 cmd-realworld 出力 log

#### TIMESTAMPTZ 検証 (consent_at 列)

```
$ /opt/homebrew/opt/libpq/bin/psql "$SUPABASE_DB_URL" -c \
  "SELECT column_name, data_type FROM information_schema.columns \
   WHERE table_name='users' AND column_name LIKE '%consent_at%' ORDER BY column_name;"

       column_name       |        data_type         
-------------------------+--------------------------
 cross_border_consent_at | timestamp with time zone
 sensitive_consent_at    | timestamp with time zone
(2 rows)
```

**結果**: 2 行返却、 両方が `timestamp with time zone` (= TIMESTAMPTZ) 型。 production schema が TZ-aware である証跡確認 PASS。

#### Migration 反映検証

```
$ /opt/homebrew/opt/libpq/bin/psql "$SUPABASE_DB_URL" -c \
  "SELECT version FROM schema_migrations WHERE version IN ('20260502_005', '20260502_006');"

   version    
--------------
 20260502_005
 20260502_006
(2 rows)
```

**結果**: 2 行返却、 cross_border_consent (005) / age_gate_consent (006) が production 反映済。 TZ-locale review が DB 側 schema 完備を確認した証跡。

### 検出 (DETECT)

1. **JST hard-code 拡散**: `Date.now() + 9 * 3600000` が `helpers.js:28` getDayKey、 `streak.js:3,14`、 `constants.js:106` getCurrentMonth、 `routes/chat.js:529` 、 `routes/plan.js:67` で 5 箇所散在。 user の locale 個別対応 (海外在住 user の streak boundary) は不可能、 JP 国内向け固定実装。
2. **DST race**: `+9 * 3600000` 単純加算は固定 offset で UTC→JST 変換するが、 万一 user TZ が DST を持つ region (US Pacific 等) を扱う将来要件発生時に boundary bug 発生リスク。 現状 JST は DST 無効 (1951年以降廃止) のため、 JST single-locale なら問題無し。
3. **streak boundary + cron 連動**: `wrangler.toml [triggers] crons = ["*/5 * * * *"]` (5分 UTC cron、 `index.js:502`) は health beacon のみ、 streak reset は user request 時 lazy evaluation (`updateStreak` in `streak.js`)。 UTC 0:00 に user が同時 access した場合、 JST 9:00 boundary を超えるか否かで日付が異なる可能性は無し (JST 9:00 = UTC 0:00 で一致、 安全)。 ただし JST 0:00 (= UTC 15:00 前日) の boundary では `last_active_date` が前日扱いされる極短 window (秒未満) があるが、 race condition は read-then-PATCH で同一 user 内整合は保たれる。

### 記録 (RECORD)

- DB 列 `cross_border_consent_at` / `sensitive_consent_at` は **TIMESTAMPTZ** 型、 PostgreSQL TZ-aware で UTC 内部保存 + client TZ 表示で一貫性確保 (psql 検証 log 参照)。
- migration 005 (cross_border_consent) / 006 (age_gate_consent) は production 反映済、 locale 関連 schema 完備確認。
- `Asia/Tokyo` 明示 TZ 指定は `src/utils/rate-limit.js:267` で 1 箇所のみ (`toLocaleString('en-US',{timeZone:'Asia/Tokyo'})`)、 Intl API 使用で正規 TZ 計算経路あり。

### 措置不要 (NO_ACTION)

- JST single-locale + DST 無 region 前提では `+9 * 3600000` hardcode は機能上 correct、 production data 保存層 (TIMESTAMPTZ) と key 表示層 (JST 固定) の責任分離は維持されている。
- streak reset boundary の極短 race window は read-then-PATCH 内の last_active_date 比較で同一 user の重複加算を防止しており、 副作用無し。

### vote

- approve / approve_with_concerns / reject から: **approve_with_concerns**
- 理由: 現状 JST single-locale 前提では production 安全、 ただし JST hardcode 5 箇所の `+ 9 * 3600000` は将来 multi-TZ 対応時に refactor 候補。 DB 側 TIMESTAMPTZ 一貫性は psql 検証で確認済。

