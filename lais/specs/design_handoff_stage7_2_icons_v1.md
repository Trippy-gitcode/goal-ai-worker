# Handoff Spec: Lais Stage 7-2 — Emoji to SVG Icon Set (30 icons)

> Generated 2026-04-28 via `design:design-handoff` for Stage 7-2 (STAGE-7-2-EMOJI-TO-SVG-V1).
> Source of truth: po_expectations §23 (Claude Design Skill 必須利用), themes.css 4-theme tokens.

## Overview

Lais の 21 画面で使用される絵文字 (emoji + dingbats: ✕ ⚔️ 🎉 ▲ ▼ ↓ 等) を、4 テーマ
(`apple` / `totoro` / `dq` / `cyberpunk`) で異なるビジュアル言語を持つ React (preact)
SVG コンポーネント 30 種に置換する。 PO #6 万人対応はしないが、4 テーマ別最適化で
Brand 表現を最大化、`currentColor` + `--theme-icon-*` token で色制御。

## Layout

| Size token | px  | Use                                                          |
|-----------|-----|--------------------------------------------------------------|
| sm        | 16  | inline label icons, badges                                  |
| md        | 24  | default action buttons, list-item leading icons             |
| lg        | 32  | feature cards, ヒーロー領域                                  |

`viewBox` は全アイコン共通 `0 0 24 24`（pixel-perfect 24 グリッド）。
SVG の `width`/`height` は `size` props (default 20) で指定し、CSS で再計算可能。

## Design Tokens Used

| Token                                | apple             | totoro            | dq                | cyberpunk         | Usage                          |
|--------------------------------------|-------------------|-------------------|-------------------|-------------------|--------------------------------|
| `--theme-icon-set` (existing)        | sf-symbols        | leaf-line         | pixel-8bit        | neon-tactical     | デバッグ用 metadata           |
| `--theme-icon-primary` (NEW)         | #1c1c1e           | #2b3a25           | #fffce8           | #fcee0a           | アイコン本体線色              |
| `--theme-icon-accent` (NEW)          | #007aff           | #5a9e3a           | #4060c0           | #cf3aff           | アイコン強調 (active)         |
| `--theme-icon-bg` (NEW)              | transparent       | rgba(168,200,149,.18) | #2c2c54       | rgba(252,238,10,.10) | アイコン背景 box           |
| `--theme-icon-stroke-width` (NEW)    | 1.6               | 1.8               | 2.5               | 1.4               | 既存 `getIconStrokeProps()` と二重一致 |

## Components (30 icons)

| #  | Name           | Purpose                              | Replaces (emoji/symbol) |
|----|----------------|--------------------------------------|-------------------------|
| 1  | IconHome       | Tab GROW                             | (existing)              |
| 2  | IconGoal       | Goal/flag                            | (existing)              |
| 3  | IconLog        | Log/journal                          | (existing)              |
| 4  | IconMe         | Profile/me                           | (existing)              |
| 5  | IconSearch     | Search/magnifier                     | (existing)              |
| 6  | IconTalk       | Chat bubble                          | (existing)              |
| 7  | IconClose      | Close (✕)                            | ✕                       |
| 8  | IconCheck      | Checkmark                            | ✓                       |
| 9  | IconArrowDown  | Down arrow / banner                  | ↓                       |
| 10 | IconChevronUp  | Section open                         | ▲                       |
| 11 | IconChevronDown| Section closed                       | ▼                       |
| 12 | IconChevronLeft| Back                                 | ←                       |
| 13 | IconChevronRight| Forward                             | →                       |
| 14 | IconSparkle    | Level-up celebration                 | 🎉                      |
| 15 | IconSword      | Quest / 冒険                         | ⚔️                       |
| 16 | IconCalendar   | Date pick                            | 📅                      |
| 17 | IconClock      | Time / duration                      | 🕐                      |
| 18 | IconBell       | Notification                         | 🔔                      |
| 19 | IconStar       | Favorite / EXP                       | ⭐                      |
| 20 | IconHeart      | Like / favorite                      | ❤️                      |
| 21 | IconPlus       | Add task / goal                      | ＋                      |
| 22 | IconMinus      | Remove                               | －                      |
| 23 | IconTrash      | Delete                               | 🗑                      |
| 24 | IconEdit       | Edit / pencil                        | ✏️                       |
| 25 | IconSettings   | Settings cog                         | ⚙️                       |
| 26 | IconUser       | User avatar fallback                 | 👤                      |
| 27 | IconBookmark   | Bookmark                             | 🔖                      |
| 28 | IconLightbulb  | Idea / hint                          | 💡                      |
| 29 | IconWarning    | Warning triangle                     | ⚠️                       |
| 30 | IconRefresh    | Reload / refresh                     | 🔄                      |

