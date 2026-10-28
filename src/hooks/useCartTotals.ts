'use client';

import { useMemo } from 'react';

import { useNow } from '@/hooks/useScheduleStatus';
import { getBestDiscount } from '@/lib/discounts';
import { cartTotal, useCartStore } from '@/store/useCartStore';
import type { DiscountCode, OrderDiscount } from '@/types';

export interface CartTotals {
  /** Integer ARS, before the discount */
  subtotal: number;
  discount: OrderDiscount | null;
  /** subtotal − discount (the delivery fee is the checkout's to add) */
  total: number;
}

/**
 * The cart's totals with today's discount: the special day's, or `code`'s if it saves more (the checkout passes
 * the applied code; the cart and the menu don't). No discount until the visitor's clock is known.
 * `extraCodes`: codes the server vouched for (orders by app).
 */
export function useCartTotals(code: string = '', extraCodes: readonly DiscountCode[] = []): CartTotals {
  const items = useCartStore((state) => state.items);
  const now = useNow();
  return useMemo(() => {
    const subtotal = cartTotal(items);
    const discount = now ? getBestDiscount(items, { code, date: now, extraCodes }) : null;
    return { subtotal, discount, total: subtotal - (discount?.amount ?? 0) };
  }, [items, now, code, extraCodes]);
}
