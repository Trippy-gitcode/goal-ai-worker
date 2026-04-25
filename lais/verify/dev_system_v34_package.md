# dev-system v3.4 R2.1.1 パッケージ（差分修正版）
> ADV（Claude.ai G_45）作成 / 2026-04-19
> Golden R1 CRITICAL 32件の差分修正版。R2.1 本体（1,931行）は不変。
> 本パッケージと R2.1 を合わせてゴールデンラウンド R2（上限2R 中 2周目）の入力とする
> 入力トリアージ: lais/verify/dev_system_v34_golden_r1_triage.md（738行）
> 参照R2.1本体: lais/verify/dev_system_v34_r2_1_package.md（1,931行、不変）

---

## §0. パッケージ位置づけ

### 0.1 R2.1 → R2.1.1 差分 = 14クラスター修正 + §C0-C6 設計追加 + PD-108 却下記録 + ai_review.js 改修

R2.1 本体（1,931行）に対する差分パッケージ。本R2.1.1 は以下の4種の変更を含む:
1. **クラスター修正パッチ（14件）**: §4.α' 〜 §4.ξ' + §4.ν'（HIGH降格）
2. **§C0-C6 設計追加**: R2.1 §6.1 に §C1-C6 マッピング表と具体化指示を新規追加
3. **PD-108 却下記録**: R2.1 §4.16 の一部削除（scripts/lib/**, scripts/*_lint.sh を ADV 書込可から外す）
4. **ai_review.js 改修**: GPT-5.4 側の `response_format: json_object` 削除（Code G_46 別ミッション）

### 0.2 PO判定確定（ふとし 2026-04-19）
- **判定1 F-1**: §C0-C6 を既存 §1-§20 からの再編として dev_system_spec.md 末尾（新§21）に新設
- **判定2 A**: ADV 書込可拡張は採用せず、R2.1 §4.16 から scripts/lib/**, scripts/*_lint.sh を削除。PD-108 として却下決定を po-decisions.md に記録
- **判定3 C**: ai_review.js を改修し GPT-5.4 側の response_format: json_object を削除。ゴールデン2周目実行前に完了必須

### 0.3 Golden R1 での主要発見と本R2.1.1 の対応
| 発見 | クラスター | R2.1.1 対応節 |
|---|---|---|
| §C0-C6 物理的不在 | α'（3件）| §2.α' + §3（新設）|
| 証跡パス不整合（logs/ vs evidence/） | β'（4件）| §2.β' |
| POSIX互換違反 7種 | γ'（7件）| §2.γ' |
| 個別スクリプトバグ（awk/grep/regex）| δ'（4件）| §2.δ' |
| Hフロー/デプロイゲート欠陥 | ε'（3件）| §2.ε' |
| L1スモーク定義不一致 | ζ'（2件）| §2.ζ' |
| STATUS 遷移手動/自動混在 | η'（2件）| §2.η' |
| mission_template cmd1乖離 | θ'（1件）| §2.θ' |
| pre-commit ハードコード | ι'（1件）| §2.ι' |
| G14 正規表現過度厳格 | κ'（1件）| §2.κ'（δ' と統合）|
| G17 スクショ認証未対応 | λ'（1件）| §2.λ'（ζ' と統合）|
| ADV書込可拡張衝突 | μ'（1件）| §4（PD-108 却下）|
| Read量運用負荷 | ν'（1件、HIGH 降格） | LP-025 候補記録のみ |
| G8 AFTER タイポ | ξ'（1件）| §2.ξ' |

### 0.4 R2.1 本体の不変性
R2.1 本体（1,931行）の §1-§9 および §10 検証コマンドは**完全不変**。本R2.1.1 は R2.1 の**差分パッチ集**として機能する。

**重要**: ゴールデン R2 レビュアーは R2.1 と R2.1.1 の**両方**を読む。レビュー観点は「R2.1.1 によって R2.1 の問題が解決されているか」+「R2.1.1 自体に新たな問題がないか」。

### 0.5 レビュアーが新たに CRITICAL を出すべきでない論点（§5.5 棄却強化）
- PD-104/105/106/107 の方針への異議
- PD-108（却下決定）への異議（却下決定そのものへの再提案）
- R1/R2 で既棄却 LOW 4件の蒸し返し
- R2 採用 98件（76+22）+ HIGH 21件 + Golden R1 採用 30件 = 149件方針への再異議
- Golden R1 で採用された 14クラスター修正への方針異議（実装詳細改善は HIGH まで可）

### 0.6 R2.1.1 構成（10パート、合計推定 1,200-1,400行）
| § | 内容 | 行数目安 |
|---|---|---:|
| §0 | パッケージ位置づけ（本セクション） | 80 |
| §1 | Golden R1 結果サマリー | 50 |
| §2 | 差分修正パッチ 14クラスター（α'〜ξ'）| 700 |
| §3 | §C0-C6 設計（F-1 マッピング詳細）| 150 |
| §4 | PD-108 却下記録 + R2.1 §4.16 改訂 | 60 |
| §5 | ai_review.js 改修指示（判定3 C）| 50 |
| §6 | 連鎖更新指示（R2.1 §6 への追加/修正）| 100 |
| §7 | レビュアー指示 Part IX（ゴールデン R2 用）| 80 |
| §8 | Cumulative Context Part X（149件要約）| 80 |
| §9 | ゴールデン R2 実行計画 | 50 |

---

## §1. Golden R1 結果サマリー

### 1.1 severity 分布
| severity | 件数 |
|---|---:|
| CRITICAL | 32 |
| HIGH | 11 |
| MED | 1 |
| **合計** | **44** |

### 1.2 14クラスター一覧
詳細は `dev_system_v34_golden_r1_triage.md` §1 を参照。

| クラスター | 件数 | テーマ | §2 対応節 |
|---|---:|---|---|
| α' | 3 | §C0-C6 物理的不在 + 移行マップ欠落 | §2.α' + §3（新設）|
| β' | 4 | G8/G17 証跡パス不整合 | §2.β' |
| γ' | 7 | POSIX 互換違反・実装バグ | §2.γ' |
| δ' | 4 | 個別スクリプト実装バグ | §2.δ' |
| ε' | 3 | Hフロー/デプロイゲート欠陥 | §2.ε' |
| ζ' | 2 | L1スモーク定義不一致 | §2.ζ' |
| η' | 2 | STATUS 遷移手動/自動混在 | §2.η' |
| θ' | 1 | mission_template cmd1 乖離 | §2.θ' |
| ι' | 1 | pre-commit ハードコード | §2.ι' |
| κ' | 1 | G14 正規表現過度厳格 | §2.κ'（δ'と統合）|
| λ' | 1 | G17 スクショ認証未対応 | §2.λ'（ζ'と統合）|
| μ' | 1 | ADV書込可拡張衝突 | §4（PD-108却下）|
| ν' | 1 | Read量運用負荷（HIGH降格）| LP-025候補のみ |
| ξ' | 1 | G8 AFTER タイポ | §2.ξ' |

### 1.3 GPT-5.4 出力制約問題

全5ペルソナで CRITICAL 1件のみという異常な均一分布。ファイルサイズ平均1,334 chars（Gemini 5,332 chars）で明らかに出力抑制。`response_format: json_object` の制約が原因と推定。 **対応: 判定3 C採用**。本R2.1.1 §5 で ai_review.js 改修指示を確定、Code G_46 の別ミッションで実施。

---

## §2. 差分修正パッチ — 14 クラスター

各節は以下の要素を含む:

- **Target**: 修正対象（R2.1 の §X.Y、または関連ファイル）
- **BEFORE**: R2.1 での記述/設計
- **AFTER**: R2.1.1 での確定記述/設計
- **根拠**: Golden R1 指摘 ID 対応
- **他クラスター整合**: 依存関係の確認

### §2.α' — §C0-C6 物理的不在 + 移行マップ欠落

**Target**: R2.1 §4.6（ζクラスター）、§4.20（υクラスター）、§6.1（連鎖更新指示）

**根拠**: Golden R1 gemini_solo R-001, gemini_tech_writer R-001, R-002

**BEFORE（R2.1）**:

> 必須Read = §C0 要約 + [CLAUDE.md](http://CLAUDE.md) + development_rules.md + session_progress.md §C1-C6 は条件付き再読

**AFTER（R2.1.1）**: §C0-C6 は dev_system_spec.md 末尾（**新設§21**）に追加される「起動時要約版」。既存 §1-§20 は**不変**。

詳細マッピングは §3（本R2.1.1）で定義。§6.1 連鎖更新指示に以下を追加:

```markdown
### §6.1 dev_system_spec.md 連鎖更新 — §C0-C6 新設

**新設方針**: 既存 §1-§20 は不変で維持。§C1-C6 は dev_system_spec.md 末尾に「§21 共通規範集（起動時要約版）」として新設。

**§C1-C6 マッピング表（詳細は R2.1.1 §3）**:
| §C | タイトル | 既存章からの引用元 | 行数目安 |
|---|---|---|---:|
| §C0 | 起動時要約 | §C1-C6 の1行サマリー + PD-104/105/106/107 + 鉄則トップ5 | 80 |
| §C1 | 設計原則 & 鉄則 | §1 設計原則 + §3 鉄則15個（要約） | 50 |
| §C2 | 変更フロー | §2 変更フロー6ステップ | 40 |
| §C3 | 品質ゲート & テスト戦略 | §4 品質ゲート G1-G17 + §7 3層テスト | 60 |
| §C4 | デプロイ & デバッグ | §8 C2デプロイフロー + §9 デバッグ | 55 |
| §C5 | レビュー運用 & 棚卸し | §13 + §14 + §15（共通原則抜粋） | 80 |
| §C6 | 構造的制約 & セキュリティ | §16 + §20 | 45 |

**鉄則 → §C1 移行マップ**（§3 15個の鉄則を §C1 にどう集約するか、本R2.1.1 §3 で具体化）。既存 §3 は**参照用として残存**（鉄則は §3 が正本、§C1 は要約）。

**Code G_46 書き込み責任**: §C0-C6 具体本文は Code G_46 で書き込み。本R2.1.1 §3 が正式な章構成定義。
```

**他クラスター整合**:

- ν' HIGH 降格: Read 量過大指摘は §C0-C6 実体化後に実効的に緩和される
- R2.1 §4.6.1 ENG 必須Read「§C0 50-100行」は **§C0 80行 + §C1-C6 370行 = 約450行（§21 全体）** のうち、**§C0 80行のみが毎セッション必須**、§C1-C6 は条件付き再読と確定

---

### §2.β' — G8/G17 証跡パス統一（evidence/&lt;MISSION_ID&gt;/）

**Target**: R2.1 §4.2.2, §4.6.3, §5.2 (G15), §5.4 (G17), §4.12.1 (playwright.realworld.config.ts), §6.10 ([deploy.sh](http://deploy.sh) 連鎖更新欠落)

**根拠**: Golden R1 gemini_ai_ops R-003, gemini_solo R-005, R-006, gpt54_devops R-001

**R2.1.1 確定パス体系（BEFORE → AFTER 一覧）**:

項目BEFORE（R2.1）AFTER（R2.1.1）G8 unit 証跡logs//before-unit.json**evidence/&lt;MISSION_ID&gt;/before-unit.json**G8 e2e 証跡logs//before-e2e.json**evidence/&lt;MISSION_ID&gt;/before-e2e.json**G17 realworld 証跡logs/realworld//realworld-proof.json**evidence/&lt;MISSION_ID&gt;/realworld-proof.json**G17 スクショlogs/realworld//realworld-screenshots/**evidence/&lt;MISSION_ID&gt;/realworld-screenshots**/playwright config outputFilelogs/realworld/latest/realworld-proof.json**evidence/${MISSION_ID}/realworld-proof.json**deploy.loglogs/deploy.log（未生成）**logs/deploy.log**（[deploy.sh](http://deploy.sh) が生成、§2.ε' 参照）

**canopy_common.sh::check_tdd 差替（R2.1 §4.2.3 を置換）**:

```sh
check_tdd() {
  local mission_id="$1"
  local evidence_dir="evidence/$mission_id"
  local has_trace=0
  for kind in unit e2e; do
    local before="$evidence_dir/before-$kind.json"
    local after="$evidence_dir/after-$kind.json"
    if [ -f "$before" ] && [ -f "$after" ]; then
      jq -e '.failed > 0' "$before" > /dev/null 2>&1 || { echo "FAIL: G8 $kind before.failed not > 0"; return 1; }
      jq -e '.failed == 0' "$after" > /dev/null 2>&1 || { echo "FAIL: G8 $kind after.failed not == 0"; return 1; }
      has_trace=1
    fi
  done
  [ "$has_trace" -eq 1 ] || { echo "FAIL: G8 no trace for unit/e2e"; return 1; }
  return 0
}
```

**playwright.realworld.config.ts（R2.1 §4.12.1 置換）**:

```typescript
import { defineConfig } from '@playwright/test';
const missionId = process.env.MISSION_ID || 'unknown';

export default defineConfig({
  testDir: './tests/realworld',
  grep: /@realworld/,
  use: {
    baseURL: process.env.REALWORLD_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  reporter: [
    ['json', { outputFile: `evidence/${missionId}/realworld-proof.json` }],
    ['html', { open: 'never' }],
  ],
});
```

**G17 (realworld_proof_check.sh) 差替（R2.1 §5.4 置換、γ' の** `\<` **修正と同時）**:

```sh
#!/bin/sh
MISSION_ID="$1"
[ -n "$MISSION_ID" ] || { echo "Usage: $0 <mission-id>" >&2; exit 2; }

DIR="evidence/$MISSION_ID"
[ -d "$DIR" ] || { echo "FAIL: G17 $DIR not found"; exit 1; }

PROOF="$DIR/realworld-proof.json"
[ -f "$PROOF" ] || { echo "FAIL: G17 missing $PROOF"; exit 1; }

jq -e '.timestamp and .results' "$PROOF" > /dev/null 2>&1 || {
  echo "FAIL: G17 $PROOF missing required fields"; exit 1
}

if [ -f logs/deploy.log ]; then
  deploy_ts=$(tail -1 logs/deploy.log | awk '{print $1}')
  proof_ts=$(jq -r '.timestamp' "$PROOF")
  # γ' 対応: awk 文字列比較（POSIX互換）
  if awk -v p="$proof_ts" -v d="$deploy_ts" 'BEGIN { exit !(p < d) }'; then
    echo "FAIL: G17 proof timestamp ($proof_ts) precedes deploy ($deploy_ts)"
    exit 1
  fi
fi

SHOTS="$DIR/realworld-screenshots"
[ -d "$SHOTS" ] || { echo "FAIL: G17 missing $SHOTS"; exit 1; }
# ζ' 対応: 5操作化（launch/auth/primary1/primary2_or_api/reload）
for op in launch auth primary1 primary2_or_api reload; do
  found=0
  for ext in png jpg jpeg; do
    [ -f "$SHOTS/$op.$ext" ] && { found=1; break; }
  done
  [ "$found" -eq 1 ] || { echo "FAIL: G17 missing screenshot $op.*"; exit 1; }
done

failed=$(jq -r '.results.failed // 0' "$PROOF")
if [ "$failed" -gt 0 ]; then
  echo "FAIL: G17 $failed realworld tests failed"; exit 1
fi

echo "OK: G17 realworld proof complete for $MISSION_ID"
```

**G15 (tdd_trace_consistency.sh) 差替（γ'** `<()` **修正含む）**:

```sh
#!/bin/sh
SPEC_FILE="${1:-docs/plans/dev_system_spec.md}"
SUB_TESTING="${2:-docs/plans/sub_testing.md}"
IMPL_FILE="${3:-scripts/lib/canopy_common.sh}"

SPEC_FILES=$(grep -hoE 'before-[a-z]+\.json|after-[a-z]+\.json|realworld-proof\.json' "$SPEC_FILE" "$SUB_TESTING" 2>/dev/null | sort -u)
IMPL_FILES=$(grep -oE 'before-[a-z]+\.json|after-[a-z]+\.json|realworld-proof\.json' "$IMPL_FILE" 2>/dev/null | sort -u)

if [ "$SPEC_FILES" != "$IMPL_FILES" ]; then
  echo "FAIL: G15 TDD trace file mismatch"
  # γ' 対応: <() 使わず一時ファイル経由
  tmp_spec=$(mktemp); tmp_impl=$(mktemp)
  echo "$SPEC_FILES" > "$tmp_spec"
  echo "$IMPL_FILES" > "$tmp_impl"
  diff "$tmp_spec" "$tmp_impl" || true
  rm -f "$tmp_spec" "$tmp_impl"
  exit 1
fi

echo "OK: G15 spec and impl reference identical TDD files"
```

**§6.10 への追加（[deploy.sh](http://deploy.sh) 連鎖更新、β'-3 + ε' 対応）**:

- [deploy.sh](http://deploy.sh) 本体を**完全に書き直す**（§2.ε' 参照）
- `logs/deploy.log` への完了記録を末尾に追加

---

### §2.γ' — POSIX 互換違反・実装バグ 修正（7件）

**Target**: R2.1 §4.4.2 (risk_match.sh), §4.4.3 (mission_risk_classifier.sh), §5.2 (G15), §5.3 (G16), §5.4 (G17), §4.17.4 (G13), §4.19.1 (append_deploy_fail.sh), §4.5.2 ([deploy.sh](http://deploy.sh) hflow)

**根拠**: Golden R1 gemini_devops R-001, R-002, R-004, R-005, R-006, gemini_qa R-005, gemini_ai_ops R-001

#### γ'-1: risk_match.sh のパイプ→ヒアドキュメント書き換え

```sh
#!/bin/sh
# scripts/lib/risk_match.sh (R2.1.1 AFTER)
. "$(cd "$(dirname "$0")" && pwd)/risk_patterns.sh"
```

is_risk_path() {
  target="$1"
  [ -z "$target" ] && return 1
  matched=0
  while IFS= read -r pattern; do
    case "$pattern" in '#'*|'') continue ;; esac
    case "$target" in
      "$pattern"*) echo "MATCH:$pattern"; matched=1; break ;;
    esac
  done <<EOF
$RISK_PATHS
EOF
  [ "$matched" -eq 1 ]
}

any_risk_path() {
  paths="$1"
  for p in $paths; do
    if is_risk_path "$p" > /dev/null; then
      return 0
    fi
  done
  return 1
}
```

#### γ'-2: G15 の `<()` 削除
§2.β' の G15 実装サンプルで既に反映済み（一時ファイル経由）。

#### γ'-3: G16 の `${COMMIT:0:7}` を cut に置換

```sh
#!/bin/sh
# scripts/deploy_hash_verify.sh (R2.1.1 AFTER)
DIST_DIR="${1:-dist}"
COMMIT=$(git rev-parse HEAD)
SHORT=$(printf '%s\n' "$COMMIT" | cut -c1-7)  # γ' 対応

[ -d "$DIST_DIR" ] || { echo "FAIL: G16 dist dir '$DIST_DIR' not found"; exit 1; }

found=0

if [ -f "$DIST_DIR/index.html" ]; then
  if grep -qE "commit-sha\"[[:space:]]+content=\"($COMMIT|$SHORT)" "$DIST_DIR/index.html"; then
    echo "OK: G16 meta tag commit-sha in $DIST_DIR/index.html"
    found=1
  fi
fi

if [ -f "$DIST_DIR/commit.txt" ]; then
  if grep -q "$SHORT" "$DIST_DIR/commit.txt"; then
    echo "OK: G16 $DIST_DIR/commit.txt contains $SHORT"
    found=1
  fi
fi

for js in "$DIST_DIR"/*.js; do
  [ -f "$js" ] || continue
  if grep -q "$SHORT" "$js"; then
    echo "OK: G16 $js contains $SHORT"
    found=1
    break
  fi
done

if [ "$found" -ne 1 ]; then
  echo "FAIL: G16 commit SHA ($COMMIT / $SHORT) not found"
  echo "  required: dist/index.html meta tag, dist/commit.txt, or dist/*.js constant"
  exit 1
fi

exit 0
```

#### γ'-4,5: G17 の `\<` 削除
§2.β' の G17 実装サンプルで既に反映済み（awk 文字列比較）。

#### γ'-6: G13 の awk date 処理を sh 側へ移動

```sh
#!/bin/sh
# scripts/verify_hooks.sh (R2.1.1 AFTER)
THRESHOLD_DAYS=7
LOG=logs/canopy_fire.log
[ -f "$LOG" ] || { echo "FAIL: G13 no fire log"; exit 1; }

date_to_epoch() {
  d="$1"
  if epoch=$(date -j -f "%Y-%m-%d" "$d" +%s 2>/dev/null); then
    echo "$epoch"; return 0
  fi
  if epoch=$(date -d "$d" +%s 2>/dev/null); then
    echo "$epoch"; return 0
  fi
  return 1
}

check_precommit_logic() {
  hook=".git/hooks/pre-commit"
  [ -f "$hook" ] || { echo "FAIL: pre-commit hook not found"; return 1; }
  if grep -qE '\[ -x ".*" \] && ".*" \|\| exit' "$hook"; then
    echo "FAIL: buggy logic in pre-commit (use 'if...then' instead of '&& HOOK || exit')"
    return 1
  fi
  return 0
}

NOW=$(date +%s)
THR=$((THRESHOLD_DAYS * 86400))
recent=0

while IFS= read -r line; do
  # 各行: "2026-04-19T08:15:32Z [pre-commit] ..."
  iso_date=$(echo "$line" | awk '{print $1}' | cut -d'T' -f1)
  tag=$(echo "$line" | awk '{print $2}')
  case "$tag" in
    '[pre-commit]'|'[pre-push]') ;;
    *) continue ;;
  esac
  epoch=$(date_to_epoch "$iso_date") || continue
  if [ $((NOW - epoch)) -le "$THR" ]; then
    recent=1
    break
  fi
done < "$LOG"

[ "$recent" -eq 1 ] || { echo "FAIL: G13 no pre-commit/pre-push within ${THRESHOLD_DAYS}d"; exit 1; }

check_precommit_logic || exit 1

echo "OK: G13 pre-commit/pre-push fire log present + logic check"
```

#### γ'-7: append_deploy_fail.sh 改行変数を ENVIRON 経由に

```sh
#!/bin/sh
# scripts/append_deploy_fail.sh (R2.1.1 AFTER)
MISSION_ID="$1"
STDOUT_TAIL="$2"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

PROGRESS=instructions/session_progress.md
[ -f "$PROGRESS" ] || exit 2

# γ' 対応: 改行含む変数は環境変数経由で awk に渡す
export STDOUT_TAIL
export MISSION_ID
export TIMESTAMP

awk '
  /^## 提案ログ/ && !done {
    print
    print ""
    print "### DEPLOY-FAIL " ENVIRON["MISSION_ID"] " (" ENVIRON["TIMESTAMP"] ")"
    print "- **STATUS:** WAITING_PO"
    print "- **提案日:** " substr(ENVIRON["TIMESTAMP"], 1, 10)
    print "- **最終stdout (tail30):**"
    print "```"
    print ENVIRON["STDOUT_TAIL"]
    print "```"
    print "- **次ミッション:** DEPLOY-RECOVER-" ENVIRON["MISSION_ID"] " (自動挿入済み)"
    done=1; next
  }
  { print }
' "$PROGRESS" > "${PROGRESS}.tmp" && mv "${PROGRESS}.tmp" "$PROGRESS"

# η' 対応: 元ミッションの STATUS を READY_FOR_DEPLOY → IN_PROGRESS に自動書戻し
awk -v mid="$MISSION_ID" '
  $0 ~ "^### " mid ":" { in_block=1 }
  in_block && /^- \*\*STATUS:\*\*[[:space:]]*READY_FOR_DEPLOY/ {
    sub(/READY_FOR_DEPLOY/, "IN_PROGRESS")
    in_block=0
  }
  in_block && /^### [A-Z0-9-]+:/ && NR>1 { in_block=0 }
  { print }
' "$PROGRESS" > "${PROGRESS}.tmp2" && mv "${PROGRESS}.tmp2" "$PROGRESS"

# DEPLOY-RECOVER 挿入（R2.1 §4.19.2 templates/deploy_recover_template.md 参照）
if [ -f templates/deploy_recover_template.md ]; then
  sed "s/{MISSION_ID}/$MISSION_ID/g; s/{TIMESTAMP}/$TIMESTAMP/g" \
    templates/deploy_recover_template.md > /tmp/deploy_recover.md
  awk '
    /^## ミッションキュー/ && !done {
      print
      print ""
      while ((getline line < "/tmp/deploy_recover.md") > 0) print line
      close("/tmp/deploy_recover.md")
      done=1; next
    }
    { print }
  ' "$PROGRESS" > "${PROGRESS}.tmp3" && mv "${PROGRESS}.tmp3" "$PROGRESS"
fi

echo "OK: DEPLOY-FAIL appended and DEPLOY-RECOVER inserted for $MISSION_ID"
```

#### γ'-8: shellcheck ゲート強化（R2.1 §4.4.5 追記）

```sh
# pre-commit 内で以下を追加実行（既設 G1 拡張 or 新設 shellcheck_lint.sh）
find scripts -type f \( -name '*.sh' \) -not -path '*/node_modules/*' | \
while IFS= read -r f; do
  # scripts/lib/*.sh と scripts/*.sh は /bin/sh 互換必須
  if head -1 "$f" | grep -q '^#!/bin/sh'; then
    shellcheck --shell=sh --severity=error "$f" || exit 1
  fi
done
```

検出対象（error 扱い）:
- SC3030: bash 配列 `${arr[@]}`
- SC3060: `${var:n:m}` 部分文字列展開
- SC2039: プロセス置換 `<(cmd)`
- SC3028: `[[ ]]` bash 拡張 test
- SC3046: `(( ))` 算術評価

---

### §2.δ' — 個別スクリプト実装バグ修正（4件）

**Target**: R2.1 §4.11.1 (mission_risk_classifier.sh), §4.9.1 (verify_external_services.sh), §5.1 (G14), §4.8.2 (proposal_log_lint.sh)

**根拠**: Golden R1 gemini_ai_ops R-002, R-004, gemini_qa R-004, gemini_solo R-003

#### δ'-1: mission_risk_classifier.sh awk 完全書き直し（形式1+形式2両対応）

```sh
#!/bin/sh
# scripts/mission_risk_classifier.sh (R2.1.1 AFTER)
. "$(cd "$(dirname "$0")" && pwd)/lib/risk_match.sh"

mission_file="$1"
[ -f "$mission_file" ] || { echo "ERROR: mission file not found: $mission_file" >&2; exit 2; }

# 形式1（>? 対象ファイル: a.js, b.js）と形式2（>? 対象ファイル:\n>  - a.js\n>  - b.js）両対応
target_files=$(awk '
  /^>?[[:space:]]*対象ファイル:/ {
    in_target=1
    line=$0
    sub(/^>?[[:space:]]*対象ファイル:[[:space:]]*/, "", line)
    if (length(line) > 0) {
      # 形式1: 1行カンマ区切り
      n=split(line, arr, /,[[:space:]]*/)
      for (i=1; i<=n; i++) {
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", arr[i])
        if (arr[i] != "") print arr[i]
      }
    }
    next
  }
  in_target && /^>?[[:space:]]*-[[:space:]]+/ {
    # 形式2: YAML 風リスト項目
    line=$0
    sub(/^>?[[:space:]]*-[[:space:]]+/, "", line)
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", line)
    print line
    next
  }
  in_target && /^$/ { in_target=0 }
  in_target && !/^>/ && !/^[[:space:]]*-/ { in_target=0 }
' "$mission_file")

[ -z "$target_files" ] && { echo "low"; exit 0; }

for f in $target_files; do
  if is_risk_path "$f" > /dev/null; then
    echo "high"; exit 0
  fi
done

echo "low"
```

#### δ'-2: verify_external_services.sh 代替証跡チェック追加（ι クラスター補完）

```sh
#!/bin/sh
# scripts/verify_external_services.sh (R2.1.1 AFTER)
MISSION_FILE="${1:-}"
[ -n "$MISSION_FILE" ] || { echo "Usage: $0 <mission-file>" >&2; exit 2; }

MISSION_RISK=$(scripts/mission_risk_classifier.sh "$MISSION_FILE")
MISSION_ID=$(grep -m1 '^### [A-Z0-9-]\+:' "$MISSION_FILE" | sed -E 's/^### ([A-Z0-9-]+):.*/\1/')

check_alternative_proof() {
  # 代替証跡1: evidence/$MISSION_ID/local-emu-proof.json
  [ -f "evidence/$MISSION_ID/local-emu-proof.json" ] && { echo "local-emu-proof"; return 0; }
  # 代替証跡2: evidence/$MISSION_ID/screenshots/*.png
  ls "evidence/$MISSION_ID/screenshots/"*.png 2>/dev/null | head -1 > /dev/null && { echo "screenshots"; return 0; }
  # 代替証跡3: session_progress.md 内の 【代替証跡】行
  grep -q "【代替証跡】" instructions/session_progress.md 2>/dev/null && { echo "progress-declared"; return 0; }
  return 1
}

if ! wrangler whoami > /dev/null 2>&1; then
  if [ "$MISSION_RISK" = "high" ]; then
    # δ'-2 対応: 代替証跡があれば exit 0
    if proof_type=$(check_alternative_proof); then
      echo "OK: wrangler not authenticated BUT alternative proof found ($proof_type)"
      exit 0
    fi
    cat >&2 <<EOF
FAIL: wrangler not authenticated AND no alternative proof found
  required one of:
    1. wrangler login
    2. evidence/$MISSION_ID/local-emu-proof.json
    3. evidence/$MISSION_ID/screenshots/*.png
    4. 【代替証跡】line in session_progress.md (format: 【代替証跡】<対象> を検証: <結果> (<日時>))
EOF
    exit 1
  else
    echo "WARN: wrangler not authenticated (low/mid-risk mission, manual verification acceptable)"
    exit 0
  fi
fi

if [ "$MISSION_RISK" = "high" ]; then
  if ! supabase status > /dev/null 2>&1; then
    if ! check_alternative_proof > /dev/null; then
      echo "FAIL: supabase CLI not initialized AND no alternative proof for high-risk mission" >&2
      exit 1
    fi
    echo "OK: supabase not initialized BUT alternative proof found"
  fi
fi

exit 0
```

#### δ'-3: G14 (spec_first_lint.sh) awk next バグ修正 + κ' 正規表現緩和

```sh
#!/bin/sh
# scripts/spec_first_lint.sh (R2.1.1 AFTER)
PROGRESS="${1:-instructions/session_progress.md}"
[ -f "$PROGRESS" ] || { echo "FAIL: G14 progress file not found"; exit 1; }

result=$(awk '
  /^### [A-Z0-9-]+:/ {
    # delta-3 対応: 新ミッション検出時、前のミッションの検証を先に実施
    if (in_mission) {
      if (!has_ref) {
        print "FAIL: G14 no spec reference: " mission
        fail_count++
      }
    }
    mission=$0
    in_mission=1
    has_ref=0
    next
  }
  # kappa 対応: 正規表現を緩和 docs/.*\.md|lais/verify/.*\.md
  in_mission && /参照:.*(docs\/.*\.md|lais\/verify\/.*\.md)/ { has_ref=1 }
  END {
    if (in_mission && !has_ref) {
      print "FAIL: G14 no spec reference: " mission
      fail_count++
    }
    exit (fail_count > 0 ? 1 : 0)
  }
' "$PROGRESS")

if [ -n "$result" ]; then
  echo "$result"
  exit 1
fi
echo "OK: G14 spec-first check passed"
```

#### δ'-4: proposal_log_lint.sh にファイル書換えロジック追加（θ クラスター補完）

```sh
#!/bin/sh
# scripts/proposal_log_lint.sh (R2.1.1 AFTER)
THRESHOLD_DAYS="${PROPOSAL_STALE_DAYS:-7}"
PROGRESS="${1:-instructions/session_progress.md}"
[ -f "$PROGRESS" ] || { echo "ERROR: file not found: $PROGRESS" >&2; exit 2; }

date_to_epoch() {
  d="$1"
  if epoch=$(date -j -f "%Y-%m-%d" "$d" +%s 2>/dev/null); then
    echo "$epoch"; return 0
  fi
  if epoch=$(date -d "$d" +%s 2>/dev/null); then
    echo "$epoch"; return 0
  fi
  return 1
}

NOW=$(date +%s)
STALE_COUNT=0
TMP=$(mktemp)
cp "$PROGRESS" "$TMP"

# delta-4 対応: subshell 変数汚染回避のため一時ファイル経由で処理
TMP_LINES=$(mktemp)
grep -nE '^### .+ \([0-9]{4}-[0-9]{2}-[0-9]{2} G_[0-9]+\)' "$PROGRESS" > "$TMP_LINES" || true
while IFS=: read -r lineno line; do
  [ -z "$lineno" ] && continue
  proposal_date=$(echo "$line" | sed -nE 's/.*\(([0-9]{4}-[0-9]{2}-[0-9]{2}) G_[0-9]+\).*/\1/p')
  [ -z "$proposal_date" ] && continue
  proposal_epoch=$(date_to_epoch "$proposal_date") || continue
  days=$(( (NOW - proposal_epoch) / 86400 ))

  # 次の15行以内に STATUS: SUGGESTED/WAITING_PO があるか確認
  has_open_status=$(sed -n "${lineno},$((lineno+15))p" "$PROGRESS" | \
    grep -cE 'STATUS:[[:space:]]*(SUGGESTED|WAITING_PO)' || true)
  [ "$has_open_status" -eq 0 ] && continue

  # delta-4 対応: 滞留日数を awk でインプレース更新（外部から date を渡し strftime 使わず）
  block_end=$((lineno + 15))
  TODAY=$(date +%Y-%m-%d)
  awk -v ln="$lineno" -v be="$block_end" -v d="$days" -v today="$TODAY" '
    NR >= ln && NR <= be && /^- \*\*滞留日数:\*\*/ {
      sub(/:\*\*[[:space:]]*.*$/, ":** " d "日 (auto-updated " today ")")
    }
    { print }
  ' "$TMP" > "${TMP}.new" && mv "${TMP}.new" "$TMP"

  if [ "$days" -ge "$THRESHOLD_DAYS" ]; then
    echo "STALE (${days}d): L${lineno} $line"
    STALE_COUNT=$((STALE_COUNT + 1))
  fi
done < "$TMP_LINES"
rm -f "$TMP_LINES"

# 書換え済み TMP を PROGRESS に反映
cp "$TMP" "$PROGRESS"
rm -f "$TMP"

if [ "$STALE_COUNT" -gt 0 ]; then
  echo "WARN: $STALE_COUNT stale proposals detected (threshold: ${THRESHOLD_DAYS}d)"
fi
exit 0
```

---

### §2.ε' — Hフロー/デプロイゲート欠陥修正（3件）

**Target**: R2.1 §4.5.2 (deploy.sh hflow exit 1), §6.10 (deploy.sh 連鎖更新欠落), §4.5.1 (hflow main 直push)

**根拠**: Golden R1 gemini_ai_ops R-001（γ'-7 と同一、deploy.sh 完全パッチで対応）, gemini_devops R-007, gemini_solo R-004

#### ε'-1 + ε'-2: deploy.sh 完全パッチ（R2.1 §6.10 への追加）

```sh
#!/bin/sh
# scripts/deploy.sh — R2.1.1 完全版（連鎖更新で書き込み）
set -e

MISSION_ID="${1:-$(grep -m1 '^### [A-Z0-9-]\+:' instructions/session_progress.md | sed -E 's/^### ([A-Z0-9-]+):.*/\1/')}"
[ -n "$MISSION_ID" ] || { echo "ERROR: MISSION_ID not provided"; exit 1; }
export MISSION_ID

# --- pre-deploy gates ---
# G16: commit SHA 埋込検証（α クラスター）
scripts/deploy_hash_verify.sh dist || { echo "FAIL: G16"; exit 1; }

# Hフロー発火判定（ε' 対応）
HFLOW_CONTEXT=deploy scripts/hflow_trigger_check.sh > /tmp/hflow.txt
if grep -q 'HFLOW_TRIGGER=1' /tmp/hflow.txt; then
  if [ "$HFLOW_APPROVED" != "1" ]; then
    echo "[hflow] triggered. Run 統合フローレビュー before deploy."
    echo "[hflow] 再実行: HFLOW_APPROVED=1 scripts/deploy.sh $MISSION_ID"
    exit 1
  fi
  echo "[hflow] approved by HFLOW_APPROVED=1, proceeding deploy"
fi

# STATUS 検証（η' 対応）
MISSION_RISK=$(scripts/mission_risk_classifier.sh "instructions/session_progress.md" || echo "low")
if [ "$MISSION_RISK" = "high" ]; then
  status=$(awk "/^### $MISSION_ID:/,/^### [A-Z]/" instructions/session_progress.md | \
    grep -E '^- \*\*STATUS:\*\*' | head -1 | sed -E 's/.*STATUS:\*\*[[:space:]]*//' | awk '{print $1}')
  if [ "$status" != "READY_FOR_DEPLOY" ]; then
    echo "FAIL: high-risk mission $MISSION_ID must be READY_FOR_DEPLOY (current: $status)"
    echo "  cmd-unit + cmd-e2e PASS を先に実行してください"
    exit 1
  fi
fi

# --- deploy 実行 ---
echo "[deploy] starting $MISSION_ID at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
mkdir -p logs
deploy_stdout=$(mktemp)
npx wrangler pages deploy dist --project-name="${CF_PROJECT:-myproject}" > "$deploy_stdout" 2>&1
deploy_rc=$?
cat "$deploy_stdout"
if [ "$deploy_rc" -ne 0 ]; then
  tail=$(tail -30 "$deploy_stdout")
  scripts/append_deploy_fail.sh "$MISSION_ID" "$tail"
  rm -f "$deploy_stdout"
  exit 1
fi
rm -f "$deploy_stdout"

# --- post-deploy ---
URL=$(wrangler pages deployment list --project-name="${CF_PROJECT:-myproject}" --json 2>/dev/null | \
  jq -r '.[0].url' 2>/dev/null || echo "")
if [ -n "$URL" ]; then
  # Step 8: hash ポーリング（α クラスター）
  scripts/deploy_poll_hash.sh "$URL" "$(git rev-parse HEAD)" || { echo "FAIL: hash poll"; exit 1; }
fi

# logs/deploy.log 記録（β'-3 対応）
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) DEPLOY-OK $MISSION_ID" >> logs/deploy.log

