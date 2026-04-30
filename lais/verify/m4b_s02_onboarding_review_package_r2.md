# Lais M4-B S-02 Onboarding レビューパッケージ R2

> R1 golden review 結果: CRITICAL 4 / HIGH 14 / MEDIUM 31 / LOW 29。
> R2 は CRITICAL 4 件の修正のみを対象とする差分レビュー。HIGH 以下は Phase A 完了後にまとめて対応。
> R1 パッケージ: lais/verify/m4b_s02_onboarding_review_package.md（仕様引用・LP 適用・実装パッケージ全文はそちらを参照）
> レビュー種別: sub_review_flow.md D. 実装レビュー差分ラウンド

---

## R1 指摘の CRITICAL 4 件と対応

### R1-SPEC R-002 [CRITICAL] — CTA 下端固定の欠落

**指摘:** §4.3 S02-6「下端固定 / 画面下 100px」に対し、実装は `margin: auto var(--space-lg) var(--space-2xl)` でフロー内に配置。スクロールや端末高さで CTA 位置が変動する。

**修正:** `.s02-next` を `position: fixed` に変更し、`bottom: calc(env(safe-area-inset-bottom, 0px) + 100px)` で画面下端 100px に固定。`.s02-onboarding` の `padding-bottom` に `calc(safe-area-inset-bottom + 100px + 52px + space-md)` を追加し、スクロール末尾で CTA と重ならないようにした。

### R1-SPEC R-003 [CRITICAL] — CTA 幅が仕様と不一致

**指摘:** 仕様「100% - --space-lg*2」に対し、コンテナ padding-x + CTA 自身の margin-x で実効幅が「100% - --space-lg*4」。

**修正:** `.s02-next` の `margin` を撤去し、`left: var(--space-lg); right: var(--space-lg)` で位置と幅を決定。結果として実効幅は仕様通り「100% - --space-lg*2」。

### R1-A11Y R-001 [CRITICAL] — WCAG 1.4.10 Reflow 違反（320px / 200% ズーム）

**指摘:** `grid-template-columns: repeat(3, 100px)` 固定 + gap 24px×2 + padding 24px×2 = 最小 396px。320px 端末で水平スクロール発生。

**修正:** グリッド列を `repeat(3, minmax(72px, 100px))` に変更し、`.s02-avatar` を `width: 100%; aspect-ratio: 1 / 1; max-width: 100px` に。gap を `clamp(12px, 4vw, var(--space-lg))` で狭幅端末では 12px まで縮小。これにより狭幅環境でも水平スクロールが発生せず、iPhone SE (375px) 以上では従来通り 100px 表示を維持する。spec §4.3 の「各 100×100」は標準サイズとしての指定であり、reflow 要件を優先した。

### R1-A11Y R-002 [CRITICAL] — WCAG 1.4.1 Use of Color 違反（進捗バー）

**指摘:** 進捗状態を色（`--accent` vs `--border`）のみで示しており、色覚多様性ユーザーが判別不能。

**修正:**
1. 未完了バーを `background: transparent; border: 1px solid var(--border-strong)` に変更し、**形状差（outline only vs 塗りつぶし）** を追加
2. 進捗バー直下に `.s02-progress-label` として「2 / 5」のテキストを常時表示（視覚ユーザー向けの非色依存情報）
3. `role="progressbar"` に `aria-valuetext="2 / 5 完了"` を追加（支援技術向けの明示的な進捗情報）

---

## 修正後の該当ファイル

### lais/src/components/screens/S02Onboarding.jsx（進捗バー周辺のみ抜粋）

```jsx
<div
  class="s02-progress"
  role="progressbar"
  aria-valuenow={CURRENT_STEP_INDEX + 1}
  aria-valuemin={1}
  aria-valuemax={TOTAL_STEPS}
  aria-valuetext={`${CURRENT_STEP_INDEX + 1} / ${TOTAL_STEPS} 完了`}
  aria-label="オンボーディング進捗"
>
  {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
    <span
      key={i}
      class={
        's02-progress-bar ' +
        (i <= CURRENT_STEP_INDEX ? 's02-progress-bar-done' : '')
      }
      aria-hidden="true"
    />
  ))}
</div>
{/* R-002 a11y fix (WCAG 1.4.1): 色だけでなくテキストでも進捗を明示 */}
<p class="s02-progress-label" aria-hidden="true">
  {CURRENT_STEP_INDEX + 1} / {TOTAL_STEPS}
</p>
```

