import { useIconProps } from './iconBase.js';

/*
 * IconBell — notification
 */
export function IconBell(props) {
  const { theme, stroke, svg } = useIconProps('bell', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <path d="M6 18 L18 18 L18 11 C 18 7, 15 4, 12 4 C 9 4, 6 7, 6 11 Z" fill="currentColor" {...stroke} />
        <rect x="11" y="20" width="2" height="2" fill="currentColor" />
        <rect x="9" y="20" width="6" height="1" style={{ fill: 'var(--theme-icon-highlight)' }} />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <path d="M6 17 L18 17 C 17 16, 17 15, 17 11 C 17 7, 14.5 5, 12 5 C 9.5 5, 7 7, 7 11 C 7 15, 7 16, 6 17 Z" {...stroke} />
        <path d="M10 20 C 10 21, 11 21.5, 12 21.5 C 13 21.5, 14 21, 14 20" {...stroke} />
        <path d="M3 12 L21 12" stroke="currentColor" stroke-width="0.4" stroke-dasharray="1 2" />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <path d="M6 17 L18 17 C 17 16, 17 15, 17 11 C 17 7, 14.5 5, 12 5 C 9.5 5, 7 7, 7 11 C 7 15, 7 16, 6 17 Z" {...stroke} />
      <path d="M10 20 C 10 21, 11 21.5, 12 21.5 C 13 21.5, 14 21, 14 20" {...stroke} />
    </svg>
  );
}

export default IconBell;
