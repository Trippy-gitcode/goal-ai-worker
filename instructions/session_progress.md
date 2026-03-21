# GOAL AI — プロジェクトダッシュボード
> このファイルが Code のセッション引き継ぎの唯一の情報源
> セッション開始時に必ず読む。セッション終了時に必ず更新する。
> 仕様参照: docs/goal_ai_project_v6_4.md / docs/goal_ai_reference_v2.md

---

## 現在地
- **バージョン:** v3.9.3
- **チェーン:** 開発体制改善ミッション
- **次のミッション:** キュー空

## ミッションキュー（上から順に実行）

### 完了済み
- KICKOFF-001 Step 0〜8c ✅
- UX-001〜003 ✅
- テスト配布前 #1〜12 ✅（#2 Vite化のみ後回し）

### 開発体制改善ミッション（Code自律実行）
1. ✅ デザイン実装検証+修正: CRN-02 .msg-model gray, CRN-03 入力ボックス4画面統一(0.5px amber/14px), GPT電球アイコン実使用
2. ✅ canopy.sh HTTPスモークテスト (8エンドポイント: version/health/auth-401s/frontend)
3. ✅ canopy.sh実行時間計測 (start/end + total秒数)
4. ✅ Freeプラン残り回数バー (サイドバー、セッションカウント)
5. ✅ Pages プレビュー → Dashboard設定のみ (ドキュメント化)
6. ✅ 提案ログテンプレート → 既存

### ふとし手動タスク（Code実行不可）
- [ ] スマホ+PC通しテスト
- [ ] 自分で1週間テスト使用
- [ ] テスターにURL共有（TESTER01〜05コード）
- [ ] テスト配布FB項目に「料金プランの分かりやすさ」含める
- [ ] 1分間使い方デモ動画を用意
- [ ] ローンチ時「ソロ開発者がAIと3週間で作ったSaaS」ストーリー活用

## 直近の変更履歴（直近3件のみ。過去分はinstructions/results/に保存）

### 開発体制改善ミッション (2026-03-22) ✅
- #1: デザイン検証修正 (CRN-02 gray, CRN-03 入力統一4画面, GPT電球アイコン)
- #2-3: canopy HTTP 8エンドポイント + 実行時間計測
- #4: Free残り回数バー (サイドバー)
- git tag: design-verify-complete / devinfra-complete

### テスト配布前ミッション (2026-03-22) ✅
- #1: fontsize-init.js + sw-register.js 外部化
- #3: manifest.json新規作成（PWA installable）
- #5: Free daily_limit超過→nano fallback
- #7: data-model属性でバブル固有モデル名保持
- #2 Vite化→後回し、#4,6,8-12: 既存実装確認済み
- git tags: mission1-complete / mission3-complete / mission5-complete

### UX-001〜003 (2026-03-22) ✅
- 初期タスク段階式 / コーチマーク3点 / AI最適化%表示
- git tags: ux001-complete / ux002-complete / ux003-complete

### KICKOFF-001 Step 7〜8c (2026-03-21) ✅
- フロントエンドv6.3 / 共通コンポーネント / 各画面UI / プラン演出
- canopy.sh 49項目全PASS
- git tags: step7-complete 〜 step8c-complete

## 未解決の問題
- 🔴 Step 8a〜8cの「完了」がgrep確認のみで、実際のレンダリングにデザイン変更が反映されていない（ふとしがスクリーンショットで確認。ホーム画面のデザインが旧デザインのまま）。根本原因: canopyが静的grep検証のみで動的レンダリング検証がない。対応: ミッション#1で全項目検証+修正

## 提案ログ
### キュー空時のルール
キュー空 → docs/goal_ai_project_v6_4.md §8 + docs/goal_ai_reference_v2.md + コードベースgrepで未実装を特定 → ここに候補記載 → ふとしに報告して停止 → 承認後キューに移動

### テンプレート（候補記載時）
| # | タスク名 | 影響範囲 | 工数目安 | 優先度案 |
|---|---------|---------|---------|---------|
| - | 例: ○○ | frontend/js/chat.js | 30分 | 🟡 |

### 承認済み未実装（キュー消化後に順次対応）
- Vitestユニットテスト基盤（Vite化時に導入。formatModelName等の純粋関数から）
- git tagにバージョン番号含める（v3.9.3-mission1形式。次のタグから適用）
- C9: セッション開始時にCLAUDE.md参照ファイルの存在検証
- A2: 5セッションごとの棚卸し（CLAUDE.md/rules/progress整合性確認）

---

## Stripe Price ID マッピング
| プラン | fixed | metered | annual |
|--------|-------|---------|--------|
| Light | price_1TCzZj...hTbAwTYK | price_1TCzsw...jD8aUGIm | price_1TCztW...qwlf41QK |
| Pro | price_1TCzv6...eTSyND0a | price_1TCzwJ...pKKWw6nV | price_1TCzwo...tfRAkNFr |
| Max | price_1TCzz4...YnrDA4vv | price_1TCzzk...iQmUneA7 | price_1TD009...1yAJuPoz |
| Ultra | price_1TD03i...lPdCgNCJ | — | price_1TD041...VSJtVFrd |
| Addon 50 | price_1TD3QJ...OlOzERwV | — | — |
| Addon 120 | price_1TD3QK...uP63gUOn | — | — |

## Supabase
- URL: https://wrvwcfilokfcjudspizp.supabase.co
- Service Key: tests/.env.test
