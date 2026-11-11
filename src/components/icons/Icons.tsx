import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
  ...props,
});

export const CalculatorIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="5" y="3" width="14" height="18" rx="2.5" />
    <path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01" />
  </svg>
);

export const FunctionIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14.5 4.5c-2 0-3 1.2-3.4 3.4L9.6 16.1c-.4 2.2-1.4 3.4-3.4 3.4M7.5 10h7.5M14 13.5l5 5M19 13.5l-5 5" />
  </svg>
);

export const RulerIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3.5 16.5 16.5 3.5l4 4-13 13z" />
    <path d="m7.5 12.5 2 2M10.5 9.5l1.5 1.5M13.5 6.5l2 2" />
  </svg>
);

export const CurrencyIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M14.8 9.2c-.5-.9-1.5-1.4-2.8-1.4-1.6 0-2.8.8-2.8 2.1 0 2.9 5.8 1.4 5.8 4.3 0 1.3-1.2 2.1-2.9 2.1-1.4 0-2.5-.6-3-1.6M12 6v1.8M12 16.2V18" />
  </svg>
);

export const SwapIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 4v16M7 20l-3.5-3.5M7 20l3.5-3.5M17 20V4M17 4l-3.5 3.5M17 4l3.5 3.5" />
  </svg>
);

export const RefreshIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20 11.5A8 8 0 0 0 6.3 6.3L4 8.5M4 4v4.5h4.5M4 12.5a8 8 0 0 0 13.7 5.2l2.3-2.2M20 20v-4.5h-4.5" />
  </svg>
);

export const SunIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
  </svg>
);

export const MoonIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
  </svg>
);

export const BackspaceIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z" />
    <path d="m12.5 9.5 5 5M17.5 9.5l-5 5" />
  </svg>
);

export const HistoryIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5M3.5 4v4.5H8M12 7.5V12l3 2" />
  </svg>
);

export const KeyboardIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M7.5 14h9" />
  </svg>
);

export const AlertIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3.5 2.5 20h19z" />
    <path d="M12 10v4M12 17h.01" />
  </svg>
);

export const DownloadIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />
  </svg>
);

export const OfflineIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 4.2-2.6M19 13a10 10 0 0 0-2.4-1.8M2 9.5a15 15 0 0 1 4.6-2.9M22 9.5A15 15 0 0 0 11 5.6M12 20h.01" />
  </svg>
);
