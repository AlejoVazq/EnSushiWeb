'use client';

import { useMemo, useSyncExternalStore } from 'react';

import {
  checkSchedule,
  getCartNotices,
  getScheduleStatus,
  type CartScheduleCheck,
  type CartScheduleNotice,
  type ScheduleStatus,
} from '@/lib/schedule';
import type { CartItem } from '@/types';

const MINUTE = 60_000;

// Re-check often enough that crossing a boundary (opening, cutoff, closing) shows up within the minute
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

const UNKNOWN: CartScheduleCheck = { canCheckout: true, notices: [] };

/** Schedule check for the checkout; allows it until the clock is known */
export function useCheckoutSchedule(items: readonly CartItem[]): CartScheduleCheck {
  const status = useScheduleStatus();
  return useMemo(() => (status ? checkSchedule(items, status) : UNKNOWN), [items, status]);
}
