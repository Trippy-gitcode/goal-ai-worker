#!/bin/sh
# scripts/i18n_coverage_check.sh
# Round 23 R-002 fix (2026-05-01) — external review GPT-5.4 指摘対応
#
# 目的:
#   `frontend/i18n/ja.json` の `_meta.coverage_keys_current` が実ファイルの
#   非 _meta キー数と一致しているかを CI で検証する。
#   旧来は README に手書き / _meta に手書きで数値が drift し、後続実装者が
#   進捗を誤認する温床。本 script で機械算出と照合し、不一致時 exit 1。
#
# 検査対象:
#   1. python3 で ja.json を parse、_meta を除いた key 数を実測
#   2. _meta.coverage_keys_current と一致するか
#   3. _meta.coverage_keys_target は固定 (609)
#
# 使い方:
#   sh scripts/i18n_coverage_check.sh
#
# CI:
#   .github/workflows/ci.yml の lint-and-healthcheck job で実行。

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# Round 25 R-001 + Round 26 R-007 fix (2026-05-01) — external review GPT-5.4:
#   旧: ja.json 不在 / python3 不在で `exit 0` → CI が緑通過、guard 喪失。
#   新: 既定 fail-closed (exit 1)。手動実行時の skip は `SKIP_ALLOWED=1` で明示。
#   R-007: CI 環境 (`CI=true` / `GITHUB_ACTIONS=true`) では SKIP_ALLOWED を無効化、
#          CI 設定や一時デバッグ手順から環境変数が常設されても監査用 gate が無効化されない。
SKIP_ALLOWED="${SKIP_ALLOWED:-0}"
# CI 環境検知 (GitHub Actions / generic CI 双方カバー)
if [ "${CI:-}" = "true" ] || [ "${GITHUB_ACTIONS:-}" = "true" ]; then
  if [ "$SKIP_ALLOWED" = "1" ]; then
    echo "::warning::SKIP_ALLOWED=1 ignored in CI environment (Round 26 R-007 hardening)"
  fi
  SKIP_ALLOWED=0
fi

JA_JSON="frontend/i18n/ja.json"
if [ ! -f "$JA_JSON" ]; then
  if [ "$SKIP_ALLOWED" = "1" ]; then
    echo "INFO: $JA_JSON not found, SKIP_ALLOWED=1 — skipping (manual run only)"
    exit 0
  fi
  echo "::error::$JA_JSON missing — i18n coverage gate is fail-closed (Round 25 R-001)"
  echo "  ファイル復元か、手動実行時のみ \`SKIP_ALLOWED=1 sh scripts/i18n_coverage_check.sh\` で skip 可。"
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  if [ "$SKIP_ALLOWED" = "1" ]; then
    echo "INFO: python3 not available, SKIP_ALLOWED=1 — skipping"
    exit 0
  fi
  echo "::error::python3 not available — required for i18n_coverage_check (Round 25 R-001)"
  echo "  CI runner に python3 を install するか、SKIP_ALLOWED=1 で local skip。"
  exit 1
fi

python3 - <<'PY'
import json
import sys

with open('frontend/i18n/ja.json', encoding='utf-8') as f:
    d = json.load(f)

meta = d.get('_meta', {})
declared_current = meta.get('coverage_keys_current')
declared_target = meta.get('coverage_keys_target')
declared_pct = meta.get('coverage_percent_approx')

actual_keys = [k for k in d.keys() if k != '_meta']
actual_count = len(actual_keys)

print(f"i18n_coverage_check:")
print(f"  declared current: {declared_current}")
print(f"  actual keys     : {actual_count}")
print(f"  declared target : {declared_target}")
print(f"  declared %      : {declared_pct}")

errors = []
if declared_current is None:
    errors.append("_meta.coverage_keys_current 未設定")
elif declared_current != actual_count:
    errors.append(f"_meta.coverage_keys_current ({declared_current}) != actual ({actual_count})")

if declared_target != 609:
    errors.append(f"_meta.coverage_keys_target は 609 (Round 6 §0.3 grep 計測値) であるべき、現在: {declared_target}")

if declared_target and declared_current:
    expected_pct = round(declared_current * 100 / declared_target)
    if declared_pct is None or abs(declared_pct - expected_pct) > 2:
        errors.append(f"_meta.coverage_percent_approx ({declared_pct}) が期待値 ({expected_pct}) と乖離")

if errors:
    print("ERROR: i18n coverage drift detected:")
    for e in errors:
        print(f"  - {e}")
    print("対処: frontend/i18n/ja.json の _meta を実測値に合わせて更新してください。")
    sys.exit(1)

print(f"OK: coverage drift 無し (actual={actual_count}, declared={declared_current})")
PY
