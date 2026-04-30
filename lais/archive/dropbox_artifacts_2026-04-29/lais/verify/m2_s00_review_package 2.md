# Lais M2 実装レビューパッケージ — S-00 Splash

> 本パッケージは Lais Phase 4 M2「S-00 Splash 実装」のレビュー対象一式。
> レビュー種別: sub_review_flow.md D. 実装レビュー
> 本書を全レビュアーに同時提供。

---

## ミッション定義

- **M2 目的:** design_spec_v1.md §4.1 準拠の S-00 Splash を最小実装し、Lais の品質フロー（実装 → スクショ検証 → AIレビュー）が回ることを確認する
- **スコープ:** S-00 Splash 1画面のみ。CTA タップは `console.log` のみで S-01 遷移は未実装（M3+）
- **完了条件:** 実装コード + design_spec §4.1 準拠の動作スクショ + AIレビュー CRITICAL 0

---

## design_spec_v1.md §4.1 S-00 Splash（該当セクション引用）

### 4.1 S-00 Splash

- **目的 / UX参照:** アプリの入口、ブランド認知。ux_v1.md §1.1
- **画面タイプ:** フルスクリーン（375×812 基準）
- **レイアウト原則:** 上下中央集約。下 140px にCTAスタック。

**セクション順序:**

1. ロゴ `Lais`（中央）
2. ブランドステートメント（ロゴ直下）
3. CTA スタック（画面下）

**要素仕様:**

| ID | 要素 | 位置・サイズ | タイポ / カラー |
|---|---|---|---|
| S00-1 | ロゴ `Lais` | 画面中央から上に 60px（= Y ≈ 340） | font-size `48px` / font-weight `600` / letter-spacing `3px` / color `--accent` |
| S00-2 | ステートメント「あなたの人生を、あなたらしく」 | ロゴ直下、`margin-top: 16px` | font-size `14px` / weight `400` / color `--text-muted` |
| S00-3 | CTA「はじめる」 | 画面下端から上 `140px`、左右 `--space-lg` | 高さ `52px` / 背景 `--button-primary-bg` / 文字 `#FFFFFF` / font-size `16px` weight `600` / radius `--radius-lg` |
| S00-4 | CTA「ログイン」 | S00-3 の下 `12px` | 高さ `52px` / border `1px solid --border-strong` / 文字 `--text-primary` / font-size `16px` weight `400` / radius `--radius-lg` |

**禁止要素:** 星屑パーティクル・背景グラデーション・紫系の装飾。

**状態・インタラクション:**
- CTA タップ → `--duration-fast` `scale(0.98)` のタップフィードバック → 画面遷移（ease-out / 350ms）
- 「はじめる」→ S-01（初期モード: サインアップ）
- 「ログイン」→ S-01（初期モード: ログイン）

**検証可能なスクショ事実:**
- ロゴ `Lais` が画面中央 X ≈ 188, Y ≈ 340 付近に1個だけ存在
- ロゴ色が `--accent` トークン相当（#79C0FF）
- CTA 2つが画面下端から 140px 以内に縦 2 段で並ぶ
- CTA「はじめる」の背景が `--button-primary-bg` 相当
- CTA「ログイン」の背景が透明、border 1px

---

## 実装パッケージ

### 1. lais/src/components/App.jsx

```jsx
import { S00Splash } from './screens/S00Splash.jsx';

export function App() {
  const handleStart = () => {
    console.log('[Lais] CTA はじめる → S-01 (signup mode). M3+ で実装');
  };
  const handleLogin = () => {
    console.log('[Lais] CTA ログイン → S-01 (login mode). M3+ で実装');
  };
  return (
    <div class="app-root" aria-label="Lais">
      <S00Splash onStart={handleStart} onLogin={handleLogin} />
    </div>
  );
}
```

### 2. lais/src/components/screens/S00Splash.jsx

