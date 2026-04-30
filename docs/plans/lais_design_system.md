# Lais — デザインシステム v0.12
> Life AI Support（ライス）
> 作成: 2026-04-12 / 最終更新: 2026-04-12
> ステータス: CONFIRMED（R1-R10 反映 → R11 Code直接レビュー検証パス。CRITICAL 0 / HIGH 0 確認済み。v1.0 相当）
> 依存: docs/plans/lais_project_v1.md v1.4 CONFIRMED, docs/plans/lais_ux_v1.md v1.15 CONFIRMED
> 責務: ビジュアル基盤。ブランド/テーマ/色/フォント/余白/アニメーション/コンポーネントトークン
> dev-system準拠: docs/plans/dev_system_spec.md §19

---

## 0. ビジュアルベンチマーク（dev-system §19.7準拠）

### 0.1 調査対象

| # | アプリ名 | カテゴリ | 評価 | 調査日 |
|---|---------|---------|------|-------|
| 1 | Habitica | ゲーミフィケーション習慣 | 4.1★ iOS / 4.0★ Android | 2026-04-12 |
| 2 | Finch | セルフケア+ペット育成 | 4.8★ iOS / 4.6★ Android | 2026-04-12 |
| 3 | Habitify | ミニマリスト習慣トラッカー | 4.6★ iOS | 2026-04-12 |
| 4 | Streaks | ミニマリスト習慣（Apple Design Award） | 4.9★ iOS | 2026-04-12 |
| 5 | Loop Habit Tracker | オープンソース習慣 | 4.4★ Android | 2026-04-12 |

### 0.2 デザイン言語マトリクス

| 観点 | Habitica | Finch | Habitify | Streaks | Loop | Lais方針 |
|------|---------|-------|---------|--------|------|---------|
| **全体印象** | RPGピクセルアート。レトロゲーム | パステル＋角丸。柔らかく癒し系 | クリーン＆データ志向。グラフが主役 | 太字＋大ボタン。ミニマル極限 | Material Design標準。質素 | **洗練＋自然体。実世界に溶け込む** |
| **カラースキーム** | 紫/ラベンダー基調 | パステル暖色 | 白基調＋単色アクセント | オレンジ/黒デフォルト。78テーマ | 緑/ティール系 | **テーマ別。自然界/文化に根ざした4スキーム** |
| **ダーク/ライト** | ダークは非公式のみ | ライトのみ | システム追従 | 両対応 | ダーク対応 | **4テーマ（ダーク2/ライト2）＋グラスモーフィズムトグル** |
| **タイポグラフィ** | システム＋ピクセル混在 | 丸みの柔らかいフォント | システム。数値太め | SF Pro系。大きく太い | Roboto | **system-ui統一。デバイスと一体化** |
| **アイコン** | ピクセルアート混在 | 手描き風キャラ中心 | ミニマルライン | 600+タスクアイコン | マテリアル | **SF Symbols風＋独自アバター体系** |
| **角丸** | 小さめ | 大きめ | 中程度 | 完全円形ボタン | 8dp標準 | **サイズ比例。4/8/12/999px** |
| **余白** | 詰まり気味 | ゆったり | 適度 | 大胆に広い | 標準 | **Open Air。呼吸するリズム** |
| **アニメーション** | RPG的エフェクト | ペット反応 | 控えめ | ほぼなし | なし | **物理ベースspring基調。状態遷移はease系許可（§7.1）** |

### 0.3 差別化マッピング

| # | 競合の課題（デザイン面） | Laisの対応方針 | 対応セクション |
|---|------------------------|-------------|-------------|
| 1 | Habiticaのピクセルアート→大人が使いにくい | 洗練モダンUIにゲーミフィケーション構造を内包 | §1 |
| 2 | Finchのパステル→「かわいい」過ぎて層を選ぶ | 4テーマで性格を分離（集中/朝の清々しさ/文化的ポップ昼/文化的ポップ夜） | §5 |
| 3 | Habitify/Streaks→実用的だが感情的つながりが薄い | アバター＋演出で感情的価値を提供 | §7 |
| 4 | 全競合→テーマ選択肢が少ない（最大Streaksの78色＝色違いのみ） | 4テーマ × グラスon/off＝8バリエーション。テーマごとに性格を持つ | §5 |
| 5 | 全競合→「アプリっぽい」見た目 | 自然界/文化ベースの色＋system-ui＋控えめUIで実世界と地続き | §1 |

---

## 1. ブランド定義

### 1.1 ブランドDNA
**「洗練して生きよう。憧れの姿になるように。」**

Laisは実世界の延長線上にあるアプリ。画面を開いた瞬間に「別世界」に入るのではなく、
今の自分の生活空間にそっと寄り添う存在。洗練されているが親しみやすく、気軽に開ける。

### 1.2 デザイン原則（優先順）
1. **実世界との地続き感** — 色は自然界または文化的モチーフ（桜・祭り・ベルベット・宝石等）に根ざすもの。ネオン/サイバーパンク禁止。デバイスのフォントを使い、ユーザーの環境と一体化する
2. **洗練＋親しみ** — 高級ブランドの距離感ではなく、よく行くカフェの心地よさ。開きたくなるアプリ
3. **構造的ゲーミフィケーション** — ゲーム画面は出さない。ゲームの「気持ちよさ」を持った大人のUI
4. **ユーザーの自己表現** — テーマ選択＋アバターカスタマイズで「自分のアプリ」にする
5. **静かな情報設計** — 必要な情報だけ表示。サマリー→タップで詳細展開（階層型）

### 1.3 ロゴ・ブランドマーク（placeholder）
**ステータス:** 未確定。v1.0リリース前に別ミッション（LAIS-BRAND-01）で策定予定。
- 暫定ロゴタイプ: `Lais` — system-ui font-weight 200、letter-spacing 3px、font-size 52px（Splash）/ 36px（Sign-in等）
- 余白ルール: ロゴ周囲にロゴ高さの 50% 以上の余白を確保（暫定）
- ロゴの色: テーマごとの `--accent` を使用（暫定）
- シンボル/アイコンマーク: 未定

### 1.4 トーンオブボイス
- **基本方針:** 敬語（です・ます調）
- **UIクローム（メニュー・ボタン・ラベル）:** 絵文字禁止。システム的な落ち着き
- **フィードバック/祝福系（ux_v1準拠 §3.4 §8.3-5）:** 絵文字許可。ゴール達成・レベルアップ・冒険検出・応援ボタンなどの『瞬間の高揚感』を表現する文脈では絵文字（🎉⚔️☀️💪等）を使用可能。ただし連発は禁止し、1メッセージに1〜2個まで
- **カジュアル例外:** Harajuku Light/Dark テーマ時、通知文・トーストメッセージのみ語尾を柔らかく。基調の敬語は維持
- **禁止表現:** 命令形（「〜してください」を除く）、感嘆符の連発、顔文字、ネットスラング
- **AIトークの語調:** 親しみやすいが敬語維持。ユーザー呼称は「あなた」
- **マイクロコピー長さ:** ボタン=全角4〜8文字、トースト=全角20文字以内、空状態=全角40文字以内
- **破壊的操作の確認文言:** 2段構造『結果の可視化（戻せない等）+ 最終確認』を推奨。例: 「ゴールを削除すると、関連するタスクも全て削除されます。本当に削除しますか？」

### 1.5 ブランドチェックリスト
- [ ] このUIは「どのアプリか」ロゴを隠しても分かるか？
- [ ] 画面を開いた瞬間に深呼吸したくなる静けさがあるか？（Night Sky/Dawn）または心が弾む高揚感があるか？（Harajuku系）
- [ ] 現実世界のカフェやリビングに置いても違和感がない色合いか？
- [ ] ゲーム要素が洗練されたUIの中に構造的に内包されているか？
- [ ] ユーザーが「自分のアプリ」と感じられるカスタマイズ性があるか？

### 1.6 NGリスト（AIっぽさ排除。dev-system §4.7準拠）

**色 — NG:**
- 紫→青グラデーション（AI slop定番）
- ネオンカラー on ダーク背景
- 純黒 `#000000` を背景として使用（`#0A0C10` などわずかにトーンを含ませる）
- 純白 `#FFFFFF` を**背景として広範に**使用。ただし `--bg-surface`/`--bg-elevated` がわずかに暖色/寒色に寄ったオフホワイトであることを要件とする。白テキスト色は許可
- グラデーション文字
- アクセント色の同時使用は1画面につきプライマリ1色＋セマンティック4色まで

**フォント — NG:**
- Inter, Roboto, Arial を指定（system-uiのみ）
- カスタムWebフォント読み込み
- 全要素が同じfont-weight

**レイアウト — NG:**
- カード in カード（ネストコンテナ）
- 全要素が等間隔 / 全要素が中央揃え
- 3列以上のグリッドカード（モバイル）
- ヒーローメトリクスレイアウト（大数字+小ラベル+グラデーション線）

**エフェクト — NG:**
- 意味のない装飾アニメーション（パルス、グロー、フロート）
- drop-shadow / blur を装飾目的で使用（グラスモーフィズムon時は機能目的で許可）
- ease-in-out を「長時間の注意を惹く演出」に使用。ただしUX仕様書で明示された状態遷移（モーダル開閉、トースト、タブフェード等）のease-out/ease-inは許可（§7.1参照）

---

## 2. カラーシステム

