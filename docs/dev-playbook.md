# GOAL AI — Development Playbook
> 暗黙知・実戦知見・判断基準のリポジトリ集約
> 更新: 2026-04-09（実装29）
> 対象: Claude Code / 新規開発者 / プロジェクト移管時

---

## 1. 鉄則ルール（v3: 12項目）

### 基本原則（鉄則12項目 — 全ルールはCLAUDE.md鉄則セクション参照）
1. **仕様変更禁止。** CLAUDE.md契約セクション参照。設計判断は自由、根拠を記録
2. **C2基準フロー厳守:** 実装→E2E→bump-version→build→canopy→デプロイ→ヘルスチェック→git tag→push。省略・順序変更禁止
3. **verify.shを自分で作り自分で実行。** canopyに新項目を累積追加（削除禁止）
4. **判断根拠・結果・提案をsession_progress.mdに記録。** レポート規約に従う
5. **ミッション遂行に必要なバグ修正はOK（記録必須）。無関係なバグは報告のみ**
6. **デザイン変更時はdocs/goal_ai_design_spec_v3.md + docs/design_system.mdを参照**
7. **mockup HTMLはデザインの正（原本）。改変禁止**
8. **「忘れた」「間違えた」禁止。** エラー時は構造的原因を特定する
9. **デプロイ前にE2Eテスト必須。** UI修正は1行でもテスト実行してからデプロイ
10. **テスト未実行でデプロイしない。** 指摘あり（実装29で学習）
11. **コンテキスト残量20%未満で通知。** 未完了作業リストアップ
12. **アドホック修正フロー:** 報告→原因特定→修正→E2E→canopy→デプロイ

---

## 2. 開発フロー（v5: テスト影響連動ゲート）

### C2基準フロー（canopy-deployスキル）
```
実装 → E2Eテスト(該当セクション) → bump-version → build → canopy → deploy:frontend
→ wrangler deploy → health check → git commit → git tag → git push
```

### ミッション定義テンプレート
```
### MISSION-ID: タイトル
> リスク: 🟢低/🟡中/🔴高
> 参照: docs/xxx.md
> 対象ファイル: xxx
> テスト影響: E2E-XX

**仕様:** (番号付き)
**仕様↔検証マッピング(G7):** 仕様N → cmdN
**プリフライト:** grep/wc確認
**完了コマンド:** cmd1-N
**FAIL条件:** 
**完了報告:** 
```

### 承認ルール
| リスク | ルール |
|--------|--------|
| 🟢低 | バッチ承認可。自律実行→まとめて報告 |
| 🟡中 | 3件まで連続実行可→まとめて報告→承認 |
| 🔴高 | ふとしの個別承認必須（実行前に停止して報告） |
| 🟠デザイン | mockup必須。Claude.aiチャット経由 |

---

## 3. 実戦知見（コンテキスト外の学び）

### planのSource of Truth = TOKEN_KV
- Supabase DBのplan変更は**無効**。Worker APIはKV（TOKEN_KV）のみ参照
- テストユーザーのプラン変更: `npx wrangler kv:key put --namespace-id=XXX "token:TOKEN" '{...}'`
- DB更新はフロントエンドのサイドバー表示にも反映されない

### プロフィール永続化の仕組み
- `saveProfile()` → `saveProfileToServer()` → identity PUT + localStorage二重保存
- `restoreProfileFromLocalStorage()` → init時に同期復元（APIより先にUI表示）
- identity PUT: サーバー側でJSON merge（既存identityとの上書き防止）
- CORS: PUTメソッドが必要（Access-Control-Allow-Methods）

### タスクデータ構造
- タスクは`ALL_GOALS[N].phases[M].tasks[]`に格納
- ゴール未選択タスク → `ALL_GOALS[0]`（「日常タスク」自動作成ゴール）に配置
- `goalLinked:false`フラグでUI表示時にゴール名を非表示
- `saveGoals()` で全ゴールのphasesをサーバー永続化 + localStorage backup

### E2Eテスト設計
- 各テストは**自己完結的**（前のテストの状態に依存しない）
- テストユーザー: `goal_test_7BDSzrA2f3pzQN0z2yNGYSKS` (KV plan=max)
- test-guards.ts: console.error + 5xx + AI error text を検出。IGNORED_ERRORS上限15件
- タスク操作テストは`page.evaluate`経由が安定（Playwright locatorよりDOM直操作）

### デバイス依存バグ対処
- iOSキーボード: 修正試行3回制限到達→HOLD
- 深夜テスト: 赤線インジケーターは6:00-23:00のみ表示（時間帯依存SKIP）

---

## 4. ふとしのコミュニケーションスタイル

- **短く直接的。** 「ok」「はい」「着手して」で承認。長い説明は不要
- **コードは読まない。** 結果（スクショ/数値）で判断
- **品質最優先。** スピードのために品質を犠牲にしない
- **指摘は構造改善の機会。** 「211件あるのに4件だけ？」→全件一括修正すべき
- **バグはユーザーが見つける前に修正されていること**
- **「忘れた」は許されない。** ゲート/自動チェックで防ぐ

