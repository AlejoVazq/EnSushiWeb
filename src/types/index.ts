/**
 * Domain types — EnSushi Online Ordering (V1)
 * All prices are integers in ARS (no cents).
 */

// ─── Catalog ────────────────────────────────────────────────────────────────

export type CategoryId =
  | 'combos'
  | 'sushiburgers'
  | 'salsas'
  | 'seleccion-de-autor'
  | 'arma-tu-combo';

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
}

export type ProductTag = 'nuevo' | 'mas-pedido' | 'picante' | 'veggie' | 'sin-tacc';

/**
 * Kitchen dynamic:
 * - express: made on demand during opening hours.
 * - preorder: needs advance notice; orders close at `BUSINESS.schedule.preorderCutoff`.
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

/** A regular, ready-to-add product */
export interface StandardProduct extends BaseProduct {
  type: 'standard';
  /** Unit price in ARS, integer */
  price: number;
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
 * "Arma tu combo": fixed size and price; the customer chooses
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
   * Unique per cart line. Standard products: the product id.
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
  fulfillment: Fulfillment;
  paymentMethod: PaymentMethod;
  items: readonly CartItem[];
  /** Integer ARS; 0 for pickup */
  deliveryFee: number;
  /** Integer ARS: items + delivery fee, computed at submit time */
  total: number;
}