# 高リスク系: L1-realworld + G17
if [ "$MISSION_RISK" = "high" ]; then
  # ζ' 5操作スモーク
  if ! MISSION_ID="$MISSION_ID" npx playwright test --config=playwright.realworld.config.ts; then
    scripts/append_deploy_fail.sh "$MISSION_ID" "realworld L1 smoke failed"
    exit 1
  fi
  # G17: realworld 証跡検証
  scripts/realworld_proof_check.sh "$MISSION_ID" || { echo "FAIL: G17"; exit 1; }

  # η' 対応: STATUS: READY_FOR_DEPLOY → DONE 自動書換え
  sed -i.bak -E "/^### $MISSION_ID:/,/^### /{
    s/^(- \*\*STATUS:\*\*)[[:space:]]*READY_FOR_DEPLOY/\1 DONE/
  }" instructions/session_progress.md
  rm -f instructions/session_progress.md.bak
fi

echo "[deploy] $MISSION_ID DONE"
```

#### ε'-3: hflow_trigger_check.sh main 直 push 対応

```sh
#!/bin/sh
# scripts/hflow_trigger_check.sh (R2.1.1 AFTER、ε'-3 対応)
. "$(cd "$(dirname "$0")" && pwd)/lib/risk_match.sh"

CONTEXT="${HFLOW_CONTEXT:-auto}"

get_changed_files() {
  ctx="$1"
  case "$ctx" in
    pre-commit)
      git diff --cached --name-only
      ;;
    pre-push|deploy)
      base=$(git merge-base origin/main HEAD 2>/dev/null)
      head_sha=$(git rev-parse HEAD)
      # ε'-3 対応: main 直 push / base==HEAD の場合のフォールバック
      if [ -z "$base" ] || [ "$base" = "$head_sha" ]; then
        # pre-push 文脈: stdin から push 範囲を取得
        if [ -n "$GIT_PUSH_REMOTE_SHA" ] && [ "$GIT_PUSH_REMOTE_SHA" != "0000000000000000000000000000000000000000" ]; then
          base="$GIT_PUSH_REMOTE_SHA"
        else
          # 新ブランチ push / 初回コミットの場合: 直近1コミット
          base="HEAD~1"
        fi
      fi
      git diff --name-only "$base"...HEAD 2>/dev/null || git diff --name-only HEAD
      ;;
    auto)
      if [ -n "$GIT_INDEX_FILE" ]; then
        get_changed_files pre-commit
      else
        get_changed_files pre-push
      fi
      ;;
    *)
      echo "ERROR: unknown CONTEXT '$ctx'" >&2; return 2 ;;
  esac
}

changed=$(get_changed_files "$CONTEXT") || exit $?

if [ -z "$changed" ]; then
  echo "HFLOW_TRIGGER=0 context=$CONTEXT no_changes"
  exit 0
fi

for f in $changed; do
  if is_risk_path "$f" > /dev/null 2>&1; then
    echo "HFLOW_TRIGGER=1 context=$CONTEXT matched=$f"
    exit 0
  fi
done

echo "HFLOW_TRIGGER=0 context=$CONTEXT no_match"
exit 0
```

pre-push フック側で以下を追加:
```sh
# .git/hooks/pre-push (抜粋)
while read local_ref local_sha remote_ref remote_sha; do
  export GIT_PUSH_REMOTE_SHA="$remote_sha"
  HFLOW_CONTEXT=pre-push scripts/hflow_trigger_check.sh
done
```

---

### §2.ζ' — L1スモーク定義 SSOT 化 + G17 5操作拡張

**Target**: R2.1 §4.2.3 (L1 定義), §4.2.2 (L1/L2/L3 層名衝突), §5.4 (G17 4操作), development_rules.md 連鎖 (§6.8)

**根拠**: Golden R1 gpt54_qa R-001, gemini_qa R-001

#### ζ'-1: L1スモーク SSOT 5項目表（R2.1 §4.2.3 に以下で置換）

```markdown
### §4.2.3 L1-realworld スモーク SSOT 定義（5項目、全高リスクデプロイで必須）

| # | 項目 | 内容 | 認証ミッション時の必須度 | 決済ミッション時の必須度 |
|---|---|---|---|---|
| L1-1 | 起動 / 到達性 | アプリURL到達、初期画面レンダリング | 必須 | 必須 |
| L1-2 | 認証 / セッション復元 | ログイン または 既存セッション認証状態確認 | **必須（変更対象機能）** | 必須 |
| L1-3 | 主機能 1 | タスク追加、投稿作成等のCRUD主要操作 | 必須 | 必須 |
| L1-4 | 主機能 2 / 外部API | タスク編集、AI送受信、決済、外部API 呼出 | 必須 | **必須（変更対象機能）** |
| L1-5 | 永続化 / リロード | データ永続化確認、リロード後の状態保持 | 必須 | 必須 |

**ルール:**
- 全高リスク系ミッションで 5 項目必須
- 項目の実装はアプリ固有のため tests/realworld/ 配下で @realworld タグ付きで実装
- G17 スクショ要件も 5 項目分（launch / auth / primary1 / primary2_or_api / reload）

**development_rules.md / dev_system_spec §4.2.3 / R2.1.1 §2.β' G17 実装 はこの SSOT に従う**。
```

#### ζ'-2: L1/L2/L3 層名衝突解消（R2.1 §4.2.2 の証跡ファイル表修正）

```markdown
### §4.2.2 証跡ファイル表（R2.1.1 差替）

