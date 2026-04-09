// ARCH-00: Preactとレガシーコードのブリッジ
// 既存のshowPage('today')からPreact Todayコンポーネントをマウント/アンマウントする

import { render, h } from 'preact';
import { Today } from './Today.jsx';

let _preactMounted = false;
let _preactContainer = null;

/**
 * Preact Today画面をマウント
 * 既存の#pg-today-wrap内の内容を隠してPreactをレンダリング
 */
export function mountPreactToday() {
  const wrap = document.getElementById('pg-today-wrap');
  if (!wrap) return false;

  // Preact用コンテナを取得または作成
  _preactContainer = document.getElementById('preact-today-container');
  if (!_preactContainer) {
    _preactContainer = document.createElement('div');
    _preactContainer.id = 'preact-today-container';
    _preactContainer.style.cssText = 'width:100%;height:100%;overflow-y:auto;';
    wrap.appendChild(_preactContainer);
  }

  // レガシーTODAYの要素を非表示
  const legacyTabs = wrap.querySelectorAll('#pg-today, #today-timeline, #today-task-list');
  legacyTabs.forEach(el => {
    const parent = el.closest('#pg-today');
    if (parent) parent.style.display = 'none';
  });

  _preactContainer.style.display = '';
  render(h(Today, {}), _preactContainer);
  _preactMounted = true;
  return true;
}

/**
 * Preact Todayをアンマウント
 * タブ切替時に呼ばれる。状態リセット + DOM解放
 */
export function unmountPreactToday() {
  if (_preactContainer) {
    render(null, _preactContainer);
    _preactContainer.style.display = 'none';
  }
  _preactMounted = false;
}

/**
 * 現在マウント済みか
 */
export function isPreactTodayMounted() {
  return _preactMounted;
}

// グローバル公開（レガシーshowPageから呼べるように）
window.mountPreactToday = mountPreactToday;
window.unmountPreactToday = unmountPreactToday;
window.isPreactTodayMounted = isPreactTodayMounted;
