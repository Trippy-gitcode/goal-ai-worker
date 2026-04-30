#!/bin/sh
# scripts/deploy.sh — dev-system v3.4 ρcrit 12Step 完全版
# 根拠: R2.2 §2.2 ρcrit / §2.16 ηcrit' / PATCH-11/12/13/14/15/19
# 引数仕様: $1=ENV (prod|staging|dev), $2=APP_DIR (default .)
# MISSION_ID は環境変数 or session_progress.md 自動検出（§3.1 SSOT）
# sub_infrastructure §2.8 の既存 ENV/APP_DIR 引数規約・rollback.sh 呼出し互換を保持
# POSIX sh 互換（§3.7）。bash 拡張禁止。

set -eu
ENV="${1:-prod}"
APP_DIR="${2:-.}"

# Runtime 依存 preflight（§3.7 SSOT、PATCH-15 / R3-H-10）
. "$(cd "$(dirname "$0")" && pwd)/lib/runtime_preflight.sh"
require_dev_system_runtimes || exit 1
cd "$APP_DIR"

# --- Step 0: MISSION_ID 解決 + ブロック切り出し + STATUS 検証（§3.1 + §3.2 SSOT）---
if [ -z "${MISSION_ID:-}" ]; then
  MISSION_ID=$(scripts/resolve_target_mission.sh deploy)
fi
[ -n "$MISSION_ID" ] || { echo "ERROR: MISSION_ID not resolved (deploy context)" >&2; exit 1; }
export MISSION_ID
MISSION_BLOCK="/tmp/mission_${MISSION_ID}.md"
scripts/extract_mission_block.sh "$MISSION_ID" > "$MISSION_BLOCK"
export LATEST_MISSION_FILE="$MISSION_BLOCK"

STATUS=$(grep -E '^- \*\*STATUS:\*\*' "$MISSION_BLOCK" | head -1 | sed -E 's/.*STATUS:\*\*[[:space:]]*//')
MISSION_RISK=$(scripts/mission_risk_classifier.sh "$MISSION_BLOCK" 2>/dev/null || echo "low")
if [ "$MISSION_RISK" = "high" ] && [ "$STATUS" != "READY_FOR_DEPLOY" ]; then
  echo "FAIL: high-risk mission $MISSION_ID STATUS='$STATUS' (expected READY_FOR_DEPLOY)" >&2
  exit 1
fi

