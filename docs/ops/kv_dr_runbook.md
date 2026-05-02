# KV DR Runbook (P2#33)

CF Workers KV namespace の Disaster Recovery 手順。 週次 export + 月次 restore drill を ops 側で実施。

## 対象 namespace

- `TOKEN_KV` (`wrangler.toml` の `kv_namespaces` で `binding = "TOKEN_KV"` の `id` を参照)
- 必要に応じ追加 namespace を本 runbook に追記

## 前提

- `npx wrangler` 動作 (CF account 認証済 = `wrangler login` または `CLOUDFLARE_API_TOKEN` env)
- `python3` 利用可
- `KV_NAMESPACE_ID` env で対象 namespace ID 指定

## 1. 週次 export 手順 (毎週 月曜 09:00 JST 目安)

```sh
export KV_NAMESPACE_ID="<TOKEN_KV id>"
sh scripts/kv_dr_export.sh
# → /tmp/kv_dr_<UTC timestamp>.json 出力
# → 出力 file を 別 storage (S3 / GitHub Release private asset 等) に転送
```

成果物:
- `/tmp/kv_dr_<TS>.json` (JSON array of `{key, value}`)

ローテーション: 直近 4 世代 (4 週間分) 保管、 古い世代は削除

## 2. 月次 restore drill 手順 (毎月 第 1 月曜 10:00 JST 目安)

drill 用に **別途用意した dev / staging namespace** に restore して動作確認 (本番 namespace への直接 restore は 障害時のみ)。

```sh
export KV_NAMESPACE_ID="<dev/staging KV namespace id>"
sh scripts/kv_dr_restore.sh /path/to/kv_dr_<TS>.json
# → wrangler kv:bulk put 経由で 全 key 復元
# → 復元後 KEY_COUNT が export 時と一致するか sanity check
```

成功基準:
- `wrangler kv:key list` の件数が export 時の `KEY_COUNT` と一致
- 任意の key を `wrangler kv:key get` で取得し、 元 value と一致

## 3. 障害時 (本番 namespace 全消失等) restore 手順

1. 直近の export file を取得 (週次 backup から)
2. 本番 namespace ID で `kv_dr_restore.sh` 実行
3. アプリ側 health check (`/healthz` / トークン取得 endpoint) で 正常応答確認
4. `instructions/incident_log.md` に restore 実施記録

## 4. 既知の制約

- **rate limit**: `wrangler kv:key get` は逐次実行のため 大規模 namespace (>10k keys) では 数分〜数十分要する。 必要なら `kv:bulk get` 移行 (現状未対応の wrangler version では individual get fallback)
- **value encoding**: 現状 plain text 前提。 binary value は base64 化 別途必要 (今回 scope 外)
- **TTL**: KV の TTL 情報は export に含まれない (restore 後 TTL リセット)。 TTL が業務 critical な key は別途 metadata 管理

## 5. テスト (CI 不要、 dev local で実施)

```sh
# graceful exit テスト 1: KV_NAMESPACE_ID 未設定
KV_NAMESPACE_ID="" sh scripts/kv_dr_export.sh; echo "exit=$?"
# 期待: exit 1 + "ERROR: KV_NAMESPACE_ID 必須" 出力

# graceful exit テスト 2: restore 引数 missing
sh scripts/kv_dr_restore.sh; echo "exit=$?"
# 期待: exit 1 + "Usage: ..." 出力
```

## 6. 関連 ticket

- P2#33 (Round 31 honest audit, KV DR plan 実装) — 本 runbook + 2 script で close
- P2#32 (CF Workers CPU 10ms quota alert) — `.github/workflows/cf_cpu_quota_check.yml` で別途対応
