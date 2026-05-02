#!/bin/sh
# scripts/vote_dispatcher_auto_check.sh — G20: §2.25.23.9 vote_dispatcher 機械強制
#
# 根拠:
#   - §2.25.23.9「応答案 vote_dispatcher 呼出 必須」 を mechanical 強制化
#   - 違反 #10 (記録済 27 件中) を 解消、 同型 再発防止
#   - PO 直命 (2026-05-02): 「他の指摘も同様に対策」
#
# 動作:
#   ADV response 案を stdin / 引数 file から受取、 以下 検出時 vote_dispatcher 呼出強制:
#   - PR 作成 / merge 判断
#   - 仕様変更提案
#   - design pattern choice (例: SQL vs NoSQL / sync vs async)
#   - 任意 N 案以上の 並列 alternatives 提示
#   - 「最適解」「best」「推奨」 等 価値判断 keyword
#
# 上記 検出時、 vote_dispatcher.sh 呼出 (or PASS なら exit 0)、 未呼出なら exit 1。

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# stdin or file から response 案を読取
if [ -t 0 ] && [ $# -ge 1 ] && [ -f "$1" ]; then
  RESPONSE=$(cat "$1")
elif [ ! -t 0 ]; then
  RESPONSE=$(cat)
else
  echo "Usage: echo '<response>' | $0   または   $0 <file>" >&2
  exit 2
fi

[ -z "$RESPONSE" ] && exit 0

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  G20 vote_dispatcher 機械強制 (§2.25.23.9)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# vote_dispatcher 呼出必須 keyword 検出
VOTE_REQUIRED=0
REASONS=""

if echo "$RESPONSE" | grep -qE "PR 作成|pull request 作成|merge 判断|merge する|デザインパターン|architecture choice"; then
  VOTE_REQUIRED=1
  REASONS="${REASONS}\n  ✓ PR/merge/architecture 判断 keyword hit"
fi

if echo "$RESPONSE" | grep -qE "最適解|best|推奨|べき|優先すべき|ベストプラクティス"; then
  VOTE_REQUIRED=1
  REASONS="${REASONS}\n  ✓ 価値判断 keyword hit (最適/best/推奨/べき)"
fi

if echo "$RESPONSE" | grep -qE "仕様変更|spec change|core_spec|spec 改定"; then
  VOTE_REQUIRED=1
  REASONS="${REASONS}\n  ✓ 仕様変更 keyword hit"
fi

# vote_dispatcher 呼出 痕跡 grep
VOTE_CALLED=0
if echo "$RESPONSE" | grep -qE "vote_dispatcher|persona_vote|3 persona|3-persona|6 persona|14 票"; then
  VOTE_CALLED=1
fi

if [ "$VOTE_REQUIRED" -eq 1 ] && [ "$VOTE_CALLED" -eq 0 ]; then
  echo "🛑 G20 FAIL: vote_dispatcher 呼出必須 検出、 但し response 中に呼出痕跡なし"
  printf '%b\n' "$REASONS"
  echo ""
  echo "対処:"
  echo "  1. response に vote_dispatcher 呼出を埋込"
  echo "     例: 'persona vote 6/6 YES = 3 persona 合議 PASS'"
  echo "  2. または vote_dispatcher.sh を実呼出 (scripts/vote_dispatcher.sh)"
  echo ""
  exit 1
fi

if [ "$VOTE_REQUIRED" -eq 1 ]; then
  echo "✅ G20 PASS: vote_dispatcher 呼出必須 + response に呼出痕跡確認済"
else
  echo "✅ G20 PASS: vote_dispatcher 呼出必須 keyword 検出なし (skip OK)"
fi
exit 0