# 直近 1h 以内の STATUS_CORRECTION 通知（PATCH-12 / R3-H-07）
if [ -f instructions/status_corrections.log ]; then
  NOW_EPOCH=$(date -u +%s)
  RECENT=$(awk -v mid="$MISSION_ID" -v now="$NOW_EPOCH" '
    {
      iso=$1; cmd="date -j -u -f \"%Y-%m-%dT%H:%M:%SZ\" \"" iso "\" +%s 2>/dev/null || date -u -d \"" iso "\" +%s 2>/dev/null"
      cmd | getline epoch; close(cmd)
      if ($2 == mid && epoch+0 > 0 && (now - epoch) <= 3600) print
    }
  ' instructions/status_corrections.log)
  [ -n "$RECENT" ] && echo "NOTICE: 直近 1h 以内の STATUS_CORRECTION 検出: $RECENT" >&2
fi

# --- 設定読取（既存 §2.8 同等、ENV/APP_DIR 規約保持）---
BUILD_CMD=$(yq e '.build.cmd // "npx vite build"' app_config.yaml)
BUILD_OUT=$(yq e '.build.out_dir // "dist"' app_config.yaml)
DEPLOY_URL=$(yq e ".env.${ENV}.url // \"\"" app_config.yaml)
GLOBAL_FRONTEND=$(yq e '.deploy.frontend_cmd // ""' app_config.yaml)
GLOBAL_BACKEND=$(yq e '.deploy.backend_cmd // ""' app_config.yaml)
ENV_FRONTEND=$(yq e ".env.${ENV}.frontend_cmd // \"\"" app_config.yaml)
ENV_BACKEND=$(yq e ".env.${ENV}.backend_cmd // \"\"" app_config.yaml)
FRONTEND_CMD="$GLOBAL_FRONTEND"; [ -n "$ENV_FRONTEND" ] && FRONTEND_CMD="$ENV_FRONTEND"
BACKEND_CMD="$GLOBAL_BACKEND"; [ -n "$ENV_BACKEND" ] && BACKEND_CMD="$ENV_BACKEND"
FRONTEND_CMD=$(printf '%s\n' "$FRONTEND_CMD" | sed "s|\\\${build\\.out_dir}|$BUILD_OUT|g")

mkdir -p logs
echo "=== C2 DEPLOY ($ENV) mission=$MISSION_ID risk=$MISSION_RISK ==="

# --- Step 1: BUILD ---
bash scripts/version_sync.sh .
VER=$(yq e '.app.version' app_config.yaml)
git add -A && { git diff --cached --quiet || git commit -m "chore: bump version to $VER"; }
eval "$BUILD_CMD"

# --- Step 2: canopy（既存 G1-G10 + v3.4 新規関数 check_test_pass 等）---
bash tests/smoke/canopy.sh

# --- Step 3: G8 TDD証跡検証（canopy 内の check_test_pass で完結、§3.3 SSOT）---

# --- Step 4: G16 デプロイ hash 埋込検証（§2.7 χcrit）---
bash scripts/deploy_hash_verify.sh "$BUILD_OUT"

# --- Step 5: Hフロー承認ゲート（二重証跡、§3.5 SSOT / PD-110 / PATCH-14）---
HFLOW_ENABLED=$(yq e '.hflow.enabled // true' app_config.yaml)
MANDATORY_HIT=$(yq e '.hflow.mandatory_paths[]' app_config.yaml 2>/dev/null | while read -r p; do
  [ -n "$p" ] && git diff --name-only HEAD~1 2>/dev/null | grep -qF "$p" && echo "HIT"
done | head -1)
if [ "$HFLOW_ENABLED" = "true" ] || [ -n "$MANDATORY_HIT" ]; then
  HFLOW_CONTEXT=deploy scripts/hflow_trigger_check.sh > /tmp/hflow.txt
  if grep -q 'HFLOW_TRIGGER=1' /tmp/hflow.txt; then
    APPROVAL="instructions/approvals/${MISSION_ID}.hflow.approved"
    if [ ! -f "$APPROVAL" ]; then
      echo "FAIL: Hフロー発火。承認ファイル未作成: $APPROVAL" >&2
      [ -n "$MANDATORY_HIT" ] && echo "FAIL: mandatory_paths 変更のため opt-out 不可" >&2
      exit 1
    fi
    bash scripts/verify_approval_authenticity.sh "$MISSION_ID" "$APPROVAL" || exit 1
  fi
else
  HFLOW_CONTEXT=deploy scripts/hflow_trigger_check.sh > /tmp/hflow.txt
  if grep -q 'HFLOW_TRIGGER=1' /tmp/hflow.txt; then
    echo "WARN: Hフロー発火検出（opt-out 設定のためスキップ、mandatory_paths 非該当）" >&2
  fi
fi

# --- Step 6: L1 スモーク（mission cmd-e2e SSOT、PATCH-11 / R3-H-05）---
CMD_E2E=$(scripts/extract_cmd.sh "$MISSION_BLOCK" cmd-e2e)
case "$CMD_E2E" in
  "")
    echo "FAIL: cmd-e2e not defined in mission block (§3.4 SSOT violation)" >&2; exit 1 ;;
  N/A*|SKIP*)
    echo "INFO: Step 6 skipped (cmd-e2e = $CMD_E2E, validated by check_test_pass)" ;;
  *)
    case "$CMD_E2E" in
      *"--grep"*|*"@smoke"*) eval "$CMD_E2E" ;;
      *) eval "$CMD_E2E --grep '@smoke'" ;;
    esac
    ;;
esac

