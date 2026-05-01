# API 事故時対応プレイブック (api_incident_playbook.md)

- MISSION-ID: API-BUDGET-GUARD-SETUP（付随プレイブック）
- 作成日: 2026-04-23
- 併読必須: `/Users/futoshi/Desktop/goal-ai-worker/docs/ops/api_budget_guard.md`
- 対象: Lais / dev-system で使う全 API（Anthropic / OpenAI / Google / Stripe / Cloudflare / Supabase）の課金暴走・キー漏洩事故
- 本書は「事故が起きた瞬間に開くチェックリスト」。設計手順は api_budget_guard.md 側を参照。

---

## §0 このファイルの使い方

### §0.1 開くタイミング

- 以下のいずれかに該当した「その瞬間」:
  1. 予算アラートメール（Soft limit / Budget alert）を受信した
  2. API Dashboard の使用量グラフが想定の 2 倍以上に膨らんでいる
  3. 課金カードから想定外の引き落としが発生した
  4. API キーが GitHub / ブログ / Slack / チャット / スクリーンショットで公開された疑いがある
  5. 紛失 / 盗難 / 不明端末からのアクセス痕跡を検知した

### §0.2 絶対順序

```
§1 初動5分（検知→即時停止）
 ↓
§2 影響範囲調査（1時間以内）
 ↓
§3 サポート連絡テンプレ（必要時）
 ↓
§4 再発防止（24時間以内）
 ↓
§5 過去事例記録欄に追記
```

### §0.3 鉄則

- **迷ったら停止を優先**。誤停止のロスは最大でも数時間の開発停滞。放置の損失は数十万円。
- **screenshot / ログを必ず取得**してから revoke する（事後のサポート連絡・社内説明・保険請求に必要）。
- **ふとし 1 人体制**のため、初動は全て自力で完遂できるよう本書は完結している。

---

## §1 初動 5 分（検知 → 即時停止）

### §1.1 共通ステップ（0 分〜1 分）

1. 時刻を記録: `date +"%Y-%m-%d %H:%M:%S %Z"` → `evidence/incident_YYYYMMDD_HHMM.md` に開始時刻として書く
2. アラートメール / Dashboard スクリーンショットを保存（`evidence/incident_YYYYMMDD_HHMM/` に PNG）
3. どの API / どのキー / どの環境（dev / prod / ci）かを特定

### §1.2 Anthropic Claude（1 分〜3 分）

```
1. https://console.anthropic.com/settings/keys を開く
2. 該当 Key の右「...」→ Revoke
3. 組織の Monthly Spend Cap を一時的に現時点累計値に設定（以後の呼び出しを Hard stop）
   https://console.anthropic.com/settings/limits → Monthly Spend Cap を現在値 + $10 程度に
4. Workspace 分離している場合は該当 Workspace のキーのみ revoke し、他 Workspace は継続運用可
```

### §1.3 OpenAI（1 分〜3 分）

```
1. https://platform.openai.com/settings/organization/api-keys を開く
2. 該当 Key の Delete ボタン
3. Project Key の場合は Project 単位で Hard limit を現時点累計値に設定
   https://platform.openai.com/settings/organization/limits → Project 選択 → Hard limit 下げ
4. Organization Owner に通知（ふとし 1 人体制なら自分宛にログのみ）
```

### §1.4 Google Gemini（1 分〜3 分）

```
1. https://aistudio.google.com/apikey を開く → 該当 Key の Delete
2. https://console.cloud.google.com/apis/credentials で当該 GCP Project のキーを Disable
3. https://console.cloud.google.com/billing で予算を現時点累計値に下げる
4. 暴走が深刻なら Billing Account をプロジェクトから切断（最終手段）:
   Cloud Console → Billing → Account management → この Project の請求先を「No billing」に変更
   → 全 Google API が Project 単位で停止する
```

### §1.5 Stripe（1 分〜3 分）

