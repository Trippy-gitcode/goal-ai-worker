import { useIconProps } from './iconBase.js';

/*
 * IconBookmark — 🔖 replacement
 */
export function IconBookmark(props) {
  const { theme, stroke, svg } = useIconProps('bookmark', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <path d="M6 3 L18 3 L18 21 L12 16 L6 21 Z" fill="currentColor" {...stroke} />
        <rect x="10" y="6" width="4" height="2" style={{ fill: 'var(--theme-icon-highlight)' }} />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <path d="M6 3 L18 3 L18 21 L12 16 L6 21 Z" {...stroke} />
        <path d="M9 8 L15 8" stroke="currentColor" stroke-width="0.5" stroke-dasharray="1 1" />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <path d="M6 3 L18 3 L18 21 L12 16 L6 21 Z" {...stroke} />
    </svg>
  );
}

export default IconBookmark;
