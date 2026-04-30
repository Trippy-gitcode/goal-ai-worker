# Lais ε 軸 RUM / Synthetic 設計 v1.0

> **位置付け**: 抜本改革 ε 軸「継続観測 (RUM + Synthetic)」の本格起点 SSoT。α SSoT v3.3 §12 (RUM 設計起点) を、ライブラリ選定 + 計測指標 + アラート通知 + PII マスキング の完全仕様に展開する。
> **mission ID**: EPSILON-RUM-SYNTHETIC-SSOT-V1
> **lock 日**: 2026-04-27
> **編集対象**: 本ファイルのみ (`lais/specs/rum_design_v1.md`)。実ライブラリ導入は後続フェーズ。

---

## 0. 概要 (継続観測方針)

### 0.1 ε 軸の目的
α SSoT v3.3 で定義された PO 体感目標 (Q1〜Q7) と仕様変更 (F1〜F4) を、本番環境で **継続的に観測 (always-on)** し、再発 / 回帰を即時検知する仕組みを SSoT 化する。

### 0.2 RUM と Synthetic の役割分担
| 観測種 | 主体 | 役割 | 計測タイミング | サンプリング |
|---|---|---|---|---|
| **RUM** (Real User Monitoring) | 実ユーザのブラウザ | 実体験を記録 (Q1 Q2 Q4 体感の現実値) | ユーザ操作と同時 | F1 段階制 (PO 単独 100% / β 100% / 一般 1〜5%) |
| **Synthetic** (定期合成監視) | 自動 bot (Cron) | 24h × 7d 連続稼働確認 (前進回帰 detect) | 5 分 / 30 分 / 1h おき | 100% (定数本数) |

### 0.3 観測の三軸 (PO 体感に直結)
1. **速度軸 (Q1 / Q2)**: signin → 使える状態 P95 1000ms 以内、入力反映 P95 200ms 以内
2. **正確軸 (Q4)**: エラー表示の即時性 (input 同フレーム / NW 1 秒以内)
3. **継続軸 (新規)**: 24h × 7d 連続稼働 / 5xx 発生頻度 / cost spike

### 0.4 ファイル管轄
- 本 SSoT: `lais/specs/rum_design_v1.md` (新設、本ミッション)
- 実装ファイル (後続フェーズ): `lais/src/lib/rum/*` / `lais/scripts/synthetic/*` / `lais/worker/logpush.ts`
- 編集禁止: `docs/plans/*` / `lais/verify/*` / `scripts/*` (本ミッション範囲外)

### 0.5 用語
- **Web Vitals**: Google が定義する Web のユーザ体験指標 (LCP / CLS / INP / FCP / TTFB)
- **P95**: 95 パーセンタイル (100 サンプル中 95 番目に速い値、外れ値除外)
- **PII**: Personally Identifiable Information (個人特定可能情報、email / token / password 等)

---

## 1. RUM ライブラリ候補比較 (Plausible / web-vitals / Sentry / 等)

### 1.1 比較表

| ライブラリ | 種別 | 月額目安 | Web Vitals | エラー追跡 | PII 自動マスキング | bundle size | 自前 | 採否 |
|---|---|---|---|---|---|---|---|---|
| **web-vitals** (Google 公式) | RUM 計測 SDK | 無料 | ◎ (公式) | ✕ | △ (自前実装) | 1.7 KB gz | 中 | **採用 (層 1)** |
| **Plausible** | RUM SaaS | $9/mo (10k pv) | △ (Web Vitals 別) | ✕ | ◎ (cookie-less) | 1 KB | 低 | △ (PV 計測のみ補助) |
| **Sentry** | エラー追跡 + RUM | 無料 5k err/mo | ○ | ◎ | ○ (config) | 60 KB gz | 中 | **採用 (層 2)** |
| **Datadog RUM** | 統合 RUM | $1.50/1k sessions | ◎ | ◎ | ○ | 80 KB gz | 高 | ✕ (コスト過大) |
| **New Relic Browser** | 統合 RUM | $0.30/GB | ◎ | ○ | ○ | 50 KB gz | 高 | ✕ (PO 単独期過剰) |
| **自前 (CF Workers + R2)** | カスタム | 無料 (CF 無料枠内) | △ (web-vitals 連携必須) | △ (Sentry 連携) | ◎ (自由設計) | 0 KB | 高 | **採用 (層 3, ログ集約)** |

