import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import type { ProductIconId } from '@/types';

/**
 * Line drawings for the products that have no photo (sauces, wasabi, chopsticks), in the same graphite stroke as
 * the rest of the icons. Shapes that hide what's behind them are filled with the tile's color (`fill-sumi-1`).
 */
const DRAWINGS: Record<ProductIconId, ReactNode> = {
  // A dip cup with a drop of the glaze above it
  teriyaki: (
    <>
      <path d="M32 9c-3.2 4.4-5 7.6-5 9.8a5 5 0 0 0 10 0C37 16.6 35.2 13.4 32 9Z" />
      <path className="fill-sumi-1" d="M13 32l4.8 16.6c1.4 3.6 7.4 5.9 14.2 5.9s12.8-2.3 14.2-5.9L51 32" />
      <ellipse className="fill-sumi-1" cx="32" cy="32" rx="19" ry="6" />
      <path d="M17.5 33.6c3.6 1.6 8.8 2.4 14.5 2.4s10.9-.8 14.5-2.4" />
      <path d="M19.5 39.5l1.6 5.5" />
    </>
  ),
  // The same cup with sesame seeds, and a slice of lemon behind it
  'buenos-aires': (
    <>
      <path className="fill-sumi-1" d="M33 25a12 12 0 0 1 24 0Z" />
      <path d="M37 25a8 8 0 0 1 16 0M45 25v-8M45 25l-5.6-5.6M45 25l5.6-5.6" />
      <path className="fill-sumi-1" d="M11 32l4.8 15.6c1.4 3.6 7.4 5.9 14.2 5.9s12.8-2.3 14.2-5.9L49 32" />
      <ellipse className="fill-sumi-1" cx="30" cy="32" rx="19" ry="6" />
      <path d="M15.5 33.6c3.6 1.6 8.8 2.4 14.5 2.4s10.9-.8 14.5-2.4" />
      <path d="M22 31.2l2-.6M29 29.6l2.1.2M35.5 31.4l1.8-.9M26 33.6l1.9.4M40 33l1.8.4" />
      <path d="M17.5 39.5l1.6 5.5" />
    </>
  ),
  // The fish-shaped bottle of takeaway sushi
  soja: (
    <>
      <path d="M15 33c5-8.5 19-11.5 30-4.5l9-6.5-2.5 11 2.5 11-9-6.5C34 44.5 20 41.5 15 33Z" />
      <rect x="7" y="29.5" width="8" height="7" rx="1.5" />
      <circle cx="22" cy="31" r="1.3" fill="currentColor" stroke="none" />
      <path d="M27 28.4c2.2 2.6 2.2 6.6 0 9.2" />
      <path d="M33 26.2c2-3 6-4.4 9-3.4" />
      <path d="M31 36.5c3.5.9 7.5.5 10.5-1.3" />
    </>
  ),
  // A dollop on a small dish
  wasabi: (
    <>
      <path d="M8 46c8.5-6.5 39.5-6.5 48 0-8.5 6.5-39.5 6.5-48 0Z" />
      <path
        className="fill-sumi-1"
        d="M16.5 45.5c-2.6-6.2 1.6-11.6 7.4-12.4-.8-7 3.8-12.4 11-14.6-.8 5 3 8.4 8.4 9.8 6.6 1.8 8.6 9.4 6.2 17.2-7.6 2-25.4 2-33 0Z"
      />
      <path d="M24 33.1c4.6-1.2 9.6-.6 14 2M21.5 40c6-1.3 13.4-.8 18.6 1.8" />
    </>
  ),
  // A pair resting on a chopstick rest
  palitos: (
    <g transform="translate(0 3)">
      <path d="M16 45c0-2.6 2-4 4.4-4h7.2c2.4 0 4.4 1.4 4.4 4M13.5 46.5h21" />
      <g transform="rotate(-14 32 32)">
        <path className="fill-sumi-1" d="M3 24.5 61 27v2L3 30Z" />
        <path className="fill-sumi-1" d="M5 33.5 63 36v2L5 39Z" />
        <path d="M11 24.8v5M13 33.8v5" />
      </g>
    </g>
  ),
};

interface ProductIllustrationProps {
  icon: ProductIconId;
  /** Size and corners of the tile (it fills its box) */
  className?: string;
  /** Sold out: faded like the photos */
  faded?: boolean;
}

/** The drawing on its tile, where the photo would go. Decorative: the product's name is next to it. */
export function ProductIllustration({ icon, className, faded = false }: ProductIllustrationProps) {
  return (
    <div className={cn('grid place-items-center bg-sumi-1 text-washi', faded && 'opacity-40', className)}>
      <svg
        viewBox="0 0 64 64"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="size-[78%]"
      >
        {DRAWINGS[icon]}
      </svg>
    </div>
  );
}
