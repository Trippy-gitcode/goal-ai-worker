# テスト品質監査レポート v1
> 作成: 2026-04-04
> 目的: 全テストファイルの「甘いPASS判定」を洗い出し、Acceptance Criteria（AC）を定義する
> 背景: 524テストALL PASSなのに「こんにちは」でエラーが発生した

---

## 発見されたアンチパターン（6種）

### AP-1: エラー応答を正常応答と区別していない（最重要）
**影響範囲:** AI応答を検証する全テスト（推定40件以上）
**具体例:** E2E-03, test01-ux 2-1-b, test04-data, e2e-fullflow
**メカニズム:**
- エラーバブルが `.msg.ai` クラスを持つ（正常応答と同じ）
- テストは `.msg.ai` の `toBeVisible()` と `text.length > 5` のみ検証
- 「エラーが発生しました。」は11文字 → length > 5 で PASS
- `not.toContain('エラー')` は全524テスト中 **0件**

### AP-2: 「クラッシュしなかった」= PASS（エラーテスト）
**影響範囲:** test06-errors 全20件
**具体例:** `expect(tabVisible).toBe(true)` が唯一のアサーション（12件）
**問題:** エラー表示の内容・タイミング・回復動作を一切検証していない

### AP-3: 存在確認のみで内容未検証
**影響範囲:** test01-ux, test01-checklist, e2e-fullflow
**具体例:**
- `await expect(element).toBeVisible()` → 何が表示されているかは不問
- `expect(count).toBeGreaterThanOrEqual(1)` → 数があれば内容は不問
- `expect(chatContent !== null).toBeTruthy()` → nullでなければPASS

### AP-4: 関数存在チェックで動作未検証
**影響範囲:** test07-billing 全14件
**具体例:**
- `typeof window.checkFairUse === 'function'` → 関数が存在すれば PASS
- 実際に20回送信して制限がかかるかは未検証
- プラン料金が正しいかは JS 変数の値チェックのみ、UIに表示される値は未検証

### AP-5: HTTPステータス未検証
**影響範囲:** API呼び出しを含む全テスト
**問題:** UIの見た目だけで判定。APIが500を返してもUI上でcatchされてエラーバブル表示→テストはPASS

### AP-6: グローバルエラーリスナーなし
**影響範囲:** 全テスト
**問題:** テスト実行中にconsole.errorやunhandled rejectionが出ても無視。正常フローのテストが通っている裏でJS例外が多発している可能性

---

## Acceptance Criteria（AC）定義

### 全テスト共通AC（グローバルガード）
すべてのテストに以下のガードを追加する:

```
AC-GLOBAL-1: テスト中にconsole.errorが発生したらFAIL
AC-GLOBAL-2: テスト中にunhandled rejectionが発生したらFAIL  
AC-GLOBAL-3: 画面にtoast（エラートースト）が表示されたらFAIL（エラーテスト除く）
AC-GLOBAL-4: .msg.ai に「エラー」を含むテキストが表示されたらFAIL（エラーテスト除く）
```

実装方法（beforeEachフック）:
```typescript
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));
  // Store for afterEach
  (page as any).__testErrors = errors;
});

test.afterEach(async ({ page }) => {
  const errors = (page as any).__testErrors || [];
  // 許容するエラー（外部リソース404等）を除外
  const critical = errors.filter(e => 
    !e.includes('favicon') && !e.includes('manifest')
  );
  expect(critical, 'Unexpected console errors').toHaveLength(0);
});
```

---

### カテゴリ別AC

#### 1. AI応答テスト（E2E-03, test01-ux 2-1系, test04-data）

現状: `.msg.ai` が表示されて5文字以上あればPASS
```
AC-AI-1: AI応答テキストに「エラー」「失敗」「error」を含まないこと
AC-AI-2: AI応答テキストが20文字以上であること（5文字では検証にならない）
AC-AI-3: AI応答が日本語テキストを含むこと（意味のある応答かの最低限チェック）
AC-AI-4: AI応答後にinputが再入力可能な状態であること
```

