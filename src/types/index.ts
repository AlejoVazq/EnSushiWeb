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
 * - preorder: same-day orders close at `BUSINESS.schedule.preorderCutoff`; after that, only for another day.
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

/**
 * Interim build-your-own combo (Arma tu combo, until the per-item builder): fixed size and price; the customer chooses
 * between 1 and `maxFlavors` flavors from ROLL_FLAVORS.
 */
export interface CustomComboProduct extends BaseProduct {
  type: 'custom-combo';
  /** Unit price in ARS, integer */
  price: number;
  pieces: number;
  maxFlavors: number;
}

export type Product = StandardProduct | SizedProduct | CustomComboProduct;

/** Sections of the "Arma tu combo" builder */
export type BuildItemGroup = 'rolls' | 'nigiris' | 'acompanamientos';

/**
 * Something the customer adds to their own combo, in fixed steps, each with its own price.
 * The combo starts empty and has no minimum or maximum. Not wired to the UI yet (Paso 10).
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

/** Selectable flavor for custom combos */
export interface RollFlavor {
  id: string;
  name: string;
  description: string;
  tags?: readonly ProductTag[];
}

// ─── Cart ───────────────────────────────────────────────────────────────────

export interface ComboCustomization {
  /** IDs from ROLL_FLAVORS, 1..maxFlavors, no duplicates */
  flavorIds: readonly string[];
}

export interface CartItem {
  /**
   * Unique per cart line. Standard products: the product id (+ the option value, if any).
   * Sized products: product id + pieces. Custom combos: product id + sorted
   * flavor ids, so two combos with different flavors become separate lines.
   */
  lineId: string;
  product: Product;
  quantity: number;
  /** Integer ARS, resolved from the catalog (the variant's price for sized products) */
  unitPrice: number;
  /** Chosen size, only for sized products */
  variant?: ProductVariant;
  /** Chosen option value, only for standard products with an `option` */
  optionValue?: ProductOptionValue;
  customization?: ComboCustomization;
}

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
  /** Opening day the order is for, "YYYY-MM-DD" in the shop's time zone */
  orderDate: string;
  fulfillment: Fulfillment;
  paymentMethod: PaymentMethod;
  items: readonly CartItem[];
  /** Integer ARS; 0 for pickup */
  deliveryFee: number;
  /** Integer ARS: items + delivery fee, computed at submit time */
  total: number;
}