```
1. https://dashboard.stripe.com/apikeys を開く
2. 該当 Restricted Key または Secret Key の Roll（旧キーは grace period 後失効）
   または Delete（即時失効、業務継続不可になる点に注意）
3. 不正決済が疑われる場合:
   Dashboard → Payments → 該当 Charge → Refund
   Dashboard → Radar → Rules → 一時的に「Block all charges」ルールを有効化
4. 本番決済キー漏洩の場合はすぐに Stripe サポートに通報（§3.4 テンプレ）
```

### §1.6 Cloudflare（1 分〜3 分）

```
1. https://dash.cloudflare.com/profile/api-tokens を開く
2. 該当 Token の Roll または Delete
3. 暴走 Worker が特定できている場合は Workers & Pages → 該当 Worker → Settings → Disable
4. Account 全体の不正利用が疑われる場合は Account → Members → 自分以外のメンバー確認 + 2FA 強制
```

### §1.7 Supabase（1 分〜3 分）

```
1. https://supabase.com/dashboard/project/_/settings/api
2. service_role key 漏洩の場合:
   JWT Secret を Generate a new secret で再生成（全 anon / service_role key が同時に無効化される）
   ※ これは重大操作、全環境のキーを差し替える必要あり
3. Project の Spend cap を ON に（既に ON 前提だが、再確認）
4. Auth → URL Configuration の Redirect URLs が改ざんされていないか確認
```

### §1.8 初動完了の確認

- [ ] 該当キーが Dashboard 上で「Revoked」「Disabled」「Deleted」になっている
- [ ] Hard limit / Spend cap が現時点累計値 +α に引き下がっている
- [ ] Dashboard の使用量グラフが「平坦化」し始めている（数分のラグあり）
- [ ] `evidence/incident_YYYYMMDD_HHMM/` にスクリーンショットと時刻が保存されている

---

## §2 影響範囲調査（初動完了から 1 時間以内）

### §2.1 金額影響の算定

各 Dashboard で以下を記録:

- 事故発生時点の**累計課金額**（日次・月次両方）
- 想定との差額（例: 想定 ¥3,000/日 に対し実績 ¥18,000 → 差 ¥15,000）
- 影響期間（何時から何時までキーが動いていたか）

記録先: `evidence/incident_YYYYMMDD_HHMM.md` の「Impact」セクション。

### §2.2 Anthropic: 呼び出しログ確認

```bash
# Workers 側のログ（Cloudflare）から直近の Anthropic 呼び出しを抽出
wrangler tail --format=json | jq 'select(.logs[]?.message | contains("anthropic.com"))'

# もしくは Anthropic Console → Logs で
# https://console.anthropic.com/ → Logs → Date range を事故発生前後に
```

### §2.3 OpenAI: Usage Dashboard

```
https://platform.openai.com/usage
→ 時間単位でトークン消費 / 金額を確認
→ 異常スパイクの「開始時刻」と「終了時刻」を特定
→ 該当時刻の Worker ログと突き合わせ
```

### §2.4 Gemini: Cloud Logging

```bash
# gcloud CLI が入っている前提
gcloud logging read \
  'resource.type="consumed_api" AND resource.labels.service="generativelanguage.googleapis.com"' \
  --project=lais-prod --limit=100 --format=json \
  --freshness=1h
```

### §2.5 Stripe: Events

```
https://dashboard.stripe.com/events
→ 事故時刻前後の events を時刻順に確認
→ 不正 Charge / Customer 作成があれば該当 ID を記録
→ 必要なら Refund 実行（§1.5）
```

### §2.6 Cloudflare: Analytics

```
Dashboard → Workers & Pages → 該当 Worker → Metrics
→ Requests / CPU time / Subrequests のグラフを事故時刻でズーム
→ Logs tab で Log push が有効なら Logpush の出力先（R2 / S3）を grep
```

### §2.7 Supabase: Logs

```
Dashboard → Project → Logs → API Gateway Logs
→ 事故時刻の authenticated requests に service_role が含まれていないか確認
  （service_role は原則サーバ間通信のみ。外部 IP からの直接呼び出しがあれば漏洩確定）
```

