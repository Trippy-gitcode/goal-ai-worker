# G4: テスト全件PASS — 詳細ルール
> 索引: development_rules.md → G4
> 更新: 2026-04-07

## 基本コマンド
```bash
npx playwright test --project=mobile 2>&1 | tail -1 | grep "0 failed"
```

## 実行ルール（v4）
- フォアグラウンド実行のみ（バックグラウンド＋sleep禁止）
- 回帰テスト・最終確認は一括実行: `npx playwright test --project=mobile`（fullyParallel+workers:4で並列）
- globalTimeout 5分。5分以内に終わらない場合はスイートを2分割して実行
- FAIL調査時のみスイート単体実行で原因特定
- FAIL修正後は「修正対象スイート→全スイート一括」の2段階で回帰確認
- HTMLレポート出力: `--reporter=html --output=tests/e2e/report/`

## G4-v5: テスト影響連動ゲート（UI変更時必須）
- ミッション定義に「テスト影響: E2E-XX」がある場合、完了前に該当E2EをPASSさせること
- テスト仕様（e2e_fullflow_test.md）がUI変更を反映していない場合、テストコードも更新してからPASSさせる
- テスト影響「なし」のミッションではこのゲートはスキップ

## G4-v6: プラン別挙動テスト（課金プランがある場合必須）
- プランによって呼ばれるAIモデル・機能制限・UI表示が変わる場合、各プランでの挙動テストを含めること
- デフォルトテストユーザー = Max（レート制限なし・全モデル最上位で基本フロー検証）
- プラン別テスト: Free/Pro/Maxそれぞれで正しいモデルが使われているか、制限が正しく適用されるか検証
- テストコードのbeforeAllでSupabase直接更新によりプラン切替
- **重要: planのSource of TruthはTOKEN_KV（not Supabase DB）。** テストユーザーのプラン変更は`wrangler kv:key put`でKVを直接更新すること。DB更新だけでは反映されない

## テスト分割実行（コンテキスト保護）
条件: test_count > 20 && per_test_timeout > 30s → バッチ実行:
1. --grepで15件以下のバッチに分割（例: --grep "E2E-01|E2E-02|E2E-03"）
2. 各バッチ完了後、session_progress.mdに中間結果書き込み
3. 全バッチ完了後に合算して完了報告。バックグラウンド実行（&）禁止
