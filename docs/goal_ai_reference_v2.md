# GOAL AI — リファレンス（辞書用）
> 必要な時だけ参照 / 最終更新：2026-03-17
> ※ このファイルが Single Source of Truth。Claude.ai / Code 双方が参照。

---

## Supabaseテーブル構成

| テーブル | 主なカラム | 状態 |
|---------|----------|------|
| `users` | token_id, plan, stripe連携, streak_count, streak_best, last_active_date, referral_code, referred_by, **ai_memo, ai_memo_updated_at, tester_tier, tester_code, tester_expires_at** | ✅ |
| `goals` | id, token_id, title, why, deadline, actual, last_milestone_pct, **ai_role_icon, ai_role_name, ai_role_description, ai_memo, ai_memo_updated_at** | ✅ |
| `chat_messages` | id, token_id, session_id, role, content, created_at | ✅ |
| `deep_analyses` | id, token_id, result, type, created_at | ✅ |
| `usage_tracking` | token_id, month, chat_count, deep_count | ✅ |
| `feedbacks` | id, token_id, content, sentiment, nps_score, feature_tag, is_beta, source, votes, **app_version, user_agent, tester_tier, device, platform, screen_width** | ✅ |
| `referrals` | id, referrer_token_id, referred_token_id, referral_code, status, referrer_reward_applied | ✅ |
| `used_coupons` | id, token_id, coupon_code, used_at | ✅ |

### feedbacksビュー
- `feature_requests` — feature_tag別の投票数集計（votes合計・件数）

### RLS
- 全テーブルでRLS有効
- `service_role_all` ポリシーでWorkerからフルアクセス

---

## 新規APIエンドポイント（v3.3.0以降）

```
POST /api/goals/:id/suggest-roles    — ロール提案（GPT-5 mini）
POST /api/ai-memo/generate           — AI理解メモ生成
POST /api/tester/apply               — テスターコード適用
GET  /api/admin/testers              — テスター管理ダッシュボード
GET  /api/plan/status                — プラン利用状況
POST /api/stripe/webhook             — Stripe Webhook
POST /api/stripe/create-checkout-session — Checkout
POST /api/stripe/create-portal-session  — Customer Portal
GET  /api/et/status                  — ET残回数（Ultra用）
POST /api/addon/purchase             — 追加チャージ購入
```

### Worker Secrets追加
- `OWNER_SECRET` — オーナーバイパス用（v3.3.3で追加）

---

## UI/UXデザイン仕様

### 全体
- スマホ・PCで機能差なし、レイアウトのみレスポンシブ
- メッセージ文字サイズ16px以上、入力欄16px以上（iOS zoom防止）

### スマホ対応
- ハンバーガーメニュー（768px以下）
- visualViewport APIでキーボード対応（全画面グローバルハンドラ）
- safe-area-inset、overscroll-behavior:none
- 100dvh（vhフォールバック）

### ロゴ
- #38 Crown Minimal（塗りの王冠、ゴールドグラデーション）
- サイドバー、AIアバター、favicon、LPに適用
- **グラスモード時はロゴ領域にbackdrop-filter:none + 不透明背景**

### アイコン体系
- ホームカード6つ + 壁打ち + ヘルプ: ゴールドグラデーションSVGラインアート
- 王冠ロゴと同じテイスト（#c8920a → #f5d380）

### ユーザーアバター
- `USER_PROFILE.nickname` または `name` の頭文字を動的表示
- 未設定時は人型アイコン
- プロフィール画像アップロード対応（handleAvatarUpload）

---

## チャット画面構成（4画面）

| 画面 | ルーティング | AI固定 | Freeカウント | ロール |
|------|:----------:|:------:|:----------:|--------|
| ホームチャット | ✅ | — | 通常 | モード別（通常/スパルタ/メンケア/ソクラテス） |
| ゴールハブ | ✅ | — | 通常 | ゴールごとにAI提案→ユーザー選択 |
| デザインセッション | — | Sonnet固定 | 無料 | ライフデザイナー（固定） |
| フィードバック | — | Sonnet固定 | 無料 | プロダクト改善パートナー（固定） |

※ 悩み相談画面はv3.3.0で廃止。メンケアモードで代替。

---

## 「私をデザイン」セッション

### プロフィール項目
名前・ニックネーム・職種（選択式）・年齢・生活上の制約・MBTI・強み・弱み・価値観・ビジョン・キャッチコピー
※ 持病・医療情報は扱わない

### セッション質問（5テーマ）
1. **今の自分**: 友達に頼まれること / 時間忘れること / 苦にならないこと / 上手と言われたこと
2. **苦手なこと**: 先延ばし / 人に任せたい / 疲れるけど避けられない
3. **大切なこと**: お金vs時間 / 安定vs挑戦 / 一人vsチーム / 幸せな瞬間
4. **なりたい自分**: 5年後の平日 / 憧れの人 / やりたくない生活 / お金の心配なかったら
5. **恐れと障壁**: 踏み出せていない / 止めているもの / 失敗しないなら何をやる

---

## 未実装バックログ

> 2026-03-17 grep監査で確定。実装するかは個別承認制。

### ❌ 未実装（17件）

