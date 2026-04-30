# ADV 役割定義 10 ペルソナレビュー（2026-04-25）

> 仕様根拠: `lais/verify/dev_system_v34_package.md` §2.25.14（全応答ペルソナレビュー）+ §2.25.23（14 票投票機構）
> レビュー実施: ADV-ROLE-REVIEW subagent（10 ペルソナ + 14 票投票）
> SSoT: 本ファイル（lais/verify 配下、ADV メイン引用元）

---

## §0 概要

- **レビュー対象**: ADV メインセッション役割定義 10 項目（2026-04-25 ADV メイン提示版）
- **レビュー実施**:
  - 10 ペルソナ × 10 項目 × 評価軸 3 = 300 評価セル
  - vote_dispatcher.sh 14 票投票（実機実行、`logs/vote_log.log` 記録）
- **結論**: **改善必須**（圧倒的判定にはならず、構造上の改善余地が複数項目で確認された）
- **根拠**:
  - 14 票投票結果: FOR 2 / AGAINST 0 / ABSTAIN 12 / margin 2 → **escalate（拮抗）**。ABSTAIN 12 の高さは grep ベース MVP の限界だが、margin ≤ 4 で機械判定上 PO 介入相当
  - 10 ペルソナ qualitative review で「⭐⭐⭐ 必須」改善 6 件、「⭐⭐ 推奨」改善 7 件、「⭐ 検討」改善 4 件を抽出
- **背景違反パターン**:
  - 違反 #1〜#11（特に #11 が直近、複合 4 件、系統 A 重度）
  - 系統 A（仕様書未読 / SSOT 未読）= 4 件 / 系統 B（独断新フロー）= 4 件 / 反省装置化 = 1 件 / 複合 = 2 件
  - **§2.25.16.5 SSOT 4 ファイル運用は導入済だが §2.25 全文 Read は CLAUDE_ADV.md §3.1 起動時 Read で違反 #11 後に厳格化されたばかり**

---

## §1 ペルソナ別評価（10 ペルソナ × 10 項目）

各セルの記号: ✅ 十分 / ⚠️ 一部不足 or 形骸化リスク / ❌ 改善必須

### ペルソナ 1: solo_dev（ソロ開発者の運用負荷視点）

**項目別評価**:

| 項目# | 十分性 | 最適化度 | 改善案 |
|---|---|---|---|
| 1 役割（PO 補佐） | ✅ | ⚠️ | 「直接実装禁止」が一律だと 1 行スクリプト修正でも subagent 起動コスト発生。30 秒以内 trivial 修正は ADV 直接書込許容枠を §2.25.16.3 例外に追加検討 |
| 2 起動時必須動作 | ⚠️ | ⚠️ | 4 ファイル + §2.25 全文 + CLAUDE_ADV.md + skill = 起動時負荷高（推定 5,000+ tokens）。要約段差化（§C0 起動時要約類似）が必要 |
| 3 直接書込可 7 種 | ✅ | ✅ | 運用記録ファイルとして妥当 |
| 4 直接書込禁止 8 種 | ✅ | ✅ | 違反 #11 で実証済の境界 |
| 5 subagent 管理 8 項目 | ⚠️ | ❌ | 8 項目は ADV メイン主観で漏れる確度高、checklist 化 + skill 機械強制必須 |
| 6 14 票投票必須化 | ✅ | ✅ | §2.25.23.9 で機械強制済 |
| 7 違反検出時 | ✅ | ⚠️ | 「構造解消セット必須」の具体定義（仕様改定 + skill 強化 + 機械ゲート）が §2.25.10 に分散、checklist 化要 |
| 8 PO 応答スタイル | ✅ | ✅ | 30 行サマリー化機械強制済 |
| 9 機械強制 hook 群 | ⚠️ | ⚠️ | 4 hook 結線済だが、新設予定の必須参照マトリクスが未実装 |
| 10 必須参照マトリクス | ❌ | ❌ | 未実装、§2.25.16.6 として新設要 |

**総合評価**: **改善必須**
**最重要改善 3 件**:
1. 起動時 Read 量の段差化（§C0 起動時要約類似で §2.25 を 80 行サマリー化）
2. subagent 管理 8 項目の checklist 化 + skill 化（`/adv-subagent-launch` 新設）
3. 必須参照マトリクス（§2.25.16.6）の早期新設、行動カテゴリ別の必須参照節を仕様書側で SSoT 化

