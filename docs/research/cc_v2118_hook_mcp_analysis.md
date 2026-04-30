# Claude Code v2.1.118 フック→MCP ツール直接起動 調査・実装可否提案書

- **MISSION-ID**: CC-V2118-HOOK-MCP-RESEARCH
- **作成日**: 2026-04-23
- **作成**: ADV subagent（Sub-ADV, /Users/futoshi/Desktop/goal-ai-worker）
- **対象機能**: Claude Code v2.1.118 で追加された `"type": "mcp_tool"` フックハンドラ
- **ステータス**: 提案（実装未着手）

> 本提案書は調査と設計書作成のみを目的とし、`.claude/hooks/` および `.claude/settings.json` には一切変更を加えていない。

---

## §0 プリフライトログ

| No. | コマンド | 実行結果 | 判定 |
| --- | --- | --- | --- |
| v1 | `claude --version` | `2.1.119 (Claude Code)` | PASS（≥ v2.1.118） |
| v2 | `find .claude -type f \( -name "*.json" -o -name "*.sh" \) \| wc -l` | `8`（hooks 6 + settings.json 1 + settings.local.json 1） | PASS |
| v3 | `grep -rcE "PostToolUse\|PreToolUse\|Stop\|SessionStart\|SubagentStop" .claude/` | `settings.json:4`, `session-start-context.sh:1`, `post-test-antipattern.sh:1`, `stop-test-check.sh:1`, `pre-deploy-gate.sh:1`（合計 8 件・5 イベント種別） | PASS |

補助確認:
- `claude mcp list` → **`No MCP servers configured. Use claude mcp add to add a server.`**（現時点で MCP サーバーゼロ）
- 作業ディレクトリ: `/Users/futoshi/Desktop/goal-ai-worker`
- git HEAD ブランチ: （記録時点の作業ブランチ。`git branch --show-current` 参照）

**FAIL 条件チェック**:
- Claude Code v2.1.118 未満 → 回避（v2.1.119 インストール済）
- 公式ドキュメント未参照 → 回避（§1 に一次情報を明記）
- 実装に踏み込む → 回避（本文書作成のみ）
- 優先度判定が自然言語のみ → 回避（§3 に定量スコア表を添付）

---

## §1 機能仕様（公式一次情報のみ）

### §1.1 一次情報ソース

| ソース | URL | 取得手段 |
| --- | --- | --- |
| GitHub Release v2.1.118 | https://github.com/anthropics/claude-code/releases/tag/v2.1.118 | `gh release view --repo anthropics/claude-code v2.1.118` |
| Claude Code Hooks Reference（HTML 版） | https://docs.claude.com/en/docs/claude-code/hooks | `curl -L` で HTML 取得後ローカル grep |

### §1.2 リリースノートの原文

v2.1.118 リリースノート（`What's changed` 冒頭）より verbatim 抜粋:

```
- Hooks can now invoke MCP tools directly via `type: "mcp_tool"`
```

### §1.3 `"type": "mcp_tool"` 仕様（公式 Hooks Reference より）

**位置付け**: Claude Code の hook handler は 5 種類（`command` / `http` / `mcp_tool` / `prompt` / `agent`）に拡張された。`mcp_tool` は「既に接続済みの MCP サーバー上のツールを直接呼び出す」ハンドラ。

**`mcp_tool` 固有フィールド（common fields に追加）**:

| Field | Required | Description |
| --- | --- | --- |
| `server` | yes | 設定済み MCP サーバー名。**サーバーが既に接続済みである必要がある（hook は OAuth/接続フローを起動しない）** |
| `tool` | yes | そのサーバー上で呼び出すツール名 |
| `input` | no | ツールに渡す引数。文字列値は `${path}` 形式でフック入力 JSON から置換可（例: `"${tool_input.file_path}"`） |

