# GOAL AI — プロジェクトダッシュボード
> このファイルが Code のセッション引き継ぎの唯一の情報源
> セッション開始時に必ず読む。セッション終了時に必ず更新する。
> 仕様参照: docs/goal_ai_project_v6_4.md / docs/goal_ai_reference_v2.md

---

## 5行サマリー
- **Version:** v3.11.47（デプロイ済み 2026-04-02）
- **Next:** BUG-02（即時修正: 入力ボックス重なり＋体裁統一＋絵文字全排除）→ DEV-01 → DEV-02 → UX-01
- **Last done:** チェックリスト追加バッチ v3.11.47。B-08ドラッグ並替 + B-11/12タスク作成AI + C-11タスク追加後TODAY更新
- **Open issues:** G5未動作、BUG-01b残課題
- **方針変更:** 新コンセプト「毎朝、最善の一日を始めよう」承認。UX全面刷新（docs/ux_redesign_v1.md）+ 開発体制改善4Phase（docs/dev_improvement_v1.md）

## 現在地
- **バージョン:** v3.11.47（デプロイ済み）
- **チェーン:** BUG-02 → DEV-01 → DEV-02 → UX-01（mockup→承認→実装→チェックリスト110項目検証）→ G5 → テスト配布準備
- **次のミッション:** BUG-02（即時修正3件）

## ミッションキュー（上から順に実行）

### BUG-02: 即時修正3件（ふとし報告 2026-04-02）
> リスク: 🟡中（UI修正）
> 参照: docs/ux_checklist_v1.md セクションJ

1. TALK入力ボックスクリック→キャンセル後にチャットボックスと下タブが重なるバグ修正
2. 全画面の入力ボックスのフォーマット・体裁をTALK画面に統一
3. 全画面から絵文字を完全排除→SVGアイコンに置換（grep洗い出し→全件置換→再grep 0件確認）

---

### DEV-01: デザインスキル導入（ふとし承認済み 2026-04-01）
> リスク: 🟢低（設定追加のみ）
> 参照: docs/dev_improvement_v1.md

`/mnt/skills/user/anti-ai-design/SKILL.md` を作成。AIスロップ禁止リスト＋手触りデザイン原則＋黒板トーン準拠。

---

### DEV-02: 開発体制改善 Phase 1-4（ふとし承認済み 2026-04-01）
> リスク: 🟡中（Phase 3はCLAUDE.md契約変更を含む）
> 参照: docs/dev_improvement_v1.md

Phase 1: /permissions設定 + セッション継続導入
Phase 2: スラッシュコマンド(.claude/commands/) + PostToolUseフック
Phase 3: 検証フィードバックループ構造化（A7根本解決）— CLAUDE.md契約更新必須
Phase 4: UserPromptSubmitフック + バックグラウンドエージェント

---

### UX-01: UX刷新（ふとし承認済み 2026-04-01）
> リスク: 🔴高（ホーム画面全面改修＋ナビ構造変更）
> 参照: docs/ux_redesign_v1.md

**Step 1: mockup作成（全画面）**
docs/ux_redesign_v1.mdに基づき、新4画面＋サイドバーのHTMLモックアップを作成。
C16 Stage 0（ふとし承認）を経てから実装着手。

**Step 2: フロントエンド実装**
ボトムタブ化、TODAY画面（秘書メモ＋タスクリスト＋コメント入力）、TALK画面（賢者アイコン＋左スワイプ履歴）。

**Step 3: 秘書AI行動ロジック**
TALK↔TODAY連携、タスク自動操作、秘書メモ生成（ルールベース）、プッシュ通知。

**Step 4: 品質チェックリスト105項目を全件検証**
docs/ux_checklist_v1.md を上から順に全件検証。NG項目は修正方法に従い修正→再検証。全✅になるまで繰り返す。スキップ禁止。grepだけで✅にしない（A7ルール）。

---

### G5: 待機中アニメーション改善 ※2回「完了」報告して2回とも未動作。A7違反。再実装+動作検証必須

G5ミッション定義は後方に記載済み（L460付近）。仕様はそのまま有効。検証義務（A7強化）も記載済み。

---

### BUG-01b: iOSキーボード問題 ✅一旦完了（v3.11.34。残課題あり、テスト配布後FBで判断）
> リスク: 🟡中
> 対象ファイル: frontend/index.html、frontend/style.css、frontend/js/chat.js、frontend/js/app.js
> 分類: C11 継続バグ（ふとし実機確認済み）

**経緯:**
パッチ当てを5回繰り返し、全て実機で失敗。コードが複雑化しデグレリスクが高まっている。
今回はまずクリーンアップ（不要コード削除・品質改善）を行い、その上でCSS修正を入れる。

**症状（ふとし実機確認 2026-03-29）:**
- キーボード表示時にページ全体がキーボード高さ分だけ上にシフトする（押し上げ）
- スクロール操作すると入力ボックス（position:fixed）がスクロールに巻き込まれてキーボードの裏に隠れる
- iOS上の全ブラウザ共通（全てWebKitエンジン）。Android/デスクトップでは発生しない

**根本原因（Claude.ai分析 2026-03-29）:**
- `interactive-widget=resizes-content` をviewportメタタグに追加済み（ブラウザにビューポート縮小を指示）
- しかし `html,body` に `overflow:hidden` があるため、iOS Safariが入力フォーカス時に `overflow:hidden` を無視してスクロールする既知の挙動と衝突
- 1回目のキーボード表示はOKだが、2回目以降で押し上げが再発する
- JSでの補正（scrollTo、height制約、bottom調整、GPU compositing）は全て失敗

**過去の失敗アプローチ一覧（絶対にやらないこと）:**
1. `.page`にheight:100dvh設定 → 親のheight:100%に制限されて効かなかった
2. DOM構造変更（input-areaをbody直下に移動）→ bodyがスクロールするため効かなかった
3. GPUコンポジットレイヤー化（translate3d/will-change/backface-visibility）→ 効果なし
4. visualViewport.scrollイベントでoffsetTop補正 → 効果なし
5. visualViewport.resizeで全コンテナheightをvv.heightに制約 + scrollTo(0,0) → 効果なし
6. scrollIntoViewの削除 → 効果なし
7. visualViewport.resizeでscrollTo(0,0)のみ → 効果なし
8. focus時scrollTo(0,0)×3（即座+rAF+100ms）→ ページは戻るが視覚的な移動（フリッカー）が残る
9. scrollイベントリスナーで即時scrollTo(0,0) → 同上、視覚的移動は消えない

**ミッション手順（順序厳守）:**

**Phase 1: クリーンアップ（修正前に必ず完了すること）**

