import { useIconProps } from './iconBase.js';

/*
 * IconMe — user portrait
 */
export function IconMe(props) {
  const { theme, stroke, svg } = useIconProps('me', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <rect x="8" y="4" width="8" height="8" fill="currentColor" />
        <rect x="5" y="14" width="14" height="7" fill="currentColor" />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <circle cx="12" cy="8" r="4" {...stroke} />
        <path d="M4 21 C 4 16, 7.5 13.5, 12 13.5 C 16.5 13.5, 20 16, 20 21" {...stroke} />
        <path d="M8 8 L16 8" stroke="currentColor" stroke-width="0.5" stroke-dasharray="1 1" />
      </svg>
    );
  }
  if (theme === 'totoro') {
    return (
      <svg {...svg}>
        <circle cx="12" cy="8" r="4" {...stroke} />
        <path d="M4 21 C 4 16, 7.5 13.5, 12 13.5 C 16.5 13.5, 20 16, 20 21" {...stroke} />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <circle cx="12" cy="8" r="4" {...stroke} />
      <path d="M4 21 C 4 16, 7.5 13.5, 12 13.5 C 16.5 13.5, 20 16, 20 21" {...stroke} />
    </svg>
  );
}

export default IconMe;
