# 失敗対策レポート徹底レビュー（COUNTERMEASURE-FAILURE-REPORT-PERSONA-REVIEW V2）

**作成**: 2026-04-26 / Lais 戦略 subagent V2
**ミッション ID**: COUNTERMEASURE-FAILURE-REPORT-PERSONA-REVIEW V2
**根拠ファイル**: `lais/verify/adv_violation_log.md` / `scripts/adv_response_gate.sh` / `scripts/persona_review_runner.sh` / `scripts/handoff_validator.sh` / `scripts/main_session_writeguard.sh` / `lais/verify/dev_system_v34_package.md` §2.25 / `~/.claude/settings.json` / `~/.claude/cache/changelog.md`

---

## §0 状況 + 14 票結果

### 元レポート（ADV メイン 2026-04-26 提示）の主張要約

「14 違反対策はすべて『仕様書記載 + skill 提供 + 事後 Stop hook 検出』で停止し、PreSend hook で事前 BLOCK を実装すべきだった。応答前ループ完全自動化 / 完了報告に証跡ファイル必須 / PO 向け翻訳機械強制 / 静的レビュー = 完了禁止が本来案。」

### 14 票投票結果（10 ペルソナ + GPT/Gemini 重み 2 票）

- **APPROVE = 0**
- **REVISE = 14**（全ペルソナ + 外部重み合算、方向一致）
- **REJECT = 0**
- **ABSTAIN = 0**

**判定: REVISE = 修正必要**（元レポートは方向性として正しいが事実誤認・抜け・不正確を多数含み、修正版が必要）。REJECT 過半でないため全面書直し不要、しかし APPROVE もゼロのため原文そのままの提示は不可。

### 主要な事実確認結果（本レビューで一次検証済）

1. **「PreSend hook」は Claude Code 公式 hook event に存在しない**（`~/.claude/cache/changelog.md` で grep 確認、実在 hook は 12 種: PreToolUse / PostToolUse / UserPromptSubmit / SessionStart / SessionEnd / Stop / SubagentStop / StopFailure / Notification / PreCompact / TeammateIdle / TaskCompleted）。元レポートは PreSend 不在を認めながら同一文書内で「PreSend hook で事前 BLOCK」を本来案に掲げる **自己矛盾** を含む。
2. **`scripts/handoff_validator.sh` は WARN のみ、BLOCK 出力なし、settings.json への hook 結線なし**（独立呼出ツール、コード Read 確認済）。元レポートの主張は事実。
3. **`scripts/persona_review_runner.sh` および `scripts/persona_vote.sh` は claude -p 実装済だが、`~/.claude/settings.json` に結線なし**（grep 確認済）= 機械強制ループ未到達、ADV メイン任意呼出依存。元レポートの主張は事実。
4. **`scripts/adv_response_gate.sh` は Stop / SubagentStop hook 結線（settings.json 確認済）= 応答完了後の事後検出**。`{"decision":"block"}` 出力は応答終了後の続行ターン誘発であり「送信前阻止」ではない（PO は違反応答を既に視認済）。元レポートの主張は事実。
5. **違反 #13 は `lais/verify/adv_violation_log.md` に項立てなし**（#11 → #12 → #14、#13 空番、grep 確認済）。元レポートが対策表に #13 を計上しつつ違反ログに記録なしは **整合性破綻**、修正版で扱い変更必須。
6. **`scripts/main_session_writeguard.sh` は PreToolUse Edit|Write|MultiEdit|NotebookEdit matcher で BLOCK 機能あり**（settings.json 結線 + コード Read 確認済）= 「ファイル書込前 BLOCK」は実装済、ただし「応答テキスト送信前 BLOCK」とは別レイヤー。

---

## §1 ペルソナ別批判（10 件）

### 1.1 solo_dev（VERDICT=REVISE）