1-A. BUG-01b関連の不要コードを全て削除:
- chat.js: L1825-1829のBUG-01bコメントブロック → 削除
- app.js: `initViewportHandler`関数（scrollTo(0,0)）→ 全削除（interactive-widget=resizes-contentで不要）

1-B. フロントエンドJS全体の品質レビュー:
- chat.js、app.js、ui.js、api.jsの全体を読み、以下を洗い出す:
  - パッチ当てで残った不要なコード・コメント
  - 重複した処理
  - 意味が不明確な変数名・関数名
  - デッドコード（使われていない関数）
- 発見した問題箇所をsession_progress.mdに一覧として記載
- 明らかに不要なコードは即削除。判断が必要なものは提案ログに記載

1-C. CSS階層の確認:
- html, body, #app, #pages, .page, #pg-home の全heightとoverflowプロパティを一覧化
- コンフリクトがあれば記載

**Phase 2: overflow:clip修正**

2-A. style.css修正:
- `html,body` の `overflow:hidden` を `overflow:clip` に変更
- `overflow:clip` はスクロールコンテナを作らないため、iOS Safariが「スクロールで押し上げ」をできなくなる
- `overflow:clip` はiOS 16+対応（ふとしのデバイスは対応済み）
- 他の `overflow:hidden` 指定（#pages, .page, #pg-home内部div等）はスクロール領域制御のため維持

2-B. 入力ボックスの確認:
- `#home-input-area` は `position:fixed;bottom:0` のまま維持
- `interactive-widget=resizes-content` + `overflow:clip` により、キーボード表示時にビューポートが縮小し、bottom:0がキーボード上端になるはず
- JS側のbottom調整は一切不要

**Phase 3: シミュレーター検証**

3-A. iOSシミュレーターで以下を検証:
- キーボード1回目表示: ページが押し上げられない、入力ボックスがキーボード上に見える
- キーボードを閉じて2回目表示: 同上（2回目以降の再現性が重要）
- キーボード表示中にスクロール操作: 入力ボックスが動かない
- 他ページ（GoalHub、設定等）の入力欄でもキーボード表示が正常に動作する

3-B. デスクトップブラウザでの退行確認:
- overflow:clipへの変更でデスクトップの表示が崩れていないこと

**Phase 4: デプロイ → ふとし実機確認**

3-Aが全てPASSしたらデプロイ。ふとしに実機確認を依頼。

**Phase 4実機結果（2026-03-29 v3.11.30）:**
- overflow:clip変更で2回目キーボード表示の安定性は改善（2回目も1回目と同じ動作に）
- しかし以下2点が未解決:
  - ページが押し上げられる（ヒーローが上にスクロールされる）
  - スクロール操作すると入力ボックスがキーボード裏に隠れる
- 原因: iOS Safariの「テキストエリアにフォーカスした時にwindow自体をスクロールして要素を見せようとする」挙動。overflow:clipでもwindowスクロール自体は防げていない

**Phase 5: focusイベントでスクロール防止**

5-A. chat.jsに以下を追加:
- `#home-msg-in`（textarea）のfocusイベントで `window.scrollTo(0, 0)` を呼ぶ
- タイミングが重要: focusの直後にiOS Safariがスクロールするので、focusイベント内 + requestAnimationFrame + 100ms後の3回scrollTo(0,0)を呼ぶ
- さらに、focus中のtouchmoveイベントをwindowレベルでpreventDefaultしてスクロール操作自体を防ぐ（ただしチャット領域#home-chat-wrapのスクロールは許可）

5-B. シミュレーター検証:
- 前回「シミュレーターでタッチ入力自動化不可」で検証できなかった
- 解決策: JavaScriptでtextareaをfocusすることでキーボードを表示する
  - ローカルサーバーで配信し、シミュレーターのSafariで開く
  - SafariのWeb Inspectorまたは`xcrun simctl openurl`でJSを注入: `document.getElementById('home-msg-in').focus()`
  - または: テストHTML（textarea + 自動focus）をローカルに作成してシミュレーターで開く
- 検証項目:
  1. focus後にページが押し上げられていないこと（window.scrollYが0であること）
  2. キーボード表示中にスクロール操作してもinput-areaが動かないこと

5-C. デプロイ → ふとし実機確認

**Phase 5実機結果（2026-03-29 v3.11.31）:**
- scrollTo(0,0)×3でページは元に戻るようになった（押し上げ後にリセットされる）
- しかしフリッカーが出る（一瞬押し上げ→戻す が見える）
- 原因: focusイベント内のscrollToでは、ブラウザがスクロールした"後"にリセットするためギャップが見える

**Phase 6: フリッカー解消（scrollイベントで即時リセット）**

6-A. chat.jsの修正:
- 現在のfocusイベント内のscrollTo×3（即座+rAF+100ms）は削除
- 代わりに: focusイベントの瞬間にwindowのscrollリスナーを張り、scroll発生時に即座にscrollTo(0,0)を呼ぶ
- これにより「スクロールが起きた瞬間」にリセットされ、フリッカーが消える
- scrollリスナーはキーボードが閉じたら（blur時に）解除する
- 実装イメージ:
```js
const lockScroll = () => window.scrollTo(0, 0);
textarea.addEventListener('focus', () => {
  window.addEventListener('scroll', lockScroll, { passive: false });
});
textarea.addEventListener('blur', () => {
  window.removeEventListener('scroll', lockScroll);
});
```

6-B. シミュレーター検証:
- JSでtextareaをfocusしてキーボードを表示
- focus時にページが一瞬も動かないこと（フリッカーなし）を確認
- window.scrollYが常に0であることを確認

6-C. デプロイ → ふとし実機確認

**Phase 6実機結果（2026-03-29）:**
- scrollイベントリスナーでscrollTo(0,0)を即時呼んでも、視覚的な移動は消えなかった
- 「フリッカー」というより、ページが下から上にスクロールされてから戻る動きが見える
- 原因: scrollイベントが発火する時点でブラウザは既にレンダリングしてしまっている

**Phase 7: preventScrollアプローチ（スクロールを「戻す」ではなく「させない」）**

7-A. chat.jsの修正:
- Phase 5/6で追加した全てのscrollTo、scrollリスナー、touchmoveブロックを削除（クリーンアップ）
- textareaへの直接タップでブラウザがfocusするのを防ぎ、手動でfocusを呼ぶ:
  1. `#home-msg-in` に `pointerdown` イベントリスナーを追加
  2. pointerdownで `e.preventDefault()` → ブラウザのデフォルトfocus動作を阻止
  3. 直後に `textarea.focus({ preventScroll: true })` を呼ぶ → スクロールなしでフォーカス
  4. キーボードが出てもページは一切動かない
