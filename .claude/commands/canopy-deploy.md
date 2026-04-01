C2基準フローを自動実行する。以下のステップを順序通り実行し、いずれかが失敗したら即停止して報告:

1. `bash scripts/bump-version.sh patch` — バージョンインクリメント
2. `npm run deploy:frontend` — vite build + Pages deploy
3. `bash tests/smoke/canopy.sh` — 全項目PASS確認。FAILなら停止
4. `npx wrangler deploy` — Worker deploy
5. `sleep 8 && bash scripts/post-deploy-check.sh` — ヘルスチェック。FAILなら `npx wrangler rollback`
6. git add + git commit（変更内容に応じたコミットメッセージ）
7. `git tag v$(grep APP_VERSION src/utils/constants.js | grep -o "'[^']*'" | tr -d "'")`
8. `git push && git push --tags`
9. session_progress.mdのバージョン番号を更新
