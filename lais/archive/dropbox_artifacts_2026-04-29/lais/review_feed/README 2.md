# lais/review_feed/ — v3.5 Phase 2 外部レビュー監査ログ

> 新設: 2026-04-23（dev-system v3.5 Phase 2、案 D'）
> 正本: `docs/plans/sub_external_review_protocol.md` §5 Post-commit 監査ログ
> 書出し: `.git/hooks/post-commit` → `scripts/external_review_postcommit.sh`

## 書式（§5.1）

日別ファイル `YYYY-MM-DD.md` に `post-commit` ごとに追記。1 エントリ = 1 commit、`COMMIT_ISO | commit SHA` を H2 見出しにしてメタ（ミッション / diff サイズ / RISK_PATHS / GPT-5.4 結果 / Gemini 3.1 Pro 結果 / 合意度）を本文に記録する。

## 集約ファイル（§5.2）

`_critical.md` に「CRITICAL 合意 1 以上」の commit を累積。対応完了時は「対応:」行を PATCH ID + 解決 commit で上書き更新する。

## 管理方針

- 日別ログ（`*.md`）は `.gitignore` で git 管理外（ローカル監査用）
- `_critical.md` は git 管理（長期保持、PO/ADV 参照用）
- 月末は `lais/review_feed/_archive/YYYY-MM/` に日別ログをローテ（将来運用、Phase 3 で自動化予定）
