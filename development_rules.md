# GOAL AI — 開発ルール（v3: 索引+詳細分離）
> 索引ファイル。各ゲートの1行要約と参照先パス。
> 詳細はdocs/rules/配下。情報を一切省略せず、このファイルは120行以内を維持。
> canopyで自動検証されるゲートと絶対禁止事項のみ記載。
> 更新: 2026-04-07

---

## 品質ゲート（canopy必須チェック）

### G1: バージョン同期
APP_VERSIONが4箇所で一致すること。
```bash
V=$(grep 'APP_VERSION' wrangler.toml | head -1 | grep -oP '"\K[^"]+')
grep -r "APP_VERSION.*$V" frontend/index.html frontend/js/app.js package.json | wc -l
# 期待: 3
```

### G2: UI変更時のStage A
mockup vs 実装の比較画像生成。CSS/z-index/position/モバイル可視性チェック。
→ 詳細: `docs/rules/g2_ui_verification.md`

### G3: テスト項目数カウント
テストケース数 ≥ ソース仕様の項目数。
```bash
SPEC_COUNT=$(grep -c '^\- \[ \]' docs/TARGET_FILE.md)
TEST_COUNT=$(grep -c "test(" tests/e2e/specs/TARGET_SPEC.ts)
[ "$TEST_COUNT" -ge "$SPEC_COUNT" ] && echo "PASS" || echo "FAIL"
```

### G4: テスト全件PASS
failed=0が完了の前提条件。テスト影響連動(v5)+プラン別テスト(v6)+バッチ分割を含む。
→ 詳細: `docs/rules/g4_testing.md`

### G5: 完了報告フォーマット
分母付き3区分報告。アンチパターン自動検出。条件付きSKIP禁止（要素なし=FAIL）。テストガード管理。
→ 詳細: `docs/rules/g5_reporting.md`

### G6: デプロイ前パイプライン（1機能1デプロイ）
```bash
# 1. canopy（G1-G5）  2. テスト  3. Stage A（UI変更時）
# 4. git diff --stat  5. git tag vX.Y.Z  6. git push --tags  7. npm run deploy
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
同一バグへの修正試行は3回まで。3回失敗→自動HOLD→Claude.aiエスカレーション。

### ホットフィックスパス（🟢低リスク限定）
mockup変更なし+対象2ファイル以内+仕様変更なしの全条件→Code自律実行可。提案ログに記録。

### セッション開始プリフライト
`wc -l instructions/session_progress.md` → 300行超ならアーカイブ。`head -10`で5行サマリー確認。

### ミッションステータス管理（キュースキップ防止）
STATUS: QUEUED→IN_PROGRESS→DONE/BLOCKED。DONEは完了コマンド全PASS時のみ。
中間結果があってもDONEでなければ続行必須。
→ 詳細: `docs/rules/mission_status.md`

### 新ルール追加の原則禁止
問題→完了コマンド追加 or canopyチェック追加で対処。行動規範ルールは追加しない。
詳細ルールはdocs/rules/に分離。このファイルは120行以内維持。
