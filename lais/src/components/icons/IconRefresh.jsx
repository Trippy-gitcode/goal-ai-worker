import { useIconProps } from './iconBase.js';

/*
 * IconRefresh — 🔄 replacement (reload)
 */
export function IconRefresh(props) {
  const { theme, stroke, svg } = useIconProps('refresh', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <path d="M4 12 C 4 7, 7 4, 12 4 C 15 4, 18 6, 19 9" {...stroke} />
        <path d="M16 9 L20 9 L20 5" fill="currentColor" {...stroke} />
        <path d="M20 12 C 20 17, 17 20, 12 20 C 9 20, 6 18, 5 15" {...stroke} />
        <path d="M8 15 L4 15 L4 19" fill="currentColor" {...stroke} />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <path d="M4 12 C 4 7, 7 4, 12 4 C 15 4, 18 6, 19 9" {...stroke} />
        <path d="M16 9 L20 9 L20 5" {...stroke} />
        <path d="M20 12 C 20 17, 17 20, 12 20 C 9 20, 6 18, 5 15" {...stroke} />
        <path d="M8 15 L4 15 L4 19" {...stroke} />
        <path d="M3 12 L21 12" stroke="currentColor" stroke-width="0.4" stroke-dasharray="1 2" />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <path d="M4 12 C 4 7, 7 4, 12 4 C 15 4, 18 6, 19 9" {...stroke} />
      <path d="M16 9 L20 9 L20 5" {...stroke} />
      <path d="M20 12 C 20 17, 17 20, 12 20 C 9 20, 6 18, 5 15" {...stroke} />
      <path d="M8 15 L4 15 L4 19" {...stroke} />
    </svg>
  );
}

export default IconRefresh;
