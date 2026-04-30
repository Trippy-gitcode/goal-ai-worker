# dev-system — AI自律開発システム共通基盤
> ふとしの全プロジェクトで共有する開発体制テンプレート
> 各アプリのtemplates/からシンボリックリンクまたはコピーで利用
> 更新: 2026-04-04

## ディレクトリ構成

```
dev-system/
├── README.md                          ← このファイル
├── templates/                         ← アプリ初期化テンプレート
│   ├── bootstrap.md                   ← Claude.aiプロジェクト唯一のナレッジ
│   ├── CLAUDE_TEMPLATE.md             ← CLAUDE.md骨格（[TODO]を埋める）
│   ├── session_progress_template.md   ← ダッシュボード形式
│   └── mission_template_v2.md         ← ミッション定義形式
├── rules/                             ← 品質ゲート・ルール
│   ├── development_rules_common.md    ← G1-G6共通ゲート
│   └── development_rules_app.md       ← アプリ固有ルールのテンプレート
├── canopy/                            ← スモークテスト
│   ├── canopy_common.sh               ← 共通チェック（バージョン同期/テストAP/ガード件数）
│   └── canopy_app_template.sh         ← アプリ固有チェックのテンプレート
├── test-helpers/                      ← テスト品質ガード
│   ├── test-guards.ts                 ← グローバルガード（共通フレームワーク）
│   └── assert-ai-response.ts         ← AI応答検証ヘルパー
├── scripts/                           ← 自動化スクリプト
│   ├── mission_linter.sh              ← ミッション定義の形式検証
│   ├── session_archiver.sh            ← 300行超過時の自動アーカイブ
│   └── init_app.sh                    ← 新アプリ初期化スクリプト
├── docs/                              ← 共通ドキュメント
│   └── lessons_learned.md             ← 全アプリから集約した教訓
└── app-config/                        ← アプリ固有設定の雛形
    └── app_config_template.yaml       ← プラン/ルーティング/モデル等
```

## 各アプリ側の構成（例: goal-ai-worker）

```
goal-ai-worker/
├── CLAUDE.md                          ← 自動生成 or 手動（契約セクションはアプリ固有）
├── development_rules.md               ← common + app を結合
├── instructions/
│   ├── session_progress.md            ← アプリ固有ミッションキュー
│   └── results/
│       ├── session_history.md
│       ├── metrics.jsonl              ← 品質メトリクス（NEW）
│       └── canopy_latest.txt
├── tests/
│   ├── smoke/
│   │   ├── canopy.sh                  ← source canopy_common.sh + canopy_app.sh
│   │   ├── canopy_common.sh           ← dev-systemからコピー/リンク
│   │   └── canopy_app.sh             ← アプリ固有チェック
│   └── e2e/
│       ├── helpers/
│       │   ├── test-guards.ts         ← dev-systemからコピー + app固有設定
│       │   └── test-guards.config.ts  ← アプリ固有の許容リスト（NEW）
│       └── specs/
├── docs/                              ← アプリ固有仕様
└── app_config.yaml                    ← アプリ固有設定値
```

## 共通/個別の分離ルール

### 共通（dev-system管理）— 変更時は全アプリに展開
| ファイル | 内容 | 更新頻度 |
|---|---|---|
| bootstrap.md | 3層構造/ミッションv2/承認ルール/改善提案ルール | 低（体制変更時のみ） |
| mission_template_v2.md | bashコマンド完了条件/FAIL条件/報告形式 | 低 |
| session_progress_template.md | 5行サマリー/キュー/保留/完了済み形式 | 低 |
| development_rules_common.md | G1-G6ゲート/絶対禁止/構造的制約 | 中（教訓反映時） |
| canopy_common.sh | バージョン同期/ビルド同期/テストAP/ガード件数 | 中 |
| test-guards.ts | console.error監視/pageerror/トースト検出 | 低 |
| assert-ai-response.ts | AI応答のエラー検出/長さ検証 | 低 |
| mission_linter.sh | ミッション定義のbashコマンド有無チェック | 低 |
| session_archiver.sh | 300行チェック→自動アーカイブ | 低 |
| lessons_learned.md | 全アプリから集約した教訓DB | 高（セッションごと） |

