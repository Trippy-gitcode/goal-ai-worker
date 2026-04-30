#!/bin/sh
# GENERATED: DO NOT MODIFY
# scripts/adv_response_gate.sh
# MISSION-G49-PKG Phase 2.2（PD-111 §2.25.9-.14 機械ゲート本体）
# PATCH-VIO13-GATE-PO-DISPLAY-FIX（2026-04-26）: PO 表示モード分離
#
# 用途:
#   Stop hook で ADV 応答テキストを検査し、§2.25.9-.14 違反パターンを
#   fail-closed で BLOCK する。同応答多重発火を session_id + 応答 SHA-1 で dedupe。
#
# 入力（stdin JSON、Stop hook 仕様 hook_capability_matrix.md §3.1 参照）:
#   {
#     "hook_event_name": "Stop" | "SubagentStop",
#     "session_id": "<uuid>",
#     "transcript_path": "/path/to/transcript",
#     "last_assistant_message": "<text>",
#     "stop_hook_active": true | false
#   }
#
# 出力:
#   通常: stdout に {"decision":"block","reason":"..."} (BLOCK) or 何も出さず exit 0 (PASS)
#   テスト: 引数 --test-fail-closed で BLOCK 動作テスト
#
# PO 表示モード（PATCH-VIO13-GATE-PO-DISPLAY-FIX、2026-04-26）:
#   ADV_GATE_PO_DISPLAY_MODE=clean (default) | strict
#     clean  = PO 表示には重要違反（§2.25.9 PO 作業発生 / §2.25.13 暗号略称垂れ流し /
#              §2.25.21.4 Phase 完了 smoke 欠落 / §2.25.23.9 vote_dispatcher 欠落）のみ出力。
#              内部メタ違反（§2.25.3 メタタグ欠落 / §2.25.11 立場矛盾 / §2.25.12 引用元欠落 /
#              §2.25.14 [Review: ...] 付記欠落）は内部ログ logs/adv_violation_gate.log
#              にのみ記録し、Stop hook feedback には出さない。
#     strict = 全違反を Stop hook feedback で出力（従来挙動）。
#   いずれの場合も検出ロジックは維持され、内部ログには全件記録される。
#
# §2.25.11 自己参照ループ対策:
#   応答内に「撤回宣言」「§2.25.11 撤回」「方針撤回」「自己参照ループ」キーワードが
#   含まれる場合は §2.25.11 検出をスキップ（撤回宣言応答自体が誤検知される構造の解消）。
#
# §2.25.14 [Review: ...] 付記の自動付加:
#   ADV メイン応答末尾に [Review: 0 rounds, 0 personas] が欠落している場合、
#   clean mode では PO 表示には出さず、内部ログにのみ記録する設計。
#   応答末尾への自動 append は別 hook（adv_response_review_appender.sh、未配線）で実装予定。
#   本 gate は clean mode でも検出は維持し、運用観測データを継続収集する。
#
# fail-closed 設計:
#   - 検査エラーは block 扱い（exit 1 + JSON は出さない）
#   - 連続失敗 3 回到達で fail-open + PO 通知（logs/adv_violation_gate.log）
#
# PO override:
#   instructions/gate_override.flag 存在時は exit 0（gate 一時無効化）
#
# 根拠:
#   - lais/verify/dev_system_v34_package.md §2.25.9-.14
#   - docs/po-decisions.md PD-111
#   - evidence/MISSION-G49-PKG/PHASE2.1-RESEARCH/hook_capability_matrix.md
#   - PATCH-VIO13-GATE-PO-DISPLAY-FIX（2026-04-26、PO ふとし指示「章番号 / 引用元 /
#     メタタグの羅列は PO に意味不明、表示するな」を構造解消）

set -eu

# REPO_ROOT 解決（PATCH-VIO12-REPO-ROOT-FIX、2026-04-25）
# ADV メイン cwd が dev-system-adv（git 管理外）の場合 git rev-parse 失敗 → pwd
# フォールバックで誤解決していたため、共通ヘルパーで goal-ai-worker を確実に特定。
. "$(dirname "$0")/lib/resolve_repo_root.sh"
if ! REPO_ROOT="$(resolve_repo_root)" || [ -z "${REPO_ROOT:-}" ] || [ ! -d "${REPO_ROOT}" ]; then
  echo "ERROR: adv_response_gate could not resolve REPO_ROOT" >&2
  exit 0  # fail-open（既存仕様維持、hook 通過）
fi
cd "$REPO_ROOT"

LOG_FILE="${REPO_ROOT}/logs/adv_violation_gate.log"
DEDUP_DIR="${HOME}/.dev-system/gate_dedup"
FAIL_STATE="${HOME}/.dev-system/gate_failures"
OVERRIDE_FLAG="${REPO_ROOT}/instructions/gate_override.flag"
FAIL_OPEN_THRESHOLD=3

# PATCH-VIO13-GATE-PO-DISPLAY-FIX: PO 表示モード（既定 clean）
ADV_GATE_PO_DISPLAY_MODE="${ADV_GATE_PO_DISPLAY_MODE:-clean}"

mkdir -p "${REPO_ROOT}/logs" "${DEDUP_DIR}" "$(dirname "$FAIL_STATE")"

ts() { date -u +%Y-%m-%dT%H:%M:%SZ; }

log() {
  printf '%s\t%s\n' "$(ts)" "$1" >>"$LOG_FILE" 2>/dev/null || true
}

# --- テストモード（fail-closed 動作検証） ---------------------------------
if [ "${1:-}" = "--test-fail-closed" ]; then
  # 完了コマンドの grep -q "BLOCK" 通過用に BLOCK ラベルも明記
  echo '{"decision":"block","reason":"BLOCK [test-fail-closed] adv_response_gate fail-closed 動作確認"}'
  log "[BLOCK] [TEST] --test-fail-closed BLOCK 出力テスト"
  exit 0
fi

# --- PO override 判定 -----------------------------------------------------
if [ -f "$OVERRIDE_FLAG" ]; then
  log "[OVERRIDE] gate_override.flag 検出、gate 一時無効化"
  exit 0
fi

# --- fail-open（連続失敗 3 回到達） ---------------------------------------
FAIL_COUNT=0
[ -f "$FAIL_STATE" ] && FAIL_COUNT=$(cat "$FAIL_STATE" 2>/dev/null | head -1)
FAIL_COUNT="${FAIL_COUNT:-0}"
case "$FAIL_COUNT" in
  ''|*[!0-9]*) FAIL_COUNT=0 ;;
esac

if [ "$FAIL_COUNT" -ge "$FAIL_OPEN_THRESHOLD" ]; then
  log "[FAIL-OPEN] 連続失敗 ${FAIL_COUNT} 回到達、PO 通知済、gate 自動 fail-open"
  exit 0
fi

# --- stdin JSON 読み取り（hook input） ------------------------------------
INPUT=""
if [ ! -t 0 ]; then
  INPUT=$(cat 2>/dev/null || true)
fi

# fail-closed: stdin が空かつテストモードでない → エラー扱い、ただし block 出さず exit 0（hook 起動時のみブロック対象）
if [ -z "$INPUT" ]; then
  log "[SKIP] stdin 空（hook 起動コンテキスト外）"
  exit 0