**公式サンプル（Write/Edit 後に security_scan を呼ぶ）**:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "mcp_tool",
            "server": "my_server",
            "tool": "security_scan",
            "input": { "file_path": "${tool_input.file_path}" }
          }
        ]
      }
    ]
  }
}
```

### §1.4 呼び出し可能な MCP サーバー種別（stdio / HTTP / SSE）

**公式の明示**: `mcp_tool` は「already-connected MCP server」に対して動作する。Claude Code は stdio / HTTP / SSE の 3 トランスポートを `claude mcp add` で受け付けているため、**トランスポート種別を問わず接続済みのサーバーすべてを対象にできる**。ただし **hook から新規接続や OAuth を起動することはできない**（下記 §1.7 参照）。

### §1.5 フック入力 JSON → MCP ツール引数の受け渡し

- `input` フィールドにオブジェクトを渡し、**文字列値内の `${path}` でフック入力 JSON の該当パスを substitution** する（例: `${tool_input.file_path}`, `${tool_response.file_path}`, `${session_id}` など）。
- 置換はイベントごとに公式が定義する JSON スキーマに準拠する。PreToolUse / PostToolUse では `tool_input.*`, `tool_response.*` が使える。SessionStart では `source`, `session_id` などが渡る。
- `input` 自体を省略すると空引数でツールが呼ばれる。

### §1.6 返値処理

- MCP ツールが返すテキストコンテンツは **command hook の stdout と同等に扱われる**。
  - 有効な JSON で `decision` や `additionalContext` を含んでいれば、決定として処理される。
  - 有効な JSON でなければ単なるプレーンテキスト扱い。
- サブ仕様 `JSON output`（hooks reference と共通）:
  - `{"decision": "block", "reason": "..."}` で Stop をブロック。
  - `{"additionalContext": "..."}` で SessionStart / UserPromptSubmit にコンテキスト注入。
  - `{"decision": "approve"}` や `{"permissionDecision": "allow"}` も event により使用可。

### §1.7 エラー時挙動

公式原文:

> If the named server is not connected, or the tool returns `isError: true`, the hook produces a non-blocking error and execution continues.

- 接続されていないサーバーを指定した場合、**non-blocking エラー** となりセッションは継続。ブロッキング制御は効かない。
- `isError: true` を返した場合も同様に non-blocking。

### §1.8 タイムアウト / 同時実行

- `timeout` は common fields にあり、**同期 hook のデフォルトは 10 分（600000ms、デバッグログでも確認可能: `[DEBUG] Executing hook command: <...> with timeout 600000ms`）**。`async: true` 指定時も省略値は同じ 10 分。
- 同じイベント内の全ハンドラは **並列に実行** される。同一ハンドラは自動で重複排除される（command は command 文字列、HTTP は URL で dedup）。`mcp_tool` 側の dedup ルールは明示されていないため保守的に「同一 `server + tool + input` は 1 回のみ」と想定するのが安全。

### §1.9 認証要件

公式原文:

> The server must already be connected; the hook never triggers an OAuth or connection flow

- **認証は hook 外で完結済みであることが前提**。OAuth リフレッシュや step-up 認可もこの hook は発動させない。
- `SessionStart` / `Setup` イベントは MCP サーバー接続完了前に発火し得るため、**「未接続エラー」を初回で受ける前提の設計** が必要。

### §1.10 サポートされるイベント一覧

| グループ | 対応イベント | `mcp_tool` 対応 |
| --- | --- | --- |
| 5 タイプすべて可 | `PermissionRequest`, `PostToolBatch`, `PostToolUse`, `PostToolUseFailure`, `PreCompact`, `PreToolUse`, `Stop`, `StopFailure`, `SubagentStop`, `TaskCompleted`, `TaskCreated`, `UserPromptExpansion`, `UserPromptSubmit` | ✅ |
| `command` / `http` / `mcp_tool` のみ | `ConfigChange`, `CwdChanged`, `Elicitation`, `ElicitationResult`, `FileChanged`, `Notification`, `PreCompactFailure`, `SessionEnd`, `SessionResume`, `SubagentStart`, `TeammateIdle`, `WorktreeCreate`, `WorktreeRemove` | ✅ |
| `command` / `mcp_tool` のみ | `SessionStart`, `Setup` | ✅（ただし接続未完了に注意） |

---

## §2 現行フック棚卸し

### §2.1 `.claude/settings.json` で有効な hook 一覧

| # | Event | Matcher | Handler (`command`) | Exit Code 意味 | 役割 |
| --- | --- | --- | --- | --- | --- |
| 1 | PreToolUse | `Bash` | `.claude/hooks/pre-deploy-gate.sh` | 0 許可 / 2 ブロック | `wrangler deploy` / `git push` / `npm run deploy` 前に canopy PASS（1h 以内）を強制 |
| 2 | PostToolUse | `Write\|Edit` | `.claude/hooks/post-test-antipattern.sh` | 常に 0 + additionalContext | `*test*.spec.ts` 保存時に `expect(true)` / `.catch(()=>{})` など 4 パターンを検出しフィードバック |
| 3 | SessionStart | （all） | `.claude/hooks/session-start-context.sh` | additionalContext | Branch / `frontend/js/globals.js` の `APP_VERSION` / session_progress.md 行数 + Next 行を注入 |
| 4 | SessionEnd | （all）`async: true` | `.claude/hooks/session-end-report.sh` | append log | `instructions/results/session_end_log.txt` に `git diff --stat` を追記 |
| 5 | UserPromptSubmit | （all） | `.claude/hooks/prompt-context.sh` | additionalContext | `git diff` 変更数・ステージ数、テストレポート鮮度（1h 以内）を添付 |
| 6 | Stop | （all） | `.claude/hooks/stop-test-check.sh` | decision=block or 0 | `Next:` が TEST 系かつ `tests/e2e/report/index.html` 未生成なら停止ブロック |

### §2.2 スクリプト依存関係

| 依存先 | 使用箇所 | 注意点 |
| --- | --- | --- |
| `instructions/session_progress.md` | session-start-context.sh, stop-test-check.sh | SSoT。欠けると空文字で継続 |
| `instructions/results/canopy_latest.txt` | pre-deploy-gate.sh | canopy.sh の最新結果。1h 超過で再実行要求 |
| `tests/e2e/report/index.html` | stop-test-check.sh, prompt-context.sh | Playwright レポート HTML |
| `frontend/js/globals.js` の `APP_VERSION` | session-start-context.sh | fallback `unknown` |
| `jq` コマンド | pre-deploy-gate.sh, post-test-antipattern.sh | macOS デフォルトでは要インストール |

### §2.3 現行 hook の性格付け

- **同期型でブロッキングするのは 2 本のみ**: PreToolUse（deploy gate）と Stop（test check）。
- 他 4 本はコンテキスト注入とログ追記のみで、失敗してもセッションは続く。
- いずれもローカル shell で完結しており、**外部 API コールは発生していない**（月額コスト増ゼロ）。

---

## §3 MCP 化候補一覧（優先度 A/B/C + 費用対効果スコア）

### §3.1 スコアリング基準

各候補を 4 軸 × 5 段階（1 低 〜 5 高）で採点し、以下の重み付きで総合スコアを算出する。しきい値: **A ≥ 12, B 8〜11, C ≤ 7**。

| 軸 | 重み | 意味 |
| --- | --- | --- |
| **V: 業務価値** | ×1.5 | ADV 違反再発防止 / ゴールデンレビュー自動化 / 品質ゲート自動化への寄与 |
| **F: 実現可能性** | ×1.0 | 必要 MCP サーバーの入手性・接続安定性・SessionStart 接続タイミング問題の影響 |
| **C: コストインパクト** | ×0.8（反転。値が大きい＝影響大＝減点） | 追加 API/LLM コール・並列暴走リスク |
| **R: リスク** | ×0.7（反転） | 無限ループ・認証失敗・誤判定の影響 |

**総合スコア** = `V×1.5 + F×1.0 − C×0.8 − R×0.7`（小数第 1 位まで）

### §3.2 候補一覧

| # | 候補 | イベント | 必要 MCP ツール（想定） | V | F | C | R | 総合 | 優先度 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | session_progress.md + CLAUDE.md 自動ロード | SessionStart | ローカル FS MCP（Desktop Commander の `read_multiple_files` 相当）または自作 stdio MCP | 3 | 2 | 2 | 2 | **5.5 → 優先度 C** | C |
| 2 | モックアップ HTML 保存 → ゴールデンレビュー並列自動実行 | PostToolUse(`Write\|Edit`) | 自作 MCP：ゴールデンレビュー一括起動 + 5 ペルソナ JSON を Gemini/GPT に並列投げる薄いラッパー | 5 | 3 | 4 | 3 | **6.4 → 優先度 C（コスト懸念） → CONDITIONAL B** | B（条件付） |
| 3 | ADV 違反検出 → adv-violation-log 自動記録 | Stop | 自作 MCP：最新アシスタント発話を読み ADV 7 項目判定 + `lais/verify/adv_violation_log.md` 追記 | 5 | 3 | 2 | 3 | **7.8 → 優先度 B → 条件付 A** | A（条件付） |
| 4 | G1-G13 品質ゲート自動判定 | PreToolUse(`Bash` = deploy/push 系) | 自作 MCP：canopy 結果 + G7/G9 スクショ + G1 バージョン同期を束ねる | 5 | 2 | 3 | 3 | **5.6 → 優先度 C** | C |
| 5 | PostToolUse → test-antipattern 判定を LLM 補強 | PostToolUse(`Write\|Edit`) | 既存 shell 実装＋prompt hook で代替可能（`mcp_tool` 化は必須ではない） | 3 | 4 | 3 | 2 | **6.7 → 優先度 C** | C |
| 6 | SessionEnd → 連鎖更新 DISPATCH 自動生成 | SessionEnd | 自作 MCP：`instructions/auto/chain_update_dispatch.md` テンプレ投入 | 4 | 3 | 2 | 2 | **6.7 → 優先度 C** | C |

- **優先度 A 候補（優先度A）**: **該当 1 件（#3）**。ただし「自作 MCP サーバーを先に用意する」条件付き。
- **優先度 B 候補（優先度B）**: **該当 1 件（#2）**。コスト上限ガード（§4 参照）を設ければ A に昇格可。
- **優先度 C 候補（優先度C）**: **該当 4 件（#1, #4, #5, #6）**。現行 shell hook で既に達成できている / 費用対効果が弱い。
- **要約（優先度C）**: #1/#4/#5/#6 は現行 shell hook で十分機能しており費用対効果が弱い。

**A: 1 / B: 1 / C: 4**（合計 6 件検討）

### §3.3 優先度判定の根拠（定量説明）

- **#3 が A に浮上する理由**: ADV 違反再発防止は §2.25 で最上位行動規範に指定され、業務価値 V=5 が確定。実現可能性 F は「Stop hook で発話履歴を取得 → ADV 7 項目を簡易 LLM 判定 → ファイル追記」で Haiku 1 リクエスト/停止で収まるためコスト C=2。リスク R=3（誤検出で違反ログが汚染される懸念）だが、`additionalContext` 通知で済ませればセッションブロックはしないためロールバック容易。
- **#2 が B（条件付 A）の理由**: V=5（モックアップ差分の自動検知はゴールデンレビュー工程の根幹）、F=3（5 ペルソナ並列呼び出しの MCP 実装が必要）、C=4（Write/Edit 毎に発火すると Gemini/GPT 双方で毎回 5 コール = 月数千円〜数万円の跳ね上がりリスク）、R=3（並列暴走）。**トリガを `docs/mockups/**/*.html` に限定 + 10 分デバウンス + 月額上限 ¥3000 ガード**を設ければ A 同等。
- **#1 は C**: 現行 `session-start-context.sh` が 0 円・0ms で同等の additionalContext を提供しており、MCP 化しても追加価値が薄い。
- **#4 は C**: PreToolUse Bash 検知は現行 `pre-deploy-gate.sh` が canopy 結果でブロックを効かせている。G1-G13 全判定の MCP 化は仕様複雑度が高く、まず shell 拡張で足りる。
- **#5 は C**: 現行 shell でパターン検知が動作中。LLM 補強は prompt hook で十分。
- **#6 は C**: session_progress.md 連鎖更新は人間（PO）のガバナンス下に置くべきプロセスであり、自動化優先度は低い。

---

## §4 優先度 A 候補の詳細設計（#3: Stop → ADV 違反検出）

> 本節は設計案の提示であり、実装は後続ミッションで行う。

### §4.1 目的

Stop hook 発火時に「直近の assistant 発話」と「ADV 行動規範 7 項目」を比較し、違反候補があれば `lais/verify/adv_violation_log.md` に追記し、当該セッションに `additionalContext` で警告を返す。

### §4.2 必要 MCP サーバー（新規構築）

- サーバー名: `dev-system-adv-local`
- トランスポート: **stdio**（ローカル Python / Node プロセス）
- 提供ツール:
  - `adv_scan`: 直近ターンの発話本文と session_id を受け取り、ADV 7 項目に対して違反有無と根拠を返す
  - `adv_log_append`: 違反有りの場合にファイル追記（日時 / session_id / 該当項目 / 発話要約 / 対応策）
- 認証: ローカル stdio のため認証不要。
- SessionStart 未接続問題: Stop イベントは session 後半に発火するため、起動後数秒〜数分経過後でサーバー接続が安定していれば問題なし。ただし「未接続時 non-blocking」は §1.7 通りなので安全側。

### §4.3 hook 設定案（実装は未着手、設定ファイル差分は後続ミッションで反映）

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "mcp_tool",
            "server": "dev-system-adv-local",
            "tool": "adv_scan",
            "input": {
              "session_id": "${session_id}",
              "recent_turn_path": "${transcript_path}"
            }
          },
          {
            "type": "mcp_tool",
            "server": "dev-system-adv-local",
            "tool": "adv_log_append",
            "input": {
              "session_id": "${session_id}"
            }
          }
        ]
      }
    ]
  }
}
```

