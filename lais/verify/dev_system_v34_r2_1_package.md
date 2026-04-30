# dev-system v3.3 → v3.4 改訂レビュー R2.1 パッケージ
> ADV（Claude.ai G_44）作成 / 2026-04-19
> ゴールデンラウンド直行用（R3 差分ラウンドは Plan E によりスキップ）
> 入力: lais/verify/dev_system_v34_r2_package.md（1,262行、R2本体）+ lais/verify/dev_system_v34_r2_triage.md（767行、R2トリアージ）
> R2結果: lais/verify/dev_system_v34_r2_{gemini,gpt54}_{persona}.json × 10本
> 参照: docs/plans/dev_system_spec.md v3.3（1,422行）+ sub_*.md 5本 + CLAUDE.md + development_rules.md + docs/po-decisions.md

---

## §0. パッケージ位置づけ

### 0.1 R2 → R2.1 差分 = 12 CRITICAL クラスター + 8 HIGH 新クラスター + PD-107 確定
R2 本体（1,262行）に対する差分修正版。R3 差分ラウンドを省略し、本R2.1をもってゴールデンラウンドに直行する。

### 0.2 Plan E 採用背景（PO承認 2026-04-19 G_44）
- CRITICAL 22 件のうち、R2 で出たペルソナは 10本中 9本。R3 差分ラウンドはゴールデンと実質同規模
- CRITICAL 22 件はすべて**改訂案に含めた scripts / ゲート表 / ファイル名規則 / 完了コマンド対応表の実装バグ・構造衝突**。方針への異議は 0 件
- R3 を挟んでもレビュアーに再問う価値が薄く、修正を固めてゴールデンで最終確認するほうが効率的
- ゴールデンで CRITICAL 0 → v3.4 確定 / CRITICAL > 0 → ADV 差分修正 → ゴールデン2周目

### 0.3 PD-104 / PD-105 / PD-106 / PD-107 まとめ
本 R2.1 は以下4つの PO 決定に基づく確定仕様を反映する:

| PD | 採用時期 | 内容 |
|---|---|---|
| PD-104 | 2026-04-18 G_42 | ADV/ENG/PO 責務境界は3分岐で明文化。§0 Read リストを役割別に分離 |
| PD-105 | 2026-04-18 G_42 | 仕様厳格化は認証・決済・外部API呼び出しに集中（案B + 条件付き） |
| PD-106 | 2026-04-18 G_42 | Hフロー発火条件を git diff ファイルパスで機械判定（案B + 機械判定） |
| **PD-107** | **2026-04-19 G_44** | **必須Read は §C0 要約を固定、§C1-C6 全文は条件付き再読**（PD-104 の拡張。案A 採用） |

### 0.4 R2.1 レビュアー（ゴールデンラウンド）のゴール3種
1. CRITICAL 22件 / HIGH 新クラスター21件の修正差分が **構造的に成立しているか**（抜け・矛盾・不整合がないか）
2. 新設ゲート G14-G17 の設計 + 実装サンプルが **POSIX互換・bash 3.2 互換・macOS環境動作** を満たすか
3. 連鎖更新（dev_system_spec / sub_* / CLAUDE / development_rules / templates）の **ファイル間整合性**

### 0.5 レビュアーが新たに CRITICAL を出すべきでない論点（§5.5 棄却対象）
- PD-104/105/106/107 の方針そのものへの異議（実装詳細の改善提案は HIGH まで可）
- R1 / R2 で既棄却となった LOW 4件の蒸し返し
- R2 で既採用 76件 + 本 R2.1 で既採用 22件の方針への再異議
- severity inflation: R1・R2 で既採用テーマの蒸し返しは MED 以下

### 0.6 R2.1 構成（9パート、合計推定1,600-1,800行）
| § | 内容 | 行数目安 |
|---|---|---:|
| §0 | パッケージ位置づけ（本セクション） | 80 |
| §1 | R2結果サマリー（triage参照） | 50 |
| §2 | 採用確定項目 Part VI — R1(76) + R2(22) + HIGH新クラスター(21) = 119件 | 250 |
| §3 | PO承認済み確定仕様 — PD-104/105/106/107 原文 + 適用結果 | 120 |
| §4 | 改訂案反映差分 Part VII — 19クラスター（α〜μ + ν〜υ）の修正パッチ | 700 |
| §5 | 新設ゲート G14-G17 完全設計 + 実装サンプル | 180 |
| §6 | 連鎖更新 — dev_system_spec / sub_* / CLAUDE / development_rules / templates | 150 |
| §7 | レビュアー指示 Part VIII（ゴールデン用） | 100 |
| §8 | Cumulative Context Part IX — 119件要約 + PD原文 + 既決定PD抜粋 | 100 |
| §9 | ゴールデンラウンド実行計画 | 50 |

---

## §1. R2 結果サマリー

### 1.1 severity 分布（R2 実行結果）
| severity | 件数 |
|---|---:|
| CRITICAL | 22 |
| HIGH | 56 |
| MEDIUM | 24 |
| NULL | 1（gpt54_solo_dev スキーマ非準拠だが内容有効） |
| **合計** | **103** |

### 1.2 CRITICAL 12クラスター（R2トリアージ確定）
| クラスター | 件数 | テーマ | §4対応節 |
|---|---:|---|---|
| α | 3 | Vite SPA コミットハッシュ埋込未定義 | §4.1 |
| β | 4 | TDD証跡ファイル名分離 vs G8 未更新 | §4.2 |
| γ | 3 | G10 番号再利用でシークレットスキャンゲート消失 | §4.3 |
| δ | 2 | bash 3.2 非互換な RISK_PATHS 配列設計 | §4.4 |
| ε | 2 | hflow_trigger_check.sh の git diff タイミング | §4.5 |
| ζ | 2 | §C0-C6 必須Read 範囲の PD-104 逸脱（PD-107 で解決） | §4.6 |
| η | 1 | 3層テスト戦略 × 完了コマンド3区分 DONE条件破綻 | §4.7 |
| θ | 1 | proposal_log_lint.sh セッションID取得未定義 | §4.8 |
| ι | 1 | wrangler whoami WARN でゲートバイパス | §4.9 |
| κ | 1 | pre-commit-sub [ -x HOOK ] 論理式バグ | §4.10 |
| λ | 1 | mission_risk_classifier.sh awk 対象ファイル抽出失敗 | §4.11 |
| μ | 1 | playwright realworld testDir モック混在 | §4.12 |

### 1.3 HIGH 8 新クラスター（21件）
| クラスター | 件数 | テーマ | §4対応節 |
|---|---:|---|---|
| ν | 1 | G7 スクリプトの二重記載 | §4.13 |
| ξ | 5 | SKIP / N/A / WARN の一貫性不足 | §4.14 |
| ο | 2 | Filter 1-7 定義不整合（R2パッケージ §5.4 vs sub_review_flow §2） | §4.15 |
| π | 2 | templates/** ADV書き込みホワイトリスト未定義 + "scripts/*実装*.js"曖昧用語 | §4.16 |
| ρ | 3 | G13 N日未定義 + [deploy.sh]タグ混入 | §4.17 |
| σ | 4 | 高リスク判定パスが§3.1.4 / §3.2.1 / §3.3 の3箇所で不整合 | §4.18 |
| τ | 2 | DEPLOY-RECOVER 書き込み主体未定義 | §4.19 |
| υ | 2 | Step 0 参照列挙 vs 全フロー廃止の矛盾 | §4.20 |

### 1.4 棄却項目
該当なし。CRITICAL 全 22 件採用、HIGH 49 件 R2.1 本文対応、残 7 件はゴールデン余地として保留（§8 に列挙）。

---

## §2. 採用確定項目 Part VI — 119件の集約サマリー

### 2.1 R1採用 76件（継承）
R1トリアージ（dev_system_v34_r1_triage.md §2）で採用確定した14クラスター（A〜H, K〜N）の76件は本R2.1でもすべて継承する。主要テーマ別に再掲:
- **クラスターA（macOS環境非互換）**: grep -P / sed -i / awk gensub / BSD date 等 GNU拡張依存の排除。POSIX + bash 3.2 互換化
- **クラスターB（Vite ビルド挙動）**: VITE_* 環境変数の静的置換、build時 define プラグイン配置
- **クラスターC（G番号体系）**: G1-G13 完全版ゲート表、番号衝突禁止
- **クラスターD（責務境界）**: PD-104 3分岐方式、ADV/ENG/PO の必須Read 分離
- **クラスターE（滞留セッション数）**: 日付ベース滞留判定、手動+1 廃止
- **クラスターF（起動時Read量）**: §C0 要約新設、条件付き再読
- **クラスターG（pre-commit-sub）**: 通常ファイル化、親 pre-commit から実行
- **クラスターH（整合性ドキュメント）**: §4.10 連鎖整合性 5項目
- **クラスターK-N**: 既存ゲート維持、SSOT 明示、Hフロー概念

### 2.2 R2採用 22件（新規、12クラスター α〜μ）
本R2.1 §4.1 〜 §4.12 で差分パッチ化。1.2 表の通り。

### 2.3 HIGH新クラスター採用 21件（ν〜υ）
本R2.1 §4.13 〜 §4.20 で差分パッチ化。1.3 表の通り。

### 2.4 差分確定（R2時点でPO承認済み）4件
R2 §3 で確定済み:
- クラスターI 3件（PD-105 案B 仕様厳格化の集中化）
- クラスターJ 1件（PD-106 案B Hフロー機械判定）

本R2.1でも継承。加えて PD-107（ζクラスター 2件の解決）を追加。

### 2.5 採用テーマの相互依存関係
- γ（G10据え置き）→ §4.8 既設 G11-G13 と新設 G14-G17 の番号体系確定の前提
- δ（risk_patterns.sh POSIX化）→ ε・λ・σ の全てが risk_patterns.sh を参照するため、δ修正が先に確定しないと他クラスター修正が破綻
- β（G8 実装更新）→ §4.6.3 証跡ファイル名を変更した以上、G8 実装も同じコミットで更新必須。G15 tdd_trace_consistency.sh で再発予防
- ρ（G13 タグ）→ G17（realworld証跡）の分離確定が先行する必要あり
- υ（Step 0）→ PD-105 原文の「Step 0 章単位集約」原則に完全準拠

---

## §3. PO承認済み確定仕様（PD-104/105/106/107）

### 3.1 PD-104: ADV/ENG/PO 責務境界3分岐 + 必須Read 役割別分離

**原文（docs/po-decisions.md より抜粋）:**
> 役割ごとに必要な情報量が異なる場合、一括「全員必須Read」ではなく役割ごとに必要最低限を定義する

**適用結果（本R2.1で確定）:**
| 役割 | 必須Read（毎セッション） | 条件付き再読（フロー Step 0 参照） |
|---|---|---|
| ENG（Claude Code） | §C0 要約 + CLAUDE.md + development_rules.md + session_progress.md キュー先頭 | §C1-C6 全文（該当フローで必要な章のみ） |
| ADV（Claude.ai） | §C0 要約 + CLAUDE.md + development_rules.md + session_progress.md + docs/po-decisions.md 直近10件 | §C1-C6 全文 + sub_adv_protocol.md（フロー判定時） |
| PO（ふとし） | 5行サマリー + キュー先頭 | なし（必要時 ADV が要約を提示） |

### 3.2 PD-105: 仕様厳格化は認証・決済・外部API呼び出しに集中

**原文（docs/po-decisions.md より抜粋）:**
> 案B（ソロ最適化）: Step 0 は章単位集約。3区分必須は高リスクのみ / 案B + 条件付きを採用

**適用結果（本R2.1で確定）:**
- **Step 0 = 章単位集約**（全22フロー個別列挙は禁止、§C0 に「Step 0 = §C0 + CLAUDE + rules + progress」と共通定義。各フローは "Step 0: §C0 参照" とだけ記載。υクラスター対応）
- **完了コマンド3区分必須 = 高リスク系（認証・決済・外部API呼び出し）のみ**。リスク判定は scripts/lib/risk_patterns.sh を SSOT とする
- 低/中リスクは N/A（理由必須）許容

### 3.3 PD-106: Hフロー発火条件は git diff ファイルパスで機械判定

**原文（docs/po-decisions.md より抜粋）:**
> 案B（限定）+ 機械判定を採用。発火条件を git diff のファイルパスで自動判定

**適用結果（本R2.1で確定）:**
- 発火条件 = scripts/lib/risk_patterns.sh の RISK_PATHS のいずれかに合致するファイルが git diff にある場合
- 発火判定は hflow_trigger_check.sh が CONTEXT 別に自動実行（pre-commit / pre-push / deploy.sh）→ εクラスター対応
- scripts/lib/risk_patterns.sh を SSOT 化、§3.1.4 / §3.2.1 / §3.3 の3箇所の記述を参照表記に統一（σクラスター対応）

### 3.4 PD-107: 必須Read は §C0 要約を固定、§C1-C6 全文は条件付き再読

**原文（docs/po-decisions.md より抜粋）:**
> 案A採用。PD-104 の「役割ごとに必要最低限を定義」原則に合致。クラスターF（起動時Read量過大）対応の設計意図を保持

**適用結果（本R2.1で確定）:**
- 必須Read に **§C0 要約（推定50-100行）を追加**（PD-104 原文では §C1-C6 全文だけだったところを PD-107 で拡張）
- §C1-C6 全文は**各フロー Step 0 参照時のみ**条件付き再読
- ENG/ADV の毎セッション Read 量 = 約 400行（§C0 + CLAUDE 221 + rules 76 + progress 5行サマリー）
- §4.1.2 / §2.6 / §4.1.6 の記述を A案で統一（ζクラスター対応）
- **PD-104 は原文不変、PD-107 で独立追加**

### 3.5 4 PD の一貫性
- PD-104 は「役割分離」、PD-105 は「リスク別厳格化」、PD-106 は「機械判定」、PD-107 は「必要最低限の要約固定」。いずれも**「ソロ開発者の実行コストを最小化しつつ、高リスク領域だけ厳格に守る」**という共通哲学
- 4 PD の適用対象はすべて本R2.1 §4 修正パッチで具体化されている

---

## §4. 改訂案反映差分 Part VII — 19クラスター修正パッチ

各節では以下の要素を含む:
- **該当CRITICAL/HIGH**: R2 JSON ファイルの ID 対応
- **R2 該当箇所**: dev_system_v34_r2_package.md 内の §番号
- **修正前（BEFORE）**: R2 での記述/設計
- **修正後（AFTER）**: R2.1 での確定記述/設計
- **根拠**: なぜその修正か
- **他クラスターとの整合**: 依存関係の確認

### §4.1 クラスター α — Vite SPA コミットハッシュ埋込の SSOT 定義

**該当**: R2 CRITICAL × 3（gemini_devops R-001, gemini_solo R-002, gpt54_devops R-001）+ HIGH × 2（§4.2.1 Step8 ポーリング前提不在）
**R2 該当箇所**: §4.2.1（C2フロー Step 8）、§4.2.5（3層テスト）、§4.4.3（高リスク系 DONE条件）

#### 4.1.1 修正後: アプリ種別ごとの埋込方式を SSOT 化

以下を **dev_system_spec.md §4.2.1 の直前**に新設（§4.2.0「デプロイ成果物のバージョン露出」として追加）:

```markdown
### §4.2.0 デプロイ成果物のバージョン露出（SSOT）

デプロイ完了判定（Step 8 ポーリング）と G16 deploy_hash_verify.sh は、
ビルド成果物にコミットハッシュが埋め込まれていることを前提とする。
フロントエンド種別ごとの埋込方式を以下の通り固定する:

| 種別 | 埋込先 | 埋込方式 | 検証コマンド |
|---|---|---|---|
| SPA (Vite) | `dist/index.html` + `dist/commit.txt` | vite.config.ts の `define` で `__COMMIT_SHA__` を置換 + ビルド後スクリプトで `dist/commit.txt` 生成 | `curl -s "$URL/commit.txt"` |
| Worker (Hono 等) | `/api/version` エンドポイント | ビルド時に `process.env.COMMIT_SHA` を定数化し、ハンドラで JSON 返却 | `curl -s "$URL/api/version" \| jq -r .commit` |
| Hybrid (Pages + Worker) | 両方 | 両方式を併用 | 両方 |

#### 実装サンプル — SPA（Vite）

**vite.config.ts**:
```ts
import { defineConfig } from 'vite';
import { execSync } from 'child_process';

const commitSha = execSync('git rev-parse HEAD').toString().trim();

export default defineConfig({
  define: {
    __COMMIT_SHA__: JSON.stringify(commitSha),
  },
  plugins: [
    {
      name: 'inject-commit-meta',
      transformIndexHtml(html) {
        return html.replace('</head>',
          `<meta name="commit-sha" content="${commitSha}"></head>`);
      },
    },
  ],
});
```

**package.json scripts** に追加:
```json
{
  "scripts": {
    "postbuild": "git rev-parse HEAD > dist/commit.txt"
  }
}
```

#### Step 8 ポーリング実装（全種別共通化）

```sh
# scripts/deploy_poll_hash.sh
URL="$1"
EXPECTED="$2"  # git rev-parse HEAD
TIMEOUT=30
START=$(date +%s)

while [ $(( $(date +%s) - START )) -lt "$TIMEOUT" ]; do
  # Try commit.txt first (SPA)
  actual=$(curl -sf "$URL/commit.txt" 2>/dev/null | tr -d '[:space:]')
  if [ "$actual" = "$EXPECTED" ]; then echo "OK (commit.txt)"; exit 0; fi

  # Try /api/version (Worker)
  actual=$(curl -sf "$URL/api/version" 2>/dev/null | sed -nE 's/.*"commit"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p')
  if [ "$actual" = "$EXPECTED" ]; then echo "OK (/api/version)"; exit 0; fi

  # Try meta tag (SPA fallback)
  actual=$(curl -sf "$URL/" 2>/dev/null | sed -nE 's/.*<meta name="commit-sha" content="([^"]+)".*/\1/p')
  if [ "$actual" = "$EXPECTED" ]; then echo "OK (meta tag)"; exit 0; fi

  sleep 2
