# {{FEATURE_ID}} — {{FEATURE_NAME}} (phase 2: 機能 仕様 雛形)

> **生成元**: dev-system `templates/spec/feature_spec.md.template` (`core_spec.md` §2.25.24 7-phase ワークフロー phase 2 配備物)。
> **目的**: 7 phase 開発 ワークフロー (`core_spec.md` §2.25.24) の phase 2 「仕様書化」 を 機械強制 する 雛形。 spec-first (= 仕様書 駆動) 原則 の 中核 (= 本 file = 真値、 phase 3 実装 / phase 5 E2E spec.ts は 本 file 由来)。
> **placeholder 規約**: `{{FEATURE_ID}}` / `{{FEATURE_NAME}}` / `{{ROUTE_PATH}}` / `{{API_ENDPOINT}}` 等 を 起案者 (PO + ADV) で 置換、 残置 は 機械 verify (= grep `{{` / `}}` count = 0 必須)。
> **改変履歴**: 初版 (SUBAGENT-DEVSYS-7PHASE-SPEC-FIRST-V1、 PO-DIRECTIVE-014 反映、 spec-first 原則 codify)。

---

## §0. メタ 情報 (機械 verify 用)

| 項目 | 値 | placeholder |
|---|---|---|
| 機能 ID | `{{FEATURE_ID}}` | 必須 (例: `FEAT-LAIS-001`、 `^FEAT-[A-Z]+-[0-9]{3}$` 形式) |
| 機能 名 | `{{FEATURE_NAME}}` | 必須 (1 行、 例: 「ゴール 入力 + 自動 タスク 分解」) |
| 関連 concept | `templates/concept/concept.md.template` 派生 path | 必須 (= phase 1 file path) |
| 起案 日 | `{{SPEC_DATE}}` | 必須 (`YYYY-MM-DD` UTC) |
| 起案者 | `{{SPEC_AUTHOR}}` | 必須 |
| version | `{{SPEC_VERSION}}` | 任意 (default `0.1.0`) |
| 状態 | `{{SPEC_STATUS}}` | 必須 (`draft` / `review` / `approved` / `frozen`) |
| 関連 E2E spec | `tests/e2e/specs/{{FEATURE_ID_LOWER}}_smoke.spec.ts` | phase 5 着手後 配置 |

---

## §1. 概要 (= 1 段落 で 第三者 に 通じる 説明)

`{{FEATURE_OVERVIEW}}` (例: 「user が 自然言語 で ゴール (例: 「3 ヶ月 で TOEIC 800 取る」) を 入力 すると、 LLM が 7 日 単位 の マイルストーン + 1 日 単位 の タスク に 自動 分解 し、 1 タップ で カレンダー に 反映 する 機能。」)

### §1.1 価値 (= user benefit、 1 文)

`{{FEATURE_VALUE}}` (例: 「ゴール → タスク 分解 を AI に 任せ、 user は 朝 5 分 で 一日 を 開始 できる」)

### §1.2 失敗 した時 の loss (= 機能 不在時 の 悪化)

`{{FEATURE_LOSS_IF_ABSENT}}` (例: 「ゴール 設定 後 user 自身 で タスク 分解 = 思考負荷 高 + 継続 ≤ 7 日 で 離脱 default」)

---

## §2. ユースケース (= user story、 ≥ 3 件)

### §2.1 main UC (= 黄金 path)

> **As a** `{{UC_MAIN_ROLE}}` (例: 30 代 知的労働者)
> **I want to** `{{UC_MAIN_ACTION}}` (例: 自然言語 で ゴール 入力 + AI 自動 分解 取得)
> **So that** `{{UC_MAIN_VALUE}}` (例: 朝 5 分 で 一日 を 開始 できる)

### §2.2 alternative UC (= 副 path、 ≥ 2 件)

| # | role | action | value |
|---|---|---|---|
| 1 | `{{UC_ALT_1_ROLE}}` | `{{UC_ALT_1_ACTION}}` | `{{UC_ALT_1_VALUE}}` |
| 2 | `{{UC_ALT_2_ROLE}}` | `{{UC_ALT_2_ACTION}}` | `{{UC_ALT_2_VALUE}}` |

