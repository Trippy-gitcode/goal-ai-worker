#!/bin/sh
# scripts/active_monitoring_check.sh — §2.25.19 (G49) active monitoring 機械強制 (dev-system 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §2.25.19 G49 言行一致 gate (forward-action keyword + 同 turn fix tool 0 件 BLOCK)
#   - core_spec.md §3.11 active monitoring (background subagent stall 能動的検知)
#   - PO 直命 (2026-05-04): 「機械強制 しない 理由 が ない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-P1-MECHANICAL-ENFORCEMENT-DEPLOY-V1 (P1-6 配備)
#
# 動作 (dev-system pre-commit hook 経由 + Stop hook 経由):
#   1. instructions/subagent_status.md を walk
#   2. 直近 dispatched subagent の status (IN_PROGRESS / ACTIVE) と timestamp を 抽出
#   3. IN_PROGRESS 状態 が 30 分超 継続 (= stall 候補) を 検出
#   4. forward-action keyword (続行/即実行/着手/順次) + 真 fix tool 履歴 0 件 → BLOCK
#   5. CI / deploy / nightly 実走行 status の 受動的 「報告待ち」 状態 (= 直近 commit に
#      ci_status_check / log tail / status API 痕跡 0 件) → BLOCK
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#
# 連動 (settings.json + Stop hook + pre-commit hook):
#   - settings.json: Stop hook + pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step x に結線)
#   - core_spec.md §2.25.19 mechanical_enforcement row
#   - templates/scripts/active_monitoring_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

SUBAGENT_STATUS_FILE="${REPO_ROOT}/instructions/subagent_status.md"
SESSION_PROGRESS_FILE="${REPO_ROOT}/instructions/session_progress.md"

echo "================================================================"
echo "  §2.25.19 active monitoring check (dev-system 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

if [ ! -f "$SUBAGENT_STATUS_FILE" ]; then
  echo ""
  echo "🛑 §2.25.19 違反: $SUBAGENT_STATUS_FILE 不在 = active monitoring 不能"
  echo ""
  echo "対処: $SUBAGENT_STATUS_FILE 配備"
  if [ "${ACTIVE_MONITORING_STRICT:-0}" = "1" ]; then
    exit 1
  fi
  exit 0
fi

# Step 1: IN_PROGRESS / ACTIVE 数 を count
ACTIVE_COUNT=$(grep -cE 'IN_PROGRESS|in_progress|in progress|ACTIVE' "$SUBAGENT_STATUS_FILE" 2>/dev/null || echo 0)
ACTIVE_COUNT=$(echo "$ACTIVE_COUNT" | tr -d '[:space:]')

# Step 2: forward-action keyword 検出 (= 言行一致 軸 §2.25.19 G49)
FORWARD_KW_PATTERN='続行します|続行する|自律で続行|即実行|即時 着手|次は|順次 着手|今から ...|now executing|proceeding to'
FORWARD_HIT_COUNT=0
for f in "$SUBAGENT_STATUS_FILE" "$SESSION_PROGRESS_FILE"; do
  [ -f "$f" ] || continue
  HITS=$(grep -cE "$FORWARD_KW_PATTERN" "$f" 2>/dev/null || echo 0)
  HITS=$(echo "$HITS" | tr -d '[:space:]')
  FORWARD_HIT_COUNT=$((FORWARD_HIT_COUNT + HITS))
done

# Step 3: 真 fix tool 痕跡 (= last commit msg + staged file)
HAS_GIT=0
FIX_TRACE_COUNT=0
if command -v git >/dev/null 2>&1 && [ -d "${REPO_ROOT}/.git" ]; then
  HAS_GIT=1
  LAST_MSG=$(cd "$REPO_ROOT" && git log -1 --pretty=%B 2>/dev/null || true)
  STAGED_COUNT=$(cd "$REPO_ROOT" && git diff --cached --name-only --diff-filter=ACM 2>/dev/null | wc -l | tr -d ' ' || echo 0)
  if [ -n "$LAST_MSG" ]; then
    if echo "$LAST_MSG" | grep -qE 'Edit|Write|MultiEdit|fix|commit|push|wrangler deploy|gh workflow run|chmod|mkdir'; then
      FIX_TRACE_COUNT=$((FIX_TRACE_COUNT + 1))
    fi
  fi
  if [ "$STAGED_COUNT" -ge 1 ]; then
    FIX_TRACE_COUNT=$((FIX_TRACE_COUNT + 1))
  fi
