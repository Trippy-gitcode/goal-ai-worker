import { useIconProps } from './iconBase.js';

/*
 * IconWarning — ⚠️ replacement (triangle alert)
 */
export function IconWarning(props) {
  const { theme, stroke, svg } = useIconProps('warning', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <path d="M12 3 L22 21 L2 21 Z" fill="currentColor" {...stroke} />
        <rect x="11" y="9" width="2" height="6" style={{ fill: 'var(--theme-icon-highlight)' }} />
        <rect x="11" y="17" width="2" height="2" style={{ fill: 'var(--theme-icon-highlight)' }} />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <path d="M12 3 L22 20 L2 20 Z" {...stroke} />
        <path d="M12 9 L12 14" {...stroke} />
        <circle cx="12" cy="17" r="0.6" fill="currentColor" />
        <path d="M2 21 L22 21" stroke="currentColor" stroke-width="0.4" stroke-dasharray="1 2" />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <path d="M12 3 L22 20 L2 20 Z" {...stroke} />
      <path d="M12 9 L12 14" {...stroke} />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" />
    </svg>
  );
}

export default IconWarning;
