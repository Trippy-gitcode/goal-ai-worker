# sub_hflow_protocol.md — Hフロー（統合フローレビュー）詳細

> 親: dev_system_spec.md §6.4 + §21 §C4.5
> 新設: 2026-04-23（dev-system v3.4 確定、CHAIN-UPDATE-DISPATCH PART1）
> 根拠: lais/verify/dev_system_v34_package.md §6.7（逐語ベース）+ PATCH-14（二重証跡）+ PD-110
> SSOT: 承認証跡 JSON スキーマ = §2 / 二重証跡検証 = §3 / 承認主体判定 = §4

---

## §1 Hフロー発火条件

`scripts/lib/risk_patterns.sh` の `RISK_PATHS` に prefix match するファイルが `git diff` に含まれる場合、Hフロー発火。

**対象パス（RISK_PATHS SSOT）:**
- `src/auth/`
- `src/payment/`
- `src/services/supabase.ts`
- `src/services/external/`
- `src/services/stripe/`
- `supabase/migrations/`
- `.env`
- `.dev.vars`
- `wrangler.toml`
- `app_config.yaml`（PATCH-23 / Bug V35-P1-S2-03 対応、`hflow.enabled` / `review.model_tier` 等の実行時挙動変更設定を含むため RISK_PATHS 該当）

**発火判定スクリプト**: `scripts/hflow_trigger_check.sh`
- CONTEXT（`pre-commit` / `pre-push` / `deploy`）別に `git diff` を取得
- RISK_PATHS prefix match を検査
- match ありで exit 0（発火）、なしで exit 1（スキップ）

**追加検討（将来拡張候補、本プロトコル非承認項目）:**
- auth テストファイル（`tests/auth_*.spec.ts`）の追加は `app_config.yaml` の `hflow.enabled_for_tests` フラグで opt-in
- リファクタ時の false positive を避けるため、`--ignore=no-logic-change` オプションは v3.5 以降で検討

---

## §2 承認証跡 JSON スキーマ（PATCH-14 二重証跡版）

保存先: `instructions/approvals/<MISSION_ID>.hflow.approved`

**必須フィールド:**
```json
{
  "approver": "ADV | PO",
  "approver_name": "claude_ai_G_XX | desktop_code_adv_G_XX | futoshi",
  "date": "2026-04-23T10:15:32Z",
  "mission_id": "MISSION-ID",
  "commit_sha": "abc1234...",
  "session_history_ref": "instructions/results/session_history.md#G_NN_LNNN",
  "approval_git_author": "claude_ai <noreply@anthropic.com>",
  "trigger_reason": "src/auth/** 変更",
  "notes": "..."
}
```

**スキーマ検証** (`templates/hflow_approval_template.json` の `$schema`):
- `approver`: "ADV" or "PO" のみ許容
- `approver_name`: 英数字 + アンダースコア
- `date`: ISO 8601 UTC
- `mission_id`: session_progress.md に実在する MISSION_ID と一致
- `commit_sha`: 40 桁の hex
- `session_history_ref`: `instructions/results/session_history.md#<anchor>` 形式、anchor は `G_NN_LNNN` 相当
- `approval_git_author`: git author ドメインマッチ（§3.3 参照）

---

## §3 Hフロー承認フロー（R3-H-09 + PATCH-14 二重証跡版）

### §3.1 承認手順（全ステップ）

1. **ENG**: `deploy.sh` 実行時に `hflow_trigger_check.sh` が発火検出 → session_progress.md に「Hフロー発火検出」を追記 → `deploy.sh` 一時停止（Step 5 で承認ファイル待ち）
2. **ENG → ADV**: 発火理由（変更ファイルパス）と修正内容を session_progress に記述
3. **ADV/PO**: 判断記録を `instructions/results/session_history.md` に書込（承認判断の意思決定ログ）→ 行番号をアンカー化（例: `G_47_L123`）
4. **ADV/PO**: 承認ファイル作成（`templates/hflow_approval_template.json` をコピー）:
   - `approver` / `approver_name` / `date` / `mission_id` / `commit_sha`（HEAD sha）を記入
   - `session_history_ref` に `instructions/results/session_history.md#G_NN_LNNN` を記入
   - `trigger_reason` / `notes` を記入
   - ファイル保存後の git コミット時に author が approver 対応（ADV なら claude_ai ドメイン、PO なら futoshi ドメイン）であること
5. **必要時** ADV → PO: プラン/コスト/ブランド影響がある場合は PO エスカレーション（§4 参照）、PO が手順 3-4 を実行
6. **ENG**: `deploy.sh` 再実行 → `verify_approval_authenticity.sh` が二重証跡を検証 → PASS でデプロイ続行

### §3.2 ENG 自己付与禁止（PD-110 強制）

`changed-files-allowlist.sh` で `instructions/approvals/` は **ADV 書込可 / ENG 書込不可** に制約。ENG が自己承認ファイルを作成しようとすると pre-commit hook で FAIL。

### §3.3 二重証跡検証（PATCH-14、`scripts/verify_approval_authenticity.sh`）

deploy.sh Step 5 で以下を一括検査、いずれか失敗で exit 1:

