# GOAL AI — プロジェクトダッシュボード
> このファイルが Code のセッション引き継ぎの唯一の情報源
> セッション開始時に必ず読む。セッション終了時に必ず更新する。
> 仕様参照: docs/goal_ai_project_v6_4.md / docs/goal_ai_reference_v2.md

---

## 5行サマリー
- **Version:** v3.11.16（デプロイ済み）
- **Next:** G4（ホームレイアウト改善）
- **Last done:** G1-G6完了。G5=待機アニメ、G6=S3プリウォーム+S1プリルーティング+S5キャッシュ+Fプレビュー+C時間帯ヒント
- **Open issues:** G6のS4/E/Dは次フェーズ（Supabaseマイグレーション+UI設計必要）
- **Proposals:** 消化済み

## 現在地
- **バージョン:** v3.11.16（デプロイ済み）
- **チェーン:** G4 → テスト配布
- **次のミッション:** G4 ホーム画面レイアウト改善

## ミッションキュー（上から順に実行）

### G1: ホームヘッダー全アイコン拡大（ふとし承認済み 2026-03-27）
> 目的: ホームチャット画面のヘッダーアイコンをClaude.aiアバター相当（28px）に統一。山ロゴも48px→64pxに拡大
> リスク: 🟢低（サイズ変更のみ。レイアウト構造変更なし）
> 対象ファイル: docs/mockups/02a_home_prechat.html（mockup）、frontend/index.html（実装）
> C16フロー: Stage 0（mockup更新前後比較→ふとし承認）→ Stage A（localhost比較）→ デプロイ → Stage B

**変更仕様（Claude.ai承認済み）:**
| 対象 | 現状 | 変更後 |
|---|---|---|
| ハンバーガー幅 | 14px | 18px（SVGアイコンも比例拡大） |
| 時計・検索ボタン（`.tb-i`相当） | 20×20px | 28×28px |
| G/Tバッジ（`.tb-c`相当） | 20×20px / font 8px | 28×28px / font 11px |
| ＋ボタン（`.tb-ng`相当） | 20×20px | 28×28px |
| 山ロゴ（`#home-hero` SVG） | 48×48px | 64×64px |

**実装手順:**
1. mockup（02a_home_prechat.html）のCSS（`.tb-i` `.tb-c` `.tb-ng` `.tb-ham`）とSVGサイズを更新
2. C16 Stage 0: mockup更新前後の比較画像を生成 → `docs/mockups/screenshots/a1_home/mock_review/s0_diff.png` → ふとし承認待ち
3. ふとし承認後 → 実装（frontend/index.html）の該当インラインスタイルを更新（`home-chat-toolbar`内の全ボタン + `home-hero` SVG）
4. C16 Stage A → デプロイ → Stage B

### G2: チャットメッセージ間の横線削除（ふとし承認済み 2026-03-27）※G1とバッチデプロイ可
> 目的: チャット画面の各メッセージを区切る横線を削除してすっきりさせる
> リスク: 🟢低（CSS1行変更のみ）
> 対象ファイル: frontend/style.css（L432付近）

**変更仕様:**
```css
/* 変更前 */
.msg{border-bottom:1px solid var(--border);padding-bottom:12px}
/* 変更後 */
.msg{padding-bottom:12px}
```
**mockup更新:** 不要（チャット画面のmockupにborder-bottom指定なし）
**C16:** Stage A（localhost比較）→ G1と同一デプロイ → Stage B

---

### G6: ルーティング充実 + 速度改善バッチ（ふとし承認済み 2026-03-27）
> 目的: ルーティング精度向上 + 体感・実測両面の速度改善
> リスク: 🟡中（ルーティングロジック変更。コスト影響は軽微。プラン差別化には影響なし）
> 対象ファイル: frontend/js/chat.js、src/services/ai/routing.js、src/routes/chat.js
> コスト影響確認: D（Supabaseへのwrite増加）のみ軽微。それ以外はコスト中立

---

**【速度改善 — 最優先】**

**S1: 入力中プリルーティング（F採用 + 速度改善に直結）**
- ユーザーが入力中（debounce 800ms）にフロントエンドの`routeMessage()`を先行呼び出し
- 結果を`_preRoutedResult`にキャッシュ。送信時にキャッシュがあればAPI呼び出しをスキップ
- キャッシュ有効期間: 入力が止まってから3秒間（それ以降に送信したら再ルーティング）
- quickRouteでconfirm済みなら即キャッシュ（API呼び出し不要）
- **期待効果: ルーティング待ち時間（平均500〜800ms）をほぼゼロに**

