#!/bin/sh
# scripts/terminology_lint.sh — G10 拡張: 用語 SSOT 検証（§C1.5）
# 根拠: R2.2 §C1.5 用語 SSOT / PATCH-10 / PATCH-19 Bug G（grep 排除パターン追加）
# POSIX sh 互換（§3.7）。bash 拡張禁止。
#
# 5語（設計原則 / 鉄則 / 規範 / ルール / 方針）のうち 2語以上を同一段落で並列使用する場合、
# §C1.5 への参照が欠落していれば WARN。
# 排除パターン: code|Protocol|Policy|Rules|§2\.25|§C1\.5|sub_hflow_protocol\.md|sub_adv_protocol\.md|sub_review_flow\.md
# 検査対象: docs/plans/*.md, development_rules.md, lais/verify/*.md

set -eu
TARGETS="${*:-docs/plans/dev_system_spec.md docs/plans/sub_adv_protocol.md docs/plans/sub_hflow_protocol.md docs/plans/sub_review_flow.md development_rules.md}"

WARN_COUNT=0
for f in $TARGETS; do
  [ -f "$f" ] || continue
  # 各ファイルを段落単位（空行区切り）で走査
  MIX=$(awk '
    BEGIN { RS=""; FS="\n" }
    {
      hits = 0
      if ($0 ~ /設計原則/) hits++
      if ($0 ~ /鉄則/) hits++
      if ($0 ~ /規範/) hits++
      if ($0 ~ /ルール/) hits++
      if ($0 ~ /方針/) hits++
      if (hits >= 2) {
        # 排除パターンに該当すれば除外（PATCH-19 / Bug G）
        if ($0 ~ /code|Protocol|Policy|Rules|§2\.25|§C1\.5|sub_hflow_protocol\.md|sub_adv_protocol\.md|sub_review_flow\.md/) next
        print NR ": " $0
      }
    }
  ' "$f" || true)
  if [ -n "$MIX" ]; then
    echo "WARN: G10/§C1.5 terminology mix in ${f}（§C1.5 参照欠落）:" >&2
    printf '%s\n' "$MIX" | head -5 >&2
    WARN_COUNT=$((WARN_COUNT + 1))
  fi
done

echo "terminology_lint: WARN=$WARN_COUNT files"
# WARN のみ、FAIL しない（§C1.5 は SSOT で、個別記述は WARN で運用監視）
exit 0
