// ARCH-01: Preact共通ルーター。全画面遷移でunmount自動実行
// 未移行画面はVanilla互換ラッパーで動作維持

import { render, h } from 'preact';
import { Today } from './Today.jsx';

// 現在マウントされているPreactコンポーネント追跡
let _currentMount = null; // { name, container, cleanup }

// 画面定義: showPageが渡すpg値に合わせる（today/home/goal-hub/myself/tasks/calendar/analytics）
// ARCH-01: TODAYは?preact=1フラグでPreact版、デフォルトはvanilla（レガシー互換）
const _usePreactToday = typeof window !== 'undefined' && window.location?.search.includes('preact=1');
const SCREENS = {
  today: _usePreactToday ? {
    type: 'preact',
    mount: () => mountPreactToday(),
    unmount: () => unmountPreactToday(),
  } : {
    type: 'vanilla',
    mount: () => mountVanillaWrapper('today'),
    unmount: () => unmountVanillaWrapper('today'),
  },
  home: {
    type: 'vanilla',
    mount: () => mountVanillaWrapper('home'),
    unmount: () => unmountVanillaWrapper('home'),
  },
  'goal-hub': {
    type: 'vanilla',
    mount: () => mountVanillaWrapper('goal-hub'),
    unmount: () => unmountVanillaWrapper('goal-hub'),
  },
  myself: {
    type: 'vanilla',
    mount: () => mountVanillaWrapper('myself'),
    unmount: () => unmountVanillaWrapper('myself'),
  },
  tasks: {
    type: 'vanilla',
    mount: () => mountVanillaWrapper('tasks'),
    unmount: () => unmountVanillaWrapper('tasks'),
  },
  calendar: {
    type: 'vanilla',
    mount: () => mountVanillaWrapper('calendar'),
    unmount: () => unmountVanillaWrapper('calendar'),
  },
  analytics: {
    type: 'vanilla',
    mount: () => mountVanillaWrapper('analytics'),
    unmount: () => unmountVanillaWrapper('analytics'),
  },
};

/**
 * 共通ルーター: 画面切替時に前画面のunmount→次画面のmountを自動実行
 * ARCH-01: showPage()から呼び出される。前画面のクリーンアップを保証
 */
export function routeToScreen(name) {
  // 1. 前画面のunmount
  if (_currentMount && _currentMount.name !== name) {
    try {
      const prev = SCREENS[_currentMount.name];
      if (prev && prev.unmount) prev.unmount();
    } catch (e) { console.warn('unmount failed:', e); }
    _currentMount = null;
  }

  // 2. 次画面のmount
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

// ═══ Preact Today（ARCH-00から継承） ═══
let _todayContainer = null;

function mountPreactToday() {
  const wrap = document.getElementById('pg-today-wrap');
  if (!wrap) return false;

  _todayContainer = document.getElementById('preact-today-container');
  if (!_todayContainer) {
    _todayContainer = document.createElement('div');
    _todayContainer.id = 'preact-today-container';
    _todayContainer.style.cssText = 'width:100%;height:100%;overflow-y:auto;';
    wrap.appendChild(_todayContainer);
  }

  // レガシーTODAYを非表示
  const legacy = wrap.querySelector('#pg-today');
  if (legacy) legacy.style.display = 'none';

  _todayContainer.style.display = '';
  render(h(Today, {}), _todayContainer);
  return true;
}

function unmountPreactToday() {
  if (_todayContainer) {
    render(null, _todayContainer);  // Preactのunmount
    _todayContainer.style.display = 'none';
  }
  // レガシーTODAYを復元（他画面からTODAY以外に戻ったときのため）
  const legacy = document.querySelector('#pg-today-wrap #pg-today');
  if (legacy) legacy.style.display = '';
}

// ═══ Vanilla互換ラッパー ═══
// ARCH-01: 未移行画面のため、mount時に初期化、unmount時にクリーンアップ
const VANILLA_CLEANUP = {
  today: () => {
    // TODAY画面のクリーンアップ: タスク詳細パネルを閉じる
    const taskPanel = document.getElementById('home-task-panel');
    if (taskPanel && taskPanel.classList.contains('open')) {
      taskPanel.classList.remove('open');
    }
  },
  home: () => {
    // TALK画面のクリーンアップ: 入力欄リセット
    const inp = document.getElementById('home-msg-in');
    if (inp) {
      inp.value = '';
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.blur();
    }
    const resize = window.homeResize;
    if (resize && inp) try { resize(inp); } catch {}
  },
  'goal-hub': () => {
    // ゴール詳細パネルが開いていたら閉じる
    const hubDetail = document.getElementById('pg-goal-hub');
    if (hubDetail) hubDetail.style.display = 'none';
  },
  myself: () => {
    // ME画面: 編集中のニックネーム保存
    if (typeof window.saveProfileToServer === 'function') {
      try { window.saveProfileToServer(); } catch {}
    }
  },
  tasks: () => {},
  calendar: () => {},
  analytics: () => {},
};

function mountVanillaWrapper(name) {
  // Vanilla画面は既存のshowPage()ロジックで表示される
  // ここでは追加の初期化のみ（必要に応じて）
  return true;
}

function unmountVanillaWrapper(name) {
  // ARCH-01: 状態リセット、イベントリスナー解除
  const cleanup = VANILLA_CLEANUP[name];
  if (cleanup) {
    try { cleanup(); } catch (e) { console.warn(`cleanup ${name} failed:`, e); }
  }
  // タスク詳細パネルが開いていたら閉じる（BUG-05防止）
  const taskPanel = document.getElementById('home-task-panel');
  if (taskPanel && taskPanel.classList.contains('open')) {
    taskPanel.classList.remove('open');
  }
}

// ═══ Legacy API 互換 ═══
// グローバル公開（レガシーshowPageから呼べるように）
window.mountPreactToday = mountPreactToday;
window.unmountPreactToday = unmountPreactToday;
window.isPreactTodayMounted = () => _currentMount?.name === 'today';
window.routeToScreen = routeToScreen;
