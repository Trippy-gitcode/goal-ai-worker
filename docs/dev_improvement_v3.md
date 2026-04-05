# 開発システム改善 v3 — 30問題＋30改善
> 策定: 2026-04-03 Claude.ai + ふとし
> 前版: docs/dev_improvement_v2.md（30問題。テスト体制の構築）
> 背景: TEST-FULLで実バグ3件発見（padding未適用、overlay未実装、z-index衝突）。テストで見つかるのではなく実装段階で未然防止する体制が必要
> 盛り込み先: development_rules.md / test_package_v1.md / mission_template_v2.md / bootstrap.md

---

## I. 実装段階での未然防止（10問題＋10改善）

### I-01: UIコンポーネントに閉じる手段が実装されない
**実例:** ハーフモーダル（task-add-sheet）にoverlayもEscapeハンドラもなかった
**改善:** UIコンポーネント追加ミッションの完了条件に「4操作チェック」を必須化
```bash
# 完了コマンド: 新規モーダル/シート/パネルには以下が全て存在すること
grep -c 'overlay.*onclick\|close.*function\|Escape\|keydown.*27' frontend/js/chat.js
# overlay要素、close関数、Escapeハンドラの存在確認
```
**盛り込み先:** mission_template_v2.md「UIコンポーネント追加時の必須項目」セクション

### I-02: padding/marginがwrapperにだけ適用され内側divに伝播しない
**実例:** .page{padding-bottom:56px}がpg-today-wrapにあるがpg-todayにない→コンテンツがボトムタブに隠れた
**改善:** CSS変更ミッションの完了条件に「対象セレクタの親子全階層でのbox-model確認」を追加
```bash
# 完了コマンド: ボトムタブ対応ページの内側divにpadding-bottomがあること
grep -c '#pg-today.*padding-bottom\|#pg-myself.*padding-bottom' frontend/style.css
```
**盛り込み先:** development_rules.md G2の補足ルール

### I-03: z-indexの設計が場当たり的で衝突する
**実例:** sidebar(1000) > overlay(999)でoverlayクリックがsidebarに遮られた
**改善:** z-indexマップをdocs/に作成し、新コンポーネント追加時に参照・更新を義務化
```
z-index階層:
  50: FAB
  100: ボトムタブ
  200: 入力ボックス(fixed)
  300: ハーフモーダル/シート
  400: (予約)
  900: トースト
  999: サイドバーoverlay
  1000: サイドバー本体
  1100: フルモーダル
  9999: 致命的エラーoverlay
```
**盛り込み先:** docs/z_index_map.md（新規）+ mission_template_v2.md

### I-04: DOM構造の前提が仕様書とコードで乖離する
**実例:** チェックリストが「旧DOM削除」前提だが実装は「リパーパス」。テスト15件FAIL
**改善:** UI変更ミッション完了時に「DOM ID一覧更新」を完了条件に追加
```bash
# 完了コマンド: 主要IDの存在/非存在を明示的に記録
grep -oP 'id="[^"]*-wrap"' frontend/index.html | sort > docs/dom_id_list.txt
```
**盛り込み先:** development_rules.md G2補足

### I-05: 新機能追加時にテスト仕様書が更新されない
**実例:** task-add-sheetを追加したがtest_package_v1.mdに閉じるテストがなかった
**改善:** UI機能追加ミッションの完了条件に「テスト仕様書への項目追加」を含める
```bash
# 完了コマンド: test_package_v1.mdの項目数が前回より増加
NEW=$(grep -c '^\- \[ \]' docs/test_package_v1.md)
[ "$NEW" -gt "$OLD" ] && echo "PASS" || echo "FAIL: テスト項目未追加"
```
**盛り込み先:** mission_template_v2.md

### I-06: CSS変更の影響範囲が見えない
**実例:** .page{padding-bottom:56px}追加が内側divに効かなかった
**改善:** CSS変更を含むミッションの完了条件にPlaywright viewportスクショ比較を必須化
```bash
# 全4タブのスクショを撮影し、ボトムの余白を目視確認
npx playwright test --grep "layout-snapshot" --project=mobile
```
**盛り込み先:** development_rules.md G2

### I-07: 画面間の状態遷移が未定義のままコーディングされる
**実例:** ハーフモーダル閉じた後にpg-todayがhiddenのまま。状態遷移マトリクスが存在しない
**改善:** 画面遷移を含むミッションに「状態遷移表」をインラインで記載
```
状態A → イベント → 状態B → 復帰条件
TODAY → +ボタン → モーダルopen → overlay tap/Escape → TODAY復帰
```
**盛り込み先:** mission_template_v2.md「画面遷移チェック」

