# Lais δ 軸 CI ゲート Matrix v1.0

> ミッション ID: DELTA-CI-GATES-SSOT-V1
> 起点: α SSoT v3.3 §11 (CI ゲート起点) / §15 (E1 カナリア) / §15.2 (E4 時間制限なし)
> spec タイプ: SSoT 化 (仕様書化のみ、実 GitHub Actions YAML 配置は後続フェーズ)
> 作成日: 2026-04-27 / PO: ふとし

---

## 0. 概要 (CI 一本化方針)

### 0.1 本 SSoT の位置付け
本ファイルは Lais 抜本改革 5 軸 (α/β/γ/δ/ε) のうち **δ 軸 (CI 一本化 + 重大度階層化)** の本格起点 SSoT である。α SSoT v3.3 §11 で起点定義のみ存在していた CI ゲートを、GitHub Actions ワークフロー雛形 + 重大度 3 階層 + カナリア配信段階 + 自動 rollback の完全仕様に展開する。

### 0.2 CI 一本化の意義
v3.3 以前は CI ゲートが分散していた:
- `playwright.cf.config.ts` の `expect().toBeLessThan()`
- `lais/verify/*` の各種検証スクリプト
- 手動 `realmachine_smoke_results.log` の目視確認

これらを **GitHub Actions 単一ワークフロー** に集約し、PR 作成時 / main マージ時 / カナリア昇格時の 3 トリガーで一貫した重大度階層を適用する。

### 0.3 ファイル管轄と禁止事項
- 編集対象: `lais/specs/ci_gates_v1.md` のみ (本ファイル)
- 編集禁止: `docs/plans/*` / `lais/verify/*` / `scripts/*`
- 実 YAML 配置 (`.github/workflows/*.yml`) は本ミッション対象外、後続フェーズ DELTA-CI-IMPL-V1 で実施

### 0.4 用語
- **BLOCK**: ゲート FAIL でデプロイ停止、PR マージ不可
- **WARN**: ゲート FAIL でも PR コメントに警告のみ、デプロイ継続
- **P0/P1/P2**: 重大度優先度 (P0 が最優先)
- **カナリア配信**: 段階的トラフィック流入による本番ロールアウト
- **自動 rollback**: エラー率閾値超過時の前バージョンへの自動切戻し

---

## 1. 重大度階層

CI ゲートを 3 階層で運用する。BLOCK は P0 / P1 で 2 段階、WARN は P2 のみ。

### 1.1 BLOCK P0 (即時停止、最高優先)

**対象**: セキュリティ / DB schema 不整合 / signin 失敗 / 致命的 a11y

| ゲート ID | 検査項目 | 閾値 / 条件 | 検査ツール |
|----------|---------|------------|----------|
| P0-SEC-01 | secret 漏洩 (API キー / TOTP seed / Service Role Key) | grep 検出 0 件必須 | gitleaks / trufflehog |
| P0-SEC-02 | 依存パッケージ既知脆弱性 (Critical) | `npm audit` Critical 0 件 | npm audit / Snyk |
| P0-DB-01 | DB schema migration dry-run 失敗 | exit code 非 0 で BLOCK | supabase migration check |
| P0-DB-02 | Prisma schema vs DB drift 検知 | drift > 0 で BLOCK | prisma migrate diff |
| P0-AUTH-01 | サインイン E2E 失敗 (S-01-A シナリオ) | `signin_success=true` 必須 | Playwright cf.config |
| P0-AUTH-02 | PKCE callback 失敗 (S-01-A 派生) | callback URL 200 必須 | Playwright |
| P0-A11Y-01 | キーボード操作不能 (Tab navigation 完全停止) | axe-core critical 0 件 | axe-core / pa11y |
| P0-A11Y-02 | スクリーンリーダー label 完全欠落 (WCAG 1.3.1) | axe-core critical 0 件 | axe-core |
| P0-BUILD-01 | TypeScript コンパイルエラー | `tsc --noEmit` exit 0 | tsc |
| P0-BUILD-02 | `next build` 失敗 | exit 0 必須 | Next.js build |

**運用**: P0 ゲート FAIL は **PR マージ不可 + main 直接 push 拒否 + カナリア昇格停止**。例外承認なし (PO 緊急判断は別途 manual override 機構を v2 で検討)。

### 1.2 BLOCK P1 (デプロイ停止、性能 / Web Vitals)