**S2: AbortController連鎖（入力再開でルーティングをキャンセル）**
- 入力中にdebounceが走るたびに前のroutingリクエストをabort()
- 無駄なAPI呼び出しを削減し、最新入力に集中

**S3: Worker接続プリウォーム**
- アプリ起動時（DOMContentLoaded）に`/api/version`へ軽量GETを1回送信
- Cloudflare Workersのコールドスタート（最大300ms）を初回メッセージ前に解消
- **期待効果: 初回送信の体感速度が大幅改善**

**S4: ルーティングとストリーム接続を並列化**
- 現状: routeMessage()完了 → ストリーム接続開始（直列）
- 改善: routeMessage()呼び出しと同時にWorkerへのTCP接続を確立（`fetch` with `{ priority: 'high' }`）
- ルート確定後に即ストリーム開始。接続待ち時間をルーティング時間に隠蔽
- **期待効果: TTFTが200〜400ms短縮**

**S5: 同一・類似メッセージのルーティングキャッシュ**
- `sessionStorage`に直近20件のルーティング結果を`{text → route}`でキャッシュ
- 完全一致 or レーベンシュタイン距離3以内は同じrouteを返す
- セッション中の再質問（「もう少し詳しく」「他には？」等）を高速化

---

**【ルーティング精度改善】**

**C: 時間帯ヒューリスティック（quickRouteに追加）**
- 朝6〜10時: タスク・計画系キーワードがあればgptバイアス（claudeへの閾値を上げる）
- 夜21〜25時: 感情・振り返り系はclaudeバイアス
- 実装: `routeMessage()`でquickRoute前に時間帯フラグを立て、LLMプロンプトのヒントとして追加
- 精度限界を補うため「補助ヒント」止まり。LLMの最終判断を上書きしない

**D: ルーティングフィードバック学習**
- ユーザーが「別のAIで試す」ボタンを使った場合、`{message_hash, original_route, chosen_route}`をSupabaseの`routing_feedback`テーブルに保存
- 蓄積データはテスト配布後にバッチ分析してquickRouteパターン改善に活用
- **「別のAIで試す」ボタンはG5完了後のミッションで別途UI設計（Claude.ai側でmockup作成）**
- テーブル設計: `routing_feedback(id, user_id, message_hash TEXT, original_route TEXT, chosen_route TEXT, created_at)`

**E: 信頼度付きルーティング + 代替AI提案**
- `ROUTE_PROMPT`に`"confidence": 0-100`フィールドを追加
- confidence < 70 の場合: 回答後に「他のAIでも試しますか？」をサジェスト表示
  - 例: claudeで回答 + confidence=60 → 「ChatGPTでも聞いてみる →」ボタンを表示
- confidence ≥ 70: サジェスト非表示（現状と同じ）
- サジェストタップ時にfeedback学習（D）のデータも記録

**F: 入力途中のAI名プレビュー（S1と一体実装）**
- S1のプリルーティング結果が出たらヘッダーのG/Tバッジまたは入力欄横にAI名を小さくプレビュー
- 例: 入力中に「Claude」「ChatGPT」「Gemini」のいずれかがフワッと表示
- 送信後にそのまま「〇〇が考えています...」に切り替わる（G5と連携）

---

**実装順序（Code自律判断）:**
1. S3（プリウォーム）— 最小変更・最大効果
2. S1 + S2 + F（プリルーティング + プレビュー）— S1とFは一体実装
3. S4（並列化）
4. S5（キャッシュ）
5. C（時間帯ヒューリスティック）
6. E（信頼度 + サジェスト）
7. D（feedbackテーブル）— Eのサジェストと一体実装

**注意事項:**
- S1プリルーティング用のprivacy.html追記済み（2026-03-27 L137）。G6デプロイ時に `npm run deploy:frontend` で含めること
- DのSupabaseテーブル追加はマイグレーション必要。`supabase migration`で管理

### G5: 待機中アニメーション改善（ふとし承認済み 2026-03-27）
> 目的: AI応答待ちの体感時間を短縮。フェーズ別テキスト表示 + タイピング演出
> リスク: 🟢低（フロントエンドのUI表現のみ。ルーティングロジック変更なし）
> 対象ファイル: frontend/js/chat.js、frontend/style.css
> C16: mockup変更なし → Stage A（localhost確認）→ デプロイ → Stage B