# --- Step 7: L2 影響範囲（affected-tests.sh + mission cmd-unit SSOT、PATCH-11）---
CMD_UNIT=$(scripts/extract_cmd.sh "$MISSION_BLOCK" cmd-unit)
case "$CMD_UNIT" in
  "")
    echo "FAIL: cmd-unit not defined in mission block (§3.4 SSOT violation)" >&2; exit 1 ;;
  N/A*|SKIP*)
    echo "INFO: Step 7 cmd-unit skipped ($CMD_UNIT), affected-tests.sh のみ実行" ;;
esac
MISSION_CMD_UNIT="$CMD_UNIT" MISSION_CMD_E2E="$CMD_E2E" bash scripts/affected-tests.sh

# --- Step 8: デプロイ実行（POSIX sh で exit status 保証、§3.7 POSIX 規約）---
DEPLOY_EXIT=0
if [ -n "$FRONTEND_CMD" ]; then eval "$FRONTEND_CMD" >>logs/deploy_stdout.log 2>&1 || DEPLOY_EXIT=$?; fi
if [ -n "$BACKEND_CMD" ] && [ "$DEPLOY_EXIT" = 0 ]; then eval "$BACKEND_CMD" >>logs/deploy_stdout.log 2>&1 || DEPLOY_EXIT=$?; fi
if [ "$DEPLOY_EXIT" -ne 0 ]; then
  scripts/append_deploy_fail.sh "$MISSION_ID" "$(tail -30 logs/deploy_stdout.log)"
  exit 1
fi

# --- Step 9: hash ポーリング（§2.7 χcrit + deploy_poll_hash.sh）---
if [ -n "$DEPLOY_URL" ]; then
  scripts/deploy_poll_hash.sh "$DEPLOY_URL" "$(git rev-parse HEAD)" || {
    scripts/append_deploy_fail.sh "$MISSION_ID" "hash poll failed"; exit 1;
  }
fi

# --- Step 10: G17 realworld（高リスクのみ、§2.7 χcrit）---
if [ "$MISSION_RISK" = "high" ]; then
  mkdir -p "evidence/$MISSION_ID/realworld-screenshots"
  MISSION_ID="$MISSION_ID" REALWORLD_URL="$DEPLOY_URL" \
    npx playwright test --config=playwright.realworld.config.ts || {
    scripts/append_deploy_fail.sh "$MISSION_ID" "realworld L1 failed"; exit 1;
  }
  bash scripts/normalize_realworld_report.sh "$MISSION_ID"
  bash scripts/realworld_proof_check.sh "$MISSION_ID" || {
    scripts/append_deploy_fail.sh "$MISSION_ID" "G17 failed"; exit 1;
  }
fi

# --- Step 11: STATUS → DONE（§3.2 SSOT、R2.2 §2.13 δcrit' awk ロジック）---
PROGRESS=instructions/session_progress.md
awk -v mid="$MISSION_ID" '
  $0 ~ "^### " mid ":" { in_block=1; print; next }
  in_block && /^### [A-Z][A-Z0-9_-]*:/ { in_block=0 }
  in_block && /^- \*\*STATUS:\*\*/ { sub(/READY_FOR_DEPLOY/, "DONE") }
  { print }
' "$PROGRESS" > "${PROGRESS}.tmp" && mv "${PROGRESS}.tmp" "$PROGRESS"

# --- Step 12: logs/deploy.log 追記 + STRIKE クリア + git tag ---
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) DEPLOY-OK $MISSION_ID sha=$(git rev-parse --short HEAD)" >> logs/deploy.log
if [ -f instructions/deploy_strikes.json ]; then
  python3 -c "import json,sys; p='instructions/deploy_strikes.json'; d=json.load(open(p)); d.pop('$MISSION_ID',None); json.dump(d,open(p,'w'),indent=2)" 2>/dev/null || true
fi

git tag "v$VER" 2>/dev/null || true
echo "=== C2 DEPLOY COMPLETE ($ENV) mission=$MISSION_ID v$VER ==="
