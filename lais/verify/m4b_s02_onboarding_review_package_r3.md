# Lais M4-B S-02 Onboarding レビューパッケージ R3

> R2 golden review 結果: CRITICAL 4（4 ペルソナが同一の env() フォールバック問題を指摘）/ HIGH 6 / MEDIUM 21 / LOW 30
> R3 は CRITICAL 4 件すべてが同一トピック「env() のフォールバック引数」の修正のみを対象とする差分レビュー
> R1 パッケージ: lais/verify/m4b_s02_onboarding_review_package.md
> R2 パッケージ: lais/verify/m4b_s02_onboarding_review_package_r2.md
> レビュー種別: sub_review_flow.md D. 実装レビュー差分ラウンド

---

## R2 指摘の CRITICAL 4 件と対応

### R2-A11Y R-101 / R-102, R2-CODE R-101, R2-EDGE R-101 [CRITICAL × 4]

**指摘（4 ペルソナから同一内容）:**
`env(safe-area-inset-bottom, 0px)` のように env() に第 2 引数（フォールバック）を渡すと CSS パーサがプロパティ全体を破棄し、`bottom` / `padding-bottom` が無効化される。結果として CTA の固定位置が崩れ、コンテナ下部の余白も消失してコンテンツと重なる可能性がある。

**修正方針:**
env() の第 2 引数を使わず、**段階的フォールバック（宣言順 + `@supports`）** で書き換える。
1. 最初に env() 不使用の値を設定（全ブラウザで有効）
2. 直後に `@supports (bottom: env(safe-area-inset-bottom))` 内で safe-area 対応ブラウザ向けに上書き

**R3 で確認してほしいこと:**
- 4 ペルソナすべて（a11y_engineer / code_reviewer / edge_case_hunter + その他）で R-101 / R-102 が解消されているか
- 同じトピックで別の CRITICAL が混入していないか（例: `@supports` のセレクタ詳細度問題 / カスケード順の取り違え）

---

## 修正後の該当 CSS 全文（S02Onboarding.css）

```css
/*
 * S-02 Onboarding — design_spec_v1.md §4.3 準拠
 * トークンは全て design_system.md §2〜§7 を参照
 */

/*
 * R2-CRIT R-101 fix: env() の第 2 引数（フォールバック）は CSS 仕様では
 * 有効だが、主要ブラウザ実装での誤解リスク + レビュアー指摘に合わせて
 * 段階的フォールバック（@supports 上書き）に変更する。
 * 1) まず env() 不使用の値を設定
 * 2) @supports で対応ブラウザのみ safe-area 加算に上書き
 */
.s02-onboarding {
  min-height: 100dvh;
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: var(--space-lg) var(--space-lg)
    calc(100px + 52px + var(--space-md));
  display: flex;
  flex-direction: column;
  outline: none;
}

@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .s02-onboarding {
    padding-bottom: calc(env(safe-area-inset-bottom) + 100px + 52px + var(--space-md));
  }
}

/* S02-1 戻るボタン / S02-2 進捗バー / S02-3 タイトル / S02-4 補助テキスト /
   S02-5 アバター / アニメーション は R2 から変更なし。詳細は r2 パッケージ参照。 */

/* S02-6 次へ CTA --------------------------------------------------------- */
/*
 * §4.3「画面下 100px / 幅 100% - --space-lg*2 / 高さ 52px / 下端固定」
 * position: fixed + left/right で幅決定。
 * safe-area 対応は下部 @supports で上書き。
 */
.s02-next {
  position: fixed;
  left: var(--space-lg);
  right: var(--space-lg);
  bottom: 100px;
  min-height: 52px;
  background: var(--button-primary-bg);
  color: var(--button-primary-text, #ffffff);
  border: none;
  border-radius: var(--radius-lg);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: var(--letter-spacing-ja);
  line-height: 1.25;
  cursor: pointer;
  transition:
    background-color var(--duration-fast) var(--ease-out),
    opacity var(--duration-fast) var(--ease-out);
}

.s02-next:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}

.s02-next:disabled,
.s02-next[aria-disabled='true'] {
  background: var(--button-disabled-bg);
  color: var(--button-disabled-text);
  cursor: not-allowed;
}

/* R2-CRIT R-101 fix: env() 対応ブラウザのみ safe-area を加算 */
@supports (bottom: env(safe-area-inset-bottom)) {
  .s02-next {
    bottom: calc(env(safe-area-inset-bottom) + 100px);
  }
}
```

**変更箇所:**
1. `.s02-onboarding` の `padding-bottom` 第 3 引数から `env(safe-area-inset-bottom, 0px)` を削除。env() 不使用の値 `calc(100px + 52px + var(--space-md))` をベースに設定
2. 直後に `@supports (padding-bottom: env(safe-area-inset-bottom)) { ... }` ブロックを追加し、対応ブラウザで safe-area を加算
3. `.s02-next` の `bottom` を `100px` に変更（env() 削除）
4. CSS 末尾に `@supports (bottom: env(safe-area-inset-bottom)) { ... }` ブロックを追加し、対応ブラウザで `bottom: calc(env(safe-area-inset-bottom) + 100px)` で上書き

**変更していない箇所（R2 から unchanged）:**
- 進捗バー / 進捗ラベル / `aria-valuetext`（R2 で WCAG 1.4.1 対応済み）
- アバターグリッド `minmax(72px, 100px)` + `aspect-ratio` + `clamp()` gap（R2 で WCAG 1.4.10 対応済み）
- CTA の `position: fixed` + `left/right: var(--space-lg)` / `min-height: 52px`（R2 で仕様幅・下端固定対応済み）
- JSX 側の a11y 属性（`role="radiogroup"` / `aria-labelledby` / `aria-valuetext` / `tabIndex={-1}` + focus 移動）
- LP-001〜LP-012 の適用

---

## ビルド結果

```
vite v5.4.21
✓ 66 modules transformed.
dist/assets/S02Onboarding-*.css    3.57 kB │ gzip: 1.09 kB
dist/assets/S02Onboarding-*.js     2.95 kB │ gzip: 1.44 kB
✓ built in 415ms
```

パースエラーなし。@supports ブロックを含む CSS は正常にバンドルされている。

---

## R3 レビュー観点

### 主審（R2 で CRITICAL を出した 4 ペルソナ）

- **a11y_engineer:** R-101 / R-102 の env() フォールバック問題が段階的フォールバックで解消されているか / `@supports` のカスケードが期待通り動作するか（safe-area 対応ブラウザ側で正しく上書きされるか）
- **code_reviewer:** `@supports` ブロックの配置（セレクタ詳細度の衝突がないか） / base 宣言 → `@supports` 上書きの宣言順が正しいか
- **edge_case_hunter:** `@supports` 未対応の古い環境で base 宣言のみ適用される動作（CTA が端末下端 100px に固定されるが safe-area 加算なし → ノッチ端末で 100px の視覚位置が変わるだけ。機能的には問題なし）

### 軽審（他 4 ペルソナ）

- **spec_compliance:** R2 から spec との関係は変化なし。重複指摘不要
- **edge_case_hunter / sw_debugger / performance_engineer / security_engineer:** R2 から変化なし。新規 CRITICAL が混入していないことのみ確認

### severity 基準

- **CRITICAL:** R2 の env() 問題 4 件が確実に修正されているか。`@supports` の誤用で新たな CRITICAL が混入していないか
- **HIGH 以下:** R2 の未対応 HIGH/MEDIUM/LOW は Phase A 完了後にまとめて対応予定。再指摘不要

severity inflation を避けること。R2 残存 HIGH/MEDIUM/LOW の再掲示は不要。
