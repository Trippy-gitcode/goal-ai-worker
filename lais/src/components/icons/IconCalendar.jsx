import { useIconProps } from './iconBase.js';

/*
 * IconCalendar — date pick
 */
export function IconCalendar(props) {
  const { theme, stroke, svg } = useIconProps('calendar', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <rect x="3" y="5" width="18" height="16" fill="currentColor" {...stroke} />
        <rect x="5" y="9" width="14" height="10" style={{ fill: 'var(--theme-icon-highlight)' }} />
        <rect x="7" y="3" width="2" height="4" fill="currentColor" />
        <rect x="15" y="3" width="2" height="4" fill="currentColor" />
        <rect x="8" y="11" width="2" height="2" fill="currentColor" />
        <rect x="12" y="11" width="2" height="2" fill="currentColor" />
        <rect x="16" y="11" width="2" height="2" fill="currentColor" />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <rect x="3" y="5" width="18" height="16" {...stroke} />
        <path d="M3 9 L21 9" {...stroke} />
        <path d="M8 3 L8 7 M16 3 L16 7" {...stroke} />
        <circle cx="8" cy="13" r="0.5" fill="currentColor" />
        <circle cx="12" cy="13" r="0.5" fill="currentColor" />
        <circle cx="16" cy="13" r="0.5" fill="currentColor" />
      </svg>
    );
  }
  if (theme === 'totoro') {
    return (
      <svg {...svg}>
        <path d="M5 5 C 5 4, 5.5 3.5, 6.5 3.5 L 17.5 3.5 C 18.5 3.5, 19 4, 19 5 L 19 19 C 19 20, 18.5 20.5, 17.5 20.5 L 6.5 20.5 C 5.5 20.5, 5 20, 5 19 Z" {...stroke} />
        <path d="M5 9 L19 9" {...stroke} />
        <path d="M9 11.5 L11 13 L15 9.5" {...stroke} />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" {...stroke} />
      <path d="M3.5 9 L20.5 9" {...stroke} />
      <path d="M8 3 L8 7 M16 3 L16 7" {...stroke} />
    </svg>
  );
}

export default IconCalendar;