### 1.2 採用構成 (3 層)
- **層 1 (Web Vitals 計測)**: `web-vitals` ライブラリ (Google 公式) → 各画面で LCP/CLS/INP/FCP/TTFB 取得
- **層 2 (エラー追跡)**: Sentry (無料枠 5k errors/mo、PO 単独期は十分)
- **層 3 (集約ログ)**: 自前 Cloudflare Workers + R2 (Logpush) → 全データを 90 日保持

### 1.3 採用理由
1. **コスト 0 円維持** (PO 単独期 H3 期間中、5h/week 投資のみ)
2. **bundle 最小化** (web-vitals 1.7KB + Sentry 60KB = 62KB、初期表示 LCP に影響軽微)
3. **PII 自動制御の自由度** (CF Workers で送信前にマスキング処理)
4. **CF Pages との親和性** (既存 Worker / R2 / KV 資産流用)

### 1.4 不採用ライブラリと却下理由
- **Datadog / New Relic**: 機能過剰 + 月額コスト ¥10,000 超 → α SSoT v3.3 §13 (改革凍結方針 H1) と矛盾
- **Plausible 単独**: Web Vitals が補助的、エラー追跡なし → 役割不足
- **Google Analytics 4**: PII マスキング設計が複雑、cookie 同意必須 (G4 アクセシビリティ + EU 対応で煩雑)

---

## 2. Synthetic 監視ライブラリ候補比較 (Playwright Cron / k6 / Datadog Synthetic / 等)

### 2.1 比較表

| ライブラリ | 種別 | 月額目安 | iOS Safari 対応 | CF 連携 | 自前 Cron | 既存資産流用 | 採否 |
|---|---|---|---|---|---|---|---|
| **Playwright + GitHub Actions Cron** | E2E + Cron | 無料 (GHA 2k min/mo) | ◎ (Webkit) | ○ (CF Pages URL) | ✕ (GHA 依存) | ◎ (`lais/tests/realmachine/`) | **採用 (層 1)** |
| **Cloudflare Cron Triggers + Worker** | Worker Cron | 無料 (CF 無料枠) | ✕ (HTTP のみ) | ◎ | ◎ | △ (新規) | **採用 (層 2)** |
| **k6** | 負荷 + Synthetic | 無料 (OSS) | ✕ | △ | ✕ | ✕ | ✕ (PO 単独期不要) |
| **Datadog Synthetic** | SaaS | $5/test/mo | ◎ | ◎ | ◎ | ✕ | ✕ (コスト過大) |
| **UptimeRobot** | uptime 専用 | 無料 (50 monitors) | ✕ | ○ | ○ | ✕ | △ (uptime 補助のみ) |
| **Checkly** | Synthetic SaaS | $40/mo | ◎ | ○ | ◎ | ✕ | ✕ (PO 単独期過剰) |

### 2.2 採用構成 (2 層)
- **層 1 (E2E Synthetic)**: Playwright + GitHub Actions Cron (5 分間隔、Webkit / Chromium 並走)
  - シナリオ: S-01 サインイン / S-12 タスク追加 / S-20 AI 対話 (各 1 本、計 3 本)
  - 既存 `lais/playwright.cf.config.ts` 流用
- **層 2 (HTTP Synthetic)**: CF Cron Trigger + Worker (1 分間隔、軽量 HTTP probe)
  - エンドポイント: `/`, `/api/health`, `/api/auth/session`
  - 5xx 検知 → LINE 即時通知 (F2 緊急高)

### 2.3 採用理由
1. **GHA 無料枠**: 2,000 分/月 → 5 分間隔 × 3 本 × 60 秒 = 月 21,600 分必要 → **15 分間隔に調整 (月 2,160 分)**
2. **CF Cron**: 1 分間隔の HTTP probe を 100% 無料で実行可能 (既存 Worker 資産流用)
3. **iOS Safari (Webkit) 標準対応**: Q6 iOS-01〜iOS-12 の継続観測が GHA で実現可能

