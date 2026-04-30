#!/bin/sh
# scripts/lib/canopy_common.sh — v3.4 §2.6.1 SSOT（5 関数 + 呼出しブロック）
# 根拠: lais/verify/dev_system_v34_package.md §2.6 φcrit / §3.1 §3.2 SSOT
#        docs/plans/sub_infrastructure.md §2.6.1 / sub_adv_protocol.md §11 STATUS_CORRECTION
# POSIX sh 互換（§3.7）。bash 拡張禁止。
#
# 役割:
#   - canopy.sh / deploy.sh / append_deploy_fail.sh 等から `.` で source される
#     SSOT 関数集。旧 tests/smoke/canopy.sh L428-556 の直書きをここへ移動
#   - Bug PART2-S2-01（CRITICAL）修正: sub_adv_protocol.md §11.3 記載パス
#     `. scripts/lib/canopy_common.sh` を物理ファイル化、ADV/PO の
#     STATUS_CORRECTION 運用を実行可能化
#
# 二重読込ガード（§3.7、PATCH-15 runtime_preflight 流儀に準拠）
if [ -n "${_CANOPY_COMMON_SH_LOADED:-}" ]; then
  return 0 2>/dev/null || exit 0
fi
_CANOPY_COMMON_SH_LOADED=1

# ================================================================
# §2.6.1 関数群（PD-109 STATUS 5状態 + STATUS_CORRECTION）
# 根拠: docs/plans/sub_infrastructure.md §2.6.1 / R2.2 §2.6 φcrit / §2.26 STATUScrit
# ================================================================

get_current_mission_block() {
  PROGRESS="${1:-instructions/session_progress.md}"
  if [ -x scripts/resolve_target_mission.sh ] && [ -x scripts/extract_mission_block.sh ]; then
    MID=$(PROGRESS="$PROGRESS" scripts/resolve_target_mission.sh canopy 2>/dev/null) || return 0
    if [ -n "$MID" ]; then
      TMP="/tmp/mission_${MID}.md"
      scripts/extract_mission_block.sh "$MID" "$PROGRESS" > "$TMP"
      export LATEST_MISSION_ID="$MID"
      export LATEST_MISSION_FILE="$TMP"
    fi
  fi
}

update_status() {
  MID="$1"
  NEW_STATUS="$2"
  PROGRESS="${3:-instructions/session_progress.md}"
  awk -v mid="$MID" -v newst="$NEW_STATUS" '
    $0 ~ "^### " mid ":" { in_block = 1; print; next }
    in_block && /^### [A-Z][A-Z0-9_-]*:/ { in_block = 0 }
    in_block && /^- \*\*STATUS:\*\*/ {
      print "- **STATUS:** " newst
      next
    }
    { print }
  ' "$PROGRESS" > "${PROGRESS}.tmp" && mv "${PROGRESS}.tmp" "$PROGRESS"
}

check_test_pass() {
  MID="${LATEST_MISSION_ID:-}"
  [ -n "$MID" ] || return 0
  [ -n "${LATEST_MISSION_FILE:-}" ] || return 0
  [ -f "$LATEST_MISSION_FILE" ] || return 0
  command -v jq >/dev/null 2>&1 || return 0

  BEFORE_UNIT="evidence/$MID/before-unit.json"
  AFTER_UNIT="evidence/$MID/after-unit.json"
  BEFORE_E2E="evidence/$MID/before-e2e.json"
  AFTER_E2E="evidence/$MID/after-e2e.json"

  UNIT_NA=$(grep -E '^[[:space:]]*cmd-unit:[[:space:]]*N/A' "$LATEST_MISSION_FILE" 2>/dev/null | head -1)
  E2E_NA=$(grep -E '^[[:space:]]*cmd-e2e:[[:space:]]*N/A' "$LATEST_MISSION_FILE" 2>/dev/null | head -1)

  UNIT_RED_GREEN=0
  if [ -f "$BEFORE_UNIT" ] && [ -f "$AFTER_UNIT" ]; then
    UBF=$(jq '.stats.unexpected // .results.failed // 0' "$BEFORE_UNIT" 2>/dev/null || echo 0)
    UAF=$(jq '.stats.unexpected // .results.failed // -1' "$AFTER_UNIT" 2>/dev/null || echo -1)
    if [ "$UBF" -gt 0 ] && [ "$UAF" = "0" ]; then UNIT_RED_GREEN=1; fi
  fi
  E2E_RED_GREEN=0
  if [ -f "$BEFORE_E2E" ] && [ -f "$AFTER_E2E" ]; then
    EBF=$(jq '.stats.unexpected // .results.failed // 0' "$BEFORE_E2E" 2>/dev/null || echo 0)
    EAF=$(jq '.stats.unexpected // .results.failed // -1' "$AFTER_E2E" 2>/dev/null || echo -1)
    if [ "$EBF" -gt 0 ] && [ "$EAF" = "0" ]; then E2E_RED_GREEN=1; fi
  fi

  UNIT_OK=0; E2E_OK=0
  [ -n "$UNIT_NA" ] && UNIT_OK=1
  [ -n "$E2E_NA" ] && E2E_OK=1
  [ -f "$AFTER_UNIT" ] && [ "$(jq '.stats.unexpected // .results.failed // -1' "$AFTER_UNIT" 2>/dev/null || echo -1)" = "0" ] && UNIT_OK=1
  [ -f "$AFTER_E2E" ] && [ "$(jq '.stats.unexpected // .results.failed // -1' "$AFTER_E2E" 2>/dev/null || echo -1)" = "0" ] && E2E_OK=1

  REAL_TDD=$((UNIT_RED_GREEN + E2E_RED_GREEN))

  if [ "$UNIT_OK" = 1 ] && [ "$E2E_OK" = 1 ] && [ "$REAL_TDD" -ge 1 ]; then
    if grep -qE '^- \*\*no_deploy:\*\*[[:space:]]*true' "$LATEST_MISSION_FILE" 2>/dev/null; then
      update_status "$MID" "DONE"
    else
      update_status "$MID" "READY_FOR_DEPLOY"
    fi
    return 0
  fi
  return 1
}

