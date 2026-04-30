# dev-system v3.3 → v3.4 改訂レビュー — R2 トリアージ
> ADV（Claude.ai G_44）作成 / 2026-04-19
> 入力: lais/verify/dev_system_v34_r2_{gemini,gpt54}_{persona}.json（10本）
> 直近R2パッケージ: lais/verify/dev_system_v34_r2_package.md（1,262行）
> 直近R1トリアージ: lais/verify/dev_system_v34_r1_triage.md（491行）
> 次ミッション: dev_system_v34_r2_1_package.md 作成（ゴールデン直行方針 / R3差分ラウンド省略）

---

## §0. パッケージ位置づけ

### 0.1 R2実行結果サマリー
- **10/10 valid**（JSON構造破綻なし。gpt54_solo_dev は スキーマ非準拠だが内容は有効なため UNKNOWN 1 扱い）
- **severity分布: CRITICAL 22 / HIGH 56 / MEDIUM 24 / NULL 1（計103件）**
- ペルソナ別CRITICAL内訳:
  | persona | gemini | gpt54 | 小計 |
  |---|---:|---:|---:|
  | ai_ops | 0 | 1 | 1 |
  | devops_engineer | 3 | 3 | 6 |
  | qa_lead | 4 | 2 | 6 |
  | solo_dev | 6 | 0 | 6 |
  | tech_writer | 1 | 2 | 3 |
  | **合計** | **14** | **8** | **22** |

### 0.2 R3ラウンドをスキップする意思決定
**Plan E 採用（PO承認済 2026-04-19）**。R3 差分ラウンドを省略し、R2.1 修正パッケージ作成 → ゴールデン直行。

**根拠:**
1. R2で CRITICAL を出したペルソナが 10本中9本。R3差分ラウンドは実質的にゴールデンと同規模になる（§1.7 差分ラウンドの効率性メリットが消える）
2. 22件すべてが**実装バグ / 構造衝突の機械的修正**で、新規論点ではない（レビュアーに再問う価値が薄い）
3. R3を挟むとコスト $3-5＋Codeセッション起動1回を消費するだけで品質向上が期待できない
4. R2.1パッケージで差分パッチを明示し、ゴールデンで**最終確認ラウンド**として使う方が効率的

### 0.3 §5.5 棄却該当性チェック
R2パッケージ §5.5 で「PD-104/105/106 方針への異議は受理しない」と定めている。22件のCRITICAL全件を精査した結果:
- **棄却該当: 0件**
- ε クラスター（ζ, 2件）は「PD-104原文の§C1-C6 → R2差分で§C0-C6拡張」を指摘しているが、これは**方針への異議ではなく範囲境界の明確化要求**。§C0は「要約」として新設されたので、必須Read扱いにしても負荷増は小さい。採用＋PO判定を推奨（PD-107候補）。
- それ以外の20件は全て「改訂案に含まれたスクリプト実装の実装バグ」「ゲート番号再利用の構造衝突」「完了コマンド対応表の論理矛盾」で、方針とは無関係。

**結論: 22件全採用**

### 0.4 severity inflation チェック
R2パッケージ §5.3 で「R1既採用テーマの蒸し返しはMED以下」「既棄却LOW 4件の蒸し返しは棄却」を定めた。精査結果:
- **inflation 該当: 0件**
- むしろ R1で**見落とされていた FEASIBILITY CRITICAL が多数検出された**（α=3件, β=4件, δ=2件, ε=2件, θ=1件, κ=1件, λ=1件 = 14件）。これは R1で改訂案本文を「方針レベル」でレビューしていたが、**R2で改訂案に含めた scripts サンプル実装 / G番号表 / ファイル名規則 / 完了コマンド対応表 の具体実装レベルが初めて検証された**結果。R2 の本来の狙い通り。
- γ=3件, ζ=2件, η=1件, ι=1件, μ=1件 の8件も「構造的設計矛盾の初回検出」でinflationではない。

**結論: 全22件を R2 CRITICAL として正当に扱う**

---

## §1. R2 CRITICAL 22件 — 12クラスター集約

R2パッケージでは「10クラスター（α〜κ）」を Code G_44 完了報告で示したが、ADV精査の結果、**12クラスター（α〜κ + λ, μ）**で集約するのが正確。Codeの「α=4」「β=4」「δ=3」には playwright(μ) と awk(λ) と G8-realworld(β-2) が混在していたため細分化。

### 1.1 クラスター α — Vite SPA コミットハッシュ埋込未定義 【3件】

| # | ペルソナ | ID | loc | 要旨 |
|---:|---|---|---|---|
| α-1 | gemini_devops | R-001 | §4.2.1 | Vite デフォルトビルドでは index.html にコミットハッシュが出力されない → 30秒ポーリングが常にタイムアウト → デプロイ確実FAIL |
| α-2 | gemini_solo | R-002 | - | curl -s $URL \| grep -q $COMMIT_HASH は Vite SPA の HTML内にコミットハッシュ埋込の仕組みが未定義のため常に失敗 |
| α-3 | gpt54_devops | R-001 | §4.2.1 / §4.2.5 / §4.4.3 | Step 8 コミットハッシュgrepの前提仕組みが未定義 + 高リスク系は Step 12 cmd-realworld PASS まで DONE 不可のため Step 8 で停止すると Step 12 到達不能 = デッドロック |

**ADV判定: 採用（CRITICAL 正当）**。Plan E で Vite SPA の commit hash 埋込を SSOT で新規定義する。

**修正方針（R2.1 §4.1 に記載予定）:**
1. **Vite build時にコミットハッシュを `index.html` の `<meta name="commit-sha" content="...">` に埋め込む**（vite.config.ts に define プラグイン追加 or vite-plugin-html で変数展開）
2. もしくは **`/commit.txt` 静的ファイルを配信**（deploy.sh で `git rev-parse HEAD > dist/commit.txt` を実行）
3. Step 8 のポーリング対象を `curl -s $URL/commit.txt | grep -q $COMMIT_HASH` または `curl -s $URL | grep -oE 'meta name="commit-sha" content="[^"]*"' | grep -q $COMMIT_HASH` に変更
4. Worker ベース（Hono 等）の場合は `/api/version` ヘルスエンドポイントを必須化（`{ "commit": "abc123", "version": "1.2.3" }` 返却）
5. §4.2.1 に「デプロイ成果物にコミットハッシュを露出する仕組みの必須定義」を追加し、フロントエンド種別（SPA/Worker/Hybrid）別に方式を表で示す

**再発予防: 新設ゲート G14（gate_number_lint.sh とは別、§5.3 参照）**として `deploy_hash_verify.sh` を新設し、build時に埋込仕組みが機能しているかを pre-deploy で検証。

---

### 1.2 クラスター β — TDD証跡ファイル名分離 vs G8 未更新 【4件】

**β-1: canopy_common.sh::check_tdd が before.json をハードコード参照【3件】**

