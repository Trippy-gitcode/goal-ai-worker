# logs/realmachine_smoke_results.log フォーマット定義（5+ 列）

> 親: `lais/verify/dev_system_v34_package.md` §2.25.21.4 / §2.25.21.7
> 関連: `docs/ops/smoke_results_format.md`（mock smoke、4 列）/ `docs/ops/po_completion_template.md`
> 起点: PATCH-LOGIN-TEST-STRUCTURAL-FIX（mock/実機 smoke 区別）+ PATCH-TODAY-FALSE-REPORTS-IMPROVEMENT（5+ 列移行、2026-04-26）
> SSoT: 本ファイル

---

## 1. 目的

`logs/realmachine_smoke_results.log` は **実機 smoke**（本番 Supabase + 実 CF Pages URL でテストアカウント作成 → signin → ダッシュボード遷移 → cleanup までの実 E2E）の結果記録。`scripts/adv_response_gate.sh` が直近 5 行を検証し、Phase 完了宣言時に `signin_success=true && dashboard_reached=true && result=PASS` 行不在なら BLOCK する。

mock smoke ログ `lais/logs/smoke_results.log`（4 列、TAB 区切り）とは **責務が異なる別ファイル**。

## 2. 配置と所有権

- パス: `<REPO_ROOT>/logs/realmachine_smoke_results.log`
- 書込者: 実機 smoke 実行スクリプト（`scripts/realmachine_signin_test.sh` / Playwright realmachine spec / GitHub Actions）
- 読取者: `scripts/adv_response_gate.sh`（直近 5 行 grep）/ ADV メイン（PO 報告時に参照、§2.25.21.6）

## 3. フォーマット（5 列以上、追記専用、ローテーション禁止）

TAB 区切り、最低 5 列、必須フィールドは順序 5 列まで固定、6 列目以降は拡張フィールドとして許容。

### 3.1 必須 5 列（順序固定）

| 列 | 型 | 説明 | 例 |
|---|---|---|---|
| 1 | ISO8601 UTC | timestamp（`date -u +%Y-%m-%dT%H:%M:%SZ`）| `2026-04-26T17:00:00Z` |
| 2 | string | phase / patch ID（`A` / `B` / `BUG-RT-XXX` / `PATCH-XXX`）| `A` / `BUG-RT-LOGIN-REDIRECT-FIX` |
| 3 | string | target spec / test 名 | `realmachine-signin` / `signin-grow-redirect` |
| 4 | flag KV | `signin_success=true|false` | `signin_success=true` |
| 5 | flag KV | `dashboard_reached=true|false` | `dashboard_reached=true` |

### 3.2 拡張フィールド（6 列目以降、KV 形式、任意順序）

- `result=PASS|FAIL`（**必須、PASS 判定の最終キー**）
- `signed_in_splash_redirect=true|false`（S00Splash 戻り問題回避確認）
- `console_errors=N`（ブラウザ console.error 件数）
- `network_failed=N`（ネットワーク失敗件数）
- `hash_fragment_seen=true|false`（PKCE flowType / email confirm 関連）
- `session_stored=true|false`（localStorage / cookie 確認）
- `duplicate_prevented=true|false`（TALK 重複送信防止）
- `ai_response_unique=true|false`（実 AI 応答 vs 固定文字列）
- `tz_jst=true|false`（タイムゾーン JST 確認）
- `cleanup=ok|fail`（テストアカウント削除確認）

### 3.3 PASS 判定条件

`scripts/adv_response_gate.sh` 直近 5 行検証:

```sh
tail -5 logs/realmachine_smoke_results.log | \
  grep -E "signin_success=true" | \
  grep -E "dashboard_reached=true" | \
  grep -qE "result=PASS"
```

- 上記 3 条件全成立で「実機 smoke PASS」とみなす
- 直近 5 行に該当行不在 → Phase 完了宣言 BLOCK

## 4. 雛形（5+ 列）

```
2026-04-26T09:31:04Z	A	realmachine-signin	signin_success=true	dashboard_reached=true	result=PASS
2026-04-26T14:28:40Z	BUG-RT-LOGIN-REDIRECT-FIX	signin-grow-redirect	signin_success=true	dashboard_reached=true	signed_in_splash_redirect=true	console_errors=0	network_failed=0	result=PASS
2026-04-26T15:03:44Z	BUG-RT-TALK-CRITICAL-3-FIX	s20-talk-critical-3	duplicate_prevented=true	ai_response_unique=true	tz_jst=true	signin_success=true	dashboard_reached=true	result=PASS
```

## 5. ログローテーション設計（PATCH-TODAY-FALSE-REPORTS-IMPROVEMENT、2026-04-26）

### 5.1 旧フォーマット保持（互換性）

過去の 4 列フォーマット（`<ts>\t<phase>\t<target>\t<result>`）は **そのまま保持**。`tail -5` で末尾検証する `adv_response_gate.sh` は新規 5+ 列のみ照合するため、過去エビデンス削除不要。

### 5.2 新規記録は 5+ 列必須

新規追記時は 5+ 列フォーマット使用必須。4 列形式での新規追記は仕様違反として `scripts/realmachine_signin_test.sh` 側で reject（書込前 awk -F'\t' 'NF<5' チェック）。

### 5.3 サイズ管理

- 上限: なし（追記専用、過去エビデンス保全）
- 圧縮: 月次 `gzip` (オプション、`logs/realmachine_smoke_results.log.YYYY-MM.gz`、§2.25.16.3 例外で ADV メイン直接書込可)
- アーカイブ後の運用: 直近 1 月分のみ `realmachine_smoke_results.log` として保持、月初に `mv` + `gzip`

## 6. 検証コマンド

```sh
# 列数チェック
awk -F'\t' '{if (NF<5) print "INVALID NF=" NF ":" $0}' logs/realmachine_smoke_results.log

# 直近 5 行 PASS 判定
tail -5 logs/realmachine_smoke_results.log | \
  grep -E "signin_success=true" | grep -E "dashboard_reached=true" | grep -qE "result=PASS" && \
  echo "PASS" || echo "FAIL"

# Phase A 完了照合
phase=A
tail -50 logs/realmachine_smoke_results.log | grep "$(printf '\t')${phase}$(printf '\t')" | tail -5
```

## 7. 関連

- `lais/verify/dev_system_v34_package.md` §2.25.21.4 / §2.25.21.7（仕様 SSoT）
- `docs/ops/smoke_results_format.md`（mock smoke 4 列、互換比較）
- `scripts/adv_response_gate.sh` PHASE_COMPLETE_HIT ブロック内 REAL_SMOKE_LOG 検証
- `lais/verify/dev_system_v34_patches.md` PATCH-LOGIN-TEST-STRUCTURAL-FIX / PATCH-TODAY-FALSE-REPORTS-IMPROVEMENT
- `docs/decision_log.md` PD-LOGIN-TEST-STRUCTURAL-FIX / PD-TODAY-FALSE-REPORTS-IMPROVEMENT
