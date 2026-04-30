#!/bin/sh
# scripts/chain_update_audit.sh
# G18: §2 で新設/更新されたスクリプト・関数が §6 連鎖更新指示に反映されているかを監査
# 根拠:
#   - lais/verify/bug_report_2026-04-23_code_g49.md §提案（約60行、3ペルソナ判定要求）
#   - core_spec.md §5 機械強制 hook 仕様 (legacy v34 spec §6.10, archived 2026-04-30)
#   - dev_system_v35_roadmap.md §3.2（G18 canopy ゲート実装の v3.4 先行実装）
# 入力: dev_system_spec.md（or §C4.1 SSOT）+ archived legacy v34 spec (archived 2026-04-30)
# PASS: §2.X で言及されたスクリプト名が §6.10 に全件記載 + §2.6 追加関数が §6.2 に記載
# FAIL: いずれか漏れ検出で exit 1（pre-commit で落とす）
# POSIX sh 互換（§3.7）。bash 拡張禁止。

set -eu
SPEC="${1:-lais/verify/dev_system_v34_package.md}"
[ -f "$SPEC" ] || { echo "FAIL: G18 $SPEC not found" >&2; exit 1; }

# §2.X で言及されたスクリプト名を抽出（scripts/<name>.sh パターン）
SCRIPTS_IN_S2=$(awk '/^## §2\./,/^## §3\./' "$SPEC" | grep -oE 'scripts/[a-zA-Z0-9_/.-]+\.sh' | sort -u)

# §6.10 に列挙されているスクリプト名
SCRIPTS_IN_S610=$(awk '/^### §6\.10/,/^### §6\.11/' "$SPEC" | grep -oE '[a-zA-Z0-9_/.-]+\.sh' | sort -u)

# diff: §2 で言及されたが §6.10 に載っていないスクリプト
MISSING_SCRIPTS=$(
  for s in $SCRIPTS_IN_S2; do
    name=$(echo "$s" | sed 's|^scripts/||')
    if ! echo "$SCRIPTS_IN_S610" | grep -qxF "$name"; then
      echo "$name"
    fi
  done
)

FAIL=0
if [ -n "$MISSING_SCRIPTS" ]; then
  echo "FAIL: G18 chain_update_audit — §2 で言及されたスクリプトが §6.10 に未記載:" >&2
  echo "$MISSING_SCRIPTS" | sed 's/^/  - /' >&2
  FAIL=1
fi

# §2.6 の canopy_common.sh 追加関数 vs §6.2 関数リスト
FUNCS_IN_S26=$(awk '/^### §2\.6 /,/^### §2\.7/' "$SPEC" | grep -oE '^[a-z_]+\(\)' | sed 's/()$//' | sort -u)
FUNCS_IN_S62_BLOCK=$(awk '/^### §6\.2/,/^### §6\.3/' "$SPEC")

MISSING_FUNCS=""
for fn in $FUNCS_IN_S26; do
  if ! echo "$FUNCS_IN_S62_BLOCK" | grep -qF "$fn"; then
    MISSING_FUNCS="${MISSING_FUNCS}${fn}
"
  fi
done
if [ -n "$MISSING_FUNCS" ]; then
  echo "FAIL: G18 chain_update_audit — §2.6 の canopy_common.sh 関数が §6.2 連鎖更新指示に未記載:" >&2
  printf '%s' "$MISSING_FUNCS" | sed 's/^/  - /' >&2
  FAIL=1
fi

if [ "$FAIL" -ne 0 ]; then
  exit 1
fi

echo "OK: G18 chain_update_audit PASS"
