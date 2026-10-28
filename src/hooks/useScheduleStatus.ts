'use client';

import { useMemo, useSyncExternalStore } from 'react';

import { getSpecialDay } from '@/lib/discounts';
import {
  checkSchedule,
  getCartNotices,
  getNow,
  getScheduleStatus,
  type CartScheduleCheck,
  type CartScheduleNotice,
  type ScheduleStatus,
} from '@/lib/schedule';
import { useLiveMenuStore } from '@/store/useLiveMenuStore';
import type { SpecialDay } from '@/types';

const MINUTE = 60_000;

// Re-check often enough that crossing a boundary (opening, cutoff, closing) shows up within the minute
const subscribe = (onChange: () => void) => {
  const id = setInterval(onChange, MINUTE / 2);
  return () => clearInterval(id);
};
// getNow() is the simulated time when ?ahora is set in development
const getSnapshot = () => Math.floor(getNow().getTime() / MINUTE);
const getServerSnapshot = () => null;

/** "Now" to the minute (simulated with ?ahora in development); null during SSR and hydration */
export function useNow(): Date | null {
  const minute = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => (minute === null ? null : new Date(minute * MINUTE)), [minute]);
}

/** null during SSR and hydration: the status depends on the visitor's clock (and, by app, on orders being paused) */
export function useScheduleStatus(): ScheduleStatus | null {
  const now = useNow();
  const ordersPaused = useLiveMenuStore((state) => state.ordersPaused);
  return useMemo(() => (now ? getScheduleStatus(now, { ordersPaused }) : null), [now, ordersPaused]);
}

/** Today's special day (a discount on every Combo), or null; null until the clock is known */
export function useSpecialDay(): SpecialDay | null {
  const now = useNow();
  return useMemo(() => (now ? getSpecialDay(now) : null), [now]);
}

/**
 * False on a closed day or after closing: the menu is view-only and nothing can be added.
 * True until the clock is known, so nothing is hidden before hydration.
 */
export function useCanOrder(): boolean {
  return useScheduleStatus()?.isTakingOrders ?? true;
}

const NO_NOTICES: CartScheduleNotice[] = [];

/** Schedule heads-ups for the cart; none until the clock is known */
export function useCartNotices(): CartScheduleNotice[] {
  const status = useScheduleStatus();
  return useMemo(() => (status ? getCartNotices(status) : NO_NOTICES), [status]);
}

const UNKNOWN: CartScheduleCheck = { canCheckout: true, notices: [] };

/** Schedule check for the checkout; allows it until the clock is known */
export function useCheckoutSchedule(): CartScheduleCheck {
  const status = useScheduleStatus();
  return useMemo(() => (status ? checkSchedule(status) : UNKNOWN), [status]);
}