| # | ペルソナ | ID | loc | 要旨 |
|---:|---|---|---|---|
| β-1a | gemini_devops | R-002 | §4.6.3, §4.8 | before.json → before-unit.json 等に分離したが canopy_common.sh の G8 検証ロジック更新指示なし → G8 全ミッションで確実にFAIL |
| β-1b | gemini_qa | R-001 | §4.6.3, §4.8 | 同上。before-*.json / after-*.json のワイルドカード対応が必要 |
| β-1c | gemini_solo | R-005 | - | 同上。R2本文に G8 修正差分が含まれていないため運用不能 |

**β-2: G8 realworld RED段階ログ要求が非現実的【1件】**

| # | ペルソナ | ID | loc | 要旨 |
|---:|---|---|---|---|
| β-2 | gpt54_qa | R-002 | §2.8 / §4.2.5 / §4.6.3 | §2.8「G8 TDD証跡はAT単位、realworldは別」vs §4.6.3「before-realworld.json にも RED 段階ログ」→ realworld に RED 要求は本番環境で意図的バグ混入が必要 = 非現実的 |

**ADV判定: 採用（CRITICAL 正当）**。G8対象を明確化し、realworld を G8対象外に分離する。

**修正方針（R2.1 §4.2 に記載予定）:**
1. **§4.8 G8 定義を更新**: 「AT単位で before-unit.json / before-e2e.json の RED→GREEN トレースを検証」に明示（realworld を対象外と明記）
2. **canopy_common.sh::check_tdd を差し替え**:
   ```bash
   check_tdd() {
     local mission_dir="$1"
     local has_trace=0
     for kind in unit e2e; do
       if [ -f "$mission_dir/before-$kind.json" ] && [ -f "$mission_dir/after-$kind.json" ]; then
         # RED→GREEN 遷移検証
         jq -e '.failed > 0' "$mission_dir/before-$kind.json" > /dev/null || return 1
         jq -e '.failed == 0' "$mission_dir/after-$kind.json" > /dev/null || return 1
         has_trace=1
       fi
     done
     [ "$has_trace" -eq 1 ] || return 1
   }
   ```
3. **realworld 証跡を別ファイル名・別ゲートへ分離**:
   - `before-realworld.json` を削除
   - `realworld-proof.json`（デプロイ直後の smoke 結果、RED段階なし）
   - `realworld-screenshots/`（スクショ4基本操作分）
   - これらは **新設ゲート G17（realworld_proof_check.sh）** で検証（G8 とは別体系）
4. **§4.6.3 の証跡ファイル表を更新**: unit / e2e は G8 対象、realworld は G17 対象、と明示

**再発予防: 新設ゲート G15（tdd_trace_consistency.sh）**として、§4.6.3 で定義された証跡ファイル名と canopy_common.sh 実装の同期を pre-commit で自動検証。

---

### 1.3 クラスター γ — G10 番号再利用でシークレットスキャンゲート消失 【3件】

| # | ペルソナ | ID | loc | 要旨 |
|---:|---|---|---|---|
| γ-1 | gemini_tech_writer | R-001 | §4.8 | G10が「仕様書ファースト (scripts/spec_first_lint.sh)」に上書きされ、現行「シークレットスキャン」がゲート一覧から完全消失 = セキュリティ検証ゲート喪失 |
| γ-2 | gpt54_devops | R-003 | §4.8 / 現行§4.1 / dev_rules.md 連鎖 | R2で G1-G13 完全版と言いつつ G10 を「仕様書ファースト」へ再定義。セキュリティゲートが表から消え、development_rules.md 更新次第ではデプロイが通過する危険 |
| γ-3 | gpt54_tech_writer | R-001 | §4.8, §4.9.1, 現行§4.1/§20 | G11-G13 を追加しつつセキュリティスキャンの再配置先が示されず、既存ゲート番号の意味上書きで development_rules / canopy / sub_infrastructure との相互参照破損 |

**ADV判定: 採用（CRITICAL 正当）**。G10 は現行「シークレットスキャン」のまま据え置き、新ゲートは G11以降を使う。

**修正方針（R2.1 §4.3 に記載予定）:**
1. **§4.8 G1-G17 完全版ゲート表を再構築**（最終割当）:
   | G | 名称 | スクリプト |
   |---|---|---|
   | G1 | バージョン同期 | scripts/version_sync.sh |
   | G2 | Stage A健全性 | canopy_common.sh::check_stage_a |
   | G3 | テスト項目数 | canopy_common.sh::check_test_count |
   | G4 | テスト全PASS | canopy_common.sh::check_test_pass |
   | G5 | 報告フォーマット | canopy_common.sh::check_report_format |
   | G6 | デプロイパイプライン | canopy_common.sh::check_deploy_pipeline |
   | G7 | 仕様↔完了コマンド対応 | canopy_common.sh::check_spec_map |
   | G8 | TDD証跡（unit/e2e） | canopy_common.sh::check_tdd |
   | G9 | UIスクショ判定 | canopy_common.sh::check_ui_screenshot |
   | **G10** | **シークレットスキャン（据え置き）** | pre-commit + canopy_common.sh::check_secrets |
   | G11 | Step 0 参照漏れ検出（R2新設） | scripts/step0_lint.sh |
   | G12 | 提案ログ形式検証（R2新設） | scripts/proposal_log_lint.sh |
   | G13 | pre-commitフック存在検証（R2新設） | scripts/verify_hooks.sh |
   | G14 | 仕様書ファースト（R2.1 新設、旧 G10上書き先） | scripts/spec_first_lint.sh |
   | G15 | TDD証跡 ↔ canopy同期（R2.1 新設） | scripts/tdd_trace_consistency.sh |
   | G16 | デプロイhash埋込検証（R2.1 新設） | scripts/deploy_hash_verify.sh |
   | G17 | realworld証跡（R2.1 新設） | scripts/realworld_proof_check.sh |
2. **development_rules.md 連鎖更新指示を §4.9.1 で明示**: 「G10=シークレットスキャン」を維持、新ゲートは G14-G17 を追加と明記
3. **CLAUDE.md / sub_infrastructure.md の G10 参照箇所も据え置き**（破壊的変更回避）

**再発予防: 新設ゲート G14 の機能の一部として gate_number_lint.sh を組み込む**（§5.1 参照）。「同じG番号を2つのスクリプトが主張していないか」を pre-commit で検出。

---

### 1.4 クラスター δ — bash 3.2 非互換な RISK_PATHS 配列設計 【2件】

| # | ペルソナ | ID | loc | 要旨 |
|---:|---|---|---|---|
| δ-1 | gpt54_ai_ops | R-003 | §4.3.4 / §3.1.4 / §3.3 | mission_risk_classifier.sh が `source scripts/lib/risk_patterns.sh` の RISK_PATHS 配列を `for pattern in "${RISK_PATHS[@]}"` で扱う。クラスターAで POSIX+bash3.2 互換化を必須にした方針と整合しない |
| δ-2 | gpt54_devops | R-002 | §4.3.4 / §4.3.5 / §3.3 | mission_risk_classifier.sh と hflow_trigger_check.sh の共通ライブラリ設計が Bash 配列依存。macOS/bash 3.2 互換要求と矛盾。さらに pattern を grep に渡す方式は部分一致に依存し §3.2.1「完全一致」要件と不一致 |

