/*
 * Loading.jsx — 共通ロード状態 UI（PATCH-PB5-CODE-SPLIT、2026-04-25）
 *
 * 用途:
 * - ルート別 lazy chunk の Suspense fallback として使用。
 * - aria-live="polite" + role="status" でスクリーンリーダーへ「読み込み中」を通知。
 * - ビジュアルは tokens.css の準拠で簡素なスピナー（外部依存ゼロ）。
 *
 * 設計方針:
 * - 重量化を避けるため CSS は Loading.css に分離せず、styles/global.css の `.route-fallback`
 *   既存スタイルに同居（B-3 CSP / B-4 ErrorBoundary との衝突回避のため新規 .css は作らない）。
 * - props.label で文言上書き可能（既定: 「読み込み中」）。
 *
 * 参照: docs/ops/code_splitting.md §3
 */
export function Loading({ label = '読み込み中' }) {
  return (
    <main
      class="route-fallback"
      role="status"
      aria-live="polite"
      aria-label={label}
    />
  );
}
