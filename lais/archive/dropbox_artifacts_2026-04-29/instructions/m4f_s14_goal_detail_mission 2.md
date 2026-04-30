# LAIS-PHASE4-M4F: S-14 Goal Detail（フルスクリーン）
> リスク: 🟡中
> 推定: 2時間
> STATUS: IN PROGRESS
> 生成: 2026-04-15（3ペルソナ制 / ENG自律 / 3回目）

## 3ペルソナ判定記録

**ADV判定:** S-14 はフルスクリーン画面（GROW から右スライド遷移）。新規 `lais/src/components/screens/S14GoalDetail.{jsx,css}` + App.jsx に `/goal/:id` route 追加（lazy import + Suspense fallback、LP-012 適用）+ S10Grow `handleOpenGoal(id)` を `route('/goal/' + id)` に変更。Mock goal データから 10 要素 (S14-1 〜 S14-10c) 全描画。S14-8 タスク行は spec で「S10-4 と完全一致」明記のため S10 のスタイルを参考に同等を実装（コピー戦略継続。Rule of three まで共通抽出保留）。LP 全 8 + LP-015候補（S14-6/S14-10a active要素）予防適用。

**QA検証:** template_v2 準拠 ✓ / LOCK 範囲（lais/）内 ✓ / spec §4.7 全項目を実装スコープに収納 ✓ / POエスカレーション条件非該当 ✓

**PO代理:** PD-006（CRITICAL 0 着地、HIGH は Phase A 末尾一括）✓ / PD-003（削除確認・Undo・編集モード・7日ルール演出は後続）✓ / PD-005（LP事前適用継続）✓

→ 3者合意 → 実行

## 参照ファイル
- docs/plans/lais_design_spec_v1.md §4.7（S14-1〜S14-10c 要素仕様）
- docs/plans/lais_design_system.md v0.12
- docs/plans/lais_ux_v1.md §3（ゴール進捗管理）
- docs/learned-patterns.md LP-001〜014
- docs/po-decisions.md
- lais/src/components/screens/S10Grow.jsx（タスク行スタイル参考元）

## 対象ファイル
- lais/src/components/screens/S14GoalDetail.jsx（新規）
- lais/src/components/screens/S14GoalDetail.css（新規）
- lais/src/components/App.jsx（`/goal/:id` route 追加）
- lais/src/components/screens/S10Grow.jsx（`handleOpenGoal` を `route()` に変更）

## スコープ（in）
1. `/goal/:id` route + lazy import + Suspense fallback（LP-012）
2. S10Grow `handleOpenGoal(id)` → `route('/goal/' + id)` 遷移
3. Mock goal データから S14-1〜S14-10c 全要素描画
4. S14-1 ← 戻るボタン: `route('/grow')` で復帰、ラベル `GROW`
5. S14-2 ゴールタイトル
6. S14-3 大進捗表示（`%` 数字 48px + 単位 20px）
7. S14-4 大プログレスバー（高さ 8px / `--accent-subtle` 背景 + `--accent` 塗り）
8. S14-5/S14-6 メタデータ行（残り日数 + カテゴリタグ）
9. S14-7 タスクセクションラベル `TASK`
10. S14-8 タスク行 (S10-4 と完全一致): チェック 22×22 + タスク名 + 日時。複数行 mock データ
11. S14-9 `+ タスクを追加` リンク（onClick console.log）
12. S14-10a/b/c アクション 3 ボタン (AI 相談 / 編集 / 削除) — 全て onClick console.log
13. LP-001/002/003/004/011/012/013/014 全 8 + LP-015候補（S14-6 カテゴリタグ + S14-10a AI相談ボタン）

## スコープ外（後続）
- 削除確認ダイアログ + Undo 30s
- 編集モード（spec に inline edit の言及なし）
- タスク行のチェック切替（`done/active/scheduled` 表示は対応するが、トグル動作は scope 外）
- タスク行タップ → S-13 遷移（M4-G で接続）
- 7日ルール演出（達成バナー + EXP 加算）
- 右スライド遷移カスタムアニメ（preact-router 標準遷移）
- AI 相談・編集ボタンの実遷移先
- Supabase 連携

## 状態遷移表
```
GROW [Goal 行 click] → route('/goal/g-X') → S14 (Suspense fallback → mounted)
  → [← GROW] → route('/grow')
  → [+ タスクを追加] → console.log（M4 後続で S-12 統合）
  → [タスク行 click] → console.log（M4 後続で S-13 統合）
  → [AI 相談 / 編集 / 削除] → console.log（後続）
```

## UIコンポーネント追加チェック（フルスクリーン画面）
- [x] route 追加 + lazy import
- [x] LP-002: マウント時 main へ focus
- [x] LP-014: focus-visible 分離
- [x] LP-013: env() 段階的適用
- [x] LP-012: lazy import で初期 bundle 分離

## 完了コマンド
```bash
test -f lais/src/components/screens/S14GoalDetail.jsx
test -f lais/src/components/screens/S14GoalDetail.css
grep -c "s14-" lais/src/components/screens/S14GoalDetail.jsx | awk '{if($1>=10) exit 0; else exit 1}'

# spec §4.7 要素 ID
for kw in s14-back s14-title s14-progress s14-bar s14-meta s14-cat-tag s14-task-label s14-task s14-add s14-actions s14-ai s14-edit s14-delete; do
  grep -q "$kw" lais/src/components/screens/S14GoalDetail.jsx || echo "MISS: $kw"
done

# LP 事前適用
grep -q "prefers-reduced-motion" lais/src/components/screens/S14GoalDetail.css
grep -q ":focus-visible" lais/src/components/screens/S14GoalDetail.css
grep -q "@supports" lais/src/components/screens/S14GoalDetail.css

# route 追加
grep -q "/goal" lais/src/components/App.jsx

# build
cd lais && npm run build 2>&1 | tail -5 | grep -q "built in"
```

## 仕様↔検証マッピング
- S14-1 戻る → grep `s14-back` + `aria-label="GROW に戻る"`
- S14-2 タイトル → grep `s14-title`
- S14-3 進捗% → grep `s14-progress-pct`
- S14-4 バー → grep `s14-progress-bar` + `role="progressbar"`
- S14-5 残り日数 → grep `s14-days-left`
- S14-6 カテゴリタグ → grep `s14-cat-tag`
- S14-7 TASK ラベル → grep `TASK`
- S14-8 タスク行 → grep `s14-task-row`
- S14-9 + タスクを追加 → grep `s14-add-task`
- S14-10 アクション 3 ボタン → grep `s14-action-ai|s14-action-edit|s14-action-delete`

## FAIL条件
- S14-1〜S14-10c のいずれかが欠落
- LP-001/013/014 パターンが欠落
- /goal/:id route が App.jsx になし
- npm run build 失敗
