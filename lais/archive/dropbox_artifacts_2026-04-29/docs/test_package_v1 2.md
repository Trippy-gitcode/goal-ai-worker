# GOAL AI — 総合テストパッケージ v1
> 作成: 2026-04-03 Claude.ai
> 目的: ふとしが実機を触る前に全バグを潰す。テスト配布25名に耐える品質を保証
> 構成: 8つのテストスイートで約420項目
> 実行: 全てPlaywright自動テスト。手動確認が必要な項目は明記

---

## テストスイート一覧

| ID | スイート名 | 項目数 | 対象 | specファイル |
|---|---|---|---|---|
| TEST-01a | ユーザー操作テスト | ~146 | docs/ux_user_test_v1.md | test01a-user-ops.spec.ts |
| TEST-01b | 実装品質チェックリスト | ~110 | docs/ux_checklist_v1.md | test01b-checklist.spec.ts |
| TEST-03 | レイアウト・衝突・表示テスト | ~50 | 本ファイル セクション3 | test03-layout.spec.ts |
| TEST-04 | データフロー・永続性テスト | ~30 | 本ファイル セクション4 | test04-data.spec.ts |
| TEST-05 | 認証・セキュリティテスト | ~20 | 本ファイル セクション5 | test05-auth.spec.ts |
| TEST-06 | エラーハンドリングテスト | ~25 | 本ファイル セクション6 | test06-errors.spec.ts |
| TEST-07 | 課金・プラン制限テスト | ~15 | 本ファイル セクション7 | test07-billing.spec.ts |
| TEST-08 | エッジケーステスト | ~20 | 本ファイル セクション8 | test08-edge.spec.ts |

**全specファイル格納先:** tests/e2e/specs/
**スクショ格納先:** tests/e2e/screenshots/{テストID}/
**テスト環境:** FRONTEND_BASE=http://localhost:4173（本番URL禁止）
**レポート:** --reporter=html で tests/e2e/report/ に出力

---

## 実行前の必須セットアップ

```bash
cd /Users/futoshi/Desktop/goal-ai-worker
npm install -D playwright @playwright/test
npx playwright install chromium
npx vite preview --port 4173 &
```

---

## 3. レイアウト・衝突・表示テスト（TEST-03）

> ふとし実機で発見された問題カテゴリ: UIがアイコンにかぶる、デザインが壊れる

### 3-1. ボトムタブとコンテンツの衝突
- [ ] TODAY画面: コンテンツ最下部がボトムタブに隠れない（padding-bottom十分）
- [ ] TALK画面: 入力ボックスがボトムタブに重ならない
- [ ] TALK画面: 入力ボックスとチャットメッセージが重ならない
- [ ] GOALS画面: ゴール一覧の最後の項目がボトムタブに隠れない
- [ ] ME画面: 最下部セクションがボトムタブに隠れない
- [ ] 全画面: ボトムタブのz-indexがコンテンツより上

### 3-2. ヘッダーとコンテンツの衝突
- [ ] TODAY画面: 挨拶ヘッダーとタスクリストが重ならない
- [ ] TALK画面: ツールバーとチャットメッセージが重ならない
- [ ] GOALS画面: ヘッダーとゴールリストが重ならない
- [ ] ME画面: プロフィールヘッダーとコンテンツが重ならない

### 3-3. FABボタンの位置
- [ ] カレンダーFAB: ボトムタブの上に配置（かぶらない）
- [ ] カレンダーFAB: コンテンツに隠れない（z-index正しい）
- [ ] +ボタン（タスク追加）: タップ可能な位置に表示（他要素に遮られない）

### 3-4. ハーフモーダル
- [ ] ハーフモーダル表示時: 背景がオーバーレイで暗くなる
- [ ] ハーフモーダル: 下からアニメーションで表示される
- [ ] ハーフモーダル: 他のUI要素の上に表示される（z-index）
- [ ] ハーフモーダル: 入力欄がキーボードに隠れない
- [ ] ハーフモーダル閉じた後: 元の画面に正常に戻る

