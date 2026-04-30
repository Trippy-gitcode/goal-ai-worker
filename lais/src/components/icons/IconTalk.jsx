import { useIconProps } from './iconBase.js';

/*
 * IconTalk — chat bubble (4 テーマ別)
 */
export function IconTalk(props) {
  const { theme, stroke, svg } = useIconProps('talk', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <path d="M3 5 L21 5 L21 16 L13 16 L9 20 L9 16 L3 16 Z" fill="currentColor" {...stroke} />
        <rect x="7" y="9" width="2" height="2" style={{ fill: 'var(--theme-icon-highlight)' }} />
        <rect x="11" y="9" width="2" height="2" style={{ fill: 'var(--theme-icon-highlight)' }} />
        <rect x="15" y="9" width="2" height="2" style={{ fill: 'var(--theme-icon-highlight)' }} />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <path d="M3 6 L21 6 L21 17 L11 17 L7 21 L7 17 L3 17 Z" {...stroke} />
        <path d="M7 10 L17 10 M7 13 L14 13" {...stroke} />
      </svg>
    );
  }
  if (theme === 'totoro') {
    return (
      <svg {...svg}>
        <path d="M4 7 C 4 5.5, 5 4.5, 6.5 4.5 L 17.5 4.5 C 19 4.5, 20 5.5, 20 7 L 20 14 C 20 15.5, 19 16.5, 17.5 16.5 L 10 16.5 L 6 20 L 6 16.5 C 5 16.5, 4 15.5, 4 14 Z" {...stroke} />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <path d="M4 7 C 4 5.5, 5 4.5, 6.5 4.5 L 17.5 4.5 C 19 4.5, 20 5.5, 20 7 L 20 14 C 20 15.5, 19 16.5, 17.5 16.5 L 10 16.5 L 6 20 L 6 16.5 C 5 16.5, 4 15.5, 4 14 Z" {...stroke} />
    </svg>
  );
}

export default IconTalk;
