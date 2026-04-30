# バックアップ戦略比較資料 (Phase D 再発防止インフラ)

**ミッション**: MISSION-G49-PKG-FINAL-V2 Phase D
**作成日**: 2026-04-25
**目的**: 4/25 dev_system_v34_package.md 破損事故 (Bug V35-P2-S2-03 / V35-P2-S2-04) の再発防止策として、利用可能な 5 つのバックアップ戦略を 5 軸で比較し、PO 環境への推奨案を提示する。
**対象環境**: PO Mac (macOS、Apple Account 設定済、iCloud Drive 利用可、Google Drive 未設定)、対象リポジトリ `/Users/futoshi/Desktop/goal-ai-worker` (約 1.1 GiB、git tracked 386 ファイル)。
**根拠**: Apple 公式サポート / Google 公式サポート / Git 公式 docs / Pro Git 書籍 / 4/25 当該事故の git log と実環境調査結果。

---

## §1 事故概要 (4/25 dev_system_v34_package.md 破損)

### §1.1 何が起きたか

- **対象ファイル**: `lais/verify/dev_system_v34_package.md` (v3.4 SSoT パッケージ。3,000-3,400 行想定)
- **被害規模**: ファイルサイズが **8 bytes に縮退** (実質全消失)。git untracked の状態で発生し、復元元が存在しなかった。
- **Bug ID**: `V35-P2-S2-03` (破損検出) + `V35-P2-S2-04` (復元後のレンダリング副次破損: HTML エンティティ 19 箇所、コードブロック 1 行化、テーブル退化)
- **発生条件**: ファイル編集中に外部要因 (シェルリダイレクト誤操作 or エディタ保存事故 想定) でファイル本体が空近くまで切り捨てられ、git に commit されていない (untracked) ためブランチ HEAD から復元できなかった。

### §1.2 復元手段の探索結果 (実証済)

| 復元元 | 結果 | 理由 |
|---|---|---|
| `git log -- lais/verify/dev_system_v34_package.md` | 不可 | 当該ファイルは untracked。HEAD に履歴なし。 |
| Time Machine | 不可 | バックアップ未設定 (`tmutil status` → `Running = 0`、外部ディスク未接続) |
| iCloud Drive | 不可 | リポジトリは `~/Desktop/` 配下。Desktop & Documents Sync 無効 (`~/Library/Mobile Documents/com~apple~CloudDocs/Desktop` 不在) |
| Google Drive | 不可 | 未インストール (`~/Library/CloudStorage/` に Google エントリなし、`Google Drive Stream` 不在) |
| エディタ swap / `~/.Trash` | 不可 | macOS Versions API (`com.apple.versions`) はテキストエディタが未対応 |
| 手動再構築 | **唯一の選択** | 起点 `dev_system_v34_r2_1_1_package.md` から PATCH-1〜27 を再反映 (commit `61b98d5`) + 副次破損修正 (commit `a651ec8`) |

### §1.3 復元コスト (実測)

- **総作業時間**: 約 4〜6 時間 (パッチ 27 件再反映 + レンダリング副次破損 19 + 6 箇所修正)
- **commit**: 2 件 (`61b98d5` + `a651ec8`)
- **副作用**: PATCH-19〜27 の再現に CHAIN-UPDATE-DISPATCH PART1-3 のログを再走査
- **品質低下リスク**: 起点が「PATCH-18 直前の v3.4 ベース」のため、PATCH-1〜18 の差分が完全に再現できたかは要検証 (`G18 chain_update_audit: PASS` で担保)

### §1.4 教訓

1. **untracked ファイル = 永久消失リスク**。SSoT 級の成果物を git untracked のまま編集することは禁忌。
2. **単一防衛線は脆弱**。git tracking + クラウド同期 + ローカルスナップショットの**多層防御**が必要。
3. **検出と復元の時間差**。8 bytes への縮退は数秒で起きるが、検出は次の `wc -l` まで遅延し得る (今回は手動レビューで検出)。

---

## §2 比較表 (5 戦略 × 5 軸)

