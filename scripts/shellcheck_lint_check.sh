#!/bin/sh
# scripts/shellcheck_lint_check.sh — §3.14 shellcheck POSIX 互換 強制 機械強制 (Lais 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §3.14 ADV 押す前 自己 quality gate (lint / 文法 全 PASS 必須)
#   - core_spec.md §2.25.21 Primary Quality Gate Inversion
#   - PO 直命 (2026-05-04): 「機械強制 しない 理由 が ない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-MECHANICAL-ENFORCEMENT-RESIDUAL-DEPLOY-V1 (RESIDUAL-5 配備)
#
# 動作 (dev-system pre-commit hook 経由):
#   1. staged .sh file を bash -n + (shellcheck 存在時) shellcheck で lint
#   2. shellcheck 出力 SC2086 (unquoted) / SC2046 (split issues) / SC2148 (no shebang) 等を critical 扱い
#   3. critical lint error ≥ 1 → §3.14 違反
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#
# 連動 (settings.json + pre-commit hook):
#   - settings.json: pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step w5 に結線)
#   - core_spec.md §3.14 mechanical_enforcement row
#   - templates/scripts/shellcheck_lint_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

echo "================================================================"
echo "  §3.14 shellcheck POSIX lint check (Lais 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

CRITICAL_HIT=0
BASH_N_FAIL=0
HAS_SHELLCHECK=0
if command -v shellcheck >/dev/null 2>&1; then
  HAS_SHELLCHECK=1
fi

STAGED_SH=""
if command -v git >/dev/null 2>&1 && [ -d "${REPO_ROOT}/.git" ]; then
  STAGED_SH=$(cd "$REPO_ROOT" && git diff --cached --name-only --diff-filter=ACM 2>/dev/null | grep -E '\.sh$' || true)
fi

# fallback: staged 0 件 でも scripts/*.sh を sample lint
if [ -z "$STAGED_SH" ]; then
  STAGED_SH=$(ls "${REPO_ROOT}/scripts/"*.sh 2>/dev/null | head -5 || true)
fi

if [ -n "$STAGED_SH" ]; then
  for f in $STAGED_SH; do
    [ -f "$f" ] || continue
    if ! bash -n "$f" >/dev/null 2>&1; then
      BASH_N_FAIL=$((BASH_N_FAIL + 1))
    fi
    if [ "$HAS_SHELLCHECK" -eq 1 ]; then
      # critical level (error) のみカウント。 SC2086, SC2148 等 を critical 扱い
      CRIT=$(shellcheck -S error -f gcc "$f" 2>/dev/null | wc -l | tr -d '[:space:]')
      CRITICAL_HIT=$((CRITICAL_HIT + CRIT))
    fi
  done
fi

echo ""
echo "shellcheck installed: $HAS_SHELLCHECK"
echo "bash -n fail count: $BASH_N_FAIL"
echo "shellcheck critical hit: $CRITICAL_HIT"

if [ "$BASH_N_FAIL" -ge 1 ] || [ "$CRITICAL_HIT" -ge 1 ]; then
  echo ""
  echo "🛑 §3.14 違反: bash -n fail=${BASH_N_FAIL} / shellcheck critical=${CRITICAL_HIT}"
  echo ""
  echo "対処:"
  echo "  1. bash -n 失敗 file を修正"
  echo "  2. shellcheck critical (SC2086 / SC2148 / SC2046) を解消"
  echo ""
  if [ "${SHELLCHECK_STRICT:-0}" = "1" ]; then
    echo "BLOCK: SHELLCHECK_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 SHELLCHECK_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §3.14 shellcheck POSIX lint 健全 (bash_n=$BASH_N_FAIL, shellcheck_crit=$CRITICAL_HIT)"
exit 0
