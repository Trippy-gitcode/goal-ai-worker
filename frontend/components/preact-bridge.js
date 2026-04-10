// ARCH-01: Preact共通ルーター。全画面遷移でunmount自動実行
// 未移行画面はVanilla互換ラッパーで動作維持

import { render, h } from 'preact';
import { Today } from './Today.jsx';
import { Talk } from './Talk.jsx';

// 現在マウントされているPreactコンポーネント追跡
let _currentMount = null; // { name, container, cleanup }

// 画面定義: showPageが渡すpg値に合わせる
// ARCH-02: TODAY は常にPreact（?preact=1フラグ廃止）
const SCREENS = {
  today: {
    type: 'preact',
    mount: () => mountPreactToday(),
    unmount: () => unmountPreactToday(),
  },
  home: {
    type: 'preact',
    mount: () => mountPreactTalk(),
    unmount: () => unmountPreactTalk(),
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
  // ARCH-02: Preact Today を既存の #today-timeline 要素内に直接マウント
  // #today-timeline ID を Preact が管理（既存E2Eテスト互換）
  // レガシー DOM (グリーティング、EXPバー、秘書メモ等) は既存のまま
  const timelineSlot = document.getElementById('today-timeline');
  if (!timelineSlot) return false;

  // レガシー #today-task-list は非表示（Preact内で両ビュー切替）
  const listSlot = document.getElementById('today-task-list');
  if (listSlot) listSlot.style.display = 'none';
  timelineSlot.style.display = '';

  // Preact Today は #today-timeline 内にマウント
  _todayContainer = timelineSlot;
  render(h(Today, {}), _todayContainer);
  return true;
}

function unmountPreactToday() {
  if (_todayContainer) {
    render(null, _todayContainer);  // Preactのunmount
    _todayContainer = null;
  }
}

// ═══ Preact Talk（ARCH-03: TALK画面 Preact化） ═══
let _talkContainer = null;

function mountPreactTalk() {
  // マウントポイント: #pg-home の先頭に #preact-talk-host を確保
  const pgHome = document.getElementById('pg-home');
  if (!pgHome) return false;
  let host = document.getElementById('preact-talk-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'preact-talk-host';
    host.style.display = 'contents';
    pgHome.insertBefore(host, pgHome.firstChild);
  }
  _talkContainer = host;
  render(h(Talk, {}), _talkContainer);
  return true;
}

function unmountPreactTalk() {
  if (_talkContainer) {
    render(null, _talkContainer);  // useEffectクリーンアップ起動
    _talkContainer = null;
  }
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
  // ARCH-03: home はPreact化されたためここは未使用
  home: () => {},
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
window.mountPreactTalk = mountPreactTalk;
window.unmountPreactTalk = unmountPreactTalk;
window.isPreactTalkMounted = () => _currentMount?.name === 'home';
window.routeToScreen = routeToScreen;