### 2.4 シナリオ設計
| Synthetic 名 | 種別 | 間隔 | 計測対象 | 失敗時アラート |
|---|---|---|---|---|
| `synthetic_signin` | Playwright | 15 分 | Q1 P95 1000ms | LINE (F2 緊急高) |
| `synthetic_task_add` | Playwright | 15 分 | Q2 P95 200ms (現状 378ms) | LINE (F2 緊急高) |
| `synthetic_ai_chat` | Playwright | 30 分 | Q5 NG-08 streaming 中断 | メール (F2 緊急低) |
| `synthetic_health` | CF Worker | 1 分 | 5xx / 4xx burst | LINE (F2 緊急高) |
| `synthetic_session` | CF Worker | 5 分 | session 維持 (Q5 NG-04) | メール (F2 緊急低) |

---

## 3. 計測指標

### 3.1 Web Vitals (LCP / CLS / INP / FCP / TTFB)

| 指標 | 名称 | 合格閾値 | 警告閾値 | 計測対象画面 (優先 6) | α v3.3 整合 |
|---|---|---|---|---|---|
| **LCP** | Largest Contentful Paint | < 2.5s | 2.5〜4.0s | S-00 / S-01 / S-10 / S-12 / S-15 / S-20 | Q1 派生 |
| **CLS** | Cumulative Layout Shift | < 0.1 | 0.1〜0.25 | 全 6 画面 (特に S-12 楽観更新) | Q5 NG-01 派生 |
| **INP** | Interaction to Next Paint | < 200ms | 200〜500ms | S-12 / S-15 (モーダル操作) | Q2 / Q3 派生 |
| **FCP** | First Contentful Paint | < 1.0s | 1.0〜3.0s | S-00 / S-01 (Q6 iOS-06 連動) | Q6 iOS-06 派生 |
| **TTFB** | Time to First Byte | < 600ms | 600〜1500ms | 全画面 (CF Pages レスポンス) | Q1 前段 |

### 3.2 ビジネス指標 (signin 成功率 / タスク追加成功率 / AI 対話完了率)

| 指標 | 計測点 | 合格閾値 | 警告閾値 | 失敗時 |
|---|---|---|---|---|
| **signin 成功率** | submit → S-10 visible | >= 99% | 95〜99% | LINE 即時 (F2 緊急高、< 95% で rollback 検討) |
| **タスク追加成功率** | S-12 「作成」→ S-10 反映 | >= 99% | 95〜99% | LINE 即時 (F2 緊急高) |
| **AI 対話完了率** | S-20 送信 → 応答終端 | >= 95% | 90〜95% | メール (F2 緊急低、Q5 NG-08 連動) |
| **モーダル閉じ成功率** | S-15 ESC / ✕ / 背景 (3 手段) | == 100% | < 100% | LINE 即時 (Q3 既存達成済の保全) |

### 3.3 エラー指標 (JS error / NW error / 5xx response)

| 指標 | 計測手段 | 合格閾値 | 警告閾値 | 通知先 |
|---|---|---|---|---|
| **JS error count** | Sentry + window.onerror | < 1/100 sessions | 1〜5/100 sessions | メール (F2 緊急低) |
| **NW error count** | fetch wrap + Sentry | < 1/100 reqs | 1〜3/100 reqs | メール |
| **5xx response count** | CF Worker + Sentry | == 0 | > 0 | LINE 即時 (F2 緊急高) |
| **4xx burst** | CF Logpush 集計 | < 10/min | 10〜50/min | メール |
| **timeout count** | fetch AbortController | < 1/100 | 1〜5/100 | メール |

### 3.4 サンプリング戦略 (α v3.3 §12.1 (F1) 整合)
- **PO 単独期 (現行、〜2026-07-27)**: 100% 計測 (ふとし 1 人、規模小)
- **友人ベータ期 (2026-08〜)**: 100% 計測 (規模 ~10 人)
- **一般公開期 (未定)**: 1〜5% サンプリング (規模 1k DAU 想定)
- **エラー指標は常時 100%** (サンプリングしない、サイズが小さい)

