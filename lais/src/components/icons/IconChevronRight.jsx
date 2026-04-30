import { useIconProps } from './iconBase.js';

/*
 * IconChevronRight — forward / right navigation
 */
export function IconChevronRight(props) {
  const { theme, stroke, svg } = useIconProps('chevron-right', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <path d="M8 5 L16 12 L8 19" fill="currentColor" {...stroke} />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <path d="M9 5 L16 12 L9 19" {...stroke} />
        <path d="M4 12 L19 12" stroke="currentColor" stroke-width="0.4" stroke-dasharray="1 2" />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <path d="M9 6 L15 12 L9 18" {...stroke} />
    </svg>
  );
}

export default IconChevronRight;
