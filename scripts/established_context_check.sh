#!/bin/sh
# GENERATED: DO NOT MODIFY directly (本ファイルは dev-system templates/ 由来)
# templates/scripts/established_context_check.sh.template
# spec-ref: core_spec.md §2.25.11 確立済 context grep gate (G23)
#
# scripts/established_context_check.sh — G23: ADV response 前 確立済 context 失念 防止 gate
#
# 根拠:
#   - 違反 #38 / #39 / #40 (2026-05-02): ADV が確立済 context (technical 方針 /
#     rotation 履歴 / 権限境界) を 失念して response → 同型 violations 連発
#   - PO 直命 2026-05-02「違反したことは機械的に次から防ぐよう開発システムの
#     仕様化して運用」 = 自己想起頼みの「気を付ける」 排除、 mechanical 化
#
# 動作:
#   引数 file (ADV draft response) を受取り、 以下 4 領域 を grep + summary 整合 check:
#     1. docs/po-decisions.md の PO-DIRECTIVE / PD entries との矛盾 check
#     2. instructions/session_progress.md 直近 update との時系列整合 check
#     3. 確立済技術方針 (旧 vendor key 名 / API version pin / rotation 履歴) check
#     4. 権限境界 (真 PO-only boundary) check
#   1 件でも矛盾 hit したら exit 1 + 修正案を出力。
#
# 使い方:
#   sh scripts/established_context_check.sh <draft_file>
#
# 起動 timing:
#   ADV 自身が PO 向け response 送信前 self-check (§2.25.11 mandatory)
#
# bypass: 真 §4 escalation legitimate (mechanical check PASS 済) は
#   ESTABLISHED_CONTEXT_BYPASS=1 環境変数で skip 可、 但し bypass 理由を
#   verify/adv_violation_log.md に即記録 義務発生。

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# bypass: legitimate escalation 経由なら skip
if [ "${ESTABLISHED_CONTEXT_BYPASS:-0}" = "1" ]; then
  echo "INFO: G23 bypass via ESTABLISHED_CONTEXT_BYPASS=1 (verify/adv_violation_log.md 記録 義務)"
  exit 0
fi

