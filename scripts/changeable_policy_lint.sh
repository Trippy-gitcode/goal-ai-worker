#!/bin/sh
# GENERATED: DO NOT MODIFY
# scripts/changeable_policy_lint.sh
#
# new-script: dev-system v0.1.0 Phase 2 新設（SUBAGENT-DEVSYS-SCRIPTS-PHASE2、PRIOR-APP に対応 script 無し）
# app-independence: APP_REPO_ROOT_ENV / APP_REPO_MARKER / APP_REPO_CANDIDATES
# spec-ref: docs/changeable_policy.md §2 (改変禁止ファイル一覧) / §5 (タグ規則)
#
# 用途:
#   docs/changeable_policy.md の改変禁止リストと実ファイルの整合検証 +
#   `// GENERATED: DO NOT MODIFY` タグ（5 言語別）存在確認 +
#   `<!-- GENERATED: DO NOT MODIFY START / END -->` 範囲タグ対応確認。
#
# 引数:
#   （なし）              REPO_ROOT 配下を検査
#   --policy <path>       changeable_policy.md のパス（既定 docs/changeable_policy.md）
#   --strict              範囲タグ START/END 不一致を CRITICAL（既定 WARN）
#   --help / -h           ヘルプ表示
#
# 検査項目:
#   (A) 改変禁止ファイルリスト各エントリの存在 + タグ存在確認
#       対応タグ形式（changeable_policy.md §5.1）:
#         *.sh       → '# GENERATED: DO NOT MODIFY'
#         *.md       → '<!-- GENERATED: DO NOT MODIFY -->' or START/END 範囲
#         *.ts/.js   → '// GENERATED: DO NOT MODIFY'
#         *.json     → '"_generated": true'
#         *.yaml/.yml → '# GENERATED: DO NOT MODIFY'
#   (B) 範囲タグ START/END ペア対応（*.md のみ）
#   (C) 範囲タグ範囲外の編集検出（GENERATED END 後の余剰行は許容、
#       START 前 + END 後の同一文書は警告のみ）
#
# 出力:
#   stdout: 検査結果サマリ（PASS / WARN / CRITICAL）
#   exit: 0 (PASS) / 1 (CRITICAL)
#
# 環境変数（App 非依存化）:
#   APP_REPO_ROOT_ENV / APP_REPO_MARKER / APP_REPO_CANDIDATES
#   CHANGEABLE_POLICY_PATH    docs/changeable_policy.md のパス上書き（既定 docs/changeable_policy.md）
#
# 設計指針:
#   - 改変禁止ファイル一覧は changeable_policy.md §2 の表から grep ベース抽出
#   - タグ形式判定はファイル拡張子で分岐（5 言語別）
#   - 範囲タグの整合性検証は `<!-- GENERATED: DO NOT MODIFY START -->` /
#     `<!-- GENERATED: DO NOT MODIFY END -->` の出現回数一致で代用
#
# 根拠:
#   - docs/changeable_policy.md §2 改変禁止ファイル一覧
#   - docs/changeable_policy.md §5.1 タグ形式（5 言語別）
#   - docs/changeable_policy.md §5.3 範囲タグ
#   - docs/changeable_policy.md §5.4 機械検査（本スクリプトが該当実装）

set -eu

SELF_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "${SELF_DIR}/lib/resolve_repo_root.sh" ]; then
  # shellcheck disable=SC1091
  . "${SELF_DIR}/lib/resolve_repo_root.sh" 2>/dev/null || true
fi

REPO_ROOT=""
if command -v resolve_repo_root >/dev/null 2>&1; then
  REPO_ROOT="$(resolve_repo_root 2>/dev/null || true)"
fi
if [ -z "${REPO_ROOT}" ]; then
  REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
fi
cd "${REPO_ROOT}" 2>/dev/null || true

POLICY_PATH="${CHANGEABLE_POLICY_PATH:-docs/changeable_policy.md}"
STRICT_MODE=0

