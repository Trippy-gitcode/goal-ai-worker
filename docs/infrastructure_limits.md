# GOAL AI — インフラ制限マップ
> 外部サービスのFree plan制限と使用量推定。制限超過による本番障害を未然防止する。
> テスト配布25名 / ローンチ100名 / 成長1,000名の3段階で試算。
> 更新: 2026-04-05

---

## Cloudflare Workers (Free plan)

| 項目 | 制限値 | 1メッセージ消費 | 25名/日 | 100名/日 | 1,000名/日 | 状態 |
|------|--------|---------------|---------|----------|-----------|------|
| **KV writes** | 1,000/日 | 8回→KV-OPT後2回 | 1,000→移行後250 | 4,000→1,000 | 40,000→10,000 | 🔴→KV-OPT後🟢 |
| **KV reads** | 100,000/日 | ~5回 | 2,500 | 10,000 | 100,000 | 🟢→1,000名で🔴 |
| **Worker requests** | 100,000/日 | ~3回(route+stream+etc) | 1,500 | 6,000 | 60,000 | 🟢 |
| **CPU time** | 10ms/invocation | 未測定 | — | — | — | 🟡未検証 |
| **Subrequest/invocation** | 1,000 | ~5(AI API+KV+Supabase) | — | — | — | 🟢 |
| リセット | UTC 0:00（JST 9:00） | | | | | |

### KV-OPT後の残存KV write（推定）
- route cache: 条件付き1回/メッセージ（キャッシュヒット時は0）
- location cache: 初回のみ1回/ユーザー
- memo/profile/history: 5ターンに1回
- token data: 登録時のみ
- → 平均 1-2 writes/メッセージ

## Supabase (Free plan)

| 項目 | 制限値 | 現在の使用量 | 25名/月 | 100名/月 | 1,000名/月 | 状態 |
|------|--------|------------|---------|----------|-----------|------|
| **Database** | 500MB | 未測定 | ~50MB | ~200MB | 2GB超 | 🟡要測定 |
| **Egress** | 5GB/月(cached)+5GB(uncached) | 未測定 | ~1GB | ~5GB | 50GB超 | 🟡→100名で🔴 |
| **MAU** | 50,000/月 | — | 25 | 100 | 1,000 | 🟢 |
| **Storage** | 1GB | ~0 | ~100MB | ~500MB | 5GB超 | 🟢→1,000名で🔴 |
| **API requests** | 無制限 | — | — | — | — | 🟢 |
| **Project pausing** | 1週間無操作で停止 | — | — | — | — | 🟡テスト前後に注意 |
| リセット | 月次（請求サイクル） | | | | | |

### DB容量の内訳リスク
- chat_history: 1メッセージ≈1KB × 20msg/日 × 25名 × 30日 = 15MB/月
- pgvector embeddings: 1埋め込み≈1.5KB × 5ターンに1回 = 3MB/月
- usage_counters(KV-OPT後): 小さい。月数百KB
- → 25名で月18MB程度。500MBに到達するのは約28ヶ月後（安全）
- → ただし100名で月72MB。7ヶ月で500MB到達 → **Pro必要**

## AI API（GPT-5 / Claude / Gemini）

| 項目 | 制限値 | 25名同時 | 対策 |
|------|--------|---------|------|
| GPT-5 RPM | Tier依存（通常60-500RPM） | 最大25 RPM | 🟢 |
| Claude RPM | Tier依存 | 最大4 RPM（15%ルーティング） | 🟢 |
| Gemini RPM | 通常60RPM | 最大8 RPM（30%ルーティング） | 🟢 |
| **APIキーのクォータ超過** | 月額予算依存 | 不明 | 🟡要監視 |

## Stripe

| 項目 | 制限値 | 25名 | 状態 |
|------|--------|------|------|
| API rate limit | 100 read/s, 100 write/s | 問題なし | 🟢 |
| Usage record report | 制限緩い | 問題なし | 🟢 |
| Webhook retry | 3日間リトライ | — | 🟢 |

## Cloudflare Pages (Free plan)

| 項目 | 制限値 | 状態 |
|------|--------|------|
| Builds | 500/月 | 🟢（デプロイ頻度低い） |
| Bandwidth | 無制限 | 🟢 |
| Custom domains | 100 | 🟢 |

---

## スケーリング判断表

| ユーザー数 | 必要なアップグレード | 月額コスト増 |
|-----------|-------------------|------------|
| 25名 | KV-OPT完了で対応可。Free planのまま | ¥0 |
| 100名 | Supabase egress注意。KV reads注意 | ¥0（ギリギリ） |
| 500名 | **Supabase Pro必須**（$25/月）。CF Workers Paid検討（$5/月） | ~¥4,500/月 |
| 1,000名 | Supabase Pro + CF Workers Paid必須 | ~¥4,500/月 |

---

## 未検証項目（要実測）
1. [ ] Workers CPU time実測（AI routing処理が10ms以内か）
2. [ ] Supabase DB現在サイズ（ダッシュボードで確認）
3. [ ] Supabase egress現在使用量
4. [ ] AI API月額コスト（25名テスト配布1ヶ月分の推定）