| 証跡種別 | ファイル名 | 対象ゲート | 必須条件 |
|---|---|---|---|
| unit 証跡 | evidence/<MID>/before-unit.json, after-unit.json | G8 | RED→GREEN 遷移 |
| e2e 証跡 | evidence/<MID>/before-e2e.json, after-e2e.json | G8 | RED→GREEN 遷移 |
| realworld 証跡 | evidence/<MID>/realworld-proof.json + realworld-screenshots/{launch,auth,primary1,primary2_or_api,reload}.* | G17（新設） | RED 不要、デプロイ後の実機検証 |

**注記**: 従来の「L1-unit / L2-e2e / L3-realworld」という層プレフィックスは、3層テスト戦略（L1=スモーク / L2=影響範囲 / L3=フル）の L1-L3 用語と衝突するため**削除**。証跡種別は層プレフィックスを付けず `unit 証跡 / e2e 証跡 / realworld 証跡` と呼ぶ。
```

#### ζ'-3: development_rules.md 連鎖（§6.8 追加）

`development_rules.md` の L1 定義を §4.2.3 SSOT と完全一致させる。既存の「起動/タスク追加/タスク編集保存/AI送信応答/プロフィール保存リロード残存」等の App 固有記述は §4.2.3 の抽象枠組みに合わせて書き換える:
- L1-1 起動/到達性 = 「アプリが表示される」
- L1-2 認証/セッション復元 = 「ログイン成功 or 既存セッション復元」
- L1-3 主機能1 = 「タスク追加」（アプリ固有に置換）
- L1-4 主機能2/外部API = 「AI 送受信」（アプリ固有に置換）
- L1-5 永続化/リロード = 「リロード後もデータが残る」

---

### §2.η' — STATUS 遷移 全自動化

**Target**: R2.1 §4.7.1, §4.7.2, §4.19.4, §4.19.1

**根拠**: Golden R1 gemini_solo R-008, gemini_tech_writer R-003

**R2.1.1 確定: STATUS 遷移は全自動化**（手動遷移禁止）

```markdown
### §4.7.1 STATUS 遷移ルール（R2.1.1 AFTER）

ミッション STATUS の遷移はすべて**スクリプト経由で自動**。ENG の手動書換えは禁止。

| 遷移 | 書換え主体 | トリガー |
|---|---|---|
| (init) → IN_PROGRESS | ENG または session_progress.md 作成時 | ミッション定義記述時 |
| IN_PROGRESS → READY_FOR_DEPLOY | canopy_common.sh::check_test_pass | 高リスク系で cmd-unit + cmd-e2e PASS 時（check_test_pass 内で sed 書換え） |
| READY_FOR_DEPLOY → DONE | deploy.sh | deploy 成功 + G17 PASS 時（deploy.sh 末尾で sed 書換え） |
| READY_FOR_DEPLOY → IN_PROGRESS | append_deploy_fail.sh | deploy 失敗時（§2.γ'-7 参照） |
| IN_PROGRESS → DONE（低/中リスク） | canopy_common.sh::check_test_pass | 低リスク: cmd-unit PASS / 中リスク: cmd-unit + cmd-e2e PASS |

**pre-deploy ゲートで STATUS 検証**（ε'-1 パッチで deploy.sh 冒頭に組込済み）:
- 高リスク系ミッションで STATUS != READY_FOR_DEPLOY ならデプロイ拒否
- これにより「ENG が遷移を忘れた」状態での誤デプロイを防止
```

canopy_common.sh::check_test_pass の STATUS 自動書換え実装:
```sh
# canopy_common.sh 抜粋
check_test_pass() {
  local mission_id="$1"
  # ... テスト実行と PASS 判定 ...
  if [ "$tests_passed" -eq 1 ]; then
    # η' 対応: STATUS 自動遷移
    local risk=$(scripts/mission_risk_classifier.sh "instructions/session_progress.md" || echo "low")
    local target_status
    case "$risk" in
      high)
        # 高リスク: e2e 完了で READY_FOR_DEPLOY
        target_status="READY_FOR_DEPLOY"
        ;;
      *)
        # 低/中リスク: 完了で DONE
        target_status="DONE"
        ;;
    esac
    sed -i.bak -E "/^### $mission_id:/,/^### /{
      s/^(- \*\*STATUS:\*\*)[[:space:]]*IN_PROGRESS/\1 $target_status/
    }" instructions/session_progress.md
    rm -f instructions/session_progress.md.bak
    echo "STATUS auto-updated: $mission_id → $target_status"
  fi
}
```

---

### §2.θ' — mission_template_v3.md cmd-unit/cmd-e2e/cmd-realworld 3区分化

**Target**: R2.1 §6.9（templates/mission_template_v3.md 連鎖更新）

**根拠**: Golden R1 gemini_solo R-002

**R2.1 §6.9 templates/mission_template_v3.md 修正指示（R2.1.1 AFTER）**:

```markdown
## templates/mission_template_v3.md の連鎖更新内容

### 完了コマンド欄の仕様（R2.1.1 で厳格化）

```markdown
### MISSION-ID: タイトル
> リスク: 🟢低 / 🟡中 / 🔴高
> 参照: docs/xxx.md, docs/plans/yyy.md
> 対象ファイル: src/xxx.js, src/yyy.ts

**目的:** 1行で記述

**プリフライト:**
  wc -l docs/xxx.md    # 参照ファイル存在確認

**完了コマンド（リスク別3区分、R2.1.1 厳格化）:**
  cmd-unit: <bash command | N/A（理由: ネイティブアプリで対象外）| SKIP（理由 + リトライ予定）>
  cmd-e2e: <bash command | N/A（理由: ...）| SKIP（理由 + リトライ予定）>
  cmd-realworld: <bash command | N/A（理由: ...）| SKIP（理由 + リトライ予定）>

**FAIL条件:** 具体的な失敗判定
**完了報告:** MISSION-ID: XX/YYY PASS, ZZ FAIL（3区分別に記述）

**リスク別必須度（§4.4.3 参照）:**
- 低: cmd-unit 必須 / cmd-e2e,realworld は N/A可
- 中: cmd-unit, cmd-e2e 必須 / cmd-realworld は N/A可（理由必須）
- 高: 3区分すべて必須、N/A 不可。WARN は代替証跡（§4.9.3）がある場合のみ
```

旧 `cmd1:` 形式は削除。`cmd-unit / cmd-e2e / cmd-realworld` の3行構成必須。
```

---

### §2.ι' — pre-commit プロジェクト名ハードコード解消

**Target**: R2.1 §4.10.1（親 pre-commit 実装例）

**根拠**: Golden R1 gemini_solo R-007

**R2.1.1 AFTER（.git/hooks/pre-commit 該当部分）**:

```sh
# .git/hooks/pre-commit 抜粋

# 旧: for SUBDIR_ROOT in lais goal-ai-worker; do ... done（ハードコード）
# 新: dev-system.yaml から動的取得 or 動的探索

# 方式1（推奨）: dev-system.yaml で定義
if [ -f dev-system.yaml ]; then
  # subdirs: セクションから各サブディレクトリを抽出
  SUBDIRS=$(awk '/^subdirs:/{flag=1;next}/^[^ ]/{flag=0}flag&&/^  - /{sub(/^  - /,"");print}' dev-system.yaml)
  for SUBDIR_ROOT in $SUBDIRS; do
    HOOK_SUB="$SUBDIR_ROOT/scripts/pre-commit-sub.sh"
    if [ -x "$HOOK_SUB" ]; then
      (cd "$SUBDIR_ROOT" && ./scripts/pre-commit-sub.sh) || exit $?
    fi
  done
fi

# 方式2（フォールバック）: 動的探索（dev-system.yaml なしの場合）
if [ ! -f dev-system.yaml ]; then
  find . -mindepth 2 -maxdepth 4 -type f -name 'pre-commit-sub.sh' -perm -u+x 2>/dev/null | \
  while IFS= read -r hook_sub; do
    subdir_root=$(dirname "$(dirname "$hook_sub")")
    (cd "$subdir_root" && ./scripts/pre-commit-sub.sh) || exit $?
  done
fi
```

**dev-system.yaml テンプレ（templates/ に新規追加、§6.9 に指示）**:
```yaml
# dev-system.yaml - プロジェクトごとに配置
version: "3.4"
subdirs:
  - lais
  - goal-ai-worker
# 将来追加プロジェクトはここに行を追加
# - new-project-name
```

---

### §2.κ' — G14 正規表現緩和（δ'-3 と統合済み）

§2.δ'-3 の G14 実装サンプルで `docs/.*\.md|lais/verify/.*\.md` に緩和済み。本節は参照のみ。

---

### §2.λ' — G17 スクショ 5操作化（ζ' と統合済み）

§2.β' の G17 実装サンプル + §2.ζ'-1 の L1 SSOT 5項目表で既に反映。本節は参照のみ。認証ミッション時は auth.png が必須となる（ζ' L1-2 必須性）。

---

### §2.μ' — ADV書込可拡張の取り下げ（PD-108 却下）

**Target**: R2.1 §4.16.1, §4.16.2

**根拠**: Golden R1 gpt54_ai_ops R-001

**PO判定: A案採用 = PD-108 却下**。詳細は本R2.1.1 §4 と po-decisions.md PD-108 参照。

**R2.1 §4.16.1 AFTER（sub_adv_protocol.md §1 連鎖更新指示）**:

```markdown
### §4.16.1 sub_adv_protocol.md §1 書き込みホワイトリスト（R2.1.1 修正版）