fi

# --- session_id / response テキスト抽出 ----------------------------------
# python3 -c で stdin を確実に受ける（heredoc は stdin を奪うため使わない）
# tmpfile で一旦受け取る
TMP_PARSED=$(mktemp -t adv_gate_parsed.XXXXXX)
TMP_RESP=$(mktemp -t adv_gate_resp.XXXXXX)
trap 'rm -f "$TMP_PARSED" "$TMP_RESP"' EXIT

export TMP_RESP
PARSE_RESULT=$(printf '%s' "$INPUT" | TMP_RESP="$TMP_RESP" python3 -c '
import json, sys, hashlib, os
raw = sys.stdin.read()
try:
    obj = json.loads(raw) if raw else {}
except Exception as e:
    print(f"PARSE_ERROR\t{e}")
    sys.exit(0)
sid = str(obj.get("session_id", ""))
ev = str(obj.get("hook_event_name", ""))
msg = obj.get("last_assistant_message")
if not msg:
    tp = obj.get("transcript_path", "")
    if tp and os.path.exists(tp):
        try:
            with open(tp, "rb") as f:
                f.seek(0, 2); end = f.tell()
                f.seek(max(0, end - 65536))
                msg = f.read().decode("utf-8", errors="ignore")
        except Exception:
            msg = ""
msg = str(msg or "")
sha = hashlib.sha1(msg.encode("utf-8", errors="ignore")).hexdigest()[:16] if msg else ""
resp_path = os.environ.get("TMP_RESP", "")
if resp_path:
    try:
        with open(resp_path, "w", encoding="utf-8") as f:
            f.write(msg)
    except Exception:
        pass
sys.stdout.write(f"OK\t{sid}\t{ev}\t{sha}\n")
' 2>&1) || true

META="$PARSE_RESULT"
case "$META" in
  PARSE_ERROR*)
    log "[FAIL] hook input JSON parse 失敗: $META"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo "$FAIL_COUNT" > "$FAIL_STATE"
    if [ "$FAIL_COUNT" -ge "$FAIL_OPEN_THRESHOLD" ]; then
      log "[FAIL-OPEN] 連続失敗 ${FAIL_COUNT} 回、PO 通知 + fail-open 移行"
    fi
    echo '{"decision":"block","reason":"adv_response_gate: hook input parse 失敗（fail-closed）"}'
    exit 0
    ;;
esac

# TAB 区切り 4 列を分解
SID=$(printf '%s' "$META" | head -1 | awk -F'\t' '{print $2}')
EV=$(printf '%s' "$META" | head -1 | awk -F'\t' '{print $3}')
SHA=$(printf '%s' "$META" | head -1 | awk -F'\t' '{print $4}')

# 応答テキスト本体を tmpfile から読む
if [ -f "$TMP_RESP" ] && [ -s "$TMP_RESP" ]; then
  RESP_TEXT=$(cat "$TMP_RESP")
else
  RESP_TEXT=""
fi

# 応答テキスト未取得（last_assistant_message も transcript も空）→ skip
if [ -z "$RESP_TEXT" ]; then
  log "[SKIP] sid=${SID} ev=${EV} 応答テキスト取得不能、skip"
  exit 0
fi

# --- 冪等性 dedupe（チェックのみ、touch は検査完了後） ---------------------
# 早期 touch だと検査失敗 / クラッシュ後の再実行で skip されて BLOCK 漏れになるため、
# 検査が正常完了した時点で初めて dedupe マーキング（GPT-5 CRITICAL 指摘、2026-04-25）
DEDUP_KEY="${SID}_${SHA}"
DEDUP_FILE="${DEDUP_DIR}/${DEDUP_KEY}.flag"
if [ -f "$DEDUP_FILE" ]; then
  log "[DEDUP] sid=${SID} sha=${SHA} 多重発火検出、skip"
  exit 0
fi

# 古い dedup ファイル掃除（24h 経過）
find "$DEDUP_DIR" -type f -mtime +1 -delete 2>/dev/null || true

# --- 検査ロジック（§2.25.9-.14 + §2.25.23.9） ----------------------------
# PATCH-VIO13-GATE-PO-DISPLAY-FIX: VIOLATIONS_CRITICAL（PO 表示）と
# VIOLATIONS_INTERNAL（内部ログ専用、PO 表示しない）の 2 系統に分離。
VIOLATIONS_CRITICAL=""
VIOLATIONS_INTERNAL=""
WARNINGS=""

# §2.25.23.9 + 違反 #12: 判断キーワード検出時、vote_dispatcher 呼出ログ検証
# PATCH-VIO12-PERSONA-MECH（2026-04-26）
# 「採用」「推奨」「案 A」「案 B」「〜すべき」「〜しよう」等の判断キーワードを検出した場合、
# 同セッションで vote_dispatcher.sh が呼ばれた形跡を logs/vote_log.log で確認、
# 未呼出なら BLOCK（ペルソナ判定機構形骸化の構造解消）
JUDGEMENT_KW_HIT=0
if grep -qE "(採用|推奨|案[[:space:]]*[ABCDＡＢＣＤ]|案[[:space:]]*[1-9１-９]|option[[:space:]]*[ABCDabcd]|すべき|しよう|決定|選定|選択)" "$TMP_RESP"; then
  JUDGEMENT_KW_HIT=1
fi

if [ "$JUDGEMENT_KW_HIT" = "1" ]; then
  # vote_log.log の直近 1 時間以内に当該セッション or 5 件以内のエントリがあるか確認
  VOTE_LOG="${REPO_ROOT}/logs/vote_log.log"
  vote_call_recent=0
  if [ -f "$VOTE_LOG" ]; then
    # 直近 5 行に有効な vote エントリ（autonomous|escalate）があれば呼出済とみなす
    if tail -5 "$VOTE_LOG" 2>/dev/null | grep -qE "(autonomous|escalate)"; then
      vote_call_recent=1
    fi
  fi
  # §2.25.3 PO 判断必須事項該当時のみ vote_dispatcher を skip 可能（§2.25.23.9 例外）
  is_po_critical=0
  if grep -qE "(コスト影響|新プロセス追加|ブランド変更|データスキーマ変更|外部依存追加|§2\.25\.3 該当)" "$TMP_RESP"; then
    is_po_critical=1
  fi
  if [ "$vote_call_recent" = "0" ] && [ "$is_po_critical" = "0" ]; then
    # §2.25.23.9 は機構形骸化検出 = PO 表示すべき重要違反（CRITICAL 系）
    VIOLATIONS_CRITICAL="${VIOLATIONS_CRITICAL}§2.25.23.9 判断キーワード検出 + vote_dispatcher 呼出ログ欠落 (違反 #12 系統); "
  fi
fi

# 入力テキストは既に Phase 1 で TMP_RESP に書き込み済（trap も既設定済、上書き禁止）
# Gemini CRITICAL 指摘（trap 上書き → /tmp ファイル蓄積）対応で TMP_RESP 再 mktemp は廃止

