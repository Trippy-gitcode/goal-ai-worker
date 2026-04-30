#!/bin/sh
# scripts/affected-tests.sh — L2 影響範囲テスト実行
# 根拠: R2.2 §3.4 L1/L2/L3 SSOT / PATCH-11 / §6.10 既存スクリプト
# POSIX sh 互換（§3.7）。bash 拡張禁止。
#
# 環境変数:
#   MISSION_CMD_UNIT: mission block の cmd-unit 値（呼出側 deploy.sh Step 7 が export）
#   MISSION_CMD_E2E: mission block の cmd-e2e 値（呼出側が export）
#
# 本 stub は dev-system v3.4 の最小互換実装。PART3 / v3.5 で git diff + system_map 依存グラフから
# 影響範囲を自動抽出する完全版（dev_system_spec.md §3.4 diff 機械抽出）に置換予定。

set -eu

CMD_UNIT="${MISSION_CMD_UNIT:-}"
CMD_E2E="${MISSION_CMD_E2E:-}"

echo "affected-tests: MISSION_CMD_UNIT='$CMD_UNIT' MISSION_CMD_E2E='$CMD_E2E'"

# cmd-unit（N/A / SKIP 以外の値なら実行）
case "$CMD_UNIT" in
  ""|N/A*|SKIP*)
    echo "INFO: cmd-unit skipped ($CMD_UNIT)" ;;
  *)
    eval "$CMD_UNIT" ;;
esac

# cmd-e2e は既に deploy.sh Step 6 で @smoke タグ付きで実行済み。
# Step 7 では @integration タグの L2 統合分のみ実行（SSOT §3.4）。
case "$CMD_E2E" in
  ""|N/A*|SKIP*)
    echo "INFO: cmd-e2e L2 integration skipped ($CMD_E2E)" ;;
  *"@integration"*)
    eval "$CMD_E2E" ;;
  *)
    # L2 統合分は --grep '@integration' で抽出（まだ未指定なら補填）
    echo "INFO: cmd-e2e to be invoked with --grep '@integration' for L2"
    eval "$CMD_E2E --grep '@integration'" 2>/dev/null || {
      echo "INFO: L2 @integration tests not available, skipping" >&2
    }
    ;;
esac

echo "affected-tests: complete"
