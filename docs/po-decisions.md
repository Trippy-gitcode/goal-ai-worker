# PO判断パターン集
> dev-system §13.17 準拠
> 管理者: ENG（Claude Code）— PO代理ペルソナが参照する
> 更新タイミング: POが判断を下した都度、ENGが本ファイルに追記する
> 目的: PO（ふとし）の判断傾向をパターン化し、PO代理の判定精度を上げる

---

## 設計方針パターン

### PD-001: 全体最適 > 局所最適
- **事例:** placeholder contrast問題。S-01限定修正（A案）ではなくdesign system全体で修正（B案）を選択
- **パターン:** 1箇所だけ直すより、根本原因を直してプロジェクト全体に波及させる方がトータルコスト低い

### PD-002: 既決定は覆さない
- **事例:** D-16（disabled vs aria-disabled）。R3で「aria-disabled + submit gate」を採用。R4.1で逆の指摘（philosophical conflict）。PO棄却: R3決定維持
- **パターン:** 一度決定した技術方針は、より強い根拠がない限り維持。AIレビュアー間の意見対立（philosophical conflict）は先の決定を優先

### PD-003: 過度な適用はしない
- **事例:** learned-patterns蓄積条件。1ミッションのみの指摘は蓄積しない（2回以上の再出現が条件）
- **パターン:** 1回の事象で全体ルールを変えない。繰り返し証明されたパターンのみ制度化する

### PD-004: コスト増を伴う判断は必ずPOに上げる
- **事例:** 外部AIレビューモデルの変更、新規API呼び出しの追加、プラン構成変更
- **パターン:** 月額コストが変動する判断は技術的に正しくてもPO承認必須

### PD-005: 仕組みで解決する
- **事例:** 「同じ指摘を何度もされないように実装したい」→ LP蓄積フロー（§13.16）導入。手動チェックリストではなくCodeが自律的に蓄積する仕組みに
- **パターン:** 人の注意力に依存する解決策より、プロセス/ルール/スクリプトで自動化する解決策を優先

### PD-006: 品質最優先だがスピードとのバランスも取る
- **事例:** HIGH対応はPhase A完了後まとめて（各ミッションごとにHIGH対応するとregression発生でラウンド増）
- **パターン:** CRITICAL 0で品質ゲート通過。HIGHは蓄積して横断的に対応する方が効率的

### PD-007: 新プロセスは必ずPO承認
- **事例:** 3ペルソナ制導入、LP蓄積フロー導入、dev-system仕様への新セクション追加
- **パターン:** 既存プロセスの範囲内の判断はADV自律OK。新規プロセス・ルール体系の導入はPO承認必須

### PD-008: dev-systemに残す（次のプロジェクトでも使えるように）
- **事例:** LP蓄積フローをdev-system §13.16に明記。アプリ固有ではなく共通基盤として定義
- **パターン:** プロジェクト横断で価値がある知見・プロセスはdev-systemに書く

---

## レビュー判断パターン

### PD-101: 外部AI CRITICALは棄却禁止（ただしスコープ外は再提示で取り下げを狙う）
- **事例:** M4-C R1スコープ外4件。Code独断棄却はせず、R2パッケージでスコープ明示→spec_complianceが自主的にダウングレード
- **パターン:** 棄却ではなく「再レビューでレビュアー自身に判断を委ねる」アプローチ

### PD-102: security HIGHは提案ログに必ず記録
- **事例:** M4-A security_engineer HIGH 3件を提案ログに1行ずつ記録（redirectTo/RLS/CSP）
- **パターン:** セキュリティ指摘は忘れないよう即記録。対応時期はPhase Bでも記録だけは即時

### PD-103: レビューモデルのグレード使い分け
- **事例:** ゴールデンレビュー=GPT-5.4（品質最終ゲート）、修正ラウンド=GPT-5（確認作業）
- **パターン:** 品質ゲートの最終判定にはトップモデル。中間確認は品質維持できる範囲で安いモデル

### PD-104: ADV/ENG/PO 責務境界は3分岐で明文化
- **事例:** dev_system v3.4 R1トリアージ（2026-04-18 G_42）クラスターD。§0 Step 0-2「全層で必須Read」が §3.1 PO起動時Read（session_progress.mdのみ）と矛盾 → POが規範を読むのか不明
- **判断:** §0 の Read リストを ENG/ADV/PO の3分岐に再構成する方針で確定
  - ENG: §C1-C6 全文 + CLAUDE.md + development_rules.md + session_progress.md
  - ADV: §C1-C6 全文 + sub_adv_protocol.md + session_progress.md + po-decisions.md 直近10件
  - PO: 5行サマリー + キュー先頭ミッションID のみ（§C1-C6 は任意）
