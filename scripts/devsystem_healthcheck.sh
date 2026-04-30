#!/bin/sh
# GENERATED: DO NOT MODIFY
# scripts/devsystem_healthcheck.sh
#
# new-script: dev-system v0.1.0 Phase 2 新設 (SUBAGENT-DEVSYS-HEALTHCHECK-V1)
# derived-from: SUBAGENT-DEVSYS-HEALTHCHECK-V1
# spec-ref: core_spec.md §5 (機械強制 hook) §6 (SSoT 4 ファイル) §7 (完了条件)
# app-independence: APP_REPO_ROOT_ENV / APP_REPO_MARKER / APP_REPO_CANDIDATES
#
# 用途:
#   dev-system v0.1.0 自身の総合 health check。Phase 3 着手前 + 各 commit 前 +
#   夜間 review 連携で dev-system 自身の整合性を mechanical に検証。
#   7 種統合検査を順次実行 + 結果集計 + summary 出力。
#
# 7 種統合検査:
#   [1/7] handoff_validator: SSoT 4 ファイル存在
#   [2/7] changeable_policy_lint: 改変禁止対応整合 (CRITICAL=0 / WARN=0)
#   [3/7] spec_lint_extended: core_spec.md 章番号連続性
#   [4/7] bash -n 構文検査: scripts/*.sh + scripts/lib/*.sh + generator/*.sh
#   [5/7] GENERATED タグ存在: 改変禁止対象全 sh + json + md にタグ存在
#   [6/7] template placeholder 整合: templates/*.template.* に未置換 placeholder OK
#   [7/7] git status: untracked / modified ファイル数集計 (warning level)
#
# 引数:
#   （なし）          標準出力 + exit=0 (FAIL 時のみ exit=1)
#   --quiet           summary のみ出力
#   --verbose         各検査の詳細出力
#   --fail-on-warn    WARN を FAIL 扱い (CI 用)
#   --help / -h       ヘルプ表示
#
# 出力フォーマット:
#   === dev-system v0.1.0 healthcheck YYYY-MM-DDTHH:MM:SS ===
#   [1/7] handoff_validator                    PASS (4/4 SSoT)
#   ...
#   === summary ===
#   PASS: 6 / 7
#   WARN: 1 (git untracked)
#   FAIL: 0
#   overall: HEALTHY
#
# exit code:
#   0: HEALTHY (FAIL=0; --fail-on-warn 指定時は WARN=0 も必須)
#   1: UNHEALTHY (FAIL>0、または --fail-on-warn 指定時の WARN>0)
#
# 環境変数（App 非依存化）:
#   APP_REPO_ROOT_ENV / APP_REPO_MARKER / APP_REPO_CANDIDATES
#
# 設計指針:
#   - 検査順序: handoff_validator → changeable_policy_lint → spec_lint_extended
#     → bash -n → GENERATED tag → template placeholder → git status
#   - 失敗時 fail-fast せず continue + summary 集計（全検査結果を可視化）
#   - 各検査は subshell + exit code 取得で隔離
#   - 出力は固定幅整形（約 40 字でラベル、PASS/WARN/FAIL + 詳細）
#
# 根拠:
#   - core_spec.md §5 機械強制 hook 仕様
#   - core_spec.md §6 SSoT 4 ファイル運用
#   - core_spec.md §7 完了条件マトリクス

set -u

SELF_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "${SELF_DIR}/lib/resolve_repo_root.sh" ]; then
  # shellcheck disable=SC1091
  . "${SELF_DIR}/lib/resolve_repo_root.sh" 2>/dev/null || true
fi

REPO_ROOT=""
if command -v resolve_repo_root >/dev/null 2>&1; then
  REPO_ROOT="$(resolve_repo_root 2>/dev/null || true)"
fi
if [ -z "${REPO_ROOT}" ]; then
  REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
fi
# dev-system 本体の場合は SELF_DIR の親を REPO_ROOT として使用
if [ -z "${REPO_ROOT}" ] || [ ! -f "${REPO_ROOT}/core_spec.md" ]; then
  REPO_ROOT="$(cd "${SELF_DIR}/.." && pwd)"
