# GOAL AI — プロジェクトダッシュボード
> セッション引き継ぎの唯一の情報源。300行以内を維持。
> 仕様参照: docs/ux_redesign_v2.md（UX刷新仕様855行。実装28で大幅追記済み）
> ミッション定義: templates/mission_template_v2.md準拠（v4: テスト影響連動ゲート+STATUS管理）
> ルール: development_rules.md（索引76行）+ docs/rules/（詳細4ファイル）
> 完了済み詳細: instructions/results/session_history.md
> **LOCK制御:** `## LOCK` セクションが存在する場合、Codeはキュー実行を停止してふとしに報告すること

---

## 5行サマリー
- **Version:** v4.0.29（デプロイ済み 2026-04-09）
- **Next:** session_progressアーカイブ(300行化) → TEST-AUDIT残件(780項目テスト化) → BUG-04(テストガード4xx) → DESIGN-01 B/C → DEV-03(仕様書整理+ID付番+重複解消)
- **Last done:** TEST-AUDIT バグ修正バッチ3完了。v4.0.25→v4.0.29で計27件修正
- **Open issues:** 年齢欄P39未修正
- **方針:** ユーザーがバグを見つける前に修正されていること。テスト配布より「自分が毎日使いたいツール」を優先

## 現在地
- **バージョン:** v4.0.22
- **チェーン:** UX-02b完了
- **次のミッション:** session_progressアーカイブ → TEST-AUDIT → BUG-04 → DESIGN-01 B/C → DEV-03

---

## ミッションキュー（上から順に実行）

### BUG-03 ✅ | DESIGN-01 Phase A/B ✅ | UX-02 ✅ | UX-02b ✅
> 詳細: instructions/results/session_history.md（実装29セクション）

---

### TEST-AUDIT: 全機能検証+バグ全修正+テストライブラリ化
> リスク: 🔴高（アプリ品質の根幹）
> STATUS: IN_PROGRESS（Phase 0完了+Phase 1修正中）

**Phase 0結果（2026-04-09）:**
- 23枚スクリーンショット撮影済み（tests/e2e/screenshots/TEST-AUDIT/）
- バグ11件検出: 🔴2件 / 🟡6件 / 🟢2件 / ✅修正済み4件(B1,B4,B5,B8)
- Phase 0テスト: 19/20 PASS（プラン選択=テストアプローチ修正済み）
> 参照: docs/potential_bugs_300.md（780項目）, dev-system/tests/test_library.md（構造テンプレ）
> 対象ファイル: frontend/, src/, tests/e2e/specs/, dev-system/tests/test_library.md
> テスト影響: 全セクション

**目的:** 全機能を実際に操作して壊れているものを全部見つけて直す。テストで再発を防止する。ふとしに渡す前にCodeが品質を担保する仕組みを確立する

**最重要原則: テストを書く前にアプリを触る。アプリを触って壊れているものを直す。直したらテストで固める。**

**Phase 0: 全機能手動検証（最優先）**
全画面・全操作を実際にPlaywrightで操作し、スクリーンショットを撮影して壊れている箇所を全件リストアップする:
1. TODAY: タスク表示→タップ→編集→保存→リロード→残存確認
2. TODAY: タスク追加→3ステップ完了→タイムライン反映確認
3. TODAY: タスクドラッグ移動→時間変更→永続化確認
4. TODAY: タスク完了→EXP加算→アニメーション確認
5. TALK: メッセージ送信→AI応答受信→スクロール追従
6. TALK: 画像添付→送信→エラーなし確認
7. TALK: 長文入力→送信→表示確認
8. GOALS: ゴール一覧表示→ゴール作成→完了→一覧反映
9. GOALS: ゴール詳細→AI相談→応答確認
10. ME: プロフィール入力→保存→リロード→残存確認
10b. ME: 年齢欄が存在していたら即修正（P39: 生年月日に変更→年齢は自動算出。提案ログ既出・未実施）
11. ME: AI理解メモ表示→スクロール
12. 設定: テーマ切替→全画面に適用確認
13. 設定: プラン表示→正確性確認
14. カレンダー: 月表示→日付タップ→タスク表示
15. アナリティクス: データ表示→グラフ表示
16. サイドバー: 開閉→各リンク遷移→閉じる
17. ボトムタブ: 全4タブ切替→高速連打耐性
18. タスクパネル: 全タブからのアクセス確認
19. ログイン: ログイン→ログアウト→再ログイン→データ復帰
20. 入力: 日本語IME→変換確定→送信が誤発動しない
21. iOS Safari: モーダル表示→背景スクロール防止確認（overscroll-behavior:none実機検証）
**各操作でスクリーンショット撮影→壊れている箇所を全件記録**

**Phase 1: 全バグ修正**
Phase 0で発見した全バグを修正。1件修正するたびにE2Eで回帰確認。

