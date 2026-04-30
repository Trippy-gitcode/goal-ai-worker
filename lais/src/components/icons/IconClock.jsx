import { useIconProps } from './iconBase.js';

/*
 * IconClock — time / duration
 */
export function IconClock(props) {
  const { theme, stroke, svg } = useIconProps('clock', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <rect x="4" y="4" width="16" height="16" fill="currentColor" {...stroke} />
        <rect x="6" y="6" width="12" height="12" style={{ fill: 'var(--theme-icon-highlight)' }} />
        <rect x="11" y="8" width="2" height="5" fill="currentColor" />
        <rect x="11" y="11" width="5" height="2" fill="currentColor" />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <circle cx="12" cy="12" r="9" {...stroke} />
        <path d="M12 7 L12 12 L16 14" {...stroke} />
        <circle cx="12" cy="12" r="0.6" fill="currentColor" />
        <path d="M3 12 L4 12 M20 12 L21 12 M12 3 L12 4 M12 20 L12 21" {...stroke} />
      </svg>
    );
  }
  if (theme === 'totoro') {
    return (
      <svg {...svg}>
        <circle cx="12" cy="12" r="9" {...stroke} />
        <path d="M12 7 L12 12 L16 14" {...stroke} />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="9" {...stroke} />
      <path d="M12 7 L12 12 L16 14" {...stroke} />
    </svg>
  );
}

export default IconClock;
