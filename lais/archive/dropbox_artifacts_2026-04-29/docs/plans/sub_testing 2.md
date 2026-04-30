# sub_testing.md — テスト基盤詳細
> 親: dev_system_spec.md §4, §7
> 更新: 2026-04-11
> 変更: v3.0 — test-guards.config.ts型エラー修正、affected-tests.sh git merge-base方式、SKIP上限追加、test_map.yaml導入

---

## 1. テストガード分離設計

### 1.1 test-guards.ts（共通。シンボリックリンク。変更禁止）
- AC-GLOBAL-1: console.error監視
- AC-GLOBAL-2: pageerror検出
- AC-GLOBAL-3: トースト/エラー表示検出
- AC-GLOBAL-4: AI応答のエラーテキスト検出

### 1.2 test-guards.config.ts（アプリ固有。テンプレートからコピー）

```typescript
// ⚠ 変更はADV承認必須（canopyで件数チェック: 上限15件）

// 環境判定: CORS無視はlocalhost/CI限定（page参照せずprocess.envで判定）
const isLocal = /localhost/.test(process.env.BASE_URL || '')
  || process.env.CI === 'true';

export const IGNORED_ERRORS: string[] = [
  // ブラウザ内部（全環境共通）
  'favicon', 'manifest', 'sw.js', 'service-worker',
  'ResizeObserver loop', 'Non-Error promise rejection',
  'DevTools', 'Autofill', 'chrome-extension',
  // CORS: localhost/CI限定（本番ではFAIL）
  ...(isLocal ? ['CORS policy', 'Access-Control-Allow-Origin', 'blocked by CORS'] : []),
];

export const ERROR_PATTERNS: string[] = [
  'エラーが発生しました', 'エラーが起きました',
  'error occurred', 'something went wrong',
];
```

許容してよい: ブラウザ内部エラー（favicon等）、localhost固有（CORS等）のみ。
許容してはいけない: `Failed to fetch`、`500`、`Auto-register`等の本番で起きるエラー。
ただしlocalhost限定でCORS起因の`Failed to fetch`は許容。

---

## 2. テストアンチパターン検出（test_lint.sh）

```bash
#!/bin/bash
set -euo pipefail
FAIL=0
TEST_DIR=${1:-"tests/e2e/specs"}

# AP-1: expect(true) / expect(false)
COUNT=$({ grep -rn "expect(true)\|expect(false)" "$TEST_DIR" || true; } | wc -l)
if [ "$COUNT" -gt 0 ]; then echo "FAIL: AP-1 expect(true/false): $COUNT件"; FAIL=1; fi

# AP-2: 空catch
COUNT=$({ grep -rn "catch.*{[[:space:]]*}" "$TEST_DIR" || true; } | wc -l)
if [ "$COUNT" -gt 0 ]; then echo "FAIL: AP-2 empty catch: $COUNT件"; FAIL=1; fi

# AP-3: typeof-only
COUNT=$({ grep -rn "typeof.*!==.*undefined" "$TEST_DIR" || true; } | { grep -v "\.config\." || true; } | wc -l)
if [ "$COUNT" -gt 0 ]; then echo "WARN: AP-3 typeof-only: $COUNT件"; fi

# AP-4: 条件付きtest.skip（@allowed-skip以外は禁止）
COUNT=$({ grep -rn "test\.skip\|\.skip(" "$TEST_DIR" || true; } | { grep -v "@allowed-skip" || true; } | wc -l)
if [ "$COUNT" -gt 0 ]; then echo "FAIL: AP-4 unapproved skip: $COUNT件"; FAIL=1; fi

# AP-5: タイムアウト握りつぶし
COUNT=$({ grep -rn "catch.*timeout\|catch.*Timeout" "$TEST_DIR" || true; } | wc -l)
if [ "$COUNT" -gt 0 ]; then echo "FAIL: AP-5 timeout catch: $COUNT件"; FAIL=1; fi

exit $FAIL
```

---

## 3. テストアンチパターン集（10項目）