- 実装イメージ:
```js
const ta = document.getElementById('home-msg-in');
ta.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  ta.focus({ preventScroll: true });
});
```
- 注意: preventDefault()するとカーソル位置の自動設定やテキスト選択が効かなくなる可能性がある。その場合は `mousedown` ではなく `touchstart` のみで対応するか、selectionRangeを手動設定する

7-B. シミュレーター検証:
- textareaタップ時にページが一切動かないこと
- キーボードが正常に表示されること
- テキスト入力・カーソル操作・テキスト選択が正常に動くこと
- 既存のペースト・画像添付・音声入力が壊れていないこと

7-C. デプロイ → ふとし実機確認

**Phase 7実機結果（2026-03-29）:**
- preventScroll + pointerdownアプローチでスクロール（押し上げ）は完全に解消。フリッカーもなし
- しかし入力ボックスがキーボードの裏に隠れたまま。bottom:0がキーボード上端に来ていない
- 原因推定: preventScrollでfocusした場合、interactive-widget=resizes-contentによるビューポート縮小が正しく反映されない or bottom:0の基準がlayout viewport基準のまま

**Phase 8: 入力ボックスのキーボード追従（visualViewport.resizeでbottom調整）**

8-A. chat.jsの修正:
- Phase 7のpreventScroll + touchmoveブロックは一切変更しない（スクロール防止は維持）
- `visualViewport.resize` イベントでキーボード高さを検出し、入力ボックスのbottomを設定
- 実装イメージ:
```js
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    const kbH = Math.max(0, window.innerHeight - window.visualViewport.height);
    const inputArea = document.getElementById('home-input-area');
    if (inputArea) inputArea.style.bottom = kbH + 'px';
  });
}
```
- キーボードが閉じたらkbH=0になり、bottom:0に戻る

8-B. シミュレーター検証:
- キーボード表示時に入力ボックスがキーボード直上に表示されること
- キーボードを閉じたら入力ボックスが画面下端に戻ること
- スクロール操作しても入力ボックスが動かないこと（Phase 7のscrollロックが効いていること）

8-C. デプロイ → ふとし実機確認

---

### NOTE: B4/B5（KVキャッシュ）実装時の必須確認事項（ふとし指示 2026-03-27）
> G6でB4/B5（profile/userIdのKVキャッシュ）を実装する際、以下を**必ず**実装すること

**profile KVキャッシュ（B4）のinvalidateタイミング:**
- `/api/account` のprofile更新エンドポイントでKV削除（`KV.delete('profile:${userId}')`）
- ゴール追加・更新・削除時にもKV削除
- invalidateなしで実装した場合、古いプロフィールでAIが回答し続けるバグになる

**userId KVキャッシュ（B5）:**
- token_idは不変なので永続キャッシュでOK。invalidate不要

**実装確認コマンド（canopyに追加すること）:**
```bash
# profile更新後にKVが削除されることを確認
# grep -rn "profile:${" src/ → invalidate呼び出しが存在すること
```

### G1: ホームヘッダー全アイコン拡大（ふとし承認済み 2026-03-27）
> 目的: ホームチャット画面のヘッダーアイコンをClaude.aiアバター相当（28px）に統一。山ロゴも48px→64pxに拡大
> リスク: 🟢低（サイズ変更のみ。レイアウト構造変更なし）
> 対象ファイル: docs/mockups/02a_home_prechat.html（mockup）、frontend/index.html（実装）
> C16フロー: Stage 0（mockup更新前後比較→ふとし承認）→ Stage A（localhost比較）→ デプロイ → Stage B

**変更仕様（Claude.ai承認済み）:**
| 対象 | 現状 | 変更後 |
|---|---|---|
| ハンバーガー幅 | 14px | 18px（SVGアイコンも比例拡大） |
| 時計・検索ボタン（`.tb-i`相当） | 20×20px | 28×28px |
| G/Tバッジ（`.tb-c`相当） | 20×20px / font 8px | 28×28px / font 11px |
| ＋ボタン（`.tb-ng`相当） | 20×20px | 28×28px |
| 山ロゴ（`#home-hero` SVG） | 48×48px | 64×64px |

**実装手順:**
1. mockup（02a_home_prechat.html）のCSS（`.tb-i` `.tb-c` `.tb-ng` `.tb-ham`）とSVGサイズを更新
2. C16 Stage 0: mockup更新前後の比較画像を生成 → `docs/mockups/screenshots/a1_home/mock_review/s0_diff.png` → ふとし承認待ち
3. ふとし承認後 → 実装（frontend/index.html）の該当インラインスタイルを更新（`home-chat-toolbar`内の全ボタン + `home-hero` SVG）
4. C16 Stage A → デプロイ → Stage B

### G2: チャットメッセージ間の横線削除（ふとし承認済み 2026-03-27）※G1とバッチデプロイ可
> 目的: チャット画面の各メッセージを区切る横線を削除してすっきりさせる
> リスク: 🟢低（CSS1行変更のみ）
> 対象ファイル: frontend/style.css（L432付近）

**変更仕様:**
```css
/* 変更前 */
.msg{border-bottom:1px solid var(--border);padding-bottom:12px}
/* 変更後 */
.msg{padding-bottom:12px}
```
**mockup更新:** 不要（チャット画面のmockupにborder-bottom指定なし）
**C16:** Stage A（localhost比較）→ G1と同一デプロイ → Stage B

---

### G6: ルーティング充実 + 速度改善バッチ（ふとし承認済み 2026-03-27）
> 目的: ルーティング精度向上 + 体感・実測両面の速度改善
> リスク: 🟡中（ルーティングロジック変更。コスト影響は軽微。プラン差別化には影響なし）
> 対象ファイル: frontend/js/chat.js、src/services/ai/routing.js、src/routes/chat.js
> コスト影響確認: D（Supabaseへのwrite増加）のみ軽微。それ以外はコスト中立

---

**【速度改善 — 最優先】**

**S1: 入力中プリルーティング（F採用 + 速度改善に直結）**
- ユーザーが入力中（debounce 800ms）にフロントエンドの`routeMessage()`を先行呼び出し
- 結果を`_preRoutedResult`にキャッシュ。送信時にキャッシュがあればAPI呼び出しをスキップ
- キャッシュ有効期間: 入力が止まってから3秒間（それ以降に送信したら再ルーティング）
- quickRouteでconfirm済みなら即キャッシュ（API呼び出し不要）
- **期待効果: ルーティング待ち時間（平均500〜800ms）をほぼゼロに**

