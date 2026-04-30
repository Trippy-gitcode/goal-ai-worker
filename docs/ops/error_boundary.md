# ErrorBoundary 運用 SSoT（PATCH-PB4-ERROR-BOUNDARY）

> 起票: 2026-04-25 / 完遂: 2026-04-26（subagent SUBAGENT-PB4-ERRBOUNDARY 部分実装 → LAIS-PHASE-B4-B5-INTEG resume 完遂）
> 根拠: dev-system-adv v3.4 §2.25 Phase B-4 / LP-008 / LP-010
> 対象: `lais/src/components/shared/ErrorBoundary.{jsx,css}`
> 関連 PATCH: `lais/verify/dev_system_v34_patches.md` PATCH-PB4-ERROR-BOUNDARY
> 関連: `docs/ops/code_splitting.md`（B-5 Suspense 連携）

---

## §0 概要

Lais SPA の全 Router レベルおよび個別画面レベルで JavaScript ランタイム例外を捕捉し、白画面を防いで「再試行 / ホームへ戻る」可能な fallback UI を表示する。Preact class component（`getDerivedStateFromError` + `componentDidCatch`）で実装。

### 範囲

- 適用範囲: Phase A 全 13 画面（Router 登録 9 ルート + S10Grow 内モーダル S12/S13 + S15）
- 対象例外: render 中の throw、event handler の同期 throw、lazy() 解決失敗、コンストラクタ throw
- 対象外: 非同期 reject（`.then` / `await` 中の reject）→ `try/catch` + state 反映で処理側責務、Service Worker / Web Worker 内例外、サーバー側 SSR エラー（現状 SSR 無し）

---

## §1 設計

### §1.1 配置

| 項目 | 値 |
|---|---|
| 実装ファイル | `lais/src/components/shared/ErrorBoundary.jsx`（125 行） |
| スタイル | `lais/src/components/shared/ErrorBoundary.css`（同梱） |
| 利用元 | `lais/src/components/App.jsx` Router レベル + `LazyRoute` / `StaticRoute` 内側ラップ |

> 配置先は `shared/`（v4.0.42 までの命名規則踏襲）。指示書に `common/` の表記があるが既存命名と整合しないため `shared/` を採用。

### §1.2 props

| prop | 型 | 既定 | 用途 |
|---|---|---|---|
| `children` | ReactNode | (必須) | 監視対象サブツリー |
| `fallback` | ReactNode \| `(error, retry) => ReactNode` | 既定 fallback UI | 画面別 fallback の差替え |
| `onError` | `(error, info) => void` | undefined | 追加 sentinel（telemetry hook） |
| `homeHref` | string | `'/'` | 「ホームへ戻る」遷移先 |
| `label` | string | `'読み込みに失敗しました'` | fallback UI タイトル文言 |

### §1.3 既定 fallback UI

- `<main role="alert" aria-live="assertive">` でスクリーンリーダーに即時通知
- ⚠️ アイコン（emoji 1 文字、`aria-hidden="true"` で重複読み上げ抑止）
- title（label prop） / message（`error.message`） / actions（再試行 / ホームへ戻る）
- 「ホームへ戻る」は `window.location.assign(homeHref)` を使用 → preact-router 非依存。エラー後の不安定状態でも確実に遷移可能。

---

## §2 二重防御モデル

`App.jsx` で **外側** + **内側** の 2 層 ErrorBoundary を配置。

```
<ErrorBoundary>                       ← 外側: Router 全体（最終防衛線）
  <Router>
    <SplashRoute>                     ← StaticRoute（内側 ErrorBoundary 個別注入）
    <AuthRoute>                       ← LazyRoute（内側 ErrorBoundary + Suspense 同居）
    <OnboardingRoute>                 ← RequireAuth → LazyRoute（同上）
    <GrowRoute>                       ← RequireAuth → LazyRoute
    <GoalCreateRoute>                 ← RequireAuth → LazyRoute（label 個別指定）
    <GoalDetailRoute>                 ← RequireAuth → LazyRoute
    <TalkRoute>                       ← RequireAuth → LazyRoute
    <MeProfileRoute>                  ← RequireAuth → LazyRoute
  </Router>
</ErrorBoundary>
```

### §2.1 各層の役割

- **外側**: Router / route() / 静的 import 画面（S00Splash 等）の予期せぬ例外を最終キャッチ。fallback は既定 UI（label 省略 → 「読み込みに失敗しました」）。
- **内側 (`LazyRoute`)**: 個別 lazy chunk 解決失敗 + Suspense 連携。chunk 取得失敗（CDN 障害など）でも他画面に影響を波及させず、当該画面のみ「再試行」可能。
- **内側 (`StaticRoute`)**: 静的 import 画面（S00Splash）の render 例外を個別捕捉。

### §2.2 個別画面 ErrorBoundary 注入の判定

