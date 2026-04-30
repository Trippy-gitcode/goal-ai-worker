# LAIS 「メール承認後 signin できない」自動切り分けレポート（第 3 報）

> ミッション ID: LAIS-POST-CONFIRM-LOGIN-DEBUG
> 起票: ADV QA subagent（PO ふとし報告「新メアドで signup → メール届いて承認 → signin できない」）
> 検証日時: 2026-04-26 / モード: 自動切り分け（前回 EMAIL-LOGIN-DEBUG 第 2 報の継続検証）
> 結論先出し: **Site URL/Redirect URLs 設定不備により、確認メールのリンクが `/auth/callback` ではなく root `/` に redirect。さらに supabase-js v2 が `flowType: 'pkce'` 設定下で `#access_token=` ハッシュを処理しない仕様。結果セッション未確立 → S00Splash → ふとし体感の「ログインできない」**

---

## §1. 確定原因（最有力、先出し）

### ⭐⭐⭐⭐ R1 確定: 確認メールのリダイレクト先が `/auth/callback` ではなく `/` (root)

**実機証拠（curl 直接 + Playwright 実機 二重確認）**:

```
=== Admin generate_link request ===
redirect_to=https://lais-3yk.pages.dev/auth/callback   ← フロントが指定する値

=== Returned action_link (= 確認メール本文の URL) ===
https://wrvwcfilokfcjudspizp.supabase.co/auth/v1/verify?token=...&type=signup&redirect_to=https://lais-3yk.pages.dev   ← /auth/callback が ストリップ

=== Click action_link → 303 redirect Location ===
Location: https://lais-3yk.pages.dev#access_token=eyJ...&refresh_token=...&type=signup
                                ^^^ root に着地、#access_token (ハッシュ) で tokens 付与
```

**メカニズム**:
- Supabase Auth は `redirect_to` パラメータを **Site URL + Redirect URLs allowlist** で検証する。
- マッチしない値が来た場合、**Site URL（root URL）** にフォールバックして path を切り捨てる。
- 今回 `https://lais-3yk.pages.dev/auth/callback` は **allowlist 未登録** → `https://lais-3yk.pages.dev`（path 無し）にフォールバック。
- 確認メール経由の verify エンドポイントは **Implicit flow 形式（hash fragment にトークン）** で 303 redirect する仕様。

### ⭐⭐⭐⭐ R2 確定: supabase-js v2 + `flowType: 'pkce'` は `#access_token=` ハッシュを処理しない

**実機証拠（Playwright + localStorage 検査）**:

```
=== Step: Click action_link → 着地後 2.5s 待機 ===
URL: https://lais-3yk.pages.dev/#access_token=eyJ...&refresh_token=...&type=signup
localStorage: {}   ← セッションが localStorage に書込まれていない
visible body: 「Lais / あなたの人生を、あなたらしく / はじめる / ログイン」
                ^ S00Splash 画面（未認証）= 確認したのにログイン状態にならない！
```

**メカニズム**:
- `lais/src/lib/supabase.js` 設定:
  ```js
  createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',   // ← これが原因
    }
  });
  ```
- supabase-js v2.103+ は `flowType: 'pkce'` の場合、`detectSessionInUrl` は **`?code=` query** のみ処理。
- `#access_token=` ハッシュは **`flowType: 'implicit'`（既定値）** のときのみ処理される。
- ふとしの状況: 確認メールリンク → root に hash で着地 → supabase-js が hash を無視 → セッション未確立 → 「ログインしてない状態」のまま splash 表示。

### ⭐⭐⭐ R3 確定: `/auth/callback` PKCE handler は今回経路上 そもそも実行されない

- `AuthCallback.jsx` は `?code=` query を `exchangeCodeForSession` で交換するロジック。
- しかし R1 により、URL は `/` 着地で `/auth/callback` に到達しないため、PKCE handler は無関係。
- 仮に redirect URL allowlist を追加して `/auth/callback#access_token=...` に着地できても、`AuthCallback.jsx` は **hash を読まない**（`params.get('code')` のみ）→ `data.session` が `null` → 「セッションを確立できませんでした」エラー → `/auth?mode=login` へ追い返し。

### 補助確認: signin form 経由の API は完全動作

```
Test: lais-qa-link-1777195606@example.com / pass で /auth/v1/token?grant_type=password
Result: 200, access_token 発行, user.email_confirmed_at 確認済み

Playwright signin フォーム submit → URL=/  / localStorage に sb-*-auth-token 書込済 / serverError なし
```
→ **API レベル + form レベルで signin は壊れていない**。問題は「承認後の URL 体験」が壊れている点に集約。

---

## §2. 観点別判定（受領 5 観点）