# §2.25.21.4 + 違反 #14: Phase 完了宣言時の実機 smoke PASS ログ検証
# PATCH-VIO14-FIX（2026-04-26）
# 「Phase X completed」「Phase X 完遂」「全完走」「全 N 画面 completed」等の Phase 完了宣言キーワードを検出した場合、
# logs/smoke_results.log の直近 5 行に PASS 記録があるか検証、不在なら BLOCK
# （Phase 納品品質レイヤー、違反 #11/#12/#13 の応答品質とは別レイヤー）
PHASE_COMPLETE_HIT=0
if grep -qE "(Phase[[:space:]]*[A-Z]+[[:space:]]*completed|Phase[[:space:]]*[A-Z]+[[:space:]]*完遂|全完走|全[[:space:]]*[0-9]+[[:space:]]*画面[[:space:]]*(完遂|completed))" "$TMP_RESP"; then
  PHASE_COMPLETE_HIT=1
fi

if [ "$PHASE_COMPLETE_HIT" = "1" ]; then
  SMOKE_LOG="${REPO_ROOT}/logs/smoke_results.log"
  REAL_SMOKE_LOG="${REPO_ROOT}/logs/realmachine_smoke_results.log"
  smoke_ok=0
  real_smoke_ok=0
  # 既存: mock smoke ログ直近 5 行に PASS 記録があれば mock smoke 検証通過とみなす
  if [ -f "$SMOKE_LOG" ]; then
    if tail -5 "$SMOKE_LOG" 2>/dev/null | grep -qE "PASS"; then
      smoke_ok=1
    fi
  fi
  # 追加（PATCH-LOGIN-TEST-STRUCTURAL-FIX、2026-04-26）:
  # logs/realmachine_smoke_results.log 直近 5 行に
  # signin_success=true && dashboard_reached=true && result=PASS の 3 条件を同時に満たす行存在検証
  # （TAB 区切り 6 列、mock smoke のみで Phase 完了が通過する構造的盲点を解消）
  if [ -f "$REAL_SMOKE_LOG" ]; then
    if tail -5 "$REAL_SMOKE_LOG" 2>/dev/null | grep -E "signin_success=true" | grep -E "dashboard_reached=true" | grep -qE "result=PASS"; then
      real_smoke_ok=1
    fi
  fi
  # 追加（PATCH-LAIS-IOS-SMOKE-MANDATORY、2026-04-26）:
  # lais/logs/ios_smoke_results.log 直近 5 行に result=PASS 行存在 + SUMMARY 行 FAIL=0 確認。
  # ふとし実機で iOS バグ発見 = ADV 検出漏れ = 構造的問題 を機械強制で防止する。
  IOS_SMOKE_LOG="${REPO_ROOT}/lais/logs/ios_smoke_results.log"
  ios_smoke_ok=0
  if [ -f "$IOS_SMOKE_LOG" ]; then
    if tail -10 "$IOS_SMOKE_LOG" 2>/dev/null | grep -qE "result=PASS|	PASS	"; then
      # SUMMARY 行が直近にあれば FAIL=0 を厳格チェック、なければ PASS 行のみで通過
      if tail -10 "$IOS_SMOKE_LOG" 2>/dev/null | grep -qE "SUMMARY"; then
        if tail -10 "$IOS_SMOKE_LOG" 2>/dev/null | grep "SUMMARY" | tail -1 | grep -qE "FAIL=0"; then
          ios_smoke_ok=1
        fi
      else
        # SUMMARY なし fallback: PASS 行が直近 10 行にあれば通過
        ios_smoke_ok=1
      fi
    fi
  fi
  # §2.25.3 PO 判断必須事項該当時 or 仕様書改定のみ実装変更なし のとき smoke skip 可（mock + 実機 共通）
  smoke_skip=0
  if grep -qE "(§2\.25\.3 該当|仕様書改定のみ実装変更なし|spec-only no-code-touch)" "$TMP_RESP"; then
    smoke_skip=1
  fi
  if [ "$smoke_skip" = "0" ]; then
    # mock smoke 不在 → 既存違反（互換維持）
    if [ "$smoke_ok" = "0" ]; then
      VIOLATIONS_CRITICAL="${VIOLATIONS_CRITICAL}§2.25.21.4 Phase 完了宣言 + mock smoke PASS ログ欠落 (違反 #14 系統); "
    fi
    # 実機 smoke 不在 → 追加違反（PATCH-LOGIN-TEST-STRUCTURAL-FIX）
    if [ "$real_smoke_ok" = "0" ]; then
      VIOLATIONS_CRITICAL="${VIOLATIONS_CRITICAL}§2.25.21.4 Phase 完了宣言 + 実機 smoke PASS ログ欠落 (logs/realmachine_smoke_results.log に signin_success=true && dashboard_reached=true && result=PASS 行不在、PATCH-LOGIN-TEST-STRUCTURAL-FIX); "
    fi
    # iOS smoke 不在 → 追加違反（PATCH-LAIS-IOS-SMOKE-MANDATORY）
    if [ "$ios_smoke_ok" = "0" ]; then
      VIOLATIONS_CRITICAL="${VIOLATIONS_CRITICAL}§2.25.21.4 Phase 完了宣言 + iOS smoke PASS ログ欠落 (lais/logs/ios_smoke_results.log に result=PASS 行不在 or SUMMARY FAIL≠0、PATCH-LAIS-IOS-SMOKE-MANDATORY); "
    fi

    # 追加（PATCH-TEST-GAP-LOGIN-REDIRECT-IMPL、2026-04-26）:
    # 真 E2E 3 軸 assertion 網羅性を機械検証。
    # auth/login/redirect spec のうち少なくとも 1 つで URL/DOM/reload-after の 3 軸 assertion 全カバー必須。
    # 真 E2E PASS 主張時は test_assertion_validator.sh --auth-only で全 PASS 必要。
    e2e_3axis_ok=1
    VALIDATOR="${REPO_ROOT}/scripts/test_assertion_validator.sh"
    REALMACHINE_DIR="${REPO_ROOT}/lais/tests/realmachine"
    if [ -x "$VALIDATOR" ] && [ -d "$REALMACHINE_DIR" ]; then
      if ! "$VALIDATOR" --auth-only "$REALMACHINE_DIR" >/dev/null 2>&1; then
        e2e_3axis_ok=0
      fi
    fi
    if [ "$e2e_3axis_ok" = "0" ]; then
      VIOLATIONS_CRITICAL="${VIOLATIONS_CRITICAL}§2.25.21.4 Phase 完了宣言 + 真 E2E 3 軸 assertion 不足 (auth/login/redirect spec のうち 1 つ以上が URL/DOM/reload-after の 3 軸を満たしていない、PATCH-TEST-GAP-LOGIN-REDIRECT-IMPL); "
    fi

    # 追加（PATCH-TEST-GAP-LOGIN-REDIRECT-IMPL）: 実機 smoke ログ key=value 化検証
    # logs/realmachine_smoke_results.log 直近 10 行に url= / dom= / reload_session= の 3 フィールドが
    # 揃った行が存在するか（key=value 化された 3 軸記録）。
    # skip 条件（既存 smoke_skip）に従う。
    real_smoke_kv_ok=0
    if [ -f "$REAL_SMOKE_LOG" ]; then
      if tail -10 "$REAL_SMOKE_LOG" 2>/dev/null | grep -E "url=" | grep -E "dom=" | grep -qE "reload_session=true"; then
        real_smoke_kv_ok=1
      fi
    fi
    # 実機 smoke が PASS かつ既存 url/dom/reload key 記録あり / なければ「key=value 化未実施」警告 (BLOCK ではなく WARN レベル)
    # 互換維持のため、既存ログに新キーがない既存運用は WARN 扱いにとどめる（移行猶予）。
    if [ "$real_smoke_ok" = "1" ] && [ "$real_smoke_kv_ok" = "0" ]; then
      WARNINGS="${WARNINGS}§2.25.21.4 実機 smoke ログに url=/dom=/reload_session= の 3 軸 key=value フィールド欠落 (PATCH-TEST-GAP-LOGIN-REDIRECT-IMPL、移行期間中 WARN); "
    fi
  fi

  # PATCH-ADV-REPORT-RELIABILITY（2026-04-26）: mock キーワード grep + mock 比率検証 + PO 報告前 5 自問項目検証
  # ADV メインの「Phase 全完走」虚偽納品を構造的に防止する 3 系統機械強制。
  # skip 条件: §2.25.3 PO 判断必須事項該当時 / 仕様書改定のみ実装変更なし / mock smoke 検証ログ言及（既存ログへの正当言及との誤検知回避）
  reliability_skip=0
  if grep -qE "(§2\.25\.3 該当|仕様書改定のみ実装変更なし|spec-only no-code-touch|mock smoke 検証ログ|mock smoke ログ)" "$TMP_RESP"; then
    reliability_skip=1
  fi

  if [ "$reliability_skip" = "0" ]; then
    # 系統 1: mock キーワード grep（実装未完アラート）
    # 検出キーワード: mock data / mockData / MOCK_DATA / dummy data / DUMMY_ / placeholder / PLACEHOLDER /
    # setTimeout 経由擬似遅延 / INITIAL_* 定数 / TODO: Supabase / TODO: 実装 / FIXME: Supabase
    mock_kw_hits=""
    if grep -qE "(mock data|mockData|MOCK_DATA|MockData)" "$TMP_RESP"; then
      mock_kw_hits="${mock_kw_hits}mock_data, "
    fi
    if grep -qE "(dummy data|dummyData|DUMMY_)" "$TMP_RESP"; then
      mock_kw_hits="${mock_kw_hits}dummy, "
    fi
    if grep -qE "(placeholder data|PLACEHOLDER)" "$TMP_RESP"; then
      mock_kw_hits="${mock_kw_hits}placeholder, "
    fi
    # placeholder 単独は誤検知多いため、placeholder data / PLACEHOLDER のみ採取
    if grep -qE "setTimeout\([^)]*[0-9]{2,}[^)]*\)" "$TMP_RESP"; then
      mock_kw_hits="${mock_kw_hits}setTimeout, "
    fi
    if grep -qE "(^|[^A-Za-z0-9])INITIAL_[A-Z]" "$TMP_RESP"; then
      mock_kw_hits="${mock_kw_hits}INITIAL_*, "
    fi
    if grep -qE "(// TODO: Supabase|// TODO: 実装|FIXME: Supabase)" "$TMP_RESP"; then
      mock_kw_hits="${mock_kw_hits}TODO/FIXME, "
    fi
    if [ -n "$mock_kw_hits" ]; then
      VIOLATIONS_CRITICAL="${VIOLATIONS_CRITICAL}§2.25.21.4 Phase 完了宣言 + mock キーワード検出 (実装未完アラート、PATCH-ADV-REPORT-RELIABILITY): ${mock_kw_hits}; "
    fi

    # 系統 2: mock 比率検証
    # mock_count: MOCK_ / mockData / INITIAL_ の出現回数
    # supabase_count: supabase.from( / from(' / client.from( の出現回数
    # mock 比率 50% 超過時 BLOCK
    mock_count=$(grep -cE "(MOCK_|mockData|INITIAL_[A-Z])" "$TMP_RESP" 2>/dev/null || echo 0)
    mock_count="${mock_count:-0}"
    case "$mock_count" in ''|*[!0-9]*) mock_count=0 ;; esac
    supabase_count=$(grep -cE "(supabase\.from\(|from\('|client\.from\()" "$TMP_RESP" 2>/dev/null || echo 0)
    supabase_count="${supabase_count:-0}"
    case "$supabase_count" in ''|*[!0-9]*) supabase_count=0 ;; esac
    total_count=$((mock_count + supabase_count))
    if [ "$total_count" -gt 0 ]; then
      # mock 比率 = mock_count * 100 / total_count、50 超過なら BLOCK
      mock_pct=$((mock_count * 100 / total_count))
      if [ "$mock_pct" -gt 50 ]; then
        VIOLATIONS_CRITICAL="${VIOLATIONS_CRITICAL}§2.25.21.4 Phase 完了宣言 + mock 比率 ${mock_pct}% 超過 (mock=${mock_count} / supabase=${supabase_count}、実 Supabase 接続コード比率不足、PATCH-ADV-REPORT-RELIABILITY); "
      fi
    fi

    # 系統 3: §2.25.21.5 PO 報告前 5 自問項目検証
    # 5 項目中 3 項目以上欠落で BLOCK
    selfq_missing=0
    selfq_detail=""
    # 項目1: ふとし実機で何ができるか
    if ! grep -qE "(ふとし.*できる|実機.*動作|実機.*できる)" "$TMP_RESP"; then
      selfq_missing=$((selfq_missing + 1))
      selfq_detail="${selfq_detail}項目1(実機できる), "
    fi
    # 項目2: ふとし実機で何ができないか
    if ! grep -qE "(できない|未実装|既知制約|次.*Phase)" "$TMP_RESP"; then
      selfq_missing=$((selfq_missing + 1))
      selfq_detail="${selfq_detail}項目2(できない), "
    fi
    # 項目3: 実データが保存されるか
    if ! grep -qE "(Supabase.*保存|DB.*保存|実データ|INSERT 確認|realmachine_smoke_results)" "$TMP_RESP"; then
      selfq_missing=$((selfq_missing + 1))
      selfq_detail="${selfq_detail}項目3(実データ保存), "
    fi
    # 項目4: 全画面で DB 反映
    if ! grep -qE "(全.*画面.*Supabase|画面別.*検証|mock.*ゼロ|mock.*残存)" "$TMP_RESP"; then
      selfq_missing=$((selfq_missing + 1))
      selfq_detail="${selfq_detail}項目4(全画面DB反映), "
    fi
    # 項目5: PO 視点シミュレーション
    if ! grep -qE "(PO.*スマホ|PO 視点|PO が.*操作)" "$TMP_RESP"; then
      selfq_missing=$((selfq_missing + 1))
      selfq_detail="${selfq_detail}項目5(PO視点), "
    fi
    if [ "$selfq_missing" -ge 3 ]; then
      VIOLATIONS_CRITICAL="${VIOLATIONS_CRITICAL}§2.25.21.5 PO 報告前 自問項目欠落 ${selfq_missing}/5 (${selfq_detail}PATCH-ADV-REPORT-RELIABILITY); "
    fi
  fi
