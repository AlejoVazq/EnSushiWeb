'use client';

import { useCartHydration } from '@/hooks/useCartHydration';

/** Mounted once in the root layout so every page gets the saved cart */
export function CartHydrator() {
  useCartHydration();
  return null;
}
