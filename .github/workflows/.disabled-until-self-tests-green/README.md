# GitHub Workflow 一時 disable (PO 直命 2026-05-04)

## 根拠

PO 直命 (2026-05-04): 「自社 テスト 完了 する まで は Git テスト かけない はず」
= core_spec.md §2.25.21 Primary Quality Gate Inversion の 真の 設計
= 自社 a-e 5 chain (vitest / playwright / g50 / lint / ai_review) PASS = origin push = GitHub CI 起動
= 自社 test PASS 前 に GitHub workflow が 起動 する のは 設計 違反

## disable 対象 (5 file)

| workflow | 旧 trigger | disable 理由 |
|---|---|---|
| `cf_cpu_quota_check.yml` | schedule cron 6 hour | Cloudflare quota 超過 = 検知 価値 0 |
| `ci.yml` | on push / pull_request | 自社 a-e PASS 後 のみ origin 到達 = redundant |
| `incident_reminder.yml` | schedule cron 4 hour | incident 0 件 = noise のみ |
| `synthetic-monitor.yml` | schedule cron 5 min | Cloudflare error 1027 で 5 分 周期 spam |
| `vendor_outage_check.yml` | schedule cron 15 min | 同 |

## 残 active

- `deploy.yml` (workflow_dispatch のみ = 手動起動 のみ、 schedule 0、 push trigger 0 = 安全)

## 復活 条件

1. 自社 a-e 5 chain 全 ✅ 化
2. impl-only drift 43 件 (dev-system) + 72 件 (Lais) baseline 解消
3. spec_impl_drift 7 件 baseline 解消
4. 進捗 ボード 152 mass の 80%+ ✅ 化
5. PO 直接 復活 承認

## 復活 path

```bash
# 全 復活 (= 自社 test green 達成 後)
mv .disabled-until-self-tests-green/*.yml .

# 個別 復活 (= 段階 strict 化)
mv .disabled-until-self-tests-green/ci.yml .
```

## 同型 違反 防止

新 workflow file 追加時 は 必ず:
1. 自社 quality gate (a-e + step f-l) で 同等 verify を 機械化
2. push 時 自社 PASS 後 のみ trigger (= on: workflow_run: types: [completed])
3. cron 系 は 自社 monitor + 緊急時 のみ