実装例:
```typescript
// AI応答検証ヘルパー
async function assertValidAIResponse(page: Page) {
  const aiMsg = page.locator('.msg.ai').last();
  await expect(aiMsg).toBeVisible();
  const text = await aiMsg.textContent() || '';
  // AC-AI-1: エラーでないこと
  expect(text).not.toContain('エラー');
  expect(text).not.toContain('error');
  // AC-AI-2: 意味のある長さ
  expect(text.length).toBeGreaterThan(20);
  // AC-AI-3: 日本語を含む（英語応答のみの場合もあるので緩め）
  // AC-AI-4: 再入力可能
  const input = page.locator('#home-msg-in');
  await expect(input).toBeEditable();
}
```

#### 2. タスク操作テスト（E2E-02, test01-ux 1-1系, test04-data 4-1）

現状: inputがクリアされればPASS、タスクが実際にリストに表示されるかは未検証
```
AC-TASK-1: タスク追加後、TODAY画面のタスクリストに追加したタスク名が表示されること
AC-TASK-2: タスク完了後、タスクに完了マークがつくこと
AC-TASK-3: タスク削除後、タスクリストから消えること
AC-TASK-4: タスク操作後にエラートーストが表示されないこと
```

#### 3. エラーハンドリングテスト（test06-errors）

現状: `tabVisible === true` のみ
```
AC-ERR-1: オフライン送信時、エラートースト or エラーメッセージが表示されること
AC-ERR-2: タイムアウト後、ローディング表示が消えていること
AC-ERR-3: エラー後、inputが再入力可能であること（UIフリーズしない）
AC-ERR-4: エラー後の再送信で正常応答が返ること（回復テスト）
AC-ERR-5: 504/500レスポンス時、ユーザーにわかるエラーメッセージが表示されること
```

#### 4. 課金・プランテスト（test07-billing）

現状: JS関数の存在チェックのみ
```
AC-BILL-1: プランモーダルに全5プラン名が表示されること（Free/Light/Pro/Max/Ultra）
AC-BILL-2: 各プラン料金がUIに正しく表示されること（¥0/¥500〜980/¥1,500〜2,980/¥1,500〜9,800/¥20,000）
AC-BILL-3: Free制限到達時、UIに制限メッセージが表示されること（関数存在だけではなく実動作）
AC-BILL-4: プラン変更ボタンが機能すること（Stripe遷移 or モーダル表示）
```

#### 5. ゴール操作テスト（E2E-09/10, test01-ux 3系）

現状: 入力欄の存在確認のみ
```
AC-GOAL-1: ゴール作成後、GOALSリストに作成したゴール名が表示されること
AC-GOAL-2: ゴール削除後、GOALSリストからゴールが消えること
AC-GOAL-3: Goal Hub内でフェーズ/マイルストーンが表示されること
AC-GOAL-4: ゴール操作後にエラーが表示されないこと
```

#### 6. 画面遷移テスト（E2E-16, test03-layout）

現状: ページが表示されればPASS
```
AC-NAV-1: 各ボトムタブタップで対応画面のメインコンテンツが表示されること
AC-NAV-2: 遷移後にエラートーストが表示されないこと
AC-NAV-3: 遷移後に画面が空白でないこと（主要要素が1つ以上visible）
```

#### 7. 認証テスト（test05-auth）

現状: 認証関数の存在チェック
```
AC-AUTH-1: 未認証状態でAPI呼び出し→401エラー→再認証フローが動くこと
AC-AUTH-2: トークン期限切れ→自動リフレッシュ or 再ログイン促進が動くこと
AC-AUTH-3: XSS入力がエスケープされてHTMLに出力されないこと（現在のnot.toContain('<script>')を維持）
```

