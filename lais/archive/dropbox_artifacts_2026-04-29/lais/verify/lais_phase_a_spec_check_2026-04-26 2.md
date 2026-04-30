# LAIS-PHASE-A-SPEC-CHECK: OBS-RT-01〜03 仕様判定レポート（2026-04-26）

> 主体: SUBAGENT-LAIS-PHASE-A-SPEC-CHECK
> ミッション: LAIS-PHASE-A-SPEC-CHECK
> 入力: SUBAGENT-LAIS-LOGIN-RETEST V2 で検出された 3 観察事項
> 仕様根拠: docs/plans/lais_design_spec_v1.md v1.0 / docs/plans/lais_ux_v1.md v1.15 / docs/plans/lais_project_v1.md v1.4
> 書込: 本ファイル 1 件 + lais/verify/dev_system_v34_patches.md 末尾追記 + SSOT 4 ファイル
> 並走: SUBAGENT-LAIS-PHASE-A-ROUTER-S15（BUG-RT-01 修正）と領域分離

---

## §0 状況

### §0.1 入力

LAIS-LOGIN-RETEST V2（Playwright headless 実機テスト）で 3 件の仕様確認待ち観察事項が検出された。判定主体は不在のため Phase A 仕様書 3 本を SSoT として判定する。

| ID | 現象 | 判定要望 |
|----|------|---------|
| OBS-RT-01 | `/onboarding` `/grow` `/goal/:id` `/talk` `/me` が未認証で 200 描画 | 認証ゲート要否（必要なら未実装＝バグ） |
| OBS-RT-02 | `/task/add` `/task/:id` が NotFound → `/` フォールバック | 到達経路（モーダル？ Route？） |
| OBS-RT-03 | `/auth/callback` を code 無しで直訪問 → main.s01 描画（白画面なし） | 自動 redirect 仕様 |

### §0.2 判定サマリー

| OBS | 判定 | 根拠 |
|-----|------|------|
| OBS-RT-01 | **バグ昇格**（BUG-RT-AUTH-GATE） | 仕様明示あり（UX §14.1 / project §3.5）、実装で session signal を未使用 |
| OBS-RT-02 | **仕様通り** | UX §1.1 / design_spec §4.5/§4.6: S-12/S-13 はハーフモーダル、Route ではない。S10Grow が `<S12TaskAdd open>` `<S13TaskDetail open>` で正しく呼出済 |
| OBS-RT-03 | **仕様通り** | AuthCallback.jsx 実装は `code` 不在 / セッション無時に「セッションを確立できませんでした」表示 → 2 秒後 `route('/auth?mode=login', true)` で自動 fallback。意図動作 |

---

## §1 OBS-RT-01: protected route 認証ゲート要否

### §1.1 現象

`/onboarding` `/grow` `/goal/:id` `/talk` `/me` の 5 ルートが**未認証セッションでも 200 + サンプルデータ描画**される。Supabase セッション無しでもアプリ画面が見えてしまう。

### §1.2 仕様根拠（認証ゲートが必要）

#### §1.2.1 UX §14.1 アプリ起動フロー（リピーターユーザー、ログイン済み前提）

```
PWA起動 / ブラウザアクセス
  → Service Worker キャッシュチェック
  → スプラッシュ表示（ロゴ + アプリ名。最大2秒）
  → Supabase Auth セッション検証
     ├─ 有効 → S-10 GROW画面
     ├─ 期限切れ → リフレッシュトークンで再認証
     │   ├─ 成功 → S-10 GROW画面
     │   ├─ 失敗（オンライン） → S-02 ログイン画面
     │   └─ 失敗（オフライン） → ローカルキャッシュでGROW画面表示（読み取り専用ではない。タスク完了/追加はローカル記録可能。EXP演出は非表示で「同期待ち」バッジ表示。TALK画面は無効化。オンライン復帰時に再認証→同期）
```

→ **「セッション検証」 が GROW 描画の前提条件**。期限切れ時はリフレッシュ → 失敗で S-02。すなわち認証セッションがゼロの状態で `/grow` 等のアプリ画面が見えてはならない。