- **関連:** §C1「コード書かない」を「アプリ実装コード（src/ / frontend/ / scripts実装）」に限定定義。ドキュメント・テンプレート・契約セクションは別扱い
- **関連:** §0 Step 0-4/0-5（キュー先頭ミッション判定）は ENG 限定。ADV は「POの指示内容に基づくフロー判定」を最優先
- **パターン:** 役割ごとに必要な情報量が異なる場合、一括「全員必須Read」ではなく役割ごとに必要最低限を定義する

### PD-105: 仕様厳格化は「全員を縛る」より「リスク高領域に集中」
- **事例:** dev_system v3.4 クラスターI（2026-04-18 G_42）。Step 0 と3区分必須化で仕様書 +500行。M5ログインループ事件の再発防止目的
- **両案検討:**
  - 案A（厳守）: 全22フロー Step 0 + 全ミッション3区分必須。機械検証で抜け漏れゼロ
  - 案B（ソロ最適化）: Step 0 は章単位集約。3区分必須は高リスクのみ
- **判断:** **案B + 条件付き**を採用。認証・決済・外部API呼び出しは3区分必須に分類する
  - 軽い修正（文言/スタイル）は cmd-unit 1行で済む
  - 高リスク系はどんな小規模でも3区分必須
  - Step 0 は章単位集約で仕様書肥大化抑制
- **パターン:** 「全員を縛る」厳格化は事務負荷で別の抜け（N/A適当記入）を生む。リスク高領域に集中厳格化するほうが現実的。M5事件の根本も認証領域だったため、認証集中で再発防止の本質は守れる

### PD-106: 高コストレビュー発火条件は機械判定で自動化
- **事例:** dev_system v3.4 クラスターJ（2026-04-18 G_42）。Hフロー（統合レビュー。6本×$5-10×15-25分）をデプロイ毎に実行するか、限定するか
- **両案検討:**
  - 案A（厳格）: デプロイ毎に必ずHフロー
  - 案B（限定）: 認証/決済/外部API連携を触ったとき、または大型機能完了時のみ
- **判断:** **案B + 機械判定**を採用。発火条件を git diff のファイルパスで自動判定する
  - 判定対象ファイル例: `src/auth/**` / `src/payment/**` / `src/lib/supabase.ts` / `src/services/stripe/**` / 外部API呼び出しパス
  - 該当ファイルが git diff にあれば自動で Hフロー発火
  - それ以外のデプロイは Hフロー不要（文言修正・スタイル調整等）
- **パターン:** 「人間が毎回判断する」運用は判断ミスで抜けが発生する。機械判定できる条件は機械で判定する。ふとしの事務負荷ゼロ化 + 漏れゼロを両立

### PD-107: 必須Readは §C0 要約を固定、§C1-C6 全文は条件付き再読（PD-104 の拡張）
- **事例:** dev_system v3.4 R2 クラスターζ（2026-04-19 G_44）。ζ CRITICAL 2件（gemini_solo R-001 / gpt54_tech_writer R-002）。PD-104 原文では必須Read=§C1-C6 全文だが、R2 で §C0（1ページ要約、約50-100行）を新設した結果、§4.1.2 の表が「§C0-C6 全文」に拡張され PD-104 の承認範囲を超えていた。R2 内部で §2.6 / §4.1.2 / §4.1.6 の3箇所に矛盾
- **両案検討:**
  - 案A（拡張公式化）: 必須Read = §C0 要約 + CLAUDE.md + development_rules.md + session_progress.md（約 400行）。§C1-C6 全文は各フロー Step 0 参照時のみ条件付き再読
  - 案B（原文遵守）: §C0 は補助扱い、必須Read は §C1-C6 全文（約 800-1,000行）のまま
- **判断:** **案A採用**。PD-104 の「役割ごとに必要最低限を定義」原則に合致。クラスターF（起動時Read量過大）対応の設計意図を保持
  - §C0 要約を毎セッション必ず参照（設計 DNA を短時間で思い出せる）
  - §C1-C6 全文は必要フロー時のみ参照（Step 0 で該当章を明示）
  - 毎セッション Read 約 400行で ENG・ADV とも運用可能
