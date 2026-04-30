# FULL-SCREEN-TEST-GAP-PERSONA-REVIEW (2026-04-26)

## §0 状況 + 14 票結果

### 状況
Lais Phase A 全 13 画面のテスト体制で構造的盲点（mock 中心 PASS / 実機未検証）が露呈。直近のログイン画面障害（mock smoke のみ PASS、実 GoTrue signin 未検証で本番障害）と同系統の盲点が他 12 画面にも残存している可能性が高い。

### 検証カバレッジ現状
- mock 経由 DOM 描画 = PASS
- 公開 / protected ルート redirect = PASS
- 実 Supabase へのデータ読み書き = 未検証
- 実機での画面遷移 / モーダル動作 / フォーム送信 / リアルタイム更新 = 未検証

### 14 票投票結果（10 ペルソナ × 3 優先順位 = 30 スロットの加重集計、上位 14 集約）

| 順位 | 画面 | 加重票 (top-1=3pt / top-2=2pt / top-3=1pt) | 出現回数 |
|------|------|--------------------------------------------|----------|
| 1 | S-01 Auth (signin/signup) | 27pt (top-1×9) | 9 / 10 |
| 2 | AuthCallback (PKCE) | 19pt (top-1×1 + top-2×8) | 9 / 10 |
| 3 | S-20 TALK (チャット UI) | 5pt (top-3×4 + top-2×0) | 4 / 10 |
| 4 | S-13 Task Detail | 3pt (top-2×1 + top-3×1) | 2 / 10 |
| 5 | S-12 Task Add | 2pt (top-3×2) | 2 / 10 |
| 5 | S-10 GROW Dashboard | 2pt (top-3×2) | 2 / 10 |
| 5 | S-02 Onboarding | 3pt (top-2×1 + top-3×1) | 2 / 10 |

→ **採択: 高リスク画面 Top 3 = S-01 Auth / AuthCallback / S-20 TALK**

---

## §1 ペルソナ別批判（10 件）

### 1. solo_dev
- HIGH_RISK: S-01 Auth (PKCE フロー未検証) / AuthCallback (sessionStorage 永続化と redirect race) / S-12 Task Add (RLS 越し insert + 楽観更新)
- 主隠れバグ: RLS policy が mock に存在せず本番で 401/403 連鎖 (S-10/S-12/S-13/S-15) / Realtime channel subscribe leak (S-20/S-10) / 閲覧↔編集 swap で dirty state 未保持 (S-13)
- PRIORITY: S-01, AuthCallback, S-12

### 2. devops_engineer
- HIGH_RISK: S-01 Auth (本番 PKCE 未検証で再発) / AuthCallback (code_verifier の sessionStorage / redirect_uri / session 確立が mock bypass) / S-12 Task Add (実 INSERT + RLS + 楽観 rollback の silent fail)
- 主隠れバグ: PKCE code_verifier が iOS Safari の sessionStorage 揮発でロスト / リアルタイム subscribe channel 多重 / ハーフモーダル keyboard avoiding と safe-area が iOS で入力欄を隠す
- PRIORITY: S-01, AuthCallback, S-12

### 3. qa_lead
- HIGH_RISK: S-01 Auth (password 強度・既存メール 422・rate limit 429 が mock で再現不能) / AuthCallback (code_verifier sessionStorage 永続化と URL fragment 解析) / S-20 TALK (Realtime presence・楽観更新ロールバック)
- 主隠れバグ: 重複 INSERT イベント受信 / ハーフモーダル閉鎖時 form state 残留と二重 submit / Edit swap 時の楽観更新失敗ロールバック不在 / S-30 タブ Suspense 境界で auth token 期限切れ white screen
- PRIORITY: S-01, AuthCallback, S-20

### 4. tech_writer
- HIGH_RISK: S-01 Auth (mock 通過済でも GoTrue で再現する障害) / AuthCallback (URL fragment 取り扱い mock 不能) / S-20 TALK (Realtime channel / RLS / 楽観差分)
- 主隠れバグ: 「読めるはずが空」が本番だけ発生 (S-10/S-14) / ハーフモーダル送信後の二重表示 or 消失 / S-30 タブ切替時の silent fail 白画面化 / iOS Safari in-app browser で AuthCallback 空白固まり
- PRIORITY: S-01, AuthCallback, S-10

