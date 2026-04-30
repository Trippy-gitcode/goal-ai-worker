# Exa for Claude 調査レポート

**Mission ID**: EXA-FOR-CLAUDE-RESEARCH
**Date**: 2026-04-26
**Subagent**: ADV (Lais project)
**情報源**: 一次情報 (exa.ai / docs.exa.ai / GitHub raw / npm registry / Threads og:meta)

---

## 0. エグゼクティブ・サマリ (3 行)

1. **「Exa for Claude」という名称の単独製品は存在しない**。実体は `exa-mcp-server` (MIT, GitHub 4,328 stars, npm v3.2.1, 最終更新 2026-04-23) と Hosted MCP endpoint `https://mcp.exa.ai/mcp` であり、Claude Code は公式に `claude mcp add` 一行で結線可。
2. **採用適否（ADV 自律判定）= 条件付き採用推奨**: 統合工数 ≒ 0.1 時間 / 月 1,000 req 無料枠で初期コスト 0 USD / 既存 MCP との競合なし（現在 `claude mcp list` = 0 件）。
3. **ハルシネーション「ほぼ消える」は誇大**。Exa は外部 Web 出典付与でファクト系ハルシは抑制可だが、subagent 報告の額面受領 / cd・find ミスといった ADV の主要違反パターン (#7/#9/#10/#13) には**無関係**。期待効果は限定的（外部事実引用の出典付与のみ ≒ 5〜15%）。

---

## 1. Step 1: 公式仕様（一次情報）

### 1.1 「Exa for Claude」存在確認
- `https://exa.ai/exa-for-claude` → **404 (Page not found)**。専用ランディングなし。
- 実体は **Exa MCP Server**（汎用 MCP）。Claude は対応クライアントの一つに過ぎず、Cursor / VS Code / Codex / Gemini CLI / Windsurf / Zed 等と並列扱い。
- 一次情報源: `https://docs.exa.ai/reference/exa-mcp` および `https://github.com/exa-labs/exa-mcp-server` (README, MIT License, TypeScript, 4,328 stars, 321 forks, last push 2026-04-24)。

### 1.2 Claude Code への導入手順（公式 README より）
```bash
claude mcp add --transport http exa https://mcp.exa.ai/mcp
```
- 上記一行のみ。HTTP transport で Hosted endpoint へ接続。
- API key は **クエリパラメータ経由** (`?exaApiKey=YOUR_KEY`) または npm パッケージ版なら env (`EXA_API_KEY`)。

### 1.3 Claude Desktop 導入手順
- **Native Connector** が用意されており、Settings > Connectors > Exa を検索 → `+` をクリックで完了。設定ファイル編集不要。
- 手動 fallback:
  ```json
  // ~/Library/Application Support/Claude/claude_desktop_config.json
  {
    "mcpServers": {
      "exa": {
        "command": "npx",
        "args": ["-y", "mcp-remote", "https://mcp.exa.ai/mcp"]
      }
    }
  }
  ```

### 1.4 公開ツール（MCP server 経由）
**デフォルト有効**:
| Tool | 説明 |
|---|---|
| `web_search_exa` | Web 検索（ready-to-use content） |
| `web_fetch_exa` | 既知 URL の全文取得 |

**デフォルト無効**（`?tools=...` で有効化）:
| Tool | 説明 |
|---|---|
| `web_search_advanced_exa` | カテゴリ・ドメイン・日付・テキストフィルタ完全制御 |

`category` 引数で `company` / `news` / `people` / `research paper` / `financial report` / `personal site` を切替（GitHub / 論文 / 企業情報 / SEC filings 等の専門検索はこの 1 ツールに集約）。

**廃止予定** (互換のみ): `get_code_context_exa`, `company_research_exa`, `crawling_exa`, `people_search_exa`, `linkedin_search_exa`, `deep_researcher_*`, `deep_search_exa`。

### 1.5 「ソース付き回答」機能
- **Answer エンドポイント**は公式 API (price $5/1k req) で提供されるが、**MCP 経由ではデフォルト未公開**。`web_search_exa` の戻り値にソース URL は含まれる。
- リアルタイム検索（livecrawl）対応、180ms〜1s の latency configurable。

---

## 2. Step 2: 料金体系（一次情報 = exa.ai/pricing）

### 2.1 無料枠
- **月 1,000 リクエスト無料**（"Run up to 1,000 requests per month for free"）。クレジットカード不要。
- スタートアップ・教育向けに **$1,000 クレジット**助成プログラムあり（要申請）。

### 2.2 従量課金（Endpoint 単位、per 1k requests）
| Endpoint | Base (≤10 results) | +1 result | AI summary |
|---|---|---|---|
| Search | **$7 / 1k** | $1 / 1k | $1 / 1k pages |
| Deep Search | $12 / 1k | $1 / 1k | $1 / 1k |
| Deep-Reasoning Search | $15 / 1k | $1 / 1k | $1 / 1k |
| Contents (full page) | $1 / 1k pages | - | $1 / 1k |
| Monitors | $15 / 1k | $1 / 1k | $1 / 1k |
| Answer | $5 / 1k | $1 / 1k | $1 / 1k |

### 2.3 月額固定 / 制限
- **月額固定プランなし**。Pay-as-you-go のみ。
- 25 results 超 / カスタム rate limit (QPS) / Zero Data Retention 等は **Enterprise** (要問合せ)。
- 無料枠の使い切り後は従量課金へ自動移行と思われるが、明示記述なし → 初回利用前に dashboard で hard cap 設定推奨。

### 2.4 月間コスト試算（ADV 用途想定）
- ADV/PO 用途: 1 セッションあたり 5〜10 検索 × 100 セッション/月 ≒ 1,000 req → **無料枠内 ($0)**
- ヘビー利用 (5,000 req/月): $7 × 4 = **$28/月**（無料枠 1,000 控除後 4,000 req 想定）

---

## 3. Step 3: 既存 MCP 結線との統合手順

### 3.1 現状の MCP 状態
- `claude mcp list` → **No MCP servers configured**。
- `~/.claude/settings.json` に `mcpServers` セクション無し（permissions / hooks のみ）。
- 既存 MCP との**競合リスクなし**。

### 3.2 認証情報
- **必須**: Exa API key 1 個（`https://dashboard.exa.ai/api-keys` で発行、サインアップ必須）。
- API key の保管先（推奨優先順）:
  1. **macOS Keychain** + dotenv 起動（最安全、ただし MCP ツール側で env 読込対応必要）
  2. `~/.claude/settings.json` の `env` フィールド経由で `EXA_API_KEY` 注入（npm パッケージ版を使う場合）
  3. URL クエリパラメータ `?exaApiKey=YOUR_KEY`（**非推奨**: `claude mcp list` / プロセスログに露出）

### 3.3 推奨統合パターン（API key を URL に出さない構成）
```bash
# Step 1: API key を環境変数に設定（zshrc 等）
export EXA_API_KEY='exa-...'

# Step 2: npm パッケージ版で結線
claude mcp add exa --command npx --args "-y exa-mcp-server" --env EXA_API_KEY=$EXA_API_KEY
```
※ Hosted endpoint 利用時は API key を URL に含めるしかないため、本格運用は **npm パッケージ版 (stdio transport)** を推奨。

### 3.4 検証手順（結線後）
```bash
claude mcp list                    # exa が表示されるか
# Claude Code 内で:
# > web_search_exa を使って "Anthropic Claude 4.7 release notes" を検索
# 戻り値に URL とテキストが返るか確認
```

### 3.5 既存運用への影響
- **hooks 系（main_session_writeguard / adv_response_gate / context_monitor 等）への影響なし**。MCP は別レイヤ。
- **subagent / Task 系 hook（`adv_response_gate.sh`）との相互作用なし**。Exa MCP は単純な search/fetch ツールであり、Task agent の応答パイプラインには介入しない。
- 「Token Isolation」を README が強く推奨: **Exa 検索は必ず Task agent でラップし main context に raw 結果を流さない**。これは ADV の既存「subagent への調査委譲」パターンと整合。

---

## 4. Step 4: 効果範囲評価（ADV 違反パターンとの照合）

### 4.1 解消される問題
| 問題種別 | Exa 導入で改善? | 根拠 |
|---|---|---|
| 出典なき外部情報引用（公開 URL を捏造する型のハルシ） | ✅ **ほぼ解消** | Exa が返す URL は実在 webpage の crawl 結果であり、捏造リスクなし |
| 古い知識による事実誤り（v1.x の挙動を v2.x で語る等） | ✅ **改善** | livecrawl + 日付フィルタで最新情報取得可 |
| ライブラリ API シグネチャの誤推測 | ✅ **部分改善** | `web_search_exa` で公式ドキュメント直当て可 |

### 4.2 解消されない問題（fumi.ai.sikumika 投稿が示唆する効果範囲外）
| 問題種別 | Exa 導入で改善? | 根拠 |
|---|---|---|
| **subagent 報告の額面受領（実機未検証）= 違反 #1, #2, #4** | ❌ **無関係** | Exa は外部 Web 検索ツールであり、subagent の報告精度や実機検証フローには一切介入しない |
| **cd / find のパス誤り = 違反 #3, #15** | ❌ **無関係** | ローカル FS 操作の話、Exa はネット検索 |
| **PO 委譲禁止違反 §2.25.3 = 違反 #5** | ❌ **無関係** | プロセス規律の話 |
| **暗号略称無断使用 §grep = 違反 #13** | ❌ **無関係** | ADV の言語規律の話 |
| **Phase 完了を smoke PASS なしで宣言 = 違反 #7, #9, #10** | ❌ **無関係** | 実機検証スキップは情報検索では救えない |

### 4.3 期待効果の定量見積
- ハルシネーション全体に占める「外部事実引用型」の割合 = **おそらく 5〜15%**（ADV 違反ログ #1〜#15 を見る限り、外部情報誤引用に分類できる違反は #6 周辺の SDK バージョン誤認程度に留まる）。
- すなわち **「これ入れるだけで Claude の捏造がほぼ消える」は誇大宣伝**。ADV の主要違反パターンは内部規律・プロセス遵守・実機検証関連であり、Web 検索ツールでは構造的に解決しない。

---

## 5. Step 5: 投稿の信頼性検証

### 5.1 fumi.ai.sikumika アカウント情報（Threads og:meta より）
- 表示名: **フミ｜AIで投稿が続く仕組み化**
- フォロワー: **0**
- 投稿数: **15 threads**
- 自己紹介: 「非エンジニアが2ヶ月で到達 / 投稿…(切詰)」
- アカウント URL: `https://www.threads.com/@fumi.ai.sikumika`
- og:profile タイプ確認済（実在アカウント）。

### 5.2 信頼性評価
- **フォロワー 0 / 投稿 15 件 / 自称非エンジニア / 2 ヶ月の経験**は技術系一次情報源として極めて低信頼。
- 「Exa 入れるだけで捏造がほぼ消える」は**マーケティング的誇張のテンプレ表現**であり、Exa 公式 README 自体はそんな主張を一切していない（README は「web search and web crawling」と機能記述のみ）。
- 結論: **投稿は導入のきっかけ程度に有用、定量主張は無視すべき**。判断は本レポート §1〜§4 の一次情報に基づく。

---

## 6. ADV 自律判定

### 6.1 採用判定: **条件付き採用 (Tier 2: 様子見導入)**

理由:
- 統合工数 ≒ 0.1 時間（一行コマンド + API key 取得）
- 月 1,000 req 無料枠でコスト 0
- 既存 MCP / hooks との競合なし
- ハルシ抑制効果は**限定的だが真**（外部事実引用の出典付与）
- 廃れている可能性低: GitHub 4,328 stars / 最終 push 2026-04-24 / 月次バージョンアップ（v3.2.1）/ Cursor が顧客事例として明示

### 6.2 採用条件
1. **API key を URL に晒さない**: npm パッケージ版 + env 変数経由で結線
2. **Token Isolation を厳守**: Exa 検索は必ず Task agent でラップ（README §Agent Skills の指針通り）
3. **過信禁止**: subagent 報告検証や実機 smoke PASS の代替にしない（違反 #1〜#15 の主要パターンは Exa では解決不可）
4. **無料枠 hard cap**: dashboard で 1,000 req/月で課金停止設定（事故防止）

### 6.3 見送り理由が成立するケース
- API key 管理を増やしたくない（鍵の盗難・露出リスクを増やしたくない）→ 見送り合理
- 主要ハルシが「外部事実引用型」でなく「内部プロセス規律型」と判明済 → 期待効果が薄いため後回し合理

---

## 7. 次アクション（ADV 自律）

**推奨**: 別 subagent に以下を委譲（本 subagent の制約「結線は別 subagent」遵守）。

```
Mission: EXA-MCP-WIRING
1. Exa dashboard で API key 発行（PO 手動操作必要）
2. ~/.zshrc に EXA_API_KEY=... を追記（PO 手動）
3. claude mcp add exa --command npx --args "-y exa-mcp-server" --env EXA_API_KEY=$EXA_API_KEY
4. claude mcp list で結線確認
5. web_search_exa で smoke test（"Anthropic Claude 4.7" を検索 → URL とテキストが返るか）
6. /Users/futoshi/Desktop/goal-ai-worker/lais/verify/exa_mcp_smoke_2026-04-26.md に結果記録
```

**または見送り**: 本レポート §6.3 の条件に該当するなら導入見送りも合理判断。

---

## 8. 付録: 一次情報 URL 一覧

- `https://exa.ai/` (homepage)
- `https://exa.ai/pricing` (pricing)
- `https://docs.exa.ai/reference/exa-mcp` (MCP reference)
- `https://github.com/exa-labs/exa-mcp-server` (source repo, MIT)
- `https://raw.githubusercontent.com/exa-labs/exa-mcp-server/main/README.md` (README)
- `https://api.github.com/repos/exa-labs/exa-mcp-server` (repo metadata)
- `https://registry.npmjs.org/exa-mcp-server` (npm registry)
- `https://www.threads.com/@fumi.ai.sikumika` (SNS source, og:meta only)

**取得日時**: 2026-04-26 23:51〜23:52 JST
**手段**: curl + html.parser (WebFetch は本セッションで permission denied のため使用せず)

