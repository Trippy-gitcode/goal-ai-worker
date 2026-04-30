import { useIconProps } from './iconBase.js';

/*
 * IconChevronDown — ▼ replacement (S10Grow UPCOMING collapse)
 */
export function IconChevronDown(props) {
  const { theme, stroke, svg } = useIconProps('chevron-down', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <path d="M5 8 L12 16 L19 8" fill="currentColor" {...stroke} />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <path d="M5 9 L12 16 L19 9" {...stroke} />
        <path d="M5 6 L19 6" stroke="currentColor" stroke-width="0.4" stroke-dasharray="1 2" />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <path d="M6 9 L12 15 L18 9" {...stroke} />
    </svg>
  );
}

export default IconChevronDown;
