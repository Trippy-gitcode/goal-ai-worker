#!/bin/sh
# scripts/workflow_inversion_check.sh — workflow inversion 構造的 強制 (App 側 = Lais)
#
# ミッション: SUBAGENT-DEVSYS-WORKFLOW-INVERSION-CHECK-V1 (PO 直命 2026-05-04)
#
# 根拠:
#   - PO 指摘 (2026-05-04): 「自社テスト完了するまではGitテストかけないはず」
#   - PO 指摘 (2026-05-04): 「機械的に防げるようにしていたはず、なんでそれが実現できたの？」
#   - lais/core_spec_v4.md / dev-system core_spec.md §2.25.21 Primary Quality Gate Inversion
#   - 違反 #54 (= 自社 a-e PASS 前に 3rd-party workflow 起動 を 機械強制 で 防止せず)
#
# 設計:
#   .github/workflows/*.yml の `on:` block を スキャン、
#   `schedule` / `push` / `pull_request` trigger ≥ 1 件 検出で exit 1 (= BLOCK)。
#   `workflow_run` (= 自社 PASS 後 起動) / `workflow_dispatch` (= 手動 のみ) のみ OK。
#
# 配置:
#   - Lais pre-push hook chain (adv_pre_push_quality_gate.sh + settings.json + Stop hook 連携)
#   - Lais 自身の .git/hooks/pre-push 経由 起動
#
# bypass 機構:
#   なし (= 物理 0、 違反 #53 + #54 同型 再生産 禁止、 PO 直命 2026-05-04 反映)
#
# 起動 (引数なし = カレント repo の .github/workflows/ をスキャン):
#   sh scripts/workflow_inversion_check.sh
#
# 起動 (path 指定 = scan 対象 ディレクトリ):
#   sh scripts/workflow_inversion_check.sh /path/to/.github/workflows

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

# scan 対象 (引数 1 = path、 default = カレント repo)
SCAN_DIR="${1:-${REPO_ROOT}/.github/workflows}"

VIOLATION_COUNT=0
VIOLATION_LIST=""
PASS_LIST=""

echo "================================================================"
echo "  workflow inversion check (LAIS-V1)"
echo "  PO 直命 2026-05-04 / SUBAGENT-DEVSYS-WORKFLOW-INVERSION-CHECK-V1"
echo "  違反 #54 同型 再生産 禁止"
echo "  scan dir: ${SCAN_DIR}"
echo "  TS: ${TS}"
echo "================================================================"

# scan dir 不在 = active workflow 0 = OK
if [ ! -d "${SCAN_DIR}" ]; then
  echo "  scan dir 不在 (${SCAN_DIR}) = active workflow 0 = OK"
  exit 0
fi

# .yml file 列挙 (.disabled-* dir は 除外)
YML_LIST=$(find "${SCAN_DIR}" -maxdepth 1 -type f \( -name '*.yml' -o -name '*.yaml' \) 2>/dev/null | sort)

if [ -z "${YML_LIST}" ]; then
  echo "  active .yml file 0 件 = workflow inversion 違反 0 = OK"
  exit 0
fi

echo ""
echo "  active workflow file 検査:"
echo "  --------------------------"

for YML in ${YML_LIST}; do
  BASENAME=$(basename "${YML}")

  # 違反 trigger pattern: schedule / push / pull_request
  # OK trigger pattern: workflow_run / workflow_dispatch

  # grep -c は match 0 件 で exit 1 + stdout "0" を出す、 || で 上書きすると "0\n0" になり
  # 算術 expression に渡すと "0\n0: syntax error" で fail。 grep を | wc -l で wrap して 単一値 化。
  HAS_SCHEDULE=$(grep -E '^[[:space:]]+(schedule|- cron):' "${YML}" 2>/dev/null | wc -l | tr -d ' ')
  HAS_PUSH=$(grep -E '^[[:space:]]+push:' "${YML}" 2>/dev/null | wc -l | tr -d ' ')
  HAS_PR=$(grep -E '^[[:space:]]+pull_request:' "${YML}" 2>/dev/null | wc -l | tr -d ' ')

  HAS_WORKFLOW_RUN=$(grep -E '^[[:space:]]+workflow_run:' "${YML}" 2>/dev/null | wc -l | tr -d ' ')
  HAS_WORKFLOW_DISPATCH=$(grep -E '^[[:space:]]+workflow_dispatch:?' "${YML}" 2>/dev/null | wc -l | tr -d ' ')

  TOTAL_BAD=$((HAS_SCHEDULE + HAS_PUSH + HAS_PR))

  if [ "${TOTAL_BAD}" -gt 0 ]; then
    VIOLATION_COUNT=$((VIOLATION_COUNT + 1))
    VIOLATION_DETAIL=""
    [ "${HAS_SCHEDULE}" -gt 0 ] && VIOLATION_DETAIL="${VIOLATION_DETAIL} schedule"
    [ "${HAS_PUSH}" -gt 0 ] && VIOLATION_DETAIL="${VIOLATION_DETAIL} push"
    [ "${HAS_PR}" -gt 0 ] && VIOLATION_DETAIL="${VIOLATION_DETAIL} pull_request"
    echo "  [VIOLATION] ${BASENAME} : trigger =${VIOLATION_DETAIL}"
    VIOLATION_LIST="${VIOLATION_LIST} ${BASENAME}"
  else
    if [ "${HAS_WORKFLOW_RUN}" -gt 0 ] || [ "${HAS_WORKFLOW_DISPATCH}" -gt 0 ]; then
      echo "  [OK]        ${BASENAME} : workflow_run / workflow_dispatch のみ"
      PASS_LIST="${PASS_LIST} ${BASENAME}"
    else
      # trigger 不明 = 安全側 fail
      VIOLATION_COUNT=$((VIOLATION_COUNT + 1))
      echo "  [VIOLATION] ${BASENAME} : trigger 不明 (= workflow_run / workflow_dispatch 不検出)"
      VIOLATION_LIST="${VIOLATION_LIST} ${BASENAME}"
    fi
  fi
done

echo ""
echo "================================================================"
echo "  workflow inversion check 結果: VIOLATIONS=${VIOLATION_COUNT}"
if [ "${VIOLATION_COUNT}" -gt 0 ]; then
  echo "  違反 file:${VIOLATION_LIST}"
  echo ""
  echo "  対処:"
  echo "    1. 違反 file の on: block を workflow_run / workflow_dispatch に統一"
  echo "    2. 暫定 disable は .github/workflows/.disabled-until-self-tests-green/ へ 物理 移動"
  echo "    3. 自社 a-e 5 chain (vitest / playwright / g50 / lint / ai_review) PASS 後 のみ active 復活"
fi
echo "================================================================"

# pre-commit / pre-push hook 連携 marker (= settings.json + Stop hook + .git/hooks/pre-* から起動)
# core_spec.md §2.25.21 mechanical_enforcement の workflow_inversion_check 配線 強制 row

if [ "${VIOLATION_COUNT}" -gt 0 ]; then
  echo ""
  echo "BLOCKED (workflow inversion): 違反 #54 同型 再生産 禁止、 PO 直命 2026-05-04 反映。"
  echo "bypass 機構 0 = 違反 file 全件 fix 後 のみ commit / push 可。"
  exit 1
fi

echo "ALL GREEN (workflow inversion): 自社 PASS 前 起動 trigger 0 件 = OK"
exit 0