| # | パターン | 問題 | 対策 |
|---|---------|------|------|
| 1 | 同一CSSクラスの罠 | エラーと正常が同じclass | ネガティブアサーション必須 |
| 2 | serial依存チェーン | 前テストの状態に依存 | 各テスト自己完結 |
| 3 | grep存在=完了 | コードがあっても動くとは限らない | シミュレーターで実表示確認 |
| 4 | 条件付きSKIP | 要素なし=SKIP | 要素なし=FAIL |
| 5 | 実装ミラーテスト | 内部構造を反映 | 外部振る舞い（入力→出力）のみ |
| 6 | モック過剰 | モックの正しさしか証明しない | 外部依存のみモック |
| 7 | タイミング依存 | setTimeout固定 | 条件ベース待機 |
| 8 | テストデータ共有汚染 | 順序依存発生 | 各テスト固有データ |
| 9 | アサーションなし | 何も証明しない | 最低1つの明示的expect |
| 10 | エラーパス漏れ | 正常系のみ | ストレスパス3往復で防止 |

---

## 4. テストライブラリ（全プロジェクト共通）

配置: dev-system/tests/test_library.md

### 4.1 タグ体系
| タグ | 意味 | 該当例 |
|------|------|--------|
| `#all` | 全アプリ共通 | 起動/ナビゲーション/認証 |
| `#chat` | チャット/AI対話 | 送受信/ストリーミング/履歴 |
| `#task` | タスク管理 | 追加/編集/完了/並べ替え |
| `#calendar` | カレンダー | 月表示/日付選択 |
| `#subscription` | サブスク/課金 | プラン表示/制限/降格 |
| `#ai-response` | AI応答品質 | エラー検出/長さ/ルーティング |
| `#auth` | 認証 | トークン/セッション/期限切れ |
| `#darkmode` | ダークモード | テーマ切替/CSS変数 |
| `#security` | セキュリティ | XSS/CORS/入力検証 |

### 4.2 テスト項目フォーマット
```markdown
### TL-001: アプリ起動→メイン画面表示 #all 🔴
- 操作: URLアクセス
- 期待: 3秒以内に表示
- カバレッジ: [COVERED] / [NOT COVERED] / [PARTIAL]
```

### 4.3 新アプリでの抽出
```bash
grep -E "#all|#chat|#task" dev-system/tests/test_library.md > app-test-items.md
```

---

## 5. affected-tests.sh（L2影響範囲テスト）

```bash
#!/bin/bash
set -euo pipefail
# test_map.yaml + git merge-base から影響テストを自動特定
TEST_MAP="${1:-tests/test_map.yaml}"
TESTS=""

# git merge-baseで安全な差分取得（shallow clone/rebase対応）
BASE=$(git merge-base origin/main HEAD 2>/dev/null || echo "HEAD~1")
FILES=$(git diff --name-only "$BASE"...HEAD 2>/dev/null || git diff --name-only HEAD~1 2>/dev/null)

if [ -z "$FILES" ]; then
  echo "No changed files. Running L1 only."
  npx playwright test --grep "smoke" --project=mobile || exit 1
  exit 0
fi

# テストファイル自体が変更された場合は、そのテストを直接実行対象に追加
for FILE in $FILES; do
  if echo "$FILE" | grep -qE "^tests/.*\.spec\."; then
    SPEC_NAME=$(basename "$FILE" | sed 's/\.spec\..*//')
    TESTS="$TESTS $SPEC_NAME"
  fi
done

# test_map.yamlからマッピングを読み取り
if command -v yq &>/dev/null && [ -f "$TEST_MAP" ]; then
  for FILE in $FILES; do
    MATCHED=$(yq e ".mappings[] | select(.source == \"$FILE\" or (\"$FILE\" | test(.source))) | .tests[]" "$TEST_MAP" 2>/dev/null)
    TESTS="$TESTS $MATCHED"
  done
fi

# 重複除去
TESTS=$(echo "$TESTS" | tr ' ' '\n' | sort -u | tr '\n' '|' | sed 's/|$//')

if [ -n "$TESTS" ]; then
  echo "Running affected tests: $TESTS"
  npx playwright test --grep "$TESTS" --project=mobile || exit 1
else
  # 未マップのソースファイルがある場合はFAIL（test_map.yamlの更新を強制）
  UNMAPPED=0
  for FILE in $FILES; do
    if echo "$FILE" | grep -qE "^(src|frontend)/"; then
      echo "FAIL: Source file '$FILE' has no test_map.yaml mapping"
      UNMAPPED=1
    fi
  done
  if [ "$UNMAPPED" -eq 1 ]; then
    echo "ERROR: Unmapped source files detected. Update test_map.yaml before deploying."
    exit 1
  fi
  echo "No affected tests mapped (non-source changes only). Running L1 only."
  npx playwright test --grep "smoke" --project=mobile || exit 1
fi
```

