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

### PD-111: §2.25 を §2.25.14 まで拡張、事前回避を絶対基準化、全応答ペルソナレビュー導入
- **事例:** Desktop Code ADV G_47〜G_49（2026-04-23 〜 04-25）。違反 #1〜#10 の同型再発（#3→#6→#8 / #5→#9）が連続発生、§2.25.5 単独運用の事後記録は再発防止に機能しないことが実証。LLM の構造的問題（テンプレ応答癖 / 一貫性欠如 / 価値判断ミス）に対して、仕様書改定（§2.25.9〜§2.25.14 新設）+ 機械ゲート（`scripts/adv_response_gate.sh` 等）+ 全応答ペルソナレビュー（必須 3 + 追加候補 6）の三層防御で対応する方針
- **両案検討:**
  - 案 A（却下・事後記録継続）: §2.25.5 違反自己申告義務だけで対応、再発時に都度記録 → 違反 #1〜#10 の同型再発で機能不全実証
  - 案 B（採用・三層防御）: §2.25.9 PO 作業発生提案の事前ゲート / §2.25.10 違反の事前回避原則 / §2.25.11 応答整合性義務 / §2.25.12 外部権威ソース参照義務 / §2.25.13 ログ出力量制御 / §2.25.14 全応答ペルソナレビュー の 6 節新設
- **判断:** **案 B 採用（PD-111）**。PO 確定方針: 「モデル依存ではなく仕様書 + 機械ゲート依存の設計に倒す」。Opus 4.7 のリテラル化・整合性低下・長コンテキスト劣化が一因の違反パターンを、モデル特性に依存しない構造で抑止する
- **§2.25 拡張内容（全 8 節）:**
  - §2.25.9 PO 作業発生提案の事前ゲート（違反 #6 #7 #8 起源、`adv_response_gate.sh` で機械検査）
  - §2.25.10 違反の事前回避原則（違反 #10 起源、事後記録の免罪符化を禁止）
  - §2.25.11 応答整合性義務（違反 #5 #9 起源、撤回宣言なし方針反転禁止）
  - §2.25.12 外部権威ソース参照義務（公式 docs 一次情報必須、LP-033 と整合）
  - §2.25.13 ログ出力量制御（完了報告 3-5 行以内、subagent 報告 1 行）
  - §2.25.14 全応答ペルソナレビュー（必須 3 + 追加候補 6、CRITICAL 0 / HIGH 0 まで反復、上限 5R）
- **§C1.5 用語 SSOT 拡張:** 8 ペルソナ（LLM アプリケーション設計者 / プロンプトエンジニア / SW PM / SW アーキテクト / QA テストエンジニア / テクニカルライター / セキュリティエンジニア / AI コンサルタント）を追加、SRE は追加候補表に併記
- **新設 LP:** LP-034「事後記録の免罪符化パターン」を `docs/learned-patterns.md` に追加
- **機械ゲート実装計画（Phase 2、ENG 領域）:** `scripts/adv_response_gate.sh` / `scripts/adv_hot_summary.sh` / `scripts/persona_selector.sh` / `scripts/spec_lint_extended.sh` 新設、`~/.claude/settings.json` Stop hook 結線、`logs/adv_violation_gate.log` / `logs/persona_review.log` 出力、fail-closed + PO 専用 `gate_override.flag`
- **着手:** PATCH-G49（MISSION-G49-PKG）として一括実装、Phase 1 仕様追記（ADV 領域）→ Phase 2 機械ゲート実装（ENG 領域）の順
- **パターン:** ADV 行動規範のような「LLM の応答品質に直結する規範」は、事後記録でなく「事前回避 + 機械ゲート + 多視点レビュー」の三層防御で抑止する。同型違反 2 回以上で即時仕様改定の方針
- **関連:** §2.25.1〜§2.25.14 / LP-034 / 違反 #1〜#10 / PATCH-18（§2.25 初版）

---

