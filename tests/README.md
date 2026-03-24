# GOAL AI — テスト実行ガイド

## セットアップ

```bash
# 環境変数の設定
cp tests/.env.test.example tests/.env.test
# → .env.test に実際の値を設定

# Playwright（E2E用）
npm install -D @playwright/test
npx playwright install chromium
```

## スモークテスト

```bash
# 全テスト一括実行
bash tests/smoke/run_all.sh

# 個別実行
bash tests/smoke/test_001_schema.sh
bash tests/smoke/test_005_grep.sh
```

## E2E テスト

```bash
npx playwright test
npx playwright test --ui  # UIモード
```

## テスト構成

```
tests/
├── .env.test.example    # 環境変数テンプレート
├── smoke/               # スモークテスト（bash+curl）
│   ├── run_all.sh       # 一括実行
│   ├── test_001〜005    # 各パートのテスト
├── e2e/                 # Playwrightテスト
│   ├── specs/           # テストスペック
│   └── fixtures/        # テスト用データ
└── helpers/             # 汎用ヘルパー
    ├── common.sh        # PASS/FAIL集計
    ├── api.sh           # curl+jq
    ├── supabase.sh      # DB操作
    └── stripe.sh        # Stripe CLI
```
