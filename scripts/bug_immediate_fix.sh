#!/bin/sh
# scripts/bug_immediate_fix.sh
# G40 bug-detect → immediate-fix (goal-ai-worker)
#
# 元: dev-system core_spec.md §2.25.16 ADV autonomous mechanisms (G37-G40)
# Mission: SUBAGENT-DEVSYS-G37-G40-AUTONOMOUS-MECHANISMS-V1 (2026-05-02)
# 関連 PO-DIRECTIVE: 「私が毎回聞かなくてもそうなるようにして、 仕組みを開発システムに入れる」
#
# 目的:
#   attack test / monitor / vitest で bug 検出時 PO 確認なしに即 fix dispatch。
#   PO escalation は G16 mechanical check (§2.25.4) 経由 §4 該当 (コスト ≥ ¥500/月 /
#   新プロセス / ブランド変更) のみ、 それ以外は ADV 自律 fix 継続。
#
# 起動 (nightly review / CI failure hook 連動):
#   sh scripts/bug_immediate_fix.sh <bug_id> <bug_type> <bug_payload>
#   例: sh scripts/bug_immediate_fix.sh BUG-2026-001 attack-test "owner_key cookie missing HttpOnly"
#
# 動作 (TODO: actual implementation は別 mission):
#   1. verify/bugs_detected.txt から open bug 1 件 pop
#   2. bug type 分岐:
#      - attack-test failure → src 層 fix mission draft + dispatch
#      - vitest failure → test fix or src fix mission draft + dispatch
#      - monitor alert → ops fix mission draft + dispatch
#   3. G16 mechanical check (§2.25.4) で §4 escalation 判定:
#      - §4 該当 → instructions/po_escalation.md に append + PO 通知
#      - §4 非該当 → ADV 自律 dispatch (subagent 起動)
#   4. dispatch 完了後 verify/bugs_in_flight.txt に move
#   5. fix 完了 verify 後 verify/bugs_resolved.txt に move
#
# 失敗時 (fix 失敗 / scope 不一致 / hook BLOCK):
#   §3.4 失敗時即対処 (同 response 内で再投下 / scope 縮小 / 別手段切替)
#   verify/adv_violation_log.md に §2.25.16 違反 として 4 部構成 で記録 (§3.5 自己申告)

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

LOG_FILE="verify/bug_immediate_fix.log"
BUGS_FILE="verify/bugs_detected.txt"
mkdir -p verify

BUG_ID="${1:-}"
BUG_TYPE="${2:-}"
BUG_PAYLOAD="${3:-}"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] G40 bug-fix start: id=$BUG_ID type=$BUG_TYPE" >> "$LOG_FILE"

# TODO: step 1 bug pop (別 mission で実装)
# TODO: step 2 bug type 分岐 + mission draft (別 mission で実装)
# TODO: step 3 G16 mechanical check + §4 escalation 判定 (別 mission で実装)
# TODO: step 4 ADV 自律 dispatch (別 mission で実装)
# TODO: step 5 fix 完了 verify + state move (別 mission で実装)

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] G40 bug-fix end (stub, no-op)" >> "$LOG_FILE"
exit 0
