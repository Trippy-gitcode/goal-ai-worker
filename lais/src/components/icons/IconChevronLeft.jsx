import { useIconProps } from './iconBase.js';

/*
 * IconChevronLeft — back / left navigation
 */
export function IconChevronLeft(props) {
  const { theme, stroke, svg } = useIconProps('chevron-left', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <path d="M16 5 L8 12 L16 19" fill="currentColor" {...stroke} />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <path d="M15 5 L8 12 L15 19" {...stroke} />
        <path d="M5 12 L20 12" stroke="currentColor" stroke-width="0.4" stroke-dasharray="1 2" />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <path d="M15 6 L9 12 L15 18" {...stroke} />
    </svg>
  );
}

export default IconChevronLeft;
