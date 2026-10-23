import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { BUILD_BOX_SIZES, BUILD_ITEMS, getBuildItemById, getProductById, isAvailableOn, isBoxItem } from '@/data/menu';
import { getBoxFill, isValidFill } from '@/lib/boxRules';
import type {
  BoxCartItem,
  BuildBoxEntry,
  BuildBoxSizeId,
  CartItem,
  ExtraCartItem,
  Product,
  ProductCartItem,
  SizedProduct,
  StandardProduct,
} from '@/types';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Sized products require a size; standard products their option value, if they have one. */
export type AddItemInput =
  | { product: StandardProduct; optionId?: string; quantity?: number }
  | { product: SizedProduct; pieces: number; quantity?: number };

/** An "Arma tu combo" box as the builder holds it: size and steps per box item id */
export interface BoxInput {
  size: BuildBoxSizeId;
  steps: Readonly<Record<string, number>>;
}

export interface CartState {
  items: readonly CartItem[];
  /** Adds a line, or increases its quantity if the same line already exists */
  addItem: (input: AddItemInput) => void;
  /** Adds a complete box (merges with an identical one) */
  addBox: (input: BoxInput) => void;
  /** Swaps an edited box in place, keeping its quantity; merges if it now equals another line */
  replaceBox: (lineId: string, input: BoxInput) => void;
  /** Adds one step of an acompañamiento (3 empanaditas, 5 langostinos) */
  addExtra: (itemId: string) => void;
  /** Removes the whole line */
  removeItem: (lineId: string) => void;
  /** Sets the quantity of a line; 0 or less removes it */
  updateQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
}

/** Only references are persisted; products and build items are re-read from the menu on load. */
interface PersistedLine {
  kind: CartItem['kind'];
  quantity: number;
  productId?: string;
  pieces?: number;
  optionId?: string;
  itemId?: string;
  /** Box size id ("chica" | "grande"); boxes saved with `pieces` (old 10–30 sizes) are dropped */
  size?: string;
  steps?: Record<string, number>;
}

interface PersistedCart {
  items: PersistedLine[];
}

// ─── Line helpers ───────────────────────────────────────────────────────────

const isValidQuantity = (quantity: number): boolean => Number.isInteger(quantity) && quantity > 0;

/** What tells two lines of the same product apart */
interface LineOptions {
  pieces?: number;
  optionId?: string;
}

/** Standard: the product id (+ option value id). Sized: product id + pieces. */
export const getLineId = (productId: string, { pieces, optionId }: LineOptions = {}): string => {
  if (pieces !== undefined) return `${productId}@${pieces}`;
  if (optionId !== undefined) return `${productId}#${optionId}`;
  return productId;
};

/** Acompañamiento lines: one per build item */
export const getExtraLineId = (itemId: string): string => `extra:${itemId}`;

/** Box size + sorted "itemId*steps", so the same box always gets the same id: "box@grande:roll-midori*1,roll-new-york*2" */
const getBoxLineId = (size: BuildBoxSizeId, entries: readonly BuildBoxEntry[]): string =>
  `box@${size}:${entries
    .map((entry) => `${entry.item.id}*${entry.steps}`)
    .sort()
    .join(',')}`;

const createProductLine = (
  product: Product,
  { pieces, optionId }: LineOptions,
  quantity: number,
): ProductCartItem | null => {
  if (!isValidQuantity(quantity) || !isAvailableOn(product)) return null;

  switch (product.type) {
    case 'standard': {
      if (pieces !== undefined) return null;
      if (!product.option) {
        if (optionId !== undefined) return null;
        return { kind: 'product', lineId: product.id, product, quantity, unitPrice: product.price };
      }
      const optionValue = product.option.values.find((v) => v.id === optionId);
      if (!optionValue) return null;
      return {
        kind: 'product',
        lineId: getLineId(product.id, { optionId: optionValue.id }),
        product,
        quantity,
        unitPrice: product.price,
        optionValue,
      };
    }
    case 'sized': {
      if (optionId !== undefined) return null;
      const variant = product.variants.find((v) => v.pieces === pieces);
      if (!variant) return null;
      return {
        kind: 'product',
        lineId: getLineId(product.id, { pieces: variant.pieces }),
        product,
        quantity,
        unitPrice: variant.price,
        variant,
      };
    }
  }
};

/**
 * A valid box: a known size, only available rolls and nigiris, whole positive steps,
 * and one of the combinations that fit in that size. Entries keep the BUILD_ITEMS order.
 */
