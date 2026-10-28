import { randomUUID } from 'node:crypto';

import { lineMenuItems, lineSubtotal, restoreItems } from '@/lib/cartItems';
import { getLineDetail, getLineName } from '@/lib/cartLine';
import { createOrder, validateCheckout, type CheckoutForm } from '@/lib/checkout';
import { normalizeCode } from '@/lib/discounts';
import { formatList } from '@/lib/format';
import { normalizePhone } from '@/lib/phone';
import { checkSchedule, getScheduleStatus } from '@/lib/schedule';
import type { DiscountCode } from '@/types';
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

  const items = restoreItems({ items: body.items });
  if (items.length === 0 || items.length !== body.items.length) {
    return { ok: false, status: 409, error: 'Algo de tu pedido ya no está disponible. Revisá el carrito.' };
  }

  // Marked as sold out from the shop's app after the customer added it
  const soldOut = [...new Set(items.flatMap(lineMenuItems).filter((item) => live.soldOut.includes(item.id)).map((item) => item.name))];
  if (soldOut.length > 0) {
    const [verb, remove] = soldOut.length === 1 ? ['se agotó', 'Sacalo'] : ['se agotaron', 'Sacalos'];
    return { ok: false, status: 409, error: `${formatList(soldOut)} ${verb} hoy. ${remove} del carrito para seguir.` };
  }

  const form: CheckoutForm = {
    name: text(body.name, 60),
    deliveryMethod: body.deliveryMethod === 'pickup' || body.deliveryMethod === 'delivery' ? body.deliveryMethod : null,
    address: text(body.address, 160),
    paymentMethod: body.paymentMethod === 'cash' || body.paymentMethod === 'transfer' ? body.paymentMethod : null,
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
  const usedCode = order.discount?.label === normalizeCode(form.discountCode) ? order.discount.label : null;

  const lines: OrderLineSnapshot[] = order.items.map((item) => ({
    quantity: item.quantity,
    name: getLineName(item),
    detail: getLineDetail(item),
    subtotal: lineSubtotal(item),
  }));
  const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);

  const db = await getDb();
  const [pending] = await db.query<{ count: number }>(
    "SELECT count(*)::int AS count FROM orders WHERE customer_id = $1 AND status = 'nuevo'",
    [customerId],
  );
  if ((pending?.count ?? 0) >= MAX_PENDING_PER_CUSTOMER) {
    return { ok: false, status: 429, error: 'Ya tenés pedidos esperando confirmación. Esperá la respuesta del local.' };
  }

  const id = randomUUID();
  await db.query(
    `INSERT INTO orders (id, customer_id, customer_name, phone, email, delivery_method, address, payment_method,
       lines, subtotal, discount_label, discount_amount, delivery_fee, total, discount_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [
      id,
      customerId,
      order.customer.name,
      phone,
      email,
      order.fulfillment.method,
      order.fulfillment.method === 'delivery' ? order.fulfillment.address : null,
      order.paymentMethod,
      JSON.stringify(lines),
      subtotal,
      order.discount?.label ?? null,
      order.discount?.amount ?? 0,
      order.deliveryFee,
      order.total,
      usedCode,
    ],
  );
  return { ok: true, id };
};

// ─── Reading ────────────────────────────────────────────────────────────────

interface OrderRow {
  id: string;
  number: number;
  created_at: Date | string;
  customer_name: string;
  phone: string;
  email: string;
  delivery_method: 'pickup' | 'delivery';
  address: string | null;
  payment_method: 'cash' | 'transfer';
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
}

const iso = (value: Date | string): string => new Date(value).toISOString();

const toStaffOrder = (row: OrderRow): StaffOrder => ({
  id: row.id,
  number: row.number,
  createdAt: iso(row.created_at),
  customerName: row.customer_name,
  phone: row.phone,
  email: row.email,
  deliveryMethod: row.delivery_method,
  address: row.address,
  paymentMethod: row.payment_method,
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
    default:
      return { ok: false, status: 400, error: 'Acción inválida.' };
  }

  const [row] = rows;
  return row ? { ok: true, order: toStaffOrder(row) } : { ok: false, status: 404, error: 'No existe ese pedido.' };
};