### §4.4 `adv_scan` ツールが返す JSON 例

```json
{
  "additionalContext": "[ADV-SCAN] 違反候補: #2 先走り実装（confidence 0.72）。根拠: 仕様変更申請未承認のままファイル編集を提案。",
  "decision": "continue"
}
```

- **`decision` に `block` は使わない**（Stop イベントで block するとセッション停止が過剰になるため、警告注入のみ）。
- `confidence < 0.6` 時は通知スキップ（ツール側で判定）。

### §4.5 フォールバック戦略

| 失敗ケース | 検知 | 挙動 |
| --- | --- | --- |
| `dev-system-adv-local` 未接続 | 公式の「not connected → non-blocking error」 | セッション継続。**損失ゼロ** |
| `isError: true` | 同上 | セッション継続＋ stderr にエラー |
| 既存 `stop-test-check.sh` との競合 | 同一イベントで並列実行 | 並列ハンドラ・dedup 問題なし（command と mcp_tool は別エンジン） |
| 無限ループ（ADV log 編集が再度 Write を発火 → PostToolUse が追従） | matcher を `Write\|Edit` に限定している現行 PostToolUse とは別イベントなので発生せず | 問題なし |

### §4.6 移行ステップ（後続ミッションでの実装順）

1. MCP サーバー `dev-system-adv-local`（stdio, Node/Python）を `lais/verify/mcp_adv_scan/` 配下に実装
2. `claude mcp add dev-system-adv-local -- node lais/verify/mcp_adv_scan/server.js` で登録
3. `.claude/settings.local.json`（ふとし個人環境）で §4.3 の hook を 1 週間トライアル
4. 誤検出率 < 10% を確認し、`.claude/settings.json` にプロモート
5. Stop hook の現行 `stop-test-check.sh` はそのまま維持（役割が異なるため）

