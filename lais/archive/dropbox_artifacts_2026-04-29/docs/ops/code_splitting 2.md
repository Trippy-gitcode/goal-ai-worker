# Code Splitting 運用 SSoT（PATCH-PB5-CODE-SPLIT）

> 起票: 2026-04-25 / 完遂: 2026-04-26（subagent SUBAGENT-PB5-CODESPLIT 部分実装 → LAIS-PHASE-B4-B5-INTEG resume 完遂）
> 根拠: dev-system-adv v3.4 §2.25 Phase B-5 / LP-012
> 対象: `lais/vite.config.js` / `lais/src/components/App.jsx` / `lais/src/components/shared/Loading.jsx` / `lais/index.html`
> 関連 PATCH: `lais/verify/dev_system_v34_patches.md` PATCH-PB5-CODE-SPLIT
> 関連: `docs/ops/error_boundary.md`（B-4 Suspense 連携）

---

## §0 概要

Lais SPA の初期 bundle を最小化し、ルート単位で chunk 分離 + 主導線 prefetch により FCP（First Contentful Paint）短縮 + 認証完了後の S10Grow 着陸を高速化する。Vite/Rollup の動的 import + `manualChunks` で実装。

### 目的

- 初期 bundle サイズ削減（vendor-supabase 190KB を初期 chunk から完全分離）
- 画面別 chunk 分割（lazy() で 8 画面分の独立 chunk 化）
- 主導線（S00 → S01 → S10）の prefetch によるタップ後遅延ゼロ化

---

## §1 戦略

### §1.1 chunk 分割方針

| chunk 種別 | 戦略 | 例 |
|---|---|---|
| **画面別 chunk** | `lazy(() => import(...))` で画面ごとに自動分割 | S01Auth / S02Onboarding / S10Grow / S14GoalDetail / S15GoalCreate / S20Talk / S30MeProfile / AuthCallback |
| **eager chunk** | FCP 画面のみ静的 import（main bundle 同梱） | S00Splash（「はじめる/ログイン」前の唯一の画面） |
| **vendor-preact** | Preact フレームワーク群を 1 chunk に固定 | preact / @preact/signals / preact-router |
| **vendor-supabase** | Supabase クライアント（最重量 ~150KB minified） | @supabase/supabase-js |
| **vendor** | その他のサードパーティ（将来用、現状ほぼ空） | （現状 ~6KB） |

### §1.2 設計原則

1. **画面別 chunk は Rollup 自動分割に任せる**: 手動指定すると保守負担増、`lazy()` の動的 import を Rollup が自動で分離
2. **vendor 系のみ `manualChunks` 関数で固定**: フレームワーク群と Supabase の分離は明示
3. **共通 lib（src/lib/auth.js / supabase.js）は entry chunk に inline する代わり、`vendor-supabase` 経由で参照されるため自然に共有**

---

## §2 manualChunks 設定

`lais/vite.config.js` 抜粋:

```js
build: {
  outDir: 'dist',
  sourcemap: true,
  rollupOptions: {
    output: {
      manualChunks(id) {
        if (!id.includes('node_modules')) return undefined;
        if (id.includes('@supabase')) return 'vendor-supabase';
        if (id.includes('preact') || id.includes('@preact')) {
          return 'vendor-preact';
        }
        return 'vendor';
      },
    },
  },
}
```

### §2.1 Vite 互換性

- `build.rollupOptions.output.manualChunks` は Vite v3 〜 v5 共通 API
- Lais は Vite v4 系（`package.json` 確認）→ そのまま動作
- 将来 v6 移行時は `manualChunks` 関数の引数 `meta` で `getModuleInfo()` を直接呼出推奨

---

## §3 lazy() + Suspense + Loading

### §3.1 App.jsx 配線