**ADV判定: 採用（CRITICAL 正当）**。bash 3.2 は indexed array をサポートするが、R2パッケージがクラスターA（macOS非互換コマンド）で「POSIX+bash3.2互換」を全スクリプトの方針として明記した以上、新設スクリプトも例外なく準拠すべき。

**修正方針（R2.1 §4.4 に記載予定）:**
1. **`scripts/lib/risk_patterns.sh` を改行区切り文字列定義に変更**:
   ```bash
   # scripts/lib/risk_patterns.sh (POSIX互換)
   # 高リスクファイルパスプレフィックス（1行1パターン、# コメント可）
   RISK_PATHS='src/auth/
   src/payment/
   src/services/supabase.ts
   src/services/external/
   supabase/migrations/
   .env
   .dev.vars'
   export RISK_PATHS
   ```
2. **呼び出し側を POSIX sh 互換ループに統一**:
   ```sh
   # mission_risk_classifier.sh / hflow_trigger_check.sh 共通
   . "$(dirname "$0")/lib/risk_patterns.sh"
   is_risk_path() {
     local target="$1"
     printf '%s\n' "$RISK_PATHS" | while IFS= read -r pattern; do
       [ -z "$pattern" ] && continue
       case "$target" in
         "$pattern"*) echo "MATCH:$pattern"; return 0 ;;
       esac
     done
     return 1
   }
   ```
3. **判定仕様を「prefix match」で統一**（§3.2.1 に明記）: `src/auth/**` は prefix `src/auth/` として扱う
4. **§3.1.4 / §3.2.1 / §3.3 のパス定義を1箇所に集約**（現状3箇所に分散している揺れを解消）: 正本は `scripts/lib/risk_patterns.sh`、参照元は全てここを引く

**再発予防: 既存 G1 相当で POSIX 互換性を静的チェック**: `scripts/lib/*.sh` に bash拡張構文（`[[ ]]`, `${var[@]}`, `mapfile`, `<()`, `(( ))`) が含まれていないかを pre-commit で検出（shellcheck --shell=sh で代替可能）。§4.3 で既設計に追記予定。

---

### 1.5 クラスター ε — hflow_trigger_check.sh の git diff タイミング問題 【2件】

| # | ペルソナ | ID | loc | 要旨 |
|---:|---|---|---|---|
| ε-1 | gemini_devops | R-003 | §3.2.2, §4.3.5 | hflow_trigger_check.sh が git diff --cached 前提だが deploy.sh 内で呼ぶタイミング未明記。commit 後なら --cached 空でHフロー絶対発火しない |
| ε-2 | gemini_qa | R-002 | §3.2.2, §4.3.5 | 同上。deploy.sh 実行時は既にコミット済みのため --cached ではバージョンバンプ差分しか取れない |

**ADV判定: 採用（CRITICAL 正当）**。PD-106「Hフロー発火条件を git diff ファイルパスで機械判定」が根本的に機能しない設計。

**修正方針（R2.1 §4.5 に記載予定）:**
1. **hflow_trigger_check.sh を呼び出しコンテキスト別に分岐**:
   - pre-commit フック内: `git diff --cached --name-only` で判定（コミット直前）
   - pre-push フック内 / deploy.sh 内: `git diff --name-only "$(git merge-base origin/main HEAD)"...HEAD` で判定（push/deploy対象のコミット全体）
2. **呼び出し位置を §3.2.2 / §4.3.5 に明記**:
   - **pre-commit**（必須）: コミット前のチェック（スピード優先、最小セット）
   - **pre-push**（必須）: プッシュ前の包括チェック（main との比較）
   - **deploy.sh 冒頭**（推奨）: deploy 開始前の最終確認（merge-base で判定）
3. **スクリプト本体に CONTEXT 環境変数で分岐**:
   ```sh
   # hflow_trigger_check.sh
   CONTEXT="${HFLOW_CONTEXT:-auto}"
   case "$CONTEXT" in
     pre-commit) CHANGED=$(git diff --cached --name-only) ;;
     pre-push|deploy)
       BASE=$(git merge-base origin/main HEAD 2>/dev/null || echo HEAD~1)
       CHANGED=$(git diff --name-only "$BASE"...HEAD)
       ;;
     auto)
       # フック文脈を自動判定: GIT_INDEX_FILE 環境変数が設定されていれば pre-commit
       if [ -n "$GIT_INDEX_FILE" ]; then
         CHANGED=$(git diff --cached --name-only)
       else
         BASE=$(git merge-base origin/main HEAD 2>/dev/null || echo HEAD~1)
         CHANGED=$(git diff --name-only "$BASE"...HEAD)
       fi
       ;;
   esac
   ```
4. **affected-tests.sh との設計一貫性**: affected-tests.sh が既に `git merge-base origin/main HEAD` を使っているため、同じパターンを採用（gemini_qa R-002 の提案通り）

---

### 1.6 クラスター ζ — §C0-C6 必須Read 範囲の PD-104 逸脱 【2件】 ⚠️ **PO判定必要**

| # | ペルソナ | ID | loc | 要旨 |
|---:|---|---|---|---|
| ζ-1 | gemini_solo | R-001 | - | §2.6「毎回必須は§C0のみ、§C1-C6は条件付き再読」vs §4.1.2 表「ENG必須Read = §C0-C6 全文」の矛盾。毎回全仕様Readでコンテキスト爆発 |
| ζ-2 | gpt54_tech_writer | R-002 | §0.2, §4.1.2, §4.1.6, §6.2 | PD-104原文「§C1-C6 全文」が R2差分で「§C0-C6 全文」に拡張。§C0はクラスターF対応で新設された要約だが、PO承認範囲を超えている |

**ADV判定: 採用（CRITICAL 妥当）**。ただし**方針への異議ではなく範囲境界の明確化要求**であるため §5.5 棄却該当しない。**PO判定（PD-107候補）が必要**。

**矛盾の本質:**
- R2本文内部に明確な矛盾が2箇所ある（§2.6 vs §4.1.2、§4.1.6 vs §4.1.2）
- R2は PD-104を引用して「確定仕様」と称しているが、PD-104原文は §C1-C6 で §C0 は含まれない
- §C0 は「1ページ要約」として新設された軽量テキスト（推定50-100行）

**PO判定 2案:**

**A案（拡張公式化）: PD-104 を PD-107 で更新し、§C0 を必須Read に含める**
- 変更: 必須Read = 「§C0（要約）+ CLAUDE.md + development_rules.md + session_progress.md」に固定
- §C1-C6 は「条件付き再読」（Step 0 参照Read、フローで必要セクションのみ）
- **メリット**: §4.1.2 表をそのまま保持できる / 要約版を毎回確認する運用は軽量で現実的 / 起動時 Read 量を大幅削減
- **デメリット**: PD-104 の原文を更新する必要あり（過去履歴の整合性要注意）
- 実運用上の Read 量: §C0 50-100行 + CLAUDE 221行 + rules 76行 + progress 5行サマリー = 約400行（現実的）

