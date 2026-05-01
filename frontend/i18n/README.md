# i18n SSoT — frontend translation key dictionary

> Round 6 P0 fix #I-1 (2026-05-01) で新設。多言語化に着手する際の Single Source of Truth (SSoT)。
> Mission: SUBAGENT-DEVSYS-ROUND6-P0-FIX-V1
> Voted in: 6 persona vote (frontend-architect / pwa-engineer / mobile-ux / security-auditor / i18n-engineer / cross-browser-qa) = 6/6 YES、反対 0。

---

## 1. 目的

Lais frontend (`index.html` / `js/*.js` / `style.css`) は現状 **JP モノリンガル**:
- index.html 中の日本語ハードコード密度: **609 hit** (Round 6 §0.3 grep 計測)
- aria-label `124 hit` 全件日本語
- i18next / formatjs / react-intl 等の翻訳ライブラリ: **0 hit**

このまま英語化すると **609 文言の手作業抽出 → ID 化 → 翻訳挿入 (Lais regression test 含めて 2-3 週間)**。**Round 6 P0 #I-1** はこの**構造的不在**を P0 認定。

---

## 2. SSoT 構造 (本 directory)

```
frontend/i18n/
├── README.md          # 本ファイル — 構造説明と運用ルール
├── ja.json            # 日本語 seed / starter subset (NOT a complete baseline!) — coverage: partial
├── en.json            # 英語翻訳 (Phase 2、native review)
├── zh.json            # 中国語翻訳 (Phase 3、Asia 拡張時)
├── ko.json            # 韓国語翻訳 (Phase 3、Asia 拡張時)
└── _conventions.md    # キー命名規約 (本 README §4 と整合)
```

本 mission (Round 6 P0 fix V1) では **構造のみ配備** = `i18n/` directory + `i18n/ja.json` seed (代表文言のみ) + 本 README 配備。実 library 導入 (i18next / formatjs / @formatjs/intl) と全 609 文言の抽出は **Phase 1 follow-up mission `SUBAGENT-LAIS-I18N-SSOT-PHASE1-V1`** に分離。

### 2.1 ja.json の現状 (Round 22 R-005 + Round 23 R-002 fix で明示化)

> ⚠ **重要**: `ja.json` は **complete baseline ではなく seed / starter subset** です。
> 実装者が「既にベース辞書が揃っている」と誤認しないよう、本節で coverage を明示します。

> 📌 **値の SSoT**: 以下の数値はすべて `frontend/i18n/ja.json` の `_meta` から取得され、
> CI script `scripts/i18n_coverage_check.sh` が drift を検知します。本 README 内の手書き値が
> 実ファイルと不一致の場合、CI が exit 1 で commit を block します。

| 項目 | 状態 (auto-measured) |
|---|---|
| 全文言数 (target) | 609 (Round 6 §0.3 grep 計測 — 後続 mission で再計測予定) |
| 現在 `ja.json` 収録数 | 100 keys (`_meta` を除いた flat key 数) |
| coverage 率 | 約 16% (= 100 / 609) |
| 残未収録件数 | 約 509 |
| Phase 1 完了条件 | **609 / 609 keys 抽出完了 + ICU 構文検証 PASS** |

`ja.json` の `_meta.coverage = "partial"` が設定されているため、実装者は library 導入前に必ず Phase 1 mission の完了を待つこと。Phase 1 完了後は `_meta.coverage = "complete"` に更新する。

---

## 3. JSON schema 仕様

`ja.json` / `en.json` 等は ICU MessageFormat 互換の flat key 構造を採用:

```json
{
  "common.greeting": "こんにちは",
  "common.greeting.welcome": "ようこそ {name} さん",
  "auth.signin.button": "サインイン",
  "auth.signin.error.invalid_token": "認証トークンが無効です",
  "chat.placeholder": "ゴールを教えてください",
  "settings.font_size.label": "文字サイズ",
  "_meta": {
    "lang": "ja",
    "version": "1.0.0",
    "last_updated": "2026-05-01"
  }
}
```

- key は `dot.notation`、文脈プレフィックス + 機能 + variant
- ICU MessageFormat (`{name}` / `{count, plural, one {1件} other {#件}}`) サポート想定
- 各 locale ファイルは UTF-8 / LF / final newline 強制

---

## 4. 命名規約

| プレフィックス | 用途 | 例 |
|---|---|---|
| `common.*` | 共通 (ボタン、汎用 label) | `common.save`, `common.cancel`, `common.close` |
| `auth.*` | 認証 / サインイン / トークン | `auth.signin.button`, `auth.token.expired` |
| `chat.*` | チャット / コーチング | `chat.placeholder`, `chat.send_button` |
| `goal.*` | ゴール / タスク | `goal.create.title`, `goal.complete.toast` |
| `settings.*` | 設定 | `settings.theme.label`, `settings.font_size.large` |
| `error.*` | エラーメッセージ | `error.network.offline`, `error.api.timeout` |
| `aria.*` | aria-label / aria-describedby (124 件) | `aria.hamburger.menu`, `aria.sidebar.navigation` |
| `legal.*` | 利用規約 / プライバシー | `legal.terms.title`, `legal.privacy.consent` |
| `_meta` | locale ファイルメタデータ (語彙対象外) | (上記参照) |

---

## 5. RTL / 言語別 font-family / Intl 連動

