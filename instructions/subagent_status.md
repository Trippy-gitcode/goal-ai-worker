# Subagent 状態（SSOT）

> 仕様根拠: `lais/verify/dev_system_v34_package.md` §2.25.16.5（SSOT 4 ファイル運用）+ §2.25.20（障害検出と暴走停止）
> 運用主体: ADV メインセッション（§2.25.16.3 例外、ADV 直接書込可）
> SSOT 4 ファイル運用（§2.25.16.5）の 1 つ、毎セッション必須 Read

---

## ステータス値

| 値 | 意味 |
|---|---|
| `running` | subagent 起動中 |
| `completed` | 正常完了（完了報告検証 PASS） |
| `failed_timeout` | タイムアウト（30 分超 / app_config.yaml 設定値） |
| `failed_error` | エラー応答（exit != 0 / "FAIL" / "ERROR"） |
| `failed_missing_output` | 出力欠落（完了報告ファイル不在 or 空） |
| `stopped` | ADV による強制停止（暴走検出） |

## 記録フォーマット

```markdown
## SUBAGENT-<ID>: <ミッション ID>
- **status**: running / completed / failed_* / stopped
- **mission**: <MISSION-ID>
- **started**: YYYY-MM-DD HH:MM
- **finished**: YYYY-MM-DD HH:MM（running 時は空）
- **note**: <完了報告サマリ / エラー詳細>
- **report_lines**: <行数、完了報告原文の参照用>
```

---

## SUBAGENT-G49-P0: MISSION-G49-PKG-FINAL-V2 Phase 0
- **status**: completed
- **mission**: MISSION-G49-PKG-FINAL-V2
- **started**: 2026-04-25 15:42
- **finished**: 2026-04-25 16:05
- **note**: §2.25.16〜.22 新設 + 8 ファイル新設 + hook 結線 + 実機テスト 4 件 PASS + 自律修正（octal バグ + path traversal + AND ロジック）+ PATCH-G49-P0 起票
- **report_lines**: 完了報告は ADV メインに直接返戻

---

<!-- 新規 subagent は上記末尾以下に追記。完了後 instructions/results/session_history.md にアーカイブ -->