### §2.3 edge case UC (= 異常 系、 ≥ 2 件)

| # | trigger | 期待 挙動 |
|---|---|---|
| 1 | `{{UC_EDGE_1_TRIGGER}}` (例: ネット 切断 中 ゴール 入力) | `{{UC_EDGE_1_BEHAVIOR}}` (例: local cache に 保存 + 復帰時 自動 sync) |
| 2 | `{{UC_EDGE_2_TRIGGER}}` (例: LLM 応答 timeout 30 秒 超) | `{{UC_EDGE_2_BEHAVIOR}}` (例: error toast 表示 + retry button) |

---

## §3. 画面 遷移 / UI フロー

### §3.1 画面 一覧

| # | 画面 名 | route path | 主要 component |
|---|---|---|---|
| 1 | `{{SCREEN_1_NAME}}` (例: ゴール 入力 form) | `{{SCREEN_1_ROUTE}}` (例: `/goals/new`) | `{{SCREEN_1_COMPS}}` (例: textarea + submit button) |
| 2 | `{{SCREEN_2_NAME}}` (例: タスク 分解 結果) | `{{SCREEN_2_ROUTE}}` (例: `/goals/[id]/breakdown`) | `{{SCREEN_2_COMPS}}` |
| 3 | `{{SCREEN_3_NAME}}` (例: カレンダー 反映 確認) | `{{SCREEN_3_ROUTE}}` | `{{SCREEN_3_COMPS}}` |

### §3.2 遷移 図 (= text 形式、 mermaid 推奨)

```text
[entry: dashboard] --click "新規ゴール"--> [{{SCREEN_1_NAME}}]
[{{SCREEN_1_NAME}}] --submit textarea--> [loading: AI 分解中]
[loading: AI 分解中] --200 OK--> [{{SCREEN_2_NAME}}]
[loading: AI 分解中] --timeout/error--> [error toast + retry]
[{{SCREEN_2_NAME}}] --click "カレンダー 反映"--> [{{SCREEN_3_NAME}}]
[{{SCREEN_3_NAME}}] --confirm--> [success toast + dashboard]
```

### §3.3 状態 (= UI state、 ≥ 4 件)

- `idle`: `{{STATE_IDLE_DESC}}` (例: textarea 空、 submit disabled)
- `loading`: `{{STATE_LOADING_DESC}}` (例: spinner + 「AI 分解中...」 表示、 input disabled)
- `success`: `{{STATE_SUCCESS_DESC}}` (例: 結果 list 表示、 「カレンダー 反映」 button 活性)
- `error`: `{{STATE_ERROR_DESC}}` (例: error toast + retry button、 input 復活)

---

## §4. API 仕様 (= 関連 endpoint、 OpenAPI 風)

### §4.1 endpoint 一覧

| # | method | path | 用途 | 認証 |
|---|---|---|---|---|
| 1 | POST | `{{API_PATH_1}}` (例: `/api/goals/breakdown`) | `{{API_PURPOSE_1}}` (例: ゴール → タスク AI 分解) | required (Bearer JWT) |
| 2 | GET | `{{API_PATH_2}}` (例: `/api/goals/[id]`) | `{{API_PURPOSE_2}}` | required |
| 3 | POST | `{{API_PATH_3}}` (例: `/api/goals/[id]/calendar-sync`) | `{{API_PURPOSE_3}}` | required |

### §4.2 endpoint 詳細 (= 主要 1 件 のみ ここで 詳述、 他 は 同形式 で 別 file 可)

#### POST `{{API_PATH_1}}`

**request body** (JSON):

```json
{
  "goal_text": "string (≤ 500 chars、 自然言語、 例: '3 ヶ月 で TOEIC 800 取る')",
  "user_id": "uuid (= JWT sub claim 一致 必須)",
  "deadline_days": "integer (≥ 1, ≤ 365、 任意、 default 90)"
}
```

**response 200 OK** (JSON):

```json
{
  "goal_id": "uuid",
  "milestones": [
    {
      "week_index": "integer (1-N)",
      "title": "string",
      "tasks": [
        {
          "task_id": "uuid",
          "title": "string",
          "estimated_minutes": "integer (≥ 5)"
        }
      ]
    }
  ]
}
```

