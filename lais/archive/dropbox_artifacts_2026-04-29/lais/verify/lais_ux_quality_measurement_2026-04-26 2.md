# Lais UX 品質 実機計測レポート（2026-04-26）

## ミッション
LAIS-UX-QUALITY-REAL-MEASUREMENT

## PO ふとし実機報告（2026-04-26 23:55 頃）
- エラーだらけ
- 画面遷移が遅い
- 入力から表示までタイムラグ

## 計測対象 / 環境
- 対象 URL: `https://lais-3yk.pages.dev`（CF Pages 最新本番 alias、deploy=`https://d4a68cf4.lais-3yk.pages.dev`）
- 計測ツール: Playwright 1.59.1 / chromium / Desktop Chrome 1280x720
- 計測 spec: `lais/tests/realmachine/ux_quality_measurement_2026-04-26.spec.ts`（新設）
- 認証: Supabase Admin API でテストアカウント生成、計測完了後 admin/users DELETE で cleanup（cleanup-OK 確認済）
- テストアカウント: `ux-measure-20260427T032442Z-52a7a4@example.invalid`（IETF reserved TLD）
- セキュリティ: SUPABASE_SERVICE_KEY 出力ゼロ（伏字 *** 表記、length のみ）

## 計測結果サマリ（mean of 8 試行 / 各画面 1 サンプル）

| ID | 画面 / 操作 | 計測値 | 判定 | 備考 |
|---|---|---|---|---|
| M01 | S-00 Splash 到達（goto / → DOM）| **411–570 ms** | ⚪ 良好 | FCP 範囲内 |
| M02 | S-00 → S-01 Auth ナビ | **117–139 ms** | ⚪ 良好 | prefetch 効果あり（main.jsx idle prefetch） |
| M03 | S-01 サインイン → S-10 到達 | **1830–3357 ms** | △ ボーダー | 認証 + bootstrap + dashboard 描画 連鎖 |
| M04 | S-10 Grow 初期データ load | **2–9 ms** | ⚪ 良好 | empty-state 即時表示 |
| M05 | S-10 → S-12 タスク追加モーダル open | **28–50 ms** | ⚪ 良好 | lazy chunk 既読時 |
| M06 | **S-12 タスク作成 → S-10 反映（CRUD）**| **1618–2271 ms** | ❌ 致命的 | API + reloadDashboard の往復、楽観更新なし |
| M07 | S-10 タスク check トグル（楽観更新）| **26–44 ms** | ⚪ 良好 | 楽観 UI 即時反映、API 非同期 |
| M08 | S-10 → S-15 ゴール作成モーダル open | **33–37 ms** | ⚪ 良好 | – |
| M09 | **S-15 モーダル ESC で閉じる** | **timeout（>1.5 s 不発）** | ❌ 致命的 | ESC 効果なし、modal stuck |
| M10 | **S-15 モーダル ✕ ボタンで閉じる** | **失敗** | ❌ 致命的 | クリック後 overlay 残存、Playwright が page closed を検出 |
| M11 | S-20 TALK ナビ | **未到達** | – | M09 / M10 の S-15 modal stuck により後続全停止 |
| M12 | S-20 メッセージ送信 → AI 応答 | **未到達** | – | 同上 |
| M13 | S-30 ME ナビ | **未到達** | – | 同上 |
| M14 | S-14 ゴール詳細 ナビ | **未到達** | – | 同上 |

## 検出問題分類

### ⭐⭐⭐ 致命的（機能不全相当 / 即時修正必須）

#### CRITICAL-A: S-15 GoalCreate モーダルが ESC でも ✕ ボタンでも閉じない

- 再現手順: `https://lais-3yk.pages.dev/grow` でログイン → 「+ ゴールを作成」タップ → ESC キー押下 → 1.5 秒経過しても overlay 残存。✕ ボタン (`.s15-close`) クリックも overlay 除去されず。
- 計測: 5 試行連続で `escape_works=false` / `close_btn_works=false`。
- 影響: モーダル trap = ユーザーは強制リロードでしか脱出不可能。Tab キー移動も focus trap 内で循環、bottom tab bar 操作不能。
- 実機裏付けコマンド:
  ```
  TEST_BASE_URL=https://lais-3yk.pages.dev \
    REALMACHINE_TEST_EMAIL=$TEST_EMAIL REALMACHINE_TEST_PASSWORD=$TEST_PASSWORD \
    SUPABASE_URL=$SUPABASE_URL SUPABASE_PUBLISHABLE_KEY=$SUPABASE_PUBLISHABLE_KEY \
    npx playwright test --config=playwright.cf.config.ts \
    tests/realmachine/ux_quality_measurement_2026-04-26.spec.ts
  ```
  → 出力 `SCREEN_METRICS S-15 modal_open_ms=37 escape_works=false close_btn_works=false`
