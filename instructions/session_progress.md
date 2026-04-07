# GOAL AI — プロジェクトダッシュボード
> セッション引き継ぎの唯一の情報源。300行以内を維持。
> 仕様参照: docs/ux_redesign_v2.md（UX刷新仕様855行。実装28で大幅追記済み）
> ミッション定義: templates/mission_template_v2.md準拠（v4: テスト影響連動ゲート+STATUS管理）
> ルール: development_rules.md（索引76行）+ docs/rules/（詳細4ファイル）
> 完了済み詳細: instructions/results/session_history.md
> **LOCK制御:** `## LOCK` セクションが存在する場合、Codeはキュー実行を停止してふとしに報告すること

---

## 5行サマリー
- **Version:** v4.0.17（デプロイ済み 2026-04-07）→ v4.0.18未デプロイ
- **Next:** キュー空。C2基準フロー（bump-version→build→canopy→デプロイ）待ち
- **Last done:** BUG-02 ✅ + UX-02 ✅（タスクインタラクション刷新）
- **Open issues:** なし。デプロイ待ち
- **方針:** テスト配布より「自分が毎日使いたいツール」を優先。コンセプト「君の人生をより素敵に」

## 現在地
- **バージョン:** v4.0.17 → v4.0.18準備中
- **チェーン:** BUG-02 + UX-02完了
- **次のミッション:** キュー空。C2基準フロー実行

---

## ミッションキュー（上から順に実行）

### BUG-02: ✅ 完了（2026-04-08）
> STATUS: DONE

**修正:** フロント4箇所で「日常タスク」(自動ゴール)の推測紐付け表示を抑制。
- renderSecretaryMemo Rule4: 自動ゴール時はゴール名非表示
- processTaskUpdateTags: goalLinked:falseフラグ追加
- renderTodayTimeline/List: ゴール名バッジ非表示
- canopy PASS。推測誘発文言0件（constants.jsは禁止ルール=正）

---

### UX-02: ✅ 完了（2026-04-08）
> STATUS: DONE

**実装:**
1. タスク詳細カード拡張: メタデータ表示（期限/所要時間/エネルギー/場所/背景/リスク）+ 編集/削除ボタン
2. タイムラインドラッグ&ドロップ: 長押し→上下ドラッグ→15分スナップ→時間更新+永続化
3. 完了⭕️改善: navigator.vibrate(50) + EXPフロートポップアップ（expFloatアニメーション）
4. BUG-02連動: ゴールタグ表示でも「日常タスク」非表示

**cmd1-cmd4 全PASS:** drag=7, detail=1, vibrate=2, E2E-05/06=19 PASS/0 FAIL
**未実装（次回）:** 所要時間伸縮（Googleカレンダー式リサイズ）/ ダイヤルピッカー / scheduling_preference学習

---

## 保留事項

### BUG-01b: iOSキーボード問題（HOLD）
- 修正試行3回制限到達。テスト配布後のFBで判断

### TEST-DESIGN font-size 9 FAIL
- 基準12px維持。317箇所の修正はUX-01全面リデザインに延期

### 実装28で追加された重要な学び
- **planのSource of TruthはTOKEN_KV（not Supabase DB）。** テストユーザーのプラン変更は`wrangler kv:key put`で直接更新
- **ux_redesign_v2.mdが855行に肥大化。** 次回のファイル分割を検討（docs/ux/配下に分離）

---