**変更仕様（Claude.ai承認済み）:**

【A. フェーズ別テキスト表示】
| フェーズ | 表示テキスト | 条件 |
|---|---|---|
| ルーティング中（>1秒経過後のみ） | `どのAIが適任か相談中...` | callRoutingAPI呼び出し中かつ1秒超過 |
| ルーティング中（quickRoute確定） | 表示スキップ → 即AI名表示 | quickRouteでroute確定した場合 |
| AI応答待ち | `ChatGPT / Claude / Gemini が考えています...` | ストリーム開始前 |
| ストリーム開始後 | テキスト表示に切り替え | 最初のtokenが届いたら即消す |

【B. タイピング演出】
- ストリーム開始前（最初のtoken未着): `・・・` を表示（グレー、点滅アニメなし）
- 最初のtoken到着: `・・・` を消し、`_` カーソル点滅に切り替え（@keyframes blinkで500ms間隔）
- ストリーム中: テキストをなるべく一定速度で表示（token到着が速い場合は意図的に間引いて均一化。目標: 1文字あたり約30〜50ms）
- ストリーム完了: カーソル消去

【C. quickRoute確定時のAI名即表示（提案2採用）】
- quickRouteで route確定した場合、callRoutingAPI呼び出し前に即座にAI名バッジを表示
- 「判断中」テキストはスキップ

### G4: ホーム画面レイアウト改善（ふとし承認済み 2026-03-27）
> 目的: プリセットカスタマイズ機能追加 + キーボード表示時のレイアウト最適化
> リスク: 🟡中（状態管理・JS変更あり）
> 対象ファイル: docs/mockups/02a_home_prechat.html（mockup）、frontend/index.html・js/chat.js・style.css（実装）
> C16フロー: Stage 0 → Stage A → デプロイ → Stage B

**変更仕様（Claude.ai承認済み）:**

【A. プリセット✏アイコン追加】
- `#home-presets` の右上に小さいペンシルアイコン（SVG, 14px, opacity:0.5）を追加
- ラベルなし。タップで編集モーダルを開く
- 編集モーダル: 各プリセットをインライン編集・削除（×）・追加（＋）・保存
- 保存先: ログイン済み → Supabase `user_settings`（既存テーブルのJSONフィールド）、未ログイン → localStorage
- 上限: 6件

【B. 3状態レイアウト】

**① デフォルト（キーボードなし）:**
- 現状維持。プリセット（✏付き）・入力ボックス・タスクボックスを表示

**② 入力中・会話前（キーボード表示時）:**
- ヒーロー・プリセット: 表示維持
- タスクボックス: **非表示**（キーボード表示と同時に隠す）
- 入力ボックス: キーボード直上に固定（`visualViewport` APIまたは `env(keyboard-inset-height)` で対応）

**③ 会話中（メッセージ送信後）:**
- ヒーロー・プリセット・タスクボックス: 非表示
- 過去メッセージ: スクロール領域（`#home-chat-wrap`）。スクロール最下部 = 最新メッセージ
- 最新メッセージ: 入力ボックスの上に固定表示（左右マージンはタスクボックス・入力ボックスと同じ `14px`、上下gap = `11px`）
- 入力ボックス: キーボード表示中は常にキーボード直上に固定

**状態遷移:**
- デフォルト → ② : input focus時
- ② → デフォルト : input blur（かつ未送信）
- ② → ③ : メッセージ送信
- ③ → デフォルト : 新規チャット（`newHomeChat()`）

### G3: ルーティングバグ調査（G1・G2完了後に着手）
> 目的: 「今日やること整理」がClaude Opusにルーティングされた原因を特定・修正
> リスク: 🟡中（ルーティングロジック変更の可能性あり）
> 背景: ルーティングプロンプト（routing.js L27）では「タスク相談」→ gpt が正。Claude Opusが返った原因不明

**調査手順:**
1. Cloudflare Workers のログ（`wrangler tail`）で当該リクエストのroutingAPI応答を確認
2. callRoutingAPI の返値が `claude` だった場合 → プロンプト改善（「タスク整理」を gpt 例示に追加）
3. 返値が `gpt` だったのにClaudeが呼ばれた場合 → モデル振り分けロジックのバグ
4. 修正後、「今日やること整理」で3回連続テストしてgptルートを確認
> コスト影響: ルーティングプロンプト変更はコスト中立。モデル振り分けロジック変更はプラン差別化に影響しないため設計変更として自律対応可

