# LAIS-PHASE4-M4I: S-20 TALK（タブ #2 / チャット UI）
> リスク: 🟡中
> 推定: 2.5時間
> STATUS: IN PROGRESS
> 生成: 2026-04-16（3ペルソナ制 / ENG自律 / 6回目 / Phase A 最終画面）

## 3ペルソナ判定記録

**ADV判定:** S-20 TALK はボトムタブ #2 のチャット UI。新規 `S20Talk.{jsx,css}` + App.jsx `/talk` route（lazy + Suspense, LP-012）+ S10Grow/S30MeProfile の `handleTabSelect` で `talk` → `route('/talk')` を実装。要素: S20-1 ヘッダ（☰/TALK/🕐/📝）/ S20-2 スクロール領域 / S20-3 AI バブル（背景なし、左 accent-subtle 縦ライン）/ S20-4 ユーザーバブル（accent-subtle 背景、右寄せ）/ S20-5 タスク提案カード（登録/編集して登録/✕）/ S20-6 冒険 EXP カード / S20-7 レベルアップバナー（インライン） / S20-8 オートスクロール制御バナー / S20-9 入力バー（📎 + textarea 自動伸長最大 4 行 + ➤ 送信）/ S20-10 BottomTabBar TALK active。ストリーミング / Supabase / 履歴ドロワー実体は後続。ローカル state で mock 会話を初期表示 + ユーザー送信 → ダミー AI 応答（setTimeout）で新規バブル追加のみ対応。LP 全 9 (LP-001/002/003/004/011/012/013/014/015) 事前適用。§5.0 A 区分（送信ボタン disabled = aria-disabled + pointer-events:none）を厳守。**LP-016 候補（aria-readonly プレーン div 問題）** / **LP-017 候補（min-width + inline-flex + padding）** も事前適用。

**QA検証:** template_v2 + §5.0 A/B 区分 ✓ / LOCK 内 Phase 4 ✓ / spec §4.9 全要素 ✓ / learned-patterns LP-001〜LP-015 全適用 ✓ / POエスカレーション条件非該当（新規プロセス無し、コスト影響無し、仕様変更無し） ✓

**PO代理:** PD-003（インライン送信ダミー以外は後続）/ PD-006（CRITICAL 0 着地、HIGH は Phase A 末尾一括）/ PD-005（LP 事前適用継続）/ PD-101（スコープ外指摘は A-a 方式で再レビュー）整合 → 3者合意 → 実行

## 参照ファイル
- docs/plans/lais_design_spec_v1.md §4.9（S20-1〜S20-10）+ §5.0 (A/B disabled 区分)
- docs/plans/lais_design_system.md v0.12
- docs/plans/lais_ux_v1.md §3.0〜§3.3
- docs/learned-patterns.md LP-001〜LP-015
- docs/po-decisions.md
- lais/src/components/shared/BottomTabBar.jsx（共有コンポーネント）
- lais/src/components/screens/S30MeProfile.{jsx,css}（直近リファレンス）

## 対象ファイル
- lais/src/components/screens/S20Talk.jsx（新規）
- lais/src/components/screens/S20Talk.css（新規）
- lais/src/components/App.jsx（`/talk` route + lazy import）
- lais/src/components/screens/S10Grow.jsx（`handleTabSelect` で `talk` → `route('/talk')`）
- lais/src/components/screens/S30MeProfile.jsx（`handleTabSelect` で `talk` → `route('/talk')`）

