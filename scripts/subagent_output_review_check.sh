#!/bin/sh
# scripts/subagent_output_review_check.sh — G25: subagent 成果物 ADV review 必須化
#
# 根拠:
#   - 違反 #36 (2026-05-02): ADV が 32 subagent 中 31 件を report 信頼で merge、
#     spot-check / 中身 grep / 期待値 vs 実装 cross-check を skip していた。
#   - PO 指摘「君は agent の成果物を私に横流しするのではなくレビューするのも mission」
#   - sub_adv_protocol §3.9 (verify-first) / §3.10 (end-to-end ownership) /
#     §3.11 (active monitoring) を mechanical 強制化。
#
# 動作:
#   commit 直前に staged file 全部に対し以下を check:
#     1. subagent 由来 keyword (SUBAGENT-LAIS- / SUBAGENT-DEVSYS-) を含む staged file が
#        ある場合、 SUBAGENT_REVIEW_OK 環境変数 必須 (= ADV 自身が手動 review 完了 宣言)
#     2. 環境変数 不在なら exit 1、 commit BLOCK
#
#   ADV review 完了基準 (環境変数 set 前 manual checklist):
#     - 各 subagent 修正 file を 1 度 Read で開いて中身 確認
#     - 期待した修正と一致するか cross-check
#     - tests が claim 通り PASS するか 自分で実行
#     - subagent 報告の数値 (件数 / coverage 等) を 自分で再計算
#
# 使い方:
#   SUBAGENT_REVIEW_OK="batch 25 reviewed: scripts/recent_workflow_failure_check.sh logic 確認、
#                     test 動作 OK" sh scripts/subagent_output_review_check.sh
#
# 起動 timing:
#   (a) pre-commit hook (subagent commit 検出時)
#   (b) 手動: ADV が batch commit 前に 必ず

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# staged file に subagent keyword あるか
SUBAGENT_HIT=$(git diff --cached --name-only 2>/dev/null | xargs grep -l "SUBAGENT-LAIS-\|SUBAGENT-DEVSYS-" 2>/dev/null | head -5)
if [ -z "$SUBAGENT_HIT" ]; then
  exit 0  # subagent 由来 file なし、 G25 skip
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  G25 subagent output review check"
echo "  (違反 #36 防止、 ADV verify-first 必須化)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Subagent 由来 staged file:"
echo "$SUBAGENT_HIT" | head -10

if [ -z "${SUBAGENT_REVIEW_OK:-}" ]; then
  cat <<EOF

🛑 G25 FAIL: SUBAGENT_REVIEW_OK 環境変数 不在
  ADV review 完了 宣言が無いため commit BLOCK。

Required check (ADV 手動):
  1. 各 subagent 修正 file を Read で開いて中身 確認
  2. 期待した修正と一致するか cross-check
  3. tests が claim 通り PASS するか 自分で実行 (npx vitest run <file>)
  4. subagent 報告の数値 (件数 / coverage / line 数) を 自分で再計算
  5. 上記 全 PASS なら 以下で commit:

     SUBAGENT_REVIEW_OK="<reviewed内容 1行>" git commit -m "..."

§3.9 verify-first / §3.10 end-to-end ownership / §3.11 active monitoring 必須
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
  exit 1
fi

echo "✅ G25 PASS: SUBAGENT_REVIEW_OK 宣言済 (\"$SUBAGENT_REVIEW_OK\")"
exit 0
