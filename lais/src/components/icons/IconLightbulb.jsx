import { useIconProps } from './iconBase.js';

/*
 * IconLightbulb — 💡 replacement (idea / hint)
 */
export function IconLightbulb(props) {
  const { theme, stroke, svg } = useIconProps('lightbulb', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <path d="M8 14 L8 4 L16 4 L16 14" fill="currentColor" {...stroke} />
        <path d="M9 14 L15 14 L15 17 L9 17 Z" fill="currentColor" {...stroke} />
        <rect x="10" y="18" width="4" height="2" fill="currentColor" />
        <rect x="10" y="20" width="4" height="1" style={{ fill: 'var(--theme-icon-highlight)' }} />
        <rect x="10" y="6" width="4" height="2" style={{ fill: 'var(--theme-icon-highlight)' }} />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <path d="M9 16 C 7 14, 6 12, 6 10 C 6 6.5, 9 4, 12 4 C 15 4, 18 6.5, 18 10 C 18 12, 17 14, 15 16 Z" {...stroke} />
        <path d="M9 17 L15 17" {...stroke} />
        <path d="M10 20 L14 20" {...stroke} />
        <path d="M3 12 L21 12" stroke="currentColor" stroke-width="0.4" stroke-dasharray="1 2" />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <path d="M9 16 C 7 14, 6 12, 6 10 C 6 6.5, 9 4, 12 4 C 15 4, 18 6.5, 18 10 C 18 12, 17 14, 15 16 Z" {...stroke} />
      <path d="M9 17 L15 17" {...stroke} />
      <path d="M10 20 L14 20" {...stroke} />
    </svg>
  );
}

export default IconLightbulb;
