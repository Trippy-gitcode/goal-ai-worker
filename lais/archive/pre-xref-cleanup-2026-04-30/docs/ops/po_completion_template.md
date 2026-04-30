# PO 向け完了報告テンプレ（SSoT）

> 親: `core_spec.md` §7 完了条件マトリクス (legacy v34 spec §2.25.21.7, archived 2026-04-30)
> 関連: §2.25.21.2（PO 向け 5 行サマリー）/ §2.25.21.4（実機 smoke 必須）/ §2.25.21.5（PO 報告前 5 自問）/ §2.25.21.6（subagent 報告転記時の実態裏付け検証）
> 起点: 2026-04-26 9 件連続虚偽報告（`lais/verify/today_false_reports_review_2026-04-26.md`）構造解消
> SSoT: 本ファイル

---

## 1. 目的

ADV メインが PO ふとしに完了報告を出す際、**主観的な「全 PASS」「完走」「動作確認済」の単独使用を禁止し、機械検証可能な数値フィールドの併記を必須化** する。`scripts/adv_response_gate.sh` Stop hook（§2.25.21.7 マーカー）が本テンプレ準拠を grep で検証する。

## 2. 必須テンプレ（3 行最小、5 行推奨）

```
[完了報告 - <ミッション ID>]
1. やったこと: <1 行、暗号略称除去、PO 平易語彙>
2. 結果: 動作テスト N 件 PASS=N/失敗=N / mock=N / real=N / unknown_residual=N / 実態率 N%
3. 次: <1 行、次アクション>
```

## 3. 必須数値フィールド（5 種、最低 2 種共起必須）

| フィールド | 形式 | 意味 | grep パターン |
|---|---|---|---|
| `mock=N` | 整数 | mock テスト / 静的レビュー件数（実機未検証）| `mock=[0-9]+` |
| `real=N` | 整数 | 実機 smoke テスト件数（`logs/realmachine_smoke_results.log` の PASS 行紐付け）| `real=[0-9]+` |
| `unknown_residual=N` | 整数 | 既知未検証残（subagent 報告転記時、実機検証できなかった項目）| `unknown_residual=[0-9]+` |
| `実態率 N%` | 整数 % | `real / (mock + real) × 100`、50% 未満なら警告 | `実態率[[:space:]]*[0-9]+%` |
| `PASS=N`（既存）| 整数 | テスト結果（既存 §2.25.21.6 と互換）| `PASS=[0-9]+` |

代替表記（§2.25.21.7 受入）:
- `mock 件数 N` / `実機件数 N` / `既知未検証 N`

## 4. 禁止語彙（単独使用禁止）

以下のキーワードは **必須数値フィールド 2 種以上の併記が無い場合 BLOCK**:

| 禁止語彙 | 例 |
|---|---|
| `完走` | 「Phase A 全完走」 |
| `全 PASS` | 「自動テスト全 PASS」 |
| `動作確認済` | 「動作確認済、次 Phase 着手」 |
| `全完走` | 「全 10 画面 全完走」 |
| `全件 PASS` | 「真 E2E 全件 PASS」 |

## 5. few-shot 例（正例）

### 例 1（5 種フィールド全件併記）
```
[完了報告 - PATCH-X-FIX]
1. やったこと: signin → /grow 遷移修正
2. 結果: 動作テスト 12 件 PASS=12/失敗=0 / mock=8 / real=4 / unknown_residual=0 / 実態率 33%
   `tail -5 logs/realmachine_smoke_results.log` で signin_success=true && dashboard_reached=true && result=PASS 確認
3. 次: ふとし実機検収（https://lais-3yk.pages.dev/auth?mode=login）
```

### 例 2（最低限フィールド 2 種 + ログ参照）
```
[完了報告 - PATCH-Y]
1. やったこと: TALK 重複送信修正
2. 結果: PASS=43/失敗=0 / mock=37 / real=6 / `tail -5 logs/realmachine_smoke_results.log` で result=PASS 確認
3. 次: 24h 経過観測
```

## 6. few-shot 例（違反例）

### 例 1（禁止語彙単独）
```
Phase A 全完走、自動テスト全 PASS、次は Phase B 着手。
```
→ 禁止語彙「全完走」+「全 PASS」検出 + 必須フィールド 0 件 → BLOCK

### 例 2（PASS=N のみ、mock/real 未明示）
```
真 E2E 17/17 PASS / 動作確認済
```
→ 禁止語彙「動作確認済」+ 必須フィールド「PASS=17」のみ 1 件（mock/real 欠落）→ BLOCK

### 例 3（数字あるが mock/real 区別なし）
```
全 10 画面で完了。テスト 50 件 PASS。
```
→ 禁止語彙「完了」（弱、警告のみ）+ 「PASS=50」のみ → mock/real 未明示で WARN（block ではない、§2.25.21.7 既定 warn モード）

## 7. skip 条件

以下の場合は禁止語彙検査を skip:

- §2.25.3 PO 判断必須事項該当応答（コスト追加 / 新プロセス / ブランド変更 / データスキーマ / 外部依存）
- 仕様書改定のみ（実装変更なし、`spec-only no-code-touch` キーワード明示）
- Phase 完了宣言ではない通常応答（質問への回答 / 進捗共有 / etc.）
- 引用文（行頭が `> `）/ few-shot 例言及
- `instructions/gate_override.flag` 存在時

## 8. 環境変数による段階展開

```sh
# warn モード（既定、検出 → 内部ログのみ、PO 表示なし）
ADV_GATE_FALSE_REPORTS_MODE=warn

# block モード（PO ふとし運用観測 1 週間後の判断で切替）
ADV_GATE_FALSE_REPORTS_MODE=block

# off モード（緊急時の一時無効化、`gate_override.flag` と等価）
ADV_GATE_FALSE_REPORTS_MODE=off
```

## 9. 関連

- `lais/verify/dev_system_v34_package.md` §2.25.21.7（仕様 SSoT）
- `lais/verify/today_false_reports_review_2026-04-26.md` §1 / §3（採択改善案 #3 / 9 件虚偽パターン）
- `scripts/adv_response_gate.sh` FORBIDDEN_VOCAB_HIT ブロック（実装）
- `docs/ops/acceptance_criteria.yml`（Phase A 全 10 画面 受入基準）
- `lais/verify/dev_system_v34_patches.md` PATCH-TODAY-FALSE-REPORTS-IMPROVEMENT（起票）
- `docs/decision_log.md` PD-TODAY-FALSE-REPORTS-IMPROVEMENT