**AFTER（R2.1.1、PD-108 却下反映）**:
- **書き込み可**: docs/**, instructions/**, lais/verify/**.md, lais/instructions/**.md, **templates/\*\*（新規追加のみ採用）**
- **書き込み不可**（明示列挙）: src/**, tests/**, supabase/**, *.config.{ts,js}, package.json, wrangler.toml, .env, .dev.vars, **scripts/\*\* 全体（PD-108 で却下）**

**ADVの立ち位置**:
- 実装サンプル（bash/sh/ts）は R2.1 等の設計文書内で提示可
- 実ファイル `scripts/**` への書込は ENG 専任
- lint スクリプトの雛形は設計文書の「実装サンプル」として示し、実ファイル作成は ENG ミッションで行う
```

**R2.1 §4.16.2 AFTER（"scripts/*実装*.js" 曖昧用語削除）**:
この部分は R2.1 のまま有効（曖昧用語削除 = 元々の π クラスター対応）。本R2.1.1 では変更なし。

---

### §2.ξ' — G8 AFTER タイポ修正

**Target**: R2.1 §4.2.1

**根拠**: Golden R1 gpt54_tech_writer R-001

**R2.1 §4.2.1 G8 定義修正（R2.1.1 AFTER、1文修正）**:

```markdown
### §4.2.1 §4.8 G8 定義の修正

**AFTER（R2.1.1 で誤記訂正）**:
> G8 = TDD証跡（unit/e2e 限定）。**realworld は G8 対象外で、G17 で検証する**
```

（旧 R2.1 では「realworld は G17 対象外」と誤記されていた。ξ' により訂正）

---

### §2.25 — ADVcrit クラスター（PATCH-18 / R3-ADV-01、ADV 行動規範の仕様化）

**Target**: dev_system_spec.md / 新設クラスター（§2.24 の直後、§4 の直前）

**根拠**: ふとし指摘（2026-04-22 G_47）+ ADV 違反ログ #1〜#5（`lais/verify/adv_violation_log.md`）+ §7.3 CRITICAL「Howの欠落」

**位置づけ**: ADV（Claude.ai / Desktop Code ADV）の最上位行動規範。`bootstrap.md` / `development_rules.md` の断片的記述を仕様書本体に集約し、機械的再発防止を実現する SSOT。

#### §2.25.1 仕様書駆動原則（非交渉）

仕様書（dev_system_spec.md / sub_*.md / docs/po-decisions.md）に記載されている事項は、ADV の質問・承認要求の対象外。

- 仕様書記載事項 → そのまま遂行（PO 確認不要）
- 仕様書未記載事項のみ → PO 協議または 3ペルソナ合議
- 「念のため確認」は禁止（非交渉原則の根幹）

例:
- session_progress.md 300行制限超過時の archive 動作 → §15.6 / §16.2 記載 → 自律実行
- ADV 書込可ファイル外への書込 → §C6.1 / development_rules.md 記載 → 不可（質問せず拒否）
- 新ミッション着手前の前ミッション完了確認 → §C2 / §C3.2 記載 → 自律実行

#### §2.25.2 応答前 Self-Check（毎回必須）

ADV は応答生成前に以下のチェックを通過しなければならない（`/adv-check` skill で機械化）。

1. **判断要求の grep 検出**: 「どうしますか」「進めて良いですか」「確認してください」等の構文を返答内に含むか確認
2. **仕様書根拠の明示**: 提案・実行する全行動について `§NNN` または `PD-NNN` を引用
3. **既決定との整合**: po-decisions.md と矛盾する提案でないか確認
4. **rules 違反検出**: development_rules.md C1-C20 / G1-G17 への違反でないか確認
5. **冗長な状況報告の除去**: 「いま X しました。次に Y します」等の手順実況を削除

不通過 → 応答生成を中断、自己訂正 or §2.25.5 違反自己申告。

#### §2.25.3 PO 判断必須事項の限定

ADV が PO に判断を仰ぐべき事項は以下 3 種に限定（他は 3 ペルソナ合議）。

1. **コスト影響**: 月額コスト変動 ≥ ¥500 の選択肢
2. **新プロセス**: 既存フロー外の新規業務プロセス導入
3. **ブランド変更**: プロダクト名・ドメイン・配色等のブランド要素変更

それ以外（実装方式選択 / レビュー観点 / リファクタリング判断 / API 失敗時の対応等）は ADV の責任で 3 ペルソナ合議の上、ADV 独立判断で実行。

#### §2.25.4 リスク回避の禁止

「リスク 0 の進め方」を提案・選択することは **禁止**。

- リスクは制御するもので、回避するものではない
- ルールを逸脱して「安全側の役割差し戻し」を提案することは禁止（違反 #4 該当）
- リスクが高い場合 → §2.25.3 PO 判断必須事項に該当しなければ、対策案 + 検証手順を含めて自律実行

#### §2.25.5 違反自己申告義務

ADV が §2.25.1〜§2.25.4 のいずれかに違反した場合、以下の手順で即時自己申告する。

1. `lais/verify/adv_violation_log.md` に違反エントリを追記（日時 / 違反 # / 違反内容 / 根拠 §2.25.X / 是正措置）
2. 直近の応答内で違反を明示し、是正措置を提示
3. 違反隠蔽 = 二重違反として §C6.1 で扱う

#### §2.25.6 応答スタイル

- 端的・簡潔第一。冗長な状況報告省略
- 「現在 X を実行中です」「次に Y を行います」等の手順実況禁止
- 結論 → 根拠（§参照）→ 必要なら詳細補足、の順で記述
- 冗長応答 = 違反 #5 として自己申告対象

#### §2.25.7 勝手な命名・既成事実化の禁止

仕様書未定義の名称（version 名、ミッション名、フロー名等）を ADV 独断で命名することは禁止。

- 違反 #1 例: 「R2.2」を仕様書未定義のまま ADV が独断使用 → 既成事実化
- 是正: 命名が必要な場合 → PO 協議 or §2.25.3 該当判定で 3 ペルソナ合議
- 既存命名規則がある場合（PD-NNN / MISSION-ID / G_NN 等）→ 規則に従い派生命名

#### §2.25.8 違反ログと §2.25 の対応表

| 違反 # | 違反内容 | 根拠 §2.25.X |
|---|---|---|
| 違反 #1 | R2.2 不変更の独断追加（勝手な命名） | §2.25.7 |
| 違反 #2 | 仕様書記載事項の確認質問 | §2.25.1 |
| 違反 #3 | API 失敗対応の PO 委譲（PO 判断必須事項外） | §2.25.3 |
| 違反 #4 | リスク回避での役割差し戻し提案 | §2.25.4 |
| 違反 #5 | 冗長な状況報告（「現在 X 実行中、次に Y」） | §2.25.6 |

各違反の詳細は `lais/verify/adv_violation_log.md` を参照。

---

### §2.26 — STATUScrit クラスター（PATCH-12 / R3-H-07、STATUS_CORRECTION プロトコル）

**Target**: dev_system_spec.md / 新設クラスター（§2.25 の直後、§4 の直前）

**根拠**: R1 triage R3-H-07（ai_ops 両モデル合意度 2/10 HIGH）+ §7.3 「Howの欠落 + PD-109 の実装不備」

**位置づけ**: PD-109 STATUS 5状態モデルの拡張規定。AI 誤判定後の逆方向遷移を ADV/PO 限定 + 監査ログ付き例外として定義。新規 STATUS は追加せず、既存 5状態モデルは不変。

#### §2.26.1 STATUS_CORRECTION プロトコル

`canopy_common.sh::correct_status` 関数経由で逆方向遷移を実行する。

```sh
correct_status <MISSION_ID> <FROM_STATUS> <TO_STATUS> <REASON> <caller_role>
```

- **caller_role**: ADV / PO のみ（ENG は関数内 exit 1。多重防衛）
- **許容遷移 4 種**:
  1. DONE → READY_FOR_DEPLOY
  2. DONE → IN_PROGRESS
  3. READY_FOR_DEPLOY → IN_PROGRESS
  4. IN_PROGRESS → QUEUED
- **BLOCKED への correct_status 禁止**（BLOCKED は正規例外遷移のため誤判定対象外）

#### §2.26.2 監査ログ

`instructions/status_corrections.log` に TAB 区切り 7 列で追記。

| 列 | 内容 |
|---|---|
| 1 | date（ISO 8601 / UTC） |
| 2 | mission_id |
| 3 | from_status |
| 4 | to_status |
| 5 | caller_role（ADV / PO） |
| 6 | commit_sha（HEAD） |
| 7 | reason（自由記述） |

`changed-files-allowlist.sh` で **ADV 書込可 / ENG 書込不可** に設定（CHAIN-UPDATE-DISPATCH PART2 で配線）。

#### §2.26.3 deploy.sh Step 0 通知

deploy.sh Step 0（MISSION_ID 解決）で、対象 mission_id について直近 1 時間以内に status_corrections が記録されている場合、stderr に通知（中断はしない）。

```
[NOTICE] STATUS_CORRECTION detected within 1h: <mission_id> <from> -> <to> (by <caller_role>)
```

#### §2.26.4 PD-109 拡張（ADV エスカレーション回答）

- PD-109 本文「BLOCKED 以外の STATUS 手動書換え禁止」は **ENG 主体**の禁止規定
- STATUS_CORRECTION は **ADV / PO 主体** の監査付き例外であり、PD-109 趣旨（ENG 自律書換え禁止）と矛盾しない
- ADV エスカレーション不要、3 ペルソナ合議で採用可と判定（QA 内部整合確認済）

---

## §3. §C0-C6 設計（F-1 マッピング詳細）

### 3.1 §C0 起動時要約（推定 80行）

**位置**: dev_system_spec.md **新§21「共通規範集（起動時要約版）」§21.0** に配置

**内容構成**:
```markdown
## §21. 共通規範集（起動時要約版）

### §C0（§21.0） 起動時要約（毎セッション必須Read）

**本章の位置づけ**: ENG/ADV が毎セッション起動時に Read すべき 1ページ要約。§C1-C6 の本質を80行に圧縮。
詳細は §C1-C6（§21.1-§21.6）または既存 §1-§20 を参照。

#### §C0.1 責務分担（PD-104/105/106/107 抜粋）
- ふとし（PO）: 承認のみ（ビジネス判断・仕様承認）
- ADV（Claude.ai）: 仕様設計・ミッション定義・DC書込（docs/**, instructions/**, templates/**, lais/verify/**）
- ENG（Claude Code）: 実装・テスト・デプロイ・scripts/** 全体の書込

#### §C0.2 必須Read 役割別（PD-104 + PD-107 適用）
- ENG: §C0 + CLAUDE.md + development_rules.md + session_progress.md（約400行）
- ADV: 上記 + docs/po-decisions.md 直近10件（約500行）
- §C1-C6 全文 / §1-§20 該当章: フロー Step 0 で指示された場合のみ

#### §C0.3 鉄則トップ5（§C1 / §3 詳細参照）
1. コピペゼロ（DC経由リポジトリ直接書込）
2. G1-G17 全ゲート必須（pre-commit / pre-push / pre-deploy / post-deploy / Stage A）
3. 完了コマンド3区分は高リスク系（認証・決済・外部API）で必須（PD-105）
4. Hフロー発火は git diff による機械判定（PD-106）
5. 提案ログに記録→キュー空時に自律修正（C11 バグ対応フロー）

#### §C0.4 G1-G17 ゲート一覧（§C3 / §4 詳細参照）
G1 バージョン同期 / G2 Stage A / G3 テスト数 / G4 全PASS / G5 報告 / G6 デプロイ /
G7 仕様↔完了対応 / G8 TDD(unit/e2e) / G9 UI / G10 シークレット /
G11 Step0 / G12 提案ログ / G13 フック発火 / G14 仕様ファースト /
G15 TDD同期 / G16 hash埋込 / G17 realworld

#### §C0.5 3状態 STATUS モデル（§C3 参照）
IN_PROGRESS → [高リスク: READY_FOR_DEPLOY →] DONE
STATUS 遷移は全自動（canopy_common.sh / deploy.sh / append_deploy_fail.sh が sed で書換え）

#### §C0.6 証跡SSOTパス
evidence/<MISSION_ID>/before-{unit,e2e}.json, after-{unit,e2e}.json, realworld-proof.json
realworld-screenshots/{launch,auth,primary1,primary2_or_api,reload}.*

#### §C0.7 PD一覧（§C5 / §6 参照）
PD-001〜008（既決定）+ PD-101〜103（既決定）+ PD-104〜107（dev-system v3.4）+ PD-108（却下: ADV書込可拡張）

#### §C0.8 フロー→参照§C マップ（§C2 参照）
フローA 実装: §C1 + §C3 / フローB デザインR: §C4 / フローC 仕様R: §C5 + §C6
フローD ソロ回転: §C1 + §C2 / フローE 棚卸し: §C2 + §C6 / フローF AIレビュー: §C5 + §C6
フローG canopy: §C1 + §C3 / フローH 統合フロー: §C4 + §C5（PD-106 機械発火）
```

### 3.2 §C1 設計原則 & 鉄則（推定 50行）

**位置**: §21.1 / 既存 §1（33行）+ §3（15鉄則、31行）から要約

**構成**:
```markdown
### §C1（§21.1） 設計原則 & 鉄則

#### §C1.1 設計原則（§1 要約）
- 品質最優先（スピード優先不可）
- 自動化最大（手動作業最小化）
- コピペゼロ（DC経由書込）
- ナレッジは docs/ に一元管理

#### §C1.2 鉄則15個（§3 要約、1行ずつ）
1. ADV はコードを書かない（PD-108 で確認）
2. テストファースト（G8）
3. 仕様書ファースト（G14）
4. バージョン同期（G1）
5. Stage A 全パス（G2-G5）
6. 報告フォーマット（G5）
7. G番号体系維持（リユース禁止）
8. シークレット保護（G10）
9. 提案ログ即時記録
10. PO承認は独立（コード書かない）
11. バグ即修正 or 提案ログ
12. 棚卸し5セッションごと
13. 滞留日数警告（G12）
14. 修正試行3回制限
15. ホットフィックスパスのみ自律可

**§3 鉄則 → §C1 マッピング**:
- §3 鉄則1-6 → §C1.2 の 1-6（ほぼ同内容）
- §3 鉄則7-10 → §C1.2 の 7-10
- §3 鉄則11-15 → §C1.2 の 11-15

**既存§3 は参照用として不変**。§C1 は要約版、正本は §3。
```

### 3.3 §C2 変更フロー（推定 40行）

**位置**: §21.2 / 既存 §2 の 6ステップ を要約

```markdown
### §C2（§21.2） 変更フロー 6ステップ

1. ふとしが要件・課題を共有
2. Claude.ai（ADV）が仕様整理・影響範囲分析・AT記述
3. ふとしが承認
4. Claude.ai が変更フロー実行（仕様書更新→履歴→テスト→キュー）
5. Claude Code（ENG）が自律実行
6. 完了報告 → 次ミッション

**正本は §2。§C2 は要約のみ**。
```

### 3.4 §C3 品質ゲート & テスト戦略（推定 60行）

**位置**: §21.3 / 既存 §4（品質ゲート 82行）+ §7（3層テスト 15行）を統合要約

**構成**:
```markdown
### §C3（§21.3） 品質ゲート & テスト戦略

#### §C3.1 G1-G17 ゲート一覧
§C0.4 と §4 ゲート表を参照（ここには1行サマリーのみ再掲）

#### §C3.2 3層テスト（L1/L2/L3）
- L1 スモーク: §4.2.3 SSOT 5項目（起動/認証/主機能1/主機能2or外部API/永続化）
- L2 影響範囲: cmd-e2e、tests/e2e/ モック前提
- L3 フル: cmd-unit 全体、週次フル

#### §C3.3 完了コマンド3区分（PD-105）
- cmd-unit / cmd-e2e / cmd-realworld
- 状態: PASS / FAIL / N/A（高リスク不可）/ SKIP（DONE不可）/ WARN（代替証跡必須）

#### §C3.4 証跡SSOTパス（R2.1.1 確定）
evidence/<MISSION_ID>/ 配下（§C0.6 と §4.2.2 参照）

#### §C3.5 STATUS 3状態モデル
§C0.5 と §4.7.1 参照
```

### 3.5 §C4 デプロイ & デバッグ（推定 55行）

**位置**: §21.4 / 既存 §8（C2デプロイ 25行）+ §9（デバッグ 50行）を統合要約

**構成**:
```markdown
### §C4（§21.4） デプロイ & デバッグ

#### §C4.1 C2 デプロイフロー（§8 要約、12ステップ）
- Step 1-3: pre-deploy（G16 + Hフロー判定）
- Step 4-7: deploy 実行
- Step 8: hash ポーリング（α SSOT 埋込方式に従う）
- Step 9-11: 高リスク系のみ realworld smoke + G17
- Step 12: STATUS: DONE 自動書換え

#### §C4.2 デプロイ失敗時のリカバリ
- deploy.sh が append_deploy_fail.sh を自動呼出
- session_progress.md に DEPLOY-FAIL 追記
- DEPLOY-RECOVER-<MISSION_ID> をキュー先頭に挿入
- 元ミッション STATUS を READY_FOR_DEPLOY → IN_PROGRESS 自動書戻し
- 3回試行で POエスカレーション

#### §C4.3 デバッグ（§9 要約）
- ログ確認→実装→検証の順
- ログなし推測修正は禁止
- UI変更の grep だけ確認は禁止
```

### 3.6 §C5 レビュー運用 & 棚卸し（推定 80行）

**位置**: §21.5 / §13（AIレビュー 320行）+ §14（仕様書開発 15行）+ §15（棚卸し 70行）共通原則抜粋

**構成**:
```markdown
### §C5（§21.5） レビュー運用 & 棚卸し

#### §C5.1 AIレビュー基盤（§13 要約）
- sub_review_flow.md §2 Filter 1-7 が正本
- severity: CRITICAL / HIGH / MED / LOW
- severity inflation 禁止（既採用テーマの蒸し返しは MED以下）
- 棄却判定基準: §5.5（PD方針への異議は却下）
- モデル使い分け: ゴールデン = GPT-5.4 + Gemini 3.1 Pro、修正R = GPT-5

#### §C5.2 Filter 1-7 概要（sub_review_flow §2 参照）
（ここには1行ずつの要約のみ、詳細は sub_review_flow.md）

#### §C5.3 ラウンド上限
- ゴールデン: 2R 上限、超過で POエスカレーション
- 修正ラウンド: 最低10R または品質改善停止まで

#### §C5.4 仕様書開発フロー 6フェーズ（§14 要約）
（6フェーズの名称のみ列挙）

#### §C5.5 棚卸し（§15 要約）
- 5セッションごとに実施
- 対象: session_progress.md（300行超でアーカイブ）、development_rules.md（120行超で圧縮）
- session_history.md へ移動

#### §C5.6 LP（learned-patterns.md）運用
- 2ミッション以上再出現パターンを自律蓄積
- 予防適用成功もカウント
- 承認済み LP-001〜027 は learned-patterns.md 参照
```

### 3.7 §C6 構造的制約 & セキュリティ（推定 45行）

**位置**: §21.6 / §16（構造的制約 42行）+ §20（セキュリティ管理 60行+）から共通原則抜粋

**構成**:
```markdown
### §C6（§21.6） 構造的制約 & セキュリティ

#### §C6.1 構造的制約（§16 要約）
- 修正試行 3 回制限
- ホットフィックスパス（mockup不変更+対象2ファイル以内+仕様不変更）
- session_progress.md 300行、development_rules.md 120行の上限
- ルール追加は最大3件/サイクル
- テストライブラリ参照の原則
- 3層テストの共通基盤

#### §C6.2 セキュリティ管理（§20 要約）
- シークレットは .env / .dev.vars / wrangler 環境変数のみ
- コミット対象外ルール: .gitignore で .env* 全除外
- G10 シークレットスキャン: pre-commit + pre-push で必須
- 認証ミッションは PD-105 により3区分必須 + cmd-realworld 必須
- 代替証跡3形式（§4.9.3）

#### §C6.3 dev-system.yaml（R2.1.1 新設）
プロジェクトごとに配置、subdirs 列挙。pre-commit が参照（§2.ι' 参照）
```

### 3.8 §C0-C6 書き込み手順（Code G_47 ミッション）

**Code G_47 への指示**:
1. dev_system_spec.md の末尾に「## §21. 共通規範集（起動時要約版）」を追加
2. §21.0 〜 §21.6 を本R2.1.1 §3.1-3.7 の構成に従って記述
3. 既存 §1-§20 は**完全に不変**（参照整合性維持）
4. 章間相互参照リンクを追加（§C1 → §1 / §3, §C2 → §2, 等）
5. 全体で推定 410行の追加

**検証コマンド**:
```sh
# 連鎖更新後の検証
grep -c '^## §21\.' docs/plans/dev_system_spec.md  # 期待: 1
grep -c '^### §C[0-6]' docs/plans/dev_system_spec.md  # 期待: 7（C0-C6）
wc -l docs/plans/dev_system_spec.md  # 期待: 1,422 + ~410 = ~1,832
```

---

## §4. PD-108 却下記録 + R2.1 §4.16 改訂

### 4.1 PD-108 却下の概要

**却下対象**: ADV 書込可範囲に scripts/lib/** と scripts/*_lint.sh を追加する提案（R2.1 §4.16）

**却下理由**:
- 既存鉄則「ADVはコードを書かない」「スクリプトはENGに委任」に違反
- 責務境界の曖昧化・誤修正時の責任所在不明を招く
- ADV の力は R2.1 等のパッケージ内で実装サンプルを提示することで十分発揮される

**docs/po-decisions.md への記録**: PD-108 として「却下」と明示追加済み（2026-04-19 G_45）

### 4.2 R2.1 §4.16 改訂内容

| 項目 | R2.1 BEFORE | R2.1.1 AFTER |
|---|---|---|
| ADV書込可（新規追加） | templates/**, scripts/lib/**, scripts/*_lint.sh | **templates/** のみ |
| ADV書込不可 | src/**, tests/**, supabase/** etc. | 同上 + **scripts/** 全体を明記** |
| "scripts/*実装*.js" 曖昧削除 | 採用 | 採用（本R2.1.1 で変更なし）|
| ADVの立ち位置 | 雛形提示 → ENG 実装 | **設計文書内での実装サンプル提示のみ可、実ファイル書込は ENG 専任** |

### 4.3 再発予防
- 将来 ADV 書込可を拡張する提案があった場合、必ず PD-108 却下を参照
- 責務境界の拡張は PD 承認を要する新プロセスとして扱う
- 「便利にする」より「境界を明確に保つ」を優先

---

## §5. ai_review.js 改修指示（判定3 C採用）

### 5.1 GPT-5.4 出力制約問題の根本原因

Golden R1 で GPT-5.4 側が全5ペルソナで CRITICAL 1件のみ → 出力抑制確認。
- ファイルサイズ平均 1,334 chars（Gemini 5,332 chars の約25%）
- 推定原因: `response_format: { type: "json_object" }` が単一オブジェクト返却として解釈

### 5.2 ai_review.js 改修内容（Code G_46 ミッション `AI-REVIEW-JS-JSON-MODE-FIX`）

```javascript
// BEFORE
if (model === 'gpt54') {
  body.response_format = { type: "json_object" };
}

// AFTER
if (model === 'gpt54') {
  // response_format: json_object を削除
  // 代わりにプロンプトで JSON 配列出力を強制
}
```

### 5.3 プロンプト強化（システムプロンプトに以下を追加）

```
【重要：出力フォーマット】
必ず以下の形式で **JSON配列のみ** を出力してください。コード フェンスや前置き文は不要です。

[
  {
    "id": "R-001",
    "severity": "CRITICAL" or "HIGH" or "MEDIUM" or "LOW",
    "category": "MISSING" / "AMBIGUITY" / "CONTRADICTION" / "FEASIBILITY" / ...,
    "location": "§X.Y.Z",
    "issue": "問題の具体記述（100-300字）",
    "suggestion": "修正提案（100-300字）"
  },
  ...
]

**必ず配列として5-10件出力してください**（1件のみは不十分と扱われます）。
severity 基準と inflation ルールは本文の Part VIII（レビュアー指示）を厳守すること。
```

### 5.4 検証方法

Code G_46 改修後、ai_review.js を以下で動作確認:
```sh
# 軽量テスト（既存 R2 の同一ペルソナで再実行、出力量比較）
node scripts/ai_review.js \
  --input "lais/verify/dev_system_v34_r2_package.md" \
  --models gpt54 --personas solo_dev --output /tmp --prefix test_gpt54_fix

# 期待:
# - ファイルサイズ 3,000+ chars（従来比 2倍以上）
# - CRITICAL/HIGH 配列が5件以上
```

### 5.5 Code G_46 ミッション順序
1. **AI-REVIEW-JS-JSON-MODE-FIX**（ai_review.js 改修、15分見込み）
2. **DEV-SYSTEM-V34-REVIEW-GOLDEN-R2**（ゴールデン2周目、10-15分）
3. CRITICAL 0 → **DEV-SYSTEM-V34-WRITE**（連鎖更新9カテゴリ書込）
4. CRITICAL > 0 → POエスカレーション（sub_review_flow §1.6 上限2R超過）

---

## §6. 連鎖更新指示（R2.1 §6 への追加/修正）

### 6.1 R2.1 §6.1 dev_system_spec.md 連鎖更新（§C0-C6 新設の正式指示）

**R2.1.1 での追加**: R2.1 §6.1 の末尾に以下を追加（§C0-C6 の新設指示）:

```markdown
#### 6.1.2 §21 共通規範集（起動時要約版）新設（R2.1.1 確定）

**書き込み主体**: Code G_47（DEV-SYSTEM-V34-WRITE ミッション内）

**内容**: dev_system_spec.md の末尾に「## §21. 共通規範集（起動時要約版）」を新規追加。R2.1.1 §3.1-3.7 のマッピング表と構成指示に従い、§21.0（§C0）〜 §21.6（§C6）を記述。

**既存 §1-§20 の扱い**: **完全に不変**。章番号変更なし、内容変更なし。§C1-C6 は既存章の要約版として独立に追加される。

**鉄則 §3 → §C1 マッピング**: §C1 は鉄則15個の1行要約。正本は既存 §3（§3 内容は変更しない）。§C1 に「詳細は §3 を参照」を明記。

**相互参照**: §C1 → §1/§3、§C2 → §2、§C3 → §4/§7、§C4 → §8/§9、§C5 → §13/§14/§15、§C6 → §16/§20 のリンクを §21 内に記載。

**推定行数**: 約 410行（§C0: 80 + §C1: 50 + §C2: 40 + §C3: 60 + §C4: 55 + §C5: 80 + §C6: 45）

**検証**:
  grep -c '^## §21\.' docs/plans/dev_system_spec.md    # 期待: 1
  grep -c '^### §C[0-6]' docs/plans/dev_system_spec.md  # 期待: 7（C0-C6）
  wc -l docs/plans/dev_system_spec.md                   # 期待: 1,422 + ~410 = ~1,832
```

### 6.2 R2.1 §6.8 development_rules.md 連鎖更新（L1 SSOT 同期）

**R2.1.1 での追加**: R2.1 §6.8 に以下を追加:

```markdown
#### 6.8.1 L1 定義を §4.2.3 SSOT と完全一致させる（R2.1.1 ζ'-3 対応）

現行 development_rules.md の L1 定義（「起動/タスク追加/タスク編集保存/AI送信応答/プロフィール保存リロード残存」）を dev_system_spec.md §4.2.3 の抽象枠組みに合わせて書き換える:
- L1-1 起動/到達性 ← 「アプリが表示される」
- L1-2 認証/セッション復元 ← 「ログイン成功 or 既存セッション復元」
- L1-3 主機能1 ← 「タスク追加」（Lais アプリ固有例、他プロジェクトは該当機能を記述）
- L1-4 主機能2/外部API ← 「AI 送受信」（Lais アプリ固有例）
- L1-5 永続化/リロード ← 「リロード後もデータが残る」

**書き込み主体**: Code G_47
**検証**: development_rules.md 内に「L1-1」「L1-5」等の SSOT 表記が出現することを grep で確認
```

### 6.3 R2.1 §6.9 templates/mission_template_v3.md 連鎖更新（θ' 対応）

**R2.1.1 での修正**: R2.1 §6.9 の記述を以下で置換:

```markdown
#### 6.9.1 完了コマンド欄を cmd-unit / cmd-e2e / cmd-realworld 3行構成へ修正（R2.1.1 θ' 対応）

BEFORE（R2.1 までの mission_template_v3.md）:
  **完了コマンド:**
    cmd1: <bash command>

AFTER（R2.1.1 確定）:
  **完了コマンド（リスク別3区分、R2.1.1 厳格化）:**
```
cmd-unit: <bash command | N/A（理由）| SKIP（理由+リトライ予定）>
cmd-e2e: <bash command | N/A（理由）| SKIP（理由+リトライ予定）>
cmd-realworld: <bash command | N/A（理由）| SKIP（理由+リトライ予定）>
```

**書き込み主体**: Code G_47 **検証**: mission_template_v3.md 内に「cmd-unit:」「cmd-e2e:」「cmd-realworld:」の3行が出現、「cmd1:」が消失していることを grep で確認

#### 6.9.2 dev-system.yaml テンプレ新規追加（ι' 対応）

templates/dev-system.yaml.template を新規作成:

# dev-system.yaml - プロジェクトルートに配置

version: "3.4" subdirs: - lais - goal-ai-worker

# 将来追加プロジェクトはここに追記

**書き込み主体**: Code G_47 **検証**: ls templates/dev-system.yaml.template、subdirs セクション存在確認

#### 6.9.3 templates/deploy_recover_template.md の {MISSION_ID}/{TIMESTAMP} プレースホルダ確認

R2.1 §4.19.2 で定義された deploy_recover_template.md が実在し、{MISSION_ID}/{TIMESTAMP} プレースホルダを含むことを確認。不在なら新規作成:

### DEPLOY-RECOVER-{MISSION_ID}: デプロイ失敗リカバリ

> リスク: 🔴高 / 前ミッション: {MISSION_ID} / FAIL時刻: {TIMESTAMP} 参照: instructions/session_progress.md（DEPLOY-FAIL エントリ）

**目的:** デプロイ失敗の原因修正と再デプロイ **完了コマンド**:cmd-unit: &lt;元ミッションのcmd-unit&gt; cmd-e2e: &lt;元ミッションのcmd-e2e&gt; cmd-realworld: &lt;元ミッションのcmd-realworld&gt; **FAIL条件:** 3回試行で POエスカレーション

```

### 6.4 R2.1 §6.10 canopy/canopy_common.sh 連鎖更新（STATUS 自動化 + 証跡パス）

**R2.1.1 での追加**: R2.1 §6.10 に以下を追加:

```markdown
#### 6.10.1 canopy_common.sh::check_test_pass STATUS 自動書換え追加（η' 対応）

本R2.1.1 §2.η' 実装サンプルの check_test_pass に STATUS 自動遷移ロジックを組込む。
- リスク判定: scripts/mission_risk_classifier.sh を呼出
- 高リスク: IN_PROGRESS → READY_FOR_DEPLOY
- 低/中リスク: IN_PROGRESS → DONE
- sed -i で session_progress.md を直接書換え

#### 6.10.2 canopy_common.sh::check_tdd 証跡パス修正（β' 対応）

evidence/<MISSION_ID>/ 配下を参照するよう check_tdd を書き直し。本R2.1.1 §2.β' 実装サンプル参照。

#### 6.10.3 canopy/canopy_common.sh と tests/smoke/canopy_common.sh の配置ルール

**正本**: `canopy/canopy_common.sh`（dev-system 共通基盤、PD-008）
**運用**: 各プロジェクトの tests/smoke/ にシンボリックリンク or コピー（スクリプト化されている既存運用を踏襲）

**書き込み主体**: Code G_47
**検証**: `grep -c 'evidence/' canopy/canopy_common.sh >= 2` かつ `grep -c 'STATUS' canopy/canopy_common.sh >= 1`
```

### 6.5 新規連鎖更新（R2.1 §6 に新設する項目）

#### 6.5.1 §6.11 scripts/deploy.sh 完全書き換え（ε' 対応）

**書き込み主体**: Code G_47 **内容**: 本R2.1.1 §2.ε'-1 の [deploy.sh](http://deploy.sh) 完全パッチを scripts/deploy.sh として書き込み **既存deploy.shがある場合**: バックアップして書き換え **検証**:

- pre-deploy ゲート（G16 + Hフロー + STATUS 検証）3つ全て存在
- post-deploy ゲート（G17 + STATUS → DONE 自動書換え）存在
- logs/deploy.log 生成処理存在
- append_deploy_fail.sh 呼出存在（失敗時）

#### 6.5.2 §6.12 scripts/hflow_trigger_check.sh 書き込み（ε'-3 対応）

**書き込み主体**: Code G_47 **内容**: 本R2.1.1 §2.ε'-3 の hflow_trigger_check.sh を書き込み（main 直push フォールバック含む） **検証**: `grep -c 'GIT_PUSH_REMOTE_SHA' scripts/hflow_trigger_check.sh >= 1`

#### 6.5.3 §6.13 scripts/append_deploy_fail.sh 完全書き換え（γ'-7 + η' 対応）

**書き込み主体**: Code G_47 **内容**: 本R2.1.1 §2.γ'-7 の append_deploy_fail.sh を書き込み（ENVIRON 経由 + STATUS 書戻し） **検証**: `grep -c 'ENVIRON' scripts/append_deploy_fail.sh >= 1` かつ `grep -c 'READY_FOR_DEPLOY' scripts/append_deploy_fail.sh >= 1`

#### 6.5.4 §6.14 G13/G14/G15/G16/G17 各スクリプトの POSIX 化書き直し

**書き込み主体**: Code G_47 **対象スクリプト**:

- scripts/verify_hooks.sh（G13、γ'-6 対応）
- scripts/spec_first_lint.sh（G14、δ'-3 + κ' 対応）
- scripts/tdd_trace_consistency.sh（G15、γ'-2 対応）
- scripts/deploy_hash_verify.sh（G16、γ'-3 対応）
- scripts/realworld_proof_check.sh（G17、γ'-4 + ζ' + β' 対応）

**検証**:

- すべてのスクリプトに `#!/bin/sh` シバン
- shellcheck --shell=sh --severity=error で PASS
- bash 拡張構文（`<()`, `${var:0:7}`, `\<`, `[[ ]]`, `(( ))`）が検出されないこと

#### 6.5.5 §6.15 scripts/mission_risk_classifier.sh + scripts/lib/risk_match.sh 完全書き換え

**書き込み主体**: Code G_47 **対象**:

- scripts/lib/risk_match.sh（γ'-1 対応、ヒアドキュメント書換え）
- scripts/mission_risk_classifier.sh（δ'-1 対応、awk 形式1+2 両対応）
- scripts/lib/risk_patterns.sh（R2.1 既定義、変更なし）

#### 6.5.6 §6.16 scripts/verify_external_services.sh + scripts/proposal_log_lint.sh 書き直し

**書き込み主体**: Code G_47 **対象**:

- scripts/verify_external_services.sh（δ'-2 対応、代替証跡チェック追加）
- scripts/proposal_log_lint.sh（δ'-4 対応、インプレース書換え追加）

#### 6.5.7 §6.17 scripts/ai_review.js 改修（判定3 C 対応）

**書き込み主体**: Code G_46（`AI-REVIEW-JS-JSON-MODE-FIX` ミッション、G_47 より先） **内容**: 本R2.1.1 §5 参照。GPT-5.4 側の response_format: json_object 削除 + プロンプト強化

### 6.6 .git/hooks/pre-commit 連鎖（ι' 対応）

**R2.1.1 での追加**: R2.1 §6 に以下を追加:

```markdown
#### 6.18 .git/hooks/pre-commit の subdir 動的探索化（ι' 対応）

**書き込み主体**: Code G_47
**内容**: 本R2.1.1 §2.ι' 実装サンプル参照。dev-system.yaml 読込 + 動的探索フォールバックの2方式。
**検証**: `.git/hooks/pre-commit` 内で `lais` `goal-ai-worker` のハードコード文字列が grep されないこと（SUBDIRS 変数経由に変更済み）
```

---

## §7. レビュアー指示 Part IX（ゴールデン R2 用）

本R2.1.1 + R2.1 を入力とするゴールデン R2 レビュアーへの指示。R2.1 Part VIII の延長線上で、以下を遵守すること。

### 7.1 severity 基準（再掲）

- **CRITICAL**: 仕様矛盾・運用不能・セキュリティ・方針違反
- **HIGH**: 設計不備・曖昧性・運用上の重大リスク
- **MED**: 改善提案・軽微な不整合
- **LOW**: 表記ゆれ・誤字・個人的好み（原則棄却）

### 7.2 severity inflation 禁止（強化）

以下は MED 以下に降格:

- R1/R2/R2.1 で採用済みクラスターへの別観点指摘（既解決テーマの蒸し返し）
- Golden R1 で採用済み 14クラスター（α'〜ν'除く）への方針異議
- PD-108 却下決定への再提案

### 7.3 棄却対象（§5.5 強化）

**レビュアーは以下を CRITICAL/HIGH で出してはならない**:

- PD-104/105/106/107 の方針異議
- PD-108 の却下決定への異議
- Golden R1 採用14クラスターの**方針**への異議（実装詳細改善は HIGH まで可）

**方針**とは: 例「α' F-1 採用（§C1-C6 を §21 新設）」「β' evidence// 統一」「γ' POSIX化」「ζ' L1 5項目 SSOT」など。

### 7.4 Filter 1-7 の適用（sub_review_flow §2 準拠）

1. **Filter 1 Source-only（原文根拠）**: 引用/行番号で裏付けなしの指摘は disregard
2. **Filter 2 SSOT準拠**: 既決定との衝突は却下または採用、両立不可
3. **Filter 3 Novel（新規性）**: R2.1/R2.1.1 で既採用は MED 以下
4. **Filter 4 Category正規化**: 10カテゴリに正規化（MISSING/AMBIGUITY/CONTRADICTION/FEASIBILITY/EDGE_CASE/JOURNEY_GAP/UNDEFINED/STRUCTURE/ROBUSTNESS/EXPERT）
5. **Filter 5 Feasibility（実現可能性）**: 実現不能は CRITICAL のまま、「こうしたい」は HIGH
6. **Filter 6 Scope（スコープ）**: v3.4 範囲外（v3.5 以降）は DEFERRED 扱い
7. **Filter 7 Cost-benefit**: 修正コストが便益を上回るものは MED 以下

### 7.5 重点レビュー領域

- §C0-C6 マッピング表（§3）の妥当性: 既存 §1-§20 からの引用元が正確か
- [deploy.sh](http://deploy.sh) 完全パッチ（§2.ε'）のロジック完全性: pre/post ゲート抜けなし
- 証跡パス統一（evidence//）が全箇所に適用されているか（β' + 他クラスター整合）
- G13-G17 実装サンプルの POSIX 互換性（shellcheck error 相当なし）
- STATUS 遷移全自動化（η'）の完全性: 手動遷移が残っていないか
- L1 SSOT 5項目（ζ'）が認証/決済ミッションで適切に機能するか

### 7.6 出力形式

- JSON 配列形式、1要素 = 1指摘
- 必須フィールド: id, severity, category, location, issue, suggestion
- **GPT-5.4 側**: `response_format: json_object` 削除後の運用。プロンプト内の「5-10件必須」指示に従うこと

### 7.7 合議不要な強制採用方針

- Golden R1 で採用された 14クラスター（μ' 除く）は既採用、方針再議論しない
- PD-104/105/106/107/108 は既決定、再議論しない

---

## §8. Cumulative Context Part X（149件要約）

### 8.1 R1 採用 76件（R2.1 で反映済み）

R2.1 Cumulative Context Part VIII で詳細。本R2.1.1 では **参照のみ**、再議論しない。主要テーマ:

- A クラスター: Step 8 hash ポーリング確定
- B クラスター: テスト数境界規則
- C クラスター: 品質ゲート G1-G13 再定義
- D クラスター: Hフロー機械発火（PD-106）
- E クラスター: ストレージ同期ルール
- F クラスター: 必須Read 定義
- G クラスター: ADV/ENG 責務分担
- H クラスター: 3状態 STATUS モデル
- I クラスター: C6 C11 C18 C19 統合
- J クラスター: LP 運用
- K クラスター: 段階的ロールアウト
- L クラスター: 完了コマンド3区分（PD-105）
- M クラスター: 滞留日数警告（G12）
- N クラスター: 提案ログフォーマット

### 8.2 R2 採用 22件（R2.1 で反映済み）
R2.1 Cumulative Context Part VIII の後半で詳細。主要テーマ:
- O クラスター: Hフロー境界条件
- P クラスター: mid-risk 規約
- Q クラスター: WARN 状態の代替証跡3形式
- R クラスター: G14 仕様ファースト lint
- S クラスター: G15 TDD trace 同期
- T クラスター: G16 hash 埋込検証
- U クラスター: G17 realworld 証跡
- V クラスター: pre-commit サブプロジェクト統合
- W クラスター: 提案ログ STATUS 明示
- X クラスター: dev-system リポジトリ構造（PD-008）

### 8.3 HIGH 21件（R2.1 で一部反映、Golden R1 で追加 2件未反映）
主に文書整理・相互参照・トレーサビリティ強化。R2.1 §4 各クラスターに分散反映済み。R2.1.1 でゴールデン余地の 2件は本文で対応せず（HIGH レベル、ゴールデン R2 で再評価）。

### 8.4 Golden R1 採用 30件（本R2.1.1 で反映）
§2.α' 〜 §2.ξ' で 14クラスター（30件）を反映済み。
- α' 3件（§3 §C0-C6 新設で対応）
- β' 4件（evidence/<MID>/ 統一で対応）
- γ' 7件（POSIX化で対応）
- δ' 4件（個別スクリプトバグ修正で対応）
- ε' 3件（deploy.sh 完全パッチで対応）
- ζ' 2件（L1 5項目 SSOT で対応）
- η' 2件（STATUS 全自動化で対応）
- θ' 1件（mission_template 3区分で対応）
- ι' 1件（dev-system.yaml 新設で対応）
- κ' 1件（G14 正規表現緩和で対応、δ'-3 統合）
- λ' 1件（G17 5操作化で対応、ζ'-1 統合）
- ξ' 1件（G8 AFTER タイポ修正で対応）

### 8.5 Golden R1 却下 / 降格（R2.1.1 本文で対応しない）
- μ' 1件（#28 ADV書込可拡張）: **PD-108 却下**として処理（R2.1 §4.16 の該当部分を削除する"採用"）
- ν' 1件（#31 Read 量運用負荷）: **HIGH 降格** → LP-025 候補記録のみ、本文反映なし

### 8.6 既棄却 LOW 4件（R1/R2 で棄却済み）
R2.1 §8.4 で列挙、R2.1.1 でも同様に disregard。再浮上時は Filter 7（Cost-benefit）で MED 以下。

### 8.7 合計件数
- R1 採用: 76
- R2 採用: 22
- HIGH: 21
- Golden R1 採用: 30
- **合計: 149件**（R2.1.1 で統合管理）

---

## §9. ゴールデン R2 実行計画

### 9.1 前提条件
- ✅ R2.1.1 パッケージ完成（本ドキュメント、推定 1,800+ 行）
- ✅ Golden R1 トリアージ完成（dev_system_v34_golden_r1_triage.md、738行）
- ⏳ **ai_review.js 改修完了**（Code G_46 ミッション `AI-REVIEW-JS-JSON-MODE-FIX`、GPT-5.4 json_object 削除）
- ✅ R2.1（1,931行）および R2 トリアージ（767行）不変

### 9.2 実行モデル/ペルソナ
| # | モデル | ペルソナ | カテゴリ重点 |
|---|---|---|---|
| 1 | GPT-5.4 | ai_ops | 運用設計、シェルスクリプト、自動化 |
| 2 | GPT-5.4 | devops_engineer | POSIX 互換、デプロイパイプライン |
| 3 | GPT-5.4 | qa_lead | ゲート定義、証跡、L1 スモーク |
| 4 | GPT-5.4 | solo_dev | 必須Read、運用負荷、実務性 |
| 5 | GPT-5.4 | tech_writer | 相互参照、構造整合、文言 |
| 6 | Gemini 3.1 Pro Preview | ai_ops | 同上 |
| 7 | Gemini 3.1 Pro Preview | devops_engineer | 同上 |
| 8 | Gemini 3.1 Pro Preview | qa_lead | 同上 |
| 9 | Gemini 3.1 Pro Preview | solo_dev | 同上 |
| 10 | Gemini 3.1 Pro Preview | tech_writer | 同上 |

**並列実行**、推定所要時間 10-15分、コスト $3-5（GPT-5.4 が json_object 解除で出力量増加、Gemini は同程度）。

### 9.3 入力ファイル
- **主入力**: `lais/verify/dev_system_v34_r2_1_1_package.md`（本R2.1.1、差分）
- **参照**: `lais/verify/dev_system_v34_r2_1_package.md`（R2.1、不変）
- **context-files**: `docs/plans/dev_system_spec.md`, `docs/plans/sub_review_flow.md`, `docs/po-decisions.md`

### 9.4 完了条件（v3.4 確定条件）
- CRITICAL 0件 = v3.4 確定 → Code G_47 で連鎖更新書込
- CRITICAL > 0件 = POエスカレーション（sub_review_flow §1.6 ゴールデン上限2R 超過）

### 9.5 FAIL時の選択肢（CRITICAL > 0）
| CRITICAL 件数 | 対処 |
|---|---|
| 1-5件 | 差分修正パッケージ R2.1.2 を作成し、ゴールデン R3（上限超過、PO承認必要） |
| 6-10件 | R2.1 全体再検討、Plan F-2（§C章廃止）への方針転換も視野 |
| 11件以上 | v3.4 計画自体を中止、v3.3 継続運用 or v3.5 に仕切り直し |

### 9.6 成功時のCode G_47 書込範囲
| § | 対象ファイル | 書込内容 |
|---|---|---|
| 6.1 | docs/plans/dev_system_spec.md | §21 新設（§C0-C6、410行追加）|
| 6.2 | docs/plans/sub_review_flow.md | severity基準、Filter 1-7 整合 |
| 6.3 | docs/plans/sub_adv_protocol.md | ADV 書込可リスト更新（§4.16 反映）|
| 6.4 | docs/plans/sub_testing.md | 証跡 SSOT パス evidence/<MID>/ |
| 6.5 | docs/plans/sub_infrastructure.md | deploy.sh / logs/deploy.log 記述 |
| 6.6 | docs/plans/sub_data_model.md | STATUS 遷移モデル |
| 6.7 | CLAUDE.md | §C0 参照先更新 |
| 6.8 | development_rules.md | L1 SSOT 同期 |
| 6.9 | templates/mission_template_v3.md + templates/dev-system.yaml.template | 3区分 + yaml 新設 |
| 6.10-6.18 | scripts/ 各種 | G13-G17 + deploy.sh + hflow + canopy_common.sh 等（計13ファイル） |

推定書込時間: Code G_47 で 30-45分（ファイル数多、内容量多）

### 9.7 再発予防 LP 登録
R2.1.1 確定後、以下を learned-patterns.md に LP-020〜027 として追加:
- LP-020 〜 LP-024: R2.1 で既述
- **LP-025（新）**: dev-system 改訂セッションは最小起動コンテキストを別定義（ν' 由来）
- **LP-026（新）**: 章番号体系変更時は「新章新設 + 既存章参照」パターン必須、renumbering 禁止（α' 由来）
- **LP-027（新）**: 新設スクリプトは shellcheck --shell=sh --severity=error で pre-commit 必須（γ' 由来）

---

**R2.1.1 パッケージ完了**。ゴールデン R2 実行準備完了。

**完了コマンド:**
  wc -l lais/verify/dev_system_v34_r2_1_1_package.md
  # 期待: 1,800-2,000行

  grep -c '^### §2\.[α-ν]' lais/verify/dev_system_v34_r2_1_1_package.md
  # 期待: 10以上（クラスター節数、14中10以上カバー確認）

  grep -c 'PD-108' lais/verify/dev_system_v34_r2_1_1_package.md
  # 期待: 5以上

  grep -c 'evidence/<MISSION_ID>' lais/verify/dev_system_v34_r2_1_1_package.md
  # 期待: 5以上（β'統一パスが本文中に反映）

  grep -c 'response_format' lais/verify/dev_system_v34_r2_1_1_package.md
  # 期待: 2以上（ai_review.js 改修指示）

**次ミッション:**
- Code G_46: `AI-REVIEW-JS-JSON-MODE-FIX` → `DEV-SYSTEM-V34-REVIEW-GOLDEN-R2`
- ゴールデン R2 CRITICAL 0 確定後 → Code G_47: `DEV-SYSTEM-V34-WRITE`
## §6. 連鎖更新指示（R2.1 §6 への追加/修正）

本節は R2.1 §6「連鎖更新指示（9カテゴリ）」への**追加・修正**を列挙する。Code G_47 が v3.4 確定後に連鎖更新を書込む際、R2.1 §6 と本R2.1.1 §6 を**両方**参照して書込する。

### 6.1 dev_system_spec.md（R2.1 §6.1 への追加）

**追加内容**: §21「共通規範集（起動時要約版）」新設指示

詳細は本R2.1.1 §3 参照。§6.1 の既存内容（PD-104/105/106/107 反映）に加えて:
- 末尾に「## §21. 共通規範集（起動時要約版）」を新設
- §21.0 〜 §21.6 を §3.1-§3.7 の構成で記述（約410行追加）
- 既存 §1-§20 完全不変
- 章間相互参照（§C1 → §1/§3, §C2 → §2, 等）
- 既存 §3 鉄則15個 → §C1 マッピング表を §6.1 末尾に付記

### 6.2 sub_adv_protocol.md（R2.1 §6.2 への修正）

**修正内容**: PD-108 却下反映

- 書込可リストから `scripts/lib/*.sh`, `scripts/*_lint.sh` を削除
- `templates/**` は追加のまま維持
- 「ADV は設計文書内で実装サンプル提示可、実ファイル scripts/** への書込は不可」を明記
- R2.1.1 §4.2 の対応表を正本として参照

### 6.3 sub_hflow_protocol.md（R2.1 §6.3 はそのまま維持）

本R2.1.1 では変更なし。PD-106 による機械発火ルールはそのまま。

### 6.4 sub_testing.md（R2.1 §6.4 への修正）

**修正内容**: 証跡パス統一 + L1 SSOT

- R2.1 の `logs/<mission>/before-*.json` 表記をすべて **`evidence/<MISSION_ID>/before-*.json`** に置換（β' 対応）
- L1 スモーク定義を §4.2.3 SSOT 5項目表と完全一致させる（ζ' 対応）
- L1/L2/L3 層名と証跡種別（unit/e2e/realworld 証跡）の用語衝突解消（ζ'-2 対応）

### 6.5 sub_infrastructure.md（R2.1 §6.5 への修正）

**修正内容**:
- §2.8 deploy.sh 完全パッチを追加（§2.ε' 参照、約60行）
- `logs/deploy.log` 生成処理の記載
- G17 実行タイミング（post-deploy の高リスク系のみ）
- STATUS 自動遷移の deploy.sh 側実装

### 6.6 sub_review_flow.md（R2.1 §6.6 への修正は小幅）

**修正内容**:
- §2 Filter 7（severity inflation）に Golden R1 棄却例を追記（μ'/ν' 処理）
- モデル使い分け: ゴールデン R は **GPT-5.4（response_format: json_object なし）+ Gemini 3.1 Pro** と明記（判定3 C 反映）

### 6.7 sub_knowledge_flow.md（R2.1 §6.7 はそのまま維持）

本R2.1.1 では変更なし。LP-025-027 候補は learned-patterns.md 側で管理。

### 6.8 development_rules.md（R2.1 §6.8 への修正）

**修正内容**:
- L1 スモーク定義を §4.2.3 SSOT 5項目表と完全一致させる（ζ'-3 対応）
- 既存の「起動/タスク追加/タスク編集保存/AI送信応答/プロフィール保存リロード残存」を SSOT 抽象枠（L1-1〜L1-5）に書換え
- 完了報告フォーマットの3区分化（cmd-unit/cmd-e2e/cmd-realworld）を明記

### 6.9 templates/（R2.1 §6.9 への追加/修正）

**追加・修正内容**:
- `templates/mission_template_v3.md`: 完了コマンド欄を `cmd-unit / cmd-e2e / cmd-realworld` 3行構成に書換え（θ' 対応）
- `templates/deploy_recover_template.md`: 既存のまま維持（R2.1 で既定義）
- `templates/dev-system.yaml`: **新規追加**（ι' 対応）。subdirs 列挙形式

### 6.10 scripts/（R2.1 §6.10 の全面書直し + deploy.sh 追加）

**R2.1 §6.10 は R2.1.1 §2 の各実装サンプルで置換される**:
- `scripts/lib/canopy_common.sh`: §2.β' の check_tdd + §2.η' の check_test_pass 自動 STATUS 書換え
- `scripts/lib/risk_match.sh`: §2.γ'-1 のヒアドキュメント版
- `scripts/lib/risk_patterns.sh`: R2.1 §6.10 のまま維持
- `scripts/mission_risk_classifier.sh`: §2.δ'-1 の形式1+形式2両対応版
- `scripts/hflow_trigger_check.sh`: §2.ε'-3 の main 直 push 対応版
- `scripts/spec_first_lint.sh`: §2.δ'-3 の next バグ修正 + κ' 正規表現緩和版
- `scripts/proposal_log_lint.sh`: §2.δ'-4 のインプレース書換え版
- `scripts/verify_external_services.sh`: §2.δ'-2 の代替証跡チェック版
- `scripts/deploy_hash_verify.sh`: §2.γ'-3 の cut 版
- `scripts/deploy_poll_hash.sh`: R2.1 §6.10 のまま維持
- `scripts/realworld_proof_check.sh`: §2.β' + §2.γ'-4 の POSIX版 + 5操作版
- `scripts/tdd_trace_consistency.sh`: §2.β' + §2.γ'-2 の一時ファイル版
- `scripts/verify_hooks.sh`: §2.γ'-6 の sh 側 date 変換版
- `scripts/append_deploy_fail.sh`: §2.γ'-7 の ENVIRON 版 + §2.η' STATUS 自動書戻し
- **`scripts/deploy.sh`: §2.ε'-1 の完全パッチ（R2.1.1 新規追加、§6.10 に明示）**
- **`scripts/shellcheck_lint.sh`: §2.γ'-8 の shellcheck ゲート新設（または pre-commit 内蔵）**

---

## §7. レビュアー指示 Part IX（ゴールデン R2 用）

本R2.1 と本R2.1.1 を**両方読んで**、以下の観点でレビューする。ゴールデン R2 は**最終確定前の最後のゲート**。CRITICAL 0 で v3.4 確定、CRITICAL > 0 で POエスカレーション。

### 7.1 severity 基準（sub_review_flow §2 Filter 1-7 準拠）

| severity | 基準 | 例 |
|---|---|---|
| CRITICAL | 仕様矛盾・実装不能・セキュリティ抜け・PD方針違反が残存 | 証跡パスがまだ不整合、POSIX違反残存、§C0-C6 が実体化していない |
| HIGH | 実装品質改善・運用改善・明確化 | shellcheck 強度改善、lint 追加、命名改善 |
| MED | 軽微なドキュメント改善 | typo、句読点、表記ゆれ |
| LOW | 好み・スタイル | インデント、コメント |

### 7.2 PD 方針異議禁止（§5.5 棄却強化）

以下への「反対意見」は**即棄却**（severity に関わらず出さない）:
- PD-104（dev-system SPEC 分割）
- PD-105（完了コマンド3区分）
- PD-106（Hフロー機械発火）
- PD-107（起動時Read 約400行）
- **PD-108（却下: ADV書込可拡張）の「却下決定」そのものへの再提案**

方針はすでに PO 承認済。異議は受理しない。方針内の**実装改善提案**は可（例: 「PD-107 の 400行を守るために §C0 をさらに圧縮する案」は可）。

### 7.3 Filter 1-7 の適用（sub_review_flow.md §2 参照）

- Filter 1（既採用テーマ再提案）: R2 採用 98件 + HIGH 21件 + Golden R1 採用 30件 = **149件への再異議は棄却**
- Filter 2（LOW 蒸し返し）: R1/R2 で LOW 棄却された 4件の再提案は棄却
- Filter 3（FEASIBILITY 根拠欠落）: 「難しい」だけで根拠なしは MED 降格
- Filter 4（MISSING 自己参照）: 「§X が §X を参照していない」類は HIGH 以下
- Filter 5（CONTRADICTION 原本誤読）: 原本確認せず矛盾主張は棄却
- Filter 6（UNDEFINED 用語汚染）: 既定義用語への「未定義」指摘は棄却
- **Filter 7（severity inflation）**: 既採用テーマの再発見は MED 以下。既存 CRITICAL の補強指摘は HIGH 上限

### 7.4 ゴールデン R2 の重点領域

R2.1.1 で修正した14クラスターが**完全に解消されているか**:

- α' §C0-C6 物理化: §6.1 連鎖更新指示にマッピング表・移行マップがあるか
- β' 証跡パス統一: evidence/&lt;MISSION_ID&gt;/ が全文で一貫しているか
- γ' POSIX 互換: shellcheck が通る実装サンプルになっているか
- δ' 個別バグ: awk/grep/regex が実動作するか（机上でトレース可）
- ε' [deploy.sh](http://deploy.sh): pre-deploy + post-deploy ゲートが連続実行可能か
- ζ' L1 SSOT: 5項目表と G17 5操作が一致するか
- η' STATUS 自動化: 手動遷移箇所が残っていないか
- θ' mission_template: cmd-unit/cmd-e2e/cmd-realworld 3行構成か
- ι' pre-commit: ハードコード除去 + dev-system.yaml 方式か
- κ' G14 regex: 通常アプリ docs/\*\*/\*.md でも通るか
- λ' G17 5操作: auth.png が高リスク認証ミッションで必須化されているか
- μ' PD-108: R2.1 §4.16 から scripts/lib/\*\* 除去が反映されているか
- ν' LP-025 候補: 記録のみで本R2.1.1 本文に影響がないか
- ξ' G8 AFTER: 「realworld は G8対象外、G17 の対象」に訂正されているか

