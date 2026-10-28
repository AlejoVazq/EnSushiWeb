'use client';

import { useCallback, useEffect, useMemo } from 'react';

import { lineMenuItems } from '@/lib/cartItems';
import { ORDERS_BY_APP, getLiveMenu } from '@/lib/pedidosApp';
import { useLiveMenuStore } from '@/store/useLiveMenuStore';
import type { CartItem } from '@/types';

/** How often an open page asks again (also on coming back to the tab) */
const POLL_MS = 60_000;

/** Asks the server what the shop changed today; does nothing in the WhatsApp version */
export const refreshLiveMenu = async (): Promise<void> => {
  if (!ORDERS_BY_APP) return;
  const result = await getLiveMenu();
  if (result.ok) useLiveMenuStore.getState().setLiveMenu(result.data);
};

/** Keeps sold-out marks and paused orders up to date while the page is open (menu and checkout) */
export function useLiveMenuSync(): void {
  useEffect(() => {
    if (!ORDERS_BY_APP) return;
    void refreshLiveMenu();
    const timer = window.setInterval(() => void refreshLiveMenu(), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshLiveMenu();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
}

/** Whether a product or build item can be ordered today: on in the menu and not marked sold out from the shop's app */
export function useIsAvailable(): (item: { id: string; available: boolean }) => boolean {
  const soldOut = useLiveMenuStore((state) => state.soldOut);
  return useCallback((item) => item.available && !soldOut.has(item.id), [soldOut]);
}

/** Names of what in these lines was marked sold out after it was added (the order can't go out with them) */
export function useSoldOutInCart(items: readonly CartItem[]): string[] {
  const isAvailable = useIsAvailable();
  return useMemo(
    () => [...new Set(items.flatMap(lineMenuItems).filter((item) => !isAvailable(item)).map((item) => item.name))],
    [items, isAvailable],
  );
}
