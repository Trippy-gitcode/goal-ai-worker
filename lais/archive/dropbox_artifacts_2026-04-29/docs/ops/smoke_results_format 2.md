# logs/smoke_results.log フォーマット定義

> 親: `lais/verify/dev_system_v34_package.md` §2.25.21.4
> 関連: `docs/plans/sub_testing.md §9` / `docs/plans/sub_review_flow.md §10`
> 起点: 違反 #14（静的レビューのみで Phase 完了報告 → 実機未検証バグの納品）構造解消
> SSoT: 本ファイル

---

## 1. 目的

`logs/smoke_results.log` は Phase 完了判定に必須となる実機 smoke の結果記録。`scripts/adv_response_gate.sh` が直近 5 行を検証し、Phase 完了宣言時に PASS 行不在なら BLOCK する。

## 2. 配置と所有権

- パス: `<REPO_ROOT>/logs/smoke_results.log`
- 書込者: smoke 実行スクリプト（subagent / Playwright runner / GitHub Actions / 暫定的に手動）
- 読取者: `scripts/adv_response_gate.sh`（直近 5 行 grep）/ ADV メイン（PO 報告時に参照）

## 3. フォーマット

TAB 区切り 4 列、追記専用、ローテーション禁止（過去エビデンス保全）。

```
<timestamp>\t<phase>\t<target>\t<result>
```

| 列 | 型 | 説明 | 例 |
|---|---|---|---|
| 1 | ISO8601 UTC | timestamp（`date -u +%Y-%m-%dT%H:%M:%SZ`）| `2026-04-26T17:00:00Z` |
| 2 | string | Phase 識別子（`A` / `B` / `C` / ...）| `A` |
| 3 | string | 対象画面 / spec | `S-00` / `auth.smoke` |
| 4 | enum | `PASS` / `FAIL` のみ | `PASS` |

## 4. 雛形（最初の 5 行）

```
2026-04-26T17:00:00Z	A	S-00	PASS
2026-04-26T17:00:30Z	A	S-01	PASS
2026-04-26T17:01:00Z	A	AuthCallback	PASS
2026-04-26T17:01:30Z	A	S-10	PASS
2026-04-26T17:02:00Z	A	S-30	PASS
```

実機 smoke が稼働していない期間は空ファイルでよい。`adv_response_gate.sh` は **不在 / 空ファイル / 直近 5 行に PASS 不在** をすべて「smoke 検証 NG」と判定し、Phase 完了宣言時に BLOCK する。

## 5. ヘッダコメント許容

ファイル先頭に `#` 始まりのコメント行は許容（`tail -5` で末尾検証のため、ヘッダは判定に影響しない）。

```
# logs/smoke_results.log
# format: <timestamp(ISO8601 UTC)>\t<phase>\t<target>\t<result(PASS|FAIL)>
# 親: §2.25.21.4 / sub_testing.md §9 / sub_review_flow.md §10
2026-04-26T17:00:00Z	A	S-00	PASS
```

## 6. FAIL 記録の扱い

- `FAIL` 行も追記（隠蔽禁止、§2.25.5 違反自己申告義務に準拠）
- `adv_response_gate.sh` は直近 5 行に **PASS が 1 件以上** あれば通過させる（FAIL 混在許容、ただし Phase 完遂宣言の正当性は ADV / subagent 責務）
- 連続 3 FAIL 検出時は ADV メインが PO 報告 + LAIS-PHASE4-TEST-SETUP 起動

## 7. ローテーション / アーカイブ

- 自動ローテーション禁止（過去 Phase の PASS 記録を Phase 完遂エビデンスとして保全）
- 容量肥大時は手動で `logs/smoke_results.archive_<YYYY-MM>.log` に分割移動 + 直近月のみ `smoke_results.log` に残す

## 8. 機械強制（adv_response_gate.sh 連携）

擬似コード:

```sh
# §2.25.21.4: Phase 完了宣言時の smoke ログ検証
if grep -qE "(Phase X completed|Phase X 完遂|全完走|全 N 画面 completed)" "$TMP_RESP"; then
  if ! tail -5 "${REPO_ROOT}/logs/smoke_results.log" | grep -qE "PASS"; then
    VIOLATIONS+="§2.25.21.4 Phase 完了宣言 + smoke PASS 欠落; "
  fi
fi
```

実装は `scripts/adv_response_gate.sh` の `PHASE_COMPLETE_HIT` ブロック参照。

## 9. 暫定運用（Phase B 期間中）

`lais/tests/smoke/` 整備完了までの暫定運用:

- 手動で curl + Playwright headless 起動 → ログイン UI 描画確認 → ダッシュボード遷移確認
- 結果を本ログに `<ts>\tA\tmanual-deploy-check\tPASS` 等で追記
- LAIS-PHASE4-TEST-SETUP 完了時に Playwright spec 化を必須

## 10. 関連

- `lais/verify/dev_system_v34_package.md` §2.25.21.4
- `docs/plans/sub_testing.md §9`
- `docs/plans/sub_review_flow.md §10`
- `scripts/adv_response_gate.sh` `PHASE_COMPLETE_HIT` ブロック
- `lais/verify/adv_violation_log.md` 違反 #14
- `docs/decision_log.md` PD-VIOLATION-14
- `docs/po-decisions.md` PD-116
- `lais/verify/dev_system_v34_patches.md` PATCH-VIO14-FIX

---

## 改訂履歴

- 2026-04-26 v1.0 初版（PATCH-VIO14-FIX、違反 #14 構造解消）
