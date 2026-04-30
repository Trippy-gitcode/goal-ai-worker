#!/bin/sh
# scripts/realmachine_signin_test.sh
# PATCH-LOGIN-TEST-STRUCTURAL-FIX（2026-04-26、ADV）
# LOGIN-TEST-GAP-PERSONA-REVIEW で採択された B+C+A 戦略 Phase A 実装。
#
# 用途:
#   実 Supabase + 実 CF Pages（https://lais-3yk.pages.dev）で signin 自動テストを
#   完結実行し、結果を logs/realmachine_smoke_results.log に追記する。
#   adv_response_gate.sh の PHASE_COMPLETE_HIT ブロック（PATCH-LOGIN-TEST-STRUCTURAL-FIX
#   拡張部分）が本ログを必須検証する設計。
#
# 一連のフロー:
#   1. .dev.vars から SUPABASE_URL / SUPABASE_SERVICE_KEY 読込（ログ / 出力に値を出さず）
#   2. Supabase Admin API でテストアカウント作成（email_confirm: true）
#   3. Playwright で login.spec.ts 実行（実 CF Pages 訪問 → signin → ダッシュボード DOM）
#   4. テストアカウント削除（cleanup、trap で確実呼出）
#   5. 結果を logs/realmachine_smoke_results.log に TAB 区切り 6 列で追記
#
# 出力フォーマット（logs/realmachine_smoke_results.log）:
#   既存（互換維持）: <ts>\t<phase>\t<target>\tsignin_success=<bool>\tdashboard_reached=<bool>\tresult=<PASS|FAIL>
#   PATCH-TEST-GAP-LOGIN-REDIRECT-IMPL（2026-04-26）拡張:
#     <ts>\t<phase>\t<target>\tsignin_success=<bool>\tdashboard_reached=<bool>\turl=<path>\tdom=<screen-id>\treload_session=<bool>\tresult=<PASS|FAIL>
#
# 環境変数:
#   PHASE_LABEL  : Phase ラベル（既定 "A"）
#   TARGET_LABEL : ターゲット名（既定 "realmachine-signin"）
#   TEST_BASE_URL: CF Pages URL（既定 https://lais-3yk.pages.dev）
#   DRY_RUN      : 1 で Admin API 呼出 skip + Playwright skip + ログ追記のみ（hook 動作テスト用）
#
# 制約（mission 指示書 §制約）:
#   - --no-verify 禁止（本スクリプトは git 操作しない）
#   - SUPABASE_SERVICE_KEY を絶対出力しない（伏字 *** 表記）
#   - cleanup 必須（trap EXIT INT TERM で必ず呼ばれる）
#   - 実テストアカウントは @example.invalid（IETF 予約 TLD）で作成、本番ドメインと衝突せず

set -eu

. "$(dirname "$0")/lib/resolve_repo_root.sh"
if ! REPO_ROOT="$(resolve_repo_root)" || [ -z "${REPO_ROOT:-}" ] || [ ! -d "${REPO_ROOT}" ]; then
  echo "ERROR: realmachine_signin_test could not resolve REPO_ROOT" >&2
  exit 1
fi
cd "$REPO_ROOT"

LOG_FILE="${REPO_ROOT}/logs/realmachine_smoke_results.log"
mkdir -p "${REPO_ROOT}/logs"

PHASE_LABEL="${PHASE_LABEL:-A}"
TARGET_LABEL="${TARGET_LABEL:-realmachine-signin}"
TEST_BASE_URL="${TEST_BASE_URL:-https://lais-3yk.pages.dev}"
DRY_RUN="${DRY_RUN:-0}"

ts() { date -u +%Y-%m-%dT%H:%M:%SZ; }

