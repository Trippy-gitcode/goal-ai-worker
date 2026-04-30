#!/bin/sh
# scripts/verify_approval_authenticity.sh — Hフロー承認 二重証跡検証
# 根拠: R2.2 §3.5 / PATCH-14 / R3-H-09 / PATCH-19 Bug H（noreply@github.com 追加）
# POSIX sh 互換（§3.7）。bash 拡張禁止。
#
# 使い方: verify_approval_authenticity.sh <MISSION_ID> <approval_file>
# 検証 3 層:
#   (1) session_history_ref の実在（ファイル + G_NN_LNNN アンカー行番号 ≤ wc -l）
#   (2) 承認ファイル追加コミット author が approver ロールと対応
#   (3) HEAD commit_sha 一致

set -eu
MID="${1:?Usage: $0 <MISSION_ID> <approval_file>}"
APPROVAL="${2:?Usage: $0 <MISSION_ID> <approval_file>}"
[ -f "$APPROVAL" ] || { echo "FAIL: approval file not found: $APPROVAL" >&2; exit 1; }

extract_field() {
  sed -nE 's/.*"'"$1"'"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' "$APPROVAL" | head -1
}

APPROVER=$(extract_field approver)
APPROVED_SHA=$(extract_field commit_sha)
SH_REF=$(extract_field session_history_ref)
APPROVAL_COMMIT=$(extract_field approval_commit_sha)
APPROVAL_AUTHOR=$(extract_field approval_git_author)

# (1) session_history_ref 実在検証
[ -n "$SH_REF" ] || { echo "FAIL: approval JSON missing session_history_ref" >&2; exit 1; }
SH_FILE=$(printf '%s' "$SH_REF" | cut -d'#' -f1)
SH_ANCHOR=$(printf '%s' "$SH_REF" | awk -F'#' '{print $2}')
[ -f "$SH_FILE" ] || { echo "FAIL: session_history file not found: $SH_FILE" >&2; exit 1; }
SH_LINE=$(printf '%s' "$SH_ANCHOR" | sed -nE 's/.*_L([0-9]+).*/\1/p')
[ -n "$SH_LINE" ] || { echo "FAIL: invalid anchor format: $SH_ANCHOR (expected G_NN_LNNN)" >&2; exit 1; }
SH_MAX=$(wc -l < "$SH_FILE")
[ "$SH_LINE" -le "$SH_MAX" ] || { echo "FAIL: session_history anchor out of range: L$SH_LINE > $SH_MAX" >&2; exit 1; }

# (2) 承認ファイル追加コミット author 検証
if [ -z "$APPROVAL_COMMIT" ]; then
  APPROVAL_COMMIT=$(git log -n 1 --pretty=format:%H -- "$APPROVAL" 2>/dev/null)
fi
[ -n "$APPROVAL_COMMIT" ] || { echo "FAIL: approval commit not found in git log" >&2; exit 1; }
GIT_AUTHOR=$(git log -n 1 --pretty=format:%ae "$APPROVAL_COMMIT" 2>/dev/null)
[ -n "$GIT_AUTHOR" ] || { echo "FAIL: git author lookup failed for $APPROVAL_COMMIT" >&2; exit 1; }

case "$APPROVER" in
  ADV)
    case "$GIT_AUTHOR" in
      *claude_ai*|*claude@*|*anthropic*|*noreply@anthropic.com|*noreply@github.com) ;;
      *) echo "FAIL: approver=ADV だが commit author=$GIT_AUTHOR（claude_ai ドメイン期待）" >&2; exit 1 ;;
    esac
    ;;
  PO)
    case "$GIT_AUTHOR" in
      *futoshi*|*tgw2104@*|*noreply@github.com) ;;
      *) echo "FAIL: approver=PO だが commit author=$GIT_AUTHOR（futoshi ドメイン期待）" >&2; exit 1 ;;
    esac
    ;;
  *)
    echo "FAIL: invalid approver: $APPROVER (expected ADV|PO)" >&2; exit 1 ;;
esac

if [ -n "$APPROVAL_AUTHOR" ] && [ "$APPROVAL_AUTHOR" != "$GIT_AUTHOR" ]; then
  echo "FAIL: approval_git_author declared=$APPROVAL_AUTHOR but git log=$GIT_AUTHOR" >&2
  exit 1
fi

# (3) HEAD commit_sha 一致
CURRENT_SHA=$(git rev-parse HEAD)
[ "$APPROVED_SHA" = "$CURRENT_SHA" ] || {
  echo "FAIL: approval commit_sha mismatch: approved=$APPROVED_SHA current=$CURRENT_SHA" >&2
  echo "      コミット変更後は再承認が必要です。" >&2
  exit 1
}

echo "OK: approval authenticity verified (session_history + git author + HEAD sha)"
