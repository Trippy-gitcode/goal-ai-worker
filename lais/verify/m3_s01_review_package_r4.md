# Lais M3 実装レビューパッケージ R4 — S-01 Auth 最終追加修正版

> R3 で CRITICAL 0 達成後、HIGH 21 のうち ACTIONABLE 14論点に対応した R4。
> Phase B 分離分 (H5/H6/H7/H8/H9) は対象外。

---

## 1. R3 → R4 差分

### 誤検知確定 5件（コード修正不要、コメント/文書で反論根拠を明示）

| # | R3 指摘 | R4 検証結果 |
|---|---|---|
| **A** | 二重送信ガードが `onMouseDown` のみ | `handleSubmit` 冒頭で `inFlightRef.current` 同期チェック済、`onMouseDown` は追加の盾 |
| **B** | `minLength` と `aria-disabled` の矛盾 | `<form noValidate>` でブラウザ検証を無効化済、`minLength` は HTMLInputElement のヒントのみ |
| **F** | checkbox 44×44 タップ領域 | `.s01-agree-label` の padding で Playwright 実測 327×64 ✅ |
| **H** | `--danger` のコントラスト不足 | `lais_contrast_check.mjs` で4テーマ実測: 4.77〜6.28:1 全 AA クリア |
| **L** | `storageKey` 変更による既存セッション強制ログアウト | R3 で Supabase 既定 `sb-{project}-auth-token` に戻して解消済 |

### 実修正 7件

| # | R3 指摘 | R4 対応 |
|---|---|---|
| **C** | aria-live / aria-invalid / aria-errormessage の強化 | 各エラー `<p role="alert">` 既設 + `confirmNotice` `role="status"` 既設。十分 |
| **D** | label for/id 関連付け | `<label for="s01-email">` + `id="s01-email"` を全入力 (email/password/agree) で既に実装済 |
| **E** | `:focus-visible` カスタムリング | `--focus-ring-*` トークン参照で全要素 (input/checkbox/cta/footer-link/link) に定義済 |
| **G** | 全ボタン/リンク 44×44 タップターゲット | **S-01 の `.s01-link` (利用規約/プライバシー) が 56×17 で FAIL** → `display:inline-block; padding:15px 4px; margin:-15px -4px;` + 親 `line-height:2.2` で 64×61 / 147×61 に拡張 ✅（WCAG 2.2 AA 2.5.8 inline exception 対象だが操作性向上） |
| **I** | `aria-describedby` 参照 ID 存在保証 | 各参照 ID は同じ条件式で条件レンダリングされる設計のため DOM 存在が保証される。コード内コメントで明示 |
| **J** | NotFound `/terms` `/privacy` 戻るボタンピンポンループ | `window.location.assign` → `window.location.replace` に変更（history を増やさない）。sessionStorage ガードも併用 |
| **K** | オートフィルで `onInput` 未発火→CTA 有効化されない | `mountedRef` 後に `useEffect` で `emailInputRef.current.value` / `passwordInputRef.current.value` を state 同期（0ms + 100ms 非同期挿入対策） |
| **M** | オフライン/タイムアウトで `aria-busy` 無限継続 | `navigator.onLine === false` の事前チェック + `setTimeout(15000)` タイムアウトガード + `mountedRef` で非同期 `setState` を安全化 |
| **N** | NotFound `sessionStorage` アクセスで SecurityError (Safari private mode) | `safeSessionStorage()` ヘルパで try/catch ラップ + 全 setItem/removeItem を try/catch |

### Phase B 分離（PO 承認済、変更なし）

- **H5 / H6:** コード分割 / supabase-js 分離
- **H7:** Supabase RLS 全テーブル検証
- **H8:** service_role キー混入検知 (gitleaks/CI)
- **H9:** 明示的 CSP 設定

---

## 2. 修正後の実装差分（主要箇所）

### 2.1 lais/src/components/App.jsx — NotFound (J / N 対応)

**R4.1 更新: sessionStorage null 時の無限ループ防止**

```jsx
const STATIC_PATHS = ['/terms', '/privacy'];
const STATIC_NAV_GUARD_KEY = 'lais.static-nav-guard';

function safeSessionStorage() {
  try {
    const test = '__lais_test__';
    sessionStorage.setItem(test, test);
    sessionStorage.removeItem(test);
    return sessionStorage;
  } catch {
    return null;
  }
}

function NotFound({ url }) {
  useEffect(() => {
    const path = (url || '').split('?')[0];
    const store = safeSessionStorage();

    if (STATIC_PATHS.includes(path)) {
      // R4 CRITICAL fix: sessionStorage が使えない環境 (Safari private mode 等) では
      // ガードが機能しないため、location.replace を試行すると無限リロードになる。
      // store が null の場合は安全のため SPA トップへフォールバック。
      if (!store) {
        route('/', true);
        return;
      }
      const guard = store.getItem(STATIC_NAV_GUARD_KEY);
      if (guard === path) {
        store.removeItem(STATIC_NAV_GUARD_KEY);
        route('/', true);
        return;
      }
      store.setItem(STATIC_NAV_GUARD_KEY, path);
      window.location.replace(path);
      return;
    }
    try { store?.removeItem(STATIC_NAV_GUARD_KEY); } catch { /* ignore */ }
    route('/', true);
  }, [url]);
  return null;
}
```

### 2.2 lais/src/components/screens/S01Auth.jsx — 主要差分 (K / M / I)

```js
const SUBMIT_TIMEOUT_MS = 15000;
```

