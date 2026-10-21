import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getFlavorById, getProductById, isAvailableOn } from '@/data/menu';
import type { CartItem, CustomComboProduct, Product, SizedProduct, StandardProduct } from '@/types';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Sized products require a size and custom combos their flavors; standard products their option value, if they have one. */
export type AddItemInput =
  | { product: StandardProduct; optionId?: string; quantity?: number }
  | { product: SizedProduct; pieces: number; quantity?: number }
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
  pieces?: number;
  flavorIds?: string[];
  optionId?: string;
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

/** What tells two lines of the same product apart */
interface LineOptions {
  pieces?: number;
  flavorIds?: readonly string[];
  optionId?: string;
}

/**
 * Standard: the product id (+ option value id). Sized: product id + pieces.
 * Custom combos: product id + sorted flavor ids.
 */
export const getLineId = (productId: string, { pieces, flavorIds, optionId }: LineOptions = {}): string => {
  if (pieces !== undefined) return `${productId}@${pieces}`;
  if (optionId !== undefined) return `${productId}#${optionId}`;
  if (flavorIds && flavorIds.length > 0) return `${productId}:${flavorIds.join(',')}`;
  return productId;
};

const createLine = (
  product: Product,
  { pieces, flavorIds, optionId }: LineOptions,
  quantity: number,
): CartItem | null => {
  if (!isValidQuantity(quantity) || !isAvailableOn(product)) return null;

  switch (product.type) {
    case 'standard': {
      if (pieces !== undefined || flavorIds !== undefined) return null;
      if (!product.option) {
        if (optionId !== undefined) return null;
        return { lineId: product.id, product, quantity, unitPrice: product.price };
      }
      const optionValue = product.option.values.find((v) => v.id === optionId);
      if (!optionValue) return null;
      return {
        lineId: getLineId(product.id, { optionId: optionValue.id }),
        product,
        quantity,
        unitPrice: product.price,
        optionValue,
      };
    }
    case 'sized': {
      if (flavorIds !== undefined || optionId !== undefined) return null;
      const variant = product.variants.find((v) => v.pieces === pieces);
      if (!variant) return null;
      return {
        lineId: getLineId(product.id, { pieces: variant.pieces }),
        product,
        quantity,
        unitPrice: variant.price,
        variant,
      };
    }
    case 'custom-combo': {
      if (pieces !== undefined || optionId !== undefined || flavorIds === undefined) return null;
      const normalized = normalizeFlavorIds(product, flavorIds);
      if (!normalized) return null;
      return {
        lineId: getLineId(product.id, { flavorIds: normalized }),
        product,
        quantity,
        unitPrice: product.price,
        customization: { flavorIds: normalized },
      };
    }
  }
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

    const pieces = typeof raw.pieces === 'number' ? raw.pieces : undefined;
    const flavorIds = isStringArray(raw.flavorIds) ? raw.flavorIds : undefined;
    const optionId = typeof raw.optionId === 'string' ? raw.optionId : undefined;
    const line = createLine(product, { pieces, flavorIds, optionId }, raw.quantity);
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
        const line = createLine(
          input.product,
          {
            pieces: 'pieces' in input ? input.pieces : undefined,
            flavorIds: 'flavorIds' in input ? input.flavorIds : undefined,
            optionId: 'optionId' in input ? input.optionId : undefined,
          },
          quantity,
        );
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
          ...(item.variant && { pieces: item.variant.pieces }),
          ...(item.customization && { flavorIds: [...item.customization.flavorIds] }),
          ...(item.optionValue && { optionId: item.optionValue.id }),
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
export const lineSubtotal = (item: CartItem): number => item.unitPrice * item.quantity;

/** Integer ARS */
export const cartTotal = (items: readonly CartItem[]): number =>
  items.reduce((sum, item) => sum + lineSubtotal(item), 0);

export const cartItemCount = (items: readonly CartItem[]): number =>
  items.reduce((sum, item) => sum + item.quantity, 0);

export const selectCartTotal = (state: CartState): number => cartTotal(state.items);
export const selectCartItemCount = (state: CartState): number => cartItemCount(state.items);
