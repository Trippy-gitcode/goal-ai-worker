#!/bin/sh
# scripts/violation_self_report_check.sh — §3.5 違反自己申告義務 機械強制 (dev-system 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §3.5 違反自己申告義務 (隠蔽 = 二重違反)
#   - core_spec.md §4.2 違反の事前回避原則
#   - PO 直命 (2026-05-04): 「機械強制 しない 理由 が ない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-P1-MECHANICAL-ENFORCEMENT-DEPLOY-V1 (P1-1 配備)
#
# 動作 (dev-system pre-commit hook 経由 / Stop hook 経由):
#   1. 直近 commit の changed file (instructions/ + verify/) を walk
#   2. PostMortem / 違反 keyword (「違反」/「PostMortem」/「post-mortem」/「BLOCK」/「FAIL」/「失敗」/「漏れ」)
#      が message / file 内 に出現
#   3. 同期 で verify/adv_violation_log.md への 新規 entry append が確認できなければ BLOCK
#   4. 1 件でも 「違反 検出 + log 書込 0」 path → exit 1 + 該当 keyword 出力
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#         SKIP_X / DISABLED_BYPASS / DRIFT_REPORT_ONLY 不採用 (= 違反 #53 再生産 禁止)
#
# 連動 (settings.json + pre-commit hook):
#   - settings.json: pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step s に結線)
#   - core_spec.md §3.5 mechanical_enforcement row
#   - templates/scripts/violation_self_report_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="${REPO_ROOT}/verify/adv_violation_log.md"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

echo "================================================================"
echo "  §3.5 violation self-report check (dev-system 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

if [ ! -f "$LOG_FILE" ]; then
  echo ""
  echo "🛑 §3.5 違反: $LOG_FILE 不在 = 自己申告枠 不在"
  echo ""
  echo "対処: $LOG_FILE を 作成 + violation entry 4-part フォーマット で 整備"
  exit 1
fi

# Step 1: 直近 commit msg + diff から 違反 keyword を 抽出
VIOLATION_KW_PATTERN='違反|PostMortem|post-mortem|BLOCK|FAIL|失敗|漏れ|root cause|silent gap|bypass'

# git available + dev-system が git repo か check
HAS_GIT=0
if command -v git >/dev/null 2>&1 && [ -d "${REPO_ROOT}/.git" ]; then
  HAS_GIT=1
fi

KW_HIT_COUNT=0
KW_HIT_DETAIL=""

if [ "$HAS_GIT" -eq 1 ]; then
  # 直近 commit message を 抽出 (1 commit only)
  LAST_MSG=$(cd "$REPO_ROOT" && git log -1 --pretty=%B 2>/dev/null || true)

  if [ -n "$LAST_MSG" ]; then
    if echo "$LAST_MSG" | grep -qE "$VIOLATION_KW_PATTERN"; then
      KW_HIT_COUNT=$((KW_HIT_COUNT + 1))
      KW_HIT_DETAIL="${KW_HIT_DETAIL}  - last commit msg に 違反 keyword あり\n"
    fi
  fi

  # staged file (instructions/ + verify/ + docs/) で 違反 keyword 検出
  STAGED_FILES=$(cd "$REPO_ROOT" && git diff --cached --name-only --diff-filter=ACM 2>/dev/null | grep -E '^(instructions|verify|docs)/' || true)
  if [ -n "$STAGED_FILES" ]; then
    for f in $STAGED_FILES; do
      [ -f "${REPO_ROOT}/$f" ] || continue
      # adv_violation_log.md 自身は skip (= 自己申告 file 自身)
      case "$f" in
        verify/adv_violation_log.md) continue ;;
      esac
      if grep -qE "$VIOLATION_KW_PATTERN" "${REPO_ROOT}/$f" 2>/dev/null; then
        KW_HIT_COUNT=$((KW_HIT_COUNT + 1))
      fi
    done
  fi
fi

# Step 2: violation log 内の entry 数を count
LOG_ENTRY_COUNT=$(grep -cE "^#{2,3}[[:space:]]+(違反 #[0-9]+|[0-9]{4}-[0-9]{2}-[0-9]{2}.*違反 #[0-9]+)" "$LOG_FILE" 2>/dev/null || echo 0)

# 違反 keyword hit ≥ 1 → log entry が 増えた か verify 必要
# (= staged で adv_violation_log.md の append diff 確認)
LOG_APPEND_COUNT=0
if [ "$HAS_GIT" -eq 1 ]; then
  LOG_DIFF_LINES=$(cd "$REPO_ROOT" && git diff --cached -- verify/adv_violation_log.md 2>/dev/null | grep -cE "^\+[^+]" || echo 0)
  if [ "$LOG_DIFF_LINES" -gt 0 ]; then
    LOG_APPEND_COUNT=1
  fi
fi

echo ""
echo "violation keyword hit count: $KW_HIT_COUNT"
echo "violation log entry count: $LOG_ENTRY_COUNT"
echo "violation log append (this commit): $LOG_APPEND_COUNT"

# 判定: keyword hit ≥ 1 AND log append 0 → 違反検出 + 自己申告 skip = BLOCK
if [ "$KW_HIT_COUNT" -ge 1 ] && [ "$LOG_APPEND_COUNT" -eq 0 ]; then
  echo ""
  echo "🛑 §3.5 違反検出: 違反 keyword ${KW_HIT_COUNT} 件 hit、 violation log への 自己申告 0 件"
  echo ""
  printf "%b" "$KW_HIT_DETAIL"
  echo ""
  echo "対処 (= §3.5 履行):"
  echo "  1. verify/adv_violation_log.md に 4-part 構成 (what / root cause / 即時 fix / 構造的 future fix) で entry append"
  echo "  2. 直近 応答内で 違反 を 明示 + 是正措置 提示"
  echo "  3. 隠蔽 = 二重違反 = §3.5 違反 + §4.2 即時仕様改定 trigger 対象"
  echo ""
  if [ "${VIOLATION_SELF_REPORT_STRICT:-0}" = "1" ]; then
    echo "BLOCK: VIOLATION_SELF_REPORT_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 VIOLATION_SELF_REPORT_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §3.5 violation self-report 健全 (keyword=$KW_HIT_COUNT, log_append=$LOG_APPEND_COUNT, total_entries=$LOG_ENTRY_COUNT)"
exit 0
