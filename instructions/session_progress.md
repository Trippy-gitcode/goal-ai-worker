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
- **Next:** ARCH-00(Preact技術検証) → ARCH-01〜10(段階的アーキ移行) → TEST-AUDIT残件 → DESIGN-01 B/C → DEV-05(dev-system逆流) → DEV-06(ボイラープレート)
- **Last done:** 開発フロー大改訂: G8テストファースト/G9セルフテスト/AT6項目テンプレ/Preactアーキ移行決定。TEST-AUDIT 27件修正。BUG-04完了。DEV-03完了
- **Open issues:** 年齢欄P39未修正
- **方針:** ユーザーがバグを見つける前に修正されていること。テスト配布より「自分が毎日使いたいツール」を優先

## 現在地
- **バージョン:** v4.0.22
- **チェーン:** UX-02b完了
- **次のミッション:** ARCH-00 → ARCH-01〜10 → TEST-AUDIT → DESIGN-01 B/C → DEV-05 → DEV-06

---

## ミッションキュー（上から順に実行）

### ARCH-00: 技術検証（Preact 1画面で検証→採否判定）
> リスク: 🔴高（アーキテクチャ判断）
> STATUS: QUEUED
> 参照: docs/claude_ai_protocol.md §11, development_rules.md G8/G9

**目的:** Preactで1画面（TODAY）をコンポーネント化し、既存画面と共存できるか検証。結果でPreact採用 or Vanilla+PageControllerにフォールバック

**背景（WHY）:**
画面状態管理がグローバル変数+DOM直接操作（show/hide）に依存。unmountがないため状態が漏れ、同じバグが何度も再発（BUG-05 タスク詳細→TALK漏れ/BUG-06 編集未動作/BUG-02再発 ゴール推測紐付け）。テストで守るのは対症療法。構造を直す。

**仕様:**
1. Preact + Vite導入（既存index.htmlと共存するハイブリッド構成）
2. TODAY画面をPreactコンポーネントに移行（state/mount/unmountがフレームワーク管理）
3. 既存のshowPage()からPreactコンポーネントのrender/unmountを呼び出すブリッジ
4. 他の画面は既存Vanilla JSのまま動作

**AT（Claude.ai記述。Codeはspec.tsにコード化）:**

AT-1: TODAY画面表示
  操作: ボトムタブのTODAYをtap
  期待: タイムラインが表示される
  検証: タスクが1件以上表示。時間表示あり
  否定検証: TALK画面のチャット入力欄が見えない
  データ検証: N/A
  スクショ: TODAY画面全体

AT-2: TODAY→TALK→TODAY往復
  操作: TODAY→TALKタブtap→TODAYタブtap を3回繰り返す
  期待: 毎回正しい画面が表示される
  検証: 3回目のTODAYでタスクが表示されている
  否定検証: 3回目のTODAYにチャット入力欄/チャットメッセージが見えない
  データ検証: N/A
  スクショ: 3回目のTODAY画面

AT-3: タスクタップ→詳細→閉じる→TALK
  操作: タスクをtap→詳細画面表示→閉じる→TALKタブtap
  期待: TALK画面にチャット入力欄が表示される
  検証: チャット入力欄が見える。送信ボタンが見える
  否定検証: タスク詳細の「編集」「削除」ボタンが見えない
  データ検証: N/A
  スクショ: TALK画面

ストレスパス: AT-3の操作を3回連続で実行し、最後も正常

**完了コマンド:**
  cmd1: npx playwright test tests/e2e/specs/arch-00.spec.ts --project=mobile 2>&1 | grep "0 failed"
  cmd2: Preactコンポーネントのファイルが存在: ls frontend/components/Today.jsx
  cmd3: 既存画面（TALK/GOALS/ME/設定）が全て正常動作: npx playwright test --grep "TALK|GOALS|ME|設定" 2>&1 | grep "0 failed"

**FAIL条件:** cmd1-3のいずれかFAIL
**判定:** PASS→Preact採用（ARCH-01以降続行）/ FAIL→Vanilla+PageControllerに切替（ARCH-01の仕様を差替え）
**完了報告:** ARCH-00: cmd1-3 PASS/FAIL + 採用判定 + スクショ5枚

---

### ARCH-01: 基盤構築（ルーター+画面コントローラー）
> リスク: 🔴高
> STATUS: QUEUED（ARCH-00の判定後に仕様確定）

**目的:** ARCH-00の結果に基づき、全画面移行の基盤を構築

**仕様（Preact採用の場合）:**
1. Preactルーター導入（preact-router or 自作軽量ルーター）
2. showPage()をPreactルーター経由に変更
3. 未移行画面は互換ラッパー（Vanilla DOM をPreactでマウント/アンマウント）で動作維持
4. 画面遷移時にunmountが自動で走ることを検証

