#!/bin/bash
# session_archiver.sh — session_progress.mdの300行制限維持
# 完了済みセクションをsession_history.mdにアーカイブ
# 使い方: bash scripts/session_archiver.sh
# 更新: 2026-04-05

SP="instructions/session_progress.md"
ARCHIVE="instructions/results/session_history.md"
MAX_LINES=300

if [ ! -f "$SP" ]; then echo "ERROR: $SP not found"; exit 1; fi

CURRENT=$(wc -l < "$SP" | tr -d ' ')
if [ "$CURRENT" -le "$MAX_LINES" ]; then
  echo "OK: session_progress.md is $CURRENT lines (≤ $MAX_LINES)"
  exit 0
fi

echo "ARCHIVING: $CURRENT lines > $MAX_LINES"

# 完了済みセクション開始行を検出
COMPLETED_START=$(grep -n "^## 完了済み" "$SP" | head -1 | cut -d: -f1)
if [ -z "$COMPLETED_START" ]; then
  echo "WARN: '## 完了済み' section not found. Manual cleanup needed."
  exit 1
fi

# アーカイブに追記
echo "" >> "$ARCHIVE"
echo "---" >> "$ARCHIVE"
echo "## アーカイブ $(date '+%Y-%m-%d')" >> "$ARCHIVE"
sed -n "${COMPLETED_START},\$p" "$SP" >> "$ARCHIVE"

# session_progress.mdから完了済みセクションを削除し、参照リンクだけ残す
head -n $((COMPLETED_START - 1)) "$SP" > "${SP}.tmp"
echo "" >> "${SP}.tmp"
echo "## 完了済み（詳細は instructions/results/session_history.md）" >> "${SP}.tmp"
mv "${SP}.tmp" "$SP"

NEW_LINES=$(wc -l < "$SP" | tr -d ' ')
echo "DONE: $CURRENT → $NEW_LINES lines"
echo "Archived to: $ARCHIVE"