**Phase 2: デザインテスト実行（初回実施）**
1. NGリストgrepチェック全件実行:
   - grep "#FFD700\|#DAA520\|gold" frontend/style.css → 0件確認
   - grep "ease-in-out" frontend/style.css → 0件確認
   - grep "Inter\|Roboto\|Arial" frontend/style.css → 0件確認
   - grep "linear-gradient" frontend/style.css → Harajuku以外0件確認
2. QnAチェックリスト9項目のE2E実行:
   - Q2: Vertical journal構造存在確認
   - Q6: Pill active tab動作確認
   - Q7: タスク間余白20px以上（getComputedStyle）
   - Q8: 背景色#0D1117〜#161B22確認
   - Q9: 4テーマ切替→全画面表示→スクリーンショット
3. 既存test-design.spec.ts（タップターゲット/フォントサイズ/コントラスト）実行
4. FAIL項目はバグとして修正

**Phase 3: 780項目タグ付け+テスト化**
1. docs/potential_bugs_300.mdの780項目にタグ+優先度+カバレッジ付与
2. 🔴致命的+🟡重要のNOT_COVEREDを全件テスト化
3. テスト実行→全PASS確認→FAIL項目はバグとして修正

**Phase 4: フルテスト+パフォーマンス計測**
1. 全テスト一括実行（既存+Phase2+Phase3の新規全て）
2. LCP/CLS/TTI計測（パフォーマンスが悪いとの報告あり）
3. レスポンシブテスト（320/375/414px）

**プリフライト:**
  wc -l docs/potential_bugs_300.md
  curl -s https://goal-ai-frontend.pages.dev/ | head -5
  # 前提条件: 全APIクレジットが十分であること（Anthropic/OpenAI/Google）
  # クレジット不足のままテスト実行すると、実装不備と区別できないFAILが発生する
  # ふとしがダッシュボードで残高確認→不足なら補充してからTEST-AUDIT開始

**完了コマンド:**
  cmd1: Phase 0のスクリーンショット20枚以上がtests/e2e/screenshots/TEST-AUDIT/に存在
  cmd2: Phase 0で発見したバグの全件修正確認（バグリストの全項目に✅）
  cmd3: grep -c "#FFD700\|#DAA520\|gold\|ease-in-out\|Inter\|Roboto\|Arial" frontend/style.css | awk '{if($1==0) exit 0; else exit 1}'  # NGリスト違反ゼロ
  cmd4: npx playwright test tests/e2e/specs/test-design.spec.ts --project=mobile 2>&1 | grep "0 failed"  # デザインテスト全PASS
  cmd5: grep -c "NOT_COVERED.*🔴" dev-system/tests/test_library.md | awk '{if($1==0) exit 0; else exit 1}'
  cmd6: grep -c "NOT_COVERED.*🟡" dev-system/tests/test_library.md | awk '{if($1==0) exit 0; else exit 1}'
  cmd7: npx playwright test --project=mobile --timeout=90000 2>&1 | grep "0 failed"  # 全テストPASS

**FAIL条件:** cmd1-5のいずれかFAIL
**完了報告:** TEST-AUDIT: Phase0発見バグ数/修正数 + 780項目カバレッジ内訳 + テスト総数 + 全PASS確認 + パフォーマンス計測結果

**FAIL条件:** cmd1-4のいずれかFAIL
**完了報告:** TEST-AUDIT: 780項目中 COVERED/PARTIAL/NOT_COVERED の内訳 + テスト総数 + 全PASS確認

---

### BUG-04: テストガード4xx誤検出修正
> リスク: 🟢低
> 参照: tests/e2e/helpers/
> 対象ファイル: tests/e2e/helpers/（テストガード関連）

**STATUS: DONE（2026-04-09）**
テストガードに外部APIクレジット系フィルタ追加。cmd1 PASS(6件)。

---

### DEV-03: ✅ 完了（2026-04-09）
> STATUS: DONE
docs/dev-playbook.md 228行作成。cmd1-4全PASS。
鉄則12項目+C2フロー+実戦知見+ステートマシン+判断基準if-then。
仕様書ID付番+重複解消は次回実施（§9 TODO）。

---

### BUG-02 ✅ | UX-02 ✅
> 詳細: instructions/results/session_history.md

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

- v4.0.0〜v4.0.17: V4基盤+UX-01全Phase+テスト基盤+HOTFIX×2
- v4.0.18: BUG-02(ゴール紐付け)+UX-02(タスクインタラクション)+TEST-E2E-v2(120PASS)
- v4.0.20: BUG-03(プロフィール永続化)+CORS PUT+identity merge
- v4.0.22: UX-02b(ダイヤルピッカー/リサイズ/集中力AI/scheduling学習)
- v4.0.23-24: DESIGN-01 Phase A/B(Night Sky 4テーマ+Vertical Journal+ハードコード色除去)
- v4.0.25-29: TEST-AUDIT(Phase0スクショ23枚+バグ27件修正+セキュリティ修正)
- DEV-04: design_system.md作成
