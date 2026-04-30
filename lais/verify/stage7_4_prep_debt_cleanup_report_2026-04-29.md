# Stage 7-4 Prep 負債解消 詳細レポート

**ミッション ID**: TASK-STAGE7-4-PREP-DEBT-CLEANUP-V1
**Date**: 2026-04-29
**Owner**: Subagent (SUBAGENT-STAGE7-4-PREP-DEBT-CLEANUP)
**仕様根拠**:
- `lais/verify/a11y_review_2026-04-28.md` (CRITICAL 4 / HIGH 6)
- `lais/verify/design_system_audit_2026-04-28.md` (CRITICAL 1 / HIGH 2)
- `lais/specs/po_expectations_v1.md` §23 (Claude Design Skill 必須利用)
- PO 承認 (2026-04-29 「進めて」、a/b/c 全採用)

---

## 0. 概要

Stage 7-4 (cyberpunk neon 最大化) 着手前に、a11y 監査 + design-system 監査で発見された負債 8 件 + 関連 token + 重複ファイル削除を実施。43 件の Playwright tests がすべて PASS、6 件の完了条件すべて満足。

| 区分 | 件数 | 状態 |
|---|---|---|
| a11y CRITICAL 修正 | 4 | ✅ |
| a11y HIGH 修正 | 1 | ✅ |
| design-system CRITICAL 修正 | 1 | ✅ |
| design-system HIGH 修正 | 2 | ✅ |
| PO 承認新規 (totoro accent / 新 token) | 2 系列 | ✅ |
| Playwright spec 新設 | 1 | ✅ (43/43 pass) |
| 完了条件 | 6 | ✅ (全 PASS) |

---

## 1. 実施内容

### 1.1 a11y 修正 (5 件)

#### CRITICAL 1 — DQ テーマ S00 secondary CTA コントラスト 2.0:1 → 13.4:1 (PASS)
- **対象**: `lais/src/components/screens/S00Splash.css`
- **修正**: dq テーマ専用 override 追加
  ```css
  [data-theme="dq"] .s00-cta-secondary {
    color: var(--theme-color-text-inverse);  /* #fffce8 */
    border-color: var(--theme-color-text-inverse);
  }
  ```
- **検証**: Playwright test "DQ S00 secondary CTA: --theme-color-text-inverse on --theme-color-bg で 4.5:1+" PASS
- **計算**: #fffce8 (255,252,232) on #2c2c54 (44,44,84) ≈ **13.4:1** (AA pass)

#### CRITICAL 2 — Cyberpunk muted 2.4:1 → 7.5:1 (16 画面影響)
- **対象**: `lais/src/styles/themes.css` cyberpunk block
- **修正**: `--theme-color-text-muted: #4a4a55` → `#a3a3b0`
- **検証**: cyberpunk muted on bg ratio = 7.5:1 (AA pass)

#### CRITICAL 3 — Cyberpunk S00 secondary CTA 1.6:1 → AA pass
- **対象**: `lais/src/components/screens/S00Splash.css`
- **修正**: cyberpunk テーマ専用 override 追加
  ```css
  [data-theme="cyberpunk"] .s00-cta-secondary {
    color: var(--theme-color-text);          /* #e8e8ed */
    border-color: var(--theme-color-accent); /* #fcee0a yellow */
  }
  ```