---

### スクショフォルダ構造整理 ✅完了（2026-03-25）
> 目的: 既存のスクショ画像を新フォルダ構造に移動・リネーム
> リスク: 🟢低（ファイル移動のみ）

**結果:** 43ファイルを9画面×{mock_review, impl_compare}に配置完了
**スクリプト更新:** c16_stage_a.js, c16_stage_0.js の出力パスを新構造に更新済み

**構造:** `docs/mockups/screenshots/{画面ID}/{mock_review,impl_compare}/s0_*.png, sa_*.png`

---

### Stage 0 + Stage A: ふとし承認済み ✅（2026-03-27）
> s0_（mockup確認）+ sa_（実装比較）全8画面承認完了

---

### mockup文字化け修正+compare画像再生成+リネーム ✅完了（2026-03-25）
> 目的: 6画面のmockup HTML文字化けを修正し、全8画面のcompare画像を再生成する。ファイル命名規則を新ルールに統一
> リスク: 🟢低（HTMLのcharset修正+画像再生成のみ）

**原因:** 6画面のmockup HTMLはフラグメント（DOCTYPE/charset宣言なし）。Playwrightが直接読み込むとcharset未指定で文字化け
**修正:** `scripts/c16_stage_a.js` を更新。フラグメントHTMLは `_viewer.html?f=ファイル名` 経由で読み込み（_viewer.htmlにcharset=UTF-8あり）。mockup原本は変更なし
**結果:** 全8画面の `sa_{画面ID}_compare.png` を文字化けなしで再生成。旧命名ファイル削除済み

**ふとし確認待ち:** Finderで `docs/mockups/screenshots/` を開いて `sa_*_compare.png` 8枚を確認 → 承認後デプロイ

---

### C16 Stage A一括検証 ✅Stage A PASS（2026-03-25）
> 目的: A2-A5/B1-B5の全8画面に対しC16 Stage A（localhost比較）を実施。A1は検証済みのためスキップ
> リスク: 🟡中（差分発見時は修正→再検証ループ）
> 参照: development_rules.md C16（2段階検証 Stage A/B）

**検証方法:**
1. mockup配信: `python3 -m http.server 8765` (docs/mockups/)
2. 実装配信: `npx vite preview --port 4173` (frontend-dist/)
3. Playwrightで全8画面のスクショを自動撮影（scripts/c16_stage_a.js）
4. mockup/実装の横並びcompare画像を自動生成
5. 全38構造要素のコードgrep確認

**10ファクター検証結果:**

| 画面 | 構造差分 | データ依存差異 | 判定 |
|---|---|---|---|
| A2 ビジョン | 0件 | AI分析データ空（未ログイン） | PASS |
| A3 ゴール連携 | 0件 | ゴール未設定→空表示 | PASS |
| A4 プロフィール | 0件 | プロフィールデータ空 | PASS |
| A5 プラン | 0件 | プランカード・dots表示確認 | PASS |
| B1 GoalHubタスク | 0件 | GoalHub=ゴール必須→ホーム表示 | PASS |
| B2 GoalHub設定 | 0件 | 同上 | PASS |
| B3 解析 | 0件 | ストリーク=0、3AI section存在 | PASS |
| B4+B5 設定 | 0件 | referral非表示(free)、promo card存在 | PASS |

**構造要素検証:** 38/38 FOUND（A3互換性バー・A5 dotインジケーター・B1-B5全新規要素含む）
**compare画像:** `docs/mockups/screenshots/` に全8画面保存済み
  - a2_vision_compare.png, a3_goal_link_compare.png, a4_profile_compare.png
  - a5_plan_compare.png, b1_hub_tasks_compare.png, b2_hub_settings_compare.png
  - b3_analytics_compare.png, b4b5_fb_settings_compare.png

**検証範囲:** ソースレベル構造確認 + localhost視覚比較（Stage A）。Stage B（デプロイ後本番URL）は未実施

**ふとし確認待ち:** Finderで `docs/mockups/screenshots/` を開いて全compare画像を確認 → 承認後デプロイ

---

### A2 ビジョン mockup更新 ✅完了（2026-03-24）
> 目的: ビジョン画面を実装準拠にmockup HTMLを更新する（実装変更なし）
> リスク: 🟢低（mockup更新のみ）
> 参照: docs/design_reverse_audit.md #06b、docs/mockups/06b_vision.html

