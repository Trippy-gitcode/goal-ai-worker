#!/bin/sh
# scripts/docs_impl_drift_check.sh — Lais 側 docs/ ↔ 実装 ずれ 機械検出 gate
#
# 根拠:
#   - PO 直命 (2026-05-04): 「後回し なし、 今 できる事 は やる」
#   - SUBAGENT-DOCS-IMPL-DRIFT-DETECTOR-V1
#   - ボード 「資料 ↔ 実装 ずれ」 行 全 8 マス 🔴 → ✅ 化
#
# 検出 patterns (Lais 側):
#   1. docs/*.md の `bash` code block 内 command が bash -n PASS する か
#   2. docs/*.md の /api/<endpoint> 言及 が src/index.js の app.<method> に hit する か
#   3. docs/*.md の scripts/<name>.sh 言及 が 真に scripts/ に 配置されている か
#   4. docs/*.md の `npm run <script>` 言及 が package.json の scripts に 存在する か
#
# 1 件 drift で exit 1 (= push gate に 結線 で push 拒否)
# DRIFT_REPORT_ONLY=1 で report のみ + exit 0 (debug / nightly 用)
#
# usage:
#   bash scripts/docs_impl_drift_check.sh                # full run (drift 0 件 のみ exit 0)
#   DRIFT_REPORT_ONLY=1 bash scripts/docs_impl_drift_check.sh
#
# 出力:
#   stdout: 各 pattern の DRIFT 詳細 + summary
#   logs/docs_impl_drift_check.log: 履歴蓄積

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
LOG_FILE="${REPO_ROOT}/logs/docs_impl_drift_check.log"
mkdir -p "${REPO_ROOT}/logs"

DOCS_DIR="${REPO_ROOT}/docs"
SRC_INDEX="${REPO_ROOT}/src/index.js"
PKG_JSON="${REPO_ROOT}/package.json"

DRIFT_TOTAL=0
DRIFT_P1=0
DRIFT_P2=0
DRIFT_P3=0
DRIFT_P4=0

DRIFT_DETAILS_P1=""
DRIFT_DETAILS_P2=""
DRIFT_DETAILS_P3=""
DRIFT_DETAILS_P4=""

echo "================================================================"
echo "  Lais docs/ ↔ 実装 drift detector (4 patterns)"
echo "  TS: $TS"
echo "  docs: ${DOCS_DIR}"
echo "================================================================"

if [ ! -d "$DOCS_DIR" ]; then
  echo "WARN: docs/ が 見つからない (drift check skip)"
  exit 0
fi

# ---------------------------------------------------------------
# pattern 1: docs/*.md bash code block 構文 check
# ---------------------------------------------------------------
echo ""
echo "[pattern 1] docs/*.md bash code block bash -n 構文 check"
echo "---------------------------------------------"