| # | 戦略 | コスト | 自動化度 | 破損保護 | PO 手作業量 | 推奨度 (5 段階) |
|---|---|---|---|---|---|---|
| 1 | **Git tracking** (改善版) | 無料 (既設定) | △ commit 操作必要 | ◎ commit 後は不滅 / △ untracked は無防備 | 初期 5 分 + 日次 2-5 分 | ★★★★★ (必須基盤) |
| 2 | **macOS Time Machine** | 外部 SSD 1TB ¥10,000-15,000 1 回限り | ◎ 自動 (1 時間毎) | ◎ ファイル単位 + 世代管理 (24h × 30d × 全期間) | 初期 30 分 (ディスク接続 + 設定) + 日常 0 分 | ★★★★★ (Phase 1 推奨) |
| 3 | **iCloud Drive** (Desktop & Documents Sync) | 50 GB ¥150/月 / 200 GB ¥400/月 / 2 TB ¥1,500/月 | ◎ 自動 (保存時) | ○ 削除 30 日復元 / △ バージョン履歴は対応アプリのみ | 初期 15 分 + 日常 0 分 | ★★★ (リポジトリ 1.1 GB が容量を圧迫、有料化必須) |
| 4 | **Google Drive** (Drive for desktop) | 15 GB 無料 / 100 GB ¥250/月 / 200 GB ¥380/月 / 2 TB ¥1,300/月 | ◎ 自動 (ミラー / ストリーミング) | ◎ バージョン履歴 30 日 + ゴミ箱 30 日 | 初期 30 分 (インストール + 認証) + 日常 0 分 | ★★★★ (Phase 2 並行運用推奨) |
| 5 | **iCloud バージョン履歴** (Versions API) | 無料 (ストレージ内蔵) | △ 対応アプリのみ自動 | △ Markdown エディタは未対応が多い | 初期 0 分 / 編集アプリ依存 | ★ (技術文書には不向き、不採用) |

**凡例**: ◎ = 強い、○ = 標準、△ = 限定的

**前提**:
- 対象: `goal-ai-worker` (1.1 GiB) + `dev-system-adv` (44 KiB) + `Desktop` 全体 (推定 5-10 GiB)
- 価格: 2026-04-25 時点、Apple / Google 公式日本語サイト掲載額 (日本円、税抜表示の場合は税込換算)。為替変動・改定の可能性あり。

---

## §3 各戦略詳細

### §3.1 戦略 1: Git tracking (現状改善版)

**仕様**: 全成果物を `git add` し、最低 1 日 1 回または編集セッション毎に commit。`.gitignore` を最小化し、SSoT クラスのファイル (例: `lais/verify/*.md`) は必ず tracked に含める。

**長所**:
- 完全無料。すでに当該リポジトリで運用中。
- commit 後の改竄は git log で必ず検出可能。
- `git reflog` により push 前の state も 90 日 (デフォルト) は復元可。
- diff レビュー文化と親和性が高い (本プロジェクトの `§2.25 ADV 行動規範` と整合)。

**短所**:
- **untracked / unstaged ファイルは保護対象外** (← 4/25 事故の本質的原因)。
- 大容量バイナリ (`node_modules/`, `frontend-dist/`) を tracked にすると repo 肥大化。
- 「commit 忘れ」が単一障害点。

**セットアップ手順** (改善版):
1. `find . -type f -name "*.md" | xargs git check-ignore -v` で untracked Markdown を洗い出し。
2. `lais/verify/`, `instructions/`, `docs/`, `templates/` 配下を `.gitignore` 例外に明記。
3. pre-commit hook (`.git/hooks/pre-commit`) に「8 bytes 未満の `.md` ファイル」検知を追加 (§7.1 詳細手順)。
4. **即時保護層**: `fswatch` などで SSoT ディレクトリ配下のファイルサイズ急減 (例: 直前比 90% 減) を検知して通知する launchd エージェント。日次監視は「監査目的の補助」であり「即時保護の主戦力ではない」 (4/25 事故では数秒で 8 bytes 化したため、日次バッチでは手遅れ)。
5. **監査層**: 1 日 1 回 `git status` を `logs/git_status_audit.log` にダンプ。これは即時保護ではなく事後監査用。

**容量計算**: `goal-ai-worker/.git` 既存。新規容量増分なし (commit 履歴が増えるのみ、年数 100 MB オーダー)。

**4/25 事故への有効性**: × (untracked のため復元不能だった。ただし「全 SSoT を tracked に強制」という改善後は ○)。

### §3.2 戦略 2: macOS Time Machine (公式推奨)

**仕様** (Apple 公式 サポート mh11421): macOS 標準の自動バックアップ。外部ディスク (USB / Thunderbolt) または NAS / Time Capsule をバックアップ先に指定すると、システム全体のスナップショットを以下の世代で自動保持。

- 過去 24 時間: **1 時間毎のスナップショット**
- 過去 1 ヶ月: **1 日毎のスナップショット**
- 1 ヶ月以前: **1 週間毎のスナップショット** (バックアップディスクが満杯になるまで保持)

ローカルスナップショット (内蔵ディスク上の APFS スナップショット) も最大 24 時間分が自動保存される (外部ディスク非接続時のフォールバック)。

**長所**:
- ◎ システム全体 (リポジトリ + 設定 + アプリ) を一括保護。
- ◎ 1 時間毎の自動世代管理。`8 bytes 縮退` のような単発事故も最大 1 時間以内で気付けば前世代から復元可能。
- ◎ Finder からファイル単位で過去世代を復元可能 (Time Machine UI)。
- ◎ 復元後すぐ作業継続可能 (起動可能なバックアップから OS まで戻せる)。

