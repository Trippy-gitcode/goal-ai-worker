# GOAL AI — プロジェクトダッシュボード
> セッション引き継ぎの唯一の情報源。300行以内を維持。
> 仕様参照: docs/ux_redesign_v2.md（UX刷新仕様855行。実装28で大幅追記済み）
> ミッション定義: templates/mission_template_v2.md準拠（v4: テスト影響連動ゲート+STATUS管理）
> ルール: development_rules.md（索引76行）+ docs/rules/（詳細4ファイル）
> 完了済み詳細: instructions/results/session_history.md
> **LOCK制御:** `## LOCK` セクションが存在する場合、Codeはキュー実行を停止してふとしに報告すること

---

## 5行サマリー
- **Version:** v4.0.24（デプロイ済み 2026-04-08）
- **Next:** TEST-AUDIT（780項目テスト検証+バグ全修正）→ DESIGN-01 Phase C → DEV-03
- **Last done:** DESIGN-01 Phase B ✅ Vertical Journal timeline + Open Air cards v4.0.24
- **Open issues:** DESIGN-01 Phase C残件（20画面チェック+JS内ハードコード色66件CSS変数化）
- **方針:** テスト配布より「自分が毎日使いたいツール」を優先。コンセプト「君の人生をより素敵に」

## 現在地
- **バージョン:** v4.0.22
- **チェーン:** UX-02b完了
- **次のミッション:** TEST-AUDIT → DESIGN-01 B/C → DEV-03

---

## ミッションキュー（上から順に実行）

### BUG-03: ✅ 完了（2026-04-08）
> STATUS: DONE

**根本原因:** saveProfile()がUIのみ更新でサーバー/localStorage保存なし + CORS PUT未許可 + loadIdentityが初期化時未実行
**修正:** localStorage二重保存 + CORS PUT追加 + 初期化時restoreProfileFromLocalStorage + identityマージ
**E2E-11: 12/12 PASS**

---

### DESIGN-01: Night Sky Journal デザイン全面適用 — Phase A完了
> リスク: 🔴高（UI全面変更）
> STATUS: IN_PROGRESS（Phase A完了。Phase B/Cは次回）
> 参照: docs/design_system.md（テーマ4種+NGリスト+チェックリスト）, CLAUDE.md Design Context
> 対象ファイル: frontend/style.css, frontend/index.html, frontend/js/（UI描画関連全般）
> テスト影響: TEST-E2E-v2全セクション + TEST-DESIGN

**目的:** docs/design_system.mdのNight Sky Journalデザインを既存UIの全画面・全コンポーネントに適用する

**対象画面（全件。漏れなく更新すること）:**
| # | 画面ID | 名前 | 更新確認 |
|---|--------|------|----------|
| 1 | pg-today | TODAY（タイムライン） | □ |
| 2 | pg-home | TALK（チャット） | □ |
| 3 | pg-goals | GOALS一覧 | □ |
| 4 | pg-goal-hub | ゴール詳細ハブ | □ |
| 5 | pg-myself | ME（プロフィール） | □ |
| 6 | pg-calendar | カレンダー | □ |
| 7 | pg-analytics | アナリティクス | □ |
| 8 | pg-settings | 設定 | □ |
| 9 | pg-tasks | タスク一覧 | □ |
| 10 | sidebar | サイドバー | □ |
| 11 | bottom-tab-bar | ボトムタブ | □ |
| 12 | home-task-panel | タスク詳細パネル | □ |
| 13 | task-add-modal | タスク追加モーダル | □ |
| 14 | goal-create-flow | ゴール作成フロー | □ |
| 15 | home-input-area | チャット入力エリア | □ |
| 16 | secretary-memo | 秘書メモ | □ |
| 17 | qol-suggestions | QOL提案 | □ |
| 18 | login/onboarding | ログイン/初回フロー | □ |
| 19 | plan-selection | プラン選択画面 | □ |
| 20 | toast/snackbar | トースト通知 | □ |

**完了条件: 上記20項目すべてに□→✅を付けること。1つでも□が残っていたら未完了。**

