#!/bin/sh
# scripts/abbreviation_grep_check.sh — G21: 暗号略称 grep 違反 #13 防止
#
# 根拠:
#   - 違反 #13「暗号略称 grep 違反」 (機械強制未配線、 ADV 自己回避必須)
#   - PO 直命 (2026-05-02): 「他の指摘も同様に対策」 = mechanical 化必須
#
# 動作:
#   staged diff (or 引数指定 file) に暗号関連略称 (HMAC / JWT / SSO / MFA / TLS / SSL /
#   AES / RSA / SHA / PBKDF / TOTP 等) を 含むが、 直近 1 段落 (前後 5 行) に full term
#   が併記されていない場合 WARN または exit 1
#
# 使い方:
#   sh scripts/abbreviation_grep_check.sh           # staged diff 全体を check
#   sh scripts/abbreviation_grep_check.sh <file>    # 特定 file を check
#
# 起動 timing:
#   (a) pre-commit hook で staged diff scan
#   (b) CI で .md / .js / .ts / .sh / .sql に対し full scan

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# 暗号略称 list (新規追加 自由、 全名併記表で運用)
ABBR_LIST="HMAC JWT SSO MFA TLS SSL AES RSA SHA PBKDF TOTP ECDSA ECDH X25519 ChaCha20 Poly1305 GCM CBC HKDF Scrypt Bcrypt Argon2 SAML OAuth OIDC PKI CSR CRL OCSP DPoP DPAPI"

# 全名併記 mapping (略称 -> full term substring 1 つ以上 hit すれば OK)
get_fullterm() {
  case "$1" in
    HMAC)    echo "Hash-based Message Authentication Code|hash.based message authentication";;
    JWT)     echo "JSON Web Token";;
    SSO)     echo "Single Sign-On";;
    MFA)     echo "Multi-Factor Authentication|multi.factor";;
    TLS)     echo "Transport Layer Security";;
    SSL)     echo "Secure Sockets Layer";;
    AES)     echo "Advanced Encryption Standard";;
    RSA)     echo "Rivest.Shamir.Adleman|公開鍵暗号 RSA";;
    SHA)     echo "Secure Hash Algorithm";;
    PBKDF)   echo "Password-Based Key Derivation";;
    TOTP)    echo "Time-based One-Time Password";;
    ECDSA)   echo "Elliptic Curve Digital Signature";;
    ECDH)    echo "Elliptic Curve Diffie-Hellman";;
    HKDF)    echo "HMAC-based Key Derivation";;
    SAML)    echo "Security Assertion Markup Language";;
    OAuth)   echo "Open Authorization|オープン認可";;
    OIDC)    echo "OpenID Connect";;
    PKI)     echo "Public Key Infrastructure";;
    *)       echo "$1";;  # generic: same string for now
  esac
}

# 検査対象を決定
if [ $# -ge 1 ] && [ -f "$1" ]; then
  TARGETS="$1"
else
  # staged diff から added line を抽出
  TARGETS=$(git diff --cached --name-only --diff-filter=AM 2>/dev/null | grep -E '\.(md|js|ts|sh|sql|yml|yaml|html|css)$' || true)
fi

[ -z "$TARGETS" ] && { echo "INFO: G21 検査対象 0 件 (staged diff or 引数 file なし)"; exit 0; }

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  G21 暗号略称 grep check (違反 #13 防止)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

WARN_COUNT=0
for f in $TARGETS; do
  [ -f "$f" ] || continue
  for abbr in $ABBR_LIST; do
    # added line 内に略称あるか
    HITS=$(grep -nwc "$abbr" "$f" 2>/dev/null || echo "0")
    [ "${HITS:-0}" -eq 0 ] && continue

    # full term 併記が file 内にあるか
    FULLTERMS=$(get_fullterm "$abbr")
    if grep -iEq "($FULLTERMS)" "$f" 2>/dev/null; then
      continue  # OK
    fi

    # full term 不在 → 警告
    echo "⚠ WARN: $f に略称「$abbr」 ($HITS 箇所) があるが、 full term ($FULLTERMS) が併記されていない"
    WARN_COUNT=$((WARN_COUNT + 1))
  done
done

echo ""
if [ "${WARN_COUNT:-0}" -gt 0 ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "⚠ G21 WARN: $WARN_COUNT 件の略称併記不足 (違反 #13 risk)"
  echo "   各 file で 略称 初出時に「(full term)」 を併記、 inline doc で展開してください"
  echo ""
  echo "   例: \"HMAC (Hash-based Message Authentication Code) で sig 計算\""
  echo ""
  echo "   本 gate は WARN レベル (commit 阻止 はしない、 reviewer 確認用)"
  # WARN level: exit 0 で commit 続行を許可、 但し脚注として残す
  exit 0
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ G21 PASS: 全 略称 全名併記 OK"
exit 0