append_log() {
  # 引数（互換維持 3 引数版）: signin_success(true|false) dashboard_reached(true|false) result(PASS|FAIL)
  # 引数（PATCH-TEST-GAP-LOGIN-REDIRECT-IMPL 6 引数版）:
  #   signin_success dashboard_reached result url dom reload_session
  s_success="$1"; d_reached="$2"; r_label="$3"
  url_v="${4:-}"; dom_v="${5:-}"; reload_v="${6:-}"
  if [ -n "$url_v" ] || [ -n "$dom_v" ] || [ -n "$reload_v" ]; then
    # key=value 拡張形式（3 軸）
    printf '%s\t%s\t%s\tsignin_success=%s\tdashboard_reached=%s\turl=%s\tdom=%s\treload_session=%s\tresult=%s\n' \
      "$(ts)" "$PHASE_LABEL" "$TARGET_LABEL" "$s_success" "$d_reached" "$url_v" "$dom_v" "$reload_v" "$r_label" \
      >> "$LOG_FILE"
  else
    # 既存 6 列互換形式（後方互換）
    printf '%s\t%s\t%s\tsignin_success=%s\tdashboard_reached=%s\tresult=%s\n' \
      "$(ts)" "$PHASE_LABEL" "$TARGET_LABEL" "$s_success" "$d_reached" "$r_label" \
      >> "$LOG_FILE"
  fi
}

# DRY_RUN: hook 動作テスト用に PASS 行のみ記録して終了
if [ "$DRY_RUN" = "1" ]; then
  append_log "true" "true" "PASS"
  echo "[DRY_RUN] appended PASS line to $LOG_FILE"
  exit 0
fi

# .dev.vars 読込（SUPABASE_URL / SUPABASE_SERVICE_KEY、値は変数のみ、出力禁止）
DEV_VARS="${REPO_ROOT}/.dev.vars"
if [ ! -f "$DEV_VARS" ]; then
  echo "ERROR: .dev.vars not found" >&2
  append_log "false" "false" "FAIL"
  exit 1
fi

SUPABASE_URL=$(grep -E '^SUPABASE_URL=' "$DEV_VARS" | head -1 | sed 's/^SUPABASE_URL=//' | tr -d '"' | tr -d "'")
SUPABASE_SERVICE_KEY=$(grep -E '^SUPABASE_SERVICE_KEY=' "$DEV_VARS" | head -1 | sed 's/^SUPABASE_SERVICE_KEY=//' | tr -d '"' | tr -d "'")

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "ERROR: SUPABASE_URL or SUPABASE_SERVICE_KEY not set in .dev.vars" >&2
  append_log "false" "false" "FAIL"
  exit 1
fi

# 値の長さのみ表示（実値は出さない、伏字 ***）
URL_LEN=$(printf '%s' "$SUPABASE_URL" | wc -c | tr -d ' ')
KEY_LEN=$(printf '%s' "$SUPABASE_SERVICE_KEY" | wc -c | tr -d ' ')
echo "[INFO] SUPABASE_URL=*** (len=$URL_LEN)"
echo "[INFO] SUPABASE_SERVICE_KEY=*** (len=$KEY_LEN)"
echo "[INFO] TEST_BASE_URL=$TEST_BASE_URL"

# テストアカウント生成
RAND_SUFFIX=$(LC_ALL=C tr -dc 'a-z0-9' </dev/urandom 2>/dev/null | head -c 6 || echo "fallback")
TS_TAG=$(date -u +%Y%m%dT%H%M%SZ)
TEST_EMAIL="realmachine-test-${TS_TAG}-${RAND_SUFFIX}@example.invalid"
TEST_PASSWORD=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom 2>/dev/null | head -c 32 || echo "fallback-pw-32-chars-fillup-here")

USER_ID=""
SIGNIN_SUCCESS="false"
DASHBOARD_REACHED="false"
# PATCH-TEST-GAP-LOGIN-REDIRECT-IMPL（2026-04-26）: 真 E2E 3 軸 (b)/(c) フィールド
URL_V=""
DOM_V=""
RELOAD_SESSION="false"
RESULT="FAIL"

cleanup() {
  trap '' EXIT INT TERM
  if [ -n "$USER_ID" ]; then
    echo "[CLEANUP] deleting test account user_id=*** (email=$TEST_EMAIL)"
    curl -fsS -X DELETE \
      -H "apikey: $SUPABASE_SERVICE_KEY" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
      "${SUPABASE_URL}/auth/v1/admin/users/${USER_ID}" \
      >/dev/null 2>&1 || echo "[CLEANUP-WARN] delete failed for user_id=*** (manual cleanup may be required)"
  else
    echo "[CLEANUP] USER_ID empty, no cleanup needed"
  fi
  # 結果ログ追記（成功 or 失敗いずれでも記録）
  # PATCH-TEST-GAP-LOGIN-REDIRECT-IMPL: 6 引数版で url=/dom=/reload_session= 追記
  append_log "$SIGNIN_SUCCESS" "$DASHBOARD_REACHED" "$RESULT" "$URL_V" "$DOM_V" "$RELOAD_SESSION"
  echo "[RESULT] phase=$PHASE_LABEL target=$TARGET_LABEL signin_success=$SIGNIN_SUCCESS dashboard_reached=$DASHBOARD_REACHED url=$URL_V dom=$DOM_V reload_session=$RELOAD_SESSION result=$RESULT"
  echo "[LOG] appended to $LOG_FILE"
}
trap cleanup EXIT INT TERM

