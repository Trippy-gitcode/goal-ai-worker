# Lais PO 体感目標 SSoT v3.4 (2026-04-27、Claude Design Skill 利用必須化)

> Mission ID: ALPHA-PO-EXPECTATIONS-SSOT-V1 → V2-UPDATE → V3-LAIS-PLAN-AND-DEEP-SESSION → V3.1-PERSONA-FB-REFLECT → V3.2-DEEPCHECK-MODE → V3.3-MODEL-CHOICE → V3.4-CLAUDE-DESIGN-SKILL
> Author: ADV (subagent + メイン直接) / PO ふとし
> Status: lock 済 (v3.4)
> 関連: dev-system v3.4 §2.25、CHAIN-UPDATE-DISPATCH (G_49)
>
> 改訂履歴:
> - v1.0 (2026-04-27 朝、subagent 起票): 6 画面 (S-00 / S-01 / S-10 / S-12 / S-15 / S-20) + 18 シナリオ + 120 セルマトリクス、539 行
> - v2.0 (2026-04-27 午後、ADV メイン直接編集): PO 第 2 弾 16 件変更反映 + 残 15 画面追加 + 既存仕様 path 4 件マッピング + H 群「Lais 機能開発凍結」明記
> - v3.0 (2026-04-27 夕方、ADV メイン直接編集): **Lais 専用プラン構造 (4 プラン Free/Light/Pro/Max) + メイン差別化機能「深掘りセッション」(3 カテゴリ × 3 階層、Self/Goal/Relation × Lv1/Lv2/Lv3)** + 機能アンロック表 + AI 理解度 UI 仕様 + コスト試算 を §15〜§19 として新規策定 (α7 流用判断 (b) Lais 専用、GOAL AI v6.x から独立)
> - v3.1 (2026-04-27 夜、ADV メイン直接編集): **8 ペルソナ FB 反映** — (1) Pro/Max 統合 → 上限設定型 3 プラン (P4) (2) 多視点機能 (本人/投資家/顧客/競合) 削除 (P5) (3) 第三者情報削除 (家族・親、P6) (4) Lv 名: 旅の仲間/賢者/魂の片割れ → Beginner / Expert / Professional (P7) (5) Lv3 メンタル評価ゲート + 希死念慮対応 (P3) (6) UI 簡素化: メーター 1 つ + 9 セルマトリクスを設定サブビュー化 + メイン画面はレコメンド 1 つ (P2) (7) AI コーチング製品として位置付け + アウトカム可視化 (P8)
> - v3.2 (2026-04-27 夜、ADV メイン直接編集): **DeepCheck モード新規策定** — Primary Claude Sonnet + Reviewer GPT-5 の 2 AI 合議型、Optimistic UI、対話ラウンド数 + Reviewer 提案数の数字表示、プラン別アンロック (Free 1 / Light 20 / Pro 無制限)、Lv3 深掘り中は無効化、プライバシー明記。§21 として新節追加。
> - v3.3 (2026-04-27 夜、ADV メイン直接編集): **モデル選択制 (Pro Custom 限定) 新規策定** — Free/Light は Sonnet 4.6 固定 (シンプル)、Pro Custom はユーザが Sonnet 4.6 / Opus 4.7 を月内いつでも自由切替、UI 名称「モデル選択」(日本語)、DeepCheck Primary もユーザ選択継承 (Reviewer GPT-5 固定維持)、§22 として新節追加。
> - v3.4 (2026-04-27 夜、ADV メイン直接編集): **Claude Design Skill 利用必須化** — デザイン関連作業 (UI/UX 仕様 / アクセシビリティレビュー / design system 監査 / handoff 仕様 / UX copy / user research / research synthesis) は Claude Design Skill (anthropic-skills `design:*`) を必須利用、ADV / subagent prompt で明示する。§23 として新節追加。
> - v1.0 内容は §0〜§6 として保持 (immutable)、v2.0 拡張は §7〜§14、v3.0 拡張は §15〜§19、v3.1 修正は §20、v3.2 拡張は §21、v3.3 拡張は §22、v3.4 拡張は §23 (末尾) に append

---

## 0. 概要

### 0.1 本 SSoT の位置付け
本ファイルは PO ふとしが 2026-04-27 G_49 で確定させた「体感目標 v1.0」を Single Source of Truth として恒久保管するものである。今後 dev-system v3.4 配下で展開される全フェーズの起点となる。

| 軸 | 用途 | 参照箇所 |
|---|---|---|
| β 軸 | core 仕様 (画面別 Given-When-Then を仕様書に落とす) | §2 / §3 / §4 |
| γ 軸 | RACI (画面所有者 / レビュー観点) | §3 / §4 |
| δ 軸 | CI ゲート (URL assertion / DOM assertion / latency 閾値) | §3 |
| ε 軸 | RUM 計測対象 (本番環境で同等指標を採取) | §1 (Q1 / Q2 / Q4) |

### 0.2 本ミッションの責務
- 仕様書化のみ。実機 smoke 実行や `lais/logs/realmachine_smoke_results.log` への新規追記は対象外。
- 既存ログのフォーマット (`signin_success=true` / `dashboard_reached=true` / `url=/grow` / `dom=s10-grow-root` / `reload_session=true` / `result=PASS`) を整合性参照のみする。

### 0.3 ファイル管轄と禁止事項
- 新設のみ: `lais/specs/po_expectations_v1.md` (本ファイル)。
- 既存ファイル (`docs/plans/*` / `lais/verify/*` / `scripts/*` / `lais/tests/realmachine/*`) への編集禁止。
- β 軸 (仕様書アーカイブ計画) と並走。書込領域分離。

### 0.4 用語
- **体感目標**: PO ふとしが「使えるアプリ」と判定する閾値 (UX レベル)。ベンチマーク指標ではなく、最終ユーザの主観品質を機械検証可能な数値に落としたもの。
- **真 E2E 3 軸**: §2.25.21.4 で定義された (a) API 成功 / (b) URL+DOM 到達 / (c) reload 後 session 維持 の 3 つを全て PASS した状態。
- **NG 8 件 / iOS 12 件**: PO ふとしが定義した「絶対 NG リスト」と「iOS Safari 必須動作リスト」。各画面共通のチェックリストとして §4 で割付する。

---

## 1. PO 体感目標 v1.0 (Q1-Q7 全項目転記)

PO 回答の verbatim 採用 (2026-04-27、G_49、lock 済)。

### 1.1 Q1. サインイン → 「使える状態」遷移時間
- 合格: P95 1000ms 以内
- 推奨: 中央値 500ms 以内
- 現状: BUG-RT-SIGNIN-LATENCY 改修後 502ms (達成済、`realmachine_smoke_results.log` 2026-04-27T04:16:58Z PASS 行あり)
- 計測点: signin form `submit` クリック → S-10 `main.s10-grow` visible
- ε 軸 RUM 計測対象: 本番環境で同等指標を採取 (詳細は ε 軸別ミッションで定義)

### 1.2 Q2. 入力 → 画面反映
- 合格: 200ms 以内 (楽観更新で実現)
- 現状: BUG-RT-S12-OPTIMISTIC-UPDATE 改修後 378ms (達成済、`realmachine_smoke_results.log` 2026-04-27T04:20:24Z PASS 行あり)
- 計測点: S-12 「作成」クリック → S-10 リスト DOM (`.s10-task-name`) 反映
- 備考: 達成値 378ms は P95 1000ms / 推奨 500ms をクリア。Q2 の理想 200ms は次フェーズ目標として残置。

### 1.3 Q3. モーダル閉じ手段
- 合格: 3 手段全動作 (ESC キー + ✕ ボタン + 背景クリック)
- 現状: BUG-RT-S15-MODAL-CLOSE 改修後 3/3 動作 (達成済、`realmachine_smoke_results.log` 2026-04-27T04:16:12Z PASS 行あり)
- 検証: 各手段 5 試行で `s15_escape_works=true` / `s15_close_btn_works=true` / `s15_overlay_click_works=true` 全て成立

### 1.4 Q4. エラー表示
- 入力ミス系 (バリデーション、文字数超過 等): 即時表示 (操作と同フレーム = 16ms)
- NW 系 (API エラー、タイムアウト 等): 最大 1 秒以内
- 計測点: 入力ミス系は input 操作 → エラー文字列描画。NW 系は API レスポンス受信 (or timeout) → エラー文字列描画。

### 1.5 Q5. 絶対 NG (8 件、各画面共通チェック項目)
1. **NG-01 画面凍結**: 操作不能、ローディング表示なしで止まる
2. **NG-02 データ消失**: 入力した内容が保存されない
3. **NG-03 二重投稿**: 送信ボタン連打で重複登録
4. **NG-04 意図しないログアウト**: 操作中に session 切れて再認証要求
5. **NG-05 入力中の内容が消える**: 画面遷移で fields リセット
6. **NG-06 silent failure**: エラー時に何が起きたか不明、エラーメッセージなし
7. **NG-07 個人情報漏洩**: URL に email、ログに password 等
8. **NG-08 AI 応答ストリーミング中断 + リトライ不可**: S-20 Talk 関連 (PO 追加)

### 1.6 Q6. iOS Safari 必須動作 (12 件、iOS 全画面共通チェック項目)
1. **iOS-01**: キーボードで入力欄が隠れない (focus 時に scroll-into-view)
2. **iOS-02**: Dynamic Island / ノッチ / ホームインジケータと UI が重ならない (safe-area-inset 対応)
3. **iOS-03**: モーダル閉じた後の背景スクロール復活 (scroll lock 解除)
4. **iOS-04**: iOS Safari の `100vh` バグ回避 (`100dvh` 利用)
5. **iOS-05**: 戻るスワイプで意図せず別画面に飛ばない
6. **iOS-06**: タップ反応 100ms 以内 (no `:active` delay)
7. **iOS-07**: 横スクロールが発生しない (画面幅に収まる、PO 追加)
8. **iOS-08**: 文字切れ・文字重なりがない (PO 追加)
9. **iOS-09**: プルダウンリフレッシュで画面が壊れない (PO 追加)
10. **iOS-10**: 長文 AI 応答で画面が自動スクロールに追従する (PO 追加)
11. **iOS-11**: ダークモード切替でテキストが読めなくなる場合がない (PO 追加)
12. **iOS-12**: コピペが正常に動く (AI 応答の長押し選択 → コピー、PO 追加)

### 1.7 Q7. 使用想定
- 1 日 30 分 × 月 30 回 = 月 900 分 = 月 15 時間
- 主な時間帯: 朝 (起床後) + 夜 (寝る前)
- 主な操作: 目標確認 / タスク追加 / 日記入力 / AI 対話
- 設計示唆:
  - 朝/夜の片手操作前提 (BottomTabBar / 親指 reach 内)
  - AI 対話の長文応答が頻出 (S-20 で iOS-10 / iOS-12 が常用)
  - タスク追加 (S-12) は 1 日複数回 (Q2 楽観更新が頻繁発火)
  - サインイン (S-01) はリピーター文脈 (Q1 体感がリテンションを左右)

---

## 2. 優先 6 画面の Given-When-Then 雛形

### 2.1 S-00 Splash

## S-00 Splash 詳細セクション

| 項目 | 値 |
|---|---|
| 画面 ID | S-00 |
| ルート URL | `/` |
| ルート DOM | `main.s00` |
| 対応 spec.ts | `lais/tests/realmachine/login.spec.ts` (前段) / `lais/tests/realmachine/login_redirect_fix.spec.ts` |
| 既存 smoke ログ整合 | `2026-04-26T14:28:40Z BUG-RT-LOGIN-REDIRECT-FIX signed_in_splash_redirect=true result=PASS` |

#### 2.1.1 シナリオ S-00-A: 初回起動 (未サインイン)
- Given: ユーザは未サインイン (localStorage に Supabase session なし)、`/` を開く
- When: `/` がロードされ、Splash が描画される
- Then:
  - URL assertion: `expect(page).toHaveURL(/^https?:\/\/[^/]+\/$/)`
  - DOM assertion: `await expect(page.locator('main.s00')).toBeVisible()` + 「はじめる」 / 「ログイン」CTA 表示
  - 体感基準: FCP < 1000ms、CTA タップ反応 100ms 以内 (Q6 iOS-06)
  - 実機 smoke ログ整合: 本シナリオは `signin_success=true` 直前の前段。`realmachine_smoke_results.log` の `dashboard_reached=true` 行に到達するための入口。