### 3-5. サイドバー
- [ ] サイドバー: 画面幅の80%以下で表示
- [ ] サイドバー: z-indexが全コンテンツより上
- [ ] サイドバーオーバーレイ: 背景タップで閉じる
- [ ] サイドバー: 開閉時にコンテンツが崩れない

### 3-6. テキスト切れ・はみ出し
- [ ] タスク名が長い場合（30文字以上）: ellipsisで切れる or 折り返す（はみ出さない）
- [ ] ゴール名が長い場合: 同上
- [ ] チャットメッセージが長い場合: 画面幅内で折り返す
- [ ] AI名バッジ: テキストがはみ出さない
- [ ] ボトムタブのラベル: 切れない

### 3-7. Safe Area対応（iPhone）
- [ ] ボトムタブ: iPhoneのホームインジケーターに重ならない（padding-bottom: env(safe-area-inset-bottom)）
- [ ] ヘッダー: ステータスバーに重ならない（padding-top: env(safe-area-inset-top)）
- [ ] サイドバー: ノッチに重ならない

### 3-8. スクロール
- [ ] TODAY画面: タスク10件以上でスクロール可能
- [ ] TALK画面: チャット20件以上でスクロール可能
- [ ] GOALS画面: ゴール10件以上でスクロール可能
- [ ] ME画面: コンテンツが画面に収まらない場合スクロール可能
- [ ] スクロール時: ボトムタブが固定されたまま（スクロールに巻き込まれない）
- [ ] スクロール時: ヘッダーが固定されたまま（各画面のヘッダー）

### 3-9. ダークモード/テーマ
- [ ] ライトモード: 全テキストが読める（背景と十分なコントラスト）
- [ ] ダークモード: 全テキストが読める
- [ ] テーマ切替後: 全画面に即時反映
- [ ] テーマ切替後: リロードしても維持

### 3-10. アイコン・SVG
- [ ] 全画面: 絵文字テキストが0個（SVGのみ）
- [ ] 賢者アイコン（GPT/Claude/Gemini）: 正しいSVGが表示
- [ ] ボトムタブアイコン: 全4つ表示される
- [ ] ハンバーガーアイコン: 表示される＋タップ領域が十分

---

## 4. データフロー・永続性テスト（TEST-04）

> ふとし実機で発見された問題カテゴリ: タスクが追加されない、リストに表示されない

### 4-1. タスクCRUD
- [ ] +ボタン→ハーフモーダル→タスク名入力→送信→タスクがTODAYリストに即表示
- [ ] タスク作成後: Supabase/localStorageにデータが存在する
- [ ] タスク作成後: リロード→タスクが残っている
- [ ] タスク完了チェック→取り消し線→リロード後も完了状態
- [ ] タスク削除→リストから消える→リロード後も消えたまま
- [ ] タスクドラッグ並べ替え→リロード後も順序維持
- [ ] タスク10件作成→全て正しく表示→全て正しく操作可能

### 4-2. チャットデータ
- [ ] メッセージ送信→AI応答→両方がチャット履歴に保存
- [ ] リロード後: 直前の会話が表示される
- [ ] 新しいチャット開始→前の会話と分離される
- [ ] チャット履歴パネル→過去チャットが一覧表示
- [ ] 過去チャットタップ→正しい会話内容が表示

### 4-3. 日記データ
- [ ] 日記入力→debounce 1秒後に自動保存される
- [ ] リロード後: 日記内容が残っている
- [ ] 正午をまたいだ場合: 前日の日記が確定保存→新しい空欄
- [ ] カレンダーから過去日付選択→その日の日記が閲覧可能
- [ ] 日記タイトル: 内容10文字以上で自動生成