### 5. ai_ops
- HIGH_RISK: S-01 Auth (実通信・PKCE トークン交換・セッション永続化) / S-13 Task Detail (閲覧→編集 swap の楽観更新と Supabase update の整合) / S-20 TALK (WebSocket 再接続・メッセージ順序)
- 主隠れバグ: SELECT/INSERT が無音失敗し UI は空配列を成功表示 / PKCE code_verifier の sessionStorage キー不一致で 401 ループ / Realtime 再接続時にメッセージ重複 or 欠落、optimistic insert と server echo の二重表示
- PRIORITY: S-01, S-13, S-20

### 6. security_engineer
- HIGH_RISK: S-01 Auth (rate limit / PKCE state 検証必須) / AuthCallback (redirect URL allowlist / SameSite / refresh token rotation) / S-13 Task Detail (楽観更新と RLS UPDATE policy 衝突)
- 主隠れバグ: select 成功 / insert 失敗の片側通過 / multipart アバター upload の Storage bucket policy 未設定で 403 + クライアント MIME 検証 bypass 可 (S-30) / iOS Safari viewport / keyboard 競合でフォーム送信ボタン到達不可
- PRIORITY: S-01, AuthCallback, S-13

### 7. データガバナンス専門家
- HIGH_RISK: AuthCallback (code_verifier 消失 / redirect_to 不一致で session 確立失敗) / S-20 TALK (Realtime channel の RLS auth token 連動と messages INSERT 時の auth.uid() 整合) / S-02 Onboarding (双方向 partnership 行作成のアトミック性と FK / UNIQUE 制約)
- 主隠れバグ: RLS の INSERT/UPDATE policy 未設定で 42501 拒否 (tasks/goals/messages) / partnership 双方向 INSERT が単一 transaction でなく片側成立して S-10 で永久に非対称表示 / created_at/updated_at の DB default と Zod schema 型不一致で 400
- PRIORITY: AuthCallback, S-02, S-20

### 8. 違反パターン分析専門家
- HIGH_RISK: S-01 Auth (mock-only PASS で本番障害発生済) / AuthCallback (sessionStorage 永続性・redirect URL 環境差・state 照合) / S-20 TALK (Realtime channel.subscribe / WebSocket 接続)
- 主隠れバグ: SELECT 通過するが本番では auth.uid() 不一致で空配列→無限スピナー / Realtime postgres_changes が RLS で受信不能・購読自体は成功するため failure が silent / NOT NULL / FK / CHECK 制約違反 23502/23503 / モーダル閉鎖時 scroll lock 解除漏れ
- PRIORITY: S-01, AuthCallback, S-20

### 9. プロジェクトマネジメント専門家
- HIGH_RISK: S-01 Auth (再発リスク最大) / AuthCallback (PKCE / state は mock 不可) / S-02 Onboarding (初回 user_metadata 書込み + RLS 初回 INSERT)
- 主隠れバグ: モック通る SELECT/INSERT が本番で 401/403 / Realtime channel leak でイベント二重発火 / ハーフモーダル dismiss で form state 残留 / S-30 タブ切替で useEffect cleanup 漏れ → stale data + requests 多重発火
- PRIORITY: S-01, AuthCallback, S-02

### 10. システム設計専門家
- HIGH_RISK: S-01 Auth (PKCE flow / email confirm / rate limit が mock 再現不能) / AuthCallback (code_verifier sessionStorage 永続性とリダイレクト URL ホワイトリスト) / S-20 TALK (Realtime presence / 楽観更新競合)
- 主隠れバグ: SPA リロードで PKCE code_verifier 消失し invalid_grant 無限リダイレクト / S-12/S-15 のモーダル閉じで前回入力漏出 / S-13 swap での race による stale 上書き / S-30 タブ切替で未保存フォーム silent discard
- PRIORITY: S-01, AuthCallback, S-10

---

## §2 高リスク画面 Top 3 + 隠れバグパターン

### Top 1: S-01 Auth (signin/signup) — 加重 27pt / 9 票
- 直近本番障害発生済。GoTrue signin/signup の実 API レスポンス（password 強度・既存メール 422・rate limit 429）が mock では再現不能。
- email 確認フロー、PKCE state 生成、セッション永続化（localStorage / cookie SameSite）が実機必須。

### Top 2: AuthCallback (PKCE) — 加重 19pt / 9 票
- PKCE code_verifier の sessionStorage 永続化が iOS Safari ITP / タブ遷移 / リロードで揮発し invalid_grant の無限リダイレクト。
- redirect_uri 一致 / Supabase ホワイトリスト / cookie SameSite / refresh token rotation の実機差で session 未確立化。
- mock では code 交換 / fragment 解析 / state 照合のすべてを bypass するため検出原理的に不能。

