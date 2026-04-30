# sub_infrastructure.md — インフラ・スクリプト・ディレクトリ構成
> 親: dev_system_spec.md §10, §8
> 更新: 2026-04-11
> 変更: v3.0 — deploy.sh/version_sync.sh/rollback.sh/report_lint.sh/screenshot_lint.sh/max_lines_lint.sh/changed-files-allowlist.sh/review_gate.sh追加。ハードコードパス除去。canopy実装追加

---

## 1. ディレクトリ構成

### 1.1 dev-system（共通基盤リポジトリ）

```
dev-system/
├── VERSION
├── README.md
├── templates/
│   ├── bootstrap.md
│   ├── CLAUDE_TEMPLATE.md
│   ├── session_progress_template.md
│   ├── mission_template_v3.md
│   ├── test_map_template.yaml
│   ├── test_meta_template.json
│   ├── system_map_template.md
│   └── frontend/
│       ├── package.json
│       └── ...
├── rules/
│   ├── development_rules_common.md
│   └── development_rules_app.md
├── protocols/
│   └── claude_ai_protocol_template.md
├── canopy/
│   ├── canopy_common.sh
│   └── canopy_app_template.sh
├── test-helpers/
│   ├── test-guards.ts
│   ├── test-guards.config.template.ts
│   └── assert-ai-response.ts
├── scripts/
│   ├── init_app.sh
│   ├── update_app.sh
│   ├── build_rules.sh
│   ├── mission_linter.sh
│   ├── session_archiver.sh
│   ├── test_lint.sh
│   ├── deploy.sh
│   ├── version_sync.sh
│   ├── rollback.sh
│   ├── report_lint.sh
│   ├── screenshot_lint.sh
│   ├── max_lines_lint.sh
│   ├── changed-files-allowlist.sh
│   ├── review_gate.sh
│   └── affected-tests.sh
├── tests/
│   └── test_library.md
├── docs/
│   ├── lessons_learned.md
│   ├── anti_patterns.md
│   ├── architecture_decisions.md
│   ├── testing-anti-patterns.md
│   ├── debugging-guide.md
│   └── incident_runbook.md
└── app-config/
    └── app_config_template.yaml
```

### 1.2 各アプリ側の構成

```
app-repo/
├── CLAUDE.md
├── development_rules.md
├── .dev-system.version
├── instructions/
│   ├── session_progress.md
│   └── results/
│       ├── session_history.md
│       ├── metrics.jsonl
│       └── canopy_latest.txt
├── evidence/                          ← TDD証跡+スクショ（ミッションIDごと）
├── tests/
│   ├── smoke/
│   │   ├── canopy.sh
│   │   ├── canopy_common.sh           ← シンボリックリンク
│   │   └── canopy_app.sh
│   ├── e2e/
│   │   ├── helpers/
│   │   │   ├── test-guards.ts         ← シンボリックリンク
│   │   │   ├── test-guards.config.ts  ← コピー（アプリ固有）
│   │   │   └── assert-ai-response.ts  ← シンボリックリンク
│   │   └── specs/
│   ├── test_map.yaml                  ← ソース→テスト対応（アプリ固有）
│   └── test_meta.json                 ← テスト期待件数
├── scripts/                           ← シンボリックリンク群
├── docs/
└── app_config.yaml
```

---

## 2. スクリプト

### 2.1 init_app.sh（新アプリ初期化）

```bash
#!/bin/bash
set -euo pipefail
APP_DIR=${1:-}
DEV_SYSTEM=${DEV_SYSTEM_DIR:-"$(cd "$(dirname "$0")/.." && pwd)"}

if [ -z "$APP_DIR" ]; then
  echo "Usage: init_app.sh /path/to/new-app [--frontend=preact]"; exit 1
fi

mkdir -p "$APP_DIR"/{instructions/results,docs,tests/smoke,tests/e2e/{helpers,specs},scripts,evidence}
cd "$APP_DIR" && git init

# コピー対象
cp "$DEV_SYSTEM/templates/bootstrap.md" .
cp "$DEV_SYSTEM/templates/CLAUDE_TEMPLATE.md" CLAUDE.md
cp "$DEV_SYSTEM/templates/session_progress_template.md" instructions/session_progress.md
cp "$DEV_SYSTEM/templates/mission_template_v3.md" docs/
cp "$DEV_SYSTEM/rules/development_rules_app.md" .
cp "$DEV_SYSTEM/canopy/canopy_app_template.sh" tests/smoke/canopy_app.sh
cp "$DEV_SYSTEM/test-helpers/test-guards.config.template.ts" tests/e2e/helpers/test-guards.config.ts
cp "$DEV_SYSTEM/app-config/app_config_template.yaml" app_config.yaml
cp "$DEV_SYSTEM/templates/test_map_template.yaml" tests/test_map.yaml
cp "$DEV_SYSTEM/templates/test_meta_template.json" tests/test_meta.json
cp "$DEV_SYSTEM/templates/system_map_template.md" docs/system_map.md

# シンボリックリンク対象
SYMLINKS=(
  "canopy/canopy_common.sh:tests/smoke/canopy_common.sh"
  "test-helpers/test-guards.ts:tests/e2e/helpers/test-guards.ts"
  "test-helpers/assert-ai-response.ts:tests/e2e/helpers/assert-ai-response.ts"
  "scripts/build_rules.sh:scripts/build_rules.sh"
  "scripts/mission_linter.sh:scripts/mission_linter.sh"
  "scripts/session_archiver.sh:scripts/session_archiver.sh"
  "scripts/test_lint.sh:scripts/test_lint.sh"
  "scripts/deploy.sh:scripts/deploy.sh"
  "scripts/version_sync.sh:scripts/version_sync.sh"
  "scripts/rollback.sh:scripts/rollback.sh"
  "scripts/report_lint.sh:scripts/report_lint.sh"
  "scripts/screenshot_lint.sh:scripts/screenshot_lint.sh"
  "scripts/max_lines_lint.sh:scripts/max_lines_lint.sh"
  "scripts/changed-files-allowlist.sh:scripts/changed-files-allowlist.sh"
  "scripts/review_gate.sh:scripts/review_gate.sh"
  "scripts/affected-tests.sh:scripts/affected-tests.sh"
)
for pair in "${SYMLINKS[@]}"; do
  SRC="$DEV_SYSTEM/${pair%%:*}"; DST="$APP_DIR/${pair##*:}"
  mkdir -p "$(dirname "$DST")"; ln -s "$SRC" "$DST"
done

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
if [ "${2:-}" = "--frontend=preact" ]; then
  cp -r "$DEV_SYSTEM/templates/frontend/"* .
  echo "  Frontend: Preact+Vite template applied"
fi

# session_progress_template.mdに「## 完了済み」セクション存在確認
if ! grep -q "^## 完了済み" instructions/session_progress.md; then
  echo -e "\n## 完了済み" >> instructions/session_progress.md
fi

echo "✅ $APP_DIR initialized (dev-system $(cat .dev-system.version))"
echo "Next: edit CLAUDE.md and app_config.yaml"
```

### 2.2 update_app.sh（既存アプリの共通資産同期）

