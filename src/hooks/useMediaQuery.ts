'use client';

import { useCallback, useSyncExternalStore } from 'react';

/** Matches the CSS breakpoint where the order moves from a drawer to a panel beside the menu (Tailwind `lg`) */
export const DESKTOP_QUERY = '(min-width: 64rem)';

/** Whether `query` matches; false during SSR and hydration, so the server's (phone) layout never flickers */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