**Phase A: CSSトークン基盤（テーマ切替の土台）**
1. CSS custom propertiesでテーマ4種（Night Sky / Dawn / Harajuku Light / Harajuku Dark）を定義
2. 既存のハードコードされた色値をすべてCSS変数に置換
3. テーマ切替関数（設定画面から切替可能）
4. body data-theme属性でテーマ適用

**Phase B: レイアウト更新（Vertical Journal + Open Air）**
1. TODAY画面をVertical journal構造に変更（縦ライン+ドット進行、NOW詳細/NEXT控えめ）
2. 余白リズムをdesign_system.mdのspacingトークンに統一（セクション間40px、タスク間20px+）
3. カード囲みを除去（余白+0.5px borderで区切る）
4. タイポグラフィ階層（weight 200/400/500、letter-spacing差）

**Phase C: コンポーネント更新**
1. ボトムタブをPill active方式に変更（Active=pill+icon+label、非Active=icon only）
2. 完了⭕️をdesign_system.md仕様に（サイズ、EXP表示、springアニメーション）
3. ease-in-outをすべてspring-based cubic-bezierに置換
4. NGリスト違反を全除去（ゴールド色、グラデーション文字、equal spacing等）

**仕様↔検証マッピング（G7準拠）:**
  Phase A-1 テーマ4種CSS → cmd1(grep 4テーマ定義)
  Phase A-2 ハードコード色除去 → cmd2(grep ハードコード色=0)
  Phase B-1 Vertical journal → cmd3(grep timeline dot構造)
  Phase B-2 余白リズム → cmd4(E2E: spacing検証)
  Phase C-1 Pill tab → cmd5(grep pill-tab)
  Phase C-3 ease-in-out除去 → cmd6(grep ease-in-out=0)
  Phase C-4 NGリスト違反除去 → cmd7(NGリスト全項目grep=0)

**プリフライト:**
  wc -l docs/design_system.md                    # デザイン仕様の存在確認
  grep -c "ease-in-out" frontend/style.css       # 現在のease-in-out使用数
  grep -c "gold\|#FFD700\|#DAA520" frontend/     # 現在のゴールド色使用数

**完了コマンド:**
  cmd1: grep -c "night-sky\|dawn\|harajuku-light\|harajuku-dark" frontend/style.css | awk '{if($1>=4) exit 0; else exit 1}'
  cmd2: grep -c "#FFD700\|#DAA520\|gold" frontend/style.css | awk '{if($1==0) exit 0; else exit 1}'
  cmd3: grep -c "timeline-dot\|dot-active\|dot-inactive" frontend/style.css | awk '{if($1>=2) exit 0; else exit 1}'
  cmd4: grep -c "ease-in-out" frontend/style.css | awk '{if($1==0) exit 0; else exit 1}'
  cmd5: grep -c "pill.*tab\|tab.*pill\|pill-active" frontend/ -r | awk -F: '{s+=$2}END{if(s>=1) exit 0; else exit 1}'
  cmd6: npx playwright test --project=mobile --timeout=90000 2>&1 | grep "0 failed"
  cmd7: grep -c "Inter\|Roboto\|Arial" frontend/style.css | awk '{if($1==0) exit 0; else exit 1}'  # NGフォント除去
  cmd8: 対象画面20項目のスクリーンショット各1枚（計20枚）をtests/e2e/screenshots/DESIGN-01/に保存
  cmd9: grep -c "□" instructions/session_progress.md | awk '{if($1==0) exit 0; else exit 1}'  # 全画面チェック完了

**FAIL条件:** cmd1-7のいずれかFAIL / cmd8でスクリーンショット20枚未満 / cmd9で未チェック画面あり
**完了報告:** DESIGN-01: 20/20画面更新 + cmd1-cmd9 各PASS/FAIL + スクリーンショット20枚

---

### UX-02b: タスクUI残件（所要時間伸縮+ダイヤル+集中力AI化）
> リスク: 🟡中
> 参照: docs/ux_redesign_v2.md, docs/design_spec_v3.md
> 対象ファイル: frontend/index.html, frontend/js/（TODAY関連モジュール）, src/worker/prompts/（スケジューリング関連）
> テスト影響: TEST-E2E-v2のTODAYセクション

**目的:** UX-02で未実装の項目＋タスクタップ編集を完了する

