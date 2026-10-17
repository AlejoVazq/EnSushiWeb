'use client';

import { useEffect, useSyncExternalStore } from 'react';

import { useCartStore } from '@/store/useCartStore';

/** Loads the saved cart after mount (the store uses skipHydration to avoid SSR mismatches). */
export function useCartHydration(): void {
  useEffect(() => {
    void useCartStore.persist.rehydrate();
  }, []);
}

// Without localStorage (server/prerender) zustand doesn't attach `persist`, hence the optional chaining
const subscribe = (onChange: () => void) => useCartStore.persist?.onFinishHydration(onChange) ?? (() => {});
const getSnapshot = () => useCartStore.persist?.hasHydrated() ?? false;

/** false until the saved cart has been loaded — so pages don't mistake "not loaded yet" for "empty" */
export function useCartHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
