# Lais デザイン仕様書 v1.0（Phase A）

> **ステータス:** v1.0 DRAFT（2026-04-14作成）
> **対象:** Phase A コア10画面（S-00 / S-01 / S-02 / S-10 / S-12 / S-13 / S-14 / S-15 / S-20 / S-30）
> **上位仕様:**
> - docs/plans/lais_project_v1.md v1.4 CONFIRMED
> - docs/plans/lais_ux_v1.md v1.15 CONFIRMED
> - docs/plans/lais_design_system.md v0.12（トークン原本）
> **参照:** docs/mockups/*.html（10画面の承認済みモックアップHTML）
>
> **本書の位置づけ:** モックアップHTMLを「唯一の正」としつつ、その視覚構造をトークン参照のテキスト仕様として確定する。Phase 4実装は本書をチェックリストとして使用する。
>
> **本書の範囲外:** トークン定義（design_system.md）、画面遷移フロー（ux_v1.md）、事業仕様（project_v1.md）。本書は既存仕様書への「リンク集＋画面別レイアウト固定」である。

---

## 目次

1. スコープと使い方
2. デザイン原則サマリ（Night Sky Journey）
3. トークン参照（ショートカット）
4. 画面別デザイン仕様
   - 4.1 S-00 Splash
   - 4.2 S-01 Sign-up
   - 4.3 S-02 Onboarding
   - 4.4 S-10 GROW
   - 4.5 S-12 Task Add（ハーフモーダル）
   - 4.6 S-13 Task Detail（ハーフモーダル / インライン編集）
   - 4.7 S-14 Goal Detail（フルスクリーン）
   - 4.8 S-15 Goal Create（ハーフモーダル）
   - 4.9 S-20 TALK
   - 4.10 S-30 ME Profile
5. 共通コンポーネント
6. インタラクション・モーション統一規定
7. Phase 4 実装時対応リスト（残存CRITICAL 17件 + 派生TODO）
8. 変更履歴

---

## 1. スコープと使い方

### 1.1 Phase A の定義

Phase A は Lais v0.1.0 MVP の**コア10画面**である。これら10画面が揃えば、ユーザーは次の最小ジャーニーを実行できる:

> サインアップ → オンボーディング → GROW でタスクとゴールを操作 → TALK で AI と対話 → ME で自分を確認

Phase B（Settings/Calendar/Friends/Discover/Shop 等 ~15画面）および Phase C（Error/Empty/Offline/PasswordReset 等 ~16画面）は本書の対象外であり、実装と並行して ADV が別仕様書で定義する。

### 1.2 本書の使い方

1. **実装者**: 4章の該当画面を開き、記載された構造・サイズ・トークン参照に従って実装する。モックアップHTMLは補助的なビジュアルリファレンスとして参照する（モックアップと本書が矛盾した場合は、本書が優先される。ただし矛盾を発見したら提案ログへ記録して Code/ADV の調停を依頼すること）。
2. **レビュアー**: 4章の各項目がチェックリスト代わりとなる。未記載のUI要素が実装に存在する場合は「仕様外追加」として提案ログへ報告する。
3. **テスト作成者**: 4章の「検証可能なスクショ事実」の記述（座標・色・サイズ）を AT/VRT のアサーションに転写する。

### 1.3 矛盾発生時の優先順位

> lais_project_v1.md（事業仕様）> lais_ux_v1.md（UX要求）> lais_design_system.md（トークン定義）> 本書（画面別仕様）> docs/mockups/*.html（視覚参考）

本書が上位仕様と矛盾した場合、本書を修正する。モックアップHTMLが本書と矛盾した場合、モックアップを修正する（ただし修正は ADV 権限。Code は提案ログ経由）。

---

## 2. デザイン原則サマリ（Night Sky Journey）

> 詳細は lais_design_system.md §1 〜 §2 を参照。本章は画面設計時に即座に参照する短縮版。

### 2.1 ブランド DNA

**スローガン:** 「洗練して生きよう。憧れの姿になるように。」

**体感メタファー:** 月明かりの下で静かにジャーナルを書いている感覚。Apple Reminders (dark) と GitHub Dark を情緒の参照点とする。

### 2.2 設計原則（優先順）

1. **実世界との地続き感** — 自然・文化モチーフ（桜、祭り、ベルベット）を下地にする。ネオン・サイバーパンク・メタリックグラデーションは禁止。
2. **洗練と親しみの同居** — 「よく行くカフェの心地よさ」が基準。高級ブランド風の重さは避ける。
3. **構造的ゲーミフィケーション** — ゲーム画面風の装飾は出さない。EXP/レベルは静かに情報として伝える。
4. **ユーザーの自己表現** — 4テーマ＋アバターで「自分のアプリ」化できる余地を残す。
5. **静かな情報設計** — 1画面1目的。サマリー→タップで詳細展開。

### 2.3 Open Air レイアウト原則

- **カードで囲まない** — 余白と薄いボーダーで区切る。カード in カード（ネストコンテナ）禁止。
- **縦のジャーナル動線** — 主要画面は縦スクロール。横スワイプは同列タブ切替のみ。
- **呼吸のリズム** — タスク行間 ≧ `--space-sm`、独立カード間 ≧ `--space-lg`、セクション間 ≧ `--space-xl`。

### 2.4 NG リスト（抜粋）

- 紫→青グラデーション（AI slop 定番）
- ネオンカラー on ダーク背景
- 純黒 `#000000` / 純白 `#FFFFFF` のベタ使用
- Inter / Roboto / Arial の明示指定
- カスタムWebフォント読み込み
- ease-in-out の長時間装飾アニメーション
- パルス・グロー・フロート系の装飾アニメーション
- 3列以上のグリッドカード（モバイル）

完全版は lais_design_system.md §9 を参照。

---

## 3. トークン参照（ショートカット）

> 本章のすべての数値・色は lais_design_system.md v0.12 が定義する CSS 変数を参照する。ハードコード HEX を実装に書くことは禁止。

### 3.1 カラー（Night Sky デフォルトテーマの参考値）

> **重要:** 下表に示す HEX / rgba は **Night Sky テーマ 1 つの具体値のみ** のリファレンスである。実装者はこれらの値をコードに直書きしてはならない。実際の値は `lais_design_system.md v0.12` の各テーマブロック（Night Sky / Dawn / Harajuku Light / Harajuku Dark）で定義されており、`[data-theme="..."]` 属性により自動で差し替わる。**本書の rgba 値（例 `rgba(121,192,255,0.14)`）はあくまで Night Sky 時に算出される結果であり、他のテーマでは別の RGB 成分を持つ `--accent-subtle` が適用される**。subtle 系トークン（`--accent-subtle` / `--success-subtle` 等）はテーマごとにアクセント色の RGB 成分が異なるため、透過率のみ `0.14` / `0.12` を共通ルールとして保ち、RGB 部分はテーマの accent / success 色からテーマ側で合成される。

| トークン | 値（Night Sky 時の参考値） | 用途 |
|---|---|---|
| `--bg-primary` | `#0D1117` | 画面背景 |
| `--bg-surface` | `#161B22` | モーダル / タブバー背景 |
| `--bg-elevated` | `#1C2128` | 浮き上がるエレベーテッド面 |
| `--border` | `#484F58` | 装飾的な薄ボーダー |
| `--border-strong` | `#6E7681` | インタラクティブ境界 |
| `--text-primary` | `#E6EDF3` | 見出し・本文主 |
| `--text-secondary` | `#9BA7B4` | 補助テキスト |
| `--text-muted` | `#7A8593` | 3次テキスト（キャプション・時刻 etc） |
| `--accent` | `#79C0FF` | ブランド・リンク・選択状態 |
| `--accent-subtle` | `rgba(121,192,255,0.14)` | 選択ピル背景・プログレスバー背景 |
| `--accent-hover` | `#A5D6FF` | ホバー状態のみ（カテゴリ色流用禁止） |
| `--button-primary-bg` | `#1A5FC8` | プライマリCTA背景（白文字で 5.99:1） |
| `--success` | `#3FB950` | 完了・ポジティブ |
| `--success-subtle` | `rgba(63,185,80,0.12)` | 完了状態の背景 |
| `--warning` | `#D29922` | 期限接近・注意 |
| `--danger` | `#F85149` | 削除・危険 |
| `--danger-solid` | `#DA3633` | 破壊的ボタン背景（白文字で AA） |
| `--info` | `#58A6FF` | 情報 |

**カテゴリ色（Phase A 用、Phase 4 で DS 拡張予定）:**

| 用途 | トークン（仮） | 値 |
|---|---|---|
| 副業・仕事 | `--cat-work` | `#58A6FF` |
| 健康・習慣 | `--cat-health` | `#E8A855` |
| 学習 | `--cat-learn` | `#A5D6FF`（※ Phase 4 で専用色へ分離。§7 G-1 参照） |

### 3.2 タイポグラフィ

- **ファミリー:** `-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif`（Inter / Roboto / Arial 禁止）
- **スケール:** 11 / 14 / 16 / 20 / 28 / 36 / 48 px の離散 7 段。**これ以外の値の使用禁止**（12 / 13 / 15 / 18 / 22 / 24 px は本書全域で出現しない）
- **ウェイト:** `200`（font-size-2xl `36px` 以上のみ許可）/ `400`（本文・見出し既定）/ `600`（強調見出し・ラベル）
- **日本語文字詰め:** `letter-spacing: -0.02em`（本文）/ `-0.5px`（画面タイトル 28px）
- **英字ラベル詰め:** `letter-spacing: 1.5px; text-transform: uppercase`（TODAY / GOALS / TASK / EXPLORER 等の11px 英字ラベル）
- **line-height:** 本文 `1.7`（日本語）/ 見出し `1.35` / ラベル `1.0`

### 3.3 スペーシング

- `--space-xs: 4px` / `--space-sm: 8px` / `--space-md: 16px` / `--space-lg: 24px` / `--space-xl: 32px`（セクション間）/ `--space-2xl: 40px` / `--space-3xl: 64px`
- **画面左右パディング（モバイル）:** `--space-lg` (`24px`) 固定
- **タスク行間:** `8px`（§4.2 の「呼吸するリズム」規定）
- **セクション間:** `32px`（§4.2 改定後の値）

### 3.4 角丸

- `--radius-sm: 4px` — チェックボックス内部
- `--radius-md: 8px` — 入力フィールド・タスクカード
- `--radius-lg: 12px` — ボタン・モーダル上端
- `--radius-pill: 999px` — ピル・プログレスバー

### 3.5 モーション

| トークン | 値 | 用途 |
|---|---|---|
| `--spring-default` | `cubic-bezier(0.175, 0.885, 0.32, 1.1)` | 一般的な展開・出現 |
| `--spring-bouncy` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | レベルアップ・達成演出 |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | 画面遷移・モーダル上昇 |
| `--duration-fast` | `200ms` | タップフィードバック |
| `--duration-normal` | `350ms` | 画面遷移・展開 |
| `--duration-slow` | `500ms` | EXP バー伸長 |
| `--duration-celebration` | `800ms` | レベルアップ |

**禁止:** `ease-in-out` を 300ms 以上の装飾に使うこと。

### 3.6 最小タップ領域

すべてのタップ要素は `min-width: 44px; min-height: 44px`（WCAG 2.5.5 AAA）。本書では各画面のボタン記述でこの制約を繰り返さない（共通制約）。

### 3.7 z-index 階層

> 本書では以下のトークンを使い、実装での直接的な数値指定を禁止する。トークンは `lais_design_system.md v0.13` で追加する（§7 D-4）。

| トークン | 値 | 用途 | 例 |
|---|---|---|---|
| `--z-base` | `0` | 通常のフロー内要素 | 画面本体、タスク行、ゴール行 |
| `--z-sticky` | `100` | ヘッダ / ボトムタブバー | S-20 ヘッダ (S20-1)、全画面のボトムタブバー（§5.1） |
| `--z-drawer` | `200` | 左右ドロワー | S-20 履歴ドロワー |
| `--z-overlay` | `300` | モーダル背景オーバーレイ | `rgba(0,0,0,0.6)` のバックドロップ |
| `--z-modal` | `400` | モーダル本体 | S-12 / S-13 / S-15 / S-41 |
| `--z-snackbar` | `500` | Undo スナックバー | §5.9 |
| `--z-toast` | `600` | トースト | §5.10 |
| `--z-popover` | `700` | ドロップダウン・ツールチップ | ゴール選択ドロップダウン等 |
| `--z-tooltip` | `800` | ネイティブ ツールチップ（reserved） | — |

**階層原則:**
- モーダルが開いていても、スナックバーとトーストはモーダルの上に表示される（操作結果通知はモーダル内操作後も見える必要があるため）
- ドロワーはモーダルより下。ドロワー表示中にモーダルが開いた場合、モーダルが上に載る
- ボトムタブバーはドロワー / モーダル / スナックバーより下（キーボード表示時は非表示。§5.1）

### 3.8 シャドウスケール

> 本書では以下のトークンを使い、`box-shadow` の数値直書きを禁止する。トークンは `lais_design_system.md v0.13` で追加する（§7 D-4）。

| トークン | 値（Night Sky 参考値） | 用途 |
|---|---|---|
| `--shadow-none` | `none` | 既定（Open Air 原則のため、装飾シャドウは使わない） |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.35)` | わずかな浮き上がり（ピル active 等） |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.45)` | スナックバー / トースト |
| `--shadow-lg` | `0 -4px 16px rgba(0,0,0,0.55)` | ハーフモーダル上端（下から上への光源想定で上向きシャドウ） |
| `--shadow-drawer` | `4px 0 16px rgba(0,0,0,0.55)` | 左ドロワー（右向きシャドウ） |

**使用原則（Open Air に基づく）:**
- 既定は `--shadow-none`。要素を「浮かせる」必要があるときだけシャドウを使う
- カードやタスク行には**シャドウを付けない**（ボーダー/余白で区切る）
- Dawn / Harajuku Light テーマでは不透明度を下げた alpha 値を DS 側で定義する
- シャドウのみで階層を表現せず、必ず余白と共に使う

---

## 4. 画面別デザイン仕様

各画面は次の共通構造で記述する:

- **目的 / UX参照**
- **画面タイプ**（フルスクリーン / タブ画面 / ハーフモーダル / インラインパネル）
- **セクション順序**（上→下、ID付きで列挙）
- **各セクションの要素仕様**（サイズ・トークン・タイポ）
- **状態・インタラクション**
- **検証可能なスクショ事実**（AT/VRT 用の客観基準）
- **Phase 4 対応リスト参照**（§7 にひも付ける残存課題のインデックス）

### 4.1 S-00 Splash

- **目的 / UX参照:** アプリの入口、ブランド認知。ux_v1.md §1.1
- **画面タイプ:** フルスクリーン（375×812 基準）
- **レイアウト原則:** 上下中央集約。下 140px にCTAスタック。

**セクション順序:**

1. ロゴ `Lais`（中央）
2. ブランドステートメント（ロゴ直下）
3. CTA スタック（画面下）

**要素仕様:**

| ID | 要素 | 位置・サイズ | タイポ / カラー |
|---|---|---|---|
| S00-1 | ロゴ `Lais` | 画面中央から上に 60px（= Y ≈ 340） | font-size `48px`（離散スケール） / font-weight `600` / letter-spacing `3px` / color `--accent` / line-height `1` |
| S00-2 | ステートメント「あなたの人生を、あなたらしく」 | ロゴ直下、`margin-top: 16px` | font-size `14px` / weight `400` / color `--text-muted` / letter-spacing `var(--letter-spacing-ja)` / line-height `var(--line-height-ja-body)` |
| S00-3 | CTA「はじめる」 | 画面下端から上 `140px + env(safe-area-inset-bottom)`、左右 `--space-lg` | min-height `52px`（長ラベル/拡大時の伸縮許可） / 背景 `--button-primary-bg` / 文字 `#FFFFFF` / font-size `16px` weight `600` / letter-spacing `var(--letter-spacing-ja)` / line-height `1.25` / radius `--radius-lg` / 状態: `:disabled` / `[aria-disabled="true"]` で `--button-disabled-bg` / `--button-disabled-text` / `pointer-events:none` |
| S00-4 | CTA「ログイン」 | S00-3 の下 `12px` | min-height `52px` / border `1px solid --border-strong` / 文字 `--text-primary` / font-size `16px` weight `400` / letter-spacing `var(--letter-spacing-ja)` / line-height `1.25` / radius `--radius-lg` |

**低画面高フォールバック (`max-height: 560px`):** 中央塊と下部CTAのabsolute配置が衝突する画面高（横向き/小型端末）では、`.s00` を縦flex `space-between` に切替え、`.s00-center` と `.s00-cta` を通常フローに戻す。セーフエリア（`env(safe-area-inset-*)`）を尊重する。

**禁止要素:** 星屑パーティクル・背景グラデーション・紫系の装飾（現モックアップには星屑 SVG が残っているが、CRITICAL G-7 で Phase B へ吸収予定。§7 D-1 参照）。

**状態・インタラクション:**

- CTA タップ → `--duration-fast` `scale(0.98)` のタップフィードバック → 画面遷移（ease-out / 350ms）
- 「はじめる」→ S-01（初期モード: サインアップ）
- 「ログイン」→ S-01（初期モード: ログイン）
- Phase A では S-01 が認証画面を兼ねる。画面上部タイトルとCTA文言が初期モードに応じて `アカウントを作成 / サインアップ` または `ログイン / ログイン` に切替わる（同一レイアウト、モード差分のみ）。専用ログイン画面 (S-05 想定) は Phase B で分離予定

**検証可能なスクショ事実:**

- ロゴ `Lais` が画面中央 X ≈ 188, Y ≈ 340 付近に1個だけ存在
- ロゴ色が `--accent` トークン相当（#79C0FF）
- CTA 2つが画面下端から 140px 以内に縦 2 段で並ぶ
- CTA「はじめる」の背景が `--button-primary-bg` 相当
- CTA「ログイン」の背景が透明、border 1px

---

### 4.2 S-01 Auth（サインアップ / ログイン共通）

- **目的 / UX参照:** 新規アカウント作成およびログイン。Phase A では 1 画面が両モードを兼ねる。ux_v1.md §1.2
- **画面タイプ:** フルスクリーン（縦スクロール）
- **レイアウト原則:** ノッチ下から `padding-top: 60px` で上詰め。左右 `--space-lg`。
- **モード:**
  - `signup`（初期。S-00「はじめる」からの遷移先）: タイトル `アカウントを作成` / CTA `サインアップ` / 同意チェック必須 / フッタリンク `ログインはこちら` → mode=`login`
  - `login`（S-00「ログイン」からの遷移先）: タイトル `ログイン` / CTA `ログイン` / 同意チェック非表示 / フッタリンク `新規登録はこちら` → mode=`signup`
- 本書 §4.2 では signup モードのレイアウトを正として記載する。login モードは S01-7 同意チェックブロック非表示 + S01-2 / S01-9 / S01-10 の文言差し替えのみで、他のフィールド構造は同一。
- **パスワードリセットリンクは Phase A では実装しない**（Phase B で専用画面 S-05 として分離予定。本書の対象外）。本書にはリンク自体を定義しない。

**セクション順序:**

1. ロゴ（ヘッダ）
2. 画面タイトル
3. Email 入力
4. Password 入力
5. 利用規約同意チェック
6. プライマリ CTA「サインアップ」
7. セカンダリリンク「ログインはこちら」

**要素仕様:**

| ID | 要素 | 位置・サイズ | タイポ / カラー |
|---|---|---|---|
| S01-1 | ロゴ `Lais` | 上部 `padding-top: 60px` / 中央揃え | font-size `28px` / weight `600` / letter-spacing `3px` / color `--accent` |
| S01-2 | タイトル「アカウントを作成」 | ロゴ下 `--space-xl` | font-size `20px` / weight `400` / color `--text-primary` |
| S01-3 | ラベル「メールアドレス」 | セクション上 / margin-top `--space-lg` | font-size `11px` / weight `600` / color `--text-muted` / uppercase / letter-spacing `1.5px` |
| S01-4 | Email 入力 | ラベル下 `--space-sm` / 幅 100% / 高さ `48px` | 背景 `--bg-surface` / border `1px solid --border-strong` / radius `--radius-md` / padding `0 16px` / font-size `14px` / placeholder color `--text-muted` |
| S01-5 | ラベル「パスワード」 | S01-4 下 `--space-lg` | 同 S01-3 |
| S01-6 | Password 入力 | 同 S01-4 / type=password |
| S01-6b | パスワードヒント | S01-6 下 `--space-xs` / 左揃え | font-size `11px` / weight `400` / color `--text-muted` / 文言「8文字以上」恒常表示 |
| S01-7 | 同意チェックボックス | S01-6b 下 `--space-lg` / 視覚サイズ `20×20` / **ヒット領域 44×44 以上**（周囲のラベル領域を `<label>` で包み、padding で合計タップ領域を WCAG 2.5.5 / 2.5.8 準拠に拡張） | border `1.5px solid --border-strong` / radius `--radius-sm` / チェック時 背景 `--accent` |
| S01-8 | 同意テキスト | チェックボックス右 `--space-sm` | font-size `14px` / line-height `1.7` / color `--text-secondary` / リンク部 color `--accent` underline |
| S01-9 | CTA「サインアップ」 | S01-7 下 `--space-xl` / 幅 100% / min-height `52px`（長ラベル/フォント拡大時の伸縮許可） | 背景 `--button-primary-bg` / 文字 `#FFFFFF` / weight `600` / letter-spacing `var(--letter-spacing-ja)` / line-height `1.25` / radius `--radius-lg` / disabled 時は §5.0 A のトークン（背景 `--button-disabled-bg` / 文字 `--button-disabled-text`） |
| S01-9b | サーバメッセージ表示 | S01-9 の直上、フォーム内 | `.s01-server-message` コンテナ / padding `var(--space-sm) var(--space-md)` / radius `--radius-md` / font-size `14px` / line-height `1.5` / バリアント: `.s01-server-message-error`（背景 `rgba(248,81,73,0.08)` / border `1px solid --danger` / color `--danger` / `role="alert"`）と `.s01-server-message-notice`（背景 `--accent-subtle` / border `1px solid --accent` / color `--text-primary` / `role="status"`）の2形態。認証失敗は error、メール確認待ち等の情報通知は notice |
| S01-10 | リンク「ログインはこちら」 | S01-9 下 `--space-md` / 中央揃え / min-height `44px`（タップ領域確保） | font-size `14px` / color `--accent` / underline / 実装は preact-router の `<Link>` 相当（anchor セマンティクス維持。実体は `<a>` + SPA ナビゲーション） |

**状態・インタラクション:**

- 同意チェック未選択時: S01-9 disabled（§5.0 A / `--button-disabled-*` 適用、タップ無反応、`aria-disabled="true"`）
- Email フォーマット不正時: S01-4 border → `--danger` / ラベル下に エラーテキスト（11px `--danger`）
- 送信中: S01-9 ラベル「送信中…」、モード切替リンク(S01-10)も disabled（レース防止）
- サインアップ時メール確認必須フロー（Supabase `confirm email` 有効）: `signUp` 成功しても `session` が null の場合はトップ遷移せず、S01-9b に「確認メールを送信しました」のメッセージ表示（画面遷移しない）
- ログイン時のパスワード最小長: Supabase 設定に追従（既定 6 文字）。**8 文字強制はサインアップ時のみ**
- 成功（session 取得済み）: `ease-out` / `--duration-normal` で次画面へ
- `prefers-reduced-motion: reduce`: 全 transition / transform を無効化（スプリング・scale・slide）

**検証可能なスクショ事実:**

- フォーム要素が縦 1 カラムで 6 段構成
- 入力 `S01-4`, `S01-6` の高さが 48px、背景色が `#161B22` 相当
- CTA `S01-9` 背景が `#1A5FC8` 相当、ラベル `サインアップ` が白

**Phase 4 対応:** プレースホルダー色コントラスト（A-1 / §7）

---

### 4.3 S-02 Onboarding（アバター選択ステップ）

- **目的 / UX参照:** 5 ステップオンボーディングのうち、本書ではステップ 2「アバター選択」を代表として規定する。他のステップ（名前 / 興味 / 初回ゴール / テーマ）は ADV の詳細仕様を別紙で定義。ux_v1.md §1.3
- **画面タイプ:** フルスクリーン（縦）
- **レイアウト原則:** 上部にナビ＋進捗バー、中央にタイトル＋選択肢、下端固定で「次へ」。

**セクション順序:**

1. ナビゲーション行（戻るボタン）
2. 進捗バー（5 本）
3. ステップタイトル
4. 補助テキスト
5. アバター選択肢（3 列）
6. 「次へ」CTA（固定位置）

**要素仕様:**

| ID | 要素 | 位置・サイズ | タイポ / カラー |
|---|---|---|---|
| S02-1 | ← 戻るボタン | 左上 / 44×44 タップ領域 / SVG 20×20 | stroke `--text-primary` 1.5px |
| S02-2 | 進捗バー | 左右 `--space-lg` / バー高 `3px` / 5 本 gap `8px` | radius `--radius-pill` / 未完 `--border` / 完了 `--accent` |
| S02-3 | タイトル「最初のパートナーを選びましょう」 | 進捗バー下 `--space-2xl` (`40px`) / 中央揃え | font-size `28px` / weight `400` / letter-spacing `-0.5px` / color `--text-primary` |
| S02-4 | 補助テキスト「一緒に成長するアバターです」 | タイトル下 `--space-sm` / 中央揃え | font-size `14px` / color `--text-muted` |
| S02-5 | アバター選択肢 | 中央 3 列 / 各 100×100 / gap `--space-lg` | radius `50%` / 未選択 border `1px solid --border-strong` / 選択 border `2px solid --accent` + `box-shadow: 0 0 0 4px --accent-subtle` |
| S02-6 | 「次へ」CTA | 画面下 `100px` / 幅 100% - `--space-lg*2` / 高さ `52px` | 背景 `--button-primary-bg` / 文字白 / radius `--radius-lg` |

**状態・インタラクション:**

- 進捗バーの塗りは現在ステップを含めて「完了済み」として連続表示（ステップ 2 なら 2 本塗り）
- アバター選択タップ: spring-default / scale(0.98→1.02→1) / 350ms + outer-ring フェードイン
- 「次へ」は選択あり/なしで disabled 切替え
- 「戻る」: ease-out / 350ms で 1 ステップ戻る

**検証可能なスクショ事実:**

- 進捗バーが 5 本横並びで、うち 2 本が `#79C0FF` 相当
- アバター 3 つのうち中央の1つが 2px 青ボーダー + 外周ハイライト
- 「次へ」ボタンが画面下に全幅で1つ存在

---

### 4.4 S-10 GROW（メイン / タブ #1）

- **目的 / UX参照:** 日次タスクとゴールの中心画面。ux_v1.md §2
- **画面タイプ:** タブ画面（ボトムタブ #1 active）
- **レイアウト原則:** 左右 `--space-lg` / 縦スクロール / 下端 82px タブバー固定

**セクション順序（上から下）:**

1. ヒーロー（アバター＋レベル＋EXP バー）
2. Overdue セクション（該当あり時のみ。§7 B-1 参照）
3. Today ヘッダ＋完了カウント
4. Today タスクリスト
5. `+ タスクを追加` リンク
6. Upcoming 折りたたみセクション（§7 B-1 参照）
7. Goals セクション
8. `+ ゴールを作成` リンク
9. ボトムタブバー（固定）

**要素仕様:**

**[ヒーロー] — S10-1**

- パディング `20px 0 32px`
- アバター 48×48 / radius `50%` / border `1.5px solid --accent` / 背景 `--bg-surface`
- 右カラム:
  - 1 行目: `Lv.12`（font-size `20px` weight `400` letter-spacing `-0.5px`）+ ラベル `EXPLORER`（11px `--text-muted` letter-spacing `1.5px` uppercase、左 `--space-sm`）
  - 2 行目: EXP バー — 幅 100% / 高さ `4px` / 背景 `--accent-subtle` / 塗り `--accent` / radius `--radius-pill` / 塗り率 `62%`
  - 3 行目: `1,240 / 2,000 EXP`（font-size `11px` color `--text-secondary` / 右寄せ / margin-top `4px`）
- スクロール時挙動: `scrollY > 60px` でアバター 32×32 に縮小、3 行 → 1 行へ圧縮（transition `--duration-fast` ease-out）
- キーボード表示時: `display: none`

**[Overdue セクション] — S10-2**（期限切れタスクがある日のみ表示）

- Today ヘッダの**上**に配置
- ラベル `OVERDUE`（font-size `11px` weight `600` color `--danger` letter-spacing `1.5px` uppercase）
- 各期限切れ行: Today タスク行と同構造だが左ボーダーを `--danger` solid 2px
- 行内右端に「明日に延期」リンク（font-size `14px` color `--accent` underline）— タップ即時実行 + Undo スナックバー 30s
- Phase 4 実装必須（§7 B-1）

**[Today ヘッダ] — S10-3**

- ラベル `TODAY`（font-size `14px` color `--text-muted` letter-spacing `1.5px` uppercase）
- 右端に日付 `4月12日`（font-size `11px` color `--text-muted`）
- 下 `--space-xs` に `1 / 4 completed`（font-size `11px` color `--text-muted`）

**[Today タスク行] — S10-4 (繰り返し)**

各行は「時刻列 + チェック + カード」の 3 要素、`gap: 12px`、`margin-bottom: 8px`、`align-items: center`。

| サブ要素 | 仕様 |
|---|---|
| 時刻列 | 幅 `40px` 右寄せ / font-size `14px` color `--text-secondary` / `font-variant-numeric: tabular-nums` |
| チェック | 22×22 radius `50%` / 状態別（下記） |
| カード | flex `1` / padding `10px 14px` / min-height `44px` / radius `--radius-md` / 状態別背景 |

**チェック状態:**

- 完了: 背景 `--success-subtle` / border `2px solid --success` / 内部 SVG チェック (11×11 stroke `--success` 1.8px)
- 進行中: border `2px solid --accent` / 背景 `transparent`
- 予定: border `2px solid --border-strong` / 背景 `transparent`

**カード内:**

- **タスク名（14px 主テキスト / letter-spacing `-0.02em`）** — 主情報の文字色は状態を問わず `--text-secondary` を既定とし、進行中のみ `--text-primary` に昇格させる（情報階層を 1 段上げる意図。完了・予定は同じ階層に落とす）
  - 完了時: color `--text-secondary`（打ち消し線は使わない — §2.3 に従い「呼吸する」表現）
  - 予定時: color `--text-secondary`
  - 進行中: color `--text-primary`
- **サブ行（11px メタ情報 / margin-top `2px`）** — メタ情報は 2 段目の階層のため、主テキストとは異なるセマンティクス色を使う（14px と 11px の 2 段情報階層）
  - 完了時: `達成 · 45分` / color `--success`（情報: 達成したことを緑で強調）
  - 進行中: `進行中 · 60分` / color `--text-secondary`（+ 先頭に 8×1px amber `#E8A855` のダッシュを gap `--space-sm` で配置）
  - 予定時: `予定 · 30分` / color `--text-muted`（情報: 未確定の補助情報のため主テキストより 1 段下）

> **階層ルール:** タスク名 14px は「タスクの主情報」、サブ行 11px は「状態 + 所要時間の補助情報」。この 2 段は常に別トークンを使う（同一トークンにすると階層が潰れる）。S-14 S14-8 も同じ階層ルールに従う — ただし S-14 のタスク行には所要時間の視覚表示がないため、サブ行が存在せず、タスク名 14px のみで階層が 1 段となる。
- 右側: カテゴリドット 8×8 radius `50%` + カテゴリ名（11px `--text-muted` letter-spacing `-0.02em`）
  - カテゴリ色: `--cat-work` / `--cat-health` / `--cat-learn`

**[+ タスクを追加] — S10-5**

- 左 `52px` インデント（時刻列幅 + gap 分）
- min-height `44px`
- 文字: `+ タスクを追加`（font-size `14px` color `--accent` underline）
- タップ → S-12 ハーフモーダル上昇

**[Upcoming 折りたたみ] — S10-6**（Phase 4 B-1）

- `+ タスクを追加` の下 `--space-xl` に配置
- 折りたたみヘッダ: `UPCOMING`（11px `--text-muted` uppercase letter-spacing `1.5px`）+ 右端に `▼` / `▲`（14px `--text-muted`）
- 展開時: 7 日分を日付グループ（`4/13 (月)` 見出し `11px` + タスク行と同構造の行）で表示
- 7 日以降は `+12 more` のように件数のみ
- デフォルト: 折りたたみ

**[Goals ヘッダ] — S10-7**

- margin-top `--space-xl`（セクション間 32px）
- ラベル `GOALS`（font-size `14px` color `--text-muted` letter-spacing `1.5px` uppercase）
- margin-bottom `--space-md`

**[Goals 行] — S10-8 (繰り返し)**

- padding `12px 0` / flex column
- 1 行目: 左にゴール名（font-size `14px` letter-spacing `-0.02em`）/ 右に `60%`（11px `--text-muted`）
- 2 行目: プログレスバー — 高さ `3px` / 背景 `--accent-subtle` / 塗り `--accent` / radius `--radius-pill`
- margin-bottom `--space-sm`

**[+ ゴールを作成] — S10-9**

- padding `14px 0` / min-height `44px`
- 文字: `+ ゴールを作成`（font-size `14px` color `--accent` underline）

**[ボトムタブバー] — S10-10**

- 高さ `82px` / 背景 `--bg-surface` / border-top `1px solid --border-strong` / padding-top `10px`
- 3 タブ均等 `justify-content: space-around`
- Active タブ: pill 背景 `--accent-subtle` radius `--radius-pill` padding `6px 16px` + SVG 20×20 stroke `--accent` + ラベル `11px --accent weight 600`
- Inactive タブ: SVG 20×20 stroke `--text-secondary` のみ（ラベルなし）
- タブ順: `GROW` / `TALK` / `ME`

**状態・インタラクション:**

- タスク行タップ → S-13 詳細パネル（ハーフモーダル）
- チェックタップ → spring-default / scale(0.9→1.1→1) + `--duration-fast` + EXP バー `--duration-slow` 伸長 + Undo スナックバー 30s
- Goal 行タップ → S-14 フルスクリーン右スライド遷移（ease-out 350ms）

**検証可能なスクショ事実:**

- ヒーロー高さ 初期 約 `100px`、スクロール時 約 `50px`
- Today セクションにタスク 4 行、うち 1 行目が `--success-subtle` 背景
- Goals セクションにゴール 2 行、両方とも進捗バー表示
- タブバーが画面下端に固定、GROW タブのみ pill 形状

**Phase 4 対応:** B-1（Upcoming/Overdue セクション実装）、G-1（カテゴリ色 `--cat-learn` の専用色分離）、A-2（完了タスクの `--success` on `--success-subtle` コントラスト）

---

### 4.5 S-12 Task Add（ハーフモーダル）

- **目的 / UX参照:** 新規タスク作成。ux_v1.md §2.3
- **画面タイプ:** ハーフモーダル（下から `--duration-normal` ease-out で上昇、画面高 60%）
- **レイアウト原則:** 背景オーバーレイ `rgba(0,0,0,0.6)` `z-index: var(--z-overlay)` / モーダル背景 `--bg-surface` / radius `12px 12px 0 0` / `box-shadow: var(--shadow-lg)` / `z-index: var(--z-modal)` / padding `0 --space-lg 30px`

**セクション順序:**

1. ドラッグハンドル
2. タイトル行（左タイトル + 右 ✕ ボタン）
3. 種別トグル（単発 / 習慣）
4. タスク名入力
5. 開始時刻ピッカー
6. 所要時間チップ（横スクロール）
7. 予定日 / 繰り返し周期
8. ゴール紐付け
9. メモ
10. CTA「作成」

**要素仕様:**

| ID | 要素 | 仕様 |
|---|---|---|
| S12-1 | ドラッグハンドル | 幅 `40px` 高さ `4px` 背景 `--border-strong` radius `--radius-pill` / 上マージン `--space-sm` 中央揃え |
| S12-2 | タイトル「タスクを追加」 | font-size `20px` weight `400` letter-spacing `-0.02em` / margin-top `--space-md` |
| S12-3 | ✕ ボタン | 右上 / 44×44 タップ領域 / SVG 20×20 stroke `--text-secondary` |
| S12-4 | ラベル「種別」 | font-size `11px` color `--text-muted` weight `600` letter-spacing `1.5px` uppercase |
| S12-5 | 種別ピル群 | gap `--space-sm` / Active: 背景 `--accent-subtle` color `--accent` weight `600` padding `12px 18px` radius `--radius-pill` min-height `44px` / Inactive: border `1px solid --border-strong` color `--text-muted` |
| S12-6 | タスク名入力 | 高さ `48px` 背景 `--bg-primary` border `1px solid --border-strong` (focus 時 `--accent`) radius `--radius-md` padding `0 16px` font-size `14px` placeholder `--text-muted` |
| S12-7 | 開始時刻ピッカー | 同 S12-6 / クリック時 OS 時刻ピッカー / 値表示 `10:00` |
| S12-8 | 所要時間チップ | 横スクロール `-webkit-overflow-scrolling: touch` / 各チップ min-height `44px` padding `12px 16px` radius `--radius-pill` / Active: `--accent-subtle` + `--accent` weight `600` / Inactive: border `1px solid --border-strong` color `--text-muted` / 値: `5 / 10 / 15 / 30 / 45 / 60 / 90 / 120 分` / デフォ `30分` |
| S12-9 | 予定日 | S12-6 と同スタイル / 値 `今日` / 右に `14px` カレンダー SVG stroke `--text-muted` |
| S12-10 | ゴール紐付け | S12-6 と同スタイル / 値 `なし` / 右に `14px` chevron-down SVG |
| S12-11 | メモ | textarea / min-height `80px` / 他入力と同スタイル / padding `12px 16px` / line-height `1.7` |
| S12-12 | CTA「作成」 | 高さ `52px` 幅 100% / 背景 `--button-primary-bg` 文字 `#FFFFFF` weight `600` radius `--radius-lg` / タスク名空欄時 disabled（§5.0 A / `--button-disabled-*` 適用 / `aria-disabled="true"`） |

各入力ブロック間の margin は `--space-md`。ラベル（11px）と入力（48px）の間は `--space-sm`。

**状態・インタラクション:**

- モーダル上昇: `--duration-normal` ease-out / translateY(100% → 0)
- 背景オーバーレイ: fade-in `--duration-fast`
- 閉じ: ✕ タップ / ドラッグハンドル下スワイプ / 背景タップ → 逆アニメ
- 未保存の変更あり + 外タップ時: 確認ダイアログ（Phase 4）
- 種別変更 → フィールド 8「予定日」が `繰り返し周期（毎日/平日/毎週…）` へ入れ替わる
- 「作成」成功: モーダル閉 + トースト「タスクを追加しました」 / 失敗: エラートースト

**検証可能なスクショ事実:**

- モーダルが画面下から上昇し、高さが約 `487px`（画面高 60%）
- 上端にドラッグハンドル、右上に ✕ ボタン
- 種別ピル 2 つ、うち 1 つが `--accent-subtle` 背景
- 所要時間チップ列が横スクロール可能
- CTA が画面下端近くに全幅 52px

---

### 4.6 S-13 Task Detail（ハーフモーダル / インライン編集）

- **目的 / UX参照:** タスク詳細表示 + インライン編集。S-12 の編集版ではなく「S-11 詳細パネル内で編集モードに切替」という位置づけ。ux_v1.md §2.4
- **画面タイプ:** ハーフモーダル（S-12 と同レイアウト骨格）
- **レイアウト原則:** 初期は「閲覧モード」、[編集] タップで同モーダル内でフィールドを編集可能フォームに inline swap。新モーダルは開かない。

**セクション順序（閲覧モード）:**

1. ドラッグハンドル
2. ヘッダ行（チェックアイコン + タスク名 + ✕）
3. ステータスラベル
4. メタデータ行（時刻 / 所要時間 / ゴール）
5. メモセクション
6. アクションボタン行（編集 / 削除）
7. AI 相談ボタン行（進め方を聞く / 詰まりを相談）

**要素仕様:**

| ID | 要素 | 仕様 |
|---|---|---|
| S13-1 | ドラッグハンドル | S12-1 と同 |
| S13-2 | チェックアイコン（完了済み） | 28×28 radius `50%` border `2px solid --success` + 内部 SVG チェック `--success` / 未完了時は `--border-strong` |
| S13-3 | タスク名 | font-size `20px` weight `400` letter-spacing `-0.5px` / チェックアイコン右 `--space-sm` |
| S13-4 | ✕ ボタン | S12-3 と同 |
| S13-5 | ステータスラベル | `完了済み` / font-size `14px` color `--success`（未完了時 `進行中` `--accent`、予定時 `予定` `--text-muted`） |
| S13-6 | メタデータ行 | padding `--space-md 0` / border-bottom `1px solid --border` / 各ラベル 11px `--text-muted` uppercase letter-spacing `1.5px`、値 14px `--text-primary` |
| S13-7 | カテゴリドット | 8×8 radius `50%` / ゴール名の左 |
| S13-8 | メモラベル | `MEMO` / 11px `--text-muted` uppercase letter-spacing `1.5px` / margin-top `--space-md` |
| S13-9 | メモ本文 | font-size `14px` color `--text-secondary` line-height `1.7` letter-spacing `-0.02em` / padding-bottom `--space-md` / border-bottom `1px solid --border` |
| S13-10 | 編集ボタン | 高さ `44px` 幅 flex `1` / border `1px solid --border-strong` color `--text-primary` radius `--radius-md` / margin-top `--space-md` |
| S13-11 | 削除ボタン | 高さ `44px` 幅 flex `1` / 背景 `--danger-solid` (`#DA3633`) color `#FFFFFF` weight `600` radius `--radius-md` |
| S13-12 | AI 相談ボタン 2 種 | 高さ `44px` 幅 flex `1` / 完了済みタスクでは AI 相談は「振り返り相談」として active（§7 B-5 参照）/ 未完了では「進め方を聞く」active / 完了 × 未完了の組合せで片方 disabled |

AI ボタン Active スタイル: 背景 `--accent-subtle` color `--accent` weight `600`
AI ボタン Inactive スタイル（§5.0 B 相当。真の disabled ではない）: 背景 `--bg-elevated` color `--text-muted` weight `400`
AI ボタン disabled 化（§5.0 A 相当。条件未達で押せない時）: 上記 Inactive スタイルに加え `opacity: 0.5` + `pointer-events: none`

**状態・インタラクション:**

- [編集] タップ → 同モーダル内で S13-3 / S13-6 / S13-9 を入力フィールドへ swap（S-12 と同じ入力コンポーネントを再利用） / 下部ボタン行は `[キャンセル]` `[保存]` の 2 ボタンへ差し替え
- 未保存変更あり + ✕ / 外タップ → 確認ダイアログ（Phase 4）
- [削除] → 確認ダイアログ → 削除実行 + Undo スナックバー 30s

**検証可能なスクショ事実:**

- 閲覧モードで「編集」「削除」2 ボタンが同一行に存在
- 削除ボタンの背景が `#DA3633` 相当（純赤 solid）
- 完了済み状態でステータスラベルが `#3FB950` 相当の緑

**Phase 4 対応:** A-3/A-4（完了ステータスと完了タスクのコントラスト）、B-5（完了時 AI 相談 active 仕様）

---

### 4.7 S-14 Goal Detail（フルスクリーン）

- **目的 / UX参照:** ゴール進捗管理。ux_v1.md §3
- **画面タイプ:** フルスクリーン、右スライド遷移で GROW から入る
- **レイアウト原則:** 左右 `--space-lg` / 縦スクロール

**セクション順序:**

1. ナビゲーション行（← GROW）
2. ゴールタイトル
3. 大進捗表示（48px % + 大プログレスバー）
4. メタデータ行（残り日数 + カテゴリタグ）
5. タスクセクションラベル
6. タスク一覧
7. `+ タスクを追加` リンク
8. アクションボタン行（AI 相談 / 編集 / 削除）

**要素仕様:**

| ID | 要素 | 仕様 |
|---|---|---|
| S14-1 | ← 戻るボタン | 左上 44×44 タップ領域 / SVG 20×20 stroke `--text-primary` / 右に ラベル `GROW` 11px `--text-muted` uppercase |
| S14-2 | ゴールタイトル | font-size `28px` weight `400` letter-spacing `-0.5px` color `--text-primary` / padding-top `--space-md` |
| S14-3 | 大進捗表示 | font-size `48px` weight `200` color `--accent` letter-spacing `-2px` / 単位 `%` は 20px weight `400` / margin-top `--space-lg` |
| S14-4 | 大プログレスバー | 幅 100% 高さ `8px` 背景 `--accent-subtle` 塗り `--accent` radius `--radius-pill` / margin-top `--space-sm` |
| S14-5 | 残り日数 | `14px` カレンダー SVG + テキスト `残り28日` 14px `--text-secondary` / margin-top `--space-md` |
| S14-6 | カテゴリタグ | 背景 `--accent-subtle` color `--accent` font-size `11px` padding `4px 12px` radius `--radius-pill` / S14-5 の右 |
| S14-7 | タスクセクションラベル | `TASK` / 11px `--text-muted` uppercase letter-spacing `1.5px` / margin-top `--space-xl` |
| S14-8 | タスク行 | padding `12px 0` / border-bottom `1px solid --border` / flex / チェック 22×22（S10-4 と同状態別スタイル）+ タスク名 14px（完了・予定ともに `--text-secondary`、進行中は `--text-primary`。S10-4 と完全一致）+ 日時 11px `--text-muted` |
| S14-9 | `+ タスクを追加` | S10-5 と同スタイル |
| S14-10 | アクションボタン行 | 3 ボタン等幅 / 高さ `44px` / gap `--space-sm` / margin-top `--space-xl` |
| S14-10a | AI 相談 | 背景 `--accent-subtle` color `--accent` weight `600` radius `--radius-md` |
| S14-10b | 編集 | border `1px solid --border-strong` color `--text-secondary` radius `--radius-md` |
| S14-10c | 削除 | 背景 `--danger-solid` color `#FFFFFF` weight `600` radius `--radius-md` |

**状態・インタラクション:**

- タスク行タップ → S-13 ハーフモーダル
- チェックタップ → S10-4 と同じスプリングアニメ + Undo
- [← GROW] → ease-out 350ms 右スライド戻り
- [削除] → 確認ダイアログ → 実行 + Undo スナックバー 30s
- 7 日ルール（ux_v1.md §3.5）: 完了まで 7 日未満なら達成バナー表示のみ、7 日以後なら即時達成演出 +50 EXP

**検証可能なスクショ事実:**

- 上端に戻る矢印 + `GROW` ラベル
- 中央に大きな `%` 数字（48px 相当）
- タスクセクションに複数タスク行（うち完了2 + 進行中1 + 予定2 想定）
- 下端に 3 ボタンが等幅で並ぶ

**Phase 4 対応:** A-5（メモ本文コントラスト 4.30:1 ギリギリ）

---

### 4.8 S-15 Goal Create（ハーフモーダル）

- **目的 / UX参照:** 新規ゴール作成。ux_v1.md §2.4
- **画面タイプ:** ハーフモーダル（S-12 と同構造）
- **レイアウト原則:** S-12 と共通。フィールド 4 つ + インラインタスク追加。

**セクション順序:**

1. ドラッグハンドル
2. タイトル行（タイトル + ✕）
3. ゴール名入力
4. 期限ピッカー
5. カテゴリ複数選択（flex wrap）
6. 最初のタスク追加リンク
7. CTA「作成」

**要素仕様:**

| ID | 要素 | 仕様 |
|---|---|---|
| S15-1 | ドラッグハンドル | S12-1 と同 |
| S15-2 | タイトル「ゴールを作成」 | S12-2 と同 |
| S15-3 | ✕ ボタン | S12-3 と同 |
| S15-4 | ゴール名入力 | S12-6 と同 / placeholder `達成したい目標` |
| S15-5 | 期限ピッカー | S12-6 と同 / 値 `期限なし` / 右に `14px` カレンダー SVG `--text-muted` |
| S15-6 | カテゴリ群 | flex wrap / gap `--space-sm` / min-height `44px` padding `12px 16px` radius `--radius-pill` / Unselected: border `1px solid --border-strong` color `--text-secondary` / Selected: 背景 `--accent-subtle` border `1px solid --accent` color `--accent` + 左に `14px` チェック SVG / 6 項目: `仕事 / 健康 / 学習 / 趣味 / 人間関係 / その他` |
| S15-7 | 最初のタスク追加リンク | `+ 最初のタスクを追加` / 14px `--accent` underline / `14px` plus SVG 左 / margin-top `--space-md` |
| S15-8 | CTA「作成」 | S12-12 と同 / ゴール名空欄時 disabled |

**状態・インタラクション:**

- 複数選択: 同時に複数カテゴリ選択可
- 選択時 spring-default / scale feedback
- リンクタップ → インラインでタスク入力行追加（ADV Phase 4 詳細）
- 「作成」→ モーダル閉 + Goals セクションへリアルタイム追加

**検証可能なスクショ事実:**

- モーダル内に縦 3 入力ブロック + カテゴリチップ 6 個
- カテゴリのうち複数が `--accent-subtle` 背景 + ✓ 表示
- CTA が下端全幅

---

### 4.9 S-20 TALK（タブ #2）

- **目的 / UX参照:** AI 対話。ux_v1.md §3.0 〜 §3.3
- **画面タイプ:** タブ画面（ボトムタブ #2 active）
- **レイアウト原則:** ヘッダ 56px + チャットスクロール + 入力バー 60px + タブバー 82px

**セクション順序:**

1. ヘッダ行（☰ / `TALK` / 🕐 / 📝）
2. チャットスクロール領域
3. 入力バー
4. ボトムタブバー

**要素仕様:**

**[ヘッダ] — S20-1**

- 高さ `56px` / border-bottom `1px solid --border-strong` / padding `0 --space-lg`
- 左: ☰ アイコン 22×22 stroke `--text-primary` / タップ → 履歴ドロワー
- 中央: `TALK` 14px `--text-muted` letter-spacing `1.5px` uppercase
- 右: 🕐 と 📝 アイコン 22×22 stroke `--text-primary` / gap `--space-md`

**[チャットスクロール領域] — S20-2**

- padding `--space-md --space-lg`
- 縦スクロール / スクロール追従（§3.3）
- メッセージ間 margin `--space-md`

**[AI メッセージバブル] — S20-3**

- 左寄せ
- border-left `2px solid --accent-subtle` / padding `10px 14px`
- テキスト 14px color `--text-primary` line-height `1.7` letter-spacing `-0.02em`
- タイムスタンプ 11px color `--text-muted` / バブル下 `--space-xs`
- **背景は持たない**（縦ラインのみの Open Air 原則）

**[ユーザーメッセージバブル] — S20-4**

- 右寄せ / max-width `260px`
- 背景 `--accent-subtle` / radius `12px 4px 12px 12px` / padding `12px 16px`
- テキスト 14px color `--text-primary` line-height `1.7`
- タイムスタンプ 11px color `--text-muted` / text-align right

**[タスク提案カード] — S20-5**

- AI バブル直後に配置（インラインカード）
- 背景 `--bg-surface` / border-left `3px solid --accent` / radius `--radius-lg` / padding `--space-md`
- ラベル `タスクにしますか？` 11px `--text-muted` letter-spacing `1.5px` uppercase
- タスク名 14px `--text-primary` letter-spacing `-0.02em`
- 時刻 11px `--text-muted`
- ボタン行: gap `--space-sm` / margin-top `--space-md`
  - `登録する`: 背景 `--button-primary-bg` color `#FFFFFF` weight `600` padding `12px 18px` radius `--radius-pill` min-height `44px`
  - `編集して登録`: border `1px solid --border-strong` color `--text-primary` padding `12px 18px` radius `--radius-pill` min-height `44px`
  - `✕`: border `1px solid --border-strong` color `--text-secondary` min-width `44px` min-height `44px` radius `--radius-pill`

**[冒険 EXP カード] — S20-6**（AI が冒険検出時）

- 背景 `--bg-surface` / border-left `3px solid --warning` / radius `--radius-lg` / padding `--space-md`
- アイコン `⚔️` + テキスト `冒険を検出！` 14px `--text-primary`
- 冒険内容 14px `--text-secondary`（最大 2 行）
- `+50 EXP` 14px weight `600` color `--warning` 右寄せ
- 出現: scale(0.8→1) + opacity(0→1) 300ms spring-default
- 1 日上限（2 回）超過時: `+0 EXP（本日の上限）` / アクセント色を `--text-muted` に変更

**[レベルアップバナー] — S20-7**

- インラインで AI バブル位置に配置
- `🎉 Level Up! Lv.{N} — {称号}` / 14px weight `600` color `--accent`
- 紙吹雪パーティクル演出（Phase 4 実装）

**[オートスクロール制御バナー] — S20-8**

- ユーザーが上方スクロール中に表示
- 画面下から `80px` の位置に float / 幅 `auto` padding `12px 18px` 背景 `--bg-elevated` border `1px solid --accent-subtle` radius `--radius-pill`
- テキスト `↓ 新しいメッセージ` 14px `--accent`

**[入力バー] — S20-9**

- 高さ `60px` / border-top `1px solid --border` / padding `0 --space-lg` / flex align center gap `--space-sm`
- 📎 クリップ 22×22 stroke `--text-secondary`
- テキスト入力: flex 1 / 高さ `40px` 背景 `--bg-surface` border `1px solid --border-strong` radius `--radius-pill` padding `0 16px` font-size `14px`
- 入力中は自動伸長（最大 4 行 → 約 `100px`）
- ➤ 送信: 44×44 / radius `50%` / 入力なし時: 背景 `--button-disabled-bg` / SVG `--button-disabled-text` / `pointer-events: none` / `aria-disabled="true"`（§5.0 A）/ 入力あり時: 背景 `--button-primary-bg` / SVG `#FFFFFF` / `pointer-events: auto`

**[ボトムタブバー] — S20-10**

- S10-10 と同。Active は TALK

**状態・インタラクション:**

- メッセージ送信: ユーザーバブル即表示 → AI に `...` タイピングインジケータ（3 ドット opacity 0.3→1 pulse 禁止、代わりに spring-default で 3 回 translateY）→ ストリーミング開始で置換
- タスク提案カードの `登録する` 成功 → カード置換「✅ 登録しました」0.5s → フェードアウト `--duration-normal` ease-out
- 履歴ドロワー: 左から 80% 幅（最大 320px）でスライドイン

**検証可能なスクショ事実:**

- 画面上端にヘッダ、中央にチャットバブル 2 〜 3 個、下端に入力バー + タブバー
- AI バブルは背景なし・左に青薄ラインのみ
- ユーザーバブルは `--accent-subtle` 背景で右寄せ
- タスク提案カードが AI バブル直後に配置され、`登録する`「編集して登録」2 ボタンが存在

**Phase 4 対応:** A-5（`タスクにしますか？` ラベルのコントラスト改善）

---

### 4.10 S-30 ME Profile（タブ #3 / サブタブ PROFILE）

- **目的 / UX参照:** ユーザー自分情報・自己分析・ソーシャル。ux_v1.md §4
- **画面タイプ:** タブ画面（ボトムタブ #3 active） + サブタブ 4 個
- **レイアウト原則:** ヒーロー + サブタブ + コンテンツ + タブバー

**セクション順序:**

1. ヒーロー（アバター + 名前 + Lv + EXP バー）
2. サブタブ（PROFILE / DISCOVER / FRIENDS / SHOP）
3. 基本情報セクション
4. AI 理解メモセクション
5. MBTI / 性格タイプカード（Phase 4 B-3）
6. リンク行（アバター設定 / 設定）
7. ボトムタブバー

**要素仕様:**

**[ヒーロー] — S30-1**

- 中央揃え / padding `20px 0 16px`
- アバター 56×56 / border `1.5px solid --accent` / radius `50%` / 中央 SVG アバター
- 名前（例: `ふとし`）20px weight `400` letter-spacing `-0.02em` color `--text-primary` / margin-top `--space-sm`
- ラベル `Lv.12 EXPLORER` 11px color `--text-muted` letter-spacing `1.5px` uppercase / margin-top `--space-xs`
- EXP バー: 幅 `120px` 高さ `4px` 背景 `--accent-subtle` 塗り `--accent` radius `--radius-pill` / margin-top `--space-sm`

**[サブタブ] — S30-2**

- flex / border-bottom `1px solid --border` / margin-top `--space-lg` / margin-bottom `--space-xl`
- 4 タブ等分 (flex 1) / padding `12px 0` / text-align center
- Active: color `--accent` weight `600` / 下線 `2px solid --accent` (bottom -1px)
- Inactive: color `--text-muted` weight `400`
- ラベル: `PROFILE / DISCOVER / FRIENDS / SHOP`（14px）

**[基本情報セクション] — S30-3**

各行: padding `12px 0` / border-bottom `1px solid --border` / flex justify-between align-center

| 行 | ラベル | 値 |
|---|---|---|
| S30-3a | `名前` | `ふとし` |
| S30-3b | `年齢` | `28` |
| S30-3c | `職業` | `エンジニア` |
| S30-3d | `趣味` | `タップして入力`（未入力時プレースホルダー） |

- ラベル: 11px `--text-muted` letter-spacing `1.5px` uppercase weight `600`
- 値: 14px `--text-primary` / 未入力時 `--text-muted`

**[AI 理解メモ] — S30-4**

- セクションヘッダ `AI PROFILE` 11px `--text-muted` uppercase letter-spacing `1.5px` weight `600` / margin-top `--space-xl`
- 本文: 14px color `--text-secondary` line-height `1.7` letter-spacing `-0.02em` max 800 文字
- 最終更新: 11px `--text-muted` / margin-top `--space-sm`

**[MBTI カード] — S30-5**（Phase 4 B-3 で実装必須）

- margin-top `--space-xl`
- 背景 `--bg-surface` / radius `--radius-lg` / padding `--space-md`
- 4 文字（例: `INFJ`）28px weight `600` color `--accent`
- 補足テキスト 14px `--text-secondary` line-height `1.7`
- 未推定時: `対話を重ねると判明します` + 進捗バー `--accent-subtle` / `--accent`
- 手動入力リンク `外部テスト結果を入力` 14px `--accent` underline

**[リンク行] — S30-6**

- margin-top `--space-xl`
- 各行: padding `14px 0` / border-top `1px solid --border` / min-height `44px` / flex justify-between align-center
- アイコン 14px + ラベル 14px `--text-secondary` / 右に chevron-right 14px `--text-muted`
- 行 1: `アバター設定` → S-41
- 行 2: `設定` → S-37

**[ボトムタブバー] — S30-7**

- S10-10 と同。Active は ME

**状態・インタラクション:**

- 基本情報行タップ → インライン編集（14px 入力フィールド border-bottom `1px solid --accent` のみ） → フォーカスアウトで自動保存 + トースト
- サブタブ切替: 左右スワイプ / タップ切替（`--duration-fast`）
- アバター設定 → S-41 右スライド遷移

**検証可能なスクショ事実:**

- ヘッダ中央にアバター + 名前 + Lv
- サブタブ 4 つが横並びで、PROFILE のみ下線 + 青文字
- 基本情報 4 行（ラベル左・値右）
- 最下段にタブバー、ME のみ pill

**Phase 4 対応:** B-3（MBTI カード実装必須 — 現モックアップ未実装）

---

## 5. 共通コンポーネント

### 5.0 Disabled 状態の統一規定

本書全体で「disabled」という語は以下の 2 種類に厳密に区別される。実装もこの区別に従うこと。

**A. 真の disabled（操作不能 / 一時的に無効）**

対象: プライマリ CTA（§5.2）/ セカンダリ CTA（§5.3）/ 破壊的ボタン（§5.4）/ 送信ボタン（S-20 S20-9）/ Sign-up 同意未チェック時の CTA（S-01 S01-9）

スタイル（テーマ対応トークンを使用。`opacity` 単独での無効化は禁止）:
- 背景: `--button-disabled-bg`
- 文字: `--button-disabled-text`
- 枠線: セカンダリ版のみ `1px solid --button-disabled-border`
- `pointer-events: none`
- カーソル `not-allowed`（デスクトップ想定）
- `aria-disabled="true"` を HTML 属性として付与

トークン値は `lais_design_system.md v0.13` の各テーマブロックで定義する（§7 D-5）。コントラスト要求:
- 4 テーマすべてで、disabled 文字 vs 背景のコントラスト比 `≥ 3:1`（WCAG 2.2 の disabled 例外規定 1.4.3 を考慮しても、視認可能性のため 3:1 は維持）
- プライマリ disabled の想定値（Night Sky）: bg `#1F2937`, text `#6E7681`（約 3.2:1）
- 他テーマ値は DS 側で AA 前提に設計

意味: 「現在は押せないが、条件が満たされれば押せる」。テーマに追従した disabled 色で視認性とコントラストを保ち、`opacity` で一律減光しないこと（テーマによって AA 破綻のリスクがあるため）。

**B. State トグルの inactive（二項状態の片方）**

対象: AI 相談ボタン（S-13 S13-12 / S-14 S14-10a）/ 種別ピル（S-12 S12-5）/ 所要時間チップ（S-12 S12-8）/ カテゴリチップ（S-15 S15-6）/ サブタブ（S-30 S30-2）

スタイル:
- 背景: `--bg-elevated` もしくは `transparent`（個別画面に準ずる）
- 文字色: `--text-muted` または `--text-secondary`
- 枠線: 必要に応じ `1px solid --border-strong`
- `opacity: 1` のまま（明度は下げない）
- `pointer-events: auto`（タップで active へトグル可能）

意味: 「active ではないが、タップで active に切替可能な状態」。disabled ではなく、選択肢のうち選ばれていない状態。

**禁止:**
- 真の disabled を opacity 以外（グレースケール / 色差し替え）で表現すること
- State トグルの inactive に opacity を使うこと（disabled と混同される）
- 両方を 1 画面内で混在させて表現を統一しないこと

本書内で「disabled」と記載された箇所は A、「inactive」と記載された箇所は B を指す。S-13 S13-12 の「完了 × 未完了の組合せで片方 disabled」の記述は、AI 相談ボタンが 2 種あり、片方が条件に応じて A（真の disabled）になるという意味。もう片方は B の active 表示となる。

### 5.1 ボトムタブバー（3タブ）

- 高さ `82px` / 背景 `--bg-surface` / border-top `1px solid --border-strong` / padding-top `10px`
- 3 タブ `justify-content: space-around`
- Active: pill 背景 `--accent-subtle` radius `--radius-pill` padding `6px 16px` + SVG 20×20 stroke `--accent` + ラベル 11px `--accent` weight `600`
- Inactive: SVG 20×20 stroke `--text-secondary` のみ
- タブ順: `GROW` / `TALK` / `ME`
- 下端固定 / 全画面から隠れない（キーボード表示時のみ visualViewport 連動で非表示）

### 5.2 プライマリ CTA

- 高さ `52px` / 幅 100% / 背景 `--button-primary-bg` / 文字 `#FFFFFF` font-size `16px` weight `600` / radius `--radius-lg`
- Disabled: §5.0 A に準拠（`--button-disabled-bg` / `--button-disabled-text` / `pointer-events: none` / `aria-disabled="true"`）
- タップ: `--duration-fast` spring-default / scale(0.98)

### 5.3 セカンダリ CTA

- 高さ `52px` / 幅 100% / 背景 transparent / border `1px solid --border-strong` / 文字 `--text-primary` 16px weight `400` / radius `--radius-lg`

### 5.4 破壊的ボタン

- 高さ `44px` / 背景 `--danger-solid` (`#DA3633`) / 文字 `#FFFFFF` weight `600` / radius `--radius-md`
- solid のみ。アウトライン版禁止（§7 B-4）

### 5.5 ピル（セレクタ / タグ）

- min-height `44px` / padding `12px 16px` / radius `--radius-pill`
- Active: 背景 `--accent-subtle` / color `--accent` / weight `600`
- Inactive: border `1px solid --border-strong` / color `--text-secondary` / weight `400`

### 5.6 入力フィールド

- 高さ `48px` / 背景 `--bg-primary` / border `1px solid --border-strong` / radius `--radius-md` / padding `0 16px` / font-size `14px`
- Focus: border `--accent` / box-shadow `0 0 0 2px --accent-subtle`
- Error: border `--danger` / エラーテキスト 11px `--danger` 下 `--space-xs`
- Placeholder: `--text-muted`（§7 A-1 で改善予定）

### 5.7 チェックボックス（タスクチェック）

- 22×22 radius `50%`（タスクリスト用）/ 20×20 radius `--radius-sm`（同意チェック用）
- 状態別は 4.4 S10-4 参照

### 5.8 プログレスバー

- 小: 高さ `3px`（ゴール進捗）
- 中: 高さ `4px`（EXP バー）
- 大: 高さ `8px`（ゴール詳細）
- 背景 `--accent-subtle` / 塗り `--accent` / radius `--radius-pill`
- 伸長アニメ: ease-out `--duration-slow`

### 5.9 スナックバー（Undo）

- 画面下端から `100px` 浮遊 / 中央寄せ / padding `12px --space-md` / 背景 `--bg-elevated` / border `1px solid --border-strong` / radius `--radius-pill` / `box-shadow: var(--shadow-md)` / `z-index: var(--z-snackbar)`
- テキスト 14px `--text-primary` + `[取り消す]` 14px `--accent` weight `600`
- 持続 30s（§8.7）
- `role="status"` + `aria-live="polite"`（§6.5）

### 5.10 トースト

- 画面上端から `60px` 浮遊 / padding `12px --space-md` / 背景 `--bg-surface` / border `1px solid --border` / radius `--radius-md` / `box-shadow: var(--shadow-md)` / `z-index: var(--z-toast)`
- 成功: 左に `14px` check SVG `--success`
- エラー: 左に `14px` alert SVG `--danger`
- 持続 `2.5s` / フェードアウト `--duration-normal`
- `role="status"` + `aria-live="polite"`

---

## 6. インタラクション・モーション統一規定

### 6.1 画面遷移

- 横スライド（右 → 左）: ease-out / `--duration-normal` / 親子関係遷移（S-14 / S-41 等）
- 下 → 上 ハーフモーダル: ease-out / `--duration-normal` / translateY(100% → 0) + 背景オーバーレイ fade `--duration-fast`
- タブ切替: crossfade `--duration-fast`（スライドは使わない）

### 6.2 要素フィードバック

- タップ: scale(0.98) spring-default / `--duration-fast` / tap-highlight-color transparent
- チェック完了: scale(0.9→1.1→1) spring-default / `--duration-fast`
- 成功アイコン出現: scale(0→1) + opacity(0→1) spring-default / `--duration-normal`

### 6.3 EXP・レベルアップ

- EXP バー伸長: ease-out `--duration-slow`
- レベルアップ: spring-bouncy / scale(1→1.15→1) / `--duration-celebration`
- 紙吹雪（レベルアップ時）: Canvas パーティクル 800ms / `prefers-reduced-motion` 時は省略

### 6.4 モーション全般の禁止事項

- ease-in-out を 300ms 以上の装飾に使うこと
- pulse / glow / float 系の継続アニメ（§9 NG リスト）
- drop-shadow / blur の装飾目的使用

### 6.5 アクセシビリティ

**タップ領域:**
- すべてのタップ要素 `min: 44×44`

**モーション設定:**
- `prefers-reduced-motion: reduce` 時:
  - パーティクル全省略
  - アニメ duration を 0ms 化（opacity のみ残す）
  - EXP バーの伸長は duration 維持（情報伝達のため）

**コントラスト:**
- WCAG AA（本書は AA 基準。§7 A 群の改善が必要）

**ライブリージョン:**
- `aria-live="polite"` を AI ストリーミングバブル（S-20 S20-3）に付与
- `aria-live="polite"` を Undo スナックバー（§5.9）に付与
- `aria-live="assertive"` は使用しない（静かな情報設計原則）

**色以外での情報伝達:**
- 色のみで状態を伝えない。状態ラベル（`完了 / 進行中 / 予定`）を常にテキストで併記

**SVG-only ボタン/アイコンの aria-label 必須:**

本書内で「SVG のみ」「アイコンのみ」と記述された要素は、すべて以下の `aria-label` を付与すること（Inactive タブや ✕ ボタン等、視覚テキストを持たない要素はスクリーンリーダー対応が必須）。

| 画面 | 要素 | aria-label |
|---|---|---|
| S-00 / 全画面 | ← 戻るボタン | `戻る` |
| S-10 / S-20 / S-30 | Inactive GROW タブ | `GROW` |
| S-10 / S-20 / S-30 | Inactive TALK タブ | `TALK` |
| S-10 / S-20 / S-30 | Inactive ME タブ | `ME` |
| S-12 / S-13 / S-15 | ✕ 閉じるボタン | `閉じる` |
| S-14 | カレンダーアイコン | `期限` |
| S-20 | ☰ 履歴ドロワー | `履歴を開く` |
| S-20 | 🕐 時計アイコン | `時刻` |
| S-20 | 📝 新規チャット | `新規チャット` |
| S-20 | 📎 画像添付 | `画像を添付` |
| S-20 | ➤ 送信ボタン | `送信` |
| S-30 | chevron-right（リンク行） | （装飾のため `aria-hidden="true"`） |

Active 状態でラベル文字が視覚表示されている要素（Active タブ / ピル等）は `aria-label` を追加する必要はない（テキストノードで代替される）。

**フォーカスリング（キーボード操作時の可視化）:**

すべてのインタラクティブ要素（ボタン / リンク / タブ / チェックボックス / ピル / タスク行 / ゴール行 / モーダルの ✕）は、キーボード操作時にフォーカスリングを表示する。実装は `:focus-visible` ルールで行い、マウス操作時の `:focus` には適用しない（視覚ノイズ防止）。

共通トークン（lais_design_system.md で定義済みまたは Phase 4 で追加する）:

```
--focus-ring-color: var(--accent)
--focus-ring-offset: 2px
--focus-ring-width: 2px
--focus-ring-style: solid
```

CSS 実装（全インタラクティブ要素の既定）:

```css
*:focus-visible {
  outline: var(--focus-ring-width) var(--focus-ring-style) var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
  border-radius: inherit;
}
```

個別の上書きルール:

- **ピル型要素**（ボトムタブ Active / チップ / ボタン pill） — 丸型に沿って `outline-offset: 3px` でリング表示
- **タスク行** — 行全体に `outline` を当てる（チェックボックス単体ではなく）。`outline-offset: -2px`（行内に寄せる）
- **入力フィールド**（§5.6） — フォーカス時は border `--accent` に切替え + `box-shadow: 0 0 0 2px --accent-subtle` を維持（outline は非表示にする）。既に §5.6 で定義済み
- **破壊的ボタン**（§5.4） — フォーカスリングは `--danger` ではなく `--focus-ring-color`（`--accent`）で統一（色で意味を伝えない原則）

`--focus-ring-*` トークンが Phase 4 実装開始時点で design_system.md に未定義の場合、§7 に D-3 として追記し、Phase 4 実装と同時に DS v0.13 へ追加する。

---

## 7. Phase 4 実装時対応リスト

> LAIS-DESIGN-REVIEW-01 v2_r7 → r11 の 5 ラウンドで残存した CRITICAL 17 件は、モックアップ HTML を機械修正しても DS 破壊やスコープ拡大のリスクがあるため、Phase 4 実装時にまとめて対応する。本章は実装開始時のチェックリストとして機能する。

### A 群: TEXT_CONTRAST（6 件 — DS テキストトークン再定義）

| ID | 対象 | 現状 | 必要措置 |
|---|---|---|---|
| A-1 | S-01 / S-12 placeholder | `--text-muted` (`#7A8593`) on `--bg-primary` (`#0D1117`) = **3.47:1**（AA 未達） | DS に `--placeholder-on-dark` を新設し `#8A94A3` 以上に。もしくは placeholder 背景を `--bg-surface` に揃える |
| A-2 | S-10 / S-13 完了タスク「達成」 | `--success` (`#3FB950`) on `--success-subtle` (`rgba(63,185,80,0.12)`) = **2.13 〜 3.01:1** | `--success-on-subtle` を新設（`#6FCF84` 想定）または完了ラベルを `--text-primary` に戻す |
| A-3 | S-13 完了済みステータス | `--success` on `--bg-primary` = **2.47:1** | `--success` の明度を AA まで引き上げた `--success-accessible` を新設 |
| A-4 | S-13 メモ本文 | `--text-secondary` (`#9BA7B4`) on `--bg-primary` = **4.30:1**（AA ギリギリ） | `--text-body` を新設 `#B0BCC9` 程度で 5:1 以上確保 |
| A-5 | S-20 `タスクにしますか？` ラベル | `--text-muted` on `--bg-surface` = **3.47:1** | `--label-on-surface` を新設。もしくは背景を `--bg-elevated` に変更 |
| A-6 | テーマ全般の回帰検証 | `--text-muted` を使っている全箇所 | A-1 〜 A-5 の修正後、テーマ Dawn / Harajuku Light / Harajuku Dark でも回帰検証 |

**Why Phase 4:** 現段階で `--text-muted` を変更するとテーマ 4 種と全画面に波及するため、実装と同時に DS v0.13 へ昇格する。

### B 群: UX 構成欠落（6 件 — 実装必須機能）

| ID | 対象 | 内容 | 仕様参照 |
|---|---|---|---|
| B-1 | S-10 Upcoming セクション | 折りたたみで 7 日分プレビュー | ux_v1.md §2.3 / 本書 4.4 S10-6 |
| B-2 | S-10 Overdue セクション | 期限切れラベル + 明日延期ボタン | ux_v1.md §2.3 / 本書 4.4 S10-2 |
| B-3 | S-30 MBTI カード | 対話からの性格タイプ推定カード | ux_v1.md §4.2 / 本書 4.10 S30-5 |
| B-4 | S-14 削除ボタン | 現モックアップで solid `#DA3633` 化済み。実装時に `--danger-solid` トークン使用を確認 | 本書 5.4 |
| B-5 | S-13 完了時 AI 相談 | 完了後は「振り返り相談」として active | ux_v1.md §2.3 / 本書 4.6 S13-12 |
| B-6 | S-10 Upcoming 日付グループヘッダ | `4/13 (月)` 形式で日付グループ化 | 本書 4.4 S10-6 |

**Why Phase 4:** モックアップは Phase A のコンセプトレベルの固定のため、詳細機能は実装と同時に追加する。

### C 群: トークン逸脱（3 件 — DS 拡張必要）

| ID | 対象 | 現状 | 必要措置 |
|---|---|---|---|
| C-1 | S-10 進行中ダッシュ色 | `#E8A855` が直指定 | `--cat-health` / `--in-progress-marker` トークンを新設 |
| C-2 | S-10 学習カテゴリドット | `--accent-hover` (`#A5D6FF`) をカテゴリ色に流用 | `--cat-learn` 専用トークンを新設（`#A5D6FF` と重複しない色、例 `#88D4FF`） |
| C-3 | カテゴリパレット全体 | 仕事 / 健康 / 学習 / 趣味 / 人間関係 / その他 の 6 色を DS に正式定義 | `--cat-work` `--cat-health` `--cat-learn` `--cat-hobby` `--cat-social` `--cat-other` を v0.13 で確定 |

### D 群: レビュー false positive のガード強化 + DS 追加（3 件）

| ID | 対象 | 内容 |
|---|---|---|
| D-1 | S-10 タスク行構成 | レビュー AI が「2 行構成」と指摘したが実装は Pattern B（時刻列 + カード 1 行）。レビュースクリプトの CUMULATIVE_CONTEXT に現状構成を明記して再指摘防止 |
| D-2 | S-14 edit/delete ボタン | レビュー AI が「欠落」指摘したが実装は 3 ボタン構成（AI 相談 / 編集 / 削除）。同上 |
| D-3 | Focus ring トークン追加 | `--focus-ring-color` / `--focus-ring-width` / `--focus-ring-offset` / `--focus-ring-style` を lais_design_system.md v0.13 に追加。本書 §6.5 の `:focus-visible` ルールが参照するトークン。Phase 4 実装と同時に DS へ追加 |
| D-4 | z-index / shadow トークン追加 | 本書 §3.7 の `--z-*` 9 段と §3.8 の `--shadow-*` 5 段を lais_design_system.md v0.13 に追加。4 テーマごとの shadow alpha 値も同時定義 |
| D-5 | disabled トークン追加 | `--button-disabled-bg` / `--button-disabled-text` / `--button-disabled-border` を 4 テーマで定義（いずれも文字 vs 背景コントラスト ≥ 3:1 を維持）。§5.0 A の真の disabled が参照する |

**対応:** D-1 / D-2 は scripts/design_review.js の CUMULATIVE_CONTEXT に現状を明記する。D-3 / D-4 / D-5 は DS v0.13 昇格時に追加する（いずれも Phase 4 着手と同時）。

### 派生 TODO（本書作成中に検出）

| ID | 内容 |
|---|---|
| T-1 | S-20 入力バーの最大高さ（4 行自動伸長）の実装数値確定 |
| T-2 | S-30 サブタブ 4 個のスワイプジェスチャ実装詳細 |
| T-3 | S-13 未保存変更時の確認ダイアログコンポーネント設計（本書で言及のみ） |
| T-4 | S-00 スプラッシュの星屑装飾削除（G-7 Phase B 吸収） |
| T-5 | 全画面のテーマ切替時の遷移アニメーション規定（design_system §6 で定義） |

---

## 8. 変更履歴

| 日付 | バージョン | 変更内容 |
|---|---|---|
| 2026-04-14 | v1.0 DRAFT | 初版。Phase A 10画面のレイアウト仕様を確定。残存 CRITICAL 17 件を §7 Phase 4 対応リストへ移管 |

---

**本書は Lais プロジェクトの Phase A デザイン確定版として機能する。本書を根拠として Phase 4 実装を開始してよい。**
