import { useCallback } from 'preact/hooks';
import { route } from 'preact-router';
import './S43NotFound.css';

/*
 * S-43 NotFound — 404 / フォールバック画面 (Stage 7-3 新設)
 * po_expectations_v1.md §8.15 ErrorBoundary 系統と並列。
 *
 * Given: 未定義 URL に直接アクセス or リンク切れ
 * When : 画面表示
 * Then : ホーム/トップへの誘導 CTA を出す
 */

export function S43NotFound() {
  const handleHome = useCallback(() => route('/', true), []);

  return (
    <main id="main-content" class="s43-notfound" aria-labelledby="s43-title" data-testid="s43-root">
      <section class="s43-content">
        <p class="s43-code" aria-hidden="true">404</p>
        <h1 id="s43-title" class="s43-title">ページが見つかりません</h1>
        <p class="s43-message">URL を確認するか、トップへ戻ってください。</p>
        <button type="button" class="s43-cta" onClick={handleHome}>
          トップへ戻る
        </button>
      </section>
    </main>
  );
}

export default S43NotFound;