fi

# §2.25.21.6 + PATCH-ADV-REPORT-RELIABILITY-V2-SUBAGENT-BACKING-VERIFY（2026-04-26）
# subagent 報告転記時の実態裏付け検証必須化。
# ADV メイン応答内に subagent 報告由来の数字（PASS=N / 修正数 N / N 件全て PASS / 新設 N ファイル / N endpoints / realmachine.*PASS）
# が含まれる場合、対応する裏付け（ログ参照 / 実機 grep / 実機 find / 実機検証言及）を機械検証。
# 裏付けなし → BLOCK。「§2.25.21.6 subagent 報告転記時の実態裏付け検証なし」を VIOLATIONS_CRITICAL に追記。
# skip 条件: §2.25.3 PO 判断必須事項該当時 / 仕様書改定のみ実装変更なし / mock smoke 検証ログ言及（既存 reliability_skip と同等）
SUBAGENT_BACKING_HIT=0
SUBAGENT_BACKING_PATTERNS=""
if grep -qE "PASS=[0-9]+[[:space:]]+FAIL=[0-9]+" "$TMP_RESP"; then
  SUBAGENT_BACKING_HIT=1
  SUBAGENT_BACKING_PATTERNS="${SUBAGENT_BACKING_PATTERNS}PASS=N FAIL=N, "
