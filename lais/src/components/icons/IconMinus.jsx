import { useIconProps } from './iconBase.js';

/*
 * IconMinus — remove / −
 */
export function IconMinus(props) {
  const { theme, stroke, svg } = useIconProps('minus', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <rect x="4" y="11" width="16" height="2" fill="currentColor" />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <path d="M5 12 L19 12" {...stroke} />
        <path d="M3 12 L4 12 M20 12 L21 12" stroke="currentColor" stroke-width="0.4" stroke-dasharray="1 1" />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <path d="M5 12 L19 12" {...stroke} />
    </svg>
  );
}

export default IconMinus;