### アプリ固有（各リポジトリ管理）
| ファイル | 内容 |
|---|---|
| CLAUDE.md | 契約セクション（プラン/ルーティング/課金/モデル） |
| development_rules_app.md | アプリ固有ルール（PLAN_CONFIG、DOM ID等） |
| canopy_app.sh | アプリ固有grepチェック（エンドポイント/関数存在等） |
| test-guards.config.ts | アプリ固有の許容リスト |
| app_config.yaml | プラン構成/ルーティング比率/モデル名等 |
| session_progress.md | ミッションキュー |
| docs/ | 設計仕様/テスト仕様/UX仕様 |

---

## canopy.shのモジュール化設計

### canopy.sh（アプリルート。エントリポイント）
```bash
#!/bin/bash
CANOPY_START=$(date +%s)
FAIL=0

# 共通チェック読み込み
source tests/smoke/canopy_common.sh

# アプリ固有チェック読み込み
source tests/smoke/canopy_app.sh

# 結果出力
echo "=== CANOPY $([ $FAIL -eq 0 ] && echo 'PASS' || echo 'FAIL') ==="
exit $FAIL
```

### canopy_common.sh（dev-systemからコピー）
- バージョン同期（APP_VERSION 4箇所一致）
- ビルド同期（frontend vs frontend-dist）
- テストアンチパターン（expect(true)/空catch/typeof-only）
- テストガード許容リスト件数上限（15件）
- session_progress.md行数（300行以下）
- development_rules.md行数（120行以下）
- tree-shake安全性（onclick vs window.assign）

### canopy_app.sh（アプリ固有）
- Worker稼働確認
- HTTPスモーク（エンドポイント一覧）
- コア関数存在（handleChatStream等）
- プラン構成（PLAN_CONFIG）
- UI仕様値（CSSトークン等）
- 参照ドキュメント存在

## test-guards.tsの分離設計

### test-guards.ts（共通フレームワーク。dev-system管理）
```typescript
// ⚠ このファイルはdev-system共通。アプリ固有の変更禁止
import { IGNORED_ERRORS } from './test-guards.config';

// AC-GLOBAL-1〜4の実装（console.error/pageerror/toast/AI応答エラー）
// ... フレームワーク部分は全アプリ共通
```

### test-guards.config.ts（アプリ固有。各リポジトリ管理）
```typescript
// ⚠ 変更はClaude.ai承認必須（canopyで件数チェック）
// ブラウザ内部 + localhost固有のみ許容
export const IGNORED_ERRORS = [
  'favicon', 'manifest', 'sw.js', 'service-worker',
  'ResizeObserver loop', 'Non-Error promise rejection',
  'DevTools', 'Autofill', 'chrome-extension',
  'CORS policy', 'Access-Control-Allow-Origin', 'blocked by CORS',
];

// アプリ固有のエラーテキスト検出パターン
export const ERROR_PATTERNS = [
  'エラーが発生しました', 'エラーが起きました',
  'error occurred', 'something went wrong',
];
```

---

## ミッション定義リンター設計（mission_linter.sh）

```bash
#!/bin/bash
# session_progress.mdのミッション定義をv2テンプレートに照合
SP="instructions/session_progress.md"
FAIL=0

# 各ミッションブロックを抽出してチェック
grep -n "^### " "$SP" | while read -r line; do
  LINE_NUM=$(echo "$line" | cut -d: -f1)
  MISSION=$(echo "$line" | cut -d: -f2-)

  # 完了コマンドにbashコマンドがあるか
  BASH_CMD=$(sed -n "${LINE_NUM},/^###/p" "$SP" | grep -c '```bash')
  if [ "$BASH_CMD" -eq 0 ]; then
    echo "WARN: $MISSION — 完了コマンドにbashブロックなし"
  fi

  # 「全件」「すべて」「全て」が残っていないか
  VAGUE=$(sed -n "${LINE_NUM},/^###/p" "$SP" | grep -c '全件\|すべて\|全て')
  if [ "$VAGUE" -gt 0 ]; then
    echo "FAIL: $MISSION — 曖昧な自然言語（全件/すべて/全て）が残存"; FAIL=1
  fi

  # FAIL条件があるか
  FAIL_COND=$(sed -n "${LINE_NUM},/^###/p" "$SP" | grep -c 'FAIL条件')
  if [ "$FAIL_COND" -eq 0 ]; then
    echo "WARN: $MISSION — FAIL条件の記述なし"
  fi

  # 参照ファイルがフルパスか
  REF=$(sed -n "${LINE_NUM},/^###/p" "$SP" | grep '参照:' | grep -v '/' | wc -l)
  if [ "$REF" -gt 0 ]; then
    echo "WARN: $MISSION — 参照ファイルにパスなし"
  fi
