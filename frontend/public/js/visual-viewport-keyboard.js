// ============================================================================
// visual-viewport-keyboard.js
// Round 6 P0 #M-1 fix (2026-05-01) — Mission: SUBAGENT-DEVSYS-ROUND6-P0-FIX-V1
// 6 persona vote: 6/6 YES、反対 0
//   (frontend-architect / pwa-engineer / mobile-ux / security-auditor / i18n / cross-browser-qa)
//
// Round 22 R-003 fix (2026-05-01) — external review GPT-5.4 指摘対応
//   旧: window グローバル汚染 (__VISUAL_VIEWPORT_KEYBOARD_INSTALLED__ /
//       __keyboardObserver) + teardown 関数なし → 多重登録・SPA 化時の保守性低下。
//   新: namespaced object `window.LaisKeyboard` に init/destroy/observer を集約、
//       全リスナー参照を保持して removeEventListener を明示的に行えるよう変更。
//       自動 install を維持しつつ、後から `LaisKeyboard.destroy()` で完全 teardown 可能。
//
// 目的:
//   iOS Safari 17 以前で `<meta name="viewport" content="...interactive-widget=resizes-content">`
//   が無視されてキーボード pop-up 時に textarea が隠れる致命的 UX bug を、
//   `window.visualViewport` API (Safari 13+ / Chrome 61+ / Firefox 91+) 経由で
//   keyboard 高さを CSS variable `--keyboard-h` に書き出して layout を動的調整する。
//
// 採用判断:
//   - `interactive-widget=resizes-content` は 2024 W3C draft、iOS Safari 18+ で
//     ようやく対応 (~2024 後半)、Safari 17- では無視 = 主要 iOS user に layout 破綻。
//   - `visualViewport` は iOS Safari 13+ (2019) / Android Chrome 61+ で広く対応、
//     polyfill 不要。
//   - feature detection (`if (window.visualViewport)`) で graceful degrade、
//     非対応環境は no-op (旧 default 動作維持)。
//
// 副作用:
//   - <html> 要素の CSS custom property `--keyboard-h` を更新 (default 0px)
//   - <html> に class `kbd-open` を toggle (CSS から `.kbd-open` でフック可能)
//   - window resize / orientationchange でも再計算 (Android キーボードの折返し対応)
//
// CSS 側で利用例 (style.css 別 mission で migration 推奨):
//   .home-input-area { padding-bottom: calc(env(safe-area-inset-bottom) + var(--keyboard-h, 0px)); }
//   #app { height: calc(100dvh - var(--keyboard-h, 0px)); }
//
// 公開 API (Round 22 R-003 で導入):
//   window.LaisKeyboard.init()    — 初期化 (auto 実行済、再 init は no-op)
//   window.LaisKeyboard.destroy() — 全リスナー解除 + flag リセット
//   window.LaisKeyboard.observer  — { update, schedule, threshold } (test 用)
// ============================================================================