#### 8. サイドバー・設定テスト（E2E-12/13, test01-checklist）

現状: 要素の表示確認のみ
```
AC-SIDE-1: ハンバーガー→サイドバー開→履歴リストが表示されること
AC-SIDE-2: 設定変更（テーマ切替等）が実際に反映されること（CSSクラス変化を検証）
AC-SIDE-3: コーチングモード切替で実際にモードが変わること（JS変数orUI表示で検証）
```

---

## 修正方針

### Phase 1: グローバルガード導入（全テストに効く）
1. `tests/e2e/helpers/test-guards.ts` を作成
2. beforeEach/afterEachでconsole.error監視 + エラーテキスト検出
3. 全specファイルのbeforeEachに組み込む
4. これだけで「エラーが発生しました」が出るテストが全てFAILになる

### Phase 2: AI応答ヘルパー追加
1. `assertValidAIResponse(page)` ヘルパーを作成
2. AI応答を待つ全テストで呼び出し
3. AC-AI-1〜4を一括適用

### Phase 3: カテゴリ別AC追加
1. タスク操作: AC-TASK-1〜4
2. エラーハンドリング: AC-ERR-1〜5
3. 課金: AC-BILL-1〜4
4. ゴール: AC-GOAL-1〜4

### Phase 4: 実装修正
Phase 1-3で発生したFAILの実装修正（テスト修正禁止ルール維持）

---

## ファイル別 影響件数（推定）

| specファイル | テスト数 | AC不足件数（推定） | 主なAP |
|---|---|---|---|
| e2e-fullflow.spec.ts | 86 | 30+ | AP-1,3,5 |
| test01-ux.spec.ts | 143 | 40+ | AP-1,3 |
| test01-checklist.spec.ts | 132 | 20+ | AP-3 |
| test03-layout.spec.ts | 44 | 5 | AP-3 |
| test04-data.spec.ts | 34 | 15+ | AP-1,3,5 |
| test05-auth.spec.ts | 18 | 5 | AP-4 |
| test06-errors.spec.ts | 20 | 20 | AP-2（全件） |
| test07-billing.spec.ts | 14 | 14 | AP-4（全件） |
| test08-edge.spec.ts | 24 | 10 | AP-3 |
| test-design.spec.ts | 55 | 0 | なし |
| test-g5-wait-anim.spec.ts | 4 | 2 | AP-1 |
| baseline/features/design-visual | 8 | 2 | AP-3 |
| **合計** | **582** | **163+** | — |

推定163件（全テストの28%）が「甘いPASS判定」。
グローバルガード（Phase 1）だけで大半が検出可能。


---

## 完了報告の出力形式（必須）

テスト完了後、以下のサマリーテーブルを出力すること。ふとしがこのテーブルだけで全体状況を把握できるようにする。

| カテゴリ | 対象テスト数 | 問題検出 | 解決(実装修正) | スキップ | 残課題 |
|----------|-------------|---------|---------------|---------|--------|
| AC-GLOBAL | — | — | — | — | — |
| AC-AI | — | — | — | — | — |
| AC-TASK | — | — | — | — | — |
| AC-ERR | — | — | — | — | — |
| AC-BILL | — | — | — | — | — |
| AC-GOAL | — | — | — | — | — |
| AC-NAV | — | — | — | — | — |
| AC-AUTH | — | — | — | — | — |
| AC-SIDE | — | — | — | — | — |
| **合計** | — | — | — | — | — |

各列の定義:
- **対象テスト数**: ACが適用されるテストの数
- **問題検出**: AC追加により新たにFAILしたテスト数
- **解決**: 実装修正によりPASSになったテスト数
- **スキップ**: 構造的理由でtest.skipにしたテスト数（理由を1行で明記。例: "Stripe決済: 本番課金発生のため", "iOS固有: Chromium再現不可"）
- **残課題**: 解決できなかった問題（次ミッションに引き継ぎ）
