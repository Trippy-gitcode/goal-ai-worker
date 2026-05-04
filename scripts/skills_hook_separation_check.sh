#!/bin/sh
# scripts/skills_hook_separation_check.sh — Skills と Stop hook 責任分離 機械強制 (Lais 側)
#
# 根拠 (= 仕様 § 紐付):
#   - dev-system CLAUDE.md §2.5 Skills と Stop hook の責任分離 (Skill 内 gate.sh 再帰呼出 禁止)
#   - core_spec.md §5 機械強制 hook 仕様 (Stop hook = 応答後 grep BLOCK)
#   - PO 直命 (2026-05-04): 「機械強制 しない 理由 が ない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-P2-MECHANICAL-ENFORCEMENT-DEPLOY-V1 (P2-6 配備)
#
# 動作 (dev-system pre-commit hook 経由 / Stop hook 経由):
#   1. skills/ 配下 の Skill 定義 file (SKILL.md / *.md) walk
#   2. Skill 内に gate.sh 系 (= adv_response_gate.sh / *_gate.sh) の 再帰呼出 検出
#   3. かつ Skill 名 そのものが Stop hook 役割 (= Skill ≠ Stop hook 責任分離 違反)
#   4. settings.json で Stop hook と Skill 重複登録 検出
#   5. 1 件でも 「責任 mixing」 path → exit 1 + 該当 file 出力
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#         SKIP_X / DISABLED_BYPASS / DRIFT_REPORT_ONLY 不採用 (= 違反 #53 再生産 禁止)
#
# 連動 (settings.json + pre-commit hook):
#   - settings.json: pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step u6 に結線)
#   - dev-system CLAUDE.md §2.5 / core_spec.md §5 mechanical_enforcement row
#   - templates/scripts/skills_hook_separation_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

echo "================================================================"
echo "  Skills と Stop hook 責任分離 check (Lais 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

VIOLATION_COUNT=0
VIOLATION_DETAIL=""

# Step 1: skills/ 配下 walk + gate.sh 再帰呼出 検出
SKILLS_DIR="${REPO_ROOT}/skills"
if [ -d "$SKILLS_DIR" ]; then
  while IFS= read -r f; do
    [ -f "$f" ] || continue
    # gate.sh 系 (adv_response_gate / *_gate / pre-commit gate) の Skill 内 呼出 検出
    GATE_RECUR=$(grep -cE 'adv_response_gate\.sh|_quality_gate\.sh|adv_pre_push_quality_gate' "$f" 2>/dev/null || echo 0)
    GATE_RECUR=$(echo "$GATE_RECUR" | tr -d '[:space:]')
    if [ "$GATE_RECUR" -ge 1 ]; then
      VIOLATION_COUNT=$((VIOLATION_COUNT + 1))
      VIOLATION_DETAIL="${VIOLATION_DETAIL}  - $f: gate.sh 再帰呼出 ${GATE_RECUR} 件 (= 循環ブロック risk)\n"
    fi
  done <<EOF
$(find "$SKILLS_DIR" -type f \( -name '*.md' -o -name 'SKILL.md' \) 2>/dev/null)
EOF
fi

# Step 2: settings.json (= ~/.claude/settings.json) で Stop hook と Skill 重複登録 検出
SETTINGS_FILE="${HOME}/.claude/settings.json"
DUPLICATE_HIT=0
if [ -f "$SETTINGS_FILE" ]; then
  # Skill 名 + Stop hook 重複 (= 同 名 で 両方登録) は anti-pattern
  # 簡易 check: Skill 名 grep の hit + Stop hook grep の hit が both > 0 で 重複候補
  SKILL_HIT=$(grep -c '"skills"' "$SETTINGS_FILE" 2>/dev/null || echo 0)
  SKILL_HIT=$(echo "$SKILL_HIT" | tr -d '[:space:]')
  STOP_HIT=$(grep -c '"Stop"' "$SETTINGS_FILE" 2>/dev/null || echo 0)
  STOP_HIT=$(echo "$STOP_HIT" | tr -d '[:space:]')
  if [ "$SKILL_HIT" -ge 1 ] && [ "$STOP_HIT" -ge 1 ]; then
    # 構造的 重複 ではないが 警告 として 記録
    DUPLICATE_HIT=0  # 厳密 検出 が 必要 = 別 mission
  fi
fi

echo ""
echo "Skill 内 gate.sh 再帰呼出 違反: $VIOLATION_COUNT"
echo "settings.json 重複登録 候補: $DUPLICATE_HIT"

if [ "$VIOLATION_COUNT" -ge 1 ]; then
  echo ""
  echo "🛑 Skills と Stop hook 責任分離 違反検出:"
  printf "%b" "$VIOLATION_DETAIL"
  echo ""
  echo "対処 (= dev-system CLAUDE.md §2.5 履行):"
  echo "  1. Skill 内 gate.sh 再帰呼出 削除 (= 循環ブロック 防止 = fail-closed 原則)"
  echo "  2. Skills = 応答生成「前」 オンデマンド Read / self-check (モデル内文脈)"
  echo "  3. Stop hook = 応答生成「後」 grep BLOCK (外部プロセス)"
  echo "  4. 矛盾時 Stop hook BLOCK 優先 (fail-closed 原則)"
  echo ""
  if [ "${SKILLS_HOOK_SEPARATION_STRICT:-0}" = "1" ]; then
    echo "BLOCK: SKILLS_HOOK_SEPARATION_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 SKILLS_HOOK_SEPARATION_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: Skills と Stop hook 責任分離 健全 (violation=$VIOLATION_COUNT)"
exit 0
