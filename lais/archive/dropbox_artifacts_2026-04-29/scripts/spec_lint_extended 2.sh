#!/bin/sh
# scripts/spec_lint_extended.sh
# MISSION-G49-PKG Phase 2.2（PD-111 機械ゲート補助）
#
# 用途:
#   仕様書（dev_system_v34_package.md / development_rules.md / sub_*.md 等）の
#   grep ベース矛盾検出 + 章番号連続性 + 必須セクション存在チェック。
#   pre-commit に結線、CRITICAL 検出で BLOCK。
#
# 引数:
#   <target_file>（必須、正本仕様書のパス）
#
# 検査項目:
#   (A) §C1.5 用語 SSoT 違反: 鉄則/規範/ルール/原則/方針 の 2 語以上同一段落並列使用
#       + §C1.5 参照リンク欠落 → WARN（terminology_lint.sh 既存と整合）
#   (B) §2.25.X 重複: 同一節番号が複数箇所で定義されていないか
#   (C) 章番号連続性: §N.M.K の連続性（穴抜けは WARN）
#   (D) 必須セクション存在: §2.25.1〜.14 / §C0〜§C6 / §15.1〜.7
#       全部存在するか → 欠落で CRITICAL BLOCK
#
# 出力:
#   stdout: チェック結果サマリ（PASS / WARN / CRITICAL）
#   exit: 0 (PASS) / 1 (CRITICAL) / 0 (WARN は通過)
#
# 根拠:
#   - lais/verify/dev_system_v34_package.md §C1.5 / §2.25 / §C0-C6
#   - docs/po-decisions.md PD-111

set -eu

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

TARGET="${1:-}"
if [ -z "$TARGET" ]; then
  echo "[spec_lint_extended] 引数 <target_file> 必須" >&2
  exit 1
fi

if [ ! -f "$TARGET" ]; then
  echo "[spec_lint_extended] target 不在: $TARGET" >&2
  exit 1
fi

CRITICAL_HITS=0
WARN_HITS=0
PASS_REPORTS=""

report_critical() {
  CRITICAL_HITS=$((CRITICAL_HITS + 1))
  printf '[CRITICAL] %s\n' "$1"
}
report_warn() {
  WARN_HITS=$((WARN_HITS + 1))
  printf '[WARN] %s\n' "$1"
}

# --- (D) 必須セクション存在チェック（CRITICAL） --------------------------
REQUIRED_SECTIONS="§2.25.1 §2.25.2 §2.25.3 §2.25.4 §2.25.5 §2.25.6 §2.25.7 §2.25.8 §2.25.9 §2.25.10 §2.25.11 §2.25.12 §2.25.13 §2.25.14 §C0 §C1 §C2 §C3 §C4 §C5 §C6 §15.1 §15.2 §15.3 §15.4 §15.5 §15.6 §15.7"

# §2.25.X / §15.X / §C0-§C6 はファイル種別ごとに任意
case "$TARGET" in
  *dev_system_v34_package.md|*dev_system_spec.md)
    for sec in $REQUIRED_SECTIONS; do
      # §2.25.10 等は §2.25.10 直接マッチ。§C0 は §C0 直接マッチ
      if ! grep -qE "${sec}([^0-9]|$)" "$TARGET"; then
        report_critical "必須セクション欠落: ${sec}"
      fi
    done
    ;;
  *)
    # 他ファイル: 必須セクションチェックは skip
    PASS_REPORTS="${PASS_REPORTS}必須セクションチェック skip (target: $TARGET)\n"
    ;;
esac

# --- (B) §2.25.X 重複検出（CRITICAL） ------------------------------------
# heading レベル ### / #### で §2.25.N が複数回定義されていないか
DUPS=$(grep -E "^####? §2\.25\.[0-9]+" "$TARGET" | sort | uniq -d || true)
if [ -n "$DUPS" ]; then
  while IFS= read -r line; do
    [ -n "$line" ] && report_critical "§2.25.X 節定義重複: $line"
  done <<EOF
$DUPS
EOF
fi

# --- (C) 章番号連続性（WARN） -------------------------------------------
# §2.25.1-.14 が連続しているか
MISSING_2_25=""
for n in 1 2 3 4 5 6 7 8 9 10 11 12 13 14; do
  if ! grep -qE "§2\.25\.${n}([^0-9]|$)" "$TARGET"; then
    MISSING_2_25="${MISSING_2_25}.${n} "
  fi
done
if [ -n "$MISSING_2_25" ]; then
  case "$TARGET" in
    *dev_system_v34_package.md|*dev_system_spec.md)
      report_warn "§2.25 連続性欠落: ${MISSING_2_25}"
      ;;
  esac
fi

# --- (A) §C1.5 用語 SSoT 並列使用 + 参照リンク欠落（WARN） ---------------
# 5 語: 鉄則 / 規範 / ルール / 原則 / 方針
# 同一段落（空行区切り）内で 2 語以上並列使用 + §C1.5 参照欠落 → WARN
PARA_COUNT=$(awk '
  BEGIN{para=""; n=0}
  /^$/{
    if (para != "") {
      hits = 0
      if (para ~ /鉄則/) hits++
      if (para ~ /規範/) hits++
      if (para ~ /ルール/) hits++
      if (para ~ /原則/) hits++
      if (para ~ /方針/) hits++
      if (hits >= 2 && para !~ /§C1\.5/) {
        n++
      }
    }
    para = ""
    next
  }
  { para = para " " $0 }
  END {
    if (para != "") {
      hits = 0
      if (para ~ /鉄則/) hits++
      if (para ~ /規範/) hits++
      if (para ~ /ルール/) hits++
      if (para ~ /原則/) hits++
      if (para ~ /方針/) hits++
      if (hits >= 2 && para !~ /§C1\.5/) n++
    }
    print n
  }
' "$TARGET")
PARA_COUNT="${PARA_COUNT:-0}"
case "$PARA_COUNT" in
  ''|*[!0-9]*) PARA_COUNT=0 ;;
esac

if [ "$PARA_COUNT" -gt 0 ]; then
  # 既存 terminology_lint.sh が許容している除外パターン（code block / sub_*.md 言及）と
  # 同種の許容を完全実装するのは本スクリプト範囲外。WARN 表示にとどめる
  report_warn "§C1.5 候補: 5 語並列使用 + §C1.5 参照欠落の段落 ${PARA_COUNT} 件（terminology_lint.sh で詳細検査）"
fi

# --- 結果 ---------------------------------------------------------------
echo "---"
echo "spec_lint_extended target: $TARGET"
echo "CRITICAL: $CRITICAL_HITS"
echo "WARN: $WARN_HITS"
[ -n "$PASS_REPORTS" ] && printf "%b" "$PASS_REPORTS"

if [ "$CRITICAL_HITS" -gt 0 ]; then
  echo "[BLOCK] CRITICAL ${CRITICAL_HITS} 件、commit BLOCK 推奨"
  exit 1
fi

echo "[PASS] spec_lint_extended OK (warn=$WARN_HITS)"
exit 0
