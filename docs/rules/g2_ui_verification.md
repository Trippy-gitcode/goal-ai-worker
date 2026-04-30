# G2: UI変更時のStage A — 詳細ルール
> 索引: development_rules.md → G2
> 更新: 2026-04-07

## Stage Aフロー
UI変更を含むミッションでは、デプロイ前にmockup vs 実装の比較画像を生成。
```bash
node scripts/c16_stage_a.js
ls docs/mockups/screenshots/*/impl_compare/*.png | wc -l  # 期待: 1以上
```

## CSS変更時の追加チェック
- 対象セレクタの親子全階層でpadding/margin/overflowを確認
- 新UIコンポーネント追加時: z-indexがdocs/z_index_map.mdと整合していること
- position:fixed追加時: 親階層にoverflow:hiddenがないこと確認
- DOM ID変更時: docs/dom_id_list.txtを更新

## モバイル可視性チェック（実装28で追加）
UI要素を追加・変更した場合、モバイルビューポート(375px)で以下を確認:
- 対象要素がgetBoundingClientRectで画面内に存在するか
- display:noneやvisibility:hiddenで隠れていないか
- 親要素のoverflow:hiddenで切れていないか
- flexレイアウトの場合、モバイル版にもflex指定があるか
