import { Component } from 'preact';

/*
 * ErrorBoundary（Phase B-4 / PATCH-PB4-ERROR-BOUNDARY、2026-04-25 拡張）
 *
 * 仕様書根拠:
 * - docs/ops/error_boundary.md（運用 SSoT）
 * - lais/verify/dev_system_v34_patches.md PATCH-PB4-ERROR-BOUNDARY
 * - LP-008（環境変数未設定時のクラッシュ処理: モジュール評価時 throw を画面に出す）
 * - LP-010（console.error の本番バンドル漏出: sentinel は将来 Sentry 等へ）
 *
 * 設計:
 * - Preact class component（getDerivedStateFromError + componentDidCatch）
 * - props:
 *   - children: 監視対象サブツリー
 *   - fallback: ReactNode | (error, retry) => ReactNode（省略時はデフォルト fallback UI）
 *   - onError: (error, info) => void（任意の追加 sentinel hook）
 *   - homeHref: string（"ホームへ戻る" の遷移先、既定 '/'）
 *   - label: string（fallback UI のタイトル文言を画面別に差替える際の任意 prop）
 * - Default fallback UI:
 *   - role="alert" + aria-live="assertive"
 *   - ⚠️ アイコン（emoji 1 文字、CSS で前置き）
 *   - 「再試行」ボタン: state リセット
 *   - 「ホームへ戻る」ボタン: window.location.assign(homeHref)（preact-router 非依存で
 *     エラー後の不安定状態でも確実に遷移）
 * - Sentinel: console.error + 将来の Sentry / LogRocket フック用 TODO コメント
 *   - API キー / Token を fetch 経路に直接埋込まない（gitleaks 通過のため、
 *     送出先 URL はビルド時環境変数から、認証情報は付さない設計）
 */

const DEFAULT_HOME_HREF = '/';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Sentinel ログ送出（PATCH-PB4-ERROR-BOUNDARY）
    // - console.error は LP-010 に従い本番では define で no-op に置換される想定
    // - 外部サービス送出は Phase B-5 以降で wire up（API キー埋込禁止 / gitleaks 通過）
    if (typeof console !== 'undefined') {
      console.error('[Lais] ErrorBoundary caught:', error, info);
    }

    // TODO(Phase B-5+ Sentry 統合): import.meta.env.VITE_SENTRY_DSN が設定された場合のみ
    // fetch('/_telemetry/error', { method: 'POST', body: JSON.stringify({...}) }) で送出する。
    // - Body には message / stack / component stack / user agent / route のみを含める。
    // - 認証情報（Supabase token / API キー）は絶対に含めない（gitleaks / RLS 整合）。
    // - DSN 未設定環境では no-op（開発時 / テスト時の誤送信防止）。

    // 任意 onError hook（呼出し側の追加 telemetry）
    if (typeof this.props.onError === 'function') {
      try {
        this.props.onError(error, info);
      } catch (hookError) {
        if (typeof console !== 'undefined') {
          console.error('[Lais] ErrorBoundary onError hook failed:', hookError);
        }
      }
    }
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  handleHome = () => {
    const href = this.props.homeHref || DEFAULT_HOME_HREF;
    if (typeof window !== 'undefined' && window.location) {
      window.location.assign(href);
    }
  };

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    // fallback prop が提供されている場合はそれを優先
    const { fallback } = this.props;
    if (typeof fallback === 'function') {
      return fallback(error, this.handleRetry);
    }
    if (fallback) {
      return fallback;
    }

    // デフォルト fallback UI
    const title = this.props.label || '読み込みに失敗しました';
    const message = (error && error.message) || '不明なエラーが発生しました';
    return (
      <main class="error-boundary" role="alert" aria-live="assertive">
        <p class="error-boundary__icon" aria-hidden="true">⚠️</p>
        <p class="error-boundary__title">{title}</p>
        <p class="error-boundary__message">{message}</p>
        <div class="error-boundary__actions">
          <button
            class="error-boundary__retry"
            type="button"
            onClick={this.handleRetry}
          >
            再試行
          </button>
          <button
            class="error-boundary__home"
            type="button"
            onClick={this.handleHome}
          >
            ホームへ戻る
          </button>
        </div>
      </main>
    );
  }
}

export default ErrorBoundary;