```jsx
import './S00Splash.css';

export function S00Splash({ onStart, onLogin }) {
  return (
    <main class="s00" aria-label="Lais スプラッシュ">
      <div class="s00-center">
        <h1 class="s00-logo">Lais</h1>
        <p class="s00-tagline">あなたの人生を、あなたらしく</p>
      </div>
      <div class="s00-cta">
        <button
          type="button"
          class="s00-cta-primary"
          onClick={onStart}
        >
          はじめる
        </button>
        <button
          type="button"
          class="s00-cta-secondary"
          onClick={onLogin}
        >
          ログイン
        </button>
      </div>
    </main>
  );
}
```

### 3. lais/src/components/screens/S00Splash.css

```css
.s00 {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 0 var(--space-lg);
  background: var(--bg-primary);
}

.s00-center {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  transform: translateY(calc(-50% - 60px));
  display: flex;
  flex-direction: column;
  align-items: center;
}

.s00-logo {
  font-size: var(--font-size-3xl); /* 48px */
  font-weight: var(--font-weight-semibold); /* 600 */
  letter-spacing: 3px;
  color: var(--accent);
  line-height: 1;
  margin: 0;
}

.s00-tagline {
  margin-top: var(--space-md); /* 16px */
  font-size: var(--font-size-sm); /* 14px */
  font-weight: var(--font-weight-regular);
  color: var(--text-muted);
  letter-spacing: var(--letter-spacing-ja);
  line-height: var(--line-height-ja-body);
}

/*
 * design_spec §4.1 要素表:
 *   S00-3「はじめる」: 画面下端から上 140px (= primary bottom = 140px from viewport bottom)
 *   S00-4「ログイン」: S00-3 の下 12px (= ログイン下辺 = 140 - 52 - 12 = 76px from viewport bottom)
 */
.s00-cta {
  position: absolute;
  left: var(--space-lg);
  right: var(--space-lg);
  bottom: 76px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.s00-cta-primary,
.s00-cta-secondary {
  height: 52px;
  border-radius: var(--radius-lg);
  font-size: var(--font-size-base);
  letter-spacing: var(--letter-spacing-ja);
  min-width: 44px;
  min-height: 44px;
  transition: transform var(--duration-fast) var(--spring-default);
}

.s00-cta-primary {
  background: var(--button-primary-bg);
  color: var(--button-primary-text);
  font-weight: var(--font-weight-semibold);
  border: none;
}

.s00-cta-primary:disabled,
.s00-cta-primary[aria-disabled="true"] {
  background: var(--button-disabled-bg);
  color: var(--button-disabled-text);
  pointer-events: none;
  cursor: not-allowed;
}

.s00-cta-secondary {
  background: transparent;
  color: var(--text-primary);
  font-weight: var(--font-weight-regular);
  border: 1px solid var(--border-strong);
}

.s00-cta-primary:active,
.s00-cta-secondary:active {
  transform: scale(0.98);
}
```

---

## 実測スクショ事実（Playwright / viewport 375×812）

```json
{
  "logo": {
    "text": "Lais",
    "center": { "x": 187, "y": 326 },
    "size": { "w": 100, "h": 48 },
    "color": "rgb(121, 192, 255)",
    "fontSize": "48px",
    "fontWeight": "600"
  },
  "tagline": {
    "text": "あなたの人生を、あなたらしく",
    "center": { "x": 188, "y": 378 },
    "color": "rgb(122, 133, 147)",
    "fontSize": "14px",
    "fontWeight": "400"
  },
  "primaryCTA": {
    "text": "はじめる",
    "center": { "x": 188, "y": 582 },
    "size": { "w": 327, "h": 52 },
    "background": "rgb(26, 95, 200)",
    "color": "rgb(255, 255, 255)",
    "fontSize": "16px",
    "fontWeight": "600",
    "bottomFromViewport": 140
  },
  "secondaryCTA": {
    "text": "ログイン",
    "center": { "x": 188, "y": 710 },
    "size": { "w": 327, "h": 52 },
    "background": "transparent",
    "color": "rgb(230, 237, 243)",
    "border": "1px solid rgb(110, 118, 129)",
    "fontSize": "16px",
    "fontWeight": "400",
    "bottomFromViewport": 76
  }
}
```