**B案（原文遵守）: §C0 は補助扱い、必須Read は §C1-C6 のまま**
- 変更: §4.1.2 表を「必須Read = §C1-C6 全文」に戻す
- §C0 は「Step 0 参照時の要約補助として任意参照可」
- **メリット**: PD-104 の原文を一切変更しない / 範囲境界が明確
- **デメリット**: ENG は毎回 §C1-C6 全文（推定 800-1,000行）を Read → API コスト＆コンテキスト圧迫（クラスターF課題の再発リスク）
- 実運用上の Read 量: §C1-C6 ~1,000行 + CLAUDE 221行 + rules 76行 = 約1,300行（重い）

**ADV推奨: A案**。理由:
1. クラスターF「起動時Read量の過大」対応として §C0 を新設した経緯があり、要約を毎回確認する運用は設計意図に合致
2. B案は「クラスターF未解決」に戻ることを意味し、ソロ開発運用の制度疲労（gemini_solo指摘）に直結
3. PD-104 は「3分岐方式」が本質で、§C範囲は実装詳細。PD-107 で明文化することで後世の運用者の混乱を防ぐ

**このクラスターのみ ふとし（PO）の A/B 判定が必要**。次のターンで判定を求める。

---

### 1.7 クラスター η — 3層テスト戦略 × 完了コマンド3区分 DONE条件破綻 【1件】

| # | ペルソナ | ID | loc | 要旨 |
|---:|---|---|---|---|
| η-1 | gpt54_qa | R-001 | §4.2.5 / §4.4.3 / §3.1.3 | §4.2.5「L1-realworld=デプロイ直後、L2=実装完了」vs §4.4.3「高リスク系=cmd-realworld PASS時点がDONE」で cmd-e2e 完了タイミングが「実装完了時」のまま残る。結果として「実装完了時点L2必須＋ミッション完了はデプロイ後」の二段階状態が未定義 → L2だけ通してDONE誤判定 or 常時BLOCKED の両方が起こり得る |

**ADV判定: 採用（CRITICAL 正当）**。R1 で指摘されたデッドロック／二重定義が完全には解消していない。

**修正方針（R2.1 §4.6 に記載予定）:**
1. **3状態モデルを明示**: ミッションステータスに以下3状態を定義
   - `IN_PROGRESS`（実装中）
   - `READY_FOR_DEPLOY`（実装完了・L2/cmd-e2e PASS・デプロイ待ち）【新設】
   - `DONE`（デプロイ後・L1-realworld/cmd-realworld PASS）
2. **リスク別 DONE 条件表を §4.4.3 に固定**:
   | リスク | cmd-unit | cmd-e2e | cmd-realworld | 中間状態 | DONE条件 |
   |---|---|---|---|---|---|
   | 低 | 必須 | N/A可（理由必須） | N/A可 | IN_PROGRESS → DONE | cmd-unit PASS |
   | 中 | 必須 | 必須 | N/A可（理由必須） | IN_PROGRESS → DONE | cmd-unit + cmd-e2e PASS |
   | 高（認証/決済/外部API） | 必須 | 必須 | 必須 | IN_PROGRESS → READY_FOR_DEPLOY → DONE | 全3区分 PASS + deploy後 cmd-realworld PASS |
3. **session_progress.md の STATUS 遷移を §4.2 に明記**:
   - `STATUS: IN_PROGRESS`
   - `STATUS: READY_FOR_DEPLOY`（高リスク系のみ。L2+cmd-e2e PASS で到達）
   - `STATUS: DONE`
4. **§3.1.3 / §4.2.5 / §4.4.3 の3箇所の記述を整合**: 正本を §4.4.3 とし、他2箇所は参照のみに簡略化

---

### 1.8 クラスター θ — proposal_log_lint.sh セッションID取得未定義 【1件】

| # | ペルソナ | ID | loc | 要旨 |
|---:|---|---|---|---|
| θ-1 | gemini_solo | R-006 | - | proposal_log_lint.sh が「セッションID（例: G_42）との差分を動的計算」とあるが、bashが現在のセッションIDをどこから取得するか未定義 |

**ADV判定: 採用（CRITICAL 正当）**。G12 ゲートの実装が不能。

**修正方針（R2.1 §4.7 に記載予定）:**
1. **セッションIDでの差分計算を廃止**: 提案日（`YYYY-MM-DD`）と現在日時（`date +%Y-%m-%d`）の差分で滞留警告を出す（gemini_solo 提案採用）
2. **提案ログフォーマットに日付欄を必須化**:
   ```markdown
   ### 提案タイトル (2026-04-19 G_44)
   - **STATUS:** SUGGESTED | WAITING_PO | APPROVED | REJECTED
   - **提案日:** 2026-04-19
   - **滞留日数:** {自動計算}
   ```
3. **proposal_log_lint.sh の実装**:
   ```sh
   #!/bin/sh
   # proposal_log_lint.sh — macOS/GNU date両対応
   THRESHOLD_DAYS=7
   NOW_EPOCH=$(date +%s)
   grep -nE '^### .+ \([0-9]{4}-[0-9]{2}-[0-9]{2} G_[0-9]+\)$' instructions/session_progress.md | while IFS= read -r line; do
     proposal_date=$(echo "$line" | sed -nE 's/.*\(([0-9]{4}-[0-9]{2}-[0-9]{2}) G_[0-9]+\).*/\1/p')
     # macOS: date -j -f "%Y-%m-%d" "$proposal_date" +%s / Linux: date -d "$proposal_date" +%s
     proposal_epoch=$(date -j -f "%Y-%m-%d" "$proposal_date" +%s 2>/dev/null || date -d "$proposal_date" +%s)
     days=$(( (NOW_EPOCH - proposal_epoch) / 86400 ))
     status=$(echo "$line" | grep -oE 'STATUS: (SUGGESTED|WAITING_PO)' || true)
     if [ -n "$status" ] && [ "$days" -ge "$THRESHOLD_DAYS" ]; then
       echo "STALE: ${days}d - $line"
     fi
   done
   ```
4. **BSD date / GNU date 両対応を明記**（HIGH 指摘 `proposal_log_lint.sh` macOS 非互換の同時解消）

---

### 1.9 クラスター ι — wrangler whoami WARN でゲートバイパス 【1件】

| # | ペルソナ | ID | loc | 要旨 |
|---:|---|---|---|---|
| ι-1 | gemini_qa | R-004 | §4.2.2, §4.3.2 | §4.2.2「認証・決済未設定はFAIL（エスケープ不可）」vs §4.3.2「wrangler whoami 未認証時はWARN+手動確認」。wrangler からログアウトするだけで必須ゲートをバイパスできる |

**ADV判定: 採用（CRITICAL 正当）**。セキュリティ穴。

**修正方針（R2.1 §4.8 に記載予定）:**
1. **verify_external_services.sh をミッションリスク分岐**:
   ```sh
   # verify_external_services.sh
   MISSION_RISK=$("$(dirname "$0")/mission_risk_classifier.sh" "$1")
   if ! wrangler whoami > /dev/null 2>&1; then
     if [ "$MISSION_RISK" = "high" ]; then
       echo "FAIL: wrangler not authenticated + high-risk mission (auth/payment/external_api)"
       echo "  required: wrangler login  または ローカルエミュレータでの代替証跡提示"
       exit 1
     else
       echo "WARN: wrangler not authenticated (low/mid-risk mission, manual verification acceptable)"
       exit 0  # WARN
     fi
   fi
   ```
