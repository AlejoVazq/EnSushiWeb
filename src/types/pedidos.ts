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
  email: string;
  deliveryMethod: 'pickup' | 'delivery';
  address: string | null;
  paymentMethod: 'cash' | 'transfer';
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
  | { action: 'impreso' };