(function () {
  'use strict';

  // FIX (external review CRITICAL R-14): SSR / Worker / Node test 環境への
  // 早期 guard を最上位に移動。window / document が undefined な場合は no-op で安全 return。
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Round 25 R-003 fix (2026-05-01) — external review GPT-5.4 HIGH:
  //   旧: head で全ページ共通読込、副作用 (visualViewport resize/scroll listener) が
  //       全画面で常時発火 → 不要ページでも処理走行、layout 競合 / debug 困難。
  //   新: <html data-keyboard-aware> または <body data-keyboard-aware> 属性が存在する
  //       ページでのみ自動 init。属性無しページでは LaisKeyboard API のみ公開し、
  //       明示的 LaisKeyboard.init() 呼出時のみ発火する。
  //   index.html は本属性を持つため後方互換 (Wave 0 振る舞いを維持)。
  function _shouldAutoInit() {
    var html = document.documentElement;
    var body = document.body;
    if (html && html.hasAttribute('data-keyboard-aware')) return true;
    if (body && body.hasAttribute('data-keyboard-aware')) return true;
    return false;
  }

  // --- 内部 state (closure 内に閉じ込め、grobal 露出は LaisKeyboard namespace のみ) ---
  // Round 25 R-008 fix (2026-05-01) — external review GPT-5.4 MEDIUM:
  //   KEYBOARD_THRESHOLD_PX = 30 の根拠を明示:
  //   1) iOS Safari アドレスバー収縮: ~50-60px 縮、これは下回らないため確実に keyboard 起動と判定可。
  //   2) Android Chrome 戻るバー / 通知バー透過: ~24px 揺れ、threshold より下に収まる。
  //   3) viewport zoom (pinch zoom): visualViewport.height = innerHeight の比率変化、
  //      px diff は 30px 未満になりやすいため誤発火しない。
  //   4) iPad Stage Manager / multi-window: ~100px+ 揺れだが keyboard 起動でも同等 → 誤判定なし。
  //   5) 30px は WCAG tap target 最小 44px の 2/3、UI 影響域として実害最小値。
  //   将来 device-specific 調整必要時は Math.max(visualViewport.offsetTop, diff) で複数指標化を検討。
  var KEYBOARD_THRESHOLD_PX = 30;
  var lastHeight = 0;
  var rafId = 0;
  var installed = false;
  // listener 参照を保持して destroy() で removeEventListener できるようにする
  var listenerScheduleUpdate = null;
  var listenerOrientationChange = null;

  function updateKeyboardHeight() {
    rafId = 0;
    var vv = window.visualViewport;
    if (!vv) return;
    // layout viewport - visual viewport
    var diff = Math.max(0, window.innerHeight - vv.height);
    var kbdHeight = diff > KEYBOARD_THRESHOLD_PX ? diff : 0;
    if (kbdHeight === lastHeight) return;
    lastHeight = kbdHeight;
    document.documentElement.style.setProperty('--keyboard-h', kbdHeight + 'px');
    if (kbdHeight > 0) {
      document.documentElement.classList.add('kbd-open');
    } else {
      document.documentElement.classList.remove('kbd-open');
    }
    // dispatch custom event for application code (chat.js が future hook で利用可)
    try {
      window.dispatchEvent(
        new CustomEvent('lais:keyboard', {
          detail: { open: kbdHeight > 0, height: kbdHeight },
        })
      );
    } catch (e) {
      // CustomEvent 非対応 (IE 11 等) は無視 — 主要 modern browser では発火
    }
  }

  function scheduleUpdate() {
    if (rafId) return;
    rafId = requestAnimationFrame(updateKeyboardHeight);
  }

  function init() {
    if (installed) return; // 二重登録防止
    if (!window.visualViewport) {
      // fallback: layout viewport 等しい想定で --keyboard-h を 0 にし、CSS で吸収
      document.documentElement.style.setProperty('--keyboard-h', '0px');
      installed = true;
      return;
    }
    listenerScheduleUpdate = scheduleUpdate;
    listenerOrientationChange = scheduleUpdate;
    // resize: 主要 trigger (キーボード show/hide)
    // scroll: iOS で keyboard 中の scroll で発火 (visualViewport.offsetTop 変動)
    window.visualViewport.addEventListener('resize', listenerScheduleUpdate);
    window.visualViewport.addEventListener('scroll', listenerScheduleUpdate);
    // orientationchange: 横向き切替で全リセット
    window.addEventListener('orientationchange', listenerOrientationChange);
    installed = true;
    scheduleUpdate(); // 初期値設定
  }

  function destroy() {
    if (!installed) return;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (window.visualViewport && listenerScheduleUpdate) {
      window.visualViewport.removeEventListener('resize', listenerScheduleUpdate);
      window.visualViewport.removeEventListener('scroll', listenerScheduleUpdate);
    }
    if (listenerOrientationChange) {
      window.removeEventListener('orientationchange', listenerOrientationChange);
    }
    listenerScheduleUpdate = null;
    listenerOrientationChange = null;
    lastHeight = 0;
    installed = false;
    // CSS variable / class もリセット
    document.documentElement.style.setProperty('--keyboard-h', '0px');
    document.documentElement.classList.remove('kbd-open');
  }

  // --- 公開 API: namespaced object 1 個のみ (legacy global 削除) ---
  // 既に installed なら新しい module 参照は無視 (二重 script 読み込みの安全策)
  if (window.LaisKeyboard && window.LaisKeyboard._installed) return;
  window.LaisKeyboard = {
    init: init,
    destroy: destroy,
    observer: {
      update: updateKeyboardHeight,
      schedule: scheduleUpdate,
      get threshold() { return KEYBOARD_THRESHOLD_PX; },
      get installed() { return installed; },
    },
    _installed: true,
  };

  // Round 25 R-003 + Round 26 R-005 fix: 自動 init は data-keyboard-aware 属性ありページのみ。
  //   旧 (R-003): 属性無しページでも `--keyboard-h` を 0px に書込 → opt-in の意図に反して DOM 副作用残存。
  //   新 (R-005): 属性無しページでは DOM 書換も行わない (`--keyboard-h` 未設定 = CSS 側 default 値を採用)。
  //               CSS は `var(--keyboard-h, 0px)` のように fallback 値を持たせる慣習。
  //   属性無しページでも LaisKeyboard.init() 明示呼出は可能 (responsibility on caller)。
  if (_shouldAutoInit()) {
    init();
  }
  // 属性無しページは API のみ公開、DOM 書換ゼロ (R-005 fix)。
})();
