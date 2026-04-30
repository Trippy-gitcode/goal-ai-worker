# LAIS-PHASE4-M4E: S-13 Task Detail（ハーフモーダル / 閲覧+編集swap）
> リスク: 🟡中
> 推定: 2時間
> STATUS: IN PROGRESS
> 生成: 2026-04-15（3ペルソナ制 / ENG自律 / 2回目）

## 3ペルソナ判定記録

**ADV判定:** S-13 をハーフモーダルとして実装。S-12 のモーダル骨格パターン（overlay/modal/header/close/scroll lock/focus trap/return focus）は **コピー戦略** で対応（Rule of three まで共通抽出を保留）。閲覧モード S13-1〜S13-12 全要素描画 + 編集モード state swap 実装。Mock task で `status` (done/active/scheduled) 別に表示分岐。LP 全 7 + LP-015候補（Active state border-color 残し）を予防適用。

**QA検証:** mission_template_v2 準拠 ✓ / LOCK 範囲（lais/）内 ✓ / S-12 構造再利用は内部設計判断 PD-007 非該当 ✓ / POエスカレーション条件非該当 ✓

**PO代理:** PD-006（CRITICAL 0 で着地、HIGH は Phase A 末尾一括）✓ / PD-003（削除確認・Undo・S-12 への双方向 inline swap はスコープ外、Rule of three まで共通抽出保留）✓ / PD-005（LP 事前適用フロー継続）✓

→ 3者合意 → 実行

## 参照ファイル
- docs/plans/lais_design_spec_v1.md §4.6（S13-1〜S13-12 要素仕様）
- docs/plans/lais_design_system.md v0.12（color/spacing/motion/§5.0 disabled トークン）
- docs/plans/lais_ux_v1.md §2.4（UX フロー）
- docs/learned-patterns.md LP-001/002/003/004/011/013/014
- docs/po-decisions.md
- lais/src/components/screens/S12TaskAdd.{jsx,css}（モーダル骨格パターン参照元）

## 対象ファイル
- lais/src/components/screens/S13TaskDetail.jsx（新規）
- lais/src/components/screens/S13TaskDetail.css（新規）
- lais/src/components/screens/S10Grow.jsx（`handleOpenTask` をモーダル開閉 + 選択タスク state に変更）

## スコープ（in）
1. ハーフモーダル open/close（S-12 と同パターン）
2. 閉じる 3種: ✕ / overlay / Escape
3. 閲覧モード S13-1〜S13-12 全要素描画
4. status (done/active/scheduled) 別の S13-2 チェックアイコン色分け（success/accent/border-strong）
5. status 別の S13-5 ステータスラベル文言・色分け
6. S13-6 メタデータ行（時刻 / 所要時間 / ゴール）
7. S13-7 カテゴリドット（cat-work/health/learn 等）
8. S13-8/9 メモセクション
9. S13-10 編集ボタン → mode 'view' → 'edit' へ swap
10. S13-11 削除ボタン（onClick console.log のみ、確認ダイアログは Phase 4 後続）
11. S13-12 AI 相談ボタン 2 種 — status=done → 「振り返り相談」active + 「詰まりを相談」disabled、status≠done → 「進め方を聞く」active + 「振り返り」disabled（Inactive スタイル + opacity 0.5 + pointer-events:none）
12. 編集モード swap: S13-3 / S13-6（時刻+所要時間） / S13-9 を入力フィールドへ swap、ボタン行を [キャンセル] [保存] へ差し替え
13. 編集モード [キャンセル]: state を破棄して view へ戻す
14. 編集モード [保存]: console.log + view へ戻す（Supabase 連携は後続）
15. S10Grow `handleOpenTask` から該当 task を渡してモーダル open
16. LP 事前適用全 7 + LP-015 候補（Active state border-color 残し）

## スコープ外（後続）
- 削除確認ダイアログ + Undo スナックバー 30s
- Supabase 書き込み
- ドラッグハンドル下スワイプ閉じ
- 未保存変更 + ✕ 時の確認ダイアログ
- S-12 → S-13 inline swap の双方向化（共通抽出は Rule of three を待つ）
- AI 相談ボタンの実遷移先

## 状態遷移表
```
GROW [タスク行] → S13 open(view, task=t-X) → [✕/overlay/Escape] → GROW (focus 復帰)
                                          → [編集] → S13 edit mode (入力フィールド swap)
                                                     → [キャンセル] → S13 view (state 破棄)
                                                     → [保存] → console.log + view
                                          → [削除] → console.log（Phase 4 後続でダイアログ）
                                          → [AI 相談 active] → console.log（Phase 4 後続で遷移）
```

## UIコンポーネント追加 7項目チェック
- [x] 開く操作: S10-4 タスク行タップ
- [x] 閉じる 3種: overlay / Escape / ✕
- [x] 閉じた後 GROW に focus 復帰（returnFocusRef）
- [x] z-index: overlay=`--z-overlay` / modal=`--z-modal`
- [x] overlay 要素 onclick=close
- [x] body scroll lock + max-height 85vh + overflow-y: auto
- [ ] E2E テスト追加: Playwright 未整備 → Phase 4 後続

## 完了コマンド
```bash
# 1. ファイル存在
test -f lais/src/components/screens/S13TaskDetail.jsx
test -f lais/src/components/screens/S13TaskDetail.css

# 2. spec §4.6 要素 ID（s13- クラス 12 個以上）
grep -c "s13-" lais/src/components/screens/S13TaskDetail.jsx | awk '{if($1>=12) exit 0; else exit 1}'

# 3. LP 事前適用
grep -q "prefers-reduced-motion" lais/src/components/screens/S13TaskDetail.css
grep -q ":focus-visible" lais/src/components/screens/S13TaskDetail.css
grep -q "@supports" lais/src/components/screens/S13TaskDetail.css
grep -q "aria-modal" lais/src/components/screens/S13TaskDetail.jsx

# 4. mode swap
grep -q "view\|edit" lais/src/components/screens/S13TaskDetail.jsx

# 5. ビルド
cd lais && npm run build 2>&1 | tail -5 | grep -q "built in"
```

## 仕様↔検証マッピング
- S13-1 ドラッグハンドル → grep `s13-drag-handle`
- S13-2 28×28 チェック status 3種 → grep `s13-check` + `s13-check-done` 等
- S13-3 タスク名 → grep `s13-task-name`
- S13-4 ✕ → grep `s13-close` + `aria-label="閉じる"`
- S13-5 ステータスラベル → grep `s13-status`
- S13-6 メタ行 → grep `s13-meta`
- S13-7 カテゴリドット → grep `s13-cat-dot`
- S13-8 MEMO ラベル → grep `MEMO`
- S13-9 メモ本文 → grep `s13-memo`
- S13-10 編集 → grep `s13-edit`
- S13-11 削除 → grep `s13-delete`
- S13-12 AI 相談 2 種 → grep `s13-ai`

## FAIL条件
- S13-1〜S13-12 のいずれかが欠落
- LP-001/013/014 パターンが欠落
- mode swap が動作しない
- npm run build 失敗
