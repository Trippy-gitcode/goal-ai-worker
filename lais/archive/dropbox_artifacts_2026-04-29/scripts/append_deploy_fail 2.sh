#!/bin/sh
# scripts/append_deploy_fail.sh — DEPLOY-RECOVER 無限ネスト防止 + STRIKE 管理
# 根拠: R2.2 §2.4 τcrit / §3.6 STRIKE カウンタ SSOT / PATCH-13 / PATCH-19（Bug F 修正）
# POSIX sh 互換（§3.7）。bash 拡張禁止。
#
# 使い方: append_deploy_fail.sh <MISSION_ID> <stdout_tail>
# 失敗ログ追記 + STATUS 戻し + STRIKE +1 + BLOCKED 遷移（DEPLOY-RECOVER 自動生成なし）

set -eu
MISSION_ID="${1:?Usage: $0 <MISSION_ID> <stdout_tail>}"
STDOUT_TAIL="${2:-}"
PROGRESS="instructions/session_progress.md"
STRIKES_FILE="instructions/deploy_strikes.json"

mkdir -p instructions

[ -f "$STRIKES_FILE" ] || echo '{}' > "$STRIKES_FILE"
CURRENT_STRIKE=$(python3 -c "import json; d=json.load(open('$STRIKES_FILE')); print(d.get('$MISSION_ID',0))")
NEW_STRIKE=$((CURRENT_STRIKE + 1))
python3 -c "
import json
p = '$STRIKES_FILE'
d = json.load(open(p))
d['$MISSION_ID'] = $NEW_STRIKE
json.dump(d, open(p, 'w'), indent=2, sort_keys=True)
"

# DEPLOY-RECOVER プレフィックス重畳防止（§3.6 SSOT）
case "$MISSION_ID" in
  DEPLOY-RECOVER-*) RECOVER_ID="${MISSION_ID%-TRY*}-TRY${NEW_STRIKE}" ;;
  *) RECOVER_ID="DEPLOY-RECOVER-${MISSION_ID}-TRY${NEW_STRIKE}" ;;
esac

# OVERRIDE パスは STRIKE 値に関係なく定義（PATCH-19 / Bug F 修正、set -eu 対応）
OVERRIDE="instructions/approvals/${MISSION_ID}.strike_override.json"

# STRIKE 3 以上は PO 承認ファイル必須
if [ "$NEW_STRIKE" -ge 3 ]; then
  if [ ! -f "$OVERRIDE" ]; then
    cat >&2 <<EOF
FAIL: STRIKE=$NEW_STRIKE (≥3) for $MISSION_ID
  自動再実行拒否。PO 明示承認が必要:
  $OVERRIDE
EOF
    exit 1
  fi
fi

# STATUS 遷移ルール（R3-H-08 / PATCH-13: STRIKE 1→BLOCKED_REVIEW 化）
case "$NEW_STRIKE" in
  1)
    NEW_STATUS="BLOCKED"
    BLOCKED_REASON="DEPLOY_STRIKE_1_REVIEW_REQUIRED（append_deploy_fail: $(date -u +%Y-%m-%dT%H:%M:%SZ)、ADV 手動介入まで DEPLOY-RECOVER 自動生成なし）"
    ;;
  2)
    NEW_STATUS="BLOCKED"
    BLOCKED_REASON="DEPLOY_STRIKE_2_PO_ESCALATION（次回失敗時 PO 承認ファイル ${OVERRIDE} 要求、自動 recover 生成なし）"
    ;;
  *)
    NEW_STATUS="BLOCKED"
    BLOCKED_REASON="DEPLOY_STRIKE_${NEW_STRIKE}（上限超過、上記で exit 1 済）"
    ;;
esac

# STATUS 書換え + BLOCKED 理由行を挿入（PD-109 BLOCKED 例外規定準拠）
export BLOCKED_REASON
awk -v mid="$MISSION_ID" -v st="$NEW_STATUS" '
  $0 ~ "^### " mid ":" { in_block=1; print; next }
  in_block && /^### [A-Z][A-Z0-9_-]*:/ { in_block=0 }
  in_block && /^- \*\*STATUS:\*\*/ {
    print "- **STATUS:** " st
    print "- **BLOCKED 理由:** " ENVIRON["BLOCKED_REASON"]
    next
  }
  { print }
' "$PROGRESS" > "${PROGRESS}.tmp" && mv "${PROGRESS}.tmp" "$PROGRESS"

export STDOUT_TAIL
DATE_ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# R3-H-08: DEPLOY-RECOVER 自動追記は廃止。ADV 手動起票に委ねる
echo "append_deploy_fail: $MISSION_ID STRIKE=$NEW_STRIKE → STATUS=$NEW_STATUS"
echo "  BLOCKED 理由: $BLOCKED_REASON"
echo "  RECOVER_ID（参考）: $RECOVER_ID"
echo "  次アクション: ADV が session_progress.md $MISSION_ID ブロックを目視レビュー後、BLOCKED 解除 + 手動 DEPLOY-RECOVER 起票 or correct_status で IN_PROGRESS 戻し"
