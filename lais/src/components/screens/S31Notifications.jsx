import { useState, useCallback } from 'preact/hooks';
import { route } from 'preact-router';
import { BottomTabBar } from '../shared/BottomTabBar.jsx';
import './S31Notifications.css';

/*
 * S-31 Notifications — 通知設定画面 (Stage 7-3 新設)
 * po_expectations_v1.md §8.5 準拠
 *
 * Given: S-30 から「通知」タップ
 * When : 通知種別 ON/OFF 切替
 * Then : タスクフォローアップ (A5)・LINE アラート (F2) 設定保存
 *
 * Stage 7-3 (2026-04-28, STAGE-7-3-THEME-APPLY-21-SCREENS):
 *   - 4 テーマ (apple / totoro / dq / cyberpunk) 全部で AA contrast 担保
 *   - ハードコード色なし、全 var(--theme-color-*) / var(--theme-radius-*) で表現
 */

const NOTIFICATION_PREFS = [
  {
    id: 'task-followup',
    label: 'タスクフォローアップ',
    description: 'タスク期限前後に通知 (A5 連動)',
    defaultOn: true,
  },
  {
    id: 'line-alert',
    label: 'LINE アラート',
    description: '重要通知を LINE で受信 (F2 連動)',
    defaultOn: false,
  },
  {
    id: 'goal-progress',
    label: '目標進捗ダイジェスト',
    description: '週次で目標達成度をまとめ送信',
    defaultOn: true,
  },
  {
    id: 'ai-tips',
    label: 'AI コーチング Tips',
    description: 'パーソナル提案の通知',
    defaultOn: false,
  },
];

export function S31Notifications() {
  const [prefs, setPrefs] = useState(() => {
    const init = {};
    for (const p of NOTIFICATION_PREFS) init[p.id] = p.defaultOn;
    return init;
  });

  const togglePref = useCallback((id) => {
    setPrefs((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleBack = useCallback(() => {
    route('/me', true);
  }, []);

  return (
    <main id="main-content" class="s31-notifications" aria-labelledby="s31-title" data-testid="s31-root">
      <header class="s31-header">
        <button type="button" class="s31-back" onClick={handleBack} aria-label="戻る">
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false">
            <path d="M 13 4 L 7 10 L 13 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <h1 id="s31-title" class="s31-title">通知設定</h1>
      </header>

      <section class="s31-list" aria-label="通知種別">
        {NOTIFICATION_PREFS.map((p) => (
          <label key={p.id} class="s31-row" data-testid={`s31-toggle-${p.id}`}>
            <span class="s31-row-text">
              <span class="s31-row-label">{p.label}</span>
              <span class="s31-row-desc">{p.description}</span>
            </span>
            <input
              type="checkbox"
              class="s31-toggle"
              checked={prefs[p.id]}
              onChange={() => togglePref(p.id)}
              aria-label={`${p.label} 切替`}
            />
          </label>
        ))}
      </section>

      <BottomTabBar active="me" onSelect={(id) => route('/' + (id === 'grow' ? 'grow' : id === 'talk' ? 'talk' : 'me'))} />
    </main>
  );
}

export default S31Notifications;
