# GOAL AI — Design System v1
> ブランドアイデンティティ: **Night Sky Journal**
> 月明かりの下で静かにジャーナルを書いている感覚
> 根拠: デザインQnA 9問 + 4,000件以上のコミュニティフィードバック調査
> 更新: 2026-04-08

---

## Layer 1: ふとしブランド共通（全アプリ共通DNA）

### ブランドメタファー: Night Sky
- 宇宙と月の静寂
- アプリを開いた瞬間「深呼吸したくなる」静かな安心感
- 情報は控えめに。サマリー→タップで詳細展開（階層型）
- 余白で呼吸する（Open air — カードで囲まない）

### 共通デザイントークン
```css
/* === DARK MODE (default) === */
--bg-primary: #0D1117;      /* 夜空 */
--bg-secondary: #161B22;    /* カード/浮上面 */
--bg-tertiary: #21262D;     /* 区切り/インアクティブ */

--text-primary: #C9D1D9;    /* 月光シルバー */
--text-secondary: #8B949E;  /* 控えめ */
--text-tertiary: #484F58;   /* ヒント/時刻 */
--accent-primary: #58A6FF;  /* ブルーアクセント（唯一のアクセント色） */
--accent-secondary: #388BFD;/* ブルー濃い目（タップ時等） */
--success: #3FB950;         /* 完了/収入 */
--danger: #F85149;          /* エラー/支出 */
--border: #21262D;          /* 0.5px borders */
--dot-active: #58A6FF;      /* タイムラインドット（NOW） */
--dot-inactive: #21262D;    /* タイムラインドット（NEXT） */

/* === LIGHT MODE (パステル) === */
--bg-primary-light: #F5F5F7;       /* Apple白 */
--bg-secondary-light: #FFFFFF;     /* カード */
--bg-tertiary-light: #E8ECF0;     /* 区切り */
--text-primary-light: #1C1C1E;     /* 墨 */
--text-secondary-light: #6E7681;
--text-tertiary-light: #8B949E;
--accent-primary-light: #007AFF;   /* iOS blue */
--pastel-mint: #A8E6CF;            /* パステルアクセント */
--pastel-sky: #B8D4E3;
--pastel-lavender: #C4B7EB;
--pastel-peach: #FFD3B6;
```

### フォント
```css
--font-primary: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
--font-display: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
```
- カスタムWebフォント読み込み **禁止**
- ウェイト: 200(大数字), 400(本文), 500(見出し) の3段階のみ
- letter-spacing: 見出し -0.5px, 本文 0, ラベル 1.5px

### アニメーション
```css
/* 物理ベースのみ。ease-in-out禁止 */
--spring-default: cubic-bezier(0.175, 0.885, 0.32, 1.275);  /* overdamped spring */
--spring-gentle: cubic-bezier(0.25, 0.46, 0.45, 0.94);      /* 穏やかな減衰 */
--duration-fast: 200ms;
--duration-normal: 350ms;
--duration-slow: 500ms;
```
- 装飾アニメーション **禁止**（ローディングスピナー、パルス等）
- 許可されるアニメーション: 画面遷移、展開/折りたたみ、完了チェック、ドラッグフィードバック
- navigator.vibrate(50) をタスク完了時に使用

### 余白リズム（Open Air）
```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 40px;    /* セクション間 */
--space-xxl: 64px;   /* 画面上部マージン */
```
- タスク間の余白: 20px以上（呼吸するリズム）
- **カードで囲まない。** 余白と薄いborderで区切る
- 角丸: 要素サイズに比例。小ボタン=4px, 中カード=8px, 大シート=16px, pill=999px

### レイアウト: Vertical Journal
- タイムラインは **縦ライン + ドット** で進行表示
- NOW（現在のタスク）= 詳細表示、アクセント色ドット
- NEXT以降 = 控えめ表示（text-secondary）、inactive色ドット
- 日付は letter-spacing: 1.5px の大文字ラベル
- 見出し（例「3 things today」）は font-weight: 500

