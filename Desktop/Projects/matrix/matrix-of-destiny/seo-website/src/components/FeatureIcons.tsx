const baseProps = {
  width: 28,
  height: 28,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const MatrixIcon = () => (
  <svg {...baseProps}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3 L21 12 L12 21 L3 12 Z" />
    <path d="M6 6 L18 18 M18 6 L6 18" />
    <circle cx="12" cy="12" r="1.8" fill="currentColor" />
  </svg>
);

export const CompatibilityIcon = () => (
  <svg {...baseProps}>
    <circle cx="8.5" cy="11" r="4" />
    <circle cx="15.5" cy="11" r="4" />
    <path d="M12 15 C10.5 16.5 10.5 18.5 12 20 C13.5 18.5 13.5 16.5 12 15 Z" fill="currentColor" stroke="none" opacity="0.9" />
  </svg>
);

export const AiIcon = () => (
  <svg {...baseProps}>
    <circle cx="12" cy="12" r="3" />
    <circle cx="5" cy="6" r="1.4" />
    <circle cx="19" cy="6" r="1.4" />
    <circle cx="5" cy="18" r="1.4" />
    <circle cx="19" cy="18" r="1.4" />
    <circle cx="12" cy="3.5" r="1.2" />
    <circle cx="12" cy="20.5" r="1.2" />
    <path d="M6.2 6.8 L9.7 10.5 M17.8 6.8 L14.3 10.5 M6.2 17.2 L9.7 13.5 M17.8 17.2 L14.3 13.5 M12 4.7 L12 9 M12 15 L12 19.3" />
  </svg>
);

export const ArcanaIcon = () => (
  <svg {...baseProps}>
    <path d="M12 2 L14.3 8.6 L21 9 L15.8 13.3 L17.6 20 L12 16.3 L6.4 20 L8.2 13.3 L3 9 L9.7 8.6 Z" />
    <path d="M12 8.5 L12 13" opacity="0.5" />
  </svg>
);

export const DailyIcon = () => (
  <svg {...baseProps}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2 L12 4 M12 20 L12 22 M2 12 L4 12 M20 12 L22 12 M4.9 4.9 L6.3 6.3 M17.7 17.7 L19.1 19.1 M4.9 19.1 L6.3 17.7 M17.7 6.3 L19.1 4.9" />
  </svg>
);
