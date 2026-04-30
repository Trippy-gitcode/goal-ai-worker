import { useIconProps } from './iconBase.js';

/*
 * IconHeart — like / favorite
 */
export function IconHeart(props) {
  const { theme, stroke, svg } = useIconProps('heart', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <path d="M4 8 L4 12 L12 20 L20 12 L20 8 L16 4 L12 8 L8 4 Z" fill="currentColor" {...stroke} />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <path d="M12 20 C 4 14, 4 8, 7 6 C 9 4.5, 11 5, 12 7 C 13 5, 15 4.5, 17 6 C 20 8, 20 14, 12 20 Z" {...stroke} />
        <path d="M3 12 L21 12" stroke="currentColor" stroke-width="0.4" stroke-dasharray="1 2" />
      </svg>
    );
  }
  if (theme === 'totoro') {
    return (
      <svg {...svg}>
        <path d="M12 20 C 4 14, 4 8, 7 6 C 9 4.5, 11 5, 12 7 C 13 5, 15 4.5, 17 6 C 20 8, 20 14, 12 20 Z" fill="currentColor" {...stroke} />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <path d="M12 20 C 4 14, 4 8, 7 6 C 9 4.5, 11 5, 12 7 C 13 5, 15 4.5, 17 6 C 20 8, 20 14, 12 20 Z" {...stroke} />
    </svg>
  );
}

export default IconHeart;