---

## §5 リスク評価

| リスク | 発生確率 | 影響度 | 緩和策 |
| --- | --- | --- | --- |
| **コスト逸脱**: #2 候補（モックアップ PostToolUse）で Write/Edit 毎にゴールデンレビュー 5 ペルソナ × Gemini/GPT が走り月額跳ね上がり | 中 | 高（¥数千〜¥数万/月） | ① matcher を `docs/mockups/**/*.html` などパスに強制限定、② MCP サーバー側で「直近 10 分以内の同一ファイル呼び出しは no-op」、③ 月額上限 ¥3000 を超えたら MCP サーバーが `isError: true` を返す、④ Opus/Sonnet は使わず Haiku で事前振り分け |
| **無限ループ**: hook が Write を発火 → PostToolUse `Write\|Edit` が再帰 | 中 | 中 | ① MCP サーバーが書き込むファイルパスを matcher 対象外（`docs/mockups/**` のみ許可）に配置、② hook handler 内で `process.env.CLAUDE_CODE_HOOK_DEPTH` 的な循環検知（現状公式未定義のため保守的に「書き込み禁止、append only」） |
| **認証失敗**: hook が OAuth を起動しない仕様（§1.9）、期限切れトークンで `isError` | 低 | 低 | ① stdio ローカル MCP を選択すれば不要、② HTTP/SSE MCP を使う場合は `claude-code` 起動前に `claude mcp list` で接続確認、③ non-blocking なのでセッションは継続 |
| **並列暴走**: 同一イベントで 5 ハンドラが並列 × 5 ペルソナ = 25 並列リクエスト | 中 | 高 | ① MCP サーバー側で semaphore（同時 3 本）、② 月上限ガード（上記）、③ `timeout` を 30 秒に下げる（common field） |
| **MCP 未接続エラーログ汚染**: SessionStart で毎回「未接続」warning | 低 | 低 | ① SessionStart は現状候補 C のため対象外、② 必要なら stdio なので接続は数秒、③ 既存 `session-start-context.sh` を温存 |
| **誤検出による adv_violation_log 汚染**: Stop hook で確信度低い誤 ADV 違反通知 | 中 | 中 | ① `confidence >= 0.6` 閾値、② 1 週間ローカル試用後に project settings に昇格、③ ふとしが「誤検出ログを削除する明示フロー」を持つ |
| **ドキュメント変更の見落とし**: v2.1.118 以降も hooks reference の改訂が続く | 高 | 低 | ① 実装ミッション開始時に再度公式ドキュメントを照合、② CHANGELOG を毎月チェック |