- FACT_ERRORS: PreSend hook 不在を認めつつ「PreSend hook で事前 BLOCK」を本来案に掲げる自己矛盾。Claude Code 標準 hook 列の主張は公式 docs 未照合。UserPromptSubmit hook は decision:block で事前停止可能の可能性。
- GAPS: 1 人開発の API コスト視点欠如（claude -p 6 並列の月額試算ゼロ）。ROI 評価なし。代替案（単一強化プロンプト / ペルソナ削減 / 人手レビュー）対比なし。
- IMPRECISIONS: 「skill 機械化」は誤用、呼出主体が ADV 自己依存である以上「機械化」と呼べない。「LLM の行動変容なし」は違反率の前後計測データを伴わず印象論。違反 #13 をログ欠番と書きつつ「暗号略称 grep 検証なし」事象として扱うのは原因と現象の混在。
- IMPROVEMENTS: ガバナンス層を縮約し「違反検出 → プロンプト本体改訂」1 経路に統合し保守コスト 1/10 を狙う。claude -p 並列度を 6→2 に削減。1 人開発スコープでは ADV/PO ロールプレイ自体の撤廃可否を再評価。
- HIDDEN_ROOT_CAUSE: 1 人開発にエンタープライズ級ガバナンスを積んでおりプロダクト価値より統制コストが上回る本末転倒。LLM の確率的出力を決定論的 hook で完全制御する前提が破綻、停止より受容（リトライ + 差分修正）設計が未検討。

### 1.2 devops_engineer（VERDICT=REVISE）

- FACT_ERRORS: hook 種別の挙動評価は公式引用無しで断定不可。handoff_validator が WARN 止まりかは設定値依存で hook 種別の問題ではなく exit code 設計の問題。"PreSend" hook 不在の主張も公式ドキュメント引用無しで断定不可（但し本レビューで grep 確認済 = 不在は事実）。
- GAPS: hook 自体の CI 自己テスト・リグレッション検知が未言及。false positive 時の break-glass / バイパス手順とその監査ログ設計欠落。hook 発火率・BLOCK 率・誤検知率の SRE 観測（SLO/メトリクス）設計が無い。
- IMPRECISIONS: 「事前 BLOCK」の対象が応答テキストか tool 呼び出しか未定義。「証跡ファイル必須」のスキーマ・保存先・改竄防止（hash chain）・保持期間が未指定。「静的レビュー禁止」は粒度過大で正当用途まで遮断するため範囲条件が必要。
- IMPROVEMENTS: hook 三層防御（構文 / 意味 / 事後監査）に責務分離して再設計。証跡を JSON Schema 化し session_progress.md と SHA-256 で連結する append-only ledger 化。hook を契約テスト（given-when-then）で CI に固定し dev-system v3.4 宣言との差分検知。BLOCK 時の自動 incident 起票 + 二者承認の解除ワークフロー追加。
- HIDDEN_ROOT_CAUSE: 存在有無未検証の capability primitive を前提に設計したため「プロセス文書 → skill → 事後 hook」の緩い積層に退化 — 実行可能仕様（executable spec）不在で宣言と実装が乖離する構造。ADV プロトコル違反の真因は hook 不足ではなく「完了」判定の機械可読基準未定義。

### 1.3 qa_lead（VERDICT=REVISE）

- FACT_ERRORS: 公式 hook event 一覧に StopFailure / TaskCompleted / TeammateIdle は存在しないと主張、しかし本レビュー grep で **存在確認済** = この指摘は **誤り**。Stop hook の入力フィールドに `last_assistant_message` が存在（changelog L1504 で確認済）= この指摘も誤り。違反 #13 の扱いについて「ログ上空番」と「#13 を暗号略称 grep 検証なしと扱う」が同一レポート内で矛盾し、どちらが事実か未確定 = 修正必須論点。
- GAPS: テスト戦略の欠落（UserPromptSubmit / Stop hook を応答前 BLOCK として代替活用する PoC・回帰テスト計画が未提示）。証跡（evidence pack）の保存先・命名規約・保持期間・監査者レビュー手順が未定義。違反 #1〜#14 の再発検出のための回帰テストスイート（各違反シナリオの再現テストケース）が未整備。
- IMPRECISIONS: Stop hook block 後の再生成が事前ブロック相当に機能するかの定量評価未実施。
- IMPROVEMENTS: 14 違反を「hook イベント × 検出/強制ポイント × 証跡」のマトリクスで再整理し各セルに DoD と担当・工数を付与。
- HIDDEN_ROOT_CAUSE: 違反ログ自体の改竄/欠落を独立検出する attestation（hash chain / 署名）不在。

