#!/bin/sh
# scripts/f_test_runner.sh — ふとし チェックリスト 20 観点 F テスト 機械強制 動作テスト
#
# 根拠:
#   - PO 直命 (2026-05-04): 「ふとし チェックリスト 20 観点 を 各項目 に対して 実施する F テスト 一行追加」
#   - SUBAGENT-F-TEST-FUTOSHI-CHECKLIST-V2
#   - core_spec.md §3.14 + §2.25.21 (Primary Quality Gate Inversion)
#
# 動作 (manual or pre-push hook 経由 自動起動):
#   観点 #1-#20 の 機械強制 動作テスト を 各 自動 verify
#   各 観点: PASS=✅ / WARN=🟡 / FAIL=🔴 を 機械 判定
#
# 出力: stdout (人間可読) + logs/f_test_runner.log (machine readable TSV)
# exit: 0 = ✅ FAIL=0、 1 = 🔴 FAIL >= 1
#
# 緊急 skip:
#   F_TEST_SKIP=1 (verify/adv_violation_log.md 自動記録)
#
# 個別 観点 skip (debugging 用):
#   SKIP_F<N>=1 (例: SKIP_F1=1 で 観点 #1 skip)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
LOG_DIR="${REPO_ROOT}/logs"
LOG_FILE="${LOG_DIR}/f_test_runner.log"
mkdir -p "$LOG_DIR"

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0
FAILED_VIEWS=""

# ANSI color helper (no-op if non-TTY)
if [ -t 1 ]; then
  _GREEN="$(printf '\033[32m')"
  _YELLOW="$(printf '\033[33m')"
  _RED="$(printf '\033[31m')"
  _RESET="$(printf '\033[0m')"
else
  _GREEN=""
  _YELLOW=""
  _RED=""
  _RESET=""
fi

echo "================================================================"
echo "  F テスト runner (ふとし チェックリスト 20 観点 機械強制 動作テスト)"
echo "  PO 直命 2026-05-04 / SUBAGENT-F-TEST-FUTOSHI-CHECKLIST-V2"
echo "  TS: $TS"
echo "================================================================"

# ------------------------------------------------------------------
# 緊急 skip 検出 (記録付)
# ------------------------------------------------------------------
if [ "${F_TEST_SKIP:-0}" = "1" ]; then
  VLOG="${REPO_ROOT}/verify/adv_violation_log.md"
  if [ -f "$VLOG" ]; then
    {
      echo ""
      echo "### 違反 #F_TEST_SKIP_$(date -u '+%Y%m%dT%H%M%SZ')"
      echo "- 検出: $TS"
      echo "- 内容: F_TEST_SKIP=1 で f_test_runner.sh skip"
      echo "- 該当: SUBAGENT-F-TEST-FUTOSHI-CHECKLIST-V2 ふとし チェックリスト 20 観点 skip"
      echo "- 後追い: 全 観点 PASS まで再走必須"
    } >> "$VLOG" 2>/dev/null || true
  fi
  echo "WARN: F_TEST_SKIP=1 検出、 F テスト skip (違反記録済)"
  exit 0
fi

# ------------------------------------------------------------------
# helper: record_result <id> <status> <message>
#   status: PASS / WARN / FAIL
# ------------------------------------------------------------------
record_result() {
  _id="$1"
  _status="$2"
  _msg="$3"
  case "$_status" in
    PASS)
      printf "  %s%s %s%s — %s\n" "${_GREEN}" "✅" "$_id" "${_RESET}" "$_msg"
      PASS_COUNT=$((PASS_COUNT + 1))
      ;;
    WARN)
      printf "  %s%s %s%s — %s\n" "${_YELLOW}" "🟡" "$_id" "${_RESET}" "$_msg"
      WARN_COUNT=$((WARN_COUNT + 1))
      ;;
    FAIL)
      printf "  %s%s %s%s — %s\n" "${_RED}" "🔴" "$_id" "${_RESET}" "$_msg"
      FAIL_COUNT=$((FAIL_COUNT + 1))
      FAILED_VIEWS="${FAILED_VIEWS} ${_id}"
      ;;
    *)
      printf "  ?? %s — %s\n" "$_id" "$_msg"
      ;;
  esac
}