### §2.8 影響範囲まとめ

`evidence/incident_YYYYMMDD_HHMM.md` に以下を記入:

```markdown
## Impact
- 発生時刻: YYYY-MM-DD HH:MM JST
- 停止時刻: YYYY-MM-DD HH:MM JST
- 影響時間: N 時間
- 金額影響: ¥N（Anthropic ¥N / OpenAI ¥N / ...）
- データ影響: Supabase で不正アクセス N 件 / Stripe で不正 Charge N 件
- 漏洩範囲: キー N 本 / 露出媒体（GitHub / Slack / ...）
```

---

## §3 サポート連絡テンプレ（4 プロバイダ分）

> 本セクションはコピペで使えるテンプレ。**実キーや平文秘密値は絶対に貼らない**。キーは「`sk-ant-api03-...xxxx`（末尾 4 桁のみ）」のようにマスクする。

### §3.1 Anthropic（JP/EN 両方）

**連絡先**: https://support.anthropic.com または support@anthropic.com
**管理画面から直接送る場合**: https://console.anthropic.com → Help → Submit a ticket

#### JP 版

```
件名: [Billing / Security] Unexpected usage spike and key revocation request — Org: lais-prod

お世話になっております。Anthropic Console のアカウント owner の Futoshi Togawa です。

■発生事象
- 発生日時: YYYY-MM-DD HH:MM JST
- Workspace: lais-prod （Organization ID: org-xxxxxxxx）
- 影響 API Key: `lais-prod-claude-2026Q2`（末尾4桁: xxxx、既に revoke 済み）
- 実績課金額: $N / 想定 $M / 差分 $L

■既に実施した対応
1. 該当 API Key を revoke（Console → Keys）
2. Monthly Spend Cap を一時的に $N+10 に引き下げ
3. アプリケーションコード側のリトライ / concurrency を全件見直し

■依頼事項
1. 本事象で発生した超過課金の精査 / 部分的な返金（goodwill credit）のご検討
2. 不正利用 / 第三者アクセスの形跡の確認（Anthropic 側ログ）
3. 今後の再発防止のためのアドバイス

添付: incident_YYYYMMDD_HHMM.md（影響範囲ログ）

何卒よろしくお願いいたします。
Futoshi Togawa / tgw2104@gmail.com
```

#### EN 版

```
Subject: [Billing / Security] Unexpected usage spike and key revocation request — Org: lais-prod

Hello Anthropic Support,

I am Futoshi Togawa, account owner of Organization `lais-prod`.

## Incident
- Detected at: YYYY-MM-DD HH:MM JST (UTC+9)
- Workspace: lais-prod (Org ID: org-xxxxxxxx)
- Affected API Key: `lais-prod-claude-2026Q2` (last 4 chars: xxxx, already revoked)
- Actual billed amount: $N / Expected: $M / Delta: $L

## Actions already taken
1. Revoked the API key via Console → Keys
2. Lowered Monthly Spend Cap to $N+10 as a stop-gap
3. Audited application-level retry and concurrency configuration

## Request
1. Review of the excess usage and possible goodwill credit
2. Check for signs of unauthorized access on your side
3. Guidance on further preventive measures

Attachment: incident_YYYYMMDD_HHMM.md (impact log)

Thank you for your help.
Futoshi Togawa / tgw2104@gmail.com
```

### §3.2 OpenAI（JP/EN）

**連絡先**: https://help.openai.com → chat bubble → Contact support
（メール窓口は状況により変動、Help Center 経由が確実）

#### JP 版

```
件名: [Billing] Usage spike on Project `lais-prod` — Requesting review

お世話になっております。Organization: `lais` の owner の Futoshi Togawa です。

■事象
- 日時: YYYY-MM-DD HH:MM JST
- Project: lais-prod（Project ID: proj_xxxxxxxx）
- Model: gpt-5 / text-embedding-3-small
- 課金: $N / 想定 $M / 差分 $L

■対応済
- 該当 Project Key `lais-prod-openai-2026Q2`（末尾 xxxx）を即 revoke
- Project の Hard limit を $N+5 に引き下げ

■依頼
- 超過分の精査と部分返金のご検討
- サーバ側ログでの不審アクセスの有無確認

Futoshi Togawa / tgw2104@gmail.com
```

