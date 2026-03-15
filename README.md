# GOAL AI — Cloudflare Worker

APIプロキシ ＋ テストトークン管理

## アーキテクチャ

```
[フロントエンド (Netlify)]
        │
        ▼  Bearer token
[Cloudflare Worker]
    ├── /api/chat          → Claude API (通常チャット)
    ├── /api/chat/stream   → Claude API (ストリーミング)
    ├── /api/deep/openai   → OpenAI API (ディープ分析)
    ├── /api/deep/gemini   → Gemini API (ディープ分析)
    ├── /api/deep/claude   → Claude API (ディープ分析統合)
    ├── /api/token/create  → テストトークン発行 (管理者)
    ├── /api/token/validate→ トークン検証
    ├── /api/token/redeem  → プロモコード適用
    └── /api/usage         → 使用量照会
```

## セットアップ

### 1. 依存インストール
```bash
npm install
```

### 2. KV Namespace 作成
```bash
npx wrangler kv namespace create TOKEN_KV
npx wrangler kv namespace create TOKEN_KV --preview
```
出力される id を wrangler.toml に貼り付け。

### 3. Secrets 設定
```bash
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put TOKEN_SECRET
```

### 4. ローカル開発
```bash
npm run dev
# → http://localhost:8787
```

### 5. デプロイ
```bash
npm run deploy              # デフォルト
npm run deploy:production   # 本番
```

## テストトークン発行

### CLI
```bash
node scripts/create-token.js --promo LAUNCH30
node scripts/create-token.js --plan trial --days 14 --note "テスター山田"
```

### API
```bash
curl -X POST http://localhost:8787/api/token/create \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: YOUR_TOKEN_SECRET" \
  -d '{"promoCode": "LAUNCH30"}'
```

## プロモコード一覧

| コード       | プラン | 日数 | 説明             |
|-------------|--------|------|-----------------|
| LAUNCH30    | pro    | 30   | ローンチ記念      |
| INVITE2026  | pro    | 14   | 招待コード        |
| BETA3MONTH  | pro    | 90   | ベータ感謝        |
| GOALPRO7    | pro    | 7    | 7日間無料体験     |

## ファイル構成
```
goal-ai-worker/
├── src/worker.js              ← メインWorkerコード
├── scripts/create-token.js    ← トークン作成CLI
├── docs/frontend-integration.js ← v18→v19移行ガイド
├── wrangler.toml              ← Cloudflare設定
├── package.json
└── README.md
```

## 次のステップ
1. Netlify デプロイ — v18.html を配置
2. v19 作成 — frontend-integration.js の差分を統合
3. Stripe 決済 — Webhook → Worker → KV で plan 更新
4. Supabase 永続化 — KV → Supabase に移行
