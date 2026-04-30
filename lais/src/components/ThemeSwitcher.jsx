import { useId } from 'preact/hooks';
import { useTheme } from '../contexts/ThemeProvider.jsx';
import './ThemeSwitcher.css';

/*
 * ThemeSwitcher — 4 ラジオ + ミニプレビュー
 * Stage 7-1 (2026-04-27, STAGE7-1-THEME-FOUNDATION-IMPL-V1)
 *
 * S-30 Settings 内の「テーマ選択」セクションから呼び出される。
 *
 * UI:
 *   - 各テーマに対してラジオボタン
 *   - 各ラジオに対応する 40 × 80px のミニプレビュー
 *     - bg / accent / text 色見本
 *     - 各テーマのフォント例（"Aa"）
 *   - ラジオ active 時にプレビューに focus ring
 *
 * a11y:
 *   - role="radiogroup" + aria-labelledby
 *   - 各ラジオ input に視覚的非表示の input + ラベルクリックで切替
 *   - keyboard nav: Tab で group 入る → ←→ で切替（HTML ラジオ標準挙動）
 */

export function ThemeSwitcher() {
  const { theme, setTheme, themes } = useTheme();
  const groupLabelId = useId();
  const groupName = useId();

  return (
    <section
      class="lais-theme-switcher"
      role="radiogroup"
      aria-labelledby={groupLabelId}
    >
      <h3 id={groupLabelId} class="lais-theme-switcher-label">
        テーマ選択
      </h3>
      <p class="lais-theme-switcher-help">
        4 種類の見た目から選べます。設定はこの端末に保存されます。
      </p>

      <ul class="lais-theme-switcher-list">
        {themes.map((t) => {
          const inputId = `${groupName}-${t.id}`;
          const isChecked = theme === t.id;
          return (
            <li key={t.id} class="lais-theme-switcher-item">
              <input
                type="radio"
                class="lais-theme-switcher-input"
                id={inputId}
                name={groupName}
                value={t.id}
                checked={isChecked}
                onChange={() => setTheme(t.id)}
              />
              <label
                for={inputId}
                class={
                  'lais-theme-switcher-card' +
                  (isChecked ? ' lais-theme-switcher-card-active' : '')
                }
              >
                <span
                  class="lais-theme-switcher-preview"
                  aria-hidden="true"
                  style={{
                    background: t.preview.bg,
                    color: t.preview.text,
                    borderColor: t.preview.accent,
                  }}
                >
                  <span
                    class="lais-theme-switcher-preview-accent"
                    style={{ background: t.preview.accent }}
                  />
                  <span
                    class="lais-theme-switcher-preview-glyph"
                    style={{ fontFamily: previewFontFamily(t.id) }}
                  >
                    Aa
                  </span>
                </span>
                <span class="lais-theme-switcher-text">
                  <span class="lais-theme-switcher-name">{t.label}</span>
                  <span class="lais-theme-switcher-desc">{t.description}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Per-theme preview font (rendered with system fallbacks if the
 * web font is not loaded in the host page).
 */
function previewFontFamily(themeId) {
  switch (themeId) {
    case 'apple':
      return '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';
    case 'totoro':
      return '"Yu Gothic Medium", "Yu Gothic", "Hiragino Maru Gothic ProN", sans-serif';
    case 'dq':
      return '"Press Start 2P", "DotGothic16", monospace';
    case 'cyberpunk':
      return '"Orbitron", "VT323", "Bebas Neue", monospace';
    default:
      return 'inherit';
  }
}

export default ThemeSwitcher;