---

## §6 3 ペルソナ合議（ADV / QA / PO 代理）による実装可否判定

### §6.1 ADV（行動規範・再発防止責任）

> **判定: CONDITIONAL-YES**。
>
> 優先度 A の #3（Stop → ADV 違反検出）は ADV 行動規範の再発防止装置として理想的。ただし本 subagent の立場として「自作 MCP サーバーがまだ存在しない」状態で `.claude/settings.json` に `mcp_tool` を追記することは先走り実装に当たる（ADV 行動規範 §2.25 #2）。**先に MCP サーバー実装 → ローカルで接続確認 → settings.local.json に限定反映 → 1 週間試用 → project 昇格**、という 4 段階ゲートを踏む場合に限り賛成。

### §6.2 QA（品質ゲート / G1-G13 担当）

> **判定: CONDITIONAL-YES**。
>
> 現行 6 hook のうち、PreToolUse の deploy gate と Stop の test check は既にブロッキング品質ゲートとして機能している。`mcp_tool` 化しても G1-G13 を置き換えるほどの利得はない（#4 候補は C 判定）。一方で #3 ADV 違反検出は ADV ログ自動追記により QA のレビュー対象データが増える点で価値あり。ただし **誤検出率 < 10% を測定する eval セット（30 件の既知違反 / 30 件の陰性）を事前に用意すること**。未用意なら NO。

