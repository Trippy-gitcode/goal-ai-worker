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

JA_JSON="frontend/i18n/ja.json"
if [ ! -f "$JA_JSON" ]; then
  echo "INFO: $JA_JSON not found, skipping i18n_coverage_check"
  exit 0
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "WARN: python3 not available, skipping i18n_coverage_check"
  exit 0
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