### ボトムタブ: Pill Active
- Active tab = pill背景(--bg-secondary) + アイコン + ラベル
- 非Active = アイコンのみ（ラベルなし）
- アイコンスタイル: SF Symbols風 outline, stroke-width: 1.2px
- pill border-radius: 999px
- tab切替にspring-defaultアニメーション

---

## Layer 2: GOAL AI 固有コンセプト

### コンセプト: 「君の人生をより素敵に」
- 人生コーディネーター。秘書AI。
- 今日やるべきことを静かに整理してくれる存在
- 判断は押し付けない。提案して、ユーザーが選ぶ

### GOAL AI タブ構成
| タブ | アイコン | 役割 |
|------|---------|------|
| TODAY | 時計（circle + hands） | 今日のジャーナル。タイムライン |
| TALK | チャット吹き出し | AI対話 |
| GOALS | チェックマーク付き円 | ゴール管理 |
| ME | 人型アイコン | プロフィール・設定 |

---

## NGリスト（AI slop — 4,000件+のコミュニティ調査に基づく）

> 根拠: MDPI Systems 2026（Reddit 3,994件分析）、Slopless運動（450K+フォロワー）、
> GenDesigns（数百画面レビュー）、Antislop研究（8,000+パターン）、
> 複数のMedium/DEV Community記事+コメントセクション

### 色 — NG
- [ ] 紫→青グラデーション（「AIを使いましたの公式カラー」）
- [ ] ゴールド/金色アクセント
- [ ] ネオンカラー on ダーク背景
- [ ] シアン on ダーク背景
- [ ] 純黒 #000000（自然界に存在しない）
- [ ] 純白 #FFFFFF をダークモードのテキストに使用
- [ ] グラデーション文字（見出し、数字、どこにも）
- [ ] 3色以上のアクセントカラー同時使用

### フォント — NG
- [ ] Inter, Roboto, Arial を指定する（system-uiのみ許可）
- [ ] カスタムWebフォントの読み込み
- [ ] 全要素が同じfont-weight（階層感がない）
- [ ] font-size差が小さい（見出しと本文の差が4px未満）

### レイアウト — NG
- [ ] カード in カード（ネストされたコンテナ）
- [ ] 全要素が等間隔（equal spacing everywhere）
- [ ] 全要素が中央揃え
- [ ] 全要素が同じ角丸半径
- [ ] 3列以上のグリッドカード（モバイル）
- [ ] ヒーローメトリクスレイアウト（大数字+小ラベル+グラデーション線 のテンプレ）

### エフェクト — NG
- [ ] Glassmorphism（フロストガラスカード）
- [ ] drop-shadow を装飾目的で使用
- [ ] ぼかし(blur)を装飾目的で使用
- [ ] ease-in-out アニメーション
- [ ] 意味のない装飾アニメーション（パルス、グロー、フロート）
- [ ] 全要素に同じbox-shadow

### UX — NG
- [ ] 「Clean and modern」「ミニマル」等の曖昧なスタイル指示
- [ ] AIが推測でゴールや情報を紐付ける
- [ ] Option選択が5個以上並ぶ（ダイヤルピッカーを使う）
- [ ] 完了チェックが44px以上（36px程度が適切）

---

## OKリスト（Night Sky Journalで推奨されるパターン）

### 色 — OK
- [x] #0D1117 ベース + #161B22 浮上面（2段階のダーク）
- [x] シルバー系テキスト #C9D1D9（月光）
- [x] ブルーアクセント #58A6FF（1色のみ）
- [x] 成功=#3FB950, エラー=#F85149（意味のある色のみ）
- [x] ダーク内パステルアクセント（ミント/スカイ/ラベンダー/ピーチを控えめに）
- [x] ライトモード: iOSパステル壁紙的な明るさ

### フォント — OK
- [x] system-ui フォントスタック
- [x] weight 200/400/500 の3段階で明確な階層
- [x] 大きな数字は font-weight: 200（細く大きく）
- [x] ラベルは letter-spacing: 1.5px + テキスト大文字