const createBoxLine = ({ size, steps }: BoxInput, quantity: number): BoxCartItem | null => {
  const boxSize = BUILD_BOX_SIZES.find((candidate) => candidate.id === size);
  if (!isValidQuantity(quantity) || !boxSize) return null;

  const ids = Object.keys(steps).filter((id) => steps[id] !== 0);
  const entries: BuildBoxEntry[] = BUILD_ITEMS.filter((item) => ids.includes(item.id)).map((item) => ({
    item,
    steps: steps[item.id] ?? 0,
  }));
  if (entries.length !== ids.length) return null;
  const valid = entries.every((entry) => isBoxItem(entry.item) && entry.item.available && isValidQuantity(entry.steps));
  if (!valid) return null;

  if (!isValidFill(boxSize, getBoxFill(steps))) return null;

  return {
    kind: 'box',
    lineId: getBoxLineId(boxSize.id, entries),
    box: { size: boxSize.id, entries },
    quantity,
    unitPrice: entries.reduce((sum, entry) => sum + entry.item.price * entry.steps, 0),
  };
};

const createExtraLine = (itemId: string, quantity: number): ExtraCartItem | null => {
  const item = getBuildItemById(itemId);
  if (!item || isBoxItem(item) || !item.available || !isValidQuantity(quantity)) return null;
  return { kind: 'extra', lineId: getExtraLineId(item.id), item, quantity, unitPrice: item.price };
};

/** Adds `line` or, if an equal line exists, sums its quantity into it */
const mergeLine = (items: readonly CartItem[], line: CartItem): CartItem[] =>
  items.some((item) => item.lineId === line.lineId)
    ? items.map((item) => (item.lineId === line.lineId ? { ...item, quantity: item.quantity + line.quantity } : item))
    : [...items, line];

/** The builder's view of a box already in the cart, for "Editar" */
export const toBoxInput = (item: BoxCartItem): BoxInput => ({
  size: item.box.size,
  steps: Object.fromEntries(item.box.entries.map((entry) => [entry.item.id, entry.steps])),
});

// ─── Persistence helpers ────────────────────────────────────────────────────

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isStepsRecord = (value: unknown): value is Record<string, number> =>
  isRecord(value) && Object.values(value).every((v) => typeof v === 'number');

const toPersistedLine = (item: CartItem): PersistedLine => {
  switch (item.kind) {
    case 'box':
      return { kind: 'box', quantity: item.quantity, ...toBoxInput(item) };
    case 'extra':
      return { kind: 'extra', quantity: item.quantity, itemId: item.item.id };
    case 'product':
      return {
        kind: 'product',
        quantity: item.quantity,
        productId: item.product.id,
        ...(item.variant && { pieces: item.variant.pieces }),
        ...(item.optionValue && { optionId: item.optionValue.id }),
      };
  }
};

/** One stored line back into a cart line against the current menu; null if it no longer exists or is invalid */
const restoreLine = (raw: Record<string, unknown>): CartItem | null => {
  if (typeof raw.quantity !== 'number') return null;
  const pieces = typeof raw.pieces === 'number' ? raw.pieces : undefined;

  switch (raw.kind) {
    case 'box': {
      const size = BUILD_BOX_SIZES.find((candidate) => candidate.id === raw.size)?.id;
      return size && isStepsRecord(raw.steps) ? createBoxLine({ size, steps: raw.steps }, raw.quantity) : null;
    }
    case 'extra':
      return typeof raw.itemId === 'string' ? createExtraLine(raw.itemId, raw.quantity) : null;
    // Carts saved before boxes existed have no kind: they're product lines
    case 'product':
    case undefined: {
      const product = typeof raw.productId === 'string' ? getProductById(raw.productId) : undefined;
      if (!product) return null;
      const optionId = typeof raw.optionId === 'string' ? raw.optionId : undefined;
      return createProductLine(product, { pieces, optionId }, raw.quantity);
    }
    default:
      return null;
  }
};

/**
 * Rebuilds the cart from storage against the current menu, so prices are never
 * stale. Lines whose product or build item was removed, disabled, or is not offered today are dropped.
 */
const restoreItems = (persisted: unknown): CartItem[] => {
  if (!isRecord(persisted) || !Array.isArray(persisted.items)) return [];
  const rawItems: unknown[] = persisted.items;

  const restored = new Map<string, CartItem>();
  for (const raw of rawItems) {
    const line = isRecord(raw) ? restoreLine(raw) : null;
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