#### §1.2.2 project_v1.md §3.5 未ログイン画面

> **未ログイン: ランディングページ（コンセプト紹介＋サインアップ/ログインボタン）**

→ 未認証ユーザーに見せるのは S-00 ランディングのみ。GROW / TALK / ME などのアプリ本体画面の露出は仕様違反。

#### §1.2.3 project_v1.md §7.2 RLS

> RLS: 基本は自分のデータのみCRUD可能。

→ サーバー側は RLS で守られているが、クライアント側ルートも未認証時にアプリシェル（サンプルデータでも）を露出させるのはサーバ防御の前提に反する。さらに「自分のデータがゼロ件で空状態画面が見える」は UX 整合性も崩れる（ログイン後と区別がつかない）。

#### §1.2.4 UX §14.2 新規ユーザーフロー

```
ブラウザアクセス
  → S-00 ランディングページ
  → [サインアップ] → S-01（利用規約+プライバシーポリシー同意チェック必須）
  → メール入力 + パスワード設定
  → S-04 メール認証待ち画面 → メール内リンクタップ → 認証完了 → S-03 オンボーディング
  → 5ステップ完了 → S-10 GROW画面
```

→ S-10 GROW 到達は「認証完了 → オンボーディング完了」を経た後のみ。直 URL でスキップ可能なら仕様の整合性が崩れる。

### §1.3 実装現状

#### §1.3.1 lais/src/lib/auth.js

```js
export const session = signal(null);
export const authLoading = signal(true);

export function bootstrapAuth() {
  if (bootstrapped) return;
  bootstrapped = true;
  supabase.auth.getSession()...
  supabase.auth.onAuthStateChange((_event, newSession) => {
    session.value = newSession ?? null;
  });
}
```

→ session signal は存在し更新もされている。

#### §1.3.2 lais/src/components/App.jsx

```jsx
<Router>
  <SplashRoute path="/" onStart={handleStart} onLogin={handleLogin} />
  <AuthCallbackRoute path="/auth/callback" />
  <AuthRoute path="/auth" />
  <OnboardingRoute path="/onboarding" />
  <GrowRoute path="/grow" />
  <GoalDetailRoute path="/goal/:id" />
  <TalkRoute path="/talk" />
  <MeProfileRoute path="/me" />
  <NotFound default />
</Router>
```

→ 各 Route は **認証ガード一切なし**。`session.value` を使う Read 検索結果は `lais/src/lib/auth.js` のみで、画面/Router で session を検証している箇所は **0 件**。

```bash
$ grep -rn "session.value\|isAuth\|未認証\|未ログイン" /lais/src/
# Hit: lais/src/lib/auth.js のみ
```

### §1.4 判定: **バグ昇格（BUG-RT-AUTH-GATE）**

仕様（UX §14.1 / project §3.5 / §14.2）が明示的に「セッション検証 → S-02 / S-00 へリダイレクト」を要求しており、実装側で session signal は更新されているのに**消費されていない**ため、仕様 vs 実装の乖離が確実。

### §1.5 推奨修正案（fix subagent BUG-RT-AUTH-GATE 起動候補）

#### §1.5.1 設計

`App.jsx` に `RequireAuth` 高階コンポーネントを新設し、protected ルートをラップする。

```jsx
import { session, authLoading } from '../lib/auth.js';

function RequireAuth({ children }) {
  if (authLoading.value) return <Loading />;        // 初回 getSession 中
  if (!session.value) {
    route('/', true);                                // S-00 へ強制 redirect
    return null;
  }
  return children;
}
```

#### §1.5.2 適用先

protected ルート 5 件:
- `/onboarding` （OnboardingRoute）
- `/grow` （GrowRoute）
- `/goal/:id` （GoalDetailRoute）
- `/talk` （TalkRoute）
- `/me` （MeProfileRoute）