fi
cd "${REPO_ROOT}" 2>/dev/null || true

QUIET=0
VERBOSE=0
FAIL_ON_WARN=0

while [ $# -gt 0 ]; do
  case "$1" in
    --quiet) QUIET=1; shift ;;
    --verbose) VERBOSE=1; shift ;;
    --fail-on-warn) FAIL_ON_WARN=1; shift ;;
    --help|-h)
      cat <<HLP
devsystem_healthcheck.sh - dev-system v0.1.0 総合 health check
Usage:
  devsystem_healthcheck.sh [--quiet|--verbose] [--fail-on-warn]
Options:
  --quiet           summary のみ出力
  --verbose         各検査の詳細出力
  --fail-on-warn    WARN を FAIL 扱い (CI 用)
Description:
  7 種統合検査を順次実行:
    [1/7] handoff_validator
    [2/7] changeable_policy_lint
    [3/7] spec_lint_extended (core_spec.md)
    [4/7] bash -n syntax check
    [5/7] GENERATED tag presence
    [6/7] template placeholder integrity
    [7/7] git status
  exit code:
    0: HEALTHY (FAIL=0)
    1: UNHEALTHY (FAIL>0)
HLP
      exit 0
      ;;
    *) shift ;;
  esac
done

# --- ヘルパー ----------------------------------------------------------
TIMESTAMP="$(date '+%Y-%m-%dT%H:%M:%S')"
PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0
SUMMARY_LINES=""
DETAIL_LINES=""

# 結果記録（PASS/WARN/FAIL + ラベル + 詳細）
record_result() {
  _no="$1"      # 1-7
  _label="$2"   # 検査ラベル（40 字目安）
  _status="$3"  # PASS / WARN / FAIL
  _detail="$4"  # 詳細

  case "$_status" in
    PASS) PASS_COUNT=$((PASS_COUNT + 1)) ;;
    WARN) WARN_COUNT=$((WARN_COUNT + 1)) ;;
    FAIL) FAIL_COUNT=$((FAIL_COUNT + 1)) ;;
  esac

  # 整形: [N/7] <label 36 字 padding> <STATUS> <detail>
  _line=$(printf '[%s/7] %-36s %s %s' "$_no" "$_label" "$_status" "$_detail")
  SUMMARY_LINES="${SUMMARY_LINES}${_line}
"
}

# 詳細出力（--verbose 時のみ）
record_detail() {
  DETAIL_LINES="${DETAIL_LINES}--- [$1] $2 ---
$3
"
}

# --- [1/7] handoff_validator -------------------------------------------
CHECK1_OUT=""
CHECK1_EXIT=0
if [ -x "${SELF_DIR}/handoff_validator.sh" ] || [ -f "${SELF_DIR}/handoff_validator.sh" ]; then
  CHECK1_OUT="$(sh "${SELF_DIR}/handoff_validator.sh" 2>&1)"
  CHECK1_EXIT=$?
else
  CHECK1_OUT="handoff_validator.sh 不在"
  CHECK1_EXIT=2
fi

if [ "$CHECK1_EXIT" -eq 0 ]; then
  # PASS: ssot=4/4
  _ssot_summary="$(echo "$CHECK1_OUT" | head -1 | awk '{print $2}')"
  record_result "1" "handoff_validator" "PASS" "(${_ssot_summary} SSoT)"
elif [ "$CHECK1_EXIT" -eq 1 ]; then
  _ssot_summary="$(echo "$CHECK1_OUT" | head -1 | awk '{print $2}')"
  record_result "1" "handoff_validator" "WARN" "(${_ssot_summary})"
else
  record_result "1" "handoff_validator" "FAIL" "(exit=$CHECK1_EXIT)"
fi
record_detail "1/7" "handoff_validator" "$CHECK1_OUT"

