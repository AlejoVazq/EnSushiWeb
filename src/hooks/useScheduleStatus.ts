'use client';

import { useMemo, useSyncExternalStore } from 'react';

import { checkCartSchedule, getScheduleStatus, type CartScheduleCheck, type ScheduleStatus } from '@/lib/schedule';
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

const UNKNOWN: CartScheduleCheck = { canCheckout: true, notices: [] };

/** Schedule notices for the cart; allows the checkout until the clock is known */
export function useCartSchedule(items: readonly CartItem[]): CartScheduleCheck {
  const status = useScheduleStatus();
  return useMemo(() => (status ? checkCartSchedule(items, status) : UNKNOWN), [items, status]);
}