### 1.4 tech_writer（VERDICT=REVISE）

- FACT_ERRORS: Claude Code 公式 hook event の存否一覧の主張に StopFailure / TaskCompleted / TeammateIdle 不在と書いたが、本レビュー grep で **実在確認済** = この指摘は誤り。Stop hook 入力 last_assistant_message も実在（changelog L1504 確認済）。「応答前 BLOCK 不可」は言い切り過ぎ、UserPromptSubmit + SubagentStop + 出力テンプレート強制による事前阻止構成は未確認だが排除できない。
- GAPS: 違反 #13 の空番をログ側で埋める修復手順が未記載。「証跡ファイル必須」の証跡スキーマ（path / 必須フィールド / 検証 hook）未定義。PreSend 相当不在への代替アーキテクチャ移行計画が無い。
- IMPRECISIONS: 「事前 BLOCK 未到達」の「事前」定義が未擦り合わせ。「PO 向け翻訳機械強制」の入力/出力境界が未定義。「静的レビュー = 完了禁止」の完了条件（実機 smoke 合否判定基準）が未明記。
- IMPROVEMENTS: 表ヘッダに区切り行を入れ Markdown 表として正規化、§2.25 用語集に skill/hook/gate/validator を SSoT 集約。「共通の間違い」を 根本原因→再発条件→検知点 の 3 列表に再構成。違反 #13 空番を埋める ADR を adv_violation_log.md に追補し本レポートから相互リンク。
- HIDDEN_ROOT_CAUSE: Claude Code hook モデルに「応答送信前」フェーズが存在しない構造的制約を、仕様書が PreSend 相当在る前提で書き続けている設計不整合。機械強制と ADV 自己呼出の責務分離が未確立で settings.json 結線有無が仕様レビュー対象外になっている。

### 1.5 ai_ops（VERDICT=REVISE）

- FACT_ERRORS: hook event 列挙の公式照合未実施（本レビューで照合済）。
- GAPS: モデル別コスト試算なし（claude -p 6 並列 persona_vote の Opus/Sonnet/Haiku 単価 × トークン × 頻度の運用コスト見積が皆無、機械強制化すると毎ターン 6 並列で月額爆発リスク）。LLM 自己呼出依存の代替として hook 内で claude CLI を呼ぶ場合の再帰呼出・トークン消費・レイテンシ・タイムアウト設計が未検討。証跡ファイル必須化の保管先・ローテーション・サイズ上限・PII 取扱の Ops 観点欠落。
- IMPRECISIONS: 「LLM の行動変容なし」は違反率の前後計測データを伴わず印象論。
- IMPROVEMENTS: claude -p（外部 CLI）の並列度を 6→2 に削減し進行ペースと API コストを両立。
- HIDDEN_ROOT_CAUSE: hook 内 LLM 自己呼出の再帰リスク（claude -p hook 内呼出 → claude CLI が同 hook 発火 → 再帰）を設計時に考慮していない。

### 1.6 security_engineer（VERDICT=REVISE）

- FACT_ERRORS: hook event 列挙の公式 changelog 未確認（本レビューで照合済）。Stop hook の decision:block 挙動の解釈はドキュメント未確認のため両論あり（事前停止機構か続行ターン誘発か）。違反 #13 のログ欠落主張は対策表の論点に対する直接事実ではなく前提の再確認要。
- GAPS: 秘密情報リスク（証跡ファイル必須化で秘匿情報・トークン・PII がログ混入する経路と redaction 戦略）への言及なし。hook 迂回経路（settings.local.json 上書き / 環境変数 / hook スクリプト改竄・権限）への評価なし。fail-open 設計（スクリプト exit!=0 / タイムアウト / 依存ツール不在時に BLOCK ではなく素通りする既定動作）の監査欠落。
- IMPRECISIONS: 「PreSend hook 未到達 = LLM 行動変容不可」は過度な単純化（Stop + UserPromptSubmit + SubagentStop 組合せでの事前ゲート構築可能性が未評価）。「静的レビュー = 完了禁止」の実装契約が曖昧。「skill が ADV 自己呼出依存」の代替強制条件（PreToolUse matcher 等）が未提示。
- IMPROVEMENTS: Stop hook 多段化を fail-closed 方針で再設計する観点提示。証跡ファイルに secrets scanner / PII redactor をパイプする観点提示。settings 配置の権限・上書き禁止と差分検出の観点提示。
- HIDDEN_ROOT_CAUSE: 信頼境界が LLM 内部に置かれた設計上の TOCTOU（ADV 自己呼出を信頼前提とする責任分界）。違反ログ自体の改竄/欠落を独立検出する attestation（hash chain / 署名）不在。