| # | 項目 | 分類 | 承認時期 | 備考 |
|---|------|------|---------|------|
| 4 | チャット背景プリセット（夕焼け・星空等） | 機能 | 実装その3 | |
| 6 | AI理解メモ会話回数自動更新（5回ごと） | 機能 | 実装その4 | |
| 7 | FBキーボード見切れ対応 | バグ | 実装その2 | **修正指示済み（グローバルハンドラ化）** |
| 8 | 過去の会話リスト重畳 | バグ | 実装その2 | **修正指示済み（innerHTML空化）** |
| 15 | プロフィール理解度スクロール自動閉じ | UI | 実装その2 | |
| 24 | 紹介者報酬自動処理 | 機能 | 実装その2 | 指示書未作成 |
| 29 | Free→nanoフォールバック | 機能 | 実装その2 | 指示書あり（fix_free_plan_model_switching.md）未実行 |
| 32 | トリセツPDF出力 | 機能 | 実装その1 | HTMLにボタンはあるがJS関数なし |
| E-4 | ゴールアシスト完了→ホーム戻り | 機能 | 実装その3 | |
| E-6 | ゴール化閾値3段階判断 | 機能 | 実装その3 | SYS_HOMEに文言あるが専用ロジックなし |
| E-10 | 過去会話ゴール候補★ | 機能 | 実装その3 | Phase 2候補 |
| E-13 | 複数ゴール同時検出 | 機能 | 実装その3 | Phase 2候補 |
| E-16 | クイックゴール（ロングタップ→即登録） | 機能 | 実装その3 | Phase 2候補 |
| E-17 | 達成報告検出+コンフェッティ | 機能 | 実装その3 | Phase 2候補 |
| E-19 | 定期チェックイン（ストリーク連動） | 機能 | 実装その3 | Phase 2候補 |
| E-20 | 会話テーマ自動タグ | 機能 | 実装その3 | Phase 2候補 |
| 14 | AI理解メモ更新時のユーザー通知トースト | 機能 | 実装その2 | ai_memo_updated_atはあるが通知なし |

### ⚠️ 部分実装（3件）

| # | 項目 | 状態 |
|---|------|------|
| E-1 | AIゴール検出エンジン | SYS_HOME内のルールのみ、専用関数なし |
| 5 | スワイプ感度改善 | touchstartあるがinitTabSwipe未実装 |
| 14 | AI理解メモ更新通知 | ai_memo_updated_atあるがトースト通知なし |

### 手動確認必要（8件）

| # | 項目 | 確認方法 | 状態 |
|---|------|---------|------|
| 9/10 | テスター案内文TESTER01-05更新 | 配布直前に作成 | ⬜ |
| 17 | Supabaseマイグレーション2回分 | ダッシュボード確認 | ⬜ |
| 18 | OWNER_SECRET環境変数 | wrangler secret list | ⬜ |
| 19 | CLAUDE_updated_v2.mdのCode適用 | cat CLAUDE.md \| head -3 | ⬜ |
| 26 | Git push | git log --oneline -1 | ⬜ |
| 27 | Gemini課金有効化 | Google Cloud確認 | ✅ 対応済み |

---

## 完了済みバグ修正履歴

### v3.2.4（2026-03-17）
- 空バブル防止ガード8箇所 + executeRoute parentElement修正
- line-height 1.78→1.5 + br余白4px + p余白12px統一
- .msg align-items:flex-start + msg-av margin-top:2px + デッドCSS削除

### v3.3.0（2026-03-17）
- 悩み相談廃止、4画面統合（renderChatUI共通関数）
- パーソナルプロフィール注入（Worker側自動合成）
- ホーム動的コーチング検出
- AIロール設定（全画面デフォルト + ゴールハブ選択式）
- AI理解メモ自動生成・閲覧
- デザイン/FBのFreeカウント無し

### v3.3.1（2026-03-17）
- プロフィール2分割廃止→1ページスクロール
- AI理解度セクション追加（折りたたみ式）

### v3.3.3〜v3.3.8（2026-03-17）
- テスターコード5ティア、URL自動適用、オーナーバイパス
- SW自動更新（skipWaiting + clients.claim）
- history.replaceState修正、ウェルカム画面変更
- SVGアイコン化、ツールチップ修正、サイドバーレイアウト改善

### 過去の修正（〜v3.1.5）
- コード整理: 9,631行→9,489行
- Worker側クリティカル5件（CORS/Free制限/Stripe URL/使用量カウント/JSONパース）
- フロントエンド10件（XSS/Cookie/viewport/OGP等）
- 200項目バグ検証完了

---

## バージョン履歴

| バージョン | 日付 | 主な変更 |
|----------|------|---------|
| v18 | 2026-03-09 | 3AIディープ分析・出力形式5種・プラン別使用制限 |
| v19 | 2026-03-09 | 全API呼び出しをCloudflare Worker経由に移行 |
| v20 | 2026-03-12 | Cookie永続化・ストリーミング文字化け修正・IME対応・Stripe決済UI |
| v20+ | 2026-03-13 | Supabase連携・デモデータ削除・スマホUI・フィードバック・音声Whisper・ロゴ変更 |
| v2.0 | 2026-03-14 | 音声UX・ルーティング・高速化・Netlify→Cloudflare Pages移行 |
| v2.1 | 2026-03-15 | Phase 1全7機能・Premium追加・LP・法務ページ・コード整理・200項目バグ検証 |
| v5-full | 2026-03-16 | プラン4段階化・GPT-5/Gemini 2.5全面更新・集客施策追加 |
| v5.1 | 2026-03-16 | 実装完了サマリー反映・クーポン一回限り・フィードバック強化9項目 |
| v5.2 | 2026-03-16 | Claude Code鉄則ルール追加・保全確認grep義務化 |
| v5.3 | 2026-03-16 | ファイル分割・Vite移行方針追加 |
| v5.4 | 2026-03-16 | 指示書3分割・承認ルール・6視点改善提案・競合差別化提案ルール追加 |
| v5.5〜v5.8 | 2026-03-17 | PWA化・監査修正・チャットエンジン共通化・デバイス情報 |
| v5.9 | 2026-03-17 | 4画面統合・パーソナル注入・AIロール・AI理解メモ・プロフィール改善・テスター配布準備 |