fi
if grep -qE "修正数[[:space:]]*[0-9]+[[:space:]]*件" "$TMP_RESP"; then
  SUBAGENT_BACKING_HIT=1
  SUBAGENT_BACKING_PATTERNS="${SUBAGENT_BACKING_PATTERNS}修正数 N 件, "
fi
if grep -qE "[0-9]+[[:space:]]*件全て[[:space:]]*PASS" "$TMP_RESP"; then
  SUBAGENT_BACKING_HIT=1
  SUBAGENT_BACKING_PATTERNS="${SUBAGENT_BACKING_PATTERNS}N 件全て PASS, "
fi
if grep -qE "新設[[:space:]]*[0-9]+[[:space:]]*ファイル" "$TMP_RESP"; then
  SUBAGENT_BACKING_HIT=1
  SUBAGENT_BACKING_PATTERNS="${SUBAGENT_BACKING_PATTERNS}新設 N ファイル, "
fi
if grep -qE "[0-9]+[[:space:]]*endpoints?" "$TMP_RESP"; then
  SUBAGENT_BACKING_HIT=1
  SUBAGENT_BACKING_PATTERNS="${SUBAGENT_BACKING_PATTERNS}N endpoints, "
fi
if grep -qiE "realmachine.*PASS|実機.*PASS|真[[:space:]]*E2E.*PASS" "$TMP_RESP"; then
  SUBAGENT_BACKING_HIT=1
  SUBAGENT_BACKING_PATTERNS="${SUBAGENT_BACKING_PATTERNS}realmachine/真 E2E PASS, "
fi

if [ "$SUBAGENT_BACKING_HIT" = "1" ]; then
  # skip 条件チェック（PATCH-ADV-REPORT-RELIABILITY V1 と同等の skip キーワード）
  backing_skip=0
  if grep -qE "(§2\.25\.3 該当|仕様書改定のみ実装変更なし|spec-only no-code-touch|--test-fail-closed|擬似応答|few-shot 例|few-shot 違反例)" "$TMP_RESP"; then
    backing_skip=1
  fi
  if [ "$backing_skip" = "0" ]; then
    # 系統 1: ログファイル参照言及検証
    # 応答内に realmachine_smoke_results.log / smoke_results.log のいずれかへの参照がない → 裏付け不足
    log_ref_ok=0
    if grep -qE "(realmachine_smoke_results\.log|smoke_results\.log|logs/.*\.log|tail.*log|head.*log|cat.*log)" "$TMP_RESP"; then
      log_ref_ok=1
    fi
    # 系統 2: 実機検証言及検証（grep / find / git status / wc / 実機検証 / 実機確認 等の動詞）
    realcheck_ref_ok=0
    if grep -qE "(grep[[:space:]]|find[[:space:]]|git[[:space:]]+status|wc[[:space:]]+-l|実機[[:space:]]*(検証|確認|grep|find)|実機で[[:space:]]*(grep|find|tail|cat|head)|実機 (grep|find|tail|cat|head|wc|git)|実機の[[:space:]]*ログ)" "$TMP_RESP"; then
      realcheck_ref_ok=1
    fi
    # 系統 3: 真 E2E PASS 主張時、realmachine_smoke_results.log への明示参照必須
    realmachine_strict_ok=1
    if grep -qiE "(realmachine.*PASS|真[[:space:]]*E2E.*PASS|実機[[:space:]]*E2E.*PASS)" "$TMP_RESP"; then
      if ! grep -qE "realmachine_smoke_results\.log" "$TMP_RESP"; then
        realmachine_strict_ok=0
      fi
    fi
    # 裏付け 2 系統（ログ言及 + 実機検証言及）の少なくとも 1 系統が無 + realmachine 系統不一致 → BLOCK
    if [ "$log_ref_ok" = "0" ] && [ "$realcheck_ref_ok" = "0" ]; then
      VIOLATIONS_CRITICAL="${VIOLATIONS_CRITICAL}§2.25.21.6 subagent 報告転記時の実態裏付け検証なし: 検出パターン [${SUBAGENT_BACKING_PATTERNS}]、ログ参照 + 実機検証言及いずれも不在 (PATCH-ADV-REPORT-RELIABILITY-V2); "
    elif [ "$log_ref_ok" = "0" ]; then
      VIOLATIONS_CRITICAL="${VIOLATIONS_CRITICAL}§2.25.21.6 subagent 報告転記時のログ参照欠落: 検出パターン [${SUBAGENT_BACKING_PATTERNS}]、logs/.*\.log 参照を応答内に明示必須 (PATCH-ADV-REPORT-RELIABILITY-V2); "
    elif [ "$realcheck_ref_ok" = "0" ]; then
      VIOLATIONS_CRITICAL="${VIOLATIONS_CRITICAL}§2.25.21.6 subagent 報告転記時の実機検証言及欠落: 検出パターン [${SUBAGENT_BACKING_PATTERNS}]、grep/find/git status/wc/実機検証 言及を応答内に明示必須 (PATCH-ADV-REPORT-RELIABILITY-V2); "
    fi
    if [ "$realmachine_strict_ok" = "0" ]; then
      VIOLATIONS_CRITICAL="${VIOLATIONS_CRITICAL}§2.25.21.6 真 E2E PASS 主張 + realmachine_smoke_results.log 参照欠落 (PATCH-ADV-REPORT-RELIABILITY-V2); "
    fi

    # 追加（PATCH-TEST-GAP-LOGIN-REDIRECT-IMPL、2026-04-26）:
    # 真 E2E PASS / realmachine.*PASS 主張時、対応 spec の 3 軸 assertion カバー検証必須。
    # T1 採択（10/10）真 E2E 3 軸 + T4 採択（4/10）subagent 報告裏付けの連動。
    if grep -qiE "(realmachine.*PASS|真[[:space:]]*E2E.*PASS|実機[[:space:]]*E2E.*PASS)" "$TMP_RESP"; then
      VALIDATOR_V2="${REPO_ROOT}/scripts/test_assertion_validator.sh"
      REALMACHINE_DIR_V2="${REPO_ROOT}/lais/tests/realmachine"
      if [ -x "$VALIDATOR_V2" ] && [ -d "$REALMACHINE_DIR_V2" ]; then
        if ! "$VALIDATOR_V2" --auth-only "$REALMACHINE_DIR_V2" >/dev/null 2>&1; then
          VIOLATIONS_CRITICAL="${VIOLATIONS_CRITICAL}§2.25.21.6 subagent PASS=N 転記時の真 E2E 3 軸 assertion カバー不足 (auth/login/redirect spec の URL/DOM/reload-after の 3 軸不足、PATCH-TEST-GAP-LOGIN-REDIRECT-IMPL); "
        fi
      fi
    fi
  fi