### I-08: モバイルviewport固有のバグが開発中に見えない
**実例:** 375px幅でボトムタブとコンテンツの衝突。デスクトップ開発では見えない
**改善:** Playwright config.tsにSE(320px)/標準(375px)/Plus(414px)/iPad(768px)の4 viewportを定義。UI変更時は最低2 viewportでスクショ確認
**盛り込み先:** tests/e2e/playwright.config.ts + development_rules.md G2

### I-09: position:fixedとoverflowの相互作用が考慮されない
**実例:** BUG-01bで9回パッチ失敗。fixed要素＋overflow:hidden＋iOS Safariの組み合わせ
**改善:** position:fixedを使う要素を追加する場合、ミッション定義に「overflow親要素チェック」を含める
```bash
# fixed要素の親階層にoverflow:hiddenがないことを確認
grep -B5 'position.*fixed' frontend/style.css | grep 'overflow.*hidden'
# 期待: 0件（あればBUG-01bと同種の問題発生リスク）
```
**盛り込み先:** mission_template_v2.md

### I-10: エラーハンドリングが後付けで漏れる
**実例:** タスク追加シートの送信でAI API失敗時のUIフィードバックがない
**改善:** API呼び出しを含む新機能の完了条件に「エラー時UI」を必須化
```bash
# try/catch or .catch()が全API呼び出しに存在
grep -c 'catch\|\.catch' frontend/js/chat.js | awk '{if($1>=20) exit 0; else exit 1}'
```
**盛り込み先:** mission_template_v2.md

---

## II. テスト段階での検出精度向上（10問題＋10改善）

### II-01: try/catchでタイムアウトを握りつぶしてPASS扱い
**実例:** AI API呼び出しテストでtry/catchして`expect(true)`で通過
**改善:** test.skip()で明示的にSKIPにし、報告を「PASS/FAIL/SKIP」の3区分に変更
```bash
# SKIPカウントも報告に含める
grep -c 'test.skip' tests/e2e/specs/*.spec.ts
```
**盛り込み先:** test_package_v1.md 報告フォーマット + development_rules.md G5

### II-02: ビジュアルリグレッションテストがない
**実例:** padding変更でレイアウト崩れ→数値チェックでは検出不可。目視でのみ発見
**改善:** Playwrightの`toHaveScreenshot()`で主要5画面のベースラインスクショを保存。UI変更時に差分検出
```bash
# ベースラインスクショ存在チェック
ls tests/e2e/screenshots/baseline/*.png | wc -l  # 期待: 5以上
```
**盛り込み先:** test_package_v1.md TEST-08セクション追加

### II-03: テスト実行が一括で412件→ハング
**実例:** バックグラウンド実行＋sleep＋tailで1h20mスタック
**改善:** テスト実行戦略をミッション定義に明記。「フォアグラウンドのみ。スイートごとに分割。1スイート上限5分」
**盛り込み先:** test_package_v1.md 実行手順 + development_rules.md G4

### II-04: serial設定で1件FAIL→全停止
**実例:** test.describe.configure({ mode: 'serial' })で1件失敗→140件未実行
**改善:** テストファイルテンプレートのデフォルトをparallelに。serial必須のフロー（ログイン→操作→検証）のみ明示的にserialに設定
**盛り込み先:** test_package_v1.md テスト作成ルール

### II-05: セレクタ調査→修正ループが多すぎる
**実例:** 15件FAIL中12件がセレクタ不一致。DOM構造の理解が不正確
**改善:** テストspec作成前に「DOM構造スナップショット」を自動取得するステップ追加
```bash
# 各ページの主要コンテナIDとクラスを出力
node -e "const h=require('fs').readFileSync('frontend/index.html','utf8'); h.match(/id=\"[^\"]+\"/g).forEach(m=>console.log(m))"
```
**盛り込み先:** test_package_v1.md Phase 1前の必須ステップ

### II-06: テスト環境と本番環境の差異が未定義
**実例:** localhostからWorker APIへのCORS/auth挙動が本番と異なる
**改善:** テスト環境の前提条件を明文化。API依存テストは3カテゴリに分類:
  - A: フロントのみ（API不要）→ localhost完結
  - B: API必須 → wrangler dev（ローカルWorker）またはtest.skip()
  - C: 外部サービス依存（Stripe等）→ モック必須
