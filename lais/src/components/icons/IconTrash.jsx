import { useIconProps } from './iconBase.js';

/*
 * IconTrash — delete / 🗑 replacement
 */
export function IconTrash(props) {
  const { theme, stroke, svg } = useIconProps('trash', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <rect x="5" y="6" width="14" height="2" fill="currentColor" />
        <rect x="5" y="9" width="14" height="12" fill="currentColor" {...stroke} />
        <rect x="9" y="3" width="6" height="3" fill="currentColor" />
        <rect x="8" y="12" width="2" height="6" style={{ fill: 'var(--theme-icon-highlight)' }} />
        <rect x="14" y="12" width="2" height="6" style={{ fill: 'var(--theme-icon-highlight)' }} />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <path d="M4 6 L20 6" {...stroke} />
        <path d="M9 6 L9 4 L15 4 L15 6" {...stroke} />
        <path d="M6 6 L7 21 L17 21 L18 6" {...stroke} />
        <path d="M10 10 L10 17 M14 10 L14 17" stroke="currentColor" stroke-width="0.5" stroke-dasharray="1 1" />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <path d="M4 6 L20 6" {...stroke} />
      <path d="M9 6 L9 4 L15 4 L15 6" {...stroke} />
      <path d="M6 6 L7 21 L17 21 L18 6" {...stroke} />
      <path d="M10 10 L10 17 M14 10 L14 17" {...stroke} />
    </svg>
  );
}

export default IconTrash;
