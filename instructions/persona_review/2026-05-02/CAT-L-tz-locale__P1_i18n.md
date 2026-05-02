# CAT-L TZ/Locale Review — P1 i18n Coverage

ミッション: SUBAGENT-LAIS-CAT-L-TZ-LOCALE-3PERSONA-REVIEW-V2
日付: 2026-05-02
担当 persona: P1 i18n Coverage

## P1 i18n Coverage 観点 review

### Scope

- `frontend/i18n/ja.json` (140 行、 137 quote 件、 declared 123 keys / target 609)
- `frontend/i18n/_conventions.md` (prefix table, ICU MessageFormat 規約)
- `scripts/i18n_coverage_check.sh` (CI gate, drift 検出)
- 翻訳 key カバレッジ % / placeholder format / RTL / 日付 format / 数値 / 通貨

### 検出 (DETECT)

1. **declared coverage 20%**: target 609 keys に対し ja.json は 123 keys のみ宣言、 actual 一致は OK だが domain coverage が 20% にとどまる。 残 486 keys は code 内 hardcode の可能性高、 i18n migration 未着手領域。
2. **single-locale state**: `frontend/i18n/` 配下に `ja.json` のみ、 他言語 file (en.json / zh-CN.json 等) 未生成。 multi-locale 拡張時の placeholder format / ICU plural / RTL の互換確認が未実施。
3. **日付 format hardcode**: `src/utils/helpers.js` getDayKey / getMonthKey / `src/utils/constants.js` getCurrentMonth が `YYYY-MM-DD` / `YYYY-MM` の固定 ISO format。 locale aware 表示 (`Intl.DateTimeFormat`) は frontend で別途必要、 user 表示には現状 backend からの ISO key と frontend 側 format 分離が必須だが convention 未文書化。
4. **通貨表記**: `STRIPE_PRICE_IDS` (constants.js L89-95) は JPY 固定 (price_fixed: 500/1500/20000)、 multi-currency 拡張時の ICU number formatter 規約が未定義。

### 記録 (RECORD)

- ICU MessageFormat 規約は `_conventions.md` に存在、 plural / select / 単純変数の 3 形式が明文化されている。
- `scripts/i18n_coverage_check.sh` は exit 0 PASS、 declared 123 = actual 123 で drift 無し (CI gate 機能正常)。
- prefix table (common/auth/chat/goal/settings/error/aria/legal/plan/offline/streak/_meta) は 11 prefix で domain 分離されており、 拡張余地は明確。

### 措置不要 (NO_ACTION)

- 現 phase は ja-JP single-locale で production 運用、 multi-locale 拡張は Phase 6 以降の roadmap (CLAUDE.md §6.1 Phase 6)。 Phase 4-5 ticket としては優先度低。
- `index.html` `lang="ja"` 属性は明示済 (frontend/index.html / offline.html / lais/index.html 全て)、 single-locale 状態における HTML lang declaration は WCAG 3.1.1 充足。

### vote

- approve / approve_with_concerns / reject から: **approve_with_concerns**
- 理由: single-locale + 20% declared coverage 状態は production 運用 OK だが、 multi-locale 拡張前に target 609 keys 拡張 + en.json 追加 + RTL 対応の 3 ticket が必要。 現行 release block には該当しない。

