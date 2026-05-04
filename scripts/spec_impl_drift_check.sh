#!/bin/sh
# scripts/spec_impl_drift_check.sh — Lais 側 spec ↔ 実装 ずれ 機械検出 gate
#
# 根拠:
#   - PO 直命 (2026-05-03): 「後回し なし、 今 できる事 は やる」
#   - SUBAGENT-SPEC-IMPL-DRIFT-DETECTOR-V1
#   - 88 マス table 「仕様 ↔ 実装 ずれ」 行 全列 ✅ 化
#
# 検出 patterns (Lais 側):
#   1. Lais core_spec.md 言及 scripts/*.sh が 真に scripts/ に file 存在 する か
#   2. Lais core_spec.md 言及 /api/<endpoint> が 真に src/index.js の app.<method> に hit する か
#   3. instructions/session_progress.md 言及 commit SHA (7-12 hex) が 真に git log に hit する か
#
# 1 件 drift で exit 1 (= push gate に 結線 で push 拒否)
# DRIFT_REPORT_ONLY=1 で report のみ + exit 0 (debug / nightly 用)
#
# usage:
#   bash scripts/spec_impl_drift_check.sh                # full run (drift 0 件 のみ exit 0)
#   DRIFT_REPORT_ONLY=1 bash scripts/spec_impl_drift_check.sh   # nightly mode
#
# 出力:
#   stdout: 各 pattern の DRIFT 詳細 + summary
#   logs/spec_impl_drift_check.log: 履歴蓄積

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
LOG_FILE="${REPO_ROOT}/logs/spec_impl_drift_check.log"
mkdir -p "${REPO_ROOT}/logs"

SPEC_FILE=""
for cand in "core_spec.md" "lais/core_spec.md"; do
  if [ -f "${REPO_ROOT}/${cand}" ]; then
    SPEC_FILE="${REPO_ROOT}/${cand}"
    break
  fi
done

PROGRESS_FILE="${REPO_ROOT}/instructions/session_progress.md"
SRC_INDEX="${REPO_ROOT}/src/index.js"

DRIFT_TOTAL=0
DRIFT_P1=0
DRIFT_P2=0
DRIFT_P3=0

DRIFT_DETAILS_P1=""
DRIFT_DETAILS_P2=""
DRIFT_DETAILS_P3=""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Lais spec ↔ 実装 drift detector (3 patterns)"
echo "  TS: $TS"
echo "  spec: ${SPEC_FILE:-NOT_FOUND}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -z "$SPEC_FILE" ]; then
  echo "WARN: core_spec.md が 見つからない (drift check skip)"
  exit 0
fi

# ---------------------------------------------------------------
# pattern 1: spec 言及 scripts/*.sh の 実在確認
# ---------------------------------------------------------------
echo ""
echo "[pattern 1] spec 言及 scripts/*.sh の 実在確認"
echo "─────────────────────────────────"

# spec から scripts/<name>.sh を grep 抽出 (重複除去)
P1_REFS="$(grep -oE 'scripts/[a-zA-Z0-9_/-]+\.sh' "$SPEC_FILE" 2>/dev/null | sort -u)"
P1_REF_COUNT=$(printf '%s\n' "$P1_REFS" | grep -c . || true)
echo "  spec 言及 unique script: ${P1_REF_COUNT} 件"

if [ -n "$P1_REFS" ]; then
  while IFS= read -r ref; do
    [ -n "$ref" ] || continue
    # 実装 file 存在 check (REPO_ROOT 起点)
    if [ ! -f "${REPO_ROOT}/${ref}" ]; then
      DRIFT_P1=$((DRIFT_P1 + 1))
      DRIFT_DETAILS_P1="${DRIFT_DETAILS_P1}\n    - DRIFT: spec 言及 ${ref} が file 不在"
    fi
  done <<EOF
$P1_REFS
EOF
fi

if [ "$DRIFT_P1" -gt 0 ]; then
  echo "  DRIFT 検出: ${DRIFT_P1} 件"
  printf '%b\n' "$DRIFT_DETAILS_P1"
else
  echo "  PASS (drift 0 件)"
fi
DRIFT_TOTAL=$((DRIFT_TOTAL + DRIFT_P1))

# ---------------------------------------------------------------
# pattern 2: spec 言及 /api/<endpoint> の src/index.js 実装確認
# ---------------------------------------------------------------
echo ""
echo "[pattern 2] spec 言及 /api/<endpoint> の src/index.js 実装確認"
echo "─────────────────────────────────"

if [ ! -f "$SRC_INDEX" ]; then
  echo "  SKIP (src/index.js 不在)"