**S2: AbortController連鎖（入力再開でルーティングをキャンセル）**
- 入力中にdebounceが走るたびに前のroutingリクエストをabort()
- 無駄なAPI呼び出しを削減し、最新入力に集中

**S3: Worker接続プリウォーム**
- アプリ起動時（DOMContentLoaded）に`/api/version`へ軽量GETを1回送信
- Cloudflare Workersのコールドスタート（最大300ms）を初回メッセージ前に解消
- **期待効果: 初回送信の体感速度が大幅改善**

**S4: ルーティングとストリーム接続を並列化**
- 現状: routeMessage()完了 → ストリーム接続開始（直列）
- 改善: routeMessage()呼び出しと同時にWorkerへのTCP接続を確立（`fetch` with `{ priority: 'high' }`）
- ルート確定後に即ストリーム開始。接続待ち時間をルーティング時間に隠蔽
- **期待効果: TTFTが200〜400ms短縮**

**S5: 同一・類似メッセージのルーティングキャッシュ**
- `sessionStorage`に直近20件のルーティング結果を`{text → route}`でキャッシュ
- 完全一致 or レーベンシュタイン距離3以内は同じrouteを返す
- セッション中の再質問（「もう少し詳しく」「他には？」等）を高速化

---

**【ルーティング精度改善】**

**C: 時間帯ヒューリスティック（quickRouteに追加）**
- 朝6〜10時: タスク・計画系キーワードがあればgptバイアス（claudeへの閾値を上げる）
- 夜21〜25時: 感情・振り返り系はclaudeバイアス
- 実装: `routeMessage()`でquickRoute前に時間帯フラグを立て、LLMプロンプトのヒントとして追加
- 精度限界を補うため「補助ヒント」止まり。LLMの最終判断を上書きしない

**D: ルーティングフィードバック学習**
- ユーザーが「別のAIで試す」ボタンを使った場合、`{message_hash, original_route, chosen_route}`をSupabaseの`routing_feedback`テーブルに保存
- 蓄積データはテスト配布後にバッチ分析してquickRouteパターン改善に活用
- **「別のAIで試す」ボタンはG5完了後のミッションで別途UI設計（Claude.ai側でmockup作成）**
- テーブル設計: `routing_feedback(id, user_id, message_hash TEXT, original_route TEXT, chosen_route TEXT, created_at)`

**E: 信頼度付きルーティング + 代替AI提案**
- `ROUTE_PROMPT`に`"confidence": 0-100`フィールドを追加
- confidence < 70 の場合: 回答後に「他のAIでも試しますか？」をサジェスト表示
  - 例: claudeで回答 + confidence=60 → 「ChatGPTでも聞いてみる →」ボタンを表示
- confidence ≥ 70: サジェスト非表示（現状と同じ）
- サジェストタップ時にfeedback学習（D）のデータも記録

**F: 入力途中のAI名プレビュー（S1と一体実装）**
- S1のプリルーティング結果が出たらヘッダーのG/Tバッジまたは入力欄横にAI名を小さくプレビュー
- 例: 入力中に「Claude」「ChatGPT」「Gemini」のいずれかがフワッと表示
- 送信後にそのまま「〇〇が考えています...」に切り替わる（G5と連携）

---

**実装順序（Code自律判断）:**
1. S3（プリウォーム）— 最小変更・最大効果
2. S1 + S2 + F（プリルーティング + プレビュー）— S1とFは一体実装
3. S4（並列化）
4. S5（キャッシュ）
5. C（時間帯ヒューリスティック）
6. E（信頼度 + サジェスト）
7. D（feedbackテーブル）— Eのサジェストと一体実装

---

**【コスト削減バッチ（A案）】**

**A1: quickRoute拡充（60→80%）**
- 純粋タスク系パターンをさらに追加（C22ルール厳守）。複合意図の可能性があるものは除外
- 追加候補: `^(翻訳|英語で|日本語で|要約|まとめ|箇条書き|リスト化|SNS.*投稿|ブログ.*書)` → gpt確定

**A2: フロントroutingの重複呼び出し削減**
- S1/S5（キャッシュ）と一体実装。キャッシュhit時はAPIスキップ

**A3: max_tokens削減（output平均 -20%）**
- 通常チャット: 2000→1500（Free/Pro）、4000→3000（Max/Ultra）
- systemプロンプトに「簡潔に、必要な情報のみ」を1行追加して自然な短縮を促す

**A4: feedback感情分析 Claude Sonnet → gpt-5-nano**
- misc.js L52 の `claude-sonnet-4-20250514` を `gpt-5-nano` に変更
- 1単語（positive/neutral/negative）判定のみなので品質影響なし

**A5: AI理解メモをdiff更新（入力60%削減）**
- memo生成時、前回のai_memoをベースに「変更点のみ」を追加するプロンプトに変更
- 初回生成は従来通り全情報送信

**A8: embedding生成を5ターンに1回**
- `generateAndStoreEmbedding`呼び出し前にターン番号をチェック（`turnCount % 5 === 0`）
- RAG検索は毎ターン実行。storageだけ間引く

**A11: AI理解メモ生成 Claude Sonnet → gpt-5-mini**
- services/memo.js L53 のモデルを `gpt-5-mini` に変更
- 削減額最大（¥2.2/月/ユーザー）。メモ生成は構造化タスクなのでSonnet不要

**A12: プロンプトキャッシュブロック改善**
- COMMON_RULESを独立したキャッシュブロックとして分離
- roleブロックも固定化してキャッシュ対象に。`cache_control: { type: 'ephemeral' }` 適用範囲拡大

**A13: chat_messages取得にlimit=20追加**
- history.jsの `supabaseQuery` でlimit=20を追加（現状: 全件取得）
- buildCompressedMessagesのwindowSize=10なので20件で十分

**A14: gpt-simpleの出力トークン削減**
- max_tokens: 150 → 80（gpt-simple用途は短文のみ）
- gpt.js L25の `max_completion_tokens: 150` を80に変更

**A15: feedback感情分析の入力トークン削減**
- misc.jsでrawChat全体を送信→gpt-nanoで要約してから感情判定の2段処理に変更
- input: 200token → 50token程度

**A20: usage_trackingをKVバッファ化（5分間）**
- chat.js内のrecordTurnUsage: 毎ターンのSupabase SELECT+INSERTをKVキャッシュ経由に変更
- 5分間はKVから使用量を読み、Stripe送信はバッチ化

---

**【速度改善バッチ（B案、品質影響なし）】**
> 実装順序: B1→B4/B5→B6/B19（これだけで体感-1.3秒）→B3（G6 S1と統合）→B2→残り