# 引数 check
if [ $# -lt 1 ] || [ ! -f "$1" ]; then
  echo "Usage: $0 <draft_file>" >&2
  exit 2
fi

DRAFT_FILE="$1"
DRAFT=$(cat "$DRAFT_FILE")

[ -z "$DRAFT" ] && exit 0

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  G23 確立済 context grep gate"
echo "  (違反 #38/#39/#40 再発防止、 §2.25.11 mechanical)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

VIOLATIONS=""
HIT_COUNT=0

# 領域 1: 旧 vendor key 名 (anon / service_role) → 新方式 (sb_publishable / sb_secret)
# 矛盾 check: draft 内に 旧 key 名 単独使用 (新方式 への migration 文脈なし) があれば WARN
if echo "$DRAFT" | grep -qE "(\banon\b|\bservice_role\b)" 2>/dev/null; then
  if ! echo "$DRAFT" | grep -qE "(sb_publishable|sb_secret|新方式|migration)" 2>/dev/null; then
    VIOLATIONS="${VIOLATIONS}
  - 領域 1: 旧 vendor key 名 (anon / service_role) を新方式 (sb_publishable / sb_secret) 言及なしで使用、 確立済技術方針と矛盾の可能性"
    HIT_COUNT=$((HIT_COUNT + 1))
  fi
fi

# 領域 2: 「rotation 必要」 系 → 過去履歴 grep で 既完了か confirm
if echo "$DRAFT" | grep -qE "(rotation 必要|key 更新 必要|reset 必要|再生成 必要)" 2>/dev/null; then
  # docs/po-decisions.md / instructions/session_progress.md に rotation 完了履歴あるか check
  ROTATION_DONE=0
  if [ -f docs/po-decisions.md ]; then
    if grep -qE "(rotation 完了|rotated|key 更新済|reset 完了)" docs/po-decisions.md 2>/dev/null; then
      ROTATION_DONE=1
    fi
  fi
  if [ -f instructions/session_progress.md ]; then
    if grep -qE "(rotation 完了|rotated|key 更新済|reset 完了)" instructions/session_progress.md 2>/dev/null; then
      ROTATION_DONE=1
    fi
  fi
  if [ "$ROTATION_DONE" = "1" ]; then
    VIOLATIONS="${VIOLATIONS}
  - 領域 2: draft が 'rotation 必要' 主張、 但し 過去履歴に rotation 完了 entry 存在、 既完了 vs 再要求 矛盾の可能性"
    HIT_COUNT=$((HIT_COUNT + 1))
  fi
fi

# 領域 3: 「PO 作業」 系 → 真 PO-only boundary check
# 真 PO-only = browser OAuth / 物理 access / cost / legal final / 個人情報 のみ
if echo "$DRAFT" | grep -qE "(PO 作業|PO 側でやって|PO に お願い|PO さん 作業|PO 様 作業)" 2>/dev/null; then
  if ! echo "$DRAFT" | grep -qE "(browser|OAuth|物理 access|cost|legal|個人情報|月額|有料|ブランド)" 2>/dev/null; then
    VIOLATIONS="${VIOLATIONS}
  - 領域 3: draft が 'PO 作業' 主張、 但し 真 PO-only boundary (browser OAuth / 物理 access / cost / legal final / 個人情報) keyword 不在、 ADV 自走責務 escalation の可能性"
    HIT_COUNT=$((HIT_COUNT + 1))
  fi
fi

# 領域 4: 直近 session_progress.md update との 時系列整合 (簡易 check)
# draft が「未着手」「未完了」 主張 vs session_progress.md に「完了」 entry 存在
if echo "$DRAFT" | grep -qE "(未着手|未完了|未実施|未対応)" 2>/dev/null; then
  if [ -f instructions/session_progress.md ]; then
    # draft 内の主要 keyword (Phase X / TKT-X) を抽出して session_progress に「完了」 entry あるか check
    DRAFT_KEYWORDS=$(echo "$DRAFT" | grep -oE "(Phase [0-9]+|TKT-[A-Z0-9-]+|SUBAGENT-[A-Z0-9-]+)" | sort -u | head -5)
    if [ -n "$DRAFT_KEYWORDS" ]; then
      for kw in $DRAFT_KEYWORDS; do
        if grep -qE "${kw}.*(完了|completed|done|済)" instructions/session_progress.md 2>/dev/null; then
          VIOLATIONS="${VIOLATIONS}
  - 領域 4: draft が '${kw} 未着手/未完了' 主張、 但し session_progress.md に完了 entry 存在、 時系列矛盾の可能性"
          HIT_COUNT=$((HIT_COUNT + 1))
          break
        fi
      done
    fi
  fi
fi

# 結果出力
if [ "$HIT_COUNT" -gt 0 ]; then
  echo ""
  echo "G23 BLOCK: 確立済 context 矛盾 ${HIT_COUNT} 件 hit"
  printf "%b\n" "$VIOLATIONS"
  echo ""
  echo "対処:"
  echo "  1. 上記矛盾 review、 確立済 context (po-decisions.md / session_progress.md / 技術方針) 再 grep"
  echo "  2. draft 修正 (旧 keyword 削除 / 真 boundary 整合 / 時系列 修正)"
  echo "  3. 再度 $0 <draft_file> dispatch"
  echo "  4. 同型 違反 再発時 §3.5 自己申告 + §4.2 spec 改定 trigger"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi

echo ""
echo "G23 PASS: 確立済 context 矛盾 0 件"
echo "  - 領域 1 (vendor key): OK"
echo "  - 領域 2 (rotation 履歴): OK"
echo "  - 領域 3 (真 PO boundary): OK"
echo "  - 領域 4 (時系列整合): OK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
exit 0
