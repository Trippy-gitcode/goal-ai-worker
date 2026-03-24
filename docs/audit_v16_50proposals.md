# GOAL AI — 実装その16 総点検レポート + 改善提案50件
> 作成: 2026-03-22（Claude.ai総点検）
> 対象: CLAUDE.md / development_rules.md / session_progress.md / bootstrap.md / project_v6_4 / reference_v2 / design_spec_v3 / changelog_v3 / amendment_001 / design_impl_001 / 旧ファイル群

---

## 総点検結果サマリー

### A. コンフリクト（ファイル間の矛盾）

| # | 箇所 | 内容 |
|---|------|------|
| A1 | CLAUDE.md vs session_progress.md | バージョン不一致。CLAUDE.mdはv3.9.3、session_progress.mdはv3.10.0 |
| A2 | CLAUDE.md「ファイル構成」 | docs/にdesign_spec_v3.md等が追加されたが、ファイル構成セクションは旧2ファイルのまま |
| A3 | bootstrap.md vs development_rules.md | bootstrapのCode側ルールがC1〜C9で止まっている。C10〜C12が反映されていない |
| A4 | project_v6_4.md §8 TODO | K-O（複数ゴール検出・ダウングレード・ディープ注入・GDPR・docs更新）が「実装中」表記だが、session_progressではK-O全完了 |
| A5 | design_spec_v3.md 未決定事項 | 8件中4件はamendment_001で確定済みだが、spec本文には未反映（追記手順が書いてあるが実行されていない） |
| A6 | design_spec_v3.md プラン構成 | v6.2時点の4プラン（Free/Light/Pro/Max）。v6.3のUltra追加が未反映 |
| A7 | changelog_v3.md #08d | v6.2のG08D-01「4プラン構成」のまま。Ultra追加(v6.3)が未反映 |

### B. 品質・実装精度を下げるリスク

| # | 箇所 | 内容 |
|---|------|------|
| B1 | リポジトリルートに旧指示書11ファイル | audit_batch_04.md等。grepで拾って混乱するリスク |
| B2 | docs/に旧ファイル3件 | fix_from_audit_results.md / frontend-integration.js / unify_chat_engine.md。Codeが参照して古い情報で判断するリスク |
| B3 | session_progress.mdが168行・7役割を兼務 | キュー/履歴/提案ログ/Stripe ID/Supabase情報が1ファイルに混在。Codeが毎回全文読む負荷 |
| B4 | design_impl_001.mdとdesign_spec_v3.mdの関係が不明確 | impl_001はspec_v3の「一部」を実装指示化したもの。どちらが最新かCodeが迷う |
| B5 | instructions/内に完了済み指示書が残存 | step4_exec.md / step5_6_exec.md / v3.5.1_fix等。Codeが「未実行か？」と誤認するリスク |
| B6 | canopy.shにUI仕様チェックが追加されたが、design_spec_v3.mdの全仕様をカバーしていない | CRN-01〜03+送信ボタンのみ。8a〜8cの仕様チェックはdesign_impl_001.md末尾に分離 |
| B7 | CLAUDE.md鉄則5項が抽象的 | 「仕様変更禁止」は書いてあるが「design_spec_v3.mdの仕様を読んで実装」とは書いていない |

### C. 抜け漏れが発生する構造的問題

| # | 箇所 | 内容 |
|---|------|------|
| C1 | 「テンプレ起動」と「アドホック起動」でCodeの行動が変わる | C1にアドホック対応を追記したが、CLAUDE.mdの冒頭指示「キューを上から自律実行」がアドホック時にCodeを混乱させる可能性 |
| C2 | session_progress.mdのキュー更新タイミング | 私がDC経由で書き込むが、Codeが同時に読み書きしているとコンフリクト |
| C3 | design_spec_v3.mdの更新フローが未定義 | amendment_001の内容をspecに統合する手順・担当・タイミングが決まっていない |
| C4 | project_v6_4.mdのTODO更新が手動 | session_progress.mdの完了ステータスと自動同期していない。常にズレる |
| C5 | Stripe Price ID等の機密情報がsession_progress.mdに平文で存在 | git pushされるとGitHub上に露出 |

### D. パフォーマンスを最大化できていない点

