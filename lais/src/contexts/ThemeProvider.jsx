import { createContext } from 'preact';
import { useCallback, useContext, useEffect, useMemo, useState } from 'preact/hooks';

/*
 * Lais ThemeProvider
 * Stage 7-1 (2026-04-27, STAGE7-1-THEME-FOUNDATION-IMPL-V1)
 *
 * 役割:
 *   - 4 テーマ (apple / totoro / dq / cyberpunk) の現在値を React (preact) Context で配信
 *   - <html data-theme="..."> 属性を切替え
 *   - localStorage `lais_theme` に永続化
 *   - Supabase 永続化 hook の interface（onPersist）を Stage 7-3 連携用に開けておく。
 *     本 Stage では interface のみ、実装は Stage 7-3 PD で別途。
 *
 * FOUC 防止:
 *   - index.html の <head> 内 inline script が初回ペイント前に
 *     localStorage から data-theme を復元する。本 Provider はマウント後に再確認のみ。
 *
 * 使用例:
 *   import { ThemeProvider, useTheme } from './contexts/ThemeProvider.jsx';
 *
 *   function App() {
 *     return (
 *       <ThemeProvider>
 *         <Router>...</Router>
 *       </ThemeProvider>
 *     );
 *   }
 *
 *   function ThemeSwitcher() {
 *     const { theme, setTheme, themes } = useTheme();
 *     return themes.map(t => (
 *       <button onClick={() => setTheme(t.id)}>{t.label}</button>
 *     ));
 *   }
 */

export const THEME_STORAGE_KEY = 'lais_theme';

export const THEMES = Object.freeze([
  Object.freeze({
    id: 'apple',
    label: 'Apple',
    description: 'Apple HIG 準拠 — System Blue + SF Pro + iOS 標準モーション',
    preview: { bg: '#ffffff', accent: '#007aff', text: '#1c1c1e', font: 'SF Pro' },
  }),
  Object.freeze({
    id: 'totoro',
    label: 'となりのトトロ',
    description: '暖色 + Yu Gothic + 葉っぱ装飾 + ジブリ余韻モーション',
    preview: { bg: '#fafaf7', accent: '#5a9e3a', text: '#2b3a25', font: 'Yu Gothic' },
  }),
  Object.freeze({
    id: 'dq',
    label: 'ドラゴンクエスト',
    description: '8bit ピクセル + Press Start 2P + DQ window + 即応モーション',
    preview: { bg: '#2c2c54', accent: '#4060c0', text: '#fffce8', font: 'Press Start 2P' },
  }),
  Object.freeze({
    id: 'cyberpunk',
    label: 'サイバーパンク',
    description: 'ネオン + Orbitron + 黄+紫+シアン + glitch トランジション',
    preview: { bg: '#0a0a0a', accent: '#fcee0a', text: '#e8e8ed', font: 'Orbitron' },
  }),
]);

export const DEFAULT_THEME = 'apple';

const VALID_THEME_IDS = THEMES.map((t) => t.id);

function isValidTheme(id) {
  return typeof id === 'string' && VALID_THEME_IDS.includes(id);
}

/**
 * Read the persisted theme from localStorage. Falls back to DEFAULT_THEME.
 * Safe against SSR / Safari private mode (try/catch).
 */
function readPersistedTheme() {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isValidTheme(saved)) return saved;
  } catch (_) {
    /* localStorage unavailable (Safari private mode etc.) — silent fallback */
  }
  // FOUC bootstrap may have already set <html data-theme>; honor it if valid.
  if (typeof document !== 'undefined') {
    const fromDom = document.documentElement.getAttribute('data-theme');
    if (isValidTheme(fromDom)) return fromDom;
  }
  return DEFAULT_THEME;
}

/**
 * Write the theme to localStorage. Silent on failure.
 */
function writePersistedTheme(themeId) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch (_) {
    /* silent — localStorage may be unavailable */
  }
}

/**
 * Apply a theme id to <html data-theme>. No-op outside browser.
 */
function applyThemeToDom(themeId) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', themeId);
}

const ThemeContext = createContext({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  themes: THEMES,
});

/**
 * <ThemeProvider> — wraps the app and provides theme state via context.
 *
 * Props:
 *   - onPersist?: (themeId: string) => Promise<void> | void
 *       Stage 7-3 で Supabase profile.theme_preference 連携時に注入する hook。
 *       現状は呼び出されるだけで何もしない optional callback。
 */
export function ThemeProvider({ children, onPersist }) {
  const [theme, setThemeState] = useState(() => readPersistedTheme());

  // Mount: ensure DOM is in sync with state (in case FOUC bootstrap missed).
  useEffect(() => {
    applyThemeToDom(theme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount

  const setTheme = useCallback(
    (next) => {
      if (!isValidTheme(next)) {
        // eslint-disable-next-line no-console
        console.warn(`[ThemeProvider] invalid theme id "${next}" (allowed: ${VALID_THEME_IDS.join(', ')})`);
        return;
      }
      setThemeState(next);
      applyThemeToDom(next);
      writePersistedTheme(next);
      // Stage 7-3 で Supabase 永続化 hook が注入される
      if (typeof onPersist === 'function') {
        try {
          const result = onPersist(next);
          if (result && typeof result.then === 'function') {
            result.catch((err) => {
              // eslint-disable-next-line no-console
              console.warn('[ThemeProvider] onPersist rejected:', err && err.message);
            });
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[ThemeProvider] onPersist threw:', err && err.message);
        }
      }
    },
    [onPersist]
  );

  const value = useMemo(
    () => ({ theme, setTheme, themes: THEMES }),
    [theme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * useTheme() — read the current theme + setter from context.
 *
 * Returns:
 *   { theme: 'apple'|'totoro'|'dq'|'cyberpunk', setTheme: (id) => void, themes: THEMES }
 */
export function useTheme() {
  return useContext(ThemeContext);
}

export default ThemeProvider;
