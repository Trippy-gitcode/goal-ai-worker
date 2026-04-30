import { useCallback } from 'preact/hooks';
import { route } from 'preact-router';
import './S40PrivacyPolicy.css';

/*
 * S-40 PrivacyPolicy — プライバシーポリシー静的ページ (Stage 7-3 新設)
 * po_expectations_v1.md §8.8 準拠
 *
 * Given: フッター or S-30 から「プライバシーポリシー」タップ
 * When : 静的ページ表示
 * Then : 言語別 (G3) + 最終更新日表示
 */

const LAST_UPDATED = '2026-04-28';

export function S40PrivacyPolicy() {
  const handleBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
      return;
    }
    route('/', true);
  }, []);

  return (
    <main id="main-content" class="s40-privacy" aria-labelledby="s40-title" data-testid="s40-root">
      <header class="s40-header">
        <button type="button" class="s40-back" onClick={handleBack} aria-label="戻る">
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false">
            <path d="M 13 4 L 7 10 L 13 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <h1 id="s40-title" class="s40-title">プライバシーポリシー</h1>
      </header>

      <article class="s40-content" data-testid="s40-content">
        <p class="s40-meta">最終更新日: {LAST_UPDATED}</p>

        <section>
          <h2 class="s40-section-title">1. 取得する個人情報</h2>
          <p>Lais は以下の個人情報を取得します: メールアドレス、表示名、目標データ、タスクデータ、AI 対話履歴、日記、推定 MBTI。</p>
        </section>

        <section>
          <h2 class="s40-section-title">2. 利用目的</h2>
          <p>取得した情報は、サービス提供、AI コーチングのパーソナライズ、ユーザサポートに使用します。</p>
        </section>

        <section>
          <h2 class="s40-section-title">3. 第三者提供</h2>
          <p>法令に基づく場合を除き、利用者の同意なく第三者に提供しません。AI モデル (OpenAI / Anthropic / Google) への送信時はデータマスキングを実施します。</p>
        </section>

        <section>
          <h2 class="s40-section-title">4. 開示・訂正・削除</h2>
          <p>S-32 エクスポート画面または S-33 退会画面からデータ開示・削除を要求できます (C2 / C4 連動)。</p>
        </section>
      </article>
    </main>
  );
}

export default S40PrivacyPolicy;
