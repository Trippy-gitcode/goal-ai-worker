# Claude Code × tmux 運用手順書（Ghostty 前提）

> MISSION-ID: CC-TMUX-SETUP-DOC
> 作成日: 2026-04-23
> 対象: ふとし（PO）セルフサービスセットアップ
> 前提ターミナル: Ghostty（macOS Tahoe 26.x）
> 推奨起動コマンド: `claude -w --tmux=classic`
> 参照一次情報:
>   - Claude Code Changelog: https://code.claude.com/docs/en/changelog
>   - Ghostty Docs: https://ghostty.org/docs
>   - tmux Wiki: https://github.com/tmux/tmux/wiki

---

## §0 プリフライトログ（環境状態 / 2026-04-23 実測）

本手順書作成時点のふとしの Mac 環境状態。セルフセットアップ前後で差分を比較する基準。

| 項目 | コマンド | 結果 |
|------|----------|------|
| Claude Code バージョン | `claude --version` | `2.1.119 (Claude Code)` |
| tmux インストール | `which tmux && tmux -V` | **未インストール** |
| tmux 設定ファイル | `test -f ~/.tmux.conf` | **設定ファイル未作成** |
| Ghostty | `ls /Applications/ \| grep -i ghostty` | **未インストール** |

**重要:** 現状では §2〜§3 のセットアップが未実施。本手順書の §2 からセルフサービスで順に実行すること。

---

## §1 なぜ tmux が必要か

Claude Code をターミナルで直接起動すると、ターミナルを閉じた瞬間・Mac をスリープさせた瞬間・SSH が切断された瞬間にセッションが消失し、Golden レビューや Lais Phase A 実装ラウンドなど長時間タスクが途中で失われる。tmux はセッションを OS 側デーモンが保持するため、ターミナルやネットワークから切り離してもタスクが継続する。

---

## §2 インストール手順

Homebrew でまとめて導入する。**以下 3 行以内で完結、コピペ実行可**。

```bash
brew install tmux
brew install --cask ghostty
claude --version
```

- `brew install tmux` で tmux を導入。
- `brew install --cask ghostty` で Ghostty ターミナルを導入（既に別方式で入れていればスキップ）。
- `claude --version` で Claude Code が 2.1.119 以降であることを確認（`--tmux=classic` / `--worktree` が利用可能）。

バージョン要件:
- Claude Code ≥ 2.1.101（`--worktree` の cleanup 不具合修正済み）
- tmux ≥ 3.3a 推奨（extended-keys 対応）
- Ghostty ≥ 1.0（macOS Tahoe 26.x で実績あり）

---

## §3 `~/.tmux.conf` 設定（Ghostty 前提、extended-keys 対応）

以下をコピペで `~/.tmux.conf` に保存する。**本手順書では実ファイルを作成せず、コードブロックで配布する。**

```tmux
# ====== ~/.tmux.conf（Ghostty + Claude Code 推奨）======

# 256 色 + truecolor（Ghostty は truecolor ネイティブ対応）
set -g default-terminal "tmux-256color"
set -ga terminal-overrides ",xterm-256color:RGB"
set -ga terminal-overrides ",ghostty:RGB"

# extended-keys（Ctrl+矢印、Shift+Enter 等を Claude Code に正しく渡す）
set -s extended-keys on
set -as terminal-features 'xterm*:extkeys'
set -as terminal-features 'ghostty:extkeys'

# マウス操作を許可（スクロール・ペイン選択）
set -g mouse on

# prefix はデフォルト Ctrl-b のまま（Ctrl-a は shell の先頭移動と衝突するため変更しない）

# 履歴バッファを拡張（Claude Code の長い出力をさかのぼれるように）
set -g history-limit 100000

# エスケープ遅延を短縮（Vim/Claude Code 入力のキビキビ感）
set -s escape-time 10

# ウィンドウ・ペイン番号を 1 始まりに
set -g base-index 1
setw -g pane-base-index 1

# ステータスバー（現在セッション名・時刻のみ、軽量）
set -g status-right "#[fg=cyan]#S #[fg=default]| %Y-%m-%d %H:%M"
set -g status-interval 5
```

Ghostty 側の必須設定（`~/.config/ghostty/config`）:

```text
# extended-keys を Ghostty 側でも有効化
keybind = global:unconsumed
# macOS の Option キーを Alt として扱う（tmux 内の一部ショートカット用）
macos-option-as-alt = true
```

設定反映コマンド:

```bash
tmux source-file ~/.tmux.conf
```

---

## §4 起動コマンドと運用フロー（パターン A / B / C）