### レイアウト — OK
- [x] Vertical journal（縦ライン + ドット進行）
- [x] 余白で区切る（カードで囲まない）
- [x] セクション間=40px, 要素間=20px のリズム差
- [x] 角丸はサイズに比例（4px/8px/16px/999px）
- [x] 左揃えベース（中央揃えは大きな数字のみ）

### エフェクト — OK
- [x] spring-based アニメーション（overdamped）
- [x] 展開/折りたたみ、画面遷移の物理的な動き
- [x] タスク完了時の振動フィードバック(50ms)
- [x] 0.5px border（薄い線で上品に区切る）

---

## QnAチェックリスト（全回答に1:1対応。テストに組み込む）

| # | QnA回答 | チェック項目 | 検証方法 |
|---|---------|-------------|----------|
| Q1 | 静かな安心感 | 画面を開いた瞬間に視覚的ノイズがない | 目視: 1画面にアクセント色の要素が3個以下 |
| Q2 | Vertical journal | タイムラインが縦ライン+ドット | grep: `border-left.*21262D` + `border-radius.*50%` |
| Q3 | SF Pro/system-ui | Inter/Roboto/Arialが存在しない | grep -c "Inter\|Roboto\|Arial" = 0 |
| Q4 | 物理ベース | ease-in-outが存在しない | grep -c "ease-in-out" = 0 |
| Q5 | 階層型 | 同時展開カードが3以下 | E2E: 画面内の展開要素カウント |
| Q6 | Pill active | Active tabがpill+icon+label | grep: `border-radius.*999\|pill` |
| Q7 | Open air | タスク間余白が20px以上 | getComputedStyle: marginBottom >= 20 |
| Q8 | Night sky | 背景色が#0D1117〜#161B22 | grep: `0D1117\|161B22` |
| Q9 | パステル両方 | ライトモードにパステルトークン定義あり | grep -c "pastel" >= 4 |

---

## デザインスキル連携

### frontend-design SKILL.mdが効かない根本原因（調査結果）
1. **コンテキスト未提供**: スキル自身が「Only the creator can provide this context」と明記。GOAL AIはこれを与えていなかった
2. **NGリストはあるがOKが曖昧**: 「何を使え」が具体的でない
3. **Code側で直接CSS編集**: スキルはアーティファクト生成時のみ介入。既存ファイル編集時は無関係
4. **ダークモードへの安易な逃避**: スキル自身が「DON'T: Default to dark mode with glowing accents」と警告

### 対策: デザインコンテキストの注入
CLAUDE.mdに以下を追記し、Codeが常にデザインコンテキストを持つようにする:
```
## Design Context（全UI変更時に参照必須）
- Brand: Night Sky Journal
- Audience: 20-40代、自分の人生を整理したい人
- Tone: 静かな安心感。深呼吸したくなる
- Reference: Apple Reminders dark mode + GitHub Dark
- Color: docs/design_system.md のトークンのみ使用
- Anti-patterns: docs/design_system.md のNGリスト全項目
```

---

## 5アプリ展開例（Night Sky DNA共通）

| アプリ | 固有コンセプト | アクセント使い分け |
|--------|---------------|-------------------|
| GOAL AI | 人生コーディネーター | ブルー（行動・進行） |
| LIFE AI | 家計・確定申告 | グリーン=収入, レッド=支出 |
| BODY AI | フィットネス | ブルー + 週間バーチャート |
| READ AI | 読書トラッカー | ブルー + プログレスバー |
| COOK AI | レシピプランナー | ブルー + ステップ進行 |

共通DNA: #0D1117背景, vertical journal+ドット, pill active tab, SF Pro, open air spacing
固有: タブ名, アイコン, セマンティックカラー（成功/支出等）の用途


---

## テーマ一覧（4種）

