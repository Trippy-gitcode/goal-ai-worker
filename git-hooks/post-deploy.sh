#!/bin/sh
# GENERATED: DO NOT MODIFY
# templates/git-hooks/post-deploy.template
#
# derived-from: SUBAGENT-DEVSYS-7PHASE-TEST-DEPLOY-V1 (PO 直命 2026-05-04 PO-DIRECTIVE-014)
# spec-ref: core_spec.md §2.25.21 (Primary Quality Gate Inversion) +
#           core_spec.md §2.25.16.10 (機械強制 マトリクス) +
#           docs/po-decisions.md PO-DIRECTIVE-014 (7 phase 開発ワークフロー 機械強制) +
#           7 phase ワークフロー phase 6 「post-deploy 実機 smoke」
#
# 用途: 生成 App の .git/hooks/post-deploy に配置される deploy 後 自動 invoke hook。
#       wrangler deploy 完了後に scripts/post_deploy_smoke.sh を起動して
#       /health endpoint に到達確認、 失敗時 rollback 推奨表示。
#
# goal-ai-worker 識別子: 生成 App 名 (任意 placeholder、ログ出力で使用)
#
# 設計:
#   - git hook 自体は post-deploy という標準 hook が無いため、 install_post_deploy_hook.sh
#     経由で wrangler deploy script から chained invoke される (= manual chain)
#   - 真の "post-deploy" は GitHub Actions workflow (.github/workflows/deploy.yml) の
#     wrangler_deploy step 直後に 別 step として post_deploy_smoke.sh を実行
#   - ローカル wrangler deploy 後の自動 invoke も同 script で支援
#
# 連携 path:
#   - scripts/post_deploy_smoke.sh (= 本 hook が起動する body script)
#   - .github/workflows/deploy.yml.template (CI 側 hook chain)
#   - ~/.claude/settings.json (= dev-system Stop hook chain で POST_DEPLOY_TRIGGER=1 セット時に invoke)
#   - install_post_deploy_hook.sh.template (= 本 hook を .git/hooks/post-deploy に配置する setup script)

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT" || exit 0

echo "[post-deploy][goal-ai-worker] post-deploy hook 起動"

if [ -x "$REPO_ROOT/scripts/post_deploy_smoke.sh" ]; then
  echo "[post-deploy][goal-ai-worker] scripts/post_deploy_smoke.sh 実行"
  if ! sh "$REPO_ROOT/scripts/post_deploy_smoke.sh"; then
    echo ""
    echo "[post-deploy][goal-ai-worker] FAIL: post_deploy_smoke.sh 失敗 (HTTP 200 + status ok 未達)"
    echo "[post-deploy][goal-ai-worker] rollback 推奨: npx wrangler rollback"
    echo "[post-deploy][goal-ai-worker] verify/realmachine_smoke_results.md に詳細記録済"
    echo ""
    exit 1
  fi
  echo "[post-deploy][goal-ai-worker] post_deploy_smoke PASS"
else
  echo "[post-deploy][goal-ai-worker] WARN: scripts/post_deploy_smoke.sh 不在 / 未実行可能"
  echo "[post-deploy][goal-ai-worker] dev-system vv0.1.0 template 配備不全 の可能性"
  exit 1
fi

exit 0
