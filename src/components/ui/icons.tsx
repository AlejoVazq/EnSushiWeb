import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

export const PlusIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const MinusIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M5 12h14" />
  </svg>
);

export const CloseIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const TrashIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </svg>
);

export const BagIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M6 8h12l-1 12H7L6 8ZM9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);

/** Retiro en el local */
export const StoreIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M4 9 5.5 4h13L20 9M4 9h16M5 9v11h14V9M10 20v-5h4v5" />
  </svg>
);

/** Envío a domicilio */
export const HomeIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="m4 11 8-7 8 7M6 9.5V20h12V9.5M10 20v-5h4v5" />
  </svg>
);

/** Efectivo */
export const CashIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="3" y="6.5" width="18" height="11" rx="1.5" />
    <circle cx="12" cy="12" r="2.5" />
  </svg>
);

/** Transferencia / Mercado Pago */
export const PhoneIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="7" y="3" width="10" height="18" rx="2" />
    <path d="M11 17.5h2" />
  </svg>
);

export const CheckIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="m5 12 5 5L20 7" />
  </svg>
);
