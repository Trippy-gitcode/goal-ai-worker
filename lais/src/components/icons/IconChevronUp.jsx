import { useIconProps } from './iconBase.js';

/*
 * IconChevronUp — ▲ replacement (S10Grow UPCOMING expand)
 */
export function IconChevronUp(props) {
  const { theme, stroke, svg } = useIconProps('chevron-up', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <path d="M5 16 L12 8 L19 16" fill="currentColor" {...stroke} />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <path d="M5 15 L12 8 L19 15" {...stroke} />
        <path d="M5 18 L19 18" stroke="currentColor" stroke-width="0.4" stroke-dasharray="1 2" />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <path d="M6 15 L12 9 L18 15" {...stroke} />
    </svg>
  );
}

export default IconChevronUp;
