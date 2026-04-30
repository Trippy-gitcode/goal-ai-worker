import { useIconProps } from './iconBase.js';

/*
 * IconPlus — add / +
 */
export function IconPlus(props) {
  const { theme, stroke, svg } = useIconProps('plus', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <rect x="11" y="4" width="2" height="16" fill="currentColor" />
        <rect x="4" y="11" width="16" height="2" fill="currentColor" />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <path d="M12 5 L12 19" {...stroke} />
        <path d="M5 12 L19 12" {...stroke} />
        <circle cx="12" cy="12" r="0.5" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <path d="M12 5 L12 19" {...stroke} />
      <path d="M5 12 L19 12" {...stroke} />
    </svg>
  );
}

export default IconPlus;