---

### ペルソナ 2: devops_engineer（機械強制 / hook 結線視点）

**項目別評価**:

| 項目# | 十分性 | 最適化度 | 改善案 |
|---|---|---|---|
| 1 役割 | ✅ | ✅ | hook 結線で main_session_writeguard.sh が境界強制 |
| 2 起動時必須動作 | ⚠️ | ⚠️ | handoff_validator.sh は SSOT 4 ファイル Read 確認のみ、§2.25 全文 Read は未検証 |
| 3 直接書込可 | ✅ | ✅ | allowlist 機械強制済 |
| 4 直接書込禁止 | ✅ | ✅ | main_session_writeguard.sh で BLOCK |
| 5 subagent 管理 | ⚠️ | ❌ | subagent_health_check.sh / completion_verifier.sh は単発実行、起動〜完了の状態遷移整合が未強制 |
| 6 14 票投票 | ✅ | ✅ | vote_dispatcher.sh 結線済 |
| 7 違反検出 | ⚠️ | ⚠️ | adv_response_gate.sh は応答前 grep のみ、構造解消の機械検証経路なし |
| 8 PO 応答 | ✅ | ⚠️ | 30 行超検出は機械化、しかし要約品質は人手依存 |
| 9 機械強制 | ⚠️ | ⚠️ | hook 結線箇所が settings.json と CLAUDE_ADV.md で重複記述、SSoT 一本化要 |
| 10 必須参照マトリクス | ❌ | ❌ | 行動カテゴリ別 hook 強制が未設計、Phase 1 で実装計画化要 |

**総合評価**: **改善必須**
**最重要改善 3 件**:
1. handoff_validator.sh に §2.25 全文 Read 検証を追加（grep -c で §2.25.X 出現節数の最低数チェック）
2. subagent_lifecycle_validator.sh 新設（起動 → status running → completion → status completed の状態遷移強制）
3. 必須参照マトリクスの hook 結線設計（行動カテゴリ × 必須参照節を JSON 化、PreToolUse で参照済を grep 検証）

---

### ペルソナ 3: qa_lead（検証可能性 / 完了条件視点）

**項目別評価**:

| 項目# | 十分性 | 最適化度 | 改善案 |
|---|---|---|---|
| 1 役割 | ✅ | ⚠️ | 「PO 補佐 = テクニカル PM」の検証可能な完了条件が未定義 |
| 2 起動時必須動作 | ⚠️ | ⚠️ | 「全 Read」の検証が transcript grep 依存、実 Read 履歴の決定的検証手段なし |
| 3 直接書込可 | ✅ | ✅ | |
| 4 直接書込禁止 | ✅ | ✅ | |
| 5 subagent 管理 | ⚠️ | ❌ | 8 項目の各完了条件が散発的記述、PASS/FAIL 判定式未定義 |
| 6 14 票投票 | ✅ | ✅ | exit code で機械判定 |
| 7 違反検出 | ⚠️ | ⚠️ | 「即記録」の SLO 未定義（5 分以内 / 同セッション内 等） |
| 8 PO 応答 | ✅ | ✅ | 5 行テンプレ機械検証可 |
| 9 機械強制 | ⚠️ | ⚠️ | 各 hook の PASS/FAIL ログが logs/ に分散、統合ダッシュボード未整備 |
| 10 必須参照マトリクス | ❌ | ❌ | カテゴリ別必須参照節の網羅性検証手段なし |

**総合評価**: **改善必須**
**最重要改善 3 件**:
1. ADV メイン役割の完了条件 KPI 化（違反発生率 / SSoT 整合率 / PO 介入率 等を週次集計）
2. subagent 管理 8 項目の各 PASS/FAIL 判定式定義 + completion_verifier.sh 拡張
3. 違反検出時の「構造解消完了」判定式（仕様改定 commit + skill 改修 + 機械ゲート結線の 3 点 PASS）

---

### ペルソナ 4: tech_writer（仕様明確性 / SSoT 整合視点）

**項目別評価**:

