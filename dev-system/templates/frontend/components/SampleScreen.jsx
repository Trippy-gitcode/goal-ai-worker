// サンプル画面コンポーネント
// 「薄いコンポーネント」パターン: mount/unmountライフサイクルのみ管理
// レンダリングは既存VanillaのまままたはinnerHTMLで行う
import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

export function SampleScreen() {
  const rootRef = useRef(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Mount: 初期化処理
    console.log('SampleScreen mounted');

    return () => {
      // Unmount: クリーンアップ（状態漏れ防止）
      console.log('SampleScreen unmounted');
      // 例: 入力欄リセット、モーダル閉、ストリーム中断
    };
  }, []);

  // 「薄い」パターン: hidden rootのみ返す（VanillaのDOMはそのまま）
  // return h('div', { ref: rootRef, id: 'preact-sample-root', style: { display: 'none' } });

  // 「厚い」パターン: Preactがレンダリングも担当
  return h('div', { ref: rootRef, id: 'preact-sample-root' },
    h('p', null, `Count: ${count}`),
    h('button', { onClick: () => setCount(c => c + 1) }, 'Increment')
  );
}
