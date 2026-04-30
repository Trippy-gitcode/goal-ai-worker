#!/bin/sh
# scripts/spec_first_lint.sh — G14: 仕様書ファースト検証
# 根拠: R2.2 §2.X G11-G17 ゲート対応表 / §6.2 §6.8（v3.4 新設）
# POSIX sh 互換（§3.7）。bash 拡張禁止。
#
# 使い方: spec_first_lint.sh [mission_file]
# PASS: 変更ファイル（src/**, lais/src/**, frontend/**）に対応する仕様書参照が mission block に記載
# FAIL: 仕様書参照が 0 件なら exit 1
# 発火点: pre-commit hook

set -eu
MISSION_FILE="${1:-}"

if [ -z "$MISSION_FILE" ]; then
  MID=$(scripts/resolve_target_mission.sh canopy 2>/dev/null || true)
  [ -n "$MID" ] || { echo "SKIP: G14 active mission not found"; exit 0; }
  MISSION_FILE="/tmp/mission_${MID}.md"
  scripts/extract_mission_block.sh "$MID" > "$MISSION_FILE"
fi
[ -f "$MISSION_FILE" ] || { echo "SKIP: G14 mission file not found"; exit 0; }

# 変更ファイル（staged diff）のうち src / frontend / lais/src 配下を対象に
CHANGED=$(git diff --cached --name-only 2>/dev/null | grep -E '^(src/|frontend/|lais/src/)' || true)
[ -n "$CHANGED" ] || { echo "OK: G14 non-source change (skipped)"; exit 0; }

# mission block に docs/plans/ または docs/ 系仕様書への参照があること
HAS_SPEC_REF=$(grep -cE 'docs/plans/|docs/(goal_ai|lais|design|dev_system)|design_spec|reference_' "$MISSION_FILE" || true)
if [ "${HAS_SPEC_REF:-0}" = 0 ]; then
  echo "FAIL: G14 mission block に仕様書参照なし（docs/plans/ 等）" >&2
  exit 1
fi

echo "OK: G14 spec reference count=$HAS_SPEC_REF"