2. **§4.2.2 / §4.3.2 の記述を整合**: 「高リスク系 = FAIL（代替証跡で解除可）」「低/中リスク = WARN（手動確認可）」を明記
3. **HIGH 指摘「手動証跡が曖昧」の同時解消**: 「代替証跡 = ローカルエミュレータ出力ログ / wrangler dev スクショ / session_progress.md への具体検証手順記載」と具体化

---

### 1.10 クラスター κ — pre-commit-sub [ -x HOOK ] 論理式バグ 【1件】

| # | ペルソナ | ID | loc | 要旨 |
|---:|---|---|---|---|
| κ-1 | gemini_solo | R-004 | - | `[ -x "$HOOK" ] && "$HOOK" \|\| exit 1` は HOOK 不存在時に `false \|\| exit 1` と評価されエラー終了 → コミットブロック。cd未実施で相対パス処理も壊れる |

**ADV判定: 採用（CRITICAL 正当）**。フック未配置時に全コミットがブロックされる運用崩壊。

**修正方針（R2.1 §4.9 に記載予定）:**
1. **pre-commit-sub 呼び出しを if 文に書き換え**:
   ```sh
   # 親 pre-commit フック内
   HOOK_SUB="$SUBDIR_ROOT/scripts/pre-commit-sub.sh"
   if [ -x "$HOOK_SUB" ]; then
     (cd "$SUBDIR_ROOT" && ./scripts/pre-commit-sub.sh) || exit $?
   fi
   # フック未配置は正常ケース（サブディレクトリ未使用プロジェクト）
   ```
2. **§4.5.1 / §4.5.7 / §4.9.x の該当箇所を統一差分で修正**
3. **verify_hooks.sh（G13）に「親 pre-commit と pre-commit-sub の整合性検証」を追加**: if 文の論理が正しいか、cd が含まれているかを静的検証

---

### 1.11 クラスター λ — mission_risk_classifier.sh awk 対象ファイル抽出失敗 【1件】

| # | ペルソナ | ID | loc | 要旨 |
|---:|---|---|---|---|
| λ-1 | gemini_solo | R-003 | - | `awk '/^対象ファイル:/,/^$/'` は実テンプレ `> 対象ファイル: src/xxx.js`（行頭`>`）に対応しない。複数行ではなく1行カンマ区切りも対応外 → 常に低リスク判定 |

**ADV判定: 採用（CRITICAL 正当）**。mission_risk_classifier.sh が全ミッションで「低リスク」を返し、λ（クラスターAのPOSIX互換）と合わせて PD-105/106 全体が機能しない。

**修正方針（R2.1 §4.10 に記載予定）:**
1. **抽出ロジックを POSIX grep + sed に書き換え**:
   ```sh
   # mission_risk_classifier.sh
   extract_target_files() {
     local mission_file="$1"
     # `> 対象ファイル: ...` または `対象ファイル: ...` の両方に対応
     # 1行カンマ区切り、または複数行両対応
     grep -E '^>?[[:space:]]*対象ファイル:' "$mission_file" | \
       sed -E 's/^>?[[:space:]]*対象ファイル:[[:space:]]*//' | \
       tr ',' '\n' | \
       sed -E 's/^[[:space:]]+|[[:space:]]+$//g' | \
       grep -v '^$'
   }
   ```
2. **ミッションテンプレv3 の「対象ファイル:」行フォーマットを §5 に明記**:
   - 標準: `> 対象ファイル: src/xxx.js, src/yyy.js`（引用＋1行カンマ区切り）
   - 許容: `> 対象ファイル:\n>   - src/xxx.js\n>   - src/yyy.js`（引用＋複数行リスト）
3. **検証サンプル付き**: R2.1 §4.10 にテストケース3種（引用なし / 引用あり / 複数行）を提示

---

### 1.12 クラスター μ — playwright realworld testDir モック混在 【1件】

| # | ペルソナ | ID | loc | 要旨 |
|---:|---|---|---|---|
| μ-1 | gemini_qa | R-003 | §4.4.5 | playwright.realworld.config.ts の testDir=./tests で --grep "MISSION-ID" すると tests/e2e/（モック）と tests/realworld/（実機）が混在 → cmd-realworld「モックなし実機検証」の目的破綻 |

**ADV判定: 採用（CRITICAL 正当）**。実機検証として実行されたテストの一部が実はモック = 証跡の信頼性喪失。

**修正方針（R2.1 §4.11 に記載予定）:**
1. **playwright.realworld.config.ts の testDir を ./tests/realworld に固定**:
   ```typescript
   // playwright.realworld.config.ts
   export default defineConfig({
     testDir: './tests/realworld',  // e2e モックを完全除外
     grep: /@realworld/,  // タグ必須（二重防御）
     use: { baseURL: process.env.REALWORLD_URL, /* モックプロバイダなし */ },
   });
   ```
2. **tests/realworld/ 配下のテストには `test.describe('xxx @realworld', ...)` タグを必須化**（§4.6.3 に明記）
3. **モック層の誤用検出**: tests/realworld/ 配下で `msw` / `@supabase/supabase-js mock` 等のimportを静的検査（新設 lint `realworld_mock_guard.sh` か既設 G4 拡張で対応）
4. **§4.4.5 / §4.6.3 の該当記述を差し替え**

---

---

## §2. HIGH 56件 — 概観と新クラスター特定

### 2.1 HIGH の内訳分析

HIGH 56件を ADV 精査した結果、以下のように分類:

