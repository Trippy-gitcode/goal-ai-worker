import { useIconProps } from './iconBase.js';

/*
 * IconArrowDown — ↓ replacement (S20 autoscroll banner)
 */
export function IconArrowDown(props) {
  const { theme, stroke, svg } = useIconProps('arrow-down', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <rect x="11" y="4" width="2" height="12" fill="currentColor" />
        <path d="M6 14 L12 20 L18 14" fill="currentColor" {...stroke} />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <path d="M12 4 L12 20" {...stroke} />
        <path d="M6 14 L12 20 L18 14" {...stroke} />
        <path d="M4 19 L20 19" stroke="currentColor" stroke-width="0.4" stroke-dasharray="1 2" />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <path d="M12 4 L12 20" {...stroke} />
      <path d="M6 14 L12 20 L18 14" {...stroke} />
    </svg>
  );
}

export default IconArrowDown;