**短所**:
- **外部ディスク必須** (USB SSD 1 TB が ¥10,000-15,000 程度の初期費用)。
- ディスク未接続時は外部世代が増えない (内蔵ローカルスナップショットのみ)。
- ディスク容量はソースの 2-3 倍が推奨 (本環境ソース約 200 GB → 1 TB ディスク推奨)。

**セットアップ手順**:
1. USB / Thunderbolt 接続の SSD (推奨 1 TB) を Mac に接続。
2. システム設定 → 一般 → Time Machine → 「+ バックアップディスクを追加」。
3. ディスクを APFS (大文字小文字を区別しない) フォーマットで初期化。
4. 「自動バックアップ」を ON。
5. 「オプション」→ 除外項目に `node_modules`, `frontend-dist`, `.wrangler` を追加 (任意、再生成可能なため除外推奨)。

**容量計算**: ソース約 200 GB (Mac 内蔵) → 推奨ディスク 1 TB (24h × 30d × 全期間の世代を保持できる)。

**4/25 事故への有効性**: ◎ (1 時間以内に検出すれば、直前世代の正しい package.md を Finder で 30 秒以内に復元可能)。

### §3.3 戦略 3: iCloud Drive (Desktop & Documents Sync) — 主バックアップ不採用、補助同期は条件付き

**役割の限定**: 本評価では iCloud Drive を「主バックアップとしては不採用、補助同期としては条件付き許容」と位置づける。理由は (a) Markdown のバージョン履歴が事実上機能しない、(b) `.git/` ディレクトリの同期はパフォーマンス劣化と整合性破綻のリスクがあるため。SSoT 文書のエクスポート先 (リポジトリ外コピー) としては有用。



**仕様** (Apple 公式 サポート mh27887): iCloud Drive を有効化し、「Desktop と Documents フォルダ」をオプトインすると、`~/Desktop/` と `~/Documents/` の中身がクラウドと自動同期される。

**容量プラン** (日本、2026-04-25 時点):
- 無料: 5 GB
- iCloud+ 50 GB: ¥150/月
- iCloud+ 200 GB: ¥400/月 (家族共有可)
- iCloud+ 2 TB: ¥1,500/月 (家族共有可)

**復元機能**:
- 「最近削除した項目」: **30 日間** ファイル復元可。
- バージョン履歴: macOS Versions API 対応アプリ (Pages, Numbers, TextEdit) のみ。
- Markdown エディタ (VSCode, Obsidian, Cursor 等) は基本的に Versions API 非対応。

**長所**:
- ○ 設定後は完全自動。保存 = 同期。
- ○ 別 Mac / iPhone / iPad / web からアクセス可能。
- ○ 削除事故は 30 日以内なら復元可能。

**短所**:
- ▲ **goal-ai-worker (1.1 GB) は 5 GB 無料枠を即座に圧迫**。実質有料化必須。
- ▲ Markdown ファイルのバージョン履歴は **対応エディタが少なく実用性に欠ける** (これが 4/25 事故で復元元になり得なかった主因)。
- ▲ `node_modules` (数百 MB) を含めると同期帯域・容量を強く消費。**Apple 公式の除外手段は限定的** — `.nosync` 拡張子付与によるリネーム除外は **Node.js が依存解決できなくなる致命的副作用** がある (`require('react')` などが解決不能になる)。代替策はシンボリックリンク経由 (`node_modules` 実体を `~/.node_modules_iclexcl/<repo>/node_modules` 等 iCloud 外に置き、`node_modules` を symlink にする) だが、運用コストが高く本資料では非推奨。`node_modules` を含むリポジトリは **iCloud Drive 同期対象から外す方が安全**。
- ▲ 同期コンフリクトが起きると `(競合 1)` 等のサフィックスでファイルが分岐し、SSoT 性が崩れる。
- ▲ git の `.git/` ディレクトリが iCloud に置かれるとパフォーマンス劣化や不整合の報告事例あり (Apple 非サポート構成)。

**セットアップ手順** (補助同期として、SSoT 文書のみを同期する場合):
1. システム設定 → Apple Account → iCloud → iCloud Drive を ON。
2. **Desktop & Documents Sync は OFF のまま** (リポジトリ全体の同期は推奨しない、上記理由)。
3. 容量プランを **最低 200 GB (¥400/月)** にアップグレード。
4. リポジトリ外の `~/Library/Mobile Documents/com~apple~CloudDocs/SSoT_export/` を作成。
5. cron / launchd で 1 日 1 回 SSoT クラスのみ rsync コピー (例: `rsync -av lais/verify/*.md ~/Library/Mobile\ Documents/com~apple~CloudDocs/SSoT_export/`)。
6. `node_modules`、`.git/` 等の同期は絶対に行わない。

