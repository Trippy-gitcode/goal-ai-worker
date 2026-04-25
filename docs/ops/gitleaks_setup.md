# gitleaks 運用手順書 — Phase B-1

> Phase B 本番前必須 5 件の 1 件目（gitleaks）の運用 SSoT。
> 仕様根拠: `docs/ops/api_budget_guard.md §5 Git 漏洩対策`
> 設計根拠: `docs/ops/api_incident_playbook.md`（事故時対応）
> 関連ミッション: `LAIS-PHASE-B-1-GITLEAKS`

---

## §0 状態スナップショット（2026-04-25 ADV プリフライト）

| 項目 | 状態 |
|---|---|
| `gitleaks` バイナリ | ✅ 導入済（`/opt/homebrew/bin/gitleaks`） |
| `.gitignore` シークレットカバレッジ | ✅ §5.1 推奨 17 パターン拡張済（2026-04-25 PATCH-PB1） |
| `.gitleaks.toml` allowlist | ⏳ 未作成（本ミッションで新設） |
| `.git/hooks/pre-commit` | ⏳ 既存 6,498 bytes（G18 / G14 / G10 結線済）に gitleaks 追加が必要 |
| 過去コミット監査 | ⏳ 未実施（本ミッションで実施） |
| 実キー漏洩（プリフライト v1） | ✅ 0 件（false positive 8 件のみ、§1 で allowlist 化） |

---

## §1 false positive 8 件（allowlist 対象）

`grep -rE "(sk-[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z_-]{35}|ANTHROPIC_API_KEY=|OPENAI_API_KEY=|GEMINI_API_KEY=)"` で検出される 8 件は全て false positive：

| # | ファイル | 内容 | 種別 |
|---|---|---|---|
| 1-3 | `docs/plans/lais_reference_v1.md` | `ANTHROPIC_API_KEY=` / `OPENAI_API_KEY=` / `GEMINI_API_KEY=` | 環境変数名の例示（値なし） |
| 4-5 | `docs/ops/api_budget_guard.md` | マスク済 `***` + 検出パターン解説文 | ドキュメント |
| 6-8 | `lais/verify/external_review/2026-04-25T*Z_gemini.json` | Gemini レビュー指摘の `OPENAI_API_KEY="sk-..."` 引用文 | レビュー JSON |

→ `.gitleaks.toml` の `[allowlist]` で `paths` 指定で除外。

---

## §2 `.gitleaks.toml` 設計

```toml
title = "Lais / dev-system gitleaks config"

[extend]
# gitleaks 既定ルールセットを継承
useDefault = true

[allowlist]
description = "False positives — env var names, masked examples, review JSON quotes"
paths = [
  '''docs/plans/lais_reference_v1\.md''',
  '''docs/ops/api_budget_guard\.md''',
  '''docs/ops/api_incident_playbook\.md''',
  '''docs/ops/gitleaks_setup\.md''',
  '''lais/verify/external_review/.*\.json''',
  '''lais/verify/.*_pre_review.*\.md''',
  '''lais/verify/dev_system_v34_package\.md''',
  '''lais/verify/dev_system_v34_patches\.md''',
]

# 解説文・例示・テスト用ダミーキーの除外
regexes = [
  '''ANTHROPIC_API_KEY=\*\*\*''',
  '''OPENAI_API_KEY=\*\*\*''',
  '''GEMINI_API_KEY=\*\*\*''',
  '''sk-(ant-)?api03-EXAMPLE''',
  '''sk-proj-EXAMPLE''',
]

stopwords = [
  "EXAMPLE",
  "REPLACE_ME",
  "YOUR_KEY_HERE",
]
```

---

## §3 `.git/hooks/pre-commit` 改修方針（既存結線維持）

既存 `.git/hooks/pre-commit`（6,498 bytes）には PART3 ENG 領域（PATCH-21）で以下が結線済：

- G18 chain_update_audit.sh
- G14 spec_first_lint.sh
- G10 拡張 terminology_lint.sh
- canopy_fire.log 記録
- pre-commit-sub.sh 動的 subdirs 探索