**B1: Workerプリウォーム（G6 S3と同一）**
- DOMContentLoaded時に `/api/version` へGET（期待: -300ms コールドスタート解消）

**B4: profileのKVキャッシュ（5分）**
- `buildServerSystemPrompt`内のSupabase SELECT結果をKVに5分間キャッシュ
- KVキー: `profile:${userId}`。profile更新時にinvalidate

**B5: getUserIdFromTokenのKVキャッシュ（永続）**
- `token_id → user_id` 変換結果をKV永続キャッシュ（token_idは不変）
- KVキー: `uid:${tokenId}`。期待: -100〜200ms

**B6: 会話要約をwaitUntilで非同期化**
- `generateConversationSummary`をメインのresponse返却後に実行
- `ctx.waitUntil(generateConversationSummary(...))` に変更。期待: -500〜1000ms

**B10: gpt-simpleをstreaming=trueに変更**
- chat.js / gpt.js のgpt-simple呼び出しを `stream: true` に変更
- 最初のtokenを即表示（G5タイピング演出と連動）

**B11: フロント側でメッセージ圧縮して送信**
- `homeClaudeStream`の送信前に`buildCompressedMessages`相当処理をフロントで実行
- Workerへの送信バイト数を削減。期待: -100〜200ms

**B13: ストリームchunkを256byte単位でバッファ処理**
- TextDecoderの読み取りを256byte単位にまとめてDOM更新頻度を削減

**B17: chat_messages取得をlimit=20&order=desc**
- history.js L32のクエリに `&limit=20&order=created_at.desc` を追加（A13と一体実装）

**B19: streak更新をwaitUntilで非同期化**
- streak.js のDB UPDATE をメインフローから切り離し。期待: -50〜100ms

**B20: routing専用軽量エンドポイント `/api/route`**
- gpt-simpleエンドポイントのロジックをstrip。routing判定のみの軽量版を作成

**期待累積速度改善: 最大約-2.9秒（体感上位4施策だけで-1.3秒）**

---

**注意事項:**
- S1プリルーティング用のprivacy.html追記済み（2026-03-27 L137）。G6デプロイ時に `npm run deploy:frontend` で含めること
- DのSupabaseテーブル追加はマイグレーション必要。`supabase migration`で管理
- A3のmax_tokens削減はコスト削減効果が最大（¥11/月/ユーザー）。品質確認を優先してStage Bで動作確認後にmax_tokensを段階的に下げること
- B4/B5のKVキャッシュ追加後は、profile更新・ゴール変更時のinvalidateロジックを必ず実装すること（古いキャッシュが残ると古いプロフィールで回答する）

### G5: 待機中アニメーション改善 ※2回「完了」報告して2回とも未動作。A7違反。再実装必須
> 目的: AI応答待ちの体感時間を短縮。フェーズ別テキスト表示 + タイピング演出
> リスク: 🟢低（フロントエンドのUI表現のみ。ルーティングロジック変更なし）
> 対象ファイル: frontend/js/chat.js、frontend/js/api.js、frontend/style.css
> C16: mockup変更なし → Stage A（localhost確認）→ デプロイ → Stage B

**⚠ 検証義務（A7強化）:**
- デプロイ前に、iOSシミュレーターで実際にメッセージを送信し、以下を目視確認すること:
  1. ルーティング中（>1秒経過時）に「どのAIが適任か相談中...」が表示される
  2. AI応答待ち中に「ChatGPT / Claude / Gemini が考えています...」が表示される
  3. ストリーム開始後にテキスト表示に切り替わる
- grepで「コードが存在する」だけでは完了にしてはならない。「画面に表示される」ことを確認する
- シミュレーターでの確認スクリーンショットをdocs/mockups/screenshots/に保存する

**変更仕様（Claude.ai承認済み）:**

【A. フェーズ別テキスト表示】
| フェーズ | 表示テキスト | 条件 |
|---|---|---|
| ルーティング中（>1秒経過後のみ） | `どのAIが適任か相談中...` | callRoutingAPI呼び出し中かつ1秒超過 |
| ルーティング中（quickRoute確定） | 表示スキップ → 即AI名表示 | quickRouteでroute確定した場合 |
| AI応答待ち | `ChatGPT / Claude / Gemini が考えています...` | ストリーム開始前 |
| ストリーム開始後 | テキスト表示に切り替え | 最初のtokenが届いたら即消す |

【B. タイピング演出】
- ストリーム開始前（最初のtoken未着): `・・・` を表示（グレー、点滅アニメなし）
- 最初のtoken到着: `・・・` を消し、`_` カーソル点滅に切り替え（@keyframes blinkで500ms間隔）
- ストリーム中: テキストをなるべく一定速度で表示（token到着が速い場合は意図的に間引いて均一化。目標: 1文字あたり約30〜50ms）
- ストリーム完了: カーソル消去

【C. quickRoute確定時のAI名即表示（提案2採用）】
- quickRouteで route確定した場合、callRoutingAPI呼び出し前に即座にAI名バッジを表示
- 「判断中」テキストはスキップ

### G4: ホーム画面レイアウト改善（ふとし承認済み 2026-03-27）
> 目的: プリセットカスタマイズ機能追加 + キーボード表示時のレイアウト最適化
> リスク: 🟡中（状態管理・JS変更あり）
> 対象ファイル: docs/mockups/02a_home_prechat.html（mockup）、frontend/index.html・js/chat.js・style.css（実装）
> C16フロー: Stage 0 → Stage A → デプロイ → Stage B

**変更仕様（Claude.ai承認済み）:**

【0. 入力ボックスのページ別表示制御（BUG修正）】
- `#home-input-area`はbody直下のposition:fixedのため、全ページで常に表示されている（バグ）
- `showPage()`内で、`pg === 'home'`のときだけ`#home-input-area`を`display:block`、それ以外では`display:none`にする
- 初期表示（DOMContentLoaded時）もhome以外なら非表示にすること

【A. プリセット✏アイコン追加】
- `#home-presets` の右上に小さいペンシルアイコン（SVG, 14px, opacity:0.5）を追加
- ラベルなし。タップで編集モーダルを開く
- 編集モーダル: 各プリセットをインライン編集・削除（×）・追加（＋）・保存
- 保存先: ログイン済み → Supabase `user_settings`（既存テーブルのJSONフィールド）、未ログイン → localStorage
- 上限: 6件

【B. 3状態レイアウト】