### 1.7 data_governance_expert（VERDICT=REVISE）

- FACT_ERRORS: Claude Code hook 仕様の event 列挙は当方未確認、公式 changelog 引用元提示なし（本レビューで照合済）。Stop hook decision:block 挙動説明も当方未確認、実装ソース引用元提示なし。違反 #13 空番主張はレポート内根拠提示なしで本批判も当該ログ未読のため検証未確認（本レビューで grep 確認済 = 空番は事実）。
- GAPS: RACI 不在（PreSend 不在の代替統制について R/A/C/I 未定義、違反検出時の Accountable が PO か ADV か不明）。監査証跡の完全性要件欠落（hook 実行ログ・persona_vote 結果・handoff_validator WARN の保全期間 / 改ざん検知 / WORM 化方針なし）。証跡ファイル必須化の具体仕様欠落（命名規約・ハッシュ連鎖・タイムスタンプ source・保管 SSoT 未定義）。
- IMPRECISIONS: 監査者の独立性（ADV 自己レビューを排し外部監査者が検証）要件未提示。
- IMPROVEMENTS: 監査ログを WORM ストレージ（append-only）化し、SHA-256 chain で改ざん検知、月次で外部監査者がレビュー。RACI チャートを §2.25 に明記。
- HIDDEN_ROOT_CAUSE: ガバナンス設計の三線防衛（1 線=ADV 自己統制 / 2 線=hook 機械強制 / 3 線=外部監査）のうち 1 線のみで運用、2 線の hook 結線も未配線、3 線の外部監査も未設計。

### 1.8 violation_pattern_analyst（VERDICT=REVISE）

- FACT_ERRORS: Claude Code 公式 hook event に StopFailure / TaskCompleted / TeammateIdle は存在しないと主張、しかし本レビュー grep で **存在確認済** = この指摘は誤り。persona_vote の実体は persona_review_runner.sh と混同しているが、別物（vote = 14 票投票 / review = 6 ペルソナ応答前レビュー）。違反 #13 が「ログ空番」と「#13 を grep 検証なしで扱う」が両立しており、原文の自己矛盾を事実として併記している。
- GAPS: PreToolUse hook で応答経路を Task 経由に強制し送信前にゲートする代替設計の検討が無い。違反 #7/#9/#10 の対策と失敗理由が表から完全欠落（14 件中 6 件のみ記載）。「証跡ファイル必須」「PO 向け翻訳機械強制」の具体実装ポイント（どの hook / どのファイル / どの exit code）が未定義。
- IMPRECISIONS: 「PreSend hook 事前 BLOCK 未到達」は PreSend が存在しない以上「未到達」でなく「設計前提誤り」と表現すべき。「LLM の行動変容なし」は定量根拠（違反再発回数 / ログ件数）なしの断定。「静的レビュー = 完了禁止」は静的レビューの定義（lint か仕様適合か）が曖昧で運用基準にならない。
- IMPROVEMENTS: 応答テキストを Task tool 経由で生成させ PreToolUse(Task) で仕様適合・証跡有無・PO 翻訳済を機械検証し不適合は exit 2 で BLOCK する構造に置換。Stop hook の {"decision":"block"} を「再生成ループ上限 N 回 + 証跡ファイル必須化」と組み合わせ上限超過で SessionStart に違反サマリ自動注入。違反 #1〜#14 を ID×対策×hook 結線×検証コマンド×再発回数の 5 列マトリクスに正規化し欠番（#7/#9/#10/#13）を明示。
- HIDDEN_ROOT_CAUSE: ADV の応答経路がメイン LLM 直出力のまま hook 介入点を通らない構造のため、どの仕様追加も自己呼出依存に縮退する。違反ログ（adv_violation_log.md）の SSoT 性が壊れており（#13 空番）対策評価そのものが不完全データ上で行われている。