### 4-4. ゴールデータ
- [ ] ゴール作成→GOALSリストに即表示
- [ ] ゴール作成: GOALS画面内で完結（他画面に遷移しない）
- [ ] ゴール進捗更新→%バーが変化
- [ ] ゴール削除→リストから消える→リロード後も消えたまま
- [ ] ゴールタップ→ゴールハブ5タブに遷移→戻れる

### 4-5. プロフィールデータ
- [ ] プロフィール編集→保存→リロード後反映
- [ ] ニックネーム変更→AI応答でニックネーム使用
- [ ] 強み/弱みチップ選択→保存→リロード後反映

### 4-6. AI理解メモ
- [ ] AI理解メモが表示される（空でないこと）
- [ ] 「これは違う」ボタン→フィードバック送信→メモ更新

### 4-7. 設定データ
- [ ] テーマ変更→リロード後維持
- [ ] 文字サイズ変更→全画面反映→リロード後維持
- [ ] コーチングモード変更→リロード後維持→AI応答トーン変化

### 4-8. TALK→TODAY連携
- [ ] TALKで「タスク作りたい」→AIがヒアリング→タスク作成
- [ ] 作成されたタスクがTODAYリストに表示
- [ ] [TASK_UPDATE]タグがチャット画面に表示されない（ストリップ済み）
- [ ] TALKで「会議キャンセル」→AIがタスク変更提案→承認→TODAY更新

---

## 5. 認証・セキュリティテスト（TEST-05）

### 5-1. auto-register
- [ ] 初回アクセス→自動でユーザー登録→goal_auth_tokenクッキー設定
- [ ] トークンあり→ログイン状態で全機能使える
- [ ] トークン削除→再アクセスで新規auto-register
- [ ] トークン改ざん（ランダム文字列）→401 or 新規auto-register（クラッシュしない）

### 5-2. API認証
- [ ] /api/chat/stream: トークンなし→401
- [ ] /api/tasks: トークンなし→401
- [ ] /api/goals: トークンなし→401
- [ ] /api/profile: トークンなし→401
- [ ] /api/account: トークンなし→401
- [ ] /api/memo: トークンなし→401

### 5-3. データ分離
- [ ] ユーザーA作成のタスク: ユーザーBからは見えない
- [ ] ユーザーA作成のゴール: ユーザーBからは見えない
- [ ] ユーザーA作成のチャット: ユーザーBからは見えない
- [ ] ユーザーA作成の日記: ユーザーBからは見えない

### 5-4. 入力サニタイズ
- [ ] HTMLタグ入力（<script>alert(1)</script>）→エスケープされてテキスト表示
- [ ] 超長文入力（10,000文字）→エラーにならない or 制限メッセージ表示
- [ ] 空文字送信→送信されない or エラーメッセージ
- [ ] 特殊文字（🎉📱\n\t"'`）→正常に保存・表示

---

## 6. エラーハンドリングテスト（TEST-06）

### 6-1. ネットワークエラー
- [ ] オフライン時にメッセージ送信→エラートースト表示（UIフリーズしない）
- [ ] オフライン時にタスク作成→エラートースト表示
- [ ] オフラインから復帰→正常に操作再開
- [ ] Worker応答なし（30秒タイムアウト）→エラー表示（無限ローディングしない）

### 6-2. AI APIエラー
- [ ] AI APIタイムアウト→エラーメッセージ表示→再送信可能
- [ ] ストリーム途中切断→部分メッセージ表示→再送信可能
- [ ] ルーティングAPI失敗→フォールバック（デフォルトAI）で応答
- [ ] 全AI同時ダウン→適切なエラーメッセージ（白画面にならない）

### 6-3. Supabaseエラー
- [ ] DB接続エラー→エラートースト（UIフリーズしない）
- [ ] タスク保存失敗→エラー表示→再試行可能
- [ ] プロフィール取得失敗→デフォルト値で表示