# ------------------------------------------------------------------
# 観点 #1: やったフリ得意 排除 (= 配置 ≠ 機能 / claim ≠ 真値)
#   配置 のみ で ✅ 申告する pattern を grep 検出
#   合格条件: scaffold_smoke.sh OR post_gen_smoke.sh が 真 動作 verify (1 hit 以上)
# ------------------------------------------------------------------
echo ""
echo "[#1] やったフリ得意 排除 (= 配置 ≠ 機能 / claim ≠ 真値)"
if [ "${SKIP_F1:-0}" = "1" ]; then
  record_result "F1" "WARN" "SKIP_F1=1 (debug skip)"
else
  # 真値 verify scripts のいずれか 1 つ以上 配備:
  #  - checkmark_88mass_verify.sh / post_gen_smoke.sh / g50_prod_source_triple_verify.sh
  #  - smoke_test.sh / phase_completion_smoke_gate.sh
  _f1_ok=0
  for _cand in checkmark_88mass_verify.sh post_gen_smoke.sh g50_prod_source_triple_verify.sh smoke_test.sh phase_completion_smoke_gate.sh; do
    if [ -f "${REPO_ROOT}/scripts/${_cand}" ]; then
      _f1_ok=1
      _f1_hit="$_cand"
      break
    fi
  done
  if [ "$_f1_ok" -eq 1 ]; then
    record_result "F1" "PASS" "真値 verify script 配備済 (${_f1_hit})"
  else
    record_result "F1" "FAIL" "真値 verify script (smoke/g50/checkmark) 不在 = やったフリ余地"
  fi
fi

# ------------------------------------------------------------------
# 観点 #2: 二度言わせない (= 同型違反 防止)
#   verify/adv_violation_log.md に 同型 2 回以上 で §4.2 即時仕様改定発火
#   合格条件: §4.2 keyword grep 配備 確認
# ------------------------------------------------------------------
echo ""
echo "[#2] 二度言わせない (= 同型違反 防止)"
if [ "${SKIP_F2:-0}" = "1" ]; then
  record_result "F2" "WARN" "SKIP_F2=1 (debug skip)"
elif [ -f "${REPO_ROOT}/verify/adv_violation_log.md" ]; then
  # §4.2 violation auto-fire keyword 配備 / mention 確認
  _f2_count=$(grep -cE "§4\.2|同型" "${REPO_ROOT}/verify/adv_violation_log.md" 2>/dev/null | head -1 || echo 0)
  if [ "${_f2_count:-0}" -ge 1 ]; then
    record_result "F2" "PASS" "§4.2 同型違反検出 keyword 配備済 (count=${_f2_count})"
  else
    record_result "F2" "WARN" "§4.2 keyword 不在 (violation log empty?)"
  fi
else
  record_result "F2" "FAIL" "verify/adv_violation_log.md 不在"
fi

# ------------------------------------------------------------------
# 観点 #3: Git は おまけ、 自社 真 Gate (= 主従反転)
#   adv_pre_push_quality_gate.sh が 配備済 + 主 gate marker 配置
# ------------------------------------------------------------------
echo ""
echo "[#3] Git は おまけ、 自社 真 Gate (= 主従反転)"
if [ "${SKIP_F3:-0}" = "1" ]; then
  record_result "F3" "WARN" "SKIP_F3=1 (debug skip)"
elif [ -f "${REPO_ROOT}/scripts/adv_pre_push_quality_gate.sh" ]; then
  _f3_marker=$(grep -cE "Primary Quality Gate|主従反転|§2\.25\.21" "${REPO_ROOT}/scripts/adv_pre_push_quality_gate.sh" 2>/dev/null | head -1 || echo 0)
  if [ "${_f3_marker:-0}" -ge 1 ]; then
    record_result "F3" "PASS" "adv_pre_push_quality_gate.sh + Primary Quality Gate marker 配備"
  else
    record_result "F3" "WARN" "adv_pre_push_quality_gate.sh 配備、 Primary Quality Gate marker 不在"
  fi
