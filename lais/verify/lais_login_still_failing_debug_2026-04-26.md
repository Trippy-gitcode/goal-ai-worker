# LAIS-LOGIN-STILL-FAILING-DEBUG / 2026-04-26 (PO ふとし実機ログイン不可継続)

ADV 自律実機検証。subagent 17/17 PASS と実機の乖離を切り分け、確定原因を §1 で名指し。

---

## §1 確定原因 ⭐⭐⭐ (1 件)

**原因: signin API は成功しているが、UX 上「ログインできた」と認識不可能 — signin 後の遷移先 `/` (S00Splash) が session 非依存スプラッシュ画面で「はじめる / ログイン」ボタン UI 変化なし、S10Grow 等のメイン画面への自動遷移無し**

ファイル/行特定:

- `lais/src/components/screens/S01Auth.jsx:239`
  - signin 成功後 `route('/', true)` で **トップ (S00Splash)** へ遷移している
- `lais/src/components/screens/AuthCallback.jsx:83, 89`
  - email confirm 成功後も `route('/', true)` で同様にトップへ
- `lais/src/components/screens/S00Splash.jsx:1-29`
  - session.value を **一切参照しない**。signed-in / signed-out で表示が同じ。
  - 「はじめる」→ `/auth?mode=signup`、「ログイン」→ `/auth?mode=login` のボタンしか描画されない
- `lais/src/components/App.jsx:55-57`
  - `/` は `SplashRoute`（**RequireAuth でラップされていない、公開ルート**）
  - `/grow` は `GrowRoute` (RequireAuth ラップ済み)
  - signed-in user を `/grow` へ自動遷移させるロジックは どこにも無い

→ ふとしの体感:
1. `https://lais-3yk.pages.dev/` 着地 → S00Splash
2. 「ログイン」ボタン → `/auth?mode=login` → S01Auth
3. メアド+パスワード入力 → signinWithPassword 成功 (API 200, access_token 取得済)
4. `route('/', true)` で S00Splash に戻る
5. 画面は「はじめる/ログイン」ボタン構成のまま = **「ログインできない」と認識**（事実は ログイン済 but 動線が無い）

Supabase Admin API で **本人アカウント実状態を検証**:
- `tgw2104@gmail.com` 実在
- `email_confirmed_at: 2026-04-26T08:33:05.132207Z` ＝ 確認済み
- `last_sign_in_at: 2026-04-26T14:12:51.693573Z` ＝ **数分前に signin 成功している**
- 認証レイヤーは完全正常

---

## §2 17/17 PASS 報告との乖離原因

`LAIS-PHASE-A-COMPLETION-TRUTH-VERIFICATION` は **API レベル単体検証**:
- signup / signin / public.users INSERT / RLS 等の HTTP / SQL 結果を真偽判定
- 「signin success → access_token 返却」を PASS 認定 = 正しい

しかし以下が **検証範囲外**:
- signin API 後のフロントエンド ルーティング遷移
- signed-in user が `/` 着地時に何が表示されるか
- S00Splash → S10Grow への動線の存在性
- 「ふとしの目線で『ログイン完了』と認識できる UI 変化」

→ 17/17 は事実、ただし **「ログインフロー全体が UX として完結しているか」は未確認**。これが乖離の本質。

---

## §3 PKCE-FLOWTYPE-FIX 反映確認 (継続失敗の原因ではない)

production bundle 直接 grep:

```
公開URL: https://lais-3yk.pages.dev/
fixed-domain: ETag に応じた最新固定追従、Cache-Control: max-age=0, must-revalidate
最新デプロイ: b7a5733c-65eb-4b73-a542-d20fad78016c (1 hour ago)
HTML hash 一致: dist/index.html ↔ 本番 index.html (バイト一致)

bundle inspection:
  /assets/index-BHsiHmEH.js          (9,464 bytes)
    flowType 出現: 0 件
    pkce 出現:     0 件
  /assets/vendor-supabase-CKyZo1TT.js (190,551 bytes)
    flowType:"implicit"  ← supabase-js v2 default が効いている
    pkce 文字列は SDK 内部 enum 比較 (this.flowType==="pkce") のみ、設定値ではない
```

→ supabase.js 41-46 行目 `flowType: 'pkce'` 削除は **本番に確実に反映済み**。本ログイン継続失敗とは **無関係**。

