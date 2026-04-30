import { useCallback } from 'preact/hooks';
import { route } from 'preact-router';
import './S41TermsOfService.css';

/*
 * S-41 TermsOfService — 利用規約静的ページ (Stage 7-3 新設)
 * po_expectations_v1.md §8.9 準拠
 *
 * Given: フッター or 初回サインアップ画面
 * When : 静的ページ表示
 * Then : 言語別 + 最終更新日 + 同意チェック (サインアップ時)
 */

const LAST_UPDATED = '2026-04-28';

export function S41TermsOfService() {
  const handleBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
      return;
    }
    route('/', true);
  }, []);

  return (
    <main id="main-content" class="s41-terms" aria-labelledby="s41-title" data-testid="s41-root">
      <header class="s41-header">
        <button type="button" class="s41-back" onClick={handleBack} aria-label="戻る">
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false">
            <path d="M 13 4 L 7 10 L 13 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <h1 id="s41-title" class="s41-title">利用規約</h1>
      </header>

      <article class="s41-content" data-testid="s41-content">
        <p class="s41-meta">最終更新日: {LAST_UPDATED}</p>

        <section>
          <h2 class="s41-section-title">第 1 条 (適用)</h2>
          <p>本規約は、Lais (以下「当サービス」) の提供条件および利用に関する事項を定めます。</p>
        </section>

        <section>
          <h2 class="s41-section-title">第 2 条 (利用登録)</h2>
          <p>登録希望者は本規約に同意の上、所定の方法により利用登録を申請します。</p>
        </section>

        <section>
          <h2 class="s41-section-title">第 3 条 (禁止事項)</h2>
          <p>法令違反、犯罪行為、知的財産権侵害、迷惑行為、なりすまし、不正アクセス等を禁止します。</p>
        </section>

        <section>
          <h2 class="s41-section-title">第 4 条 (サービス変更)</h2>
          <p>当サービスは、ユーザに通知のうえ機能の追加・変更・廃止を行うことができます。</p>
        </section>
      </article>
    </main>
  );
}

export default S41TermsOfService;