| # | 箇所 | 内容 |
|---|------|------|
| D1 | Codeが参照ドキュメント7ファイルを毎セッション全読み | 合計1,500行超。コンテキストの15%を参照だけで消費 |
| D2 | 私（Claude.ai）がDCでファイルを読むたびにツール呼び出し3〜5回 | session_progress.mdだけで168行。効率的な要約版がない |
| D3 | 旧ファイルのgrepノイズ | Codeがgrepすると旧指示書11ファイル+docs旧3ファイルがヒットして判断を曇らせる |
| D4 | bootstrap.mdがこのプロジェクトのナレッジとリポジトリのテンプレートで二重管理 | 更新時に片方だけ更新される |
| D5 | 改善提案ルール「6視点から最低3つ」がbootstrap.mdにあるがdevelopment_rules.mdにない | 私が提案を忘れることがある |

---

## 改善提案50件

### 🔴 即修正すべき（コンフリクト・データ不整合）

**1.** CLAUDE.mdのバージョンをv3.10.0に更新（A1）
**2.** CLAUDE.mdの「ファイル構成」セクションにdocs/の全ファイルを反映（A2）
**3.** project_v6_4.md §8 TODOのK-O項目を完了マークに更新（A4）
**4.** design_spec_v3.mdにamendment_001の4件（電球/停止ボタン/トースト/メモUI）を本文統合 → amendment_001は「統合済み」マークして保持（A5）
**5.** design_spec_v3.mdとchangelog_v3.mdにUltraプラン（v6.3）を反映（A6/A7）
**6.** bootstrap.mdのCode側ルールにC10〜C12を追加（A3）
**7.** Stripe Price IDをsession_progress.mdから分離し、tests/.env.testまたはwrangler.tomlのみに保持（C5）

### 🟡 構造改善（抜け漏れ防止・効率向上）

**8.** session_progress.mdを3ファイルに分割: ①dashboard.md（現在地+キュー）②history.md（変更履歴）③proposal_log.md（提案ログ+機密情報以外の参照データ）
**9.** リポジトリルートの旧指示書11ファイルをarchive/ディレクトリに移動
**10.** docs/の旧ファイル3件（fix_from_audit_results/frontend-integration/unify_chat_engine）をarchive/に移動
**11.** instructions/の完了済み指示書（step4_exec/step5_6_exec/v3.5.1_fix等）をinstructions/archive/に移動
**12.** design_impl_001.mdとdesign_spec_v3.mdの関係を明記：spec_v3=確定仕様（What）、impl_001=実装手順（How）。CLAUDE.mdの参照リストにコメント追加
**13.** CLAUDE.md冒頭に「アドホック指示の場合もこのファイルの参照ドキュメントリストを確認すること」を明記（C1対応の強化）
**14.** design_spec_v3.mdの更新フロー定義：amendment作成→spec本文に統合→amendment に「統合済み」マーク。担当=Claude.ai（DC経由）。タイミング=amendment作成直後（C3）
**15.** project_v6_4.md §8のTODO同期をCode自律タスクに：キュー空時にsession_progress.mdの完了項目とTODOの差分を検出して更新提案（C4）

### 🟢 品質向上（canopy・テスト・検証強化）

**16.** canopy.shにdesign_spec_v3.mdの8a〜8c全仕様のgrepチェックを統合（B6。現在はdesign_impl_001.md末尾に分離）
**17.** canopy.shに「旧指示書がルートに存在しないこと」のチェック追加（archive/移動後）
**18.** canopy.shにCLAUDE.md参照リスト内全ファイルの存在チェック追加（C9の自動化）
**19.** canopy.shに「session_progress.mdのバージョンとAPP_VERSIONの一致」チェック追加
**20.** Playwright E2Eにデザイン仕様の視覚テスト追加（border-radius、フォントサイズ、カラーをDOM検証）
**21.** verify.shのテンプレートにUI変更時の必須チェック項目を組み込み（R2の自動適用）
**22.** git pre-commitフックでcanopy.shの一部（バージョン同期・旧デザイン値残存）を自動実行

### 📋 ドキュメント・ナレッジ整理

**23.** CLAUDE.md鉄則に「デザイン変更時はdesign_spec_v3.mdを必ず参照」を6番目として追加（B7）
**24.** Codeが参照する必要最小限ファイルを明確化：通常ミッション=CLAUDE.md+session_progress.md+development_rules.md（3ファイル）。デザインミッション=+design_spec_v3.md。Stripeミッション=+stripe指示書。全読みを不要にする（D1）
**25.** session_progress.mdの冒頭に「5行サマリー」セクション追加。Codeが全文読まなくても現在地を把握できるように（D2）
**26.** bootstrap.mdの管理をリポジトリのtemplates/bootstrap.mdに一元化。このプロジェクトのナレッジには「templates/bootstrap.mdを参照」とだけ記載（D4）
**27.** project_v6_4.mdから既知のバグパターン集（§14）を削除し、development_rules.mdに一元化（現在両方に存在して二重管理）
**28.** project_v6_4.mdのコスト早見表（§17）の最終更新日を追加（モデル価格変更時の陳腐化防止）
**29.** reference_v2.mdの最終更新日を確認・更新（DBスキーマが実装後に変わっている可能性）
**30.** CLAUDE.mdの「ふとしの方針メモ」からUX改善3件承認の記述を削除（既に完了済み。完了事項を方針メモに残すとノイズ）