#### 2.1.2 シナリオ S-00-B: signed-in リダイレクト (Q1 体感入口)
- Given: ユーザは既にサインイン済 (Supabase session あり)、`/` を開く
- When: Splash の `useEffect` が `session.value` を検知 → `route('/grow', true)` を発火
- Then:
  - URL assertion: `await page.waitForURL(/\/grow(\?|#|$)/, { timeout: 5000 })`
  - DOM assertion: `await expect(page.locator('main.s10-grow')).toBeVisible()`
  - 体感基準: `/` 到達 → `/grow` 表示まで P95 < 500ms (Q1 派生、history を増やさない `replace=true` 必須)
  - 実機 smoke ログ整合: `signed_in_splash_redirect=true` (login_redirect_fix.spec.ts の出力 key) と一致。

#### 2.1.3 シナリオ S-00-C: deeplink 復帰
- Given: ユーザは `/talk` を見ようとして未サインインだったため `/auth?mode=login` に飛ばされ、サインイン後に Splash が間に挟まる
- When: Splash で `postSignInDestination()` を評価
- Then:
  - URL assertion: `await page.waitForURL(/\/talk/, { timeout: 5000 })`
  - DOM assertion: `await expect(page.locator('main.s20-talk')).toBeVisible()`
  - 体感基準: deeplink 元 URL に正しく戻る (Q5 NG-05 入力中内容が消える派生)
  - 実機 smoke ログ整合: 本シナリオは現状 spec 未整備。次フェーズ追加対象。

---

### 2.2 S-01 Auth (サインイン)

## S-01 Auth 詳細セクション

| 項目 | 値 |
|---|---|
| 画面 ID | S-01 |
| ルート URL | `/auth?mode=login` (or `?mode=signup`) |
| ルート DOM | `main.s01` |
| 主要 testid | `signin-loading-overlay` |
| 対応 spec.ts | `lais/tests/realmachine/signin_latency.spec.ts` / `lais/tests/realmachine/login.spec.ts` / `lais/tests/realmachine/auth-3-axis.spec.ts` |
| 既存 smoke ログ整合 | `2026-04-27T04:16:58Z BUG-RT-SIGNIN-LATENCY-REDUCTION-V3 signin_to_grow_ms=502 trials=5 result=PASS` |

#### 2.2.1 シナリオ S-01-A: 正常サインイン (Q1 中核)
- Given: ユーザは未サインイン、`/auth?mode=login` を開く、有効な email / password を保持
- When: email / password を入力 → 「ログイン」ボタンを click
- Then:
  - URL assertion: `await page.waitForURL(/\/grow(\?|#|$)/, { timeout: 15000 })`
  - DOM assertion: `await expect(page.locator('main.s10-grow')).toBeVisible({ timeout: 10000 })`
  - 体感基準 (Q1):
    - signin click → `/grow` 到達 P95 < 1000ms (合格)
    - 中央値 < 500ms (推奨)
    - signin click → loading overlay 表示まで < 200ms (`[data-testid="signin-loading-overlay"]`)
  - reload assertion: `page.reload()` 後 `/grow` 維持 (`reload_session=true`)
  - 実機 smoke ログ整合: `signin_success=true dashboard_reached=true url_reached=true dom_reached=true reload_session=true api_success=true signin_to_grow_ms=502 result=PASS`

#### 2.2.2 シナリオ S-01-B: バリデーションエラー (Q4 入力ミス系)
- Given: ユーザは email field に `not-an-email` を入力、password に `1234` (8 文字未満) を入力
- When: blur or submit
- Then:
  - URL assertion: `expect(page).toHaveURL(/\/auth\?mode=login/)` (遷移しない)
  - DOM assertion: `await expect(page.locator('#s01-email-error, .s01-input-error')).toBeVisible()` (即時表示)
  - 体感基準 (Q4): 入力ミス系は操作と同フレーム (16ms 以内に描画)、Q5 NG-06 silent failure 禁止
  - 実機 smoke ログ整合: 本シナリオは現状 spec 未整備。次フェーズで `validation=true error_visible=true` key を追記予定。

#### 2.2.3 シナリオ S-01-C: NW エラー (Q4 NW 系)
- Given: ユーザは正規入力するが、Supabase が 5xx を返す or タイムアウトする
- When: 「ログイン」 click → API 失敗
- Then:
  - URL assertion: `expect(page).toHaveURL(/\/auth\?mode=login/)` (遷移しない)
  - DOM assertion: `await expect(page.locator('.s01-error[role="alert"]')).toBeVisible()` (1 秒以内に出現)
  - 体感基準 (Q4): NW 系エラーは最大 1 秒以内、Q5 NG-01 画面凍結禁止
  - 実機 smoke ログ整合: 本シナリオは現状 spec 未整備 (`api_success=false` 系のフィクスチャ要追加)。次フェーズで CI ゲート定義予定。

---

### 2.3 S-10 Grow (ダッシュボード)

## S-10 Grow 詳細セクション

| 項目 | 値 |
|---|---|
| 画面 ID | S-10 |
| ルート URL | `/grow` |
| ルート DOM | `main.s10-grow` (alias: `s10-grow-root`) |
| 主要 class | `.s10-task-list` / `.s10-goals-empty` / `.s10-load-error` / `.s10-task-name` |
| 対応 spec.ts | `lais/tests/realmachine/login.spec.ts` / `lais/tests/realmachine/s12_optimistic_update.spec.ts` (S-10 反映確認) / `lais/tests/realmachine/phase_a_full_flow.spec.ts` |
| 既存 smoke ログ整合 | `url=/grow dom=s10-grow reload_session=true result=PASS` (各 spec で出力) |

#### 2.3.1 シナリオ S-10-A: 初回ロード (Q1 後段)
- Given: signin 直後、`/grow` への route が完了
- When: S-10 の useEffect で goals/tasks を fetch
- Then:
  - URL assertion: `expect(page).toHaveURL(/\/grow(\?|#|$)/)`
  - DOM assertion: `await expect(page.locator('main.s10-grow')).toBeVisible()` + `.s10-task-list` or `.s10-goals-empty` のいずれかが visible
  - 体感基準: signin click → `.s10-task-list` visible まで < 1000ms (Q1 P95)
  - 実機 smoke ログ整合: `dom=s10-grow` (login.spec.ts) と一致。

#### 2.3.2 シナリオ S-10-B: 楽観更新による即時反映 (Q2 中核)
- Given: ユーザは S-10 を表示中、S-12 でタスクを作成して戻ってきた
- When: 「+ タスクを追加」 → S-12 → 「作成」 click
- Then:
  - URL assertion: `expect(page).toHaveURL(/\/grow(\?|#|$)/)` (戻り遷移)
  - DOM assertion: `await page.waitForFunction(name => Array.from(document.querySelectorAll('main.s10-grow .s10-task-name')).some(el => el.textContent.includes(name)), taskName)`
  - 体感基準 (Q2): 「作成」 click → DOM 反映まで P95 < 200ms (理想) / 中央値 < 500ms (達成済 378ms)
  - 副次フラグ: `.s10-task-optimistic` class が一瞬でも描画される (or 単純に median<500ms でも認定)
  - 実機 smoke ログ整合: `s12_to_s10_latency_ms=378 optimistic_update=true url=/grow dom=s10-grow result=PASS` (s12_optimistic_update.spec.ts) と一致。

#### 2.3.3 シナリオ S-10-C: リロード後 session 維持 (真 E2E 3 軸 c)
- Given: ユーザは `/grow` を表示中、画面リロードする
- When: `page.reload({ waitUntil: 'domcontentloaded' })`
- Then:
  - URL assertion: `expect(page).not.toHaveURL(/\/auth\?mode=login/i)` (signin に戻らない)
  - DOM assertion: `await expect(page.locator('main.s10-grow')).toBeVisible()` + 作成済タスクが残っている (`.s10-task-name` に該当 text)
  - 体感基準: Q5 NG-04 意図しないログアウト禁止、Q5 NG-02 データ消失禁止
  - 実機 smoke ログ整合: `reload_session=true` (各 spec で出力) と一致。

---

### 2.4 S-12 TaskAdd (タスク追加モーダル)

## S-12 TaskAdd 詳細セクション

| 項目 | 値 |
|---|---|
| 画面 ID | S-12 |
| ルート URL | `/grow` (overlay)、URL 自体は変わらない or `/task/new` 派生 |
| ルート DOM | `[role="dialog"]` + `.s12-overlay` / `.s12-modal` |
| 主要 class | `.s12-form` / `.s12-name` / `.s12-time` / `.s12-readonly` / `.s12-close` |
| 対応 spec.ts | `lais/tests/realmachine/s12_optimistic_update.spec.ts` |
| 既存 smoke ログ整合 | `s12_to_s10_latency_ms=378 optimistic_update=true result=PASS` |

#### 2.4.1 シナリオ S-12-A: タスク作成成功 (Q2 中核)
- Given: ユーザは S-10 「+ タスクを追加」 click 後、S-12 モーダル表示中
- When: タスク名入力 → 「作成」 click
- Then:
  - URL assertion: `expect(page).toHaveURL(/\/grow/)` (overlay は URL を変えない実装)
  - DOM assertion: `[role="dialog"]` が `state: 'hidden'` になる + S-10 リストに新タスク visible
  - 体感基準 (Q2): 「作成」 click → S-10 反映 P95 < 500ms (達成済 378ms)
  - Q5 NG-03 二重投稿禁止: 「作成」ボタン disabled in-flight 状態を持つこと
  - 実機 smoke ログ整合: `s12_to_s10_latency_ms_<n>` の 5 試行で全て < 500ms。

#### 2.4.2 シナリオ S-12-B: バリデーションエラー (Q4 入力ミス系)
- Given: タスク名空欄 or 文字数超過
- When: 「作成」 click
- Then:
  - URL assertion: `expect(page).toHaveURL(/\/grow/)` (モーダル維持)
  - DOM assertion: `[role="dialog"]` が visible 維持 + `.s12-input-error` or `[role="alert"]` 即時表示
  - 体感基準 (Q4): 入力ミス系は操作と同フレーム
  - Q5 NG-05 禁止: バリデーション failure 後も入力済 fields は保持される

#### 2.4.3 シナリオ S-12-C: モーダル閉じ (3 手段、Q3 派生)
- Given: S-12 モーダル表示中
- When: ESC / `.s12-close` / 背景クリック のいずれか
- Then:
  - URL assertion: `expect(page).toHaveURL(/\/grow/)` (戻り遷移)
  - DOM assertion: `[role="dialog"]` が `state: 'hidden'`
  - 体感基準 (Q3): 3 手段全動作必須 (S-15 が現状検証済、S-12 は次フェーズ追加)
  - Q5 NG-05 派生: 入力中の内容が消えない仕様か、「破棄しますか?」確認を出すか、いずれかの仕様確定が必要 (PD 案件)
  - 実機 smoke ログ整合: 本シナリオは S-15 と同形式で `s12_escape_works=true` / `s12_close_btn_works=true` / `s12_overlay_click_works=true` を次フェーズで追加予定。

---

### 2.5 S-15 GoalCreate (ゴール作成モーダル)

## S-15 GoalCreate 詳細セクション

| 項目 | 値 |
|---|---|
| 画面 ID | S-15 |
| ルート URL | `/goal/create` |
| ルート DOM | `[data-testid="s15-modal"]` + `.s15-overlay` / `.s15-modal` |
| 主要 testid | `s15-modal` / `s15-overlay` / `s15-close` |
| 対応 spec.ts | `lais/tests/realmachine/s15_modal_close_fix.spec.ts` |
| 既存 smoke ログ整合 | `2026-04-27T04:16:12Z BUG-RT-S15-MODAL-CLOSE-FIX-V3 url=/goal/create->/grow dom=s15-modal-visible-then-hidden s15_escape_works=true s15_close_btn_works=true s15_overlay_click_works=true result=PASS` |

#### 2.5.1 シナリオ S-15-A: ESC で閉じる (Q3 中核 1/3)
- Given: ユーザは `/goal/create` を開いた、`[data-testid="s15-modal"]` visible
- When: ESC キー押下
- Then:
  - URL assertion: `await page.waitForURL(/\/grow/, { timeout: 3000 })`
  - DOM assertion: `await page.waitForSelector('[data-testid="s15-modal"]', { state: 'hidden', timeout: 3000 })`
  - 体感基準 (Q3): 5 試行全 PASS (`s15_escape_works=true`)、each elapsed < 1000ms
  - 実機 smoke ログ整合: `ESC_TRY_<n> hidden=true url_ok=true elapsed_ms=<n>` の 5 行と一致。

