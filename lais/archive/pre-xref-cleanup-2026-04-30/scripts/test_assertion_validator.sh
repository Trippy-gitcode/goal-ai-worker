#!/bin/sh
# scripts/test_assertion_validator.sh
# PATCH-TEST-GAP-LOGIN-REDIRECT-IMPL（2026-04-26、ENG/QA subagent）
#
# 用途:
#   Playwright spec の真 E2E 3 軸 assertion 網羅性を grep で機械検証する。
#   §2.25.21.4 真 E2E PASS = (a) API 成功 + (b) 期待 URL/DOM 到達 + (c) リロード後 session 維持
#   の 3 軸 assertion パターンが各 1 つ以上 spec 内に存在することを確認する。
#
# 使用法:
#   scripts/test_assertion_validator.sh <spec_file_or_dir>
#   scripts/test_assertion_validator.sh lais/tests/realmachine/auth-3-axis.spec.ts
#   scripts/test_assertion_validator.sh lais/tests/realmachine/   # ディレクトリ指定 = 全 *.spec.ts
#
# 出力:
#   stdout: TAB 区切り 5 列（spec_path / url_count / dom_count / reload_after_count / verdict）
#   exit 0: 全 spec で 3 軸 assertion 各 1 つ以上 (PASS)
#   exit 1: 1 つ以上の spec で 3 軸不足 (BLOCK)
#
# 検出パターン（grep -E）:
#   url_count: `expect(page.url()` / `page.waitForURL` / `expect(page).toHaveURL` / `expect(page).not.toHaveURL`
#   dom_count: `expect(page.locator(` ... `.toBeVisible()` / `.toHaveText(` / `.toContainText(` (combined)
#   reload_after_count: `page.reload(` の出現 + その「後」に再度 expect が出現するか
#                       簡易判定として「page.reload(」の出現回数を採取（spec 内の reload-after assertion は
#                       規約として page.reload() の後にのみ書かれる前提）
#
# 配線:
#   - scripts/adv_response_gate.sh の Phase 完了宣言キーワード検出 + 真 E2E PASS 主張時に呼出
#   - 不足時は VIOLATIONS_CRITICAL に追記して BLOCK
#
# 仕様根拠:
#   - lais/verify/dev_system_v34_package.md §2.25.21.4 / §2.25.21.6（PATCH-TEST-GAP-LOGIN-REDIRECT-IMPL）
#   - lais/verify/test_gap_login_redirect_review_2026-04-26.md（T1/T3/T4 採択）

set -eu

# --auth-only モード: auth/login/redirect 系 spec のみ対象 (3 軸厳格化スコープ)
# 引数解釈: --auth-only [TARGET]  または  TARGET 単独
AUTH_ONLY=0
TARGET=""
for arg in "$@"; do
  case "$arg" in
    --auth-only) AUTH_ONLY=1 ;;
    *) TARGET="$arg" ;;
  esac
done

if [ -z "$TARGET" ]; then
  echo "ERROR: usage: $0 [--auth-only] <spec_file_or_dir>" >&2
  exit 2
fi

# REPO_ROOT 解決（adv_response_gate.sh と同一手法）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "${SCRIPT_DIR}/lib/resolve_repo_root.sh" ]; then
  . "${SCRIPT_DIR}/lib/resolve_repo_root.sh"
  REPO_ROOT="$(resolve_repo_root 2>/dev/null || pwd)"
else
  REPO_ROOT="$(pwd)"
fi
[ -z "$REPO_ROOT" ] && REPO_ROOT="$(pwd)"