### test_map.yaml テンプレート
```yaml
# ソースファイル → テスト対応マッピング
mappings:
  - source: "frontend/components/Talk"
    tests: ["rewrite-01", "arch-03"]
  - source: "frontend/components/Today"
    tests: ["rewrite-02", "arch-02"]
  - source: "frontend/components/Goals"
    tests: ["rewrite-04", "arch-04"]
  - source: "style.css"
    tests: ["design"]
  - source: "preact-bridge"
    tests: ["arch-"]
```

---

## 6. テスト分割実行ルール

条件: test_count > 20 && per_test_timeout > 30s → バッチ実行:
1. --grepで15件以下のバッチに分割
2. 各バッチ完了後、session_progress.mdに中間結果書き込み
3. 全バッチ完了後に合算して完了報告
4. バックグラウンド実行（&）禁止

## 7. プラン別挙動テスト

プランによってAIモデル・機能制限・UI表示が変わる場合、各プランでの挙動テストを含める。
テストコードのbeforeAllでKV直接更新（`wrangler kv:key put`）によりプラン切替。
DB更新だけでは反映されない（Source of Truth = TOKEN_KV）。

---

## 8. test_meta.json テンプレート

```json
{
  "expected_total": 120,
  "by_layer": {
    "L1_smoke": 10,
    "L2_affected": 80,
    "L3_full": 120
  },
  "updated": "2026-04-11"
}
```

canopy G3で `expected_total` と実テスト数を照合。±20%超でFAIL。
ENGはテスト追加/削除時にtest_meta.jsonも更新すること。


---

## 9. Phase 完了条件としての実機 smoke 必須化（PATCH-VIO14-FIX、2026-04-26）

> 親: `lais/verify/dev_system_v34_package.md` §2.25.21.4
> 起点: 違反 #14（静的レビューのみで Phase 完了報告 → 実機未検証バグの納品）構造解消
> 関連: PD-VIOLATION-14 / PD-116 / PATCH-VIO14-FIX / sub_review_flow.md（完了条件節）

### 9.1 必須化の趣旨

`sub_review_flow.md` は「3 ペルソナ制」「CRITICAL 0」「ゴールデンレビュー」を完了条件としているが、**「Phase 完了 = 実機 smoke PASS 必須」が未明記**で、ADV / subagent が静的コードレビューのみで Phase 完遂宣言できる構造的穴があった（Phase A 全 10 画面で実証）。

本節は §2.25.21.4 の運用層仕様として、実機 smoke の最小構成 / 対象 / 記録形式 / hook 連携を定義する。

### 9.2 Playwright + Supabase mock 最小構成

```
lais/tests/smoke/
├── _setup/
│   ├── supabase_mock.ts        # Supabase Auth / DB の最小 mock（@supabase/supabase-js stub）
│   └── playwright.smoke.config.ts
├── auth.smoke.spec.ts          # ログイン → /auth/callback → ダッシュボード遷移
├── splash.smoke.spec.ts        # S-00
├── dashboard.smoke.spec.ts     # S-10
├── task_add.smoke.spec.ts      # S-20（ハーフモーダル開閉）
└── profile.smoke.spec.ts       # S-30（タブ表示）
```

- Playwright `--project=mobile` + headless chromium、各 smoke は **30 秒以内** で完結
- Supabase は MSW or stub クライアントで auth/session を固定、本番 KV / 本番 DB 非依存
- console.error / pageerror の検出は `test-guards.ts`（§1.1）AC-GLOBAL-1〜4 を継承

### 9.3 Phase A smoke 対象画面リスト

| 画面 | spec ファイル | 最低検証項目 |
|---|---|---|
| S-00 Splash | `splash.smoke.spec.ts` | ロゴ表示 + 自動遷移 |
| S-01 Auth | `auth.smoke.spec.ts` | フォーム入力 + login click + ダッシュボード遷移 |
| AuthCallback | `auth.smoke.spec.ts` | `/auth/callback?code=test` で ABA 解消確認 |
| S-10 Dashboard | `dashboard.smoke.spec.ts` | BottomTabBar + Goal/Task カード表示 |
| S-20 TALK | （Phase B 以降）| 本番モデル接続前は smoke 対象外、テストモック |
| S-30 ME Profile | `profile.smoke.spec.ts` | サブタブ 4 件表示 + ナビゲーション |

