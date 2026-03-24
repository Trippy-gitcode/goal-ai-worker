# AI自律開発キット — テンプレート

新しいプロジェクトを始める時にこのディレクトリの4ファイルをコピーして使う。
プロジェクト固有の `[TODO]` 部分を埋めるだけで、開発体制が即座に立ち上がる。

## 立ち上げ手順（Claude.aiが実行）

### Step 0: リポジトリ準備
```bash
mkdir -p /path/to/new-project
cd /path/to/new-project
git init
```

### Step 1: DC allowedDirectories に追加
Desktop Commander の設定で新プロジェクトのパスを追加する。

### Step 2: テンプレートコピー
```bash
cp templates/CLAUDE_TEMPLATE.md /path/to/new-project/CLAUDE.md
cp templates/development_rules_template.md /path/to/new-project/development_rules.md
mkdir -p /path/to/new-project/instructions
cp templates/session_progress_template.md /path/to/new-project/instructions/session_progress.md
mkdir -p /path/to/new-project/tests/smoke
cp templates/canopy_template.sh /path/to/new-project/tests/smoke/canopy.sh
mkdir -p /path/to/new-project/docs
```

### Step 3: 初期ヒアリング（ふとしに確認）
- [ ] プロダクト名と一言説明
- [ ] 技術スタック（フレームワーク、DB、ホスティング、API）
- [ ] ターゲットユーザー
- [ ] 絶対に変更してはいけない設計判断
- [ ] 既存コードがあるか（0からか、既存リポジトリか）
- [ ] デプロイ先とデプロイ方法
- [ ] 課金の有無とStripe等の決済基盤

### Step 4: CLAUDE.md の [TODO] を埋める
ヒアリング結果をもとに契約セクション・参照先・禁止事項を記入。

### Step 5: 最初のミッションキューを session_progress.md に書く

### Step 6: Code起動
ふとしが「CLAUDE.md読んで」と入力 → 開発開始。

## 前提
- Claude.ai（設計・方針・承認） + Claude Code（自律実装） の2層体制
- Desktop Commander（DC）で Claude.ai がリポジトリに直接書き込み可能
- オーナーの作業 = 「CLAUDE.md読んで」+ 承認のみ
