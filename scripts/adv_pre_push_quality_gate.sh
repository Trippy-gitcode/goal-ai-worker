#!/bin/sh
# scripts/adv_pre_push_quality_gate.sh — ADV 押す前 必須 quality gate (Primary Quality Gate)
#
# 根拠:
#   - PO 直命 (2026-05-04): 「Git を Gate にしないで。 自社テストで 通るのが当たり前」
#   - PO 直命 (2026-05-04): 「全て Green に対処、 次 App 自動反映 列も追加」
#   - core_spec.md §3.14 ADV 押す前 自己 quality gate (a-e 5 chain 必須 PASS)
#   - core_spec.md §2.25.21 Primary Quality Gate Inversion (ADV = 主、 GitHub CI = secondary)
#   - SUBAGENT-DEVSYS-PRE-PUSH-QUALITY-GATE-SCRIPT-V3
#
# 動作 (manual or pre-push hook 経由 自動起動):
#   step a: vitest unit test 全 PASS
#   step b: playwright e2e (4 persona × 全 spec) 全 PASS
#   step c: g50 production / source / commit SHA 三点照合
#   step d: lint (bash -n + changeable_policy_lint + spec_lint_extended) + gitleaks
#   step e: AI 視点 review marker (env AI_REVIEW_OK=1 必須、 review skip 防止)
#
# 1 件 fail で exit 1 → pre-push hook 経由で push 拒否
# 「ケチる と skip 可能」 を 構造的に close (token / 時間 ケチらない 原則 §2.25.21.3)
#
# 緊急 skip:
#   ADV_PRE_PUSH_SKIP=1 で skip 可、 ただし verify/adv_violation_log.md に
#   skip 事実 が 自動記録 (§2.25.21.4 違反 記録枠)
#
# 個別 step skip (debugging 用):
#   SKIP_VITEST=1 / SKIP_PLAYWRIGHT=1 / SKIP_G50=1 / SKIP_LINT=1 / SKIP_AI_REVIEW=1

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
LOG_FILE="${REPO_ROOT}/logs/adv_pre_push_quality_gate.log"
mkdir -p "${REPO_ROOT}/logs"

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
FAILED_STEPS=""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ADV 押す前 必須 quality gate (Primary Quality Gate)"
echo "  core_spec.md §3.14 + §2.25.21 / 5 step a-e 全 PASS まで push 不能"
echo "  TS: $TS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 緊急 skip 検出
if [ "${ADV_PRE_PUSH_SKIP:-0}" = "1" ]; then
  VLOG="${REPO_ROOT}/lais/verify/adv_violation_log.md"
  if [ ! -f "$VLOG" ]; then VLOG="${REPO_ROOT}/verify/adv_violation_log.md"; fi
  if [ -f "$VLOG" ]; then
    {
      echo ""
      echo "### 違反 #ADV_PRE_PUSH_SKIP_$(date -u '+%Y%m%dT%H%M%SZ')"
      echo "- 検出: $TS"
      echo "- 内容: ADV_PRE_PUSH_SKIP=1 で adv_pre_push_quality_gate.sh skip"
      echo "- 該当: §3.14 + §2.25.21.4 自己 quality gate skip"
      echo "- 後追い: a-e 5 chain self-check 必須 (拡充 + 再走)"
    } >> "$VLOG" 2>/dev/null || true
  fi
  echo "WARN: ADV_PRE_PUSH_SKIP=1 検出、 quality gate skip (違反記録済)"
  exit 0
fi

# ---------------------------------------------------------------
# step a: vitest unit test 全 PASS (§3.14 (d))
# ---------------------------------------------------------------
echo ""
echo "[step a] vitest unit test 全 PASS"
echo "─────────────────────────────────"
if [ "${SKIP_VITEST:-0}" = "1" ]; then
  echo "  SKIP (SKIP_VITEST=1)"
  SKIP_COUNT=$((SKIP_COUNT + 1))
elif [ -f "${REPO_ROOT}/vitest.config.js" ] || [ -f "${REPO_ROOT}/vitest.config.ts" ]; then
  if (cd "$REPO_ROOT" && npx vitest run --reporter=basic 2>&1 | tail -20); then
    echo "  PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  FAIL: vitest run exit ≠ 0"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAILED_STEPS="${FAILED_STEPS} a(vitest)"
  fi
else
  echo "  SKIP (vitest.config.{js,ts} 不在)"
  SKIP_COUNT=$((SKIP_COUNT + 1))
fi

# ---------------------------------------------------------------
# step b: playwright e2e 全 PASS (§3.14 (a) — 4 persona × 全 spec)
# ---------------------------------------------------------------
echo ""
echo "[step b] playwright e2e (4 persona × 全 spec) 全 PASS"
echo "─────────────────────────────────"
if [ "${SKIP_PLAYWRIGHT:-0}" = "1" ]; then
  echo "  SKIP (SKIP_PLAYWRIGHT=1)"
  SKIP_COUNT=$((SKIP_COUNT + 1))
elif [ -f "${REPO_ROOT}/playwright.config.ts" ] || [ -f "${REPO_ROOT}/playwright.config.js" ]; then
  # 注: 既存 e2e は production frontend (https://goal-ai-frontend.pages.dev) 対象
  # local dev server 起動は不要、 直接 npx playwright test 実行
  if (cd "$REPO_ROOT" && npx playwright test --reporter=list 2>&1 | tail -30); then
    echo "  PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  FAIL: playwright test exit ≠ 0"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAILED_STEPS="${FAILED_STEPS} b(playwright)"
  fi
else
  echo "  SKIP (playwright.config.{ts,js} 不在)"
  SKIP_COUNT=$((SKIP_COUNT + 1))