### Theme 1: Night Sky（デフォルト）
ダーク + パステルアクセントドット（ミント/スカイ/ラベンダー）
```css
--theme: 'night-sky';
--bg: #0D1117;
--surface: #161B22;
--border: #21262D;
--text: #C9D1D9;
--text-muted: #8B949E;
--text-hint: #484F58;
--dot-1: #A8E6CF;  /* mint — NOW */
--dot-2: #B8D4E3;  /* sky — NEXT */
--dot-3: #C4B7EB;  /* lavender — LATER */
--accent: #58A6FF;
--pill-bg: #161B22;
--pill-text: #A8E6CF;
```

### Theme 2: Dawn（ライトパステル）
iOS風の明るい世界
```css
--theme: 'dawn';
--bg: #F5F5F7;
--surface: #FFFFFF;
--border: #E0E4E8;
--text: #1C1C1E;
--text-muted: #6E7681;
--text-hint: #8B949E;
--dot-1: #6CC9A1;
--dot-2: #8BBDE0;
--dot-3: #A89CD6;
--accent: #007AFF;
--pill-bg: #FFFFFF;
--pill-text: #007AFF;
```

### Theme 3: Harajuku Light（白ベース + レインボー）
ポップ。タイムライン縦線がレインボーグラデーション
```css
--theme: 'harajuku-light';
--bg: #FFFBFE;
--surface: #FFFFFF;
--border: #F0E0F0;
--text: #2D2040;
--text-muted: #6B5E7B;
--text-hint: #A090B0;
--dot-1: #FF6B8A;  /* pink */
--dot-2: #FFB347;  /* orange */
--dot-3: #69DB7C;  /* green */
--dot-4: #74C0FC;  /* blue */
--dot-5: #B197FC;  /* purple */
--timeline-line: linear-gradient(180deg, #FF6B8A, #FFB347, #69DB7C, #74C0FC, #B197FC);
--date-label: linear-gradient(90deg, #FF6B8A, #FFB347, #FFEB3B, #69DB7C, #74C0FC, #B197FC);
--accent: #FF6B8A;
--pill-bg: #FFF0F5;
--pill-text: #D6336C;
--badge-green-bg: #E8FFF0;
--badge-green-text: #2D8B5A;
--badge-pink-bg: #FFF0F5;
--badge-pink-text: #D6336C;
--badge-purple-bg: #F0F0FF;
--badge-purple-text: #7048C6;
```

### Theme 4: Harajuku Dark（ダーク + レインボー）
夜の原宿。パープルブラックにネオンパステル
```css
--theme: 'harajuku-dark';
--bg: #12101A;
--surface: #1C1828;
--border: #2A2035;
--text: #E8E0F0;
--text-muted: #9A90A8;
--text-hint: #5A5068;
--dot-1: #FF8FAB;  /* pink */
--dot-2: #FFCB77;  /* orange */
--dot-3: #8CEAA0;  /* green */
--dot-4: #88D8F7;  /* blue */
--dot-5: #C4A8FF;  /* purple */
--timeline-line: linear-gradient(180deg, #FF8FAB, #FFCB77, #8CEAA0, #88D8F7, #C4A8FF);
--date-label: linear-gradient(90deg, #FF8FAB, #FFCB77, #FFF06B, #8CEAA0, #88D8F7, #C4A8FF);
--accent: #FF8FAB;
--pill-bg: rgba(255,143,171,0.1);
--pill-text: #FF8FAB;
--badge-green-bg: rgba(140,234,160,0.12);
--badge-green-text: #8CEAA0;
--badge-pink-bg: rgba(255,143,171,0.12);
--badge-pink-text: #FF8FAB;
--badge-purple-bg: rgba(196,168,255,0.12);
--badge-purple-text: #C4A8FF;
```

### テーマ共通ルール
- 4テーマ全てで vertical journal + pill active tab + open air の構造は変わらない
- テーマ切替はアプリ設定画面から（P22 チャット背景プリセットと統合可能）
- 各テーマのCSSトークンをCSS custom propertiesとして定義し、テーマ切替時にroot変数を差し替える
- Harajukuテーマのみ `--timeline-line` と `--date-label` にグラデーション使用を許可（NGリスト例外）