- **パターン:** 要約を固定 Read、詳細は条件付き Read で分離する設計は、人間の作業記憶と API コンテキストの両方に優しい。「全員が毎回全文を読む」運用は制度疲労を起こしやすく、守られなくなる。守れる量に絞って機械的に守らせるほうが長続きする
- **関連:** PD-104 の拡張決定。PD-104 を上書きはせず、PD-107 として独立追加（PD-104 原文は歴史記録として不変）

### PD-108（**却下**）: ADV 書込可範囲に scripts/lib/** と scripts/*_lint.sh を追加する提案
- **事例:** dev_system v3.4 ゴールデンR1 クラスターμ'（2026-04-19 G_45）。R2.1 §4.16 で「ADV が lint スクリプトの雛形を scripts/lib/ や scripts/*_lint.sh に書き込める」と提案した（gpt54_ai_ops R-001 が指摘）。dev-system 鉄則②「ADV はコードを書かない」「スクリプトは ENG に委任」との衝突
- **両案検討:**
  - 案A（却下・現行鉄則維持）: ADV 書込可は docs/**, instructions/**, lais/verify/**.md, lais/instructions/**.md, templates/** に限定。scripts/** は ENG 専任
  - 案B（採用・責務境界再定義）: ADV が scripts/lib/*.sh と scripts/*_lint.sh を書ける。新プロセスとして PD-108 承認
- **判断:** **案A採用（PD-108 却下）**。ADVの力はR2.1パッケージ等の設計文書内で実装サンプル（bash/sh/ts）を提示することで十分発揮される。実ファイル書込を ADV に開くと責務境界の曖昧化・レビュー経路の複雑化・誤修正時の責任所在不明を招く
  - R2.1 §4.16 は `templates/**` 追加のみ採用、scripts/lib/** と scripts/*_lint.sh は削除
  - ADV の立ち位置: 「実装サンプルの提示は R2.1 等のパッケージ文書内で可。実ファイル `scripts/**` への書込は不可」と sub_adv_protocol.md / dev_system_spec.md に明記
- **パターン:** 責務境界は「開いて便利にする」より「閉じて明確にする」方が長期的に安全。新プロセスを提案するときは、既存鉄則との衝突を最初に確認する。衝突がある場合、原則として鉄則側を優先し、どうしても新プロセスを通したい場合は鉄則側の改定を PO 承認で正式化する（今回は鉄則側の改定不要と判断）
- **関連:** 鉄則② と sub_adv_protocol.md の書込可リストを正本として維持。将来再提案時は本 PD-108 を参照し、却下理由（責務境界の明確化優先）を踏まえて検討

### PD-109: ミッション STATUS は5状態モデル、BLOCKED は ENG 手動遷移の例外規定
- **事例:** dev-system v3.4 パッケージ v2 §5.1（2026-04-20 G_46 決定 / 2026-04-23 v3.4 確定時に正式記録）。既存4状態（QUEUED/IN_PROGRESS/BLOCKED/DONE）では cmd-unit/cmd-e2e PASS → 即 DONE が柔軟性破壊、自動遷移完全禁止はデッドロック（Golden R2 #20）
- **決定（5状態モデル）:**
  | STATUS | 意味 | 遷移主体 |
  |---|---|---|
  | QUEUED | 未着手 | ADV 手動（キュー登録時）|
  | IN_PROGRESS | 実装中 | ENG（初回コミット時に canopy 自動）|
  | READY_FOR_DEPLOY | cmd PASS、デプロイ待ち | canopy::check_test_pass 自動 |
  | DONE | 完了 | deploy.sh 自動 or canopy 自動（no_deploy:true 時）|
  | BLOCKED | 例外（外部障害等）| ENG 手動（例外規定）|
- **BLOCKED 例外規定:** ENG は IN_PROGRESS 中の続行不能時のみ手動遷移可。session_progress.md に「**BLOCKED 理由:** <理由>」必須、解除も手動。canopy::check_blocked_integrity が理由なし BLOCKED を FAIL。BLOCKED 以外の STATUS 手動書換えは禁止（鉄則⑭）
- **STATUS_CORRECTION 拡張（PATCH-12、R3-H-07、§2.26 STATUScrit）:** ADV/PO は canopy_common.sh::correct_status() 経由で4種の逆方向遷移可（DONE→READY_FOR_DEPLOY / DONE→IN_PROGRESS / READY_FOR_DEPLOY→IN_PROGRESS / IN_PROGRESS→QUEUED）。履歴は instructions/status_corrections.log。ENG の独断逆方向書換えは禁止（caller_role=ENG は exit 1）。BLOCKED への correct_status は禁止
- **影響:** dev_system_spec §4.2 に §4.2.-1 新設 / §21 §C3.2 再掲 / sub_adv_protocol §9 同期 / canopy_common.sh 関数追加 / ミッションテンプレに no_deploy フラグ追加
- **関連:** R2.2 §5.1 / §2.26 / PATCH-12。§13.17 ENG 自律判定との境界を明示

### PD-110: Hフロー承認主体は ADV/PO 限定、HFLOW_APPROVED 環境変数バイパス廃止
- **事例:** dev-system v3.4 パッケージ v2 §5.2（2026-04-20 G_46 決定 / 2026-04-23 v3.4 確定時に正式記録）。R2.1.1 の `HFLOW_APPROVED=1 scripts/deploy.sh` で ENG 自律バイパス可だったのは AI 暴走防止として破綻（Golden R2 #1、承認証跡未定義 #21）
- **決定:**
  - HFLOW_APPROVED 環境変数バイパスを **廃止**
  - 承認証跡: `instructions/approvals/<MISSION_ID>.hflow.approved`（JSON ファイル、R2.2 §3.5 SSOT 形式）
  - 承認主体: **ADV（Claude.ai / Desktop Code ADV）または PO（ふとし）のみ**
  - ENG（Claude Code）は承認ファイル書込不可（changed-files-allowlist.sh で ADV書込可リストに `instructions/approvals/` 追加、ENG は弾かれる）
  - deploy.sh は承認ファイル存在 + commit_sha 一致を検証。不一致/未承認は exit 1
  - commit 変更時は再承認必要（commit_sha 照合で自動検出）
- **承認証跡 JSON:** approver / approver_name / date / mission_id / commit_sha / trigger_reason / notes
- **承認真正性二重証跡（PATCH-14、R3-H-09）:** `session_history_ref` + `approval_git_author`（ドメインマッチ `*claude_ai*|*claude@*|*anthropic*|*noreply@anthropic.com`）+ HEAD sha の3層検証。`scripts/verify_approval_authenticity.sh` で一括検査
- **オプトアウト:** `app_config.yaml` の `hflow.enabled: false` で承認ゲート全スキップ（ソロ開発者向け）。デフォルトは true
- **影響:** dev_system_spec §6 承認ルールに §6.4 新設 / sub_hflow_protocol.md 新設 / templates/hflow_approval_template.json 新設 / deploy.sh Step 5 承認ゲート実装（§2.3 σcrit）/ changed-files-allowlist.sh 制約追加
- **関連:** R2.2 §5.2 / PATCH-14 / §3.5

---

## v3.4 確定宣言（2026-04-23 G_48）
- **承認**: ふとし PO（2026-04-23）
- **対象**: dev-system v3.4 パッケージ v2（`lais/verify/dev_system_v34_package.md` 3,352 行）
- **達成条件**:
  - R1 triage 採用 CRITICAL 5件 + HIGH 11件（うち v3.4 採用 8件）完了（PATCH-4〜17）
  - PATCH-18 ADV 行動規範仕様化（§2.25 新設）完了
  - Pre-Review 2R 重大 0 到達（devops_engineer + solo_dev、2回）
  - §10 構造検証 全 PASS（章重複 0 / サブ節重複 0 / クラスター §2.1〜§2.26 連続 / PD-109(45) / PD-110(20) / §C0-C6 各1）
  - §7.4 既棄却テーマ衝突 0、SSOT 整合性 OK
- **次アクション**: `DEV-SYSTEM-V34-R2.2-CHAIN-UPDATE-DISPATCH`（🔴 高リスク、PART1 着手は別途 PO 承認必須）
- **関連**: R2.2 §0 / PATCH-1〜18 / [dev_system_v34_pre_r5_summary.md](../lais/verify/dev_system_v34_pre_r5_summary.md) / [dev_system_v34_patch18_pre_review_summary.md](../lais/verify/dev_system_v34_patch18_pre_review_summary.md)

---

## 抽出メタ情報
- **初回抽出:** G_39セッション (2026-04-15)
- **情報源:** session_progress.md G_38-39のPO判断記録 + session_history.md