**error responses**:

| code | meaning | body |
|---|---|---|
| 400 | input validation fail | `{ "error": "string", "field": "string" }` |
| 401 | auth fail | `{ "error": "unauthorized" }` |
| 429 | rate limit (= LLM cost cap) | `{ "error": "rate_limited", "retry_after_sec": integer }` |
| 500 | LLM fail / DB fail | `{ "error": "string", "request_id": "uuid" }` |

**rate limit**: `{{API_RATE_LIMIT}}` (例: 10 req/min/user)

**LLM cost**: `{{API_LLM_COST}}` (例: 約 ¥3/req、 月 ¥500 cap = 約 167 req/月/user)

---

## §5. データ モデル (= persistence、 schema)

### §5.1 table / collection

| name | 主用途 | 主要 column / field |
|---|---|---|
| `{{TABLE_1}}` (例: `goals`) | `{{TABLE_1_PURPOSE}}` | `id uuid PK / user_id uuid FK / goal_text text / created_at timestamptz / status enum(active,done,abandoned)` |
| `{{TABLE_2}}` (例: `milestones`) | `{{TABLE_2_PURPOSE}}` | `id uuid PK / goal_id uuid FK / week_index integer / title text` |
| `{{TABLE_3}}` (例: `tasks`) | `{{TABLE_3_PURPOSE}}` | `id uuid PK / milestone_id uuid FK / title text / estimated_minutes integer / status enum` |

### §5.2 RLS (= row-level security、 supabase 想定)

- `{{RLS_RULE_1}}` (例: `goals.user_id = auth.uid()` で SELECT/UPDATE/DELETE 制限)
- `{{RLS_RULE_2}}` (例: `milestones` は `goals` JOIN 経由 で 同一 user のみ)

---

## §6. 受入 条件 (= acceptance criteria、 機械 verify 可能 形式)

### §6.1 機能 受入 (= phase 5 E2E spec.ts で 機械 verify、 ≥ 5 件)

- [ ] AC-01: `{{AC_01}}` (例: ゴール 入力 form で textarea ≥ 10 chars 入力後 submit すると POST `/api/goals/breakdown` が 1 回 fire される)
- [ ] AC-02: `{{AC_02}}` (例: API 200 OK で milestones ≥ 1 件 が 画面 に list 表示 される、 各 milestone は week_index + title + tasks 表示)
- [ ] AC-03: `{{AC_03}}` (例: 「カレンダー 反映」 button click で POST `/api/goals/[id]/calendar-sync` が 1 回 fire + success toast 表示)
- [ ] AC-04: `{{AC_04}}` (例: ゴール text < 10 chars で submit すると client-side error message 表示、 API call 0 回)
- [ ] AC-05: `{{AC_05}}` (例: API 500 error 時 error toast + retry button 表示、 retry click で 再 API call 1 回)

### §6.2 性能 受入 (= phase 5 で 機械 計測、 ≥ 3 件)

- [ ] PERF-01: `{{PERF_01}}` (例: ゴール 入力 → 結果表示 P95 ≤ 5 秒)
- [ ] PERF-02: `{{PERF_02}}` (例: 画面 LCP ≤ 2.5 秒、 CLS ≤ 0.1)
- [ ] PERF-03: `{{PERF_03}}` (例: API rate limit 10 req/min 超過 時 429 即返、 LLM call 0 回)

### §6.3 セキュリティ 受入 (= phase 5 + 7 で 機械 verify、 ≥ 4 件)

- [ ] SEC-01: `{{SEC_01}}` (例: 別 user の goal_id 指定 で 401/403、 RLS BLOCK)
- [ ] SEC-02: `{{SEC_02}}` (例: goal_text に script tag 含む 入力 時 sanitize + DB に raw 保存しない)
- [ ] SEC-03: `{{SEC_03}}` (例: JWT expired 時 401 + frontend 自動 logout)
- [ ] SEC-04: `{{SEC_04}}` (例: rate limit byp 試行 (header 操作) で 429 + audit log 記録)

### §6.4 アクセシビリティ 受入 (= phase 5 で 機械 verify、 ≥ 3 件)