| # | 検証項目 | 根拠 |
|---|---|---|
| 1 | 承認ファイル存在 + JSON スキーマ妥当性 | `templates/hflow_approval_template.json` の `$schema` |
| 2 | `session_history_ref` の行アンカー実在 | `grep -n "^### G_NN" instructions/results/session_history.md` + 行番号レンジ照合 |
| 3 | `approval_git_author` ドメインマッチ | ADV: `*claude_ai*\|*claude@*\|*anthropic*\|*noreply@anthropic.com\|*noreply@github.com` / PO: `futoshi` メールドメイン（PATCH-19 / Bug H: GitHub noreply 追加で Desktop Code ADV の GitHub 経由 commit に対応）|
| 4 | HEAD sha == `commit_sha` | `git rev-parse HEAD` と承認ファイル内フィールド比較 |

**拡張性注記（PATCH-14 関連、v3.5 候補）**: 将来、別 AI（Gemini / Claude Sonnet 等）が ADV 補助する場合、`approval_git_author` のドメインマッチを PD-110 拡張で再検討。現行のドメインマッチは Anthropic 系 + GitHub noreply のみ許容（PATCH-19 / Bug H）。

### §3.4 commit 変更時の再承認

commit_sha が変更された場合（re-commit / amend 等）、承認ファイルの `commit_sha` と HEAD sha が不一致となり自動で `deploy.sh` Step 5 で FAIL。ADV/PO が承認ファイルを再生成（`commit_sha` 更新）する必要がある。

---

## §4 承認主体の判断基準

| 状況 | 承認主体 |
|---|---|
| コード品質・セキュリティの判定で十分 | ADV 承認可 |
| プラン/コスト/ブランド影響あり | PO 承認必須 |
| データスキーマ変更（supabase/migrations/ 等）| PO 承認必須 |
| 新規外部依存追加（npm 新規パッケージ、API キー新規 等）| PO 承認必須 |
| セキュリティ境界変更（RLS / CSP / 認証フロー 等）| PO 承認必須 |

ADV 判断時も PO 判断必須項目に該当しないか §2.25.3（`dev_system_v34_package.md` §2.25.3、v3.4 確定後は §21 §C5.7）で self-check。

---

## §5 オプトアウト（ソロ開発者向け）

`app_config.yaml` の `hflow.enabled: false` で Hフロー全体スキップ。

```yaml
hflow:
  enabled: true | false   # デフォルト true
  enabled_for_tests: false # §1 の将来拡張候補、デフォルト false
```

**オプトアウト時の運用制約:**
- PD-110 方針は保持される（ENG 自己承認は禁止、承認は ADV/PO 限定）
- ただし承認ファイルの実ファイル作成義務は消え、deploy.sh Step 5 はスキップ
- ソロ開発で高リスクファイル変更が高頻度な場合、PO 判断で opt-out 可

---

## §6 運用上の留意点

### §6.1 Hフロー発火時のデプロイ停止時間

- ADV 承認: 即時〜数分（ADV オンライン時）
- PO 承認: 数時間〜1日（PO が実機確認等を行うため）
- ENG は session_progress.md の該当ミッションを STATUS=BLOCKED（理由「Hフロー承認待ち」）に遷移させて他ミッションを進める選択肢あり

### §6.2 虚偽承認の検知

PATCH-14 二重証跡により、以下の虚偽シナリオを防止:

| 虚偽シナリオ | 検知メカニズム |
|---|---|
| ENG が承認ファイルを自己生成 | git author が ENG（claude_code）ドメインで approval_git_author 不一致 → FAIL |
| ADV が session_history に記録せず承認ファイルのみ作成 | `session_history_ref` の行アンカー不在 → FAIL |
| 古い承認ファイルを流用（別 commit 用）| `commit_sha` != HEAD sha → FAIL |
| 承認ファイルを後から改ざん | git log で承認ファイル commit 時の author が approver と不一致 → FAIL |

### §6.3 デプロイ成功後の承認ファイル保持

承認ファイルは `instructions/approvals/` に永続保存（削除禁止）。監査証跡として最低 1 年保持。将来的に `instructions/approvals_archive/` への自動アーカイブは v3.5 以降で検討。

---

## §7 関連ファイル

- `dev_system_spec.md` §6.4（本ファイルの親）+ §21 §C4.5（起動時要約版）
- `docs/po-decisions.md` PD-110（Hフロー承認主体 ADV/PO 限定）
- `lais/verify/dev_system_v34_package.md` §3.5（承認真正性二重証跡 SSOT）+ PATCH-14 記録
- `scripts/hflow_trigger_check.sh`（発火判定）
- `scripts/verify_approval_authenticity.sh`（二重証跡検証）
- `scripts/lib/risk_patterns.sh`（RISK_PATHS SSOT）
- `templates/hflow_approval_template.json`（承認ファイル雛形）
- `app_config.yaml` `hflow` セクション（オプトアウト設定）

---

> v3.4 新設。以降の改訂は PATCH として patches.md に記録、本ファイル更新は CHAIN-UPDATE-DISPATCH で連鎖反映。
