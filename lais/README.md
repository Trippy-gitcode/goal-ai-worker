# Lais

v0.0.0 — Phase 4 M1 scaffold.

## 構成

- **Frontend:** Vite + Preact + Signals
- **Worker:** Cloudflare Workers（M3+ で Hono + Supabase を追加）
- **Styles:** CSS custom properties。4テーマを `[data-theme]` で切替
- **依存仕様書:** `../docs/plans/lais_design_spec_v1.md` + `lais_design_system.md` + `lais_ux_v1.md`

## 開発

```bash
cd lais
npm install
npm run dev        # Vite dev server → http://localhost:5175
npm run build      # dist/ 出力
npm run worker:dev # Workers ローカル実行（wrangler 必要）
```

## ディレクトリ

```
lais/
├── index.html                # FOUC 回避テーマ bootstrap 付き
├── src/
│   ├── main.jsx
│   ├── components/
│   │   └── App.jsx
│   └── styles/
│       ├── tokens.css        # 共通トークン（spacing / typo / motion / z-index）
│       ├── themes.css        # 4テーマのカラートークン
│       └── global.css        # reset + focus-visible + prefers-reduced-motion
├── worker/
│   └── index.js              # minimal /api/health
├── vite.config.js
├── wrangler.toml
└── package.json
```

## Phase 4 マイルストーン

- **M1 ✅** scaffold + ブランク画面
- **M2** S-00 Splash 実装 + スクショ検証 + sub_review_flow.md 準拠の実装レビュー
- **M3+** PO 承認後に順次着手
