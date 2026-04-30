# Lais M4-F R2 実装レビューパッケージ — S-14 Goal Detail

> R1 ゴールデン (GPT-5 × 7 ペルソナ) 結果: CRITICAL 6 / HIGH 17 / 計79
> R2 スコープ:
>   1. 実装 CRITICAL（a11y_engineer R-001）を修正
>   2. スコープ外 CRITICAL 5 件（spec_compliance R-001〜R-005）を **判断テーブル「スコープ外CRITICAL → A-a方式」** に従い、スコープ外として再提示してダウングレードを促す
> 3ペルソナ判定: ADV/QA/PO代理 全員合意（PD-101 適用 / PD-006）

---

## R1 CRITICAL 内訳

| # | persona | id | 種別 | 対応 |
|---|---|---|---|---|
| 1 | a11y_engineer | R-001 | **実装欠陥** (WCAG 1.4.1 色のみ依存) | **R2 で実装修正** |
| 2 | spec_compliance | R-001 | スコープ外（右スライド遷移アニメ） | **A-a方式**: スコープ外宣言済み |
| 3 | spec_compliance | R-002 | スコープ外（タスク行 → S-13 統合） | **A-a方式**: スコープ外宣言済み |
| 4 | spec_compliance | R-003 | スコープ外（チェックタップ動作 + Undo） | **A-a方式**: スコープ外宣言済み |
| 5 | spec_compliance | R-004 | スコープ外（削除確認ダイアログ + Undo） | **A-a方式**: スコープ外宣言済み |
| 6 | spec_compliance | R-005 | スコープ外（7日ルール演出） | **A-a方式**: スコープ外宣言済み |

---

## CRITICAL-1 (a11y_engineer R-001) 対応記録

### R1 指摘
> S14-8（タスク行）: タスク状態（active と scheduled）が色の違い（枠線色）だけで区別されており、非色覚ユーザーや低コントラスト環境では判別不能。WCAG 2.2 AA 1.4.1（色の使用）に違反。

### R2 対応
状態を **色 + 形 + 言葉** の三重で示すように変更:

1. **形（アイコン）の追加:**
   - `done` → チェックマーク SVG（既存）
   - `active` → **内部に塗りつぶしドット SVG を追加（新規）**
   - `scheduled` → 中空（アイコンなし、視覚的差別化）

2. **言葉（テキスト）の追加:**
   - `aria-label` を `${task.name} — ${task.meta}` から **`${statusLabel}: ${task.name} — ${task.meta}`** に変更
   - `statusLabel` = `'完了済み' | '進行中' | '予定'` を計算して prefix に挿入
   - スクリーンリーダーが読み上げる際、最初に状態名を発話することで非色覚ユーザーが状態を即座に把握可能

これにより、WCAG 1.4.1（色の使用）+ 1.3.3（感覚特性）の両方を満たす。

---

## R1 スコープ外 CRITICAL 5 件の再提示（A-a方式）

判断テーブル「スコープ外CRITICAL → A-a方式: スコープ明示して再レビュー」を適用。以下 5 件は **M4-F の実装スコープ外** として明示的に宣言済み。spec_compliance ペルソナへの再提示で、スコープ理解を共有してダウングレード判断を委ねる。

### M4-F の確定スコープ外項目（ミッション定義より引用）

> **スコープ外（後続）:**
> - 削除確認ダイアログ + Undo 30s
> - 編集モード（spec に inline edit 言及なし）
> - タスク行のチェックトグル動作（表示のみ）
> - タスク行タップ → S-13 統合
> - + タスクを追加 → S-12 統合
> - 7 日ルール演出（達成バナー + EXP 加算）
> - 右スライド遷移カスタムアニメ
> - AI 相談実遷移先
> - Supabase 連携

### スコープ外 CRITICAL → 各 R# が該当する理由

| R# | 内容 | 該当スコープ外項目 |
|---|---|---|
| R-001 (spec) | 右スライド遷移 ease-out 350ms | "右スライド遷移カスタムアニメ" |
| R-002 (spec) | タスク行 → S-13 ハーフモーダル | "タスク行タップ → S-13 統合" |
| R-003 (spec) | チェックタップ → スプリングアニメ + Undo | "タスク行のチェックトグル動作" |
| R-004 (spec) | 削除確認ダイアログ → 実行 + Undo 30s | "削除確認ダイアログ + Undo 30s" |
| R-005 (spec) | 7 日ルール演出 | "7 日ルール演出" |

