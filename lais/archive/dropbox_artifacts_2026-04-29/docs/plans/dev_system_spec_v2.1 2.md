# dev-system — AI自律開発システム共通基盤 仕様書
> version: 2.1
> status: REVIEW-READY（v1 DRAFT → Gemini/GPT-5レビュー反映 + 過去全セッション要件追加）
> updated: 2026-04-11
> レビュー元: docs/plans/review_gemini.json (16件), docs/plans/review_gpt5.json (27件)
> 過去セッション: 実装1〜30の全決定事項を反映
> 次フェーズ: 5ペルソナ専門レビュー → v3確定

---

## 変更履歴（v1 → v2 → v2.1）

### v1 → v2（Gemini/GPT-5レビュー反映）
| # | 変更 | 根拠 |
|---|------|------|
| 1 | cp配布→シンボリックリンク優先+バージョンpin | G-R001, GPT-R001/R019/R026 |
| 2 | update_app.sh新設 | G-R002 |
| 3 | init_app.sh修正 | GPT-R002/R003, G-R011 |
| 4 | mission_linter.sh修正 | G-R004, GPT-R004 |
| 5 | session_archiver.sh修正 | GPT-R017, G-R009 |
| 6 | G2=補助/G9=判定の明確化 | GPT-R010, G-R007 |
| 7 | CORS無視をlocalhost限定 | G-R006, GPT-R016 |
| 8 | development_rules結合スクリプト | G-R008, GPT-R015 |
| 9 | TOKEN_KV統一 | GPT-R008, G-R014 |
| 10 | APP_VERSION照合4箇所を明記 | GPT-R005 |
| 11 | 承認ルール矛盾解消（リスクベース統一） | G-R003 |
| 12 | SKIP統一（プラットフォーム非対応のみ。タイムアウト=FAIL） | GPT-R009 |
| 13 | deploy.providerベースのコマンド切替 | GPT-R007 |
| 14 | routing ratiosキーをmodelsキーと一致 | GPT-R018 |
| 15 | 参照先不在の解消 | GPT-R011/R012/R013/R022, G-R007 |
| 16 | canopy_app.sh最小行数ゲート追加 | G-R010 |
| 17 | Playwright判定を終了コード+JSONレポーター | GPT-R021 |
| 18 | bootstrap.md表現修正 | GPT-R024 |
| 19 | development_rules.md行数ゲートをソフトリミット化 | GPT-R027 |
| 20 | build.out_dir設定追加 | GPT-R006 |

### v2 → v2.1（過去全セッション要件追加）
| # | 追加セクション | 出典 |
|---|-------------|------|
| 21 | §15 変更フロー6ステップ | claude_ai_protocol, 実装30 |
| 22 | §16 鉄則一覧12個 | CLAUDE.md, dev-playbook, 実装27/29/30 |
| 23 | §17 3層テスト戦略+C2デプロイフロー | 実装29 |
| 24 | §18 テストライブラリ | 実装29 |
| 25 | §19 デバイス依存バグ診断フロー | 実装22 |
| 26 | §20 仕様書ID付番 | 実装29 |
| 27 | §21 AIレビュー基盤 | 実装31 |
| 28 | §22 仕様書開発フロー6フェーズ | 実装31 |
| 29 | §23 ルールの保存先と優先順位 | 実装27 |
| 30 | §24 構造的制約 | 全セッション |

---

## 1. 設計原則

### 1.1 基本思想
- **品質最優先。** スピードのために品質を犠牲にしない
- **自動化最大。** PO（ふとし）の手動作業を承認のみに最小化
- **機械可検証。** ルールは可能な限りスクリプト/ゲートで自動検証する
- **Single Source of Truth。** 各情報の正規ソースを1箇所に限定し、二重管理を排除

### 1.2 3層構造
| 層 | 担当 | 役割 |
|---|------|------|
| **PO（ふとし）** | 経営判断 | 「何を作るか」の決定 + 承認 |
| **ADV（Claude.ai）** | アドバイザー | 仕様協議・ミッション定義作成・AT記述・リポジトリ書き込み |
| **ENG（Claude Code）** | 自律エンジニア | 実装・テスト・デプロイ・レポート |

**ENGの設計権限の制約:** コスト構造またはプラン間の差別化に影響するアーキテクチャ変更は、提案ログに記載してPO承認を待つ。

### 1.3 バグ対応フロー
```
POがバグ発見
  ├── 仕様判断が必要？ → ADVと議論 → session_progress.mdに記載 → ENG修正
  ├── コスト/プランに影響？ → 同上
  └── それ以外 → POがENGに直接伝える → ENG修正 → session_progress.mdに記録

ENGがバグ発見
  ├── ミッション遂行に必要 → 即修正（記録必須）
  ├── コスト/プラン影響あり → 提案ログ→ADVが読む→承認
  └── それ以外 → 提案ログ。キュー空時に自律修正可
```

---

## 2. ディレクトリ構成

### 2.1 dev-system（共通基盤リポジトリ）

```
dev-system/
├── VERSION                            ← dev-systemのセマンティックバージョン
├── README.md
├── templates/
│   ├── bootstrap.md                   ← Claude.ai起動時最小ナレッジ（正本は各docs/*.md）
│   ├── CLAUDE_TEMPLATE.md             ← CLAUDE.md骨格（[TODO]を埋める）
│   ├── session_progress_template.md   ← ダッシュボード形式
│   ├── mission_template_v3.md         ← ミッション定義形式（AT/RED/GREEN付き）
│   └── frontend/                      ← Preact+Vite+ルーターの雛形
│       ├── package.json
│       └── ...
├── rules/
│   ├── development_rules_common.md    ← G1-G6共通ゲート + 修正試行3回制限
│   └── development_rules_app.md       ← アプリ固有ルールのテンプレート
├── protocols/
│   └── claude_ai_protocol_template.md ← ADVの行動ルール（トリガー→アクション対応表）
├── canopy/
│   ├── canopy_common.sh               ← 共通チェック
│   └── canopy_app_template.sh         ← アプリ固有チェックの雛形（最小10行）
├── test-helpers/
│   ├── test-guards.ts                 ← グローバルガード（共通フレームワーク）
│   ├── test-guards.config.template.ts ← アプリ固有の許容リスト雛形
│   └── assert-ai-response.ts         ← AI応答検証ヘルパー
├── scripts/
│   ├── init_app.sh                    ← 新アプリ初期化スクリプト
│   ├── update_app.sh                  ← 既存アプリの共通資産同期スクリプト
│   ├── build_rules.sh                 ← common + app → development_rules.md結合
│   ├── mission_linter.sh              ← ミッション定義の形式検証
│   ├── session_archiver.sh            ← 300行超過時の自動アーカイブ
│   └── test_lint.sh                   ← テストアンチパターン検出
├── tests/
│   └── test_library.md                ← 機能タグ付き共通テスト項目DB
├── docs/
│   ├── lessons_learned.md             ← 全アプリから集約した教訓DB
│   ├── anti_patterns.md               ← 8パターン（状態漏れ/テスト≠動作等）
│   ├── architecture_decisions.md      ← ADRテンプレート+参考例
│   ├── testing-anti-patterns.md       ← テストの10アンチパターン
│   └── debugging-guide.md             ← デバッグ手順書
└── app-config/
    └── app_config_template.yaml       ← プラン/ルーティング/モデル/デプロイ等
```