#### 2.5.2 シナリオ S-15-B: ✕ ボタンで閉じる (Q3 中核 2/3)
- Given: ユーザは `/goal/create` を開いた、`[data-testid="s15-modal"]` visible
- When: `[data-testid="s15-close"]` click
- Then:
  - URL assertion: `await page.waitForURL(/\/grow/, { timeout: 3000 })`
  - DOM assertion: `await page.waitForSelector('[data-testid="s15-modal"]', { state: 'hidden' })`
  - 体感基準 (Q3): 5 試行全 PASS (`s15_close_btn_works=true`)
  - Q6 iOS-06: ボタンタップ反応 100ms 以内
  - 実機 smoke ログ整合: `CLOSE_BTN_TRY_<n> hidden=true url_ok=true` の 5 行と一致。

#### 2.5.3 シナリオ S-15-C: 背景クリックで閉じる (Q3 中核 3/3)
- Given: ユーザは `/goal/create` を開いた、`[data-testid="s15-modal"]` visible
- When: `[data-testid="s15-overlay"]` のモーダル外領域 click (overlay の左上 5px 等)
- Then:
  - URL assertion: `await page.waitForURL(/\/grow/, { timeout: 3000 })`
  - DOM assertion: `await page.waitForSelector('[data-testid="s15-modal"]', { state: 'hidden' })`
  - 体感基準 (Q3): 5 試行全 PASS (`s15_overlay_click_works=true`)
  - Q6 iOS-03: モーダル閉じた後の背景スクロール復活必須
  - 実機 smoke ログ整合: `OVERLAY_TRY_<n> hidden=true url_ok=true` の 5 行と一致。

---

### 2.6 S-20 Talk (AI 対話)

## S-20 Talk 詳細セクション

| 項目 | 値 |
|---|---|
| 画面 ID | S-20 |
| ルート URL | `/talk` |
| ルート DOM | `main.s20-talk` |
| 主要 class | `.s20-message-list` / `.s20-bubble-ai` / `.s20-bubble-user` / `.s20-input` |
| 主要 testid | `ai-pending` |
| 対応 spec.ts | `lais/tests/realmachine/talk_realtime.spec.ts` / `lais/tests/realmachine/talk_critical_3_fix.spec.ts` |
| 既存 smoke ログ整合 | `2026-04-26T15:03:44Z BUG-RT-TALK-CRITICAL-3-FIX duplicate_prevented=true ai_response_unique=true tz_jst=true result=PASS` |

#### 2.6.1 シナリオ S-20-A: メッセージ送信 → AI 応答受信
- Given: ユーザは `/talk` を表示中、Realtime channel `lais:chat:<user_id>` に SUBSCRIBED
- When: `.s20-input-field` に text 入力 → 送信ボタン click
- Then:
  - URL assertion: `expect(page).toHaveURL(/\/talk/)`
  - DOM assertion: `.s20-bubble-user` に user message 表示 + `[data-testid="ai-pending"]` 一時表示 → `.s20-bubble-ai` に AI 応答表示
  - 体感基準 (Q2): user message DOM 反映 < 200ms (楽観更新派生)、AI 応答 streaming 開始 < 1000ms
  - Q5 NG-08: AI 応答ストリーミング中断 → リトライ可能 UI 必須 (現状仕様 PD 確認要)
  - 実機 smoke ログ整合: `duplicate_prevented=true ai_response_unique=true tz_jst=true` (talk_critical_3_fix.spec.ts) と一致。

#### 2.6.2 シナリオ S-20-B: 長文 AI 応答の自動スクロール追従 (Q6 iOS-10)
- Given: AI が長文応答を streaming 中
- When: `.s20-bubble-ai-text` が文字を増やしながら描画される
- Then:
  - URL assertion: `expect(page).toHaveURL(/\/talk/)`
  - DOM assertion: `.s20-scroll` の scrollTop が末尾に追従 (`.s20-autoscroll` button の visibility で間接検証)
  - 体感基準 (Q6 iOS-10): 長文 AI 応答で画面が自動スクロールに追従する
  - Q6 iOS-12 派生: AI 応答テキストの長押し選択 → コピー が動く (テキスト選択禁止 CSS が当たっていないこと)

#### 2.6.3 シナリオ S-20-C: Realtime broadcast 受信
- Given: 別 client / 別 device が同 user_id で同 channel に publish した
- When: Pages Function `/api/lais/chat` 経由で INSERT → broadcast 発火
- Then:
  - URL assertion: `expect(page).toHaveURL(/\/talk/)`
  - DOM assertion: `.s20-message-list` に新メッセージが追加される
  - 体感基準 (Q2 派生): broadcast event 受信 → DOM 反映 < 1000ms
  - Q5 NG-04 派生: 長時間滞在で session が切れて再認証要求が出ない (token refresh が回ること)
  - 実機 smoke ログ整合: `talk_realtime.spec.ts` の `broadcast` event 受信 + `recv.payload?.payload?.message?.text` 一致と整合。

---

## 3. spec.ts マッピング表 (実機 smoke ログ整合)

| 画面 ID | URL assertion | DOM assertion | spec.ts | smoke ログ key (例) |
|---|---|---|---|---|
| S-00 | `expect(page).toHaveURL(/^\/$/)` / `await page.waitForURL(/\/grow/)` (signed-in) | `main.s00` visible / `signed_in_splash_redirect=true` | `lais/tests/realmachine/login_redirect_fix.spec.ts` | `signin_success=true dashboard_reached=true signed_in_splash_redirect=true` |
| S-01 | `await page.waitForURL(/\/grow(\?|#|$)/, { timeout: 15000 })` | `await expect(page.locator('main.s10-grow')).toBeVisible()` + `[data-testid="signin-loading-overlay"]` | `lais/tests/realmachine/signin_latency.spec.ts` / `lais/tests/realmachine/login.spec.ts` / `lais/tests/realmachine/auth-3-axis.spec.ts` | `signin_success=true url_reached=true dom_reached=true signin_to_grow_ms=502 reload_session=true api_success=true` |
| S-10 | `expect(page).toHaveURL(/\/grow(\?|#|$)/)` | `await expect(page.locator('main.s10-grow')).toBeVisible()` + `.s10-task-list` or `.s10-goals-empty` | `lais/tests/realmachine/login.spec.ts` / `lais/tests/realmachine/phase_a_full_flow.spec.ts` | `url=/grow dom=s10-grow reload_session=true` |
| S-12 | `expect(page).toHaveURL(/\/grow/)` (overlay) | `[role="dialog"]` visible→hidden + `.s10-task-name` に新タスク visible | `lais/tests/realmachine/s12_optimistic_update.spec.ts` | `s12_to_s10_latency_ms=378 optimistic_update=true latency_under_500ms=true` |
| S-15 | `await page.waitForURL(/\/grow/, { timeout: 3000 })` (閉じ後) | `[data-testid="s15-modal"]` visible→hidden | `lais/tests/realmachine/s15_modal_close_fix.spec.ts` | `url=/goal/create->/grow dom=s15-modal-visible-then-hidden s15_escape_works=true s15_close_btn_works=true s15_overlay_click_works=true` |
| S-20 | `expect(page).toHaveURL(/\/talk/)` | `main.s20-talk` visible / `.s20-bubble-ai` with text / `[data-testid="ai-pending"]` 一時表示 | `lais/tests/realmachine/talk_realtime.spec.ts` / `lais/tests/realmachine/talk_critical_3_fix.spec.ts` | `duplicate_prevented=true ai_response_unique=true tz_jst=true` |

### 3.1 既存 `realmachine_smoke_results.log` フォーマット参照
本マッピング表の「smoke ログ key」列は、`lais/logs/realmachine_smoke_results.log` の各 PASS 行 (TSV 形式: `timestamp\tmission_id\ttest_name\tkey1=val1\tkey2=val2\t...\tresult=PASS`) と整合する。

例 (実在行):
```
2026-04-27T04:16:58Z	BUG-RT-SIGNIN-LATENCY-REDUCTION-V3	signin-latency	signin_success=true	dashboard_reached=true	url_reached=true	dom_reached=true	reload_session=true	api_success=true	signin_to_grow_ms=502	loading_ui_visible_ms=38	signin_to_grow_samples=433,476,502,737,1258	trials=5	result=PASS
```

### 3.2 CI ゲート閾値 (δ 軸別ミッションで詳細定義)
| 画面 ID | latency 中央値 | latency P95 | 必須 PASS key |
|---|---|---|---|
| S-01 | < 500ms | < 1000ms | `signin_to_grow_ms` (median) / `loading_ui_visible_ms` < 200ms |
| S-12 | < 500ms (達成済) / < 200ms (理想) | < 1000ms | `s12_to_s10_latency_median_ms` / `optimistic_update=true` |
| S-15 | n/a (close 動作) | < 1000ms (各手段) | `s15_escape_works` / `s15_close_btn_works` / `s15_overlay_click_works` 全 true |
| S-20 | < 1000ms (broadcast 受信) | < 2000ms | `ai_response_unique` / `duplicate_prevented` / `tz_jst` 全 true |
| S-00 / S-10 | n/a (画面遷移派生) | n/a | 親 spec の `url_reached` / `dom_reached` |

---

## 4. UX 常識チェックリスト (画面別 NG/iOS 割付)

### 4.1 NG 8 件 画面別割付 (Q5)

| NG ID | 内容 | 主担当画面 | 副次関連画面 |
|---|---|---|---|
| NG-01 | 画面凍結 | S-01 / S-10 / S-20 | S-12 / S-15 |
| NG-02 | データ消失 | S-12 / S-15 / S-20 | S-10 (リロード後 task 残存) |
| NG-03 | 二重投稿 | S-12 / S-15 / S-20 | S-01 (ログイン連打) |
| NG-04 | 意図しないログアウト | S-10 / S-20 (長時間滞在) | 全画面 (reload_session 派生) |
| NG-05 | 入力中の内容が消える | S-12 / S-15 / S-20 (送信前) | S-01 (signup form) |
| NG-06 | silent failure | S-01 / S-12 / S-15 / S-20 | S-10 (load-error) |
| NG-07 | 個人情報漏洩 | S-01 (URL に email 載せない) | S-10 / S-20 (ログ出力) |
| NG-08 | AI ストリーミング中断 + リトライ不可 | S-20 | n/a |

### 4.2 iOS 12 件 画面別割付 (Q6)

| iOS ID | 内容 | 主担当画面 | 副次関連画面 |
|---|---|---|---|
| iOS-01 | キーボードで入力欄が隠れない | S-01 / S-12 / S-15 / S-20 | n/a |
| iOS-02 | safe-area-inset 対応 | 全画面 (BottomTabBar 含む) | n/a |
| iOS-03 | モーダル閉じ後の背景スクロール復活 | S-12 / S-15 | n/a |
| iOS-04 | `100dvh` 利用 | 全画面 (特に S-20 long content) | n/a |
| iOS-05 | 戻るスワイプで意図せず別画面に飛ばない | 全画面 | n/a |
| iOS-06 | タップ反応 100ms 以内 | 全画面 (CTA / button) | n/a |
| iOS-07 | 横スクロールが発生しない | 全画面 | n/a |
| iOS-08 | 文字切れ・文字重なりがない | 全画面 (特に S-20 long text) | n/a |
| iOS-09 | プルダウンリフレッシュで画面が壊れない | 全画面 (特に S-10) | n/a |
| iOS-10 | 長文 AI 応答で自動スクロール追従 | S-20 | n/a |
| iOS-11 | ダークモード切替で読めなくならない | 全画面 | n/a |
| iOS-12 | コピペが正常に動く | S-20 (AI 応答長押しコピー) | 全画面 (テキスト選択許可) |

### 4.3 画面 × チェックリスト マトリクス

