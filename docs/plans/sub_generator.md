# sub_generator.md — `dev-system new <app-name>` ジェネレータ仕様

> **位置づけ**: dev-system v0.1.0 Phase 3 主要 task のジェネレータ SSoT。`docs/architecture.md` 4 本柱 (完全独立 / scaffold / 双方向参照ゼロ / メタデータ + opt-in) に準拠し、テンプレ + scripts + sub_*.md を ターゲット dir にコピーして placeholder 置換 + メタデータ焼込で完全独立 App scaffold を生成する。
> **元仕様**: `docs/plans/sub_infrastructure.md` §5 (CLI 仕様 / dry-run / 衝突検査) を継承し詳細化。
> **更新**: 2026-04-29 v0.1.0 (SUBAGENT-DEVSYS-GENERATOR-V1)
> **改変ポリシー**: 改変禁止セクション (GENERATED START〜END) のみ。生成 App 側でも本ファイルが残るが、改変禁止セクション部分は SSoT として保持される (`docs/changeable_policy.md` §2)。

<!-- GENERATED: DO NOT MODIFY START -->

---

## 1. ジェネレータ目的

dev-system は scaffold ジェネレータ (`docs/architecture.md` §1.2)。`generator/new.sh` を CLI として、以下を実行する:

1. ターゲット dir に dev-system 配下の必要ファイルを完全コピーする (シンボリックリンク禁止)
2. テンプレートの placeholder (`{{APP_NAME}}` 等) を引数値で置換する
3. `dev-system-generated.json` メタデータを焼き込み、生成時 dev-system バージョン / 生成日時 / App 名を記録する
4. 生成 App は dev-system のリポジトリパスを知らず、生成後完全独立で動作する (`docs/architecture.md` §1.1)
5. dev-system 改修は自動波及せず、App 側 `MIGRATION.md` 経由で opt-in で取り込む (`docs/architecture.md` §1.4)

成果は `~/Desktop/<app-name>/` 配下に CLAUDE.md / scripts/ / docs/ / instructions/ / .claude/settings.json / dev-system-generated.json 等が揃った状態。

---

## 2. CLI 仕様

```sh
generator/new.sh <app-name> [--type <profile>] [--themes <list>] \
                 [--dry-run] [--target <path>] [--force]
```

| 項目 | 内容 |
|---|---|
| `<app-name>` | 生成 App の名称 (必須)。英数字 + dash のみ (`[A-Za-z0-9-]`)。先頭英字推奨 |
| `--type <profile>` | App プロファイル。任意、既定 `vanilla`。例: `preact-supabase-cloudflare` / `nextjs` / `vanilla` |
| `--themes <list>` | カンマ区切り theme list。任意。現状はメタデータ記録のみ (App 側で参照) |
| `--dry-run` | ファイル生成せず announce のみ。終了コード 0 で必ず exit |
| `--target <path>` | 生成先絶対パス。任意、既定 `~/Desktop/<app-name>` |
| `--force` | 既存衝突時の上書き許可。`docs/decision_log.md` への記録推奨 |

### 2.1 終了コード

| code | 意味 |
|---|---|
| `0` | 正常終了 (生成完了 / dry-run 完了) |
| `1` | 引数 parse / 衝突 / コピー / 置換失敗 |
| `2` | pre-condition 失敗 (dev-system 配下確認失敗 等) |

### 2.2 衝突検査 (sub_infrastructure §5.3)

ターゲット dir に以下 3 種が既存する場合、`--force` 無しでは中断:

- `dev-system-generated.json`
- `CLAUDE.md`
- `scripts/adv_response_gate.sh`

`--force` 指定時のみ上書き。`docs/decision_log.md` に `PD-BREAK-NN: <理由>` を必ず記録。

---

## 3. 生成フロー (7 step)

`generator/new.sh` は以下 7 step で構成する。各 step は独立し、前 step が失敗した時点で exit。

### Step 1: ターゲット dir 作成

```sh
mkdir -p "$GEN_TARGET"
```

dry-run 時は `[gen][dry-run] would create dir: ...` を announce のみ。