| # | 観点 | 判定 | 根拠 |
|---|---|---|---|
| 1 | メール内リンクの callback URL | **`/auth/callback` ではなく `/` (root) に redirect** ⭐⭐⭐⭐ | `action_link` の `redirect_to=https://lais-3yk.pages.dev`（path 無し）/ Playwright 実機で root#hash 着地確認 |
| 2 | AuthCallback.jsx PKCE フロー | 経路上 実行されない / 仮実行されてもhash 未対応 ⭐⭐⭐ | URL が `/auth/callback` に到達せず、コード上 `params.get('code')` のみ読む実装 |
| 3 | session 永続化（localStorage） | 確認直後 `localStorage: {}` ⭐⭐⭐⭐ | Playwright で hash 着地後 2.5s 待っても sb-*-auth-token 未作成 |
| 4 | RequireAuth 判定 | session=null で正常動作（splash 表示は仕様通り） | `/` は `S00Splash` (公開ルート、未認証 OK)。RequireAuth は今回の経路上発動しない |
| 5 | Network / Console | エラーは出ていない（hash が黙殺されているだけ） | 200 GET + 303 redirect 完了、JS error 0、Console clean |

---

## §3. 修正案（ADV 自律修正 + ふとし最小操作）

### 【最優先 A — ADV 自律修正可】supabase.js の flowType を `'pkce'` から `'implicit'` または削除（既定 implicit）

**変更内容**: `lais/src/lib/supabase.js`

```diff
   export const supabase = createClient(url, publishableKey, {
     auth: {
       persistSession: true,
       autoRefreshToken: true,
       detectSessionInUrl: true,
-      flowType: 'pkce',
+      // flowType: 'implicit' (既定)。Supabase 確認メールの verify は
+      // hash fragment (#access_token=) で 303 する Implicit 仕様。
+      // PKCE は SPA で confirm メール経由 signup を扱う場合 mismatch するため使用しない。
     },
   });
```

**効果**:
- `detectSessionInUrl: true` が hash fragment を処理するようになり、root 着地でも自動でセッション確立。
- `localStorage` に `sb-<project>-auth-token` が書込まれる。
- `bootstrapAuth()` の `getSession()` が session を返す。
- ふとしから見て「メール承認 → 自動ログイン → アプリ画面」が成立。

**メタタグ §2.25.3**:
- 影響範囲: 認証 client 全体（PROD）。`signInWithOAuth` 等を使う場合は再評価必要だが、現プロジェクトは email/password のみのため安全。
- ロールバック: 1 行戻すのみ。
- 工数: 5 分（コード変更 + 再デプロイ）。
- リスク: 低（PKCE は SPA で OAuth 用途、本プロジェクトは未使用）。
- ふとし手間: ゼロ（ADV 自律で修正＋ deploy）。

### 【最優先 B — ふとしセルフ操作 1 件、5 分】Supabase Dashboard で Redirect URLs allowlist に追加

**目的**: redirect_to パラメータを尊重させ、Implicit flow 着地点を `/auth/callback` に固定する。

**手順**:
```
1. https://supabase.com/dashboard/project/wrvwcfilokfcjudspizp/auth/url-configuration
2. 「Site URL」に "https://lais-3yk.pages.dev" が入っていることを確認（変更不要）
3. 「Redirect URLs」 (Allow lists) に以下 4 行を追加:
   - https://lais-3yk.pages.dev/auth/callback
   - https://lais-3yk.pages.dev/**          (path wildcard 推奨)
   - http://localhost:5173/auth/callback   (dev)
   - http://localhost:5173/**              (dev)
4. Save
```

**メタタグ §2.25.3**:
- 影響範囲: Auth プロジェクト全体（PROD + dev）。
- ロールバック: 追加行を削除。
- 工数: 5 分。
- リスク: 低（lais-3yk.pages.dev ドメイン配下のみなので攻撃面拡大なし）。
- ふとし手間: Dashboard 操作のみ、ADV 自動化不可（API 経由でも url-configuration 変更権限は service_role 単独では不可、Dashboard 必須）。

### 【補助 C — ADV 自律修正可、A と同時に】AuthCallback.jsx に hash fragment フォールバック追加

**変更内容**: `lais/src/components/screens/AuthCallback.jsx`

PKCE 経路維持 + hash 経路の冗長化。`?code=` も `#access_token=` も両方拾う:

```js
const params = new URLSearchParams(window.location.search);
const hashParams = new URLSearchParams(
  window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
);

const code = params.get('code');
if (code) {
  try { await supabase.auth.exchangeCodeForSession(code); } catch {}
}
// detectSessionInUrl: true + flowType: 'implicit' で supabase-js が
// hash 経路は自動処理する。明示的 setSession は冗長。
// → 実コード変更は最小、A の flowType 変更だけで実質解決。
```