## スコープ（in）
1. `/talk` route + lazy import + Suspense fallback
2. S10Grow / S30MeProfile `handleTabSelect` で `talk` → `route('/talk')` 遷移
3. S20 内で BottomTabBar `grow` → `route('/grow')` / `me` → `route('/me')` / `talk` → 何もしない
4. S20-1 ヘッダ（☰ 履歴 / TALK label / 🕐 時刻 / 📝 新規チャット）— ボタンのみ console.log
5. S20-2 スクロール領域（padding + 縦スクロール + メッセージ間余白）
6. S20-3 AI バブル（border-left 2px --accent-subtle、背景なし、タイムスタンプ、`aria-live="polite"`）
7. S20-4 ユーザーバブル（--accent-subtle 背景、右寄せ、max-width 260px）
8. S20-5 タスク提案カード（登録 / 編集して登録 / ✕ 3 ボタン、§5.0 A 対象外の通常ボタン。✕ は min 44×44）
9. S20-6 冒険 EXP カード（⚔️ + テキスト + `+50 EXP`、warning アクセント）
10. S20-7 レベルアップバナー（インライン `🎉 Level Up! Lv.N — 称号`）
11. S20-8 オートスクロール制御バナー（scrollTop 検知で表示切替）
12. S20-9 入力バー（📎 + textarea 自動伸長 4 行 / 送信ボタン 44×44 §5.0 A disabled = `aria-disabled="true"` + `pointer-events:none`、入力あり → primary）
13. S20-10 BottomTabBar TALK active
14. ユーザー送信 → ユーザーバブル即追加 → 600ms 後にダミー AI 応答バブル追加（LP-001 で reduced-motion 時はタイマー短縮）
15. mock 初期会話: AI バブル 1 + ユーザーバブル 1 + AI バブル 1 + タスク提案カード 1 + 冒険 EXP カード 1 + レベルアップバナー 1（視認性のため）
16. LP 全 9 + LP-016/017 候補事前適用

## スコープ外（後続）
- 履歴ドロワー実体（☰ は console.log のみ）
- 実 AI ストリーミング / Supabase chat 連携
- タスク提案カード「登録する」成功フロー → `✅ 登録しました` 置換 → フェードアウト（mock 会話のみ）
- タイピングインジケータの 3 ドット translateY 演出（mock AI 応答は即表示）
- 紙吹雪パーティクル
- 📎 画像添付実装
- 履歴ドロワー左スライドイン
- 新規チャット（📝）の確定フロー
- 1 日 2 回冒険 EXP 上限制御（mock 固定表示）

## 状態遷移表
```
GROW [BottomTabBar: TALK タップ] → route('/talk') → S20 (Suspense → mount → main focus)
ME   [BottomTabBar: TALK タップ] → route('/talk') → S20 (同上)
  → [textarea 入力] → 送信ボタン disabled 解除
  → [送信タップ / Enter] → ユーザーバブル追加 + textarea reset
     → 600ms (reduced-motion 時 10ms) → ダミー AI 応答バブル追加
  → [スクロール上方へ] → S20-8 バナー表示 → タップで末尾へスクロール
  → [☰ / 🕐 / 📝 / 📎 / タスク提案 3 ボタン / EXP カード] → console.log
  → [BottomTabBar: GROW タップ] → route('/grow')
  → [BottomTabBar: ME タップ] → route('/me')
  → [BottomTabBar: TALK タップ] → 現在地 (何もしない)
```

## 完了コマンド
```bash
test -f lais/src/components/screens/S20Talk.jsx
test -f lais/src/components/screens/S20Talk.css
grep -c "s20-" lais/src/components/screens/S20Talk.jsx | awk '{if($1>=20) exit 0; else exit 1}'

# spec §4.9 要素 ID
for kw in s20-header s20-scroll s20-bubble-ai s20-bubble-user s20-task-card s20-quest s20-levelup s20-autoscroll s20-input s20-send; do
  grep -q "$kw" lais/src/components/screens/S20Talk.jsx || echo "MISS: $kw"
done

# LP 事前適用
grep -q "prefers-reduced-motion" lais/src/components/screens/S20Talk.css
grep -q ":focus-visible" lais/src/components/screens/S20Talk.css
grep -q "aria-disabled" lais/src/components/screens/S20Talk.jsx
grep -q "aria-live" lais/src/components/screens/S20Talk.jsx

# route 追加
grep -q "'/talk'" lais/src/components/App.jsx

# S10 / S30 tab select
grep -q "'/talk'" lais/src/components/screens/S10Grow.jsx
grep -q "'/talk'" lais/src/components/screens/S30MeProfile.jsx

# build
cd lais && npm run build 2>&1 | tail -5 | grep -q "built in"
```

## FAIL条件
- S20-1〜S20-10 のいずれか欠落
- LP-001/013/014/015 パターン欠落
- `/talk` route が App.jsx に欠落
- §5.0 A 送信ボタン disabled 表現が `aria-disabled + pointer-events:none` でない
- npm run build 失敗