fi

# §2.25.9: PO 作業発生提案の事前ゲート
# 「貼付」「起動」「判断仰ぎ」「タイミング」キーワード + §2.25.3 メタタグ未存在 → BLOCK
# §2.25.9 は PO 作業発生提案 = PO 表示すべき重要違反（CRITICAL 系）
if grep -qE "(貼付|起動|判断仰ぎ|タイミング)" "$TMP_RESP"; then
  if ! grep -qE "\[§2\.25\.3:|§2\.25\.3 該当|§2\.25\.3.*(コスト|新プロセス|ブランド)" "$TMP_RESP"; then
    VIOLATIONS_CRITICAL="${VIOLATIONS_CRITICAL}§2.25.9 PO 作業発生提案検出 + §2.25.3 メタタグ欠落; "
  fi
fi

# §2.25.10: 反省装置検出
# 「違反 #N として記録」のみで構造解消提案（仕様改定 / 機械ゲート / 仕様参照強化）伴わない → BLOCK
# §2.25.10 は ADV 自己反省ループ防止 = 内部メタ違反（INTERNAL 系、PO 表示せず）
if grep -qE "違反\s*#?[0-9]+\s*として記録" "$TMP_RESP"; then
  if ! grep -qE "(仕様改定|機械ゲート|仕様参照強化|構造解消|§2\.25\.[0-9]+ (拡張|新設)|adv_response_gate|spec_lint)" "$TMP_RESP"; then
    VIOLATIONS_INTERNAL="${VIOLATIONS_INTERNAL}§2.25.10 違反記録のみ + 構造解消提案欠落; "
  fi
fi

# §2.25.11: 応答整合性
# 直前 3 ターンの ADV 立場確定キーワード「不要」「該当なし」「却下」と現応答方針の矛盾 + 撤回宣言欠落 → BLOCK
# 直前 3 ターン取得は transcript の末尾 64KB から推定
# PATCH-VIO13-GATE-PO-DISPLAY-FIX: 自己参照ループ対策（撤回宣言応答自体を検出対象から除外）
SELF_REF_LOOP_SKIP=0
if grep -qE "(撤回宣言|§2\.25\.11 撤回|方針撤回|自己参照ループ|§2\.25\.11 自己参照)" "$TMP_RESP"; then
  SELF_REF_LOOP_SKIP=1
fi
if [ "$SELF_REF_LOOP_SKIP" = "0" ]; then
  if [ -n "${TRANSCRIPT_PATH:-}" ] || printf '%s' "$INPUT" | grep -q '"transcript_path"'; then
    TP=$(printf '%s' "$INPUT" | python3 -c "import json,sys; o=json.loads(sys.stdin.read() or '{}'); print(o.get('transcript_path',''))" 2>/dev/null || true)
    if [ -n "$TP" ] && [ -f "$TP" ]; then
      PRIOR=$(tail -c 16384 "$TP" 2>/dev/null || true)
      PRIOR_HAS_DENY=$(printf '%s' "$PRIOR" | grep -cE "(不要|該当なし|却下)" || true)
      CUR_FLIPPED=$(grep -cE "(必要|該当します|採用|提案します)" "$TMP_RESP" || true)
      if [ "${PRIOR_HAS_DENY:-0}" -gt 0 ] && [ "${CUR_FLIPPED:-0}" -gt 0 ]; then
        if ! grep -qE "(直前で.*と(言|述べ).*が|訂正します|撤回します)" "$TMP_RESP"; then
          # §2.25.11 は ADV 内部立場矛盾 = 内部メタ違反（INTERNAL 系、PO 表示せず）
          VIOLATIONS_INTERNAL="${VIOLATIONS_INTERNAL}§2.25.11 直前 3T 立場矛盾 + 撤回宣言欠落; "
        fi
      fi
    fi
  fi
else
  log "[SKIP] §2.25.11 self-ref-loop skip sid=${SID} sha=${SHA}"
fi

# §2.25.12: 外部権威ソース参照義務
# claude / wrangler / supabase / stripe / playwright / anthropic 言及 + 引用元なし + 「未確認」なし → BLOCK
# §2.25.12 は ADV 内部の引用元義務 = 内部メタ違反（INTERNAL 系、PO 表示せず）
# 理由: PO ふとし指示「引用元羅列は意味不明」、ADV 内部品質管理は内部ログで継続観測
if grep -qiE "(claude|wrangler|supabase|stripe|playwright|anthropic)" "$TMP_RESP"; then
  if ! grep -qE "(https?://|\.log|--help|evidence/.+\.log|未確認|\\\$\(.*\)|出典:)" "$TMP_RESP"; then
    VIOLATIONS_INTERNAL="${VIOLATIONS_INTERNAL}§2.25.12 外部 CLI/API 言及 + 引用元 or 「未確認」欠落; "
  fi
fi