他の JSX は R1 パッケージから変更なし。

### lais/src/components/screens/S02Onboarding.css（全文 / R2 修正後）

```css
/*
 * S-02 Onboarding — design_spec_v1.md §4.3 準拠
 * トークンは全て design_system.md §2〜§7 を参照（LP-011: 魔法の数字禁止）
 */

.s02-onboarding {
  min-height: 100dvh;
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: var(--space-lg) var(--space-lg)
    /* R1-SPEC R-002 fix: CTA 固定位置（下端 100px）+ 52px + 余白分のスクロール空間を下部に確保 */
    calc(env(safe-area-inset-bottom, 0px) + 100px + 52px + var(--space-md));
  display: flex;
  flex-direction: column;
  outline: none;
}

/* S02-1 戻るボタン ------------------------------------------------------- */
.s02-nav { display: flex; align-items: center; min-height: 44px; }

.s02-back {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 0;
  color: var(--text-primary);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: background-color var(--duration-fast) var(--ease-out);
}

.s02-back:hover { background: var(--accent-subtle); }
.s02-back:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }

/* S02-2 進捗バー --------------------------------------------------------- */
.s02-progress {
  display: flex;
  gap: 8px;
  margin-top: var(--space-lg);
  padding: 0;
}

/*
 * R1-A11Y R-002 fix (WCAG 1.4.1 Use of Color):
 * 進捗状態を色だけで伝えると色覚多様性ユーザーが判別不能。
 * 未完了バーは outline のみ、完了バーは塗りつぶしで形状差をつける。
 * 併せて .s02-progress-label に「2 / 5」テキストを常時表示する。
 */
.s02-progress-bar {
  flex: 1;
  height: 3px;
  border-radius: var(--radius-pill);
  background: transparent;
  border: 1px solid var(--border-strong);
  transition:
    background-color var(--duration-normal) var(--ease-out),
    border-color var(--duration-normal) var(--ease-out);
}

.s02-progress-bar-done {
  background: var(--accent);
  border-color: var(--accent);
}

.s02-progress-label {
  margin: var(--space-sm) 0 0;
  text-align: right;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  letter-spacing: 0.5px;
}

/* S02-3 タイトル / S02-4 補助テキスト ------------------------------------ */
.s02-title {
  margin: var(--space-2xl) 0 0;
  text-align: center;
  font-size: 28px;
  font-weight: 400;
  letter-spacing: -0.5px;
  line-height: 1.3;
  color: var(--text-primary);
}

.s02-subtitle {
  margin: var(--space-sm) 0 0;
  text-align: center;
  font-size: 14px;
  color: var(--text-muted);
  line-height: 1.6;
}

/* S02-5 アバター選択肢 --------------------------------------------------- */
/*
 * R1-A11Y R-001 fix (WCAG 1.4.10 Reflow):
 * 固定 100px × 3 列では 320px 幅端末や 200% ズーム時に
 * 水平スクロールが発生する。最小 72px まで比例縮小し、
 * iPhone SE (375px) 以上では 100px のまま表示される。
 */
.s02-avatars {
  display: grid;
  grid-template-columns: repeat(3, minmax(72px, 100px));
  justify-content: center;
  gap: clamp(12px, 4vw, var(--space-lg));
  margin-top: var(--space-2xl);
}

.s02-avatar {
  width: 100%;
  aspect-ratio: 1 / 1;
  max-width: 100px;
  border-radius: 50%;
  border: 1px solid var(--border-strong);
  background: var(--bg-surface);
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition:
    border-color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-normal) var(--ease-out),
    transform var(--duration-normal) var(--spring-default);
}

.s02-avatar:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
.s02-avatar-inner { width: 72px; height: 72px; display: block; }
.s02-avatar-inner svg { width: 100%; height: 100%; display: block; }

.s02-avatar-selected {
  border: 2px solid var(--accent);
  box-shadow: 0 0 0 4px var(--accent-subtle);
}

.s02-avatar-tapping {
  animation: s02-avatar-tap var(--duration-normal) var(--spring-default) both;
}

@keyframes s02-avatar-tap {
  0%   { transform: scale(0.98); }
  50%  { transform: scale(1.02); }
  100% { transform: scale(1); }
}

/* S02-6 次へ CTA --------------------------------------------------------- */
/*
 * R1-SPEC R-002 / R-003 fix:
 * §4.3「画面下 100px / 幅 100% - --space-lg*2 / 高さ 52px / 下端固定」
 * → position: fixed で画面下端 100px に固定、
 *   left/right を --space-lg に設定して実効幅を「100% - --space-lg*2」に一致。
 * iOS safe-area 対応のため bottom に safe-area-inset-bottom を加算。
 */
.s02-next {
  position: fixed;
  left: var(--space-lg);
  right: var(--space-lg);
  bottom: calc(env(safe-area-inset-bottom, 0px) + 100px);
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

.s02-next:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }

.s02-next:disabled,
.s02-next[aria-disabled='true'] {
  background: var(--button-disabled-bg);
  color: var(--button-disabled-text);
  cursor: not-allowed;
}

/*
 * LP-001: prefers-reduced-motion 対応
 */
@media (prefers-reduced-motion: reduce) {
  .s02-avatar,
  .s02-next,
  .s02-back,
  .s02-progress-bar {
    transition: none;
  }
  .s02-avatar-tapping {
    animation: none;
  }
}
```