### 2.2 各アプリ側の構成

```
app-repo/
├── CLAUDE.md                          ← 自動生成 or 手動
├── development_rules.md               ← build_rules.shで生成（common + app結合）
├── .dev-system.version                ← pinされたdev-systemバージョン
├── instructions/
│   ├── session_progress.md
│   └── results/
│       ├── session_history.md
│       ├── metrics.jsonl              ← 品質メトリクス
│       └── canopy_latest.txt
├── tests/
│   ├── smoke/
│   │   ├── canopy.sh                  ← エントリポイント
│   │   ├── canopy_common.sh           ← dev-systemからシンボリックリンク
│   │   └── canopy_app.sh             ← アプリ固有チェック（最小10行）
│   └── e2e/
│       ├── helpers/
│       │   ├── test-guards.ts         ← dev-systemからシンボリックリンク
│       │   ├── test-guards.config.ts  ← アプリ固有（テンプレートからコピー）
│       │   └── assert-ai-response.ts  ← dev-systemからシンボリックリンク
│       └── specs/
├── scripts/
│   ├── build_rules.sh                 ← dev-systemからシンボリックリンク
│   ├── mission_linter.sh              ← dev-systemからシンボリックリンク
│   ├── session_archiver.sh            ← dev-systemからシンボリックリンク
│   └── test_lint.sh                   ← dev-systemからシンボリックリンク
├── docs/                              ← アプリ固有仕様
└── app_config.yaml                    ← アプリ固有設定値
```

---

## 3. 共通資産の管理方式（v2改訂の核心）

### 3.1 シンボリックリンク優先

共通ファイルは原則**シンボリックリンク**で接続する。コピーが必要なのはアプリ固有にカスタマイズするファイルのみ。

| ファイル | 方式 | 理由 |
|---------|------|------|
| canopy_common.sh | シンボリックリンク | 共通。変更禁止 |
| test-guards.ts | シンボリックリンク | 共通。変更禁止 |
| assert-ai-response.ts | シンボリックリンク | 共通。変更禁止 |
| build_rules.sh | シンボリックリンク | 共通スクリプト |
| mission_linter.sh | シンボリックリンク | 共通スクリプト |
| session_archiver.sh | シンボリックリンク | 共通スクリプト |
| test_lint.sh | シンボリックリンク | 共通スクリプト |
| test-guards.config.ts | **コピー** | アプリ固有にカスタマイズ |
| canopy_app.sh | **コピー** | アプリ固有チェック |
| development_rules_app.md | **コピー** | アプリ固有ルール |
| CLAUDE_TEMPLATE.md | **コピー** | アプリ固有に書き換え |
| session_progress_template.md | **コピー** | アプリ固有キュー |
| app_config_template.yaml | **コピー** | アプリ固有設定 |
| bootstrap.md | **コピー** | アプリに合わせて微調整 |

### 3.2 バージョンpin方式

```
dev-system/VERSION:          "1.2.0"
app-repo/.dev-system.version: "1.2.0"
```

- dev-systemの更新時にVERSIONをインクリメント
- canopy_common.shで.dev-system.versionとdev-system/VERSIONの一致を検証
- 不一致時は**WARN**（即座にブロックはしないが、3セッション以上放置でFAIL）

### 3.3 update_app.sh（既存アプリの同期）

```bash
#!/bin/bash
# 既存アプリのdev-system共通資産を最新に同期
APP_DIR=${1:-.}
DEV_SYSTEM=${2:-"$HOME/Desktop/dev-system"}

if [ ! -f "$DEV_SYSTEM/VERSION" ]; then
  echo "ERROR: dev-system not found at $DEV_SYSTEM"; exit 1
fi

NEW_VER=$(cat "$DEV_SYSTEM/VERSION")
OLD_VER=$(cat "$APP_DIR/.dev-system.version" 2>/dev/null || echo "none")
echo "Updating: $OLD_VER → $NEW_VER"

# シンボリックリンクの再作成（既存リンク/ファイルを上書き）
SYMLINKS=(
  "canopy/canopy_common.sh:tests/smoke/canopy_common.sh"
  "test-helpers/test-guards.ts:tests/e2e/helpers/test-guards.ts"
  "test-helpers/assert-ai-response.ts:tests/e2e/helpers/assert-ai-response.ts"
  "scripts/build_rules.sh:scripts/build_rules.sh"
  "scripts/mission_linter.sh:scripts/mission_linter.sh"
  "scripts/session_archiver.sh:scripts/session_archiver.sh"
  "scripts/test_lint.sh:scripts/test_lint.sh"
)

for pair in "${SYMLINKS[@]}"; do
  SRC="$DEV_SYSTEM/${pair%%:*}"
  DST="$APP_DIR/${pair##*:}"
  mkdir -p "$(dirname "$DST")"
  ln -sf "$SRC" "$DST"
  echo "  LINK: $DST → $SRC"
done

# development_rules.md再結合
if [ -f "$APP_DIR/development_rules_app.md" ]; then
  bash "$DEV_SYSTEM/scripts/build_rules.sh" "$APP_DIR" "$DEV_SYSTEM"
  echo "  BUILD: development_rules.md"
fi

# バージョンpin更新
echo "$NEW_VER" > "$APP_DIR/.dev-system.version"
echo "✅ Updated to dev-system $NEW_VER"
```

---

## 4. 品質ゲート体系

### 4.1 ゲート一覧

| ゲート | 名称 | 検証方法 | 備考 |
|--------|------|----------|------|
| G1 | バージョン同期 | canopy | APP_VERSION 4箇所一致（§4.2参照） |
| G2 | UI開発補助 | スクリプト | **開発時の自己診断。受入判定には使わない** |
| G3 | テスト項目数 | canopy | grep -c でテスト数の期待値検証 |
| G4 | テスト全PASS | Playwright | **終了コード判定**（`npx playwright test || exit 1`）|
| G5 | 報告フォーマット | 人間確認 | 曖昧用語12語禁止 |
| G6 | デプロイパイプライン | canopy | ビルド同期 |
| G7 | 仕様↔完了コマンド対応 | mission_linter.sh | bashブロック必須（**FAIL**） |
| G8 | テストファースト | ENG自律 | AT全FAIL確認 → 実装 → 全PASS |
| G9 | UI受入判定 | **スクショ画像判定** | ADVがスクショを見て判定 |

### 4.2 APP_VERSION照合4箇所

canopy_common.shで以下4箇所の一致を検証する：
1. `app_config.yaml` → `app.version`
2. `package.json` → `version`
3. `frontend/src/version.ts`（またはアプリ固有のバージョン定数）
4. `CLAUDE.md` → Version行

### 4.3 G2とG9の役割分担（v2明確化）

- **G2（開発補助）:** getBoundingClientRect、getComputedStyle等のDOM APIチェック。ENGが開発中に使う自己診断。完了報告の**根拠には使わない**
- **G9（受入判定）:** スクリーンショットを画像として見て「仕様で決めたデザイン変更が実現されているか」で判定。判定基準は視覚的確認のみ。hasClass/getAttribute/boundingBox等のDOM APIでの判定は**禁止**
- スクショ前後ファイルが一致 = **FAIL**

