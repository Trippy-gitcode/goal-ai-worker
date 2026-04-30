# Lais M4-B S-02 Onboarding レビューパッケージ R4

> R3 golden review 結果: CRITICAL 1 / HIGH 2 / MEDIUM 9 / LOW 12
> R4 は R3 CRITICAL 1 件（`.s02-onboarding` の `outline: none` による focus indicator 抑制）の修正のみを対象
> 過去パッケージ: r1 (lais/verify/m4b_s02_onboarding_review_package.md) / r2 / r3
> レビュー種別: sub_review_flow.md D. 実装レビュー差分ラウンド

---

## R3 指摘の CRITICAL 1 件と対応

### R3-A11Y R-201 [CRITICAL] — outline: none が WCAG 2.4.7 Focus Visible 違反

**指摘:** `.s02-onboarding` に `outline: none` を無条件で指定しており、LP-002 に基づく programmatic focus 移動後に、キーボードユーザーがさらに Tab キーで main 要素へフォーカスを戻した場合でも outline が表示されない。WCAG 2.2 AA 2.4.7 Focus Visible 違反の可能性。

**修正:** `outline: none` を削除し、`:focus-visible` を使って「programmatic focus（SR 遷移通知用）」と「キーボード駆動 focus」を区別する:

```css
/* programmatic focus（route 直後の main.focus() 呼び出し）では outline を出さない */
.s02-onboarding:focus:not(:focus-visible) {
  outline: none;
}

/* キーボードユーザーが Tab で到達した場合は可視リングを表示 */
.s02-onboarding:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: -3px;
}
```

これにより:
- SPA 遷移直後の LP-002 による `mainRef.current.focus()` では outline を出さない（視覚ノイズ防止）
- キーボードユーザーが Shift+Tab で main に戻した場合は outline が出る（WCAG 2.4.7 準拠）
- SR ユーザーには変化なし（focus イベント発火は継続するため支援技術への通知は維持）

---

## 修正後の該当 CSS（変更ブロックのみ）

```css
.s02-onboarding {
  min-height: 100dvh;
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: var(--space-lg) var(--space-lg)
    calc(100px + 52px + var(--space-md));
  display: flex;
  flex-direction: column;
}

/*
 * R3-CRIT R-201 fix (WCAG 2.4.7 Focus Visible):
 * LP-002 で SPA 遷移直後に main へ programmatic focus() を行うため、
 * 無条件の `outline: none` はキーボードユーザーからもインジケータを奪う。
 * :focus-visible を使って「キーボード駆動以外の focus（programmatic focus）」
 * のみ outline を抑制し、キーボードユーザーには従来通り可視リングを出す。
 */
.s02-onboarding:focus:not(:focus-visible) {
  outline: none;
}

.s02-onboarding:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: -3px;
}
```

他の CSS は R3 から変更なし。特に:
- `@supports` による env() 段階的フォールバック（R2 → R3 で修正済）
- 進捗バー outline only + `.s02-progress-label`（R1 → R2 で WCAG 1.4.1 対応済）
- アバターグリッド `minmax(72px, 100px)` + `clamp()` gap（R1 → R2 で WCAG 1.4.10 対応済）
- `.s02-next` 固定位置（R1 → R2 で仕様準拠）

---

## R4 レビュー観点

### 主審（R3 で CRITICAL を出した a11y_engineer）

- `:focus:not(:focus-visible)` / `:focus-visible` のカスケードが正しく機能するか
- programmatic focus（`mainRef.current.focus()`）時に outline が確実に消えるか
- キーボードユーザーが Tab で到達した場合に可視リングが表示されるか
- `:focus-visible` の古いブラウザ対応（Safari 15.4+ / Chrome 86+ / Firefox 85+）— Lais のターゲットブラウザ範囲内か

### 軽審（他 6 ペルソナ）

- R3 から変化なし。新規 CRITICAL が混入していないことのみ確認
- `outline-offset: -3px` の負値によるレイアウト影響（compositor only で layout shift なし）

### severity 基準

- **CRITICAL:** R3 の outline: none 問題が解消されているか。新たな CRITICAL が混入していないか
- **HIGH 以下:** 全て Phase A 完了後にまとめて対応予定。再指摘不要

---

## ビルド結果

```
dist/assets/S02Onboarding-*.css    3.70 kB │ gzip: 1.11 kB
✓ built in 406ms
```

パースエラーなし。
