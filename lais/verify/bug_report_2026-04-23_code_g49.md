# dev-system v3.4 バグレポート（Code G_49、2026-04-23）

> 実施: Code G_49（ENG、Opus 4.7）/ 2026-04-23
> 対象: `lais/verify/dev_system_v34_package.md`（3,352 行、ADV G_48 リネーム後）+ 派生ファイル（patches.md / pre_r5_* / session_progress.md）
> トリガー: PO（ふとし）指示「ADV 作業中、仕様書バグチェックして待機」
> 検出手法: grep / awk / diff による構造的整合チェック（fresh context、Stage 2 独立レビュー相当）
> 引き継ぎ先: **ADV G_48（Desktop Code ADV）** — 仕様判定 + 修正実装権限保持者

---

## Executive Summary

| 区分 | 件数 |
|---|---:|
| 🔴 重大（CHAIN-UPDATE-DISPATCH をブロック）| 3 |
| 🟡 中（連鎖更新の不整合、即座には壊れない）| 7 |
| 🟢 低（文書品質、即座の影響なし）| 4 |
| **合計** | **14** |

**直近判断要件**: CHAIN-UPDATE-DISPATCH PART1 着手前に 🔴 重大 3 件（Bug A/B/F）の修正要否を ADV+PO で判定必要。🟡 中以下は v3.4 パッチまたは v3.5 回し選択可。

---

## 🔴 重大（3 件）

### Bug A: §6.10 scripts/ 一覧に 7 本の漏れ

**場所**: `dev_system_v34_package.md` §6.10 L3092-L3107 相当
**影響**: CHAIN-UPDATE-DISPATCH PART2 で新規スクリプトが作成されず、deploy.sh / canopy.sh が未実装スクリプト呼出しで exit 1

**欠落スクリプト:**
| スクリプト | 出典 PATCH | 現在の §6.10 | §6.2 | 呼出し元 |
|---|---|:---:|:---:|---|
| `extract_cmd.sh` | PATCH-11 | ❌ | ❌ | deploy.sh Step 6/7 |
| `verify_approval_authenticity.sh` | PATCH-14 | ❌ | ❌ | deploy.sh Step 5 |
| `terminology_lint.sh` | PATCH-10 | ❌ | ❌ | G10 拡張（pre-commit） |
| `lib/runtime_preflight.sh` | PATCH-15 | ❌ | ❌ | deploy.sh 冒頭 source |
| `step0_lint.sh` | PATCH-7（§2.23） | ❌ | ✅ | pre-commit / deploy.sh Step 0 |
| `verify_hooks.sh` | PATCH-7（§2.24） | ❌ | ✅ | pre-push / nightly self-check |
| `spec_first_lint.sh` | 既存 §2.X | ❌ | ✅ | pre-commit（G14） |

**推奨修正**: §6.10 を「§6.2 と 1:1 対応」と謳っているので、§6.2 の記載済 16 本 + PATCH-10/11/14/15 の 4 本 = **合計 20-22 本** に拡張。

### Bug B: §6.2 canopy_common.sh 関数リストに `correct_status` 未記載

**場所**: `dev_system_v34_package.md` §6.2 関数追加行
**影響**: CHAIN-UPDATE-DISPATCH PART2 で sub_infrastructure.md §2.6 に correct_status が追加されず、PATCH-12 STATUS_CORRECTION プロトコルが機能不全。

**現状**:
> - §2.6 canopy_common.sh: 既存ベタ書き末尾に get_current_mission_block / check_test_pass / update_status / check_blocked_integrity 関数追加

**推奨修正**: 末尾に `/ correct_status` を追記（PATCH-12 で §2.6 に実装サンプル済）。

### Bug F: `append_deploy_fail.sh` STRIKE 2 で `$OVERRIDE` 未定義参照

**場所**: `dev_system_v34_package.md` §2.4 L942-L971 付近
**影響**: STRIKE 2 失敗時、スクリプト冒頭の `set -eu` により unset 変数参照 error で exit。BLOCKED 遷移完了せず、session_progress.md に STATUS 書込み失敗。

**問題コード**:
```sh
# L942: OVERRIDE は NEW_STRIKE -ge 3 の if ブロック内でのみ定義
if [ "$NEW_STRIKE" -ge 3 ]; then
  OVERRIDE="instructions/approvals/${MISSION_ID}.strike_override.json"
  ...
fi

# L958-971: STRIKE 2 ブランチで $OVERRIDE を参照（未定義）
case "$NEW_STRIKE" in
  2)
    NEW_STATUS="BLOCKED"
    BLOCKED_REASON="DEPLOY_STRIKE_2_PO_ESCALATION（PO 承認ファイル $OVERRIDE 要求、自動 recover 生成なし）"
    ;;
esac
```

