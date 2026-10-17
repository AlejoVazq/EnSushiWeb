'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/** false during SSR and hydration, true afterwards — for values that depend on the visitor's clock */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