while [ $# -gt 0 ]; do
  case "$1" in
    --policy) POLICY_PATH="${2:-}"; shift 2 ;;
    --strict) STRICT_MODE=1; shift ;;
    --help|-h)
      cat <<HLP
changeable_policy_lint.sh - 改変禁止ファイル / タグ整合検査
Usage:
  changeable_policy_lint.sh [--policy docs/changeable_policy.md] [--strict]
Description:
  改変禁止ファイル一覧の存在 + タグ（5 言語別）有無 + 範囲タグ START/END 対応を検査。
HLP
      exit 0
      ;;
    *) shift ;;
  esac
done

if [ ! -f "$POLICY_PATH" ]; then
  echo "[changeable_policy_lint] policy 不在: $POLICY_PATH" >&2
  exit 1
fi

CRITICAL_HITS=0
WARN_HITS=0
PASS_HITS=0

report_critical() {
  CRITICAL_HITS=$((CRITICAL_HITS + 1))
  printf '[CRITICAL] %s\n' "$1"
}
report_warn() {
  WARN_HITS=$((WARN_HITS + 1))
  printf '[WARN] %s\n' "$1"
}
report_pass() {
  PASS_HITS=$((PASS_HITS + 1))
  printf '[PASS] %s\n' "$1"
}

# --- (A) 改変禁止ファイルリスト抽出 -----------------------------------
# changeable_policy.md §2 改変禁止表 (`^## 2\.` から次の `^## [3-9]\.` まで) のみ
# 表形式 `| <path> | <理由> |` から path を抽出。§3 改変自由表 / §5.1 タグ規則表は除外。
# scripts/*.sh / scripts/lib/*.sh / dev-system-generated.json / docs/plans/sub_*.md
RESTRICTED_FILES=$(awk '
/^## 2\./ { in_section_2 = 1; next }
/^## [3-9]\./ { in_section_2 = 0 }
in_section_2 && /^\| `[^`]+\.(sh|json|md|ts|js|yaml|yml)` \|/ {
  match($0, /`[^`]+`/);
  if (RSTART > 0) {
    s = substr($0, RSTART+1, RLENGTH-2);
    print s;
  }
}
' "$POLICY_PATH")

if [ -z "$RESTRICTED_FILES" ]; then
  report_warn "改変禁止ファイルリストの抽出 0 件 (policy: $POLICY_PATH)"
fi

# --- (A) 各ファイルの存在 + タグ確認 --------------------------------
# dev-system 自身では dev-system-generated.json は生成 App 側でのみ作成 (LINT-WARN-CLEANUP-V1)
IS_DEVSYS_ROOT=0
[ -f "${REPO_ROOT}/templates/dev-system-generated.template.json" ] && IS_DEVSYS_ROOT=1

for f in $RESTRICTED_FILES; do
  # セクション参照記法 (例 "改変禁止セクション") は skip
  case "$f" in
    *セクション|*\ * ) continue ;;
  esac
  # dev-system root では dev-system-generated.json skip (Phase 3 ジェネレータが App 側に作成)
  if [ "$IS_DEVSYS_ROOT" -eq 1 ] && [ "$f" = "dev-system-generated.json" ]; then
    continue
  fi

  if [ ! -f "$f" ]; then
    # 未生成のファイル（Phase 2 で実装予定の persona_review_runner 等）は WARN
    report_warn "改変禁止ファイル不在 (未実装可能性): $f"
    continue
  fi

  # ファイル拡張子でタグ形式を判定
  TAG_FOUND=0
  case "$f" in
    *.sh|*.yaml|*.yml)
      if grep -qE '^# GENERATED: DO NOT MODIFY' "$f"; then
        TAG_FOUND=1
      fi
      ;;
    *.md)
      if grep -qE 'GENERATED: DO NOT MODIFY' "$f"; then
        TAG_FOUND=1
      fi
      ;;
    *.ts|*.tsx|*.js|*.jsx)
      if grep -qE '^// GENERATED: DO NOT MODIFY' "$f"; then
        TAG_FOUND=1
      fi
      ;;
    *.json)
      if grep -qE '"_generated"[[:space:]]*:[[:space:]]*true' "$f"; then
        TAG_FOUND=1
      fi
      ;;
    *)
      # 不明拡張子: タグ形式不問で grep フォールバック
      if grep -qE 'GENERATED: DO NOT MODIFY' "$f"; then
        TAG_FOUND=1
      fi
      ;;
  esac

  if [ "$TAG_FOUND" -eq 1 ]; then
    report_pass "tag-present: $f"
  else
    report_critical "改変禁止タグ欠落: $f (拡張子別タグ形式 changeable_policy.md §5.1 参照)"
  fi
