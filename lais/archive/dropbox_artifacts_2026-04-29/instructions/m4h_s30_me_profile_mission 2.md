# LAIS-PHASE4-M4H: S-30 ME Profile（タブ #3 / サブタブ PROFILE）
> リスク: 🟡中
> 推定: 2時間
> STATUS: IN PROGRESS
> 生成: 2026-04-15（3ペルソナ制 / ENG自律 / 5回目）

## 3ペルソナ判定記録

**ADV判定:** S-30 はボトムタブ #3 + サブタブ 4 個（PROFILE/DISCOVER/FRIENDS/SHOP）を持つ画面。新規 `S30MeProfile.{jsx,css}` + App.jsx `/me` route（lazy + Suspense, LP-012）+ S10Grow BottomTabBar `handleTabSelect` で `me` → `route('/me')` + S30 側で `grow` → `route('/grow')`。要素: S30-1〜S30-7 全描画。サブタブ切替は local state のみ（active=PROFILE のみコンテンツ描画、他 3 つは placeholder）。S30-5 MBTI カードは「未推定時」状態で描画（`対話を重ねると判明します` + 進捗バー + 外部テスト入力リンク）。BottomTabBar は共有コンポーネントを ME active で再利用。LP 全 9 + LP-015（サブタブ active underline + MBTI アクセント）。

**QA検証:** template_v2 準拠 ✓ / LOCK 内 ✓ / spec §4.10 全項目 ✓ / §5.0 A/B 区分遵守 (サブタブは §5.0 B Inactive) ✓ / POエスカレーション条件非該当 ✓

**PO代理:** PD-006（CRITICAL 0 着地、HIGH は Phase A 末尾一括）/ PD-003（インライン編集・DISCOVER 等の中身・S-41/S-37 遷移先は後続）/ PD-005（LP事前適用継続）/ PD-101 整合 → 3者合意 → 実行

## 参照ファイル
- docs/plans/lais_design_spec_v1.md §4.10（S30-1〜S30-7）+ §5.0 (A/B disabled 区分)
- docs/plans/lais_design_system.md v0.12
- docs/plans/lais_ux_v1.md §4
- docs/learned-patterns.md LP-001〜LP-015
- docs/po-decisions.md
- lais/src/components/shared/BottomTabBar.jsx（共有コンポーネント）

## 対象ファイル
- lais/src/components/screens/S30MeProfile.jsx（新規）
- lais/src/components/screens/S30MeProfile.css（新規）
- lais/src/components/App.jsx（`/me` route + lazy import）
- lais/src/components/screens/S10Grow.jsx（`handleTabSelect` で `me` → `route('/me')`）

## スコープ（in）
1. `/me` route + lazy import + Suspense fallback
2. S10Grow `handleTabSelect` で `me` → `route('/me')` 遷移
3. S30 内で BottomTabBar `handleTabSelect` で `grow` → `route('/grow')`, `me` → 何もしない
4. S30-1 ヒーロー（アバター 56×56 + 名前 + Lv + EXP バー）
5. S30-2 サブタブ 4 個（PROFILE active + DISCOVER/FRIENDS/SHOP inactive）ローカル state 切替
6. S30-3 基本情報 4 行（名前 / 年齢 / 職業 / 趣味）表示のみ
7. S30-4 AI 理解メモ セクション（最大 800 文字、mock 本文）
8. S30-5 MBTI カード 未推定時状態（`対話を重ねると判明します` + 進捗バー + 外部テスト入力リンク）
9. S30-6 リンク行 2 つ（アバター設定 / 設定）onClick console.log
10. S30-7 BottomTabBar ME active
11. サブタブ非 PROFILE 時は placeholder（`coming soon` 程度の一行メッセージ）
12. LP 全 9 事前適用

## スコープ外（後続）
- S30-3 インライン編集動作（border-bottom にフォーカス + 自動保存 + トースト）
- S30-4 実 AI メモデータ（Supabase 連携）
- S30-5 推定済み時の MBTI 4 文字表示
- DISCOVER / FRIENDS / SHOP サブタブの実コンテンツ
- S-41 アバター設定 / S-37 設定への遷移
- サブタブ左右スワイプ
- アバターの実画像（SVG 仮表示）

## 状態遷移表
```
GROW [BottomTabBar: ME タップ] → route('/me') → S30 (Suspense → mount → main focus)
  → [サブタブ切替 (PROFILE ⇔ DISCOVER/FRIENDS/SHOP)] → local state / content swap
  → [BottomTabBar: GROW タップ] → route('/grow')
  → [BottomTabBar: ME タップ] → 何もしない（現在地）
  → [基本情報行タップ] → console.log (後続でインライン編集)
  → [アバター設定 / 設定] → console.log (後続で S-41/S-37 遷移)
  → [外部テスト結果を入力] → console.log
```

## 完了コマンド
```bash
test -f lais/src/components/screens/S30MeProfile.jsx
test -f lais/src/components/screens/S30MeProfile.css
grep -c "s30-" lais/src/components/screens/S30MeProfile.jsx | awk '{if($1>=10) exit 0; else exit 1}'

# spec §4.10 要素 ID
for kw in s30-hero s30-subtab s30-info s30-ai-memo s30-mbti s30-link s30-avatar; do
  grep -q "$kw" lais/src/components/screens/S30MeProfile.jsx || echo "MISS: $kw"
done

# LP 事前適用
grep -q "prefers-reduced-motion" lais/src/components/screens/S30MeProfile.css
grep -q ":focus-visible" lais/src/components/screens/S30MeProfile.css
grep -q "@supports" lais/src/components/screens/S30MeProfile.css

# route 追加
grep -q "'/me'" lais/src/components/App.jsx

# build
cd lais && npm run build 2>&1 | tail -5 | grep -q "built in"
```

## FAIL条件
- S30-1〜S30-7 のいずれか欠落
- LP-001/013/014 パターン欠落
- `/me` route が App.jsx に欠落
- npm run build 失敗
