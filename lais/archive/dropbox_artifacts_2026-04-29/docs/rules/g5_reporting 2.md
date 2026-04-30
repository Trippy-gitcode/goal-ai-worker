# G5: 完了報告フォーマット — 詳細ルール
> 索引: development_rules.md → G5
> 更新: 2026-04-07

## 報告フォーマット
```
XX PASS / YY FAIL / ZZ SKIP / 合計WW
```
- 「ALL PASS」「全件PASS」は分母なしでは禁止
- try/catchでタイムアウトを握りつぶした項目はSKIP扱い（PASSにしない）
- test.skip()を使用し、SKIP数も報告に含める

## G5-v4: テストコード品質チェック（canopy自動検出。デプロイ前ブロック）
- `expect(true)` = 禁止（FAIL）
- 空catchブロック多数 = 警告
- typeof-onlyアサーション = 警告

## G5-v5: 条件付きSKIP禁止（テストコード品質）
- `test.skip()`で「要素が見つからない」「データがない」を理由にスキップすることを禁止
- 要素が見つからない = テスト対象の機能が壊れている = **FAIL**であるべき
- データがない = 前のテストで作成されているはず = テストの依存関係が壊れている = **FAIL**
- SKIPが許容される唯一のケース: プラットフォーム非対応（iOS固有機能をAndroidでテスト等）
- 時刻依存テスト: テスト用に固定時刻を注入するか、時刻非依存のアサーションに書き直す
- `tests/e2e/helpers/test-guards.ts` の IGNORED_ERRORS への追加はClaude.ai承認必須
- canopyで件数上限15件をチェック。超過でデプロイブロック
- 許容してよいもの: ブラウザ内部エラー（favicon等）、localhost固有エラー（CORS等）のみ
- 許容してはいけないもの: `Failed to fetch`、`500`、`Auto-register`等の本番で起きるエラー
