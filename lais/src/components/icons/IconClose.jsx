import { useIconProps } from './iconBase.js';

/*
 * IconClose — × (replaces ✕ literal)
 * 4 テーマ: apple line / totoro round / dq 8bit thick / cyberpunk thin sharp
 */
export function IconClose(props) {
  const { theme, stroke, svg } = useIconProps('close', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <path d="M5 5 L19 19" {...stroke} />
        <path d="M19 5 L5 19" {...stroke} />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <path d="M5 5 L19 19" {...stroke} />
        <path d="M19 5 L5 19" {...stroke} />
        <path d="M3 12 L21 12" stroke="currentColor" stroke-width="0.4" stroke-dasharray="1 2" />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <path d="M6 6 L18 18" {...stroke} />
      <path d="M18 6 L6 18" {...stroke} />
    </svg>
  );
}

export default IconClose;