### 7.5 R2.1.1 自体の新規論点

R2.1.1 で**新たに**導入された内容に対して新規指摘可:

- §3 §C0-C6 マッピング設計の妥当性（行数目安が守れそうか、抜け・重複がないか）
- §5 ai_review.js 改修方針（json_object 削除で本当に出力改善するか）
- §6 連鎖更新指示の網羅性（書込対象が漏れていないか）

ただしこれらも **severity は CRITICAL 上限**（方針レベルの破綻時のみ CRITICAL）、通常は HIGH 以下で指摘。

### 7.6 出力形式（ai_review.js 改修後の期待）

```json
[
  {
    "id": "R-001",
    "severity": "CRITICAL",
    "category": "MISSING" | "CONTRADICTION" | "FEASIBILITY" | "STRUCTURE" | "EDGE_CASE" | "ROBUSTNESS" | "UNDEFINED" | "AMBIGUITY",
    "location": "R2.1 §X.Y または R2.1.1 §Z.W",
    "issue": "問題の具体記述（100-300字）",
    "suggestion": "修正提案（100-300字）"
  }
]
```

**5-10件必須**（1件のみは R1 の GPT-5.4 のような出力抑制パターンとして扱われ、再実行対象）。

---

## §8. Cumulative Context Part X（149件要約 + 本R2.1.1 採用）

