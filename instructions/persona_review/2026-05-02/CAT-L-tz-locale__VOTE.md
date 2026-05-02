# CAT-L TZ/Locale Review — 投票集計 VOTE

ミッション: SUBAGENT-LAIS-CAT-L-TZ-LOCALE-3PERSONA-REVIEW-V2
日付: 2026-05-02

## P1 / P2 / P3 投票集計

| persona | vote | 主要 concern |
|---|---|---|
| P1 i18n Coverage | approve_with_concerns | declared 20% / single-locale state / multi-locale 拡張時の en.json / RTL 対応 (Phase 6 roadmap) |
| P2 Time Zone Correctness | approve_with_concerns | JST `+9 * 3600000` hardcode 5 箇所 (helpers.js / streak.js / constants.js / routes/chat.js / routes/plan.js)、 DB 側 TIMESTAMPTZ は確認済 |
| P3 Locale Accessibility | approve | lang="ja" 明示 + UTF-8 + aria.* prefix + ICU MessageFormat 整備で WCAG 2.1 AA 充足、 lang switcher は Phase 6 roadmap で計画済 |

## 集計結果

- approve: **1 件** (P3)
- approve_with_concerns: **2 件** (P1, P2)
- reject: **0 件**
- 投票総数: 3
- 過半数 status: approve / approve_with_concerns 計 3 件で release block 該当無し

## DETECT/RECORD/NO_ACTION サマリ

### DETECT (要 ticket 化候補、 但し Phase 6 roadmap 整合)

- P1: declared coverage 20%、 single-locale state、 日付 format hardcode、 通貨 multi-currency 規約未定義
- P2: JST `+9 * 3600000` hardcode 拡散 (5 箇所)、 DST race リスク (現状 JST は DST 無で問題無し)、 streak boundary 極短 window (race 抑止済)
- P3: lang switcher UI 不在、 aria.* prefix 翻訳カバレッジが target 609 に対し 20% 宣言段階

### RECORD (確認済 / 既存運用)

- DB 列 TIMESTAMPTZ 一貫性 (psql 検証 PASS、 cross_border_consent_at / sensitive_consent_at)
- migration 20260502_005 / 20260502_006 production 反映済 (psql 検証 PASS)
- ICU MessageFormat 規約 (`_conventions.md`)
- HTML lang="ja" + UTF-8 + WCAG 3.1.1 充足
- `scripts/i18n_coverage_check.sh` exit 0 PASS (declared 123 = actual 123、 drift 無し)
- `Asia/Tokyo` 明示 TZ 指定 1 箇所 (`rate-limit.js:267`、 Intl API 経路)

### NO_ACTION (Phase 6 roadmap 整合 = 即時不要)

- multi-locale 拡張 (en.json / RTL / lang switcher) は Phase 6 で計画済
- JST single-locale + DST 無 region 前提で `+9 * 3600000` hardcode は機能上 correct
- streak reset boundary race window は read-then-PATCH で同一 user 整合維持

## 結論

- 全体 status: **approve_with_concerns (Phase 6 roadmap 整合 = release block 無し)**
- 即時 ticket 化対象: 0 件 (Phase 6 多言語/multi-TZ 対応 backlog に統合)
- DB schema は TIMESTAMPTZ 一貫性 / migration 反映 共に psql cmd-realworld 検証で PASS
- i18n coverage gate exit 0 で CI 通過確認済