**【重要】入力ボックスの配置方針（Claude.ai確認済み 2026-03-28）:**
- 入力ボックス（`#home-input-area`）は `position:fixed;bottom:0;left:0;right:0;z-index:200` のまま維持（オーバーレイ）
- タスクボックス（`#home-task-box`）は入力ボックスの下にスクロールコンテンツとして存在し、入力ボックスに隠れないよう `padding-bottom` を設定する
- DOMの移動は不要。現在の `</body>` 直前の配置で正しい
- キーボード表示時の位置固定（BUG-01b）は今回スコープ外

**① デフォルト（キーボードなし）:**
- 入力ボックス: 画面下端にオーバーレイ固定
- タスクボックス: 入力ボックスの高さ分 `padding-bottom` を設定して隠れないようにする
- 表示: hero → presets → コンテンツ領域（タスクボックス含む）→ 入力ボックス（オーバーレイ）

**② 入力中・会話前（input focusイベント）:**
- ヒーロー・プリセット: 表示維持
- タスクボックス: **非表示**（`display:none`）
- 入力ボックス: 固定位置のまま

**③ 会話中（メッセージ送信後）:**
- ヒーロー・プリセット・タスクボックス: 非表示
- 過去メッセージ: スクロール領域（`#home-chat-wrap`）。スクロール最下部 = 最新メッセージ
- 入力ボックス: 固定位置のまま

**状態遷移:**
- デフォルト → ② : input focus時
- ② → デフォルト : input blur（かつ未送信）
- ② → ③ : メッセージ送信
- ③ → デフォルト : 新規チャット（`newHomeChat()`）

### G3: ルーティングバグ修正 ✅完了（2026-03-28）
> 目的: 「今日やること整理」がClaude Opusにルーティングされた原因を特定・修正

**原因特定:**
フロント側`routeMessage()`にquickRouteパターンマッチが存在しなかった。サーバー側`routing.js`のquickRoute()には`^(今日やること|タスク|...)` → `gpt`パターンがあるが、フロント側はAPI判定のみに依存していた。routing API（gpt-simple）が`claude`を誤判定した場合、フロントがそのまま`/api/chat/stream`にClaude指定で送信 → サーバー側で再ルーティングされてもフロントのUI表示は`Claude`のまま。

**修正:**
フロント側`routeMessage()`にサーバー側quickRoute()と同一のパターンマッチを追加（chat.js L1190-1196）。
quickRouteで確定するケースはAPI呼び出しをスキップするため、ルーティング速度も改善。

**検証:** quickRoute対象パターン（「今日やること整理」「タスク整理」「翻訳して」等）はフロント側で即時gptに確定。API呼び出し不要

---

### G6 コスト削減+速度改善バッチ v3.11.25 ✅完了（2026-03-28）
> v3.11.25でデプロイ済み。10施策一括実装

**実装済み施策:**
| ID | 施策 | 変更ファイル |
|---|---|---|
| S4 | ルーティングとストリーム接続並列化（OPTIONS preflight） | frontend/js/chat.js |
| B5 | getUserIdFromToken KV永続キャッシュ（uid:${tokenId}） | src/middleware/auth.js |
| A4 | sentiment分析: claude-sonnet → gpt-5-nano | src/routes/misc.js |
| A11 | memo生成: claude-sonnet → gpt-5-mini | src/services/memo.js |
| A14 | gpt-simple max_tokens: 150→80 | src/services/ai/gpt.js |
| A8 | embedding生成: 毎ターン→5ターンに1回（KVカウンター） | src/routes/chat.js |
| A13/B17 | chat_messages取得: limit 50→20 | src/services/memo.js |
| A5 | memo diff更新（既存メモベースで変更点のみ更新） | src/services/memo.js |
| A15 | sentiment入力削減（summary優先、rawChat先頭200文字） | src/routes/misc.js |
| B13 | ストリームchunk 256byteバッファ処理 | frontend/js/api.js |

**未実装（理由付き）:**
- A3: max_tokens削減 → 「Stage Bで動作確認後に段階的に」の指示あり。次フェーズ
- A20: KVバッファ → 変更範囲大。次フェーズ
- B10: gpt-simple streaming → 効果限定（80トークン短文）。スキップ
- B20: /api/route軽量エンドポイント → 変更範囲大。次フェーズ
- G6-E: 信頼度+代替AI提案 → Claude.ai側mockup待ち
- G6-D: フィードバック学習テーブル → Eと一体。mockup待ち

**判断根拠:** 効果/リスク比の高い施策を優先。A3はユーザー体験への影響を確認してから段階適用。E/DはUI設計依存のためブロック中

---

### スクショフォルダ構造整理 ✅完了（2026-03-25）
> 目的: 既存のスクショ画像を新フォルダ構造に移動・リネーム
> リスク: 🟢低（ファイル移動のみ）

**結果:** 43ファイルを9画面×{mock_review, impl_compare}に配置完了
**スクリプト更新:** c16_stage_a.js, c16_stage_0.js の出力パスを新構造に更新済み

**構造:** `docs/mockups/screenshots/{画面ID}/{mock_review,impl_compare}/s0_*.png, sa_*.png`

---

### Stage 0 + Stage A: ふとし承認済み ✅（2026-03-27）
> s0_（mockup確認）+ sa_（実装比較）全8画面承認完了

---

### mockup文字化け修正+compare画像再生成+リネーム ✅完了（2026-03-25）
> 目的: 6画面のmockup HTML文字化けを修正し、全8画面のcompare画像を再生成する。ファイル命名規則を新ルールに統一
> リスク: 🟢低（HTMLのcharset修正+画像再生成のみ）

**原因:** 6画面のmockup HTMLはフラグメント（DOCTYPE/charset宣言なし）。Playwrightが直接読み込むとcharset未指定で文字化け
**修正:** `scripts/c16_stage_a.js` を更新。フラグメントHTMLは `_viewer.html?f=ファイル名` 経由で読み込み（_viewer.htmlにcharset=UTF-8あり）。mockup原本は変更なし
**結果:** 全8画面の `sa_{画面ID}_compare.png` を文字化けなしで再生成。旧命名ファイル削除済み

**ふとし確認待ち:** Finderで `docs/mockups/screenshots/` を開いて `sa_*_compare.png` 8枚を確認 → 承認後デプロイ

---

### C16 Stage A一括検証 ✅Stage A PASS（2026-03-25）
> 目的: A2-A5/B1-B5の全8画面に対しC16 Stage A（localhost比較）を実施。A1は検証済みのためスキップ
> リスク: 🟡中（差分発見時は修正→再検証ループ）
> 参照: development_rules.md C16（2段階検証 Stage A/B）