- [ ] A11Y-01: `{{A11Y_01}}` (例: textarea に aria-label 設定済、 submit button キーボード focus 可)
- [ ] A11Y-02: `{{A11Y_02}}` (例: error toast は role=alert + aria-live=polite)
- [ ] A11Y-03: `{{A11Y_03}}` (例: button tap target ≥ 44x44 px、 reduced-motion 対応)

---

## §7. 関連 E2E spec.ts (= phase 5 配備、 placeholder)

> 本 feature_spec の §6 受入 条件 を 機械 verify する E2E spec.ts は 以下 path に 配備:

- `tests/e2e/specs/{{FEATURE_ID_LOWER}}_smoke.spec.ts` (= 最小 smoke)
- `tests/e2e/specs/{{FEATURE_ID_LOWER}}_full.spec.ts` (= 全 §6 受入 網羅、 任意)

雛形 source: `templates/tests/e2e/specs/feature_spec_smoke.spec.ts.template` (dev-system)

---

## §8. 依存 (= 前提 機能 / 外部 サービス)

### §8.1 内部 機能 依存 (= 同 App 内 他 feature)

- `{{INTERNAL_DEP_1}}` (例: `FEAT-LAIS-AUTH-001` (認証 機能、 JWT 発行))
- `{{INTERNAL_DEP_2}}` (例: `FEAT-LAIS-USER-001` (user profile))

### §8.2 外部 サービス 依存 (= 3rd party)

| # | service | 用途 | 月額 cost (想定) | 代替案 |
|---|---|---|---|---|
| 1 | `{{EXT_DEP_1_NAME}}` (例: Anthropic API) | LLM 推論 | `{{EXT_DEP_1_COST}}` (例: ¥500/月 cap) | OpenAI / Google Gemini |
| 2 | `{{EXT_DEP_2_NAME}}` (例: Supabase) | DB + auth | `{{EXT_DEP_2_COST}}` (例: free tier) | Cloudflare D1 + Workers Auth |
| 3 | `{{EXT_DEP_3_NAME}}` (例: Google Calendar API) | カレンダー 連携 | `{{EXT_DEP_3_COST}}` (例: free tier) | iCal export |

### §8.3 PO escalation 必要 依存 (= cost ≥ ¥500/月 の 場合 `core_spec.md` §4 escalation)

- `{{PO_ESCALATION_DEP}}` (例: 該当 なし、 ≥ ¥500/月 service 追加 時 別途 PO 承認 必須)

---

## §9. 仕様書 駆動 (spec-first) 原則 適合 表明

> 本 feature_spec は phase 3 実装 の 真値 SSoT。 phase 3 実装 (= `src/`) は 本 file の §3 (画面) / §4 (API) / §5 (データ) / §6 (受入) を 構造的 に 反映 する 義務 を 負う。
> 仕様書 不在 で `src/` に 機能 追加 (= impl-only drift) は `scripts/devs_impl_only_check.sh` (dev-system 側) / `scripts/impl_only_check.sh` (App 側) で **機械 BLOCK**。
> phase 4 一致 test (双方向 drift_check) で 本 file の API path / route path 等 が 真に 実装 されている か 機械 verify、 不一致 = push BLOCK。

---

## §10. cross-ref + 改変

### §10.1 cross-ref

- `core_spec.md` §2.25.24 7-phase 開発 ワークフロー 必須化 (本 file 配備 root)
- `templates/concept/concept.md.template` (phase 1 雛形、 本 file の 入力 SSoT)
- `templates/tests/e2e/specs/feature_spec_smoke.spec.ts.template` (phase 5 E2E spec 雛形)
- `scripts/devs_spec_impl_drift_check.sh` (phase 4 順方向、 spec → 実装 drift)
- `scripts/devs_impl_only_check.sh` (phase 4 逆方向、 spec 不在 impl drift)
- `docs/po-decisions.md` PO-DIRECTIVE-014 (PO 承認 元)

### §10.2 改変履歴

- `{{SPEC_DATE}}`: 初版 (= placeholder 置換 完了 + spec review 通過)
- (以降 placeholder 置換 後 追記)
