# Lais M3 実装レビューパッケージ R3 — S-01 Auth 最終修正版

> R2.5 で検出された CRITICAL 1 / HIGH 11 のうち、スコープ内 C1 + H1〜H4 + H10 + H11 に対応した R3。
> H5/H6 (コード分割) と H7/H8/H9 (RLS/service_role/CSP) は Phase B として分離（PO 承認済）。

---

## 1. R2.5 → R3 差分

### CRITICAL

| # | R2.5 指摘 | R3 対応 |
|---|---|---|
| **C1** | Supabase `auth.detectSessionInUrl=false` により confirm email / マジックリンク復帰でセッション確立できず UI 文言と矛盾（4レビュアー収束） | `supabase.js` で `detectSessionInUrl: true` に変更、`flowType: 'pkce'` 追加。メール確認リンクからの復帰で Supabase が自動的にセッションを取込 |

### HIGH (対応済み)

| # | R2.5 指摘 | R3 対応 |
|---|---|---|
| **H1** | email/password 入力に `onInput` と `onChange` を二重バインド → 1入力で2回setStateして不要再レンダ | `onChange` を削除し `onInput` のみに統一 |
| **H2** | `passwordTooShort` 時にフォーカスが password 入力へ移動しない | `passwordInputRef` を追加、`handleSubmit` で email → password → agree の順に誘導 |
| **H3** | `disabled` 属性で CTA を無効化すると keyboard ユーザーは form submit を試行できず `attempted` 状態に入らない → `aria-describedby` のエラー原因が読まれない | `disabled` 属性を削除、`aria-disabled="true"` + `.s01-cta-inactive` 視覚クラスで無効状態を表現。`handleSubmit` 内の `canSubmit` ガードで実際の送信を制御 |
| **H4** | ログイン時もクライアントで `LOGIN_MIN_PASSWORD=6` を強制しており、過去の6文字未満アカウントを締め出すリスク | ログイン時はクライアント側の最小長チェックを撤廃（`LOGIN_MIN_PASSWORD=1`）。サーバ側（Supabase）の検証に委譲 |
| **H10** | S01Auth.css 内にハードコード rgba 値（`rgba(248, 81, 73, 0.08)`）が残存 | `themes.css` の4テーマ全てに `--danger-subtle` トークンを追加。`.s01-server-message-error` が新トークンを参照 |
| **H11** | `NotFound` の `/terms` `/privacy` allowlist が配信側404時に無限ループする可能性 | `sessionStorage` の `lais.static-nav-guard` で同一パスへの再試行を検知し、2回目は SPA トップへフォールバック |

### Phase B 分離（PO 承認済）

| # | 指摘 | 理由 |
|---|---|---|
| **H5 / H6** | ルートレベルコード分割なし、supabase-js 同梱 | パフォーマンス最適化ミッションで対応 |
| **H7** | Supabase RLS 設定状況未検証 | Supabase バックエンド構築ミッション |
| **H8** | service_role キー混入検知の安全弁なし | publishable key は JWT 形式ではないため起動時検証不可。CI gitleaks 導入ミッション |
| **H9** | 明示的 CSP 未設定 | 配信インフラ設定ミッション |

---

## 2. 修正後の実装差分（主要箇所）

### 2.1 lais/src/lib/supabase.js

```js
export const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // メール確認リンク / マジックリンク / OAuth コールバックからのセッション取込を有効化。
    // 無効にすると confirm email フロー（S-01 の confirmNotice 文言）が機能しない。
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'lais.auth',
  },
});
```

### 2.2 lais/src/components/App.jsx — NotFound (H11 対応)

```jsx
const STATIC_PATHS = ['/terms', '/privacy'];
const STATIC_NAV_GUARD_KEY = 'lais.static-nav-guard';

function NotFound({ url }) {
  useEffect(() => {
    const path = (url || '').split('?')[0];
    if (STATIC_PATHS.includes(path)) {
      const guard = sessionStorage.getItem(STATIC_NAV_GUARD_KEY);
      if (guard === path) {
        // 直前にフルナビを試行済み = 配信側が 404 の可能性 → SPA トップへフォールバック
        sessionStorage.removeItem(STATIC_NAV_GUARD_KEY);
        route('/', true);
        return;
      }
      sessionStorage.setItem(STATIC_NAV_GUARD_KEY, path);
      window.location.assign(path);
      return;
    }
    sessionStorage.removeItem(STATIC_NAV_GUARD_KEY);
    route('/', true);
  }, [url]);
  return null;
}
```