**検証方法:**
1. mockup配信: `python3 -m http.server 8765` (docs/mockups/)
2. 実装配信: `npx vite preview --port 4173` (frontend-dist/)
3. Playwrightで全8画面のスクショを自動撮影（scripts/c16_stage_a.js）
4. mockup/実装の横並びcompare画像を自動生成
5. 全38構造要素のコードgrep確認

**10ファクター検証結果:**

| 画面 | 構造差分 | データ依存差異 | 判定 |
|---|---|---|---|
| A2 ビジョン | 0件 | AI分析データ空（未ログイン） | PASS |
| A3 ゴール連携 | 0件 | ゴール未設定→空表示 | PASS |
| A4 プロフィール | 0件 | プロフィールデータ空 | PASS |
| A5 プラン | 0件 | プランカード・dots表示確認 | PASS |
| B1 GoalHubタスク | 0件 | GoalHub=ゴール必須→ホーム表示 | PASS |
| B2 GoalHub設定 | 0件 | 同上 | PASS |
| B3 解析 | 0件 | ストリーク=0、3AI section存在 | PASS |
| B4+B5 設定 | 0件 | referral非表示(free)、promo card存在 | PASS |

**構造要素検証:** 38/38 FOUND（A3互換性バー・A5 dotインジケーター・B1-B5全新規要素含む）
**compare画像:** `docs/mockups/screenshots/` に全8画面保存済み
  - a2_vision_compare.png, a3_goal_link_compare.png, a4_profile_compare.png
  - a5_plan_compare.png, b1_hub_tasks_compare.png, b2_hub_settings_compare.png
  - b3_analytics_compare.png, b4b5_fb_settings_compare.png

**検証範囲:** ソースレベル構造確認 + localhost視覚比較（Stage A）。Stage B（デプロイ後本番URL）は未実施

**ふとし確認待ち:** Finderで `docs/mockups/screenshots/` を開いて全compare画像を確認 → 承認後デプロイ

---

### A2 ビジョン mockup更新 ✅完了（2026-03-24）
> 目的: ビジョン画面を実装準拠にmockup HTMLを更新する（実装変更なし）
> リスク: 🟢低（mockup更新のみ）
> 参照: docs/design_reverse_audit.md #06b、docs/mockups/06b_vision.html

**mockup更新内容（実装を正とする）:**
1. 「キャッチコピー」セクション＋再生成ボタンを追加
2. MY CHARACTERの位置を先頭→下部に移動
3. MY CHARACTERの構造を金枠引用文→4行テーブル（性格タイプ/行動スタイル/コアバリュー/成長エッジ）に変更

**C16検証:** mockup更新後、実装と全10ファクターで差分0件を確認

---

### A4 プロフィール mockup準拠修正 ✅完了（2026-03-24 mockup更新のみ、実装変更なし）
> 目的: プロフィール画面をmockup準拠に修正。mockupにある機能で実装にないものは追加。mockupにない機能でふとしが残すと判断したものはmockup更新
> リスク: 🟡中（UI変更+mockup更新）
> 参照: docs/design_reverse_audit.md #06d、docs/mockups/06d_profile.html

**実装修正（mockup準拠）:**
1. 強み・弱みの表示をテキストリスト→チップ選択に変更（mockupの表示形式に合わせる）

**mockup更新（実装を正として追加）:**
1. アバター写真アップロード（カメラアイコン＋ファイル入力）
2. 「タップして変更」ラベル
3. 「なんて呼ばれたい？」フィールド
4. 「使える時間・条件」入力
5. MBTI完全テスト（10問/60問モード）
6. エネルギータグ（もらう/奪われる）
7. 人間関係・サポートネットワーク4質問
8. AI提案チップ＋承認ボタンをmockupから削除（実装にない）

**mockupにある機能で実装に追加:**
- mockup上のAI提案チップ＋「提案を承認/編集する」は削除（上記#8）

**テスト配布後FB:** 表示ビュー vs 常時編集フォームの判断

**C16検証:** 修正後、全10ファクターで差分0件を確認

---

### A5 プラン 横カルーセル化 ✅完了（2026-03-24 v3.11.10）
> 目的: プラン選択画面をmockup準拠の横カルーセルに変更。Ultraプランをmockupに追加
> リスク: 🟡中（レイアウト大幅変更）
> 参照: docs/design_reverse_audit.md #08d、docs/mockups/08d_plan.html

**実装変更:**
1. 縦スタック→横カルーセルに変更（mockup準拠）
2. ドットインジケーター追加

**mockup更新:**
1. Ultraプランカード追加（5枚目。v6.3契約セクション準拠）
2. 月額/年間トグルをmockupに追加
3. 利用額バーをmockupに追加
4. ダウングレードリンクをmockupに追加
5. フェアユース脚注をmockupに追加
6. プロモコード入力セクションをmockupに追加

**C16検証:** 修正後、全10ファクターで差分0件を確認

---

### A3 ゴール連携 互換性バー実装 ✅完了（2026-03-24）
> 目的: ゴール連携画面をmockup準拠に修正。互換性バーを実装し、AI応答からスコアを抽出するプロンプト設計を追加
> リスク: 🔴高（プロンプト設計+AIパース+UI変更）
> 参照: docs/design_reverse_audit.md #06c、docs/mockups/06c_goal_link.html

**実装変更:**
1. 現在の3セクション表示（⚠確認項目/💡アイデア/📊FB）→ 互換性バー（%表示）+ AIアドバイスに変更
2. AIへのプロンプトに互換性スコア（0-100）を返すよう指示を追加
3. AI応答パースロジック: compatibilityフィールドの抽出→バー表示
4. パース失敗時のフォールバック: 従来の3セクション表示を維持

**注意:** プロンプト設計はコスト影響なし（既存のゴール連携API呼び出し内で応答形式を指定するだけ）。ただしAI応答の安定性テストが必要

**C16検証:** 修正後、全10ファクターで差分0件を確認

---

### B4 NPS 0-10スコアグリッド実装 ✅完了（2026-03-24）
> 目的: フィードバック画面にNPS 0-10スコアグリッドを追加（mockup準拠）
> リスク: 🟢低（UI追加のみ）
> 参照: docs/design_reverse_audit.md #08b、docs/mockups/08b_feedback.html

**実装変更:**
1. フィードバックフロー内にNPS 0-10の数字ボタングリッドを追加
2. スコア選択後に次のステップに進む
3. mockupのクイックリプライラベルに合わせる（改善してほしい**点がある** / バグを**見つけた**）
4. 入力欄を`<textarea>`→`<input type="text">`に変更（mockup準拠）

**C16検証:** 修正後、差分0件を確認

---

