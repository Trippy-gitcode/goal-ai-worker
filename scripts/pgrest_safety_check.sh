#!/bin/sh
# scripts/pgrest_safety_check.sh
# Round 22 R-007 + Round 23 R-001 fix (2026-05-01) — external review GPT-5.4 指摘対応
#
# 目的:
#   `safePgrestValue(` を `isSafePgrestValue` / `requireSafePgrestValue` 検証なしで
#   呼び出している callsite が baseline (verify/pgrest_safety_baseline.txt) を
#   上回ったとき exit 1 で block する。新規 unsafe callsite 追加のみを止める設計。
#
# 修正 (Round 23 R-001):
#   旧: BASELINE_COUNT=43 hardcode + コメント「既知 47」が矛盾し、実測 21 でも
#       baseline 設定ミスで CI が常時誤動作する温床。
#   新: baseline 値は外部ファイル `verify/pgrest_safety_baseline.txt` から読込。
#       ファイル不在時はその場の実測値を baseline に固定して exit 0 (初回 OK)。
#       実測値 > baseline 時のみ exit 1。
#       baseline は減少した時のみ手動で更新する (漸減のみ許容、漸増は block)。
#
# 検出ルール:
#   `src/` 配下で `safePgrestValue(` を grep (helpers.js / `isSafePgrestValue` /
#   `requireSafePgrestValue` 呼び出しを除外)。
#   現状の callsite 数 vs baseline で漸減のみ許容、漸増 = block。
#
# Round 25 R-002 fix (2026-05-01) — external review GPT-5.4 HIGH:
#   grep ベース判定の限界 (複数行記述・別変数経由・コメント文字列で誤判定) を
#   コメントで明示。上位レイヤー (lint / 新規コード policy) で
#   `requireSafePgrestValue` 限定推奨を README + helpers.js JSDoc で重ねて promote 済。
#   将来 AST ベース linter (ESLint custom rule) への移行を Phase 5 で予約。
#
# 使い方:
#   sh scripts/pgrest_safety_check.sh
#   echo $?  # 0 = baseline 以下、1 = baseline 超過 (新規追加検出)
#
# baseline 更新方法 (callsite を migrate して減少した場合のみ):
#   echo "21" > verify/pgrest_safety_baseline.txt  # 実測値で上書き

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

BASELINE_FILE="verify/pgrest_safety_baseline.txt"

# `safePgrestValue(` 呼び出しを全 callsite で検出 (helpers.js 自身は除外)
RAW_HITS=$(grep -rn "safePgrestValue(" src/ 2>/dev/null | grep -v "src/utils/helpers.js" | grep -v "isSafePgrestValue\|requireSafePgrestValue" || true)

if [ -z "$RAW_HITS" ]; then
  CURRENT_COUNT=0
else
  CURRENT_COUNT=$(echo "$RAW_HITS" | wc -l | awk '{print $1}')
fi

# baseline 読込 (ファイル不在時は現在値を baseline に採用 → 初回 OK)
if [ -f "$BASELINE_FILE" ]; then
  BASELINE_COUNT=$(awk 'NR==1{print; exit}' "$BASELINE_FILE" | tr -d ' \t')
  # 不正値 (空 / 数値以外) は exit 1
  case "$BASELINE_COUNT" in
    ''|*[!0-9]*)
      echo "ERROR: baseline file $BASELINE_FILE has invalid content: '$BASELINE_COUNT'"
      exit 1
      ;;
  esac
else
  echo "INFO: baseline file $BASELINE_FILE not found, treating current=$CURRENT_COUNT as baseline"
  BASELINE_COUNT=$CURRENT_COUNT
fi

echo "pgrest_safety_check: current=$CURRENT_COUNT baseline=$BASELINE_COUNT"

if [ "$CURRENT_COUNT" -gt "$BASELINE_COUNT" ]; then
  echo "ERROR: new unsafe safePgrestValue() callsite added (+$((CURRENT_COUNT - BASELINE_COUNT)))"
  echo ""
  echo "全 callsite (新規 unsafe 含む):"
  echo "$RAW_HITS"
  echo ""
  echo "対処:"
  echo "  1. 新規追加 callsite は \`requireSafePgrestValue\` (strict throw) に置換。"
  echo "  2. もし migration 完了で減少した場合は \`echo '$CURRENT_COUNT' > $BASELINE_FILE\` で baseline を下げる。"
  echo "  3. 既存 \`safePgrestValue\` 利用は CI baseline ($BASELINE_COUNT) に登録済、"
  echo "     新規追加 / drift のみが block される (漸減のみ許容)。"
  exit 1
fi

if [ "$CURRENT_COUNT" -lt "$BASELINE_COUNT" ]; then
  echo "INFO: callsite count decreased ($BASELINE_COUNT → $CURRENT_COUNT)、baseline 更新を推奨:"
  echo "  echo '$CURRENT_COUNT' > $BASELINE_FILE"
fi

echo "OK: no new unsafe callsites added (current $CURRENT_COUNT <= baseline $BASELINE_COUNT)"
exit 0