公開ルート 3 件（ガード不要）:
- `/` （SplashRoute）
- `/auth` （AuthRoute）
- `/auth/callback` （AuthCallbackRoute、自前で session 検証済み）

#### §1.5.3 オフラインフォールバック（UX §14.1 準拠）

`session.value === null` && `navigator.onLine === false` && `localStorage に過去セッション残在` の組合せで「ローカルキャッシュ表示モード」許可（読み取り専用、TALK 無効化）。MVP では Phase A の単純実装で OK、オフライン許容は Phase B-Offline で繰延可。

#### §1.5.4 ディープリンク保持

未認証で protected ルートを直訪問した場合、redirect 前に `sessionStorage.setItem('lais.deeplink', currentPath)` を保存。S-02 ログイン成功後に取得して route。UX §6.4 / §15 のディープリンク仕様に準拠。

#### §1.5.5 smoke テスト追加

`lais/tests/smoke/auth-gate.spec.ts` を新設し、未認証で `/grow` 直訪問 → S-00 にリダイレクトされることを assert。

### §1.6 影響評価

- **未修正リスク**: 未認証ユーザーが直 URL で内部画面を閲覧可能 = UX 整合性破綻 + 「ログインしたつもり」の混乱 + サンプルデータが露出する場合のプライバシ印象悪化。Phase B-2 RLS で自分のデータは守られるが、画面シェルとサンプル/プレースホルダの露出は防げない。
- **修正コスト**: 小（RequireAuth 1 ファイル + 5 ルートのラップ + smoke 1 件）。
- **CRITICAL 度**: HIGH（仕様明示 + UX 整合 + Phase B 完遂判定の前提）。Phase B 完了前に解消必須。

---

## §2 OBS-RT-02: S-12 / S-13 到達経路

### §2.1 現象

`/task/add` `/task/:id` が NotFound → `/` フォールバック。`S12TaskAdd.jsx` `S13TaskDetail.jsx` は実装済みなのに、URL 直訪問では到達できない。

### §2.2 仕様根拠（モーダル方式が正、Route ではない）

#### §2.2.1 UX §1.1 画面一覧

| 画面 | 名称 | タイプ | 親 |
|------|------|--------|-----|
| S-11 | タスク詳細パネル | **ハーフモーダル** | S-10 |
| **S-12** | **タスク追加** | **ハーフモーダル** | **S-10** |
| S-13 | タスク編集 | **S-11内インライン** | S-11 |
| S-14 | ゴール詳細 | フルスクリーン | S-10 |
| S-15 | ゴール作成 | ハーフモーダル | S-10 |
| S-16 | ゴールタスク追加 | ハーフモーダル | S-14 |

→ S-12 / S-13 は明示的に **ハーフモーダル**。Route 化されない。

#### §2.2.2 UX §1.2 遷移マトリクス

```
S-10 GROW
  ├─[タスクタップ]→ S-11 詳細パネル（ハーフモーダル上昇）
  │   ├─[編集]→ S-13 編集（パネル内遷移）
  │   ├─[削除]→ 確認ダイアログ → S-10に戻る
  │   └─[AI相談]→ S-11を閉じる → S-20 TALKに遷移
  ├─[+タスク追加]→ S-12（ハーフモーダル上昇）
  ...
S-20 TALK
  └─[タスク提案カード > 編集して登録]→ S-12 タスク追加ハーフモーダル（AI事前入力済み）
```

→ S-12 は「+タスク追加」ボタンタップで上昇するハーフモーダル。S-13 は S-11 詳細パネル内のインライン swap。**いずれも親画面の状態管理で開閉**する。

#### §2.2.3 design_spec_v1.md §4.5 / §4.6

§4.5: 「S-12 Task Add（**ハーフモーダル**）」、§4.6: 「S-13 Task Detail（ハーフモーダル / インライン編集）」、「閲覧モードでの編集は同モーダル内で inline swap」と明示。

### §2.3 実装現状

#### §2.3.1 lais/src/components/screens/S10Grow.jsx（574, 584 行）