## 提案ログ
| # | 項目 | リスク | 状態 | 根拠 |
|---|------|--------|------|------|
| P1 | initTabSwipe未接続 | 🟢 | 未実施 | |
| P2 | Analytics月別チャート実データ | 🟡 | 未実施 | |
| P3 | タスク溜まり警告 | 🟢 | 未実施 | |
| P6 | AI理解メモ更新トースト | 🟢 | ✅実装済み | |
| P7 | FBキーボード見切れ対応 | 🟢 | 未実施 | |
| P15 | QOL提案エンジン（生成ロジック） | 🟡 | 新規候補 | ux_redesign_v2 |
| P16 | ゴール適合度%表示 | 🟡 | 新規候補 | design_spec_v3 |
| P17 | STATUS_UPDATE→タスク自動展開 | 🟡 | 新規候補 | ux_redesign_v2 A-3 |
| P18 | マインドセットプリセット切替UI | 🟢 | 新規候補 | ux_redesign_v2 |
| P19 | ロードマップ/タイムライン可視化 | 🔴 | 新規候補 | ux_redesign_v2 |
| P20 | 記録→パターン発見→提案サイクル | 🔴 | 新規候補 | ux_redesign_v2 |
| P21 | 画像入力→スケジュール反映 | 🔴 | 新規候補 | ux_redesign_v2 A-4 |
| P22 | チャット背景プリセット | 🟢 | 新規候補 | reference_v2 |
| P23 | ゴール閾値3段階ロジック | 🟡 | 新規候補 | reference_v2 |
| P24 | 定期チェックイン（ストリーク連動） | 🟡 | 新規候補 | reference_v2 |
| P25 | 会話テーマ自動タグ付け | 🟡 | 新規候補 | reference_v2 |
| P26 | 完了タスク自動ソート | 🟢 | ✅完了 | v4.0.12 |
| P27 | 使用量バッジ廃止 | 🟢 | 新規候補 | design_spec_v3 |
| P28 | 停止ボタンfadeアニメーション | 🟢 | 新規候補 | design_amendment_001 |
| P29 | プリセット動的変化（傾向ベース） | 🟡 | 新規候補 | design_spec_v3 |
| P30 | プラン選択2ステップUI | 🟡 | 新規候補 | project_v6_4 |
| P31 | 週間レビュー自動表示（日曜夜） | 🟡 | 新規候補 | ux_redesign_v2 |
| P32 | ドラッグ→scheduling_preference学習 | 🟡 | 新規候補 | ux_redesign_v2 |
| P33 | 朝7時前起動EXPボーナス | 🟢 | 新規候補 | ux_redesign_v2 |
| P34 | レベルビジュアル進化（種→開花） | 🟡 | 新規候補 | ux_redesign_v2 |
| P35 | GPT電球SVGアイコン | 🟢 | 新規候補 | design_amendment_001 |
| P36 | Visionオートフロー | 🟢 | 新規候補 | design_spec_v3 |
| P37 | プラン比較表（折りたたみ） | 🟡 | 新規候補 | design_spec_v3。P30と関連 |
| P38 | 強み・弱みAI判定化（ハードコーディング廃止） | 🟡 | 新規候補 | ux_redesign_v2 §ME改善 |
| P39 | 年齢欄廃止（生年月日自動算出） | 🟢 | 新規候補 | ux_redesign_v2 §ME改善 |
| P40 | 家族/時間/条件チャット収集 | 🟡 | 新規候補 | ux_redesign_v2 §ME改善 |
| P41 | TALK AI理解度→ME導線 | 🟢 | 新規候補 | ux_redesign_v2 §ME改善 |
| P42 | 未完了タスク時間シフト | 🟡 | 新規候補 | ux_redesign_v2 §タイムライン |
| P43 | タスク詳細+AI相談画面 | 🟡 | 新規候補 | ux_redesign_v2 §タスク詳細 |
| P44 | 移動時間・乗換表示 | 🔴 | 新規候補 | ux_redesign_v2 §秘書機能 |
| P45 | タスク×天気連動 | 🟡 | 新規候補 | ux_redesign_v2 §秘書機能 |
| P46 | サイドバーフッター可視性テスト | 🟢 | ✅完了 | HOTFIX-02 |
| P47 | ストリーミング停止ボタン | 🟡 | 新規候補 | design_amendment_001 |
| P48 | テーマプレビューサムネイル | 🟢 | 新規候補 | project_v6_4 |
| P49 | タスク完了アニメーション（C案） | 🟢 | 新規候補 | design_spec_v3 |
| P50 | クイックゴール（長押し→即登録） | 🟡 | 新規候補 | reference_v2 |
| P51 | 達成レポート検出+紙吹雪 | 🟢 | 新規候補 | reference_v2 |
| P52 | PDF手動エクスポート | 🟡 | 新規候補 | reference_v2。会話・ゴール進捗のPDF出力 |
| P53 | 複数ゴール同時検出 | 🟡 | 新規候補 | reference_v2。1会話から複数ゴール候補を検出 |
| P54 | AI理解メモ5回ごと自動更新 | 🟢 | 新規候補 | reference_v2 §105 |
| P55 | 過去会話リスト重畳 | 🟢 | 新規候補 | reference_v2 §105 |
| P56 | プロフィール理解度スクロール自動閉じ | 🟢 | 新規候補 | reference_v2 §105 |
| P57 | 紹介者報酬自動処理 | 🟡 | 新規候補 | reference_v2 §105 |
| P58 | Free→nanoフォールバック | 🟢 | 新規候補 | reference_v2 §105 |
| P59 | トリセツPDF出力 | 🟡 | 新規候補 | reference_v2 §105 |
| P60 | ゴールアシスト完了→ホーム戻り | 🟢 | 新規候補 | reference_v2 §105 |
| P61 | 過去会話ゴール候補（E-10） | 🟡 | 新規候補 | reference_v2 §105 |
| P62 | 言語切替（English mode） | 🟡 | 新規候補 | design_spec_v3 G08C-03。現在stub toast |
| P63 | アカウント削除2段階確認 | 🟢 | 新規候補 | design_spec_v3 G08C-04 |
| P64 | システムテーマ追従トグル | 🟢 | 新規候補 | design_spec_v3 G08C-03 |
| P65 | Vision「5年後の理想の平日」 | 🟡 | 新規候補 | design_spec_v3 G06B |
| P66 | Vision「やりたくない生活」 | 🟡 | 新規候補 | design_spec_v3 G06B |
| P67 | Vision再分析6チップUI | 🟢 | 新規候補 | design_spec_v3 G06B-04 |
| P68 | SNS共有ボタン | 🟢 | 新規候補 | design_spec_v3 G06B-05 |
| P69 | ゴール適合度60%以下オレンジ | 🟢 | 新規候補 | design_spec_v3 G06C-01 |
| P70 | 「改善方法をAIに相談」ボタン | 🟢 | 新規候補 | design_spec_v3 G06C-02 |
| P71 | テーマチップlock状態CSS | 🟢 | 新規候補 | design_spec_v3 G06A |
| P72 | 自分を知るCRN-03統一入力欄 | 🟡 | 新規候補 | design_spec_v3 G06A-01 |