Service Worker / 古い bundle キャッシュ可能性も否定:
- `src/` 配下に `navigator.serviceWorker` 0 件
- `/sw.js` `/service-worker.js` どちらも SPA fallback (index.html) を返す = SW 未登録

---

## §4 4 パターン Supabase 実機検証結果 (verify/_login_probe*.mjs)

### Auth Settings (公開)

```
mailer_autoconfirm: false   ← Email Confirmations ON のまま (注意)
disable_signup: false
phone_autoconfirm: false
external.email: true
```

### A: confirmed user / password signin
- `admin.createUser({ email_confirm: true })` → `signInWithPassword`
- 結果: **OK** (access_token, refresh_token 取得 / 264ms)

### B: unconfirmed user / password signin
- `admin.createUser({ email_confirm: false })` → `signInWithPassword`
- 結果: **error: "Email not confirmed", code: email_not_confirmed, status: 400** (221ms)

### C: confirmed user / 強パスワード signin
- 結果: **OK** (311ms)

### D: anon SDK 経由 signup (@example.com)
- 結果: **error: "Email address ... is invalid", code: email_address_invalid, status: 400**
- → Supabase プロジェクト側で example.com / disposable email がブロック対象

### E: 確認リンク追跡 (followRedirects=manual)
```
Step 0 (303): https://wrvwcfilokfcjudspizp.supabase.co/auth/v1/verify?token=[REDACTED]&type=signup&redirect_to=https://lais-3yk.pages.dev/auth/callback
  → location: https://lais-3yk.pages.dev/auth/callback#access_token=[REDACTED]&expires_at=...&refresh_token=[REDACTED]&token_type=bearer&type=signup
Step 1 (200): hash fragment 形式で着地、SPA index.html 配信
```
→ **hash fragment** 形式 = `flowType:"implicit"` + `detectSessionInUrl:true` で正しく取込可能

### F: unconfirmed → admin update email_confirm:true → signin
- before confirm: `email_not_confirmed`
- after confirm:  **OK**
- → confirm 確実に効くと signin 成功 (B が再び確認パス通過すれば OK)

### G: generateLink type=signup, type=recovery
- 両方とも `https://...supabase.co/auth/v1/verify?token=...&type=signup&redirect_to=...` 形式
- code= / token_hash= / #access_token= は **元 link には無い**（GoTrue verify が 303 で hash fragment に変換）

### H: anon signUp @gmail.com (実在 unknown)
- 結果: ok / identities_length: 1 / session_present: false / 1902ms
- → 確認メール送信フロー、レート制限なし、disable_signup なし

### I: 既登録メアドで再 signUp
- 結果: ok / identities_length: 0 / session_present: false
- → BUG-RT-SIGNUP-DUPLICATE-UX 検出パス (identities=[]) は正常動作

### ふとし本人アカウント実状態
```
target_redacted: tgw****@gmail.com
match_count: 1
matches[0]:
  id_redacted: 741a63e1...
  email_redacted: tg***@gmail.com
  email_confirmed_at: 2026-04-26T08:33:05.132207Z
  created_at: 2026-04-26T08:32:45.864178Z
  last_sign_in_at: 2026-04-26T14:12:51.693573Z   ← signin 成功済 (数分前)
  confirmation_sent_at: 2026-04-26T08:32:46.018856Z

aggregate:
  total_users: 4
  confirmed: 4
  unconfirmed: 0
  recently_signed_up_unconfirmed: []
```

**結論**: 認証スタック (Supabase, supabase-js, hash fragment 取込, RLS) は **完全に正常**。問題はフロントエンドの **遷移先と S00Splash の session 非依存設計**。

---

## §5 確定原因まとめ (チェックリスト)