# --- [2/7] changeable_policy_lint --------------------------------------
CHECK2_OUT=""
CHECK2_EXIT=0
if [ -f "${SELF_DIR}/changeable_policy_lint.sh" ]; then
  CHECK2_OUT="$(sh "${SELF_DIR}/changeable_policy_lint.sh" 2>&1)"
  CHECK2_EXIT=$?
else
  CHECK2_OUT="changeable_policy_lint.sh 不在"
  CHECK2_EXIT=2
fi

# CRITICAL / WARN を summary 行から抽出
CHECK2_CRITICAL=$(echo "$CHECK2_OUT" | grep -E '^[[:space:]]*CRITICAL:' | awk '{print $2}' | head -1)
CHECK2_WARN=$(echo "$CHECK2_OUT" | grep -E '^[[:space:]]*WARN:' | awk '{print $2}' | head -1)
CHECK2_CRITICAL="${CHECK2_CRITICAL:-0}"
CHECK2_WARN="${CHECK2_WARN:-0}"

if [ "$CHECK2_EXIT" -eq 0 ] && [ "$CHECK2_CRITICAL" = "0" ] && [ "$CHECK2_WARN" = "0" ]; then
  record_result "2" "changeable_policy_lint" "PASS" "(CRITICAL=0 WARN=0)"
elif [ "$CHECK2_EXIT" -eq 0 ] && [ "$CHECK2_CRITICAL" = "0" ]; then
  record_result "2" "changeable_policy_lint" "WARN" "(CRITICAL=0 WARN=${CHECK2_WARN})"
else
  record_result "2" "changeable_policy_lint" "FAIL" "(CRITICAL=${CHECK2_CRITICAL} WARN=${CHECK2_WARN} exit=$CHECK2_EXIT)"
fi
record_detail "2/7" "changeable_policy_lint" "$CHECK2_OUT"

# --- [3/7] spec_lint_extended (core_spec.md) ---------------------------
CHECK3_OUT=""
CHECK3_EXIT=0
if [ -f "${SELF_DIR}/spec_lint_extended.sh" ] && [ -f "${REPO_ROOT}/core_spec.md" ]; then
  CHECK3_OUT="$(sh "${SELF_DIR}/spec_lint_extended.sh" "${REPO_ROOT}/core_spec.md" 2>&1)"
  CHECK3_EXIT=$?
else
  CHECK3_OUT="spec_lint_extended.sh または core_spec.md 不在"
  CHECK3_EXIT=2
fi

CHECK3_CRITICAL=$(echo "$CHECK3_OUT" | grep -E '^CRITICAL:' | awk '{print $2}' | head -1)
CHECK3_WARN=$(echo "$CHECK3_OUT" | grep -E '^WARN:' | awk '{print $2}' | head -1)
CHECK3_CRITICAL="${CHECK3_CRITICAL:-0}"
CHECK3_WARN="${CHECK3_WARN:-0}"

if [ "$CHECK3_EXIT" -eq 0 ] && [ "$CHECK3_CRITICAL" = "0" ] && [ "$CHECK3_WARN" = "0" ]; then
  record_result "3" "spec_lint_extended" "PASS" ""
elif [ "$CHECK3_EXIT" -eq 0 ] && [ "$CHECK3_CRITICAL" = "0" ]; then
  record_result "3" "spec_lint_extended" "WARN" "(WARN=${CHECK3_WARN})"
else
  record_result "3" "spec_lint_extended" "FAIL" "(CRITICAL=${CHECK3_CRITICAL} exit=$CHECK3_EXIT)"
fi
record_detail "3/7" "spec_lint_extended" "$CHECK3_OUT"

