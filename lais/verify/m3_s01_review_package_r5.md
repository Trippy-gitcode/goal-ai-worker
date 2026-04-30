# Lais M3 実装レビューパッケージ R5 — S-01 Auth regression 修正 + ADV 判定記録

> R4.1 で検出された NEW HIGH 12件のうち、Group A+B (timeout race regression, 6件) に対応した R5。
> Group D-16 の「disabled vs aria-disabled」は PO/ADV 判定として false positive 棄却（R3 決定維持）。
> Group C / D-14 / D-15 / D-17 は提案ログに記録し M4 以降で対応。

---

## 1. R4.1 → R5 差分

### Group A+B (regression) — R4-M で私が導入した timeout race を解消

**問題:**
- R4-M で追加した `setTimeout(15s)` タイムアウトガードが、遅延成功応答 / 旧コールバックと競合していた
- 具体シナリオ:
  1. 送信開始 → inFlightRef=true
  2. 15s 経過 → timeout 発火 → `setServerError('タイムアウト')` + `inFlightRef=false`
  3. 16s 後に Supabase が成功応答を返す → `catch` 通らず `route('/')` 実行
  4. UI が「タイムアウト」表示状態のままトップ遷移する矛盾
- 4レビュアー (code_reviewer / edge_case_hunter / performance_engineer / sw_debugger) が収束指摘

**修正方針:** opId 採番で「現行操作」を常に 1 つだけ定義し、全ての async 結果 / timeout コールバックが `opIdRef.current === myOpId` を確認してから副作用を実行する。

**R5.1 更新 (ABA 対策):** R5 初版では opIdRef を 0 にリセットしていたため、3レビュアーが収束で ABA 問題を指摘した（0 → 次回 ++1 で古い opId=1 が再利用され、古いコールバックが `isCurrent()` を通過）。
**R5.1 で opId を単調増加に変更**し、リセットは行わず無効化は「さらに増分する」方式に統一した。

```jsx
// R5.1 Group A+B: opId 採番（単調増加で ABA 回避）
const opIdRef = useRef(0);

const handleSubmit = async (e) => {
  // ...検証・フォーカス誘導・オフライン検知...

  // R5.1: ++ のみ。一度使った opId は絶対に再利用しない。
  const myOpId = ++opIdRef.current;
  const isCurrent = () => opIdRef.current === myOpId;

  inFlightRef.current = true;
  setSubmitting(true);
  resetTransientMessages();

  const timeoutId = setTimeout(() => {
    if (!isCurrent()) return;
    opIdRef.current++;                // 単調増加で無効化（0 にリセットしない）
    inFlightRef.current = false;
    safeSetState(() => {
      setSubmitting(false);
      setServerError('接続がタイムアウトしました。もう一度お試しください。');
    });
  }, SUBMIT_TIMEOUT_MS);

  try {
    let data;
    if (isSignup) {
      data = await signUpWithEmail({ email: trimmedEmail, password });
    } else {
      data = await signInWithEmail({ email: trimmedEmail, password });
    }
    if (!isCurrent()) return;

    if (isSignup && !data?.session) {
      safeSetState(() => {
        setConfirmNotice('確認メールを送信しました。...');
      });
    } else if (mountedRef.current) {
      route('/', true);
    }
  } catch (err) {
    if (!isCurrent()) return;
    safeSetState(() => {
      setServerError(err?.message || '認証に失敗しました');
    });
  } finally {
    // opIdRef はリセットせず、次の送信が ++ でさらに進む（ABA 回避）
    if (isCurrent()) {
      clearTimeout(timeoutId);
      inFlightRef.current = false;
      safeSetState(() => setSubmitting(false));
    }
  }
};
```

### ABA 回避の証明

| シナリオ | 挙動 |
|---|---|
| 正常系: 送信1 成功 → 送信2 | 送信1 myOpId=1, 成功時 opId=1 のまま。送信2 myOpId=2。collisions なし |
| 異常系: 送信1 タイムアウト → 送信2 → 送信1 late 応答 | 送信1 myOpId=1, timeout で opId=2。送信2 myOpId=3, opId=3。送信1 late 応答到着時 `isCurrent(): opId===1 → false`（opId は 3）。副作用スキップ ✅ |
| ABA 誘発試行: リセットなしで単調増加 | opId は常に過去最大値より大きいので、古い myOpId と一致する現在値は存在しない ✅ |