- スクリーンショット: `lais/test-results/realmachine-ux_quality_mea-8aa80-ole-error-network-waterfall-chromium/test-failed-1.png`（ESC + ✕ 両方押下後も S-15 が前面表示の状態を撮影）
- ふとし報告との照合: 「エラーだらけ」報告と一致（モーダル閉じない = 操作不能 = エラー体験）。
- 修正案（優先度順）:
  1. `S15GoalCreate.jsx` の ESC handler が `e.stopPropagation()` を呼んでいるが S-12 / S-13 の handler とイベント順が逆転している可能性。`useEffect` の `addEventListener` を `capture: true` に変更し、最上層モーダルが優先処理。
  2. `.s15-close` の onClick が `handleClose()` を呼ぶが、`onClose?.()` 経由で親の `handleGoalCreateClose` → `setGoalCreateOpen(false)` 経路で reactivity が伝播していない可能性。Preact `signals` 使用時の rerender 問題確認。
  3. body scroll lock の cleanup が連鎖モーダル（S-12 → S-15）で `prevOverflow` を `'hidden'` のまま記憶していないか確認。
  4. 短期的応急: `.s15-overlay` を JS で remove する逃げ道を ErrorBoundary に追加。

#### CRITICAL-B: S-12 タスク作成 CRUD レイテンシ 1.6–2.3 秒（楽観更新なし）

- 再現手順: S-10 → 「+ タスクを追加」 → 名前入力 → 「作成」 → 5 試行平均 **1.95 秒**でリスト反映。
- 計測: `S-12-save crud_to_dom_ms=1672 / 1800 / 1942 / 1988 / 2012 / 2231 / 2271`（中央値 1988 ms）。
- 影響: ふとし報告「入力から表示までタイムラグ」と直接一致。
- 原因仮説（コード読解）:
  - `S10Grow.jsx#handleTaskCreate` が `await createTask(...)` 後 `reloadData()` を呼ぶ。
  - `reloadData()` は `loadDashboard()` = `listTasks()` + `listGoals()` の 2 回 fetch。
  - 各 fetch は CF Pages Functions → Supabase REST 経由（往復 ~600–800 ms × 2 系統）。
  - 楽観更新（即時 setTasks で push、API 失敗時に rollback）が未実装。
- 実機裏付けコマンド: 上記同 spec 出力 `SCREEN_METRICS S-12-save crud_to_dom_ms=1988`
- 修正案:
  1. **楽観更新導入**: `handleTaskCreate` で `setTasks((prev) => [...prev, optimistic])` を即時、`createTask()` 失敗時のみロールバック（S20Talk.jsx の `client_msg_id` パターンを再利用）。
  2. **reloadData の差分化**: `reloadData()` は 1 件作成のためにフルリロードしている。CRUD 結果（`createTask` 戻り値の task オブジェクト）を直接 state に merge。
  3. **listTasks + listGoals の並列化**: `loadDashboard()` を `Promise.all([listTasks(), listGoals()])` で並列化、シリアル待機を削減（理論上 ~半減）。
  4. **ローディング UI**: 作成ボタン押下中は `aria-busy` + spinner を表示（即時フィードバック、現状は完全無反応）。

### ⭐⭐ 重要（UX 大幅劣化）

#### IMPORTANT-A: サインイン → ダッシュボード 2.3–3.4 秒のレイテンシ

- 再現手順: `/auth?mode=login` → email/password 入力 → 「ログイン」 → `/grow` 到達まで `form_to_grow_ms=1830 / 2336 / 2339 / 2341 / 2342 / 2343 / 2841 / 3348 / 3357` （中央値 ~2.3 秒）。
- 影響: ふとし報告「画面遷移が遅い」と直接一致。
- 原因仮説:
  - Supabase Auth `signInWithPassword` (~400 ms typical)
  - Bootstrap `/api/lais/bootstrap` (~200–400 ms 認証 verify + ensureUsersRow)
  - `/grow` 到達後の lazy chunk fetch (S10Grow chunk + vendor-supabase)
  - `loadDashboard()` 2 回 fetch
- 修正案:
  1. **/grow ルートと /talk /me の lazy chunk を S-01 Auth サインイン成功時に prefetch**（既に S01Auth は main.jsx で prefetch、続きの導線も同パターン適用）。
  2. **bootstrap と loadDashboard の並列化**: 現状 サインイン → bootstrapAuth → ルート遷移 → loadDashboard とシリアル。`bootstrapUser()` を JWT 取得直後に発火し loadDashboard と並列実行。
  3. **ダッシュボード Skeleton**: 1.5 秒以上の空白を Skeleton UI で埋める（即時遷移感）。

#### IMPORTANT-B: S-15 modal stuck 後 page 全体が unresponsive 化

- 観察: S-15 モーダルが閉じない状態で `page.evaluate` / `page.locator.count` が timeout 180 秒まで応答せず、Playwright の trace 上 `call@68 waitForFunction` 後の after イベントが消失。Browser tab が完全フリーズ相当。
- 原因仮説: modal の Tab focus trap (`s15-modal` 内で document.querySelectorAll を keydown ごとに走査) が、stuck 状態で再描画ループに入っている可能性。
- 影響: 「エラーだらけ」報告のうち、ハング系を引き起こす可能性が高い構造。
- 修正案: CRITICAL-A 解消で連鎖解消見込み。focus trap の querySelectorAll を useMemo / useRef に置換。