done
echo "FAIL: hash $EXPECTED not detected in $URL after ${TIMEOUT}s"
exit 1
```
```

#### 4.1.2 §4.2.1 修正 — Step 8 の記述
**BEFORE（R2）**:
> Step 8: `curl -s "$URL" | grep -q "$COMMIT_HASH"` で新バージョン反映を確認

**AFTER（R2.1）**:
> Step 8: `scripts/deploy_poll_hash.sh "$URL" "$(git rev-parse HEAD)"` で新バージョン反映を確認。埋込方式は §4.2.0 SSOT 参照

#### 4.1.3 §4.4.3 修正 — デッドロック解消
R2 では「高リスク系は Step 12 cmd-realworld PASS まで DONE 不可」のため Step 8 で停止するとデッドロック。Step 8 を上記 SSOT 実装で必ず PASS 可能にすることでデッドロック解消。

#### 4.1.4 他クラスター整合
- γクラスター: G16 deploy_hash_verify.sh（§5.3）は §4.2.0 SSOT に準拠
- βクラスター: G17 realworld_proof_check.sh は Step 12 で hash 検証済み前提

---

### §4.2 クラスター β — G8 TDD 証跡 × canopy_common.sh 同期 + realworld 分離

**該当**: R2 CRITICAL × 4（gemini_devops R-002, gemini_qa R-001, gemini_solo R-005, gpt54_qa R-002）+ HIGH × 1（MISSING §4.6.3）
**R2 該当箇所**: §4.6.3、§4.8 G8 定義、§2.8

#### 4.2.1 §4.8 G8 定義の修正
**BEFORE（R2）**:
> G8 = TDD証跡（before.json / after.json）

**AFTER（R2.1）**:
> G8 = TDD証跡（unit/e2e 限定）。realworld は G17 対象外

#### 4.2.2 §4.6.3 証跡ファイル表の再構築

| 層 | ファイル名 | 対象ゲート | 必須条件 |
|---|---|---|---|
| L1-unit | `logs/<mission>/before-unit.json`, `after-unit.json` | G8 | RED→GREEN 遷移必須 |
| L2-e2e | `logs/<mission>/before-e2e.json`, `after-e2e.json` | G8 | RED→GREEN 遷移必須 |
| L3-realworld | `logs/realworld/<mission>/realworld-proof.json` + `realworld-screenshots/` | **G17（新設）** | RED 不要。deploy後の実機検証証跡 |

**重要**: `before-realworld.json` / `after-realworld.json` は廃止。realworld は本質的にデプロイ後確認のため RED段階ログ要求は非現実的（gpt54_qa R-002 指摘）。

#### 4.2.3 canopy_common.sh::check_tdd 実装差分

```sh
# scripts/lib/canopy_common.sh — check_tdd 関数 AFTER
check_tdd() {
  local mission_dir="$1"
  local has_trace=0
  for kind in unit e2e; do
    local before="$mission_dir/before-$kind.json"
    local after="$mission_dir/after-$kind.json"
    # 両方存在しなければ該当層はスキップ
    if [ -f "$before" ] && [ -f "$after" ]; then
      # RED: before.failed > 0
      if ! jq -e '.failed > 0' "$before" > /dev/null 2>&1; then
        echo "FAIL: G8 $kind before.failed not > 0 (RED段階不成立)"; return 1
      fi
      # GREEN: after.failed == 0
      if ! jq -e '.failed == 0' "$after" > /dev/null 2>&1; then
        echo "FAIL: G8 $kind after.failed not == 0 (GREEN段階不成立)"; return 1
      fi
      has_trace=1
    fi
  done
  [ "$has_trace" -eq 1 ] || { echo "FAIL: G8 no trace for unit/e2e"; return 1; }
  return 0
}
```