```jsx
import { S12TaskAdd } from "./S12TaskAdd.jsx";
import { S13TaskDetail } from "./S13TaskDetail.jsx";

// 中略
<S12TaskAdd open={taskAddOpen} onClose={...} ... />
<S13TaskDetail open={taskDetailOpen} task={selectedTask} ... />
```

→ 仕様通り、S-10 内でハーフモーダルとして既に正しく実装済。

#### §2.3.2 S12TaskAdd.jsx / S13TaskDetail.jsx

```jsx
export function S12TaskAdd({ open, onClose, onCreate, returnFocusRef }) { ... }
export function S13TaskDetail({ open, task, onClose, onSave, onDelete, returnFocusRef }) { ... }
```

→ `open` props 受領、親が制御するモーダルパターン。Route 用の export ではない。

### §2.4 判定: **仕様通り**（修正不要）

`/task/add` `/task/:id` が NotFound → `/` フォールバックされるのは、これらが **そもそも Route として定義されていない**ため。仕様上も Route 化を求めていない（ハーフモーダル方式）。実装も S10Grow から正しく呼び出されている。

→ **OBS-RT-02 は仕様準拠の現象**。修正不要。LAIS-LOGIN-RETEST V2 の自動 smoke テストで `/task/add` `/task/:id` を URL 直訪問する手順自体が**仕様外の検証経路**なので、smoke スクリプトを修正してください（モーダル開閉を S10Grow 内のボタンクリックでテスト）。

### §2.5 推奨対応

#### §2.5.1 LAIS-LOGIN-RETEST 改訂（fix 不要）

smoke テストを下記に変更:

```js
// 旧（OBS-RT-02 を生む）
await page.goto("/task/add"); // → NotFound → / fallback

// 新（仕様通りのモーダル開閉テスト）
await page.goto("/grow");
await page.click("button:has-text('+ タスクを追加')"); // S10Grow の追加ボタン
await expect(page.locator("[role=\"dialog\"]")).toBeVisible(); // S-12 ハーフモーダル
```

→ Code 修正は不要、テストハーネス側の認識更新のみ。

### §2.6 影響評価

- **CRITICAL 度**: なし。
- **smoke テスト修正コスト**: 小（後続の LAIS-PHASE4-TEST-SETUP / smoke スクリプト整備時に同梱）。

---

## §3 OBS-RT-03: AuthCallback code 欠落時 fallback

### §3.1 現象

`/auth/callback` を `?code=...` クエリ無しで直訪問しても**白画面にならず S-01 ベースの画面が描画される**。エラーが見えない代わりに自動でログインフローに戻っている。

### §3.2 仕様根拠（自動 fallback が正）

#### §3.2.1 UX §14.1 / §14.2 認証フロー

UX §14.2: 「メール内リンクタップ → 認証完了 → S-03 オンボーディング」

→ `/auth/callback` の正常経路は「Supabase が発行した `?code=...` 付きリンクからの到達」のみ。code 無しで直訪問するシナリオは仕様の正常系外。

#### §3.2.2 design_spec_v1.md §4.7 / Phase A 認証画面分割方針

design_spec §4.2: 「Phase A では S-01 が認証画面を兼ねる」、「専用ログイン画面 (S-05 想定) は Phase B で分離予定」。

→ `/auth?mode=login` への fallback で S-01 のログインモードを表示するのは Phase A の正規動作。

#### §3.2.3 UX §1.4 戻りナビゲーション

`route("/auth?mode=login", true)` の `replace=true` も「history を増やさない（戻るボタンのピンポン防止）」という UX §1.4 の history.pushState ポリシーに準拠。

### §3.3 実装現状

#### §3.3.1 lais/src/components/screens/AuthCallback.jsx（66-87 行）

```jsx
const code = params.get("code");
if (code) {
  try { await supabase.auth.exchangeCodeForSession(code); } catch { /* ... */ }
}
const { data, error } = await supabase.auth.getSession();
if (error) throw error;
if (!data?.session) {
  throw new Error("セッションを確立できませんでした。もう一度お試しください。");
}
// 成功時: ウェルカム画面 → route("/", true)

} catch (e) {
  setErrorMessage(msg);
  setStatus("error");
  errorTimer = setTimeout(() => {
    if (!cancelled) route("/auth?mode=login", true);
  }, 2000);
}
```