**mockup更新内容（実装を正とする）:**
1. 「キャッチコピー」セクション＋再生成ボタンを追加
2. MY CHARACTERの位置を先頭→下部に移動
3. MY CHARACTERの構造を金枠引用文→4行テーブル（性格タイプ/行動スタイル/コアバリュー/成長エッジ）に変更

**C16検証:** mockup更新後、実装と全10ファクターで差分0件を確認

---

### A4 プロフィール mockup準拠修正 ✅完了（2026-03-24 mockup更新のみ、実装変更なし）
> 目的: プロフィール画面をmockup準拠に修正。mockupにある機能で実装にないものは追加。mockupにない機能でふとしが残すと判断したものはmockup更新
> リスク: 🟡中（UI変更+mockup更新）
> 参照: docs/design_reverse_audit.md #06d、docs/mockups/06d_profile.html

**実装修正（mockup準拠）:**
1. 強み・弱みの表示をテキストリスト→チップ選択に変更（mockupの表示形式に合わせる）

**mockup更新（実装を正として追加）:**
1. アバター写真アップロード（カメラアイコン＋ファイル入力）
2. 「タップして変更」ラベル
3. 「なんて呼ばれたい？」フィールド
4. 「使える時間・条件」入力
5. MBTI完全テスト（10問/60問モード）
6. エネルギータグ（もらう/奪われる）
7. 人間関係・サポートネットワーク4質問
8. AI提案チップ＋承認ボタンをmockupから削除（実装にない）

**mockupにある機能で実装に追加:**
- mockup上のAI提案チップ＋「提案を承認/編集する」は削除（上記#8）

**テスト配布後FB:** 表示ビュー vs 常時編集フォームの判断

**C16検証:** 修正後、全10ファクターで差分0件を確認

---

### A5 プラン 横カルーセル化 ✅完了（2026-03-24 v3.11.10）
> 目的: プラン選択画面をmockup準拠の横カルーセルに変更。Ultraプランをmockupに追加
> リスク: 🟡中（レイアウト大幅変更）
> 参照: docs/design_reverse_audit.md #08d、docs/mockups/08d_plan.html

**実装変更:**
1. 縦スタック→横カルーセルに変更（mockup準拠）
2. ドットインジケーター追加

**mockup更新:**
1. Ultraプランカード追加（5枚目。v6.3契約セクション準拠）
2. 月額/年間トグルをmockupに追加
3. 利用額バーをmockupに追加
4. ダウングレードリンクをmockupに追加
5. フェアユース脚注をmockupに追加
6. プロモコード入力セクションをmockupに追加

**C16検証:** 修正後、全10ファクターで差分0件を確認

---

### A3 ゴール連携 互換性バー実装 ✅完了（2026-03-24）
> 目的: ゴール連携画面をmockup準拠に修正。互換性バーを実装し、AI応答からスコアを抽出するプロンプト設計を追加
> リスク: 🔴高（プロンプト設計+AIパース+UI変更）
> 参照: docs/design_reverse_audit.md #06c、docs/mockups/06c_goal_link.html

**実装変更:**
1. 現在の3セクション表示（⚠確認項目/💡アイデア/📊FB）→ 互換性バー（%表示）+ AIアドバイスに変更
2. AIへのプロンプトに互換性スコア（0-100）を返すよう指示を追加
3. AI応答パースロジック: compatibilityフィールドの抽出→バー表示
4. パース失敗時のフォールバック: 従来の3セクション表示を維持

**注意:** プロンプト設計はコスト影響なし（既存のゴール連携API呼び出し内で応答形式を指定するだけ）。ただしAI応答の安定性テストが必要

**C16検証:** 修正後、全10ファクターで差分0件を確認

---

### B4 NPS 0-10スコアグリッド実装 ✅完了（2026-03-24）
> 目的: フィードバック画面にNPS 0-10スコアグリッドを追加（mockup準拠）
> リスク: 🟢低（UI追加のみ）
> 参照: docs/design_reverse_audit.md #08b、docs/mockups/08b_feedback.html

**実装変更:**
1. フィードバックフロー内にNPS 0-10の数字ボタングリッドを追加
2. スコア選択後に次のステップに進む
3. mockupのクイックリプライラベルに合わせる（改善してほしい**点がある** / バグを**見つけた**）
4. 入力欄を`<textarea>`→`<input type="text">`に変更（mockup準拠）