---

## 4. アラート通知 3 段

### 4.1 緊急高 (LINE 即時)

#### 4.1.1 通知条件
- 自動 rollback 発動 (E1 カナリア配信失敗)
- サーバーダウン (CF Pages 5xx burst > 50/min for 3 min)
- signin 成功率 < 95% (5 分連続、Q1 体感破綻)
- LCP P95 > 4.0s (15 分連続、Q1 体感破綻)
- 5xx 発生 (1 件以上、即時)
- Synthetic `synthetic_signin` 失敗 (連続 2 回)
- Synthetic `synthetic_health` 失敗 (連続 3 回)

#### 4.1.2 LINE 通知実装
- **手段**: LINE Messaging API (LINE Notify は EOL 予定のため Messaging API 推奨)
- **トークン管理**: 環境変数 `LINE_BOT_TOKEN` (gitleaks 完遂、α v3.3 §13.2 凍結例外 1 件目で対応済)
- **送信元**: CF Worker (`lais/worker/alert.ts`、本ミッションでは仕様書のみ)
- **通知先**: PO ふとしの LINE (Person ID 環境変数 `LINE_PO_USER_ID`)
- **メッセージフォーマット**:
  ```
  [LAIS LINE 緊急高]
  時刻: 2026-04-27T15:30:00Z
  指標: signin_success_rate
  現状値: 89% (閾値 95%)
  影響: Q1 体感破綻
  推奨対応: rollback 手動承認 or 緊急 hotfix
  詳細: https://dash.cloudflare.com/.../logs
  ```

#### 4.1.3 LINE 緊急高 の頻度抑制
- 同一指標連続発火: 30 分間 1 通のみ (cooldown)
- 解消通知: 復帰時に「LAIS LINE 復旧」を 1 通送信

### 4.2 緊急低 (メール)

#### 4.2.1 通知条件
- コスト警告 (CF / Supabase / Anthropic API spike > 1.5x daily avg)
- 軽微エラー (JS error count > 5/100 sessions、5 分連続)
- AI 対話完了率 < 90% (15 分連続、Q5 NG-08 連動)
- LCP P95 2.5〜4.0s (警告ゾーン、15 分連続)
- INP P95 200〜500ms (15 分連続)
- Synthetic `synthetic_ai_chat` 失敗 (連続 2 回)
- Synthetic `synthetic_session` 失敗 (連続 3 回)

#### 4.2.2 メール通知実装
- **手段**: Resend or SendGrid (CF Workers から HTTP 送信)
- **送信元**: `noreply@lais.app` (Sender Authentication 設定必須)
- **送信先**: PO `tgw2104@gmail.com` (環境変数 `PO_EMAIL`)
- **件名**: `[LAIS 緊急低] {指標名} 警告`
- **本文**: 緊急高と同じフォーマット + 推奨対応「24h 以内に確認」

#### 4.2.3 メール 頻度抑制
- 同一指標連続発火: 6 時間 1 通のみ
- 日次サマリー: 24h 集計レポートを毎朝 09:00 JST 送付 (緊急低でも未発火日は送らない)

### 4.3 全件 (ローカルログ)

#### 4.3.1 ログ対象
- 全 RUM イベント (LCP / CLS / INP / FCP / TTFB)
- 全 ビジネス指標イベント (signin / task / chat)
- 全 エラー (JS / NW / 5xx / 4xx)
- 全 Synthetic 結果 (PASS / FAIL)
- 全アラート発火履歴 (LINE / メール 含む)

#### 4.3.2 ログ送信先
- **CF Logpush** → R2 (`lais-logs/rum/YYYY-MM-DD/*.json.gz`)
- **保持期間 90 日** (§6 で詳細)
- **形式**: JSON Lines (1 行 1 イベント、gzip 圧縮)

#### 4.3.3 ローカル参照
- PO 専用ダッシュボード (将来): R2 から DuckDB クエリ
- ad-hoc 分析: `wrangler r2 object get lais-logs/...` + `jq` パイプ

### 4.4 アラート振り分けルール (まとめ)

