# 進行中論点・タスク（SSOT）

> 仕様根拠: `lais/verify/dev_system_v34_package.md` §2.25.19（優先順位・依存関係管理）
> 運用主体: ADV メインセッション（§2.25.16.3 例外、ADV 直接書込可）
> SSOT 4 ファイル運用（§2.25.16.5）の 1 つ、毎セッション必須 Read

---

## ステータス値（§2.25.19.1）

| ステータス | 意味 |
|---|---|
| `pending` | 未着手、依存なし or 全依存解消済 |
| `in_progress` | 着手中（subagent 起動中含む） |
| `blocked` | 依存タスク完了待ち or PO 判断待ち |
| `completed` | 完了 |

## 記録フォーマット（§2.25.19.4）

```markdown
## TASK-<ID>: <タイトル>
- **status**: pending / in_progress / blocked / completed
- **owner**: ADV / subagent-N / PO
- **depends_on**: [TASK-X, TASK-Y]
- **created**: YYYY-MM-DD
- **updated**: YYYY-MM-DD
- **auto_eligible**: true / false（夜間モード対象、§2.25.22.2）
- **note**: ...
```

`auto_eligible` は §2.25.3 PO 判断必須事項に該当しない自律可タスクのみ `true`。

---

## TASK-G49-P0: MISSION-G49-PKG-FINAL-V2 Phase 0 PO 補佐再構成
- **status**: completed
- **owner**: subagent
- **depends_on**: []
- **created**: 2026-04-25
- **updated**: 2026-04-25
- **auto_eligible**: false（PO 直接承認案件、夜間モード対象外）
- **note**: §2.25.16〜.22 新設 + 8 ファイル新設 + hook 結線 + 実機テスト 4 件 PASS + 外部レビュー指摘の自律修正 + PATCH-G49-P0 起票

## TASK-G49-PA: MISSION-G49-PKG-FINAL-V2 Phase A（並行進行）
- **status**: pending
- **owner**: ADV
- **depends_on**: [TASK-G49-P0]
- **created**: 2026-04-25
- **updated**: 2026-04-25
- **auto_eligible**: false
- **note**: Phase 0 完了後に状態確認、ADV 起動

## TASK-G49-PD: MISSION-G49-PKG-FINAL-V2 Phase D（並行進行）
- **status**: pending
- **owner**: ADV
- **depends_on**: [TASK-G49-P0]
- **created**: 2026-04-25
- **updated**: 2026-04-25
- **auto_eligible**: false
- **note**: Phase 0 完了後に状態確認、ADV 起動

## TASK-G49-PC: MISSION-G49-PKG-FINAL-V2 Phase C 追加分
- **status**: pending
- **owner**: ADV
- **depends_on**: [TASK-G49-PA, TASK-G49-PD]
- **created**: 2026-04-25
- **updated**: 2026-04-25
- **auto_eligible**: false
- **note**: Phase A/D 状態確認後に着手

---
