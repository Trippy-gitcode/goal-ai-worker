#!/bin/sh
# scripts/realworld_proof_check.sh — G17: realworld 証跡検証
# 根拠: R2.2 §2.7 χcrit / §3.3 証跡パス SSOT / PATCH-16（risk_tags SSOT）
# POSIX sh 互換（§3.7）。bash 拡張禁止。

set -eu
MID="${1:?Usage: $0 <MISSION_ID>}"
PROOF="evidence/$MID/realworld-proof.json"
[ -f "$PROOF" ] || { echo "FAIL: G17 $PROOF not found"; exit 1; }

iso_to_epoch_stub() {
  iso="$1"
  if e=$(date -j -u -f "%Y-%m-%dT%H:%M:%SZ" "$iso" +%s 2>/dev/null); then
    echo "$e"; return 0
  fi
  date -u -d "$iso" +%s 2>/dev/null
}

# スキーマ検証
jq -e '.timestamp and .timestamp_epoch and .results and .screenshots' "$PROOF" > /dev/null 2>&1 || {
  echo "FAIL: G17 $PROOF missing required fields (timestamp/timestamp_epoch/results/screenshots)"
  exit 1
}

# 失敗件数
FAILED=$(jq -r '.results.failed // 0' "$PROOF")
if [ "$FAILED" -gt 0 ]; then
  echo "FAIL: G17 $FAILED realworld tests failed"; exit 1
fi

# timestamp: deploy.log との前後関係（epoch 秒で数値比較）
if [ -f logs/deploy.log ]; then
  DEPLOY_ISO=$(tail -1 logs/deploy.log | awk '{print $1}')
  DEPLOY_EPOCH=$(iso_to_epoch_stub "$DEPLOY_ISO")
  PROOF_EPOCH=$(jq -r '.timestamp_epoch' "$PROOF")
  if [ -n "$DEPLOY_EPOCH" ] && [ "$PROOF_EPOCH" -lt "$DEPLOY_EPOCH" ]; then
    echo "FAIL: G17 proof_epoch=$PROOF_EPOCH < deploy_epoch=$DEPLOY_EPOCH (proof captured before deploy)"
    exit 1
  fi
fi

# 必須スクショ判定（PATCH-16 / R3-H-11 risk_tags SSOT）
MISSION_FILE="${LATEST_MISSION_FILE:-/tmp/mission_${MID}.md}"
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
[ -f "$MISSION_FILE" ] || "$SCRIPT_DIR/extract_mission_block.sh" "$MID" > "$MISSION_FILE"

UI_CHANGE=$(grep -E '^- \*\*ui_change:\*\*' "$MISSION_FILE" | sed -E 's/.*ui_change:\*\*[[:space:]]*//' | head -1)
UI_CHANGE="${UI_CHANGE:-true}"

RISK_TAGS=$(grep -E '^- \*\*risk_tags:\*\*' "$MISSION_FILE" | head -1 | \
  sed -E 's/^- \*\*risk_tags:\*\*[[:space:]]*//' | tr ',' ' ' | tr -s '[:space:]' ' ')

# 必須スクショ表（§3.3 SSOT、risk_tags → screenshot 1:1）
REQUIRED="launch primary1 reload"
for tag in $RISK_TAGS; do
  case "$tag" in
    auth|payment|api_call|external|migration) REQUIRED="$REQUIRED $tag" ;;
    "") ;;
    *)
      echo "WARN: unknown risk_tag '$tag' (§3.3 SSOT 未登録、G17 スクショ要件に反映せず)" >&2
      ;;
  esac
done

# risk_tags 宣言漏れ検知（WARN のみ、FAIL なし）
if [ -z "$RISK_TAGS" ]; then
  HEURISTIC_HIT=""
  grep -qiE '対象ファイル.*(auth|signup|login)' "$MISSION_FILE" 2>/dev/null && HEURISTIC_HIT="$HEURISTIC_HIT auth"
  grep -qiE '対象ファイル.*(payment|checkout|stripe)' "$MISSION_FILE" 2>/dev/null && HEURISTIC_HIT="$HEURISTIC_HIT payment"
  grep -qiE '対象ファイル.*(external|openai|anthropic|gemini)' "$MISSION_FILE" 2>/dev/null && HEURISTIC_HIT="$HEURISTIC_HIT api_call"
  if [ -n "$HEURISTIC_HIT" ]; then
    echo "WARN: risk_tags 未宣言だが対象ファイル名にリスクキーワード検出:$HEURISTIC_HIT" >&2
    echo "      mission_template に risk_tags を明示追加してください（G17 スクショ要件の SSOT）" >&2
  fi
fi

if [ "$UI_CHANGE" = "false" ]; then
  REQUIRED="launch"
fi

for op in $REQUIRED; do
  path=$(jq -r ".screenshots.$op // empty" "$PROOF")
  if [ -z "$path" ] || [ ! -f "$path" ]; then
    echo "FAIL: G17 required screenshot '$op' missing"; exit 1
  fi
done

echo "OK: G17 realworld proof complete for $MID (required=$REQUIRED)"