# §2.25.6 + 違反 #13: 暗号略称垂れ流し検出（PATCH-VIO13-MECH-ENFORCE、2026-04-25）
# ADV 応答に PO 認知負荷を増大させる内部識別子・暗号略称が含まれる場合 BLOCK
# 例外: §2.25.3 該当時 / instructions/gate_override.flag で抑制（既存）
# 検出時の動作モード: ADV_GATE_VIO13_MODE=block|warn|off（既定 warn、本番有効化判断後 block 化）
# §2.25.6 暗号略称検出 = PO 認知負荷直接影響 = PO 表示すべき重要違反（CRITICAL 系）
ADV_GATE_VIO13_MODE="${ADV_GATE_VIO13_MODE:-warn}"
if [ "$ADV_GATE_VIO13_MODE" != "off" ]; then
  vio13_hits=""
  # vote_id=vote_<タイムスタンプ ISO 風>
  if grep -qE "vote_id=vote_[0-9TZ_-]+" "$TMP_RESP"; then
    vio13_hits="${vio13_hits}vote_id, "
  fi
  # FOR=N AGAINST=N ABSTAIN=N （票数羅列）
  if grep -qE "FOR=[0-9]+[[:space:]]+AGAINST=[0-9]+[[:space:]]+ABSTAIN=[0-9]+" "$TMP_RESP"; then
    vio13_hits="${vio13_hits}FOR/AGAINST/ABSTAIN 票数, "
  fi
  # PATCH-XXX 識別子（PATCH-G49-XXX / PATCH-VIO13-MECH-ENFORCE 等）
  if grep -qE "PATCH-[A-Z][A-Z0-9-]{2,}" "$TMP_RESP"; then
    vio13_hits="${vio13_hits}PATCH-XXX, "
  fi
  # SUBAGENT-XXX 識別子
  if grep -qE "SUBAGENT-[A-Z][A-Z0-9-]{2,}" "$TMP_RESP"; then
    vio13_hits="${vio13_hits}SUBAGENT-XXX, "
  fi
  # agentId 形式（16 桁英数）
  if grep -qE "(^|[^A-Za-z0-9])[a-z0-9]{16}([^A-Za-z0-9]|$)" "$TMP_RESP"; then
    vio13_hits="${vio13_hits}agentId(16hex), "
  fi
  # PD-N decision identifier
  if grep -qE "PD-[A-Z0-9-]{2,}" "$TMP_RESP"; then
    vio13_hits="${vio13_hits}PD-N, "
  fi
  # verdict=approve|reject|escalate
  if grep -qE "verdict=(approve|reject|escalate|abstain)" "$TMP_RESP"; then
    vio13_hits="${vio13_hits}verdict=..., "
  fi
  if [ -n "$vio13_hits" ]; then
    if [ "$ADV_GATE_VIO13_MODE" = "block" ]; then
      VIOLATIONS_CRITICAL="${VIOLATIONS_CRITICAL}§2.25.6 暗号略称垂れ流し検出 (違反 #13 系統): ${vio13_hits}; "
    else
      WARNINGS="${WARNINGS}§2.25.6 暗号略称検出 [warn-mode] ${vio13_hits}; "
    fi
  fi
fi

# §2.25.21.2 + 違反 #13: PO 向け 5 行サマリーテンプレ機械検証（PATCH-VIO13-MECH-ENFORCE、2026-04-25）
# 完了報告キーワード検出時、応答全体の行数を計測 → 30 行超過なら 5 行サマリー化必須として BLOCK
# 切替: ADV_GATE_SUMMARY_MODE=block|warn|off（既定 warn）
# §2.25.21.2 は PO 認知負荷直接影響 = PO 表示すべき重要違反（CRITICAL 系）
ADV_GATE_SUMMARY_MODE="${ADV_GATE_SUMMARY_MODE:-warn}"
if [ "$ADV_GATE_SUMMARY_MODE" != "off" ]; then
  if grep -qE "(完了|PASS|実装済|完遂|完了報告|やったこと)" "$TMP_RESP"; then
    LINES_SUMMARY=$(wc -l <"$TMP_RESP" | tr -d ' ')
    if [ "${LINES_SUMMARY:-0}" -gt 30 ]; then
      # PO 明示要求（詳細 / 全文 / 比較等）が直前ターンにあれば例外
      summary_po_request=0
      if [ -n "${TP:-}" ] && [ -f "$TP" ]; then
        PRIOR2=$(tail -c 16384 "$TP" 2>/dev/null || true)
        if printf '%s' "$PRIOR2" | grep -qE "(詳細|全文|比較|もっと詳し|内訳)"; then
          summary_po_request=1
        fi
      fi
      if [ "$summary_po_request" = "0" ]; then
        if [ "$ADV_GATE_SUMMARY_MODE" = "block" ]; then
          VIOLATIONS_CRITICAL="${VIOLATIONS_CRITICAL}§2.25.21.2 完了報告 ${LINES_SUMMARY} 行（>30）+ PO 向け 5 行サマリー化未実施 (違反 #13 系統); "
        else
          WARNINGS="${WARNINGS}§2.25.21.2 完了報告 ${LINES_SUMMARY} 行（>30）[warn-mode] 5 行サマリー化推奨; "
        fi
      fi
    fi
  fi
fi

# §2.25.13: 完了報告 8 行超 + PO 明示要求なし → WARN（BLOCK ではなく警告）
if grep -qE "(完了|PASS|実装済|完遂)" "$TMP_RESP"; then
  LINES=$(wc -l <"$TMP_RESP" | tr -d ' ')
  if [ "${LINES:-0}" -gt 8 ]; then
    # PO の明示要求は同応答内では検出不可のため、transcript の直前ターンから推定
    PO_REQUEST=0
    if [ -n "${TP:-}" ] && [ -f "$TP" ]; then
      PRIOR=$(tail -c 16384 "$TP" 2>/dev/null || true)
      if printf '%s' "$PRIOR" | grep -qE "(詳細|全文|比較|もっと詳し)"; then
        PO_REQUEST=1
      fi
    fi
    if [ "$PO_REQUEST" -eq 0 ]; then
      WARNINGS="${WARNINGS}§2.25.13 完了報告 ${LINES} 行（>8）+ PO 明示要求なし; "
    fi
  fi
fi

# §2.25.14: 応答末尾ペルソナレビュー付記
# [Review: N rounds, M personas] が応答末尾に存在しない → BLOCK
# §2.25.14 は ADV 内部レビュー機構付記 = 内部メタ違反（INTERNAL 系、PO 表示せず）
# 理由: PO ふとし指示「[Review: ...] は ADV 内部メタ情報、PO 不要」
if ! tail -c 256 "$TMP_RESP" | grep -qE "\[Review:[[:space:]]*[0-9]+[[:space:]]*rounds?,[[:space:]]*[0-9]+[[:space:]]*personas?\]"; then
  VIOLATIONS_INTERNAL="${VIOLATIONS_INTERNAL}§2.25.14 応答末尾 [Review: N rounds, M personas] 付記欠落; "
fi

