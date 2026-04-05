# GOAL AI — 開発ルール（v2: 機械的ゲートのみ）
> 640行→80行に圧縮。心構え系ルールは全て削除。
> 行動の制約はミッション定義にインラインで書く。
> このファイルにはcanopyで自動検証されるゲートと絶対禁止事項のみ残す。
> 更新: 2026-04-03

---

## 品質ゲート（canopy必須チェック）

### G1: バージョン同期
APP_VERSIONが4箇所で一致すること。
```bash
V=$(grep 'APP_VERSION' wrangler.toml | head -1 | grep -oP '"\K[^"]+')
grep -r "APP_VERSION.*$V" frontend/index.html frontend/js/app.js package.json | wc -l
# 期待: 3（wrangler.toml以外の3箇所が一致）
```

### G2: UI変更時のStage A
UI変更を含むミッションでは、デプロイ前にmockup vs 実装の比較画像を生成。
```bash
node scripts/c16_stage_a.js  # 比較画像をdocs/mockups/screenshots/に出力
ls docs/mockups/screenshots/*/impl_compare/*.png | wc -l  # 期待: 1以上
```
**G2補足（v3追加）:**
- CSS変更時: 対象セレクタの親子全階層でpadding/margin/overflowを確認
- 新UIコンポーネント追加時: z-indexがdocs/z_index_map.mdと整合していること
- position:fixed追加時: 親階層にoverflow:hiddenがないこと確認
- DOM ID変更時: docs/dom_id_list.txtを更新

### G3: テスト項目数カウント
テストミッションでは、テストケース数 ≥ ソース仕様の項目数。
```bash
SPEC_COUNT=$(grep -c '^\- \[ \]' docs/TARGET_FILE.md)
TEST_COUNT=$(grep -c "test(" tests/e2e/specs/TARGET_SPEC.ts)
[ "$TEST_COUNT" -ge "$SPEC_COUNT" ] && echo "PASS" || echo "FAIL: $TEST_COUNT < $SPEC_COUNT"
```

### G4: テスト全件PASS
テストを含むミッションでは、failed=0が完了の前提条件。
```bash
npx playwright test --project=mobile 2>&1 | tail -1 | grep "0 failed"
```
**G4補足（v4更新）:**
- テスト実行はフォアグラウンドのみ（バックグラウンド＋sleep禁止）
- 回帰テスト・最終確認は一括実行: `npx playwright test --project=mobile`（fullyParallel+workers:4で並列）
- globalTimeout 5分。5分以内に終わらない場合はスイートを2分割して実行
- FAIL調査時のみスイート単体実行で原因特定: `npx playwright test TARGET.spec.ts --project=mobile`
- FAIL修正後は「修正対象スイート→全スイート一括」の2段階で回帰確認
- HTMLレポート出力: `--reporter=html --output=tests/e2e/report/`

### G5: 完了報告フォーマット
session_progress.mdへの完了報告は必ず分母付き・3区分。
```
XX PASS / YY FAIL / ZZ SKIP / 合計WW
```
- 「ALL PASS」「全件PASS」は分母なしでは禁止
- try/catchでタイムアウトを握りつぶした項目はSKIP扱い（PASSにしない）
- test.skip()を使用し、SKIP数も報告に含める
- **canopy G5-v4:** テストコード内のアンチパターン自動検出（デプロイ前ブロック）
  - `expect(true)` = 禁止（FAIL）
  - 空catchブロック多数 = 警告
  - typeof-onlyアサーション = 警告
- **G5-v4a: テストガード許容リスト変更禁止**
  - `tests/e2e/helpers/test-guards.ts` の IGNORED_ERRORS への追加はClaude.ai承認必須
  - canopyで件数上限15件をチェック。超過でデプロイブロック
  - 許容してよいもの: ブラウザ内部エラー（favicon等）、localhost固有エラー（CORS等）のみ
  - 許容してはいけないもの: `Failed to fetch`、`500`、`Auto-register`等の本番で起きるエラー

### G6: デプロイ前パイプライン（1機能1デプロイ）
```bash
# 1. canopy（このファイルのG1-G5）
# 2. テスト実行（該当する場合）
# 3. Stage A（UI変更の場合）
# 4. git diff --stat（変更内容の記録）
# 5. git tag vX.Y.Z
# 6. git push --tags
# 7. npm run deploy
```
G1-G5のいずれかがFAILならgit tag禁止。

---

## 絶対禁止

1. canopy項目の削除（追加は可、削除はふとし承認必須）
2. 契約セクション（CLAUDE.md）の無断変更
3. UI変更をgrepだけで「完了」にすること
4. ログ確認前の投機的修正（推測で直さない。ログを読んでから修正）
5. 分母なしの「ALL PASS」「全件PASS」「完了」報告

---

## 構造的制約

### 修正試行3回制限
同一バグ/ミッションへの修正試行は3回まで。3回失敗で自動HOLD。
session_progress.mdに「HOLD: 根本原因未特定。Claude.aiエスカレーション必須」を記録。

### ホットフィックスパス（🟢低リスク限定）
以下3条件を**全て**満たす場合、Codeはキュー外で自律実行可。
1. mockup変更なし
2. 対象ファイル2個以内
3. 仕様変更なし（CSS調整、typo修正、デッドコード削除等）
実行後はsession_progress.mdの提案ログに記録。

### セッション開始プリフライト
`wc -l instructions/session_progress.md` → 300行超ならアーカイブ。`head -10` で5行サマリー確認。

### テスト分割実行（G4補足: コンテキスト保護）
条件: test_count > 20 && per_test_timeout > 30s → バッチ実行:
1. --grepで15件以下のバッチに分割（例: --grep "E2E-01|E2E-02|E2E-03"）
2. 各バッチ完了後、session_progress.mdに中間結果書き込み: `BATCH N/M: X PASS / Y FAIL / Z SKIP [FAILテストID]`
3. 全バッチ完了後に合算して完了報告。バックグラウンド実行（&）禁止

### 新ルール追加の原則禁止
問題発生時は「ミッション定義の完了コマンド追加」or「canopyチェック追加」で対処。
行動規範としてのルール追加はしない。このファイルは120行以内を維持。