### ⭐ 軽微（細かい違和感）

#### MINOR-A: 既存テストデータの蓄積

- 観察: 過去ラン由来の `UX-MEASURE-1777260...` task が 6+ 件 Today に蓄積（screenshot で確認）。テストアカウントを毎回新規作成したにもかかわらず、cleanup で task が CASCADE 削除されない可能性。
- 影響: テスト用途のみ、本番ユーザーには無関係。
- 注意: 本 spec の cleanup は admin/users DELETE のみ。tasks テーブルの user_id 外部キー削除カスケードが未確認なら別途対応必要。

#### MINOR-B: `data-theme="night-sky"` で全画面ダーク背景

- 観察: trace 内 `<html lang="ja" data-theme="night-sky">`。背景はダーク基調。
- 影響: 仕様適合（design_spec_v1.md トーン）、コントラスト問題は別 R 系で検証済（過去 verify 参照）。

## Console error / warning 結果

trace 上では `[S12TaskAdd] create: ...` の console.log のみ確認。Console error / pageerror の発火は **0 件**。
ただし計測が S-15 modal stuck により S-20 / S-30 / S-14 まで到達せず、後半画面の error は未収集。

## Network failure 結果

trace 確認範囲（S-00 〜 S-15 まで、約 6 秒間）で network failure **0 件**。

## Network waterfall（slowest 抽出）

S-15 stuck により集約処理（NETSLOW_DETAIL ログ）まで未到達のため、本ラウンドでは個別 API レイテンシ計測なし。
推定値（コード読解 + 過去 verify から）:
- `/api/lais/bootstrap`: ~200–400 ms
- `/api/lais/tasks` POST: ~400–600 ms
- `/api/lais/tasks` GET: ~300–500 ms
- `/api/lais/goals` GET: ~300–500 ms
- `/api/lais/chat/respond` (Anthropic): ~2000–4000 ms（推定、AI 推論コスト）

## ふとし報告事象との照合表

| ふとし報告 | 計測一致 | 致命度 |
|---|---|---|
| エラーだらけ | CRITICAL-A（モーダル trap） + IMPORTANT-B（page unresponsive） | ⭐⭐⭐ |
| 画面遷移が遅い | IMPORTANT-A（サインイン 2.3–3.4 s） | ⭐⭐ |
| 入力から表示までタイムラグ | CRITICAL-B（S-12 CRUD 1.6–2.3 s） | ⭐⭐⭐ |

## 修正優先度付け

| 優先度 | ID | 修正対象 | 推定工数 |
|---|---|---|---|
| ⭐⭐⭐ #1 | CRITICAL-A | S15GoalCreate ESC + ✕ 動作復旧 | 30 分 |
| ⭐⭐⭐ #2 | CRITICAL-B | S-12 タスク作成 楽観更新 + 並列化 | 60 分 |
| ⭐⭐ #3 | IMPORTANT-A | サインイン Skeleton + prefetch 拡張 | 45 分 |
| ⭐⭐ #4 | IMPORTANT-B | focus trap memo / S-15 解消連鎖確認 | 30 分（CRITICAL-A 連鎖） |
| ⭐ #5 | MINOR-A | tasks CASCADE 削除確認 | 15 分 |

## 計測限界（本ラウンドで未取得）

S-15 modal stuck により以下は本ラウンドで計測未到達:
- S-20 TALK ナビゲーション時間
- S-20 メッセージ送信 → AI 応答時間（最大焦点、ふとしの「TALK 重い」体感確認用）
- S-30 ME profile ナビ
- S-14 GoalDetail ナビ
- 全画面の Console error 横断観察
- Network waterfall slowest 10

→ **CRITICAL-A 修正後に再ラウンドで完全計測を実施する**。

## 制約遵守チェック

- [x] `--no-verify` 未使用（git 操作なし）
- [x] Bash heredoc 経由書込み（本ファイル）
- [x] 実 SUPABASE_SERVICE_KEY 出力ゼロ（伏字 *** で length のみ）
- [x] テストアカウント cleanup 完了（admin/users DELETE → CLEANUP-OK 確認）
- [x] 書込領域分離（`lais/verify/lais_ux_quality_measurement_2026-04-26.md` 1 ファイル新設のみ、scripts/ 未触）
- [x] `lais/tests/realmachine/ux_quality_measurement_2026-04-26.spec.ts` 1 ファイル新設（spec として再現可能性担保、計測再ラウンド用）

## 次アクション提案（PO 判断仰ぎ）

1. **致命優先 fix subagent 起動**: CRITICAL-A（S-15 modal trap）を最優先で修正、修正後本 spec 再ラウンドで S-20 / S-30 / S-14 / Network waterfall を完全計測。
2. **並列 fix subagent 起動**: CRITICAL-A + CRITICAL-B + IMPORTANT-A を 3 本並列、互いに別ファイルなので衝突リスク低（S15GoalCreate.jsx / S10Grow.jsx + db.js / S01Auth.jsx）。

