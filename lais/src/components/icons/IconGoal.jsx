import { useIconProps } from './iconBase.js';

/*
 * IconGoal — flag / target
 */
export function IconGoal(props) {
  const { theme, stroke, svg } = useIconProps('goal', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <rect x="5" y="3" width="2" height="18" fill="currentColor" />
        <path d="M7 4 L18 4 L15 8 L18 12 L7 12 Z" fill="currentColor" {...stroke} />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <circle cx="12" cy="12" r="9" {...stroke} />
        <circle cx="12" cy="12" r="5" {...stroke} />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        <path d="M3 12 L7 12 M17 12 L21 12 M12 3 L12 7 M12 17 L12 21" stroke="currentColor" stroke-width="0.6" />
      </svg>
    );
  }
  if (theme === 'totoro') {
    return (
      <svg {...svg}>
        <path d="M5 21 L5 4" {...stroke} />
        <path d="M5 4 L17 4 C 18 4, 19 5, 18 6 L 16 8 L 18 10 C 19 11, 18 12, 17 12 L 5 12" {...stroke} />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <path d="M5 21 L5 4" {...stroke} />
      <path d="M5 4 L18 4 L15 8.5 L18 13 L5 13" {...stroke} />
    </svg>
  );
}

export default IconGoal;