#### 4.2.4 G15 tdd_trace_consistency.sh による再発予防
詳細は §5.2 参照。要旨: docs/plans/*.md と canopy_common.sh で参照される before-*.json / after-*.json のファイル名が一致しているかを pre-commit で静的検証。

#### 4.2.5 他クラスター整合
- γ: G17（realworld_proof_check.sh）を新設。G8 と完全分離
- η: DONE 条件で「cmd-realworld PASS」を G17 経由で判定
- ρ: G13 発火ログに [deploy.sh] タグを含めない（G17 とレイヤー分離）

---

### §4.3 クラスター γ — G10 番号据え置き + G1-G17 完全表

**該当**: R2 CRITICAL × 3（gemini_tech_writer R-001, gpt54_devops R-003, gpt54_tech_writer R-001）+ HIGH × 3（§4.8 G10消失関連）
**R2 該当箇所**: §4.8 G1-G13 完全版表

#### 4.3.1 §4.8 ゲート表の再構築（G1-G17 完全版）

| G | 名称 | スクリプト/実装 | 発火タイミング | 追加時期 |
|---|---|---|---|---|
| G1 | バージョン同期 | scripts/version_sync.sh | pre-commit | 既設 |
| G2 | Stage A 健全性 | canopy_common.sh::check_stage_a | Stage A | 既設 |
| G3 | テスト項目数 | canopy_common.sh::check_test_count | pre-commit + Stage A | 既設 |
| G4 | テスト全PASS | canopy_common.sh::check_test_pass | pre-commit + Stage A | 既設 |
| G5 | 報告フォーマット | canopy_common.sh::check_report_format | Stage A | 既設 |
| G6 | デプロイパイプライン | canopy_common.sh::check_deploy_pipeline | pre-push + deploy | 既設 |
| G7 | 仕様↔完了コマンド対応 | canopy_common.sh::check_spec_map | pre-commit + Stage A | 既設 |
| G8 | TDD証跡（unit/e2e限定） | canopy_common.sh::check_tdd | pre-commit + Stage A | 既設（定義修正）|
| G9 | UIスクショ判定 | canopy_common.sh::check_ui_screenshot | Stage A | 既設 |
| **G10** | **シークレットスキャン（据え置き）** | pre-commit + canopy_common.sh::check_secrets | pre-commit + pre-push | **既設・据え置き** |
| G11 | Step 0 参照漏れ検出 | scripts/step0_lint.sh | pre-commit + Stage A | R2 新設 |
| G12 | 提案ログ形式検証 | scripts/proposal_log_lint.sh | pre-commit | R2 新設 |
| G13 | pre-commit フック発火確認 | scripts/verify_hooks.sh | pre-commit + pre-push | R2 新設 |
| **G14** | **仕様書ファースト** | scripts/spec_first_lint.sh | pre-commit + Stage A | **R2.1 新設** |
| **G15** | **TDD証跡 ↔ canopy 同期** | scripts/tdd_trace_consistency.sh | pre-commit（canopy変更時） | **R2.1 新設** |
| **G16** | **デプロイhash埋込検証** | scripts/deploy_hash_verify.sh | pre-deploy | **R2.1 新設** |
| **G17** | **realworld 証跡** | scripts/realworld_proof_check.sh | post-deploy | **R2.1 新設** |

**重要な方針**:
- 既存 G1-G10 の意味は**一切変更しない**（後方互換性）
- 新設ゲートは必ず空き番号を採番（クラスターγ の根本原因だった「番号上書き」は禁止）
- G10 = シークレットスキャン（pre-commit + canopy 連携）は現行仕様のまま

#### 4.3.2 §4.9.1 development_rules.md 連鎖更新
- G1-G10 の記述を維持
- G11-G17 を追加
- 旧記述「G10 = 仕様書ファースト」は **完全削除**（混乱の元）

#### 4.3.3 CLAUDE.md 連鎖更新
development_rules.md §品質ゲート G1-G7 の参照を G1-G17 に拡張。具体実装は development_rules.md + dev_system_spec.md §4.8 参照の形式を維持。

#### 4.3.4 sub_infrastructure.md 連鎖更新
G番号の参照箇所を全て再チェック。G10 = シークレットスキャンの記述は据え置き。G11-G17 の参照を追記。

#### 4.3.5 他クラスター整合
- β: G15 / G17 が正しく採番されている
- γ: G14（旧 spec_first_lint）が別番号で存続、機能喪失なし
- ν: G7 スクリプトの二重記載問題も本表で正本化（check_spec_map に確定）

---

### §4.4 クラスター δ — bash 3.2 / POSIX 互換 RISK_PATHS 設計

**該当**: R2 CRITICAL × 2（gpt54_ai_ops R-003, gpt54_devops R-002）+ HIGH × 2（ROBUSTNESS / FEASIBILITY §3.1.4）
**R2 該当箇所**: §3.1.4、§3.2.1、§3.3、§4.3.4、§4.3.5

#### 4.4.1 scripts/lib/risk_patterns.sh を改行区切り文字列で統一

**AFTER（R2.1 確定実装）**:
```sh
#!/bin/sh
# scripts/lib/risk_patterns.sh
# 高リスクファイルパスプレフィックスの SSOT（単一情報源）
# PD-105 / PD-106 の機械判定基準。§3.1.4 / §3.2.1 / §3.3 はこのファイルを参照

# 1行1パターン、# で始まる行はコメント、空行は無視
# prefix match のみ対応（前方一致）
RISK_PATHS='src/auth/
src/payment/
src/services/supabase.ts
src/services/external/
src/services/stripe/
supabase/migrations/
.env
.dev.vars
wrangler.toml'

export RISK_PATHS
```

#### 4.4.2 共通関数 is_risk_path の POSIX 実装

**scripts/lib/risk_match.sh（新設）**:
```sh
#!/bin/sh
# risk_match.sh — RISK_PATHS との prefix match 判定（POSIX sh 互換、bash 3.2 対応）

# $(dirname "$0") を使わず sh source 先のスクリプトからは必ず絶対パスで読み込む
. "$(cd "$(dirname "$0")" && pwd)/risk_patterns.sh"

# is_risk_path <path> → 0 if match, 1 if not match
is_risk_path() {
  target="$1"
  [ -z "$target" ] && return 1

  # printf + while read で配列を使わず反復
  echo "$RISK_PATHS" | while IFS= read -r pattern; do
    # コメント・空行スキップ
    case "$pattern" in
      '#'*|'') continue ;;
    esac
    # prefix match（case 文は POSIX sh 標準、glob 対応）
    case "$target" in
      "$pattern"*) echo "MATCH:$pattern"; exit 0 ;;
    esac
  done
  return 1
}

# any_risk_path <space-separated-paths> → 0 if any match, 1 if none match
any_risk_path() {
  paths="$1"
  for p in $paths; do
    if is_risk_path "$p" | grep -q '^MATCH:'; then
      return 0
    fi
  done
  return 1
}
```

#### 4.4.3 mission_risk_classifier.sh の POSIX 書き直し

```sh
#!/bin/sh
# scripts/mission_risk_classifier.sh
# ミッション定義ファイルを入力に、リスク分類（high/mid/low）を stdout 出力

. "$(cd "$(dirname "$0")" && pwd)/lib/risk_match.sh"

mission_file="$1"
[ -f "$mission_file" ] || { echo "ERROR: mission file not found: $mission_file" >&2; exit 2; }

# 対象ファイル抽出（λクラスター修正：§4.11 参照）
target_files=$(grep -E '^>?[[:space:]]*対象ファイル:' "$mission_file" | \
  sed -E 's/^>?[[:space:]]*対象ファイル:[[:space:]]*//' | \
  tr ',' '\n' | \
  sed -E 's/^[[:space:]]+|[[:space:]]+$//g' | \
  grep -v '^$')

[ -z "$target_files" ] && { echo "low"; exit 0; }

# いずれかが RISK_PATHS にマッチすれば high
for f in $target_files; do
  if echo "$RISK_PATHS" | while IFS= read -r pattern; do
    case "$pattern" in '#'*|'') continue ;; esac
    case "$f" in "$pattern"*) exit 0 ;; esac
  done; then
    echo "high"; exit 0
  fi
done

# TODO: mid の判定基準は将来拡張（現状は high/low のみ）
echo "low"
```

#### 4.4.4 §3.1.4 / §3.2.1 / §3.3 を参照表記に統一

**BEFORE（R2、3箇所に分散）**:
- §3.1.4: 「高リスクファイル = src/services/external/**」
- §3.2.1: 「Hフロー発火 = src/auth/** / src/payment/** / supabase.ts」
- §3.3: 「機械判定は prefix match と完全一致の両方が必要」（曖昧）

**AFTER（R2.1、SSOT化）**:
- §3.1.4: 「高リスクファイルの定義は `scripts/lib/risk_patterns.sh` の RISK_PATHS を正本とする。PD-105 による集中対象と一致」
- §3.2.1: 「Hフロー発火条件は PD-106 により `scripts/lib/risk_patterns.sh` の RISK_PATHS のいずれかに合致する場合。判定方式は prefix match に統一」
- §3.3: 「判定方式 = prefix match。hflow_trigger_check.sh と mission_risk_classifier.sh は共通関数 `scripts/lib/risk_match.sh::is_risk_path` を使用」

#### 4.4.5 shellcheck による静的検査の組込

pre-commit で以下を実行（既設 G1 の拡張）:
```sh
# scripts/*.sh と scripts/lib/*.sh を POSIX sh 互換で検査
find scripts -name "*.sh" -not -path '*/node_modules/*' | \
  xargs shellcheck --shell=sh --severity=warning
```

**禁止構文チェックリスト**（shellcheck でエラー化）:
- `[[ ... ]]`（bash 拡張、`[ ... ]` または `case` 文に置き換え）
- `${arr[@]}` / `${arr[*]}`（配列、改行区切り文字列+while read に置き換え）
- `<(cmd)` プロセス置換（パイプに置き換え）
- `mapfile` / `readarray`（while read に置き換え）
- `(( ... ))` 算術評価（`$(( ... ))` は POSIX で可）

#### 4.4.6 他クラスター整合
- ε: hflow_trigger_check.sh も risk_match.sh を使用
- λ: mission_risk_classifier.sh の awk 抽出を §4.4.3 の grep+sed に変更
- σ: §3.1.4 / §3.2.1 / §3.3 の3箇所揺れを §4.4.4 で解消

---

### §4.5 クラスター ε — hflow_trigger_check.sh の CONTEXT 別 git diff

**該当**: R2 CRITICAL × 2（gemini_devops R-003, gemini_qa R-002）+ HIGH × 3（§3.2.2 / §4.3.5 / §4.5.6）
**R2 該当箇所**: §3.2.2、§4.3.5

#### 4.5.1 hflow_trigger_check.sh CONTEXT 分岐実装

```sh
#!/bin/sh
# scripts/hflow_trigger_check.sh
# Hフロー発火判定。CONTEXT 別に git diff の取得方法を分岐

. "$(cd "$(dirname "$0")" && pwd)/lib/risk_match.sh"

CONTEXT="${HFLOW_CONTEXT:-auto}"

get_changed_files() {
  case "$1" in
    pre-commit)
      git diff --cached --name-only
      ;;
    pre-push|deploy)
      base=$(git merge-base origin/main HEAD 2>/dev/null)
      [ -z "$base" ] && base="HEAD~1"
      git diff --name-only "$base"...HEAD
      ;;
    auto)
      # GIT_INDEX_FILE が設定されていれば pre-commit 文脈
      if [ -n "$GIT_INDEX_FILE" ]; then
        get_changed_files pre-commit
      else
        get_changed_files pre-push
      fi
      ;;
    *)
      echo "ERROR: unknown CONTEXT '$1'" >&2; return 2 ;;
  esac
}

changed=$(get_changed_files "$CONTEXT") || exit $?

# 発火判定
for f in $changed; do
  if echo "$RISK_PATHS" | while IFS= read -r pattern; do
    case "$pattern" in '#'*|'') continue ;; esac
    case "$f" in "$pattern"*) exit 0 ;; esac
  done; then
    echo "HFLOW_TRIGGER=1 context=$CONTEXT matched=$f"
    exit 0
  fi
done

echo "HFLOW_TRIGGER=0 context=$CONTEXT no_match"
exit 0  # 発火しないのは正常ケース（exit 1 はエラー扱いのため避ける）
```

#### 4.5.2 §3.2.2 / §4.3.5 の呼び出し位置明記

**pre-commit フック** (`.git/hooks/pre-commit` または husky/lefthook 経由):
```sh
HFLOW_CONTEXT=pre-commit scripts/hflow_trigger_check.sh
# 発火時は警告のみ（コミットブロックはしない。過剰介入回避）
```

**pre-push フック**:
```sh
HFLOW_CONTEXT=pre-push scripts/hflow_trigger_check.sh | tee logs/hflow_trigger.log
```

**deploy.sh 冒頭**:
```sh
HFLOW_CONTEXT=deploy scripts/hflow_trigger_check.sh > /tmp/hflow.txt
if grep -q 'HFLOW_TRIGGER=1' /tmp/hflow.txt; then
  # Hフロー（統合フローレビュー）を deploy 前に要求する旨を明示
  echo "[hflow] triggered. Run sub_review_flow §4.H before deploy completion."
fi
```

#### 4.5.3 affected-tests.sh との設計一貫性
既存の affected-tests.sh は `git merge-base origin/main HEAD` を使用している。本R2.1 で hflow_trigger_check.sh も同じパターンに統一（gemini_qa R-002 の提案採用）。

#### 4.5.4 他クラスター整合
- δ: risk_match.sh を共通使用
- PD-106: 機械判定の実装としてこの実装が正本

---

### §4.6 クラスター ζ — §C0 必須Read + §C1-C6 条件付き再読（PD-107）

**該当**: R2 CRITICAL × 2（gemini_solo R-001, gpt54_tech_writer R-002）+ HIGH × 3（§4.1.2 / §4.1.6 / §2.6 矛盾系）
**R2 該当箇所**: §2.6、§4.1.2、§4.1.6、§6.2 PD-104引用

#### 4.6.1 §4.1.2 役割別 Read 表の AFTER 版

以下で §4.1.2 を完全に置き換える:

```markdown
### §4.1.2 役割別 Read 表（PD-104 + PD-107 適用後）

| 役割 | 必須Read（毎セッション） | 条件付き再読 |
|---|---|---|
| ENG | §C0 要約 + CLAUDE.md + development_rules.md + session_progress.md キュー先頭 | フロー Step 0 で指示された §C1-C6 の該当章 |
| ADV | §C0 要約 + CLAUDE.md + development_rules.md + session_progress.md + docs/po-decisions.md 直近10件 | フロー Step 0 で指示された §C1-C6 の該当章 + sub_adv_protocol.md |
| PO | 5行サマリー + キュー先頭 | なし（必要時 ADV が要約を提示） |

**運用上の Read 量概算**:
- ENG 起動時: §C0 50-100行 + CLAUDE 221行 + rules 76行 + progress 5行サマリー = **約 400行**
- ADV 起動時: 上記 + po-decisions 直近10件 = **約 500行**

