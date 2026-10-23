import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  cartItemCount,
  cartTotal,
  createBoxLine,
  createExtraLine,
  createProductLine,
  isValidQuantity,
  mergeLine,
  restoreItems,
  toPersistedLine,
  type BoxInput,
  type PersistedCart,
} from '@/lib/cartItems';
import type { CartItem, SizedProduct, StandardProduct } from '@/types';

export {
  cartItemCount,
  cartTotal,
  getExtraLineId,
  getLineId,
  lineSubtotal,
  toBoxInput,
  type BoxInput,
} from '@/lib/cartItems';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Sized products require a size; standard products their option value, if they have one. */
export type AddItemInput =
  | { product: StandardProduct; optionId?: string; quantity?: number }
  | { product: SizedProduct; pieces: number; quantity?: number };

export interface CartState {
  items: readonly CartItem[];
  /** Adds a line, or increases its quantity if the same line already exists */
  addItem: (input: AddItemInput) => void;
  /** Adds a complete box (merges with an identical one) */
  addBox: (input: BoxInput) => void;
  /** Swaps an edited box in place, keeping its quantity; merges if it now equals another line */
  replaceBox: (lineId: string, input: BoxInput) => void;
  /** Adds one step of an acompañamiento (3 gyosas, 5 langostinos) */
  addExtra: (itemId: string) => void;
  /** Removes the whole line */
  removeItem: (lineId: string) => void;
  /** Sets the quantity of a line; 0 or less removes it */
  updateQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useCartStore = create<CartState>()(
  persist<CartState, [], [], PersistedCart>(
    (set) => ({
      items: [],

      addItem: (input) => {
        const line = createProductLine(
          input.product,
          {
            pieces: 'pieces' in input ? input.pieces : undefined,
            optionId: 'optionId' in input ? input.optionId : undefined,
          },
          input.quantity ?? 1,
        );
        if (!line) throw new Error(`Invalid cart item: ${input.product.id}`);
        set((state) => ({ items: mergeLine(state.items, line) }));
      },

      addBox: (input) => {
        const line = createBoxLine(input, 1);
        if (!line) throw new Error(`Invalid box: ${JSON.stringify(input)}`);
        set((state) => ({ items: mergeLine(state.items, line) }));
      },

      replaceBox: (lineId, input) =>
        set((state) => {
          const index = state.items.findIndex((item) => item.lineId === lineId);
          const current = state.items[index];
          if (!current) throw new Error(`No cart line: ${lineId}`);
          const line = createBoxLine(input, current.quantity);
          if (!line) throw new Error(`Invalid box: ${JSON.stringify(input)}`);

          const others = state.items.filter((item) => item.lineId !== lineId);
          if (others.some((item) => item.lineId === line.lineId)) return { items: mergeLine(others, line) };
          // Same position as the line it replaces
          return { items: [...others.slice(0, index), line, ...others.slice(index)] };
        }),

      addExtra: (itemId) => {
        const line = createExtraLine(itemId, 1);
        if (!line) throw new Error(`Invalid acompañamiento: ${itemId}`);
        set((state) => ({ items: mergeLine(state.items, line) }));
      },

      removeItem: (lineId) =>
        set((state) => ({ items: state.items.filter((item) => item.lineId !== lineId) })),

      updateQuantity: (lineId, quantity) => {
        if (quantity <= 0) {
          set((state) => ({ items: state.items.filter((item) => item.lineId !== lineId) }));
          return;
        }
        if (!isValidQuantity(quantity)) throw new Error(`Invalid quantity: ${quantity}`);
        set((state) => ({
          items: state.items.map((item) => (item.lineId === lineId ? { ...item, quantity } : item)),
        }));
      },

      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'sushi-cart',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items.map(toPersistedLine) }),
      merge: (persisted, current) => ({ ...current, items: restoreItems(persisted) }),
      // Avoids SSR hydration mismatches: call useCartStore.persist.rehydrate() on the client.
      skipHydration: true,
    },
  ),
);

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectCartTotal = (state: CartState): number => cartTotal(state.items);
export const selectCartItemCount = (state: CartState): number => cartItemCount(state.items);
