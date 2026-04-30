# LAIS-PHASE4-M4D: S-12 Task Add（ハーフモーダル）
> リスク: 🟡中
> 推定: 2時間
> STATUS: IN PROGRESS
> 生成: 2026-04-15（3ペルソナ制初回テスト / ENG自律）

## 3ペルソナ判定記録

**ADV判定:** design_spec §4.5 準拠で S-12 Task Add をハーフモーダルとして実装。lais/src/components/screens/S12TaskAdd.{jsx,css} を新設し、S10Grow の `handleAddTask` で開閉制御する。フィールドは spec §4.5 の 12 要素（S12-1〜S12-12）を全て描画する。mock state 管理で API 連携はスコープ外。LP-001/002/003/004/011/013/014 を事前適用する。

**QA検証:** mission_template_v2 準拠（対象ファイル列挙・完了コマンド・UI7項目チェック・状態遷移表）✓ / Phase 4 LOCK 範囲内（lais/ 内に閉じる）✓ / POエスカレーション必須条件 (コスト変更・新プロセス・ブランド変更) 非該当 ✓ / 参照ファイル全列挙 ✓

**PO代理:** PD-006 品質/スピードバランス（HIGH は Phase A 末尾一括、CRITICAL 0 だけで着地）✓ / PD-003 過度適用しない（API 連携・未保存確認ダイアログ・S-13 遷移はスコープ外）✓ / PD-005 仕組みで解決（LP-001/002/003/004/011/013/014 事前適用フロー）✓ / コスト構造に影響なし ✓

→ 3者合意 → 実行

## 参照ファイル
- docs/plans/lais_design_spec_v1.md §4.5（S12-1〜S12-12 要素仕様）
- docs/plans/lais_design_system.md v0.12（color/spacing/motion トークン）
- docs/plans/lais_ux_v1.md §2.3（UX フロー）
- docs/mockups/s12_task_add.html（承認済み HTML モックアップ）
- docs/learned-patterns.md LP-001/002/003/004/011/013/014
- docs/po-decisions.md（PO代理ペルソナ用）

## 対象ファイル
- lais/src/components/screens/S12TaskAdd.jsx（新規）
- lais/src/components/screens/S12TaskAdd.css（新規）
- lais/src/components/screens/S10Grow.jsx（`handleAddTask` をモーダル開閉に変更）
- lais/src/components/App.jsx（変更不要予定。openModal ステートは S10Grow 内で保持）

## スコープ（in）
1. ハーフモーダル open/close（bottom → up `--duration-normal` ease-out）
2. 閉じ操作 3種: ✕ / overlay タップ / ESC キー
3. 種別トグル（単発 / 習慣）state 切替 + 種別変更で予定日 ⇄ 繰り返し周期
4. タスク名入力（48px / focus 時 border `--accent` / placeholder `--text-muted`）
5. 開始時刻ピッカー（`<input type="time">` / 値 10:00）
6. 所要時間チップ横スクロール（5/10/15/30/45/60/90/120分、デフォ 30分）
7. 予定日 / 繰り返し周期 表示（値のみ、タップで何もしない＝Phase 4 で対応）
8. ゴール紐付け（値のみ `なし` + chevron-down）
9. メモ textarea（min-height 80px）
10. CTA「作成」（タスク名空欄時 aria-disabled="true" + submit gate）
11. LP 事前適用: reduced-motion / focus-visible 分離 / env() @supports / A11y ラベル

## スコープ外（out）
- 実際の Supabase 書き込み（Phase 4 後続ミッション）
- ドラッグハンドル下スワイプ閉じ（Phase 4 後続）
- 未保存変更 + overlay タップ時の確認ダイアログ（Phase 4 後続）
- S-13 遷移
- 成功/失敗トースト
- 多言語

## 状態遷移表
```
GROW → [+ タスクを追加] → S-12 open (modal) → [✕/overlay/ESC] → GROW
GROW → [+ タスクを追加] → S-12 open → [種別=習慣] → 予定日 → 繰り返し周期
                                        → [タスク名入力] → CTA enabled
                                        → [作成] → console.log + modal close + GROW
```

## UIコンポーネント追加 7項目チェック
- [x] 開く操作: S10-5 `+ タスクを追加` ボタン
- [x] 閉じる 3種: overlay tap / Escape / ✕ ボタン
- [x] 閉じた後 GROW に正常復帰（focus を元に戻す）
- [x] z-index: overlay=`--z-overlay`(300) / modal=`--z-modal`(400)
- [x] overlay 要素 onclick=close
- [x] キーボード表示時コンテンツが隠れない（モーダル内部 overflow-y: auto）
- [ ] E2E テスト項目追加: Phase 4 後続（Playwright 未整備のため静的 + 手動スクショ）

## 完了コマンド
```bash
# 1. S12TaskAdd.jsx / .css が存在し要素 ID を全て含む
test -f lais/src/components/screens/S12TaskAdd.jsx
test -f lais/src/components/screens/S12TaskAdd.css
grep -c "s12-" lais/src/components/screens/S12TaskAdd.jsx | awk '{if($1>=12) exit 0; else exit 1}'

# 2. spec §4.5 要素仕様 ID が全て含まれる（S12-1〜S12-12）
for id in "drag-handle" "title" "close" "type" "name" "time" "duration" "date" "goal" "memo" "submit"; do
  grep -q "$id" lais/src/components/screens/S12TaskAdd.jsx || exit 1
done

# 3. LP 事前適用
grep -q "prefers-reduced-motion" lais/src/components/screens/S12TaskAdd.css
grep -q ":focus-visible" lais/src/components/screens/S12TaskAdd.css
grep -q "@supports" lais/src/components/screens/S12TaskAdd.css
grep -q "aria-disabled" lais/src/components/screens/S12TaskAdd.jsx
grep -q "aria-modal" lais/src/components/screens/S12TaskAdd.jsx

# 4. ビルドが通る
cd lais && npm run build 2>&1 | tail -5 | grep -q "built in"
```

## 仕様↔検証マッピング
- S12-1 ドラッグハンドル → grep `s12-drag-handle`
- S12-2 タイトル → grep `タスクを追加`
- S12-3 ✕ ボタン → grep `s12-close`, aria-label `閉じる`
- S12-4 種別ラベル → grep `種別`
- S12-5 種別ピル → grep `s12-type-`
- S12-6 タスク名入力 → grep `s12-name` + `input`
- S12-7 開始時刻ピッカー → grep `type="time"`
- S12-8 所要時間チップ → grep `s12-duration-chip`
- S12-9 予定日 → grep `予定日`
- S12-10 ゴール紐付け → grep `ゴール紐付け`
- S12-11 メモ → grep `textarea`
- S12-12 CTA → grep `aria-disabled`

## FAIL条件
- spec §4.5 の要素 ID（S12-1〜S12-12）が 1 つでも欠落
- LP-001/013/014 の CSS パターンが欠落
- npm run build が失敗

## 完了報告フォーマット
```
M4-D: S-12 Task Add 実装完了
ゴールデンレビュー: X/7 CRITICAL 0（Rn ラウンド目）
変更ファイル: git diff --stat
```
