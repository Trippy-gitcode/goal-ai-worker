# dev-system — AIレビューフロー v3
> dev-system（共通基盤） — サブ仕様書
> 作成: 2026-04-14
> ステータス: CONFIRMED（PO承認済み 2026-04-14 G_37）
> 依存: docs/plans/dev_system_spec.md v3.3（§19.10 が本ファイルを参照）
> 責務: 全成果物に対するAIレビューの統一フロー定義（7種別 A〜G / Pre-Review / 7段階フィルター / 主審制 / ゴールデンレビュー）
> dev-system準拠: docs/plans/dev_system_spec.md §19

---

## 1. 基本原則

### 1.1 レビュアーのミッション定義
AIレビュアーのミッションは**「問題を見つけること」ではなく「仕様通りであるか検証すること」**。

- 仕様書と成果物が一致していればPASS（空配列 `[]` を返す）
- 乖離がある場合のみ、仕様の具体的引用とともに指摘する
- 指摘数のノルマは存在しない。根拠のない指摘は品質を下げる
- 各指摘に `spec_reference`（仕様書のセクション番号+記述）を必須化。仕様引用なし→機械的に棄却

### 1.2 出力形式
```json
[
  {
    "id": "R-001",
    "severity": "CRITICAL|HIGH|MEDIUM|LOW",
    "category": "カテゴリ",
    "screen": "対象画面/ファイル",
    "location": "具体位置",
    "issue": "問題の具体内容",
    "spec_reference": "design_system.md §5.1 --success: #3FB950",
    "actual": "実際の値/状態",
    "suggestion": "改善提案"
  }
]
```
問題なし → `[]`（空配列）

### 1.3 RACI（全フロー共通）
| 役割 | R(実行) | A(承認) | C(相談) | I(報告) |
|------|---------|---------|---------|---------|
| PO(ふとし) | — | ✅ 最終承認 | — | ✅ 結果報告先 |
| ADV(Claude.ai) | ✅ 仕様判断・モックアップ修正 | — | ✅ 方針相談 | — |
| Code(Claude Code) | ✅ レビュー実行・機械修正・Pre-Review | — | — | ✅ 結果記録 |

### 1.4 プロバイダー構成
- **2プロバイダー:** GPT-5 + Gemini 2.5 Pro（§13.13準拠）
- **Code Pre-Review:** 外部APIレビュー前にCode自身がペルソナ分けで事前検証
- 表記: 「2プロバイダー + Code Pre-Review」

### 1.5 共通severity定義
| severity | 基準 | アクション |
|----------|------|-----------|
| CRITICAL | 仕様との明確な矛盾 / セキュリティ脆弱性 / データ破壊 / ブランドDNA違反 | Code即修正 |
| HIGH | 判断が必要な指摘。技術的事実に基づき修正要否を判定できないもの | ADV+POが協議→承認後にCode修正 |
| MEDIUM | 改善余地あるが機能に影響なし | バックログ（現バージョン完成前に対応） |
| LOW | 好みの問題。修正しないことが正解の場合もある | 基本スルー。POが気になれば議論 |
各フローで追加のCRITICAL定義がある場合はフロー側で明記。
**ソロ開発原則:** MEDIUMはバックログ管理するが、LOWは積極的にスルーする。HIGHはADVとPOが必ず協議してから判断する。

### 1.5.1 レビュアーAIへのseverity指示（全プロンプトに必ず含める）

レビュアーAIはseverityを以下の定義に従って付けること。独自基準での判定禁止。

```
severity定義（厳守）:
- CRITICAL: 仕様との明確な矛盾 / セキュリティ脆弱性 / データ破壊 / ブランドDNA違反。即修正必須。
- HIGH: 技術的事実として問題があるが、修正方針の判断が必要なもの。「こうした方がいい」はHIGHではない。
- MEDIUM: 機能に影響しない改善余地。動作はする。
- LOW: 好みの問題。修正しないことが正解の場合もある。

HIGHの判定基準（重要）:
- 「推奨」「べき」「方が良い」という表現になる指摘 → MEDIUM以下
- 実際にバグ・破壊・仕様違反が起きている、または高確度で起きる → CRITICAL or HIGH
- 哲学的・スタイル的な議論になる指摘 → LOW
```

