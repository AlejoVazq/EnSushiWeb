/**
 * Domain types — EnSushi Online Ordering (V1)
 * All prices are integers in ARS (no cents).
 */

// ─── Catalog ────────────────────────────────────────────────────────────────

export type CategoryId = 'arma-tu-combo' | 'sushiburgers' | 'acompanamientos' | 'combos' | 'salsas';

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
  /** Left out of the menu (no tab) and of the cart's suggestions, without deleting its items */
  hidden?: boolean;
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

/** What comes with a combo at no extra cost */
export interface ProductIncludes {
  salsas: number;
  palitos: number;
}

/** One size of a sized product; `pieces` is unique within the product */
export interface ProductVariant {
  pieces: number;
  /** Unit price in ARS, integer */
  price: number;
  /** Shown under the size chips: "Incluye 2 salsas y 2 palitos" */
  includes?: ProductIncludes;
}

/** Same product in several sizes (e.g. combos of 15/24/40 pieces); the customer picks one */
export interface SizedProduct extends BaseProduct {
  type: 'sized';
  variants: readonly ProductVariant[];
}

export type Product = StandardProduct | SizedProduct;

/** Sections of the "Arma tu combo" builder */
export type BuildItemGroup = 'rolls' | 'nigiris' | 'acompanamientos';

/** What goes inside a roll, as drawn in its cross-section */
export type RollFillingKind =
  | 'salmon'
  | 'salmon-cooked'
  | 'salmon-tempura'
  | 'tuna'
  | 'avocado'
  | 'cucumber'
  | 'carrot'
  | 'cream-cheese'
  | 'scallion'
  | 'chive';

/** Cross-section of a roll, drawn in its detail sheet until it has a photo of its own */
export interface RollCut {
  /** uramaki: rice outside the nori. hosomaki: nori outside */
  wrap: 'uramaki' | 'hosomaki';
  /** Coating over the rice, e.g. "Crujiente picante" */
  topping?: { label: string; kind: 'crunchy-spicy' };
  fillings: readonly { label: string; kind: RollFillingKind }[];
}

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
  /** Photo; in a roll's detail sheet it takes the place of the drawn `cut` */
  imageUrl?: string;
  /** Rolls: what's inside, drawn in the detail sheet */
  cut?: RollCut;
  /** Units added per step: 5 pieces of a roll, 1 nigiri, 3 gyosas, 5 langostinos */
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

export type BuildBoxSizeId = 'chica' | 'grande';

/** One way to fill a box: exactly `rollPieces` of rolls, plus between `nigiris.min` and `nigiris.max` nigiris */
export interface BoxCombination {
  rollPieces: number;
  nigiris: { min: number; max: number };
}

/** A physical box of "Arma tu combo": only the listed combinations fit in it */
export interface BuildBoxSize {
  id: BuildBoxSizeId;
  /** "Caja chica" */
  name: string;
  /** Most pieces it holds, for the chip ("hasta 15 piezas") */
  maxPieces: number;
  combinations: readonly BoxCombination[];
}

/** A filled "Arma tu combo" box: its entries match one of the size's combinations */
export interface BuildBox {
  size: BuildBoxSizeId;
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

/** An acompañamiento ordered on its own; `quantity` counts steps (2 × 3 gyosas) */
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
  /** The one discount applied (code or special day; they don't stack), or null */
  discount: OrderDiscount | null;
  /** Integer ARS; 0 for pickup */
  deliveryFee: number;
  /** Integer ARS: items − discount + delivery fee, computed at submit time */
  total: number;
}

// ─── Discounts ──────────────────────────────────────────────────────────────

/** A date with a discount on every product of the Combos category (not on Arma tu combo boxes) */
export interface SpecialDay {
  /** "YYYY-MM-DD", in the shop's time zone */
  date: string;
  /** Whole percent, e.g. 15 */
  percent: number;
}

/**
 * A code handed out by the shop, for the whole order (not the delivery fee).
 * Only its SHA-256 is stored, so the code itself isn't readable in the site's JS (`npm run codigo`).
 */
export interface DiscountCode {
  /** SHA-256 hex of the normalized code (trimmed, upper case) */
  hash: string;
  /** percent: `value` is a whole percent; amount: `value` is integer ARS off */
  kind: 'percent' | 'amount';
  value: number;
  /** First and last day it works, "YYYY-MM-DD" in the shop's time zone (both included) */
  validFrom?: string;
  validUntil?: string;
}

/** The discount as the cart, the checkout and the message show it */
export interface OrderDiscount {
  /** What goes in parentheses: "VERANO10", "15% en Combos" */
  label: string;
  /** Integer ARS, positive */
  amount: number;
}