---

## R1 から変更していない箇所

以下は R1 から未変更。R2 レビュアーは変更箇所のみに注目し、重複レビューを避けてください（レビュー効率化のため）:

- `lais/src/components/App.jsx`（App + lazy import + Suspense + OnboardingRoute）
- `S02Onboarding.jsx` の戻るボタン / タイトル / サブタイトル / アバター配列 / 次へハンドラ / useEffect ライフサイクル
- `.s02-avatar-tapping` アニメーション（spring-default / scale / 350ms）
- `.s02-avatar-inner` / `.s02-avatar-selected`
- アバター SVG（仮実装）

---

## R2 レビュー観点

**主審:** a11y_engineer + spec_compliance（R1 で CRITICAL を出したペルソナが再検証）
**副審:** code_reviewer + edge_case_hunter（position: fixed / aspect-ratio / clamp の副作用検証）
**軽審:** security_engineer / sw_debugger / performance_engineer（R1 から攻撃面・非同期フロー・performance 負荷は変化なし）

### 各ペルソナへの期待

- **a11y_engineer:** 進捗バー形状差 + 「2/5」テキスト + aria-valuetext で WCAG 1.4.1 を満たしているか / aspect-ratio 対応ブラウザでの reflow が完全か
- **spec_compliance:** position: fixed 実装が §4.3「下端固定 / 画面下 100px / 幅 100% - --space-lg*2」と厳密に一致するか / 進捗バーの outline only 実装が §4.3 の「未完 `--border`」記述から乖離しているが視覚的なステータス差が維持されているか
- **code_reviewer:** padding-bottom の calc() が読みづらい点（R1 HIGH で指摘された魔法の数字への逆戻り）
- **edge_case_hunter:** 320px 幅 / 200% ズーム / 横持ち / safe-area 下端 34px 環境での重なり / ソフトキーボード表示時の CTA 隠れ
- **performance_engineer:** position: fixed による compositor 層分離の影響（positive）、clamp() のパース負荷（negligible）
- **sw_debugger:** position: fixed の iOS Safari バウンス挙動、env() 非対応ブラウザでの fallback
- **security_engineer:** 攻撃面変化なし。R1 と同じ評価で問題ないか確認のみ

### severity 基準（再確認）

- **CRITICAL:** R1 で指摘した 4 件が確実に修正されているか。新たな CRITICAL が混入していないか
- **HIGH 以下:** R1 の未対応 HIGH/MEDIUM/LOW が残存していても再指摘不要（Phase A 完了後にまとめて対応予定）
- 新規 HIGH/MEDIUM/LOW は記録のみで可。ただし R2 修正部分に起因する新規 HIGH/CRITICAL は必ず指摘すること