**§C1-C6 全文の参照は「Step 0 で明示的に指示された章」のみ**。R2 改訂案 §4.1.7 の Step 0 定義でどの §C が必要かフロー別に記載。
```

#### 4.6.2 §2.6 の修正
**BEFORE（R2）**: 「毎回必須は§C0のみ、§C1-C6は条件付き再読」
**AFTER（R2.1）**: 「毎回必須は§C0 + CLAUDE.md + development_rules.md + session_progress.md。§C1-C6 は各フロー Step 0 の指示に従い条件付き再読」

#### 4.6.3 §4.1.6 の修正
§C0 の位置づけ記述を以下で統一:
> §C0 は §C1-C6 の 1ページ要約（推定 50-100行）。設計 DNA を短時間で想起するための必須 Read。PD-107 により公式化。§C1-C6 の正本性は不変で、§C0 はあくまで起動時要約の位置づけ

#### 4.6.4 §6.2 PD-104 引用の修正
**BEFORE**: PD-104 原文を「§C0-C6」と引用
**AFTER**: PD-104 原文は「§C1-C6」のまま引用（原文不変）。§C0 は PD-107 による拡張として別項で明示:
> PD-104 原文: ENG/ADV 必須Read = §C1-C6
> PD-107 拡張（2026-04-19）: 必須Read に §C0 要約を追加、§C1-C6 は条件付き再読に変更

#### 4.6.5 他クラスター整合
- υ: Step 0 章単位集約と整合（Step 0 = §C0 参照、個別列挙なし）
- PD-105: Step 0 の章単位集約原則を守る

---

### §4.7 クラスター η — 3状態モデル + リスク別 DONE 条件表

**該当**: R2 CRITICAL × 1（gpt54_qa R-001）+ HIGH × 4（§3.1.3 / §4.2.3 / §4.2.5 / §4.4.2）
**R2 該当箇所**: §3.1.3、§4.2.5、§4.4.3、§4.4.2

#### 4.7.1 ミッションSTATUS の3状態モデル（新設）

以下を **dev_system_spec.md §4.2 の冒頭に新設**（§4.2.-1 「ミッションSTATUS 3状態モデル」として）:

```markdown
### §4.2.-1 ミッションSTATUS の3状態モデル

ミッション実行の進捗を以下の3状態で追跡する。session_progress.md のミッション定義に
`STATUS: ...` として記載し、canopy が自動遷移を検出する。

| STATUS | 意味 | 遷移条件 |
|---|---|---|
| IN_PROGRESS | 実装中 | ミッション着手時（初期状態） |
| READY_FOR_DEPLOY | 実装完了・デプロイ待ち | cmd-unit + cmd-e2e PASS（高リスク系のみ使用） |
| DONE | ミッション完了 | 低/中: cmd-unit (+cmd-e2e) PASS / 高: deploy後 cmd-realworld PASS |

**高リスク系のみ READY_FOR_DEPLOY を経由する**。低/中リスク系は IN_PROGRESS → DONE の2状態で完結。

**STATUS 書き込み主体**:
- IN_PROGRESS → READY_FOR_DEPLOY: ENG が cmd-unit/cmd-e2e PASS 後に手動更新
- READY_FOR_DEPLOY → DONE: deploy.sh 成功 + scripts/realworld_proof_check.sh PASS で自動更新
```

#### 4.7.2 リスク別 DONE 条件表（§4.4.3 を以下で置換）

```markdown
### §4.4.3 リスク別 DONE 条件

| リスク | cmd-unit | cmd-e2e | cmd-realworld | 中間STATUS | DONE条件 |
|---|---|---|---|---|---|
| 低 | 必須 | N/A可（理由必須） | N/A可 | なし | cmd-unit PASS |
| 中 | 必須 | 必須 | N/A可（理由必須） | なし | cmd-unit + cmd-e2e PASS |
| 高（認証/決済/外部API） | 必須 | 必須 | 必須 | READY_FOR_DEPLOY | 全3区分 PASS + deploy後 cmd-realworld PASS |

**リスク判定**: `scripts/mission_risk_classifier.sh <mission-file>` が返す high/mid/low を使用。
high 判定条件は `scripts/lib/risk_patterns.sh` の RISK_PATHS を正本とする（§3.1.4 / §3.2.1 / §3.3 参照）。
```

#### 4.7.3 §3.1.3 / §4.2.5 の修正

- §3.1.3 を §4.4.3 の参照表記に簡略化（二重管理回避）
- §4.2.5 の「L1-realworld = デプロイ直後、L2 = 実装完了」の対応表を、§4.2.-1 の3状態モデルを前提に書き直す

#### 4.7.4 §4.4.2 「高リスク系は3区分すべて必須」×「N/A可」の衝突解消

**BEFORE（R2）**: 「高リスク系: cmd-unit / cmd-e2e / cmd-realworld すべて必須」「N/A は理由必須で許容」
**AFTER（R2.1）**: 「高リスク系は3区分すべて必須。N/A は不可（FAIL扱い）。SKIP は理由＋リトライ予定で一時許容（DONE不可）」

（ξクラスター §4.14 と併合。SKIP/N/A/WARN の厳密定義は §4.14 参照）

#### 4.7.5 他クラスター整合
- ξ: SKIP/N/A/WARN の定義と完全整合
- ρ: G13 発火ログは [pre-commit] [pre-push] のみ（deploy後 realworld は G17）
- τ: DEPLOY-RECOVER の実装主体が deploy.sh 自動（READY_FOR_DEPLOY → IN_PROGRESS 再戻しも自動）

---

### §4.8 クラスター θ — proposal_log_lint.sh 日付ベース滞留判定

**該当**: R2 CRITICAL × 1（gemini_solo R-006）+ HIGH × 2（FEASIBILITY §4.3.3 / BSD date 非互換）
**R2 該当箇所**: §4.3.3

#### 4.8.1 提案ログフォーマット固定

session_progress.md の提案ログは以下フォーマット必須:

```markdown
### 提案タイトル (YYYY-MM-DD G_NN)
- **STATUS:** SUGGESTED | WAITING_PO | APPROVED | REJECTED
- **提案日:** YYYY-MM-DD
- **滞留日数:** {自動計算、proposal_log_lint.sh が更新}
  ...
```

#### 4.8.2 proposal_log_lint.sh 実装（BSD/GNU date両対応）

```sh
#!/bin/sh
# scripts/proposal_log_lint.sh
# session_progress.md の提案ログ滞留を検出し、閾値超過を WARN または FAIL する
# セッションID差分はサポートしない（日付差分のみ）

THRESHOLD_DAYS="${PROPOSAL_STALE_DAYS:-7}"
PROGRESS_FILE="${1:-instructions/session_progress.md}"

[ -f "$PROGRESS_FILE" ] || { echo "ERROR: file not found: $PROGRESS_FILE" >&2; exit 2; }

# 日付を epoch に変換（macOS BSD / Linux GNU date 両対応）
date_to_epoch() {
  d="$1"
  # macOS BSD date
  if epoch=$(date -j -f "%Y-%m-%d" "$d" +%s 2>/dev/null); then
    echo "$epoch"; return 0
  fi
  # Linux GNU date
  if epoch=$(date -d "$d" +%s 2>/dev/null); then
    echo "$epoch"; return 0
  fi
  echo "ERROR: date parse failed for '$d'" >&2; return 1
}

NOW=$(date +%s)
STALE_COUNT=0

# 提案ヘッダ行を抽出: `### タイトル (YYYY-MM-DD G_NN)`
grep -nE '^### .+ \([0-9]{4}-[0-9]{2}-[0-9]{2} G_[0-9]+\)' "$PROGRESS_FILE" | \
while IFS=: read -r lineno line; do
  proposal_date=$(echo "$line" | sed -nE 's/.*\(([0-9]{4}-[0-9]{2}-[0-9]{2}) G_[0-9]+\).*/\1/p')
  [ -z "$proposal_date" ] && continue

  proposal_epoch=$(date_to_epoch "$proposal_date") || continue
  days=$(( (NOW - proposal_epoch) / 86400 ))

  # 次の10行以内に STATUS: SUGGESTED または WAITING_PO が含まれるか確認
  sed -n "${lineno},$((lineno+10))p" "$PROGRESS_FILE" | \
    grep -qE 'STATUS:[[:space:]]*(SUGGESTED|WAITING_PO)' || continue

  if [ "$days" -ge "$THRESHOLD_DAYS" ]; then
    echo "STALE (${days}d): L${lineno} $line"
    STALE_COUNT=$((STALE_COUNT+1))
  fi
done

if [ "$STALE_COUNT" -gt 0 ]; then
  echo "WARN: $STALE_COUNT stale proposals detected (threshold: ${THRESHOLD_DAYS}d)"
  exit 0  # WARN のため exit 0（FAIL にすると pre-commit がブロックされる）
fi
exit 0
```

#### 4.8.3 §4.3.3 記述の修正
**BEFORE（R2）**: 「セッションID（例: G_42）との差分を動的計算」
**AFTER（R2.1）**: 「提案日（YYYY-MM-DD）と現在日時の差分（デフォルト 7日）で滞留を判定。BSD date / GNU date 両対応」

#### 4.8.4 G12 発火タイミング
pre-commit（canopy 経由）。STALE_COUNT > 0 で WARN 出力するが exit 0（コミットは許可）。

#### 4.8.5 他クラスター整合
- 既設 G12 の実装がこれで確定
- ν: G12 スクリプト参照が正本化

---

### §4.9 クラスター ι — verify_external_services.sh リスク別分岐

**該当**: R2 CRITICAL × 1（gemini_qa R-004）+ HIGH × 2（AMBIGUITY 手動証跡の定義）
**R2 該当箇所**: §4.2.2、§4.3.2

#### 4.9.1 verify_external_services.sh のリスク別 FAIL/WARN 分岐

```sh
#!/bin/sh
# scripts/verify_external_services.sh
# 外部サービス認証状態を検証。ミッションリスクにより FAIL/WARN 分岐

MISSION_FILE="${1:-}"
[ -n "$MISSION_FILE" ] || { echo "Usage: $0 <mission-file>" >&2; exit 2; }

# mission_risk_classifier.sh でリスク判定（λクラスター修正後版）
MISSION_RISK=$(scripts/mission_risk_classifier.sh "$MISSION_FILE")

# wrangler 認証チェック
if ! wrangler whoami > /dev/null 2>&1; then
  if [ "$MISSION_RISK" = "high" ]; then
    cat >&2 <<EOF
FAIL: wrangler not authenticated AND mission is high-risk (auth/payment/external-api)
  required one of:
    1. wrangler login
    2. 代替証跡: ローカルエミュレータ (wrangler dev) で検証
       → logs/realworld/<mission>/local-emu-proof.json に出力
    3. 代替証跡: session_progress.md 内に検証手順と結果を ENG が明記
       → フォーマット:
         【代替証跡】wrangler dev で XXX を検証: YYY が返却された (YYYY-MM-DD HH:MM)
EOF
    exit 1
  else
    echo "WARN: wrangler not authenticated (low/mid-risk mission, manual verification acceptable)"
    echo "WARN: 手動代替証跡を session_progress.md に記載することを推奨"
    exit 0  # WARN
  fi
fi

# Supabase CLI チェック（決済・認証ミッションで必要）
if [ "$MISSION_RISK" = "high" ]; then
  if ! supabase status > /dev/null 2>&1; then
    echo "FAIL: supabase CLI not initialized for high-risk mission" >&2
    exit 1
  fi
fi

exit 0
```

#### 4.9.2 §4.2.2 / §4.3.2 の記述整合

- §4.2.2: 「認証・決済・外部API の未設定は **高リスク系ミッションでは FAIL**。低/中リスクでは WARN 許容（手動代替証跡必須）」
- §4.3.2: 「wrangler whoami 未認証時は `scripts/verify_external_services.sh` がミッションリスクに応じて FAIL/WARN を分岐。詳細は §4.9 参照」

#### 4.9.3 代替証跡の具体化（HIGH 対応）
HIGH で指摘された「手動証跡の定義曖昧」を解消:
- **代替証跡の受入形式**（3パターン）:
  1. `logs/realworld/<mission>/local-emu-proof.json`（wrangler dev / supabase local 等のログ）
  2. `logs/realworld/<mission>/screenshots/`（ローカル起動スクショ）
  3. session_progress.md 内の構造化記載（フォーマット固定: `【代替証跡】<対象> を検証: <結果> (<日時>)`）

#### 4.9.4 他クラスター整合
- δ: mission_risk_classifier.sh を正しく呼び出し
- λ: 同上
- ξ: WARN は「理由必須」と SKIP/N/A/WARN 定義に整合

---

### §4.10 クラスター κ — pre-commit-sub 論理式修正

**該当**: R2 CRITICAL × 1（gemini_solo R-004）+ HIGH × 1（ROBUSTNESS ルート外 source）
**R2 該当箇所**: §4.5.1、§4.5.7

#### 4.10.1 親 pre-commit フック内の呼び出し修正

```sh
# .git/hooks/pre-commit（該当部分）

# BEFORE（R2、論理式バグ）
# HOOK_SUB="$SUBDIR_ROOT/scripts/pre-commit-sub.sh"
# [ -x "$HOOK_SUB" ] && "$HOOK_SUB" || exit 1  # ← 存在しない場合に exit 1 が実行される

