// ARCH-03: TALK画面 Preact移行
// - Preactライフサイクルでmount/unmountを保証
// - unmount時に入力欄・画像プレビュー・ルートプレビュー・ストリーム中断を確実にリセット
// - メッセージリスト描画はVanilla(renderHomeMsgs)と共存し、Preact側は構造と状態discipline担当
// ARCH-02 Today.jsx と同じ"薄いコンポーネント"パターン
import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

export function Talk() {
  const rootRef = useRef(null);

  useEffect(() => {
    // Mount: 既存のTALK UI初期化は既存のshowPage/main.jsで完了済み
    // Preact側の責務は unmount時のクリーンアップ保証

    return () => {
      // Unmount cleanup: ARCH-01 VANILLA_CLEANUP['home']を構造化
      try {
        // 1. 入力欄リセット
        const inp = document.getElementById('home-msg-in');
        if (inp) {
          inp.value = '';
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.blur();
        }
        if (typeof window.homeResize === 'function' && inp) {
          try { window.homeResize(inp); } catch {}
        }

        // 2. 画像プレビュークリア
        if (typeof window.clearHomeImage === 'function') {
          try { window.clearHomeImage(); } catch {}
        }

        // 3. ルートプレビュー非表示
        if (typeof window.hideRoutePreview === 'function') {
          try { window.hideRoutePreview(); } catch {}
        }

        // 4. 進行中ストリーム中断
        if (typeof window.stopHomeStream === 'function') {
          try { window.stopHomeStream(); } catch {}
        }

        // 5. 検索バー閉じる
        const searchBar = document.getElementById('home-search-bar');
        if (searchBar && searchBar.style.display !== 'none') {
          searchBar.style.display = 'none';
        }
      } catch (e) {
        console.warn('Talk unmount cleanup error:', e);
      }
    };
  }, []);

  // #preact-talk-rootはマーカー。visualは既存DOMが担当
  return h('div', { ref: rootRef, id: 'preact-talk-root', style: { display: 'none' } });
}