### 2.1 色の原則
- **自然界／文化ソース:**
  - Night Sky = 夜空・月明かり
  - Dawn = 朝焼け・土・木
  - Harajuku Light = 桜・苺・クリーム（昼の原宿）
  - Harajuku Dark = ベルベット・ルビー・プラム（夜の原宿）
- **セマンティックカラー:** 全テーマ共通で意味を持つ色は統一（値はテーマ別に上書き）
  - success（完了/EXP獲得）: 緑系
  - danger（エラー/削除/overdue）: 赤系
  - warning（注意/期限接近）: アンバー系
  - info（リンク/情報）: 青系
- **アクセント色制限:** 1テーマにつきプライマリアクセント1色＋セマンティック4色まで

### 2.2 リンク色の役割分離
`--accent` と `--info` は役割が異なる:
- **`--accent`** = ブランド/リンク/インタラクティブ要素の主色。**テキストリンクはこれを使う。**
- **`--info`** = 情報系セマンティック（情報バナー、チップ、ツールチップ背景等のクローム）。テキストリンクには使わない。
- **非色依存の手掛かり:** インラインテキストリンクは必ず `text-decoration: underline` を併用（WCAG 1.4.1 カラーのみ伝達禁止）

### 2.3 セマンティックカラー既定値
テーマごとに §5 で上書き必須。既定値はダーク系テーマ用。

| 用途 | ダーク系 既定 | ライト系 既定 |
|------|-------------|-------------|
| success | #3FB950 | #1A7F37 |
| success-subtle | rgba(63,185,80,0.12) | rgba(26,127,55,0.10) |
| danger | #F85149 | #CF222E |
| danger-subtle | rgba(248,81,73,0.12) | rgba(207,34,46,0.10) |
| warning | #D29922 | #9A6700 |
| warning-subtle | rgba(210,153,34,0.14) | rgba(154,103,0,0.10) |
| info | #58A6FF | #0969DA |
| info-subtle | rgba(88,166,255,0.12) | rgba(9,105,218,0.10) |

### 2.4 Overdue（期限切れタスク）トークン
project_v1 §3.2.4 の要件:
- `--overdue`: danger系と同値（`var(--danger)`を再利用）
- `--overdue-subtle`: `var(--danger-subtle)`を再利用
- 表示時は赤テキストに加え、リスト左側に3px solid --overdue のバーを付け、色以外でも判別可能にする（WCAG 1.4.1 非色依存）

---

## 3. タイポグラフィ

### 3.1 フォントファミリー
```css
--font-primary: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
--font-display: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
```
- カスタムWebフォント読み込み **禁止**
- system-uiを使うことでデバイスのネイティブ感を維持し、実世界との一体感を強化

### 3.2 サイズスケール
rem 基底（`html { font-size: 16px }` 前提）。ユーザーがブラウザ設定でフォントサイズを変更した場合に追従する。
| トークン | rem値 | 16px換算 | 推奨line-height | 用途 |
|---------|------|---------|----------------|------|
| --font-size-xs | 0.6875rem | 11px | 1.35 | **キャプション・時刻のみ。本文・重要情報には使用禁止** |
| --font-size-sm | 0.875rem | 14px | 1.4 | 補助テキスト、ラベル |
| --font-size-base | 1rem | 16px | 1.5 | 本文 |
| --font-size-lg | 1.25rem | 20px | 1.4 | セクション見出し |
| --font-size-xl | 1.75rem | 28px | 1.3 | 画面タイトル |
| --font-size-2xl | 2.25rem | 36px | 1.15 | 大数字（EXP、レベル） |
| --font-size-3xl | 3rem | 48px | 1.0 | ヒーロー数字 |

### 3.3 ウェイト・行間・字間トークン
```css
--font-weight-thin: 200;       /* font-size-2xl 以上限定 */
--font-weight-regular: 400;    /* 本文 */
--font-weight-semibold: 600;   /* 見出し */

/* line-height: サイズごとのペア（§3.2 の推奨表と対応） */
--line-height-xs: 1.35;
--line-height-sm: 1.4;
--line-height-base: 1.5;
--line-height-lg: 1.4;
--line-height-xl: 1.3;
--line-height-2xl: 1.15;
--line-height-3xl: 1.0;

--letter-spacing-heading: -0.5px;
--letter-spacing-body: 0;
--letter-spacing-label: 1.5px; /* 大文字ラベル */
```

タイポグラフィ実装では `.heading-xl` 等の名前付きスタイルを使う代わりに、font-size トークンとペアで line-height トークンを参照することを推奨。例: `font: var(--font-weight-semibold) var(--font-size-xl)/var(--line-height-xl) var(--font-display);`

### 3.4 日本語タイポグラフィ調整（dev-system §19.10 D準拠）

日本語グリフは英語より幅が広く、同一font-sizeでも視覚的に大きく見える。日英混在UIでは以下を適用する。

```css
/* 日本語テキスト用オーバーライド */
--letter-spacing-ja: -0.02em;    /* 英語の 0 より詰めて間延び防止 */
--line-height-ja-body: 1.7;      /* 漢字の画数が多いため英語1.5より広く */
--line-height-ja-heading: 1.35;  /* 見出しは締める */
```

**適用ルール:**
- 英字ラベル（TODAY/GOALS/EXPLORER等）: `--letter-spacing-label: 1.5px` 維持。全角トラッキングを適用しない
- 日本語本文（タスク名/メモ/説明文等）: `letter-spacing: var(--letter-spacing-ja)` + `line-height: var(--line-height-ja-body)`
- 日本語見出し: `letter-spacing: var(--letter-spacing-heading)` + `line-height: var(--line-height-ja-heading)`
- 混在テキスト: `overflow-wrap: break-word` 使用。`word-break: break-all` **禁止**（英単語の途中で改行されるため）
- **サイズ調整の余地:** 英字UIラベルの横に日本語説明が入る場合、日本語テキストを1段階小さいトークンで表示することを許可（例: ラベル16px + 日本語説明14px）。ただし --font-size-xs（11px）を日本語本文に使用することは§3.2と同様に禁止

---

## 4. 余白・レイアウト

### 4.1 スペーシングスケール
```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 40px;    /* セクション間 */
--space-2xl: 64px;   /* 画面上部マージン */
```

### 4.2 レイアウト原則: Open Air
- **カードで囲まない。** 余白と薄いborderで区切る（グラスモーフィズムon時のみカード背景許可）
- タスク間余白: リスト内アイテム間≧8px（タイムライン等のコンパクトリスト）、独立カード間≧20px
- セクション間: ≧32px（コンテンツ量が多い画面では32px許容。標準は40px）
- 角丸トークン: `--radius-sm: 4px` / `--radius-md: 8px` / `--radius-lg: 12px` / `--radius-pill: 999px`

### 4.3 グリッド
- モバイル: 1カラム。左右パディング --space-md (16px)
- コンテナ最大幅: 480px（タブレット/デスクトップ時）
- 左揃えベース。中央揃えは大数字・空状態メッセージのみ

### 4.4 z-index階層トークン（新設）
```css
--z-base: 0;
--z-sticky: 100;        /* sticky header, タイムラインセクション見出し */
--z-tabbar: 200;        /* ボトムタブバー */
--z-fab: 300;           /* FAB */
--z-dropdown: 400;
--z-overlay: 500;       /* モーダル背景 */
--z-modal: 510;         /* ハーフモーダル、フルモーダル */
--z-bottomsheet: 520;
--z-drawer: 530;
--z-toast: 700;         /* トーストは通知として最前面 */
--z-tooltip: 600;       /* ツールチップはモーダル上だがトースト下 */
```
**ルール:** コンポーネントCSSでハードコード禁止。必ずトークン参照。

### 4.5 タップターゲット最小サイズ
- インタラクティブ要素の最小タップ領域: 44×44px（WCAG 2.5.5 / Apple HIG）
- `--tap-target-min: 44px`
- チップ等で視覚高さが小さい場合は padding または `::before` で透明タップ領域を拡張する

---

## 5. テーマ定義

全4テーマ（project_v1.md §3.5 / ux_v1.md §5.2 Step 5 に準拠）。
各テーマのCSSトークンをCSS custom propertiesとして定義し、テーマ切替時に `:root[data-theme="..."]` を差し替える。
**全テーマでタブ構造・Open Air余白・タイポスケール・アニメーショントークンは共通。** 性格差は色とマイクロコピー、アクセント濃度で表現する。

### 5.0 テーマ切替の永続化・FOUC対策

**レンダリング前提:** Lais は SPA + PWA（単一ページアプリ）として実装される。初回 HTML 配信時点ではサーバー側がユーザー設定を把握しないため、Cookie ベースで送出するのが理想だが、クライアントのみで完結させる場合は下記のインラインスクリプト方式で FOUC を最小化する。

**テーマ切替アニメーション（クラスベース・副作用なし実装）:**
テーマ切替時のみトランジションを有効化するため、`.theme-switching` クラスを一時的に :root に付与する。通常時は :root にトランジションを付けない（SPA 内の他の背景色変更を巻き込まないため）。

```css
/* :root のみトランジション。子要素に一括適用しない（長文リスト等で再描画コストを避ける） */
html.theme-switching,
html.theme-switching body,
html.theme-switching .lais-theme-surface {
  transition: background-color var(--duration-normal) var(--ease-out),
              color var(--duration-normal) var(--ease-out),
              border-color var(--duration-normal) var(--ease-out);
}
```

テーマ切替時に視覚的にフェードさせたい要素は `.lais-theme-surface` クラスを付与する。ブランクリストスクロール中のテーマ切替でフレームドロップを避けるため、トランジション対象はオプトインとする。

