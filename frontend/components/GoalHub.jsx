// ARCH-04: GOALS (#goal-hub) 画面 Preactライフサイクル化
// ARCH-03 Talk.jsx と同じパターン: 薄いコンポーネント + unmount cleanup
import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

export function GoalHub() {
  const rootRef = useRef(null);

  useEffect(() => {
    return () => {
      // Unmount cleanup: 状態漏れ防止
      try {
        // 1. ゴール詳細パネルを閉じる
        const hubDetail = document.getElementById('pg-goal-hub');
        if (hubDetail) hubDetail.style.display = 'none';

        // 2. hub入力欄リセット
        const hubInp = document.getElementById('hub-msg-in');
        if (hubInp) {
          hubInp.value = '';
          hubInp.dispatchEvent(new Event('input', { bubbles: true }));
          hubInp.blur();
        }

        // 3. hub検索バー閉
        const searchBar = document.getElementById('hub-search-bar');
        if (searchBar) searchBar.style.display = 'none';
        const searchIn = document.getElementById('hub-search-in');
        if (searchIn) searchIn.value = '';
      } catch (e) {
        console.warn('GoalHub unmount cleanup error:', e);
      }
    };
  }, []);

  return h('div', { ref: rootRef, id: 'preact-goal-hub-root', style: { display: 'none' } });
}