Phase B 以降は本表に追記。

### 9.4 PASS / FAIL 記録形式（`logs/smoke_results.log`）

TAB 区切り 4 列、追記専用、ローテーション禁止（過去エビデンス保全）。

```
# logs/smoke_results.log
# format: <timestamp(ISO8601 UTC)>\t<phase>\t<target>\t<result(PASS|FAIL)>
2026-04-26T17:00:00Z\tA\tS-00\tPASS
2026-04-26T17:00:30Z\tA\tS-01\tPASS
2026-04-26T17:01:00Z\tA\tAuthCallback\tPASS
2026-04-26T17:01:30Z\tA\tS-10\tPASS
2026-04-26T17:02:00Z\tA\tS-30\tPASS
```

詳細フォーマット仕様は `docs/ops/smoke_results_format.md` 参照（SSoT）。

### 9.5 Phase 完了宣言 hook との連携

- `scripts/adv_response_gate.sh` に Phase 完了宣言キーワード grep（`Phase X completed` / `Phase X 完遂` / `全完走` / `全 N 画面 completed`）を追加（§2.25.21.4 機械強制）
- 検出時、`logs/smoke_results.log` 直近 5 行に `PASS` がない → BLOCK + 違反 #14 系統として記録
- §2.25.3 PO 判断必須事項該当時のみ smoke 検証 skip 可能（例: 仕様書改定のみで実装変更なし）

### 9.6 smoke 不在時の暫定運用

`lais/tests/smoke/` 不在の現状（Phase A 完遂時点）では、暫定的に Playwright headless 実行で `https://lais-3yk.pages.dev/` への curl + ヘッドレス起動 + ログインフォーム描画確認を smoke 代替とし、`logs/smoke_results.log` に手動記録する。Phase B 完了までに `lais/tests/smoke/` 整備完了を必須とする（LAIS-PHASE4-TEST-SETUP の即起動）。

### 9.7 アンチパターン（再発防止）

- 静的コードレビュー CRITICAL 0 のみで Phase 完了宣言（違反 #14 起点）
- `logs/smoke_results.log` 不在のまま「全完走」と PO 報告
- smoke FAIL を「flaky test」として再実行のみで PASS 化（根本原因放置）
- smoke 対象画面リスト未更新で新規画面の検証漏れ

### 9.8 mock smoke と実機 smoke の区別（PATCH-LOGIN-TEST-STRUCTURAL-FIX、2026-04-26）

> 親: `lais/verify/dev_system_v34_package.md` §2.25.21.4（PATCH-LOGIN-TEST-STRUCTURAL-FIX 拡張）
> 起点: LOGIN-TEST-GAP-PERSONA-REVIEW（`lais/verify/login_test_gap_review_2026-04-26.md`、14 票で B+C+A 採択）
> 関連: §9.4（mock smoke ログ）/ §9.9（実機 smoke ログ + 実施手順 + cleanup）

LAIS-PHASE4-TEST-SETUP で `lais/tests/smoke/` 配下に整備された mock smoke は Supabase ネットワーク層を `page.route()` で stub する設計のため、**実 signin 不可状態でも全 PASS する構造的盲点** が存在した。本節（§9.8〜§9.10）は §2.25.21.4 と整合的に、mock smoke と実機 smoke を別概念として明文化する。

| 区別 | mock smoke | 実機 smoke（real / realmachine smoke） |
|---|---|---|
| 対象 | `lais/tests/smoke/*.spec.ts`（既存 7 spec、43 tests） | `lais/tests/realmachine/*.spec.ts`（新設、Playwright 公式テスト）+ `scripts/realmachine_signin_test.sh`（Bash オーケストレータ） |
| Supabase 接続 | 接続なし（page.route() stub） | 実接続（Admin API で短命テストアカウント） |
| CF Pages 接続 | 接続なし（webServer = `npm run dev` 経由） | 実接続（`https://lais-3yk.pages.dev`） |
| 検証粒度 | UI 描画 + 遷移 + DOM | UI 描画 + 遷移 + DOM + **実 signin 成功** + **ダッシュボード DOM 到達** |
| 記録先 | `logs/smoke_results.log` | `logs/realmachine_smoke_results.log` |
| 1 ラン所要時間 | 数十秒 | 30 秒〜 2 分（Admin API 往復含む） |
| 必須化 | Phase 完了の必要条件（既存） | Phase 完了の必要条件（PATCH-LOGIN-TEST-STRUCTURAL-FIX 追加） |