done

exit $FAIL
```

---

## session_archiver.sh設計

```bash
#!/bin/bash
SP="instructions/session_progress.md"
ARCHIVE="instructions/results/session_history.md"
MAX_LINES=300

CURRENT=$(wc -l < "$SP")
if [ "$CURRENT" -le "$MAX_LINES" ]; then
  echo "OK: session_progress.md is $CURRENT lines (≤ $MAX_LINES)"
  exit 0
fi

echo "ARCHIVING: $CURRENT lines > $MAX_LINES"
# 完了済みセクションをアーカイブに移動
# "## 完了済み" 以降を切り出し
COMPLETED_START=$(grep -n "^## 完了済み" "$SP" | head -1 | cut -d: -f1)
if [ -n "$COMPLETED_START" ]; then
  echo "" >> "$ARCHIVE"
  echo "---" >> "$ARCHIVE"
  echo "## アーカイブ $(date '+%Y-%m-%d')" >> "$ARCHIVE"
  sed -n "${COMPLETED_START},\$p" "$SP" >> "$ARCHIVE"
  # session_progress.mdから完了済みセクションを削除
  head -n $((COMPLETED_START - 1)) "$SP" > "${SP}.tmp"
  echo "" >> "${SP}.tmp"
  echo "## 完了済み（詳細は instructions/results/session_history.md）" >> "${SP}.tmp"
  mv "${SP}.tmp" "$SP"
  NEW_LINES=$(wc -l < "$SP")
  echo "DONE: $CURRENT → $NEW_LINES lines"
fi
```

---

## app_config_template.yaml設計

```yaml
# アプリ固有設定 — CLAUDE.mdの契約セクション生成に使用
app:
  name: "APP_NAME"
  version: "0.0.1"
  repo: "https://github.com/user/repo"

infrastructure:
  frontend: "cloudflare-pages"  # or vercel, netlify
  backend: "cloudflare-workers" # or aws-lambda, supabase-edge
  database: "supabase"          # or planetscale, firebase
  payments: "stripe-metered"    # or stripe-fixed, none

plans: []
  # - name: free
  #   price: 0
  #   daily_limit: 20
  # - name: pro
  #   price_range: [1500, 2980]
  #   per_turn: 20

routing:
  enabled: false
  # models: [gpt-5, claude-sonnet, gemini-flash]
  # ratios: { gpt: 40, claude: 15, gemini: 30, simple: 15 }

deploy:
  frontend_cmd: "npx wrangler pages deploy frontend-dist"
  backend_cmd: "npx wrangler deploy"
  build_cmd: "npx vite build"
```

---

## 横展開手順（新アプリ立ち上げ）

### init_app.sh（自動化）
```bash
#!/bin/bash
# 新アプリリポジトリ初期化
APP_DIR=$1
DEV_SYSTEM="$HOME/Desktop/dev-system"

if [ -z "$APP_DIR" ]; then echo "Usage: init_app.sh /path/to/new-app"; exit 1; fi

mkdir -p "$APP_DIR"/{instructions/results,docs,tests/smoke,tests/e2e/{helpers,specs}}
cd "$APP_DIR" && git init

# 共通テンプレートをコピー
cp "$DEV_SYSTEM/templates/bootstrap.md" .
cp "$DEV_SYSTEM/templates/CLAUDE_TEMPLATE.md" CLAUDE.md
cp "$DEV_SYSTEM/templates/session_progress_template.md" instructions/session_progress.md
cp "$DEV_SYSTEM/templates/mission_template_v2.md" docs/