### 6-4. フロントエンドエラー
- [ ] 存在しないページID→TODAYにフォールバック
- [ ] JSランタイムエラー→白画面にならない（エラーバウンダリ）
- [ ] localStorage満杯→適切なハンドリング
- [ ] クッキー無効ブラウザ→適切なエラーメッセージ

### 6-5. 入力エッジケース
- [ ] 連続送信（送信ボタン10連打）→二重送信されない
- [ ] 空入力で送信ボタン→送信されない
- [ ] AI応答中に新しいメッセージ送信→キューイングされる or 適切にブロック
- [ ] 入力中にタブ切替→入力内容が失われない
- [ ] 入力中にブラウザバック→確認ダイアログ or 入力保持

---

## 7. 課金・プラン制限テスト（TEST-07）

### 7-1. Free プラン制限
- [ ] Free: 20回/日の上限→カウンターが正しく増加
- [ ] Free: 20回到達→送信ブロック→アップグレード導線表示
- [ ] Free: 上限リセットタイミング→正午にリセット
- [ ] Free: リセット後に再び20回使える
- [ ] Free: 上限表示がUI上で確認できる（残り回数 or 使用回数）

### 7-2. プラン表示
- [ ] プラン選択画面: 5プラン全て表示（Free/Light/Pro/Max/Ultra）
- [ ] 各プランの価格が正しい
- [ ] 各プランの機能説明が表示
- [ ] 現在のプランがハイライト
- [ ] カルーセルでスワイプ切替

### 7-3. プラン別AIモデル制限
- [ ] Free: GPT-5のみ使用可能（Claude/Gemini Pro不可）
- [ ] Free: ルーティングでClaude/Geminiに振られた場合のフォールバック動作
- [ ] Pro: GPT-5 + Sonnet + Gemini Flash 使用可能
- [ ] Max: GPT-5 + Opus + Gemini Pro Preview 使用可能

---

## テスト実行手順（Codeへの指示）

### Step 1: 全テスト項目数のカウント（プリフライト）
```bash
# 各テスト仕様書の項目数をカウント
UT=$(grep -c '^\- \[ \]' docs/ux_user_test_v1.md)
CL=$(grep -c '^\- \[ \]' docs/ux_checklist_v1.md)
TP=$(grep -c '^\- \[ \]' docs/test_package_v1.md)
echo "UT=$UT, CL=$CL, TP=$TP, 合計=$(($UT+$CL+$TP))"
```

### Step 2: specファイル作成（1:1対応必須）
各仕様書の`- [ ]`項目に対して1つ以上のtest()を作成。
作成後にカウント一致を確認：
```bash
for f in tests/e2e/specs/test*.spec.ts; do
  echo "$f: $(grep -c 'test(' $f) tests"
done
```

### Step 3: テスト実行
```bash
npx vite preview --port 4173 &
FRONTEND_BASE=http://localhost:4173 npx playwright test \
  --project=mobile \
  --reporter=html \
  --output=tests/e2e/report/ \
  --timeout=60000
```

### Step 4: FAIL修正ループ
FAILした項目を修正→再テスト→0 failedになるまで繰り返す。
**FAIL修正後は必ず2段階で回帰確認:**
```bash
# Step A: 修正したスイートのみ再テスト
FRONTEND_BASE=http://localhost:4173 npx playwright test tests/e2e/specs/test03-layout.spec.ts --project=mobile --timeout=30000
# Step B: 全スイート回帰確認（スイートごとに分割実行）
for spec in tests/e2e/specs/test*.spec.ts; do
  FRONTEND_BASE=http://localhost:4173 npx playwright test "$spec" --project=mobile --timeout=30000 --reporter=list
done
```