**容量計算**: Desktop 全体 + Documents で推定 10-20 GB → 200 GB プラン推奨。年額 ¥4,800。

**4/25 事故への有効性**: △ (リポジトリが Desktop & Documents Sync 配下にあれば、削除 30 日以内なら「最近削除した項目」から復元可能。ただし**「8 bytes に縮退」は削除ではなく上書き**であり、Versions API 非対応エディタの場合は前世代が存在しない可能性が高い)。

### §3.4 戦略 4: Google Drive (Drive for desktop)

**仕様** (Google 公式 サポート 2375057): Drive for desktop アプリをインストールすると、ローカルフォルダを以下のいずれかで Google Drive と同期できる。

- **Mirror モード**: ローカルとクラウドの双方向同期 (容量を 2 重に消費)
- **Stream モード**: クラウドが正本、ローカルはオンデマンド (容量節約、推奨)

**容量プラン** (Google One 日本、2026-04-25 時点):
- 無料: 15 GB (Gmail / Photos と共有)
- Basic 100 GB: ¥250/月 / ¥2,500/年
- Standard 200 GB: ¥380/月 / ¥3,800/年
- Premium 2 TB: ¥1,300/月 / ¥13,000/年

**復元機能**:
- **バージョン履歴: 30 日 または 100 世代** (どちらか先に到達したほうで自動削除、ユーザーが「永久保持」フラグを立てれば例外)。
- **ゴミ箱**: 削除後 30 日間復元可能。
- ファイル単位の `バージョンを管理` UI で世代を直接ダウンロード可能。

**長所**:
- ◎ **バージョン履歴 30 日が標準で動く** (Markdown ファイルでも有効。これが iCloud との決定的な差)。
- ◎ Web UI からも世代復元可能。
- ◎ Mirror モードならフルバックアップとして機能。
- ◎ 共有リンクで PO 以外との共有も容易 (必要時)。

**短所**:
- ▲ Google アカウント必須 (PO は持っているが、有料化が必要)。
- ▲ Drive for desktop アプリのインストール + 認証が必要。
- ▲ Mirror モードでは容量を 2 重消費。
- ▲ `.git/` ディレクトリの同期は iCloud と同様に推奨されない。
- ▲ バックアップ専用フォルダを別途用意する運用が望ましい (例: `~/Drive/goal-ai-worker-backup/`)。

**セットアップ手順** (SSoT エクスポート方式、推奨):
1. https://www.google.com/drive/download/ から Drive for desktop をダウンロード。
2. Google アカウント (PO の Gmail) で認証。
3. **リポジトリは同期対象に含めない** (`.git/` 同期によるロックファイル不整合を回避)。
4. 代わりに **Google Drive 実マウントポイント配下** に `SSoT_export/` フォルダを作成。マウントポイントは macOS では通常 `~/Library/CloudStorage/GoogleDrive-<メールアドレス>/` (Drive for desktop インストール後に自動生成)。`~/GoogleDrive/` のような単なるホーム配下のディレクトリではクラウドへ同期されないので注意。マウントポイント確認コマンド: `ls ~/Library/CloudStorage/ | grep GoogleDrive`
5. launchd / cron で 1 日 1 回 (または `fswatch` で変更検知時) SSoT クラスのみ rsync 片方向コピー:
   ```
   # 送信元はディレクトリ自体、フィルタで .md だけを対象に。
   # ワイルドカード展開を避けて --delete を確実に動作させる。
   rsync -av --delete \
     --include='*/' --include='*.md' --exclude='*' \
     /Users/futoshi/Desktop/goal-ai-worker/lais/verify/ \
     ~/Library/CloudStorage/GoogleDrive-<EMAIL>/SSoT_export/lais_verify/
   ```
6. Google One 200 GB (¥380/月) にアップグレード (SSoT のみなら 100 GB ¥250/月でも可)。

**容量計算**: 1.1 GB (goal-ai-worker) + 余裕 → 200 GB プラン推奨。年額 ¥3,800 (iCloud と同等価格、バージョン履歴で優位)。

**4/25 事故への有効性**: ◎ (バージョン履歴 30 日が Markdown でも動くため、`8 bytes 縮退` 後も Web UI から前世代を即時復元可能)。

### §3.5 戦略 5: iCloud バージョン履歴 (macOS Versions API)

**仕様**: macOS 10.7 Lion 以降で導入された OS レベルのバージョン履歴 API。NSDocument ベースのアプリ (Pages, Numbers, Keynote, TextEdit, Preview など) が保存時に自動的に世代を作成し、ファイル → 元に戻す → すべてのバージョンをブラウズ から復元可能。