else
  # spec から /api/<...> 抽出 (英数字 + / + - のみ、 末尾 punctuation 除去)
  P2_REFS="$(grep -oE '/api/[a-zA-Z0-9/_-]+' "$SPEC_FILE" 2>/dev/null \
    | sed 's/[\.\,\;\)\]]*$//' \
    | sort -u)"
  P2_REF_COUNT=$(printf '%s\n' "$P2_REFS" | grep -c . || true)
  echo "  spec 言及 unique /api/ endpoint: ${P2_REF_COUNT} 件"

  if [ -n "$P2_REFS" ]; then
    while IFS= read -r ep; do
      [ -n "$ep" ] || continue
      # src/index.js に grep (app.post / get / put / delete / patch + endpoint)
      # 動的 ID (e.g., /api/goals/:id) は :id を 任意 token として 緩和 hit 判定
      ep_pattern="$(printf '%s' "$ep" | sed 's|:[a-z]*|[^"'\''/]*|g')"
      if ! grep -qE "app\.(post|get|put|delete|patch)\([\"']${ep_pattern}[\"'/(]" "$SRC_INDEX" 2>/dev/null; then
        # parent path として hit する 場合 も OK 判定 (e.g., /api/goals が app.get('/api/goals'... に hit)
        if ! grep -qE "[\"']${ep_pattern}[\"']" "$SRC_INDEX" 2>/dev/null; then
          DRIFT_P2=$((DRIFT_P2 + 1))
          DRIFT_DETAILS_P2="${DRIFT_DETAILS_P2}\n    - DRIFT: spec 言及 ${ep} が src/index.js に 実装無し"
        fi
      fi
    done <<EOF
$P2_REFS
EOF
  fi

  if [ "$DRIFT_P2" -gt 0 ]; then
    echo "  DRIFT 検出: ${DRIFT_P2} 件"
    printf '%b\n' "$DRIFT_DETAILS_P2"
  else
    echo "  PASS (drift 0 件)"
  fi
fi
DRIFT_TOTAL=$((DRIFT_TOTAL + DRIFT_P2))

# ---------------------------------------------------------------
# pattern 3: progress 言及 commit SHA の git log 実在確認
# ---------------------------------------------------------------
echo ""
echo "[pattern 3] session_progress.md 言及 commit SHA の git log 実在確認"
echo "─────────────────────────────────"

if [ ! -f "$PROGRESS_FILE" ]; then
  echo "  SKIP (instructions/session_progress.md 不在)"
elif ! command -v git >/dev/null 2>&1; then
  echo "  SKIP (git command 不在)"
else
  # progress から backtick-wrapped 7-12 hex SHA 抽出 (commit `sha` 形式 + 平文 sha)
  # ただし 単語境界 で 7-12 hex は 誤検出 多 (年月日 等)、 commit `<sha>` 形式 限定
  P3_REFS="$(grep -oE 'commit `[0-9a-f]{7,12}`|`[0-9a-f]{7,12}`|commit [0-9a-f]{7,12}' "$PROGRESS_FILE" 2>/dev/null \
    | grep -oE '[0-9a-f]{7,12}' \
    | sort -u)"
  P3_REF_COUNT=$(printf '%s\n' "$P3_REFS" | grep -c . || true)
  echo "  progress 言及 unique SHA: ${P3_REF_COUNT} 件"

  if [ -n "$P3_REFS" ]; then
    while IFS= read -r sha; do
      [ -n "$sha" ] || continue
      # git cat-file で 実在 check
      if ! git cat-file -e "${sha}^{commit}" 2>/dev/null; then
        DRIFT_P3=$((DRIFT_P3 + 1))
        DRIFT_DETAILS_P3="${DRIFT_DETAILS_P3}\n    - DRIFT: progress 言及 SHA ${sha} が git log に 不在"
      fi
    done <<EOF
$P3_REFS
EOF
  fi

  if [ "$DRIFT_P3" -gt 0 ]; then
    echo "  DRIFT 検出: ${DRIFT_P3} 件"
    printf '%b\n' "$DRIFT_DETAILS_P3"
  else
    echo "  PASS (drift 0 件)"
  fi
fi
DRIFT_TOTAL=$((DRIFT_TOTAL + DRIFT_P3))

# ---------------------------------------------------------------
# 総括
# ---------------------------------------------------------------
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  drift 結果: P1=${DRIFT_P1} P2=${DRIFT_P2} P3=${DRIFT_P3} TOTAL=${DRIFT_TOTAL}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# log 記録
{
  echo "${TS}\tP1=${DRIFT_P1}\tP2=${DRIFT_P2}\tP3=${DRIFT_P3}\tTOTAL=${DRIFT_TOTAL}"
} >> "$LOG_FILE" 2>/dev/null || true

if [ "$DRIFT_TOTAL" -gt 0 ]; then
  # PO 直命 (2026-05-04): DRIFT_REPORT_ONLY=1 bypass 物理削除、 strict mode 完全化。
  # drift 検出時は 必ず exit 1 = push BLOCK
  echo ""
  echo "DRIFT 検出: 仕様書 ↔ 実装 ずれ ${DRIFT_TOTAL} 件、 push BLOCK"
  echo "対処:"
  echo "  - P1 (script 不在): 仕様書 § 該当節 を 削除/移動 OR scripts/ に 配置"
  echo "  - P2 (endpoint 不在): src/index.js に app.<method>(...) 追加 OR 仕様書 から 削除"
  echo "  - P3 (SHA 不在): instructions/session_progress.md の SHA 修正 OR commit 復活"
  exit 1
fi

echo "ALL GREEN: spec ↔ 実装 drift 0 件"
exit 0
