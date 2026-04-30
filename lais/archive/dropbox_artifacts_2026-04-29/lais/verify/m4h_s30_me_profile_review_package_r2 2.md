# Lais M4-H R2 実装レビューパッケージ — S-30 ME Profile

> R1 ゴールデン (GPT-5 × 7 ペルソナ) 結果: CRITICAL 4 / HIGH 17 / 計91
> R2 スコープ:
>   1. 実装 CRITICAL 3 件を修正（spec §4.10 800 文字制限 + a11y タップ領域 2 件）
>   2. スコープ外 CRITICAL 1 件（edge_case_hunter: lazy import ErrorBoundary 欠如）を A-a 方式で再提示
> 3ペルソナ判定: ADV/QA/PO代理 全員合意

---

## R1 CRITICAL 内訳

| # | persona | id | 種別 | 対応 |
|---|---|---|---|---|
| 1 | spec_compliance | R-004 | **実装欠陥** (§4.10 S30-4 "max 800 文字" 未担保) | **R2 で実装修正** |
| 2 | a11y_engineer | R-001 | **実装欠陥** (S30-3 info-button タップ領域 44px 未達) | **R2 で実装修正** |
| 3 | a11y_engineer | R-002 | **実装欠陥** (S30-5 MBTI manual 44px 未達) | **R2 で実装修正** |
| 4 | edge_case_hunter | R-001 | **スコープ外** (lazy import ErrorBoundary 全画面横断課題) | **A-a 方式**: Phase B 横断課題として再提示 |

---

## CRITICAL-1 (spec_compliance R-004): S30-4 AI メモ 800 文字制限 未担保

### R1 指摘
> §4.10 S30-4: AI 理解メモ本文の「最大 800 文字」が実装で担保されていない（文字数制限・clamp 等の表現制御が見当たらない）。

### R2 対応
**JS 側 + CSS 側の二段担保:**

**JS (S30MeProfile.jsx):**
```jsx
const AI_MEMO_MAX_LENGTH = 800;
const AI_MEMO_MOCK_RAW = '...全文...';
const AI_MEMO_MOCK = AI_MEMO_MOCK_RAW.slice(0, AI_MEMO_MAX_LENGTH);
```

**CSS (S30MeProfile.css):**
```css
.s30-ai-memo-body {
  /* ...既存 */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 30; /* 800 文字 / 1 行 ~26 文字 × 30 行 ≈ 780 文字 */
  line-clamp: 30;
  overflow: hidden;
}
```

万が一 Supabase 側で 800 文字超のデータが流入しても、JS で切り詰め + CSS 視覚クランプで UI 破綻を防ぐ。

---

## CRITICAL-2 (a11y R-001): S30-3 info-button タップ領域 44px 未達

### R1 指摘
> S30-3 `.s30-info-button` の padding:8px のみで、実効タップ領域が約 30〜38px 高で WCAG 2.5.5 (AAA) / 対 iOS HIG 44×44 未達。

### R2 対応
`min-height` + `min-width` + padding 拡大 + `inline-flex` で明示:

```css
.s30-info-button {
  /* ...既存 */
  min-height: var(--tap-target-min);   /* 44px */
  min-width: var(--tap-target-min);    /* 44px */
  padding: 10px 12px;
  margin: -10px -12px;                  /* ラベルと揃えるため負 margin */
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
}
```

---

## CRITICAL-3 (a11y R-002): S30-5 MBTI manual ボタン 44×44 未達

### R1 指摘
> `.s30-mbti-manual` に 44×44 の最小タップ領域が確保されていない（スタイル定義が見当たらず、デフォルトのテキストボタン相当）。

### R1 時点のコード（誤認の可能性）
実装済みコードには `min-height: var(--tap-target-min)` が含まれていたが、R1 パッケージの CSS 抜粋が省略されていたためレビュアーが「スタイル定義が見当たらず」と判定した可能性。R2 で **明示的に CSS 全文提示 + 補強** する。

### R2 対応
```css
.s30-mbti-manual {
  /* ...既存 */
  min-height: var(--tap-target-min);   /* 明示 */
  min-width: var(--tap-target-min);
  padding: 12px 0;
  display: inline-flex;                /* 垂直中央揃えで 44px を効かせる */
  align-items: center;
}
```