**長所**:
- ○ 完全無料。容量はファイルシステム内に圧縮保存。
- ○ 対応アプリでは追加設定不要。

**短所**:
- × **本プロジェクトで使う Markdown エディタ (VSCode, Cursor, Obsidian, Vim 等) はほぼ全て NSDocument ベースではない**。よって Versions API が動作しない。
- × 対応アプリでも、ファイルが他アプリで上書きされると履歴が切れる場合がある。
- × 移行・コピーで履歴が消失することがある。

**セットアップ手順**: 不要 (対応アプリでは自動)。

**4/25 事故への有効性**: × (Markdown ファイルが Versions 非対応エディタで編集されたため、前世代が記録されていなかった。これが事故の直接原因の 1 つ)。

---

## §4 PO 環境への適用可否

### §4.1 現状調査結果 (2026-04-25 実測)

| 項目 | 状態 | 確認コマンド |
|---|---|---|
| Time Machine 設定 | **未設定** (`Running = 0`、ドメイン不在) | `tmutil status` / `defaults read com.apple.TimeMachine` |
| 外部バックアップディスク | 未接続 (推定) | `diskutil list` 要確認 |
| iCloud Drive 起動 | ◎ 起動中 (`~/Library/Mobile Documents/` 存在) | `ls ~/Library/Mobile\ Documents/` |
| iCloud Desktop & Documents Sync | **無効** (`com~apple~CloudDocs/Desktop` 不在) | `ls ~/Library/Mobile\ Documents/com~apple~CloudDocs/` |
| iCloud 容量プラン | 不明 (5 GB 無料か iCloud+ かは要確認) | システム設定 → Apple Account |
| Google Drive アプリ | **未インストール** (`~/Library/CloudStorage/` に Google エントリ無し) | `ls ~/Library/CloudStorage/` |
| Git tracking | 部分的 (lais/verify は 4/25 commit 61b98d5 で tracked 化済) | `git ls-files \| wc -l` → 386 |
| ディスク空き容量 | 200 GB 空き / 460 GB 全体 | `df -h /` |

### §4.2 各戦略の適用可否

| 戦略 | PO 環境で即実行可? | 必要セットアップ時間 | 月額追加コスト |
|---|---|---|---|
| 1. Git tracking 改善 | ◎ 即可 | 5 分 (gitignore 整備 + pre-commit hook) | ¥0 |
| 2. Time Machine | △ 外部 SSD 購入後可 | SSD 購入 1 日 + 設定 30 分 | ¥0 (初期 ¥10,000-15,000) |
| 3. iCloud Drive | △ 容量拡張後可 (5 GB 不足) | 15 分 + 同期完了待ち | ¥400/月 (200 GB) |
| 4. Google Drive | △ アプリ導入後可 | 30 分 (インストール + 認証 + 同期) | ¥380/月 (200 GB) |
| 5. iCloud Versions | × Markdown エディタが非対応 | - | - |

---

## §5 復元シミュレーション (4/25 事故が起きた時、各戦略で何分で復元可能か)

**前提**: 2026-04-25 13:00 ごろ、`lais/verify/dev_system_v34_package.md` が 8 bytes に縮退。検出は 30 分後 (13:30、レビュー時)。各戦略がもし稼働していたらの復元時間。

| 戦略 | 復元可否 | 復元時間 | 復元手順 | 残存リスク |
|---|---|---|---|---|
| 1. Git tracking (改善後) | ◎ | **30 秒** | `git checkout HEAD -- lais/verify/dev_system_v34_package.md` | 直前 commit 以降の作業ロス (commit 頻度に依存) |
| 2. Time Machine | ◎ | **2-3 分** | Finder で対象ファイル選択 → Time Machine 起動 → 12:00 世代を選択 → 復元 | 直近 1 時間の作業ロス (最悪) |
| 3. iCloud Drive (Sync 有効時) | △ | 5-10 分 | iCloud.com → 設定 → ファイル復元 (ただし Versions 履歴がないため、削除のみ復元可。上書きは不可の可能性あり) | 上書き型破損には無力 |
| 4. Google Drive (SSoT エクスポート方式) | ◎ | **1-2 分** | drive.google.com → SSoT_export フォルダ → 対象ファイル → バージョンを管理 → 12:30 世代をダウンロード → `diff` で確認後にリポジトリへコピー | リポジトリ丸ごと同期しないため、`.git/` 競合は発生しない |
| 5. iCloud Versions | × | 復元不可 | (Markdown エディタが Versions 非対応のため履歴が存在しない) | - |
| **実際の復元 (手動再構築)** | × | **4-6 時間** | 起点 `r2_1_1_package.md` から PATCH-1〜27 を手動再反映 + 副次破損修正 | 完全再現性の検証コスト |

