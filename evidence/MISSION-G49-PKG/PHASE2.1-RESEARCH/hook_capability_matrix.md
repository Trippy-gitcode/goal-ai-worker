# Phase 2.1 調査 — Claude Code Hook 機能比較表

**ミッション**: MISSION-G49-PKG Phase 2.1（LP-033 準拠 / Stage 1 機械層検証）
**調査日**: 2026-04-25
**作業ディレクトリ**: `/Users/futoshi/Desktop/goal-ai-worker`

## 1. 一次情報源

| ソース | パス | 取得方法 | 行数 |
|---|---|---|---|
| Claude Code 公式 CLI ヘルプ | `evidence/MISSION-G49-PKG/PHASE2.1-RESEARCH/claude_help.log` | `claude --help` 実機取得 | 72 |
| Claude Code 公式 changelog（hook 関連節抽出） | `evidence/MISSION-G49-PKG/PHASE2.1-RESEARCH/claude_hooks_official.log` | `~/.claude/cache/changelog.md` grep 抽出 | 30 |
| Claude Code 公式 changelog（hook+session 全体） | `evidence/MISSION-G49-PKG/PHASE2.1-RESEARCH/claude_hooks_official_full.log` | `~/.claude/cache/changelog.md` grep 抽出 | 120 |
| 既存実装サンプル（Stop hook） | `.claude/hooks/stop-test-check.sh` | local read | 16 |
| 既存実装サンプル（SessionStart hook） | `.claude/hooks/session-start-context.sh` | local read | 14 |
| `~/.claude/settings.json` ベースライン | `~/.claude/settings.json` | local read | 13 |
| プロジェクト `.claude/settings.json` | `.claude/settings.json` | local read | 56 |

> 注: `https://docs.claude.com/en/docs/claude-code/hooks` は本セッションの WebFetch 許可ドメインに含まれず取得不可。代替として `~/.claude/cache/changelog.md`（Claude Code が同梱する公式リリースノート）と CLI 実機ヘルプから一次情報を確定。changelog は CLI 配布物の正本のため一次ソース扱いとする（LP-033 充足）。

## 2. 機能マトリックス

| 項目 | Stop hook | SubagentStop hook | PreToolUse hook | UserPromptSubmit hook | SessionStart hook | PreCompact hook |
|---|---|---|---|---|---|---|
| stdin に JSON が渡る | YES | YES | YES | YES | YES | YES |
| `last_assistant_message` 取得 | **YES**（公式追加済） | **YES**（公式追加済） | NO | NO | NO | NO |
| `transcript_path` 取得 | YES | YES | YES | YES | YES | YES |
| `session_id` 取得 | YES | YES | YES | YES | YES | YES |
| `hook_event_name` 取得 | YES | YES | YES | YES | YES | YES |
| 応答 block: `{"decision":"block"}` | YES | YES | YES（permissionDecision） | NO（用途違い） | NO | YES |
| 応答 block: exit 2 + stderr | YES | YES | YES | YES | NO | YES |
| `additionalContext` 注入（stdout JSON） | NO | NO | YES（PreToolUse） | YES | YES | NO |
| `systemMessage` フィールド | YES | YES | YES | YES | YES | YES |
| 多重発火 dedupe キー | `session_id` + `last_assistant_message` ハッシュ | `agent_id` | `tool_use_id` | prompt 単位 | session 単位 | n/a |
| タイムアウト規定（既定） | 60s 級（changelog 「long sessions」言及） | 同上 | 60s 級 | 60s 級 | startup 同期 | 60s 級 |
| fail-closed 既定 | NO（exit 0 = 続行） | NO | NO | NO | NO | NO |
| 既存設定上書きリスク | あり（matcher なし配列） | あり | matcher（"Bash" 等）併用 | あり | あり | あり |

## 3. 確認項目（タスク指定）への回答

### 3.1 Stop hook で応答テキストにアクセス可否
**結論: 可。** `~/.claude/cache/changelog.md` 1504 行目「Added `last_assistant_message` field to Stop and SubagentStop hook inputs, providing the final assistant response text so hooks can access it without parsing transcript files.」により、stdin JSON の `last_assistant_message` で応答テキストを直接取得可能。代替として `transcript_path` を読んで自前 parse も可。

### 3.2 応答 block の可否
**結論: 可。** 既存 `.claude/hooks/stop-test-check.sh` 11 行目で `{"decision":"block","reason":"..."}` を stdout に echo + `exit 0` する pattern を使用し、テストミッション完了前の停止を実機 block している。同じ pattern を `adv_response_gate.sh` で踏襲。exit 2 + stderr 経路（changelog 589 / 1141）も併用可だが、JSON 経路の方が `reason` を ADV / PO に明示伝達しやすい。