```bash
#!/bin/bash
set -euo pipefail
APP_DIR=${1:-.}
DEV_SYSTEM=${DEV_SYSTEM_DIR:-"$(cd "$(dirname "$0")/.." && pwd)"}

if [ ! -f "$DEV_SYSTEM/VERSION" ]; then
  echo "ERROR: dev-system not found at $DEV_SYSTEM"; exit 1
fi

NEW_VER=$(cat "$DEV_SYSTEM/VERSION")
OLD_VER=$(cat "$APP_DIR/.dev-system.version" 2>/dev/null || echo "none")
echo "Updating: $OLD_VER → $NEW_VER"

SYMLINKS=(
  "canopy/canopy_common.sh:tests/smoke/canopy_common.sh"
  "test-helpers/test-guards.ts:tests/e2e/helpers/test-guards.ts"
  "test-helpers/assert-ai-response.ts:tests/e2e/helpers/assert-ai-response.ts"
  "scripts/build_rules.sh:scripts/build_rules.sh"
  "scripts/mission_linter.sh:scripts/mission_linter.sh"
  "scripts/session_archiver.sh:scripts/session_archiver.sh"
  "scripts/test_lint.sh:scripts/test_lint.sh"
  "scripts/deploy.sh:scripts/deploy.sh"
  "scripts/version_sync.sh:scripts/version_sync.sh"
  "scripts/rollback.sh:scripts/rollback.sh"
  "scripts/report_lint.sh:scripts/report_lint.sh"
  "scripts/screenshot_lint.sh:scripts/screenshot_lint.sh"
  "scripts/max_lines_lint.sh:scripts/max_lines_lint.sh"
  "scripts/changed-files-allowlist.sh:scripts/changed-files-allowlist.sh"
  "scripts/review_gate.sh:scripts/review_gate.sh"
  "scripts/affected-tests.sh:scripts/affected-tests.sh"
)

for pair in "${SYMLINKS[@]}"; do
  SRC="$DEV_SYSTEM/${pair%%:*}"; DST="$APP_DIR/${pair##*:}"
  mkdir -p "$(dirname "$DST")"; ln -sf "$SRC" "$DST"
  echo "  LINK: $DST → $SRC"
done

if [ -f "$APP_DIR/development_rules_app.md" ]; then
  bash "$DEV_SYSTEM/scripts/build_rules.sh" "$APP_DIR" "$DEV_SYSTEM"
fi

echo "$NEW_VER" > "$APP_DIR/.dev-system.version"
echo "✅ Updated to dev-system $NEW_VER"
```

### 2.3 build_rules.sh

```bash
#!/bin/bash
set -euo pipefail
APP_DIR=${1:-.}
DEV_SYSTEM=${DEV_SYSTEM_DIR:-"$(cd "$(dirname "$0")/.." && pwd)"}
COMMON="$DEV_SYSTEM/rules/development_rules_common.md"
APP="$APP_DIR/development_rules_app.md"
OUTPUT="$APP_DIR/development_rules.md"

if [ ! -f "$COMMON" ]; then echo "ERROR: $COMMON not found"; exit 1; fi

cat "$COMMON" > "$OUTPUT"
if [ -f "$APP" ]; then
  echo "" >> "$OUTPUT"; echo "---" >> "$OUTPUT"; echo "" >> "$OUTPUT"
  cat "$APP" >> "$OUTPUT"
fi
echo "Generated: $OUTPUT ($(wc -l < "$OUTPUT") lines)"
```

### 2.4 mission_linter.sh

```bash
#!/bin/bash
set -euo pipefail
SP="${1:-instructions/session_progress.md}"
FAIL=0

MISSION_LINES=$(grep -n "^### " "$SP" | grep -v "STATUS: DONE\|✅" | cut -d: -f1)

for LINE_NUM in $MISSION_LINES; do
  NEXT=$(grep -n "^### " "$SP" | awk -F: -v s="$LINE_NUM" '$1>s{print $1;exit}')
  if [ -z "$NEXT" ]; then BLOCK=$(sed -n "${LINE_NUM},\$p" "$SP")
  else BLOCK=$(sed -n "${LINE_NUM},$((NEXT-1))p" "$SP"); fi

  MISSION=$(echo "$BLOCK" | head -1)
  if echo "$BLOCK" | grep -q "STATUS: DONE"; then continue; fi

  # bashブロック必須（FAIL）
  BASH_CMD=$(echo "$BLOCK" | grep -c "cmd[0-9]\|npx \|grep \|awk \|wc ")
  if [ "$BASH_CMD" -eq 0 ]; then
    echo "FAIL: $MISSION — 完了コマンドにbashコマンドなし"; FAIL=1
  fi

  # 曖昧語禁止
  VAGUE=$(echo "$BLOCK" | grep -c '全件\|すべて\|全て')
  if [ "$VAGUE" -gt 0 ]; then
    echo "FAIL: $MISSION — 曖昧な自然言語残存"; FAIL=1
  fi

  # FAIL条件必須
  if ! echo "$BLOCK" | grep -q 'FAIL条件'; then
    echo "FAIL: $MISSION — FAIL条件の記述なし"; FAIL=1
  fi

  # ATがある場合、前提:必須 + AT-ID必須
  HAS_AT=$(echo "$BLOCK" | grep -c "^AT-[0-9]")
  if [ "$HAS_AT" -gt 0 ]; then
    PRECOND=$(echo "$BLOCK" | grep -c "前提:")
    if [ "$PRECOND" -eq 0 ]; then
      echo "FAIL: $MISSION — ATに「前提:」が不足"; FAIL=1
    fi
  fi

  # 参照ファイルパス
  REF_LINES=$(echo "$BLOCK" | grep "参照:" | grep -v '/' | grep -v 'http' | wc -l)
  if [ "$REF_LINES" -gt 0 ]; then
    echo "WARN: $MISSION — 参照ファイルにパスなし"
  fi
done
exit $FAIL
```

### 2.5 session_archiver.sh

```bash
#!/bin/bash
set -euo pipefail
SP="${1:-instructions/session_progress.md}"
ARCHIVE="${2:-instructions/results/session_history.md}"
MAX_LINES=300

CURRENT=$(wc -l < "$SP")
if [ "$CURRENT" -le "$MAX_LINES" ]; then
  echo "OK: session_progress.md is $CURRENT lines (≤ $MAX_LINES)"; exit 0
fi

COMPLETED_START=$(grep -n "^##[[:space:]]*完了済み" "$SP" | head -1 | cut -d: -f1)
if [ -n "$COMPLETED_START" ]; then
  # STATUS: DONEまたは✅のミッションのみアーカイブ
  echo "" >> "$ARCHIVE"
  echo "---" >> "$ARCHIVE"
  echo "## アーカイブ $(date '+%Y-%m-%d')" >> "$ARCHIVE"
  sed -n "${COMPLETED_START},\$p" "$SP" >> "$ARCHIVE"
  head -n $((COMPLETED_START - 1)) "$SP" > "${SP}.tmp"
  echo "" >> "${SP}.tmp"
  echo "## 完了済み（詳細は instructions/results/session_history.md）" >> "${SP}.tmp"
  mv "${SP}.tmp" "$SP"
  echo "DONE: $CURRENT → $(wc -l < "$SP") lines"
else
  echo "ERROR: No '## 完了済み' section found."
  exit 1
fi
```

### 2.6 canopy_common.sh（実装済み）