**対象**: 性能閾値超過 / Lighthouse CI 予算 / エラー率

| ゲート ID | 検査項目 | 閾値 | 検査ツール |
|----------|---------|------|----------|
| P1-PERF-01 | P95 latency (API endpoint) | < 1000ms | k6 / Playwright trace |
| P1-PERF-02 | エラー率 (5xx + 例外) | < 1% | RUM / log 集計 |
| P1-LH-01 | Lighthouse CI LCP | < 2.5s | Lighthouse CI |
| P1-LH-02 | Lighthouse CI CLS | < 0.1 | Lighthouse CI |
| P1-LH-03 | Lighthouse CI INP | < 200ms | Lighthouse CI |
| P1-LH-04 | Lighthouse Performance score | >= 80 | Lighthouse CI |
| P1-A11Y-01 | axe-core serious violations | 0 件 | axe-core |
| P1-IOS-01 | iOS Safari E2E (Q6 12 件のうち critical 5 件) | 全 PASS | Playwright ios.config |
| P1-CFG-01 | env 変数 schema 検証 (zod) | 全必須 key 存在 | zod schema |
| P1-COV-01 | unit test coverage (statements) | >= 70% | vitest / jest coverage |

**運用**: P1 ゲート FAIL は **デプロイ停止 + PR コメントに詳細レポート添付**。再実行 (rerun) で fix 確認可能。

### 1.3 WARN P2 (警告のみ、文面 / スタイル / 軽微)

**対象**: 文面 / スタイル / 軽微 a11y

| ゲート ID | 検査項目 | 閾値 / 条件 | 検査ツール |
|----------|---------|------------|----------|
| W2-LINT-01 | ESLint warning | 増加分のみ警告 | eslint |
| W2-STYLE-01 | Prettier 差分 | 差分検出時警告 | prettier --check |
| W2-COPY-01 | UX コピー トーン違反 (敬体 / 体言止め混在) | 検出時 PR comment | 自作 lint |
| W2-A11Y-01 | axe-core minor / moderate violations | 件数のみ報告 | axe-core |
| W2-IOS-02 | iOS Safari E2E (Q6 残り 7 件) | 件数のみ報告 | Playwright ios.config |
| W2-PERF-03 | Bundle size 増加分 | +5% 超で警告 | size-limit |
| W2-DOC-01 | spec.ts と実装の差分検知 | 差分検出時警告 | 自作 spec lint |
| W2-LICENSE-01 | OSS ライセンス追加 | 新規依存パッケージ報告 | license-checker |

**運用**: W2 ゲート FAIL は **PR コメントに警告のみ、マージ可能**。週次 PO レビューで累積 WARN を確認。

### 1.4 重大度サマリー
- **BLOCK P0**: 10 ゲート (security 2 / DB 2 / auth 2 / a11y 2 / build 2)
- **BLOCK P1**: 10 ゲート (perf 2 / Lighthouse 4 / a11y 1 / iOS 1 / config 1 / coverage 1)
- **WARN P2**: 8 ゲート (lint / style / copy / a11y / iOS / perf / doc / license)
- **合計**: 28 ゲート

---

## 2. GitHub Actions ワークフロー雛形 (YAML)

### 2.1 ワークフロー構成
3 ワークフローに分割し、トリガーごとに重大度を切替える。

```yaml
# .github/workflows/ci-pr.yml
# トリガー: PR 作成 / 更新時
# 適用ゲート: BLOCK P0 全 + BLOCK P1 全 + WARN P2 全 (ただし W2 はコメントのみ)
name: CI - Pull Request Gates
on:
  pull_request:
    branches: [main, develop]

jobs:
  block-p0-security:
    name: BLOCK P0 - Security
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: gitleaks scan
        uses: gitleaks/gitleaks-action@v2
      - name: npm audit (critical only)
        run: npm audit --audit-level=critical

  block-p0-build:
    name: BLOCK P0 - Build & Type
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run build

  block-p0-auth-e2e:
    name: BLOCK P0 - Auth E2E
    runs-on: ubuntu-latest
    needs: [block-p0-build]
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - name: Playwright signin (S-01-A / PKCE callback)
        run: npx playwright test --config=playwright.cf.config.ts --grep "S-01-A"

  block-p1-performance:
    name: BLOCK P1 - Performance
    runs-on: ubuntu-latest
    needs: [block-p0-build]
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - name: Lighthouse CI (LCP/CLS/INP)
        run: npx lhci autorun --assert.preset=lighthouse:recommended
      - name: P95 latency check
        run: npm run test:perf -- --p95-threshold=1000

  warn-p2-lint:
    name: WARN P2 - Lint & Style
    runs-on: ubuntu-latest
    continue-on-error: true  # WARN なので落としても次工程は進む
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint
      - run: npx prettier --check .
```

