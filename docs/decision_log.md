# 意思決定履歴 — Decision Log（SSOT）

> 仕様根拠: `lais/verify/dev_system_v34_package.md` §2.25.17（意思決定の記録と参照）
> 運用主体: ADV メインセッション（§2.25.16.3 例外、ADV 直接書込可）
> 重複検出: 新規論点着手前に `grep -n "<keyword>" docs/decision_log.md` で過去議論を検索
> SSOT 4 ファイル運用（§2.25.16.5）の 1 つ、毎セッション必須 Read

---

## 記録フォーマット

```markdown
## YYYY-MM-DD HH:MM <ID>: <短いタイトル>
- **判断者**: PO / ADV
- **論点**: ...
- **結論**: ...
- **根拠**: ...
- **影響範囲**: ...
```

---

## 2026-04-25 16:00 PD-G49-P0: MISSION-G49-PKG-FINAL-V2 Phase 0 PO 補佐再構成（承認）
- **判断者**: PO（指示書 MISSION-G49-PKG-FINAL-V2 で PO 承認済）
- **論点**: メインセッション（ADV）を PO 補佐（テクニカル PM）として再構成。書込禁止 + subagent 経由実行 + コンテキスト管理 + 夜間自動着手の一体化
- **結論**: 採用、Phase 0 着手承認。§2.25.16〜.22 7 節新設 + 8 ファイル新設 + hook 結線
- **根拠**: 指示書 §2.25.3 該当（新プロセス: メイン役割変更 / 夜間自動 / git commit 自律）すべて PO 承認済
- **影響範囲**: メインセッション運用全体、書込禁止対象 8 種ファイル、夜間モード起動条件

---

## 2026-04-27 PD-SPEC-ARCHIVE-COMPRESS-EXECUTE-V1: β 軸抜本改革 (仕様書アーカイブ実行) 完了
- **判断者**: PO（2026-04-27 承認「β 軸 (仕様書 80% 削除) OK。ただしアーカイブしてね」）
- **論点**: v3.4 系仕様書 (約 23,800 行想定) を `lais/archive/spec_v34_pre_reform/` 配下に履歴保持型 git mv で移動し、コア 500 行と分離
- **結論**: 採用、4 バッチコミット (88955fd / f0c30fe / 5457833 / 2138dba) で実 git mv 完了。実態として archive 13 ファイル (docs/plans 6 + instructions 5 + verify/README 1 + package_full snapshot 1)、計画書想定 350+ は repo state 上不在のため実態反映で reduce、対象外 (lais/verify/dev_system_v34_package.md / patches.md) は保持
- **根拠**: 計画書 `/tmp/spec_archive_compress_plan_v1.md` §4.3 (4 バッチ手順) + PO 承認「アーカイブで履歴保持」
- **影響範囲**: docs/plans/ (6 ファイル archive で空化)、instructions/ (5 ファイル archive、SSoT 4 ファイル + README + results/ は保持)、lais/verify/ (2 ファイル保持、別フェーズで原本 archive 移動予定)、安全ブランチ `backup/pre-archive-20260427` 作成済 (rollback 用)
- **次フェーズ**: コア 500 行 (`lais/core_spec_v4.md`) 新設 + scripts × §2.25 path 連動修正 + dev-system-adv/skills 参照置換

---

<!-- 以降、新規エントリは上に追記する形で記録 -->