### Step 5: 完了報告（3区分: PASS/FAIL/SKIP）
```
TEST-FULL: XX PASS / YY FAIL / ZZ SKIP / 合計WW
  TEST-01a: XX/143 PASS, YY FAIL, ZZ SKIP
  TEST-01b: XX/130 PASS, YY FAIL, ZZ SKIP
  TEST-03: XX/N PASS, YY FAIL, ZZ SKIP
  TEST-04: XX/N PASS, YY FAIL, ZZ SKIP
  TEST-05: XX/N PASS, YY FAIL, ZZ SKIP
  TEST-06: XX/N PASS, YY FAIL, ZZ SKIP
  TEST-07: XX/N PASS, YY FAIL, ZZ SKIP
  TEST-08: XX/N PASS, YY FAIL, ZZ SKIP
修正ファイル: git diff --stat
HTMLレポート: tests/e2e/report/index.html
```
**SKIP = try/catchでタイムアウトを握りつぶした項目。PASSに含めない。test.skip()を使用すること。**


---

## テスト環境定義（v3追加）

### 前提条件
- フロントエンド: `npx vite preview --port 4173`（ビルド済みの静的配信）
- Worker API: 本番URL（https://goal-ai-worker.goalai-futoshi.workers.dev）に接続
- Supabase: 本番インスタンスに接続（テスト用スキーマ分離は中期TODO）
- ブラウザ: Chromium（Playwrightインストール済み）

### テストカテゴリ別の環境要件
| カテゴリ | API必要 | 推奨環境 | タイムアウト |
|---|---|---|---|
| A: フロントのみ（DOM/CSS/遷移） | 不要 | localhost:4173 | 30秒 |
| B: API必須（チャット/タスク作成） | 必要 | localhost + 本番Worker | 60秒 |
| C: 外部サービス依存（Stripe等） | モック推奨 | test.skip() or モック | — |

### API依存テストの扱い
- カテゴリBのテストでAI応答が60秒以内に返らない場合: `test.skip('AI API timeout')`
- **try/catchでexpect(true)してPASS扱いにすることを禁止**
- SKIP数は完了報告に含める

---

## テスト作成ルール（v3追加）

### 1. テストファイルのデフォルト設定
```typescript
test.describe.configure({ mode: 'parallel' });  // デフォルト
// serialが必要な場合（状態依存フロー）のみ明示的に設定
```

### 2. spec作成前のDOM構造確認（必須）
```bash
# 主要コンテナのID/classを出力してからtest()を書く
node -e "const h=require('fs').readFileSync('frontend/index.html','utf8');
  const ids=h.match(/id=\"[^\"]+\"/g)||[];
  ids.slice(0,50).forEach(m=>console.log(m))"
```

### 3. セレクタの優先順位
1. `#id` — 最優先。安定
2. `[data-testid="xxx"]` — テスト専用属性（今後追加推奨）
3. `.class` — IDがない場合
4. `button:has-text("テキスト")` — テキストベース（最終手段。i18n変更で壊れる）

### 4. 時刻依存テストのモック化
```typescript
await page.evaluate(() => {
  const fixed = new Date('2026-04-03T09:00:00').getTime();
  Date.now = () => fixed;
});
```

### 5. overlayクリックの位置指定
サイドバー等のoverlayをクリックする場合、中央ではなく右端を指定:
```typescript
const vp = page.viewportSize()!;
await overlay.click({ position: { x: vp.width - 20, y: vp.height / 2 } });
```

---

## FAIL修正判断基準（v3追加）

| 状況 | 修正対象 |
|---|---|
| 仕様書の記述 ≠ 実装の挙動 | **実装を修正** |
| 仕様書が古い（リパーパス/構造変更済み） | **仕様書＋テストを修正** |
| テストのセレクタ誤り（実装は正しい） | **テストのみ修正** |
| 実装もテストも正しいがFAIL | **仕様の再検討をClaude.aiにエスカレーション** |

**判断に迷ったら実装を修正する側に倒す。** テスト修正でPASSにするのは簡単だが、実バグを見逃す。

---

## 8. エッジケーステスト（TEST-08）（v3追加）

> 入力系・操作系の境界値テスト。全入力欄に対して最低6パターン