### 1.6 集計ルール
- 同一画面+同一要素+同一カテゴリの指摘 → 1件カウント（合意度はFilter 5で判定）
- 異なる画面の同種指摘 → 別件カウント
- モデル間でseverityが割れた場合 → **高い方を採用**

### 1.7 修正ラウンド上限
- 主審diffラウンド: **最大4回**
- Pre-Reviewラウンド: **最大3回**（超過→外部APIに回す）
- ゴールデンレビュー: **最大2回**
- いずれも上限超過 → **POエスカレーション**

### 1.8 用語定義
| 用語 | 定義 |
|------|------|
| 同一指摘 | 同一画面 + 同一要素 + 同一カテゴリの指摘。異なるペルソナ/モデルが出した場合も1件 |
| 合意度 | 同一指摘を独立に検出したペルソナ/モデルの数。Filter 5で使用 |
| 主審 | A-Dフローで修正ラウンドのdiffレビューを担当するペルソナ。初回フルは全員参加 |
| ゴールデンレビュー | CRITICAL 0達成後の最終確認。全ペルソナ × 2モデルで実施 |
| Pre-Review | 外部APIレビュー前にCode自身がペルソナ分けで事前検証するフェーズ |
| diffレビュー | 修正箇所のみを対象としたレビュー。フル再レビューではない |
| CUMULATIVE_CONTEXT | PO決定済みリスト + 修正済みリストをレビュープロンプトに含める仕組み（§19.10 B-6） |
| LP | Learned Pattern。2ミッション以上で再出現した指摘パターン。docs/learned-patterns.md |
| severity inflation | 構造的問題解消後にAIがエッジケースを過剰評価する傾向（§13.9既知パターン） |


---

## 2. 妥当性判定フィルター（7段階）

Codeが外部AIの指摘を受け取った時、上から順に判定。上のフィルターで弾かれたら終了。

**Filter 1: 事実確認**
指摘の根拠は事実か？HTMLソース/コードをgrepして確認。事実と異なる → **即棄却**

**Filter 2: 仕様照合**
指摘が引用する仕様セクションは正しいか？最新版か？仕様の誤読・旧版参照 → **棄却**

**Filter 3: 既決定チェック**
CUMULATIVE_CONTEXTの「PO決定済みリスト」と照合。既決定事項への再指摘 → **棄却**

**Filter 4: スコープ判定**
ステージのIN/OUT定義と照合。スコープ外 → **対応リストに記載して棄却**

**Filter 5: 再現性（合意度）**
| 合意度 | 扱い |
|--------|------|
| 3+モデル/ペルソナが同一指摘 | 高確度 → Filter 6-7へ |
| 2モデル/ペルソナが同一指摘 | 中確度 → Filter 6-7へ |
| 1モデル/ペルソナのみ | 低確度 → severityを1段階下げて判定 |
例外: **security_engineer の単独指摘は格下げしない**（脆弱性は1人でも対応必須）

**Filter 6: 影響度**
| レベル | 基準 | severity |
|--------|------|----------|
| 致命的 | データ消失・セキュリティ侵害・課金誤り | CRITICAL維持 |
| 重大 | 機能不全・仕様矛盾動作 | CRITICAL維持 |
| 中程度 | 機能は動くが品質低い | HIGH |
| 軽微 | 気づく人は少ない | MEDIUM |

**Filter 7: 修正の影響範囲**
| 影響範囲 | 扱い |
|----------|------|
| 対象ファイル内で完結 | Code自律修正可 |
| 関連ファイルに波及（DS/UX変更なし） | Code修正可（影響ファイルもdiff対象に追加） |
| **DS/UX/project仕様の変更が必要** | **ADV/POエスカレーション必須。Codeは修正しない** |


---

## 3. 共通レビューフロー