### パターン A: Golden レビュー実行中（数十分）→ **tmux 必須**

```bash
tmux new -s golden-r3
claude --tmux=classic
```

- Golden レビューはモデル呼び出しが並列で走るため中断コスト大。
- `--tmux=classic` を付けることで Claude Code が tmux セッションに親和的に動作し、画面リフレッシュ崩れを抑える。
- Ghostty 前提のため **`--tmux` 単独（iTerm2 向け無印）ではなく必ず `--tmux=classic` を付ける**。

### パターン B: Lais Phase A 実装ラウンド（長時間）→ **tmux + worktree 推奨**

```bash
tmux new -s lais-phase-a
claude -w lais-phase-a --tmux=classic
```

- `-w <name>` は `--worktree <name>` の短縮形。隔離された git worktree を自動生成し、メインブランチを汚さない。
- 作業ディレクトリはリポジトリ親の `.worktrees/<name>/` 配下（Claude Code が自動管理）に作成され、セッション終了時に cleanup される（v2.1.101+ で stale 不具合修正済み）。
- 実装ラウンドを複数並走させる場合は `-w` の名前を変えて別 tmux セッションを立てる（例: `lais-phase-a-variant2`）。

### パターン C: 軽い確認作業（数分）→ **tmux 不要**

```bash
claude
```

- 5 分以内の質疑応答・ファイル閲覧程度なら tmux を介さず直接起動。
- オーバーヘッドを避け、session_progress.md の読込〜応答を最短で。

**判断基準:** 「作業が 10 分を超える / レビューが自動進行する / 途中で席を立つ可能性がある」のいずれかに該当するなら A または B を選ぶ。

---

## §5 切断 → 再接続の手順

### 切断（デタッチ）

tmux セッション内で以下のいずれか:

- キーバインド: `Ctrl-b` → `d`（デタッチ）
- コマンド: `tmux detach`
- ターミナルをそのまま閉じる（tmux サーバーは生き続ける）
- Mac をスリープ（tmux サーバーはバックグラウンド継続）

### セッション確認

```bash
tmux ls
```

出力例:
```
golden-r3: 1 windows (created Thu Apr 23 14:00:00 2026)
lais-phase-a: 1 windows (created Thu Apr 23 15:30:00 2026)
```

### 再接続（アタッチ）

```bash
tmux attach -t golden-r3
```

- `-t <name>` は `tmux ls` で表示された名前を指定。
- 直前セッションに戻るだけなら `tmux attach` のみでも可（最新セッションにアタッチ）。

### Claude Code 側のセッション再開

tmux 層でアタッチした後、Claude Code のセッション ID / 名前で resume:

```bash
claude --resume <session-id-or-name>
```

`/rename` で命名したセッション名も `--resume` で解決される（v2.1.101+）。

---

## §6 トラブルシューティング（最低 5 件）

### ケース 1: `tmux ls` が `no server running on /tmp/tmux-*` を返す（セッション一覧が空）

- 原因: tmux サーバーが何らかの理由で終了済み（OS 再起動・`tmux kill-server` 実行など）。
- 対処: 新規セッションを `tmux new -s <name>` で作り直す。Claude Code 側は `claude --resume <id>` で過去セッションに戻れる（Claude Code のセッション保存は tmux と独立）。

### ケース 2: アタッチ後に画面が崩れる（罫線・色化け）

- 原因: `default-terminal` が `screen-256color` のままで Ghostty の truecolor 拡張と不整合。
- 対処: §3 の `set -g default-terminal "tmux-256color"` と `terminal-overrides ",ghostty:RGB"` が `~/.tmux.conf` にあるか確認 → `tmux kill-server` で完全再起動 → 再度 `tmux new`。

### ケース 3: Ctrl+C が効かない / 入力が吸われる

- 原因: Ghostty の extended-keys を tmux 側が受け取れていない（`extended-keys on` と `extkeys` 両方が必要）。
- 対処: §3 の tmux 設定 3 行（`set -s extended-keys on` / `terminal-features 'xterm*:extkeys'` / `terminal-features 'ghostty:extkeys'`）が全て入っているか確認。Ghostty 側も `keybind = global:unconsumed` を設定。反映は `tmux source-file ~/.tmux.conf`。

### ケース 4: `claude -w <name>` が `worktree already exists` で失敗する

