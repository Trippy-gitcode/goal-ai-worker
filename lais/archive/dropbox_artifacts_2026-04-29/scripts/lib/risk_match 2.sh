#!/bin/sh
# scripts/lib/risk_match.sh — RISK_PATHS prefix match ヘルパー
# 根拠: R2.2 §2.5 υcrit / γ' R1 / PATCH-15（runtime_preflight 統合）
# POSIX sh 互換。bash 拡張禁止。
#
# 使い方:
#   . scripts/lib/risk_match.sh
#   if is_risk_path "src/auth/signup.ts"; then ... ; fi

# risk_patterns.sh を source（自ディレクトリ基準）
_RISK_MATCH_DIR=$(cd "$(dirname "$0")" 2>/dev/null && pwd)
[ -n "$_RISK_MATCH_DIR" ] || _RISK_MATCH_DIR="scripts/lib"
. "$_RISK_MATCH_DIR/risk_patterns.sh"

# 単一パスが RISK_PATHS の prefix match に該当するか判定
# PASS: exit 0 + パス stdout
# FAIL: exit 1
is_risk_path() {
  target="$1"
  [ -n "$target" ] || return 1
  printf '%s\n' "$RISK_PATHS" | awk 'NF>0 { print }' | while IFS= read -r pat; do
    [ -z "$pat" ] && continue
    case "$target" in
      "$pat"*) printf '%s\n' "$target"; exit 0 ;;
    esac
  done
  # while はサブシェルなので直接の return では伝わらない。
  # POSIX 互換のため grep を使った再判定で結果を親に伝える。
  printf '%s\n' "$RISK_PATHS" | awk 'NF>0 { print }' | while IFS= read -r pat; do
    [ -z "$pat" ] && continue
    case "$target" in "$pat"*) echo "HIT"; break ;; esac
  done | grep -q '^HIT$'
}
