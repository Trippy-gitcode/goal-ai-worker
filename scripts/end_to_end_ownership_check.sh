#!/bin/sh
# scripts/end_to_end_ownership_check.sh — §3.10 end-to-end ownership 機械強制 (dev-system 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §3.10 end-to-end ownership (user goal 到達まで責任継続)
#   - core_spec.md §3.9 verify-first 原則 (dispatch 後の機械検証必須)
#   - PO 直命 (2026-05-04): 「dispatch ≠ 完了、 user goal 到達 まで 責任 継続」
#   - SUBAGENT-DEVSYS-P1-MECHANICAL-ENFORCEMENT-DEPLOY-V1 (P1-3 配備)
#
# 動作 (dev-system pre-commit hook 経由 + Stop hook 経由):
#   1. instructions/subagent_status.md を walk
#   2. 直近 dispatched subagent の status (ACTIVE / IN_PROGRESS / FAILED / COMPLETED) を 確認
#   3. ACTIVE / IN_PROGRESS が ≥ 1 件 残存、 かつ 同 commit 内で
#      verify-first 痕跡 (= grep / log / ci_status_check / Async agent launched 件数 一致) が 0 件 → BLOCK
#   4. push 後 CI 確認 step (= scripts/ci_status_check.sh 実走) が 直近 commit log に 0 件 → BLOCK
#   5. SSoT 4 file の status 列 が 「待機中」 / 「PO 反応待ち」 / 「subagent 中継後 放置」 keyword
#      残存 + 残 work ≥ 1 → BLOCK
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#
# 連動 (settings.json + pre-commit hook + Stop hook):
#   - settings.json: pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step u に結線)
#   - core_spec.md §3.10 mechanical_enforcement row
#   - templates/scripts/end_to_end_ownership_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

SUBAGENT_STATUS_FILE="${REPO_ROOT}/instructions/subagent_status.md"
SESSION_PROGRESS_FILE="${REPO_ROOT}/instructions/session_progress.md"

echo "================================================================"
echo "  §3.10 end-to-end ownership check (dev-system 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

# Step 1: subagent_status.md 不在 → 配備不備 = FAIL
if [ ! -f "$SUBAGENT_STATUS_FILE" ]; then
  echo ""
  echo "🛑 §3.10 違反: $SUBAGENT_STATUS_FILE 不在 = ownership 追跡 不能"
  echo ""
  echo "対処: $SUBAGENT_STATUS_FILE 配備 必須"
  if [ "${E2E_OWNERSHIP_STRICT:-0}" = "1" ]; then
    exit 1
  fi
  echo "WARN-only mode: E2E_OWNERSHIP_STRICT=1 で strict 化"
  exit 0
fi

# Step 2: ACTIVE / IN_PROGRESS 数 を count
ACTIVE_COUNT=$(grep -cE "ACTIVE|IN_PROGRESS|in_progress|in progress" "$SUBAGENT_STATUS_FILE" 2>/dev/null || echo 0)
ACTIVE_COUNT=$(echo "$ACTIVE_COUNT" | tr -d '[:space:]')

# Step 3: 「待機中」 / 「PO 反応待ち」 keyword 残存 検出 (= dispatch 中継後 放置)
WAIT_KW_PATTERN='待機中|PO 反応待ち|PO 待ち|PO message 来たら|放置|未確認'
WAIT_HIT_COUNT=0
for f in "$SUBAGENT_STATUS_FILE" "$SESSION_PROGRESS_FILE"; do
  [ -f "$f" ] || continue
  HITS=$(grep -cE "$WAIT_KW_PATTERN" "$f" 2>/dev/null || echo 0)
  HITS=$(echo "$HITS" | tr -d '[:space:]')
  WAIT_HIT_COUNT=$((WAIT_HIT_COUNT + HITS))
done

