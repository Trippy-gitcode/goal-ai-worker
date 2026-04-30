import { useIconProps } from './iconBase.js';

/*
 * IconSword — ⚔️ replacement (S20Talk QuestCard 冒険)
 */
export function IconSword(props) {
  const { theme, stroke, svg } = useIconProps('sword', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <path d="M14 3 L21 3 L21 10 L9 22 L2 22 L2 15 Z" fill="currentColor" {...stroke} />
        <rect x="11" y="11" width="2" height="2" style={{ fill: 'var(--theme-icon-highlight)' }} />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <path d="M15 4 L20 4 L20 9 L8 21 L3 21 L3 16 Z" {...stroke} />
        <path d="M5 19 L19 5" stroke="currentColor" stroke-width="0.4" stroke-dasharray="1 2" />
      </svg>
    );
  }
  if (theme === 'totoro') {
    return (
      <svg {...svg}>
        <path d="M15 4 L20 4 L20 9 L8 21 L3 21 L3 16 Z" {...stroke} />
        <path d="M11 12 L13 14" {...stroke} />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <path d="M15 4 L20 4 L20 9 L8 21 L3 21 L3 16 Z" {...stroke} />
      <path d="M11 12 L13 14" {...stroke} />
    </svg>
  );
}

export default IconSword;