#### EN 版

```
Subject: [Billing] Usage spike on Project `lais-prod` — Requesting review

Hello OpenAI Support,

I am Futoshi Togawa, owner of Organization `lais`.

## Incident
- When: YYYY-MM-DD HH:MM JST (UTC+9)
- Project: lais-prod (Project ID: proj_xxxxxxxx)
- Models: gpt-5 / text-embedding-3-small
- Billed: $N / Expected: $M / Delta: $L

## Actions taken
- Revoked the affected Project Key `lais-prod-openai-2026Q2` (last 4: xxxx)
- Lowered Hard limit on the Project to $N+5

## Request
- Review of the excess usage and possible refund
- Any signs of unauthorized access from your logs

Futoshi Togawa / tgw2104@gmail.com
```

### §3.3 Google Gemini / Cloud（JP/EN）

**連絡先**:
- 有料 Cloud サポート契約がある場合: https://console.cloud.google.com → Support → Cases → Create
- 無償: https://support.google.com/code → Gemini API → Contact us

#### JP 版

```
件名: [Billing] Gemini API 予算超過につきサポート依頼 — Project: lais-prod

お世話になっております。GCP Project `lais-prod`（Project ID: xxxxxxxx）のオーナーの Futoshi Togawa です。

■事象
- 日時: YYYY-MM-DD HH:MM JST
- API: generativelanguage.googleapis.com（Gemini 2.5 Pro）
- 予算 $333/月 に対し実績 $N、差分 $L

■対応済
- API Key `lais-prod-gemini-2026Q2`（末尾 xxxx）を削除
- 予算を現時点累計値に引き下げ
- Pub/Sub 経由の自動課金停止スクリプトを確認

■依頼
- Cloud Billing 側での異常アクセスログの確認
- goodwill credit のご検討（該当する場合）

Futoshi Togawa / tgw2104@gmail.com / Billing Account ID: xxxxxx-xxxxxx-xxxxxx
```

#### EN 版

```
Subject: [Billing] Unexpected Gemini API spend — Project: lais-prod

Hello Google Cloud Support,

I am Futoshi Togawa, owner of GCP Project `lais-prod` (ID: xxxxxxxx).

## Incident
- When: YYYY-MM-DD HH:MM JST (UTC+9)
- API: generativelanguage.googleapis.com (Gemini 2.5 Pro)
- Budget $333/mo vs actual $N, delta $L

## Actions taken
- Deleted API Key `lais-prod-gemini-2026Q2` (last 4: xxxx)
- Lowered budget to current cumulative value
- Verified Pub/Sub-based auto billing disable script

## Request
- Review of any anomalous access on the Cloud Billing side
- Consideration of goodwill credit where applicable

Futoshi Togawa / tgw2104@gmail.com / Billing Account ID: xxxxxx-xxxxxx-xxxxxx
```

### §3.4 Stripe（JP/EN）

**連絡先**: https://support.stripe.com または Dashboard 右下の Contact support

#### JP 版

```
件名: [Security] Potential API key exposure — Account: acct_xxxxxxxx

お世話になっております。Stripe アカウント `lais`（Account ID: acct_xxxxxxxx）のオーナーの Futoshi Togawa です。

■事象
- 日時: YYYY-MM-DD HH:MM JST
- 漏洩疑いのキー: `lais-prod-stripe-rk-2026Q2`（末尾 xxxx、既に Roll 済み）
- 不審 Charge 有無: 有 / 無（有の場合は Charge ID: ch_xxxxxx を列挙）

■対応済
1. Restricted Key を Roll（旧キーは grace period 中）
2. Radar Rule「Block all charges」を一時的に有効化
3. 該当 Charge を Refund（該当する場合）

■依頼
1. Stripe 側ログでの不審 API 呼び出しパターンの確認
2. 不正利用による Dispute が今後発生した場合のフォロー
3. アカウント全体のセキュリティ再監査のお願い

Futoshi Togawa / tgw2104@gmail.com
```

