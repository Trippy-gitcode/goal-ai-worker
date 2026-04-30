# LAIS-PHASE4-M4G: S-15 Goal Create（ハーフモーダル / 3番目）
> リスク: 🟢低〜🟡中
> 推定: 1.5時間
> STATUS: IN PROGRESS
> 生成: 2026-04-15（3ペルソナ制 / ENG自律 / 4回目）

## 3ペルソナ判定記録

**ADV判定:** S-15 Goal Create は S-12 と同構造のハーフモーダル（3 番目）。新規 `lais/src/components/screens/S15GoalCreate.{jsx,css}` + S10Grow `handleCreateGoal` をモーダル開閉に変更。spec §4.8 の要素 S15-1〜S15-8 全描画。カテゴリ複数選択（6 項目）+ インラインタスク追加リンク（最小スコープ: console.log のみ）+ CTA disabled gate。LP 全 9（LP-001〜LP-015）予防適用。Rule of three 観測点として、将来の BaseHalfModal 共通抽出判断用データを蓄積（今回は抽出せずコピー継続、PD-003 適合）。

**QA検証:** template_v2 準拠 ✓ / LOCK 内 ✓ / spec §4.8 要素全実装 ✓ / POエスカレーション非該当 ✓ / LP-015 正式昇格後の初回適用 = 回帰確認の意味もあり

**PO代理:** PD-003（共通抽出は別ミッションに分離、Rule of three データ蓄積のみ）✓ / PD-005（LP 事前適用継続）✓ / PD-006（CRITICAL 0 + HIGH 後回し）✓ / PD-101（棄却禁止、スコープ外は A-a方式）✓

→ 3者合意 → 実行

## 参照ファイル
- docs/plans/lais_design_spec_v1.md §4.8（S15-1〜S15-8 要素仕様）
- docs/plans/lais_design_system.md v0.12
- docs/plans/lais_ux_v1.md §2.4
- docs/learned-patterns.md LP-001〜LP-015（LP-015 正式昇格後初回）
- docs/po-decisions.md
- lais/src/components/screens/S12TaskAdd.{jsx,css}（骨格参照元）

## 対象ファイル
- lais/src/components/screens/S15GoalCreate.jsx（新規）
- lais/src/components/screens/S15GoalCreate.css（新規）
- lais/src/components/screens/S10Grow.jsx（`handleCreateGoal` をモーダル開閉に変更）

## スコープ（in）
1. ハーフモーダル open/close（S-12 と同パターン）
2. 閉じる 3種: ✕ / overlay / Escape
3. S15-1 ドラッグハンドル
4. S15-2 タイトル「ゴールを作成」
5. S15-3 ✕ ボタン（44×44 タップ領域）
6. S15-4 ゴール名入力 (48px, focus 時 accent border)
7. S15-5 期限ピッカー 表示（値 `期限なし` + 14px カレンダー SVG / 読み取り専用）
8. S15-6 カテゴリ 6 項目複数選択（仕事/健康/学習/趣味/人間関係/その他）
   - Unselected: border `--border-strong` / color `--text-secondary`
   - Selected: 背景 `--accent-subtle` + border `--accent` + color `--accent` + 左に 14px チェック SVG（**LP-015 適用**）
9. S15-7 `+ 最初のタスクを追加` リンク（onClick console.log）
10. S15-8 CTA「作成」— ゴール名空欄時 `aria-disabled="true"` + `--button-disabled-*` + onClick 抑止
11. LP 全 9 事前適用（S-12 と同パターン + LP-015）
12. S10Grow `handleCreateGoal` + `goalCreateOpen` state + `createGoalButtonRef` で focus 復帰

## スコープ外（後続）
- インラインタスク追加（入力行動的生成は Phase 4 後続）
- 期限ピッカー (OS date picker or custom) の実装
- spring-default scale feedback アニメーション詳細
- 選択時 scale feedback
- Supabase 書き込み
- 未保存変更 + ✕ 確認ダイアログ
- ドラッグハンドル下スワイプ閉じ
- Goals セクションへのリアルタイム追加

## 状態遷移表
```
GROW [+ ゴールを作成] → S15 open → [✕ / overlay / Escape] → GROW (focus 復帰)
                                  → [カテゴリタップ] → トグル選択（複数可）
                                  → [ゴール名入力] → CTA aria-disabled=false
                                  → [作成] → console.log + state リセット + モーダル閉
```

## UIコンポーネント追加 7項目チェック
- [x] 開く操作: S10-9 `+ ゴールを作成` ボタン
- [x] 閉じる 3種: overlay / Escape / ✕
- [x] focus 復帰: `createGoalButtonRef`
- [x] z-index: overlay / modal
- [x] overlay onClick close
- [x] body scroll lock + max-height 85vh
- [ ] E2E: Phase 4 後続

## 完了コマンド
```bash
test -f lais/src/components/screens/S15GoalCreate.jsx
test -f lais/src/components/screens/S15GoalCreate.css
grep -c "s15-" lais/src/components/screens/S15GoalCreate.jsx | awk '{if($1>=8) exit 0; else exit 1}'

# spec §4.8 要素
for kw in s15-drag-handle s15-title s15-close s15-name s15-date s15-category s15-add-task s15-submit; do
  grep -q "$kw" lais/src/components/screens/S15GoalCreate.jsx || echo "MISS: $kw"
done

# LP 事前適用
grep -q "prefers-reduced-motion" lais/src/components/screens/S15GoalCreate.css
grep -q ":focus-visible" lais/src/components/screens/S15GoalCreate.css
grep -q "@supports" lais/src/components/screens/S15GoalCreate.css
grep -q "aria-modal" lais/src/components/screens/S15GoalCreate.jsx
grep -q "aria-disabled" lais/src/components/screens/S15GoalCreate.jsx
# LP-015 正式昇格後の確認
grep -q "var(--accent)" lais/src/components/screens/S15GoalCreate.css

# build
cd lais && npm run build 2>&1 | tail -5 | grep -q "built in"
```

## FAIL条件
- S15-1〜S15-8 のいずれか欠落
- LP-001/013/014/015 パターン欠落
- カテゴリ 6 項目が揃っていない
- npm run build 失敗