**推奨修正**: STRIKE 2 ブランチで `$OVERRIDE` 参照を削除、または `OVERRIDE="${OVERRIDE:-instructions/approvals/${MISSION_ID}.strike_override.json}"` でデフォルト値付与（case の前に移動）。

---

## 🟡 中（7 件）

### Bug C: §6.4 sub_adv_protocol.md に STATUS_CORRECTION 手順未反映
patches.md PATCH-12 で「sub_adv_protocol.md §11 新設（ADV が何を検知したら correct_status を呼ぶか）」と予告したが、§6.4 連鎖更新指示に未記載。

### Bug D: §6.9 templates/ に新規フィールド未追記
- `mission_template_v3.md` の `risk_tags` フィールド（PATCH-16）
- `hflow_approval_template.json` の `session_history_ref / approval_commit_sha / approval_git_author` フィールド（PATCH-14）

### Bug E: §6.12 .git/hooks/ に verify_hooks.sh pre-push 結線未記載
§2.24 で「pre-push hook に verify_hooks.sh 結線」明記、§6.12 は「pre-push: shellcheck_lint.sh 追加」のみで verify_hooks.sh 言及なし。

### Bug I: §3.6 STRIKE 2「strike_override.json 要求通知」が実装不在
文書上 STRIKE 2 で strike_override.json を「要求通知」と記述、しかし append_deploy_fail.sh / deploy.sh のどちらも STRIKE 2 での strike_override.json 存在チェックを行わない（STRIKE ≥3 のみ）。文書と実装の乖離。

### Bug J: §1.2「22クラスター集約」タイトル矛盾
実際の §2.X は §2.1〜§2.26 の 26 クラスター（θG11/θG13/ADVcrit/STATUScrit 追加後）。§1.2 タイトルは PATCH-7/18/12 前の旧数。

### Bug L: §C3.2 起動時要約に STATUS_CORRECTION 未反映
§C3.2 は「毎セッション必須 Read」の起動時要約だが、STATUS_CORRECTION 例外規定（§2.26、PATCH-12）が表外。BLOCKED 行の主体が「ENG 手動」のみで、ADV/PO の correct_status による逆方向遷移（DONE→IN_PROGRESS 等）が要約で見えない。

### Bug O: Pre-Review 2R（ADV G_48 自己実施）が重大 0 を宣言したが 🔴 重大 3 件を検出できず
`pre_r6_summary.md`（PATCH-18 ADV 自己レビュー）と `pre_r5_summary.md`（Code ENG 執筆）いずれも現状 Bug A/B/F を検出せず「CRITICAL 0」を宣言。**同一セッション self-critique の限界事例** として LP-030 候補蓄積を推奨。

---

## 🟢 低（4 件）

### Bug G: §10.11 用語混在検知 grep の排除パターン過剰
`grep -vE '...code|Protocol|Policy|Rules'` — 英単語を含む行を全除外、検知力低下。

### Bug H: PATCH-14 `approval_git_author` ドメインマッチの GitHub noreply 非対応
`*noreply@anthropic.com` のみ、`*noreply@github.com` 系を弾く。ADV 意図通りなら OK。

### Bug K: patches.md に旧ファイル名 `r2_2_package.md` 参照 19 箇所
ADV リネーム（`dev_system_v34_package.md`）に追従漏れ。アーカイブ文書なのでそのままでも可。

### Bug N: pre_r5_summary / pre_r5_detailed / session_progress に旧ファイル名参照（各 1 箇所）
同上。

---

## 提案: G18 chain_update_audit.sh 新設（仕様変更相当、ADV+PO 判定要件）

### 目的
今回検出された Bug A/B/D/E/J の 6 割が **grep で機械検知可能** な論理整合性バグ。外部 AI レビューや Pre-Review ではなく **pre-commit で落とせる層**。新規ゲート 1 本で再発防止が機械化される。

