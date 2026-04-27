# lais/archive/spec_v34_pre_reform/verify/

ミッション: SPEC-ARCHIVE-COMPRESS-EXECUTE-V1 (2026-04-27)
バッチ: バッチ 2 (lais/verify アーカイブ)

## 状況サマリー

実 git mv 実行時点での `lais/verify/` 配下追跡ファイル数: **2 ファイル**

| パス | 扱い |
|---|---|
| `lais/verify/dev_system_v34_package.md` | **アーカイブ対象外** (本ミッション完了条件で保持義務) |
| `lais/verify/dev_system_v34_patches.md` | **アーカイブ対象外** (本ミッション完了条件で保持義務) |

計画書 `/tmp/spec_archive_compress_plan_v1.md` §1.2 / §2.1 では verify 配下に 350+ ファイル (Pre-Review / Golden Review / 画面別 review_package_r2/r3/r4/r5 / 単発 debug ログ等) を想定していたが、実 repo state では既に該当ファイル群は不在 (過去のクリーンアップ済 or 別 repo 管理)。

そのため本バッチ 2 では git mv 対象なし、本 README ファイルのみ commit してアーカイブ階層構造を確定する。

## サブディレクトリ

将来 verify 系履歴ファイルが発生した場合の収納先として、以下のサブディレクトリ階層は計画書 §2.5 通り保持する (現時点では空):

- `golden_reviews/` — Golden R1/R2 等のペルソナ別 review JSON 用
- `pre_reviews/` — Pre-Review R1〜R6 履歴用
- `round_reviews/` — R1/R2/R3 ラウンド別 review JSON + triage 用
- `screen_reviews/` — m2/m3/m4 画面別レビュー履歴用
- `external_review/` — 外部レビュー履歴用

## 履歴追跡 PASS

本バッチで実行された git 操作は本 README 新設のみ。バッチ 1 / 3 / 4 で archive へ移動された各ファイルは `git log --follow <archive-path>` で旧パスからの履歴連結が確認可能。