### PD-112: PO 承認取得前 14 票投票機構新設（10 ペルソナ + GPT/Gemini 重み 2、§2.25.23 機械化）
- **事例:** Desktop Code ADV G_49（2026-04-25）。PO 提案: 「承認取得前に 10 ペルソナ + GPT + Gemini で多数決、票差 4 以下で PO 承認取得、GPT/Gemini は各 2 票分の重み」。§2.25.14 全応答ペルソナレビュー（必須 3 + 追加候補 6）は応答品質ゲートとして機能するが、PO への承認質問発信前の「拮抗 / 圧倒的」判定は別レイヤとして必要。LLM 単体判断のリスク回避バイアス（§2.25.4）と過剰承認質問（§2.25.9 違反）を構造的に抑止する目的
- **両案検討:**
  - 案 A（却下・既存 §2.25.14 だけで対応）: 必須 3 + 追加候補 6 のレビューを通過した応答をそのまま PO に送る → §2.25.3 該当判定が ADV 単体の主観判断に依存、過剰承認質問の再発リスク
  - 案 B（採用・14 票投票機構新設）: 内部 10 ペルソナ × 各 1 票 + GPT-5.4 × 2 票 + Gemini 3.1 Pro × 2 票 = 計 14 票で多数決、票差 ≤ 4 で PO 承認取得 / ≥ 5 で ADV 自律。外部 AI に重み 2 を与える根拠は (a) 訓練データ独立性、(b) 一致時のアラインメント信号強化、(c) PO 提案で確定済
- **判断:** **案 B 採用（PD-112）**。10 ペルソナ目（データガバナンス専門家）を §2.25.14.7 / §2.25.14.3 に追加し、SSoT / バックアップ戦略 / バージョン管理 / 監査ログ整合性 / データ整合性の評価視点を担保。判定式は `margin = |FOR - AGAINST|`、ABSTAIN は分母に含めず。月次上限 \$30 / 日次 \$5（既存 `external_review_guardrail.sh` 共有）到達時は内部 10 ペルソナのみで fallback、閾値も再計算（margin ≤ 3 → 拮抗）
- **§2.25.23 構成（全 8 サブ節）:**
  - §2.25.23.1 適用範囲（§2.25.15 該当時のみ、非該当時は §2.25.14 単独で完結）
  - §2.25.23.2 投票配分（10 ペルソナ + GPT 2 票 + Gemini 2 票 = 14 票、表）
  - §2.25.23.3 判定式（margin ≤ 4 拮抗 / ≥ 5 圧倒的、ABSTAIN 除外、few-shot 4 例）
  - §2.25.23.4 投票プロセス（5 ステップ）
  - §2.25.23.5 ガードレール（共有上限、月次上限時 10 票 fallback）
  - §2.25.23.6 ログ運用（`logs/vote_log.log` TAB 8 列、週次 1MB rotate、4 週間保持）
  - §2.25.23.7 §2.25.14 / §2.25.15 との関係（実行順序明示）
  - §2.25.23.8 機械チェック（exit 0/2 で呼出側 ADV に伝播）
- **新設スクリプト:** `scripts/vote_dispatcher.sh`（POSIX sh、`set -eu`）、`scripts/persona_vote.sh`（10 ペルソナ別 grep ベース簡易判定 MVP）、`scripts/ai_review.js` runVoteMode（`--mode=vote --provider=gpt5|gemini`、FOR/AGAINST/ABSTAIN のみ出力）
- **§2.25.14 拡張:** §2.25.14.3 追加候補表に「データガバナンス専門家」を 7 番目として追加、追加候補上限 3→4（必須 3 + 追加 7 = 全 10 ペルソナ表現可能）。§2.25.14.7 ペルソナ定義詳細にも追加。`scripts/persona_selector.sh` 拡張（trigger: 「SSoT」「バックアップ」「git」「監査ログ」「データ整合」「バージョン管理」、`head -3` → `head -4`）
- **着手:** PATCH-G49-VOTE として `lais/verify/dev_system_v34_patches.md` 末尾に追記、本 PD-112 を §2.25.23 の出典として記録
- **パターン:** PO への承認質問は「LLM 単体判断 → 14 票機械集計 → 拮抗時のみ PO 介入」の 2 段階フィルタで構造化する。同型過剰承認質問が 2 回以上発生する領域は §2.25.23 の対象に追加する方針
- **関連:** §2.25.14 / §2.25.15 / §2.25.23 / PD-111 / PATCH-G49-VOTE / `external_review_guardrail.sh` / `vote_dispatcher.sh` / `persona_vote.sh` / `ai_review.js` runVoteMode

---

## 抽出メタ情報
- **初回抽出:** G_39セッション (2026-04-15)
- **情報源:** session_progress.md G_38-39のPO判断記録 + session_history.md