**解消する R4.1 HIGH:**
- code_reviewer R-001 (timeout 後の遅延応答 route 発火)
- edge_case_hunter R-001 (同上、opId 採番で timedOut フラグ必須)
- performance R-002 (requestId で setState/route 無効化)
- sw_debugger R-001 (古い応答の勝ちレース抑止)
- code_reviewer R-002 (timeout 時 inFlightRef=false で再送可能 → 二重送信)
- edge_case_hunter R-002 (旧 timeout cb が新規送信直後に発火)

---

## 2. ADV/PO 判定: D-16 false positive 棄却

### 論点
R4.1 a11y_engineer R-005 が「canSubmit=false 時に native `disabled` 属性が付与されていない可能性 (aria-disabled のみ混乱)」と指摘。

### R3 での決定 (既出)
R3 a11y_engineer が「`disabled` だと keyboard ユーザーが form を submit 試行できず、attempted 状態に入らないため aria-describedby のエラー原因が読み上げられない」と指摘し、aria-disabled + handleSubmit 内の canSubmit ガードで制御する方針を採用した（S01Auth.jsx コメント参照）。

### 棄却判定
- **R3 と R4.1 の a11y_engineer が相互に矛盾する指摘を行っている** (哲学的対立)
- **Lais の方針:** R3 の「キーボード送信を許可して attempted 状態で理由を読み上げる」が a11y 上優れる
- **ADV/PO 判定 (ふとし 2026-04-15):** R3 決定を維持。R4.1 の D-16 は **false positive として棄却**
- **根拠:** aria-disabled + submit gate の方が、キーボード専用ユーザーにエラー原因を伝える経路を保てる。native `disabled` を併用するとフォーカス不可になり `aria-describedby` の読み上げが失われる
- **実装責任:** handleSubmit 冒頭で `setAttempted(true)` + `canSubmit` チェックを実行し、失敗時は最初のエラー要素へ `focus()` する方針は R3/R4 で既に実装済み
- 本件は以降のレビューラウンドで再指摘されても **同判定で棄却** とする

---

## 3. 提案ログ送り (M4 以降で対応)

| # | 内容 | 優先度 | 備考 |
|---|---|---|---|
| **Group C** | オートフィル多段 retry + `animationstart(-webkit-autofill)` | 中 | 現行の 0ms/100ms 2段だけでは PW マネージャ介入を取り逃す場合あり |
| **D-14** | SPA ルート遷移後の `<main tabIndex=-1>` + `focus()` | 中 | a11y ランドマーク移動のベストプラクティス |
| **D-15** | autocomplete 属性は既設 (`email`/`new-password`/`current-password`) | — | **false positive、対応不要** |
| **D-17** | `.s01-checkbox` の全状態 contrast 実測 (focus/checked/disabled) | 低 | lais_contrast_check.mjs 拡張 (Phase B 同等扱い) |

---

## 4. Playwright 実測 (R5)

- consoleErrors: 0
- signup empty → 有効入力 → agree → login mode 遷移 全て PASS
- opId の behavior テスト（タイムアウト race）は単体テストで別途検証予定（Phase B）

---

## 5. R5 レビュー観点 (重点)

- **Group A+B:** opId パターンが race を完全に塞いでいるか
- **D-16 棄却判定:** R3 と R4.1 の矛盾指摘に対し R3 決定維持の合理性
- **finally の isCurrent ガード:** timeout 経由で opId=0 になっている場合に finally で `clearTimeout` を呼ばないのが正しいか（呼んでも no-op なので実害なし）

---

## 6. Phase B 分離 (変更なし)

- H5/H6: コード分割
- H7: Supabase RLS
- H8: service_role gitleaks
- H9: 明示的 CSP
- focus ring 全状態 contrast 実測