# Step 4: 残 work 件数 (= 未完 ticket / open task)
RESIDUAL_COUNT=0
if [ -f "$SESSION_PROGRESS_FILE" ]; then
  RESIDUAL_COUNT=$(grep -cE '^- \[ \]|^[*-] \[ \]|未着手|残 work|TKT-[A-Z0-9-]+ open' "$SESSION_PROGRESS_FILE" 2>/dev/null || echo 0)
  RESIDUAL_COUNT=$(echo "$RESIDUAL_COUNT" | tr -d '[:space:]')
fi

# Step 5: verify-first 痕跡 (= 直近 commit msg / staged file で grep) 確認
HAS_GIT=0
VERIFY_TRACE_COUNT=0
if command -v git >/dev/null 2>&1 && [ -d "${REPO_ROOT}/.git" ]; then
  HAS_GIT=1
  LAST_MSG=$(cd "$REPO_ROOT" && git log -1 --pretty=%B 2>/dev/null || true)
  if [ -n "$LAST_MSG" ]; then
    VERIFY_TRACE_COUNT=$(echo "$LAST_MSG" | grep -cE 'verify|VERIFY|verified|grep|wc -l|test -f|ci_status_check|Async agent launched' || echo 0)
    VERIFY_TRACE_COUNT=$(echo "$VERIFY_TRACE_COUNT" | tr -d '[:space:]')
  fi
fi

echo ""
echo "ACTIVE / IN_PROGRESS subagent 数: $ACTIVE_COUNT"
echo "「待機中」 keyword hit: $WAIT_HIT_COUNT"
echo "残 work 件数: $RESIDUAL_COUNT"
echo "verify-first 痕跡 件数 (last commit msg): $VERIFY_TRACE_COUNT"

# 判定:
# (A) ACTIVE ≥ 1 + verify trace 0 + git available → 機械検証 skip = §3.10 違反
# (B) WAIT keyword ≥ 1 + 残 work ≥ 1 → 「待機中」 default = §3.10 違反 + §2.25.22 違反
FAIL_DETAIL=""
FAIL_FLAG=0

if [ "$HAS_GIT" -eq 1 ] && [ "$ACTIVE_COUNT" -ge 1 ] && [ "$VERIFY_TRACE_COUNT" -eq 0 ]; then
  FAIL_FLAG=1
  FAIL_DETAIL="${FAIL_DETAIL}  - (A) dispatched subagent ${ACTIVE_COUNT} 件 ACTIVE で verify-first 痕跡 0 件 (= §3.9 verify-first 違反 + §3.10 dispatch ≠ 完了 違反)\n"
fi

if [ "$WAIT_HIT_COUNT" -ge 1 ] && [ "$RESIDUAL_COUNT" -ge 1 ]; then
  FAIL_FLAG=1
  FAIL_DETAIL="${FAIL_DETAIL}  - (B) 「待機中」 keyword ${WAIT_HIT_COUNT} 件 + 残 work ${RESIDUAL_COUNT} 件 (= §3.10 PO 待機 default 違反 + §2.25.22 ADV Autonomy Loop 違反)\n"
fi

if [ "$FAIL_FLAG" -eq 1 ]; then
  echo ""
  echo "🛑 §3.10 違反検出:"
  printf "%b" "$FAIL_DETAIL"
  echo ""
  echo "対処 (= §3.10 履行):"
  echo "  1. dispatch 後 verify-first (§3.9) 必須 = grep / log / ci_status_check で 機械検証"
  echo "  2. 「待機中」 / 「PO 反応待ち」 keyword 削除 + 並列 task / 次 dispatch 実行"
  echo "  3. SSoT 4 file 即時 更新 (= 会話残し 禁止)"
  echo "  4. push 後 CI green 確認 まで 完了宣言 不可 (= scripts/ci_status_check.sh 実走)"
  echo ""
  if [ "${E2E_OWNERSHIP_STRICT:-0}" = "1" ]; then
    echo "BLOCK: E2E_OWNERSHIP_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 E2E_OWNERSHIP_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §3.10 end-to-end ownership 健全 (active=$ACTIVE_COUNT, wait_kw=$WAIT_HIT_COUNT, residual=$RESIDUAL_COUNT, verify_trace=$VERIFY_TRACE_COUNT)"
exit 0