- トークン対応: `rgb(121, 192, 255)` = `--accent` (`#79C0FF`) / `rgb(122, 133, 147)` = `--text-muted` (`#7A8593`) / `rgb(26, 95, 200)` = `--button-primary-bg` (`#1A5FC8`) / `rgb(110, 118, 129)` = `--border-strong` (`#6E7681`) / `rgb(230, 237, 243)` = `--text-primary` (`#E6EDF3`)
- CTA スタック: secondary（ログイン）の下辺が画面下端から 140px、primary（はじめる）はその上 12px gap + 52px 高さ → 画面下端から 204px
- 画面中央 X = 187.5（375/2）、ロゴ中心 X = 187 で中央揃え
- テーマ: `[data-theme="night-sky"]` が `<script>` でローカルストレージ参照して first-paint 前にセット済み（FOUC 回避）

---

## 付随ファイル（参照用の実装コンテキスト）

### tokens.css 抜粋

```css
:root {
  --font-size-sm: 14px;
  --font-size-base: 16px;
  --font-size-3xl: 48px;
  --font-weight-regular: 400;
  --font-weight-semibold: 600;
  --letter-spacing-ja: -0.02em;
  --line-height-ja-body: 1.7;
  --space-md: 16px;
  --space-lg: 24px;
  --radius-lg: 12px;
  --spring-default: cubic-bezier(0.175, 0.885, 0.32, 1.1);
  --duration-fast: 200ms;
  --focus-ring-width: 2px;
  --focus-ring-offset: 2px;
  --focus-ring-style: solid;
}
```

### themes.css [data-theme="night-sky"] 抜粋

```css
[data-theme="night-sky"] {
  --bg-primary: #0D1117;
  --text-primary: #E6EDF3;
  --text-muted: #7A8593;
  --accent: #79C0FF;
  --border-strong: #6E7681;
  --button-primary-bg: #1A5FC8;
  --button-primary-text: #FFFFFF;
  --button-disabled-bg: #1F2937;
  --button-disabled-text: #6E7681;
  --focus-ring-color: var(--accent);
}
```

### global.css `:focus-visible` ルール

```css
:focus-visible {
  outline: var(--focus-ring-width) var(--focus-ring-style) var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
  border-radius: inherit;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0ms !important;
    transition-duration: 0ms !important;
  }
}
```

---

## スコープ定義（本レビュー）

**対象外（M2 では未実装。指摘しないこと）:**
- S-01 以降の画面遷移（CTA は console.log のみ）
- Router / ルーティング
- 状態管理（Signals）
- API 接続（Supabase / Worker）
- 4 テーマのうち Night Sky 以外のトークン値の詳細検証（Dawn / Harajuku は Phase 4 でDS v0.13 へ昇格予定）
- §7 Phase 4 対応リスト（A群コントラスト/B群UX構成欠落/C群トークン逸脱/D群DS拡張）は既知未対応として棚上げ

**対象（本レビュー評価対象）:**
- S-00 Splash の design_spec §4.1 準拠
- コード品質（可読性・責務分離・不要な複雑性）
- セキュリティ（XSS / 入力バリデーション / 秘密露出 — ただし本 M2 は入力なし）
- アクセシビリティ（aria-label / focus / タップ領域 / キーボード操作 / reduced-motion）
- パフォーマンス（不要な再レンダリング / バンドル）
- エッジケース（375×812 外の viewport / 縦横回転 / reduced-motion）

**CRITICAL 判定基準:**
- 実装が design_spec §4.1 と明確に矛盾
- セキュリティ脆弱性
- WCAG AA 非準拠
- 実行時クラッシュ / 無限ループ / データ破壊

「あった方がよい」「将来こうしたい」は HIGH 以下。
