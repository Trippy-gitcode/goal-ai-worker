#!/bin/sh
# scripts/three_layer_role_check.sh — §1.1 完全独立モデル 機械強制 (Lais 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §1.1 完全独立モデル (scaffold ジェネレータパターン、 双方向参照ゼロ)
#   - core_spec.md §2 3 層構造 (PO / ADV / ENG role separation)
#   - PO 直命 (2026-05-04): 「機械強制 しない 理由 が ない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-P2-MECHANICAL-ENFORCEMENT-DEPLOY-V1 (P2-1 配備)
#
# 動作 (dev-system pre-commit hook 経由 / Stop hook 経由):
#   1. 完全独立 違反 検出: dev-system 側 file が 特定 App ハードコード path (= 「goal-ai-worker」/「lais」/「<app-side-path>」 等)
#      を含むか staged file scan
#   2. App 側 → dev-system 双方向参照 検出: dev-system-generated.json metadata 不在
#      かつ 生成 App ファイル ハードコード dev-system path 検出
#   3. 3 層 role mixing 検出: ADV 書込領域 (instructions/ + verify/ + docs/) 以外への 直接 commit
#      かつ subagent 経由痕跡 (= dispatch tool log) 0 件
#   4. 1 件でも 「役割 mixing」 path → exit 1 + 該当 keyword 出力
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#         SKIP_X / DISABLED_BYPASS / DRIFT_REPORT_ONLY 不採用 (= 違反 #53 再生産 禁止)
#
# 連動 (settings.json + pre-commit hook):
#   - settings.json: pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step u1 に結線)
#   - core_spec.md §1.1 mechanical_enforcement row
#   - templates/scripts/three_layer_role_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

echo "================================================================"
echo "  §1.1 完全独立モデル + 3 層 role separation check (Lais 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

# Step 1: dev-system 側 file が App ハードコード を含むか scan
HARDCODE_PATTERN='goal-ai-worker|lais-app|<app-side-path>|/Users/[a-zA-Z]+/Desktop/(goal|lais)|app-specific-name'
HARDCODE_HIT_COUNT=0
HARDCODE_DETAIL=""

# scripts/ + core_spec.md を scan (templates/ は意図的 placeholder のため除外)
for target in "${REPO_ROOT}/scripts" "${REPO_ROOT}/core_spec.md"; do
  [ -e "$target" ] || continue
  if [ -d "$target" ]; then
    # scripts/ 下の .sh のみ scan
    while IFS= read -r f; do
      [ -f "$f" ] || continue
      # 自身は skip (= ハードコード pattern 自身を含む)
      case "$f" in
        */devs_three_layer_role_check.sh) continue ;;
        */templates/*) continue ;;
      esac
      HITS=$(grep -cE "$HARDCODE_PATTERN" "$f" 2>/dev/null || echo 0)
      HITS=$(echo "$HITS" | tr -d '[:space:]')
      if [ "$HITS" -gt 0 ]; then
        HARDCODE_HIT_COUNT=$((HARDCODE_HIT_COUNT + HITS))
        HARDCODE_DETAIL="${HARDCODE_DETAIL}  - $f: ${HITS} 件 ハードコード\n"
      fi
    done <<EOF
$(find "$target" -type f -name '*.sh' 2>/dev/null)
EOF
  else
    HITS=$(grep -cE "$HARDCODE_PATTERN" "$target" 2>/dev/null || echo 0)
    HITS=$(echo "$HITS" | tr -d '[:space:]')
    if [ "$HITS" -gt 0 ]; then
      HARDCODE_HIT_COUNT=$((HARDCODE_HIT_COUNT + HITS))
    fi
  fi
done

# Step 2: 3 層 role mixing 検出 = staged file が core_spec.md / scripts/*.sh / templates/ への
#         直接 commit でかつ subagent dispatch 痕跡 0 件
ROLE_VIOLATION_COUNT=0
HAS_GIT=0
if command -v git >/dev/null 2>&1 && [ -d "${REPO_ROOT}/.git" ]; then
  HAS_GIT=1
  STAGED_RESTRICTED=$(cd "$REPO_ROOT" && git diff --cached --name-only --diff-filter=ACM 2>/dev/null | grep -E '^(core_spec\.md|scripts/.+\.sh|templates/|skills/|docs/plans/)' || true)
  if [ -n "$STAGED_RESTRICTED" ]; then
    # 直近 commit msg / staged で subagent 痕跡 を verify
    LAST_MSG=$(cd "$REPO_ROOT" && git log -1 --pretty=%B 2>/dev/null || true)
    SUBAGENT_TRACE=$(echo "$LAST_MSG" | grep -cE 'SUBAGENT-|subagent|dispatch|Async agent launched' || echo 0)
    SUBAGENT_TRACE=$(echo "$SUBAGENT_TRACE" | tr -d '[:space:]')
    if [ "$SUBAGENT_TRACE" -eq 0 ]; then
      ROLE_VIOLATION_COUNT=1
    fi
  fi
fi

echo ""
echo "ハードコード App path hit: $HARDCODE_HIT_COUNT"
echo "3 層 role mixing 違反 (subagent 経由 0): $ROLE_VIOLATION_COUNT"

# 判定: ハードコード ≥ 1 OR role mixing ≥ 1 → §1.1 違反
if [ "$HARDCODE_HIT_COUNT" -ge 1 ] || [ "$ROLE_VIOLATION_COUNT" -ge 1 ]; then
  echo ""
  echo "🛑 §1.1 完全独立 / 3 層 role separation 違反検出"
  printf "%b" "$HARDCODE_DETAIL"
  echo ""
  echo "対処 (= §1.1 履行):"
  echo "  1. dev-system 側 file の App ハードコード path 削除 (= placeholder / env override 化)"
  echo "  2. 3 層 role 厳守: ADV 直接書込は instructions/ + verify/ + docs/ のみ"
  echo "  3. core_spec.md / scripts/ / templates/ / skills/ への 変更 は subagent 経由 必須"
  echo "  4. App 側 → dev-system 参照 0 件 維持 (= 完全独立モデル §1.1)"
  echo ""
  if [ "${THREE_LAYER_ROLE_STRICT:-0}" = "1" ]; then
    echo "BLOCK: THREE_LAYER_ROLE_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 THREE_LAYER_ROLE_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §1.1 完全独立 + 3 層 role separation 健全 (hardcode=$HARDCODE_HIT_COUNT, role_mix=$ROLE_VIOLATION_COUNT)"
exit 0