### §6.3 PO 代理（ふとしの費用対効果代弁）

> **判定: CONDITIONAL-YES**。
>
> 月額コスト影響（§7 試算）が **¥0〜¥500/月（#3 のみ実装時、ローカル stdio 使用）** で済むなら即承認。#2（モックアップ自動ゴールデンレビュー）は価値は高いが **¥3000/月上限ガードを MCP サーバー側に実装してから** でないと GO しない。#1/#4/#5/#6 は現行 shell で達成できているため、本ミッションからは切り離す。
>
> 「v3.4 確定 + Code G_49 完遂」が先決のため、本提案の実装着手は **Code G_49 リリース後** とする。

### §6.4 合議結論

**合議判定: CONDITIONAL**

- 優先度 A の #3 のみ、§4.6 の 4 段階ゲートを踏む前提で実装着手可。
- 優先度 B の #2 は、MCP サーバー側に「月額上限ガード」「デバウンス」「パス限定」の 3 点実装を付帯条件として後続スプリントで検討。
- 優先度 C の #1/#4/#5/#6 は本提案から除外。

---

## §7 実装ミッションのドラフト（承認後に正式ミッション化）

> 以下は **ドラフト**。ふとしの承認後、`instructions/session_progress.md` に正式ミッションとして追記する。

