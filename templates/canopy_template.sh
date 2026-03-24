#!/bin/bash
# [プロジェクト名] — キャノピーテスト（累積成長型）
# 新しいミッション完了ごとに項目を追加。削除禁止。
# PASS/FAIL判定。FAILならrollback→停止。

set -e
FAIL=0

echo "=== CANOPY TEST ==="

# --- 実行時間計測 ---
CANOPY_START=$(date +%s)

# ============================================================
# 1. [TODO: 最初のミッションのテスト項目]
# ============================================================
echo "--- Section 1 ---"
# 例: 関数存在確認
# COUNT=$(grep -rc "functionName" src/ 2>/dev/null | awk -F: '{s+=$2}END{print s}')
# if [ "$COUNT" -eq 0 ]; then echo "FAIL: functionName not found"; FAIL=1; else echo "OK: functionName ($COUNT refs)"; fi

# ============================================================
# 2. [TODO: 次のミッションで追加]
# ============================================================

# --- HTTP スモークテスト（デプロイ後のみ） ---
echo "--- HTTP Smoke ---"
# API_BASE="[TODO: API URL]"
# for endpoint in "/api/health" "/api/plan/status"; do
#   STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE$endpoint" 2>/dev/null)
#   if [ "$STATUS" != "200" ]; then echo "FAIL: $endpoint returned $STATUS"; FAIL=1; else echo "OK: $endpoint ($STATUS)"; fi
# done

# --- 実行時間表示 ---
CANOPY_END=$(date +%s)
echo "--- Timing: $((CANOPY_END - CANOPY_START))s ---"

echo "=== CANOPY $([ $FAIL -eq 0 ] && echo 'PASS' || echo 'FAIL') ==="
exit $FAIL