### Step 2: dev-system 配下から copy

| 元 (dev-system 側) | 先 (App 側) | 改変ポリシー |
|---|---|---|
| `core_spec.md` | `docs/dev-system_core_spec.md` + `core_spec.md` (互換) | 改変禁止 |
| `scripts/**` | `scripts/**` | 改変禁止 (chmod +x 維持) |
| `scripts/lib/**` | `scripts/lib/**` | 改変禁止 |
| `docs/plans/sub_*.md` | `docs/plans/sub_*.md` | GENERATED 範囲タグ内は改変禁止 |
| `docs/architecture.md` | `docs/architecture.md` | 改変禁止 |
| `docs/changeable_policy.md` | `docs/changeable_policy.md` | 改変禁止 |
| `templates/**` | `templates/**` | App 側で再 install 用に保持 |
| `skills/**` | `skills/**` | 改変禁止 |

`generator/` 自体は **コピー対象外**。生成 App は再生成しない (`docs/architecture.md` §1.2 再生成不可原則)。

### Step 3: SSoT 4 ファイルの初期化

`instructions/templates/*.template.md` から拡張子 `.template` を除去して `instructions/*.md` に展開:

| 元 | 先 |
|---|---|
| `instructions/templates/session_progress.template.md` | `instructions/session_progress.md` |
| `instructions/templates/decision_log.template.md` | `instructions/decision_log.md` |
| `instructions/templates/in_flight_topics.template.md` | `instructions/in_flight_topics.md` |
| `instructions/templates/subagent_status.template.md` | `instructions/subagent_status.md` |

`instructions/templates/` も保持 (App 側で SSoT 再初期化用)。`verify/adv_violation_log.md` は空ファイル新設。

### Step 4: テンプレ展開 (placeholder 置換)

| 元 | 先 |
|---|---|
| `templates/CLAUDE.template.md` | `CLAUDE.md` |
| `templates/development_rules.template.md` | `development_rules.md` |
| `templates/MIGRATION.template.md` | `MIGRATION.md` |
| `templates/settings.json.template` | `.claude/settings.json` |
| `templates/settings.json.README.md` | `.claude/settings.json.README.md` |
| (上記 + SSoT 4 ファイル) | placeholder 置換実行 |

`templates/launchd/*.plist.template` は **placeholder 残し** (App 側で `launchctl` install 時に再展開する想定)。

### Step 5: dev-system-generated.json メタデータ焼込

`templates/dev-system-generated.template.json` をコピー後 placeholder 置換:

```json
{
  "_generated": true,
  "generatedByVersion": "0.1.0",
  "generatedDate": "2026-04-29T12:00:00Z",
  "appName": "<app-name>",
  "appType": "<profile>",
  "generator": "dev-system new",
  "marker": "dev-system-generated.json"
}
```

`python3 -c "json.load(open(...))"` で JSON 健全性最低検査 (dry-run 時 skip)。

### Step 6: 改変禁止タグ伝播確認

App 側 `scripts/changeable_policy_lint.sh` が executable で残っているか確認。`scripts/handoff_validator.sh` / `scripts/adv_response_gate.sh` 等の必須スクリプトに `GENERATED: DO NOT MODIFY` タグが残っているか、`docs/plans/sub_infrastructure.md` の GENERATED START マーカー / `dev-system-generated.json` の `"_generated"` フィールドが残っているかを確認。

### Step 7: 完了サマリー出力

```
========== generation summary ==========
app-name           : <name>
app-type           : <type>
target             : <abs path>
dev-system-version : 0.1.0
generated-date     : 2026-04-29T12:00:00Z
dry-run            : 0
copied-files       : <N>
copied-dirs        : <M>
placeholder-substs : <K>
generated-files    : <P>
placeholder-leftover (CLAUDE.md): 0

next steps:
  1. cd <abs path>
  2. git init && git add . && git commit -m "init: dev-system v0.1.0 scaffold"
  3. review CLAUDE.md / development_rules.md / MIGRATION.md
  4. claude code .
========================================
```

---

## 4. placeholder 一覧 + 置換規則