| 項目# | 十分性 | 最適化度 | 改善案 |
|---|---|---|---|
| 1 役割 | ✅ | ⚠️ | §2.25.16.1 と sub_adv_protocol.md §1 で記述が重複、SSoT 一本化要（§2.25 が正本） |
| 2 起動時必須動作 | ⚠️ | ❌ | SSOT 4 ファイル + §2.25 全文 + CLAUDE_ADV.md + skill 起動の必須順序が散発記述、起動シーケンス図が未整備 |
| 3 直接書込可 | ✅ | ✅ | §2.25.16.3 で集約 |
| 4 直接書込禁止 | ✅ | ✅ | §2.25.16.2 で集約 |
| 5 subagent 管理 | ⚠️ | ❌ | 8 項目が §2.25.16.5 / §2.25.20 / §2.25.21 / §2.25.23.10 に分散、subagent ライフサイクル節として統合要 |
| 6 14 票投票 | ✅ | ✅ | §2.25.23 で集約 |
| 7 違反検出 | ⚠️ | ⚠️ | §2.25.5 / §2.25.10 / 違反 #11 再発防止策が分散 |
| 8 PO 応答 | ✅ | ✅ | §2.25.6 / §2.25.21 で集約 |
| 9 機械強制 | ⚠️ | ❌ | hook 一覧が CLAUDE_ADV.md / settings.json / §2.25.16.5 機械チェックの 3 箇所に分散 |
| 10 必須参照マトリクス | ❌ | ❌ | 未実装節 |

**総合評価**: **改善必須**
**最重要改善 3 件**:
1. §2.25.16.X subagent ライフサイクル統合節新設（起動 → 管理 → 完了 → 検証 → 報告の単一節）
2. ADV メイン起動シーケンス図 §2.25.16.5.1 新設（必須 Read → skill 起動 → SSOT 検証 → セッション開始の順序明示）
3. 機械強制 hook 一覧 SSoT 一本化（§2.25.16.7 として新設、CLAUDE_ADV.md / settings.json は §2.25.16.7 を参照）

---

### ペルソナ 5: ai_ops（LLM 認知負荷 / コンテキスト効率視点）

**項目別評価**:

| 項目# | 十分性 | 最適化度 | 改善案 |
|---|---|---|---|
| 1 役割 | ✅ | ✅ | 1 文で明確 |
| 2 起動時必須動作 | ❌ | ❌ | SSOT 4 ファイル + §2.25 全文（約 700 行）+ CLAUDE_ADV.md + skill 4 種 = 推定 6,000+ tokens 起動時消費、long-context 劣化リスク |
| 3 直接書込可 7 種 | ✅ | ✅ | |
| 4 直接書込禁止 8 種 | ✅ | ✅ | |
| 5 subagent 管理 | ⚠️ | ⚠️ | 8 項目を毎回 attention で参照する負荷高、skill 化で外部化要 |
| 6 14 票投票 | ✅ | ✅ | exit code で機械判定、ADV は結果のみ参照 |
| 7 違反検出 | ⚠️ | ⚠️ | 構造解消セットの判定が自由記述、テンプレ化要 |
| 8 PO 応答 | ✅ | ✅ | 5 行テンプレで認知負荷低 |
| 9 機械強制 | ⚠️ | ⚠️ | hook 群の存在は ADV attention 内に保持されない、skill 化必須 |
| 10 必須参照マトリクス | ❌ | ❌ | 行動 → 必須参照の機械引き当てがあれば LLM 自己判断不要、認知負荷大幅削減 |

**総合評価**: **改善必須（特に項目 2 / 10）**
**最重要改善 3 件**:
1. §C0 起動時要約類似で §2.25 80 行サマリー（§2.25.0）新設、毎セッション §2.25.0 のみ必須、§2.25.1〜.23 は条件付き再読
2. subagent 管理 8 項目を `/adv-subagent` skill 化、ADV はトリガ語で skill 起動のみ
3. 必須参照マトリクスを `scripts/required_refs_matcher.sh` として実装、ADV 行動カテゴリ自動判定 → 必須参照節 list 出力 → ADV が読込

---

### ペルソナ 6: security_engineer（権限分離 / 漏洩リスク視点）

**項目別評価**:

| 項目# | 十分性 | 最適化度 | 改善案 |
|---|---|---|---|
| 1 役割 | ✅ | ✅ | 直接実装禁止は権限最小化原則に整合 |
| 2 起動時必須動作 | ✅ | ⚠️ | CLAUDE_ADV.md 起動時 Read は権限境界の自己認識に有効 |
| 3 直接書込可 | ✅ | ✅ | 運用記録のみ、機密情報なし |
| 4 直接書込禁止 | ✅ | ✅ | scripts / hooks / config / development_rules.md は権限分離で ADV 不可 |
| 5 subagent 管理 | ⚠️ | ⚠️ | subagent への self-contained プロンプトに機密情報（API key 等）を含めない明文化要 |
| 6 14 票投票 | ✅ | ✅ | 外部 AI 呼出しは `external_review_guardrail.sh` で月次上限 |
| 7 違反検出 | ⚠️ | ⚠️ | 違反ログに機密情報を記録しない明文化要 |
| 8 PO 応答 | ✅ | ✅ | |
| 9 機械強制 | ✅ | ✅ | gitleaks（G19）+ writeguard で多層防御 |
| 10 必須参照マトリクス | ⚠️ | ⚠️ | secrets / auth / RLS 触る行動カテゴリの必須参照に security 節の明示要 |

**総合評価**: **改善推奨（critical 3 件は他ペルソナほど多くない）**
**最重要改善 3 件**:
1. subagent プロンプト template の secrets-redact 明文化（§2.25.16.5 機械チェックに secrets grep 追加）
2. 違反ログ 機密情報マスキング規約（adv_violation_log.md / decision_log.md / vote_log.log の全 logs に対する gitleaks redact）
3. 必須参照マトリクスに security 行動カテゴリ追加（auth / secrets / RLS / CSP 触る subagent 起動時に §16.10 G19 / api_incident_playbook 必須参照）

---

### ペルソナ 7: データガバナンス専門家（SSoT / 監査ログ / バックアップ視点）

**項目別評価**:

| 項目# | 十分性 | 最適化度 | 改善案 |
|---|---|---|---|
| 1 役割 | ✅ | ⚠️ | 「テクニカル PM」だけだとデータ整合性責務が不明 |
| 2 起動時必須動作 | ⚠️ | ⚠️ | SSOT 4 ファイル必須 Read は良いが、Read のみで整合性検証なし（古い情報のまま運用継続リスク） |
| 3 直接書込可 7 種 | ✅ | ⚠️ | 7 ファイル間の整合性検証が未定義（subagent_status.md の running ↔ in_flight_topics.md の in_progress 同期等） |
| 4 直接書込禁止 8 種 | ✅ | ✅ | |
| 5 subagent 管理 | ⚠️ | ❌ | subagent_status.md の running 即時追記が機械強制なし、違反 #11 で実証された脆弱点 |
| 6 14 票投票 | ✅ | ✅ | logs/vote_log.log で監査済 |
| 7 違反検出 | ⚠️ | ⚠️ | adv_violation_log.md と decision_log.md の連動性（PD-VIOLATION-N で連鎖記録）が一部のみ |
| 8 PO 応答 | ✅ | ✅ | |
| 9 機械強制 | ⚠️ | ❌ | SSOT 4 ファイル間 cross-validation hook 未整備 |
| 10 必須参照マトリクス | ❌ | ❌ | 行動カテゴリ別 SSoT 一覧が未定義 |

**総合評価**: **改善必須**
**最重要改善 3 件**:
1. SSOT 4 ファイル cross-validator 新設（subagent_status.md running ↔ in_flight_topics.md in_progress / completed ↔ session_progress.md Last done 等の整合検証）
2. 運用記録ファイル 7 種の自動バックアップ（git commit 前 hook で .bak 保持、24h 保持）
3. PD-NNN ↔ 違反 #N ↔ §2.25.X の交差索引を decision_log.md と adv_violation_log.md の付録として自動生成

---

### ペルソナ 8: 違反パターン分析専門家（違反 #1〜#11 累積パターン視点）

**項目別評価**:

| 項目# | 十分性 | 最適化度 | 改善案 |
|---|---|---|---|
| 1 役割 | ✅ | ⚠️ | 「直接実装禁止」は違反 #11 D（独断命名）の再発防止に直結、ただし subagent 起動時の指示誤りは別経路 |
| 2 起動時必須動作 | ⚠️ | ❌ | 違反 #11 で「§2.25 全文未読」が露呈、項目 2 の「§2.25 全文 Read」が CLAUDE_ADV.md 任意リスト降格状態だった、機械強制が必須 |
| 3 直接書込可 | ✅ | ✅ | |
| 4 直接書込禁止 | ✅ | ✅ | |
| 5 subagent 管理 | ❌ | ❌ | 違反 #11 C（subagent 4 件起動で status 未更新）が再発、「起動と同時に subagent_status.md 追記」を機械強制必須 |
| 6 14 票投票 | ✅ | ✅ | §2.25.23.9 で違反 #6 / #8 系統 A 型が構造解消済 |
| 7 違反検出 | ⚠️ | ❌ | 違反 #10（反省装置化）の構造解消は §2.25.10 で仕様化済だが、機械ゲート（adv_response_gate.sh）で「違反 #N として記録」のみ単独使用検出は未実装 |
| 8 PO 応答 | ✅ | ⚠️ | 違反 #5 / #9（冗長応答 / 独断撤回宣言なし）の機械検出は §2.25.11 の撤回宣言検証 grep が未実装 |
| 9 機械強制 | ⚠️ | ⚠️ | 違反 #1（命名）の grep 検出が adv_response_gate.sh で未対応（仕様書未定義の §2.25.X 提案を機械検出する仕組み不在） |
| 10 必須参照マトリクス | ❌ | ❌ | 違反 #11 D（§2.25.16.6 を §2.25.23.10 と命名）が再発する確度高、行動カテゴリ → 必須参照節の機械引き当てで再発防止 |

**総合評価**: **大幅再設計推奨（違反 #11 構造解消が未完）**
**最重要改善 3 件**:
1. **違反 #11 構造解消の機械強制完了**: §2.25 全文 Read 検証 + subagent_status.md 即時追記強制 + 章番号命名規則機械検証 = 3 点 + 必須参照マトリクスで完了判定
2. 違反系統 A/B 別の adv_response_gate.sh 強化（系統 A: SSOT 4 ファイル + §2.25 全文 + 既存節番号 grep / 系統 B: 仕様書未記載提案の検出）
3. 違反 #N 記録時の構造解消セット必須化（commit + skill + hook + 必須参照マトリクスエントリ追加の 4 点が揃わなければ `logs/adv_violation_unresolved.log` に積上げ、PO 朝報告で escalate）

---

### ペルソナ 9: プロジェクトマネジメント専門家（PO 手間最小化 / 進行管理視点）

**項目別評価**:

| 項目# | 十分性 | 最適化度 | 改善案 |
|---|---|---|---|
| 1 役割 | ✅ | ✅ | テクニカル PM は PO 手間最小化に直結 |
| 2 起動時必須動作 | ⚠️ | ⚠️ | SSOT 4 ファイル Read で in_flight_topics.md の blocked / pending 把握 → ブロッカー解消提案を ADV 起動時に PO 提示することで PO 手間削減 |
| 3 直接書込可 | ✅ | ✅ | |
| 4 直接書込禁止 | ✅ | ✅ | |
| 5 subagent 管理 | ⚠️ | ⚠️ | 8 項目のうち「起動前ミッション定義 self-contained プロンプト」が ADV 主観で漏れ、subagent タイムロス → PO 進行待ち発生 |
| 6 14 票投票 | ✅ | ✅ | PO 介入が拮抗時のみで PO 手間削減 |
| 7 違反検出 | ✅ | ⚠️ | 違反検出は即記録だが、構造解消で次回再発防止できているか週次レビュー要 |
| 8 PO 応答 | ✅ | ✅ | 5 行サマリーで PO 手間最小 |
| 9 機械強制 | ✅ | ✅ | |
| 10 必須参照マトリクス | ❌ | ⚠️ | 行動カテゴリ → 必須参照の自動判定で ADV 自己判断負荷削減 → ADV が PO に投げる確度低下 |

**総合評価**: **改善推奨（重大度は項目 2 / 5 / 10）**
**最重要改善 3 件**:
1. ADV 起動時に in_flight_topics.md blocked / pending の自動サマリー生成 + PO 朝報告（PO 起床時にブロッカー解消提案を含む 5 行報告）
2. subagent ミッション定義 self-contained プロンプトの template 化（`templates/subagent_mission_template.md` 必須使用、ADV 主観漏れ防止）
3. 違反 → 構造解消の週次レビュー（週次 cron で `logs/adv_violation_unresolved.log` を集計、PO 朝報告に含める）

---

### ペルソナ 10: システム設計専門家（hook / SSoT 整合 / 依存関係視点）

**項目別評価**:

| 項目# | 十分性 | 最適化度 | 改善案 |
|---|---|---|---|
| 1 役割 | ✅ | ⚠️ | 「PO 補佐 = テクニカル PM」と「subagent オーケストレータ」の二責務並立、責務境界明示要 |
| 2 起動時必須動作 | ⚠️ | ❌ | 起動時 Read 群（SSOT 4 + §2.25 全文 + CLAUDE_ADV.md + skill 4 種）の依存順序が未定義、循環依存リスク（CLAUDE_ADV.md が §2.25 を参照、§2.25 が CLAUDE_ADV.md を参照） |
| 3 直接書込可 | ✅ | ✅ | |
| 4 直接書込禁止 | ✅ | ✅ | |
| 5 subagent 管理 | ⚠️ | ❌ | 8 項目の依存関係（起動前 → 起動 → 走行 → 完了通知 → status 更新 → レビュー → PATCH 確認）が線形記述だが、並列 subagent 時の状態管理が未設計 |
| 6 14 票投票 | ✅ | ✅ | §2.25.23 で independent module 化済 |
| 7 違反検出 | ✅ | ⚠️ | 違反検出 → 記録 → 構造解消の依存順序が §2.25.5 / §2.25.10 で部分定義 |
| 8 PO 応答 | ✅ | ✅ | |
| 9 機械強制 | ⚠️ | ⚠️ | 4 hook + skill + matrix の依存図が未整備、PreToolUse / Stop / PostToolUse での発火順序明文化要 |
| 10 必須参照マトリクス | ❌ | ❌ | 行動カテゴリ × 必須参照節 × 機械ゲートの 3 軸マトリクスが未設計 |

**総合評価**: **改善必須（システム整合性に複数欠落）**
**最重要改善 3 件**:
1. ADV メインの責務分解（テクニカル PM / subagent オーケストレータ / 運用記録管理者の 3 責務）+ 各責務の必須節明示
2. 起動時 Read 依存グラフ（DAG）図 §2.25.16.5.2 として新設、循環依存検出 + 並列 Read 可能箇所の最適化
3. 機械強制 hook 群の発火順序図（PreToolUse → Tool 実行 → PostToolUse → Stop）+ 必須参照マトリクスの 3 軸統合設計

---

## §2 14 票投票結果

```
vote_dispatcher: mode=14vote FOR=2 AGAINST=0 ABSTAIN=12 margin=2 verdict=escalate
```

- **mode**: 14vote（フルモード、外部 AI 含む）
- **FOR**: 2 票（賛成 = 現状維持）
- **AGAINST**: 0 票（反対なし）
- **ABSTAIN**: 12 票（保留多数、grep ベース MVP の限界 = 投票主体が「ADV メインセッション役割定義 10 項目」を grep keyword で評価困難）
- **margin**: 2（FOR 2 - AGAINST 0 = 2）
- **判定**: **escalate（拮抗、margin ≤ 4）** → §2.25.23.3 に従えば PO 承認取得経路。ただし AGAINST 0 のため「現状維持を反対する強い票」もない
- **投票ログ**: `logs/vote_log.log` 末尾に 1 行記録（`2026-04-25T14:15:43Z vote_20260425T141540Z_87500 14vote 2 0 12 2 escalate`）

**投票結果の解釈**:
- ABSTAIN 12 の高さは persona_vote.sh が grep ベース MVP のため、メタレベルの「役割定義 10 項目」を直接 FOR/AGAINST 評価困難
- AGAINST 0 = 「現状維持を否定する強い意見はない」= 抜本再設計までは不要
- FOR 2 = 「現状維持で妥当」= 弱い肯定
- **結論**: 機械投票上は escalate（拮抗）相当だが、**10 ペルソナ qualitative review** で改善案 17 件抽出 → 改善必須相当の運用判断が妥当

---

## §3 改善案統合（重要度ランキング）

### ⭐⭐⭐ 必須（仕様書改定 + 機械強制必要）