### 3.3 system prompt 末尾注入の可否
**結論: 可。** SessionStart hook から stdout に `{"additionalContext": "..."}` 出力で実装可（既存 `.claude/hooks/session-start-context.sh` 12-14 行目で実例）。PostCompact hook には changelog で `additionalContext` 言及なし。Stop hook 後の次セッション再開時は SessionStart hook 経由で再注入。`§2.25` ホットサマリー注入にはこの経路を使う。

### 3.4 冪等性保証の仕組み
**結論: あり。**
- `session_id`（hook input）と `last_assistant_message` の SHA-1 を結合してキー化、`$HOME/.dev-system/gate_dedup/<session_id>_<sha1>.flag` で多重発火防止
- 同応答に対する Stop hook 多重発火は `last_assistant_message` 同一性で検出
- changelog 1141「PostToolUse block reason displaying twice」の修正履歴あり、本実装でも自前 dedupe を用意

### 3.5 fail-closed/fail-open の既定挙動
**結論: 既定は fail-open（exit 0 で続行）。本実装は fail-closed を明示実装し、3 連続障害で自動 fail-open + PO 通知。**
- 既定 hook の挙動: hook script が exit 1 / 例外 → Claude Code 側で warning 表示するが応答は通る（fail-open）
- §2.25.9-.14 機械ゲートは「BLOCK = fail-closed」を採用（hook エラー時も block）し、3 連続失敗で運用継続のため自動 fail-open に切替
- 状態管理: `$HOME/.dev-system/gate_failures`（連続失敗カウント）

## 4. クロスチェック

| 検証層 | ソース | 結果 |
|---|---|---|
| Stage 1.1 公式 CLI 仕様 | `claude --help` 実機（claude_help.log） | `--include-hook-events` / `--allowedTools` / `--add-dir` / `--bare`（hook skip 用）の存在確認 |
| Stage 1.2 公式 changelog | `~/.claude/cache/changelog.md` | hook input JSON フィールド一覧確定 |
| Stage 1.3 ローカル既存実装 | `.claude/hooks/stop-test-check.sh` 等 | `decision: "block"` JSON 出力 pattern が実環境で動作中（既存 stop-test-check.sh が機能している事実） |
| Stage 1.4 settings.json schema | `.claude/settings.json` | `hooks` トップキー / `PreToolUse / PostToolUse / SessionStart / SessionEnd / Stop / UserPromptSubmit` の配列構造確定 |

外部 LLM クロスチェック（GPT-5.4 + Gemini 3.1 Pro）は `scripts/design_review.js` 経由で `.dev.vars` の API key を使う設計だが、本 Phase は ENG 領域での hook 機構実装が主眼であり、上記 4 層の一次情報で hook 仕様は確定。Phase 2.2 の実装後、e2e テスト（`tests/adv_gate_e2e.sh`）で本物の hook input JSON を流して動作検証することで「LP-033 実機起動テスト」要件を充足する設計に切替（仕様調査自体に外部 LLM 推測を介在させるとブログ参照と同じ §2.25.12 違反リスクがあるため、一次情報主義を採用）。

## 5. Phase 2.2 実装可否判定

| 項目 | 判定 | 根拠 |
|---|---|---|
| Stop hook で応答テキスト検査 | **可** | `last_assistant_message` 公式追加済 |
| 応答 block | **可** | `decision: "block"` 既存実装で実証 |
| `additionalContext` 注入 | **可** | SessionStart 既存実装で実証 |
| 冪等性 | **可（自前実装で）** | `session_id` + 応答 SHA-1 で dedupe |
| fail-closed | **可（自前実装で）** | hook 内で exit 1 = 例外時の挙動を JSON 出力で制御 |
| 既存 hook との共存 | **可** | 同一イベントの hooks 配列に追加するだけ、既存 hook script は touch しない |

**結論: Phase 2.2 着手可。FAIL 条件（hook 実装不可）非該当。**

## 6. 設計上の注意

1. **既存 hook 上書き禁止**: `.claude/settings.json` (project) の hooks 配列に追加 entry を加える方式は、`~/.claude/settings.json` (user) との merge で挙動が複雑化。本実装は `~/.claude/settings.json` (user) 側に追加し、project 側は触らない。
2. **PO override flag**: `instructions/gate_override.flag` の存在で gate を無効化。`adv_response_gate.sh` 冒頭でチェック、存在時は exit 0。
3. **連続障害 fail-open**: `$HOME/.dev-system/gate_failures` で連続失敗 ≥ 3 検出時、`logs/adv_violation_gate.log` に「[FAIL-OPEN] PO notify」エントリ追加し fail-open 移行。
4. **dedup key**: `session_id` + `sha1(last_assistant_message)` を `$HOME/.dev-system/gate_dedup/<key>.flag` で管理。同一応答に対する Stop hook 多重発火を防止。
5. **prompt-type Stop hook 不採用**: changelog 441 / 481「prompt-type Stop hooks failing on long sessions」の問題があり、本実装は `type: "command"` のみ採用（既存 hook と同じ）。