done

# --- (B) 範囲タグ START/END ペア対応 (*.md) ---------------------------
# §3 改変自由 (verify/ / instructions/ / 履歴系 docs) は START 引用言及が頻出するため除外 (LINT-WARN-CLEANUP-V1)
MD_FILES=$(find "${REPO_ROOT}" -type f -name "*.md" \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/verify/*" \
  -not -path "*/instructions/*" \
  2>/dev/null || true)

for md in $MD_FILES; do
  REL="${md#${REPO_ROOT}/}"
  case "$REL" in
    docs/decision_log.md|docs/po-decisions.md|docs/learned-patterns.md) continue ;;
  esac

  START_COUNT=$(grep -cE 'GENERATED: DO NOT MODIFY START' "$md" 2>/dev/null | tr -d ' \n' || echo 0)
  END_COUNT=$(grep -cE 'GENERATED: DO NOT MODIFY END' "$md" 2>/dev/null | tr -d ' \n' || echo 0)
  # 0/0 はタグ不在、検査対象外
  if [ "$START_COUNT" = "0" ] && [ "$END_COUNT" = "0" ]; then
    continue
  fi
  if [ "$START_COUNT" != "$END_COUNT" ]; then
    if [ "$STRICT_MODE" -eq 1 ]; then
      report_critical "範囲タグ START/END 不一致: $REL (start=$START_COUNT end=$END_COUNT)"
    else
      report_warn "範囲タグ START/END 不一致: $REL (start=$START_COUNT end=$END_COUNT)"
    fi
  fi
done

# --- (C) 範囲タグ範囲外編集検出 ---------------------------------------
# changeable_policy.md §5.3 範囲タグの構造:
#   <!-- GENERATED: DO NOT MODIFY START -->
#   ... (改変禁止セクション)
#   <!-- GENERATED: DO NOT MODIFY END -->
#   ... (改変自由セクション、App 開発者編集可)
# 範囲外編集はそもそも合法なので検出は WARN レベル（情報提示のみ）
# 本実装では範囲タグ存在ファイル数を集計表示
RANGE_TAG_FILES=$(echo "$MD_FILES" | tr ' ' '\n' | xargs -I {} sh -c '
  if grep -q "GENERATED: DO NOT MODIFY START" "{}" 2>/dev/null; then
    echo "{}"
  fi
' 2>/dev/null | wc -l | tr -d ' ')

# --- 結果 ---------------------------------------------------------------
echo "---"
echo "changeable_policy_lint summary:"
echo "  policy: $POLICY_PATH"
echo "  restricted_files_in_policy: $(echo "$RESTRICTED_FILES" | grep -c . 2>/dev/null || echo 0)"
echo "  range_tag_files: $RANGE_TAG_FILES"
echo "  PASS: $PASS_HITS"
echo "  WARN: $WARN_HITS"
echo "  CRITICAL: $CRITICAL_HITS"

if [ "$CRITICAL_HITS" -gt 0 ]; then
  echo "[BLOCK] CRITICAL ${CRITICAL_HITS} 件、commit BLOCK 推奨"
  exit 1
fi

echo "[PASS] changeable_policy_lint OK (warn=$WARN_HITS)"
exit 0
