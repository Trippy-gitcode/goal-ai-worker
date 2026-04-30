# LOGIN-TEST-GAP-PERSONA-REVIEW Report (2026-04-26)

## §0 状況 + 14 票結果

### 状況サマリー
ふとし実機ログイン失敗を起点に Phase4 テスト体制を構築したが、肝心の「ログインできる検証」が credentials 不在を理由に SKIP された。LAIS-PHASE4-TEST-SETUP は mock 中心 smoke のみで PASS、Phase 完了と判定された。§2.25.21.4「Phase 完了 = smoke PASS 必須」は mock/実機を区別せず合法的抜け穴となっていた。ADV はミッション設計時「テスト作った」事実に満足し目的整合性（ログインできる検証カバー）を未チェック。違反 #7/#9/#10/#13 と同根の「機械強制未配線」構造的欠陥。

### 14 票投票結果（10 ペルソナ + 構造的重み付け）

| 対策 | 1st 票 | 重み付け票 (qa_lead/security/violation/system_design x2) | 合計 |
|------|--------|----------------------------------------------------------|------|
| **C: 機械強制 hook 拡張** | 5 (devops, ai_ops, security, violation, sys_design) | +3 | **8** |
| **B: §2.25.21.4 仕様改定** | 4 (solo_dev, qa_lead, data_gov, pm_expert) | +1 | **5** |
| A: 実 signin 自動テスト構築 | 1 (tech_writer) | 0 | 1 |
| D: subagent 目的整合性チェック | 0 | 0 | 0 |
| E: signup 重複 UX 修正 | 0 | 0 | 0 |
| F: PO 実機テスト最小化 | 0 | 0 | 0 |

**採択結果: C 単独最多だが、10/10 ペルソナ中 8 件が B→C 順序依存を明記。実態は B+C 同時着手 → A 実装の論理セット。**

---

## §1 ペルソナ別優先順位（10 件）

### 1. solo_dev — PRIORITY=BCADFE
- KEY: 構造的盲点の根本は「定義の曖昧さ」+「機械強制の欠如」。ADV 自己チェック（D）より仕様改定（B）+ 機械強制（C）が病因治療。A は症状治療
- RISK: SUPABASE_SERVICE_KEY 本番混入時データ汚染、機械強制過剰で WIP も BLOCK
- DEP: B → C 順序必須、C 完成後 D 優先度低下

### 2. devops_engineer — PRIORITY=CABDEF
- KEY: DevOps 原則「人間判断に依存せず機械強制」の欠如が根本。mock smoke で完了可能な CI/CD は false confidence 生成装置
- RISK: .dev.vars への SERVICE_KEY は credential leak/rotation リスク、hook 自体のテスト必要性
- DEP: C → A 順序必須（検証機構なしで実テスト構築しても mock 逃げ道残存）、B/C 並行可

### 3. qa_lead — PRIORITY=BACDEF
- KEY: Phase 完了判定が「テスト存在」で満足し「目的達成」を検証しない構造的欠陥。mock/実機区別なき「PASS = 完了」が盲点根源
- RISK: B 単独では遵守されない（C 必須セット）、A で「作った」満足 → E2E カバレッジ漏れ
- DEP: C は B 完了前提、D メタチェックは B 評価フレームワーク必要

### 4. tech_writer — PRIORITY=ACBDFE
- KEY: 「成果物の存在」≠「目的達成」の混同が盲点本質。文書品質保証と同構造
- RISK: A の test account 管理複雑性（cleanup 漏れ、並列衝突、SERVICE_KEY 露出）、C の誤検出で正当 Phase BLOCK
- DEP: C は A 依存（実機 smoke ログ存在前提）、F は A/C 後に自然達成

### 5. ai_ops — PRIORITY=CBADFE
- KEY: §2.25.21.4 の mock/実機無区別が「合法的抜け穴」。仕様明文化(B) → 機械強制(C) の順で配線
- RISK: D 目的整合性は定量化困難、主観判断の機械強制で false positive 発生、SERVICE_KEY が新攻撃面
- DEP: B → C 順必須、C なしで A だけは同種盲点再発

### 6. security_engineer — PRIORITY=CBADFE
- KEY: 認証系テストの実機/mock 混同可能仕様は security critical path の構造的欠陥。機械強制が再発防止に有効
- RISK: A 単体では別機能（payment/admin）で再発、hook 複雑化で false positive → PO 割込み増加
- DEP: B→C: mock/実機定義明確化が hook 実装前提、B/C → A: 機械強制配線完了後に実テスト

### 7. データガバナンス専門家 — PRIORITY=BCADFE
- KEY: 「検証できないものは保証できない」違反。機械強制なき規範は違反 #7/#9/#10/#13 同様に回避可能
- RISK: 検証ログ自体の真正性・改竄検知なし（sha256 署名不在）、A の SERVICE_KEY 自動アカウント作成で 429 抵触・本番 DB 汚染
- DEP: B→C 正順、A 実装前に Supabase テスト環境分離必須

