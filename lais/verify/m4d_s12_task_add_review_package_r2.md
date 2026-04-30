# Lais M4-D R2 実装レビューパッケージ — S-12 Task Add

> R1 ゴールデン (GPT-5 × 7 ペルソナ) 結果: CRITICAL 2 / HIGH 22 / MEDIUM/LOW 59
> R2 スコープ: **R1 で検出された CRITICAL 2 件を修正**。HIGH 以下は PD-006 に従い Phase A 完了後一括対応。
> レビュー種別: sub_review_flow.md D. 実装レビュー（R2 修正ラウンド）
> 3ペルソナ制判定: PD-101（外部AI CRITICAL 棄却禁止）→ 両 CRITICAL とも対応必須と確定。ADV/QA/PO代理 3者合意

---

## R1 CRITICAL 対応記録

### CRITICAL-1 (spec_compliance R-001): §4.5 S12-9 予定日のカレンダーアイコン実装漏れ

**R1 指摘:** S12-9 予定日フィールド右側の `14px` カレンダーSVG（stroke `--text-muted`）が実装されていない

**R2 対応:** `S12TaskAdd.jsx` の S12-9 ブロックに 14×14 カレンダーSVG を追加し、`.s12-readonly-with-icon` クラスで `justify-content: space-between` + `svg color: var(--text-muted)` を適用

### CRITICAL-2 (a11y_engineer R-001): WCAG 1.4.11 Non-text Contrast 3:1 未達（Active ピル/チップ）

**R1 指摘:** `.s12-type-pill-active` / `.s12-duration-chip-active` が `border-color: transparent` で、`--accent-subtle` (`rgba(121,192,255,0.14)`) を `--bg-surface` `#161B22` 上に塗るだけの状態だと、コンポーネント境界コントラストが ≈1.33:1 で WCAG 1.4.11 未達

**R2 対応:** Active 時も `border-color: var(--accent)` を残す。`--accent` `#79C0FF` on `--bg-surface` `#161B22` = **8.46:1** で 3:1 を大幅クリア

---

## 変更ファイル（R1 → R2 差分）

### 1. lais/src/components/screens/S12TaskAdd.jsx（S12-9 ブロックのみ）

```jsx
{/* S12-9 予定日 ⇄ 繰り返し周期（種別で swap） */}
<div class="s12-field">
  <span class="s12-label">{type === 'single' ? '予定日' : '繰り返し周期'}</span>
  <div
    class="s12-readonly s12-input s12-readonly-with-icon"
    aria-readonly="true"
  >
    <span>{type === 'single' ? '今日' : RECURRENCE_DEFAULT}</span>
    {/* R2 spec fix R-001: §4.5 S12-9 要求 — 14px カレンダーアイコン */}
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2" y="3" width="10" height="9" rx="1.5" stroke="currentColor" stroke-width="1.2" />
      <path d="M5 1.5v2M9 1.5v2M2 6h10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
    </svg>
  </div>
</div>
```

### 2. lais/src/components/screens/S12TaskAdd.css（該当 3 ブロック）

```css
/*
 * R2 a11y fix R-001 (WCAG 1.4.11 Non-text Contrast 3:1):
 * Active 状態を塗りのみで示すと、--accent-subtle (rgba(121,192,255,0.14))
 * は --bg-surface #161B22 に対し ≈1.33:1 で WCAG 1.4.11 未達。
 * 可視 border を --accent で残すことで、#79C0FF on #161B22 ≈ 8.46:1 を確保する。
 */
.s12-type-pill-active {
  background: var(--accent-subtle);
  color: var(--accent);
  font-weight: var(--font-weight-semibold);
  border-color: var(--accent);
}

/* R2 a11y fix R-001: 同上 WCAG 1.4.11 確保 */
.s12-duration-chip-active {
  background: var(--accent-subtle);
  color: var(--accent);
  font-weight: var(--font-weight-semibold);
  border-color: var(--accent);
}

/* R2 spec fix R-001 (§4.5 S12-9): 予定日 右側 14px カレンダーアイコン */
.s12-readonly-with-icon {
  justify-content: space-between;
}

.s12-readonly-with-icon svg {
  color: var(--text-muted);
  flex-shrink: 0;
}
```

---

## 未対応 (HIGH 以下) の扱い

R1 で検出された HIGH/MEDIUM/LOW 計 81 件は PD-006（品質最優先だがスピードとのバランス）に従い **Phase A 完了後まとめて対応**。security_engineer の HIGH 3 件は session_progress.md 提案ログに個別記録予定（PD-102）。

R2 レビューの目的は **CRITICAL 0 の確定**。HIGH 以下が再出現しても許容（CRITICAL 0 で R2 終了）。

---

## 仕様引用（CRITICAL 対応根拠）

### §4.5 S12-9 予定日（該当行のみ）

> S12-9 | 予定日 | S12-6 と同スタイル / 値 `今日` / 右に `14px` カレンダー SVG stroke `--text-muted`

### design_system.md §5.0 A / WCAG 1.4.11

> Active / Selected 状態を示すビジュアル要素は、背景（隣接色）に対して 3:1 以上の非テキストコントラストを満たすこと。

`--accent` `#79C0FF` / `--bg-surface` `#161B22` = **8.46:1** → 3:1 大幅クリア

---

## レビュアーへの依頼

1. R1 の CRITICAL 2 件が正しく解消されているか確認
2. CRITICAL が 0 件であることを確認
3. HIGH 以下は検出しても OK（Phase A 完了後一括対応予定のため新規 CRITICAL のみ注視）

JSON 形式で指摘ください（severity / category / title / evidence / recommendation）。
