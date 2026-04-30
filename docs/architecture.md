# architecture.md — dev-system 設計思想 SSoT

> **位置づけ**: dev-system の設計思想（完全独立モデル / scaffold ジェネレータパターン / 双方向参照ゼロ / メタデータ + 改変禁止 + opt-in 取り込み）の SSoT。
> **更新**: 2026-04-29 v0.1.0（SUBAGENT-DEVSYS-CORE-EXTRACT）

---

## 1. 設計思想の 4 本柱

### 1.1 完全独立モデル

dev-system から生成された App は **dev-system のリポジトリパスを知らない**。逆に、dev-system は生成済 App のリポジトリを知らない。

- **生成方向**: dev-system → App（一方向、コピー）
- **改善方向**: App は `MIGRATION.md` を見て手動 merge（opt-in）
- **削除方向**: App を消しても dev-system は影響を受けない、dev-system を消しても既存 App は完結動作

旧 dev-system-adv は ADV 専用として goal-ai-worker と双方向参照していたが、本モデルでは廃止し、生成 App 内に必要なものをすべてコピーする。

### 1.2 scaffold ジェネレータパターン

dev-system は **コードジェネレータ** として動作する。`new <app-name>` で生成された App は dev-system 全体のスナップショットを持ち、生成後は完全独立。

- **シンボリックリンク禁止**: 旧 dev-system モデルでは scripts をシンボリックリンクで共有していたが、本モデルでは **完全コピー** する
- **生成時バージョン固定**: 生成された App は `dev-system-generated.json` に生成時の dev-system バージョンを焼き付ける
- **再生成不可**: 既存 App に対して `dev-system new --update` のような上書きはサポートしない、`MIGRATION.md` の手動 merge のみ

### 1.3 双方向参照ゼロ

dev-system 側の設計時、**App 固有の参照（Lais / goal-ai-worker / Supabase / Stripe / 特定ドメイン）を dev-system 側にコピーしない**。汎用化して残すか、App 側 `app_config.yaml` で可変化する。

許可される参照例:
- 環境変数経由（`APP_REPO_ROOT_ENV`、`APP_REPO_MARKER`、`APP_REPO_CANDIDATES`）
- マーカーファイル経由（既定 `dev-system-generated.json`、App 側で上書き可）
- App 固有 sub_*.md は App 側 `docs/plans/` に置く（dev-system 側にはテンプレのみ）

禁止される参照:
- ハードコード絶対パス（`/Users/futoshi/Desktop/goal-ai-worker/...`）
- App 固有のドメイン名・プロダクト名
- 特定 SaaS の API キー名

### 1.4 メタデータ + 改変禁止 + opt-in 取り込み

#### 1.4.1 dev-system-generated.json メタデータ

生成 App のルートに必ず置かれる JSON。スキーマ:

```json
{
  "generatedByVersion": "0.1.0",
  "generatedDate": "2026-04-29T12:00:00Z",
  "appName": "lais",
  "appType": "preact-supabase-cloudflare",
  "generator": "dev-system new",
  "marker": "dev-system-generated.json"
}
```

`scripts/lib/resolve_repo_root.sh` はこのファイルをマーカーとして App REPO_ROOT を特定する（既定）。

#### 1.4.2 改変禁止タグ

dev-system からコピーされたファイルのうち、App 開発者が改変禁止のものは **冒頭に `// GENERATED: DO NOT MODIFY` タグ** を含む。

- 改変禁止対象: `scripts/*.sh`（コア）、`scripts/lib/*.sh`、`docs/plans/sub_*.md` の改変禁止セクション
- 改変自由対象: `instructions/*.md`（SSoT 4 ファイル）、`docs/decision_log.md`、`docs/po-decisions.md`、`docs/learned-patterns.md`、App 固有の `docs/plans/sub_<app>_*.md`、`app_config.yaml`、`development_rules.md`（共通部除く）

詳細は `changeable_policy.md` 参照。

#### 1.4.3 opt-in 取り込み（MIGRATION.md）

dev-system 側で改善が出た時、App 側は `MIGRATION.md` を見て手動 merge する。フォーマット:

```markdown
## MIGRATION-<dev-system version>

- [ ] [optional] core_spec.md §X.Y 追加
- [ ] [required] adv_response_gate.sh の §X.Y 違反検査追加
- [ ] [breaking] resolve_repo_root.sh が APP_REPO_MARKER を読むように変更
```

App 側は `[required]` のみ必須対応、`[optional]` / `[breaking]` は判断。

---

## 2. 完全独立モデルの帰結

### 2.1 dev-system は App を直接書き換えない

dev-system 側にコマンドを実装しても、生成済 App には反映されない。App の改修は App 側で実行する（App 側 `CLAUDE.md` に従って ADV / ENG が動作）。

### 2.2 App はパッケージマネージャ的に依存しない

npm / pip 等のパッケージマネージャモデル（dev-system が npm install されて参照される）ではない。dev-system はコードジェネレータであり、生成後は依存関係が消える。

### 2.3 シンボリックリンク禁止の理由

旧モデル（dev-system 側 scripts → App 側 scripts へシンボリックリンク）では:

- App をコピー / git clone しただけでは scripts が壊れる
- dev-system 側の改修が即時 App に反映され、互換性破壊リスク
- App が dev-system のパスを知っている = 双方向参照

新モデル（完全コピー）では:

- App は自己完結、git clone だけで動作
- dev-system 改修は App に影響しない、opt-in 取り込みのみ
- App は dev-system を知らない

### 2.4 メリット / デメリット

**メリット**:
- App ごとに dev-system バージョンを固定できる（再現性）
- dev-system の breaking change が既存 App を壊さない
- App 単独で配布 / git clone が成立

**デメリット**:
- dev-system 側のバグ修正が既存 App に自動反映されない（手動 merge 必須）
- App ごとに scripts のコピーが存在（diskspace 微増）

---

## 3. アーキテクチャ図

### 3.1 完全独立モデル図

```
┌─────────────────────────┐
│ dev-system/             │ ← Phase 1-3 で構築する SSoT
│  ├── core_spec.md       │
│  ├── scripts/*.sh       │
│  ├── templates/         │
│  └── generator/new.sh   │
└──────────┬──────────────┘
           │ generate（一方向コピー）
           ▼
┌─────────────────────────┐    ┌─────────────────────────┐
│ ~/Desktop/lais/         │    │ ~/Desktop/another-app/  │
│  ├── CLAUDE.md (cp)     │    │  ├── CLAUDE.md (cp)     │
│  ├── scripts/*.sh (cp)  │    │  ├── scripts/*.sh (cp)  │
│  ├── dev-system-        │    │  ├── dev-system-        │
│  │   generated.json     │    │  │   generated.json     │
│  └── MIGRATION.md       │    │  └── MIGRATION.md       │
└─────────────────────────┘    └─────────────────────────┘
   生成後、dev-system に              生成後、dev-system に
   依存しない、独立で動作              依存しない、独立で動作
```

### 3.2 改善取り込みフロー

```
dev-system 改修
    │
    ▼ release notes
MIGRATION.template.md 更新
    │
    ▼ 各 App 側で手動 merge（opt-in）
App 側 MIGRATION.md にチェックリスト追加
    │
    ▼ App 側で必要なものだけ取り込む
App 側 scripts/ を手動 update（差分 patch 適用）
    │
    ▼ App 側で smoke 通過確認
App 側 git commit
```

---

## 4. 関連ファイル

- [core_spec.md](../core_spec.md) — マスター仕様 SSoT
- [changeable_policy.md](changeable_policy.md) — 改変禁止 / 改変自由ファイル一覧
- [../README.md](../README.md) — Phase 1-3 ロードマップ
- [../templates/MIGRATION.template.md](../templates/MIGRATION.template.md) — opt-in 取り込みフォーマット
- [../templates/dev-system-generated.template.json](../templates/dev-system-generated.template.json) — 生成メタデータ雛形

---

## 5. 改変履歴

- 2026-04-29 v0.1.0: 初版（SUBAGENT-DEVSYS-CORE-EXTRACT）