→ **既存結線を破壊しない方針**。`.pre-commit-config.yaml` ベースの Python `pre-commit` フレームワーク方式は採用せず、既存シェルフックに gitleaks 呼出しを追加。

```bash
# .git/hooks/pre-commit の末尾近く（既存ゲート群の後に追加）
# === Phase B-1: gitleaks Secret Detection ===
if command -v gitleaks >/dev/null 2>&1; then
  if ! gitleaks protect --staged --redact --config="$repo_root/.gitleaks.toml" >/tmp/gitleaks-precommit.log 2>&1; then
    echo "ERROR: gitleaks detected secrets in staged changes."
    echo "  Log: /tmp/gitleaks-precommit.log"
    echo "  Re-run: gitleaks protect --staged --verbose --redact --config=.gitleaks.toml"
    exit 1
  fi
else
  echo "WARN: gitleaks not installed. Skipping secret scan."
fi
```

`gitleaks protect` は staged 差分のみ走査（高速、数百ms）、`gitleaks detect` は全履歴走査（過去コミット監査用、§4）。

---

## §4 過去コミット監査手順

```bash
cd /Users/futoshi/Desktop/goal-ai-worker

# 全履歴監査（コミット時 commit metadata + diff 全走査）
gitleaks detect --source . --redact --config=.gitleaks.toml --report-path=/tmp/gitleaks-audit-$(date +%Y%m%d).json

# 結果確認（leaks 0 が期待）
jq '.[] | {file: .File, rule: .RuleID, line: .StartLine}' /tmp/gitleaks-audit-*.json
```

検出時は `docs/ops/api_incident_playbook.md §1 初動 5 分` に従い、即 revoke → 新キー発行 → `git filter-repo` で履歴から削除（§5.3 参照）。

---

## §5 動作テスト手順

```bash
# T1: 通常 commit が通る（false positive 8 件は allowlist で除外済）
echo "test" >> /tmp/dummy.md
git add /tmp/dummy.md
git commit -m "test: gitleaks pass" --dry-run

# T2: 実キーパターン混入で commit がブロックされる
echo 'OPENAI_API_KEY=sk-proj-1234567890abcdefghijklmnopqrstuvwx' > /tmp/leak.txt
git add /tmp/leak.txt
git commit -m "test: gitleaks block"  # → exit 1 想定
git reset HEAD /tmp/leak.txt && rm /tmp/leak.txt
```

---

## §6 月次メンテナンス（`api_budget_guard.md §8` と統合）

| 項目 | 頻度 | コマンド |
|---|---|---|
| gitleaks ルール更新 | 月次 | `brew upgrade gitleaks` |
| 全履歴再監査 | 月次 | `gitleaks detect --source . --redact --config=.gitleaks.toml` |
| allowlist 妥当性レビュー | 四半期 | 本ファイル §1 を読み返し、不要除外を削除 |
| 検出ルール拡張検討 | 四半期 | `api_budget_guard.md §6 リトライ暴走対策` と同期 |

---

## §7 Lais 本番デプロイ前チェックリスト

- [ ] `gitleaks detect --source .` で leak 0 件
- [ ] `.git/hooks/pre-commit` が gitleaks を呼び出している
- [ ] `.gitleaks.toml` が repo ルートに存在
- [ ] `.gitignore` が §5.1 推奨 17 パターンを含む
- [ ] CI（Cloudflare Pages デプロイトリガ）でも gitleaks を実行（Phase B-5 コード分割と並行整備）
- [ ] `docs/ops/api_incident_playbook.md` を読了し事故時対応を把握済

---

## §8 関連ファイル

- `docs/ops/api_budget_guard.md` — 全有料 API 予算ガード（§5 Git 漏洩対策が本ファイルの仕様根拠）
- `docs/ops/api_incident_playbook.md` — 事故時対応プレイブック
- `lais/verify/dev_system_v34_package.md §6.12` — pre-commit 構造 SSoT
- `lais/verify/dev_system_v34_patches.md PATCH-21` — PART3 ENG 領域 pre-commit 結線実装
