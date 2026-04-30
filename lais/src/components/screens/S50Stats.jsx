import { useState, useCallback, useMemo } from 'preact/hooks';
import { route } from 'preact-router';
import { BottomTabBar } from '../shared/BottomTabBar.jsx';
import './S50Stats.css';

/*
 * S-50 Stats — 統計・振り返り画面 (Stage 7-3 新設)
 * po_expectations_v1.md §8.11 準拠
 *
 * Given: BottomTabBar から「統計」タップ
 * When : 月別目標達成率 + タスク完了数 + AI 対話頻度グラフ
 * Then : 月切替で過去データ表示
 */

function getMonthLabel(offsetMonths) {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() - offsetMonths, 1);
  return `${target.getFullYear()}年${target.getMonth() + 1}月`;
}

function pseudoRandomBars(seed, count) {
  // テーマ間で同一なダミー値を返すため、決定論的な疑似乱数。
  const out = [];
  let state = seed;
  for (let i = 0; i < count; i++) {
    state = (state * 9301 + 49297) % 233280;
    out.push(20 + (state % 80));
  }
  return out;
}

export function S50Stats() {
  const [monthOffset, setMonthOffset] = useState(0);
  const monthLabel = useMemo(() => getMonthLabel(monthOffset), [monthOffset]);
  const bars = useMemo(() => pseudoRandomBars(1 + monthOffset, 7), [monthOffset]);

  const handlePrev = useCallback(() => setMonthOffset((m) => m + 1), []);
  const handleNext = useCallback(() => setMonthOffset((m) => Math.max(0, m - 1)), []);
  const handleTab = useCallback((id) => {
    route('/' + (id === 'grow' ? 'grow' : id === 'talk' ? 'talk' : 'me'));
  }, []);

  return (
    <main id="main-content" class="s50-stats" aria-labelledby="s50-title" data-testid="s50-root">
      <header class="s50-header">
        <h1 id="s50-title" class="s50-title">統計</h1>
        <div class="s50-month-nav">
          <button type="button" class="s50-month-btn" onClick={handlePrev} aria-label="前月">
            <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
              <path d="M 13 4 L 7 10 L 13 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <span class="s50-month-label">{monthLabel}</span>
          <button
            type="button"
            class="s50-month-btn"
            onClick={handleNext}
            disabled={monthOffset === 0}
            aria-label="翌月"
          >
            <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
              <path d="M 7 4 L 13 10 L 7 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </header>

      <section class="s50-cards">
        <article class="s50-card">
          <p class="s50-card-label">目標達成率</p>
          <p class="s50-card-value">68%</p>
        </article>
        <article class="s50-card">
          <p class="s50-card-label">タスク完了数</p>
          <p class="s50-card-value">42</p>
        </article>
        <article class="s50-card">
          <p class="s50-card-label">AI 対話回数</p>
          <p class="s50-card-value">17</p>
        </article>
      </section>

      <section class="s50-chart" data-testid="s50-monthly-chart" aria-label="月別グラフ">
        <h2 class="s50-section-title">週別タスク完了</h2>
        <div class="s50-bars">
          {bars.map((h, i) => (
            <span
              key={i}
              class="s50-bar"
              style={{ height: `${h}%` }}
              aria-label={`第${i + 1}週: ${h}`}
            />
          ))}
        </div>
      </section>

      <BottomTabBar active="grow" onSelect={handleTab} />
    </main>
  );
}

export default S50Stats;