**結論**: 戦略 1 + 戦略 2 + 戦略 4 のいずれか 1 つでも稼働していれば、**復元時間は数分以内に短縮**できた。実損 4-6 時間は完全に回避可能だった。

---

## §6 推奨案

### §6.1 最適 (Phase 1 即実装)

**戦略 1: Git tracking 改善 (untracked 撲滅 + pre-commit hook)**

理由:
1. 既設定。**追加コスト ¥0、追加機材なし、即時実行可能**。
2. 4/25 事故の本質的原因 (untracked) を直接解決する。
3. dev-system v3.5 の `§2.25 ADV 行動規範` (証拠ベース、SSoT 単一ソース) と完全に整合。
4. diff レビューと commit 履歴が ADV プロトコルの監査ログとしても機能。

**実装最低ライン**:
- `.gitignore` を見直し、`lais/`, `instructions/`, `docs/`, `templates/` 配下の `*.md` を全て tracked 化。
- `.git/hooks/pre-commit` で「8 bytes 未満の `.md`」検知。
- 1 日 1 回 (例: 18:00) `git status` を `logs/git_status_audit.log` に記録する launchd エージェント。

### §6.2 次善 (Phase 2 並行運用)

**戦略 2: Time Machine (外部 SSD 購入後)**

理由:
1. 1 時間毎の自動世代管理が **git tracking の盲点 (commit 前のローカル編集) を完全にカバー**。
2. Apple 公式推奨で、復元 UI が直感的。Finder ベースで PO 操作負荷が低い。
3. 1 回 ¥10,000-15,000 の初期費用のみ、ランニング ¥0。
4. リポジトリ以外 (システム全体) も保護できる副次効果が大きい。

**追加効果**: 4/25 のような上書き型事故にも 1 時間以内なら最小ロスで復元可能。

### §6.3 並行運用案 (推奨構成、Phase 2 完了後)

```
[防衛 1] Git tracking (untracked 撲滅、pre-commit hook 検知)
          → 対象: リポジトリ全体 (作業ディレクトリそのもの)
[防衛 2] Time Machine (1 時間毎自動世代、外部 SSD 1 TB)
          → 対象: Mac システム全体 (リポジトリを含む)
[防衛 3] Google Drive (任意、SSoT クラスのみ別フォルダに片方向コピー、バージョン履歴 30 日)
          → 対象: lais/verify/*.md などの SSoT 文書「のみ」
          → 場所: ~/Library/CloudStorage/GoogleDrive-<EMAIL>/SSoT_export/ (Drive for desktop マウントポイント、リポジトリ外)
          → 同期方式: rsync 片方向 (リポジトリ → エクスポート、逆方向はしない)
```

**重要 — 役割の切り分け**: 防衛 3 (Google Drive) では「リポジトリ丸ごと同期」は**しない**。理由は `.git/` ディレクトリ同期によるロックファイル不整合・参照破損のリスク。代わりに、launchd / cron で SSoT クラス文書のみを片方向 `rsync` で別フォルダに複製し、Google Drive はその「エクスポート先」として運用する。復元時は Web UI から世代を取得し、`diff` で確認後に Git 管理下の作業ツリーへ手動コピーする。

各防衛線が独立に稼働するため、単一の障害では全層を貫通できない。

- **防衛 1 が破られる条件**: untracked のまま破損 (4/25 と同じ)。pre-commit hook で予防。
- **防衛 2 が破られる条件**: 外部 SSD が物理損壊 + 1 時間以上気付かず。
- **防衛 3 が破られる条件**: ネットワーク断 + Google アカウント停止。

3 層同時破綻はほぼあり得ない。

### §6.4 役割限定案 / 不採用案

評価軸を分解した採否一覧:

| 戦略 | 上書き破損への復元力 | 削除事故への復元力 | Git リポジトリとの相性 | 導入コスト | 結論 |
|---|---|---|---|---|---|
| 3. iCloud Drive (Desktop & Documents Sync) | × Versions 不動作 | ○ 30 日復元 | × `.git/` 同期非推奨 | △ ¥400/月 | **主バックアップとしては不採用**、SSoT 文書の rsync エクスポート先としてのみ条件付き許容 (リポジトリ全体同期は禁止) |
| 5. iCloud Versions | × Markdown エディタ非対応 | - | - | - | **不採用**: VSCode / Cursor 等が NSDocument 非対応のため技術文書に不適 |

**注**: 戦略 3 を「全否定」せず役割限定する理由は、後日 PO がメモ用途や写真共有で iCloud Drive を活用する可能性を残すため。リポジトリ用途では使わないが、副次用途では引き続き有効。

---

## §7 セルフセットアップ手順 (PO 向け、最適案 = 戦略 1 + 戦略 2)

### §7.1 戦略 1: Git tracking 改善 (5 分、即実行可)

