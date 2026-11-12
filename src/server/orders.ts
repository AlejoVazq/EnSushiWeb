import { randomUUID } from 'node:crypto';

import { cartTotal, lineMenuItems, lineSubtotal, restoreItems } from '@/lib/cartItems';
import { getLineDetail, getLineName } from '@/lib/cartLine';
import { createOrder, NOTES_MAX_LENGTH, validateCheckout, type CheckoutForm } from '@/lib/checkout';
import { normalizeCode } from '@/lib/discounts';
import { BUSINESS } from '@/config/business';
import { formatList } from '@/lib/format';
import { normalizePhone } from '@/lib/phone';
import { checkSchedule, getScheduleStatus } from '@/lib/schedule';
import type { CartItem, DiscountCode, OrderDetails } from '@/types';
import type { CustomerOrder, OrderLineSnapshot, OrderStatus, StaffOrder } from '@/types/pedidos';

import { getDb } from './db';
import { checkServerCode } from './discounts';
import { requestDate } from './http';
import { getLiveMenu } from './liveMenu';

/** A customer can't have more than this many orders waiting for the shop's answer */
const MAX_PENDING_PER_CUSTOMER = 3;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const text = (value: unknown, max: number): string => (typeof value === 'string' ? value.slice(0, max) : '');

export type CreateOrderResult = { ok: true; id: string } | { ok: false; status: number; error: string };

/** The requested lines against the current menu; null if any isn't valid or there are none */
export const readItems = (rawItems: readonly unknown[]): { items: CartItem[] } | null => {
  const items = restoreItems({ items: rawItems });
  return items.length === 0 || items.length !== rawItems.length ? null : { items };
};

/** What to tell whoever is ordering if a line has something marked as sold out today */
export const soldOutError = (items: readonly CartItem[], soldOutIds: readonly string[], place: 'carrito' | 'pedido'): string | null => {
  const names = [...new Set(items.flatMap(lineMenuItems).filter((item) => soldOutIds.includes(item.id)).map((item) => item.name))];
  if (names.length === 0) return null;
  const [verb, remove] = names.length === 1 ? ['se agotó', 'Sacalo'] : ['se agotaron', 'Sacalos'];
  return `${formatList(names)} ${verb} hoy. ${remove} del ${place} para seguir.`;
};

/** The code, only if it's the discount the order ended up with */
export const usedCodeOf = (order: OrderDetails, code: string): string | null =>
  order.discount?.label === normalizeCode(code) ? order.discount.label : null;

/** Saves the order with its lines as text and prices of this moment (the menu can change later) */
export const insertOrder = async (
  order: OrderDetails,
  who: { customerId: string | null; phone: string; email: string | null; usedCode: string | null },
): Promise<OrderRow> => {
  const lines: OrderLineSnapshot[] = order.items.map((item) => ({
    quantity: item.quantity,
    name: getLineName(item),
    detail: getLineDetail(item),
    subtotal: lineSubtotal(item),
  }));
  const db = await getDb();
  const [row] = await db.query<OrderRow>(
    `INSERT INTO orders (id, customer_id, customer_name, phone, email, delivery_method, address, payment_method,
       lines, subtotal, discount_label, discount_amount, delivery_fee, total, discount_code, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING *`,
    [
      randomUUID(),
      who.customerId,
      order.customer.name,
      who.phone,
      who.email,
      order.fulfillment.method,
      order.fulfillment.method === 'delivery' ? order.fulfillment.address : null,
      order.paymentMethod,
      JSON.stringify(lines),
      cartTotal(order.items),
      order.discount?.label ?? null,
      order.discount?.amount ?? 0,
      order.deliveryFee,
      order.total,
      who.usedCode,
      order.notes || null,
    ],
  );
  if (!row) throw new Error('El pedido no se guardó.');
  return row;
};

/**
 * POST /api/pedidos. The cart arrives as menu references (the same format the phone saves); every price,
 * discount and the total are rebuilt here from the menu, never taken from the request.
 */