```js
// テーマ切替関数（race condition セーフ）
let themeSwitchTimerId = null;
function setTheme(nextTheme) {
  const root = document.documentElement;
  // 前回の切替中に連続呼び出しされた場合、前回タイマーをキャンセル
  if (themeSwitchTimerId !== null) {
    clearTimeout(themeSwitchTimerId);
  }
  root.classList.add('theme-switching');
  root.dataset.theme = nextTheme;
  try { localStorage.setItem('lais.theme', nextTheme); } catch (e) {}
  // サーバー同期（ux_v1 §12.2）
  fetch('/users/preferences', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme: nextTheme })
  }).catch(() => {}); // オフライン時は localStorage のみで継続
  // transitionend または保険タイムアウトでクラスを外す
  themeSwitchTimerId = setTimeout(() => {
    root.classList.remove('theme-switching');
    themeSwitchTimerId = null;
  }, 400); // --duration-normal (350ms) より僅かに長い
}
```

**配置ルール（FOUC完全回避）:**
- 下記の永続化スクリプトは `index.html` の `<head>` 内、**スタイルシート `<link>` よりも前**にインライン配置する
- `<html>` 要素に初期値 `data-theme="night-sky" data-glass="off"` を静的属性として記述し、スクリプト失敗時もデフォルトテーマで描画される
- CSS側は `html[data-theme="night-sky"]` 等のセレクタで :root と同等の役割を持たせる（script失敗時フォールバック）

```html
<html lang="ja" data-theme="night-sky" data-glass="off">
<head>
  <script>
  (function(){
    try {
      var t = localStorage.getItem('lais.theme');
      var g = localStorage.getItem('lais.glass');
      if (t) document.documentElement.dataset.theme = t;
      if (g) document.documentElement.dataset.glass = g;
    } catch (e) {}
  })();
  </script>
  <link rel="stylesheet" href="/styles.css">
```
- localStorageキー: `lais.theme` (night-sky | dawn | harajuku-light | harajuku-dark) / `lais.glass` (on | off)
- サーバー同期は設定画面の変更時にPATCH /users/preferencesへ送信（ux_v1 §12.2）
- `<meta name="theme-color">` は `<head>` 内で JS により現在の `--bg-primary` と同期

### 5.1 Night Sky（デフォルト・ダーク）
**性格:** 洗練・集中。月明かりの下で静かにジャーナルを書く感覚
**想定シーン:** 夜の使用、集中モード
```css
:root[data-theme="night-sky"] {
  --bg-primary: #0D1117;
  --bg-surface: #161B22;
  --bg-elevated: #1C2128;
  --bg-secondary: #1C2128;     /* エイリアス: ux_v1 スケルトン用 */
  --border: #484F58;           /* 装飾的な薄border（非インタラクティブ要素） */
  --border-strong: #6E7681;    /* bg-surface上で約3.6:1 WCAG 1.4.11準拠 */
  --scrim: rgba(0, 0, 0, 0.6);
  --text-primary: #E6EDF3;
  --text-secondary: #9BA7B4;  /* bg-primary上で約5.5:1 */
  --text-hint: #7A8593;       /* bg-primary上で約4.5:1 */
  --text-disabled: #484F58;
  --bg-disabled: #1C2128;

  --accent: #79C0FF;          /* ブランド/リンク（ダーク背景で6.1:1、infoと差別化） */
  --accent-hover: #A5D6FF;
  --accent-pressed: #58A6FF;
  --accent-subtle: rgba(121, 192, 255, 0.14);
  --accent-subtle-hover: rgba(121, 192, 255, 0.20);
  --accent-subtle-pressed: rgba(121, 192, 255, 0.28);
  --on-accent-subtle: #79C0FF;  /* subtle背景上のテキスト色 (Dark: accent色を流用) */

  /* ボタン用: 白テキストで4.5:1を確保するため濃いめ */
  --button-primary-bg: #1A5FC8;        /* 白文字で5.99:1 (より厳格にAA AA達成) */
  --button-primary-fg: #FFFFFF;
  --button-primary-bg-hover: #1158C7;  /* 白文字で6.51:1（hover=より濃く） */
  --button-primary-bg-pressed: #0A4AAD;/* 白文字で7.85:1 */
  --button-danger-bg: #DA3633;         /* 白文字で4.63:1 (Dark用darker) */
  --button-danger-bg-hover: #B62B28;
  --button-danger-bg-pressed: #951F1D;
  --button-danger-fg: #FFFFFF;
  --danger-hover:  #D1353D;
  --danger-pressed:#B02934;
  --danger-subtle-hover: rgba(248,81,73,0.18);
  --danger-subtle-pressed: rgba(248,81,73,0.24);
  --success-hover: #339549;
  --success-pressed:#277039;
  --success-subtle-hover: rgba(63,185,80,0.18);
  --success-subtle-pressed: rgba(63,185,80,0.24);
  --warning-hover:#B8841F;
  --warning-pressed:#966A19;
  --warning-subtle-hover: rgba(210,153,34,0.20);
  --warning-subtle-pressed: rgba(210,153,34,0.26);
  --info-hover:   #388BFD;
  --info-pressed: #1F6FEB;
  --info-subtle-hover: rgba(88,166,255,0.18);
  --info-subtle-pressed: rgba(88,166,255,0.24);

  /* Semantic（ダーク系既定） */
  --success: #3FB950; --success-subtle: rgba(63,185,80,0.12);
  --danger:  #F85149; --danger-subtle:  rgba(248,81,73,0.12);
  --warning: #D29922; --warning-subtle: rgba(210,153,34,0.14);
  --info:    #58A6FF; --info-subtle:    rgba(88,166,255,0.12);

  /* Shadow（ダーク系は強く） */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.4);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.5);
  --shadow-lg: 0 12px 32px rgba(0,0,0,0.6);

  /* Focus ring */
  /* focus-ring: v0.9 で outline 方式に移行。トークンは v1.0 で廃止 */
}
```

### 5.2 Dawn（ライト）
**性格:** 朝の清々しさ。温かみ。一日の始まりに開きたくなる
**想定シーン:** 朝の日課、通勤中
```css
:root[data-theme="dawn"] {
  --bg-primary: #FBF8F4;
  --bg-surface: #FEFCF9;      /* オフホワイト（純白禁止に準拠） */
  --bg-elevated: #FFFDFA;
  --bg-secondary: #F2EDE5;
  --border: #D9CFC2;           /* 装飾的な薄border（非インタラクティブのみ） */
  --border-strong: #8A7A65;    /* bg-surface上で約3.4:1 WCAG 1.4.11準拠 */
  --scrim: rgba(50, 30, 10, 0.5);
  --text-primary: #2C2520;     /* ~14:1 */
  --text-secondary: #5C5045;   /* ~7.1:1 */
  --text-hint: #6A5E52;        /* ~5.9:1（AA余裕） */
  --text-disabled: #BDB1A4;
  --bg-disabled: #F2EDE5;

  --accent: #8F4D1F;           /* テラコッタ 白背景で6.42:1 */
  --accent-hover: #763F17;
  --accent-pressed: #5C3010;
  --accent-subtle: rgba(143, 77, 31, 0.36);    /* 合成後bg surfaceと3:1確保（Dawn） */
  --accent-subtle-hover: rgba(143, 77, 31, 0.44);
  --accent-subtle-pressed: rgba(143, 77, 31, 0.52);
  --on-accent-subtle: #2C2520;   /* subtle背景上のテキスト色 (Light: text-primaryを流用) */

  --button-primary-bg: #8F4D1F;
  --button-primary-fg: #FFFFFF;
  --button-primary-bg-hover: #763F17;
  --button-primary-bg-pressed: #5C3010;
  --button-danger-bg: #A71B26;     /* Light用 白文字7.40:1 */
  --button-danger-bg-hover: #8A1520;
  --button-danger-bg-pressed: #6E1019;
  --button-danger-fg: #FFFFFF;
  /* Danger 基本値はここで darker版に置換（AA余裕確保） */
  --danger-hover:  #8A1520;
  --danger-pressed:#8A1520;
  --danger-subtle-hover: rgba(167,27,38,0.16);
  --danger-subtle-pressed: rgba(167,27,38,0.24);
  --success-hover: #146B2E;
  --success-pressed:#0E5525;
  --success-subtle-hover: rgba(26,127,55,0.14);
  --success-subtle-pressed: rgba(26,127,55,0.20);
  --warning-hover: #805500;
  --warning-pressed:#664400;
  --warning-subtle-hover: rgba(154,103,0,0.14);
  --warning-subtle-pressed: rgba(154,103,0,0.20);
  --info-hover:    #0758B8;
  --info-pressed:  #054999;
  --info-subtle-hover: rgba(9,105,218,0.14);
  --info-subtle-pressed: rgba(9,105,218,0.20);

  --success: #146B2E; --success-subtle: rgba(20,107,46,0.14);
  --danger:  #A71B26; --danger-subtle:  rgba(167,27,38,0.14);    /* AA余裕確保 */
  --warning: #805500; --warning-subtle: rgba(128,85,0,0.14);
  --info:    #0758B8; --info-subtle:    rgba(7,88,184,0.14);

  --shadow-sm: 0 1px 2px rgba(90,60,20,0.08);
  --shadow-md: 0 4px 12px rgba(90,60,20,0.10);
  --shadow-lg: 0 12px 32px rgba(90,60,20,0.12);

  /* focus-ring: v0.9 で outline 方式に移行。トークンは v1.0 で廃止 */
}
```

