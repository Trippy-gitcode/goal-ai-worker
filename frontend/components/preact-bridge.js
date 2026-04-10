// ARCH-01: Preact共通ルーター。全画面遷移でunmount自動実行
// 未移行画面はVanilla互換ラッパーで動作維持

import { render, h } from 'preact';
import { Today } from './Today.jsx';
import { Talk } from './Talk.jsx';
import { GoalHub } from './GoalHub.jsx';
import { Myself } from './Myself.jsx';
import { ScreenShell } from './ScreenShell.jsx';

// 現在マウントされているPreactコンポーネント追跡
let _currentMount = null; // { name, container, cleanup }

// 画面定義: goPageが渡すpg値に合わせる
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
    type: 'preact',
    mount: () => mountPreactGoalHub(),
    unmount: () => unmountPreactGoalHub(),
  },
  myself: {
    type: 'preact',
    mount: () => mountPreactMyself(),
    unmount: () => unmountPreactMyself(),
  },
  tasks: {
    type: 'vanilla',
    mount: () => mountVanillaWrapper('tasks'),
    unmount: () => unmountVanillaWrapper('tasks'),
  },
  calendar: {
    type: 'preact',
    mount: () => mountScreenShell('calendar', 'pg-calendar'),
    unmount: () => unmountScreenShell('calendar'),
  },
  analytics: {
    type: 'preact',
    mount: () => mountScreenShell('analytics', 'pg-analytics'),
    unmount: () => unmountScreenShell('analytics'),
  },
  settings: {
    type: 'preact',
    mount: () => mountScreenShell('settings', 'pg-settings'),
    unmount: () => unmountScreenShell('settings'),
  },
};

/**
 * 共通ルーター: 画面切替時に前画面のunmount→次画面のmountを自動実行
 * ARCH-01: goPage()から呼び出される。前画面のクリーンアップを保証
 */
export function routeToScreen(name) {
  // ARCH-09: 画面遷移時の共通UIクリーンアップ
  try { _cleanupSharedUI(); } catch (e) { console.warn('shared UI cleanup failed:', e); }

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

// ═══ Preact GoalHub（ARCH-04: GOALS画面 Preact化） ═══
let _goalHubContainer = null;

function mountPreactGoalHub() {
  const pgGoalHub = document.getElementById('pg-goal-hub');
  if (!pgGoalHub) return false;
  let host = document.getElementById('preact-goal-hub-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'preact-goal-hub-host';
    host.style.display = 'contents';
    pgGoalHub.insertBefore(host, pgGoalHub.firstChild);
  }
  _goalHubContainer = host;
  render(h(GoalHub, {}), _goalHubContainer);
  return true;
}

function unmountPreactGoalHub() {
  if (_goalHubContainer) {
    render(null, _goalHubContainer);
    _goalHubContainer = null;
  }
}

// ═══ Preact Myself（ARCH-05: ME画面 Preact化） ═══
let _myselfContainer = null;

function mountPreactMyself() {
  const pgMyself = document.getElementById('pg-myself');
  if (!pgMyself) return false;
  let host = document.getElementById('preact-myself-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'preact-myself-host';
    host.style.display = 'contents';
    pgMyself.insertBefore(host, pgMyself.firstChild);
  }
  _myselfContainer = host;
  render(h(Myself, {}), _myselfContainer);
  return true;
}

function unmountPreactMyself() {
  if (_myselfContainer) {
    render(null, _myselfContainer);
    _myselfContainer = null;
  }
}

// ═══ ScreenShell 汎用マウント（ARCH-06/07/08: 設定/カレンダー/アナリティクス） ═══
const _shellContainers = {};

function mountScreenShell(name, pgId) {
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
  _shellContainers[name] = host;
  render(h(ScreenShell, { id: `preact-${name}-root` }), host);
  return true;
}

function unmountScreenShell(name) {
  const container = _shellContainers[name];
  if (container) {
    render(null, container);
    delete _shellContainers[name];
  }
}

// ═══ ARCH-09: 共通UIクリーンアップ ═══
// 画面遷移時にモーダル/パネル/オーバーレイを閉じる
function _cleanupSharedUI() {
  // 1. サイドバーが開いていたら閉じる（closeSidebar()は既にgoPage内で呼ばれるが二重保証）
  const sb = document.getElementById('sb');
  if (sb && sb.classList.contains('open')) {
    sb.classList.remove('open');
    const ov = document.getElementById('sb-overlay');
    if (ov) ov.classList.remove('open');
    const hb = document.getElementById('hamburger-btn');
    if (hb) hb.style.display = '';
    document.body.style.overflow = '';
  }

  // 2. タスク詳細パネルが開いていたら閉じる（BUG-05防止の構造的ゲート）
  const taskPanel = document.getElementById('home-task-panel');
  if (taskPanel && taskPanel.classList.contains('open')) {
    taskPanel.classList.remove('open');
  }

  // 3. 動的モーダルオーバーレイを除去
  document.querySelectorAll('.modal-overlay, .quick-goal-toast').forEach(m => {
    try { m.remove(); } catch {}
  });

  // 4. タスク追加ステップモーダルを閉じる
  const addTask = document.getElementById('today-add-overlay');
  if (addTask && addTask.style.display !== 'none') {
    addTask.style.display = 'none';
  }

  // 5. フィードバックモーダル閉じる
  const fbModal = document.getElementById('feedback-modal');
  if (fbModal && fbModal.style.display !== 'none') {
    fbModal.style.display = 'none';
  }

  // 6. チャット履歴モーダル閉じる
  const chatHistory = document.getElementById('chat-history-modal');
  if (chatHistory && chatHistory.style.display !== 'none') {
    chatHistory.style.display = 'none';
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
  // ARCH-04: goal-hub はPreact化されたためここは未使用
  'goal-hub': () => {},
  // ARCH-05: myself はPreact化されたためここは未使用
  myself: () => {},
  tasks: () => {},
  // ARCH-06/07/08: calendar, analytics, settings はPreact化済み
};

function mountVanillaWrapper(name) {
  // Vanilla画面は既存のgoPage()ロジックで表示される
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
// グローバル公開（goPageから呼べるように）
window.mountPreactToday = mountPreactToday;
window.unmountPreactToday = unmountPreactToday;
window.isPreactTodayMounted = () => _currentMount?.name === 'today';
window.mountPreactTalk = mountPreactTalk;
window.unmountPreactTalk = unmountPreactTalk;
window.isPreactTalkMounted = () => _currentMount?.name === 'home';
window.mountPreactGoalHub = mountPreactGoalHub;
window.unmountPreactGoalHub = unmountPreactGoalHub;
window.isPreactGoalHubMounted = () => _currentMount?.name === 'goal-hub';
window.mountPreactMyself = mountPreactMyself;
window.unmountPreactMyself = unmountPreactMyself;
window.isPreactMyselfMounted = () => _currentMount?.name === 'myself';
window.isPreactScreenMounted = (name) => _currentMount?.name === name;
window.routeToScreen = routeToScreen;
// ARCH-10: HTML onclick backward compat (frontend/js/ uses goPage instead)