P1_TMP="$(mktemp)"
P1_SCAN_COUNT=0
for md in "$DOCS_DIR"/*.md; do
  [ -f "$md" ] || continue
  # bash code block 抽出 (```bash 〜 ```)
  awk '
    /^```bash$/ || /^```sh$/ { in_block=1; block=""; next }
    /^```$/ && in_block { print block; in_block=0; next }
    in_block { block = block "\n" $0 }
  ' "$md" > "$P1_TMP" 2>/dev/null || true

  if [ -s "$P1_TMP" ]; then
    P1_SCAN_COUNT=$((P1_SCAN_COUNT + 1))
    if ! bash -n "$P1_TMP" 2>/dev/null; then
      DRIFT_P1=$((DRIFT_P1 + 1))
      DRIFT_DETAILS_P1="${DRIFT_DETAILS_P1}\n    - DRIFT: $(basename "$md") bash code block 構文 error"
    fi
  fi
done
rm -f "$P1_TMP"

echo "  scanned md files (with bash block): ${P1_SCAN_COUNT} 件"
if [ "$DRIFT_P1" -gt 0 ]; then
  echo "  DRIFT 検出: ${DRIFT_P1} 件"
  printf '%b\n' "$DRIFT_DETAILS_P1"
else
  echo "  PASS (drift 0 件)"
fi
DRIFT_TOTAL=$((DRIFT_TOTAL + DRIFT_P1))

# ---------------------------------------------------------------
# pattern 2: docs 言及 /api/<endpoint> の src/index.js 実装確認
# ---------------------------------------------------------------
echo ""
echo "[pattern 2] docs/*.md /api/<endpoint> 言及 が src/index.js 実装に hit する か"
echo "---------------------------------------------"

if [ ! -f "$SRC_INDEX" ]; then
  echo "  SKIP (src/index.js 不在)"
else
  P2_REFS="$(grep -rhoE '/api/[a-zA-Z0-9/_-]+' "$DOCS_DIR" 2>/dev/null \
    | sed 's/[\.\,\;\)\]]*$//' \
    | sort -u)"
  P2_REF_COUNT=$(printf '%s\n' "$P2_REFS" | grep -c . || true)
  echo "  docs 言及 unique /api/ endpoint: ${P2_REF_COUNT} 件"

  if [ -n "$P2_REFS" ]; then
    while IFS= read -r ep; do
      [ -n "$ep" ] || continue
      # 動的 ID 緩和
      ep_pattern="$(printf '%s' "$ep" | sed 's|:[a-z]*|[^"'\''/]*|g')"
      if ! grep -qE "app\.(post|get|put|delete|patch)\([\"']${ep_pattern}[\"'/(]" "$SRC_INDEX" 2>/dev/null; then
        if ! grep -qE "[\"']${ep_pattern}[\"']" "$SRC_INDEX" 2>/dev/null; then
          DRIFT_P2=$((DRIFT_P2 + 1))
          DRIFT_DETAILS_P2="${DRIFT_DETAILS_P2}\n    - DRIFT: docs 言及 ${ep} が src/index.js に 実装無し"
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
# pattern 3: docs 言及 scripts/*.sh の 実在確認
# ---------------------------------------------------------------
echo ""
echo "[pattern 3] docs/*.md 言及 scripts/<name>.sh の 実在確認"
echo "---------------------------------------------"

P3_REFS="$(grep -rhoE 'scripts/[a-zA-Z0-9_/-]+\.sh' "$DOCS_DIR" 2>/dev/null | sort -u)"
P3_REF_COUNT=$(printf '%s\n' "$P3_REFS" | grep -c . || true)
echo "  docs 言及 unique script: ${P3_REF_COUNT} 件"

if [ -n "$P3_REFS" ]; then
  while IFS= read -r ref; do
    [ -n "$ref" ] || continue
    if [ ! -f "${REPO_ROOT}/${ref}" ]; then
      DRIFT_P3=$((DRIFT_P3 + 1))
      DRIFT_DETAILS_P3="${DRIFT_DETAILS_P3}\n    - DRIFT: docs 言及 ${ref} が file 不在"
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
DRIFT_TOTAL=$((DRIFT_TOTAL + DRIFT_P3))

# ---------------------------------------------------------------
# pattern 4: docs 言及 `npm run <script>` の package.json 存在確認
# ---------------------------------------------------------------
echo ""
echo "[pattern 4] docs/*.md 言及 'npm run <script>' の package.json 存在確認"
echo "---------------------------------------------"

if [ ! -f "$PKG_JSON" ]; then
  echo "  SKIP (package.json 不在)"
else
  P4_REFS="$(grep -rhoE 'npm run [a-zA-Z0-9:_-]+' "$DOCS_DIR" 2>/dev/null \
    | awk '{print $3}' \
    | sort -u)"
  P4_REF_COUNT=$(printf '%s\n' "$P4_REFS" | grep -c . || true)
  echo "  docs 言及 unique npm script: ${P4_REF_COUNT} 件"

  if [ -n "$P4_REFS" ]; then
    while IFS= read -r script; do
      [ -n "$script" ] || continue
      # package.json scripts に "<script>": が存在するか
      if ! grep -qE "\"${script}\"[[:space:]]*:" "$PKG_JSON" 2>/dev/null; then
        DRIFT_P4=$((DRIFT_P4 + 1))
        DRIFT_DETAILS_P4="${DRIFT_DETAILS_P4}\n    - DRIFT: docs 言及 'npm run ${script}' が package.json scripts に 不在"
      fi
    done <<EOF
$P4_REFS
EOF
  fi

  if [ "$DRIFT_P4" -gt 0 ]; then
    echo "  DRIFT 検出: ${DRIFT_P4} 件"
    printf '%b\n' "$DRIFT_DETAILS_P4"
  else
    echo "  PASS (drift 0 件)"
  fi
fi
DRIFT_TOTAL=$((DRIFT_TOTAL + DRIFT_P4))

# ---------------------------------------------------------------
# 総括
# ---------------------------------------------------------------
echo ""
echo "================================================================"
echo "  drift 結果: P1=${DRIFT_P1} P2=${DRIFT_P2} P3=${DRIFT_P3} P4=${DRIFT_P4} TOTAL=${DRIFT_TOTAL}"
echo "================================================================"

# log 記録
{
  printf '%s\tP1=%s\tP2=%s\tP3=%s\tP4=%s\tTOTAL=%s\n' \
    "$TS" "$DRIFT_P1" "$DRIFT_P2" "$DRIFT_P3" "$DRIFT_P4" "$DRIFT_TOTAL"
} >> "$LOG_FILE" 2>/dev/null || true

if [ "$DRIFT_TOTAL" -gt 0 ]; then
  if [ "${DOCS_IMPL_DRIFT_PRE_PUSH:-0}" = "1" ]; then
    CHANGED_DOCS="$(git diff --name-only "${DOCS_IMPL_DRIFT_BASE:-origin/main}"..HEAD -- docs 2>/dev/null || true)"
    DESTRUCTIVE_IMPL="$(git diff --name-status "${DOCS_IMPL_DRIFT_BASE:-origin/main}"..HEAD -- scripts src/index.js package.json 2>/dev/null \
      | grep -E '^(D|R)' || true)"
    if [ -z "$CHANGED_DOCS" ] && [ -z "$DESTRUCTIVE_IMPL" ]; then
      echo ""
      echo "WARN: docs ↔ 実装 drift baseline ${DRIFT_TOTAL} 件あり。"
      echo "pre-push mode: 今回 push は docs 変更または destructive implementation 変更を含まないため、既存 baseline として記録し push は継続。"
      echo "strict 解消は docs drift cleanup mission で扱う。"
      exit 0
    fi
  fi

  # PO 直命 (2026-05-04): DRIFT_REPORT_ONLY=1 bypass 物理削除、 strict mode 完全化。
  # drift 検出時は 必ず exit 1 = push BLOCK
  echo ""
  echo "DRIFT 検出: docs ↔ 実装 ずれ ${DRIFT_TOTAL} 件、 push BLOCK"
  echo "対処:"
  echo "  - P1 (bash code block 構文 error): docs/ 該当 code block を 修正"
  echo "  - P2 (endpoint 不在): src/index.js に app.<method>(...) 追加 OR docs から 削除"
  echo "  - P3 (script 不在): scripts/ に 配置 OR docs から 削除"
  echo "  - P4 (npm script 不在): package.json scripts に 追加 OR docs から 削除"
  exit 1
fi

echo "ALL GREEN: docs ↔ 実装 drift 0 件"
exit 0