### 3.1 A-Dフロー（主審制あり。ペルソナ4人以上）
```
成果物完成
  ↓
Code Pre-Review: 主審ペルソナ × 順次実行
  ├── CRITICAL > 0 → Code自身が修正 → Pre-Review再実行（上限3回）
  └── CRITICAL 0 → 外部APIレビューへ
        ↓
初回フル: 全ペルソナ × 2モデル
  ↓ CRITICAL > 0
修正 → Filter 1-7適用 → 主審 × 2モデル（diffのみ。上限4回）
  ↓ CRITICAL 0
ゴールデン: 全ペルソナ × 2モデル（上限2回）
  ↓ CRITICAL > 0の場合
修正 → 該当ペルソナのみdiff確認（フルに戻さない）
  ↓ CRITICAL 0
✅ 確定
```

### 3.2 E-Gフロー（主審制なし。ペルソナ3人）
```
成果物完成
  ↓
Code Pre-Review: 全ペルソナ × 順次実行（3人なので主審制不要）
  ├── CRITICAL > 0 → Code自身が修正 → Pre-Review再実行（上限3回）
  └── CRITICAL 0 → 外部APIレビューへ
        ↓
毎ラウンド: 全ペルソナ(3人) × 2モデル = 6本
  ↓ CRITICAL > 0
修正 → Filter 1-7適用 → 全ペルソナ × 2モデル（diffのみ。上限4回）
  ↓ CRITICAL 0
ゴールデン: 全ペルソナ(3人) × 2モデル = 6本（上限2回）
  ↓ CRITICAL 0
✅ 確定
```

### 3.3 diffレビュー入力テンプレート
```
## 修正内容
- ファイル: [修正ファイルパス]
- 変更前: [修正前の値/状態]
- 変更後: [修正後の値/状態]
- 根拠: [対応するCRITICAL ID + 仕様引用]

## 影響範囲
- 同一ファイル内の関連箇所: [あれば列挙]
- 他ファイルへの波及: [あれば列挙]
- 上位仕様の変更要否: なし / あり（→ADVエスカレーション）

## 確認依頼
この修正は正しいか。副作用（デグレ）はないか。
```

### 3.4 diff影響範囲の機械抽出
diffレビューの「影響範囲」セクションは手動記述に頼らず、以下の手順で機械的に特定する。

1. `git diff --name-only` で変更ファイル一覧を取得
2. `lais_system_map.md` の依存グラフから、変更ファイルを起点に1ホップ先の依存ファイルを列挙
3. 依存ファイル内で変更ファイルの export を import している箇所を `grep` で特定
4. 結果を §3.3 テンプレートの「影響範囲」に自動挿入

**実装タイミング:** Phase A完了後にcanopyスクリプトとして追加。それまではCodeが手動で§3.3テンプレートを埋める。


---

## 4. レビューフロー定義（7種別）

### A. デザインモックアップレビュー
**対象:** モックアップHTML + スクリーンショット
**フロー:** 3.1（主審制あり）

| ペルソナ | 役割 | 主審 |
|---------|------|------|
| web_designer | UI/UX・情報設計・トークン整合 | ✅ |
| color_coordinator | WCAG・色彩心理・テーマ間整合 | ✅ |
| ad_designer | 第一印象・訴求力・CTA導線 | — |
| artist | 構図・視覚的緊張感・独自性 | — |
| manga_cover | 視線誘導・タイポグラフィ・余白リズム | — |
| illustrator | カラーハーモニー・空間表現・感情訴求 | — |

CRITICAL追加定義: ブランドDNA違反 / DSトークン逸脱 / テキストコントラスト不足
ステージスコープ: IN=色値・タイポ・レイアウト・DNA・UX整合。OUT=フォーカスリング・タップ44px・ARIA・JS動作

### B. アプリ仕様レビュー（project / ux / design_system / design_spec）
**対象:** テキスト仕様書
**フロー:** 3.1（主審制あり）

| ペルソナ | 役割 | 主審 |
|---------|------|------|
| pm | プロダクト整合性・機能矛盾・スコープ漏れ | ✅ |
| ux_researcher | ユーザージャーニー・エッジケース・認知負荷 | ✅ |
| backend_architect | データモデル・API設計・パフォーマンス | — |
| security_engineer | 認証・RLS・入力検証・秘密管理 | — |
| qa_engineer | テスタビリティ・境界値・異常系カバレッジ | — |
| a11y_expert | アクセシビリティ・多言語・国際化 | — |
| monetization | プラン設計・課金フロー・コスト構造 | — |
| end_user | 初見ユーザー視点・用語理解・動機維持 | — |


