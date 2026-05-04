#!/bin/sh
# scripts/section42_auto_fire_check.sh — §4.2 同型違反 2 回以上 即時仕様改定 trigger 機械強制 (dev-system 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §4.2 違反の事前回避原則 (同型 2 回以上 → 即時仕様改定 = 自動発火)
#   - core_spec.md §3.5 違反自己申告義務 (連動)
#   - PO 直命 (2026-05-04): 「機械強制 しない 理由 が ない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-P1-MECHANICAL-ENFORCEMENT-DEPLOY-V1 (P1-4 配備)
#
# 動作 (dev-system pre-commit hook 経由):
#   1. verify/adv_violation_log.md を walk
#   2. 各 違反 entry の 「同型 pattern」 / 「root cause」 / 「§ 番号」 を 抽出
#   3. 同型 (= 同 root cause § 番号 が 2 回以上 出現) を 集計
#   4. 同型 ≥ 2 + spec 改定 reflect 痕跡 (= core_spec.md mechanical_enforcement row 追加 / hook 結線)
#      が 0 件 → BLOCK (= §4.2 自動発火 skip 状態)
#   5. spec 改定 reflect 痕跡 ≥ 1 件 → PASS (= 既に 構造的 close 済)
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#
# 連動 (settings.json + pre-commit hook):
#   - settings.json: pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step v に結線)
#   - core_spec.md §4.2 mechanical_enforcement row
#   - templates/scripts/section42_auto_fire_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

LOG_FILE="${REPO_ROOT}/verify/adv_violation_log.md"
SPEC_FILE="${REPO_ROOT}/core_spec.md"

echo "================================================================"
echo "  §4.2 即時仕様改定 trigger check (dev-system 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

if [ ! -f "$LOG_FILE" ]; then
  echo "[devs_section42_auto_fire_check] INFO: $LOG_FILE 不在 → skip (entry 0 件)"
  exit 0
fi

# Step 1: violation entry の root cause § 番号 を 抽出
TMP_FILE="$(mktemp)"
trap "rm -f $TMP_FILE" EXIT

# 各 entry の 「§番号」 references を 集計 (= 例: §3.5, §3.10, §2.25.18 等)
grep -oE '§[0-9]+\.[0-9]+(\.[0-9]+)?' "$LOG_FILE" 2>/dev/null | sort | uniq -c | sort -rn > "$TMP_FILE"

# 同型 ≥ 2 件 出現 § 番号 を 抽出
SAME_TYPE_COUNT=0
SAME_TYPE_DETAIL=""

if [ -s "$TMP_FILE" ]; then
  while read -r line; do
    count=$(echo "$line" | awk '{print $1}')
    sec=$(echo "$line" | awk '{print $2}')
    if [ -z "$count" ] || [ -z "$sec" ]; then
      continue
    fi
    if [ "$count" -ge 2 ]; then
      SAME_TYPE_COUNT=$((SAME_TYPE_COUNT + 1))
      SAME_TYPE_DETAIL="${SAME_TYPE_DETAIL}  - ${sec}: ${count} 件 (同型 ≥ 2 件)\n"
    fi
  done < "$TMP_FILE"
fi

# Step 2: spec 改定 reflect 痕跡 (= mechanical_enforcement row / hook 結線) 確認
SPEC_REFLECT_COUNT=0
if [ -f "$SPEC_FILE" ]; then
  # 各 同型 § について mechanical_enforcement 言及 hit を count
  if [ -s "$TMP_FILE" ]; then
    while read -r line; do
      count=$(echo "$line" | awk '{print $1}')
      sec=$(echo "$line" | awk '{print $2}')
      if [ -z "$count" ] || [ -z "$sec" ]; then
        continue
      fi
      if [ "$count" -ge 2 ]; then
        # core_spec.md で 該当 § + mechanical_enforcement の co-occurrence verify
        SEC_ESC=$(echo "$sec" | sed 's/\./\\./g')
        # 該当 § の section の 50 行先まで mechanical_enforcement keyword hit
        if grep -A 50 "^### ${SEC_ESC}" "$SPEC_FILE" 2>/dev/null | grep -qE 'mechanical_enforcement' ; then
          SPEC_REFLECT_COUNT=$((SPEC_REFLECT_COUNT + 1))
        fi
      fi
    done < "$TMP_FILE"
  fi
fi

echo ""
echo "同型違反 (≥ 2 件 § 番号) 数: $SAME_TYPE_COUNT"
echo "spec 改定 reflect 痕跡 件数: $SPEC_REFLECT_COUNT"

# 判定: 同型 ≥ 1 + reflect 0 → BLOCK (= §4.2 自動発火 skip)
if [ "$SAME_TYPE_COUNT" -ge 1 ] && [ "$SPEC_REFLECT_COUNT" -lt "$SAME_TYPE_COUNT" ]; then
  GAP=$((SAME_TYPE_COUNT - SPEC_REFLECT_COUNT))
  echo ""
  echo "🛑 §4.2 違反検出: 同型違反 ${SAME_TYPE_COUNT} 件 vs spec reflect ${SPEC_REFLECT_COUNT} 件 (gap=${GAP})"
  echo ""
  printf "%b" "$SAME_TYPE_DETAIL"
  echo ""
  echo "対処 (= §4.2 履行 = 即時仕様改定):"
  echo "  1. core_spec.md 該当節 に mechanical_enforcement 行 追加 + hook 結線 設計"
  echo "  2. scripts/devs_<rule>_check.sh + templates/scripts/<rule>_check.sh.template 配備"
  echo "  3. dev-system + Lais 同時 propagate (= §3.12 履行)"
  echo "  4. 「事後記録 免罪符化」 禁止 = 仕様改定 で 構造的 close まで 同型 違反 再生産 する"
  echo ""
  if [ "${SECTION_42_STRICT:-0}" = "1" ]; then
    echo "BLOCK: SECTION_42_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 SECTION_42_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §4.2 即時仕様改定 trigger 健全 (same_type=$SAME_TYPE_COUNT, reflect=$SPEC_REFLECT_COUNT)"
exit 0
