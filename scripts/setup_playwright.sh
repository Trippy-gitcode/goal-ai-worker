#!/bin/bash
# Playwright セットアップ + ベースラインテスト一括実行
set -e
cd /Users/futoshi/Desktop/goal-ai-worker

echo "=== Step 1: 調査 ==="
echo "Node: $(node -v)"
echo "npm: $(npm -v)"
echo "package.json devDeps:"
cat package.json | grep -A5 devDependencies
echo ""
echo "node_modules/@playwright exists?"
ls -la node_modules/@playwright 2>/dev/null || echo "NOT FOUND"
echo ""

echo "=== Step 2: Playwrightインストール ==="
# package.jsonに入っているのにnode_modulesにないケースを強制解決
npm install @playwright/test --save-dev --install-strategy=nested 2>&1
echo ""
echo "After install:"
ls -la node_modules/@playwright 2>/dev/null || echo "STILL NOT FOUND - trying alternative"

# まだ無ければnpx経由でグローバルインストール
if [ ! -d "node_modules/@playwright/test" ]; then
  echo "Trying npm install with --legacy-peer-deps..."
  npm install @playwright/test --save-dev --legacy-peer-deps 2>&1
fi

if [ ! -d "node_modules/@playwright/test" ]; then
  echo "FATAL: Cannot install @playwright/test"
  echo "node_modules contents:"
  ls node_modules/ | head -20
  exit 1
fi

echo ""
echo "=== Step 3: Chromium確認 ==="
npx playwright install chromium 2>&1 | tail -3

echo ""
echo "=== Step 4: テスト実行 ==="
npx playwright test --project=mobile --reporter=list 2>&1

echo ""
echo "=== 完了 ==="