| 画面 | Router 登録 | 個別注入 | 根拠 |
|---|---|---|---|
| S00Splash | `/` (StaticRoute) | あり（StaticRoute 経由） | 静的 import、内側必要 |
| S01Auth | `/auth` (LazyRoute) | あり（LazyRoute 経由） | lazy + Suspense 連携 |
| AuthCallback | `/auth/callback` (LazyRoute) | あり | OAuth 失敗時の隔離 |
| S02Onboarding | `/onboarding` (LazyRoute) | あり | 同上 |
| S10Grow | `/grow` (LazyRoute) | あり | Phase A 主着陸、画面内 ErrorBoundary 個別 import 済（既存実装維持） |
| S12TaskAdd | (S10Grow モーダル) | 親画面の ErrorBoundary 経由 | Router 登録なし、親で捕捉 |
| S13TaskDetail | (S10Grow モーダル) | 同上 | 同上 |
| S14GoalDetail | `/goal/:id` (LazyRoute) | あり | 同上 |
| S15GoalCreate | `/goal/create` (LazyRoute) | あり（label 指定） | ハーフモーダル、label 個別 |
| S20Talk | `/talk` (LazyRoute) | あり | 同上 |
| S30MeProfile | `/me` (LazyRoute) | あり | 同上 |

> **判定**: Phase A 13 画面のうち、Router 登録 9 ルートはすべて `<LazyRoute>` または `<StaticRoute>` 経由で内側 ErrorBoundary を保持。モーダル画面 S12 / S13 は親画面 S10Grow の ErrorBoundary で十分（深さ 1 層のサブツリーなので捕捉漏れなし）。**追加注入不要**。

---

## §3 Sentinel と telemetry

### §3.1 現状

- `componentDidCatch` 内で `console.error('[Lais] ErrorBoundary caught:', error, info)` を発火
- LP-010（console.error 本番バンドル漏出）対策: 本番ビルドで `define` により no-op に置換予定（B-6 以降）
- 任意 `props.onError` を try/catch 付きで呼出（hook 失敗で再帰 throw を防止）

### §3.2 将来統合（Phase B-5+）

`ErrorBoundary.jsx` 内 TODO コメント参照。要件:

- `import.meta.env.VITE_SENTRY_DSN` 設定時のみ `fetch('/_telemetry/error', { method: 'POST', ... })`
- Body には message / stack / component stack / user agent / route のみ
- 認証情報（Supabase token / API キー）は **絶対に含めない**（gitleaks / RLS 整合）
- DSN 未設定環境では no-op（開発時 / テスト時の誤送信防止）

---

## §4 テスト

### §4.1 既存 smoke テスト

- `lais/tests/smoke/error-boundary.spec.ts`: chunk 解決失敗をシミュレート → fallback UI 表示 + 再試行ボタン動作確認

### §4.2 手動再現手順

1. `npm run dev` で起動
2. 開発者ツール Console で `throw new Error('test')` を任意画面の handler に仕込む
3. 該当 handler 発火 → fallback UI（⚠️ + 再試行 + ホームへ戻る）が表示されること
4. 「再試行」で setState リセット → 元の children が再描画されること
5. 「ホームへ戻る」で `window.location.assign('/')` 発火 → S00Splash に遷移すること

### §4.3 lazy chunk 解決失敗の手動再現

1. `npm run build && npm run preview`
2. dist/assets/ から S10Grow-XXXX.js を削除
3. `/grow` にアクセス → LazyRoute 内側 ErrorBoundary が catch → fallback UI 表示
4. 他ルート（/talk 等）は影響を受けず正常遷移可能であること

---

## §5 運用

### §5.1 障害発生時

1. fallback UI が表示されたら、`console.error('[Lais] ErrorBoundary caught:', ...)` を確認
2. error.message / stack を `lais/verify/incident_*.md` に記録
3. 再現手順を作成 → unit test または smoke test で再発防止

### §5.2 新規画面追加時の手順

- `App.jsx` の Router に `<XxxRoute>` を追加する際、`LazyRoute` または `StaticRoute` ラッパを必ず経由する
- ラッパ未経由の直接 `<NewScreen />` 呼出は禁止（外側 ErrorBoundary では「画面別 label」を出せず UX が劣化）
- label は画面の役割を 1 行で（例: 「ゴール作成画面の読み込みに失敗しました」）

### §5.3 fallback UI 文言改訂

- title（label）は画面別、message（`error.message`）は raw error メッセージのまま表示
- 機微情報（API endpoint / token / SQL）が error.message に含まれる場合は raw 表示禁止
- raw 表示禁止画面では `fallback` prop で関数を渡し、message を sanitize した独自 UI を返す

### §5.4 SLO

- ErrorBoundary fallback UI 表示率: 月次セッション数の 0.1% 未満を目標（B-5 Sentry 統合後に計測開始）
- 「再試行」成功率: 50% 以上（chunk 取得失敗の自動リトライ想定）

---

## §6 関連リンク

- 実装: `lais/src/components/shared/ErrorBoundary.jsx` / `ErrorBoundary.css`
- 利用: `lais/src/components/App.jsx`（Router レベル + LazyRoute / StaticRoute）
- smoke test: `lais/tests/smoke/error-boundary.spec.ts`
- PATCH 起票: `lais/verify/dev_system_v34_patches.md` PATCH-PB4-ERROR-BOUNDARY
- Code splitting 連携: `docs/ops/code_splitting.md` §3 Suspense 連携

---

> 本 SSoT は ErrorBoundary 運用の唯一の正典。実装変更時は本ファイル §1 / §2 / §3 を同時更新すること。