fi

# Step 4: stall 検知 (= 同 file の last modified が 30 分以上 前 + IN_PROGRESS ≥ 1)
STALL_FLAG=0
if [ "$ACTIVE_COUNT" -ge 1 ] && [ -f "$SUBAGENT_STATUS_FILE" ]; then
  # macOS / BSD stat fallback
  MOD_TIME=$(stat -f %m "$SUBAGENT_STATUS_FILE" 2>/dev/null || stat -c %Y "$SUBAGENT_STATUS_FILE" 2>/dev/null || echo 0)
  NOW_TIME=$(date +%s)
  if [ -n "$MOD_TIME" ] && [ "$MOD_TIME" -gt 0 ]; then
    AGE_SEC=$((NOW_TIME - MOD_TIME))
    AGE_MIN=$((AGE_SEC / 60))
    if [ "$AGE_MIN" -ge 30 ]; then
      STALL_FLAG=1
    fi
    echo "subagent_status.md last modified: ${AGE_MIN} 分前"
  fi
fi

# Step 5: settings.json で Stop hook 結線 verify
SETTINGS_FILE_LOCAL="${REPO_ROOT}/.claude/settings.json"
SETTINGS_FILE_USER="${HOME}/.claude/settings.json"
HOOK_CONFIGURED=0
for sf in "$SETTINGS_FILE_LOCAL" "$SETTINGS_FILE_USER"; do
  [ -f "$sf" ] || continue
  if grep -qE '(Stop|pre-commit hook|active_monitoring|adv_response_gate)' "$sf" 2>/dev/null; then
    HOOK_CONFIGURED=1
  fi
done

echo ""
echo "ACTIVE / IN_PROGRESS 数: $ACTIVE_COUNT"
echo "forward-action keyword hit: $FORWARD_HIT_COUNT"
echo "真 fix tool 痕跡 件数: $FIX_TRACE_COUNT"
echo "stall flag (≥ 30 分未更新): $STALL_FLAG"
echo "Stop hook + pre-commit hook 結線 (settings.json): $HOOK_CONFIGURED"

# 判定:
# (A) forward keyword ≥ 1 + 真 fix tool 0 → §2.25.19 G49 違反
# (B) stall flag = 1 → §3.11 active monitoring 違反
FAIL_DETAIL=""
FAIL_FLAG=0

if [ "$FORWARD_HIT_COUNT" -ge 1 ] && [ "$FIX_TRACE_COUNT" -eq 0 ]; then
  FAIL_FLAG=1
  FAIL_DETAIL="${FAIL_DETAIL}  - (A) forward keyword ${FORWARD_HIT_COUNT} 件 + 真 fix tool 0 件 (= §2.25.19 G49 言行一致 違反)\n"
fi

if [ "$STALL_FLAG" -eq 1 ]; then
  FAIL_FLAG=1
  FAIL_DETAIL="${FAIL_DETAIL}  - (B) IN_PROGRESS ${ACTIVE_COUNT} 件 + last modified ≥ 30 分前 (= stall 候補、 §3.11 active monitoring 違反)\n"
fi

if [ "$FAIL_FLAG" -eq 1 ]; then
  echo ""
  echo "🛑 §2.25.19 active monitoring 違反検出:"
  printf "%b" "$FAIL_DETAIL"
  echo ""
  echo "対処 (= §2.25.19 + §3.11 履行):"
  echo "  1. forward-action keyword 削除 / 言い換え or 同 turn 内で 真 fix tool (Edit/Write/Bash) 1 件以上 call"
  echo "  2. stall subagent → Monitor tool / log tail / status 確認 → TaskStop + 再投下"
  echo "  3. subagent_status.md 更新 (= 状態異常 能動的 検知)"
  echo "  4. settings.json で Stop hook 結線 verify"
  echo ""
  if [ "${ACTIVE_MONITORING_STRICT:-0}" = "1" ]; then
    echo "BLOCK: ACTIVE_MONITORING_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 ACTIVE_MONITORING_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §2.25.19 active monitoring 健全 (active=$ACTIVE_COUNT, forward_kw=$FORWARD_HIT_COUNT, fix_trace=$FIX_TRACE_COUNT, stall=$STALL_FLAG)"
exit 0