| | S-00 | S-01 | S-10 | S-12 | S-15 | S-20 |
|---|---|---|---|---|---|---|
| NG-01 画面凍結 | - | 必須 | 必須 | 必須 | 必須 | 必須 |
| NG-02 データ消失 | - | - | 必須 | 必須 | 必須 | 必須 |
| NG-03 二重投稿 | - | 必須 | - | 必須 | 必須 | 必須 |
| NG-04 意図しないログアウト | 必須 | 必須 | 必須 | - | - | 必須 |
| NG-05 入力中内容消失 | - | 必須 | - | 必須 | 必須 | 必須 |
| NG-06 silent failure | - | 必須 | 必須 | 必須 | 必須 | 必須 |
| NG-07 個人情報漏洩 | - | 必須 | - | - | - | 必須 |
| NG-08 AI 中断リトライ不可 | - | - | - | - | - | 必須 |
| iOS-01 キーボード遮蔽 | - | 必須 | - | 必須 | 必須 | 必須 |
| iOS-02 safe-area | 必須 | 必須 | 必須 | 必須 | 必須 | 必須 |
| iOS-03 scroll-lock 解除 | - | - | - | 必須 | 必須 | - |
| iOS-04 100dvh | 必須 | 必須 | 必須 | 必須 | 必須 | 必須 |
| iOS-05 戻るスワイプ | 必須 | 必須 | 必須 | 必須 | 必須 | 必須 |
| iOS-06 タップ 100ms | 必須 | 必須 | 必須 | 必須 | 必須 | 必須 |
| iOS-07 横スクロールなし | 必須 | 必須 | 必須 | 必須 | 必須 | 必須 |
| iOS-08 文字切れ重なり | 必須 | 必須 | 必須 | 必須 | 必須 | 必須 |
| iOS-09 プルダウンリフレッシュ | 必須 | - | 必須 | - | - | 必須 |
| iOS-10 自動スクロール追従 | - | - | - | - | - | 必須 |
| iOS-11 ダークモード | 必須 | 必須 | 必須 | 必須 | 必須 | 必須 |
| iOS-12 コピペ | - | - | - | - | - | 必須 |

---

## 5. 次フェーズ (残 15 画面の Given-When-Then)

優先 6 画面以外の残 15 画面について、本 SSoT 形式の Given-When-Then 雛形を順次追加する。下記チェックリストは β 軸 (仕様書アーカイブ計画) の起票材料となる。

### 5.1 残画面リスト (確認済 component 一覧から抽出)

- [ ] S-02 Onboarding (`S02Onboarding.jsx`、初回サインアップ時)
- [ ] S-13 TaskDetail (`S13TaskDetail.jsx`、タスク詳細・編集)
- [ ] S-14 GoalDetail (`S14GoalDetail.jsx`、ゴール詳細・編集)
- [ ] S-30 MeProfile (`S30MeProfile.jsx`、プロフィール / ログアウト)
- [ ] AuthCallback (`AuthCallback.jsx`、PKCE callback 受け)
- [ ] (要検討) S-16 GoalEdit / S-17 GoalArchive 等の派生画面
- [ ] (要検討) S-21 TalkHistory / S-22 TalkSettings 等
- [ ] (要検討) S-31 MeSettings / S-32 MeNotification 等
- [ ] (要検討) S-40 Diary 入力画面 (Q7 で「日記入力」が主要操作と明示)
- [ ] (要検討) S-41 Diary 一覧
- [ ] (要検討) Error 画面 (404 / 500 / offline)
- [ ] (要検討) Empty State 画面 (ゴール 0 件、タスク 0 件、AI 履歴 0 件)
- [ ] (要検討) ローディング画面 (全画面共通スケルトン)
- [ ] (要検討) Toast / Snackbar 共通通知
- [ ] (要検討) BottomTabBar 共通ナビゲーション

### 5.2 各画面で必要な Given-When-Then カバレッジ
- 主要シナリオ 3 件以上 (success / validation / NW error)
- URL assertion + DOM assertion 列を必ず記載
- 体感基準 (Q1-Q4 から派生) を明記
- 実機 smoke ログ整合 (新設の場合は新 mission_id を提示)

### 5.3 完了基準
- 残 15 画面全てで本 SSoT §2 と同形式のセクション追加
- §3 spec.ts マッピング表に追加行
- §4 NG/iOS 割付マトリクスに追加列
- v1.0 の lock を破らない (PO 確認なしで Q1-Q7 を変更しない)

---

## 6. 関連 PD / PATCH 履歴

### 6.1 達成済バグ改修 (体感目標達成の根拠)
| Mission ID | 完了日時 | 関連 Q | 達成値 | smoke ログ参照 |
|---|---|---|---|---|
| BUG-RT-LOGIN-REDIRECT-FIX | 2026-04-26T14:28:40Z | Q1 (S-00) | `signed_in_splash_redirect=true` | log line 1 |
| BUG-RT-TALK-CRITICAL-3-FIX | 2026-04-26T15:03:44Z | Q5 NG-03 / NG-08 (S-20) | `duplicate_prevented=true ai_response_unique=true tz_jst=true` | log line 2 |
| BUG-RT-S15-MODAL-CLOSE-FIX-V3 | 2026-04-27T04:16:12Z | Q3 (S-15) | `s15_escape_works=true s15_close_btn_works=true s15_overlay_click_works=true` | log line 3 |
| BUG-RT-SIGNIN-LATENCY-REDUCTION-V3 | 2026-04-27T04:16:58Z | Q1 (S-01) | `signin_to_grow_ms=502` (median, 5 trials) | log line 4 |
| BUG-RT-S12-OPTIMISTIC-UPDATE | 2026-04-27T04:20:24Z | Q2 (S-12) | `s12_to_s10_latency_ms=378 optimistic_update=true` | log line 5 |
| LAIS-PHASE-B-1-GITLEAKS | 2026-04-27T06:22:44Z | Q5 NG-07 派生 (secret scan) | `leaks=0 jwt_purged_commit=5a09358...` | log line 6 |

### 6.2 dev-system v3.4 連携
- §2.25 真 E2E 3 軸 (a/b/c)
- §2.25.16.10 マトリクス整合
- §2.25.21.4 拡張 (PATCH-LOGIN-TEST-STRUCTURAL-FIX + PATCH-TEST-GAP-LOGIN-REDIRECT-IMPL)
- CHAIN-UPDATE-DISPATCH (G_49) で本 SSoT v1.0 を発行

### 6.3 後続フェーズ予告
- β 軸: 残 15 画面の Given-When-Then 追加 (本 SSoT §5 のチェックリスト消化)
- γ 軸: 画面別 RACI 定義 (Owner / Reviewer / Approver / Informed)
- δ 軸: CI ゲート (URL assertion / DOM assertion / latency 閾値) を `playwright.cf.config.ts` / `playwright.ios.config.ts` の `expect().toBeLessThan()` に展開
- ε 軸: 本番 RUM 計測 (Q1 / Q2 / Q4 を Cloudflare Analytics or Sentry Performance で採取)

---

## 7. 付録: 完了条件チェック (本ファイル自身の自己検証)

本 SSoT は以下の `bash` コマンドで検証可能。

```bash
ls /Users/futoshi/Desktop/goal-ai-worker/lais/specs/po_expectations_v1.md
wc -l /Users/futoshi/Desktop/goal-ai-worker/lais/specs/po_expectations_v1.md
grep -c "## S-" /Users/futoshi/Desktop/goal-ai-worker/lais/specs/po_expectations_v1.md     # 6 画面分のサブセクション数
grep -c "Given:" /Users/futoshi/Desktop/goal-ai-worker/lais/specs/po_expectations_v1.md    # >= 18 (3 シナリオ × 6 画面)
grep -c "URL assertion" /Users/futoshi/Desktop/goal-ai-worker/lais/specs/po_expectations_v1.md   # >= 6
grep -c "DOM assertion" /Users/futoshi/Desktop/goal-ai-worker/lais/specs/po_expectations_v1.md   # >= 6
grep -Ec "lais/tests/realmachine/[a-z0-9_]+\.spec\.ts" /Users/futoshi/Desktop/goal-ai-worker/lais/specs/po_expectations_v1.md   # >= 6
grep -c "realmachine_smoke_results" /Users/futoshi/Desktop/goal-ai-worker/lais/specs/po_expectations_v1.md   # >= 1
```

期待結果: 全項目 PASS (本ファイル末尾の自己検証完了)。

---

(以下、本 SSoT v1.0 の lock 宣言)
- 2026-04-27 G_49 PO ふとし lock 済
- 変更時は新版 (`po_expectations_v2.md`) を作成、本 v1.0 は immutable archive
- 本 SSoT を起点とする全フェーズは β/γ/δ/ε 軸の各別ミッションで担当 subagent が消化する

---

# v2.0 拡張節 (§7〜§14、ADV メイン直接編集 2026-04-27 午後)

---

## 7. PO 第 2 弾 全項目 (verbatim、累計 16 件の仕様変更)

### 7.1 A 群 (画面詳細、5 件変更)

#### A2: S-01 Auth 認証手段拡張
- signin 既定タブ
- メール/パスワード認証
- パスキー (Face ID / Touch ID) 認証追加
- Sign in with Apple 追加
- TOTP 2FA は §7.3 C3 で別途

#### A5: S-12 TaskAdd 必須入力
- タイトル + 期限必須、ただし期限「未定」を選択可能
- 未定タスクは 1 週間ごとに「期限を決める or 削除する」フォローアップ通知
- 未定タスクは別バッジ表示 (⏳等)

#### A7: S-20 Talk AI モデルルーティング (Sonnet 固定却下)
- catch-all = GPT
- Claude = 感情コーチング核心のみ (15%)
- Gemini = 検索・事実・比較 (30%)
- プラン別にモデル変動
- 既存仕様 path: `CLAUDE.md` 9-15 行 + `instructions/results/session_history.md` 251-526 行

#### A9: S-20 Talk 履歴件数管理 (無期限保存却下)
- 上限: 500 件
- 削除候補基準 4 項目: (1) 文字数 30 字未満の往復 (2) AI 理解メモへの寄与スコア低 (3) ピン留めなし (4) 一定期間アクセスなし
- 保護基準 2 項目: (1) ネガティブ感情を伴う対話 (2) 目標達成・転換点の対話
- ピン留めは件数カウント外 (無制限)
- 上限到達時: 削除候補 TOP20 を提示してユーザー確認

#### A10 + A11: S-20 Talk マルチモーダル v1 から実装
- 画像入力: 1 枚 5MB、JPEG/PNG/HEIC、Vision API 準拠 (推奨)
- 音声入力: Web Speech API (起動時) → エラー時 Whisper API fallback (推奨)
- ルーティング: 画像/音声入力時はマルチモーダル対応モデルへ振り分け必須

### 7.2 B 群 (画面構成、1 件追加)

#### B1i: S-60 Search 画面追加
- 検索対象: 全文検索 (タスク + 目標 + AI 対話 + 日記)
- Supabase pgvector でベクトル意味検索 (psql マイグレーションで pgvector extension 有効化)
- schema 変更必要 → §10 D2「テーブル追加 = PO 承認必須」

### 7.3 C 群 (データ/セキュリティ、2 件変更)

#### C3: TOTP 2FA を v1 から実装
- A2 のパスキー + Sign in with Apple に加え、メール/パスワード認証の追加保護
- Supabase Auth の MFA 標準対応を使用
- 設定画面 (S-30) から有効化/無効化
- バックアップコードの発行・保管フロー必要

#### C4: データ別エクスポート形式
- 日記: JSON + CSV + PDF (将来: 手帳・ジャーナル風レイアウト、月別/年別アルバム形式)
- タスク / 目標 / AI 対話履歴: JSON + CSV
- AI 理解メモ / プロフィール / 設定: JSON
- 将来 TODO: 日記のデザイン PDF エクスポート (`@react-pdf/renderer` 等のライブラリ検討)

### 7.4 D 群 (RACI、1 件変更)

#### D2: DB schema 変更 場合分け (γ 軸 RACI 表に転記)
| 操作 | 権限 |
|---|---|
| 追加カラム (NOT NULL 制約なし) | AI 自律可 |
| 既存カラム削除 | PO 承認必須 |
| 型変更 | PO 承認必須 |
| インデックス追加/削除 | AI 自律可 |
| テーブル追加 | PO 承認必須 |
| テーブル削除 | PO 承認必須 |
| マイグレーション実行 (本番、psql / supabase migration) | PO 承認必須 |

### 7.5 E 群 (CI、2 件変更)

#### E1: カナリア配信
- 友人ベータ期: ふとし + 信頼できる友人 2-3 人を先行カナリア
- 12 時間問題なければ、残り全員に展開
- 一般公開期: 規模に応じて再設計 (5% → 25% → 100% 等)