**C16検証:** 修正後、差分0件を確認

---

### B1 AI提案カード実装（ふとし承認済み 2026-03-24 実装その21）
> 目的: GoalHubタスク画面にAI提案カードを追加（mockup準拠）
> リスク: 🟡中（AI応答のUI表示追加）
> 参照: docs/design_reverse_audit.md #05b、docs/mockups/05b_goalhub_tasks.html

**実装変更:** mockupの05b_goalhub_tasks.htmlに記載されたAI提案カードのUI・動作を実装

**C16検証:** 修正後、差分0件を確認

---

### B2 GoalHub設定 通知・エクスポート実装（ふとし承認済み 2026-03-24 実装その21）
> 目的: GoalHub設定画面に通知セクション・エクスポートセクションを追加（mockup準拠）
> リスク: 🟡中
> 参照: docs/design_reverse_audit.md #05e、docs/mockups/05e_goalhub_settings.html

**実装変更:** mockupの05e_goalhub_settings.htmlに記載された通知・エクスポートUIを実装

**C16検証:** 修正後、差分0件を確認

---

### B3 三人寄れば文殊の知恵 実装（ふとし承認済み 2026-03-24 実装その21）
> 目的: 解析ページに「三人寄れば文殊の知恵」機能を追加（mockup準拠）
> リスク: 🟡中（複数AI呼び出し）
> 参照: docs/design_reverse_audit.md #08a、docs/mockups/08a_analysis.html

**実装変更:** mockupの08a_analysis.htmlに記載された3AI比較分析UIを実装
**注意:** コスト影響あり（3モデル同時呼び出し）。提案ログに記載→承認済み（実装その21）

**C16検証:** 修正後、差分0件を確認

---

### B5 設定画面 友達紹介・プロモコード実装（ふとし承認済み 2026-03-24 実装その21）※B4とバッチデプロイ可（両方🟢）
> 目的: 設定画面に友達紹介セクション・プロモコード行を追加（mockup準拠）
> リスク: 🟢低（UI追加のみ）
> 参照: docs/design_reverse_audit.md #08c、docs/mockups/08c_settings.html

**実装変更:** mockupの08c_settings.htmlに記載された友達紹介・プロモコードUIを実装

**C16検証:** 修正後、差分0件を確認

---

## 完了済み（実装その21でクローズ）
- A1 mockupレイアウト変更+全10ファクター再検証 ✅（v3.11.10）ふとし承認済み
- C16自己検証ループ実装+A1再検証 ✅（v3.11.10）
- 逆方向デザイン照合 ✅（docs/design_reverse_audit.md）
- ホームレイアウト順序修正 ✅（A1に統合）
- 開発インフラ改善バッチ ✅（v3.11.5）

---

## 提案ログ（2026-03-24 キュー空時自律調査）

| # | 項目 | 仕様出典 | リスク | 備考 |
|---|------|----------|--------|------|
| 1 | チャット背景プリセット（夕焼け/星空等） | reference_v2 §Backlog | 🟡 | UI仕様あり、コード0件 |
| 2 | AIメモ自動更新（5ターンごと） | reference_v2 §Backlog | 🟡 | トリガーロジックなし |
| 3 | リファラル報酬の自動処理 | reference_v2 §Backlog | 🔴 | Stripe連携必要 |
| 4 | 過去会話からゴール候補を抽出 | reference_v2 §Backlog E-10 | 🟡 | 履歴マイニングなし |
| 5 | 会話テーマ自動タグ付け | reference_v2 §Backlog E-20 | 🟢 | 完全未実装 |
| 6 | 複数ゴール同時検出 | reference_v2 §Backlog E-13 | 🟡 | 1ターン1ゴールのみ |
| 7 | クイックゴール（長押し→即登録） | reference_v2 §Backlog E-16 | 🟢 | ゴール用なし |
| 8 | 達成レポート検出+紙吹雪 | reference_v2 §Backlog E-17 | 🟢 | 検出ロジックなし |
| 9 | 定期チェックイン（ストリーク連動） | reference_v2 §Backlog E-19 | 🟡 | チェックインプロンプトなし |
| 10 | プロフィール理解セクション スクロール時自動閉じ | reference_v2 §Backlog | 🟢 | 未実装 |

## 完了済みミッション詳細・照合結果・提案ログ過去分

→ **instructions/results/session_history.md** に移動済み