## Props

```ts
interface IconProps {
  size?: number;                  // default 20
  className?: string;             // default ''
  'aria-label'?: string;          // when role="img"
  decorative?: boolean;           // default true (aria-hidden + focusable=false)
}
```

## States and Interactions

| Element        | State         | Behavior                                             |
|----------------|---------------|------------------------------------------------------|
| Any icon       | default       | `currentColor` stroke/fill, `--theme-icon-stroke-width` per theme |
| Any icon       | hover (parent button) | parent CSS adjusts color to `--theme-color-accent-hover` |
| Any icon       | active        | (cyberpunk) drop-shadow neon glow filter            |
| Any icon       | disabled      | parent CSS `color: var(--text-muted)` cascade       |

## Accessibility

- Decorative (`decorative={true}`, default): `aria-hidden="true"`, `focusable="false"`,
  no `role`, no `aria-label`.
- Interactive (`decorative={false}`): caller passes `aria-label="閉じる"` style label,
  emits `role="img"` on the SVG. ARIA Authoring Practices §1.6.6.
- Focus ring: icons inherit parent button focus via `outline: 2px solid var(--focus-ring-color)`
  defined in `themes.css`.

## Theme Visual Language (per icon convention)

| Theme       | Stroke | Cap     | Fill technique        | Decoration                               |
|-------------|--------|---------|-----------------------|------------------------------------------|
| apple       | 1.6    | round   | none (line only)      | thin bezier curves                       |
| totoro      | 1.8    | round   | accent fill on motif  | leaf/curl flourish                       |
| dq          | 2.5    | square  | block fill            | 8-bit pixel rect highlights              |
| cyberpunk   | 1.4    | square  | none (line only)      | dashed scan-line + sub-axis crosshair    |

## Edge Cases

- **prefers-reduced-motion**: Icons have no animation by default. Theme-level
  `--theme-motion-page-transition: none` is applied; icons inherit safely.
- **High DPI**: SVG vector — no rasterization issues at 16/24/32/larger.
- **RTL**: Lais is JP/EN top-down LTR only (PO #6 万人対応外); IconChevronLeft/Right
  do NOT auto-mirror.
- **Print**: `currentColor` resolves to body text color in print stylesheets (none yet).

## Animation / Motion

| Element | Trigger       | Animation   | Duration | Easing                |
|---------|---------------|-------------|----------|-----------------------|
| Icon    | Theme change  | none        | 0        | n/a                   |
| Icon    | parent hover  | color shift | per theme `--theme-motion-fast` | per theme |

## Implementation Map

```
src/components/icons/
  iconBase.js            # shared helpers (existing, extended in 7-2)
  IconHome.jsx           # existing
  IconGoal.jsx           # existing
  IconLog.jsx            # existing
  IconMe.jsx             # existing
  IconSearch.jsx         # existing
  IconTalk.jsx           # existing
  IconClose.jsx          # NEW (replaces ✕)
  IconCheck.jsx          # NEW
  IconArrowDown.jsx      # NEW (replaces ↓)
  IconChevronUp.jsx      # NEW (replaces ▲)
  IconChevronDown.jsx    # NEW (replaces ▼)
  IconChevronLeft.jsx    # NEW
  IconChevronRight.jsx   # NEW
  IconSparkle.jsx        # NEW (replaces 🎉)
  IconSword.jsx          # NEW (replaces ⚔️)
  IconCalendar.jsx       # NEW
  IconClock.jsx          # NEW
  IconBell.jsx           # NEW
  IconStar.jsx           # NEW
  IconHeart.jsx          # NEW
  IconPlus.jsx           # NEW
  IconMinus.jsx          # NEW
  IconTrash.jsx          # NEW
  IconEdit.jsx           # NEW
  IconSettings.jsx       # NEW
  IconUser.jsx           # NEW
  IconBookmark.jsx       # NEW
  IconLightbulb.jsx      # NEW
  IconWarning.jsx        # NEW
  IconRefresh.jsx        # NEW
  index.js               # barrel export (NEW)
```

Total = 30 icon files + iconBase.js + index.js.
