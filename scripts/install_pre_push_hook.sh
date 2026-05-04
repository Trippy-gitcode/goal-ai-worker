#!/bin/sh
# scripts/install_pre_push_hook.sh — pre-push hook installer
#
# 根拠:
#   - SUBAGENT-DEVSYS-PRE-PUSH-QUALITY-GATE-SCRIPT-V3
#   - core_spec.md §3.14 + §2.25.21
#   - PO 直命 2026-05-04
#
# 動作: .git/hooks/pre-push を上書き、 a-e 5 chain quality gate を hook chain に追加
#
# 起動: sh scripts/install_pre_push_hook.sh

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOK_PATH="${REPO_ROOT}/.git/hooks/pre-push"

cat > "$HOOK_PATH" <<'HOOK_EOF'
#!/bin/bash
# dev-system v3.4 — pre-push hook (PRE-PUSH-QUALITY-GATE-V3 拡張)
# 根拠:
#   - lais/verify/dev_system_v34_package.md §6.12 / §2.14 εcrit' / §2.24 θG13
#   - PO 直命 (2026-05-04): 「Git を Gate にしないで。 自社テストで 通るのが当たり前」
#   - core_spec.md §3.14 + §2.25.21 ADV 押す前 必須 quality gate
#   - SUBAGENT-DEVSYS-PRE-PUSH-QUALITY-GATE-SCRIPT-V3
#
# 実行内容:
#   1. shellcheck_lint.sh — POSIX sh 互換静的検査（§2.14）
#   2. verify_hooks.sh   — pre-commit hook 発火確認（§2.24 θG13 / G13、PATCH-19 Bug E）
#   3. adv_pre_push_quality_gate.sh — ADV 押す前 a-e 5 chain 必須 (§3.14 + §2.25.21)
#
# PO 直命 (2026-05-04): SKIP_PRE_PUSH + ADV_PRE_PUSH_SKIP env bypass 物理削除、 strict mode 完全化。
# 旧 = env 1 で 全 hook skip 可 = やったフリ default。 新 = bypass 経路 0、 真の修正必須。

FAIL=0
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"

# 1. shellcheck_lint.sh
if [ -x "${REPO_ROOT}/scripts/shellcheck_lint.sh" ]; then
  if ! (cd "$REPO_ROOT" && bash scripts/shellcheck_lint.sh); then
    echo "FAIL: shellcheck_lint (§2.14 εcrit')"
    FAIL=1
  fi
fi

# 2. verify_hooks.sh
if [ -x "${REPO_ROOT}/scripts/verify_hooks.sh" ]; then
  if ! (cd "$REPO_ROOT" && bash scripts/verify_hooks.sh); then
    echo "FAIL: G13 verify_hooks — pre-commit バイパス検出（§2.24 θG13）"
    FAIL=1
  fi
fi

# 3. adv_pre_push_quality_gate.sh — a-e 5 chain (新設 V3)
if [ -x "${REPO_ROOT}/scripts/adv_pre_push_quality_gate.sh" ]; then
  if ! (cd "$REPO_ROOT" && sh scripts/adv_pre_push_quality_gate.sh); then
    echo "FAIL: adv_pre_push_quality_gate (§3.14 + §2.25.21 a-e 5 chain)"
    FAIL=1
  fi
fi

if [ $FAIL -ne 0 ]; then
  echo ""
  echo "Pre-push check FAILED. 上記 fail step を修正後 再走。 bypass 経路 0 = 真の修正必須。"
  exit 1
fi

exit 0
HOOK_EOF

chmod +x "$HOOK_PATH"
echo "[install] $HOOK_PATH installed + chmod +x done"
