import { useState, useCallback } from 'preact/hooks';
import { route } from 'preact-router';
import { BottomTabBar } from '../shared/BottomTabBar.jsx';
import './S11DiaryLog.css';

/*
 * S-11 DiaryLog — 日記ログ画面 (Stage 7-3 新設)
 * po_expectations_v1.md §7.479 (検討中) + Q7「日記入力」対応
 *
 * Given: BottomTabBar の中央タブ (LOG) タップ
 * When : 日記入力フォーム + 過去エントリ一覧表示
 * Then : 入力 → 保存 → 一覧に追加
 */

export function S11DiaryLog() {
  const [entry, setEntry] = useState('');
  const [entries, setEntries] = useState([]);

  const handleSave = useCallback(() => {
    if (!entry.trim()) return;
    const now = new Date().toISOString();
    setEntries((prev) => [{ id: now, text: entry, createdAt: now }, ...prev]);
    setEntry('');
  }, [entry]);

  const handleTab = useCallback((id) => {
    route('/' + (id === 'grow' ? 'grow' : id === 'talk' ? 'talk' : 'me'));
  }, []);

  return (
    <main id="main-content" class="s11-diary" aria-labelledby="s11-title" data-testid="s11-root">
      <header class="s11-header">
        <h1 id="s11-title" class="s11-title">日記</h1>
        <p class="s11-subtitle">今日の気持ちを書き留めよう</p>
      </header>

      <section class="s11-input-section">
        <textarea
          class="s11-input"
          placeholder="今日あったこと、感じたこと..."
          value={entry}
          onInput={(e) => setEntry(e.target instanceof HTMLTextAreaElement ? e.target.value : '')}
          rows={4}
          aria-label="日記入力"
        />
        <button
          type="button"
          class="s11-save"
          onClick={handleSave}
          disabled={!entry.trim()}
        >
          保存
        </button>
      </section>

      <section class="s11-entries" aria-label="過去のエントリ">
        {entries.length === 0 && <p class="s11-empty">まだエントリがありません</p>}
        {entries.map((e) => (
          <article key={e.id} class="s11-entry-card">
            <p class="s11-entry-date">{new Date(e.createdAt).toLocaleString('ja-JP')}</p>
            <p class="s11-entry-text">{e.text}</p>
          </article>
        ))}
      </section>

      <BottomTabBar active="grow" onSelect={handleTab} />
    </main>
  );
}

export default S11DiaryLog;