**盛り込み先:** test_package_v1.md 冒頭「テスト環境定義」

### II-07: 時刻依存テストが実行タイミングで結果が変わる
**実例:** 挨拶テストがh<11とh<12で判定が異なりFAIL
**改善:** 時刻依存テストではpage.evaluate()でDate.now()をモック化
```javascript
await page.evaluate(() => { Date.now = () => new Date('2026-04-03T09:00:00').getTime(); });
```
**盛り込み先:** test_package_v1.md テスト作成ルール

### II-08: テスト仕様書が3ファイルに分散
**実例:** ux_user_test_v1.md, ux_checklist_v1.md, test_package_v1.mdの3箇所を管理
**改善:** 中期でtest_package_v1.mdに一本化。マスターテスト仕様書のSingle Source of Truth化。既存2ファイルはtest_package_v1.mdのセクション1, 2として統合
**盛り込み先:** test_package_v1.md（次回テスト仕様更新時に統合実行）

### II-09: FAIL修正時にテストを直すか実装を直すかの判断基準がない
**実例:** 15件FAIL→テスト修正12件、実装修正3件。毎回Codeが判断
**改善:** 判断基準を明文化しtest_package_v1.mdに記載:
  - 仕様書の記述 ≠ 実装 → **実装を修正**
  - 仕様書が古い（リパーパス等）→ **仕様書＋テスト修正**
  - テストのセレクタ誤り → **テストのみ修正**
  - 実装もテストも正しいがFAIL → **仕様の再検討をClaude.aiにエスカレーション**
**盛り込み先:** test_package_v1.md FAIL修正ルール

### II-10: 回帰テストが構造化されていない
**実例:** test03のFAIL修正でstyle.css/index.html/chat.jsを変更→test01の273 PASSが壊れていないか未確認
**改善:** FAIL修正後の再テストは必ず「修正対象スイート＋全スイート」の2段階実行
```bash
# Step 1: 修正対象スイートが0 failed
npx playwright test test03-layout.spec.ts --project=mobile
# Step 2: 全スイートの回帰確認
npx playwright test --project=mobile
```
**盛り込み先:** test_package_v1.md Phase 3ルール + development_rules.md G4

---

## III. 開発システムの最適化（10問題＋10改善）

### III-01: ミッション定義にUIコンポーネントの操作仕様が含まれない
**実例:** 「ハーフモーダルを追加」としか書かず、overlay/Escape/閉じるボタンが漏れた
**改善:** mission_template_v2.mdに「UIコンポーネントチェックリスト」を追加
```
新規UIコンポーネント（モーダル/シート/パネル/ドロワー）追加時の必須項目:
□ 開く操作（ボタン/FAB/スワイプ）
□ 閉じる操作（overlay tap + Escape + ×ボタン）
□ 閉じた後の画面復帰（前の状態に戻ること）
□ z-indexがdocs/z_index_map.mdと整合
□ アニメーション（open/close）
□ キーボード表示時のレイアウト
```
**盛り込み先:** mission_template_v2.md

### III-02: Claude.aiがテスト実行戦略を指定していない
**実例:** 412件一括バックグラウンド実行→1h20mハング
**改善:** テストミッション定義に実行戦略を明記
```
テスト実行ルール（ミッション定義にインライン）:
- フォアグラウンド実行のみ（バックグラウンド禁止）
- スイートごとに分割実行（一括実行禁止）
- 1スイートのタイムアウト上限: --timeout=30000
- workers=1（安定性優先。速度が必要なら2まで）
- sleep禁止。結果はコンソール直接読み取り
```
**盛り込み先:** mission_template_v2.md + test_package_v1.md

### III-03: テストで見つかったバグの再発防止メカニズムがない
**実例:** padding-bottom未適用バグ→修正したが、次の新画面追加で同じミスが再発する
**改善:** canopyに「ボトムタブ対応全ページのpadding-bottom存在チェック」を追加
```bash
# canopy追加: 全.page内コンテナにpadding-bottom
for id in pg-today pg-myself; do
  grep -q "$id.*padding-bottom" frontend/style.css || echo "FAIL: $id missing padding-bottom"
done
```
**盛り込み先:** development_rules.md G2補足 → canopy自動チェック化