### 4.4 テスト判定方式（v2改訂）

Playwright結果の判定は**終了コード**を使う：

```bash
# 推奨（v2）: 終了コードで判定
npx playwright test --project=mobile || exit 1

# 詳細分析が必要な場合: JSONレポーター
npx playwright test --project=mobile --reporter=json > results.json
jq '.stats.unexpected' results.json | awk '{if($1==0) exit 0; else exit 1}'
```

旧方式（`tail -1 | grep "0 failed"`）は出力フォーマット依存で脆いため非推奨。

### 4.5 SKIPルール（v2統一）

- **許容されるSKIP:** プラットフォーム非対応（例: iOS固有機能をDesktopプロジェクトで実行時）
- **FAIL扱い:** 条件付きtest.skip()、try/catchでのタイムアウト握りつぶし、その他全てのSKIP
- SKIPされたATは次キューに**SKIP-RETRY**として追記

---

## 5. ミッション定義テンプレート v3

**原則: 完了条件を全てbashコマンドで記述する。自然言語の「全件」「すべて」「全て」禁止。**

```markdown
### MISSION-ID: タイトル
> リスク: 🟢低 / 🟡中 / 🔴高
> 参照: docs/xxx.md, docs/yyy.md（全ファイルをフルパスで列挙）
> 対象ファイル: src/xxx.js, frontend/yyy.html（変更してよいファイルを列挙）

**目的:** 1行

**プリフライト（実装前に必ず実行・結果をログに記録）:**
  wc -l docs/xxx.md   # 参照ファイルの存在確認
  grep -c '条件' source.md   # テスト項目数の期待値を記録

**AT（ADV記述。ENGはspec.tsにコード化）:**

AT-N: テスト名
  前提: （必須。テスト実行前に満たすべき状態。省略不可）
  操作: ユーザーが行う操作
  期待: スクショで確認できる期待結果
  検証: スクショで見えるべきもの
  否定検証: スクショで見えてはいけないもの
  データ検証: リロード後の永続化確認
  スクショ: 撮影タイミング
  RED: ☐（実装前にFAIL確認）
  GREEN: ☐（実装後にPASS確認）

ストレスパス: 主要操作を3回連続で実行し、最後も正常

**完了コマンド（全て期待出力でPASS判定）:**
  cmd1: npx playwright test path/to/spec.ts --project=mobile || exit 1
  cmd2: grep -c "xxx" file | awk '{if($1>=N) exit 0; else exit 1}'

**FAIL条件:** cmd1-Nのいずれかが非ゼロ終了
**完了報告:** MISSION-ID: cmd1-N PASS/FAIL + AT各結果 + スクショ枚数
```

---

## 6. 承認ルール（v2統一）

リスクベースの承認が**唯一のルール**。ファイル書き込み時の個別OK確認はリスクレベルに応じて省略可能。

| リスク | 承認方式 | 条件 |
|--------|---------|------|
| 🟢低 | バッチ承認可 | mockup変更なし + 対象2ファイル以内 + 仕様変更なし |
| 🟡中 | 3件まで連続実行→まとめて報告 | — |
| 🔴高 | 個別承認必須（実行前に停止） | アーキテクチャ変更/コスト影響/プラン変更 |

🟢低リスクでホットフィックスパス条件を全て満たす場合、ENGは自律実行可。

---

## 7. テスト基盤

### 7.1 テストガード分離設計

**test-guards.ts（共通。dev-systemからシンボリックリンク。変更禁止）**
- AC-GLOBAL-1: console.error監視
- AC-GLOBAL-2: pageerror検出
- AC-GLOBAL-3: トースト/エラー表示検出
- AC-GLOBAL-4: AI応答のエラーテキスト検出

**test-guards.config.ts（アプリ固有。テンプレートからコピー）**
```typescript
// ⚠ 変更はADV承認必須（canopyで件数チェック: 上限15件）

// 環境判定: CORS無視はlocalhost/CI限定
const isLocal = typeof page !== 'undefined'
  && (page.url().includes('localhost') || process.env.CI === 'true');

export const IGNORED_ERRORS: string[] = [
  // ブラウザ内部（全環境共通）
  'favicon', 'manifest', 'sw.js', 'service-worker',
  'ResizeObserver loop', 'Non-Error promise rejection',
  'DevTools', 'Autofill', 'chrome-extension',
  // CORS: localhost/CI限定
  ...(isLocal ? ['CORS policy', 'Access-Control-Allow-Origin', 'blocked by CORS'] : []),
];

export const ERROR_PATTERNS: string[] = [
  'エラーが発生しました', 'エラーが起きました',
  'error occurred', 'something went wrong',
];
```

### 7.2 テストアンチパターン検出（test_lint.sh）

```bash
#!/bin/bash
FAIL=0
TEST_DIR=${1:-"tests/e2e/specs"}

# AP-1: expect(true) / expect(false)
COUNT=$(grep -rn "expect(true)\|expect(false)" "$TEST_DIR" | wc -l)
if [ "$COUNT" -gt 0 ]; then
  echo "FAIL: AP-1 expect(true/false) found: $COUNT件"; FAIL=1
fi

# AP-2: 空catch（エラー握りつぶし）
COUNT=$(grep -rn "catch.*{[[:space:]]*}" "$TEST_DIR" | wc -l)
if [ "$COUNT" -gt 0 ]; then
  echo "FAIL: AP-2 empty catch found: $COUNT件"; FAIL=1
fi

# AP-3: typeof-only（存在確認だけで内容未検証）
COUNT=$(grep -rn "typeof.*!==.*undefined" "$TEST_DIR" | grep -v "\.config\." | wc -l)
if [ "$COUNT" -gt 0 ]; then
  echo "WARN: AP-3 typeof-only checks: $COUNT件"
fi

# AP-4: 条件付きtest.skip
COUNT=$(grep -rn "test\.skip\|\.skip(" "$TEST_DIR" | grep -v "platform" | wc -l)
if [ "$COUNT" -gt 0 ]; then
  echo "FAIL: AP-4 conditional skip found: $COUNT件"; FAIL=1
fi

# AP-5: タイムアウト握りつぶし
COUNT=$(grep -rn "catch.*timeout\|catch.*Timeout" "$TEST_DIR" | wc -l)
if [ "$COUNT" -gt 0 ]; then
  echo "FAIL: AP-5 timeout catch found: $COUNT件"; FAIL=1
fi

exit $FAIL
```

### 7.3 データソースのSource of Truth

| データ | 正規ソース | 非正規（参照のみ） |
|--------|-----------|-------------------|
| プラン情報（実行時） | TOKEN_KV | Supabase DB |
| プラン切替（テスト） | `wrangler kv:key put --binding=TOKEN_KV` | Supabase SQL |
| ユーザープロフィール | Supabase DB | — |
| 会話履歴 | Supabase DB | — |

テストでプラン切替する場合は**KVを直接更新**する。DB更新だけでは反映されない。

---

## 8. canopy_common.sh仕様