export const createOrderFromRequest = async (customerId: string, email: string, body: unknown): Promise<CreateOrderResult> => {
  if (!isRecord(body) || !Array.isArray(body.items)) return { ok: false, status: 400, error: 'Pedido inválido.' };

  const date = requestDate(body.ahora);
  const live = await getLiveMenu(date);
  const schedule = getScheduleStatus(date, live);
  if (!checkSchedule(schedule).canCheckout) {
    const error = schedule.isPaused ? 'Por hoy no tomamos más pedidos.' : 'Ahora no estamos tomando pedidos.';
    return { ok: false, status: 409, error };
  }

  const read = readItems(body.items);
  if (!read) return { ok: false, status: 409, error: 'Algo de tu pedido ya no está disponible. Revisá el carrito.' };
  const { items } = read;

  // Marked as sold out from the shop's app after the customer added it
  const soldOut = soldOutError(items, live.soldOut, 'carrito');
  if (soldOut) return { ok: false, status: 409, error: soldOut };

  const form: CheckoutForm = {
    name: text(body.name, 60),
    deliveryMethod: body.deliveryMethod === 'pickup' || body.deliveryMethod === 'delivery' ? body.deliveryMethod : null,
    address: text(body.address, 160),
    paymentMethod:
      body.paymentMethod === 'cash' || body.paymentMethod === 'transfer' || body.paymentMethod === 'mixed'
        ? body.paymentMethod
        : null,
    notes: text(body.notes, NOTES_MAX_LENGTH),
    discountCode: text(body.discountCode, 40),
  };
  const errors = validateCheckout(form);
  const firstError = Object.values(errors)[0];
  if (firstError) return { ok: false, status: 400, error: firstError };

  const phone = normalizePhone(text(body.phone, 40));
  if (!phone) return { ok: false, status: 400, error: 'Revisá el celular: código de área y número.' };

  // A code from the shop's app: paused or used up since the customer applied it, the order stops here so the
  // total they saw never changes behind their back
  let extraCodes: DiscountCode[] = [];
  if (form.discountCode) {
    const check = await checkServerCode(form.discountCode, customerId);
    if (check && !check.ok) return { ok: false, status: 409, error: `${check.error} Quitalo para seguir.` };
    if (check?.ok) extraCodes = [check.definition];
  }

  const order = createOrder(form, items, date, extraCodes);
  if (!order) return { ok: false, status: 400, error: 'Pedido inválido.' };
  // The code, only if it's the discount the order ended up with (a special day can save more)
  const usedCode = usedCodeOf(order, form.discountCode);

  const db = await getDb();
  const [pending] = await db.query<{ count: number }>(
    "SELECT count(*)::int AS count FROM orders WHERE customer_id = $1 AND status = 'nuevo'",
    [customerId],
  );
  if ((pending?.count ?? 0) >= MAX_PENDING_PER_CUSTOMER) {
    return { ok: false, status: 429, error: 'Ya tenés pedidos esperando confirmación. Esperá la respuesta del local.' };
  }

  const row = await insertOrder(order, { customerId, phone, email, usedCode });
  return { ok: true, id: row.id };
};

// ─── Reading ────────────────────────────────────────────────────────────────

export interface OrderRow {
  id: string;
  number: number;
  created_at: Date | string;
  customer_id: string | null;
  customer_name: string;
  phone: string;
  email: string | null;
  delivery_method: 'pickup' | 'delivery';
  address: string | null;
  payment_method: 'cash' | 'transfer' | 'mixed';
  cash_amount: number | null;
  notes: string | null;
  lines: OrderLineSnapshot[] | string;
  subtotal: number;
  discount_label: string | null;
  discount_amount: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  eta: string | null;
  reject_reason: string | null;
  printed_at: Date | string | null;
  driver: string | null;
  driver_float: number | null;
  driver_returned: number | null;
}

const iso = (value: Date | string): string => new Date(value).toISOString();

