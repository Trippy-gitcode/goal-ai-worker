# GOAL AI — プロジェクトダッシュボード
> このファイルが Code のセッション引き継ぎの唯一の情報源
> セッション開始時に必ず読む。セッション終了時に必ず更新する。
> 仕様参照: docs/goal_ai_project_v6_4.md / docs/goal_ai_reference_v2.md

---

## 現在地
- **バージョン:** v3.10.0
- **チェーン:** 提案ログK-O完了
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

### テスト配布前 追加ミッション（ふとし承認済み 2026-03-22）
A. ✅ アカウント削除（POST /api/account/delete + 2段階confirm + Supabase全テーブル削除 + KVクリア + localStorage/cookieクリア）
B. ✅ Ultraコンテキスト2倍（buildCompressedMessagesにcontextMultiplier引数、Ultra=20メッセージ窓）
C. ✅ ET週間上限トラッキング（KVベース、checkETLimit/incrementETUsage、/api/plan/statusにet情報追加）

### 提案ログD-J実装（ふとし承認 2026-03-22）
D. ✅ 達成報告検出+コンフェッティ（AI応答パターンマッチ→confetti/milestone）
E. ✅ 定期チェックイン（ストリーク連動、1日1回localStorage）
F. ✅ クイックゴール（600msロングタップ→ゴール作成画面）
G. ✅ チャット背景プリセット（なし/ドット/グリッド/ウェーブ、設定パネル）
H. ✅ Vite + ES Modules完全移行（publicDir, esbuild minify, hashed assets, deploy:frontend）
I. ✅ Playwright E2E（features.spec.ts: プランモーダル/設定/オンボーディング/API認証）
J. ✅ メモ生成KVロック（60秒TTL、重複実行防止）

### ふとし手動タスク（Code実行不可）
- [ ] スマホ+PC通しテスト
- [ ] 自分で1週間テスト使用
- [ ] テスターにURL共有（TESTER01〜05コード）
- [ ] テスト配布FB項目に「料金プランの分かりやすさ」含める
- [ ] 1分間使い方デモ動画を用意
- [ ] ローンチ時「ソロ開発者がAIと3週間で作ったSaaS」ストーリー活用

## 直近の変更履歴（直近3件のみ。過去分はinstructions/results/に保存）

### テスト配布前 追加3件 (2026-03-22) ✅
- A: POST /api/account/delete + Supabase CASCADE + KV/localStorage全削除
- B: Ultra context_multiplier 2.0 → buildCompressedMessages 20メッセージ窓
- C: ET KV週間カウンタ + /api/plan/status et情報
- git tags: v3.9.3-account-delete / v3.9.3-ultra-et

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
- ✅ 解決済み: デザイン未反映の根本原因はAPP_VERSIONの未更新。v3.9.3のままだったためSWが古いキャッシュを配信。v3.10.0に更新してSWキャッシュパージ完了
- ✅ 解決済み: スマホチャットエラーの根本原因はenv.KV(undefined)→env.TOKEN_KVの誤参照。修正済み
- 🟡 教訓: CLAUDE.md v16の鉄則5項に「APP_VERSION更新」が含まれていなかった。今後はデプロイ時に必ず更新する

## 提案ログ
### キュー空時のルール
キュー空 → docs/goal_ai_project_v6_4.md §8 + docs/goal_ai_reference_v2.md + コードベースgrepで未実装を特定 → ここに候補記載 → ふとしに報告して停止 → 承認後キューに移動

### テンプレート（候補記載時）
| # | タスク名 | 影響範囲 | 工数目安 | 優先度案 |
|---|---------|---------|---------|---------|
| - | 例: ○○ | frontend/js/chat.js | 30分 | 🟡 |

### 承認済み未実装 → 全完了
- ✅ Vitestユニットテスト基盤（12テスト、constants.test.js）
- ✅ git tagにバージョン番号含める（v3.9.3-vite, v3.9.3-vitest適用済み）
- ✅ C9/A2: 運用ルールとしてCLAUDE.mdに記載済み

### 未実装候補（2026-03-22 第2回調査）

**実装可能（Codeで対応可）**

| # | タスク名 | 影響範囲 | 工数目安 | 優先度案 |
|---|---------|---------|---------|---------|
| K | E-13: 複数ゴール同時検出（1メッセージから複数ゴール候補） | src/services/ai/routing.js, frontend/js/chat.js | 1h | 🟡 |
| L | ダウングレードワンクリック（プランモーダルにダウングレードボタン） | frontend/js/ui.js, src/routes/checkout.js | 1h | 🟡 |
| M | ディープ分析結果→次の会話のシステムプロンプトに注入 | src/routes/chat.js, src/services/prompt.js | 1h | 🟡 |
| N | GDPR対応: データエクスポートAPI（/api/account/export） | src/routes/account.js | 1.5h | 🟡 |
| O | docs/のTODOチェックリスト更新（完了項目を☑に） | docs/goal_ai_project_v6_4.md | 15min | 🟢 |

**手動確認のみ（ふとし対応）**

| # | 項目 | 確認方法 |
|---|------|---------|
| P | Supabaseマイグレーション確認 | Dashboard確認 |
| Q | OWNER_SECRET環境変数 | wrangler secret list |

---

### 未実装候補（2026-03-22 第1回調査 A-J → 全完了）

**テスト配布に影響するもの（優先度高）**

| # | タスク名 | 影響範囲 | 工数目安 | 優先度案 |
|---|---------|---------|---------|---------|
| A | アカウント削除の実装（現在toast「準備中」） | src/routes/新規, Supabase CASCADE | 2h | 🔴 |
| B | Ultraコンテキスト2倍の適用 | src/services/history.js, chat.js | 30min | 🟡 |
| C | ET(Extended Thinking)週間上限トラッキング | src/routes/chat.js, constants.js | 1h | 🟡 |

**UX改善（中期）**

| # | タスク名 | 影響範囲 | 工数目安 | 優先度案 |
|---|---------|---------|---------|---------|
| D | 達成報告検出+コンフェッティ自動トリガー | src/routes/chat.js, frontend/js/goals.js | 1h | 🟡 |
| E | 定期チェックイン（ストリーク連動） | frontend/js/chat.js, Worker通知 | 2h | 🟡 |
| F | クイックゴール（ロングタップ→即登録） | frontend/js/chat.js, style.css | 1h | 🟢 |
| G | チャット背景プリセット | frontend/style.css, ui.js | 30min | 🟢 |

**アーキテクチャ（後回し可）**

| # | タスク名 | 影響範囲 | 工数目安 | 優先度案 |
|---|---------|---------|---------|---------|
| H | Vite + ES Modules完全移行 | frontend/全体, ビルドパイプライン | 4h | 🔴 |
| I | Playwright E2Eテスト拡充 | tests/e2e/ | 2h | 🟡 |
| J | AI理解メモ生成キューイング | src/services/memo.js | 2h | 🟢 |

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
