'use client';

import { useMemo, useSyncExternalStore } from 'react';

import {
  checkSchedule,
  getCartNotices,
  getNow,
  getScheduleStatus,
  type CartScheduleCheck,
  type CartScheduleNotice,
  type ScheduleStatus,
} from '@/lib/schedule';

const MINUTE = 60_000;

// Re-check often enough that crossing a boundary (opening, cutoff, closing) shows up within the minute
const subscribe = (onChange: () => void) => {
  const id = setInterval(onChange, MINUTE / 2);
  return () => clearInterval(id);
};
// getNow() is the simulated time when ?ahora is set in development
const getSnapshot = () => Math.floor(getNow().getTime() / MINUTE);
const getServerSnapshot = () => null;

/** null during SSR and hydration: the status depends on the visitor's clock */
export function useScheduleStatus(): ScheduleStatus | null {
  const minute = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => (minute === null ? null : getScheduleStatus(new Date(minute * MINUTE))), [minute]);
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
