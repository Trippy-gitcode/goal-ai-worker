// ARCH-06/07/08: 汎用画面シェル（設定/カレンダー/アナリティクス）
// 薄いコンポーネント: Preactライフサイクルのみ。unmount cleanup は各画面ごとにpropsで指定
import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

export function ScreenShell({ id, onUnmount }) {
  const rootRef = useRef(null);

  useEffect(() => {
    return () => {
      if (typeof onUnmount === 'function') {
        try { onUnmount(); } catch (e) {
          console.warn(`${id} unmount cleanup error:`, e);
        }
      }
    };
  }, []);

  return h('div', { ref: rootRef, id, style: { display: 'none' } });
}