**仕様:**
1. **タスクタップ→編集可能な詳細カード:** タップで詳細カードを開き、タスク名・時間・メモを直接編集して保存できる（UX-02で「実装済み」報告だが実際は未動作。修正必須）
2. **所要時間伸縮:** タイムライン上のタスクブロック上下端をドラッグして所要時間を変更（Googleカレンダー式）。15分スナップ。変更をDB永続化
3. **ダイヤルピッカー:** タスク作成・編集時の所要時間入力をOption選択からドラムロール式ピッカーに変更（5分刻み、5分〜4時間）
4. **集中力の質問削除:** 3ステップタスク作成から「集中力は？」（軽い/普通/集中必要）の質問UIを削除
5. **集中度AI自動判定:** AIスケジューリング時にタスク名+MEコンテキスト（職業・スキル・過去パターン）から集中度を自動判定。ユーザーには聞かない
6. **scheduling_preference学習:** ドラッグ移動の傾向（朝型/夜型、集中タスクの配置パターン等）をAIが学習してスケジューリングに反映

**仕様↔検証マッピング（G7準拠: 全仕様に対応cmd必須）:**
  仕様1 タスクタップ→編集保存 → cmd5(E2E: タップ→名前変更→保存→表示確認)
  仕様2 所要時間伸縮 → cmd3(grep resizeHandle) + cmd6(E2E: リサイズ→時間変更確認)
  仕様3 ダイヤルピッカー → cmd2(grep drum-picker) + cmd5(E2E: ピッカー操作確認)
  仕様4 集中力質問削除 → cmd1(grep 集中力=0)
  仕様5 集中度AI判定 → cmd7(AIスケジューリングログで集中度判定結果を確認)
  仕様6 scheduling学習 → cmd8(ドラッグ後にpreference保存を確認)

