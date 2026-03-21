# GOAL AI — CLAUDE.md（Claude Code専用）
> 最終更新：2026-03-21（v15 自律型エンジニアモード）
> セッション開始時にこのファイルとinstructions/session_progress.mdを必ず読むこと
> 判断に迷ったら development_rules.md を参照

---

## 🔒 契約セクション（Code変更禁止。変更権限はClaude.ai経由のみ）

### プラン構成（v6.3）
Free(¥0,20回/日,Sonnet+mini+Flash) / Light(¥500~980,¥8/t,cap¥980) / Pro(¥1,500~2,980,¥20/t,cap¥2,980,Sonnet4.6+GPT-5+Flash) / Max(¥1,500~9,800,¥10/t,cap¥9,800,Opus4.6+GPT-5+2.5Pro) / Ultra(¥20,000使い放題,Maxと同モデル,ET140回/週,コンテキスト2倍)

### 変更不可の設計
- AIルーティング: quickRoute→callRoutingAPI→モデル振り分け（廃止禁止）
- フェアユース: 5h窓+週間窓の2層（checkFairUseV2。削除禁止）
- 従量課金: Stripe Metered Billing（recordTurnUsage→maybeSendUsageRecord）
- DB: user_id(UUID)。指示書のtoken_idはauth.userIdに読み替え
- PLAN_CONFIGがSingle Source of Truth

### ふとしの方針メモ
- 品質最優先。スピードのために品質を犠牲にしない
- GPT-5をProに投入（粗利88%維持、ChatGPT Plus対抗）
- 旧KVフェアユースはv6.3で完全削除済み（I/O半減）
- このチャット(Claude.ai)は経営者+アドバイザーの場。実務は全てCode
- UX改善3件承認済み: 初期タスク段階式(UX-001) / コーチマーク3点(UX-002) / AI最適化%表示(UX-003)。詳細はsession_progress.md「UX改善仕様」セクション参照

### 契約変更ルール
- 契約セクションの編集権限はClaude.ai（Desktop Commander経由）のみ
- Codeによる契約セクションの変更は絶対禁止
- 変更時はClaude.aiがsession_progress.mdにも記録する

### 仕様と設計の境界
- 仕様変更（禁止）= ユーザーから見える挙動が変わること
- 設計変更（自由）= 内部構造・実装方法の選択。判断根拠を記録

### verify.sh 最低基準
- 新規関数: 全てgrep存在確認
- 既存保全: canopy.shの全項目（累積。削除禁止）
- PLAN_CONFIG数値: 契約セクションの値と一致すること
- 旧コード残存: 削除対象が残っていないこと

### 承認ルール
- 🔴高リスク: ふとしの個別承認必須
- 🟡中リスク: レポートのみで判断可
- 🟢低リスク: バッチ承認可（複数ステップまとめて）

---

## 鉄則（常に意識する5つだけ。詳細はdevelopment_rules.md）

1. **仕様変更禁止。** 契約セクション参照。設計判断は自由、根拠を記録
2. **1機能1デプロイ → canopy → PASS → 次。** FAILならrollback→記録→停止
3. **verify.shを自分で作り自分で実行。** canopyに新項目を累積追加（削除禁止）
4. **判断根拠・結果・提案をsession_progress.mdに記録。** レポート規約に従う
5. **ミッション遂行に必要なバグ修正はOK（記録必須）。無関係なバグは報告のみ**

---

## ミッションキュー運用
- Claude.aiがDC経由でsession_progress.mdのキューに直接追記する
- Codeはステップ完了後、session_progress.mdのキューを再読してから次に進む
- キュー消化時は完了記録を書く
- ふとしのコピペは不要

---

## 実行チェーン（KICKOFF-001）

| Step | 状態 |
|------|:---:|
| 0-6 (インフラ+バックエンド) | ✅ |
| 7 フロントエンド | ✅ |
| 8a デザイン共通 | ✅ |
| 8b 各画面UI | ✅ |
| 8c プラン演出 | ⬜ |

---

## 参照ドキュメント（リポジトリ内）
Step 7以降: stripe_005_frontend.md / stripe_amendment_001.md / stripe_amendment_002.md / design_impl_001.md / design_review_changelog_v3.md / goal_ai_design_spec_v3.md / development_rules.md

---

## ファイル構成（v3.9.3）
src/: index.js, routes/(chat,checkout,plan,deep,goals,history,memo,misc,referral,tester,token,voice,admin), services/ai/(gpt,gemini,routing,claude), services/(embedding,history,memo,profile,prompt), utils/(constants,helpers,rate-limit,streak,supabase)
frontend/js/: globals,api,chat,goals,profile,ui,app,location,main
git tags: step4-complete / step5-complete / step6-complete

---

## 【絶対禁止】
- ルーティング廃止 / プラン構成変更 / テーブル削除 / API削除 / 実装スキップ / 契約変更(署名なし) / canopy項目削除