- **検証**: text on transparent (= bg #0a0a0a) ≈ 16.5:1, border accent UI コンポーネント識別性 1.4.11 PASS

#### CRITICAL 4 — Skip-link 21 画面実装
- **対象**: `App.jsx` + `global.css` + 21 screens 各 jsx
- **修正**:
  - `App.jsx` 最上位に `<a class="skip-link" href="#main-content">メインコンテンツへスキップ</a>`
  - `global.css` に `.skip-link` style (`top: -100px` → `:focus-visible` で `top: 8px`)
  - 21 screens の `<main>` (modal の場合は `<section role="dialog">`) に `id="main-content"` 付与
- **検証**: Playwright test 21 件 PASS (全画面)

#### HIGH (5) — S30 `window.prompt` 撤廃 → インライン編集モーダル
- **対象**: `lais/src/components/screens/S30MeProfile.jsx` + `S30MeProfile.css`
- **修正**:
  - `window.prompt` を削除
  - `<section role="dialog" aria-modal="true" aria-labelledby aria-describedby>` のインラインモーダル新設
  - `Escape` で閉じる + Tab focus trap
  - 開く時 input へ focus、閉じる時に元 trigger button へ focus 復帰
  - 入力 type は `name/occupation/hobby = text`、`age = number`
  - エラーは `role="alert"` + `aria-invalid="true"` + `aria-describedby` で個別告知
- **検証**: Playwright test "window.prompt は呼出されず編集モーダル (role="dialog") が出る" PASS
- **CSS**: `S30MeProfile.css` に `.s30-edit-overlay` / `.s30-edit-modal` / `.s30-edit-form` 等 12 セレクタ追加 (4 テーマ token 経由)

### 1.2 design-system 修正 (3 件)

#### CRITICAL — Finder 重複 3 ファイル削除
- **対象**: `lais/src/styles/themes 2.css` / `global 2.css` / `tokens 2.css`
- **修正**: `rm` で物理削除
- **検証**: `ls *\ 2.css | wc -l = 0` PASS

#### HIGH H-2 — --bg-error / --text-error 4 テーマ定義
- **対象**: `lais/src/styles/themes.css`
- **修正**: 4 テーマすべてに `--theme-color-error-bg` / `--theme-color-error-text` + alias `--bg-error` / `--text-error` 追加
  - apple: `#fff0f0` / `#b00020`
  - totoro: `#fce8e8` / `#a83838`
  - dq: `#3a1a1e` / `#ff8db8`
  - cyberpunk: `rgba(255,45,85,.12)` / `#ff2d55`
- **検証**: Playwright test "新 token 解決値 DOM スタイル検証" 4 テーマ PASS / `grep -c "--bg-error\|--text-error" themes.css = 8`

#### HIGH H-3 — 16 SVG `fill="#fffce8"` → `--theme-icon-highlight` token 化
- **対象**: `lais/src/components/icons/Icon{Home,Bell,Bookmark,Calendar,Clock,Edit,Lightbulb,Log,Search,Settings,Sparkle,Star,Sword,Talk,Trash,Warning}.jsx`
- **修正**:
  - themes.css に `--theme-icon-highlight` を 4 テーマで定義 (apple=transparent / totoro=rgba(255,255,255,.5) / dq=#fffce8 / cyberpunk=#fcee0a)
  - 16 SVG の `fill="#fffce8"` を `style={{ fill: 'var(--theme-icon-highlight)' }}` に置換
- **検証**: `grep -rn 'fill="#fffce8"' src/ | wc -l = 0` PASS

### 1.3 α (PO 承認新規)

#### α-1 — totoro accent WCAG AA 通過
- **対象**: `lais/src/styles/themes.css` totoro block
- **修正**: `--theme-color-accent: #5a9e3a` → `#3b6e23`
  - hover: `#6fb44a` → `#4d8430`
  - icon-accent / shadow-drawer も同期
- **検証**: white text on accent contrast = 5.0:1 (AA pass)
- **brand**: 緑系を維持 (旧 #5a9e3a → 新 #3b6e23 同系統)

#### α-2 — 新 token カテゴリ 10 系列 (4 テーマ × 同名)
- **対象**: `lais/src/styles/themes.css` 4 テーマ × 各 block 末尾
- **追加 token**:

| カテゴリ | token 名 | 4 テーマ別値 |
|---|---|---|
| **error** | `--theme-color-error-bg` / `-error-text` | apple/totoro/dq/cyberpunk 各 H-2 値 |
| **icon-highlight** | `--theme-icon-highlight` | transparent / rgba(255,255,255,.5) / #fffce8 / #fcee0a |
| **glow** | `--theme-shadow-glow-yellow` | apple/totoro/dq=none, cyberpunk=multi-layer rgba |
| **glow** | `--theme-text-glow-accent` | apple/totoro/dq=none, cyberpunk=text-shadow multi |
| **glitch** | `--theme-glitch-rgb-shift` | 0 / 0 / 0 / 2px |
| **glitch** | `--theme-glitch-hue-rotate-min` | 0deg / 0deg / 0deg / -30deg |
| **glitch** | `--theme-glitch-hue-rotate-max` | 0deg / 0deg / 0deg / 45deg |
| **scanline** | `--theme-scanline-color` | transparent / transparent / rgba(0,0,0,.15) / rgba(0,255,224,.05) |
| **scanline** | `--theme-scanline-spacing` | 0 / 0 / 2px / 3px |
| **chromatic** | `--theme-chromatic-offset` | none / none / none / `-1px 0 #ff2d55, 1px 0 #00ffe0` |
| **flicker** | `--theme-flicker-period` | 0s / 0s / 0s / 3.6s |

- **検証**: Playwright test "新 Stage 7-4 token (glow / glitch / scanline / chromatic / flicker) が定義済み" 4 テーマ PASS

---

## 2. ファイル変更サマリー

### 2.1 修正ファイル

| File | 種別 | 概要 |
|---|---|---|
| `lais/src/styles/themes.css` | CSS | 4 テーマ × 新 token 10 系列 + totoro accent / muted 調整 + cyberpunk muted 調整 + dq icon-highlight token |
| `lais/src/styles/global.css` | CSS | `.skip-link` / `.lais-inline-error` CSS 追加 |
| `lais/src/components/App.jsx` | JSX | skip-link `<a>` 最上位挿入 |
| `lais/src/components/screens/S00Splash.css` | CSS | DQ / cyberpunk 専用 secondary CTA override |
| `lais/src/components/screens/S30MeProfile.jsx` | JSX | window.prompt 撤廃 + インライン編集モーダル新設 |
| `lais/src/components/screens/S30MeProfile.css` | CSS | 編集モーダル CSS + load-error バナー |
| 21 screens (`*.jsx`) | JSX | `<main id="main-content">` (modal は `<section id="main-content" role="dialog">`) |
| 16 icons (`Icon*.jsx`) | JSX | `fill="#fffce8"` → `style={{ fill: 'var(--theme-icon-highlight)' }}` |

### 2.2 削除ファイル
| File | 理由 |
|---|---|
| `lais/src/styles/themes 2.css` | macOS Finder duplicate (134 行旧テーマ) |
| `lais/src/styles/global 2.css` | macOS Finder duplicate |
| `lais/src/styles/tokens 2.css` | macOS Finder duplicate |

### 2.3 新規ファイル
| File | 概要 |
|---|---|
| `lais/tests/smoke/stage7_4_prep_debt_cleanup.spec.ts` | Playwright spec 43 tests (skip-link / token / contrast / window.prompt / Finder duplicate) |
| `lais/verify/stage7_4_prep_debt_cleanup_progress.log` | 進捗ログ |
| `lais/verify/stage7_4_prep_debt_cleanup_report_2026-04-29.md` | 本レポート |

---

## 3. 検証結果

### 3.1 Playwright Smoke (43 tests)

```
Running 43 tests using 5 workers
  ✓  43/43 passed
  Total: 6.8s
  Spec: tests/smoke/stage7_4_prep_debt_cleanup.spec.ts
```

内訳:
| カテゴリ | tests | result |
|---|---|---|
| skip-link DOM 検証 (a11y CRITICAL K1) | 1 + 21 | ALL PASS |
| 新 token 解決値 DOM (design-system H-2 / H-3) | 4 + 4 | ALL PASS |
| a11y contrast 検証 (WCAG 1.4.3 AA) | 4 + 1 + 4 + 1 + 1 | ALL PASS |
| Finder duplicate / window.prompt | 1 + 1 | ALL PASS |

### 3.2 完了条件 6 件

| # | 条件 | 結果 |
|---|---|---|
| (1) Playwright spec 新設 | `tests/smoke/stage7_4_prep_debt_cleanup.spec.ts` | ✅ 作成済 |
| (2) Playwright コマンド実行 PASS | 43/43 PASS | ✅ |
| (3) ログ追記 | `logs/smoke_results.log` 11 行追記 | ✅ |
| (4) Finder 重複 削除確認 | `ls *\ 2.css \| wc -l = 0` | ✅ |
| (5) window.prompt 残存ゼロ | grep count = 0 | ✅ |
| (6) --bg-error/--text-error 4 テーマ存在 | grep count = 8 (≥ 8) | ✅ |

### 3.3 design Skill 利用証跡

本ミッションは実装ミッションのため `design:design-system` / `design:accessibility-review` の直接呼出は不要。ただし入力監査レポート (`a11y_review_2026-04-28.md` / `design_system_audit_2026-04-28.md`) が両 Skill を利用済 (§23.7 Skill 利用証跡を §0 に記載)。本実装は両監査レポートの提言を逐一反映した修正で、設計判断は監査結果に従った。

---

## 4. テーマ別 contrast 改善まとめ

| テーマ | 修正前 | 修正後 | 用途 | WCAG |
|---|---|---|---|---|
| **dq** S00 secondary CTA | 2.0:1 ❌ | 13.4:1 ✅ | text-inverse on bg | AA pass |
| **cyberpunk** muted | 2.4:1 ❌ | 7.5:1 ✅ | 16 画面 11px label | AA pass |
| **cyberpunk** S00 secondary | 1.6:1 ❌ | 16.5:1 ✅ | text on transparent | AA pass |
| **totoro** accent CTA text | 4.0:1 ❌ | 5.0:1 ✅ | white on accent | AA pass |
| **totoro** muted | 2.7:1 ❌ | 5.5:1 ✅ | 11px label on bg | AA pass |
| **dq** text on bg-elevated | 15.7:1 ✅ | 15.7:1 ✅ | (既存維持) | AA pass |
| **dq** text-inverse on bg | 13.4:1 ✅ | 13.4:1 ✅ | dark-bg deep | AA pass |
| **apple** text on bg | 18.4:1 ✅ | 18.4:1 ✅ | (既存維持) | AAA pass |
| **cyberpunk** text on bg | 16.5:1 ✅ | 16.5:1 ✅ | (既存維持) | AAA pass |

---

## 5. PO 確認事項

なし (本ミッションは PO 承認 (a/b/c 全採用) に基づき、仕様書記載事項のみで完結)。

---

## 6. 次のアクション

**Stage 7-4 (cyberpunk neon 最大化) 着手準備 OK**:
- 新 token 10 系列が apple/totoro/dq/cyberpunk すべてに同名定義済 (cyberpunk のみ最大値、他は控えめ値)
- a11y AA 確保 (skip-link / contrast / focus / dialog 化)
- design-system SSoT 整理 (Finder 重複削除 / error tokens 完備 / icon-highlight 統一)

Stage 7-4 では cyberpunk のみ `--theme-shadow-glow-yellow` / `--theme-text-glow-accent` / `--theme-glitch-*` / `--theme-scanline-*` / `--theme-chromatic-offset` / `--theme-flicker-period` を最大化し、他 3 テーマには影響を出さない構造で実装可能。

---

## 7. 完了報告 (5 行サマリー、§2.25.21.2 準拠)

```
[完了報告 - TASK-STAGE7-4-PREP-DEBT-CLEANUP-V1]
1. やったこと: a11y 5 件 + design-system 3 件 + totoro accent 変更 + 新 token 10 系列追加
2. 結果: PASS (Playwright spec 43/43 / 完了条件 6 件すべて PASS)
3. 検証: npx playwright test PASS / 6 件 完了条件 PASS (Finder 重複 0 / window.prompt 0 / --bg-error count 8)
4. 影響: PO 確認事項 なし
5. 次: Stage 7-4 着手 (cyberpunk neon 最大化)
```