### III-04: 仕様協議時にUI操作フローの抜け漏れが発生する
**実例:** 「ハーフモーダルでタスク追加」の仕様にclose手段が含まれていなかった
**改善:** Claude.ai（私）が仕様協議時に使うチェックリストを拡張
```
仕様協議時チェック（Claude.ai側）:
□ ユーザーが開始する操作は何か
□ ユーザーが中断/キャンセルする手段はあるか
□ 操作完了後に元の画面に戻るか
□ エラー時にユーザーに何を見せるか
□ 同じ操作を2回連続した場合の挙動
□ オフライン時の挙動
```
**盛り込み先:** bootstrap.md 鉄則10番を11項目に拡張

### III-05: Playwright環境が毎セッションで壊れる
**実例:** バージョン不一致（1.58.2 vs 1.59.1）、chromium不一致（1208 vs 1217）
**改善:** package.jsonにpostinstallスクリプト追加＋バージョンpin
```json
"postinstall": "npx playwright install chromium"
```
@playwright/testとplaywrightのバージョンを完全一致でpin
**盛り込み先:** package.json（DEV-02で実装）

### III-06: テスト結果の永続化・比較ができない
**実例:** コンソール出力のみ。前回結果との比較不可
**改善:** HTMLレポーターでファイル出力し、canopyで存在チェック
```bash
# canopy: テスト実行後にHTMLレポート存在
ls tests/e2e/report/index.html 2>/dev/null || echo "WARN: テストレポートなし"
```
**盛り込み先:** development_rules.md G4補足

### III-07: ミッションサイズが標準化されていない
**実例:** DEV-01がStep 1〜2.8の8ステップ。1セッションで完走しない
**改善:** ミッション定義時に「推定所要時間」を付記。1ミッション=30分以内を目安に分割
```
> 推定: 30分以内 / 1時間 / 2時間超（分割検討）
```
**盛り込み先:** mission_template_v2.md ヘッダー

### III-08: 完了報告のSKIP区分がない
**実例:** API依存テストをtry/catchで通過→PASSカウントに含まれるが実際は未検証
**改善:** 完了報告フォーマットを3区分に拡張
```
TEST-FULL: XX PASS / YY FAIL / ZZ SKIP / 合計WW
```
**盛り込み先:** development_rules.md G5 + test_package_v1.md

### III-09: マルチviewportテストがない
**実例:** 375×812のみ。SE(320px幅)やiPad(768px)でのレイアウト崩れ未検出
**改善:** playwright.config.tsに3 viewport追加。TEST-03は最低2 viewportで実行
```
projects: [
  { name: 'mobile', viewport: { width: 375, height: 812 } },
  { name: 'mobile-se', viewport: { width: 320, height: 568 } },
  { name: 'mobile-plus', viewport: { width: 414, height: 896 } },
  { name: 'tablet', viewport: { width: 768, height: 1024 } },
]
```
**盛り込み先:** tests/e2e/playwright.config.ts（DEV-02で実装）

### III-10: エッジケーステストが体系化されていない
**実例:** 空文字・超長文は入れたが、マルチバイト・改行100行・巨大クリップボード等が漏れ
**改善:** test_package_v1.mdにTEST-08（エッジケース専用）を追加
```
入力系テスト最低パターン:
- 空文字 / 1文字 / 上限値 / 上限+1
- 特殊文字（<script>, ', ", `, \n, \t）
- マルチバイト（日本語、絵文字、アラビア文字）
- 超長文（10,000文字）
- 連続操作（10連打）
```
**盛り込み先:** test_package_v1.md TEST-08セクション

---

## 盛り込み実行チェックリスト

| # | 対象ファイル | 変更内容 | 状態 |
|---|---|---|---|
| 1 | docs/dev_improvement_v3.md | 本ファイル（30問題+30改善の記録） | ✅ |
| 2 | development_rules.md | G2補足（CSS/z-index/DOM）、G4補足（分割実行/回帰）、G5（3区分報告） | ✅ |
| 3 | test_package_v1.md | TEST-08追加、テスト環境定義、FAIL修正ルール、テスト作成ルール、報告3区分 | ✅ |
| 4 | templates/mission_template_v2.md | UIコンポーネントチェック7項目、状態遷移表、実行戦略、推定時間、セルフチェック8項目 | ✅ |
| 5 | templates/bootstrap.md | 鉄則10番拡張＋鉄則11番（仕様協議チェック6項目）追加 | ✅ |
| 6 | docs/z_index_map.md | z-index階層マップ新規作成 | ✅ |
| 7 | instructions/session_progress.md | TEST-FULL定義更新（427項目、TEST-08追加、3区分報告） | ✅ |