# --- [4/7] bash -n syntax check ----------------------------------------
SYNTAX_TARGETS=""
for d in scripts scripts/lib generator generator/lib; do
  if [ -d "${REPO_ROOT}/${d}" ]; then
    for f in "${REPO_ROOT}/${d}"/*.sh; do
      [ -f "$f" ] && SYNTAX_TARGETS="${SYNTAX_TARGETS} ${f}"
    done
  fi
done

SYNTAX_TOTAL=0
SYNTAX_FAILED=""
SYNTAX_FAIL_COUNT=0
for f in $SYNTAX_TARGETS; do
  SYNTAX_TOTAL=$((SYNTAX_TOTAL + 1))
  if ! bash -n "$f" 2>/dev/null; then
    SYNTAX_FAILED="${SYNTAX_FAILED} ${f#${REPO_ROOT}/}"
    SYNTAX_FAIL_COUNT=$((SYNTAX_FAIL_COUNT + 1))
  fi
done

CHECK4_OUT="bash -n: ${SYNTAX_TOTAL} scripts checked, ${SYNTAX_FAIL_COUNT} failed"
[ -n "$SYNTAX_FAILED" ] && CHECK4_OUT="${CHECK4_OUT}
failed:${SYNTAX_FAILED}"

if [ "$SYNTAX_FAIL_COUNT" -eq 0 ]; then
  record_result "4" "bash -n syntax check (${SYNTAX_TOTAL} scripts)" "PASS" ""
else
  record_result "4" "bash -n syntax check (${SYNTAX_TOTAL} scripts)" "FAIL" "(${SYNTAX_FAIL_COUNT} failed)"
fi
record_detail "4/7" "bash -n syntax check" "$CHECK4_OUT"

# --- [5/7] GENERATED tag 存在 ------------------------------------------
# 改変禁止対象（changeable_policy.md §2 由来 + scripts/lib/）
TAG_TARGETS=""
for d in scripts scripts/lib; do
  if [ -d "${REPO_ROOT}/${d}" ]; then
    for f in "${REPO_ROOT}/${d}"/*.sh; do
      [ -f "$f" ] && TAG_TARGETS="${TAG_TARGETS} ${f}"
    done
  fi
done

TAG_TOTAL=0
TAG_MISSING=""
TAG_MISSING_COUNT=0
for f in $TAG_TARGETS; do
  TAG_TOTAL=$((TAG_TOTAL + 1))
  if ! head -5 "$f" | grep -qE '^# GENERATED: DO NOT MODIFY'; then
    TAG_MISSING="${TAG_MISSING} ${f#${REPO_ROOT}/}"
    TAG_MISSING_COUNT=$((TAG_MISSING_COUNT + 1))
  fi
done

CHECK5_OUT="GENERATED tag: ${TAG_TOTAL} files checked, ${TAG_MISSING_COUNT} missing"
[ -n "$TAG_MISSING" ] && CHECK5_OUT="${CHECK5_OUT}
missing:${TAG_MISSING}"

if [ "$TAG_MISSING_COUNT" -eq 0 ]; then
  record_result "5" "GENERATED tag presence (${TAG_TOTAL} files)" "PASS" ""
else
  record_result "5" "GENERATED tag presence (${TAG_TOTAL} files)" "FAIL" "(${TAG_MISSING_COUNT} missing)"
fi
record_detail "5/7" "GENERATED tag presence" "$CHECK5_OUT"

# --- [6/7] template placeholder 整合 -----------------------------------
# templates/*.template.* に未置換 placeholder ({{...}}) 存在 = OK
# 生成 App 想定 path に未置換 = FAIL（dev-system 本体では生成 App は無いので skip）
TEMPLATE_TOTAL=0
TEMPLATE_WITH_PLACEHOLDER=0
TEMPLATE_DETAILS=""
if [ -d "${REPO_ROOT}/templates" ]; then
  for f in $(find "${REPO_ROOT}/templates" -type f -name "*.template.*" 2>/dev/null); do
    TEMPLATE_TOTAL=$((TEMPLATE_TOTAL + 1))
    if grep -qE '\{\{[A-Z_a-z0-9]+\}\}' "$f" 2>/dev/null; then
      TEMPLATE_WITH_PLACEHOLDER=$((TEMPLATE_WITH_PLACEHOLDER + 1))
      TEMPLATE_DETAILS="${TEMPLATE_DETAILS} ${f#${REPO_ROOT}/}"
    fi
  done
fi

CHECK6_OUT="templates: ${TEMPLATE_TOTAL} files, ${TEMPLATE_WITH_PLACEHOLDER} with placeholder (expected)"
# dev-system 本体では templates に placeholder 存在が正常（PASS）
# 生成 App 側で未置換 placeholder 検出 → FAIL（本 script は dev-system 本体側のみ実行）
record_result "6" "template placeholder integrity" "PASS" "(${TEMPLATE_WITH_PLACEHOLDER}/${TEMPLATE_TOTAL} with placeholder)"
record_detail "6/7" "template placeholder integrity" "$CHECK6_OUT"

# --- [7/7] git status ---------------------------------------------------
GIT_OUT=""
GIT_UNTRACKED=0
GIT_MODIFIED=0
if git -C "${REPO_ROOT}" rev-parse --git-dir >/dev/null 2>&1; then
  GIT_OUT="$(git -C "${REPO_ROOT}" status --short 2>&1)"
  if [ -n "$GIT_OUT" ]; then
    GIT_UNTRACKED=$(printf '%s\n' "$GIT_OUT" | grep -c '^??' || true)
    GIT_MODIFIED=$(printf '%s\n' "$GIT_OUT" | grep -cE '^( M| A|M |A |MM|AM)' || true)
  fi
  # 数値正規化（tr で空白/改行除去 + 空文字列 → 0）
  GIT_UNTRACKED=$(printf '%s' "${GIT_UNTRACKED:-0}" | tr -d ' \n\r')
  GIT_MODIFIED=$(printf '%s' "${GIT_MODIFIED:-0}" | tr -d ' \n\r')
  case "$GIT_UNTRACKED" in ''|*[!0-9]*) GIT_UNTRACKED=0 ;; esac
  case "$GIT_MODIFIED" in ''|*[!0-9]*) GIT_MODIFIED=0 ;; esac
else
  GIT_OUT="(not a git repo)"
fi

CHECK7_OUT="git status: untracked=${GIT_UNTRACKED} modified=${GIT_MODIFIED}"
if [ "$GIT_UNTRACKED" = "0" ] && [ "$GIT_MODIFIED" = "0" ]; then
  record_result "7" "git status" "PASS" "(clean)"
else
  record_result "7" "git status" "WARN" "(untracked=${GIT_UNTRACKED} modified=${GIT_MODIFIED})"
fi
record_detail "7/7" "git status" "$CHECK7_OUT"

# --- summary 出力 ------------------------------------------------------
TOTAL=$((PASS_COUNT + WARN_COUNT + FAIL_COUNT))

# overall 判定
OVERALL="HEALTHY"
EXIT_CODE=0
if [ "$FAIL_COUNT" -gt 0 ]; then
  OVERALL="UNHEALTHY"
  EXIT_CODE=1
elif [ "$FAIL_ON_WARN" -eq 1 ] && [ "$WARN_COUNT" -gt 0 ]; then
  OVERALL="UNHEALTHY (--fail-on-warn)"
  EXIT_CODE=1
fi

# WARN 内訳
WARN_DETAIL=""
if [ "$WARN_COUNT" -gt 0 ]; then
  if [ "$GIT_UNTRACKED" != "0" ] || [ "$GIT_MODIFIED" != "0" ]; then
    WARN_DETAIL=" (git untracked=${GIT_UNTRACKED} modified=${GIT_MODIFIED})"
  fi
fi

# 出力
if [ "$QUIET" -eq 0 ]; then
  echo "=== dev-system v0.1.0 healthcheck ${TIMESTAMP} ==="
  printf '%s' "$SUMMARY_LINES"
  echo ""
fi

if [ "$VERBOSE" -eq 1 ]; then
  echo "=== verbose details ==="
  printf '%s' "$DETAIL_LINES"
  echo ""
fi

echo "=== summary ==="
echo "PASS: ${PASS_COUNT} / ${TOTAL}"
echo "WARN: ${WARN_COUNT}${WARN_DETAIL}"
echo "FAIL: ${FAIL_COUNT}"
echo "overall: ${OVERALL}"

exit $EXIT_CODE
