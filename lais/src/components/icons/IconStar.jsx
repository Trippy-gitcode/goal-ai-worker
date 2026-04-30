import { useIconProps } from './iconBase.js';

/*
 * IconStar — favorite / EXP
 */
export function IconStar(props) {
  const { theme, stroke, svg } = useIconProps('star', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <path d="M12 3 L14.5 9 L21 9.5 L16 14 L17.5 21 L12 17.5 L6.5 21 L8 14 L3 9.5 L9.5 9 Z" fill="currentColor" {...stroke} />
        <rect x="11" y="11" width="2" height="2" style={{ fill: 'var(--theme-icon-highlight)' }} />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <path d="M12 4 L14.3 9.5 L20 10 L15.6 14 L17 20 L12 16.8 L7 20 L8.4 14 L4 10 L9.7 9.5 Z" {...stroke} />
        <path d="M3 12 L21 12" stroke="currentColor" stroke-width="0.4" stroke-dasharray="1 2" />
      </svg>
    );
  }
  if (theme === 'totoro') {
    return (
      <svg {...svg}>
        <path d="M12 4 L14.3 9.5 L20 10 L15.6 14 L17 20 L12 16.8 L7 20 L8.4 14 L4 10 L9.7 9.5 Z" fill="currentColor" {...stroke} />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <path d="M12 4 L14.3 9.5 L20 10 L15.6 14 L17 20 L12 16.8 L7 20 L8.4 14 L4 10 L9.7 9.5 Z" {...stroke} />
    </svg>
  );
}

export default IconStar;