```bash
#!/bin/bash
# dev-system共通スモークテスト（シンボリックリンクで各アプリに配布）
# ⚠ このファイルを直接編集しない。dev-system/canopy/canopy_common.sh を更新する

# --- G1: バージョン同期 ---
# 4箇所の一致検証（§4.2参照）
# 対象: app_config.yaml, package.json, frontend/src/version.ts, CLAUDE.md

# --- dev-systemバージョンpin ---
if [ -f ".dev-system.version" ] && [ -f "$HOME/Desktop/dev-system/VERSION" ]; then
  APP_PIN=$(cat .dev-system.version)
  DEV_VER=$(cat "$HOME/Desktop/dev-system/VERSION")
  if [ "$APP_PIN" != "$DEV_VER" ]; then
    echo "WARN: dev-system version mismatch: app=$APP_PIN, dev-system=$DEV_VER"
    # 3セッション以上放置でFAILに昇格（metrics.jsonlのセッション数で判定）
  fi
fi

# --- G6: ビルド同期 ---
# build.out_dir（app_config.yaml）とデプロイコマンドの整合性

# --- テストアンチパターン ---
bash scripts/test_lint.sh || FAIL=1

# --- テストガード許容リスト件数 ---
GUARD_COUNT=$(grep -c "^[[:space:]]*'" tests/e2e/helpers/test-guards.config.ts 2>/dev/null || echo 0)
if [ "$GUARD_COUNT" -gt 15 ]; then
  echo "FAIL: test-guards.config.ts has $GUARD_COUNT entries (max 15)"; FAIL=1
fi

# --- session_progress.md行数 ---
SP_LINES=$(wc -l < instructions/session_progress.md 2>/dev/null || echo 0)
if [ "$SP_LINES" -gt 300 ]; then
  echo "FAIL: session_progress.md is $SP_LINES lines (max 300)"; FAIL=1
fi

# --- development_rules.md行数（ソフトリミット） ---
DR_LINES=$(wc -l < development_rules.md 2>/dev/null || echo 0)
if [ "$DR_LINES" -gt 150 ]; then
  echo "WARN: development_rules.md is $DR_LINES lines (soft limit 150). Consider splitting."
  # 行数上限を超えてもFAILにはしない。構造の品質を重視
fi

# --- canopy_app.sh最小行数 ---
APP_LINES=$(grep -v "^#\|^$" tests/smoke/canopy_app.sh 2>/dev/null | wc -l)
if [ "$APP_LINES" -lt 5 ]; then
  echo "FAIL: canopy_app.sh has only $APP_LINES active lines (min 5)"; FAIL=1
fi
```

---

## 9. スクリプト仕様

### 9.1 init_app.sh

```bash
#!/bin/bash
APP_DIR=$1
DEV_SYSTEM=${2:-"$(dirname "$0")/.."}  # デフォルト: スクリプトの親ディレクトリ

if [ -z "$APP_DIR" ]; then
  echo "Usage: init_app.sh /path/to/new-app [/path/to/dev-system]"; exit 1
fi

# ディレクトリ作成（scriptsを含む）
mkdir -p "$APP_DIR"/{instructions/results,docs,tests/smoke,tests/e2e/{helpers,specs},scripts}
cd "$APP_DIR" && git init

# コピー対象（アプリ固有にカスタマイズするもの）
cp "$DEV_SYSTEM/templates/bootstrap.md" .
cp "$DEV_SYSTEM/templates/CLAUDE_TEMPLATE.md" CLAUDE.md
cp "$DEV_SYSTEM/templates/session_progress_template.md" instructions/session_progress.md
cp "$DEV_SYSTEM/templates/mission_template_v3.md" docs/
cp "$DEV_SYSTEM/rules/development_rules_app.md" .
cp "$DEV_SYSTEM/canopy/canopy_app_template.sh" tests/smoke/canopy_app.sh
cp "$DEV_SYSTEM/test-helpers/test-guards.config.template.ts" tests/e2e/helpers/test-guards.config.ts
cp "$DEV_SYSTEM/app-config/app_config_template.yaml" app_config.yaml

# シンボリックリンク対象（共通。変更禁止）
ln -s "$DEV_SYSTEM/canopy/canopy_common.sh" tests/smoke/canopy_common.sh
ln -s "$DEV_SYSTEM/test-helpers/test-guards.ts" tests/e2e/helpers/test-guards.ts
ln -s "$DEV_SYSTEM/test-helpers/assert-ai-response.ts" tests/e2e/helpers/assert-ai-response.ts
ln -s "$DEV_SYSTEM/scripts/build_rules.sh" scripts/build_rules.sh
ln -s "$DEV_SYSTEM/scripts/mission_linter.sh" scripts/mission_linter.sh
ln -s "$DEV_SYSTEM/scripts/session_archiver.sh" scripts/session_archiver.sh
ln -s "$DEV_SYSTEM/scripts/test_lint.sh" scripts/test_lint.sh

# canopy.shエントリポイント生成
cat > tests/smoke/canopy.sh << 'EOF'
#!/bin/bash
CANOPY_START=$(date +%s)
FAIL=0
source tests/smoke/canopy_common.sh
source tests/smoke/canopy_app.sh
DURATION=$(($(date +%s) - CANOPY_START))
echo "=== CANOPY $([ $FAIL -eq 0 ] && echo 'PASS' || echo 'FAIL') (${DURATION}s) ==="
exit $FAIL
EOF
chmod +x tests/smoke/canopy.sh

# development_rules.md結合
cp "$DEV_SYSTEM/rules/development_rules_common.md" .
bash scripts/build_rules.sh . "$DEV_SYSTEM"

# dev-systemバージョンpin
cp "$DEV_SYSTEM/VERSION" .dev-system.version

# --frontend=preact オプション
if [ "$3" = "--frontend=preact" ]; then
  cp -r "$DEV_SYSTEM/templates/frontend/"* .
  echo "  Frontend: Preact+Vite template applied"
fi

echo "✅ $APP_DIR initialized (dev-system $(cat .dev-system.version))"
echo "Next: edit CLAUDE.md and app_config.yaml"
```

### 9.2 build_rules.sh

```bash
#!/bin/bash
# development_rules_common.md + development_rules_app.md → development_rules.md
APP_DIR=${1:-.}
DEV_SYSTEM=${2:-"$HOME/Desktop/dev-system"}

COMMON="$DEV_SYSTEM/rules/development_rules_common.md"
APP="$APP_DIR/development_rules_app.md"
OUTPUT="$APP_DIR/development_rules.md"

if [ ! -f "$COMMON" ]; then echo "ERROR: $COMMON not found"; exit 1; fi

cat "$COMMON" > "$OUTPUT"

if [ -f "$APP" ]; then
  echo "" >> "$OUTPUT"
  echo "---" >> "$OUTPUT"
  echo "" >> "$OUTPUT"
  cat "$APP" >> "$OUTPUT"
fi

echo "Generated: $OUTPUT ($(wc -l < "$OUTPUT") lines)"
```

### 9.3 mission_linter.sh（v2修正版）