```bash
#!/bin/bash
set -uo pipefail  # -e は除外（FAIL変数パターンで制御）
# dev-system共通スモークテスト
# ⚠ 直接編集禁止。dev-system/canopy/canopy_common.sh を更新する
DEV_SYSTEM=${DEV_SYSTEM_DIR:-"$(cd "$(dirname "$0")/../.." && pwd)"}

# --- G1: バージョン同期（app_config.yaml = SoT） ---
if command -v yq &>/dev/null && [ -f "app_config.yaml" ]; then
  APP_VER=$(yq e '.app.version' app_config.yaml)
  PKG_VER=$(node -p "require('./package.json').version" 2>/dev/null || echo "N/A")
  # version.tsとCLAUDE.mdは存在する場合のみチェック（条件付き）
  TS_VER="N/A"; CLAUDE_VER="N/A"
  VERSION_TS=$(yq e '.app.version_file // "frontend/src/version.ts"' app_config.yaml)
  if [ -f "$VERSION_TS" ]; then
    TS_VER=$(grep -oP "(?<=['\"])[\d.]+(?=['\"])" "$VERSION_TS" | head -1)
  fi
  if [ -f "CLAUDE.md" ]; then
    CLAUDE_VER=$(grep -oP "\*\*Version:\*\* v[\d.]+" CLAUDE.md | grep -oP "[\d.]+" | head -1)
  fi
  MISMATCH=0
  [ "$PKG_VER" != "N/A" ] && [ "$PKG_VER" != "$APP_VER" ] && MISMATCH=1
  [ "$TS_VER" != "N/A" ] && [ "$TS_VER" != "$APP_VER" ] && MISMATCH=1
  [ "$CLAUDE_VER" != "N/A" ] && [ "$CLAUDE_VER" != "$APP_VER" ] && MISMATCH=1
  if [ "$MISMATCH" -eq 1 ]; then
    echo "FAIL: G1 version mismatch: config=$APP_VER pkg=$PKG_VER ts=$TS_VER claude=$CLAUDE_VER"; FAIL=1
  fi
fi

# --- dev-systemバージョンpin ---
if [ -f ".dev-system.version" ] && [ -f "$DEV_SYSTEM/VERSION" ]; then
  APP_PIN=$(cat .dev-system.version)
  DEV_VER=$(cat "$DEV_SYSTEM/VERSION")
  if [ "$APP_PIN" != "$DEV_VER" ]; then
    echo "WARN: dev-system version mismatch: app=$APP_PIN, dev-system=$DEV_VER"
  fi
fi

# --- G3: テスト項目数（test_meta.json照合） ---
if [ -f "tests/test_meta.json" ] && command -v jq &>/dev/null; then
  EXPECTED=$(jq -r '.expected_total // 0' tests/test_meta.json)
  ACTUAL=$(find tests/e2e/specs -name "*.spec.*" -exec grep -c "test(" {} + 2>/dev/null | awk -F: '{s+=$NF}END{print s+0}')
  if [ "$EXPECTED" -gt 0 ]; then
    DIFF_PCT=$(( (ACTUAL - EXPECTED) * 100 / EXPECTED ))
    if [ "$DIFF_PCT" -gt 20 ] || [ "$DIFF_PCT" -lt -20 ]; then
      echo "FAIL: G3 test count drift: expected=$EXPECTED actual=$ACTUAL (${DIFF_PCT}%)"; FAIL=1
    fi
  fi
fi

# --- G5: 報告フォーマット（report_lint.sh） ---
if [ -f "scripts/report_lint.sh" ]; then
  bash scripts/report_lint.sh || FAIL=1
fi

# --- G4: L1スモークテストPASS（Playwright終了コード判定） ---
if [ -f "node_modules/.bin/playwright" ]; then
  npx playwright test --grep "smoke" --project=mobile 2>/dev/null || { echo "FAIL: G4 Playwright smoke tests failed"; FAIL=1; }
fi

# --- G6: ビルド同期（グローバル+環境別コマンドを全て検査） ---
if command -v yq &>/dev/null && [ -f "app_config.yaml" ]; then
  BUILD_OUT=$(yq e '.build.out_dir // "dist"' app_config.yaml)
  # グローバル + 全環境のfrontend_cmdをチェック
  ALL_DEPLOY_CMDS=$(yq e '[.deploy.frontend_cmd // "", .env.*.frontend_cmd // ""] | .[] | select(. != "")' app_config.yaml 2>/dev/null)
  while IFS= read -r CMD; do
    [ -z "$CMD" ] && continue
    if ! echo "$CMD" | grep -qE "$BUILD_OUT|\\\$\\{build\\.out_dir\\}"; then
      echo "FAIL: G6 build.out_dir=$BUILD_OUT not found in frontend_cmd: $CMD"; FAIL=1
    fi
  done <<< "$ALL_DEPLOY_CMDS"
fi

# --- G8: TDD証跡チェック ---
# ※ G8/G9は直近1ミッションのみ検証。バッチ実行（§6 中リスク3件連続）時は
#   各ミッション完了ごとにcanopyを実行すること（C2フロー準拠）
# IN_PROGRESSミッションを優先的に検出（DONEより先に確認）
LATEST_MISSION=""
# まずIN_PROGRESSを検索（MISSION-IDは WORD-WORD-NNN や WORD-NNN 形式に対応）
LATEST_MISSION=$(grep -B5 "STATUS: IN_PROGRESS" instructions/session_progress.md 2>/dev/null | grep -oP "(?<=^### )[A-Z][-A-Z]*-[0-9]+" | tail -1)
# なければDONEの直近を検索
if [ -z "$LATEST_MISSION" ]; then
  LATEST_MISSION=$(grep -B5 "STATUS: DONE" instructions/session_progress.md 2>/dev/null | grep -oP "(?<=^### )[A-Z][-A-Z]*-[0-9]+" | tail -1)
fi
# AT不要判定: ミッション定義に「AT不要」「grep検証のみ」「テスト影響: なし」があればスキップ
# ※ AT不要フラグはADVのみがミッション定義に書く（ENGが追記することは禁止 — §16.5）
MISSION_BLOCK=$(sed -n "/### $LATEST_MISSION/,/^### /p" instructions/session_progress.md 2>/dev/null)
SKIP_G8G9=$(echo "$MISSION_BLOCK" | grep -cE "AT不要|grep検証のみ|テスト影響.*なし" || echo 0)
if [ -n "$LATEST_MISSION" ] && [ "$SKIP_G8G9" -eq 0 ] && [ -d "evidence/$LATEST_MISSION" ]; then
  if [ ! -f "evidence/$LATEST_MISSION/before.json" ]; then
    echo "FAIL: G8 missing before.json (RED) for $LATEST_MISSION"; FAIL=1
  fi
  if [ ! -f "evidence/$LATEST_MISSION/after.json" ]; then
    echo "FAIL: G8 missing after.json (GREEN) for $LATEST_MISSION"; FAIL=1
  fi
  # before.jsonにunexpected>0がなければREDが確認できていない
  if [ -f "evidence/$LATEST_MISSION/before.json" ]; then
    UNEXPECTED=$(jq '.stats.unexpected // 0' "evidence/$LATEST_MISSION/before.json" 2>/dev/null || echo 0)
    if [ "$UNEXPECTED" -eq 0 ]; then
      echo "FAIL: G8 before.json shows 0 unexpected — RED not confirmed for $LATEST_MISSION"; FAIL=1
    fi
  fi
  # after.jsonのunexpected==0（GREEN）を検証
  if [ -f "evidence/$LATEST_MISSION/after.json" ]; then
    UNEXPECTED_AFTER=$(jq '.stats.unexpected // -1' "evidence/$LATEST_MISSION/after.json" 2>/dev/null || echo -1)
    if [ "$UNEXPECTED_AFTER" -ne 0 ]; then
      echo "FAIL: G8 after.json has $UNEXPECTED_AFTER unexpected — GREEN not confirmed for $LATEST_MISSION"; FAIL=1
    fi
  fi
fi

# --- G9: スクショ証跡チェック（AT不要ミッションはスキップ） ---
if [ -n "$LATEST_MISSION" ] && [ "$SKIP_G8G9" -eq 0 ] && [ -d "evidence/$LATEST_MISSION" ]; then
  bash scripts/screenshot_lint.sh "$LATEST_MISSION" || FAIL=1
fi

# --- テストアンチパターン ---
if [ -f "scripts/test_lint.sh" ]; then
  bash scripts/test_lint.sh || FAIL=1
fi

# --- テストガード許容リスト件数（上限15件） ---
GUARD_CFG="tests/e2e/helpers/test-guards.config.ts"
if [ -f "$GUARD_CFG" ]; then
  GUARD_COUNT=$(grep -c "^[[:space:]]*['\"]" "$GUARD_CFG" 2>/dev/null || echo 0)
  if [ "$GUARD_COUNT" -gt 15 ]; then
    echo "FAIL: test-guards.config.ts has $GUARD_COUNT entries (max 15)"; FAIL=1
  fi
fi

# --- session_progress.md行数（300行以下） ---
SP_LINES=$(wc -l < instructions/session_progress.md 2>/dev/null || echo 0)
if [ "$SP_LINES" -gt 300 ]; then
  echo "FAIL: session_progress.md is $SP_LINES lines (max 300)"; FAIL=1
fi

# --- development_rules.md行数（ソフトリミット150行） ---
DR_LINES=$(wc -l < development_rules.md 2>/dev/null || echo 0)
if [ "$DR_LINES" -gt 150 ]; then
  echo "WARN: development_rules.md is $DR_LINES lines (soft limit 150)"
fi

# --- canopy_app.sh最小行数 ---
APP_LINES=$(grep -v "^#\|^$" tests/smoke/canopy_app.sh 2>/dev/null | wc -l)
if [ "$APP_LINES" -lt 5 ]; then
  echo "FAIL: canopy_app.sh has only $APP_LINES active lines (min 5)"; FAIL=1
fi

# --- ルーティング比率合計100チェック ---
if command -v yq &>/dev/null && [ -f "app_config.yaml" ]; then
  ROUTING_ENABLED=$(yq e '.routing.enabled // false' app_config.yaml)
  if [ "$ROUTING_ENABLED" = "true" ]; then
    RATIO_SUM=$(yq e '[.routing.models[].ratio] | add' app_config.yaml 2>/dev/null || echo 0)
    if [ "$RATIO_SUM" -ne 100 ]; then
      echo "FAIL: routing ratio sum=$RATIO_SUM (expected 100)"; FAIL=1
    fi
  fi
fi

# --- metrics.jsonl当日分存在チェック ---
TODAY=$(date '+%Y-%m-%d')
if [ -f "instructions/results/metrics.jsonl" ]; then
  if ! grep -q "\"$TODAY\"" instructions/results/metrics.jsonl; then
    echo "WARN: No metrics entry for today ($TODAY)"
  fi
fi

# --- G7: ミッション定義形式検証（mission_linter.sh） ---
if [ -f "scripts/mission_linter.sh" ]; then
  bash scripts/mission_linter.sh || FAIL=1
fi

# --- 対象ファイル外変更検知（changed-files-allowlist.sh） ---
if [ -f "scripts/changed-files-allowlist.sh" ]; then
  bash scripts/changed-files-allowlist.sh || FAIL=1
fi

# --- AIレビュー品質ゲート（review_gate.sh） ---
if [ -f "scripts/review_gate.sh" ]; then
  bash scripts/review_gate.sh || FAIL=1
fi
```

