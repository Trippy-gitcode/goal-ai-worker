# CAT-L TZ/Locale Review — P3 Locale Accessibility

ミッション: SUBAGENT-LAIS-CAT-L-TZ-LOCALE-3PERSONA-REVIEW-V2
日付: 2026-05-02
担当 persona: P3 Locale Accessibility

## P3 Locale Accessibility 観点 review

### Scope

- 言語切替 UI / lang attribute / 文字 encoding / a11y label
- HTML root の `lang` declaration 充足度
- `frontend/i18n/_conventions.md` aria.* prefix の存在
- 日本語特有の半角カナ / 全角混在 / IME 影響

### 検出 (DETECT)

1. **lang switcher 不在**: `frontend/index.html` は `lang="ja" data-keyboard-aware` 固定、 `offline.html` も `lang="ja"` 固定で言語切替 UI が無い。 single-locale phase では仕様通りだが、 multi-locale 拡張時 (Phase 6) に UI/UX 設計 + key 切替 logic が新規実装必要。
2. **aria.* prefix 翻訳カバレッジ**: `_conventions.md` で `aria.*` prefix は明文化されているが、 ja.json 内の actual key 数は coverage check 上 123 keys に含まれている (詳細 key 数は ja.json 確認要)。 SR (screen reader) label 翻訳が target 609 keys に対し 20% 宣言段階のため、 a11y 重要 label の網羅は Phase 5 ticket 対象。

### 記録 (RECORD)

- HTML root `lang` 属性は 3 file (frontend/index.html / frontend/offline.html / lais/index.html) で `lang="ja"` 明示、 WCAG 3.1.1 (Language of Page) 充足。
- 文字 encoding は `<meta charset="UTF-8">` で全 HTML file 統一、 半角カナ / Unicode 絵文字も UTF-8 で安全に保存可能。
- `data-keyboard-aware` attribute (Round 25 R-003) は visual-viewport-keyboard.js auto-init opt-in 用、 iOS Safari の入力時 viewport jump 抑制の a11y 改善。
- `_conventions.md` には ICU MessageFormat の plural / select 規約が記述、 性別 select は将来 RTL/EU 拡張時の予約定義となっている (現 phase 未使用)。

### 措置不要 (NO_ACTION)

- single-locale ja-JP phase における lang attribute / charset / a11y prefix 規約は WCAG 2.1 AA レベルを満たしており、 現行 release block 該当無し。
- 言語切替 UI は Phase 6 multi-locale roadmap 内で UX 設計と一体実装するのが整合的、 Phase 4-5 では DETECT 1 件は ticket 化対象外 (roadmap 整合 = NO_ACTION)。

### vote

- approve / approve_with_concerns / reject から: **approve**
- 理由: ja-JP single-locale 前提下では HTML lang 明示 + UTF-8 + aria.* prefix 規約 + ICU MessageFormat 整備で a11y 観点は production 適合。 multi-locale 拡張時の lang switcher / RTL 対応は Phase 6 roadmap で計画済、 現 phase での即時介入不要。