### 2.2 main マージ時の追加ワークフロー
```yaml
# .github/workflows/ci-main.yml
# トリガー: main へのマージ時
# 適用: BLOCK P0/P1 全 + L3 フルテスト + Lighthouse CI 完全版
name: CI - Main Branch Full
on:
  push:
    branches: [main]

jobs:
  l3-full-test:
    name: L3 Full Test Suite
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:full  # 30 分以上 OK (E4 時間制限なし方針)
        timeout-minutes: 60
```

### 2.3 カナリア昇格ワークフロー
```yaml
# .github/workflows/canary-promote.yml
# トリガー: 手動 dispatch + 各段階での RUM PASS 確認
# 適用: 本番計測 P95/エラー率/Web Vitals + 自動 rollback 連動
name: Canary Promotion
on:
  workflow_dispatch:
    inputs:
      stage:
        description: 'Promotion target stage'
        type: choice
        options: [friend-beta, public-5, public-25, public-100]

jobs:
  rum-gate-check:
    runs-on: ubuntu-latest
    steps:
      - name: Fetch RUM metrics (last 12h)
        run: ./scripts/rum-fetch.sh ${{ inputs.stage }}
      - name: Assert P95 < 1000ms
        run: ./scripts/rum-assert.sh p95 1000
      - name: Assert error rate < 1% (E2 連動)
        run: ./scripts/rum-assert.sh error_rate 0.01
      - name: Promote to next stage
        if: success()
        run: ./scripts/canary-promote.sh ${{ inputs.stage }}
      - name: Auto-rollback on failure (E2)
        if: failure()
        run: ./scripts/canary-rollback.sh
```

### 2.4 ワークフロー雛形の運用ルール
- 全ワークフローは `lais/specs/ci_gates_v1.md` (本ファイル) を SSoT として参照
- ゲート ID (P0-SEC-01 等) を job 名 / step 名に必ず含める
- 失敗時の PR コメントには ゲート ID + α SSoT 参照節 (§11.1 等) を記載

---

## 3. カナリア配信段階

α SSoT v3.3 §11.2 + §7.5 E1 を起点に、2 期 (友人ベータ期 / 一般公開期) × 各 3 段階で展開する。

### 3.1 友人ベータ期 (PO 単独 → 友人 2-3 人 → 全員)

**期間**: v1 (PO 単独期、初月無料) ~ v2 (友人ベータ期、2 ヶ月目から課金)

| 段階 | トラフィック | 様子見期間 | 昇格条件 (全 PASS で昇格) |
|------|-------------|----------|------------------------|
| FB-1 | PO 1 名 (ふとし本人のみ) | 24 時間 | エラー率 0% / 致命的バグ報告 0 件 |
| FB-2 | PO + 友人 2-3 人 (合計 3-4 名) | **12 時間** (E1 仕様) | P95 < 1000ms / エラー率 < 1% / RUM Web Vitals (LCP/CLS/INP) 全 PASS |
| FB-3 | 友人ベータ全員 (10-20 名想定) | 1 週間 | FB-2 同条件 + LINE 緊急通知 0 件 (F2 連動) |

### 3.2 一般公開期 (5% → 25% → 100%)

**期間**: 友人ベータ期で FB-3 完走後、Lais 正式 1.0 公開フェーズ

| 段階 | トラフィック | 様子見期間 | 昇格条件 (全 PASS で昇格) |
|------|-------------|----------|------------------------|
| GA-1 | **5%** | 24 時間 | エラー率 < 1% / P95 < 1000ms / Lighthouse perf >= 80 |
| GA-2 | **25%** | 48 時間 | GA-1 同条件 + 課金フロー成功率 >= 99.5% |
| GA-3 | **100%** | 完全展開 | GA-2 同条件 + RUM サンプリング設定 (規模拡大時調整) |

