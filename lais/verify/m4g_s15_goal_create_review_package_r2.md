# Lais M4-G R2 実装レビューパッケージ — S-15 Goal Create

> R1 ゴールデン (GPT-5 × 7 ペルソナ) 結果: CRITICAL 1 / HIGH 12 / 計82
> R2 スコープ: R1 検出の CRITICAL 1 件を修正 + M4-D で見逃されていた同種問題の横展開修正
> 3ペルソナ判定: PD-101（CRITICAL 棄却禁止）+ PD-006（既存画面の同種問題も同時修正）

---

## R1 CRITICAL 対応記録

### CRITICAL-1 (a11y_engineer R-001): プレーン div への `aria-readonly="true"` は WAI-ARIA 違反

**R1 指摘:**
> S15-5 期限ピッカー (`.s15-readonly-with-icon`): `<div>` に `aria-readonly="true"` を付与しており、WAI-ARIA で当該ロール（なし）に許可されていない state/property を使用。SC 4.1.2 (Name, Role, Value) 違反の恐れ。

**R2 対応:**
- `aria-readonly` 属性は `role="textbox"` `"combobox"` `"grid"` など特定ロールにしか適用できない。プレーン `<div>` は default role がないため、`aria-readonly` は invalid ARIA state として破棄される。
- 読み取り専用表示は **視覚的プレースホルダー** のみでインタラクション不要 → `aria-readonly` を削除。将来インタラクション可能にする際は `<input readonly>` へ変更する方針をコメントで明示。

### 横展開: M4-D S12TaskAdd.jsx の同種問題も修正

M4-D R1 では a11y_engineer が **この点を指摘しなかった**（見逃し）が、M4-G で発見された以上、同じコードパターンが S-12 にも存在するため同時修正する（PD-006 品質最優先）。

- `S12TaskAdd.jsx` `.s12-readonly-with-icon`（予定日）: `aria-readonly="true"` 削除
- `S12TaskAdd.jsx` `.s12-readonly-with-chevron`（ゴール紐付け）: `aria-readonly="true"` 削除

S-13 は該当箇所なし（grep 確認済み）。

---

## 変更ファイル（R1 → R2 差分）

### lais/src/components/screens/S15GoalCreate.jsx — S15-5 のみ

```jsx
{/*
  R2 a11y fix R-001 (WCAG 4.1.2 Name/Role/Value):
  aria-readonly は role="textbox"/combobox/etc に限定されるため、
  プレーン div では無効。読み取り専用表示は視覚のみなので aria 属性を外す。
  インタラクション可能になった時点で <input readonly> に変更する。
*/}
<div class="s15-date s15-input s15-readonly-with-icon">
  <span>{dueLabel}</span>
  <svg width="14" height="14" ...>...</svg>
</div>
```

### lais/src/components/screens/S12TaskAdd.jsx — S12-9 / S12-10

```jsx
{/* S12-9 予定日 */}
<div class="s12-readonly s12-input s12-readonly-with-icon">
  <span>{type === 'single' ? '今日' : RECURRENCE_DEFAULT}</span>
  <svg .../>
</div>

{/* S12-10 ゴール紐付け */}
<div class="s12-readonly s12-input s12-readonly-with-chevron">
  <span>なし</span>
  <svg .../>
</div>
```

（両方とも `aria-readonly="true"` を削除）

---

## 未対応 (HIGH 以下) の扱い

R1 で検出された HIGH 12 / MEDIUM 30 / LOW 39 は PD-006 に従い **Phase A 完了後まとめて対応**。security_engineer の HIGH 1 件は session_progress.md 提案ログ記録予定（PD-102）。

---

## レビュアーへの依頼

1. CRITICAL-1 (a11y) が正しく解消されているか
2. CRITICAL が 0 件であることを確認
3. HIGH 以下は許容（Phase A 完了後一括対応）

JSON 形式で指摘ください。