**重要 — 既存 hook の保護**: 本リポジトリには **既に高機能な `.git/hooks/pre-commit` が存在する** (G10 secret scan / G14 spec_first / G18 chain_update_audit / external_review_precommit など)。`cat > .git/hooks/pre-commit` で上書きすると **既存ゲートが全消失する破壊的事故になる**。以下の手順は「既存 hook に追記する」方式で記述する。

```bash
# 1. 作業ディレクトリへ
cd /Users/futoshi/Desktop/goal-ai-worker

# 2. 既存 pre-commit hook をバックアップ (絶対必須)
cp -p .git/hooks/pre-commit .git/hooks/pre-commit.bak.$(date +%Y%m%d_%H%M%S)
ls -la .git/hooks/pre-commit*

# 3. SSoT 級ディレクトリの untracked を洗い出し
git ls-files --others --exclude-standard \
  -- 'lais/**/*.md' 'instructions/**/*.md' 'docs/**/*.md' 'templates/**/*.md' \
  > /tmp/untracked_ssot.txt
cat /tmp/untracked_ssot.txt

# 4. 全て tracked 化 (内容確認後)
git add lais/ instructions/ docs/ templates/
git commit -m "Phase D: untracked SSoT 撲滅 (4/25 再発防止)"

# 5. 8 bytes 未満 .md 検知ロジックを「追記」する独立 hook ファイルを作成
#    既存の pre-commit から呼出す形にすることで、既存ゲートを破壊しない
mkdir -p scripts   # 既存環境で scripts/ が無い場合に備える
cat > scripts/byte_floor_check.sh <<'HOOK'
#!/bin/bash
# 8 bytes 未満の .md (4/25 dev_system_v34_package.md 事故の再発防止)
# 検査対象は「インデックスに登録されたオブジェクトのサイズ」(ワークツリーではない)
#   → ユーザーが add 後にワークツリーを差し替えてもすり抜けない
# パス安全性: NUL 区切り読み取り + bash 配列で特殊文字耐性 (% / \ / 空白 / 改行)
set -euo pipefail
declare -a violators=()
while IFS= read -r -d '' f; do
  [[ "$f" == *.md ]] || continue
  # ステージング済みオブジェクトのサイズを取得
  size=$(git cat-file -s ":$f" 2>/dev/null || echo 0)
  [ "$size" -lt 8 ] && violators+=("$f")
done < <(git diff --cached --name-only -z --diff-filter=AM)
if [ "${#violators[@]}" -gt 0 ]; then
  echo "ERROR: 8 bytes 未満の .md ファイルを検出 (破損疑い):"
  printf '  %s\n' "${violators[@]}"   # %s で特殊文字を安全に出力
  echo "意図的なら git commit --no-verify (非推奨) を使用。"
  exit 1
fi
HOOK
chmod +x scripts/byte_floor_check.sh

# 5b. byte_floor_check.sh 自体を git tracked 化 (untracked 撲滅の自己適用)
git add scripts/byte_floor_check.sh
git commit -m "Add scripts/byte_floor_check.sh (Phase D 再発防止 hook)"

# 6. 既存 .git/hooks/pre-commit の末尾近くに 1 行だけ追記 (既存ゲートを保護)
#    既存 hook が "exit $FAIL" 等で終了する直前に挿入する
#    手動で .git/hooks/pre-commit を開き、最終 exit の前に以下を追加:
#       BYTE_FLOOR_HOOK="$(git rev-parse --show-toplevel)/scripts/byte_floor_check.sh"
#       bash "$BYTE_FLOOR_HOOK" || exit 1
#    注 1: REPO_ROOT 変数は既存 hook 内で定義済みだが、未定義環境のため git rev-parse で安全に再取得する。
#    注 2: "|| FAIL=1" 形式ではなく "|| exit 1" にすることで、既存 hook が FAIL 変数を集約していない場合でも確実にブロックする。

# 7. 動作確認 — リポジトリ内で commit を実行してフックが発火することを確認
#    (pre-commit は git commit 時に発火するため、git add だけでは検証できない)
TESTFILE="tmp_byte_floor_test.md"
: > "$TESTFILE"   # 0 bytes ファイル作成 (8 bytes 未満)
git add "$TESTFILE"
if git commit -m "byte_floor_test (must fail)" 2>&1 | grep -q "8 bytes 未満"; then
  echo "OK: byte_floor_check.sh が発火 (commit ブロック成功)"
else
  echo "FAIL: hook が発火していない — 履歴汚染ロールバック実行"
  # フックが誤って通過した場合、テストコミットを取り消して履歴を汚染しない
  git log -1 --format=%s | grep -q "byte_floor_test" && git reset --soft HEAD~1
fi
git reset HEAD "$TESTFILE" 2>/dev/null || true
rm -f "$TESTFILE"
```

