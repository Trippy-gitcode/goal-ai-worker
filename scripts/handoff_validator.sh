#!/bin/sh
# GENERATED: DO NOT MODIFY
# scripts/handoff_validator.sh
# MISSION-G49-PKG-FINAL-V2 Phase 0（§2.25.16.5 SSOT 4 ファイル運用）
#
# 用途:
#   引継ぎ前に SSOT 4 ファイルが (1) 存在し、(2) Read 履歴が transcript に
#   記録されているかを検証。WARN を返す場合は ADV にプロンプト注入で警告。
#
# 引数:
#   --transcript <path>   ADV transcript JSON または .jsonl（任意）
#                         省略時は存在チェックのみ
#
# 出力（stdout）:
#   PASS\tssot=4/4\t<list>
#   WARN\tssot=N/4\t<missing list>
#
# exit code:
#   0: PASS
#   1: WARN（欠落あり、caller は再 Read を促す）
#
# 根拠:
#   - core_spec.md §6.1 SSoT 4 ファイル運用 (legacy v34 spec §2.25.16.5, archived 2026-04-30)

set -eu

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

TRANSCRIPT=""
if [ "${1:-}" = "--transcript" ]; then
  TRANSCRIPT="${2:-}"
fi

# SSOT 4 ファイル
SSOT_1="instructions/session_progress.md"
SSOT_2="docs/decision_log.md"
SSOT_3="instructions/in_flight_topics.md"
SSOT_4="instructions/subagent_status.md"

MISSING=""
PRESENT=0

for f in "$SSOT_1" "$SSOT_2" "$SSOT_3" "$SSOT_4"; do
  if [ -f "$f" ]; then
    PRESENT=$((PRESENT + 1))
  else
    MISSING="${MISSING} ${f}"
  fi
done

# transcript が指定されていれば Read 履歴を grep
READ_VERIFIED="-"
if [ -n "$TRANSCRIPT" ] && [ -f "$TRANSCRIPT" ]; then
  READ_HITS=0
  for f in "$SSOT_1" "$SSOT_2" "$SSOT_3" "$SSOT_4"; do
    if grep -F -- "$f" "$TRANSCRIPT" >/dev/null 2>&1; then
      READ_HITS=$((READ_HITS + 1))
    fi
  done
  READ_VERIFIED="${READ_HITS}/4"
fi

if [ "$PRESENT" -eq 4 ]; then
  printf 'PASS\tssot=4/4\tread_in_transcript=%s\n' "$READ_VERIFIED"
  exit 0
fi

printf 'WARN\tssot=%s/4\tmissing=%s\tread_in_transcript=%s\n' "$PRESENT" "$MISSING" "$READ_VERIFIED"
exit 1
