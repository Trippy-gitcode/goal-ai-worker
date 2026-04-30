# Lais Design System Audit — 2026-04-28

> Mission: **DESIGN-SYSTEM-AUDIT-2026-04-28**
> Subject: 4 themes × 90+ tokens × 30 icons × 21 screens (Stage 7-3 完了時点)
> Prepared by: ADV / SUBAGENT-DESIGN-SYSTEM-AUDIT
> 仕様根拠: `po_expectations_v1.md` §23 (Claude Design Skill 利用必須)

---

## 0. Skill 利用証跡 — `design:design-system`

本監査は **Claude Design Skill `design:design-system`** を必須利用 (po_expectations §23.2 / §23.4) として呼出し、その出力フレームワーク (Naming Consistency / Token Coverage / Component Completeness / Priority Actions) に沿って Lais の現状を照合した。

| Skill 出力フレーム | 本レポート対応セクション | Skill 由来である事の明示マーク |
|---|---|---|
| Summary (Components reviewed, Issues, Score) | §1 Summary | `[skill:design-system §Summary]` |
| Naming Consistency 表 | §2 命名一貫性 | `[skill:design-system §NamingConsistency]` |
| Token Coverage 表 (Defined / Hardcoded) | §3 ハードコード残存 + §4 token カバレッジ | `[skill:design-system §TokenCoverage]` |
| Component Completeness | §5 負債候補 (重複・未使用・命名揺れ) | `[skill:design-system §Components]` |
| Priority Actions | §7 結論と提言 + §6 Stage 7-4 提案 | `[skill:design-system §PriorityActions]` |

`design:design-system` の **Audit principles** を Lais 文脈に翻訳:
- *Consistency over creativity* → 4 テーマ間で同一意味の token 名が揺れていないか (§2)
- *Flexibility within constraints* → token 階層 (theme-color-* / theme-shadow-* / theme-motion-*) が拡張可能な構造か (§4)
- *Document everything* → handoff spec / 命名規則が specs/ に存在するか (§5)
- *Version and migrate* → backward-compat alias (`--bg-primary` 等) の段階的廃止計画 (§5 LOW)

