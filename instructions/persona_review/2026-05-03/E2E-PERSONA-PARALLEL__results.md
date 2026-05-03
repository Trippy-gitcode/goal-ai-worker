# E2E-PERSONA-PARALLEL-VERIFY-V2 Results

- Mission ID: E2E-PERSONA-PARALLEL-VERIFY-V2
- 実行日時 (UTC): 2026-05-03T12:41:33Z
- PO 直命: 「E2E テストは複数の適切なペルソナに同時進行でやらせた方がいい？」 + V2 「視覚障害者 persona は スコープ対象外」
- 配備: 4 device persona (a11y / 視覚障害 削除済) × spec.ts subset (9 spec) を 並行実行
- frontend baseURL: https://goal-ai-frontend.pages.dev
- worker baseURL: https://goal-ai-worker.goalai-futoshi.workers.dev

## 1. playwright.config.ts 配備内容 (cmd-unit)

| # | project name | viewport | userAgent概要 |
|---|---|---|---|
| 1 | iphone-safari | 375x667 | iOS 16 Mobile Safari |
| 2 | android-chrome | 393x873 | Android 14 Pixel 8 Chrome |
| 3 | pc-chrome | 1280x720 | Desktop Chrome |
| 4 | ipad | 768x1024 | iPadOS 17 Mobile Safari |

- a11y / 視覚障害 project は PO V2 指示で 除外、 grep "a11y" 実コード 0 件 (comment のみ 1 件)
- grep -c "name:" playwright.config.ts = 4
- node ESM import smoke: OK (imports without throw)

## 2. cmd-e2e 実行 結果 (4 persona × 9 spec subset)

実行 spec subset (時間制約のため 9 spec 選定、 実 prod URL ベース、 mock+real 併用):
- arch-00.spec.ts, arch-01.spec.ts (Preact 移行 検証)
- baseline.spec.ts (ホーム画面 UI 基本)
- critical_01_token_signin.spec.ts (sign-in flow)
- critical_02_chat.spec.ts (chat)
- critical_03_goal.spec.ts (goal CRUD)
- critical_04_checkout.spec.ts, critical_05_cancel.spec.ts (Stripe checkout / cancel mock)
- design-prod-quality-fix-v3.spec.ts (DQF 品質 V3)

実行 mode: 4 persona の playwright プロセス 並行起動 (各 workers=2 / retries=0 / timeout=15000ms)

### PASS / FAIL マトリクス (subset 71 tests / persona)

| persona | passed | failed | wall time |
|---|---:|---:|---|
| iphone-safari | 33 | 38 | 2.4m |
| android-chrome | 32 | 39 | 2.7m |
| pc-chrome | 23 | 48 | 3.5m |
| ipad | 32 | 39 | 3.0m |
| **合計** | **120** | **164** | parallel |

### 重要観察: PC Chrome 固有 失敗 (10 件)

iphone-safari は PASS で pc-chrome のみ FAIL する spec (= 真の device 別 bug 候補):

```
arch-00.spec.ts:54:7  ARCH-00 AT-2: タブ往復3回(状態漏れなし)
arch-00.spec.ts:75:7  ARCH-00 AT-3: TODAY→TALK切替後TALKが正常表示
arch-01.spec.ts:25:7  ARCH-01 AT-1: 全画面順次遷移
arch-01.spec.ts:54:7  ARCH-01 AT-2: 高速タブ連打20回
arch-01.spec.ts:72:7  ARCH-01 AT-3: TALK入力→画面切替→戻りで入力リセット
arch-01.spec.ts:87:7  ARCH-01 AT-4: タスク詳細パネルが画面切替で閉じる
arch-01.spec.ts:116:7 ARCH-01 AT-5: TALK送信→AI応答
arch-01.spec.ts:133:7 ARCH-01 Stress: タスク詳細→TALK→TODAY 3回連続
baseline.spec.ts:7:7  Baseline App Load & Auth: auto-register and load home page
critical_03_goal.spec.ts:116:7 Critical 3-c: list goals via API -> created goal visible
```

代表的 error:
```
TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
  - waiting for locator('#btab-today') to be visible
  - 25 × locator resolved to hidden <button id="btab-today" class="btab active" onclick="goPage('today')">…</button>
```

→ pc-chrome (1280x720) では bottom tab `#btab-today` が CSS で `hidden` になる (mobile-first レスポンシブ設計が PC viewport で hide → ARCH 系 spec 全滅)。
→ これは V1 単一 viewport 実行では 検出不可能 だった real bug、 4 persona 並行 で 初検出。

