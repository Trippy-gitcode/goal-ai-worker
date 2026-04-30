import { useIconProps } from './iconBase.js';

/*
 * IconCheck — checkmark
 */
export function IconCheck(props) {
  const { theme, stroke, svg } = useIconProps('check', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <path d="M4 12 L10 18 L20 6" fill="none" {...stroke} />
        <rect x="4" y="11" width="2" height="2" fill="currentColor" />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <path d="M4 12 L10 18 L20 6" {...stroke} />
        <path d="M4 14 L20 14" stroke="currentColor" stroke-width="0.4" stroke-dasharray="1 2" />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <path d="M5 12.5 L10 17 L19 7" {...stroke} />
    </svg>
  );
}

export default IconCheck;
