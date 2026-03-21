# GOAL AI — CLAUDE.md（Claude Code専用）
> 最終更新：2026-03-21（v6.3 / KICKOFF-001 Step 4準備 / ワークフローv14追加）
> 方針・ルール → development_rules.md（C1〜C7）
> プラン・戦略 → goal_ai_project_v6_3.md
> 履歴・スキーマ → goal_ai_reference_v2.md

---

## 現在の実行チェーン（KICKOFF-001）

各ステップ完了後にふとしの承認を得てから次へ。

| Step | 指示書 | 追補適用 | 状態 |
|------|--------|---------|:----:|
| 0 | CLAUDE.md更新 | — | ✅ |
| 1 | STRIPE-SETUP-AUTO | AMEND-002 | ✅ |
| 2 | TEST-INFRA-001 | — | ✅ |
| 3 | STRIPE-001-SCHEMA | AMEND-001 + AMEND-002 | ✅ |
| 4 | STRIPE-002-TURN-RECORD | AMEND-001 + AMEND-002 | ✅ |
| 5 | STRIPE-003-CAP-FAIRUSE | AMEND-001 + AMEND-002 | ✅ |
| 6 | STRIPE-004-API-WEBHOOK | AMEND-001 + AMEND-002 | ✅ |
| 7 | STRIPE-005-FRONTEND | AMEND-001 + AMEND-002 | ⬜ |
| 8a | DESIGN-IMPL-001 PART-1 | — | ⬜ |
| 8b | DESIGN-IMPL-001 PART-2 | — | ⬜ |
| 8c | DESIGN-IMPL-001 PART-3 | — | ⬜ |


---

## 【鉄則】

1. grep で場所特定してから編集
2. 指示書+追補を全て読んでから実装開始
3. 保全確認grep全項目実行。1件でも失敗なら再修正
4. 1機能1デプロイ。デプロイ後即スモークテスト
5. FAIL → wrangler rollback → ログ確認 → 修正
6. ログ確認前の投機的修正禁止
7. 指示書にないファイルは変更禁止
8. APP_VERSION インクリメント（globals.js, sw.js, index.html, worker.js）

## 重要な発見事項（Step 4以降の前提）

### DBスキーマの命名規則
- 全テーブルが `user_id` (UUID) を使用（`token_id` ではない）
- `chat_messages` のカラム: id, user_id, goal_id, role, content, ai_model, message_type, created_at, session_id, goal_candidate, session_tag
- `usage_tracking` の既存unique制約: `(user_id, month)`
- Worker側の `auth.tokenId` と DB の `user_id` の対応関係を要確認

### constants.js 要更新
- 現在: free/pro/premium/max/annual/premium_annual/max_annual の7プラン
- v6.3: free/light/pro/max/ultra の5プラン
- PLAN_MODELS, PLAN_LIMITS, STRIPE_PRICE_IDS を全て書き換え必要
- Step 4開始前にconstants.js更新を先行すること

## 実行ワークフロー（v14以降）

1. 指示書は instructions/ に保存されている
2. 実行結果は instructions/results/ に保存する（grep出力・diff・smoke結果）
3. 各ステップ完了後 session_progress.md を更新する
4. テストFAIL時は即停止 → wrangler rollback → 結果記録 → 次の指示を待つ
5. 指示書にない変更は加えない。改善案は session_progress.md「## 提案ログ」に記録のみ
6. 各ステップ完了時に git tag stepN-complete を打つ

## 品質ゲート（全ステップ共通）

Phase 0: プリフライトチェック → Phase 1-2: 実装 → Phase 3: diff保存+grep保全 → Phase 4: キャノピーテスト → Phase 5: tag + session_progress更新

### 結果レポート規約
各Step完了時に、自分で results/ を読み session_progress.md に判定(PASS/FAIL)・変更サマリー・grep結果・キャノピー結果・gitタグ・提案ログを書く。Claude.ai は session_progress.md だけ読んで判断する。

### 【グローバルルール】
- 指示書中の `token_id` は `auth.userId`（UUID）に読み替えること（DB操作は全て `user_id`）

### 【絶対禁止】
- AIスマートルーティングの廃止・削除
- プラン構成の勝手な変更
- Supabaseテーブル・カラムの削除
- 既存APIエンドポイント・認証・Stripe処理の削除
- 指示された実装の省略・スキップ