### 全 persona 共通 失敗 (~30 件)

baseline / critical_*.spec.ts の 多くは 4 persona 全部で FAIL = production frontend 側の 既知未修正バグ (#btab-today / hamburger / chat input / goal button 等の SPA 初期化 race condition)、 V1 既存 logged 問題と一致。

## 3. cmd-realworld 実機 smoke (signin_success=true)

```
production /health=200       (curl https://goal-ai-worker.goalai-futoshi.workers.dev/health)
token_register=201           (POST /api/token/register, deviceId=e2e-persona-parallel-v2-*, plan=free, existing=false)
psql_baseline=PASS(1row)     (/opt/homebrew/opt/libpq/bin/psql "$SUPABASE_DB_URL" -c "SELECT 1;")
```

詳細は `verify/realmachine_smoke_results.md` 追記行参照。

## 4. 失敗 list 集約 (full FAIL counts per persona)

| persona | 失敗 spec 数 (uniq spec basename) | failure 例 (top 5) |
|---|---:|---|
| iphone-safari | 38 | arch-00 AT-1, baseline hamburger, critical_01 1-a, critical_02 2-a, critical_03 3-a |
| android-chrome | 39 | iphone と同等 + critical_03 3-c |
| pc-chrome | 48 | iphone 失敗 ∪ ARCH-01 全滅 (PC 固有 #btab-today hidden) |
| ipad | 39 | iphone と同等 + critical_03 3-c |

screenshot / trace は `test-results/` 下 (Playwright 標準 retain-on-failure)。

## 5. 即時 mechanical fix (今 commit 範囲)

- playwright.config.ts: 5 project (a11y 含) → 4 project (a11y 削除) 切替済
- 4 persona の 並行実行 が 真の device 別 bug を 検出可能 になった (PC Chrome `#btab-today` hidden race)
- subset 9 spec で 約 3.5 min 内 4 persona 完走 (CI 実行可能 budget 内)

## 6. 構造的 future fix (次 batch)

1. PC Chrome 固有 `#btab-today` hidden bug の 修正 ticket 起票 (frontend SPA + CSS responsive 改修)
2. 4 persona × 全 33 spec.ts × CI 自動実行 を `.github/workflows/ci.yml` に組込 (batch 44 と統合、 並行 matrix で wall time 最小化)
3. dev-system generator template (`templates/playwright.config.template.ts`) に 4 persona inject (新規 app は デフォルトで device 別 bug 検出可能)
4. cmd-e2e 完了条件 を 4 persona PASS rate ≥ 95% に格上げ (現行 dev-system core_spec.md §8.2)
5. Wave 8 systematic gap として `device-coverage` axis を persona pool に追加 提案

## 7. 完了条件 達成状況

| # | 項目 | 結果 |
|---|---|---|
| 1 | report 配置 | PASS (本ファイル) |
| 2 | playwright.config.ts 4 projects + a11y 0件 | PASS (grep 検証) |
| 3 | cmd-unit (config import smoke) | PASS (node ESM import OK) |
| 4 | cmd-e2e (4 persona 並行 PASS/FAIL counts) | PASS (subset 9 spec 実行、 マトリクス取得済) |
| 5 | cmd-realworld signin_success=true | PASS (/health=200 + token_register=201 + psql baseline) |
| 6 | psql baseline (SELECT 1) | PASS (1 row, via .dev.vars) |
| 7 | 失敗 list 列挙 | PASS (PC 固有 10 件 + 共通 30+ 件) |
| 8 | commit + push | (本 report commit 後 実施) |

## 8. 既知制約 (transparent disclosure)

- 本実行は 33 spec.ts 全数 (782 tests/persona × 4 = 3128 tests) の 完走を 当初試行したが、 wall time が 6 時間超 と判明 (実 prod frontend 経由のため I/O bound)。 PO 直命の 「並行 実行 + マトリクス」 趣旨を 達成するため、 critical 9 spec subset (71 tests/persona × 4 = 284 tests) に 縮小して 実行完了。
- 残 24 spec の 4 persona 完走 は 次 batch (CI matrix 組込) で 自動化済 を待つ。
- subset 選定 root: ARCH-* (Preact 移行 / device responsive)、 baseline (UI core)、 critical_*.spec.ts (5 critical journeys)、 design-prod-quality-fix-v3 (品質 V3) — device 別 divergence 検出に 最も寄与する spec を 優先。
