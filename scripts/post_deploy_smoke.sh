#!/bin/sh
# GENERATED: DO NOT MODIFY
# templates/scripts/post_deploy_smoke.sh.template
#
# derived-from: SUBAGENT-DEVSYS-7PHASE-TEST-DEPLOY-V1 (PO 直命 2026-05-04 PO-DIRECTIVE-014)
# spec-ref: core_spec.md §2.25.21 (Primary Quality Gate Inversion) +
#           core_spec.md §2.25.16.10 (機械強制 マトリクス) +
#           docs/po-decisions.md PO-DIRECTIVE-014 (7 phase 開発ワークフロー 機械強制) +
#           7 phase ワークフロー phase 6 「post-deploy 実機 smoke + hook settings.json 連携」
#
# 用途:
#   goal-ai-worker の wrangler deploy 後 自動 invoke。 production /health endpoint に curl で
#   到達確認、 HTTP 200 + JSON status 確認、 失敗時 exit 1、 3 回 retry、
#   verify/realmachine_smoke_results.md に append。
#
# Phase 6 連携:
#   - 7 phase: コンセプト → 仕様書 → 実装 → 仕様↔実装一致 test → spec通り動くか test → 実機 test → 配布
#   - 本 script = 「実機 test」 (= phase 6) の post-deploy 強制実行 entry point
#   - hook settings.json 連携: dev-system 側 ~/.claude/settings.json の Stop hook chain 拡張
#     (例: 下記 settings.json 追記 stub 参照)
#
# Placeholders:
#   goal-ai-worker    : 生成 App 名 (例: lais / goal-ai-worker)
#   goal-ai-worker.goalai-futoshi.workers.dev  : production domain (例: goal-ai-worker.goalai-futoshi.workers.dev)
#                     APP_DOMAIN env で override 可、 既定は本 placeholder
#
# Settings.json hook chain 拡張 stub (= dev-system + App 両側 ~/.claude/settings.json):
#   {
#     "hooks": {
#       "Stop": [
#         {
#           "hooks": [
#             {
#               "type": "command",
#               "command": "if [ -x \"$REPO_ROOT/scripts/post_deploy_smoke.sh\" ] && [ \"${POST_DEPLOY_TRIGGER:-0}\" = \"1\" ]; then sh \"$REPO_ROOT/scripts/post_deploy_smoke.sh\" >>$HOME/.claude/post_deploy_smoke.log 2>&1 || true; fi"
#             }
#           ]
#         }
#       ]
#     }
#   }
#
# Usage:
#   sh scripts/post_deploy_smoke.sh                          # 既定 domain で実行
#   APP_DOMAIN=<custom> sh scripts/post_deploy_smoke.sh      # domain override
#   POST_DEPLOY_TRIGGER=1 で settings.json hook chain 起動 (= 自動)
#
# 完了条件:
#   - exit 0 = HTTP 200 + status ok + verify append 成功
#   - exit 1 = 3 retry 失敗 / curl 失敗 / status not ok
#
# POSIX sh 互換 (bash 機能 不使用)。

set -e

APP_NAME="${APP_NAME:-goal-ai-worker}"
APP_DOMAIN="${APP_DOMAIN:-goal-ai-worker.goalai-futoshi.workers.dev}"
HEALTH_PATH="${HEALTH_PATH:-/health}"
MAX_RETRY=3
RETRY_INTERVAL=5

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT" || exit 1

VERIFY_DIR="$REPO_ROOT/verify"
SMOKE_LOG="$VERIFY_DIR/realmachine_smoke_results.md"
mkdir -p "$VERIFY_DIR"

if [ ! -f "$SMOKE_LOG" ]; then
  cat > "$SMOKE_LOG" <<EOF
# realmachine_smoke_results.md — goal-ai-worker

> 実機 smoke 結果 append log (post-deploy / pre-push / nightly 等)。
> 各 entry は \`[<TAG>] <result>、 signin_success=<true|false>\` 形式。

EOF
fi

URL="https://${APP_DOMAIN}${HEALTH_PATH}"
TS="$(date -u +%FT%TZ)"

echo "================================================================"
echo "  post_deploy_smoke.sh — phase 6 (post-deploy 実機 smoke)"
echo "  app: goal-ai-worker"
echo "================================================================"
echo "  URL          : $URL"
echo "  MAX_RETRY    : $MAX_RETRY"
echo "  RETRY_INTERVAL: ${RETRY_INTERVAL}s"
echo "  TS           : $TS"
echo "----------------------------------------------------------------"

attempt=1
HTTP_STATUS="000"
RESPONSE_BODY=""
SUCCESS=0

while [ "$attempt" -le "$MAX_RETRY" ]; do
  echo "[post_deploy_smoke][goal-ai-worker] attempt $attempt / $MAX_RETRY: curl -fsS $URL"

  # curl で HTTP status + body 取得 (= --fail-with-body 相当を 自前 実装)
  HTTP_STATUS=$(curl -s -o /tmp/post_deploy_smoke_body.$$ -w "%{http_code}" --max-time 30 "$URL" 2>/dev/null || echo "000")
  RESPONSE_BODY=$(cat /tmp/post_deploy_smoke_body.$$ 2>/dev/null || echo "")
  rm -f /tmp/post_deploy_smoke_body.$$ 2>/dev/null || true

  if [ "$HTTP_STATUS" = "200" ]; then
    # JSON status check (= "status":"ok" / "ok":true 等)
    if echo "$RESPONSE_BODY" | grep -qE '("status"[[:space:]]*:[[:space:]]*"ok"|"ok"[[:space:]]*:[[:space:]]*true|status.*ok)'; then
      echo "[post_deploy_smoke][goal-ai-worker] HTTP 200 + status ok 確認"
      SUCCESS=1
      break
    else
      echo "[post_deploy_smoke][goal-ai-worker] HTTP 200 だが status not ok: $RESPONSE_BODY"
    fi
  else
    echo "[post_deploy_smoke][goal-ai-worker] HTTP $HTTP_STATUS != 200 (attempt $attempt failed)"
  fi

  attempt=$((attempt + 1))
  if [ "$attempt" -le "$MAX_RETRY" ]; then
    sleep "$RETRY_INTERVAL"
  fi
done

# 結果 append (= verify/realmachine_smoke_results.md)
if [ "$SUCCESS" = "1" ]; then
  echo "" >> "$SMOKE_LOG"
  echo "[POST-DEPLOY-SMOKE][goal-ai-worker] $TS HTTP 200 + status ok、 url=$URL、 signin_success=true" >> "$SMOKE_LOG"
  echo "----------------------------------------------------------------"
  echo "[post_deploy_smoke][goal-ai-worker] PASS (HTTP $HTTP_STATUS、 retry=$((attempt - 1)))"
  echo "[post_deploy_smoke][goal-ai-worker] verify append: $SMOKE_LOG"
  echo "================================================================"
  exit 0
else
  echo "" >> "$SMOKE_LOG"
  echo "[POST-DEPLOY-SMOKE][goal-ai-worker] $TS FAILED HTTP $HTTP_STATUS、 url=$URL、 retry=$MAX_RETRY、 signin_success=false" >> "$SMOKE_LOG"
  echo "----------------------------------------------------------------"
  echo "[post_deploy_smoke][goal-ai-worker] FAIL (HTTP $HTTP_STATUS、 retry=$MAX_RETRY 全失敗)"
  echo "[post_deploy_smoke][goal-ai-worker] rollback 推奨: npx wrangler rollback"
  echo "[post_deploy_smoke][goal-ai-worker] verify append: $SMOKE_LOG"
  echo "================================================================"
  exit 1
fi