#### EN 版

```
Subject: [Security] Potential API key exposure — Account: acct_xxxxxxxx

Hello Stripe Support,

I am Futoshi Togawa, owner of Stripe account `lais` (Account ID: acct_xxxxxxxx).

## Incident
- When: YYYY-MM-DD HH:MM JST (UTC+9)
- Suspected exposed key: `lais-prod-stripe-rk-2026Q2` (last 4: xxxx, already rolled)
- Suspicious charges: yes / no (if yes, Charge IDs: ch_xxxxxx, ch_xxxxxx)

## Actions taken
1. Rolled the Restricted Key (old key is in grace period)
2. Temporarily enabled a Radar rule to block all charges
3. Refunded the suspicious charges where applicable

## Request
1. Review of any suspicious API call patterns on your side
2. Follow-up support should any related disputes arise
3. A full security audit of the account

Futoshi Togawa / tgw2104@gmail.com
```

### §3.5 （補足）Cloudflare / Supabase

- Cloudflare: https://dash.cloudflare.com → Support → Open a Ticket（Paid プランは優先対応）
- Supabase: https://supabase.com/dashboard/support/new
- どちらも上記 4 プロバイダと同じフォーマットで、`[Security]` / `[Billing]` のタグと「既に実施した対応」を冒頭に明記する。

---

## §4 再発防止（24 時間以内）

### §4.1 コード側

- [ ] 該当 API 呼び出し箇所の `maxRetries` / `timeout` / `concurrency` を必ず明示設定（api_budget_guard.md §6）
- [ ] try/catch 内で同じ API を再呼び出ししていないか確認（再帰リトライの排除）
- [ ] `setInterval` / `setTimeout` による周期起動がないか確認（重複起動の排除）

### §4.2 設定側

- [ ] Hard limit / Spend cap を事故発生前の値に戻す（ただし引き上げる場合は 1.5 倍まで、それ以上は §3 半期レビューで）
- [ ] 該当 API の Soft limit を事故発生時点の累計値の 80% に引き下げる（次回早期検知）
- [ ] キーの命名規則を遵守しているか再確認（`lais-{env}-{provider}-{YYYY}Q{N}`）

### §4.3 運用側

- [ ] `api_budget_guard.md` の §7 セルフセットアップに今回の事故で抜けていた項目を追記
- [ ] `pre-commit` / `gitleaks` が動いているか手元で確認: `gitleaks detect --source . --verbose`
- [ ] 1Password の該当 Vault エントリに事故と revoke 日時を追記

### §4.4 報告

- [ ] `session_progress.md` にインシデント番号と 1 行サマリを追記
- [ ] ふとし 1 名体制のため外部報告先はなし（将来チーム拡大後は Slack #incident 等を用意）

---

## §5 過去事例記録欄

> 発生したインシデントを時系列で追記する。**記録しないことが最大の再発リスク**のため、些細でも残すこと。

### テンプレート

```markdown
### #INC-YYYYMMDD-NN: {ワンライン概要}

- 発生: YYYY-MM-DD HH:MM JST
- 停止: YYYY-MM-DD HH:MM JST
- 影響: ¥N / データ N 件
- 原因: {1〜2 文}
- 対応: §1〜§4 のどれを実施したか
- 再発防止: {具体項目}
- 関連: `evidence/incident_YYYYMMDD_HHMM/`
```

### 記録

（現時点で事例なし。2026-04-23 時点、本書作成直前に Google Maps 事故の SNS 共有を受け予防整備として本書を用意。Lais 自体ではまだ事故発生なし。）

---

## 付録 A: 本書の更新履歴

| 日付 | 版 | 変更内容 | 担当 |
|------|----|----------|------|
| 2026-04-23 | v1.0 | 初版作成（API-BUDGET-GUARD-SETUP ミッション完了） | ADV + subagent |