### 5.3 Harajuku Light（ライト・ポップ）
**性格:** 桜・苺ミルクの昼下がり。明るく文化的で弾む気分
**想定シーン:** 週末の外出、気分を上げたい朝、チャレンジ開始時
```css
:root[data-theme="harajuku-light"] {
  --bg-primary: #FDF6F7;
  --bg-surface: #FFFAFB;
  --bg-elevated: #FFFCFD;
  --bg-secondary: #F5E6EA;
  --border: #EED2D9;
  --border-strong: #9A6070;    /* bg-surface上で約3.5:1 WCAG 1.4.11準拠 */
  --scrim: rgba(80, 20, 40, 0.5);
  --text-primary: #2A1A20;
  --text-secondary: #5E434D;
  --text-hint: #7C5B66;
  --text-disabled: #C7A9B0;
  --bg-disabled: #F5E6EA;

  --accent: #C43361;           /* ローズレッド 白背景で5.28:1 */
  --accent-hover: #A6264E;
  --accent-pressed: #8A1D3E;
  --accent-subtle: rgba(196, 51, 97, 0.32);    /* 合成後bg surfaceと3:1確保 */
  --accent-subtle-hover: rgba(196, 51, 97, 0.40);
  --accent-subtle-pressed: rgba(196, 51, 97, 0.48);
  --on-accent-subtle: #2A1A20;   /* subtle背景上のテキスト色 (Light) */

  --button-primary-bg: #C43361;
  --button-primary-fg: #FFFFFF;
  --button-primary-bg-hover: #A6264E;
  --button-primary-bg-pressed: #8A1D3E;
  --button-danger-bg: #C93000;     /* Light用 白文字5.35:1 accent色相と差別化 */
  --button-danger-bg-hover: #A72800;
  --button-danger-bg-pressed: #862000;
  --button-danger-fg: #FFFFFF;
  --danger-hover:  #A72800;
  --danger-pressed:#862000;
  --danger-subtle-hover: rgba(201,48,0,0.16);
  --danger-subtle-pressed: rgba(201,48,0,0.24);
  --success-hover: #146B2E;
  --success-pressed:#0E5525;
  --success-subtle-hover: rgba(26,127,55,0.14);
  --success-subtle-pressed: rgba(26,127,55,0.20);
  --warning-hover: #805500;
  --warning-pressed:#664400;
  --warning-subtle-hover: rgba(154,103,0,0.14);
  --warning-subtle-pressed: rgba(154,103,0,0.20);
  --info-hover:    #0758B8;
  --info-pressed:  #054999;
  --info-subtle-hover: rgba(9,105,218,0.14);
  --info-subtle-pressed: rgba(9,105,218,0.20);

  --success: #146B2E; --success-subtle: rgba(20,107,46,0.14);
  --danger:  #C93000; --danger-subtle:  rgba(201,48,0,0.14);   /* accent(#C43361)と色相差別化 */
  --warning: #805500; --warning-subtle: rgba(128,85,0,0.14);
  --info:    #0758B8; --info-subtle:    rgba(7,88,184,0.14);

  --shadow-sm: 0 1px 2px rgba(120,30,60,0.08);
  --shadow-md: 0 4px 12px rgba(120,30,60,0.10);
  --shadow-lg: 0 12px 32px rgba(120,30,60,0.12);

  /* focus-ring: v0.9 で outline 方式に移行。トークンは v1.0 で廃止 */
}
```

### 5.4 Harajuku Dark（ダーク・ポップ）
**性格:** ベルベット・ルビー・プラム。夜の原宿。大人のポップ
**想定シーン:** 夜の気分転換、週末夜、特別モード
```css
:root[data-theme="harajuku-dark"] {
  --bg-primary: #140A10;
  --bg-surface: #1F1018;
  --bg-elevated: #2A1720;
  --bg-secondary: #2A1720;
  --border: #5C2E43;
  --border-strong: #8A6978;     /* bg-surface上で約3.8:1 WCAG 1.4.11準拠 */
  --scrim: rgba(0, 0, 0, 0.6);
  --text-primary: #F5E8EE;
  --text-secondary: #B89CA7;
  --text-hint: #8C7480;         /* bg-primary上で約4.5:1 */
  --text-disabled: #5C4E55;
  --bg-disabled: #2A1720;

  --accent: #F5A9BF;            /* パステルピンク ダーク背景で高コントラスト */
  --accent-hover: #FFBACC;
  --accent-pressed: #D98AA0;
  --accent-subtle: rgba(245, 169, 191, 0.14);
  --accent-subtle-hover: rgba(245, 169, 191, 0.22);
  --accent-subtle-pressed: rgba(245, 169, 191, 0.28);
  --on-accent-subtle: #F5A9BF;  /* subtle背景上のテキスト色 (Dark: accent色を流用) */

  /* 明るいアクセント上の文字は濃色を採用 */
  --button-primary-bg: #F5A9BF;
  --button-primary-fg: #140A10;     /* 10.3:1 */
  --button-primary-bg-hover: #FFBACC;
  --button-primary-bg-pressed: #D98AA0;
  --button-danger-bg: #DA3633;        /* Dark用darker (白文字4.63:1) */
  --button-danger-bg-hover: #B62B28;
  --button-danger-bg-pressed: #951F1D;
  --button-danger-fg: #FFFFFF;
  --danger-hover:  #D1353D;
  --danger-pressed:#B02934;
  --danger-subtle-hover: rgba(248,81,73,0.20);
  --danger-subtle-pressed: rgba(248,81,73,0.28);
  --success-hover: #339549;
  --success-pressed:#277039;
  --success-subtle-hover: rgba(63,185,80,0.20);
  --success-subtle-pressed: rgba(63,185,80,0.28);
  --warning-hover: #B8841F;
  --warning-pressed:#966A19;
  --warning-subtle-hover: rgba(210,153,34,0.22);
  --warning-subtle-pressed: rgba(210,153,34,0.30);
  --info-hover:    #388BFD;
  --info-pressed:  #1F6FEB;
  --info-subtle-hover: rgba(121,184,255,0.20);
  --info-subtle-pressed: rgba(121,184,255,0.28);

  --success: #3FB950; --success-subtle: rgba(63,185,80,0.12);
  --danger:  #F85149; --danger-subtle:  rgba(248,81,73,0.12);
  --warning: #D29922; --warning-subtle: rgba(210,153,34,0.14);
  --info:    #79B8FF; --info-subtle:    rgba(121,184,255,0.12);

  --shadow-sm: 0 1px 2px rgba(0,0,0,0.5);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.6);
  --shadow-lg: 0 12px 32px rgba(0,0,0,0.7);

  /* focus-ring: v0.9 で outline 方式に移行。トークンは v1.0 で廃止 */
}
```

### 5.5 グラスモーフィズムトグル（全テーマ横断）

設定画面でon/off。カード/モーダル/ボトムシート/ドロップダウンの背景に適用。
**非適用:** ボトムタブバー / ヘッダー / インライン要素 / リスト内の多数反復要素（パフォーマンス保護）。

```css
/* Glass OFF（デフォルト） */
:root[data-glass="off"] {
  --card-bg: var(--bg-surface);
  --card-backdrop: none;
  --card-border: 1px solid var(--border-strong);
}

/* Glass ON 共通。ダーク系テーマ向けベース */
:root[data-glass="on"] {
  --card-bg: rgba(255, 255, 255, 0.08);
  --card-backdrop: blur(16px) saturate(180%);
  --card-border: 1px solid rgba(255, 255, 255, 0.24);  /* 非テキスト3:1確保 */
}

/* ライト系テーマの Glass ON 上書き */
:root[data-theme="dawn"][data-glass="on"],
:root[data-theme="harajuku-light"][data-glass="on"] {
  --card-bg: rgba(255, 255, 255, 0.65);
  --card-backdrop: blur(16px) saturate(180%);
  --card-border: 1px solid rgba(0, 0, 0, 0.30);  /* 非テキスト3:1確保 */
}

/* Safari/iOS プレフィックス + 非対応フォールバック */
@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {
  .glass-surface {
    backdrop-filter: var(--card-backdrop);
    -webkit-backdrop-filter: var(--card-backdrop);
  }
}
/* プログレッシブエンハンスメント: 基本は不透明 background、対応ブラウザで上書き */
.glass-surface {
  background: var(--bg-surface);           /* フォールバック（非対応ブラウザ用） */
  border: var(--card-border);
}
@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {
  .glass-surface {
    background: var(--card-bg);            /* 対応ブラウザでは半透明＋backdrop-filter */
    backdrop-filter: var(--card-backdrop);
    -webkit-backdrop-filter: var(--card-backdrop);
  }
}
```

**パフォーマンス制約:** backdrop-filterは同時30要素以内。タイムラインの個別タスク行には適用せず、タイムライン全体を包むコンテナのみ適用する。設定に「モーション/視覚効果を減らす」検知時は自動OFF（§7.5）。

---

## 6. アイコン・イラスト体系

### 6.1 アイコンスタイル
- SF Symbols風 outline。stroke-width: 1.5px
- サイズ: 20px（インライン）/ 24px（タブ/ナビ）/ 32px（アクション）
- 状態色: 非アクティブ=`--text-secondary` / アクティブ=`--accent` / 無効=`--text-disabled` / 押下=`--accent-hover`