### C. dev-system仕様レビュー（dev_system_spec / CLAUDE.md / development_rules）
**対象:** ルール・ゲート・テンプレート・フロー定義
**フロー:** 3.1（主審制あり）

| ペルソナ | 役割 | 主審 |
|---------|------|------|
| devops_engineer | CI/CD・ゲート整合性・自動化可能性 | ✅ |
| solo_dev | ソロ開発者視点・運用負荷・現実的か | ✅ |
| qa_lead | テスト戦略・品質ゲート網羅性・anti-pattern | — |
| tech_writer | ドキュメント明確性・曖昧表現・矛盾 | — |
| ai_ops | AIレビュー基盤・プロンプト設計・コスト効率 | — |

### D. 実装レビュー（Phase 4以降のコードレビュー）
**対象:** src/ + frontend/ + テスト + スクリーンショット
**フロー:** 3.1（主審制あり）
**タイミング:** ミッション完了報告時。Code Pre-Reviewの後に実行

| ペルソナ | 役割 | 主審 |
|---------|------|------|
| code_reviewer | コード品質・可読性・DRY・エラーハンドリング | ✅ |
| security_engineer | XSS・CSRF・認証バイパス・RLS・APIキー露出（§20準拠） | ✅ |
| performance_engineer | レンダリング性能・バンドルサイズ・API応答時間 | — |
| a11y_engineer | WCAG AA準拠・キーボードナビ・フォーカス管理 | — |
| spec_compliance | 仕様書との整合性・画面遷移・状態管理 | — |
| edge_case_hunter | 異常系・境界値・オフライン・同時操作・空状態 | — |

CRITICAL追加定義: セキュリティ脆弱性 / データ破壊 / 仕様との重大矛盾 / 本番障害
WCAG: デザインレビュー（A）でOUT判定されたものは実装レビューのCRITICAL対象に含む

**Learned Patterns（§13.16）:**
- **実装前:** ENGは `docs/learned-patterns.md` を読み、該当パターンを事前適用する
- **レビューパッケージ:** 「適用済みLPパターン一覧」をパッケージに記載する
- **ゴールデンCRITICAL 0後:** 全指摘（severity不問）を既存パターンと照合し、2ミッション以上で再出現したものを追記する


### E. 技術文書レビュー（reference / system_map）
**対象:** API契約・DBスキーマ・定数定義・画面遷移図・データフロー
**フロー:** 3.2（主審制なし。毎ラウンド全員）

| ペルソナ | 役割 |
|---------|------|
| backend_architect | API/DB/データフローの技術的整合性・実現可能性 |
| spec_compliance | 上位仕様書（project/ux/design_spec）との矛盾・漏れ |
| frontend_engineer | コンポーネント構成・状態管理・画面遷移の実現可能性 |

### F. テスト仕様レビュー（e2e_fullflow_test.md）
**対象:** E2Eテストケース・テストデータ定義・異常系テスト
**フロー:** 3.2（主審制なし。毎ラウンド全員）

| ペルソナ | 役割 |
|---------|------|
| qa_engineer | テストケース網羅性・境界値・異常系カバレッジ・anti-pattern |
| end_user | 実際のユーザー行動との乖離・抜けシナリオ |
| security_tester | セキュリティテストケースの漏れ（認証バイパス・権限昇格） |

### G. プロンプト設計レビュー（AIルーティング / レビュープロンプト / システムプロンプト）
**対象:** AIへの指示プロンプト全般
**フロー:** 3.2（主審制なし。毎ラウンド全員）

| ペルソナ | 役割 |
|---------|------|
| prompt_engineer | プロンプト構造・指示の明確性・バイアス排除・出力形式制御 |
| domain_expert | 対象領域の専門知識がプロンプトに正しく反映されているか（**対象ごとに差し替え**） |
| adversarial_tester | 悪用・誤解釈・意図しない出力の誘発・ジェイルブレイク耐性 |

domain_expertの差し替え例: ルーティングプロンプト→対話AI専門家 / レビュープロンプト→QA専門家 / コーチングプロンプト→心理カウンセラー