### B1 AI提案カード実装（ふとし承認済み 2026-03-24 実装その21）
> 目的: GoalHubタスク画面にAI提案カードを追加（mockup準拠）
> リスク: 🟡中（AI応答のUI表示追加）
> 参照: docs/design_reverse_audit.md #05b、docs/mockups/05b_goalhub_tasks.html

**実装変更:** mockupの05b_goalhub_tasks.htmlに記載されたAI提案カードのUI・動作を実装

**C16検証:** 修正後、差分0件を確認

---

### B2 GoalHub設定 通知・エクスポート実装（ふとし承認済み 2026-03-24 実装その21）
> 目的: GoalHub設定画面に通知セクション・エクスポートセクションを追加（mockup準拠）
> リスク: 🟡中
> 参照: docs/design_reverse_audit.md #05e、docs/mockups/05e_goalhub_settings.html

**実装変更:** mockupの05e_goalhub_settings.htmlに記載された通知・エクスポートUIを実装

**C16検証:** 修正後、差分0件を確認

---

### B3 三人寄れば文殊の知恵 実装（ふとし承認済み 2026-03-24 実装その21）
> 目的: 解析ページに「三人寄れば文殊の知恵」機能を追加（mockup準拠）
> リスク: 🟡中（複数AI呼び出し）
> 参照: docs/design_reverse_audit.md #08a、docs/mockups/08a_analysis.html

**実装変更:** mockupの08a_analysis.htmlに記載された3AI比較分析UIを実装
**注意:** コスト影響あり（3モデル同時呼び出し）。提案ログに記載→承認済み（実装その21）

**C16検証:** 修正後、差分0件を確認

---

### B5 設定画面 友達紹介・プロモコード実装（ふとし承認済み 2026-03-24 実装その21）※B4とバッチデプロイ可（両方🟢）
> 目的: 設定画面に友達紹介セクション・プロモコード行を追加（mockup準拠）
> リスク: 🟢低（UI追加のみ）
> 参照: docs/design_reverse_audit.md #08c、docs/mockups/08c_settings.html

**実装変更:** mockupの08c_settings.htmlに記載された友達紹介・プロモコードUIを実装

**C16検証:** 修正後、差分0件を確認

---

## 完了済み（実装その21でクローズ）
- A1 mockupレイアウト変更+全10ファクター再検証 ✅（v3.11.10）ふとし承認済み
- C16自己検証ループ実装+A1再検証 ✅（v3.11.10）
- 逆方向デザイン照合 ✅（docs/design_reverse_audit.md）
- ホームレイアウト順序修正 ✅（A1に統合）
- 開発インフラ改善バッチ ✅（v3.11.5）

---

## 提案ログ（2026-03-30 第5回自律調査）

**前回(#11-#22)消化状況:** 全件実装済み。G5修正、G1/G2確認済み（既に実装されていた）

**キューが空になったため、spec/reference/amendmentを調査して未実装項目を検出:**

| # | 項目 | リスク | 根拠 | 備考 |
|---|------|--------|------|------|
| P1 | initTabSwipe未接続 | 🟢低 | reference #5。関数はui.jsに存在するが呼び出し元なし（デッドコード） | 1行追加で接続可能 |
| P2 | Analytics月別チャート実データ | 🟡中 | spec G08A。CHART_DATA=[]のまま、APIなし | API設計+バックエンド必要 |
| P3 | タスク溜まり警告 | 🟢低 | spec G08A-03。未完了タスク多い月にオレンジ警告バー | フロントのみ |
| P4 | AI理解メモ 4カテゴリアコーディオン | 🟡中 | amendment #4。現在は単一ブロック表示 | UI変更→mockup必要 |
| P5 | プロフィール理解度スクロール自動閉じ | 🟢低 | reference #15。scrollで閉じるリスナー未実装 | フロントのみ |
| — | **保留（指示待ち）** | | | |
| A3 | max_tokens段階削減 | 保留 | Stage B動作確認後に段階適用の指示あり |
| B20 | /api/route軽量EP | 保留 | S1プリルーティングで十分カバー |
| BUG-01b | iOSキーボード固定 | Step 1実装済み・検証待ち | 下記「調査結果」参照 |

---

## BUG-01b 調査結果（2026-03-29 Code記載・確認待ち）

### Step 1: キーボード表示時のページ押し上げ防止

**原因分析:**
- iOS Safari（全WebKitブラウザ共通）はキーボード表示時にビューポートを縮めない
- 代わりにページ全体を上にスクロール（push-up）して、フォーカスされた要素を可視領域に持ってくる
- `window.innerHeight`はキーボード表示後も変わらない
- `visualViewport.height`のみがキーボード分だけ縮小する
- CSS `100dvh`もキーボード表示前の値のまま変わらない

**修正方針:**
`visualViewport.resize`イベントで全コンテナ階層（`html`, `body`, `#app`, `.page.active`, `#pg-home`）の高さを`visualViewport.height`に制約する。これによりページコンテンツが可視領域に収まり、スクロール余地がなくなるため押し上げが発生しない。

**実装済みコード（chat.js L1825-1876）:**
```js
// visualViewport.resize → kbH検出
// kbH > 50: 全コンテナheight = vv.height + 'px', window.scrollTo(0,0)
// kbH ≤ 50: 全コンテナheight = '' (CSS値に復帰)
// inputArea.bottom = kbH - scrollOffset
```

**不採用にした既存アプローチ（session_progress.mdの「過去の失敗アプローチ」に追加なし）:**
- GPUコンポジットレイヤー化（translate3d/will-change）→ 以前と同じく効果なしのため削除
- `vv.offsetTop`によるスクロール補正のみ → 根本原因（ページ高さ超過）を解決しない

**競合確認:**
- app.js `initViewportHandler` — home-input-area以外のみ処理。競合なし
- ui.js `showPage()` — ページ切替時にblurが発生しキーボードは閉じる。競合なし
- style.css — inline style（JS設定）はCSS `height:100dvh` を上書き。問題なし

**検証状況:**
- iOSシミュレーター(iPhone 17 Pro/iOS 26.4)を起動、テストページを配信しDOM表示を確認
- シミュレーターへのプログラマティックなタッチ注入が困難（Simulator appが標準macOS window APIを使わない、idb_companion未インストール）
- **ソフトウェアキーボードの表示を自動化できず、実機での検証が必要**

**次のステップ:**
1. Claude.aiまたはふとしがStep 1の方針を確認
2. 確認後、デプロイしてふとし実機でStep 1（押し上げ防止）を検証
3. Step 1通過後、Step 2（スクロール時の入力ボックス固定）の検証に進む

---

## 完了済みミッション詳細・照合結果・提案ログ過去分

→ **instructions/results/session_history.md** に移動済み