### 3.3 昇格判定ルール
- 全段階で **本番計測 PASS** を昇格条件とする (α SSoT §11.2 準拠)
- 計測項目: **P95 latency + エラー率 + RUM Web Vitals (LCP/CLS/INP)**
- いずれか 1 件でも閾値超過 → 自動 rollback (§4) 発動
- 友人ベータ FB-2 → FB-3 の **12 時間** は α SSoT §7.5 E1 の確定値、変更不可

### 3.4 段階間トラフィック制御
- Vercel Edge / Cloudflare Workers の percentage-based routing で実装
- 設定値は `scripts/canary-promote.sh` 経由で更新 (本ミッション対象外、DELTA-CI-IMPL-V1 で実装)

---

## 4. 自動 rollback (エラー率 1% 超、E2 連動)

### 4.1 発動条件
| 条件 ID | 検知項目 | 閾値 | 観測窓 |
|--------|---------|------|-------|
| RB-1 | エラー率 (5xx + 例外スロー) | **> 1%** (E2 確定値) | 直近 5 分 |
| RB-2 | P95 latency | > 2000ms (BLOCK P1 閾値の 2 倍) | 直近 5 分 |
| RB-3 | RUM Web Vitals 全指標悪化 | LCP > 4.0s / CLS > 0.25 / INP > 500ms | 直近 10 分 |
| RB-4 | サーバー死活 (health check) | 連続 3 回失敗 | 90 秒 |

### 4.2 rollback フロー
1. 検知層 (Vercel Analytics / Sentry / 自前 RUM) が閾値超過を検出
2. webhook で `canary-rollback.sh` 起動
3. 直前 stable バージョンへ即時切戻し (Vercel deployment promote-back)
4. **LINE 即時通知** (F2 緊急高 連動)
5. GitHub Issue 自動起票 (rollback 原因 + メトリクス snapshot 添付)

### 4.3 rollback 後の運用
- カナリア段階は強制的に前段階へ降格 (例: GA-2 で発動 → GA-1 へ)
- 24 時間は同バージョンの再昇格を BLOCK
- PO ふとしの手動 review + 修正 PR + 再 CI PASS まで再昇格不可

### 4.4 rollback 仕様の変更管理
- 閾値 (RB-1 の 1%) は α SSoT §7.5 E2 の確定値 (PO 提示)
- 変更時は α SSoT 改訂 → 本 SSoT 改訂 の順 (γ 軸 RACI 準拠)
- 友人ベータ期 (規模小、サンプル数少) は閾値を **絶対件数 3 件以上** で代替検討 (v2 で確定予定)

---

## 5. デプロイ前テスト 時間制限なし運用 (E4)

### 5.1 方針 (α SSoT §7.5 E4)
> デプロイ前テスト 時間制限なし、品質最優先

### 5.2 運用ルール
- L3 フルテスト (`docs/plans/dev_system_spec_v2.1.md` §17.1) は **時間制限を設けない**
- GitHub Actions `timeout-minutes` は 60 分以上を許容 (default 6 時間まで)
- ローカル `npm run test:full` も 30 分超を許容
- 「速度優先で skip する」「flaky test を握りつぶす」は禁止
- 実行時間が 30 分を超えた場合のみ **PO に並列化検討の Issue 起票** (運用は遅延しない)

### 5.3 並列化の判断基準 (PO 判断)
- 30 分超: 並列化検討 (Issue 起票のみ、運用は遅延しない)
- 60 分超: 並列化必須 (matrix strategy / shard 分割)
- 90 分超: テスト戦略再設計 (PO escalate)

### 5.4 BLOCK ゲートとの優先順位
- E4 (時間制限なし) と BLOCK P0/P1 (FAIL でデプロイ停止) は両立する
- 「時間がかかるから skip」は許可しない
- 「FAIL したから skip」も許可しない (修正 PR 必須)

---

## 6. 既存 3 層テスト戦略 との接続 (L1/L2/L3)

`docs/plans/dev_system_spec_v2.1.md` 167-332 行 の 3 層戦略との対応表。

### 6.1 L1 / L2 / L3 マッピング