### 6.2 タブアイコン（GROW / TALK / ME）
| タブ | アイコン | 説明 |
|------|---------|------|
| GROW | 芽（seedling） | 成長・育成のメタファー |
| TALK | チャット吹き出し | AI対話 |
| ME | 人型シルエット | プロフィール・設定 |

Active tab = pill背景(`--accent-subtle`) + アイコン(`--accent`) + ラベル(`--accent`)
非Active = アイコンのみ(`--text-secondary`)、ラベルなし
Active状態は色＋pill背景＋ラベル表示の3要素で示し、色のみの情報伝達を避ける（WCAG 1.4.1）。

### 6.3 アバター
- レベルに応じて段階的に変化（PNGクロスフェード。project_v1.md §3.2.6 / §3.2.4準拠）
- イラストスタイル: フラットベクター風。アウトライン無し。肌/服/髪を単色ベース＋1段濃淡で表現
- プロフィール表示: 円形クリップ、border: 2px solid `--accent`
- サイズ（ux_v1.md §4.2.1, §4.4 準拠）:
  - リスト内インライン: 40px
  - プロフィール要約: 64px
  - 友達詳細: 128px
  - フルビュー/アバター設定: 256px
- **ARIA:** 装飾用途は `alt=""`、機能用途（自分/友達のアイデンティティ表現）は `alt="{ユーザー名}のアバター"` または `aria-label`

### 6.3a アバターパレット（暫定 placeholder。LAIS-BRAND-02 で確定予定）

**肌色（5色・性別中立）:**
`#F4DFCD` / `#E5C3A6` / `#C99775` / `#8D5A3C` / `#5A3824`

**髪色（6色）:**
`#1F1A17`（黒） / `#3D2E25`（ダークブラウン） / `#8B5A3C`（ブラウン） / `#D4A574`（ブロンド） / `#B84C4C`（レッド） / `#A890C4`（パステル）

**服ベース色（8色）:**
各テーマのアクセント色を含む多文化対応パレット。詳細は LAIS-BRAND-02 ミッションで確定。

**ジェンダー表現:** 男性/女性/中立の3系統シルエットを基本とし、ユーザーは自由に組み合わせ可能。「性別」という属性は DB に保存せず、ビジュアル選択のみで表現する。

**文化的多様性:** メガネ・帽子・マフラーなど文化を特定しないアクセサリー群を用意。民族衣装的な要素は placeholder 段階では含めない。

---

## 7. アニメーショントークン

### 7.1 イージングトークン
物理ベースspringを基本とするが、「短時間の状態遷移（モーダル開閉/フェード/タブ移動）」は自然な減衰のease系を許可する。UX仕様書 §1.3 §8.1 §8.3 で指定された挙動と整合。

```css
/* Spring系（overshoot許可可 — scale演出のみ） */
--spring-default: cubic-bezier(0.175, 0.885, 0.32, 1.1);    /* 軽いovershoot */
--spring-gentle:  cubic-bezier(0.25, 0.46, 0.45, 0.94);     /* 減衰 */
--spring-bouncy:  cubic-bezier(0.34, 1.56, 0.64, 1);        /* 強いovershoot — scale系演出専用 */

/* Ease系（translate/opacity の状態遷移向け。overshoot無しで安全） */
--ease-out:      cubic-bezier(0.16, 1, 0.3, 1);
--ease-in:       cubic-bezier(0.32, 0, 0.67, 0);
--ease-in-out:   cubic-bezier(0.83, 0, 0.17, 1);
```

**ルール:**
- translate系（モーダル上昇、リストスライド等）は ease-out / ease-in を使用。spring-bouncy は禁止（画面外突き抜け回避）
- scale系（タスク完了チェック、レベルアップバッジ）は spring-default / spring-bouncy を使用可
- 長時間（>500ms）の繰り返しアニメーションは ease-in-out 禁止（装飾扱い）

### 7.2 デュレーション
```css
--duration-fast: 200ms;    /* タップフィードバック、トグル */
--duration-normal: 350ms;  /* 画面遷移、展開 */
--duration-slow: 500ms;    /* レベルアップ、ゴール達成 */
--duration-celebration: 800ms; /* 特別な演出 */
```

### 7.3 許可されるアニメーション
- 画面遷移（ease-out + duration-normal）
- モーダル上昇（ease-out + duration-normal）
- 展開/折りたたみ（ease-out + duration-fast）
- タスク完了チェック（spring-default + scale + duration-fast）
- EXPバー進行（ease-out + duration-normal）
- レベルアップ演出（spring-bouncy + scale + duration-celebration）
- タブ切替pill移動（ease-out + duration-fast）
- ドラッグフィードバック（直接追従。イージング無し）

### 7.4 触覚フィードバック
- タスク完了: `navigator.vibrate(50)`
- レベルアップ: `navigator.vibrate([30, 50, 80])`
- エラー: `navigator.vibrate([100, 30, 100])`
- **iOS/PWA対応:** iOS Safariは `navigator.vibrate()` 未対応。呼び出し時は例外抑止し、視覚フィードバック（scale+accent-subtle flash）を必ずフォールバックとして提供する
- **設定尊重:** `window.matchMedia('(prefers-reduced-motion: reduce)').matches === true` のとき vibrate 呼び出しを抑止する（Web標準で触覚単体の設定検知APIは存在しないため、prefers-reduced-motion をプロキシとして使用）

### 7.5 forced-colors 対応（Windows High Contrast / Edge）

box-shadow ベースの `--focus-ring` は forced-colors モードで抑止されるため、**直接 `outline` プロパティを使用する**。CSS Custom Property 経由で system-color keyword を格納する方式は取らない（ブラウザ解決挙動が不定のため）。

```css
@media (forced-colors: active) {
  /* 全インタラクティブ要素で outline ベースのフォーカス可視化 */
  button:focus-visible,
  a:focus-visible,
  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible,
  [role="button"]:focus-visible,
  [tabindex]:focus-visible {
    outline: 2px solid Highlight;
    outline-offset: 2px;
  }
  /* 色のみで伝達される状態は形状/テキストで補完 */
  .timeline-dot-done { border: 2px solid CanvasText; }
  .timeline-row-overdue { border-left: 3px solid CanvasText; }
  /* ボタン境界を CanvasText で保証 */
  button { border: 1px solid CanvasText; }
}
```