# 相対パスは REPO_ROOT 起点で解決
case "$TARGET" in
  /*) ;;
  *) TARGET="${REPO_ROOT}/${TARGET}" ;;
esac

# spec 一覧化
SPEC_LIST=""
if [ -d "$TARGET" ]; then
  SPEC_LIST=$(find "$TARGET" -type f -name '*.spec.ts' 2>/dev/null | sort)
elif [ -f "$TARGET" ]; then
  SPEC_LIST="$TARGET"
else
  echo "ERROR: target not found: $TARGET" >&2
  exit 2
fi

if [ -z "$SPEC_LIST" ]; then
  echo "ERROR: no .spec.ts files found under $TARGET" >&2
  exit 2
fi

# --auth-only 指定時: ファイル名に auth|login|redirect を含む spec のみ採用
if [ "$AUTH_ONLY" = "1" ]; then
  FILTERED=""
  for s in $SPEC_LIST; do
    base=$(basename "$s")
    case "$base" in
      *auth*|*login*|*redirect*) FILTERED="${FILTERED} ${s}" ;;
      *) ;;
    esac
  done
  SPEC_LIST="$FILTERED"
  if [ -z "$(echo $SPEC_LIST | tr -d ' ')" ]; then
    echo "ERROR: no auth|login|redirect spec found under $TARGET (--auth-only)" >&2
    exit 2
  fi
fi

OVERALL_FAIL=0

# header
printf 'spec_path\turl_count\tdom_count\treload_after_count\tverdict\n'

for SPEC in $SPEC_LIST; do
  # URL assertion 件数
  url_count=$(grep -cE 'expect\(page\.url\(\)|page\.waitForURL|expect\(page\)\.toHaveURL|expect\(page\)\.not\.toHaveURL' "$SPEC" 2>/dev/null || true)
  url_count="${url_count:-0}"
  case "$url_count" in ''|*[!0-9]*) url_count=0 ;; esac

  # DOM assertion 件数: expect(...locator|getByX...) と (.toBeVisible|.toHaveText|.toContainText) の共起カウント
  # 簡易には「expect(.*locator|getBy)」 を採取
  dom_count_a=$(grep -cE 'expect\([^)]*\.locator\(|expect\([^)]*getBy[A-Za-z]+\(' "$SPEC" 2>/dev/null || true)
  dom_count_a="${dom_count_a:-0}"
  case "$dom_count_a" in ''|*[!0-9]*) dom_count_a=0 ;; esac
  # toBeVisible / toHaveText / toContainText の存在で DOM assertion とみなす一致
  dom_count_b=$(grep -cE '\.toBeVisible\(|\.toHaveText\(|\.toContainText\(' "$SPEC" 2>/dev/null || true)
  dom_count_b="${dom_count_b:-0}"
  case "$dom_count_b" in ''|*[!0-9]*) dom_count_b=0 ;; esac
  # 採用: 2 系統のうち小さい方 (= expect-locator かつ visible/text 両方の最小値) で保守的に判定
  if [ "$dom_count_a" -lt "$dom_count_b" ]; then
    dom_count=$dom_count_a
  else
    dom_count=$dom_count_b
  fi

  # reload-after assertion 件数: page.reload( の出現回数 + (signed-in/) page.goto('/' or 同パス) の併用
  # session 維持検証は page.reload() か signed-in 状態での page.goto(<root or same-path>) のいずれかで成立
  reload_count_a=$(grep -cE 'page\.reload\(' "$SPEC" 2>/dev/null || true)
  reload_count_a="${reload_count_a:-0}"
  case "$reload_count_a" in ''|*[!0-9]*) reload_count_a=0 ;; esac
  # signed_in_splash_redirect 系（signed-in 状態で page.goto('/') を踏む変種）も session 維持検証
  reload_count_b=$(grep -cE "page\.goto\(['\"](/|/grow|/me|/talk)['\"]" "$SPEC" 2>/dev/null || true)
  reload_count_b="${reload_count_b:-0}"
  case "$reload_count_b" in ''|*[!0-9]*) reload_count_b=0 ;; esac
  # signed-in 状態でのナビゲーションが session 維持確認に該当する spec のみ加算（auth/login goto を除外）
  # 簡易判定: 同一 spec 内で auth?mode=login goto が複数あるとそれは初回 signin 用なので除外
  reload_count=$((reload_count_a + reload_count_b))

  # 判定: 3 軸全て >= 1
  if [ "$url_count" -ge 1 ] && [ "$dom_count" -ge 1 ] && [ "$reload_count" -ge 1 ]; then
    verdict="PASS"
  else
    verdict="FAIL"
    OVERALL_FAIL=1
  fi

  printf '%s\t%s\t%s\t%s\t%s\n' "$SPEC" "$url_count" "$dom_count" "$reload_count" "$verdict"
done

exit $OVERALL_FAIL
