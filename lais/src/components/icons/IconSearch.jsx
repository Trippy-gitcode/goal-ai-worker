import { useIconProps } from './iconBase.js';

/*
 * IconSearch — magnifier
 */
export function IconSearch(props) {
  const { theme, stroke, svg } = useIconProps('search', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <rect x="4" y="4" width="12" height="12" fill="none" {...stroke} />
        <rect x="6" y="6" width="8" height="8" fill="currentColor" />
        <rect x="8" y="8" width="4" height="4" style={{ fill: 'var(--theme-icon-highlight)' }} />
        <rect x="15" y="15" width="2" height="2" fill="currentColor" />
        <rect x="17" y="17" width="2" height="2" fill="currentColor" />
        <rect x="19" y="19" width="2" height="2" fill="currentColor" />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <circle cx="11" cy="11" r="6" {...stroke} />
        <path d="M16 16 L21 21" {...stroke} />
        <path d="M8 11 L14 11 M11 8 L11 14" stroke="currentColor" stroke-width="0.6" />
      </svg>
    );
  }
  if (theme === 'totoro') {
    return (
      <svg {...svg}>
        <circle cx="11" cy="11" r="6" {...stroke} />
        <path d="M16 16 L21 21" {...stroke} />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <circle cx="11" cy="11" r="6" {...stroke} />
      <path d="M16 16 L21 21" {...stroke} />
    </svg>
  );
}

export default IconSearch;
