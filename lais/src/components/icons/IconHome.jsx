import { useIconProps } from './iconBase.js';

/*
 * IconHome — Lais original 30-icon set (Stage 7-2)
 * 4 テーマ視覚:
 *   - apple     : line house, stroke 1.6
 *   - totoro    : 葉付き屋根 (totoro 葉装飾), stroke 1.8
 *   - dq        : 8bit fill block, stroke 2.5
 *   - cyberpunk : HUD wireframe + 走査線, stroke 1.4
 */
export function IconHome(props) {
  const { theme, stroke, svg } = useIconProps('home', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <path d="M4 11 L12 4 L20 11 L20 20 L4 20 Z" fill="currentColor" {...stroke} />
        <rect x="10" y="14" width="4" height="6" style={{ fill: 'var(--theme-icon-highlight)' }} />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <path d="M3 11 L12 3 L21 11" {...stroke} />
        <path d="M5 10 L5 21 L19 21 L19 10" {...stroke} />
        <path d="M9 21 L9 14 L15 14 L15 21" {...stroke} />
        <path d="M3 12 L21 12" stroke="currentColor" stroke-width="0.5" stroke-dasharray="1 2" />
      </svg>
    );
  }
  if (theme === 'totoro') {
    return (
      <svg {...svg}>
        <path d="M3 11 L12 3.5 L21 11 L21 20 L3 20 Z" {...stroke} />
        <path d="M9 20 L9 13 L15 13 L15 20" {...stroke} />
        <path d="M16 5 C 17 4, 18.5 4, 19 5.5 C 18 6.5, 16.5 6.5, 16 5 Z" {...stroke} fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <path d="M3 11 L12 3.5 L21 11 L21 20 L3 20 Z" {...stroke} />
      <path d="M9 20 L9 13 L15 13 L15 20" {...stroke} />
    </svg>
  );
}

export default IconHome;