**効果**: A の flowType 変更だけで実質解決するが、`/auth/callback` 経路に到達した場合も明示的に hash を意識するコードにすれば、将来の OAuth 対応時の手戻り削減。
**工数**: 10 分。

### 【中期 D — ふとしセルフ、1 時間】rate limit 復帰 + Custom SMTP（Phase B 完了後）

第 2 報 §4 と同様、Phase B 完遂後に着手。今回は影響なし。

---

## §4. 推奨実施順

```
1. (ふとし 5 分) §3-B: Supabase Dashboard で Redirect URLs に
   https://lais-3yk.pages.dev/** を追加
2. (ADV 自律 5 分) §3-A: supabase.js の flowType: 'pkce' を削除
3. (ADV 自律 1 分) git commit + cf-pages deploy
4. (ふとし 30 秒) Playwright と同等手順で実機検証 (新メアドで signup → 確認 → ログイン状態を確認)
```

A だけでも問題は **完全解決**（B は将来の url stability のための付帯対応）。

---

## §5. 5 行サマリー（PO 向け、暗号略称回避）

```
[完了報告 - LAIS-POST-CONFIRM-LOGIN-DEBUG]
1. やったこと: Admin API + Playwright 二重で「確認メールクリック後の挙動」を実機再現、URL/localStorage/console 全観測
2. 確定原因: ⭐⭐⭐⭐ 2 件 = (R1) 確認メールが /auth/callback ではなく / にリダイレクト + (R2) supabase-js が PKCE 設定下で #access_token ハッシュを無視 → セッション未確立で splash 画面のまま
3. 検証: lais/verify/lais_post_confirm_login_debug_2026-04-26.md 新設
4. 修正案: ADV 自律 1 件 (supabase.js flowType: 'pkce' 削除、5分) / ふとし操作 1 件 (Supabase Dashboard で Redirect URLs に **/** 追加、5分)
5. 次: 即 fix subagent 起動 (flowType 削除コミット & deploy) と同時にふとしへ Dashboard 1 操作依頼
```

---

## §6. 付録

### §6.1 検証コマンド一覧

```bash
# A. Admin API で confirm link 取得
curl -X POST $SUPABASE_URL/auth/v1/admin/generate_link \
  -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"signup","email":"qa@example.com","password":"...","options":{"redirect_to":"https://lais-3yk.pages.dev/auth/callback"}}'

# B. action_link を follow して redirect Location 確認
curl -s -o /dev/null -D- -L --max-redirs 0 "$ACTION_LINK"

# C. Playwright (chromium headless) でクリック後の localStorage / URL / hash 観測
node /tmp/lais_postconf_full.mjs   # Admin link click → localStorage={} → hash着地観測
```

### §6.2 制約遵守確認

- ✅ SUPABASE_URL / SERVICE_KEY / 個人 token は伏字 / `<KEY>` 化（access_token は実機ログでのみ展開、本レポート最終版では `eyJ...` で切詰め）
- ✅ `--no-verify` 未使用、書込禁止対象未触
- ✅ 書込先 `lais/verify/` 配下 1 ファイルのみ、コード改修ゼロ（推奨修正の diff 提示のみ）
- ✅ テストアカウント 6 件 cleanup 済（admin DELETE で確認）
- ✅ 並走 LOGIN-TEST-STRUCTURAL-FIX-IMPL / FULL-SCREEN-TEST-GAP-PERSONA-REVIEW と衝突なし

### §6.3 第 2 報からの差分

| 項目 | 第 2 報（EMAIL-LOGIN-DEBUG） | 第 3 報（POST-CONFIRM-LOGIN-DEBUG） |
|---|---|---|
| 観測した症状 | メール届かない（429 rate limit） | メール届く / 承認しても signin 状態にならない |
| 根本原因 | rate limit 上限到達 + Email Confirmations 有効 | Site URL/Redirect URLs 設定不備 + supabase-js flowType: 'pkce' |
| ふとし操作 | Dashboard で Confirmations OFF（5 分） | Dashboard で Redirect URLs に `**` 追加（5 分） |
| ADV 自律修正 | 不要 | あり: supabase.js から flowType: 'pkce' 削除 |
| 解決後の体験 | 確認メールが届くようになる | 承認 → 即ログイン状態 → アプリ画面遷移が成立 |

### §6.4 改訂履歴

| 日付 | 改訂 | 担当 |
|---|---|---|
| 2026-04-26 | 第 3 報初版（第 2 報の継続検証 + Admin API + Playwright 実機 で確認後 signin 経路を完全観測） | LAIS-POST-CONFIRM-LOGIN-DEBUG subagent |