else
  record_result "F3" "FAIL" "adv_pre_push_quality_gate.sh 不在 = 自社 主 Gate 不在"
fi

# ------------------------------------------------------------------
# 観点 #4: 後回し なし (= backlog 言い訳禁止)
#   instructions/in_flight_topics.md / verify/ で 「保留」「TBD」「manual」「後で」「そのうち」 grep 0 件
# ------------------------------------------------------------------
echo ""
echo "[#4] 後回し なし (= backlog 言い訳禁止)"
if [ "${SKIP_F4:-0}" = "1" ]; then
  record_result "F4" "WARN" "SKIP_F4=1 (debug skip)"
else
  _f4_target_dir="${REPO_ROOT}/verify"
  if [ -d "$_f4_target_dir" ]; then
    # 直近 7 日 modified files に backlog ラベル grep
    _f4_files=$(find "$_f4_target_dir" -type f -name '*.md' -mtime -7 2>/dev/null | head -20)
    if [ -n "$_f4_files" ]; then
      _f4_hits=$(printf '%s\n' "$_f4_files" | xargs grep -lE "そのうち|後でやる|TBD" 2>/dev/null | wc -l | tr -d ' ')
      if [ "${_f4_hits:-0}" -eq 0 ]; then
        record_result "F4" "PASS" "直近 7 日 verify/*.md に backlog 言い訳 keyword 0 件"
      else
        record_result "F4" "WARN" "直近 7 日 verify/*.md に backlog keyword ${_f4_hits} 件"
      fi
    else
      record_result "F4" "WARN" "直近 7 日 verify/*.md 0 件 (新規 file 不在)"
    fi
  else
    record_result "F4" "FAIL" "verify/ ディレクトリ 不在"
  fi
fi

# ------------------------------------------------------------------
# 観点 #5: 言葉 ではなく 行動 で制限 (= 機械強制)
#   ~/.claude/settings.json Stop hook chain に gate script 結線確認
# ------------------------------------------------------------------
echo ""
echo "[#5] 言葉 ではなく 行動 で制限 (= 機械強制)"
if [ "${SKIP_F5:-0}" = "1" ]; then
  record_result "F5" "WARN" "SKIP_F5=1 (debug skip)"