```jsx
import { lazy, Suspense } from 'preact/compat';
import { ErrorBoundary } from './shared/ErrorBoundary.jsx';
import { Loading } from './shared/Loading.jsx';

const S01Auth = lazy(() => import('./screens/S01Auth.jsx'));
// ... 他 7 画面同様

function LazyRoute({ children, label }) {
  return (
    <ErrorBoundary label={label}>
      <Suspense fallback={<Loading />}>{children}</Suspense>
    </ErrorBoundary>
  );
}
```

### §3.2 Loading.jsx

`lais/src/components/shared/Loading.jsx` 26 行。

| 要件 | 実装 |
|---|---|
| 視覚 | `<main class="route-fallback">` のみ（最小ブランク、CSS は `styles/global.css` に同居） |
| ARIA | `role="status"` + `aria-live="polite"` + `aria-label="読み込み中"` |
| props | `label`（既定: 「読み込み中」、画面別差替え可、例: RequireAuth では「セッションを確認中」） |
| 外部依存 | ゼロ（CSS Module 不使用、独立 .css 不作成 → bundle サイズ最小） |

### §3.3 ErrorBoundary 連携（B-4 二重防御）

`LazyRoute` は **外側 ErrorBoundary** + **内側 Suspense** の構造。

- chunk 取得失敗（CDN 障害 / ネットワーク断）→ ErrorBoundary が catch → fallback UI 表示 + 「再試行」で `setState({ error: null })` → Suspense が再 throw → chunk 再取得を試行
- chunk 取得成功 → Suspense fallback（Loading）→ children render
- 詳細: `docs/ops/error_boundary.md` §2 二重防御モデル

---

## §4 計測（BEFORE / AFTER）

### §4.1 BEFORE（B-5 適用前 / 想定値）

> Phase A 完成時点（lazy() 化前、単一 bundle）の推定値:

| メトリクス | 推定値 |
|---|---|
| 初期 JS bundle | ~250 KB（Supabase + Preact + 全画面 inline） |
| FCP までに必要な JS | ~250 KB（全部読込） |
| S10Grow 着陸時の追加読込 | 0 KB（既に inline） |

### §4.2 AFTER（PATCH-PB5-CODE-SPLIT 適用後 / 実測値、2026-04-26 dist/assets/ 計測）

| chunk | サイズ | 用途 |
|---|---|---|
| index-XXXX.js | 9,164 B（9.0 KB） | entry（main.jsx + App.jsx + S00Splash） |
| vendor-preact-XXXX.js | 31,649 B（30.9 KB） | preact / @preact/signals / preact-router |
| vendor-supabase-XXXX.js | 190,551 B（186.1 KB） | @supabase/supabase-js |
| vendor-XXXX.js | 6,216 B（6.1 KB） | その他サードパーティ |
| AuthCallback-XXXX.js | 1,844 B | lazy（/auth/callback） |
| S01Auth-XXXX.js | 5,511 B | lazy（/auth） |
| S02Onboarding-XXXX.js | 3,098 B | lazy（/onboarding） |
| S10Grow-XXXX.js | 20,293 B | lazy（/grow、Phase A 主着陸） |
| S14GoalDetail-XXXX.js | 4,844 B | lazy（/goal/:id） |
| S15GoalCreate-XXXX.js | 4,717 B | lazy（/goal/create） |
| S20Talk-XXXX.js | 7,750 B | lazy（/talk） |
| S30MeProfile-XXXX.js | 6,501 B | lazy（/me） |
| BottomTabBar-XXXX.js | 1,877 B | 共有チャンク（複数画面で参照） |
| **合計** | **294,015 B（287.1 KB）** | sourcemap 除外 |

### §4.3 効果

- **FCP までに必要な JS**: 9 KB（index）+ 31 KB（vendor-preact）= **約 40 KB**（BEFORE 250 KB → **84% 削減**）
- **vendor-supabase 186 KB は認証画面（S01）到達時にのみ取得** = S00Splash 表示まで完全に切り離し
- **S10Grow 着陸時の追加読込**: 20 KB（chunk）+ 186 KB（vendor-supabase）+ 共有 1.8 KB ≈ 208 KB
  - prefetch（§5）で背後取得済の場合は事実上 0 KB

