import { useState, useCallback } from 'preact/hooks';
import { route } from 'preact-router';
import { BottomTabBar } from '../shared/BottomTabBar.jsx';
import './S60Search.css';

/*
 * S-60 Search — pgvector ベクトル検索画面 (Stage 7-3 新設)
 * po_expectations_v1.md §8.12 準拠
 *
 * Given: BottomTabBar から「検索」タップ
 * When : クエリ入力 + Enter
 * Then : タスク + 目標 + AI 対話 + 日記の意味検索結果表示
 */

const RESULT_KIND_LABEL = {
  task: 'タスク',
  goal: '目標',
  chat: 'AI 対話',
  diary: '日記',
};

export function S60Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    // pgvector 連動は後続フェーズ。現在はダミー結果。
    setTimeout(() => {
      setResults([
        { id: 'r1', kind: 'task', title: `"${query}" に関連するタスク`, snippet: 'マッチしたタスクの抜粋' },
        { id: 'r2', kind: 'goal', title: `"${query}" に関連する目標`, snippet: 'マッチした目標の抜粋' },
        { id: 'r3', kind: 'chat', title: `"${query}" に関連する対話`, snippet: 'マッチしたチャット履歴の抜粋' },
        { id: 'r4', kind: 'diary', title: `"${query}" に関連する日記`, snippet: '日記エントリの抜粋' },
      ]);
      setLoading(false);
    }, 200);
  }, [query]);

  const handleTab = useCallback((id) => {
    route('/' + (id === 'grow' ? 'grow' : id === 'talk' ? 'talk' : 'me'));
  }, []);

  return (
    <main id="main-content" class="s60-search" aria-labelledby="s60-title" data-testid="s60-root">
      <header class="s60-header">
        <h1 id="s60-title" class="s60-title">検索</h1>
        <form class="s60-form" onSubmit={handleSubmit}>
          <input
            type="search"
            class="s60-input"
            placeholder="目標・タスク・対話を検索"
            value={query}
            onInput={(e) => setQuery(e.target instanceof HTMLInputElement ? e.target.value : '')}
            aria-label="検索クエリ"
          />
          <button type="submit" class="s60-submit" disabled={!query.trim() || loading}>
            検索
          </button>
        </form>
      </header>

      <section class="s60-results" data-testid="s60-results" aria-live="polite">
        {loading && <p class="s60-loading">検索中...</p>}
        {!loading && results.length === 0 && (
          <p class="s60-empty">クエリを入力してください。</p>
        )}
        {!loading && results.map((r) => (
          <article key={r.id} class="s60-result-card">
            <span class={'s60-result-kind s60-result-kind-' + r.kind}>{RESULT_KIND_LABEL[r.kind]}</span>
            <h3 class="s60-result-title">{r.title}</h3>
            <p class="s60-result-snippet">{r.snippet}</p>
          </article>
        ))}
      </section>

      <BottomTabBar active="grow" onSelect={handleTab} />
    </main>
  );
}

export default S60Search;