### 8-1. チャット入力エッジケース
- [ ] 空文字で送信ボタン押下→送信されない or エラー表示
- [ ] 1文字（「あ」）送信→正常にAI応答が返る
- [ ] 10,000文字の超長文送信→エラーにならない or 制限メッセージ
- [ ] HTMLタグ入力（`<script>alert(1)</script>`）→エスケープされて表示
- [ ] マルチバイト文字（日中韓アラビア文字混在）→正常に保存・表示
- [ ] 改行100行の入力→正常に表示（レイアウト崩れない）
- [ ] 連続送信（送信ボタン5連打）→二重送信されない
- [ ] AI応答中に新メッセージ送信→キューイング or ブロック（エラーにならない）

### 8-2. タスク名入力エッジケース
- [ ] 空のタスク名で追加→追加されない or エラー表示
- [ ] 1文字のタスク名→正常に追加
- [ ] 100文字のタスク名→正常に追加（表示はellipsis or 折り返し）
- [ ] 特殊文字（`'"<>&\n\t`）を含むタスク名→正常に保存・表示
- [ ] 同じタスク名を2回追加→2件とも表示される

### 8-3. 日記入力エッジケース
- [ ] 空の日記→保存されない（debounce不発火）
- [ ] 10,000文字の日記→正常に保存（切り捨てない）
- [ ] 高速入力（1秒以内に100文字）→debounceが正しく動作（1回だけ保存）

### 8-4. 操作エッジケース
- [ ] 全画面を高速タブ切替（TODAY→TALK→GOALS→ME→TODAY を3周）→クラッシュしない
- [ ] サイドバー開閉を10回連続→正常に動作
- [ ] ハーフモーダル開閉を10回連続→正常に動作
- [ ] ブラウザの戻る/進むボタン→アプリが壊れない
- [ ] ページリロード（F5）→現在のタブ状態が維持 or TODAYに復帰

### 8-5. ビューポートエッジケース
- [ ] 320px幅（iPhone SE）→全要素が画面内に収まる
- [ ] 768px幅（iPad）→レイアウトが崩れない
- [ ] 画面回転（portrait→landscape）→レイアウトが崩れない


---

## テストSKIPルール（v3.1追加）

### 原則: test.skip()は最終手段。まずデータ注入かAPIモックで解決する。

### データ不在の解決方法（skip禁止）
```typescript
// ❌ 禁止: データがないからskip
test('タスクリスト表示', async ({ page }) => {
  const tasks = page.locator('.task-item');
  if (await tasks.count() === 0) {
    test.skip(true, 'タスクデータなし');  // ← 永久にテストされない
    return;
  }
});

// ✅ 正解: テストデータを注入してから検証
import { injectTasks } from '../helpers/test-data';
test('タスクリスト表示', async ({ page }) => {
  await injectTasks(page, [
    { id: '1', name: 'テストタスク', done: false, sort_order: 0 }
  ]);
  const tasks = page.locator('.task-item');
  await expect(tasks).toHaveCount(1);
});

// ✅ 正解: APIをモックしてから検証
import { mockChatAPI } from '../helpers/test-data';
test('AI応答が表示される', async ({ page }) => {
  await mockChatAPI(page, 'こんにちは！お手伝いします。');
  await page.fill('#home-msg-in', 'テスト');
  await page.click('#home-send-btn');
  await page.waitForSelector('.msg.ai', { timeout: 10000 });
  const aiMsg = await page.locator('.msg.ai').last().textContent();
  expect(aiMsg).toContain('こんにちは');
});
```

### test.skip()を使ってよいケース（3つだけ）
1. **ストリーミングの実データ検証** — SSEモックでは再現困難な場合のみ
2. **Stripe決済の実行** — 本番課金が発生するため
3. **iOS固有の挙動** — Chromiumでは再現不可能

それ以外のtest.skip()は禁止。データ注入 or APIモックで解決すること。