### 1.9 project_management_expert（VERDICT=REVISE）

- FACT_ERRORS: 違反 #13 のログ欠落は事実誤認の可能性あり（原文がログ未記録と認めつつ対策表に #13 を計上、整合性破綻）。Claude Code 公式 hook event 一覧は本セッションで未検証（本レビューで照合済）。「PreSend hook は存在しない」と断じた上で「PreSend hook で事前 BLOCK」を本来案として掲げるのは矛盾（実現手段未提示で提案不能）。
- GAPS: WBS / 工程分解なし（誰が・いつ・何時間で・どの順で実装するか不明、PM 視点で着手不能）。リスク登録簿なし（hook 仕様変更リスク・Stop hook block 連発による無限ループ・PO 体験劣化リスク未評価）。完了基準（DoD）が定性的（「事前 BLOCK」「機械強制」の合格条件・計測方法・smoke 手順未定義、検収不能）。
- IMPRECISIONS: Stop hook の `{"decision":"block"}` 挙動評価が雑。「skill 機械化」と「skill が ADV 自己呼出依存」は同義反復で因果説明になっていない。「静的レビュー = 完了禁止」は対策粒度が粗く運用ルールか hook 強制かが不明。
- IMPROVEMENTS: 14 違反を「hook イベント × 検出/強制ポイント × 証跡」のマトリクスで再整理し各セルに DoD と担当・工数を付与。原文の hook event 列挙を一次情報で再検証するタスクを WBS 冒頭に置きアーキテクチャ提案の前提を確定。違反 #13 のログ補記タスクを最優先（P0）として WBS 先頭に置き依存関係（ログ整備 → 対策表整合 → skill 結線）を明示。
- HIDDEN_ROOT_CAUSE: 対策設計が「仕様書 + skill 提供」で停止し settings.json への hook 結線（運用配線）を完了基準に含めていない組織習慣。違反ログ（SSoT）と対策表が別管理で相互参照されておらず欠番（#13）に気付かないまま対策が先行する整合性ガバナンス不在。

### 1.10 system_design_expert（VERDICT=REVISE）

- FACT_ERRORS: Claude Code hook event の StopFailure / TaskCompleted / TeammateIdle は当方未確認（本レビュー照合では実在）。「応答送信前 BLOCK 不能」断定は UserPromptSubmit 併用余地の検証未実施。違反 #13 ログ欠落の「空番」断定は別節/別ファイル記録の排除検証なし（本レビューでは grep のみで検証 = 空番は事実）。
- GAPS: PreToolUse の Bash/Write/Edit matcher での「証跡ファイル不在 BLOCK」多層防御の論点欠落。Stop hook `{"decision":"block"}` の次ターン強制再生成フロー運用設計の論点欠落。証跡ファイル改ざん耐性（session_id 紐付け・ハッシュ・タイムスタンプ）の論点欠落。
- IMPRECISIONS: 「PreSend 未到達 → 行動変容なし」は過度断定。「skill が ADV 自己呼出依存」は UserPromptSubmit 経由の機械強制可能性を見落とし。「静的レビュー = 完了禁止」表現が曖昧で実機 smoke 必須化の要件として未定式化。
- IMPROVEMENTS: PreToolUse(Bash/Write/Edit) で証跡ファイル不在 BLOCK の多層防御を追加。Stop hook の決定論的再生成ループ（上限 N 回）を運用設計に組込む。
- HIDDEN_ROOT_CAUSE: 応答生成と副作用（証跡ファイル書込）が非同期である設計—応答テキストを副作用の従属物に置く逆転設計が未採用。仕様書・skill・hook の三層が「同一事実の三重記述」で SSoT 不在、裁定機構欠如により違反検知の責務が曖昧。

---

## §2 修正版レポート