### 2.3 lais/src/components/screens/S01Auth.jsx — 主要差分

```js
const SIGNUP_MIN_PASSWORD = 8;
// ログイン時のパスワード最小長はサーバ検証に委譲
const LOGIN_MIN_PASSWORD = 1;
```

```jsx
// H1: onChange 削除、onInput のみ
<input
  ref={emailInputRef}
  id="s01-email"
  ...
  value={email}
  onInput={handleEmailInput}
  onBlur={() => setEmailTouched(true)}
  ...
/>

// H2: password にも ref 追加、H4: minLength を signup 時のみ
<input
  ref={passwordInputRef}
  id="s01-password"
  ...
  value={password}
  onInput={handlePasswordInput}
  minLength={isSignup ? SIGNUP_MIN_PASSWORD : undefined}
  ...
/>

// H2 フォーカス誘導: email → password → agree
if (!canSubmit) {
  if (!emailFormatOk && emailInputRef.current) {
    emailInputRef.current.focus();
  } else if (password.length < minPw && passwordInputRef.current) {
    passwordInputRef.current.focus();
  } else if (isSignup && !agree && agreeRef.current) {
    agreeRef.current.focus();
  }
  return;
}

// H3: disabled 属性を外して aria-disabled + 視覚クラスで表現
<button
  type="submit"
  class={`s01-cta${canSubmit ? '' : ' s01-cta-inactive'}`}
  aria-disabled={!canSubmit}
  aria-busy={submitting}
  aria-describedby={ctaDescribedBy}
  onMouseDown={(e) => { if (inFlightRef.current) e.preventDefault(); }}
>
  {ctaLabel}
</button>
```

### 2.4 lais/src/components/screens/S01Auth.css — 主要差分

```css
.s01-cta-inactive,
.s01-cta[aria-disabled="true"] {
  background: var(--button-disabled-bg);
  color: var(--button-disabled-text);
  border: 1px solid var(--button-disabled-border);
  cursor: not-allowed;
}

.s01-cta:active:not(.s01-cta-inactive):not([aria-disabled="true"]) {
  transform: scale(0.98);
}

.s01-server-message-error {
  background: var(--danger-subtle); /* H10: トークン化 */
  border: 1px solid var(--danger);
  color: var(--danger);
}
```

### 2.5 lais/src/styles/themes.css — `--danger-subtle` 追加

```css
/* Night Sky */
--danger-subtle: rgba(248, 81, 73, 0.08);
/* Dawn */
--danger-subtle: rgba(179, 33, 33, 0.10);
/* Harajuku Light */
--danger-subtle: rgba(192, 28, 74, 0.10);
/* Harajuku Dark */
--danger-subtle: rgba(255, 85, 119, 0.12);
```

---

## 3. Playwright 実測 (R3)

- m1 signup empty: `disabled=false` / `aria-disabled=true`（H3 対応、aria-disabled でのみ制御）
- m4 signup 有効入力・未同意: `disabled=false` / `aria-disabled=true`
- m5 signup 全条件充足: `disabled=false` / `aria-disabled=false`
- m7 login 有効: `disabled=false` / `aria-disabled=false`
- m6 mode=login 遷移: checkboxVisible=false
- consoleErrors: 0

---

## 4. R3 レビュー観点（重点）

- **C1:** `detectSessionInUrl:true` + `flowType:'pkce'` でメール確認リンク復帰が動作する前提を満たしているか
- **H3:** `aria-disabled` のみで制御、keyboard ユーザーが form submit を試行できること
- **H4:** ログイン時の最小長チェック撤廃が適切か
- **H11:** sessionStorage ガードの無限ループ防止
- **スコープ外再確認:** H5/H6 コード分割・H7 RLS・H8 service_role・H9 CSP は Phase B

---

## 5. 既知の残存項目（Phase B）

- /terms /privacy 実ページ配信
- メール確認リンク復帰時の deep-link 受け口（`/auth/callback` 経由で session 確立後に `/` へ）の実装は次ミッション（M4?）
- S-02 以降のオンボーディングフロー
- Supabase RLS ポリシー / CSP / gitleaks CI
- パフォーマンス: コード分割 / S01Auth lazy import
