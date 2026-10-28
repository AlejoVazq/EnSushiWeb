import { create } from 'zustand';

import type { LiveMenu } from '@/types/pedidos';

/**
 * What the shop changed today from its app (orders by app only): sold-out items and paused orders.
 * Empty until the server answers, and always empty in the WhatsApp version.
 */
interface LiveMenuState {
  soldOut: ReadonlySet<string>;
  ordersPaused: boolean;
  setLiveMenu: (live: LiveMenu) => void;
}

export const useLiveMenuStore = create<LiveMenuState>()((set) => ({
  soldOut: new Set(),
  ordersPaused: false,
  setLiveMenu: ({ soldOut, ordersPaused }) => set({ soldOut: new Set(soldOut), ordersPaused }),
}));