#### 2.6.1 v3.4 新規関数（PD-109 STATUS 5状態モデル実装、既存ベタ書き末尾に追加）

R2.2 §2.6 φcrit / §2.26 STATUScrit / PATCH-12 を根拠とする5関数。既存 G1-G10 ベタ書きは**温存**し、末尾に関数定義を追加する。

```sh
# --- 共通ヘルパー: ミッションブロック取得（R3-CRIT-B 準拠、SSOT 委譲）---
get_current_mission_block() {
  PROGRESS="${1:-instructions/session_progress.md}"
  MID=$(PROGRESS="$PROGRESS" scripts/resolve_target_mission.sh canopy 2>/dev/null) || return 0
  if [ -n "$MID" ]; then
    TMP="/tmp/mission_${MID}.md"
    scripts/extract_mission_block.sh "$MID" "$PROGRESS" > "$TMP"
    export LATEST_MISSION_ID="$MID"
    export LATEST_MISSION_FILE="$TMP"
  fi
}

# --- check_test_pass: cmd-unit AND cmd-e2e PASS 判定 + STATUS 自動遷移 ---
check_test_pass() {
  MID="${LATEST_MISSION_ID:-}"
  [ -n "$MID" ] || { echo "FAIL: check_test_pass: LATEST_MISSION_ID not set"; return 1; }

  BEFORE_UNIT="evidence/$MID/before-unit.json"
  AFTER_UNIT="evidence/$MID/after-unit.json"
  BEFORE_E2E="evidence/$MID/before-e2e.json"
  AFTER_E2E="evidence/$MID/after-e2e.json"

  UNIT_NA=$(grep -E '^[[:space:]]*cmd-unit:[[:space:]]*N/A' "$LATEST_MISSION_FILE" 2>/dev/null | head -1)
  E2E_NA=$(grep -E '^[[:space:]]*cmd-e2e:[[:space:]]*N/A' "$LATEST_MISSION_FILE" 2>/dev/null | head -1)

  UNIT_RED_GREEN=0
  if [ -f "$BEFORE_UNIT" ] && [ -f "$AFTER_UNIT" ]; then
    UBF=$(jq '.stats.unexpected // .results.failed // 0' "$BEFORE_UNIT" 2>/dev/null || echo 0)
    UAF=$(jq '.stats.unexpected // .results.failed // -1' "$AFTER_UNIT" 2>/dev/null || echo -1)
    if [ "$UBF" -gt 0 ] && [ "$UAF" = "0" ]; then UNIT_RED_GREEN=1; fi
  fi
  E2E_RED_GREEN=0
  if [ -f "$BEFORE_E2E" ] && [ -f "$AFTER_E2E" ]; then
    EBF=$(jq '.stats.unexpected // .results.failed // 0' "$BEFORE_E2E" 2>/dev/null || echo 0)
    EAF=$(jq '.stats.unexpected // .results.failed // -1' "$AFTER_E2E" 2>/dev/null || echo -1)
    if [ "$EBF" -gt 0 ] && [ "$EAF" = "0" ]; then E2E_RED_GREEN=1; fi
  fi

  UNIT_OK=0; E2E_OK=0
  [ -n "$UNIT_NA" ] && UNIT_OK=1
  [ -n "$E2E_NA" ] && E2E_OK=1
  [ -f "$AFTER_UNIT" ] && [ "$(jq '.stats.unexpected // .results.failed // -1' "$AFTER_UNIT" 2>/dev/null || echo -1)" = "0" ] && UNIT_OK=1
  [ -f "$AFTER_E2E" ] && [ "$(jq '.stats.unexpected // .results.failed // -1' "$AFTER_E2E" 2>/dev/null || echo -1)" = "0" ] && E2E_OK=1

  REAL_TDD=$((UNIT_RED_GREEN + E2E_RED_GREEN))

  if [ "$UNIT_OK" = 1 ] && [ "$E2E_OK" = 1 ] && [ "$REAL_TDD" -ge 1 ]; then
    if grep -qE '^- \*\*no_deploy:\*\*[[:space:]]*true' "$LATEST_MISSION_FILE" 2>/dev/null; then
      update_status "$MID" "DONE"
    else
      update_status "$MID" "READY_FOR_DEPLOY"
    fi
    return 0
  fi
  return 1
}

# --- update_status: STATUS の awk 書換え（§3.2 SSOT 準拠）---
update_status() {
  MID="$1"
  NEW_STATUS="$2"
  PROGRESS="${3:-instructions/session_progress.md}"

  awk -v mid="$MID" -v newst="$NEW_STATUS" '
    $0 ~ "^### " mid ":" { in_block = 1; print; next }
    in_block && /^### [A-Z][A-Z0-9_-]*:/ { in_block = 0 }
    in_block && /^- \*\*STATUS:\*\*/ {
      print "- **STATUS:** " newst
      next
    }
    { print }
  ' "$PROGRESS" > "${PROGRESS}.tmp" && mv "${PROGRESS}.tmp" "$PROGRESS"
}

# --- correct_status: ADV/PO による誤判定巻き戻し（STATUS_CORRECTION、PATCH-12/R3-H-07）---
# ENG 自律呼出し禁止。instructions/status_corrections.log に全履歴記録
correct_status() {
  MID="$1"
  FROM="$2"
  TO="$3"
  REASON="$4"
  CALLER_ROLE="${5:-ADV}"
  PROGRESS="${6:-instructions/session_progress.md}"

  case "$CALLER_ROLE" in
    ADV|PO) ;;
    *) echo "FAIL: correct_status は ADV/PO 限定（caller=$CALLER_ROLE）" >&2; return 1 ;;
  esac

  CURRENT=$(awk -v mid="$MID" '
    $0 ~ "^### " mid ":" { in_block=1; next }
    in_block && /^### [A-Z][A-Z0-9_-]*:/ { in_block=0 }
    in_block && /^- \*\*STATUS:\*\*/ { sub(/^- \*\*STATUS:\*\*[[:space:]]*/,""); print; exit }
  ' "$PROGRESS")
  if [ "$CURRENT" != "$FROM" ]; then
    echo "FAIL: correct_status precondition: current=$CURRENT, expected FROM=$FROM" >&2
    return 1
  fi

  # 区切り文字は ":" 固定（`->` は shell の case で stdout リダイレクト誤解釈、PART3 PATCH-21 副次訂正）
  case "${FROM}:${TO}" in
    DONE:READY_FOR_DEPLOY|DONE:IN_PROGRESS|READY_FOR_DEPLOY:IN_PROGRESS|IN_PROGRESS:QUEUED) ;;
    *) echo "FAIL: correct_status 不許可遷移: $FROM -> $TO（PD-109 拡張表参照）" >&2; return 1 ;;
  esac

  update_status "$MID" "$TO" "$PROGRESS"

  mkdir -p instructions
  LOG="instructions/status_corrections.log"
  DATE_ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$DATE_ISO" "$MID" "$FROM" "$TO" "$CALLER_ROLE" "$SHA" "$REASON" >> "$LOG"
  echo "OK: correct_status $MID: $FROM -> $TO by $CALLER_ROLE"
}

# --- check_blocked_integrity: BLOCKED 例外規定の検証 ---
check_blocked_integrity() {
  PROGRESS="${1:-instructions/session_progress.md}"
  awk '
    /^### [A-Z][A-Z0-9_-]*:/ { mid = $0 }
    /^- \*\*STATUS:\*\*[[:space:]]*BLOCKED/ { in_blocked = 1; has_reason = 0; next }
    in_blocked && /^- \*\*BLOCKED 理由:\*\*/ { has_reason = 1 }
    in_blocked && /^### [A-Z][A-Z0-9_-]*:/ {
      if (!has_reason) print "FAIL: BLOCKED without reason: " mid
      in_blocked = 0
    }
    END {
      if (in_blocked && !has_reason) print "FAIL: BLOCKED without reason: " mid
    }
  ' "$PROGRESS"
}
```