### 8. 違反パターン分析専門家 — PRIORITY=CBADFE
- KEY: 違反 #7/#9/#10/#13 と同根「機械強制未配線」。C で即座に塞ぎ B で仕様固定が鉄則
- RISK: C 暫定実装（B 未完）は新抜け穴、D 単独はプロセス改善で過去 23 件違反「人間判断は必ず漏れる」教訓無視
- DEP: C 実装は実機 smoke ログ定義依存、B/C 48h 内並行必須

### 9. プロジェクトマネジメント専門家 — PRIORITY=BCADFE
- KEY: 仕様曖昧性（mock/実機 smoke 無区別）が盲点を許容。B → C → A が論理的依存順序、D は B/C と相互補完、F は結果であり手段でない
- RISK: A 単独で「テスト作った」満足の再発、C 先行で B スキップ時に強制ロジック自体が曖昧基準で新抜け穴
- DEP: B が C/A の前提、D は B 後に判定基準明瞭化

### 10. システム設計専門家 — PRIORITY=CBADFE
- KEY: 過去違反 23 件から「ADV 自己回避」信頼性低、機械強制層（C）最優先 + B/A 多層防御
- RISK: A でテストアカウント管理の新セキュリティ盲点、D を ADV 自身に委ねると「チェック実施」形式報告で実質 SKIP の 2 次盲点
- DEP: B→A→C: B で基準明確化 → A でログ生成可能化 → C でログ検証、(B,A)→D

---

## §2 最適次アクション（採択順 + 実行計画）

### 採択戦略: B+C 同時着手 → A 実装 → D は B/C 完成後に必要時のみ

**根拠**: 14 票で C が最多 (8/14) だが、10/10 ペルソナ中 8 件が「B 先行 or B/C 並行が論理的必須」と明記。C 単独実装は「実機 smoke ログとは何か」未定義のまま hook 配線となり新抜け穴を生む。B 仕様改定なしで C は実装不能（ai_ops/qa_lead/data_gov/sys_design が一致）。

### Phase 1: B+C 同時着手（48h 内完了目標、ADV 自律）

1. **B 仕様改定**: §2.25.21.4 を以下のように改定
   - mock smoke / 実機 smoke を別概念として定義
   - Phase 完了 = 「実機 smoke PASS ログファイル存在 + smoke 種別タグ判定」必須
   - 実機 smoke ログのフォーマット規定（ファイル名 `*_real_smoke_<timestamp>.log`、必須フィールド: signin_success/signup_success/timestamp/test_account_id）

2. **C 機械強制 hook 拡張**: adv_response_gate.sh を以下のように拡張
   - 「Phase 完了」発言検出時、対象 Phase の `verify/*_real_smoke_*.log` 存在検証
   - mock smoke ログのみ存在 + 実機 smoke ログ不在 → BLOCK
   - 実機 smoke ログ内 `signin_success=true` 必須、不一致なら BLOCK

### Phase 2: A 実 signin 自動テスト構築（B/C 完成後）

3. **A 実テスト**: SUPABASE_SERVICE_KEY を専用テスト Supabase プロジェクト（本番分離）で運用
   - プログラマティック テストアカウント作成（メール確認 SKIP モード使用）
   - 実 signin 検証 + cleanup（テスト終了時アカウント削除）
   - 出力先: `verify/lais_real_smoke_<timestamp>.log`（C が検証する形式）
   - テスト環境分離必須: data_governance 警告対応（本番 DB 汚染回避）

### Phase 3: D は条件付き（必要時のみ）

4. **D は当面保留**: C 機械強制が機能すれば人間チェックは冗長。C で防げない subagent 設計品質劣化が観測された場合のみ後続実装。

### 並走 subagent との関係
- E (SIGNUP-DUPLICATE-UX): 別系統、本対策と独立で継続可
- F (PO 実機テスト最小化): 本対策完了で自動達成（実機 smoke 自動化により PO 手動検証不要化）

---

## §3 PO 向け 3 行サマリー（ふとしに直接見せる）

1. **採択次アクション**: 仕様改定（mock smoke と実機 smoke の区別を明文化）+ 機械チェック追加（実機ログがないと「Phase 完了」と言えなくする）を 48 時間以内に同時着手、その後に実ログイン自動テスト構築。10 ペルソナ中 8 件が「ふとしの直感（ログインできる検証が抜けていた）は構造的盲点であり機械強制で塞ぐべき」と一致。
2. **期待効果**: 「ログインできる」検証が自動化され、今後同じ盲点（テスト作ったけど目的検証してない）が機械的に BLOCK される。違反 #7/#9/#10/#13 と同型なので、本対策で同じパターン全体を再発防止。
3. **ふとし作業発生**: なし。ADV 自律で全工程完結、テスト環境分離（専用 Supabase プロジェクト準備）も ADV 側で対応。