### 実装案（約 60 行、§2.6 canopy 内）
```sh
#!/bin/sh
# scripts/chain_update_audit.sh
# G18: §2 で新設/更新されたスクリプト・関数が §6 連鎖更新指示に反映されているかを監査
# 入力: dev_system_v34_package.md（または dev_system_spec.md 確定後）
# PASS: §2.X 内の "scripts/XXX.sh" 参照が §6.10 に全件記載 + §2.6 追加関数が §6.2 に記載
# FAIL: いずれか漏れ検出で exit 1

set -eu
SPEC="${1:-lais/verify/dev_system_v34_package.md}"
[ -f "$SPEC" ] || { echo "FAIL: $SPEC not found" >&2; exit 1; }

# §2.X で言及されたスクリプト名を抽出（scripts/<name>.sh パターン）
SCRIPTS_IN_S2=$(awk '/^## §2\./,/^## §3\./' "$SPEC" | grep -oE 'scripts/[a-zA-Z_/]+\.sh' | sort -u)

# §6.10 に列挙されているスクリプト名
SCRIPTS_IN_S610=$(awk '/^### §6\.10/,/^### §6\.11/' "$SPEC" | grep -oE '[a-zA-Z_/]+\.sh' | sort -u)

# diff
MISSING=$(comm -23 \
  <(echo "$SCRIPTS_IN_S2" | sed 's|^scripts/||') \
  <(echo "$SCRIPTS_IN_S610"))

if [ -n "$MISSING" ]; then
  echo "FAIL: G18 chain_update_audit — §2 で言及されたスクリプトが §6.10 に未記載:" >&2
  echo "$MISSING" >&2
  exit 1
fi

# §2.6 の canopy_common.sh 追加関数 vs §6.2 関数リスト
FUNCS_IN_S26=$(awk '/^### §2\.6 /,/^### §2\.7/' "$SPEC" | grep -oE '^[a-z_]+\(\)' | sort -u)
FUNCS_IN_S62=$(awk '/^### §6\.2/,/^### §6\.3/' "$SPEC" | grep -oE '[a-z_]+(?= 関数追加)')
# ... 省略（diff 比較）

echo "OK: G18 chain_update_audit PASS"
```

### コスト
- スクリプト 1 本（約 60 行）
- §4.1 ゲート一覧に G18 1 行追加
- §6.10 / §6.2 の対応表整備（初回のみ手動）
- 運用コスト: pre-commit で 1 秒以下

### ROI
- 今回のバグ 14 件中 6 件が機械検出可能（Bug A/B/D/E/J + 類似パターン）
- 将来の PATCH 追加時も自動検知（連鎖更新漏れの恒久対策）
- 人間レビュー（ADV/ENG/外部 AI）は論理層・意図層に集中できる

### 判定要求
- **ADV**: G18 追加の要否判断（3ペルソナ合議: ADV/QA/PO代理）
- **PO**: コスト影響なし（内部 Opus、API 未使用）・新プロセス追加ではあるが §C2.3 Hフローとは独立した canopy ゲート単純追加で影響小
- **予想優先度**: v3.4 確定後の追加パッチ or v3.5 で正式化

---

## 推奨対応順序

| 優先度 | Bug | 対応タイミング | 対応者 |
|:-:|---|---|---|
| P0 | A (§6.10 漏れ)| CHAIN-UPDATE-DISPATCH PART1 着手前 | ADV |
| P0 | B (correct_status 未記載)| 同上 | ADV |
| P0 | F ($OVERRIDE unset)| 同上 | ADV（bash 実装サンプル修正）|
| P1 | C/D/E (連鎖更新漏れ)| PART1 着手前または PART2 冒頭 | ADV |
| P1 | I/J/L (文書矛盾)| v3.4 パッチ | ADV |
| P2 | G18 ゲート新設 | v3.4 パッチ or v3.5 | ADV + PO 判定 |
| P2 | G/H (文書品質)| v3.5 回し許容 | ADV |
| P3 | K/N (旧ファイル名参照)| ADV リネーム追従時に一括修正 | ADV or Code（指示後）|

---

## Code G_49 からの引き継ぎメモ

- 本レポート作成時点で R2.2 パッケージ本体（`dev_system_v34_package.md`）は 3,352 行、PATCH-10〜17 反映済・ADV リネーム済で機械層整合性は維持
- Pre-Review 2R CRITICAL 0 宣言は **Bug O（同一セッション self-critique 限界）** により意図層バグを見逃したもの
- **LP-030 候補**: 同一モデルでもセッション分離・ペルソナ分離でバグ検知力が変動する事例
- **LP-031 候補**: Stage 1（書込者機械層自己レビュー）+ Stage 2（別セッション論理層レビュー）の 2 段階構成が、単独 Stage 2 より総やり戻しを減らす（今回は Stage 1 が欠落した運用）

---

> 本レポートは ADV 作業中の待機タスクとして PO 指示で作成。ADV G_48 作業完了後、PO から ADV への引き継ぎファイルとして使用。Code は勝手な仕様書修正は行わず、提案ログに留める（CLAUDE.md 契約セクション「設計変更は自由だが仕様変更は禁止」の解釈: §6 連鎖更新指示修正・G18 ゲート追加は仕様書本体変更に該当し、ADV/PO 領域）。