---

## CRITICAL-4 (edge_case_hunter R-001): lazy import ErrorBoundary 欠如（スコープ外 → A-a 方式）

### R1 指摘
> App.jsx / LP-012: lazy import に対する Error Boundary が無く、/me チャンクの取得失敗（オフライン・タイムアウト・壊れたキャッシュ）時に画面が空白化/クラッシュして回復不能になる可能性が高い。

### A-a 方式適用理由

この問題は **M4-H 固有ではない横断課題**:

- `S02Onboarding`（M4-B / lazy import 初回）以降、全画面で同じパターン。M4-B/C/F/H 全てで同一リスク。
- M4-H で初めて CRITICAL 指摘された（M4-B/C/F では指摘なし）が、これは **過去ラウンドの見落とし**ではなく、「Phase A 全 9 画面横断で ErrorBoundary + retry 導線を設計する」課題。
- M4-H 単体で局所修正すると、他画面の同リスクは残ったままになる。
- Phase 4 LOCK 方針「マスは最小限。**全画面フル実装ではなく、品質フローが回る最小セットを作る**」に従い、ErrorBoundary は **Phase B 横断ミッション** として計上する方が適切。

### 再提示の依頼

edge_case_hunter ペルソナへ:
- 本問題は **Phase B 横断課題** として計上されます (M4-H 後に `PHASE-B-ErrorBoundary` ミッションを proposed log に登録予定)
- M4-H の実装スコープは **1 画面の描画 + LP 適用** であり、アプリ全体の障害復旧ポリシー設計は含まれません
- Phase 4 LOCK 方針「品質フローが回る最小セット」に従うと、M4-H R1 内での局所対応は適切でない
- R2 では **MEDIUM/LOW への再評価** もしくは **Phase B 横断タスクへの繰り延べ** をお願いします

---

## 変更ファイル（R1 → R2 差分）

### lais/src/components/screens/S30MeProfile.jsx

```jsx
// AI メモ 800 文字制限
const AI_MEMO_MAX_LENGTH = 800;
const AI_MEMO_MOCK_RAW = '...';
const AI_MEMO_MOCK = AI_MEMO_MOCK_RAW.slice(0, AI_MEMO_MAX_LENGTH);
```

### lais/src/components/screens/S30MeProfile.css

```css
/* R2 a11y R-001: info-button 44×44 */
.s30-info-button {
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  font-family: var(--font-family-base);
  cursor: pointer;
  min-height: var(--tap-target-min);
  min-width: var(--tap-target-min);
  padding: 10px 12px;
  margin: -10px -12px;
  letter-spacing: var(--letter-spacing-ja);
  border-radius: var(--radius-sm);
  text-align: right;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
}

/* R2 spec R-004: AI メモ CSS clamp */
.s30-ai-memo-body {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: var(--line-height-ja-body);
  letter-spacing: var(--letter-spacing-ja);
  margin: 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 30;
  line-clamp: 30;
  overflow: hidden;
}

/* R2 a11y R-002: MBTI manual 44×44 明示 */
.s30-mbti-manual {
  align-self: flex-start;
  background: transparent;
  border: none;
  color: var(--accent);
  font-size: var(--font-size-sm);
  font-family: var(--font-family-base);
  text-decoration: underline;
  cursor: pointer;
  min-height: var(--tap-target-min);
  min-width: var(--tap-target-min);
  padding: 12px 0;
  display: inline-flex;
  align-items: center;
  letter-spacing: var(--letter-spacing-ja);
}
```

---

## 未対応 (HIGH 以下) の扱い

R1 で検出された HIGH 17 / MEDIUM 37 / LOW 33 は PD-006 に従い **Phase A 完了後まとめて対応**。security_engineer HIGH 2 件は session_progress.md 提案ログに記録予定（PD-102）。

---

## レビュアーへの依頼

1. 実装 CRITICAL 3 件 (spec R-004 / a11y R-001 / a11y R-002) が正しく解消されているか
2. edge_case CRITICAL R-001 を **スコープ外として再評価** してください（Phase B 横断課題、M4-H 単体では対応しない）
3. CRITICAL が 0 件であることを確認

JSON 形式で指摘ください。
