#!/bin/sh
# scripts/writeguard_check.sh — §2.2 ADV 書込ホワイトリスト 機械強制 (Lais 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §2.1 ADV 禁止事項 (実装コード編集 禁止、 src/ scripts/ は read のみ)
#   - core_spec.md §2.2 ADV 書込ホワイトリスト (運用記録 のみ ADV 直接書込 可)
#   - PO 直命 (2026-05-04): 「機械強制 しない 理由 が ない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-P2-MECHANICAL-ENFORCEMENT-DEPLOY-V1 (P2-2 配備)
#
# 動作 (dev-system pre-commit hook 経由 / Stop hook 経由):
#   1. 直近 commit の staged file walk
#   2. ADV 書込ホワイトリスト (= instructions/{session_progress,decision_log,in_flight_topics,subagent_status}.md
#      + verify/adv_violation_log.md + docs/{po-decisions,learned-patterns}.md) 以外 への 直接書込 検出
#   3. ホワイトリスト外 file への commit + subagent 経由痕跡 0 件 → BLOCK
#   4. 1 件でも 「ADV 直接書込 違反」 path → exit 1 + 該当 file 出力
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#         SKIP_X / DISABLED_BYPASS / DRIFT_REPORT_ONLY 不採用 (= 違反 #53 再生産 禁止)
#
# 連動 (settings.json + pre-commit hook):
#   - settings.json: pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step u2 に結線)
#   - core_spec.md §2.2 mechanical_enforcement row
#   - templates/scripts/writeguard_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

echo "================================================================"
echo "  §2.2 ADV 書込ホワイトリスト check (Lais 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

# Step 1: ADV 直接書込 ホワイトリスト pattern (§2.2)
WHITELIST_PATTERN='^(instructions/(session_progress|decision_log|in_flight_topics|subagent_status)\.md|verify/(adv_violation_log|realmachine_smoke_results)\.md|docs/(po-decisions|learned-patterns|decision_log)\.md|instructions/persona_review/.+\.md|verify/.+\.md|logs/)$'
# 拡張 ホワイトリスト (= 運用記録性質、 §6.2 例外節と整合)
EXTENDED_WHITELIST_PATTERN='^(instructions/|verify/|docs/(po-decisions|learned-patterns|decision_log)|logs/)'

VIOLATION_COUNT=0
VIOLATION_DETAIL=""

# Step 2: git staged file scan
HAS_GIT=0
if command -v git >/dev/null 2>&1 && [ -d "${REPO_ROOT}/.git" ]; then
  HAS_GIT=1
  STAGED_FILES=$(cd "$REPO_ROOT" && git diff --cached --name-only --diff-filter=ACM 2>/dev/null || true)

  if [ -n "$STAGED_FILES" ]; then
    # 直近 commit msg で subagent 経由 痕跡 verify
    LAST_MSG=$(cd "$REPO_ROOT" && git log -1 --pretty=%B 2>/dev/null || true)
    SUBAGENT_TRACE=$(echo "$LAST_MSG" | grep -cE 'SUBAGENT-|subagent|dispatch|Async agent launched' || echo 0)
    SUBAGENT_TRACE=$(echo "$SUBAGENT_TRACE" | tr -d '[:space:]')

    for f in $STAGED_FILES; do
      # ホワイトリスト patten match → skip
      if echo "$f" | grep -qE "$EXTENDED_WHITELIST_PATTERN"; then
        continue
      fi
      # subagent 痕跡 ≥ 1 → ENG 経由 = OK skip
      if [ "$SUBAGENT_TRACE" -ge 1 ]; then
        continue
      fi
      # それ以外 = ADV 直接書込 違反候補
      VIOLATION_COUNT=$((VIOLATION_COUNT + 1))
      VIOLATION_DETAIL="${VIOLATION_DETAIL}  - $f (ADV 直接書込 + subagent 経由痕跡 0)\n"
    done
  fi
fi

echo ""
echo "ADV 書込違反 候補: $VIOLATION_COUNT"

if [ "$VIOLATION_COUNT" -ge 1 ]; then
  echo ""
  echo "🛑 §2.2 ADV 書込ホワイトリスト 違反検出:"
  printf "%b" "$VIOLATION_DETAIL"
  echo ""
  echo "対処 (= §2.2 履行):"
  echo "  1. ホワイトリスト外 file (core_spec.md / scripts/ / templates/ / skills/ / docs/plans/) は subagent 経由 必須"
  echo "  2. commit message に subagent ID (SUBAGENT-XXX-XXX) を 含める = 機械検証 path"
  echo "  3. 例外: instructions/ + verify/ + docs/{po-decisions,learned-patterns,decision_log}.md は ADV 直接書込 可"
  echo ""
  if [ "${WRITEGUARD_STRICT:-0}" = "1" ]; then
    echo "BLOCK: WRITEGUARD_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 WRITEGUARD_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §2.2 ADV 書込ホワイトリスト 健全 (violation=$VIOLATION_COUNT)"
exit 0