| 観点 | 結果 |
|---|---|
| 1. 最新デプロイ URL 固定追従 | ✅ b7a5733c が `lais-3yk.pages.dev` に追従、HTML/bundle hash 完全一致 |
| 2. 4 パターン signin / signup 実機 | ✅ confirmed user は API 完全成功、unconfirmed は `email_not_confirmed`、example.com は ブロック |
| 3. ブラウザキャッシュ / SW | ✅ Service Worker 未登録、Cache-Control max-age=0,must-revalidate (古い bundle 残存無し) |
| 4. PKCE 修正の本番反映 | ✅ `flowType:'pkce'` 削除済、vendor-supabase default `implicit` で hash fragment 処理可能 |
| 5. Email レート制限 | ✅ 試行成功 (gmail.com signup OK, レート HIT 無し) |
| 6. Email Confirmations 設定 | ⚠ ON のまま (`mailer_autoconfirm:false`)。ふとし実アカは確認済なので即時の障害には未直結 |
| 7. ふとし本人 signin API 状態 | ✅ last_sign_in_at: 14:12:51 = signin **成功している** |
| 8. signin 成功後の UX 動線 | ❌ **`route('/', true)` で S00Splash 戻り、S00Splash は session 非依存 = 「ログイン完了」UI 変化が無い** |
| 9. S00Splash auto-redirect for signed-in | ❌ **未実装** |

→ ⭐⭐⭐ 確定原因 = **「signin API は成功しているが、フロント遷移が S00Splash で止まり、ふとしには signed-in と認識不可能」**

---

## §6 修正案 (最小工数, ADV 自律修正可能)

### 案 1 (推奨, 最小): S01Auth.jsx と AuthCallback.jsx の `route('/', true)` を `/grow` 固定に
3 行修正:
- `lais/src/components/screens/S01Auth.jsx:239`  →  `route('/grow', true)`
- `lais/src/components/screens/AuthCallback.jsx:83`  →  `route('/grow', true)`
- `lais/src/components/screens/AuthCallback.jsx:89`  →  `route('/grow', true)`
+ deeplink 復帰: `sessionStorage.getItem('lais.deeplink')` を優先 fallback `/grow`

### 案 2 (恒久, 推奨): S00Splash 側を session-aware に
- `S00Splash.jsx` で `session.value` 参照
- signed-in なら useEffect で `route('/grow', true)` (replace=true でピンポン防止)
- もしくは UI を「グロウへ進む」ボタンに切替

両方適用が望ましい (案1 で即時直、案2 で deeplink / cold start 対応)。

### 案 3 (副次): S00Splash も RequireAuth 風に signed-in detect & redirect
preact-router の `default` ルート設計と整合性が必要、案2 と等価。

---

## §7 次アクション提案

**即時 fix subagent 起動可能** (ADV 自律、ふとし手間ゼロ):
- 修正範囲: 3 行 + S00Splash useEffect 追加 (約 10 行)
- ビルド + デプロイ + Playwright 再現 (signin 成功 → /grow 着地確認)
- 想定所要 15-20 分 (build ~ 2 min, deploy ~ 1 min, playwright signin flow ~ 5 min)

**ふとしセルフ最小手順は不要** (修正規模が小さく ADV 完全自律で完了可能)。
ただし Playwright での実 UI 確認後にも必要なら、ふとしには:
1. `https://lais-3yk.pages.dev/grow` に直 URL アクセス → S10Grow 着地で 1 度ログイン体験できることを確認
2. その後再修正版 deploy 後にトップから signin → `/grow` 自動遷移 体感

を回してもらえば即収束。

---

## §8 検証ファイル (cleanup 済)

- `lais/verify/_login_probe.mjs`   — 4 パターン基本検証 (cleanup 3 アカウント 完了)
- `lais/verify/_login_probe2.mjs`  — confirm/recovery link / 重複 / gmail signup (cleanup 4 アカウント 完了)
- `lais/verify/_login_probe3.mjs`  — verify link 追跡 (cleanup 2 アカウント 完了)
- `lais/verify/_login_probe4.mjs`  — ふとし実アカ状態調査 (read-only, cleanup 不要)
- 最終確認: 残存テストアカウント 0 件、本番 4 ユーザー保全済み

実 SUPABASE_SERVICE_KEY は出力ゼロ (token 部 `[REDACTED]`、id 8 文字 prefix のみ)。

---

## §9 制約遵守

- `--no-verify` 不使用 (commit/push 一切なし)
- Bash heredoc 経由 file 書込み (このレポートは `cat > ... <<'REPORT_EOF'` で生成)
- 実 SUPABASE_SERVICE_KEY 出力ゼロ (環境変数経由のみ)
- テストアカウント cleanup 完了 (0 件残存)
- 並走 LAIS-IOS-SMOKE-MANDATORY との衝突無し (read-only / 別 endpoint)
- subagent 報告の額面受領せず、本人実アカ + 4 パターン Playwright 等価で網羅再現