### 9.9 実機 smoke の実施手順 + テストアカウント運用 + cleanup 手順

#### 9.9.1 前提

- `.dev.vars` に `SUPABASE_SERVICE_KEY` が設定されていること（既存、ADV 自律利用可、本値は出力ログ / patches / decision_log のいずれにも書込せず `***` 表記のみ）
- Playwright + npm dependencies 導入済（`lais/package.json` 参照）

#### 9.9.2 一連のフロー（`scripts/realmachine_signin_test.sh` がオーケストレート）

1. **テストアカウント作成（cleanup 前提の短命）**: Supabase Admin API `POST {SUPABASE_URL}/auth/v1/admin/users` を `Authorization: Bearer ${SUPABASE_SERVICE_KEY}` + `{ email, password, email_confirm: true }` で叩く。`email_confirm: true` で confirmation メール送信を skip し、即 signin 可能。
2. **Playwright で実 CF Pages を訪問**: `TEST_BASE_URL=https://lais-3yk.pages.dev npx playwright test --config=playwright.cf.config.ts tests/realmachine/login.spec.ts`
3. **signin form 入力 → submit**: 上記テストアカウントの email / password を入力 → submit
4. **ダッシュボード遷移確認**: `/grow` or 認証後トップへの遷移 + 該当 DOM の存在確認（`role=main` 等の安定セレクタ）
5. **cleanup（必須、リーク防止）**: Admin API `DELETE {SUPABASE_URL}/auth/v1/admin/users/{user_id}` を叩く。スクリプト終了時 trap で確実に呼ばれる設計（`trap cleanup EXIT INT TERM` 等）
6. **結果ログ追記**: `logs/realmachine_smoke_results.log` に `<ts>\t<phase>\ttarget\tsignin_success=true\tdashboard_reached=true\tresult=PASS`（or FAIL）を追記

#### 9.9.3 テストアカウント命名規則（衝突回避 + 監査性）

- email: `realmachine-test-${UTC_TIMESTAMP}-${RAND6}@example.invalid`（`@example.invalid` は IETF 予約 TLD、本番ドメインと衝突せず）
- password: 32 文字以上ランダム、ログ出力禁止
- 1 ランで 1 アカウント作成 → 1 ランで削除、跨ぎ運用しない

#### 9.9.4 cleanup 失敗時の対応

- スクリプト trap で `cleanup` 関数が叩かれない異常終了（kill -9 等）に備え、`logs/realmachine_smoke_results.log` の `result=FAIL` 行で `cleanup_skipped=true` フラグを残す
- 翌朝 ADV が手動で Admin API GET `/auth/v1/admin/users` で `realmachine-test-` prefix のアカウントを列挙 → 24h 経過分を一括 delete（運用手順、別 PATCH 候補）

### 9.10 Phase 完了宣言 hook との連携（mock + 実機 両方検証、PATCH-LOGIN-TEST-STRUCTURAL-FIX）

§9.5 拡張: `scripts/adv_response_gate.sh` の PHASE_COMPLETE_HIT ブロックは以下 2 ログを **同時** に検証する。

- `logs/smoke_results.log` 直近 5 行に `PASS` 行存在（既存）
- `logs/realmachine_smoke_results.log` 直近 5 行に `signin_success=true` AND `dashboard_reached=true` AND `result=PASS` を **同時に満たす行** 存在（追加）

どちらか不在 → BLOCK + 「実機 smoke ログ欠落」警告。skip 例外（§2.25.3 該当 / 仕様書改定のみ実装変更なし）は §9.5 と同様。

### 9.11 アンチパターン（再発防止、PATCH-LOGIN-TEST-STRUCTURAL-FIX 追加分）

- mock smoke のみ PASS で「実機 signin できる」と誤認 / PO 報告
- 実機 smoke のテストアカウント cleanup 漏れ（Supabase に未削除アカウントが蓄積、429 / quota 抵触）
- `SUPABASE_SERVICE_KEY` を patches.md / decision_log.md / 報告 markdown に伏字化せず書込
- 実機 smoke ログを mock smoke ログと同一ファイルに混在させ、機械強制 hook の検証ロジックを曖昧化