```bash
#!/bin/bash
SP="${1:-instructions/session_progress.md}"
FAIL=0

# ミッションブロックの行番号を取得
MISSION_LINES=$(grep -n "^### " "$SP" | grep -v "STATUS: DONE\|✅" | cut -d: -f1)

for LINE_NUM in $MISSION_LINES; do
  # 次のミッション行番号を取得（ブロック範囲の終端）
  NEXT=$(grep -n "^### " "$SP" | awk -F: -v s="$LINE_NUM" '$1>s{print $1;exit}')
  if [ -z "$NEXT" ]; then
    BLOCK=$(sed -n "${LINE_NUM},\$p" "$SP")
  else
    BLOCK=$(sed -n "${LINE_NUM},$((NEXT-1))p" "$SP")
  fi

  MISSION=$(echo "$BLOCK" | head -1)

  # STATUS: QUEUED/IN_PROGRESSのみチェック
  if echo "$BLOCK" | grep -q "STATUS: DONE"; then continue; fi

  # 完了コマンドにbashコマンドがあるか（FAIL — v2でWARNから昇格）
  BASH_CMD=$(echo "$BLOCK" | grep -c "cmd[0-9]\|npx \|grep \|awk \|wc ")
  if [ "$BASH_CMD" -eq 0 ]; then
    echo "FAIL: $MISSION — 完了コマンドにbashコマンドなし"; FAIL=1
  fi

  # 「全件」「すべて」「全て」が残っていないか
  VAGUE=$(echo "$BLOCK" | grep -c '全件\|すべて\|全て')
  if [ "$VAGUE" -gt 0 ]; then
    echo "FAIL: $MISSION — 曖昧な自然言語（全件/すべて/全て）が残存"; FAIL=1
  fi

  # FAIL条件があるか
  FAIL_COND=$(echo "$BLOCK" | grep -c 'FAIL条件')
  if [ "$FAIL_COND" -eq 0 ]; then
    echo "FAIL: $MISSION — FAIL条件の記述なし"; FAIL=1
  fi

  # AT-Nがある場合、前提:が必須
  HAS_AT=$(echo "$BLOCK" | grep -c "^AT-[0-9]")
  if [ "$HAS_AT" -gt 0 ]; then
    PRECOND=$(echo "$BLOCK" | grep -c "前提:")
    if [ "$PRECOND" -eq 0 ]; then
      echo "FAIL: $MISSION — ATに「前提:」が不足"; FAIL=1
    fi
  fi

  # 参照ファイルがパス付きか
  REF_LINES=$(echo "$BLOCK" | grep "参照:" | grep -v '/' | grep -v 'http' | wc -l)
  if [ "$REF_LINES" -gt 0 ]; then
    echo "WARN: $MISSION — 参照ファイルにパスなし"
  fi
done

exit $FAIL
```

### 9.4 session_archiver.sh（v2修正版）

```bash
#!/bin/bash
SP="${1:-instructions/session_progress.md}"
ARCHIVE="${2:-instructions/results/session_history.md}"
MAX_LINES=300

CURRENT=$(wc -l < "$SP")
if [ "$CURRENT" -le "$MAX_LINES" ]; then
  echo "OK: session_progress.md is $CURRENT lines (≤ $MAX_LINES)"
  exit 0
fi

echo "ARCHIVING: $CURRENT lines > $MAX_LINES"

# 「## 完了済み」セクションを探す
COMPLETED_START=$(grep -n "^##[[:space:]]*完了済み" "$SP" | head -1 | cut -d: -f1)

if [ -n "$COMPLETED_START" ]; then
  # 完了済みセクションが存在 → アーカイブに移動
  echo "" >> "$ARCHIVE"
  echo "---" >> "$ARCHIVE"
  echo "## アーカイブ $(date '+%Y-%m-%d')" >> "$ARCHIVE"
  sed -n "${COMPLETED_START},\$p" "$SP" >> "$ARCHIVE"
  head -n $((COMPLETED_START - 1)) "$SP" > "${SP}.tmp"
  echo "" >> "${SP}.tmp"
  echo "## 完了済み（詳細は instructions/results/session_history.md）" >> "${SP}.tmp"
  mv "${SP}.tmp" "$SP"
  NEW_LINES=$(wc -l < "$SP")
  echo "DONE: $CURRENT → $NEW_LINES lines"
else
  # 完了済みセクションが存在しない → 手動整備を要求
  echo "ERROR: No '## 完了済み' section found."
  echo "ACTION REQUIRED: Manually move completed missions to $ARCHIVE"
  echo "                 or add a '## 完了済み' section to $SP"
  exit 1
fi
```

---

## 10. app_config_template.yaml（v2改訂）

```yaml
app:
  name: "APP_NAME"
  version: "0.0.1"
  repo: "https://github.com/user/repo"

infrastructure:
  frontend: "cloudflare-pages"  # cloudflare-pages | vercel | netlify
  backend: "cloudflare-workers" # cloudflare-workers | aws-lambda | supabase-edge
  database: "supabase"          # supabase | planetscale | firebase
  payments: "none"              # stripe-metered | stripe-fixed | none

build:
  out_dir: "dist"               # vite default. cloudflare uses "frontend-dist"
  cmd: "npx vite build"

deploy:
  provider: "cloudflare"        # cloudflare | vercel | netlify | aws
  frontend_cmd: "npx wrangler pages deploy ${build.out_dir}"
  backend_cmd: "npx wrangler deploy"

plans: []
  # - name: free
  #   price: 0
  #   daily_limit: 20

routing:
  enabled: false
  # models:
  #   gpt-5: { ratio: 40, role: "catch-all" }
  #   claude-sonnet: { ratio: 15, role: "emotional-coaching" }
  #   gemini-flash: { ratio: 30, role: "search-facts" }
  #   gpt-5-simple: { ratio: 15, role: "short-replies" }
  # ※ ratioの合計は100であること（canopyで検証）

data_sources:
  plan_source_of_truth: "TOKEN_KV"  # 実行時プランデータの正規ソース
  plan_test_method: "wrangler kv:key put --binding=TOKEN_KV"
```

---

## 11. 品質メトリクス

### metrics.jsonl（各アプリ。instructions/results/）
```jsonl
{"date":"2026-04-11","session":31,"mission":"SPEC-REVIEW","tests_pass":202,"tests_fail":0,"tests_skip":0,"canopy":"PASS","duration_min":120,"bugs_found":0,"bugs_fixed":0}
```
各セッション終了時にENGが1行追記。トレンド分析用。

---

## 12. 学習の逆流メカニズム

### 12.1 lessons_learned.md
全アプリから集約した教訓DB。各エントリに以下を記録：
- **問題:** 何が起きたか
- **対策:** どう防ぐか
- **反映先:** dev-systemのどのファイルに反映したか
- **反映状態:** TODO / DONE

### 12.2 逆流プロセス
1. アプリ内で問題発見 → lessons_learned.mdに追記（反映状態: TODO）
2. ADVが「テンプレートに反映すべきか」を判断
3. 反映する場合 → dev-systemの該当ファイルを更新 + VERSIONインクリメント
4. lessons_learned.mdの反映状態をDONEに更新
5. 他アプリの次回セッションでupdate_app.shを実行