---

## 5. 成果物 × フロー マッピング

| 成果物 | フロー | ペルソナ数 | 初回APIコール数 |
|--------|--------|----------|---------------|
| デザインモックアップ | A | 6 | 12本 |
| lais_project_v1.md | B | 8 | 16本 |
| lais_ux_v1.md | B | 8 | 16本 |
| lais_design_system.md | B | 8 | 16本 |
| lais_design_spec_v1.md | B | 8 | 16本 |
| dev_system_spec.md + サブ4本 | C | 5 | 10本 |
| CLAUDE.md / development_rules.md | C | 5 | 10本 |
| 実装コード（src/frontend/） | D | 6 | 12本 |
| reference_v1.md / system_map.md | E | 3 | 6本 |
| e2e_fullflow_test.md | F | 3 | 6本 |
| AIプロンプト設計 | G | 3 | 6本 |

---

## 6. 信頼度スコアリング

**用途: ペルソナの入替判断のみ。** CRITICALの格下げには使用しない。

- Phase完了時にレビュー実績を集計
- 修正採用率 = 修正につながったCRITICAL数 / 総CRITICAL数
- 修正採用率 > 70% → A / 50〜70% → B+ / < 50% → B
- false positive率 > 30% → 1ランクダウン
- 信頼度Bが2フェーズ連続 → 次フェーズでペルソナ差し替え検討（PO判断）
- **全てのCRITICALは信頼度に関係なく修正必須**（格下げ禁止）

---

## 7. デザインレビュー（A）と実装レビュー（D）の棲み分け

| 観点 | デザイン(A) | 実装(D) |
|------|-----------|---------|
| DSトークン整合 | ✅ CRITICAL | 検証済み前提 |
| UX仕様整合 | ✅ CRITICAL | ✅ 動作で再検証 |
| WCAG フォーカスリング | OUT | ✅ CRITICAL |
| WCAG タップ44px | OUT | ✅ CRITICAL |
| WCAG ARIA | OUT | ✅ CRITICAL |
| テキストコントラスト | ✅ IN | ✅ 再検証 |
| セキュリティ | 対象外 | ✅ CRITICAL |
| パフォーマンス | 対象外 | ✅ HIGH |

---

## 8. ペルソナプロンプト管理

### 8.1 管理場所
ペルソナプロンプトは `templates/review_personas/` ディレクトリに1ペルソナ1ファイルで管理する。

```
templates/review_personas/
  web_designer.md
  color_coordinator.md
  code_reviewer.md
  security_engineer.md
  ...
```

### 8.2 プロンプト構成（全ペルソナ共通）
各ファイルは以下の構成に従う。

1. **ロール定義** — ペルソナの専門領域と視点
2. **severity定義** — §1.5.1をそのまま埋め込み（共通テンプレートからinclude）
3. **出力形式** — §1.2のJSON形式
4. **スコープ定義** — §4の該当フロー（A〜G）のIN/OUT
5. **CUMULATIVE_CONTEXT挿入点** — 修正済み/PO決定済みリストの動的挿入箇所

### 8.3 運用ルール
- プロンプト変更はdev-system変更扱い（§19.6準拠）
- 新ペルソナ追加時は §4 のペルソナ表も同時更新（一括更新義務）
- **実装タイミング:** Phase A完了後にリファクタ。現在はCodeのレビュースクリプト内にインライン定義

---

## 9. 外部レビュープロトコル連携（v3.5、案 D'）

> 新設: 2026-04-25（DEV-SYSTEM-V35-EXTERNAL-REVIEW-PROTOCOL Phase 3 ADV 領域分）
> 正本: `docs/plans/sub_external_review_protocol.md`（案 D' 仕様 SSoT）
> 親: 本ファイル §1-§8（既存温存）/ `dev_system_v35_roadmap.md` §3.1
> 目的: 既存 §4 の 7 種別フロー A-G + §1.6 合意度 + §1.7 上限 SSoT を **温存・自動化** する上位レイヤを宣言

### 9.1 連携の基本方針

本節は外部レビュープロトコル（pre-commit 外部 API + post-commit 監査ログ + subagent 並列、daemon なし）と既存 §4-§7 の関係を定義する。

