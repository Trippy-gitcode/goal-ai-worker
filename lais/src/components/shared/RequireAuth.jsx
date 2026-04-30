import { useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { session, authLoading } from '../../lib/auth.js';
import { Loading } from './Loading.jsx';

/*
 * RequireAuth.jsx — 認証ゲート HOC（PATCH-BUG-RT-AUTH-GATE、2026-04-26）
 *
 * 用途:
 * - protected route（/onboarding /grow /goal/:id /goal/create /talk /me）を
 *   ラップし、未認証セッションでのアプリ画面露出を防ぐ。
 * - UX §14.1（リピーターフロー）: セッション検証 → 失敗（オンライン） → S-02 ログイン画面
 * - project §3.5: 未ログインはランディングページ（S-00）のみ
 * - SPEC-CHECK 2026-04-26 §1.5.1〜.4 設計指針準拠
 *
 * 動作:
 * 1. authLoading.value === true（初回 getSession 中）: <Loading /> 表示で blink 抑止
 * 2. session.value === null（未認証確定）: deeplink 保存 + /auth?mode=login へ replace 遷移
 * 3. session.value 存在: children を素通し
 *
 * 設計上の注意:
 * - Preact signals の `.value` 参照で reactivity 取得（SSR/初期描画でも安全）
 * - replace=true で history を増やさない（戻るボタンのピンポン防止、UX §1.4 準拠）
 * - useEffect 内で route() 呼出（render 中の副作用回避、preact-router 推奨）
 * - sessionStorage 失敗時（Safari private mode 等）は try/catch で fail-open（無保存で続行）
 *
 * 参照: lais/verify/lais_phase_a_spec_check_2026-04-26.md §1.5
 */
export function RequireAuth({ children, path }) {
  // 注: preact-router は path prop を子に渡すため受領のみ（child は使わない）
  const sess = session.value;
  const loading = authLoading.value;

  useEffect(() => {
    if (loading) return;             // 初回 getSession 中は判定保留
    if (sess) return;                // 認証済み → 何もしない

    // 未認証確定: deeplink 保存（ログイン後復帰用）
    try {
      const current = typeof window !== 'undefined'
        ? window.location.pathname + window.location.search
        : '';
      if (current && current !== '/' && !current.startsWith('/auth')) {
        sessionStorage.setItem('lais.deeplink', current);
      }
    } catch {
      // Safari private mode 等で sessionStorage 不可: deeplink 機能のみ失効、redirect は継続
    }

    route('/auth?mode=login', true);  // replace でピンポン防止
  }, [loading, sess]);

  if (loading) {
    return <Loading label="セッションを確認中" />;
  }
  if (!sess) {
    // useEffect が route() を発火する間の 1 フレーム白画面を避けるため Loading を表示
    return <Loading label="ログイン画面に移動中" />;
  }
  return children;
}