---

## 5. ロードマップ方針

### 短期（現在）
- GOAL AI品質安定化 → テスト配布
- Night Sky Journalデザイン全面適用
- 800項目バグリスト消化

### 中期
- GOAL AI → LIFE AI（家計・確定申告）に進化
- 共通DNA: Night Sky背景、Vertical Journal、Pill Active Tab

### 長期
- 5アプリ展開: GOAL/LIFE/BODY/READ/COOK AI
- 開発オーケストレーター構想（Claude.ai + Code + 仕様自動検証）

---

## 6. 3層間フロー図（ステートマシン）

```
┌─────────────┐    仕様協議     ┌──────────────┐
│  ふとし      │ ←────────────→ │  Claude.ai    │
│  (承認者)    │    方針決定     │  (設計者)     │
└──────┬──────┘                └──────┬───────┘
       │ 承認/却下                      │ ミッション定義
       │                               │ (session_progress.md)
       ▼                               ▼
┌──────────────────────────────────────────┐
│  Claude Code (実装者)                      │
│                                            │
│  [QUEUED] → [IN_PROGRESS] → [DONE]        │
│     ↑            │              │          │
│     │         修正→E2E→         │          │
│     │         canopy→デプロイ    │          │
│     │            │              │          │
│     └── FAIL ←──┘              ▼          │
│                          session_progress  │
│                          に完了記録        │
└──────────────────────────────────────────┘

状態遷移:
  QUEUED → IN_PROGRESS: Codeがキュー先頭を読んで着手
  IN_PROGRESS → DONE: 完了コマンド全PASS + canopy PASS
  IN_PROGRESS → BLOCKED: 外部依存（API/ふとし承認）で停止
  BLOCKED → QUEUED: ブロッカー解消後に再開
```

---

## 7. 判断基準の構造化（if-then分岐条件）

### 仕様変更 vs 設計変更
```
if (ユーザーから見える挙動が変わる) → 仕様変更（禁止）
else if (内部構造・実装方法の変更) → 設計変更（自由。根拠記録）
else if (コスト構造に影響) → 提案ログに記録 → 承認待ち
```

### バグ修正判断
```
if (ミッション遂行に必要) → 即修正（記録必須）
else if (ユーザー体験に影響) → 報告のみ（提案ログ）
else → 無視
```

### UI変更判断
```
if (design_spec_v3.md/design_system.mdに記載あり) → 実装OK
else if (spec未記載) → 仕様変更扱い → 停止・報告
if (mockupあり) → mockup準拠で実装
else → Claude.aiにmockup作成依頼
```

### テスト実行判断（鉄則9/10準拠）
```
if (frontend/ or src/ の変更あり) → E2Eテスト必須
if (docs/ or instructions/ のみ) → テスト不要
if (style.css 変更) → デザインテスト + E2E
if (API変更) → 該当E2Eセクション + smoke test
```

### デプロイ判断（判断基準: C2ルール準拠）
```
if (canopy FAIL) → デプロイ禁止
if (E2E FAIL かつ コード起因) → デプロイ禁止
if (E2E FAIL かつ 外部依存=APIクレジット等) → デプロイ可（記録必須）
if (🔴高リスク変更) → ふとし承認後のみ
```

---

## 8. ファイル構成（v4.0.29）

### バックエンド (src/)
- `index.js`: ルーティング
- `routes/`: chat, goals, me, token, checkout, history, etc.
- `middleware/`: auth.js, cors.js
- `services/ai/`: gpt, gemini, claude, routing
- `utils/`: constants, helpers, supabase

### フロントエンド (frontend/)
- `index.html`: 全画面HTML（SPA）
- `js/`: globals→api→profile→ui→chat→goals→app の順で読込
- `style.css`: テーマシステム（4テーマ）+ 全コンポーネント
- `public/sw.js`: Service Worker

### テスト (tests/)
- `e2e/specs/e2e-fullflow.spec.ts`: 120項目メインE2E
- `e2e/specs/test-audit-phase0.spec.ts`: 20画面監査テスト
- `e2e/helpers/`: test-guards, test-setup, supabase-test
- `smoke/canopy.sh`: 静的品質チェック

### 仕様書 (docs/)
- `design_system.md`: Night Sky Journalデザインシステム
- `goal_ai_design_spec_v3.md`: 全画面UI仕様
- `ux_redesign_v2.md`: UX刷新仕様（855行）
- `potential_bugs_300.md`: 800項目バグリスト
- `mockups/`: 21画面承認済みHTML

---

## 9. 仕様書ID付番（TODO）

> DEV-03の一部。各仕様項目にID（SPEC-TODAY-001等）を振り、
> e2e_fullflow_test.mdの各テストに対応IDを記載。
> 仕様→テスト→コードのトレーサビリティを確立。
> 次セッションで実施予定。