- **既存 §1-§8 不変**: 7 種別フロー / 合意度 / 上限 / severity / フィルタ / プロンプト管理は全て温存
- **本プロトコルは上位自動化レイヤ**: 「手動トリガ → 手動集約」を「ファイル変更検知 → 並列起動 → 自動集約」に機械化
- **破壊的変更ゼロ**: 既存運用への影響なし、追加機能のみ

### 9.2 §4 7 種別フローの自動発火マッピング

`sub_external_review_protocol.md §6.1` を参照。pre-commit 時の対象パス判定で発火フローを自動選定:

| 既存フロー | 発火条件 | 本プロトコルでの実装 |
|---|---|---|
| A デザインモックアップ | `docs/mockups/` / `design_spec_v*.md` | pre-commit 中分類 + ADV subagent |
| B アプリ仕様 | `project_v*.md` / `ux_v*.md` / `design_system.md` | pre-commit 大分類（同期）+ QA subagent |
| C dev-system 仕様 | `dev_system_spec.md` / `sub_*.md` / `development_rules.md` | pre-commit 大分類（同期）+ ADV + QA subagent |
| D 実装 | `src/` / `frontend/` / `lais/src/` | pre-commit 中分類（RISK_PATHS 該当は大分類）|
| E 技術文書 | `reference_v*.md` / `system_map.md` | pre-commit 中分類（非同期）|
| F テスト仕様 | `e2e_fullflow_test.md` / `test_meta.json` | pre-commit 中分類 |
| G プロンプト | `templates/review_personas/` | pre-commit 大分類 |
| H 統合（Hフロー）| RISK_PATHS 該当（10 項目、PATCH-23）| `sub_hflow_protocol.md` 承認ゲート + 本プロトコル事前レビュー |

### 9.3 §1.6 合意度算出の自動化

post-commit hook で `external_review_postcommit.sh` が GPT-5.4 + Gemini 両モデルの severity JSON を `min()` で合意度算出、`lais/review_feed/YYYY-MM-DD.md` に追記。

CRITICAL 合意度 ≥ 1 のみ `_critical.md` にサマリ追記。`§1.6` 合意度算出ロジックの機械化版で、既存 §1.6 の SSoT 自体は不変。

### 9.4 §1.7 上限ルールの再解釈

本プロトコル文脈での再解釈（§1.7 SSoT は温存、本節は運用注記）:

- **Pre-Review 上限 3R**: 同セッション self-critique（LP-030）から、**独立 subagent 並列セッション数** に意味変更。Phase 1 MVP では 1 セッション 2 モデル（GPT + Gemini）を 1 ラウンドとカウント
- **主審 diff 上限 4R**: pre-commit 大分類（同期ブロック）でのみカウント、中分類（非同期）はカウント外
- **ゴールデン上限 2R**: §1.7 SSoT 通り維持

LP-030 / LP-031 が示す「同セッション self-critique 限界 → 独立 subagent」の構造的解消が、本プロトコルの存在理由。

### 9.5 §7.3 severity 定義の運用

`sub_external_review_protocol.md §3` 大分類同期モードでの CRITICAL 検出は pre-commit ブロック（commit 拒否）。中分類非同期は post-commit ログのみ、pre-commit 通す。

これにより、CRITICAL の即時検知（高リスク変更）と日常 commit の効率（軽微変更）を両立。

### 9.6 既存 §4 各フローへの影響なし

7 種別フロー A-G の **手動実行は引き続き可能**。本プロトコル自動発火は補完であり、PO/ADV/ENG が必要に応じて従来通り手動でラウンド指示も可。

例: ゴールデンレビュー（v3.4 確定時の R3 相当）は本プロトコル対象外、引き続き `scripts/ai_review.js` を手動実行で起動。

### 9.7 参照

- `docs/plans/sub_external_review_protocol.md` 全節（案 D' SSoT）
- `docs/plans/dev_system_v35_roadmap.md` §3.1 Phase 1-3
- `docs/learned-patterns.md` LP-030 / LP-031 / LP-032
- `lais/verify/dev_system_v34_patches.md` PATCH-22 / 23 / 24（Phase 1-2 実装記録）
