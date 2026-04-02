# GOAL AI — 開発体制改善仕様書 v1
> 作成: 2026-04-01 Claude.ai
> ステータス: ふとし承認済み（全Phase採用）
> 参照元: cat.g.noey + azitoftailor のClaude Code Tips（Threadsスレッド）

---

## Phase 1: 即日適用（設定変更のみ）

### ① /permissionsで安全コマンド事前許可
`.claude/settings.json`にglob指定:
- Bash: `npm *`, `npx *`, `cat *`, `grep *`, `ls *`, `wc *`
- Edit: `src/**`, `docs/**`, `frontend/**`, `instructions/**`
- 承認疲れ解消

### ② セッション継続の導入
- `--continue`で前回セッションを再開
- 「毎回CLAUDE.md読んで」は初回のみ
- `/compact`で手動コンテキスト圧縮（自動圧縮だと重要文脈が先に飛ぶ）

---

## Phase 2: 1日で構築（スラッシュコマンド＋フック）

### ③ スラッシュコマンド化
`.claude/commands/`に作成:
- `/canopy-deploy` — canopy実行→PASS確認→git tag→git push→deploy
- `/verify-ui` — localhostサーバー起動→ブラウザでスクショ撮影→mockupと比較
- `/session-report` — session_progress.md更新→完了サマリ生成

### ④ PostToolUseフックでコード整形自動化
- ファイル保存のたびにlint/formatを自動実行
- CIでのフォーマットエラーを未然に防ぐ

---

## Phase 3: A7問題の根本解決（最重要）

### ⑤ 検証フィードバックループの構造化
旧: Code「grepで確認→完了」→ふとし実機→動いてない→手戻り
新: Code→localhost起動→Playwrightスクショ→mockup比較→差分あれば修正ループ→通過後「完了」

CLAUDE.md契約レベルで義務化:「スクショなき完了報告は完了と認めない」

### ⑥ サブエージェント活用
- `verify-app`サブエージェントで検証を分離
- 実装者と検証者を分けることで自己OK問題を構造的に排除

---

## Phase 4: 中期改善

### ⑦ UserPromptSubmitフック
- メッセージ送信のたびにテスト結果・git diff・lint結果を自動添付
- Codeが常に最新品質状態を把握して作業開始

### ⑧ バックグラウンドエージェント＋Stopフック
- 長時間タスク（E2E全件実行等）をバックグラウンドで回す
- 完了時にふとしに通知

---

## 見送り事項
- 並列実行（cat.g.noey #1-2）: ソロ開発28ファイル分割で同一ファイル競合リスク高。サブエージェント限定から開始
- Opus切替（#3）: コスト対効果を検証後に判断

---

## デザインスキル導入
`/mnt/skills/user/anti-ai-design/SKILL.md`として作成:
- AIスロップ禁止リスト（紫グラデ、Inter/Roboto、均等カラー、丸角カード量産）
- 手触り感のあるテクスチャ・タイポグラフィ指針
- ミニマル＋温かみのデザイン原則
- Code実装時に自動参照する仕組み