# 共通ルール
cp "$DEV_SYSTEM/rules/development_rules_common.md" .
cp "$DEV_SYSTEM/rules/development_rules_app.md" development_rules_app.md

# canopy
cp "$DEV_SYSTEM/canopy/canopy_common.sh" tests/smoke/
cp "$DEV_SYSTEM/canopy/canopy_app_template.sh" tests/smoke/canopy_app.sh
cat > tests/smoke/canopy.sh << 'EOF'
#!/bin/bash
FAIL=0
source tests/smoke/canopy_common.sh
source tests/smoke/canopy_app.sh
echo "=== CANOPY $([ $FAIL -eq 0 ] && echo 'PASS' || echo 'FAIL') ==="
exit $FAIL
EOF
chmod +x tests/smoke/canopy.sh

# テストガード
cp "$DEV_SYSTEM/test-helpers/test-guards.ts" tests/e2e/helpers/
cp "$DEV_SYSTEM/test-helpers/assert-ai-response.ts" tests/e2e/helpers/

# スクリプト
cp "$DEV_SYSTEM/scripts/mission_linter.sh" scripts/
cp "$DEV_SYSTEM/scripts/session_archiver.sh" scripts/

# アプリ固有設定テンプレート
cp "$DEV_SYSTEM/app-config/app_config_template.yaml" app_config.yaml

echo "✅ $APP_DIR initialized. Next: edit CLAUDE.md and app_config.yaml"
```

---

## 学習の逆流メカニズム

### lessons_learned.md（dev-system/docs/）
```markdown
# 教訓DB — 全アプリから集約
> 新しい教訓が追加されたら、該当するテンプレート/ルール/canopyに反映する

## 2026-04-04: テストガード許容リスト膨張（GOAL AI）
- **問題:** Codeがテストを通すためにIGNORED_ERRORSに大量追加。ガードの意味が消失
- **対策:** canopyで件数上限チェック（15件）。変更はClaude.ai承認必須
- **反映先:** canopy_common.sh, development_rules_common.md, test-guards.ts

## 2026-04-04: E2E serial設計矛盾（GOAL AI）
- **問題:** serial指定で前テストのデータを期待するが、各テストはページリロードで独立ユーザー
- **対策:** 全テストを独立化。データ依存テストは1テスト内でセットアップ→検証を完結
- **反映先:** development_rules_common.md

## 2026-04-04: JSロード順バグ（GOAL AI）
- **問題:** goals.jsがapp.jsより先にロード。app.jsで定義した関数が未定義エラー
- **対策:** グローバルガードのpageerror検出で自動検出可能に
- **反映先:** test-guards.ts

## 2026-04-03: 「全件完了」偽報告（GOAL AI）
- **問題:** 256件中23件しか完了していないのに「全件完了」と報告
- **対策:** ミッション定義で「全件」禁止。完了条件を全てbashコマンドで記述
- **反映先:** mission_template_v2.md, bootstrap.md

## 2026-04-03: テストPASSなのにエラー表示（GOAL AI）
- **問題:** エラーバブルが正常応答と同じCSSクラス。テストが存在確認のみで内容未検証
- **対策:** グローバルガード（AC-GLOBAL-4）でAI応答のエラーテキスト検出
- **反映先:** test-guards.ts, test_audit_v1.md
```

### 逆流プロセス
1. アプリ内で問題発見→教訓をlessons_learned.mdに追記
2. Claude.aiが「テンプレートに反映すべきか」を判断
3. 反映する場合→dev-systemの該当ファイルを更新
4. 他アプリの次回セッションでdev-systemから最新を取得

---

## 品質メトリクスダッシュボード

### metrics.jsonl（各アプリ。instructions/results/）
```jsonl
{"date":"2026-04-04","session":26,"mission":"TEST-AC","tests_pass":574,"tests_fail":0,"tests_skip":24,"canopy":"PASS","duration_min":180,"bugs_found":2,"bugs_fixed":2}
{"date":"2026-04-04","session":26,"mission":"TEST-DESIGN","tests_pass":46,"tests_fail":9,"tests_skip":0,"canopy":"PASS","duration_min":62,"bugs_found":0,"bugs_fixed":0}
```

各セッション終了時にCodeが1行追記。トレンド分析用。
