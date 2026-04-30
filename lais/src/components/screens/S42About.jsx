import { useCallback } from 'preact/hooks';
import { route } from 'preact-router';
import './S42About.css';

/*
 * S-42 About — バージョン情報画面 (Stage 7-3 新設)
 * po_expectations_v1.md §8.10 準拠
 *
 * Given: S-30 から「アバウト」タップ
 * When : バージョン / commit hash / ライセンス表示
 * Then : 開発者連絡先表示
 */

const APP_VERSION = '0.0.0';
const BUILD_HASH = 'stage7-3';
const SUPPORT_EMAIL = 'support@lais.invalid';

export function S42About() {
  const handleBack = useCallback(() => {
    route('/me', true);
  }, []);

  return (
    <main id="main-content" class="s42-about" aria-labelledby="s42-title" data-testid="s42-root">
      <header class="s42-header">
        <button type="button" class="s42-back" onClick={handleBack} aria-label="戻る">
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false">
            <path d="M 13 4 L 7 10 L 13 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <h1 id="s42-title" class="s42-title">アプリについて</h1>
      </header>

      <section class="s42-info">
        <p class="s42-app-name">Lais</p>
        <p class="s42-version" data-testid="s42-version">v{APP_VERSION} ({BUILD_HASH})</p>
        <p class="s42-tagline">あなたの人生を、あなたらしく</p>
      </section>

      <section class="s42-meta">
        <dl class="s42-meta-list">
          <div class="s42-meta-row">
            <dt>サポート</dt>
            <dd><a href={`mailto:${SUPPORT_EMAIL}`} class="s42-link">{SUPPORT_EMAIL}</a></dd>
          </div>
          <div class="s42-meta-row">
            <dt>ライセンス</dt>
            <dd>OSS ライセンス一覧 (後続フェーズで追加)</dd>
          </div>
          <div class="s42-meta-row">
            <dt>プライバシーポリシー</dt>
            <dd><a href="/privacy" class="s42-link">表示</a></dd>
          </div>
          <div class="s42-meta-row">
            <dt>利用規約</dt>
            <dd><a href="/terms" class="s42-link">表示</a></dd>
          </div>
        </dl>
      </section>
    </main>
  );
}

export default S42About;
