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

export const ChevronLeftIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="m15 6-6 6 6 6" />
  </svg>
);

export const ChevronRightIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

// ─── Menu categories ────────────────────────────────────────────────────────

/** Arma tu combo: a box with a roll and two nigiris */
export const BoxIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="3" y="6.5" width="18" height="13" rx="2" />
    <path d="M12 6.5v13" />
    <circle cx="7.5" cy="13" r="2.4" />
    <circle cx="7.5" cy="13" r=".7" />
    <path d="M14.3 11.2c0-1 .9-1.6 1.7-1.6h1.6c.9 0 1.7.6 1.7 1.6v.6h-5zM14.3 15.2c0-1 .9-1.6 1.7-1.6h1.6c.9 0 1.7.6 1.7 1.6v.6h-5z" />
  </svg>
);

export const BurgerIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M4 11.5a8 6.5 0 0 1 16 0z" />
    <path d="M9 7.6l.5.4M12.5 6.6l.4.5M15 8.3l.5.3" />
    <path d="M3.5 14.6c1.4 1 2.8 1 4.2 0s2.8-1 4.3 0 2.8 1 4.2 0 2.8-1 4.3 0" />
    <path d="M4.5 17.3h15v.7a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z" />
  </svg>
);

/** Acompañamientos: a gyoza */
export const DumplingIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M3 16c0-4.6 4-8.5 9-8.5s9 3.9 9 8.5z" />
    <path d="M7.6 9.4l1.1 2.2M12 7.5v2.6M16.4 9.4l-1.1 2.2" />
    <path d="M5 19.2h14" />
  </svg>
);

/** Combos: three rolls */
export const RollsIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="7.8" r="3.6" />
    <circle cx="12" cy="7.8" r="1.2" />
    <circle cx="7" cy="15.6" r="3.6" />
    <circle cx="7" cy="15.6" r="1.2" />
    <circle cx="17" cy="15.6" r="3.6" />
    <circle cx="17" cy="15.6" r="1.2" />
  </svg>
);

/** Salsas & complementos: a sauce dish and chopsticks */
export const SauceIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M3.5 14.5h17c0 2.9-3.8 5-8.5 5s-8.5-2.1-8.5-5z" />
    <path d="M9.5 14.5c.6-1.2 1.6-1.8 2.5-1.8s1.9.6 2.5 1.8" />
    <path d="M6 3.5l13 8M9.5 3l11 7" />
  </svg>
);
