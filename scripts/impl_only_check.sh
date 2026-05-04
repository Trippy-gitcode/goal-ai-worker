#!/bin/sh
# scripts/impl_only_check.sh — Lais App 側 phase 4 逆方向 drift 検出 gate
#
# 根拠:
#   - PO 直命 (2026-05-04) PO-DIRECTIVE-014: 7 phase 開発 ワークフロー 機械強制 化 承認
#   - dev-system core_spec.md §2.25.24 7-phase 開発 ワークフロー 必須化 phase 4 (双方向 drift)
#   - SUBAGENT-DEVSYS-7PHASE-SPEC-FIRST-V1
#
# 機能:
#   Lais 側 scripts/*.sh で Lais 側 core_spec.md / lais/core_spec_v4.md 言及 0 件
#   = 「impl 単独 + spec 不在」 = phase 4 逆方向 drift = spec-first 原則 違反 を 検出 → exit 1
#
#   既存 scripts/spec_impl_drift_check.sh は 順方向、 本 script は 逆方向 で 双方向 化 完成。
#
# POSIX sh 互換 (bash extension 不使用)
# bypass 機構 0 (PO 直命 2026-05-04 反映)
# drift 検出 時 必ず exit 1 = push BLOCK
#
# 注: Lais は 大規模 App、 91 scripts 中 多数 が legacy / external review 系。
# strict mode で 即 全 PASS は 困難 = local-only 配備 (= pre-push step は 本 script invoke するが
# strict BLOCK 化 は 別 mission)。

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
LOG_DIR="${REPO_ROOT}/logs"
LOG_FILE="${LOG_DIR}/impl_only_check.log"
mkdir -p "$LOG_DIR"

# Lais 側 spec は 2 file 跨ぎ (root + lais/)
SPEC_FILE_1="${REPO_ROOT}/core_spec.md"
SPEC_FILE_2="${REPO_ROOT}/lais/core_spec_v4.md"
SCRIPTS_DIR="${REPO_ROOT}/scripts"

DRIFT_TOTAL=0
DRIFT_DETAILS=""
CHECKED_TOTAL=0
WHITELIST_HIT=0

echo "================================================================"
echo "  Lais phase 4 逆方向 drift detector (impl-only check)"
echo "  TS: $TS"
echo "  spec1: $SPEC_FILE_1"
echo "  spec2: $SPEC_FILE_2"
echo "  scripts: $SCRIPTS_DIR"
echo "================================================================"

# 2 spec file の どちらか は 必須
if [ ! -f "$SPEC_FILE_1" ] && [ ! -f "$SPEC_FILE_2" ]; then
  echo "FAIL: Lais 側 core_spec.md / lais/core_spec_v4.md が 両方 不在 (= phase 2 仕様書 不在 = BLOCK)"
  exit 1
fi

# -----------------------------------------------------------------
# whitelist (= spec 言及 不要 file pattern、 真の utility のみ)
# -----------------------------------------------------------------
is_whitelisted() {
  base="$1"
  case "$base" in
    lib_*) return 0 ;;
    dr_*.sh) return 0 ;;
    install_*.sh) return 0 ;;
    uninstall_*.sh) return 0 ;;
    setup_*.sh) return 0 ;;
    append_*.sh) return 0 ;;
    extract_*.sh) return 0 ;;
    bump-version.sh) return 0 ;;
    affected-tests.sh) return 0 ;;
    chain_update_audit.sh) return 0 ;;
    deploy_*.sh) return 0 ;;
    handoff_validator.sh) return 0 ;;
    completion_verifier.sh) return 0 ;;
    context_monitor.sh) return 0 ;;
  esac
  return 1
}

# -----------------------------------------------------------------
# main check: scripts/*.sh 各 file が いずれか の core_spec で 言及 ≥ 1 か
# -----------------------------------------------------------------
echo ""
echo "[main] scripts/*.sh の Lais core_spec.md / lais/core_spec_v4.md 言及 verify"
echo "----------------------------------------------------------------"

for f in "${SCRIPTS_DIR}"/*.sh; do
  [ -f "$f" ] || continue
  base="$(basename "$f")"

  if is_whitelisted "$base"; then
    WHITELIST_HIT=$((WHITELIST_HIT + 1))
    continue
  fi

  CHECKED_TOTAL=$((CHECKED_TOTAL + 1))

  # grep -c は file 不在 で exit 1、 || echo 0 は 後置 改行 hazard、 空 → 0 fallback
  HIT_TOTAL=0
  if [ -f "$SPEC_FILE_1" ]; then
    H1=$(grep -c "scripts/${base}" "$SPEC_FILE_1" 2>/dev/null)
    [ -z "$H1" ] && H1=0
    HIT_TOTAL=$((HIT_TOTAL + H1))
  fi
  if [ -f "$SPEC_FILE_2" ]; then
    H2=$(grep -c "scripts/${base}" "$SPEC_FILE_2" 2>/dev/null)
    [ -z "$H2" ] && H2=0
    HIT_TOTAL=$((HIT_TOTAL + H2))
  fi

  if [ "$HIT_TOTAL" -eq 0 ]; then
    DRIFT_TOTAL=$((DRIFT_TOTAL + 1))
    DRIFT_DETAILS="${DRIFT_DETAILS}
    - DRIFT: scripts/${base} が Lais 全 spec に 言及 0 件 (= impl-only、 spec-first 原則 違反)"
  fi
done

echo "  checked: ${CHECKED_TOTAL} files (whitelist skip: ${WHITELIST_HIT})"
if [ "$DRIFT_TOTAL" -gt 0 ]; then
  echo "  DRIFT 検出: ${DRIFT_TOTAL} 件"
  printf '%s\n' "$DRIFT_DETAILS" | head -40
  if [ "$DRIFT_TOTAL" -gt 40 ]; then
    echo "    (... 残 $((DRIFT_TOTAL - 40)) 件 は log 参照: $LOG_FILE)"
  fi
else
  echo "  PASS (drift 0 件)"
fi

# -----------------------------------------------------------------
# 総括
# -----------------------------------------------------------------
echo ""
echo "================================================================"
echo "  drift 結果: TOTAL=${DRIFT_TOTAL} / CHECKED=${CHECKED_TOTAL}"
echo "================================================================"

{
  printf '%s\tDRIFT=%s\tCHECKED=%s\tWHITELIST=%s\n' \
    "$TS" "$DRIFT_TOTAL" "$CHECKED_TOTAL" "$WHITELIST_HIT"
  printf '%s\n' "$DRIFT_DETAILS" | sed 's/^/    /' 2>/dev/null
} >> "$LOG_FILE" 2>/dev/null || true

if [ "$DRIFT_TOTAL" -gt 0 ]; then
  echo ""
  echo "DRIFT 検出: Lais phase 4 逆方向 (impl-only) 違反 ${DRIFT_TOTAL} 件"
  echo "対処:"
  echo "  - 各 scripts/<name>.sh を Lais core_spec.md / lais/core_spec_v4.md § 該当節 で 言及 する 仕様書 化"
  echo "  - 実 利用 不要 script は 削除"
  echo "  - whitelist 拡張 が 必要 な 場合 PO 承認 + 本 script の is_whitelisted() を 改修"
  exit 1
fi

echo "ALL GREEN: Lais phase 4 逆方向 drift 0 件"
exit 0