1. **必須参照マトリクス §2.25.16.6 の早期新設**: 行動カテゴリ（subagent 起動 / 仕様書反映 / 判断 / 違反検出 / Phase 着手 / 命名 / SSoT 操作 等）× 必須参照節を仕様書側で SSoT 化、`scripts/required_refs_matcher.sh` で機械引き当て。違反 #11 D（§2.25.23.10 命名独断）の構造解消必須
2. **§2.25 80 行サマリー §2.25.0 新設 + 段差化**: §C0 起動時要約類似で §2.25 全文（推定 700+ 行）を 80 行サマリー化、毎セッション §2.25.0 必須 / §2.25.1〜.23 は条件付き再読。LLM 認知負荷削減 + 違反 #11 系統 A 再発防止
3. **subagent ライフサイクル統合節 §2.25.16.X 新設**: 起動 → 管理 → 完了 → 検証 → 報告 を単一節に集約。subagent_status.md の running 即時追記機械強制 + subagent_lifecycle_validator.sh 新設で違反 #11 C 構造解消
4. **SSOT 4 ファイル cross-validator hook 新設**: subagent_status.md running ↔ in_flight_topics.md in_progress 等の整合検証、違反 #11 C の根本原因（多重記録の不整合）を機械検出
5. **handoff_validator.sh に §2.25 全文 Read 検証追加**: 現状は SSOT 4 ファイル Read のみ、`grep -c '§2.25' transcript_path` で §2.25.X 出現節数の最低数チェック追加。違反 #11 A 再発防止
6. **adv_response_gate.sh 系統 A/B 別強化**: 系統 A（仕様書未読 / 既存節番号誤認識）+ 系統 B（仕様書未記載で独断新フロー）の grep パターン拡張、章番号命名規則機械検証

### ⭐⭐ 推奨（仕様書改定で対応可能）

1. **`/adv-subagent` skill 新設**: subagent 管理 8 項目を skill 化、トリガ語で skill 起動のみで管理可能
2. **subagent ミッション定義 template 化**: `templates/subagent_mission_template.md` 必須使用、self-contained プロンプト + 必須参照節明示 + SSoT 引用の 3 セクション強制
3. **構造解消セット checklist 化**: §2.25.10 の「事前回避原則」遂行に commit + skill + hook + 必須参照マトリクスエントリの 4 点 PASS を強制、`logs/adv_violation_unresolved.log` で未完了違反を追跡
4. **責務分解明示**: ADV メイン = テクニカル PM + subagent オーケストレータ + 運用記録管理者 の 3 責務化、§2.25.16.1 で明文化
5. **起動時 Read 依存グラフ §2.25.16.5.2 新設**: 循環依存検出 + 並列 Read 最適化、ADV メインの起動時間短縮
6. **PD-NNN ↔ 違反 #N ↔ §2.25.X 交差索引**: decision_log.md / adv_violation_log.md の付録として自動生成、ADV 検索効率改善
7. **secrets-redact / 機密情報マスキング**: subagent プロンプト + 違反ログ + 各種 logs の gitleaks redact 自動化、漏洩リスク削減

### ⭐ 検討（v3.5 / v3.6 候補）

1. **30 秒以内 trivial 修正の ADV 直接書込許容枠**: §2.25.16.3 例外に「30 秒以内 + 1 ファイル + 5 行以内」の超短時間 trivial 修正を追加検討（subagent 起動コスト回避、ただし機械検証必須）
2. **ADV 起動時 PO 朝報告自動生成**: in_flight_topics.md blocked / pending を自動サマリー、夜間モード朝報告と統合
3. **違反 → 構造解消週次レビュー cron**: `logs/adv_violation_unresolved.log` 週次集計、PO 朝報告に含める
4. **ADV メイン KPI 化**: 違反発生率 / SSoT 整合率 / PO 介入率 / subagent 並列率 等を週次集計、SLO 化

---

## §4 推奨 next action

**ADV メインに対する具体的な次アクション提案**:

### 即実施（本セッション内 or 翌セッション）

1. **PD-ADV-ROLE-REVIEW を decision_log.md に記録**（本 subagent で実施、§5 参照）
2. **改善案 ⭐⭐⭐ 6 件のうち少なくとも以下 3 件を §2.25 拡張案として PO 提示**:
   - §2.25.16.6 必須参照マトリクス新設（違反 #11 D 構造解消の最優先）
   - §2.25.0 80 行サマリー新設（LLM 認知負荷 + 違反 #11 系統 A 再発防止）
   - subagent ライフサイクル統合節新設（違反 #11 C 構造解消）
3. **PO 確認**: 14 票投票 escalate（拮抗）判定 → 上記 §2.25 拡張 3 件を PATCH-G49-Phase1-ADD として着手するか PO に確認（§2.25.3 該当: 新プロセス追加に該当する確度高）

### 着手前確認（PO 判断必須）