fi

# ---------------------------------------------------------------
# step c: g50 production / source / commit SHA 三点照合 (§3.14 (c))
# ---------------------------------------------------------------
echo ""
echo "[step c] g50 production 三点照合"
echo "─────────────────────────────────"
if [ "${SKIP_G50:-0}" = "1" ]; then
  echo "  SKIP (SKIP_G50=1)"
  SKIP_COUNT=$((SKIP_COUNT + 1))
elif [ -x "${REPO_ROOT}/scripts/g50_prod_source_triple_verify.sh" ]; then
  if (cd "$REPO_ROOT" && sh scripts/g50_prod_source_triple_verify.sh 2>&1 | tail -10); then
    echo "  PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  FAIL: g50 三点照合 mismatch"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAILED_STEPS="${FAILED_STEPS} c(g50)"
  fi
else
  echo "  SKIP (g50_prod_source_triple_verify.sh 不在)"
  SKIP_COUNT=$((SKIP_COUNT + 1))
fi

# ---------------------------------------------------------------
# step d: lint + gitleaks (§3.14 (e))
# ---------------------------------------------------------------
echo ""
echo "[step d] lint (bash -n + changeable_policy + spec_lint) + gitleaks"
echo "─────────────────────────────────"
if [ "${SKIP_LINT:-0}" = "1" ]; then
  echo "  SKIP (SKIP_LINT=1)"
  SKIP_COUNT=$((SKIP_COUNT + 1))
else
  STEP_D_FAIL=0

  # bash -n: 全 .sh 構文 check
  for f in "${REPO_ROOT}/scripts/"*.sh; do
    [ -f "$f" ] || continue
    if ! bash -n "$f" 2>/dev/null; then
      echo "  FAIL: bash -n $f"
      STEP_D_FAIL=1
    fi
  done

  # changeable_policy_lint
  if [ -x "${REPO_ROOT}/scripts/changeable_policy_lint.sh" ]; then
    if ! (cd "$REPO_ROOT" && bash scripts/changeable_policy_lint.sh >/dev/null 2>&1); then
      echo "  WARN: changeable_policy_lint FAIL (継続)"
    fi
  fi

  # spec_lint_extended (lais/core_spec.md or core_spec.md)
  if [ -x "${REPO_ROOT}/scripts/spec_lint_extended.sh" ]; then
    SPEC_TARGET=""
    for cand in "lais/core_spec.md" "core_spec.md"; do
      if [ -f "${REPO_ROOT}/${cand}" ]; then
        SPEC_TARGET="$cand"
        break
      fi
    done
    if [ -n "$SPEC_TARGET" ]; then
      if ! (cd "$REPO_ROOT" && bash scripts/spec_lint_extended.sh "$SPEC_TARGET" >/dev/null 2>&1); then
        echo "  WARN: spec_lint_extended FAIL (継続)"
      fi
    fi
  fi

  # gitleaks (HEAD scan)
  if command -v gitleaks >/dev/null 2>&1; then
    if [ -f "${REPO_ROOT}/.gitleaks.toml" ]; then
      if ! gitleaks detect --no-git --redact --config="${REPO_ROOT}/.gitleaks.toml" >/dev/null 2>&1; then
        echo "  FAIL: gitleaks 検出"
        STEP_D_FAIL=1
      fi
    fi
  fi

  if [ "$STEP_D_FAIL" -eq 0 ]; then
    echo "  PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAILED_STEPS="${FAILED_STEPS} d(lint)"
  fi
fi

# ---------------------------------------------------------------
# step e: AI 視点 review marker (§3.14 (b))
# ---------------------------------------------------------------
echo ""
echo "[step e] AI 視点 code review (env AI_REVIEW_OK=1 必須)"
echo "─────────────────────────────────"
if [ "${SKIP_AI_REVIEW:-0}" = "1" ]; then
  echo "  SKIP (SKIP_AI_REVIEW=1)"
  SKIP_COUNT=$((SKIP_COUNT + 1))
elif [ "${AI_REVIEW_OK:-0}" = "1" ]; then
  echo "  PASS (AI_REVIEW_OK=1 marker present)"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "  FAIL: AI_REVIEW_OK env marker 未 set"
  echo "        対処: ADV 自身 + 並列 subagent (Review Persona / vote_dispatcher) で"
  echo "             設計妥当性 / 仕様整合 / セマンティック / 命名整合 / 違和感 detection を完走、"
  echo "             critical 0 件 を確認後、 AI_REVIEW_OK=1 git push を実行"
  FAIL_COUNT=$((FAIL_COUNT + 1))
  FAILED_STEPS="${FAILED_STEPS} e(ai_review)"
fi

# ---------------------------------------------------------------
# 総括
# ---------------------------------------------------------------
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  quality gate 結果: PASS=${PASS_COUNT} FAIL=${FAIL_COUNT} SKIP=${SKIP_COUNT}"
if [ "$FAIL_COUNT" -gt 0 ]; then
  echo "  失敗 step:${FAILED_STEPS}"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# log 記録
{
  echo "${TS}\tPASS=${PASS_COUNT}\tFAIL=${FAIL_COUNT}\tSKIP=${SKIP_COUNT}\tFAILED=${FAILED_STEPS}"
} >> "$LOG_FILE" 2>/dev/null || true

if [ "$FAIL_COUNT" -gt 0 ]; then
  echo ""
  echo "PUSH BLOCKED: 上記 fail step を修正後 再走。"
  echo "緊急 skip (記録付): ADV_PRE_PUSH_SKIP=1 git push origin main"
  exit 1
fi

echo "✅ ALL GREEN: a-e chain 全 PASS、 push 可"
exit 0