# AFTER（R2.1）
for SUBDIR_ROOT in lais goal-ai-worker; do
  HOOK_SUB="$SUBDIR_ROOT/scripts/pre-commit-sub.sh"
  if [ -x "$HOOK_SUB" ]; then
    # サブディレクトリに cd してから実行（相対パス処理対応）
    (cd "$SUBDIR_ROOT" && ./scripts/pre-commit-sub.sh) || exit $?
  fi
  # フック未配置は正常ケース（サブディレクトリ未使用プロジェクト）
done
```

#### 4.10.2 §4.5.1 / §4.5.7 の記述修正
- 「`[ -x HOOK ] && HOOK || exit 1` パターン使用」の表記を全削除
- 代わりに「if 文 + サブシェル cd」パターンを正本として明記

#### 4.10.3 verify_hooks.sh（G13）に論理式検査追加

G13 スクリプトで親 pre-commit の内容を静的検査し、以下を FAIL 扱い:
- `[ -x "$HOOK" ] && "$HOOK" || exit` パターンの存在
- サブシェル cd なしでサブディレクトリフックを実行する記述

```sh
# scripts/verify_hooks.sh 追加部分
check_precommit_logic() {
  hook=".git/hooks/pre-commit"
  [ -f "$hook" ] || { echo "FAIL: pre-commit hook not found"; return 1; }

  # 論理式バグパターン検出
  if grep -qE '\[ -x ".*" \] && ".*" \|\| exit' "$hook"; then
    echo "FAIL: buggy logic detected in pre-commit: '[ -x HOOK ] && HOOK || exit'"
    echo "  → use 'if [ -x HOOK ]; then ... fi' instead"
    return 1
  fi
  return 0
}
```

#### 4.10.4 他クラスター整合
- G13（既設）の実装がこれで強化される
- 既設 G10 シークレットスキャンとの発火順序整合（G10 → G13 → G8-G9 → G11-G12）

---

### §4.11 クラスター λ — mission_risk_classifier.sh 対象ファイル抽出

**該当**: R2 CRITICAL × 1（gemini_solo R-003）+ HIGH × 2（FEASIBILITY §4.3.4 引用符付き）
**R2 該当箇所**: §4.3.4、§5 ミッション定義テンプレ v3

#### 4.11.1 対象ファイル抽出ロジック（POSIX grep + sed）

§4.4.3 の mission_risk_classifier.sh 内で以下を使用（再掲）:

```sh
# 対象ファイル抽出（引用 `>` 有無両対応、1行カンマ区切り / 複数行両対応）
target_files=$(grep -E '^>?[[:space:]]*対象ファイル:' "$mission_file" | \
  sed -E 's/^>?[[:space:]]*対象ファイル:[[:space:]]*//' | \
  tr ',' '\n' | \
  sed -E 's/^[[:space:]]+|[[:space:]]+$//g' | \
  grep -v '^$')
```

#### 4.11.2 ミッション定義テンプレ v3 の「対象ファイル」行フォーマット固定（§5 に追記）

```markdown
### ミッション定義テンプレート v3 — 対象ファイル行フォーマット

以下2形式のいずれかを使用（mission_risk_classifier.sh は両対応）:

**形式1（標準: 引用 + 1行カンマ区切り）**:
> 対象ファイル: src/xxx.js, src/yyy.ts, supabase/migrations/20260419_xxx.sql

**形式2（許容: 引用 + 複数行リスト）**:
> 対象ファイル:
>   - src/xxx.js
>   - src/yyy.ts
>   - supabase/migrations/20260419_xxx.sql
```

#### 4.11.3 検証テストケース（3種）

mission_risk_classifier.sh の動作確認として `tests/unit/risk_classifier.test.sh` を新設:

```sh
# tests/unit/risk_classifier.test.sh
# Test 1: 標準形式（引用 + カンマ区切り）
cat > /tmp/m1.md <<'EOF'
### MISSION-TEST-001
> 対象ファイル: src/auth/login.ts, src/payment/stripe.ts
EOF
result=$(scripts/mission_risk_classifier.sh /tmp/m1.md)
[ "$result" = "high" ] || { echo "FAIL Test1: expected 'high', got '$result'"; exit 1; }

# Test 2: 複数行リスト形式
cat > /tmp/m2.md <<'EOF'
### MISSION-TEST-002
> 対象ファイル:
>   - src/auth/oauth.ts
>   - src/services/external/api.ts
EOF
result=$(scripts/mission_risk_classifier.sh /tmp/m2.md)
[ "$result" = "high" ] || { echo "FAIL Test2: expected 'high', got '$result'"; exit 1; }

# Test 3: 低リスク
cat > /tmp/m3.md <<'EOF'
### MISSION-TEST-003
> 対象ファイル: src/components/Button.tsx
EOF
result=$(scripts/mission_risk_classifier.sh /tmp/m3.md)
[ "$result" = "low" ] || { echo "FAIL Test3: expected 'low', got '$result'"; exit 1; }

echo "PASS: all 3 test cases"
```

#### 4.11.4 他クラスター整合
- δ: risk_match.sh との連携が正しく動作
- 既設 G1 の shellcheck でこのテストスクリプトも POSIX 互換検査対象

---

### §4.12 クラスター μ — playwright realworld testDir 固定

**該当**: R2 CRITICAL × 1（gemini_qa R-003）+ HIGH × 1（§4.4.5 testDir 広範化）
**R2 該当箇所**: §4.4.5

#### 4.12.1 playwright.realworld.config.ts（AFTER）

```typescript
// playwright.realworld.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/realworld',  // ✅ モック付き e2e を完全除外
  grep: /@realworld/,              // ✅ タグ必須（二重防御）
  use: {
    baseURL: process.env.REALWORLD_URL,
    // モックプロバイダ禁止（msw等 import も tests/realworld/ 側で自己検査）
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  reporter: [
    ['json', { outputFile: 'logs/realworld/latest/realworld-proof.json' }],
    ['html', { open: 'never' }],
  ],
});
```

#### 4.12.2 tests/realworld/ 配下のテスト命名規則

```typescript
// tests/realworld/auth_login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Auth Login @realworld', () => {  // ← @realworld タグ必須
  test('login with Supabase Auth', async ({ page }) => {
    await page.goto('/login');
    // 実機 Supabase Auth に接続（モックなし）
    // ...
  });
});
```

#### 4.12.3 モック誤用の静的検査

新設 `scripts/realworld_mock_guard.sh` を pre-commit で実行:

```sh
#!/bin/sh
# scripts/realworld_mock_guard.sh
# tests/realworld/ 配下のテストがモック層を import していないか検査

if [ ! -d tests/realworld ]; then exit 0; fi

MOCK_IMPORTS='msw|@supabase-mock|jest.mock|vi\.mock|sinon\.stub|@vitest/mock'

violations=$(grep -rnE "$MOCK_IMPORTS" tests/realworld/ 2>/dev/null || true)
if [ -n "$violations" ]; then
  echo "FAIL: mock imports detected in tests/realworld/"
  echo "$violations"
  exit 1
fi
exit 0
```

このスクリプトは G4（テスト全PASS）の拡張として既存 canopy_common.sh に組み込む（新設ゲート化はしない）。

#### 4.12.4 §4.4.5 記述の修正
**BEFORE（R2）**: testDir=./tests + --grep MISSION-ID
**AFTER（R2.1）**: testDir=./tests/realworld + grep /@realworld/ + モック import 静的検査

#### 4.12.5 他クラスター整合
- β: G17 realworld_proof_check.sh が realworld-proof.json を参照（reporter 出力先と一致）
- η: L1-realworld の DONE 条件判定対象がこの config 配下のみ

---

### §4.13 クラスター ν — G7 スクリプト正本化

**該当**: HIGH × 1（gpt54_devops §4.4.2, §4.8）
**R2 該当箇所**: §4.4.2、§4.8

#### 4.13.1 修正
- **§4.8 G7 定義を正本**: `canopy_common.sh::check_spec_map`
- **§4.4.2 の `mission_linter` 記述を削除**し、§4.8 G7 への参照表記に置換:
  > G7 チェックは §4.8 G7 定義（`canopy_common.sh::check_spec_map`）に従う

#### 4.13.2 他クラスター整合
- γ: G1-G17 ゲート表と完全整合

---

### §4.14 クラスター ξ — SKIP / N/A / WARN の厳密定義

**該当**: HIGH × 5（AMBIGUITY §4.4.7 / CONTRADICTION §3.1.2 §3.1.3 §4.4.7 SKIP-RETRY系）
**R2 該当箇所**: §3.1.2、§3.1.3、§4.4.2、§4.4.7

#### 4.14.1 §3.1.5 新設: 完了コマンド状態の定義

```markdown
### §3.1.5 完了コマンド状態の3種定義

完了コマンド表（cmd-unit / cmd-e2e / cmd-realworld）の各セルは以下のいずれかの状態を持つ:

| 状態 | 意味 | DONE扱い | 許容条件 |
|---|---|---|---|
| PASS | 正常完了 | ✅ 可 | cmd 実行で exit 0 |
| FAIL | 失敗 | ❌ 不可 | cmd 実行で exit ≠ 0 |
| N/A | 該当しない | ✅ 可 | 該当なし理由を明記（例: ネイティブアプリでブラウザE2E不要）。**高リスク系では使用不可**（§4.4.3 参照） |
| SKIP | 一時的に飛ばす | ❌ 不可 | 理由 + リトライ予定を明記。次ミッションで必ず再実行し PASS/FAIL に到達させる |
| WARN | 警告付き通過 | ✅ 可（条件付き） | 手動代替証跡を明記（§4.9.3 参照）。**高リスク系では使用不可**（FAIL 扱い） |