- **RTL** (Finding I-2): `<html dir="auto">` + CSS `margin-inline-start` 等 logical property 移行を Phase 2 で計画
- **font-family** (Finding I-4): `<html lang>` ごとに `--ff` CSS variable swap、`Noto Sans JP` / `Noto Sans SC` / `Noto Sans KR` fallback を Phase 2 で配備
- **Intl** (Finding I-5): 数値 / 日付 / 通貨 表記は `Intl.NumberFormat` / `Intl.DateTimeFormat` / `Intl.RelativeTimeFormat` 経由を Phase 1 完了後に application layer で適用

### 5.0 既知の i18n 未接続例外 (Round 25 R-005 で明示化)

> ⚠ **警告**: 以下のページ / コンポーネントは現状 `frontend/i18n/ja.json` と
> 接続されておらず、文言を二重管理している。Phase 1 mission `SUBAGENT-LAIS-I18N-SSOT-PHASE1-V1`
> で接続予定。

| ファイル | 該当 i18n keys (seed) | 現状 | 接続予定 |
|---|---|---|---|
| `frontend/offline.html` | `offline.fallback.title` / `offline.fallback.body` / `offline.fallback.retry` | HTML 内ハードコード (`オフラインです` / `現在ネットワークに...` / `再読み込み`) | Phase 1 で `t(key)` 化 |
| `frontend/index.html` (大半) | `auth.*` / `chat.*` / `goal.*` / `settings.*` 全般 | HTML 内ハードコード 609 hits | Phase 1 で macro 置換 |
| `frontend/js/*.js` (toast / alert) | `error.*` / `streak.*` | JS 内文字列リテラル | Phase 1 で `t()` 経由 |

**Round 25 改善 (本 commit)**: `offline.html` 内 JS の文言を `TXT` object に集約し、
将来の `t()` 化を 1 行 swap で可能にした (Round 22 R-008 fix で実施済)。
HTML 側 `<h1>` / `<p>` / button label は依然ハードコード。Phase 1 完了まで二重管理が継続することを README で明示し、bug 源として認識する。

---

### 5.1 数値・通貨・日付の責務分離 (Round 22 R-006 で追加)

> ⚠ **重要**: 辞書ファイルに **フォーマット済み文字列を直接格納しない** 設計に Phase 1 で移行する。

旧パターン (current seed では暫定的に共存):

```json
{
  "plan.pro.price.monthly": "¥2,980/月"        // ← 通貨記号 + 区切り + 単位が文字列に焼き込み (NG)
}
```

新パターン (Phase 1 で全面移行):

```json
{
  "plan.pro.price.monthly_label": "{price}/月",  // ← UI ラベル / テンプレートのみ
  "plan.pro.price.monthly_amount_jpy": 2980      // ← 生 amount (numeric)
}
```

application 側:
```js
const amount = t('plan.pro.price.monthly_amount_jpy');  // 2980
const formatted = new Intl.NumberFormat(currentLocale, { style: 'currency', currency: 'JPY' }).format(amount);
const label = t('plan.pro.price.monthly_label', { price: formatted });
// ja-JP: "¥2,980/月" / en-US: "$22/月" (rate 計算 + locale 切替対応)
```

同様に日付 (`plan.expires_at_label: "次回更新日: {date}"`) は `Intl.DateTimeFormat` で format 後に注入する。これにより locale ごとの通貨・日付形式変更時に翻訳と実装の両方を毎回修正する必要が消える。

**移行 status**:
- `plan.pro.price.monthly` / `monthly_yearly` / `expires_at` (旧 format-baked) — Phase 1 で削除予定 (deprecated)
- `plan.pro.price.monthly_label` / `monthly_amount_jpy` / `expires_at_label` (新責務分離) — 本 commit で seed 配備

---

## 6. 運用ルール

1. **新規文言追加**: `ja.json` に追加 → 他 locale に空文字 placeholder → 翻訳完了で commit
2. **既存文言変更**: key を不変、value のみ更新。文言の意味自体が変わる場合は **新 key 採番** (旧 key を deprecated 化)
3. **削除**: `_deprecated.*` prefix で 1 release 残し、次 release で完全削除
4. **CI hook**: `scripts/i18n_validate.sh` (Phase 1 で新設) で全 locale の key 集合一致 + ICU 構文 検証

---

## 7. Phase ロードマップ

| Phase | mission | scope | 推定 effort |
|---|---|---|---|
| **0 (本 mission)** | `SUBAGENT-DEVSYS-ROUND6-P0-FIX-V1` | i18n SSoT 構造のみ (ja.json baseline + README) | ~30 min |
| 1 | `SUBAGENT-LAIS-I18N-SSOT-PHASE1-V1` | 609 文言抽出 + macro `t(key)` 置換 + i18next 導入 | 1-2 週間 |
| 2 | `SUBAGENT-LAIS-I18N-EN-V1` | en.json 翻訳 + RTL `dir="auto"` migration + Intl.* 導入 | 3-4 日 |
| 3 | `SUBAGENT-LAIS-I18N-ASIA-V1` | zh.json / ko.json 翻訳 + Asia font-family swap | 5-7 日 |

---

## 8. dev-system 改修連動

Phase 1 完了後、`dev-system/templates/i18n_setup.template.js` に同等パターンを scaffold ジェネレータに組込予定 (`docs/changeable_policy.md` 整合)。
