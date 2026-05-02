# wrangler rollback runbook

> Round 31 honest audit P2#31 fix (2026-05-02): bad deploy 復旧 runbook 不在を解消。

## いつ rollback するか

以下のいずれかが production deploy 後 5 分以内に観測された場合、 **即時 rollback**:

- `synthetic-monitor` workflow の連続失敗 (3 回以上)
- `/health` HTTP 200 以外を 1 分以上継続
- error rate > 5% (CF Workers dashboard 観測)
- p50 latency > 5s (CF Workers dashboard observation)
- ユーザー報告: アプリ全体が無応答

**rollback を躊躇する基準** (= forward fix を選ぶ):
- 軽微な UI bug (機能影響なし)
- データ整合性の確認待ち (rollback で逆にデータ壊す risk)

## rollback コマンド (5 分以内 に完了させる)

### Option 1: git revert + 再 deploy (推奨、 監査痕跡が残る)

```sh
cd /Users/futoshi/Desktop/goal-ai-worker

# 1. revert 対象 commit の SHA を確認
git log --oneline -5

# 2. revert (-m 1 は merge commit 用、 通常 commit には不要)
git revert <BAD_COMMIT_SHA>

# 3. push (CI を経由)
git push origin main

# 4. CI green 確認
gh run watch --exit-status

# 5. wrangler deploy (CI が自動で行う構成なら省略)
npx wrangler deploy

# 6. /health 復旧確認
curl -sS -o /dev/null -w "HTTP %{http_code}\n" https://goal-ai-worker.goalai-futoshi.workers.dev/health
```

### Option 2: wrangler rollback (最速、 5 分以内に必要な場合のみ)

```sh
# 1. 現在 deploy ID を確認
npx wrangler deployments list

# 2. 直前 (good) version の deploy ID を取得
GOOD_ID="<previous_deploy_id>"

# 3. rollback (immediate effect)
npx wrangler rollback --message "incident rollback to $GOOD_ID by ADV $(date -u +%FT%TZ)" "$GOOD_ID"

# 4. /health 復旧確認
curl -sS -o /dev/null -w "HTTP %{http_code}\n" https://goal-ai-worker.goalai-futoshi.workers.dev/health

# 5. 後追いで git revert + push (履歴を git と一致させる、 forward fix とのコンフリクト防止)
git revert <BAD_COMMIT_SHA>
git push origin main
```

## rollback 後の必須 follow-up

- [ ] `instructions/session_progress.md` に incident 概要 + rollback 時刻 + bad SHA + good SHA 記録
- [ ] `verify/adv_violation_log.md` に「Phase 完了 smoke PASS 必須 (§2.25.21.4) を本来 deploy 前に走らせるべきだった」 violation 自己申告
- [ ] `docs/po-decisions.md` PO 事後承認待ち事項として起票
- [ ] root cause analysis (5 Whys) を `docs/learned-patterns.md` に追記
- [ ] CI gate 不足の場合 (例: e2e test 不足、 smoke 未配備) を Phase next で補強

## 5 分以内 rollback のために常時準備しておく事

- `npx wrangler deployments list` の出力をブックマークまたは tail 監視
- `gh auth status` を 24h 以内に PASS させておく (token 切れ時 rollback 不能)
- production smoke `https://goal-ai-worker.goalai-futoshi.workers.dev/health` を 5 分周期 cron で監視 (synthetic-monitor.yml)

## 限界事項

- KV / Supabase 側の data 変更は wrangler rollback で revert できない (forward fix 必須)
- Stripe webhook event は idempotent 設計を前提、 rollback でも再 fire される (handler 側 dedupe 必須)
- DLQ に積まれた message は rollback 後も処理を継続させる (失った message を replay できる KV TTL 内のみ有効)