**AT:** ARCH-00確定後にClaude.aiが記述

---

### ARCH-02: TODAY画面移行 + AT
> STATUS: QUEUED
**目的:** TODAY画面を完全にPreactコンポーネント化。BUG-05（詳細→TALK漏れ）をアーキレベルで解消
**AT:** Claude.aiが記述（BUG-05のATを含む）

### ARCH-03: TALK画面移行 + AT
> STATUS: QUEUED
**目的:** TALK画面を完全にPreactコンポーネント化。BUG-06（編集未動作）・BUG-02再発（推測紐付け）をアーキレベルで解消
**AT:** Claude.aiが記述（BUG-06/BUG-02再発のATを含む）

### ARCH-04: GOALS画面移行 + AT
> STATUS: QUEUED

### ARCH-05: ME画面移行 + AT
> STATUS: QUEUED

### ARCH-06: 設定画面移行 + AT
> STATUS: QUEUED

### ARCH-07: カレンダー画面移行 + AT
> STATUS: QUEUED

### ARCH-08: アナリティクス画面移行 + AT
> STATUS: QUEUED

### ARCH-09: モーダル/パネル類移行 + AT
> STATUS: QUEUED

### ARCH-10: 旧コード削除 + フルテスト
> STATUS: QUEUED
**目的:** 全画面移行完了後にグローバル状態変数・旧showPage()・旧イベントリスナーを削除。L3フルテスト実行

---

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

### DEV-05: dev-systemテンプレート逆流（GOAL AIノウハウ→テンプレート反映）
> リスク: 🟢低
> STATUS: QUEUED
> 参照: dev-system/templates/, docs/claude_ai_protocol.md, development_rules.md
> 対象ファイル: dev-system/templates/（全テンプレート）, dev-system/docs/（新規）

**目的:** GOAL AI開発で確立した全ノウハウをdev-systemテンプレートに反映し、次のアプリ開発で同じ失敗を繰り返さない

**仕様:**
1. mission_template.md に6項目ATテンプレ標準装備
2. development_rules_template.md にG8/G9標準装備（各ルールにWHY付き）
3. claude_ai_protocol_template.md 新規作成（アプリ共通行動ルール）
4. dev-system/docs/anti_patterns.md 新規作成（症状→根本原因→対策→検出方法）
5. dev-system/docs/architecture_decisions.md テンプレート新規作成（問題→選択肢→判断→根拠）
6. 棚卸しチェックリストに「テンプレ逆流確認」追加
7. init_app.sh 更新（新ファイル群をコピー対象に追加）

**完了コマンド:**
  cmd1: grep -c "AT-N" dev-system/templates/mission_template*.md | awk -F: '{if($2>=1) exit 0; else exit 1}'
  cmd2: grep -c "G8\|G9" dev-system/templates/development_rules_template.md | awk '{if($1>=2) exit 0; else exit 1}'
  cmd3: wc -l dev-system/templates/claude_ai_protocol_template.md | awk '{if($1>=50) exit 0; else exit 1}'
  cmd4: wc -l dev-system/docs/anti_patterns.md | awk '{if($1>=30) exit 0; else exit 1}'
  cmd5: wc -l dev-system/docs/architecture_decisions.md | awk '{if($1>=20) exit 0; else exit 1}'

**FAIL条件:** cmd1-5のいずれかFAIL

---

### DEV-06: フロントエンドボイラープレート作成（ARCH完了後）
> リスク: 🟢低
> STATUS: QUEUED（ARCH-10完了後）
> 対象ファイル: dev-system/templates/frontend/

**目的:** ARCH-00〜10で確立したPreact構成をdev-systemのボイラープレートとして抽出

**仕様:**
1. Preact + Vite + ルーター + テストヘルパーの雛形
2. mount/unmount/stateのサンプルコンポーネント
3. init_app.sh --frontend=preact オプション追加

**完了コマンド:**
  cmd1: ls dev-system/templates/frontend/package.json && echo "PASS"
  cmd2: grep -c "preact" dev-system/templates/frontend/package.json | awk '{if($1>=1) exit 0; else exit 1}'
  cmd3: grep -c "frontend.*preact\|--frontend" dev-system/init_app.sh | awk '{if($1>=1) exit 0; else exit 1}'

**FAIL条件:** cmd1-3のいずれかFAIL

---

## 保留事項

### BUG-05/06/02再発: アーキ移行で解消予定
- BUG-05: タスクタップ→詳細が別画面に漏れる → ARCH-02で解消
- BUG-06: 編集がタイトルしか動かない → ARCH-02で解消
- BUG-02再発: ゴール推測紐付け → ARCH-03で解消
- 個別修正不要。アーキ移行のATに含める

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
