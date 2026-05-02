#!/bin/sh
# scripts/adv_pre_po_escalation_check.sh — PO escalation 前 mechanical 検証 gate
#
# 根拠:
#   - PO 直命 (2026-05-02): 「私に依頼する前には必ず、 本当に私じゃないとできないか
#     チェックすることを機械的に検証して」
#   - core_spec.md §2.25.3 PO 委譲禁止 (本 script 配備により mechanical 強制化)
#   - core_spec.md §3.5 違反自己申告義務 (本 script で PASS しない escalation は §2.25.3 違反)
#
# 使い方:
#   sh scripts/adv_pre_po_escalation_check.sh "<escalation 件名>" "<根拠 1 行>"
#
# return:
#   exit 0 = mechanical 検証 PASS、 PO escalation OK (= 真に PO じゃないと不能)
#   exit 1 = mechanical 検証 FAIL、 ADV 自律で実行可能、 escalation 禁止
#
# 検証項目 (1 つでも YES なら PO escalation OK = exit 0):
#   1. cost-monthly: 月額コスト > ¥0 が発生するか (新 SaaS 契約 / 課金 plan upgrade 等)
#   2. business-strategy: 事業戦略 / 配信地域 / 法人形態 等の business judgment 必要か
#   3. po-personal-info: PO 自身の personal info (住所 / 電話 / 本名 等) 公開判断必要か
#   4. physical-access: PO 物理機 (Mac / iPhone) の System Settings / 2FA dashboard click 必要か
#   5. legal-final-wording: 法務 確定 wording (placeholder で先行可能なものは NO)
#
# 上記 5 項目すべて NO なら ADV 自律可能、 escalation FAIL exit 1。

set -eu

if [ $# -lt 2 ]; then
  cat <<EOF >&2
Usage: $0 "<escalation 件名>" "<根拠 1 行>"

PO escalation 前に必ず本 script を通す。 5 項目検証で 1 つも YES が無ければ exit 1。

Examples:
  PASS (cost):    sh $0 "GH Pro 課金で branch protection" "月 \$4 cost = #1 YES"
  PASS (TCC):     sh $0 "launchd TCC 解除" "PO Mac System Settings 物理操作必須 = #4 YES"
  FAIL (DPA):     sh $0 "Sub-processor DPA 取得" "公開 template 8 vendor 全 ADV fetch 可 = 全 NO"
EOF
  exit 1
fi

TITLE="$1"
RATIONALE="$2"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ADV pre-PO-escalation check (§2.25.3 mechanical gate)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Title:     $TITLE"
echo "Rationale: $RATIONALE"
echo ""

# 5 検証項目を rationale で keyword grep
PASS=0
REASONS=""

if echo "$RATIONALE" | grep -qiE "cost|月額|円/月|\\\$[0-9]|JPY|有料|課金|料金|subscription"; then
  PASS=$((PASS + 1))
  REASONS="${REASONS}\n  ✓ #1 cost-monthly: 月額コスト発生 keyword hit"
fi

if echo "$RATIONALE" | grep -qiE "business|戦略|事業判断|配信地域|法人形態|brand|strategy|business judgment"; then
  PASS=$((PASS + 1))
  REASONS="${REASONS}\n  ✓ #2 business-strategy: business judgment keyword hit"
fi

if echo "$RATIONALE" | grep -qiE "personal info|本名|住所|電話|個人情報.*公開|代表者公開|tokushoho|特商法.*個人"; then
  PASS=$((PASS + 1))
  REASONS="${REASONS}\n  ✓ #3 po-personal-info: PO 個人情報公開 keyword hit"
fi

if echo "$RATIONALE" | grep -qiE "TCC|System Settings|2FA|dashboard click|physical access|物理操作|Privacy.*Security.*Full Disk|System Preferences"; then
  PASS=$((PASS + 1))
  REASONS="${REASONS}\n  ✓ #4 physical-access: PO 物理機 操作 keyword hit"
fi

if echo "$RATIONALE" | grep -qiE "法務|legal final|wording 確定|legal review.*final|attorney|弁護士.*確認"; then
  PASS=$((PASS + 1))
  REASONS="${REASONS}\n  ✓ #5 legal-final-wording: 法務 確定 wording keyword hit"
fi

echo "Verification result: $PASS / 5 keyword-based checks passed"
printf '%b\n' "$REASONS"
echo ""

if [ "$PASS" -ge 1 ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ PASS: PO escalation OK (真に PO 必要、 §2.25.3 違反なし)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
fi

cat <<EOF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛑 FAIL: ADV 自律可能と判定、 PO escalation 禁止 (§2.25.3 違反)

5 検証項目すべて NO = 以下のいずれにも該当しない:
  #1 cost-monthly      : 月額コスト発生
  #2 business-strategy : 事業/法人/戦略 judgment
  #3 po-personal-info  : PO 個人情報公開判断
  #4 physical-access   : PO 物理機 (Mac System Settings 等)
  #5 legal-final-wording: 法務 確定 wording (placeholder 先行不可)

→ ADV が以下を試行すべき:
  (a) 公開 template / API / docs を ADV fetch 可能か grep で検証
  (b) UI / DDL scaffold で先行できるか (PO は最終 confirmation のみ)
  (c) interim mitigation (要件回避策) で当面しのげるか
  (d) 1 つでも yes なら subagent dispatch で ADV 自律実行

検証 keyword (rationale に含まれていれば PASS):
  #1: cost / 月額 / 円/月 / \$N / JPY / 有料 / 課金 / 料金 / subscription
  #2: business / 戦略 / 事業判断 / 配信地域 / 法人形態 / strategy
  #3: personal info / 本名 / 住所 / 電話 / 個人情報.*公開 / 代表者公開 / 特商法.*個人
  #4: TCC / System Settings / 2FA / dashboard click / physical access / 物理操作
  #5: 法務 / legal final / wording 確定 / legal review.*final / 弁護士.*確認

rationale を上記 keyword を含めるか、 ADV 自律実行に切替えてください。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
exit 1