| 重大度 | 通知先 | 例 | 反応期待時間 |
|---|---|---|---|
| **緊急高** | LINE 即時 | rollback / 5xx / signin 破綻 | < 15 分 |
| **緊急低** | メール | コスト spike / 軽微エラー / 警告ゾーン | < 24h |
| **全件** | ローカルログ (R2) | 全 RUM/Synthetic イベント | 任意 (post-mortem 用) |

---

## 5. PII マスキング (URL email / token / password)

### 5.1 マスキング対象 一覧

| カテゴリ | パターン例 | マスキング前 | マスキング後 |
|---|---|---|---|
| **URL email** | `?email=...` クエリ | `/auth?email=alice@x.com` | `/auth?email=***@***.***` |
| **URL token** | `?token=` / `?access_token=` / `?code=` | `/cb?code=abc123def` | `/cb?code=***` |
| **JSON body password** | `"password":"..."` | `{"password":"hunter2"}` | `{"password":"***"}` |
| **JSON body otp_code** | `"otp_code":"..."` | `{"otp_code":"123456"}` | `{"otp_code":"***"}` |
| **localStorage Supabase session** | `sb-*-auth-token` | (raw JWT) | `***` |
| **HTTP Header Authorization** | `Authorization: Bearer ...` | `Bearer eyJhb...` | `Bearer ***` |
| **HTTP Header Cookie** | `Cookie: ...` | (raw cookies) | `***` |
| **AI 対話本文** | S-20 の入力/出力 | (raw 日記等) | `[redacted body, len=1234]` (送信しない、長さのみ) |
| **タスク本文** | S-12 入力 | (raw タスク名) | `[redacted body, len=42]` |

### 5.2 マスキング自動化ルール

#### 5.2.1 送信前自動赤線化 (フロント側)
- **実装層**: `lais/src/lib/rum/sanitize.ts` (本ミッションでは仕様のみ、後続フェーズで実装)
- **タイミング**: イベント送信の直前 (`fetch('/rum/...', {body})` 実行前)
- **正規表現セット**:
  ```ts
  const PII_PATTERNS = [
    { re: /([?&])email=[^&]+/g, replace: '$1email=***@***.***' },
    { re: /([?&])(token|access_token|code)=[^&]+/g, replace: '$1$2=***' },
    { re: /"(password|otp_code|secret)":\s*"[^"]+"/g, replace: '"$1":"***"' },
    { re: /Bearer\s+[A-Za-z0-9._-]+/g, replace: 'Bearer ***' },
    { re: /sb-[a-z0-9-]+-auth-token/g, replace: '***' },
  ];
  ```

#### 5.2.2 サーバ側二重マスキング (CF Worker)
- **実装層**: `lais/worker/rum_ingest.ts` (本ミッションでは仕様のみ)
- **目的**: フロントの sanitize 漏れを防ぐ defense in depth
- **追加処理**: ペイロード全体に同一正規表現を再適用、+ JSON schema 検証で AI 対話本文 / タスク本文を弾く

#### 5.2.3 ログ集約後の検査 (R2 → DuckDB)
- **頻度**: 日次 cron (R2 に書き込まれた直後)
- **検査**: 既知パターンに合致する漏洩文字列を検索、ヒット時 LINE 緊急高
- **目的**: 万が一漏れた場合の即時検知 + Q5 NG-07 個人情報漏洩 防御

### 5.3 PII マスキング テストケース (E2E + 単体)

| テスト ID | 内容 | 期待 |
|---|---|---|
| `rum-pii-01` | `/auth?email=x@y.com` 開く → RUM 送信ペイロード検査 | `email=***@***.***` |
| `rum-pii-02` | OAuth callback `/cb?code=abc` 開く → RUM ペイロード | `code=***` |
| `rum-pii-03` | S-12 タスク追加 → fetch body の `password` 模擬 → ペイロード | `"password":"***"` |
| `rum-pii-04` | S-20 AI 対話 200 文字送信 → RUM ペイロード | `[redacted body, len=200]` |
| `rum-pii-05` | localStorage `sb-xxx-auth-token` 含む URL → ペイロード | `***` |
| `rum-pii-06` | サーバ側で `email=raw@x.com` を直接送る (フロント漏洩模擬) | サーバ側で `email=***@***.***` に再マスキング |
| `rum-pii-07` | R2 ログを 24h 後に検査 → 漏洩文字列 0 件 | 0 件 (PASS) |