### 7.6 prefers-reduced-motion 対応（WCAG 2.3.3）

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast: 1ms;
    --duration-normal: 1ms;
    --duration-slow: 1ms;
    --duration-celebration: 1ms;
  }
  /* glass を自動OFF（backdrop-filterが視覚的動きを生むケース対応） */
  :root[data-glass="on"] {
    --card-backdrop: none;
    --card-bg: var(--bg-surface);
  }
  /* 無限ループ/装飾アニメ停止 */
  *, *::before, *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
  }
  /* 例外: 進行の視認性が欠かせる要素は 100ms に短縮（完全無効化しない） */
  .exp-bar-fill,
  .goal-progress-fill,
  [role="progressbar"] > * {
    transition-duration: 100ms !important;
  }
}
```

**ux_v1 §10.5 との整合:** UX 側で「EXPバー伸長は prefers-reduced-motion でも維持」と指定されているため、プログレスバー系は例外として 100ms のダイレクト遷移を残す。

---

## 8. コンポーネントトークン

### 8.1 ボタン

基本高さ: 48px / 角丸: `--radius-md` (8px) / パディング: 0 `--space-lg`
フォント: `--font-weight-semibold`, `--font-size-base`

| 種類 | 背景 | テキスト | hover背景 | pressed背景 | disabled |
|------|------|---------|-----------|-------------|----------|
| Primary | `--button-primary-bg` | `--button-primary-fg` | `--button-primary-bg-hover` | `--button-primary-bg-pressed` | `--bg-disabled` + `--text-disabled` |
| Secondary | `--accent-subtle` | `--on-accent-subtle` | `--accent-subtle-hover` | `--accent-subtle-pressed` | `--bg-disabled` + `--text-disabled` |
| Ghost | `transparent` | `--text-secondary` | `--accent-subtle` | `--accent-subtle-hover` | `transparent` + `--text-disabled` |
| Danger (塗りつぶし) | `--button-danger-bg` | `--button-danger-fg` | `--button-danger-bg-hover` | `--button-danger-bg-pressed` | `--bg-disabled` + `--text-disabled` |
| Danger (subtle) | `--danger-subtle` | `--danger` | rgba(*danger*, 0.18)→ `--danger-subtle-hover` | rgba(*danger*, 0.24)→ `--danger-subtle-pressed` | `--bg-disabled` + `--text-disabled` |

**フォーカス状態:** `outline: 3px solid var(--accent); outline-offset: 2px;` を:focus-visible で適用（box-shadow ではなく outline を使うことで背景依存の合成色問題を回避し、WCAG 2.4.11 SC Focus Appearance の 3:1 指標を確実に満たす）
**disabled時:** pointer-events:none / cursor:not-allowed / opacity:0.6

### 8.2 入力フィールド
- 背景: `--bg-surface`
- ボーダー: 1px solid `--border-strong` → フォーカス時: border `--accent` + `outline: 3px solid var(--accent); outline-offset: 2px;`
- 角丸: `--radius-md` (8px)
- 高さ: 48px
- パディング: 0 `--space-md`
- プレースホルダー色: `--text-hint`
- エラー状態: border `--danger` + エラーメッセージ（下部、`--font-size-sm`, `--danger`）
- disabled: 背景 `--bg-disabled` / テキスト `--text-disabled` / border `--border`
- 補助テキスト: `--font-size-sm`, `--text-secondary`

### 8.3 チップ/バッジ
- 背景: `--accent-subtle`（またはセマンティックsubtle版）
- テキスト: `--on-accent-subtle`（各テーマで subtle 背景上の AA を満たすよう定義済み）
- 角丸: `--radius-pill`
- パディング: 8px 14px（視覚高 32px）
- フォントサイズ: `--font-size-sm`
- **タップターゲット:** 実視覚サイズが44pxに満たない場合、`::before` で透明領域を44×44pxに拡張（連続配置時は `pointer-events:none` で親要素のhit判定を妨げないこと）

### 8.4 タイムライン（GROW画面）
- 縦ライン: `::before`疑似要素 width:2px / left:20px / top:0 / bottom:0
  - 全テーマ: `background: var(--border-strong)` （borderではなくbackground。CSSの線形グラデ対応のため）
- ドット: 視覚サイズ8px circle。**タップ領域はドット行全体（min-height: 44px）がタップ可能。** ドット単体の不可視タップ領域は `::before` で 44×44px を確保
- 状態表現（色のみに依存せずアイコン/形状で区別）:
  - NOW: 塗りつぶし円 `--accent` + 外周ring `--accent-subtle` (12px outer)
  - DONE: ✓マーク入り円 `--success`
  - NEXT: 空円（枠のみ）`--border-strong`
  - OVERDUE: ! マーク入り円 `--danger` + **行全体**左端に 3px solid `--danger` のバー + `aria-label="期限超過"` をドットまたは行に付与
- NOW項目: 詳細展開。テキスト `--text-primary`
- NEXT以降: 控えめ表示。テキスト `--text-secondary`

### 8.5 ボトムシート
- 背景: `--bg-surface`（Glass on時は `--card-bg` + `--card-backdrop`）
- 角丸: 12px 12px 0 0（上のみ）
- ハンドル: 40px × 4px、角丸2px、色 `--border-strong`
- オーバーレイ: `var(--scrim)`
- z-index: `--z-bottomsheet`
- shadow: `--shadow-lg`
- **ARIA:** `role="dialog"` / `aria-modal="true"` / `aria-labelledby`（タイトル要素の id）必須。開閉時はフォーカストラップを実装し、閉じた時は起動要素にフォーカス復元

### 8.6 トースト
- 背景: `--bg-elevated`
- テキスト: `--text-primary`
- 角丸: `--radius-md`
- パディング: `--space-md` `--space-lg`
- shadow: `--shadow-md`
- z-index: `--z-toast`
- 表示時間: 3000ms（通常）/ 5000ms（アクション付きトースト。例:「取り消す」ボタン付き）/ 入: ease-out + duration-normal / 出: ease-in + duration-fast（ADV調停済み 2026-04-12。ux_v1.md §6.2と統一）
- **ARIA:** 情報系トーストは `role="status"` + `aria-live="polite"`。エラー系トーストは `role="alert"` + `aria-live="assertive"`

### 8.6a 入力フィールドの ARIA 要件（§8.2 補足）
- 全入力フィールドに `<label for="...">` または `aria-labelledby` 必須
- ヘルプ/エラーテキストは `aria-describedby` で入力に関連付け
- エラー状態では `aria-invalid="true"` を付与
- 必須入力は `required` 属性＋視覚ラベルの両方で明示

### 8.7 ボトムタブバー
- 高さ: 56px + 下部 safe-area-inset
- 背景: `--bg-surface`（Glass ON 時も不透明を維持。`--card-backdrop`は適用しない）
- 上ボーダー: 1px solid `--border`
- z-index: `--z-tabbar`
- shadow: `0 -1px 0 var(--border)`（上方向のみ）
- タブ項目: 3個（GROW / TALK / ME）、均等分割。1タブあたり最小幅 80px
- タブ項目の最小タップ領域: 56×56px（56px高さ × 各タブ幅）
- アクティブ状態: pill背景 `--accent-subtle` + アイコン `--accent` + ラベル `--on-accent-subtle` + `aria-current="page"`
- **ARIA セマンティクス:** ボトムタブ（GROW/TALK/ME）はページナビゲーション扱い。`<nav role="navigation">` 内に配置し、各タブは `<a aria-current="page">` またはボタン。MEサブタブ（PROFILE/DISCOVER/FRIENDS/SHOP）は同一ページ内タブ切替のため `role="tablist"` / `role="tab"` / `aria-selected`。**用途が異なるため両方式を併用（ADV調停済み 2026-04-12）**
- 非アクティブ: アイコン `--text-secondary` のみ、ラベル非表示（**必須:** `aria-label="GROW"` 等をタブリンクに付与、スクリーンリーダー読上げ保証）
- **通知バッジ:** タブアイコン右上に表示。直径 16px / 背景 `--danger` / 文字 `--button-danger-fg` / フォントサイズ 10px / 文字数 1-2桁（10以上は `9+`）。バッジなし状態では DOM から消す（`aria-label` に `通知あり` を付与）

### 8.8 トグルスイッチ
- トラック: 幅 48px × 高さ 28px / radius `--radius-pill`
- サム: 24px circle / 背景 `--button-primary-fg` / shadow `--shadow-sm`
- **ON 状態: サムが右端 + トラック背景 `--button-primary-bg`**
- **OFF 状態: サムが左端 + トラック背景 `--border-strong`**
- 位置ベースの状態区別を必須とし、色変化のみに依存しない（WCAG 1.4.1）
- disabled: opacity 0.6 / pointer-events: none
- focus-visible: `outline: 3px solid var(--accent); outline-offset: 2px;`
- タップ領域: 48×48px（トラック外を透明領域で拡張）
- **ARIA:** `role="switch"` / `aria-checked` を必須。ラベルは `aria-labelledby` で明示。状態変化は native input:checked を優先し、スクリーンリーダーが自動的に『オン/オフ』を読み上げる構造にする

### 8.9 プログレスバー（EXPバー、ゴール進捗バー）
- 高さ: 8px（通常）/ 12px（ヒーロー大数字併記時）
- トラック: `--bg-secondary` / radius `--radius-pill`
- フィル: `--accent` / radius `--radius-pill`
- フィル遷移: `width` を `--duration-normal` + `--ease-out` でアニメ。**prefers-reduced-motion: reduce 時は 1ms ではなく 100ms のダイレクト遷移に短縮し、進行の視認性を維持**（§7.6 例外）
- ラベル表示: 左にパーセンテージまたは数値、右に目標値
- **ARIA:** `role="progressbar"` / `aria-valuenow` / `aria-valuemin="0"` / `aria-valuemax`

### 8.10 ダイアログ（確認/警告）
- 背景: `--bg-elevated`（Glass ON 時は `--card-bg` + `--card-backdrop`）
- 最大幅: 320px / 画面余白 `--space-lg`
- 角丸: `--radius-lg` (12px)
- パディング: `--space-lg`
- shadow: `--shadow-lg`
- オーバーレイ: `var(--scrim)`
- z-index: `--z-modal`
- **構造:** タイトル（font-size-lg, semibold）+ 説明文（font-size-base, regular）+ ボタン行
- **ボタン並び順（プラットフォーム統一）:** キャンセル左・主要アクション右。破壊的操作（削除等）は主要アクションを Danger ボタンに
- **ARIA:** 情報系は `role="dialog"` / `aria-modal="true"` / `aria-labelledby`（タイトル id）+ `aria-describedby`（説明文 id）。破壊的確認は `role="alertdialog"` を使用
- **フォーカス管理:** 開いた瞬間、主要アクションまたはキャンセルにフォーカス。Esc キーでキャンセル扱い。閉じた時は起動要素にフォーカス復元
- **フォーカストラップ実装:** Tab キーでダイアログ内の focusable 要素（button/input/[tabindex="0"]）を循環させる。実装は自前 or focus-trap ライブラリ（focus-trap@7+）を使用。ダイアログ外の DOM は `inert` 属性または `aria-hidden="true"` を付与して補助的に隔離

### 8.11 スケルトンローダー / shimmer
```css
@keyframes lais-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.lais-skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-secondary) 0%,
    var(--bg-elevated) 50%,
    var(--bg-secondary) 100%
  );
  background-size: 200% 100%;
  animation: lais-shimmer var(--duration-slow) linear infinite;
  border-radius: var(--radius-md);
}
@media (prefers-reduced-motion: reduce) {
  .lais-skeleton {
    animation: none;
    background: var(--bg-secondary);
  }
}
```
- 用途: データ取得中の placeholder 表示
- サイズは用途ごとに幅/高さを指定（例: タスク行 height 48px）

### 8.11a Skip Link（WCAG 2.4.1 Bypass Blocks）
ページ最上部に配置。Tab 初回フォーカスで visible になり、ボトムタブバーやヘッダーをスキップして main content へジャンプする。
```html
<a href="#main-content" class="lais-skip-link">メインコンテンツへスキップ</a>
<main id="main-content">...</main>
```
```css
.lais-skip-link {
  position: absolute;
  top: -9999px;
  left: 0;
  background: var(--accent);
  color: var(--button-primary-fg);
  padding: var(--space-sm) var(--space-md);
  z-index: var(--z-toast);
}
.lais-skip-link:focus {
  top: 0;
}
```

### 8.11b Select / Dropdown（メニュー）
ゴール紐付け/テーマ選択/日付選択等で使用。
- トリガー: 入力フィールドと同じ見た目（§8.2準拠）＋ 右端に ▼ アイコン
- メニュー: 背景 `--bg-elevated` / 角丸 `--radius-md` / shadow `--shadow-md` / border `1px solid var(--border-strong)`
- 項目: 高さ 44px / パディング 0 `--space-md` / ホバー背景 `--accent-subtle-hover` / 選択時 `--accent-subtle` + ✓ アイコン
- 最大高さ: 320px（超えたらスクロール）
- z-index: `--z-dropdown`
- **キーボード:** ↑↓ キーで項目移動、Enter で選択、Esc で閉じる
- **ARIA:** `role="combobox"` + `aria-expanded` + `aria-controls` + リストは `role="listbox"` + 各項目 `role="option"` + `aria-selected`
- **ネイティブ優先:** `<select>` が使える場面では native select を優先（iOS/Android のネイティブピッカーが最も親切）

### 8.12 空状態（Empty State）
- アイコン: 64px、色 `--text-hint`
- 見出し: font-size-lg / `--text-primary`
- 補助テキスト: font-size-sm / `--text-secondary`
- CTA ボタン（任意）: Primary または Secondary
- 中央揃え、垂直余白 `--space-2xl`

### 8.12a Undo スナックバー
トーストとは独立したコンポーネント。タスク完了／削除など取り消し可能な操作の直後に表示する。
- 配置: 画面下部（ボトムタブの上、16px margin）
- 背景: `--bg-elevated`
- テキスト: `--text-primary`
- ボタン: `[元に戻す]` — 視覚強調のため下線 + `--accent` 色（スナックバー内では実質的な Primary アクション）
- 表示時間: 5000ms（UI表示の自動消去）。**Undo機能の有効期間は30秒**（project_v1.md §3.2.6準拠）。スナックバー消去後もタスク行の⭕再タップで取り消し可能。30秒経過後は取り消し不可（ADV調停済み 2026-04-12）
- shadow: `--shadow-md`
- z-index: `--z-toast`
- **ARIA:** `role="status"` + `aria-live="polite"`
- 展開/退場: ease-out / duration-normal
- トーストとの同時表示: スナックバー優先。スナックバー存在中に情報トーストが発火した場合は、スナックバー終了後に表示

### 8.13 状態マトリクス（全コンポーネント共通ステート）

| 状態 | 視覚処理 |
|------|---------|
| default | 既定トークン |
| hover | 背景 hover トークン（またはopacity +0.04） |
| pressed | 背景 pressed トークン（またはscale 0.98） |
| focus-visible | `outline: 3px solid var(--accent); outline-offset: 2px;` |
| disabled | `--bg-disabled` + `--text-disabled` + opacity 0.6 + pointer-events:none |
| loading | skeleton shimmer（`--bg-disabled` ⇆ `--bg-elevated`、duration-slow、prefers-reduced-motion時停止） |

---

## 9. AI実装向けCSSトークンブロック（dev-system §19.9準拠）

AIがUI実装時に直接コピーして使用するCSSトークン集。
**Night Sky（デフォルト）を示す。他テーマは §5.2〜5.4 を参照してdata-theme属性で差し替える。**

```css
/* ============================================
   Lais Design System — CSS Tokens (Night Sky default)
   テーマ切替時は data-theme 属性で :root を差し替える
   ============================================ */