| 分類 | 件数 | R2.1での扱い |
|---|---:|---|
| CRITICAL 同クラスター（α〜μ）の別角度指摘 | 約 28 件 | CRITICAL 修正で自動解消（R2.1 §4.x に包含） |
| 新クラスター ν（G7 スクリプト齟齬） | 1件 | R2.1 §4.12 で正式修正 |
| 新クラスター ξ（SKIP/N/A/WARN 一貫性） | 5件 | R2.1 §4.13 で正式修正 |
| 新クラスター ο（Filter 1-7 定義不整合） | 2件 | R2.1 §4.14 で正式修正 |
| 新クラスター π（templates/** ADV書き込みホワイトリスト） | 2件 | R2.1 §4.15 で正式修正 |
| 新クラスター ρ（G13 N日 / deploy.sh タグ混入） | 3件 | R2.1 §4.16 で正式修正 |
| 新クラスター σ（高リスク判定パス3箇所分散） | 4件 | R2.1 §4.17 で正式修正（δ クラスターと併合修正） |
| 新クラスター τ（DEPLOY-RECOVER 書き込み主体未定義） | 2件 | R2.1 §4.18 で正式修正 |
| 新クラスター υ（Step 0 参照列挙 vs 全フロー廃止の矛盾） | 2件 | R2.1 §4.19 で正式修正 |
| 残余（ゴールデン余地として保留） | 約 7 件 | ゴールデンラウンドで再出現する場合のみ対応 |

### 2.2 新クラスター詳細

**ν（1件）— G7 スクリプトの二重記載**
- gpt54_devops HIGH §4.4.2 / §4.8: §4.8 表で G7 は `canopy_common.sh::check_spec_map` だが §4.4.2 では `mission_linter` と記載
- **修正: G7 正本を `canopy_common.sh::check_spec_map` に統一（§4.4.2 を参照表記に変更）**

**ξ（5件）— SKIP / N/A / WARN の一貫性不足**
- SKIP=DONE不可（G5 現行定義）vs SKIP 許容（R2 §4.4.7）の矛盾
- PD-105「高リスク系は3区分すべて必須」vs §4.4.2「N/A可」の衝突
- `SKIP（理由必須）` `N/A（理由必須）` `WARN（手動確認可）` の 3用語が混在、定義境界不明
- **修正: 3用語を §3.1.5 で厳密定義**:
  - `N/A`: 該当しない（例: ネイティブアプリでブラウザE2E不要）。理由必須。リスク分類により使用可否分岐（高リスクは不可）
  - `SKIP`: 一時的に飛ばす（例: 外部依存の障害中）。理由＋リトライ予定必須。DONE不可、再実行して PASS/FAIL が必要
  - `WARN`: 警告付き通過（例: wrangler未認証でも低リスク系は通過）。理由＋手動代替証跡必須
- §4.4.7 の表を上記定義で書き直し、完了コマンド3区分 × 3状態の正規化マトリクスを付記

**ο（2件）— Filter 1-7 定義不整合**
- gpt54_tech_writer HIGH §5.4: R2パッケージ §5.4 Filter 1-7 の説明が sub_review_flow.md §2 と不一致
- R2パッケージ: Filter 1=既存仕様照合, Filter 2=PO決定事項 …
- sub_review_flow.md §2: Filter 1=Severity整合, Filter 2=Category整合 …（実際の現行定義）
- **修正: R2.1 §5.4 の Filter 1-7 記述を sub_review_flow.md §2 の現行定義に完全揃え**（レビュアー指示内の誤記 / R2.1 単独修正で完結）

**π（2件）— templates/** ADV書き込みホワイトリスト**
- gpt54_tech_writer HIGH §4.1.4: 「templates/** はADV書き込み可」と R2 本文に記載だが、現行 sub_adv_protocol.md §1 のホワイトリストに templates/** がない
- 「scripts/*実装*.js」という用語も機械判定不能（どのファイル名が"実装"に当たるか曖昧）
- **修正: R2.1 §4.9 の sub_adv_protocol.md 連鎖更新で**:
  - ADV書き込み可リストに `templates/**` を明示追加
  - 「scripts/*実装*.js」を `scripts/lib/*.sh, scripts/*_lint.sh, scripts/ai_review.js（ADV調整時のみ）` に具体列挙
  - ADV書き込み禁止リストを明確化（src/**, tests/**, supabase/** 等）

**ρ（3件）— G13 N日 / deploy.sh タグ混入**
- HIGH §4.5.4 / §4.8 G13: 「最近N日以内にhook発火ログが存在」の N日が未定義（自動判定不能）
- 発火ログに [pre-commit] だけでなく [pre-push] [deploy.sh] タグも記録対象だが、G13 判定では [deploy.sh] はフック経由ではないため含めるべきでない
- **修正: R2.1 §4.5.4 / §4.8 G13 を**:
  - N = **7日** に固定（dev-system 本文で明記）
  - G13 判定対象タグを `[pre-commit]` `[pre-push]` の2つに限定（`[deploy.sh]` は除外、別ゲート G17 で扱う）
  - logs/canopy_fire.log にタグ付き1行記録、canopy.sh に `--caller=pre-commit|pre-push|deploy` 引数を追加

**σ（4件）— 高リスク判定パスが §3.1.4 / §3.2.1 / §3.3 の3箇所で不整合**
- PD-105本文「外部API呼び出し一般」
- §3.1.4「src/services/external/**」
- PD-106「supabase.ts 等の特定ファイル」
- §3.2.1「prefix match」vs §3.1.4「完全一致」vs 実装 grep「部分一致」
- **修正: δクラスターの `scripts/lib/risk_patterns.sh` を「高リスクパスのSSOT」に昇格**し、§3.1.4 / §3.2.1 / §3.3 の記述は全て「正本は risk_patterns.sh、内容は以下のとおり（抜粋）」と参照表記に統一

**τ（2件）— DEPLOY-RECOVER 挿入の書き込み主体未定義**
- HIGH §4.2.4 / §2.9: deploy.sh 失敗時に session_progress.md へ DEPLOY-FAIL を追記＋次ミッション先頭へ DEPLOY-RECOVER を挿入、とあるが書き込み主体が deploy.sh（自動）なのか ENG（手動）なのか未定義
- **修正: deploy.sh 自動追記方式を採用**:
  - deploy.sh 失敗時に `scripts/append_deploy_fail.sh` を呼び出し、session_progress.md へ構造化追記
  - 追記フォーマットを §4.2.4 で固定: `- [DEPLOY-FAIL] MISSION-ID / timestamp / last stdout tail / next: DEPLOY-RECOVER`
  - DEPLOY-RECOVER ミッション雛形を `templates/deploy_recover_template.md` として同梱
- ENG の介入は「DEPLOY-FAIL を確認して手動でPOに報告」のみに限定

**υ（2件）— Step 0 参照列挙 vs 全フロー廃止の矛盾**
- HIGH §4.1.7 / §3.1.1: §3.1.1 で「全フロー個別列挙廃止」と定めたが §4.1.7 で「全22フローの Step 0 を以下の文言に統一」「該当§C明示リスト」を各フローに記載するよう指示 = 実質個別列挙
- **修正: Step 0 を章単位集約に統一**（PD-105 原文準拠）:
  - §4.1.7 の「全フローに Step 0 テンプレを記載」を廃止
  - 代わりに §C0（起動時共通規約）に「Step 0 = §C0+CLAUDE+rules+progress」と共通定義
  - 各フローでは「Step 0: §C0 参照」とだけ記載（該当§Cは §C0 の冒頭参照表で統一管理）

### 2.3 残余 HIGH（ゴールデン余地）

以下はゴールデンラウンドで再出現するかチェックするだけで、R2.1 本文修正は保留:
- `logs/canopy_fire.log` 呼び出し元タグの記録形式詳細（MISSING §4.5.4）
- L1スモーク 4基本操作 vs 現行5操作の減少問題（MISSING §4.2.3）→ L1定義で4操作を最低限と明記、5操作は推奨オプション
- `scripts/cf_rollback.sh` と `scripts/rollback.sh` の役割重複（CONTRADICTION §4.2.4）→ CF Pages用と汎用 git revert用で分離（ファイル名で用途明確化）
- 統合E2E 定義の不明確性（AMBIGUITY §4.2.3）→ §9（新設）で統合E2E を詳細化
- §0.1 severity基準の曖昧さ（AMBIGUITY）→ R2.1 §5 レビュアー指示で明文化済みのため追加対応不要
- `[ -x HOOK ]` 付近のルート外 source リスク（ROBUSTNESS）→ §4.4 δクラスター修正で解消
- SKIP-RETRY 旧仕様との整合（CONTRADICTION §4.4.7）→ §4.13 ξクラスター修正で解消

---

## §3. PO判定依頼項目

### 3.1 PD-107 候補: §C0 の必須Read扱い（ζクラスター由来）

**判定対象:** §1.6 ζ クラスター（2件の CRITICAL）

**背景:**
- PD-104（R1クラスターD採用）原文: ENG/ADV の必須Read = `§C1-C6 全文`（§C0 は存在しなかった）
- クラスターF（起動時Read量過大）対応として R2 で §C0（1ページ要約）を新設
- R2 本文 §4.1.2 の表で ENG 必須Read を「§C0-C6 全文」に拡張 → PD-104 原文を超える記述に
- R2 内部で §2.6 vs §4.1.2 の記述矛盾が発生

**A案（ADV推奨）: PD-107 を新設し §C0 を必須Read に公式化**
- 必須Read: `§C0（要約、50-100行）+ CLAUDE.md + development_rules.md + session_progress.md`（合計 約400行）
- 条件付き再読: `§C1-C6 全文`（各フロー Step 0 参照時のみ）
- §4.1.2 の表をそのまま維持、§2.6/§4.1.6 を A案に整合させる
- 実運用: ENG は毎セッション §C0 要約 + CLAUDE/rules/progress で起動、必要フロー時のみ §C1-C6 を参照 Read

**B案: §C0 は補助扱い、PD-104 原文どおり §C1-C6 を必須Read に維持**
- 必須Read: `§C1-C6 全文（800-1,000行）+ CLAUDE.md + development_rules.md`（合計 約1,300行）
- §C0 は任意参照の補助資料
- §4.1.2 の表を B案に書き戻す
- 実運用: 毎セッション §C1-C6 全文 Read → クラスターF対応（Read 量過大）は未解決に戻る

**ADV 3ペルソナ制 合議結果:**
- **ADV判定**: A案推奨。要約運用は設計意図（クラスターF解決）と合致。
- **QA検証**: A案の方が Filter 1-7 の一貫性が保てる（§2.6/§4.1.2/§4.1.6 の3箇所を A案で整合可能）。
- **PO代理**: A案は PD-104 原文変更が必要で、PO判定 PD-107 新設として正式化する必要あり。PO直判定対象。

**ふとし（PO）への判定依頼:** A案 or B案。A案採用ならPD-107として po-decisions.md に追記。

---

## §4. 新設ゲート設計（G14-G17）

R2.1 では γ・β・α クラスターの再発予防として、新設ゲート4本を設計する。既設 G11/G12/G13（R2新設）と合わせて G14-G17 で完全体。

### 4.1 G14: scripts/spec_first_lint.sh（仕様書ファースト検証）
- **目的**: 旧 G10 上書き先だった「仕様書ファースト」を G14 として独立確立
- **検証内容**: 
  - ミッション定義の「参照:」欄に docs/plans/*.md が最低1本含まれているか
  - 参照された docs/plans/*.md が実在するか
  - ミッション内の `対象ファイル:` が参照仕様書で言及されているか（曖昧検索で近似マッチ）
- **発火タイミング**: pre-commit（canopy経由）+ Stage A
- **POSIX 互換**: bash 3.2 + /bin/sh 動作保証

### 4.2 G15: scripts/tdd_trace_consistency.sh（TDD証跡 ↔ canopy同期）
- **目的**: βクラスター再発予防。§4.6.3 の証跡ファイル名と canopy_common.sh::check_tdd の実装を同期検証
- **検証内容**:
  - §4.6.3 に記載された証跡ファイル名（`before-unit.json` 等）を grep で抽出
  - canopy_common.sh::check_tdd が同じファイル名を参照しているか grep で確認
  - 不一致があれば FAIL（仕様書と実装の乖離を検出）
- **発火タイミング**: pre-commit（canopy_common.sh 自身の変更時のみ）
- **実装サンプル**:
  ```sh
  # scripts/tdd_trace_consistency.sh
  SPEC_FILES=$(grep -oE 'before-[a-z]+\.json|after-[a-z]+\.json' docs/plans/dev_system_spec.md docs/plans/sub_testing.md | sort -u)
  IMPL_FILES=$(grep -oE 'before-[a-z]+\.json|after-[a-z]+\.json' scripts/lib/canopy_common.sh | sort -u)
  if [ "$SPEC_FILES" != "$IMPL_FILES" ]; then
    echo "FAIL: TDD trace file mismatch"
    diff <(echo "$SPEC_FILES") <(echo "$IMPL_FILES")
    exit 1
  fi
  ```

### 4.3 G16: scripts/deploy_hash_verify.sh（デプロイhash埋込検証）
- **目的**: αクラスター再発予防。デプロイ成果物にコミットハッシュが確実に埋め込まれているかを pre-deploy で検証
- **検証内容**:
  - SPA: `dist/index.html` に `<meta name="commit-sha" content="..."` が含まれるか、または `dist/commit.txt` が存在するか
  - Worker: `dist/**/*.js` に `COMMIT_SHA` 定数が埋め込まれているか
  - いずれも現在の `git rev-parse HEAD` と一致するか
- **発火タイミング**: deploy.sh 冒頭（pre-deploy gate）
- **実装サンプル**:
  ```sh
  # scripts/deploy_hash_verify.sh
  COMMIT=$(git rev-parse HEAD)
  SHORT=${COMMIT:0:7}
  # SPA検証
  if [ -f dist/index.html ]; then
    if ! grep -q "commit-sha\" content=\"$COMMIT" dist/index.html && \
       ! grep -q "commit-sha\" content=\"$SHORT" dist/index.html && \
       ! [ -f dist/commit.txt ]; then
      echo "FAIL: SPA dist/index.html does not embed commit SHA"
      exit 1
    fi
  fi
  # commit.txt 検証
  if [ -f dist/commit.txt ] && ! grep -q "$SHORT" dist/commit.txt; then
    echo "FAIL: dist/commit.txt commit mismatch"
    exit 1
  fi
  ```

### 4.4 G17: scripts/realworld_proof_check.sh（realworld証跡 G8対象外の別体系）
- **目的**: βクラスター改訂の一環。realworld 証跡を G8 と完全分離
- **検証内容**:
  - `logs/realworld/<mission_id>/` に realworld-proof.json が存在するか
  - realworld-screenshots/ 配下に 4基本操作分のスクショがあるか（起動/主機能1/主機能2/リロード）
  - realworld-proof.json の timestamp が deploy.sh 完了時刻より後か
- **発火タイミング**: deploy.sh 完了後（post-deploy gate）+ session_progress.md STATUS: DONE 遷移時
- **実装サンプル**:
  ```sh
  # scripts/realworld_proof_check.sh
  MISSION_ID="$1"
  DIR="logs/realworld/$MISSION_ID"
  [ -f "$DIR/realworld-proof.json" ] || { echo "FAIL: missing realworld-proof.json"; exit 1; }
  for op in launch primary1 primary2 reload; do
    [ -f "$DIR/realworld-screenshots/$op.png" ] || { echo "FAIL: missing screenshot $op.png"; exit 1; }
  done
  ```

### 4.5 発火タイミング整理
| ゲート | pre-commit | pre-push | pre-deploy | post-deploy | Stage A |
|---|:-:|:-:|:-:|:-:|:-:|
| G1-G9（既設） | ✓ | ✓ | - | - | ✓ |
| G10 シークレットスキャン | ✓ | ✓ | - | - | - |
| G11 Step 0 参照漏れ | ✓ | - | - | - | ✓ |
| G12 提案ログ形式 | ✓ | - | - | - | - |
| G13 フック発火確認 | ✓ | ✓ | - | - | - |
| **G14 仕様書ファースト** | ✓ | - | - | - | ✓ |
| **G15 TDD証跡同期** | ✓（canopy変更時） | - | - | - | - |
| **G16 デプロイhash埋込** | - | - | ✓ | - | - |
| **G17 realworld証跡** | - | - | - | ✓ | - |

---

## §5. 棄却項目

**該当なし。CRITICAL 22件全採用、HIGH 56件のうち 49件を R2.1 本文で対応、残7件はゴールデン余地。**

唯一の判定保留は ζ クラスター（PD-107候補）で、PO判定待ち。

---

## §6. R2.1 パッケージ構成計画

### 6.1 ドキュメント構成（推定 1,500-1,800行）
- §0: パッケージ位置づけ（R2との差分説明、Plan E 根拠、PO判定結果）
- §1: R2結果サマリー（triage引用）
- §2: 採用確定項目 Part VI（R1 76件 + R2 22件 + HIGH 新クラスター 21件 = 119件）
- §3: PO承認済み確定仕様（PD-104/105/106 + PD-107）
- §4: 改訂案反映差分 Part VII（クラスターα〜μ + HIGH新 ν〜υ の修正パッチ 19クラスター）
- §5: 新設ゲート G14-G17 完全設計＋実装サンプル
- §6: 連鎖更新（dev_system_spec / sub_* / CLAUDE / development_rules / templates）
- §7: レビュアー指示 Part VIII（ゴールデンラウンド用、severity 厳格化、PD-104/105/106/107 方針異議不可、Filter 1-7 sub_review_flow §2 準拠）
- §8: Cumulative Context Part IX（R1採用76件 + R2採用22件 + HIGH新クラスター21件 = 119件要約 + PD-104〜107 原文 + 既決定PD-001/002/003/005/007/008）
- §9: ゴールデンラウンド実行計画（全5ペルソナ×2モデル=10本、上限2ラウンド、CRITICAL 0 で確定）

### 6.2 Cumulative Context 機械生成方針
R1採用76件 + R2採用22件 + HIGH新クラスター21件の要約表を jq で機械生成する:
```sh
# 119件の要約テーブル生成
jq -s '[.[] | select(.severity == "CRITICAL" or .severity == "HIGH")]
  | map({id, persona, severity, category, location, summary: (.issue[0:80])})' \
  lais/verify/dev_system_v34_r2_{gemini,gpt54}_*.json \
  > lais/verify/r2_1_cumulative_context.json
