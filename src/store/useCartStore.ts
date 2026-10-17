import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getFlavorById, getProductById, isAvailableOn } from '@/data/menu';
import type { CartItem, CustomComboProduct, Product, StandardProduct } from '@/types';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Custom combos require their flavors; standard products can't take any. */
export type AddItemInput =
  | { product: StandardProduct; quantity?: number }
  | { product: CustomComboProduct; flavorIds: readonly string[]; quantity?: number };

export interface CartState {
  items: readonly CartItem[];
  /** Adds a line, or increases its quantity if the same line already exists */
  addItem: (input: AddItemInput) => void;
  /** Removes the whole line */
  removeItem: (lineId: string) => void;
  /** Sets the quantity of a line; 0 or less removes it */
  updateQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
}

/** Only references are persisted; products are re-read from the menu on load. */
interface PersistedLine {
  productId: string;
  quantity: number;
  flavorIds?: string[];
}

interface PersistedCart {
  items: PersistedLine[];
}

// ─── Line helpers ───────────────────────────────────────────────────────────

const isValidQuantity = (quantity: number): boolean => Number.isInteger(quantity) && quantity > 0;

/** Sorted, unique flavor ids within 1..maxFlavors, or null if invalid */
const normalizeFlavorIds = (
  product: CustomComboProduct,
  flavorIds: readonly string[],
): string[] | null => {
  const unique = [...new Set(flavorIds)].sort();
  if (unique.length !== flavorIds.length) return null;
  if (unique.length < 1 || unique.length > product.maxFlavors) return null;
  if (!unique.every((id) => getFlavorById(id))) return null;
  return unique;
};

/** Standard products: the product id. Custom combos: product id + sorted flavor ids. */
export const getLineId = (productId: string, flavorIds?: readonly string[]): string =>
  flavorIds && flavorIds.length > 0 ? `${productId}:${flavorIds.join(',')}` : productId;

const createLine = (
  product: Product,
  flavorIds: readonly string[] | undefined,
  quantity: number,
): CartItem | null => {
  if (!isValidQuantity(quantity) || !isAvailableOn(product)) return null;

  if (product.type === 'standard') {
    if (flavorIds !== undefined) return null;
    return { lineId: product.id, product, quantity };
  }

  if (flavorIds === undefined) return null;
  const normalized = normalizeFlavorIds(product, flavorIds);
  if (!normalized) return null;
  return {
    lineId: getLineId(product.id, normalized),
    product,
    quantity,
    customization: { flavorIds: normalized },
  };
};

// ─── Persistence helpers ────────────────────────────────────────────────────

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'string');

/**
 * Rebuilds the cart from storage against the current menu, so prices are never
 * stale. Lines whose product was removed, disabled, or is not offered today are dropped.
 */
const restoreItems = (persisted: unknown): CartItem[] => {
  if (!isRecord(persisted) || !Array.isArray(persisted.items)) return [];
  const rawItems: unknown[] = persisted.items;

  const restored = new Map<string, CartItem>();
  for (const raw of rawItems) {
    if (!isRecord(raw) || typeof raw.productId !== 'string' || typeof raw.quantity !== 'number') {
      continue;
    }
    const product = getProductById(raw.productId);
    if (!product) continue;

    const flavorIds = isStringArray(raw.flavorIds) ? raw.flavorIds : undefined;
    const line = createLine(product, flavorIds, raw.quantity);
    if (line && !restored.has(line.lineId)) restored.set(line.lineId, line);
  }
  return [...restored.values()];
};

// ─── Store ──────────────────────────────────────────────────────────────────

export const useCartStore = create<CartState>()(
  persist<CartState, [], [], PersistedCart>(
    (set) => ({
      items: [],

      addItem: (input) => {
        const quantity = input.quantity ?? 1;
        const flavorIds = 'flavorIds' in input ? input.flavorIds : undefined;
        const line = createLine(input.product, flavorIds, quantity);
        if (!line) throw new Error(`Invalid cart item: ${input.product.id}`);

        set((state) => {
          const exists = state.items.some((item) => item.lineId === line.lineId);
          return {
            items: exists
              ? state.items.map((item) =>
                  item.lineId === line.lineId ? { ...item, quantity: item.quantity + quantity } : item,
                )
              : [...state.items, line],
          };
        });
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
      partialize: (state) => ({
        items: state.items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          ...(item.customization && { flavorIds: [...item.customization.flavorIds] }),
        })),
      }),
      merge: (persisted, current) => ({ ...current, items: restoreItems(persisted) }),
      // Avoids SSR hydration mismatches: call useCartStore.persist.rehydrate() on the client.
      skipHydration: true,
    },
  ),
);

// ─── Derived values ─────────────────────────────────────────────────────────

/** Price × quantity for one line, integer ARS */
export const lineSubtotal = (item: CartItem): number => item.product.price * item.quantity;

/** Integer ARS */
export const cartTotal = (items: readonly CartItem[]): number =>
  items.reduce((sum, item) => sum + lineSubtotal(item), 0);

export const cartItemCount = (items: readonly CartItem[]): number =>
  items.reduce((sum, item) => sum + item.quantity, 0);

export const selectCartTotal = (state: CartState): number => cartTotal(state.items);
export const selectCartItemCount = (state: CartState): number => cartItemCount(state.items);
