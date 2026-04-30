import { useIconProps } from './iconBase.js';

/*
 * IconSettings — cog / ⚙️ replacement
 */
export function IconSettings(props) {
  const { theme, stroke, svg } = useIconProps('settings', props);
  if (theme === 'dq') {
    return (
      <svg {...svg}>
        <rect x="10" y="3" width="4" height="3" fill="currentColor" />
        <rect x="10" y="18" width="4" height="3" fill="currentColor" />
        <rect x="3" y="10" width="3" height="4" fill="currentColor" />
        <rect x="18" y="10" width="3" height="4" fill="currentColor" />
        <rect x="6" y="6" width="12" height="12" fill="currentColor" {...stroke} />
        <rect x="10" y="10" width="4" height="4" style={{ fill: 'var(--theme-icon-highlight)' }} />
      </svg>
    );
  }
  if (theme === 'cyberpunk') {
    return (
      <svg {...svg}>
        <circle cx="12" cy="12" r="3" {...stroke} />
        <path d="M12 3 L12 6 M12 18 L12 21 M3 12 L6 12 M18 12 L21 12 M5 5 L7 7 M17 17 L19 19 M5 19 L7 17 M17 7 L19 5" {...stroke} />
        <circle cx="12" cy="12" r="0.5" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="3" {...stroke} />
      <path d="M12 3 L12 6 M12 18 L12 21 M3 12 L6 12 M18 12 L21 12 M5 5 L7 7 M17 17 L19 19 M5 19 L7 17 M17 7 L19 5" {...stroke} />
    </svg>
  );
}

export default IconSettings;