**プリフライト:**
  grep -c "集中力\|軽い.*普通.*集中" frontend/index.html   # 現在の集中力UI特定
  grep -c "energy_level\|concentration" frontend/js/*.js   # 関連JS特定
  grep -c "task-detail-edit\|editTask" frontend/js/*.js     # 現在のタスク編集実装状態

**完了コマンド:**
  cmd1: grep -c "集中力" frontend/index.html | awk '{if($1==0) exit 0; else exit 1}'
  cmd2: grep -c "drum-picker\|wheel-picker\|dial" frontend/js/*.js | awk -F: '{s+=$2}END{if(s>=1) exit 0; else exit 1}'
  cmd3: grep -c "resize.*task\|resizeHandle\|resize-handle" frontend/js/*.js | awk -F: '{s+=$2}END{if(s>=2) exit 0; else exit 1}'
  cmd4: npx playwright test --grep "TODAY" 2>&1 | grep "0 failed"
  cmd5: npx playwright test --grep "タスク編集\|task edit" 2>&1 | grep "0 failed"  # タップ→編集→保存のE2E

**FAIL条件:** cmd1で集中力UIが残存 / cmd2-3で実装不在 / cmd4-5でテストFAIL
**完了報告:** UX-02b: cmd1-cmd5 各PASS/FAIL + スクリーンショット5枚（タップ→編集カード/名前変更後/ダイヤルピッカー/リサイズ中/リサイズ後）

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
**各操作でスクリーンショット撮影→壊れている箇所を全件記録**

**Phase 1: 全バグ修正**
Phase 0で発見した全バグを修正。1件修正するたびにE2Eで回帰確認。

**Phase 2: 780項目タグ付け+テスト化**
1. docs/potential_bugs_300.mdの780項目にタグ+優先度+カバレッジ付与
2. 🔴致命的+🟡重要のNOT_COVEREDを全件テスト化
3. テスト実行→全PASS確認→FAIL項目はバグとして修正

**Phase 3: フルテスト+パフォーマンス計測**
1. 全テスト一括実行
2. LCP/CLS/TTI計測（パフォーマンスが悪いとの報告あり）
3. レスポンシブテスト（320/375/414px）

**プリフライト:**
  wc -l docs/potential_bugs_300.md
  curl -s https://goal-ai-frontend.pages.dev/ | head -5  # 本番アクセス確認

**完了コマンド:**
  cmd1: Phase 0のスクリーンショット20枚以上がtests/e2e/screenshots/TEST-AUDIT/に存在
  cmd2: Phase 0で発見したバグの全件修正確認（バグリストの全項目に✅）
  cmd3: grep -c "NOT_COVERED.*🔴" dev-system/tests/test_library.md | awk '{if($1==0) exit 0; else exit 1}'
  cmd4: grep -c "NOT_COVERED.*🟡" dev-system/tests/test_library.md | awk '{if($1==0) exit 0; else exit 1}'
  cmd5: npx playwright test --project=mobile --timeout=90000 2>&1 | grep "0 failed"

**FAIL条件:** cmd1-5のいずれかFAIL
**完了報告:** TEST-AUDIT: Phase0発見バグ数/修正数 + 780項目カバレッジ内訳 + テスト総数 + 全PASS確認 + パフォーマンス計測結果

**FAIL条件:** cmd1-4のいずれかFAIL
**完了報告:** TEST-AUDIT: 780項目中 COVERED/PARTIAL/NOT_COVERED の内訳 + テスト総数 + 全PASS確認

---

### DEV-03: dev-playbook.md作成（暗黙知のリポジトリ集約）
> リスク: 🟢低
> 参照: bootstrap.md（プロジェクトナレッジ）, CLAUDE.md, development_rules.md, docs/rules/
> 対象ファイル: docs/dev-playbook.md（新規作成）

**目的:** Claude.aiのメモリにしか存在しない開発体制・フロー・実戦知見をリポジトリに集約し、プロジェクト移管・新規立ち上げ時の情報漏れを防ぐ

**含める内容:**
1. 鉄則ルール全文（v3: ①〜⑫）
2. 開発フローv2 + v4-v5追記（テスト影響連動ゲート、仕様↔検証マッピング）
3. 実戦知見（planのSoT=TOKEN_KV、Code完了報告の検証義務、デバイス依存バグ対処等）
4. ふとしのコミュニケーションスタイル（短く直接的、コードは読まない、承認のみ）
5. 将来TODO優先順位リスト
6. ロードマップ方針（GOAL AI→別アプリ→開発オーケストレーター。LIFE AI=GOAL AIの進化形）
7. 3層間フロー図（ステートマシン形式: 仕様協議→ミッション定義→Code実行→報告→検証→デプロイ）
8. 判断基準の構造化（仕様判断要否/コスト影響の分岐条件をif-then形式で明文化）

**プリフライト:**
  ls docs/dev-playbook.md 2>&1   # 既存ファイルなし確認

**完了コマンド:**
  cmd1: wc -l docs/dev-playbook.md | awk '{if($1>=100) exit 0; else exit 1}'  # 100行以上
  cmd2: grep -c "鉄則\|ルール" docs/dev-playbook.md | awk '{if($1>=5) exit 0; else exit 1}'  # 鉄則セクション存在
  cmd3: grep -c "ステートマシン\|フロー図\|状態遷移" docs/dev-playbook.md | awk '{if($1>=1) exit 0; else exit 1}'  # フロー図存在
  cmd4: grep -c "判断基準\|if.*then\|分岐" docs/dev-playbook.md | awk '{if($1>=3) exit 0; else exit 1}'  # 判断基準構造化

**仕様↔検証マッピング（G7準拠）:**
  含める内容1-2 鉄則+フロー → cmd2(grep鉄則)
  含める内容3-5 知見+TODO → cmd1(100行以上で網羅性担保)
  含める内容7 フロー図 → cmd3(ステートマシン)
  含める内容8 判断基準 → cmd4(分岐条件)

**FAIL条件:** cmd1-4のいずれかFAIL
**完了報告:** DEV-03: cmd1-cmd4 各PASS/FAIL + docs/dev-playbook.md行数

---

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
**未実装（次回）:** 所要時間伸縮（Googleカレンダー式リサイズ）/ ダイヤルピッカー / scheduling_preference学習 / 集中力質問削除→AI自動判定

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
- BUG-03 ✅ プロフィール永続化修正 v4.0.20
- DEV-04 ✅ design_system.md作成（Night Sky Journal。QnA9問+4000件調査。テーマ4種。CLAUDE.md Design Context追記）
- UX-02b ✅ タスクUI残件（ダイヤルピッカー/リサイズ/集中力AI化/scheduling学習）v4.0.22