- 原因: 前回セッション終了時に worktree が正しく cleanup されず stale ディレクトリが残存（v2.1.101 未満で発生しやすい）。
- 対処:
  1. `claude --version` で 2.1.101 以降を確認。古ければ `brew upgrade` または公式アップデータで更新。
  2. 残骸削除: リポジトリルートで `git worktree prune` → `.worktrees/<name>/` が残っていれば手動削除。
  3. worktree 名にスラッシュを入れない（v2.1.83/101 で hang 既知 → 修正済みだが回避推奨）。

### ケース 5: `~/.tmux.conf` を書き換えたのに反映されない

- 原因: 既存 tmux セッションは旧設定を保持するため、`source-file` を呼ばない限り自動で再読込されない。
- 対処:
  - 軽い変更: セッション内で `Ctrl-b` → `:` → `source-file ~/.tmux.conf` Enter。
  - 大きな変更（`default-terminal` 変更等）: 全アタッチを外して `tmux kill-server` → 再度 `tmux new`。
  - それでも効かない場合は `tmux show -g | grep <オプション名>` で現在値を確認。

### ケース 6（補足）: `--tmux=classic` を付け忘れて画面リフレッシュが異常

- 原因: Ghostty 環境で `--tmux` 単独（iTerm2 向け）を指定してしまうと、描画エスケープが不整合。
- 対処: 必ず `--tmux=classic` を指定。iTerm2 を使っていないのに `--tmux`（無印）を推奨する記事は Ghostty 前提では誤りなので従わない。

---

## §7 既存ワークフローとの統合（session_progress.md 起動時定型との組合せ）

ADV セッション起動時の定型は「session_progress 読込 → 直近完了ミッション生成物の自動読込 → 待機」（v3.4 §2.25 準拠）。これを tmux 前提に置き換える:

### 起動定型（Ghostty + tmux 版）

```bash
tmux new -s adv-main
claude --tmux=classic
```

起動後、Claude Code プロンプトで:

```
session_progress.md を読み込み、直近完了ミッションの生成物を確認した上で待機してください
```

### ラウンド実行時（Golden / Lais 等）

別セッションを立てて隔離:

```bash
tmux new -s golden-r3
claude -w golden-r3 --tmux=classic
```

こうすると ADV セッション（`adv-main`）と実行セッション（`golden-r3`）が tmux レベルで分離され、レビュー暴走や OOM があっても ADV 側に波及しない。

### 日次運用サイクル

1. 朝: `tmux attach -t adv-main`（昨晩のコンテキスト復帰）
2. 作業開始: 必要に応じて `tmux new -s <mission>` で別窓
3. 離席時: `Ctrl-b d` でデタッチ（ターミナル閉じて OK）
4. 夕方: `tmux ls` で残セッションを棚卸し、不要なら `tmux kill-session -t <name>`

---

## §8 ふとし向けセルフチェックリスト（セットアップ完了判定用）

上から順に実行して全項目 ✅ になればセットアップ完了。

- [ ] `brew install tmux` 実行済み → `tmux -V` が `3.3a` 以降を返す
- [ ] `brew install --cask ghostty` 実行済み（または既に存在）→ `/Applications/Ghostty.app` あり
- [ ] `~/.tmux.conf` を §3 の内容で保存した → `test -f ~/.tmux.conf` が true
- [ ] `~/.config/ghostty/config` に `macos-option-as-alt = true` と `keybind = global:unconsumed` を追加した
- [ ] `claude --version` が 2.1.119 以降（`--tmux=classic` / `--worktree` 対応）
- [ ] テスト: `tmux new -s test-session` → `claude --tmux=classic` → プロンプト表示を確認
- [ ] テスト: `Ctrl-b d` でデタッチ → ターミナルを閉じる → 新しいターミナルで `tmux attach -t test-session` → セッション復帰を確認
- [ ] テスト: `claude -w test-worktree --tmux=classic` で worktree 自動作成 → 終了後 `git worktree list` で cleanup 確認
- [ ] トラブルシューティング §6 の各ケースを読んで想定対処を把握した
- [ ] 運用フロー §4 の A/B/C 判断基準を理解した（10 分・自動進行・離席のいずれか → A/B）

**推奨セルフセットアップ実行タイミング:** Golden R3 着手前（tmux なしで R3 を回すと途中でターミナル事故に遭うリスクが高い）。

---

**完了報告用メタ情報:**
- 手順書行数: 下記コマンドで確認 → `wc -l docs/ops/claude_code_tmux_setup.md`
- § セクション数: 9（§0〜§8）
- トラブルシューティング件数: 6（ケース 1〜5 + 補足 1）
- `tmux=classic` 出現回数: 手順書内複数箇所（§4/§6/§7/§8）
- 既存環境の tmux インストール状態: NO（§0 参照）
