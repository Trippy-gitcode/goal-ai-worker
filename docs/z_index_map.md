# GOAL AI — z-index 階層マップ
> 新規UIコンポーネント追加時に参照・更新すること
> 更新: 2026-04-03

| z-index | コンポーネント | ファイル |
|---|---|---|
| 50 | カレンダーFAB | style.css |
| 100 | ボトムタブ (#bottom-tabs) | style.css |
| 200 | 入力ボックス (#home-input-area, position:fixed) | index.html inline |
| 299 | タスク追加overlay (#task-add-overlay) | index.html inline |
| 300 | タスク追加シート (#task-add-sheet) | index.html inline |
| 400 | （予約: 今後のシート/パネル用） | — |
| 900 | トースト通知 | style.css |
| 999 | サイドバーoverlay (#sb-overlay) | style.css |
| 1000 | サイドバー本体 (#sb) | style.css |
| 1100 | フルスクリーンモーダル（コーチングモード確認等） | style.css |
| 9999 | 致命的エラーoverlay（将来用） | — |

**ルール:**
- 新コンポーネント追加時はこの表を更新してからCSS実装
- 同一z-indexは原則禁止（overlay+本体のペアは999/1000のように隣接）
- 100刻みで空けておく（将来の挿入に対応）
