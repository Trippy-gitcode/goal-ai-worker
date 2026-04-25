#!/bin/sh
# scripts/completion_verifier.sh
# MISSION-G49-PKG-FINAL-V2 Phase 0（§2.25.21 完了条件検証と要約生成）
#
# 用途:
#   subagent の完了報告ファイル（または標準入力）に対して
#   必須項目（MISSION-ID / 結果 / 完了コマンド全 PASS）を grep 検証。
#   長文（30 行超）検出時は §2.25.21.2 5 行サマリーテンプレへの変換要否を返す。
#
# 引数:
#   --report <path>             検証対象ファイル（指定時は stdin より優先）
#   --expect-mission <ID>       MISSION-ID 必須一致（任意、指定時のみ厳密チェック）
#   --required-files <list>     カンマ区切りで存在必須ファイル
#
# 出力（stdout）:
#   PASS\t<details>
#   FAIL\t<details>
#   LONG\t<lines>\trequires-summary
#
# exit code:
#   0: PASS（短文 or LONG だが必須項目あり）
#   1: FAIL（必須項目欠落）
#
# 根拠:
#   - lais/verify/dev_system_v34_package.md §2.25.21.1〜.3

set -eu

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

REPORT=""
EXPECT_MISSION=""
REQUIRED_FILES=""

while [ $# -gt 0 ]; do
  case "$1" in
    --report) REPORT="${2:-}"; shift 2 ;;
    --expect-mission) EXPECT_MISSION="${2:-}"; shift 2 ;;
    --required-files) REQUIRED_FILES="${2:-}"; shift 2 ;;
    *) shift ;;
  esac
done

# 報告内容取得
TMP_REPORT="${TMPDIR:-/tmp}/completion_verifier_$$"
trap 'rm -f "$TMP_REPORT"' EXIT INT TERM

if [ -n "$REPORT" ] && [ -f "$REPORT" ]; then
  cp "$REPORT" "$TMP_REPORT"
elif [ ! -t 0 ]; then
  cat >"$TMP_REPORT"
else
  echo "[completion_verifier] --report <path> または stdin で報告を入力してください" >&2
  exit 2
fi

LINES=$(wc -l <"$TMP_REPORT" | awk '{print $1}')

# 必須項目検査
FAIL_REASONS=""

if ! grep -qE 'MISSION[- ]?ID' "$TMP_REPORT"; then
  FAIL_REASONS="${FAIL_REASONS} missing-mission-id"
fi

if [ -n "$EXPECT_MISSION" ] && ! grep -qF -- "$EXPECT_MISSION" "$TMP_REPORT"; then
  FAIL_REASONS="${FAIL_REASONS} mission-id-mismatch:${EXPECT_MISSION}"
fi

if ! grep -qE 'PASS|完了|completed|Done|done' "$TMP_REPORT"; then
  FAIL_REASONS="${FAIL_REASONS} missing-result"
fi

if ! grep -qE '完了コマンド|verify|check|test' "$TMP_REPORT"; then
  FAIL_REASONS="${FAIL_REASONS} missing-verification"
fi

# 必須ファイル存在チェック
if [ -n "$REQUIRED_FILES" ]; then
  OLD_IFS="$IFS"
  IFS=','
  for f in $REQUIRED_FILES; do
    if [ ! -e "$f" ]; then
      FAIL_REASONS="${FAIL_REASONS} required-file-missing:${f}"
    fi
  done
  IFS="$OLD_IFS"
fi

if [ -n "$FAIL_REASONS" ]; then
  printf 'FAIL\tlines=%s\treasons=%s\n' "$LINES" "$FAIL_REASONS"
  exit 1
fi

if [ "$LINES" -gt 30 ]; then
  printf 'LONG\tlines=%s\trequires-summary\n' "$LINES"
  exit 0
fi

printf 'PASS\tlines=%s\n' "$LINES"
exit 0
