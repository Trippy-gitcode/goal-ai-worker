#!/bin/bash
# init_app.sh — 新規アプリプロジェクトの初期化
# Usage: ./init_app.sh <project-name> [--frontend=preact]

set -e

PROJECT_NAME="${1:?Usage: $0 <project-name> [--frontend=preact]}"
FRONTEND_FLAG="${2:-}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE_DIR="$SCRIPT_DIR/templates"

echo "Initializing project: $PROJECT_NAME"

# 1. ディレクトリ作成
mkdir -p "$PROJECT_NAME"/{docs,instructions/results,scripts,tests/e2e/specs,tests/e2e/helpers,tests/smoke}
cd "$PROJECT_NAME"

# 2. 基本テンプレートコピー
cp "$TEMPLATE_DIR/mission_template_v3.md" docs/
cp "$TEMPLATE_DIR/development_rules_template.md" development_rules.md
cp "$TEMPLATE_DIR/claude_ai_protocol_template.md" docs/
cp "$TEMPLATE_DIR/session_progress_template.md" instructions/session_progress.md 2>/dev/null || echo "# Session Progress" > instructions/session_progress.md

# 3. CLAUDE.md scaffold
cat > CLAUDE.md << 'CLAUDE_EOF'
# [PROJECT_NAME] — CLAUDE.md
> このファイルを読んだらsession_progress.mdのキューを上から自律実行

## 参照ドキュメント
- development_rules.md
- instructions/session_progress.md
- docs/mission_template_v3.md
- docs/claude_ai_protocol_template.md
CLAUDE_EOF
sed -i '' "s/PROJECT_NAME/$PROJECT_NAME/" CLAUDE.md 2>/dev/null || true

# 4. dev-system docs コピー
mkdir -p docs/dev-system
cp "$SCRIPT_DIR/docs/anti_patterns.md" docs/dev-system/ 2>/dev/null || true
cp "$SCRIPT_DIR/docs/architecture_decisions.md" docs/dev-system/ 2>/dev/null || true

# 5. Frontend (Preact) セットアップ
if [ "$FRONTEND_FLAG" = "--frontend=preact" ]; then
  echo "Setting up Preact frontend..."
  mkdir -p frontend/components frontend/js frontend/public
  cp "$TEMPLATE_DIR/frontend/package.json" .
  cp "$TEMPLATE_DIR/frontend/vite.config.js" .
  cp "$TEMPLATE_DIR/frontend/components/preact-bridge.js" frontend/components/
  cp "$TEMPLATE_DIR/frontend/components/SampleScreen.jsx" frontend/components/
  echo "Preact frontend scaffolded. Run 'npm install' to install dependencies."
fi

# 6. Git init
git init
echo "node_modules/" > .gitignore
echo "frontend-dist/" >> .gitignore
echo ".DS_Store" >> .gitignore

echo ""
echo "=== Project '$PROJECT_NAME' initialized ==="
echo "  Templates: development_rules.md, CLAUDE.md, session_progress"
echo "  Docs: anti_patterns.md, architecture_decisions.md"
[ "$FRONTEND_FLAG" = "--frontend=preact" ] && echo "  Frontend: Preact + Vite (run npm install)"
echo ""
echo "Next steps:"
echo "  1. Edit CLAUDE.md with project-specific instructions"
echo "  2. Edit development_rules.md with project-specific rules"
echo "  3. Start adding missions to session_progress.md"