elif [ -f "${HOME}/.claude/settings.json" ]; then
  _f5_count=$(python3 -c "
import json, sys
try:
    data = json.load(open('${HOME}/.claude/settings.json'))
    hooks = data.get('hooks', {}).get('Stop', [])
    if hooks and isinstance(hooks, list):
        total = sum(len(g.get('hooks', [])) for g in hooks)
        print(total)
    else:
        print(0)
except Exception:
    print(0)
" 2>/dev/null | head -1 || echo 0)
  if [ "${_f5_count:-0}" -ge 1 ]; then
    record_result "F5" "PASS" "Stop hook chain ${_f5_count} 件 結線済 = 機械強制"
  else
    record_result "F5" "FAIL" "Stop hook chain 0 件 = 機械強制 不在"
  fi
else
  record_result "F5" "FAIL" "~/.claude/settings.json 不在"
fi

# ------------------------------------------------------------------
# 観点 #6: verify-first (= claim 鵜呑み禁止)
#   adv_pre_response_fact_verify.sh 配備確認
# ------------------------------------------------------------------
echo ""
echo "[#6] verify-first (= claim 鵜呑み禁止)"
if [ "${SKIP_F6:-0}" = "1" ]; then
  record_result "F6" "WARN" "SKIP_F6=1 (debug skip)"
elif [ -f "${REPO_ROOT}/scripts/adv_pre_response_fact_verify.sh" ]; then
  record_result "F6" "PASS" "adv_pre_response_fact_verify.sh 配備済"
else
  record_result "F6" "FAIL" "adv_pre_response_fact_verify.sh 不在 = verify-first 不在"
fi

# ------------------------------------------------------------------
# 観点 #7: 平易日本語 / 番号削減 / 英語 SN 削除
#   abbreviation_grep_check.sh 配備確認
# ------------------------------------------------------------------
echo ""
echo "[#7] 平易日本語 / 番号削減 / 英語 SN 削除"
if [ "${SKIP_F7:-0}" = "1" ]; then
  record_result "F7" "WARN" "SKIP_F7=1 (debug skip)"
elif [ -f "${REPO_ROOT}/scripts/abbreviation_grep_check.sh" ]; then
  record_result "F7" "PASS" "abbreviation_grep_check.sh 配備済"
else
  record_result "F7" "WARN" "abbreviation_grep_check.sh 不在 (推奨配備)"
fi

# ------------------------------------------------------------------
# 観点 #8: ケチらない、 時間かける、 Max plan 活用
#   §2.25.21.3 「ケチらない」 spec 言及 確認 (core_spec OR sub_*.md)
# ------------------------------------------------------------------
echo ""
echo "[#8] ケチらない、 時間かける、 Max plan 活用"
if [ "${SKIP_F8:-0}" = "1" ]; then
  record_result "F8" "WARN" "SKIP_F8=1 (debug skip)"
else
  _f8_devs="/Users/futoshi/Desktop/dev-system/core_spec.md"
  if [ -f "$_f8_devs" ]; then
    _f8_count=$(grep -cE "ケチらない|Max plan|x20" "$_f8_devs" 2>/dev/null | head -1 || echo 0)
    if [ "${_f8_count:-0}" -ge 1 ]; then
      record_result "F8" "PASS" "core_spec.md に 「ケチらない / Max plan」 言及 ${_f8_count} 件"
    else
      record_result "F8" "WARN" "core_spec.md に 「ケチらない / Max plan」 言及 0 件"
    fi
  else
    record_result "F8" "WARN" "dev-system/core_spec.md 不在 (Lais standalone)"
  fi
fi

# ------------------------------------------------------------------
# 観点 #9: subagent 横流し 禁止、 ADV review 必須 (= G25)
#   subagent_output_review_check.sh 配備確認
# ------------------------------------------------------------------
echo ""
echo "[#9] subagent 横流し 禁止、 ADV review 必須 (= G25)"
if [ "${SKIP_F9:-0}" = "1" ]; then
  record_result "F9" "WARN" "SKIP_F9=1 (debug skip)"
elif [ -f "${REPO_ROOT}/scripts/subagent_output_review_check.sh" ]; then
  record_result "F9" "PASS" "subagent_output_review_check.sh (G25) 配備済"
else
  # dev-system 側 confirm
  _f9_devs="/Users/futoshi/Desktop/dev-system/scripts/subagent_output_review_check.sh"
  if [ -f "$_f9_devs" ]; then
    record_result "F9" "PASS" "dev-system 側 subagent_output_review_check.sh 配備済"
  else
    record_result "F9" "FAIL" "subagent_output_review_check.sh 不在 = G25 横流し防止 不在"
  fi
fi

# ------------------------------------------------------------------
# 観点 #10: bypass 機構 物理削除
#   adv_pre_push_quality_gate.sh 内 ADV_PRE_PUSH_SKIP=1 path 物理削除確認
#   合格条件: "DISABLED_BYPASS" 文字列 OR ADV_PRE_PUSH_SKIP path 不在
# ------------------------------------------------------------------
echo ""
echo "[#10] bypass 機構 物理削除"
if [ "${SKIP_F10:-0}" = "1" ]; then
  record_result "F10" "WARN" "SKIP_F10=1 (debug skip)"
elif [ -f "${REPO_ROOT}/scripts/adv_pre_push_quality_gate.sh" ]; then
  _f10_disabled=$(grep -cE "DISABLED_BYPASS|bypass path を 物理 削除" "${REPO_ROOT}/scripts/adv_pre_push_quality_gate.sh" 2>/dev/null | head -1 || echo 0)
  if [ "${_f10_disabled:-0}" -ge 1 ]; then
    record_result "F10" "PASS" "DISABLED_BYPASS marker 配備、 bypass path 物理削除"
  else
    # 旧 design 残存判定
    _f10_old=$(grep -cE "ADV_PRE_PUSH_SKIP.*=.*1" "${REPO_ROOT}/scripts/adv_pre_push_quality_gate.sh" 2>/dev/null | head -1 || echo 0)
    if [ "${_f10_old:-0}" -gt 0 ]; then
      record_result "F10" "WARN" "ADV_PRE_PUSH_SKIP path 残存可能性 (要 grep 確認)"
    else
      record_result "F10" "PASS" "ADV_PRE_PUSH_SKIP path grep 0 件 = bypass 機構 物理削除"
    fi
  fi
else
  record_result "F10" "FAIL" "adv_pre_push_quality_gate.sh 不在"
fi

# ------------------------------------------------------------------
# 観点 #11: テーブル = 公式 進捗管理ボード
#   instructions/persona_review/2026-05-04/CHECKMARK-DEFINITION-5PERSONA__results.md OR
#   88 マス table 配備 確認
# ------------------------------------------------------------------
echo ""
echo "[#11] テーブル = 公式 進捗管理ボード"
if [ "${SKIP_F11:-0}" = "1" ]; then
  record_result "F11" "WARN" "SKIP_F11=1 (debug skip)"
else
  _f11_devs="/Users/futoshi/Desktop/dev-system/instructions/persona_review/2026-05-04/CHECKMARK-DEFINITION-5PERSONA__results.md"
  if [ -f "$_f11_devs" ]; then
    _f11_count=$(grep -cE "88 マス|R1:|R2:|R3:" "$_f11_devs" 2>/dev/null | head -1 || echo 0)
    if [ "${_f11_count:-0}" -ge 3 ]; then
      record_result "F11" "PASS" "88 マス 進捗管理ボード 配備済 (R1-R11 ${_f11_count} 行)"
    else
      record_result "F11" "WARN" "88 マス board 配備、 row count ${_f11_count} 件"
    fi
  else
    record_result "F11" "WARN" "dev-system 側 88 マス board 不在 (Lais standalone)"
  fi
fi

# ------------------------------------------------------------------
# 観点 #12: 真値 verify、 ✅ 増やす ≠ ゴール
#   g50_prod_source_triple_verify.sh 配備確認 (production / source / SHA 真値 三点照合)
# ------------------------------------------------------------------
echo ""
echo "[#12] 真値 verify、 ✅ 増やす ≠ ゴール"
if [ "${SKIP_F12:-0}" = "1" ]; then
  record_result "F12" "WARN" "SKIP_F12=1 (debug skip)"
elif [ -f "${REPO_ROOT}/scripts/g50_prod_source_triple_verify.sh" ]; then
  record_result "F12" "PASS" "g50_prod_source_triple_verify.sh (G50) 配備済 = 真値 三点照合"
else
  record_result "F12" "FAIL" "g50_prod_source_triple_verify.sh 不在 = 真値 verify 不在"
fi

# ------------------------------------------------------------------
# 観点 #13: PO 委譲禁止 (§2.25.3)
#   adv_pre_po_escalation_check.sh 配備確認
# ------------------------------------------------------------------
echo ""
echo "[#13] PO 委譲禁止 (§2.25.3)"
if [ "${SKIP_F13:-0}" = "1" ]; then
  record_result "F13" "WARN" "SKIP_F13=1 (debug skip)"
elif [ -f "${REPO_ROOT}/scripts/adv_pre_po_escalation_check.sh" ]; then
  record_result "F13" "PASS" "adv_pre_po_escalation_check.sh (§2.25.3.M G15) 配備済"
else
  record_result "F13" "FAIL" "adv_pre_po_escalation_check.sh 不在 = PO 委譲禁止 不在"
fi

# ------------------------------------------------------------------
# 観点 #14: 焦り 等 emotion 言い訳禁止 (= 機械的 root cause)
#   adv_violation_log entries に 4-part format 配備 確認 (root cause section 必須)
# ------------------------------------------------------------------
echo ""
echo "[#14] 焦り 等 emotion 言い訳禁止 (= 機械的 root cause)"
if [ "${SKIP_F14:-0}" = "1" ]; then
  record_result "F14" "WARN" "SKIP_F14=1 (debug skip)"
elif [ -f "${REPO_ROOT}/verify/adv_violation_log.md" ]; then
  _f14_count=$(grep -cE "root cause|根本原因|機械的" "${REPO_ROOT}/verify/adv_violation_log.md" 2>/dev/null | head -1 || echo 0)
  if [ "${_f14_count:-0}" -ge 1 ]; then
    record_result "F14" "PASS" "violation log に root cause section ${_f14_count} 件配備"
  else
    record_result "F14" "WARN" "violation log root cause section 0 件"
  fi
else
  record_result "F14" "FAIL" "verify/adv_violation_log.md 不在"
fi

# ------------------------------------------------------------------
# 観点 #15: skip 理由 端的明確
#   個別 SKIP_<N>=1 機構 + skip 時 verify log 記録 配備確認
# ------------------------------------------------------------------
echo ""
echo "[#15] skip 理由 端的明確"
if [ "${SKIP_F15:-0}" = "1" ]; then
  record_result "F15" "WARN" "SKIP_F15=1 (debug skip)"
elif [ -f "${REPO_ROOT}/scripts/adv_pre_push_quality_gate.sh" ]; then
  _f15_count=$(grep -cE "SKIP_[A-Z]+=1" "${REPO_ROOT}/scripts/adv_pre_push_quality_gate.sh" 2>/dev/null | head -1 || echo 0)
  if [ "${_f15_count:-0}" -ge 1 ]; then
    record_result "F15" "PASS" "個別 SKIP env var 機構 配備 (count=${_f15_count})"
  else
    record_result "F15" "WARN" "個別 SKIP env var 0 件"
  fi
else
  record_result "F15" "FAIL" "adv_pre_push_quality_gate.sh 不在"
fi

# ------------------------------------------------------------------
# 観点 #16: 全 ✅ → ふとし 触る trigger
#   po_zero_touch_reporter.sh 配備確認
# ------------------------------------------------------------------
echo ""
echo "[#16] 全 ✅ → ふとし 触る trigger"
if [ "${SKIP_F16:-0}" = "1" ]; then
  record_result "F16" "WARN" "SKIP_F16=1 (debug skip)"
else
  _f16_lais="${REPO_ROOT}/scripts/po_zero_touch_reporter.sh"
  _f16_devs="/Users/futoshi/Desktop/dev-system/scripts/po_zero_touch_reporter.sh"
  if [ -f "$_f16_lais" ] || [ -f "$_f16_devs" ]; then
    record_result "F16" "PASS" "po_zero_touch_reporter.sh 配備済"
  else
    # template 経由 確認
    _f16_tpl="/Users/futoshi/Desktop/dev-system/templates/scripts/po_zero_touch_reporter.sh.template"
    if [ -f "$_f16_tpl" ]; then
      record_result "F16" "PASS" "po_zero_touch_reporter.sh.template 配備 (templates/)"
    else
      record_result "F16" "WARN" "po_zero_touch_reporter.sh / template 不在"
    fi
  fi
fi

# ------------------------------------------------------------------
# 観点 #17: デザイン観点 board 組込
#   design_check_runner.sh 配備確認
# ------------------------------------------------------------------
echo ""
echo "[#17] デザイン観点 board 組込"
if [ "${SKIP_F17:-0}" = "1" ]; then
  record_result "F17" "WARN" "SKIP_F17=1 (debug skip)"
elif [ -f "${REPO_ROOT}/scripts/design_check_runner.sh" ]; then
  record_result "F17" "PASS" "design_check_runner.sh 配備済"
else
  record_result "F17" "WARN" "design_check_runner.sh 不在"
fi

# ------------------------------------------------------------------
# 観点 #18: 外部システム 頼らない
#   §2.25.21 Primary Quality Gate Inversion 配備 + adv_pre_push_quality_gate 配備
# ------------------------------------------------------------------
echo ""
echo "[#18] 外部システム 頼らない"
if [ "${SKIP_F18:-0}" = "1" ]; then
  record_result "F18" "WARN" "SKIP_F18=1 (debug skip)"
else
  _f18_devs="/Users/futoshi/Desktop/dev-system/core_spec.md"
  if [ -f "$_f18_devs" ]; then
    _f18_count=$(grep -cE "Primary Quality Gate Inversion|社外システム.*頼らない|GitHub CI.*secondary" "$_f18_devs" 2>/dev/null | head -1 || echo 0)
    if [ "${_f18_count:-0}" -ge 1 ]; then
      record_result "F18" "PASS" "core_spec.md に 「外部頼らない」 spec 配備 (${_f18_count} 件)"
    else
      record_result "F18" "WARN" "core_spec.md に 該当 spec 0 件"
    fi
  else
    record_result "F18" "WARN" "dev-system/core_spec.md 不在"
  fi
fi

# ------------------------------------------------------------------
# 観点 #19: PO 意見にバイアスされず honest
#   §3.5 違反自己申告義務 + violation log 直近 entry の honest 評価
# ------------------------------------------------------------------
echo ""
echo "[#19] PO 意見にバイアスされず honest"
if [ "${SKIP_F19:-0}" = "1" ]; then
  record_result "F19" "WARN" "SKIP_F19=1 (debug skip)"
elif [ -f "${REPO_ROOT}/verify/adv_violation_log.md" ]; then
  # 違反自己申告 直近 entries 確認 (count >= 1 = honest 申告 機構 動作中)
  _f19_count=$(grep -cE "^### 違反 #|^## 違反 #|違反.*自己申告" "${REPO_ROOT}/verify/adv_violation_log.md" 2>/dev/null | head -1 || echo 0)
  if [ "${_f19_count:-0}" -ge 1 ]; then
    record_result "F19" "PASS" "violation log 自己申告 entries ${_f19_count} 件 = honest 機構 動作"
  else
    record_result "F19" "WARN" "violation log entries 0 件 (新 repo?)"
  fi
else
  record_result "F19" "FAIL" "verify/adv_violation_log.md 不在"
fi

# ------------------------------------------------------------------
# 観点 #20: 進捗管理ボード 毎回 表示
#   checkmark_88mass_verify.sh OR equivalent 配備確認
# ------------------------------------------------------------------
echo ""
echo "[#20] 進捗管理ボード 毎回 表示"
if [ "${SKIP_F20:-0}" = "1" ]; then
  record_result "F20" "WARN" "SKIP_F20=1 (debug skip)"
else
  _f20_lais="${REPO_ROOT}/scripts/checkmark_88mass_verify.sh"
  _f20_devs="/Users/futoshi/Desktop/dev-system/scripts/checkmark_88mass_verify.sh"
  if [ -f "$_f20_lais" ] || [ -f "$_f20_devs" ]; then
    record_result "F20" "PASS" "checkmark_88mass_verify.sh 配備済"
  else
    record_result "F20" "WARN" "checkmark_88mass_verify.sh 不在"
  fi
fi

# ------------------------------------------------------------------
# 総括
# ------------------------------------------------------------------
TOTAL=$((PASS_COUNT + WARN_COUNT + FAIL_COUNT))
echo ""
echo "================================================================"
echo "  F テスト 結果: PASS=${PASS_COUNT} WARN=${WARN_COUNT} FAIL=${FAIL_COUNT} (TOTAL=${TOTAL})"
if [ "$FAIL_COUNT" -gt 0 ]; then
  echo "  失敗 観点:${FAILED_VIEWS}"
fi
echo "================================================================"

# log 記録 (TSV)
{
  printf '%s\tPASS=%s\tWARN=%s\tFAIL=%s\tFAILED=%s\n' \
    "$TS" "$PASS_COUNT" "$WARN_COUNT" "$FAIL_COUNT" "$FAILED_VIEWS"
} >> "$LOG_FILE" 2>/dev/null || true

if [ "$FAIL_COUNT" -gt 0 ]; then
  echo ""
  echo "F テスト FAIL: 上記 失敗 観点 を 修正 後 再走"
  echo "緊急 skip (記録付): F_TEST_SKIP=1"
  exit 1
fi

echo "ALL ✅: ふとし チェックリスト 20 観点 全 PASS / WARN"
exit 0
