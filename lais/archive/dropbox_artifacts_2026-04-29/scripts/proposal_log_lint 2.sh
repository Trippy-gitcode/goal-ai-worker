#!/bin/sh
# scripts/proposal_log_lint.sh — G12: 提案ログ形式検証 + 滞留日数更新
# 根拠: R2.2 §2.9 ωcrit / PATCH-3（STALE_DATA use-after-rm 修正）
# POSIX sh 互換（§3.7）。bash 拡張禁止。
#
# 使い方: proposal_log_lint.sh [session_progress_file]
# 1回の awk で全行を一括更新（proposal ごとのループ廃止）

set -eu
PROGRESS="${1:-instructions/session_progress.md}"
[ -f "$PROGRESS" ] || exit 0

NOW=$(date -u +%s)

iso_to_epoch() {
  d="$1"
  if e=$(date -j -u -f "%Y-%m-%d" "$d" +%s 2>/dev/null); then
    echo "$e"; return 0
  fi
  date -u -d "$d" +%s 2>/dev/null
}

# 1st pass: 提案行と日付を抽出
MAP_FILE=$(mktemp)
awk '
  /^### .+ \(([0-9]{4}-[0-9]{2}-[0-9]{2}) G_[0-9]+\)/ {
    match($0, /[0-9]{4}-[0-9]{2}-[0-9]{2}/)
    d = substr($0, RSTART, RLENGTH)
    print NR ":" d
  }
' "$PROGRESS" > "$MAP_FILE"

# 滞留日数計算
STALE_DATA=$(mktemp)
while IFS=: read -r lineno d; do
  [ -n "$d" ] || continue
  if ep=$(iso_to_epoch "$d"); then
    days=$(( (NOW - ep) / 86400 ))
    echo "$lineno:$days" >> "$STALE_DATA"
  fi
done < "$MAP_FILE"
rm -f "$MAP_FILE"

# 2nd pass: 1回 awk で滞留日数行を更新
awk -v stale_file="$STALE_DATA" '
  BEGIN {
    while ((getline line < stale_file) > 0) {
      split(line, a, ":")
      proposal_line = a[1] + 0
      days[proposal_line] = a[2]
      block_end[proposal_line] = proposal_line + 15
    }
    close(stale_file)
  }
  {
    updated = 0
    for (p in days) {
      if (NR > p && NR <= block_end[p] && /^- \*\*滞留日数:\*\*/) {
        print "- **滞留日数:** " days[p] "日 (auto-updated)"
        updated = 1
        break
      }
    }
    if (!updated) print
  }
' "$PROGRESS" > "${PROGRESS}.tmp" && mv "${PROGRESS}.tmp" "$PROGRESS"

# STALE_COUNT 集計（rm は FAIL/成功 双方のパスで最後に実行、PATCH-3 対応）
STALE_COUNT=$(awk '{if ($2+0 > 7) c++} END{print c+0}' FS=: "$STALE_DATA" 2>/dev/null || echo 0)
echo "proposal_log_lint: $STALE_COUNT 件が 7日以上滞留"
if [ "$STALE_COUNT" -gt 10 ]; then
  rm -f "$STALE_DATA"
  echo "FAIL: G12 stale proposals > 10"
  exit 1
fi
rm -f "$STALE_DATA"