### Phase 4 全体方針（PD-006）

PD-006「品質最優先だがスピードとのバランス」+ Phase 4 LOCK 方針「**マスは最小限。** 全画面フル実装ではなく、品質フローが回る最小セットを作る」に従い、各画面の M4-x ミッションは **静的描画 + LP 適用 + 主要 UI** までを R1 スコープとし、削除ダイアログ・Undo・他画面統合・スペシャル演出は **専用フォローアップミッション** で対応する設計。

これは M4-A (auth callback)、M4-B (S-02 onboarding)、M4-C (S-10 GROW)、M4-D (S-12)、M4-E (S-13) でも同じ運用で、いずれも CRITICAL 0 を達成している。

### 再提示の依頼（spec_compliance ペルソナへ）

R-001〜R-005 は全て **M4-F の実装スコープ外として ENG が明示宣言**しており、各項目は Phase 4 後続フォローアップミッション（M4-G 以降）で実装予定です。M4-F R1 で実装期待値に含めるべきものではありません。

R2 では、以下を踏まえて **CRITICAL → MEDIUM/LOW（または non-issue）への再評価**をお願いします:

1. ミッション定義のスコープ外宣言を spec compliance の判定基準として尊重する
2. spec §4.7「状態・インタラクション」は最終仕様であり、漸進実装の途中段階で全項目達成は要求されない
3. 実装スコープに含まれていない事項を「実装が仕様に違反」と判定するのは過大評価

---

## 変更ファイル（R1 → R2 差分）

### lais/src/components/screens/S14GoalDetail.jsx — S14-8 タスク行のみ

```jsx
{/*
  R2 a11y fix R-001 (WCAG 1.4.1 色の使用):
  状態を色（枠線）だけで区別すると非色覚ユーザーで判別不能。
  - done: チェックマーク SVG
  - active: 内部ドット SVG（アイコン差）
  - scheduled: 中空（アイコンなし）
  さらに visually-hidden な状態テキスト + aria-label に状態を含めることで
  SR ユーザーにも形/言葉の二重で伝える。
*/}
<ul class="s14-task-list">
  {goal.tasks.map((task) => {
    const statusLabel =
      task.status === 'done' ? '完了済み'
      : task.status === 'active' ? '進行中'
      : '予定';
    return (
      <li key={task.id} class={`s14-task-row s14-task-row-${task.status}`}>
        <span class={`s14-check s14-check-${task.status}`} aria-hidden="true">
          {task.status === 'done' && (
            <svg viewBox="0 0 11 11" width="11" height="11" focusable="false">
              <path d="M 2 5.5 L 4.5 8 L 9 3"
                fill="none" stroke="currentColor" stroke-width="1.8"
                stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          )}
          {task.status === 'active' && (
            <svg viewBox="0 0 11 11" width="11" height="11" focusable="false">
              <circle cx="5.5" cy="5.5" r="2.5" fill="currentColor" />
            </svg>
          )}
        </span>
        <button
          type="button"
          class="s14-task-card"
          onClick={() => handleOpenTask(task.id)}
          aria-label={`${statusLabel}: ${task.name} — ${task.meta}`}
        >
          <span class={`s14-task-name s14-task-name-${task.status}`}>{task.name}</span>
          <span class="s14-task-date">{task.dateLabel} {task.time}</span>
        </button>
      </li>
    );
  })}
</ul>
```

---

## 未対応 (HIGH 以下) の扱い

R1 で検出された HIGH 17 / MEDIUM 31 / LOW 25 は PD-006 に従い **Phase A 完了後まとめて対応**。security_engineer の HIGH は session_progress.md 提案ログに記録予定（PD-102）。

---

## レビュアーへの依頼

1. a11y CRITICAL R-001 が正しく解消されているか（色 + 形 + 言葉 の三重区別）
2. spec_compliance R-001〜R-005 を **スコープ外として再評価**してください（M4-F は静的描画 + LP 適用 + 主要 UI までが範囲）
3. CRITICAL が 0 件であることを確認

JSON 形式で指摘ください。
