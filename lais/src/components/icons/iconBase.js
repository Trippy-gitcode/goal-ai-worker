/*
 * Lais Icon Base — Stage 7-2 (STAGE7-2-EMOJI-TO-SVG-V1, 2026-04-27)
 *
 * 役割:
 *   - 30 種オリジナル SVG アイコンの共通プロパティ・テーマ別 stroke 等の生成ヘルパ。
 *   - 4 テーマ (apple / totoro / dq / cyberpunk) ごとに視覚言語を切替える。
 *
 * テーマ別ビジュアル方針 (themes.css `--theme-icon-set` と整合):
 *   - apple     (sf-symbols)    : line / stroke 1.6 / round caps / fill: none
 *   - totoro    (leaf-line)     : hand-drawn / stroke 1.8 / round caps / 葉装飾
 *   - dq        (pixel-8bit)    : 太線 stroke 2.5 / square caps / fill 主体
 *   - cyberpunk (neon-tactical) : HUD wireframe / stroke 1.4 / sharp caps / glow CSS
 *
 * 使い方:
 *   import { IconHome } from './icons/IconHome.jsx';
 *   <IconHome size={20} />
 *   props: size? (number) / class? (string) / 'aria-label'? (string) /
 *          decorative? (bool, default true)
 *
 * テーマ切替:
 *   - currentColor を stroke / fill に使用 → 親 CSS の color から継承される
 *   - data-theme="dq"      の時は stroke-width 2.5 + stroke-linecap square + 一部 fill
 *   - data-theme="cyberpunk" の時は stroke-width 1.4 + filter: drop-shadow (CSS)
 *   - data-theme="totoro"  の時は stroke-width 1.8 + 葉装飾はコンポーネント内 path で
 */

import { useTheme } from '../../contexts/ThemeProvider.jsx';

/**
 * 4 テーマに応じて stroke-width / linecap / linejoin を返す。
 * dq は太線+sharp、cyberpunk は細線+sharp、totoro は中太+round、apple は細+round。
 */
export function getIconStrokeProps(theme) {
  switch (theme) {
    case 'dq':
      return { strokeWidth: 2.5, strokeLinecap: 'square', strokeLinejoin: 'miter' };
    case 'cyberpunk':
      return { strokeWidth: 1.4, strokeLinecap: 'square', strokeLinejoin: 'miter' };
    case 'totoro':
      return { strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
    case 'apple':
    default:
      return { strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  }
}

/**
 * 共通の SVG ラッパ props を返す。
 *   - decorative=true → aria-hidden / focusable=false
 *   - decorative=false + label → role="img" / aria-label
 */
export function getSvgProps({ size = 20, className = '', label, decorative = true, dataIcon }) {
  if (decorative || !label) {
    return {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      class: 'lais-icon ' + (className || ''),
      'aria-hidden': 'true',
      focusable: 'false',
      'data-icon': dataIcon,
    };
  }
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    class: 'lais-icon ' + (className || ''),
    role: 'img',
    'aria-label': label,
    'data-icon': dataIcon,
  };
}

/**
 * useTheme() を呼び、stroke props と svg props をまとめて返すフック。
 * ThemeProvider 外（Storybook 直 mount 等）でも安全に default = apple で動く。
 */
export function useIconProps(name, props = {}) {
  const ctx = useTheme();
  const theme = (ctx && ctx.theme) || 'apple';
  const stroke = getIconStrokeProps(theme);
  const svg = getSvgProps({ ...props, dataIcon: name });
  return { theme, stroke, svg };
}