- 上記 3 件は §2.25 拡張 = 仕様書改定 = §2.25.3「新プロセス追加」相当 → PO 承認必須
- §2.25.3 非該当（subagent ミッション template 化 / `/adv-subagent` skill 新設 / cross-validator hook 新設）は ADV 自律で着手可、ただし機械強制は ENG 領域 = subagent 経由

### 中期（Phase 1 計画）

- 改善案 ⭐⭐ 7 件は v3.4 Phase 1 の §2.25 拡張第 2 弾として PATCH 起票
- 改善案 ⭐ 4 件は v3.5 / v3.6 ロードマップに繰入

### 長期（v3.5+）

- ADV メイン KPI 化 + SLO 化 + 週次レビュー → ADV 行動規範のデータドリブン改善サイクル成立

---

## 付録 A: 評価サマリー表

| 項目# | ⭐⭐⭐ 必須改善 | ⭐⭐ 推奨改善 | ⭐ 検討改善 | 総合判定 |
|---|---|---|---|---|
| 1 役割 | - | 責務分解明示 | 30秒 trivial 例外 | 改善推奨 |
| 2 起動時必須動作 | §2.25.0 80行サマリー / §2.25 全文 Read 検証 | 起動時 Read DAG 図 | - | **改善必須** |
| 3 直接書込可 7 種 | - | secrets-redact | - | 改善推奨 |
| 4 直接書込禁止 8 種 | - | - | - | 現状維持可 |
| 5 subagent 管理 8 項目 | ライフサイクル統合節 / cross-validator hook | `/adv-subagent` skill / mission template / checklist 化 | - | **大幅再設計** |
| 6 14 票投票 | - | - | - | 現状維持可 |
| 7 違反検出 | adv_response_gate 強化 / 構造解消 checklist | 構造解消 4 点強制 | 週次レビュー | **改善必須** |
| 8 PO 応答 | - | - | - | 現状維持可 |
| 9 機械強制 | handoff_validator §2.25 全文 検証 | 起動時 hook 順序明示 | - | **改善必須** |
| 10 必須参照マトリクス | §2.25.16.6 新設 | PD-NNN 交差索引 | KPI 化 | **大幅再設計** |

**総合判定**: **改善必須** - 項目 2 / 5 / 7 / 9 / 10 の 5 項目で必須改善あり、項目 5 / 10 は大幅再設計相当。

---

## 付録 B: 違反 #11 構造解消の進捗評価

違反 #11（系統 A 複合 4 件、2026-04-25）の構造解消は本レビュー時点で:

| 違反 #11 内訳 | 構造解消ステータス | 残課題 |
|---|---|---|
| A: 仕様書本体 §2.25 全文未読 | ⚠️ 部分（CLAUDE_ADV.md §3.1 起動時 Read 厳格化済、機械強制未） | handoff_validator.sh §2.25 全文 Read 検証追加（⭐⭐⭐ #5）|
| B: SSOT 4 ファイル未読 | ✅ 完了（handoff_validator.sh で機械強制） | - |
| C: subagent_status.md 未更新 | ❌ 未完（即時追記の機械強制なし） | subagent ライフサイクル統合節 + lifecycle_validator.sh（⭐⭐⭐ #3 / #4）|
| D: §2.25.23.10 独断命名 | ❌ 未完（章番号命名規則機械検証なし） | 必須参照マトリクス §2.25.16.6（⭐⭐⭐ #1）+ adv_response_gate 強化（⭐⭐⭐ #6）|

**結論**: 違反 #11 構造解消は ⭐⭐⭐ 6 件のうち 4 件が直接対応。本レビューの ⭐⭐⭐ 改善着手で構造解消完了する。

---

## 関連参照

- `lais/verify/dev_system_v34_package.md` §2.25.1〜.23（ADV 行動規範全体）
- `docs/plans/sub_adv_protocol.md`（ADV 行動ルール詳細）
- `lais/verify/adv_violation_log.md`（違反 #1〜#11 全件）
- `instructions/in_flight_topics.md` / `instructions/subagent_status.md`（SSOT 4 ファイル運用）
- `docs/decision_log.md` PD-G49-P0 / `docs/po-decisions.md` PD-111 / PD-112 / PD-113 / PD-114
- `logs/vote_log.log`（本レビュー 14 票投票記録）
- `scripts/vote_dispatcher.sh` / `scripts/persona_vote.sh` / `scripts/ai_review.js`
