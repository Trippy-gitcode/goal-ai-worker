#!/bin/sh
# GENERATED: DO NOT MODIFY
# templates/scripts/install_post_deploy_hook.sh.template
#
# derived-from: SUBAGENT-DEVSYS-7PHASE-TEST-DEPLOY-V1 (PO 直命 2026-05-04 PO-DIRECTIVE-014)
# spec-ref: core_spec.md §2.25.21 (Primary Quality Gate Inversion) +
#           docs/po-decisions.md PO-DIRECTIVE-014 (7 phase 開発ワークフロー 機械強制) +
#           7 phase ワークフロー phase 7 「配布」 自動結線
#
# 用途:
#   goal-ai-worker の .git/hooks/post-deploy + ~/.claude/settings.json Stop hook chain
#   両方に post_deploy_smoke.sh 連携を結線する setup script。
#
#   git hook + Stop hook の 2 層 結線:
#     - 1 層目: .git/hooks/post-deploy = ローカル wrangler deploy 後 chain
#     - 2 層目: ~/.claude/settings.json Stop hook = ADV turn 終了時 deploy detect 後 invoke
#
# Placeholders:
#   goal-ai-worker: 生成 App 名 (識別子、ログ出力で使用)
#
# Usage:
#   sh scripts/install_post_deploy_hook.sh                  # 既定 path で install
#   sh scripts/install_post_deploy_hook.sh --check          # 現在 install 状態 確認
#   sh scripts/install_post_deploy_hook.sh --uninstall      # uninstall
#
# 完了条件:
#   - exit 0 = .git/hooks/post-deploy 配置 + chmod +x 完了
#             + ~/.claude/settings.json hook chain 拡張 stub 出力 (manual merge 案内)
#   - exit 1 = file copy / chmod 失敗
#
# POSIX sh 互換 (bash 機能 不使用)。

set -e

ACTION="install"

while [ $# -gt 0 ]; do
  case "$1" in
    --check)
      ACTION="check"
      shift
      ;;
    --uninstall)
      ACTION="uninstall"
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [--check] [--uninstall]"
      exit 0
      ;;
    *)
      echo "[install_post_deploy_hook][goal-ai-worker] WARN: unknown arg: $1"
      shift
      ;;
  esac
done

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT" || exit 1

GIT_HOOK_DIR="$REPO_ROOT/.git/hooks"
GIT_HOOK_PATH="$GIT_HOOK_DIR/post-deploy"
SOURCE_HOOK="$REPO_ROOT/templates/git-hooks/post-deploy.template"
SETTINGS_JSON="$HOME/.claude/settings.json"

echo "================================================================"
echo "  install_post_deploy_hook.sh — phase 7 (配布 自動結線)"
echo "  app: goal-ai-worker"
echo "  action: $ACTION"
echo "================================================================"

case "$ACTION" in
  check)
    echo "[install_post_deploy_hook][goal-ai-worker] check 実行"
    if [ -x "$GIT_HOOK_PATH" ]; then
      echo "  [OK] .git/hooks/post-deploy 配置済 (executable)"
    else
      echo "  [MISSING] .git/hooks/post-deploy 未配置"
    fi
    if [ -f "$SETTINGS_JSON" ] && grep -q "post_deploy_smoke.sh" "$SETTINGS_JSON" 2>/dev/null; then
      echo "  [OK] ~/.claude/settings.json に post_deploy_smoke.sh chain 検出"
    else
      echo "  [MISSING] ~/.claude/settings.json hook chain 未配置 (manual merge 必要)"
    fi
    exit 0
    ;;

  uninstall)
    echo "[install_post_deploy_hook][goal-ai-worker] uninstall 実行"
    if [ -e "$GIT_HOOK_PATH" ]; then
      rm -f "$GIT_HOOK_PATH"
      echo "  [DONE] .git/hooks/post-deploy 削除"
    fi
    echo "  [INFO] ~/.claude/settings.json は manual cleanup 必要 (post_deploy_smoke.sh chain 行 を 手動 削除)"
    exit 0
    ;;

  install)
    echo "[install_post_deploy_hook][goal-ai-worker] install 実行"

    # 1 層目: .git/hooks/post-deploy 配置
    if [ ! -d "$GIT_HOOK_DIR" ]; then
      echo "  [WARN] .git/hooks dir 不在 (= .git 未 init)、 git init 後 再実行推奨"
      exit 1
    fi

    if [ ! -f "$SOURCE_HOOK" ]; then
      echo "  [ERROR] $SOURCE_HOOK 不在 (= dev-system templates 配備不全)"
      exit 1
    fi

    cp "$SOURCE_HOOK" "$GIT_HOOK_PATH"
    chmod +x "$GIT_HOOK_PATH"
    echo "  [OK] .git/hooks/post-deploy 配置完了 ($GIT_HOOK_PATH)"

    # 2 層目: ~/.claude/settings.json hook chain 拡張 stub 出力
    echo ""
    echo "----------------------------------------------------------------"
    echo "  Manual merge 案内: ~/.claude/settings.json"
    echo "----------------------------------------------------------------"
    echo "以下 stub を ~/.claude/settings.json の Stop hook chain に追加してください:"
    echo ""
    cat <<'EOF'
  {
    "type": "command",
    "command": "if [ -x \"$REPO_ROOT/scripts/post_deploy_smoke.sh\" ] && [ \"${POST_DEPLOY_TRIGGER:-0}\" = \"1\" ]; then sh \"$REPO_ROOT/scripts/post_deploy_smoke.sh\" >>$HOME/.claude/post_deploy_smoke.log 2>&1 || true; fi"
  }
EOF
    echo ""
    echo "  POST_DEPLOY_TRIGGER=1 を deploy 直後に export することで自動 invoke"
    echo "----------------------------------------------------------------"
    echo "[install_post_deploy_hook][goal-ai-worker] install 完了"
    echo "================================================================"
    exit 0
    ;;
esac

exit 1
