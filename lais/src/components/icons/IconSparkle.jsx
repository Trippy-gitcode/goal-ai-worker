import { useIconProps } from './iconBase.js';

/*
 * IconSparkle — 🎉 replacement (S20Talk level-up celebration)
 */
export function IconSparkle(props) {
  const { theme, stroke, svg } = useIconProps('sparkle', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <path d="M12 3 L13 10 L20 11 L13 12 L12 19 L11 12 L4 11 L11 10 Z" fill="currentColor" {...stroke} />
        <rect x="11" y="11" width="2" height="2" style={{ fill: 'var(--theme-icon-highlight)' }} />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <path d="M12 4 L13 10 L19 11 L13 12 L12 18 L11 12 L5 11 L11 10 Z" fill="none" {...stroke} />
        <circle cx="6" cy="6" r="0.6" fill="currentColor" />
        <circle cx="18" cy="18" r="0.6" fill="currentColor" />
      </svg>
    );
  }
  if (theme === 'totoro') {
    return (
      <svg {...svg}>
        <path d="M12 4 C 12.5 9, 13 9.5, 18 11 C 13 12.5, 12.5 13, 12 18 C 11.5 13, 11 12.5, 6 11 C 11 9.5, 11.5 9, 12 4 Z" {...stroke} fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <path d="M12 5 L13 10 L18 11 L13 12 L12 17 L11 12 L6 11 L11 10 Z" {...stroke} />
      <circle cx="18" cy="6" r="1" fill="currentColor" />
      <circle cx="5" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}

export default IconSparkle;