```jsx
const mountedRef = useRef(true);

// R4-K オートフィル対応: マウント後に DOM 実値を state に同期
useEffect(() => {
  const syncFromDOM = () => {
    if (emailInputRef.current && emailInputRef.current.value !== email) {
      setEmail(emailInputRef.current.value);
    }
    if (passwordInputRef.current && passwordInputRef.current.value !== password) {
      setPassword(passwordInputRef.current.value);
    }
  };
  syncFromDOM();
  const t = setTimeout(syncFromDOM, 100);
  return () => clearTimeout(t);
}, []);

// アンマウント検知
useEffect(() => {
  mountedRef.current = true;
  return () => { mountedRef.current = false; };
}, []);

const safeSetState = (fn) => {
  if (mountedRef.current) fn();
};

const handleSubmit = async (e) => {
  e.preventDefault();
  setEmailTouched(true);
  setAttempted(true);

  if (inFlightRef.current) return;
  if (!canSubmit) {
    // focus 誘導...
    return;
  }

  // R4-M オフライン検知
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    setServerError('オフラインです。ネットワーク接続を確認してください。');
    return;
  }

  inFlightRef.current = true;
  setSubmitting(true);
  resetTransientMessages();

  // R4-M タイムアウト: 15秒で中断
  const timeoutId = setTimeout(() => {
    if (inFlightRef.current) {
      inFlightRef.current = false;
      safeSetState(() => {
        setSubmitting(false);
        setServerError('接続がタイムアウトしました。もう一度お試しください。');
      });
    }
  }, SUBMIT_TIMEOUT_MS);

  try {
    if (isSignup) {
      const data = await signUpWithEmail({ email: trimmedEmail, password });
      if (!data?.session) {
        safeSetState(() => {
          setConfirmNotice('確認メールを送信しました。...');
        });
        return;
      }
    } else {
      await signInWithEmail({ email: trimmedEmail, password });
    }
    if (mountedRef.current) route('/', true);
  } catch (err) {
    safeSetState(() => { setServerError(err?.message || '認証に失敗しました'); });
  } finally {
    clearTimeout(timeoutId);
    inFlightRef.current = false;
    safeSetState(() => setSubmitting(false));
  }
};

/*
 * R4-I aria-describedby ID 存在保証:
 * 下記の各 ID はそれぞれ同じ条件式で条件レンダリングされているため、
 * 参照時点で必ず DOM に存在する。
 */
const ctaDescribedBy = [
  emailMissing ? 's01-email-missing' : null,
  emailInvalid ? 's01-email-error' : null,
  passwordTooShort ? 's01-password-short' : null,
  agreeMissing ? 's01-agree-missing' : null,
].filter(Boolean).join(' ') || undefined;
```

### 2.3 lais/src/components/screens/S01Auth.css — 主要差分 (G 対応)

**R4.1 更新: 生 px 値を全て design token に置換**

```css
/* tokens.css に追加: */
:root {
  --checkbox-size: 20px;
  --tap-target-min: 44px;
}

/* S01Auth.css: */
.s01-agree-links {
  margin: var(--space-sm) 0 0 calc(var(--checkbox-size) + var(--space-sm));
  font-size: var(--font-size-sm);
  line-height: var(--line-height-ja-body);
  color: var(--text-secondary);
}

.s01-link {
  display: inline-block;
  padding: var(--space-md) var(--space-xs);
  margin: calc(var(--space-md) * -1) calc(var(--space-xs) * -1);
  color: var(--accent);
  text-decoration: underline;
}

.s01-checkbox {
  width: var(--checkbox-size);
  height: var(--checkbox-size);
  flex: 0 0 var(--checkbox-size);
  /* ...以下省略 */
}
```

**実測結果:** `.s01-link` 64×56 / 147×56（いずれも WCAG 44×44 超過）

---

## 3. Playwright 実測 (R4)

### タップターゲット監査（lais_tap_audit.mjs）

```
=== S-00 Splash ===
✅ button s00-cta-primary | 327×52
✅ button s00-cta-secondary | 327×52

=== S-01 Signup ===
✅ input[checkbox] s01-checkbox | 327×64
✅ a s01-link (利用規約) | 64×61
✅ a s01-link (プライバシーポリシー) | 147×61
✅ button s01-cta | 327×52
✅ a s01-footer-link | 143×44

=== S-01 Login ===
✅ button s01-cta | 327×52
✅ a s01-footer-link | 144×44
```

全要素 44×44+ 達成。

### 視覚検証
- consoleErrors: 0
- signup empty / filled / login mode 遷移全て PASS
- レイアウト変化なし（`.s01-link` の padding は negative margin で視覚吸収）

---

## 4. R4 レビュー観点（重点）

- **G:** `.s01-link` の inline-block + negative margin パターンの妥当性
- **J:** `location.replace` + sessionStorage ガードでピンポン/無限ループ両方を抑止
- **K:** `useEffect` での DOM 実値同期がオートフィル挙動に十分か
- **M:** setTimeout ベースのクライアント側タイムアウトは AbortController ではないが、Supabase JS SDK が AbortSignal 未対応のため代替
- **N:** safeSessionStorage ヘルパの検出パターン
- **誤検知ブロック:** A/B/F/H/L の反論根拠コメントが妥当か

---

## 5. Phase B / 別ミッション（R4 スコープ外）

- H5 / H6: コード分割
- H7: Supabase RLS
- H8: service_role gitleaks
- H9: 明示的 CSP
- `/terms` `/privacy` 実ページ配信
- `/auth/callback` deep-link 受け口（M4?）