**canopy.sh 末尾での呼出し順（既存 G1-G10 の後に追加）:**
```sh
get_current_mission_block
if [ -n "${LATEST_MISSION_ID:-}" ]; then
  check_test_pass || true
  check_blocked_integrity | grep -q '^FAIL:' && FAIL=1 || true
fi
```

**関数間依存:**
- `get_current_mission_block` は `scripts/resolve_target_mission.sh` と `scripts/extract_mission_block.sh` を前提（§3.1 SSOT）
- `check_test_pass` は `update_status` を内部呼出し（順方向のみ）
- `correct_status` は `update_status` を内部呼出し（逆方向、caller_role=ADV/PO 限定）
- `check_blocked_integrity` は独立

### 2.7 version_sync.sh（新設）

```bash
#!/bin/bash
set -euo pipefail
# app_config.yaml → package.json, version.ts, CLAUDE.md に自動反映
APP_DIR=${1:-.}

if ! command -v yq &>/dev/null; then echo "ERROR: yq not installed"; exit 1; fi

VER=$(yq e '.app.version' "$APP_DIR/app_config.yaml")
echo "Syncing version: $VER"

# package.json
if [ -f "$APP_DIR/package.json" ]; then
  node -e "const fs=require('fs'),path=require('path');const f=path.resolve('$APP_DIR','package.json');const p=JSON.parse(fs.readFileSync(f,'utf8'));p.version='$VER';fs.writeFileSync(f,JSON.stringify(p,null,2)+'\n')"
fi

# version.ts
VERSION_TS=$(yq e '.app.version_file // "frontend/src/version.ts"' "$APP_DIR/app_config.yaml")
if [ -f "$APP_DIR/$VERSION_TS" ]; then
  sed -i.bak "s/['\"][0-9.]*['\"]/'$VER'/" "$APP_DIR/$VERSION_TS" && rm -f "$APP_DIR/$VERSION_TS.bak"
fi

# CLAUDE.md（**Version:** vX.Y.Z パターンのみ置換 — 他のバージョン文字列を壊さない）
if [ -f "$APP_DIR/CLAUDE.md" ]; then
  sed -i.bak "s/\*\*Version:\*\* v[0-9]\+\.[0-9]\+\.[0-9]\+/**Version:** v$VER/" "$APP_DIR/CLAUDE.md" && rm -f "$APP_DIR/CLAUDE.md.bak"
fi

echo "✅ Version synced to $VER"
```

### 2.8 deploy.sh（v3.4 ρcrit 12Step 完全版、PATCH-19 準拠）

**前提**: C2 フローで bump-version → build → canopy が完了していること。deploy.sh 単独実行は禁止（C2 フローの一部として実行）。

**引数仕様**: `$1=ENV (prod|staging|dev)`, `$2=APP_DIR (default .)`。MISSION_ID は環境変数または session_progress.md 自動検出（§3.1 SSOT）。

**12Step 対応表（R2.2 §2.16 ηcrit' 1:1 対応）:**

| Step | 内容 | ゲート | 失敗時 |
|---|---|---|---|
| Step 0 | MISSION_ID 解決 + extract_mission_block + STATUS 検証 | §3.1 / §3.2 | exit 1 |
| Step 1 | version_sync + bump commit + eval BUILD_CMD | G1 | exit 1 |
| Step 2 | canopy.sh（既存 G1-G10 + 新 check_test_pass）| G4 | exit 1 |
| Step 3 | G8 TDD 証跡検証（canopy 内）| G8 | exit 1 |
| Step 4 | G16 deploy_hash_verify.sh | G16 | exit 1 |
| Step 5 | Hフロー承認ゲート（二重証跡、PATCH-14）| σcrit/PD-110 | exit 1 |
| Step 6 | L1 スモーク（mission cmd-e2e SSOT 連携、PATCH-11）| G4 | exit 1 |
| Step 7 | L2 影響範囲（affected-tests.sh + mission cmd-unit SSOT）| G8 | exit 1 |
| Step 8 | デプロイ実行（frontend_cmd / backend_cmd）| — | append_deploy_fail + exit 1 |
| Step 9 | deploy_poll_hash.sh（URL hash 検証）| G16 | append_deploy_fail + exit 1 |
| Step 10 | G17 realworld（高リスクのみ）| G17 | append_deploy_fail + exit 1 |
| Step 11 | STATUS → DONE 書換え（§3.2 SSOT）| — | — |
| Step 12 | logs/deploy.log 追記 + STRIKE クリア + git tag | — | — |