**不変規則**:
1. 「SKIP=DONE不可」（現行 G5 と整合）
2. 「N/A と WARN は高リスク系では使用不可」（PD-105 整合）
3. 「高リスク系は3区分すべて PASS または WARN（代替証跡）を要する。FAIL/SKIP/N/A が1つでもあれば DONE 不可」
```

#### 4.14.2 §4.4.7 表の書き直し
§4.4.7 の完了コマンド表は **§3.1.5 の定義を正本として再構築**。具体的記述は:

| リスク | 使用可状態（cmd-unit / cmd-e2e / cmd-realworld 各セル） |
|---|---|
| 低 | PASS / FAIL / N/A / SKIP / WARN |
| 中 | PASS / FAIL / N/A (e2e は必須だが SKIP は不可) / WARN |
| 高 | **PASS のみ**（代替証跡がある場合に限り WARN 許容） |

#### 4.14.3 §3.1.2 / §3.1.3 / §4.4.2 を §3.1.5 参照に置換
二重管理防止のため各所から詳細記述を削除し、§3.1.5 への参照表記に統一。

#### 4.14.4 他クラスター整合
- η: リスク別 DONE条件と完全整合
- ι: WARN の「代替証跡必須」定義が §4.9.3 と整合

---

### §4.15 クラスター ο — Filter 1-7 sub_review_flow §2 準拠

**該当**: HIGH × 2（CONTRADICTION §5.4 Filter 説明不一致）
**R2 該当箇所**: §5.4（レビュアー指示内の Filter 記述）

#### 4.15.1 §5.4 Filter 1-7 記述を sub_review_flow §2 と完全一致させる

R2.1 §7（レビュアー指示）に以下を明記:
> Filter 1-7 の定義は **sub_review_flow.md §2 を正本とする**。本パッケージ内で独自定義しない。
> レビュアーは指摘前に必ず sub_review_flow.md §2 を確認し、該当フィルタを適用すること。

R2 §5.4 内で Filter 1 = 「既存仕様との照合」等と独自定義していた記述を**全削除**し、sub_review_flow.md §2 への参照表記に置き換える。

#### 4.15.2 他クラスター整合
- 次ラウンド（ゴールデン）では Filter 1-7 の判断基準が唯一化されるため、レビュアー間の severity 揺れが減少

---

### §4.16 クラスター π — templates/** ADV書込可 + 曖昧用語排除

**該当**: HIGH × 2（CONTRADICTION §4.1.4 / AMBIGUITY "scripts/*実装*.js"）
**R2 該当箇所**: §4.1.4、sub_adv_protocol.md §1

#### 4.16.1 sub_adv_protocol.md §1 書き込みホワイトリスト修正

**BEFORE（現行）**:
- 書き込み可: docs/**, instructions/**, lais/verify/**.md, lais/instructions/**.md

**AFTER（R2.1 で連鎖更新）**:
- 書き込み可: docs/**, instructions/**, lais/verify/**.md, lais/instructions/**.md, **templates/\*\*（新規追加）**, **scripts/lib/\*.sh（例外的許可、ADV設計担当領域）**
- 書き込み不可（明示列挙）: src/**, tests/**, supabase/**, *.config.{ts,js}, package.json, wrangler.toml, .env, .dev.vars

#### 4.16.2 "scripts/*実装*.js" 曖昧用語の削除

R2 §4.1.4 の「scripts/*実装*.js はADV書込可」という記述を**全削除**。代わりに具体列挙:
- ADV書込可: `scripts/lib/*.sh`（共通ライブラリ設計）、`scripts/ai_review.js`（ADVのレビュー実装調整時のみ）、`scripts/*_lint.sh`（新設 lint の雛形）
- ENG書込専用（ADV書込不可）: `scripts/deploy.sh`、`scripts/rollback.sh`、`scripts/version_sync.sh` 等の実行スクリプト

#### 4.16.3 他クラスター整合
- γ: 新設 G14-G17 の実装スクリプトは `scripts/*_lint.sh` / `scripts/*_check.sh` / `scripts/*_verify.sh` の命名規則で統一。ADV が雛形提示 → ENG が実装の責務分離明確化

---

### §4.17 クラスター ρ — G13 タグ分離と N日固定

**該当**: HIGH × 3（CONTRADICTION §2.7 / MISSING §4.5.4 / MISSING §4.8 G13）
**R2 該当箇所**: §2.7、§4.5.4、§4.8 G13

#### 4.17.1 G13 検証対象タグの限定

**BEFORE（R2）**: G13 = 最近N日以内に `[pre-commit]` `[pre-push]` `[deploy.sh]` タグの発火ログが存在
**AFTER（R2.1）**: G13 = 最近**7日**以内に `[pre-commit]` または `[pre-push]` タグの発火ログが存在（`[deploy.sh]` は G17 realworld_proof_check.sh で扱う別体系）

#### 4.17.2 §4.5.4 logs/canopy_fire.log 記録フォーマット

```
# logs/canopy_fire.log 記録例
2026-04-19T08:15:32Z [pre-commit] G1,G3,G7,G10,G11 OK
2026-04-19T08:16:01Z [pre-push] G1-G17 except G16,G17 OK
2026-04-19T14:22:45Z [deploy.sh] G16 OK → deploy started
2026-04-19T14:25:12Z [deploy.sh] G17 OK → STATUS: READY_FOR_DEPLOY → DONE
```

#### 4.17.3 canopy.sh の --caller 引数追加

```sh
# canopy.sh 抜粋
CALLER="${1:-unknown}"
case "$CALLER" in
  pre-commit|pre-push|deploy.sh)
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [$CALLER] ..." >> logs/canopy_fire.log
    ;;
  *)
    echo "ERROR: unknown --caller '$CALLER'" >&2; exit 2 ;;
esac
```

#### 4.17.4 verify_hooks.sh（G13 実装）修正

```sh
# scripts/verify_hooks.sh 抜粋
THRESHOLD_DAYS=7
LOG=logs/canopy_fire.log
[ -f "$LOG" ] || { echo "FAIL: G13 no fire log"; exit 1; }

# 7日以内の pre-commit/pre-push 発火の存在を確認（[deploy.sh] は対象外）
recent=$(awk -v now=$(date +%s) -v thr=$((THRESHOLD_DAYS*86400)) '
  {
    # ISO 8601 を epoch 変換は簡易: 最初の10文字 YYYY-MM-DD のみ使用
    split($1, d, "T"); gsub("-", " ", d[1])
    cmd="date -j -f \"%Y %m %d\" \"" d[1] "\" +%s 2>/dev/null || date -d \"" d[1] "\" +%s"
    cmd | getline e; close(cmd)
    if (now - e <= thr && ($2 == "[pre-commit]" || $2 == "[pre-push]")) print
  }' "$LOG")

[ -n "$recent" ] || { echo "FAIL: G13 no pre-commit/pre-push within ${THRESHOLD_DAYS}d"; exit 1; }
echo "OK: G13 pre-commit/pre-push fire log present"
```

#### 4.17.5 他クラスター整合
- β: G17 を G13 と独立させた整理と完全整合
- γ: G1-G17 ゲート表の G13 定義と一致

---

### §4.18 クラスター σ — 高リスク判定パス SSOT 統一

**該当**: HIGH × 4（CONTRADICTION/AMBIGUITY §3.1.4 / §3.2.1 / §3.3 / §4.3.6）
**R2 該当箇所**: §3.1.4、§3.2.1、§3.3、§4.3.6

#### 4.18.1 修正方針
§4.4.4 で既に「`scripts/lib/risk_patterns.sh` を SSOT とする」と記述済み。σ クラスターは δ クラスターと併合解決:
- §3.1.4: 「高リスクファイル = `scripts/lib/risk_patterns.sh` の RISK_PATHS（正本）」
- §3.2.1: 「Hフロー発火対象 = `scripts/lib/risk_patterns.sh` の RISK_PATHS（正本）」
- §3.3: 「判定方式 = prefix match (case 文ベース)、実装は `scripts/lib/risk_match.sh::is_risk_path`」
- §4.3.6: δ の実装詳細（§4.4.1-§4.4.3）を参照表記に置換

#### 4.18.2 PD-105「DBスキーマ変更」の追加
σ-2（HIGH）で指摘された「DBスキーマ変更」も RISK_PATHS に含める:
```sh
# scripts/lib/risk_patterns.sh 追加行
supabase/migrations/
prisma/migrations/
db/migrations/
```

---

### §4.19 クラスター τ — DEPLOY-RECOVER 自動追記

**該当**: HIGH × 2（MISSING §4.2.4 / §2.9 書き込み主体未定義）
**R2 該当箇所**: §4.2.4、§2.9

#### 4.19.1 deploy.sh 失敗時の自動追記

`scripts/append_deploy_fail.sh` を新設:

```sh
#!/bin/sh
# scripts/append_deploy_fail.sh
# deploy.sh 失敗時に session_progress.md へ DEPLOY-FAIL 追記 + DEPLOY-RECOVER ミッション挿入

MISSION_ID="$1"
STDOUT_TAIL="$2"  # deploy.sh の stdout 末尾30行
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

PROGRESS=instructions/session_progress.md
[ -f "$PROGRESS" ] || exit 2

# DEPLOY-FAIL 行を提案ログ先頭に挿入
awk -v id="$MISSION_ID" -v ts="$TIMESTAMP" -v tail="$STDOUT_TAIL" '
  /^## 提案ログ/ && !done {
    print
    print ""
    print "### DEPLOY-FAIL " id " (" ts ")"
    print "- **STATUS:** WAITING_PO"
    print "- **提案日:** " substr(ts, 1, 10)
    print "- **最終stdout (tail30):**"
    print "```"
    print tail
    print "```"
    print "- **次ミッション:** DEPLOY-RECOVER (キュー先頭に自動挿入済み)"
    done=1; next
  }
  { print }
' "$PROGRESS" > "${PROGRESS}.tmp" && mv "${PROGRESS}.tmp" "$PROGRESS"

# DEPLOY-RECOVER ミッション雛形をキュー先頭に挿入
cat templates/deploy_recover_template.md | \
  sed "s/{MISSION_ID}/$MISSION_ID/g; s/{TIMESTAMP}/$TIMESTAMP/g" > /tmp/deploy_recover.md
# （キュー先頭挿入ロジック、awk で "## ミッションキュー" 直後に貼り付け）
# ...省略（実装詳細は Code G_46 で完成させる）
```

#### 4.19.2 deploy_recover_template.md 新設

```markdown
# templates/deploy_recover_template.md
### DEPLOY-RECOVER-{MISSION_ID}: デプロイ失敗リカバリ
> リスク: 🔴高
> 目的: {MISSION_ID} のデプロイ失敗の根本原因特定 + 再デプロイ
> STATUS: IN_PROGRESS (auto-inserted at {TIMESTAMP})

**プリフライト:**
- logs/canopy_fire.log tail -30
- session_progress.md 内 DEPLOY-FAIL 直前の stdout tail 確認
- git log --oneline origin/main..HEAD で push 済みコミット確認

**完了コマンド:**
- cmd-unit: scripts/deploy.sh 再実行 PASS
- cmd-realworld: G16 deploy_hash_verify.sh + G17 realworld_proof_check.sh PASS

**FAIL条件:**
- 3回試行で失敗 → POエスカレーション（ストライクリセット禁止。τクラスター対応）

**ロールバック手順:**
1. scripts/rollback.sh（git revert 方式）
2. CF Pages: scripts/cf_rollback.sh（直前デプロイへ切戻し）
```

#### 4.19.3 ストライクカウント増殖対策
HIGH × 1 で指摘された「DEPLOY-RECOVER で MISSION-ID が変化しストライクリセット」問題:
- DEPLOY-RECOVER-{元MISSION_ID} 命名により、元ミッションと紐付け
- 3回試行FAILでPOエスカレーション必須（DEPLOY-RECOVER だけの独立カウント）

#### 4.19.4 他クラスター整合
- η: READY_FOR_DEPLOY → IN_PROGRESS 再戻し時の session_progress.md 更新主体が deploy.sh 自動

---

### §4.20 クラスター υ — Step 0 章単位集約

**該当**: HIGH × 2（CONTRADICTION §4.1.7 / §3.1.1）
**R2 該当箇所**: §4.1.7、§3.1.1、§C0

#### 4.20.1 §4.1.7 修正

**BEFORE（R2）**: 全22フローの Step 0 を個別に記載
**AFTER（R2.1）**: §4.1.7 を廃止し、**§C0 の冒頭に共通定義を1箇所**:

```markdown
### §C0 起動時共通規約 (冒頭)

**Step 0（全フロー共通）**:
1. §C0（本章）全文
2. CLAUDE.md
3. development_rules.md
4. session_progress.md（5行サマリー + キュー先頭ミッション）

**フロー別 §C1-C6 参照**: 以下の表に従い、該当フロー実行時のみ §C1-C6 を Read。

| フロー | 参照 §C |
|---|---|
| A (実装) | §C1 実装規約 + §C3 テスト戦略 |
| B (デザインレビュー) | §C4 デザイン原則 |
| C (仕様レビュー) | §C5 レビュー運用 + §C6 severity基準 |
| D (ソロ回転) | §C1 + §C2 バージョン同期 |
| E (棚卸し) | §C2 + §C6 |
| F (AIレビュー設定) | §C5 + §C6 |
| G (canopy拡張) | §C1 + §C3 |
| H (統合フローレビュー) | §C4 + §C5（PD-106 により機械発火） |
```

#### 4.20.2 各フロー記述の簡略化

sub_review_flow.md 等の各フロー記述内の「Step 0: ...」記述を全て「Step 0: §C0 参照」に置換。個別列挙を完全廃止。

#### 4.20.3 他クラスター整合
- PD-105: Step 0 章単位集約原則に完全準拠
- ζ: §C0 必須Readと整合（PD-107）

---

## §5. 新設ゲート G14-G17 完全設計

### §5.1 G14 — scripts/spec_first_lint.sh（仕様書ファースト検証）

**目的**: 「旧 G10 上書き先」だった spec_first_lint.sh を G14 として独立確立。ミッション定義が適切に仕様書を参照しているかを pre-commit で検証。

**実装**:
```sh
#!/bin/sh
# scripts/spec_first_lint.sh
# G14: ミッション定義の仕様書参照を検証

PROGRESS="${1:-instructions/session_progress.md}"
[ -f "$PROGRESS" ] || { echo "FAIL: G14 progress file not found"; exit 1; }

# キュー内の各ミッション定義（### で始まるブロック）を抽出
# 参照: 欄に docs/plans/ または lais/verify/ の md が1本以上あるか
awk '
  /^### [A-Z0-9-]+: / { in_mission=1; has_ref=0; mission=$0; next }
  in_mission && /^### / { # 次のミッション or セクション終了
    if (!has_ref) { print "FAIL: G14 no spec reference: " mission }
    in_mission=0
  }
  in_mission && /参照:.*(docs\/plans\/|lais\/verify\/).*\.md/ { has_ref=1 }
  END { if (in_mission && !has_ref) print "FAIL: G14 no spec reference: " mission }
' "$PROGRESS" > /tmp/g14_result
if [ -s /tmp/g14_result ]; then
  cat /tmp/g14_result; exit 1
fi
echo "OK: G14 spec-first check passed"
```

**発火**: pre-commit（canopy 経由）+ Stage A

**POSIX互換性**: awk / grep / sed のみ使用。bash 拡張なし。

**テスト**: `tests/unit/spec_first_lint.test.sh` を §4.11.3 と同形式で3ケース作成（参照あり / なし / docs/plans 以外）。

---

### §5.2 G15 — scripts/tdd_trace_consistency.sh（TDD証跡 ↔ canopy 同期）

**目的**: §4.6.3 で定義された証跡ファイル名と canopy_common.sh::check_tdd の実装を同期検証。βクラスター再発予防。

**実装**:
```sh
#!/bin/sh
# scripts/tdd_trace_consistency.sh
# G15: §4.6.3 仕様とcanopy実装の before-*.json / after-*.json ファイル名一致を検証

SPEC_FILE="${1:-docs/plans/dev_system_spec.md}"
SUB_TESTING="${2:-docs/plans/sub_testing.md}"
IMPL_FILE="${3:-scripts/lib/canopy_common.sh}"

# 仕様側から参照ファイル名を抽出（重複排除してソート）
SPEC_FILES=$(grep -hoE 'before-[a-z]+\.json|after-[a-z]+\.json' "$SPEC_FILE" "$SUB_TESTING" 2>/dev/null | sort -u)

# 実装側から参照ファイル名を抽出
IMPL_FILES=$(grep -oE 'before-[a-z]+\.json|after-[a-z]+\.json' "$IMPL_FILE" 2>/dev/null | sort -u)

if [ "$SPEC_FILES" != "$IMPL_FILES" ]; then
  echo "FAIL: G15 TDD trace file mismatch"
  echo "--- spec ---"
  echo "$SPEC_FILES"
  echo "--- impl ---"
  echo "$IMPL_FILES"
  echo "--- diff ---"
  diff <(echo "$SPEC_FILES") <(echo "$IMPL_FILES") || true
  exit 1
fi

echo "OK: G15 spec and impl reference identical TDD files"
```

**発火**: pre-commit（canopy_common.sh 変更時、または docs/plans/*.md 変更時のみ）。git diff で判定:
```sh
if git diff --cached --name-only | grep -qE '(canopy_common\.sh|dev_system_spec\.md|sub_testing\.md)'; then
  scripts/tdd_trace_consistency.sh || exit 1
fi
```

**テスト**: 仕様と実装を意図的に食い違わせたケースで FAIL、一致ケースで PASS の2ケース。

---

### §5.3 G16 — scripts/deploy_hash_verify.sh（デプロイhash埋込検証）

**目的**: αクラスター再発予防。ビルド成果物に commit sha が確実に埋込まれているかを pre-deploy で検証。

**実装**（§4.1.1 で提示した deploy_poll_hash.sh とは別。build成果物を検証）:
```sh
#!/bin/sh
# scripts/deploy_hash_verify.sh
# G16: build成果物にコミットハッシュが埋め込まれているかを deploy 前に検証

DIST_DIR="${1:-dist}"
COMMIT=$(git rev-parse HEAD)
SHORT="${COMMIT:0:7}"

[ -d "$DIST_DIR" ] || { echo "FAIL: G16 dist dir '$DIST_DIR' not found"; exit 1; }

found=0

# SPA (index.html に meta tag)
if [ -f "$DIST_DIR/index.html" ]; then
  if grep -qE "commit-sha\"[[:space:]]+content=\"($COMMIT|$SHORT)" "$DIST_DIR/index.html"; then
    echo "OK: G16 meta tag commit-sha in $DIST_DIR/index.html"
    found=1
  fi
fi

# SPA (commit.txt)
if [ -f "$DIST_DIR/commit.txt" ]; then
  if grep -q "$SHORT" "$DIST_DIR/commit.txt"; then
    echo "OK: G16 $DIST_DIR/commit.txt contains $SHORT"
    found=1
  fi
fi

# Worker (bundle 内 COMMIT_SHA 定数)
for js in "$DIST_DIR"/*.js; do
  [ -f "$js" ] || continue
  if grep -q "$SHORT" "$js"; then
    echo "OK: G16 $js contains $SHORT"
    found=1
    break
  fi
done

if [ "$found" -ne 1 ]; then
  echo "FAIL: G16 commit SHA ($COMMIT / $SHORT) not found in any build artifact"
  echo "  require one of: dist/index.html meta tag, dist/commit.txt, dist/*.js constant"
  echo "  see §4.2.0 SSOT for embed methods"
  exit 1
fi

exit 0
```

**発火**: deploy.sh 冒頭（build 完了後・push 前）

**テスト**: 埋込あり / 埋込なし / hash 不一致の3ケース。

---

### §5.4 G17 — scripts/realworld_proof_check.sh（realworld 証跡）

**目的**: βクラスター対応の一環。realworld 証跡を G8 と完全分離。deploy 後の実機検証証跡を post-deploy で検証。

**実装**:
```sh
#!/bin/sh
# scripts/realworld_proof_check.sh
# G17: deploy後 realworld 証跡の完全性を検証

MISSION_ID="$1"
[ -n "$MISSION_ID" ] || { echo "Usage: $0 <mission-id>" >&2; exit 2; }

DIR="logs/realworld/$MISSION_ID"
[ -d "$DIR" ] || { echo "FAIL: G17 $DIR not found"; exit 1; }

# realworld-proof.json 存在
PROOF="$DIR/realworld-proof.json"
[ -f "$PROOF" ] || { echo "FAIL: G17 missing $PROOF"; exit 1; }

# JSON 構造検証
if ! jq -e '.timestamp and .results' "$PROOF" > /dev/null 2>&1; then
  echo "FAIL: G17 $PROOF missing required fields (.timestamp, .results)"; exit 1
fi

# timestamp が deploy 完了時刻より後か（logs/deploy.log tail 1 と比較）
if [ -f logs/deploy.log ]; then
  deploy_ts=$(tail -1 logs/deploy.log | awk '{print $1}')
  proof_ts=$(jq -r '.timestamp' "$PROOF")
  # ISO8601 比較（文字列比較で充分）
  if [ "$proof_ts" \< "$deploy_ts" ]; then
    echo "FAIL: G17 proof timestamp ($proof_ts) precedes deploy ($deploy_ts)"; exit 1
  fi
fi

# 4基本操作スクショ（launch / primary1 / primary2 / reload）
SHOTS="$DIR/realworld-screenshots"
[ -d "$SHOTS" ] || { echo "FAIL: G17 missing $SHOTS"; exit 1; }
for op in launch primary1 primary2 reload; do
  found=0
  for ext in png jpg jpeg; do
    [ -f "$SHOTS/$op.$ext" ] && { found=1; break; }
  done
  [ "$found" -eq 1 ] || { echo "FAIL: G17 missing screenshot $op.*"; exit 1; }
done

# results 内で failed > 0 のテストがないこと
failed=$(jq -r '.results.failed // 0' "$PROOF")
if [ "$failed" -gt 0 ]; then
  echo "FAIL: G17 $failed realworld tests failed"; exit 1
fi

echo "OK: G17 realworld proof complete for $MISSION_ID"
```

**発火**: deploy.sh 成功後（post-deploy）+ session_progress.md STATUS: READY_FOR_DEPLOY → DONE 遷移時

**テスト**: 4スクショ全揃い+proof.json成立 / スクショ欠損 / failed>0 の3ケース。

---

### §5.5 発火タイミング総覧（既設G1-G13 + 新設G14-G17）

| ゲート | pre-commit | pre-push | pre-deploy | post-deploy | Stage A |
|---|:-:|:-:|:-:|:-:|:-:|
| G1 バージョン同期 | ✓ | ✓ | - | - | ✓ |
| G2 Stage A健全性 | - | - | - | - | ✓ |
| G3 テスト項目数 | ✓ | - | - | - | ✓ |
| G4 テスト全PASS | ✓ | ✓ | - | - | ✓ |
| G5 報告フォーマット | - | - | - | - | ✓ |
| G6 デプロイパイプライン | - | ✓ | ✓ | - | - |
| G7 仕様↔完了コマンド対応 | ✓ | - | - | - | ✓ |
| G8 TDD証跡（unit/e2e） | ✓ | - | - | - | ✓ |
| G9 UIスクショ判定 | - | - | - | - | ✓ |
| G10 シークレットスキャン（据え置き） | ✓ | ✓ | - | - | - |
| G11 Step 0 参照漏れ | ✓ | - | - | - | ✓ |
| G12 提案ログ形式 | ✓ | - | - | - | - |
| G13 フック発火確認 | ✓ | ✓ | - | - | - |
| **G14 仕様書ファースト（R2.1）** | ✓ | - | - | - | ✓ |
| **G15 TDD証跡同期（R2.1）** | ✓（条件付き） | - | - | - | - |
| **G16 デプロイhash埋込（R2.1）** | - | - | ✓ | - | - |
| **G17 realworld証跡（R2.1）** | - | - | - | ✓ | - |

---

## §6. 連鎖更新指示 — Code G_46 への書き込みリスト

本R2.1 がゴールデン確定後、Code G_46 で以下9ファイルを連鎖更新する。各ファイルの変更要旨は次の通り（詳細差分は R2.1 §4 各節に記載済み）:

### 6.1 docs/plans/dev_system_spec.md（v3.3 → v3.4）
**規模**: 追記500-800行、整理200-300行

**主要変更**:
- **§4.2.0 新設**: デプロイ成果物のバージョン露出SSOT（§4.1, α）
- **§4.2.-1 新設**: ミッションSTATUS 3状態モデル（§4.7, η）
- **§3.1.5 新設**: 完了コマンド状態 SKIP/N/A/WARN/PASS/FAIL 定義（§4.14, ξ）
- **§4.4.3 置換**: リスク別 DONE条件表（§4.7, η）
- **§4.8 置換**: G1-G17 完全版ゲート表（§4.3, γ）
- **§4.1.2 置換**: 役割別Read表 PD-104+PD-107適用版（§4.6, ζ）
- **§4.6.3 置換**: TDD証跡ファイル表（§4.2, β）
- **§3.1.4 / §3.2.1 / §3.3 修正**: SSOT参照表記化（§4.4, δ）
- **§4.2.2 / §4.3.2 修正**: 外部サービス認証リスク別FAIL/WARN（§4.9, ι）
- **§4.1.7 廃止**: Step 0 章単位集約化（§4.20, υ）
- **§4.1.6 修正**: §C0 PD-107整合（§4.6, ζ）
- **§6.2 修正**: PD-104 原文引用を §C1-C6 に戻す（§4.6, ζ）
- **§2.6 修正**: §C0 必須化 + §C1-C6 条件付き再読（§4.6, ζ）
- **§4.4.2 / §4.4.7 修正**: SKIP/N/A/WARN §3.1.5参照化（§4.14, ξ）
- **§4.5.1 / §4.5.7 修正**: pre-commit if文パターン（§4.10, κ）
- **§4.5.4 修正**: logs/canopy_fire.log タグ体系（§4.17, ρ）
- **§4.2.4 / §2.9 修正**: DEPLOY-RECOVER 自動追記（§4.19, τ）
- **§4.4.5 修正**: playwright realworld testDir 固定（§4.12, μ）
- **§4.2.3 修正**: L1-realworld 4基本操作を最低限と明記

### 6.2 docs/plans/sub_testing.md
- 3層テスト戦略の改訂（η連動、§4.2.5）
- before-unit.json / before-e2e.json / realworld-proof.json への分離
- canopy_common.sh::check_tdd 新仕様の参照

### 6.3 docs/plans/sub_infrastructure.md
- hflow_trigger_check.sh CONTEXT 分岐（§4.5, ε）
- risk_patterns.sh / risk_match.sh の SSOT 配置（§4.4, δ）
- G10 据え置きの明示（γ）
- deploy.sh 内 G16 呼出しの追記（§4.1, α）

### 6.4 docs/plans/sub_adv_protocol.md
- 書き込みホワイトリスト拡張（templates/**, scripts/lib/**）（§4.16, π）
- 「scripts/*実装*.js」の曖昧用語削除（§4.16, π）
- §0 Read リスト PD-104+PD-107 適用版（§4.6, ζ）

### 6.5 docs/plans/sub_system_map.md
- G1-G17 依存グラフ更新
- risk_patterns.sh の SSOT 位置づけ追加
- logs/canopy_fire.log / logs/realworld/ の出力先追加

### 6.6 docs/plans/sub_review_flow.md
- §2 Filter 1-7 定義は変更なし（オクラスター修正は R2.1 §7 で完結）
- §4.H 統合フローレビュー追記（既 G_40 改訂案⑥準拠）

### 6.7 CLAUDE.md
- 品質ゲート参照を G1-G7 → G1-G17 に拡張
- §C0（新設される場合は要約を CLAUDE.md 冒頭または別ファイルで明示）

### 6.8 development_rules.md
- G1-G17 完全版を索引列挙（詳細は dev_system_spec §4.8 参照）
- §4.9.1 新セクション: G番号変更の禁止規則（γ 対応）

### 6.9 templates/（複数ファイル）
- **templates/deploy_recover_template.md 新設**（§4.19, τ）
- **templates/mission_template_v3.md 追記**: 「対象ファイル:」行フォーマット固定（§4.11, λ）
- **templates/canopy_common.sh 同期**: check_tdd 新実装（§4.2.3）

### 6.10 scripts/（新設 4本 + 既設修正）
**新設**:
- `scripts/spec_first_lint.sh`（G14, §5.1）
- `scripts/tdd_trace_consistency.sh`（G15, §5.2）
- `scripts/deploy_hash_verify.sh`（G16, §5.3）
- `scripts/realworld_proof_check.sh`（G17, §5.4）
- `scripts/lib/risk_patterns.sh`（SSOT, §4.4.1）
- `scripts/lib/risk_match.sh`（共通関数, §4.4.2）
- `scripts/realworld_mock_guard.sh`（μ, §4.12.3）
- `scripts/append_deploy_fail.sh`（τ, §4.19.1）
- `scripts/deploy_poll_hash.sh`（α, §4.1.1）

**既設修正**:
- `scripts/lib/canopy_common.sh`（check_tdd 新実装、§4.2.3）
- `scripts/hflow_trigger_check.sh`（CONTEXT 分岐、§4.5.1）
- `scripts/mission_risk_classifier.sh`（POSIX + λ対応、§4.4.3）
- `scripts/verify_external_services.sh`（リスク別分岐、§4.9.1）
- `scripts/verify_hooks.sh`（G13 タグ限定 + 論理式検査、§4.17.4 + §4.10.3）
- `scripts/proposal_log_lint.sh`（日付ベース、§4.8.2）
- `scripts/canopy.sh`（--caller 引数、§4.17.3）

### 6.11 .git/hooks/pre-commit
- if 文パターンに修正（§4.10.1, κ）
- G10 シークレットスキャン据え置き確認

---

## §7. レビュアー指示 Part VIII（ゴールデンラウンド）

### 7.1 severity 判定基準（sub_review_flow.md §1.5.1 を正本）

CRITICAL を出せるのは以下3種のみ:
1. PD-104/105/106/107 前提を破る構造矛盾
2. 複数クラスター相互矛盾（R2.1 §4.x 同士の齟齬）
3. R2 CRITICAL で見落とされた FEASIBILITY CRITICAL（実装不能や100%失敗する設計）

それ以外は HIGH 以下で扱う。

### 7.2 severity inflation 注意
- R1 / R2 で既採用テーマの蒸し返しは MED 以下
- R1・R2 で既棄却 LOW 4件の蒸し返しは棄却
- 本R2.1 §4 で既採用方針への異議は受理しない

### 7.3 Filter 1-7 適用（オクラスター修正）
**Filter 1-7 の定義は sub_review_flow.md §2 を正本とする。本パッケージ内で独自定義しない**。
レビュアーは指摘前に必ず sub_review_flow.md §2 を確認し、該当フィルタを適用すること。

### 7.4 PD-104/105/106/107 方針への異議は §5.5 棄却扱い
PD-104/105/106/107 そのものへの方針異議は受理しない。
実装詳細の改善提案は HIGH まで可。

### 7.5 重点チェック領域
ゴールデンラウンドでは以下5領域を重点チェック:

1. **SSOT 整合性**: risk_patterns.sh を正本とした §3.1.4/§3.2.1/§3.3 の参照が一貫しているか
2. **G番号体系**: G1-G17 完全版が dev_system_spec §4.8 / development_rules.md / CLAUDE.md で一致しているか
3. **STATUS 3状態モデル**: §4.2.-1 と §4.4.3 と §4.7 の記述が矛盾ないか
4. **TDD証跡分離**: G8 (unit/e2e) と G17 (realworld) の責務境界が明確か
5. **POSIX互換**: §4.4 の risk_patterns.sh / risk_match.sh / mission_risk_classifier.sh が実際に /bin/sh で動作するか（シミュレートチェック可）

### 7.6 ラウンド上限
ゴールデンラウンド上限 **2ラウンド**（sub_review_flow §1.6）。
- R1 Golden: 全5ペルソナ×2モデル = 10本
- CRITICAL 0 → v3.4 確定
- CRITICAL >0 → ADV が差分修正 → R2 Golden（全10本再送）
- R2 Golden で CRITICAL >0 → POエスカレーション

### 7.7 出力フォーマット
各ペルソナは以下JSON形式で出力（既R2と同じ）:
```json
[
  {
    "id": "R-001",
    "severity": "CRITICAL|HIGH|MEDIUM|LOW",
    "category": "MISSING|AMBIGUITY|CONTRADICTION|FEASIBILITY|EDGE_CASE|ROBUSTNESS|...",
    "location": "§X.Y.Z",
    "issue": "問題の具体記述",
    "suggestion": "修正提案"
  }
]
```

### 7.8 レビュアーが参照するドキュメント
以下を --context-files で渡す:
1. 本R2.1パッケージ（dev_system_v34_r2_1_package.md、レビュー対象）
2. dev_system_v34_r2_triage.md（R2トリアージ。採用理由の参照）
3. dev_system_spec.md v3.3（現行版）
4. sub_infrastructure / sub_testing / sub_adv_protocol / sub_review_flow / sub_system_map（連鎖更新対象）
5. CLAUDE.md / development_rules.md（連鎖更新対象）
6. docs/po-decisions.md（PD-104/105/106/107）

---

## §8. Cumulative Context Part IX

### 8.1 R1採用 76件（再掲）
dev_system_v34_r1_triage.md §2 参照（14クラスターA〜H, K〜N）。
主要テーマ: macOS互換 / Vite build / G番号体系 / 責務境界 / 滞留判定 / 起動時Read量 / pre-commit-sub / 整合性 / Hフロー。

### 8.2 R2採用 22件（本R2.1 §4.1〜§4.12）
12クラスター α〜μ。R2.1 §1.2 参照。

### 8.3 HIGH採用 21件（本R2.1 §4.13〜§4.20）
8クラスター ν〜υ。R2.1 §1.3 参照。

### 8.4 PD 4件原文（po-decisions.md 準拠）
- PD-104: ADV/ENG/PO 責務境界3分岐（§3.1 再掲）
- PD-105: 仕様厳格化は認証・決済・外部APIに集中（案B+条件付き）（§3.2 再掲）
- PD-106: Hフロー発火は git diff 機械判定（案B+機械判定）（§3.3 再掲）
- PD-107: 必須Read §C0 固定、§C1-C6 条件付き再読（案A採用）（§3.4 再掲）

### 8.5 既決定PD抜粋（参照のみ、今回変更なし）
- PD-001: ふとしは承認のみ
- PD-002: 既決定は覆さない
- PD-003: AIレビュー最低10ラウンド（または品質改善停止まで）
- PD-005: 仕組みで解決（手運用に頼らない）
- PD-007: 新プロセスはPO承認
- PD-008: dev-systemはLayer1全プロジェクト基盤

### 8.6 既棄却LOW 4件（蒸し返し禁止）
R1トリアージで棄却された LOW 4件（dev_system_v34_r1_triage.md §2 末尾参照）は本R2.1でも棄却状態を維持。レビュアーは蒸し返し禁止。

### 8.7 ゴールデン余地の HIGH 7件（R2.1 本文未対応、ゴールデン再出現時のみ対応）
1. logs/canopy_fire.log 呼出し元タグ記録形式詳細（MISSING §4.5.4、ρクラスター修正で部分対応済）
2. `scripts/cf_rollback.sh` vs `scripts/rollback.sh` 重複（τ で部分対応済、完全統合は v3.5 以降）
3. 統合E2E (§9 新設相当) の詳細化（τ クラスターで基本設計提示、実装詳細は未）
4. §0.1 severity基準の曖昧さ（R2.1 §7 で明文化済、追加対応不要）
5. SKIP-RETRY 旧仕様との整合（ξ で部分対応済）
6. `[ -x HOOK ]` 付近のルート外 source リスク（κ で部分対応済）
7. L1スモーク 4操作 vs 現行5操作（§4.2.3 で4操作を最低限と明記、5操作は推奨オプション）

これらはゴールデンで新 CRITICAL として再指摘されない限り、本R2.1 でクローズ扱い。

---

## §9. ゴールデンラウンド実行計画

### 9.1 実行仕様
- **モデル**: Gemini 3.1 Pro Preview + GPT-5.4（R1/R2同じ）
- **ペルソナ**: devops_engineer / solo_dev / qa_lead / tech_writer / ai_ops（全5）
- **本数**: 10本（5ペルソナ × 2モデル）
- **実行方式**: 並列（R2で実績あり、10-15分）

### 9.2 コスト概算
- GPT-5.4側: $3-5（R2と同等）
- Gemini側: 無料枠内
- Tier 3 枠内吸収（追加PO承認不要）

### 9.3 コマンド例
```sh
node scripts/ai_review.js \
  --input "lais/verify/dev_system_v34_r2_1_package.md" \
  --context-files "lais/verify/dev_system_v34_r2_triage.md,docs/plans/dev_system_spec.md,docs/plans/sub_infrastructure.md,docs/plans/sub_testing.md,docs/plans/sub_adv_protocol.md,docs/plans/sub_review_flow.md,docs/plans/sub_system_map.md,CLAUDE.md,development_rules.md,docs/po-decisions.md" \
  --models gemini,gpt54 \
  --personas devops_engineer,solo_dev,qa_lead,tech_writer,ai_ops \
  --output lais/verify --prefix dev_system_v34_golden \
  --parallel
```

### 9.4 完了条件
- 10本中 CRITICAL 0 → v3.4 確定 → Code G_46 で連鎖更新書き込み（§6 の9カテゴリ）
- CRITICAL > 0 → ADV が R2.1 に差分修正 → Golden R2（全10本再送）
- Golden R2 で CRITICAL > 0 → POエスカレーション（sub_review_flow §1.6 FAIL条件）

### 9.5 FAIL条件
- Golden 2ラウンド超過で CRITICAL 残存 → POエスカレーション
- 外部API認証失敗 → ふとしに即エスカレーション
- 10本中3本以上 PARSE-ERROR → ai_review.js 緊急改修 → 再実行

### 9.6 LP昇格候補
ゴールデン確定後、R2.1 §7 LP候補5件（LP-020〜024）を learned-patterns.md に正式追加:
- LP-020: ゲート番号の再利用禁止
- LP-021: 証跡ファイル名変更時の canopy 同期必須
- LP-022: デプロイ検証対象は build時埋込 SSOT で先に定義
- LP-023: 新設スクリプトは /bin/sh + shellcheck --shell=sh で POSIX 互換確保
- LP-024: git diff 文脈別 CONTEXT 分岐共通関数

### 9.7 完了報告フォーマット
```
MISSION-ID: DEV-SYSTEM-V34-REVIEW-GOLDEN
プリフライト: R2.1パッケージ{N}行確認 PASS
Golden R1結果: 10/10 valid / CRITICAL {total} / HIGH {total} / MED {total}
ペルソナ別内訳: [10本のsev件数表]
次アクション:
  - CRITICAL 0 → v3.4 確定 → Code G_46 で連鎖更新書き込み
  - CRITICAL > 0 → ADV（Claude.ai G_45）に差分修正依頼 → Golden R2
```

---

## §10. 本R2.1パッケージの検証コマンド

```sh
# プリフライト
wc -l lais/verify/dev_system_v34_r2_1_package.md
# 期待: 1,700-1,900行

# クラスターカバレッジ
grep -cE '^### §4\.[0-9]+ クラスター' lais/verify/dev_system_v34_r2_1_package.md
# 期待: 20（α〜μ 12 + ν〜υ 8）

# G14-G17 設計存在確認
grep -cE '^### §5\.[1-4] G1[4-7]' lais/verify/dev_system_v34_r2_1_package.md
# 期待: 4

# 連鎖更新9カテゴリ記載
grep -cE '^### 6\.[0-9]+ ' lais/verify/dev_system_v34_r2_1_package.md
# 期待: 11（§6.1〜§6.11）

# PD-107 記載
grep -c "PD-107" lais/verify/dev_system_v34_r2_1_package.md
# 期待: 10以上
```

**完了報告:** MISSION-ID: DEV-SYSTEM-V34-REVIEW-R2-1-PACKAGE (ADV) / R2トリアージ767行 + R2.1パッケージ{N}行作成 / 19クラスター修正パッチ + 新設G14-G17完全設計 + 連鎖更新9カテゴリ / PD-107確定 / ゴールデン実行計画確定