### 12.3 棚卸し（5セッションごと）
1. CLAUDE.md・development_rules.md・session_progress.md の整合性
2. session_progress.md が300行以内か
3. development_rules.md が過度に肥大化していないか
4. 提案ログに未処理の項目がないか
5. 全ルールファイル間の矛盾チェック
6. CLAUDE.mdに改善提案（ADVが記載）
7. dev-systemテンプレートへの逆流が必要な教訓がないか

---

## 13. サブ仕様書の矛盾修正指示（ENGへの指示）

v2改訂に伴い、以下のサブ仕様書を修正する必要がある。

| # | ファイル | 修正内容 | 根拠 |
|---|---------|---------|------|
| 1 | claude_ai_protocol.md §3 | ファイル書き込み承認ルールを§6の承認ルール表に集約 | G-R003 |
| 2 | claude_ai_protocol.md §10 | test_library.mdの参照パスを正しい場所に修正 | GPT-R011 |
| 3 | g2_ui_verification.md | 冒頭に「⚠ G2は開発時の自己診断。受入判定はG9（スクショ）で行う」を追記 | GPT-R010 |
| 4 | g2_ui_verification.md | c16_stage_a.jsへの参照を「dev-system/scripts/に配置予定」に修正 | GPT-R013 |
| 5 | g4_testing.md | TOKEN_KV統一。「beforeAllでKV更新（wrangler kv:key put）」 | GPT-R008 |
| 6 | g4_testing.md | Playwright判定方式を終了コード方式に更新（§4.4参照） | GPT-R021 |
| 7 | g5_reporting.md | SKIP統一ルール（§4.5参照）に合わせて文言修正 | GPT-R009 |
| 8 | g5_reporting.md | Failed to fetchの扱い明確化：「localhost限定でCORS起因のみ許容」 | G-R006 |
| 9 | debugging-guide.md | C11参照を具体的なファイルパスに修正 | GPT-R023 |
| 10 | development_rules_common.md | 修正試行3回制限を正式ルールとして追加 | GPT-R012 |
| 11 | bootstrap.md | 「唯一のナレッジ」→「起動時最小ナレッジ（正本は各docs/*.md）」に修正 | GPT-R024 |

---

## 14. 次フェーズ: 5ペルソナ専門レビュー

v2.1を§21（AIレビュー基盤）のプロセスに従ってレビューする。ペルソナ定義は§21.4を参照。

---

## 15. 変更フロー（6ステップ）

全ての仕様変更・機能追加・バグ修正は以下のフローに従う。

```
Step 1: 仕様確定（ADV↔PO）
  ADVが仕様を整理し、影響範囲・コスト・リスクを分析 → PO承認

Step 2: モックアップ作成・承認
  UI変更を伴う場合、ADVがモックアップ作成 → PO目視承認
  モックアップは原本（Single Source of Truth）。手動再構築禁止

Step 2.5: AT（受入テスト）内容・合格基準記述
  ADVがAT内容を記述（§5のテンプレート準拠）
  ENGはこれをspec.tsにコード化する（AT内容を勝手に変えない）

Step 3: キュー登録
  ADVがsession_progress.mdにミッション定義を書き込み（DC経由 or ファイル出力）

Step 4: ENG実装
  G8テストファースト: AT全FAIL確認 → 実装 → 全PASS
  1コンポーネント300行以内。超えたら分割

Step 5: G9検証 → デプロイ → PO最終確認
  スクショ画像判定 → C2デプロイフロー → PO実機確認
```

### 仕様協議時の操作フロー確認（毎回必須）
- ユーザーが開始する操作は何か
- ユーザーが中断/キャンセルする手段はあるか
- 操作完了後に元の画面に戻るか

---

## 16. 鉄則一覧（12個）

全てのセッション・全てのミッションで適用される不変ルール。

| # | 鉄則 | WHY |
|---|------|-----|
| ① | 品質維持最優先 | スピードのために品質を犠牲にしない |
| ② | 実装はENGに全委任 | ADVはコードを書かない。ミッション定義のみ |
| ③ | 仕様変更時は影響範囲チェック→CLAUDE.md更新 | 連鎖更新の漏れ防止 |
| ④ | 判断し根拠を示す | ADVは選択肢を提示するだけでなく、推奨と理由を述べる |
| ⑤ | 方針整合性自己チェック | 過去の方針と矛盾する提案をしない |
| ⑥ | 方針違反→development_rules.md+リポジトリ更新 | 指摘を受けたら再発防止ルールを追加 |
| ⑦ | コードは読まない。ミッション定義のみ | POはコードレビューしない |
| ⑧ | 事実確認せずに断言禁止 | 特にデバイス依存バグ。推測で「確定仕様」を出さない |
| ⑨ | UI検証はスクショを画像として見て判定 | DOM API（hasClass/getAttribute/boundingBox）禁止。画像に見えるものだけが根拠 |
| ⑩ | ミッション定義セルフチェック（§5テンプレ準拠） | 曖昧な完了条件はENGの誤完了報告を生む |
| ⑪ | 仕様協議時の操作フロー確認 | 中断/キャンセル/戻り先の未定義を防止 |
| ⑫ | セッション終了時の未書き込みチェック | 「次回やる」で会話を閉じることを禁止。全決定をリポジトリに書き込んでから終了 |

### 曖昧用語禁止リスト（12語）
完了報告で以下を使用禁止。代わりにスクショの具体的事実を書く：

「確認した」「表示されている」「正常に動作」「問題なし」「対応済み」「修正済み」「実装済み」「開いている」「閉じている」「存在する」「反映されている」「変化した」

代替: 「スクショ前：○○ → スクショ後：△△」「スクショで○○が見える/見えない」

---

## 17. 3層テスト戦略

### 17.1 テスト層定義

| 層 | 実行タイミング | 項目数 | 所要時間 | 内容 |
|---|--------------|--------|---------|------|
| **L1: スモーク** | 毎デプロイ | ~10 | 2分 | 基本5操作が動くか |
| **L2: 影響範囲** | 変更時 | 変動 | 5-10分 | git diffから自動特定した関連テスト |
| **L3: フル** | 週次 or リリース前 | 全件 | 30分+ | 全テスト+パフォーマンス計測 |

### 17.2 L1スモークテスト（毎デプロイ必須）
```
1. アプリ起動→メイン画面表示
2. 主要機能A操作→成功
3. 主要機能B操作→成功
4. AI送受信→応答受信
5. データ保存→リロード→残存
```
L1がFAILならデプロイ中止。

### 17.3 L2影響範囲テスト（affected-tests.sh）

```bash
#!/bin/bash
# git diffから影響テストを自動特定
FILES=$(git diff --name-only HEAD~1)
TESTS=""

# ファイル→テスト対応マッピング（アプリ固有。app_config.yamlまたはスクリプト内で定義）
# 例:
# if echo "$FILES" | grep -q "frontend/components/Talk"; then
#   TESTS="$TESTS rewrite-01"
# fi
# if echo "$FILES" | grep -q "frontend/components/Today"; then
#   TESTS="$TESTS rewrite-02 arch-02"
# fi
# if echo "$FILES" | grep -q "frontend/components/Goals"; then
#   TESTS="$TESTS rewrite-04 arch-04"
# fi
# if echo "$FILES" | grep -q "style.css\|\.css$"; then
#   TESTS="$TESTS design-*"  # 全画面デザインテスト
# fi
# if echo "$FILES" | grep -q "preact-bridge"; then
#   TESTS="$TESTS arch-*"    # 全アーキテストテスト
# fi

if [ -n "$TESTS" ]; then
  echo "Running affected tests: $TESTS"
  npx playwright test --grep "$TESTS" --project=mobile || exit 1
else
  echo "No affected tests found. Running L1 only."
  npx playwright test --grep "smoke" --project=mobile || exit 1
fi
```

### 17.4 C2デプロイフロー

```
実装完了
  → version bump（4箇所同期: app_config.yaml, package.json, version.ts, CLAUDE.md）
  → npx vite build
  → canopy.sh（全ゲート）
  → L1スモーク（2分）
  → L2影響範囲（5-10分）
  → npx wrangler pages deploy ${build.out_dir}
  → npx wrangler deploy（Worker）
  → curl -s $URL | grep version（デプロイ確認）
  → git tag vX.Y.Z
```

C2フロー中のFAILは即停止。FAILが解消するまでデプロイ禁止。

### 17.5 /simplify（テスト簡略化の申請）
ENGがテスト量が多すぎると判断した場合、`/simplify`でADVに簡略化を申請できる。ADVが判断して許可/却下する。自己判断でのテスト省略は禁止。

---

## 18. テストライブラリ（全プロジェクト共通）

### 18.1 概要
全アプリから集約したテスト項目DB。各項目に機能タグを付け、新アプリで該当タグのテストを自動抽出する。

**配置:** dev-system/tests/test_library.md

### 18.2 タグ体系

| タグ | 意味 | 該当アプリ例 |
|------|------|------------|
| `#all` | 全アプリ共通 | 全て |
| `#chat` | チャット/AI対話機能 | GOAL AI, サポートbot |
| `#task` | タスク管理機能 | GOAL AI, プロジェクト管理 |
| `#calendar` | カレンダー/スケジュール | GOAL AI, 予約管理 |
| `#subscription` | サブスク/課金 | 有料アプリ全般 |
| `#swipe` | スワイプ操作 | Tinder型, カード型UI |
| `#ai-response` | AI応答品質 | AIアプリ全般 |
| `#pwa` | PWA/オフライン | PWAアプリ |
| `#auth` | 認証/ログイン | ログイン機能あり |
| `#darkmode` | ダークモード | テーマ切替あり |
| `#responsive` | レスポンシブ | モバイル対応全般 |
| `#accessibility` | アクセシビリティ | 全て |
| `#performance` | パフォーマンス | 全て |
| `#security` | セキュリティ | 全て |

### 18.3 テスト項目フォーマット

```markdown
### TL-001: アプリ起動→メイン画面表示 #all 🔴
- 操作: URLアクセス
- 期待: メイン画面が3秒以内に表示
- カバレッジ: [COVERED] / [NOT COVERED] / [PARTIAL]

### TL-042: チャット送信→AI応答受信 #chat #ai-response 🔴
- 操作: メッセージ入力→送信
- 期待: 30秒以内にAI応答表示。エラーなし
- カバレッジ: [COVERED]
```

### 18.4 新アプリでの抽出

```bash
# アプリの機能タグを指定してテスト項目を自動抽出
grep -E "#all|#chat|#task" dev-system/tests/test_library.md > app-test-items.md
echo "抽出件数: $(wc -l < app-test-items.md)"
```

新機能追加時にENGが自動的にtest_library.mdを参照して該当テストを追加する運用ルールをdevelopment_rules.mdに含める。

---

## 19. デバイス依存バグ診断フロー

iOS Safari / Android WebView 等、実機・シミュレーターでしか再現できないバグに関するルール。

### 19.1 ADVの制約
- ADVは静的コード解析のみ可能。実機・シミュレーターでの動作確認手段を持たない
- iOS Safariのvisualviewport挙動・キーボード制御・overflow/position:fixedの相互作用など、ブラウザエンジン固有の挙動は静的解析では確定診断できない
- **ADVは「確定仕様」「唯一の解決策」等の断定表現を使わない**

### 19.2 正しいフロー
1. **ENG:** iOSシミュレーター（またはAndroidエミュレーター）で症状を自分で再現・確認
2. **ENG:** 修正方針を `session_progress.md` の該当ミッション内に記載し、**実装前に30分待機**（ADVがオンラインなら確認する。オフラインなら自己判断で進める）
3. **ENG:** 実装後、シミュレーターで以下を検証してから報告:
   - 症状が解消されたこと（具体的な操作手順で確認）
   - 関連する別の挙動が壊れていないこと
4. **ENG → PO:** 実機確認を依頼。実機でも解消を確認してから完了とする

### 19.3 ADVの役割（このフローにおける）
- ENGが記載した修正方針を読んで、明らかに方向性が間違っている場合のみ指摘する
- 「こうすれば確実に直る」という断定はしない
- 参考情報（MDN仕様、既知のiOS Safariの挙動パターン等）を提示するにとどめる

### 19.4 このルールが生まれた背景
BUG-01（キーボード固定）でADVが静的解析による「確定診断」を3回出し、全て実機で失敗。POに何度も実機確認させて時間を無駄にした。構造的原因: 実機確認なしの断定。

---

## 20. 仕様書ID付番

### 20.1 目的
仕様書の各項目にユニークIDを振り、テストとの対応追跡を可能にする。

### 20.2 ID体系
```
SPEC-{SCREEN}-{NNN}

例:
SPEC-TODAY-001: タイムライン表示
SPEC-TODAY-002: タスクタップ→詳細表示
SPEC-TALK-001: チャット送受信
SPEC-GOALS-001: ゴール一覧表示
```

### 20.3 テストとのリンク
```markdown
# 仕様書 (ux_redesign_v2.md)
SPEC-TODAY-003: タスクをタップして編集する

# テスト (e2e/specs/)
// [SPEC-TODAY-003]
test('タスクタップ→編集→保存', async () => { ... });

# 検索
grep -rn "SPEC-TODAY-003" docs/ tests/
→ 仕様変更時に該当テストが即特定
```

### 20.4 canopyでの検証
```bash
# 全SPEC-IDに対応するテストが存在するか
SPECS=$(grep -c "^SPEC-" docs/ux_redesign_v2.md)
TESTS=$(grep -rc "SPEC-" tests/e2e/specs/ | awk -F: '{s+=$2}END{print s}')
echo "Specs: $SPECS, Test refs: $TESTS"
```

---

## 21. AIレビュー基盤

開発プロセスの一部として、複数AIによるレビューを標準化する。

### 21.1 レビュー対象

| 対象 | トリガー | 目的 |
|------|---------|------|
| **仕様書** | DRAFT完成時 | 矛盾・漏れ・実現可能性の検証 |
| **設計判断** | アーキテクチャ変更時 | 代替案の評価・リスク分析 |
| **コード品質** | 大規模リファクタ完了時 | 構造・保守性・セキュリティ |
| **テスト戦略** | テスト基盤変更時 | カバレッジ・品質ゲートの抜け穴 |

### 21.2 レビュー実行方式

ENGがAPI経由で複数モデルに仕様書を送信し、構造化JSONで結果を受け取る。

```bash
# ENGが実行するレビューコマンド（例）
node scripts/ai_review.js \
  --input docs/plans/spec_v1.md \
  --models "gemini,gpt-5" \
  --personas "ai-ops,architect,qa,devops,dx" \
  --output docs/plans/

# 出力: review_persona_aiops_gemini.json, review_persona_architect_gpt5.json, ...
```

### 21.3 レビュー結果フォーマット（JSON統一）

```json
[
  {
    "id": "R-001",
    "severity": "CRITICAL|HIGH|MEDIUM|LOW",
    "category": "CONTRADICTION|COMPLETENESS|FEASIBILITY|AMBIGUITY|BEST_PRACTICE",
    "location": "ファイル名 → セクション名",
    "issue": "問題の説明",
    "suggestion": "改善提案"
  }
]
```

### 21.4 ペルソナ定義（標準5ペルソナ。カスタム追加可能）

| ペルソナ | 観点 | 特に注目する領域 |
|---------|------|----------------|
| AI Ops設計者 | 3層のAI⇔人間の責務分離 | 自律範囲と承認ゲートのバランス。暴走防止メカニズム |
| ソフトウェアアーキテクト | モジュール分離、依存方向 | スケーラビリティ。共通/個別の境界設計 |
| QAエンジニア | テストピラミッド | 品質ゲートの抜け穴。自動化カバレッジ。テストの信頼性 |
| DevOpsエンジニア | CI/CD、デプロイパイプライン | 環境分離。スクリプトの堅牢性 |
| DXエンジニア | 開発者体験 | ENGが迷わず動ける仕様の明瞭さ。曖昧さ・矛盾の残存 |

### 21.5 レビュー統合プロセス
1. ENGがレビュー実行 → JSON出力をdocs/plans/に保存
2. ADVがレビュー結果を統合 → 改善計画をPOに提示
3. PO承認 → ADVが改訂版を作成
4. 必要に応じて再レビュー → 収束するまで繰り返し
5. 確定版をリポジトリに反映

### 21.6 レビュー品質ゲート
- CRITICAL 1件以上 → 改訂必須（確定不可）
- HIGH 5件以上 → 改訂推奨
- 全件対応不要。対応しない指摘には理由を記録（「意図的にこうしている」等）

---

## 22. 仕様書開発フロー（6フェーズ）

大規模な仕様書（DEV-SYSTEM-SPEC、APP-SW-SPEC等）の策定プロセス。

### Phase 1: DRAFT作成
- ADVが仕様書DRAFTを作成
- 過去の教訓・決定事項・既存ドキュメントを全て反映
- 成果物: `docs/plans/xxx_v1.md`

### Phase 2: 外部AIレビュー
- ENGがGemini/GPT等の外部AIにDRAFTを送信
- 全ての内容を省略なしでレビュー対象とする
- 成果物: `docs/plans/review_gemini.json`, `docs/plans/review_gpt5.json`

### Phase 3: 統合・改善計画
- ADVがレビュー結果を統合
- 共通指摘の特定、改善計画の策定
- PO承認

### Phase 4: 改訂
- ADVが改訂版を作成（v2, v2.1, ...）
- 変更履歴にレビューIDを紐付け

### Phase 5: 再レビュー（ペルソナレビュー）
- ENGが改訂版を専門家ペルソナでレビュー（§21.4）
- 収束するまでPhase 3-5を繰り返し

### Phase 6: 確定・反映
- 確定版をリポジトリに配置
- 開発体制を仕様書に応じてアップデート
- 関連ファイルの一括更新（CLAUDE.md, development_rules.md等）

---

## 23. ルールの保存先と優先順位

### 23.1 保存先の優先順位

| 優先度 | 保存先 | 横展開 | 永続性 |
|--------|-------|--------|--------|
| 1 | **dev-system/templates/**, **dev-system/docs/** | ✅ init_app.shで全アプリに展開 | ✅ リポジトリに永続 |
| 2 | **アプリのdocs/**, **CLAUDE.md** | ❌ アプリ固有 | ✅ リポジトリに永続 |
| 3 | **Claude.aiメモリ** | ❌ プロジェクト固有 | ⚠ プロジェクト内では永続だが横展開不可 |

**原則: ルールは必ずリポジトリファースト。メモリは補助。**

### 23.2 新ルール追加時のフロー
1. POから方針違反の指摘を受ける
2. ADVが再発防止ルールを起案
3. 「このルールを追加しますか？」とPOに確認
4. PO承認
5. リポジトリに書き込み（dev-system or アプリのdocs/）
6. メモリにも補助的に保存（即時参照用）
7. 棚卸し時にdev-systemテンプレートへの逆流が必要か判断

### 23.3 チャットは揮発する
- チャットの会話はセッション終了で失われる
- 「次回やる」で会話を閉じることを禁止（鉄則⑫）
- 全決定事項をリポジトリに書き込んでからセッション終了
- 「次回圧縮する」等の曖昧な先送りも禁止

---

## 24. 構造的制約

### 24.1 修正試行3回制限
同一バグへの修正試行は3回まで。3回失敗 → 自動HOLD → ADVにエスカレーション。
デバッグ手法は`debugging-guide.md`の4フェーズに従う：
1. Phase 1: 証拠収集（ログ読む→データフロー追跡→失敗箇所特定）。修正提案禁止
2. Phase 2: 仮説構築（パターン分析）
3. Phase 3: 仮説テスト（1つずつ検証）
4. Phase 4: 修正＋テスト付き実装
推測による修正禁止。

### 24.2 300行制限
session_progress.mdは300行以内を維持。超過時はsession_archiver.sh（§9.4）で完了済みをアーカイブ。

### 24.3 ホットフィックスパス
以下の全条件を満たす場合、ENGは🟢低リスクとして自律実行可：
- mockup変更なし
- 対象2ファイル以内
- 仕様変更なし

### 24.4 ENGのエラー報告
「忘れた」「間違えた」「見落とした」等の人間的エラー表現は使用禁止。
構造的根本原因と再発防止策をテンプレート形式で報告する：
```
問題: （何が起きたか）
構造的原因: （なぜ起きたか — 仕組みの問題として記述）
再発防止策: （どのルール/ゲート/チェックを追加するか）
反映先: （どのファイルに書き込むか）
```

### 24.5 絶対禁止
- canopy項目削除（追加は可、削除はPO承認必須）
- 契約変更（CLAUDE.md無断変更）
- UI変更をgrep確認だけで「完了」にすること
- ログ確認前の投機的修正
- 分母なしの「ALL PASS」「全件完了」報告

### 24.6 改善提案ルール（毎セッション実行）
6視点から優先度付きで最低3つ提案：
🤝営業 / 🔧エンジニア / 📋PM / 🏗️アーキテクト / 💻SE / 👤エンドユーザー
競合差別化提案を1〜3つ別枠で提示。

### 24.7 変更時の一括更新義務
仕様・方針・ルールの変更が発生した場合、PO承認を得た上で関連する全ファイルを一括更新する。
「1箇所だけ更新して他を放置」は禁止。更新完了後、更新ファイル一覧を報告。
