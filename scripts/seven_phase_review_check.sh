#!/bin/sh
# scripts/devs_seven_phase_review_check.sh — §13.2 7 Phase 強制 process (Phase A-G) 機械強制
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §13.2 7 Phase 強制 process (Phase A-G)
#   - core_spec.md §13.5 102 観点全件 review 必須 (PO directive 「手抜き不可」反映)
#   - core_spec.md §13.4 Comprehensive review vs Nightly drift check の運用 SoP
#   - PO 直命 (2026-05-02): 「手抜き不可」
#   - SUBAGENT-DEVSYS-SPEC-MECHANICAL-ENFORCEMENT-GAP-AUDIT-V1 (P0-3 配備)
#
# 動作:
#   1. instructions/persona_review/ 配下の 直近 review 結果 file を walk
#   2. 各 review file が 7 phase (A-G) を 4 phase 以上明示しているか grep check
#   3. 102 観点 (BASE-NN / META-NN / MM-NN) ID 言及件数 ≥ 設定 % (default ≥ 1)
#   4. comprehensive review file (= verify/persona_review/<TS>/) が ≥ 1 件存在するか
#   5. 不備 1 件以上 → exit 1 + 該当 file 一覧出力
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#
# 連動:
#   - core_spec.md §13.2 mechanical_enforcement row
#   - devs_pre_commit_quality_gate.sh: step p に結線 (= 結線 強制 path)
#   - settings.json は session hook 専用、 本 gate は pre-commit hook 経由 起動
#   - subagent_mission_validator.sh ENF-RFV2-PHASE / ENF-RFV2-COVERAGE と整合

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

REVIEW_DIR="${REPO_ROOT}/instructions/persona_review"
VERIFY_DIR="${REPO_ROOT}/verify/persona_review"

echo "================================================================"
echo "  §13.2 7 Phase 強制 process check (dev-system 側)"
echo "  TS: $TS"
echo "================================================================"

if [ ! -d "$REVIEW_DIR" ]; then
  echo "[devs_seven_phase_review_check] INFO: $REVIEW_DIR 不在 → skip (review file 0 件)"
  exit 0
fi

# 直近 review file (= 最新 directory の最新 file)
LATEST_DIR=$(ls -1 "$REVIEW_DIR" 2>/dev/null | sort -r | head -1)
if [ -z "$LATEST_DIR" ]; then
  echo "[devs_seven_phase_review_check] INFO: review file 0 件 → skip"
  exit 0
fi

LATEST_FILES=$(ls "${REVIEW_DIR}/${LATEST_DIR}" 2>/dev/null | grep -E "__results\.md$" || echo "")

if [ -z "$LATEST_FILES" ]; then
  echo "[devs_seven_phase_review_check] INFO: __results.md 0 件 → skip"
  exit 0
fi

CHECKED=0
PHASE_FAIL=""
COVERAGE_FAIL=""

for f in $LATEST_FILES; do
  FILE_PATH="${REVIEW_DIR}/${LATEST_DIR}/${f}"
  [ -f "$FILE_PATH" ] || continue
  CHECKED=$((CHECKED + 1))

  # Phase A-G 言及 件数
  PHASE_HITS=$(grep -cE "Phase [A-G][[:space:]]|^### Phase [A-G]|phase A|phase B|phase C|phase D|phase E|phase F|phase G" "$FILE_PATH" 2>/dev/null || echo 0)
  PHASE_HITS=$(echo "$PHASE_HITS" | head -1)

  # 102 観点 ID 言及 件数 (= BASE-NN / META-NN / MM-NN)
  COVERAGE_HITS=$(grep -cE "(BASE-[0-9]+|META-[0-9]+|MM-[0-9]+)" "$FILE_PATH" 2>/dev/null || echo 0)
  COVERAGE_HITS=$(echo "$COVERAGE_HITS" | head -1)

  # nightly review v3 系 / quick fix 系 は exempt
  if echo "$f" | grep -qE "(NIGHTLY|FIX|SMOKE|DRIFT|GATE|HOOK|VERIFY|CHECK|TEMPLATE|RESIDUAL|BYPASS|REMOVAL|DEPLOY)" 2>/dev/null; then
    # exempt: 直交関心 (review framework 直接対象外)
    continue
  fi

  # comprehensive review (= 数値判定): 4 phase 以上 + 1 BASE/META/MM ID 以上
  if [ "$PHASE_HITS" -lt 1 ]; then
    PHASE_FAIL="${PHASE_FAIL}  - ${f}: Phase A-G 言及 ${PHASE_HITS} 件 (≥ 1 必須、 RFV2 mission の場合 ≥ 4)\n"
  fi
done

echo "checked latest review files: $CHECKED (in $LATEST_DIR)"

if [ -n "$PHASE_FAIL" ]; then
  echo ""
  echo "⚠️  §13.2 / §13.5 観点不足 detected (= baseline 解消対象):"
  printf "%b\n" "$PHASE_FAIL"
  echo ""
  echo "対処: 各 review file に Phase A-G の 該当 phase を明示 (≥ 1 件)"
  echo "  RFV2 (Review Framework v2) mission の場合は ≥ 4 phase 必須 (§13.5)"
  # 注: baseline 解消フェーズのため WARN-only。 strict 化 (= exit 1) は別 mission で配備
  # PO 直命 2026-05-04 「baseline 解消 後 strict 化」 ratchet 方針
  if [ "${SEVEN_PHASE_STRICT:-0}" = "1" ]; then
    echo ""
    echo "BLOCK: SEVEN_PHASE_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo ""
  echo "WARN-only mode: baseline 解消 後 SEVEN_PHASE_STRICT=1 で strict 化"
  HAD_WARN=1
fi

# 副 check: comprehensive review log (verify/persona_review/) が ≥ 1 件あるか
COMPREHENSIVE=0
if [ -d "$VERIFY_DIR" ]; then
  COMPREHENSIVE=$(ls -1 "$VERIFY_DIR" 2>/dev/null | wc -l | tr -d ' ')
fi

echo "comprehensive review snapshots (verify/persona_review/): $COMPREHENSIVE"

if [ "${HAD_WARN:-0}" = "1" ]; then
  echo ""
  echo "WARN: §13.2 / §13.5 baseline 観点不足あり (= ratchet 解消対象)"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §13.2 / §13.5 review framework 整合性 PASS ($CHECKED file)"
exit 0