### 5.4 サンプリングと PII の関係
- **PO 単独期 100% 計測** であってもマスキングは必須 (PO 自身の PII も将来共有時に漏洩リスク)
- **一般公開期 1〜5% サンプリング** ではサンプル抽出後にマスキング、サンプル外は完全破棄

---

## 6. ログ保持期間 (90 日 CF Logpush + R2)

### 6.1 保持仕様 (α v3.3 §12.3 (F4) 整合)

| 項目 | 設定値 |
|---|---|
| 保持期間 | **90 日** (固定、F4 確定) |
| 保存先 | Cloudflare R2 (`lais-logs` bucket) |
| 経路 | CF Logpush → R2 (CF Pages / Worker request logs) + 自前 RUM ingest → R2 |
| 形式 | JSON Lines + gzip (`*.json.gz`) |
| パーティション | 日次 (`YYYY-MM-DD/HH/`) |
| 削除 | R2 Lifecycle Rule (90 日経過で自動 DELETE) |
| アクセス権 | PO のみ (`R2_API_TOKEN` 環境変数、gitleaks 対応済) |

### 6.2 R2 Lifecycle Rule 設定 (本ミッションでは仕様のみ、後続で wrangler.toml 反映)
```toml
# wrangler.toml に追記予定 (後続フェーズ)
[[r2_buckets]]
binding = "LAIS_LOGS"
bucket_name = "lais-logs"

# Lifecycle (R2 ダッシュボード or API で設定)
# - prefix: "rum/"
# - delete after 90 days
```

### 6.3 ログ容量見積もり
- **PO 単独期**: 1 イベント ~1KB × 1,000 events/day × 90 days = **90 MB** (R2 無料枠 10GB 内、コスト 0)
- **友人ベータ期**: 1 イベント ~1KB × 50,000 events/day × 90 days = **4.5 GB** (R2 無料枠内)
- **一般公開期**: サンプリング 1% で日次 1M events 想定 → 1KB × 10,000 events/day × 90 days = **900 MB**

### 6.4 CF Logpush 設定 (本ミッションでは仕様のみ)
- **対象**: CF Pages (request logs) + Worker (Workers Trace Events)
- **送信先**: R2 (`lais-logs/cf-logpush/`)
- **頻度**: 5 分バッチ (CF 推奨)
- **参考**: <https://developers.cloudflare.com/logs/logpush/>

### 6.5 90 日経過後の扱い
- **自動削除** (R2 Lifecycle で消える、復旧不可)
- 90 日超の傾向分析が必要な場合: 月次サマリーを別 R2 prefix (`lais-logs-monthly/`) に保存 (本ミッション範囲外、必要時に追加策定)

---

## 7. Phase 完了判定の指標 (直近 24h P95)

### 7.1 ε 軸 Phase 完了基準

| 指標 | 直近 24h P95 | 期待値 | 判定 |
|---|---|---|---|
| **Q1 派生 (signin LCP)** | LCP P95 | < 1000ms | PASS / FAIL |
| **Q2 派生 (S-12 INP)** | INP P95 | < 500ms (現状 378ms) | PASS / FAIL |
| **CLS 全画面** | CLS P95 | < 0.1 | PASS / FAIL |
| **5xx 件数** | 24h 累計 | == 0 | PASS / FAIL |
| **signin 成功率** | 24h 平均 | >= 99% | PASS / FAIL |
| **タスク追加成功率** | 24h 平均 | >= 99% | PASS / FAIL |
| **AI 対話完了率** | 24h 平均 | >= 95% | PASS / FAIL |
| **Synthetic `synthetic_signin`** | 24h 成功率 | == 100% | PASS / FAIL |
| **Synthetic `synthetic_task_add`** | 24h 成功率 | == 100% | PASS / FAIL |
| **Synthetic `synthetic_health`** | 24h 成功率 | >= 99.9% | PASS / FAIL |
| **PII 漏洩検知** | 24h 検知件数 | == 0 | PASS / FAIL |
| **アラート 3 段動作** | テスト発火 | LINE/メール/ログ 全到達 | PASS / FAIL |