correct_status() {
  MID="$1"
  FROM="$2"
  TO="$3"
  REASON="$4"
  CALLER_ROLE="${5:-ADV}"
  PROGRESS="${6:-instructions/session_progress.md}"

  case "$CALLER_ROLE" in
    ADV|PO) ;;
    *) echo "FAIL: correct_status は ADV/PO 限定（caller=$CALLER_ROLE）" >&2; return 1 ;;
  esac

  CURRENT=$(awk -v mid="$MID" '
    $0 ~ "^### " mid ":" { in_block=1; next }
    in_block && /^### [A-Z][A-Z0-9_-]*:/ { in_block=0 }
    in_block && /^- \*\*STATUS:\*\*/ { sub(/^- \*\*STATUS:\*\*[[:space:]]*/,""); print; exit }
  ' "$PROGRESS")
  if [ "$CURRENT" != "$FROM" ]; then
    echo "FAIL: correct_status precondition: current=$CURRENT, expected FROM=$FROM" >&2
    return 1
  fi

  # PD-109 許容遷移表の逆方向限定（DONE/READY_FOR_DEPLOY 発の 3 種 + IN_PROGRESS→QUEUED）
  # 注: 旧仕様サンプル `DONE->...` はシェル case で `>` がリダイレクト扱いされ syntax error に
  #     なるため、`:` 区切りの文字列で安全比較する
  TRANSITION="${FROM}:${TO}"
  case "$TRANSITION" in
    DONE:READY_FOR_DEPLOY|DONE:IN_PROGRESS|READY_FOR_DEPLOY:IN_PROGRESS|IN_PROGRESS:QUEUED) ;;
    *) echo "FAIL: correct_status 不許可遷移: $FROM -> $TO（PD-109 拡張表参照）" >&2; return 1 ;;
  esac

  update_status "$MID" "$TO" "$PROGRESS"

  mkdir -p instructions
  LOG="instructions/status_corrections.log"
  DATE_ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$DATE_ISO" "$MID" "$FROM" "$TO" "$CALLER_ROLE" "$SHA" "$REASON" >> "$LOG"
  echo "OK: correct_status $MID: $FROM -> $TO by $CALLER_ROLE"
}

check_blocked_integrity() {
  PROGRESS="${1:-instructions/session_progress.md}"
  awk '
    /^### [A-Z][A-Z0-9_-]*:/ { mid = $0 }
    /^- \*\*STATUS:\*\*[[:space:]]*BLOCKED/ { in_blocked = 1; has_reason = 0; next }
    in_blocked && /^- \*\*BLOCKED 理由:\*\*/ { has_reason = 1 }
    in_blocked && /^### [A-Z][A-Z0-9_-]*:/ {
      if (!has_reason) print "FAIL: BLOCKED without reason: " mid
      in_blocked = 0
    }
    END {
      if (in_blocked && !has_reason) print "FAIL: BLOCKED without reason: " mid
    }
  ' "$PROGRESS"
}
