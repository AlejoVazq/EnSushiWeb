/**
 * Domain types — EnSushi Online Ordering (V1)
 * All prices are integers in ARS (no cents).
 */

// ─── Catalog ────────────────────────────────────────────────────────────────

export type CategoryId = 'arma-tu-combo' | 'sushiburgers' | 'combos' | 'salsas';

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
}

export type ProductTag = 'nuevo' | 'mas-pedido' | 'picante' | 'veggie' | 'sin-tacc';

/**
 * Kitchen dynamic:
 * - express: made on demand during opening hours.
 * - preorder: Arma tu combo; rolls and nigiris are taken until `BUSINESS.schedule.preorderCutoff`.
 */
export type OrderType = 'express' | 'preorder';

/** 0 = Sunday … 6 = Saturday (matches Date.prototype.getDay) */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface BaseProduct {
  id: string;
  categoryId: CategoryId;
  name: string;
  /** Optional until the real descriptions are loaded */
  description?: string;
  orderType: OrderType;
  /** Path under /public or remote URL. UI falls back to a placeholder when absent. */
  imageUrl?: string;
  /** Piece count, when meaningful (rolls, combos) */
  pieces?: number;
  tags?: readonly ProductTag[];
  /** Master switch to hide an item without deleting it */
  available: boolean;
  /** If set, the item is only shown on these days */
  availableDays?: readonly DayOfWeek[];
}

/** One choice of a product option (e.g. "Crudo"); `id` is unique within the option */
export interface ProductOptionValue {
  id: string;
  label: string;
  /** Overrides the product image while this value is selected */
  imageUrl?: string;
}

/** A required choice that doesn't change the price (e.g. raw or cooked salmon) */
export interface ProductOption {
  /** Accessible name of the choice, e.g. "Salmón" */
  name: string;
  values: readonly ProductOptionValue[];
}

/** A regular, ready-to-add product */
export interface StandardProduct extends BaseProduct {
  type: 'standard';
  /** Unit price in ARS, integer */
  price: number;
  /** If set, the customer must pick one value; each value is a separate cart line */
  option?: ProductOption;
}

/** One size of a sized product; `pieces` is unique within the product */
export interface ProductVariant {
  pieces: number;
  /** Unit price in ARS, integer */
  price: number;
}

/** Same product in several sizes (e.g. combos of 15/24/40 pieces); the customer picks one */
export interface SizedProduct extends BaseProduct {
  type: 'sized';
  variants: readonly ProductVariant[];
}

export type Product = StandardProduct | SizedProduct;

/** Sections of the "Arma tu combo" builder */
export type BuildItemGroup = 'rolls' | 'nigiris' | 'acompanamientos';

/**
 * Something the customer adds in "Arma tu combo", in fixed steps, each with its own price.
 * Rolls and nigiris fill a box (one piece each unit) and stop at the preorder cutoff;
 * acompañamientos go to the order on their own and have no cutoff.
 */
export interface BuildItem {
  id: string;
  group: BuildItemGroup;
  name: string;
  description?: string;
  imageUrl?: string;
  /** Units added per step: 5 pieces of a roll, 1 nigiri, 3 empanaditas, 5 sticks */
  step: number;
  /** Plural unit shown next to `step`, e.g. "piezas", "unidades", "palitos" */
  unitLabel: string;
  /** Price of one step in ARS, integer */
  price: number;
  /** Master switch to hide an item without deleting it */
  available: boolean;
}

/** How many steps of one box item went into a box (e.g. 2 steps of a roll = 10 pieces) */
export interface BuildBoxEntry {
  item: BuildItem;
  steps: number;
}

/** A filled "Arma tu combo" box: its entries add up to exactly `pieces` */
export interface BuildBox {
  /** One of BUILD_BOX_SIZES */
  pieces: number;
  /** Rolls and nigiris only, in BUILD_ITEMS order */
  entries: readonly BuildBoxEntry[];
}

// ─── Cart ───────────────────────────────────────────────────────────────────

interface CartLineBase {
  /**
   * Unique and stable per cart line, so equal lines merge:
   * - standard products: the product id (+ the option value, if any);
   * - sized products: product id + pieces;
   * - boxes: box size + sorted item ids with their steps;
   * - acompañamientos: the build item id.
   */
  lineId: string;
  quantity: number;
  /** Integer ARS, resolved from the catalog (variant price; sum of a box's entries) */
  unitPrice: number;
}

export interface ProductCartItem extends CartLineBase {
  kind: 'product';
  product: Product;
  /** Chosen size, only for sized products */
  variant?: ProductVariant;
  /** Chosen option value, only for standard products with an `option` */
  optionValue?: ProductOptionValue;
}

/** An "Arma tu combo" box */
export interface BoxCartItem extends CartLineBase {
  kind: 'box';
  box: BuildBox;
}

/** An acompañamiento ordered on its own; `quantity` counts steps (2 × 3 empanaditas) */
export interface ExtraCartItem extends CartLineBase {
  kind: 'extra';
  item: BuildItem;
}

export type CartItem = ProductCartItem | BoxCartItem | ExtraCartItem;

// ─── Checkout ───────────────────────────────────────────────────────────────

export type PaymentMethod = 'cash' | 'transfer';

export type DeliveryMethod = 'pickup' | 'delivery';

/** Pickup needs nothing else; delivery needs the address */
export type Fulfillment = { method: 'pickup' } | { method: 'delivery'; address: string };

export interface CustomerInfo {
  name: string;
}

export interface OrderDetails {
  customer: CustomerInfo;
  fulfillment: Fulfillment;
  paymentMethod: PaymentMethod;
  items: readonly CartItem[];
  /** Integer ARS; 0 for pickup */
  deliveryFee: number;
  /** Integer ARS: items + delivery fee, computed at submit time */
  total: number;
}