### 禁止パターン（canopy G5-v4でFAIL）
```typescript
// ❌ 禁止: expect(true)
try { await api(); } catch { expect(true).toBeTruthy(); }

// ❌ 禁止: catch {} 空ブロック
try { await api(); } catch {}

// ❌ 禁止: typeof-onlyアサーション
expect(typeof hasData).toBe('boolean');

// ❌ 禁止: データ不在でskip
if (count === 0) { test.skip(true, 'データなし'); return; }

// ❌ 禁止: if条件で検証を回避
if (await el.isVisible()) { /* 検証 */ }  // 非表示ならPASS
```

### 解決パターン（データ注入 + APIモック）
```typescript
// ✅ タスクデータ注入 → skip不要
import { injectTasks, mockChatAPI } from '../helpers/test-data';

test('タスクリスト表示', async ({ page }) => {
  await injectTasks(page, [{ id: '1', name: 'テスト', done: false }]);
  await expect(page.locator('.task-item')).toHaveCount(1);
});

// ✅ AIチャットモック → skip不要
test('AI応答表示', async ({ page }) => {
  await mockChatAPI(page, 'テスト応答');
  await page.fill('#home-msg-in', '質問');
  await page.click('#home-send-btn');
  await expect(page.locator('.msg.ai')).toBeVisible();
});

// ✅ 必須要素 → if文で囲まない
test('サイドバー開閉', async ({ page }) => {
  await expect(page.locator('#hamburger-btn')).toBeVisible();
  await page.click('#hamburger-btn');
  await expect(page.locator('#sb')).toBeVisible();
});
```

### ルール
1. **expect(true)は全面禁止。** canopyがFAILを返す
2. **データ不在 → test.skip()ではなくデータ注入で解決**
3. **API依存 → test.skip()ではなくAPIモック(page.route)で解決**
4. **test.skip()は3ケースのみ許可:** ストリーミング実データ / Stripe決済 / iOS固有挙動
5. **SKIP数は完了報告に含める。** 5%を超えたらClaude.aiにエスカレーション


### 最大の盲点: `if (count > 0)` 条件分岐（127件検出）

**問題:** 要素が見つからない場合、if文を素通りしてexpectに到達せずPASS。
```typescript
// ❌ ハンバーガーが非表示なら何も検証せずPASS
if (await hamburger.isVisible()) {
  await hamburger.click();
  await expect(sidebar).toBeVisible();
}
// ↑ hamburgerが非表示→if文スキップ→expect 0回→PASS
```

**ルール: 必須要素とオプション要素を区別する**

```typescript
// ✅ 必須要素: if文で囲まない。見つからなければFAIL
await expect(page.locator('#hamburger-btn')).toBeVisible();
await page.locator('#hamburger-btn').click();
await expect(page.locator('#sb')).toBeVisible();

// ✅ オプション要素: 見つからなければtest.skip()
const chips = page.locator('.chip-item');
const count = await chips.count();
if (count === 0) {
  test.skip(true, 'チップ要素が存在しない（プロフィール未設定）');
  return;
}
// ↓ ここに到達 = 要素あり → 実際の検証
await chips.first().click();
await expect(chips.first()).toHaveClass(/selected/);

// ❌ 禁止: if (count > 0) { expect... } else { /* 何もなし */ }
// ✅ 代替: if (count === 0) { test.skip(); return; } 以降は必須検証
```

**判断基準:**
| 要素 | 分類 | 理由 |
|---|---|---|
| ボトムタブ | 必須 | 全画面に常時存在 |
| ハンバーガーボタン | 必須（TALK画面） | TALK画面の基本UI |
| サイドバー | 必須（開いた後） | ハンバーガー押下後は必ず存在 |
| タスクリスト | 必須 | TODAY画面の基本要素 |
| AI応答メッセージ | オプション | API依存。SKIP対象 |
| プロフィールチップ | オプション | ユーザーデータ依存。SKIP対象 |
| 日記タイトル | オプション | 入力がなければ生成されない |