---

## 完了済み（詳細は instructions/results/session_history.md）

- V4 v4.0.0〜v4.0.10デプロイ済み
- TEST-FULL ✅ 438 PASS
- TEST-REFACTOR ✅ 439 PASS / 14 SKIP
- TEST-AC ✅ 480 PASS / 14 SKIP
- TEST-DESIGN ✅ 46 PASS（font-size FAIL延期）
- KV-OPT ✅ rate-limit/usage KV→Supabase移行
- DEV-02 ✅ フック6種+Playwright安定化
- G1-G6 ✅ UI改善+コスト削減バッチ
- UX-01 Phase A ✅ 全5ミッション
- UX-01 B1 ✅ ME構造化ヒアリング
- UX-01 B2 ✅ TODAY刷新
- UX-01 C ✅ QOL提案エンジン v4.0.11
- P26 ✅ 完了タスク自動ソート v4.0.12
- UX-01 B3 ✅ タスクメタデータ+3ステップ+推測禁止 v4.0.13
- UX-01 B4 ✅ ルーティン+scheduling_preference v4.0.14
- UX-01 B5 ✅ タイムライン+AIスケジューリング v4.0.15
- UX-01 B6 ✅ ゲーミフィケーション v4.0.16
- HOTFIX-01 ✅ バージョンタップ更新 v4.0.17
- HOTFIX-02 ✅ サイドバーフッター可視性修正
- TEST-E2E-v2 ✅ 120 PASS / 0 FAIL / 0 SKIP（KV plan修正+SKIP全解消）
- BUG-02 ✅ ゴール勝手紐付け修正（秘書メモ+タイムライン+リスト）
- UX-02 ✅ タスクインタラクション刷新（詳細カード+ドラッグ+振動+EXPポップアップ）