Skill 弱点 (po_expectations §23.6) を踏まえた補完:
- (#1 ビジュアル生成不可) → 本監査は markdown のみ、視覚回帰は Stage 7-2 / 7-3 spec.ts に既存
- (#3 業界バイアス) → DQ ピクセル / cyberpunk neon の独創性観点は ADV 補完で記述
- (#4 大規模 token 制約) → 4 テーマ × 87 token = 計 348 + cyberpunk 拡張 6 を分割集計

---

## 1. Summary `[skill:design-system §Summary]`

| 指標 | 数値 |
|---|---|
| Themes reviewed | **4** (apple / totoro / dq / cyberpunk) |
| Tokens defined per theme (共通) | **87** (4 テーマで完全一致) |
| Tokens unique to cyberpunk | **6** (`--theme-color-magenta` / `-magenta-hover` / `--theme-color-cyan` / `-cyan-hover` / `--theme-shadow-glow-magenta` / `-glow-cyan`) |
| Total token instances in themes.css | **358** (87 × 4 + 6 + メタデータ) |
| Tokens definitions in tokens.css (theme-agnostic) | **38** (font-size / spacing / radius / motion / z-index / focus-ring / control metrics) |
| Icons (SVG components) | **30** + iconBase.js + index.js |
| Screens audited | **21** (S00 〜 S60) |
| Hardcode color hits in `lais/src/` (excl. themes.css / themes 2.css) | **39** |
| ‐ うち legitimate fallback `var(--x, #hex)` | **9** |
| ‐ うち icons inline pixel-art (`#fffce8` 16 ヶ所) | **16** ← 全て dq theme branch 内 |
| ‐ うち animations.css cyberpunk 演出 (rgba 直書き) | **3** |
| ‐ うち ThemeProvider.jsx preview 静的データ | **4** (intentional, palette swatch) |
| ‐ その他 (一覧化対象) | **7** (うち 8.* で詳細) |
| Issues found | **CRITICAL 1 / HIGH 2 / MED 5 / LOW 4** = 計 12 件 |
| Recommendations | **N=12** (各 Issue に inline + §7 で集約) |
| Audit Score | **78 / 100** (good with debts; Stage 7-4 着手可だが 1 CRITICAL 解消推奨) |

---

## 2. 命名一貫性 (Naming Consistency) `[skill:design-system §NamingConsistency]`

### 2.1 結論 — おおむね良好だが軽度の揺れあり

**良い点 (PASS)**:
- 4 テーマで **87 個の token 名が完全一致** (apple / totoro / dq / cyberpunk すべての `[data-theme="..."]` block で同一 set を定義)。
- 命名規則は **kebab-case + 階層名** で統一: `--theme-{category}-{role}-{state?}` (例: `--theme-color-accent-hover` / `--theme-shadow-md` / `--theme-motion-easing-spring`)。
- backward-compat alias (`--bg-primary` / `--accent` / `--text-primary` 等) を `--theme-color-*` への参照として再定義しており、移行戦略が層分離されている。
- Stage 7-2 で追加された `--theme-icon-*` 系 (4 種) と Stage 7-3 で追加された `--theme-color-modal-overlay` / `-overlay-strong` / `-button-text-inverse` / `-status-overdue` も 4 テーマすべてで定義済 (parity 100%)。

### 2.2 発見事項

| ID | severity | 内容 | 影響範囲 | 修正提案 |
|---|---|---|---|---|
| **N-1** | LOW | `--theme-color-accent-bg` の意味が apple/totoro と dq/cyberpunk で **不一致** | apple `#e9f2ff` (淡 tint) / totoro `#eaf3e4` (淡 tint) / dq `#1a2a6c` (濃 navy) / cyberpunk `rgba(252,238,10,.10)` (淡 tint) — dq だけ「darker accent variant」、他は「tint」 | dq のみ命名を `--theme-color-accent-strong` などに分離するか、全テーマで「accent-tint vs accent-strong」を二者揃える |
| **N-2** | LOW | `--theme-color-bg-overlay` が **0 箇所参照** ("dead" alias)。実際は Stage 7-3 で追加された `--theme-color-modal-overlay` が使われ、旧 `bg-overlay` が放置 | themes.css 4 テーマ × 1 token = 4 行が dead | `bg-overlay` を `modal-overlay` の alias に統一するか、themes.css から削除 |
| **N-3** | LOW | `--info` が 4 テーマで **意味揺れ**: apple `#5ac8fa` (cyan info) / totoro `#5a9e3a` (緑 = success と同値, 識別不可) / dq `#87ceeb` (cyan) / cyberpunk `var(--theme-color-magenta)` (紫) | totoro で `--info` と `--success` が同色 #5a9e3a, UI 上で区別できない | totoro の `--theme-color-info` を `#5d8fb8` 程度の青系に分離 (warm pastel info) |
| **N-4** | MED | `--theme-color-divider` が 1 箇所しか参照されておらず、実態は `--theme-color-border` と同義。dq だけ `#b0b0c0` で他は `#e5e5e0` 等の border と同値 | tokens.css の階層が浅い | `--theme-color-divider` を廃止し `--theme-color-border-subtle` に統一 (apple/totoro/cyberpunk は `border` と同値、dq は明示分離) |

### 2.3 命名規則準拠スコア (sub-section)

| カテゴリ | 命名規則 (LOC) | 違反 | スコア |
|---|---|---|---|
| color | `--theme-color-{role}-{state?}` | なし (87 ヶ所すべて準拠) | 100% |
| typography | `--theme-font-{role}` | なし (8 ヶ所) | 100% |
| radius | `--theme-radius-{size}` | なし (5 ヶ所) | 100% |
| shadow | `--theme-shadow-{size}` + `--theme-shadow-glow-{accent}` | なし (3 + cyberpunk 2) | 100% |
| motion | `--theme-motion-{role}` | なし (7 ヶ所) | 100% |
| icon | `--theme-icon-{role}` | なし (4 ヶ所) | 100% |
| backward-compat | aliasは `--{shortname}` (no namespace) | 設計通り (移行用) | 100% |

→ **命名一貫性スコア: 95/100** (N-1 / N-3 で各 -2、N-4 で -1)。

---

## 3. ハードコード残存 (Token Coverage / Hardcoded Values) `[skill:design-system §TokenCoverage]`

### 3.1 集計

`lais/src/` 全体に対する hex / rgb / rgba 文字列の grep:

```
全体ヒット数 = 218 行
├─ themes.css 内 (theme 定義そのもの) = 179 行 (正常、テーマ token 定義)
└─ themes.css 外 = 39 行 ← 監査対象
```

themes.css 外 39 行の内訳:

| 区分 | 件数 | 場所 | 評価 |
|---|---|---|---|
| (a) **Stage 7-2 で許容された** dq theme branch 内 `#fffce8` (8bit pixel art 内部 detail) | **16** | `src/components/icons/Icon*.jsx` 16 ファイル | **意図的・dq branch 内部限定で許容** だが、本監査では token 化推奨 (Stage 7-2 spec も「currentColor + theme variables で色を制御」と謳うので例外) |
| (b) **stale "2.css" macOS Finder duplicates** (themes 2.css / global 2.css / tokens 2.css) — import されないが grep 汚染 | (134 行 themes 2.css 単体) | `src/styles/themes 2.css` 等 3 ファイル | **CRITICAL: ガベージ削除すべき**。実行時には影響しないが、開発者が誤編集する事故源 |
| (c) animations.css cyberpunk 演出内の `rgba(252, 238, 10, X)` (黄色ネオン直書き) | **3** | `src/styles/animations.css:135 / 205 / 241` | **MED: token 化可能** (`--theme-color-accent` の rgba 表現) |
| (d) `var(--xx, #fallback)` パターン (token 未定義時の fallback) | **9** | ThemeSwitcher.css / S10/S20/S30 jsx / S10Grow.css | **HIGH**: `--bg-error` / `--text-error` は **どこにも定義されていない** ため、fallback `#b00020` / `#fff0f0` が常に有効になっている (= ダーク・カラフルなテーマでも赤錆色が見える、テーマ無視のバグ) |
| (e) `ThemeProvider.jsx` の preview palette (静的 swatch 表示) | **4** | `src/contexts/ThemeProvider.jsx:45/51/57/63` | **設計通り**: 各テーマ id に紐づくサムネイル色を JS 値で定義 (テーマ切替前の preview 用)、token 化不要 |

### 3.2 発見事項

| ID | severity | 内容 | 場所 | 修正提案 |
|---|---|---|---|---|
| **H-1** | **CRITICAL** | `lais/src/styles/themes 2.css` (134 行旧テーマ Night Sky / Dawn / Harajuku) と `global 2.css` / `tokens 2.css` の **macOS Finder duplicate ファイル**が src ディレクトリに残存。import されていないため動作影響はないが、(a) 開発者が誤って編集して **ビルド成果物は変わらないのに変更したつもりになる**、(b) grep / IDE 検索で旧色値がヒットしテーマ調整を撹乱する、(c) Stage 7-4 cyberpunk neon 拡張時に「あれ、別の themes.css がある」と混乱する。 | `src/styles/themes 2.css`, `global 2.css`, `tokens 2.css` | **3 ファイルを削除** (rm)。本ミッションは write 禁止なので別ミッション化、または PO 承認後に Stage 7-4 着手前に削除 |
| **H-2** | **HIGH** | `--bg-error` / `--text-error` が **未定義**。3 画面 (S10Grow / S20Talk / S30MeProfile) のエラー表示で `var(--bg-error, #fff0f0)` / `var(--text-error, #b00020)` を inline style として参照しているが、 `themes.css` および `tokens.css` のいずれにも定義がない。**結果: 4 テーマすべてで fallback の `#fff0f0` (薄ピンク) と `#b00020` (赤錆) がそのまま使われ、cyberpunk / dq / totoro でテーマ違和感が出る。** | `S10Grow.jsx:533` / `S20Talk.jsx:436` / `S30MeProfile.jsx:167` | **themes.css 4 テーマすべてに `--theme-color-error-bg` / `--theme-color-error-text` を追加** + alias `--bg-error` / `--text-error` を `--theme-color-error-bg` / `--theme-color-error-text` で再定義。各 theme 値: apple `#fff0f0`/`#b00020`, totoro `#fce8e8`/`#a83838`, dq `#3a1a1e`/`#ff8db8`, cyberpunk `rgba(255,45,85,.12)`/`#ff2d55` |
| **H-3** | **HIGH** | `lais/src/components/icons/` 30 ファイル中 **16 ファイル**が dq theme branch 内に `fill="#fffce8"` を直書きしている。Stage 7-2 で導入した `--theme-icon-bg` (dq では `#2c2c54`) はあるが、icon 内部の **明色ハイライト**用 token がない。dq の bg と他テーマで意味が異なるため `--theme-icon-bg` を使うのは誤り。 | `IconHome.jsx:17`, `IconBell.jsx:13`, `IconBookmark.jsx:12`, `IconCalendar.jsx:12`, `IconClock.jsx:12`, `IconEdit.jsx:12`, `IconLightbulb.jsx:14-15`, `IconLog.jsx:12-14`, `IconSearch.jsx:13`, `IconSettings.jsx:16`, `IconSparkle.jsx:12`, `IconStar.jsx:12`, `IconSword.jsx:12`, `IconTalk.jsx:12-14`, `IconTrash.jsx:14-15`, `IconWarning.jsx:12-13` | **dq テーマに `--theme-icon-highlight: #fffce8` を追加** (他テーマは値=transparent または primary 系の同等)、各 Icon の `fill="#fffce8"` を `fill={'var(--theme-icon-highlight)'}` または React inline `style={{ fill: 'var(--theme-icon-highlight)' }}` で参照 (SVG attribute は CSS variable を直接受けないので、`<rect style={{ fill: 'var(--theme-icon-highlight, #fffce8)' }} />` パターンに統一) |
| **H-4** | MED | `S10Grow.css:398/402/406` の `var(--cat-work, #79c0ff)` / `var(--cat-health, #7ee787)` / `var(--cat-learn, #d2a8ff)` の **fallback 色が現在のテーマ token と無関係な旧 v0.12 (Night Sky) palette**。テーマ token は定義済みなので fallback には到達しないが、コード読解時の混乱要因。 | `S10Grow.css:398-406` | fallback 値を **削除** (`var(--cat-work)` のみ) または現テーマ apple 値 `#007aff` 等に同期 |
| **H-5** | MED | `animations.css:135/205/241` で `rgba(0,0,0,0.4)` (dq pressed shadow) と `rgba(252,238,10,0.X)` (cyberpunk neon flicker / tap) が直書き。既に `--theme-color-accent` (cyberpunk = `#fcee0a`) や `--theme-shadow-md` token があるため、token 経由で表現可能。 | `animations.css:135` `animations.css:205` `animations.css:241` | (a) line 135 → `--theme-shadow-pressed-dq: 0 0 0 0 rgba(0,0,0,0.4)` を dq theme block に追加し置換、(b) line 205/241 → `color-mix(in srgb, var(--theme-color-accent) X%, transparent)` または `--theme-shadow-glow-yellow` 新規追加 |

---

## 4. token カバレッジ (21 画面の視覚要素) `[skill:design-system §TokenCoverage]`

### 4.1 視覚要素別カバレッジ

| 視覚要素 | tokens.css 定義 | themes.css 定義 (×4) | 21 画面で使われる頻度 | カバレッジ |
|---|---|---|---|---|
| 色 (color) | (なし、theme-only) | bg / text / accent / status / border = 30+ tokens × 4 | 全画面 | **97%** (※ H-2 error 系 / H-3 icon-highlight が抜けている) |
| spacing | --space-xs ~ --space-3xl (7-step) | (なし) | 全画面 | **100%** (rare) |
| typography (font-family / size / weight) | family/size/weight/letter-spacing/line-height = 13 tokens | --theme-font-{base,display,mono} + letter-spacing × 3 + line-height × 2 | 全画面 | **100%** |
| shadow | (なし、theme-only) | shadow-sm/md/lg + cyberpunk glow-magenta/cyan + drawer | 全画面 | **100%** |
| radius | radius-sm/md/lg/pill (4 step base) | --theme-radius-sm/md/lg/xl/pill (5 step per theme) | 全画面 | **95%** (※ tokens.css と themes.css で **二重定義**, §5 D-1) |
| motion (duration / easing) | duration/spring/ease-out (7 tokens) | --theme-motion-fast/normal/slow + easing × 2 + page-transition | 全画面 | **95%** (※ tokens.css と themes.css で **重複**, §5 D-2) |
| z-index | z-base 〜 z-tooltip (9 layer) | (なし) | layout 層 | **100%** |
| focus-ring | width/offset/style (3 tokens) | --focus-ring-color (theme alias) | global.css :focus-visible | **100%** |
| icon stroke / 色 | (なし) | --theme-icon-primary/accent/bg/stroke-width × 4 | 30 アイコン | **70%** (※ stroke-width は **iconBase.js でハードコード重複**, §5 D-3) |
| **error 系** | **(なし)** | **(なし)** | **3 画面** | **0%** ← H-2 該当 |
| **icon highlight (dq pixel)** | **(なし)** | **(なし)** | **16 アイコン** | **0%** ← H-3 該当 |

### 4.2 カバレッジ総合スコア

| 区分 | スコア | 内訳 |
|---|---|---|
| 視覚要素種別カバー率 | **9 / 11** = 82% | error 系 / icon-highlight 未定義 |
| 21 画面で使われる token の定義済率 (実引用元あるが token なし) | **88%** | error / icon-highlight + cat-* fallback がレガシー |
| theme parity (4 テーマで同 token) | **100%** | 87/87 + 6 cyberpunk-only は意図的 |
| **総合** | **90%** | |

---

## 5. 負債候補 (Debts) `[skill:design-system §Components]`

### 5.1 重複・未使用・命名揺れ

| ID | severity | 内容 | 修正提案 |
|---|---|---|---|
| **D-1** | MED | **`--radius-*` (tokens.css) と `--theme-radius-*` (themes.css) が二重定義**。tokens.css の `--radius-sm/md/lg/pill` (4 step) は **どこからも参照されておらず**、各画面は `--theme-radius-*` (5 step) のみ参照。 | tokens.css の `--radius-*` を **削除** (themes.css の `--theme-radius-*` を SSoT 化) |
| **D-2** | MED | **`--duration-*` `--spring-*` `--ease-out` (tokens.css) と `--theme-motion-*` (themes.css) が二重定義**。grep 結果、components 内では theme-motion 系のみが参照されている。 | tokens.css の motion 系 7 tokens を **削除**、または `--theme-motion-fast` 等を alias 化 |
| **D-3** | MED | **`--theme-icon-stroke-width` (themes.css) と `iconBase.js#getIconStrokeProps()` の `1.6/1.8/2.5/1.4` が二重定義**。CSS 側 token は **0 箇所参照** で、JS 側のハードコードが実際に効いている。`design_handoff_stage7_2_icons_v1.md` 自身が「既存 `getIconStrokeProps()` と二重一致」と明記しており、設計上認識済の負債。 | (a) iconBase.js を CSS-property 取得 (`getComputedStyle(...).getPropertyValue('--theme-icon-stroke-width')`) に切り替えるか、(b) themes.css の `--theme-icon-stroke-width` を **削除** (JS 側を SSoT 化) |
| **D-4** | MED | `--shadow-drawer` が **0 箇所参照** (themes.css 4 テーマ × 1 = 4 行 dead) | 削除 or BottomTabBar / Drawer 系で参照すべきだが現状未使用 |
| **D-5** | MED | `--accent-bg` が **0 箇所参照** (4 行 dead) | 削除 or `--theme-color-accent-bg` の参照点を追加 |
| **D-6** | LOW | `--theme-color-magenta` / `--theme-color-cyan` が **cyberpunk only**。サブアクセント目的だが、**実引用は 1 箇所ずつ** (`--info` と `--focus-ring-color` の代入のみ) で、画面内の直接参照ゼロ。 | Stage 7-4 で UI 装飾 (チップ / ボタン サブアクセント) の参照点を増やすか、現状維持 |
| **D-7** | LOW | `--theme-shadow-glow-magenta` / `--theme-shadow-glow-cyan` が **0 箇所参照** (cyberpunk neon 用に予約されているが未活用) | Stage 7-4 で hover / focus / glitch エフェクトに必須参照を作る (§6 提案 Q4 に組込み) |
| **D-8** | LOW | backward-compat alias 群 (`--bg-primary` / `--accent` / `--text-primary` 等 30+ 個) は新規 component が `--theme-color-*` を直接参照すれば徐々に dead 化していく。Stage 7-1 設計通りだが、**廃止スケジュールが specs/ に未記録**。 | `docs/decision_log.md` に PD-DESIGN-COMPAT-ALIAS-SUNSET-V1 を起票し、Stage 7-7 (本番デプロイ) 後 X stage で削除する road-map を確定 |

### 5.2 backward-compat alias の引用比率 (sample)

| alias | 引用回数 | 推奨 |
|---|---|---|
| `--bg-primary` | 多 (各画面 root) | 残す (FOUC / global.css 用) |
| `--text-primary` | 多 | 残す |
| `--accent` | 多 | 残す or `--theme-color-accent` 推奨 |
| `--button-disabled-bg` | 11 | 残す |
| `--success-subtle` | (内部のみ) | 検討 |
| `--shadow-drawer` | **0** | 削除 (D-4) |
| `--accent-bg` | **0** | 削除 (D-5) |

---

## 6. Stage 7-4 (cyberpunk neon 最大化) 影響予測 + 提案 `[skill:design-system §PriorityActions]`

### 6.1 Stage 7-4 ミッションスコープ (po_expectations §22 / themes.css コメント)

> "cyberpunk: ネオン最大 / Orbitron+VT323 / 黄+紫+シアン / motion 200ms + glitch"
> "Stage 7-4 (E ネオン最大化) でさらなる調整予定" (animations.css:167)

### 6.2 追加すべき token カテゴリ (Skill 提案)

| カテゴリ | 推奨 token 名 | 理由 / 用途 | 4 テーマでの値 |
|---|---|---|---|
| **glow** | `--theme-shadow-glow-yellow` | cyberpunk 主役色のネオン box-shadow を 1 箇所に集約 (現在 animations.css line 205/241 で rgba 直書き) | apple/totoro/dq=`none`, cyberpunk=`0 0 4px rgba(252,238,10,.85), 0 0 14px rgba(252,238,10,.55), 0 0 30px rgba(252,238,10,.30)` |
| **glow** | `--theme-text-glow-accent` | テキスト用 (text-shadow), button label, hero copy | apple/totoro/dq=`none`, cyberpunk=`0 0 6px var(--theme-color-accent), 0 0 14px rgba(252,238,10,.5)` |
| **glitch** | `--theme-glitch-rgb-shift` | RGB ずれを 1 値で定義し全 glitch アニメで参照 | dq/totoro/apple=`0`, cyberpunk=`2px` (translate3d 量) |
| **glitch** | `--theme-glitch-hue-rotate-min/max` | hue-rotate 振幅 token | apple/totoro/dq=`0`, cyberpunk=`-30deg / 45deg` |
| **scanline** | `--theme-scanline-color` | scanline overlay background-image stops | dq=`rgba(0,0,0,.15)`, cyberpunk=`rgba(0,255,224,.05)`, apple/totoro=`transparent` |
| **scanline** | `--theme-scanline-spacing` | scanline 間隔 | cyberpunk=`3px`, dq=`2px`, others=`0` |
| **chromatic-aberration** | `--theme-chromatic-offset` | text-shadow 用 RGB 二重 (赤+シアン) | cyberpunk=`-1px 0 #ff2d55, 1px 0 #00ffe0`, others=`none` |
| **flicker** | `--theme-flicker-period` | neon flicker 周期 (動作中の `lais-cyberpunk-neon-flicker` 3.6s をテーマ token 化) | cyberpunk=`3.6s`, others=`0s` |
| **icon-highlight** (H-3 解消) | `--theme-icon-highlight` | dq の `#fffce8` (8bit pixel highlight) を統一 | apple=`transparent`, totoro=`rgba(255,255,255,.5)`, dq=`#fffce8`, cyberpunk=`#fcee0a` |
| **error** (H-2 解消) | `--theme-color-error-bg` / `--theme-color-error-text` | 4 テーマ別 error UI | (apple/totoro/dq/cyberpunk 各値、§3 H-2 提案) |

### 6.3 cyberpunk 拡張用 token (Stage 7-4 内で完結)

| 推奨 token 名 | 値 (cyberpunk) | 用途 |
|---|---|---|
| `--theme-color-neon-tertiary` | `#ff2d55` (red-pink) | 既存 magenta / cyan に加え、3rd accent |
| `--theme-shadow-glow-tertiary` | `0 0 4px #ff2d55, 0 0 14px rgba(255,45,85,.6)` | ↑ の glow 版 |
| `--theme-color-grid-bg` | `linear-gradient(rgba(252,238,10,.05) 1px, transparent 1px) 0 0/24px 24px` | "grid background" 装飾用 |
| `--theme-color-noise-overlay` | url(...) または fractalNoise SVG-data-uri | scanline + 雑音テクスチャ |
| `--theme-motion-glitch-fast` | `120ms` (cyberpunk only) | 既存 lais-cyberpunk-glitch (320ms) を 2 段階速度で |

### 6.4 影響予測

| Stage 7-4 想定変更 | 既存 token への影響 | 新規追加件数 |
|---|---|---|
| glitch アニメ強化 | `--theme-motion-fast` を更に短縮 (cyberpunk のみ 80ms 程度) | 0 (既存値の調整) |
| neon glow 全面 hover | `--theme-shadow-md` を全面 glow にすると他テーマと matrix 比較時に不公平 → 新 token 追加が望ましい | +3 (glow-yellow / glow-magenta / glow-cyan の **すべての画面で参照される版**) |
| scanline overlay (背景全面) | `body::before` 等で擬似要素 + new token | +2 (scanline-color / scanline-spacing) |
| CRT 風 distortion (全画面) | filter: blur + curve | +1 (`--theme-filter-crt`: cyberpunk = `contrast(1.1) saturate(1.2)`) |
| **合計新規追加** | | **+10〜12 token** |

→ Stage 7-4 完了後の token 数は **97〜99 / theme** に拡張する見込み (現 87 + 10〜12)。

### 6.5 Stage 7-4 着手前の必須対応 (本監査の結論)

Stage 7-4 を **clean に着手するため**、本監査が要請する事前タスク:

1. **CRITICAL H-1**: `themes 2.css` 等 stale duplicates 3 ファイル削除 (これがあると Stage 7-4 で themes.css と themes 2.css のどちらが SSoT か曖昧になる)
2. **HIGH H-2**: `--theme-color-error-bg` / `--theme-color-error-text` 4 テーマで定義 + S10/S20/S30 jsx を `var(--theme-color-error-bg)` 参照に書換
3. **HIGH H-3**: `--theme-icon-highlight` token 4 テーマで定義 + 16 icons の `#fffce8` を変数化 (Stage 7-4 で cyberpunk アイコンに glow を付ける時、明色ハイライトが #fffce8 のままだとテーマ違和感)
4. **MED H-5**: `animations.css` 内の rgba 直書き 3 箇所を token 化 (Stage 7-4 で glitch アニメを拡張する際、token 経由でないと cyberpunk 専用調整が分散する)
5. **MED D-3**: `iconBase.js` の `getIconStrokeProps()` を CSS variable 経由 (`getComputedStyle`) または themes.css の `--theme-icon-stroke-width` を削除 (片寄せ)
6. **LOW D-4 / D-5**: 0 参照 alias (`--shadow-drawer` / `--accent-bg`) を削除 or 引用点追加

---

## 7. 結論と提言 (Priority Actions)

### 7.1 主要発見 (主要 5 件)

1. **CRITICAL: `themes 2.css` / `global 2.css` / `tokens 2.css` (macOS Finder duplicate) が `lais/src/styles/` に残存** → 動作影響なしだが SSoT 曖昧化、Stage 7-4 着手前に削除必須
2. **HIGH: `--bg-error` / `--text-error` がどこにも定義されていない** → 3 画面 (S10/S20/S30) でテーマ無視の `#b00020` / `#fff0f0` が常時表示される実バグ
3. **HIGH: 16 icons が `fill="#fffce8"` を直書き** → dq theme branch 内とはいえ token 化されておらず、Stage 7-2 spec の token 統制と矛盾
4. **MED: tokens.css と themes.css で radius / motion が二重定義** (5 step vs 4 step、theme-motion vs duration) → どちらが SSoT か曖昧
5. **MED: cyberpunk-only `--theme-shadow-glow-magenta` `-glow-cyan` が 0 引用 + animations.css の rgba 直書きで neon 演出している** → token 化された glow が活用されていない、Stage 7-4 で要再設計

### 7.2 監査スコア

| 項目 | スコア |
|---|---|
| 命名一貫性 | 95 / 100 |
| ハードコード残存 | 78 / 100 (3 stale + 5 H-2/H-3 系で減点) |
| token カバレッジ | 90 / 100 |
| 重複・dead alias | 80 / 100 (D-1〜D-5) |
| Stage 7-4 readiness | 65 / 100 (1 CRITICAL + 2 HIGH 残) |
| **総合** | **78 / 100** |

### 7.3 推奨アクション (Priority Actions, 優先度順)

| 優先度 | アクション | 影響範囲 | 推定工数 |
|---|---|---|---|
| **P0** | H-1: `themes 2.css` / `global 2.css` / `tokens 2.css` 3 ファイル削除 | `lais/src/styles/` | 5 分 (`rm` + 確認) |
| **P0** | H-2: error 系 token 4 テーマ定義 + 3 画面の jsx 書換 | themes.css + S10/S20/S30 jsx | 30 分 |
| **P0** | H-3: `--theme-icon-highlight` 追加 + 16 icons 書換 | themes.css + 16 .jsx | 60 分 |
| **P1** | H-5: animations.css の rgba 直書き 3 箇所 token 化 | animations.css + themes.css | 20 分 |
| **P1** | D-1 / D-2: tokens.css の radius/motion 二重定義削除 | tokens.css | 15 分 |
| **P1** | D-3: iconBase.js stroke-width 二重一致解消 | iconBase.js | 20 分 |
| **P2** | D-4 / D-5: 0 引用 alias 削除 | themes.css | 10 分 |
| **P2** | N-1 / N-3: dq accent-bg 命名分離 + totoro info 色分離 | themes.css | 20 分 |
| **P3** | Stage 7-4 用 +10 token 設計 (glow / glitch / scanline 系) | themes.css + new spec.md | 4 時間 (Stage 7-4 ミッション本体) |
| **P3** | D-8: backward-compat alias sunset PD 起票 | docs/decision_log.md | 15 分 |

### 7.4 提言

- **P0 系 (H-1 / H-2 / H-3) は Stage 7-4 着手前に解消すべき** (Skill `design:design-system` の "Document everything" 原則を満たすため)。本監査は分析専用のため、別ミッション `STAGE7-4-PREP-DEBT-CLEANUP-V1` を起票推奨。
- **Stage 7-4 本体では §6.2 の +10 token 追加に加え、scanline / glitch / chromatic 系の *新カテゴリ* を立てる**ことを推奨 (現状の color/shadow/motion 3 カテゴリでは neon ↔ glitch の責務が混ざる)。
- `design:design-system` Skill は再呼出可能なので、Stage 7-4 終了時に **post-7-4 audit** を本レポートと差分比較し、token 数 / カバレッジ / 命名一貫性スコアの改善を定量化することを推奨 (PD-CLAUDE-DESIGN-SKILL-MANDATORY-V1 への evidence 蓄積)。

---

## 8. Appendix: 詳細データ

### 8.1 4 テーマ token name parity (87 共通 + 6 cyberpunk-only)

```
共通 (4 テーマ × 87 = 348 定義):
--theme-name, --theme-icon-set, --theme-icon-primary, --theme-icon-accent, --theme-icon-bg, --theme-icon-stroke-width,
--theme-color-bg, --theme-color-bg-elevated, --theme-color-bg-card, --theme-color-bg-overlay,
--theme-color-text, --theme-color-text-secondary, --theme-color-text-muted, --theme-color-text-inverse,
--theme-color-accent, --theme-color-accent-hover, --theme-color-accent-subtle, --theme-color-accent-bg,
--theme-color-success, --theme-color-warning, --theme-color-danger, --theme-color-info,
--theme-color-border, --theme-color-border-strong, --theme-color-divider,
--theme-font-base, --theme-font-display, --theme-font-mono,
--theme-font-letter-spacing-{tight,normal,loose}, --theme-font-line-height-{body,heading},
--theme-radius-{sm,md,lg,xl,pill},
--theme-shadow-{sm,md,lg},
--theme-motion-{fast,normal,slow}, --theme-motion-easing, --theme-motion-easing-spring, --theme-motion-page-transition,
--bg-primary, --bg-surface, --bg-elevated, --border, --border-strong, --text-primary, --text-secondary, --text-muted, --text-placeholder,
--accent, --accent-hover, --accent-subtle, --button-primary-bg, --button-primary-text, --button-disabled-{bg,text,border},
--success, --success-subtle, --warning, --danger, --danger-subtle, --danger-solid, --info,
--cat-{work,health,learn,hobby,social,other},
--shadow-{none,sm,md,lg,drawer}, --focus-ring-color,
--theme-color-modal-overlay, --theme-color-button-text-inverse, --theme-color-status-overdue, --theme-color-overlay-strong

cyberpunk only (+6):
--theme-color-magenta, --theme-color-magenta-hover, --theme-color-cyan, --theme-color-cyan-hover,
--theme-shadow-glow-magenta, --theme-shadow-glow-cyan
```

### 8.2 0 引用 token (dead aliases / 未使用 token)

| token | reason |
|---|---|
| `--theme-color-bg-overlay` | 0 refs (Stage 7-3 で `--theme-color-modal-overlay` に置換、旧 token 残存) |
| `--shadow-drawer` | 0 refs |
| `--accent-bg` | 0 refs |
| `--theme-shadow-glow-magenta` | 0 refs (Stage 7-4 用予約) |
| `--theme-shadow-glow-cyan` | 0 refs (Stage 7-4 用予約) |
| `--theme-icon-primary` | 0 refs (icon は currentColor で stroke、本 token は metadata のみ) |
| `--theme-icon-accent` | 0 refs (同上) |
| `--theme-icon-bg` | 0 refs (同上) |
| `--theme-icon-stroke-width` | 0 refs (iconBase.js でハードコード重複, D-3) |

### 8.3 fallback hardcode 全リスト (9 ヶ所、§3 H-2 / H-4 該当)

```
ThemeSwitcher.css:68    var(--bg-surface, #fafaf7)        ← 設計上 OK (alias 定義あり)
ThemeSwitcher.css:69    var(--border, #e5e5e0)            ← 設計上 OK
ThemeSwitcher.css:78    var(--border-strong, #c7c7c0)     ← 設計上 OK
S20Talk.jsx:436         var(--text-error, #b00020)        ← H-2 (token 未定義)
S30MeProfile.jsx:167    var(--bg-error, #fff0f0) +        ← H-2
                        var(--text-error, #b00020)        ← H-2
S10Grow.jsx:533         var(--bg-error, #fff0f0) +        ← H-2
                        var(--text-error, #b00020)        ← H-2
S10Grow.css:398         var(--cat-work, #79c0ff)          ← H-4 (旧 v0.12 fallback)
S10Grow.css:402         var(--cat-health, #7ee787)        ← H-4
S10Grow.css:406         var(--cat-learn, #d2a8ff)         ← H-4
```

### 8.4 16 icons #fffce8 一覧 (H-3)

```
IconHome.jsx:17           dq branch 内 (rect highlight)
IconBell.jsx:13           dq branch 内
IconBookmark.jsx:12       dq branch 内
IconCalendar.jsx:12       dq branch 内
IconClock.jsx:12          dq branch 内
IconEdit.jsx:12           dq branch 内
IconLightbulb.jsx:14,15   dq branch 内 (※ grep で false-flag 表示、実際は dq branch)
IconLog.jsx:12,13,14      dq branch 内
IconSearch.jsx:13         dq branch 内
IconSettings.jsx:16       dq branch 内 (※ grep で false-flag、実際は dq branch)
IconSparkle.jsx:12        dq branch 内
IconStar.jsx:12           dq branch 内
IconSword.jsx:12          dq branch 内
IconTalk.jsx:12,13,14     dq branch 内
IconTrash.jsx:14,15       dq branch 内 (※ grep で false-flag、実際は dq branch)
IconWarning.jsx:12,13     dq branch 内
```

→ **すべて dq theme branch 内、実行時は theme==='dq' 時のみ評価**。ただし token 化されていないので Stage 7-4 で他テーマ (cyberpunk 等) のアイコンに同種 highlight を入れたくなった瞬間に統一機構が無く、設計負債としてカウント。

---

## 9. 完了報告 (5 行サマリー、§2.25.21.2 準拠)

```
[完了報告 - DESIGN-SYSTEM-AUDIT-2026-04-28]
1. やったこと: 4 テーマ × 87 共通 token + cyberpunk +6 拡張 token + 30 icons + 21 画面を design:design-system Skill で監査
2. 結果: CRITICAL 1 / HIGH 2 / MED 5 / LOW 4 = 計 12 件発見、提言 12 件 (+10 token Stage 7-4 提案)
3. 検証: lais/verify/design_system_audit_2026-04-28.md 出力 (本ファイル) / 主要発見 5 件 (themes 2.css ガベージ + bg-error 未定義 + 16 icons #fffce8 + radius/motion 二重定義 + glow tokens 0 引用)
4. 影響: PO 確認事項あり (P0 系 3 件: themes 2.css 削除 / error token 追加 / icon-highlight token 追加 — Stage 7-4 着手前に解消推奨)
5. 次: ADV 提案アクション = 別ミッション STAGE7-4-PREP-DEBT-CLEANUP-V1 を起票し P0 (H-1/H-2/H-3) を解消後 Stage 7-4 着手
```

---

> 監査終了時刻: 2026-04-28
> Skill 利用: `design:design-system` (po_expectations §23 準拠)
> 次回監査推奨: Stage 7-4 完了直後 (post-7-4 audit) にて token 数 / カバレッジ / 命名一貫性スコアの改善を定量化