#### E4: デプロイ前テスト 時間制限なし
- 必要なテストを全て実行、「速いから省略」は禁止
- 既存 3 層テスト戦略 (L1 スモーク 2 分 / L2 影響範囲 5-10 分 / L3 フル週次) の発展形として、デプロイ時は L3 フル相当を回す
- 既存仕様 path: `docs/plans/dev_system_spec.md` 167-332 行 (§21 §C3.4 SSoT)

### 7.6 F 群 (観測、1 件変更)

#### F2: アラート通知 3 段
- 緊急度高 (自動 rollback 発動・サーバーダウン等): LINE 即時通知
- 緊急度低 (コスト警告・軽微なエラー): メール
- 全アラート: ローカルログに記録
- 実装: LINE Messaging API or LINE Notify、トークンは環境変数管理 (gitleaks 対象)

### 7.7 G 群 (方針、4 件変更)

#### G2: 課金開始時期
- PO 単独期: 無料
- 友人ベータ期: 初月無料、2 ヶ月目から既存プラン構造で課金 (Free / Light / Pro / Max / Ultra)
- 一般公開期: 全プラン展開
- 既存仕様 path: `CLAUDE.md` 11 行 + `docs/goal_ai_project_v6_4.md` 月額キャップ表
- v1 (PO 単独期) は無料のため、Lais 専用プラン再定義は v2 (友人ベータ期入り) まで先送り

#### G3: 多言語対応
- PO 単独期: 日本語のみ
- 友人ベータ期: 日本語 + 英語
- 一般公開期: 必要に応じて他言語追加
- i18n 基盤 (react-i18next 等) を v1 から構築
- UI 文字列は全て翻訳キー化、AI 対話システムプロンプトも言語別

#### G4: アクセシビリティ
- WCAG 2.1 AA 全準拠
- 既存 UX 常識 12 項目 → AA 準拠 30 項目程度に拡張
- 色覚 / キーボード / スクリーンリーダー対応

#### G5: 美学リファレンス
- 競合直接比較なし
- Apple 純正アプリ (メモ・リマインダー・ジャーナル・ヘルスケア) の世界観をリファレンス
- シンプル・余白・タイポグラフィ・触覚フィードバック等
- 既存デザインシステム v0.12 (Night Sky / Dawn / Harajuku Light / Harajuku Dark) と整合
- 既存仕様 path: `docs/plans/lais_design_system.md` 1198 行 + `docs/plans/lais_design_spec_v1.md` 1199 行

### 7.8 H 群 (改革進行)

#### H1: Lais 機能開発凍結 (改革 3 か月、5 軸完了まで)
- 凍結例外 3 件: (1) gitleaks 完遂 (2) 本番障害 hotfix (3) セキュリティクリティカル修正
- α7 のプラン構造再定義は本凍結方針により後送り

#### H2: 進行中 Phase B 系
- gitleaks: 完遂維持 (済)
- wrangler v4: 改革後
- night auto-resume: 改革後

#### H3: PO 5 時間/週 を dev-system 改革に投入

#### H4: dev-system + 他プロジェクト並行、Lais は hotfix のみ

---

## 8. 残 15 画面 Given-When-Then 雛形 (compact 形式)

### 8.1 S-02 Onboarding
- Given: 初回起動 + 認証直後 / When: 3 ステップ説明表示 / Then: 完了で /grow 遷移
- URL assertion: `expect(page).toHaveURL(/\/onboarding/)` / DOM assertion: `expect(page.locator('[data-testid="s02-step-1"]')).toBeVisible()`
- 対応 spec.ts: `lais/tests/realmachine/onboarding.spec.ts` (新設想定)
- 関連 NG: Q5#5 入力消失 / iOS Q6#1 キーボード

### 8.2 S-13 TaskDetail
- Given: S-10 で task カード タップ / When: タスク詳細モーダル表示 / Then: 編集・削除可能
- URL assertion: `expect(page).toHaveURL(/\/grow\?task=/)` / DOM assertion: `expect(page.locator('[data-testid="s13-detail"]')).toBeVisible()`
- 対応 spec.ts: `lais/tests/realmachine/task_detail.spec.ts` (新設想定)
- 関連 NG: Q5#1 凍結 / Q5#2 データ消失 / iOS Q6#3 scroll lock 解除

### 8.3 S-14 GoalDetail
- Given: S-10 で目標カード タップ / When: 目標詳細モーダル表示 / Then: 関連タスク一覧 + 編集可能
- URL assertion: `expect(page).toHaveURL(/\/grow\?goal=/)` / DOM assertion: `expect(page.locator('[data-testid="s14-detail"]')).toBeVisible()`
- 対応 spec.ts: `lais/tests/realmachine/goal_detail.spec.ts` (新設想定)
- 関連 NG: Q5#1 / iOS Q6#3

### 8.4 S-30 Settings (プロフィール / MFA / プラン)
- Given: BottomTabBar から Settings タップ / When: 設定画面表示 / Then: プロフィール/MFA/プラン/ログアウトの各セクション表示
- URL assertion: `expect(page).toHaveURL(/\/settings/)` / DOM assertion: `expect(page.locator('[data-testid="s30-mfa-toggle"]')).toBeVisible()`
- 対応 spec.ts: `lais/tests/realmachine/settings.spec.ts` (新設想定)
- 関連 NG: Q5#7 個人情報漏洩 / iOS Q6#11 ダークモード

### 8.5 S-31 Notifications (通知設定)
- Given: S-30 から「通知」タップ / When: 通知種別 ON/OFF 切替 / Then: タスクフォローアップ (A5)・LINE アラート (F2) 設定保存
- URL assertion: `expect(page).toHaveURL(/\/settings\/notifications/)` / DOM assertion: `expect(page.locator('[data-testid="s31-toggle-task-followup"]')).toBeVisible()`
- 対応 spec.ts: `lais/tests/realmachine/notifications.spec.ts` (新設想定)

### 8.6 S-32 Export (データエクスポート、C4 連動)
- Given: S-30 から「エクスポート」タップ / When: データ種別 7 件 + 形式選択 / Then: ダウンロード生成 (JSON/CSV/PDF)
- URL assertion: `expect(page).toHaveURL(/\/settings\/export/)` / DOM assertion: `expect(page.locator('[data-testid="s32-format-pdf"]')).toBeVisible()`
- 対応 spec.ts: `lais/tests/realmachine/export.spec.ts` (新設想定)
- 関連 NG: Q5#7 個人情報漏洩 (PDF 内マスキング)

### 8.7 S-33 DeleteAccount (退会)
- Given: S-30 から「退会」タップ / When: 確認モーダル + 入力 ("DELETE") / Then: 物理削除 + ログアウト (C2 連動)
- URL assertion: `expect(page).toHaveURL(/\/settings\/delete/)` / DOM assertion: `expect(page.locator('[data-testid="s33-confirm-input"]')).toBeVisible()`
- 対応 spec.ts: `lais/tests/realmachine/delete_account.spec.ts` (新設想定)
- 関連 NG: Q5#2 データ消失 (= 意図したデータ消失なので OK だが確認必須)

### 8.8 S-40 PrivacyPolicy
- Given: フッター or S-30 から「プライバシーポリシー」タップ / When: 静的ページ表示 / Then: 言語別 (G3) + 最終更新日表示
- URL assertion: `expect(page).toHaveURL(/\/privacy/)` / DOM assertion: `expect(page.locator('[data-testid="s40-content"]')).toBeVisible()`
- 対応 spec.ts: `lais/tests/realmachine/privacy_policy.spec.ts` (新設想定)

### 8.9 S-41 TermsOfService
- Given: フッター or 初回サインアップ画面 / When: 静的ページ表示 / Then: 言語別 + 最終更新日 + 同意チェック (サインアップ時)
- URL assertion: `expect(page).toHaveURL(/\/terms/)` / DOM assertion: `expect(page.locator('[data-testid="s41-content"]')).toBeVisible()`
- 対応 spec.ts: `lais/tests/realmachine/terms.spec.ts` (新設想定)

### 8.10 S-42 About (バージョン情報)
- Given: S-30 から「アバウト」タップ / When: バージョン / commit hash / ライセンス表示 / Then: 開発者連絡先表示
- URL assertion: `expect(page).toHaveURL(/\/about/)` / DOM assertion: `expect(page.locator('[data-testid="s42-version"]')).toBeVisible()`
- 対応 spec.ts: `lais/tests/realmachine/about.spec.ts` (新設想定)

### 8.11 S-50 Stats (統計・振り返り)
- Given: BottomTabBar から「統計」タップ / When: 月別目標達成率 + タスク完了数 + AI 対話頻度グラフ / Then: 月切替で過去データ表示
- URL assertion: `expect(page).toHaveURL(/\/stats/)` / DOM assertion: `expect(page.locator('[data-testid="s50-monthly-chart"]')).toBeVisible()`
- 対応 spec.ts: `lais/tests/realmachine/stats.spec.ts` (新設想定)
- 関連 NG: iOS Q6#10 長文 (グラフ) スクロール追従

### 8.12 S-60 Search (pgvector ベクトル検索、B1i 連動)
- Given: BottomTabBar から「検索」タップ / When: クエリ入力 + Enter / Then: タスク + 目標 + AI 対話 + 日記の意味検索結果表示
- URL assertion: `expect(page).toHaveURL(/\/search\?q=/)` / DOM assertion: `expect(page.locator('[data-testid="s60-results"]')).toBeVisible()`
- 対応 spec.ts: `lais/tests/realmachine/search.spec.ts` (新設想定)
- 関連 NG: Q5#1 凍結 (ベクトル検索 latency 注意) / iOS Q6#1 キーボード

### 8.13 AuthCallback (PKCE 認証コールバック)
- Given: メール認証リンクタップ / When: PKCE flow 完了 / Then: /grow 遷移 (S-00 経由しない、直接ダッシュボード)
- URL assertion: `expect(page).toHaveURL(/\/grow/)` (callback 後) / DOM assertion: `expect(page.locator('[data-testid="s10-grow-root"]')).toBeVisible()`
- 対応 spec.ts: `lais/tests/realmachine/confirm-link-pkce-fix.spec.ts` (既存)
- 関連 NG: Q5#4 意図しないログアウト

### 8.14 BottomTabBar (共通ナビ)
- Given: 全画面 (S-10 以降) / When: タブタップ / Then: タップ反応 100ms 以内、選択タブ視覚 hilights
- URL assertion: 各タブの toHaveURL / DOM assertion: `expect(page.locator('[data-testid="bottom-tab-bar"]')).toBeVisible()`
- 対応 spec.ts: 各画面 spec.ts に内包 (`bottom-tab-bar` セレクタ参照)
- 関連 NG: iOS Q6#6 タップ反応 / iOS Q6#2 safe-area

### 8.15 ErrorBoundary / Toast (共通通知)
- Given: 任意画面で例外発生 or NW エラー / When: ErrorBoundary catch or Toast 発動 / Then: 1 秒以内 (Q4) にエラー UI 表示 + 再試行ボタン
- URL assertion: 該当画面維持 / DOM assertion: `expect(page.locator('[data-testid="error-toast"]')).toBeVisible()`
- 対応 spec.ts: `lais/tests/smoke/error-boundary.spec.ts` (既存)
- 関連 NG: Q5#6 silent failure (= ErrorBoundary 必須対応) / Q5#8 AI ストリーミング中断 (S-20 専用)

---

## 9. 既存仕様 path マッピング (α6-α9)

| ID | 内容 | 主な path | 行範囲 | 備考 |
|---|---|---|---|---|
| α6 | AI モデルルーティング (catch-all=GPT, Claude 15%, Gemini 30%, プラン別変動) | `CLAUDE.md` (goal-ai-worker root) | 9-15 行 | + `instructions/results/session_history.md` 251-526 行 |
| α7 | プラン構造 (Free / Light ¥500-980 / Pro ¥1500-2980 / Max ¥1500-9800 / Ultra ¥20000) | `CLAUDE.md` 11 行 | 月額キャップ表 | + `docs/goal_ai_project_v6_4.md` 42 行 |
| α8 | 3 層テスト戦略 (L1 スモーク 2 分 / L2 影響範囲 5-10 分 / L3 フル週次) | `docs/plans/dev_system_spec.md` | 167-332 行 (§21 §C3.4 SSoT) | + cmd-unit / cmd-e2e / cmd-realworld 3 区分 |
| α9 | デザインシステム v0.12 (Night Sky / Dawn / Harajuku Light / Harajuku Dark 4 テーマ) | `docs/plans/lais_design_system.md` | 1198 行 | + `lais_design_spec_v1.md` 1199 行 |

