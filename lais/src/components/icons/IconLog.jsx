import { useIconProps } from './iconBase.js';

/*
 * IconLog — list / book log
 */
export function IconLog(props) {
  const { theme, stroke, svg } = useIconProps('log', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <rect x="4" y="3" width="16" height="18" fill="currentColor" {...stroke} />
        <rect x="7" y="6" width="10" height="2" style={{ fill: 'var(--theme-icon-highlight)' }} />
        <rect x="7" y="10" width="10" height="2" style={{ fill: 'var(--theme-icon-highlight)' }} />
        <rect x="7" y="14" width="6" height="2" style={{ fill: 'var(--theme-icon-highlight)' }} />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <rect x="4" y="3" width="16" height="18" {...stroke} />
        <path d="M7 7 L17 7 M7 11 L17 11 M7 15 L13 15" {...stroke} />
        <circle cx="6" cy="7" r="0.5" fill="currentColor" />
        <circle cx="6" cy="11" r="0.5" fill="currentColor" />
        <circle cx="6" cy="15" r="0.5" fill="currentColor" />
      </svg>
    );
  }
  if (theme === 'totoro') {
    return (
      <svg {...svg}>
        <path d="M5 4 C 5 3, 6 3, 7 3 L 17 3 C 18 3, 19 3.5, 19 5 L 19 19 C 19 20, 18 21, 17 21 L 7 21 C 6 21, 5 20, 5 19 Z" {...stroke} />
        <path d="M8 8 L16 8 M8 12 L16 12 M8 16 L13 16" {...stroke} />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <rect x="5" y="3" width="14" height="18" rx="2" {...stroke} />
      <path d="M8 8 L16 8 M8 12 L16 12 M8 16 L13 16" {...stroke} />
    </svg>
  );
}

export default IconLog;