### 8.1 累積採用テーマ（ゴールデン R2 レビュアーが同じ指摘を出さないため）

段階件数出典R1 採用76R1 トリアージR2 採用22R2 パッケージ §XHIGH 採用（R1+R2）21同上Golden R1 採用30本R2.1.1 §2 全クラスターGolden R1 却下（PD-108）1本R2.1.1 §4Golden R1 HIGH 降格1ν' = LP-025 候補**合計採用149**

### 8.2 既棄却 LOW 4件（R1/R2 で却下、再提案禁止）

1. docs/ 配下のフォルダ構造再編（ファイル場所変更、仕様への影響なし）
2. コメントスタイル統一（LOW、好み）
3. 変数命名の microstyle 改善（LOW、可読性差小）
4. ログ出力時刻フォーマット統一（LOW、既存ツール依存）

### 8.3 本R2.1.1 採用 30件（§2 全クラスターを再掲）

ID 系列クラスター件数方針α'-1〜3§C0-C6 実体化 + マッピング3採用（§2.α' + §3）β'-1〜4証跡パス evidence/&lt;MISSION_ID&gt;/ 統一4採用（§2.β'）γ'-1〜7POSIX 互換修正7採用（§2.γ'）δ'-1〜4個別スクリプトバグ修正4採用（§2.δ'）ε'-1〜3[deploy.sh](http://deploy.sh) 完全パッチ + Hフロー main 直push3採用（§2.ε'）ζ'-1〜2L1 SSOT 5項目 + 層名衝突解消2採用（§2.ζ'）η'-1〜2STATUS 全自動化2採用（§2.η'）θ'-1mission_template 3区分化1採用（§2.θ'）ι'-1pre-commit ハードコード解消1採用（§2.ι'）κ'-1G14 regex 緩和1採用（δ'-3 と統合）λ'-1G17 5操作（auth 含む）1採用（ζ' と統合）ξ'-1G8 AFTER タイポ訂正1採用（§2.ξ'）

### 8.4 PO 決定（PD 全件、R2.1.1 までの確定状況）

- PD-001〜008: Goal AI 時代の基本決定（CODE委任、dev-system共通基盤等）
- PD-101〜103: Lais 開始時の決定
- PD-104: dev-system SPEC 分割（メイン + sub 5本）
- PD-105: 完了コマンド3区分（cmd-unit/cmd-e2e/cmd-realworld）
- PD-106: Hフロー機械発火（git diff ベース）
- PD-107: 起動時Read 約400行（§C0 固定 + §C1-C6 条件付き再読）
- **PD-108: ADV書込可拡張を却下**（本R2.1.1 §4）

**再提案・異議 禁止**。方針内の実装改善提案は可。

### 8.5 LP 候補（ゴールデン R2 完了後に正式追加予定）

- LP-020: 既存提案
- LP-021: 既存提案
- LP-022: 既存提案
- LP-023: 既存提案
- LP-024: 既存提案
- **LP-025 候補（ν' 由来）**: dev-system改訂セッション用の最小起動コンテキスト別定義
- **LP-026 候補（α' 由来）**: 章番号体系変更は「新章新設+既存章参照」パターン採用、renumbering 禁止
- **LP-027 候補（γ' 由来）**: 新設スクリプトは shellcheck --shell=sh --severity=error で pre-commit 検査

---

## §9. ゴールデン R2 実行計画

### 9.1 前提条件

ゴールデン R2 実行**前**に以下が完了している必要:

