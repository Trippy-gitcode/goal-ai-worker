import { useIconProps } from './iconBase.js';

/*
 * IconUser — avatar fallback (similar to IconMe but standalone semantic)
 */
export function IconUser(props) {
  const { theme, stroke, svg } = useIconProps('user', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <rect x="9" y="4" width="6" height="6" fill="currentColor" />
        <rect x="6" y="13" width="12" height="8" fill="currentColor" />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <circle cx="12" cy="8" r="4" {...stroke} />
        <path d="M5 21 C 5 16, 8 13, 12 13 C 16 13, 19 16, 19 21" {...stroke} />
        <path d="M8 8 L16 8" stroke="currentColor" stroke-width="0.5" stroke-dasharray="1 1" />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <circle cx="12" cy="8" r="4" {...stroke} />
      <path d="M5 21 C 5 16, 8 13, 12 13 C 16 13, 19 16, 19 21" {...stroke} />
    </svg>
  );
}

export default IconUser;
