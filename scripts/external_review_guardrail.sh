#!/bin/sh
# GENERATED: DO NOT MODIFY
# scripts/external_review_guardrail.sh
# dev-system v3.5 Phase 1 MVP (案 D'、sub_external_review_protocol §3.3)
# 外部 API クロスチェックのガードレール状態管理。
#   - 月次 $30 / 日次 $5 上限（PO 承認で増額可）
#   - API 5xx / timeout / スキーマ違反が 3 連続で 1 時間 paused_until に設定
# 呼出側（external_review_precommit.sh）から `. external_review_guardrail.sh` で source し、
# `check_guardrail` 関数の戻り値で skip 判定する。
#
# 状態ファイル: $HOME/.dev-system/guardrail_state.json
#   sub_external_review_protocol.md §3.3 のスキーマに従う（daily / monthly / consecutive_failures / paused_until）。
#
# 実装方針:
#   - POSIX sh 互換（bash 拡張禁止）。python3 を数値計算・JSON 読書に使用（§C6.3 runtime_preflight 依存）。
#   - macOS (date -j -u -f ...) と Linux (date -u -d ...) の ISO8601 パースを fallback で吸収。

set -eu

STATE_FILE="${HOME}/.dev-system/guardrail_state.json"
STATE_DIR="$(dirname "$STATE_FILE")"

mkdir -p "$STATE_DIR"

# 初期状態ファイル生成（既存ファイルは触らない）
if [ ! -f "$STATE_FILE" ]; then
  cat > "$STATE_FILE" <<'EOF'
{
  "consecutive_failures": 0,
  "daily": {
    "date": "",
    "limit_usd": 5.0,
    "spent_usd": 0.0
  },
  "monthly": {
    "limit_usd": 30.0,
    "month": "",
    "spent_usd": 0.0
  },
  "paused_until": null
}
EOF
fi

# --- check_guardrail: 通過=0 / 発動=1 ----------------------------------------
check_guardrail() {
  _cg_today=$(date -u +%Y-%m-%d)
  _cg_this_month=$(date -u +%Y-%m)
  _cg_now_epoch=$(date -u +%s)

  # paused_until 判定（ISO8601 → epoch 変換、macOS/Linux fallback）
  _cg_paused_until=$(STATE="$STATE_FILE" python3 -c '
import json, os, sys
p = os.environ["STATE"]
try:
    with open(p, "r") as f:
        d = json.load(f)
    print(d.get("paused_until") or "")
except Exception:
    print("")
' 2>/dev/null || echo "")

  if [ -n "$_cg_paused_until" ]; then
    _cg_paused_epoch=$(date -j -u -f "%Y-%m-%dT%H:%M:%SZ" "$_cg_paused_until" +%s 2>/dev/null \
      || date -u -d "$_cg_paused_until" +%s 2>/dev/null \
      || echo 0)
    if [ "$_cg_now_epoch" -lt "$_cg_paused_epoch" ]; then
      echo "external_review: paused until $_cg_paused_until（3 連続失敗で 1h 停止中）" >&2
      return 1
    fi
  fi

  # 日次 / 月次上限判定（python3 で JSON 読込 + 比較、出力は 1/0）
  _cg_judgement=$(STATE="$STATE_FILE" TODAY="$_cg_today" THIS_MONTH="$_cg_this_month" python3 -c '
import json, os
p = os.environ["STATE"]
today = os.environ["TODAY"]
this_month = os.environ["THIS_MONTH"]
with open(p, "r") as f:
    d = json.load(f)
daily = d.get("daily", {})
monthly = d.get("monthly", {})
daily_spent = float(daily.get("spent_usd", 0.0)) if daily.get("date") == today else 0.0
daily_limit = float(daily.get("limit_usd", 5.0))
monthly_spent = float(monthly.get("spent_usd", 0.0)) if monthly.get("month") == this_month else 0.0
monthly_limit = float(monthly.get("limit_usd", 30.0))
monthly_over = 1 if monthly_spent >= monthly_limit else 0
daily_over = 1 if daily_spent >= daily_limit else 0
print(f"{monthly_over} {daily_over} {monthly_limit:.2f} {daily_limit:.2f}")
' 2>/dev/null || echo "0 0 30.00 5.00")

  _cg_monthly_over=$(echo "$_cg_judgement" | awk '{print $1}')
  _cg_daily_over=$(echo "$_cg_judgement" | awk '{print $2}')
  _cg_monthly_limit=$(echo "$_cg_judgement" | awk '{print $3}')
  _cg_daily_limit=$(echo "$_cg_judgement" | awk '{print $4}')

  if [ "$_cg_monthly_over" = "1" ]; then
    echo "FAIL: external_review 月次上限 \$${_cg_monthly_limit} 到達、PO 承認で limit_usd 増額可" >&2
    return 1
  fi
  if [ "$_cg_daily_over" = "1" ]; then
    echo "external_review: 日次上限 \$${_cg_daily_limit} 到達、翌日まで skip"
    return 1
  fi
  return 0
}

# --- record_api_cost: USD コストを加算 + consecutive_failures をリセット ----
# 呼出例: record_api_cost 0.0420
record_api_cost() {
  _rc_usd="${1:-0}"
  _rc_today=$(date -u +%Y-%m-%d)
  _rc_this_month=$(date -u +%Y-%m)
  STATE="$STATE_FILE" TODAY="$_rc_today" THIS_MONTH="$_rc_this_month" USD="$_rc_usd" python3 -c '
import json, os
p = os.environ["STATE"]
today = os.environ["TODAY"]
this_month = os.environ["THIS_MONTH"]
try:
    usd = float(os.environ.get("USD", "0") or 0)
except ValueError:
    usd = 0.0
with open(p, "r") as f:
    d = json.load(f)

daily = d.get("daily", {}) or {}
monthly = d.get("monthly", {}) or {}
if daily.get("date") != today:
    daily = {"date": today, "spent_usd": 0.0, "limit_usd": float(daily.get("limit_usd", 5.0))}
daily["spent_usd"] = round(float(daily.get("spent_usd", 0.0)) + usd, 4)

if monthly.get("month") != this_month:
    monthly = {"month": this_month, "spent_usd": 0.0, "limit_usd": float(monthly.get("limit_usd", 30.0))}
monthly["spent_usd"] = round(float(monthly.get("spent_usd", 0.0)) + usd, 4)

d["daily"] = daily
d["monthly"] = monthly
d["consecutive_failures"] = 0
d["paused_until"] = None
with open(p, "w") as f:
    json.dump(d, f, indent=2, sort_keys=True)
'
}

# --- record_api_failure: 連続失敗カウンタ +1、3 到達で 1h paused_until --------
record_api_failure() {
  STATE="$STATE_FILE" python3 -c '
import json, os, datetime
p = os.environ["STATE"]
with open(p, "r") as f:
    d = json.load(f)
d["consecutive_failures"] = int(d.get("consecutive_failures", 0) or 0) + 1
if d["consecutive_failures"] >= 3:
    paused = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    d["paused_until"] = paused.strftime("%Y-%m-%dT%H:%M:%SZ")
with open(p, "w") as f:
    json.dump(d, f, indent=2, sort_keys=True)
'
}