### §2.1 確定事実（一次検証済）

| 主張 | 検証元 | 結果 |
|---|---|---|
| 「PreSend」hook が Claude Code 公式に存在するか | `~/.claude/cache/changelog.md` 全期間 grep | **不在**（実在 hook 12 種列挙、PreSend / PreResponse / BeforeAssistant いずれも 0 ヒット） |
| `handoff_validator.sh` が WARN のみで BLOCK 出力なしか | `scripts/handoff_validator.sh` Read | **事実**（exit 1 + WARN テキスト出力、`{"decision":"block"}` 出力なし） |
| `persona_review_runner.sh` / `persona_vote.sh` が settings.json に結線されているか | `~/.claude/settings.json` grep | **未結線**（hook 経由呼出なし、ADV メイン任意呼出のみ） |
| `adv_response_gate.sh` が Stop hook 結線で事後検出か | `~/.claude/settings.json` Read | **事実**（PreToolUse Task\|Agent + Stop hook 結線、Stop は応答完了後発火） |
| 違反 #13 が `lais/verify/adv_violation_log.md` に項立てされているか | `adv_violation_log.md` grep | **未記録**（#11 → #12 → #14、#13 空番） |
| `main_session_writeguard.sh` が PreToolUse で BLOCK 機能ありか | `~/.claude/settings.json` + `scripts/main_session_writeguard.sh` Read | **実装済**（Edit\|Write\|MultiEdit\|NotebookEdit matcher、`{"decision":"block"}` 出力で機能） |

### §2.2 元レポートの修正必要事項（10 ペルソナ集約、優先度順）

#### Critical（事実誤認・矛盾）

1. **PreSend hook の自己矛盾**: 元レポートが「PreSend hook 事前 BLOCK 未到達」と「PreSend hook で事前 BLOCK すべき」を併記。実在しない hook を本来案にしているため修正必須。**正しくは「PreToolUse(Task/Bash/Write) + UserPromptSubmit + Stop の組合せ多層防御」と表現**。
2. **違反 #13 整合性破綻**: 元レポート対策表に「#13 = §2.25.6/.21.2 + skill / 暗号略称 grep 機械検証なし」と計上、しかし `adv_violation_log.md` に違反 #13 の項立てなし。**対策表から #13 を除外、または #13 ログを補記してから再提示**。
3. **「事後 Stop hook 検出」の表現粒度不足**: Stop hook の `{"decision":"block"}` は応答完了後の続行ターン誘発であり、再生成ループ上限を組合せれば事実上の事前阻止に転化可能。**「事後検出」一刀両断ではなく「Stop hook + 再生成ループ + 証跡必須」の運用設計を併記**。

#### High（抜け）

4. **違反 #7 / #9 / #10 の対策表欠落**: 14 違反のうち #1〜#5 / #6 / #8 / #11 / #12 / #13 / #14 のみ計上、#7（PO に CLI 窓開強要）/ #9（独断新フロー）/ #10（反省装置化）が表から欠落。**14 件すべて網羅した修正版マトリクス必要**。
5. **コスト見積欠落**: claude -p 6 並列 persona_review_runner を毎応答前に機械強制した場合の月額試算ゼロ。AI Ops 視点で **月額爆発リスクの定量見積（Opus/Sonnet/Haiku 単価 × トークン × 応答頻度）** を本来案の前提として提示すべき。
6. **WBS / DoD / リスク登録簿欠落**: PM 視点で「誰が・いつ・どの順で実装するか」「合格基準」「リスク」が定性的で着手不能。**修正版で WBS + 検収コマンド + リスク登録簿を付帯**。
7. **証跡スキーマ欠落**: 「完了報告に証跡ファイル必須」と提案するが、ファイル名規約 / 必須フィールド / ハッシュ連鎖 / 保管 SSoT / PII redaction が未定義。**修正版で JSON Schema + append-only ledger + SHA-256 chain を併記**。
8. **hook 迂回経路 / fail-open リスク評価欠落**: settings.local.json 上書き、環境変数、hook スクリプト改竄、依存ツール不在時の素通りなどの監査が無い。**セキュリティ視点での迂回経路一覧と対策を併記**。