### §7.1 次ミッション候補 1: `CC-ADV-MCP-IMPL-1` — `dev-system-adv-local` MCP サーバー実装

- **リスク**: 🟡中（新規サーバー実装、ローカル stdio のため認証なし）
- **参照**:
  - docs/research/cc_v2118_hook_mcp_analysis.md §4
  - lais/verify/adv_violation_log.md
  - .claude/hooks/stop-test-check.sh（temp for coexistence）
- **対象ファイル**:
  - 新規: `lais/verify/mcp_adv_scan/server.js` (or `.py`)
  - 新規: `lais/verify/mcp_adv_scan/README.md`
  - 新規: `lais/verify/mcp_adv_scan/eval_fixtures/` （30 陽性 / 30 陰性）
- **完了コマンド**:
  - `node lais/verify/mcp_adv_scan/server.js --selftest` が exit 0
  - 誤検出率 < 10% の eval レポートを出力

### §7.2 次ミッション候補 2: `CC-ADV-MCP-HOOK-TRIAL` — `.claude/settings.local.json` に §4.3 の hook を限定反映

- **前提**: `CC-ADV-MCP-IMPL-1` 完了
- **リスク**: 🟢低（local settings のみ、project settings は触らない）
- **完了コマンド**:
  - `claude mcp list` に `dev-system-adv-local` が表示される
  - Stop hook で `additionalContext` が 1 回以上発火したログを `.claude/hook_trial_log.txt` に記録

### §7.3 次ミッション候補 3（後回し）: `CC-GOLDEN-MCP-COST-GUARD` — #2 候補用の月額ガード付き MCP サーバー

- **前提**: `CC-ADV-MCP-IMPL-1` / `CC-ADV-MCP-HOOK-TRIAL` 両方完了後、かつ PO 承認
- **リスク**: 🟡中

### §7.4 本ミッションから切り離す案件

- 優先度 C #1/#4/#5/#6: 現行 shell hook 維持、改修必要性なし。
- 既存 `.claude/hooks/*.sh` の統合: 本提案時点では変更不要。

---

## §8 付録: 一次情報スニペット

### §8.1 v2.1.118 release notes 冒頭（`gh release view` より）

```
title:	v2.1.118
tag:	v2.1.118
published:	2026-04-23T00:42:21Z

## What's changed

- Added vim visual mode (`v`) and visual-line mode (`V`) ...
- Merged `/cost` and `/stats` into `/usage` ...
- Create and switch between named custom themes ...
- Hooks can now invoke MCP tools directly via `type: "mcp_tool"`
- Added `DISABLE_UPDATES` env var ...
```

### §8.2 Hooks Reference より `mcp_tool` 導入文

> MCP tool hooks (`type: "mcp_tool"`): call a tool on an already-connected MCP server. The tool's text output is treated like command-hook stdout.

### §8.3 Hooks Reference より non-blocking エラー挙動

> The tool's text content is treated like command-hook stdout: if it parses as valid JSON output it is processed as a decision, otherwise it is shown as plain text. If the named server is not connected, or the tool returns `isError: true`, the hook produces a non-blocking error and execution continues.

### §8.4 Hooks Reference より SessionStart / Setup 制約

> MCP tool hooks are available on every hook event once Claude Code has connected to your MCP servers. `SessionStart` and `Setup` typically fire before servers finish connecting, so hooks on those events should expect the "not connected" error on first run.

---

**本提案書は「調査と提案」の完了地点までを網羅する。実装は §7 のミッション候補が PO により正式承認されるまで着手しない。**