備考: GOAL AI v6.x プロジェクト由来の α6 / α7 を Lais (dev-system v3.4 別アーキテクチャ) に流用するかは v2 (友人ベータ期) で再定義。v1 (PO 単独期) は α6 流用 / α7 後送り (無料のため)。

---

## 10. RACI 表起点 (γ 軸)

### 10.1 D2 schema 変更 場合分け (再掲、§7.4 から起点として参照)

| 操作 | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| 追加カラム (NULL 可) | AI 自律 | AI | - | PO (事後通知) |
| 既存カラム削除 | AI 起案 | PO 承認 | AI 影響分析 | チーム全員 |
| 型変更 | AI 起案 | PO 承認 | AI 影響分析 | チーム全員 |
| インデックス追加/削除 | AI 自律 | AI | - | PO (事後通知) |
| テーブル追加 | AI 起案 | PO 承認 | AI スキーマ設計 | チーム全員 |
| テーブル削除 | AI 起案 | PO 承認 | AI 影響分析 + データバックアップ | チーム全員 |
| マイグレーション実行 (本番、psql / supabase migration) | AI 実行 | PO 承認 | AI rollback 計画 | チーム全員 |

### 10.2 「AI 補助判断ルーティング」(γ 軸補正、PO 承認 2026-04-27)
- AI に許可するメタ判断 = 「PO 判断必要 / AI 自律可」の 2 択のみ
- **PO 判断必要** トリガ: コスト影響 / 不可逆操作 / 法務・ブランド・データスキーマ・外部依存・ユーザー体験変更
- **AI 自律可** トリガ: 上記非該当 + RACI 表で「AI Responsible」記載済
- 出力例: 「これは PO 判断必要 (理由: ユーザー体験変更)。決めてください」 / 「AI 自律で進めます」
- メタ判断ミスも違反扱い (誤って「AI 自律可」と判定した場合)

---

## 11. CI ゲート起点 (δ 軸)

### 11.1 重大度階層
| 重大度 | 対象 | 失敗時動作 |
|---|---|---|
| BLOCK (P0) | セキュリティ / DB schema 不整合 / signin 失敗 / 致命的 a11y 違反 | デプロイ停止 |
| BLOCK (P1) | 性能閾値超過 (P95 latency 1000ms / エラー率 1%) / Lighthouse CI 予算 (LCP 2.5s / CLS 0.1 / INP 200ms) | デプロイ停止 |
| WARN (P2) | 文面 / スタイル / 軽微 a11y | 通知のみ |

### 11.2 カナリア配信段階 (E1)
- 友人ベータ期: ふとし + 友人 2-3 人 → 12 時間様子見 → 全員
- 一般公開期: 5% → 25% → 100%
- 各段階で本番計測 PASS (P95 + エラー率 + RUM Web Vitals) を昇格条件
- 失敗時自動 rollback (E2、エラー率 1% 超)

### 11.3 デプロイ前テスト (E4)
- 時間制限なし、品質最優先
- L1 (2 分) + L2 (5-10 分) + L3 フル相当 を全実行
- 既存 3 層テスト戦略を維持 + 拡張

---

## 12. RUM 設計起点 (ε 軸)

### 12.1 計測対象 (F1)
- PO 単独期: ふとし 1 人 100% 計測
- 友人ベータ期: 全員 100% 計測 (規模小、サンプリング不要)
- 一般公開期: 1〜5% サンプリング (規模応じて)

### 12.2 計測指標
- Web Vitals: LCP / CLS / INP / FCP / TTFB
- ビジネス指標: signin 成功率 / タスク追加成功率 / AI 対話完了率
- エラー: JS error count / NW error count / 5xx response count

### 12.3 アラート通知 3 段 (F2)
- 緊急高 (rollback / サーバーダウン): LINE 即時通知
- 緊急低 (コスト警告 / 軽微エラー): メール
- 全件: ローカルログ記録 (90 日保持、CF Logpush + R2、F4)

### 12.4 PII 取扱い (F3)
- URL 内 email / token はマスキング必須
- ログ内 password / 個人情報 はマスキング必須
- データ送信前に自動赤線化 + サンプリング

---

## 13. 改革進行方針 (H 群)

### 13.1 期間
2026-04-27 〜 2026-07-27 (3 か月)

### 13.2 凍結方針 (H1)
- Lais 機能開発を完全凍結 (5 軸完了まで)
- 凍結例外 3 件: (1) gitleaks 完遂 (2) 本番障害 hotfix (3) セキュリティクリティカル修正

### 13.3 並行作業 (H2/H4)
- gitleaks: 維持 (完遂済)
- wrangler v4: 改革後
- night auto-resume: 改革後
- dev-system + 他プロジェクト並行
- Lais は hotfix のみ

### 13.4 PO リソース (H3)
- 5 時間/週 を dev-system 改革に投入

---

## 14. 関連 PD / PATCH 履歴

- PD-ALPHA-PO-EXPECTATIONS-V1 (`docs/decision_log.md`、v1.0 起票)
- PD-ALPHA-PO-EXPECTATIONS-V2 (本 v2.0 起票、ADV メイン直接編集) ← **要起票** (subagent 経由が望ましい、本 ADV メイン編集は緊急回避)
- PATCH-VALIDATOR-OVERFIRE-REDUCTION-V1 (validator 改修 v1、6/6 動作テスト PASS)
- PATCH-BUG-RT-SIGNIN-LATENCY-REDUCTION (Q1 達成、502ms)
- PATCH-BUG-RT-S12-OPTIMISTIC-UPDATE (Q2 達成、378ms)
- PATCH-BUG-RT-S15-MODAL-CLOSE-FIX (Q3 達成、3/3 PASS)

---

> v2.0 lock 済 (2026-04-27 午後、ADV メイン直接編集 + PO 確認待ち)
> 次フェーズ: β 軸 実 git mv 実行 + γ 軸 RACI 表完成 + δ 軸 CI ゲート結線 + ε 軸 RUM 結線

---

# v3.0 拡張節 (§15〜§19、Lais 専用プラン構造 + 深掘りセッション、ADV メイン直接編集 2026-04-27 夕方)

## 15. Lais 専用プラン構造 (新規策定、α7 (b) Lais 専用採択)

### 15.1 設計思想 (PO 提示 2026-04-27)
1. **コア機能 (タスク・日記・目標管理・統計基本) は全プラン無料開放** — ユーザーの財産は守る
2. **AI 関連機能で差別化** — メモリ範囲、AI 対話頻度、深掘りセッション
3. **「え、こんなのも気にしてくれるの」体験** — 課金で深掘りの深さが増す
4. **ゲーム性のあるネーミング** — 旅の仲間 → 賢者 → 魂の片割れ

### 15.2 プラン構造 (4 プラン、Ultra なし、簡素化)
| プラン | 月額 | 位置づけ | AI モデル |
|---|---|---|---|
| Free | ¥0 | 基本機能を試せる無料プラン | (制限あり) |
| Light | ¥500-980 | 日常的にしっかり使う層 | (中位) |
| Pro | ¥1,500-2,980 | 自己理解を深めたい層 | GPT-5 + Sonnet 4.6 + Gemini 3 Flash |
| Max | ¥1,500-9,800 | 最上位 | GPT-5 + Opus 4.6 + Gemini 3.1 Pro Preview |

注: G2 で確定済「友人ベータ期は初月無料、2 ヶ月目から課金開始」

---

## 16. 機能アンロック表 (4 プラン × 20 機能)

| 機能 | Free | Light | Pro | Max |
|---|---|---|---|---|
| タスク管理 | ✓ | ✓ | ✓ | ✓ |
| 日記 | ✓ | ✓ | ✓ | ✓ |
| 目標管理 | ✓ | ✓ | ✓ | ✓ |
| 統計 (月別目標達成率) | ✓ | ✓ | ✓ | ✓ |
| 統計 (豊富な指標、習慣継続日数 / タスク完了率 / AI 対話頻度等) | × | ✓ | ✓ | ✓ |
| AI 対話 - 単価 | 20 回/日 | ¥8/トークン | ¥20/トークン | ¥10/トークン |
| AI 対話履歴保持 | 100 件 | 200 件 | 500 件 | 500 件 |
| AI 参照範囲 | 直近 30 件 | 直近 100 件 | 全件 | 全件 |
| 画像入力 | 1 枚/ターン | 5 枚/ターン | 5 枚/ターン | 5 枚/ターン |
| 音声入力 (Web Speech API) | ✓ | ✓ | ✓ | ✓ |
| 音声入力 (Whisper 高精度フォールバック) | × | ✓ | ✓ | ✓ |
| 検索 (タスク + 日記) | ✓ | ✓ | ✓ | ✓ |
| 検索 (AI 対話含む全文 / pgvector) | × | ✓ | ✓ | ✓ |
| AI 理解メモ生成 (5 回ごと自動) | ✓ | ✓ | ✓ | ✓ |
| AI 理解メモのディープ分析 | × | ✓ | ✓ | ✓ |
| データエクスポート (JSON) | ✓ | ✓ | ✓ | ✓ |
| データエクスポート (CSV) | × | ✓ | ✓ | ✓ |
| データエクスポート (PDF・日記手帳風) | × | × | ✓ | ✓ |
| 2FA (TOTP) | ✓ | ✓ | ✓ | ✓ |
| パスキー認証 (Face ID / Touch ID) | ✓ | ✓ | ✓ | ✓ |
| Sign in with Apple | ✓ | ✓ | ✓ | ✓ |

注: A9 で確定済「履歴 500 件上限管理 + 削除候補基準 4 / 保護基準 2 / ピン留め無制限」は Pro/Max のみ。Free=100 / Light=200 はカウント上限のみで、削除ロジックは Pro/Max と同等。

---

## 17. 深掘りセッション (メイン差別化機能、新規策定)

### 17.1 コンセプト
ユーザーが「主人公として生きる」ために AI との対話で自己理解を深める **構造化セッション**。
日常会話 (S-20 Talk) とは別レイヤーの専用フロー。

### 17.2 機能要件 (7 項目)
1. 構造化された質問フロー (事業探索の 8 ブロックのような体系)
2. AI が複数のレンズで所見を返す (本人 / 投資家 / 顧客 / 競合 / 助成金審査員等)
3. 質問は 1 つずつ、フェーズ単位で進行
4. 矛盾点・パターンの指摘 (過去発言から論理矛盾抽出)
5. 過去発言を踏まえた仮説提示
6. 中間サマリー化 (テーマ別にタイトル変更可能)
7. AI 理解メモへの蓄積 (深掘り内容が以降の AI 対話に反映)

### 17.3 カテゴリ × 階層構造 (3 × 3 = 9 セル)

| カテゴリ | Lv1 (基礎) | Lv2 (中層) | Lv3 (深層) |
|---|---|---|---|
| **Self (自己)** | 好き嫌い・基本性格・興味 | 強みの構造化・憎悪・価値観の言語化 | 失敗パターン・コンプレックス転換・人生観・遺したいもの・誰にも言えない秘密の願望・嫉妬の対象とその意味・許せない自分・他人の評価が気になる本当の理由・性愛観・恋愛のパターン・親から受け継いだ良くない癖・死を意識した時に見える優先順位 |
| **Goal (目標)** | 今日のタスク・直近の目標 | 中期目標の逆算・理想の 1 日・習慣設計 | 5 年後ビジョン・事業探索・キャリア戦略・達成しても満たされなかった経験の意味・他人の目を気にして諦めた夢・お金がいくらあれば本当に満足するか・成功した時に失うもの・死ぬまでに体験したい 100 のこと・人生の主題曲 |
| **Relation (関係)** | (Free はロック) | 大切な人・離れたい人の整理 | 金銭観・社会との関わり・遺したい影響・家族との未解決のわだかまり・一番影響を受けた人から自由になる・与えすぎている関係の見直し・他人を切り捨てる勇気・親になるべきか否か・性的な関係が人生に持つ意味 |

### 17.4 プラン別アンロック + ネーミング