### 4.1 placeholder

| placeholder | 値 | 用途 |
|---|---|---|
| `{{APP_NAME}}` | 引数 `<app-name>` | App 名、テンプレ内タイトル / メタデータ |
| `{{APP_TYPE}}` | `--type` 引数 / 既定 `vanilla` | App プロファイル種別 |
| `{{DEV_SYSTEM_VERSION}}` | dev-system 配下 `VERSION` ファイル先頭行 / 既定 `0.1.0` | 生成時バージョン記録 |
| `{{GENERATED_DATE}}` | `date -u +'%Y-%m-%dT%H:%M:%SZ'` | 生成日時 (ISO 8601 / UTC) |
| `{{APP_REPO_ROOT}}` | `--target` / 既定 `~/Desktop/<app-name>` (絶対パス化) | App リポジトリ絶対パス、settings.json hook command 内で参照 |
| `{{APP_REPO_PATH}}` | `{{APP_REPO_ROOT}}` と同義 | `CLAUDE.template.md` 互換 |
| `{{APP_DESCRIPTION}}` | 既定 `<App 開発者が記入>` | CLAUDE.md §5.1 説明 |

### 4.2 置換規則

`generator/lib/placeholder_subst.sh` の `_gen_subst_one` 関数で `sed` 経由 in-place 置換。値内の `|`, `&`, `\` は escape。対象拡張子: `*.md` / `*.json` / `*.yaml` / `*.yml` / `*.plist` / `*.template.md` / `*.template.json` / `*.template`。

`templates/launchd/*.plist.template` は **意図的に再帰置換対象外** (App 側で `launchctl` install 時に再展開する設計)。

### 4.3 取り残し検出

`gen_subst_verify <file_or_dir>` で `\{\{[A-Z_]+\}\}` 形式の取り残しを grep。CLAUDE.md / development_rules.md / dev-system-generated.json では取り残し 0 が前提 (FAIL 条件)。

---

## 5. 改変禁止タグ伝播

### 5.1 5 言語別タグ形式 (`docs/changeable_policy.md` §5.1)

| ファイル種別 | タグ形式 |
|---|---|
| `*.sh` | `# GENERATED: DO NOT MODIFY` |
| `*.md` | `<!-- GENERATED: DO NOT MODIFY -->` (範囲タグは START / END) |
| `*.ts` / `*.js` | `// GENERATED: DO NOT MODIFY` |
| `*.json` | コメント不可 → `"_generated": true` フィールド代用 |
| `*.yaml` / `*.plist` | `# GENERATED: DO NOT MODIFY` / `<!-- GENERATED: DO NOT MODIFY -->` |

### 5.2 検証ポイント (Step 6)

生成 App 側で以下 7 件のタグ残存を確認 (期待 7/7):

1. `scripts/handoff_validator.sh` 冒頭タグ
2. `scripts/adv_response_gate.sh` 冒頭タグ
3. `scripts/persona_review_runner.sh` 冒頭タグ
4. `scripts/main_session_writeguard.sh` 冒頭タグ
5. `scripts/changeable_policy_lint.sh` 冒頭タグ
6. `docs/plans/sub_infrastructure.md` 範囲タグ START
7. `dev-system-generated.json` `"_generated"` フィールド

未満時は `gen_log_warn` で警告 (FAIL ではない、App 側 `changeable_policy_lint.sh` で再検査される)。

---

## 6. dev-system-generated.json schema

### 6.1 必須フィールド

| フィールド | 型 | 例 | 用途 |
|---|---|---|---|
| `_generated` | boolean | `true` | メタデータマーカー (常に true) |
| `generatedByVersion` | string (SemVer) | `"0.1.0"` | 生成時 dev-system バージョン |
| `generatedDate` | string (ISO 8601) | `"2026-04-29T12:00:00Z"` | 生成日時 (UTC) |
| `appName` | string | `"lais"` | App 名 |
| `appType` | string | `"preact-supabase-cloudflare"` | App プロファイル |
| `generator` | string | `"dev-system new"` | 生成元コマンド |
| `marker` | string | `"dev-system-generated.json"` | REPO_ROOT 解決マーカーファイル名 |

### 6.2 マーカーとしての役割

`scripts/lib/resolve_repo_root.sh` は本ファイルの存在を REPO_ROOT 特定の最終手段として利用 (`docs/architecture.md` §1.4.1)。改変するとマーカー失効、機械強制 hook 群が REPO_ROOT 解決失敗で fail-open する可能性あり。

### 6.3 改変禁止理由

`_generated: true` フィールドが GENERATED タグ代替 (JSON はコメント不可)。`docs/changeable_policy.md` §2 改変禁止リストに明示記載。

---

## 7. 生成後検証手順

生成 App 側で以下を順に実行する (App 開発者向け):

### 7.1 構造検証

```sh
# 必須ファイル存在
test -f CLAUDE.md && echo "CLAUDE.md OK"
test -f development_rules.md && echo "development_rules.md OK"
test -f MIGRATION.md && echo "MIGRATION.md OK"
test -f dev-system-generated.json && echo "metadata OK"
test -d scripts && echo "scripts/ OK"
test -d docs/plans && echo "docs/plans/ OK"
test -d instructions && echo "instructions/ OK"
test -f .claude/settings.json && echo "settings.json OK"
```

### 7.2 placeholder 置換完了確認

```sh
grep -RE '\{\{[A-Z_]+\}\}' CLAUDE.md development_rules.md MIGRATION.md dev-system-generated.json
# → 出力 0 行が PASS 条件 (取り残し 0)
```

### 7.3 改変禁止タグ伝播確認

```sh
bash scripts/changeable_policy_lint.sh
# → exit 0 が PASS 条件 (Phase 2 SCRIPTS-PHASE2 / lint_warn_cleanup で実装済)
```

### 7.4 bash 構文 PASS

```sh
for f in scripts/*.sh scripts/lib/*.sh; do
  bash -n "$f" || { echo "SYNTAX FAIL: $f"; exit 1; }
done
echo "all scripts: bash -n PASS"
```

### 7.5 メタデータ JSON 健全性

```sh
python3 -c "import json; print(json.load(open('dev-system-generated.json'))['appName'])"
# → 出力に App 名が表示されれば PASS
```

---

## 8. 既存 App への merge 手順 (MIGRATION.md 経由)

dev-system 改修は自動波及しない。既存 App 側で改善を取り込む手順:

1. dev-system 側の `MIGRATION.template.md` から該当 version エントリを確認
2. 既存 App 側 `MIGRATION.md` にエントリを追加 (`[required]` / `[optional]` / `[breaking]` ラベル)
3. `[required]` のみ必須対応、`[optional]` / `[breaking]` は App 個別に判断
4. 該当ファイルを dev-system 側から差分 patch 適用 or 完全コピー
5. `bash scripts/changeable_policy_lint.sh` exit 0 を確認
6. `git commit -m "Apply MIGRATION-<version>: <概要>"`

詳細手順は `templates/MIGRATION.template.md` Step 1-6 参照。

---

## 9. 関連ファイル

- `docs/plans/sub_infrastructure.md` §5 — 親仕様 (CLI 概要)
- `docs/architecture.md` §1.1-§1.4 — 4 本柱
- `docs/changeable_policy.md` §2 / §5 — 改変禁止 + GENERATED タグ規則
- `templates/CLAUDE.template.md` — 生成 App 用 CLAUDE.md 雛形
- `templates/MIGRATION.template.md` — opt-in 取り込みフォーマット
- `templates/dev-system-generated.template.json` — メタデータ雛形
- `templates/development_rules.template.md` — 開発ルール雛形
- `templates/settings.json.template` + `templates/settings.json.README.md` — hook 結線雛形
- `templates/launchd/*.plist.template` — 夜間 launchd plist 雛形
- `instructions/templates/*.template.md` — SSoT 4 雛形

<!-- GENERATED: DO NOT MODIFY END -->

---

## 10. 改変履歴

- 2026-04-29 v0.1.0: 初版 (SUBAGENT-DEVSYS-GENERATOR-V1)
