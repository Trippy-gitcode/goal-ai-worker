#!/bin/sh
# scripts/adv_hot_summary.sh
# MISSION-G49-PKG Phase 2.2（PD-111 §2.25.9-.14 機械ゲート）
#
# 用途:
#   SessionStart hook で `additionalContext` 注入し、ADV 起動時に
#   §2.25 ADV 行動規範 + §C0 起動時要約のホットサマリーを system prompt 末尾に注入。
#
# 設計（hook_capability_matrix.md §3.3 確定）:
#   - SessionStart hook stdout に {"additionalContext": "..."} JSON を出力可
#   - 既存 .claude/hooks/session-start-context.sh と同型の出力形式を採用
#   - §2.25 全 14 節 + §C0 全 8 節をホットサマリ化、暫定 30 行制約
#
# 引数:
#   --section §2.25 / --section §C0 / --section all（既定）
#   --raw（JSON ラップなしで本文のみ stdout）
#   --max-lines N（暫定 30、PO 検証で調整）
#
# 入力: stdin 不要（独立スクリプト）
# 出力: stdout に JSON or raw text
# 終了: 常に exit 0（fail-open、ホットサマリ生成失敗で起動を妨げない）
#
# 根拠:
#   - lais/verify/dev_system_v34_package.md §2.25 (L1183-L1465) / §C0 (L1532-L1582)
#   - docs/po-decisions.md PD-111
#   - evidence/MISSION-G49-PKG/PHASE2.1-RESEARCH/hook_capability_matrix.md §3.3

set -eu

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
PACKAGE_FILE="${REPO_ROOT}/lais/verify/dev_system_v34_package.md"

SECTION="all"
RAW=0
MAX_LINES=30

while [ $# -gt 0 ]; do
  case "$1" in
    --section) shift; SECTION="${1:-all}" ;;
    --raw) RAW=1 ;;
    --max-lines) shift; MAX_LINES="${1:-30}" ;;
    *) ;;
  esac
  shift || true
done

if [ ! -f "$PACKAGE_FILE" ]; then
  if [ "$RAW" -eq 1 ]; then
    echo "[adv_hot_summary] package file 不在: $PACKAGE_FILE"
  else
    printf '{"additionalContext":"[adv_hot_summary] package file 不在、サマリ未注入"}\n'
  fi
  exit 0
fi

# §2.25 ホットサマリ（要点圧縮）
SUMMARY_2_25="§2.25 ADVcrit ADV 行動規範（PD-111、違反時 BLOCK）:
.1 仕様書駆動原則（非交渉）/ .2 応答前 Self-Check 毎回 / .3 PO 判断必須=コスト/新プロセス/ブランドのみ / .4 リスク回避禁止 / .5 違反自己申告（事後義務、免罪符化禁止 §2.25.10）
.6 応答スタイル: 完了報告 3-5行、subagent 起動「起動: <name>」のみ / .7 勝手な命名禁止 / .8 違反 #1-#10 対応表
.9 PO 作業発生提案の事前ゲート: 「貼付」「起動」「判断仰ぎ」「タイミング」検出 + §2.25.3 メタタグ必須
.10 違反の事前回避: 「違反 #N として記録」のみ + 構造解消提案なし → BLOCK
.11 応答整合性: 直前 3 ターン矛盾時は撤回宣言「直前で X と言ったが、訂正します」必須
.12 外部権威ソース参照: claude/wrangler/supabase/stripe/playwright/anthropic 言及時、引用元 URL/コマンド出力/evidence ログ併記 or「未確認」明示
.13 ログ出力量制御: 完了報告 8 行超は WARN（PO 明示要求なし時）
.14 全応答ペルソナレビュー: 必須 3（LLM 応用設計者/プロンプトエンジニア/SW PM）+ 追加候補最大 3、応答末尾 [Review: N rounds, M personas] 必須"

# §C0 ホットサマリ
SUMMARY_C0="§C0 起動時要約（毎セッション必須 Read）:
.1 責務分担 PO/ADV/ENG / .2 必須 Read（役割別）/ .3 鉄則 Top5 / .4 G1-G17 ゲート / .5 5 状態 STATUS（PD-109）/ .6 証跡 SSOT パス / .7 PD 一覧 / .8 フロー → §C マップ"

# セクション選択
case "$SECTION" in
  "§2.25"|"2.25")
    BODY="$SUMMARY_2_25"
    ;;
  "§C0"|"C0")
    BODY="$SUMMARY_C0"
    ;;
  *)
    BODY="$SUMMARY_2_25

$SUMMARY_C0"
    ;;
esac

# 行数制限（暫定 MAX_LINES、PO 検証で調整）
TRIMMED=$(printf '%s\n' "$BODY" | head -n "$MAX_LINES")

if [ "$RAW" -eq 1 ]; then
  printf '%s\n' "$TRIMMED"
  exit 0
fi

# JSON エスケープ（python3 で安全に）
python3 - <<'PYEOF' "$TRIMMED"
import json, sys
body = sys.argv[1]
print(json.dumps({"additionalContext": body}, ensure_ascii=False))
PYEOF
exit 0