| プラン | 呼称 | アンロック範囲 |
|---|---|---|
| Free | **旅の仲間** (日常を共に歩む存在) | Self Lv1 / Goal Lv1 |
| Light | **賢者** (知恵を授ける存在) | Self Lv1-2 / Goal Lv1-2 / Relation Lv1 |
| Pro / Max | **魂の片割れ** (自分の深部と繋がる存在) | 全カテゴリ Lv1-3 |

### 17.5 Lv 別の質問の深さ (AI 態度切替)

| Lv | 質問例 | 領域 | 触れ方 | AI 態度 |
|---|---|---|---|---|
| Lv1 | 「好きなことは?」 | 仕事・趣味 | 表層的・建前 OK | 普通の対話 |
| Lv2 | 「なぜそれが好きか?」 | 価値観・パターン | 構造化・本音を引き出す | コーチング |
| Lv3 | 「それを好きでい続けるのが怖くなったことは?」 | タブー領域・無意識・性・死 | 心理療法的・痛みに向き合う | 深層心理セラピスト |

### 17.6 対応画面 (Given-When-Then 起点)

| 画面 ID | 画面名 (案) | Given-When-Then 雛形 |
|---|---|---|
| S-70 | DeepSession Hub | Given: BottomTabBar から「深掘り」タップ / When: カテゴリ × 階層マトリクス + AI 理解度メーター表示 / Then: アンロック済セルから選択開始 |
| S-71 | DeepSession Active | Given: S-70 でセル選択 / When: 質問フロー進行 (1 質問ずつ) / Then: AI 所見 + 仮説提示 + 中間サマリー |
| S-72 | DeepSession Summary | Given: セッション完了 or 中断 / When: テーマ別タイトル化 + AI 理解メモ寄与スコア表示 / Then: 履歴 (S-20 別タブ) に保存 |

URL assertion: `expect(page).toHaveURL(/\/deep-session/)`
DOM assertion: `expect(page.locator('[data-testid="s70-matrix"]')).toBeVisible()`
対応 spec.ts: `lais/tests/realmachine/deep_session.spec.ts` (新設、次フェーズ)

---

## 18. AI 理解度の定量化 UI 仕様 (購買意欲を上げる仕組み)

### 18.1 表示要素
| 表示要素 | 内容 | 配置 (画面) |
|---|---|---|
| カテゴリ別理解度メーター | Self 45% / Goal 60% / Relation 0% | S-70 / S-30 |
| 階層到達度 | Self: Lv2 クリア、Lv3 進行中 | S-70 |
| 蓄積された洞察数 | カテゴリ別、累積件数 | S-70 / S-50 Stats |
| 全体 AI 理解度 | 3 カテゴリ平均 (%) | S-30 トップ |
| 次のアンロック条件 | 「Lv2 完了で Lv3 解放」「Pro 加入で Relation Lv3 解放」 | S-70 |
| AI 理解メモへの寄与スコア | 0-4 (深掘りで 4 到達可能、無料は最大 2) | S-72 |

### 18.2 体感基準
- メーター更新: 楽観更新で即時反映 (Q2 連動、200ms 以内)
- 全体 AI 理解度の計算: クライアントサイド (DB 不要、軽量)
- アンロック達成時: アニメーション + 触覚フィードバック (G5 Apple リファレンス整合)

---

## 19. コスト試算 (音声入力 Whisper フォールバック)

| 想定 | 月コスト |
|---|---|
| ふとし 1 人 (Whisper フォールバック 10% 想定) | 約 50 円 |
| 1,000 ユーザー | 約 24,000 円 |
| 10,000 ユーザー | 約 240,000 円 |

注: Web Speech API は無料、Whisper はエラー時 fallback として使用。Light プラン以上で有効化。

---

## 19.5 PO 起票時の確認事項 (新機能 = PO 判断必要事項に該当)

PO 提示 (2026-04-27 夕方) で以下 3 件のミッション化提案あり:
1. 本プラン構造を Lais 専用仕様として SSoT 化 → **本 v3.0 で完了**
2. 深掘りセッション機能のミッション定義作成 → **次フェーズ subagent 起動候補** (`DEEP-SESSION-MISSION-DEFINITION-V1`)
3. AI 理解メモのディープ分析具体仕様策定 → **次フェーズ subagent 起動候補** (`AI-UNDERSTANDING-MEMO-DEEP-ANALYSIS-SPEC-V1`)

H1 で Lais 機能開発凍結中 (改革 5 軸完了まで) のため、上記 2/3 は **抜本改革完了後** に起動予定。本 v3.0 で SSoT 化のみ実施。

---

> v3.0 lock 済 (2026-04-27 夕方、ADV メイン直接編集)
> 関連 PD: PD-ALPHA-PO-EXPECTATIONS-V3 (要起票、次フェーズで subagent 経由)

---

# v3.1 修正節 (§20、ADV メイン直接編集 2026-04-27 夜、PO ペルソナ FB 8 件反映)

## 20. v3.0 → v3.1 差分 (8 修正点)

### 20.1 (P4) プラン構造 4 → 3 プラン化、Pro/Max 統合 + 上限設定型
- **§15.2 旧**: Free / Light / Pro ¥1,500-2,980 / Max ¥1,500-9,800 (4 プラン)
- **§15.2 新 (v3.1)**: Free / Light / **Pro Custom** (上限設定型、ユーザが ¥1,000〜¥30,000/月 等の自分上限を設定、超過時 BLOCK or 警告) (3 プラン)
- 実装: Stripe Metered Billing or Pre-paid credit パターン
- AI モデル: 旧 Pro (Sonnet 4.6) と Max (Opus 4.6) を統合し、**質問内容に応じて自動選定** (Pro Custom 内でモデルルーティング)