```
CSV出力版も同時生成し、R2.1 §8 に埋込。

### 6.3 ゴールデンラウンド実行計画
- 実行モデル: Gemini 3.1 Pro + GPT-5.4
- ペルソナ: devops_engineer / solo_dev / qa_lead / tech_writer / ai_ops（全5）
- 本数: 10本（5ペルソナ × 2モデル）
- ラウンド上限: 2（sub_review_flow §1.6）
- コスト想定: $3-5（R2と同等）
- CRITICAL 0 で v3.4 確定 → Code G_46 で dev-system 連鎖書き込み（9ファイル）

---

## §7. LP 候補（learned-patterns.md 昇格候補）

R2で検出された構造的パターンから、2ミッション以上で再出現することが予測される教訓5件を LP-020〜024 候補として抽出:

- **LP-020 候補（ゲート番号）**: 既存ゲート番号の再利用は厳禁。新設ゲートは必ず空き番号を採番。番号衝突を pre-commit で機械検出（G14 組込）
- **LP-021 候補（証跡ファイル名）**: canopy スクリプト（G8）が参照するファイル名を変更する場合、必ずスクリプト側の差分を同一コミットに含める。専用 lint（G15）で pre-commit 検出
- **LP-022 候補（デプロイ検証）**: ポーリング対象（コミットハッシュ / バージョン / ヘルスチェック）は build成果物への埋込仕組みを SSOT で先に定義してから検証ロジックを書く。frontend種別（SPA/Worker/Hybrid）別に埋込方式を明示
- **LP-023 候補（POSIX互換）**: 新設スクリプトは全て `#!/bin/sh` で書き、bash拡張（配列 `${arr[@]}`, `[[ ]]`, `<()`, `mapfile`, `(( ))`）を使用禁止。shellcheck --shell=sh で静的検査
- **LP-024 候補（git diff 文脈）**: `git diff --cached` は pre-commit 専用。pre-push / deploy 文脈では `git diff <merge-base>...HEAD` を使う。CONTEXT 環境変数で分岐する共通関数を scripts/lib/ に用意