### Top 3: S-20 TALK (チャット UI) — 加重 5pt / 4 票
- Supabase Realtime channel.subscribe / postgres_changes が RLS auth token 連動下で動作するか mock では完全 bypass。
- WebSocket 切断 → 再接続時のメッセージ欠落 / 重複 / 順序破壊が mock 単発 fetch では検出不能。
- 楽観 INSERT と server echo の二重表示、presence の RLS 経由可視性、JWT refresh 後の channel silent 切断。

### 全 13 画面共通 隠れバグパターン（5 件）
1. **RLS policy 未適用 / 不整合 → mock 通過 / 本番で 401・403・空配列**: S-10/S-12/S-13/S-14/S-15/S-30 全て該当。「読めるはずが空」が無限スピナー化。
2. **Realtime subscribe leak / silent 切断**: S-10 / S-20 のチャネル多重 subscribe、JWT refresh 後の silent 切断、モーダル再開閉でのイベント二重発火。
3. **ハーフモーダル / フルスクリーンモーダル の実機破綻**: S-12 / S-15 / S-14 で iOS Safari のキーボード被り、safe-area 重なり、scroll lock 解除漏れ、form state 残留・二重 submit。
4. **楽観更新と Supabase 戻り値の race**: S-13 閲覧↔編集 swap で stale 上書き、S-12/S-15 送信後に二重表示 or 消失、ロールバック不在で UI と DB の値乖離。
5. **セッション失効 / トークン期限切れの silent fail**: S-30 タブ切替や S-13 編集 swap 中に 401 で white screen、未保存フォーム silent discard。

---

## §3 実機テスト構築優先順位 + 実装計画

### 優先順位（採択）
1. **S-01 Auth (signin/signup)** — 別 subagent LOGIN-TEST-STRUCTURAL-FIX-IMPL が実装中（領域分離）
2. **AuthCallback (PKCE)** — Top 1 と一体で動作するため本レビューで起票、subagent 起動対象
3. **S-20 TALK** — Realtime / WebSocket は固有検証経路が必要、独立 subagent

### 実装計画（subagent 並列起動方針 — 全て ADV 自律、ふとし作業ゼロ）

#### Plan A: AuthCallback 実機検証 subagent
- Playwright で実 Supabase に対し signin → AuthCallback URL 復帰 → session 確立を E2E
- code_verifier の sessionStorage 永続性、redirect_uri 一致、iOS Safari simulating の検証
- 失敗時 invalid_grant メッセージ捕捉、無限リダイレクト loop 検知

#### Plan B: S-20 TALK 実機検証 subagent
- 実 Supabase Realtime channel.subscribe → INSERT → broadcast → 受信を E2E
- JWT refresh 中の channel 状態保持、再接続時のメッセージ重複/欠落検証
- 楽観 INSERT と server echo の照合、presence の RLS 可視性

#### Plan C: 全 13 画面共通の RLS マトリクス subagent
- 実 Supabase anon key で全テーブル × CRUD × auth.uid 状態の SELECT/INSERT/UPDATE/DELETE 矩形
- 401/403/42501/23502/23503 をエラー区別して全件報告
- partnership 双方向 INSERT のアトミック性検証 (S-02)

#### Plan D: 実機モーダル / キーボード / safe-area 検証 subagent
- iOS Safari / Android Chrome の実機 viewport で S-12/S-13/S-14/S-15/S-30 のモーダル開閉、scroll lock、キーボード回避、safe-area inset
- フォーム送信ボタン到達性、二重 submit 抑止、dismiss 時の form state cleanup

→ A/B/C/D は領域分離可能で並列起動可。S-01 は LOGIN-TEST-STRUCTURAL-FIX-IMPL 完了後に統合テスト合流。

---

## §4 PO 向け 3 行サマリー

1. **高リスク画面 Top 3**: S-01 Auth / AuthCallback (PKCE) / S-20 TALK (Realtime チャット)。10 ペルソナ中 9 票が S-01 と AuthCallback を最優先指定。
2. **隠れバグパターン**: (a) RLS policy 不整合で本番のみ空配列・401 (b) Realtime subscribe leak と silent 切断 (c) ハーフモーダルの iOS キーボード被り (d) 楽観更新 race による stale 上書き (e) セッション失効時の white screen。
3. **次**: ADV 自律で AuthCallback / S-20 TALK / 全画面 RLS マトリクス / 実機モーダル の 4 subagent を並列起動（ふとし作業ゼロ、S-01 は別 subagent LOGIN-TEST-STRUCTURAL-FIX-IMPL と合流）。

---

[Review: 1 round, 10 personas — solo_dev / devops_engineer / qa_lead / tech_writer / ai_ops / security_engineer / data_governance / violation_pattern / project_management / system_design]