export const toStaffOrder = (row: OrderRow): StaffOrder => ({
  id: row.id,
  number: row.number,
  createdAt: iso(row.created_at),
  customerName: row.customer_name,
  phone: row.phone,
  email: row.email,
  manual: row.customer_id === null,
  deliveryMethod: row.delivery_method,
  address: row.address,
  paymentMethod: row.payment_method,
  cashAmount: row.cash_amount,
  notes: row.notes,
  // pg parses jsonb; keep working if a driver hands it back as text
  lines: typeof row.lines === 'string' ? (JSON.parse(row.lines) as OrderLineSnapshot[]) : row.lines,
  subtotal: row.subtotal,
  discountLabel: row.discount_label,
  discountAmount: row.discount_amount,
  deliveryFee: row.delivery_fee,
  total: row.total,
  status: row.status,
  eta: row.eta,
  rejectReason: row.reject_reason,
  printedAt: row.printed_at ? iso(row.printed_at) : null,
  driver: row.driver,
  driverFloat: row.driver_float,
  driverReturned: row.driver_returned,
});

/** The shop app's list: everything from the last `hours` hours, newest first */
export const listStaffOrders = async (hours = 18): Promise<StaffOrder[]> => {
  const db = await getDb();
  const rows = await db.query<OrderRow>(
    'SELECT * FROM orders WHERE created_at > now() - make_interval(hours => $1) ORDER BY created_at DESC LIMIT 200',
    [hours],
  );
  return rows.map(toStaffOrder);
};

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/** A sales export covers at most this many days */
const MAX_SALES_DAYS = 400;

export type SalesResult = { ok: true; orders: StaffOrder[] } | { ok: false; error: string };

/** Confirmed orders (the sales) from `from` to `to`, both "YYYY-MM-DD" in the shop's time zone and included, oldest first */
export const listSales = async (from: string, to: string): Promise<SalesResult> => {
  if (!DAY_PATTERN.test(from) || !DAY_PATTERN.test(to)) return { ok: false, error: 'Las fechas van como AAAA-MM-DD.' };
  const days = (Date.parse(to) - Date.parse(from)) / 86_400_000;
  if (Number.isNaN(days) || days < 0) return { ok: false, error: 'La fecha de inicio va antes que la de fin.' };
  if (days > MAX_SALES_DAYS) return { ok: false, error: 'Elegí un período más corto (hasta un año).' };
  const db = await getDb();
  const rows = await db.query<OrderRow>(
    `SELECT * FROM orders
     WHERE status = 'confirmado' AND (created_at AT TIME ZONE $3)::date BETWEEN $1::date AND $2::date
     ORDER BY created_at`,
    [from, to, BUSINESS.schedule.timeZone],
  );
  return { ok: true, orders: rows.map(toStaffOrder) };
};

/** The customer's own order, or null (also if it belongs to someone else) */
export const getCustomerOrder = async (customerId: string, orderId: string): Promise<CustomerOrder | null> => {
  const db = await getDb();
  const [row] = await db.query<OrderRow>('SELECT * FROM orders WHERE id = $1 AND customer_id = $2', [orderId, customerId]);
  if (!row) return null;
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    eta: row.eta,
    rejectReason: row.reject_reason,
    deliveryMethod: row.delivery_method,
    total: row.total,
  };
};

// ─── Shop decisions ─────────────────────────────────────────────────────────

const ETA_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
/** Cash amounts the app loads (a drawer, a driver's change): sanity limit */
export const MAX_CASH = 10_000_000;

export type DecisionResult = { ok: true; order: StaffOrder } | { ok: false; status: number; error: string };

