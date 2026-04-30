#!/bin/sh
# scripts/spawn_subagent_review.sh
# dev-system v3.5 Phase 3（案 D'、sub_external_review_protocol §4.3）
# templates/subagent_review_prompt.md の persona セクションを抽出し、
# claude -p で fresh context subagent を起動するヘルパー。
#
# Usage:
#   spawn_subagent_review.sh <persona> <target_file>
#   persona: adv | eng | qa | pre_review
#
# 動作:
#   1. templates/subagent_review_prompt.md から `## <persona>_subagent` セクションを awk で抽出
#   2. claude -p（fresh context）に標準入力経由でプロンプト送付
#   3. --add-dir lais/review_feed/ でレビュー対象ディレクトリへのアクセス許可を追加
#   4. --allowedTools "Read Glob Grep Bash" で読取専用ツールのみ許可（Edit/Write を除外して書込制限）
#
# 根拠:
#   - docs/plans/sub_external_review_protocol.md §4.3 プロンプトテンプレ運用定着
#   - docs/plans/dev_system_v35_roadmap.md §3.1 Phase 3 LP-030/031/032 運用定着
#   - LP-030（同一セッション self-critique 限界 → fresh context 必須）

set -eu

PERSONA="${1:?Usage: $0 <persona> <target_file>}"
TARGET="${2:?Usage: $0 <persona> <target_file>}"

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
PROMPT_FILE="${REPO_ROOT}/templates/subagent_review_prompt.md"

[ -f "$PROMPT_FILE" ] || { echo "FAIL: $PROMPT_FILE not found" >&2; exit 1; }

# persona 値の妥当性チェック（adv / eng / qa / pre_review 4 値のみ許容）
case "$PERSONA" in
  adv|eng|qa|pre_review) : ;;
  *) echo "FAIL: persona must be one of: adv, eng, qa, pre_review" >&2; exit 1 ;;
esac

# プロンプト抽出（## <persona>_subagent から次の ## まで、見出し行は除外）
PROMPT_SECTION=$(awk -v p="^## ${PERSONA}_subagent$" '
  $0 ~ p { in_section=1; next }
  in_section && /^## / { in_section=0 }
  in_section { print }
' "$PROMPT_FILE")

[ -n "$PROMPT_SECTION" ] || { echo "FAIL: persona '$PERSONA' not found in $PROMPT_FILE" >&2; exit 1; }

# subagent 起動（claude -p で fresh context 独立、--add-dir でアクセス許可ディレクトリ追加、--allowedTools で読取専用ツールに限定）
echo "spawn_subagent_review: persona=$PERSONA target=$TARGET"

if command -v claude >/dev/null 2>&1; then
  printf '%s\n\n対象: %s\n%s レビューを実施してください。\n' \
    "$PROMPT_SECTION" "$TARGET" "$PERSONA" \
    | claude -p --add-dir "${REPO_ROOT}/lais/review_feed/" --allowedTools "Read Glob Grep Bash"
else
  echo "FAIL: claude CLI not found in PATH" >&2
  echo "spawn_subagent_review: persona=$PERSONA を起動できないため抽出プロンプトのみ標準出力に出力します" >&2
  printf '%s\n\n対象: %s\n%s レビューを実施してください。\n' \
    "$PROMPT_SECTION" "$TARGET" "$PERSONA"
  exit 2
fi