**前提保証**: 上記手順 2 のバックアップが取れていない場合、手順 5-6 を実行してはならない。手順 5-6 は既存 hook を上書きしないが、誤入力に備える。

### §7.2 戦略 2: Time Machine (30 分、外部 SSD 購入後)

**事前準備**:
- USB-C / Thunderbolt 接続の SSD (推奨 1 TB、¥10,000-15,000)。
- 例: SanDisk Extreme Portable SSD 1 TB / Samsung T7 1 TB / Crucial X9 1 TB。

**手順**:

1. **SSD を Mac に接続**して認識を確認:
```bash
diskutil list | grep "external" -A 5
```

2. **ディスクユーティリティで初期化**:
   - アプリケーション → ユーティリティ → ディスクユーティリティ
   - 接続した SSD を選択 → 「消去」
   - 名前: `TimeMachine_PO`
   - フォーマット: **APFS** (大文字小文字を区別しない)
   - 方式: **GUID パーティションマップ**
   - 「消去」をクリック

3. **Time Machine 設定**:
   - システム設定 → 一般 → Time Machine
   - 「+ バックアップディスクを追加」
   - `TimeMachine_PO` を選択
   - 「ディスクを暗号化」を ON 推奨 (パスワード設定)
   - 「自動的にバックアップ」を ON

4. **除外項目を設定** (ディスク容量節約):
   - 同画面で「オプション」をクリック
   - 「+」で以下を除外:
     - `~/Desktop/goal-ai-worker/node_modules`
     - `~/Desktop/goal-ai-worker/frontend-dist`
     - `~/Desktop/goal-ai-worker/.wrangler`
     - `~/Desktop/goal-ai-worker/.netlify`
     - `~/Library/Caches`

5. **初回バックアップを実行** (数時間〜半日):
```bash
tmutil startbackup
# 進捗確認
tmutil status
```

6. **動作確認**:
```bash
# バックアップが完了したか
tmutil latestbackup
# スナップショット一覧
tmutil listbackups | head -5
```

7. **復元テスト** (重要):
   - 適当なテストファイルを編集 → 1 時間以上待機
   - Finder でファイルを選択 → メニューバーの Time Machine アイコン → 「Time Machine に入る」
   - 過去世代を選択 → 「復元」
   - テストファイルが元に戻ることを確認 → 復元手順が PO 単独で実行できることを確認

**運用ルール**:
- SSD は **常時接続** が理想 (電源 ON で自動バックアップ)。
- 週 1 回は SSD を取り外し、別保管 (火災・盗難対策、3-2-1 ルール)。
- `tmutil status` を月 1 回確認し、`Running = 0` が異常に長く続いていないか監視。

---

## 付録 A: 公式情報源

| 戦略 | URL | 取得日 |
|---|---|---|
| Git ベストプラクティス | https://git-scm.com/book/en/v2 (Pro Git 2nd ed.) | 一次情報 |
| Time Machine | https://support.apple.com/guide/mac-help/back-up-your-files-with-time-machine-mh11421/mac | 2026-04-25 (Apple 公式) |
| iCloud Drive | https://support.apple.com/guide/mac-help/use-icloud-drive-to-store-documents-mh27887/mac | 2026-04-25 (Apple 公式) |
| iCloud 容量プラン | https://support.apple.com/icloud (iCloud+) | 2026-04-25 (Apple 公式) |
| Google Drive for desktop | https://support.google.com/drive/answer/2375057 | 2026-04-25 (Google 公式) |
| Google One プラン | https://one.google.com/about/plans | 2026-04-25 (Google 公式) |
| macOS Versions API | https://developer.apple.com/documentation/appkit/nsdocument | Apple Developer 公式 |

**注**: §2.25.12 (証拠ベース、ブログ / SNS 不可) に従い、上記 URL はすべて公式一次情報。価格は 2026-04-25 時点の公開額で、改定・為替変動の可能性あり。

## 付録 B: 4/25 事故の git commit 履歴

| Commit | 日時 | 内容 |
|---|---|---|
| `61b98d5` | 2026-04-25 14:44 | 破損 package.md 復元 (3,123 行) + v3.4-v3.5 SSoT git track |
| `60653ab` | 2026-04-25 (中間) | docs(v3.4/v3.5): SSoT 整合 - 5 状態 STATUS / DEPLOY-RECOVER 廃止 |
| `a651ec8` | 2026-04-25 15:09 | レンダリング副次破損修正 (HTML エンティティ 19 + 1-liner / table 退化) |

**復元総時間**: 14:44 起点 → 15:09 完了 ≒ 25 分 (commit 発火基準)。実作業は前段階の手動再構築含め 4-6 時間。

---

**End of Document**