/** PATCH /api/local/pedidos/[id] */
export const applyStaffAction = async (orderId: string, body: unknown): Promise<DecisionResult> => {
  if (!isRecord(body)) return { ok: false, status: 400, error: 'Acción inválida.' };
  const db = await getDb();
  let rows: OrderRow[];

  switch (body.action) {
    case 'confirmar': {
      const eta = text(body.eta, 5);
      if (!ETA_PATTERN.test(eta)) return { ok: false, status: 400, error: 'La hora va como HH:MM.' };
      rows = await db.query<OrderRow>(
        `UPDATE orders SET status = 'confirmado', eta = $2, reject_reason = NULL, decided_at = now()
         WHERE id = $1 RETURNING *`,
        [orderId, eta],
      );
      break;
    }
    case 'rechazar': {
      const reason = text(body.reason, 300).trim();
      if (!reason) return { ok: false, status: 400, error: 'Falta el motivo.' };
      rows = await db.query<OrderRow>(
        `UPDATE orders SET status = 'rechazado', reject_reason = $2, eta = NULL, decided_at = now()
         WHERE id = $1 RETURNING *`,
        [orderId, reason],
      );
      break;
    }
    case 'impreso':
      rows = await db.query<OrderRow>('UPDATE orders SET printed_at = now() WHERE id = $1 RETURNING *', [orderId]);
      break;
    case 'cobro': {
      // Mixed payments: the cash part, as settled by WhatsApp; the rest of the total was transferred
      const cashAmount = body.cashAmount;
      if (typeof cashAmount !== 'number' || !Number.isInteger(cashAmount) || cashAmount < 0) {
        return { ok: false, status: 400, error: 'El efectivo va en pesos, sin centavos.' };
      }
      const [order] = await db.query<OrderRow>('SELECT * FROM orders WHERE id = $1', [orderId]);
      if (!order) return { ok: false, status: 404, error: 'No existe ese pedido.' };
      if (order.payment_method !== 'mixed') return { ok: false, status: 400, error: 'Solo los pagos mixtos se reparten.' };
      if (cashAmount > order.total) return { ok: false, status: 400, error: 'El efectivo no puede pasar el total.' };
      rows = await db.query<OrderRow>('UPDATE orders SET cash_amount = $2 WHERE id = $1 RETURNING *', [orderId, cashAmount]);
      break;
    }
    case 'delivery': {
      // Who took a delivery, the change they took and what they handed in when back
      const driver = text(body.driver, 40).trim();
      const amount = (value: unknown): number | null | undefined =>
        value === null || value === undefined ? null : typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_CASH ? value : undefined;
      const driverFloat = amount(body.driverFloat);
      const driverReturned = amount(body.driverReturned);
      if (driverFloat === undefined || driverReturned === undefined) {
        return { ok: false, status: 400, error: 'Los montos van en pesos, sin centavos.' };
      }
      const [order] = await db.query<OrderRow>('SELECT * FROM orders WHERE id = $1', [orderId]);
      if (!order) return { ok: false, status: 404, error: 'No existe ese pedido.' };
      if (order.delivery_method !== 'delivery') return { ok: false, status: 400, error: 'Solo los envíos llevan delivery.' };
      if (order.status !== 'confirmado') return { ok: false, status: 400, error: 'Primero confirmá el pedido.' };
      if (!driver && (driverFloat !== null || driverReturned !== null)) {
        return { ok: false, status: 400, error: 'Falta quién lo lleva.' };
      }
      rows = await db.query<OrderRow>(
        'UPDATE orders SET driver = $2, driver_float = $3, driver_returned = $4 WHERE id = $1 RETURNING *',
        [orderId, driver || null, driverFloat, driverReturned],
      );
      break;
    }
    default:
      return { ok: false, status: 400, error: 'Acción inválida.' };
  }

  const [row] = rows;
  return row ? { ok: true, order: toStaffOrder(row) } : { ok: false, status: 404, error: 'No existe ese pedido.' };
};

/** The name and phone of the customer's last order and the address of their last delivery, to fill the checkout */
export const getLastOrderDetails = async (
  customerId: string,
): Promise<{ name: string; phone: string; address: string }> => {
  const db = await getDb();
  const [last] = await db.query<{ customer_name: string; phone: string }>(
    'SELECT customer_name, phone FROM orders WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 1',
    [customerId],
  );
  const [delivery] = await db.query<{ address: string }>(
    `SELECT address FROM orders
       WHERE customer_id = $1 AND delivery_method = 'delivery' AND coalesce(address, '') <> ''
       ORDER BY created_at DESC LIMIT 1`,
    [customerId],
  );
  return {
    name: last?.customer_name ?? '',
    // Stored as 549 + area code + number (wa.me); the checkout shows it the way people type it
    phone: last?.phone.replace(/^549/, '') ?? '',
    address: delivery?.address ?? '',
  };
};
