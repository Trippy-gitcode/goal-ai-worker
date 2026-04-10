// ARCH-05: ME画面 Preactライフサイクル化
// ARCH-03/04パターン: 薄いコンポーネント + unmount cleanup
import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

export function Myself() {
  const rootRef = useRef(null);

  useEffect(() => {
    return () => {
      // Unmount cleanup
      try {
        // 1. 編集中のプロフィールを自動保存
        if (typeof window.saveProfileToServer === 'function') {
          try { window.saveProfileToServer(); } catch {}
        }

        // 2. ヒアリングセッション中ならリセット
        const hearingModal = document.getElementById('hearing-modal');
        if (hearingModal && hearingModal.style.display !== 'none') {
          hearingModal.style.display = 'none';
        }
      } catch (e) {
        console.warn('Myself unmount cleanup error:', e);
      }
    };
  }, []);

  return h('div', { ref: rootRef, id: 'preact-myself-root', style: { display: 'none' } });
}