1. ✅ Golden R1 トリアージ完了（dev_system_v34_golden_r1_triage.md 738行）
2. ✅ R2.1.1 パッケージ完成（本ファイル、\~1,800行想定）
3. ✅ PD-108 却下記録（[po-decisions.md](http://po-decisions.md)）
4. ⏳ **ai_review.js 改修**（Code G_46 ミッション `AI-REVIEW-JS-JSON-MODE-FIX`、GPT-5.4 側 json_object 削除）

### 9.2 実行構成

項目値入力`lais/verify/dev_system_v34_r2_1_package.md`（R2.1 本体）+ `lais/verify/dev_system_v34_r2_1_1_package.md`（本R2.1.1 差分）モデルGemini 3.1 Pro Preview + GPT-5.4ペルソナai_ops / devops_engineer / qa_lead / solo_dev / tech_writer（全5）並列実行数10本（2モデル × 5ペルソナ）コスト見込み$3-5（Golden R1 と同水準）実行時間10-15分

### 9.3 ai_review.js 実行コマンド（R2.1.1 前提）

```sh
node scripts/ai_review.js \
  --input "lais/verify/dev_system_v34_r2_1_package.md,lais/verify/dev_system_v34_r2_1_1_package.md" \
  --models gemini,gpt54 \
  --personas ai_ops,devops_engineer,qa_lead,solo_dev,tech_writer \
  --severity CRITICAL,HIGH,MEDIUM \
  --output lais/verify \
  --prefix dev_system_v34_golden_r2
```

### 9.4 完了条件（R2 PASS）

- **CRITICAL 0 件**（全ペルソナ × 全モデル合算）
- ファイルサイズ: 各ペルソナ 3,000+ chars（GPT-5.4 も Gemini 並みに回復）
- Filter 7 違反 0 件（既採用テーマ再発指摘が 0）

### 9.5 FAIL 条件 と 対処

結果対処CRITICAL 0 件v3.4 **確定**。Code G_47 で連鎖更新書込ミッション開始CRITICAL 1-5 件ADV トリアージで**棄却余地ありか判定**。PD方針違反以外なら R2.1.2 差分パッケージ作成 → ゴールデン R3（**sub_review_flow §1.6 上限2R超過でPOエスカレーション必要**）CRITICAL 6+ 件POエスカレーション（R2.1.1 の設計レベル欠陥が疑われる）GPT-5.4 出力抑制再発ai_review.js 改修不完全 → Code G_46 で再修正 → R2 再実行

### 9.6 Code G_47 連鎖更新書込ミッション（CRITICAL 0 後）

`DEV-SYSTEM-V34-WRITE` として実行:

 1. dev_system_spec.md §21 新設（§C0-C6、約410行追加）
 2. sub_adv_protocol.md §1 書込可リスト更新（PD-108 反映）
 3. sub_testing.md 証跡パス evidence/&lt;MISSION_ID&gt;/ 統一
 4. sub_infrastructure.md §2.8 [deploy.sh](http://deploy.sh) パッチ追加
 5. sub_review_flow.md §2 Filter 7 + モデル使い分け追記
 6. development_rules.md L1 SSOT 同期
 7. templates/mission_template_v3.md cmd 3区分化
 8. templates/dev-system.yaml 新規追加
 9. scripts/\*\* 全体を R2.1.1 §2 / §6.10 の実装サンプルで書込
10. 最終検証コマンド実行

推定工数: 60-90分（15ファイル程度、合計 \~3,000行の書込）

---

## §10. 検証コマンド（本R2.1.1 ファイル自体の検証）

```sh
# 行数確認
wc -l lais/verify/dev_system_v34_r2_1_1_package.md
# 期待: 1,400-1,900 行

# 14クラスター網羅
grep -cE '^### §2\.(α|β|γ|δ|ε|ζ|η|θ|ι|κ|λ|μ|ξ)' lais/verify/dev_system_v34_r2_1_1_package.md
# 期待: 13（κ/λ が統合参照のみなので独立節表示）※ もしくは 14
```

# §C0-C6 設計の網羅
grep -cE '^### 3\.[1-7]' lais/verify/dev_system_v34_r2_1_1_package.md
# 期待: 7 (§3.1 §C0 〜 §3.7 §C6) + §3.8 書き込み手順 = 8

# PD-108 却下の記録
grep -c 'PD-108' lais/verify/dev_system_v34_r2_1_1_package.md
# 期待: 6以上

# 証跡パス evidence/<MISSION_ID>/ 統一確認
grep -c 'evidence/<MISSION_ID>/\|evidence/\$MISSION_ID/\|evidence/\${MISSION_ID}/\|evidence/<MID>/' lais/verify/dev_system_v34_r2_1_1_package.md
# 期待: 8以上（複数箇所で統一されているか）

# POSIX 修正サンプルの存在
grep -cE 'cut -c1-7|ENVIRON\["|awk.*BEGIN.*exit|<<EOF' lais/verify/dev_system_v34_r2_1_1_package.md
# 期待: 4以上

# ai_review.js 改修指示の存在
grep -c 'response_format.*json_object\|AI-REVIEW-JS-JSON-MODE-FIX' lais/verify/dev_system_v34_r2_1_1_package.md
# 期待: 3以上
```

**完了報告:** MISSION-ID: DEV-SYSTEM-V34-R2-1-1-PACKAGE (ADV G_45) / 差分パッケージ完成 / 14クラスター修正 + §C0-C6設計 + PD-108却下 + ai_review.js改修指示 / Code G_46 へ引き継ぎ 2ミッション（AI-REVIEW-JS-JSON-MODE-FIX + DEV-SYSTEM-V34-REVIEW-GOLDEN-R2）

---

## §15. 共通規範集（起動時要約版） — 確定 SSoT 埋込（dev_system_spec.md §21 と同期）

> 本節は dev_system_spec.md §21（§C0-C6）の確定 SSoT を逐語埋込。PATCH-10/12/14/16/18/19 反映済の最新版。
> 本パッケージ単独で v3.4 設計の全容を把握できるよう、SSoT を本節に転記する（dev_system_spec.md と内容齟齬がある場合は dev_system_spec.md を優先）。

### §15.1 §C0 起動時要約（毎セッション必須Read）

**dev-system v3.4 の核心 = ソロ開発者がこのシステムに沿えば高品質な成果を継続的に出せるよう、How まで含めて体制・フロー・ゲート・責務を定義したもの。**

#### §C0.1 3層構造
| 層 | 担当 | 主要責務 |
|---|---|---|
| PO（ふとし）| 経営判断 | 「何を作るか」決定 + 承認のみ |
| ADV（Claude.ai / Desktop Code）| アドバイザー | 仕様・AT・DC書込・ENG検証 |
| ENG（Claude Code）| 実装者 | 実装・テスト・デプロイ・レポート |

#### §C0.2 鉄則（トップ5、詳細は §C1）
1. 品質維持最優先（スピードより品質）
2. 実装は ENG 全委任（ADV はコード書かない）
3. 仕様変更 = 影響範囲チェック + CLAUDE.md 更新
4. 判断 → 根拠提示（推奨案 + 理由）
5. 方針違反 → ルール追加（再発防止）

全15鉄則は §C1 参照。

#### §C0.3 変更フロー 6ステップ（詳細は §C2）
Step 1 仕様確定 → Step 2 モックアップ → Step 2.5 AT記述 → Step 3 キュー登録 → Step 4 ENG実装 → Step 5 G9検証 + C2デプロイ + PO確認

#### §C0.4 品質ゲート G1-G17（詳細は §C3）
| G番号 | 名称 |
|---|---|
| G1 | バージョン同期 |
| G2 | UI開発補助（DOM API、自己診断のみ）|
| G3 | テスト項目数照合 |
| G4 | テスト全PASS |
| G5 | 報告フォーマット（禁止語12語）|
| G6 | デプロイパイプライン |
| G7 | 仕様↔完了コマンド対応 |
| G8 | TDD証跡（unit/e2e 限定）|
| G9 | UIスクショ判定 |
| G10 | シークレットスキャン + shellcheck 拡張 |
| G11 | Step 0 参照漏れ検出 |
| G12 | 提案ログ形式・滞留日数検証 |
| G13 | pre-commit フック発火確認 |
| G14 | 仕様書ファースト |
| G15 | TDD 証跡名 仕様↔実装同期（unit/e2e 限定）|
| G16 | デプロイ hash 埋込検証 |
| G17 | realworld 証跡（正規化後）|
| G18 | サブエージェント外部レビュー結果検証（PATCH-21、Phase 1 MVP）|

#### §C0.5 STATUS 5状態モデル（PD-109。詳細は §C3.2）
QUEUED → IN_PROGRESS → READY_FOR_DEPLOY → DONE（BLOCKED は例外）

#### §C0.6 C2 デプロイフロー 12ステップ（詳細は §C4）
MISSION_ID 解決 → BUILD → canopy → G8 → G16 → Hフロー承認 → L1 → L2 → deploy → hash poll → G17 → STATUS→DONE + logs/deploy.log

#### §C0.7 PO決定済み（詳細は §C5）
PD-001〜110 のうち直近重要:
- PD-104: 役割別 Read 分離
- PD-105: 高リスク（auth/payment/external）は厳格化
- PD-106: Hフロー発火 = git diff 機械判定
- PD-107: §C0 必須 + §C1-C6 条件付き
- PD-108: ADV 書込可拡張却下（既存鉄則②維持）
- PD-109: STATUS 5状態 + BLOCKED 手動例外 + STATUS_CORRECTION 逆方向遷移（ADV/PO 限定、PATCH-12）
- PD-110: Hフロー承認主体は ADV/PO 限定 + 二重証跡（PATCH-14）

#### §C0.8 絶対禁止（詳細は §C6）
canopy項目削除 / 契約無断変更 / grep確認のみで「完了」/ ログ確認前の投機的修正 / 分母なしALL PASS / 対象ファイル外変更 / TDD証跡なし完了 / コードへのシークレット埋込

### §15.2 §C1 設計原則 & 鉄則（既存 §1 + §3 の要約、§1-§3 正本不変）

#### §C1.1 設計原則（既存 §1.1）
1. **品質最優先** — スピードのために品質を犠牲にしない
2. **自動化最大** — PO の手動作業を承認のみに最小化
3. **機械可検証** — ルールは可能な限りスクリプト/ゲートで自動検証
4. **Single Source of Truth** — 各情報の正規ソースを1箇所に限定

#### §C1.2 鉄則15個（既存 §3、WHY 付き1行要約）

| # | 鉄則 | WHY |
|---|---|---|
| ① | 品質維持最優先 | スピードのために品質を犠牲にしない |
| ② | 実装は ENG 全委任 | ADV はコードを書かない。ミッション定義のみ |
| ③ | 仕様変更時は影響範囲チェック → CLAUDE.md 更新 | 連鎖更新の漏れ防止 |
| ④ | 判断し根拠を示す | 推奨と理由を述べる |
| ⑤ | 方針整合性自己チェック | 過去方針と矛盾する提案をしない |
| ⑥ | 方針違反 → ルール追加 | 再発防止ルールをリポジトリに追加 |
| ⑦ | コードは読まない。ミッション定義のみ | PO はコードレビューしない |
| ⑧ | 事実確認せずに断言禁止 | 推測で「確定仕様」を出さない |
| ⑨ | UI検証はスクショ画像判定 | DOM API（hasClass等）禁止 |
| ⑩ | ミッション定義セルフチェック | 曖昧な完了条件は ENG の誤完了を生む |
| ⑪ | 操作フロー確認 | 中断/キャンセル/戻り先の未定義を防止 |
| ⑫ | セッション終了時の未書き込みチェック | 「次回やる」禁止 |
| ⑬ | レビュー修正 ≠ 仕様変更 | PO 承認済み仕様（テーマ/画面/プラン/機能）は変えない |
| ⑭ | ルールを曲げるな、変えろ | 効率化で「今回だけ無視」禁止。ルールが不適切なら更新してから従う |
| ⑮ | シークレットをコードに書くな | APIキー等は環境変数（.env/.dev.vars）で管理。G10 検証 |

#### §C1.3 曖昧用語禁止リスト（12語、既存 §3）
「確認した」「表示されている」「正常に動作」「問題なし」「対応済み」「修正済み」「実装済み」「開いている」「閉じている」「存在する」「反映されている」「変化した」
代替: 「スクショ前：○○ → スクショ後：△△」等、具体的事実。

#### §C1.4 移行マップ（§3 → §C1 対応）

| 旧 §3 鉄則 | 新 §C1 位置 | 変更種別 |
|---|---|---|
| ①〜⑮ | §C1.2 表 | **要約**（WHY付き1行要約、既存 §3 を正本維持）|
| 曖昧用語12語 | §C1.3 | **継承**（§3 原文をそのまま維持）|

#### §C1.5 用語 SSOT（鉄則/規範/ルール/原則/方針の語定義、PATCH-10 / R3-H-02 対応）

仕様書・サブ仕様書・development_rules.md・ミッション定義の各所で多用されてきた5語を本表で一意に定義する。本表が唯一の SSOT。他箇所で独自定義を再掲しない（異なる定義での記述は構造矛盾として §10 検証で FAIL）。

| 用語 | 定義 | スコープ | 正本 | 用例 |
|---|---|---|---|---|
| **設計原則 (Design Principles)** | 仕様書全体の方向性を決める上位思想。4項目（品質最優先 / 自動化最大 / 機械可検証 / Single Source of Truth）| 仕様書・開発体制全般 | §C1.1 + 既存 §1.1 | 「本修正は設計原則『機械可検証』に反する」 |
| **鉄則 (Ironclad Rules)** | ENG/ADV が日常的に遵守すべき非交渉の運用ルール15個。番号付与（①〜⑮）| ENG/ADV の作業時 | 既存 §3（正本）/ §C1.2（WHY付き要約）| 「鉄則⑧『事実確認せずに断言禁止』に従う」 |
| **規範 (Protocol/Code)** | 特定の役割・クラスターに固有の行動規範。仕様書のクラスター節として埋込 | 役割固有（ADV/ENG/PO）| §2.X クラスター節（例: §2.25 ADVcrit）| 「ADV 行動規範 §2.25.1 は非交渉」 |
| **ルール (Rules)** | 鉄則から派生する具体操作手順。日常運用レベルの指示書 | 実装・運用の手順 | development_rules.md（C1/C2/.../G1/G2/...）| 「C2 デプロイフロー 12ステップ」「G4 リンティング基準」 |
| **方針 (Policy)** | PO が確定した上位戦略的決定（PD-001〜110）。仕様書全体を貫く | プロダクト全体 | docs/po-decisions.md + 各節の §5 等 | 「PD-107 方針により §C0 は必須 Read」 |

**機械チェック**: `scripts/terminology_lint.sh`（G10 拡張）で上記5語のうち 2語以上を同一段落内で並列使用する場合、本表への相互リンク（§C1.5 参照）が欠落していれば WARN。

**5語の関係図（継承関係）:**
```
設計原則（思想、4個）
  ↓ 具体化
鉄則（日常遵守、15個）
  ↓ 操作化
ルール（手順、C1-C20/G1-G17）
  ↓ 役割固有
規範（クラスター固有、§2.X crit）
  ↑ 戦略決定
方針（PD-001〜110、PO 確定）
```

**この5語以外の類義語使用禁止:** 「原則」「掟」「ポリシー」「プロトコル」「ガイドライン」等は本5語のどれかに置換する（§10.11 用語混在検知で FAIL、PATCH-19 Bug G で grep 排除パターン縮小: code/Protocol/Policy/Rules + §/sub_*.md は除外）。

既存 §3 は参照用として残存。§C1 は要約版のため、矛盾発生時は §3 優先。

### §15.3 §C2 変更フロー（既存 §2 の要約、§2 正本不変）

全ての仕様変更・機能追加・バグ修正は本フローに従う。

#### §C2.1 6ステップ
```
Step 1: 仕様確定（ADV↔PO）
  ADVが仕様整理 → 影響範囲・コスト・リスク分析 → PO承認
  連鎖更新は §18 依存関係マップに従う

Step 2: モックアップ作成・承認
  UI変更なら ADV がモックアップ作成 → PO 目視承認
  モックアップは原本（SSoT）。手動再構築禁止

Step 2.5: AT（受入テスト）内容・合格基準記述
  ADV が AT 内容を記述（§5 ATテンプレート準拠）
  ENG は spec.ts にコード化（AT 内容を勝手に変えない）
  WHY: Code に任せると「自分の実装が通るテスト」を書く

Step 3: キュー登録
  ADV が session_progress.md にミッション定義を書込

Step 4: ENG 実装
  G8 テストファースト: AT 全 FAIL 確認 → 実装 → 全 PASS
  TDD 証跡: evidence/MISSION-ID/before-unit.json(RED) + after-unit.json(GREEN)
  1コンポーネント 300行以内（max_lines_lint.sh）
  対象ファイル外変更禁止（changed-files-allowlist.sh）

Step 5: G9 検証 + C2 デプロイ + PO 最終確認
  スクショ画像判定 → C2 デプロイフロー 12ステップ（§C4）→ PO 実機確認
```

#### §C2.2 操作フロー確認（毎回必須）
- ユーザーが開始する操作は何か
- ユーザーが中断/キャンセルする手段はあるか
- 操作完了後に元の画面に戻るか

#### §C2.3 Hフロー（統合フローレビュー、PD-106/110 + PATCH-14）
- 発火条件: scripts/lib/risk_patterns.sh の RISK_PATHS に該当するファイル変更
  - src/auth/, src/payment/, src/services/supabase.ts, src/services/external/ 等（PATCH-23 で 10 項目化、app_config.yaml 同期）
- 発火判定: hflow_trigger_check.sh が git diff で自動判定（CONTEXT: pre-commit/pre-push/deploy）
- 承認主体: **ADV または PO のみ**（PD-110）。ENG 自己付与禁止
- 承認証跡: instructions/approvals/<MISSION_ID>.hflow.approved（JSON、§C4.5 参照）
- 二重証跡（PATCH-14）: session_history_ref + approval_git_author + HEAD sha の3層検証
- deploy.sh が承認ファイル存在 + commit_sha 一致を検証
- 詳細: sub_hflow_protocol.md（§6.4 参照）

### §15.4 §C3 品質ゲート & テスト戦略（既存 §4 + §5 + §7 の要約）

#### §C3.1 ゲート一覧 G1-G17（§C0.4 表）
詳細実装: dev_system_spec §4.1 完全表 + sub_infrastructure §2.6 canopy_common.sh / §2.* 各ゲートスクリプト

#### §C3.2 STATUS 5状態モデル（PD-109 正本）

| STATUS | 遷移条件 | 遷移主体 |
|---|---|---|
| QUEUED → IN_PROGRESS | 初回コミット | ENG（canopy pre-commit hook）|
| IN_PROGRESS → READY_FOR_DEPLOY | cmd-unit AND cmd-e2e PASS（N/A 明示含む）+ G8 RED→GREEN 最低1種類 | canopy::check_test_pass |
| READY_FOR_DEPLOY → DONE | deploy.sh 成功 + G17 PASS | deploy.sh |
| IN_PROGRESS → DONE | `no_deploy:true` + cmd-unit AND cmd-e2e PASS（N/A 明示含む）| canopy::check_test_pass（READY_FOR_DEPLOY 経由せず）|
| * → BLOCKED | 外部障害・ツール故障等で続行不能 | ENG 手動（「**BLOCKED 理由:**」行必須）|
| DONE / READY_FOR_DEPLOY / IN_PROGRESS → 前状態（4種逆方向） | AI 誤判定の事後訂正 | **ADV / PO のみ**（`canopy_common.sh::correct_status()` 経由、`instructions/status_corrections.log` 記録必須、ENG 独断禁止）— 下記 STATUS_CORRECTION 例外規定参照（PATCH-12 / PATCH-19 Bug L 表組同期）|

**BLOCKED 例外規定:**
- ENG は IN_PROGRESS 中に外部依存障害・ツール故障・スクリプトバグ等で続行不能と判断した場合のみ手動遷移可
- session_progress.md 該当ブロックに「**BLOCKED 理由:** <理由>」の行を STATUS 直下に追記（必須）
- BLOCKED 解除も ENG 手動。「**BLOCKED 解除:** <日時> <理由>」を追記
- canopy::check_blocked_integrity が BLOCKED without reason を検出し FAIL
- BLOCKED 以外の STATUS 手動書換えは禁止（鉄則⑭「ルールを曲げるな、変えろ」）

**STATUS_CORRECTION 例外規定（PATCH-12、PD-109 拡張）:**
- ADV/PO は canopy_common.sh::correct_status() 経由で逆方向遷移を実行可
- 許容遷移: DONE→READY_FOR_DEPLOY / DONE→IN_PROGRESS / READY_FOR_DEPLOY→IN_PROGRESS / IN_PROGRESS→QUEUED（4種）
- 全履歴を instructions/status_corrections.log に記録。本ログは ADV書込可、ENG書込不可（changed-files-allowlist.sh で制約）
- ENG の独断逆方向書換えは禁止（correct_status の caller_role=ENG は関数内 exit 1）
- BLOCKED への correct_status は禁止（BLOCKED は正規例外遷移であり誤判定対象外）

#### §C3.3 ミッション定義テンプレート（既存 §5、PD-109/110 + PATCH-16 反映版）

```markdown
### MISSION-ID: タイトル
> リスク: 🟢低 / 🟡中 / 🔴高
> 参照: docs/xxx.md（フルパス列挙）
> 対象ファイル: src/xxx.js（変更可ファイル列挙。changed-files-allowlist.sh で検証）

- **STATUS:** QUEUED
- **ui_change:** true | false
- **no_deploy:** false
- **risk_tags:** auth, payment   # R3-H-11/PATCH-16、該当なしは行省略可（G17 SSOT）

**目的:** 1行

**プリフライト:**
  wc -l docs/xxx.md

**AT（ADV記述。ENGはspec.tsにコード化）:**
AT-N: テスト名
  前提: （必須）
  操作: ユーザー操作
  期待: スクショで確認できる期待結果
  検証: スクショで見えるべきもの
  否定検証: スクショで見えてはいけないもの
  データ検証: リロード後の永続化
  スクショ: 撮影タイミング
  RED: ☐
  GREEN: ☐

ストレスパス: 主要操作 3回連続、最後も正常

**完了コマンド（リスク別3区分、§C3.4 SSOT）:**
  cmd-unit: <コマンド | N/A（理由）| SKIP（理由+リトライ）>
  cmd-e2e: <コマンド | N/A | SKIP>
  cmd-realworld: <high のみ必須。low/mid 省略可>

**FAIL条件:** cmd-N いずれかが非ゼロ終了
**完了報告:** MISSION-ID: cmd-N PASS/FAIL + AT 各結果 + スクショ枚数 + evidence/ 一覧
```

#### §C3.4 L1/L2/L3 と cmd-3区分 SSOT（R2.2 §3.4 埋込版、§7 正本）

層定義実行媒体必須ゲートL1 スモーク起動+認証+主機能1+主機能2/API+永続化の5項目cmd-e2e @smoke or cmd-realworldG4, G17（realworld時）L2 影響範囲変更ファイル周辺cmd-unit + cmd-e2eG8L3 フル全テスト（週次）cmd-unit + cmd-e2eG4

cmd-3区分:

- cmd-unit: 全ミッション必須（N/A 許容: unit 対象ゼロ時）
- cmd-e2e: 全ミッション必須（N/A 許容: UI変更なし時）
- cmd-realworld: high リスクのみ必須、low/mid は行省略可

**SKIP の厳密分離（PATCH-9 / R3-H-03）:** SKIP は「仕様上は対象だが何らかの理由で一時スキップ」を意味する。N/A（対象外）とは区別する。SKIP-RETRY カウンタ付き、3回目で BLOCKED。

#### §C3.5 G8 TDD 証跡
- evidence/<MISSION_ID>/before-unit.json（.stats.unexpected > 0 で RED 確認）
- evidence/&lt;MISSION_ID&gt;/after-unit.json（.stats.unexpected == 0 で GREEN 確認）
- e2e も同様
- realworld は G8 対象外、G17 が所管（§C4 参照）

#### §C3.6 G9 UIスクショ判定

- evidence/&lt;MISSION_ID&gt;/before_AT-N.png, after_AT-N.png
- 前後一致（バイナリ同一）= FAIL
- hasClass/getAttribute 等 DOM API 判定禁止（鉄則⑨）

### §15.5 §C4 デプロイ & デバッグ（既存 §8 + §9 の要約）

#### §C4.1 C2 デプロイフロー 12ステップ（§C0.6 の詳細）

| Step | 内容 | ゲート | 失敗時 |
|---|---|---|---|
| 0 | MISSION_ID 解決 + extract_mission_block + STATUS 検証 + 直近 STATUS_CORRECTION 通知（PATCH-12） | — | exit 1 |
| 1 | version_sync + bump commit + eval "$BUILD_CMD" | — | exit 1 |
| 2 | tests/smoke/canopy.sh（G1-G10 + check_test_pass）| G1-G10 | exit 1 |
| 3 | G8 TDD 証跡検証（canopy 内）| G8 | exit 1 |
| 4 | G16 deploy_hash_verify.sh（dist/ にcommit sha埋込）| G16 | exit 1 |
| 5 | Hフロー承認ゲート（§C4.5、verify_approval_authenticity.sh）| — | exit 1 |
| 6 | L1 スモーク（playwright @smoke、extract_cmd.sh cmd-e2e SSOT）| G4 | exit 1 |
| 7 | L2 影響範囲（affected-tests.sh）| G4 | exit 1 |
| 8 | wrangler pages deploy | — | append_deploy_fail + exit 1 |
| 9 | deploy_poll_hash.sh（URL hash 検証）| G16 | append_deploy_fail + exit 1 |
| 10 | normalize_realworld_report + G17 proof_check（high のみ）| G17 | append_deploy_fail + exit 1 |
| 11 | STATUS → DONE 書換え | — | — |
| 12 | logs/deploy.log 追記 + STRIKE クリア + git tag | — | — |

実装: sub_infrastructure.md §2.8 deploy.sh 完全版（PATCH-20 で 12 Step + scripts/ 22 本実装、PATCH-26 で Phase 3 cost_usd 拡張）。

#### §C4.2 デプロイリトライ（STRIKE カウンタ、PATCH-13 / R3-H-08）
- instructions/deploy_strikes.json に MISSION_ID → 試行回数
- STRIKE 1 回: STATUS=BLOCKED（`DEPLOY_STRIKE_1_REVIEW_REQUIRED`）。**自動 DEPLOY-RECOVER 生成なし**。ADV がレビュー後、BLOCKED 解除 + DEPLOY-RECOVER 手動起票 or correct_status で IN_PROGRESS 戻し
- STRIKE 2 回: STATUS=BLOCKED（`DEPLOY_STRIKE_2_PO_ESCALATION`、PATCH-19 §3.6 で「通知のみ」記述に整合）。PO 承認ファイル要求
- STRIKE 3 回以上: PO 明示承認（instructions/approvals/<MID>.strike_override.json）なしでは再実行拒否
- DEPLOY-RECOVER プレフィックス重畳防止（§C4 実装）

#### §C4.3 ロールバック（既存 §8 incident_runbook）
- scripts/rollback.sh: 直近タグへ revert commit で戻す（clean state 保証）
- L1 FAIL 即 rollback、本番エラー率 3倍以上 で rollback + PO 報告

#### §C4.4 デバッグ 4フェーズ（Systematic Debugging、既存 §9）

| Phase | 名称 | 内容 | 禁止 |
|---|---|---|---|
| 1 | 証拠収集 | エラーログ → データフロー → 再現手順 | 修正コード記述 |
| 2 | 仮説構築 | 最大3仮説、各検証方法1行 | 検証方法なき仮説 |
| 3 | 仮説テスト | 1つずつ検証、複数同時変更禁止 | 複数同時変更 |
| 4 | 修正+テスト | バグ再現テスト → FAIL → 修正 → PASS → 回帰 | テストなき修正 |

修正試行 3回制限: 同一バグ → 3回失敗 → HOLD → ADV エスカレーション。
デバイス依存バグ: 静的解析のみで断言禁止（鉄則⑧）。シミュレーター/実機で確認。

#### §C4.5 Hフロー承認ゲート（PD-110 + PATCH-14 二重証跡 + R2.2 §3.5 SSOT 埋込版）

発火判定: scripts/hflow_trigger_check.sh が CONTEXT 別に git diff を取得、RISK_PATHS prefix match。

承認証跡: instructions/approvals/<MISSION_ID>.hflow.approved
```json
{
  "approver": "ADV" | "PO",
  "approver_name": "claude_ai_G_XX" | "desktop_code_adv_G_XX" | "futoshi",
  "date": "2026-04-23T10:15:32Z",
  "mission_id": "MISSION-ID",
  "commit_sha": "abc1234...",
  "session_history_ref": "instructions/results/session_history.md#G_NN_LNNN",
  "approval_git_author": "claude_ai <noreply@anthropic.com>",
  "trigger_reason": "src/auth/** 変更",
  "notes": "..."
}
```

二重証跡検証（PATCH-14、R3-H-09）:

1. 承認ファイル存在 + JSON スキーマ妥当性
2. session_history_ref の行アンカー実在
3. approval_git_author ドメインマッチ（`*claude_ai*|*claude@*|*anthropic*|*noreply@anthropic.com|*noreply@github.com` or PO メール。PATCH-19 / Bug H で `noreply@github.com` 追加: Desktop Code ADV が GitHub 経由で commit する場合の author 識別子に対応）
4. HEAD sha == commit_sha

`scripts/verify_approval_authenticity.sh` が [deploy.sh](http://deploy.sh) Step 5 で一括検査。いずれか失敗で exit 1。 app_config.yaml の hflow.enabled で全体オプトアウト可（ソロ開発者向け、§2.18 PD疑義2、PATCH-19 Bug F で OVERRIDE 引上げ修正）。

詳細フロー: sub_hflow_protocol.md

### §15.6 §C5 レビュー運用 & 棚卸し（既存 §13 + §14 + §15 の要約）

#### §C5.1 AIレビュー基盤

- 対象: 仕様書 / 設計判断 / コード品質 / テスト戦略
- 2プロバイダー（GPT-5/5.4 + Gemini 2.5/3.1 Pro）+ Code Pre-Review
- 結果フォーマット: JSON { id, severity, category, location, issue, spec_reference, suggestion }

#### §C5.2 severity 定義（sub_review_flow §1.5.1 準拠）

- CRITICAL: 仕様との明確な矛盾 / セキュリティ脆弱性 / データ破壊 / ブランドDNA違反
- HIGH: 判断必要。技術事実に基づき修正要否を判定できないもの
- MEDIUM: 改善余地あり、機能影響なし
- LOW: 好みの問題

severity inflation 対策: 構造的問題解消後のエッジケース過剰評価を棄却（§13.9）。

#### §C5.3 7種別フロー（A-G + H、詳細は sub_review_flow §4）

フロー対象ペルソナ主審Aデザインモックアップ6web_designer + color_coordinatorBアプリ仕様8pm + ux_researcherCdev-system5devops_engineer + solo_devD実装6code_reviewer + security_engineerE技術文書3全員Fテスト仕様3全員Gプロンプト3全員H統合フローレビュー6code_reviewer + security_engineer（Hフロー発火時、PD-110）

#### §C5.4 レビュー上限 SSOT（βcrit' 対応）

**sub_review_flow §1.7 を正本とする:**

- 主審diffラウンド: 最大4回
- Pre-Reviewラウンド: 最大3回
- ゴールデンレビュー: 最大2回
- 超過 → PO エスカレーション

本 §C5 は独自定義せず、sub_review_flow §1.7 を参照する形式。

#### §C5.5 7段階フィルター（sub_review_flow §2）

Filter 1 事実確認 → 2 仕様照合 → 3 既決定チェック → 4 スコープ判定 → 5 再現性（合意度）→ 6 影響度 → 7 修正影響範囲

#### §C5.6 Learned Patterns（§13.16）

- docs/learned-patterns.md に蓄積
- 2ミッション以上で再出現した指摘のみ追記（予防適用成功も再出現にカウント）
- ゴールデンCRITICAL 0達成後に全指摘（severity不問）を照合

#### §C5.7 ENG自律判定 3ペルソナ制（§13.17）

ADV（判断）→ QA（ルール検証）→ PO代理（方針検証）の3者合議。不合意 → PO エスカレーション。 判断テーブル: docs/po-decisions.md 参照。

#### §C5.8 棚卸し（5セッションごと）

1. [CLAUDE.md](http://CLAUDE.md) / development_rules.md / session_progress.md 整合性
2. session_progress.md ≤ 300行
3. development_rules.md 過度な肥大化なし
4. 提案ログ未処理確認
5. ルールファイル間矛盾チェック
6. [CLAUDE.md](http://CLAUDE.md) 改善提案
7. dev-system 逆流すべき教訓確認
8. metrics.jsonl トレンド → 改善提案1件以上
9. 技術負債比率 30% 超で負債返済スプリント

### §15.7 §C6 構造的制約 & セキュリティ（既存 §16 + §20 の要約）

#### §C6.1 構造的制約（既存 §16）

- 修正試行 3回制限（§9.2）
- session_progress.md 300行以内（session_archiver.sh で自動アーカイブ）
- ホットフィックスパス: ux_v\*.md 機能不変 + 対象2ファイル以内 + 1セッション2件 + 合計≤4ファイル
- エラー報告テンプレート: 問題 / 構造的原因 / 再発防止策 / 反映先（「忘れた」「間違えた」禁止）

#### §C6.2 絶対禁止（§16.5、正本）

- canopy 項目削除（追加は可、削除は PO 承認必須）
- 契約変更（[CLAUDE.md](http://CLAUDE.md) 無断変更）
- UI 変更を grep 確認だけで「完了」
- ログ確認前の投機的修正
- 分母なしの「ALL PASS」「全件完了」報告
- 対象ファイル外変更（[changed-files-allowlist.sh](http://changed-files-allowlist.sh) で FAIL）
- TDD 証跡なしの完了報告（evidence/ に before/after 必須）
- コードへのシークレット埋込（G10 で検出）

#### §C6.3 シークレット管理（既存 §20）

- APIキー・サービスキー・秘密鍵 = 環境変数（.env / .dev.vars）
- .env\* → .gitignore（.env.example 除外）
- DC の deny リストに .env\* / .dev.vars / \*.key / \*.pem
- G10 で正規表現検出（sk-*, AIza*, ghp\_\*, BEGIN PRIVATE KEY 等）
- v3.4 拡張: G10 に shellcheck_lint.sh（εcrit'）を統合

#### §C6.4 POSIX 互換規約（全スクリプト共通、§3.7 SSOT）

- 全新設スクリプトは `#!/bin/sh` シバン
- 禁止構文: `[[ ]]`, `${arr[@]}`, `<()`, `mapfile`, `(( ))`, `${var:0:7}`, `\<`/`\>`, GNU date単独, sed -i 系
- shellcheck --shell=sh --severity=error を pre-commit で強制（G10 拡張）

#### §C6.5 runtime 依存集約（PATCH-15 / R3-H-10、§3.7 拡張）

- `scripts/lib/runtime_preflight.sh` が python3 / jq / yq の存在を一括検査（`require_dev_system_runtimes` 関数）
- [deploy.sh](http://deploy.sh) / [canopy.sh](http://canopy.sh) 冒頭で `source` して呼出し、個別 `command -v` は廃止
- いずれか不在時は exit 1 + 不足ツール列挙

---

## §16. PATCH-19〜27 履歴記録（CHAIN-UPDATE-DISPATCH 〜 V35 Phase 3）

> 本節は [patches.md](http://patches.md) PATCH-19〜27（2026-04-23〜2026-04-25）の AFTER 内容と 3ペルソナ合議結果を本パッケージに集約。 v3.4 仕様（PATCH-1〜18）確定後の連鎖実装フェーズ + V35 Phase 1-3 拡張の記録。

### §16.1 PATCH-19: PART1 着手前バグ修正一括（Code G_50 / Desktop Code ADV G_48、2026-04-23）

**背景**: CHAIN-UPDATE-DISPATCH PART1 完遂直後の Code 内部検証で発見された 10 件のバグ修正。

**Bug 一覧（10件）**:

Bug重要度領域修正内容ACRIT§6.4 sub_adv_protocol §11STATUS_CORRECTION 手順 新設（PATCH-12 波及）+ instructions/status_corrections.log 書込リスト追加BCRIT§6.2 canopy_common.sh 関数追加列5番目に correct_status 明示（PATCH-12 反映）CHIGH§6.4 sub_adv_protocol §11同 A（STATUS_CORRECTION 手順記述）DHIGH§6.9 templates/risk_tags（PATCH-16）+ session_history_ref / approval_git_author / commit_sha（PATCH-14）必須フィールド明記EHIGH§6.10 22 本拡張step0_lint / verify_hooks / spec_first_lint + extract_cmd / verify_approval_authenticity / terminology_lint / lib/runtime_preflight 追加FHIGH§2.4 append_deploy_fail.shOVERRIDE 変数を if 外部に引き上げ（set -eu 対応、Bug F 修正）GHIGH§10.11 terminology_lintgrep 排除パターン縮小（code/Protocol/Policy/Rules + §/sub\_\*.md は除外）HHIGHapproval_git_author`*noreply@github.com` 追加（Desktop Code ADV の GitHub 経由 commit 対応）IMED§3.6 STRIKE 2 記述「通知のみ」に整合（PATCH-13 との同期）JMED§0.1 クラスター数「+4=26 クラスター」累計注記（PATCH-7/12/18 増分、§1.2 22 は歴史表記として残存）KMED§6.12 pre-pushverify_hooks.sh 結線追加LMED§C3.2 STATUS 表STATUS_CORRECTION 行追加（§21 §C4.5 と同期）

**§2.25 ADVcrit クラスター新設**: PATCH-18 由来の §2.25.1〜§2.25.8 を本パッケージ §2.25 に新設（本ファイル §2.25 参照）。

**3ペルソナ合議**: §7.3 CRITICAL 定義「Howの欠落」に Bug A/B/F が該当（スクリプト実装時に参照不能 or 実行失敗）。§7.4 既棄却テーマ衝突ゼロ（PD-104-108 / PD-109/110 / §C0-C6 分量のいずれとも無関係）。Bug L は PATCH-1 / PATCH-12 の自然な可視化改善で、PART1 §C3.2 の表に行を追加しただけで新規思想の導入ではない。**合意**: 採用。

**注記**: PATCH-19 のリネーム指示（仮にあった場合）はスキップ、§2.25 新設 + 上記 12 Bug 修正のみ反映。

### §16.2 PATCH-20: PART2 連鎖実装（sub_infrastructure §2.6/§2.8 + scripts/ 22 本、Code G_50、2026-04-24）

**背景**: PATCH-19 までで確定した v3.4 仕様の実装反映フェーズ。内容妥当性は PATCH-1〜19 で CRITICAL 0 達成済。

**実装 22 本（scripts/）**: §2.4 append_deploy_fail / §2.7 realworld_proof_check / §2.9 proposal_log_lint / §3.4 extract_cmd / §3.5 verify_approval_authenticity / §C1.5 terminology_lint / §3.7 lib/runtime_preflight 等を含む 22 本。本 §6.10 で完全リスト掲載（後述）。

**§2.6 canopy_common.sh 関数 5 種**: update_status / check_test_pass / check_blocked_integrity / wait_for_lock / **correct_status**（4 種逆方向遷移、ADV/PO 限定、status_corrections.log 7 列追記、PATCH-12）。

**§2.8 [deploy.sh](http://deploy.sh) 12 Step**: 上記 §C4.1 表参照。

**Stage 2 Pre-Review 1R/2R**: Stage 1 で混入した独自改変 2 箇所（`2>/dev/null || true`）の除去 + stub 2 本新設 + [canopy.sh](http://canopy.sh) 物理反映を実施、CRITICAL 0 達成。

**3ペルソナ合議**: ADV/QA/PO代理 全員合意。v3.4 仕様（R2.2 本体）は PATCH-1〜18 + Pre-Review 4R/5R で CRITICAL 0 確定済み、本 PATCH-20 は連鎖更新の実装フェーズ。§2.25.1 仕様書駆動原則に従い、v3.4 本体から逐語転記（推測・改変なし）。

### §16.3 PATCH-21: PART3 ENG 領域 + Bug PART2-S2-01 修正 + G18 新設（Code G_51、2026-04-25）

**G18 新設**: サブエージェント外部レビュー結果検証ゲート（V35 Phase 1 MVP 連動、§C0.4 G ゲート表に追加）。

**Bug PART2-S2-01 修正**: PATCH-20 Stage 2 で発見されたバグ修正（具体内容は [patches.md](http://patches.md) PATCH-21 参照）。

**ENG 領域**: development_rules.md / .git/hooks 系の物理反映（PATCH-22 への前段階）。

### §16.4 PATCH-22: V35 Phase 1 MVP（pre-commit hook + ガードレール、Code subagent、2026-04-23）

**目的**: dev-system v3.5 サブエージェント外部レビュープロトコル Phase 1 MVP 実装。

**新設**:

- `.git/hooks/pre-commit` に外部レビュートリガー結線（RISK_PATHS hit 時に subagent 起動）
- `scripts/external_review_precommit.sh`（Phase 1 凍結ファイル）
- `scripts/external_review_guardrail.sh`（Phase 1 凍結ファイル）
- ガードレール: tokens / cost / time の閾値検証

**v3.5 ロードマップ参照**: docs/plans/dev_system_v35_roadmap.md

### §16.5 PATCH-23: RISK_PATHS SSoT 10 項目化（app_config.yaml 追加、Bug V35-P1-S2-03 対応、2026-04-25）

**修正**: scripts/lib/risk_patterns.sh の RISK_PATHS を 10 項目に拡張、app_config.yaml に同期定義を追加（SSoT 一本化）。

**10 項目**:

 1. src/auth/
 2. src/payment/
 3. src/services/supabase.ts
 4. src/services/external/
 5. src/services/api/
 6. src/services/storage/
 7. functions/api/auth/
 8. functions/api/payment/
 9. .github/workflows/
10. wrangler.toml / wrangler.json

**配線**: hflow_trigger_check.sh / external_review_guardrail.sh / external_review_postcommit.sh が共通参照。

### §16.6 PATCH-24: V35 Phase 2 実装（post-commit + subagent prompts + record_api 結線、Code subagent、2026-04-25）

**新設**:

- `.git/hooks/post-commit` に外部レビュー追加分結線
- `scripts/external_review_postcommit.sh`（Phase 2 凍結ファイル）
- subagent prompts ファイル（外部レビュー観点定義）
- record_api 結線（外部レビュー結果の Anthropic API record）

### §16.7 PATCH-25: Phase 2 Bug V35-P2-S2-01 解消（[postcommit.sh](http://postcommit.sh) 配列対応化、Code subagent、2026-04-25）

**修正**: external_review_postcommit.sh の配列対応化（Bash 配列 → POSIX 互換空白分割）。Phase 2 Stage 2 で発見されたバグ修正。

### §16.8 PATCH-26: V35 Phase 3 実装（cost_usd / spawn_subagent_review / Phase 3 運用定着、Code subagent、2026-04-25）

**新設**:

- `scripts/spawn_subagent_review.sh`（Phase 3 実装、claude CLI 経由）
- cost_usd メトリクス追加（external_review record_api と連動）
- ガードレール閾値の運用定着（過去30日メトリクス分析）

### §16.9 PATCH-27: Phase 3 CRITICAL-001 修正（spawn_subagent_review.sh claude CLI フラグ訂正、Code subagent、2026-04-25）

**修正**: spawn_subagent_review.sh の claude CLI 起動フラグ訂正:

- `--add-dir` 追加（subagent の作業ディレクトリ指定）
- `--allowedTools` 追加（subagent の実行許可ツール限定）

**経緯**: Phase 3 実装直後に発見された CRITICAL バグ。subagent が起動失敗していた。本修正で Phase 3 動作確定。

---

## §17. §6.10 scripts/ 29 本拡張（Phase 1-3 反映）

> PATCH-19 §6.10 22 本 + PATCH-20 で実装、PATCH-22/24/26 で Phase 1-3 拡張、合計 29 本。

### §6.10 scripts/ 一覧（番号付きリスト、SSoT）
> 連鎖更新監査（G18 / chain_update_audit.sh）対応のため、basename ベースで列挙。
> 配置パスは全て scripts/ 配下（lib/* は scripts/lib/* に配置）。

1. append_deploy_fail.sh — §2.4 / §3.6 / PATCH-13 / PATCH-19 Bug F（OVERRIDE if 外引上げ、STRIKE 1→BLOCKED_REVIEW、DEPLOY-RECOVER 自動生成廃止）
2. changed_files_allowlist.sh — §16.5 / §C6.2（対象ファイル外変更検出）
3. check_blocked_integrity.sh — §3.2 / §C3.2（BLOCKED 理由行 必須検証）
4. deploy.sh — §2.8 / §C4.1（12 Step デプロイフロー、PATCH-20 で完全実装）
5. deploy_hash_verify.sh — §3.3 / G16（dist/ commit sha 埋込検証）
6. deploy_poll_hash.sh — §3.3 / G16（URL hash 検証ループ）
7. extract_cmd.sh — §3.4 / PATCH-11（cmd-unit/cmd-e2e/cmd-realworld 抽出 SSOT）
8. extract_mission_block.sh — §3.1 / G11（session_progress.md からミッションブロック抽出）
9. hflow_trigger_check.sh — §C2.3 / PD-106（RISK_PATHS prefix match 発火判定）
10. lib/risk_patterns.sh — §C2.3 / PATCH-23（10 項目 RISK_PATHS SSoT）
11. lib/runtime_preflight.sh — §3.7 / PATCH-15 / R3-H-10（require_runtimes / require_dev_system_runtimes SSOT）
12. max_lines_lint.sh — §C2.1 / 300行制限（1ファイル 300行以内検証）
13. mission_risk_classifier.sh — §3.3 / G17（risk_tags + ui_change による高/中/低分類）
14. normalize_realworld_report.sh — §C4.1 Step 10 / G17（realworld 証跡の正規化）
15. post_deploy_status_update.sh — §C4.1 Step 11（STATUS → DONE 書換え）
16. pre_commit_status_check.sh — §C2 Step 4 / G13（QUEUED → IN_PROGRESS 自動遷移）
17. pre-commit-sub.sh — §C2 / G13（pre-commit サブルーチン）
18. proposal_log_lint.sh — §2.9 / PATCH-3（STALE_DATA use-after-rm 修正済の 1 回 awk パス）
19. realworld_proof_check.sh — §2.7 / §3.3 / PATCH-16（risk_tags SSOT 1:1、ui_change 条件化、epoch 数値比較）
20. secret_scan.sh — §C6.3 / G10（sk-*, AIza*, ghp_*, BEGIN PRIVATE KEY 検出）
21. shellcheck_lint.sh — §C6.4 / εcrit'（shellcheck --shell=sh --severity=error）
22. spec_first_lint.sh — §C2 / G14（仕様書ファースト検証、PATCH-19 Bug E で追加）
23. step0_lint.sh — §C4.1 Step 0 / G11（extract_mission_block 連動、PATCH-19 Bug E で追加）
24. lib/canopy_common.sh — §2.6 / PATCH-12 / PATCH-20（update_status / check_test_pass / check_blocked_integrity / wait_for_lock / correct_status）
25. lib/risk_match.sh — §C2.3 / γ'-1（is_risk_path 関数 SSoT）
26. verify_external_services.sh — §3.3 / 代替証跡（外部サービス疎通検証 + 代替証跡チェック）
27. verify_hooks.sh — §6.12 / G13 / PATCH-19 Bug K（pre-commit/pre-push hook 結線検証）
28. chain_update_audit.sh — PATCH-21（連鎖更新監査、CHAIN-UPDATE-DISPATCH 用）
29. resolve_target_mission.sh — §3.1 / PATCH-20（MISSION_ID 解決 SSOT）

**Phase 1-3 凍結ファイル（参照のみ、変更禁止）**:
- external_review_precommit.sh — PATCH-22 / V35 Phase 1
- external_review_guardrail.sh — PATCH-22 / V35 Phase 1
- external_review_postcommit.sh — PATCH-24 / PATCH-25 / V35 Phase 2
- spawn_subagent_review.sh — PATCH-26 / PATCH-27 / V35 Phase 3

### §6.11 scripts/ 詳細表（リファレンス、補足含む）

| # | スクリプト | 根拠 | 内容 |
|---|---|---|---|
| 1 | scripts/append_deploy_fail.sh | §2.4 / §3.6 / PATCH-13 / PATCH-19 Bug F | OVERRIDE if 外引上げ、STRIKE 1→BLOCKED_REVIEW、DEPLOY-RECOVER 自動生成廃止 |
| 2 | scripts/changed_files_allowlist.sh | §16.5 / §C6.2 | 対象ファイル外変更検出 |
| 3 | scripts/check_blocked_integrity.sh | §3.2 / §C3.2 | BLOCKED 理由行 必須検証 |
| 4 | scripts/deploy.sh | §2.8 / §C4.1 | 12 Step デプロイフロー（PATCH-20 で完全実装） |
| 5 | scripts/deploy_hash_verify.sh | §3.3 / G16 | dist/ commit sha 埋込検証 |
| 6 | scripts/deploy_poll_hash.sh | §3.3 / G16 | URL hash 検証ループ |
| 7 | scripts/extract_cmd.sh | §3.4 / PATCH-11 | cmd-unit/cmd-e2e/cmd-realworld 抽出 SSOT |
| 8 | scripts/extract_mission_block.sh | §3.1 / G11 | session_progress.md からミッションブロック抽出 |
| 9 | scripts/hflow_trigger_check.sh | §C2.3 / PD-106 | RISK_PATHS prefix match 発火判定 |
| 10 | scripts/lib/risk_patterns.sh | §C2.3 / PATCH-23 | 10 項目 RISK_PATHS SSoT |
| 11 | scripts/lib/runtime_preflight.sh | §3.7 / PATCH-15 / R3-H-10 | require_runtimes / require_dev_system_runtimes SSOT |
| 12 | scripts/max_lines_lint.sh | §C2.1 / 300行制限 | 1ファイル 300行以内検証 |
| 13 | scripts/mission_risk_classifier.sh | §3.3 / G17 | risk_tags + ui_change による高/中/低分類 |
| 14 | scripts/normalize_realworld_report.sh | §C4.1 Step 10 / G17 | realworld 証跡の正規化 |
| 15 | scripts/post_deploy_status_update.sh | §C4.1 Step 11 | STATUS → DONE 書換え |
| 16 | scripts/pre_commit_status_check.sh | §C2 Step 4 / G13 | QUEUED → IN_PROGRESS 自動遷移 |
| 17 | scripts/proposal_log_lint.sh | §2.9 / PATCH-3 | STALE_DATA use-after-rm 修正済の 1 回 awk パス |
| 18 | scripts/realworld_proof_check.sh | §2.7 / §3.3 / PATCH-16 | risk_tags SSOT 1:1、ui_change 条件化、epoch 数値比較 |
| 19 | scripts/secret_scan.sh | §C6.3 / G10 | sk-*, AIza*, ghp_*, BEGIN PRIVATE KEY 検出 |
| 20 | scripts/shellcheck_lint.sh | §C6.4 / εcrit' | shellcheck --shell=sh --severity=error |
| 21 | scripts/spec_first_lint.sh | §C2 / G14 | 仕様書ファースト検証（PATCH-19 Bug E で追加） |
| 22 | scripts/step0_lint.sh | §C4.1 Step 0 / G11 | extract_mission_block 連動（PATCH-19 Bug E で追加） |
| 23 | scripts/tdd_trace_consistency.sh | §3.5 / G15 | TDD 証跡名 仕様↔実装同期 |
| 24 | scripts/terminology_lint.sh | §C1.5 / PATCH-10 / PATCH-19 Bug G | 5語並列検知 + 排除パターン縮小 |
| 25 | scripts/verify_approval_authenticity.sh | §3.5 / PATCH-14 / PATCH-19 Bug H | 3層検証（session_history + git author + HEAD sha）+ noreply@github.com 対応 |
| 26 | scripts/verify_external_services.sh | §3.3 / 代替証跡 | 外部サービス疎通検証 + 代替証跡チェック |
| 27 | scripts/verify_hooks.sh | §6.12 / G13 / PATCH-19 Bug K | pre-commit/pre-push hook 結線検証 |
| 28 | scripts/version_sync.sh | §C4.1 Step 1 / G1 | バージョン同期 + bump commit |

**Phase 1-3 拡張（PATCH-22/24/26/27、追加 7 本）**:

| # | スクリプト | 根拠 | 内容 |
|---|---|---|---|
| 23. | scripts/lib/canopy_common.sh | §2.6 / PATCH-12 / PATCH-20 | update_status / check_test_pass / check_blocked_integrity / wait_for_lock / correct_status |
| 24. | scripts/chain_update_audit.sh | PATCH-21 | 連鎖更新監査（CHAIN-UPDATE-DISPATCH 用） |
| 25. | scripts/resolve_target_mission.sh | §3.1 / PATCH-20 | MISSION_ID 解決 SSOT |
| 26. | scripts/external_review_precommit.sh | PATCH-22 / V35 Phase 1 | pre-commit 外部レビュートリガー（Phase 1 凍結） |
| 27. | scripts/external_review_guardrail.sh | PATCH-22 / V35 Phase 1 | tokens/cost/time 閾値検証（Phase 1 凍結） |
| 28. | scripts/external_review_postcommit.sh | PATCH-24 / PATCH-25 / V35 Phase 2 | post-commit 外部レビュー記録（Phase 2 凍結、配列対応化） |
| 29. | scripts/spawn_subagent_review.sh | PATCH-26 / PATCH-27 / V35 Phase 3 | claude CLI 起動（--add-dir + --allowedTools フラグ訂正済） |

**注記**: 上記 No.28 の version_sync.sh と Phase 1-3 拡張の番号体系は重複しないよう、本表内では No.1〜28（PART2 22 本 + 6 本実装 = 28）と Phase 1-3 拡張 No.23〜29（重複あり）の二段表記。SSoT は実体 29 本（重複除去後）。Phase 1/2 凍結ファイル（external_review_precommit/guardrail/postcommit、spawn_subagent_review）は変更禁止（本ミッションでも触らない）。

---

## §18. v3.4 + V35 Phase 1-3 完成サマリー

### §18.1 v3.4 確定状態

- **クラスター数**: 22（α'〜ξ'）+ 4（§2.25 ADVcrit / §2.26 STATUScrit / PATCH-7 / PATCH-18）= 26 クラスター
- **§21 §C0-C6**: dev_system_spec.md §21 として確定（§4.1〜§4.7 に SSoT 埋込）
- **PD**: PD-001〜110（PD-109 STATUS_CORRECTION + PD-110 Hフロー二重証跡）
- **scripts/**: 29 本（PART2 22 本 + Phase 1-3 拡張 7 本、PATCH-19 Bug E で +5 を含む）

### §18.2 V35 Phase 1-3 状態

- **Phase 1 MVP**: PATCH-22 で確定（pre-commit hook + ガードレール、凍結）
- **Phase 2 実装**: PATCH-24 / PATCH-25 で確定（post-commit + subagent prompts + record_api、Bug V35-P2-S2-01 解消、凍結）
- **Phase 3 実装**: PATCH-26 / PATCH-27 で確定（cost_usd + spawn_subagent_review、CRITICAL-001 修正、運用定着）

### §18.3 PATCH 累計（28 PATCH、PATCH-1〜PATCH-27 + PATCH-18 別系統 = 28）

PATCH-1〜18: v3.4 設計確定（CRITICAL 0 達成）
PATCH-19: PART1 着手前バグ修正一括（10 件、§2.25 ADVcrit 新設含む）
PATCH-20: PART2 連鎖実装（sub_infrastructure + scripts/ 22 本）
PATCH-21: PART3 ENG 領域 + G18 新設
PATCH-22: V35 Phase 1 MVP
PATCH-23: RISK_PATHS 10 項目化
PATCH-24: V35 Phase 2 実装
PATCH-25: Phase 2 Bug V35-P2-S2-01 解消
PATCH-26: V35 Phase 3 実装
PATCH-27: Phase 3 CRITICAL-001 修正

### §18.4 SSoT 整合性

- **dev_system_spec.md §21**: 本パッケージ §15.1〜§15.7 と逐語同期（差分 0）
- **patches.md**: PATCH-1〜27 全件記録、本パッケージ §16.1〜§16.9 にサマリー転記
- **sub_*.md**: sub_adv_protocol §11 STATUS_CORRECTION（PATCH-12/19 Bug A）/ sub_hflow_protocol §C4.5 二重証跡（PATCH-14） / sub_review_flow §1.7 上限（§C5.4） を参照

---

## §19. 復元記録（Bug V35-P2-S2-03 解消）

### §19.1 復元背景

2026-04-25 12:00 頃、原因不明（推定: Edit ツール巨大ファイル不具合 or プロセス競合）で `lais/verify/dev_system_v34_package.md` が 8 bytes / 2 行に縮退。git untracked / Time Machine 未設定 / iCloud 同期外で OS バックアップ復元不可。PO 方針で patches.md + r2_1_1_package.md からの再構築を確定。

### §19.2 復元手順（PO 確定）

1. 起点: `lais/verify/dev_system_v34_r2_1_1_package.md`（94 KB、4/20、PATCH-1〜18 直前の v3.4 ベース確定）をコピー
2. PATCH-19 のリネーム指示は飛ばし、§2.25 新設のみ反映
3. PATCH-19〜27 の AFTER 内容を逐語反映（BEFORE/AFTER + 検証 + 3 ペルソナ合議の AFTER 部分）
4. 完成後: `docs/plans/dev_system_spec.md §21` と `§C0-C6` を照合
5. `lais/verify/dev_system_v34_package.md`（破損中）を上書き
6. `git add` + commit（再発防止、Bug V35-P2-S2-03 解消）

### §19.3 SSoT 整合性担保

- §21 §C0-C6 の SSoT は dev_system_spec.md。本パッケージ §15.1〜§15.7 はそこから逐語埋込。差分は §19.4 検証コマンドで確認。
- §2.25 / §2.26 クラスターは patches.md PATCH-12 / PATCH-18 から逐語反映。
- §16 PATCH-19〜27 履歴は patches.md の AFTER 内容を要約転記。

### §19.4 検証コマンド

```sh
# 行数（期待: 3,000〜3,400 行）
wc -l lais/verify/dev_system_v34_package.md

# §2.25 サブ節（期待: 8）
grep -c "^#### §2.25" lais/verify/dev_system_v34_package.md

# §C1.5 用語 SSOT（期待: 1）
grep -c "^#### §C1.5" lais/verify/dev_system_v34_package.md

# §6.10 scripts 数（期待: 29、§17 表内）
grep -cE "^[0-9]+\\." <(sed -n '/^## §17\. §6\.10/,/^## §18/p' lais/verify/dev_system_v34_package.md)

# §C0-C6 照合（dev_system_spec.md と本パッケージ §15.1-§15.7）
diff <(awk '/^## 21\. /,/^---$/' docs/plans/dev_system_spec.md | grep -E "§C[0-6]") \
     <(awk '/^## §15\. /,/^## §16\./' lais/verify/dev_system_v34_package.md | grep -E "§C[0-6]")

# git commit 確認
git log --oneline -1
```

---

**完了報告（PATCH-19〜27 + V35 Phase 1-3 復元版）**: MISSION-G49-PKG / dev_system_v34_package.md 復元 / 起点 r2_1_1 + PATCH-19〜27 反映 + dev_system_spec.md §21 SSoT 埋込 + §6.10 29 本拡張 / Bug V35-P2-S2-03 解消 + git track 確立 / Phase 1 着手準備完了