```sh
#!/bin/sh
# scripts/deploy.sh — dev-system v3.4 ρcrit 12Step 完全版
# 引数仕様: $1=ENV (prod|staging|dev), $2=APP_DIR (default .)
# MISSION_ID は環境変数 or session_progress.md 自動検出（§3.1 SSOT）
# sub_infrastructure §2.8 の既存 ENV/APP_DIR 引数規約・rollback.sh 呼出し互換を保持
# POSIX sh 互換（§3.7）

set -eu
ENV="${1:-prod}"
APP_DIR="${2:-.}"

# Runtime 依存 preflight（§3.7 SSOT、PATCH-15 / R3-H-10）。個別 command -v 散在は禁止
. "$(cd "$(dirname "$0")" && pwd)/lib/runtime_preflight.sh"
require_dev_system_runtimes || exit 1
cd "$APP_DIR"

# --- Step 0: MISSION_ID 解決 + ブロック切り出し + STATUS 検証（§3.1 + §3.2 SSOT）---
if [ -z "${MISSION_ID:-}" ]; then
  MISSION_ID=$(scripts/resolve_target_mission.sh deploy)
fi
[ -n "$MISSION_ID" ] || { echo "ERROR: MISSION_ID not resolved (deploy context)" >&2; exit 1; }
export MISSION_ID
MISSION_BLOCK="/tmp/mission_${MISSION_ID}.md"
scripts/extract_mission_block.sh "$MISSION_ID" > "$MISSION_BLOCK"
export LATEST_MISSION_FILE="$MISSION_BLOCK"

STATUS=$(grep -E '^- \*\*STATUS:\*\*' "$MISSION_BLOCK" | head -1 | sed -E 's/.*STATUS:\*\*[[:space:]]*//')
MISSION_RISK=$(scripts/mission_risk_classifier.sh "$MISSION_BLOCK" 2>/dev/null || echo "low")
if [ "$MISSION_RISK" = "high" ] && [ "$STATUS" != "READY_FOR_DEPLOY" ]; then
  echo "FAIL: high-risk mission $MISSION_ID STATUS='$STATUS' (expected READY_FOR_DEPLOY)" >&2
  exit 1
fi

# 直近 1h 以内の STATUS_CORRECTION を通知（PATCH-12 / R3-H-07）
if [ -f instructions/status_corrections.log ]; then
  NOW_EPOCH=$(date -u +%s)
  RECENT=$(awk -v mid="$MISSION_ID" -v now="$NOW_EPOCH" '
    {
      iso=$1; cmd="date -j -u -f \"%Y-%m-%dT%H:%M:%SZ\" \"" iso "\" +%s 2>/dev/null || date -u -d \"" iso "\" +%s 2>/dev/null"
      cmd | getline epoch; close(cmd)
      if ($2 == mid && epoch+0 > 0 && (now - epoch) <= 3600) print
    }
  ' instructions/status_corrections.log)
  [ -n "$RECENT" ] && echo "NOTICE: 直近 1h 以内の STATUS_CORRECTION 検出: $RECENT" >&2
fi

# --- 設定読取（既存 §2.8 同等、ENV/APP_DIR 規約保持）---
BUILD_CMD=$(yq e '.build.cmd // "npx vite build"' app_config.yaml)
BUILD_OUT=$(yq e '.build.out_dir // "dist"' app_config.yaml)
DEPLOY_URL=$(yq e ".env.${ENV}.url // \"\"" app_config.yaml)
GLOBAL_FRONTEND=$(yq e '.deploy.frontend_cmd // ""' app_config.yaml)
GLOBAL_BACKEND=$(yq e '.deploy.backend_cmd // ""' app_config.yaml)
ENV_FRONTEND=$(yq e ".env.${ENV}.frontend_cmd // \"\"" app_config.yaml)
ENV_BACKEND=$(yq e ".env.${ENV}.backend_cmd // \"\"" app_config.yaml)
FRONTEND_CMD="$GLOBAL_FRONTEND"; [ -n "$ENV_FRONTEND" ] && FRONTEND_CMD="$ENV_FRONTEND"
BACKEND_CMD="$GLOBAL_BACKEND"; [ -n "$ENV_BACKEND" ] && BACKEND_CMD="$ENV_BACKEND"
FRONTEND_CMD=$(printf '%s\n' "$FRONTEND_CMD" | sed "s|\\\${build\\.out_dir}|$BUILD_OUT|g")

mkdir -p logs
echo "=== C2 DEPLOY ($ENV) mission=$MISSION_ID risk=$MISSION_RISK ==="

# --- Step 1: BUILD ---
bash scripts/version_sync.sh .
VER=$(yq e '.app.version' app_config.yaml)
git add -A && { git diff --cached --quiet || git commit -m "chore: bump version to $VER"; }
eval "$BUILD_CMD"

# --- Step 2: canopy（既存 G1-G10 + v3.4 新規関数 check_test_pass 等）---
bash tests/smoke/canopy.sh

# --- Step 3: G8 TDD証跡検証（canopy 内 check_test_pass で完結、§3.3 SSOT）---

# --- Step 4: G16 デプロイ hash 埋込検証（§2.7 χcrit）---
bash scripts/deploy_hash_verify.sh "$BUILD_OUT"

# --- Step 5: Hフロー承認ゲート（二重証跡、§3.5 SSOT / PD-110 / PATCH-14）---
HFLOW_ENABLED=$(yq e '.hflow.enabled // true' app_config.yaml)
MANDATORY_HIT=$(yq e '.hflow.mandatory_paths[]' app_config.yaml 2>/dev/null | while read -r p; do
  [ -n "$p" ] && git diff --name-only HEAD~1 2>/dev/null | grep -qF "$p" && echo "HIT"
done | head -1)
if [ "$HFLOW_ENABLED" = "true" ] || [ -n "$MANDATORY_HIT" ]; then
  HFLOW_CONTEXT=deploy scripts/hflow_trigger_check.sh > /tmp/hflow.txt
  if grep -q 'HFLOW_TRIGGER=1' /tmp/hflow.txt; then
    APPROVAL="instructions/approvals/${MISSION_ID}.hflow.approved"
    if [ ! -f "$APPROVAL" ]; then
      echo "FAIL: Hフロー発火。承認ファイル未作成: $APPROVAL" >&2
      [ -n "$MANDATORY_HIT" ] && echo "FAIL: mandatory_paths 変更のため opt-out 不可" >&2
      exit 1
    fi
    bash scripts/verify_approval_authenticity.sh "$MISSION_ID" "$APPROVAL" || exit 1
  fi
else
  HFLOW_CONTEXT=deploy scripts/hflow_trigger_check.sh > /tmp/hflow.txt
  if grep -q 'HFLOW_TRIGGER=1' /tmp/hflow.txt; then
    echo "WARN: Hフロー発火検出（opt-out 設定のためスキップ、mandatory_paths 非該当）" >&2
  fi
fi

# --- Step 6: L1 スモーク（mission cmd-e2e SSOT、PATCH-11 / R3-H-05）---
CMD_E2E=$(scripts/extract_cmd.sh "$MISSION_BLOCK" cmd-e2e)
case "$CMD_E2E" in
  "")
    echo "FAIL: cmd-e2e not defined in mission block (§3.4 SSOT violation)" >&2; exit 1 ;;
  N/A*|SKIP*)
    echo "INFO: Step 6 skipped (cmd-e2e = $CMD_E2E, validated by check_test_pass)" ;;
  *)
    case "$CMD_E2E" in
      *"--grep"*|*"@smoke"*) eval "$CMD_E2E" ;;
      *) eval "$CMD_E2E --grep '@smoke'" ;;
    esac
    ;;
esac

# --- Step 7: L2 影響範囲（affected-tests.sh + mission cmd-unit SSOT、PATCH-11）---
CMD_UNIT=$(scripts/extract_cmd.sh "$MISSION_BLOCK" cmd-unit)
case "$CMD_UNIT" in
  "")
    echo "FAIL: cmd-unit not defined in mission block (§3.4 SSOT violation)" >&2; exit 1 ;;
  N/A*|SKIP*)
    echo "INFO: Step 7 cmd-unit skipped ($CMD_UNIT), affected-tests.sh のみ実行" ;;
esac
MISSION_CMD_UNIT="$CMD_UNIT" MISSION_CMD_E2E="$CMD_E2E" bash scripts/affected-tests.sh

# --- Step 8: デプロイ実行（POSIX sh で exit status 保証、§3.7 POSIX 規約）---
DEPLOY_EXIT=0
if [ -n "$FRONTEND_CMD" ]; then eval "$FRONTEND_CMD" >>logs/deploy_stdout.log 2>&1 || DEPLOY_EXIT=$?; fi
if [ -n "$BACKEND_CMD" ] && [ "$DEPLOY_EXIT" = 0 ]; then eval "$BACKEND_CMD" >>logs/deploy_stdout.log 2>&1 || DEPLOY_EXIT=$?; fi
if [ "$DEPLOY_EXIT" -ne 0 ]; then
  scripts/append_deploy_fail.sh "$MISSION_ID" "$(tail -30 logs/deploy_stdout.log)"
  exit 1
fi

# --- Step 9: hash ポーリング（§2.7 χcrit + deploy_poll_hash.sh）---
if [ -n "$DEPLOY_URL" ]; then
  scripts/deploy_poll_hash.sh "$DEPLOY_URL" "$(git rev-parse HEAD)" || {
    scripts/append_deploy_fail.sh "$MISSION_ID" "hash poll failed"; exit 1;
  }
fi

# --- Step 10: G17 realworld（高リスクのみ、§2.7 χcrit）---
if [ "$MISSION_RISK" = "high" ]; then
  mkdir -p "evidence/$MISSION_ID/realworld-screenshots"
  MISSION_ID="$MISSION_ID" REALWORLD_URL="$DEPLOY_URL" \
    npx playwright test --config=playwright.realworld.config.ts || {
    scripts/append_deploy_fail.sh "$MISSION_ID" "realworld L1 failed"; exit 1;
  }
  bash scripts/normalize_realworld_report.sh "$MISSION_ID"
  bash scripts/realworld_proof_check.sh "$MISSION_ID" || {
    scripts/append_deploy_fail.sh "$MISSION_ID" "G17 failed"; exit 1;
  }
fi

# --- Step 11: STATUS → DONE（§3.2 SSOT、R2.2 §2.13 δcrit' awk ロジック）---
PROGRESS=instructions/session_progress.md
awk -v mid="$MISSION_ID" '
  $0 ~ "^### " mid ":" { in_block=1; print; next }
  in_block && /^### [A-Z][A-Z0-9_-]*:/ { in_block=0 }
  in_block && /^- \*\*STATUS:\*\*/ { sub(/READY_FOR_DEPLOY/, "DONE") }
  { print }
' "$PROGRESS" > "${PROGRESS}.tmp" && mv "${PROGRESS}.tmp" "$PROGRESS"

# --- Step 12: logs/deploy.log 追記 + STRIKE クリア + git tag ---
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) DEPLOY-OK $MISSION_ID sha=$(git rev-parse --short HEAD)" >> logs/deploy.log
if [ -f instructions/deploy_strikes.json ]; then
  python3 -c "import json,sys; p='instructions/deploy_strikes.json'; d=json.load(open(p)); d.pop('$MISSION_ID',None); json.dump(d,open(p,'w'),indent=2)" 2>/dev/null || true
fi

git tag "v$VER" 2>/dev/null || true
echo "=== C2 DEPLOY COMPLETE ($ENV) mission=$MISSION_ID v$VER ==="
```