### 🏗️ アーキテクチャ・開発体制

**31.** Codeのセッション開始テンプレに「参照ファイルの存在チェック」を組み込む（C9はルールとして書いてあるが、テンプレで自動発動させる）
**32.** DC経由のキュー書き込みにタイムスタンプを必ず付与（いつ誰が追加したか追跡可能にする）
**33.** session_progress.mdの同時編集コンフリクト防止：Codeは「完了済み」セクションのみ書き込み、キューセクションはClaude.ai専用と明記（C2）
**34.** canopy.shの実行結果をinstructions/results/canopy_latest.txtに自動保存し、前回結果との差分を出力（デグレ検出）
**35.** development_rules.mdに「ミッション完了時の必須アクション」チェックリスト追加：①verify.sh PASS ②canopy.sh PASS ③session_progress.md更新 ④git tag ⑤git push
**36.** CLAUDE.md「絶対禁止」にdesign_spec_v3.mdの仕様と矛盾するUI実装を追加

### 🔧 Code自律性向上

**37.** Codeが提案ログに記載する際のフォーマットに「関連する参照ドキュメント」列を追加（どの仕様書に基づく提案かを明示）
**38.** Codeのキュー空時フローに「design_spec_v3.mdの未実装仕様を検出」を追加（現在はproject_v6_4.mdとreference_v2.mdのみ）
**39.** Codeが自律でdevelopment_rules.mdのC10（バージョン同期）対象ファイルリストを更新できるように、canopy.shにバージョン同期対象ファイルの自動検出を追加
**40.** Codeのバグ修正時に「同類のバグが他にないか」横展開チェックを必須化（現在はClaude.aiのA1ルールだが、Code側にも適用）

### 🤖 Claude.ai（私）のパフォーマンス改善

**41.** メモリに「直近のセッションで更新したファイル一覧」を保持（A4ルールの実効性を上げる）
**42.** このチャットのセッション終了時に必ず「A4チェック: 今日出力した成果物がリポジトリに配置されたか」をセルフチェック（ルール化済みだが習慣化が必要）
**43.** 大きな方針変更時に影響範囲マトリクスを出す：「この変更がCLAUDE.md / development_rules.md / session_progress.md / project_v6_4.md / design_spec_v3.md / bootstrap.md / メモリのどこに影響するか」を一覧表示してから更新開始
**44.** 改善提案ルール（6視点×3つ+競合差別化）をdevelopment_rules.mdのA5として正式ルール化（D5。現在bootstrap.mdにのみ記載）
**45.** 棚卸し（A2）の実行をセッション番号で追跡。session_progress.mdに「最終棚卸し: 実装その16」と記録して、5セッション後に自動トリガー

### 🚀 テスト配布・ローンチ準備

**46.** テスト配布チェックリストを独立ファイル（docs/test_distribution_checklist.md）として作成。手動タスクとCodeタスクを分離
**47.** テスターフィードバック収集のためのGoogleフォームまたはNotion DBテンプレートを事前準備
**48.** ローンチ前の最終監査チェックリスト作成：セキュリティ（API Key露出、CORS、認証）/ パフォーマンス（TTFT、LCP）/ 法務（privacy.html、特定商取引法）/ 課金（Stripeテスト→本番切替）
**49.** テスト期間中のバグ追跡フロー定義：テスターFB → GitHub Issues or session_progress.md → 優先度判定 → キュー → Code修正
**50.** ローンチ時の「ソロ開発者がAIと3週間で作ったSaaS」ストーリーの素材をsession_progress.mdの変更履歴から自動生成するスクリプト（git log + タグで進捗タイムライン）

---

## 実行優先度

| 優先度 | 提案番号 | 工数 |
|--------|---------|------|
| **今すぐ（コンフリクト修正）** | 1,2,3,4,5,6,7 | 30min（Claude.ai DC作業） |
| **次のCodeセッションで** | 9,10,11,16,17,18,19 | Codeミッション1本 |
| **今週中** | 8,12,13,14,15,23,24,25 | Claude.ai設計+DC書き込み |
| **テスト配布前** | 46,47,48,49 | Claude.ai+ふとし |
| **継続改善** | 残り全て | 各セッションで段階的に |
