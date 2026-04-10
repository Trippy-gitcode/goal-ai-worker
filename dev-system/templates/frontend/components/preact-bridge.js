// Preact共通ルーター
// GOAL AI ARCH-00〜10 パターン: 画面遷移でmount/unmountを自動実行
// 各画面は「薄いコンポーネント」（ライフサイクル管理のみ、レンダリングはVanilla継続可）

import { render, h } from 'preact';
// import { SampleScreen } from './SampleScreen.jsx';

let _currentMount = null;

const SCREENS = {
  // 画面を追加:
  // home: { type: 'preact', mount: () => mountScreen('home', 'pg-home', SampleScreen), unmount: () => unmountScreen('home') },
};

const _containers = {};

export function routeToScreen(name) {
  // 前画面のunmount
  if (_currentMount && _currentMount.name !== name) {
    try {
      const prev = SCREENS[_currentMount.name];
      if (prev && prev.unmount) prev.unmount();
    } catch (e) { console.warn('unmount failed:', e); }
    _currentMount = null;
  }

  // 次画面のmount
  const screen = SCREENS[name];
  if (!screen) { _currentMount = { name }; return false; }

  try {
    screen.mount();
    _currentMount = { name };
    return true;
  } catch (e) {
    console.warn('mount failed:', e);
    _currentMount = { name };
    return false;
  }
}

function mountScreen(name, pgId, Component) {
  const pg = document.getElementById(pgId);
  if (!pg) return false;
  const hostId = `preact-${name}-host`;
  let host = document.getElementById(hostId);
  if (!host) {
    host = document.createElement('div');
    host.id = hostId;
    host.style.display = 'contents';
    pg.insertBefore(host, pg.firstChild);
  }
  _containers[name] = host;
  render(h(Component, {}), host);
  return true;
}

function unmountScreen(name) {
  const container = _containers[name];
  if (container) {
    render(null, container);
    delete _containers[name];
  }
}

// グローバル公開
window.routeToScreen = routeToScreen;