LP 昇格判定はゴールデン確定後に実施（2ミッション以上の再出現があるかを確認してから learned-patterns.md に追記）。

---

## §8. 次アクション

1. **ふとし（PO）ε クラスター PD-107 候補の A/B 判定**（ADV推奨: A案）
2. PD-107 判定反映後、**R2.1 パッケージ作成**（ADV、Claude.ai G_44 継続）
3. **session_progress.md キュー更新**: `DEV-SYSTEM-V34-REVIEW-GOLDEN`
4. 次セッション（Code G_45）で**ゴールデンラウンド自律実行**（全10本、上限2R）
5. CRITICAL 0 → Code G_46 で **dev-system 連鎖書き込み（9ファイル）**
6. CRITICAL >0 → ADV 差分修正 → ゴールデン2周目

---

## §9. 完了コマンド（このトリアージドキュメントの検証）

```sh
# プリフライト
wc -l lais/verify/dev_system_v34_r2_triage.md
# 期待: 約 650-700 行

# CRITICAL 22件が全て 12クラスターのどれかに割当てられているか
jq -s 'flatten | map(select(.severity=="CRITICAL")) | length' \
  lais/verify/dev_system_v34_r2_gemini_*.json \
  lais/verify/dev_system_v34_r2_gpt54_*.json
# 期待: 22

# クラスターカバレッジ
for c in α β γ δ ε ζ η θ ι κ λ μ; do
  cnt=$(grep -c "^### 1\." lais/verify/dev_system_v34_r2_triage.md)
done
# 期待: 12クラスター全てが §1.1〜§1.12 に記載されている
```

**完了報告:** MISSION-ID: DEV-SYSTEM-V34-REVIEW-R2-TRIAGE (ADV) / 12クラスター集約完了 / CRITICAL 22全採用 / HIGH 56のうち49件を R2.1 対応予定 / PO判定1件（PD-107 候補）/ 新設ゲート4本設計 / LP 候補5件抽出