### 7.2 完了判定 自動チェック script (仕様、後続フェーズで実装)
- **path**: `lais/scripts/synthetic/check_phase_complete.ts` (新設想定)
- **頻度**: 日次 09:00 JST cron
- **出力**: `lais/logs/phase_check_YYYY-MM-DD.json` + メール送付

### 7.3 ε 軸 完了 → 次フェーズ
- 上記 12 指標が連続 7 日 PASS → **ε 軸 完了宣言** (PO 承認必須)
- 完了後: 5 軸全完了 (α/β/γ/δ/ε) で改革 3 か月期完了
- 次: 友人ベータ期入りのデータ移行 + プラン構造再定義 (α v3.3 §15)

---

## 8. 関連 PD / PATCH 履歴

### 8.1 起点 (α SSoT v3.3)
- α SSoT v3.3 §12 (RUM 設計起点、F1〜F4) → 本 ε SSoT v1.0 で展開
- α SSoT v3.3 §1.1 (Q1 P95 1000ms 目標) → §3.1 LCP 閾値に転記
- α SSoT v3.3 §1.2 (Q2 P95 200ms 目標) → §3.1 INP 閾値に転記
- α SSoT v3.3 §7.6 F2 (アラート 3 段) → §4 全節に展開
- α SSoT v3.3 §12.4 F3 (PII 取扱い) → §5 全節に展開
- α SSoT v3.3 §12.3 F4 (90 日保持) → §6 全節に展開

### 8.2 達成済バグ改修 (継続観測の保全対象)
- PATCH-BUG-RT-SIGNIN-LATENCY-REDUCTION (Q1 達成、502ms) → §3.2 signin 成功率で継続監視
- PATCH-BUG-RT-S12-OPTIMISTIC-UPDATE (Q2 達成、378ms) → §3.1 INP P95 で継続監視
- PATCH-BUG-RT-S15-MODAL-CLOSE-FIX (Q3 達成、3/3 PASS) → §3.2 モーダル閉じ成功率で継続監視

### 8.3 後続フェーズ (本 SSoT 起点)
- **PD-EPSILON-RUM-IMPL-V1**: 実ライブラリ導入 (web-vitals + Sentry + CF Worker、後続)
- **PD-EPSILON-SYNTHETIC-IMPL-V1**: Playwright Cron + CF Cron 結線 (後続)
- **PD-EPSILON-PII-MASK-V1**: マスキング実装 + E2E テスト (後続、本 SSoT §5.3 連動)
- **PD-EPSILON-LOGPUSH-V1**: CF Logpush + R2 Lifecycle 設定 (後続、本 SSoT §6 連動)

### 8.4 凍結例外 該当性 (α v3.3 §13.2)
- 本 SSoT 化は「(3) セキュリティクリティカル修正」に含まれない (純粋な仕様書化のため凍結対象外)
- 後続実装フェーズは ε 軸完了宣言の必要工程 → H1 凍結期間内の許容工事

### 8.5 dev-system v3.4 連携
- 本 SSoT 化 mission ID `EPSILON-RUM-SYNTHETIC-SSOT-V1` は dev-system v3.4 §2.25 ADV 行動規範に従って起票 (subagent 経由が望ましい)
- session_progress.md 反映 (本ミッション完了報告で連動)

### 8.6 spec タイプ
- **本 SSoT は「仕様書化のみ」スペック** (実装ファイル無編集、新規 spec ファイル 1 本のみ追加)
- MATRIX skip 想定: 本 SSoT は実装範囲外のため、CI gate / verify 系の MATRIX 対象外

---

> v1.0 lock 済 (2026-04-27、ε 軸 RUM/Synthetic SSoT 化 mission `EPSILON-RUM-SYNTHETIC-SSOT-V1`)
> 編集対象: 本ファイルのみ (`lais/specs/rum_design_v1.md`)
> 次フェーズ: ε 軸 実装結線 (web-vitals + Sentry + Playwright Cron + CF Cron + R2 Logpush)