**他クラスター整合（R2.2 §2.2 ρcrit 再掲）:**
- §2.3 σcrit: Hフロー承認ゲート（Step 5）+ 二重証跡（PATCH-14）
- §2.5 υcrit: MISSION_ID 解決 + ブロック切り出し（Step 0）→ §3.1 SSOT
- §2.6 φcrit + §2.26 STATUScrit: STATUS 検証 + STATUS → DONE（Step 11）→ §3.2 SSOT
- §2.7 χcrit: G16 deploy_hash_verify.sh（Step 4）+ G17 normalize+proof_check（Step 10）
- §2.16 ηcrit': deploy.sh を唯一の pre-deploy オーケストレータとして Step 1-12 を 1:1 対応
- 既存 sub_infrastructure §2.8 の ENV/APP_DIR 引数規約・rollback.sh 呼出し互換を完全保持

### 2.9 rollback.sh（新設）

```bash
#!/bin/bash
set -euo pipefail

# 直近タグへロールバック（revert commit方式 — clean state保証）
CURRENT_BRANCH=$(git branch --show-current)
LAST_TAG=$(git describe --tags --abbrev=0 "$(git rev-list --tags -n 1)" 2>/dev/null)
if [ -z "$LAST_TAG" ]; then echo "ERROR: No previous tag found"; exit 1; fi

CURRENT_TAG=$(git describe --tags --abbrev=0 HEAD 2>/dev/null || echo "none")
echo "Rolling back: $CURRENT_TAG → $LAST_TAG (branch: $CURRENT_BRANCH)"

# 最終タグ以降の全コミットをrevert（mixed stateを避ける。新→旧順でrevert）
COMMITS_TO_REVERT=$(git rev-list "$LAST_TAG..HEAD")
if [ -z "$COMMITS_TO_REVERT" ]; then echo "ERROR: No commits to revert"; exit 1; fi
if ! git revert --no-edit --no-commit $COMMITS_TO_REVERT; then
  echo "ERROR: Revert conflict detected. Aborting rollback."
  git revert --abort 2>/dev/null || true
  echo "Manual resolution required: git revert $LAST_TAG..HEAD"
  exit 1
fi
git commit -m "Rollback to $LAST_TAG (revert all commits since tag)"

# バージョンをロールバック先タグに合わせる
if ! command -v yq &>/dev/null; then echo "ERROR: yq not installed (required for version sync)"; exit 1; fi
TAG_VER=$(echo "$LAST_TAG" | sed 's/^v//')
yq e ".app.version = \"$TAG_VER\"" -i app_config.yaml
bash scripts/version_sync.sh .
git add -A && git commit --amend --no-edit

# 再デプロイ
bash scripts/deploy.sh prod .

echo "✅ Rolled back to $LAST_TAG (v$TAG_VER) via revert commit"
```

### 2.10 report_lint.sh（新設 — G5自動化）

```bash
#!/bin/bash
set -euo pipefail
# 完了報告から禁止語12語を検出（アクティブなsession_progress.mdを対象）
FAIL=0
TARGET="${1:-instructions/session_progress.md}"

if [ ! -f "$TARGET" ]; then exit 0; fi

BANNED="確認した|表示されている|正常に動作|問題なし|対応済み|修正済み|実装済み|開いている|閉じている|存在する|反映されている|変化した"
COUNT=$(grep -cE "$BANNED" "$TARGET" 2>/dev/null || echo 0)
if [ "$COUNT" -gt 0 ]; then
  echo "FAIL: G5 report contains $COUNT banned phrases"
  grep -nE "$BANNED" "$TARGET"; FAIL=1
fi
exit $FAIL
```