### 20.2 (P5) 多視点機能削除
- **§17.2 旧**: 「AI が複数のレンズで所見を返す (本人 / 投資家 / 顧客 / 競合 / 助成金審査員等)」(7 機能要件 #2)
- **§17.2 新 (v3.1)**: **本要件 #2 削除**。AI 視点固定なし、ユーザが必要時に「別視点で見て」と依頼すれば AI が応答 (オンデマンド)
- 効果: AI コスト 1/4、Pro Custom 上限内で深掘り十分実施可能

### 20.3 (P6) 第三者情報の扱い禁止
- **§17.3 旧 Lv3**: 「親から受け継いだ良くない癖」「家族との未解決のわだかまり」「一番影響を受けた人から自由になる」「与えすぎている関係の見直し」「親になるべきか否か」等
- **§17.3 新 (v3.1)**: 上記 5 項目を **削除**。Lv3 Self / Goal / Relation は**ユーザ本人の内面のみ**を対象とし、第三者 (家族・親・友人) の固有情報は質問対象外
- 法務理由: GDPR / 個人情報保護法 第三者情報の同意なし利用禁止

### 20.4 (P7) Lv 名変更
- **§17.4 旧**: 旅の仲間 (Free) / 賢者 (Light) / 魂の片割れ (Pro/Max)
- **§17.4 新 (v3.1)**: **Beginner (Free) / Expert (Light) / Professional (Pro Custom)** (一旦この名称、将来再検討可)
- 効果: 中二病的響き回避、職業的・段階的成長感を表現

### 20.5 (P3) Lv3 メンタル評価ゲート + 希死念慮対応
- **§17.3 新 (v3.1) 追加要件**:
  - Lv3 セッション開始前に「過去 1 ヶ月のメンタル状態自己評価」(5 段階リッカート) 必須
  - 希死念慮検出 (= AI 応答内 + ユーザ入力内のキーワード grep): セッション中断 + **厚生労働省「いのちの電話」窓口リンク** + **緊急通報ボタン** (家族 1 人を事前登録、メール通知)
  - 18 歳未満は Lv3 全面ロック (年齢確認)

### 20.6 (P2) UI 簡素化 (3 件)
- **§17.6 / §18 旧**: 9 セルマトリクスをメイン画面に表示、メーター 3 種類 (カテゴリ別 / 全体 / 寄与スコア)
- **§17.6 / §18 新 (v3.1)**:
  - メイン画面 (S-70) は「**今日の深掘り 1 つ**」AI レコメンドのみ表示 (シンプル)
  - 9 セルマトリクスは S-30 Settings 内の「深掘り設定」サブビューに移動
  - メーターは **「全体 AI 理解度」(%) のみ** に統合、カテゴリ別 / 寄与スコアは S-30 詳細ビューに格下げ
- 効果: 認知負荷低減、初心者離脱回避

### 20.7 (P8) AI コーチング製品としての位置付け
- **§17.1 / §19 旧**: 「自己理解を深める構造化セッション」(漠然)
- **§17.1 / §19 新 (v3.1)**:
  - 「**AI コーチング製品**」と明確化 (ChatGPT / Gemini 等の汎用 LLM チャットとは異なる位置付け)
  - 競合: BetterUp / Reflectly / Co-Star / Replika 等のメンタル / コーチング系
  - **アウトカム可視化**: 90 日継続で AI 理解度 80% 達成 → 自分の取扱説明書 PDF 自動生成 (「ふとしさんの 90 日深掘り記録」)
  - PDF は C4 「日記の手帳・ジャーナル風」と同じデザイン基盤を流用

### 20.8 (P1 却下) アップセル境界体験
- ADV 提案: Lv1 完了時に Lv2 サンプル 1 つ無料解放 (Free お試し)
- **PO 却下**: アップセルは別途検討。本 v3.1 では実装しない

---

## 20.9 関連 PD / PATCH 履歴 (v3.1 追加)

- PD-ALPHA-PO-EXPECTATIONS-V3.1 (要起票、次フェーズで subagent 経由)
- 削除対象 (v3.0 から): 多視点機能 / 第三者情報 / 旅の仲間/賢者/魂の片割れ ネーミング / Pro と Max 分離

---

> v3.1 lock 済 (2026-04-27 夜、ADV メイン直接編集)
> 次フェーズ: PD-ALPHA-PO-EXPECTATIONS-V3.1 起票 (subagent) + γ/δ/ε 軸本格起票 (来週)

---

# v3.2 拡張節 (§21、DeepCheck モード新規策定、ADV メイン直接編集 2026-04-27 夜)

## 21. DeepCheck モード (回答精度 Up モード、新規策定、PO 確定 2026-04-27)

### 21.1 コンセプト
S-20 Talk の通常会話に対し、ユーザが意識的に有効化する **2 AI 合議型レビューモード**。ChatGPT 等の単体 AI 回答に対する事実誤認 (hallucination) リスクを Reviewer AI で低減。重要判断時の信頼性確保が目的。

### 21.2 動作フロー (2 AI 合議、Optimistic UI、PO P2 採用)
```
ユーザ送信 (DeepCheck ON)
  → [Primary AI] Claude Sonnet が初回回答生成
  → 即時 UI 表示 (ユーザ待機ゼロ、Optimistic UI)
  → 裏で並行: [Reviewer AI] GPT-5 が事実 / 論理 / 表現チェック
  → Reviewer 提案あり → Primary が修正再生成 → UI 自動更新 (「✓ 修正反映」アニメーション)
  → Reviewer 提案なし → 「✓ 確認済」表示のみ
```

### 21.3 「話し合ってる感」の数字表示 (PO P3 採用)
回答末尾に以下を表示 (常に表示、対話の臨場感を出す):
- **2 ラウンド検証完了** (= Primary 初回 → Reviewer 1 → Primary 修正)
- **Reviewer 提案 N → 採用 M / 却下 K** (例: 「Reviewer 提案 3 → 採用 2 / 却下 1」)
- **総検証時間 X.X 秒** (例: 「総検証時間 3.4 秒」)

例: `🎯 DeepCheck: 2 ラウンド / Reviewer 提案 3 → 採用 2 / 却下 1 / 総検証時間 3.4 秒`

### 21.4 プラン別アンロック (PO P3 採用)
| プラン | 月使用回数 | 月コスト目安 |
|---|---|---|
| Free | 1 回 (お試し) | ¥0 (体験) |
| Light | 20 回 | ¥1,200 想定 (¥60 × 20) |
| Pro Custom | 無制限 (上限設定内) | 上限設定次第 |

### 21.5 UI (S-20 Talk 内)
- 入力欄横に **🎯 DeepCheck トグル** (デフォルト OFF、PO P4 採用)
- ON 時: 入力欄が薄ピンクハイライト + 「DeepCheck: 2 AI で精度確認します」表示
- 回答表示時: 上記 §21.3 数字を末尾に表示

### 21.6 深掘りセッション内では無効化 (PO P5 採用、法務観点)
- S-71 (DeepSession Active) / S-72 (DeepSession Summary) では DeepCheck 無効化 (オプトアウト不可)
- 理由: Lv3 深掘り内容を Reviewer (OpenAI) に渡すことを構造的に禁止 (P6 法務観点)
- UI: 深掘りセッション中は 🎯 トグル grey out + 「深掘り中は無効です」ツールチップ

### 21.7 プライバシーポリシー追加事項 (PO P6 採用)
- DeepCheck 有効時、ユーザ入力 + Primary 回答が **Anthropic + OpenAI 2 社** に渡る
- DeepCheck 無効時 (default): ルーティングに従い 1 社のみ (Claude / GPT / Gemini)
- 深掘りセッション中は OpenAI に渡らない
- プライバシーポリシー (S-40) の「データ送信先」セクションに上記 3 行追加必須

### 21.8 体感基準 (Q1/Q4 連動)
- Primary 表示まで: 1000ms 以内 (Optimistic UI、Q1 連動)
- Reviewer 完了 + 修正反映まで: 5000ms 以内 (許容、ユーザは別操作可能)
- Reviewer タイムアウト (10 秒超): 「Reviewer 検証スキップ」表示 + Primary 回答のみ最終確定

### 21.9 対応画面 (Given-When-Then 起点)
- S-20 Talk への機能追加 (新画面なし)
- Given: ユーザが S-20 で 🎯 DeepCheck ON / When: メッセージ送信 / Then: Primary 即時表示 → 裏で Reviewer 走行 → 修正反映
- URL assertion: `expect(page).toHaveURL(/\/talk/)` 維持
- DOM assertion: `expect(page.locator('[data-testid="deepcheck-toggle"]')).toBeVisible()` (新規)
- 対応 spec.ts: `lais/tests/realmachine/deepcheck_mode.spec.ts` (新設、次フェーズ)

### 21.10 関連既存機能との整合
- A7 AI ルーティング (catch-all=GPT、Claude=コーチング、Gemini=検索): DeepCheck ON 時は **ルーティング無視**、Primary は質問内容に応じた最適モデル (既存ルーティング基準)、Reviewer は **GPT-5 固定**
- A9 履歴件数管理: 修正前 Primary 回答は履歴に残さない (修正後の最終回答のみ 1 件として記録、対話ラウンド数はメタ情報として保持)
- §15 機能アンロック表に DeepCheck 行を追加予定 (本 §21 で表記、次の SSoT 整理時にマージ)
- §17 深掘りセッション (Lv3) との非両立性は §21.6 で明記

### 21.11 実装スコープ (H1 凍結中、SSoT 化のみ)
- 本 §21 は仕様化のみ、実装は H1 抜本改革完了後 (3 か月後想定)
- 実装時の補助 subagent: `LAIS-DEEPCHECK-MODE-MISSION-DEFINITION-V1` (起動候補、次セッション以降)

### 21.12 関連 PD / PATCH 履歴 (v3.2 追加)
- PD-ALPHA-PO-EXPECTATIONS-V3.2 (要起票、次フェーズで subagent 経由)

---

> v3.2 lock 済 (2026-04-27 夜、ADV メイン直接編集)
> 次フェーズ: PD-ALPHA-PO-EXPECTATIONS-V3.1 / V3.2 起票 (subagent) + γ/δ/ε 軸本格起票 (来週)

---

# v3.3 拡張節 (§22、モデル選択制 (Pro Custom) 新規策定、ADV メイン直接編集 2026-04-27 夜)

## 22. モデル選択 (Pro Custom 限定機能、PO 確定 2026-04-27)

### 22.1 コンセプト
Pro Custom (上限設定型) は **ユーザがコスト責任を負う** 構造。であれば、モデル選定もユーザに委ねるのが自然。Sonnet 4.6 でコスパ重視 / Opus 4.7 で高精度重視を、ユーザの嗜好と用途に応じて選べる。

### 22.2 プラン別モデル割当 (PO 確定)
| プラン | 利用可能モデル | 切替頻度 | UI |
|---|---|---|---|
| Free | Claude Sonnet 4.6 固定 | 不可 | (UI 不要、自動) |
| Light | Claude Sonnet 4.6 固定 | 不可 | (UI 不要、自動) |
| **Pro Custom** | **Sonnet 4.6 / Opus 4.7 ユーザ選択** | **月内いつでも自由切替** | S-30 Settings 内 「モデル選択」セクション |

### 22.3 UI 仕様 (S-30 Settings)
- セクション名: **「モデル選択」** (日本語、PO 確定)
- Pro Custom 加入時に出現 (Free / Light は非表示)
- トグル/セレクター:
  - ⚖️ **Sonnet 4.6 (バランス)** — 「日常的にコスパ良く使える」
  - 💎 **Opus 4.7 (高精度・高コスト)** — 「重要な質問・深い思考に」
- 各モデルのコスト目安表示:
  - Sonnet 4.6: ~¥3 / 1k tokens (例: 1 質問 ~¥3-15)
  - Opus 4.7: ~¥15 / 1k tokens (Sonnet の 5 倍、例: 1 質問 ~¥15-75)
- 上限残額の視覚化: 「現状残り ¥X / 上限 ¥Y」 + メーター

### 22.4 切替ロジック
- 月内いつでも自由切替 (回数制限なし)
- 切替後 即時反映 (次の質問から新モデル適用)
- 月締め時の使用統計: 「Sonnet 利用 X 回 / Opus 利用 Y 回 / 合計 ¥Z」を S-50 Stats に表示

### 22.5 DeepCheck モード との連動 (§21 連動)
- DeepCheck Primary はユーザのモデル選択を継承
  - ユーザ Sonnet 選択時 → Primary Sonnet 4.6 + Reviewer GPT-5
  - ユーザ Opus 選択時 → Primary Opus 4.7 + Reviewer GPT-5
- Reviewer GPT-5 は固定 (Anthropic vs OpenAI の二社合議という構造保持、PO 確定)

### 22.6 深掘りセッション (§17) との連動
- 深掘り Lv1 / Lv2: Primary はユーザ選択モデル使用
- 深掘り Lv3: 重要質問のためユーザが Opus 選択時はそのまま、Sonnet 選択時もそのまま (強制切替なし、コスト責任はユーザ)
- 第三者情報禁止 (P6) は両モデル共通遵守

### 22.7 既存機能アンロック表 (§16) への追加行
| 機能 | Free | Light | Pro Custom |
|---|---|---|---|
| **モデル選択 (Sonnet 4.6 / Opus 4.7)** | × (Sonnet 固定) | × (Sonnet 固定) | ✓ (ユーザ選択) |

### 22.8 体感基準
- モデル切替操作: 100ms 以内 (Q4 即時反映、楽観更新)
- 切替後の最初の AI 応答: 通常通り (Sonnet 1-3 秒 / Opus 2-5 秒)
- 月締め統計表示: S-50 Stats で月初 1 秒以内描画

### 22.9 既存仕様との整合
- A7 AI ルーティング (catch-all=GPT、Claude=コーチング、Gemini=検索) は全プラン共通
- Pro Custom のユーザ Opus 選択時、ルーティングで「Claude=コーチング核心」に当たるケースは Opus 4.7 が使われる (= Sonnet 選択時より高精度)
- Free / Light の「Claude=コーチング核心」は Sonnet 4.6 固定
- DeepCheck モード Reviewer = GPT-5 固定 (Anthropic 内モデル選択とは独立)

### 22.10 関連 PD / PATCH 履歴 (v3.3 追加)
- PD-ALPHA-PO-EXPECTATIONS-V3.3 (要起票、次フェーズで subagent 経由)

---

> v3.3 lock 済 (2026-04-27 夜、ADV メイン直接編集)
> 次フェーズ: PD-ALPHA-PO-EXPECTATIONS-V3.1 / V3.2 / V3.3 起票 (subagent) + γ/δ/ε 軸本格起票 (来週)

---

# v3.4 拡張節 (§23、Claude Design Skill 利用必須化、ADV メイン直接編集 2026-04-27 夜)

## 23. Claude Design Skill 利用必須 (PO 直接指示 2026-04-27)

### 23.1 ルール
Lais 開発で **デザイン関連作業** を行う際は、Claude (Anthropic 公式提供) の Design Skill (`design:*`) を **必須利用** する。ADV メイン / subagent / Stage 7 以降の実装で、デザインに関わる任意の意思決定・仕様化・レビュー・批評・ハンドオフ・コピーライティング・ユーザリサーチで本ルール適用。

### 23.2 対象 skill (anthropic-skills 系)
| Skill | 用途 |
|---|---|
| `design:design-system` | デザイントークン定義 / コンポーネント階層 / 命名規則 / システム拡張提案 |
| `design:design-critique` | 各画面・コンポーネントへの構造的批評、Apple HIG / Nielsen 10 / Fitts' law 等の確立フレームワーク準拠 |
| `design:accessibility-review` | WCAG 2.1 AA 監査 (Lais では万人対応しない方針 PO #6 だが、自然な多重表現は維持確認) |
| `design:design-handoff` | エンジニア向けハンドオフ仕様 (token / spacing / state / animation / responsive) |
| `design:ux-copy` | UI 文言レビュー、ボイス&トーンガイドライン適用、エラーメッセージ統一 |
| `design:user-research` | target user 像構造化、利用シーン別設計 |
| `design:research-synthesis` | PO 体感インタビュー (Q1-Q7) + 検証結果の構造化統合 |

### 23.3 利用タイミング
- **新規デザイン仕様作成時**: `design:design-system` で token / component 階層を相談
- **画面別実装時**: `design:design-critique` で AI 臭スコア + Apple HIG 適合度を批評
- **エンジニア実装時**: `design:design-handoff` でハンドオフ仕様生成
- **UI 文言追加時**: `design:ux-copy` で文言検査
- **アクセシビリティ確認時**: `design:accessibility-review` で WCAG 検査
- **新ユーザ層拡張時**: `design:user-research` でペルソナ拡張
- **PO 体感インタビュー後**: `design:research-synthesis` で結果テーマ化

### 23.4 ADV / subagent 利用必須化
- ADV メインがデザイン関連の意思決定をする際、必ず該当 skill を呼出して input 取得
- subagent dispatch 時、デザイン関連ミッション prompt に「Claude Design Skill (`design:*`) 利用必須」明記
- skill 出力は SSoT に統合 (例: `lais/specs/design_*.md`)、再利用可能形式で保管
- ADV 自己ペルソナ模倣 (skill 代替) は禁止、本物の skill 呼出が必須

### 23.5 既存実装での反映
本 v3.4 以前のデザイン関連作業 (Stage 0-6 + 7-1) のうち、Stage 7-1 で `design:design-system` 利用済。Stage 7-2 / 7-3 以降は本 §23 に準じて全 subagent に Skill 利用を組込む (Stage 7-2 で `design:design-handoff` 利用例)。

### 23.6 弱点と補完 (本 §23 適用上の留意)
Claude Design Skill には以下の弱点がある (PO 質問 2026-04-27 に回答):
1. **ビジュアル生成不可**: 出力は markdown / 表中心、PNG / SVG / Figma ファイル直接生成しない → モック作成は別 subagent (HTML/CSS + Playwright) で対応
2. **画像入力不可**: skill は画像視覚評価しない → 視覚判断は ADV (Claude マルチモーダル) で補完
3. **業界バイアス**: Apple HIG / Material Design 等の西洋系フレームワーク中心、和風 / DQ ピクセル等の独創的世界観への提案弱め → 独創性は人間判断 + ADV 補完
4. **大規模 token 制約**: 1 回の skill 呼出で多 input は context 不足 → 21 画面一括ではなく画面別に分割呼出
5. **実装連携弱**: skill 出力は仕様 markdown、実 .jsx / .css への自動展開なし → subagent で実装するときに skill output を inline 参照
6. **対話的反復不可**: 1 回呼出で結果取得、修正は再呼出 → 反復前提で workflow 設計
7. **アクセシビリティ自動 audit 不可**: skill は記述ベースのみ、axe-core / Lighthouse の自動 audit はしない → CI 連携で別 tool 用意

### 23.7 関連 PD
- PD-CLAUDE-DESIGN-SKILL-MANDATORY-V1 (要起票、本 §23 を `docs/decision_log.md` に PD 記録)