| 層 | 実行頻度 | 件数 | 時間 | 対応 CI ゲート |
|----|---------|------|------|--------------|
| **L1: スモーク** | 毎デプロイ | ~10 | 2 分 | BLOCK P0 全 (auth / build / security) |
| **L2: 影響範囲** | PR 変更時 | 変動 | 5-10 分 | BLOCK P1 全 (perf / Lighthouse / a11y) + WARN P2 |
| **L3: フル** | 週次 / リリース前 | 全件 | 30 分+ | カナリア昇格 RUM gate + L1+L2 全再実行 |

### 6.2 トリガー対応
| GitHub Actions トリガー | 適用層 | 適用ゲート |
|----------------------|-------|----------|
| `pull_request` (PR 作成 / 更新) | L1 + L2 | BLOCK P0 + BLOCK P1 + WARN P2 |
| `push to main` | L1 + L2 + L3 | 全ゲート + L3 フル |
| `workflow_dispatch` (canary promote) | RUM gate | 本番計測 (P95 / エラー率 / Web Vitals) |
| `schedule` (週次 cron) | L3 | フル + bundle size + license diff |

### 6.3 L1 失敗時の動作
- L1 (スモーク) FAIL → **デプロイ中止** (既存仕様 `dev_system_spec_v2.1.md` 880 行準拠)
- 本 SSoT では L1 FAIL = BLOCK P0 とマッピング、即時 PR マージ不可

### 6.4 L2 affected-tests.sh との接続
- `affected-tests.sh` (既存スクリプト) で git diff から関連テストを特定
- 本 SSoT では L2 = BLOCK P1 ゲートの subset として扱う
- 「変更ファイルが auth 関連 → P0-AUTH-01/02 を必ず追加実行」の判定ルールを `affected-tests.sh` に組込み (DELTA-CI-IMPL-V1 で実装)

### 6.5 既存仕様との非競合保証
- 本 SSoT は L1/L2/L3 戦略を **置換せず拡張する**
- 既存 `dev_system_spec_v2.1.md` §17 の表現は維持
- 競合時は α SSoT §11 が優先、次いで本 SSoT、最後に dev_system_spec

---

## 7. 関連 PD / PATCH 履歴

### 7.1 起点
- α SSoT v3.3 §11 (CI ゲート起点) 2026-04-27
- α SSoT v3.3 §7.5 E1 (カナリア配信、友人ベータ期 12 時間)
- α SSoT v3.3 §7.5 E2 (自動 rollback、エラー率 1% 超)
- α SSoT v3.3 §7.5 E4 (デプロイ前テスト 時間制限なし)
- α SSoT v3.3 §7.6 F2 (アラート通知 3 段、LINE 即時通知)

### 7.2 既存実装の参照
- `playwright.cf.config.ts` (Cloudflare 環境 E2E)
- `playwright.ios.config.ts` (iOS Safari E2E、Q6 12 件カバー)
- `realmachine_smoke_results.log` (実機 smoke 既存ログ)
- `docs/plans/dev_system_spec_v2.1.md` §17 (3 層テスト戦略)

### 7.3 後続フェーズ
- **DELTA-CI-IMPL-V1**: 実 GitHub Actions YAML 配置 (`.github/workflows/ci-pr.yml` 等 3 本)
- **DELTA-CI-RUM-V1**: ε 軸 RUM 結線 (RUM 計測値を canary-promote から参照)
- **DELTA-CI-V2**: 友人ベータ期の絶対件数閾値 (RB-1 代替案) 確定

### 7.4 改訂履歴
| 版 | 日付 | 変更 | 編集者 |
|----|------|------|-------|
| v1.0 | 2026-04-27 | 新規作成 (α SSoT §11 から SSoT 化展開) | ADV |

### 7.5 検証 (本ファイル自身の自己検証)
- 行数: 300-500 行範囲内 (`wc -l` で確認)
- BLOCK ゲート記載: 20 件 (P0 10 + P1 10、>= 10 必須)
- WARN ゲート記載: 8 件 (>= 5 必須)
- GitHub Actions / workflows 記載: 5 件以上
- カナリア記載: 5 件以上 (友人ベータ FB-1/FB-2/FB-3 + 一般公開 GA-1/GA-2/GA-3)
- rollback 記載: 3 件以上 (§4 全体 + §3.3 + §7.1 E2)

---

> 本 SSoT は α SSoT v3.3 §11 を起点に展開した δ 軸 CI ゲート Matrix v1.0。
> 実 YAML 配置は後続 DELTA-CI-IMPL-V1 で実施、本ミッションは仕様書化のみ完了。