#### Medium（不正確）

9. **「skill 機械化」表現の誤用**: skill は ADV メイン任意呼出依存 = 機械化していない。**「skill 提供（ADV 任意呼出、機械強制なし）」と表現を厳密化**。
10. **「LLM の行動変容なし」の定量根拠欠如**: 違反再発回数 / ログ件数 / 期間別分布の定量データを伴わない印象論。**修正版で違反 #1〜#14 の発生日付分布 + 同型再発回数を集計表で提示**。
11. **「静的レビュー = 完了禁止」の粒度不足**: 静的レビューの定義（lint / 仕様適合 / コード解析）が曖昧。**「Phase 完了 = 実機 smoke PASS 必須、静的レビューのみは部分完了として扱う」と厳密化**（既に違反 #14 で §2.25.21.4 + sub_testing.md §9 で実装済）。

### §2.3 修正版「14 違反 × 対策 × hook 結線」マトリクス

| # | 違反種別 | 対策（仕様書） | 機械強制（hook） | 結線状態 | 失敗理由 |
|---|---|---|---|---|---|
| #1 | 勝手な命名 | §2.25.7 | (未配線) | × | spec のみ、hook 結線なし |
| #2 | 仕様書未確認制約 | §2.25.1+.2 | adv-check skill | × | skill 任意呼出 |
| #3 | PO 委譲 | §2.25.3 | adv-check skill | × | skill 任意呼出 |
| #4 | リスク回避 | §2.25.4 | (未配線) | × | spec のみ |
| #5 | 冗長応答 | §2.25.6 | (未配線) | × | spec のみ |
| #6 | 着手順序 PO 委譲 | §2.25.3+.9 | adv_response_gate | △ | Stop hook 事後検出 |
| #7 | CLI 窓強要 | §2.25.6 + 設計原則 2 | (未配線) | × | spec のみ |
| #8 | タイミング委譲 | §2.25.3+.9 | adv_response_gate | △ | Stop hook 事後検出 |
| #9 | 独断新フロー | §2.25.7+.9 | adv_response_gate | △ | Stop hook 事後検出 |
| #10 | 反省装置化 | §2.25.10 | adv_response_gate | △ | Stop hook 事後検出 |
| #11 | 仕様書未読 | §2.25.0+.16.6 | handoff_validator | × | WARN のみ、結線なし |
| #12 | persona 機構形骸化 | §2.25.14+.23 | persona_review_runner | × | 結線なし、ADV 任意呼出 |
| #13 | (ログ未記録、暗号略称 grep) | (空番) | - | - | **元レポート計上要再検討** |
| #14 | 実機未検証 Phase 完了 | §2.25.21.4 + sub_testing.md §9 | adv_response_gate Phase 完了 grep | △ | Stop hook 事後検出 |

凡例: × = 未配線 / △ = Stop hook 事後検出のみ / ○ = PreToolUse / UserPromptSubmit 等で事前阻止

### §2.4 修正版「本来すべきだったこと」（PreSend 不在を踏まえた現実解）

1. **PreToolUse(Task/Bash/Write/Edit) hook で事前 BLOCK の多層防御**:
   - ADV の応答経路を「Task tool 経由生成」に強制し、PreToolUse(Task) で仕様適合・証跡有無・PO 翻訳済を機械検証 → 不適合は exit 2 で BLOCK
   - PreToolUse(Write/Edit) では証跡ファイル不在で BLOCK（main_session_writeguard.sh 拡張）
2. **UserPromptSubmit hook で違反パターン事前注入**:
   - PO 投稿直後の hook で過去違反トップ 5 を additionalContext に注入し、応答生成前の context に違反回避リマインダを強制
3. **Stop hook + 再生成ループ上限 + 証跡ファイル必須化**:
   - Stop hook で `{"decision":"block"}` 出力時に再生成ループ上限 N 回を運用設計に明記
   - 上限超過時は SessionStart hook で違反サマリを自動注入（次セッションでの再発防止）
   - 完了報告には JSON Schema 化された証跡ファイル（session_id / response_id / 検証結果 / SHA-256 chain）必須
