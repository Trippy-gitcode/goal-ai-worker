import { useIconProps } from './iconBase.js';

/*
 * IconEdit — pencil / ✏️ replacement
 */
export function IconEdit(props) {
  const { theme, stroke, svg } = useIconProps('edit', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <path d="M3 21 L7 17 L17 7 L21 3 L21 7 L11 17 L7 21 Z" fill="currentColor" {...stroke} />
        <rect x="13" y="6" width="3" height="3" style={{ fill: 'var(--theme-icon-highlight)' }} />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <path d="M16 4 L20 8 L8 20 L4 20 L4 16 Z" {...stroke} />
        <path d="M14 6 L18 10" {...stroke} />
        <path d="M3 21 L21 21" stroke="currentColor" stroke-width="0.4" stroke-dasharray="1 2" />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <path d="M16 4 L20 8 L8 20 L4 20 L4 16 Z" {...stroke} />
      <path d="M14 6 L18 10" {...stroke} />
    </svg>
  );
}

export default IconEdit;