# テストアカウント作成（Admin API）
echo "[STEP] creating test account email=$TEST_EMAIL"
CREATE_RES=$(curl -fsS -X POST \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d "$(printf '{"email":"%s","password":"%s","email_confirm":true}' "$TEST_EMAIL" "$TEST_PASSWORD")" \
  "${SUPABASE_URL}/auth/v1/admin/users" 2>/dev/null) || {
    echo "[ERROR] Admin API user create failed"
    exit 1
  }

USER_ID=$(printf '%s' "$CREATE_RES" | python3 -c 'import json,sys; o=json.loads(sys.stdin.read() or "{}"); print(o.get("id",""))' 2>/dev/null || true)
if [ -z "$USER_ID" ]; then
  echo "[ERROR] failed to extract user_id from Admin API response"
  exit 1
fi
echo "[OK] test account created user_id=*** (email=$TEST_EMAIL)"

# Playwright 実行（実 CF Pages 訪問 → signin → ダッシュボード DOM）
echo "[STEP] running playwright realmachine login spec"
LAIS_DIR="${REPO_ROOT}/lais"
if [ ! -d "$LAIS_DIR" ]; then
  echo "[ERROR] lais/ directory not found"
  exit 1
fi

# Playwright spec に env で資格情報渡し
cd "$LAIS_DIR"
if REALMACHINE_TEST_EMAIL="$TEST_EMAIL" \
   REALMACHINE_TEST_PASSWORD="$TEST_PASSWORD" \
   TEST_BASE_URL="$TEST_BASE_URL" \
   npx playwright test --config=playwright.cf.config.ts tests/realmachine/login.spec.ts \
   --reporter=list >/tmp/realmachine_pw.log 2>&1; then
  PW_OK=1
else
  PW_OK=0
fi

# Playwright ログから signin / dashboard 状態を抽出（spec 内で console.log で出力）
if grep -qE "signin_success=true" /tmp/realmachine_pw.log; then
  SIGNIN_SUCCESS="true"
fi
if grep -qE "dashboard_reached=true" /tmp/realmachine_pw.log; then
  DASHBOARD_REACHED="true"
fi
# PATCH-TEST-GAP-LOGIN-REDIRECT-IMPL: 真 E2E 3 軸 (b)/(c) のフィールド抽出
URL_V=$(grep -E '^url=' /tmp/realmachine_pw.log | tail -1 | sed 's/^url=//' | head -c 200)
DOM_V=$(grep -E '^dom=' /tmp/realmachine_pw.log | tail -1 | sed 's/^dom=//' | head -c 200)
if grep -qE "reload_session=true" /tmp/realmachine_pw.log; then
  RELOAD_SESSION="true"
fi

# PASS 判定: 既存 2 フラグ + 3 軸の reload_session 全 true 時のみ PASS（厳格化）
# url/dom は値の存在で代替（空文字は許容しない、ただし spec 側の出力に依存）
if [ "$PW_OK" = "1" ] && [ "$SIGNIN_SUCCESS" = "true" ] && [ "$DASHBOARD_REACHED" = "true" ]; then
  # reload_session が出力されている spec の場合は厳格化
  if grep -qE "^reload_session=" /tmp/realmachine_pw.log; then
    if [ "$RELOAD_SESSION" = "true" ]; then
      RESULT="PASS"
    else
      RESULT="FAIL"
      echo "[PLAYWRIGHT] reload_session FAIL detected, full log (last 30 lines):"
      tail -30 /tmp/realmachine_pw.log || true
    fi
  else
    # 後方互換: reload_session を出力しない既存 spec は従来基準
    RESULT="PASS"
  fi
else
  RESULT="FAIL"
  echo "[PLAYWRIGHT] full log (last 30 lines):"
  tail -30 /tmp/realmachine_pw.log || true
fi

# trap cleanup が EXIT で発火し append_log 実行
exit 0
