# i18n キー命名規約

> 詳細は `README.md` §4 を参照。本ファイルは規約の chip 版。

## 命名 prefix table

| prefix | 用途 |
|---|---|
| `common.*` | ボタン / 汎用 label |
| `auth.*` | 認証 / サインイン / トークン |
| `chat.*` | チャット / コーチング |
| `goal.*` | ゴール / タスク |
| `settings.*` | 設定 |
| `error.*` | エラーメッセージ |
| `aria.*` | aria-label / aria-describedby |
| `legal.*` | 利用規約 / プライバシー |
| `plan.*` | 課金プラン |
| `offline.*` | オフライン banner / fallback |
| `streak.*` | 連続記録 / バッジ |
| `_meta` | locale メタデータ (語彙対象外) |

## ICU MessageFormat

- 単純変数: `{name}` `{date}`
- 複数形: `{count, plural, one {1件} other {#件}}`
- 性別 (将来 RTL/EU 拡張時): `{gender, select, male {彼} female {彼女} other {その人}}`

## 規約強制

`scripts/i18n_validate.sh` (Phase 1 で配備) が以下を CI で強制:
1. 全 locale ファイル間で key 集合が一致 (英語側に key 抜け検出)
2. ICU 構文の syntax check (`@formatjs/cli` 等)
3. value 内の HTML tag (`<b>` `<a>` 等) を allowlist 化
