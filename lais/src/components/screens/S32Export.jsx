import { useState, useCallback } from 'preact/hooks';
import { route } from 'preact-router';
import { BottomTabBar } from '../shared/BottomTabBar.jsx';
import './S32Export.css';

/*
 * S-32 Export — データエクスポート画面 (Stage 7-3 新設)
 * po_expectations_v1.md §8.6 準拠
 *
 * Given: S-30 から「エクスポート」タップ
 * When : データ種別 7 件 + 形式選択
 * Then : ダウンロード生成 (JSON/CSV/PDF)
 */

const DATA_TYPES = [
  { id: 'goals', label: '目標' },
  { id: 'tasks', label: 'タスク' },
  { id: 'chat', label: 'AI 対話' },
  { id: 'diary', label: '日記' },
  { id: 'profile', label: 'プロフィール' },
  { id: 'mbti', label: 'MBTI 推定' },
  { id: 'stats', label: '統計' },
];

const FORMATS = [
  { id: 'json', label: 'JSON' },
  { id: 'csv', label: 'CSV' },
  { id: 'pdf', label: 'PDF' },
];

export function S32Export() {
  const [selectedTypes, setSelectedTypes] = useState(() => new Set(['goals', 'tasks']));
  const [format, setFormat] = useState('json');

  const toggleType = useCallback((id) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBack = useCallback(() => {
    route('/me', true);
  }, []);

  const handleExport = useCallback(() => {
    // C4: 個人情報マスキング → ダウンロード生成 (本実装は後続フェーズ)
    // eslint-disable-next-line no-console
    console.log('[S32] export', { types: [...selectedTypes], format });
  }, [selectedTypes, format]);

  return (
    <main id="main-content" class="s32-export" aria-labelledby="s32-title" data-testid="s32-root">
      <header class="s32-header">
        <button type="button" class="s32-back" onClick={handleBack} aria-label="戻る">
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false">
            <path d="M 13 4 L 7 10 L 13 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <h1 id="s32-title" class="s32-title">エクスポート</h1>
      </header>

      <section class="s32-section" aria-label="データ種別">
        <h2 class="s32-section-title">データ種別</h2>
        <div class="s32-type-grid">
          {DATA_TYPES.map((t) => (
            <label key={t.id} class="s32-type-pill" data-testid={`s32-type-${t.id}`}>
              <input
                type="checkbox"
                checked={selectedTypes.has(t.id)}
                onChange={() => toggleType(t.id)}
                class="s32-type-checkbox"
              />
              <span class="s32-type-label">{t.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section class="s32-section" aria-label="形式">
        <h2 class="s32-section-title">形式</h2>
        <div class="s32-format-row" role="radiogroup">
          {FORMATS.map((f) => (
            <label key={f.id} class="s32-format-pill" data-testid={`s32-format-${f.id}`}>
              <input
                type="radio"
                name="export-format"
                value={f.id}
                checked={format === f.id}
                onChange={() => setFormat(f.id)}
                class="s32-format-radio"
              />
              <span class="s32-format-label">{f.label}</span>
            </label>
          ))}
        </div>
      </section>

      <button
        type="button"
        class="s32-cta"
        onClick={handleExport}
        disabled={selectedTypes.size === 0}
        data-testid="s32-export-btn"
      >
        エクスポート
      </button>

      <BottomTabBar active="me" onSelect={(id) => route('/' + (id === 'grow' ? 'grow' : id === 'talk' ? 'talk' : 'me'))} />
    </main>
  );
}

export default S32Export;