:root {
  /* === Background / Text === */
  --bg-primary: #0D1117;
  --bg-surface: #161B22;
  --bg-elevated: #1C2128;
  --bg-secondary: #1C2128;
  --border: #484F58;
  --border-strong: #6E7681;
  --scrim: rgba(0, 0, 0, 0.6);
  --text-primary: #E6EDF3;
  --text-secondary: #9BA7B4;
  --text-hint: #7A8593;
  --text-disabled: #484F58;
  --bg-disabled: #1C2128;

  /* === Accent / Button === */
  --accent: #79C0FF;
  --accent-hover: #A5D6FF;
  --accent-pressed: #58A6FF;
  --accent-subtle: rgba(121, 192, 255, 0.14);
  --accent-subtle-hover: rgba(121, 192, 255, 0.20);
  --accent-subtle-pressed: rgba(121, 192, 255, 0.28);
  --on-accent-subtle: #79C0FF;
  --button-primary-bg: #1A5FC8;
  --button-primary-fg: #FFFFFF;
  --button-primary-bg-hover: #1158C7;
  --button-primary-bg-pressed: #0A4AAD;
  --button-danger-bg: #DA3633;
  --button-danger-bg-hover: #B62B28;
  --button-danger-bg-pressed: #951F1D;
  --button-danger-fg: #FFFFFF;

  /* === Semantic === */
  --success: #3FB950; --success-subtle: rgba(63,185,80,0.12);
  --success-hover: #339549; --success-pressed: #277039;
  --danger:  #F85149; --danger-subtle:  rgba(248,81,73,0.12);
  --danger-hover: #D1353D; --danger-pressed: #B02934;
  --danger-subtle-hover: rgba(248,81,73,0.18);
  --danger-subtle-pressed: rgba(248,81,73,0.24);
  --warning: #D29922; --warning-subtle: rgba(210,153,34,0.14);
  --warning-hover: #B8841F; --warning-pressed: #966A19;
  --info:    #58A6FF; --info-subtle:    rgba(88,166,255,0.12);
  --info-hover: #388BFD; --info-pressed: #1F6FEB;
  --overdue: var(--danger);
  --overdue-subtle: var(--danger-subtle);

  /* === Spacing === */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 40px;
  --space-2xl: 64px;

  /* === Radius === */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-pill: 999px;

  /* === Typography === */
  --font-primary: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
  --font-display: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
  --font-size-xs: 0.6875rem;   /* 11px */
  --font-size-sm: 0.875rem;    /* 14px */
  --font-size-base: 1rem;      /* 16px */
  --font-size-lg: 1.25rem;     /* 20px */
  --font-size-xl: 1.75rem;     /* 28px */
  --font-size-2xl: 2.25rem;    /* 36px */
  --font-size-3xl: 3rem;       /* 48px */
  --font-weight-thin: 200;
  --font-weight-regular: 400;
  --font-weight-semibold: 600;
  --line-height-xs: 1.35;
  --line-height-sm: 1.4;
  --line-height-base: 1.5;
  --line-height-lg: 1.4;
  --line-height-xl: 1.3;
  --line-height-2xl: 1.15;
  --line-height-3xl: 1.0;
  --letter-spacing-heading: -0.5px;
  --letter-spacing-body: 0;
  --letter-spacing-label: 1.5px;

  /* === Japanese Typography === */
  --letter-spacing-ja: -0.02em;
  --line-height-ja-body: 1.7;
  --line-height-ja-heading: 1.35;

  /* === Animation === */
  --spring-default: cubic-bezier(0.175, 0.885, 0.32, 1.1);
  --spring-gentle:  cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --spring-bouncy:  cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-out:      cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in:       cubic-bezier(0.32, 0, 0.67, 0);
  --ease-in-out:   cubic-bezier(0.83, 0, 0.17, 1);
  --duration-fast: 200ms;
  --duration-normal: 350ms;
  --duration-slow: 500ms;
  --duration-celebration: 800ms;

  /* === Shadow === */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.4);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.5);
  --shadow-lg: 0 12px 32px rgba(0,0,0,0.6);

  /* === Focus === */
  /* focus-ring: v0.9 で outline 方式に移行。トークンは v1.0 で廃止 */

  /* === z-index === */
  --z-base: 0;
  --z-sticky: 100;
  --z-tabbar: 200;
  --z-fab: 300;
  --z-dropdown: 400;
  --z-overlay: 500;
  --z-modal: 510;
  --z-bottomsheet: 520;
  --z-drawer: 530;
  --z-toast: 700;
  --z-tooltip: 600;

  /* === Glass (off by default) === */
  --card-bg: var(--bg-surface);
  --card-backdrop: none;
  --card-border: 1px solid var(--border-strong);

  /* === Tap target === */
  --tap-target-min: 44px;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast: 1ms;
    --duration-normal: 1ms;
    --duration-slow: 1ms;
    --duration-celebration: 1ms;
  }
  /* 進行可視性が必要な要素は完全停止しない（§7.6準拠） */
  .exp-bar-fill,
  .goal-progress-fill,
  [role="progressbar"] > * {
    transition-duration: 100ms !important;
  }
}
```

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| v0.1 | 2026-04-12 | 初版DRAFT。§0ベンチマーク + §1-9全セクション作成（3テーマ） |
| v0.2 | 2026-04-12 | R1レビュー反映: (1)§9 CSS構文エラー修正 (2)Adventure削除→Harajuku Light/Dark追加で4テーマ化 (3)純白背景→オフホワイト (4)Primaryボタン用`--button-primary-*`トークン追加でWCAG AA達成 (5)セマンティックsubtle版・z-index・shadow・focus-ring・disabled・radius・line-height・letter-spacing各トークン追加 (6)prefers-reduced-motion対応 (7)backdrop-filterプレフィックス+フォールバック追加 (8)FOUC対策＋localStorageキー明記 (9)アバターサイズをux_v1準拠に修正 (10)タイムライン色非依存化・ドット形状区別 (11)タップターゲット44px原則追加 (12)ease系トークン追加でUX仕様との矛盾解消 (13)vibrate iOS非対応フォールバック明記 |
| v0.3 | 2026-04-12 | R2レビュー反映: (1)§7.4 触覚CRITICAL修正（prefers-reduced-motionをプロキシに） (2)全テーマ`--border-strong`をWCAG 1.4.11 3:1準拠値に再計算（Night Sky #6E7681 / Dawn #8A7A65 / Harajuku Light #9A6070 / Harajuku Dark #8A6978） (3)§2.2 リンク色役割分離（`--accent`=リンク、`--info`=情報クローム）＋`text-decoration: underline`必須化 (4)タイムラインドットタップ領域44px化 (5)§7.5 forced-colors対応追加 (6)全テーマに`--scrim` `--bg-secondary` `--accent-pressed` `--accent-subtle-hover/pressed` `--button-danger-fg`追加 (7)§5.0 FOUC対策を`<html>`静的属性＋`<link>`前スクリプト配置に強化 |
| v0.4 | 2026-04-12 | R3レビュー反映: (1)CRITICAL §7.5 forced-colors: CSS var経由のsystem-color参照を廃止し、直接`outline`プロパティに統一 (2)§8.1 Primaryボタン hover/pressed をWCAG 4.5:1準拠値に修正（Night Sky hover→#1158C7/pressed→#0A4AAD） (3)`color-mix()`依存廃止：全テーマに`--danger-hover/-pressed` `--success-hover/-pressed` `--warning-hover/-pressed` `--info-hover/-pressed`追加 (4)§8.5 ボトムシートオーバーレイを`var(--scrim)`に統一（ハードコード廃止） (5)§8.1 状態表テーブルを新規トークン参照に更新 (6)§8.6a 入力フィールドARIA要件追加 (7)§8.6 トースト/§8.5 ボトムシートARIA要件追加 (8)§8.7 ボトムタブバー/§8.8 トグルスイッチ/§8.9 プログレスバー各トークン追加 (9)§7.6 prefers-reduced-motion 例外（プログレスバー100ms維持）追加 (10)§5.5 glass-surface 基本背景/ボーダー明示 (11)§8.4 Overdue 左バー行全体＋aria-label明記 |
| v0.5 | 2026-04-12 | R4レビュー反映: (1)§1.3 ロゴ・ブランドマーク(placeholder)+§1.4 トーンオブボイス追加 (2)§1.2原則1 を「自然界+文化的モチーフ」に拡張（Harajuku整合） (3)§3.2 font-size を rem 基底に変換＋11px使用制限を明記 (4)§5.0 レンダリング前提(SPA+PWA)＋テーマ切替アニメーション（background-colorのsmoothフェード）追加 (5)全4テーマに`--{semantic}-subtle-hover/-pressed`追加 (6)Dawn/Harajuku Light の `--focus-ring` opacity 0.4→0.75 + 濃色に変更（WCAG 2.4.11合成3:1確保） (7)§8.7 タブバー 通知バッジサブセクション追加＋最小幅80px明記 (8)§8.8 トグルスイッチ ON=右/OFF=左の位置ルール必須化（WCAG 1.4.1）＋native input:checked優先 |
| v0.6 | 2026-04-12 | R5レビュー反映: (1)§9 font-sizeトークンをrem単位に修正（§3.2 rem基底との矛盾解消） (2)§3.2 サイズ表にサイズ別推奨 line-height 列追加 (3)§5.0 テーマ切替アニメーションをクラスベース（`.theme-switching`）に変更し副作用排除+setTheme()実装例追加 (4)Night Sky `--accent` を #58A6FF→#79C0FF に差別化（`--info`と同一色問題解消） (5)Dawn/Harajuku Light の `--accent-subtle` opacity を 0.14→0.20 / 0.12→0.18 に引上げ（合成色で WCAG 1.4.11 3:1 確保） (6)§6.3a アバターパレット placeholder 追加（肌5/髪6/服8色+多文化対応方針） (7)§8.10 ダイアログコンポーネント追加（role=alertdialog対応） (8)§8.11 スケルトンローダー/shimmer @keyframes 追加 (9)§8.12 空状態コンポーネント追加 |
| v0.7 | 2026-04-12 | R6レビュー反映: (1)Night Sky `--button-primary-bg` を #1F6FEB→#1A5FC8（白文字5.99:1でAA余裕確保） (2)Dawn `--accent`を #A85E28→#8F4D1F（白背景6.42:1、二次ボタン/チップ連鎖解決） (3)Dawn `--danger`を #CF222E→#A71B26（subtle背景上でも4.5:1以上） (4)Dawn `--text-hint`を #7A6E62→#6A5E52（5.9:1 AA余裕） (5)Harajuku Light `--danger`を #CF222E→#C93000（accent #C43361との色相差別化） (6)§4.4 z-index: toast(700)>tooltip(600) に修正（仕様文言と値の整合） (7)§5.5 Glass ON dark `--card-border` opacity 0.12→0.24（非テキスト3:1確保） (8)§1.4 トーンオブボイス: UIクローム=絵文字禁止 / フィードバック系=許可 に明確化（ux_v1 §3.4等との矛盾解消） (9)§5.0 setTheme() に race-safe timerId + サーバー同期例追加 (10)§3.3 line-height をサイズ別トークンに分解 (11)§8.10 ダイアログにフォーカストラップ実装ガイダンス追加 |
| v0.8 | 2026-04-12 | R7レビュー反映: (1)§9 AI実装向けトークンブロックを §5.1 と同期（button-primary-bg→#1A5FC8、line-height をサイズ別トークンに分解） (2)§8.12a Undoスナックバーコンポーネント追加（ux_v1 §6.2 独立定義） (3)§8.1 ボタンのフォーカス状態を box-shadow ベースから outline ベースに変更（WCAG 2.4.11 SC Focus Appearance の 3:1 確実達成） |
| v0.9 | 2026-04-12 | R8レビュー反映: (1)フォーカス方式を全コンポーネント（§8.2/§8.8/§8.13含む）で box-shadow→outline に完全統一 (2)Dawn `--accent-subtle` opacity 0.22→0.36、Harajuku Light 0.18→0.32 に引き上げ（合成後bg surface と非テキスト3:1確保） (3)§8.1 Secondary/§8.3 チップ/§8.7 タブのテキスト色を「ダーク系=--accent / ライト系=--text-primary」に分岐（ライト系でsubtle背景上のWCAG 1.4.3 4.5:1確保） (4)§5.5 Glass ON ライト系 `--card-border` を rgba(0,0,0,0.08)→0.30 に引上げ (5)§8.12a Undoスナックバーボタンを視覚強調＋表示時間仕様不一致を提案ログ対象として明記 |
| v0.10 | 2026-04-12 | R9レビュー反映: (1)§8.1 Secondary/§8.3 チップ/§8.7 タブのテキスト色を `--on-accent-subtle` トークン参照に統一（テーマ名分岐廃止、純粋トークン指向に） (2)全4テーマに `--on-accent-subtle` 定義追加（Dark系=accent色流用 / Light系=text-primary色流用） (3)`--focus-ring` トークンを§5各テーマから削除（outline方式完全移行） (4)§8.2 入力フィールドのフォーカス記述を `--focus-ring` 参照から `outline: 3px solid var(--accent); outline-offset: 2px` に変更 (5)§5.5 Glass ON の @supports 分岐をプログレッシブエンハンスメント方式に再構成（非対応ブラウザで半透明残留バグ解消） (6)§9 トークンブロック末尾の prefers-reduced-motion に §7.6 進行可視性例外を追記（AIがコピペ実装時の仕様破り防止） (7)§5.0 theme-switching のトランジション対象を `:root` + `.lais-theme-surface` オプトインに制限（長文リスト再描画コスト回避） (8)§8.7 タブ ARIA を nav+aria-current に明記＋ux_v1 §10.4 との矛盾を提案ログ対象として記録 |
| v0.11 | 2026-04-12 | R10レビュー反映（最終）: (1)`--button-danger-bg/-bg-hover/-bg-pressed` を全4テーマに追加（Night Sky/Harajuku Dark は #F85149→#DA3633 に darken、白文字4.63:1確保。ライト系は既存 danger 値を流用） (2)§8.1 Danger行を新トークン参照に更新 (3)§9 に `--on-accent-subtle` と button-danger-bg 系を追加（§5.1完全同期） (4)Dawn/Harajuku Light の danger-subtle-hover/pressed を各テーマの新danger色のRGBAに修正（Dawn=#A71B26系、HL=#C93000系） (5)Harajuku Light の --danger-hover/-pressed を #A71B26/#8A1520 から #A72800/#862000 に変更（accent色相差別化の一貫性） (6)§8.7 非アクティブタブ aria-label 必須化 (7)§8.11a Skip Link 追加（WCAG 2.4.1 Bypass Blocks） (8)§8.11b Select/Dropdown コンポーネント追加（native優先+ARIA combobox） |
| R11 検証 | 2026-04-12 | R11 Code直接レビュー検証（5ペルソナ: UI/FE/a11y/ブランド/ターゲットユーザー）。CRITICAL 0 / HIGH 0 確認。R10の残HIGH7件は全て v0.11 にて既解消（stale feedback）と検証済み。MEDIUM 11 / LOW 14 は次フェーズ（design_spec_v1.md作成）で吸収。3件のクロスドキュメント drift（§8.7 タブARIA vs ux_v1 §10.4 / §8.6 toast 3s-5s / §8.12a Undo 5s-30s）はClaude.ai調停対象として提案ログに記録。ステータス CONFIRMED（v1.0相当）に昇格 |
| v0.12 | 2026-04-12 | §3.4 日本語タイポグラフィ調整トークン追加（letter-spacing-ja/-0.02em、line-height-ja-body/1.7、line-height-ja-heading/1.35）。§9 CSSトークンブロックに反映。dev-system §19.10準拠 |