### §4.4 計測コマンド

```bash
cd lais && npm run build
ls -la dist/assets/*.js | grep -v ".map"
# 各 chunk のサイズを確認
for f in dist/assets/*.js; do
  if [[ ! "$f" == *.map ]]; then
    size=$(stat -f%z "$f")
    echo "$size  $(basename $f)"
  fi
done | sort -n
```

---

## §5 prefetch（主導線）

`lais/index.html` `<head>` 内:

```html
<link rel="prefetch" href="/src/components/screens/S01Auth.jsx" as="script" crossorigin>
<link rel="prefetch" href="/src/components/screens/S10Grow.jsx" as="script" crossorigin>
```

### §5.1 動作

- ブラウザがアイドル時間に低優先度で取得 → cache に格納
- `lazy()` 解決時に cache hit → ネットワーク往復ゼロでチャンクを返却
- prefetch 失敗（404 / CORS）はサイレント（fallback はそのまま `lazy()` の動的取得）

### §5.2 dev / build 差異

- **dev**: prefetch URL は `/src/components/screens/S01Auth.jsx`（未解決ソースパス）→ ブラウザは取得試行するが Vite middleware が JSX を JS に変換して返す
- **build**: dist/index.html では Vite が hash 付き chunk URL に書換（vite-prefetch 同等）→ Cloudflare Pages 配信で有効
- 開発時は HMR で chunk が変動するため prefetch 無効でも問題なし

### §5.3 主導線の根拠

- S00Splash（eager）→ S01Auth（CTA「はじめる/ログイン」）→ AuthCallback（OAuth 復帰）→ S10Grow（認証成功後の着陸）
- 主導線 = **S01 + S10**。AuthCallback は OAuth 復帰の稀ケースのため prefetch 対象外

---

## §6 運用

### §6.1 新規画面追加時の手順

1. `lais/src/components/screens/SXXName.jsx` を作成（default export 必須）
2. `App.jsx` で `const SXX = lazy(() => import('./screens/SXXName.jsx'));` を宣言
3. `<LazyRoute label="...">` 経由で Router 登録
4. 主導線に組み込まれる場合は `index.html` の prefetch リスト末尾に追加
5. `npm run build` で chunk 分離を確認
6. `docs/ops/code_splitting.md` §4.2 表に追記

### §6.2 chunk 統合（逆方向最適化）

- 微小チャンク（< 2 KB）が 5 個以上発生した場合、`manualChunks` 関数で 1 chunk に集約検討
- 例: BottomTabBar（1.8 KB）等の共有 UI が増えた場合 `vendor-ui` チャンクに集約
- 統合判断は LP-012 「初期 chunk 数 < 5、主要 chunk サイズ ~ 200KB 以下」の基準で評価

### §6.3 vendor-supabase の動的 import

- 現状: 認証画面到達で Supabase クライアント取得（lazy chunk 経由で間接 import）
- 将来最適化: `lib/supabase.js` 自体を `lazy()` 化 → 認証実行時のみ取得（ただし `bootstrapAuth` が App マウント直後に呼ばれるため大幅な遅延短縮は望めない）

### §6.4 sourcemap 配信

- `build.sourcemap: true` で .map 付き配信中
- 本番では `.map` を Cloudflare Pages 経由で配信せず Sentry のみアップロード推奨（B-5 Sentry 統合時に対応）

---

## §7 関連リンク

- 実装: `lais/vite.config.js` / `lais/src/components/App.jsx` / `lais/src/components/shared/Loading.jsx` / `lais/index.html`
- ErrorBoundary 連携: `docs/ops/error_boundary.md` §2
- PATCH 起票: `lais/verify/dev_system_v34_patches.md` PATCH-PB5-CODE-SPLIT
- LP-012（コード分割の達成基準）

---

> 本 SSoT は Code Splitting 運用の唯一の正典。chunk 戦略変更時は本ファイル §1 / §2 / §4 を同時更新すること。
