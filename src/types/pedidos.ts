/**
 * What the server and the shop's desktop app (`desktop/`) exchange about orders. No imports: the desktop app
 * includes this file as is.
 */

export type OrderStatus = 'nuevo' | 'confirmado' | 'rechazado';

/** One ordered line as text and prices at the moment of ordering ("2× Combo Kanituna · 25 piezas") */
export interface OrderLineSnapshot {
  quantity: number;
  name: string;
  /** Box contents or units: "New York 10, Midori 5" / "6 unidades" */
  detail: string | null;
  /** Integer ARS for the whole line */
  subtotal: number;
}

/** An order as the shop's app sees it */
export interface StaffOrder {
  id: string;
  number: number;
  /** ISO date */
  createdAt: string;
  customerName: string;
  /** wa.me format: "5492478567168" */
  phone: string;
  /** null for orders loaded by hand: those customers have no account */
  email: string | null;
  /** Loaded from the shop's app (a customer who ordered by WhatsApp) instead of arriving from the web */
  manual: boolean;
  deliveryMethod: 'pickup' | 'delivery';
  address: string | null;
  paymentMethod: 'cash' | 'transfer' | 'mixed';
  /**
   * Mixed payments: how much of the total was paid in cash (the rest by transfer), loaded by the shop once it's
   * settled by WhatsApp; null until then. Cash and transfer orders don't use it.
   */
  cashAmount: number | null;
  /** The customer's notes for the kitchen ("la hamburguesa sin palta") */
  notes: string | null;
  lines: OrderLineSnapshot[];
  subtotal: number;
  discountLabel: string | null;
  discountAmount: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  /** "21:15", set when confirmed */
  eta: string | null;
  rejectReason: string | null;
  /** ISO date, null if never printed */
  printedAt: string | null;
}

/** What the customer sees on their order's page */
export interface CustomerOrder {
  id: string;
  number: number;
  status: OrderStatus;
  eta: string | null;
  rejectReason: string | null;
  deliveryMethod: 'pickup' | 'delivery';
  total: number;
}

/** PATCH /api/local/pedidos/[id] */
export type StaffOrderAction =
  | { action: 'confirmar'; eta: string }
  | { action: 'rechazar'; reason: string }
  | { action: 'impreso' }
  | { action: 'cobro'; cashAmount: number };

/** What the app can add to an order loaded by hand, as menu references: the server puts the prices */
export type ManualLineRef =
  | { kind: 'product'; productId: string; pieces?: number; optionId?: string }
  | { kind: 'extra'; itemId: string }
  | { kind: 'box'; size: string; steps: Record<string, number> };

export type ManualOrderLine = ManualLineRef & { quantity: number };

/** POST /api/local/pedidos */
export interface ManualOrderInput {
  name: string;
  /** However it was typed; the server normalizes it */
  phone: string;
  deliveryMethod: StaffOrder['deliveryMethod'] | null;
  address: string;
  paymentMethod: StaffOrder['paymentMethod'] | null;
  notes: string;
  discountCode: string;
  items: ManualOrderLine[];
}

/** POST /api/local/pedidos/presupuesto: an order's amounts as the server would save them */
export interface OrderQuote {
  subtotal: number;
  discountLabel: string | null;
  discountAmount: number;
  deliveryFee: number;
  total: number;
}

/** One way to order a catalog item: a combo's size, a sushiburger's option, or the item itself (`label` null) */
export interface StaffCatalogChoice {
  label: string | null;
  /** Integer ARS, before any discount */
  price: number;
  line: ManualLineRef;
}

export interface StaffCatalogItem {
  id: string;
  name: string;
  soldOut: boolean;
  choices: StaffCatalogChoice[];
}

/** A roll or nigiri for a box; `price` is per step */
export interface StaffBoxItem {
  id: string;
  name: string;
  group: 'rolls' | 'nigiris';
  /** Units per step: 5 pieces of a roll, 1 nigiri */
  step: number;
  price: number;
  soldOut: boolean;
}

export interface StaffBoxSize {
  id: string;
  name: string;
  combinations: { rollPieces: number; nigiris: { min: number; max: number } }[];
  /** The same combinations as text: "20 piezas + hasta 6 nigiris" */
  fits: string[];
}

/** GET /api/local/catalogo: the menu as the app needs it to load an order by hand */
export interface StaffCatalog {
  /** The menu's tabs, without Arma tu combo */
  groups: { name: string; items: StaffCatalogItem[] }[];
  box: { name: string; sizes: StaffBoxSize[]; items: StaffBoxItem[] };
  /** The time rolls and nigiris stop on the web, once it has passed ("19:30"); null before that */
  cutoffPassed: string | null;
}

/** A discount code as the shop's app manages it (they live in the database, not in the site's code) */
export interface StaffDiscountCode {
  /** As customers type it, in upper case: "VERANO10" */
  code: string;
  /** percent: `value` is a whole percent. amount: integer ARS off */
  kind: 'percent' | 'amount';
  value: number;
  /** First and last day it works, "YYYY-MM-DD" in the shop's time zone (both included); null = no limit */
  validFrom: string | null;
  validUntil: string | null;
  /** How many orders can use it in total; null = no limit */
  maxUses: number | null;
  /** Each customer can use it once */
  oncePerCustomer: boolean;
  /** Paused codes are kept (with their uses) but don't work */
  active: boolean;
  /** Orders that used it; rejected ones don't count */
  uses: number;
  /** ISO date */
  createdAt: string;
}

/** POST /api/local/codigos (all fields) and PATCH /api/local/codigos/[code] (any of them but the code) */
export type StaffDiscountCodeInput = Omit<StaffDiscountCode, 'uses' | 'createdAt'>;

/** GET /api/menu: what the shop changed today from its app, for the web to show it live */
export interface LiveMenu {
  /** Product and build-item ids sold out today */
  soldOut: string[];
  /** The shop stopped taking orders for today (busy kitchen) */
  ordersPaused: boolean;
}

/** One item the shop can mark as sold out */
export interface StaffMenuItem {
  /** Product or build-item id */
  id: string;
  name: string;
  soldOut: boolean;
  /** Sold out in the site's code (`available: false`): the app can't turn it back on */
  locked: boolean;
}

/** GET /api/local/menu: today's state, with the items grouped as the menu's tabs */
export interface StaffMenu {
  /** "YYYY-MM-DD" in the shop's time zone: marks only last for this day */
  day: string;
  ordersPaused: boolean;
  groups: { name: string; items: StaffMenuItem[] }[];
}

/** PATCH /api/local/menu */
export type StaffMenuAction = { itemId: string; soldOut: boolean } | { ordersPaused: boolean };