4. **persona_review_runner.sh の hook 結線**:
   - settings.json に Stop hook で persona_review_runner.sh を結線（claude -p 6 並列 → APPROVE/REVISE/REJECT 多数決 → REJECT 時 BLOCK）
   - **コスト制御**: 並列度 6→2 に削減、Haiku モデル指定でトークンコスト 1/10 以下、応答頻度サンプリング（10 応答に 1 回フル実行 + 残り 9 回は軽量パターンマッチ）
5. **PO 向け翻訳機械強制**:
   - Stop hook で「暗号略称（vote_id / FOR/AGAINST 数字 / §2.25.X / PD-N）」grep → 検出時 BLOCK
   - 5 行サマリーの Markdown テンプレ強制 + PO 向け平易語彙への自動変換
6. **静的レビュー = 完了禁止**（既に §2.25.21.4 + sub_testing.md §9 + adv_response_gate Phase 完了 grep で実装済）:
   - 維持 + 拡張: PreToolUse(Bash) で `git commit` 実行前に smoke ログ PASS 確認 → 不在で BLOCK

### §2.5 修正版が要求する追加作業（PO 向け WBS 案）

1. **P0**: 違反 #13 のログ補記または対策表からの削除（30 分、ADV 直接書込）
2. **P0**: 14 違反全件のマトリクス再整理（#7/#9/#10 を追加、2 時間、Lais subagent）
3. **P1**: settings.json への persona_review_runner.sh 結線（30 分、ADV メイン編集 + ADV 任意確認）
4. **P1**: コスト見積（claude -p 6 並列 月額試算、AI Ops 視点で Opus/Sonnet/Haiku 単価 × トークン × 頻度、1 時間、Lais subagent）
5. **P1**: WBS + DoD + リスク登録簿の作成（4 時間、PM Lais subagent）
6. **P2**: 証跡 JSON Schema 設計 + SHA-256 chain 実装（6 時間、DevOps Lais subagent）
7. **P2**: hook 迂回経路の監査と fail-closed 化（4 時間、Security Lais subagent）

合計: 17.5 時間 (P0=2.5h / P1=5.5h / P2=10h)

---

## §3 PO 向け 5 行サマリー

1. やったこと: 元レポートを 10 専門家視点で徹底批判、14 票で判定。
2. 結果: 全員「修正必要」と判定（一致）、原文そのまま提示は不可。
3. 主な誤り: 存在しない hook（PreSend）を本来案に書いた、違反ログに記録のないものを対策表に計上、コスト見積なし。
4. 修正の方向: 既存 hook（PreToolUse / UserPromptSubmit / Stop の組合せ）で多層防御に再設計、コスト試算と作業計画を併記。
5. 次: ADV メインが本修正版を確認 → コストとリスクを踏まえて実装方針を確定。

---

## 付録 A. 検証コマンド（再現可能性）

```sh
# A1. PreSend hook 不在確認
grep -oE "(PreSend|PreResponse|BeforeAssistant)" ~/.claude/cache/changelog.md | wc -l
# → 0 (不在確定)

# A2. 実在 hook 一覧
grep -oE "(PreToolUse|PostToolUse|UserPromptSubmit|SessionStart|SessionEnd|Stop|SubagentStop|StopFailure|Notification|PreCompact|TeammateIdle|TaskCompleted)" ~/.claude/cache/changelog.md | sort -u

# A3. 違反 #13 ログ確認
grep -n "^### 違反 #" /Users/futoshi/Desktop/goal-ai-worker/lais/verify/adv_violation_log.md

# A4. handoff_validator BLOCK 出力なし確認
grep -n "decision.*block\|exit 1\|exit 2" /Users/futoshi/Desktop/goal-ai-worker/scripts/handoff_validator.sh

# A5. persona_review_runner 結線確認
grep -n "persona_review_runner\|persona_vote\|vote_dispatcher" ~/.claude/settings.json
# → ヒット 0 (結線なし)

# A6. adv_response_gate 結線箇所確認
grep -n "adv_response_gate\|Stop\|PreToolUse" ~/.claude/settings.json
```

---

**完了**: 2026-04-26 / countermeasure_report_review_2026-04-26.md