→ code 無し && session 無し → throw → catch ブロックで:
1. エラーメッセージを `aria-live="polite"` で表示（「セッションを確立できませんでした…ログイン画面に戻ります…」）
2. **2 秒後に `route("/auth?mode=login", true)` で自動 fallback**

実装は仕様通り。LAIS-LOGIN-RETEST V2 の Playwright が「main.s01 描画」と観測したのは、まさにこの 2 秒後の自動 fallback で `<S01Auth mode="login">` が描画された結果。

### §3.4 判定: **仕様通り**（修正不要）

code 欠落時の fallback は実装意図通り。白画面ではなく:
1. 2 秒間の `aria-live` エラーメッセージ表示（A11y 準拠、ユーザーに「失敗 → ログインへ戻る」を可読化）
2. 自動で `/auth?mode=login` に history-replace（戻るボタンのピンポン防止）

→ **OBS-RT-03 は意図動作**。

### §3.5 推奨対応

#### §3.5.1 LAIS-LOGIN-RETEST V2 認識更新

smoke テストで `/auth/callback` 直訪問の期待動作を「2 秒後に `/auth?mode=login` にいる」に更新:

```js
await page.goto("/auth/callback");
await expect(page.locator("text=セッションを確立できませんでした")).toBeVisible(); // 2 秒間表示
await page.waitForURL("**/auth?mode=login", { timeout: 3000 });
await expect(page.locator("main")).toContainText("ログイン");
```

→ Code 修正は不要、smoke の assertion 修正のみ。

#### §3.5.2 任意改善（Phase B 繰延候補）

エラーメッセージ表示時間 2 秒を短縮 / 延長したい PO 要望が出た場合は `WELCOME_HOLD_MS` と同様の定数化（現在は `setTimeout(..., 2000)` のマジックナンバー）。LP-011 観点で軽微改善案として記録のみ、本 PATCH では対象外。

### §3.6 影響評価

- **CRITICAL 度**: なし。
- **smoke 修正コスト**: 小。

---

## §4 PO 向け 5 行サマリー

1. **OBS-RT-01（auth gate）= バグ昇格**: 仕様（UX §14.1 / project §3.5）が「未認証時 S-00 redirect」を明示。session signal 実装済だが画面側で未消費 → BUG-RT-AUTH-GATE。fix subagent 起動候補（RequireAuth 1 ファイル + 5 ルートラップ + smoke 1 件で完遂可）。HIGH（Phase B 完遂前必須）。
2. **OBS-RT-02（S-12/S-13 routes）= 仕様通り**: S-12/S-13 はハーフモーダル（UX §1.1 / design_spec §4.5/§4.6）。S10Grow.jsx で `<S12TaskAdd open>` `<S13TaskDetail open>` として既に正しく実装済。`/task/add` `/task/:id` の Route 化は仕様外、smoke テスト側の改訂のみで解消。
3. **OBS-RT-03（AuthCallback code 欠落）= 仕様通り**: AuthCallback.jsx 86 行で code 不在 / session 無時に「セッションを確立できませんでした」aria-live 表示 → 2 秒後 `route("/auth?mode=login", true)` 自動 fallback。意図動作で白画面なし、smoke 側の assertion 改訂のみで解消。
4. **次アクション**: ADV メイン側で BUG-RT-AUTH-GATE fix subagent 起動（並走 SUBAGENT-LAIS-PHASE-A-ROUTER-S15 と領域分離: S15 ルート登録 vs auth ガード追加で衝突なし）。OBS-RT-02/03 は LAIS-PHASE4-TEST-SETUP でテストハーネス改訂時に同梱。
5. **PATCH-PHASE-A-SPEC-CHECK 起票**: 本判定結果を patches.md 末尾に追記。SSOT 4 ファイル（subagent_status / in_flight_topics / session_progress / decision_log）に判定反映。BUG-RT-AUTH-GATE 起票は fix subagent の責務範囲。