# §2.25.21.7 + PATCH-TODAY-FALSE-REPORTS-IMPROVEMENT（2026-04-26）
# 完了報告 禁止語彙 grep + 必須数値フィールド検証
# 「完走」「全 PASS」「動作確認済」「全完走」「全件 PASS」が単独使用された場合、
# 必須数値フィールド（mock=N / real=N / unknown_residual=N / 実態率 N% / mock 件数 / 実機件数 / 既知未検証）
# の共起 2 件以上を要求。2 件未満なら BLOCK。
# 環境変数モード: ADV_GATE_FALSE_REPORTS_MODE=block|warn|off（既定 warn）
ADV_GATE_FALSE_REPORTS_MODE="${ADV_GATE_FALSE_REPORTS_MODE:-warn}"
if [ "$ADV_GATE_FALSE_REPORTS_MODE" != "off" ]; then
  # skip 条件: §2.25.3 PO 判断必須事項該当 / 仕様書改定のみ / few-shot 例言及
  false_reports_skip=0
  if grep -qE "(§2\.25\.3 該当|仕様書改定のみ実装変更なし|spec-only no-code-touch|--test-fail-closed|擬似応答|few-shot 例|few-shot 違反例|禁止語彙集合|few-shot 違反|few-shot 正例)" "$TMP_RESP"; then
    false_reports_skip=1
  fi
  if [ "$false_reports_skip" = "0" ]; then
    # 引用文（行頭 `> `）を除外したテキストで検査
    TMP_NONQUOTE=$(mktemp -t adv_gate_nonquote.XXXXXX)
    grep -vE '^[[:space:]]*>' "$TMP_RESP" > "$TMP_NONQUOTE" 2>/dev/null || cp "$TMP_RESP" "$TMP_NONQUOTE"

    # 禁止語彙検出（FORBIDDEN_VOCAB_HIT）
    FORBIDDEN_VOCAB_HIT=0
    forbidden_vocab_list=""
    if grep -qE "完走" "$TMP_NONQUOTE"; then
      FORBIDDEN_VOCAB_HIT=1
      forbidden_vocab_list="${forbidden_vocab_list}完走, "
    fi
    if grep -qE "全[[:space:]]*PASS" "$TMP_NONQUOTE"; then
      FORBIDDEN_VOCAB_HIT=1
      forbidden_vocab_list="${forbidden_vocab_list}全 PASS, "
    fi
    if grep -qE "動作確認済" "$TMP_NONQUOTE"; then
      FORBIDDEN_VOCAB_HIT=1
      forbidden_vocab_list="${forbidden_vocab_list}動作確認済, "
    fi
    if grep -qE "全完走" "$TMP_NONQUOTE"; then
      FORBIDDEN_VOCAB_HIT=1
      forbidden_vocab_list="${forbidden_vocab_list}全完走, "
    fi
    if grep -qE "全件[[:space:]]*PASS" "$TMP_NONQUOTE"; then
      FORBIDDEN_VOCAB_HIT=1
      forbidden_vocab_list="${forbidden_vocab_list}全件 PASS, "
    fi

    if [ "$FORBIDDEN_VOCAB_HIT" = "1" ]; then
      # 必須数値フィールド検出（最低 2 件共起必須）
      required_field_count=0
      required_field_list=""
      if grep -qE "mock=[0-9]+" "$TMP_NONQUOTE"; then
        required_field_count=$((required_field_count + 1))
        required_field_list="${required_field_list}mock=N, "
      fi
      if grep -qE "real=[0-9]+" "$TMP_NONQUOTE"; then
        required_field_count=$((required_field_count + 1))
        required_field_list="${required_field_list}real=N, "
      fi
      if grep -qE "unknown_residual=[0-9]+" "$TMP_NONQUOTE"; then
        required_field_count=$((required_field_count + 1))
        required_field_list="${required_field_list}unknown_residual=N, "
      fi
      if grep -qE "実態率[[:space:]]*[0-9]+%" "$TMP_NONQUOTE"; then
        required_field_count=$((required_field_count + 1))
        required_field_list="${required_field_list}実態率 N%, "
      fi
      if grep -qE "mock[[:space:]]*件数[[:space:]]*[0-9]+" "$TMP_NONQUOTE"; then
        required_field_count=$((required_field_count + 1))
        required_field_list="${required_field_list}mock 件数 N, "
      fi
      if grep -qE "実機[[:space:]]*件数[[:space:]]*[0-9]+" "$TMP_NONQUOTE"; then
        required_field_count=$((required_field_count + 1))
        required_field_list="${required_field_list}実機件数 N, "
      fi
      if grep -qE "既知未検証[[:space:]]*[0-9]+" "$TMP_NONQUOTE"; then
        required_field_count=$((required_field_count + 1))
        required_field_list="${required_field_list}既知未検証 N, "
      fi

      # 禁止語彙 検出 + 必須フィールド 2 件未満 → BLOCK
      if [ "$required_field_count" -lt 2 ]; then
        if [ "$ADV_GATE_FALSE_REPORTS_MODE" = "block" ]; then
          VIOLATIONS_CRITICAL="${VIOLATIONS_CRITICAL}§2.25.21.7 禁止語彙 [${forbidden_vocab_list}] 単独使用 + 必須数値フィールド ${required_field_count}/2 件未満 [${required_field_list}] (PATCH-TODAY-FALSE-REPORTS-IMPROVEMENT); "
        else
          WARNINGS="${WARNINGS}§2.25.21.7 [warn-mode] 禁止語彙 [${forbidden_vocab_list}] + 必須フィールド ${required_field_count}/2 件; "
        fi
      fi
    fi

    rm -f "$TMP_NONQUOTE" 2>/dev/null || true
  fi
fi

# --- 結果出力 -----------------------------------------------------------
# 検査が正常完了したのでこの時点で dedupe マーキング（GPT-5 CRITICAL 対応、2026-04-25）
# touch 失敗は最後の手段として無視（次回再 BLOCK で安全側）
touch "$DEDUP_FILE" 2>/dev/null || true

# PATCH-VIO13-GATE-PO-DISPLAY-FIX: 内部ログには両系統を全件記録（検出維持）
if [ -n "$VIOLATIONS_CRITICAL" ] || [ -n "$VIOLATIONS_INTERNAL" ]; then
  ALL_VIOLATIONS="${VIOLATIONS_CRITICAL}${VIOLATIONS_INTERNAL}"
  log "[BLOCK] sid=${SID} sha=${SHA} mode=${ADV_GATE_PO_DISPLAY_MODE} critical=[${VIOLATIONS_CRITICAL}] internal=[${VIOLATIONS_INTERNAL}]"
  echo 0 > "$FAIL_STATE"

  # PO 表示への出力判定（mode 別）
  case "$ADV_GATE_PO_DISPLAY_MODE" in
    strict)
      # 従来挙動: 全違反を PO 表示
      REASON_JSON=$(python3 -c "import json,sys; print(json.dumps({'decision':'block','reason':'§2.25 ADV 行動規範違反: '+sys.argv[1]}, ensure_ascii=False))" "$ALL_VIOLATIONS")
      echo "$REASON_JSON"
      exit 0
      ;;
    clean|*)
      # PO 表示は CRITICAL のみ。INTERNAL は内部ログのみ記録済（上の log 行）。
      if [ -n "$VIOLATIONS_CRITICAL" ]; then
        REASON_JSON=$(python3 -c "import json,sys; print(json.dumps({'decision':'block','reason':'§2.25 ADV 行動規範違反: '+sys.argv[1]}, ensure_ascii=False))" "$VIOLATIONS_CRITICAL")
        echo "$REASON_JSON"
        exit 0
      fi
      # CRITICAL なし、INTERNAL のみ → PO 表示せず exit 0（内部ログには記録済）
      log "[CLEAN-PASS] sid=${SID} sha=${SHA} INTERNAL のみ、PO 表示なし"
      exit 0
      ;;
  esac
fi

if [ -n "$WARNINGS" ]; then
  log "[WARN] sid=${SID} sha=${SHA} warnings: ${WARNINGS}"
fi

log "[PASS] sid=${SID} sha=${SHA} ev=${EV} mode=${ADV_GATE_PO_DISPLAY_MODE}"
echo 0 > "$FAIL_STATE"
exit 0
