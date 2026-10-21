'use client';

import { useMemo, useSyncExternalStore } from 'react';

import {
  checkOrderDay,
  getCartNotices,
  getScheduleStatus,
  type CartScheduleCheck,
  type CartScheduleNotice,
  type OrderDay,
  type ScheduleStatus,
} from '@/lib/schedule';
import type { CartItem } from '@/types';

const MINUTE = 60_000;

// Re-check often enough that crossing a boundary (opening, cutoff) shows up within the minute
const subscribe = (onChange: () => void) => {
  const id = setInterval(onChange, MINUTE / 2);
  return () => clearInterval(id);
};
const getSnapshot = () => Math.floor(Date.now() / MINUTE);
const getServerSnapshot = () => null;

/** null during SSR and hydration: the status depends on the visitor's clock */
export function useScheduleStatus(): ScheduleStatus | null {
  const minute = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => (minute === null ? null : getScheduleStatus(new Date(minute * MINUTE))), [minute]);
}

const NO_NOTICES: CartScheduleNotice[] = [];

/** Schedule heads-ups for the cart; none until the clock is known */
export function useCartNotices(items: readonly CartItem[]): CartScheduleNotice[] {
  const status = useScheduleStatus();
  return useMemo(() => (status ? getCartNotices(items, status) : NO_NOTICES), [items, status]);
}

export interface OrderSchedule {
  /** Days the customer can pick; empty until the clock is known */
  orderDays: OrderDay[];
  check: CartScheduleCheck;
}

const UNKNOWN: OrderSchedule = { orderDays: [], check: { canCheckout: true, notices: [] } };

/** Days to order for and the check for the chosen one; allows the checkout until the clock is known */
export function useOrderSchedule(items: readonly CartItem[], orderDate: string | null): OrderSchedule {
  const status = useScheduleStatus();
  return useMemo(
    () => (status ? { orderDays: status.orderDays, check: checkOrderDay(items, status, orderDate) } : UNKNOWN),
    [items, status, orderDate],
  );
}