---

## §5 関連ファイル

### §5.1 仕様根拠（参照のみ）

- `/Users/futoshi/Desktop/goal-ai-worker/docs/plans/lais_design_spec_v1.md` v1.0 §4.5（S-12 ハーフモーダル）/ §4.6（S-13 ハーフモーダル + インライン swap）
- `/Users/futoshi/Desktop/goal-ai-worker/docs/plans/lais_ux_v1.md` v1.15 §1.1（画面一覧）/ §1.2（遷移マトリクス）/ §14.1（リピーターフロー）/ §14.2（新規ユーザーフロー）/ §15（ディープリンク）
- `/Users/futoshi/Desktop/goal-ai-worker/docs/plans/lais_project_v1.md` v1.4 §3.5（未ログイン画面）/ §7.2（RLS）

### §5.2 実装ファイル（参照のみ）

- `/Users/futoshi/Desktop/goal-ai-worker/lais/src/components/App.jsx`（Router 構成、未認証ガード未実装の現状）
- `/Users/futoshi/Desktop/goal-ai-worker/lais/src/lib/auth.js`（session signal 定義、消費先なし）
- `/Users/futoshi/Desktop/goal-ai-worker/lais/src/components/screens/S10Grow.jsx`（574/584 行、S-12/S-13 をモーダル呼出済）
- `/Users/futoshi/Desktop/goal-ai-worker/lais/src/components/screens/S12TaskAdd.jsx`（`open` props 制御）
- `/Users/futoshi/Desktop/goal-ai-worker/lais/src/components/screens/S13TaskDetail.jsx`（`open` props 制御）
- `/Users/futoshi/Desktop/goal-ai-worker/lais/src/components/screens/AuthCallback.jsx`（86 行 fallback 実装済）

### §5.3 SSOT 更新対象

- `/Users/futoshi/Desktop/goal-ai-worker/lais/verify/dev_system_v34_patches.md`（PATCH-PHASE-A-SPEC-CHECK 末尾追記）
- `/Users/futoshi/Desktop/goal-ai-worker/instructions/subagent_status.md`（SUBAGENT-LAIS-PHASE-A-SPEC-CHECK status: completed）
- `/Users/futoshi/Desktop/goal-ai-worker/instructions/in_flight_topics.md`（TASK-PHASE-A-SPEC-CHECK completed エントリ）
- `/Users/futoshi/Desktop/goal-ai-worker/instructions/session_progress.md`（Last done 並走完遂エントリ追加）
- `/Users/futoshi/Desktop/goal-ai-worker/docs/decision_log.md`（PD-PHASE-A-SPEC-CHECK 追記、任意）

---

## §6 完了報告（subagent → ADV メイン）

```
[完了報告 - LAIS-PHASE-A-SPEC-CHECK]
1. やったこと: OBS-RT-01〜03 を Phase A 仕様書 3 本（design_spec_v1 / ux_v1 / project_v1）で判定
2. 結果: バグ昇格 1 件（OBS-RT-01 → BUG-RT-AUTH-GATE）/ 仕様通り 2 件（OBS-RT-02 / OBS-RT-03）/ 要 PO 確認 0 件
3. 検証: lais/verify/lais_phase_a_spec_check_2026-04-26.md 新設（本ファイル）/ PATCH-PHASE-A-SPEC-CHECK 起票
4. 影響: BUG-RT-AUTH-GATE は fix subagent 起動候補（HIGH、Phase B 完遂前必須）。OBS-RT-02/03 は smoke テスト改訂のみで解消（LAIS-PHASE4-TEST-SETUP 同梱可）
5. 次: ADV メイン側で fix subagent BUG-RT-AUTH-GATE 起動（並走 SUBAGENT-LAIS-PHASE-A-ROUTER-S15 と領域分離可能）
```