### 2.11 screenshot_lint.sh（新設 — G9証跡検証）

```bash
#!/bin/bash
set -euo pipefail
# evidence/MISSION-ID/ にbefore/afterスクショが存在するか検証
MISSION_ID=${1:-}
FAIL=0

if [ -z "$MISSION_ID" ]; then
  echo "Usage: screenshot_lint.sh MISSION-ID"; exit 1
fi

DIR="evidence/$MISSION_ID"
if [ ! -d "$DIR" ]; then
  echo "FAIL: evidence/$MISSION_ID/ not found"; exit 1
fi

BEFORE=$(ls "$DIR"/before_*.png 2>/dev/null | wc -l)
AFTER=$(ls "$DIR"/after_*.png 2>/dev/null | wc -l)

if [ "$BEFORE" -eq 0 ]; then echo "FAIL: No before screenshots"; FAIL=1; fi
if [ "$AFTER" -eq 0 ]; then echo "FAIL: No after screenshots"; FAIL=1; fi

# before/afterが同一ファイル（バイナリ一致）ならFAIL
for AFTER_FILE in "$DIR"/after_*.png; do
  BASE=$(basename "$AFTER_FILE" | sed 's/after_/before_/')
  BEFORE_FILE="$DIR/$BASE"
  if [ -f "$BEFORE_FILE" ] && cmp -s "$BEFORE_FILE" "$AFTER_FILE"; then
    echo "FAIL: $BEFORE_FILE and $AFTER_FILE are identical"; FAIL=1
  fi
done

exit $FAIL
```

### 2.12 max_lines_lint.sh（新設 — 300行制限自動検証）

```bash
#!/bin/bash
set -euo pipefail
# コンポーネントの行数上限チェック
MAX=${1:-300}
TARGET_DIR=${2:-"frontend/components"}
FAIL=0

if [ ! -d "$TARGET_DIR" ]; then exit 0; fi

for FILE in "$TARGET_DIR"/*.{jsx,tsx,js,ts} 2>/dev/null; do
  [ -f "$FILE" ] || continue
  LINES=$(wc -l < "$FILE")
  if [ "$LINES" -gt "$MAX" ]; then
    echo "FAIL: $FILE is $LINES lines (max $MAX)"; FAIL=1
  fi
done
exit $FAIL
```

### 2.13 changed-files-allowlist.sh（新設 — 対象ファイル外変更検知）

```bash
#!/bin/bash
set -euo pipefail
# ミッション定義の「対象ファイル」以外の変更を検知
SP="${1:-instructions/session_progress.md}"
FAIL=0

# 現在のミッション（IN_PROGRESS）から対象ファイルを抽出
CURRENT_MISSION=$(grep -B1 "STATUS: IN_PROGRESS" "$SP" 2>/dev/null | grep -oP "(?<=### )[A-Z][-A-Z]*-[0-9]+" | head -1)
if [ -z "$CURRENT_MISSION" ]; then
  echo "WARN: No IN_PROGRESS mission found"; exit 0
fi
MISSION_BLOCK=$(sed -n "/### $CURRENT_MISSION/,/^### /p" "$SP" 2>/dev/null)
ALLOWED=$(echo "$MISSION_BLOCK" | grep "対象ファイル:" | sed 's/.*対象ファイル:[[:space:]]*//' | tr ',' '\n' | sed 's/^[[:space:]]*//' | grep -v '^$')

if [ -z "$ALLOWED" ]; then
  echo "WARN: No target files defined in mission"; exit 0
fi

# git diffで変更されたファイル（ブランチ分岐点以降の変更を対象）
BASE=$(git merge-base origin/main HEAD 2>/dev/null || echo "HEAD~1")
CHANGED=$(git diff --name-only "$BASE"...HEAD 2>/dev/null || git diff --name-only HEAD~1 2>/dev/null)

for FILE in $CHANGED; do
  MATCH=0
  for PATTERN in $ALLOWED; do
    if echo "$FILE" | grep -q "$PATTERN"; then MATCH=1; break; fi
  done
  # テスト・ドキュメント・evidence は常に許可
  echo "$FILE" | grep -qE "^tests/|^docs/|^instructions/|^evidence/" && MATCH=1
  if [ "$MATCH" -eq 0 ]; then
    echo "FAIL: $FILE is not in allowed target files"; FAIL=1
  fi
done
exit $FAIL
```

### 2.14 review_gate.sh（新設 — AIレビュー品質ゲート）

```bash
#!/bin/bash
set -euo pipefail
# docs/plans/review_*.json からCRITICAL件数をスキャン

# python3必須チェック（未インストール時にゲートをバイパスさせない）
if ! command -v python3 &>/dev/null; then
  echo "FAIL: python3 is required for review_gate.sh"; exit 1
fi

FAIL=0
TOTAL_CRITICAL=0

for FILE in docs/plans/review_*.json; do
  [ -f "$FILE" ] || continue
  COUNT=$(python3 -c "import json;d=json.load(open('$FILE'));print(sum(1 for i in d if i.get('severity')=='CRITICAL' and not i.get('dismissed')))")
  TOTAL_CRITICAL=$((TOTAL_CRITICAL + COUNT))
done

if [ "$TOTAL_CRITICAL" -gt 0 ]; then
  echo "FAIL: $TOTAL_CRITICAL unresolved CRITICAL issues in review files"; FAIL=1
fi
exit $FAIL
```

---

## 3. app_config_template.yaml

```yaml
app:
  name: "APP_NAME"
  version: "0.0.1"
  version_file: "frontend/src/version.ts"   # version_sync.shが参照
  repo: "https://github.com/user/repo"

infrastructure:
  frontend: "cloudflare-pages"
  backend: "cloudflare-workers"
  database: "supabase"
  payments: "none"

build:
  out_dir: "dist"
  cmd: "npx vite build"

deploy:
  provider: "cloudflare"
  frontend_cmd: "npx wrangler pages deploy ${build.out_dir}"
  backend_cmd: "npx wrangler deploy"

env:
  dev:
    url: "http://localhost:8787"
  staging:
    url: "https://staging.example.com"
    frontend_cmd: "npx wrangler pages deploy ${build.out_dir} --branch=staging"
    backend_cmd: "npx wrangler deploy --env staging"
  prod:
    url: "https://example.com"

plans: []

routing:
  enabled: false
  # models:
  #   gpt-5: { ratio: 40, role: "catch-all" }
  #   claude-sonnet: { ratio: 15, role: "emotional-coaching" }
  #   gemini-flash: { ratio: 30, role: "search-facts" }
  #   gpt-5-simple: { ratio: 15, role: "short-replies" }
  # ※ ratioの合計は100であること（canopyで検証）

data_sources:
  plan_source_of_truth: "TOKEN_KV"
  plan_test_method: "wrangler kv:key put --binding=TOKEN_KV"
```

---

## 4. incident_runbook.md（新設）

配置: dev-system/docs/incident_runbook.md

```markdown
# インシデント対応ランブック

## 判断基準
- C2デプロイ後にL1 FAIL → 即rollback.sh実行
- 本番エラー率が通常の3倍以上 → rollback.sh + PO報告
- データ不整合 → デプロイ停止 + PO報告 + 手動調査

## ロールバック手順
1. `bash scripts/rollback.sh`
2. curl -s $URL | grep version でロールバック確認
3. session_progress.mdにインシデント記録

## 影響範囲確認
1. エラーログ確認（Cloudflare Dashboard / Supabase logs）
2. 影響ユーザー数の推定
3. データ破損の有無確認

## コミュニケーション
1. PO（ふとし）に即時報告
2. session_progress.mdにタイムライン記録
```
